// =====================================================================
// Customer account: login / signup, order history, saved addresses, profile
//   account.html                    → logged out: login / signup, logged in: My Orders
//   account.html#orders | #addresses | #profile
//   account.html?next=checkout.html → login ke baad wapas usi page par
// =====================================================================
const acRoot = document.getElementById("acct");
const acParams = new URLSearchParams(location.search);
// Sirf apni site ke page par wapas bhejo (open redirect nahi)
const acNext = (() => {
  const n = acParams.get("next") || "";
  return /^[a-z0-9-]+\.html(\?[^#]*)?(#.*)?$/i.test(n) && !/^account\.html/i.test(n) ? n : "";
})();
let acTab = acParams.get("mode") === "signup" ? "signup" : "login";
let acOrderFilter = "all";
let acOrderQ = "";
let acEditAddr = null; // null | "new" | address id
const AC_STEPS = ["Placed", "Shipped", "Delivered"];
const AC_PAY = { cod: "Cash on Delivery", upi: "UPI", card: "Card" };
const PIN_RE = /^[1-9]\d{5}$/;

function acErr(form, name, msg) {
  const el = form.elements[name];
  const box = el.closest("label").querySelector(".err");
  if (box) box.textContent = msg || "";
  el.classList.toggle("invalid", !!msg);
  return !msg;
}
const pwField = (name, auto, extra = "") => `
  <span class="pw-wrap"><input name="${name}" type="password" autocomplete="${auto}" ${extra} />
  <button type="button" class="pw-toggle" data-pw="1" aria-label="Password dikhao">👁</button></span>`;

// ---------------------------------------------------------------------
// Login / signup
// ---------------------------------------------------------------------
function acAuthView() {
  document.title = (acTab === "signup" ? "Create account" : "Login") + " – Zzapkart";
  acRoot.innerHTML = `
    <div class="cauth-wrap">
      <section class="cauth-art">
        <img src="images/logo-icon.png" alt="" class="cauth-logo" />
        <h1>${acTab === "signup" ? "Zzapkart par account banao" : "Welcome back!"}</h1>
        <p>Login karke shopping aur bhi aasaan:</p>
        <ul>
          <li>📍 Saved addresses — checkout ek click me</li>
          <li>📦 Saari order history aur tracking ek jagah</li>
          <li>🔁 Pichhla order dobara — "Buy again"</li>
        </ul>
      </section>
      <section class="panel cauth-card">
        <div class="cauth-tabs" role="tablist">
          <button type="button" role="tab" data-tab="login" aria-selected="${acTab === "login"}" class="${acTab === "login" ? "active" : ""}">Login</button>
          <button type="button" role="tab" data-tab="signup" aria-selected="${acTab === "signup"}" class="${acTab === "signup" ? "active" : ""}">Create account</button>
        </div>
        ${acNext.startsWith("checkout.html") ? `<div class="alert info">🛒 Order place karne ke liye login karein ya naya account banayein.</div>` : ""}
        ${acTab === "login" ? `
        <form id="ac-login" class="checkout-form" novalidate>
          <label>Email<input name="email" type="email" autocomplete="email" placeholder="you@example.com" /><small class="err"></small></label>
          <label>Password${pwField("password", "current-password")}<small class="err"></small></label>
          <p class="err" id="ac-login-err" role="alert"></p>
          <button class="btn checkout-btn" type="submit">Login</button>
          <p class="muted cauth-switch">Naya customer? <button type="button" class="link-btn" data-tab="signup">Account banao →</button></p>
        </form>` : `
        <form id="ac-signup" class="checkout-form" novalidate>
          <label>Full name<input name="name" autocomplete="name" maxlength="60" placeholder="Rahul Sharma" /><small class="err"></small></label>
          <label>Email<input name="email" type="email" autocomplete="email" placeholder="you@example.com" /><small class="err"></small></label>
          <label><span>Mobile number <span class="muted">(optional)</span></span><input name="phone" inputmode="numeric" maxlength="10" autocomplete="tel" placeholder="10-digit mobile" /><small class="err"></small></label>
          <label>Password${pwField("password", "new-password")}<small class="hint">Kam se kam 8 characters, ek letter aur ek number</small><small class="err"></small></label>
          <label>Confirm password<input name="confirm" type="password" autocomplete="new-password" /><small class="err"></small></label>
          <button class="btn checkout-btn" type="submit">Create account</button>
          <p class="muted cauth-switch">Pehle se account hai? <button type="button" class="link-btn" data-tab="login">Login karein →</button></p>
        </form>`}
      </section>
    </div>`;

  acRoot.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { acTab = b.dataset.tab; acAuthView(); }));
  acRoot.querySelectorAll("[data-pw]").forEach((b) => b.addEventListener("click", () => {
    const inp = b.previousElementSibling;
    const show = inp.type === "password";
    inp.type = show ? "text" : "password";
    b.setAttribute("aria-label", show ? "Password chhupao" : "Password dikhao");
  }));
  const login = document.getElementById("ac-login");
  if (login) {
    login.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = login.elements.email.value.trim().toLowerCase();
      const pw = login.elements.password.value;
      const errEl = document.getElementById("ac-login-err");
      const ok = [
        acErr(login, "email", EMAIL_RE.test(email) ? "" : "Sahi email daalein"),
        acErr(login, "password", pw ? "" : "Password daalein"),
      ].every(Boolean);
      errEl.textContent = "";
      if (!ok) return;
      const c = customerByEmail(email);
      const match = c ? (await hashPassword(pw, c.salt)) === c.passwordHash : false;
      if (!match) { errEl.textContent = "Email ya password galat hai"; return; }
      if (c.blocked) { errEl.textContent = "Ye account Zzapkart ne block kiya hai. Support se contact karein."; return; }
      setCustomerSession(c.id);
      updateCustomer(c.id, { lastLoginAt: Date.now() });
      showToast(`Welcome back, ${c.name.split(" ")[0]} ✓`);
      acDone();
    });
    login.elements.email.focus();
  }
  const signup = document.getElementById("ac-signup");
  if (signup) {
    signup.elements.phone.addEventListener("input", (e) => (e.target.value = e.target.value.replace(/\D/g, "")));
    signup.addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = (n) => signup.elements[n].value.trim();
      const email = v("email").toLowerCase();
      const pw = signup.elements.password.value;
      const ok = [
        acErr(signup, "name", v("name").length < 2 ? "Apna naam daalein" : ""),
        acErr(signup, "email", !EMAIL_RE.test(email) ? "Sahi email daalein" : customerByEmail(email) ? "Is email se account pehle se hai — login karein" : ""),
        acErr(signup, "phone", v("phone") && !MOBILE_RE.test(v("phone")) ? "Sahi 10-digit mobile number daalein" : ""),
        acErr(signup, "password", pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw) ? "Kam se kam 8 characters, ek letter aur ek number" : ""),
        acErr(signup, "confirm", signup.elements.confirm.value !== pw ? "Dono password same nahi hain" : ""),
      ].every(Boolean);
      if (!ok) { signup.querySelector(".invalid")?.focus(); return; }
      const salt = crypto.getRandomValues(new Uint32Array(4)).join("-");
      const c = { id: uid("C"), name: v("name"), email, phone: v("phone"), salt, passwordHash: await hashPassword(pw, salt), addresses: [], createdAt: Date.now() };
      const list = getCustomers();
      list.push(c);
      if (!saveCustomers(list)) return;
      setCustomerSession(c.id);
      showToast(`Welcome, ${c.name.split(" ")[0]}! Account ban gaya ✓`);
      acDone();
    });
    signup.elements.name.focus();
  }
}

