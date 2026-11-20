const express = require("express");
const { admin, getDb, getAdminAuth } = require("../config/firebase");
const { requireAdminAuth } = require("../middleware/auth");
const { toIsoDate, parsePagination } = require("../middleware/validate");
const { logAdminAudit } = require("../services/auditService");

const router = express.Router();
router.use(requireAdminAuth);

// GET /api/admin/customers
router.get("/", async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const search = String(req.query.search || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim().toLowerCase();

    const snap = await getDb().collection("users").get();
    let list = snap.docs.map((d) => {
      const data = d.data();
      // Never expose sensitive tokens or password hashes
      return {
        userId: d.id,
        displayName: data.displayName || "MY Shopper",
        email: data.email || "",
        phone: data.phone || "",
        photoUrl: data.photoUrl || "",
        language: data.language || "EN",
        points: Number(data.points || 0),
        walletBalance: Number(data.walletBalance || 0),
        streakCount: Number(data.streakCount || 0),
        suspended: Boolean(data.suspended),
        createdAt: toIsoDate(data.createdAt),
      };
    });

    if (status === "active") list = list.filter((c) => !c.suspended);
    else if (status === "suspended") list = list.filter((c) => c.suspended);

    if (search) {
      list = list.filter((c) =>
        `${c.displayName} ${c.email} ${c.phone} ${c.userId}`.toLowerCase().includes(search)
      );
    }

    list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    const total = list.length;
    res.json({ items: list.slice((page - 1) * limit, page * limit), total, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/customers/:userId (Profile + Orders + Addresses + Support Tickets)
router.get("/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const db = getDb();
    const userRef = db.collection("users").doc(userId);
    const [userSnap, ordersSnap, addressesSnap, ticketsSnap] = await Promise.all([
      userRef.get(),
      userRef.collection("orders").get(),
      userRef.collection("addresses").get(),
      userRef.collection("support_tickets").get(),
    ]);
    if (!userSnap.exists) return res.status(404).json({ error: "Customer not found." });

    const u = userSnap.data();
    const orders = ordersSnap.docs
      .map((d) => ({ id: d.id, ...d.data(), createdAt: toIsoDate(d.data().createdAt) }))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    const totalSpent = orders
      .filter((o) => o.orderStatus !== "Cancelled" && o.orderStatus !== "Refunded")
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    res.json({
      customer: {
        userId: userSnap.id,
        displayName: u.displayName || "",
        email: u.email || "",
        phone: u.phone || "",
        points: Number(u.points || 0),
        walletBalance: Number(u.walletBalance || 0),
        suspended: Boolean(u.suspended),
        createdAt: toIsoDate(u.createdAt),
        totalSpent,
        ordersCount: orders.length,
      },
      totalSpent,
      ordersCount: orders.length,
      orders,
      addresses: addressesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      supportTickets: ticketsSnap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toIsoDate(d.data().createdAt) })),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/customers/:userId (Edit customer profile details safely)
router.patch("/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const b = req.body || {};
    const db = getDb();
    const ref = db.collection("users").doc(userId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Customer not found." });

    const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (typeof b.displayName === "string" && b.displayName.trim().length >= 2) {
      updates.displayName = b.displayName.trim().slice(0, 80);
    }
    if (typeof b.phone === "string") {
      updates.phone = b.phone.trim().slice(0, 30);
    }
    if (b.points !== undefined && Number.isFinite(Number(b.points))) {
      updates.points = Math.max(0, Math.round(Number(b.points)));
    }
    if (b.walletBalance !== undefined && Number.isFinite(Number(b.walletBalance))) {
      updates.walletBalance = Math.max(0, Math.round(Number(b.walletBalance)));
    }
    if (typeof b.suspended === "boolean") {
      updates.suspended = b.suspended;
      try {
        await getAdminAuth().updateUser(userId, { disabled: b.suspended });
      } catch {
        // Auth record might not exist for synthetic/emulator user IDs
      }
    }

    await ref.set(updates, { merge: true });
    await logAdminAudit(req, "CUSTOMER_PROFILE_UPDATE", `users/${userId}`, {
      fields: Object.keys(updates).filter((k) => k !== "updatedAt"),
    });
    res.json({ ok: true, userId });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/customers/:userId/suspend
router.patch("/:userId/suspend", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const suspended = Boolean(req.body?.suspended);
    const db = getDb();
    await db.collection("users").doc(userId).update({
      suspended,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    try {
      await getAdminAuth().updateUser(userId, { disabled: suspended });
    } catch {
      // Auth record might not exist for synthetic/emulator user IDs
    }
    await logAdminAudit(req, suspended ? "CUSTOMER_SUSPEND" : "CUSTOMER_RESTORE", `users/${userId}`);
    res.json({ ok: true, userId, suspended });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/customers/:userId/tickets/:ticketId
router.patch("/:userId/tickets/:ticketId", async (req, res, next) => {
  try {
    const { userId, ticketId } = req.params;
    const { status, reply } = req.body || {};
    if (!["Open", "In Progress", "Resolved"].includes(status)) {
      return res.status(400).json({ error: "Status must be Open, In Progress, or Resolved." });
    }
    const db = getDb();
    const tktRef = db.collection("users").doc(userId).collection("support_tickets").doc(ticketId);
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
    res.json({ ok: true, status });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
