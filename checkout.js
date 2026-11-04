// Checkout page: address form, payment method, order summary, place order
const DELIVERY_FREE_ABOVE = 499;
const DELIVERY_CHARGE = 40;
const ADDRESS_KEY = "zzapkart_address";

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu & Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Ladakh", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Chandigarh", "Puducherry",
];

const form = document.getElementById("checkout-form");
const stateSelect = form.elements.state;
STATES.forEach((s) => stateSelect.add(new Option(s, s)));

// ---------- Cart data ----------
function cartItems() {
  return Object.entries(getCart())
    .map(([id, qty]) => ({ product: PRODUCTS.find((p) => p.id === Number(id)), qty }))
    .filter((x) => x.product);
}

function totals(items) {
  const count = items.reduce((s, x) => s + x.qty, 0);
  const mrp = items.reduce((s, x) => s + x.product.mrp * x.qty, 0);
  const price = items.reduce((s, x) => s + x.product.price * x.qty, 0);
  const express = form.elements.delivery.value === "express";
  const delivery = express ? DELIVERY_OPTIONS.express.charge : price >= DELIVERY_FREE_ABOVE ? 0 : DELIVERY_CHARGE;
  return { count, mrp, price, delivery, total: price + delivery };
}

function renderSummary() {
  const items = cartItems();
  document.getElementById("mini-items").innerHTML = items
    .map(
      ({ product: p, qty }) => `
      <div class="mini-row">
        <div class="mini-img" style="background:${esc(p.color)}">${productThumb(p)}</div>
        <div class="mini-info">
          <div>${esc(p.name)}</div>
          <div class="muted">Qty: ${qty}</div>
        </div>
        <div class="mini-price">${formatPrice(p.price * qty)}</div>
      </div>`
    )
    .join("");

  const t = totals(items);
  document.getElementById("sum-items").textContent = t.count;
  document.getElementById("sum-mrp").textContent = formatPrice(t.mrp);
  document.getElementById("sum-discount").textContent = "−" + formatPrice(t.mrp - t.price);
  const delEl = document.getElementById("sum-delivery");
  delEl.textContent = t.delivery ? formatPrice(t.delivery) : "FREE";
  delEl.classList.toggle("green", !t.delivery);
  document.getElementById("sum-total").textContent = formatPrice(t.total);
}

// Cart khaali ho to checkout ka matlab nahi — wapas cart par bhejo
if (cartItems().length === 0) {
  location.replace("cart.html");
}

// ---------- Saved address prefill ----------
try {
  const saved = JSON.parse(localStorage.getItem(ADDRESS_KEY));
  if (saved) {
    ["name", "phone", "address", "city", "pincode", "state", "email"].forEach((k) => {
      if (saved[k]) form.elements[k].value = saved[k];
    });
  }
} catch {}

// ---------- Payment method toggle ----------
const upiBox = document.getElementById("upi-box");
const cardBox = document.getElementById("card-box");

function updatePaymentUI() {
  const method = form.elements.payment.value;
  upiBox.classList.toggle("hidden", method !== "upi");
  cardBox.classList.toggle("hidden", method !== "card");
  document.querySelectorAll(".pay-opt").forEach((el) =>
    el.classList.toggle("selected", el.querySelector("input").checked)
  );
}
form.addEventListener("change", (e) => {
  if (e.target.name === "payment" || e.target.name === "delivery") updatePaymentUI();
  if (e.target.name === "delivery") renderSummary();
});

// ---------- Input formatting ----------
const onlyDigits = (el) => (el.value = el.value.replace(/\D/g, ""));
form.elements.phone.addEventListener("input", (e) => onlyDigits(e.target));
form.elements.pincode.addEventListener("input", (e) => onlyDigits(e.target));
form.elements.cardCvv.addEventListener("input", (e) => onlyDigits(e.target));
form.elements.cardNumber.addEventListener("input", (e) => {
  const d = e.target.value.replace(/\D/g, "").slice(0, 16);
  e.target.value = d.replace(/(.{4})/g, "$1 ").trim();
});
form.elements.cardExpiry.addEventListener("input", (e) => {
  const d = e.target.value.replace(/\D/g, "").slice(0, 4);
  e.target.value = d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
});

// ---------- Validation ----------
function setError(name, msg) {
  const input = form.elements[name];
  const err = input.closest("label").querySelector(".err");
  err.textContent = msg || "";
  input.classList.toggle("invalid", !!msg);
  return !msg;
}

