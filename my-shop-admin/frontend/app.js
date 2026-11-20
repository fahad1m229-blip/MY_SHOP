// MY Shop Super Admin Frontend Controller
// Communicates strictly with the Render Backend API via HTTP-only session cookies.
// No client-side Firestore credentials are embedded here.

const API_BASE = window.__MYSHOP_ADMIN_API_BASE__ || "";

const state = {
  activeTab: "dashboard",
  admin: null,
  firebase: null,
  dashboard: null,
  chartMode: "daily", // daily | monthly
  products: [],
  categories: [],
  brands: [],
  orders: [],
  customers: [],
  payments: { transactions: [], paymentSettings: {} },
  coupons: [],
  funZone: {},
  aiSettings: {},
  siteConfig: {},
  socialSupport: null,
  socialMeta: {},
  announcementConfig: {},
  engagementAnalytics: {},
  previewDevice: "mobile",
  previewSocialOpen: true,
  editingPopupId: null,
  popups: [],
  sellers: [],
  deliveryZones: [],
  reviews: [],
  supportTickets: [],
  contentPages: [],
  inventoryLogs: [],
  backupHistory: [],
  auditLogs: [],
  auditActionFilter: "",
  productImagesDraft: [],
  mainImageDraft: "",
  editingProductId: null,
  selectedProductIds: [],
  prodPage: 1,
  prodCatFilter: "ALL",
  prodStockFilter: "all",
  prodStatusFilter: "all",
  prodSort: "newest",
  prodQuery: "",
  invSearch: "",
  invFilter: "all",
  orderStatusFilter: "ALL",
  orderQuery: "",
  orderDateFrom: "",
  orderDateTo: "",
  customerStatusFilter: "all",
  customerQuery: "",
  editingCategoryId: null,
  editingBrandId: null,
  editingBannerId: null,
  editingCouponCode: null,
  editingZoneId: null,
};

async function api(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = isFormData ? {} : { "Content-Type": "application/json", ...(options.headers || {}) };
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    if (res.status === 401 && !path.includes("/auth/login")) {
      showLogin();
    }
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

async function downloadFileFromApi(path, fallbackFilename) {
  try {
    toast("Preparing secure download…");
    const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
    if (!res.ok) {
      if (res.status === 401) showLogin();
      const ct = res.headers.get("content-type") || "";
      const errData = ct.includes("application/json") ? await res.json().catch(() => ({})) : {};
      throw new Error(errData?.error || `Download failed (${res.status})`);
    }
    const blob = await res.blob();
    let filename = fallbackFilename;
    const disp = res.headers.get("content-disposition") || "";
    const match = disp.match(/filename="?([^"]+)"?/i);
    if (match && match[1]) filename = match[1];

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(`Downloaded ${filename}`);
  } catch (err) {
    toast(err.message || "Failed to download file.", false);
  }
}

function toast(msg, ok = true) {
  const el = document.getElementById("toastBanner");
  if (!el) return;
  el.textContent = msg;
  el.className = `toast ${ok ? "ok" : ""}`;
  el.classList.remove("hidden");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => el.classList.add("hidden"), 4200);
}

function showLogin(errorMsg = "") {
  document.getElementById("adminShell").classList.add("hidden");
  document.getElementById("loginView").classList.remove("hidden");
  const errEl = document.getElementById("loginError");
  if (errorMsg) {
    errEl.textContent = errorMsg;
    errEl.classList.remove("hidden");
  } else {
    errEl.classList.add("hidden");
  }
}

function showShell() {
  document.getElementById("loginView").classList.add("hidden");
  document.getElementById("adminShell").classList.remove("hidden");
  document.getElementById("adminUserChip").textContent = state.admin?.username || "superadmin";
  const badge = document.getElementById("firebaseStatusBadge");
  if (state.firebase?.connected) {
    badge.textContent = `Shared DB Connected (${state.firebase.projectId})`;
    badge.className = "status-pill";
  } else {
    badge.textContent = "Backend Online • Configure FIREBASE_SERVICE_ACCOUNT_JSON on Render";
    badge.className = "status-pill warn";
  }
}

function money(val) {
  const sym = state.siteConfig?.currencySymbol || "৳";
  return `${sym}${Number(val || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function statusBadge(status) {
  const s = String(status || "Pending");
  const lower = s.toLowerCase();
  let cls = "badge-pending";
  if (
    lower.includes("deliver") ||
    lower === "active" ||
    lower === "approved" ||
    lower === "paid" ||
    lower === "paid_sandbox" ||
    lower === "resolved"
  ) {
    cls = "badge-delivered";
  } else if (lower.includes("confirm") || lower.includes("process") || lower.includes("progress")) {
    cls = "badge-confirmed";
  } else if (lower.includes("ship") || lower.includes("out for")) {
    cls = "badge-shipped";
  } else if (
    lower.includes("cancel") ||
    lower.includes("suspend") ||
    lower.includes("refund") ||
    lower.includes("return") ||
    lower.includes("reject")
  ) {
    cls = "badge-cancelled";
  }
  return `<span class="status-badge ${cls}">${escHtml(s)}</span>`;
}

// ======================== CUSTOM MODALS (Replaces native confirm/prompt) ========================

function openModal(innerHtml) {
  const overlay = document.getElementById("adminModalOverlay");
  if (!overlay) return;
  overlay.innerHTML = `<div class="modal-dialog">${innerHtml}</div>`;
  overlay.classList.remove("hidden");
}

function closeModal() {
  const overlay = document.getElementById("adminModalOverlay");
  if (!overlay) return;
  overlay.classList.add("hidden");
  overlay.innerHTML = "";
}

function showConfirmModal({ title = "Confirm Action", message = "Are you sure?", confirmText = "Confirm", danger = true }) {
  return new Promise((resolve) => {
    openModal(`
      <div class="card-header">
        <h3>${escHtml(title)}</h3>
        <button type="button" class="icon-btn" id="modalDismissX">✕</button>
      </div>
      <p class="small muted" style="margin-bottom:16px;line-height:1.5;">${escHtml(message)}</p>
      <div class="badge-row" style="justify-content:flex-end;">
        <button type="button" class="btn-outline small" id="modalCancelBtn">Cancel</button>
        <button type="button" class="${danger ? "btn-danger" : "btn-neon"} small" id="modalOkBtn">${escHtml(confirmText)}</button>
      </div>
    `);
    const finish = (val) => {
      closeModal();
      resolve(val);
    };
    document.getElementById("modalDismissX").onclick = () => finish(false);
    document.getElementById("modalCancelBtn").onclick = () => finish(false);
    document.getElementById("modalOkBtn").onclick = () => finish(true);
  });
}

function showPromptModal({ title = "Enter Response", label = "Message", defaultValue = "", confirmText = "Submit" }) {
  return new Promise((resolve) => {
    openModal(`
      <div class="card-header">
        <h3>${escHtml(title)}</h3>
        <button type="button" class="icon-btn" id="promptDismissX">✕</button>
      </div>
      <form id="promptModalForm" class="stack-form">
        <label>
          <span>${escHtml(label)}</span>
          <textarea id="promptModalInput" rows="3" required>${escHtml(defaultValue)}</textarea>
        </label>
        <div class="badge-row" style="justify-content:flex-end;">
          <button type="button" class="btn-outline small" id="promptCancelBtn">Cancel</button>
          <button type="submit" class="btn-neon small">${escHtml(confirmText)}</button>
        </div>
      </form>
    `);
    document.getElementById("promptDismissX").onclick = () => {
      closeModal();
      resolve(null);
    };
    document.getElementById("promptCancelBtn").onclick = () => {
      closeModal();
      resolve(null);
    };
    document.getElementById("promptModalForm").onsubmit = (e) => {
      e.preventDefault();
      const val = document.getElementById("promptModalInput").value.trim();
      closeModal();
      resolve(val || null);
    };
  });
}

// ======================== TAB LOADER & ROUTER ========================

function renderSkeletonWorkspace() {
  return `
    <div class="kpi-grid">
      ${Array.from({ length: 4 })
        .map(
          () => `<div class="card"><div class="skeleton-line" style="width:55%;margin-bottom:10px;"></div><div class="skeleton-line" style="height:24px;width:75%;"></div></div>`
        )
        .join("")}
    </div>
    <div class="card">
      <div class="skeleton-line" style="width:40%;margin-bottom:12px;"></div>
      <div class="skeleton-line" style="width:92%;margin-bottom:8px;"></div>
      <div class="skeleton-line" style="width:84%;"></div>
    </div>
  `;
}

async function loadTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  const ws = document.getElementById("workspace");
  ws.innerHTML = renderSkeletonWorkspace();

  try {
    switch (tab) {
      case "dashboard":
        state.dashboard = await api("/api/admin/dashboard");
        document.getElementById("pageTitle").textContent = "Dashboard Overview";
        renderDashboard(ws);
        break;
      case "products": {
        const [pRes, cRes, bRes] = await Promise.all([
          api("/api/admin/catalog/products?limit=250"),
          api("/api/admin/catalog/categories"),
          api("/api/admin/catalog/brands"),
        ]);
        state.products = pRes.items || [];
        state.categories = cRes.items || [];
        state.brands = bRes.items || [];
        document.getElementById("pageTitle").textContent = "Products, Bulk Actions & Media";
        renderProducts(ws);
        break;
      }
      case "inventory": {
        const [pRes, logsRes] = await Promise.all([
          api("/api/admin/catalog/products?limit=250"),
          api("/api/admin/settings/inventory-logs"),
        ]);
        state.products = pRes.items || [];
        state.inventoryLogs = logsRes.items || [];
        document.getElementById("pageTitle").textContent = "Inventory & Stock Control";
        renderInventory(ws);
        break;
      }
      case "categories": {
        const [cRes, bRes] = await Promise.all([
          api("/api/admin/catalog/categories"),
          api("/api/admin/catalog/brands"),
        ]);
        state.categories = cRes.items || [];
        state.brands = bRes.items || [];
        document.getElementById("pageTitle").textContent = "Categories & Brands";
        renderCategories(ws);
        break;
      }
      case "orders": {
        const params = new URLSearchParams({ limit: "200" });
        if (state.orderDateFrom) params.set("dateFrom", state.orderDateFrom);
        if (state.orderDateTo) params.set("dateTo", state.orderDateTo);
        state.orders = (await api(`/api/admin/orders?${params.toString()}`)).items || [];
        document.getElementById("pageTitle").textContent = "Orders, Tracking & Invoices";
        renderOrders(ws);
        break;
      }
      case "customers":
        state.customers = (await api("/api/admin/customers?limit=200")).items || [];
        document.getElementById("pageTitle").textContent = "Customers & Profiles";
        renderCustomers(ws);
        break;
      case "payments": {
        const [payRes, zRes] = await Promise.all([
          api("/api/admin/marketing/payments"),
          api("/api/admin/settings/delivery"),
        ]);
        state.payments = payRes;
        state.deliveryZones = zRes.items || [];
        document.getElementById("pageTitle").textContent = "Payments & Verification";
        renderPayments(ws);
        break;
      }
      case "marketing":
        state.coupons = (await api("/api/admin/marketing/coupons")).items || [];
        document.getElementById("pageTitle").textContent = "Coupons & Flash Deals";
        renderMarketing(ws);
        break;
      case "banners":
        state.siteConfig = await api("/api/admin/cms/site-config");
        document.getElementById("pageTitle").textContent = "Banners & Homepage Sections";
        renderBannersHomepage(ws);
        break;
      case "cms":
        state.siteConfig = await api("/api/admin/cms/site-config");
        document.getElementById("pageTitle").textContent = "Website & SEO Settings";
        renderCms(ws);
        break;
      case "social": {
        const [socRes, anRes] = await Promise.all([
          api("/api/admin/cms/social-support"),
          api("/api/admin/cms/analytics"),
        ]);
        state.socialSupport = socRes.settings;
        state.socialMeta = {
          hasPublished: socRes.hasPublished,
          hasDraftChanges: socRes.hasDraftChanges,
          updatedAt: socRes.updatedAt,
        };
        state.engagementAnalytics = anRes || {};
        document.getElementById("pageTitle").textContent = "Social Support Manager";
        renderSocialSupport(ws);
        break;
      }
      case "popups": {
        const [popRes, annRes, anRes, socRes] = await Promise.all([
          api("/api/admin/cms/popups"),
          api("/api/admin/cms/announcements"),
          api("/api/admin/cms/analytics"),
          api("/api/admin/cms/social-support"),
        ]);
        state.popups = popRes.items || [];
        state.announcementConfig = annRes || {};
        state.engagementAnalytics = anRes || {};
        state.socialSupport = socRes.settings;
        document.getElementById("pageTitle").textContent = "3D Welcome Popup & Announcement Manager";
        renderPopups(ws);
        break;
      }
      case "funzone":
        state.funZone = await api("/api/admin/marketing/fun-zone");
        document.getElementById("pageTitle").textContent = "MY Fun Zone Rules";
        renderFunZone(ws);
        break;
      case "ai":
        state.aiSettings = await api("/api/admin/marketing/ai-settings");
        document.getElementById("pageTitle").textContent = "AI Shopping Assistant";
        renderAiSettings(ws);
        break;
      case "reviews": {
        const [rRes, tRes, cntRes] = await Promise.all([
          api("/api/admin/cms/reviews"),
          api("/api/admin/cms/support-tickets"),
          api("/api/admin/cms/content"),
        ]);
        state.reviews = rRes.items || [];
        state.supportTickets = tRes.items || [];
        state.contentPages = cntRes.items || [];
        document.getElementById("pageTitle").textContent = "Reviews, Support Tickets & Pages";
        renderReviewsContent(ws);
        break;
      }
      case "sellers": {
        const [sRes, dRes] = await Promise.all([
          api("/api/admin/settings/sellers"),
          api("/api/admin/settings/delivery"),
        ]);
        state.sellers = sRes.items || [];
        state.deliveryZones = dRes.items || [];
        document.getElementById("pageTitle").textContent = "Sellers & Delivery Zones";
        renderSellersDelivery(ws);
        break;
      }
      case "notifications":
        document.getElementById("pageTitle").textContent = "Customer Notifications";
        renderNotifications(ws);
        break;
      case "reports": {
        const [dashRes, histRes] = await Promise.all([
          api("/api/admin/dashboard"),
          api("/api/admin/settings/backup/history"),
        ]);
        state.dashboard = dashRes;
        state.backupHistory = histRes.items || [];
        document.getElementById("pageTitle").textContent = "Reports, Backups & Restore";
        renderReports(ws);
        break;
      }
      case "settings":
        state.auditLogs =
          (
            await api(
              `/api/admin/settings/audit-logs${
                state.auditActionFilter ? `?action=${encodeURIComponent(state.auditActionFilter)}` : ""
              }`
            )
          ).items || [];
        document.getElementById("pageTitle").textContent = "Admin Security & Audit Logs";
        renderSettings(ws);
        break;
    }
  } catch (err) {
    ws.innerHTML = `<div class="alert">${escHtml(err.message)}</div>`;
  }
}

// ======================== 1. DASHBOARD ========================

function renderDashboard(ws) {
  const m = state.dashboard?.metrics || {};
  const series = state.chartMode === "monthly" ? state.dashboard?.monthlySeries || [] : state.dashboard?.salesSeries || [];
  const breakdown = state.dashboard?.orderStatusBreakdown || {};
  const heroKpis = [
    ["Total Revenue", money(m.totalRevenue), `Today: ${money(m.todayRevenue)}`],
    ["Monthly Sales", money(m.monthlyRevenue), `Avg Order: ${money(m.avgOrderValue)}`],
    ["Total Orders", m.totalOrders ?? 0, `Pending: ${m.pendingOrders ?? 0} • Completed: ${m.completedOrders ?? 0}`],
    ["Total Customers", m.totalCustomers ?? 0, `Active Sellers: ${m.totalSellers ?? 0}`],
    ["Catalog Products", m.totalProducts ?? 0, `Categories: ${m.totalCategories ?? 0}`],
    ["Low / Out Stock", Number(m.lowStockCount || 0) + Number(m.outOfStockCount || 0), `Low: ${m.lowStockCount ?? 0} • Out: ${m.outOfStockCount ?? 0}`],
  ];

  const miniStats = [
    ["Pending Orders", m.pendingOrders ?? 0],
    ["Delivered Orders", m.completedOrders ?? 0],
    ["Cancelled Orders", m.cancelledOrders ?? 0],
    ["Pending Payments", m.pendingPayments ?? 0],
    ["Active Coupons", `${m.activeCoupons ?? 0} / ${m.totalCoupons ?? 0}`],
  ];

  const statusEntries = Object.entries(breakdown).filter(([, count]) => Number(count) > 0);
  const lowAlerts = [...(state.dashboard?.outOfStockProducts || []), ...(state.dashboard?.lowStockProducts || [])].slice(0, 6);

  ws.innerHTML = `
    <div class="kpi-grid">
      ${heroKpis
        .map(
          ([label, val, sub]) => `
        <div class="kpi-card">
          <div class="kpi-label">${escHtml(label)}</div>
          <div class="kpi-value">${escHtml(val)}</div>
          <div class="kpi-sub">${escHtml(sub)}</div>
        </div>`
        )
        .join("")}
    </div>

    <div class="stat-strip">
      ${miniStats
        .map(
          ([lbl, val]) => `
        <div class="stat-pill-box">
          <span class="muted">${escHtml(lbl)}</span>
          <strong>${escHtml(val)}</strong>
        </div>`
        )
        .join("")}
    </div>

    <div class="chart-split-grid">
      <div class="card">
        <div class="card-header">
          <div>
            <h3>Revenue & Sales Trend (${state.chartMode === "monthly" ? "Monthly" : "Daily"})</h3>
            <small class="muted">Real verified order totals across shared Firestore</small>
          </div>
          <div class="badge-row">
            <button type="button" class="filter-chip ${state.chartMode === "daily" ? "active" : ""}" id="chartDailyBtn">Daily</button>
            <button type="button" class="filter-chip ${state.chartMode === "monthly" ? "active" : ""}" id="chartMonthlyBtn">Monthly</button>
            <button type="button" class="btn-neon small" onclick="loadTab('products')">+ Product</button>
            <button type="button" class="btn-outline small" onclick="loadTab('banners')">Banners</button>
          </div>
        </div>
        <canvas id="revenueChart" height="210" style="width:100%;height:210px;"></canvas>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3>Order Fulfillment Mix</h3>
            <small class="muted">Live distribution by status</small>
          </div>
          <strong>${m.totalOrders ?? 0} total</strong>
        </div>
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
          <canvas id="orderStatusChart" width="170" height="170" style="width:170px;height:170px;flex-shrink:0;"></canvas>
          <div style="flex:1;min-width:130px;display:flex;flex-direction:column;gap:6px;font-size:0.8rem;">
            ${
              statusEntries.length
                ? statusEntries
                    .map(
                      ([lbl, cnt]) => `
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span>${statusBadge(lbl)}</span>
                    <strong>${cnt}</strong>
                  </div>`
                    )
                    .join("")
                : `<p class="muted">Status distribution appears once orders arrive.</p>`
            }
          </div>
        </div>
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card-header">
          <h3>Recent Orders</h3>
          <div class="badge-row">
            <button type="button" class="btn-outline small" onclick="downloadFileFromApi('/api/admin/orders/export/csv','myshop-orders.csv')">⬇ CSV</button>
            <button type="button" class="btn-outline small" onclick="loadTab('orders')">Manage All →</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Total</th><th>Status</th><th>Payment</th></tr></thead>
            <tbody>
              ${(state.dashboard?.recentOrders || [])
                .map(
                  (o) => `<tr>
                    <td><strong>${escHtml(o.orderNumber)}</strong></td>
                    <td>${money(o.totalAmount)}</td>
                    <td>${statusBadge(o.orderStatus)}</td>
                    <td><small class="muted">${escHtml(o.paymentStatus)}</small></td>
                  </tr>`
                )
                .join("") || `<tr><td colspan="4" class="muted">No orders yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Low Stock Alerts</h3>
          <button type="button" class="btn-outline small" onclick="loadTab('inventory')">Restock →</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>SKU</th><th>Stock</th></tr></thead>
            <tbody>
              ${lowAlerts
                .map(
                  (p) => `<tr>
                    <td>${escHtml(p.name)}</td>
                    <td><small class="muted">${escHtml(p.sku || p.id)}</small></td>
                    <td>${Number(p.stock || 0) <= 0 ? statusBadge("Out") : `<span class="status-badge badge-pending">${p.stock} left</span>`}</td>
                  </tr>`
                )
                .join("") || `<tr><td colspan="3" class="muted">All products have healthy stock levels.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card-header">
          <h3>Best-Selling Products</h3>
          <button type="button" class="btn-outline small" onclick="loadTab('products')">Catalog →</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Sold</th><th>Revenue</th></tr></thead>
            <tbody>
              ${(state.dashboard?.bestSellingProducts || [])
                .map((p) => `<tr><td>${escHtml(p.name)}</td><td>${p.unitsSold}</td><td>${money(p.revenue)}</td></tr>`)
                .join("") || `<tr><td colspan="3" class="muted">No sales data yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Latest Customers & Audit Feed</h3>
          <button type="button" class="btn-outline small" onclick="loadTab('customers')">Customers →</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Customer</th><th>Points</th><th>Status</th></tr></thead>
            <tbody>
              ${(state.dashboard?.recentCustomers || [])
                .map(
                  (c) => `<tr>
                    <td><strong>${escHtml(c.displayName)}</strong><br><small class="muted">${escHtml(c.email)}</small></td>
                    <td>${c.points} pts</td>
                    <td>${c.suspended ? statusBadge("Suspended") : statusBadge("Active")}</td>
                  </tr>`
                )
                .join("") || `<tr><td colspan="3" class="muted">No customers registered yet.</td></tr>`}
            </tbody>
          </table>
        </div>
        <hr class="divider"/>
        <p class="muted small">Recent Admin Activities:</p>
        <ul style="list-style:none;font-size:0.78rem;margin-top:6px;">
          ${(state.dashboard?.recentActivities || [])
            .slice(0, 5)
            .map((a) => `<li>• <strong>${escHtml(a.action)}</strong> — ${escHtml(a.targetPath)}</li>`)
            .join("") || `<li class="muted">No activity logs yet.</li>`}
        </ul>
      </div>
    </div>
  `;

  document.getElementById("chartDailyBtn").onclick = () => {
    state.chartMode = "daily";
    renderDashboard(ws);
  };
  document.getElementById("chartMonthlyBtn").onclick = () => {
    state.chartMode = "monthly";
    renderDashboard(ws);
  };

  drawRevenueChart(series);
  drawOrderStatusDonut(breakdown);
}

function drawRevenueChart(series) {
  const canvas = document.getElementById("revenueChart");
  if (!canvas) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth || 620;
  const cssH = 210;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssW, cssH);

  if (!series.length) {
    ctx.fillStyle = "#B6C3E6";
    ctx.font = "13px sans-serif";
    ctx.fillText("Revenue bars appear once verified orders arrive in shared Firestore.", 16, cssH / 2);
    return;
  }

  const maxRev = Math.max(100, ...series.map((s) => Number(s.revenue || 0)));
  const padL = 52;
  const padB = 26;
  const padT = 16;
  const plotW = Math.max(100, cssW - padL - 14);
  const plotH = cssH - padT - padB;

  ctx.strokeStyle = "rgba(0, 229, 255, 0.14)";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#B6C3E6";
  ctx.font = "10px sans-serif";
  for (let i = 0; i <= 3; i++) {
    const y = padT + (plotH * i) / 3;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(cssW - 10, y);
    ctx.stroke();
    const labelVal = Math.round(maxRev * (1 - i / 3));
    ctx.fillText(`৳${labelVal >= 1000 ? `${(labelVal / 1000).toFixed(1)}k` : labelVal}`, 4, y + 3);
  }

  const slotW = plotW / series.length;
  const barW = Math.max(12, Math.min(38, slotW * 0.62));
  series.forEach((pt, idx) => {
    const x = padL + idx * slotW + (slotW - barW) / 2;
    const barH = Math.max(6, Math.round((Number(pt.revenue || 0) / maxRev) * plotH));
    const y = padT + plotH - barH;
    const grad = ctx.createLinearGradient(x, y, x, padT + plotH);
    grad.addColorStop(0, "#00E5FF");
    grad.addColorStop(0.55, "#168BFF");
    grad.addColorStop(1, "#8B20FF");
    ctx.fillStyle = grad;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, barW, barH, [6, 6, 0, 0]);
    } else {
      ctx.rect(x, y, barW, barH);
    }
    ctx.fill();
    ctx.fillStyle = "#B6C3E6";
    const lbl = String(pt.date || pt.month || "");
    ctx.fillText(lbl.length > 7 ? lbl.slice(5) : lbl, x, cssH - 8);
  });
}

