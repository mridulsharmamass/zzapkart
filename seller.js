// =====================================================================
// Seller Dashboard — har seller sirf apna data dekh aur badal sakta hai
// =====================================================================
let me = currentSeller();
if (!me) {
  location.replace("seller.html");
  throw new Error("Not logged in");
}
const refreshMe = () => (me = getSeller(me.id));

const content = document.getElementById("content");
const modal = document.getElementById("modal");
const modalBox = document.getElementById("modal-box");

document.getElementById("shop-name").textContent = me.shopName;
document.getElementById("logout").addEventListener("click", () => {
  clearSession();
  location.href = "seller.html";
});

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
const isApproved = () => me.kyc && me.kyc.status === "approved";
const plan = () => activePlan(me);
const daysLeft = (ts) => Math.ceil((ts - Date.now()) / DAY);
const tile = (label, value, sub = "") =>
  `<div class="stat-tile"><span class="stat-label">${label}</span><span class="stat-value">${value}</span>${sub ? `<span class="stat-sub">${sub}</span>` : ""}</div>`;
const pill = (status) => `<span class="status-pill s-${esc(status).toLowerCase()}">${esc(status)}</span>`;
const PAY = { cod: "COD", upi: "UPI (Prepaid)", card: "Card (Prepaid)" };

