// MY Shop Super Admin Frontend Controller
// Strictly communicates ONLY with the Render Backend API via HTTP-only cookies.
// ZERO Firebase Client SDK or Firebase Console configuration is included in this file.

const API_BASE = window.__MYSHOP_ADMIN_API_BASE__ || "";

const state = {
  activeTab: "dashboard",
  admin: null,
  firebase: null,
  dashboard: null,
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
  contentPages: [],
  auditLogs: [],
  productImagesDraft: [],
  mainImageDraft: "",
  editingProductId: null,
  prodCatFilter: "ALL",
  prodStockFilter: "all",
  prodQuery: "",
  orderStatusFilter: "ALL",
  orderQuery: "",
  customerStatusFilter: "all",
  customerQuery: "",
  editingCategoryId: null,
  editingBannerId: null,
  editingCouponCode: null,
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

function toast(msg, ok = true) {
  const el = document.getElementById("toastBanner");
  if (!el) return;
  el.textContent = msg;
  el.className = `toast ${ok ? "ok" : ""}`;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4200);
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
    badge.textContent = `Backend Online • Set FIREBASE_SERVICE_ACCOUNT_JSON on Render`;
    badge.className = "status-pill warn";
  }
}

function money(val) {
  return `৳${Number(val || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusBadge(status) {
  const s = String(status || "Pending");
  const lower = s.toLowerCase();
  let cls = "badge-pending";
  if (lower.includes("deliver") || lower === "active" || lower === "paid" || lower === "paid_sandbox" || lower === "resolved") {
    cls = "badge-delivered";
  } else if (lower.includes("confirm") || lower.includes("process")) {
    cls = "badge-confirmed";
  } else if (lower.includes("ship") || lower.includes("out for")) {
    cls = "badge-shipped";
  } else if (lower.includes("cancel") || lower.includes("suspend") || lower.includes("refund") || lower.includes("return")) {
    cls = "badge-cancelled";
  }
  return `<span class="status-badge ${cls}">${escHtml(s)}</span>`;
}

// ======================== TAB LOADER & ROUTER ========================

async function loadTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  const ws = document.getElementById("workspace");
  ws.innerHTML = `<div class="card"><p class="muted">Loading ${escHtml(tab)}…</p></div>`;

  try {
    switch (tab) {
      case "dashboard":
        state.dashboard = await api("/api/admin/dashboard");
        document.getElementById("pageTitle").textContent = "Dashboard Overview";
        renderDashboard(ws);
        break;
      case "products": {
        const [pRes, cRes, bRes] = await Promise.all([
          api("/api/admin/catalog/products?limit=100"),
          api("/api/admin/catalog/categories"),
          api("/api/admin/catalog/brands"),
        ]);
        state.products = pRes.items || [];
        state.categories = cRes.items || [];
        state.brands = bRes.items || [];
        document.getElementById("pageTitle").textContent = "Product & Image Management";
        renderProducts(ws);
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
      case "orders":
        state.orders = (await api("/api/admin/orders?limit=100")).items || [];
        document.getElementById("pageTitle").textContent = "Order Management";
        renderOrders(ws);
        break;
      case "customers":
        state.customers = (await api("/api/admin/customers?limit=100")).items || [];
        document.getElementById("pageTitle").textContent = "Customers & Support";
        renderCustomers(ws);
        break;
      case "payments":
        state.payments = await api("/api/admin/marketing/payments");
        document.getElementById("pageTitle").textContent = "Payments & Verification";
        renderPayments(ws);
        break;
      case "marketing":
        state.coupons = (await api("/api/admin/marketing/coupons")).items || [];
        document.getElementById("pageTitle").textContent = "Flash Sales & Coupons";
        renderMarketing(ws);
        break;
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
      case "cms":
        state.siteConfig = await api("/api/admin/cms/site-config");
        document.getElementById("pageTitle").textContent = "Website Customization";
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
      case "reviews": {
        const [rRes, cntRes] = await Promise.all([
          api("/api/admin/cms/reviews"),
          api("/api/admin/cms/content"),
        ]);
        state.reviews = rRes.items || [];
        state.contentPages = cntRes.items || [];
        document.getElementById("pageTitle").textContent = "Reviews & CMS Content";
        renderReviewsContent(ws);
        break;
      }
      case "notifications":
        document.getElementById("pageTitle").textContent = "Customer Notifications";
        renderNotifications(ws);
        break;
      case "reports":
        state.dashboard = await api("/api/admin/dashboard");
        document.getElementById("pageTitle").textContent = "Reports & Export";
        renderReports(ws);
        break;
      case "settings":
        state.auditLogs = (await api("/api/admin/settings/audit-logs")).items || [];
        document.getElementById("pageTitle").textContent = "Admin Security & Settings";
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
  const series = state.dashboard?.salesSeries || [];
  const breakdown = state.dashboard?.orderStatusBreakdown || {};
  const heroKpis = [
    ["Total Revenue", money(m.totalRevenue), `Today: ${money(m.todayRevenue)}`],
    ["Total Orders", m.totalOrders ?? 0, `Pending: ${m.pendingOrders ?? 0} • Delivered: ${m.completedOrders ?? 0}`],
    ["Total Customers", m.totalCustomers ?? 0, "Synced MY Shop accounts"],
    ["Avg Order Value", money(m.avgOrderValue), `Monthly: ${money(m.monthlyRevenue)}`],
    ["Low / Out Stock", Number(m.lowStockCount || 0) + Number(m.outOfStockCount || 0), `Low: ${m.lowStockCount ?? 0} • Out: ${m.outOfStockCount ?? 0}`],
  ];

  const miniStats = [
    ["Catalog Products", m.totalProducts ?? 0],
    ["Categories", m.totalCategories ?? 0],
    ["Pending Payments", m.pendingPayments ?? 0],
    ["Cancelled Orders", m.cancelledOrders ?? 0],
    ["Active Sellers", m.totalSellers ?? 0],
  ];

  const statusEntries = Object.entries(breakdown).filter(([, count]) => Number(count) > 0);

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
            <h3>Revenue & Sales Trend</h3>
            <small class="muted">Real verified order totals across shared Firestore</small>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn-neon small" onclick="loadTab('products')">+ Add Product</button>
            <button class="btn-outline small" onclick="loadTab('cms')">+ Banner</button>
            <button class="btn-outline small" onclick="loadTab('orders')">Orders</button>
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
            ${statusEntries.length
              ? statusEntries
                  .map(
                    ([lbl, cnt]) => `
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span>${statusBadge(lbl)}</span>
                    <strong>${cnt}</strong>
                  </div>`
                  )
                  .join("")
              : `<p class="muted">Status distribution appears once orders arrive.</p>`}
          </div>
        </div>
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card-header">
          <h3>Recent Orders</h3>
          <button class="btn-outline small" onclick="loadTab('orders')">Manage All →</button>
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
        <h3>Best-Selling Products & Recent Audit</h3>
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
        <hr class="divider"/>
        <p class="muted small">Recent Activities:</p>
        <ul style="list-style:none;font-size:0.8rem;margin-top:6px;">
          ${(state.dashboard?.recentActivities || [])
            .slice(0, 5)
            .map((a) => `<li>• <strong>${escHtml(a.action)}</strong> — ${escHtml(a.targetPath)}</li>`)
            .join("") || `<li class="muted">No activity logs yet.</li>`}
        </ul>
      </div>
    </div>
  `;

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
    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px sans-serif";
    ctx.fillText("Revenue bars appear once verified orders arrive in shared Firestore.", 16, cssH / 2);
    return;
  }

  const maxRev = Math.max(100, ...series.map((s) => Number(s.revenue || 0)));
  const padL = 48;
  const padB = 26;
  const padT = 16;
  const plotW = Math.max(100, cssW - padL - 14);
  const plotH = cssH - padT - padB;

  ctx.strokeStyle = "rgba(148, 163, 184, 0.16)";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#94a3b8";
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
    grad.addColorStop(0, "#00D4FF");
    grad.addColorStop(1, "#8B5CF6");
    ctx.fillStyle = grad;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, barW, barH, [6, 6, 0, 0]);
    } else {
      ctx.rect(x, y, barW, barH);
    }
    ctx.fill();
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(String(pt.date || "").slice(5), x, cssH - 8);
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
    Confirmed: "#3b82f6",
    Processing: "#00d4ff",
    Shipped: "#8b5cf6",
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
    ctx.strokeStyle = "rgba(148,163,184,0.25)";
    ctx.lineWidth = 18;
    ctx.stroke();
    ctx.fillStyle = "#94a3b8";
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
    ctx.strokeStyle = palette[key] || "#8b5cf6";
    ctx.lineWidth = 20;
    ctx.stroke();
    angle += slice;
  });

  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text-main").trim() || "#f8fafc";
  ctx.font = "800 18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(total), cx, cy + 2);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 10px sans-serif";
  ctx.fillText("ORDERS", cx, cy + 17);
}