function drawOrderStatusDonut(breakdown) {
  const canvas = document.getElementById("orderStatusChart");
  if (!canvas) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = 170;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);

  const palette = {
    Pending: "#f59e0b",
    Confirmed: "#168BFF",
    Processing: "#00E5FF",
    Shipped: "#8B20FF",
    "Out for Delivery": "#a855f7",
    Delivered: "#10b981",
    Cancelled: "#ef4444",
  };

  const entries = Object.entries(breakdown || {}).filter(([, v]) => Number(v) > 0);
  const total = entries.reduce((s, [, v]) => s + Number(v), 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = 64;

  if (total === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(182,195,230,0.22)";
    ctx.lineWidth = 18;
    ctx.stroke();
    ctx.fillStyle = "#B6C3E6";
    ctx.font = "700 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("0 Orders", cx, cy + 5);
    return;
  }

  let angle = -Math.PI / 2;
  entries.forEach(([key, val]) => {
    const slice = (Number(val) / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.strokeStyle = palette[key] || "#8B20FF";
    ctx.lineWidth = 20;
    ctx.stroke();
    angle += slice;
  });

  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text-main").trim() || "#ffffff";
  ctx.font = "800 18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(total), cx, cy + 2);
  ctx.fillStyle = "#B6C3E6";
  ctx.font = "600 10px sans-serif";
  ctx.fillText("ORDERS", cx, cy + 17);
}

// ======================== 2. PRODUCT, BULK ACTIONS & IMAGE MANAGEMENT ========================

function getCategoryListForSelect(extraCatId = "") {
  const base = state.categories.length
    ? state.categories
    : [
        { id: "MOBILES", titleEn: "Mobiles & Tablets" },
        { id: "COMPUTERS", titleEn: "Computers & Laptops" },
        { id: "ELECTRONICS", titleEn: "Electronics" },
        { id: "FASHION", titleEn: "Fashion & Clothing" },
        { id: "GAMING", titleEn: "Gaming Products" },
      ];
  const list = [...base];
  if (extraCatId && !list.some((c) => String(c.id).toUpperCase() === String(extraCatId).toUpperCase())) {
    list.push({ id: extraCatId, titleEn: `${extraCatId} (Legacy)` });
  }
  return list;
}

function renderProducts(ws) {
  const editProd = state.products.find((x) => x.id === state.editingProductId) || null;
  const catList = getCategoryListForSelect(editProd?.categoryId || "");
  const catOptions = catList
    .map((c) => `<option value="${escHtml(c.id)}">${escHtml(c.titleEn || c.id)}</option>`)
    .join("");

  ws.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 id="prodFormHeading">${editProd ? `Edit Product: ${escHtml(editProd.name)}` : "Add New Product (Syncs Live to Customer Storefront)"}</h3>
        ${editProd ? `<button type="button" class="btn-outline small" onclick="resetProductForm()">Cancel Edit</button>` : ""}
      </div>
      <form id="productForm" class="stack-form">
        <div class="form-grid">
          <label><span>Product Name *</span><input id="pName" required placeholder="NovaPulse 5G Smartphone" /></label>
          <label><span>Bengali Name</span><input id="pNameBn" placeholder="নোভা-পালস 5G" /></label>
          <label><span>SKU</span><input id="pSku" placeholder="MYS-5G-001" /></label>
          <label><span>Category</span><select id="pCategory">${catOptions}</select></label>
          <label><span>Brand</span><input id="pBrand" value="NovaTech" /></label>
          <label><span>Selling Price (৳) *</span><input id="pPrice" type="number" min="0" required value="18990" /></label>
          <label><span>Original Price (৳)</span><input id="pOrigPrice" type="number" min="0" value="22990" /></label>
          <label><span>Discount % (optional auto)</span><input id="pDiscount" type="number" min="0" max="99" placeholder="Auto" /></label>
          <label><span>Stock Qty *</span><input id="pStock" type="number" min="0" required value="25" /></label>
          <label><span>Colors (comma-separated)</span><input id="pColors" value="Cosmic Violet, Electric Cyan" /></label>
          <label><span>Sizes / Variants</span><input id="pSizes" value="128GB, 256GB" /></label>
          <label><span>Schedule Publish (optional)</span><input id="pSchedule" type="datetime-local" /></label>
        </div>
        <label><span>Description</span><textarea id="pDesc" rows="2" placeholder="Full product description…"></textarea></label>

        <div class="badge-row" style="font-size:0.84rem;gap:14px;">
          <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="pPublished" checked style="width:auto;" /> Published</label>
          <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="pAvailable" checked style="width:auto;" /> Available</label>
          <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="pFeatured" style="width:auto;" /> Featured</label>
          <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="pBestSeller" style="width:auto;" /> Best Seller</label>
          <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="pTrending" style="width:auto;" /> Trending</label>
          <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="pFlashSale" style="width:auto;" /> Flash Sale</label>
          <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="pTodaysDeal" style="width:auto;" /> Today's Deal</label>
          <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="pNewArrival" style="width:auto;" /> New Arrival</label>
          <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="pFreeDel" checked style="width:auto;" /> Free Delivery</label>
        </div>

        <div class="card" style="background:rgba(5,11,46,0.45);">
          <h4 style="margin-bottom:8px;">Product Images (Mobile Gallery Upload + External URL + Existing Library)</h4>
          <div class="form-grid">
            <div>
              <input type="file" id="galleryFileInput" accept="image/jpeg,image/jpg,image/png,image/webp" multiple class="hidden" />
              <button type="button" class="btn-neon small" onclick="document.getElementById('galleryFileInput').click()">📷 Upload from Gallery / Files</button>
              <small class="muted" style="display:block;margin-top:4px;">Supports Android Gallery & Desktop (JPG, PNG, WebP)</small>
            </div>
            <div style="display:flex;gap:6px;align-items:flex-end;">
              <label style="flex:1;"><span>Or Paste Image URL</span><input id="externalImgUrl" placeholder="https://example.com/product.jpg" /></label>
              <button type="button" class="btn-outline small" id="addImgUrlBtn">Add URL</button>
            </div>
            <div style="display:flex;align-items:flex-end;">
              <button type="button" class="btn-outline small" id="loadLibraryBtn">🖼️ Pick from Uploaded Library</button>
            </div>
          </div>
          <div id="imgPreviewGrid" class="img-preview-grid"></div>
        </div>

        <button type="submit" class="btn-neon">${editProd ? "Save Product Changes" : "Publish Product to MY Shop"}</button>
      </form>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Catalog Products (${state.products.length})</h3>
        <div class="filter-bar" style="margin:0;">
          <input id="prodSearch" placeholder="Search name, SKU, brand…" value="${escHtml(state.prodQuery)}" style="max-width:190px;" />
          <select id="prodCatFilter" style="max-width:150px;">
            <option value="ALL">All Categories</option>
            ${catOptions}
          </select>
          <select id="prodStatusFilter" style="max-width:130px;">
            <option value="all" ${state.prodStatusFilter === "all" ? "selected" : ""}>All Status</option>
            <option value="published" ${state.prodStatusFilter === "published" ? "selected" : ""}>Published</option>
            <option value="draft" ${state.prodStatusFilter === "draft" ? "selected" : ""}>Draft Only</option>
          </select>
          <select id="prodStockFilter" style="max-width:135px;">
            <option value="all" ${state.prodStockFilter === "all" ? "selected" : ""}>All Stock</option>
            <option value="in" ${state.prodStockFilter === "in" ? "selected" : ""}>In Stock</option>
            <option value="low" ${state.prodStockFilter === "low" ? "selected" : ""}>Low Stock (≤5)</option>
            <option value="out" ${state.prodStockFilter === "out" ? "selected" : ""}>Out of Stock</option>
          </select>
          <select id="prodSortSelect" style="max-width:140px;">
            <option value="newest" ${state.prodSort === "newest" ? "selected" : ""}>Newest First</option>
            <option value="price_asc" ${state.prodSort === "price_asc" ? "selected" : ""}>Price: Low → High</option>
            <option value="price_desc" ${state.prodSort === "price_desc" ? "selected" : ""}>Price: High → Low</option>
            <option value="stock_asc" ${state.prodSort === "stock_asc" ? "selected" : ""}>Lowest Stock</option>
            <option value="name_asc" ${state.prodSort === "name_asc" ? "selected" : ""}>Name A-Z</option>
          </select>
        </div>
      </div>

      <div id="bulkActionMount"></div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:32px;"><input type="checkbox" id="selectAllProductsChk" style="width:auto;" aria-label="Select all on page" /></th>
              <th>Image</th>
              <th>Product</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Quick Toggles</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="productsTableBody"></tbody>
        </table>
      </div>
      <div id="productsPaginationMount" class="pagination-bar"></div>
    </div>
  `;

  document.getElementById("prodCatFilter").value = state.prodCatFilter || "ALL";
  renderImageDraftGrid();
  renderProductRows();

  document.getElementById("prodSearch").addEventListener("input", (e) => {
    state.prodQuery = e.target.value;
    state.prodPage = 1;
    renderProductRows();
  });
  document.getElementById("prodCatFilter").addEventListener("change", (e) => {
    state.prodCatFilter = e.target.value;
    state.prodPage = 1;
    renderProductRows();
  });
  document.getElementById("prodStatusFilter").addEventListener("change", (e) => {
    state.prodStatusFilter = e.target.value;
    state.prodPage = 1;
    renderProductRows();
  });
  document.getElementById("prodStockFilter").addEventListener("change", (e) => {
    state.prodStockFilter = e.target.value;
    state.prodPage = 1;
    renderProductRows();
  });
  document.getElementById("prodSortSelect").addEventListener("change", (e) => {
    state.prodSort = e.target.value;
    state.prodPage = 1;
    renderProductRows();
  });

  document.getElementById("galleryFileInput").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const fd = new FormData();
    fd.append("folder", "products");
    files.forEach((f) => fd.append("images", f));
    try {
      toast("Uploading image(s)…");
      const res = await api("/api/admin/catalog/uploads/images", { method: "POST", body: fd });
      (res.images || []).forEach((img) => {
        state.productImagesDraft.push(img.url);
        if (!state.mainImageDraft) state.mainImageDraft = img.url;
      });
      renderImageDraftGrid();
      toast(`Uploaded ${res.images?.length || 0} image(s)!`);
    } catch (err) {
      toast(err.message, false);
    }
  });

  document.getElementById("addImgUrlBtn").addEventListener("click", async () => {
    const url = document.getElementById("externalImgUrl").value.trim();
    if (!url) return;
    try {
      const check = await api("/api/admin/catalog/validate-image-url", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      if (!check.valid) return toast("Invalid image URL.", false);
      state.productImagesDraft.push(url);
      if (!state.mainImageDraft) state.mainImageDraft = url;
      document.getElementById("externalImgUrl").value = "";
      renderImageDraftGrid();
      toast("Image URL verified & added.");
    } catch (err) {
      toast(err.message, false);
    }
  });

  document.getElementById("loadLibraryBtn").addEventListener("click", async () => {
    try {
      const lib = await api("/api/admin/catalog/uploads/library");
      const urls = lib.urls || [];
      if (!urls.length) return toast("No uploaded image URLs found in library yet.", false);
      openModal(`
        <div class="card-header">
          <h3>Select Images from Library (${urls.length})</h3>
          <button type="button" class="icon-btn" onclick="closeModal()">✕</button>
        </div>
        <div class="img-preview-grid" style="max-height:360px;overflow-y:auto;">
          ${urls
            .slice(0, 36)
            .map(
              (u) => `
            <div class="img-thumb" style="width:110px;">
              <img src="${escHtml(u)}" alt="Library" />
              <button type="button" class="btn-outline small" style="border-radius:0;font-size:0.7rem;" data-lib-pick="${escHtml(u)}">+ Add</button>
            </div>`
            )
            .join("")}
        </div>
      `);
      document.querySelectorAll("[data-lib-pick]").forEach((b) => {
        b.onclick = () => {
          const picked = b.getAttribute("data-lib-pick");
          if (picked && !state.productImagesDraft.includes(picked)) {
            state.productImagesDraft.push(picked);
            if (!state.mainImageDraft) state.mainImageDraft = picked;
            renderImageDraftGrid();
            toast("Image added from library!");
          }
          b.disabled = true;
          b.textContent = "Added ✓";
        };
      });
    } catch (err) {
      toast(err.message, false);
    }
  });

  document.getElementById("productForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const rawDisc = document.getElementById("pDiscount").value;
    const payload = {
      name: document.getElementById("pName").value,
      nameBn: document.getElementById("pNameBn").value,
      sku: document.getElementById("pSku").value,
      categoryId: document.getElementById("pCategory").value,
      brand: document.getElementById("pBrand").value,
      price: Number(document.getElementById("pPrice").value),
      originalPrice: Number(document.getElementById("pOrigPrice").value),
      discountPercent: rawDisc !== "" ? Number(rawDisc) : undefined,
      stock: Number(document.getElementById("pStock").value),
      colors: document.getElementById("pColors").value.split(",").map((s) => s.trim()).filter(Boolean),
      sizes: document.getElementById("pSizes").value.split(",").map((s) => s.trim()).filter(Boolean),
      scheduledAt: document.getElementById("pSchedule").value,
      description: document.getElementById("pDesc").value,
      published: document.getElementById("pPublished").checked,
      available: document.getElementById("pAvailable").checked,
      featured: document.getElementById("pFeatured").checked,
      bestSeller: document.getElementById("pBestSeller").checked,
      trending: document.getElementById("pTrending").checked,
      flashSale: document.getElementById("pFlashSale").checked,
      todaysDeal: document.getElementById("pTodaysDeal").checked,
      newArrival: document.getElementById("pNewArrival").checked,
      freeDelivery: document.getElementById("pFreeDel").checked,
      imageUrls: state.productImagesDraft,
      mainImageUrl: state.mainImageDraft || state.productImagesDraft[0] || "",
    };
    try {
      if (state.editingProductId) {
        await api(`/api/admin/catalog/products/${encodeURIComponent(state.editingProductId)}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast("Product updated and synced!");
      } else {
        await api("/api/admin/catalog/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast("Product published to MY Shop!");
      }
      resetProductForm();
      await loadTab("products");
    } catch (err) {
      toast(err.message, false);
    }
  });
}

function renderImageDraftGrid() {
  const grid = document.getElementById("imgPreviewGrid");
  if (!grid) return;
  grid.innerHTML = state.productImagesDraft
    .map(
      (url, idx) => `
      <div class="img-thumb ${url === state.mainImageDraft ? "main" : ""}">
        <img src="${escHtml(url)}" alt="Preview" />
        <div class="img-thumb-actions">
          <button type="button" onclick="setMainImg(${idx})" title="Set Main">★</button>
          <button type="button" onclick="moveImgLeft(${idx})" title="Move Left">◀</button>
          <button type="button" onclick="removeImg(${idx})" title="Remove">✕</button>
        </div>
      </div>`
    )
    .join("");
}

window.setMainImg = (idx) => {
  state.mainImageDraft = state.productImagesDraft[idx] || "";
  renderImageDraftGrid();
};
window.moveImgLeft = (idx) => {
  if (idx <= 0) return;
  const arr = state.productImagesDraft;
  [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
  renderImageDraftGrid();
};
window.removeImg = (idx) => {
  const removed = state.productImagesDraft.splice(idx, 1)[0];
  if (state.mainImageDraft === removed) state.mainImageDraft = state.productImagesDraft[0] || "";
  renderImageDraftGrid();
};

window.resetProductForm = () => {
  state.editingProductId = null;
  state.productImagesDraft = [];
  state.mainImageDraft = "";
  loadTab("products");
};

window.editProduct = (id) => {
  const p = state.products.find((x) => x.id === id);
  if (!p) return toast("Product not found in current list.", false);
  state.editingProductId = p.id;
  const fallbackImgs = Array.isArray(p.imageUrls)
    ? [...p.imageUrls]
    : Array.isArray(p.images)
    ? [...p.images]
    : [];
  const mainImg = p.mainImageUrl || p.imageUrl || fallbackImgs[0] || "";
  if (mainImg && !fallbackImgs.includes(mainImg)) fallbackImgs.unshift(mainImg);

  state.productImagesDraft = fallbackImgs;
  state.mainImageDraft = mainImg;
  renderProducts(document.getElementById("workspace"));

  document.getElementById("pName").value = p.name || "";
  document.getElementById("pNameBn").value = p.nameBn || "";
  document.getElementById("pSku").value = p.sku || "";
  document.getElementById("pCategory").value = p.categoryId || "MOBILES";
  document.getElementById("pBrand").value = p.brand || "";
  document.getElementById("pPrice").value = p.price || 0;
  document.getElementById("pOrigPrice").value = p.originalPrice || p.price || 0;
  document.getElementById("pDiscount").value = p.discountPercent || "";
  document.getElementById("pStock").value = p.stock || 0;
  document.getElementById("pColors").value = (p.colors || []).join(", ");
  document.getElementById("pSizes").value = (p.sizes || []).join(", ");
  document.getElementById("pSchedule").value = p.scheduledAt || "";
  document.getElementById("pDesc").value = p.description || "";
  document.getElementById("pPublished").checked = p.published !== false;
  document.getElementById("pAvailable").checked = p.available !== false;
  document.getElementById("pFeatured").checked = Boolean(p.featured);
  document.getElementById("pBestSeller").checked = Boolean(p.bestSeller);
  document.getElementById("pTrending").checked = Boolean(p.trending);
  document.getElementById("pFlashSale").checked = Boolean(p.flashSale);
  document.getElementById("pTodaysDeal").checked = Boolean(p.todaysDeal);
  document.getElementById("pNewArrival").checked = Boolean(p.newArrival);
  document.getElementById("pFreeDel").checked = Boolean(p.freeDelivery);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.duplicateProduct = async (id) => {
  try {
    await api(`/api/admin/catalog/products/${encodeURIComponent(id)}/duplicate`, { method: "POST" });
    toast("Product duplicated as draft.");
    loadTab("products");
  } catch (err) {
    toast(err.message, false);
  }
};

window.deleteProduct = async (id) => {
  const ok = await showConfirmModal({
    title: "Delete Product",
    message: `Are you sure you want to permanently delete product "${id}"?`,
    confirmText: "Delete Product",
  });
  if (!ok) return;
  try {
    await api(`/api/admin/catalog/products/${encodeURIComponent(id)}`, { method: "DELETE" });
    state.selectedProductIds = state.selectedProductIds.filter((x) => x !== id);
    toast("Product deleted.");
    loadTab("products");
  } catch (err) {
    toast(err.message, false);
  }
};

window.quickToggleProduct = async (id, field, currentVal) => {
  try {
    await api(`/api/admin/catalog/products/${encodeURIComponent(id)}/quick`, {
      method: "PATCH",
      body: JSON.stringify({ [field]: !currentVal }),
    });
    const item = state.products.find((p) => p.id === id);
    if (item) item[field] = !currentVal;
    renderProductRows();
    toast(`Updated ${field} status!`);
  } catch (err) {
    toast(err.message, false);
  }
};

window.toggleSelectProduct = (id) => {
  if (state.selectedProductIds.includes(id)) {
    state.selectedProductIds = state.selectedProductIds.filter((x) => x !== id);
  } else {
    state.selectedProductIds.push(id);
  }
  renderBulkBar();
};

function renderBulkBar() {
  const mount = document.getElementById("bulkActionMount");
  if (!mount) return;
  const count = state.selectedProductIds.length;
  if (count === 0) {
    mount.innerHTML = "";
    return;
  }
  const catOpts = getCategoryListForSelect()
    .map((c) => `<option value="${escHtml(c.id)}">${escHtml(c.titleEn || c.id)}</option>`)
    .join("");
  mount.innerHTML = `
    <div class="bulk-bar">
      <strong>${count} selected</strong>
      <div class="badge-row">
        <button type="button" class="btn-outline small" onclick="runBulkAction('publish')">🟢 Publish</button>
        <button type="button" class="btn-outline small" onclick="runBulkAction('unpublish')">⚪ Draft</button>
        <select id="bulkCatTarget" style="width:auto;padding:5px 8px;font-size:0.78rem;">${catOpts}</select>
        <button type="button" class="btn-outline small" onclick="runBulkAction('category')">Move Category</button>
        <input id="bulkStockVal" type="number" min="0" placeholder="Stock" style="width:82px;padding:5px 8px;font-size:0.78rem;" />
        <button type="button" class="btn-outline small" onclick="runBulkAction('stock_set')">Set Stock</button>
        <button type="button" class="btn-danger small" onclick="runBulkAction('delete')">Delete Selected</button>
        <button type="button" class="btn-ghost small" onclick="clearProductSelection()">Clear</button>
      </div>
    </div>
  `;
}

window.clearProductSelection = () => {
  state.selectedProductIds = [];
  renderProductRows();
};

window.runBulkAction = async (action) => {
  if (!state.selectedProductIds.length) return;
  const body = { ids: state.selectedProductIds, action };
  if (action === "category") {
    body.categoryId = document.getElementById("bulkCatTarget")?.value || "MOBILES";
  }
  if (action === "stock_set") {
    const val = document.getElementById("bulkStockVal")?.value;
    if (val === "" || val === undefined) return toast("Enter a stock value first.", false);
    body.stockValue = Number(val);
  }
  if (action === "delete") {
    const ok = await showConfirmModal({
      title: "Bulk Delete Products",
      message: `Permanently delete ${state.selectedProductIds.length} selected products?`,
      confirmText: "Delete Selected",
    });
    if (!ok) return;
  }
  try {
    const res = await api("/api/admin/catalog/products/bulk", {
      method: "POST",
      body: JSON.stringify(body),
    });
    state.selectedProductIds = [];
    toast(`Bulk action "${action}" applied to ${res.affected} product(s)!`);
    loadTab("products");
  } catch (err) {
    toast(err.message, false);
  }
};

function getFilteredSortedProducts() {
  const q = String(state.prodQuery || "").trim().toLowerCase();
  const cat = state.prodCatFilter || "ALL";
  const stFilter = state.prodStockFilter || "all";
  const pubFilter = state.prodStatusFilter || "all";
  const sort = state.prodSort || "newest";

  const rows = state.products.filter((p) => {
    if (q && !`${p.name} ${p.nameBn || ""} ${p.sku} ${p.brand} ${p.categoryId} ${p.id}`.toLowerCase().includes(q)) return false;
    if (cat !== "ALL" && String(p.categoryId).toUpperCase() !== cat.toUpperCase()) return false;
    if (pubFilter === "published" && p.published === false) return false;
    if (pubFilter === "draft" && p.published !== false) return false;
    const stock = Number(p.stock || 0);
    if (stFilter === "low" && !(stock > 0 && stock <= 5)) return false;
    if (stFilter === "out" && stock > 0) return false;
    if (stFilter === "in" && stock <= 0) return false;
    return true;
  });

  if (sort === "price_asc") rows.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  else if (sort === "price_desc") rows.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  else if (sort === "stock_asc") rows.sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));
  else if (sort === "name_asc") rows.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  else rows.sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));

  return rows;
}

