// =====================================================================
// Brand Store — a seller's own online store inside Zzapkart
//   store.html?s=<slug>    → published store (Premium seller)
//   store.html?preview=1   → the logged-in seller's draft (Preview from the editor)
// Pages (hash): #home  #shop  #c/<collection>  #p/<product>  #about  #search/<q>
// Cart, checkout and order history are shared with Zzapkart (one cart, one account).
// =====================================================================
const shRoot = document.getElementById("shop");
const shParams = new URLSearchParams(location.search);
const shViewer = currentSeller();
let shSeller = null, shCfg = null, shPreview = false;

if (shParams.get("preview") === "1" && shViewer && shViewer.store && shViewer.store.draft) {
  shSeller = shViewer;
  shCfg = shViewer.store.draft;
  shPreview = true;
} else {
  shSeller = sellerByStoreSlug(shParams.get("s"));
  shCfg = storeIsActive(shSeller) ? shSeller.store.live : null;
}

const SH_ICON = {
  search: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  user: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  bag: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M5 8h14l-1.2 12.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  close: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
};
const SH_SORTS = {
  featured: "Featured", new: "Newest", "price-asc": "Price: Low to High", "price-desc": "Price: High to Low", discount: "Biggest discount",
};
const SH_PRICES = { "": "Any price", "0-499": "Under ₹499", "500-999": "₹500 – ₹999", "1000-1999": "₹1,000 – ₹1,999", "2000-": "₹2,000 and above" };

// Store data (filled in by renderStore)
let shItems = [], shById = new Map(), shFeatured = [], shColls = [], shNewest = [], shNewIds = new Set();
let shDesign = null, shPages = [];
let shCar = null;
let shFilter = { cats: new Set(), price: "", stock: false, sort: "featured" };

// ---------------------------------------------------------------------
function shUnavailable() {
  document.title = "Store – Zzapkart";
  shRoot.innerHTML = `
    <header class="sh-mini-head"><a href="index.html"><img src="images/logo-full.png" alt="Zzapkart" /></a></header>
    <main class="sh-wrap"><div class="empty sh-missing">
      <div class="empty-emoji">🏬</div>
      <h1>${shSeller ? "This store isn't available right now" : "Store not found"}</h1>
      <p>${shSeller ? "The seller has closed this store for now. Please check back later." : "Check the link, or search for products on Zzapkart."}</p>
      <a href="index.html" class="btn">Zzapkart Home</a>
    </div></main>`;
}

const shLogo = (cls = "") => safeImg(shCfg.logo)
  ? `<span class="sh-logo ${cls}"><img src="${safeImg(shCfg.logo)}" alt="${esc(shCfg.name)} logo" /></span>`
  : `<span class="sh-logo ${cls}"><span>${esc(storeInitials(shCfg.name))}</span></span>`;
const shReturns = () => STORE_RETURNS[shCfg.returnDays] || STORE_RETURNS[7];
const shCatOf = (p) => p.verticalName || p.catName || p.category || "";
const shAvgSla = () => {
  const s = shItems.map((p) => Number(p.sla) || 2);
  return s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : 2;
};

const shPageLink = (pg, cls = "") => `<a href="#page/${esc(pg.slug)}" ${cls ? `class="${cls}"` : ""} data-nav="page-${esc(pg.slug)}">${esc(pg.title)}</a>`;

