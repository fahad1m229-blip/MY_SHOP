// MY Shop Customer Shopping Website (Web Storefront)
// Opens at "/" and communicates strictly with /api/public/* and /api/customer/*.
// Never exposes Admin Panel controls or redirects visitors to /admin.

const I18N = {
  EN: {
    home: "Home",
    categories: "Categories",
    deals: "Deals & Coupons",
    orders: "Orders",
    profile: "Account",
    wishlist: "Wishlist",
    cart: "Cart",
    signIn: "Sign In",
    heroBadge: "NEXT-GEN SMART SHOPPING",
    heroTitle: "Shop Smart, Live Happy with MY Shop",
    heroSub: "Explore verified electronics, fashion, lifestyle & exclusive deals — synchronized live with instant checkout and doorstep delivery.",
    shopNow: "Explore Products",
    viewDeals: "Deals & Coupons",
    allCategories: "All Categories",
    featured: "Featured",
    trending: "Trending",
    bestSeller: "Best Sellers",
    freeDelivery: "Free Delivery",
    addToCart: "Add to Cart",
    outOfStock: "Out of Stock",
    buyNow: "Buy Now",
    emptyCatalogTitle: "No published products match right now",
    emptyCatalogDesc: "Products created and published in MY Shop Admin appear here automatically in real time.",
    emptyCartTitle: "Your shopping cart is empty",
    emptyCartDesc: "Browse products as a guest or sign in — your cart items are always preserved.",
    checkoutTitle: "Secure Checkout",
    placeOrder: "Place Order",
    myOrders: "Order History",
    myProfile: "Customer Profile & Addresses",
  },
  BN: {
    home: "হোম",
    categories: "ক্যাটাগরি",
    deals: "অফার ও কুপন",
    orders: "অর্ডার",
    profile: "অ্যাকাউন্ট",
    wishlist: "উইশলিস্ট",
    cart: "কার্ট",
    signIn: "সাইন ইন",
    heroBadge: "নেক্সট-জেন স্মার্ট শপিং",
    heroTitle: "MY Shop-এ স্মার্ট শপিং, হ্যাপি লাইফ",
    heroSub: "লাইভ ক্যাটালগ থেকে সেরা মোবাইল, ইলেকট্রনিক্স, ফ্যাশন ও ফ্ল্যাশ ডিল কিনুন সহজে এবং দ্রুত ডেলিভারিতে।",
    shopNow: "সব প্রোডাক্ট দেখুন",
    viewDeals: "অফার ও কুপন",
    allCategories: "সব ক্যাটাগরি",
    featured: "ফিচার্ড",
    trending: "ট্রেন্ডিং",
    bestSeller: "বেস্ট সেলার",
    freeDelivery: "ফ্রি ডেলিভারি",
    addToCart: "কার্টে যোগ করুন",
    outOfStock: "স্টক শেষ",
    buyNow: "এখনই কিনুন",
    emptyCatalogTitle: "এই মুহূর্তে কোনো প্রোডাক্ট পাওয়া যায়নি",
    emptyCatalogDesc: "অ্যাডমিন প্যানেল থেকে নতুন প্রোডাক্ট পাবলিশ করা হলে সাথে সাথে এখানে দেখা যাবে।",
    emptyCartTitle: "আপনার কার্ট এখন খালি",
    emptyCartDesc: "গেস্ট হিসেবেই পণ্য কার্টে যোগ করতে পারবেন—সাইন ইন করলেও কার্ট হারাবেনা।",
    checkoutTitle: "নিরাপদ চেকআউট",
    placeOrder: "অর্ডার কনফার্ম করুন",
    myOrders: "অর্ডার হিস্ট্রি",
    myProfile: "প্রোফাইল ও ঠিকানা",
  },
};

const STORAGE_GUEST_CART = "myshop_guest_cart_v1";
const STORAGE_THEME = "myshop_web_theme_v1";
const STORAGE_LANG = "myshop_web_lang_v1";
const STORAGE_POPUP_DISMISS = "myshop_popup_dismiss_v1";
const STORAGE_VISITED = "myshop_web_visited_v1";

const state = {
  view: "home", // home | categories | deals | cart | wishlist | orders | profile
  lang: localStorage.getItem(STORAGE_LANG) === "BN" ? "BN" : "EN",
  theme: localStorage.getItem(STORAGE_THEME) === "light" ? "light" : "dark",
  loading: true,
  siteConfig: {},
  announcement: {},
  socialSupport: null,
  popups: [],
  products: [],
  categories: [],
  brands: [],
  coupons: [],
  deliveryZones: [],
  customer: null,
  cart: loadGuestCart(),
  wishlistIds: [],
  orders: [],
  addresses: [],
  notifications: [],
  filters: {
    search: "",
    category: "ALL",
    brand: "",
    tab: "all", // all | featured | trending | bestSeller | freeDelivery
    sort: "newest",
  },
  appliedCoupon: "",
  socialOpen: false,
  popupShownThisSession: false,
  activeDetailProduct: null,
};

function t(key) {
  return (I18N[state.lang] && I18N[state.lang][key]) || I18N.EN[key] || key;
}