function renderProductRows() {
  const rows = getFilteredSortedProducts();
  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  if (state.prodPage > totalPages) state.prodPage = totalPages;
  const start = (state.prodPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  const body = document.getElementById("productsTableBody");
  if (!body) return;
  body.innerHTML =
    pageRows
      .map((p) => {
        const thumb = p.mainImageUrl || p.imageUrl || "";
        const checked = state.selectedProductIds.includes(p.id);
        return `
      <tr>
        <td><input type="checkbox" style="width:auto;" ${checked ? "checked" : ""} onchange="toggleSelectProduct('${escHtml(p.id)}')" aria-label="Select ${escHtml(p.name)}" /></td>
        <td>${thumb ? `<img src="${escHtml(thumb)}" style="width:42px;height:42px;object-fit:cover;border-radius:8px;" />` : "—"}</td>
        <td><strong>${escHtml(p.name)}</strong><br><small class="muted">${escHtml(p.sku)} • ${escHtml(p.brand)} • ${escHtml(p.categoryId)}</small></td>
        <td>${money(p.price)}</td>
        <td>${Number(p.stock || 0) <= 0 ? statusBadge("Out") : p.stock <= 5 ? `<span class="status-badge badge-pending">${p.stock} low</span>` : p.stock}</td>
        <td>
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            <button type="button" class="toggle-pill ${p.published !== false ? "on" : ""}" onclick="quickToggleProduct('${escHtml(p.id)}','published',${p.published !== false})">${p.published !== false ? "🟢 Live" : "⚪ Draft"}</button>
            <button type="button" class="toggle-pill ${p.featured ? "on" : ""}" onclick="quickToggleProduct('${escHtml(p.id)}','featured',${Boolean(p.featured)})">⭐ Feat</button>
            <button type="button" class="toggle-pill ${p.flashSale ? "on" : ""}" onclick="quickToggleProduct('${escHtml(p.id)}','flashSale',${Boolean(p.flashSale)})">⚡ Flash</button>
            <button type="button" class="toggle-pill ${p.trending ? "on" : ""}" onclick="quickToggleProduct('${escHtml(p.id)}','trending',${Boolean(p.trending)})">🔥 Trend</button>
          </div>
        </td>
        <td style="display:flex;gap:6px;flex-wrap:wrap;">
          <button type="button" class="btn-outline small" onclick="editProduct('${escHtml(p.id)}')">Edit</button>
          <button type="button" class="btn-outline small" onclick="duplicateProduct('${escHtml(p.id)}')">Copy</button>
          <button type="button" class="btn-danger small" onclick="deleteProduct('${escHtml(p.id)}')">Delete</button>
        </td>
      </tr>`;
      })
      .join("") || `<tr><td colspan="7" class="muted">No products match this filter.</td></tr>`;

  const selAll = document.getElementById("selectAllProductsChk");
  if (selAll) {
    selAll.checked = pageRows.length > 0 && pageRows.every((r) => state.selectedProductIds.includes(r.id));
    selAll.onchange = () => {
      if (selAll.checked) {
        pageRows.forEach((r) => {
          if (!state.selectedProductIds.includes(r.id)) state.selectedProductIds.push(r.id);
        });
      } else {
        const pageSet = new Set(pageRows.map((r) => r.id));
        state.selectedProductIds = state.selectedProductIds.filter((id) => !pageSet.has(id));
      }
      renderProductRows();
    };
  }

  const pagMount = document.getElementById("productsPaginationMount");
  if (pagMount) {
    pagMount.innerHTML = `
      <span class="small muted">Showing ${rows.length ? start + 1 : 0}–${Math.min(rows.length, start + pageSize)} of ${rows.length} product(s)</span>
      <div class="badge-row">
        <button type="button" class="btn-outline small" ${state.prodPage <= 1 ? "disabled" : ""} onclick="changeProdPage(-1)">◀ Prev</button>
        <span class="small">Page ${state.prodPage} / ${totalPages}</span>
        <button type="button" class="btn-outline small" ${state.prodPage >= totalPages ? "disabled" : ""} onclick="changeProdPage(1)">Next ▶</button>
      </div>
    `;
  }
  renderBulkBar();
}

window.changeProdPage = (delta) => {
  state.prodPage = Math.max(1, state.prodPage + delta);
  renderProductRows();
};

// ======================== 2B. INVENTORY & STOCK CONTROL ========================

function renderInventory(ws) {
  const totalSkus = state.products.length;
  const inStock = state.products.filter((p) => Number(p.stock || 0) > 5).length;
  const lowStock = state.products.filter((p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= 5).length;
  const outStock = state.products.filter((p) => Number(p.stock || 0) <= 0).length;

  ws.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Total SKUs</div><div class="kpi-value">${totalSkus}</div></div>
      <div class="kpi-card"><div class="kpi-label">Healthy Stock (&gt;5)</div><div class="kpi-value" style="color:var(--emerald);">${inStock}</div></div>
      <div class="kpi-card"><div class="kpi-label">Low Stock Alerts (1–5)</div><div class="kpi-value" style="color:var(--amber);">${lowStock}</div></div>
      <div class="kpi-card"><div class="kpi-label">Out of Stock (0)</div><div class="kpi-value" style="color:var(--danger);">${outStock}</div></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Quick Stock Adjustment</h3>
        <div class="filter-bar" style="margin:0;">
          <input id="invSearchInput" placeholder="Search SKU or product…" value="${escHtml(state.invSearch)}" style="max-width:210px;" />
          <select id="invFilterSelect" style="max-width:150px;">
            <option value="all" ${state.invFilter === "all" ? "selected" : ""}>All Stock</option>
            <option value="low" ${state.invFilter === "low" ? "selected" : ""}>Low Stock (≤5)</option>
            <option value="out" ${state.invFilter === "out" ? "selected" : ""}>Out of Stock</option>
          </select>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Product</th><th>Current Stock</th><th>Quick +/-</th><th>Set Exact & Reason</th><th>Apply</th></tr></thead>
          <tbody id="invTableBody"></tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h3>Inventory Adjustment History (${state.inventoryLogs.length})</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Product</th><th>Previous → New</th><th>Delta</th><th>Reason</th><th>Admin & Time</th></tr></thead>
          <tbody>
            ${state.inventoryLogs
              .map(
                (l) => `
              <tr>
                <td><strong>${escHtml(l.productName || l.productId)}</strong></td>
                <td>${l.previousStock} → <strong>${l.newStock}</strong></td>
                <td><span class="status-badge ${Number(l.delta) >= 0 ? "badge-delivered" : "badge-cancelled"}">${Number(l.delta) >= 0 ? "+" : ""}${l.delta}</span></td>
                <td>${escHtml(l.reason || "Adjustment")}</td>
                <td><small class="muted">${escHtml(l.adminUsername || "system")} • ${escHtml(l.createdAt ? String(l.createdAt).slice(0, 16).replace("T", " ") : "")}</small></td>
              </tr>`
              )
              .join("") || `<tr><td colspan="5" class="muted">No inventory adjustment history recorded yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const drawInvRows = () => {
    const q = String(state.invSearch || "").trim().toLowerCase();
    const f = state.invFilter || "all";
    const filtered = state.products
      .filter((p) => {
        if (q && !`${p.name} ${p.sku} ${p.brand}`.toLowerCase().includes(q)) return false;
        const st = Number(p.stock || 0);
        if (f === "low" && !(st > 0 && st <= 5)) return false;
        if (f === "out" && st > 0) return false;
        return true;
      })
      .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));

    document.getElementById("invTableBody").innerHTML =
      filtered
        .slice(0, 60)
        .map(
          (p) => `
        <tr>
          <td><strong>${escHtml(p.name)}</strong><br><small class="muted">${escHtml(p.sku || p.id)}</small></td>
          <td>${Number(p.stock || 0) <= 0 ? statusBadge("Out") : p.stock <= 5 ? `<span class="status-badge badge-pending">${p.stock} low</span>` : `<strong>${p.stock}</strong>`}</td>
          <td>
            <div class="badge-row">
              <button type="button" class="btn-outline small" onclick="adjustStock('${escHtml(p.id)}', null, -1, 'Quick -1')">-1</button>
              <button type="button" class="btn-outline small" onclick="adjustStock('${escHtml(p.id)}', null, 5, 'Restock +5')">+5</button>
              <button type="button" class="btn-outline small" onclick="adjustStock('${escHtml(p.id)}', null, 20, 'Restock +20')">+20</button>
            </div>
          </td>
          <td style="min-width:210px;">
            <div style="display:flex;gap:6px;">
              <input id="invExact_${escHtml(p.id)}" type="number" min="0" value="${Number(p.stock || 0)}" style="width:82px;padding:6px 8px;" />
              <input id="invReason_${escHtml(p.id)}" placeholder="Reason (e.g. Shipment)" style="padding:6px 8px;" />
            </div>
          </td>
          <td><button type="button" class="btn-neon small" onclick="adjustStockFromRow('${escHtml(p.id)}')">Save</button></td>
        </tr>`
        )
        .join("") || `<tr><td colspan="5" class="muted">No matching products found.</td></tr>`;
  };

  drawInvRows();
  document.getElementById("invSearchInput").oninput = (e) => {
    state.invSearch = e.target.value;
    drawInvRows();
  };
  document.getElementById("invFilterSelect").onchange = (e) => {
    state.invFilter = e.target.value;
    drawInvRows();
  };
}

window.adjustStock = async (productId, newStock, delta, reason) => {
  try {
    await api("/api/admin/catalog/inventory/adjust", {
      method: "POST",
      body: JSON.stringify({ productId, newStock, delta, reason }),
    });
    toast("Inventory updated & logged!");
    loadTab("inventory");
  } catch (err) {
    toast(err.message, false);
  }
};

window.adjustStockFromRow = async (productId) => {
  const newStock = Number(document.getElementById(`invExact_${productId}`)?.value ?? 0);
  const reason = document.getElementById(`invReason_${productId}`)?.value.trim() || "Manual Stock Set";
  await adjustStock(productId, newStock, 0, reason);
};

// ======================== 3. CATEGORIES & BRANDS ========================

function renderCategories(ws) {
  const editCat = state.categories.find((x) => x.id === state.editingCategoryId) || null;
  const editBr = state.brands.find((x) => x.id === state.editingBrandId) || null;

  ws.innerHTML = `
    <div class="two-col">
      <div class="card">
        <div class="card-header">
          <h3>${editCat ? `Edit Category: ${escHtml(editCat.titleEn)}` : "Add / Update Category"}</h3>
          ${editCat ? `<button type="button" class="btn-outline small" onclick="cancelEditCategory()">Cancel Edit</button>` : ""}
        </div>
        <form id="catForm" class="stack-form">
          <div class="form-grid">
            <label><span>Name (EN) *</span><input id="cTitle" required value="${escHtml(editCat?.titleEn || "")}" placeholder="Smart Watches" /></label>
            <label><span>Name (BN)</span><input id="cTitleBn" value="${escHtml(editCat?.titleBn || "")}" placeholder="স্মার্টওয়াচ" /></label>
            <label><span>Emoji Icon</span><input id="cEmoji" value="${escHtml(editCat?.emoji || "🛍️")}" placeholder="⌚" /></label>
            <label><span>Badge Label</span><input id="cBadge" value="${escHtml(editCat?.badgeText || "DEAL")}" placeholder="HOT / NEW" /></label>
            <label><span>Order Index</span><input id="cOrder" type="number" value="${editCat?.orderIndex ?? (state.categories.length + 1)}" /></label>
            <label style="flex-direction:row;align-items:center;gap:8px;padding-top:18px;">
              <input type="checkbox" id="cEnabled" ${editCat?.enabled !== false ? "checked" : ""} style="width:auto;" />
              <span>Visible on Storefront</span>
            </label>
          </div>
          <label><span>Description</span><input id="cDesc" value="${escHtml(editCat?.description || "")}" placeholder="Short category summary" /></label>
          <div class="form-grid">
            <label><span>Category Image URL</span><input id="cImg" value="${escHtml(editCat?.imageUrl || "")}" placeholder="https://…" /></label>
            <div style="display:flex;align-items:flex-end;">
              <input type="file" id="catImgUpload" accept="image/jpeg,image/png,image/webp" class="hidden" />
              <button type="button" class="btn-outline small" onclick="document.getElementById('catImgUpload').click()">📷 Upload Category Image</button>
            </div>
          </div>
          <label><span>Subcategories (comma-separated)</span><input id="cSubs" value="${escHtml((editCat?.subcategories || []).join(", "))}" placeholder="AMOLED, Rugged, Kids" /></label>
          <button type="submit" class="btn-neon">${editCat ? "Update Category" : "Save Category"}</button>
        </form>
        <hr class="divider"/>
        <div class="table-wrap"><table><thead><tr><th>Category</th><th>Products</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${state.categories
            .map(
              (c) => `<tr>
            <td>${escHtml(c.emoji || "🗂️")} <strong>${escHtml(c.titleEn)}</strong><br><small class="muted">${escHtml(c.titleBn || c.id)}</small></td>
            <td><strong>${c.productCount ?? 0}</strong></td>
            <td>${c.orderIndex}</td>
            <td>${c.enabled !== false ? statusBadge("Active") : statusBadge("Cancelled")}</td>
            <td style="display:flex;gap:6px;">
              <button type="button" class="btn-outline small" onclick="editCategory('${escHtml(c.id)}')">Edit</button>
              <button type="button" class="btn-danger small" onclick="deleteCategory('${escHtml(c.id)}')">Delete</button>
            </td>
          </tr>`
            )
            .join("")}
        </tbody></table></div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>${editBr ? `Edit Brand: ${escHtml(editBr.name)}` : "Manage Brands"}</h3>
          ${editBr ? `<button type="button" class="btn-outline small" onclick="cancelEditBrand()">New Brand</button>` : ""}
        </div>
        <form id="brandForm" class="stack-form">
          <label><span>Brand Name *</span><input id="bName" required value="${escHtml(editBr?.name || "")}" placeholder="NovaTech" /></label>
          <label><span>Tagline</span><input id="bTagline" value="${escHtml(editBr?.tagline || "")}" placeholder="Next-Gen Mobiles" /></label>
          <div class="form-grid">
            <label><span>Logo URL</span><input id="bLogo" value="${escHtml(editBr?.logoUrl || "")}" placeholder="https://…" /></label>
            <div style="display:flex;align-items:flex-end;">
              <input type="file" id="brandImgUpload" accept="image/jpeg,image/png,image/webp" class="hidden" />
              <button type="button" class="btn-outline small" onclick="document.getElementById('brandImgUpload').click()">📷 Upload Logo</button>
            </div>
          </div>
          <button type="submit" class="btn-neon">${editBr ? "Update Brand" : "Save Brand"}</button>
        </form>
        <hr class="divider"/>
        <div class="table-wrap"><table><thead><tr><th>Brand</th><th>Tagline</th><th>Actions</th></tr></thead><tbody>
          ${state.brands
            .map(
              (b) => `<tr>
            <td><strong>${escHtml(b.name)}</strong></td>
            <td>${escHtml(b.tagline)}</td>
            <td style="display:flex;gap:6px;">
              <button type="button" class="btn-outline small" onclick="editBrand('${escHtml(b.id)}')">Edit</button>
              <button type="button" class="btn-danger small" onclick="deleteBrand('${escHtml(b.id)}')">Delete</button>
            </td>
          </tr>`
            )
            .join("")}
        </tbody></table></div>
      </div>
    </div>
  `;

  document.getElementById("catImgUpload").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("folder", "categories");
    fd.append("images", file);
    try {
      toast("Uploading category image…");
      const res = await api("/api/admin/catalog/uploads/images", { method: "POST", body: fd });
      const url = res.images?.[0]?.url || "";
      if (url) {
        document.getElementById("cImg").value = url;
        toast("Category image uploaded!");
      }
    } catch (err) {
      toast(err.message, false);
    }
  });

  document.getElementById("brandImgUpload").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("folder", "brands");
    fd.append("images", file);
    try {
      toast("Uploading brand logo…");
      const res = await api("/api/admin/catalog/uploads/images", { method: "POST", body: fd });
      const url = res.images?.[0]?.url || "";
      if (url) {
        document.getElementById("bLogo").value = url;
        toast("Brand logo uploaded!");
      }
    } catch (err) {
      toast(err.message, false);
    }
  });

  document.getElementById("catForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/api/admin/catalog/categories", {
        method: "POST",
        body: JSON.stringify({
          id: state.editingCategoryId || undefined,
          titleEn: document.getElementById("cTitle").value,
          titleBn: document.getElementById("cTitleBn").value,
          description: document.getElementById("cDesc").value,
          emoji: document.getElementById("cEmoji").value,
          badgeText: document.getElementById("cBadge").value,
          imageUrl: document.getElementById("cImg").value,
          subcategories: document.getElementById("cSubs").value.split(",").map((s) => s.trim()).filter(Boolean),
          orderIndex: Number(document.getElementById("cOrder").value),
          enabled: document.getElementById("cEnabled").checked,
        }),
      });
      state.editingCategoryId = null;
      toast("Category saved!");
      loadTab("categories");
    } catch (err) {
      toast(err.message, false);
    }
  });

  document.getElementById("brandForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/api/admin/catalog/brands", {
        method: "POST",
        body: JSON.stringify({
          id: state.editingBrandId || undefined,
          name: document.getElementById("bName").value,
          tagline: document.getElementById("bTagline").value,
          logoUrl: document.getElementById("bLogo").value,
        }),
      });
      state.editingBrandId = null;
      toast("Brand saved!");
      loadTab("categories");
    } catch (err) {
      toast(err.message, false);
    }
  });
}

window.editCategory = (id) => {
  state.editingCategoryId = id;
  renderCategories(document.getElementById("workspace"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};
window.cancelEditCategory = () => {
  state.editingCategoryId = null;
  renderCategories(document.getElementById("workspace"));
};
window.editBrand = (id) => {
  state.editingBrandId = id;
  renderCategories(document.getElementById("workspace"));
};
window.cancelEditBrand = () => {
  state.editingBrandId = null;
  renderCategories(document.getElementById("workspace"));
};

window.deleteCategory = async (id) => {
  const ok = await showConfirmModal({
    title: "Delete Category",
    message: `Delete category "${id}"?`,
    confirmText: "Check & Delete",
  });
  if (!ok) return;
  try {
    const res = await fetch(`${API_BASE}/api/admin/catalog/categories/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 409) {
      const others = state.categories.filter((c) => c.id !== id);
      openModal(`
        <div class="card-header">
          <h3>Category Has ${data.productCount || 0} Product(s)</h3>
          <button type="button" class="icon-btn" onclick="closeModal()">✕</button>
        </div>
        <p class="small muted" style="margin-bottom:14px;">${escHtml(data.error)}</p>
        ${
          others.length
            ? `<label style="margin-bottom:12px;">
                <span>Reassign products to:</span>
                <select id="reassignCatSelect">
                  ${others.map((c) => `<option value="${escHtml(c.id)}">${escHtml(c.titleEn || c.id)}</option>`).join("")}
                </select>
              </label>`
            : ""
        }
        <div class="badge-row" style="justify-content:flex-end;">
          <button type="button" class="btn-outline small" onclick="closeModal()">Cancel</button>
          ${others.length ? `<button type="button" class="btn-neon small" id="confirmReassignDelBtn">Move Products & Delete</button>` : ""}
          <button type="button" class="btn-danger small" id="confirmForceDelBtn">Force Delete Only Category</button>
        </div>
      `);
      document.getElementById("confirmReassignDelBtn")?.addEventListener("click", async () => {
        const target = document.getElementById("reassignCatSelect").value;
        try {
          await api(`/api/admin/catalog/categories/${encodeURIComponent(id)}?reassignTo=${encodeURIComponent(target)}`, {
            method: "DELETE",
          });
          closeModal();
          toast("Products reassigned & category deleted!");
          loadTab("categories");
        } catch (e) {
          toast(e.message, false);
        }
      });
      document.getElementById("confirmForceDelBtn")?.addEventListener("click", async () => {
        try {
          await api(`/api/admin/catalog/categories/${encodeURIComponent(id)}?force=true`, { method: "DELETE" });
          closeModal();
          toast("Category deleted.");
          loadTab("categories");
        } catch (e) {
          toast(e.message, false);
        }
      });
      return;
    }
    if (!res.ok) throw new Error(data.error || "Delete failed.");
    if (state.editingCategoryId === id) state.editingCategoryId = null;
    toast("Category deleted.");
    loadTab("categories");
  } catch (err) {
    toast(err.message, false);
  }
};

window.deleteBrand = async (id) => {
  const ok = await showConfirmModal({
    title: "Delete Brand",
    message: `Remove brand "${id}"?`,
    confirmText: "Delete Brand",
  });
  if (!ok) return;
  try {
    await api(`/api/admin/catalog/brands/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (state.editingBrandId === id) state.editingBrandId = null;
    toast("Brand deleted.");
    loadTab("categories");
  } catch (err) {
    toast(err.message, false);
  }
};

// ======================== 4. ORDERS & INVOICES ========================

function buildOrdersCsvUrl() {
  const p = new URLSearchParams();
  if (state.orderStatusFilter && state.orderStatusFilter !== "ALL") p.set("status", state.orderStatusFilter);
  if (state.orderDateFrom) p.set("dateFrom", state.orderDateFrom);
  if (state.orderDateTo) p.set("dateTo", state.orderDateTo);
  const qs = p.toString();
  return `/api/admin/orders/export/csv${qs ? `?${qs}` : ""}`;
}

function renderOrders(ws) {
  const statuses = ["Pending", "Confirmed", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Returned", "Refunded"];
  const filterTabs = ["ALL", "Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];

  ws.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>All Customer Orders (${state.orders.length})</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <input id="orderSearchInput" placeholder="Search order #, address, tracking…" value="${escHtml(state.orderQuery)}" style="max-width:210px;" />
          <input id="orderDateFromInput" type="date" value="${escHtml(state.orderDateFrom)}" title="Date From" style="width:auto;" />
          <input id="orderDateToInput" type="date" value="${escHtml(state.orderDateTo)}" title="Date To" style="width:auto;" />
          <button type="button" class="btn-outline small" id="applyOrderDatesBtn">Filter Dates</button>
          <button type="button" class="btn-neon small" id="exportOrdersCsvBtn">⬇ Export Orders CSV</button>
        </div>
      </div>
      <div class="filter-bar">
        ${filterTabs
          .map(
            (st) => `<button type="button" class="filter-chip ${state.orderStatusFilter === st ? "active" : ""}" data-order-filter="${st}">${st}</button>`
          )
          .join("")}
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Order #</th><th>Summary</th><th>Total</th><th>Payment</th><th>Status & Tracking</th><th>Actions</th></tr></thead>
          <tbody id="ordersTableBody"></tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("exportOrdersCsvBtn").onclick = () => {
    downloadFileFromApi(buildOrdersCsvUrl(), `myshop-orders-${Date.now()}.csv`);
  };
  document.getElementById("applyOrderDatesBtn").onclick = () => {
    state.orderDateFrom = document.getElementById("orderDateFromInput").value;
    state.orderDateTo = document.getElementById("orderDateToInput").value;
    loadTab("orders");
  };

  const renderOrderRows = () => {
    const q = String(state.orderQuery || "").trim().toLowerCase();
    const stFilter = state.orderStatusFilter || "ALL";
    const rows = state.orders.filter((o) => {
      if (stFilter !== "ALL" && o.orderStatus !== stFilter) return false;
      if (q && !`${o.orderNumber} ${o.itemsSummary} ${o.shippingAddress} ${o.trackingCode}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const tbody = document.getElementById("ordersTableBody");
    if (!tbody) return;
    tbody.innerHTML =
      rows
        .map(
          (o) => `
        <tr>
          <td><strong>${escHtml(o.orderNumber)}</strong><br>${statusBadge(o.orderStatus)}</td>
          <td>${escHtml(o.itemsSummary)}<br><small class="muted">${escHtml(o.shippingAddress)}</small></td>
          <td><strong>${money(o.totalAmount)}</strong></td>
          <td>${escHtml(o.paymentMethod)}<br><small class="muted">${escHtml(o.paymentStatus)}</small></td>
          <td style="min-width:170px;">
            <select id="ost_${escHtml(o.id)}" style="margin-bottom:4px;">
              ${statuses.map((st) => `<option ${o.orderStatus === st ? "selected" : ""}>${st}</option>`).join("")}
            </select>
            <input id="otrk_${escHtml(o.id)}" placeholder="Tracking code" value="${escHtml(o.trackingCode || "")}" style="padding:5px 8px;font-size:0.78rem;" />
          </td>
          <td style="display:flex;gap:6px;flex-wrap:wrap;">
            <button type="button" class="btn-neon small" onclick="updateOrderStatus('${escHtml(o.userId)}','${escHtml(o.id)}')">Save</button>
            <button type="button" class="btn-outline small" onclick="openEditOrderModal('${escHtml(o.userId)}','${escHtml(o.id)}')">Edit</button>
            <button type="button" class="btn-outline small" onclick="viewOrderItems('${escHtml(o.userId)}','${escHtml(o.id)}')">Items</button>
            <button type="button" class="btn-outline small" onclick="printInvoice('${escHtml(o.userId)}','${escHtml(o.id)}')">Invoice</button>
          </td>
        </tr>`
        )
        .join("") || `<tr><td colspan="6" class="muted">No matching orders found.</td></tr>`;
  };

  renderOrderRows();

  document.getElementById("orderSearchInput").addEventListener("input", (e) => {
    state.orderQuery = e.target.value;
    renderOrderRows();
  });
  ws.querySelectorAll("[data-order-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.orderStatusFilter = btn.getAttribute("data-order-filter") || "ALL";
      ws.querySelectorAll("[data-order-filter]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderOrderRows();
    });
  });
}

