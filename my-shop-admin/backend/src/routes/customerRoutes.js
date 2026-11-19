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

    if (search) {
      list = list.filter((c) =>
        `${c.displayName} ${c.email} ${c.phone} ${c.userId}`.toLowerCase().includes(search)
      );
    }

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
      },
      orders: ordersSnap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toIsoDate(d.data().createdAt) })),
      addresses: addressesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      supportTickets: ticketsSnap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toIsoDate(d.data().createdAt) })),
    });
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
