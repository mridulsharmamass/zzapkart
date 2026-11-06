// Cart page: items (with size), quantity +/-, remove, price summary
const listEl = document.getElementById("cart-list");
const emptyEl = document.getElementById("cart-empty");
const summaryEl = document.getElementById("summary");

const DELIVERY_FREE_ABOVE = 499;
const DELIVERY_CHARGE = 40;

function renderCart() {
  // Remove items that can no longer be bought (listing removed / size sold out)
  const cart = getCart();
  const items = cartItemsResolved();
  const validKeys = new Set(items.map((x) => x.key));
  if (Object.keys(cart).some((k) => !validKeys.has(k))) {
    saveCart(Object.fromEntries(Object.entries(cart).filter(([k]) => validKeys.has(k))));
  }

  if (items.length === 0) {
    listEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    summaryEl.classList.add("hidden");
    return;
  }
  emptyEl.classList.add("hidden");
  summaryEl.classList.remove("hidden");

  listEl.innerHTML = items
    .map(({ key, product: p, variant, qty, maxStock }) => `
      <div class="cart-row">
        <a class="cart-img" href="product.html?id=${p.id}" style="background:${esc(p.color)}">${productThumb(p)}</a>
        <div class="cart-info">
          <h4>${esc(p.name)}</h4>
          <p class="muted">${variant && variant.size ? `Size: <strong>${esc(variant.size)}</strong> · ` : ""}${esc(p.category)}${p.sellerName ? " · Sold by " + esc(p.sellerName) : ""}</p>
          ${qty > maxStock ? `<p class="text-danger small">Only ${maxStock} in stock — please reduce the quantity</p>` : ""}
          <div class="price-row">
            <span class="price">${formatPrice(p.price * qty)}</span>
            ${p.mrp > p.price ? `<span class="mrp">${formatPrice(p.mrp * qty)}</span>` : ""}
          </div>
          <div class="cart-actions">
            <div class="qty">
              <button data-act="dec" data-key="${esc(key)}" aria-label="Decrease">−</button>
              <span>${qty}</span>
              <button data-act="inc" data-key="${esc(key)}" aria-label="Increase">+</button>
            </div>
            <button class="remove" data-act="remove" data-key="${esc(key)}">Remove</button>
          </div>
        </div>
      </div>`)
    .join("");

  const count = items.reduce((s, x) => s + x.qty, 0);
  const mrp = items.reduce((s, x) => s + Math.max(x.product.mrp, x.product.price) * x.qty, 0);
  const price = items.reduce((s, x) => s + x.product.price * x.qty, 0);
  const delivery = price >= DELIVERY_FREE_ABOVE ? 0 : DELIVERY_CHARGE;
  const total = price + delivery;

  document.getElementById("sum-items").textContent = count;
  document.getElementById("sum-mrp").textContent = formatPrice(mrp);
  document.getElementById("sum-discount").textContent = "−" + formatPrice(mrp - price);
  const delEl = document.getElementById("sum-delivery");
  delEl.textContent = delivery ? formatPrice(delivery) : "FREE";
  delEl.classList.toggle("green", !delivery);
  document.getElementById("sum-total").textContent = formatPrice(total);
  document.getElementById("sum-save").textContent =
    mrp > price ? `You save ${formatPrice(mrp - price)} on this order` : "";
  const overStock = items.some((x) => x.qty > x.maxStock);
  const btn = document.getElementById("checkout");
  btn.disabled = overStock;
  btn.title = overStock ? "Some items don't have enough stock" : "";
}

listEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const key = btn.dataset.key;
  const qty = getCart()[key] || 0;
  if (btn.dataset.act === "inc") {
    const item = resolveCartItem(key, qty);
    if (item && qty >= item.maxStock) {
      showToast(`Only ${item.maxStock} in stock`);
      return;
    }
    setQty(key, qty + 1);
  }
  if (btn.dataset.act === "dec") setQty(key, qty - 1);
  if (btn.dataset.act === "remove") {
    removeFromCart(key);
    showToast("Item removed from your cart");
  }
  renderCart();
});

document.getElementById("checkout").addEventListener("click", () => {
  location.href = "checkout.html";
});

renderCart();
