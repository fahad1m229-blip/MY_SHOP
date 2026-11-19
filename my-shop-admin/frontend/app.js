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
  popups: [],
  sellers: [],
  deliveryZones: [],
  reviews: [],
  contentPages: [],
  auditLogs: [],
  productImagesDraft: [],
  mainImageDraft: "",
  editingProductId: null,
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
      case "popups":
        state.popups = (await api("/api/admin/cms/popups")).items || [];
        document.getElementById("pageTitle").textContent = "Popup Notice & Announcement Manager";
        renderPopups(ws);
        break;
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
  const kpis = [
    ["Total Products", m.totalProducts ?? 0],
    ["Total Categories", m.totalCategories ?? 0],
    ["Total Customers", m.totalCustomers ?? 0],
    ["Total Orders", m.totalOrders ?? 0],
    ["Pending Orders", m.pendingOrders ?? 0],
    ["Completed Orders", m.completedOrders ?? 0],
    ["Cancelled Orders", m.cancelledOrders ?? 0],
    ["Total Revenue", money(m.totalRevenue)],
    ["Today's Revenue", money(m.todayRevenue)],
    ["Monthly Revenue", money(m.monthlyRevenue)],
    ["Pending Payments", m.pendingPayments ?? 0],
    ["Total Sellers", m.totalSellers ?? 0],
    ["Low Stock (<=5)", m.lowStockCount ?? 0],
    ["Out of Stock", m.outOfStockCount ?? 0],
  ];

  ws.innerHTML = `
    <div class="kpi-grid">
      ${kpis
        .map(
          ([label, val]) => `<div class="kpi-card"><div class="kpi-label">${escHtml(label)}</div><div class="kpi-value">${escHtml(val)}</div></div>`
        )
        .join("")}
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Sales & Revenue Analytics</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn-neon small" onclick="loadTab('products')">+ Add Product</button>
          <button class="btn-outline small" onclick="loadTab('popups')">+ Popup Notice</button>
          <button class="btn-outline small" onclick="loadTab('orders')">View Orders</button>
        </div>
      </div>
      <canvas id="revenueChart" height="190" style="width:100%;"></canvas>
    </div>

    <div class="two-col">
      <div class="card">
        <h3>Recent Orders</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Total</th><th>Status</th><th>Payment</th></tr></thead>
            <tbody>
              ${(state.dashboard?.recentOrders || [])
                .map(
                  (o) => `<tr><td>${escHtml(o.orderNumber)}</td><td>${money(o.totalAmount)}</td><td>${escHtml(o.orderStatus)}</td><td>${escHtml(o.paymentStatus)}</td></tr>`
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
            .join("")}
        </ul>
      </div>
    </div>
  `;

  drawRevenueChart(series);
}