function renderStore() {
  const cfg = shCfg;
  // The seller's design: colour, font, buttons, grid (CSS variables on body — overrides the .shop-body default)
  shDesign = storeDesign(cfg);
  applyStoreVars(document.body, cfg);
  document.body.classList.add("sh-head-" + shDesign.header);
  const seen = new Set();
  shPages = (cfg.pages || [])
    .filter((pg) => String(pg.title || "").trim() && String(pg.body || "").trim())
    .map((pg) => ({ ...pg, title: String(pg.title).trim(), slug: storePageSlug(pg) }))
    .filter((pg) => !seen.has(pg.slug) && seen.add(pg.slug));
  const menuPages = shPages.filter((pg) => pg.menu).slice(0, 3);
  if (!shPreview && !(shViewer && shViewer.id === shSeller.id)) trackStoreVisit(shSeller.id);

  shItems = PRODUCTS.filter((p) => p.sellerId === shSeller.id);
  shById = new Map(shItems.map((p) => [p.id, p]));
  const pick = (ids) => (ids || []).map((id) => shById.get(id)).filter(Boolean);
  shFeatured = pick(cfg.featured);
  shColls = (cfg.collections || []).map((c) => ({ ...c, items: pick(c.productIds) })).filter((c) => c.items.length);
  shNewest = [...shItems].sort((a, b) => b.id - a.id);
  shNewIds = new Set(shNewest.filter(inStock).slice(0, 4).map((p) => p.id));

  const customer = currentCustomer();
  shRoot.innerHTML = `
    <a class="sh-skip" href="#sh-view">Skip to content</a>
    ${shPreview ? `<div class="sh-preview">👁 <strong>Preview</strong> — this is your draft. Shoppers see ${shSeller.store.published ? "the published version" : "the store once you publish it"}. <a href="seller-dashboard.html#store">← Back to the editor</a></div>` : ""}
    <div class="sh-powered"><div class="sh-wrap"><span>🛍️ Official <strong>${esc(cfg.name)}</strong> store · Safe payments &amp; easy returns with Zzapkart</span><a href="index.html">Shop more on Zzapkart →</a></div></div>
    ${shDesign.announceOn ? `<div class="sh-announce"><div class="sh-wrap">${shDesign.announce.trim()
      ? esc(shDesign.announce.trim())
      : `🚚 FREE delivery over ₹${FREE_DELIVERY_MIN} <i>·</i> ↩️ ${esc(shReturns())} <i>·</i> 💵 Cash on Delivery available`}</div></div>` : ""}
    <header class="sh-header" id="sh-header">
      <div class="sh-wrap sh-header-in">
        <button type="button" class="sh-icon sh-menu-btn" id="sh-menu-btn" aria-label="Open menu" aria-controls="sh-menu" aria-expanded="false">${SH_ICON.menu}</button>
        <a href="#home" class="sh-brand">${shLogo()}<span class="sh-brand-name">${esc(cfg.name)}</span></a>
        <nav class="sh-nav" aria-label="Store menu">
          <a href="#home" data-nav="home">Home</a>
          <a href="#shop" data-nav="shop">Shop all</a>
          ${shColls.length ? `<div class="sh-dd" id="sh-dd">
            <button type="button" class="sh-dd-btn" data-nav="coll" aria-haspopup="true" aria-expanded="false">Collections <span aria-hidden="true">▾</span></button>
            <div class="sh-dd-menu">${shColls.map((c) => `<a href="#c/${esc(c.id)}">${esc(c.name)} <small>${c.items.length}</small></a>`).join("")}</div>
          </div>` : ""}
          <a href="#about" data-nav="about">About</a>
          ${menuPages.map((pg) => shPageLink(pg)).join("")}
        </nav>
        <div class="sh-actions">
          <button type="button" class="sh-icon" id="sh-search-btn" aria-label="Search" aria-controls="sh-searchbar" aria-expanded="false">${SH_ICON.search}</button>
          <a class="sh-icon" href="${customer ? "account.html" : "account.html?next=" + encodeURIComponent("store.html" + location.search)}" aria-label="${customer ? "My account" : "Login"}" title="${customer ? "Hi, " + esc(customer.name.split(" ")[0]) : "Login / Sign up"}">${SH_ICON.user}</a>
          <button type="button" class="sh-icon sh-cart-btn" id="sh-cart-btn" aria-label="Open cart" aria-controls="sh-cart">${SH_ICON.bag}<span class="sh-cart-count" id="cart-count">0</span></button>
        </div>
      </div>
      <div class="sh-searchbar hidden" id="sh-searchbar">
        <form class="sh-wrap sh-search-form" id="sh-search-form" role="search">
          <input type="search" name="q" placeholder="Search in ${esc(cfg.name)}" aria-label="Search in ${esc(cfg.name)}" autocomplete="off" />
          <button type="submit" class="btn sh-btn">Search</button>
          <button type="button" class="sh-icon" id="sh-search-close" aria-label="Close search">${SH_ICON.close}</button>
        </form>
        <div class="sh-wrap sh-suggest" id="sh-suggest"></div>
      </div>
    </header>

    <main class="sh-main" id="sh-view" tabindex="-1"></main>

    <footer class="sh-footer">
      <div class="sh-wrap sh-foot-grid">
        <div class="sh-foot-brand">${shLogo("small")}<strong>${esc(cfg.name)}</strong>
          <p>${esc(cfg.tagline || (cfg.about || "").slice(0, 120) || "Official brand store on Zzapkart")}</p></div>
        <div><h4>Shop</h4><a href="#shop">All products</a>${shColls.map((c) => `<a href="#c/${esc(c.id)}">${esc(c.name)}</a>`).join("")}</div>
        <div><h4>Help &amp; policies</h4>${shPages.length ? shPages.map((pg) => shPageLink(pg)).join("") : `<a href="#about">Shipping &amp; delivery</a><a href="#about">Returns — ${esc(shReturns())}</a>`}<a href="account.html#orders">Track your order</a><a href="account.html">My account</a></div>
        <div><h4>Newsletter</h4><p>Be the first to hear about new products and offers.</p>
          <form class="sh-news-form" data-news="1" novalidate><input type="email" name="email" placeholder="Email address" aria-label="Email address" autocomplete="email" /><button type="submit" class="btn sh-btn">Subscribe</button></form></div>
      </div>
      <div class="sh-wrap sh-foot-bottom">
        <span>© ${new Date().getFullYear()} ${esc(cfg.name)} · Sold by ${esc(shSeller.shopName)} (KYC verified)</span>
        <span>Powered by <a href="index.html">Zzapkart</a> · UPI · Cards · COD</span>
      </div>
    </footer>

    <div class="sh-overlay hidden" id="sh-overlay"></div>
    <aside class="sh-drawer sh-cart-drawer" id="sh-cart" role="dialog" aria-modal="true" aria-label="Shopping cart" aria-hidden="true"></aside>
    <aside class="sh-drawer sh-menu-drawer" id="sh-menu" role="dialog" aria-modal="true" aria-label="Menu" aria-hidden="true">
      <div class="sh-drawer-head"><strong>${esc(cfg.name)}</strong><button type="button" class="sh-icon" data-close="1" aria-label="Close menu">${SH_ICON.close}</button></div>
      <nav class="sh-menu-links">
        <a href="#home">Home</a><a href="#shop">Shop all</a>
        ${shColls.map((c) => `<a href="#c/${esc(c.id)}" class="sub">${esc(c.name)}</a>`).join("")}
        <a href="#about">About</a>${shPages.map((pg) => shPageLink(pg, "sub")).join("")}<a href="account.html#orders">Track order</a><a href="account.html">My account</a><a href="index.html">← Zzapkart home</a>
      </nav>
    </aside>
    <div class="sh-modal hidden" id="sh-modal" role="dialog" aria-modal="true"><div class="sh-modal-box" id="sh-modal-box"></div></div>`;

  updateCartBadge();
  shWire();
  window.addEventListener("hashchange", shRoute);
  shRoute(true);
}

