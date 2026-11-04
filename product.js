// Product detail page: product.html?id=123[&slot=ad-slot-id]
const params = new URLSearchParams(location.search);
const product = PRODUCTS.find((p) => p.id === Number(params.get("id")));
const pdp = document.getElementById("pdp");

// Ad se aaye ho to click record karo (duplicate clicks free)
if (params.get("slot")) {
  recordAdClick(params.get("slot"));
  // URL se slot hatao taaki refresh / share par dobara na gine
  history.replaceState(null, "", "product.html?id=" + params.get("id"));
}

if (!product) {
  pdp.innerHTML = `<div class="empty"><div class="empty-emoji">🔍</div><p>Ye product nahi mila.</p><a href="index.html" class="btn">Go to Home</a></div>`;
} else {
  document.title = `${product.name} – Zzapkart`;
  trackView(product.id);
  const cat = CATEGORIES.find((c) => c.name === product.category);
  document.getElementById("crumbs").innerHTML =
    `<a href="index.html">Home</a> › ${cat ? `<a href="${categoryUrl(cat)}">${esc(cat.name)}</a> › ` : ""}${esc(product.name)}`;

  const off = discount(product);
  const available = inStock(product);
  const stockMsg = product.stock === undefined ? "In stock"
    : product.stock === 0 ? "Out of stock"
    : product.stock <= 5 ? `Sirf ${product.stock} bache hain — jaldi karo!` : "In stock";
  const deliver = new Date(Date.now() + 4 * DAY).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  pdp.innerHTML = `
    <section class="pdp panel">
      <div class="pdp-img" style="background:${esc(product.color)}">${productThumb(product)}</div>
      <div class="pdp-info">
        <h1>${esc(product.name)}</h1>
        ${product.sellerName ? `<p class="sold-by">Sold by <strong>${esc(product.sellerName)}</strong></p>` : `<p class="sold-by">Sold by <strong>Zzapkart</strong></p>`}
        ${product.rating ? `<span class="rating">${product.rating} ★</span>` : `<span class="rating new">New</span>`}
        <div class="price-row pdp-price">
          <span class="price">${formatPrice(product.price)}</span>
          ${off ? `<span class="mrp">${formatPrice(product.mrp)}</span><span class="off">${off}% off</span>` : ""}
        </div>
        <p class="${available ? "green" : "text-danger"} stock-msg">${stockMsg}</p>
        <p class="muted">🚚 FREE delivery by <strong>${deliver}</strong> on orders above ₹499 · ⚡ Express available</p>
        <div class="pdp-actions">
          <button class="btn add-btn" id="pdp-add" data-id="${product.id}" ${available ? "" : "disabled"}>Add to Cart</button>
          <button class="btn buy-btn" id="pdp-buy" ${available ? "" : "disabled"}>Buy Now</button>
        </div>
        ${product.description ? `<h3>About this item</h3><p class="pdp-desc">${esc(product.description)}</p>` : ""}
      </div>
    </section>`;
  enableAddToCart(pdp);
  document.getElementById("pdp-buy").addEventListener("click", () => {
    if (!getCart()[product.id]) { addToCart(product.id); trackCartAdd(product.id); }
    location.href = "checkout.html";
  });

  // Sponsored products related to this item (same category ke ads)
  const relSlots = runAuction({ placement: "product", productId: product.id, category: product.category }, 4);
  if (relSlots.length) {
    document.getElementById("related-ads").classList.remove("hidden");
    document.getElementById("related-ads-grid").innerHTML = sponsoredCards(relSlots);
    trackSlotsShown(relSlots);
    enableAddToCart(document.getElementById("related-ads-grid"));
  }

  // Organic similar products
  const adIds = new Set(relSlots.map((s) => s.pid));
  const similar = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id && !adIds.has(p.id)).slice(0, 4);
  if (similar.length) {
    document.getElementById("similar").classList.remove("hidden");
    document.getElementById("similar-cat").textContent = product.category;
    document.getElementById("similar-grid").innerHTML = similar.map((p) => productCard(p)).join("");
    enableAddToCart(document.getElementById("similar-grid"));
  }
}
