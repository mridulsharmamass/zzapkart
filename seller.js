// =====================================================================
// Seller Dashboard — each seller can only see and change their own data
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

// Image file (any size, via media.js loadImageFromFile) → small JPEG data URL (saves browser storage)
function readImage(file, max = 700) {
  if (!file) return Promise.reject(new Error("Choose a file"));
  return loadImageFromFile(file).then(({ img, url }) => {
    try {
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.naturalWidth * scale));
      c.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.8);
    } finally {
      URL.revokeObjectURL(url);
    }
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
      notifySeller(me.id, `🔁 ${PLANS[sub.plan].name} plan auto-renewed (${formatPrice(PLANS[sub.plan].price)}, demo payment).`);
    } else if (!sub.expiredNotified) {
      updateSeller(me.id, { subscription: { ...sub, expiredNotified: true } });
      notifySeller(me.id, `⚠️ Your ${PLANS[sub.plan].name} plan has expired. You're now on the Free plan.`);
      refreshMe();
    }
  } else if (left <= 5 && !sub.reminded) {
    updateSeller(me.id, { subscription: { ...sub, reminded: true } });
    notifySeller(me.id, `⏰ Reminder: ${PLANS[sub.plan].name} plan expires in ${left} day(s). ${me.autoRenew ? "Auto-renew is ON." : "Don't forget to renew."}`);
    refreshMe();
  }
})();

// ---------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------
const SECTIONS = [
  { id: "overview", icon: "🏠", label: "Overview", locked: true },
  { id: "listings", icon: "📦", label: "My Listings", locked: true },
  { id: "add-listing", icon: "➕", label: "Add Listing", locked: true },
  { id: "bulk", icon: "📄", label: "Bulk Upload", locked: true },
  { id: "approvals", icon: "🔒", label: "Category Approvals", locked: true },
  { id: "orders", icon: "🛒", label: "Orders", locked: true },
  { id: "earnings", icon: "💰", label: "Payments", locked: true },
  { id: "analytics", icon: "📊", label: "Sales Analytics", locked: true },
  { id: "ads", icon: "📣", label: "Ads Console", locked: true },
  { id: "store", icon: "🏬", label: "Brand Store", locked: true },
  { id: "subscription", icon: "⭐", label: "Subscription", locked: true },
  { id: "profile", icon: "🏦", label: "Profile & Bank", locked: false },
  { id: "kyc", icon: "🪪", label: "KYC Verification", locked: false },
  { id: "guidelines", icon: "📘", label: "Listing Guidelines", locked: false },
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
    const badges = isApproved() ? { orders: newOrders, listings: listingsOfSeller(me.id).filter((l) => l.status === "qc_failed").length, profile: bankStatus() === "verified" ? 0 : "!" } : {};
    const count = badges[s.id] ? `<span class="badge">${badges[s.id]}</span>` : "";
    const pro = s.id === "store" && !plan().brandStore ? `<span class="nav-pro">PREMIUM</span>` : "";
    return `<a href="#${s.id}" class="${s.id === cur ? "active" : ""} ${locked ? "locked" : ""}">
      <span>${s.icon}</span>${s.label}${locked ? " 🔒" : ""}${count}${pro}</a>`;
  }).join("");

  const storeLink = document.querySelector(".dash-store-link");
  if (storeLink) {
    const mine = storeIsActive(me);
    storeLink.href = mine ? storeUrl(me.store.live.slug) : "index.html";
    storeLink.textContent = mine ? "↗ View my Brand Store" : "↗ View Store";
  }

  const unread = sellerNotifications(me.id).filter((n) => !n.read).length;
  const nc = document.getElementById("notif-count");
  nc.textContent = unread;
  nc.classList.toggle("hidden", unread === 0);
}

