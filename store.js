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
  storeSubs: "zk_store_subscribers",
  customers: "zk_customers",
  customerSession: "zk_customer_session",
  admin: "zk_admin",
  adminSession: "zk_admin_session",
  tickets: "zk_support_tickets",
  chat: "zk_chat_log",
  chatGuest: "zk_chat_guest",
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
  // Purana "Video URL" (YouTube) text field → naya video object
  if (p.video === undefined && p.videoUrl) {
    const yt = ytIdFrom(p.videoUrl);
    p.video = yt ? { kind: "yt", ytId: yt } : null;
  }
  return p;
}

// ---------------------------------------------------------------------
// Product video: upload ki hui file IndexedDB me (key "video:<listingId>"),
// ya YouTube link. listing.video = { kind: "file", duration, w, h, size }
// | { kind: "yt", ytId } | null
// ---------------------------------------------------------------------
const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;
function videoKey(listingId) { return "video:" + listingId; }
function ytIdFrom(url) {
  const s = String(url || "").trim();
  if (!s || /\s/.test(s)) return "";
  let u;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s); } catch { return ""; }
  const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, "");
  let id = "";
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v") || "";
    else {
      const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([^/]+)/);
      if (m) id = m[2];
    }
  }
  return YT_ID_RE.test(id) ? id : "";
}
function cleanVideoMeta(v) {
  if (!v || typeof v !== "object") return null;
  if (v.kind === "yt") return YT_ID_RE.test(v.ytId || "") ? { kind: "yt", ytId: v.ytId } : null;
  if (v.kind === "file") return { kind: "file", duration: Number(v.duration) || 0, w: Number(v.w) || 0, h: Number(v.h) || 0, size: Number(v.size) || 0 };
  return null;
}
function ytEmbedUrl(id) { return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1`; }
function ytThumbUrl(id) { return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`; }
function fmtDuration(sec) {
  const s = Math.round(Number(sec) || 0);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
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
  if (typeof MediaDB !== "undefined") { MediaDB.del(id); MediaDB.del(videoKey(id)); }
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
  // Suspended sellers (super admin) ke products store par nahi dikhte
  const sellers = new Map(getSellers().filter((s) => s.kyc && s.kyc.status === "approved" && !s.suspended).map((s) => [s.id, s]));
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
        video: cleanVideoMeta(p.video),
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
  return !!(s && s.kyc && s.kyc.status === "approved" && !s.suspended && activePlan(s).brandStore &&
    s.store && s.store.published && s.store.live && !s.store.adminBlocked);
}
// ---- Store design (fully customisable): rang, font, buttons, header, grid, sections ----
const HEX_RE = /^#[0-9a-f]{6}$/i;
const STORE_FONTS = {
  system: { label: "Default — clean", head: "", body: "", gf: "" },
  poppins: { label: "Poppins — modern", head: "'Poppins'", body: "'Poppins'", gf: "family=Poppins:wght@400;600;700;800" },
  montserrat: { label: "Montserrat — bold", head: "'Montserrat'", body: "'Montserrat'", gf: "family=Montserrat:wght@400;600;700;800" },
  elegant: { label: "Playfair + Lato — elegant", head: "'Playfair Display'", body: "'Lato'", gf: "family=Playfair+Display:wght@600;700;800&family=Lato:wght@400;700" },
  classic: { label: "Lora — classic", head: "'Lora'", body: "'Lora'", gf: "family=Lora:wght@400;600;700" },
  friendly: { label: "Nunito — friendly", head: "'Nunito'", body: "'Nunito'", gf: "family=Nunito:wght@400;600;700;800" },
};
const STORE_BUTTONS = { rounded: { label: "Rounded", r: "8px" }, pill: { label: "Pill", r: "999px" }, square: { label: "Square", r: "0px" } };
const STORE_HEADERS = { light: "Light (safed)", dark: "Dark (kaala)", brand: "Theme colour" };
const STORE_COLS = [3, 4, 5];
const STORE_SECTIONS = {
  trust: "Trust badges (delivery, returns, payments)",
  collections: "Shop by collection (cards)",
  featured: "Featured products",
  collrows: "Har collection ki product row",
  new: "New arrivals",
  story: "Our story (About)",
  news: "Newsletter signup",
};

