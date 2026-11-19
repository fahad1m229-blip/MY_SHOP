const express = require("express");
const { admin, getDb } = require("../config/firebase");
const { requireAdminAuth } = require("../middleware/auth");
const { sanitizeId, toSafeNumber, toIsoDate } = require("../middleware/validate");
const { logAdminAudit } = require("../services/auditService");

const router = express.Router();
router.use(requireAdminAuth);

// ======================== PAYMENTS ========================

router.get("/payments", async (_req, res, next) => {
  try {
    const db = getDb();
    const [ordersSnap, configSnap] = await Promise.all([
      db.collectionGroup("orders").get(),
      db.collection("site_config").doc("main").get(),
    ]);

    const transactions = ordersSnap.docs
      .map((d) => {
        const o = d.data();
        return {
          orderId: d.id,
          userId: o.userId || d.ref.parent.parent?.id || "",
          orderNumber: o.orderNumber || d.id,
          paymentMethod: o.paymentMethod || "Unknown",
          paymentStatus: o.paymentStatus || "PENDING",
          transactionRef: o.transactionRef || "",
          amount: Number(o.totalAmount || 0),
          createdAt: toIsoDate(o.createdAt),
        };
      })
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    const siteData = configSnap.exists ? configSnap.data() : {};
    res.json({
      transactions,
      paymentSettings: siteData.paymentSettings || {
        bKash: { enabled: true, mode: "SANDBOX", instructions: "Pay via bKash merchant gateway" },
        Nagad: { enabled: true, mode: "SANDBOX", instructions: "Pay via Nagad checkout" },
        Rocket: { enabled: true, mode: "SANDBOX", instructions: "DBBL Rocket digital wallet" },
        Visa: { enabled: true, mode: "SANDBOX", instructions: "3DS Verified Visa Gateway" },
        Mastercard: { enabled: true, mode: "SANDBOX", instructions: "Mastercard Global Gateway" },
        CashOnDelivery: { enabled: true, mode: "ACTIVE", instructions: "Pay on doorstep delivery" },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put("/payments/settings", async (req, res, next) => {
  try {
    const paymentSettings = req.body?.paymentSettings;
    if (!paymentSettings || typeof paymentSettings !== "object") {
      return res.status(400).json({ error: "paymentSettings object required." });
    }
    await getDb().collection("site_config").doc("main").set(
      {
        paymentSettings,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    await logAdminAudit(req, "PAYMENT_SETTINGS_UPDATE", "site_config/main");
    res.json({ ok: true, paymentSettings });
  } catch (err) {
    next(err);
  }
});

// Verify payment against trusted server gateway state (NEVER fakes PAID for unverified payments)
router.post("/payments/:userId/:orderId/verify", async (req, res, next) => {
  try {
    const { userId, orderId } = req.params;
    const db = getDb();
    const ref = db.collection("users").doc(userId).collection("orders").doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Order transaction not found." });

    const o = snap.data();
    // Only report actual stored gateway state or query configured server credentials
    const hasLiveBkash = Boolean(process.env.BKASH_APP_KEY && process.env.BKASH_APP_SECRET);
    res.json({
      orderId,
      orderNumber: o.orderNumber,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      transactionRef: o.transactionRef || "",
      gatewayMode: hasLiveBkash ? "LIVE_API_READY" : "SANDBOX_READONLY",
      verified: o.paymentStatus === "PAID_SANDBOX" || o.paymentStatus === "PAID",
      message:
        o.paymentStatus === "PENDING"
          ? "Payment is still PENDING gateway callback; unverified payments cannot be marked paid manually."
          : `Gateway state is ${o.paymentStatus}.`,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/payments/:userId/:orderId/refund", async (req, res, next) => {
  try {
    const { userId, orderId } = req.params;
    const db = getDb();
    const ref = db.collection("users").doc(userId).collection("orders").doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Order not found." });
    const o = snap.data();
    if (o.paymentStatus !== "PAID_SANDBOX" && o.paymentStatus !== "PAID") {
      return res.status(400).json({ error: "Only verified paid orders can be refunded." });
    }
    await ref.update({
      paymentStatus: "REFUNDED",
      orderStatus: "Refunded",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection("users").doc(userId).collection("notifications").add({
      userId,
      title: `Refund Issued • ${o.orderNumber}`,
      body: `Refund of ৳${o.totalAmount} for ${o.paymentMethod} has been processed.`,
      category: "PAYMENT",
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await logAdminAudit(req, "PAYMENT_REFUND", ref.path, { amount: o.totalAmount });
    res.json({ ok: true, paymentStatus: "REFUNDED" });
  } catch (err) {
    next(err);
  }
});

// ======================== COUPONS & FLASH SALES ========================

router.get("/coupons", async (_req, res, next) => {
  try {
    const snap = await getDb().collection("catalog_coupons").get();
    res.json({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    next(err);
  }
});

router.post("/coupons", async (req, res, next) => {
  try {
    const { code, title, discountType, value, minSpend, maxDiscount, usageLimit, expiresLabel, active, bogoEnabled } =
      req.body || {};
    const cleanCode = String(code || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!cleanCode || !title) return res.status(400).json({ error: "Coupon code and title required." });
    if (!["PERCENT", "FIXED", "FREE_DELIVERY"].includes(discountType)) {
      return res.status(400).json({ error: "discountType must be PERCENT, FIXED, or FREE_DELIVERY." });
    }
    const payload = {
      code: cleanCode,
      title: String(title).trim().slice(0, 120),
      discountType,
      value: toSafeNumber(value, 0, 0, 100000),
      minSpend: toSafeNumber(minSpend, 0, 0, 1000000),
      maxDiscount: toSafeNumber(maxDiscount, 0, 0, 1000000),
      usageLimit: Math.round(toSafeNumber(usageLimit, 1000, 1, 1000000)),
      expiresLabel: String(expiresLabel || "Limited Offer").trim().slice(0, 40),
      active: active !== false,
      bogoEnabled: Boolean(bogoEnabled),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await getDb().collection("catalog_coupons").doc(cleanCode).set(payload, { merge: true });
    await logAdminAudit(req, "COUPON_UPSERT", `catalog_coupons/${cleanCode}`, payload);
    res.status(201).json({ id: cleanCode, ...payload });
  } catch (err) {
    next(err);
  }
});

router.delete("/coupons/:code", async (req, res, next) => {
  try {
    const cleanCode = sanitizeId(req.params.code.toUpperCase(), "COUPON");
    await getDb().collection("catalog_coupons").doc(cleanCode).delete();
    await logAdminAudit(req, "COUPON_DELETE", `catalog_coupons/${cleanCode}`);
    res.json({ deleted: true, code: cleanCode });
  } catch (err) {
    next(err);
  }
});

// ======================== FUN ZONE ========================

router.get("/fun-zone", async (_req, res, next) => {
  try {
    const snap = await getDb().collection("fun_zone_config").doc("rules").get();
    res.json(
      snap.exists
        ? snap.data()
        : {
            spinEnabled: true,
            dailySpinLimit: 1,
            scratchEnabled: true,
            dailyScratchLimit: 1,
            treasureEnabled: true,
            quizEnabled: true,
            funnyZoneEnabled: true,
            streakPointsBase: 25,
            referralBonusPoints: 200,
            expiryDays: 7,
          }
    );
  } catch (err) {
    next(err);
  }
});

router.put("/fun-zone", async (req, res, next) => {
  try {
    const b = req.body || {};
    const payload = {
      spinEnabled: b.spinEnabled !== false,
      dailySpinLimit: Math.round(toSafeNumber(b.dailySpinLimit, 1, 1, 5)),
      scratchEnabled: b.scratchEnabled !== false,
      dailyScratchLimit: Math.round(toSafeNumber(b.dailyScratchLimit, 1, 1, 5)),
      treasureEnabled: b.treasureEnabled !== false,
      quizEnabled: b.quizEnabled !== false,
      funnyZoneEnabled: b.funnyZoneEnabled !== false,
      streakPointsBase: Math.round(toSafeNumber(b.streakPointsBase, 25, 5, 500)),
      referralBonusPoints: Math.round(toSafeNumber(b.referralBonusPoints, 200, 0, 5000)),
      expiryDays: Math.round(toSafeNumber(b.expiryDays, 7, 1, 365)),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await getDb().collection("fun_zone_config").doc("rules").set(payload, { merge: true });
    await logAdminAudit(req, "FUN_ZONE_CONFIG_UPDATE", "fun_zone_config/rules", payload);
    res.json({ ok: true, ...payload });
  } catch (err) {
    next(err);
  }
});

// ======================== AI SETTINGS ========================

router.get("/ai-settings", async (_req, res, next) => {
  try {
    const snap = await getDb().collection("ai_settings").doc("main").get();
    res.json(
      snap.exists
        ? snap.data()
        : {
            enabled: true,
            assistantName: "MY AI Shopping Assistant",
            welcomeMessage: "Hi! Ask me for phone deals under ৳20,000, gaming headsets, or gift ideas.",
            modelName: "gemini-3.8-flash",
            suggestedPrompts: [
              "Find me a good phone under ৳20,000",
              "Show the best gaming headphones",
              "Find products with free delivery",
            ],
            recommendationRule: "Recommend only verified in-stock MY Shop catalog items.",
          }
    );
  } catch (err) {
    next(err);
  }
});

router.put("/ai-settings", async (req, res, next) => {
  try {
    const b = req.body || {};
    // Never accept or store client-exposed raw AI keys here
    const payload = {
      enabled: b.enabled !== false,
      assistantName: String(b.assistantName || "MY AI Shopping Assistant").trim().slice(0, 80),
      welcomeMessage: String(b.welcomeMessage || "").trim().slice(0, 500),
      modelName: String(b.modelName || "gemini-3.8-flash").trim().slice(0, 60),
      suggestedPrompts: Array.isArray(b.suggestedPrompts)
        ? b.suggestedPrompts.map((s) => String(s).trim()).filter(Boolean).slice(0, 8)
        : [],
      recommendationRule: String(b.recommendationRule || "").trim().slice(0, 400),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await getDb().collection("ai_settings").doc("main").set(payload, { merge: true });
    await logAdminAudit(req, "AI_SETTINGS_UPDATE", "ai_settings/main");
    res.json({ ok: true, ...payload });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
