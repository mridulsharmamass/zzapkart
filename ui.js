// Shared UI helpers: product card, category menu, add-to-cart clicks

function categoryUrl(cat) {
  return "category.html?c=" + encodeURIComponent(cat.slug);
}

function productsOf(catName) {
  // Premium sellers ke products pehle (homepage/category promotion)
  return PRODUCTS.filter((p) => p.category === catName).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
}

function discount(p) {
  return p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
}

// Product ki chhoti photo: seller ki image ho to wo, warna emoji
function productThumb(p) {
  const img = safeImg(p.image);
  return img ? `<img src="${img}" alt="" loading="lazy" />` : esc(p.emoji || "📦");
}

function productUrl(p, slotId) {
  return `product.html?id=${p.id}` + (slotId ? `&slot=${encodeURIComponent(slotId)}` : "");
}

// opts.slot (ad slot id) diya ho to card "Sponsored" ad ki tarah dikhega
function productCard(p, opts = {}) {
  if (!p) return "";
  if (typeof opts !== "object") opts = {}; // .map(productCard) index bhejta hai
  trackView(p.id);
  const off = discount(p);
  const available = inStock(p);
  const slotAttr = opts.slot ? ` data-slot="${esc(opts.slot)}"` : "";
  const href = productUrl(p, opts.slot);
  return `
    <div class="card${opts.slot ? " sponsored" : ""}"${slotAttr}>
      ${opts.slot ? `<span class="ad-tag">Sponsored</span>` : p.featured && !opts.inStore ? `<span class="ad-tag featured">★ Featured</span>` : ""}
      <a class="card-img" href="${href}" style="background:${esc(p.color)}">${productThumb(p)}</a>
      <div class="card-body">
        ${p.brand ? `<span class="card-brand">${esc(p.brand)}</span>` : ""}
        <h3><a href="${href}" class="card-title">${esc(p.name)}</a></h3>
        ${p.sellerName && !opts.inStore
          ? `<span class="sold-by">Sold by ${p.storeSlug ? `<a href="${storeUrl(p.storeSlug)}" class="sold-by-link" title="${esc(p.storeName)} store dekho">${esc(p.sellerName)}</a>` : esc(p.sellerName)}</span>`
          : ""}
        ${p.rating ? `<span class="rating">${p.rating} ★</span>` : `<span class="rating new">New</span>`}
        <div class="price-row">
          <span class="price">${formatPrice(p.price)}</span>
          ${off ? `<span class="mrp">${formatPrice(p.mrp)}</span><span class="off">${off}% off</span>` : ""}
        </div>
        ${available && p.hasSizes
          ? `<a class="btn add-btn size-link" href="${href}">Select Size</a>`
          : available
          ? `<button class="btn add-btn" data-id="${p.id}">Add to Cart</button>`
          : `<button class="btn add-btn" disabled>Out of Stock</button>`}
      </div>
    </div>`;
}

// Kisi bhi container ke andar "Add to Cart" buttons ko kaam karwao
function enableAddToCart(container) {
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-btn");
    if (!btn || btn.disabled || btn.tagName === "A") return; // "Select Size" link → product page
    // Sponsored card se seedha cart mein daala = ad click
    const adCard = btn.closest(".card[data-slot]");
    if (adCard && typeof recordAdClick === "function") recordAdClick(adCard.dataset.slot);
    const id = btn.dataset.id;
    const p = PRODUCTS.find((x) => String(x.id) === String(id));
    if (!p) return;
    const key = p.variants && p.variants.length === 1 ? cartKey(p.id, p.variants[0].id) : String(p.id);
    const item = resolveCartItem(key, 0);
    const inCart = getCart()[key] || 0;
    if (!item || inCart >= item.maxStock) {
      showToast(`Sirf ${item ? item.maxStock : 0} piece stock mein hain`);
      return;
    }
    addToCart(key);
    trackCartAdd(p.id);
    showToast(`${p.name} cart mein add ho gaya ✓`);
  });
}