function acResetState() {
  acOrderFilter = "all";
  acOrderQ = "";
  acEditAddr = null;
}

function acDone() {
  acResetState();
  if (acNext) { location.href = acNext; return; }
  history.replaceState(null, "", "account.html#orders");
  acRender();
}

// ---------------------------------------------------------------------
// Logged-in account
// ---------------------------------------------------------------------
function acAccountView(me) {
  const tab = ["orders", "addresses", "profile"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "orders";
  document.title = "My Account – Zzapkart";
  const orders = customerOrders(me.id);
  acRoot.innerHTML = `
    <div class="acct-layout">
      <aside class="panel acct-side">
        <div class="acct-user"><span class="acct-avatar">${esc(storeInitials(me.name))}</span>
          <div><strong>${esc(me.name)}</strong><small>${esc(me.email)}</small></div></div>
        <nav class="acct-nav" aria-label="Account">
          <a href="#orders" class="${tab === "orders" ? "active" : ""}">📦 My Orders <span class="acct-count">${orders.length}</span></a>
          <a href="#addresses" class="${tab === "addresses" ? "active" : ""}">📍 Saved Addresses <span class="acct-count">${(me.addresses || []).length}</span></a>
          <a href="#profile" class="${tab === "profile" ? "active" : ""}">👤 Profile &amp; Security</a>
          <button type="button" class="acct-logout" id="ac-logout">↩ Logout</button>
        </nav>
      </aside>
      <section class="acct-main" id="ac-main"></section>
    </div>`;
  document.getElementById("ac-logout").addEventListener("click", () => {
    clearCustomerSession();
    acResetState();
    showToast("Logout ho gaye");
    history.replaceState(null, "", "account.html");
    acTab = "login";
    acRender();
  });
  const box = document.getElementById("ac-main");
  if (tab === "addresses") acAddressesView(me, box);
  else if (tab === "profile") acProfileView(me, box);
  else acOrdersView(me, box);
}

// ---------- Orders ----------
function acSellerLabel(sellerId) {
  if (sellerId === PLATFORM_SELLER) return "Zzapkart";
  const s = getSeller(sellerId);
  return s ? s.shopName : "Seller";
}
function acTimeline(sh) {
  const reached = AC_STEPS.indexOf(sh.status);
  return `<ol class="track">${AC_STEPS.map((st, i) => {
    const h = sh.history.find((x) => x.status === st);
    return `<li class="${i <= reached ? "done" : ""}"><span>${st}</span>${h ? `<small>${fmtDateTime(h.at)}</small>` : ""}</li>`;
  }).join("")}</ol>`;
}
const acIsActive = (o) => o.shipments.some((sh) => sh.status !== "Delivered");

function acOrderCard(o) {
  const units = o.shipments.reduce((n, sh) => n + sh.items.reduce((m, it) => m + it.qty, 0), 0);
  return `
  <section class="panel order-card" data-order="${esc(o.id)}">
    <div class="order-head">
      <div><strong>Order #${esc(o.id)}</strong>
        <div class="muted">${fmtDateTime(o.createdAt)} · ${units} item(s) · ${AC_PAY[o.payment] || esc(o.payment)} · ${esc((DELIVERY_OPTIONS[o.delivery] || {}).label || "")}</div></div>
      <div class="order-total">${formatPrice(o.total)}</div>
    </div>
    ${o.shipments.map((sh) => `
      <div class="shipment">
        <div class="shipment-head"><span>Sold by <strong>${esc(acSellerLabel(sh.sellerId))}</strong></span><span class="status-pill s-${sh.status.toLowerCase()}">${sh.status}</span></div>
        ${sh.items.map((it) => {
          const live = PRODUCTS.some((p) => String(p.id) === String(it.productId));
          const name = live ? `<a href="product.html?id=${esc(it.productId)}" class="card-title">${esc(it.name)}</a>` : esc(it.name);
          return `<div class="mini-row">
            <div class="mini-img" style="background:#f3eefc">${safeImg(it.image) ? `<img src="${safeImg(it.image)}" alt="" />` : esc(it.emoji || "📦")}</div>
            <div class="mini-info"><div>${name}</div><div class="muted">${it.size ? `Size: ${esc(it.size)} · ` : ""}Qty: ${it.qty}</div></div>
            <div class="mini-price">${formatPrice(it.price * it.qty)}</div>
          </div>`;
        }).join("")}
        ${acTimeline(sh)}
        ${sh.trackingId ? `<p class="muted">Tracking ID: <strong>${esc(sh.trackingId)}</strong>${sh.courier ? " · " + esc(sh.courier) : ""}</p>` : ""}
      </div>`).join("")}
    <div class="order-foot">
      <p class="muted">Delivering to: <strong>${esc(o.buyer.name)}</strong>, ${esc(addressLine(o.buyer))}</p>
      <button type="button" class="btn btn-sm btn-outline" data-buyagain="${esc(o.id)}">🔁 Buy again</button>
    </div>
  </section>`;
}

function acFilteredOrders(me) {
  const q = acOrderQ.trim().toLowerCase();
  return customerOrders(me.id)
    .filter((o) => acOrderFilter === "all" || (acOrderFilter === "active" ? acIsActive(o) : !acIsActive(o)))
    .filter((o) => !q || o.id.toLowerCase().includes(q) || o.shipments.some((sh) => sh.items.some((it) => it.name.toLowerCase().includes(q))));
}

function acOrdersView(me, box) {
  const all = customerOrders(me.id);
  const spent = all.reduce((s, o) => s + o.total, 0);
  const myIds = new Set(all.map((o) => o.id));
  const notifs = dbGet(DB.buyerNotifs, []).filter((n) => myIds.has(n.orderId));
  const listHtml = () => acFilteredOrders(me).map(acOrderCard).join("") || `<div class="panel"><p class="muted">Is filter me koi order nahi.</p></div>`;
  box.innerHTML = `
    <div class="acct-head"><h1 class="dash-title">My Orders</h1>
      <span class="muted">${all.length} order(s) · ${formatPrice(spent)} total</span></div>
    ${notifs.length ? `<section class="panel acct-updates"><h2>Order updates</h2>
      ${notifs.slice(0, 5).map((n) => `<div class="notif ${n.read ? "" : "unread"}"><div>${esc(n.message)}</div><small class="muted">#${esc(n.orderId)} · ${fmtDateTime(n.at)}</small></div>`).join("")}</section>` : ""}
    ${all.length ? `
      <div class="acct-toolbar">
        <div class="filter-tabs">${[["all", "All"], ["active", "In progress"], ["delivered", "Delivered"]].map(([k, l]) => `<button type="button" class="chip ${acOrderFilter === k ? "active" : ""}" data-ofilter="${k}">${l}</button>`).join("")}</div>
        <input type="search" id="ac-oq" class="acct-search" placeholder="Order ID ya product search karein" value="${esc(acOrderQ)}" aria-label="Orders search" />
      </div>
      <div id="ac-olist">${listHtml()}</div>`
    : `<div class="empty"><div class="empty-emoji">📦</div><p>Abhi tak koi order nahi kiya.</p><a href="index.html" class="btn">Shopping shuru karo</a></div>`}`;
  if (notifs.some((n) => !n.read)) dbSet(DB.buyerNotifs, dbGet(DB.buyerNotifs, []).map((n) => (myIds.has(n.orderId) ? { ...n, read: true } : n)));

  box.querySelectorAll("[data-ofilter]").forEach((b) => b.addEventListener("click", () => { acOrderFilter = b.dataset.ofilter; acRender(); }));
  const q = document.getElementById("ac-oq");
  if (q) q.addEventListener("input", () => { acOrderQ = q.value; document.getElementById("ac-olist").innerHTML = listHtml(); });
  box.addEventListener("click", (e) => {
    const b = e.target.closest("[data-buyagain]");
    if (b) acBuyAgain(b.dataset.buyagain);
  });
}

function acBuyAgain(orderId) {
  const o = getOrders().find((x) => x.id === orderId);
  if (!o) return;
  let added = 0, missing = 0;
  o.shipments.forEach((sh) => sh.items.forEach((it) => {
    const key = it.variantId ? cartKey(it.productId, it.variantId) : String(it.productId);
    const r = resolveCartItem(key, 0);
    if (!r) { missing++; return; }
    const n = Math.max(0, Math.min(it.qty, r.maxStock - (getCart()[key] || 0)));
    for (let i = 0; i < n; i++) addToCart(key);
    added += n;
    if (n < it.qty) missing++;
  }));
  showToast(added ? `${added} item(s) cart me add ho gaye ✓${missing ? " · kuch items abhi stock me nahi" : ""}` : "Ye items abhi available nahi hain");
}

// ---------- Addresses ----------
function acAddrForm(me, a) {
  const val = (k, d = "") => esc(a ? a[k] || "" : d);
  const label = a ? a.label : "Home";
  return `
  <form id="ac-addr-form" class="panel checkout-form addr-form" novalidate>
    <h2>${a ? "Address edit karein" : "Naya address"}</h2>
    <div class="form-grid">
      <label>Full name<input name="name" value="${val("name", me.name)}" maxlength="60" autocomplete="name" /><small class="err"></small></label>
      <label>Mobile number<input name="phone" value="${val("phone", me.phone || "")}" inputmode="numeric" maxlength="10" autocomplete="tel" placeholder="10-digit mobile" /><small class="err"></small></label>
      <label>Pincode<input name="pincode" value="${val("pincode")}" inputmode="numeric" maxlength="6" autocomplete="postal-code" placeholder="6-digit pincode" /><small class="err"></small></label>
      <label>City<input name="city" value="${val("city")}" maxlength="40" autocomplete="address-level2" /><small class="err"></small></label>
      <label class="full">Address (House no, building, street, area)<textarea name="address" rows="2" maxlength="200" autocomplete="street-address">${val("address")}</textarea><small class="err"></small></label>
      <label><span>Landmark <span class="muted">(optional)</span></span><input name="landmark" value="${val("landmark")}" maxlength="80" /><small class="err"></small></label>
      <label>State<select name="state"><option value="">Select State</option>${INDIAN_STATES.map((s) => `<option ${a && a.state === s ? "selected" : ""}>${s}</option>`).join("")}</select><small class="err"></small></label>
    </div>
    <div class="addr-type" role="radiogroup" aria-label="Address type">
      ${["Home", "Work", "Other"].map((l) => `<label class="check"><input type="radio" name="label" value="${l}" ${label === l ? "checked" : ""} /> ${l}</label>`).join("")}
    </div>
    <label class="check"><input type="checkbox" name="isDefault" ${a ? (a.isDefault ? "checked" : "") : !(me.addresses || []).length ? "checked" : ""} /> Ise default address banao</label>
    <div class="row-actions"><button type="submit" class="btn">Save address</button><button type="button" class="btn btn-outline" data-addr-cancel="1">Cancel</button></div>
  </form>`;
}

function acAddressesView(me, box) {
  const list = me.addresses || [];
  const editing = acEditAddr === "new" ? null : list.find((a) => a.id === acEditAddr) || null;
  if (acEditAddr && acEditAddr !== "new" && !editing) acEditAddr = null;
  box.innerHTML = `
    <div class="acct-head"><h1 class="dash-title">Saved Addresses</h1>
      ${list.length < MAX_ADDRESSES && !acEditAddr ? `<button type="button" class="btn" data-addr-new="1">+ Add new address</button>` : ""}</div>
    ${acEditAddr ? acAddrForm(me, editing) : ""}
    ${list.length ? `<div class="addr-grid">${list.map((a) => `
      <div class="panel addr-card ${a.isDefault ? "default" : ""}">
        <div class="addr-tags"><span class="addr-label">${esc(a.label)}</span>${a.isDefault ? `<span class="status-pill s-live">Default</span>` : ""}</div>
        <strong>${esc(a.name)}</strong> <span class="muted">${esc(a.phone)}</span>
        <p>${esc(addressLine(a))}</p>
        <div class="row-actions">
          <button type="button" class="btn btn-sm btn-outline" data-addr-edit="${a.id}">Edit</button>
          ${a.isDefault ? "" : `<button type="button" class="btn btn-sm btn-outline" data-addr-default="${a.id}">Set default</button>`}
          <button type="button" class="btn btn-sm btn-danger" data-addr-del="${a.id}">Delete</button>
        </div>
      </div>`).join("")}</div>`
    : acEditAddr ? "" : `<div class="empty"><div class="empty-emoji">📍</div><p>Koi saved address nahi. Address save karo — checkout tez ho jayega.</p><button type="button" class="btn" data-addr-new="1">+ Add address</button></div>`}`;

  const save = (addresses) => { updateCustomer(me.id, { addresses }); acRender(); };
  box.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.addrNew) { acEditAddr = "new"; acRender(); }
    else if (t.dataset.addrCancel) { acEditAddr = null; acRender(); }
    else if (t.dataset.addrEdit) { acEditAddr = t.dataset.addrEdit; acRender(); }
    else if (t.dataset.addrDefault) { save(list.map((a) => ({ ...a, isDefault: a.id === t.dataset.addrDefault }))); showToast("Default address badal gaya ✓"); }
    else if (t.dataset.addrDel) {
      if (!confirm("Ye address delete karna hai?")) return;
      const rest = list.filter((a) => a.id !== t.dataset.addrDel);
      if (rest.length && !rest.some((a) => a.isDefault)) rest[0].isDefault = true;
      if (acEditAddr === t.dataset.addrDel) acEditAddr = null;
      save(rest);
      showToast("Address delete ho gaya");
    }
  });

  const f = document.getElementById("ac-addr-form");
  if (!f) return;
  ["phone", "pincode"].forEach((n) => f.elements[n].addEventListener("input", (e) => (e.target.value = e.target.value.replace(/\D/g, ""))));
  f.elements.name.focus();
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = (n) => f.elements[n].value.trim();
    const ok = [
      acErr(f, "name", v("name").length < 2 ? "Naam daalein" : ""),
      acErr(f, "phone", MOBILE_RE.test(v("phone")) ? "" : "Sahi 10-digit mobile number daalein"),
      acErr(f, "pincode", PIN_RE.test(v("pincode")) ? "" : "Sahi 6-digit pincode daalein"),
      acErr(f, "city", v("city").length >= 2 ? "" : "City daalein"),
      acErr(f, "address", v("address").length >= 8 ? "" : "Poora address daalein"),
      acErr(f, "state", v("state") ? "" : "State chunein"),
    ].every(Boolean);
    if (!ok) { f.querySelector(".invalid")?.focus(); return; }
    const rec = { label: f.elements.label.value || "Home", name: v("name"), phone: v("phone"), pincode: v("pincode"), city: v("city"), address: v("address"), landmark: v("landmark"), state: v("state") };
    let next;
    if (editing) next = list.map((a) => (a.id === editing.id ? { ...a, ...rec } : a));
    else {
      if (list.length >= MAX_ADDRESSES) { showToast(`Max ${MAX_ADDRESSES} addresses`); return; }
      next = list.concat({ id: uid("A"), ...rec, isDefault: false });
    }
    const id = editing ? editing.id : next[next.length - 1].id;
    if (f.elements.isDefault.checked || !next.some((a) => a.isDefault)) next = next.map((a) => ({ ...a, isDefault: a.id === id }));
    acEditAddr = null;
    save(next);
    showToast(editing ? "Address update ho gaya ✓" : "Address save ho gaya ✓");
  });
}

