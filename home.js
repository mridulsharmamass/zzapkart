// Home page: hero carousel, categories, deals, reels, brand stores, sponsored products,
// one section per category, and search.
const searchInput = document.getElementById("search");
const browseView = document.getElementById("browse-view");
const searchView = document.getElementById("search-view");
const hero = document.getElementById("hero");

const SECTION_LIMIT = 5; // products per category section on the home page

// ---------- Categories (tiles) ----------
document.getElementById("cat-tiles").innerHTML = CATEGORIES.map((c) => {
  const pick = productsOf(c.name).find((p) => safeImg(p.image));
  return `
    <a href="${categoryUrl(c)}" class="cat-tile" style="--tile:${c.gradient}">
      <span class="cat-tile-art">${pick ? `<img src="${safeImg(pick.image)}" alt="" loading="lazy" />` : `<span class="cat-tile-emoji">${c.emoji}</span>`}</span>
      <span class="cat-tile-name">${c.name}</span>
      <span class="cat-tile-count">${productsOf(c.name).length} products</span>
    </a>`;
}).join("");

// ---------- Brand Stores (Premium sellers' own stores) ----------
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
    <section class="home-sec">
      <div class="section-head">
        <div><h2 class="section-title">🏬 Brand Stores</h2><p class="section-sub">Official stores from our sellers — their full range in one place</p></div>
      </div>
      <div class="bs-strip">${BRAND_STORES.map((s) => storeTileHTML(s)).join("")}</div>
    </section>`;
}

// ---------- Hero carousel (changes automatically) ----------
function heroSlides() {
  const maxOff = (list) => list.reduce((m, p) => Math.max(m, discount(p)), 0);
  const artOf = (list, fallback) => {
    const imgs = list.filter((p) => safeImg(p.image)).sort((a, b) => discount(b) - discount(a)).slice(0, 3).map((p) => ({ img: safeImg(p.image) }));
    if (imgs.length) return imgs;
    const em = [...new Set(list.map((p) => p.emoji).filter((e) => e && e !== "📦"))].slice(0, 3);
    return (em.length ? em : [fallback]).map((e) => ({ emoji: e }));
  };
  const slides = [{
    eyebrow: "Big Saving Days", title: `Up to ${maxOff(PRODUCTS)}% off`, text: "Electronics, fashion, home and much more — all in one place",
    cta: "Shop by category", href: "#cat-tiles", bg: "radial-gradient(circle at 75% 30%, #3a1290 0%, #1e0b3d 70%)", art: artOf(PRODUCTS, "🛍️"), glow: true,
  }];
  [
    ["Fashion", "Fashion Fest", "Fresh styles in clothing, shoes and bags"],
    ["Electronics", "Electronics Week", "Headphones, smart watches and gadgets"],
    ["Home", "Home Makeover", "Kitchen, decor and lighting for every room"],
    ["Beauty", "Glow Up Sale", "Skincare, makeup and fragrances you'll love"],
    ["Sports", "Fit India Sale", "Gear for cricket, football, yoga and the gym"],
  ].forEach(([name, eyebrow, text]) => {
    const c = CATEGORIES.find((x) => x.name === name);
    const items = productsOf(name);
    if (!c || !items.length) return;
    const off = maxOff(items);
    slides.push({ eyebrow, title: off ? `Up to ${off}% off` : `${items.length} products`, text, cta: `Shop ${name} →`, href: categoryUrl(c), bg: c.gradient, art: artOf(items, c.emoji) });
  });
  if (BRAND_STORES.length) {
    slides.push({
      eyebrow: "Brand Stores", title: "Shop official brand stores", text: `${BRAND_STORES.slice(0, 3).map((s) => s.name).join(" · ")} and more`,
      cta: "Explore stores →", href: "#brand-stores", bg: `linear-gradient(120deg, #120a26, ${storeTheme(BRAND_STORES[0])})`, stores: BRAND_STORES.slice(0, 3),
    });
  }
  slides.push({
    eyebrow: "Zzapkart Seller Hub", title: "Grow your business online", text: "Listings, orders, payments and ads — all from one dashboard",
    cta: "Start selling →", href: "seller.html", bg: "linear-gradient(120deg, #ff8a5c, #ff2d95)", art: [{ emoji: "🏪" }, { emoji: "📦" }, { emoji: "💰" }],
  });
  return slides;
}

const HERO_SLIDES = heroSlides();
const heroArt = (s) => s.stores
  ? s.stores.map((st) => `<span class="hh-bubble hh-logo">${safeImg(st.logo) ? `<img src="${safeImg(st.logo)}" alt="" />` : esc(storeInitials(st.name))}</span>`).join("")
  : s.art.map((a) => `<span class="hh-bubble${a.img ? " hh-photo" : ""}">${a.img ? `<img src="${a.img}" alt="" />` : a.emoji}</span>`).join("");
