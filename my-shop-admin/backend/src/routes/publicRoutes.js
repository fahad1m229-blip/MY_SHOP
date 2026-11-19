const express = require("express");
const { admin, getDb } = require("../config/firebase");
const { apiLimiter } = require("../middleware/rateLimit");
const { sanitizeId, toIsoDate, parsePagination } = require("../middleware/validate");
const {
  defaultSocialSupportSettings,
  defaultAnnouncementSettings,
} = require("../services/socialPopupDefaults");

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

function defaultSiteConfig() {
  return {
    siteName: "MY Shop",
    tagline: "Shop Smart • Live Happy!",
    description: "Next-generation futuristic e-commerce platform.",
    logoUrl: "",
    contactEmail: "support@myshop.example",
    contactPhone: "+880 1700-000000",
    address: "Gulshan-2, Dhaka 1212, Bangladesh",
    announcementText: "Shop Smart • Live Happy!",
    announcementActive: true,
    maintenanceMode: false,
    primaryHex: "#8B5CF6",
    accentHex: "#00D4FF",
    footerText: "© MY Shop • Shop Smart, Live Happy!",
    currencySymbol: "৳",
    banners: [],
    paymentSettings: {
      bKash: { enabled: true, mode: "SANDBOX", instructions: "Pay via bKash merchant gateway" },
      Nagad: { enabled: true, mode: "SANDBOX", instructions: "Pay via Nagad checkout" },
      Rocket: { enabled: true, mode: "SANDBOX", instructions: "DBBL Rocket digital wallet" },
      Visa: { enabled: true, mode: "SANDBOX", instructions: "3DS Verified Visa Gateway" },
      Mastercard: { enabled: true, mode: "SANDBOX", instructions: "Mastercard Global Gateway" },
      CashOnDelivery: { enabled: true, mode: "ACTIVE", instructions: "Pay cash on doorstep delivery" },
    },
  };
}

function mapPublicProduct(doc) {
  const p = doc.data() || {};
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
    freeDelivery: Boolean(p.freeDelivery),
    colors: Array.isArray(p.colors) ? p.colors : [],
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    variants: Array.isArray(p.variants) ? p.variants : [],
    specs: Array.isArray(p.specs) ? p.specs : [],
    imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls : [],
    mainImageUrl: p.mainImageUrl || (Array.isArray(p.imageUrls) && p.imageUrls[0]) || "",
    sellerName: p.sellerName || "MY Shop Official",
    rating: Number(p.rating || 4.8),
    reviewCount: Number(p.reviewCount || 0),
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
    const db = getDb();
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
    ]);

    const products = prodSnap.docs
      .filter((d) => isProductVisibleToCustomer(d.data() || {}))
      .map(mapPublicProduct)
      .sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));

    const categories = catSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0));

    const brands = brandSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const coupons = couponSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((c) => c.active !== false);

    const deliveryZones = zoneSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((z) => z.active !== false);

    res.json({
      siteConfig: siteSnap.exists ? { ...defaultSiteConfig(), ...siteSnap.data() } : defaultSiteConfig(),
      announcement: annSnap.exists ? annSnap.data() : defaultAnnouncementSettings(),
      socialSupport: socialSnap.exists ? socialSnap.data() : defaultSocialSupportSettings(),
      popups: popupsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      products,
      categories,
      brands,
      coupons,
      deliveryZones,
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

    const snap = await getDb().collection("catalog_products").get();
    let list = snap.docs
      .filter((d) => isProductVisibleToCustomer(d.data() || {}))
      .map(mapPublicProduct);

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
    const id = sanitizeId(req.params.id, "prod");
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
    const snap = await getDb().collection("catalog_categories").get();
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0));
    res.json({ items });
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

router.get("/site-config", async (_req, res, next) => {
  try {
    const snap = await getDb().collection("site_config").doc("main").get();
    res.json(snap.exists ? { ...defaultSiteConfig(), ...snap.data() } : defaultSiteConfig());
  } catch (err) {
    next(err);
  }
});

router.get("/coupons", async (_req, res, next) => {
  try {
    const snap = await getDb().collection("catalog_coupons").get();
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
    const snap = await getDb().collection("social_support_settings").doc("main").get();
    res.json(snap.exists ? snap.data() : defaultSocialSupportSettings());
  } catch (err) {
    next(err);
  }
});

router.get("/popups", async (_req, res, next) => {
  try {
    const snap = await getDb().collection("popup_notices").where("active", "==", true).get();
    res.json({
      items: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/announcements", async (_req, res, next) => {
  try {
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

module.exports = router;