window.openEditOrderModal = (userId, orderId) => {
  const o = state.orders.find((x) => x.id === orderId && x.userId === userId);
  if (!o) return;
  const statuses = ["Pending", "Confirmed", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Returned", "Refunded"];
  openModal(`
    <div class="card-header">
      <h3>Edit Order ${escHtml(o.orderNumber)}</h3>
      <button type="button" class="icon-btn" onclick="closeModal()">✕</button>
    </div>
    <form id="editOrderModalForm" class="stack-form">
      <label>
        <span>Order Status</span>
        <select id="eomStatus">
          ${statuses.map((st) => `<option ${o.orderStatus === st ? "selected" : ""}>${st}</option>`).join("")}
        </select>
      </label>
      <label><span>Tracking Code</span><input id="eomTrack" value="${escHtml(o.trackingCode || "")}" placeholder="e.g. MYS-TRK-9021" /></label>
      <label><span>Shipping Address</span><textarea id="eomAddr" rows="2" required>${escHtml(o.shippingAddress || "")}</textarea></label>
      <label><span>Internal Admin Note</span><textarea id="eomNote" rows="2" placeholder="Delivery instructions or verification note…">${escHtml(o.adminNote || "")}</textarea></label>
      <div class="badge-row" style="justify-content:flex-end;">
        <button type="button" class="btn-outline small" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn-neon small">Save Order Changes</button>
      </div>
    </form>
  `);
  document.getElementById("editOrderModalForm").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api(`/api/admin/orders/${encodeURIComponent(userId)}/${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          orderStatus: document.getElementById("eomStatus").value,
          trackingCode: document.getElementById("eomTrack").value,
          shippingAddress: document.getElementById("eomAddr").value,
          adminNote: document.getElementById("eomNote").value,
        }),
      });
      closeModal();
      toast("Order updated and synced to customer!");
      loadTab("orders");
    } catch (err) {
      toast(err.message, false);
    }
  };
};

window.viewOrderItems = (userId, orderId) => {
  const o = state.orders.find((x) => x.id === orderId && x.userId === userId);
  if (!o) return;
  const items = Array.isArray(o.items) ? o.items : [];
  openModal(`
    <div class="card-header">
      <div>
        <h3>Order ${escHtml(o.orderNumber)}</h3>
        <small class="muted">${escHtml(o.createdAt || "")}</small>
      </div>
      <button type="button" class="icon-btn" onclick="closeModal()">✕</button>
    </div>
    <p class="small" style="margin-bottom:8px;"><strong>Ship to:</strong> ${escHtml(o.shippingAddress)}</p>
    <p class="small" style="margin-bottom:12px;"><strong>Payment:</strong> ${escHtml(o.paymentMethod)} (${escHtml(o.paymentStatus)}) ${o.couponCode ? `• Coupon: ${escHtml(o.couponCode)}` : ""}</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Item</th><th>Variant</th><th>Qty</th><th>Price</th></tr></thead>
        <tbody>
          ${
            items.length
              ? items
                  .map(
                    (it) => `<tr>
                  <td><strong>${escHtml(it.productName || it.name)}</strong></td>
                  <td><small class="muted">${escHtml([it.selectedColor, it.selectedSize].filter(Boolean).join(" / ") || "Standard")}</small></td>
                  <td>${it.quantity || it.qty || 1}</td>
                  <td>${money((it.unitPrice || it.price || 0) * (it.quantity || it.qty || 1))}</td>
                </tr>`
                  )
                  .join("")
              : `<tr><td colspan="4">${escHtml(o.itemsSummary || "No item breakdown stored.")}</td></tr>`
          }
        </tbody>
      </table>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:14px;padding-top:10px;border-top:1px solid var(--border-glass);">
      <span class="muted">Delivery: ${money(o.deliveryFee || 0)} • Discount: -${money(o.discountAmount || 0)}</span>
      <strong style="font-size:1.1rem;">Total: ${money(o.totalAmount)}</strong>
    </div>
  `);
};

window.updateOrderStatus = async (userId, orderId) => {
  const orderStatus = document.getElementById(`ost_${orderId}`).value;
  const trackingCode = document.getElementById(`otrk_${orderId}`)?.value.trim() || "";
  try {
    await api(`/api/admin/orders/${encodeURIComponent(userId)}/${encodeURIComponent(orderId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ orderStatus, trackingCode }),
    });
    toast(`Order updated to ${orderStatus} and synced to Customer Panel!`);
    loadTab("orders");
  } catch (err) {
    toast(err.message, false);
  }
};

window.printInvoice = async (userId, orderId) => {
  try {
    const res = await api(`/api/admin/orders/${encodeURIComponent(userId)}/${encodeURIComponent(orderId)}/invoice`);
    const win = window.open("", "_blank");
    if (win && win.document) {
      win.document.write(res.html);
      win.document.close();
      win.focus();
      win.print();
      return;
    }
    // Safe fallback if browser blocks popups
    openModal(`
      <div class="card-header">
        <h3>Invoice ${escHtml(res.orderNumber || orderId)}</h3>
        <button type="button" class="icon-btn" onclick="closeModal()">✕</button>
      </div>
      <div id="inlineInvoiceBox" style="background:#fff;color:#0f172a;border-radius:12px;padding:12px;max-height:58vh;overflow:auto;"></div>
      <div class="badge-row" style="justify-content:flex-end;margin-top:12px;">
        <button type="button" class="btn-outline small" id="downloadInvoiceHtmlBtn">⬇ Download HTML Invoice</button>
        <button type="button" class="btn-neon small" onclick="closeModal()">Done</button>
      </div>
    `);
    const frame = document.createElement("iframe");
    frame.style.cssText = "width:100%;height:420px;border:none;border-radius:8px;background:#fff;";
    frame.srcdoc = res.html;
    document.getElementById("inlineInvoiceBox").appendChild(frame);
    document.getElementById("downloadInvoiceHtmlBtn").onclick = () => {
      const blob = new Blob([res.html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${res.orderNumber || orderId}.html`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    };
  } catch (err) {
    toast(err.message, false);
  }
};

// ======================== 5. CUSTOMERS & SUPPORT ========================

function renderCustomers(ws) {
  ws.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>Registered MY Shop Customers (${state.customers.length})</h3>
        <div class="filter-bar" style="margin:0;">
          <input id="custSearchInput" placeholder="Search name, email, phone…" value="${escHtml(state.customerQuery)}" style="max-width:220px;" />
          <select id="custStatusFilter" style="max-width:140px;">
            <option value="all" ${state.customerStatusFilter === "all" ? "selected" : ""}>All Status</option>
            <option value="active" ${state.customerStatusFilter === "active" ? "selected" : ""}>Active</option>
            <option value="suspended" ${state.customerStatusFilter === "suspended" ? "selected" : ""}>Suspended</option>
          </select>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Customer</th><th>Email & Phone</th><th>Points / Wallet</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="customersTableBody"></tbody>
        </table>
      </div>
    </div>
    <div id="customerDetailCard"></div>
  `;

  const renderCustRows = () => {
    const q = String(state.customerQuery || "").trim().toLowerCase();
    const st = state.customerStatusFilter || "all";
    const rows = state.customers.filter((c) => {
      if (st === "active" && c.suspended) return false;
      if (st === "suspended" && !c.suspended) return false;
      if (q && !`${c.displayName} ${c.email} ${c.phone}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const tbody = document.getElementById("customersTableBody");
    if (!tbody) return;
    tbody.innerHTML =
      rows
        .map(
          (c) => `
        <tr>
          <td><strong>${escHtml(c.displayName)}</strong></td>
          <td>${escHtml(c.email)}<br><small class="muted">${escHtml(c.phone || "No phone")}</small></td>
          <td>${c.points} pts<br><small class="muted">${money(c.walletBalance || 0)}</small></td>
          <td><small class="muted">${escHtml(c.createdAt ? String(c.createdAt).slice(0, 10) : "—")}</small></td>
          <td>${c.suspended ? statusBadge("Suspended") : statusBadge("Active")}</td>
          <td style="display:flex;gap:6px;flex-wrap:wrap;">
            <button type="button" class="btn-outline small" onclick="viewCustomerDetail('${escHtml(c.userId)}')">Profile & Edit</button>
            <button type="button" class="${c.suspended ? "btn-neon" : "btn-danger"} small" onclick="toggleSuspend('${escHtml(c.userId)}', ${!c.suspended})">
              ${c.suspended ? "Restore" : "Suspend"}
            </button>
          </td>
        </tr>`
        )
        .join("") || `<tr><td colspan="6" class="muted">No customers match this filter.</td></tr>`;
  };

  renderCustRows();

  document.getElementById("custSearchInput").addEventListener("input", (e) => {
    state.customerQuery = e.target.value;
    renderCustRows();
  });
  document.getElementById("custStatusFilter").addEventListener("change", (e) => {
    state.customerStatusFilter = e.target.value;
    renderCustRows();
  });
}

window.toggleSuspend = async (uid, suspended) => {
  try {
    await api(`/api/admin/customers/${encodeURIComponent(uid)}/suspend`, {
      method: "PATCH",
      body: JSON.stringify({ suspended }),
    });
    toast(suspended ? "Account suspended." : "Account restored.");
    loadTab("customers");
  } catch (err) {
    toast(err.message, false);
  }
};

window.viewCustomerDetail = async (uid) => {
  try {
    const d = await api(`/api/admin/customers/${encodeURIComponent(uid)}`);
    const c = d.customer || {};
    document.getElementById("customerDetailCard").innerHTML = `
      <div class="two-col">
        <div class="card">
          <h3>Customer Insights: ${escHtml(c.displayName)}</h3>
          <p class="muted small" style="margin:6px 0 12px;">
            ${escHtml(c.email)} • Orders: <strong>${d.ordersCount ?? d.orders.length}</strong> • Total Spent: <strong>${money(d.totalSpent || 0)}</strong> • Addresses: ${d.addresses.length}
          </p>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Order #</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                ${(d.orders || []).slice(0, 6).map((o) => `<tr><td>${escHtml(o.orderNumber)}</td><td>${money(o.totalAmount)}</td><td>${statusBadge(o.orderStatus)}</td></tr>`).join("") || `<tr><td colspan="3" class="muted">No orders placed yet.</td></tr>`}
              </tbody>
            </table>
          </div>
          ${(d.supportTickets || [])
            .map(
              (t) => `<div class="card" style="margin-top:8px;"><strong>${escHtml(t.subject)}</strong> ${statusBadge(t.status)}<p class="muted small" style="margin:4px 0;">${escHtml(t.message)}</p>
                <button type="button" class="btn-neon small" onclick="resolveTicket('${escHtml(uid)}','${escHtml(t.id)}')">Reply & Resolve</button></div>`
            )
            .join("")}
        </div>

        <div class="card">
          <h3>Edit Customer Profile</h3>
          <form id="editCustomerForm" class="stack-form" style="margin-top:10px;">
            <label><span>Full Name</span><input id="ecName" value="${escHtml(c.displayName || "")}" required /></label>
            <label><span>Phone</span><input id="ecPhone" value="${escHtml(c.phone || "")}" /></label>
            <div class="form-grid">
              <label><span>MY Points</span><input id="ecPoints" type="number" min="0" value="${Number(c.points || 0)}" /></label>
              <label><span>Wallet Balance (৳)</span><input id="ecWallet" type="number" min="0" value="${Number(c.walletBalance || 0)}" /></label>
            </div>
            <label style="flex-direction:row;align-items:center;gap:8px;">
              <input type="checkbox" id="ecSuspended" ${c.suspended ? "checked" : ""} style="width:auto;" />
              <span>Account Suspended</span>
            </label>
            <button type="submit" class="btn-neon">Save Customer Profile</button>
          </form>
        </div>
      </div>`;

    document.getElementById("editCustomerForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await api(`/api/admin/customers/${encodeURIComponent(uid)}`, {
          method: "PATCH",
          body: JSON.stringify({
            displayName: document.getElementById("ecName").value.trim(),
            phone: document.getElementById("ecPhone").value.trim(),
            points: Number(document.getElementById("ecPoints").value || 0),
            walletBalance: Number(document.getElementById("ecWallet").value || 0),
            suspended: document.getElementById("ecSuspended").checked,
          }),
        });
        toast("Customer profile updated!");
        await loadTab("customers");
        await viewCustomerDetail(uid);
      } catch (err) {
        toast(err.message, false);
      }
    });
  } catch (err) {
    toast(err.message, false);
  }
};

window.resolveTicket = async (uid, tid) => {
  const reply = await showPromptModal({
    title: "Resolve Support Ticket",
    label: "Support Response Sent to Customer",
    defaultValue: "Resolved by MY Shop Support.",
    confirmText: "Resolve & Notify",
  });
  if (!reply) return;
  try {
    await api(`/api/admin/customers/${encodeURIComponent(uid)}/tickets/${encodeURIComponent(tid)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "Resolved", reply }),
    });
    toast("Support ticket resolved & customer notified!");
    viewCustomerDetail(uid);
  } catch (err) {
    toast(err.message, false);
  }
};

// ======================== 6. PAYMENTS & DELIVERY SUMMARY ========================

function renderPayments(ws) {
  const ps = state.payments.paymentSettings || {};
  const txs = state.payments.transactions || [];
  ws.innerHTML = `
    <div class="two-col">
      <div class="card">
        <h3>Gateway Enable / Disable Settings</h3>
        <div class="form-grid" style="margin:12px 0;">
          ${["bKash", "Nagad", "Rocket", "Visa", "Mastercard", "CashOnDelivery"]
            .map(
              (m) => `<label style="flex-direction:row;align-items:center;gap:8px;">
                <input type="checkbox" id="pm_${m}" ${ps[m]?.enabled !== false ? "checked" : ""} style="width:auto;" />
                <span>${m} (${escHtml(ps[m]?.mode || "SANDBOX")})</span>
              </label>`
            )
            .join("")}
        </div>
        <button type="button" class="btn-neon small" id="savePaymentSettingsBtn">Save Payment Settings</button>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Active Delivery Zones (${state.deliveryZones.length})</h3>
          <button type="button" class="btn-outline small" onclick="loadTab('sellers')">Manage Zones →</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Zone</th><th>Fee</th><th>Free Over</th><th>ETA</th></tr></thead>
            <tbody>
              ${state.deliveryZones
                .slice(0, 5)
                .map((z) => `<tr><td><strong>${escHtml(z.zoneName)}</strong></td><td>${money(z.fee)}</td><td>${money(z.freeThreshold || 2000)}</td><td>${escHtml(z.estimatedDays || "1-3 days")}</td></tr>`)
                .join("") || `<tr><td colspan="4" class="muted">No delivery zones configured yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Payment Transactions (${txs.length})</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Order #</th><th>Method</th><th>Status</th><th>Reference</th><th>Amount</th><th>Actions</th></tr></thead>
          <tbody>
            ${txs
              .map(
                (t) => `<tr>
                  <td>${escHtml(t.orderNumber)}</td>
                  <td>${escHtml(t.paymentMethod)}</td>
                  <td>${statusBadge(t.paymentStatus)}</td>
                  <td><small>${escHtml(t.transactionRef || "—")}</small></td>
                  <td>${money(t.amount)}</td>
                  <td style="display:flex;gap:6px;">
                    <button type="button" class="btn-outline small" onclick="verifyGatewayTx('${escHtml(t.userId)}','${escHtml(t.orderId)}')">Verify</button>
                    ${
                      t.paymentStatus === "PAID_SANDBOX" || t.paymentStatus === "PAID"
                        ? `<button type="button" class="btn-danger small" onclick="refundTx('${escHtml(t.userId)}','${escHtml(t.orderId)}')">Refund</button>`
                        : ""
                    }
                  </td>
                </tr>`
              )
              .join("") || `<tr><td colspan="6" class="muted">No payment transactions yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("savePaymentSettingsBtn").addEventListener("click", async () => {
    const updated = {};
    ["bKash", "Nagad", "Rocket", "Visa", "Mastercard", "CashOnDelivery"].forEach((m) => {
      updated[m] = { ...(ps[m] || {}), enabled: document.getElementById(`pm_${m}`).checked };
    });
    await api("/api/admin/marketing/payments/settings", { method: "PUT", body: JSON.stringify({ paymentSettings: updated }) });
    toast("Payment settings updated.");
  });
}

window.verifyGatewayTx = async (uid, oid) => {
  try {
    const r = await api(`/api/admin/marketing/payments/${encodeURIComponent(uid)}/${encodeURIComponent(oid)}/verify`, {
      method: "POST",
    });
    toast(r.message, r.verified);
  } catch (err) {
    toast(err.message, false);
  }
};

window.refundTx = async (uid, oid) => {
  const ok = await showConfirmModal({
    title: "Issue Refund",
    message: "Issue refund for this verified transaction and notify customer?",
    confirmText: "Process Refund",
  });
  if (!ok) return;
  try {
    await api(`/api/admin/marketing/payments/${encodeURIComponent(uid)}/${encodeURIComponent(oid)}/refund`, {
      method: "POST",
    });
    toast("Refund processed and customer notified.");
    loadTab("payments");
  } catch (err) {
    toast(err.message, false);
  }
};

// ======================== 7. MARKETING, FUN ZONE, AI ========================

function renderMarketing(ws) {
  const editCp = state.coupons.find((c) => c.code === state.editingCouponCode) || null;
  ws.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>${editCp ? `Edit Coupon: ${escHtml(editCp.code)}` : "Create Coupon / Flash Deal / BOGO"}</h3>
        ${editCp ? `<button type="button" class="btn-outline small" onclick="cancelEditCoupon()">New Coupon</button>` : ""}
      </div>
      <form id="couponForm" class="stack-form">
        <div class="form-grid">
          <label><span>Code *</span><input id="cpCode" required value="${escHtml(editCp?.code || "")}" placeholder="NEON20" /></label>
          <label><span>Title *</span><input id="cpTitle" required value="${escHtml(editCp?.title || "")}" placeholder="20% Off Electronics" /></label>
          <label><span>Type</span><select id="cpType">
            <option value="PERCENT" ${!editCp || editCp?.discountType === "PERCENT" ? "selected" : ""}>PERCENT</option>
            <option value="FIXED" ${editCp?.discountType === "FIXED" ? "selected" : ""}>FIXED</option>
            <option value="FREE_DELIVERY" ${editCp?.discountType === "FREE_DELIVERY" ? "selected" : ""}>FREE_DELIVERY</option>
          </select></label>
          <label><span>Value</span><input id="cpVal" type="number" min="0" value="${editCp?.value ?? 20}" /></label>
          <label><span>Min Spend (৳)</span><input id="cpMin" type="number" min="0" value="${editCp?.minSpend ?? 1000}" /></label>
          <label><span>Max Discount Cap (৳)</span><input id="cpMaxDisc" type="number" min="0" value="${editCp?.maxDiscount ?? 0}" /></label>
          <label><span>Usage Limit</span><input id="cpLimit" type="number" min="1" value="${editCp?.usageLimit ?? 1000}" /></label>
          <label><span>Expires Label</span><input id="cpExp" value="${escHtml(editCp?.expiresLabel || "Flash Deal 48h")}" /></label>
          <label><span>Expiration Date (optional)</span><input id="cpExpDate" type="date" value="${escHtml(editCp?.expiresAt ? String(editCp.expiresAt).slice(0, 10) : "")}" /></label>
        </div>
        <div class="badge-row">
          <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="cpActive" ${editCp?.active !== false ? "checked" : ""} style="width:auto;" /> Active</label>
          <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="cpBogo" ${editCp?.bogoEnabled ? "checked" : ""} style="width:auto;" /> BOGO Eligible</label>
        </div>
        <button type="submit" class="btn-neon">${editCp ? "Update Coupon" : "Save Coupon"}</button>
      </form>
      <hr class="divider"/>
      <div class="table-wrap"><table><thead><tr><th>Code</th><th>Title</th><th>Value / Cap</th><th>Usage</th><th>Status</th><th>Expires</th><th>Actions</th></tr></thead><tbody>
        ${state.coupons
          .map(
            (c) => `<tr>
          <td><strong>${escHtml(c.code)}</strong></td>
          <td>${escHtml(c.title)}</td>
          <td>${c.value} (${escHtml(c.discountType)})<br><small class="muted">Min ${money(c.minSpend)}${c.maxDiscount ? ` • Cap ${money(c.maxDiscount)}` : ""}</small></td>
          <td>${c.usedCount ?? 0} / ${c.usageLimit ?? 1000}</td>
          <td><button type="button" class="toggle-pill ${c.active !== false ? "on" : ""}" onclick="toggleCouponActive('${escHtml(c.code)}', ${c.active !== false})">${c.active !== false ? "🟢 Active" : "⚪ Paused"}</button></td>
          <td><small class="muted">${escHtml(c.expiresAt ? String(c.expiresAt).slice(0, 10) : c.expiresLabel || "Active")}</small></td>
          <td style="display:flex;gap:6px;">
            <button type="button" class="btn-outline small" onclick="editCoupon('${escHtml(c.code)}')">Edit</button>
            <button type="button" class="btn-danger small" onclick="delCoupon('${escHtml(c.code)}')">Delete</button>
          </td>
        </tr>`
          )
          .join("")}
      </tbody></table></div>
    </div>`;

  document.getElementById("couponForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/api/admin/marketing/coupons", {
        method: "POST",
        body: JSON.stringify({
          code: document.getElementById("cpCode").value,
          title: document.getElementById("cpTitle").value,
          discountType: document.getElementById("cpType").value,
          value: Number(document.getElementById("cpVal").value),
          minSpend: Number(document.getElementById("cpMin").value),
          maxDiscount: Number(document.getElementById("cpMaxDisc").value || 0),
          usageLimit: Number(document.getElementById("cpLimit").value || 1000),
          expiresLabel: document.getElementById("cpExp").value,
          expiresAt: document.getElementById("cpExpDate").value || "",
          active: document.getElementById("cpActive").checked,
          bogoEnabled: document.getElementById("cpBogo").checked,
        }),
      });
      state.editingCouponCode = null;
      toast("Coupon synced to MY Shop Customer Storefront!");
      loadTab("marketing");
    } catch (err) {
      toast(err.message, false);
    }
  });
}

window.toggleCouponActive = async (code, current) => {
  try {
    await api(`/api/admin/marketing/coupons/${encodeURIComponent(code)}/toggle`, {
      method: "PATCH",
      body: JSON.stringify({ active: !current }),
    });
    toast(`Coupon ${code} ${!current ? "activated" : "paused"}.`);
    loadTab("marketing");
  } catch (err) {
    toast(err.message, false);
  }
};
window.editCoupon = (code) => {
  state.editingCouponCode = code;
  renderMarketing(document.getElementById("workspace"));
};
window.cancelEditCoupon = () => {
  state.editingCouponCode = null;
  renderMarketing(document.getElementById("workspace"));
};
window.delCoupon = async (code) => {
  const ok = await showConfirmModal({
    title: "Delete Coupon",
    message: `Permanently delete coupon "${code}"?`,
    confirmText: "Delete Coupon",
  });
  if (!ok) return;
  try {
    await api(`/api/admin/marketing/coupons/${encodeURIComponent(code)}`, { method: "DELETE" });
    if (state.editingCouponCode === code) state.editingCouponCode = null;
    toast("Coupon deleted.");
    loadTab("marketing");
  } catch (err) {
    toast(err.message, false);
  }
};

function renderFunZone(ws) {
  const f = state.funZone || {};
  ws.innerHTML = `<div class="card"><h3>MY Fun Zone Reward Rules & Feature Toggles</h3><form id="fzForm" class="stack-form">
    <div class="badge-row" style="gap:16px;">
      <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="fzSpinEn" ${f.spinEnabled !== false ? "checked" : ""} style="width:auto;" /> Spin Wheel Enabled</label>
      <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="fzScratchEn" ${f.scratchEnabled !== false ? "checked" : ""} style="width:auto;" /> Scratch Card Enabled</label>
      <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="fzTreasureEn" ${f.treasureEnabled !== false ? "checked" : ""} style="width:auto;" /> Treasure Hunt Enabled</label>
      <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="fzQuizEn" ${f.quizEnabled !== false ? "checked" : ""} style="width:auto;" /> Trivia Quiz Enabled</label>
      <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="fzFunnyEn" ${f.funnyZoneEnabled !== false ? "checked" : ""} style="width:auto;" /> Funny Zone Enabled</label>
    </div>
    <div class="form-grid">
      <label><span>Daily Spin Limit</span><input id="fzSpinLim" type="number" min="1" max="5" value="${f.dailySpinLimit ?? 1}"/></label>
      <label><span>Daily Scratch Limit</span><input id="fzScratchLim" type="number" min="1" max="5" value="${f.dailyScratchLimit ?? 1}"/></label>
      <label><span>Streak Base Points</span><input id="fzStreak" type="number" value="${f.streakPointsBase ?? 25}"/></label>
      <label><span>Referral Bonus Points</span><input id="fzRef" type="number" value="${f.referralBonusPoints ?? 200}"/></label>
      <label><span>Reward Expiry (Days)</span><input id="fzExpDays" type="number" min="1" max="365" value="${f.expiryDays ?? 7}"/></label>
    </div>
    <button type="submit" class="btn-neon">Save Fun Zone Rules</button>
  </form></div>`;
  document.getElementById("fzForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/api/admin/marketing/fun-zone", {
        method: "PUT",
        body: JSON.stringify({
          spinEnabled: document.getElementById("fzSpinEn").checked,
          scratchEnabled: document.getElementById("fzScratchEn").checked,
          treasureEnabled: document.getElementById("fzTreasureEn").checked,
          quizEnabled: document.getElementById("fzQuizEn").checked,
          funnyZoneEnabled: document.getElementById("fzFunnyEn").checked,
          dailySpinLimit: Number(document.getElementById("fzSpinLim").value),
          dailyScratchLimit: Number(document.getElementById("fzScratchLim").value),
          streakPointsBase: Number(document.getElementById("fzStreak").value),
          referralBonusPoints: Number(document.getElementById("fzRef").value),
          expiryDays: Number(document.getElementById("fzExpDays").value),
        }),
      });
      toast("Fun Zone rules saved!");
    } catch (err) {
      toast(err.message, false);
    }
  });
}