function openModal(html) {
  modalBox.innerHTML = html;
  modal.classList.remove("hidden");
  modalBox.querySelector("input, select, textarea, button")?.focus();
}
function closeModal() {
  modal.classList.add("hidden");
  modalBox.innerHTML = "";
}
modal.addEventListener("click", (e) => {
  if (e.target === modal || e.target.closest("[data-close]")) closeModal();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

// Image file → chhota JPEG data URL (browser storage bachane ke liye)
function readImage(file, max = 700) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("File chunein"));
    if (!file.type.startsWith("image/")) return reject(new Error("Sirf image (JPG/PNG) upload karein"));
    if (file.size > 8 * 1024 * 1024) return reject(new Error("Image 8MB se chhoti honi chahiye"));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File padh nahi paaye"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image kharab hai"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Earnings helpers
function myShipments() { return shipmentsOfSeller(me.id); }
function payoutDate(sh) { return sh.deliveredAt + plan().payoutDays * DAY; }

// ---------------------------------------------------------------------
// Subscription: auto-renew / expiry check on load
// ---------------------------------------------------------------------
function activateSubscription(planId, mode) {
  const p = PLANS[planId];
  const sub = me.subscription;
  const now = Date.now();
  const base = mode === "renew" && sub && sub.expiresAt > now ? sub.expiresAt : now;
  const payments = me.payments || [];
  payments.unshift({ plan: planId, amount: p.price, at: now, type: mode });
  updateSeller(me.id, {
    subscription: { plan: planId, startedAt: now, expiresAt: base + SUBSCRIPTION_DAYS * DAY, reminded: false },
    adCredits: (me.adCredits || 0) + p.adCredits,
    payments,
  });
  refreshMe();
}

(function checkSubscription() {
  const sub = me.subscription;
  if (!sub) return;
  const left = daysLeft(sub.expiresAt);
  if (sub.expiresAt <= Date.now()) {
    if (me.autoRenew && !sub.cancelled) {
      activateSubscription(sub.plan, "auto-renew");
      notifySeller(me.id, `🔁 ${PLANS[sub.plan].name} plan auto-renew ho gaya (${formatPrice(PLANS[sub.plan].price)}, demo payment).`);
    } else if (!sub.expiredNotified) {
      updateSeller(me.id, { subscription: { ...sub, expiredNotified: true } });
      notifySeller(me.id, `⚠️ Aapka ${PLANS[sub.plan].name} plan expire ho gaya. Ab aap Free plan par ho.`);
      refreshMe();
    }
  } else if (left <= 5 && !sub.reminded) {
    updateSeller(me.id, { subscription: { ...sub, reminded: true } });
    notifySeller(me.id, `⏰ Reminder: ${PLANS[sub.plan].name} plan ${left} din mein expire hoga. ${me.autoRenew ? "Auto-renew ON hai." : "Renew karna na bhoolein."}`);
    refreshMe();
  }
})();

// ---------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------
const SECTIONS = [
  { id: "overview", icon: "🏠", label: "Overview", locked: true },
  { id: "products", icon: "📦", label: "Products", locked: true },
  { id: "orders", icon: "🛒", label: "Orders", locked: true },
  { id: "earnings", icon: "💰", label: "Earnings", locked: true },
  { id: "analytics", icon: "📊", label: "Sales Analytics", locked: true },
  { id: "subscription", icon: "⭐", label: "Subscription", locked: true },
  { id: "ads", icon: "📣", label: "Ads Console", locked: true },
  { id: "kyc", icon: "🪪", label: "KYC Verification", locked: false },
  { id: "notifications", icon: "🔔", label: "Notifications", locked: false },
];

function currentSection() {
  const id = location.hash.slice(1).split("/")[0];
  if (SECTIONS.some((s) => s.id === id)) return id;
  return isApproved() ? "overview" : "kyc";
}

function renderNav() {
  const cur = currentSection();
  const newOrders = isApproved() ? myShipments().filter((x) => x.shipment.status === "Placed").length : 0;
  document.getElementById("dash-nav").innerHTML = SECTIONS.map((s) => {
    const locked = s.locked && !isApproved();
    const count = s.id === "orders" && newOrders ? `<span class="badge">${newOrders}</span>` : "";
    return `<a href="#${s.id}" class="${s.id === cur ? "active" : ""} ${locked ? "locked" : ""}">
      <span>${s.icon}</span>${s.label}${locked ? " 🔒" : ""}${count}</a>`;
  }).join("");

  const unread = sellerNotifications(me.id).filter((n) => !n.read).length;
  const nc = document.getElementById("notif-count");
  nc.textContent = unread;
  nc.classList.toggle("hidden", unread === 0);
}

function renderBanner() {
  const b = [];
  const st = me.kyc.status;
  if (st === "not_submitted") b.push(`<div class="alert warn">🪪 Dashboard unlock karne ke liye <a href="#kyc">KYC complete karein</a>.</div>`);
  if (st === "pending") b.push(`<div class="alert info">⏳ Aapka KYC admin review mein hai. Approve hote hi poora dashboard khul jayega.</div>`);
  if (st === "rejected") b.push(`<div class="alert error">❌ KYC reject hua: ${esc(me.kyc.reason || "")} — <a href="#kyc">dobara submit karein</a>.</div>`);
  const sub = me.subscription;
  if (isApproved() && sub && sub.expiresAt > Date.now() && daysLeft(sub.expiresAt) <= 5) {
    b.push(`<div class="alert warn">⏰ Aapka <strong>${PLANS[sub.plan].name}</strong> plan ${daysLeft(sub.expiresAt)} din mein expire hoga (${fmtDate(sub.expiresAt)}). Auto-renew: <strong>${me.autoRenew ? "ON" : "OFF"}</strong> · <a href="#subscription">Manage</a></div>`);
  }
  document.getElementById("banner").innerHTML = b.join("");
}

let lastRoute = null;
function render() {
  refreshMe();
  renderNav();
  renderBanner();
  const id = currentSection();
  const sec = SECTIONS.find((s) => s.id === id);
  if (sec.locked && !isApproved()) {
    content.innerHTML = `
      <div class="panel locked-view">
        <div class="empty-emoji">🔒</div>
        <h2>${sec.label} abhi locked hai</h2>
        <p class="muted">KYC verify hone ke baad ye section khulega.</p>
        <a href="#kyc" class="btn">KYC Status dekho</a>
      </div>`;
    return;
  }
  VIEWS[id]();
  if (location.hash !== lastRoute) { window.scrollTo(0, 0); lastRoute = location.hash; }
}
window.addEventListener("hashchange", render);

// =====================================================================
// VIEWS
// =====================================================================
const VIEWS = {};

// ---------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------
VIEWS.overview = () => {
  const ships = myShipments();
  const earned = ships.filter((x) => x.shipment.status === "Delivered").reduce((s, x) => s + x.shipment.amount, 0);
  const pending = ships.filter((x) => x.shipment.status !== "Delivered").reduce((s, x) => s + x.shipment.amount, 0);
  const newCount = ships.filter((x) => x.shipment.status === "Placed").length;
  const prods = productsOfSeller(me.id);
  const p = plan();
  const sub = me.subscription;

  content.innerHTML = `
    <h1 class="dash-title">Namaste, ${esc(me.name.split(" ")[0])} 👋</h1>
    <div class="stat-grid">
      ${tile("Total Earnings", formatPrice(earned), "Delivered orders se")}
      ${tile("Pending Amount", formatPrice(pending), "Placed + Shipped")}
      ${tile("Orders", ships.length, newCount ? `<a href="#orders">${newCount} naye — process karo</a>` : "Sab process ho gaye")}
      ${tile("Products", `${prods.length}${p.productLimit === Infinity ? "" : " / " + p.productLimit}`, `<a href="#products">Manage</a>`)}
      ${tile("Plan", p.name, sub && sub.expiresAt > Date.now() ? "Expires " + fmtDate(sub.expiresAt) : `<a href="#subscription">Upgrade karo</a>`)}
      ${tile("Ad Credits", formatPrice(me.adCredits || 0), `<a href="#ads">Ads chalao</a>`)}
    </div>

    <div class="dash-cols">
      <section class="panel">
        <div class="panel-head"><h2>Recent Orders</h2><a href="#orders" class="link">View all →</a></div>
        ${ships.length ? `<table class="table">
          <thead><tr><th>Order</th><th>Buyer</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>${ships.slice(0, 5).map(({ order: o, shipment: sh }) => `
            <tr><td>#${esc(o.id)}<div class="muted">${fmtDate(o.createdAt)}</div></td>
            <td>${esc(o.buyer.name)}</td><td>${formatPrice(sh.amount)}</td><td>${pill(sh.status)}</td></tr>`).join("")}
          </tbody></table>` : `<p class="muted">Abhi koi order nahi. Products add karo aur store par dekho!</p>`}
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Notifications</h2><a href="#notifications" class="link">All →</a></div>
        ${sellerNotifications(me.id).slice(0, 5).map((n) => `
          <div class="notif ${n.read ? "" : "unread"}"><div>${esc(n.message)}</div><small class="muted">${fmtDateTime(n.at)}</small></div>`).join("") || `<p class="muted">Koi notification nahi.</p>`}
      </section>
    </div>`;
};

// ---------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------
VIEWS.products = () => {
  const prods = productsOfSeller(me.id);
  const p = plan();
  const atLimit = prods.length >= p.productLimit;

  content.innerHTML = `
    <div class="dash-head">
      <h1 class="dash-title">Products</h1>
      <button class="btn" id="add-product" ${atLimit ? "disabled" : ""}>+ Add Product</button>
    </div>
    <p class="muted">${prods.length} product(s) · ${p.name} plan limit: ${p.productLimit === Infinity ? "Unlimited" : p.productLimit}
      ${atLimit ? ` · <strong>Limit poori ho gayi</strong> — <a href="#subscription" class="link">plan upgrade karo</a>` : ""}</p>
    ${prods.length ? `
    <div class="table-wrap"><table class="table">
      <thead><tr><th></th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
      <tbody>${prods.map((x) => `
        <tr>
          <td><div class="thumb">${safeImg(x.image) ? `<img src="${safeImg(x.image)}" alt="" />` : "📦"}</div></td>
          <td><strong>${esc(x.name)}</strong><div class="muted clamp">${esc(x.description)}</div></td>
          <td>${esc(x.category)}</td>
          <td>${formatPrice(x.price)}${x.mrp > x.price ? `<div class="mrp">${formatPrice(x.mrp)}</div>` : ""}</td>
          <td class="${x.stock === 0 ? "text-danger" : x.stock <= 5 ? "text-warn" : ""}">${x.stock}${x.stock > 0 && x.stock <= 5 ? " (Low)" : ""}</td>
          <td>${x.stock > 0 ? pill("Live") : pill("Out of stock")}</td>
          <td class="row-actions">
            <button class="btn-sm btn-outline" data-edit="${x.id}">Edit</button>
            <button class="btn-sm btn-danger" data-del="${x.id}">Delete</button>
          </td>
        </tr>`).join("")}
      </tbody></table></div>` : `
    <div class="panel empty"><div class="empty-emoji">📦</div><p>Abhi koi product nahi. Pehla product add karo!</p></div>`}`;

  document.getElementById("add-product").addEventListener("click", () => productForm());
  content.querySelectorAll("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => productForm(prods.find((x) => x.id === Number(b.dataset.edit)))));
  content.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => {
      const x = prods.find((y) => y.id === Number(b.dataset.del));
      if (x && confirm(`"${x.name}" delete karna hai? Ye wapas nahi aayega.`)) {
        deleteSellerProduct(me.id, x.id);
        showToast("Product delete ho gaya");
        render();
      }
    }));
};

