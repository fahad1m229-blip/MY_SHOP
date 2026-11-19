const express = require("express");
const { admin, getDb } = require("../config/firebase");
const { requireAdminAuth } = require("../middleware/auth");
const { isValidHttpUrl, sanitizeId, toSafeNumber, toIsoDate, parsePagination } = require("../middleware/validate");
const { uploadMiddleware, uploadBufferToFirebaseStorage } = require("../services/storageService");
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
    const [prodSnap, catSnap] = await Promise.all([
      db.collection("catalog_products").get(),
      db.collection("catalog_categories").get(),
    ]);
    const urls = new Set();
    prodSnap.forEach((d) => {
      const data = d.data();
      if (isValidHttpUrl(data.mainImageUrl)) urls.add(data.mainImageUrl);
      if (Array.isArray(data.imageUrls)) data.imageUrls.forEach((u) => isValidHttpUrl(u) && urls.add(u));
    });
    catSnap.forEach((d) => {
      const data = d.data();
      if (isValidHttpUrl(data.imageUrl)) urls.add(data.imageUrl);
    });
    res.json({ urls: Array.from(urls) });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/catalog/validate-image-url
router.post("/validate-image-url", async (req, res) => {
  const { url } = req.body || {};
  if (!isValidHttpUrl(url)) {
    return res.status(400).json({ valid: false, error: "Enter a valid http:// or https:// image URL." });
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

router.get("/products", async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const search = String(req.query.search || "").trim().toLowerCase();
    const categoryId = String(req.query.category || "").trim();
    const stockFilter = String(req.query.stock || "").trim();

    const snap = await getDb().collection("catalog_products").get();
    let list = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: toIsoDate(d.data().createdAt),
      updatedAt: toIsoDate(d.data().updatedAt),
    }));

    if (search) {
      list = list.filter((p) =>
        `${p.name || ""} ${p.sku || ""} ${p.brand || ""}`.toLowerCase().includes(search)
      );
    }
    if (categoryId) list = list.filter((p) => p.categoryId === categoryId);
    if (stockFilter === "low") list = list.filter((p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= 5);
    if (stockFilter === "out") list = list.filter((p) => Number(p.stock || 0) <= 0);

    const total = list.length;
    const paged = list.slice((page - 1) * limit, page * limit);
    res.json({ items: paged, total, page, limit });
  } catch (err) {
    next(err);
  }
});

function buildProductPayload(body, isCreate = false) {
  const name = String(body.name || "").trim();
  if (!name || name.length > 160) {
    const e = new Error("Product name is required (max 160 chars).");
    e.statusCode = 400;
    throw e;
  }
  const price = toSafeNumber(body.price, 0, 0, 50000000);
  const originalPrice = toSafeNumber(body.originalPrice, price, price, 50000000);
  const discountPercent =
    body.discountPercent !== undefined
      ? toSafeNumber(body.discountPercent, 0, 0, 99)
      : originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  const imageUrls = Array.isArray(body.imageUrls)
    ? body.imageUrls.filter((u) => isValidHttpUrl(u)).slice(0, 12)
    : [];
  const mainImageUrl = isValidHttpUrl(body.mainImageUrl)
    ? body.mainImageUrl.trim()
    : imageUrls[0] || "";

  const payload = {
    name,
    nameBn: String(body.nameBn || "").trim().slice(0, 160),
    sku: String(body.sku || `MYS-${Date.now().toString().slice(-6)}`).trim().slice(0, 60),
    description: String(body.description || "").trim().slice(0, 3000),
    categoryId: String(body.categoryId || "MOBILES").trim().slice(0, 60),
    brand: String(body.brand || "NovaTech").trim().slice(0, 80),
    price,
    originalPrice,
    discountPercent,
    stock: Math.round(toSafeNumber(body.stock, 0, 0, 1000000)),
    available: body.available !== false,
    published: body.published !== false,
    featured: Boolean(body.featured),
    bestSeller: Boolean(body.bestSeller),
    trending: Boolean(body.trending),
    freeDelivery: Boolean(body.freeDelivery),
    scheduledAt: body.scheduledAt ? String(body.scheduledAt).trim() : "",
    colors: Array.isArray(body.colors) ? body.colors.map((s) => String(s).trim()).filter(Boolean).slice(0, 20) : [],
    sizes: Array.isArray(body.sizes) ? body.sizes.map((s) => String(s).trim()).filter(Boolean).slice(0, 20) : [],
    variants: Array.isArray(body.variants) ? body.variants.slice(0, 20) : [],
    specs: Array.isArray(body.specs) ? body.specs.slice(0, 30) : [],
    imageUrls,
    mainImageUrl,
    sellerId: String(body.sellerId || "").trim(),
    sellerName: String(body.sellerName || "MY Shop Official").trim(),
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
    const payload = buildProductPayload(req.body, true);
    await db.collection("catalog_products").doc(id).set(payload);
    await logAdminAudit(req, "PRODUCT_CREATE", `catalog_products/${id}`, { name: payload.name, sku: payload.sku });
    res.status(201).json({ id, ...payload });
  } catch (err) {
    next(err);
  }
});