hero.innerHTML = `
  <div class="hh-viewport">
    <div class="hh-track">
      ${HERO_SLIDES.map((s, i) => `
        <div class="hh-slide car-slide ${i === 0 ? "active" : ""}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${HERO_SLIDES.length}: ${esc(s.eyebrow)}" style="--hh-bg:${esc(s.bg)}">
          <div class="hh-text">
            <span class="hh-eyebrow">${esc(s.eyebrow)}</span>
            <h2 class="hh-title${s.glow ? " glow" : ""}">${esc(s.title)}</h2>
            <p class="hh-sub">${esc(s.text)}</p>
            <a class="hh-cta" href="${esc(s.href)}">${esc(s.cta)}</a>
          </div>
          <div class="hh-art" aria-hidden="true">${heroArt(s)}</div>
        </div>`).join("")}
    </div>
  </div>
  <button type="button" class="hh-arrow car-prev" aria-label="Previous banner">‹</button>
  <button type="button" class="hh-arrow car-next" aria-label="Next banner">›</button>
  <div class="hh-controls">
    <div class="hh-dots">${HERO_SLIDES.map((s, i) => `<button type="button" data-dot="${i}" aria-label="Banner ${i + 1}: ${esc(s.eyebrow)}"></button>`).join("")}</div>
  </div>
  <div class="hh-progress" aria-hidden="true"><span></span></div>`;
const heroTrack = hero.querySelector(".hh-track");
startCarousel(hero, { interval: 4500, onShow: (i) => { heroTrack.style.transform = `translateX(-${i * 100}%)`; } });

// ---------- Promises strip ----------
document.getElementById("promises").innerHTML = `
  <div class="promise"><span>🚚</span><div><strong>Free delivery</strong><small>On orders above ${formatPrice(FREE_DELIVERY_MIN)}</small></div></div>
  <div class="promise"><span>↩️</span><div><strong>Easy returns</strong><small>7-day returns on most items</small></div></div>
  <div class="promise"><span>🔒</span><div><strong>Secure payments</strong><small>UPI, cards and cash on delivery</small></div></div>
  <div class="promise"><span>✅</span><div><strong>Verified sellers</strong><small>Every seller is KYC checked</small></div></div>`;

// ---------- Deals of the day ----------
const deals = PRODUCTS.filter((p) => inStock(p) && discount(p) >= 30).sort((a, b) => discount(b) - discount(a)).slice(0, 10);
const dealsEl = document.getElementById("deals");
if (deals.length) {
  dealsEl.innerHTML = `
    <section class="home-sec deals-sec">
      <div class="section-head">
        <div><h2 class="section-title">⚡ Deals of the Day</h2><p class="section-sub">Biggest discounts right now — while stocks last</p></div>
        <a href="browse.html" class="link">See all →</a>
      </div>
      <div class="scroll-row">${deals.map((p) => productCard(p)).join("")}</div>
    </section>`;
  enableAddToCart(dealsEl);
}

// ---------- Reels ----------
if (typeof renderReelsStrip === "function") renderReelsStrip(document.getElementById("reels"));

// ---------- Sponsored (seller ads) ----------
const sponsoredEl = document.getElementById("sponsored");
// Opened with a search (?q=) → home ads stay hidden, so don't run their auction / count impressions
const openedWithSearch = !!new URLSearchParams(location.search).get("q");
const homeSlots = openedWithSearch ? [] : runAuction({ placement: "home" }, 4);
if (homeSlots.length) {
  sponsoredEl.innerHTML = `
    <section class="home-sec sponsored-section">
      <div class="section-head">
        <div><h2 class="section-title">Sponsored Products</h2><p class="section-sub">Promoted by our sellers</p></div>
      </div>
      <div class="grid">${sponsoredCards(homeSlots)}</div>
    </section>`;
  trackSlotsShown(homeSlots);
}
enableAddToCart(sponsoredEl);

// ---------- One section per category ----------
const sectionsEl = document.getElementById("category-sections");
sectionsEl.innerHTML = CATEGORIES.map((c) => {
  const items = productsOf(c.name);
  if (items.length === 0) return "";
  return `
    <section class="home-sec">
      <div class="section-head">
        <div><h2 class="section-title">${c.emoji} ${c.name}</h2><p class="section-sub">${esc(c.tagline)}</p></div>
        <a href="${categoryUrl(c)}" class="link">View all ${items.length} →</a>
      </div>
      <div class="grid">${items.slice(0, SECTION_LIMIT).map((p) => productCard(p)).join("")}</div>
    </section>`;
}).join("");
enableAddToCart(sectionsEl);

// ---------- Search ----------
const searchGrid = document.getElementById("search-grid");
const searchBrand = document.getElementById("search-brand");
enableAddToCart(searchGrid);

function runSearch() {
  const raw = searchInput.value.trim();
  const q = raw.toLowerCase();
  const searching = q.length > 0;

  browseView.classList.toggle("hidden", searching);
  hero.classList.toggle("hidden", searching);
  document.getElementById("promises").classList.toggle("hidden", searching);
  searchView.classList.toggle("hidden", !searching);
  if (!searching) return;

  // Every word must match the name / brand / category / description ("summer shirt" → both words)
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

  // Searching for a store name → show that store first
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
  document.getElementById("result-info").textContent = `${total} result${total === 1 ? "" : "s"} for "${raw}"`;
}

// Search after typing pauses (not on every key — keeps ad impressions accurate)
let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(runSearch, 350);
});
// Enter or the search icon: search right away
document.getElementById("home-search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  clearTimeout(searchTimer);
  if (!searchInput.value.trim()) { searchInput.focus(); return; }
  runSearch();
});

// Came from another page with a search (?q=...)
const initialQ = new URLSearchParams(location.search).get("q");
if (initialQ) searchInput.value = initialQ;
runSearch();