// ======================== 2. PRODUCT & IMAGE MANAGEMENT ========================

function renderProducts(ws) {
  const catOptions = (state.categories.length
    ? state.categories
    : [
        { id: "MOBILES", titleEn: "Mobiles & Tablets" },
        { id: "COMPUTERS", titleEn: "Computers & Laptops" },
        { id: "ELECTRONICS", titleEn: "Electronics" },
        { id: "FASHION", titleEn: "Fashion & Clothing" },
        { id: "GAMING", titleEn: "Gaming Products" },
      ]
  )
    .map((c) => `<option value="${escHtml(c.id)}">${escHtml(c.titleEn || c.id)}</option>`)
    .join("");

  ws.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 id="prodFormHeading">${state.editingProductId ? "Edit Product" : "Add New Product (Syncs Live to User Panel)"}</h3>
        ${state.editingProductId ? `<button class="btn-outline small" onclick="resetProductForm()">Cancel Edit</button>` : ""}
      </div>
      <form id="productForm" class="stack-form">
        <div class="form-grid">
          <label><span>Product Name *</span><input id="pName" required placeholder="NovaPulse 5G Smartphone" /></label>
          <label><span>Bengali Name</span><input id="pNameBn" placeholder="নোভা-পালস 5G" /></label>
          <label><span>SKU</span><input id="pSku" placeholder="MYS-5G-001" /></label>
          <label><span>Category</span><select id="pCategory">${catOptions}</select></label>
          <label><span>Brand</span><input id="pBrand" value="NovaTech" /></label>
          <label><span>Price (৳) *</span><input id="pPrice" type="number" min="0" required value="18990" /></label>
          <label><span>Original Price (৳)</span><input id="pOrigPrice" type="number" min="0" value="22990" /></label>
          <label><span>Stock Qty *</span><input id="pStock" type="number" min="0" required value="25" /></label>
          <label><span>Colors (comma-separated)</span><input id="pColors" value="Cosmic Violet, Electric Cyan" /></label>
          <label><span>Sizes / Variants</span><input id="pSizes" value="128GB, 256GB" /></label>
          <label><span>Schedule Publish (optional)</span><input id="pSchedule" type="datetime-local" /></label>
        </div>
        <label><span>Description</span><textarea id="pDesc" rows="2" placeholder="Full product description…"></textarea></label>

        <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:0.85rem;">
          <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="pPublished" checked style="width:auto;" /> Published</label>
          <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="pFeatured" style="width:auto;" /> Featured</label>
          <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="pBestSeller" style="width:auto;" /> Best Seller</label>
          <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="pTrending" style="width:auto;" /> Trending</label>
          <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="pFreeDel" checked style="width:auto;" /> Free Delivery</label>
        </div>

        <!-- MULTI-METHOD PRODUCT IMAGE MANAGER -->
        <div class="card" style="background:rgba(0,0,0,0.22);">
          <h4 style="margin-bottom:8px;">Product Images (Mobile Gallery Upload + External URL + Library)</h4>
          <div class="form-grid">
            <div>
              <input type="file" id="galleryFileInput" accept="image/jpeg,image/jpg,image/png,image/webp" multiple class="hidden" />
              <button type="button" class="btn-neon small" onclick="document.getElementById('galleryFileInput').click()">📷 Add Image from Gallery / Files</button>
              <small class="muted" style="display:block;margin-top:4px;">Supports Android Gallery & Desktop (JPG, PNG, WebP)</small>
            </div>
            <div style="display:flex;gap:6px;align-items:flex-end;">
              <label style="flex:1;"><span>Or Paste Image URL</span><input id="externalImgUrl" placeholder="https://example.com/product.jpg" /></label>
              <button type="button" class="btn-outline small" id="addImgUrlBtn">Add URL</button>
            </div>
            <div style="display:flex;align-items:flex-end;">
              <button type="button" class="btn-outline small" id="loadLibraryBtn">🖼️ Import from Existing Library</button>
            </div>
          </div>
          <div id="imgPreviewGrid" class="img-preview-grid"></div>
        </div>

        <button type="submit" class="btn-neon">${state.editingProductId ? "Save Product Changes" : "Publish Product to MY Shop"}</button>
      </form>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Catalog Products (${state.products.length})</h3>
        <div class="filter-bar" style="margin:0;">
          <input id="prodSearch" placeholder="Search name, SKU, brand…" value="${escHtml(state.prodQuery)}" style="max-width:200px;" />
          <select id="prodCatFilter" style="max-width:160px;">
            <option value="ALL">All Categories</option>
            ${catOptions}
          </select>
          <select id="prodStockFilter" style="max-width:140px;">
            <option value="all" ${state.prodStockFilter === "all" ? "selected" : ""}>All Stock</option>
            <option value="low" ${state.prodStockFilter === "low" ? "selected" : ""}>Low Stock (≤5)</option>
            <option value="out" ${state.prodStockFilter === "out" ? "selected" : ""}>Out of Stock</option>
          </select>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Image</th><th>Product</th><th>Price</th><th>Stock</th><th>Quick Toggles</th><th>Actions</th></tr></thead>
          <tbody id="productsTableBody"></tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("prodCatFilter").value = state.prodCatFilter || "ALL";
  renderImageDraftGrid();
  renderProductRows();

  document.getElementById("prodSearch").addEventListener("input", (e) => {
    state.prodQuery = e.target.value;
    renderProductRows();
  });
  document.getElementById("prodCatFilter").addEventListener("change", (e) => {
    state.prodCatFilter = e.target.value;
    renderProductRows();
  });
  document.getElementById("prodStockFilter").addEventListener("change", (e) => {
    state.prodStockFilter = e.target.value;
    renderProductRows();
  });

  document.getElementById("galleryFileInput").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const fd = new FormData();
    fd.append("folder", "products");
    files.forEach((f) => fd.append("images", f));
    try {
      toast("Uploading image(s) to Firebase Storage via Render backend…");
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
      if (!lib.urls?.length) return toast("No existing uploaded images found yet.", false);
      lib.urls.slice(0, 4).forEach((u) => {
        if (!state.productImagesDraft.includes(u)) state.productImagesDraft.push(u);
      });
      if (!state.mainImageDraft) state.mainImageDraft = state.productImagesDraft[0] || "";
      renderImageDraftGrid();
      toast(`Imported ${Math.min(4, lib.urls.length)} existing images.`);
    } catch (err) {
      toast(err.message, false);
    }
  });

  document.getElementById("productForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById("pName").value,
      nameBn: document.getElementById("pNameBn").value,
      sku: document.getElementById("pSku").value,
      categoryId: document.getElementById("pCategory").value,
      brand: document.getElementById("pBrand").value,
      price: Number(document.getElementById("pPrice").value),
      originalPrice: Number(document.getElementById("pOrigPrice").value),
      stock: Number(document.getElementById("pStock").value),
      colors: document.getElementById("pColors").value.split(",").map((s) => s.trim()).filter(Boolean),
      sizes: document.getElementById("pSizes").value.split(",").map((s) => s.trim()).filter(Boolean),
      scheduledAt: document.getElementById("pSchedule").value,
      description: document.getElementById("pDesc").value,
      published: document.getElementById("pPublished").checked,
      featured: document.getElementById("pFeatured").checked,
      bestSeller: document.getElementById("pBestSeller").checked,
      trending: document.getElementById("pTrending").checked,
      freeDelivery: document.getElementById("pFreeDel").checked,
      imageUrls: state.productImagesDraft,
      mainImageUrl: state.mainImageDraft || state.productImagesDraft[0] || "",
    };
    try {
      if (state.editingProductId) {
        await api(`/api/admin/catalog/products/${state.editingProductId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast("Product updated and synced!");
      } else {
        await api("/api/admin/catalog/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast("Product added and synced to User Panel!");
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

window.setMainImg = (idx) => { state.mainImageDraft = state.productImagesDraft[idx] || ""; renderImageDraftGrid(); };
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
  if (!p) return;
  state.editingProductId = p.id;
  state.productImagesDraft = Array.isArray(p.imageUrls) ? [...p.imageUrls] : [];
  state.mainImageDraft = p.mainImageUrl || state.productImagesDraft[0] || "";
  renderProducts(document.getElementById("workspace"));
  document.getElementById("pName").value = p.name || "";
  document.getElementById("pNameBn").value = p.nameBn || "";
  document.getElementById("pSku").value = p.sku || "";
  document.getElementById("pCategory").value = p.categoryId || "MOBILES";
  document.getElementById("pBrand").value = p.brand || "";
  document.getElementById("pPrice").value = p.price || 0;
  document.getElementById("pOrigPrice").value = p.originalPrice || p.price || 0;
  document.getElementById("pStock").value = p.stock || 0;
  document.getElementById("pColors").value = (p.colors || []).join(", ");
  document.getElementById("pSizes").value = (p.sizes || []).join(", ");
  document.getElementById("pDesc").value = p.description || "";
  document.getElementById("pPublished").checked = p.published !== false;
  document.getElementById("pFeatured").checked = Boolean(p.featured);
  document.getElementById("pBestSeller").checked = Boolean(p.bestSeller);
  document.getElementById("pTrending").checked = Boolean(p.trending);
  document.getElementById("pFreeDel").checked = Boolean(p.freeDelivery);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.duplicateProduct = async (id) => {
  try {
    await api(`/api/admin/catalog/products/${id}/duplicate`, { method: "POST" });
    toast("Product duplicated.");
    loadTab("products");
  } catch (err) { toast(err.message, false); }
};

window.deleteProduct = async (id) => {
  if (!confirm("Delete this product permanently?")) return;
  try {
    await api(`/api/admin/catalog/products/${id}`, { method: "DELETE" });
    toast("Product deleted.");
    loadTab("products");
  } catch (err) { toast(err.message, false); }
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

function renderProductRows() {
  const q = String(state.prodQuery || "").trim().toLowerCase();
  const cat = state.prodCatFilter || "ALL";
  const stFilter = state.prodStockFilter || "all";
  const body = document.getElementById("productsTableBody");
  if (!body) return;
  const rows = state.products.filter((p) => {
    if (q && !`${p.name} ${p.sku} ${p.brand} ${p.categoryId}`.toLowerCase().includes(q)) return false;
    if (cat !== "ALL" && String(p.categoryId).toUpperCase() !== cat.toUpperCase()) return false;
    const stock = Number(p.stock || 0);
    if (stFilter === "low" && !(stock > 0 && stock <= 5)) return false;
    if (stFilter === "out" && stock > 0) return false;
    return true;
  });
  body.innerHTML =
    rows
      .map(
        (p) => `
      <tr>
        <td>${p.mainImageUrl ? `<img src="${escHtml(p.mainImageUrl)}" style="width:42px;height:42px;object-fit:cover;border-radius:8px;" />` : "—"}</td>
        <td><strong>${escHtml(p.name)}</strong><br><small class="muted">${escHtml(p.sku)} • ${escHtml(p.brand)} • ${escHtml(p.categoryId)}</small></td>
        <td>${money(p.price)}</td>
        <td>${Number(p.stock || 0) <= 0 ? statusBadge("Out") : p.stock <= 5 ? `<span class="status-badge badge-pending">${p.stock} low</span>` : p.stock}</td>
        <td>
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            <button type="button" class="toggle-pill ${p.published !== false ? "on" : ""}" onclick="quickToggleProduct('${escHtml(p.id)}','published',${p.published !== false})">${p.published !== false ? "🟢 Live" : "⚪ Draft"}</button>
            <button type="button" class="toggle-pill ${p.featured ? "on" : ""}" onclick="quickToggleProduct('${escHtml(p.id)}','featured',${Boolean(p.featured)})">⭐ Feat</button>
            <button type="button" class="toggle-pill ${p.trending ? "on" : ""}" onclick="quickToggleProduct('${escHtml(p.id)}','trending',${Boolean(p.trending)})">🔥 Trend</button>
          </div>
        </td>
        <td style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn-outline small" onclick="editProduct('${escHtml(p.id)}')">Edit</button>
          <button class="btn-outline small" onclick="duplicateProduct('${escHtml(p.id)}')">Copy</button>
          <button class="btn-danger small" onclick="deleteProduct('${escHtml(p.id)}')">Delete</button>
        </td>
      </tr>`
      )
      .join("") || `<tr><td colspan="6" class="muted">No products match this filter.</td></tr>`;
}

// ======================== 3. CATEGORIES & BRANDS ========================

function renderCategories(ws) {
  const editCat = state.categories.find((x) => x.id === state.editingCategoryId) || null;
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
        <div class="table-wrap"><table><thead><tr><th>Category</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          ${state.categories.map((c) => `<tr>
            <td>${escHtml(c.emoji || "🗂️")} <strong>${escHtml(c.titleEn)}</strong><br><small class="muted">${escHtml(c.titleBn || c.id)}</small></td>
            <td>${c.orderIndex}</td>
            <td>${c.enabled !== false ? statusBadge("Active") : statusBadge("Cancelled")}</td>
            <td style="display:flex;gap:6px;">
              <button class="btn-outline small" onclick="editCategory('${escHtml(c.id)}')">Edit</button>
              <button class="btn-danger small" onclick="deleteCategory('${escHtml(c.id)}')">Delete</button>
            </td>
          </tr>`).join("")}
        </tbody></table></div>
      </div>

      <div class="card">
        <h3>Manage Brands</h3>
        <form id="brandForm" class="stack-form">
          <label><span>Brand Name</span><input id="bName" required placeholder="NovaTech" /></label>
          <label><span>Tagline</span><input id="bTagline" placeholder="Next-Gen Mobiles" /></label>
          <label><span>Logo URL</span><input id="bLogo" placeholder="https://…" /></label>
          <button type="submit" class="btn-neon">Save Brand</button>
        </form>
        <hr class="divider"/>
        <div class="table-wrap"><table><thead><tr><th>Brand</th><th>Tagline</th><th>Action</th></tr></thead><tbody>
          ${state.brands.map((b) => `<tr><td>${escHtml(b.name)}</td><td>${escHtml(b.tagline)}</td><td><button class="btn-danger small" onclick="deleteBrand('${escHtml(b.id)}')">Delete</button></td></tr>`).join("")}
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
    } catch (err) { toast(err.message, false); }
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
    } catch (err) { toast(err.message, false); }
  });

  document.getElementById("brandForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/api/admin/catalog/brands", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("bName").value,
          tagline: document.getElementById("bTagline").value,
          logoUrl: document.getElementById("bLogo").value,
        }),
      });
      toast("Brand saved!");
      loadTab("categories");
    } catch (err) { toast(err.message, false); }
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
window.deleteCategory = async (id) => {
  if (!confirm("Delete this category?")) return;
  await api(`/api/admin/catalog/categories/${id}`, { method: "DELETE" });
  if (state.editingCategoryId === id) state.editingCategoryId = null;
  loadTab("categories");
};
window.deleteBrand = async (id) => {
  if (!confirm("Delete this brand?")) return;
  await api(`/api/admin/catalog/brands/${id}`, { method: "DELETE" });
  loadTab("categories");
};

// ======================== 4. ORDERS & INVOICES ========================

function renderOrders(ws) {
  const statuses = ["Pending", "Confirmed", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Returned", "Refunded"];
  const filterTabs = ["ALL", "Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];

  ws.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>All Customer Orders (${state.orders.length})</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <input id="orderSearchInput" placeholder="Search order #, address, item…" value="${escHtml(state.orderQuery)}" style="max-width:220px;" />
          <a href="${API_BASE}/api/admin/orders/export/csv" class="btn-outline small" style="text-decoration:none;">⬇ Export Orders CSV</a>
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
            <button class="btn-neon small" onclick="updateOrderStatus('${escHtml(o.userId)}','${escHtml(o.id)}')">Save</button>
            <button class="btn-outline small" onclick="viewOrderItems('${escHtml(o.userId)}','${escHtml(o.id)}')">Items</button>
            <button class="btn-outline small" onclick="printInvoice('${escHtml(o.userId)}','${escHtml(o.id)}')">Invoice</button>
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

window.viewOrderItems = (userId, orderId) => {
  const o = state.orders.find((x) => x.id === orderId && x.userId === userId);
  if (!o) return;
  const overlay = document.getElementById("adminModalOverlay");
  const items = Array.isArray(o.items) ? o.items : [];
  overlay.innerHTML = `
    <div class="modal-dialog">
      <div class="card-header">
        <div>
          <h3>Order ${escHtml(o.orderNumber)}</h3>
          <small class="muted">${escHtml(o.createdAt || "")}</small>
        </div>
        <button type="button" class="icon-btn" onclick="document.getElementById('adminModalOverlay').classList.add('hidden')">✕</button>
      </div>
      <p class="small" style="margin-bottom:10px;"><strong>Ship to:</strong> ${escHtml(o.shippingAddress)}</p>
      <p class="small" style="margin-bottom:12px;"><strong>Payment:</strong> ${escHtml(o.paymentMethod)} (${escHtml(o.paymentStatus)}) ${o.couponCode ? `• Coupon: ${escHtml(o.couponCode)}` : ""}</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Item</th><th>Variant</th><th>Qty</th><th>Price</th></tr></thead>
          <tbody>
            ${items.length
              ? items.map((it) => `<tr>
                  <td><strong>${escHtml(it.productName || it.name)}</strong></td>
                  <td><small class="muted">${escHtml([it.selectedColor, it.selectedSize].filter(Boolean).join(" / ") || "Standard")}</small></td>
                  <td>${it.quantity || it.qty || 1}</td>
                  <td>${money((it.unitPrice || it.price || 0) * (it.quantity || it.qty || 1))}</td>
                </tr>`).join("")
              : `<tr><td colspan="4">${escHtml(o.itemsSummary || "No item breakdown stored.")}</td></tr>`}
          </tbody>
        </table>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:14px;padding-top:10px;border-top:1px solid var(--border-glass);">
        <span class="muted">Delivery: ${money(o.deliveryFee || 0)} • Discount: -${money(o.discountAmount || 0)}</span>
        <strong style="font-size:1.1rem;">Total: ${money(o.totalAmount)}</strong>
      </div>
    </div>
  `;
  overlay.classList.remove("hidden");
};

window.updateOrderStatus = async (userId, orderId) => {
  const orderStatus = document.getElementById(`ost_${orderId}`).value;
  const trackingCode = document.getElementById(`otrk_${orderId}`)?.value.trim() || "";
  try {
    await api(`/api/admin/orders/${userId}/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ orderStatus, trackingCode }),
    });
    toast(`Order updated to ${orderStatus} and synced to User Panel!`);
    loadTab("orders");
  } catch (err) { toast(err.message, false); }
};

