const express = require("express");
const { admin, getDb } = require("../config/firebase");
const { requireAdminAuth } = require("../middleware/auth");
const {
  isValidAssetUrl,
  sanitizeId,
  sanitizeDocIdParam,
  toSafeNumber,
  toIsoDate,
} = require("../middleware/validate");
const { logAdminAudit } = require("../services/auditService");
const { deleteUploadedAssetIfOwned } = require("../services/storageService");
const {
  defaultSiteConfig,
  defaultHomepageSections,
  normalizeBannersList,
} = require("../services/catalogSeedService");
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
    const base = defaultSiteConfig();
    const stored = snap.exists ? snap.data() || {} : {};
    const merged = {
      ...base,
      ...stored,
      socialLinks: { ...(base.socialLinks || {}), ...(stored.socialLinks || {}) },
      homepageSections:
        Array.isArray(stored.homepageSections) && stored.homepageSections.length
          ? stored.homepageSections
          : defaultHomepageSections(),
      banners: normalizeBannersList(stored.banners || base.banners),
    };
    res.json(merged);
  } catch (err) {
    next(err);
  }
});

router.put("/site-config", async (req, res, next) => {
  try {
    const b = req.body || {};
    const db = getDb();
    const ref = db.collection("site_config").doc("main");
    const snap = await ref.get();
    const existing = snap.exists ? snap.data() || {} : {};
    const base = defaultSiteConfig();

    const payload = {
      siteName: String(b.siteName ?? existing.siteName ?? "MY Shop").trim().slice(0, 80),
      tagline: String(b.tagline ?? existing.tagline ?? "Shop Smart • Live Happy!").trim().slice(0, 140),
      description: String(b.description ?? existing.description ?? "").trim().slice(0, 600),
      seoTitle: String(b.seoTitle ?? existing.seoTitle ?? "").trim().slice(0, 120),
      seoDescription: String(b.seoDescription ?? existing.seoDescription ?? "").trim().slice(0, 320),
      logoUrl:
        b.logoUrl !== undefined
          ? isValidAssetUrl(b.logoUrl)
            ? b.logoUrl.trim()
            : ""
          : existing.logoUrl || "",
      faviconUrl:
        b.faviconUrl !== undefined
          ? isValidAssetUrl(b.faviconUrl)
            ? b.faviconUrl.trim()
            : ""
          : existing.faviconUrl || "",
      contactEmail: String(b.contactEmail ?? existing.contactEmail ?? "").trim().slice(0, 120),
      contactPhone: String(b.contactPhone ?? existing.contactPhone ?? "").trim().slice(0, 40),
      address: String(b.address ?? existing.address ?? "").trim().slice(0, 240),
      announcementText: String(b.announcementText ?? existing.announcementText ?? "").trim().slice(0, 240),
      announcementActive:
        b.announcementActive !== undefined ? Boolean(b.announcementActive) : existing.announcementActive !== false,
      flashSaleMessage: String(b.flashSaleMessage ?? existing.flashSaleMessage ?? "").trim().slice(0, 160),
      maintenanceMode:
        b.maintenanceMode !== undefined ? Boolean(b.maintenanceMode) : Boolean(existing.maintenanceMode),
      primaryHex: String(b.primaryHex || existing.primaryHex || "#8B20FF").trim(),
      accentHex: String(b.accentHex || existing.accentHex || "#00E5FF").trim(),
      footerText: String(b.footerText ?? existing.footerText ?? base.footerText).trim().slice(0, 240),
      currencySymbol: String(b.currencySymbol || existing.currencySymbol || "৳").trim().slice(0, 8),
      taxRatePercent: toSafeNumber(b.taxRatePercent ?? existing.taxRatePercent, 0, 0, 50),
      defaultLanguage: ["EN", "BN"].includes(b.defaultLanguage)
        ? b.defaultLanguage
        : existing.defaultLanguage || "EN",
      defaultTheme: ["dark", "light"].includes(b.defaultTheme) ? b.defaultTheme : existing.defaultTheme || "dark",
      shippingInfo: String(b.shippingInfo ?? existing.shippingInfo ?? base.shippingInfo).trim().slice(0, 1200),
      privacyPolicy: String(b.privacyPolicy ?? existing.privacyPolicy ?? base.privacyPolicy).trim().slice(0, 3000),
      termsContent: String(b.termsContent ?? existing.termsContent ?? base.termsContent).trim().slice(0, 3000),
      socialLinks:
        b.socialLinks && typeof b.socialLinks === "object"
          ? {
              facebook: String(b.socialLinks.facebook || "").trim().slice(0, 300),
              youtube: String(b.socialLinks.youtube || "").trim().slice(0, 300),
              tiktok: String(b.socialLinks.tiktok || "").trim().slice(0, 300),
              telegram: String(b.socialLinks.telegram || "").trim().slice(0, 300),
              instagram: String(b.socialLinks.instagram || "").trim().slice(0, 300),
            }
          : existing.socialLinks || base.socialLinks,
      homepageSections: Array.isArray(b.homepageSections)
        ? b.homepageSections.slice(0, 25).map((s, idx) => ({
            key: String(s.key || "").trim().slice(0, 40),
            label: String(s.label || s.key || "").trim().slice(0, 80),
            enabled: s.enabled !== false,
            sortOrder: Number.isFinite(Number(s.sortOrder)) ? Number(s.sortOrder) : idx + 1,
          }))
        : Array.isArray(existing.homepageSections) && existing.homepageSections.length
        ? existing.homepageSections
        : defaultHomepageSections(),
      // CRITICAL FIX: Never wipe existing banners when site-config is saved without a banners field
      banners: Array.isArray(b.banners)
        ? normalizeBannersList(b.banners.slice(0, 15))
        : normalizeBannersList(existing.banners || base.banners),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await ref.set(payload, { merge: true });
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

    const db = getDb();
    const ref = db.collection("site_config").doc("main");
    const snap = await ref.get();
    const rawExisting = snap.exists && Array.isArray(snap.data().banners)
      ? snap.data().banners
      : defaultSiteConfig().banners;
    const existing = normalizeBannersList(rawExisting);

    const id = b.id ? sanitizeDocIdParam(b.id) : `bnr_${Date.now()}`;
    const prev = existing.find((x) => x.id === id);

    const banner = {
      id,
      badge: String(b.badge ?? prev?.badge ?? "SPECIAL OFFER").trim().slice(0, 40),
      title,
      subtitle: String(b.subtitle ?? prev?.subtitle ?? "").trim().slice(0, 220),
      imageUrl: isValidAssetUrl(b.imageUrl) ? b.imageUrl.trim() : "",
      mobileImageUrl: isValidAssetUrl(b.mobileImageUrl) ? b.mobileImageUrl.trim() : "",
      linkUrl: String(b.linkUrl || prev?.linkUrl || "/deals").trim().slice(0, 300),
      ctaText: String(b.ctaText || prev?.ctaText || "Explore Now").trim().slice(0, 40),
      startDate: String(b.startDate ?? prev?.startDate ?? "").trim().slice(0, 40),
      endDate: String(b.endDate ?? prev?.endDate ?? "").trim().slice(0, 40),
      replaceHero: b.replaceHero !== undefined ? Boolean(b.replaceHero) : Boolean(prev?.replaceHero),
      sortOrder: Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : prev?.sortOrder || existing.length + 1,
      active: b.active !== undefined ? Boolean(b.active) : true,
    };

    const idx = existing.findIndex((x) => x.id === id);
    const nextBanners = (idx >= 0 ? existing.map((x, i) => (i === idx ? banner : x)) : [...existing, banner])
      .sort((a, c) => Number(a.sortOrder || 0) - Number(c.sortOrder || 0))
      .slice(0, 15);

    await ref.set(
      { banners: nextBanners, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    await logAdminAudit(req, "BANNER_UPSERT", `site_config/main/banners/${id}`, { title: banner.title });
    res.status(201).json({ ok: true, banner, banners: nextBanners });
  } catch (err) {
    next(err);
  }
});

router.post("/banners/reorder", async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
    const db = getDb();
    const ref = db.collection("site_config").doc("main");
    const snap = await ref.get();
    const existing = normalizeBannersList(
      snap.exists && Array.isArray(snap.data().banners) ? snap.data().banners : defaultSiteConfig().banners
    );
    const orderMap = new Map(ids.map((id, idx) => [id, idx + 1]));
    const reordered = existing
      .map((b, idx) => ({
        ...b,
        sortOrder: orderMap.has(b.id) ? orderMap.get(b.id) : ids.length + idx + 1,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    await ref.set({ banners: reordered, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    await logAdminAudit(req, "BANNER_REORDER", "site_config/main/banners", { count: reordered.length });
    res.json({ ok: true, banners: reordered });
  } catch (err) {
    next(err);
  }
});

router.delete("/banners/:id", async (req, res, next) => {
  try {
    const id = sanitizeDocIdParam(req.params.id);
    const db = getDb();
    const ref = db.collection("site_config").doc("main");
    const snap = await ref.get();
    const rawExisting = snap.exists && Array.isArray(snap.data().banners)
      ? snap.data().banners
      : defaultSiteConfig().banners;
    const existing = normalizeBannersList(rawExisting);
    const target = existing.find((x) => x.id === id);
    if (!target) return res.status(404).json({ error: `Banner "${id}" not found.` });

    const nextBanners = existing.filter((x) => x.id !== id).map((b, idx) => ({ ...b, sortOrder: idx + 1 }));
    await ref.set(
      { banners: nextBanners, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    if (isValidAssetUrl(target.imageUrl)) await deleteUploadedAssetIfOwned(target.imageUrl);
    if (isValidAssetUrl(target.mobileImageUrl)) await deleteUploadedAssetIfOwned(target.mobileImageUrl);
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
    const id = req.body?.id ? sanitizeDocIdParam(req.body.id) : `popup_${Date.now()}`;
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
    const id = sanitizeDocIdParam(req.params.id);
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

// ======================== REVIEWS, SUPPORT TICKETS & CONTENT ========================

router.get("/reviews", async (_req, res, next) => {
  try {
    const snap = await getDb().collectionGroup("reviews").get();
    const items = snap.docs
      .map((d) => ({
        id: d.id,
        userId: d.data().userId || d.ref.parent.parent?.id || "",
        status: d.data().status || "approved",
        ...d.data(),
        createdAt: toIsoDate(d.data().createdAt),
      }))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.patch("/reviews/:userId/:reviewId", async (req, res, next) => {
  try {
    const userId = sanitizeDocIdParam(req.params.userId);
    const reviewId = sanitizeDocIdParam(req.params.reviewId);
    const status = String(req.body?.status || "").toLowerCase();
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "Review status must be approved, rejected, or pending." });
    }
    const db = getDb();
    const revRef = db.collection("users").doc(userId).collection("reviews").doc(reviewId);
    const revSnap = await revRef.get();
    if (!revSnap.exists) return res.status(404).json({ error: "Review not found." });

    const revData = revSnap.data() || {};
    await revRef.update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

    if (revData.productId) {
      const prodRef = db.collection("catalog_products").doc(revData.productId);
      const prodSnap = await prodRef.get();
      if (prodSnap.exists) {
        const pData = prodSnap.data() || {};
        const nextReviews = (Array.isArray(pData.reviews) ? pData.reviews : []).map((r) =>
          r.id === reviewId ? { ...r, status } : r
        );
        const visibleReviews = nextReviews.filter((r) => r.status !== "rejected");
        const avgRating = visibleReviews.length
          ? Number((visibleReviews.reduce((s, r) => s + Number(r.rating || 5), 0) / visibleReviews.length).toFixed(1))
          : 4.8;
        await prodRef.update({
          reviews: nextReviews,
          rating: avgRating,
          reviewCount: visibleReviews.length,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    await logAdminAudit(req, "REVIEW_MODERATE", revRef.path, { status });
    res.json({ ok: true, id: reviewId, status });
  } catch (err) {
    next(err);
  }
});

router.delete("/reviews/:userId/:reviewId", async (req, res, next) => {
  try {
    const userId = sanitizeDocIdParam(req.params.userId);
    const reviewId = sanitizeDocIdParam(req.params.reviewId);
    const db = getDb();
    const ref = db.collection("users").doc(userId).collection("reviews").doc(reviewId);
    const snap = await ref.get();
    if (snap.exists && snap.data()?.productId) {
      const prodRef = db.collection("catalog_products").doc(snap.data().productId);
      const prodSnap = await prodRef.get();
      if (prodSnap.exists && Array.isArray(prodSnap.data()?.reviews)) {
        const nextReviews = prodSnap.data().reviews.filter((r) => r.id !== reviewId);
        await prodRef.update({
          reviews: nextReviews,
          reviewCount: nextReviews.length,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
    await ref.delete();
    await logAdminAudit(req, "REVIEW_DELETE", ref.path);
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// Support tickets queue across all customers
router.get("/support-tickets", async (_req, res, next) => {
  try {
    const db = getDb();
    const [tktSnap, usersSnap] = await Promise.all([
      db.collectionGroup("support_tickets").get(),
      db.collection("users").get(),
    ]);
    const userMap = new Map();
    usersSnap.docs.forEach((u) => userMap.set(u.id, u.data() || {}));

    const items = tktSnap.docs
      .map((d) => {
        const data = d.data() || {};
        const uid = data.userId || d.ref.parent.parent?.id || "";
        const user = userMap.get(uid) || {};
        return {
          id: d.id,
          userId: uid,
          customerName: user.displayName || data.customerName || "MY Shopper",
          customerEmail: user.email || data.email || "",
          subject: data.subject || "Customer Support Request",
          message: data.message || "",
          status: data.status || "Open",
          adminReply: data.adminReply || "",
          createdAt: toIsoDate(data.createdAt),
          updatedAt: toIsoDate(data.updatedAt),
        };
      })
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.patch("/support-tickets/:userId/:ticketId", async (req, res, next) => {
  try {
    const userId = sanitizeDocIdParam(req.params.userId);
    const ticketId = sanitizeDocIdParam(req.params.ticketId);
    const { status, reply } = req.body || {};
    if (!["Open", "In Progress", "Resolved"].includes(status)) {
      return res.status(400).json({ error: "Status must be Open, In Progress, or Resolved." });
    }
    const db = getDb();
    const tktRef = db.collection("users").doc(userId).collection("support_tickets").doc(ticketId);
    const tktSnap = await tktRef.get();
    if (!tktSnap.exists) return res.status(404).json({ error: "Support ticket not found." });

    const updates = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (typeof reply === "string" && reply.trim()) {
      updates.adminReply = reply.trim().slice(0, 1000);
    }
    await tktRef.update(updates);

    await db.collection("users").doc(userId).collection("notifications").add({
      userId,
      title: `Support Ticket ${status}`,
      body: reply?.trim() || `Your support ticket status is now ${status}.`,
      category: "SUPPORT",
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await logAdminAudit(req, "SUPPORT_TICKET_UPDATE", tktRef.path, { status });
    res.json({ ok: true, status, adminReply: updates.adminReply || "" });
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
    const docId = id ? sanitizeDocIdParam(id) : `cnt_${Date.now()}`;
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
    const id = sanitizeDocIdParam(req.params.id);
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
