const express = require("express");
const { admin, getDb } = require("../config/firebase");
const { requireAdminAuth } = require("../middleware/auth");
const { sanitizeDocIdParam, escapeHtml, toIsoDate, parsePagination } = require("../middleware/validate");
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
    const dateFrom = String(req.query.dateFrom || "").trim();
    const dateTo = String(req.query.dateTo || "").trim();

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
    if (dateFrom) list = list.filter((o) => (o.createdAt || "").slice(0, 10) >= dateFrom);
    if (dateTo) list = list.filter((o) => (o.createdAt || "").slice(0, 10) <= dateTo);
    if (search) {
      list = list.filter((o) =>
        `${o.orderNumber || ""} ${o.shippingAddress || ""} ${o.itemsSummary || ""} ${o.transactionRef || ""} ${o.trackingCode || ""}`
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

async function applyOrderUpdate(req, res, next) {
  try {
    const userId = sanitizeDocIdParam(req.params.userId);
    const orderId = sanitizeDocIdParam(req.params.orderId);
    const { orderStatus, trackingCode, shippingAddress, adminNote, note } = req.body || {};

    if (orderStatus !== undefined && !VALID_ORDER_STATUSES.includes(orderStatus)) {
      return res.status(400).json({ error: `Invalid order status. Allowed: ${VALID_ORDER_STATUSES.join(", ")}` });
    }

    const db = getDb();
    const orderRef = db.collection("users").doc(userId).collection("orders").doc(orderId);
    const snap = await orderRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Order not found." });

    const existing = snap.data();
    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (orderStatus !== undefined) {
      updates.orderStatus = orderStatus;
    }
    if (typeof trackingCode === "string") {
      updates.trackingCode = trackingCode.trim().slice(0, 80);
    }
    if (typeof shippingAddress === "string" && shippingAddress.trim().length >= 5) {
      updates.shippingAddress = shippingAddress.trim().slice(0, 320);
    }
    if (typeof adminNote === "string") {
      updates.adminNote = adminNote.trim().slice(0, 400);
    }
    if (orderStatus === "Refunded" && existing.paymentStatus === "PAID_SANDBOX") {
      updates.paymentStatus = "REFUNDED";
    }

    await orderRef.update(updates);

    // Restore inventory stock when transitioning into Cancelled from active state
    const wasRestorable = !["Cancelled", "Returned", "Refunded"].includes(existing.orderStatus);
    if (orderStatus === "Cancelled" && wasRestorable && Array.isArray(existing.items)) {
      for (const item of existing.items) {
        const pid = item.productId;
        const qty = Math.max(1, Math.round(Number(item.quantity || item.qty || 1)));
        if (!pid) continue;
        const pRef = db.collection("catalog_products").doc(pid);
        const pSnap = await pRef.get();
        if (pSnap.exists) {
          const prevStock = Number(pSnap.data()?.stock || 0);
          const nextStock = prevStock + qty;
          await pRef.update({
            stock: nextStock,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          await db.collection("inventory_logs").add({
            productId: pid,
            productName: pSnap.data()?.name || item.productName || pid,
            previousStock: prevStock,
            newStock: nextStock,
            delta: qty,
            reason: `Order Cancelled (${existing.orderNumber || orderId})`,
            adminUsername: req.adminUser?.username || "admin",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    }

    // Sync real-time customer notification to User Panel when status changes
    if (orderStatus !== undefined && orderStatus !== existing.orderStatus) {
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
    }

    await logAdminAudit(req, "ORDER_UPDATE", orderRef.path, {
      orderNumber: existing.orderNumber,
      orderStatus: updates.orderStatus || existing.orderStatus,
      trackingCode: updates.trackingCode ?? existing.trackingCode ?? "",
    });

    res.json({
      ok: true,
      orderId,
      orderStatus: updates.orderStatus || existing.orderStatus,
      trackingCode: updates.trackingCode ?? existing.trackingCode ?? "",
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/orders/:userId/:orderId/status & PATCH /api/admin/orders/:userId/:orderId
router.patch("/:userId/:orderId/status", applyOrderUpdate);
router.patch("/:userId/:orderId", applyOrderUpdate);

// GET /api/admin/orders/:userId/:orderId/invoice (Printable HTML Invoice)
router.get("/:userId/:orderId/invoice", async (req, res, next) => {
  try {
    const userId = sanitizeDocIdParam(req.params.userId);
    const orderId = sanitizeDocIdParam(req.params.orderId);
    const snap = await getDb().collection("users").doc(userId).collection("orders").doc(orderId).get();
    if (!snap.exists) return res.status(404).json({ error: "Order not found." });
    const o = snap.data();
    const rows = (o.items || [])
      .map((i) => {
        const title = escapeHtml(i.productName || i.name || i.productId || "Item");
        const qty = Number(i.quantity || i.qty || 1);
        const unit = Number(i.unitPrice || i.price || 0);
        return `<tr><td>${title}</td><td>${qty}</td><td>৳${unit.toFixed(2)}</td><td>৳${(unit * qty).toFixed(2)}</td></tr>`;
      })
      .join("");

    const orderNum = escapeHtml(o.orderNumber || orderId);
    res.json({
      orderNumber: o.orderNumber || orderId,
      html: `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${orderNum}</title><style>body{font-family:system-ui,sans-serif;padding:32px;color:#0f172a;max-width:760px;margin:auto}h1{color:#168BFF;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin:18px 0}td,th{border:1px solid #cbd5e1;padding:10px;text-align:left}th{background:#f1f5f9}.totals{text-align:right;margin-top:12px}</style></head><body><h1>MY Shop Invoice</h1><p><strong>Order:</strong> ${orderNum}<br><strong>Date:</strong> ${escapeHtml(toIsoDate(o.createdAt) || "")}<br><strong>Status:</strong> ${escapeHtml(o.orderStatus || "Pending")}<br><strong>Payment:</strong> ${escapeHtml(o.paymentMethod || "")} (${escapeHtml(o.paymentStatus || "")})<br><strong>Ship To:</strong> ${escapeHtml(o.shippingAddress || "")}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead><tbody>${rows || `<tr><td colspan="4">${escapeHtml(o.itemsSummary || "Order Items")}</td></tr>`}</tbody></table><div class="totals"><p>Subtotal: ৳${Number(o.subtotal || 0).toFixed(2)} | Discount: -৳${Number(o.discountAmount || 0).toFixed(2)} | Delivery: ৳${Number(o.deliveryFee || 0).toFixed(2)}</p><h2>Total: ৳${Number(o.totalAmount || 0).toFixed(2)}</h2></div></body></html>`,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders/export/csv
router.get("/export/csv", async (req, res, next) => {
  try {
    const status = String(req.query.status || "").trim();
    const dateFrom = String(req.query.dateFrom || "").trim();
    const dateTo = String(req.query.dateTo || "").trim();

    const snap = await getDb().collectionGroup("orders").get();
    let docs = snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAtIso: toIsoDate(d.data().createdAt) || "" }));
    if (status) docs = docs.filter((o) => o.orderStatus === status);
    if (dateFrom) docs = docs.filter((o) => o.createdAtIso.slice(0, 10) >= dateFrom);
    if (dateTo) docs = docs.filter((o) => o.createdAtIso.slice(0, 10) <= dateTo);

    const header = "orderNumber,userId,orderStatus,paymentMethod,paymentStatus,totalAmount,trackingCode,createdAt";
    const lines = docs.map((o) => {
      const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      return [
        esc(o.orderNumber || o.id),
        esc(o.userId),
        esc(o.orderStatus),
        esc(o.paymentMethod),
        esc(o.paymentStatus),
        Number(o.totalAmount || 0),
        esc(o.trackingCode || ""),
        esc(o.createdAtIso),
      ].join(",");
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="myshop-orders-report.csv"');
    res.send([header, ...lines].join("\n"));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