function productForm(existing) {
  const x = existing || {};
  openModal(`
    <form id="product-form" class="checkout-form" novalidate>
      <div class="modal-head"><h2>${existing ? "Edit Product" : "Add New Product"}</h2><button type="button" class="icon-btn" data-close aria-label="Close">✕</button></div>
      <div class="form-grid">
        <label class="full">Product Name
          <input name="name" value="${esc(x.name)}" placeholder="Red T-shirt" maxlength="80" />
          <small class="err"></small>
        </label>
        <label>Category
          <select name="category">${CATEGORIES.map((c) => `<option ${c.name === x.category ? "selected" : ""}>${c.name}</option>`).join("")}</select>
          <small class="err"></small>
        </label>
        <label>Available Stock
          <input name="stock" type="number" min="0" step="1" value="${x.stock ?? ""}" placeholder="100" />
          <small class="err"></small>
        </label>
        <label>Selling Price (₹)
          <input name="price" type="number" min="1" step="1" value="${x.price ?? ""}" placeholder="499" />
          <small class="err"></small>
        </label>
        <label>MRP (₹, optional)
          <input name="mrp" type="number" min="1" step="1" value="${x.mrp ?? ""}" placeholder="799" />
          <small class="err"></small>
        </label>
        <label class="full">Product Image ${existing ? "(nayi chunoge to badal jayegi)" : ""}
          <input name="image" type="file" accept="image/*" />
          <small class="err"></small>
        </label>
        <div class="full img-preview" id="img-preview">${safeImg(x.image) ? `<img src="${safeImg(x.image)}" alt="Preview" />` : ""}</div>
        <label class="full">Product Description
          <textarea name="description" rows="3" maxlength="500" placeholder="Cotton T-shirt for summer wear">${esc(x.description)}</textarea>
          <small class="err"></small>
        </label>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" data-close>Cancel</button>
        <button type="submit" class="btn">${existing ? "Save Changes" : "Add Product"}</button>
      </div>
    </form>`);

  const form = document.getElementById("product-form");
  let imageData = x.image || "";
  const setErr = (n, m) => {
    const el = form.elements[n];
    el.closest("label").querySelector(".err").textContent = m || "";
    el.classList.toggle("invalid", !!m);
    return !m;
  };

  form.elements.image.addEventListener("change", async () => {
    try {
      imageData = await readImage(form.elements.image.files[0]);
      document.getElementById("img-preview").innerHTML = `<img src="${imageData}" alt="Preview" />`;
      setErr("image", "");
    } catch (err) {
      setErr("image", err.message);
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = (n) => form.elements[n].value.trim();
    const price = Number(v("price"));
    const mrp = v("mrp") ? Number(v("mrp")) : 0;
    const stock = Number(v("stock"));
    const ok = [
      setErr("name", v("name").length < 3 ? "Product ka naam daalein (3+ letters)" : ""),
      setErr("price", !Number.isInteger(price) || price < 1 ? "Sahi price daalein" : ""),
      setErr("mrp", mrp && mrp < price ? "MRP price se kam nahi ho sakti" : ""),
      setErr("stock", v("stock") === "" || !Number.isInteger(stock) || stock < 0 ? "Stock 0 ya usse zyada" : ""),
      setErr("image", imageData ? "" : "Product image upload karein"),
      setErr("description", v("description").length < 10 ? "Thoda description likhein (10+ letters)" : ""),
    ].every(Boolean);
    if (!ok) return;

    if (!existing && productsOfSeller(me.id).length >= plan().productLimit) {
      showToast("Plan limit poori ho gayi — upgrade karein");
      return;
    }
    const product = {
      id: existing ? existing.id : Date.now(),
      sellerId: me.id,
      name: v("name"),
      category: v("category"),
      price,
      mrp: mrp || price,
      stock,
      image: imageData,
      description: v("description"),
      createdAt: existing ? existing.createdAt : Date.now(),
      updatedAt: Date.now(),
    };
    if (!saveSellerProduct(product)) return;
    closeModal();
    showToast(existing ? "Product update ho gaya ✓" : "Product add ho gaya — store par live hai ✓");
    render();
  });
}

// ---------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------
let orderFilter = "all";
const COURIERS = ["Delhivery", "Blue Dart", "DTDC", "Ekart", "India Post", "Self Delivery"];

VIEWS.orders = () => {
  const ships = myShipments();
  const counts = { all: ships.length, Placed: 0, Shipped: 0, Delivered: 0 };
  ships.forEach((x) => counts[x.shipment.status]++);
  const list = orderFilter === "all" ? ships : ships.filter((x) => x.shipment.status === orderFilter);
  const tabs = [["all", "All"], ["Placed", "New"], ["Shipped", "Shipped"], ["Delivered", "Delivered"]];

  content.innerHTML = `
    <h1 class="dash-title">Orders</h1>
    <div class="filter-tabs">${tabs.map(([k, l]) =>
      `<button class="chip ${orderFilter === k ? "active" : ""}" data-filter="${k}">${l} (${counts[k]})</button>`).join("")}</div>
    ${list.length ? list.map(({ order: o, shipment: sh }) => `
      <section class="panel order-card">
        <div class="order-head">
          <div><strong>Order #${esc(o.id)}</strong><div class="muted">${fmtDateTime(o.createdAt)}</div></div>
          ${pill(sh.status)}
        </div>
        <div class="order-grid">
          <div>
            <h4>Buyer</h4>
            <p>${esc(o.buyer.name)} · ${esc(o.buyer.phone)}</p>
            <p class="muted">${esc(o.buyer.address)}, ${esc(o.buyer.city)}, ${esc(o.buyer.state)} – ${esc(o.buyer.pincode)}</p>
          </div>
          <div>
            <h4>Items</h4>
            ${sh.items.map((it) => `<p>${esc(it.name)} × ${it.qty} <span class="muted">(${formatPrice(it.price * it.qty)})</span></p>`).join("")}
          </div>
          <div>
            <h4>Details</h4>
            <p>Total: <strong>${formatPrice(sh.amount)}</strong></p>
            <p class="muted">${esc(DELIVERY_OPTIONS[o.delivery]?.label || "")} · ${PAY[o.payment] || ""}</p>
            ${sh.trackingId ? `<p class="muted">Tracking: ${esc(sh.trackingId)} (${esc(sh.courier)})</p>` : ""}
          </div>
        </div>
        ${sh.status === "Placed" ? `
          <form class="ship-form" data-order="${esc(o.id)}">
            <select name="courier" aria-label="Courier">${COURIERS.map((c) => `<option>${c}</option>`).join("")}</select>
            <input name="tracking" placeholder="Tracking ID (optional for Self Delivery)" maxlength="40" />
            <button class="btn" type="submit">📦 Mark as Shipped</button>
          </form>` : ""}
        ${sh.status === "Shipped" ? `<button class="btn" data-deliver="${esc(o.id)}">✅ Mark as Delivered</button>` : ""}
        ${sh.status === "Delivered" ? `<p class="green">✓ Delivered ${fmtDate(sh.deliveredAt)} · Payout: ${fmtDate(payoutDate(sh))}</p>` : ""}
      </section>`).join("") : `<div class="panel empty"><div class="empty-emoji">🛒</div><p>Is filter mein koi order nahi.</p></div>`}`;

  content.querySelectorAll("[data-filter]").forEach((b) =>
    b.addEventListener("click", () => { orderFilter = b.dataset.filter; render(); }));

  content.querySelectorAll(".ship-form").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    const courier = f.elements.courier.value;
    const tracking = f.elements.tracking.value.trim();
    if (courier !== "Self Delivery" && tracking.length < 4) {
      f.elements.tracking.classList.add("invalid");
      showToast("Courier ke liye Tracking ID daalein");
      return;
    }
    updateShipment(f.dataset.order, me.id, "Shipped", { courier, trackingId: tracking });
    showToast("Order shipped — buyer ko notification chala gaya ✓");
    render();
  }));

  content.querySelectorAll("[data-deliver]").forEach((b) => b.addEventListener("click", () => {
    updateShipment(b.dataset.deliver, me.id, "Delivered");
    notifySeller(me.id, `✅ Order #${b.dataset.deliver} delivered. Payout ${plan().payoutDays} din mein schedule hua.`);
    showToast("Order delivered ✓");
    render();
  }));
};