// Navbar ke neeche category menu (har page par)
function renderCategoryNav() {
  const nav = document.getElementById("cat-nav");
  if (!nav) return;
  const current = new URLSearchParams(location.search).get("c");
  const onCategoryPage = location.pathname.endsWith("category.html");
  nav.innerHTML = CATEGORIES.map(
    (c) => `
      <a href="${categoryUrl(c)}" class="${onCategoryPage && c.slug === current ? "active" : ""}">
        <span class="cat-nav-emoji">${c.emoji}</span>${c.name}
      </a>`
  ).join("");
}

document.addEventListener("DOMContentLoaded", renderCategoryNav);

// ---------------------------------------------------------------------
// Auto-play carousel (home banners + Brand Store banners)
// root ke andar: slides, dots [data-dot], prev/next, optional pause button.
// Mouse hover / keyboard focus par rukta hai, tab chhupa ho ya carousel
// chhupa ho (search view) to nahi chalta, "reduce motion" par auto-play band.
// root par "car-running" class + --car-ms: progress bar ki CSS animation ke liye.
// ---------------------------------------------------------------------
function startCarousel(root, opts = {}) {
  const o = { slide: ".car-slide", dot: "[data-dot]", prev: ".car-prev", next: ".car-next", toggle: ".car-toggle", interval: 5000, onShow: null, ...opts };
  const slides = [...root.querySelectorAll(o.slide)];
  const dots = [...root.querySelectorAll(o.dot)];
  const toggleBtn = root.querySelector(o.toggle);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let cur = Math.max(0, slides.findIndex((s) => s.classList.contains("active")));
  let timer = null;
  let holding = false;       // mouse upar hai / keyboard focus andar hai
  let userPaused = reduce;   // pause button (reduce motion me shuru se paused)
  root.style.setProperty("--car-ms", o.interval + "ms");

  function show(i) {
    if (!slides.length) return;
    cur = (i + slides.length) % slides.length;
    slides.forEach((s, j) => {
      const on = j === cur;
      s.classList.toggle("active", on);
      s.setAttribute("aria-hidden", String(!on));
      // chhupi slides ke links Tab key se na milen
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
    if (!root.isConnected || slides.length < 2 || userPaused || holding || document.hidden) return;
    void root.offsetWidth; // progress animation dobara shuru ho
    root.classList.add("car-running");
    timer = setTimeout(() => {
      if (!root.isConnected) return stop();
      if (root.offsetParent === null) return schedule(); // abhi chhupa hai
      show(cur + 1);
      schedule();
    }, o.interval);
  }
  function syncToggle() {
    root.classList.toggle("car-paused", userPaused);
    if (!toggleBtn) return;
    toggleBtn.textContent = userPaused ? "▶" : "❚❚";
    toggleBtn.setAttribute("aria-label", userPaused ? "Slideshow chalao" : "Slideshow roko");
    toggleBtn.setAttribute("aria-pressed", String(userPaused));
  }
  const go = (i) => { show(i); schedule(); };

  root.querySelector(o.prev)?.addEventListener("click", () => go(cur - 1));
  root.querySelector(o.next)?.addEventListener("click", () => go(cur + 1));
  dots.forEach((d) => d.addEventListener("click", () => go(Number(d.dataset.dot))));
  toggleBtn?.addEventListener("click", () => { userPaused = !userPaused; syncToggle(); schedule(); });
  root.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { holding = true; schedule(); } });
  root.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { holding = false; schedule(); } });
  root.addEventListener("focusin", (e) => { if (e.target.matches(":focus-visible")) { holding = true; schedule(); } });
  root.addEventListener("focusout", (e) => { if (!root.contains(e.relatedTarget)) { holding = false; schedule(); } });
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
  syncToggle();
  schedule();
  return { show: go, stop, get index() { return cur; } };
}
