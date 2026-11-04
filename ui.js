// Shared UI helpers: product card, category menu, add-to-cart clicks

function categoryUrl(cat) {
  return "category.html?c=" + encodeURIComponent(cat.slug);
}

function productsOf(catName) {
  return PRODUCTS.filter((p) => p.category === catName);
}

function discount(p) {
  return Math.round(((p.mrp - p.price) / p.mrp) * 100);
}

function productCard(p) {
  return `
    <div class="card">
      <div class="card-img" style="background:${p.color}">${p.emoji}</div>
      <div class="card-body">
        <h3>${p.name}</h3>
        <span class="rating">${p.rating} ★</span>
        <div class="price-row">
          <span class="price">${formatPrice(p.price)}</span>
          <span class="mrp">${formatPrice(p.mrp)}</span>
          <span class="off">${discount(p)}% off</span>
        </div>
        <button class="btn add-btn" data-id="${p.id}">Add to Cart</button>
      </div>
    </div>`;
}

// Kisi bhi container ke andar "Add to Cart" buttons ko kaam karwao
function enableAddToCart(container) {
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-btn");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    addToCart(id);
    const p = PRODUCTS.find((x) => x.id === id);
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
