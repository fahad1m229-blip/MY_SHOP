const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

// Configure isolated test environment BEFORE requiring server
process.env.NODE_ENV = "test";
process.env.COOKIE_SECURE = "false";
process.env.ADMIN_USERNAME = "superadmin";
process.env.ADMIN_EMAIL = "admin@myshop.example";
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync("MyShopStrongPass#2026", 10);
process.env.JWT_SECRET = "test_jwt_secret_key_for_unit_tests_32chars";

const { createApp } = require("../src/server");
const {
  defaultSocialSupportSettings,
  normalizeSocialSupportPayload,
  normalizePopupPayload,
} = require("../src/services/socialPopupDefaults");

let server;
let baseUrl;

before(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

test("Health endpoint and /admin SPA serve without Firebase Client SDK", async () => {
  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  const hJson = await health.json();
  assert.equal(hJson.status, "ok");

  const adminHtml = await (await fetch(`${baseUrl}/admin`)).text();
  assert.ok(adminHtml.includes("MY Shop Super Admin"));
  assert.equal(adminHtml.includes("firebaseConfig"), false);
  assert.equal(adminHtml.includes("initializeApp"), false);

  const appJs = await (await fetch(`${baseUrl}/admin/app.js`)).text();
  assert.equal(appJs.includes("firebaseConfig"), false);
  assert.equal(appJs.includes("firebase/"), false);
});

test("Default social support config has zero hardcoded social URLs and validates bad URLs", () => {
  const defaults = defaultSocialSupportSettings();
  assert.equal(defaults.platforms.length, 4);
  for (const p of defaults.platforms) {
    assert.equal(p.url, "");
  }

  assert.throws(
    () =>
      normalizeSocialSupportPayload({
        platforms: [{ id: "facebook", url: "javascript:alert(1)" }],
      }),
    /Invalid Facebook Support URL/
  );

  assert.throws(
    () => normalizePopupPayload({ title: "" }),
    /Popup title is required/
  );
});

test("Protected admin routes reject unauthenticated access with 401", async () => {
  const me = await fetch(`${baseUrl}/api/admin/auth/me`);
  assert.equal(me.status, 401);

  const dash = await fetch(`${baseUrl}/api/admin/dashboard`);
  assert.equal(dash.status, 401);

  const prod = await fetch(`${baseUrl}/api/admin/catalog/products`);
  assert.equal(prod.status, 401);

  const social = await fetch(`${baseUrl}/api/admin/cms/social-support`);
  assert.equal(social.status, 401);

  const ann = await fetch(`${baseUrl}/api/admin/cms/announcements`);
  assert.equal(ann.status, 401);

  const analytics = await fetch(`${baseUrl}/api/admin/cms/analytics`);
  assert.equal(analytics.status, 401);
});

test("Admin login issues HttpOnly cookie, validates Social/Popup inputs, and supports public analytics + logout", async () => {
  const badLogin = await fetch(`${baseUrl}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "superadmin", password: "wrong-password" }),
  });
  assert.equal(badLogin.status, 401);

  const goodLogin = await fetch(`${baseUrl}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "superadmin", password: "MyShopStrongPass#2026" }),
  });
  assert.equal(goodLogin.status, 200);
  const setCookie = goodLogin.headers.get("set-cookie") || "";
  assert.ok(setCookie.includes("myshop_admin_session="));
  assert.ok(setCookie.toLowerCase().includes("httponly"));

  const cookiePair = setCookie.split(";")[0];

  const meRes = await fetch(`${baseUrl}/api/admin/auth/me`, {
    headers: { Cookie: cookiePair },
  });
  assert.equal(meRes.status, 200);
  const meJson = await meRes.json();
  assert.equal(meJson.authenticated, true);
  assert.equal(meJson.admin.username, "superadmin");

  const badUrl = await fetch(`${baseUrl}/api/admin/catalog/validate-image-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookiePair },
    body: JSON.stringify({ url: "javascript:alert(1)" }),
  });
  assert.equal(badUrl.status, 400);

  const badSocialUrl = await fetch(`${baseUrl}/api/admin/cms/social-support`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookiePair },
    body: JSON.stringify({
      enabled: true,
      platforms: [{ id: "telegram", url: "ftp://unsafe.invalid" }],
    }),
  });
  assert.equal(badSocialUrl.status, 400);

  const badAnalytics = await fetch(`${baseUrl}/api/public/analytics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: "arbitrary_field" }),
  });
  assert.equal(badAnalytics.status, 400);

  if (process.env.FIRESTORE_EMULATOR_HOST) {
    // End-to-end Social Support publish -> Public read
    const pubSocial = await fetch(`${baseUrl}/api/admin/cms/social-support/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookiePair },
      body: JSON.stringify({
        enabled: true,
        position: "MID_RIGHT",
        buttonSize: "LARGE",
        animationStyle: "SPRING_3D",
        menuBgHex: "#140F2A",
        primaryHex: "#8B5CF6",
        welcomeText: "VIP Social Concierge",
        platforms: [
          { id: "facebook", name: "FB Support", url: "https://example.com/fb-test", enabled: true, sortOrder: 1 },
          { id: "youtube", name: "YT Support", url: "https://example.com/yt-test", enabled: true, sortOrder: 2 },
          { id: "tiktok", name: "TikTok Support", url: "https://example.com/tt-test", enabled: true, sortOrder: 3 },
          { id: "telegram", name: "TG Support", url: "https://example.com/tg-test", enabled: true, sortOrder: 4 },
        ],
      }),
    });
    assert.equal(pubSocial.status, 200);

    const publicSocial = await (await fetch(`${baseUrl}/api/public/social-support`)).json();
    assert.equal(publicSocial.position, "MID_RIGHT");
    assert.equal(publicSocial.platforms[0].url, "https://example.com/fb-test");

    // Create 3D Welcome Popup -> Public read
    const popCreate = await fetch(`${baseUrl}/api/admin/cms/popups`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookiePair },
      body: JSON.stringify({
        id: "welcome_3d_main",
        title: "Welcome to MY Shop!",
        subtitle: "Shop Smart • Live Happy!",
        description: "Join our official social communities and never miss exciting offers, updates and support.",
        buttonText: "Join Our Community",
        buttonUrl: "/explore",
        frequency: "ONCE_PER_DAY",
        delaySeconds: 1,
        targetAudience: "ALL",
        includeSocialButtons: true,
        active: true,
      }),
    });
    assert.equal(popCreate.status, 201);
    const popList = await (await fetch(`${baseUrl}/api/public/popups`)).json();
    assert.ok(popList.items.some((p) => p.id === "welcome_3d_main" && p.frequency === "ONCE_PER_DAY"));

    // Record analytics -> Verify admin reads counters
    await fetch(`${baseUrl}/api/public/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "popup_impression" }),
    });
    await fetch(`${baseUrl}/api/public/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "fb_click" }),
    });
    const stats = await (
      await fetch(`${baseUrl}/api/admin/cms/analytics`, { headers: { Cookie: cookiePair } })
    ).json();
    assert.ok(stats.popupImpressions >= 1);
    assert.ok(stats.fbClicks >= 1);
  }

  const logoutRes = await fetch(`${baseUrl}/api/admin/auth/logout`, {
    method: "POST",
    headers: { Cookie: cookiePair },
  });
  assert.equal(logoutRes.status, 200);
});