// ---------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------
function shCard(p) {
  trackView(p.id);
  const off = discount(p);
  const out = !inStock(p);
  return `<div class="sh-card">
    <div class="sh-card-media">
      <a href="#p/${p.id}" class="sh-card-img" style="background:${esc(p.color)}" tabindex="-1" aria-hidden="true">${productThumb(p)}</a>
      <div class="sh-badges">${out ? `<span class="sh-badge sold">Sold out</span>` : off ? `<span class="sh-badge sale">-${off}%</span>` : ""}${!out && shNewIds.has(p.id) ? `<span class="sh-badge new">New</span>` : ""}${p.video ? `<span class="sh-badge vid">▶ Video</span>` : ""}</div>
      ${out ? "" : `<button type="button" class="sh-quick" data-quick="${p.id}">${p.hasSizes ? "Choose size" : "+ Quick add"}</button>`}
    </div>
    <div class="sh-card-body">
      ${p.brand ? `<span class="sh-vendor">${esc(p.brand)}</span>` : ""}
      <a href="#p/${p.id}" class="sh-card-title">${esc(p.name)}</a>
      <div class="sh-price"><span class="now">${formatPrice(p.price)}</span>${off ? `<s>${formatPrice(p.mrp)}</s>` : ""}</div>
    </div>
  </div>`;
}
const shGrid = (list) => `<div class="sh-grid">${list.map(shCard).join("")}</div>`;
const shSection = (title, list, limit, href) => `
  <section class="sh-section sh-wrap">
    <div class="sh-sec-head"><h2>${title}</h2>${href && list.length > limit ? `<a class="sh-link" href="${href}">View all (${list.length}) →</a>` : ""}</div>
    ${shGrid(list.slice(0, limit))}
  </section>`;
