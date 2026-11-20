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

test("Routing serves Customer Website at /, Admin Panel ONLY at /admin, and JSON 404 for unknown /api", async () => {
  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  const hJson = await health.json();
  assert.equal(hJson.status, "ok");

  // "/" MUST open Customer Website with no-cache headers, NOT Admin Panel
  const customerHomeRes = await fetch(`${baseUrl}/`);
  assert.equal(customerHomeRes.status, 200);
  assert.ok((customerHomeRes.headers.get("cache-control") || "").includes("no-cache"));
  const customerHtml = await customerHomeRes.text();
  assert.ok(customerHtml.includes("MY Shop — Shop Smart • Live Happy!"));
  assert.ok(customerHtml.includes("storefrontMain"));
  assert.equal(customerHtml.includes("MY Shop Super Admin"), false);

  // Storefront SPA deep routes must serve Customer Website
  for (const spaPath of ["/explore", "/wishlist", "/cart", "/orders", "/account"]) {
    const customerDeepRes = await fetch(`${baseUrl}${spaPath}`);
    assert.equal(customerDeepRes.status, 200);
    const customerDeepHtml = await customerDeepRes.text();
    assert.ok(customerDeepHtml.includes("storefrontMain"));
  }

  // "/admin" and "/admin/*" MUST serve Admin Dashboard without Firebase Client SDK
  const adminRes = await fetch(`${baseUrl}/admin`);
  assert.ok((adminRes.headers.get("cache-control") || "").includes("no-cache"));
  const adminHtml = await adminRes.text();
  assert.ok(adminHtml.includes("MY Shop Super Admin"));
  assert.equal(adminHtml.includes("firebaseConfig"), false);
  assert.equal(adminHtml.includes("initializeApp"), false);

  const adminDeepHtml = await (await fetch(`${baseUrl}/admin/orders`)).text();
  assert.ok(adminDeepHtml.includes("MY Shop Super Admin"));

  const appJs = await (await fetch(`${baseUrl}/admin/app.js`)).text();
  assert.equal(appJs.includes("firebaseConfig"), false);
  assert.equal(appJs.includes("firebase/"), false);

  // Unknown API routes must return JSON 404, NOT HTML SPA fallback
  const unknownApi = await fetch(`${baseUrl}/api/nonexistent/route`);
  assert.equal(unknownApi.status, 404);
  const unknownJson = await unknownApi.json();
  assert.equal(unknownJson.error, "API endpoint not found.");

  // Storefront bootstrap & social/popup public endpoints must return full MY Shop data (never 503)
  const bootRes = await fetch(`${baseUrl}/api/public/storefront-bootstrap`);
  assert.equal(bootRes.status, 200);
  const boot = await bootRes.json();
  assert.equal(boot.categories.length, 16);
  assert.equal(boot.brands.length, 8);
  assert.ok(boot.products.length >= 18);
  assert.ok(boot.coupons.some((c) => c.code === "MYSHOP10"));
  assert.equal(boot.socialSupport.platforms.length, 4);
  assert.deepEqual(
    boot.socialSupport.platforms.map((p) => p.id),
    ["facebook", "youtube", "tiktok", "telegram"]
  );
  assert.ok(boot.popups.length >= 1);
  assert.equal(boot.popups[0].includeSocialButtons, true);
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

test("Admin login, Admin->Customer live catalog sync, Customer registration/cart/checkout & security isolation", async () => {
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
    // 1. Admin creates product -> Customer public API sees it automatically
    const prodId = `prod_sync_${Date.now()}`;
    const createProd = await fetch(`${baseUrl}/api/admin/catalog/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookiePair },
      body: JSON.stringify({
        id: prodId,
        name: "Quantum Buds Pro",
        categoryId: "ELECTRONICS",
        brand: "SonicWave",
        price: 3490,
        originalPrice: 4200,
        stock: 15,
        published: true,
        available: true,
        mainImageUrl: "https://example.com/buds.jpg",
      }),
    });
    assert.equal(createProd.status, 201);

    const publicCatalog = await (await fetch(`${baseUrl}/api/public/products`)).json();
    const syncedProduct = publicCatalog.items.find((p) => p.id === prodId);
    assert.ok(syncedProduct);
    assert.equal(syncedProduct.price, 3490);
    assert.equal(syncedProduct.stock, 15);

    // 2. Customer registers while carrying a guest cart item
    const custEmail = `shopper_${Date.now()}@example.com`;
    const regRes = await fetch(`${baseUrl}/api/customer/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: "Fahad Shopper",
        email: custEmail,
        phone: "+8801700000000",
        password: "CustomerPass#2026",
        guestCart: [{ productId: prodId, quantity: 2 }],
      }),
    });
    assert.equal(regRes.status, 201);
    const custCookieHeader = regRes.headers.get("set-cookie") || "";
    assert.ok(custCookieHeader.includes("myshop_customer_session="));
    const custCookie = custCookieHeader.split(";")[0];
    const regJson = await regRes.json();
    assert.equal(regJson.cart.length, 1);
    assert.equal(regJson.cart[0].quantity, 2);

    // 3. Customer cookie MUST NOT access Admin routes
    const adminBlockedForCustomer = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Cookie: custCookie },
    });
    assert.equal(adminBlockedForCustomer.status, 401);

    // 4. Customer toggles wishlist and places order -> Admin Orders sees it & stock updates
    const wishRes = await fetch(`${baseUrl}/api/customer/wishlist/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: custCookie },
      body: JSON.stringify({ productId: prodId }),
    });
    assert.equal(wishRes.status, 200);
    assert.equal((await wishRes.json()).wished, true);

    const orderRes = await fetch(`${baseUrl}/api/customer/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: custCookie },
      body: JSON.stringify({
        items: [{ productId: prodId, quantity: 2 }],
        shippingAddress: "Fahad, +8801700000000, House 12, Gulshan, Dhaka",
        paymentMethod: "Cash on Delivery",
      }),
    });
    assert.equal(orderRes.status, 201);
    const orderJson = await orderRes.json();
    assert.equal(orderJson.totalAmount, 6980);

    // Stock decremented from 15 -> 13
    const updatedDetail = await (await fetch(`${baseUrl}/api/public/products/${prodId}`)).json();
    assert.equal(updatedDetail.product.stock, 13);

    // Admin sees customer order
    const adminOrders = await (
      await fetch(`${baseUrl}/api/admin/orders`, { headers: { Cookie: cookiePair } })
    ).json();
    assert.ok(adminOrders.items.some((o) => o.orderNumber === orderJson.orderNumber));

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

    // Ensure seeded product edit/delete is NOT overwritten on subsequent bootstrap
    const delSeeded = await fetch(`${baseUrl}/api/admin/catalog/products/p_toy_1`, {
      method: "DELETE",
      headers: { Cookie: cookiePair },
    });
    assert.equal(delSeeded.status, 200);
    const bootAfter = await (await fetch(`${baseUrl}/api/public/storefront-bootstrap`)).json();
    assert.equal(bootAfter.firebaseConnected, true);
    assert.equal(bootAfter.products.some((p) => p.id === "p_toy_1"), false);

    // Dashboard metrics include avgOrderValue & orderStatusBreakdown
    const dashData = await (
      await fetch(`${baseUrl}/api/admin/dashboard`, { headers: { Cookie: cookiePair } })
    ).json();
    assert.ok(dashData.metrics.avgOrderValue >= 0);
    assert.ok(dashData.orderStatusBreakdown && typeof dashData.orderStatusBreakdown.Pending === "number");

    // Admin customer filter, insights (totalSpent/ordersCount) & PATCH update
    const custList = await (
      await fetch(`${baseUrl}/api/admin/customers?status=active`, { headers: { Cookie: cookiePair } })
    ).json();
    const targetCust = custList.items.find((c) => c.email === custEmail);
    assert.ok(targetCust);

    const patchCust = await fetch(`${baseUrl}/api/admin/customers/${targetCust.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookiePair },
      body: JSON.stringify({ displayName: "Fahad VIP", points: 320, walletBalance: 500 }),
    });
    assert.equal(patchCust.status, 200);

    const custDetail = await (
      await fetch(`${baseUrl}/api/admin/customers/${targetCust.userId}`, { headers: { Cookie: cookiePair } })
    ).json();
    assert.equal(custDetail.customer.displayName, "Fahad VIP");
    assert.equal(custDetail.customer.points, 320);
    assert.equal(custDetail.totalSpent, 6980);
    assert.equal(custDetail.ordersCount, 1);

    // Admin Homepage Banner CRUD -> reflected in storefront bootstrap
    const addBanner = await fetch(`${baseUrl}/api/admin/cms/banners`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookiePair },
      body: JSON.stringify({
        id: "ban_hero_test",
        badge: "VIP LAUNCH",
        title: "Autumn Flagship Showcase",
        subtitle: "Extra 15% cashback via MYSHOP",
        active: true,
      }),
    });
    assert.equal(addBanner.status, 201);
    const bootWithBanner = await (await fetch(`${baseUrl}/api/public/storefront-bootstrap`)).json();
    assert.ok(bootWithBanner.siteConfig.banners.some((b) => b.id === "ban_hero_test"));

    const delBanner = await fetch(`${baseUrl}/api/admin/cms/banners/ban_hero_test`, {
      method: "DELETE",
      headers: { Cookie: cookiePair },
    });
    assert.equal(delBanner.status, 200);

    // Coupon expiration enforcement on customer checkout
    const createExpCoupon = await fetch(`${baseUrl}/api/admin/marketing/coupons`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookiePair },
      body: JSON.stringify({
        code: "OLDCODE99",
        title: "Expired Promo",
        discountType: "FIXED",
        value: 500,
        minSpend: 100,
        expiresAt: "2020-01-01",
      }),
    });
    assert.equal(createExpCoupon.status, 201);
    const expiredOrderAttempt = await fetch(`${baseUrl}/api/customer/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: custCookie },
      body: JSON.stringify({
        items: [{ productId: prodId, quantity: 1 }],
        shippingAddress: "Fahad, +8801700000000, House 12, Gulshan, Dhaka",
        paymentMethod: "Cash on Delivery",
        couponCode: "OLDCODE99",
      }),
    });
    assert.equal(expiredOrderAttempt.status, 400);

    // Customer submits product review & marks notifications read
    const revRes = await fetch(`${baseUrl}/api/customer/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: custCookie },
      body: JSON.stringify({ productId: prodId, rating: 5, comment: "Crystal clear ANC audio!" }),
    });
    assert.equal(revRes.status, 201);
    const revJson = await revRes.json();
    assert.equal(revJson.rating, 5);

    const markReadRes = await fetch(`${baseUrl}/api/customer/notifications/read-all`, {
      method: "PATCH",
      headers: { Cookie: custCookie },
    });
    assert.equal(markReadRes.status, 200);
  }

  // Newsletter subscription validation and success
  const badNewsRes = await fetch(`${baseUrl}/api/public/newsletter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "not-an-email" }),
  });
  assert.equal(badNewsRes.status, 400);

  const okNewsRes = await fetch(`${baseUrl}/api/public/newsletter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "vip-shopper@example.com" }),
  });
  assert.equal(okNewsRes.status, 201);
  const okNewsJson = await okNewsRes.json();
  assert.equal(okNewsJson.ok, true);
  assert.equal(okNewsJson.email, "vip-shopper@example.com");

  const logoutRes = await fetch(`${baseUrl}/api/admin/auth/logout`, {
    method: "POST",
    headers: { Cookie: cookiePair },
  });
  assert.equal(logoutRes.status, 200);
});

