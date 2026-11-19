const { isValidHttpUrl, toSafeNumber } = require("../middleware/validate");

const ALLOWED_PLATFORMS = ["facebook", "youtube", "tiktok", "telegram"];
const ALLOWED_POSITIONS = ["BOTTOM_RIGHT", "MID_RIGHT", "TOP_RIGHT"];
const ALLOWED_SIZES = ["COMPACT", "MEDIUM", "LARGE"];
const ALLOWED_ANIMATIONS = ["FLOAT_GLOW", "PULSE_ORBIT", "SPRING_3D"];
const ALLOWED_FREQUENCIES = [
  "EVERY_VISIT",
  "ONCE_PER_SESSION",
  "ONCE_PER_DAY",
  "ONCE_PER_WEEK",
  "ONCE_PER_USER",
];
const ALLOWED_AUDIENCES = ["ALL", "NEW_VISITORS"];

function sanitizeHex(val, fallback) {
  const s = String(val || "").trim();
  return /^#[0-9A-Fa-f]{6}$/.test(s) ? s.toUpperCase() : fallback;
}

function defaultSocialSupportSettings() {
  return {
    enabled: true,
    position: "BOTTOM_RIGHT",
    buttonSize: "MEDIUM",
    animationStyle: "FLOAT_GLOW",
    menuBgHex: "#140F2A",
    primaryHex: "#8B5CF6",
    welcomeText: "Connect with MY Shop Support",
    published: true,
    platforms: [
      {
        id: "facebook",
        name: "Facebook Support",
        subtitle: "Message us on Facebook",
        url: "",
        iconUrl: "",
        colorHex: "#1877F2",
        enabled: true,
        sortOrder: 1,
      },
      {
        id: "youtube",
        name: "YouTube Support",
        subtitle: "Product demos & guides",
        url: "",
        iconUrl: "",
        colorHex: "#FF0000",
        enabled: true,
        sortOrder: 2,
      },
      {
        id: "tiktok",
        name: "TikTok Support",
        subtitle: "Trending flash clips",
        url: "",
        iconUrl: "",
        colorHex: "#FE2C55",
        enabled: true,
        sortOrder: 3,
      },
      {
        id: "telegram",
        name: "Telegram Support",
        subtitle: "Fast VIP community",
        url: "",
        iconUrl: "",
        colorHex: "#26A5E4",
        enabled: true,
        sortOrder: 4,
      },
    ],
  };
}

function normalizeSocialSupportPayload(body = {}) {
  const defaults = defaultSocialSupportSettings();
  const rawPlatforms = Array.isArray(body.platforms) ? body.platforms : defaults.platforms;
  const normalizedPlatforms = [];

  for (let i = 0; i < ALLOWED_PLATFORMS.length; i++) {
    const pid = ALLOWED_PLATFORMS[i];
    const fallback = defaults.platforms[i];
    const input = rawPlatforms.find((p) => p && String(p.id).toLowerCase() === pid) || fallback;

    const rawUrl = String(input.url ?? "").trim();
    if (rawUrl && !isValidHttpUrl(rawUrl)) {
      const err = new Error(`Invalid ${fallback.name} URL. Must begin with https:// or http://`);
      err.statusCode = 400;
      throw err;
    }

    const rawIconUrl = String(input.iconUrl ?? "").trim();
    if (rawIconUrl && !isValidHttpUrl(rawIconUrl)) {
      const err = new Error(`Invalid ${fallback.name} custom icon URL. Must begin with https:// or http://`);
      err.statusCode = 400;
      throw err;
    }

    normalizedPlatforms.push({
      id: pid,
      name: String(input.name || fallback.name).trim().slice(0, 48),
      subtitle: String(input.subtitle ?? fallback.subtitle).trim().slice(0, 80),
      url: rawUrl.slice(0, 300),
      iconUrl: rawIconUrl.slice(0, 400),
      colorHex: sanitizeHex(input.colorHex, fallback.colorHex),
      enabled: input.enabled !== false,
      sortOrder: Math.round(toSafeNumber(input.sortOrder, fallback.sortOrder, 1, 10)),
    });
  }

  normalizedPlatforms.sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    enabled: body.enabled !== false,
    position: ALLOWED_POSITIONS.includes(body.position) ? body.position : defaults.position,
    buttonSize: ALLOWED_SIZES.includes(body.buttonSize) ? body.buttonSize : defaults.buttonSize,
    animationStyle: ALLOWED_ANIMATIONS.includes(body.animationStyle)
      ? body.animationStyle
      : defaults.animationStyle,
    menuBgHex: sanitizeHex(body.menuBgHex, defaults.menuBgHex),
    primaryHex: sanitizeHex(body.primaryHex, defaults.primaryHex),
    welcomeText: String(body.welcomeText ?? defaults.welcomeText).trim().slice(0, 80),
    platforms: normalizedPlatforms,
  };
}

