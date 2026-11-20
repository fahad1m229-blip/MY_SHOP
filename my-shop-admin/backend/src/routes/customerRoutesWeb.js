const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const { admin, getDb } = require("../config/firebase");
const { apiLimiter, loginLimiter } = require("../middleware/rateLimit");
const { sanitizeId, toSafeNumber, toIsoDate } = require("../middleware/validate");
const {
  signCustomerToken,
  setCustomerSessionCookie,
  clearCustomerSessionCookie,
  requireCustomerAuth,
  optionalCustomerAuth,
} = require("../middleware/customerAuth");

const router = express.Router();
router.use(apiLimiter);

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function buildCartItemId(productId, selectedColor = "", selectedSize = "") {
  const c = String(selectedColor || "").trim();
  const s = String(selectedSize || "").trim();
  return sanitizeId(`${productId}_${c}_${s}`, "cart");
}

async function mergeGuestCartItems(db, uid, guestCart) {
  if (!Array.isArray(guestCart) || guestCart.length === 0) return;
  const limited = guestCart.slice(0, 30);
  const batch = db.batch();
  let writes = 0;

  for (const raw of limited) {
    const productId = sanitizeId(raw?.productId || "", "");
    if (!productId) continue;
    const prodSnap = await db.collection("catalog_products").doc(productId).get();
    if (!prodSnap.exists) continue;
    const p = prodSnap.data() || {};
    if (p.published === false || p.available === false) continue;

    const quantity = Math.max(1, Math.min(20, Math.round(Number(raw.quantity || 1))));
    const selectedColor = String(raw.selectedColor || "").trim().slice(0, 40);
    const selectedSize = String(raw.selectedSize || "").trim().slice(0, 40);
    const itemId = buildCartItemId(productId, selectedColor, selectedSize);
    const ref = db.collection("users").doc(uid).collection("cart").doc(itemId);

    batch.set(
      ref,
      {
        userId: uid,
        productId,
        productName: String(p.name || raw.productName || "MY Shop Item").slice(0, 140),
        unitPrice: Number(p.price || 0),
        mainImageUrl: p.mainImageUrl || (Array.isArray(p.imageUrls) && p.imageUrls[0]) || "",
        quantity,
        selectedColor,
        selectedSize,
        savedForLater: Boolean(raw.savedForLater),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    writes++;
  }

  if (writes > 0) await batch.commit();
}

async function fetchCustomerHydration(db, uid) {
  const userRef = db.collection("users").doc(uid);
  const [cartSnap, wishSnap, addrSnap, notifSnap] = await Promise.all([
    userRef.collection("cart").get(),
    userRef.collection("wishlist").get(),
    userRef.collection("addresses").get(),
    userRef.collection("notifications").limit(30).get(),
  ]);

  return {
    cart: cartSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    wishlistIds: wishSnap.docs.map((d) => d.data().productId || d.id),
    addresses: addrSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    notifications: notifSnap.docs
      .map((d) => ({ id: d.id, ...d.data(), createdAt: toIsoDate(d.data().createdAt) }))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
  };
}

// ======================== CUSTOMER AUTH ========================

router.post("/auth/register", loginLimiter, async (req, res, next) => {
  try {
    const { displayName, email, phone, password, guestCart } = req.body || {};
    const cleanName = String(displayName || "").trim().slice(0, 80);
    const cleanEmail = String(email || "").trim().toLowerCase().slice(0, 120);
    const cleanPhone = String(phone || "").trim().slice(0, 30);

    if (cleanName.length < 2) {
      return res.status(400).json({ error: "Please enter your full name (at least 2 characters)." });
    }
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const db = getDb();
    const existingCred = await db
      .collection("customer_credentials")
      .where("email", "==", cleanEmail)
      .limit(1)
      .get();
    if (!existingCred.empty) {
      return res.status(409).json({ error: "An account with this email already exists. Please sign in." });
    }

    const existingUsers = await db.collection("users").where("email", "==", cleanEmail).limit(1).get();
    let uid;
    if (!existingUsers.empty) {
      const existingUid = existingUsers.docs[0].id;
      const existingCredById = await db.collection("customer_credentials").doc(existingUid).get();
      if (existingCredById.exists) {
        return res.status(409).json({ error: "An account with this email already exists. Please sign in." });
      }
      uid = existingUid;
    } else {
      uid = `cust_${crypto.randomBytes(10).toString("hex")}`;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = admin.firestore.FieldValue.serverTimestamp();

    const profilePayload = {
      userId: uid,
      displayName: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      photoUrl: "",
      language: "EN",
      darkMode: true,
      points: 150,
      walletBalance: 0,
      streakCount: 1,
      marketingOptIn: true,
      orderAlertsOptIn: true,
      priceDropOptIn: true,
      suspended: false,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("users").doc(uid).set(profilePayload, { merge: true });
    await db.collection("customer_credentials").doc(uid).set({
      userId: uid,
      email: cleanEmail,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    await mergeGuestCartItems(db, uid, guestCart);

    const token = signCustomerToken({ uid, email: cleanEmail, displayName: cleanName });
    setCustomerSessionCookie(res, token);

    const hydrated = await fetchCustomerHydration(db, uid);
    res.status(201).json({
      authenticated: true,
      customer: {
        uid,
        displayName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        language: "EN",
        darkMode: true,
        points: 150,
        walletBalance: 0,
      },
      ...hydrated,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/login", loginLimiter, async (req, res, next) => {
  try {
    const { email, password, guestCart } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase().slice(0, 120);
    if (!isValidEmail(cleanEmail) || typeof password !== "string" || !password) {
      return res.status(400).json({ error: "Valid email and password are required." });
    }

    const db = getDb();
    const credSnap = await db
      .collection("customer_credentials")
      .where("email", "==", cleanEmail)
      .limit(1)
      .get();

    if (credSnap.empty) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const credDoc = credSnap.docs[0];
    const cred = credDoc.data() || {};
    const ok = await bcrypt.compare(password, cred.passwordHash || "");
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const uid = cred.userId || credDoc.id;
    const userSnap = await db.collection("users").doc(uid).get();
    const userData = userSnap.exists ? userSnap.data() : {};
    if (userData.suspended) {
      return res.status(403).json({ error: "Your account has been suspended. Contact MY Shop support." });
    }

    await mergeGuestCartItems(db, uid, guestCart);

    const displayName = userData.displayName || "MY Shopper";
    const token = signCustomerToken({ uid, email: cleanEmail, displayName });
    setCustomerSessionCookie(res, token);

    const hydrated = await fetchCustomerHydration(db, uid);
    res.json({
      authenticated: true,
      customer: {
        uid,
        displayName,
        email: cleanEmail,
        phone: userData.phone || "",
        language: userData.language || "EN",
        darkMode: userData.darkMode !== false,
        points: Number(userData.points || 0),
        walletBalance: Number(userData.walletBalance || 0),
      },
      ...hydrated,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/logout", (_req, res) => {
  clearCustomerSessionCookie(res);
  res.json({ ok: true });
});

router.get("/auth/me", optionalCustomerAuth, async (req, res, next) => {
  try {
    if (!req.customerUser) {
      return res.json({ authenticated: false, customer: null });
    }
    const hydrated = await fetchCustomerHydration(getDb(), req.customerUser.uid);
    res.json({
      authenticated: true,
      customer: req.customerUser,
      ...hydrated,
    });
  } catch (err) {
    next(err);
  }
});

// ======================== PROFILE & ADDRESSES ========================

router.put("/profile", requireCustomerAuth, async (req, res, next) => {
  try {
    const uid = req.customerUser.uid;
    const b = req.body || {};
    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (typeof b.displayName === "string" && b.displayName.trim().length >= 2) {
      updates.displayName = b.displayName.trim().slice(0, 80);
    }
    if (typeof b.phone === "string") {
      updates.phone = b.phone.trim().slice(0, 30);
    }
    if (b.language === "EN" || b.language === "BN") {
      updates.language = b.language;
    }
    if (typeof b.darkMode === "boolean") {
      updates.darkMode = b.darkMode;
    }

    await getDb().collection("users").doc(uid).set(updates, { merge: true });
    res.json({ ok: true, updates });
  } catch (err) {
    next(err);
  }
});

router.get("/addresses", requireCustomerAuth, async (req, res, next) => {
  try {
    const snap = await getDb().collection("users").doc(req.customerUser.uid).collection("addresses").get();
    res.json({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    next(err);
  }
});

router.post("/addresses", requireCustomerAuth, async (req, res, next) => {
  try {
    const uid = req.customerUser.uid;
    const b = req.body || {};
    const recipientName = String(b.recipientName || req.customerUser.displayName || "").trim().slice(0, 80);
    const phone = String(b.phone || "").trim().slice(0, 30);
    const street = String(b.street || "").trim().slice(0, 200);
    const city = String(b.city || "").trim().slice(0, 60);
    const country = String(b.country || "Bangladesh").trim().slice(0, 60);
    const label = String(b.label || "Home").trim().slice(0, 30);

    if (recipientName.length < 1 || phone.length < 5 || street.length < 3 || city.length < 2) {
      return res.status(400).json({ error: "Recipient name, phone, street address, and city are required." });
    }

    const id = b.id ? sanitizeId(b.id, "addr") : `addr_${Date.now()}`;
    const payload = {
      userId: uid,
      label,
      recipientName,
      phone,
      street,
      city,
      postalCode: String(b.postalCode || "").trim().slice(0, 20),
      country,
      defaultAddress: Boolean(b.defaultAddress),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await getDb().collection("users").doc(uid).collection("addresses").doc(id).set(payload, { merge: true });
    res.status(201).json({ id, ...payload });
  } catch (err) {
    next(err);
  }
});

router.delete("/addresses/:id", requireCustomerAuth, async (req, res, next) => {
  try {
    const id = sanitizeId(req.params.id, "addr");
    await getDb().collection("users").doc(req.customerUser.uid).collection("addresses").doc(id).delete();
    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
});

// ======================== CART & WISHLIST ========================

router.get("/cart", requireCustomerAuth, async (req, res, next) => {
  try {
    const snap = await getDb().collection("users").doc(req.customerUser.uid).collection("cart").get();
    res.json({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    next(err);
  }
});

router.put("/cart", requireCustomerAuth, async (req, res, next) => {
  try {
    const uid = req.customerUser.uid;
    const db = getDb();
    const cartCol = db.collection("users").doc(uid).collection("cart");
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 40) : [];

    const existing = await cartCol.get();
    const batch = db.batch();
    existing.docs.forEach((d) => batch.delete(d.ref));

    const savedItems = [];
    for (const raw of items) {
      const productId = sanitizeId(raw?.productId || "", "");
      if (!productId) continue;
      const prodSnap = await db.collection("catalog_products").doc(productId).get();
      if (!prodSnap.exists) continue;
      const p = prodSnap.data() || {};
      const selectedColor = String(raw.selectedColor || "").trim().slice(0, 40);
      const selectedSize = String(raw.selectedSize || "").trim().slice(0, 40);
      const id = buildCartItemId(productId, selectedColor, selectedSize);
      const quantity = Math.max(1, Math.min(20, Math.round(Number(raw.quantity || 1))));

      const payload = {
        userId: uid,
        productId,
        productName: String(p.name || "MY Shop Item").slice(0, 140),
        unitPrice: Number(p.price || 0),
        mainImageUrl: p.mainImageUrl || (Array.isArray(p.imageUrls) && p.imageUrls[0]) || "",
        quantity,
        selectedColor,
        selectedSize,
        savedForLater: Boolean(raw.savedForLater),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      batch.set(cartCol.doc(id), payload);
      savedItems.push({ id, ...payload });
    }

    await batch.commit();
    res.json({ items: savedItems });
  } catch (err) {
    next(err);
  }
});

router.get("/wishlist", requireCustomerAuth, async (req, res, next) => {
  try {
    const snap = await getDb().collection("users").doc(req.customerUser.uid).collection("wishlist").get();
    res.json({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    next(err);
  }
});

router.post("/wishlist/toggle", requireCustomerAuth, async (req, res, next) => {
  try {
    const uid = req.customerUser.uid;
    const productId = sanitizeId(req.body?.productId || "", "");
    if (!productId) return res.status(400).json({ error: "productId is required." });

    const db = getDb();
    const ref = db.collection("users").doc(uid).collection("wishlist").doc(productId);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.delete();
      return res.json({ wished: false, productId });
    }

    const prodSnap = await db.collection("catalog_products").doc(productId).get();
    if (!prodSnap.exists) return res.status(404).json({ error: "Product not found." });
    const p = prodSnap.data() || {};

    await ref.set({
      userId: uid,
      productId,
      productName: String(p.name || "MY Shop Item").slice(0, 140),
      priceAlertEnabled: true,
      stockAlertEnabled: true,
      targetPrice: Number(p.price || 0),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ wished: true, productId });
  } catch (err) {
    next(err);
  }
});

// ======================== CHECKOUT & ORDER HISTORY ========================

router.get("/orders", requireCustomerAuth, async (req, res, next) => {
  try {
    const snap = await getDb().collection("users").doc(req.customerUser.uid).collection("orders").get();
    const items = snap.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: toIsoDate(d.data().createdAt),
        updatedAt: toIsoDate(d.data().updatedAt),
      }))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.post("/orders", requireCustomerAuth, async (req, res, next) => {
  try {
    const uid = req.customerUser.uid;
    const db = getDb();
    const { items, shippingAddress, paymentMethod, couponCode, idempotencyKey } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Your cart is empty." });
    }
    const cleanAddress = String(shippingAddress || "").trim().slice(0, 320);
    if (cleanAddress.length < 8) {
      return res.status(400).json({ error: "Please enter a complete shipping address (name, phone, street, city)." });
    }

    const cleanMethod = String(paymentMethod || "Cash on Delivery").trim().slice(0, 60);
    const cleanIdem = sanitizeId(idempotencyKey || `web_${uid}_${Date.now()}`, "idem");

    // Idempotency guard
    const dupCheck = await db
      .collection("users")
      .doc(uid)
      .collection("orders")
      .where("idempotencyKey", "==", cleanIdem)
      .limit(1)
      .get();
    if (!dupCheck.empty) {
      const d = dupCheck.docs[0];
      return res.json({ id: d.id, ...d.data(), deduplicated: true });
    }

    const cleanCoupon = String(couponCode || "").trim().toUpperCase();
    const isCod = cleanMethod.toLowerCase().includes("cash");
    const orderNumber = `MYS-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const orderRef = db.collection("users").doc(uid).collection("orders").doc();

    // Atomic Firestore Transaction prevents race-condition negative stock & enforces coupon limits
    const orderPayload = await db.runTransaction(async (tx) => {
      const uniqueItems = [];
      for (const raw of items.slice(0, 30)) {
        const productId = sanitizeId(raw?.productId || "", "");
        const qty = Math.max(1, Math.min(20, Math.round(Number(raw?.quantity || 1))));
        if (!productId) continue;
        uniqueItems.push({
          productId,
          qty,
          selectedColor: String(raw?.selectedColor || "").trim().slice(0, 40),
          selectedSize: String(raw?.selectedSize || "").trim().slice(0, 40),
        });
      }
      if (uniqueItems.length === 0) {
        const e = new Error("Your cart is empty.");
        e.statusCode = 400;
        throw e;
      }

      // Deduplicate reads by productId in case multiple variants of same product are ordered
      const prodIds = Array.from(new Set(uniqueItems.map((x) => x.productId)));
      const prodSnapshots = new Map();
      for (const pid of prodIds) {
        const snap = await tx.get(db.collection("catalog_products").doc(pid));
        prodSnapshots.set(pid, snap);
      }

      const couponRef = cleanCoupon ? db.collection("catalog_coupons").doc(cleanCoupon) : null;
      const couponSnap = couponRef ? await tx.get(couponRef) : null;
      const existingCartSnap = await tx.get(db.collection("users").doc(uid).collection("cart"));

      let subtotal = 0;
      let totalItemCount = 0;
      let allFreeDelivery = true;
      const verifiedItems = [];
      const qtyByProduct = new Map();

      for (const line of uniqueItems) {
        qtyByProduct.set(line.productId, (qtyByProduct.get(line.productId) || 0) + line.qty);
      }

      for (const [pid, totalQty] of qtyByProduct.entries()) {
        const pSnap = prodSnapshots.get(pid);
        if (!pSnap || !pSnap.exists) {
          const e = new Error(`Product ${pid} is no longer available.`);
          e.statusCode = 400;
          throw e;
        }
        const p = pSnap.data() || {};
        if (p.published === false || p.available === false) {
          const e = new Error(`${p.name || pid} is currently unavailable.`);
          e.statusCode = 400;
          throw e;
        }
        const liveStock = Number(p.stock || 0);
        if (liveStock < totalQty) {
          const e = new Error(`Insufficient stock for ${p.name}. Available: ${liveStock}`);
          e.statusCode = 400;
          throw e;
        }
      }

      for (const line of uniqueItems) {
        const p = prodSnapshots.get(line.productId).data() || {};
        const unitPrice = toSafeNumber(p.price, 0, 0, 50000000);
        subtotal += unitPrice * line.qty;
        totalItemCount += line.qty;
        if (!p.freeDelivery) allFreeDelivery = false;

        verifiedItems.push({
          productId: line.productId,
          productName: p.name || "MY Shop Item",
          unitPrice,
          quantity: line.qty,
          selectedColor: line.selectedColor,
          selectedSize: line.selectedSize,
          mainImageUrl: p.mainImageUrl || p.imageUrl || "",
        });
      }

      let discountAmount = 0;
      let freeDeliveryCoupon = false;
      if (cleanCoupon) {
        if (!couponSnap || !couponSnap.exists || couponSnap.data().active === false) {
          const e = new Error(`Coupon "${cleanCoupon}" is invalid or expired.`);
          e.statusCode = 400;
          throw e;
        }
        const c = couponSnap.data();
        if (c.expiresAt) {
          const expMs = Date.parse(c.expiresAt);
          if (!Number.isNaN(expMs) && expMs < Date.now()) {
            const e = new Error(`Coupon "${cleanCoupon}" has expired.`);
            e.statusCode = 400;
            throw e;
          }
        }
        const usageLimit = Number(c.usageLimit || 0);
        const usedCount = Number(c.usedCount || 0);
        if (usageLimit > 0 && usedCount >= usageLimit) {
          const e = new Error(`Coupon "${cleanCoupon}" usage limit has been reached.`);
          e.statusCode = 400;
          throw e;
        }
        const minSpend = Number(c.minSpend || 0);
        if (subtotal < minSpend) {
          const e = new Error(`Minimum spend for ${cleanCoupon} is ৳${minSpend}.`);
          e.statusCode = 400;
          throw e;
        }
        if (c.discountType === "PERCENT") {
          discountAmount = Math.round((subtotal * Number(c.value || 0)) / 100);
          if (Number(c.maxDiscount || 0) > 0) {
            discountAmount = Math.min(discountAmount, Number(c.maxDiscount));
          }
        } else if (c.discountType === "FIXED") {
          discountAmount = Math.min(subtotal, Number(c.value || 0));
        } else if (c.discountType === "FREE_DELIVERY") {
          freeDeliveryCoupon = true;
        }
      }

      const deliveryFee = allFreeDelivery || freeDeliveryCoupon || subtotal >= 2500 ? 0 : 80;
      const totalAmount = Math.max(0, subtotal - discountAmount + deliveryFee);
      const itemsSummary = verifiedItems.map((i) => `${i.productName} x${i.quantity}`).join(", ").slice(0, 240);
      const now = admin.firestore.FieldValue.serverTimestamp();

      const payload = {
        userId: uid,
        orderNumber,
        idempotencyKey: cleanIdem,
        itemsSummary,
        itemCount: totalItemCount,
        items: verifiedItems,
        shippingAddress: cleanAddress,
        paymentMethod: cleanMethod,
        paymentStatus: isCod ? "COD_PENDING" : "PENDING",
        orderStatus: "Pending",
        transactionRef: isCod ? "" : `WEB-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
        trackingCode: "",
        couponCode: cleanCoupon,
        subtotal,
        discountAmount,
        deliveryFee,
        totalAmount,
        createdAt: now,
        updatedAt: now,
      };

      tx.set(orderRef, payload);
      for (const [pid, qty] of qtyByProduct.entries()) {
        const pData = prodSnapshots.get(pid).data() || {};
        const prevStock = Number(pData.stock || 0);
        const nextStock = Math.max(0, prevStock - qty);
        tx.update(db.collection("catalog_products").doc(pid), {
          stock: nextStock,
          updatedAt: now,
        });
        tx.set(db.collection("inventory_logs").doc(), {
          productId: pid,
          productName: pData.name || pid,
          previousStock: prevStock,
          newStock: nextStock,
          delta: -qty,
          reason: `Customer Checkout (${orderNumber})`,
          adminUsername: "system",
          createdAt: now,
        });
      }
      if (couponRef && cleanCoupon) {
        tx.update(couponRef, {
          usedCount: admin.firestore.FieldValue.increment(1),
          updatedAt: now,
        });
      }
      existingCartSnap.docs.forEach((d) => {
        if (!d.data().savedForLater) tx.delete(d.ref);
      });
      const notifRef = db.collection("users").doc(uid).collection("notifications").doc();
      tx.set(notifRef, {
        userId: uid,
        title: `Order Placed • ${orderNumber}`,
        body: `We received your order for ${itemsSummary} (Total: ৳${totalAmount}).`,
        category: "ORDER",
        read: false,
        createdAt: now,
        updatedAt: now,
      });

      return payload;
    });

    res.status(201).json({
      id: orderRef.id,
      ...orderPayload,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/notifications", requireCustomerAuth, async (req, res, next) => {
  try {
    const snap = await getDb().collection("users").doc(req.customerUser.uid).collection("notifications").limit(30).get();
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data(), createdAt: toIsoDate(d.data().createdAt) }))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.patch("/notifications/read-all", requireCustomerAuth, async (req, res, next) => {
  try {
    const db = getDb();
    const snap = await db.collection("users").doc(req.customerUser.uid).collection("notifications").where("read", "==", false).limit(50).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    if (!snap.empty) await batch.commit();
    res.json({ ok: true, marked: snap.size });
  } catch (err) {
    next(err);
  }
});

router.post("/reviews", requireCustomerAuth, async (req, res, next) => {
  try {
    const uid = req.customerUser.uid;
    const productId = sanitizeId(req.body?.productId || "", "");
    const rating = Math.max(1, Math.min(5, Math.round(Number(req.body?.rating || 5))));
    const comment = String(req.body?.comment || "").trim().slice(0, 600);
    if (!productId || comment.length < 3) {
      return res.status(400).json({ error: "Product and review comment (min 3 chars) are required." });
    }

    const db = getDb();
    const prodRef = db.collection("catalog_products").doc(productId);
    const prodSnap = await prodRef.get();
    if (!prodSnap.exists) return res.status(404).json({ error: "Product not found." });

    const reviewEntry = {
      id: `rev_${Date.now()}`,
      userId: uid,
      author: req.customerUser.displayName || "MY Shopper",
      rating,
      comment,
      dateLabel: new Date().toISOString().slice(0, 10),
    };

    const existing = prodSnap.data() || {};
    const nextReviews = [reviewEntry, ...(Array.isArray(existing.reviews) ? existing.reviews : [])].slice(0, 30);
    const avgRating = Number(
      (nextReviews.reduce((s, r) => s + Number(r.rating || 5), 0) / nextReviews.length).toFixed(1)
    );
    const nextCount = Math.max(nextReviews.length, Number(existing.reviewCount || 0) + 1);

    await Promise.all([
      db.collection("users").doc(uid).collection("reviews").doc(reviewEntry.id).set({
        ...reviewEntry,
        productId,
        productName: existing.name || productId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
      prodRef.update({
        reviews: nextReviews,
        rating: avgRating,
        reviewCount: nextCount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
    ]);

    res.status(201).json({ ok: true, review: reviewEntry, rating: avgRating, reviewCount: nextCount });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
