// =====================================================================
// Zzapkart Ads engine (PROTOTYPE — data in localStorage)
//
// Campaign types:
//   SP = Sponsored Products  → search results, category, product pages, home
//   SB = Sponsored Brands    → shop banner (headline + 3 products) top of search
//
// Each ad slot is won in a small "auction": the highest bid wins,
// and on a click the advertiser pays second price (₹1 above the next bid, up to their own bid).
// =====================================================================

const ADS_KEY = "zk_ad_campaigns_v2";
const AD_CLICKS_KEY = "zk_ad_clicks";
const AD_SLOTS_KEY = "zk_ad_slots";

const AD_MIN_BID = 1;
const AD_MAX_BID = 100;
const AD_MIN_DAILY_BUDGET = 50;
const ATTRIBUTION_DAYS = 7;          // order within 7 days of a click = ad sale
const INVALID_CLICK_WINDOW = 30 * 60 * 1000; // repeat clicks on the same ad within 30 min are free

const PLACEMENTS = {
  top: "Top of search",
  rest: "Rest of search",
  product: "Product pages",
  category: "Category pages",
  home: "Home page",
};
const MATCH_TYPES = { broad: "Broad", phrase: "Phrase", exact: "Exact" };

// ---------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------
function getCampaigns() { return dbGet(ADS_KEY, []); }
function saveCampaigns(list) { return dbSet(ADS_KEY, list); }
function getCampaign(id) { return getCampaigns().find((c) => c.id === id) || null; }

function updateCampaign(id, fn) {
  const list = getCampaigns();
  const i = list.findIndex((c) => c.id === id);
  if (i < 0) return null;
  const c = list[i];
  fn(c);
  saveCampaigns(list);
  return c;
}

// ---------------------------------------------------------------------
// Stats helpers
// ---------------------------------------------------------------------
const emptyStats = () => ({ imp: 0, clk: 0, spend: 0, orders: 0, sales: 0 });
function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addStats(target, delta) {
  for (const k in delta) target[k] = Math.round(((target[k] || 0) + delta[k]) * 100) / 100;
}
function sumStats(list) {
  const t = emptyStats();
  list.forEach((s) => s && addStats(t, s));
  return t;
}
function derived(s) {
  return {
    ...s,
    ctr: s.imp ? (s.clk / s.imp) * 100 : null,
    cpc: s.clk ? s.spend / s.clk : null,
    acos: s.sales ? (s.spend / s.sales) * 100 : null,
    roas: s.spend ? s.sales / s.spend : null,
    cvr: s.clk ? (s.orders / s.clk) * 100 : null,
  };
}

// Add stats at every level of a campaign at once
function bumpCampaign(c, ctx, delta) {
  const day = dayKey();
  c.daily = c.daily || {};
  c.daily[day] = c.daily[day] || emptyStats();
  addStats(c.daily[day], delta);

  c.productStats = c.productStats || {};
  if (ctx.pid) {
    c.productStats[ctx.pid] = c.productStats[ctx.pid] || emptyStats();
    addStats(c.productStats[ctx.pid], delta);
  }
  c.placementStats = c.placementStats || {};
  if (ctx.placement) {
    c.placementStats[ctx.placement] = c.placementStats[ctx.placement] || emptyStats();
    addStats(c.placementStats[ctx.placement], delta);
  }
  if (ctx.kwId) {
    const kw = (c.keywords || []).find((k) => k.id === ctx.kwId);
    if (kw) { kw.stats = kw.stats || emptyStats(); addStats(kw.stats, delta); }
  } else if (ctx.placement === "top" || ctx.placement === "rest") {
    c.autoStats = c.autoStats || emptyStats();
    addStats(c.autoStats, delta);
  }
  if (ctx.query) {
    const q = normalizeQuery(ctx.query);
    c.searchTerms = c.searchTerms || {};
    c.searchTerms[q] = c.searchTerms[q] || emptyStats();
    addStats(c.searchTerms[q], delta);
  }
}

