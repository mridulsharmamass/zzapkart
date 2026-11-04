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

// opts.campaignId diya ho to card "Sponsored" ad ki tarah dikhega
function productCard(p, opts = {}) {
  trackView(p.id);
  const off = discount(p);
  const available = inStock(p);
  const camp = opts.campaignId ? ` data-campaign="${esc(opts.campaignId)}"` : "";
  return `
    <div class="card"${camp}>
      ${opts.campaignId ? `<span class="ad-tag">Sponsored</span>` : p.featured ? `<span class="ad-tag featured">★ Featured</span>` : ""}
      <div class="card-img" style="background:${esc(p.color)}">${productThumb(p)}</div>
      <div class="card-body">
        <h3>${esc(p.name)}</h3>
        ${p.sellerName ? `<span class="sold-by">Sold by ${esc(p.sellerName)}</span>` : ""}
        ${p.rating ? `<span class="rating">${p.rating} ★</span>` : `<span class="rating new">New</span>`}
        <div class="price-row">
          <span class="price">${formatPrice(p.price)}</span>
          ${off ? `<span class="mrp">${formatPrice(p.mrp)}</span><span class="off">${off}% off</span>` : ""}
        </div>
        ${available
          ? `<button class="btn add-btn" data-id="${p.id}"${camp}>Add to Cart</button>`
          : `<button class="btn add-btn" disabled>Out of Stock</button>`}
      </div>
    </div>`;
}

// Kisi bhi container ke andar "Add to Cart" buttons ko kaam karwao
function enableAddToCart(container) {
  container.addEventListener("click", (e) => {
    const card = e.target.closest(".card[data-campaign]");
    if (card) recordClick(card.dataset.campaign); // ad par click

    const btn = e.target.closest(".add-btn");
    if (!btn || btn.disabled) return;
    const id = Number(btn.dataset.id);
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p) return;
    const inCart = getCart()[id] || 0;
    if (p.stock !== undefined && inCart >= p.stock) {
      showToast(`Sirf ${p.stock} piece stock mein hain`);
      return;
    }
    addToCart(id);
    trackCartAdd(id);
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
