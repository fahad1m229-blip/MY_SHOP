// MY Shop Customer Shopping Website (Web Storefront)
// Opens at "/" and communicates strictly with /api/public/* and /api/customer/*.
// Never exposes Admin Panel controls or redirects visitors to /admin.

const I18N = {
  EN: {
    home: "Home",
    categories: "Explore",
    deals: "Deals & Coupons",
    funZone: "Fun Zone",
    aiHelper: "MY AI",
    orders: "Orders",
    profile: "Account",
    wishlist: "Wishlist",
    cart: "Cart",
    signIn: "Sign In",
    guestBanner: "Guest Browsing Active — Explore & add to cart freely without an account!",
    heroBadge: "CYBER MEGA DEALS • UP TO 40% OFF",
    heroTitle: "Future Tech & Lifestyle at MY Shop",
    heroSub: "Use code MYSHOP10 for 10% off • Automatic Free Delivery on ৳2,500+ • Live inventory & Fun Zone rewards.",
    shopNow: "Shop Flash Deals",
    viewDeals: "Deals & Coupons",
    allCategories: "All 16 Categories",
    flashSale: "Flash Sale",
    todaysDeals: "Today's Deals",
    trendingNow: "Trending Now",
    featured: "Featured",
    trending: "Trending",
    bestSeller: "Best Sellers",
    newArrivals: "New Arrivals",
    recentlyViewed: "Recently Viewed",
    freeDelivery: "Free Delivery",
    popularBrands: "Popular Brands",
    customerReviews: "Verified Customer Reviews",
    addToCart: "Add to Cart",
    outOfStock: "Out of Stock",
    buyNow: "Buy Now",
    emptyCatalogTitle: "No published products match right now",
    emptyCatalogDesc: "Try clearing your search filter or publish products from MY Shop Admin.",
    emptyCartTitle: "Your shopping cart is empty",
    emptyCartDesc: "Browse products as a guest or sign in — your cart items are always preserved.",
    checkoutTitle: "Secure Checkout",
    placeOrder: "Place Order",
    myOrders: "Order History",
    myProfile: "Customer Profile & Addresses",
  },
  BN: {
    home: "হোম",
    categories: "সব দেখুন",
    deals: "অফার ও কুপন",
    funZone: "ফান জোন",
    aiHelper: "MY AI",
    orders: "অর্ডার",
    profile: "অ্যাকাউন্ট",
    wishlist: "উইশলিস্ট",
    cart: "কার্ট",
    signIn: "সাইন ইন",
    guestBanner: "গেস্ট ব্রাউজিং চালু — লগইন ছাড়াই সব প্রোডাক্ট দেখুন ও কার্টে যোগ করুন!",
    heroBadge: "সাইবার মেগা ডিল • ৪০% পর্যন্ত ছাড়",
    heroTitle: "MY Shop-এ স্মার্ট শপিং, হ্যাপি লাইফ",
    heroSub: "MYSHOP10 কুপনে ১০% ছাড় • ৳২,৫০০+ অর্ডারে ফ্রি ডেলিভারি • লাইভ স্টক ও ফান জোন রিওয়ার্ড!",
    shopNow: "ফ্ল্যাশ ডিল দেখুন",
    viewDeals: "অফার ও কুপন",
    allCategories: "সব ১৬টি ক্যাটাগরি",
    flashSale: "ফ্ল্যাশ সেল",
    todaysDeals: "আজকের সেরা অফার",
    trendingNow: "ট্রেন্ডিং পণ্য",
    featured: "ফিচার্ড",
    trending: "ট্রেন্ডিং",
    bestSeller: "বেস্ট সেলার",
    newArrivals: "নতুন কালেকশন",
    recentlyViewed: "সম্প্রতি দেখেছেন",
    freeDelivery: "ফ্রি ডেলিভারি",
    popularBrands: "জনপ্রিয় ব্র্যান্ড",
    customerReviews: "গ্রাহকদের রিভিউ",
    addToCart: "কার্টে যোগ করুন",
    outOfStock: "স্টক শেষ",
    buyNow: "এখনই কিনুন",
    emptyCatalogTitle: "এই মুহূর্তে কোনো প্রোডাক্ট পাওয়া যায়নি",
    emptyCatalogDesc: "ফিল্টার রিসেট করুন অথবা অ্যাডমিন প্যানেল থেকে নতুন প্রোডাক্ট পাবলিশ করুন।",
    emptyCartTitle: "আপনার কার্ট এখন খালি",
    emptyCartDesc: "গেস্ট হিসেবেই পণ্য কার্টে যোগ করতে পারবেন—সাইন ইন করলেও কার্ট হারাবেনা।",
    checkoutTitle: "নিরাপদ চেকআউট",
    placeOrder: "অর্ডার কনফার্ম করুন",
    myOrders: "অর্ডার হিস্ট্রি",
    myProfile: "প্রোফাইল ও ঠিকানা",
  },
};

const CATEGORY_VISUALS = {
  MOBILES: { emoji: "📱", bg: ["#8B5CF6", "#00D4FF"], badge: "5G & AI" },
  COMPUTERS: { emoji: "💻", bg: ["#3B82F6", "#22D3EE"], badge: "PRO" },
  ELECTRONICS: { emoji: "🎧", bg: ["#EC4899", "#8B5CF6"], badge: "HOT" },
  FASHION: { emoji: "🧥", bg: ["#F43F5E", "#FB7185"], badge: "NEW" },
  SHOES: { emoji: "👟", bg: ["#06B6D4", "#3B82F6"], badge: "DROP" },
  BEAUTY: { emoji: "✨", bg: ["#D946EF", "#F472B6"], badge: "GLOW" },
  HOME_LIVING: { emoji: "🛋️", bg: ["#10B981", "#06B6D4"], badge: "COZY" },
  FURNITURE: { emoji: "🪑", bg: ["#F59E0B", "#EF4444"], badge: "CRAFT" },
  TOYS: { emoji: "🤖", bg: ["#A855F7", "#F43F5E"], badge: "FUN" },
  SPORTS: { emoji: "🏋️", bg: ["#14B8A6", "#3B82F6"], badge: "FIT" },
  BOOKS: { emoji: "📚", bg: ["#6366F1", "#A855F7"], badge: "READ" },
  GROCERY: { emoji: "🍯", bg: ["#22C55E", "#10B981"], badge: "FRESH" },
  BABY: { emoji: "🍼", bg: ["#F472B6", "#38BDF8"], badge: "CARE" },
  ACCESSORIES: { emoji: "⌚", bg: ["#EAB308", "#A855F7"], badge: "STYLE" },
  GAMING: { emoji: "🎮", bg: ["#FF2E93", "#00D4FF"], badge: "RGB" },
  AUTOMOTIVE: { emoji: "🚗", bg: ["#64748B", "#38BDF8"], badge: "DRIVE" },
};

const POPULAR_SEARCHES = [
  "Phone under ৳20,000",
  "ANC Headphones",
  "OLED Laptop",
  "Mechanical Keyboard",
  "Running Shoes",
  "Glow Serum",
  "Smartwatch",
];

const FUN_QUIZ = [
  {
    q: "What minimum order value unlocks automatic Free Express Delivery on MY Shop?",
    opts: ["৳500", "৳2,500", "৳15,000", "৳50,000"],
    ans: 1,
    exp: "Orders of ৳2,500+ (or any Free Delivery product / FREEDEL code) ship free!",
  },
  {
    q: "Which MY Shop smartphone packs 5G, 120Hz AMOLED & 67W turbo charge under ৳20,000?",
    opts: ["AeroBook Pro 14", "NovaPulse 5G", "VeloGear Phantom", "ApexTab Ultra"],
    ans: 1,
    exp: "NovaPulse 5G (8GB/256GB) is ৳18,990 during Flash Sale!",
  },
  {
    q: "Which code gives instant 10% Off on eligible MY Shop orders ৳1,000+?",
    opts: ["MYSHOP10", "ZERO0", "NOBONUS", "TEST999"],
    ans: 0,
    exp: "MYSHOP10 unlocks 10% instant savings across the store!",
  },
];

