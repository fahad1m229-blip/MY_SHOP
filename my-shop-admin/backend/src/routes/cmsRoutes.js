const express = require("express");
const { admin, getDb } = require("../config/firebase");
const { requireAdminAuth } = require("../middleware/auth");
const { isValidHttpUrl, sanitizeId, toSafeNumber, toIsoDate } = require("../middleware/validate");
const { logAdminAudit } = require("../services/auditService");
const {
  defaultSocialSupportSettings,
  normalizeSocialSupportPayload,
  defaultAnnouncementSettings,
  normalizeAnnouncementPayload,
  normalizePopupPayload,
} = require("../services/socialPopupDefaults");

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

// ======================== HOMEPAGE BANNERS (site_config/main.banners) ========================

router.post("/banners", async (req, res, next) => {
  try {
    const b = req.body || {};
    const title = String(b.title || "").trim().slice(0, 120);
    if (!title) return res.status(400).json({ error: "Banner title is required." });

    const id = b.id ? sanitizeId(b.id, "bnr") : `bnr_${Date.now()}`;
    const banner = {
      id,
      badge: String(b.badge || "SPECIAL OFFER").trim().slice(0, 40),
      title,
      subtitle: String(b.subtitle || "").trim().slice(0, 220),
      imageUrl: isValidHttpUrl(b.imageUrl) ? b.imageUrl.trim() : "",
      linkUrl: String(b.linkUrl || "/deals").trim().slice(0, 300),
      ctaText: String(b.ctaText || "Explore Now").trim().slice(0, 40),
      startDate: String(b.startDate || "").trim().slice(0, 40),
      endDate: String(b.endDate || "").trim().slice(0, 40),
      active: b.active !== false,
    };

    const db = getDb();
    const ref = db.collection("site_config").doc("main");
    const snap = await ref.get();
    const existing = snap.exists && Array.isArray(snap.data().banners) ? snap.data().banners : [];
    const idx = existing.findIndex((x) => x.id === id);
    const nextBanners = idx >= 0 ? existing.map((x, i) => (i === idx ? banner : x)) : [...existing, banner];

    await ref.set(
      { banners: nextBanners.slice(0, 12), updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    await logAdminAudit(req, "BANNER_UPSERT", `site_config/main/banners/${id}`, { title: banner.title });
    res.status(201).json({ ok: true, banner, banners: nextBanners });
  } catch (err) {
    next(err);
  }
});

router.delete("/banners/:id", async (req, res, next) => {
  try {
    const id = sanitizeId(req.params.id, "bnr");
    const db = getDb();
    const ref = db.collection("site_config").doc("main");
    const snap = await ref.get();
    const existing = snap.exists && Array.isArray(snap.data().banners) ? snap.data().banners : [];
    const nextBanners = existing.filter((x) => x.id !== id);
    await ref.set(
      { banners: nextBanners, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    await logAdminAudit(req, "BANNER_DELETE", `site_config/main/banners/${id}`);
    res.json({ deleted: true, id, banners: nextBanners });
  } catch (err) {
    next(err);
  }
});

// ======================== SOCIAL SUPPORT MANAGER (social_support_settings) ========================

router.get("/social-support", async (_req, res, next) => {
  try {
    const db = getDb();
    const [mainSnap, draftSnap] = await Promise.all([
      db.collection("social_support_settings").doc("main").get(),
      db.collection("social_support_settings").doc("draft").get(),
    ]);
    const publishedData = mainSnap.exists ? mainSnap.data() : defaultSocialSupportSettings();
    const draftData = draftSnap.exists ? draftSnap.data() : publishedData;
    res.json({
      settings: draftData,
      publishedSettings: publishedData,
      hasPublished: mainSnap.exists,
      hasDraftChanges: draftSnap.exists && Boolean(draftData.unpublishedDraft),
      updatedAt: toIsoDate(draftData.updatedAt),
    });
  } catch (err) {
    next(err);
  }
});

router.put("/social-support", async (req, res, next) => {
  try {
    const normalized = normalizeSocialSupportPayload(req.body || {});
    const publishNow = Boolean(req.body?.publish);
    const db = getDb();
    const draftPayload = {
      ...normalized,
      published: publishNow,
      unpublishedDraft: !publishNow,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection("social_support_settings").doc("draft").set(draftPayload, { merge: true });
    if (publishNow) {
      await db
        .collection("social_support_settings")
        .doc("main")
        .set(
          {
            ...normalized,
            published: true,
            unpublishedDraft: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    }
    await logAdminAudit(
      req,
      publishNow ? "SOCIAL_SUPPORT_PUBLISH" : "SOCIAL_SUPPORT_DRAFT_SAVE",
      publishNow ? "social_support_settings/main" : "social_support_settings/draft",
      { enabled: normalized.enabled, position: normalized.position }
    );
    res.json({ ok: true, published: publishNow, settings: normalized });
  } catch (err) {
    next(err);
  }
});

router.post("/social-support/publish", async (req, res, next) => {
  try {
    const hasBodyPayload = req.body && Object.keys(req.body).length > 0;
    const preValidated = hasBodyPayload ? normalizeSocialSupportPayload(req.body) : null;
    const db = getDb();
    let payload = preValidated;
    if (!payload) {
      const draftSnap = await db.collection("social_support_settings").doc("draft").get();
      payload = draftSnap.exists
        ? normalizeSocialSupportPayload(draftSnap.data())
        : defaultSocialSupportSettings();
    }
    const finalDoc = {
      ...payload,
      published: true,
      unpublishedDraft: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await Promise.all([
      db.collection("social_support_settings").doc("main").set(finalDoc, { merge: true }),
      db.collection("social_support_settings").doc("draft").set(finalDoc, { merge: true }),
    ]);
    await logAdminAudit(req, "SOCIAL_SUPPORT_PUBLISH", "social_support_settings/main", {
      enabled: payload.enabled,
      platformsEnabled: payload.platforms.filter((p) => p.enabled).map((p) => p.id),
    });
    res.json({ ok: true, published: true, settings: payload });
  } catch (err) {
    next(err);
  }
});

// ======================== ANNOUNCEMENT BAR (announcement_settings/main) ========================

router.get("/announcements", async (_req, res, next) => {
  try {
    const snap = await getDb().collection("announcement_settings").doc("main").get();
    res.json(snap.exists ? snap.data() : defaultAnnouncementSettings());
  } catch (err) {
    next(err);
  }
});

router.put("/announcements", async (req, res, next) => {
  try {
    const normalized = normalizeAnnouncementPayload(req.body || {});
    const db = getDb();
    const payload = {
      ...normalized,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await Promise.all([
      db.collection("announcement_settings").doc("main").set(payload, { merge: true }),
      db.collection("site_config").doc("main").set(
        {
          announcementText: normalized.text,
          announcementActive: normalized.enabled,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      ),
    ]);
    await logAdminAudit(req, "ANNOUNCEMENT_UPDATE", "announcement_settings/main", {
      enabled: normalized.enabled,
    });
    res.json({ ok: true, ...normalized });
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
    const normalized = normalizePopupPayload(req.body || {});
    const id = req.body?.id ? sanitizeId(req.body.id, "popup") : `popup_${Date.now()}`;
    const payload = {
      ...normalized,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await getDb().collection("popup_notices").doc(id).set(payload, { merge: true });
    await logAdminAudit(req, "POPUP_UPSERT", `popup_notices/${id}`, {
      title: payload.title,
      active: payload.active,
      frequency: payload.frequency,
    });
    res.status(201).json({ id, ...normalized });
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

// ======================== ENGAGEMENT ANALYTICS (analytics_counters/global) ========================

router.get("/analytics", async (_req, res, next) => {
  try {
    const snap = await getDb().collection("analytics_counters").doc("global").get();
    const data = snap.exists ? snap.data() : {};
    const popupImpressions = Number(data.popupImpressions || 0);
    const popupCloses = Number(data.popupCloses || 0);
    const fbClicks = Number(data.fbClicks || 0);
    const ytClicks = Number(data.ytClicks || 0);
    const ttClicks = Number(data.ttClicks || 0);
    const tgClicks = Number(data.tgClicks || 0);
    const totalSocialClicks = fbClicks + ytClicks + ttClicks + tgClicks;
    const closeRatePercent =
      popupImpressions > 0 ? Math.min(100, Math.round((popupCloses / popupImpressions) * 100)) : 0;

    res.json({
      popupImpressions,
      popupCloses,
      closeRatePercent,
      fbClicks,
      ytClicks,
      ttClicks,
      tgClicks,
      totalSocialClicks,
      updatedAt: toIsoDate(data.updatedAt),
    });
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