function escapeHtml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSafeHttpUrl(raw) {
  if (typeof raw !== "string" || !raw.trim()) return false;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function loadGuestCart() {
  try {
    const raw = localStorage.getItem(STORAGE_GUEST_CART);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveGuestCart(items) {
  try {
    localStorage.setItem(STORAGE_GUEST_CART, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

function toast(msg, isError = false) {
  const el = document.getElementById("toastBanner");
  if (!el) return;
  el.textContent = msg;
  el.className = isError ? "toast error" : "toast";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), 3200);
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const res = await fetch(path, {
    credentials: "include",
    ...options,
    headers,
  });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

function money(amount) {
  const sym = state.siteConfig?.currencySymbol || "৳";
  return `${sym}${Number(amount || 0).toLocaleString()}`;
}

function applyThemeAndLang() {
  document.documentElement.setAttribute("data-theme", state.theme);
  localStorage.setItem(STORAGE_THEME, state.theme);
  localStorage.setItem(STORAGE_LANG, state.lang);
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.getAttribute("data-i18n");
    if (k) el.textContent = t(k);
  });
  const langBtn = document.getElementById("langToggleBtn");
  if (langBtn) langBtn.textContent = state.lang === "EN" ? "EN / বাং" : "বাং / EN";
}

function updateHeaderChromes() {
  const cfg = state.siteConfig || {};
  const siteName = cfg.siteName || "MY Shop";
  const tagline = cfg.tagline || "Shop Smart • Live Happy!";
  document.title = `${siteName} — ${tagline}`;
  document.getElementById("brandSiteName").textContent = siteName;
  document.getElementById("brandTagline").textContent = tagline;
  document.getElementById("footerSiteName").textContent = siteName;
  document.getElementById("footerTagline").textContent = tagline;
  document.getElementById("footerDescription").textContent =
    cfg.description || "Next-generation futuristic e-commerce platform synchronized with live catalog.";
  document.getElementById("footerContactEmail").textContent = cfg.contactEmail || "support@myshop.example";
  document.getElementById("footerContactPhone").textContent = cfg.contactPhone || "+880 1700-000000";
  document.getElementById("footerAddress").textContent = cfg.address || "Dhaka, Bangladesh";
  document.getElementById("footerCopyright").textContent = cfg.footerText || `© ${siteName} • ${tagline}`;

  // Announcement Bar
  const ann = state.announcement || {};
  const annBar = document.getElementById("announcementBar");
  const annText = (ann.enabled && ann.text) || (cfg.announcementActive && cfg.announcementText) || "";
  if (annBar && annText.trim()) {
    annBar.classList.remove("hidden");
    document.getElementById("announcementBadge").textContent = ann.badgeText || "FLASH DEAL";
    document.getElementById("announcementText").textContent = annText;
    if (/^#[0-9A-Fa-f]{6}$/.test(ann.bgHex || "")) {
      annBar.style.background = `linear-gradient(90deg, ${ann.bgHex}, #00D4FF, #FF2E93)`;
    }
  } else if (annBar) {
    annBar.classList.add("hidden");
  }

  // Cart & Wishlist & Account badges
  const cartQty = state.cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  document.getElementById("cartBadgeTop").textContent = cartQty;
  const mobBadge = document.getElementById("cartBadgeMob");
  mobBadge.textContent = cartQty;
  mobBadge.classList.toggle("hidden", cartQty <= 0);
  document.getElementById("wishlistBadgeTop").textContent = state.wishlistIds.length;
  document.getElementById("topAccountLabel").textContent = state.customer
    ? state.customer.displayName.split(" ")[0]
    : t("signIn");

  document.querySelectorAll("[data-nav]").forEach((el) => {
    const target = el.getAttribute("data-nav");
    if (el.classList.contains("subnav-btn") || el.classList.contains("mob-nav-btn")) {
      el.classList.toggle("active", target === state.view);
    }
  });
}

function getFilteredProducts() {
  let list = [...state.products];
  const { search, category, brand, tab, sort } = state.filters;

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter((p) =>
      `${p.name} ${p.nameBn} ${p.brand} ${p.categoryId} ${p.description}`.toLowerCase().includes(q)
    );
  }
  if (category && category !== "ALL") {
    list = list.filter((p) => String(p.categoryId).toUpperCase() === category.toUpperCase());
  }
  if (brand) {
    list = list.filter((p) => String(p.brand).toLowerCase() === brand.toLowerCase());
  }
  if (tab === "featured") list = list.filter((p) => p.featured);
  if (tab === "trending") list = list.filter((p) => p.trending);
  if (tab === "bestSeller") list = list.filter((p) => p.bestSeller);
  if (tab === "freeDelivery") list = list.filter((p) => p.freeDelivery);

  if (sort === "price_asc") list.sort((a, b) => a.price - b.price);
  else if (sort === "price_desc") list.sort((a, b) => b.price - a.price);
  else if (sort === "discount") list.sort((a, b) => b.discountPercent - a.discountPercent);
  return list;
}

function renderProductCard(p) {
  const title = state.lang === "BN" && p.nameBn ? p.nameBn : p.name;
  const wished = state.wishlistIds.includes(p.id);
  const outOfStock = !p.available || Number(p.stock || 0) <= 0;
  const imgHtml = isSafeHttpUrl(p.mainImageUrl)
    ? `<img src="${escapeHtml(p.mainImageUrl)}" alt="${escapeHtml(title)}" class="product-thumb" loading="lazy" />`
    : `<div class="product-thumb-fallback">🛍️</div>`;

  return `
    <article class="product-card" data-product-id="${escapeHtml(p.id)}">
      <div class="product-thumb-wrap" data-action="open-product" data-id="${escapeHtml(p.id)}">
        ${imgHtml}
        ${p.discountPercent > 0 ? `<span class="discount-pill">-${p.discountPercent}%</span>` : ""}
        <button type="button" class="wish-float-btn" data-action="toggle-wish" data-id="${escapeHtml(p.id)}" aria-label="Wishlist">
          ${wished ? "❤️" : "🤍"}
        </button>
      </div>
      <div class="product-body">
        <div class="product-brand">${escapeHtml(p.brand || "MY Shop")} • ${escapeHtml(p.categoryId)}</div>
        <h3 class="product-title" data-action="open-product" data-id="${escapeHtml(p.id)}">${escapeHtml(title)}</h3>
        <div class="price-row">
          <span class="price-now">${money(p.price)}</span>
          ${p.originalPrice > p.price ? `<span class="price-old">${money(p.originalPrice)}</span>` : ""}
        </div>
        <div class="stock-meta">
          <span>${outOfStock ? `<span style="color:#fca5a5">${t("outOfStock")}</span>` : `In stock (${p.stock})`}</span>
          <span>${p.freeDelivery ? "🚚 Free" : ""}</span>
        </div>
        <div class="card-actions">
          <button
            type="button"
            class="btn-neon sm full-width"
            data-action="add-cart"
            data-id="${escapeHtml(p.id)}"
            ${outOfStock ? "disabled" : ""}
          >
            ${outOfStock ? t("outOfStock") : `🛒 ${t("addToCart")}`}
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderHomeOrBrowse(mode = "home") {
  const filtered = getFilteredProducts();
  const categories = state.categories.length
    ? state.categories
    : Array.from(new Set(state.products.map((p) => p.categoryId).filter(Boolean))).map((id) => ({
        id,
        name: id,
      }));

  const heroHtml =
    mode === "home" && !state.filters.search
      ? `
      <section class="hero-banner glass-panel">
        <div>
          <span class="hero-badge">✨ ${t("heroBadge")}</span>
          <h1>${t("heroTitle")}</h1>
          <p>${t("heroSub")}</p>
          <div class="hero-actions">
            <button type="button" class="btn-neon" onclick="document.getElementById('catalogSection').scrollIntoView({behavior:'smooth'})">
              ${t("shopNow")}
            </button>
            <button type="button" class="btn-outline" data-nav="deals">${t("viewDeals")}</button>
          </div>
        </div>
        <div>
          <img src="/welcome-3d.jpg" alt="MY Shop 3D Shopping" class="hero-art" />
        </div>
      </section>
    `
      : "";

  const banners = Array.isArray(state.siteConfig?.banners) ? state.siteConfig.banners : [];
  const bannerRow =
    mode === "home" && banners.length
      ? `
      <div class="chips-row" style="margin-bottom:14px">
        ${banners
          .map(
            (b) => `
          <div class="panel-card" style="min-width:260px;margin:0;padding:12px">
            <strong>${escapeHtml(b.title || "Special Offer")}</strong>
            <p class="small muted">${escapeHtml(b.subtitle || "")}</p>
          </div>`
          )
          .join("")}
      </div>`
      : "";

  const categoryChips = `
    <div class="section-head">
      <h2>🗂️ ${t("categories")}</h2>
      ${state.filters.brand ? `<button type="button" class="btn-outline sm" data-action="clear-brand">Clear Brand: ${escapeHtml(state.filters.brand)} ✕</button>` : ""}
    </div>
    <div class="chips-row">
      <button type="button" class="chip ${state.filters.category === "ALL" ? "active" : ""}" data-action="filter-cat" data-cat="ALL">
        ${t("allCategories")} (${state.products.length})
      </button>
      ${categories
        .map(
          (c) => `
        <button type="button" class="chip ${state.filters.category === c.id ? "active" : ""}" data-action="filter-cat" data-cat="${escapeHtml(c.id)}">
          ${escapeHtml(c.name || c.id)}
        </button>`
        )
        .join("")}
    </div>
  `;

  const brandChips = state.brands.length
    ? `
    <div class="chips-row" style="margin-top:8px">
      ${state.brands
        .map(
          (b) => `
        <button type="button" class="chip ${state.filters.brand === (b.name || b.id) ? "active" : ""}" data-action="filter-brand" data-brand="${escapeHtml(b.name || b.id)}">
          🏷️ ${escapeHtml(b.name || b.id)}
        </button>`
        )
        .join("")}
    </div>`
    : "";

  const toolbar = `
    <div class="filter-toolbar" id="catalogSection">
      <div class="chips-row">
        ${[
          ["all", "All"],
          ["featured", t("featured")],
          ["trending", t("trending")],
          ["bestSeller", t("bestSeller")],
          ["freeDelivery", t("freeDelivery")],
        ]
          .map(
            ([k, lbl]) =>
              `<button type="button" class="chip ${state.filters.tab === k ? "active" : ""}" data-action="filter-tab" data-tab="${k}">${lbl}</button>`
          )
          .join("")}
      </div>
      <select id="sortSelect" class="glass-select" aria-label="Sort products">
        <option value="newest" ${state.filters.sort === "newest" ? "selected" : ""}>Newest</option>
        <option value="price_asc" ${state.filters.sort === "price_asc" ? "selected" : ""}>Price: Low → High</option>
        <option value="price_desc" ${state.filters.sort === "price_desc" ? "selected" : ""}>Price: High → Low</option>
        <option value="discount" ${state.filters.sort === "discount" ? "selected" : ""}>Best Discount</option>
      </select>
    </div>
  `;

  const catalogBody = state.loading
    ? `<div class="empty-box"><p>Loading live MY Shop catalog…</p></div>`
    : filtered.length === 0
    ? `
      <div class="empty-box">
        <div style="font-size:2.2rem">🛍️</div>
        <h3>${t("emptyCatalogTitle")}</h3>
        <p class="muted small">${t("emptyCatalogDesc")}</p>
        ${
          state.filters.search || state.filters.category !== "ALL" || state.filters.brand || state.filters.tab !== "all"
            ? `<button type="button" class="btn-outline" style="margin-top:12px" data-action="reset-filters">Reset Filters</button>`
            : ""
        }
      </div>`
    : `<div class="product-grid">${filtered.map(renderProductCard).join("")}</div>`;

  return `${heroHtml}${bannerRow}${categoryChips}${brandChips}${toolbar}${catalogBody}`;
}

function renderDealsView() {
  const discounted = state.products.filter((p) => p.discountPercent > 0 || p.featured);
  return `
    <div class="section-head"><h2>⚡ ${t("deals")}</h2></div>
    <div class="product-grid" style="margin-bottom:22px">
      ${
        state.coupons.length
          ? state.coupons
              .map(
                (c) => `
          <div class="panel-card" style="margin:0">
            <span class="hero-badge" style="margin-bottom:6px">${escapeHtml(c.expiresLabel || "Offer")}</span>
            <h3>${escapeHtml(c.code)}</h3>
            <p class="small muted" style="margin:6px 0">${escapeHtml(c.title || "")}</p>
            <p class="small">Min spend: ${money(c.minSpend || 0)}</p>
            <button type="button" class="btn-neon sm" style="margin-top:10px" data-action="apply-coupon-quick" data-code="${escapeHtml(c.code)}">
              Use Code
            </button>
          </div>`
              )
              .join("")
          : `<div class="panel-card"><p class="muted small">Active coupons created in Admin Panel will appear here.</p></div>`
      }
    </div>
    <div class="section-head"><h2>🔥 Hot Offers</h2></div>
    ${
      discounted.length
        ? `<div class="product-grid">${discounted.map(renderProductCard).join("")}</div>`
        : `<div class="empty-box"><p class="muted">${t("emptyCatalogDesc")}</p></div>`
    }
  `;
}

function calculateCartTotals() {
  let subtotal = 0;
  let allFreeDelivery = state.cart.length > 0;
  for (const item of state.cart) {
    const prod = state.products.find((p) => p.id === item.productId);
    const price = prod ? prod.price : Number(item.unitPrice || 0);
    subtotal += price * Number(item.quantity || 1);
    if (prod && !prod.freeDelivery) allFreeDelivery = false;
  }

  let discount = 0;
  let couponFreeDelivery = false;
  if (state.appliedCoupon) {
    const c = state.coupons.find((x) => String(x.code).toUpperCase() === state.appliedCoupon.toUpperCase());
    if (c && subtotal >= Number(c.minSpend || 0)) {
      if (c.discountType === "PERCENT") {
        discount = Math.round((subtotal * Number(c.value || 0)) / 100);
        if (Number(c.maxDiscount || 0) > 0) discount = Math.min(discount, Number(c.maxDiscount));
      } else if (c.discountType === "FIXED") {
        discount = Math.min(subtotal, Number(c.value || 0));
      } else if (c.discountType === "FREE_DELIVERY") {
        couponFreeDelivery = true;
      }
    }
  }

  const deliveryFee = state.cart.length === 0 || allFreeDelivery || couponFreeDelivery || subtotal >= 2500 ? 0 : 80;
  const total = Math.max(0, subtotal - discount + deliveryFee);
  return { subtotal, discount, deliveryFee, total };
}

function renderCartView() {
  if (state.cart.length === 0) {
    return `
      <div class="empty-box">
        <div style="font-size:2.4rem">🛒</div>
        <h3>${t("emptyCartTitle")}</h3>
        <p class="muted small">${t("emptyCartDesc")}</p>
        <button type="button" class="btn-neon" style="margin-top:14px" data-nav="home">${t("shopNow")}</button>
      </div>
    `;
  }

  const totals = calculateCartTotals();
  return `
    <div class="section-head"><h2>🛒 ${t("cart")} (${state.cart.reduce((s, i) => s + i.quantity, 0)})</h2></div>
    <div class="two-col">
      <div class="panel-card">
        ${state.cart
          .map((item, idx) => {
            const prod = state.products.find((p) => p.id === item.productId);
            const unitPrice = prod ? prod.price : Number(item.unitPrice || 0);
            const img = isSafeHttpUrl(prod?.mainImageUrl || item.mainImageUrl)
              ? `<img src="${escapeHtml(prod?.mainImageUrl || item.mainImageUrl)}" alt="" />`
              : `<div style="width:64px;height:64px;border-radius:12px;background:rgba(139,92,246,.2);display:flex;align-items:center;justify-content:center">🛍️</div>`;

            return `
              <div class="cart-row">
                ${img}
                <div style="flex:1;min-width:0">
                  <strong>${escapeHtml(prod?.name || item.productName)}</strong>
                  <p class="small muted">${escapeHtml([item.selectedColor, item.selectedSize].filter(Boolean).join(" • ") || "Standard")}</p>
                  <strong style="color:var(--emerald)">${money(unitPrice)}</strong>
                </div>
                <div class="qty-box">
                  <button type="button" class="qty-btn" data-action="cart-qty" data-idx="${idx}" data-delta="-1">−</button>
                  <span>${item.quantity}</span>
                  <button type="button" class="qty-btn" data-action="cart-qty" data-idx="${idx}" data-delta="1">+</button>
                </div>
                <button type="button" class="btn-danger" data-action="cart-remove" data-idx="${idx}">✕</button>
              </div>
            `;
          })
          .join("")}
      </div>

      <div class="panel-card">
        <h3>Order Summary</h3>
        <div style="display:flex;gap:8px;margin:12px 0">
          <input type="text" id="couponInput" class="glass-input" style="flex:1" placeholder="Coupon code (e.g. MYSHOP10)" value="${escapeHtml(state.appliedCoupon)}" />
          <button type="button" class="btn-outline" data-action="apply-coupon">Apply</button>
        </div>
        <div class="summary-line"><span>Subtotal</span><strong>${money(totals.subtotal)}</strong></div>
        <div class="summary-line"><span>Discount</span><strong>-${money(totals.discount)}</strong></div>
        <div class="summary-line"><span>Delivery</span><strong>${totals.deliveryFee === 0 ? "FREE" : money(totals.deliveryFee)}</strong></div>
        <div class="summary-line summary-total"><span>Total</span><span>${money(totals.total)}</span></div>
        <button type="button" class="btn-neon full-width" style="margin-top:14px" data-action="start-checkout">
          Proceed to Checkout →
        </button>
      </div>
    </div>
  `;
}

function renderWishlistView() {
  if (!state.customer) {
    return `
      <div class="empty-box">
        <div style="font-size:2.2rem">❤️</div>
        <h3>Sign in to access your synced Wishlist</h3>
        <p class="muted small">Save favorite items, track price drops, and sync across web & Android app.</p>
        <button type="button" class="btn-neon" style="margin-top:14px" data-action="open-auth">Sign In / Register</button>
      </div>
    `;
  }
  const wishedProducts = state.products.filter((p) => state.wishlistIds.includes(p.id));
  if (wishedProducts.length === 0) {
    return `
      <div class="empty-box">
        <div style="font-size:2.2rem">🤍</div>
        <h3>Your wishlist is empty</h3>
        <button type="button" class="btn-neon" style="margin-top:12px" data-nav="home">${t("shopNow")}</button>
      </div>
    `;
  }
  return `
    <div class="section-head"><h2>❤️ ${t("wishlist")} (${wishedProducts.length})</h2></div>
    <div class="product-grid">${wishedProducts.map(renderProductCard).join("")}</div>
  `;
}

function renderOrdersView() {
  if (!state.customer) {
    return `
      <div class="empty-box">
        <div style="font-size:2.2rem">📦</div>
        <h3>Sign in to view your Order History</h3>
        <p class="muted small">Track live order status updates, invoices, and delivery tracking codes.</p>
        <button type="button" class="btn-neon" style="margin-top:14px" data-action="open-auth">Sign In / Register</button>
      </div>
    `;
  }
  if (state.orders.length === 0) {
    return `
      <div class="empty-box">
        <div style="font-size:2.2rem">📦</div>
        <h3>No orders placed yet</h3>
        <button type="button" class="btn-neon" style="margin-top:12px" data-nav="home">${t("shopNow")}</button>
      </div>
    `;
  }
  return `
    <div class="section-head">
      <h2>📦 ${t("myOrders")}</h2>
      <button type="button" class="btn-outline sm" data-action="refresh-orders">↻ Refresh</button>
    </div>
    ${state.orders
      .map(
        (o) => `
      <div class="panel-card">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px">
          <div>
            <strong>${escapeHtml(o.orderNumber || o.id)}</strong>
            <p class="small muted">${escapeHtml(o.createdAt ? new Date(o.createdAt).toLocaleString() : "")}</p>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <span class="hero-badge" style="margin:0">${escapeHtml(o.orderStatus || "Pending")}</span>
            <strong>${money(o.totalAmount)}</strong>
          </div>
        </div>
        <p class="small">${escapeHtml(o.itemsSummary || "")}</p>
        <p class="small muted" style="margin-top:4px">
          Payment: ${escapeHtml(o.paymentMethod)} (${escapeHtml(o.paymentStatus)}) • Ship to: ${escapeHtml(o.shippingAddress)}
        </p>
        ${o.trackingCode ? `<p class="small" style="color:var(--electric-blue);margin-top:4px">Tracking Code: ${escapeHtml(o.trackingCode)}</p>` : ""}
      </div>
    `
      )
      .join("")}
  `;
}

function renderProfileView() {
  if (!state.customer) {
    return `
      <div class="empty-box">
        <div style="font-size:2.2rem">👤</div>
        <h3>Customer Account</h3>
        <p class="muted small">Register or sign in to checkout, save addresses, manage wishlist, and view order history.</p>
        <button type="button" class="btn-neon" style="margin-top:14px" data-action="open-auth">Sign In / Create Account</button>
      </div>
    `;
  }

  return `
    <div class="section-head">
      <h2>👤 ${t("myProfile")}</h2>
      <button type="button" class="btn-danger" data-action="customer-logout">Logout</button>
    </div>
    <div class="two-col">
      <div class="panel-card">
        <h3>Profile Information</h3>
        <form id="profileUpdateForm" class="form-stack" style="margin-top:12px">
          <label><span>Full Name</span><input type="text" id="profName" class="glass-input" value="${escapeHtml(state.customer.displayName)}" required /></label>
          <label><span>Email</span><input type="email" class="glass-input" value="${escapeHtml(state.customer.email)}" disabled /></label>
          <label><span>Phone</span><input type="text" id="profPhone" class="glass-input" value="${escapeHtml(state.customer.phone || "")}" placeholder="+8801..." /></label>
          <button type="submit" class="btn-neon">Save Profile</button>
        </form>
      </div>

      <div class="panel-card">
        <h3>Saved Delivery Addresses</h3>
        <div style="margin:10px 0">
          ${
            state.addresses.length
              ? state.addresses
                  .map(
                    (a) => `
              <div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;gap:8px">
                <div>
                  <strong>${escapeHtml(a.label || "Home")} • ${escapeHtml(a.recipientName)}</strong>
                  <p class="small muted">${escapeHtml(a.phone)} — ${escapeHtml(a.street)}, ${escapeHtml(a.city)}</p>
                </div>
                <button type="button" class="btn-danger" data-action="delete-address" data-id="${escapeHtml(a.id)}">✕</button>
              </div>`
                  )
                  .join("")
              : `<p class="small muted">No saved addresses yet.</p>`
          }
        </div>
        <form id="addAddressForm" class="form-stack" style="margin-top:12px">
          <input type="text" id="addrRecipient" class="glass-input" placeholder="Recipient Name" value="${escapeHtml(state.customer.displayName)}" required />
          <input type="text" id="addrPhone" class="glass-input" placeholder="Phone Number" value="${escapeHtml(state.customer.phone || "")}" required />
          <input type="text" id="addrStreet" class="glass-input" placeholder="House, Road, Area" required />
          <input type="text" id="addrCity" class="glass-input" placeholder="City (e.g. Dhaka)" required />
          <button type="submit" class="btn-outline">+ Add Delivery Address</button>
        </form>
      </div>
    </div>

    <div class="panel-card">
      <h3>🔔 Recent Notifications</h3>
      ${
        state.notifications.length
          ? state.notifications
              .slice(0, 8)
              .map(
                (n) => `
          <div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)">
            <strong>${escapeHtml(n.title)}</strong>
            <p class="small muted">${escapeHtml(n.body)}</p>
          </div>`
              )
              .join("")
          : `<p class="small muted" style="margin-top:8px">No notifications yet.</p>`
      }
    </div>
  `;
}

function render() {
  applyThemeAndLang();
  updateHeaderChromes();

  const main = document.getElementById("storefrontMain");
  if (!main) return;

  if (state.view === "categories") main.innerHTML = renderHomeOrBrowse("categories");
  else if (state.view === "deals") main.innerHTML = renderDealsView();
  else if (state.view === "cart") main.innerHTML = renderCartView();
  else if (state.view === "wishlist") main.innerHTML = renderWishlistView();
  else if (state.view === "orders") main.innerHTML = renderOrdersView();
  else if (state.view === "profile") main.innerHTML = renderProfileView();
  else main.innerHTML = renderHomeOrBrowse("home");

  bindDynamicForms();
  renderFloatingSocialSupport();
}

function bindDynamicForms() {
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.onchange = (e) => {
      state.filters.sort = e.target.value;
      render();
    };
  }

  const profForm = document.getElementById("profileUpdateForm");
  if (profForm) {
    profForm.onsubmit = async (e) => {
      e.preventDefault();
      try {
        const displayName = document.getElementById("profName").value.trim();
        const phone = document.getElementById("profPhone").value.trim();
        await api("/api/customer/profile", {
          method: "PUT",
          body: JSON.stringify({ displayName, phone, language: state.lang, darkMode: state.theme === "dark" }),
        });
        state.customer.displayName = displayName;
        state.customer.phone = phone;
        toast("Profile updated!");
        render();
      } catch (err) {
        toast(err.message, true);
      }
    };
  }

  const addrForm = document.getElementById("addAddressForm");
  if (addrForm) {
    addrForm.onsubmit = async (e) => {
      e.preventDefault();
      try {
        const created = await api("/api/customer/addresses", {
          method: "POST",
          body: JSON.stringify({
            label: "Home",
            recipientName: document.getElementById("addrRecipient").value.trim(),
            phone: document.getElementById("addrPhone").value.trim(),
            street: document.getElementById("addrStreet").value.trim(),
            city: document.getElementById("addrCity").value.trim(),
            country: "Bangladesh",
          }),
        });
        state.addresses.push(created);
        toast("Address saved!");
        render();
      } catch (err) {
        toast(err.message, true);
      }
    };
  }
}

// ======================== MODALS (Product Detail, Auth, Checkout) ========================

function closeModal() {
  document.getElementById("modalOverlay").classList.add("hidden");
  document.getElementById("modalOverlay").innerHTML = "";
}

function openProductModal(productId) {
  const p = state.products.find((x) => x.id === productId);
  if (!p) return;
  const images = [p.mainImageUrl, ...(p.imageUrls || [])].filter((u, idx, arr) => isSafeHttpUrl(u) && arr.indexOf(u) === idx);
  const title = state.lang === "BN" && p.nameBn ? p.nameBn : p.name;
  const outOfStock = !p.available || Number(p.stock || 0) <= 0;

  const modal = document.getElementById("modalOverlay");
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-head">
        <strong>${escapeHtml(p.brand || "MY Shop")} • ${escapeHtml(p.categoryId)}</strong>
        <button type="button" class="close-circle" data-action="close-modal" aria-label="Close">✕</button>
      </div>
      <div class="detail-grid">
        <div>
          ${
            images.length
              ? `<img id="detailMainImg" src="${escapeHtml(images[0])}" alt="${escapeHtml(title)}" class="detail-main-img" />`
              : `<div class="detail-main-img" style="display:flex;align-items:center;justify-content:center;font-size:3.5rem;background:rgba(139,92,246,.2)">🛍️</div>`
          }
          ${
            images.length > 1
              ? `<div class="thumb-strip">${images
                  .map(
                    (url, i) =>
                      `<img src="${escapeHtml(url)}" class="${i === 0 ? "active" : ""}" onclick="document.getElementById('detailMainImg').src='${escapeHtml(url)}'" />`
                  )
                  .join("")}</div>`
              : ""
          }
        </div>
        <div class="form-stack">
          <h2>${escapeHtml(title)}</h2>
          <div class="price-row">
            <span class="price-now" style="font-size:1.4rem">${money(p.price)}</span>
            ${p.originalPrice > p.price ? `<span class="price-old">${money(p.originalPrice)}</span>` : ""}
            ${p.discountPercent > 0 ? `<span class="discount-pill" style="position:static">-${p.discountPercent}%</span>` : ""}
          </div>
          <p class="small muted">${outOfStock ? t("outOfStock") : `Available stock: ${p.stock} units`} • Seller: ${escapeHtml(p.sellerName || "MY Shop Official")}</p>
          <p class="small" style="line-height:1.5">${escapeHtml(p.description || "Verified MY Shop product.")}</p>

          ${
            p.colors?.length
              ? `<label><span>Color</span><select id="detailColor" class="glass-select">${p.colors.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("")}</select></label>`
              : ""
          }
          ${
            p.sizes?.length
              ? `<label><span>Variant / Size</span><select id="detailSize" class="glass-select">${p.sizes.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("")}</select></label>`
              : ""
          }

          <div style="display:flex;gap:10px;margin-top:8px">
            <button type="button" class="btn-neon" style="flex:1" id="detailAddCartBtn" ${outOfStock ? "disabled" : ""}>
              🛒 ${outOfStock ? t("outOfStock") : t("addToCart")}
            </button>
            <button type="button" class="btn-outline" id="detailBuyNowBtn" ${outOfStock ? "disabled" : ""}>
              ⚡ ${t("buyNow")}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  modal.classList.remove("hidden");

  document.getElementById("detailAddCartBtn").onclick = () => {
    const c = document.getElementById("detailColor")?.value || "";
    const s = document.getElementById("detailSize")?.value || "";
    addToCart(p.id, c, s);
    closeModal();
  };
  document.getElementById("detailBuyNowBtn").onclick = () => {
    const c = document.getElementById("detailColor")?.value || "";
    const s = document.getElementById("detailSize")?.value || "";
    addToCart(p.id, c, s);
    closeModal();
    startCheckoutFlow();
  };
}

function openAuthModal(defaultTab = "login", afterAuthCallback = null) {
  const modal = document.getElementById("modalOverlay");
  let tab = defaultTab;

  function renderModal() {
    modal.innerHTML = `
      <div class="modal-card" style="max-width:440px">
        <div class="modal-head">
          <strong>${tab === "login" ? "Sign In to MY Shop" : "Create Customer Account"}</strong>
          <button type="button" class="close-circle" data-action="close-modal">✕</button>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:14px">
          <button type="button" class="chip ${tab === "login" ? "active" : ""}" id="switchLoginTab" style="flex:1">Sign In</button>
          <button type="button" class="chip ${tab === "register" ? "active" : ""}" id="switchRegTab" style="flex:1">Register</button>
        </div>
        <form id="customerAuthForm" class="form-stack">
          ${
            tab === "register"
              ? `
            <label><span>Full Name</span><input type="text" id="authName" class="glass-input" required placeholder="Your Name" /></label>
            <label><span>Phone Number</span><input type="text" id="authPhone" class="glass-input" placeholder="+8801..." /></label>`
              : ""
          }
          <label><span>Email Address</span><input type="email" id="authEmail" class="glass-input" required placeholder="you@example.com" /></label>
          <label><span>Password</span><input type="password" id="authPass" class="glass-input" required minlength="6" placeholder="Minimum 6 characters" /></label>
          <button type="submit" class="btn-neon full-width" style="margin-top:6px">
            ${tab === "login" ? "Sign In & Preserve Cart" : "Create Account & Preserve Cart"}
          </button>
        </form>
      </div>
    `;
    modal.classList.remove("hidden");

    document.getElementById("switchLoginTab").onclick = () => {
      tab = "login";
      renderModal();
    };
    document.getElementById("switchRegTab").onclick = () => {
      tab = "register";
      renderModal();
    };
    document.getElementById("customerAuthForm").onsubmit = async (e) => {
      e.preventDefault();
      try {
        const email = document.getElementById("authEmail").value.trim();
        const password = document.getElementById("authPass").value;
        const payload = { email, password, guestCart: state.cart };

        const data =
          tab === "register"
            ? await api("/api/customer/auth/register", {
                method: "POST",
                body: JSON.stringify({
                  ...payload,
                  displayName: document.getElementById("authName").value.trim(),
                  phone: document.getElementById("authPhone").value.trim(),
                }),
              })
            : await api("/api/customer/auth/login", {
                method: "POST",
                body: JSON.stringify(payload),
              });

        state.customer = data.customer;
        state.cart = Array.isArray(data.cart) ? data.cart : state.cart;
        state.wishlistIds = Array.isArray(data.wishlistIds) ? data.wishlistIds : [];
        state.addresses = Array.isArray(data.addresses) ? data.addresses : [];
        state.notifications = Array.isArray(data.notifications) ? data.notifications : [];
        saveGuestCart([]);
        closeModal();
        toast(`Welcome, ${state.customer.displayName}!`);
        await refreshCustomerOrders();
        render();
        if (typeof afterAuthCallback === "function") afterAuthCallback();
      } catch (err) {
        toast(err.message, true);
      }
    };
  }
  renderModal();
}

function openCheckoutModal() {
  const totals = calculateCartTotals();
  const paymentCfg = state.siteConfig?.paymentSettings || {};
  const enabledMethods = Object.entries(paymentCfg)
    .filter(([, v]) => v && v.enabled !== false)
    .map(([k]) => (k === "CashOnDelivery" ? "Cash on Delivery" : k));
  const methods = enabledMethods.length ? enabledMethods : ["Cash on Delivery", "bKash", "Nagad", "Visa"];
  const defaultAddr = state.addresses[0]
    ? `${state.addresses[0].recipientName}, ${state.addresses[0].phone}, ${state.addresses[0].street}, ${state.addresses[0].city}`
    : `${state.customer?.displayName || ""}, ${state.customer?.phone || ""}, `;

  const modal = document.getElementById("modalOverlay");
  modal.innerHTML = `
    <div class="modal-card" style="max-width:520px">
      <div class="modal-head">
        <strong>${t("checkoutTitle")}</strong>
        <button type="button" class="close-circle" data-action="close-modal">✕</button>
      </div>
      <form id="checkoutForm" class="form-stack">
        <label>
          <span>Shipping Address (Name, Phone, Street, City)</span>
          <textarea id="chkAddress" rows="3" class="glass-input" required>${escapeHtml(defaultAddr)}</textarea>
        </label>
        <label>
          <span>Payment Method</span>
          <select id="chkPayment" class="glass-select">
            ${methods.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("")}
          </select>
        </label>
        <div class="panel-card" style="margin:6px 0">
          <div class="summary-line"><span>Subtotal</span><strong>${money(totals.subtotal)}</strong></div>
          <div class="summary-line"><span>Discount</span><strong>-${money(totals.discount)}</strong></div>
          <div class="summary-line"><span>Delivery Fee</span><strong>${totals.deliveryFee === 0 ? "FREE" : money(totals.deliveryFee)}</strong></div>
          <div class="summary-line summary-total"><span>Payable Total</span><span>${money(totals.total)}</span></div>
        </div>
        <button type="submit" class="btn-neon full-width" id="placeOrderBtn">${t("placeOrder")}</button>
      </form>
    </div>
  `;
  modal.classList.remove("hidden");

  document.getElementById("checkoutForm").onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById("placeOrderBtn");
    btn.disabled = true;
    btn.textContent = "Processing Order…";
    try {
      const order = await api("/api/customer/orders", {
        method: "POST",
        body: JSON.stringify({
          items: state.cart,
          shippingAddress: document.getElementById("chkAddress").value.trim(),
          paymentMethod: document.getElementById("chkPayment").value,
          couponCode: state.appliedCoupon,
          idempotencyKey: `web_${state.customer.uid}_${Date.now()}`,
        }),
      });
      state.cart = [];
      state.appliedCoupon = "";
      saveGuestCart([]);
      closeModal();
      toast(`Order ${order.orderNumber} placed successfully!`);
      await refreshCustomerOrders();
      await loadBootstrap();
      state.view = "orders";
      render();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = t("placeOrder");
      toast(err.message, true);
    }
  };
}

// ======================== CART / WISHLIST ACTIONS ========================

async function syncCartToServer() {
  if (!state.customer) {
    saveGuestCart(state.cart);
    return;
  }
  try {
    const res = await api("/api/customer/cart", {
      method: "PUT",
      body: JSON.stringify({ items: state.cart }),
    });
    if (Array.isArray(res.items)) state.cart = res.items;
  } catch {
    saveGuestCart(state.cart);
  }
}

function addToCart(productId, selectedColor = "", selectedSize = "") {
  const prod = state.products.find((p) => p.id === productId);
  if (!prod || !prod.available || Number(prod.stock || 0) <= 0) {
    toast("This product is currently out of stock.", true);
    return;
  }
  const color = selectedColor || (prod.colors && prod.colors[0]) || "";
  const size = selectedSize || (prod.sizes && prod.sizes[0]) || "";
  const existing = state.cart.find(
    (c) => c.productId === productId && (c.selectedColor || "") === color && (c.selectedSize || "") === size
  );
  if (existing) {
    existing.quantity = Math.min(Number(prod.stock || 20), Number(existing.quantity || 1) + 1);
  } else {
    state.cart.push({
      productId: prod.id,
      productName: prod.name,
      unitPrice: prod.price,
      mainImageUrl: prod.mainImageUrl || "",
      quantity: 1,
      selectedColor: color,
      selectedSize: size,
      savedForLater: false,
    });
  }
  syncCartToServer();
  toast(`${prod.name} added to cart!`);
  render();
}

async function toggleWishlist(productId) {
  if (!state.customer) {
    openAuthModal("login", () => toggleWishlist(productId));
    return;
  }
  try {
    const res = await api("/api/customer/wishlist/toggle", {
      method: "POST",
      body: JSON.stringify({ productId }),
    });
    if (res.wished) {
      if (!state.wishlistIds.includes(productId)) state.wishlistIds.push(productId);
      toast("Saved to wishlist!");
    } else {
      state.wishlistIds = state.wishlistIds.filter((id) => id !== productId);
      toast("Removed from wishlist.");
    }
    render();
  } catch (err) {
    toast(err.message, true);
  }
}

function startCheckoutFlow() {
  if (state.cart.length === 0) {
    toast("Add products to your cart first.", true);
    return;
  }
  if (!state.customer) {
    openAuthModal("register", () => openCheckoutModal());
    return;
  }
  openCheckoutModal();
}

// ======================== FLOATING SOCIAL SUPPORT & 3D POPUP ========================

function trackAnalytics(event) {
  fetch("/api/public/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
  }).catch(() => {});
}

function renderSocialBadgeIcon(p) {
  if (isSafeHttpUrl(p.iconUrl)) {
    return `<span class="social-icon-dot"><img src="${escapeHtml(p.iconUrl)}" alt="${escapeHtml(p.name)}" /></span>`;
  }
  const letters = { facebook: "f", youtube: "▶", tiktok: "♪", telegram: "✈" };
  const bg = p.id === "tiktok" ? "linear-gradient(135deg,#111827,#FE2C55,#00F2EA)" : escapeHtml(p.colorHex || "#8B5CF6");
  return `<span class="social-icon-dot" style="background:${bg}">${letters[p.id] || "★"}</span>`;
}

function openSafeSocialLink(platform) {
  const map = { facebook: "fb_click", youtube: "yt_click", tiktok: "tt_click", telegram: "tg_click" };
  if (map[platform.id]) trackAnalytics(map[platform.id]);
  if (!isSafeHttpUrl(platform.url)) {
    toast(`${platform.name} link is not configured in Admin Panel yet.`, true);
    return;
  }
  window.open(platform.url.trim(), "_blank", "noopener,noreferrer");
}

function renderFloatingSocialSupport() {
  const root = document.getElementById("floatingSocialRoot");
  if (!root) return;
  const cfg = state.socialSupport;
  if (!cfg || cfg.enabled === false) {
    root.innerHTML = "";
    return;
  }
  const platforms = (cfg.platforms || []).filter((p) => p.enabled !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  if (platforms.length === 0) {
    root.innerHTML = "";
    return;
  }

  root.className = "floating-social-root";
  if (cfg.position === "TOP_RIGHT") root.classList.add("pos-top");
  else if (cfg.position === "MID_RIGHT") root.classList.add("pos-mid");

  root.innerHTML = `
    ${
      state.socialOpen
        ? `
      <div class="social-menu-panel" style="background:${escapeHtml(cfg.menuBgHex || "#140F2A")}">
        ${cfg.welcomeText ? `<div class="small" style="color:#00D4FF;font-weight:700;padding:2px 4px">✨ ${escapeHtml(cfg.welcomeText)}</div>` : ""}
        ${platforms
          .map(
            (p, idx) => `
          <button type="button" class="social-option-item" style="animation-delay:${idx * 55}ms" data-social-id="${escapeHtml(p.id)}">
            ${renderSocialBadgeIcon(p)}
            <div style="text-align:left;min-width:0;flex:1">
              <div style="font-weight:700;font-size:.86rem">${escapeHtml(p.name)}</div>
              ${p.subtitle ? `<div style="font-size:.72rem;opacity:.75">${escapeHtml(p.subtitle)}</div>` : ""}
            </div>
            <span>↗</span>
          </button>`
          )
          .join("")}
      </div>`
        : ""
    }
    <button
      type="button"
      class="social-fab-btn ${state.socialOpen ? "open" : ""}"
      id="socialFabTrigger"
      style="background:linear-gradient(135deg, ${escapeHtml(cfg.primaryHex || "#8B5CF6")}, #00D4FF)"
      aria-label="${state.socialOpen ? "Close social support" : "Open social support"}"
    >
      <span>+</span>
    </button>
  `;

  document.getElementById("socialFabTrigger").onclick = () => {
    state.socialOpen = !state.socialOpen;
    renderFloatingSocialSupport();
  };
  root.querySelectorAll("[data-social-id]").forEach((btn) => {
    btn.onclick = () => {
      const p = platforms.find((x) => x.id === btn.getAttribute("data-social-id"));
      if (p) openSafeSocialLink(p);
      state.socialOpen = false;
      renderFloatingSocialSupport();
    };
  });
}

function shouldShowPopup(popup) {
  if (!popup || popup.active === false) return false;
  const now = Date.now();
  if (popup.startDate && Date.parse(popup.startDate) > now) return false;
  if (popup.endDate && Date.parse(popup.endDate) < now) return false;

  const isReturning = localStorage.getItem(STORAGE_VISITED) === "1";
  if (popup.targetAudience === "NEW_VISITORS" && isReturning) return false;

  let dismissals = {};
  try {
    dismissals = JSON.parse(localStorage.getItem(STORAGE_POPUP_DISMISS) || "{}");
  } catch {
    dismissals = {};
  }
  const lastAt = Number(dismissals[popup.id] || 0);
  if (popup.frequency === "EVERY_VISIT") return !state.popupShownThisSession;
  if (popup.frequency === "ONCE_PER_SESSION") return !state.popupShownThisSession;
  if (popup.frequency === "ONCE_PER_USER") return lastAt === 0;
  if (popup.frequency === "ONCE_PER_WEEK") return now - lastAt > 7 * 86400000;
  return now - lastAt > 86400000; // ONCE_PER_DAY
}

function evaluateAndShowWelcomePopup() {
  const popup = (state.popups || []).find((p) => shouldShowPopup(p));
  localStorage.setItem(STORAGE_VISITED, "1");
  if (!popup) return;

  const delayMs = Math.max(0, Number(popup.delaySeconds || 1)) * 1000;
  setTimeout(() => {
    const root = document.getElementById("welcomePopupRoot");
    if (!root || state.popupShownThisSession) return;
    state.popupShownThisSession = true;
    trackAnalytics("popup_impression");

    const platforms = (state.socialSupport?.platforms || []).filter((p) => p.enabled !== false);
    const imgSrc = isSafeHttpUrl(popup.imageUrl) ? popup.imageUrl : "/welcome-3d.jpg";

    root.innerHTML = `
      <div class="popup-3d-card" style="background:${escapeHtml(popup.bgHex || "#120B29")}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
          <div style="display:flex;align-items:center;gap:10px">
            <img src="/logo.svg" alt="MY Shop" style="width:40px;height:40px" />
            <div>
              <strong>MY Shop</strong>
              <div class="small" style="color:#00D4FF">${escapeHtml(popup.subtitle || "Shop Smart • Live Happy!")}</div>
            </div>
          </div>
          <button type="button" class="close-circle" id="close3dPopupBtn" aria-label="Close">✕</button>
        </div>
        <img src="${escapeHtml(imgSrc)}" alt="MY Shop Welcome" class="popup-art-img" />
        <h2 style="text-align:center;margin-bottom:6px">${escapeHtml(popup.title || "Welcome to MY Shop!")}</h2>
        <p class="small" style="text-align:center;opacity:.84">${escapeHtml(popup.description || "")}</p>
        ${
          popup.includeSocialButtons !== false && platforms.length
            ? `<div class="popup-social-grid">
                ${platforms
                  .map(
                    (p) => `
                  <button type="button" class="popup-social-btn" data-pop-social="${escapeHtml(p.id)}">
                    ${renderSocialBadgeIcon(p)}
                    <span>${escapeHtml(p.name.replace(" Support", ""))}</span>
                  </button>`
                  )
                  .join("")}
              </div>`
            : ""
        }
        <button type="button" class="btn-neon full-width" id="popupCtaBtn">
          ✨ ${escapeHtml(popup.buttonText || "Join Our Community")}
        </button>
      </div>
    `;
    root.classList.remove("hidden");

    const dismiss = () => {
      root.classList.add("hidden");
      root.innerHTML = "";
      trackAnalytics("popup_close");
      try {
        const d = JSON.parse(localStorage.getItem(STORAGE_POPUP_DISMISS) || "{}");
        d[popup.id] = Date.now();
        localStorage.setItem(STORAGE_POPUP_DISMISS, JSON.stringify(d));
      } catch {
        // Ignore
      }
    };

    document.getElementById("close3dPopupBtn").onclick = dismiss;
    document.getElementById("popupCtaBtn").onclick = () => {
      if (isSafeHttpUrl(popup.buttonUrl)) {
        window.open(popup.buttonUrl, "_blank", "noopener,noreferrer");
      }
      dismiss();
    };
    root.querySelectorAll("[data-pop-social]").forEach((b) => {
      b.onclick = () => {
        const p = platforms.find((x) => x.id === b.getAttribute("data-pop-social"));
        if (p) openSafeSocialLink(p);
      };
    });

    if (Number(popup.durationSeconds || 0) > 0) {
      setTimeout(dismiss, Number(popup.durationSeconds) * 1000);
    }
  }, delayMs);
}

// ======================== BOOTSTRAP & EVENT DELEGATION ========================

async function refreshCustomerOrders() {
  if (!state.customer) return;
  try {
    const res = await api("/api/customer/orders");
    state.orders = Array.isArray(res.items) ? res.items : [];
  } catch {
    state.orders = [];
  }
}

async function loadBootstrap() {
  try {
    const [boot, me] = await Promise.all([
      api("/api/public/storefront-bootstrap"),
      api("/api/customer/auth/me").catch(() => ({ authenticated: false })),
    ]);

    state.siteConfig = boot.siteConfig || {};
    state.announcement = boot.announcement || {};
    state.socialSupport = boot.socialSupport || null;
    state.popups = Array.isArray(boot.popups) ? boot.popups : [];
    state.products = Array.isArray(boot.products) ? boot.products : [];
    state.categories = Array.isArray(boot.categories) ? boot.categories : [];
    state.brands = Array.isArray(boot.brands) ? boot.brands : [];
    state.coupons = Array.isArray(boot.coupons) ? boot.coupons : [];
    state.deliveryZones = Array.isArray(boot.deliveryZones) ? boot.deliveryZones : [];

    if (me.authenticated && me.customer) {
      state.customer = me.customer;
      if (Array.isArray(me.cart)) state.cart = me.cart;
      state.wishlistIds = Array.isArray(me.wishlistIds) ? me.wishlistIds : [];
      state.addresses = Array.isArray(me.addresses) ? me.addresses : [];
      state.notifications = Array.isArray(me.notifications) ? me.notifications : [];
      await refreshCustomerOrders();
    }
  } catch (err) {
    toast(`Storefront sync notice: ${err.message}`, true);
  } finally {
    state.loading = false;
    render();
    evaluateAndShowWelcomePopup();
  }
}

document.addEventListener("click", async (e) => {
  const navTarget = e.target.closest("[data-nav]")?.getAttribute("data-nav");
  if (navTarget) {
    e.preventDefault();
    state.view = navTarget;
    window.scrollTo({ top: 0, behavior: "smooth" });
    render();
    return;
  }

  const actionEl = e.target.closest("[data-action]");
  if (!actionEl) return;
  const action = actionEl.getAttribute("data-action");
  const id = actionEl.getAttribute("data-id");

  if (action === "open-product") openProductModal(id);
  else if (action === "close-modal") closeModal();
  else if (action === "add-cart") addToCart(id);
  else if (action === "toggle-wish") toggleWishlist(id);
  else if (action === "open-auth") openAuthModal("login");
  else if (action === "filter-cat") {
    state.filters.category = actionEl.getAttribute("data-cat") || "ALL";
    render();
  } else if (action === "filter-brand") {
    const b = actionEl.getAttribute("data-brand") || "";
    state.filters.brand = state.filters.brand === b ? "" : b;
    render();
  } else if (action === "clear-brand") {
    state.filters.brand = "";
    render();
  } else if (action === "filter-tab") {
    state.filters.tab = actionEl.getAttribute("data-tab") || "all";
    render();
  } else if (action === "reset-filters") {
    state.filters = { search: "", category: "ALL", brand: "", tab: "all", sort: "newest" };
    document.getElementById("globalSearchInput").value = "";
    render();
  } else if (action === "cart-qty") {
    const idx = Number(actionEl.getAttribute("data-idx"));
    const delta = Number(actionEl.getAttribute("data-delta"));
    if (state.cart[idx]) {
      state.cart[idx].quantity += delta;
      if (state.cart[idx].quantity <= 0) state.cart.splice(idx, 1);
      syncCartToServer();
      render();
    }
  } else if (action === "cart-remove") {
    const idx = Number(actionEl.getAttribute("data-idx"));
    state.cart.splice(idx, 1);
    syncCartToServer();
    render();
  } else if (action === "apply-coupon") {
    const code = (document.getElementById("couponInput")?.value || "").trim().toUpperCase();
    const match = state.coupons.find((c) => String(c.code).toUpperCase() === code);
    if (!code) {
      state.appliedCoupon = "";
      render();
    } else if (!match) {
      toast("Invalid or expired coupon code.", true);
    } else {
      state.appliedCoupon = match.code;
      toast(`Coupon ${match.code} applied!`);
      render();
    }
  } else if (action === "apply-coupon-quick") {
    state.appliedCoupon = actionEl.getAttribute("data-code") || "";
    state.view = "cart";
    toast(`Coupon ${state.appliedCoupon} ready in cart!`);
    render();
  } else if (action === "start-checkout") {
    startCheckoutFlow();
  } else if (action === "refresh-orders") {
    await refreshCustomerOrders();
    render();
  } else if (action === "delete-address") {
    await api(`/api/customer/addresses/${encodeURIComponent(id)}`, { method: "DELETE" });
    state.addresses = state.addresses.filter((a) => a.id !== id);
    toast("Address deleted.");
    render();
  } else if (action === "customer-logout") {
    await api("/api/customer/auth/logout", { method: "POST" });
    state.customer = null;
    state.orders = [];
    state.wishlistIds = [];
    state.addresses = [];
    state.cart = loadGuestCart();
    toast("Signed out.");
    render();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("globalSearchInput");
  searchInput.addEventListener("input", () => {
    state.filters.search = searchInput.value;
    if (state.view !== "home" && state.view !== "categories") state.view = "home";
    render();
  });
  document.getElementById("searchSubmitBtn").onclick = () => {
    state.filters.search = searchInput.value;
    state.view = "home";
    render();
  };
  document.getElementById("langToggleBtn").onclick = () => {
    state.lang = state.lang === "EN" ? "BN" : "EN";
    render();
  };
  document.getElementById("themeToggleBtn").onclick = () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    render();
  };
  document.getElementById("topAccountBtn").onclick = () => {
    if (state.customer) {
      state.view = "profile";
      render();
    } else {
      openAuthModal("login");
    }
  };

  loadBootstrap();
});