function campaignTotals(c, fromTs = 0) {
  const fromKey = fromTs ? dayKey(fromTs) : "";
  return derived(sumStats(Object.entries(c.daily || {}).filter(([d]) => d >= fromKey).map(([, s]) => s)));
}
function spentToday(c) {
  return (c.daily && c.daily[dayKey()] && c.daily[dayKey()].spend) || 0;
}

// ---------------------------------------------------------------------
// Campaign status
// ---------------------------------------------------------------------
function campaignStatus(c) {
  const now = Date.now();
  if (c.state === "archived") return { key: "archived", label: "Archived" };
  if (c.state === "paused") return { key: "paused", label: "Paused" };
  if (now < c.startAt) return { key: "scheduled", label: "Scheduled" };
  if (c.endAt && now > c.endAt) return { key: "ended", label: "Ended" };
  const seller = getSeller(c.sellerId);
  if (!seller || !seller.kyc || seller.kyc.status !== "approved") return { key: "blocked", label: "Seller not verified" };
  if (spentToday(c) >= c.dailyBudget) return { key: "out-of-budget", label: "Out of budget" };
  const live = c.productIds.filter((pid) => !(c.pausedProducts || []).includes(pid)).map(sellerProductById).filter((p) => p && isListingLive(p));
  if (!live.length) return { key: "not-delivering", label: "No live products" };
  return { key: "delivering", label: "Delivering" };
}

function sellerProductById(id) {
  return allSellerProducts().find((p) => p.id === id) || null;
}

// ---------------------------------------------------------------------
// Keyword matching
// ---------------------------------------------------------------------
function normalizeQuery(q) {
  return String(q || "").toLowerCase().replace(/[^a-z0-9ऀ-ॿ\s]/g, " ").replace(/\s+/g, " ").trim();
}
const words = (q) => normalizeQuery(q).split(" ").filter(Boolean);
const stem = (w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w); // shirts → shirt

function keywordMatches(kwText, match, query) {
  const kw = normalizeQuery(kwText), q = normalizeQuery(query);
  if (!kw || !q) return false;
  if (match === "exact") return kw === q || words(kw).map(stem).join(" ") === words(q).map(stem).join(" ");
  if (match === "phrase") return (" " + words(q).map(stem).join(" ") + " ").includes(" " + words(kw).map(stem).join(" ") + " ");
  // broad: all the keyword's words appear in the query, in any order
  const qs = new Set(words(q).map(stem));
  return words(kw).map(stem).every((w) => qs.has(w));
}

function isNegated(c, query) {
  return (c.negatives || []).some((n) => keywordMatches(n.text, n.match === "exact" ? "exact" : "phrase", query));
}

// Auto targeting: is the query related to the product's name / category / description?
function autoRelevant(product, query) {
  const qw = words(query).map(stem).filter((w) => w.length > 1);
  if (!qw.length) return false;
  const text = new Set(words(`${product.name} ${product.category} ${product.description || ""}`).map(stem));
  return qw.some((w) => text.has(w));
}

// Suggested bid: the more advertisers on the same keyword / category, the higher it is
function suggestedBid(keywordOrCategory) {
  const comp = getCampaigns().filter((c) => c.state === "enabled" &&
    ((c.keywords || []).some((k) => keywordMatches(k.text, "broad", keywordOrCategory)) ||
      c.productIds.some((pid) => { const p = sellerProductById(pid); return p && normalizeQuery(p.category) === normalizeQuery(keywordOrCategory); }))).length;
  const base = 3 + comp * 1.5;
  return { low: Math.max(AD_MIN_BID, Math.round(base * 0.7)), mid: Math.round(base), high: Math.round(base * 1.6) };
}

// ---------------------------------------------------------------------
// Auction
// ctx = { placement, query?, productId?, category? }
// ---------------------------------------------------------------------
function adEligible(c) {
  return campaignStatus(c).key === "delivering";
}