window.printInvoice = async (userId, orderId) => {
  try {
    const res = await api(`/api/admin/orders/${userId}/${orderId}/invoice`);
    const win = window.open("", "_blank");
    win.document.write(res.html);
    win.document.close();
    win.print();
  } catch (err) { toast(err.message, false); }
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
            <button class="btn-outline small" onclick="viewCustomerDetail('${escHtml(c.userId)}')">Profile & Edit</button>
            <button class="${c.suspended ? "btn-neon" : "btn-danger"} small" onclick="toggleSuspend('${escHtml(c.userId)}', ${!c.suspended})">
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
    await api(`/api/admin/customers/${uid}/suspend`, { method: "PATCH", body: JSON.stringify({ suspended }) });
    toast(suspended ? "Account suspended." : "Account restored.");
    loadTab("customers");
  } catch (err) { toast(err.message, false); }
};

window.viewCustomerDetail = async (uid) => {
  try {
    const d = await api(`/api/admin/customers/${uid}`);
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
              (t) => `<div class="card" style="margin-top:8px;"><strong>${escHtml(t.subject)}</strong> (${escHtml(t.status)})<p class="muted">${escHtml(t.message)}</p>
                <button class="btn-neon small" onclick="resolveTicket('${escHtml(uid)}','${escHtml(t.id)}')">Mark Resolved</button></div>`
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
  } catch (err) { toast(err.message, false); }
};