function drawRevenueChart(series) {
  const canvas = document.getElementById("revenueChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.clientWidth || 640;
  canvas.width = width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  if (!series.length) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px sans-serif";
    ctx.fillText("Revenue bars appear once verified orders arrive in the shared Firestore database.", 16, height / 2);
    return;
  }

  const maxRev = Math.max(100, ...series.map((s) => Number(s.revenue || 0)));
  const barW = Math.max(18, Math.floor((width - 40) / series.length) - 10);
  series.forEach((pt, idx) => {
    const x = 24 + idx * (barW + 10);
    const barH = Math.max(8, Math.round((Number(pt.revenue || 0) / maxRev) * (height - 52)));
    const y = height - 28 - barH;
    const grad = ctx.createLinearGradient(x, y, x, height - 28);
    grad.addColorStop(0, "#00D4FF");
    grad.addColorStop(1, "#8B5CF6");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px sans-serif";
    ctx.fillText(String(pt.date || "").slice(5), x, height - 10);
  });
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
        <input id="prodSearch" placeholder="Search name, SKU, brand…" style="max-width:260px;" />
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Image</th><th>Product</th><th>Price</th><th>Stock</th><th>Flags</th><th>Actions</th></tr></thead>
          <tbody id="productsTableBody"></tbody>
        </table>
      </div>
    </div>
  `;

  renderImageDraftGrid();
  renderProductRows("");

  document.getElementById("prodSearch").addEventListener("input", (e) => renderProductRows(e.target.value));

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

function renderProductRows(filter) {
  const q = filter.trim().toLowerCase();
  const body = document.getElementById("productsTableBody");
  if (!body) return;
  const rows = state.products.filter((p) => !q || `${p.name} ${p.sku} ${p.brand}`.toLowerCase().includes(q));
  body.innerHTML =
    rows
      .map(
        (p) => `
      <tr>
        <td>${p.mainImageUrl ? `<img src="${escHtml(p.mainImageUrl)}" style="width:42px;height:42px;object-fit:cover;border-radius:8px;" />` : "—"}</td>
        <td><strong>${escHtml(p.name)}</strong><br><small class="muted">${escHtml(p.sku)} • ${escHtml(p.brand)}</small></td>
        <td>${money(p.price)}</td>
        <td>${p.stock}</td>
        <td>${p.published ? "🟢" : "⚪"} ${p.featured ? "⭐" : ""} ${p.trending ? "🔥" : ""}</td>
        <td style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn-outline small" onclick="editProduct('${escHtml(p.id)}')">Edit</button>
          <button class="btn-outline small" onclick="duplicateProduct('${escHtml(p.id)}')">Copy</button>
          <button class="btn-danger small" onclick="deleteProduct('${escHtml(p.id)}')">Delete</button>
        </td>
      </tr>`
      )
      .join("") || `<tr><td colspan="6" class="muted">No products found in shared Firestore yet. Add one above!</td></tr>`;
}

// ======================== 3. CATEGORIES & BRANDS ========================

function renderCategories(ws) {
  ws.innerHTML = `
    <div class="two-col">
      <div class="card">
        <h3>Add / Update Category</h3>
        <form id="catForm" class="stack-form">
          <label><span>Category ID / Name (EN)</span><input id="cTitle" required placeholder="Smart Watches" /></label>
          <label><span>Name (BN)</span><input id="cTitleBn" placeholder="স্মার্টওয়াচ" /></label>
          <label><span>Image URL (or upload in Products)</span><input id="cImg" placeholder="https://…" /></label>
          <label><span>Subcategories (comma-separated)</span><input id="cSubs" placeholder="AMOLED, Rugged, Kids" /></label>
          <label><span>Order Index</span><input id="cOrder" type="number" value="1" /></label>
          <button type="submit" class="btn-neon">Save Category</button>
        </form>
        <hr class="divider"/>
        <div class="table-wrap"><table><thead><tr><th>Category</th><th>Order</th><th>Action</th></tr></thead><tbody>
          ${state.categories.map((c) => `<tr><td>${escHtml(c.titleEn)}</td><td>${c.orderIndex}</td><td><button class="btn-danger small" onclick="deleteCategory('${escHtml(c.id)}')">Delete</button></td></tr>`).join("")}
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

  document.getElementById("catForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/api/admin/catalog/categories", {
        method: "POST",
        body: JSON.stringify({
          titleEn: document.getElementById("cTitle").value,
          titleBn: document.getElementById("cTitleBn").value,
          imageUrl: document.getElementById("cImg").value,
          subcategories: document.getElementById("cSubs").value.split(",").map((s) => s.trim()).filter(Boolean),
          orderIndex: Number(document.getElementById("cOrder").value),
        }),
      });
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

window.deleteCategory = async (id) => { await api(`/api/admin/catalog/categories/${id}`, { method: "DELETE" }); loadTab("categories"); };
window.deleteBrand = async (id) => { await api(`/api/admin/catalog/brands/${id}`, { method: "DELETE" }); loadTab("categories"); };

// ======================== 4. ORDERS & INVOICES ========================

function renderOrders(ws) {
  const statuses = ["Pending", "Confirmed", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Returned", "Refunded"];
  ws.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>All Customer Orders (${state.orders.length})</h3>
        <a href="${API_BASE}/api/admin/orders/export/csv" class="btn-outline small" style="text-decoration:none;">⬇ Export Orders CSV</a>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Order #</th><th>Summary</th><th>Total</th><th>Payment</th><th>Status</th><th>Update</th></tr></thead>
          <tbody>
            ${state.orders
              .map(
                (o) => `
              <tr>
                <td><strong>${escHtml(o.orderNumber)}</strong><br><small class="muted">${escHtml(o.trackingCode || "")}</small></td>
                <td>${escHtml(o.itemsSummary)}<br><small class="muted">${escHtml(o.shippingAddress)}</small></td>
                <td>${money(o.totalAmount)}</td>
                <td>${escHtml(o.paymentMethod)}<br><small>${escHtml(o.paymentStatus)}</small></td>
                <td>
                  <select id="ost_${escHtml(o.id)}">
                    ${statuses.map((st) => `<option ${o.orderStatus === st ? "selected" : ""}>${st}</option>`).join("")}
                  </select>
                </td>
                <td style="display:flex;gap:6px;">
                  <button class="btn-neon small" onclick="updateOrderStatus('${escHtml(o.userId)}','${escHtml(o.id)}')">Save</button>
                  <button class="btn-outline small" onclick="printInvoice('${escHtml(o.userId)}','${escHtml(o.id)}')">Invoice</button>
                </td>
              </tr>`
              )
              .join("") || `<tr><td colspan="6" class="muted">No orders recorded yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

window.updateOrderStatus = async (userId, orderId) => {
  const orderStatus = document.getElementById(`ost_${orderId}`).value;
  const trackingCode = prompt("Optional Tracking Code (leave blank to keep):", "") || "";
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
      <h3>Registered MY Shop Customers (${state.customers.length})</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Customer</th><th>Email</th><th>Points</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${state.customers
              .map(
                (c) => `
              <tr>
                <td><strong>${escHtml(c.displayName)}</strong></td>
                <td>${escHtml(c.email)}</td>
                <td>${c.points}</td>
                <td>${c.suspended ? "🔴 Suspended" : "🟢 Active"}</td>
                <td style="display:flex;gap:6px;">
                  <button class="btn-outline small" onclick="viewCustomerDetail('${escHtml(c.userId)}')">Profile & Orders</button>
                  <button class="${c.suspended ? "btn-neon" : "btn-danger"} small" onclick="toggleSuspend('${escHtml(c.userId)}', ${!c.suspended})">
                    ${c.suspended ? "Restore" : "Suspend"}
                  </button>
                </td>
              </tr>`
              )
              .join("") || `<tr><td colspan="5" class="muted">No registered customers yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
    <div id="customerDetailCard"></div>
  `;
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
    document.getElementById("customerDetailCard").innerHTML = `
      <div class="card">
        <h3>Customer Details: ${escHtml(d.customer.displayName)} (${escHtml(d.customer.email)})</h3>
        <p class="muted">Orders: ${d.orders.length} • Addresses: ${d.addresses.length} • Support Tickets: ${d.supportTickets.length}</p>
        ${(d.supportTickets || [])
          .map(
            (t) => `<div class="card" style="margin-top:8px;"><strong>${escHtml(t.subject)}</strong> (${escHtml(t.status)})<p class="muted">${escHtml(t.message)}</p>
              <button class="btn-neon small" onclick="resolveTicket('${escHtml(uid)}','${escHtml(t.id)}')">Mark Resolved</button></div>`
          )
          .join("")}
      </div>`;
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
  ws.innerHTML = `
    <div class="card">
      <h3>Create Coupon / Flash Deal / BOGO</h3>
      <form id="couponForm" class="form-grid">
        <label><span>Code</span><input id="cpCode" required placeholder="NEON20" /></label>
        <label><span>Title</span><input id="cpTitle" required placeholder="20% Off Electronics" /></label>
        <label><span>Type</span><select id="cpType"><option>PERCENT</option><option>FIXED</option><option>FREE_DELIVERY</option></select></label>
        <label><span>Value</span><input id="cpVal" type="number" value="20" /></label>
        <label><span>Min Spend (৳)</span><input id="cpMin" type="number" value="1000" /></label>
        <label><span>Expires Label</span><input id="cpExp" value="Flash Deal 48h" /></label>
        <button type="submit" class="btn-neon">Save Coupon</button>
      </form>
      <hr class="divider"/>
      <div class="table-wrap"><table><thead><tr><th>Code</th><th>Title</th><th>Value</th><th>Min Spend</th><th>Action</th></tr></thead><tbody>
        ${state.coupons.map((c) => `<tr><td><strong>${escHtml(c.code)}</strong></td><td>${escHtml(c.title)}</td><td>${c.value} (${escHtml(c.discountType)})</td><td>${money(c.minSpend)}</td><td><button class="btn-danger small" onclick="delCoupon('${escHtml(c.code)}')">Delete</button></td></tr>`).join("")}
      </tbody></table></div>
    </div>`;
  document.getElementById("couponForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await api("/api/admin/marketing/coupons", {
      method: "POST",
      body: JSON.stringify({
        code: document.getElementById("cpCode").value,
        title: document.getElementById("cpTitle").value,
        discountType: document.getElementById("cpType").value,
        value: Number(document.getElementById("cpVal").value),
        minSpend: Number(document.getElementById("cpMin").value),
        expiresLabel: document.getElementById("cpExp").value,
      }),
    });
    toast("Coupon synced to MY Shop User Panel!");
    loadTab("marketing");
  });
}
window.delCoupon = async (code) => { await api(`/api/admin/marketing/coupons/${code}`, { method: "DELETE" }); loadTab("marketing"); };

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
  const s = state.siteConfig;
  ws.innerHTML = `<div class="card"><h3>Website Customization (Syncs to User Panel)</h3><form id="cmsForm" class="stack-form">
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
  </form></div>`;
  document.getElementById("cmsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
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
  });
}

function renderPopups(ws) {
  ws.innerHTML = `<div class="card"><h3>Create Popup Notice</h3><form id="popForm" class="stack-form">
    <div class="form-grid">
      <label><span>Title *</span><input id="popTitle" required placeholder="Eid Cyber Mega Sale!" /></label>
      <label><span>Button Text</span><input id="popBtn" value="Shop Flash Deals" /></label>
      <label><span>Button Destination</span><input id="popUrl" value="/explore" /></label>
      <label><span>Image URL</span><input id="popImg" placeholder="https://…" /></label>
    </div>
    <label><span>Description</span><textarea id="popDesc" rows="2"></textarea></label>
    <button type="submit" class="btn-neon">Publish Popup Notice</button>
  </form><hr class="divider"/>
  <div>${state.popups.map((p) => `<div class="card" style="margin-top:8px;"><strong>${escHtml(p.title)}</strong> (${p.active ? "Active" : "Inactive"})<p class="muted">${escHtml(p.description)}</p><button class="btn-danger small" onclick="delPopup('${escHtml(p.id)}')">Delete</button></div>`).join("")}</div></div>`;
  document.getElementById("popForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await api("/api/admin/cms/popups", {
      method: "POST",
      body: JSON.stringify({
        title: document.getElementById("popTitle").value,
        description: document.getElementById("popDesc").value,
        buttonText: document.getElementById("popBtn").value,
        buttonUrl: document.getElementById("popUrl").value,
        imageUrl: document.getElementById("popImg").value,
        active: true,
      }),
    });
    toast("Popup notice published!");
    loadTab("popups");
  });
}
window.delPopup = async (id) => { await api(`/api/admin/cms/popups/${id}`, { method: "DELETE" }); loadTab("popups"); };

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
  const toggleTheme = () => {
    const root = document.documentElement;
    root.setAttribute("data-theme", root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  };
  document.getElementById("themeToggleBtn").addEventListener("click", toggleTheme);
  document.getElementById("loginThemeToggle").addEventListener("click", toggleTheme);

  document.getElementById("collapseSidebarBtn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("collapsed");
  });
  document.getElementById("mobileMenuBtn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });
  document.getElementById("refreshBtn").addEventListener("click", () => loadTab(state.activeTab));

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("sidebar").classList.remove("open");
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