// ---------------------------------------------------------------------
// Earnings
// ---------------------------------------------------------------------
VIEWS.earnings = () => {
  const ships = myShipments();
  const delivered = ships.filter((x) => x.shipment.status === "Delivered");
  const now = Date.now();
  const paid = delivered.filter((x) => payoutDate(x.shipment) <= now);
  const scheduled = delivered.filter((x) => payoutDate(x.shipment) > now);
  const sum = (arr) => arr.reduce((s, x) => s + x.shipment.amount, 0);
  const inProgress = ships.filter((x) => x.shipment.status !== "Delivered");

  content.innerHTML = `
    <h1 class="dash-title">Earnings Overview</h1>
    <div class="stat-grid">
      ${tile("Total Earned", formatPrice(sum(delivered)), `${delivered.length} delivered order(s)`)}
      ${tile("Paid Out", formatPrice(sum(paid)), "Aapke bank account mein")}
      ${tile("Upcoming Payouts", formatPrice(sum(scheduled)), `${scheduled.length} scheduled`)}
      ${tile("In Progress", formatPrice(sum(inProgress)), "Delivery ke baad milega")}
    </div>
    <div class="alert info">💳 Payout policy (${plan().name} plan): delivery ke <strong>${plan().payoutDays} din</strong> baad payment aapke account mein. Prepaid (UPI/Card) aur COD dono ke liye.</div>
    <section class="panel">
      <h2>Payouts</h2>
      ${delivered.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Order</th><th>Delivered</th><th>Payment</th><th>Amount</th><th>Payout Date</th><th>Status</th></tr></thead>
        <tbody>${delivered.map(({ order: o, shipment: sh }) => `
          <tr><td>#${esc(o.id)}</td><td>${fmtDate(sh.deliveredAt)}</td><td>${PAY[o.payment] || ""}</td>
          <td>${formatPrice(sh.amount)}</td><td>${fmtDate(payoutDate(sh))}</td>
          <td>${payoutDate(sh) <= now ? pill("Paid") : pill("Scheduled")}</td></tr>`).join("")}
        </tbody></table></div>` : `<p class="muted">Abhi koi delivered order nahi. Order deliver hote hi payout yahan dikhega.</p>`}
    </section>`;
};

// ---------------------------------------------------------------------
// Sales Analytics
// ---------------------------------------------------------------------
let period = "daily";

function startOfDay(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }

function buckets(kind) {
  const now = Date.now();
  const out = [];
  if (kind === "daily") {
    for (let i = 6; i >= 0; i--) {
      const start = startOfDay(now - i * DAY);
      out.push({ start, end: start + DAY, label: new Date(start).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) });
    }
  } else if (kind === "weekly") {
    const today = startOfDay(now);
    for (let i = 7; i >= 0; i--) {
      const end = today + DAY - i * 7 * DAY;
      const start = end - 7 * DAY;
      out.push({ start, end, label: new Date(start).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) });
    }
  } else {
    const d = new Date(now);
    for (let i = 5; i >= 0; i--) {
      const s = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const e = new Date(d.getFullYear(), d.getMonth() - i + 1, 1);
      out.push({ start: s.getTime(), end: e.getTime(), label: s.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }) });
    }
  }
  return out;
}

function niceMax(v) {
  if (v <= 0) return 1000;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * mag >= v) return m * mag;
  return 10 * mag;
}

function shortMoney(n) {
  if (n >= 100000) return "₹" + (n / 100000).toFixed(n % 100000 ? 1 : 0) + "L";
  if (n >= 1000) return "₹" + (n / 1000).toFixed(n % 1000 ? 1 : 0) + "k";
  return "₹" + n;
}

// Single-series bar chart (SVG) with hover tooltip
function barChart(data) {
  const W = 640, H = 240, padL = 48, padR = 8, padT = 12, padB = 28;
  const max = niceMax(Math.max(...data.map((d) => d.revenue)));
  const iw = W - padL - padR, ih = H - padT - padB;
  const slot = iw / data.length;
  const bw = Math.min(40, slot * 0.6);
  const y = (v) => padT + ih - (v / max) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  const grid = ticks.map((t) => `
    <line x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}" class="grid-line ${t === 0 ? "base" : ""}" />
    <text x="${padL - 8}" y="${y(t) + 4}" class="axis-label" text-anchor="end">${shortMoney(t)}</text>`).join("");

  const bars = data.map((d, i) => {
    const cx = padL + slot * i + slot / 2;
    const x = cx - bw / 2;
    const h = Math.max(0, ih - (y(d.revenue) - padT));
    const top = y(d.revenue);
    const r = Math.min(4, h);
    const path = h > 0
      ? `M${x},${padT + ih} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${padT + ih} Z`
      : "";
    return `
      <g class="bar-g" data-i="${i}">
        <rect x="${padL + slot * i}" y="${padT}" width="${slot}" height="${ih}" class="hit" />
        ${path ? `<path d="${path}" class="bar" />` : ""}
        <text x="${cx}" y="${H - 8}" class="axis-label" text-anchor="middle">${esc(d.label)}</text>
      </g>`;
  }).join("");

  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Revenue by period">${grid}${bars}</svg>`;
}

