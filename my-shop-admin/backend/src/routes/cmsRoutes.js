const express = require("express");
const { admin, getDb } = require("../config/firebase");
const { requireAdminAuth } = require("../middleware/auth");
const { isValidHttpUrl, sanitizeId, toSafeNumber, toIsoDate } = require("../middleware/validate");
const { logAdminAudit } = require("../services/auditService");

const router = express.Router();
router.use(requireAdminAuth);

// ======================== WEBSITE CUSTOMIZATION (site_config/main) ========================

router.get("/site-config", async (_req, res, next) => {
  try {
    const snap = await getDb().collection("site_config").doc("main").get();
    res.json(
      snap.exists
        ? snap.data()
        : {
            siteName: "MY Shop",
            tagline: "Shop Smart • Live Happy!",
            description: "Next-generation futuristic e-commerce platform.",
            logoUrl: "",
            faviconUrl: "",
            contactEmail: "support@myshop.example",
            contactPhone: "+880 1700-000000",
            address: "Gulshan-2, Dhaka 1212, Bangladesh",
            announcementText: "Cyber Flash Sale Live! Use MYSHOP10 for 10% OFF.",
            announcementActive: true,
            maintenanceMode: false,
            primaryHex: "#8B5CF6",
            accentHex: "#00D4FF",
            footerText: "© MY Shop • Shop Smart, Live Happy!",
            socialLinks: { facebook: "", instagram: "", youtube: "" },
            banners: [],
          }
    );
  } catch (err) {
    next(err);
  }
});

router.put("/site-config", async (req, res, next) => {
  try {
    const b = req.body || {};
    const payload = {
      siteName: String(b.siteName || "MY Shop").trim().slice(0, 80),
      tagline: String(b.tagline || "Shop Smart • Live Happy!").trim().slice(0, 140),
      description: String(b.description || "").trim().slice(0, 600),
      logoUrl: isValidHttpUrl(b.logoUrl) ? b.logoUrl.trim() : "",
      faviconUrl: isValidHttpUrl(b.faviconUrl) ? b.faviconUrl.trim() : "",
      contactEmail: String(b.contactEmail || "").trim().slice(0, 120),
      contactPhone: String(b.contactPhone || "").trim().slice(0, 40),
      address: String(b.address || "").trim().slice(0, 240),
      announcementText: String(b.announcementText || "").trim().slice(0, 240),
      announcementActive: Boolean(b.announcementActive),
      maintenanceMode: Boolean(b.maintenanceMode),
      primaryHex: String(b.primaryHex || "#8B5CF6").trim(),
      accentHex: String(b.accentHex || "#00D4FF").trim(),
      footerText: String(b.footerText || "").trim().slice(0, 240),
      socialLinks: typeof b.socialLinks === "object" && b.socialLinks ? b.socialLinks : {},
      banners: Array.isArray(b.banners) ? b.banners.slice(0, 12) : [],
      currencySymbol: String(b.currencySymbol || "৳").trim().slice(0, 8),
      taxRatePercent: toSafeNumber(b.taxRatePercent, 0, 0, 50),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await getDb().collection("site_config").doc("main").set(payload, { merge: true });
    await logAdminAudit(req, "SITE_CONFIG_UPDATE", "site_config/main", { siteName: payload.siteName });
    res.json({ ok: true, ...payload });
  } catch (err) {
    next(err);
  }
});

// ======================== POPUP NOTICES (popup_notices) ========================

router.get("/popups", async (_req, res, next) => {
  try {
    const snap = await getDb().collection("popup_notices").get();
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      updatedAt: toIsoDate(d.data().updatedAt),
    }));
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.post("/popups", async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.title || !String(b.title).trim()) {
      return res.status(400).json({ error: "Popup title is required." });
    }
    const id = b.id ? sanitizeId(b.id, "popup") : `popup_${Date.now()}`;
    const payload = {
      title: String(b.title).trim().slice(0, 120),
      description: String(b.description || "").trim().slice(0, 600),
      imageUrl: isValidHttpUrl(b.imageUrl) ? b.imageUrl.trim() : "",
      buttonText: String(b.buttonText || "Shop Now").trim().slice(0, 40),
      buttonUrl: String(b.buttonUrl || "/explore").trim().slice(0, 300),
      designStyle: String(b.designStyle || "NEON_GLASS").trim(),
      startDate: String(b.startDate || "").trim(),
      endDate: String(b.endDate || "").trim(),
      frequency: String(b.frequency || "ONCE_PER_SESSION").trim(),
      durationSeconds: Math.round(toSafeNumber(b.durationSeconds, 0, 0, 300)),
      targetAudience: String(b.targetAudience || "ALL").trim(),
      active: b.active !== false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await getDb().collection("popup_notices").doc(id).set(payload, { merge: true });
    await logAdminAudit(req, "POPUP_UPSERT", `popup_notices/${id}`, { title: payload.title, active: payload.active });
    res.status(201).json({ id, ...payload });
  } catch (err) {
    next(err);
  }
});