function renderBanner() {
  const b = [];
  const st = me.kyc.status;
  if (st === "not_submitted") b.push(`<div class="alert warn">🪪 <a href="#kyc">Complete your KYC</a> to unlock the full dashboard.</div>`);
  if (st === "pending") b.push(`<div class="alert info">⏳ Your KYC is being reviewed. The full dashboard unlocks as soon as it's approved.</div>`);
  if (st === "rejected") b.push(`<div class="alert error">❌ KYC rejected: ${esc(me.kyc.reason || "")} — <a href="#kyc">please submit again</a>.</div>`);
  if (me.suspended) b.push(`<div class="alert error">⛔ Zzapkart has suspended your seller account: <strong>${esc(me.suspended.reason || "")}</strong>. Until then your products and Brand Store are hidden from shoppers. Please contact support.</div>`);
  const sub = me.subscription;
  if (isApproved() && sub && sub.expiresAt > Date.now() && daysLeft(sub.expiresAt) <= 5) {
    b.push(`<div class="alert warn">⏰ Your <strong>${PLANS[sub.plan].name}</strong> plan expires in ${daysLeft(sub.expiresAt)} day(s) (${fmtDate(sub.expiresAt)}). Auto-renew: <strong>${me.autoRenew ? "ON" : "OFF"}</strong> · <a href="#subscription">Manage</a></div>`);
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
        <h2>${sec.label} is locked</h2>
        <p class="muted">This section unlocks once your KYC is verified.</p>
        <a href="#kyc" class="btn">Check KYC status</a>
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
// Overview: to-do list + account health
// ---------------------------------------------------------------------
const shipFees = (sh) => (typeof sh.fees === "number" ? sh.fees : 0);
const shipNet = (sh) => (typeof sh.settlement === "number" ? sh.settlement : sh.amount);

function accountHealth() {
  const ships = myShipments();
  const now = Date.now();
  const shippedAt = (sh) => sh.shippedAt || (sh.history.find((h) => h.status === "Shipped") || {}).at;
  const dispatched = ships.filter((x) => shippedAt(x.shipment));
  const late = dispatched.filter((x) => x.shipment.dispatchBy && shippedAt(x.shipment) > x.shipment.dispatchBy);
  const breaching = ships.filter((x) => x.shipment.status === "Placed" && x.shipment.dispatchBy && now > x.shipment.dispatchBy);
  const ls = listingsOfSeller(me.id).filter((l) => l.status !== "archived");
  const submitted = ls.filter((l) => l.status !== "draft");
  const everFailed = submitted.filter((l) => (l.qcFailCount || 0) > 0);
  const lateRate = dispatched.length ? (late.length / dispatched.length) * 100 : 0;
  const qcRejRate = submitted.length ? (everFailed.length / submitted.length) * 100 : 0;
  const avgQuality = ls.length ? Math.round(ls.reduce((s, l) => s + (l.quality ?? listingQuality(l).score), 0) / ls.length) : 0;
  const atRisk = lateRate > 10 || breaching.length > 0;
  return { lateRate, breaching: breaching.length, qcRejRate, avgQuality, atRisk, dispatched: dispatched.length };
}

VIEWS.overview = () => {
  const ships = myShipments();
  const delivered = ships.filter((x) => x.shipment.status === "Delivered");
  const earned = delivered.reduce((s, x) => s + shipNet(x.shipment), 0);
  const pending = ships.filter((x) => x.shipment.status !== "Delivered").reduce((s, x) => s + shipNet(x.shipment), 0);
  const placed = ships.filter((x) => x.shipment.status === "Placed");
  const ls = listingsOfSeller(me.id);
  const by = (st) => ls.filter((l) => listingDisplayStatus(l) === st);
  const live = by("live");
  const lowStock = live.reduce((n, l) => n + l.variants.filter((v) => Number(v.stock) > 0 && Number(v.stock) <= 5).length, 0);
  const enhance = ls.filter((l) => l.status !== "archived" && (l.quality ?? listingQuality(l).score) < 75).length;
  const p = plan();
  const sub = me.subscription;
  const prof = me.profile || {};
  const h = accountHealth();
  const apprIssues = Object.keys(RESTRICTED).map((g) => approvalFor(me.id, g)).filter((a) => a && a.status !== "approved");

  const todos = [
    [placed.length, "Orders to dispatch", "#orders", "🛒"],
    [h.breaching, "Orders past their dispatch-by date — ship them now", "#orders", "⏰"],
    [by("qc_failed").length, "Listings with QC errors — fix and resubmit", "#listings/qc_failed", "❌"],
    [by("draft").length, "Complete your draft listings", "#listings/progress", "📝"],
    [by("out_of_stock").length, "Out-of-stock listings (hidden from search)", "#listings/oos", "📦"],
    [lowStock, "Sizes with 5 or fewer in stock", "#listings/live", "📉"],
    [enhance, "Improve listings (quality below 75%)", "#listings/enhance", "✨"],
    [bankStatus() === "verified" ? 0 : 1, "Verify your bank account — payouts need it", "#profile", "🏦"],
    [prof.gstin ? 0 : 1, "Add your GSTIN", "#profile", "🧾"],
    [sellerDefaults().has ? 0 : 1, "Save default manufacturer / packer / importer details", "#profile", "🏭"],
    [apprIssues.length, "Category approval pending / rejected", "#approvals", "🔒"],
    [by("qc_pending").length, "Listings in QC review", "#listings/progress", "🧪"],
    [p.brandStore && !(me.store && me.store.published) ? 1 : 0, "Premium: build and publish your Brand Store", "#store", "🏬"],
  ].filter(([n]) => n > 0);

  content.innerHTML = `
    <h1 class="dash-title">Namaste, ${esc(me.name.split(" ")[0])} 👋</h1>
    <div class="stat-grid">
      ${tile("Net Earnings", formatPrice(Math.round(earned)), "Delivered orders, after fees")}
      ${tile("Pending Amount", formatPrice(Math.round(pending)), "Placed + Shipped (net)")}
      ${tile("Orders", ships.length, placed.length ? `<a href="#orders">${placed.length} to dispatch</a>` : "All processed")}
      ${tile("Live Listings", `${live.length} / ${ls.filter((l) => l.status !== "archived").length}`, `<a href="#listings">Manage</a> · limit ${p.productLimit === Infinity ? "∞" : p.productLimit}`)}
      ${tile("Plan", p.name, sub && sub.expiresAt > Date.now() ? "Expires " + fmtDate(sub.expiresAt) : `<a href="#subscription">Upgrade</a>`)}
      ${tile("Ad Credits", formatPrice(me.adCredits || 0), `<a href="#ads">Run ads</a>`)}
    </div>

    <div class="dash-cols">
      <section class="panel">
        <div class="panel-head"><h2>To-do</h2><span class="muted small">${todos.length} task(s)</span></div>
        ${todos.length ? `<ul class="todo-list">${todos.map(([n, label, href, icon]) => `
          <li><a href="${href}"><span class="todo-icon">${icon}</span><span class="todo-label">${esc(label)}</span><span class="todo-count">${n}</span></a></li>`).join("")}</ul>`
          : `<p class="muted">You're all caught up 🎉</p>`}
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Account health</h2><span class="status-pill ${h.atRisk ? "s-rejected" : "s-approved"}">${h.atRisk ? "At risk" : "Healthy"}</span></div>
        <table class="table health-table"><tbody>
          <tr><td>Late dispatch rate <span class="muted small">(target &lt; 4%)</span></td><td class="num ${h.lateRate > 4 ? "text-danger" : "green"}">${h.lateRate.toFixed(1)}%</td></tr>
          <tr><td>Orders pending past dispatch-by</td><td class="num ${h.breaching ? "text-danger" : "green"}">${h.breaching}</td></tr>
          <tr><td>QC rejection rate</td><td class="num ${h.qcRejRate > 20 ? "text-warn" : ""}">${h.qcRejRate.toFixed(0)}%</td></tr>
          <tr><td>Average listing quality</td><td class="num ${h.avgQuality < 75 ? "text-warn" : "green"}">${h.avgQuality}%</td></tr>
          <tr><td>Bank account</td><td class="num">${bankStatus() === "verified" ? `<span class="green">Verified</span>` : `<a href="#profile" class="text-danger">Not verified</a>`}</td></tr>
        </tbody></table>
      </section>
    </div>

    <div class="dash-cols">
      <section class="panel">
        <div class="panel-head"><h2>Recent Orders</h2><a href="#orders" class="link">View all →</a></div>
        ${ships.length ? `<table class="table">
          <thead><tr><th>Order</th><th>Buyer</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>${ships.slice(0, 5).map(({ order: o, shipment: sh }) => `
            <tr><td>#${esc(o.id)}<div class="muted">${fmtDate(o.createdAt)}</div></td>
            <td>${esc(o.buyer.name)}</td><td>${formatPrice(sh.amount)}</td><td>${pill(sh.status)}</td></tr>`).join("")}
          </tbody></table>` : `<p class="muted">No orders yet. Create a listing and get it through QC!</p>`}
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Notifications</h2><a href="#notifications" class="link">All →</a></div>
        ${sellerNotifications(me.id).slice(0, 5).map((n) => `
          <div class="notif ${n.read ? "" : "unread"}"><div>${esc(n.message)}</div><small class="muted">${fmtDateTime(n.at)}</small></div>`).join("") || `<p class="muted">No notifications.</p>`}
      </section>
    </div>`;
};

VIEWS.listings = () => viewListings();
VIEWS["add-listing"] = () => viewAddListing();
VIEWS.bulk = () => viewBulk();
VIEWS.approvals = () => viewApprovals();
VIEWS.guidelines = () => viewGuidelines();
VIEWS.profile = () => viewProfile();
VIEWS.store = () => viewStore();

// ---------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------
let orderFilter = "all";
const COURIERS = ["Delhivery", "Blue Dart", "DTDC", "Xpressbees", "India Post", "Self Delivery"];

VIEWS.orders = () => {
  const ships = myShipments();
  const now = Date.now();
  const counts = { all: ships.length, Placed: 0, Shipped: 0, Delivered: 0 };
  ships.forEach((x) => counts[x.shipment.status]++);
  const list = orderFilter === "all" ? ships : ships.filter((x) => x.shipment.status === orderFilter);
  const tabs = [["all", "All"], ["Placed", "To dispatch"], ["Shipped", "Shipped"], ["Delivered", "Delivered"]];

  content.innerHTML = `
    <h1 class="dash-title">Orders</h1>
    <div class="filter-tabs">${tabs.map(([k, l]) =>
      `<button class="chip ${orderFilter === k ? "active" : ""}" data-filter="${k}">${l} (${counts[k]})</button>`).join("")}</div>
    ${list.length ? list.map(({ order: o, shipment: sh }) => {
      const late = sh.dispatchBy && ((sh.status === "Placed" && now > sh.dispatchBy) || (sh.shippedAt && sh.shippedAt > sh.dispatchBy));
      return `
      <section class="panel order-card">
        <div class="order-head">
          <div><strong>Order #${esc(o.id)}</strong><div class="muted">${fmtDateTime(o.createdAt)}</div></div>
          <div class="order-badges">${sh.dispatchBy && sh.status === "Placed" ? `<span class="status-pill ${late ? "s-rejected" : "s-pending"}">${late ? "Late! " : ""}Dispatch by ${fmtDate(sh.dispatchBy)}</span>` : ""}${pill(sh.status)}</div>
        </div>
        <div class="order-grid">
          <div>
            <h4>Buyer</h4>
            <p>${esc(o.buyer.name)} · ${esc(o.buyer.phone)}</p>
            <p class="muted">${esc(o.buyer.address)}, ${esc(o.buyer.city)}, ${esc(o.buyer.state)} – ${esc(o.buyer.pincode)}</p>
          </div>
          <div>
            <h4>Items</h4>
            ${sh.items.map((it) => `<p>${esc(it.name)}${it.size ? ` · <strong>Size ${esc(it.size)}</strong>` : ""} × ${it.qty} <span class="muted">(${formatPrice(it.price * it.qty)})</span>${it.sku ? `<br><span class="muted small">SKU: ${esc(it.sku)}</span>` : ""}</p>`).join("")}
          </div>
          <div>
            <h4>Details</h4>
            <p>Total: <strong>${formatPrice(sh.amount)}</strong>${typeof sh.fees === "number" ? `<br><span class="muted small">Fees ${money2(sh.fees)} · You get <strong>${money2(sh.settlement)}</strong></span>` : ""}</p>
            <p class="muted">${esc(DELIVERY_OPTIONS[o.delivery]?.label || "")} · ${PAY[o.payment] || ""}</p>
            ${sh.trackingId ? `<p class="muted">Tracking: ${esc(sh.trackingId)} (${esc(sh.courier)})</p>` : ""}
          </div>
        </div>
        ${sh.status === "Placed" ? `
          <form class="ship-form" data-order="${esc(o.id)}">
            <select name="courier" aria-label="Courier">${COURIERS.map((c) => `<option>${c}</option>`).join("")}</select>
            <input name="tracking" placeholder="Tracking ID (optional for self delivery)" maxlength="40" />
            <button class="btn" type="submit">📦 Mark as Shipped</button>
          </form>` : ""}
        ${sh.status === "Shipped" ? `<button class="btn" data-deliver="${esc(o.id)}">✅ Mark as Delivered</button>` : ""}
        ${sh.status === "Delivered" ? `<p class="green">✓ Delivered ${fmtDate(sh.deliveredAt)} · Payout: ${bankStatus() === "verified" ? fmtDate(payoutDate(sh)) : "on hold (verify your bank account)"}</p>` : ""}
      </section>`;
    }).join("") : `<div class="panel empty"><div class="empty-emoji">🛒</div><p>No orders match this filter.</p></div>`}`;

  content.querySelectorAll("[data-filter]").forEach((b) =>
    b.addEventListener("click", () => { orderFilter = b.dataset.filter; render(); }));

  content.querySelectorAll(".ship-form").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    const courier = f.elements.courier.value;
    const tracking = f.elements.tracking.value.trim();
    if (courier !== "Self Delivery" && tracking.length < 4) {
      f.elements.tracking.classList.add("invalid");
      showToast("Enter the courier's tracking ID");
      return;
    }
    updateShipment(f.dataset.order, me.id, "Shipped", { courier, trackingId: tracking });
    showToast("Order shipped — the buyer has been notified ✓");
    render();
  }));

  content.querySelectorAll("[data-deliver]").forEach((b) => b.addEventListener("click", () => {
    updateShipment(b.dataset.deliver, me.id, "Delivered");
    notifySeller(me.id, `✅ Order #${b.dataset.deliver} delivered. ${bankStatus() === "verified" ? `Payout scheduled in ${plan().payoutDays} day(s).` : "Payout on hold — verify your bank account."}`);
    showToast("Order delivered ✓");
    render();
  }));
};

