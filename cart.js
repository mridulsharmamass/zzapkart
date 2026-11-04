// Shared cart logic (localStorage mein save hota hai, page refresh pe bhi rehta hai)
const CART_KEY = "zzapkart_cart";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || {};
  } catch {
    return {};
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(id) {
  const cart = getCart();
  cart[id] = (cart[id] || 0) + 1;
  saveCart(cart);
}

function setQty(id, qty) {
  const cart = getCart();
  if (qty <= 0) delete cart[id];
  else cart[id] = qty;
  saveCart(cart);
}

function removeFromCart(id) {
  const cart = getCart();
  delete cart[id];
  saveCart(cart);
}

function cartCount() {
  return Object.values(getCart()).reduce((a, b) => a + b, 0);
}

function updateCartBadge() {
  const badge = document.getElementById("cart-count");
  if (badge) {
    const n = cartCount();
    badge.textContent = n;
    badge.style.display = n > 0 ? "inline-flex" : "none";
  }
}

function formatPrice(n) {
  return "₹" + n.toLocaleString("en-IN");
}

function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 1800);
}

document.addEventListener("DOMContentLoaded", updateCartBadge);
