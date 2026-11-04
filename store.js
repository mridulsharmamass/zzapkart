// =====================================================================
// Zzapkart data layer (PROTOTYPE)
// Saara data browser ke localStorage mein rehta hai — koi server nahi.
// Asli launch ke liye ise ek backend (database + API) se badalna hoga.
// =====================================================================

const DB = {
  sellers: "zk_sellers",
  products: "zk_seller_products",
  orders: "zk_orders",
  campaigns: "zk_ad_campaigns", // "ad_campaigns table"
  stats: "zk_product_stats",
  session: "zk_seller_session",
  sellerNotifs: "zk_seller_notifications",
  buyerNotifs: "zk_buyer_notifications",
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
  free:     { id: "free",     name: "Free",     price: 0,    productLimit: 3,        payoutDays: 14, adCredits: 0,    homepage: false, detailedReports: false },
  basic:    { id: "basic",    name: "Basic",    price: 799,  productLimit: 10,       payoutDays: 7,  adCredits: 0,    homepage: false, detailedReports: false },
  advanced: { id: "advanced", name: "Advanced", price: 3499, productLimit: 50,       payoutDays: 3,  adCredits: 500,  homepage: false, detailedReports: true  },
  premium:  { id: "premium",  name: "Premium",  price: 7999, productLimit: Infinity, payoutDays: 1,  adCredits: 2000, homepage: true,  detailedReports: true  },
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
// Seller products
// ---------------------------------------------------------------------
function allSellerProducts() { return dbGet(DB.products, []); }
function productsOfSeller(sellerId) { return allSellerProducts().filter((p) => p.sellerId === sellerId); }

function saveSellerProduct(product) {
  const list = allSellerProducts();
  const i = list.findIndex((p) => p.id === product.id);
  if (i >= 0) list[i] = product;
  else list.push(product);
  return dbSet(DB.products, list);
}

function deleteSellerProduct(sellerId, productId) {
  dbSet(DB.products, allSellerProducts().filter((p) => !(p.id === productId && p.sellerId === sellerId)));
  // Is product ke chalte ads band karo
  dbSet(DB.campaigns, getCampaigns().map((c) =>
    c.productId === productId && c.status === "active" ? { ...c, status: "stopped" } : c));
}

// Storefront par dikhne wale seller products (sirf KYC-approved sellers ke)
function storefrontSellerProducts() {
  const sellers = getSellers();
  const approved = new Map(sellers.filter((s) => s.kyc && s.kyc.status === "approved").map((s) => [s.id, s]));
  return allSellerProducts()
    .filter((p) => approved.has(p.sellerId))
    .map((p) => {
      const s = approved.get(p.sellerId);
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        mrp: p.mrp && p.mrp > p.price ? p.mrp : p.price,
        rating: 0,
        emoji: "📦",
        color: "#f3eefc",
        image: p.image,
        description: p.description,
        stock: p.stock,
        sellerId: p.sellerId,
        sellerName: s.shopName,
        featured: activePlan(s).homepage,
      };
    });
}

// Platform products (products.js) + seller products ko ek saath catalog mein jodo
if (typeof PRODUCTS !== "undefined") {
  PRODUCTS.push(...storefrontSellerProducts());
}

function inStock(p) {
  return p.stock === undefined || p.stock > 0;
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
// Ad campaigns
// ---------------------------------------------------------------------
const COST_PER_CLICK = 5; // ₹ per click

function getCampaigns() { return dbGet(DB.campaigns, []); }
function saveCampaigns(list) { return dbSet(DB.campaigns, list); }

function refreshCampaignStatuses() {
  const now = Date.now();
  let changed = false;
  const list = getCampaigns().map((c) => {
    if (c.status === "active" && (now > c.endAt || c.spent >= c.budget)) {
      changed = true;
      return { ...c, status: "completed" };
    }
    return c;
  });
  if (changed) saveCampaigns(list);
  return list;
}

// Storefront par chalne wale ads
function liveCampaigns() {
  const now = Date.now();
  return refreshCampaignStatuses()
    .filter((c) => c.status === "active" && now >= c.startAt && now <= c.endAt && c.spent < c.budget)
    .map((c) => ({ campaign: c, product: PRODUCTS.find((p) => p.id === c.productId) }))
    .filter((x) => x.product && inStock(x.product));
}

const _impressionsThisPage = new Set();
function recordImpression(campaignId) {
  if (_impressionsThisPage.has(campaignId)) return;
  _impressionsThisPage.add(campaignId);
  saveCampaigns(getCampaigns().map((c) => (c.id === campaignId ? { ...c, impressions: c.impressions + 1 } : c)));
}

function recordClick(campaignId) {
  saveCampaigns(getCampaigns().map((c) => {
    if (c.id !== campaignId || c.status !== "active") return c;
    const charge = Math.min(COST_PER_CLICK, c.budget - c.spent);
    const spent = c.spent + charge;
    return { ...c, clicks: c.clicks + 1, spent, status: spent >= c.budget ? "completed" : c.status };
  }));
}

// ---------------------------------------------------------------------
// Orders — har order seller-wise "shipments" mein bat jata hai
// ---------------------------------------------------------------------
const PLATFORM_SELLER = "zzapkart"; // products.js wale items Zzapkart khud bechta hai
const DELIVERY_OPTIONS = {
  standard: { label: "Standard Delivery", days: 4 },
  express: { label: "Express Delivery", days: 1, charge: 99 },
};

function getOrders() { return dbGet(DB.orders, []); }
function saveOrders(list) { return dbSet(DB.orders, list); }

function createOrder({ buyer, items, delivery, deliveryCharge, payment }) {
  const orderId = "ZK" + Date.now().toString().slice(-8);
  const now = Date.now();
  const sellerProducts = allSellerProducts();

  const groups = {};
  items.forEach(({ product, qty }) => {
    const sid = product.sellerId || PLATFORM_SELLER;
    groups[sid] = groups[sid] || [];
    groups[sid].push({ productId: product.id, name: product.name, price: product.price, qty, image: product.image || "", emoji: product.emoji });

    // Stock kam karo
    const sp = sellerProducts.find((p) => p.id === product.id);
    if (sp) sp.stock = Math.max(0, sp.stock - qty);
  });
  dbSet(DB.products, sellerProducts);

  const shipments = Object.entries(groups).map(([sellerId, its]) => ({
    sellerId,
    items: its,
    amount: its.reduce((s, x) => s + x.price * x.qty, 0),
    status: "Placed",
    trackingId: "",
    courier: "",
    history: [{ status: "Placed", at: now }],
  }));

  const subtotal = shipments.reduce((s, x) => s + x.amount, 0);
  const order = {
    id: orderId,
    createdAt: now,
    buyer,
    delivery,
    deliveryCharge,
    payment,
    subtotal,
    total: subtotal + deliveryCharge,
    shipments,
  };
  const list = getOrders();
  list.unshift(order);
  saveOrders(list);

  shipments.forEach((sh) => {
    if (sh.sellerId !== PLATFORM_SELLER) {
      const units = sh.items.reduce((s, x) => s + x.qty, 0);
      notifySeller(sh.sellerId, `🛒 You have a new order! #${orderId} — ${units} item(s), ${formatPrice(sh.amount)}`);
    }
  });
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
  if (status === "Delivered") sh.deliveredAt = Date.now();
  saveOrders(list);

  const names = sh.items.map((i) => i.name).join(", ");
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
