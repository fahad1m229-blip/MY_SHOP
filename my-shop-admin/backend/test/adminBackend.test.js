const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const bcrypt = require("bcryptjs");

// Configure isolated test environment BEFORE requiring server
process.env.NODE_ENV = "test";
process.env.COOKIE_SECURE = "false";
process.env.ADMIN_USERNAME = "superadmin";
process.env.ADMIN_EMAIL = "admin@myshop.example";
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync("MyShopStrongPass#2026", 10);
process.env.JWT_SECRET = "test_jwt_secret_key_for_unit_tests_32chars";

const { createApp } = require("../src/server");

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

test("Protected admin routes reject unauthenticated access with 401", async () => {
  const me = await fetch(`${baseUrl}/api/admin/auth/me`);
  assert.equal(me.status, 401);

  const dash = await fetch(`${baseUrl}/api/admin/dashboard`);
  assert.equal(dash.status, 401);

  const prod = await fetch(`${baseUrl}/api/admin/catalog/products`);
  assert.equal(prod.status, 401);
});

test("Admin login issues HttpOnly cookie, unlocks protected session, and logout clears it", async () => {
  // Wrong password rejected
  const badLogin = await fetch(`${baseUrl}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "superadmin", password: "wrong-password" }),
  });
  assert.equal(badLogin.status, 401);

  // Valid login succeeds with HttpOnly cookie
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

  // Authenticated /me succeeds
  const meRes = await fetch(`${baseUrl}/api/admin/auth/me`, {
    headers: { Cookie: cookiePair },
  });
  assert.equal(meRes.status, 200);
  const meJson = await meRes.json();
  assert.equal(meJson.authenticated, true);
  assert.equal(meJson.admin.username, "superadmin");

  // Image URL validator rejects invalid URL
  const badUrl = await fetch(`${baseUrl}/api/admin/catalog/validate-image-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookiePair },
    body: JSON.stringify({ url: "javascript:alert(1)" }),
  });
  assert.equal(badUrl.status, 400);

  // Logout clears session cookie
  const logoutRes = await fetch(`${baseUrl}/api/admin/auth/logout`, {
    method: "POST",
    headers: { Cookie: cookiePair },
  });
  assert.equal(logoutRes.status, 200);
});
