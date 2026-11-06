// =====================================================================
// Super Admin console (demo)
// Login → dashboard, KYC, listing QC, category approvals, sellers, listings,
// orders, customers, brand stores, settings.
// Data lives in this browser (localStorage). A real launch would do admin auth on a server
// (2-factor, audit log) — this is a prototype.
// =====================================================================
const DOC_LABEL = { aadhaar: "Aadhaar Card", pan: "PAN Card", license: "Business License / GST" };
const KYC_LABEL = { not_submitted: "Not submitted", pending: "Pending", approved: "Approved", rejected: "Rejected" };
const AD_SESSION_MS = 8 * 60 * 60 * 1000;
const AD_SECTIONS = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "kyc", icon: "🪪", label: "KYC Requests" },
  { id: "qc", icon: "🧪", label: "Listing QC" },
  { id: "approvals", icon: "🔒", label: "Category Approvals" },
  { id: "sellers", icon: "🏪", label: "Sellers" },
  { id: "listings", icon: "📦", label: "All Listings" },
  { id: "orders", icon: "🛒", label: "Orders" },
  { id: "customers", icon: "👥", label: "Customers" },
  { id: "support", icon: "💬", label: "Support" },
  { id: "stores", icon: "🏬", label: "Brand Stores" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];
const adContent = document.getElementById("content");
const adModal = document.getElementById("modal");
const adModalBox = document.getElementById("modal-box");
const AD = { sellerQ: "", sellerF: "all", listQ: "", listF: "all", orderQ: "", orderF: "all", custQ: "", tickQ: "", tickF: "reply" };
// Does the support ticket need a reply? (open + last message from the customer)
const adNeedsReply = (t) => t.status === "open" && t.messages.length && t.messages[t.messages.length - 1].from === "customer";

const adTile = (label, value, sub = "") =>
  `<div class="stat-tile"><span class="stat-label">${label}</span><span class="stat-value">${value}</span>${sub ? `<span class="stat-sub">${sub}</span>` : ""}</div>`;
const adMask = (v) => (String(v || "").length > 4 ? "•".repeat(String(v).length - 4) + String(v).slice(-4) : String(v || ""));
const adSales = (sellerId) => shipmentsOfSeller(sellerId).reduce((s, x) => s + x.shipment.amount, 0);
const adOrderStatus = (o) => o.shipments.every((sh) => sh.status === "Delivered") ? "Delivered" : o.shipments.some((sh) => sh.status !== "Placed") ? "Shipped" : "Placed";
const adSellerName = (id) => (id === PLATFORM_SELLER ? "Zzapkart" : (getSeller(id) || {}).shopName || "Seller");
const adPill = (text, cls) => `<span class="status-pill ${cls}">${esc(text)}</span>`;

function adOpenModal(html) {
  adModalBox.innerHTML = html;
  adModal.classList.remove("hidden");
  adModalBox.querySelector("textarea, input, select, button")?.focus();
}
function adCloseModal() {
  adModal.classList.add("hidden");
  adModalBox.innerHTML = "";
}
// Modal that asks for a reason (suspend / block / takedown)
function adAsk(title, label, okText, onOk) {
  adOpenModal(`
    <form id="ad-ask" class="checkout-form">
      <div class="modal-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close="1" aria-label="Close">✕</button></div>
      <label>${esc(label)}<textarea name="reason" rows="3" maxlength="300" placeholder="Reason (shown to the seller / customer)"></textarea><small class="err"></small></label>
      <div class="modal-actions"><button type="button" class="btn btn-outline" data-close="1">Cancel</button><button type="submit" class="btn btn-danger">${esc(okText)}</button></div>
    </form>`);
  document.getElementById("ad-ask").addEventListener("submit", (e) => {
    e.preventDefault();
    const reason = e.target.elements.reason.value.trim();
    if (reason.length < 5) { e.target.querySelector(".err").textContent = "Write a reason of at least 5 characters"; return; }
    adCloseModal();
    onOk(reason);
    render();
  });
}

// ---------------------------------------------------------------------
// Auth: first-time setup, then login
// ---------------------------------------------------------------------
function getAdmin() { return dbGet(DB.admin, null); }
function currentAdmin() {
  const a = getAdmin();
  const s = dbGet(DB.adminSession, null);
  return a && s && s.email === a.email && s.exp > Date.now() ? a : null;
}
function adStrongPassword(pw) {
  return pw.length >= 10 && /[A-Za-z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);
}

