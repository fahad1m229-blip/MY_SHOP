const express = require("express");
const { admin, getDb, getFirebaseStatus } = require("../config/firebase");
const { apiLimiter } = require("../middleware/rateLimit");
const { sanitizeId, toIsoDate, parsePagination } = require("../middleware/validate");
const {
  defaultSocialSupportSettings,
  defaultAnnouncementSettings,
} = require("../services/socialPopupDefaults");
const {
  defaultSiteConfig,
  defaultWelcomePopup,
  defaultFunZoneConfig,
  defaultAiSettings,
  defaultHomepageSections,
  normalizeBannersList,
  ensureInitialCatalogSeeded,
  buildFallbackStorefrontSnapshot,
} = require("../services/catalogSeedService");

const router = express.Router();
router.use(apiLimiter);

const EVENT_TO_FIELD = {
  popup_impression: "popupImpressions",
  popup_close: "popupCloses",
  fb_click: "fbClicks",
  yt_click: "ytClicks",
  tt_click: "ttClicks",
  tg_click: "tgClicks",
};

function mapPublicProduct(doc) {
  const p = doc.data() || {};
  const legacyImages = Array.isArray(p.imageUrls)
    ? p.imageUrls
    : Array.isArray(p.images)
    ? p.images
    : [];
  const mainImageUrl = p.mainImageUrl || p.imageUrl || legacyImages[0] || "";
  const approvedReviews = (Array.isArray(p.reviews) ? p.reviews : []).filter(
    (r) => String(r?.status || "approved").toLowerCase() !== "rejected"
  );
  return {
    id: doc.id,
    name: p.name || "",
    nameBn: p.nameBn || "",
    sku: p.sku || "",
    description: p.description || "",
    categoryId: p.categoryId || "ACCESSORIES",
    brand: p.brand || "MY Shop",
    price: Number(p.price || 0),
    originalPrice: Number(p.originalPrice || p.price || 0),
    discountPercent: Number(p.discountPercent || 0),
    stock: Number(p.stock || 0),
    available: p.available !== false,
    published: p.published !== false,
    featured: Boolean(p.featured),
    bestSeller: Boolean(p.bestSeller),
    trending: Boolean(p.trending),
    flashSale: Boolean(p.flashSale),
    todaysDeal: Boolean(p.todaysDeal),
    newArrival: Boolean(p.newArrival),
    freeDelivery: Boolean(p.freeDelivery),
    accentHex: p.accentHex || "#8B5CF6",
    secondaryHex: p.secondaryHex || "#00D4FF",
    colors: Array.isArray(p.colors) ? p.colors : [],
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    variants: Array.isArray(p.variants) ? p.variants : [],
    specs: Array.isArray(p.specs) ? p.specs : [],
    reviews: approvedReviews,
    qaList: Array.isArray(p.qaList) ? p.qaList : [],
    imageUrls: legacyImages.length ? legacyImages : mainImageUrl ? [mainImageUrl] : [],
    mainImageUrl,
    sellerName: p.sellerName || "MY Shop Official",
    rating: Number(p.rating || 4.8),
    reviewCount: Math.max(approvedReviews.length, Number(p.reviewCount || 0)),
    createdAt: toIsoDate(p.createdAt),
    updatedAt: toIsoDate(p.updatedAt),
  };
}

function isProductVisibleToCustomer(p) {
  if (p.published === false) return false;
  if (p.scheduledAt) {
    const t = Date.parse(p.scheduledAt);
    if (!Number.isNaN(t) && t > Date.now()) return false;
  }
  return true;
}