VIEWS.analytics = () => {
  const ships = myShipments();
  const bks = buckets(period).map((b) => {
    const inB = ships.filter((x) => x.order.createdAt >= b.start && x.order.createdAt < b.end);
    return {
      ...b,
      revenue: inB.reduce((s, x) => s + x.shipment.amount, 0),
      orders: inB.length,
      units: inB.reduce((s, x) => s + x.shipment.items.reduce((a, it) => a + it.qty, 0), 0),
    };
  });
  const tot = bks.reduce((a, b) => ({ revenue: a.revenue + b.revenue, orders: a.orders + b.orders, units: a.units + b.units }), { revenue: 0, orders: 0, units: 0 });
  const periodName = { daily: "Last 7 days", weekly: "Last 8 weeks", monthly: "Last 6 months" }[period];

  // Top products (all time)
  const byProduct = {};
  ships.forEach(({ shipment: sh }) => sh.items.forEach((it) => {
    byProduct[it.productId] = byProduct[it.productId] || { name: it.name, units: 0, revenue: 0 };
    byProduct[it.productId].units += it.qty;
    byProduct[it.productId].revenue += it.qty * it.price;
  }));
  const top = Object.values(byProduct).sort((a, b) => b.units - a.units).slice(0, 5);
  const topMax = top.length ? top[0].units : 1;

  // Customer behaviour
  const prods = productsOfSeller(me.id);
  const behaviour = prods.map((p) => {
    const st = productStats(p.id);
    const sold = byProduct[p.id] ? byProduct[p.id].units : 0;
    return { name: p.name, views: st.views, carts: st.carts, sold, abandoned: Math.max(0, st.carts - sold) };
  });
  const bt = behaviour.reduce((a, b) => ({ views: a.views + b.views, carts: a.carts + b.carts, sold: a.sold + b.sold, abandoned: a.abandoned + b.abandoned }), { views: 0, carts: 0, sold: 0, abandoned: 0 });
  const conv = bt.views ? ((bt.sold / bt.views) * 100).toFixed(1) + "%" : "—";

  content.innerHTML = `
    <div class="dash-head">
      <h1 class="dash-title">Sales Analytics</h1>
      <div class="filter-tabs">${[["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"]].map(([k, l]) =>
        `<button class="chip ${period === k ? "active" : ""}" data-period="${k}">${l}</button>`).join("")}</div>
    </div>
    <div class="stat-grid">
      ${tile("Earned", formatPrice(tot.revenue), periodName)}
      ${tile("Orders", tot.orders, periodName)}
      ${tile("Units Sold", tot.units, periodName)}
      ${tile("Avg Order Value", tot.orders ? formatPrice(Math.round(tot.revenue / tot.orders)) : "—", periodName)}
    </div>

    <section class="panel">
      <h2>Revenue — ${periodName}</h2>
      <div class="chart-wrap" id="chart-wrap">${barChart(bks)}</div>
      <details class="data-table"><summary>Data table</summary>
        <table class="table"><thead><tr><th>Period</th><th>Revenue</th><th>Orders</th><th>Units</th></tr></thead>
        <tbody>${bks.map((b) => `<tr><td>${esc(b.label)}</td><td>${formatPrice(b.revenue)}</td><td>${b.orders}</td><td>${b.units}</td></tr>`).join("")}</tbody></table>
      </details>
    </section>

    <div class="dash-cols">
      <section class="panel">
        <h2>Top Selling Products</h2>
        ${top.length ? top.map((t, i) => `
          <div class="rank-row">
            <div class="rank-label"><span>${i + 1}. ${esc(t.name)}</span><span class="muted">${t.units} sold · ${formatPrice(t.revenue)}</span></div>
            <div class="rank-track"><div class="rank-bar" style="width:${(t.units / topMax) * 100}%"></div></div>
          </div>`).join("") : `<p class="muted">Abhi koi sale nahi.</p>`}
      </section>

      <section class="panel ${plan().detailedReports ? "" : "gated"}">
        <h2>Customer Behaviour</h2>
        ${plan().detailedReports ? `
          <div class="stat-grid small">
            ${tile("Product Views", bt.views)}
            ${tile("Added to Cart", bt.carts)}
            ${tile("Abandoned Cart", bt.abandoned)}
            ${tile("Conversion", conv, "Sold ÷ Views")}
          </div>
          ${behaviour.length ? `<div class="table-wrap"><table class="table">
            <thead><tr><th>Product</th><th>Views</th><th>Cart</th><th>Sold</th><th>Abandoned</th></tr></thead>
            <tbody>${behaviour.map((b) => `<tr><td>${esc(b.name)}</td><td>${b.views}</td><td>${b.carts}</td><td>${b.sold}</td><td>${b.abandoned}</td></tr>`).join("")}</tbody>
          </table></div>` : ""}
          <p class="muted">Views = store par product kitni baar dikha. Abandoned = cart mein daala par khareeda nahi.</p>`
        : `<div class="gate-msg">🔒 Detailed reports (views, clicks, abandoned cart) <strong>Advanced</strong> aur <strong>Premium</strong> plan mein milte hain.<br><a href="#subscription" class="btn">Upgrade karo</a></div>`}
      </section>
    </div>`;

  content.querySelectorAll("[data-period]").forEach((b) =>
    b.addEventListener("click", () => { period = b.dataset.period; render(); }));

  // Hover tooltip
  const tip = document.getElementById("chart-tip");
  const wrap = document.getElementById("chart-wrap");
  wrap.addEventListener("mousemove", (e) => {
    const g = e.target.closest(".bar-g");
    wrap.querySelectorAll(".bar-g").forEach((x) => x.classList.toggle("hover", x === g));
    if (!g) { tip.classList.add("hidden"); return; }
    const d = bks[Number(g.dataset.i)];
    tip.innerHTML = `<strong>${esc(d.label)}</strong><div>Revenue: ${formatPrice(d.revenue)}</div><div>Orders: ${d.orders} · Units: ${d.units}</div>`;
    tip.classList.remove("hidden");
    const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    tip.style.left = x + "px";
    tip.style.top = e.clientY + 14 + "px";
  });
  wrap.addEventListener("mouseleave", () => {
    tip.classList.add("hidden");
    wrap.querySelectorAll(".bar-g").forEach((x) => x.classList.remove("hover"));
  });
};

