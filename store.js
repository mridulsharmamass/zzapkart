// =====================================================================
// Zzapkart data layer (PROTOTYPE)
// Saara data browser ke localStorage mein rehta hai — koi server nahi.
// Asli launch ke liye ise ek backend (database + API) se badalna hoga.
// =====================================================================

const DB = {
  sellers: "zk_sellers",
  products: "zk_seller_products",
  orders: "zk_orders",
  campaigns: "zk_ad_campaigns_v2", // "ad_campaigns table" (ads.js)
  adClicks: "zk_ad_clicks",
  adSlots: "zk_ad_slots",
  stats: "zk_product_stats",
  session: "zk_seller_session",
  sellerNotifs: "zk_seller_notifications",
  buyerNotifs: "zk_buyer_notifications",
  approvals: "zk_category_approvals",
  storeStats: "zk_store_stats",
};

function dbGet(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v === null || v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
}

function dbSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    alert("Browser storage bhar gaya hai. Kuch images/products delete karke dobara try karein.");
    return false;
  }
}

function uid(prefix) {
  return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function safeImg(src) {
  return typeof src === "string" && src.startsWith("data:image/") ? src : "";
}

const DAY = 24 * 60 * 60 * 1000;

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(ts) {
  return new Date(ts).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ---------------------------------------------------------------------
// Subscription plans
// ---------------------------------------------------------------------
const PLANS = {
  free:     { id: "free",     name: "Free",     price: 0,    productLimit: 3,        payoutDays: 14, adCredits: 0,    homepage: false, detailedReports: false, brandStore: false },
  basic:    { id: "basic",    name: "Basic",    price: 799,  productLimit: 10,       payoutDays: 7,  adCredits: 0,    homepage: false, detailedReports: false, brandStore: false },
  advanced: { id: "advanced", name: "Advanced", price: 3499, productLimit: 50,       payoutDays: 3,  adCredits: 500,  homepage: false, detailedReports: true,  brandStore: false },
  premium:  { id: "premium",  name: "Premium",  price: 7999, productLimit: Infinity, payoutDays: 1,  adCredits: 2000, homepage: true,  detailedReports: true,  brandStore: true  },
};
const PLAN_ORDER = ["basic", "advanced", "premium"];
const SUBSCRIPTION_DAYS = 30;

function activePlan(seller) {
  const sub = seller && seller.subscription;
  if (sub && sub.expiresAt > Date.now() && PLANS[sub.plan]) return PLANS[sub.plan];
  return PLANS.free;
}

// ---------------------------------------------------------------------
// Sellers + session
// ---------------------------------------------------------------------
function getSellers() { return dbGet(DB.sellers, []); }
function saveSellers(list) { return dbSet(DB.sellers, list); }
function getSeller(id) { return getSellers().find((s) => s.id === id) || null; }

function updateSeller(id, changes) {
  const list = getSellers();
  const i = list.findIndex((s) => s.id === id);
  if (i < 0) return null;
  list[i] = { ...list[i], ...changes };
  saveSellers(list);
  return list[i];
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(salt + ":" + password);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getSession() { return dbGet(DB.session, null); }
function setSession(sellerId) { dbSet(DB.session, { sellerId, at: Date.now() }); }
function clearSession() { localStorage.removeItem(DB.session); }
function currentSeller() {
  const s = getSession();
  return s ? getSeller(s.sellerId) : null;
}

// ---------------------------------------------------------------------
// Notifications (seller + buyer) — "email" ki jagah in-app messages
// ---------------------------------------------------------------------
function notifySeller(sellerId, message) {
  const list = dbGet(DB.sellerNotifs, []);
  list.unshift({ id: uid("N"), sellerId, message, at: Date.now(), read: false });
  dbSet(DB.sellerNotifs, list.slice(0, 300));
}
function sellerNotifications(sellerId) {
  return dbGet(DB.sellerNotifs, []).filter((n) => n.sellerId === sellerId);
}
function markSellerNotifsRead(sellerId) {
  dbSet(DB.sellerNotifs, dbGet(DB.sellerNotifs, []).map((n) => (n.sellerId === sellerId ? { ...n, read: true } : n)));
}
function notifyBuyer(orderId, message) {
  const list = dbGet(DB.buyerNotifs, []);
  list.unshift({ id: uid("N"), orderId, message, at: Date.now(), read: false });
  dbSet(DB.buyerNotifs, list.slice(0, 200));
}

// ---------------------------------------------------------------------
// Seller listings (catalog.js ke schema ke hisaab se)
// Status flow: draft → qc_pending → qc_passed / qc_failed ; archived ; blocked
// ---------------------------------------------------------------------
const LISTING_STATUS = {
  live: { label: "Live", cls: "s-live" },
  out_of_stock: { label: "Out of stock", cls: "s-out" },
  inactive: { label: "Inactive", cls: "s-paused" },
  qc_pending: { label: "QC in progress", cls: "s-placed" },
  qc_failed: { label: "QC error", cls: "s-rejected" },
  draft: { label: "Draft", cls: "s-completed" },
  archived: { label: "Archived", cls: "s-completed" },
  blocked: { label: "Blocked", cls: "s-rejected" },
};

function normalizeListing(p) {
  if (!p) return p;
  if (!p.status) {
    // Purane version ke products → legacy listing (live)
    p = {
      ...p, legacy: true, status: "qc_passed", listingStatus: "active", vertical: p.vertical || null,
      variants: [{ id: "v1", size: "", sku: `LEGACY-${p.id}`, stock: Number(p.stock) || 0 }],
      attrs: {}, features: [], imageCount: p.image ? 1 : 0,
    };
  }
  p.variants = p.variants || [];
  p.stock = p.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
  return p;
}

function getListings() { return dbGet(DB.products, []).map(normalizeListing); }
function getListing(id) { return getListings().find((p) => p.id === id) || null; }
function listingsOfSeller(sellerId) { return getListings().filter((p) => p.sellerId === sellerId); }

function saveListing(L) {
  const list = getListings();
  L = normalizeListing({ ...L, updatedAt: Date.now() });
  const i = list.findIndex((p) => p.id === L.id);
  if (i >= 0) list[i] = L; else list.push(L);
  return dbSet(DB.products, list) ? L : null;
}

function deleteListing(sellerId, id) {
  dbSet(DB.products, getListings().filter((p) => !(p.id === id && p.sellerId === sellerId)));
  if (typeof MediaDB !== "undefined") MediaDB.del(id);
  if (typeof adsRemoveProduct === "function") adsRemoveProduct(id);
}

function listingDisplayStatus(L) {
  if (L.status === "qc_passed") {
    if (L.listingStatus !== "active") return "inactive";
    return L.stock > 0 ? "live" : "out_of_stock";
  }
  return L.status;
}
const isListingLive = (L) => listingDisplayStatus(L) === "live";

// Purane naam (ads / analytics code inhe use karta hai)
const allSellerProducts = getListings;
function productsOfSeller(sellerId) { return listingsOfSeller(sellerId).filter((p) => p.status !== "archived"); }
const saveSellerProduct = saveListing;
const deleteSellerProduct = deleteListing;

// ---------------------------------------------------------------------
// Category approvals (restricted categories — Section 14)
// ---------------------------------------------------------------------
function getApprovals() { return dbGet(DB.approvals, []); }
function saveApprovals(list) { return dbSet(DB.approvals, list); }
function approvalFor(sellerId, group) {
  return getApprovals().filter((a) => a.sellerId === sellerId && a.group === group).sort((a, b) => b.at - a.at)[0] || null;
}
function isCategoryApproved(sellerId, group) {
  if (!group) return true;
  const a = approvalFor(sellerId, group);
  return !!(a && a.status === "approved");
}

// ---------------------------------------------------------------------
// Storefront: sirf QC-pass + active listings, KYC-approved sellers ki
// ---------------------------------------------------------------------
function storefrontSellerProducts() {
  const sellers = new Map(getSellers().filter((s) => s.kyc && s.kyc.status === "approved").map((s) => [s.id, s]));
  return getListings()
    .filter((p) => sellers.has(p.sellerId) && p.status === "qc_passed" && p.listingStatus === "active")
    .filter((p) => {
      const v = typeof getVertical === "function" ? getVertical(p.vertical) : null;
      const tpl = v ? TEMPLATES[v.template] : null;
      return !tpl || !tpl.restricted || isCategoryApproved(p.sellerId, tpl.restricted);
    })
    .map((p) => {
      const s = sellers.get(p.sellerId);
      const v = typeof getVertical === "function" ? getVertical(p.vertical) : null;
      return {
        id: p.id,
        name: p.name,
        brand: p.brand || "",
        category: v ? v.superCat : p.category,
        vertical: p.vertical,
        verticalName: v ? v.name : "",
        catName: v ? v.cat : "",
        template: v ? v.template : null,
        price: p.price,
        mrp: p.mrp && p.mrp > p.price ? p.mrp : p.price,
        rating: 0,
        emoji: "📦",
        color: "#f3eefc",
        image: p.image,
        imageCount: p.imageCount || 0,
        description: p.description,
        features: p.features || [],
        keywords: p.keywords || "",
        attrs: p.attrs || {},
        sizeChart: p.sizeChart || {},
        variants: p.variants.map((x) => ({ id: x.id, size: x.size, stock: Number(x.stock) || 0 })),
        hasSizes: p.variants.some((x) => x.size),
        stock: p.stock,
        sla: Number(p.sla) || 2,
        countryOfOrigin: p.countryOfOrigin, genericName: p.genericName, netQty: p.netQty,
        manufacturer: p.manufacturer, packer: p.packer, importer: p.importer,
        sellerId: p.sellerId,
        sellerName: s.shopName,
        featured: activePlan(s).homepage,
        storeSlug: storeIsActive(s) ? s.store.live.slug : "",
        storeName: storeIsActive(s) ? s.store.live.name : "",
      };
    });
}

// ---------------------------------------------------------------------
// Brand Store (Premium plan): seller ki apni mini website — store.html?s=<slug>
// seller.store = { draft, live, published, publishedAt, liveUpdatedAt, updatedAt }
// draft = editor me jo ban raha hai (auto-save), live = buyers ko jo dikhta hai
// Banner images IndexedDB (media.js) me: key "store-banner:<id>"
// ---------------------------------------------------------------------
const STORE_THEMES = {
  purple: { label: "Royal Purple", color: "#4a1a9e" },
  pink: { label: "Hot Pink", color: "#c2185b" },
  blue: { label: "Ocean Blue", color: "#1565c0" },
  teal: { label: "Teal", color: "#00796b" },
  orange: { label: "Sunset Orange", color: "#d84315" },
  black: { label: "Classic Black", color: "#212121" },
};
const STORE_RETURNS = { 7: "7 din easy return", 10: "10 din return", 30: "30 din return", 0: "No returns" };
const STORE_LIMITS = { banners: 5, collections: 8, featured: 8, perCollection: 24 };
const STORE_SLUG_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
const STORE_RESERVED = ["zzapkart", "admin", "seller", "sellers", "store", "stores", "help", "support", "cart", "checkout", "orders"];

function storeIsActive(s) {
  return !!(s && s.kyc && s.kyc.status === "approved" && activePlan(s).brandStore && s.store && s.store.published && s.store.live);
}
function storeTheme(cfg) { return (STORE_THEMES[cfg && cfg.theme] || STORE_THEMES.purple).color; }
function storeUrl(slug) { return "store.html?s=" + encodeURIComponent(slug); }
function storeBannerKey(id) { return "store-banner:" + id; }
function activeStores() {
  return getSellers().filter(storeIsActive).map((s) => ({ ...s.store.live, sellerId: s.id, publishedAt: s.store.publishedAt }));
}
function sellerByStoreSlug(slug) {
  slug = String(slug || "").toLowerCase();
  return slug ? getSellers().find((s) => s.store && s.store.live && s.store.live.slug === slug) || null : null;
}
function storeSlugTaken(slug, exceptSellerId) {
  return STORE_RESERVED.includes(slug) ||
    getSellers().some((s) => s.id !== exceptSellerId && s.store && [s.store.draft, s.store.live].some((c) => c && c.slug === slug));
}
function storeInitials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// Store visits (owner ki apni visits aur preview nahi gine jaate)
function trackStoreVisit(sellerId) {
  const all = dbGet(DB.storeStats, {});
  const st = all[sellerId] || { visits: 0, days: {} };
  const day = new Date().toISOString().slice(0, 10);
  st.visits++;
  st.days[day] = (st.days[day] || 0) + 1;
  Object.keys(st.days).sort().slice(0, -30).forEach((k) => delete st.days[k]);
  all[sellerId] = st;
  dbSet(DB.storeStats, all);
}
function storeStats(sellerId) {
  const st = dbGet(DB.storeStats, {})[sellerId] || { visits: 0, days: {} };
  const since = new Date(Date.now() - 6 * DAY).toISOString().slice(0, 10);
  const last7 = Object.entries(st.days).filter(([d]) => d >= since).reduce((n, [, v]) => n + v, 0);
  return { total: st.visits, last7 };
}

// Platform products (products.js) + seller products ko ek saath catalog mein jodo
if (typeof PRODUCTS !== "undefined") {
  PRODUCTS.push(...storefrontSellerProducts());
}

function inStock(p) {
  return p.stock === undefined || p.stock > 0;
}

// ---------------------------------------------------------------------
// Cart keys: "productId" ya "productId:variantId" (size wale products)
// ---------------------------------------------------------------------
function cartKey(pid, vid) { return vid ? `${pid}:${vid}` : String(pid); }
function resolveCartItem(key, qty) {
  const [pidS, vid] = String(key).split(":");
  const product = PRODUCTS.find((p) => String(p.id) === pidS);
  if (!product) return null;
  let variant = null;
  if (product.variants && product.variants.length) {
    variant = product.variants.find((x) => x.id === vid) || (!vid && product.variants.length === 1 ? product.variants[0] : null);
    if (!variant) return null;
  }
  const maxStock = variant ? variant.stock : product.stock === undefined ? Infinity : product.stock;
  return { key: String(key), product, variant, qty: Number(qty) || 0, maxStock };
}
function cartItemsResolved() {
  return Object.entries(getCart()).map(([k, q]) => resolveCartItem(k, q)).filter(Boolean);
}

// ---------------------------------------------------------------------
// Customer behaviour stats (views, add-to-cart)
// ---------------------------------------------------------------------
const _viewedThisPage = new Set();
function trackView(productId) {
  if (_viewedThisPage.has(productId)) return; // ek page load par ek hi view
  _viewedThisPage.add(productId);
  _bumpStat(productId, "views");
}
function trackCartAdd(productId) { _bumpStat(productId, "carts"); }
function _bumpStat(productId, field) {
  const stats = dbGet(DB.stats, {});
  stats[productId] = stats[productId] || { views: 0, carts: 0 };
  stats[productId][field] = (stats[productId][field] || 0) + 1;
  dbSet(DB.stats, stats);
}
function productStats(productId) {
  return dbGet(DB.stats, {})[productId] || { views: 0, carts: 0 };
}

// ---------------------------------------------------------------------
// Orders — har order seller-wise "shipments" mein bat jata hai
// Har shipment: dispatch-by (procurement SLA), fees aur settlement
// ---------------------------------------------------------------------
const round2 = (n) => Math.round(n * 100) / 100;
const PLATFORM_SELLER = "zzapkart"; // products.js wale items Zzapkart khud bechta hai
const DELIVERY_OPTIONS = {
  standard: { label: "Standard Delivery", days: 4 },
  express: { label: "Express Delivery", days: 1, charge: 99 },
};

function getOrders() { return dbGet(DB.orders, []); }
function saveOrders(list) { return dbSet(DB.orders, list); }

// items: [{ product (storefront), variant (or null), qty }]
function createOrder({ buyer, items, delivery, deliveryCharge, payment }) {
  const orderId = "ZK" + Date.now().toString().slice(-8);
  const now = Date.now();
  const listings = dbGet(DB.products, []).map(normalizeListing);
  const groups = {};

  items.forEach(({ product, variant, qty }) => {
    const sid = product.sellerId || PLATFORM_SELLER;
    const L = listings.find((p) => p.id === product.id);
    const lv = L && variant ? L.variants.find((x) => x.id === variant.id) : null;
    groups[sid] = groups[sid] || [];
    groups[sid].push({
      productId: product.id, variantId: variant ? variant.id : null,
      size: variant ? variant.size || "" : "", sku: lv ? lv.sku : "",
      name: product.name, price: product.price, qty, image: product.image || "", emoji: product.emoji,
      sla: L ? Number(L.sla) || 2 : 2,
      fee: L && typeof feeBreakdown === "function" ? feeBreakdown(product.price, TEMPLATES[(getVertical(L.vertical) || {}).template], L.pkg) : null,
    });
    // Stock kam karo (size-wise)
    if (lv) lv.stock = Math.max(0, Number(lv.stock) - qty);
    if (L) L.stock = L.variants.reduce((s, x) => s + (Number(x.stock) || 0), 0);
  });
  dbSet(DB.products, listings);

  const shipments = Object.entries(groups).map(([sellerId, its]) => {
    const amount = its.reduce((s, x) => s + x.price * x.qty, 0);
    const slaDays = Math.max(...its.map((x) => x.sla));
    const fees = sellerId === PLATFORM_SELLER ? null : round2(its.reduce((s, x) => s + (x.fee ? x.fee.total * x.qty : 0), 0));
    return {
      sellerId, items: its, amount,
      fees, settlement: fees === null ? null : round2(amount - fees),
      slaDays, dispatchBy: now + slaDays * DAY,
      status: "Placed", trackingId: "", courier: "",
      history: [{ status: "Placed", at: now }],
    };
  });

  const subtotal = shipments.reduce((s, x) => s + x.amount, 0);
  const order = { id: orderId, createdAt: now, buyer, delivery, deliveryCharge, payment, subtotal, total: subtotal + deliveryCharge, shipments };
  const list = getOrders();
  list.unshift(order);
  saveOrders(list);

  shipments.forEach((sh) => {
    if (sh.sellerId !== PLATFORM_SELLER) {
      const units = sh.items.reduce((s, x) => s + x.qty, 0);
      notifySeller(sh.sellerId, `🛒 You have a new order! #${orderId} — ${units} item(s), ${formatPrice(sh.amount)}. Dispatch by ${fmtDate(sh.dispatchBy)}.`);
      // Stock khatam / kam hone par alert
      listings.filter((L) => L.sellerId === sh.sellerId && sh.items.some((it) => it.productId === L.id)).forEach((L) => {
        L.variants.forEach((x) => {
          if (Number(x.stock) === 0) notifySeller(sh.sellerId, `⚠️ Out of stock: ${L.name}${x.size ? " (Size " + x.size + ")" : ""} — stock update karein`);
          else if (Number(x.stock) <= 3) notifySeller(sh.sellerId, `📉 Low stock: ${L.name}${x.size ? " (Size " + x.size + ")" : ""} — sirf ${x.stock} bache`);
        });
      });
    }
  });
  if (typeof adsAttributeOrder === "function") adsAttributeOrder(items);
  notifyBuyer(orderId, `✅ Order #${orderId} placed successfully.`);
  return order;
}

function updateShipment(orderId, sellerId, status, extra = {}) {
  const list = getOrders();
  const order = list.find((o) => o.id === orderId);
  if (!order) return false;
  const sh = order.shipments.find((s) => s.sellerId === sellerId);
  if (!sh) return false;
  Object.assign(sh, extra, { status });
  sh.history.push({ status, at: Date.now() });
  if (status === "Shipped") sh.shippedAt = Date.now();
  if (status === "Delivered") sh.deliveredAt = Date.now();
  saveOrders(list);

  const names = sh.items.map((i) => i.name + (i.size ? ` (${i.size})` : "")).join(", ");
  if (status === "Shipped") {
    notifyBuyer(orderId, `🚚 Your product has been shipped: ${names}` + (sh.trackingId ? ` (Tracking ID: ${sh.trackingId}${sh.courier ? ", " + sh.courier : ""})` : ""));
  } else if (status === "Delivered") {
    notifyBuyer(orderId, `📦 Delivered: ${names}. Shopping ke liye shukriya!`);
  }
  return true;
}

// Seller ke liye uske shipments (sirf apna data)
function shipmentsOfSeller(sellerId) {
  const out = [];
  getOrders().forEach((o) => {
    o.shipments.forEach((sh) => {
      if (sh.sellerId === sellerId) out.push({ order: o, shipment: sh });
    });
  });
  return out;
}