router.get("/storefront-bootstrap", async (_req, res, next) => {
  try {
    const fb = getFirebaseStatus();
    if (!fb.connected) {
      return res.json(buildFallbackStorefrontSnapshot());
    }

    const db = getDb();
    await ensureInitialCatalogSeeded(db);

    const [
      siteSnap,
      annSnap,
      socialSnap,
      popupsSnap,
      prodSnap,
      catSnap,
      brandSnap,
      couponSnap,
      zoneSnap,
      funZoneSnap,
      aiSnap,
    ] = await Promise.all([
      db.collection("site_config").doc("main").get(),
      db.collection("announcement_settings").doc("main").get(),
      db.collection("social_support_settings").doc("main").get(),
      db.collection("popup_notices").where("active", "==", true).get(),
      db.collection("catalog_products").get(),
      db.collection("catalog_categories").get(),
      db.collection("catalog_brands").get(),
      db.collection("catalog_coupons").get(),
      db.collection("delivery_zones").get(),
      db.collection("fun_zone_config").doc("rules").get(),
      db.collection("ai_settings").doc("main").get(),
    ]);

    const products = prodSnap.docs
      .filter((d) => isProductVisibleToCustomer(d.data() || {}))
      .map(mapPublicProduct)
      .sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));

    const categories = catSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((c) => c.enabled !== false)
      .sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0));

    const brands = brandSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((b) => b.enabled !== false);

    const coupons = couponSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((c) => c.active !== false);

    const deliveryZones = zoneSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((z) => z.active !== false);

    const popups = popupsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const rawSite = siteSnap.exists ? { ...defaultSiteConfig(), ...siteSnap.data() } : defaultSiteConfig();
    const siteConfig = {
      ...rawSite,
      homepageSections:
        Array.isArray(rawSite.homepageSections) && rawSite.homepageSections.length
          ? rawSite.homepageSections
          : defaultHomepageSections(),
      banners: normalizeBannersList(rawSite.banners),
    };

    res.json({
      firebaseConnected: true,
      siteConfig,
      announcement: annSnap.exists ? annSnap.data() : defaultAnnouncementSettings(),
      socialSupport: socialSnap.exists ? socialSnap.data() : defaultSocialSupportSettings(),
      popups: popups.length > 0 ? popups : [defaultWelcomePopup()],
      products,
      categories,
      brands,
      coupons,
      deliveryZones,
      funZone: funZoneSnap.exists ? { ...defaultFunZoneConfig(), ...funZoneSnap.data() } : defaultFunZoneConfig(),
      aiSettings: aiSnap.exists ? { ...defaultAiSettings(), ...aiSnap.data() } : defaultAiSettings(),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/products", async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const search = String(req.query.search || "").trim().toLowerCase();
    const category = String(req.query.category || "").trim();
    const brand = String(req.query.brand || "").trim().toLowerCase();
    const featured = req.query.featured === "true";
    const bestSeller = req.query.bestSeller === "true";
    const trending = req.query.trending === "true";
    const freeDelivery = req.query.freeDelivery === "true";
    const sort = String(req.query.sort || "newest");

    const fb = getFirebaseStatus();
    let list;
    if (!fb.connected) {
      list = buildFallbackStorefrontSnapshot().products;
    } else {
      const db = getDb();
      await ensureInitialCatalogSeeded(db);
      const snap = await db.collection("catalog_products").get();
      list = snap.docs
        .filter((d) => isProductVisibleToCustomer(d.data() || {}))
        .map(mapPublicProduct);
    }

    if (search) {
      list = list.filter((p) =>
        `${p.name} ${p.nameBn} ${p.brand} ${p.categoryId} ${p.description}`.toLowerCase().includes(search)
      );
    }
    if (category && category !== "ALL") {
      list = list.filter((p) => String(p.categoryId).toUpperCase() === category.toUpperCase());
    }
    if (brand) {
      list = list.filter((p) => String(p.brand).toLowerCase() === brand);
    }
    if (featured) list = list.filter((p) => p.featured);
    if (bestSeller) list = list.filter((p) => p.bestSeller);
    if (trending) list = list.filter((p) => p.trending);
    if (freeDelivery) list = list.filter((p) => p.freeDelivery);

    if (sort === "price_asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "discount") list.sort((a, b) => b.discountPercent - a.discountPercent);
    else list.sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));

    const total = list.length;
    const items = list.slice((page - 1) * limit, page * limit);
    res.json({ items, total, page, limit });
  } catch (err) {
    next(err);
  }
});

router.get("/products/:id", async (req, res, next) => {
  try {
    const { sanitizeDocIdParam } = require("../middleware/validate");
    const id = sanitizeDocIdParam(req.params.id);
    const fb = getFirebaseStatus();
    if (!fb.connected) {
      const fallback = buildFallbackStorefrontSnapshot().products;
      const product = fallback.find((p) => p.id === id);
      if (!product) return res.status(404).json({ error: "Product not found." });
      const related = fallback.filter((p) => p.id !== product.id && p.categoryId === product.categoryId).slice(0, 4);
      return res.json({ product, related });
    }

    const db = getDb();
    const snap = await db.collection("catalog_products").doc(id).get();
    if (!snap.exists || !isProductVisibleToCustomer(snap.data() || {})) {
      return res.status(404).json({ error: "Product not found." });
    }
    const product = mapPublicProduct(snap);
    const relSnap = await db
      .collection("catalog_products")
      .where("categoryId", "==", product.categoryId)
      .limit(8)
      .get();
    const related = relSnap.docs
      .filter((d) => d.id !== product.id && isProductVisibleToCustomer(d.data() || {}))
      .map(mapPublicProduct)
      .slice(0, 4);

    res.json({ product, related });
  } catch (err) {
    next(err);
  }
});

