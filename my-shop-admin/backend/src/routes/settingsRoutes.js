const express = require("express");
const { admin, getDb } = require("../config/firebase");
const { requireAdminAuth } = require("../middleware/auth");
const { sanitizeId, toSafeNumber, toIsoDate } = require("../middleware/validate");
const { logAdminAudit } = require("../services/auditService");

const router = express.Router();
router.use(requireAdminAuth);

// ======================== SELLERS ========================

router.get("/sellers", async (_req, res, next) => {
  try {
    const snap = await getDb().collection("sellers").get();
    res.json({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    next(err);
  }
});

router.post("/sellers", async (req, res, next) => {
  try {
    const { id, name, email, location, commissionPercent, status } = req.body || {};
    if (!name) return res.status(400).json({ error: "Seller name required." });
    const docId = id ? sanitizeId(id, "sel") : `sel_${Date.now()}`;
    const payload = {
      name: String(name).trim().slice(0, 100),
      email: String(email || "").trim().slice(0, 120),
      location: String(location || "Dhaka Hub").trim().slice(0, 80),
      commissionPercent: toSafeNumber(commissionPercent, 10, 0, 50),
      status: ["Pending", "Approved", "Rejected", "Suspended"].includes(status) ? status : "Approved",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await getDb().collection("sellers").doc(docId).set(payload, { merge: true });
    await logAdminAudit(req, "SELLER_UPSERT", `sellers/${docId}`, { name: payload.name, status: payload.status });
    res.status(201).json({ id: docId, ...payload });
  } catch (err) {
    next(err);
  }
});

router.patch("/sellers/:id/status", async (req, res, next) => {
  try {
    const id = sanitizeId(req.params.id, "sel");
    const status = req.body?.status;
    if (!["Pending", "Approved", "Rejected", "Suspended"].includes(status)) {
      return res.status(400).json({ error: "Invalid seller status." });
    }
    await getDb().collection("sellers").doc(id).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await logAdminAudit(req, "SELLER_STATUS_UPDATE", `sellers/${id}`, { status });
    res.json({ ok: true, id, status });
  } catch (err) {
    next(err);
  }
});

// ======================== DELIVERY ZONES ========================

router.get("/delivery", async (_req, res, next) => {
  try {
    const snap = await getDb().collection("delivery_zones").get();
    res.json({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    next(err);
  }
});

router.post("/delivery", async (req, res, next) => {
  try {
    const { id, zoneName, fee, freeThreshold, estimatedDays, courierName, active } = req.body || {};
    if (!zoneName) return res.status(400).json({ error: "Zone name required." });
    const docId = id ? sanitizeId(id, "zone") : `zone_${Date.now()}`;
    const payload = {
      zoneName: String(zoneName).trim().slice(0, 80),
      fee: toSafeNumber(fee, 80, 0, 50000),
      freeThreshold: toSafeNumber(freeThreshold, 2000, 0, 1000000),
      estimatedDays: String(estimatedDays || "1-3 days").trim().slice(0, 40),
      courierName: String(courierName || "MY Express").trim().slice(0, 60),
      active: active !== false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await getDb().collection("delivery_zones").doc(docId).set(payload, { merge: true });
    await logAdminAudit(req, "DELIVERY_ZONE_UPSERT", `delivery_zones/${docId}`, payload);
    res.status(201).json({ id: docId, ...payload });
  } catch (err) {
    next(err);
  }
});

// ======================== AUDIT LOGS & BACKUP ========================

router.get("/audit-logs", async (_req, res, next) => {
  try {
    const snap = await getDb()
      .collection("admin_audit_logs")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    res.json({
      items: snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: toIsoDate(d.data().createdAt),
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/backup", async (req, res, next) => {
  try {
    const db = getDb();
    const [products, categories, coupons, siteConfig, popups, funZone, aiSettings] = await Promise.all([
      db.collection("catalog_products").get(),
      db.collection("catalog_categories").get(),
      db.collection("catalog_coupons").get(),
      db.collection("site_config").doc("main").get(),
      db.collection("popup_notices").get(),
      db.collection("fun_zone_config").doc("rules").get(),
      db.collection("ai_settings").doc("main").get(),
    ]);
    await logAdminAudit(req, "SYSTEM_BACKUP_EXPORT", "system");
    res.json({
      exportedAt: new Date().toISOString(),
      catalog_products: products.docs.map((d) => ({ id: d.id, ...d.data() })),
      catalog_categories: categories.docs.map((d) => ({ id: d.id, ...d.data() })),
      catalog_coupons: coupons.docs.map((d) => ({ id: d.id, ...d.data() })),
      site_config: siteConfig.exists ? siteConfig.data() : {},
      popup_notices: popups.docs.map((d) => ({ id: d.id, ...d.data() })),
      fun_zone_config: funZone.exists ? funZone.data() : {},
      ai_settings: aiSettings.exists ? aiSettings.data() : {},
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