router.put("/products/:id", async (req, res, next) => {
  try {
    const id = sanitizeId(req.params.id, "prod");
    const db = getDb();
    const ref = db.collection("catalog_products").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Product not found." });

    const payload = buildProductPayload(req.body, false);
    await ref.set(payload, { merge: true });
    await logAdminAudit(req, "PRODUCT_UPDATE", `catalog_products/${id}`, { name: payload.name });
    res.json({ id, ...payload });
  } catch (err) {
    next(err);
  }
});

router.patch("/products/:id/quick", async (req, res, next) => {
  try {
    const id = sanitizeId(req.params.id, "prod");
    const db = getDb();
    const ref = db.collection("catalog_products").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Product not found." });

    const allowed = ["published", "featured", "bestSeller", "trending", "available", "stock", "price"];
    const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        updates[k] = k === "stock" || k === "price" ? toSafeNumber(req.body[k], 0, 0) : Boolean(req.body[k]);
      }
    }
    await ref.update(updates);
    await logAdminAudit(req, "PRODUCT_QUICK_UPDATE", `catalog_products/${id}`, updates);
    res.json({ id, updated: true });
  } catch (err) {
    next(err);
  }
});

router.post("/products/:id/duplicate", async (req, res, next) => {
  try {
    const id = sanitizeId(req.params.id, "prod");
    const db = getDb();
    const snap = await db.collection("catalog_products").doc(id).get();
    if (!snap.exists) return res.status(404).json({ error: "Product not found." });

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
    const id = sanitizeId(req.params.id, "prod");
    await getDb().collection("catalog_products").doc(id).delete();
    await logAdminAudit(req, "PRODUCT_DELETE", `catalog_products/${id}`);
    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
});

// ======================== CATEGORIES & BRANDS ========================

router.get("/categories", async (_req, res, next) => {
  try {
    const snap = await getDb().collection("catalog_categories").get();
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0));
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.post("/categories", async (req, res, next) => {
  try {
    const { titleEn, titleBn, description, iconName, imageUrl, orderIndex, enabled, subcategories } = req.body || {};
    if (!titleEn || !String(titleEn).trim()) return res.status(400).json({ error: "Category name required." });
    const id = sanitizeId(req.body.id || titleEn.toUpperCase(), "CAT");
    const payload = {
      titleEn: String(titleEn).trim().slice(0, 80),
      titleBn: String(titleBn || "").trim().slice(0, 80),
      description: String(description || "").trim().slice(0, 400),
      iconName: String(iconName || "Category").trim(),
      imageUrl: isValidHttpUrl(imageUrl) ? imageUrl.trim() : "",
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
    const id = sanitizeId(req.params.id, "CAT");
    await getDb().collection("catalog_categories").doc(id).delete();
    await logAdminAudit(req, "CATEGORY_DELETE", `catalog_categories/${id}`);
    res.json({ deleted: true, id });
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
    const id = sanitizeId(req.body.id || name.toLowerCase(), "brand");
    const payload = {
      name: String(name).trim().slice(0, 80),
      tagline: String(tagline || "").trim().slice(0, 120),
      logoUrl: isValidHttpUrl(logoUrl) ? logoUrl.trim() : "",
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
    const id = sanitizeId(req.params.id, "brand");
    await getDb().collection("catalog_brands").doc(id).delete();
    await logAdminAudit(req, "BRAND_DELETE", `catalog_brands/${id}`);
    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