// ---------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------
const PLAN_FEATURES = {
  basic: ["10 product listings", "Payout delivery ke 7 din baad", "Basic sales reports", "Standard visibility"],
  advanced: ["50 product listings", "Payout 3 din mein", "Detailed reports + customer behaviour", "₹500 free ad credits / month"],
  premium: ["Unlimited products", "Next-day payout", "★ Featured badge + homepage/top placement", "Detailed reports + customer behaviour", "₹2,000 free ad credits / month"],
};

VIEWS.subscription = () => {
  const sub = me.subscription;
  const active = sub && sub.expiresAt > Date.now();
  const cur = active ? sub.plan : "free";
  const curIdx = PLAN_ORDER.indexOf(cur);

  content.innerHTML = `
    <h1 class="dash-title">Subscription</h1>
    <section class="panel current-plan">
      <div>
        <span class="muted">Current plan</span>
        <h2 class="plan-name">${PLANS[cur].name}</h2>
        ${active
          ? `<p>Expires on <strong>${fmtDate(sub.expiresAt)}</strong> (${daysLeft(sub.expiresAt)} din baaki)</p>`
          : sub ? `<p class="text-danger">${PLANS[sub.plan].name} plan ${fmtDate(sub.expiresAt)} ko expire ho gaya.</p>`
          : `<p class="muted">Free plan: ${PLANS.free.productLimit} products, payout ${PLANS.free.payoutDays} din.</p>`}
        <p class="muted">Ad credits balance: ${formatPrice(me.adCredits || 0)}</p>
      </div>
      <label class="switch">
        <input type="checkbox" id="auto-renew" ${me.autoRenew ? "checked" : ""} />
        <span>Auto-renew ${me.autoRenew ? "ON" : "OFF"}</span>
      </label>
    </section>

    <div class="plan-grid">
      ${PLAN_ORDER.map((id, i) => {
        const p = PLANS[id];
        let action;
        if (id === cur) action = `<button class="btn" data-plan="${id}" data-mode="renew">Renew (+30 din)</button>`;
        else if (i > curIdx) action = `<button class="btn" data-plan="${id}" data-mode="upgrade">${cur === "free" ? "Choose" : "Upgrade"}</button>`;
        else action = `<button class="btn btn-outline" data-plan="${id}" data-mode="downgrade">Downgrade</button>`;
        return `
          <div class="plan-card ${id === cur ? "current" : ""} ${id === "advanced" ? "popular" : ""}">
            ${id === "advanced" ? `<span class="ad-tag">Most Popular</span>` : ""}
            ${id === cur ? `<span class="ad-tag featured">Current</span>` : ""}
            <h3>${p.name}</h3>
            <div class="plan-price">${formatPrice(p.price)}<span>/month</span></div>
            <ul>${PLAN_FEATURES[id].map((f) => `<li>✓ ${f}</li>`).join("")}</ul>
            ${action}
          </div>`;
      }).join("")}
    </div>

    <section class="panel">
      <h2>Payment History</h2>
      ${(me.payments || []).length ? `<table class="table"><thead><tr><th>Date</th><th>Plan</th><th>Type</th><th>Amount</th></tr></thead>
        <tbody>${me.payments.map((p) => `<tr><td>${fmtDate(p.at)}</td><td>${PLANS[p.plan].name}</td><td>${esc(p.type)}</td><td>${formatPrice(p.amount)}</td></tr>`).join("")}</tbody></table>`
        : `<p class="muted">Abhi koi payment nahi.</p>`}
    </section>`;

  document.getElementById("auto-renew").addEventListener("change", (e) => {
    updateSeller(me.id, { autoRenew: e.target.checked });
    showToast("Auto-renew " + (e.target.checked ? "ON" : "OFF"));
    render();
  });

  content.querySelectorAll("[data-plan]").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.plan, mode = b.dataset.mode, p = PLANS[id];
    const count = productsOfSeller(me.id).length;
    if (mode === "downgrade" && count > p.productLimit) {
      showToast(`${p.name} mein ${p.productLimit} products ki limit hai. Pehle ${count - p.productLimit} product(s) delete karein.`);
      return;
    }
    openModal(`
      <form id="pay-form" class="checkout-form">
        <div class="modal-head"><h2>${mode === "renew" ? "Renew" : mode === "upgrade" ? "Activate" : "Switch to"} ${p.name}</h2><button type="button" class="icon-btn" data-close aria-label="Close">✕</button></div>
        <p>Amount: <strong>${formatPrice(p.price)}</strong> for ${SUBSCRIPTION_DAYS} days</p>
        ${mode !== "renew" ? `<p class="muted">Naya plan abhi se shuru hoga.</p>` : `<p class="muted">Current expiry ke baad 30 din jud jayenge.</p>`}
        <div class="pay-options">
          <label class="pay-opt selected"><input type="radio" name="m" value="upi" checked /><span>📲 UPI</span></label>
          <label class="pay-opt"><input type="radio" name="m" value="card" /><span>💳 Card</span></label>
        </div>
        <p class="demo-note">⚠️ Demo payment — koi paisa nahi katega.</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" data-close>Cancel</button>
          <button type="submit" class="btn">Pay ${formatPrice(p.price)}</button>
        </div>
      </form>`);
    const pf = document.getElementById("pay-form");
    pf.addEventListener("change", () => pf.querySelectorAll(".pay-opt").forEach((l) => l.classList.toggle("selected", l.querySelector("input").checked)));
    pf.addEventListener("submit", (e) => {
      e.preventDefault();
      activateSubscription(id, mode);
      notifySeller(me.id, `⭐ ${p.name} plan active! Valid till ${fmtDate(me.subscription.expiresAt)}.${p.adCredits ? ` ${formatPrice(p.adCredits)} ad credits add hue.` : ""}`);
      closeModal();
      showToast(`${p.name} plan active ✓`);
      render();
    });
  }));
};

