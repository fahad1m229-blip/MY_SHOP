const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { test, before, after, beforeEach } = require("node:test");
const fs = require("node:fs");

let testEnv;
const PROJECT_ID = process.env.GCP_PROJECT || "demo-no-project";
const ALICE_UID = "alice_123";
const BOB_UID = "bob_456";

const [emulatorHost, emulatorPortStr] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085").split(":");
const emulatorPort = parseInt(emulatorPortStr, 10);

before(async () => {
  const rules = fs.readFileSync("./firestore.rules", "utf8");
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: emulatorHost,
      port: emulatorPort,
    },
  });
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

test("Unauthenticated user cannot read or write any user collection", async () => {
  const unauthDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(unauthDb.collection("users").doc(ALICE_UID).get());
  await assertFails(unauthDb.collection("users").doc(ALICE_UID).collection("orders").get());
  await assertFails(
    unauthDb.collection("users").doc(ALICE_UID).collection("cart").doc("item_1").set({
      userId: ALICE_UID,
      productId: "p_1",
      productName: "Test Phone",
      unitPrice: 19999,
      quantity: 1,
      savedForLater: false,
      createdAt: new Date(Date.now() - 1000),
      updatedAt: new Date(Date.now() - 1000),
    })
  );
});

test("User profile create, partial update, and cross-user isolation", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  const bobDb = testEnv.authenticatedContext(BOB_UID).firestore();
  const now = new Date(Date.now() - 5000);

  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).set({
      userId: ALICE_UID,
      displayName: "Alice Rahman",
      email: "alice@example.com",
      language: "EN",
      darkMode: true,
      points: 120,
      walletBalance: 0,
      streakCount: 1,
      marketingOptIn: true,
      orderAlertsOptIn: true,
      priceDropOptIn: true,
      createdAt: now,
      updatedAt: now,
    })
  );

  // Partial update succeeds
  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).update({
      language: "BN",
      points: 200,
      updatedAt: new Date(Date.now() - 1000),
    })
  );

  // Shadow field rejected
  await assertFails(
    aliceDb.collection("users").doc(ALICE_UID).update({
      isAdmin: true,
      updatedAt: new Date(Date.now() - 500),
    })
  );

  // Cross-user read & write rejected
  await assertFails(bobDb.collection("users").doc(ALICE_UID).get());
  await assertFails(
    bobDb.collection("users").doc(ALICE_UID).update({
      displayName: "Hijacked",
      updatedAt: new Date(Date.now() - 500),
    })
  );
});

test("Order creation, payment verification, cancellation, and terminal state lock", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  const bobDb = testEnv.authenticatedContext(BOB_UID).firestore();
  const now = new Date(Date.now() - 5000);

  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).collection("orders").doc("ord_1001").set({
      userId: ALICE_UID,
      orderNumber: "MYS-1001",
      idempotencyKey: "idem_1001",
      itemsSummary: "Aurora ANC Headphones x1",
      itemCount: 1,
      items: [{ productId: "p_audio_1", name: "Aurora ANC Headphones", qty: 1, price: 4990 }],
      shippingAddress: "House 12, Road 5, Dhanmondi, Dhaka",
      paymentMethod: "bKash",
      paymentStatus: "PENDING",
      orderStatus: "Pending",
      subtotal: 4990,
      discountAmount: 500,
      deliveryFee: 0,
      totalAmount: 4490,
      createdAt: now,
      updatedAt: now,
    })
  );

  // Verify sandbox payment succeeds
  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).collection("orders").doc("ord_1001").update({
      paymentStatus: "PAID_SANDBOX",
      orderStatus: "Confirmed",
      transactionRef: "BKASH-SBX-998811",
      trackingCode: "MYX-TRK-1001",
      updatedAt: new Date(Date.now() - 1000),
    })
  );

  // Cancel order succeeds when Confirmed
  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).collection("orders").doc("ord_1001").update({
      orderStatus: "Cancelled",
      paymentStatus: "REFUNDED",
      updatedAt: new Date(Date.now() - 500),
    })
  );

  // Terminal state lock: cannot update once Cancelled
  await assertFails(
    aliceDb.collection("users").doc(ALICE_UID).collection("orders").doc("ord_1001").update({
      orderStatus: "Delivered",
      updatedAt: new Date(Date.now() - 200),
    })
  );

  // Bob cannot list or read Alice's orders
  await assertFails(bobDb.collection("users").doc(ALICE_UID).collection("orders").get());
  await assertFails(bobDb.collection("users").doc(ALICE_UID).collection("orders").doc("ord_1001").get());
});