function storeDesign(cfg) {
  const d = (cfg && cfg.design) || {};
  const sections = (Array.isArray(d.sections) ? d.sections : []).filter((s, i, a) => s && STORE_SECTIONS[s.k] && a.findIndex((x) => x && x.k === s.k) === i)
    .map((s) => ({ k: s.k, on: s.on !== false }));
  Object.keys(STORE_SECTIONS).forEach((k) => {
    if (!sections.some((s) => s.k === k)) sections.push({ k, on: k === "new" ? !(cfg && cfg.showNew === false) : true });
  });
  return {
    color: HEX_RE.test(d.color || "") ? d.color.toLowerCase() : "",
    font: STORE_FONTS[d.font] ? d.font : "system",
    buttons: STORE_BUTTONS[d.buttons] ? d.buttons : "rounded",
    header: STORE_HEADERS[d.header] ? d.header : "light",
    cols: STORE_COLS.includes(Number(d.cols)) ? Number(d.cols) : 4,
    announceOn: d.announceOn !== false,
    announce: String(d.announce || "").slice(0, 90),
    sections,
  };
}
// Theme colour: preset ya seller ka custom (#rrggbb — sirf valid hex, kyunki ye inline style me jata hai)
function storeTheme(cfg) {
  const c = cfg && cfg.design && cfg.design.color;
  if (cfg && cfg.theme === "custom" && HEX_RE.test(c || "")) return c.toLowerCase();
  return (STORE_THEMES[cfg && cfg.theme] || STORE_THEMES.purple).color;
}
function hexRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function relLum(hex) {
  return hexRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrastRatio(a, b) { const [x, y] = [relLum(a), relLum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); }
function mixHex(hex, target, t) {
  const a = hexRgb(hex), b = hexRgb(target);
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
// fill = buttons ka rang, ink = fill par text (safed ya kaala — jo padhne me saaf ho),
// text = safed background par accent text (halka rang ho to apne-aap gehra kiya jata hai)
function storePalette(cfg) {
  const fill = storeTheme(cfg);
  const ink = contrastRatio(fill, "#ffffff") >= contrastRatio(fill, "#14101c") ? "#ffffff" : "#14101c";
  let text = fill;
  for (let i = 0; i < 12 && contrastRatio(text, "#ffffff") < 4.5; i++) text = mixHex(text, "#000000", 0.12);
  return { fill, ink, text, light: contrastRatio(fill, "#ffffff") < 3 };
}

// Store ke CSS variables (store page + builder preview dono me)
function storeCssVars(cfg) {
  const p = storePalette(cfg), ds = storeDesign(cfg), f = STORE_FONTS[ds.font];
  const stack = (fam) => `${fam}, ${/Playfair|Lora/.test(fam) ? "Georgia, 'Times New Roman', serif" : "'Segoe UI', Roboto, Arial, sans-serif"}`;
  return {
    "--st": p.fill, "--st-ink": p.ink, "--st-text": p.text,
    "--sh-radius": STORE_BUTTONS[ds.buttons].r, "--sh-cols": String(ds.cols), "--sh-cols-side": String(ds.cols - 1),
    "--sh-font-head": f.head ? stack(f.head) : null, "--sh-font-body": f.body ? stack(f.body) : null,
  };
}
function applyStoreVars(el, cfg) {
  Object.entries(storeCssVars(cfg)).forEach(([k, v]) => (v === null ? el.style.removeProperty(k) : el.style.setProperty(k, v)));
  loadStoreFont(storeDesign(cfg).font);
}
function loadStoreFont(key) {
  const f = STORE_FONTS[key];
  if (!f || !f.gf || typeof document === "undefined" || document.querySelector(`link[data-store-font="${key}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = `https://fonts.googleapis.com/css2?${f.gf}&display=swap`;
  l.dataset.storeFont = key;
  document.head.appendChild(l);
}

// ---- Store pages (Privacy Policy, Terms, FAQ…) — seller khud banata hai ----
const STORE_PAGE_LIMIT = 10;
const STORE_PAGE_MAX = 8000;
function storePageSlug(pg) { return slugify(pg.title || "").slice(0, 40).replace(/-+$/, "") || "page-" + String(pg.id || "").toLowerCase(); }
// Simple formatting: "## Heading", "### Sub-heading", "- list", "1. list", **bold**, khaali line = naya paragraph
function storeRichText(src) {
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const out = [];
  let list = null, para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inline).join("<br>")}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map((x) => `<li>${inline(x)}</li>`).join("")}</${list.tag}>`); list = null; } };
  String(src || "").replace(/\r/g, "").split("\n").forEach((raw) => {
    const line = raw.trim();
    let m;
    if (!line) { flushPara(); flushList(); return; }
    if ((m = line.match(/^(#{1,3})\s+(.+)$/))) { flushPara(); flushList(); out.push(m[1].length === 3 ? `<h3>${inline(m[2])}</h3>` : `<h2>${inline(m[2])}</h2>`); return; }
    if ((m = line.match(/^[-*•]\s+(.+)$/)) || (m = line.match(/^\d{1,2}[.)]\s+(.+)$/))) {
      const tag = /^\d/.test(line) ? "ol" : "ul";
      flushPara();
      if (list && list.tag !== tag) flushList();
      if (!list) list = { tag, items: [] };
      list.items.push(m[1]);
      return;
    }
    flushList();
    para.push(line);
  });
  flushPara();
  flushList();
  return out.join("");
}
// Ready-made templates (seller edit kar sakta hai). Phone / email / website nahi — contact Zzapkart ke through.
const STORE_PAGE_TEMPLATES = {
  privacy: { label: "Privacy Policy", body: (v) => `Last updated: ${v.date}

${v.name} ("we", "us") sells on Zzapkart. This policy explains how your information is used when you shop at our store.

## Information we receive
- Your name, delivery address and phone number — shared with us by Zzapkart only to deliver your order.
- Order details such as products, quantity and order status.
- We never see or store your card, UPI or bank details. All payments are processed securely by Zzapkart.

## How we use it
- To pack, ship and deliver your order.
- To handle returns, replacements and refunds.
- To answer questions you send us through Zzapkart support.

## What we never do
- We do **not** sell or rent your personal information.
- We do not contact you outside Zzapkart for marketing.

## Newsletter
If you subscribe to our newsletter, we use your email only to send store updates and offers.

## Questions
For any privacy question, contact us through the Zzapkart help chat or from your order in My Orders.` },
  terms: { label: "Terms & Conditions", body: (v) => `By placing an order at ${v.name} on Zzapkart, you agree to these terms.

## Products & pricing
- Prices are in Indian Rupees and include all taxes.
- Product photos are for illustration; colour may vary slightly on different screens.
- We may cancel an order if a product goes out of stock or is priced incorrectly. Any payment made is refunded in full.

## Orders & delivery
- Your order is confirmed when you see the order confirmation on Zzapkart.
- Delivery dates are estimates and may vary by pincode.

## Returns
Returns follow our Return & Refund Policy (${v.returns}).

## Platform
Payments, delivery tracking and customer support are provided by Zzapkart. Zzapkart's terms of use also apply.` },
  shipping: { label: "Shipping Policy", body: (v) => `## Dispatch
- Orders are packed and dispatched within 1–3 business days.
- You get tracking details in My Orders as soon as your order ships.

## Delivery
- Delivery usually takes 2–7 days after dispatch, depending on your pincode.
- **FREE delivery** on orders of ₹${v.free} or more; otherwise ₹40.
- Express delivery is available at checkout for ₹99 where serviceable.
- Cash on Delivery is available on most pincodes.

## Damaged or wrong item?
Report it within 48 hours of delivery from My Orders (with photos) and we will arrange a replacement or refund.` },
  returns: { label: "Return & Refund Policy", body: (v) => v.days ? `We offer **${v.days}-day returns** on most products.

## Eligibility
- Request a return within ${v.days} days of delivery from My Orders.
- The product must be unused, with original tags and packaging.
- Innerwear, personal care and customised items cannot be returned for hygiene reasons.

## Refunds
1. We pick up the product from your address.
2. It passes a quick quality check.
3. Your refund is issued within 5–7 business days — prepaid orders to the original payment method, COD orders to your bank account or UPI.

## Damaged or wrong item?
Report it within 48 hours of delivery and we will replace it at no extra cost.` : `Products from ${v.name} are **not returnable**.

## Damaged or wrong item?
- Report it within 48 hours of delivery from My Orders (with photos).
- We will send a replacement or issue a full refund.

## Refunds
Approved refunds are issued within 5–7 business days — prepaid orders to the original payment method, COD orders to your bank account or UPI.` },
  faq: { label: "FAQ", body: (v) => `## How long will delivery take?
Most orders are dispatched within 1–3 days and delivered in 2–7 days.

## Is Cash on Delivery available?
Yes, COD is available on most pincodes.

## Do you charge for delivery?
Delivery is FREE on orders of ₹${v.free} or more. Below that, it is ₹40.

## How do I return a product?
Open My Orders on Zzapkart, choose the item and request a return. ${v.returns}.

## How can I contact the store?
Use the Zzapkart help chat or the support option on your order page. We usually reply within 24 hours.` },
  contact: { label: "Contact Us", body: (v) => `We're happy to help!

- **Order questions:** open your order in My Orders on Zzapkart.
- **Anything else:** use the Zzapkart help chat — our team replies within 24 hours.
- **Business hours:** Monday to Saturday, 10 AM – 7 PM.

${v.name} is a KYC-verified seller on Zzapkart (${v.shop}).` },
};
function storePageTemplate(key, cfg, seller) {
  const t = STORE_PAGE_TEMPLATES[key];
  if (!t) return null;
  const days = Number(cfg && cfg.returnDays) || 0;
  const v = {
    name: String((cfg && cfg.name) || "Our store").trim() || "Our store",
    shop: (seller && seller.shopName) || "Zzapkart seller",
    days, returns: STORE_RETURNS[days] || STORE_RETURNS[7], free: FREE_DELIVERY_MIN,
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
  };
  return { title: t.label, body: t.body(v) };
}
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
// Customers (buyer accounts): naam, email, mobile, password (hash), saved addresses
// ---------------------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOBILE_RE = /^[6-9]\d{9}$/;
const FREE_DELIVERY_MIN = 499; // isse upar delivery free (checkout + Brand Store cart)
const MAX_ADDRESSES = 10;
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu & Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Ladakh", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Chandigarh", "Puducherry",
];

