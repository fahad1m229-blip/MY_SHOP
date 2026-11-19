const express = require("express");
const { admin, getDb } = require("../config/firebase");
const { requireAdminAuth } = require("../middleware/auth");
const { toIsoDate, parsePagination } = require("../middleware/validate");
const { logAdminAudit } = require("../services/auditService");

const router = express.Router();
router.use(requireAdminAuth);

const VALID_ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Returned",
  "Refunded",
];

// GET /api/admin/orders
router.get("/", async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const status = String(req.query.status || "").trim();
    const search = String(req.query.search || "").trim().toLowerCase();

    const snap = await getDb().collectionGroup("orders").get();
    let list = snap.docs.map((d) => ({
      id: d.id,
      userId: d.data().userId || d.ref.parent.parent?.id || "",
      ...d.data(),
      createdAt: toIsoDate(d.data().createdAt),
      updatedAt: toIsoDate(d.data().updatedAt),
    }));

    list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    if (status) list = list.filter((o) => o.orderStatus === status);
    if (search) {
      list = list.filter((o) =>
        `${o.orderNumber || ""} ${o.shippingAddress || ""} ${o.itemsSummary || ""} ${o.transactionRef || ""}`
          .toLowerCase()
          .includes(search)
      );
    }

    const total = list.length;
    const paged = list.slice((page - 1) * limit, page * limit);
    res.json({ items: paged, total, page, limit });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/orders/:userId/:orderId/status
router.patch("/:userId/:orderId/status", async (req, res, next) => {
  try {
    const { userId, orderId } = req.params;
    const { orderStatus, trackingCode, note } = req.body || {};

    if (!VALID_ORDER_STATUSES.includes(orderStatus)) {
      return res.status(400).json({ error: `Invalid order status. Allowed: ${VALID_ORDER_STATUSES.join(", ")}` });
    }

    const db = getDb();
    const orderRef = db.collection("users").doc(userId).collection("orders").doc(orderId);
    const snap = await orderRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Order not found." });

    const existing = snap.data();
    const updates = {
      orderStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (typeof trackingCode === "string" && trackingCode.trim()) {
      updates.trackingCode = trackingCode.trim().slice(0, 80);
    }
    if (orderStatus === "Refunded" && existing.paymentStatus === "PAID_SANDBOX") {
      updates.paymentStatus = "REFUNDED";
    }

    await orderRef.update(updates);

    // Sync real-time customer notification to User Panel
    await db.collection("users").doc(userId).collection("notifications").add({
      userId,
      title: `Order ${existing.orderNumber || orderId} • ${orderStatus}`,
      body:
        note ||
        `Your order status was updated to ${orderStatus}${updates.trackingCode ? ` (Tracking: ${updates.trackingCode})` : ""}.`,
      category: orderStatus === "Shipped" || orderStatus === "Out for Delivery" ? "SHIPPING" : "ORDER",
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await logAdminAudit(req, "ORDER_STATUS_UPDATE", orderRef.path, {
      orderNumber: existing.orderNumber,
      orderStatus,
      trackingCode: updates.trackingCode || "",
    });

    res.json({ ok: true, orderId, orderStatus });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders/:userId/:orderId/invoice (Printable HTML Invoice)
router.get("/:userId/:orderId/invoice", async (req, res, next) => {
  try {
    const { userId, orderId } = req.params;
    const snap = await getDb().collection("users").doc(userId).collection("orders").doc(orderId).get();
    if (!snap.exists) return res.status(404).json({ error: "Order not found." });
    const o = snap.data();
    const rows = (o.items || [])
      .map(
        (i) =>
          `<tr><td>${i.name || i.productId}</td><td>${i.qty || 1}</td><td>৳${Number(i.price || 0).toFixed(2)}</td></tr>`
      )
      .join("");

    res.json({
      orderNumber: o.orderNumber,
      html: `<!doctype html><html><head><title>Invoice ${o.orderNumber}</title><style>body{font-family:sans-serif;padding:32px;color:#111}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border:1px solid #ddd;padding:8px;text-align:left}</style></head><body><h1>MY Shop Invoice</h1><p><strong>Order:</strong> ${o.orderNumber}<br><strong>Status:</strong> ${o.orderStatus}<br><strong>Payment:</strong> ${o.paymentMethod} (${o.paymentStatus})<br><strong>Ship To:</strong> ${o.shippingAddress}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th></tr></thead><tbody>${rows}</tbody></table><p><strong>Subtotal:</strong> ৳${o.subtotal || 0} | <strong>Discount:</strong> -৳${o.discountAmount || 0} | <strong>Delivery:</strong> ৳${o.deliveryFee || 0}</p><h2>Total: ৳${o.totalAmount || 0}</h2></body></html>`,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders/export/csv
router.get("/export/csv", async (_req, res, next) => {
  try {
    const snap = await getDb().collectionGroup("orders").get();
    const header = "orderNumber,userId,orderStatus,paymentMethod,paymentStatus,totalAmount,trackingCode,createdAt";
    const lines = snap.docs.map((d) => {
      const o = d.data();
      const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      return [
        esc(o.orderNumber || d.id),
        esc(o.userId),
        esc(o.orderStatus),
        esc(o.paymentMethod),
        esc(o.paymentStatus),
        Number(o.totalAmount || 0),
        esc(o.trackingCode || ""),
        esc(toIsoDate(o.createdAt) || ""),
      ].join(",");
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"myshop-orders-report.csv\"");
    res.send([header, ...lines].join("\n"));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