test("Cart, Wishlist, Rewards, Notifications, Support Tickets, and Reviews parity", async () => {
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
  const now = new Date(Date.now() - 5000);

  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).collection("cart").doc("cart_1").set({
      userId: ALICE_UID,
      productId: "p_mob_1",
      productName: "NovaPulse 5G",
      unitPrice: 18990,
      quantity: 1,
      selectedColor: "Cosmic Violet",
      selectedSize: "128GB",
      savedForLater: false,
      createdAt: now,
      updatedAt: now,
    })
  );

  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).collection("wishlist").doc("p_mob_1").set({
      userId: ALICE_UID,
      productId: "p_mob_1",
      productName: "NovaPulse 5G",
      priceAlertEnabled: true,
      stockAlertEnabled: false,
      targetPrice: 17500,
      createdAt: now,
      updatedAt: now,
    })
  );

  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).collection("rewards").doc("rew_1").set({
      userId: ALICE_UID,
      title: "Spin & Win 10% OFF",
      couponCode: "SPIN10",
      discountType: "PERCENT",
      discountValue: 10,
      minSpend: 1000,
      source: "Spin & Win",
      redeemed: false,
      expiresLabel: "Valid 7 days",
      createdAt: now,
      updatedAt: now,
    })
  );

  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).collection("support_tickets").doc("tkt_1").set({
      userId: ALICE_UID,
      subject: "Delivery address update",
      orderId: "MYS-1001",
      category: "Order",
      message: "Please confirm courier slot.",
      status: "Open",
      createdAt: now,
      updatedAt: now,
    })
  );

  await assertSucceeds(
    aliceDb.collection("users").doc(ALICE_UID).collection("reviews").doc("rev_1").set({
      userId: ALICE_UID,
      productId: "p_mob_1",
      authorName: "Alice Rahman",
      rating: 5,
      comment: "Super crisp display and fast charging!",
      verifiedPurchase: true,
      createdAt: now,
      updatedAt: now,
    })
  );

  // Reject @DocumentId `id` inside payload
  await assertFails(
    aliceDb.collection("users").doc(ALICE_UID).collection("rewards").doc("rew_2").set({
      id: "rew_2",
      userId: ALICE_UID,
      title: "Invalid ID field",
      discountType: "POINTS",
      discountValue: 50,
      minSpend: 0,
      source: "Quiz",
      redeemed: false,
      expiresLabel: "Valid 7 days",
      createdAt: now,
      updatedAt: now,
    })
  );
});

test("Shared Admin-managed catalog/coupons/site_config/popups are client read-only and private admin docs are locked", async () => {
  const unauthDb = testEnv.unauthenticatedContext().firestore();
  const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();

  await assertSucceeds(unauthDb.collection("catalog_products").get());
  await assertSucceeds(unauthDb.collection("catalog_categories").get());
  await assertSucceeds(aliceDb.collection("catalog_coupons").get());
  await assertSucceeds(unauthDb.collection("site_config").doc("main").get());
  await assertSucceeds(unauthDb.collection("popup_notices").get());
  await assertSucceeds(unauthDb.collection("fun_zone_config").get());
  await assertSucceeds(unauthDb.collection("ai_settings").doc("main").get());

  // Clients must NEVER be able to write to Admin-managed collections
  await assertFails(
    aliceDb.collection("catalog_products").doc("p_hacked").set({ name: "Free Phone", price: 0 })
  );
  await assertFails(
    aliceDb.collection("catalog_coupons").doc("HACK100").set({ code: "HACK100", value: 100 })
  );
  await assertFails(
    aliceDb.collection("site_config").doc("main").set({ siteName: "Hacked" })
  );
  await assertFails(
    unauthDb.collection("popup_notices").doc("p1").set({ title: "Spam" })
  );

  // Backend-only Admin SDK collections must reject all client reads and writes
  await assertFails(aliceDb.collection("admin_audit_logs").get());
  await assertFails(aliceDb.collection("admin_settings").doc("security").get());
  await assertFails(aliceDb.collection("sellers").get());
});
