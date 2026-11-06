// Home page: category list, har category ka alag section, search
const searchInput = document.getElementById("search");
const browseView = document.getElementById("browse-view");
const searchView = document.getElementById("search-view");
const hero = document.getElementById("hero");

const SECTION_LIMIT = 4; // har section mein home par kitne products dikhane hain

// ---------- Saari categories ki list (tiles) ----------
document.getElementById("cat-tiles").innerHTML = CATEGORIES.map(
  (c) => `
    <a href="${categoryUrl(c)}" class="cat-tile" style="background:${c.gradient}">
      <span class="cat-tile-emoji">${c.emoji}</span>
      <span class="cat-tile-name">${c.name}</span>
      <span class="cat-tile-count">${productsOf(c.name).length} products</span>
    </a>`
).join("");

// ---------- Brand Stores (Premium sellers ke apne stores) ----------
const BRAND_STORES = activeStores();
function storeTileHTML(s, cls = "bs-tile") {
  return `
    <a class="${cls}" href="${storeUrl(s.slug)}" style="--st:${storeTheme(s)}">
      <span class="bs-tile-logo">${safeImg(s.logo) ? `<img src="${safeImg(s.logo)}" alt="" />` : esc(storeInitials(s.name))}</span>
      <span class="bs-tile-text"><strong>${esc(s.name)}</strong>${s.tagline ? `<small>${esc(s.tagline)}</small>` : ""}<span class="bs-tile-cta">Visit store →</span></span>
    </a>`;
}
if (BRAND_STORES.length) {
  document.getElementById("brand-stores").innerHTML = `
    <section class="cat-section">
      <div class="cat-section-head" style="border-left-color:#ff2d95">
        <div><h2>🏬 Brand Stores</h2><p class="muted">Sellers ke apne official stores — unke saare products ek jagah</p></div>
      </div>
      <div class="bs-strip">${BRAND_STORES.map((s) => storeTileHTML(s)).join("")}</div>
    </section>`;
}

// ---------- Sponsored (seller ads) ----------
const sponsoredEl = document.getElementById("sponsored");
// Search ke saath khula ho (?q=) to home ads chhupe rehte — unka auction/impression mat karo
const openedWithSearch = !!new URLSearchParams(location.search).get("q");
const homeSlots = openedWithSearch ? [] : runAuction({ placement: "home" }, 4);
if (homeSlots.length) {
  sponsoredEl.innerHTML = `
    <section class="cat-section sponsored-section">
      <div class="cat-section-head" style="border-left-color:#ff2d95">
        <div>
          <h2>Sponsored Products</h2>
          <p class="muted">Hamare sellers ke promoted products</p>
        </div>
      </div>
      <div class="grid">${sponsoredCards(homeSlots)}</div>
    </section>`;
  trackSlotsShown(homeSlots);
}
enableAddToCart(sponsoredEl);

// ---------- Har category ka alag section ----------
const sectionsEl = document.getElementById("category-sections");
sectionsEl.innerHTML = CATEGORIES.map((c) => {
  const items = productsOf(c.name);
  if (items.length === 0) return "";
  return `
    <section class="cat-section">
      <div class="cat-section-head" style="border-left-color:${c.gradient.match(/#\w+/)[0]}">
        <div>
          <h2>${c.emoji} ${c.name}</h2>
          <p class="muted">${c.tagline}</p>
        </div>
        <a href="${categoryUrl(c)}" class="btn view-all">View All (${items.length}) →</a>
      </div>
      <div class="grid">${items.slice(0, SECTION_LIMIT).map(productCard).join("")}</div>
    </section>`;
}).join("");
enableAddToCart(sectionsEl);

// ---------- Search ----------
const searchGrid = document.getElementById("search-grid");
enableAddToCart(searchGrid);

function runSearch() {
  const raw = searchInput.value.trim();
  const q = raw.toLowerCase();
  const searching = q.length > 0;

  browseView.classList.toggle("hidden", searching);
  hero.classList.toggle("hidden", searching);
  searchView.classList.toggle("hidden", !searching);
  if (!searching) return;

  // Har shabd naam / category / description mein hona chahiye ("summer shirt" → dono words)
  const qWords = words(raw).map(stem);
  const list = PRODUCTS.filter((p) => {
    const hay = new Set(words(`${p.name} ${p.brand || ""} ${p.category} ${p.catName || ""} ${p.verticalName || ""} ${p.keywords || ""} ${p.description || ""}`).map(stem));
    const text = normalizeQuery(`${p.brand || ""} ${p.name} ${p.category} ${p.verticalName || ""}`);
    return text.includes(normalizeQuery(raw)) || qWords.every((w) => hay.has(w) || [...hay].some((h) => h.startsWith(w) && w.length >= 3));
  });

  // Ads: brand banner + top-of-search + rest-of-search
  const brand = runBrandAuction(raw);
  const top = runAuction({ placement: "top", query: raw }, 2);
  const topIds = new Set(top.map((s) => s.pid));
  const organic = list.filter((p) => !topIds.has(p.id));
  const rest = runAuction({ placement: "rest", query: raw }, 4).filter((s) => !topIds.has(s.pid)).slice(0, 2);

  // Store ka naam search kiya ho to store ka link sabse upar
  const nq = normalizeQuery(raw);
  const storeHits = nq.length < 3 ? [] : BRAND_STORES.filter((s) => {
    const n = normalizeQuery(`${s.name} ${s.slug.replace(/-/g, " ")}`);
    return n.includes(nq) || nq.includes(normalizeQuery(s.name));
  }).slice(0, 3);
  document.getElementById("search-stores").innerHTML = storeHits.length
    ? `<div class="bs-search-hits">${storeHits.map((s) => storeTileHTML(s, "bs-tile bs-hit")).join("")}</div>` : "";

  const half = Math.min(organic.length, 4);
  searchBrand.innerHTML = brandBanner(brand);
  searchGrid.innerHTML =
    sponsoredCards(top) +
    organic.slice(0, half).map((p) => productCard(p)).join("") +
    sponsoredCards(rest) +
    organic.slice(half).map((p) => productCard(p)).join("");

  if (brand) recordAdImpression(brand.slots[0]);
  trackSlotsShown(top);
  trackSlotsShown(rest);

  const total = list.length;
  document.getElementById("empty").classList.toggle("hidden", total > 0 || top.length + rest.length > 0);
  document.getElementById("result-info").textContent = `"${raw}" ke liye ${total} result(s)`;
}

// Har keystroke par nahi — typing rukne par search (ad impressions sahi ginne ke liye)
const searchBrand = document.getElementById("search-brand");
let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(runSearch, 350);
});

// Doosre page se search karke aaye ho to (?q=...) wala text bhar do
const initialQ = new URLSearchParams(location.search).get("q");
if (initialQ) searchInput.value = initialQ;
runSearch();
