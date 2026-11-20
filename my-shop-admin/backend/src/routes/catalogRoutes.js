const express = require("express");
const { admin, getDb } = require("../config/firebase");
const { requireAdminAuth } = require("../middleware/auth");
const {
  isValidHttpUrl,
  isValidAssetUrl,
  sanitizeId,
  sanitizeDocIdParam,
  toSafeNumber,
  toIsoDate,
  parsePagination,
} = require("../middleware/validate");
const {
  uploadMiddleware,
  uploadBufferToFirebaseStorage,
  deleteUploadedAssetIfOwned,
} = require("../services/storageService");
const { logAdminAudit } = require("../services/auditService");

const router = express.Router();
router.use(requireAdminAuth);

// POST /api/admin/catalog/uploads/images (Multi-image upload for mobile gallery & desktop)
router.post("/uploads/images", uploadMiddleware.array("images", 8), async (req, res, next) => {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: "Please select at least one JPG, PNG, or WebP image." });
    }
    const folder = sanitizeId(req.body?.folder || "products", "products");
    const uploaded = [];
    for (const file of files) {
      const result = await uploadBufferToFirebaseStorage(file, `catalog/${folder}`);
      uploaded.push(result);
    }
    await logAdminAudit(req, "STORAGE_UPLOAD_IMAGES", `catalog/${folder}`, { count: uploaded.length });
    res.status(201).json({ images: uploaded });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/catalog/uploads/library (Existing uploaded images from products/categories/banners)
router.get("/uploads/library", async (_req, res, next) => {
  try {
    const db = getDb();
    const [prodSnap, catSnap, siteSnap] = await Promise.all([
      db.collection("catalog_products").get(),
      db.collection("catalog_categories").get(),
      db.collection("site_config").doc("main").get(),
    ]);
    const urls = new Set();
    prodSnap.forEach((d) => {
      const data = d.data();
      if (isValidAssetUrl(data.mainImageUrl)) urls.add(data.mainImageUrl);
      if (isValidAssetUrl(data.imageUrl)) urls.add(data.imageUrl);
      if (Array.isArray(data.imageUrls)) data.imageUrls.forEach((u) => isValidAssetUrl(u) && urls.add(u));
      if (Array.isArray(data.images)) data.images.forEach((u) => isValidAssetUrl(u) && urls.add(u));
    });
    catSnap.forEach((d) => {
      const data = d.data();
      if (isValidAssetUrl(data.imageUrl)) urls.add(data.imageUrl);
    });
    if (siteSnap.exists && Array.isArray(siteSnap.data().banners)) {
      siteSnap.data().banners.forEach((b) => {
        if (isValidAssetUrl(b?.imageUrl)) urls.add(b.imageUrl);
      });
    }
    res.json({ urls: Array.from(urls) });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/catalog/validate-image-url
router.post("/validate-image-url", async (req, res) => {
  const { url } = req.body || {};
  if (!isValidAssetUrl(url)) {
    return res.status(400).json({ valid: false, error: "Enter a valid http://, https://, or /uploads/ image URL." });
  }
  if (String(url).trim().startsWith("/uploads/")) {
    return res.json({ valid: true, status: 200, contentType: "image/local" });
  }
  try {
    const resp = await fetch(url.trim(), { method: "HEAD" });
    const ct = resp.headers.get("content-type") || "";
    const valid = resp.ok && (!ct || ct.startsWith("image/"));
    res.json({ valid, status: resp.status, contentType: ct });
  } catch {
    res.json({ valid: true, note: "URL syntax valid (remote server blocked HEAD preflight)." });
  }
});

// ======================== PRODUCTS ========================

function normalizeProductOutput(doc) {
  const d = doc.data ? doc.data() : doc;
  const legacyImages = Array.isArray(d.imageUrls)
    ? d.imageUrls
    : Array.isArray(d.images)
    ? d.images
    : [];
  const mainImageUrl = d.mainImageUrl || d.imageUrl || legacyImages[0] || "";
  const imageUrls = legacyImages.length ? legacyImages : mainImageUrl ? [mainImageUrl] : [];
  return {
    id: doc.id || d.id,
    ...d,
    mainImageUrl,
    imageUrls,
    createdAt: toIsoDate(d.createdAt),
    updatedAt: toIsoDate(d.updatedAt),
  };
}

router.get("/products", async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const search = String(req.query.search || "").trim().toLowerCase();
    const categoryId = String(req.query.category || "").trim();
    const stockFilter = String(req.query.stock || "").trim();
    const statusFilter = String(req.query.status || "all").trim();
    const sort = String(req.query.sort || "newest").trim();

    const snap = await getDb().collection("catalog_products").get();
    let list = snap.docs.map(normalizeProductOutput);

    if (search) {
      list = list.filter((p) =>
        `${p.name || ""} ${p.nameBn || ""} ${p.sku || ""} ${p.brand || ""} ${p.id || ""}`.toLowerCase().includes(search)
      );
    }
    if (categoryId && categoryId !== "ALL") {
      list = list.filter((p) => String(p.categoryId || "").toUpperCase() === categoryId.toUpperCase());
    }
    if (stockFilter === "low") list = list.filter((p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= 5);
    if (stockFilter === "out") list = list.filter((p) => Number(p.stock || 0) <= 0);
    if (stockFilter === "in") list = list.filter((p) => Number(p.stock || 0) > 0);
    if (statusFilter === "published") list = list.filter((p) => p.published !== false);
    if (statusFilter === "draft") list = list.filter((p) => p.published === false);

    if (sort === "price_asc") list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    else if (sort === "price_desc") list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    else if (sort === "stock_asc") list.sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));
    else if (sort === "name_asc") list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    else list.sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));

    const total = list.length;
    const paged = list.slice((page - 1) * limit, page * limit);
    res.json({ items: paged, total, page, limit });
  } catch (err) {
    next(err);
  }
});

