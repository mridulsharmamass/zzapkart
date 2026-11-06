// =====================================================================
// Brand Store page (buyer side)
//   store.html?s=<slug>     → published store (Premium seller)
//   store.html?preview=1    → logged-in seller ka draft (editor se Preview)
// Routes (hash): #home  #all  #c/<collectionId>  #about  #search/<q>
// =====================================================================
const bsParams = new URLSearchParams(location.search);
const bsRoot = document.getElementById("bstore");
const bsViewer = currentSeller();
let bsSeller = null, bsCfg = null, bsPreview = false;

if (bsParams.get("preview") === "1" && bsViewer && bsViewer.store && bsViewer.store.draft) {
  bsSeller = bsViewer;
  bsCfg = bsViewer.store.draft;
  bsPreview = true;
} else {
  bsSeller = sellerByStoreSlug(bsParams.get("s"));
  bsCfg = storeIsActive(bsSeller) ? bsSeller.store.live : null;
}

if (!bsCfg) {
  bsRoot.innerHTML = `
    <div class="empty bs-missing">
      <div class="empty-emoji">🏬</div>
      <h2>${bsSeller ? "Ye store abhi available nahi hai" : "Store nahi mila"}</h2>
      <p>${bsSeller ? "Seller ne store abhi band kiya hua hai. Thodi der baad dobara dekhein." : "Link check karein ya Zzapkart par product search karein."}</p>
      <a href="index.html" class="btn">Zzapkart Home</a>
    </div>`;
} else {
  renderBrandStore(bsSeller, bsCfg);
}