function defaultAnnouncementSettings() {
  return {
    enabled: true,
    text: "Cyber Flash Sale Live! Use MYSHOP10 for 10% OFF.",
    badgeText: "FLASH DEAL",
    bgHex: "#8B5CF6",
    actionUrl: "",
  };
}

function normalizeAnnouncementPayload(body = {}) {
  const rawUrl = String(body.actionUrl ?? "").trim();
  if (rawUrl && !isValidHttpUrl(rawUrl) && !rawUrl.startsWith("/")) {
    const err = new Error("Announcement link must be https://, http://, or an app route (/explore).");
    err.statusCode = 400;
    throw err;
  }
  return {
    enabled: body.enabled !== false,
    text: String(body.text || "Cyber Flash Sale Live! Use MYSHOP10 for 10% OFF.")
      .trim()
      .slice(0, 240),
    badgeText: String(body.badgeText ?? "FLASH DEAL").trim().slice(0, 30),
    bgHex: sanitizeHex(body.bgHex, "#8B5CF6"),
    actionUrl: rawUrl.slice(0, 300),
  };
}

function normalizePopupPayload(body = {}) {
  if (!body.title || !String(body.title).trim()) {
    const err = new Error("Popup title is required.");
    err.statusCode = 400;
    throw err;
  }
  const rawImg = String(body.imageUrl ?? "").trim();
  if (rawImg && !isValidHttpUrl(rawImg)) {
    const err = new Error("Popup image URL must begin with https:// or http://");
    err.statusCode = 400;
    throw err;
  }
  const rawBtnUrl = String(body.buttonUrl ?? "/explore").trim();
  if (rawBtnUrl && !isValidHttpUrl(rawBtnUrl) && !rawBtnUrl.startsWith("/")) {
    const err = new Error("CTA destination must be an https:// URL or an app route like /explore.");
    err.statusCode = 400;
    throw err;
  }

  return {
    title: String(body.title).trim().slice(0, 120),
    subtitle: String(body.subtitle ?? "Shop Smart • Live Happy!").trim().slice(0, 120),
    description: String(
      body.description ??
        "Join our official social communities and never miss exciting offers, updates and support."
    )
      .trim()
      .slice(0, 600),
    imageUrl: rawImg.slice(0, 400),
    buttonText: String(body.buttonText ?? "Join Our Community").trim().slice(0, 40),
    buttonUrl: rawBtnUrl.slice(0, 300),
    designStyle: String(body.designStyle || "NEON_GLASS").trim().slice(0, 40),
    themeStyle: String(body.themeStyle || "DARK_NEON").trim().slice(0, 40),
    animation3D: String(body.animation3D || "PERSPECTIVE_FLIP").trim().slice(0, 40),
    bgHex: sanitizeHex(body.bgHex, "#120B29"),
    includeSocialButtons: body.includeSocialButtons !== false,
    templateType: String(body.templateType || "WELCOME_3D").trim().slice(0, 40),
    startDate: String(body.startDate || "").trim().slice(0, 40),
    endDate: String(body.endDate || "").trim().slice(0, 40),
    frequency: ALLOWED_FREQUENCIES.includes(body.frequency)
      ? body.frequency
      : "ONCE_PER_SESSION",
    delaySeconds: Math.round(toSafeNumber(body.delaySeconds, 1, 0, 30)),
    durationSeconds: Math.round(toSafeNumber(body.durationSeconds, 0, 0, 300)),
    targetAudience: ALLOWED_AUDIENCES.includes(body.targetAudience)
      ? body.targetAudience
      : "ALL",
    active: body.active !== false,
  };
}

module.exports = {
  ALLOWED_PLATFORMS,
  ALLOWED_POSITIONS,
  ALLOWED_SIZES,
  ALLOWED_ANIMATIONS,
  ALLOWED_FREQUENCIES,
  ALLOWED_AUDIENCES,
  defaultSocialSupportSettings,
  normalizeSocialSupportPayload,
  defaultAnnouncementSettings,
  normalizeAnnouncementPayload,
  normalizePopupPayload,
};