function renderAiSettings(ws) {
  const a = state.aiSettings || {};
  const promptsVal = Array.isArray(a.suggestedPrompts) ? a.suggestedPrompts.join("\n") : "";
  ws.innerHTML = `<div class="card"><h3>AI Shopping Assistant Configuration</h3><form id="aiForm" class="stack-form">
    <label style="flex-direction:row;align-items:center;gap:8px;"><input type="checkbox" id="aiEnabled" ${a.enabled !== false ? "checked" : ""} style="width:auto;" /> Enable MY AI Shopping Assistant</label>
    <div class="form-grid">
      <label><span>Assistant Name</span><input id="aiName" value="${escHtml(a.assistantName || "MY AI Shopping Assistant")}" /></label>
      <label><span>Model Name</span><input id="aiModel" value="${escHtml(a.modelName || "gemini-3.8-flash")}" /></label>
    </div>
    <label><span>Welcome Message</span><textarea id="aiWelcome" rows="2">${escHtml(a.welcomeMessage || "")}</textarea></label>
    <label><span>Suggested Quick Prompts (one per line)</span><textarea id="aiPrompts" rows="4">${escHtml(promptsVal)}</textarea></label>
    <label><span>Recommendation Rules</span><textarea id="aiRules" rows="2">${escHtml(a.recommendationRule || "")}</textarea></label>
    <button type="submit" class="btn-neon">Save AI Settings</button>
  </form></div>`;
  document.getElementById("aiForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/api/admin/marketing/ai-settings", {
        method: "PUT",
        body: JSON.stringify({
          enabled: document.getElementById("aiEnabled").checked,
          assistantName: document.getElementById("aiName").value,
          welcomeMessage: document.getElementById("aiWelcome").value,
          modelName: document.getElementById("aiModel").value,
          suggestedPrompts: document.getElementById("aiPrompts").value.split("\n").map((s) => s.trim()).filter(Boolean),
          recommendationRule: document.getElementById("aiRules").value,
        }),
      });
      toast("AI Settings saved!");
    } catch (err) {
      toast(err.message, false);
    }
  });
}

// ======================== 8. DEDICATED BANNERS & HOMEPAGE MANAGER ========================

function renderBannersHomepage(ws) {
  const s = state.siteConfig || {};
  const banners = Array.isArray(s.banners) ? s.banners : [];
  const sections = Array.isArray(s.homepageSections) ? [...s.homepageSections].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)) : [];
  const editBan = banners.find((b) => b.id === state.editingBannerId) || null;

  ws.innerHTML = `
    <div class="two-col">
      <div class="card">
        <div class="card-header">
          <h3>${editBan ? `Edit Banner: ${escHtml(editBan.title)}` : "Add Storefront Hero / Promo Banner"}</h3>
          ${editBan ? `<button type="button" class="btn-outline small" onclick="cancelEditBanner()">New Banner</button>` : ""}
        </div>
        <form id="bannerForm" class="stack-form">
          <div class="form-grid">
            <label><span>Banner Title *</span><input id="banTitle" required value="${escHtml(editBan?.title || "")}" placeholder="Eid Mega Tech Drop" /></label>
            <label><span>Badge Label</span><input id="banBadge" value="${escHtml(editBan?.badge || "✨ FEATURED DROP")}" placeholder="⚡ LIMITED DEAL" /></label>
            <label><span>CTA Button Text</span><input id="banCta" value="${escHtml(editBan?.ctaText || "Shop Now →")}" /></label>
            <label><span>Destination Link / Route</span><input id="banLink" value="${escHtml(editBan?.linkUrl || "#catalog")}" placeholder="#catalog, /deals, or https://..." /></label>
            <label><span>Start Date (optional)</span><input id="banStart" type="date" value="${escHtml(editBan?.startDate || "")}" /></label>
            <label><span>End Date (optional)</span><input id="banEnd" type="date" value="${escHtml(editBan?.endDate || "")}" /></label>
          </div>
          <label><span>Subtitle</span><input id="banSub" value="${escHtml(editBan?.subtitle || "")}" placeholder="Up to 35% off smartphones & audio gear" /></label>
          <div class="form-grid">
            <label><span>Desktop Image URL</span><input id="banImg" value="${escHtml(editBan?.imageUrl || "")}" placeholder="https://... or /uploads/..." /></label>
            <div style="display:flex;align-items:flex-end;">
              <input type="file" id="banImgUpload" accept="image/jpeg,image/png,image/webp" class="hidden" />
              <button type="button" class="btn-outline small" onclick="document.getElementById('banImgUpload').click()">📷 Upload Desktop</button>
            </div>
          </div>
          <div class="form-grid">
            <label><span>Mobile Image URL (optional)</span><input id="banMobImg" value="${escHtml(editBan?.mobileImageUrl || "")}" placeholder="Optional mobile crop URL" /></label>
            <div style="display:flex;align-items:flex-end;">
              <input type="file" id="banMobUpload" accept="image/jpeg,image/png,image/webp" class="hidden" />
              <button type="button" class="btn-outline small" onclick="document.getElementById('banMobUpload').click()">📱 Upload Mobile</button>
            </div>
          </div>
          <div class="badge-row" style="gap:16px;">
            <label style="flex-direction:row;align-items:center;gap:6px;">
              <input type="checkbox" id="banActive" ${editBan?.active !== false ? "checked" : ""} style="width:auto;" />
              <span>Active on Storefront</span>
            </label>
            <label style="flex-direction:row;align-items:center;gap:6px;">
              <input type="checkbox" id="banReplaceHero" ${editBan?.replaceHero ? "checked" : ""} style="width:auto;" />
              <span>Lead Hero First (Replace Default Slide #1)</span>
            </label>
          </div>
          <button type="submit" class="btn-neon">${editBan ? "Update Banner" : "Publish Banner to Storefront"}</button>
        </form>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3>Homepage Sections Manager</h3>
            <small class="muted">Toggle visibility or reorder sections shown on /</small>
          </div>
          <button type="button" class="btn-neon small" id="saveSectionsOrderBtn">Save Sections</button>
        </div>
        <div id="homepageSectionsList" class="stack-form">
          ${sections
            .map(
              (sec, idx) => `
            <div class="platform-editor-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;">
              <label style="flex-direction:row;align-items:center;gap:8px;color:var(--text-main);">
                <input type="checkbox" data-sec-enable="${escHtml(sec.key)}" ${sec.enabled !== false ? "checked" : ""} style="width:auto;" />
                <span>${escHtml(sec.label || sec.key)}</span>
              </label>
              <div class="badge-row">
                <button type="button" class="btn-outline small" ${idx === 0 ? "disabled" : ""} onclick="moveHomeSection(${idx}, -1)">↑</button>
                <button type="button" class="btn-outline small" ${idx === sections.length - 1 ? "disabled" : ""} onclick="moveHomeSection(${idx}, 1)">↓</button>
              </div>
            </div>`
            )
            .join("") || `<p class="muted">Default homepage layout active.</p>`}
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Active Storefront Banners (${banners.length})</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Order</th><th>Image</th><th>Title & Badge</th><th>Schedule</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${banners
              .map(
                (b, idx) => `
              <tr>
                <td>
                  <div class="badge-row">
                    <button type="button" class="btn-outline small" ${idx === 0 ? "disabled" : ""} onclick="moveBannerOrder(${idx}, -1)">↑</button>
                    <button type="button" class="btn-outline small" ${idx === banners.length - 1 ? "disabled" : ""} onclick="moveBannerOrder(${idx}, 1)">↓</button>
                  </div>
                </td>
                <td>${b.imageUrl ? `<img src="${escHtml(b.imageUrl)}" style="width:72px;height:42px;object-fit:cover;border-radius:8px;" />` : "🎨 Default"}</td>
                <td>
                  <strong>${escHtml(b.title)}</strong> ${b.replaceHero ? `<span class="status-badge badge-shipped">HERO LEAD</span>` : ""}
                  <br><small class="muted">${escHtml(b.badge || "")} • ${escHtml(b.subtitle || "")}</small>
                </td>
                <td><small class="muted">${escHtml(b.startDate || "Always")} → ${escHtml(b.endDate || "∞")}</small></td>
                <td>${b.active !== false ? statusBadge("Active") : statusBadge("Cancelled")}</td>
                <td style="display:flex;gap:6px;flex-wrap:wrap;">
                  <button type="button" class="btn-outline small" onclick="previewBanner('${escHtml(b.id)}')">Preview</button>
                  <button type="button" class="btn-outline small" onclick="editBanner('${escHtml(b.id)}')">Edit</button>
                  <button type="button" class="btn-danger small" onclick="delBanner('${escHtml(b.id)}')">Delete</button>
                </td>
              </tr>`
              )
              .join("") || `<tr><td colspan="6" class="muted">No banners configured yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("banImgUpload").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("folder", "banners");
    fd.append("images", file);
    try {
      toast("Uploading banner artwork…");
      const res = await api("/api/admin/catalog/uploads/images", { method: "POST", body: fd });
      const url = res.images?.[0]?.url || "";
      if (url) {
        document.getElementById("banImg").value = url;
        toast("Desktop banner image uploaded!");
      }
    } catch (err) {
      toast(err.message, false);
    }
  });

  document.getElementById("banMobUpload").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("folder", "banners");
    fd.append("images", file);
    try {
      toast("Uploading mobile banner artwork…");
      const res = await api("/api/admin/catalog/uploads/images", { method: "POST", body: fd });
      const url = res.images?.[0]?.url || "";
      if (url) {
        document.getElementById("banMobImg").value = url;
        toast("Mobile banner image uploaded!");
      }
    } catch (err) {
      toast(err.message, false);
    }
  });

  document.getElementById("bannerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const res = await api("/api/admin/cms/banners", {
        method: "POST",
        body: JSON.stringify({
          id: state.editingBannerId || undefined,
          title: document.getElementById("banTitle").value,
          badge: document.getElementById("banBadge").value,
          ctaText: document.getElementById("banCta").value,
          linkUrl: document.getElementById("banLink").value,
          startDate: document.getElementById("banStart").value,
          endDate: document.getElementById("banEnd").value,
          subtitle: document.getElementById("banSub").value,
          imageUrl: document.getElementById("banImg").value,
          mobileImageUrl: document.getElementById("banMobImg").value,
          replaceHero: document.getElementById("banReplaceHero").checked,
          active: document.getElementById("banActive").checked,
        }),
      });
      state.siteConfig.banners = res.banners || [];
      state.editingBannerId = null;
      toast("Banner saved & synced to Storefront!");
      renderBannersHomepage(ws);
    } catch (err) {
      toast(err.message, false);
    }
  });

  document.getElementById("saveSectionsOrderBtn").addEventListener("click", async () => {
    try {
      const updated = sections.map((sec, idx) => ({
        ...sec,
        sortOrder: idx + 1,
        enabled: Boolean(document.querySelector(`[data-sec-enable="${sec.key}"]`)?.checked),
      }));
      const res = await api("/api/admin/cms/site-config", {
        method: "PUT",
        body: JSON.stringify({ homepageSections: updated }),
      });
      state.siteConfig = { ...state.siteConfig, ...res };
      toast("Homepage section order & visibility saved!");
    } catch (err) {
      toast(err.message, false);
    }
  });
}

window.moveHomeSection = (idx, delta) => {
  const arr = [...(state.siteConfig.homepageSections || [])].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  const target = idx + delta;
  if (target < 0 || target >= arr.length) return;
  [arr[idx], arr[target]] = [arr[target], arr[idx]];
  state.siteConfig.homepageSections = arr.map((s, i) => ({ ...s, sortOrder: i + 1 }));
  renderBannersHomepage(document.getElementById("workspace"));
};

