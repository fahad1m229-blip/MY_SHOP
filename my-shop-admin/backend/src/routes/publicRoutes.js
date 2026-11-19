const express = require("express");
const { admin, getDb } = require("../config/firebase");
const { apiLimiter } = require("../middleware/rateLimit");
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
