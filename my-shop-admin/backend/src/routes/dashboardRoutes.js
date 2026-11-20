const express = require("express");
const { getDb } = require("../config/firebase");
const { requireAdminAuth } = require("../middleware/auth");
const { toIsoDate } = require("../middleware/validate");

const router = express.Router();
router.use(requireAdminAuth);

// GET /api/admin/dashboard
router.get("/", async (_req, res, next) => {
  try {
    const db = getDb();
    const [productsSnap, categoriesSnap, usersSnap, ordersSnap, sellersSnap, couponsSnap, auditSnap] =
      await Promise.all([
        db.collection("catalog_products").get(),
        db.collection("catalog_categories").get(),
        db.collection("users").get(),
        db.collectionGroup("orders").get(),
        db.collection("sellers").get(),
        db.collection("catalog_coupons").get(),
        db.collection("admin_audit_logs").orderBy("createdAt", "desc").limit(12).get(),
      ]);

    const products = productsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const orders = ordersSnap.docs.map((d) => ({ id: d.id, path: d.ref.path, ...d.data() }));
    const customers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const coupons = couponsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let totalRevenue = 0;
    let todayRevenue = 0;
    let monthlyRevenue = 0;
    let pendingOrders = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;
    let pendingPayments = 0;

    const productSales = new Map();
    const dailyMap = new Map();
    const monthlyMap = new Map();
    const orderStatusBreakdown = {
      Pending: 0,
      Confirmed: 0,
      Processing: 0,
      Shipped: 0,
      "Out for Delivery": 0,
      Delivered: 0,
      Cancelled: 0,
    };

    for (const o of orders) {
      const status = String(o.orderStatus || "Pending");
      const payStatus = String(o.paymentStatus || "PENDING");
      const amount = Number(o.totalAmount || 0);
      const createdIso = toIsoDate(o.createdAt);
      const createdMs = createdIso ? new Date(createdIso).getTime() : 0;

      if (Object.prototype.hasOwnProperty.call(orderStatusBreakdown, status)) {
        orderStatusBreakdown[status] += 1;
      }

      if (status === "Pending") pendingOrders++;
      if (status === "Delivered") completedOrders++;
      if (status === "Cancelled" || status === "Refunded") cancelledOrders++;
      if (payStatus === "PENDING" || payStatus === "COD_PENDING") pendingPayments++;

      const isCountedRevenue =
        status !== "Cancelled" &&
        status !== "Refunded" &&
        (payStatus === "PAID_SANDBOX" || payStatus === "PAID" || status === "Delivered");

      if (isCountedRevenue) {
        totalRevenue += amount;
        if (createdMs >= todayStart) todayRevenue += amount;
        if (createdMs >= monthStart) monthlyRevenue += amount;
      }

      if (createdIso) {
        const dayKey = createdIso.slice(0, 10);
        const curDay = dailyMap.get(dayKey) || { date: dayKey, revenue: 0, orders: 0 };
        curDay.orders += 1;
        if (isCountedRevenue) curDay.revenue += amount;
        dailyMap.set(dayKey, curDay);

        const monthKey = createdIso.slice(0, 7);
        const curMonth = monthlyMap.get(monthKey) || { month: monthKey, revenue: 0, orders: 0 };
        curMonth.orders += 1;
        if (isCountedRevenue) curMonth.revenue += amount;
        monthlyMap.set(monthKey, curMonth);
      }

      if (Array.isArray(o.items) && status !== "Cancelled") {
        for (const item of o.items) {
          const pid = item.productId || item.name || item.productName;
          if (!pid) continue;
          const prev = productSales.get(pid) || {
            productId: pid,
            name: item.productName || item.name || pid,
            unitsSold: 0,
            revenue: 0,
          };
          const qty = Number(item.qty || item.quantity || 1);
          const price = Number(item.price || item.unitPrice || 0);
          prev.unitsSold += qty;
          prev.revenue += qty * price;
          productSales.set(pid, prev);
        }
      }
    }

    const lowStockProducts = products.filter((p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= 5);
    const outOfStockProducts = products.filter((p) => Number(p.stock || 0) <= 0);
    const activeCoupons = coupons.filter((c) => c.active !== false).length;

    const recentOrders = [...orders]
      .sort((a, b) => (toIsoDate(b.createdAt) || "").localeCompare(toIsoDate(a.createdAt) || ""))
      .slice(0, 8)
      .map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        userId: o.userId,
        totalAmount: o.totalAmount,
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        createdAt: toIsoDate(o.createdAt),
      }));

    const recentCustomers = [...customers]
      .sort((a, b) => (toIsoDate(b.createdAt) || "").localeCompare(toIsoDate(a.createdAt) || ""))
      .slice(0, 6)
      .map((c) => ({
        userId: c.id,
        displayName: c.displayName || "MY Shopper",
        email: c.email || "",
        points: Number(c.points || 0),
        suspended: Boolean(c.suspended),
        createdAt: toIsoDate(c.createdAt),
      }));

    const bestSellingProducts = Array.from(productSales.values())
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 6);

    const salesSeries = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);

    const monthlySeries = Array.from(monthlyMap.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    const recentActivities = auditSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: toIsoDate(d.data().createdAt),
    }));

    const validOrderCount = Math.max(0, orders.length - cancelledOrders);
    const avgOrderValue = validOrderCount > 0 ? Math.round(totalRevenue / validOrderCount) : 0;

    res.json({
      metrics: {
        totalProducts: products.length,
        totalCategories: categoriesSnap.size,
        totalCustomers: customers.length,
        totalOrders: orders.length,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue,
        todayRevenue,
        monthlyRevenue,
        avgOrderValue,
        pendingPayments,
        totalSellers: sellersSnap.size,
        activeCoupons,
        totalCoupons: coupons.length,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
      },
      orderStatusBreakdown,
      salesSeries,
      monthlySeries,
      recentOrders,
      recentCustomers,
      bestSellingProducts,
      lowStockProducts: lowStockProducts.slice(0, 8),
      outOfStockProducts: outOfStockProducts.slice(0, 8),
      recentActivities,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