router.get("/products/:id", async (req, res, next) => {
  try {
    const id = sanitizeDocIdParam(req.params.id);
    const snap = await getDb().collection("catalog_products").doc(id).get();
    if (!snap.exists) return res.status(404).json({ error: "Product not found." });
    res.json(normalizeProductOutput(snap));
  } catch (err) {
    next(err);
  }
});

function buildProductPayload(body, isCreate = false, existing = null) {
  const prev = existing || {};
  const name = String(body.name ?? prev.name ?? "").trim();
  if (!name || name.length > 160) {
    const e = new Error("Product name is required (max 160 chars).");
    e.statusCode = 400;
    throw e;
  }
  const price = toSafeNumber(body.price ?? prev.price, 0, 0, 50000000);
  const rawOriginal = body.originalPrice ?? prev.originalPrice ?? price;
  const originalPrice = Math.max(price, toSafeNumber(rawOriginal, price, 0, 50000000));
  const discountPercent =
    body.discountPercent !== undefined && body.discountPercent !== ""
      ? Math.round(toSafeNumber(body.discountPercent, 0, 0, 99))
      : originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  const incomingImages = Array.isArray(body.imageUrls)
    ? body.imageUrls
    : Array.isArray(prev.imageUrls)
    ? prev.imageUrls
    : Array.isArray(prev.images)
    ? prev.images
    : [];
  const imageUrls = incomingImages.filter((u) => isValidAssetUrl(u)).slice(0, 12);
  const candidateMain = body.mainImageUrl ?? prev.mainImageUrl ?? prev.imageUrl ?? "";
  const mainImageUrl = isValidAssetUrl(candidateMain)
    ? candidateMain.trim()
    : imageUrls[0] || "";

  if (mainImageUrl && !imageUrls.includes(mainImageUrl)) {
    imageUrls.unshift(mainImageUrl);
  }

  const payload = {
    name,
    nameBn: String(body.nameBn ?? prev.nameBn ?? "").trim().slice(0, 160),
    sku: String(body.sku || prev.sku || `MYS-${Date.now().toString().slice(-6)}`).trim().slice(0, 60),
    description: String(body.description ?? prev.description ?? "").trim().slice(0, 3000),
    categoryId: String(body.categoryId || prev.categoryId || "MOBILES").trim().slice(0, 60),
    brand: String(body.brand ?? prev.brand ?? "NovaTech").trim().slice(0, 80),
    price,
    originalPrice,
    discountPercent,
    stock: Math.round(toSafeNumber(body.stock ?? prev.stock, 0, 0, 1000000)),
    available: body.available !== undefined ? Boolean(body.available) : prev.available !== false,
    published: body.published !== undefined ? Boolean(body.published) : prev.published !== false,
    featured: body.featured !== undefined ? Boolean(body.featured) : Boolean(prev.featured),
    bestSeller: body.bestSeller !== undefined ? Boolean(body.bestSeller) : Boolean(prev.bestSeller),
    trending: body.trending !== undefined ? Boolean(body.trending) : Boolean(prev.trending),
    flashSale: body.flashSale !== undefined ? Boolean(body.flashSale) : Boolean(prev.flashSale),
    todaysDeal: body.todaysDeal !== undefined ? Boolean(body.todaysDeal) : Boolean(prev.todaysDeal),
    newArrival: body.newArrival !== undefined ? Boolean(body.newArrival) : Boolean(prev.newArrival),
    freeDelivery: body.freeDelivery !== undefined ? Boolean(body.freeDelivery) : Boolean(prev.freeDelivery),
    scheduledAt: body.scheduledAt !== undefined ? String(body.scheduledAt || "").trim() : String(prev.scheduledAt || ""),
    colors: Array.isArray(body.colors)
      ? body.colors.map((s) => String(s).trim()).filter(Boolean).slice(0, 20)
      : Array.isArray(prev.colors)
      ? prev.colors
      : [],
    sizes: Array.isArray(body.sizes)
      ? body.sizes.map((s) => String(s).trim()).filter(Boolean).slice(0, 20)
      : Array.isArray(prev.sizes)
      ? prev.sizes
      : [],
    variants: Array.isArray(body.variants) ? body.variants.slice(0, 20) : Array.isArray(prev.variants) ? prev.variants : [],
    specs: Array.isArray(body.specs) ? body.specs.slice(0, 30) : Array.isArray(prev.specs) ? prev.specs : [],
    imageUrls,
    mainImageUrl,
    accentHex: String(body.accentHex || prev.accentHex || "#8B20FF").trim().slice(0, 20),
    secondaryHex: String(body.secondaryHex || prev.secondaryHex || "#168BFF").trim().slice(0, 20),
    sellerId: String(body.sellerId ?? prev.sellerId ?? "").trim(),
    sellerName: String(body.sellerName ?? prev.sellerName ?? "MY Shop Official").trim(),
    rating: toSafeNumber(prev.rating ?? body.rating, 4.8, 0, 5),
    reviewCount: Math.round(toSafeNumber(prev.reviewCount ?? body.reviewCount, 0, 0, 1000000)),
    reviews: Array.isArray(prev.reviews) ? prev.reviews : [],
    qaList: Array.isArray(prev.qaList) ? prev.qaList : [],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (isCreate) {
    payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }
  return payload;
}

router.post("/products", async (req, res, next) => {
  try {
    const db = getDb();
    const id = req.body.id ? sanitizeId(req.body.id, "prod") : `prod_${Date.now()}`;
    const payload = buildProductPayload(req.body, true, null);
    await db.collection("catalog_products").doc(id).set(payload);
    await logAdminAudit(req, "PRODUCT_CREATE", `catalog_products/${id}`, { name: payload.name, sku: payload.sku });
    res.status(201).json({ id, ...payload });
  } catch (err) {
    next(err);
  }
});

router.put("/products/:id", async (req, res, next) => {
  try {
    const id = sanitizeDocIdParam(req.params.id);
    const db = getDb();
    const ref = db.collection("catalog_products").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: `Product "${id}" not found.` });

    const existing = snap.data() || {};
    const payload = buildProductPayload(req.body, false, existing);
    await ref.set(payload, { merge: true });
    await logAdminAudit(req, "PRODUCT_UPDATE", `catalog_products/${id}`, { name: payload.name });
    res.json({ id, ...payload });
  } catch (err) {
    next(err);
  }
});