window.resolveTicket = async (uid, tid) => {
  const reply = prompt("Enter support response sent to customer:", "Resolved by MY Shop Support.");
  if (!reply) return;
  await api(`/api/admin/customers/${uid}/tickets/${tid}`, { method: "PATCH", body: JSON.stringify({ status: "Resolved", reply }) });
  toast("Support ticket resolved & customer notified!");
  viewCustomerDetail(uid);
};

// ======================== 6. PAYMENTS ========================

function renderPayments(ws) {
  const ps = state.payments.paymentSettings || {};
  const txs = state.payments.transactions || [];
  ws.innerHTML = `
    <div class="card">
      <h3>Gateway Enable / Disable Settings</h3>
      <div class="form-grid" style="margin:12px 0;">
        ${["bKash", "Nagad", "Rocket", "Visa", "Mastercard", "CashOnDelivery"]
          .map(
            (m) => `<label style="flex-direction:row;align-items:center;gap:8px;">
              <input type="checkbox" id="pm_${m}" ${ps[m]?.enabled !== false ? "checked" : ""} style="width:auto;" />
              <span>${m} (${ps[m]?.mode || "SANDBOX"})</span>
            </label>`
          )
          .join("")}
      </div>
      <button class="btn-neon small" id="savePaymentSettingsBtn">Save Payment Settings</button>
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
                  <td>${escHtml(t.paymentStatus)}</td>
                  <td><small>${escHtml(t.transactionRef || "—")}</small></td>
                  <td>${money(t.amount)}</td>
                  <td style="display:flex;gap:6px;">
                    <button class="btn-outline small" onclick="verifyGatewayTx('${escHtml(t.userId)}','${escHtml(t.orderId)}')">Verify</button>
                    ${t.paymentStatus === "PAID_SANDBOX" || t.paymentStatus === "PAID" ? `<button class="btn-danger small" onclick="refundTx('${escHtml(t.userId)}','${escHtml(t.orderId)}')">Refund</button>` : ""}
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
    const r = await api(`/api/admin/marketing/payments/${uid}/${oid}/verify`, { method: "POST" });
    toast(r.message, r.verified);
  } catch (err) { toast(err.message, false); }
};

window.refundTx = async (uid, oid) => {
  if (!confirm("Issue refund for this transaction?")) return;
  try {
    await api(`/api/admin/marketing/payments/${uid}/${oid}/refund`, { method: "POST" });
    toast("Refund processed and customer notified.");
    loadTab("payments");
  } catch (err) { toast(err.message, false); }
};

// ======================== 7. MARKETING, FUN ZONE, AI, CMS, POPUPS, SELLERS, SETTINGS ========================

function renderMarketing(ws) {
  const editCp = state.coupons.find((c) => c.code === state.editingCouponCode) || null;
  ws.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>${editCp ? `Edit Coupon: ${escHtml(editCp.code)}` : "Create Coupon / Flash Deal / BOGO"}</h3>
        ${editCp ? `<button type="button" class="btn-outline small" onclick="cancelEditCoupon()">New Coupon</button>` : ""}
      </div>
      <form id="couponForm" class="form-grid">
        <label><span>Code</span><input id="cpCode" required value="${escHtml(editCp?.code || "")}" placeholder="NEON20" /></label>
        <label><span>Title</span><input id="cpTitle" required value="${escHtml(editCp?.title || "")}" placeholder="20% Off Electronics" /></label>
        <label><span>Type</span><select id="cpType">
          <option value="PERCENT" ${(!editCp || editCp?.discountType === "PERCENT") ? "selected" : ""}>PERCENT</option>
          <option value="FIXED" ${editCp?.discountType === "FIXED" ? "selected" : ""}>FIXED</option>
          <option value="FREE_DELIVERY" ${editCp?.discountType === "FREE_DELIVERY" ? "selected" : ""}>FREE_DELIVERY</option>
        </select></label>
        <label><span>Value</span><input id="cpVal" type="number" value="${editCp?.value ?? 20}" /></label>
        <label><span>Min Spend (৳)</span><input id="cpMin" type="number" value="${editCp?.minSpend ?? 1000}" /></label>
        <label><span>Expires Label</span><input id="cpExp" value="${escHtml(editCp?.expiresLabel || "Flash Deal 48h")}" /></label>
        <label><span>Expiration Date (optional)</span><input id="cpExpDate" type="date" value="${escHtml(editCp?.expiresAt ? String(editCp.expiresAt).slice(0, 10) : "")}" /></label>
        <div style="display:flex;align-items:flex-end;">
          <button type="submit" class="btn-neon full-width">${editCp ? "Update Coupon" : "Save Coupon"}</button>
        </div>
      </form>
      <hr class="divider"/>
      <div class="table-wrap"><table><thead><tr><th>Code</th><th>Title</th><th>Value</th><th>Min Spend</th><th>Expires</th><th>Actions</th></tr></thead><tbody>
        ${state.coupons.map((c) => `<tr>
          <td><strong>${escHtml(c.code)}</strong></td>
          <td>${escHtml(c.title)}</td>
          <td>${c.value} (${escHtml(c.discountType)})</td>
          <td>${money(c.minSpend)}</td>
          <td><small class="muted">${escHtml(c.expiresAt ? String(c.expiresAt).slice(0, 10) : c.expiresLabel || "Active")}</small></td>
          <td style="display:flex;gap:6px;">
            <button class="btn-outline small" onclick="editCoupon('${escHtml(c.code)}')">Edit</button>
            <button class="btn-danger small" onclick="delCoupon('${escHtml(c.code)}')">Delete</button>
          </td>
        </tr>`).join("")}
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
          expiresLabel: document.getElementById("cpExp").value,
          expiresAt: document.getElementById("cpExpDate").value || "",
        }),
      });
      state.editingCouponCode = null;
      toast("Coupon synced to MY Shop User Panel!");
      loadTab("marketing");
    } catch (err) {
      toast(err.message, false);
    }
  });
}
window.editCoupon = (code) => {
  state.editingCouponCode = code;
  renderMarketing(document.getElementById("workspace"));
};
window.cancelEditCoupon = () => {
  state.editingCouponCode = null;
  renderMarketing(document.getElementById("workspace"));
};
window.delCoupon = async (code) => {
  if (!confirm(`Delete coupon ${code}?`)) return;
  await api(`/api/admin/marketing/coupons/${code}`, { method: "DELETE" });
  if (state.editingCouponCode === code) state.editingCouponCode = null;
  loadTab("marketing");
};

function renderFunZone(ws) {
  const f = state.funZone;
  ws.innerHTML = `<div class="card"><h3>MY Fun Zone Reward Rules & Limits</h3><form id="fzForm" class="stack-form">
    <div class="form-grid">
      <label><span>Daily Spin Limit</span><input id="fzSpinLim" type="number" value="${f.dailySpinLimit ?? 1}"/></label>
      <label><span>Daily Scratch Limit</span><input id="fzScratchLim" type="number" value="${f.dailyScratchLimit ?? 1}"/></label>
      <label><span>Streak Base Points</span><input id="fzStreak" type="number" value="${f.streakPointsBase ?? 25}"/></label>
      <label><span>Referral Bonus Points</span><input id="fzRef" type="number" value="${f.referralBonusPoints ?? 200}"/></label>
    </div>
    <button type="submit" class="btn-neon">Save Fun Zone Rules</button>
  </form></div>`;
  document.getElementById("fzForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await api("/api/admin/marketing/fun-zone", {
      method: "PUT",
      body: JSON.stringify({
        dailySpinLimit: Number(document.getElementById("fzSpinLim").value),
        dailyScratchLimit: Number(document.getElementById("fzScratchLim").value),
        streakPointsBase: Number(document.getElementById("fzStreak").value),
        referralBonusPoints: Number(document.getElementById("fzRef").value),
      }),
    });
    toast("Fun Zone rules saved!");
  });
}

function renderAiSettings(ws) {
  const a = state.aiSettings;
  ws.innerHTML = `<div class="card"><h3>AI Shopping Assistant Configuration</h3><form id="aiForm" class="stack-form">
    <label><span>Assistant Name</span><input id="aiName" value="${escHtml(a.assistantName || "MY AI Shopping Assistant")}" /></label>
    <label><span>Welcome Message</span><textarea id="aiWelcome" rows="2">${escHtml(a.welcomeMessage || "")}</textarea></label>
    <label><span>Model Name</span><input id="aiModel" value="${escHtml(a.modelName || "gemini-3.8-flash")}" /></label>
    <label><span>Recommendation Rules</span><textarea id="aiRules" rows="2">${escHtml(a.recommendationRule || "")}</textarea></label>
    <button type="submit" class="btn-neon">Save AI Settings</button>
  </form></div>`;
  document.getElementById("aiForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await api("/api/admin/marketing/ai-settings", {
      method: "PUT",
      body: JSON.stringify({
        assistantName: document.getElementById("aiName").value,
        welcomeMessage: document.getElementById("aiWelcome").value,
        modelName: document.getElementById("aiModel").value,
        recommendationRule: document.getElementById("aiRules").value,
      }),
    });
    toast("AI Settings saved!");
  });
}

function renderCms(ws) {
  const s = state.siteConfig || {};
  const banners = Array.isArray(s.banners) ? s.banners : [];
  const editBan = banners.find((b) => b.id === state.editingBannerId) || null;

  ws.innerHTML = `
    <div class="two-col">
      <div class="card">
        <h3>Website Customization (Syncs to User Panel)</h3>
        <form id="cmsForm" class="stack-form" style="margin-top:10px;">
          <div class="form-grid">
            <label><span>Website Name</span><input id="cmsName" value="${escHtml(s.siteName || "MY Shop")}" /></label>
            <label><span>Tagline</span><input id="cmsTagline" value="${escHtml(s.tagline || "Shop Smart • Live Happy!")}" /></label>
            <label><span>Logo URL</span><input id="cmsLogo" value="${escHtml(s.logoUrl || "")}" /></label>
            <label><span>Favicon URL</span><input id="cmsFavicon" value="${escHtml(s.faviconUrl || "")}" /></label>
            <label><span>Contact Email</span><input id="cmsEmail" value="${escHtml(s.contactEmail || "")}" /></label>
            <label><span>Contact Phone</span><input id="cmsPhone" value="${escHtml(s.contactPhone || "")}" /></label>
            <label><span>Primary Color</span><input id="cmsPrimary" value="${escHtml(s.primaryHex || "#8B5CF6")}" /></label>
            <label><span>Accent Color</span><input id="cmsAccent" value="${escHtml(s.accentHex || "#00D4FF")}" /></label>
          </div>
          <label><span>Announcement Bar Text</span><input id="cmsAnnounce" value="${escHtml(s.announcementText || "")}" /></label>
          <label style="flex-direction:row;gap:8px;align-items:center;"><input type="checkbox" id="cmsMaint" ${s.maintenanceMode ? "checked" : ""} style="width:auto;" /> Maintenance Mode</label>
          <button type="submit" class="btn-neon">Save Website Customization</button>
        </form>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>${editBan ? "Edit Homepage Hero Banner" : "Homepage Hero Banner Manager"}</h3>
          ${editBan ? `<button type="button" class="btn-outline small" onclick="cancelEditBanner()">New Banner</button>` : ""}
        </div>
        <form id="bannerForm" class="stack-form">
          <div class="form-grid">
            <label><span>Banner Title *</span><input id="banTitle" required value="${escHtml(editBan?.title || "")}" placeholder="Eid Mega Tech Drop" /></label>
            <label><span>Badge Label</span><input id="banBadge" value="${escHtml(editBan?.badge || "✨ FEATURED DROP")}" placeholder="⚡ LIMITED DEAL" /></label>
            <label><span>CTA Button Text</span><input id="banCta" value="${escHtml(editBan?.ctaText || "Shop Now →")}" /></label>
            <label><span>Destination Link / Route</span><input id="banLink" value="${escHtml(editBan?.linkUrl || "#catalog")}" placeholder="#catalog or /explore" /></label>
            <label><span>Start Date (optional)</span><input id="banStart" type="date" value="${escHtml(editBan?.startDate || "")}" /></label>
            <label><span>End Date (optional)</span><input id="banEnd" type="date" value="${escHtml(editBan?.endDate || "")}" /></label>
          </div>
          <label><span>Subtitle</span><input id="banSub" value="${escHtml(editBan?.subtitle || "")}" placeholder="Up to 35% off smartphones & audio gear" /></label>
          <div class="form-grid">
            <label><span>Banner Image URL</span><input id="banImg" value="${escHtml(editBan?.imageUrl || "")}" placeholder="https://… (or upload)" /></label>
            <div style="display:flex;align-items:flex-end;">
              <input type="file" id="banImgUpload" accept="image/jpeg,image/png,image/webp" class="hidden" />
              <button type="button" class="btn-outline small" onclick="document.getElementById('banImgUpload').click()">📷 Upload Banner Image</button>
            </div>
          </div>
          <label style="flex-direction:row;align-items:center;gap:8px;">
            <input type="checkbox" id="banActive" ${editBan?.active !== false ? "checked" : ""} style="width:auto;" />
            <span>Active on Hero Carousel</span>
          </label>
          <button type="submit" class="btn-neon">${editBan ? "Update Banner" : "Publish Banner to Storefront"}</button>
        </form>
      </div>
    </div>

    <div class="card">
      <h3>Active Storefront Banners (${banners.length})</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Image</th><th>Title</th><th>Schedule</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${banners
              .map(
                (b) => `
              <tr>
                <td>${b.imageUrl ? `<img src="${escHtml(b.imageUrl)}" style="width:68px;height:40px;object-fit:cover;border-radius:8px;" />` : "🎨 Default"}</td>
                <td><strong>${escHtml(b.title)}</strong><br><small class="muted">${escHtml(b.subtitle || b.badge || "")}</small></td>
                <td><small class="muted">${escHtml(b.startDate || "Always")} → ${escHtml(b.endDate || "∞")}</small></td>
                <td>${b.active !== false ? statusBadge("Active") : statusBadge("Cancelled")}</td>
                <td style="display:flex;gap:6px;">
                  <button class="btn-outline small" onclick="editBanner('${escHtml(b.id)}')">Edit</button>
                  <button class="btn-danger small" onclick="delBanner('${escHtml(b.id)}')">Delete</button>
                </td>
              </tr>`
              )
              .join("") || `<tr><td colspan="5" class="muted">No custom banners yet. The storefront shows the default Cyber Mega Deals hero until you add one above.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("cmsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/api/admin/cms/site-config", {
        method: "PUT",
        body: JSON.stringify({
          siteName: document.getElementById("cmsName").value,
          tagline: document.getElementById("cmsTagline").value,
          logoUrl: document.getElementById("cmsLogo").value,
          faviconUrl: document.getElementById("cmsFavicon").value,
          contactEmail: document.getElementById("cmsEmail").value,
          contactPhone: document.getElementById("cmsPhone").value,
          primaryHex: document.getElementById("cmsPrimary").value,
          accentHex: document.getElementById("cmsAccent").value,
          announcementText: document.getElementById("cmsAnnounce").value,
          announcementActive: true,
          maintenanceMode: document.getElementById("cmsMaint").checked,
        }),
      });
      toast("Website customization saved & published!");
    } catch (err) { toast(err.message, false); }
  });

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
        toast("Banner image uploaded!");
      }
    } catch (err) { toast(err.message, false); }
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
          active: document.getElementById("banActive").checked,
        }),
      });
      state.siteConfig.banners = res.banners || [];
      state.editingBannerId = null;
      toast("Homepage banner synced live!");
      renderCms(ws);
    } catch (err) { toast(err.message, false); }
  });
}

window.editBanner = (id) => {
  state.editingBannerId = id;
  renderCms(document.getElementById("workspace"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};
window.cancelEditBanner = () => {
  state.editingBannerId = null;
  renderCms(document.getElementById("workspace"));
};
window.delBanner = async (id) => {
  if (!confirm("Delete this storefront banner?")) return;
  try {
    const res = await api(`/api/admin/cms/banners/${encodeURIComponent(id)}`, { method: "DELETE" });
    state.siteConfig.banners = res.banners || [];
    if (state.editingBannerId === id) state.editingBannerId = null;
    toast("Banner removed.");
    renderCms(document.getElementById("workspace"));
  } catch (err) { toast(err.message, false); }
};

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
      <div style="height:46px;border-radius:12px;background:rgba(139,92,246,0.22);border:1px solid rgba(255,255,255,0.12);"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="height:92px;border-radius:12px;background:rgba(0,212,255,0.12);"></div>
        <div style="height:92px;border-radius:12px;background:rgba(255,46,147,0.12);"></div>
      </div>
    </div>
    ${cfg.enabled ? `
      <div class="fab-preview-anchor ${escHtml(cfg.position)}">
        ${state.previewSocialOpen ? `
          <div class="fab-menu-stack" style="background:${escHtml(cfg.menuBgHex)}cc;padding:8px;border-radius:16px;border:1px solid rgba(0,212,255,0.35);">
            ${cfg.welcomeText ? `<small style="color:#cbd5e1;font-size:0.7rem;padding:0 4px;">${escHtml(cfg.welcomeText)}</small>` : ""}
            ${enabledPlatforms.map((p, idx) => `
              <div class="fab-social-pill" style="background:${escHtml(p.colorHex)};animation-delay:${idx * 55}ms;">
                ${p.iconUrl ? `<img src="${escHtml(p.iconUrl)}" style="width:16px;height:16px;border-radius:50%;object-fit:cover;" />` : `<span>${platformGlyph(p.id)}</span>`}
                <span>${escHtml(p.name)}</span>
              </div>
            `).join("") || `<small class="muted">No platforms enabled</small>`}
          </div>
        ` : ""}
        <button type="button" id="toggleSocialPreviewFab" class="fab-main-circle ${escHtml(cfg.buttonSize)} ${state.previewSocialOpen ? "open" : ""}" style="background:linear-gradient(135deg,${escHtml(cfg.primaryHex)},#00D4FF);" title="Click to test + / X animation">+</button>
      </div>
    ` : `<div style="text-align:center;padding:12px;"><small class="muted">Floating Support Button is currently disabled.</small></div>`}
  `;

  document.getElementById("toggleSocialPreviewFab")?.addEventListener("click", () => {
    state.previewSocialOpen = !state.previewSocialOpen;
    updateSocialPreviewStage();
  });
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
            <small class="muted">${state.socialMeta?.hasDraftChanges ? "⚠️ Unpublished draft changes" : state.socialMeta?.hasPublished ? "🟢 Live on MY Shop User Panel" : "Configure URLs & Publish"}</small>
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
          <small class="muted">Enter full https:// URLs or leave blank until ready. Upload custom icons directly to Firebase Storage via Render.</small>

          ${(s.platforms || defaultSocialPlatformsFallback()).map((p) => `
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
            </div>
          `).join("")}

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

  // Live re-render preview when editing any social field
  document.getElementById("socialSupportForm").addEventListener("input", updateSocialPreviewStage);
  document.getElementById("socialSupportForm").addEventListener("change", updateSocialPreviewStage);
  document.getElementById("socEnabled").addEventListener("change", updateSocialPreviewStage);

  // Direct image upload per platform
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
      toast("Social support settings published live to MY Shop User Panel!");
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
          <strong style="font-size:0.85rem;color:#00D4FF;">${escHtml(p.subtitle || "Shop Smart • Live Happy!")}</strong>
        </div>
        <span style="width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,0.12);display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;">✕</span>
      </div>
      ${p.imageUrl ? `<img src="${escHtml(p.imageUrl)}" style="width:100%;height:110px;object-fit:cover;border-radius:12px;margin-bottom:10px;" />` : `<div style="height:64px;border-radius:12px;background:linear-gradient(135deg,rgba(139,92,246,0.35),rgba(0,212,255,0.28));display:flex;align-items:center;justify-content:center;margin-bottom:10px;font-size:1.3rem;">🛍️ ✨ 🎁</div>`}
      <h3 style="font-size:1.1rem;font-weight:800;margin-bottom:6px;">${escHtml(p.title)}</h3>
      <p style="font-size:0.8rem;color:#cbd5e1;line-height:1.45;">${escHtml(p.description)}</p>
      ${p.includeSocialButtons ? `
        <div class="popup-3d-social-row">
          ${platforms.map((pl) => `<span style="background:${escHtml(pl.colorHex)};padding:5px 9px;border-radius:999px;font-size:0.72rem;font-weight:700;color:#fff;">${platformGlyph(pl.id)} ${escHtml(pl.name.split(" ")[0])}</span>`).join("")}
        </div>
      ` : ""}
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
                <option value="ONCE_PER_DAY" ${(!editItem || editItem?.frequency === "ONCE_PER_DAY") ? "selected" : ""}>Once Per Day</option>
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
            <label><span>Start Date (YYYY-MM-DD)</span><input id="popStart" type="date" value="${escHtml(editItem?.startDate || "")}" /></label>
            <label><span>End Date (YYYY-MM-DD)</span><input id="popEnd" type="date" value="${escHtml(editItem?.endDate || "")}" /></label>
          </div>

          <div class="form-grid">
            <label><span>Popup Banner / 3D Image URL</span><input id="popImg" value="${escHtml(editItem?.imageUrl || "")}" placeholder="https://… (or upload below)" /></label>
            <div style="display:flex;align-items:flex-end;">
              <input type="file" id="popImgUpload" accept="image/jpeg,image/png,image/webp" class="hidden" />
              <button type="button" class="btn-outline small" onclick="document.getElementById('popImgUpload').click()">📷 Upload Popup Image</button>
            </div>
          </div>

          <label><span>Popup Description / Message</span><textarea id="popDesc" rows="2">${escHtml(editItem?.description || "Join our official social communities and never miss exciting offers, updates and support.")}</textarea></label>

          <div class="badge-row">
            <label style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" id="popSocialBtns" ${editItem?.includeSocialButtons !== false ? "checked" : ""} style="width:auto;" /> Show Social Support Buttons (FB, YT, TikTok, TG)</label>
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
            ${state.popups.map((p) => `
              <tr>
                <td><strong>${escHtml(p.title)}</strong><br><small class="muted">${escHtml(p.subtitle || "")}</small></td>
                <td>${escHtml(p.frequency || "ONCE_PER_SESSION")}</td>
                <td>${escHtml(p.targetAudience || "ALL")}</td>
                <td>${p.active ? "🟢 Live" : "⚪ Paused"}</td>
                <td style="display:flex;gap:6px;">
                  <button class="btn-outline small" onclick="editPopupItem('${escHtml(p.id)}')">Edit</button>
                  <button class="btn-danger small" onclick="delPopup('${escHtml(p.id)}')">Delete</button>
                </td>
              </tr>`).join("") || `<tr><td colspan="5" class="muted">No popups published yet. Use the 3D builder above!</td></tr>`}
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
  if (!confirm("Delete this popup notice?")) return;
  await api(`/api/admin/cms/popups/${id}`, { method: "DELETE" });
  if (state.editingPopupId === id) state.editingPopupId = null;
  loadTab("popups");
};

function renderSellersDelivery(ws) {
  ws.innerHTML = `<div class="two-col">
    <div class="card"><h3>Sellers (${state.sellers.length})</h3><form id="selForm" class="stack-form">
      <label><span>Seller Name</span><input id="selName" required /></label>
      <label><span>Commission %</span><input id="selComm" type="number" value="10" /></label>
      <button type="submit" class="btn-neon">Add Seller</button>
    </form><hr class="divider"/>${state.sellers.map((s) => `<p>${escHtml(s.name)} — ${escHtml(s.status)} (${s.commissionPercent}%)</p>`).join("")}</div>
    <div class="card"><h3>Delivery Zones (${state.deliveryZones.length})</h3><form id="delForm" class="stack-form">
      <label><span>Zone Name</span><input id="dzName" required placeholder="Dhaka Metro" /></label>
      <label><span>Fee (৳)</span><input id="dzFee" type="number" value="60" /></label>
      <button type="submit" class="btn-neon">Save Zone</button>
    </form><hr class="divider"/>${state.deliveryZones.map((z) => `<p>${escHtml(z.zoneName)} — ৳${z.fee}</p>`).join("")}</div>
  </div>`;
  document.getElementById("selForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await api("/api/admin/settings/sellers", { method: "POST", body: JSON.stringify({ name: document.getElementById("selName").value, commissionPercent: Number(document.getElementById("selComm").value) }) });
    loadTab("sellers");
  });
  document.getElementById("delForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await api("/api/admin/settings/delivery", { method: "POST", body: JSON.stringify({ zoneName: document.getElementById("dzName").value, fee: Number(document.getElementById("dzFee").value) }) });
    loadTab("sellers");
  });
}