function getCustomers() { return dbGet(DB.customers, []); }
function saveCustomers(list) { return dbSet(DB.customers, list); }
function getCustomer(id) { return getCustomers().find((c) => c.id === id) || null; }
function customerByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  return getCustomers().find((c) => c.email === e) || null;
}
function updateCustomer(id, changes) {
  const list = getCustomers();
  const i = list.findIndex((c) => c.id === id);
  if (i < 0) return null;
  list[i] = { ...list[i], ...changes };
  return saveCustomers(list) ? list[i] : null;
}
function setCustomerSession(id) { dbSet(DB.customerSession, { customerId: id, at: Date.now() }); }
function clearCustomerSession() { localStorage.removeItem(DB.customerSession); }
function currentCustomer() {
  const s = dbGet(DB.customerSession, null);
  const c = s ? getCustomer(s.customerId) : null;
  return c && !c.blocked ? c : null; // admin ne block kiya to logged out
}
function customerOrders(customerId) { return getOrders().filter((o) => o.customerId === customerId); }
function addressLine(a) {
  return [a.address, a.landmark, a.city, a.state].filter(Boolean).join(", ") + (a.pincode ? " – " + a.pincode : "");
}
// Naya address account me jodo (same address dobara na bane). Pehla address default.
function saveCustomerAddress(customerId, addr) {
  const c = getCustomer(customerId);
  if (!c) return null;
  const list = c.addresses || [];
  const same = list.find((a) => a.address.trim().toLowerCase() === addr.address.trim().toLowerCase() && a.pincode === addr.pincode && a.phone === addr.phone);
  if (same) return same;
  if (list.length >= MAX_ADDRESSES) return null;
  const rec = { id: uid("A"), label: addr.label || "Home", name: addr.name, phone: addr.phone, address: addr.address, landmark: addr.landmark || "",
    city: addr.city, state: addr.state, pincode: addr.pincode, isDefault: list.length === 0 };
  updateCustomer(customerId, { addresses: list.concat(rec) });
  return rec;
}