router.patch("/products/:id/quick", async (req, res, next) => {
  try {
    const id = sanitizeDocIdParam(req.params.id);
    const db = getDb();
    const ref = db.collection("catalog_products").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: `Product "${id}" not found.` });

    const allowed = [
      "published",
      "featured",
      "bestSeller",
      "trending",
      "flashSale",
      "todaysDeal",
      "newArrival",
      "freeDelivery",
      "available",
      "stock",
      "price",
    ];
    const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        updates[k] =
          k === "stock"
            ? Math.round(toSafeNumber(req.body[k], 0, 0, 1000000))
            : k === "price"
            ? toSafeNumber(req.body[k], 0, 0, 50000000)
            : Boolean(req.body[k]);
      }
    }
    await ref.update(updates);
    await logAdminAudit(req, "PRODUCT_QUICK_UPDATE", `catalog_products/${id}`, updates);
    res.json({ id, updated: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/catalog/products/bulk (Bulk delete, status, category, stock adjustment)
router.post("/products/bulk", async (req, res, next) => {
  try {
    const { ids, action, categoryId, stockValue } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Select at least one product." });
    }
    const cleanIds = Array.from(new Set(ids.map((x) => sanitizeDocIdParam(x)))).slice(0, 100);
    const db = getDb();
    const now = admin.firestore.FieldValue.serverTimestamp();
    let affected = 0;

    if (action === "delete") {
      for (const id of cleanIds) {
        const ref = db.collection("catalog_products").doc(id);
        const snap = await ref.get();
        if (!snap.exists) continue;
        const data = snap.data() || {};
        await ref.delete();
        affected++;
        if (isValidAssetUrl(data.mainImageUrl)) await deleteUploadedAssetIfOwned(data.mainImageUrl);
        if (Array.isArray(data.imageUrls)) {
          for (const u of data.imageUrls) await deleteUploadedAssetIfOwned(u);
        }
      }
    } else if (["publish", "unpublish", "available", "unavailable", "category", "stock_set"].includes(action)) {
      const batch = db.batch();
      for (const id of cleanIds) {
        const ref = db.collection("catalog_products").doc(id);
        const snap = await ref.get();
        if (!snap.exists) continue;
        const upd = { updatedAt: now };
        if (action === "publish") upd.published = true;
        if (action === "unpublish") upd.published = false;
        if (action === "available") upd.available = true;
        if (action === "unavailable") upd.available = false;
        if (action === "category") upd.categoryId = String(categoryId || "MOBILES").trim().slice(0, 60);
        if (action === "stock_set") {
          const nextStock = Math.round(toSafeNumber(stockValue, 0, 0, 1000000));
          upd.stock = nextStock;
          batch.set(db.collection("inventory_logs").doc(), {
            productId: id,
            productName: snap.data().name || id,
            previousStock: Number(snap.data().stock || 0),
            newStock: nextStock,
            delta: nextStock - Number(snap.data().stock || 0),
            reason: "Bulk Admin Stock Update",
            adminUsername: req.adminUser?.username || "admin",
            createdAt: now,
          });
        }
        batch.update(ref, upd);
        affected++;
      }
      if (affected > 0) await batch.commit();
    } else {
      return res.status(400).json({ error: "Invalid bulk action." });
    }

    await logAdminAudit(req, "PRODUCT_BULK_ACTION", "catalog_products", { action, count: affected });
    res.json({ ok: true, action, affected });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/catalog/inventory/adjust (Single product stock adjustment + audit log)
router.post("/inventory/adjust", async (req, res, next) => {
  try {
    const productId = sanitizeDocIdParam(req.body?.productId);
    const reason = String(req.body?.reason || "Manual Stock Adjustment").trim().slice(0, 180);
    const db = getDb();
    const ref = db.collection("catalog_products").doc(productId);

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        const e = new Error("Product not found.");
        e.statusCode = 404;
        throw e;
      }
      const p = snap.data() || {};
      const prevStock = Number(p.stock || 0);
      let newStock = prevStock;
      if (req.body.newStock !== undefined && req.body.newStock !== "") {
        newStock = Math.round(toSafeNumber(req.body.newStock, prevStock, 0, 1000000));
      } else {
        const delta = Math.round(Number(req.body.delta || 0));
        newStock = Math.max(0, Math.min(1000000, prevStock + delta));
      }
      const now = admin.firestore.FieldValue.serverTimestamp();
      tx.update(ref, {
        stock: newStock,
        available: newStock > 0 ? p.available !== false : p.available,
        updatedAt: now,
      });
      tx.set(db.collection("inventory_logs").doc(), {
        productId,
        productName: p.name || productId,
        previousStock: prevStock,
        newStock,
        delta: newStock - prevStock,
        reason,
        adminUsername: req.adminUser?.username || "admin",
        createdAt: now,
      });
      return { productId, previousStock: prevStock, newStock };
    });

    await logAdminAudit(req, "INVENTORY_ADJUST", `catalog_products/${productId}`, result);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.post("/products/:id/duplicate", async (req, res, next) => {
  try {
    const id = sanitizeDocIdParam(req.params.id);
    const db = getDb();
    const snap = await db.collection("catalog_products").doc(id).get();
    if (!snap.exists) return res.status(404).json({ error: `Product "${id}" not found.` });

    const orig = snap.data();
    const newId = `prod_${Date.now()}`;
    const copy = {
      ...orig,
      name: `${orig.name} (Copy)`,
      sku: `${orig.sku || "SKU"}-COPY`,
      published: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection("catalog_products").doc(newId).set(copy);
    await logAdminAudit(req, "PRODUCT_DUPLICATE", `catalog_products/${newId}`, { sourceId: id });
    res.status(201).json({ id: newId, ...copy });
  } catch (err) {
    next(err);
  }
});

router.delete("/products/:id", async (req, res, next) => {
  try {
    const id = sanitizeDocIdParam(req.params.id);
    const db = getDb();
    const ref = db.collection("catalog_products").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: `Product "${id}" not found.` });

    const data = snap.data() || {};
    await ref.delete();
    if (isValidAssetUrl(data.mainImageUrl)) await deleteUploadedAssetIfOwned(data.mainImageUrl);
    if (Array.isArray(data.imageUrls)) {
      for (const u of data.imageUrls) await deleteUploadedAssetIfOwned(u);
    }
    await logAdminAudit(req, "PRODUCT_DELETE", `catalog_products/${id}`, { name: data.name || id });
    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
});

// ======================== CATEGORIES & BRANDS ========================

router.get("/categories", async (_req, res, next) => {
  try {
    const db = getDb();
    const [snap, prodSnap] = await Promise.all([
      db.collection("catalog_categories").get(),
      db.collection("catalog_products").get(),
    ]);
    const counts = new Map();
    prodSnap.docs.forEach((p) => {
      const cid = String(p.data()?.categoryId || "").toUpperCase();
      if (cid) counts.set(cid, (counts.get(cid) || 0) + 1);
    });
    const items = snap.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
        productCount: counts.get(String(d.id).toUpperCase()) || 0,
      }))
      .sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0));
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.post("/categories", async (req, res, next) => {
  try {
    const { titleEn, titleBn, description, iconName, emoji, badgeText, imageUrl, orderIndex, enabled, subcategories } = req.body || {};
    if (!titleEn || !String(titleEn).trim()) return res.status(400).json({ error: "Category name required." });
    const id = req.body.id ? sanitizeDocIdParam(req.body.id) : sanitizeId(titleEn.toUpperCase(), "CAT");
    const payload = {
      titleEn: String(titleEn).trim().slice(0, 80),
      titleBn: String(titleBn || "").trim().slice(0, 80),
      description: String(description || "").trim().slice(0, 400),
      iconName: String(iconName || "Category").trim(),
      emoji: String(emoji || "").trim().slice(0, 8),
      badgeText: String(badgeText || "").trim().slice(0, 16),
      imageUrl: isValidAssetUrl(imageUrl) ? imageUrl.trim() : "",
      orderIndex: Math.round(toSafeNumber(orderIndex, 0, 0, 9999)),
      enabled: enabled !== false,
      subcategories: Array.isArray(subcategories) ? subcategories.map((s) => String(s).trim()).filter(Boolean) : [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await getDb().collection("catalog_categories").doc(id).set(payload, { merge: true });
    await logAdminAudit(req, "CATEGORY_UPSERT", `catalog_categories/${id}`, { titleEn: payload.titleEn });
    res.status(201).json({ id, ...payload });
  } catch (err) {
    next(err);
  }
});

router.delete("/categories/:id", async (req, res, next) => {
  try {
    const id = sanitizeDocIdParam(req.params.id);
    const force = req.query.force === "true";
    const reassignTo = String(req.query.reassignTo || "").trim();
    const db = getDb();
    const catRef = db.collection("catalog_categories").doc(id);
    const catSnap = await catRef.get();
    if (!catSnap.exists) return res.status(404).json({ error: `Category "${id}" not found.` });

    const linkedSnap = await db.collection("catalog_products").get();
    const linkedDocs = linkedSnap.docs.filter(
      (d) => String(d.data()?.categoryId || "").toUpperCase() === id.toUpperCase()
    );

    if (linkedDocs.length > 0 && !force && !reassignTo) {
      return res.status(409).json({
        error: `Category "${id}" currently contains ${linkedDocs.length} product(s). Choose a replacement category or confirm force delete.`,
        productCount: linkedDocs.length,
      });
    }

    if (linkedDocs.length > 0 && reassignTo) {
      const batch = db.batch();
      const targetCat = sanitizeDocIdParam(reassignTo);
      linkedDocs.forEach((d) =>
        batch.update(d.ref, {
          categoryId: targetCat,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      );
      await batch.commit();
    }

    await catRef.delete();
    await logAdminAudit(req, "CATEGORY_DELETE", `catalog_categories/${id}`, {
      reassignedTo: reassignTo || null,
      linkedCount: linkedDocs.length,
    });
    res.json({ deleted: true, id, reassignedCount: reassignTo ? linkedDocs.length : 0 });
  } catch (err) {
    next(err);
  }
});

router.get("/brands", async (_req, res, next) => {
  try {
    const snap = await getDb().collection("catalog_brands").get();
    res.json({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    next(err);
  }
});

router.post("/brands", async (req, res, next) => {
  try {
    const { name, tagline, logoUrl, accentHex, enabled } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: "Brand name required." });
    const id = req.body.id ? sanitizeDocIdParam(req.body.id) : sanitizeId(name.toLowerCase(), "brand");
    const payload = {
      name: String(name).trim().slice(0, 80),
      tagline: String(tagline || "").trim().slice(0, 120),
      logoUrl: isValidAssetUrl(logoUrl) ? logoUrl.trim() : "",
      accentHex: String(accentHex || "#8B5CF6").trim(),
      enabled: enabled !== false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await getDb().collection("catalog_brands").doc(id).set(payload, { merge: true });
    await logAdminAudit(req, "BRAND_UPSERT", `catalog_brands/${id}`, { name: payload.name });
    res.status(201).json({ id, ...payload });
  } catch (err) {
    next(err);
  }
});

router.delete("/brands/:id", async (req, res, next) => {
  try {
    const id = sanitizeDocIdParam(req.params.id);
    const ref = getDb().collection("catalog_brands").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: `Brand "${id}" not found.` });
    await ref.delete();
    await logAdminAudit(req, "BRAND_DELETE", `catalog_brands/${id}`);
    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