// ---------------------------------------------------------------------
// Advertising → seller-ads.js (Ads Console)
// ---------------------------------------------------------------------
VIEWS.ads = () => renderAdsView();

// ---------------------------------------------------------------------
// KYC
// ---------------------------------------------------------------------
const DOC_TYPES = {
  aadhaar: { label: "Aadhaar Card", hint: "12 digit", test: (v) => /^\d{12}$/.test(v.replace(/\s/g, "")) },
  pan: { label: "PAN Card", hint: "ABCDE1234F", test: (v) => /^[A-Z]{5}\d{4}[A-Z]$/.test(v.toUpperCase()) },
  license: { label: "Business License / GST", hint: "5+ characters", test: (v) => /^[A-Za-z0-9\-\/]{5,20}$/.test(v) },
};
const ADDRESS_PROOFS = ["Aadhaar Card", "Electricity / Utility Bill", "Bank Statement", "Rent Agreement", "Passport"];
const mask = (v) => (v.length > 4 ? "•".repeat(v.length - 4) + v.slice(-4) : v);

VIEWS.kyc = () => {
  const k = me.kyc;
  const steps = [
    ["Account created", true],
    ["KYC submitted", k.status === "pending" || k.status === "approved"],
    ["Admin verified", k.status === "approved"],
  ];
  const stepper = `<ol class="track kyc-track">${steps.map(([l, d]) => `<li class="${d ? "done" : ""}"><span>${l}</span></li>`).join("")}</ol>`;

  if (k.status === "approved") {
    content.innerHTML = `
      <h1 class="dash-title">KYC Verification</h1>
      ${stepper}
      <section class="panel kyc-ok">
        <div class="success-icon">✓</div>
        <h2>KYC Verified</h2>
        <p>${DOC_TYPES[k.docType].label}: ${esc(mask(k.docNumber))} · Verified on ${fmtDate(k.reviewedAt)}</p>
        <a href="#overview" class="btn">Go to Dashboard</a>
      </section>`;
    return;
  }
  if (k.status === "pending") {
    content.innerHTML = `
      <h1 class="dash-title">KYC Verification</h1>
      ${stepper}
      <section class="panel">
        <h2>⏳ Review pending</h2>
        <p>Aapke documents submit ho gaye hain (${fmtDateTime(k.submittedAt)}). Admin verify karte hi aapko notification milega.</p>
        <p class="muted">${DOC_TYPES[k.docType].label}: ${esc(mask(k.docNumber))} · Address proof: ${esc(k.addressProofType)}</p>
        <p class="demo-note">Demo: approve karne ke liye <a href="admin.html" class="link" target="_blank">Admin panel</a> kholo, phir yahan refresh karo.</p>
      </section>`;
    return;
  }

  content.innerHTML = `
    <h1 class="dash-title">KYC Verification</h1>
    ${stepper}
    ${k.status === "rejected" ? `<div class="alert error">❌ Pichhla KYC reject hua: <strong>${esc(k.reason)}</strong>. Sahi documents ke saath dobara submit karein.</div>` : ""}
    <form id="kyc-form" class="panel checkout-form" novalidate>
      <p class="muted">Platform ko safe rakhne ke liye har seller ka KYC zaroori hai. Documents sirf verification ke liye use hote hain.</p>
      <div class="form-grid">
        <label>ID Document Type
          <select name="docType">${Object.entries(DOC_TYPES).map(([id, d]) => `<option value="${id}">${d.label}</option>`).join("")}</select>
        </label>
        <label>Document Number
          <input name="docNumber" placeholder="12 digit" autocomplete="off" maxlength="20" />
          <small class="err"></small>
        </label>
        <label class="full">Upload ID Document (photo/scan)
          <input name="idFile" type="file" accept="image/*" />
          <small class="err"></small>
        </label>
        <label>Address Proof Type
          <select name="addressProofType">${ADDRESS_PROOFS.map((a) => `<option>${a}</option>`).join("")}</select>
        </label>
        <label>Upload Address Proof
          <input name="addrFile" type="file" accept="image/*" />
          <small class="err"></small>
        </label>
        <label class="full">Business / Pickup Address
          <textarea name="address" rows="2" placeholder="Shop no, street, city, state, pincode"></textarea>
          <small class="err"></small>
        </label>
      </div>
      <button class="btn checkout-btn" type="submit">Submit for Verification</button>
    </form>`;

  const f = document.getElementById("kyc-form");
  const setErr = (n, m) => {
    const el = f.elements[n];
    el.closest("label").querySelector(".err").textContent = m || "";
    el.classList.toggle("invalid", !!m);
    return !m;
  };
  f.elements.docType.addEventListener("change", () => (f.elements.docNumber.placeholder = DOC_TYPES[f.elements.docType.value].hint));
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const docType = f.elements.docType.value;
    const docNumber = f.elements.docNumber.value.trim().replace(/\s/g, "").toUpperCase();
    let idImage = "", addrImage = "";
    const ok1 = setErr("docNumber", DOC_TYPES[docType].test(docNumber) ? "" : `Sahi ${DOC_TYPES[docType].label} number daalein (${DOC_TYPES[docType].hint})`);
    const ok2 = setErr("address", f.elements.address.value.trim().length < 15 ? "Poora address daalein" : "");
    let ok3 = true, ok4 = true;
    try { idImage = await readImage(f.elements.idFile.files[0], 900); setErr("idFile", ""); } catch (err) { ok3 = setErr("idFile", err.message); }
    try { addrImage = await readImage(f.elements.addrFile.files[0], 900); setErr("addrFile", ""); } catch (err) { ok4 = setErr("addrFile", err.message); }
    if (!(ok1 && ok2 && ok3 && ok4)) return;

    const saved = updateSeller(me.id, {
      kyc: {
        status: "pending",
        docType,
        docNumber,
        idImage,
        addressProofType: f.elements.addressProofType.value,
        addrImage,
        address: f.elements.address.value.trim(),
        submittedAt: Date.now(),
      },
    });
    if (!saved) return;
    notifySeller(me.id, "📄 KYC documents submit ho gaye. Admin review ka intezaar karein.");
    showToast("KYC submitted ✓");
    render();
  });
};

// ---------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------
VIEWS.notifications = () => {
  const list = sellerNotifications(me.id);
  content.innerHTML = `
    <h1 class="dash-title">Notifications</h1>
    <section class="panel">
      ${list.map((n) => `<div class="notif ${n.read ? "" : "unread"}"><div>${esc(n.message)}</div><small class="muted">${fmtDateTime(n.at)}</small></div>`).join("") || `<p class="muted">Koi notification nahi.</p>`}
    </section>`;
  markSellerNotifsRead(me.id);
  setTimeout(renderNav, 0);
};

// Doosre tab mein data badle (jaise admin ne KYC approve kiya) to refresh
window.addEventListener("storage", (e) => {
  if (e.key && e.key.startsWith("zk_") && modal.classList.contains("hidden")) render();
});

render();