window.moveBannerOrder = async (idx, delta) => {
  const arr = [...(state.siteConfig.banners || [])];
  const target = idx + delta;
  if (target < 0 || target >= arr.length) return;
  [arr[idx], arr[target]] = [arr[target], arr[idx]];
  try {
    const res = await api("/api/admin/cms/banners/reorder", {
      method: "POST",
      body: JSON.stringify({ ids: arr.map((b) => b.id) }),
    });
    state.siteConfig.banners = res.banners || arr;
    toast("Banner order updated!");
    renderBannersHomepage(document.getElementById("workspace"));
  } catch (err) {
    toast(err.message, false);
  }
};

window.previewBanner = (id) => {
  const b = (state.siteConfig.banners || []).find((x) => x.id === id);
  if (!b) return;
  openModal(`
    <div class="card-header">
      <h3>Live Banner Preview</h3>
      <button type="button" class="icon-btn" onclick="closeModal()">✕</button>
    </div>
    <div style="border-radius:18px;padding:22px;background:linear-gradient(135deg,#091747,#101D49);border:1px solid rgba(0,229,255,0.4);">
      <span class="status-badge badge-shipped" style="margin-bottom:10px;">${escHtml(b.badge || "OFFER")}</span>
      <h2 style="margin-bottom:6px;">${escHtml(b.title)}</h2>
      <p class="small muted" style="margin-bottom:12px;">${escHtml(b.subtitle || "")}</p>
      ${b.imageUrl ? `<img src="${escHtml(b.imageUrl)}" style="width:100%;max-height:180px;object-fit:cover;border-radius:12px;margin-bottom:12px;" />` : ""}
      <button type="button" class="btn-neon small">${escHtml(b.ctaText || "Shop Now")}</button>
    </div>
  `);
};

window.editBanner = (id) => {
  state.editingBannerId = id;
  renderBannersHomepage(document.getElementById("workspace"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};
window.cancelEditBanner = () => {
  state.editingBannerId = null;
  renderBannersHomepage(document.getElementById("workspace"));
};
window.delBanner = async (id) => {
  const ok = await showConfirmModal({
    title: "Delete Banner",
    message: "Delete this storefront banner?",
    confirmText: "Delete Banner",
  });
  if (!ok) return;
  try {
    const res = await api(`/api/admin/cms/banners/${encodeURIComponent(id)}`, { method: "DELETE" });
    state.siteConfig.banners = res.banners || [];
    if (state.editingBannerId === id) state.editingBannerId = null;
    toast("Banner deleted.");
    renderBannersHomepage(document.getElementById("workspace"));
  } catch (err) {
    toast(err.message, false);
  }
};

// ======================== 9. WEBSITE & SEO SETTINGS (CMS) ========================

function renderCms(ws) {
  const s = state.siteConfig || {};
  const soc = s.socialLinks || {};

  ws.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3>Website Identity, SEO, Currency & Legal Policies</h3>
          <small class="muted">Saving Website Settings safely preserves all configured Homepage Banners.</small>
        </div>
        <button type="button" class="btn-outline small" onclick="loadTab('banners')">Manage Banners →</button>
      </div>
      <form id="cmsForm" class="stack-form" style="margin-top:10px;">
        <div class="form-grid">
          <label><span>Website Name</span><input id="cmsName" value="${escHtml(s.siteName || "MY Shop")}" /></label>
          <label><span>Tagline</span><input id="cmsTagline" value="${escHtml(s.tagline || "Shop Smart • Live Happy!")}" /></label>
          <label><span>SEO Title</span><input id="cmsSeoTitle" value="${escHtml(s.seoTitle || "")}" placeholder="MY Shop — Future Tech & Lifestyle" /></label>
          <label><span>Currency Symbol</span><input id="cmsCurrency" value="${escHtml(s.currencySymbol || "৳")}" /></label>
          <label><span>Tax Rate (%)</span><input id="cmsTax" type="number" min="0" max="50" step="0.1" value="${Number(s.taxRatePercent || 0)}" /></label>
          <label><span>Default Language</span>
            <select id="cmsLang">
              <option value="EN" ${s.defaultLanguage !== "BN" ? "selected" : ""}>English (EN)</option>
              <option value="BN" ${s.defaultLanguage === "BN" ? "selected" : ""}>বাংলা (BN)</option>
            </select>
          </label>
          <label><span>Default Theme</span>
            <select id="cmsTheme">
              <option value="dark" ${s.defaultTheme !== "light" ? "selected" : ""}>Neon Dark</option>
              <option value="light" ${s.defaultTheme === "light" ? "selected" : ""}>Bright Light</option>
            </select>
          </label>
          <label><span>Primary Color</span><input id="cmsPrimary" type="color" value="${escHtml(s.primaryHex || "#8B20FF")}" style="height:42px;padding:4px;" /></label>
          <label><span>Accent Color</span><input id="cmsAccent" type="color" value="${escHtml(s.accentHex || "#00E5FF")}" style="height:42px;padding:4px;" /></label>
          <label><span>Contact Email</span><input id="cmsEmail" value="${escHtml(s.contactEmail || "")}" /></label>
          <label><span>Contact Phone</span><input id="cmsPhone" value="${escHtml(s.contactPhone || "")}" /></label>
          <label><span>Store Address</span><input id="cmsAddress" value="${escHtml(s.address || "")}" /></label>
        </div>

        <div class="form-grid">
          <label><span>Logo URL</span><input id="cmsLogo" value="${escHtml(s.logoUrl || "")}" /></label>
          <div style="display:flex;align-items:flex-end;">
            <input type="file" id="cmsLogoUpload" accept="image/jpeg,image/png,image/webp" class="hidden" />
            <button type="button" class="btn-outline small" onclick="document.getElementById('cmsLogoUpload').click()">📷 Upload Logo</button>
          </div>
          <label><span>Favicon URL</span><input id="cmsFavicon" value="${escHtml(s.faviconUrl || "")}" /></label>
          <div style="display:flex;align-items:flex-end;">
            <input type="file" id="cmsFavUpload" accept="image/jpeg,image/png,image/webp" class="hidden" />
            <button type="button" class="btn-outline small" onclick="document.getElementById('cmsFavUpload').click()">📷 Upload Favicon</button>
          </div>
        </div>

        <label><span>Website Description</span><textarea id="cmsDesc" rows="2">${escHtml(s.description || "")}</textarea></label>
        <label><span>SEO Meta Description</span><textarea id="cmsSeoDesc" rows="2">${escHtml(s.seoDescription || "")}</textarea></label>

        <div class="form-grid">
          <label><span>Announcement Bar Text</span><input id="cmsAnnounce" value="${escHtml(s.announcementText || "")}" /></label>
          <label><span>Flash Sale Header Message</span><input id="cmsFlashMsg" value="${escHtml(s.flashSaleMessage || "")}" /></label>
          <label><span>Footer Copyright Text</span><input id="cmsFooterText" value="${escHtml(s.footerText || "")}" /></label>
        </div>

        <div class="form-grid">
          <label><span>Facebook URL</span><input id="cmsSocFb" value="${escHtml(soc.facebook || "")}" placeholder="https://facebook.com/..." /></label>
          <label><span>YouTube URL</span><input id="cmsSocYt" value="${escHtml(soc.youtube || "")}" placeholder="https://youtube.com/..." /></label>
          <label><span>TikTok URL</span><input id="cmsSocTt" value="${escHtml(soc.tiktok || "")}" placeholder="https://tiktok.com/..." /></label>
          <label><span>Telegram URL</span><input id="cmsSocTg" value="${escHtml(soc.telegram || "")}" placeholder="https://t.me/..." /></label>
          <label><span>Instagram URL</span><input id="cmsSocIg" value="${escHtml(soc.instagram || "")}" placeholder="https://instagram.com/..." /></label>
        </div>

        <div class="form-grid">
          <label><span>Shipping Policy Info</span><textarea id="cmsShipInfo" rows="2">${escHtml(s.shippingInfo || "")}</textarea></label>
          <label><span>Privacy Policy</span><textarea id="cmsPrivacy" rows="2">${escHtml(s.privacyPolicy || "")}</textarea></label>
          <label><span>Terms & Conditions</span><textarea id="cmsTerms" rows="2">${escHtml(s.termsContent || "")}</textarea></label>
        </div>

        <div class="badge-row" style="gap:18px;">
          <label style="flex-direction:row;gap:8px;align-items:center;"><input type="checkbox" id="cmsAnnActive" ${s.announcementActive !== false ? "checked" : ""} style="width:auto;" /> Announcement Active</label>
          <label style="flex-direction:row;gap:8px;align-items:center;"><input type="checkbox" id="cmsMaint" ${s.maintenanceMode ? "checked" : ""} style="width:auto;" /> Maintenance Mode</label>
        </div>

        <button type="submit" class="btn-neon">Save Website Customization</button>
      </form>
    </div>
  `;

  document.getElementById("cmsLogoUpload").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("folder", "branding");
    fd.append("images", file);
    try {
      const res = await api("/api/admin/catalog/uploads/images", { method: "POST", body: fd });
      const url = res.images?.[0]?.url || "";
      if (url) {
        document.getElementById("cmsLogo").value = url;
        toast("Logo uploaded!");
      }
    } catch (err) {
      toast(err.message, false);
    }
  });

  document.getElementById("cmsFavUpload").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("folder", "branding");
    fd.append("images", file);
    try {
      const res = await api("/api/admin/catalog/uploads/images", { method: "POST", body: fd });
      const url = res.images?.[0]?.url || "";
      if (url) {
        document.getElementById("cmsFavicon").value = url;
        toast("Favicon uploaded!");
      }
    } catch (err) {
      toast(err.message, false);
    }
  });

  document.getElementById("cmsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const saved = await api("/api/admin/cms/site-config", {
        method: "PUT",
        body: JSON.stringify({
          siteName: document.getElementById("cmsName").value,
          tagline: document.getElementById("cmsTagline").value,
          description: document.getElementById("cmsDesc").value,
          seoTitle: document.getElementById("cmsSeoTitle").value,
          seoDescription: document.getElementById("cmsSeoDesc").value,
          currencySymbol: document.getElementById("cmsCurrency").value,
          taxRatePercent: Number(document.getElementById("cmsTax").value || 0),
          defaultLanguage: document.getElementById("cmsLang").value,
          defaultTheme: document.getElementById("cmsTheme").value,
          logoUrl: document.getElementById("cmsLogo").value,
          faviconUrl: document.getElementById("cmsFavicon").value,
          contactEmail: document.getElementById("cmsEmail").value,
          contactPhone: document.getElementById("cmsPhone").value,
          address: document.getElementById("cmsAddress").value,
          primaryHex: document.getElementById("cmsPrimary").value,
          accentHex: document.getElementById("cmsAccent").value,
          announcementText: document.getElementById("cmsAnnounce").value,
          announcementActive: document.getElementById("cmsAnnActive").checked,
          flashSaleMessage: document.getElementById("cmsFlashMsg").value,
          footerText: document.getElementById("cmsFooterText").value,
          shippingInfo: document.getElementById("cmsShipInfo").value,
          privacyPolicy: document.getElementById("cmsPrivacy").value,
          termsContent: document.getElementById("cmsTerms").value,
          maintenanceMode: document.getElementById("cmsMaint").checked,
          socialLinks: {
            facebook: document.getElementById("cmsSocFb").value,
            youtube: document.getElementById("cmsSocYt").value,
            tiktok: document.getElementById("cmsSocTt").value,
            telegram: document.getElementById("cmsSocTg").value,
            instagram: document.getElementById("cmsSocIg").value,
          },
        }),
      });
      state.siteConfig = { ...state.siteConfig, ...saved };
      toast("Website settings saved & synced live!");
    } catch (err) {
      toast(err.message, false);
    }
  });
}

// ======================== 10. SOCIAL SUPPORT & 3D POPUPS ========================

function defaultSocialPlatformsFallback() {
  return [
    { id: "facebook", name: "Facebook Support", subtitle: "Message us on Facebook", url: "", iconUrl: "", colorHex: "#1877F2", enabled: true, sortOrder: 1 },
    { id: "youtube", name: "YouTube Support", subtitle: "Product demos & guides", url: "", iconUrl: "", colorHex: "#FF0000", enabled: true, sortOrder: 2 },
    { id: "tiktok", name: "TikTok Support", subtitle: "Trending flash clips", url: "", iconUrl: "", colorHex: "#FE2C55", enabled: true, sortOrder: 3 },
    { id: "telegram", name: "Telegram Support", subtitle: "Fast VIP community", url: "", iconUrl: "", colorHex: "#26A5E4", enabled: true, sortOrder: 4 },
  ];
}

function platformGlyph(id) {
  switch (id) {
    case "facebook": return "f";
    case "youtube": return "▶";
    case "tiktok": return "♪";
    case "telegram": return "✈";
    default: return "★";
  }
}

function collectSocialSupportForm() {
  const base = state.socialSupport || { platforms: defaultSocialPlatformsFallback() };
  const platforms = (base.platforms || defaultSocialPlatformsFallback()).map((p, idx) => ({
    id: p.id,
    name: document.getElementById(`soc_name_${p.id}`)?.value || p.name,
    subtitle: document.getElementById(`soc_sub_${p.id}`)?.value || "",
    url: document.getElementById(`soc_url_${p.id}`)?.value || "",
    iconUrl: document.getElementById(`soc_icon_${p.id}`)?.value || "",
    colorHex: document.getElementById(`soc_col_${p.id}`)?.value || p.colorHex,
    enabled: Boolean(document.getElementById(`soc_en_${p.id}`)?.checked),
    sortOrder: idx + 1,
  }));

  return {
    enabled: Boolean(document.getElementById("socEnabled")?.checked),
    position: document.getElementById("socPos")?.value || "BOTTOM_RIGHT",
    buttonSize: document.getElementById("socSize")?.value || "MEDIUM",
    animationStyle: document.getElementById("socAnim")?.value || "FLOAT_GLOW",
    primaryHex: document.getElementById("socPrimaryHex")?.value || "#8B5CF6",
    menuBgHex: document.getElementById("socMenuBgHex")?.value || "#140F2A",
    welcomeText: document.getElementById("socWelcomeText")?.value || "",
    platforms,
  };
}

function updateSocialPreviewStage() {
  const stage = document.getElementById("socialPreviewStage");
  if (!stage) return;
  const cfg = collectSocialSupportForm();
  state.socialSupport = cfg;
  stage.className = `preview-stage ${state.previewDevice}`;
  const enabledPlatforms = cfg.platforms.filter((p) => p.enabled);

  stage.innerHTML = `
    <div class="preview-mockup-bar">
      <span>MY Shop (${state.previewDevice === "mobile" ? "Android 390px" : "Desktop 1280px"})</span>
      <span>${cfg.enabled ? "Floating Widget: ON" : "Floating Widget: OFF"}</span>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:8px;opacity:0.48;pointer-events:none;">
      <div style="height:46px;border-radius:12px;background:rgba(139,32,255,0.22);border:1px solid rgba(255,255,255,0.12);"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="height:92px;border-radius:12px;background:rgba(0,229,255,0.12);"></div>
        <div style="height:92px;border-radius:12px;background:rgba(255,46,147,0.12);"></div>
      </div>
    </div>
    ${
      cfg.enabled
        ? `
      <div class="fab-preview-anchor ${escHtml(cfg.position)}">
        ${
          state.previewSocialOpen
            ? `
          <div class="fab-menu-stack" style="background:${escHtml(cfg.menuBgHex)}cc;padding:8px;border-radius:16px;border:1px solid rgba(0,229,255,0.35);">
            ${cfg.welcomeText ? `<small style="color:#cbd5e1;font-size:0.7rem;padding:0 4px;">${escapeIf(cfg.welcomeText)}</small>` : ""}
            ${
              enabledPlatforms
                .map(
                  (p, idx) => `
              <div class="fab-social-pill" style="background:${escHtml(p.colorHex)};animation-delay:${idx * 55}ms;">
                ${p.iconUrl ? `<img src="${escHtml(p.iconUrl)}" style="width:16px;height:16px;border-radius:50%;object-fit:cover;" />` : `<span>${platformGlyph(p.id)}</span>`}
                <span>${escHtml(p.name)}</span>
              </div>`
                )
                .join("") || `<small class="muted">No platforms enabled</small>`
            }
          </div>`
            : ""
        }
        <button type="button" id="toggleSocialPreviewFab" class="fab-main-circle ${escHtml(cfg.buttonSize)} ${state.previewSocialOpen ? "open" : ""}" style="background:linear-gradient(135deg,${escHtml(cfg.primaryHex)},#00E5FF);" title="Click to test + / X animation">+</button>
      </div>`
        : `<div style="text-align:center;padding:12px;"><small class="muted">Floating Support Button is currently disabled.</small></div>`
    }
  `;

  document.getElementById("toggleSocialPreviewFab")?.addEventListener("click", () => {
    state.previewSocialOpen = !state.previewSocialOpen;
    updateSocialPreviewStage();
  });
}

function escapeIf(v) {
  return escHtml(v);
}

function renderSocialSupport(ws) {
  const s = state.socialSupport || {
    enabled: true,
    position: "BOTTOM_RIGHT",
    buttonSize: "MEDIUM",
    animationStyle: "FLOAT_GLOW",
    primaryHex: "#8B5CF6",
    menuBgHex: "#140F2A",
    welcomeText: "Connect with MY Shop Support",
    platforms: defaultSocialPlatformsFallback(),
  };
  const an = state.engagementAnalytics || {};

  ws.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Facebook Clicks</div><div class="kpi-value" style="color:#1877F2;">${an.fbClicks ?? 0}</div></div>
      <div class="kpi-card"><div class="kpi-label">YouTube Clicks</div><div class="kpi-value" style="color:#FF4D4F;">${an.ytClicks ?? 0}</div></div>
      <div class="kpi-card"><div class="kpi-label">TikTok Clicks</div><div class="kpi-value" style="color:#FE2C55;">${an.ttClicks ?? 0}</div></div>
      <div class="kpi-card"><div class="kpi-label">Telegram Clicks</div><div class="kpi-value" style="color:#26A5E4;">${an.tgClicks ?? 0}</div></div>
      <div class="kpi-card"><div class="kpi-label">Total Social Engagement</div><div class="kpi-value">${an.totalSocialClicks ?? 0}</div></div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card-header">
          <div>
            <h3>Floating Social Support Configuration</h3>
            <small class="muted">${state.socialMeta?.hasDraftChanges ? "⚠️ Unpublished draft changes" : state.socialMeta?.hasPublished ? "🟢 Live on MY Shop Storefront" : "Configure URLs & Publish"}</small>
          </div>
          <label style="flex-direction:row;align-items:center;gap:8px;color:var(--text-main);">
            <input type="checkbox" id="socEnabled" ${s.enabled !== false ? "checked" : ""} style="width:auto;" />
            <span>Enable Floating Support</span>
          </label>
        </div>

        <form id="socialSupportForm" class="stack-form">
          <div class="form-grid">
            <label><span>Button Screen Position</span>
              <select id="socPos">
                <option value="BOTTOM_RIGHT" ${s.position === "BOTTOM_RIGHT" ? "selected" : ""}>Bottom Right (Above Nav Bar)</option>
                <option value="MID_RIGHT" ${s.position === "MID_RIGHT" ? "selected" : ""}>Middle Right</option>
                <option value="TOP_RIGHT" ${s.position === "TOP_RIGHT" ? "selected" : ""}>Top Right</option>
              </select>
            </label>
            <label><span>Button Size</span>
              <select id="socSize">
                <option value="COMPACT" ${s.buttonSize === "COMPACT" ? "selected" : ""}>Compact (48dp)</option>
                <option value="MEDIUM" ${s.buttonSize === "MEDIUM" ? "selected" : ""}>Medium (56dp)</option>
                <option value="LARGE" ${s.buttonSize === "LARGE" ? "selected" : ""}>Large (64dp)</option>
              </select>
            </label>
            <label><span>3D Animation Style</span>
              <select id="socAnim">
                <option value="FLOAT_GLOW" ${s.animationStyle === "FLOAT_GLOW" ? "selected" : ""}>Floating Neon Glow</option>
                <option value="PULSE_ORBIT" ${s.animationStyle === "PULSE_ORBIT" ? "selected" : ""}>Pulse Orbit Halo</option>
                <option value="SPRING_3D" ${s.animationStyle === "SPRING_3D" ? "selected" : ""}>3D Spring Bounce</option>
              </select>
            </label>
            <label><span>FAB Primary Color</span><input id="socPrimaryHex" type="color" value="${escHtml(s.primaryHex || "#8B5CF6")}" style="height:42px;padding:4px;" /></label>
            <label><span>Menu Surface Color</span><input id="socMenuBgHex" type="color" value="${escHtml(s.menuBgHex || "#140F2A")}" style="height:42px;padding:4px;" /></label>
            <label><span>Menu Header Text</span><input id="socWelcomeText" value="${escHtml(s.welcomeText || "")}" placeholder="Connect with MY Shop Support" /></label>
          </div>

          <hr class="divider" />
          <h4>Configurable Social Platforms (Facebook, YouTube, TikTok, Telegram)</h4>
          <small class="muted">Enter full https:// URLs or leave blank until ready.</small>

          ${(s.platforms || defaultSocialPlatformsFallback())
            .map(
              (p) => `
            <div class="platform-editor-card">
              <div class="card-header" style="margin-bottom:8px;">
                <strong style="color:${escHtml(p.colorHex)};">${platformGlyph(p.id)} ${escHtml(p.id.toUpperCase())}</strong>
                <label style="flex-direction:row;align-items:center;gap:6px;">
                  <input type="checkbox" id="soc_en_${escHtml(p.id)}" ${p.enabled !== false ? "checked" : ""} style="width:auto;" />
                  <span>Enabled</span>
                </label>
              </div>
              <div class="form-grid">
                <label><span>Platform Name</span><input id="soc_name_${escHtml(p.id)}" value="${escHtml(p.name)}" /></label>
                <label><span>Support Subtitle</span><input id="soc_sub_${escHtml(p.id)}" value="${escHtml(p.subtitle || "")}" /></label>
                <label><span>Destination URL (https://…)</span><input id="soc_url_${escHtml(p.id)}" value="${escHtml(p.url || "")}" placeholder="https://…" /></label>
                <label><span>Button Accent Color</span><input id="soc_col_${escHtml(p.id)}" type="color" value="${escHtml(p.colorHex)}" style="height:42px;padding:4px;" /></label>
                <label><span>Custom Icon / Profile URL</span><input id="soc_icon_${escHtml(p.id)}" value="${escHtml(p.iconUrl || "")}" placeholder="https://… (optional)" /></label>
                <div style="display:flex;align-items:flex-end;gap:6px;">
                  <input type="file" id="soc_file_${escHtml(p.id)}" accept="image/jpeg,image/png,image/webp" class="hidden" />
                  <button type="button" class="btn-outline small" onclick="document.getElementById('soc_file_${escHtml(p.id)}').click()">📷 Upload Custom Icon</button>
                </div>
              </div>
            </div>`
            )
            .join("")}

          <div class="badge-row" style="margin-top:6px;">
            <button type="button" id="saveSocialDraftBtn" class="btn-outline">Save Draft Changes</button>
            <button type="submit" class="btn-neon">🚀 Publish Social Support Live</button>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Live Interactive Preview (+ → X)</h3>
          <div class="badge-row">
            <button type="button" class="btn-outline small" id="socPrevMobileBtn">📱 Mobile</button>
            <button type="button" class="btn-outline small" id="socPrevDesktopBtn">🖥️ Desktop</button>
          </div>
        </div>
        <p class="muted small" style="margin-bottom:10px;">Tap the floating + button inside the preview to test the staggered social support menu.</p>
        <div id="socialPreviewStage" class="preview-stage ${state.previewDevice}"></div>
      </div>
    </div>
  `;

  updateSocialPreviewStage();

  document.getElementById("socPrevMobileBtn").addEventListener("click", () => {
    state.previewDevice = "mobile";
    updateSocialPreviewStage();
  });
  document.getElementById("socPrevDesktopBtn").addEventListener("click", () => {
    state.previewDevice = "desktop";
    updateSocialPreviewStage();
  });

  document.getElementById("socialSupportForm").addEventListener("input", updateSocialPreviewStage);
  document.getElementById("socialSupportForm").addEventListener("change", updateSocialPreviewStage);
  document.getElementById("socEnabled").addEventListener("change", updateSocialPreviewStage);

  (s.platforms || defaultSocialPlatformsFallback()).forEach((p) => {
    const fileInput = document.getElementById(`soc_file_${p.id}`);
    fileInput?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("folder", "social_icons");
      fd.append("images", file);
      try {
        toast(`Uploading ${p.name} custom icon…`);
        const res = await api("/api/admin/catalog/uploads/images", { method: "POST", body: fd });
        const url = res.images?.[0]?.url || "";
        if (url) {
          document.getElementById(`soc_icon_${p.id}`).value = url;
          updateSocialPreviewStage();
          toast(`${p.name} icon uploaded!`);
        }
      } catch (err) {
        toast(err.message, false);
      }
    });
  });

  document.getElementById("saveSocialDraftBtn").addEventListener("click", async () => {
    try {
      const payload = collectSocialSupportForm();
      await api("/api/admin/cms/social-support", {
        method: "PUT",
        body: JSON.stringify({ ...payload, publish: false }),
      });
      toast("Social support draft saved!");
      loadTab("social");
    } catch (err) {
      toast(err.message, false);
    }
  });

  document.getElementById("socialSupportForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const payload = collectSocialSupportForm();
      await api("/api/admin/cms/social-support/publish", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast("Social support settings published live!");
      loadTab("social");
    } catch (err) {
      toast(err.message, false);
    }
  });
}

