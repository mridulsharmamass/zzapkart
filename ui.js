// Shared UI helpers: product card, category menu, account link, footer, add-to-cart, carousel

function categoryUrl(cat) {
  return "category.html?c=" + encodeURIComponent(cat.slug);
}

function productsOf(catName) {
  // Premium sellers' products first (homepage / category promotion)
  return PRODUCTS.filter((p) => p.category === catName).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
}

function discount(p) {
  return p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
}

// Small product picture: the product photo, or the emoji as a fallback
function productThumb(p) {
  const img = safeImg(p.image);
  return img ? `<img src="${img}" alt="" loading="lazy" />` : esc(p.emoji || "📦");
}

function productUrl(p, slotId) {
  return `product.html?id=${p.id}` + (slotId ? `&slot=${encodeURIComponent(slotId)}` : "");
}

function ratingHtml(p) {
  if (!p.rating) return `<span class="rating new">New</span>`;
  return `<span class="rating-row"><span class="rating">${Number(p.rating).toFixed(1)} ★</span>${p.reviews ? `<span class="reviews">(${Number(p.reviews).toLocaleString("en-IN")})</span>` : ""}</span>`;
}

// opts.slot (ad slot id) → the card is shown as a "Sponsored" ad
function productCard(p, opts = {}) {
  if (!p) return "";
  if (typeof opts !== "object") opts = {}; // .map(productCard) passes the index
  trackView(p.id);
  const off = discount(p);
  const available = inStock(p);
  const slotAttr = opts.slot ? ` data-slot="${esc(opts.slot)}"` : "";
  const href = productUrl(p, opts.slot);
  return `
    <div class="card${opts.slot ? " sponsored" : ""}"${slotAttr}>
      ${opts.slot ? `<span class="ad-tag">Sponsored</span>` : p.featured && !opts.inStore ? `<span class="ad-tag featured">★ Featured</span>` : ""}
      ${off >= 40 && !opts.slot ? `<span class="off-tag">-${off}%</span>` : ""}
      <a class="card-img" href="${href}" style="--card-bg:${esc(p.color || "#f6f3fb")}" tabindex="-1" aria-hidden="true">${productThumb(p)}${p.video ? `<span class="vid-badge">▶ Video</span>` : ""}</a>
      <div class="card-body">
        ${p.brand ? `<span class="card-brand" title="${esc(p.brand)}">${esc(p.brand)}</span>` : ""}
        <h3><a href="${href}" class="card-title">${esc(p.name)}</a></h3>
        ${ratingHtml(p)}
        <div class="price-row">
          <span class="price">${formatPrice(p.price)}</span>
          ${off ? `<span class="mrp">${formatPrice(p.mrp)}</span><span class="off">${off}% off</span>` : ""}
        </div>
        ${p.sellerName && !opts.inStore
          ? `<span class="sold-by">Sold by ${p.storeSlug ? `<a href="${storeUrl(p.storeSlug)}" class="sold-by-link" title="Visit the ${esc(p.storeName)} store">${esc(p.sellerName)}</a>` : esc(p.sellerName)}</span>`
          : ""}
        ${available && p.hasSizes
          ? `<a class="btn add-btn size-link" href="${href}">Select size</a>`
          : available
          ? `<button class="btn add-btn" data-id="${p.id}">Add to cart</button>`
          : `<button class="btn add-btn" disabled>Out of stock</button>`}
      </div>
    </div>`;
}

// Make the "Add to cart" buttons inside any container work
function enableAddToCart(container) {
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-btn");
    if (!btn || btn.disabled || btn.tagName === "A") return; // "Select size" link → product page
    // Adding a sponsored product straight to the cart counts as an ad click
    const adCard = btn.closest(".card[data-slot]");
    if (adCard && typeof recordAdClick === "function") recordAdClick(adCard.dataset.slot);
    const id = btn.dataset.id;
    const p = PRODUCTS.find((x) => String(x.id) === String(id));
    if (!p) return;
    const key = p.variants && p.variants.length === 1 ? cartKey(p.id, p.variants[0].id) : String(p.id);
    const item = resolveCartItem(key, 0);
    const inCart = getCart()[key] || 0;
    if (!item || inCart >= item.maxStock) {
      showToast(`Only ${item ? item.maxStock : 0} in stock`);
      return;
    }
    addToCart(key);
    trackCartAdd(p.id);
    showToast(`${p.name} added to your cart ✓`);
  });
}

// Category menu under the navbar (every shopping page)
function renderCategoryNav() {
  const nav = document.getElementById("cat-nav");
  if (!nav) return;
  const current = new URLSearchParams(location.search).get("c");
  const onCategoryPage = location.pathname.endsWith("category.html");
  const onBrowse = location.pathname.endsWith("browse.html");
  nav.innerHTML = `<a href="browse.html" class="cat-nav-all ${onBrowse ? "active" : ""}"><span class="cat-nav-emoji">☰</span>All Categories</a>` + CATEGORIES.map(
    (c) => `
      <a href="${categoryUrl(c)}" class="${onCategoryPage && c.slug === current ? "active" : ""}">
        <span class="cat-nav-emoji">${c.emoji}</span>${c.name}
      </a>`
  ).join("");
}
document.addEventListener("DOMContentLoaded", renderCategoryNav);