function runAuction(ctx, slots = 2, type = "SP") {
  const query = ctx.query ? normalizeQuery(ctx.query) : "";
  const bids = [];

  getCampaigns().filter((c) => c.type === type && adEligible(c)).forEach((c) => {
    if (query && isNegated(c, query)) return;
    const remaining = c.dailyBudget - spentToday(c);

    c.productIds.forEach((pid) => {
      if ((c.pausedProducts || []).includes(pid)) return;
      if (pid === ctx.productId) return; // don't advertise the product you're already viewing
      const product = PRODUCTS.find((p) => p.id === pid);
      if (!product || !inStock(product)) return;

      let bid = 0, kwId = null;
      if (query) {
        if (c.targeting === "manual" || type === "SB") {
          (c.keywords || []).filter((k) => k.state === "enabled" && keywordMatches(k.text, k.match, query))
            .forEach((k) => { if (k.bid > bid) { bid = k.bid; kwId = k.id; } });
        } else if (autoRelevant(product, query)) {
          bid = c.defaultBid;
        }
      } else if (ctx.placement === "category") {
        if (product.category === ctx.category) bid = c.defaultBid;
      } else if (ctx.placement === "product") {
        if (product.category === ctx.category) bid = c.defaultBid;
      } else if (ctx.placement === "home") {
        bid = c.defaultBid;
      }
      if (bid <= 0) return;
      bid = Math.min(bid, remaining); // never bid more than the remaining budget
      if (bid < AD_MIN_BID) return;
      bids.push({ campaign: c, product, bid, kwId });
    });
  });

  // Each product only once (its highest bid)
  const best = new Map();
  bids.sort((a, b) => b.bid - a.bid || Math.random() - 0.5).forEach((b) => {
    if (!best.has(b.product.id)) best.set(b.product.id, b);
  });
  const ranked = [...best.values()];

  return ranked.slice(0, slots).map((w, i) => {
    const next = ranked[i + 1];
    const cpc = Math.min(w.bid, Math.max(AD_MIN_BID, next ? next.bid + 1 : AD_MIN_BID));
    return createSlot({ cid: w.campaign.id, pid: w.product.id, kwId: w.kwId, cpc, placement: ctx.placement, query }, w);
  });
}

// Sponsored Brands: ek banner (shop + headline + 3 products) top of search
function runBrandAuction(query) {
  const q = normalizeQuery(query);
  if (!q) return null;
  let best = null;
  getCampaigns().filter((c) => c.type === "SB" && adEligible(c) && !isNegated(c, q)).forEach((c) => {
    let bid = 0, kwId = null;
    (c.keywords || []).filter((k) => k.state === "enabled" && keywordMatches(k.text, k.match, q))
      .forEach((k) => { if (k.bid > bid) { bid = k.bid; kwId = k.id; } });
    bid = Math.min(bid, c.dailyBudget - spentToday(c));
    if (bid >= AD_MIN_BID && (!best || bid > best.bid)) best = { c, bid, kwId };
  });
  if (!best) return null;
  const products = best.c.productIds.map((pid) => PRODUCTS.find((p) => p.id === pid)).filter((p) => p && inStock(p)).slice(0, 3);
  if (!products.length) return null;
  const seller = getSeller(best.c.sellerId);
  const slots = products.map((p) => createSlot({ cid: best.c.id, pid: p.id, kwId: best.kwId, cpc: Math.min(best.bid, AD_MIN_BID + 1), placement: "top", query: q }));
  return { campaign: best.c, seller, products, slots };
}

// ---------------------------------------------------------------------
// Slots, impressions, clicks
// ---------------------------------------------------------------------
function createSlot(data, extra = {}) {
  const id = uid("SL");
  const slots = dbGet(AD_SLOTS_KEY, {});
  const cutoff = Date.now() - 60 * 60 * 1000; // purane slots saaf
  for (const k in slots) if (slots[k].at < cutoff) delete slots[k];
  slots[id] = { ...data, at: Date.now() };
  dbSet(AD_SLOTS_KEY, slots);
  return { id, ...data, ...extra };
}

const _seenSlots = new Set();
function recordAdImpression(slot) {
  if (_seenSlots.has(slot.id)) return;
  _seenSlots.add(slot.id);
  updateCampaign(slot.cid, (c) => bumpCampaign(c, slot, { imp: 1 }));
}