// ---------------------------------------------------------------------
// Payments: gross → fees → net settlement; on hold until the bank account is verified
// ---------------------------------------------------------------------
VIEWS.earnings = () => {
  const ships = myShipments();
  const delivered = ships.filter((x) => x.shipment.status === "Delivered");
  const now = Date.now();
  const bankOk = bankStatus() === "verified";
  const status = (sh) => (!bankOk ? "hold" : payoutDate(sh) <= now ? "paid" : "scheduled");
  const sum = (arr, fn) => arr.reduce((s, x) => s + fn(x.shipment), 0);
  const paid = delivered.filter((x) => status(x.shipment) === "paid");
  const scheduled = delivered.filter((x) => status(x.shipment) === "scheduled");
  const hold = delivered.filter((x) => status(x.shipment) === "hold");
  const inProgress = ships.filter((x) => x.shipment.status !== "Delivered");

  content.innerHTML = `
    <h1 class="dash-title">Payments</h1>
    ${bankOk ? "" : `<div class="alert error">🏦 Your bank account isn't verified — all payouts are <strong>on hold</strong>. <a href="#profile">Verify your bank account</a>.</div>`}
    <div class="stat-grid">
      ${tile("Gross Sales", money2(sum(delivered, (sh) => sh.amount)), `${delivered.length} delivered order(s)`)}
      ${tile("Fees (incl. GST)", money2(sum(delivered, shipFees)), "Commission + fixed + shipping + collection")}
      ${tile("Net Earned", money2(sum(delivered, shipNet)), "Settlement amount")}
      ${tile("Paid Out", money2(sum(paid, shipNet)), "Bank account me")}
      ${tile("Upcoming", money2(sum(scheduled, shipNet)), `${scheduled.length} scheduled`)}
      ${tile("On Hold", money2(sum(hold, shipNet)), hold.length ? "Verify your bank" : "—")}
    </div>
    <div class="alert info">💳 Payout policy (${plan().name} plan): the settlement amount reaches your verified bank account <strong>${plan().payoutDays} day(s)</strong> after delivery. Net from orders in progress: <strong>${money2(sum(inProgress, shipNet))}</strong>.</div>
    <section class="panel">
      <h2>Order-wise settlements</h2>
      ${delivered.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Order</th><th>Delivered</th><th>Payment</th><th class="num">Gross</th><th class="num">Fees</th><th class="num">Net</th><th>Payout Date</th><th>Status</th></tr></thead>
        <tbody>${delivered.map(({ order: o, shipment: sh }) => {
          const st = status(sh);
          return `<tr><td>#${esc(o.id)}</td><td>${fmtDate(sh.deliveredAt)}</td><td>${PAY[o.payment] || ""}</td>
          <td class="num">${money2(sh.amount)}</td><td class="num">− ${money2(shipFees(sh))}</td><td class="num"><strong>${money2(shipNet(sh))}</strong></td>
          <td>${st === "hold" ? "—" : fmtDate(payoutDate(sh))}</td>
          <td>${st === "paid" ? pill("Paid") : st === "scheduled" ? pill("Scheduled") : `<span class="status-pill s-rejected">On hold</span>`}</td></tr>`;
        }).join("")}
        </tbody></table></div>` : `<p class="muted">No delivered orders yet. Settlements appear here once orders are delivered.</p>`}
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
          </div>`).join("") : `<p class="muted">No sales yet.</p>`}
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
          <p class="muted">Views = how often the product was shown. Abandoned = added to cart but not bought.</p>`
        : `<div class="gate-msg">🔒 Detailed reports (views, clicks, abandoned cart) are included in the <strong>Advanced</strong> and <strong>Premium</strong> plans.<br><a href="#subscription" class="btn">Upgrade</a></div>`}
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
  basic: ["10 product listings", "Payout 7 days after delivery", "Basic sales reports", "Standard visibility"],
  advanced: ["50 product listings", "Payout in 3 days", "Detailed reports + customer behaviour", "₹500 free ad credits / month"],
  premium: ["Unlimited products", "Next-day payout", "🏬 Your own Brand Store — logo, banners, collections, pages and design", "★ Featured badge + homepage/top placement", "Detailed reports + customer behaviour", "₹2,000 free ad credits / month"],
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
          ? `<p>Expires on <strong>${fmtDate(sub.expiresAt)}</strong> (${daysLeft(sub.expiresAt)} day(s) left)</p>`
          : sub ? `<p class="text-danger">${PLANS[sub.plan].name} plan expired on ${fmtDate(sub.expiresAt)}.</p>`
          : `<p class="muted">Free plan: ${PLANS.free.productLimit} products, payout in ${PLANS.free.payoutDays} days.</p>`}
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
        if (id === cur) action = `<button class="btn" data-plan="${id}" data-mode="renew">Renew (+30 days)</button>`;
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
        : `<p class="muted">No payments yet.</p>`}
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
      showToast(`The ${p.name} plan allows ${p.productLimit} products. Delete ${count - p.productLimit} product(s) first.`);
      return;
    }
    openModal(`
      <form id="pay-form" class="checkout-form">
        <div class="modal-head"><h2>${mode === "renew" ? "Renew" : mode === "upgrade" ? "Activate" : "Switch to"} ${p.name}</h2><button type="button" class="icon-btn" data-close aria-label="Close">✕</button></div>
        <p>Amount: <strong>${formatPrice(p.price)}</strong> for ${SUBSCRIPTION_DAYS} days</p>
        ${mode !== "renew" ? `<p class="muted">The new plan starts right away.</p>` : `<p class="muted">30 days will be added after your current expiry.</p>`}
        <div class="pay-options">
          <label class="pay-opt selected"><input type="radio" name="m" value="upi" checked /><span>📲 UPI</span></label>
          <label class="pay-opt"><input type="radio" name="m" value="card" /><span>💳 Card</span></label>
        </div>
        <p class="demo-note">⚠️ Demo payment — you won't be charged.</p>
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
      notifySeller(me.id, `⭐ ${p.name} plan active! Valid till ${fmtDate(me.subscription.expiresAt)}.${p.adCredits ? ` ${formatPrice(p.adCredits)} ad credits added.` : ""}`);
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
        <p>Your documents were submitted (${fmtDateTime(k.submittedAt)}). You'll get a notification as soon as they're verified.</p>
        <p class="muted">${DOC_TYPES[k.docType].label}: ${esc(mask(k.docNumber))} · Address proof: ${esc(k.addressProofType)}</p>
        <p class="demo-note">Demo: open the <a href="admin.html" class="link" target="_blank">Admin panel</a> to approve, then refresh this page.</p>
      </section>`;
    return;
  }

  content.innerHTML = `
    <h1 class="dash-title">KYC Verification</h1>
    ${stepper}
    ${k.status === "rejected" ? `<div class="alert error">❌ Your last KYC was rejected: <strong>${esc(k.reason)}</strong>. Please submit again with the correct documents.</div>` : ""}
    <form id="kyc-form" class="panel checkout-form" novalidate>
      <p class="muted">Every seller completes KYC to keep the platform safe. Your documents are used only for verification.</p>
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
    const ok1 = setErr("docNumber", DOC_TYPES[docType].test(docNumber) ? "" : `Enter a valid ${DOC_TYPES[docType].label} number (${DOC_TYPES[docType].hint})`);
    const ok2 = setErr("address", f.elements.address.value.trim().length < 15 ? "Enter your full address" : "");
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
    notifySeller(me.id, "📄 KYC documents submitted. We'll notify you once they're reviewed.");
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
      ${list.map((n) => `<div class="notif ${n.read ? "" : "unread"}"><div>${esc(n.message)}</div><small class="muted">${fmtDateTime(n.at)}</small></div>`).join("") || `<p class="muted">No notifications.</p>`}
    </section>`;
  markSellerNotifsRead(me.id);
  setTimeout(renderNav, 0);
};

// Refresh when data changes in another tab (e.g. admin approved the KYC)
window.addEventListener("storage", (e) => {
  if (!e.key || !e.key.startsWith("zk_") || !modal.classList.contains("hidden")) return;
  if (e.key === DB.storeStats || e.key === DB.stats) return; // buyer visits / views — don't disturb the editor
  if (currentSection() === "store" && e.key !== DB.sellers && e.key !== DB.products) return;
  render();
});

render();