// Navbar: "Hi, Name" when a customer is logged in, otherwise "Login" (and come back here after)
function renderAccountNav() {
  const a = document.getElementById("nav-account");
  if (!a || typeof currentCustomer !== "function") return;
  const c = currentCustomer();
  const here = (location.pathname.split("/").pop() || "index.html") + location.search;
  a.href = c ? "account.html" : "account.html?next=" + encodeURIComponent(here);
  a.title = c ? "My account" : "Login / Sign up";
  const label = a.querySelector("span");
  if (label) label.textContent = c ? "Hi, " + c.name.split(" ")[0] : "Login";
}
document.addEventListener("DOMContentLoaded", renderAccountNav);

// Site footer (shopping pages)
function renderFooter() {
  const f = document.getElementById("site-footer");
  if (!f) return;
  f.innerHTML = `
    <div class="ft-wrap">
      <div class="ft-brand">
        <a href="index.html" class="ft-logo"><img src="images/logo-icon.png" alt="" />Zzapkart</a>
        <p>Fashion, electronics, home, beauty and more — from verified sellers across India, delivered to your door.</p>
      </div>
      <div><h4>Shop</h4>${CATEGORIES.slice(0, 5).map((c) => `<a href="${categoryUrl(c)}">${c.name}</a>`).join("")}<a href="browse.html">All categories</a></div>
      <div><h4>Help</h4><a href="account.html#orders">Track your order</a><a href="help.html#returns">Returns &amp; refunds</a><a href="help.html#shipping">Shipping &amp; delivery</a><a href="help.html#payments">Payments</a><a href="help.html#contact" data-open-chat="1">💬 Chat with us</a></div>
      <div><h4>Company</h4><a href="help.html#about">About Zzapkart</a><a href="seller.html">Sell on Zzapkart</a><a href="help.html#privacy">Privacy policy</a><a href="help.html#terms">Terms of use</a></div>
    </div>
    <div class="ft-bottom"><span>© ${new Date().getFullYear()} Zzapkart. All rights reserved.</span><span>UPI · Cards · Cash on Delivery</span></div>`;
}
document.addEventListener("DOMContentLoaded", renderFooter);

// ---------------------------------------------------------------------
// Auto-play carousel (home banners + Brand Store banners) — always running.
// Inside root: slides, dots [data-dot], prev / next. It only pauses when the
// tab is hidden, the carousel is hidden (search view) or keyboard focus is inside.
// With "reduce motion" it still changes slides, just without the slide animation (CSS).
// root gets the "car-running" class + --car-ms for the progress-bar animation.
// ---------------------------------------------------------------------
function startCarousel(root, opts = {}) {
  const o = { slide: ".car-slide", dot: "[data-dot]", prev: ".car-prev", next: ".car-next", interval: 5000, onShow: null, ...opts };
  const slides = [...root.querySelectorAll(o.slide)];
  const dots = [...root.querySelectorAll(o.dot)];
  let cur = Math.max(0, slides.findIndex((s) => s.classList.contains("active")));
  let timer = null;
  let keyboardFocus = false;
  root.style.setProperty("--car-ms", o.interval + "ms");

  function show(i) {
    if (!slides.length) return;
    cur = (i + slides.length) % slides.length;
    slides.forEach((s, j) => {
      const on = j === cur;
      s.classList.toggle("active", on);
      s.setAttribute("aria-hidden", String(!on));
      // links on hidden slides should not be reachable with Tab
      (s.matches("a, button") ? [s] : []).concat([...s.querySelectorAll("a, button")]).forEach((el) => (el.tabIndex = on ? 0 : -1));
    });
    dots.forEach((d, j) => {
      d.classList.toggle("active", j === cur);
      d.setAttribute("aria-current", j === cur ? "true" : "false");
    });
    if (o.onShow) o.onShow(cur);
  }
  function stop() {
    clearTimeout(timer);
    timer = null;
    root.classList.remove("car-running");
  }
  function schedule() {
    stop();
    if (!root.isConnected || slides.length < 2 || keyboardFocus || document.hidden) return;
    void root.offsetWidth; // restart the progress animation
    root.classList.add("car-running");
    timer = setTimeout(() => {
      if (!root.isConnected) return stop();
      if (root.offsetParent === null) return schedule(); // hidden right now
      show(cur + 1);
      schedule();
    }, o.interval);
  }
  const go = (i) => { show(i); schedule(); };

  root.querySelector(o.prev)?.addEventListener("click", () => go(cur - 1));
  root.querySelector(o.next)?.addEventListener("click", () => go(cur + 1));
  dots.forEach((d) => d.addEventListener("click", () => go(Number(d.dataset.dot))));
  root.addEventListener("focusin", (e) => { if (e.target.matches(":focus-visible")) { keyboardFocus = true; schedule(); } });
  root.addEventListener("focusout", (e) => { if (!root.contains(e.relatedTarget)) { keyboardFocus = false; schedule(); } });
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") go(cur - 1);
    else if (e.key === "ArrowRight") go(cur + 1);
  });
  let x0 = null;
  root.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
  root.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1));
  });
  const onVis = () => (root.isConnected ? schedule() : document.removeEventListener("visibilitychange", onVis));
  document.addEventListener("visibilitychange", onVis);

  show(cur);
  schedule();
  return { show: go, stop, get index() { return cur; } };
}