router.get("/categories", async (_req, res, next) => {
  try {
    if (!getFirebaseStatus().connected) {
      return res.json({ items: buildFallbackStorefrontSnapshot().categories });
    }
    const db = getDb();
    await ensureInitialCatalogSeeded(db);
    const snap = await db.collection("catalog_categories").get();
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((c) => c.enabled !== false)
      .sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0));
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get("/brands", async (_req, res, next) => {
  try {
    if (!getFirebaseStatus().connected) {
      return res.json({ items: buildFallbackStorefrontSnapshot().brands });
    }
    const db = getDb();
    await ensureInitialCatalogSeeded(db);
    const snap = await db.collection("catalog_brands").get();
    res.json({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((b) => b.enabled !== false) });
  } catch (err) {
    next(err);
  }
});

router.get("/site-config", async (_req, res, next) => {
  try {
    if (!getFirebaseStatus().connected) {
      return res.json(defaultSiteConfig());
    }
    const snap = await getDb().collection("site_config").doc("main").get();
    const rawSite = snap.exists ? { ...defaultSiteConfig(), ...snap.data() } : defaultSiteConfig();
    res.json({
      ...rawSite,
      homepageSections:
        Array.isArray(rawSite.homepageSections) && rawSite.homepageSections.length
          ? rawSite.homepageSections
          : defaultHomepageSections(),
      banners: normalizeBannersList(rawSite.banners),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/coupons", async (_req, res, next) => {
  try {
    if (!getFirebaseStatus().connected) {
      return res.json({ items: buildFallbackStorefrontSnapshot().coupons });
    }
    const db = getDb();
    await ensureInitialCatalogSeeded(db);
    const snap = await db.collection("catalog_coupons").get();
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((c) => c.active !== false);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get("/delivery-zones", async (_req, res, next) => {
  try {
    if (!getFirebaseStatus().connected) {
      return res.json({ items: [] });
    }
    const snap = await getDb().collection("delivery_zones").get();
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((z) => z.active !== false);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get("/social-support", async (_req, res, next) => {
  try {
    if (!getFirebaseStatus().connected) {
      return res.json(defaultSocialSupportSettings());
    }
    const snap = await getDb().collection("social_support_settings").doc("main").get();
    res.json(snap.exists ? snap.data() : defaultSocialSupportSettings());
  } catch (err) {
    next(err);
  }
});

router.get("/popups", async (_req, res, next) => {
  try {
    if (!getFirebaseStatus().connected) {
      return res.json({ items: [defaultWelcomePopup()] });
    }
    const snap = await getDb().collection("popup_notices").where("active", "==", true).get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({
      items: items.length > 0 ? items : [defaultWelcomePopup()],
    });
  } catch (err) {
    next(err);
  }
});

router.get("/announcements", async (_req, res, next) => {
  try {
    if (!getFirebaseStatus().connected) {
      return res.json(defaultAnnouncementSettings());
    }
    const snap = await getDb().collection("announcement_settings").doc("main").get();
    res.json(snap.exists ? snap.data() : defaultAnnouncementSettings());
  } catch (err) {
    next(err);
  }
});

router.post("/analytics", async (req, res, next) => {
  try {
    const event = String(req.body?.event || "").trim();
    const field = EVENT_TO_FIELD[event];
    if (!field) {
      return res.status(400).json({ error: "Unsupported analytics event type." });
    }
    if (!getFirebaseStatus().connected) {
      return res.json({ ok: true, recorded: field, offline: true });
    }
    await getDb()
      .collection("analytics_counters")
      .doc("global")
      .set(
        {
          [field]: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    res.json({ ok: true, recorded: field });
  } catch (err) {
    next(err);
  }
});

router.post("/newsletter", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 120);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    if (!getFirebaseStatus().connected) {
      return res.status(201).json({ ok: true, email, offline: true });
    }
    const docId = Buffer.from(email).toString("base64url").slice(0, 64);
    await getDb()
      .collection("newsletter_subscribers")
      .doc(docId)
      .set(
        {
          email,
          source: "storefront",
          subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    res.status(201).json({ ok: true, email });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