function getPopupFormValues() {
  return {
    id: state.editingPopupId || undefined,
    title: document.getElementById("popTitle")?.value || "Welcome to MY Shop!",
    subtitle: document.getElementById("popSubtitle")?.value || "Shop Smart • Live Happy!",
    description: document.getElementById("popDesc")?.value || "",
    imageUrl: document.getElementById("popImg")?.value || "",
    buttonText: document.getElementById("popBtn")?.value || "Join Our Community",
    buttonUrl: document.getElementById("popUrl")?.value || "/explore",
    designStyle: document.getElementById("popDesign")?.value || "NEON_GLASS",
    themeStyle: document.getElementById("popTheme")?.value || "DARK_NEON",
    animation3D: document.getElementById("popAnim3D")?.value || "PERSPECTIVE_FLIP",
    bgHex: document.getElementById("popBgHex")?.value || "#120B29",
    includeSocialButtons: Boolean(document.getElementById("popSocialBtns")?.checked),
    templateType: document.getElementById("popTemplate")?.value || "WELCOME_3D",
    frequency: document.getElementById("popFreq")?.value || "ONCE_PER_DAY",
    delaySeconds: Number(document.getElementById("popDelay")?.value || 1),
    durationSeconds: Number(document.getElementById("popDur")?.value || 0),
    targetAudience: document.getElementById("popAudience")?.value || "ALL",
    startDate: document.getElementById("popStart")?.value || "",
    endDate: document.getElementById("popEnd")?.value || "",
    active: Boolean(document.getElementById("popActive")?.checked),
  };
}

function updatePopupPreviewStage() {
  const stage = document.getElementById("popupPreviewStage");
  if (!stage) return;
  const p = getPopupFormValues();
  const platforms = (state.socialSupport?.platforms || defaultSocialPlatformsFallback()).filter((x) => x.enabled);
  stage.className = `preview-stage ${state.previewDevice}`;
  stage.innerHTML = `
    <div class="preview-mockup-bar">
      <span>3D Popup Preview (${escHtml(p.animation3D)} • ${escHtml(p.frequency)})</span>
      <span>Delay: ${p.delaySeconds}s</span>
    </div>
    <div class="popup-3d-card" style="background:linear-gradient(145deg,${escHtml(p.bgHex)}ee,rgba(32,18,74,0.95));">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <img src="/admin/logo.svg" alt="MY Shop" style="width:28px;height:28px;" />
          <strong style="font-size:0.85rem;color:#00E5FF;">${escHtml(p.subtitle || "Shop Smart • Live Happy!")}</strong>
        </div>
        <span style="width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,0.12);display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;">✕</span>
      </div>
      ${
        p.imageUrl
          ? `<img src="${escHtml(p.imageUrl)}" style="width:100%;height:110px;object-fit:cover;border-radius:12px;margin-bottom:10px;" />`
          : `<div style="height:64px;border-radius:12px;background:linear-gradient(135deg,rgba(139,32,255,0.35),rgba(0,229,255,0.28));display:flex;align-items:center;justify-content:center;margin-bottom:10px;font-size:1.3rem;">🛍️ ✨ 🎁</div>`
      }
      <h3 style="font-size:1.1rem;font-weight:800;margin-bottom:6px;">${escHtml(p.title)}</h3>
      <p style="font-size:0.8rem;color:#cbd5e1;line-height:1.45;">${escHtml(p.description)}</p>
      ${
        p.includeSocialButtons
          ? `<div class="popup-3d-social-row">
              ${platforms.map((pl) => `<span style="background:${escHtml(pl.colorHex)};padding:5px 9px;border-radius:999px;font-size:0.72rem;font-weight:700;color:#fff;">${platformGlyph(pl.id)} ${escHtml(pl.name.split(" ")[0])}</span>`).join("")}
            </div>`
          : ""
      }
      <button type="button" class="btn-neon full-width" style="margin-top:6px;">${escHtml(p.buttonText || "Join Our Community")}</button>
    </div>
  `;
}

function renderPopups(ws) {
  const ann = state.announcementConfig || {};
  const an = state.engagementAnalytics || {};
  const editItem = state.popups.find((x) => x.id === state.editingPopupId) || null;

  ws.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Popup Impressions</div><div class="kpi-value">${an.popupImpressions ?? 0}</div></div>
      <div class="kpi-card"><div class="kpi-label">Popup Closes</div><div class="kpi-value">${an.popupCloses ?? 0}</div></div>
      <div class="kpi-card"><div class="kpi-label">Close / Dismiss Rate</div><div class="kpi-value">${an.closeRatePercent ?? 0}%</div></div>
      <div class="kpi-card"><div class="kpi-label">Social CTA Clicks</div><div class="kpi-value">${an.totalSocialClicks ?? 0}</div></div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card-header">
          <h3>${editItem ? "Edit 3D Welcome Popup" : "3D Welcome & Promotional Popup Builder"}</h3>
          ${editItem ? `<button type="button" class="btn-outline small" id="cancelPopupEditBtn">New Popup</button>` : ""}
        </div>

        <div class="badge-row" style="margin-bottom:12px;">
          <small class="muted">Templates:</small>
          <button type="button" class="btn-outline small" onclick="applyPopupTemplate('WELCOME_3D')">✨ 3D Welcome + Social</button>
          <button type="button" class="btn-outline small" onclick="applyPopupTemplate('FLASH_SALE')">⚡ Flash Sale</button>
          <button type="button" class="btn-outline small" onclick="applyPopupTemplate('VIP_SOCIAL')">💎 VIP Community</button>
        </div>

        <form id="popForm" class="stack-form">
          <div class="form-grid">
            <label><span>Popup Title *</span><input id="popTitle" required value="${escHtml(editItem?.title || "Welcome to MY Shop!")}" /></label>
            <label><span>Subtitle / Tagline</span><input id="popSubtitle" value="${escHtml(editItem?.subtitle || "Shop Smart • Live Happy!")}" /></label>
            <label><span>Template Type</span>
              <select id="popTemplate">
                <option value="WELCOME_3D" ${editItem?.templateType === "WELCOME_3D" ? "selected" : ""}>WELCOME_3D</option>
                <option value="FLASH_SALE" ${editItem?.templateType === "FLASH_SALE" ? "selected" : ""}>FLASH_SALE</option>
                <option value="VIP_SOCIAL" ${editItem?.templateType === "VIP_SOCIAL" ? "selected" : ""}>VIP_SOCIAL</option>
              </select>
            </label>
            <label><span>Design Style</span>
              <select id="popDesign">
                <option value="NEON_GLASS" ${editItem?.designStyle === "NEON_GLASS" ? "selected" : ""}>Neon Glassmorphism</option>
                <option value="CYBER_AURORA" ${editItem?.designStyle === "CYBER_AURORA" ? "selected" : ""}>Cyber Aurora Gradient</option>
                <option value="ROYAL_PURPLE" ${editItem?.designStyle === "ROYAL_PURPLE" ? "selected" : ""}>Royal Purple Studio</option>
              </select>
            </label>
            <label><span>3D Animation</span>
              <select id="popAnim3D">
                <option value="PERSPECTIVE_FLIP" ${editItem?.animation3D === "PERSPECTIVE_FLIP" ? "selected" : ""}>3D Perspective Tilt</option>
                <option value="FLOAT_DEPTH" ${editItem?.animation3D === "FLOAT_DEPTH" ? "selected" : ""}>Floating 3D Depth</option>
                <option value="ORBIT_PULSE" ${editItem?.animation3D === "ORBIT_PULSE" ? "selected" : ""}>Orbit Neon Pulse</option>
              </select>
            </label>
            <label><span>Theme Style</span>
              <select id="popTheme">
                <option value="DARK_NEON" ${editItem?.themeStyle === "DARK_NEON" ? "selected" : ""}>Dark Neon</option>
                <option value="VIBRANT_CYBER" ${editItem?.themeStyle === "VIBRANT_CYBER" ? "selected" : ""}>Vibrant Cyber</option>
                <option value="FROSTED_LIGHT" ${editItem?.themeStyle === "FROSTED_LIGHT" ? "selected" : ""}>Frosted Light</option>
              </select>
            </label>
            <label><span>Background Color</span><input id="popBgHex" type="color" value="${escHtml(editItem?.bgHex || "#120B29")}" style="height:42px;padding:4px;" /></label>
            <label><span>Display Frequency</span>
              <select id="popFreq">
                <option value="EVERY_VISIT" ${editItem?.frequency === "EVERY_VISIT" ? "selected" : ""}>Show Every Visit</option>
                <option value="ONCE_PER_SESSION" ${editItem?.frequency === "ONCE_PER_SESSION" ? "selected" : ""}>Once Per Session</option>
                <option value="ONCE_PER_DAY" ${!editItem || editItem?.frequency === "ONCE_PER_DAY" ? "selected" : ""}>Once Per Day</option>
                <option value="ONCE_PER_WEEK" ${editItem?.frequency === "ONCE_PER_WEEK" ? "selected" : ""}>Once Per Week</option>
                <option value="ONCE_PER_USER" ${editItem?.frequency === "ONCE_PER_USER" ? "selected" : ""}>Once Per User</option>
              </select>
            </label>
            <label><span>Target Audience</span>
              <select id="popAudience">
                <option value="ALL" ${editItem?.targetAudience !== "NEW_VISITORS" ? "selected" : ""}>All Visitors</option>
                <option value="NEW_VISITORS" ${editItem?.targetAudience === "NEW_VISITORS" ? "selected" : ""}>New Visitors Only</option>
              </select>
            </label>
            <label><span>Trigger Delay (sec)</span><input id="popDelay" type="number" min="0" max="30" value="${editItem?.delaySeconds ?? 1}" /></label>
            <label><span>Auto-Close (sec, 0=Manual)</span><input id="popDur" type="number" min="0" max="300" value="${editItem?.durationSeconds ?? 0}" /></label>
            <label><span>CTA Button Text</span><input id="popBtn" value="${escHtml(editItem?.buttonText || "Join Our Community")}" /></label>
            <label><span>CTA Destination Route/URL</span><input id="popUrl" value="${escHtml(editItem?.buttonUrl || "/explore")}" /></label>
            <label><span>Start Date</span><input id="popStart" type="date" value="${escHtml(editItem?.startDate || "")}" /></label>
            <label><span>End Date</span><input id="popEnd" type="date" value="${escHtml(editItem?.endDate || "")}" /></label>
          </div>

          <div class="form-grid">
            <label><span>Popup Banner / 3D Image URL</span><input id="popImg" value="${escHtml(editItem?.imageUrl || "")}" placeholder="https://… (or upload)" /></label>
            <div style="display:flex;align-items:flex-end;">
              <input type="file" id="popImgUpload" accept="image/jpeg,image/png,image/webp" class="hidden" />
              <button type="button" class="btn-outline small" onclick="document.getElementById('popImgUpload').click()">📷 Upload Popup Image</button>
            </div>
          </div>

          <label><span>Popup Description / Message</span><textarea id="popDesc" rows="2">${escHtml(editItem?.description || "Join our official social communities and never miss exciting offers, updates and support.")}</textarea></label>

          <div class="badge-row">
            <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="popSocialBtns" ${editItem?.includeSocialButtons !== false ? "checked" : ""} style="width:auto;" /> Show Social Support Buttons</label>
            <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="popActive" ${editItem?.active !== false ? "checked" : ""} style="width:auto;" /> Active / Live</label>
          </div>

          <button type="submit" class="btn-neon">${editItem ? "Save 3D Popup Changes" : "🚀 Publish 3D Popup Notice"}</button>
        </form>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Live 3D Welcome Popup Preview</h3>
          <div class="badge-row">
            <button type="button" class="btn-outline small" id="popPrevMobileBtn">📱 Mobile</button>
            <button type="button" class="btn-outline small" id="popPrevDesktopBtn">🖥️ Desktop</button>
          </div>
        </div>
        <div id="popupPreviewStage" class="preview-stage ${state.previewDevice}"></div>

        <hr class="divider" style="margin:16px 0;" />
        <h3>Top Storefront Announcement Bar</h3>
        <form id="annForm" class="stack-form" style="margin-top:8px;">
          <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="annEnabled" ${ann.enabled !== false ? "checked" : ""} style="width:auto;" /> Enable Live Announcement Banner</label>
          <div class="form-grid">
            <label><span>Badge Label</span><input id="annBadge" value="${escHtml(ann.badgeText || "FLASH DEAL")}" /></label>
            <label><span>Banner Color</span><input id="annBg" type="color" value="${escHtml(ann.bgHex || "#8B5CF6")}" style="height:42px;padding:4px;" /></label>
          </div>
          <label><span>Announcement Text</span><input id="annText" value="${escHtml(ann.text || "Cyber Flash Sale Live! Use MYSHOP10 for 10% OFF.")}" /></label>
          <label><span>Optional Action Link</span><input id="annUrl" value="${escHtml(ann.actionUrl || "")}" placeholder="/explore or https://…" /></label>
          <button type="submit" class="btn-outline">Save Announcement Bar</button>
        </form>
      </div>
    </div>

    <div class="card">
      <h3>Configured Popup Notices (${state.popups.length})</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>Frequency</th><th>Audience</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${state.popups
              .map(
                (p) => `
              <tr>
                <td><strong>${escHtml(p.title)}</strong><br><small class="muted">${escHtml(p.subtitle || "")}</small></td>
                <td>${escHtml(p.frequency || "ONCE_PER_SESSION")}</td>
                <td>${escHtml(p.targetAudience || "ALL")}</td>
                <td>${p.active ? "🟢 Live" : "⚪ Paused"}</td>
                <td style="display:flex;gap:6px;">
                  <button type="button" class="btn-outline small" onclick="editPopupItem('${escHtml(p.id)}')">Edit</button>
                  <button type="button" class="btn-danger small" onclick="delPopup('${escHtml(p.id)}')">Delete</button>
                </td>
              </tr>`
              )
              .join("") || `<tr><td colspan="5" class="muted">No popups published yet. Use the 3D builder above!</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;

  updatePopupPreviewStage();

  document.getElementById("popPrevMobileBtn").addEventListener("click", () => {
    state.previewDevice = "mobile";
    updatePopupPreviewStage();
  });
  document.getElementById("popPrevDesktopBtn").addEventListener("click", () => {
    state.previewDevice = "desktop";
    updatePopupPreviewStage();
  });
  document.getElementById("cancelPopupEditBtn")?.addEventListener("click", () => {
    state.editingPopupId = null;
    renderPopups(ws);
  });

  document.getElementById("popForm").addEventListener("input", updatePopupPreviewStage);
  document.getElementById("popForm").addEventListener("change", updatePopupPreviewStage);

  document.getElementById("popImgUpload").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("folder", "popups");
    fd.append("images", file);
    try {
      toast("Uploading 3D popup banner image…");
      const res = await api("/api/admin/catalog/uploads/images", { method: "POST", body: fd });
      const url = res.images?.[0]?.url || "";
      if (url) {
        document.getElementById("popImg").value = url;
        updatePopupPreviewStage();
        toast("Popup image uploaded!");
      }
    } catch (err) {
      toast(err.message, false);
    }
  });

  document.getElementById("popForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const payload = getPopupFormValues();
      await api("/api/admin/cms/popups", { method: "POST", body: JSON.stringify(payload) });
      state.editingPopupId = null;
      toast("3D Popup notice published & synced!");
      loadTab("popups");
    } catch (err) {
      toast(err.message, false);
    }
  });

  document.getElementById("annForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/api/admin/cms/announcements", {
        method: "PUT",
        body: JSON.stringify({
          enabled: document.getElementById("annEnabled").checked,
          badgeText: document.getElementById("annBadge").value,
          bgHex: document.getElementById("annBg").value,
          text: document.getElementById("annText").value,
          actionUrl: document.getElementById("annUrl").value,
        }),
      });
      toast("Announcement bar updated live!");
    } catch (err) {
      toast(err.message, false);
    }
  });
}

window.applyPopupTemplate = (tpl) => {
  const templates = {
    WELCOME_3D: {
      title: "Welcome to MY Shop!",
      subtitle: "Shop Smart • Live Happy!",
      description: "Join our official social communities and never miss exciting offers, updates and support.",
      btn: "Join Our Community",
      url: "/explore",
      freq: "ONCE_PER_DAY",
      bg: "#120B29",
    },
    FLASH_SALE: {
      title: "⚡ Cyber Flash Sale Live!",
      subtitle: "Up to 40% OFF Today Only",
      description: "Grab lightning deals across electronics, fashion & gaming — plus follow our social channels for secret drops.",
      btn: "Shop Flash Deals",
      url: "/explore",
      freq: "ONCE_PER_SESSION",
      bg: "#1E0B38",
    },
    VIP_SOCIAL: {
      title: "Unlock VIP Reward Drops!",
      subtitle: "MY Shop Social Community",
      description: "Follow our Facebook, YouTube, TikTok & Telegram channels for weekly coupon codes and live giveaways.",
      btn: "Explore Fun Zone",
      url: "/fun_zone",
      freq: "ONCE_PER_WEEK",
      bg: "#091A32",
    },
  };
  const t = templates[tpl];
  if (!t) return;
  document.getElementById("popTemplate").value = tpl;
  document.getElementById("popTitle").value = t.title;
  document.getElementById("popSubtitle").value = t.subtitle;
  document.getElementById("popDesc").value = t.description;
  document.getElementById("popBtn").value = t.btn;
  document.getElementById("popUrl").value = t.url;
  document.getElementById("popFreq").value = t.freq;
  document.getElementById("popBgHex").value = t.bg;
  updatePopupPreviewStage();
};

window.editPopupItem = (id) => {
  state.editingPopupId = id;
  renderPopups(document.getElementById("workspace"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.delPopup = async (id) => {
  const ok = await showConfirmModal({
    title: "Delete Popup Notice",
    message: "Permanently remove this 3D popup notice?",
    confirmText: "Delete Popup",
  });
  if (!ok) return;
  try {
    await api(`/api/admin/cms/popups/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (state.editingPopupId === id) state.editingPopupId = null;
    toast("Popup deleted.");
    loadTab("popups");
  } catch (err) {
    toast(err.message, false);
  }
};

// ======================== 11. SELLERS & DELIVERY ZONES ========================