const FUNNY_CARDS = [
  {
    id: "fun_1",
    title: "Wi-Fi Enabled Pet Rock Pro Max",
    fakePrice: "৳99,999 (Not for sale!)",
    joke: "Does absolutely nothing, just like your 47 open browser tabs of things you swore you'd buy next payday.",
    punch: "Includes 0% battery anxiety because it is literally a stone.",
  },
  {
    id: "fun_2",
    title: "Anti-Procrastination Alarm Mug",
    fakePrice: "৳0 (Mental Tax)",
    joke: "Add to Cart -> Close Tab -> Reopen 3 mins later hoping delivery fee magically vanished.",
    punch: "Spoiler: Use code FREEDEL or spend ৳2,500+ and delivery IS actually free!",
  },
];

const DEFAULT_SOCIAL_SUPPORT = {
  enabled: true,
  position: "BOTTOM_RIGHT",
  buttonSize: "MEDIUM",
  animationStyle: "FLOAT_GLOW",
  menuBgHex: "#140F2A",
  primaryHex: "#8B5CF6",
  welcomeText: "Connect with MY Shop Support",
  platforms: [
    { id: "facebook", name: "Facebook Support", subtitle: "Message us on Facebook", url: "", colorHex: "#1877F2", enabled: true, sortOrder: 1 },
    { id: "youtube", name: "YouTube Support", subtitle: "Product demos & guides", url: "", colorHex: "#FF0000", enabled: true, sortOrder: 2 },
    { id: "tiktok", name: "TikTok Support", subtitle: "Trending flash clips", url: "", colorHex: "#FE2C55", enabled: true, sortOrder: 3 },
    { id: "telegram", name: "Telegram Support", subtitle: "Fast VIP community", url: "", colorHex: "#26A5E4", enabled: true, sortOrder: 4 },
  ],
};

const STORAGE_GUEST_CART = "myshop_guest_cart_v1";
const STORAGE_THEME = "myshop_web_theme_v1";
const STORAGE_LANG = "myshop_web_lang_v1";
const STORAGE_POPUP_DISMISS = "myshop_popup_dismiss_v1";
const STORAGE_VISITED = "myshop_web_visited_v1";
const STORAGE_RECENT = "myshop_recent_v1";
const STORAGE_FUN = "myshop_fun_progress_v1";

function loadJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveJsonStorage(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // Ignore quota errors
  }
}

const initialFun = loadJsonStorage(STORAGE_FUN, {
  points: 150,
  streak: 1,
  lastSpinDate: "",
  lastScratchDate: "",
  lastStreakDate: "",
  quizIdx: 0,
  quizAnswered: null,
  foundTreasures: [],
  spinResult: "",
  scratchRevealed: false,
});

const state = {
  view: "home", // home | categories | deals | funzone | ai | cart | wishlist | orders | profile
  lang: localStorage.getItem(STORAGE_LANG) === "BN" ? "BN" : "EN",
  theme: localStorage.getItem(STORAGE_THEME) === "light" ? "light" : "dark",
  loading: true,
  firebaseConnected: true,
  syncNoticeDismissed: false,
  siteConfig: {},
  announcement: {},
  socialSupport: DEFAULT_SOCIAL_SUPPORT,
  popups: [],
  products: [],
  categories: [],
  brands: [],
  coupons: [],
  deliveryZones: [],
  funZone: { spinEnabled: true, scratchEnabled: true, treasureEnabled: true, quizEnabled: true, funnyZoneEnabled: true },
  aiSettings: {
    enabled: true,
    assistantName: "MY AI Shopping Assistant",
    welcomeMessage: "Hi! Ask me for phone deals under ৳20,000, ANC headphones, gaming gear, or free delivery offers.",
    suggestedPrompts: ["Phone under ৳20,000", "Best ANC headphones", "Free delivery items", "Show gaming gear"],
  },
  customer: null,
  cart: loadJsonStorage(STORAGE_GUEST_CART, []),
  wishlistIds: [],
  recentlyViewedIds: loadJsonStorage(STORAGE_RECENT, []),
  compareIds: [],
  orders: [],
  addresses: [],
  notifications: [],
  filters: {
    search: "",
    category: "ALL",
    brand: "",
    tab: "all", // all | featured | trending | bestSeller | freeDelivery | flashSale
    sort: "newest",
  },
  appliedCoupon: "",
  socialOpen: false,
  popupShownThisSession: false,
  flashSeconds: 5 * 3600 + 42 * 60 + 19,
  funTab: "spin",
  spinAngle: 0,
  spinBusy: false,
  fun: initialFun,
  aiMessages: [],
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

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatCountdown(totalSecs) {
  const hrs = String(Math.floor(totalSecs / 3600)).padStart(2, "0");
  const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, "0");
  const secs = String(totalSecs % 60).padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

function toast(msg, isError = false) {
  const el = document.getElementById("toastBanner");
  if (!el) return;
  el.textContent = msg;
  el.className = isError ? "toast error" : "toast";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), 3400);
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