const shEmpty = (msg, cta = true) => `<div class="sh-empty"><div class="empty-emoji">🛍️</div><p>${msg}</p>${cta ? `<a href="#shop" class="btn sh-btn">Shop all</a>` : ""}</div>`;
const shCrumbs = (...parts) => `<nav class="sh-crumbs" aria-label="Breadcrumb"><a href="#home">Home</a>${parts.map((x) => ` <span>/</span> ${x}`).join("")}</nav>`;
const shSortSelect = () => `<label class="sh-sort">Sort by <select id="sh-sort">${Object.entries(SH_SORTS).map(([k, l]) => `<option value="${k}" ${shFilter.sort === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
function shSorted(list, keepOrder) {
  const fi = (p) => (shCfg.featured || []).indexOf(p.id);
  const by = {
    featured: keepOrder ? () => 0 : (a, b) => (inStock(b) - inStock(a)) || ((fi(a) < 0) - (fi(b) < 0)) || (fi(a) - fi(b)) || (b.id - a.id),
    new: (a, b) => b.id - a.id,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    discount: (a, b) => discount(b) - discount(a),
  };
  return [...list].sort(by[shFilter.sort] || by.featured);
}

function shBannerHref(b) {
  const link = String(b.link || "");
  if (!link || link === "none") return "";
  if (link.startsWith("c:")) return shColls.some((c) => c.id === link.slice(2)) ? "#c/" + link.slice(2) : "#shop";
  if (link.startsWith("p:")) return shById.has(Number(link.slice(2))) ? "#p/" + link.slice(2) : "#shop";
  if (link.startsWith("pg:")) { const pg = shPages.find((x) => x.id === link.slice(3)); return pg ? "#page/" + pg.slug : "#shop"; }
  return "#shop";
}
function shHero() {
  const bs = shCfg.banners || [];
  if (!bs.length) {
    return `<section class="sh-hero-text"><div class="sh-wrap sh-hero-in">
      <div><span class="sh-eyebrow">Official store</span><h1>${esc(shCfg.name)}</h1>${shCfg.tagline ? `<p>${esc(shCfg.tagline)}</p>` : ""}<a class="btn sh-btn sh-btn-lg" href="#shop">Shop now →</a></div>
      ${shLogo("hero")}
    </div></section>`;
  }
  return `<h1 class="visually-hidden">${esc(shCfg.name)}</h1>
  <section class="sh-wrap sh-hero"><div class="bs-hero" id="bs-hero" aria-roledescription="carousel" aria-label="${esc(shCfg.name)} banners">
    <div class="bs-slides">
      ${bs.map((b, i) => {
        const href = shBannerHref(b);
        const tag = href ? "a" : "div";
        const text = b.headline || b.sub || (href && b.cta);
        return `<${tag} class="bs-slide tone-${b.tone === "dark" ? "dark" : "light"} ${i === 0 ? "active" : ""}" ${href ? `href="${esc(href)}"` : ""} data-i="${i}">
          <img data-banner-img="${esc(b.id)}" ${safeImg(b.src) ? `src="${safeImg(b.src)}"` : ""} alt="${esc(b.headline || shCfg.name + " banner")}" />
          ${text ? `<div class="bs-slide-text">${b.headline ? `<h2>${esc(b.headline)}</h2>` : ""}${b.sub ? `<p>${esc(b.sub)}</p>` : ""}${href && b.cta ? `<span class="bs-cta">${esc(b.cta)}</span>` : ""}</div>` : ""}
        </${tag}>`;
      }).join("")}
    </div>
    ${bs.length > 1 ? `
      <button type="button" class="bs-arrow prev" aria-label="Previous banner">‹</button>
      <button type="button" class="bs-arrow next" aria-label="Next banner">›</button>
      <div class="bs-dots">${bs.map((_, i) => `<button type="button" class="${i === 0 ? "active" : ""}" data-dot="${i}" aria-label="Banner ${i + 1}"></button>`).join("")}</div>` : ""}
  </div></section>`;
}
function shStartHero() {
  if (shCar) shCar.stop();
  shCar = null;
  const hero = document.getElementById("bs-hero");
  if (!hero) return;
  hero.querySelectorAll("img[data-banner-img]").forEach((img) => {
    MediaDB.get(storeBannerKey(img.dataset.bannerImg)).then((data) => { if (safeImg(data)) img.src = data; });
  });
  shCar = startCarousel(hero, { slide: ".bs-slide", prev: ".bs-arrow.prev", next: ".bs-arrow.next", interval: 5000 });
}
const shTrust = () => `
  <section class="sh-trust sh-wrap" aria-label="Store promises">
    <div><span>🚚</span><strong>Fast dispatch</strong><small>Ships in ${shAvgSla()} day(s)</small></div>
    <div><span>↩️</span><strong>${esc(shReturns())}</strong><small>Return policy</small></div>
    <div><span>💳</span><strong>Secure payments</strong><small>UPI · Cards · COD</small></div>
    <div><span>✅</span><strong>Verified seller</strong><small>KYC by Zzapkart</small></div>
  </section>`;
function shCollCard(c) {
  const t = c.items.slice(0, 4);
  return `<a class="sh-coll-card" href="#c/${esc(c.id)}">
    <span class="sh-mosaic n${t.length}">${t.map((p) => `<span style="background:${esc(p.color)}">${productThumb(p)}</span>`).join("")}</span>
    <span class="sh-coll-info"><strong>${esc(c.name)}</strong><small>${c.items.length} product${c.items.length === 1 ? "" : "s"}</small><em>Shop now →</em></span>
  </a>`;
}
const shNewsBand = () => `
  <section class="sh-news"><div class="sh-wrap sh-news-in">
    <div><h2>Get offers first</h2><p>New drops, sales and exclusive deals — straight to your inbox.</p></div>
    <form class="sh-news-form" data-news="1" novalidate><input type="email" name="email" placeholder="Enter your email" aria-label="Email address" autocomplete="email" /><button type="submit" class="btn sh-btn-dark">Subscribe</button></form>
  </div></section>`;

// ---------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------
const shView = () => document.getElementById("sh-view");

function shHome() {
  document.title = `${shCfg.name} – Official Store`;
  const fresh = shNewest.filter(inStock);
  const per = Math.max(4, shDesign.cols); // fill a whole row
  const html = [shHero()];
  const blocks = {
    trust: () => html.push(shTrust()),
    collections: () => { if (shColls.length) html.push(`<section class="sh-section sh-wrap"><div class="sh-sec-head"><h2>Shop by collection</h2></div><div class="sh-coll-grid">${shColls.map(shCollCard).join("")}</div></section>`); },
    featured: () => { if (shFeatured.length) html.push(shSection("Featured products", shFeatured, per * 2, "#shop")); },
    collrows: () => shColls.forEach((c) => html.push(shSection(esc(c.name), c.items, per, "#c/" + c.id))),
    new: () => { if (fresh.length) html.push(shSection("New arrivals", fresh, per, "#shop")); },
    story: () => {
      if (!shCfg.about && !shCfg.tagline) return;
      const story = shCfg.about ? (shCfg.about.length > 260 ? shCfg.about.slice(0, 260).trimEnd() + "…" : shCfg.about) : shCfg.tagline;
      html.push(`<section class="sh-story sh-wrap">${shLogo("story")}<div><span class="sh-eyebrow">Our story</span><h2>About ${esc(shCfg.name)}</h2><p>${esc(story)}</p><a class="sh-link" href="#about">Read more →</a></div></section>`);
    },
    news: () => html.push(shNewsBand()),
  };
  const on = shDesign.sections.filter((s) => s.on);
  on.forEach((s) => blocks[s.k]());
  // No product section visible (hidden / empty) — show products right below the banner
  const shows = { featured: shFeatured.length > 0, collrows: shColls.length > 0, new: fresh.length > 0 };
  if (!on.some((s) => shows[s.k])) {
    html.splice(1, 0, shItems.length ? shSection("Products", shItems, per * 2, "#shop")
      : `<section class="sh-wrap">${shEmpty("There are no products in this store yet. Check back soon!", false)}</section>`);
  }
  shView().innerHTML = html.join("");
  shStartHero();
}

function shPage(pg) {
  document.title = `${pg.title} – ${shCfg.name}`;
  const others = shPages.filter((x) => x.slug !== pg.slug);
  shView().innerHTML = `
  <div class="sh-wrap sh-page sh-doc">
    ${shCrumbs(`<span>${esc(pg.title)}</span>`)}
    <h1>${esc(pg.title)}</h1>
    <article class="sh-rich">${storeRichText(pg.body)}</article>
    ${others.length ? `<nav class="sh-doc-more" aria-label="More pages"><h2>More from ${esc(shCfg.name)}</h2>${others.map((x) => shPageLink(x, "sh-link")).join("")}<a href="#about" class="sh-link">About</a></nav>` : ""}
  </div>`;
}

function shShop() {
  document.title = `Shop all – ${shCfg.name}`;
  const cats = [...new Set(shItems.map(shCatOf).filter(Boolean))].sort();
  const [lo, hi] = shFilter.price ? shFilter.price.split("-").map((x) => (x === "" ? Infinity : Number(x))) : [0, Infinity];
  const list = shSorted(shItems
    .filter((p) => !shFilter.cats.size || shFilter.cats.has(shCatOf(p)))
    .filter((p) => !shFilter.price || (p.price >= lo && p.price <= hi))
    .filter((p) => !shFilter.stock || inStock(p)));
  const active = shFilter.cats.size + (shFilter.price ? 1 : 0) + (shFilter.stock ? 1 : 0);
  shView().innerHTML = `
  <div class="sh-wrap sh-page">
    ${shCrumbs("<span>Shop all</span>")}
    <div class="sh-page-head"><h1>Shop all</h1><p class="muted">${list.length} of ${shItems.length} products</p></div>
    <div class="sh-shop">
      <aside class="sh-filters" id="sh-filters" aria-label="Filters">
        <div class="sh-filter-head"><strong>Filters</strong>${active ? `<button type="button" class="link-btn" data-fclear="1">Clear all</button>` : ""}</div>
        ${cats.length > 1 ? `<fieldset><legend>Category</legend>${cats.map((c) => `<label class="check"><input type="checkbox" data-fcat="${esc(c)}" ${shFilter.cats.has(c) ? "checked" : ""} /> ${esc(c)} <small>(${shItems.filter((p) => shCatOf(p) === c).length})</small></label>`).join("")}</fieldset>` : ""}
        <fieldset><legend>Price</legend>${Object.entries(SH_PRICES).map(([k, l]) => `<label class="check"><input type="radio" name="sh-price" data-fprice="${k}" ${shFilter.price === k ? "checked" : ""} /> ${l}</label>`).join("")}</fieldset>
        <fieldset><legend>Availability</legend><label class="check"><input type="checkbox" data-fstock="1" ${shFilter.stock ? "checked" : ""} /> In stock only</label></fieldset>
      </aside>
      <div class="sh-results">
        <div class="sh-toolbar"><button type="button" class="btn btn-outline btn-sm sh-filter-toggle" data-ftoggle="1" aria-controls="sh-filters">⚙ Filters${active ? ` (${active})` : ""}</button>${shSortSelect()}</div>
        ${list.length ? shGrid(list) : shEmpty("No products match these filters.", false)}
      </div>
    </div>
  </div>`;
}

function shCollection(c) {
  document.title = `${c.name} – ${shCfg.name}`;
  shView().innerHTML = `
  <div class="sh-coll-hero"><div class="sh-wrap">${shCrumbs("<span>Collections</span>", `<span>${esc(c.name)}</span>`)}<h1>${esc(c.name)}</h1><p>${c.items.length} product${c.items.length === 1 ? "" : "s"}</p></div></div>
  <div class="sh-wrap sh-page">
    <div class="sh-toolbar"><span class="muted">${c.items.length} products</span>${shSortSelect()}</div>
    ${shGrid(shSorted(c.items, true))}
  </div>`;
}

function shSearch(q) {
  document.title = `Search: ${q} – ${shCfg.name}`;
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const list = shItems.filter((p) => {
    const hay = `${p.name} ${p.brand || ""} ${p.catName || ""} ${p.verticalName || ""} ${p.keywords || ""} ${p.description || ""}`.toLowerCase();
    return terms.every((w) => hay.includes(w) || (w.length > 3 && w.endsWith("s") && hay.includes(w.slice(0, -1))));
  });
  shView().innerHTML = `
  <div class="sh-wrap sh-page">
    ${shCrumbs("<span>Search</span>")}
    <div class="sh-page-head"><h1>"${esc(q)}"</h1><p class="muted">${list.length} result(s) in ${esc(shCfg.name)} · <a class="sh-link" href="index.html?q=${encodeURIComponent(q)}">Search all of Zzapkart →</a></p></div>
    ${list.length ? shGrid(list) : shEmpty("We couldn't find that in this store.")}
  </div>`;
}

function shAbout() {
  document.title = `About – ${shCfg.name}`;
  shView().innerHTML = `
  <div class="sh-about-hero"><div class="sh-wrap">${shLogo("hero")}<div><h1>About ${esc(shCfg.name)}</h1>${shCfg.tagline ? `<p>${esc(shCfg.tagline)}</p>` : ""}</div></div></div>
  <div class="sh-wrap sh-page sh-about">
    ${shCfg.about ? `<p class="sh-about-text">${esc(shCfg.about)}</p>` : `<p class="muted">The seller hasn't added a store description yet.</p>`}
    <h2>Store policies</h2>
    <div class="sh-policy">
      <div id="shipping"><span>🚚</span><strong>Shipping &amp; delivery</strong><p>Orders are dispatched within ${shAvgSla()} day(s). Delivery is FREE on orders of ₹${FREE_DELIVERY_MIN}+, otherwise ₹40. Express delivery is available at checkout.</p></div>
      <div><span>↩️</span><strong>${esc(shReturns())}</strong><p>${Number(shCfg.returnDays) ? `Request a return from My Orders within ${Number(shCfg.returnDays)} days of delivery.` : "Products from this store can't be returned — damaged or wrong items are replaced."}</p></div>
      <div><span>💳</span><strong>Payments</strong><p>UPI, cards and cash on delivery — every payment goes through Zzapkart's secure checkout.</p></div>
      <div><span>✅</span><strong>Verified seller</strong><p>Sold by ${esc(shSeller.shopName)} · KYC verified by Zzapkart · Selling on Zzapkart since ${fmtDate(shSeller.createdAt || Date.now())}.</p></div>
    </div>
    ${shPages.length ? `<h2>Policies &amp; info</h2><div class="sh-doc-links">${shPages.map((pg) => shPageLink(pg, "sh-link")).join("")}</div>` : ""}
    <h2>Contact</h2>
    <p>For help with an order, open it in <a class="sh-link" href="account.html#orders">My Orders</a> — Zzapkart support will help you.</p>
  </div>`;
}

function shProduct(p) {
  document.title = `${p.name} – ${shCfg.name}`;
  trackView(p.id);
  const tpl = p.template ? TEMPLATES[p.template] : null;
  const off = discount(p);
  const sized = !!p.hasSizes;
  let variant = !sized && p.variants && p.variants.length === 1 ? p.variants[0] : null;
  let qty = 1;
  const coll = shColls.find((c) => c.items.some((x) => x.id === p.id));
  const deliver = new Date(Date.now() + ((p.sla || 2) + 2) * DAY).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const hasChart = sized && tpl && tpl.sizeChart && Object.keys(p.sizeChart || {}).length > 0;
  const specs = [];
  if (p.brand) specs.push(["Brand", p.brand]);
  if (p.verticalName) specs.push(["Type", p.verticalName]);
  if (tpl) tpl.req.concat(tpl.good).forEach((a) => {
    const v = p.attrs && p.attrs[a.k];
    if (v !== undefined && v !== null && String(v).trim() !== "" && v !== "N/A") specs.push([a.l, v]);
  });
  if (p.countryOfOrigin) specs.push(["Country of Origin", p.countryOfOrigin]);
  const party = (x) => (x && x.name ? `${esc(x.name)}, ${esc(x.address)} – ${esc(x.pincode)}` : "—");
  const related = (coll ? coll.items : shItems.filter((x) => shCatOf(x) === shCatOf(p))).filter((x) => x.id !== p.id);
  const more = related.concat(shItems.filter((x) => x.id !== p.id && !related.includes(x))).slice(0, 4);

  shView().innerHTML = `
  <div class="sh-wrap sh-page">
    ${shCrumbs(coll ? `<a href="#c/${esc(coll.id)}">${esc(coll.name)}</a>` : `<a href="#shop">Shop all</a>`, `<span>${esc(p.name)}</span>`)}
    <div class="sh-pdp">
      <div class="sh-gallery"><div class="sh-thumbs" id="sh-thumbs"></div><div class="sh-main-img" id="sh-main-img" style="background:${esc(p.color)}">${productThumb(p)}</div></div>
      <div class="sh-info">
        ${p.brand ? `<span class="sh-vendor">${esc(p.brand)}</span>` : ""}
        <h1>${esc(p.name)}</h1>
        <div class="sh-price big"><span class="now">${formatPrice(p.price)}</span>${off ? `<s>${formatPrice(p.mrp)}</s><span class="sh-badge sale">-${off}%</span>` : ""}</div>
        <p class="muted small">Inclusive of all taxes · delivery calculated at checkout</p>
        ${sized ? `<div class="sh-opt"><div class="sh-opt-head"><strong>Size</strong>${hasChart ? `<button type="button" class="link-btn" id="sh-chart-btn">📏 Size chart</button>` : ""}</div>
          <div class="sh-sizes" id="sh-sizes">${p.variants.map((v) => `<button type="button" class="sh-size" data-vid="${esc(v.id)}" ${v.stock > 0 ? "" : "disabled"} aria-pressed="false" title="${v.stock > 0 ? esc(v.size) : "Out of stock"}">${esc(v.size)}</button>`).join("")}</div></div>` : ""}
        <div class="sh-opt"><strong>Quantity</strong><div class="sh-qty"><button type="button" data-q="-1" aria-label="Decrease quantity">−</button><span id="sh-qty-val" aria-live="polite">1</span><button type="button" data-q="1" aria-label="Increase quantity">+</button></div></div>
        <p class="sh-stock" id="sh-stock"></p>
        <div class="sh-buy"><button type="button" class="btn sh-btn" id="sh-add">Add to cart</button><button type="button" class="btn sh-btn-dark" id="sh-buynow">Buy it now</button></div>
        <ul class="sh-perks">
          <li>🚚 Dispatched in ${p.sla || 2} day(s) · delivery by <strong>${deliver}</strong></li>
          <li>↩️ ${esc(shReturns())}</li><li>💵 Cash on Delivery available</li><li>🔒 Secure checkout by Zzapkart</li>
        </ul>
        <details class="sh-acc" open><summary>Description</summary>
          <p>${esc(p.description || "—")}</p>
          ${(p.features || []).filter(Boolean).length ? `<ul>${p.features.filter(Boolean).map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}</details>
        ${specs.length ? `<details class="sh-acc"><summary>Specifications</summary><table class="table spec-table"><tbody>${specs.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table></details>` : ""}
        <details class="sh-acc"><summary>Shipping &amp; returns</summary><p>Dispatched in ${p.sla || 2} day(s). FREE delivery over ₹${FREE_DELIVERY_MIN}. ${esc(shReturns())}.</p></details>
        ${p.manufacturer ? `<details class="sh-acc"><summary>Manufacturer info</summary><p><strong>Manufacturer:</strong> ${party(p.manufacturer)}</p><p><strong>Packer:</strong> ${party(p.packer)}</p><p><strong>Importer:</strong> ${party(p.importer)}</p></details>` : ""}
      </div>
    </div>
  </div>
  ${more.length ? shSection("You may also like", more, 4, "") : ""}`;

  const stockEl = document.getElementById("sh-stock");
  const qtyEl = document.getElementById("sh-qty-val");
  const maxQty = () => Math.max(1, Math.min(10, variant ? variant.stock : (p.stock === undefined ? 10 : p.stock)));
  const sync = () => {
    const total = p.stock === undefined ? Infinity : p.stock;
    const base = variant ? variant.stock : total;
    if (total === 0) { stockEl.className = "sh-stock out"; stockEl.textContent = "Sold out"; }
    else if (sized && !variant) { stockEl.className = "sh-stock"; stockEl.textContent = "Select a size"; }
    else if (base <= 5) { stockEl.className = "sh-stock low"; stockEl.textContent = `Only ${base} left — hurry!`; }
    else { stockEl.className = "sh-stock ok"; stockEl.textContent = "● In stock and ready to ship"; }
    const dis = total === 0 || (variant && variant.stock === 0);
    document.getElementById("sh-add").disabled = dis;
    document.getElementById("sh-buynow").disabled = dis;
    qty = Math.min(qty, maxQty());
    qtyEl.textContent = qty;
  };
  sync();
  const sizes = document.getElementById("sh-sizes");
  const needSize = () => {
    if (!sized || variant) return false;
    showToast("Please select a size first");
    sizes.classList.add("shake");
    setTimeout(() => sizes.classList.remove("shake"), 500);
    return true;
  };
  if (sizes) sizes.addEventListener("click", (e) => {
    const b = e.target.closest(".sh-size");
    if (!b || b.disabled) return;
    sizes.querySelectorAll(".sh-size").forEach((x) => { x.classList.toggle("active", x === b); x.setAttribute("aria-pressed", String(x === b)); });
    variant = p.variants.find((v) => v.id === b.dataset.vid);
    sync();
  });
  shView().querySelectorAll("[data-q]").forEach((b) => b.addEventListener("click", () => {
    qty = Math.max(1, Math.min(maxQty(), qty + Number(b.dataset.q)));
    qtyEl.textContent = qty;
  }));
  document.getElementById("sh-add").addEventListener("click", () => { if (!needSize()) shAdd(p, variant, qty); });
  document.getElementById("sh-buynow").addEventListener("click", () => {
    if (needSize()) return;
    const key = shKey(p, variant);
    if (!(getCart()[key] > 0) && !shAdd(p, variant, qty, false)) return;
    location.href = "checkout.html";
  });
  const chartBtn = document.getElementById("sh-chart-btn");
  if (chartBtn) chartBtn.addEventListener("click", () => shModal(`
    <div class="modal-head"><h2>Size chart</h2><button type="button" class="icon-btn" data-close="1" aria-label="Close">✕</button></div>
    <table class="table"><thead><tr><th>Size</th>${tpl.sizeChart.map((f) => `<th>${esc(f.l)}</th>`).join("")}</tr></thead>
    <tbody>${p.variants.map((v) => `<tr><td><strong>${esc(v.size)}</strong></td>${tpl.sizeChart.map((f) => `<td>${esc((p.sizeChart[v.size] || {})[f.k] ?? "—")}</td>`).join("")}</tr>`).join("")}</tbody></table>`));
  if (p.imageCount > 0 || p.video) mountProductGallery(p, document.getElementById("sh-main-img"), document.getElementById("sh-thumbs"));
}

// ---------------------------------------------------------------------
// Cart (drawer) — the same Zzapkart cart
// ---------------------------------------------------------------------
function shKey(p, variant) {
  if (variant) return cartKey(p.id, variant.id);
  return p.variants && p.variants.length === 1 ? cartKey(p.id, p.variants[0].id) : String(p.id);
}
function shAdd(p, variant, qty, openDrawer = true) {
  const key = shKey(p, variant);
  const r = resolveCartItem(key, 0);
  const room = r ? r.maxStock - (getCart()[key] || 0) : 0;
  if (room <= 0) { showToast(`Only ${r ? r.maxStock : 0} in stock — they're already in your cart`); return false; }
  const n = Math.min(qty, room);
  for (let i = 0; i < n; i++) addToCart(key);
  trackCartAdd(p.id);
  showToast(`${p.name}${variant && variant.size ? " (" + variant.size + ")" : ""} added to your cart ✓${n < qty ? ` · only ${n} in stock` : ""}`);
  if (openDrawer) shOpen("sh-cart");
  return true;
}
function shRenderCart() {
  const box = document.getElementById("sh-cart");
  const items = cartItemsResolved().filter((x) => x.qty > 0);
  const count = items.reduce((s, x) => s + x.qty, 0);
  const subtotal = items.reduce((s, x) => s + x.product.price * x.qty, 0);
  const left = FREE_DELIVERY_MIN - subtotal;
  box.innerHTML = `
    <div class="sh-drawer-head"><h2>Your cart <span>(${count})</span></h2><button type="button" class="sh-icon" data-close="1" aria-label="Close cart">${SH_ICON.close}</button></div>
    ${items.length ? `
      <div class="sh-ship-bar"><p>${left > 0 ? `Add ₹${left.toLocaleString("en-IN")} more to unlock <strong>FREE delivery</strong>` : "🎉 You've unlocked <strong>FREE delivery</strong>"}</p>
        <div class="sh-ship-track"><span style="width:${Math.min(100, Math.round((subtotal / FREE_DELIVERY_MIN) * 100))}%"></span></div></div>
      <div class="sh-cart-items">${items.map((x) => {
        const mine = x.product.sellerId === shSeller.id;
        return `<div class="sh-cart-row">
          <span class="sh-cart-img" style="background:${esc(x.product.color)}">${productThumb(x.product)}</span>
          <div class="sh-cart-info">
            <a href="${mine ? "#p/" + x.product.id : productUrl(x.product)}">${esc(x.product.name)}</a>
            <small>${x.variant && x.variant.size ? "Size " + esc(x.variant.size) + " · " : ""}${formatPrice(x.product.price)}${mine ? "" : " · Zzapkart"}</small>
            <div class="sh-qty small"><button type="button" data-cq="-1" data-key="${esc(x.key)}" aria-label="Decrease">−</button><span>${x.qty}</span><button type="button" data-cq="1" data-key="${esc(x.key)}" ${x.qty >= x.maxStock ? "disabled" : ""} aria-label="Increase">+</button></div>
          </div>
          <div class="sh-cart-end"><strong>${formatPrice(x.product.price * x.qty)}</strong><button type="button" class="link-btn" data-crm="${esc(x.key)}">Remove</button></div>
        </div>`;
      }).join("")}</div>
      <div class="sh-drawer-foot">
        <div class="sh-subtotal"><span>Subtotal</span><strong>${formatPrice(subtotal)}</strong></div>
        <p class="muted small">Taxes included. Delivery is calculated at checkout.</p>
        <a class="btn sh-btn sh-block" href="checkout.html">Checkout →</a>
        <a class="btn btn-outline sh-block" href="cart.html">View cart</a>
      </div>`
    : `<div class="sh-cart-empty"><div class="empty-emoji">🛍️</div><p>Your cart is empty.</p><a href="#shop" class="btn sh-btn" data-close="1">Start shopping</a></div>`}`;
}

// ---------------------------------------------------------------------
// Drawers, search, modal
// ---------------------------------------------------------------------
let shLastFocus = null;
function shOpen(id) {
  shCloseAll(true);
  if (id === "sh-cart") shRenderCart();
  const el = document.getElementById(id);
  shLastFocus = document.activeElement;
  el.classList.add("open");
  el.setAttribute("aria-hidden", "false");
  document.getElementById("sh-overlay").classList.remove("hidden");
  document.body.classList.add("sh-lock");
  if (id === "sh-menu") document.getElementById("sh-menu-btn").setAttribute("aria-expanded", "true");
  el.querySelector("[data-close]")?.focus();
}
function shCloseAll(keepFocus) {
  let closed = false;
  document.querySelectorAll(".sh-drawer.open").forEach((d) => { d.classList.remove("open"); d.setAttribute("aria-hidden", "true"); closed = true; });
  document.getElementById("sh-overlay")?.classList.add("hidden");
  document.body.classList.remove("sh-lock");
  document.getElementById("sh-menu-btn")?.setAttribute("aria-expanded", "false");
  document.getElementById("sh-modal")?.classList.add("hidden");
  const dd = document.getElementById("sh-dd");
  if (dd) { dd.classList.remove("open"); dd.querySelector(".sh-dd-btn").setAttribute("aria-expanded", "false"); }
  if (closed && !keepFocus && shLastFocus && shLastFocus.isConnected) shLastFocus.focus();
}
function shToggleSearch(open) {
  const bar = document.getElementById("sh-searchbar");
  bar.classList.toggle("hidden", !open);
  document.getElementById("sh-search-btn").setAttribute("aria-expanded", String(open));
  if (open) bar.querySelector("input").focus();
  else document.getElementById("sh-suggest").innerHTML = "";
}
function shModal(html) {
  const m = document.getElementById("sh-modal");
  document.getElementById("sh-modal-box").innerHTML = html;
  m.classList.remove("hidden");
  m.querySelector("[data-close]")?.focus();
}

function shWire() {
  shRoot.addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest("#sh-cart-btn")) return shOpen("sh-cart");
    if (t.closest("#sh-menu-btn")) return shOpen("sh-menu");
    if (t.closest("#sh-search-btn")) return shToggleSearch(document.getElementById("sh-searchbar").classList.contains("hidden"));
    if (t.closest("#sh-search-close")) return shToggleSearch(false);
    if (t.id === "sh-overlay" || t.closest("[data-close]") || t.id === "sh-modal") { shCloseAll(); if (!t.closest("a")) return; }
    const dd = t.closest(".sh-dd-btn");
    if (dd) {
      const box = dd.parentElement;
      const open = !box.classList.contains("open");
      box.classList.toggle("open", open);
      dd.setAttribute("aria-expanded", String(open));
      return;
    }
    if (!t.closest("#sh-dd")) document.getElementById("sh-dd")?.classList.remove("open");
    const quick = t.closest("[data-quick]");
    if (quick) {
      const p = shById.get(Number(quick.dataset.quick));
      if (!p) return;
      if (p.hasSizes) location.hash = "#p/" + p.id;
      else shAdd(p, null, 1);
      return;
    }
    const cq = t.closest("[data-cq]");
    if (cq) {
      const key = cq.dataset.key;
      const r = resolveCartItem(key, getCart()[key] || 0);
      const next = (getCart()[key] || 0) + Number(cq.dataset.cq);
      setQty(key, r ? Math.min(next, r.maxStock) : next);
      return shRenderCart();
    }
    const rm = t.closest("[data-crm]");
    if (rm) { removeFromCart(rm.dataset.crm); showToast("Removed from your cart"); return shRenderCart(); }
    if (t.closest("[data-fclear]")) { shFilter = { cats: new Set(), price: "", stock: false, sort: shFilter.sort }; return shShop(); }
    if (t.closest("[data-ftoggle]")) return document.getElementById("sh-filters").classList.toggle("open");
  });
  shRoot.addEventListener("change", (e) => {
    const t = e.target;
    if (t.id === "sh-sort") { shFilter.sort = t.value; return shRoute(); }
    if (t.dataset.fcat !== undefined) { if (t.checked) shFilter.cats.add(t.dataset.fcat); else shFilter.cats.delete(t.dataset.fcat); return shShop(); }
    if (t.dataset.fprice !== undefined) { shFilter.price = t.dataset.fprice; return shShop(); }
    if (t.dataset.fstock !== undefined) { shFilter.stock = t.checked; return shShop(); }
  });
  shRoot.addEventListener("input", (e) => {
    if (e.target.closest("#sh-search-form")) {
      const q = e.target.value.trim().toLowerCase();
      const hits = q ? shItems.filter((p) => `${p.name} ${p.brand || ""} ${p.verticalName || ""}`.toLowerCase().includes(q)).slice(0, 5) : [];
      document.getElementById("sh-suggest").innerHTML = q ? (hits.length
        ? hits.map((p) => `<a class="sh-sug" href="#p/${p.id}"><span class="sh-sug-img" style="background:${esc(p.color)}">${productThumb(p)}</span><span>${esc(p.name)}</span><strong>${formatPrice(p.price)}</strong></a>`).join("") +
          `<a class="sh-sug-all" href="#search/${encodeURIComponent(e.target.value.trim())}">"${esc(e.target.value.trim())}" — see all results →</a>`
        : `<p class="muted">No products found.</p>`) : "";
    }
  });
  shRoot.addEventListener("submit", (e) => {
    const f = e.target;
    if (f.id === "sh-search-form") {
      e.preventDefault();
      const q = f.elements.q.value.trim();
      if (!q) return;
      shToggleSearch(false);
      location.hash = "#search/" + encodeURIComponent(q);
    }
    if (f.dataset.news) {
      e.preventDefault();
      const email = f.elements.email.value.trim();
      if (!EMAIL_RE.test(email)) { showToast("Enter a valid email"); f.elements.email.focus(); return; }
      if (shPreview) { showToast("Subscriptions aren't saved in preview"); return; }
      showToast(subscribeToStore(shSeller.id, email) ? "You're subscribed ✓ — you'll hear about offers first" : "This email is already subscribed");
      f.reset();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!document.getElementById("sh-searchbar").classList.contains("hidden")) shToggleSearch(false);
    shCloseAll();
  });
  window.addEventListener("storage", (e) => {
    if (e.key !== CART_KEY) return;
    updateCartBadge();
    if (document.getElementById("sh-cart").classList.contains("open")) shRenderCart();
  });
}