function renderSellersDelivery(ws) {
  const editZone = state.deliveryZones.find((z) => z.id === state.editingZoneId) || null;
  const sellerStatuses = ["Pending", "Approved", "Rejected", "Suspended"];

  ws.innerHTML = `<div class="two-col">
    <div class="card">
      <h3>Sellers (${state.sellers.length})</h3>
      <form id="selForm" class="stack-form">
        <div class="form-grid">
          <label><span>Seller Name *</span><input id="selName" required placeholder="TechHub Official" /></label>
          <label><span>Email</span><input id="selEmail" type="email" placeholder="seller@example.com" /></label>
          <label><span>Location</span><input id="selLocation" value="Dhaka Hub" /></label>
          <label><span>Commission %</span><input id="selComm" type="number" min="0" max="50" value="10" /></label>
        </div>
        <button type="submit" class="btn-neon">Add Seller</button>
      </form>
      <hr class="divider"/>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Seller</th><th>Commission</th><th>Status</th></tr></thead>
          <tbody>
            ${state.sellers
              .map(
                (s) => `<tr>
              <td><strong>${escHtml(s.name)}</strong><br><small class="muted">${escHtml(s.location || "Dhaka")}</small></td>
              <td>${s.commissionPercent ?? 10}%</td>
              <td>
                <select onchange="updateSellerStatus('${escHtml(s.id)}', this.value)" style="width:auto;padding:5px 8px;">
                  ${sellerStatuses.map((st) => `<option ${s.status === st ? "selected" : ""}>${st}</option>`).join("")}
                </select>
              </td>
            </tr>`
              )
              .join("") || `<tr><td colspan="3" class="muted">No external sellers registered yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>${editZone ? `Edit Zone: ${escHtml(editZone.zoneName)}` : `Delivery Zones (${state.deliveryZones.length})`}</h3>
        ${editZone ? `<button type="button" class="btn-outline small" onclick="cancelEditZone()">New Zone</button>` : ""}
      </div>
      <form id="delForm" class="stack-form">
        <div class="form-grid">
          <label><span>Zone Name *</span><input id="dzName" required value="${escHtml(editZone?.zoneName || "")}" placeholder="Dhaka Metro" /></label>
          <label><span>Fee (৳)</span><input id="dzFee" type="number" min="0" value="${editZone?.fee ?? 60}" /></label>
          <label><span>Free Delivery Threshold (৳)</span><input id="dzFree" type="number" min="0" value="${editZone?.freeThreshold ?? 2500}" /></label>
          <label><span>Estimated Delivery ETA</span><input id="dzDays" value="${escHtml(editZone?.estimatedDays || "1-2 days")}" /></label>
          <label><span>Courier Partner</span><input id="dzCourier" value="${escHtml(editZone?.courierName || "MY Express")}" /></label>
          <label style="flex-direction:row;align-items:center;gap:8px;padding-top:18px;">
            <input type="checkbox" id="dzActive" ${editZone?.active !== false ? "checked" : ""} style="width:auto;" />
            <span>Active Zone</span>
          </label>
        </div>
        <button type="submit" class="btn-neon">${editZone ? "Update Delivery Zone" : "Save Delivery Zone"}</button>
      </form>
      <hr class="divider"/>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Zone</th><th>Fee / Free</th><th>ETA</th><th>Actions</th></tr></thead>
          <tbody>
            ${state.deliveryZones
              .map(
                (z) => `<tr>
              <td><strong>${escHtml(z.zoneName)}</strong><br><small class="muted">${escHtml(z.courierName || "MY Express")}</small></td>
              <td>${money(z.fee)}<br><small class="muted">Free ≥ ${money(z.freeThreshold || 2500)}</small></td>
              <td>${escHtml(z.estimatedDays || "1-3 days")}</td>
              <td style="display:flex;gap:6px;">
                <button type="button" class="btn-outline small" onclick="editZone('${escHtml(z.id)}')">Edit</button>
                <button type="button" class="btn-danger small" onclick="delZone('${escHtml(z.id)}')">Delete</button>
              </td>
            </tr>`
              )
              .join("") || `<tr><td colspan="4" class="muted">No delivery zones configured yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;

  document.getElementById("selForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/api/admin/settings/sellers", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("selName").value,
          email: document.getElementById("selEmail").value,
          location: document.getElementById("selLocation").value,
          commissionPercent: Number(document.getElementById("selComm").value),
        }),
      });
      toast("Seller added!");
      loadTab("sellers");
    } catch (err) {
      toast(err.message, false);
    }
  });

  document.getElementById("delForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/api/admin/settings/delivery", {
        method: "POST",
        body: JSON.stringify({
          id: state.editingZoneId || undefined,
          zoneName: document.getElementById("dzName").value,
          fee: Number(document.getElementById("dzFee").value),
          freeThreshold: Number(document.getElementById("dzFree").value),
          estimatedDays: document.getElementById("dzDays").value,
          courierName: document.getElementById("dzCourier").value,
          active: document.getElementById("dzActive").checked,
        }),
      });
      state.editingZoneId = null;
      toast("Delivery zone saved!");
      loadTab("sellers");
    } catch (err) {
      toast(err.message, false);
    }
  });
}

window.updateSellerStatus = async (id, status) => {
  try {
    await api(`/api/admin/settings/sellers/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    toast(`Seller marked ${status}`);
  } catch (err) {
    toast(err.message, false);
  }
};
window.editZone = (id) => {
  state.editingZoneId = id;
  renderSellersDelivery(document.getElementById("workspace"));
};
window.cancelEditZone = () => {
  state.editingZoneId = null;
  renderSellersDelivery(document.getElementById("workspace"));
};
window.delZone = async (id) => {
  const ok = await showConfirmModal({
    title: "Delete Delivery Zone",
    message: "Delete this delivery zone?",
    confirmText: "Delete Zone",
  });
  if (!ok) return;
  try {
    await api(`/api/admin/settings/delivery/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (state.editingZoneId === id) state.editingZoneId = null;
    toast("Delivery zone deleted.");
    loadTab("sellers");
  } catch (err) {
    toast(err.message, false);
  }
};

// ======================== 12. SUPPORT TICKETS, REVIEWS & CONTENT PAGES ========================

function renderReviewsContent(ws) {
  ws.innerHTML = `
    <div class="card">
      <h3>Customer Support Queue (${state.supportTickets.length})</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Customer</th><th>Subject & Message</th><th>Status</th><th>Admin Reply</th><th>Actions</th></tr></thead>
          <tbody>
            ${state.supportTickets
              .map(
                (t) => `
              <tr>
                <td><strong>${escHtml(t.customerName)}</strong><br><small class="muted">${escHtml(t.customerEmail)}</small></td>
                <td><strong>${escHtml(t.subject)}</strong><br><small class="muted">${escHtml(t.message)}</small></td>
                <td>${statusBadge(t.status)}</td>
                <td><small class="muted">${escHtml(t.adminReply || "No reply yet")}</small></td>
                <td>
                  <button type="button" class="btn-neon small" onclick="openTicketReplyModal('${escHtml(t.userId)}','${escHtml(t.id)}')">Reply / Status</button>
                </td>
              </tr>`
              )
              .join("") || `<tr><td colspan="5" class="muted">No support tickets submitted yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <h3>Product Reviews Moderation (${state.reviews.length})</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Reviewer</th><th>Comment</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${state.reviews
                .map(
                  (r) => `
                <tr>
                  <td><strong>${escHtml(r.authorName || "Customer")}</strong><br><small style="color:var(--amber);">${"★".repeat(Math.min(5, Number(r.rating || 5)))}</small></td>
                  <td><small>${escHtml(r.comment)}</small></td>
                  <td>${statusBadge(r.status || "approved")}</td>
                  <td style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button type="button" class="btn-outline small" onclick="moderateReview('${escHtml(r.userId)}','${escHtml(r.id)}','approved')">Approve</button>
                    <button type="button" class="btn-outline small" onclick="moderateReview('${escHtml(r.userId)}','${escHtml(r.id)}','rejected')">Hide</button>
                    <button type="button" class="btn-danger small" onclick="delReview('${escHtml(r.userId)}','${escHtml(r.id)}')">Delete</button>
                  </td>
                </tr>`
                )
                .join("") || `<tr><td colspan="4" class="muted">No user reviews yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <h3>FAQ & CMS Content Pages (${state.contentPages.length})</h3>
        <form id="cmsContentForm" class="stack-form">
          <div class="form-grid">
            <label><span>Type</span><select id="cntType"><option>FAQ</option><option>GUIDE</option><option>NOTICE</option></select></label>
            <label><span>Title *</span><input id="cntTitle" required placeholder="How long does delivery take?" /></label>
          </div>
          <label><span>Body</span><textarea id="cntBody" rows="2" required placeholder="Delivery across Dhaka takes 24–48 hours…"></textarea></label>
          <button type="submit" class="btn-neon small">Publish Content Item</button>
        </form>
        <hr class="divider" />
        ${state.contentPages
          .map(
            (c) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(148,163,184,0.14);gap:8px;">
              <div><strong>[${escHtml(c.type || "FAQ")}] ${escHtml(c.title)}</strong><p class="muted small">${escHtml(c.body)}</p></div>
              <button type="button" class="btn-danger small" onclick="delContentPage('${escHtml(c.id)}')">✕</button>
            </div>`
          )
          .join("") || `<p class="muted small">No CMS FAQ/content items yet.</p>`}
      </div>
    </div>
  `;

  document.getElementById("cmsContentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/api/admin/cms/content", {
        method: "POST",
        body: JSON.stringify({
          type: document.getElementById("cntType").value,
          title: document.getElementById("cntTitle").value,
          body: document.getElementById("cntBody").value,
        }),
      });
      toast("CMS content published!");
      loadTab("reviews");
    } catch (err) {
      toast(err.message, false);
    }
  });
}

window.openTicketReplyModal = (uid, tid) => {
  const t = state.supportTickets.find((x) => x.id === tid && x.userId === uid);
  openModal(`
    <div class="card-header">
      <h3>Support Ticket: ${escHtml(t?.subject || tid)}</h3>
      <button type="button" class="icon-btn" onclick="closeModal()">✕</button>
    </div>
    <p class="small muted" style="margin-bottom:12px;">${escHtml(t?.message || "")}</p>
    <form id="ticketModalForm" class="stack-form">
      <label><span>Status</span>
        <select id="tktStatusSel">
          <option value="Open" ${t?.status === "Open" ? "selected" : ""}>Open</option>
          <option value="In Progress" ${t?.status === "In Progress" ? "selected" : ""}>In Progress</option>
          <option value="Resolved" ${t?.status === "Resolved" ? "selected" : ""}>Resolved</option>
        </select>
      </label>
      <label><span>Reply Sent to Customer</span>
        <textarea id="tktReplyTxt" rows="3">${escHtml(t?.adminReply || "Thank you for contacting MY Shop Support!")}</textarea>
      </label>
      <div class="badge-row" style="justify-content:flex-end;">
        <button type="button" class="btn-outline small" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn-neon small">Update Ticket & Notify</button>
      </div>
    </form>
  `);
  document.getElementById("ticketModalForm").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api(`/api/admin/cms/support-tickets/${encodeURIComponent(uid)}/${encodeURIComponent(tid)}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: document.getElementById("tktStatusSel").value,
          reply: document.getElementById("tktReplyTxt").value,
        }),
      });
      closeModal();
      toast("Support ticket updated!");
      loadTab("reviews");
    } catch (err) {
      toast(err.message, false);
    }
  };
};

window.moderateReview = async (uid, rid, status) => {
  try {
    await api(`/api/admin/cms/reviews/${encodeURIComponent(uid)}/${encodeURIComponent(rid)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    toast(`Review marked as ${status}.`);
    loadTab("reviews");
  } catch (err) {
    toast(err.message, false);
  }
};

window.delReview = async (uid, rid) => {
  const ok = await showConfirmModal({
    title: "Delete Review",
    message: "Permanently delete this customer review?",
    confirmText: "Delete Review",
  });
  if (!ok) return;
  try {
    await api(`/api/admin/cms/reviews/${encodeURIComponent(uid)}/${encodeURIComponent(rid)}`, { method: "DELETE" });
    toast("Review deleted.");
    loadTab("reviews");
  } catch (err) {
    toast(err.message, false);
  }
};

window.delContentPage = async (id) => {
  const ok = await showConfirmModal({
    title: "Delete Content Item",
    message: "Remove this FAQ / content entry?",
    confirmText: "Delete",
  });
  if (!ok) return;
  try {
    await api(`/api/admin/cms/content/${encodeURIComponent(id)}`, { method: "DELETE" });
    loadTab("reviews");
  } catch (err) {
    toast(err.message, false);
  }
};

// ======================== 13. NOTIFICATIONS, REPORTS & SECURITY SETTINGS ========================

function renderNotifications(ws) {
  ws.innerHTML = `<div class="card"><h3>Broadcast Notification to MY Shop Customers</h3><form id="notifForm" class="stack-form">
    <div class="form-grid">
      <label><span>Title *</span><input id="nTitle" required placeholder="Flash Sale Starting Now!" /></label>
      <label><span>Category</span><select id="nCat"><option>FLASH_SALE</option><option>REWARD</option><option>ORDER</option><option>PRICE_DROP</option><option>SHIPPING</option><option>SUPPORT</option></select></label>
      <label><span>Target User ID (optional — blank = All Customers)</span><input id="nTargetUid" placeholder="Leave blank for broadcast" /></label>
    </div>
    <label><span>Message Body *</span><textarea id="nBody" required rows="3"></textarea></label>
    <button type="submit" class="btn-neon">Send Notification</button>
  </form></div>`;
  document.getElementById("notifForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const res = await api("/api/admin/cms/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({
          title: document.getElementById("nTitle").value,
          body: document.getElementById("nBody").value,
          category: document.getElementById("nCat").value,
          targetUserId: document.getElementById("nTargetUid").value.trim() || undefined,
        }),
      });
      toast(`Notification delivered to ${res.sentCount} customer(s)!`);
    } catch (err) {
      toast(err.message, false);
    }
  });
}

function renderReports(ws) {
  const m = state.dashboard?.metrics || {};
  ws.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Total Revenue</div><div class="kpi-value">${money(m.totalRevenue)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Total Orders</div><div class="kpi-value">${m.totalOrders ?? 0}</div></div>
      <div class="kpi-card"><div class="kpi-label">Customers</div><div class="kpi-value">${m.totalCustomers ?? 0}</div></div>
      <div class="kpi-card"><div class="kpi-label">Catalog Products</div><div class="kpi-value">${m.totalProducts ?? 0}</div></div>
    </div>

    <div class="two-col">
      <div class="card">
        <h3>Exports & Authenticated Downloads</h3>
        <p class="muted small" style="margin:6px 0 14px;">All exports stream with authenticated Admin credentials and never fail silently.</p>
        <div class="badge-row">
          <button type="button" class="btn-neon small" id="downloadReportCsvBtn">⬇ Download Orders CSV</button>
          <button type="button" class="btn-outline small" id="downloadBackupBtn">⬇ Export Store JSON Backup</button>
        </div>
        <hr class="divider" style="margin:14px 0;" />
        <h4>Backup Export History (${state.backupHistory.length})</h4>
        <div class="table-wrap" style="margin-top:8px;">
          <table>
            <thead><tr><th>Admin</th><th>Products</th><th>Categories</th><th>Date</th></tr></thead>
            <tbody>
              ${state.backupHistory
                .map(
                  (b) => `<tr><td>${escHtml(b.exportedBy)}</td><td>${b.productCount}</td><td>${b.categoryCount}</td><td><small class="muted">${escHtml(b.createdAt ? String(b.createdAt).slice(0, 16).replace("T", " ") : "")}</small></td></tr>`
                )
                .join("") || `<tr><td colspan="4" class="muted">No backups exported yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <h3>Safe Store Backup Restore (Merge Mode)</h3>
        <p class="muted small" style="margin:6px 0 10px;">Upload a previously exported MY Shop JSON backup file. Type <strong>RESTORE_MY_SHOP</strong> to confirm.</p>
        <form id="restoreBackupForm" class="stack-form">
          <label><span>Select JSON Backup File</span><input type="file" id="restoreJsonFile" accept="application/json,.json" /></label>
          <label><span>Or Paste JSON Payload</span><textarea id="restoreJsonText" rows="4" placeholder='{"catalog_products":[...]}'></textarea></label>
          <label><span>Confirmation Phrase *</span><input id="restoreConfirmPhrase" required placeholder="Type RESTORE_MY_SHOP" /></label>
          <button type="submit" class="btn-danger">Restore Store Snapshot</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById("downloadReportCsvBtn").onclick = () => {
    downloadFileFromApi("/api/admin/orders/export/csv", `myshop-orders-report-${Date.now()}.csv`);
  };
  document.getElementById("downloadBackupBtn").onclick = async () => {
    await downloadFileFromApi("/api/admin/settings/backup", `myshop-backup-${Date.now()}.json`);
    loadTab("reports");
  };
  document.getElementById("restoreJsonFile").onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    document.getElementById("restoreJsonText").value = await file.text();
  };
  document.getElementById("restoreBackupForm").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(document.getElementById("restoreJsonText").value.trim());
      const confirmRestore = document.getElementById("restoreConfirmPhrase").value.trim();
      const res = await api("/api/admin/settings/restore", {
        method: "POST",
        body: JSON.stringify({ confirmRestore, backup: parsed }),
      });
      toast(`Restored ${res.restoredCount} store record(s)!`);
      loadTab("reports");
    } catch (err) {
      toast(err.message || "Invalid JSON backup payload.", false);
    }
  };
}

function renderSettings(ws) {
  ws.innerHTML = `<div class="two-col">
    <div class="card"><h3>Change Admin Password</h3><form id="pwForm" class="stack-form">
      <label><span>Current Password</span><input type="password" id="curPw" required /></label>
      <label><span>New Password (10+ chars)</span><input type="password" id="newPw" required minlength="10" /></label>
      <button type="submit" class="btn-neon">Update Password & Revoke Old Sessions</button>
    </form></div>
    <div class="card">
      <div class="card-header">
        <h3>Admin Audit Logs (${state.auditLogs.length})</h3>
        <div class="badge-row">
          <input id="auditFilterInput" value="${escHtml(state.auditActionFilter)}" placeholder="Filter action (e.g. PRODUCT)" style="width:170px;padding:6px 10px;" />
          <button type="button" class="btn-outline small" id="auditFilterBtn">Filter</button>
        </div>
      </div>
      <div style="max-height:320px;overflow-y:auto;font-size:0.8rem;">
        ${state.auditLogs
          .map(
            (l) => `<div style="padding:7px 0;border-bottom:1px solid rgba(148,163,184,0.16);">
            <strong>${escHtml(l.action)}</strong> • ${escHtml(l.targetPath)}
            <br><small class="muted">${escHtml(l.adminUsername || "admin")} • ${escHtml(l.createdAt ? String(l.createdAt).slice(0, 19).replace("T", " ") : "")}</small>
          </div>`
          )
          .join("") || `<p class="muted">No audit logs match this filter.</p>`}
      </div>
    </div>
  </div>`;

  document.getElementById("auditFilterBtn").onclick = () => {
    state.auditActionFilter = document.getElementById("auditFilterInput").value.trim();
    loadTab("settings");
  };

  document.getElementById("pwForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const r = await api("/api/admin/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: document.getElementById("curPw").value,
          newPassword: document.getElementById("newPw").value,
        }),
      });
      toast(r.message);
    } catch (err) {
      toast(err.message, false);
    }
  });
}

// ======================== BOOTSTRAP & EVENT WIRING ========================

document.addEventListener("DOMContentLoaded", async () => {
  const savedTheme = localStorage.getItem("myshop_admin_theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", savedTheme);
  }

  const toggleTheme = () => {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("myshop_admin_theme", next);
  };
  document.getElementById("themeToggleBtn").addEventListener("click", toggleTheme);
  document.getElementById("loginThemeToggle").addEventListener("click", toggleTheme);

  const modalOverlay = document.getElementById("adminModalOverlay");
  modalOverlay?.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalOverlay && !modalOverlay.classList.contains("hidden")) {
      closeModal();
    }
  });

  const drawerBackdrop = document.getElementById("drawerBackdrop");
  const sidebarEl = document.getElementById("sidebar");
  const closeDrawer = () => {
    sidebarEl.classList.remove("open");
    drawerBackdrop?.classList.add("hidden");
  };

  document.getElementById("collapseSidebarBtn").addEventListener("click", () => {
    sidebarEl.classList.toggle("collapsed");
  });
  document.getElementById("mobileMenuBtn").addEventListener("click", () => {
    const open = sidebarEl.classList.toggle("open");
    drawerBackdrop?.classList.toggle("hidden", !open);
  });
  drawerBackdrop?.addEventListener("click", closeDrawer);
  document.getElementById("refreshBtn").addEventListener("click", () => loadTab(state.activeTab));

  document.getElementById("topbarQuickSearch")?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const q = e.target.value.trim();
    if (!q) return;
    if (q.toUpperCase().startsWith("MYS-") || state.activeTab === "orders") {
      state.orderQuery = q;
      loadTab("orders");
    } else if (state.activeTab === "customers") {
      state.customerQuery = q;
      loadTab("customers");
    } else {
      state.prodQuery = q;
      state.prodPage = 1;
      loadTab("products");
    }
  });

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeDrawer();
      loadTab(btn.dataset.tab);
    });
  });

  document.getElementById("openRecoveryBtn").addEventListener("click", () => {
    document.getElementById("recoveryForm").classList.toggle("hidden");
  });

  document.getElementById("recoveryForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const r = await api("/api/admin/auth/request-recovery", {
        method: "POST",
        body: JSON.stringify({ email: document.getElementById("recoveryEmail").value }),
      });
      showLogin(r.message);
    } catch (err) {
      showLogin(err.message);
    }
  });

  document.getElementById("confirmResetBtn").addEventListener("click", async () => {
    try {
      const r = await api("/api/admin/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          recoveryToken: document.getElementById("resetTokenInput").value,
          newPassword: document.getElementById("resetNewPassword").value,
        }),
      });
      showLogin(r.message);
    } catch (err) {
      showLogin(err.message);
    }
  });

  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const res = await api("/api/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: document.getElementById("loginUsername").value,
          password: document.getElementById("loginPassword").value,
        }),
      });
      state.admin = res.admin;
      state.firebase = res.firebase;
      showShell();
      loadTab("dashboard");
    } catch (err) {
      showLogin(err.message);
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await api("/api/admin/auth/logout", { method: "POST" });
    state.admin = null;
    showLogin();
  });

  // Check existing HTTP-only session cookie on page load
  try {
    const me = await api("/api/admin/auth/me");
    state.admin = me.admin;
    state.firebase = me.firebase;
    showShell();
    loadTab("dashboard");
  } catch {
    showLogin();
  }
});