router.delete("/popups/:id", async (req, res, next) => {
  try {
    const id = sanitizeId(req.params.id, "popup");
    await getDb().collection("popup_notices").doc(id).delete();
    await logAdminAudit(req, "POPUP_DELETE", `popup_notices/${id}`);
    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
});

// ======================== REVIEWS & CONTENT ========================

router.get("/reviews", async (_req, res, next) => {
  try {
    const snap = await getDb().collectionGroup("reviews").get();
    const items = snap.docs.map((d) => ({
      id: d.id,
      userId: d.data().userId || d.ref.parent.parent?.id || "",
      ...d.data(),
      createdAt: toIsoDate(d.data().createdAt),
    }));
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.delete("/reviews/:userId/:reviewId", async (req, res, next) => {
  try {
    const { userId, reviewId } = req.params;
    const ref = getDb().collection("users").doc(userId).collection("reviews").doc(reviewId);
    await ref.delete();
    await logAdminAudit(req, "REVIEW_DELETE", ref.path);
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

router.get("/content", async (_req, res, next) => {
  try {
    const snap = await getDb().collection("content_pages").get();
    res.json({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    next(err);
  }
});

router.post("/content", async (req, res, next) => {
  try {
    const { id, type, title, body, published } = req.body || {};
    if (!title) return res.status(400).json({ error: "Content title required." });
    const docId = id ? sanitizeId(id, "cnt") : `cnt_${Date.now()}`;
    const payload = {
      type: String(type || "FAQ").trim(),
      title: String(title).trim().slice(0, 160),
      body: String(body || "").trim().slice(0, 4000),
      published: published !== false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await getDb().collection("content_pages").doc(docId).set(payload, { merge: true });
    await logAdminAudit(req, "CONTENT_UPSERT", `content_pages/${docId}`, { type: payload.type });
    res.status(201).json({ id: docId, ...payload });
  } catch (err) {
    next(err);
  }
});

router.delete("/content/:id", async (req, res, next) => {
  try {
    const id = sanitizeId(req.params.id, "cnt");
    await getDb().collection("content_pages").doc(id).delete();
    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
});

// ======================== BROADCAST NOTIFICATIONS ========================

router.post("/notifications/broadcast", async (req, res, next) => {
  try {
    const { title, body, category, targetUserId } = req.body || {};
    if (!title || !body) return res.status(400).json({ error: "Title and message body required." });
    const db = getDb();
    const cat = ["ORDER", "PAYMENT", "SHIPPING", "PRICE_DROP", "FLASH_SALE", "REWARD", "SUPPORT"].includes(category)
      ? category
      : "FLASH_SALE";

    let sentCount = 0;
    if (targetUserId) {
      await db.collection("users").doc(targetUserId).collection("notifications").add({
        userId: targetUserId,
        title: String(title).trim().slice(0, 120),
        body: String(body).trim().slice(0, 500),
        category: cat,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      sentCount = 1;
    } else {
      const usersSnap = await db.collection("users").limit(200).get();
      const batch = db.batch();
      usersSnap.docs.forEach((u) => {
        const ref = u.ref.collection("notifications").doc();
        batch.set(ref, {
          userId: u.id,
          title: String(title).trim().slice(0, 120),
          body: String(body).trim().slice(0, 500),
          category: cat,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        sentCount++;
      });
      if (sentCount > 0) await batch.commit();
    }

    await logAdminAudit(req, "NOTIFICATION_SEND", "users/*/notifications", { sentCount, cat });
    res.json({ ok: true, sentCount });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