function renderBrandStore(seller, cfg) {
  bsRoot.style.setProperty("--st", storeTheme(cfg));
  document.title = `${cfg.name} – Brand Store – Zzapkart`;
  if (!bsPreview && !(bsViewer && bsViewer.id === seller.id)) trackStoreVisit(seller.id);

  // Store ke products = is seller ki storefront par dikhne wali listings
  const items = PRODUCTS.filter((p) => p.sellerId === seller.id);
  const byId = new Map(items.map((p) => [p.id, p]));
  const pick = (ids) => (ids || []).map((id) => byId.get(id)).filter(Boolean);
  const featured = pick(cfg.featured);
  const colls = (cfg.collections || []).map((c) => ({ ...c, items: pick(c.productIds) })).filter((c) => c.items.length);
  const newest = [...items].sort((a, b) => b.id - a.id);
  const featIdx = (p) => (cfg.featured || []).indexOf(p.id);

  const SORTS = {
    featured: (a, b) => (inStock(b) - inStock(a)) || ((featIdx(a) < 0) - (featIdx(b) < 0)) || (featIdx(a) - featIdx(b)) || (b.id - a.id),
    new: (a, b) => b.id - a.id,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    discount: (a, b) => discount(b) - discount(a),
  };
  const SORT_LABELS = { featured: "Featured", new: "Newest first", "price-asc": "Price: Low to High", "price-desc": "Price: High to Low", discount: "Discount" };
  let sortBy = "featured", catFilter = "";

  const since = new Date(seller.createdAt || Date.now()).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  const logo = safeImg(cfg.logo) ? `<img src="${safeImg(cfg.logo)}" alt="${esc(cfg.name)} logo" />` : `<span>${esc(storeInitials(cfg.name))}</span>`;
  bsRoot.innerHTML = `
    ${bsPreview ? `<div class="bs-preview-bar">👁 <strong>Preview</strong> — ye aapka draft hai. Buyers ko ${seller.store.published ? "abhi published version" : "store publish hone ke baad"} dikhega. <a href="seller-dashboard.html#store">← Editor par wapas</a></div>` : ""}
    <section class="bs-head">
      <div class="bs-logo">${logo}</div>
      <div class="bs-id">
        <h1>${esc(cfg.name)}</h1>
        ${cfg.tagline ? `<p class="bs-tagline">${esc(cfg.tagline)}</p>` : ""}
        <p class="bs-meta"><span class="bs-badge">✓ Brand Store</span><span>${items.length} product${items.length === 1 ? "" : "s"}</span><span>· Zzapkart par ${esc(since)} se</span></p>
      </div>
      <form class="bs-search" id="bs-search" role="search">
        <input type="search" name="q" placeholder="Search in ${esc(cfg.name)}" aria-label="Search in ${esc(cfg.name)}" />
        <button type="submit" aria-label="Search">🔍</button>
      </form>
    </section>
    <nav class="bs-tabs" id="bs-tabs" aria-label="Store menu"></nav>
    <div id="bs-view"></div>`;

  const view = document.getElementById("bs-view");
  const tabsEl = document.getElementById("bs-tabs");
  const searchForm = document.getElementById("bs-search");
  enableAddToCart(view);

  const TABS = [["home", "Home"], ["all", "All Products"], ...colls.map((c) => ["c/" + c.id, c.name]), ["about", "About"]];
  const renderTabs = (cur) => {
    tabsEl.innerHTML = TABS.map(([k, l]) => `<a href="#${esc(k)}" class="${cur === k ? "active" : ""}">${esc(l)}</a>`).join("");
  };

  const grid = (list) => `<div class="grid">${list.map((p) => productCard(p, { inStore: true })).join("")}</div>`;
  const section = (title, list, limit, moreHref) => `
    <section class="cat-section bs-section">
      <div class="cat-section-head">
        <div><h2>${title}</h2></div>
        ${moreHref && list.length > limit ? `<a href="${esc(moreHref)}" class="btn view-all">View all (${list.length}) →</a>` : ""}
      </div>
      ${grid(list.slice(0, limit))}
    </section>`;
  const emptyBox = (msg) => `<div class="empty"><div class="empty-emoji">📦</div><p>${msg}</p></div>`;
  const sortControl = () => `
    <label class="sort">Sort by
      <select id="bs-sort">${Object.entries(SORT_LABELS).map(([k, l]) => `<option value="${k}" ${sortBy === k ? "selected" : ""}>${l}</option>`).join("")}</select>
    </label>`;
  const wireSort = (rerender) => {
    const s = document.getElementById("bs-sort");
    if (s) s.addEventListener("change", () => { sortBy = s.value; rerender(); });
  };

  // ---------- Banner carousel ----------
  function bannerHref(b) {
    const link = String(b.link || "");
    if (!link || link === "none") return "";
    if (link.startsWith("c:")) return colls.some((c) => c.id === link.slice(2)) ? "#c/" + link.slice(2) : "#all";
    if (link.startsWith("p:")) { const p = byId.get(Number(link.slice(2))); return p ? productUrl(p) : "#all"; }
    return "#all";
  }
  function carouselHTML() {
    const bs = cfg.banners || [];
    return `
    <section class="bs-hero" id="bs-hero" aria-roledescription="carousel" aria-label="${esc(cfg.name)} banners">
      <div class="bs-slides">
        ${bs.map((b, i) => {
          const href = bannerHref(b);
          const tag = href ? "a" : "div";
          const text = b.headline || b.sub || (href && b.cta);
          return `<${tag} class="bs-slide tone-${b.tone === "dark" ? "dark" : "light"} ${i === 0 ? "active" : ""}" ${href ? `href="${esc(href)}"` : ""} data-i="${i}" aria-hidden="${i !== 0}" ${href && i !== 0 ? 'tabindex="-1"' : ""}>
            <img data-banner-img="${esc(b.id)}" alt="${esc(b.headline || cfg.name + " banner")}" />
            ${text ? `<div class="bs-slide-text">${b.headline ? `<h2>${esc(b.headline)}</h2>` : ""}${b.sub ? `<p>${esc(b.sub)}</p>` : ""}${href && b.cta ? `<span class="bs-cta">${esc(b.cta)}</span>` : ""}</div>` : ""}
          </${tag}>`;
        }).join("")}
      </div>
      ${bs.length > 1 ? `
        <button type="button" class="bs-arrow prev" aria-label="Previous banner">‹</button>
        <button type="button" class="bs-arrow next" aria-label="Next banner">›</button>
        <div class="bs-dots">${bs.map((_, i) => `<button type="button" class="${i === 0 ? "active" : ""}" data-dot="${i}" aria-label="Banner ${i + 1}"></button>`).join("")}<button type="button" class="bs-toggle car-toggle"></button></div>` : ""}
    </section>`;
  }
  let car = null;
  function initCarousel() {
    if (car) car.stop();
    car = null;
    const hero = document.getElementById("bs-hero");
    if (!hero) return;
    hero.querySelectorAll("img[data-banner-img]").forEach((img) => {
      MediaDB.get(storeBannerKey(img.dataset.bannerImg)).then((data) => { if (safeImg(data)) img.src = data; });
    });
    car = startCarousel(hero, { slide: ".bs-slide", prev: ".bs-arrow.prev", next: ".bs-arrow.next", interval: 5000 });
  }

  // ---------- Views ----------
  function viewHome() {
    renderTabs("home");
    const fresh = newest.filter(inStock);
    const html = [];
    if ((cfg.banners || []).length) html.push(carouselHTML());
    if (!items.length) html.push(emptyBox("Is store me abhi koi product live nahi hai. Jaldi wapas aayein!"));
    if (featured.length) html.push(section("⭐ Featured", featured, 8));
    colls.forEach((c) => html.push(section(esc(c.name), c.items, 4, "#c/" + c.id)));
    if (cfg.showNew && fresh.length) html.push(section("🆕 New arrivals", fresh, 4, "#all"));
    if (items.length && !featured.length && !colls.length && !(cfg.showNew && fresh.length)) html.push(section("Products", items, 8, "#all"));
    if (cfg.about) {
      const short = cfg.about.length > 240 ? cfg.about.slice(0, 240).trimEnd() + "…" : cfg.about;
      html.push(`<section class="panel bs-about-snip"><h2>About ${esc(cfg.name)}</h2><p class="bs-about">${esc(short)}</p><a href="#about" class="link">Read more →</a></section>`);
    }
    view.innerHTML = html.join("");
    initCarousel();
  }

  function viewAll() {
    renderTabs("all");
    const cats = [...new Set(items.map((p) => p.verticalName || p.catName || p.category).filter(Boolean))].sort();
    if (catFilter && !cats.includes(catFilter)) catFilter = "";
    const list = items.filter((p) => !catFilter || (p.verticalName || p.catName || p.category) === catFilter).sort(SORTS[sortBy]);
    view.innerHTML = `
      <div class="toolbar bs-toolbar">
        <span class="result-info">${list.length} product${list.length === 1 ? "" : "s"}${catFilter ? ` in ${esc(catFilter)}` : ""}</span>
        ${sortControl()}
      </div>
      ${cats.length > 1 ? `<div class="categories bs-cats">
        <button type="button" class="chip ${catFilter ? "" : "active"}" data-cat="">All</button>
        ${cats.map((c) => `<button type="button" class="chip ${catFilter === c ? "active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}
      </div>` : ""}
      ${list.length ? grid(list) : emptyBox("Is store me abhi koi product live nahi hai.")}`;
    wireSort(viewAll);
    view.querySelectorAll("[data-cat]").forEach((b) => b.addEventListener("click", () => { catFilter = b.dataset.cat; viewAll(); }));
  }

  function viewCollection(c) {
    renderTabs("c/" + c.id);
    const list = [...c.items].sort(sortBy === "featured" ? () => 0 : SORTS[sortBy]);
    view.innerHTML = `
      <div class="toolbar bs-toolbar">
        <div><h2 class="bs-view-title">${esc(c.name)}</h2><span class="result-info">${list.length} product${list.length === 1 ? "" : "s"}</span></div>
        ${sortControl()}
      </div>
      ${grid(list)}`;
    wireSort(() => viewCollection(c));
  }

  function viewSearch(q) {
    renderTabs("");
    searchForm.elements.q.value = q;
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = items.filter((p) => {
      const hay = `${p.name} ${p.brand || ""} ${p.catName || ""} ${p.verticalName || ""} ${p.keywords || ""} ${p.description || ""}`.toLowerCase();
      return terms.every((w) => hay.includes(w) || (w.length > 3 && w.endsWith("s") && hay.includes(w.slice(0, -1))));
    });
    view.innerHTML = `
      <p class="result-info">"${esc(q)}" ke liye <strong>${esc(cfg.name)}</strong> me ${list.length} result(s) ·
        <a href="index.html?q=${encodeURIComponent(q)}" class="link">Poore Zzapkart me search karo</a></p>
      ${list.length ? grid(list) : emptyBox("Is store me ye product nahi mila.")}`;
  }

  function viewAbout() {
    renderTabs("about");
    const slas = items.map((p) => Number(p.sla) || 2);
    const avgSla = slas.length ? Math.round(slas.reduce((a, b) => a + b, 0) / slas.length) : 2;
    view.innerHTML = `
      <section class="panel bs-about-page">
        <div class="bs-about-head">
          <div class="bs-logo small">${logo}</div>
          <div><h2>${esc(cfg.name)}</h2>${cfg.tagline ? `<p class="bs-tagline">${esc(cfg.tagline)}</p>` : ""}</div>
        </div>
        ${cfg.about ? `<p class="bs-about">${esc(cfg.about)}</p>` : `<p class="muted">Seller ne abhi store ke baare me kuch nahi likha.</p>`}
        <h3>Store policies</h3>
        <div class="bs-policy">
          <div><span>↩️</span><strong>${esc(STORE_RETURNS[cfg.returnDays] || STORE_RETURNS[7])}</strong><small>Return policy</small></div>
          <div><span>🚚</span><strong>${avgSla} din me dispatch</strong><small>Average dispatch time</small></div>
          <div><span>💳</span><strong>COD, UPI, Card</strong><small>Payment options</small></div>
          <div><span>✅</span><strong>KYC verified seller</strong><small>Sold by ${esc(seller.shopName)}</small></div>
        </div>
      </section>`;
  }

  function route() {
    if (car) car.stop();
    const h = decodeURIComponent(location.hash.slice(1));
    if (h.startsWith("search/") && h.slice(7).trim()) return viewSearch(h.slice(7).trim());
    if (h.startsWith("c/")) {
      const c = colls.find((x) => x.id === h.slice(2));
      if (c) return viewCollection(c);
    }
    if (h === "all") return viewAll();
    if (h === "about") return viewAbout();
    return viewHome();
  }

  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = searchForm.elements.q.value.trim();
    location.hash = q ? "#search/" + encodeURIComponent(q) : "#all";
  });
  window.addEventListener("hashchange", () => {
    route();
    const top = tabsEl.getBoundingClientRect().top + window.scrollY - 80;
    if (window.scrollY > top) window.scrollTo(0, Math.max(0, top));
  });
  route();
}