// Brand Store newsletter subscribers
function storeSubscribers(sellerId) { return dbGet(DB.storeSubs, {})[sellerId] || []; }
function subscribeToStore(sellerId, email) {
  const all = dbGet(DB.storeSubs, {});
  const list = all[sellerId] || [];
  const e = String(email).trim().toLowerCase();
  if (list.some((x) => x.email === e)) return false;
  list.push({ email: e, at: Date.now() });
  all[sellerId] = list;
  dbSet(DB.storeSubs, all);
  return true;
}

// ---------------------------------------------------------------------
// Support tickets: chat assistant ka "Talk to support" → Super Admin reply karta hai,
// reply customer ko wapas chat me dikhta hai.
// ticket = { id, customerId, guestId, name, email, orderId, subject, status: "open" | "closed",
//   messages: [{ from: "customer" | "admin", text, at }], unreadCustomer, unreadAdmin, createdAt, updatedAt }
// ---------------------------------------------------------------------
const TICKET_MAX = 1000; // ek message ki max length
function getTickets() { return dbGet(DB.tickets, []); }
function saveTickets(list) { return dbSet(DB.tickets, list.slice(0, 500)); }
function chatGuestId() {
  let g = dbGet(DB.chatGuest, null);
  if (!g) { g = uid("G"); dbSet(DB.chatGuest, g); }
  return g;
}
// Is browser ke user ki requests: login ho to uske account ki + is browser se bina login wali
function myTickets() {
  const c = currentCustomer();
  const g = dbGet(DB.chatGuest, null);
  return getTickets().filter((t) => (c && t.customerId === c.id) || (!t.customerId && g && t.guestId === g));
}
function createTicket({ name, email, text, orderId = "" }) {
  const c = currentCustomer();
  const now = Date.now();
  const t = {
    id: "TK" + now.toString().slice(-6) + Math.floor(Math.random() * 90 + 10),
    customerId: c ? c.id : null, guestId: c ? null : chatGuestId(),
    name: c ? c.name : String(name || "").trim(), email: c ? c.email : String(email || "").trim().toLowerCase(),
    orderId: String(orderId || "").toUpperCase(), subject: String(text).slice(0, 80), status: "open",
    messages: [{ from: "customer", text: String(text).slice(0, TICKET_MAX), at: now }],
    unreadCustomer: 0, unreadAdmin: 1, createdAt: now, updatedAt: now,
  };
  const list = getTickets();
  list.unshift(t);
  return saveTickets(list) ? t : null;
}
function updateTicket(id, fn) {
  const list = getTickets();
  const t = list.find((x) => x.id === id);
  if (!t) return null;
  fn(t);
  t.updatedAt = Date.now();
  return saveTickets(list) ? t : null;
}
function ticketReply(id, from, text) {
  return updateTicket(id, (t) => {
    t.messages.push({ from, text: String(text).slice(0, TICKET_MAX), at: Date.now() });
    if (from === "admin") t.unreadCustomer = (t.unreadCustomer || 0) + 1;
    else { t.unreadAdmin = (t.unreadAdmin || 0) + 1; t.status = "open"; }
  });
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
function createOrder({ buyer, items, delivery, deliveryCharge, payment, customerId = null }) {
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
  const order = { id: orderId, createdAt: now, customerId, buyer, delivery, deliveryCharge, payment, subtotal, total: subtotal + deliveryCharge, shipments };
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
