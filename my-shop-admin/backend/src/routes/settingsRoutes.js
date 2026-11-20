const express = require("express");
const { admin, getDb } = require("../config/firebase");
const { requireAdminAuth } = require("../middleware/auth");
const { sanitizeDocIdParam, toSafeNumber, toIsoDate } = require("../middleware/validate");
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
    const docId = id ? sanitizeDocIdParam(id) : `sel_${Date.now()}`;
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
    const id = sanitizeDocIdParam(req.params.id);
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
    const docId = id ? sanitizeDocIdParam(id) : `zone_${Date.now()}`;
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

router.delete("/delivery/:id", async (req, res, next) => {
  try {
    const id = sanitizeDocIdParam(req.params.id);
    await getDb().collection("delivery_zones").doc(id).delete();
    await logAdminAudit(req, "DELIVERY_ZONE_DELETE", `delivery_zones/${id}`);
    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
});

// ======================== INVENTORY LOGS, AUDIT LOGS & BACKUP / RESTORE ========================

router.get("/inventory-logs", async (_req, res, next) => {
  try {
    const snap = await getDb()
      .collection("inventory_logs")
      .orderBy("createdAt", "desc")
      .limit(80)
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

router.get("/audit-logs", async (req, res, next) => {
  try {
    const actionFilter = String(req.query.action || "").trim().toUpperCase();
    const snap = await getDb()
      .collection("admin_audit_logs")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    let items = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: toIsoDate(d.data().createdAt),
    }));
    if (actionFilter) {
      items = items.filter((l) => String(l.action || "").toUpperCase().includes(actionFilter));
    }
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get("/backup/history", async (_req, res, next) => {
  try {
    const snap = await getDb()
      .collection("backup_history")
      .orderBy("createdAt", "desc")
      .limit(20)
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
    const [products, categories, brands, coupons, siteConfig, popups, funZone, aiSettings, socialSupport] =
      await Promise.all([
        db.collection("catalog_products").get(),
        db.collection("catalog_categories").get(),
        db.collection("catalog_brands").get(),
        db.collection("catalog_coupons").get(),
        db.collection("site_config").doc("main").get(),
        db.collection("popup_notices").get(),
        db.collection("fun_zone_config").doc("rules").get(),
        db.collection("ai_settings").doc("main").get(),
        db.collection("social_support_settings").doc("main").get(),
      ]);

    const snapshot = {
      exportedAt: new Date().toISOString(),
      catalog_products: products.docs.map((d) => ({ id: d.id, ...d.data() })),
      catalog_categories: categories.docs.map((d) => ({ id: d.id, ...d.data() })),
      catalog_brands: brands.docs.map((d) => ({ id: d.id, ...d.data() })),
      catalog_coupons: coupons.docs.map((d) => ({ id: d.id, ...d.data() })),
      site_config: siteConfig.exists ? siteConfig.data() : {},
      popup_notices: popups.docs.map((d) => ({ id: d.id, ...d.data() })),
      fun_zone_config: funZone.exists ? funZone.data() : {},
      ai_settings: aiSettings.exists ? aiSettings.data() : {},
      social_support_settings: socialSupport.exists ? socialSupport.data() : {},
    };

    await db.collection("backup_history").add({
      exportedBy: req.adminUser?.username || "admin",
      productCount: snapshot.catalog_products.length,
      categoryCount: snapshot.catalog_categories.length,
      couponCount: snapshot.catalog_coupons.length,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await logAdminAudit(req, "SYSTEM_BACKUP_EXPORT", "system", {
      products: snapshot.catalog_products.length,
    });
    res.json(snapshot);
  } catch (err) {
    next(err);
  }
});

// Safe merge-based restore requiring explicit confirmation phrase
router.post("/restore", async (req, res, next) => {
  try {
    const { confirmRestore, backup } = req.body || {};
    if (confirmRestore !== "RESTORE_MY_SHOP") {
      return res.status(400).json({ error: "Confirmation phrase RESTORE_MY_SHOP is required." });
    }
    if (!backup || typeof backup !== "object") {
      return res.status(400).json({ error: "Valid MY Shop JSON backup object is required." });
    }

    const db = getDb();
    const now = admin.firestore.FieldValue.serverTimestamp();
    let restoredCount = 0;

    const restoreCollection = async (colName, items) => {
      if (!Array.isArray(items)) return;
      for (const item of items.slice(0, 300)) {
        if (!item || !item.id) continue;
        const { id, ...fields } = item;
        const cleanId = sanitizeDocIdParam(id);
        await db.collection(colName).doc(cleanId).set({ ...fields, updatedAt: now }, { merge: true });
        restoredCount++;
      }
    };

    await restoreCollection("catalog_products", backup.catalog_products);
    await restoreCollection("catalog_categories", backup.catalog_categories);
    await restoreCollection("catalog_brands", backup.catalog_brands);
    await restoreCollection("catalog_coupons", backup.catalog_coupons);
    await restoreCollection("popup_notices", backup.popup_notices);

    if (backup.site_config && typeof backup.site_config === "object" && Object.keys(backup.site_config).length) {
      await db.collection("site_config").doc("main").set({ ...backup.site_config, updatedAt: now }, { merge: true });
      restoredCount++;
    }
    if (backup.fun_zone_config && typeof backup.fun_zone_config === "object" && Object.keys(backup.fun_zone_config).length) {
      await db.collection("fun_zone_config").doc("rules").set({ ...backup.fun_zone_config, updatedAt: now }, { merge: true });
      restoredCount++;
    }
    if (backup.ai_settings && typeof backup.ai_settings === "object" && Object.keys(backup.ai_settings).length) {
      await db.collection("ai_settings").doc("main").set({ ...backup.ai_settings, updatedAt: now }, { merge: true });
      restoredCount++;
    }
    if (
      backup.social_support_settings &&
      typeof backup.social_support_settings === "object" &&
      Object.keys(backup.social_support_settings).length
    ) {
      await db
        .collection("social_support_settings")
        .doc("main")
        .set({ ...backup.social_support_settings, updatedAt: now }, { merge: true });
      restoredCount++;
    }

    await logAdminAudit(req, "SYSTEM_BACKUP_RESTORE", "system", { restoredCount });
    res.json({ ok: true, restoredCount });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