// ---------------------------------------------------------------------
// Every const / function above is defined — now build the store
function shStart() {
  if (!shCfg) shUnavailable();
  else renderStore();
}

function shRoute(first) {
  shCloseAll(true);
  if (!document.getElementById("sh-searchbar").classList.contains("hidden")) shToggleSearch(false);
  if (shCar) { shCar.stop(); shCar = null; }
  const h = decodeURIComponent(location.hash.slice(1));
  let nav = "home";
  if (h.startsWith("p/") && shById.has(Number(h.slice(2)))) { shProduct(shById.get(Number(h.slice(2)))); nav = "shop"; }
  else if (h.startsWith("c/") && shColls.some((c) => c.id === h.slice(2))) { shCollection(shColls.find((c) => c.id === h.slice(2))); nav = "coll"; }
  else if (h.startsWith("search/") && h.slice(7).trim()) { shSearch(h.slice(7).trim()); nav = ""; }
  else if (h === "shop" || h === "all") { shShop(); nav = "shop"; }
  else if (h === "about") { shAbout(); nav = "about"; }
  else if (h.startsWith("page/") && shPages.some((pg) => pg.slug === h.slice(5))) { const pg = shPages.find((x) => x.slug === h.slice(5)); shPage(pg); nav = "page-" + pg.slug; }
  else shHome();
  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === nav));
  if (first !== true) {
    window.scrollTo(0, 0);
    shView().focus({ preventScroll: true });
  }
}

shStart();