function renderReviewsContent(ws) {
  ws.innerHTML = `<div class="card"><h3>Customer Reviews (${state.reviews.length})</h3>
    ${state.reviews.map((r) => `<div style="padding:8px 0;border-bottom:1px solid var(--border-glass);"><strong>${escHtml(r.authorName)}</strong> (${r.rating}★) — ${escHtml(r.comment)} <button class="btn-danger small" onclick="delReview('${escHtml(r.userId)}','${escHtml(r.id)}')">Remove</button></div>`).join("") || `<p class="muted">No user reviews yet.</p>`}
  </div>`;
}
window.delReview = async (uid, rid) => { await api(`/api/admin/cms/reviews/${uid}/${rid}`, { method: "DELETE" }); loadTab("reviews"); };

function renderNotifications(ws) {
  ws.innerHTML = `<div class="card"><h3>Broadcast Notification to MY Shop Customers</h3><form id="notifForm" class="stack-form">
    <label><span>Title</span><input id="nTitle" required placeholder="Flash Sale Starting Now!" /></label>
    <label><span>Message Body</span><textarea id="nBody" required rows="3"></textarea></label>
    <label><span>Category</span><select id="nCat"><option>FLASH_SALE</option><option>REWARD</option><option>ORDER</option><option>PRICE_DROP</option></select></label>
    <button type="submit" class="btn-neon">Send Notification</button>
  </form></div>`;
  document.getElementById("notifForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const res = await api("/api/admin/cms/notifications/broadcast", {
      method: "POST",
      body: JSON.stringify({
        title: document.getElementById("nTitle").value,
        body: document.getElementById("nBody").value,
        category: document.getElementById("nCat").value,
      }),
    });
    toast(`Notification delivered to ${res.sentCount} customer(s)!`);
  });
}