function getCategoryMeta(catId) {
  const upper = String(catId || "ACCESSORIES").toUpperCase();
  const matched = state.categories.find((c) => String(c.id).toUpperCase() === upper);
  const vis = CATEGORY_VISUALS[upper] || { emoji: "🛍️", bg: ["#8B5CF6", "#00D4FF"], badge: "DEAL" };
  return {
    id: upper,
    title:
      state.lang === "BN"
        ? matched?.titleBn || matched?.titleEn || matched?.name || upper
        : matched?.titleEn || matched?.name || upper,
    emoji: matched?.emoji || vis.emoji,
    accent: matched?.accentHex || vis.bg[0],
    secondary: matched?.secondaryHex || vis.bg[1],
    badge: matched?.badgeText || vis.badge,
  };
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

function getSocialSvg(platformId) {
  switch (String(platformId || "").toLowerCase()) {
    case "facebook":
      return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"/></svg>`;
    case "youtube":
      return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.58 7.19a2.75 2.75 0 0 0-1.94-1.95C17.93 4.75 12 4.75 12 4.75s-5.93 0-7.64.49A2.75 2.75 0 0 0 2.42 7.19 28.8 28.8 0 0 0 2 12a28.8 28.8 0 0 0 .42 4.81 2.75 2.75 0 0 0 1.94 1.95c1.71.49 7.64.49 7.64.49s5.93 0 7.64-.49a2.75 2.75 0 0 0 1.94-1.95A28.8 28.8 0 0 0 22 12a28.8 28.8 0 0 0-.42-4.81zM10 15.25v-6.5L15.75 12 10 15.25z"/></svg>`;
    case "tiktok":
      return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.77.12V9.79a5.65 5.65 0 0 0-.77-.05 5.71 5.71 0 1 0 5.71 5.71V9.14a7.33 7.33 0 0 0 4.29 1.38V7.43c-.96 0-2.4-.52-3.26-1.61z"/></svg>`;
    case "telegram":
      return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.42 3.67 2.83 10.84c-1.27.51-1.26 1.22-.23 1.54l4.77 1.49 11.04-6.97c.52-.32 1-.15.61.2L10.08 15.2l-.35 5.18c.52 0 .75-.24 1.04-.52l2.5-2.43 5.19 3.83c.96.53 1.65.26 1.89-.89l3.41-16.08c.35-1.4-.53-2.04-1.34-1.62z"/></svg>`;
    default:
      return "★";
  }
}

function renderSocialBadgeIcon(p) {
  if (isSafeHttpUrl(p.iconUrl)) {
    return `<span class="social-icon-dot"><img src="${escapeHtml(p.iconUrl)}" alt="${escapeHtml(p.name)}" /></span>`;
  }
  const bg = p.id === "tiktok" ? "linear-gradient(135deg,#111827,#FE2C55,#00F2EA)" : escapeHtml(p.colorHex || "#8B5CF6");
  return `<span class="social-icon-dot" style="background:${bg}">${getSocialSvg(p.id)}</span>`;
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
    cfg.description || "Next-generation futuristic e-commerce platform synchronized with live catalog & Fun Zone rewards.";
  document.getElementById("footerContactEmail").textContent = cfg.contactEmail || "support@myshop.example";
  document.getElementById("footerContactPhone").textContent = cfg.contactPhone || "+880 1700-000000";
  document.getElementById("footerAddress").textContent = cfg.address || "Gulshan-2, Dhaka 1212, Bangladesh";
  document.getElementById("footerCopyright").textContent = cfg.footerText || `© ${siteName} • ${tagline}`;

  // Footer Social Pills (Facebook / YouTube / TikTok / Telegram)
  const footerSocialRow = document.getElementById("footerSocialRow");
  if (footerSocialRow) {
    const platforms = ((state.socialSupport || DEFAULT_SOCIAL_SUPPORT).platforms || []).filter((p) => p.enabled !== false);
    footerSocialRow.innerHTML = platforms
      .map(
        (p) => `
      <button type="button" class="footer-social-pill" data-footer-social="${escapeHtml(p.id)}">
        ${renderSocialBadgeIcon(p)}
        <span>${escapeHtml(p.name.replace(" Support", ""))}</span>
      </button>`
      )
      .join("");
    footerSocialRow.querySelectorAll("[data-footer-social]").forEach((btn) => {
      btn.onclick = () => {
        const p = platforms.find((x) => x.id === btn.getAttribute("data-footer-social"));
        if (p) openSafeSocialLink(p);
      };
    });
  }

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

  // Render Firebase connection notice if Render Admin SDK env is not configured
  const syncBar = document.getElementById("syncStatusBar");
  const syncText = document.getElementById("syncStatusText");
  if (syncBar && syncText) {
    if (!state.firebaseConnected && !state.syncNoticeDismissed) {
      syncText.textContent =
        state.lang === "BN"
          ? "প্রিভিউ মোড চালু: Render-এ FIREBASE_SERVICE_ACCOUNT_JSON/BASE64 যোগ করলে অ্যাডমিন ও ইউজার লাইভ সিঙ্ক হবে।"
          : "Starter Catalog Mode: Set FIREBASE_SERVICE_ACCOUNT_JSON / BASE64 on Render to sync custom Admin edits & customer accounts live.";
      syncBar.classList.remove("hidden");
    } else {
      syncBar.classList.add("hidden");
    }
  }

  // Cart, Wishlist, Account badges
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

  // Sticky Compare Bar
  const cmpRoot = document.getElementById("compareBarRoot");
  if (cmpRoot) {
    if (state.compareIds.length > 0) {
      cmpRoot.classList.remove("hidden");
      cmpRoot.innerHTML = `
        <span class="small"><strong>${state.compareIds.length}/4</strong> selected</span>
        <button type="button" class="btn-neon sm" data-action="open-compare">Compare Now</button>
        <button type="button" class="btn-outline sm" data-action="clear-compare">Clear</button>
      `;
    } else {
      cmpRoot.classList.add("hidden");
    }
  }
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
  if (tab === "flashSale") list = list.filter((p) => p.flashSale || p.discountPercent >= 20);

  if (sort === "price_asc") list.sort((a, b) => a.price - b.price);
  else if (sort === "price_desc") list.sort((a, b) => b.price - a.price);
  else if (sort === "discount") list.sort((a, b) => b.discountPercent - a.discountPercent);
  return list;
}

function renderProductVisual(p, cls = "product-thumb") {
  const title = state.lang === "BN" && p.nameBn ? p.nameBn : p.name;
  if (isSafeHttpUrl(p.mainImageUrl)) {
    return `<img src="${escapeHtml(p.mainImageUrl)}" alt="${escapeHtml(title)}" class="${cls}" loading="lazy" />`;
  }
  const meta = getCategoryMeta(p.categoryId);
  const accent = p.accentHex || meta.accent;
  const sec = p.secondaryHex || meta.secondary;
  return `
    <div class="product-art-fallback" style="background:linear-gradient(135deg, ${escapeHtml(accent)}, ${escapeHtml(sec)})">
      <div class="art-emoji">${meta.emoji}</div>
      <span class="art-chip">${escapeHtml(p.brand || "MY Shop")} • ${escapeHtml(meta.badge)}</span>
    </div>
  `;
}

function renderProductCard(p) {
  const title = state.lang === "BN" && p.nameBn ? p.nameBn : p.name;
  const wished = state.wishlistIds.includes(p.id);
  const compared = state.compareIds.includes(p.id);
  const outOfStock = !p.available || Number(p.stock || 0) <= 0;

  return `
    <article class="product-card" data-product-id="${escapeHtml(p.id)}">
      <div class="product-thumb-wrap" data-action="open-product" data-id="${escapeHtml(p.id)}">
        ${renderProductVisual(p)}
        ${p.discountPercent > 0 ? `<span class="discount-pill">-${p.discountPercent}%</span>` : ""}
        <button type="button" class="cmp-float-btn ${compared ? "active" : ""}" data-action="toggle-compare" data-id="${escapeHtml(p.id)}" title="Compare">⚖️</button>
        <button type="button" class="wish-float-btn" data-action="toggle-wish" data-id="${escapeHtml(p.id)}" aria-label="Wishlist">
          ${wished ? "❤️" : "🤍"}
        </button>
      </div>
      <div class="product-body">
        <div class="product-brand">${escapeHtml(p.brand || "MY Shop")} • ${escapeHtml(getCategoryMeta(p.categoryId).title)}</div>
        <h3 class="product-title" data-action="open-product" data-id="${escapeHtml(p.id)}">${escapeHtml(title)}</h3>
        <div class="rating-line">★ ${Number(p.rating || 4.8).toFixed(1)} <span class="muted">(${p.reviewCount || 0})</span></div>
        <div class="price-row">
          <span class="price-now">${money(p.price)}</span>
          ${p.originalPrice > p.price ? `<span class="price-old">${money(p.originalPrice)}</span>` : ""}
        </div>
        <div class="stock-meta">
          <span>${outOfStock ? `<span style="color:#fca5a5">${t("outOfStock")}</span>` : `Stock: ${p.stock}`}</span>
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
    : Object.keys(CATEGORY_VISUALS).map((id, i) => ({ id, titleEn: id, orderIndex: i + 1 }));

  const guestStrip = !state.customer && mode === "home"
    ? `
    <div class="guest-strip">
      <span>🧭 ${escapeHtml(t("guestBanner"))}</span>
      <button type="button" class="link-btn" style="color:var(--electric-blue);font-weight:700" data-action="open-auth">${t("signIn")}</button>
    </div>`
    : "";

  const popularRow = mode === "home"
    ? `
    <div class="chips-row" style="margin-bottom:14px">
      ${POPULAR_SEARCHES.map(
        (q) => `<button type="button" class="chip" data-action="quick-search" data-q="${escapeHtml(q)}">🔥 ${escapeHtml(q)}</button>`
      ).join("")}
    </div>`
    : "";

  const heroHtml =
    mode === "home" && !state.filters.search
      ? `
      <section class="hero-banner glass-panel">
        <div>
          <span class="hero-badge">⚡ ${escapeHtml(t("heroBadge"))}</span>
          <h1>${escapeHtml(t("heroTitle"))}</h1>
          <p>${escapeHtml(t("heroSub"))}</p>
          <div class="hero-actions">
            <button type="button" class="btn-neon" onclick="document.getElementById('catalogSection').scrollIntoView({behavior:'smooth'})">
              ⚡ ${escapeHtml(t("shopNow"))}
            </button>
            <button type="button" class="btn-outline" data-nav="deals">${escapeHtml(t("viewDeals"))}</button>
            <button type="button" class="btn-outline" data-nav="funzone">🎮 ${escapeHtml(t("funZone"))}</button>
          </div>
        </div>
        <div>
          <img src="/hero-deals.jpg" alt="MY Shop Cyber Deals" class="hero-art" onerror="this.src='/welcome-3d.jpg'" />
        </div>
      </section>
    `
      : "";

  const banners = Array.isArray(state.siteConfig?.banners) ? state.siteConfig.banners : [];
  const bannerRow =
    mode === "home" && banners.length && !state.filters.search
      ? `
      <div class="chips-row" style="margin-bottom:14px">
        ${banners
          .map(
            (b) => `
          <div class="panel-card" style="min-width:265px;margin:0;padding:12px">
            <strong>${escapeHtml(b.title || "Special Offer")}</strong>
            <p class="small muted">${escapeHtml(b.subtitle || "")}</p>
          </div>`
          )
          .join("")}
      </div>`
      : "";

  const categoryCardsHtml = `
    <div class="section-head">
      <h2>🗂️ ${escapeHtml(t("allCategories"))}</h2>
      ${
        state.filters.category !== "ALL" || state.filters.brand
          ? `<button type="button" class="btn-outline sm" data-action="reset-filters">Reset Filters ✕</button>`
          : `<button type="button" class="link-btn" style="color:var(--electric-blue);font-weight:700" data-nav="categories">See All ${categories.length} →</button>`
      }
    </div>
    <div class="cat-strip">
      <button type="button" class="cat-card ${state.filters.category === "ALL" ? "active" : ""}" data-action="filter-cat" data-cat="ALL">
        <div class="cat-orb" style="background:linear-gradient(135deg,#8B5CF6,#00D4FF)">🌟</div>
        <span class="cat-title">All (${state.products.length})</span>
      </button>
      ${categories
        .map((c) => {
          const meta = getCategoryMeta(c.id);
          return `
        <button type="button" class="cat-card ${state.filters.category === c.id ? "active" : ""}" data-action="filter-cat" data-cat="${escapeHtml(c.id)}">
          <span class="cat-badge">${escapeHtml(meta.badge)}</span>
          <div class="cat-orb" style="background:linear-gradient(135deg,${escapeHtml(meta.accent)},${escapeHtml(meta.secondary)})">${meta.emoji}</div>
          <span class="cat-title">${escapeHtml(meta.title)}</span>
        </button>`;
        })
        .join("")}
    </div>
  `;

  // Flash Sale + Countdown (Shown on unfiltered Home)
  const flashItems = state.products.filter((p) => p.flashSale || p.discountPercent >= 20).slice(0, 8);
  const flashSectionHtml =
    mode === "home" && !state.filters.search && flashItems.length
      ? `
      <div class="section-head">
        <h2>⚡ ${escapeHtml(t("flashSale"))}</h2>
        <span id="flashCountdownEl" class="countdown-pill">Ends in ${formatCountdown(state.flashSeconds)}</span>
      </div>
      <div class="h-scroll-row">${flashItems.map(renderProductCard).join("")}</div>
    `
      : "";

  // Fun Zone & MY AI Spotlight Cards
  const spotlightHtml =
    mode === "home" && !state.filters.search
      ? `
      <div class="spotlight-grid">
        <div class="spotlight-card" data-nav="funzone">
          <img src="/fun-zone.jpg" alt="MY Fun Zone" onerror="this.style.display='none'" />
          <div class="spotlight-overlay">
            <span class="hero-badge" style="margin:0;width:fit-content">🎡 SPIN • SCRATCH • QUIZ</span>
            <div>
              <h3>🎮 MY Fun Zone (${state.fun.points} Pts)</h3>
              <p class="small" style="color:#cbd5e1;margin-top:4px">Play mini-games & unlock instant checkout coupons like MYSHOP10, SPIN15 & FREEDEL!</p>
            </div>
          </div>
        </div>
        <div class="spotlight-card" data-nav="ai">
          <img src="/ai-avatar.jpg" alt="MY AI Assistant" onerror="this.style.display='none'" />
          <div class="spotlight-overlay">
            <span class="hero-badge" style="margin:0;width:fit-content">✨ SMART PRODUCT FINDER</span>
            <div>
              <h3>🤖 MY AI Shopping Helper</h3>
              <p class="small" style="color:#cbd5e1;margin-top:4px">Ask for budget phones, gaming setups, free delivery items, or gift ideas from live inventory.</p>
            </div>
          </div>
        </div>
      </div>
    `
      : "";

  // Recently Viewed Row
  const recentItems = state.recentlyViewedIds
    .map((id) => state.products.find((p) => p.id === id))
    .filter(Boolean)
    .slice(0, 6);
  const recentHtml =
    mode === "home" && recentItems.length && !state.filters.search
      ? `
      <div class="section-head"><h2>🕒 ${escapeHtml(t("recentlyViewed"))}</h2></div>
      <div class="h-scroll-row">${recentItems.map(renderProductCard).join("")}</div>
    `
      : "";

  // Brands Showcase
  const brandsHtml = state.brands.length
    ? `
    <div class="section-head"><h2>🏷️ ${escapeHtml(t("popularBrands"))}</h2></div>
    <div class="h-scroll-row">
      ${state.brands
        .map(
          (b) => `
        <button type="button" class="brand-card ${state.filters.brand === (b.name || b.id) ? "active" : ""}" data-action="filter-brand" data-brand="${escapeHtml(b.name || b.id)}" style="border-color:${escapeHtml(b.accentHex || "var(--border-glass)")}">
          <strong style="color:${escapeHtml(b.accentHex || "var(--electric-blue)")}">${escapeHtml(b.name || b.id)}</strong>
          <div class="small muted" style="margin-top:4px">${escapeHtml(b.tagline || "Official Partner")}</div>
        </button>`
        )
        .join("")}
    </div>`
    : "";

  const toolbar = `
    <div class="filter-toolbar" id="catalogSection">
      <div class="chips-row">
        ${[
          ["all", `All (${state.products.length})`],
          ["flashSale", "⚡ Flash Sale"],
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
        <button type="button" class="btn-outline" style="margin-top:12px" data-action="reset-filters">Reset Filters</button>
      </div>`
    : `<div class="product-grid">${filtered.map(renderProductCard).join("")}</div>`;

  // Verified Customer Reviews Strip
  const highlightedReviews = state.products
    .flatMap((p) => (Array.isArray(p.reviews) ? p.reviews.map((r) => ({ product: p.name, ...r })) : []))
    .slice(0, 6);
  const reviewsHtml =
    mode === "home" && highlightedReviews.length
      ? `
      <div class="section-head"><h2>⭐ ${escapeHtml(t("customerReviews"))}</h2></div>
      <div class="h-scroll-row">
        ${highlightedReviews
          .map(
            (rev) => `
          <div class="review-card">
            <div style="color:var(--amber);font-size:.86rem">${"★".repeat(Math.min(5, Number(rev.rating || 5)))} <span style="color:var(--emerald);font-weight:700">✓ Verified</span></div>
            <p class="small" style="margin:8px 0;line-height:1.45">"${escapeHtml(rev.comment)}"</p>
            <div class="small muted">${escapeHtml(rev.author)} • ${escapeHtml(rev.product)}</div>
          </div>`
          )
          .join("")}
      </div>`
      : "";

  return `${guestStrip}${popularRow}${heroHtml}${bannerRow}${categoryCardsHtml}${flashSectionHtml}${spotlightHtml}${recentHtml}${toolbar}${catalogBody}${brandsHtml}${reviewsHtml}`;
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
          : `<div class="panel-card"><p class="muted small">Active coupons will appear here.</p></div>`
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

// ======================== MY FUN ZONE ========================

function persistFunState() {
  saveJsonStorage(STORAGE_FUN, state.fun);
}

function renderFunZoneView() {
  const tabs = [
    ["spin", "🎡 Spin & Win"],
    ["scratch", "🎫 Scratch Card"],
    ["streak", "🔥 7-Day Streak"],
    ["quiz", "🧠 Trivia Quiz"],
    ["funny", "😂 Funny Zone"],
    ["treasure", "💎 Treasure Hunt"],
  ];

  let bodyHtml = "";
  const today = todayKey();
  const canSpin = state.fun.lastSpinDate !== today;
  const canScratch = state.fun.lastScratchDate !== today && !state.fun.scratchRevealed;
  const canStreak = state.fun.lastStreakDate !== today;

  if (state.funTab === "spin") {
    bodyHtml = `
      <div class="panel-card" style="text-align:center">
        <h3>Spin & Win Daily Wheel</h3>
        <p class="small muted" style="margin-top:4px">1 Free Spin daily • Win instant coupons (SPIN15, MYSHOP10, FREEDEL) & MY Points!</p>
        <div class="wheel-wrap">
          <div class="wheel-pointer">▼</div>
          <div class="spin-wheel" id="funWheelEl" style="transform:rotate(${state.spinAngle}deg)">
            <div class="wheel-hub">MY SHOP</div>
          </div>
        </div>
        ${state.fun.spinResult ? `<p style="color:var(--emerald);font-weight:800;margin-bottom:10px">🎉 ${escapeHtml(state.fun.spinResult)}</p>` : ""}
        <button type="button" class="btn-neon" id="spinWheelBtn" ${!canSpin || state.spinBusy ? "disabled" : ""}>
          ${state.spinBusy ? "Spinning…" : canSpin ? "🎡 Spin Free Wheel" : "Daily Spin Used (Return Tomorrow)"}
        </button>
      </div>
    `;
  } else if (state.funTab === "scratch") {
    bodyHtml = `
      <div class="panel-card">
        <h3>Scratch & Reveal Daily Reward</h3>
        <p class="small muted" style="margin:4px 0 12px">Tap the metallic card below to scratch and unlock code <strong>SCRATCH100</strong> (৳100 off ৳800+).</p>
        <div class="scratch-box ${canScratch ? "" : "revealed"}" id="scratchCardBox">
          ${
            canScratch
              ? `<h3>✨ TAP TO SCRATCH & REVEAL ✨</h3><p class="small" style="margin-top:6px;opacity:.85">Instant ৳100 Coupon + 60 MY Points inside</p>`
              : `<h3>🎁 Won: SCRATCH100 (৳100 OFF) + 60 MY Pts!</h3><button type="button" class="btn-neon sm" style="margin-top:10px" data-action="apply-coupon-quick" data-code="SCRATCH100">Apply SCRATCH100 in Cart</button>`
          }
        </div>
      </div>
    `;
  } else if (state.funTab === "streak") {
    bodyHtml = `
      <div class="panel-card">
        <h3>🔥 7-Day Shopping Streak</h3>
        <p class="small muted" style="margin:4px 0 12px">Check in daily to multiply your MY Loyalty Points!</p>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:14px">
          ${[1, 2, 3, 4, 5, 6, 7]
            .map(
              (d) => `
            <div style="text-align:center;padding:10px 4px;border-radius:12px;background:${d <= state.fun.streak ? "rgba(16,185,129,.25)" : "rgba(255,255,255,.06)"};border:1px solid ${d <= state.fun.streak ? "var(--emerald)" : "var(--border-glass)"}">
              <strong>D${d}</strong>
              <div class="small muted">+${d * 25}</div>
            </div>`
            )
            .join("")}
        </div>
        <button type="button" class="btn-neon" id="claimStreakBtn" ${!canStreak ? "disabled" : ""}>
          ${canStreak ? "🔥 Claim Today's Streak Bonus" : "✓ Today's Streak Claimed"}
        </button>
      </div>
    `;
  } else if (state.funTab === "quiz") {
    const q = FUN_QUIZ[state.fun.quizIdx % FUN_QUIZ.length];
    bodyHtml = `
      <div class="panel-card">
        <h3>🧠 MY Shop Trivia Quiz (${(state.fun.quizIdx % FUN_QUIZ.length) + 1}/${FUN_QUIZ.length})</h3>
        <p style="margin:10px 0;font-weight:700">${escapeHtml(q.q)}</p>
        <div class="form-stack">
          ${q.opts
            .map((opt, idx) => {
              const chosen = state.fun.quizAnswered === idx;
              const correct = idx === q.ans;
              const style =
                state.fun.quizAnswered === null
                  ? ""
                  : correct
                  ? "border-color:var(--emerald);background:rgba(16,185,129,.22)"
                  : chosen
                  ? "border-color:var(--danger);background:rgba(239,68,68,.2)"
                  : "";
              return `<button type="button" class="btn-outline" style="text-align:left;${style}" data-quiz-opt="${idx}" ${state.fun.quizAnswered !== null ? "disabled" : ""}>${escapeHtml(opt)}</button>`;
            })
            .join("")}
        </div>
        ${
          state.fun.quizAnswered !== null
            ? `<p class="small" style="color:var(--electric-blue);margin-top:10px">${escapeHtml(q.exp)}</p>
               <button type="button" class="btn-neon sm" style="margin-top:10px" id="nextQuizBtn">Next Question →</button>`
            : ""
        }
      </div>
    `;
  } else if (state.funTab === "funny") {
    bodyHtml = FUNNY_CARDS.map(
      (c) => `
      <div class="panel-card">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
          <h3>${escapeHtml(c.title)}</h3>
          <span class="hero-badge" style="margin:0">${escapeHtml(c.fakePrice)}</span>
        </div>
        <p style="margin:8px 0">${escapeHtml(c.joke)}</p>
        <p class="small" style="color:var(--electric-blue)">${escapeHtml(c.punch)}</p>
      </div>`
    ).join("");
  } else {
    const claimedVault = state.fun.foundTreasures.includes("vault_web");
    bodyHtml = `
      <div class="panel-card">
        <h3>💎 Hidden Treasure Hunt (${state.fun.foundTreasures.length}/2 Found)</h3>
        <p class="small muted" style="margin:6px 0 12px">Open the Cyber Vault below to claim real coupon code <strong>HUNT250</strong> (৳250 off ৳2,000+) & +100 MY Points!</p>
        <button type="button" class="btn-neon" id="claimVaultBtn" ${claimedVault ? "disabled" : ""}>
          ${claimedVault ? "✓ Vault Claimed (Code: HUNT250)" : "🗝️ Unlock Cyber Vault Chest"}
        </button>
        ${
          claimedVault
            ? `<button type="button" class="btn-outline sm" style="margin-left:8px" data-action="apply-coupon-quick" data-code="HUNT250">Use HUNT250</button>`
            : ""
        }
      </div>
    `;
  }

  return `
    <div class="spotlight-card" style="height:150px;margin-bottom:14px">
      <img src="/fun-zone.jpg" alt="MY Fun Zone" onerror="this.style.display='none'" />
      <div class="spotlight-overlay">
        <span class="hero-badge" style="margin:0;width:fit-content">🏆 ${state.fun.points} MY POINTS</span>
        <div>
          <h2>🎮 MY Fun Zone Arcade</h2>
          <p class="small" style="color:#e2e8f0">Play, laugh, spin & earn real discount coupons for your next order!</p>
        </div>
      </div>
    </div>
    <div class="chips-row" style="margin-bottom:14px">
      ${tabs.map(([k, lbl]) => `<button type="button" class="chip ${state.funTab === k ? "active" : ""}" data-fun-tab="${k}">${lbl}</button>`).join("")}
    </div>
    ${bodyHtml}
  `;
}

// ======================== MY AI SHOPPING ASSISTANT ========================

function computeAiResponse(promptText) {
  const q = promptText.toLowerCase();
  let matches = [...state.products];

  const budgetMatch = q.match(/under\s*৳?\s*([\d,]+)/i) || q.match(/below\s*৳?\s*([\d,]+)/i);
  const maxPrice = budgetMatch ? Number(budgetMatch[1].replace(/,/g, "")) : null;
  if (maxPrice) matches = matches.filter((p) => p.price <= maxPrice);

  if (q.includes("free")) matches = matches.filter((p) => p.freeDelivery);

  const keywords = q
    .replace(/under\s*৳?\s*[\d,]+/gi, "")
    .split(/[^a-z0-9]+/i)
    .filter((w) => w.length >= 3 && !["find", "show", "good", "best", "need", "want", "with", "under", "items", "the", "for"].includes(w));

  if (keywords.length > 0) {
    const scored = matches
      .map((p) => {
        const hay = `${p.name} ${p.brand} ${p.categoryId} ${p.description}`.toLowerCase();
        const score = keywords.reduce((s, kw) => s + (hay.includes(kw) ? 1 : 0), 0);
        return { p, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.p.rating - a.p.rating)
      .map((x) => x.p);
    if (scored.length > 0) matches = scored;
  }

  if (q.includes("coupon") || q.includes("discount") || q.includes("promo")) {
    return {
      text: "Here are our live promo codes you can apply right in Cart: MYSHOP10 (10% off ৳1,000+), FLASH200 (৳200 cashback ৳2,500+), FREEDEL (Free Express Delivery).",
      productIds: matches.slice(0, 3).map((p) => p.id),
    };
  }

  const top = matches.slice(0, 4);
  if (top.length === 0) {
    return {
      text: "I couldn't find an exact catalog match for that filter, but you can browse all 16 categories on the Home & Explore tabs or ask me for another budget!",
      productIds: [],
    };
  }
  return {
    text: `Here are the top ${top.length} verified in-stock MY Shop picks matching "${promptText}":`,
    productIds: top.map((p) => p.id),
  };
}

function renderAiAssistantView() {
  if (state.aiMessages.length === 0) {
    state.aiMessages.push({
      role: "bot",
      text: state.aiSettings?.welcomeMessage || "Hi! Ask me for phone deals under ৳20,000, ANC headphones, gaming gear, or free delivery offers.",
      productIds: state.products.filter((p) => p.flashSale).slice(0, 2).map((p) => p.id),
    });
  }
  const prompts = state.aiSettings?.suggestedPrompts?.length
    ? state.aiSettings.suggestedPrompts
    : ["Phone under ৳20,000", "Best ANC headphones", "Free delivery items", "Active coupons"];

  return `
    <div class="spotlight-card" style="height:145px;margin-bottom:14px">
      <img src="/ai-avatar.jpg" alt="MY AI Assistant" onerror="this.style.display='none'" />
      <div class="spotlight-overlay">
        <span class="hero-badge" style="margin:0;width:fit-content">🤖 LIVE CATALOG FINDER</span>
        <div>
          <h2>✨ ${escapeHtml(state.aiSettings?.assistantName || "MY AI Shopping Assistant")}</h2>
          <p class="small" style="color:#e2e8f0">Instant price-filtered recommendations & coupon advice from verified MY Shop stock.</p>
        </div>
      </div>
    </div>

    <div class="chips-row" style="margin-bottom:12px">
      ${prompts.map((p) => `<button type="button" class="chip" data-ai-prompt="${escapeHtml(p)}">💬 ${escapeHtml(p)}</button>`).join("")}
    </div>

    <div class="ai-chat-card">
      <div class="ai-messages" id="aiMessagesBox">
        ${state.aiMessages
          .map((m) => {
            const cards = (m.productIds || [])
              .map((pid) => state.products.find((x) => x.id === pid))
              .filter(Boolean);
            return `
            <div class="ai-msg ${m.role}">
              <div>${escapeHtml(m.text)}</div>
              ${
                cards.length
                  ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
                      ${cards
                        .map(
                          (p) => `
                        <div style="background:rgba(0,0,0,.35);padding:8px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.16);min-width:170px">
                          <strong class="small">${escapeHtml(p.name)}</strong>
                          <div class="small" style="color:var(--emerald);font-weight:700">${money(p.price)}</div>
                          <div style="display:flex;gap:6px;margin-top:6px">
                            <button type="button" class="btn-neon sm" data-action="add-cart" data-id="${escapeHtml(p.id)}">+ Cart</button>
                            <button type="button" class="btn-outline sm" data-action="open-product" data-id="${escapeHtml(p.id)}">View</button>
                          </div>
                        </div>`
                        )
                        .join("")}
                    </div>`
                  : ""
              }
            </div>`;
          })
          .join("")}
      </div>
      <form id="aiChatForm" style="display:flex;gap:8px">
        <input type="text" id="aiPromptInput" class="glass-input" style="flex:1" placeholder="Ask MY AI (e.g. Phone under ৳20,000, gaming mouse...)" required />
        <button type="submit" class="btn-neon">Ask ✨</button>
      </form>
    </div>
  `;
}

// ======================== CART, WISHLIST, ORDERS, PROFILE ========================

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
              : `<div style="width:64px;height:64px;border-radius:12px;background:rgba(139,92,246,.24);display:flex;align-items:center;justify-content:center;font-size:1.5rem">${getCategoryMeta(prod?.categoryId).emoji}</div>`;

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
  else if (state.view === "funzone") main.innerHTML = renderFunZoneView();
  else if (state.view === "ai") main.innerHTML = renderAiAssistantView();
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

  // Fun Zone bindings
  document.querySelectorAll("[data-fun-tab]").forEach((btn) => {
    btn.onclick = () => {
      state.funTab = btn.getAttribute("data-fun-tab");
      render();
    };
  });
  const spinBtn = document.getElementById("spinWheelBtn");
  if (spinBtn) {
    spinBtn.onclick = () => {
      if (state.spinBusy || state.fun.lastSpinDate === todayKey()) return;
      state.spinBusy = true;
      const prizes = [
        { label: "15% OFF Coupon (Code: SPIN15) + 50 Pts", pts: 50, code: "SPIN15" },
        { label: "100 Bonus MY Points", pts: 100, code: "" },
        { label: "Free Express Delivery (Code: FREEDEL)", pts: 30, code: "FREEDEL" },
        { label: "10% Welcome Code (Code: MYSHOP10)", pts: 40, code: "MYSHOP10" },
      ];
      const pick = prizes[Math.floor(Math.random() * prizes.length)];
      state.spinAngle += 1440 + Math.floor(Math.random() * 360);
      const wheelEl = document.getElementById("funWheelEl");
      if (wheelEl) wheelEl.style.transform = `rotate(${state.spinAngle}deg)`;
      spinBtn.disabled = true;
      spinBtn.textContent = "Spinning…";
      setTimeout(() => {
        state.spinBusy = false;
        state.fun.lastSpinDate = todayKey();
        state.fun.points += pick.pts;
        state.fun.spinResult = pick.label;
        if (pick.code) state.appliedCoupon = pick.code;
        persistFunState();
        toast(`Won: ${pick.label}!`);
        render();
      }, 2450);
    };
  }
  const scratchBox = document.getElementById("scratchCardBox");
  if (scratchBox) {
    scratchBox.onclick = () => {
      if (state.fun.lastScratchDate === todayKey() || state.fun.scratchRevealed) return;
      state.fun.lastScratchDate = todayKey();
      state.fun.scratchRevealed = true;
      state.fun.points += 60;
      state.appliedCoupon = "SCRATCH100";
      persistFunState();
      toast("Unlocked SCRATCH100 + 60 MY Pts!");
      render();
    };
  }
  const streakBtn = document.getElementById("claimStreakBtn");
  if (streakBtn) {
    streakBtn.onclick = () => {
      if (state.fun.lastStreakDate === todayKey()) return;
      state.fun.lastStreakDate = todayKey();
      state.fun.streak = (state.fun.streak % 7) + 1;
      const bonus = state.fun.streak * 25;
      state.fun.points += bonus;
      persistFunState();
      toast(`Day ${state.fun.streak} Streak Claimed (+${bonus} MY Pts)!`);
      render();
    };
  }
  document.querySelectorAll("[data-quiz-opt]").forEach((btn) => {
    btn.onclick = () => {
      const idx = Number(btn.getAttribute("data-quiz-opt"));
      const q = FUN_QUIZ[state.fun.quizIdx % FUN_QUIZ.length];
      state.fun.quizAnswered = idx;
      if (idx === q.ans) {
        state.fun.points += 35;
        toast("Correct! +35 MY Pts!");
      }
      persistFunState();
      render();
    };
  });
  const nextQ = document.getElementById("nextQuizBtn");
  if (nextQ) {
    nextQ.onclick = () => {
      state.fun.quizIdx = (state.fun.quizIdx + 1) % FUN_QUIZ.length;
      state.fun.quizAnswered = null;
      persistFunState();
      render();
    };
  }
  const vaultBtn = document.getElementById("claimVaultBtn");
  if (vaultBtn) {
    vaultBtn.onclick = () => {
      if (!state.fun.foundTreasures.includes("vault_web")) {
        state.fun.foundTreasures.push("vault_web");
        state.fun.points += 100;
        state.appliedCoupon = "HUNT250";
        persistFunState();
        toast("Treasure Unlocked! Code HUNT250 + 100 MY Pts!");
        render();
      }
    };
  }

  // AI Assistant bindings
  document.querySelectorAll("[data-ai-prompt]").forEach((btn) => {
    btn.onclick = () => {
      const prompt = btn.getAttribute("data-ai-prompt");
      if (!prompt) return;
      state.aiMessages.push({ role: "user", text: prompt });
      const ans = computeAiResponse(prompt);
      state.aiMessages.push({ role: "bot", text: ans.text, productIds: ans.productIds });
      render();
    };
  });
  const aiForm = document.getElementById("aiChatForm");
  if (aiForm) {
    aiForm.onsubmit = (e) => {
      e.preventDefault();
      const input = document.getElementById("aiPromptInput");
      const prompt = input?.value.trim();
      if (!prompt) return;
      state.aiMessages.push({ role: "user", text: prompt });
      const ans = computeAiResponse(prompt);
      state.aiMessages.push({ role: "bot", text: ans.text, productIds: ans.productIds });
      render();
    };
  }

  // Profile & Address forms
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

// ======================== MODALS (Product Detail, Compare, Auth, Checkout) ========================

function closeModal() {
  document.getElementById("modalOverlay").classList.add("hidden");
  document.getElementById("modalOverlay").innerHTML = "";
}

function openProductModal(productId) {
  const p = state.products.find((x) => x.id === productId);
  if (!p) return;

  // Record Recently Viewed
  state.recentlyViewedIds = [p.id, ...state.recentlyViewedIds.filter((id) => id !== p.id)].slice(0, 10);
  saveJsonStorage(STORAGE_RECENT, state.recentlyViewedIds);

  const images = [p.mainImageUrl, ...(p.imageUrls || [])].filter((u, idx, arr) => isSafeHttpUrl(u) && arr.indexOf(u) === idx);
  const title = state.lang === "BN" && p.nameBn ? p.nameBn : p.name;
  const outOfStock = !p.available || Number(p.stock || 0) <= 0;
  const specsHtml =
    Array.isArray(p.specs) && p.specs.length
      ? `<div class="panel-card" style="padding:10px;margin:6px 0">
          ${p.specs.map((s) => `<div class="summary-line" style="margin:4px 0;font-size:.82rem"><span class="muted">${escapeHtml(s.label)}</span><strong>${escapeHtml(s.value)}</strong></div>`).join("")}
         </div>`
      : "";

  const modal = document.getElementById("modalOverlay");
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-head">
        <strong>${escapeHtml(p.brand || "MY Shop")} • ${escapeHtml(getCategoryMeta(p.categoryId).title)}</strong>
        <button type="button" class="close-circle" data-action="close-modal" aria-label="Close">✕</button>
      </div>
      <div class="detail-grid">
        <div>
          ${
            images.length
              ? `<img id="detailMainImg" src="${escapeHtml(images[0])}" alt="${escapeHtml(title)}" class="detail-main-img" />`
              : `<div class="detail-main-img" style="overflow:hidden">${renderProductVisual(p, "detail-main-img")}</div>`
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
          ${specsHtml}
        </div>
        <div class="form-stack">
          <h2>${escapeHtml(title)}</h2>
          <div class="rating-line">★ ${Number(p.rating || 4.8).toFixed(1)} (${p.reviewCount || 0} reviews) • ${p.freeDelivery ? "🚚 Free Delivery" : "Fast Delivery"}</div>
          <div class="price-row">
            <span class="price-now" style="font-size:1.45rem">${money(p.price)}</span>
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

function openCompareModal() {
  const items = state.compareIds.map((id) => state.products.find((p) => p.id === id)).filter(Boolean);
  if (items.length === 0) return;
  const modal = document.getElementById("modalOverlay");
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-head">
        <strong>⚖️ Side-by-Side Comparison (${items.length})</strong>
        <button type="button" class="close-circle" data-action="close-modal">✕</button>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:.86rem">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px;border-bottom:1px solid var(--border-glass)">Attribute</th>
              ${items.map((p) => `<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border-glass)">${escapeHtml(p.name)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            <tr><td style="padding:8px" class="muted">Brand</td>${items.map((p) => `<td style="padding:8px">${escapeHtml(p.brand)}</td>`).join("")}</tr>
            <tr><td style="padding:8px" class="muted">Price</td>${items.map((p) => `<td style="padding:8px;color:var(--emerald);font-weight:700">${money(p.price)}</td>`).join("")}</tr>
            <tr><td style="padding:8px" class="muted">Discount</td>${items.map((p) => `<td style="padding:8px">${p.discountPercent}%</td>`).join("")}</tr>
            <tr><td style="padding:8px" class="muted">Rating</td>${items.map((p) => `<td style="padding:8px">★ ${p.rating} (${p.reviewCount})</td>`).join("")}</tr>
            <tr><td style="padding:8px" class="muted">Delivery</td>${items.map((p) => `<td style="padding:8px">${p.freeDelivery ? "Free Express" : "Standard ৳80"}</td>`).join("")}</tr>
            <tr><td style="padding:8px" class="muted">Stock</td>${items.map((p) => `<td style="padding:8px">${p.stock} units</td>`).join("")}</tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
  modal.classList.remove("hidden");
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
        saveJsonStorage(STORAGE_GUEST_CART, []);
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
      saveJsonStorage(STORAGE_GUEST_CART, []);
      closeModal();
      toast(`Order ${order.orderNumber} placed successfully!`);
      await refreshCustomerOrders();
      await loadBootstrap(true);
      state.view = "orders";
      render();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = t("placeOrder");
      toast(err.message, true);
    }
  };
}

// ======================== CART / WISHLIST / COMPARE ========================

async function syncCartToServer() {
  if (!state.customer) {
    saveJsonStorage(STORAGE_GUEST_CART, state.cart);
    return;
  }
  try {
    const res = await api("/api/customer/cart", {
      method: "PUT",
      body: JSON.stringify({ items: state.cart }),
    });
    if (Array.isArray(res.items)) state.cart = res.items;
  } catch {
    saveJsonStorage(STORAGE_GUEST_CART, state.cart);
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

function openSafeSocialLink(platform) {
  const map = { facebook: "fb_click", youtube: "yt_click", tiktok: "tt_click", telegram: "tg_click" };
  if (map[platform.id]) trackAnalytics(map[platform.id]);
  if (!isSafeHttpUrl(platform.url)) {
    toast(
      state.lang === "BN"
        ? `${platform.name} লিংক অ্যাডমিন প্যানেল (/admin -> Social Support) থেকে সেট করুন।`
        : `${platform.name} URL is not set yet. Paste it in /admin -> Social Support.`,
      true
    );
    return;
  }
  window.open(platform.url.trim(), "_blank", "noopener,noreferrer");
}

function renderFloatingSocialSupport() {
  const root = document.getElementById("floatingSocialRoot");
  if (!root) return;
  const cfg = state.socialSupport || DEFAULT_SOCIAL_SUPPORT;
  if (cfg.enabled === false) {
    root.innerHTML = "";
    return;
  }
  const platforms = (cfg.platforms || DEFAULT_SOCIAL_SUPPORT.platforms)
    .filter((p) => p.enabled !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
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
              ${p.subtitle ? `<div style="font-size:.72rem;opacity:.78">${escapeHtml(p.subtitle)}</div>` : ""}
            </div>
            <span>↗</span>
          </button>`
          )
          .join("")}
      </div>`
        : ""
    }
    <div class="fab-halo-wrap">
      <div class="fab-halo-ring"></div>
      <button
        type="button"
        class="social-fab-btn ${state.socialOpen ? "open" : ""}"
        id="socialFabTrigger"
        style="background:linear-gradient(135deg, ${escapeHtml(cfg.primaryHex || "#8B5CF6")}, #00D4FF)"
        aria-label="${state.socialOpen ? "Close social support" : "Open social support"}"
      >
        <span>+</span>
      </button>
    </div>
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

  const dismissals = loadJsonStorage(STORAGE_POPUP_DISMISS, {});
  const lastAt = Number(dismissals[popup.id] || 0);
  if (popup.frequency === "EVERY_VISIT" || popup.frequency === "ONCE_PER_SESSION") {
    return !state.popupShownThisSession;
  }
  if (popup.frequency === "ONCE_PER_USER") return lastAt === 0;
  if (popup.frequency === "ONCE_PER_WEEK") return now - lastAt > 7 * 86400000;
  return now - lastAt > 86400000; // ONCE_PER_DAY
}

function showWelcomePopupModal(popup) {
  const root = document.getElementById("welcomePopupRoot");
  if (!root || !popup) return;
  state.popupShownThisSession = true;
  trackAnalytics("popup_impression");

  const cfg = state.socialSupport || DEFAULT_SOCIAL_SUPPORT;
  const platforms = (cfg.platforms || DEFAULT_SOCIAL_SUPPORT.platforms).filter((p) => p.enabled !== false);
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
      <p class="small" style="text-align:center;opacity:.86">${escapeHtml(popup.description || "")}</p>
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
    const d = loadJsonStorage(STORAGE_POPUP_DISMISS, {});
    d[popup.id] = Date.now();
    saveJsonStorage(STORAGE_POPUP_DISMISS, d);
  };

  document.getElementById("close3dPopupBtn").onclick = dismiss;
  document.getElementById("popupCtaBtn").onclick = () => {
    if (isSafeHttpUrl(popup.buttonUrl)) {
      window.open(popup.buttonUrl, "_blank", "noopener,noreferrer");
    } else if (popup.buttonUrl === "/explore") {
      state.view = "categories";
      render();
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
}

function evaluateAndShowWelcomePopup() {
  const popup = (state.popups || []).find((p) => shouldShowPopup(p));
  localStorage.setItem(STORAGE_VISITED, "1");
  if (!popup) return;
  const delayMs = Math.max(0, Number(popup.delaySeconds || 1)) * 1000;
  setTimeout(() => {
    if (!state.popupShownThisSession) showWelcomePopupModal(popup);
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

async function loadBootstrap(skipPopup = false) {
  try {
    const [boot, me] = await Promise.all([
      api("/api/public/storefront-bootstrap"),
      api("/api/customer/auth/me").catch(() => ({ authenticated: false })),
    ]);

    state.firebaseConnected = boot.firebaseConnected !== false;
    state.siteConfig = boot.siteConfig || {};
    state.announcement = boot.announcement || {};
    state.socialSupport = boot.socialSupport || DEFAULT_SOCIAL_SUPPORT;
    state.popups = Array.isArray(boot.popups) ? boot.popups : [];
    state.products = Array.isArray(boot.products) ? boot.products : [];
    state.categories = Array.isArray(boot.categories) ? boot.categories : [];
    state.brands = Array.isArray(boot.brands) ? boot.brands : [];
    state.coupons = Array.isArray(boot.coupons) ? boot.coupons : [];
    state.deliveryZones = Array.isArray(boot.deliveryZones) ? boot.deliveryZones : [];
    if (boot.funZone) state.funZone = boot.funZone;
    if (boot.aiSettings) state.aiSettings = boot.aiSettings;

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
    if (!skipPopup) evaluateAndShowWelcomePopup();
  }
}

function updateAutocomplete(query) {
  const box = document.getElementById("searchAutocomplete");
  if (!box) return;
  const q = String(query || "").trim().toLowerCase();
  if (!q) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }
  const hits = state.products
    .filter((p) => `${p.name} ${p.brand} ${p.categoryId}`.toLowerCase().includes(q))
    .slice(0, 5);
  if (hits.length === 0) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }
  box.innerHTML = hits
    .map(
      (p) => `
    <div class="auto-row" data-auto-prod="${escapeHtml(p.id)}">
      <span>${getCategoryMeta(p.categoryId).emoji} ${escapeHtml(p.name)}</span>
      <strong style="color:var(--emerald)">${money(p.price)}</strong>
    </div>`
    )
    .join("");
  box.classList.remove("hidden");
  box.querySelectorAll("[data-auto-prod]").forEach((row) => {
    row.onclick = () => {
      box.classList.add("hidden");
      openProductModal(row.getAttribute("data-auto-prod"));
    };
  });
}

document.addEventListener("click", async (e) => {
  const autoBox = document.getElementById("searchAutocomplete");
  if (autoBox && !e.target.closest(".search-wrap")) {
    autoBox.classList.add("hidden");
  }

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
  else if (action === "toggle-compare") {
    if (state.compareIds.includes(id)) {
      state.compareIds = state.compareIds.filter((x) => x !== id);
    } else if (state.compareIds.length >= 4) {
      toast("Compare up to 4 products at a time.", true);
    } else {
      state.compareIds.push(id);
    }
    render();
  } else if (action === "open-compare") openCompareModal();
  else if (action === "clear-compare") {
    state.compareIds = [];
    render();
  } else if (action === "open-auth") openAuthModal("login");
  else if (action === "quick-search") {
    const q = actionEl.getAttribute("data-q") || "";
    state.filters.search = q;
    const inp = document.getElementById("globalSearchInput");
    if (inp) inp.value = q;
    render();
  } else if (action === "filter-cat") {
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
    const inp = document.getElementById("globalSearchInput");
    if (inp) inp.value = "";
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
    state.cart = loadJsonStorage(STORAGE_GUEST_CART, []);
    toast("Signed out.");
    render();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("globalSearchInput");
  searchInput.addEventListener("input", () => {
    state.filters.search = searchInput.value;
    updateAutocomplete(searchInput.value);
    if (state.view !== "home" && state.view !== "categories") state.view = "home";
    render();
  });
  document.getElementById("searchSubmitBtn").onclick = () => {
    state.filters.search = searchInput.value;
    state.view = "home";
    document.getElementById("searchAutocomplete")?.classList.add("hidden");
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
  document.getElementById("dismissSyncNotice")?.addEventListener("click", () => {
    state.syncNoticeDismissed = true;
    updateHeaderChromes();
  });
  document.getElementById("reopenWelcomeBtn")?.addEventListener("click", () => {
    const popup = state.popups[0] || {
      id: "welcome_3d_default",
      title: "Welcome to MY Shop!",
      subtitle: "Shop Smart • Live Happy!",
      description: "Explore deals, Fun Zone rewards & our official Facebook, YouTube, TikTok & Telegram channels!",
      buttonText: "Explore MY Shop Deals",
      buttonUrl: "/explore",
      includeSocialButtons: true,
      active: true,
    };
    showWelcomePopupModal(popup);
  });

  // Live 1-second Flash Sale countdown tick
  setInterval(() => {
    state.flashSeconds = state.flashSeconds > 0 ? state.flashSeconds - 1 : 5 * 3600;
    const el = document.getElementById("flashCountdownEl");
    if (el) el.textContent = `Ends in ${formatCountdown(state.flashSeconds)}`;
  }, 1000);

  loadBootstrap();
});