// Click: charge only valid clicks (repeat clicks within 30 min are free)
function recordAdClick(slotId) {
  const slot = dbGet(AD_SLOTS_KEY, {})[slotId];
  if (!slot) return false;
  const clicks = dbGet(AD_CLICKS_KEY, []);
  const now = Date.now();
  const recent = clicks.find((k) => k.cid === slot.cid && k.pid === slot.pid && now - k.at < INVALID_CLICK_WINDOW);

  // Remember the click for attribution (update the time on a repeat click)
  const fresh = clicks.filter((k) => now - k.at < ATTRIBUTION_DAYS * DAY && !(k.cid === slot.cid && k.pid === slot.pid));
  fresh.unshift({ cid: slot.cid, pid: slot.pid, kwId: slot.kwId, placement: slot.placement, query: slot.query, at: now });
  dbSet(AD_CLICKS_KEY, fresh.slice(0, 200));
  if (recent) return false; // invalid / duplicate click — not charged

  let charged = 0;
  updateCampaign(slot.cid, (c) => {
    charged = Math.max(0, Math.min(slot.cpc, c.dailyBudget - spentToday(c)));
    bumpCampaign(c, slot, { clk: 1, spend: charged });
  });
  if (charged > 0) chargeAdvertiser(getCampaign(slot.cid).sellerId, charged);
  return true;
}

// Spend comes from ad credits first, the rest goes on the seller's monthly ad bill (demo)
function chargeAdvertiser(sellerId, amount) {
  const s = getSeller(sellerId);
  if (!s) return;
  const fromCredits = Math.min(s.adCredits || 0, amount);
  const month = dayKey().slice(0, 7);
  const bill = s.adBill || {};
  bill[month] = Math.round(((bill[month] || 0) + amount - fromCredits) * 100) / 100;
  updateSeller(sellerId, { adCredits: Math.round(((s.adCredits || 0) - fromCredits) * 100) / 100, adBill: bill });
}

// After an order: credit the campaign with sales of products clicked within 7 days
function adsAttributeOrder(items) {
  const clicks = dbGet(AD_CLICKS_KEY, []);
  const now = Date.now();
  items.forEach(({ product, qty }) => {
    const click = clicks.find((k) => k.pid === product.id && now - k.at < ATTRIBUTION_DAYS * DAY);
    if (!click) return;
    updateCampaign(click.cid, (c) => bumpCampaign(c, click, { orders: 1, sales: product.price * qty }));
  });
}

function adsRemoveProduct(productId) {
  saveCampaigns(getCampaigns().map((c) => ({ ...c, productIds: c.productIds.filter((p) => p !== productId) })));
}

// ---------------------------------------------------------------------
// Storefront rendering helpers
// ---------------------------------------------------------------------
function sponsoredCards(slots) {
  return slots.map((s) => productCard(PRODUCTS.find((p) => p.id === s.pid), { slot: s.id })).join("");
}

function brandBanner(b) {
  if (!b) return "";
  return `
    <section class="brand-ad" data-brand="${esc(b.campaign.id)}">
      <div class="brand-ad-info">
        <span class="ad-label">Sponsored</span>
        <div class="brand-ad-shop">🏪 ${esc(b.seller ? b.seller.shopName : "")}</div>
        <h3>${esc(b.campaign.headline || "")}</h3>
        <a class="brand-ad-cta" href="product.html?id=${b.products[0].id}&slot=${b.slots[0].id}">Shop now →</a>
      </div>
      <div class="brand-ad-products">
        ${b.products.map((p, i) => `
          <a class="brand-ad-item" href="product.html?id=${p.id}&slot=${b.slots[i].id}">
            <div class="brand-ad-img">${productThumb(p)}</div>
            <div class="brand-ad-name">${esc(p.name)}</div>
            <div class="price">${formatPrice(p.price)}</div>
          </a>`).join("")}
      </div>
    </section>`;
}

function trackSlotsShown(slots) { slots.forEach(recordAdImpression); }
