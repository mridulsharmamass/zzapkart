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