function validate() {
  const v = (n) => form.elements[n].value.trim();
  const checks = [
    setError("name", v("name").length < 2 ? "Naam daalein" : ""),
    setError("phone", /^[6-9]\d{9}$/.test(v("phone")) ? "" : "Sahi 10-digit mobile number daalein"),
    setError("address", v("address").length < 8 ? "Poora address daalein" : ""),
    setError("city", v("city") ? "" : "City daalein"),
    setError("pincode", /^[1-9]\d{5}$/.test(v("pincode")) ? "" : "Sahi 6-digit pincode daalein"),
    setError("state", v("state") ? "" : "State chunein"),
    setError("email", !v("email") || /^\S+@\S+\.\S+$/.test(v("email")) ? "" : "Sahi email daalein"),
  ];

  const method = form.elements.payment.value;
  // Pehle saare payment errors saaf karo
  ["upi", "cardNumber", "cardExpiry", "cardCvv"].forEach((n) => setError(n, ""));

  if (method === "upi") {
    checks.push(setError("upi", /^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(v("upi")) ? "" : "Sahi UPI ID daalein (jaise name@upi)"));
  }
  if (method === "card") {
    const num = v("cardNumber").replace(/\s/g, "");
    checks.push(setError("cardNumber", /^\d{16}$/.test(num) ? "" : "16-digit card number daalein"));
    const m = v("cardExpiry").match(/^(\d{2})\/(\d{2})$/);
    let expOk = false;
    if (m) {
      const month = Number(m[1]);
      const year = 2000 + Number(m[2]);
      const now = new Date();
      expOk = month >= 1 && month <= 12 &&
        (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1));
    }
    checks.push(setError("cardExpiry", expOk ? "" : "Sahi expiry daalein"));
    checks.push(setError("cardCvv", /^\d{3}$/.test(v("cardCvv")) ? "" : "3-digit CVV"));
  }

  return checks.every(Boolean);
}

// Typing karte hi us field ka error hata do
form.addEventListener("input", (e) => {
  if (e.target.classList.contains("invalid")) setError(e.target.name, "");
});

// ---------- Place order ----------
const PAYMENT_LABEL = { cod: "Cash on Delivery", upi: "UPI", card: "Card" };

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!validate()) {
    const first = form.querySelector(".invalid");
    if (first) first.focus();
    showToast("Kuch details galat ya missing hain");
    return;
  }

  const f = (n) => form.elements[n].value.trim();
  const address = {
    name: f("name"), phone: f("phone"), address: f("address"),
    city: f("city"), pincode: f("pincode"), state: f("state"), email: f("email"),
  };
  localStorage.setItem(ADDRESS_KEY, JSON.stringify(address)); // agli baar ke liye yaad rakho

  const items = cartItems();
  // Stock dobara check karo (ho sakta hai beech mein khatam ho gaya ho)
  const short = items.find(({ product, qty }) => product.stock !== undefined && qty > product.stock);
  if (short) {
    showToast(`${short.product.name}: sirf ${short.product.stock} stock mein hai. Cart update karein.`);
    return;
  }

  const t = totals(items);
  const method = form.elements.payment.value;
  const deliveryType = form.elements.delivery.value;
  const order = createOrder({
    buyer: address,
    items,
    delivery: deliveryType,
    deliveryCharge: t.delivery,
    payment: method,
  });
  const orderId = order.id;

  const delivery = new Date();
  delivery.setDate(delivery.getDate() + DELIVERY_OPTIONS[deliveryType].days);
  const deliveryStr = delivery.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  document.getElementById("order-id").textContent = orderId;
  document.getElementById("order-meta").textContent =
    `${t.count} item(s) · ${formatPrice(t.total)} · ${PAYMENT_LABEL[method]} · ${DELIVERY_OPTIONS[deliveryType].label} · Expected: ${deliveryStr}`;
  document.getElementById("order-address").innerHTML =
    `<strong>Delivering to:</strong><br>${escapeHtml(address.name)}, ${escapeHtml(address.phone)}<br>` +
    `${escapeHtml(address.address)}, ${escapeHtml(address.city)}, ${escapeHtml(address.state)} – ${escapeHtml(address.pincode)}`;

  saveCart({});
  document.getElementById("checkout-view").classList.add("hidden");
  document.getElementById("success-view").classList.remove("hidden");
  const steps = document.querySelectorAll("#steps li");
  steps[1].classList.replace("active", "done");
  steps[2].classList.add("done");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

renderSummary();
updatePaymentUI();