function adAuthView() {
  const admin = getAdmin();
  document.getElementById("admin-app").classList.add("hidden");
  document.getElementById("admin-user").classList.add("hidden");
  const box = document.getElementById("admin-auth");
  box.classList.remove("hidden");
  document.title = (admin ? "Login" : "Setup") + " – Super Admin – Zzapkart";
  box.innerHTML = `
    <div class="admin-auth">
      <form class="panel checkout-form" id="ad-auth-form" novalidate>
        <div class="admin-auth-head"><span class="admin-shield" aria-hidden="true">🛡️</span>
          <div><h1>${admin ? "Super Admin login" : "Super Admin setup"}</h1>
          <p class="muted">${admin ? "Control panel for the Zzapkart platform" : "First time here: create your super admin account. It is saved only in this browser (demo)."}</p></div></div>
        ${admin ? "" : `<label>Full name<input name="name" autocomplete="name" maxlength="60" /><small class="err"></small></label>`}
        <label>Email<input name="email" type="email" autocomplete="username" /><small class="err"></small></label>
        <label>Password<input name="password" type="password" autocomplete="${admin ? "current-password" : "new-password"}" />${admin ? "" : `<small class="hint">10+ characters — a letter, a number and a symbol (e.g. @ # !)</small>`}<small class="err"></small></label>
        ${admin ? "" : `<label>Confirm password<input name="confirm" type="password" autocomplete="new-password" /><small class="err"></small></label>`}
        <p class="err" id="ad-auth-err" role="alert"></p>
        <button class="btn checkout-btn" type="submit">${admin ? "Login" : "Create super admin"}</button>
        <p class="small muted">⚠️ Demo: data lives only in this browser. A real launch would use server-side admin login with 2-factor authentication.</p>
      </form>
    </div>`;
  const f = document.getElementById("ad-auth-form");
  const err = (n, m) => { const el = f.elements[n]; el.closest("label").querySelector(".err").textContent = m || ""; el.classList.toggle("invalid", !!m); return !m; };
  f.querySelector("input").focus();
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = f.elements.email.value.trim().toLowerCase();
    const pw = f.elements.password.value;
    const msg = document.getElementById("ad-auth-err");
    msg.textContent = "";
    if (!admin) {
      const ok = [
        err("name", f.elements.name.value.trim().length < 2 ? "Enter your name" : ""),
        err("email", EMAIL_RE.test(email) ? "" : "Enter a valid email"),
        err("password", adStrongPassword(pw) ? "" : "10+ characters with a letter, a number and a symbol"),
        err("confirm", f.elements.confirm.value === pw ? "" : "Passwords don't match"),
      ].every(Boolean);
      if (!ok) return;
      const salt = crypto.getRandomValues(new Uint32Array(4)).join("-");
      dbSet(DB.admin, { name: f.elements.name.value.trim(), email, salt, passwordHash: await hashPassword(pw, salt), createdAt: Date.now() });
      dbSet(DB.adminSession, { email, exp: Date.now() + AD_SESSION_MS });
      showToast("Super admin account created ✓");
      return render();
    }
    // Wait a moment after a wrong password (slows brute force)
    const fails = Number(sessionStorage.getItem("zk_admin_fails") || 0);
    const until = Number(sessionStorage.getItem("zk_admin_lock") || 0);
    if (until > Date.now()) { msg.textContent = `Too many failed attempts — try again in ${Math.ceil((until - Date.now()) / 1000)} seconds`; return; }
    const ok = email === admin.email && (await hashPassword(pw, admin.salt)) === admin.passwordHash;
    if (!ok) {
      sessionStorage.setItem("zk_admin_fails", String(fails + 1));
      if (fails + 1 >= 5) { sessionStorage.setItem("zk_admin_lock", String(Date.now() + 60000)); sessionStorage.setItem("zk_admin_fails", "0"); }
      msg.textContent = "Incorrect email or password";
      return;
    }
    sessionStorage.removeItem("zk_admin_fails");
    dbSet(DB.adminSession, { email, exp: Date.now() + AD_SESSION_MS });
    showToast(`Welcome, ${admin.name.split(" ")[0]} ✓`);
    render();
  });
}

document.getElementById("admin-logout").addEventListener("click", () => {
  localStorage.removeItem(DB.adminSession);
  adCloseModal();
  showToast("You've been logged out");
  render();
});

// ---------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------
function adCurrent() {
  const id = location.hash.slice(1).split("/")[0];
  return AD_SECTIONS.some((s) => s.id === id) ? id : "dashboard";
}
function adCounts() {
  const sellers = getSellers();
  return {
    kyc: sellers.filter((s) => s.kyc && s.kyc.status === "pending").length,
    qc: getListings().filter((l) => l.status === "qc_pending").length,
    approvals: getApprovals().filter((a) => a.status === "pending").length,
    orders: shipmentsOfSeller(PLATFORM_SELLER).filter((x) => x.shipment.status === "Placed").length,
    support: getTickets().filter(adNeedsReply).length,
  };
}
function adNav() {
  const cur = adCurrent();
  const counts = adCounts();
  document.getElementById("dash-nav").innerHTML = AD_SECTIONS.map((s) =>
    `<a href="#${s.id}" class="${s.id === cur ? "active" : ""}"><span>${s.icon}</span>${s.label}${counts[s.id] ? `<span class="badge">${counts[s.id]}</span>` : ""}</a>`).join("");
}

// admin-qc.js also calls render() after every action
let adLastRoute = null;
function render() {
  const admin = currentAdmin();
  if (!admin) return adAuthView();
  document.getElementById("admin-auth").classList.add("hidden");
  document.getElementById("admin-app").classList.remove("hidden");
  document.getElementById("admin-user").classList.remove("hidden");
  document.getElementById("admin-name").textContent = admin.name;
  const sec = adCurrent();
  document.title = `${AD_SECTIONS.find((s) => s.id === sec).label} – Super Admin – Zzapkart`;
  adNav();
  AD_VIEWS[sec]();
  if (location.hash !== adLastRoute) { window.scrollTo(0, 0); adLastRoute = location.hash; }
}
// Give focus back to the search box after a re-render
function adKeepFocus(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.focus();
  el.setSelectionRange(el.value.length, el.value.length);
}
const adToolbar = (filters, cur, key, qId, qVal, ph) => `
  <div class="ad-toolbar">
    <div class="filter-tabs">${filters.map(([k, l, n]) => `<button type="button" class="chip ${cur === k ? "active" : ""}" data-af="${key}" data-v="${k}">${l}${n !== undefined ? ` (${n})` : ""}</button>`).join("")}</div>
    <input type="search" id="${qId}" class="ad-search" placeholder="${ph}" value="${esc(qVal)}" aria-label="${ph}" />
  </div>`;

const AD_VIEWS = {};

// ---------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------
AD_VIEWS.dashboard = () => {
  const orders = getOrders(), sellers = getSellers(), customers = getCustomers(), listings = getListings();
  const gmv = orders.reduce((s, o) => s + o.total, 0);
  const fees = orders.reduce((s, o) => s + o.shipments.reduce((m, sh) => m + (typeof sh.fees === "number" ? sh.fees : 0), 0), 0);
  const today = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today).length;
  const c = adCounts();
  const tasks = [
    [c.kyc, "KYC requests to review", "#kyc", "🪪"],
    [c.qc, "Listings waiting for QC", "#qc", "🧪"],
    [c.approvals, "Category approval requests", "#approvals", "🔒"],
    [c.orders, "Zzapkart orders to ship", "#orders", "🚚"],
    [c.support, "Support requests waiting for a reply", "#support", "💬"],
    [sellers.filter((s) => s.suspended).length, "Suspended sellers", "#sellers", "⛔"],
    [sellers.filter((s) => s.store && s.store.adminBlocked).length, "Brand stores taken down", "#stores", "🏬"],
  ].filter(([n]) => n > 0);
  const top = sellers.map((s) => ({ s, sales: adSales(s.id), n: shipmentsOfSeller(s.id).length })).filter((x) => x.sales > 0).sort((a, b) => b.sales - a.sales).slice(0, 5);
  adContent.innerHTML = `
    <h1 class="dash-title">Platform overview</h1>
    <div class="stat-grid">
      ${adTile("GMV (total sales)", formatPrice(Math.round(gmv)), `${orders.length} orders · ${todayOrders} today`)}
      ${adTile("Avg order value", formatPrice(orders.length ? Math.round(gmv / orders.length) : 0))}
      ${adTile("Seller fees", formatPrice(Math.round(fees)), "Commission + shipping + GST")}
      ${adTile("Customers", customers.length, `${customers.filter((x) => x.blocked).length} blocked`)}
      ${adTile("Sellers", sellers.length, `${sellers.filter((s) => s.kyc.status === "approved").length} verified · ${sellers.filter((s) => activePlan(s).id === "premium").length} premium`)}
      ${adTile("Live listings", listings.filter(isListingLive).length, `${c.qc} QC pending · ${listings.filter((l) => l.status === "blocked").length} blocked`)}
      ${adTile("Brand stores live", sellers.filter(storeIsActive).length)}
    </div>
    <div class="dash-cols">
      <section class="panel">
        <div class="panel-head"><h2>Pending tasks</h2><span class="muted small">${tasks.length}</span></div>
        ${tasks.length ? `<ul class="todo-list">${tasks.map(([n, l, href, icon]) => `<li><a href="${href}"><span class="todo-icon">${icon}</span><span class="todo-label">${esc(l)}</span><span class="todo-count">${n}</span></a></li>`).join("")}</ul>` : `<p class="muted">All clear 🎉</p>`}
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Top sellers</h2><a href="#sellers" class="link">All →</a></div>
        ${top.length ? `<table class="table"><thead><tr><th>Shop</th><th>Orders</th><th>Sales</th></tr></thead><tbody>${top.map(({ s, sales, n }) => `<tr><td><strong>${esc(s.shopName)}</strong></td><td>${n}</td><td>${formatPrice(sales)}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">No seller sales yet.</p>`}
      </section>
    </div>
    <section class="panel">
      <div class="panel-head"><h2>Recent orders</h2><a href="#orders" class="link">All →</a></div>
      ${orders.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead><tbody>
        ${orders.slice(0, 6).map((o) => `<tr><td>#${esc(o.id)}<div class="muted">${fmtDateTime(o.createdAt)}</div></td><td>${esc(o.buyer.name)}<div class="muted">${esc(o.buyer.city)}</div></td><td>${formatPrice(o.total)}</td><td>${adPill(adOrderStatus(o), "s-" + adOrderStatus(o).toLowerCase())}</td></tr>`).join("")}
      </tbody></table></div>` : `<p class="muted">No orders yet.</p>`}
    </section>`;
};

// ---------------------------------------------------------------------
// KYC, QC, approvals
// ---------------------------------------------------------------------
AD_VIEWS.kyc = () => {
  const pending = getSellers().filter((s) => s.kyc.status === "pending");
  adContent.innerHTML = `<h1 class="dash-title">KYC Requests</h1>` + (pending.length ? pending.map((s) => `
    <section class="panel kyc-card">
      <div class="order-head">
        <div><strong>${esc(s.shopName)}</strong> — ${esc(s.name)}
          <div class="muted">${esc(s.email)} · ${esc(s.phone)} · Submitted ${fmtDateTime(s.kyc.submittedAt)}</div></div>
        ${adPill("Pending", "s-placed")}
      </div>
      <div class="order-grid">
        <div><h4>${DOC_LABEL[s.kyc.docType] || "Document"}</h4><p>${esc(s.kyc.docNumber)}</p>
          ${safeImg(s.kyc.idImage) ? `<a href="${safeImg(s.kyc.idImage)}" target="_blank"><img class="doc-img" src="${safeImg(s.kyc.idImage)}" alt="ID document" /></a>` : ""}</div>
        <div><h4>Address Proof: ${esc(s.kyc.addressProofType)}</h4><p class="muted">${esc(s.kyc.address)}</p>
          ${safeImg(s.kyc.addrImage) ? `<a href="${safeImg(s.kyc.addrImage)}" target="_blank"><img class="doc-img" src="${safeImg(s.kyc.addrImage)}" alt="Address proof" /></a>` : ""}</div>
      </div>
      <div class="row-actions">
        <button class="btn" data-approve="${s.id}">✓ Approve</button>
        <input class="reject-reason" id="reason-${s.id}" placeholder="Reason for rejecting (e.g. document is not clear)" />
        <button class="btn btn-danger" data-reject="${s.id}">✕ Reject</button>
      </div>
    </section>`).join("") : `<div class="panel"><p class="muted">No pending KYC requests.</p></div>`);
};
AD_VIEWS.qc = () => { adContent.innerHTML = `<h1 class="dash-title">Listing QC Queue</h1><div id="qc-list"></div>`; renderQC(); };
AD_VIEWS.approvals = () => { adContent.innerHTML = `<h1 class="dash-title">Category Approval Requests</h1><div id="appr-list"></div>`; renderApprovalsAdmin(); };

// ---------------------------------------------------------------------
// Sellers
// ---------------------------------------------------------------------
const AD_SELLER_F = {
  all: () => true,
  active: (s) => s.kyc.status === "approved" && !s.suspended,
  pending: (s) => s.kyc.status === "pending",
  premium: (s) => activePlan(s).id === "premium",
  suspended: (s) => !!s.suspended,
};
function adStoreStatus(s) {
  if (!s.store || (!s.store.live && !s.store.draft)) return ["—", ""];
  if (s.store.adminBlocked) return ["Taken down", "s-rejected"];
  if (storeIsActive(s)) return ["Live", "s-live"];
  if (s.store.live && !activePlan(s).brandStore) return ["Plan inactive", "s-paused"];
  if (s.store.live) return ["Offline", "s-paused"];
  return ["Draft", "s-completed"];
}
AD_VIEWS.sellers = () => {
  const all = getSellers();
  const q = AD.sellerQ.trim().toLowerCase();
  const list = all.filter(AD_SELLER_F[AD.sellerF]).filter((s) => !q || `${s.shopName} ${s.name} ${s.email}`.toLowerCase().includes(q));
  const chips = [["all", "All"], ["active", "Active"], ["pending", "KYC pending"], ["premium", "Premium"], ["suspended", "Suspended"]].map(([k, l]) => [k, l, all.filter(AD_SELLER_F[k]).length]);
  adContent.innerHTML = `
    <h1 class="dash-title">Sellers</h1>
    ${adToolbar(chips, AD.sellerF, "sellerF", "ad-sq", AD.sellerQ, "Search by shop, name or email")}
    <section class="panel"><div class="table-wrap"><table class="table">
      <thead><tr><th>Shop</th><th>Owner</th><th>KYC</th><th>Plan</th><th>Listings</th><th>Sales</th><th>Store</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map((s) => {
        const [st, cls] = adStoreStatus(s);
        return `<tr>
          <td><strong>${esc(s.shopName)}</strong><div class="muted">Since ${fmtDate(s.createdAt)}</div></td>
          <td>${esc(s.name)}<div class="muted">${esc(s.email)}</div></td>
          <td>${adPill(KYC_LABEL[s.kyc.status], "s-" + s.kyc.status.replace("_", "-"))}</td>
          <td>${activePlan(s).name}</td>
          <td>${listingsOfSeller(s.id).filter(isListingLive).length} live / ${productsOfSeller(s.id).length}</td>
          <td>${formatPrice(adSales(s.id))}</td>
          <td>${cls ? adPill(st, cls) : st}</td>
          <td>${s.suspended ? adPill("Suspended", "s-rejected") : adPill("Active", "s-live")}</td>
          <td class="ad-actions"><button type="button" class="btn-sm btn-outline" data-sview="${s.id}">View</button>${s.suspended
            ? `<button type="button" class="btn-sm btn-outline" data-sunsus="${s.id}">Unsuspend</button>`
            : `<button type="button" class="btn-sm btn-danger" data-ssus="${s.id}">Suspend</button>`}</td>
        </tr>`;
      }).join("") || `<tr><td colspan="9" class="muted">No sellers found.</td></tr>`}</tbody>
    </table></div></section>`;
};
function adSellerModal(id) {
  const s = getSeller(id);
  if (!s) return;
  const k = s.kyc || {};
  const prof = s.profile || {};
  const bank = prof.bank;
  const sub = s.subscription;
  adOpenModal(`
    <div class="modal-head"><h2>${esc(s.shopName)}</h2><button type="button" class="icon-btn" data-close="1" aria-label="Close">✕</button></div>
    <dl class="ad-dl">
      <dt>Owner</dt><dd>${esc(s.name)} · ${esc(s.email)} · ${esc(s.phone)}</dd>
      <dt>Joined</dt><dd>${fmtDate(s.createdAt)}</dd>
      <dt>KYC</dt><dd>${KYC_LABEL[k.status]}${k.docType ? ` · ${DOC_LABEL[k.docType]} ${esc(adMask(k.docNumber))}` : ""}</dd>
      <dt>Plan</dt><dd>${activePlan(s).name}${sub && sub.expiresAt > Date.now() ? ` (till ${fmtDate(sub.expiresAt)})` : ""}</dd>
      <dt>Bank</dt><dd>${bank ? esc(bank.status) + (bank.verifiedName ? " · " + esc(bank.verifiedName) : "") : "—"}</dd>
      <dt>GSTIN</dt><dd>${esc(prof.gstin || "—")}</dd>
      <dt>Listings</dt><dd>${listingsOfSeller(s.id).filter(isListingLive).length} live / ${productsOfSeller(s.id).length} total</dd>
      <dt>Sales</dt><dd>${formatPrice(adSales(s.id))} · ${shipmentsOfSeller(s.id).length} shipments</dd>
      ${s.suspended ? `<dt>Suspended</dt><dd class="text-danger">${esc(s.suspended.reason)} · ${fmtDate(s.suspended.at)}</dd>` : ""}
    </dl>
    ${safeImg(k.idImage) || safeImg(k.addrImage) ? `<div class="ad-docs">${[k.idImage, k.addrImage].filter(safeImg).map((src) => `<a href="${safeImg(src)}" target="_blank"><img class="doc-img" src="${safeImg(src)}" alt="KYC document" /></a>`).join("")}</div>` : ""}
    <h3 class="ad-h3">Change plan (admin grant, 30 days, ₹0)</h3>
    <div class="row-actions">
      <select id="ad-plan" aria-label="Plan">${["free", ...PLAN_ORDER].map((p) => `<option value="${p}" ${activePlan(s).id === p ? "selected" : ""}>${PLANS[p].name}</option>`).join("")}</select>
      <button type="button" class="btn btn-sm" data-grant="${s.id}">Apply plan</button>
    </div>`);
}

// ---------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------
AD_VIEWS.listings = () => {
  const sellers = new Map(getSellers().map((s) => [s.id, s]));
  const all = getListings();
  const q = AD.listQ.trim().toLowerCase();
  const fs = [["all", "All"], ["live", "Live"], ["qc_pending", "QC pending"], ["qc_failed", "QC failed"], ["out_of_stock", "Out of stock"], ["draft", "Draft"], ["blocked", "Blocked"]]
    .map(([k, l]) => [k, l, k === "all" ? all.length : all.filter((L) => listingDisplayStatus(L) === k).length]);
  const list = all.filter((L) => AD.listF === "all" || listingDisplayStatus(L) === AD.listF)
    .filter((L) => !q || `${L.name} ${L.brand || ""} ${L.id} ${(sellers.get(L.sellerId) || {}).shopName || ""}`.toLowerCase().includes(q));
  adContent.innerHTML = `
    <h1 class="dash-title">All Listings</h1>
    ${adToolbar(fs, AD.listF, "listF", "ad-lq", AD.listQ, "Product, brand, seller or ID")}
    <section class="panel"><div class="table-wrap"><table class="table">
      <thead><tr><th>Product</th><th>Seller</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map((L) => {
        const ds = listingDisplayStatus(L);
        const v = getVertical(L.vertical);
        return `<tr>
          <td><div class="prod-cell"><span class="thumb">${safeImg(L.image) ? `<img src="${safeImg(L.image)}" alt="" />` : "📦"}</span><div><strong>${esc(L.name || "(untitled)")}</strong><div class="muted">${esc(L.brand || "")} · #${L.id}</div></div></div></td>
          <td>${esc((sellers.get(L.sellerId) || {}).shopName || "—")}</td>
          <td class="small">${esc(v ? `${v.superCat} › ${v.name}` : "—")}</td>
          <td>${formatPrice(Number(L.price) || 0)}</td>
          <td>${L.stock}</td>
          <td>${adPill(LISTING_STATUS[ds].label, LISTING_STATUS[ds].cls)}${L.blockReason ? `<div class="muted small">${esc(L.blockReason)}</div>` : ""}</td>
          <td class="ad-actions">${isListingLive(L) ? `<a class="btn-sm btn-outline" href="product.html?id=${L.id}" target="_blank" rel="noopener">View ↗</a>` : ""}${L.status === "blocked"
            ? `<button type="button" class="btn-sm btn-outline" data-lunblock="${L.id}">Unblock</button>`
            : L.status !== "draft" ? `<button type="button" class="btn-sm btn-danger" data-lblock="${L.id}">Block</button>` : ""}</td>
        </tr>`;
      }).join("") || `<tr><td colspan="7" class="muted">No listings found.</td></tr>`}</tbody>
    </table></div></section>`;
};

// ---------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------
AD_VIEWS.orders = () => {
  const all = getOrders();
  const q = AD.orderQ.trim().toLowerCase();
  const fs = [["all", "All"], ["Placed", "Placed"], ["Shipped", "Shipped"], ["Delivered", "Delivered"]].map(([k, l]) => [k, l, k === "all" ? all.length : all.filter((o) => adOrderStatus(o) === k).length]);
  const list = all.filter((o) => AD.orderF === "all" || adOrderStatus(o) === AD.orderF)
    .filter((o) => !q || `${o.id} ${o.buyer.name} ${o.buyer.phone} ${o.buyer.email || ""}`.toLowerCase().includes(q));
  adContent.innerHTML = `
    <h1 class="dash-title">Orders</h1>
    ${adToolbar(fs, AD.orderF, "orderF", "ad-oq", AD.orderQ, "Order ID, customer name or phone")}
    <section class="panel"><div class="table-wrap"><table class="table">
      <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Amount</th><th>Shipments</th><th></th></tr></thead>
      <tbody>${list.map((o) => {
        const plat = o.shipments.find((sh) => sh.sellerId === PLATFORM_SELLER);
        const cust = o.customerId ? getCustomer(o.customerId) : null;
        return `<tr>
          <td><strong>#${esc(o.id)}</strong><div class="muted">${fmtDateTime(o.createdAt)}</div></td>
          <td>${esc(o.buyer.name)}<div class="muted">${cust ? esc(cust.email) : "Guest"} · ${esc(o.buyer.city)}</div></td>
          <td>${o.shipments.reduce((n, sh) => n + sh.items.reduce((m, it) => m + it.qty, 0), 0)}</td>
          <td>${formatPrice(o.total)}<div class="muted">${esc(o.payment.toUpperCase())}</div></td>
          <td class="small">${o.shipments.map((sh) => `${esc(adSellerName(sh.sellerId))}: ${adPill(sh.status, "s-" + sh.status.toLowerCase())}`).join("<br>")}</td>
          <td class="ad-actions"><button type="button" class="btn-sm btn-outline" data-oview="${esc(o.id)}">Details</button>${plat && plat.status === "Placed"
            ? `<button type="button" class="btn-sm" data-ship="${esc(o.id)}">Ship</button>`
            : plat && plat.status === "Shipped" ? `<button type="button" class="btn-sm" data-deliver="${esc(o.id)}">Deliver</button>` : ""}</td>
        </tr>`;
      }).join("") || `<tr><td colspan="6" class="muted">No orders found.</td></tr>`}</tbody>
    </table></div></section>`;
};
function adOrderModal(id) {
  const o = getOrders().find((x) => x.id === id);
  if (!o) return;
  adOpenModal(`
    <div class="modal-head"><h2>Order #${esc(o.id)}</h2><button type="button" class="icon-btn" data-close="1" aria-label="Close">✕</button></div>
    <p class="muted">${fmtDateTime(o.createdAt)} · ${esc(o.payment.toUpperCase())} · ${esc((DELIVERY_OPTIONS[o.delivery] || {}).label || "")} · Total <strong>${formatPrice(o.total)}</strong></p>
    <p><strong>${esc(o.buyer.name)}</strong> · ${esc(o.buyer.phone)}${o.buyer.email ? " · " + esc(o.buyer.email) : ""}<br>${esc(addressLine(o.buyer))}</p>
    ${o.shipments.map((sh) => `<div class="shipment">
      <div class="shipment-head"><span>Sold by <strong>${esc(adSellerName(sh.sellerId))}</strong></span>${adPill(sh.status, "s-" + sh.status.toLowerCase())}</div>
      ${sh.items.map((it) => `<div class="mini-row"><div class="mini-info"><div>${esc(it.name)}</div><div class="muted">${it.size ? "Size " + esc(it.size) + " · " : ""}Qty ${it.qty}${it.sku ? " · SKU " + esc(it.sku) : ""}</div></div><div class="mini-price">${formatPrice(it.price * it.qty)}</div></div>`).join("")}
      ${typeof sh.fees === "number" ? `<p class="muted small">Fees ${formatPrice(Math.round(sh.fees))} · Seller gets ${formatPrice(Math.round(sh.settlement))}</p>` : ""}
      ${sh.trackingId ? `<p class="muted small">Tracking: ${esc(sh.trackingId)} (${esc(sh.courier)})</p>` : ""}
    </div>`).join("")}`);
}

// ---------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------
AD_VIEWS.customers = () => {
  const all = getCustomers();
  const q = AD.custQ.trim().toLowerCase();
  const list = all.filter((c) => !q || `${c.name} ${c.email} ${c.phone || ""}`.toLowerCase().includes(q));
  adContent.innerHTML = `
    <h1 class="dash-title">Customers <span class="muted">(${all.length})</span></h1>
    <div class="ad-toolbar"><span></span><input type="search" id="ad-cq" class="ad-search" placeholder="Name, email or phone" value="${esc(AD.custQ)}" aria-label="Customers search" /></div>
    <section class="panel"><div class="table-wrap"><table class="table">
      <thead><tr><th>Customer</th><th>Phone</th><th>Addresses</th><th>Orders</th><th>Spent</th><th>Joined</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map((c) => {
        const os = customerOrders(c.id);
        return `<tr>
          <td><strong>${esc(c.name)}</strong><div class="muted">${esc(c.email)}</div></td>
          <td>${esc(c.phone || "—")}</td>
          <td>${(c.addresses || []).length}</td>
          <td>${os.length}</td>
          <td>${formatPrice(os.reduce((s, o) => s + o.total, 0))}</td>
          <td>${fmtDate(c.createdAt)}${c.lastLoginAt ? `<div class="muted small">Last login ${fmtDate(c.lastLoginAt)}</div>` : ""}</td>
          <td>${c.blocked ? adPill("Blocked", "s-rejected") : adPill("Active", "s-live")}</td>
          <td class="ad-actions"><button type="button" class="btn-sm btn-outline" data-cview="${c.id}">View</button>${c.blocked
            ? `<button type="button" class="btn-sm btn-outline" data-cunblock="${c.id}">Unblock</button>`
            : `<button type="button" class="btn-sm btn-danger" data-cblock="${c.id}">Block</button>`}</td>
        </tr>`;
      }).join("") || `<tr><td colspan="8" class="muted">${all.length ? "No customers found." : "No customers have registered yet."}</td></tr>`}</tbody>
    </table></div></section>`;
};
function adCustomerModal(id) {
  const c = getCustomer(id);
  if (!c) return;
  const os = customerOrders(c.id);
  adOpenModal(`
    <div class="modal-head"><h2>${esc(c.name)}</h2><button type="button" class="icon-btn" data-close="1" aria-label="Close">✕</button></div>
    <dl class="ad-dl">
      <dt>Email</dt><dd>${esc(c.email)}</dd><dt>Phone</dt><dd>${esc(c.phone || "—")}</dd>
      <dt>Joined</dt><dd>${fmtDate(c.createdAt)}</dd>
      ${c.blocked ? `<dt>Blocked</dt><dd class="text-danger">${esc(c.blockReason || "")}</dd>` : ""}
    </dl>
    <h3 class="ad-h3">Saved addresses (${(c.addresses || []).length})</h3>
    ${(c.addresses || []).map((a) => `<p class="small"><strong>${esc(a.label)}${a.isDefault ? " · Default" : ""}</strong> — ${esc(a.name)}, ${esc(a.phone)}, ${esc(addressLine(a))}</p>`).join("") || `<p class="muted small">No addresses.</p>`}
    <h3 class="ad-h3">Orders (${os.length})</h3>
    ${os.map((o) => `<p class="small">#${esc(o.id)} · ${fmtDate(o.createdAt)} · ${formatPrice(o.total)} · ${adPill(adOrderStatus(o), "s-" + adOrderStatus(o).toLowerCase())}</p>`).join("") || `<p class="muted small">No orders yet.</p>`}`);
}

// ---------------------------------------------------------------------
// Support (requests from the chat assistant's "Talk to support")
// ---------------------------------------------------------------------
const AD_TICKET_F = {
  reply: adNeedsReply,
  open: (t) => t.status === "open",
  closed: (t) => t.status !== "open",
  all: () => true,
};
AD_VIEWS.support = () => {
  const all = getTickets();
  const q = AD.tickQ.trim().toLowerCase();
  const list = all.filter(AD_TICKET_F[AD.tickF] || AD_TICKET_F.all)
    .filter((t) => !q || `${t.id} ${t.name} ${t.email} ${t.orderId} ${t.messages.map((m) => m.text).join(" ")}`.toLowerCase().includes(q))
    .sort((a, b) => (adNeedsReply(b) - adNeedsReply(a)) || (b.updatedAt - a.updatedAt));
  adContent.innerHTML = `
    <h1 class="dash-title">Support requests <span class="muted">(${all.length})</span></h1>
    <p class="muted">Customers send requests from the 💬 Help chat ("Talk to support"). Your reply appears in the same chat.</p>
    ${adToolbar([["reply", "Needs reply", all.filter(adNeedsReply).length], ["open", "Open", all.filter(AD_TICKET_F.open).length], ["closed", "Resolved", all.filter(AD_TICKET_F.closed).length], ["all", "All", all.length]], AD.tickF, "tickF", "ad-tq", AD.tickQ, "Ticket ID, name, email, order or text")}
    <section class="panel"><div class="table-wrap"><table class="table">
      <thead><tr><th>Request</th><th>Customer</th><th>Problem</th><th>Last update</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map((t) => {
        const last = t.messages[t.messages.length - 1];
        const st = t.status !== "open" ? ["Resolved", "s-delivered"] : adNeedsReply(t) ? ["Needs reply", "s-placed"] : ["Replied", "s-shipped"];
        return `<tr class="${t.unreadAdmin ? "ad-unread" : ""}">
          <td><strong>#${esc(t.id)}</strong>${t.orderId ? `<div class="muted small">Order #${esc(t.orderId)}</div>` : ""}</td>
          <td>${esc(t.name || "—")}<div class="muted small">${esc(t.email || "")}${t.customerId ? " · account" : " · guest"}</div></td>
          <td class="ad-tk-sub">${esc(t.subject)}<div class="muted small">${last.from === "admin" ? "You" : "Customer"}: ${esc(last.text.slice(0, 70))}${last.text.length > 70 ? "…" : ""}</div></td>
          <td>${fmtDateTime(t.updatedAt)}<div class="muted small">${t.messages.length} message(s)</div></td>
          <td>${adPill(st[0], st[1])}</td>
          <td class="ad-actions"><button type="button" class="btn-sm ${adNeedsReply(t) ? "" : "btn-outline"}" data-tview="${esc(t.id)}">${adNeedsReply(t) ? "Reply" : "Open"}</button></td>
        </tr>`;
      }).join("") || `<tr><td colspan="6" class="muted">${all.length ? "No requests match this filter." : "No support requests yet."}</td></tr>`}</tbody>
    </table></div></section>`;
};

function adTicketModal(id) {
  let t = getTickets().find((x) => x.id === id);
  if (!t) return;
  if (t.unreadAdmin) t = updateTicket(id, (x) => { x.unreadAdmin = 0; }) || t;
  const cust = t.customerId ? getCustomer(t.customerId) : null;
  const orders = cust ? customerOrders(cust.id).slice(0, 3) : [];
  adOpenModal(`
    <div class="modal-head"><h2>Request #${esc(t.id)}</h2><button type="button" class="icon-btn" data-close="1" aria-label="Close">✕</button></div>
    <p class="small"><strong>${esc(t.name || "—")}</strong> · ${esc(t.email || "")} · ${t.customerId ? "Registered customer" : "Guest (bina login)"} · ${fmtDateTime(t.createdAt)}
      ${t.orderId ? ` · Order <strong>#${esc(t.orderId)}</strong>` : ""} · ${adPill(t.status === "open" ? "Open" : "Resolved", t.status === "open" ? "s-placed" : "s-delivered")}</p>
    ${orders.length ? `<p class="small muted">Recent orders: ${orders.map((o) => `<button type="button" class="link-btn" data-oview="${esc(o.id)}">#${esc(o.id)}</button> (${adOrderStatus(o)})`).join(" · ")}</p>` : ""}
    <div class="ad-thread" id="ad-thread">${t.messages.map((m) => `
      <div class="ad-tmsg ${m.from === "admin" ? "admin" : "cust"}">
        <span class="ad-tmsg-who">${m.from === "admin" ? "🧑‍💼 Zzapkart Support" : "👤 " + esc(t.name || "Customer")} · ${fmtDateTime(m.at)}</span>
        <p>${esc(m.text).replace(/\n/g, "<br>")}</p>
      </div>`).join("")}</div>
    <form id="ad-treply" class="checkout-form" novalidate>
      <label>Reply (the customer sees this in the chat)
        <textarea name="text" rows="3" maxlength="${TICKET_MAX}" placeholder="Hi! About your request…"></textarea><small class="err"></small></label>
      <div class="modal-actions">
        ${t.status === "open"
          ? `<button type="button" class="btn btn-outline" data-tclose="${esc(t.id)}">✓ Resolve (bina reply)</button><button type="submit" class="btn btn-outline" name="close" value="1">Reply &amp; resolve</button>`
          : `<button type="button" class="btn btn-outline" data-topen="${esc(t.id)}">↺ Reopen</button>`}
        <button type="submit" class="btn">Send reply</button>
      </div>
    </form>`);
  const th = document.getElementById("ad-thread");
  th.scrollTop = th.scrollHeight;
  const f = document.getElementById("ad-treply");
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = f.elements.text.value.trim();
    const errEl = f.querySelector(".err");
    if (text.length < 2) { errEl.textContent = "Write a reply"; f.elements.text.focus(); return; }
    const close = e.submitter && e.submitter.name === "close";
    ticketReply(t.id, "admin", text);
    if (close) updateTicket(t.id, (x) => { x.status = "closed"; x.closedAt = Date.now(); });
    showToast(close ? "Reply sent and request resolved ✓" : "Reply sent ✓");
    adTicketModal(t.id);
    render();
  });
}

// ---------------------------------------------------------------------
// Brand stores
// ---------------------------------------------------------------------
AD_VIEWS.stores = () => {
  const list = getSellers().filter((s) => s.store && (s.store.live || s.store.draft));
  adContent.innerHTML = `
    <h1 class="dash-title">Brand Stores <span class="muted">(${list.length})</span></h1>
    <section class="panel"><div class="table-wrap"><table class="table">
      <thead><tr><th>Store</th><th>Seller</th><th>Plan</th><th>Visits</th><th>Subscribers</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map((s) => {
        const cfg = s.store.live || s.store.draft;
        const [st, cls] = adStoreStatus(s);
        return `<tr>
          <td><div class="prod-cell"><span class="thumb">${safeImg(cfg.logo) ? `<img src="${safeImg(cfg.logo)}" alt="" />` : esc(storeInitials(cfg.name))}</span><div><strong>${esc(cfg.name)}</strong><div class="muted">store.html?s=${esc(cfg.slug)}</div></div></div></td>
          <td>${esc(s.shopName)}${s.suspended ? `<div class="text-danger small">Seller suspended</div>` : ""}</td>
          <td>${activePlan(s).name}</td>
          <td>${storeStats(s.id).total}</td>
          <td>${storeSubscribers(s.id).length}</td>
          <td>${adPill(st, cls || "s-completed")}${s.store.adminBlocked ? `<div class="muted small">${esc(s.store.adminBlocked.reason)}</div>` : ""}</td>
          <td class="ad-actions">${storeIsActive(s) ? `<a class="btn-sm btn-outline" href="${storeUrl(s.store.live.slug)}" target="_blank" rel="noopener">Open ↗</a>` : ""}${s.store.adminBlocked
            ? `<button type="button" class="btn-sm btn-outline" data-strestore="${s.id}">Restore</button>`
            : `<button type="button" class="btn-sm btn-danger" data-sttake="${s.id}">Take down</button>`}</td>
        </tr>`;
      }).join("") || `<tr><td colspan="7" class="muted">No seller has created a Brand Store yet.</td></tr>`}</tbody>
    </table></div></section>`;
};

// ---------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------
AD_VIEWS.settings = () => {
  const a = getAdmin();
  adContent.innerHTML = `
    <h1 class="dash-title">Settings</h1>
    <form id="ad-prof" class="panel checkout-form" novalidate>
      <h2>Admin profile</h2>
      <div class="form-grid">
        <label>Name<input name="name" value="${esc(a.name)}" maxlength="60" /><small class="err"></small></label>
        <label>Email<input name="email" type="email" value="${esc(a.email)}" /><small class="err"></small></label>
      </div>
      <div class="row-actions"><button type="submit" class="btn">Save</button></div>
    </form>
    <form id="ad-pass" class="panel checkout-form" novalidate>
      <h2>Change password</h2>
      <div class="form-grid">
        <label class="full">Current password<input name="current" type="password" autocomplete="current-password" /><small class="err"></small></label>
        <label>New password<input name="password" type="password" autocomplete="new-password" /><small class="hint">10+ characters, letter, number, symbol</small><small class="err"></small></label>
        <label>Confirm<input name="confirm" type="password" autocomplete="new-password" /><small class="err"></small></label>
      </div>
      <div class="row-actions"><button type="submit" class="btn">Update password</button></div>
    </form>
    <section class="panel">
      <h2>Platform</h2>
      <p class="small">FREE delivery: ₹${FREE_DELIVERY_MIN}+ orders · Plans: ${PLAN_ORDER.map((p) => `${PLANS[p].name} ${formatPrice(PLANS[p].price)}`).join(" · ")}</p>
    </section>
    <section class="panel danger-zone">
      <h2>Reset demo data</h2>
      <p class="muted">Remove all sellers, customers, listings (with images), approvals, orders, ads, stores and stats from this browser. The cart is cleared too. Your admin account stays, and the demo catalogue is added back on the next page load.</p>
      <button type="button" class="btn btn-danger" id="reset">Reset everything</button>
    </section>`;
  const err = (f, n, m) => { const el = f.elements[n]; el.closest("label").querySelector(".err").textContent = m || ""; el.classList.toggle("invalid", !!m); return !m; };
  const pf = document.getElementById("ad-prof");
  pf.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = pf.elements.name.value.trim(), email = pf.elements.email.value.trim().toLowerCase();
    if (![err(pf, "name", name.length < 2 ? "Enter your name" : ""), err(pf, "email", EMAIL_RE.test(email) ? "" : "Enter a valid email")].every(Boolean)) return;
    dbSet(DB.admin, { ...getAdmin(), name, email });
    dbSet(DB.adminSession, { email, exp: Date.now() + AD_SESSION_MS });
    showToast("Profile saved ✓");
    render();
  });
  const pw = document.getElementById("ad-pass");
  pw.addEventListener("submit", async (e) => {
    e.preventDefault();
    const adm = getAdmin();
    const cur = pw.elements.current.value, np = pw.elements.password.value;
    const ok = [
      err(pw, "current", (await hashPassword(cur, adm.salt)) === adm.passwordHash ? "" : "Your current password is incorrect"),
      err(pw, "password", adStrongPassword(np) ? "" : "10+ characters with a letter, a number and a symbol"),
      err(pw, "confirm", pw.elements.confirm.value === np ? "" : "Passwords don't match"),
    ].every(Boolean);
    if (!ok) return;
    const salt = crypto.getRandomValues(new Uint32Array(4)).join("-");
    dbSet(DB.admin, { ...adm, salt, passwordHash: await hashPassword(np, salt) });
    pw.reset();
    showToast("Password changed ✓");
  });
};

// ---------------------------------------------------------------------
// Actions (ek hi click listener)
// ---------------------------------------------------------------------
document.addEventListener("click", (e) => {
  const t = e.target.closest("button, a");
  if (e.target === adModal || (t && t.dataset.close)) { adCloseModal(); return; }
  if (!t) return;
  const d = t.dataset;
  if (d.af) { AD[d.af] = d.v; return render(); }
  if (d.approve) {
    const s = getSeller(d.approve);
    updateSeller(s.id, { kyc: { ...s.kyc, status: "approved", reviewedAt: Date.now(), reason: "" } });
    notifySeller(s.id, "🎉 Your KYC is approved! The full dashboard is unlocked — start adding products.");
    showToast(`${s.shopName} approved ✓`);
    return render();
  }
  if (d.reject) {
    const s = getSeller(d.reject);
    const reason = document.getElementById("reason-" + s.id).value.trim();
    if (reason.length < 5) { showToast("Write a reason for rejecting"); return; }
    updateSeller(s.id, { kyc: { ...s.kyc, status: "rejected", reviewedAt: Date.now(), reason } });
    notifySeller(s.id, `❌ KYC rejected: ${reason}. Please submit again.`);
    showToast(`${s.shopName} rejected`);
    return render();
  }
  if (d.ship) { updateShipment(d.ship, PLATFORM_SELLER, "Shipped", { courier: "Zzapkart Logistics", trackingId: "ZL" + Date.now().toString().slice(-8) }); showToast("Shipped ✓"); return render(); }
  if (d.deliver) { updateShipment(d.deliver, PLATFORM_SELLER, "Delivered"); showToast("Delivered ✓"); return render(); }
  if (d.sview) return adSellerModal(d.sview);
  if (d.ssus) {
    const s = getSeller(d.ssus);
    return adAsk(`Suspend: ${s.shopName}`, "Reason for suspending", "Suspend seller", (reason) => {
      updateSeller(s.id, { suspended: { reason, at: Date.now() } });
      notifySeller(s.id, `⛔ Your seller account has been suspended: ${reason}. Your products and store are hidden from shoppers.`);
      showToast(`${s.shopName} suspended`);
    });
  }
  if (d.sunsus) {
    const s = getSeller(d.sunsus);
    updateSeller(s.id, { suspended: null });
    notifySeller(s.id, "✅ Your seller account is active again.");
    showToast(`${s.shopName} active ✓`);
    return render();
  }
  if (d.grant) {
    const s = getSeller(d.grant);
    const planId = document.getElementById("ad-plan").value;
    const now = Date.now();
    const payments = (s.payments || []).slice();
    if (planId !== "free") payments.unshift({ plan: planId, amount: 0, at: now, type: "admin-grant" });
    updateSeller(s.id, {
      subscription: planId === "free" ? null : { plan: planId, startedAt: now, expiresAt: now + SUBSCRIPTION_DAYS * DAY, reminded: false },
      payments,
    });
    notifySeller(s.id, planId === "free" ? "ℹ️ Zzapkart admin set your plan to Free." : `⭐ Zzapkart admin gave you the ${PLANS[planId].name} plan (30 days).`);
    adCloseModal();
    showToast(`${s.shopName}: ${PLANS[planId].name} plan ✓`);
    return render();
  }
  if (d.lblock) {
    const L = getListing(Number(d.lblock));
    return adAsk(`Block listing: ${L.name}`, "Reason for blocking", "Block listing", (reason) => {
      saveListing({ ...L, blockedFrom: L.status, status: "blocked", blockReason: reason, blockedAt: Date.now() });
      notifySeller(L.sellerId, `⛔ Listing blocked: "${L.name}" — ${reason}`);
      showToast("Listing blocked");
    });
  }
  if (d.lunblock) {
    const L = getListing(Number(d.lunblock));
    const back = L.blockedFrom && L.blockedFrom !== "blocked" ? L.blockedFrom : "qc_passed";
    const { blockedFrom, blockReason, blockedAt, ...rest } = L;
    saveListing({ ...rest, status: back });
    notifySeller(L.sellerId, `✅ Listing unblocked: "${L.name}"`);
    showToast("Listing unblocked ✓");
    return render();
  }
  if (d.oview) return adOrderModal(d.oview);
  if (d.tview) return adTicketModal(d.tview);
  if (d.tclose) {
    updateTicket(d.tclose, (x) => { x.status = "closed"; x.closedAt = Date.now(); });
    showToast("Request resolved ✓");
    adTicketModal(d.tclose);
    return render();
  }
  if (d.topen) {
    updateTicket(d.topen, (x) => { x.status = "open"; });
    showToast("Request reopened ✓");
    adTicketModal(d.topen);
    return render();
  }
  if (d.cview) return adCustomerModal(d.cview);
  if (d.cblock) {
    const c = getCustomer(d.cblock);
    return adAsk(`Block customer: ${c.name}`, "Reason for blocking", "Block customer", (reason) => {
      updateCustomer(c.id, { blocked: true, blockReason: reason, blockedAt: Date.now() });
      showToast(`${c.name} blocked`);
    });
  }
  if (d.cunblock) { updateCustomer(d.cunblock, { blocked: false, blockReason: "" }); showToast("Customer unblocked ✓"); return render(); }
  if (d.sttake) {
    const s = getSeller(d.sttake);
    return adAsk(`Take down store: ${(s.store.live || s.store.draft).name}`, "Reason for taking the store down", "Take down", (reason) => {
      updateSeller(s.id, { store: { ...s.store, adminBlocked: { reason, at: Date.now() } } });
      notifySeller(s.id, `⛔ Zzapkart admin has taken down your Brand Store: ${reason}`);
      showToast("Store taken down");
    });
  }
  if (d.strestore) {
    const s = getSeller(d.strestore);
    updateSeller(s.id, { store: { ...s.store, adminBlocked: null } });
    notifySeller(s.id, "✅ Your Brand Store is live again.");
    showToast("Store restored ✓");
    return render();
  }
  if (t.id === "reset" && confirm("Delete all demo data? This can't be undone.")) {
    Object.entries(DB).filter(([k]) => k !== "admin" && k !== "adminSession").forEach(([, key]) => localStorage.removeItem(key));
    localStorage.removeItem("zzapkart_cart");
    localStorage.removeItem("zzapkart_address");
    MediaDB.clear();
    showToast("Demo data has been reset");
    render();
  }
});
document.addEventListener("input", (e) => {
  const map = { "ad-sq": "sellerQ", "ad-lq": "listQ", "ad-oq": "orderQ", "ad-cq": "custQ", "ad-tq": "tickQ" };
  const key = map[e.target.id];
  if (!key) return;
  AD[key] = e.target.value;
  const id = e.target.id;
  render();
  adKeepFocus(id);
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !adModal.classList.contains("hidden")) adCloseModal(); });
window.addEventListener("hashchange", render);
window.addEventListener("storage", () => {
  const busy = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  if (adModal.classList.contains("hidden") && !busy) render();
});
render();