function renderReports(ws) {
  const m = state.dashboard?.metrics || {};
  ws.innerHTML = `<div class="card">
    <h3>Reports & CSV Export</h3>
    <p class="muted">Total Revenue: ${money(m.totalRevenue)} • Orders: ${m.totalOrders ?? 0} • Customers: ${m.totalCustomers ?? 0}</p>
    <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
      <a href="${API_BASE}/api/admin/orders/export/csv" class="btn-neon small" style="text-decoration:none;">Download Orders CSV Report</a>
      <button class="btn-outline small" id="downloadBackupBtn">Export Full Store JSON Backup</button>
    </div>
  </div>`;
  document.getElementById("downloadBackupBtn").addEventListener("click", async () => {
    const data = await api("/api/admin/settings/backup");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `myshop-backup-${Date.now()}.json`;
    a.click();
  });
}

function renderSettings(ws) {
  ws.innerHTML = `<div class="two-col">
    <div class="card"><h3>Change Admin Password</h3><form id="pwForm" class="stack-form">
      <label><span>Current Password</span><input type="password" id="curPw" required /></label>
      <label><span>New Password (10+ chars)</span><input type="password" id="newPw" required /></label>
      <button type="submit" class="btn-neon">Update Password & Revoke Old Sessions</button>
    </form></div>
    <div class="card"><h3>Recent Admin Audit Logs</h3>
      <div style="max-height:280px;overflow-y:auto;font-size:0.8rem;">
        ${state.auditLogs.map((l) => `<div style="padding:6px 0;border-bottom:1px solid var(--border-glass);"><strong>${escHtml(l.action)}</strong> • ${escHtml(l.targetPath)}</div>`).join("") || `<p class="muted">No audit logs yet.</p>`}
      </div>
    </div>
  </div>`;
  document.getElementById("pwForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const r = await api("/api/admin/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: document.getElementById("curPw").value, newPassword: document.getElementById("newPw").value }),
      });
      toast(r.message);
    } catch (err) { toast(err.message, false); }
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
    } catch (err) { showLogin(err.message); }
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
    } catch (err) { showLogin(err.message); }
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
