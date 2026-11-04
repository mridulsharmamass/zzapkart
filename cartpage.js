// Cart page: items list, quantity +/-, remove, price summary
const listEl = document.getElementById("cart-list");
const emptyEl = document.getElementById("cart-empty");
const summaryEl = document.getElementById("summary");

const DELIVERY_FREE_ABOVE = 499;
const DELIVERY_CHARGE = 40;

function renderCart() {
  const cart = getCart();
  const items = Object.entries(cart)
    .map(([id, qty]) => ({ product: PRODUCTS.find((p) => p.id === Number(id)), qty }))
    .filter((x) => x.product);

  if (items.length === 0) {
    listEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    summaryEl.classList.add("hidden");
    return;
  }
  emptyEl.classList.add("hidden");
  summaryEl.classList.remove("hidden");

  listEl.innerHTML = items
    .map(
      ({ product: p, qty }) => `
      <div class="cart-row">
        <div class="cart-img" style="background:${p.color}">${p.emoji}</div>
        <div class="cart-info">
          <h4>${p.name}</h4>
          <p class="muted">${p.category}</p>
          <div class="price-row">
            <span class="price">${formatPrice(p.price * qty)}</span>
            <span class="mrp">${formatPrice(p.mrp * qty)}</span>
          </div>
          <div class="cart-actions">
            <div class="qty">
              <button data-act="dec" data-id="${p.id}" aria-label="Decrease">−</button>
              <span>${qty}</span>
              <button data-act="inc" data-id="${p.id}" aria-label="Increase">+</button>
            </div>
            <button class="remove" data-act="remove" data-id="${p.id}">Remove</button>
          </div>
        </div>
      </div>`
    )
    .join("");

  const count = items.reduce((s, x) => s + x.qty, 0);
  const mrp = items.reduce((s, x) => s + x.product.mrp * x.qty, 0);
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
    `Is order par aap ${formatPrice(mrp - price)} bacha rahe ho`;
}

listEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const qty = getCart()[id] || 0;
  if (btn.dataset.act === "inc") setQty(id, qty + 1);
  if (btn.dataset.act === "dec") setQty(id, qty - 1);
  if (btn.dataset.act === "remove") {
    removeFromCart(id);
    showToast("Item cart se hata diya");
  }
  renderCart();
});

document.getElementById("checkout").addEventListener("click", () => {
  location.href = "checkout.html";
});

renderCart();