// ---------- Profile & security ----------
function acProfileView(me, box) {
  box.innerHTML = `
    <div class="acct-head"><h1 class="dash-title">Profile &amp; Security</h1><span class="muted">Member since ${fmtDate(me.createdAt)}</span></div>
    <form id="ac-profile" class="panel checkout-form" novalidate>
      <h2>Profile</h2>
      <div class="form-grid">
        <label>Full name<input name="name" value="${esc(me.name)}" maxlength="60" autocomplete="name" /><small class="err"></small></label>
        <label><span>Mobile number <span class="muted">(optional)</span></span><input name="phone" value="${esc(me.phone || "")}" inputmode="numeric" maxlength="10" autocomplete="tel" /><small class="err"></small></label>
        <label class="full">Email<input name="email" type="email" value="${esc(me.email)}" autocomplete="email" /><small class="err"></small></label>
      </div>
      <div class="row-actions"><button type="submit" class="btn">Save changes</button></div>
    </form>
    <form id="ac-pass" class="panel checkout-form" novalidate>
      <h2>Password badlo</h2>
      <div class="form-grid">
        <label class="full">Current password${pwField("current", "current-password")}<small class="err"></small></label>
        <label>New password${pwField("password", "new-password")}<small class="hint">8+ characters, letter + number</small><small class="err"></small></label>
        <label>Confirm new password<input name="confirm" type="password" autocomplete="new-password" /><small class="err"></small></label>
      </div>
      <div class="row-actions"><button type="submit" class="btn">Update password</button></div>
    </form>`;
  box.querySelectorAll("[data-pw]").forEach((b) => b.addEventListener("click", () => {
    const inp = b.previousElementSibling;
    inp.type = inp.type === "password" ? "text" : "password";
  }));
  const pf = document.getElementById("ac-profile");
  pf.elements.phone.addEventListener("input", (e) => (e.target.value = e.target.value.replace(/\D/g, "")));
  pf.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = (n) => pf.elements[n].value.trim();
    const email = v("email").toLowerCase();
    const other = customerByEmail(email);
    const ok = [
      acErr(pf, "name", v("name").length < 2 ? "Naam daalein" : ""),
      acErr(pf, "phone", v("phone") && !MOBILE_RE.test(v("phone")) ? "Sahi 10-digit mobile number daalein" : ""),
      acErr(pf, "email", !EMAIL_RE.test(email) ? "Sahi email daalein" : other && other.id !== me.id ? "Ye email kisi aur account me hai" : ""),
    ].every(Boolean);
    if (!ok) return;
    updateCustomer(me.id, { name: v("name"), phone: v("phone"), email });
    showToast("Profile update ho gaya ✓");
    acRender();
  });
  const pw = document.getElementById("ac-pass");
  pw.addEventListener("submit", async (e) => {
    e.preventDefault();
    const cur = pw.elements.current.value, np = pw.elements.password.value;
    const curOk = (await hashPassword(cur, me.salt)) === me.passwordHash;
    const ok = [
      acErr(pw, "current", curOk ? "" : "Current password galat hai"),
      acErr(pw, "password", np.length < 8 || !/[A-Za-z]/.test(np) || !/\d/.test(np) ? "8+ characters, letter + number" : np === cur ? "Naya password purane se alag rakhein" : ""),
      acErr(pw, "confirm", pw.elements.confirm.value !== np ? "Dono password same nahi hain" : ""),
    ].every(Boolean);
    if (!ok) return;
    const salt = crypto.getRandomValues(new Uint32Array(4)).join("-");
    updateCustomer(me.id, { salt, passwordHash: await hashPassword(np, salt) });
    pw.reset();
    showToast("Password badal gaya ✓");
  });
}

// ---------------------------------------------------------------------
function acRender() {
  const me = currentCustomer();
  renderAccountNav();
  if (!me) return acAuthView();
  if (acNext) { location.replace(acNext); return; } // pehle se login hai → seedha wapas
  acAccountView(me);
}
window.addEventListener("hashchange", acRender);
window.addEventListener("storage", (e) => {
  const busy = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  if (!busy && e.key && [DB.orders, DB.customers, DB.customerSession, DB.buyerNotifs].includes(e.key)) acRender();
});
acRender();
