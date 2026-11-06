// =====================================================================
// Seller Listings — My Listings, Add/Edit Listing, Bulk Upload,
// Category Approvals, Listing Guidelines
// (uses seller.js helpers: me, content, render, tile, openModal...)
// Routes: #listings[/tab]  #add-listing  #add-listing/v/<vertical>  #add-listing/edit/<id>
//         #bulk  #approvals  #guidelines
// =====================================================================

const getPath = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
function setPath(obj, path, val) {
  const ks = path.split(".");
  let o = obj;
  ks.slice(0, -1).forEach((k, i) => {
    if (o[k] == null) o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {};
    o = o[k];
  });
  o[ks[ks.length - 1]] = val;
}
const clone = (x) => JSON.parse(JSON.stringify(x));
const statusPill = (L) => {
  const s = LISTING_STATUS[listingDisplayStatus(L)] || LISTING_STATUS.draft;
  return `<span class="status-pill ${s.cls}">${s.label}</span>`;
};
const qualityBar = (score) => `<div class="q-bar" title="Listing quality ${score}%"><div style="width:${score}%" class="${score >= 75 ? "good" : score >= 50 ? "avg" : "poor"}"></div></div><small>${score}%</small>`;
const verticalPath = (v) => (v ? `${v.superCat} › ${v.cat} › ${v.name}` : "No category chosen (older listing)");

function sellerDefaults() {
  const d = (me.profile && me.profile.defaults) || {};
  return {
    manufacturer: { name: "", address: "", pincode: "", ...(d.manufacturer || {}) },
    packer: { name: "", address: "", pincode: "", ...(d.packer || {}) },
    importer: { name: "", address: "", pincode: "", ...(d.importer || {}) },
    countryOfOrigin: d.countryOfOrigin || "India",
    has: !!(d.manufacturer && d.manufacturer.name),
  };
}

function otherSkus(exceptId) {
  return new Set(listingsOfSeller(me.id).filter((l) => l.id !== exceptId && l.status !== "archived")
    .flatMap((l) => l.variants.map((v) => String(v.sku || "").toUpperCase())));
}

function countsTowardLimit(exceptId) {
  return listingsOfSeller(me.id).filter((l) => l.id !== exceptId && !["archived", "draft"].includes(l.status)).length;
}

// =====================================================================
// MY LISTINGS
// =====================================================================
const LISTING_TABS = [
  ["all", "All"], ["live", "Live"], ["progress", "In progress"], ["qc_failed", "QC errors"],
  ["inactive", "Inactive"], ["oos", "Out of stock"], ["enhance", "Enhance"], ["archived", "Archived"],
];
let listingSearch = "";

function tabFilter(tab, L) {
  const ds = listingDisplayStatus(L);
  switch (tab) {
    case "live": return ds === "live";
    case "progress": return ["draft", "qc_pending", "qc_failed"].includes(ds);
    case "qc_failed": return ds === "qc_failed";
    case "inactive": return ds === "inactive";
    case "oos": return ds === "out_of_stock";
    case "enhance": return ds !== "archived" && (L.quality ?? listingQuality(L).score) < 75;
    case "archived": return ds === "archived";
    default: return ds !== "archived";
  }
}

function viewListings() {
  const tab = (location.hash.split("/")[1] || "all");
  const all = listingsOfSeller(me.id);
  const q = listingSearch.toLowerCase();
  const rows = all.filter((L) => tabFilter(tab, L))
    .filter((L) => !q || `${L.name} ${L.brand || ""} ${L.variants.map((v) => v.sku).join(" ")}`.toLowerCase().includes(q))
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  const p = plan();
  const used = countsTowardLimit(null);

  content.innerHTML = `
    <div class="dash-head">
      <div>
        <h1 class="dash-title">My Listings</h1>
        <p class="muted">${used} / ${p.productLimit === Infinity ? "Unlimited" : p.productLimit} listings (${p.name} plan) · Price and stock changes go live instantly; other changes after QC.</p>
      </div>
      <div class="ads-head-actions">
        <button class="btn btn-outline" id="export-csv">⬇ Export CSV</button>
        <a href="#bulk" class="btn btn-outline">Bulk Upload</a>
        <a href="#add-listing" class="btn">+ Add Listing</a>
      </div>
    </div>
    <div class="filter-tabs">${LISTING_TABS.map(([k, l]) =>
      `<a class="chip ${tab === k ? "active" : ""}" href="#listings/${k}">${l} (${all.filter((L) => tabFilter(k, L)).length})</a>`).join("")}</div>
    <div class="table-toolbar"><input type="search" id="listing-search" placeholder="Search by title, brand or SKU" value="${esc(listingSearch)}" /></div>
    ${rows.length ? `<div class="table-wrap"><table class="table listing-table">
      <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Quality</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows.map((L) => {
        const v = getVertical(L.vertical);
        const fee = feeBreakdown(L.price, templateOf(v), L.pkg);
        const ds = listingDisplayStatus(L);
        const quality = L.quality ?? listingQuality(L).score;
        return `<tr>
          <td><div class="prod-cell"><span class="thumb">${safeImg(L.image) ? `<img src="${safeImg(L.image)}" alt="" />` : "📦"}</span>
            <div><strong>${esc(L.name || "(untitled)")}</strong>
            <div class="muted small">${esc(verticalPath(v))}</div>
            <div class="muted small">SKU: ${L.variants.map((x) => esc(x.sku || "—")).slice(0, 3).join(", ")}${L.variants.length > 3 ? ` +${L.variants.length - 3}` : ""}</div></div></div></td>
          <td class="num">${L.price ? formatPrice(L.price) : "—"}${L.mrp > L.price ? `<div class="mrp">${formatPrice(L.mrp)}</div>` : ""}
            ${L.price ? `<div class="muted small" title="After fees">You get ${money2(fee.settlement)}</div>` : ""}</td>
          <td>${L.variants.map((x) => `<span class="stock-chip ${Number(x.stock) === 0 ? "zero" : Number(x.stock) <= 5 ? "low" : ""}">${x.size ? esc(x.size) + ": " : ""}${Number(x.stock) || 0}</span>`).join(" ")}</td>
          <td class="q-cell">${qualityBar(quality)}</td>
          <td>${statusPill(L)}${ds === "qc_failed" && L.qcReasons && L.qcReasons.length ? `<div class="qc-reasons">${L.qcReasons.map((r) => `• ${esc(r)}`).join("<br>")}</div>` : ""}</td>
          <td class="row-actions">
            ${ds !== "archived" ? `<a class="btn-sm btn-outline" href="#add-listing/edit/${L.id}">${ds === "qc_failed" ? "Fix errors" : ds === "draft" ? "Complete" : "Edit"}</a>` : ""}
            ${L.status === "qc_passed" ? `<button class="btn-sm btn-outline" data-quick="${L.id}">Price / Stock</button>
              <button class="btn-sm btn-outline" data-toggle="${L.id}">${L.listingStatus === "active" ? "Deactivate" : "Activate"}</button>` : ""}
            ${ds === "archived" ? `<button class="btn-sm btn-outline" data-restore="${L.id}">Restore</button>` : ds === "draft" ? `<button class="btn-sm btn-danger" data-del="${L.id}">Delete</button>` : `<button class="icon-btn" data-archive="${L.id}" title="Archive">🗄</button>`}
          </td></tr>`;
      }).join("")}</tbody></table></div>` : `
      <div class="panel empty"><div class="empty-emoji">📦</div><p>${all.length ? "No listings in this tab." : "No listings yet. Create your first one!"}</p>
      <a href="#add-listing" class="btn">+ Add Listing</a></div>`}`;

  const s = document.getElementById("listing-search");
  s.addEventListener("input", () => {
    listingSearch = s.value;
    clearTimeout(s._t);
    s._t = setTimeout(() => { render(); const n = document.getElementById("listing-search"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 300);
  });
  document.getElementById("export-csv").addEventListener("click", () => exportListingsCsv(all));
  content.querySelectorAll("[data-toggle]").forEach((b) => b.addEventListener("click", () => {
    const L = getListing(Number(b.dataset.toggle));
    if (!L || L.sellerId !== me.id) return;
    L.listingStatus = L.listingStatus === "active" ? "inactive" : "active";
    saveListing(L);
    showToast(L.listingStatus === "active" ? "Listing active — it's visible in the store" : "Listing inactive — hidden from the store");
    render();
  }));
  content.querySelectorAll("[data-archive]").forEach((b) => b.addEventListener("click", () => {
    const L = getListing(Number(b.dataset.archive));
    if (!L || L.sellerId !== me.id || !confirm(`Archive "${L.name}"? It will be removed from the store.`)) return;
    L.prevStatus = L.status; L.status = "archived";
    saveListing(L);
    render();
  }));
  content.querySelectorAll("[data-restore]").forEach((b) => b.addEventListener("click", () => {
    const L = getListing(Number(b.dataset.restore));
    if (!L || L.sellerId !== me.id) return;
    L.status = L.prevStatus && L.prevStatus !== "archived" ? L.prevStatus : "draft";
    saveListing(L);
    render();
  }));
  content.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
    const L = getListing(Number(b.dataset.del));
    if (!L || L.sellerId !== me.id || !confirm("Delete this draft?")) return;
    deleteListing(me.id, L.id);
    render();
  }));
  content.querySelectorAll("[data-quick]").forEach((b) => b.addEventListener("click", () => quickEdit(Number(b.dataset.quick))));
};

// Instant price / stock changes (no QC needed)
function quickEdit(id) {
  const L = getListing(id);
  if (!L || L.sellerId !== me.id) return;
  openModal(`
    <form id="quick-form" class="checkout-form" novalidate>
      <div class="modal-head"><h2>Price &amp; Stock</h2><button type="button" class="icon-btn" data-close aria-label="Close">✕</button></div>
      <p class="muted">${esc(L.name)}</p>
      <div class="form-grid">
        <label>MRP (₹) <input name="mrp" type="number" min="1" step="1" value="${L.mrp}" /></label>
        <label>Selling Price (₹) <input name="price" type="number" min="1" step="1" value="${L.price}" /></label>
      </div>
      <table class="table"><thead><tr><th>${L.variants.some((x) => x.size) ? "Size" : ""}</th><th>SKU</th><th>Stock</th></tr></thead>
        <tbody>${L.variants.map((x, i) => `<tr><td>${esc(x.size || "")}</td><td>${esc(x.sku)}</td>
          <td><input class="bid-input" name="stock${i}" type="number" min="0" step="1" value="${Number(x.stock) || 0}" /></td></tr>`).join("")}</tbody></table>
      <small class="err" id="quick-err"></small>
      <div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn" type="submit">Save</button></div>
    </form>`);
  document.getElementById("quick-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const mrp = Number(f.elements.mrp.value), price = Number(f.elements.price.value);
    const stocks = L.variants.map((_, i) => Number(f.elements["stock" + i].value));
    let err = "";
    if (!(Number.isInteger(mrp) && mrp >= 1)) err = "MRP positive whole number";
    else if (!(price >= 1 && price <= mrp)) err = "Selling price must be between 1 and the MRP";
    else if (stocks.some((s) => !(Number.isInteger(s) && s >= 0))) err = "Stock must be 0 or more (whole number)";
    document.getElementById("quick-err").textContent = err;
    if (err) return;
    L.mrp = mrp; L.price = price;
    L.variants.forEach((x, i) => (x.stock = stocks[i]));
    saveListing(L);
    closeModal();
    showToast("Price / stock updated ✓");
    render();
  });
}

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function downloadText(filename, text) {
  const blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

function exportListingsCsv(list) {
  const head = ["Listing ID", "Status", "Product Name", "Brand", "Category", "Seller SKU", "Size", "Stock", "MRP", "Selling Price", "You Get (settlement)", "Quality %"];
  const lines = [head.join(",")];
  list.forEach((L) => {
    const v = getVertical(L.vertical);
    const fee = feeBreakdown(L.price, templateOf(v), L.pkg);
    L.variants.forEach((x) => lines.push([L.id, LISTING_STATUS[listingDisplayStatus(L)].label, L.name, L.brand, verticalPath(v), x.sku, x.size, x.stock, L.mrp, L.price, fee.settlement, L.quality ?? listingQuality(L).score].map(csvCell).join(",")));
  });
  downloadText(`zzapkart-listings-${dayKey()}.csv`, lines.join("\r\n"));
  showToast("Listings CSV downloaded");
}

// =====================================================================
// ADD / EDIT LISTING
// =====================================================================
let LF = null; // { mode, data, saveDefaults, errors, warnings, loadingImages }
let pickerSuper = "";

const FORM_SECTIONS = [
  ["details", "Product details"], ["attrs", "Category attributes"], ["variants", "Sizes, SKU & stock"],
  ["price", "Price & tax"], ["images", "Images"], ["shipping", "Package & dispatch"],
  ["compliance", "Compliance (Legal Metrology)"], ["status", "Status & extras"],
];
function sectionOf(path) {
  if (path.startsWith("attrs.")) return "attrs";
  if (/^(variants|sizeChart|sizes)/.test(path)) return "variants";
  if (/^(mrp|price|gst|hsn)$/.test(path)) return "price";
  if (path.startsWith("images")) return "images";
  if (/^(pkg|sla|fulfilment)/.test(path)) return "shipping";
  if (/^(countryOfOrigin|genericName|netQty|manufacturer|packer|importer)/.test(path)) return "compliance";
  if (/^(approval|plan)$/.test(path)) return "account";
  return "details";
}

function newListingDraft(verticalId) {
  const v = getVertical(verticalId);
  const tpl = templateOf(v);
  const d = sellerDefaults();
  const attrs = {};
  const idealAttr = tpl.req.find((a) => a.k === "idealFor");
  if (idealAttr && v.ideal && idealAttr.o.includes(v.ideal)) attrs.idealFor = v.ideal;
  return {
    id: Date.now(), sellerId: me.id, vertical: v.id, category: v.superCat, status: "draft",
    name: "", brand: "", description: "", features: ["", "", "", "", ""], keywords: "",
    attrs, variants: sizesOf(v) ? [] : [{ id: uid("V"), size: "", sku: "", stock: "" }], sizeChart: {},
    mrp: "", price: "", gst: tpl.gst[0], hsn: tpl.hsn[0],
    countryOfOrigin: d.countryOfOrigin, genericName: tpl.generic[0], netQty: 1,
    manufacturer: d.manufacturer, packer: d.packer, importer: d.importer,
    packerSame: !d.has || !d.packer.name || JSON.stringify(d.packer) === JSON.stringify(d.manufacturer),
    importerSame: !d.has || !d.importer.name || JSON.stringify(d.importer) === JSON.stringify(d.manufacturer),
    pkg: { l: "", b: "", h: "", w: "" }, sla: "2", fulfilment: "seller", listingStatus: "active",
    ean: "", video: null, images: [], createdAt: Date.now(),
  };
}

function syncParties(d) {
  if (d.packerSame) d.packer = { ...d.manufacturer };
  if (d.importerSame) d.importer = { ...d.manufacturer };
}

function viewAddListing() {
  const parts = location.hash.slice(1).split("/");
  if (parts[1] === "edit" && parts[2]) {
    const id = Number(parts[2]);
    if (!LF || LF.mode !== "edit" || LF.data.id !== id) {
      const L = getListing(id);
      if (!L || L.sellerId !== me.id) { content.innerHTML = `<div class="panel empty"><p>Listing not found.</p><a href="#listings" class="btn">My Listings</a></div>`; return; }
      const data = clone(L);
      data.features = (data.features || []).concat(["", "", "", "", ""]).slice(0, 5);
      data.attrs = data.attrs || {};
      data.sizeChart = data.sizeChart || {};
      data.pkg = data.pkg || { l: "", b: "", h: "", w: "" };
      ["manufacturer", "packer", "importer"].forEach((k) => (data[k] = data[k] || { name: "", address: "", pincode: "" }));
      data.images = null;
      data.video = cleanVideoMeta(L.video);
      delete data.videoUrl;
      LF = { mode: "edit", data, saveDefaults: false, errors: [], warnings: [], videoLoading: !!(data.video && data.video.kind === "file") };
      MediaDB.get(id).then((imgs) => {
        if (!LF || LF.data.id !== id) return;
        LF.data.images = imgs && imgs.length ? imgs
          : safeImg(L.image) ? [{ id: uid("IMG"), full: L.image, thumb: L.image, w: 0, h: 0, whiteBg: null }] : [];
        if (document.getElementById("lf-root")) { renderSection("images"); updateSide(); }
      });
      if (LF.videoLoading) {
        MediaDB.get(videoKey(id)).then((rec) => {
          if (!LF || LF.data.id !== id || !LF.videoLoading) return;
          LF.videoLoading = false;
          LF.data.video = rec && rec.blob instanceof Blob ? { ...rec, kind: "file" } : null;
          if (document.getElementById("lf-root")) renderSection("images");
        });
      }
    }
    if (!LF.data.vertical) return renderPicker(true);
    return renderListingForm();
  }
  if (parts[1] === "v" && parts[2] && getVertical(parts[2])) {
    if (!LF || LF.mode !== "new" || LF.data.vertical !== parts[2]) {
      LF = { mode: "new", data: newListingDraft(parts[2]), saveDefaults: !sellerDefaults().has, errors: [], warnings: [] };
    }
    return renderListingForm();
  }
  renderPicker(false);
};

// ---------- Step 1: category picker ----------
// Cascading dropdowns: main category → category → sub category (vertical)
let pickerCat = "";
let pickerV = "";

function pickerSummary(v) {
  const tpl = TEMPLATES[v.template];
  const lock = tpl.restricted && !isCategoryApproved(me.id, tpl.restricted);
  const sizes = sizesOf(v);
  const r = tpl.images;
  return `<div class="pk-summary">
    <div class="pk-path">${esc(v.superCat)} › ${esc(v.cat)} › <strong>${esc(v.name)}</strong></div>
    <ul class="pk-facts">
      <li><span>Form</span><strong>${esc(tpl.label)}</strong></li>
      <li><span>Commission</span><strong>${tpl.commission}%</strong></li>
      <li><span>GST</span><strong>${tpl.gst.map((g) => g + "%").join(" / ")}</strong></li>
      <li><span>HSN (suggested)</span><strong>${esc(tpl.hsn[0])}</strong></li>
      <li><span>Images</span><strong>min ${r.min}${r.ratio ? ` · ${r.ratio[0]}:${r.ratio[1]}` : ""}</strong></li>
      <li><span>Sizes</span><strong>${sizes ? esc(`${sizes[0]} – ${sizes[sizes.length - 1]}`) : "None (single SKU)"}</strong></li>
    </ul>
    ${lock ? `<div class="alert warn">🔒 This category needs <strong>${esc(RESTRICTED[tpl.restricted].label)}</strong> approval. You can save a draft — <a href="#approvals">get approval</a> before sending it for QC.</div>` : ""}
    <button type="button" class="btn" data-v="${v.id}">Continue → add product details</button>
  </div>`;
}

function renderPicker(forLegacy) {
  const sup = TAXONOMY.find((t) => t.name === pickerSuper) || null;
  const cat = sup ? sup.cats.find((c) => c.name === pickerCat) || null : null;
  const verts = cat ? VERTICALS.filter((x) => x.superCat === sup.name && x.cat === cat.name) : [];
  const v = verts.find((x) => x.id === pickerV) || null;
  const opt = (val, label, cur) => `<option value="${esc(val)}" ${val === cur ? "selected" : ""}>${esc(label)}</option>`;
  const locked = (x) => TEMPLATES[x.template].restricted && !isCategoryApproved(me.id, TEMPLATES[x.template].restricted);
  content.innerHTML = `<div id="picker-root">
    <p class="breadcrumb-dark"><a href="#listings">My Listings</a> › Add Listing</p>
    <h1 class="dash-title">${forLegacy ? "Choose a category for this listing" : "What are you selling? Choose a category"}</h1>
    <p class="muted">Choose main category → category → sub category. This decides the rest of the form (fields, size chart, image rules, GST / HSN). The wrong category means QC rejection or lower visibility.</p>
    <section class="panel">
      <h2><span class="step-no">1</span> Choose a category</h2>
      <div class="cascade">
        <label>Main category
          <select id="pk-sup"><option value="">— Choose main category —</option>${TAXONOMY.map((t) => opt(t.name, t.name, sup ? sup.name : "")).join("")}</select></label>
        <span class="cascade-arrow" aria-hidden="true">›</span>
        <label>Category
          <select id="pk-cat" ${sup ? "" : "disabled"}><option value="">${sup ? "— Choose category —" : "Choose a main category first"}</option>${sup ? sup.cats.map((c) => opt(c.name, c.name, pickerCat)).join("") : ""}</select></label>
        <span class="cascade-arrow" aria-hidden="true">›</span>
        <label>Sub category
          <select id="pk-v" ${cat ? "" : "disabled"}><option value="">${cat ? "— Choose sub category —" : "Choose a category first"}</option>${verts.map((x) => opt(x.id, x.name + (locked(x) ? " 🔒" : ""), pickerV)).join("")}</select></label>
      </div>
      <div id="pk-info">${v ? pickerSummary(v) : `<p class="muted pk-hint">${!sup ? "1️⃣ Choose a main category (e.g. Fashion)" : !cat ? "2️⃣ Now choose a category (e.g. Men Top Wear)" : "3️⃣ Now choose a sub category (e.g. T-Shirts)"}</p>`}</div>
    </section>
    <section class="panel">
      <h2>Or search directly</h2>
      <input type="search" id="vsearch" class="v-search" placeholder="Search: T-Shirts, Jeans, Earbuds, Face Wash, Tea..." autocomplete="off" />
      <div id="vresults" class="v-results"></div>
    </section></div>`;
  const pick = (id) => {
    if (forLegacy && LF) {
      const pv = getVertical(id), tpl = templateOf(pv);
      LF.data.vertical = id;
      LF.data.category = pv.superCat;
      LF.data.gst = LF.data.gst ?? tpl.gst[0];
      LF.data.hsn = LF.data.hsn || tpl.hsn[0];
      LF.data.genericName = LF.data.genericName || tpl.generic[0];
      const d = sellerDefaults();
      LF.data.countryOfOrigin = LF.data.countryOfOrigin || d.countryOfOrigin;
      if (!LF.data.manufacturer.name) { LF.data.manufacturer = d.manufacturer; LF.data.packerSame = true; LF.data.importerSame = true; }
      if (sizesOf(pv)) LF.data.variants = [];
      renderListingForm();
    } else location.hash = `add-listing/v/${id}`;
  };
  const root = document.getElementById("picker-root");
  root.querySelector("#pk-sup").addEventListener("change", (e) => {
    pickerSuper = e.target.value; pickerCat = ""; pickerV = "";
    renderPicker(forLegacy);
    document.getElementById(pickerSuper ? "pk-cat" : "pk-sup").focus();
  });
  root.querySelector("#pk-cat").addEventListener("change", (e) => {
    pickerCat = e.target.value; pickerV = "";
    renderPicker(forLegacy);
    document.getElementById(pickerCat ? "pk-v" : "pk-cat").focus();
  });
  root.querySelector("#pk-v").addEventListener("change", (e) => {
    pickerV = e.target.value;
    renderPicker(forLegacy);
    (document.querySelector("#pk-info [data-v]") || document.getElementById("pk-v")).focus();
  });
  root.addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (b) pick(b.dataset.v); });
  const vs = document.getElementById("vsearch");
  vs.addEventListener("input", () => {
    const res = searchVerticals(vs.value);
    document.getElementById("vresults").innerHTML = vs.value.trim()
      ? (res.length ? res.map((x) => `<button class="v-result" data-v="${x.id}"><strong>${esc(x.name)}</strong><span class="muted small">${esc(x.superCat)} › ${esc(x.cat)}</span>${TEMPLATES[x.template].restricted ? `<span class="lock-tag">Approval</span>` : ""}</button>`).join("")
        : `<p class="muted">Nothing found — choose from the dropdowns above.</p>`)
      : "";
  });
}

// ---------- Step 2: the form ----------
const lfv = () => getVertical(LF.data.vertical);
const lft = () => templateOf(lfv());

function fieldWrap(path, label, inner, { req = false, hint = "", full = false } = {}) {
  return `<label class="fld ${full ? "full" : ""}">${esc(label)}${req ? ` <span class="req">*</span>` : ""}${inner}
    ${hint ? `<small class="hint">${hint}</small>` : ""}<small class="err" data-err="${path}"></small></label>`;
}
function fInput(path, label, opts = {}) {
  const val = getPath(LF.data, path);
  const t = opts.type || "text";
  return fieldWrap(path, label, `<input data-f="${path}" ${t === "number" ? 'type="number" data-num="1" step="any" min="0"' : 'type="text"'} value="${esc(val ?? "")}" placeholder="${esc(opts.ph || "")}" ${opts.max ? `maxlength="${opts.max}"` : ""} ${opts.list ? `list="${opts.list}"` : ""} />`, opts);
}
function fSelect(path, label, options, opts = {}) {
  const val = String(getPath(LF.data, path) ?? "");
  return fieldWrap(path, label, `<select data-f="${path}"><option value="">Select</option>${options.map((o) => {
    const [v, l] = Array.isArray(o) ? o : [o, o];
    return `<option value="${esc(v)}" ${String(v) === val ? "selected" : ""}>${esc(l)}</option>`;
  }).join("")}</select>`, opts);
}
function fTextarea(path, label, opts = {}) {
  return fieldWrap(path, label, `<textarea data-f="${path}" rows="${opts.rows || 3}" maxlength="${opts.max || 2000}" placeholder="${esc(opts.ph || "")}">${esc(getPath(LF.data, path) ?? "")}</textarea>`, opts);
}
// HSN: suggested codes (code + meaning) + "other code" + HSN finder
function hsnHint(code) {
  const c = String(code || "").trim();
  if (!c) return 'Type a code or use "Find an HSN code" below';
  const d = hsnDesc(c);
  return d ? "📘 " + esc(d) : "This code isn't in our list — confirm it on the GST portal";
}
function hsnFieldHtml(tpl) {
  const cur = String(LF.data.hsn ?? "");
  const listed = tpl.hsn.includes(cur);
  return `<label class="fld hsn-fld">HSN Code <span class="req">*</span>
    <select data-act="hsn-pick" aria-label="Choose an HSN code">
      ${tpl.hsn.map((h) => `<option value="${h}" ${h === cur ? "selected" : ""}>${h} — ${esc(hsnDesc(h))}</option>`).join("")}
      <option value="__other" ${listed ? "" : "selected"}>Another HSN code (type it in)</option>
    </select>
    <input data-f="hsn" type="text" inputmode="numeric" maxlength="8" class="hsn-custom ${listed ? "hidden" : ""}" value="${esc(cur)}" placeholder="4, 6 or 8 digit HSN code" aria-label="HSN code" />
    <small class="hint" id="hsn-desc">${hsnHint(cur)}</small>
    <small class="err" data-err="hsn"></small></label>`;
}
function hsnFinderHtml() {
  return `<details class="hsn-finder"><summary>🔎 Don't know the HSN code? Find it here</summary>
    <input type="search" id="hsn-q" placeholder="Type a product or code — e.g. cotton t-shirt, earphones, 6109" autocomplete="off" aria-label="HSN search" />
    <div id="hsn-results" class="hsn-results"></div>
    <p class="small muted">Descriptions are a guide only. Confirm the final HSN with your CA or the <a href="https://services.gst.gov.in/services/searchhsnsac" target="_blank" rel="noopener">GST portal (HSN search)</a>.</p>
  </details>`;
}
function renderHsnResults(q) {
  const box = document.getElementById("hsn-results");
  if (!box) return;
  const res = searchHsn(q);
  box.innerHTML = !q.trim() ? "" : res.length
    ? res.map((x) => `<button type="button" class="hsn-hit" data-act="hsn-use" data-code="${x.code}"><strong>${x.code}</strong><span>${esc(x.desc)}</span></button>`).join("")
    : `<p class="muted small">Nothing found — try another word.</p>`;
}
function setHsn(code) {
  const root = document.getElementById("lf-root");
  const sel = root.querySelector('[data-act="hsn-pick"]');
  const inp = root.querySelector('[data-f="hsn"]');
  if (!inp) return;
  const listed = lft().hsn.includes(code);
  if (sel) sel.value = listed ? code : "__other";
  inp.classList.toggle("hidden", listed);
  inp.value = code;
  inp.dispatchEvent(new Event("input", { bubbles: true }));
}

function attrField(a, req) {
  const path = `attrs.${a.k}`;
  if (a.o) return fSelect(path, a.l, a.o, { req, hint: a.hint ? esc(a.hint) : "" });
  if (a.t === "textarea") return fTextarea(path, a.l, { req, full: true, rows: 2, ph: a.hint || "" });
  return fInput(path, a.l, { req, type: a.t === "number" ? "number" : "text", ph: a.hint || "" });
}

function renderListingForm() {
  const v = lfv(), tpl = lft();
  const d = LF.data;
  const restrictedLocked = tpl.restricted && !isCategoryApproved(me.id, tpl.restricted);
  const isLive = d.status === "qc_passed";
  content.innerHTML = `
    <p class="breadcrumb-dark"><a href="#listings">My Listings</a> › <a href="#add-listing">Add Listing</a> › ${esc(verticalPath(v))}</p>
    <div class="dash-head">
      <h1 class="dash-title">${LF.mode === "edit" ? "Edit listing" : "New listing"}: ${esc(v.name)}</h1>
      ${LF.mode === "new" ? `<a href="#add-listing" class="btn-sm btn-outline">Change category</a>` : ""}
    </div>
    ${d.status === "qc_failed" && d.qcReasons && d.qcReasons.length ? `<div class="alert error"><strong>QC errors — fix these and resubmit:</strong><br>${d.qcReasons.map((r) => "• " + esc(r)).join("<br>")}</div>` : ""}
    ${isLive ? `<div class="alert info">This listing is live. Use <a href="#listings">My Listings → Price / Stock</a> for price and stock (updates instantly). Changing content here sends the listing back to QC.</div>` : ""}
    ${restrictedLocked ? `<div class="alert warn">🔒 <strong>${esc(RESTRICTED[tpl.restricted].label)}</strong> is a restricted category — you need <a href="#approvals">category approval</a> with your ${esc(RESTRICTED[tpl.restricted].license)}. You can save a draft until then.</div>` : ""}
    <div id="lf-errors"></div>
    <div class="wizard lf-wrap checkout-form" id="lf-root">
      <div class="wizard-main">
        ${FORM_SECTIONS.map(([id, title], i) => `
          <section class="panel lf-sec" id="sec-${id}">
            <h2><span class="step-no">${i + 1}</span> ${id === "variants" && !sizesOf(v) ? "SKU & stock" : title}</h2>
            <div class="sec-body" id="body-${id}"></div>
          </section>`).join("")}
      </div>
      <aside class="wizard-side panel" id="lf-side"></aside>
    </div>`;
  FORM_SECTIONS.forEach(([id]) => renderSection(id));
  updateSide();
  wireForm();
}

function renderSection(id) {
  const el = document.getElementById("body-" + id);
  if (!el) return;
  const v = lfv(), tpl = lft(), d = LF.data;
  const sizes = sizesOf(v);
  let html = "";
  if (id === "details") {
    html = `<div class="form-grid">
      ${fInput("name", "Product Name", { req: true, full: true, max: 150, ph: "Brand + Gender + Product + Fabric + Fit + Colour",
        hint: `Pattern: <em>Brand + Gender + Product + Fabric + Fit + Colour</em>. No price / offer words (₹, % off, free, sale). <span id="name-count">${String(d.name || "").length}</span>/150` })}
      ${fInput("brand", "Brand", { req: true, max: 50, ph: "ZZAPKART", hint: "Use 'Generic' if you don't have a brand" })}
      ${fInput("keywords", "Search Keywords", { ph: "cotton tshirt, round neck tee", hint: "Separate with commas (good to have)" })}
      ${fTextarea("description", "Product Description", { req: true, full: true, rows: 4, max: 2000, ph: "Fabric, fit, use, care — 30+ characters. No phone numbers or links." })}
      <div class="fld full"><span>Key Features <span class="muted">(5 bullet points — good to have)</span></span>
        ${d.features.map((f, i) => `<input data-f="features.${i}" type="text" maxlength="200" value="${esc(f)}" placeholder="Feature ${i + 1}" class="feature-input" />`).join("")}
      </div>
    </div>`;
  } else if (id === "attrs") {
    html = `<h3 class="sub-h">Compulsory <span class="muted small">(${tpl.label})</span></h3>
      <div class="form-grid three">${tpl.req.map((a) => attrField(a, true)).join("")}</div>
      <details class="good-attrs" ${tpl.good.some((a) => getPath(d, "attrs." + a.k)) ? "open" : ""}>
        <summary>Good-to-have attributes <span class="boost">can increase visibility by up to ~21%</span></summary>
        <div class="form-grid three">${tpl.good.map((a) => attrField(a, false)).join("")}</div>
      </details>`;
  } else if (id === "variants") {
    const chart = tpl.sizeChart || [];
    if (sizes) {
      const chosen = new Set(d.variants.map((x) => x.size));
      html = `<p class="muted">Click the sizes you sell. Each size gets its own SKU and stock (include the size in the SKU, e.g. ZZ-CL-RN01-M).</p>
        <div class="size-picker seller">${sizes.map((s) => `<button type="button" class="size-btn ${chosen.has(s) ? "active" : ""}" data-act="size" data-size="${esc(s)}">${esc(s)}</button>`).join("")}</div>
        <small class="err" data-err="variants"></small>
        ${d.variants.length ? `
          <div class="variant-tools">
            <button type="button" class="btn-sm btn-outline" data-act="auto-sku">⚡ Auto SKU</button>
            <span class="muted small">Stock for all sizes:</span><input type="number" min="0" id="bulk-stock" class="bid-input" placeholder="10" />
            <button type="button" class="btn-sm btn-outline" data-act="bulk-stock">Apply</button>
          </div>
          <div class="table-wrap"><table class="table variant-table">
            <thead><tr><th>Size</th><th>Seller SKU *</th><th>Stock *</th>${chart.map((f) => `<th>${esc(f.l)} *</th>`).join("")}</tr></thead>
            <tbody>${d.variants.map((x, i) => `<tr>
              <td><strong>${esc(x.size)}</strong></td>
              <td><input data-f="variants.${i}.sku" value="${esc(x.sku)}" maxlength="40" class="sku-input" /><small class="err" data-err="variants.${i}.sku"></small></td>
              <td><input data-f="variants.${i}.stock" data-num="1" type="number" min="0" step="1" value="${esc(x.stock)}" class="bid-input" /><small class="err" data-err="variants.${i}.stock"></small></td>
              ${chart.map((f) => `<td><input data-f="sizeChart.${x.size}.${f.k}" data-num="1" type="number" min="0" step="0.5" value="${esc(getPath(d, `sizeChart.${x.size}.${f.k}`) ?? "")}" class="bid-input" /></td>`).join("")}
            </tr>`).join("")}</tbody></table></div>
          ${chart.length ? `<small class="err" data-err="sizeChart"></small><p class="muted small">A size chart is required — garment measurements in inches / cm.</p>` : ""}` : ""}`;
    } else {
      html = `<div class="form-grid">
        ${fInput("variants.0.sku", "Seller SKU ID", { req: true, max: 40, ph: "ZZ-EB-001", hint: "Your own unique code" })}
        ${fInput("variants.0.stock", "Stock", { req: true, type: "number" })}
        <div class="fld"><button type="button" class="btn-sm btn-outline" data-act="auto-sku">⚡ Auto SKU</button></div>
      </div>`;
    }
  } else if (id === "price") {
    const gstOpts = [...new Set(tpl.gst.concat([0, 3, 5, 18, 40]))].sort((a, b) => a - b).map((g) => [g, `${g}%${tpl.gst.includes(g) ? " (suggested)" : ""}`]);
    html = `<div class="form-grid">
      ${fInput("mrp", "MRP (₹)", { req: true, type: "number", hint: "Positive whole number. Selling price ≤ MRP" })}
      ${fInput("price", "Selling Price (₹)", { req: true, type: "number", hint: `<span id="disc-label">${discLabel()}</span>` })}
      ${fSelect("gst", "GST Rate", gstOpts, { req: true, hint: esc(tpl.gstHint) })}
      ${hsnFieldHtml(tpl)}
    </div>
    ${hsnFinderHtml()}
    <div class="fee-box" id="fee-box">${feeBoxHtml()}</div>`;
  } else if (id === "images") {
    const imgs = d.images;
    const r = tpl.images;
    html = imgs === null ? `<p class="muted">Loading images…</p>` : `
      <ul class="rules">
        <li>At least <strong>${r.min}</strong> image required, <strong>${r.rec}</strong> recommended (front, back, model, close-up, size chart, lifestyle)</li>
        <li><strong>Photos of any size or resolution work</strong> — best: longest side 1000 px+ (for zoom)</li>
        ${r.ratio ? `<li>This category uses <strong>${r.ratio[0]}:${r.ratio[1]}</strong> — other photo sizes are fitted to ${r.ratio[0]}:${r.ratio[1]} on a white background automatically (nothing is cut off)</li>` : ""}
        <li>Main image: <strong>white background</strong>, product only — no text / watermark / logo / price / props</li>
        <li>JPG, PNG, WEBP, GIF, AVIF… · files up to 1 GB · max 8 images</li>
      </ul>
      <label class="dropzone ${imgs.length >= 8 ? "disabled" : ""}">
        <input type="file" accept="image/*" multiple data-act="img-upload" ${imgs.length >= 8 ? "disabled" : ""} />
        <span>📷 Choose images or drop them here</span><small class="muted">${imgs.length}/8 uploaded</small>
      </label>
      <small class="err" data-err="images"></small>
      <div class="img-grid">${imgs.map((im, i) => {
        const ratioOk = !r.ratio || (im.w && Math.abs(im.w / im.h - r.ratio[0] / r.ratio[1]) <= 0.03);
        const resOk = Math.max(im.w || 0, im.h || 0) >= 1000;
        return `<div class="img-card ${i === 0 ? "main" : ""}">
          <img src="${safeImg(im.thumb || im.full)}" alt="" />
          ${i === 0 ? `<span class="img-tag">MAIN</span>` : ""}
          <div class="img-meta">
            <span class="${resOk || !im.w ? "ok" : "warn"}" title="${resOk ? "Good resolution" : "OK — 1000px+ gives better zoom"}">${im.w ? `${im.w}×${im.h}` : "size ?"}</span>
            ${r.ratio ? `<span class="${ratioOk ? "ok" : "warn"}">${ratioOk ? (im.fitted ? `${r.ratio[0]}:${r.ratio[1]} fit ✓` : `${r.ratio[0]}:${r.ratio[1]} ✓`) : "ratio alag"}</span>` : ""}
            ${i === 0 && im.whiteBg === false ? `<span class="warn">bg not white</span>` : ""}
          </div>
          <div class="img-actions">
            ${i > 0 ? `<button type="button" data-act="img-main" data-i="${i}">Main</button>` : ""}
            <button type="button" data-act="img-del" data-i="${i}">✕</button>
          </div>
          <small class="err" data-err="images.${i}"></small>
        </div>`;
      }).join("")}</div>
      ${videoBlockHtml()}`;
  } else if (id === "shipping") {
    const pkg = d.pkg || {};
    const volKg = pkg.l && pkg.b && pkg.h ? (pkg.l * pkg.b * pkg.h) / 5000 : 0;
    html = `<div class="form-grid four">
      ${fInput("pkg.l", "Length (cm)", { req: true, type: "number" })}
      ${fInput("pkg.b", "Breadth (cm)", { req: true, type: "number" })}
      ${fInput("pkg.h", "Height (cm)", { req: true, type: "number" })}
      ${fInput("pkg.w", "Weight (g)", { req: true, type: "number", hint: "Including packaging" })}
    </div>
    <p class="muted small" id="vol-weight">Volumetric weight: ${volKg ? (volKg * 1000).toFixed(0) + " g" : "—"} · The shipping fee uses whichever is higher: dead or volumetric weight. A folded T-shirt pack is typically ~28×22×3 cm, 200–250 g.</p>
    <div class="form-grid">
      ${fSelect("sla", "Dispatch time (Procurement SLA)", OPT.sla.map((s) => [s, `${s} day${s === "1" ? "" : "s"}`]), { req: true, hint: "Shorter SLA = better ranking (next-day dispatch is best)" })}
      ${fSelect("fulfilment", "Fulfilment by", [["seller", "Seller (Self Ship)"], ["zzapkart", "Zzapkart Fulfilment (warehouse)"]], { req: true })}
    </div>`;
  } else if (id === "compliance") {
    const partyFields = (p, label) => `
      <h3 class="sub-h">${label} <span class="req">*</span></h3>
      <div class="form-grid">
        ${fInput(`${p}.name`, "Name", { req: true })}
        ${fInput(`${p}.pincode`, "Pincode", { req: true, max: 6 })}
        ${fTextarea(`${p}.address`, "Full Address", { req: true, full: true, rows: 2 })}
      </div>`;
    html = `<p class="muted">Under Legal Metrology rules, the name, full address and pincode of the manufacturer, packer and importer are all required. For Indian products you can use your own / the manufacturer's details as the importer.</p>
      <div class="form-grid three">
        ${fSelect("countryOfOrigin", "Country of Origin", OPT.countries, { req: true })}
        ${fSelect("genericName", "Generic Name", tpl.generic, { req: true })}
        ${fInput("netQty", "Net Quantity (pieces)", { req: true, type: "number" })}
      </div>
      <div class="defaults-row">
        ${sellerDefaults().has ? `<button type="button" class="btn-sm btn-outline" data-act="use-defaults">↺ Fill in my default details</button>` : `<span class="muted small">Tip: save default details in your <a href="#profile" class="link">Profile</a> — they'll fill in automatically on every listing.</span>`}
        <label class="check"><input type="checkbox" data-act="save-defaults" ${LF.saveDefaults ? "checked" : ""} /> Save these as my default details</label>
      </div>
      ${partyFields("manufacturer", "Manufacturer")}
      <label class="check"><input type="checkbox" data-act="packer-same" ${d.packerSame ? "checked" : ""} /> Packer = Manufacturer</label>
      ${d.packerSame ? "" : partyFields("packer", "Packer")}
      <label class="check"><input type="checkbox" data-act="importer-same" ${d.importerSame ? "checked" : ""} /> Importer = Manufacturer (Indian product)</label>
      ${d.importerSame ? "" : partyFields("importer", "Importer")}`;
  } else if (id === "status") {
    html = `<div class="pay-options">
        <label class="pay-opt ${d.listingStatus === "active" ? "selected" : ""}"><input type="radio" name="lstatus" data-act="lstatus" value="active" ${d.listingStatus === "active" ? "checked" : ""} /><span><strong>Active</strong> — goes live as soon as it passes QC</span></label>
        <label class="pay-opt ${d.listingStatus === "inactive" ? "selected" : ""}"><input type="radio" name="lstatus" data-act="lstatus" value="inactive" ${d.listingStatus === "inactive" ? "checked" : ""} /><span><strong>Inactive</strong> — stays hidden even after QC</span></label>
      </div>
      <div class="form-grid">
        ${fInput("ean", "EAN / UPC (barcode)", { max: 14, hint: "Good-to-have" })}
      </div>
      <p class="muted small">🎬 Add the product video in the <a href="#" data-goto-sec="images" class="link">Images</a> section.</p>`;
  }
  el.innerHTML = html;
  if (id === "images") attachVideoSrc();
  applyErrors();
}

// ---------------------------------------------------------------------
// Product video (inside the Images section): file upload or YouTube link
// ---------------------------------------------------------------------
function videoBlockHtml() {
  const v = LF.data.video;
  const P = PRODUCT_VIDEO;
  const pick = (label) => `<input type="file" accept="video/mp4,video/webm,video/quicktime" data-act="vid-upload" aria-label="${label}" />`;
  let body;
  if (LF.videoLoading) body = `<p class="muted">Loading video…</p>`;
  else if (LF.videoBusy) body = `<p class="vid-busy">⏳ Checking the video (length, quality, preview)…</p>`;
  else if (v && v.kind === "file") {
    const good = Math.min(v.w, v.h) >= P.goodSide;
    body = `
    <div class="vid-card">
      <video controls playsinline preload="metadata" ${safeImg(v.poster) ? `poster="${safeImg(v.poster)}"` : ""} data-vid-src="1" aria-label="Product video preview"></video>
      <div class="vid-meta">
        <strong>${esc(v.name || "Product video")}</strong>
        <span class="muted small">${fmtDuration(v.duration)} min · ${v.w}×${v.h} · ${fmtBytes(v.size)}</span>
        <span class="small ${good ? "green" : "text-warn"}">${good ? "✓ Good quality" : "Quality is a little low — 720p / 1080p is better"}</span>
        <div class="row-actions">
          <label class="btn btn-sm btn-outline vid-replace">Replace${pick("Replace the video")}</label>
          <button type="button" class="btn btn-sm btn-danger" data-act="vid-del">Remove</button>
        </div>
      </div>
    </div>`;
  } else if (v && v.kind === "yt") {
    body = `
    <div class="vid-card">
      <div class="vid-yt"><iframe src="${ytEmbedUrl(v.ytId)}" title="YouTube video preview" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>
      <div class="vid-meta">
        <strong>YouTube video</strong>
        <span class="muted small">youtu.be/${esc(v.ytId)}</span>
        <div class="row-actions"><button type="button" class="btn btn-sm btn-danger" data-act="vid-del">Remove</button></div>
      </div>
    </div>`;
  } else {
    body = `
    <label class="dropzone vid-drop">
      ${pick("Choose a product video")}
      <span>🎬 Choose a video or drop it here</span><small class="muted">MP4 / WebM / MOV · up to ${fmtBytes(P.maxMB * 1048576)} · ${P.minSec} sec – ${P.maxSec / 60} min · vertical 9:16 looks best</small>
    </label>
    <div class="vid-or"><span>or add a YouTube link</span></div>
    <div class="vid-yt-row">
      <input type="url" id="vid-yt-input" placeholder="https://youtu.be/…  or  youtube.com/watch?v=…" aria-label="YouTube video link" autocomplete="off" />
      <button type="button" class="btn btn-sm" data-act="vid-yt">Add link</button>
    </div>`;
  }
  return `
    <div class="vid-box" id="vid-box">
      <h3 class="sub-h">🎬 Product video <span class="muted small">(optional — shown as a vertical reel; shoppers trust products with video more)</span></h3>
      <ul class="rules">
        <li>${P.minSec} seconds to ${P.maxSec / 60} minutes · at least ${P.minSide}p (720p / 1080p best) · up to ${fmtBytes(P.maxMB * 1048576)}</li>
        <li>Show only this product — 360° view, fabric / fit close-ups, the product in use</li>
        <li>No phone numbers, websites or other platforms' logos / watermarks (QC will reject it)</li>
      </ul>
      ${body}
      <small class="err" id="vid-err" role="alert"></small>
    </div>`;
}
function attachVideoSrc() {
  const el = document.querySelector("#lf-root [data-vid-src]");
  const v = LF && LF.data.video;
  if (!el || !v || !(v.blob instanceof Blob)) return;
  if (LF.vidBlob !== v.blob) {
    if (LF.vidUrl) URL.revokeObjectURL(LF.vidUrl);
    LF.vidUrl = URL.createObjectURL(v.blob);
    LF.vidBlob = v.blob;
  }
  el.src = LF.vidUrl;
}
function videoError(msg) {
  const el = document.getElementById("vid-err");
  if (el) el.textContent = msg || "";
}
async function videoUpload(file) {
  if (!file) return;
  LF.videoBusy = true;
  renderSection("images");
  let err = "";
  try {
    const r = await processProductVideo(file);
    LF.data.video = r;
    LF.videoDirty = true;
    LF.videoLoading = false;
    showToast(r.lowRes ? "Video added ✓ · 720p+ looks even better" : "Video added ✓");
  } catch (e) {
    err = e.message;
    showToast(e.message);
  }
  LF.videoBusy = false;
  renderSection("images");
  videoError(err);
  updateSide();
}
function videoAddYoutube() {
  const inp = document.getElementById("vid-yt-input");
  const id = ytIdFrom(inp ? inp.value : "");
  if (!id) { videoError("Enter a valid YouTube link — e.g. https://youtu.be/abc123XYZ_0 or youtube.com/watch?v=…"); inp && inp.focus(); return; }
  LF.data.video = { kind: "yt", ytId: id };
  LF.videoDirty = true;
  LF.videoLoading = false;
  renderSection("images");
  updateSide();
  showToast("YouTube video added ✓");
}

function discLabel() {
  const mrp = Number(LF.data.mrp), price = Number(LF.data.price);
  return mrp > 0 && price > 0 && price <= mrp ? `Shown as ${Math.round(((mrp - price) / mrp) * 100)}% off` : "This is the price customers see";
}

function feeBoxHtml() {
  const d = LF.data;
  if (!(Number(d.price) > 0)) return `<p class="muted">Enter a selling price — the fees and the amount you receive appear here.</p>`;
  const f = feeBreakdown(d.price, lft(), d.pkg);
  return `
    <h3>Fees &amp; settlement <span class="muted small">(Zzapkart demo fee schedule)</span></h3>
    <table class="fee-table"><tbody>
      <tr><td>Selling price</td><td class="num">${money2(f.price)}</td></tr>
      <tr><td>Commission (${f.commissionPct}%)</td><td class="num">− ${money2(f.commission)}</td></tr>
      <tr><td>Fixed / closing fee</td><td class="num">− ${money2(f.fixed)}</td></tr>
      <tr><td>Shipping fee (${f.shipKg} kg, national)</td><td class="num">− ${money2(f.shipping)}</td></tr>
      <tr><td>Collection fee (2%)</td><td class="num">− ${money2(f.collection)}</td></tr>
      <tr><td>GST on fees (18%)</td><td class="num">− ${money2(f.gst)}</td></tr>
      <tr class="total"><td>You receive (per unit)</td><td class="num">${money2(f.settlement)}</td></tr>
    </tbody></table>
    <p class="muted small">When pricing, always work out profit from the settlement amount. Local / zonal shipping costs less than national.</p>`;
}

function updateSide() {
  const side = document.getElementById("lf-side");
  if (!side || !LF) return;
  const d = LF.data;
  if (d.images === null) { side.innerHTML = `<p class="muted">Loading…</p>`; return; }
  syncParties(d);
  const tpl = lft();
  const q = listingQuality(d);
  const res = validateListing(d, { forSubmit: true, approvalOk: !tpl.restricted || isCategoryApproved(me.id, tpl.restricted), otherSkus: otherSkus(d.id), limitReached: countsTowardLimit(d.id) >= plan().productLimit });
  const perSec = {};
  res.errors.forEach((e) => { const s = sectionOf(e.path); perSec[s] = (perSec[s] || 0) + 1; });
  const fee = Number(d.price) > 0 ? feeBreakdown(d.price, tpl, d.pkg) : null;
  side.innerHTML = `
    <h2>Listing quality</h2>
    <div class="q-big ${q.score >= 75 ? "good" : q.score >= 50 ? "avg" : "poor"}"><span>${q.score}%</span><small>${q.label}</small></div>
    <div class="q-bar big"><div style="width:${q.score}%" class="${q.score >= 75 ? "good" : q.score >= 50 ? "avg" : "poor"}"></div></div>
    <ul class="checklist">${FORM_SECTIONS.map(([id, title]) => `<li class="${perSec[id] ? "todo" : "done"}"><a href="#" data-goto="${id}">${perSec[id] ? `<b>${perSec[id]}</b>` : "✓"} ${esc(id === "variants" && !sizesOf(lfv()) ? "SKU & stock" : title)}</a></li>`).join("")}
      ${perSec.account ? `<li class="todo"><b>!</b> ${res.errors.filter((e) => sectionOf(e.path) === "account").map((e) => esc(e.msg)).join(" · ")}</li>` : ""}</ul>
    ${q.missingGood.length ? `<div class="side-tip"><strong>Visibility badhao:</strong> ${q.missingGood.slice(0, 4).map(esc).join(", ")}${q.missingGood.length > 4 ? "…" : ""}</div>` : ""}
    ${fee ? `<div class="side-fee">You receive <strong>${money2(fee.settlement)}</strong> / unit</div>` : ""}
    <button class="btn checkout-btn" id="lf-submit">${d.status === "qc_passed" ? "Submit changes for QC" : "Submit for QC"}</button>
    ${d.status !== "qc_passed" ? `<button class="btn btn-outline checkout-btn" id="lf-draft">Save draft</button>` : `<a class="btn btn-outline checkout-btn" href="#listings">Cancel</a>`}
    <details class="side-tips"><summary>Tips to avoid rejection</summary>
      <ul>
        <li>Choose the right category / vertical</li>
        <li>Use the dropdown values</li>
        <li>Accurate package dimensions (wrong values = wrong fees)</li>
        <li>No keyword stuffing / offer words in the title</li>
        <li>Clean main image: white background, product only</li>
        <li>Fill in the good-to-have fields too</li>
        <li>A separate SKU for each size</li>
      </ul></details>`;
  side.querySelectorAll("[data-goto]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("sec-" + a.dataset.goto)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  document.getElementById("lf-submit").addEventListener("click", () => submitListing());
  const dr = document.getElementById("lf-draft");
  if (dr) dr.addEventListener("click", () => saveDraftListing());
}

function applyErrors() {
  if (!LF || !LF.shown) return;
  document.querySelectorAll("#lf-root [data-err]").forEach((el) => (el.textContent = ""));
  document.querySelectorAll("#lf-root .invalid").forEach((el) => el.classList.remove("invalid"));
  LF.errors.forEach((e) => {
    const el = document.querySelector(`#lf-root [data-err="${CSS.escape(e.path)}"]`);
    if (el) el.textContent = e.msg;
    const inp = document.querySelector(`#lf-root [data-f="${CSS.escape(e.path)}"]`);
    if (inp) inp.classList.add("invalid");
  });
}

function showValidation(res) {
  LF.errors = res.errors;
  LF.warnings = res.warnings;
  LF.shown = true;
  applyErrors();
  const box = document.getElementById("lf-errors");
  const secName = (p) => (FORM_SECTIONS.find(([id]) => id === sectionOf(p)) || [, "Account"])[1];
  box.innerHTML = `
    ${res.errors.length ? `<div class="alert error"><strong>${res.errors.length} thing(s) to fix:</strong>
      <ul class="err-list">${res.errors.slice(0, 12).map((e) => `<li><a href="#" data-goto="${sectionOf(e.path)}">${esc(secName(e.path))}</a>: ${esc(e.msg)}</li>`).join("")}${res.errors.length > 12 ? `<li>…and ${res.errors.length - 12} more</li>` : ""}</ul></div>` : ""}
    ${res.warnings.length ? `<div class="alert warn"><strong>Suggestions:</strong><ul class="err-list">${res.warnings.map((w) => `<li>${esc(w.msg)}</li>`).join("")}</ul></div>` : ""}`;
  box.querySelectorAll("[data-goto]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("sec-" + a.dataset.goto)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  if (res.errors.length) box.scrollIntoView({ behavior: "smooth", block: "start" });
}

function autoSkuBase(d) {
  const raw = (d.attrs && (d.attrs.styleCode || d.attrs.modelNumber)) || `${d.brand || "ZZ"}-${d.name || "ITEM"}`;
  return String(raw).toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 26) || "ZZ-ITEM";
}

let sideTimer = null;
function wireForm() {
  const root = document.getElementById("lf-root");
  root.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "hsn-q") { renderHsnResults(t.value); return; }
    if (!t.dataset.f) return;
    let val = t.value;
    if (t.dataset.num) val = val === "" ? "" : Number(val);
    setPath(LF.data, t.dataset.f, val);
    const p = t.dataset.f;
    if (p === "hsn") { const hd = document.getElementById("hsn-desc"); if (hd) hd.innerHTML = hsnHint(val); }
    if (p === "name") { const c = document.getElementById("name-count"); if (c) c.textContent = String(val).length; }
    if (p === "mrp" || p === "price" || p.startsWith("pkg.")) {
      const fb = document.getElementById("fee-box"); if (fb) fb.innerHTML = feeBoxHtml();
      const dl = document.getElementById("disc-label"); if (dl) dl.textContent = discLabel();
      if (p.startsWith("pkg.")) {
        const pkg = LF.data.pkg, vk = pkg.l && pkg.b && pkg.h ? (pkg.l * pkg.b * pkg.h) / 5000 : 0;
        const vw = document.getElementById("vol-weight");
        if (vw) vw.firstChild.textContent = `Volumetric weight: ${vk ? (vk * 1000).toFixed(0) + " g" : "—"} · The shipping fee uses whichever is higher: dead or volumetric weight. A folded T-shirt pack is typically ~28×22×3 cm, 200–250 g.`;
      }
    }
    if (LF.shown) {
      // Clear this field's old error
      LF.errors = LF.errors.filter((x) => x.path !== p);
      applyErrors();
    }
    clearTimeout(sideTimer);
    sideTimer = setTimeout(updateSide, 200);
  });

  root.addEventListener("change", async (e) => {
    const t = e.target;
    const act = t.dataset.act;
    const d = LF.data;
    if (act === "img-upload") {
      const files = [...t.files];
      t.value = "";
      for (const f of files) {
        if (d.images.length >= 8) { showToast("Max 8 images"); break; }
        try { d.images.push(await processProductImage(f, lft().images.ratio)); } catch (err) { showToast(err.message); }
      }
      renderSection("images");
      updateSide();
    }
    if (act === "vid-upload") {
      const f = t.files && t.files[0];
      t.value = "";
      videoUpload(f);
    }
    if (act === "packer-same" || act === "importer-same") {
      const k = act === "packer-same" ? "packerSame" : "importerSame";
      d[k] = t.checked;
      if (!t.checked) d[k === "packerSame" ? "packer" : "importer"] = { ...d.manufacturer };
      renderSection("compliance");
      updateSide();
    }
    if (act === "hsn-pick") {
      if (t.value === "__other") {
        setHsn("");
        document.querySelector('#lf-root [data-f="hsn"]').focus();
      } else setHsn(t.value);
    }
    if (act === "save-defaults") LF.saveDefaults = t.checked;
    if (act === "lstatus") { d.listingStatus = t.value; renderSection("status"); }
  });

  root.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.id === "vid-yt-input") { e.preventDefault(); videoAddYoutube(); }
  });
  // Images / video drag & drop
  root.addEventListener("dragover", (e) => {
    const z = e.target.closest(".dropzone");
    if (z && !z.classList.contains("disabled")) { e.preventDefault(); z.classList.add("drag"); }
  });
  root.addEventListener("dragleave", (e) => { const z = e.target.closest(".dropzone"); if (z) z.classList.remove("drag"); });
  root.addEventListener("drop", async (e) => {
    const z = e.target.closest(".dropzone");
    if (!z) return;
    e.preventDefault();
    z.classList.remove("drag");
    const inp = z.querySelector("input[type=file]");
    const files = [...(e.dataTransfer ? e.dataTransfer.files : [])];
    if (!inp || inp.disabled || !files.length) return;
    if (inp.dataset.act === "vid-upload") return videoUpload(files[0]);
    if (inp.dataset.act === "img-upload") {
      const d = LF.data;
      for (const f of files) {
        if (d.images.length >= 8) { showToast("Max 8 images"); break; }
        try { d.images.push(await processProductImage(f, lft().images.ratio)); } catch (err) { showToast(err.message); }
      }
      renderSection("images");
      updateSide();
    }
  });

  root.addEventListener("click", (e) => {
    const go = e.target.closest("[data-goto-sec]");
    if (go) { e.preventDefault(); document.getElementById("sec-" + go.dataset.gotoSec)?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    const b = e.target.closest("[data-act]");
    if (!b || b.tagName === "INPUT") return;
    const d = LF.data;
    const act = b.dataset.act;
    if (act === "vid-del") {
      d.video = null;
      LF.videoDirty = true;
      LF.videoLoading = false;
      renderSection("images");
      updateSide();
      showToast("Video removed");
    }
    if (act === "vid-yt") videoAddYoutube();
    if (act === "hsn-use") { setHsn(b.dataset.code); showToast(`HSN ${b.dataset.code} selected ✓`); }
    if (act === "size") {
      const size = b.dataset.size;
      const i = d.variants.findIndex((x) => x.size === size);
      if (i >= 0) d.variants.splice(i, 1);
      else {
        d.variants.push({ id: uid("V"), size, sku: "", stock: "" });
        const order = sizesOf(lfv());
        d.variants.sort((a, c) => order.indexOf(a.size) - order.indexOf(c.size));
      }
      renderSection("variants");
      updateSide();
    }
    if (act === "auto-sku") {
      const base = autoSkuBase(d);
      d.variants.forEach((x) => (x.sku = x.size ? `${base}-${x.size.replace(/\s+/g, "")}` : base));
      renderSection("variants");
      updateSide();
    }
    if (act === "bulk-stock") {
      const val = Number(document.getElementById("bulk-stock").value);
      if (!(Number.isInteger(val) && val >= 0)) { showToast("Enter a stock number"); return; }
      d.variants.forEach((x) => (x.stock = val));
      renderSection("variants");
      updateSide();
    }
    if (act === "img-del") {
      d.images.splice(Number(b.dataset.i), 1);
      renderSection("images");
      updateSide();
    }
    if (act === "img-main") {
      const [im] = d.images.splice(Number(b.dataset.i), 1);
      d.images.unshift(im);
      renderSection("images");
      updateSide();
    }
    if (act === "use-defaults") {
      const df = sellerDefaults();
      d.manufacturer = { ...df.manufacturer };
      d.packer = { ...df.packer };
      d.importer = { ...df.importer };
      d.countryOfOrigin = df.countryOfOrigin;
      d.packerSame = JSON.stringify(df.packer) === JSON.stringify(df.manufacturer);
      d.importerSame = JSON.stringify(df.importer) === JSON.stringify(df.manufacturer);
      renderSection("compliance");
      updateSide();
    }
  });
}

async function persistListing(status) {
  const d = LF.data;
  const v = lfv();
  syncParties(d);
  const rec = clone({ ...d, images: undefined });
  delete rec.images;
  delete rec.packerSame;
  delete rec.importerSame;
  Object.assign(rec, {
    sellerId: me.id, status, category: v.superCat,
    name: String(d.name || "").trim(), brand: String(d.brand || "").trim(), description: String(d.description || "").trim(),
    features: (d.features || []).map((f) => String(f || "").trim()).filter(Boolean),
    variants: d.variants.map((x) => ({ id: x.id, size: x.size || "", sku: String(x.sku || "").trim(), stock: Number(x.stock) || 0 })),
    mrp: Number(d.mrp) || 0, price: Number(d.price) || 0, gst: Number(d.gst), netQty: Number(d.netQty) || 1,
    image: d.images[0] ? d.images[0].thumb : "", imageCount: d.images.length,
    quality: listingQuality(d).score,
  });
  if (status === "qc_pending") { rec.submittedAt = Date.now(); rec.qcReasons = []; }
  rec.legacy = false;
  // Video: only small metadata in the listing; the actual file lives in IndexedDB
  delete rec.videoUrl;
  rec.video = cleanVideoMeta(d.video);
  if (LF.videoDirty) {
    const v = d.video;
    if (v && v.kind === "file" && v.blob instanceof Blob) {
      if (v.size > BIG_VIDEO) {
        // Big videos (up to 1 GB) take a few seconds to save — prevent double clicks meanwhile
        showToast(`⏳ Saving your ${fmtBytes(v.size)} video — please keep this page open…`);
        document.querySelectorAll("#lf-side .checkout-btn").forEach((b) => (b.disabled = true));
      }
      const ok = await MediaDB.put(videoKey(rec.id), { blob: v.blob, type: v.type, name: v.name, size: v.size, duration: v.duration, w: v.w, h: v.h, poster: v.poster });
      if (!ok) { showToast("The video couldn't be saved (browser storage is full) — try a smaller video"); rec.video = null; }
    } else await MediaDB.del(videoKey(rec.id));
    LF.videoDirty = false;
  }
  await MediaDB.put(rec.id, d.images.map((im) => ({ id: im.id, full: im.full, thumb: im.thumb, w: im.w, h: im.h, whiteBg: im.whiteBg })));
  const saved = saveListing(rec);
  if (!saved) return null;
  if (LF.saveDefaults && d.manufacturer && d.manufacturer.name) {
    refreshMe();
    updateSeller(me.id, { profile: { ...(me.profile || {}), defaults: { manufacturer: d.manufacturer, packer: d.packer, importer: d.importer, countryOfOrigin: d.countryOfOrigin } } });
    refreshMe();
  }
  return saved;
}

async function saveDraftListing() {
  if (String(LF.data.name || "").trim().length < 3) { showToast("Enter at least the product name to save a draft"); document.getElementById("sec-details").scrollIntoView({ behavior: "smooth" }); return; }
  const saved = await persistListing(LF.data.status === "qc_failed" ? "qc_failed" : "draft");
  if (!saved) return;
  LF = null;
  showToast("Draft saved ✓");
  location.hash = "listings/progress";
}

async function submitListing() {
  const d = LF.data;
  syncParties(d);
  const tpl = lft();
  const res = validateListing(d, {
    forSubmit: true,
    approvalOk: !tpl.restricted || isCategoryApproved(me.id, tpl.restricted),
    otherSkus: otherSkus(d.id),
    limitReached: countsTowardLimit(d.id) >= plan().productLimit,
  });
  showValidation(res);
  if (res.errors.length) { showToast(`${res.errors.length} errors — please fix them first`); return; }
  const saved = await persistListing("qc_pending");
  if (!saved) return;
  notifySeller(me.id, `🧪 "${saved.name}" was sent for QC. It goes live as soon as it passes.`);
  LF = null;
  showToast("Listing sent for QC ✓");
  location.hash = "listings/progress";
}

// =====================================================================
// BULK UPLOAD (CSV)
// =====================================================================
let bulkVertical = "";
let bulkParsed = null; // { groups: [{ key, rows, draft, errors }] }

function bulkColumns(v) {
  const tpl = templateOf(v);
  const sizes = sizesOf(v);
  const cols = [
    { h: "Group ID", req: true, k: "group" },
    { h: "Seller SKU", req: true, k: "sku" },
    ...(sizes ? [{ h: "Size", req: true, k: "size", o: sizes }] : []),
    { h: "Stock", req: true, k: "stock" },
    { h: "Product Name", req: true, k: "name" },
    { h: "Brand", req: true, k: "brand" },
    { h: "Description", req: true, k: "description" },
    { h: "Key Features (| separated)", k: "features" },
    { h: "Search Keywords", k: "keywords" },
    { h: "MRP", req: true, k: "mrp" },
    { h: "Selling Price", req: true, k: "price" },
    { h: "GST %", req: true, k: "gst", o: tpl.gst.map(String) },
    { h: "HSN", req: true, k: "hsn" },
    ...tpl.req.map((a) => ({ h: a.l, req: true, k: "attrs." + a.k, o: a.o })),
    ...tpl.good.map((a) => ({ h: a.l, k: "attrs." + a.k, o: a.o })),
    ...(sizes && tpl.sizeChart ? tpl.sizeChart.map((f) => ({ h: f.l, req: true, k: "chart." + f.k })) : []),
    { h: "Package Length (cm)", req: true, k: "pkg.l" },
    { h: "Package Breadth (cm)", req: true, k: "pkg.b" },
    { h: "Package Height (cm)", req: true, k: "pkg.h" },
    { h: "Package Weight (g)", req: true, k: "pkg.w" },
    { h: "Dispatch Days", req: true, k: "sla", o: OPT.sla },
    { h: "Country of Origin", req: true, k: "countryOfOrigin", o: OPT.countries },
    { h: "Generic Name", req: true, k: "genericName", o: tpl.generic },
    { h: "Net Quantity", req: true, k: "netQty" },
    { h: "Listing Status", req: true, k: "listingStatus", o: ["Active", "Inactive"] },
  ];
  return cols;
}

function sampleValue(col, v, rowIdx) {
  const tpl = templateOf(v);
  const sizes = sizesOf(v);
  const map = {
    group: "GRP-001", sku: `ZZ-SAMPLE-${sizes ? sizes[2 + rowIdx] || "M" : "01"}`.replace(/\s+/g, ""), size: sizes ? sizes[2 + rowIdx] || sizes[0] : "",
    stock: "10", name: `ZZAPKART Sample ${v.name} Item`, brand: "ZZAPKART", description: `Sample description for ${v.name} — describe the fabric / material, use and care.`,
    features: "Feature one|Feature two|Feature three", keywords: v.name.toLowerCase(), mrp: "999", price: "599", gst: String(tpl.gst[0]), hsn: tpl.hsn[0],
    "pkg.l": "28", "pkg.b": "22", "pkg.h": "3", "pkg.w": "250", sla: "2", countryOfOrigin: "India", genericName: tpl.generic[0], netQty: "1", listingStatus: "Active",
  };
  if (col.k in map) return map[col.k];
  if (col.k.startsWith("chart.")) return String(36 + rowIdx * 2);
  if (col.k.startsWith("attrs.")) {
    if (!col.req) return "";
    const k = col.k.slice(6);
    if (k === "isbn") return "9780306406157";
    if (k === "fssaiNumber") return "12345678901234";
    if (k === "bisNumber") return "CM/L-1234567890";
    if (k === "idealFor" && v.ideal && col.o && col.o.includes(v.ideal)) return v.ideal;
    if (col.o) return col.o[0];
    const a = tpl.req.find((x) => x.k === k);
    return a && a.t === "number" ? "12" : a && a.t === "textarea" ? "Sample text" : k === "styleCode" ? "GRP-001" : "Sample";
  }
  return "";
}

function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

function canonical(col, raw) {
  const s = String(raw ?? "").trim();
  if (!col.o || s === "") return s;
  return col.o.find((o) => String(o).toLowerCase() === s.toLowerCase()) ?? s;
}

function buildBulkGroups(text, v) {
  const cols = bulkColumns(v);
  const rows = parseCSV(text);
  if (rows.length < 2) return { error: "The CSV needs at least one row after the header" };
  const header = rows[0].map((h) => String(h).replace(/\*/g, "").trim().toLowerCase());
  const idx = {};
  cols.forEach((c) => { idx[c.k] = header.indexOf(c.h.toLowerCase()); });
  const missingCols = cols.filter((c) => c.req && idx[c.k] < 0).map((c) => c.h);
  if (missingCols.length) return { error: `Missing template columns: ${missingCols.slice(0, 5).join(", ")}${missingCols.length > 5 ? "…" : ""}. Download and use the template for this category.` };

  const df = sellerDefaults();
  const groups = new Map();
  rows.slice(1).forEach((r, i) => {
    const get = (k) => { const c = cols.find((x) => x.k === k); return c && idx[k] >= 0 ? canonical(c, r[idx[k]]) : ""; };
    const key = get("group") || `ROW-${i + 2}`;
    if (!groups.has(key)) groups.set(key, { key, rows: [], first: get, rowNums: [] });
    const g = groups.get(key);
    g.rows.push(get);
    g.rowNums.push(i + 2);
  });

  const skuSeen = otherSkus(null);
  const out = [];
  groups.forEach((g) => {
    const get = g.first;
    const tpl = templateOf(v);
    const draft = newListingDraft(v.id);
    draft.id = Date.now() + Math.floor(Math.random() * 100000);
    Object.assign(draft, {
      name: get("name"), brand: get("brand"), description: get("description"),
      features: get("features").split("|").map((s) => s.trim()).filter(Boolean),
      keywords: get("keywords"), mrp: Number(get("mrp")), price: Number(get("price")), gst: get("gst") === "" ? "" : Number(get("gst")), hsn: get("hsn"),
      pkg: { l: Number(get("pkg.l")), b: Number(get("pkg.b")), h: Number(get("pkg.h")), w: Number(get("pkg.w")) },
      sla: get("sla"), countryOfOrigin: get("countryOfOrigin"), genericName: get("genericName"), netQty: Number(get("netQty")),
      listingStatus: get("listingStatus").toLowerCase() === "inactive" ? "inactive" : "active",
      manufacturer: df.manufacturer, packer: df.packer, importer: df.importer, images: [], bulk: true,
    });
    tpl.req.concat(tpl.good).forEach((a) => { const val = get("attrs." + a.k); if (val !== "") draft.attrs[a.k] = a.t === "number" ? Number(val) : val; });
    draft.variants = g.rows.map((rg) => ({ id: uid("V"), size: rg("size"), sku: rg("sku"), stock: rg("stock") === "" ? "" : Number(rg("stock")) }));
    if (sizesOf(v) && tpl.sizeChart) g.rows.forEach((rg) => {
      const size = rg("size");
      if (size) draft.sizeChart[size] = Object.fromEntries(tpl.sizeChart.map((f) => [f.k, Number(rg("chart." + f.k)) || ""]));
    });
    const res = validateListing(draft, { forSubmit: false, otherSkus: skuSeen });
    const errors = res.errors.filter((e) => !e.path.startsWith("images"));
    if (!df.has) errors.push({ path: "manufacturer.name", msg: "Save default manufacturer / packer / importer details in your Profile" });
    if (sizesOf(v)) {
      const dup = draft.variants.map((x) => x.size).filter((s, i, arr) => s && arr.indexOf(s) !== i);
      if (dup.length) errors.push({ path: "variants", msg: `Repeated size: ${dup.join(", ")}` });
    }
    if (!errors.length) draft.variants.forEach((x) => skuSeen.add(String(x.sku).toUpperCase()));
    out.push({ key: g.key, rowNums: g.rowNums, draft, errors });
  });
  return { groups: out };
}

function viewBulk() {
  const v = getVertical(bulkVertical);
  const df = sellerDefaults();
  const cols = v ? bulkColumns(v) : [];
  content.innerHTML = `
    <p class="breadcrumb-dark"><a href="#listings">My Listings</a> › Bulk Upload</p>
    <h1 class="dash-title">Bulk Upload (CSV)</h1>
    <p class="muted">Add many products from one category at once. Rows with the same <strong>Group ID</strong> = different sizes of one listing. Listings are created as <strong>Drafts</strong> — add images and send them for QC.</p>
    ${df.has ? "" : `<div class="alert warn">First save your <a href="#profile">Profile → Default compliance details</a> (manufacturer / packer / importer) — bulk listings use them.</div>`}
    <section class="panel">
      <h2><span class="step-no">1</span> Choose a category</h2>
      <select id="bulk-vertical" class="range-select wide">
        <option value="">— Category / vertical —</option>
        ${TAXONOMY.map((t) => t.cats.map((c) => `<optgroup label="${esc(t.name)} › ${esc(c.name)}">${VERTICALS.filter((x) => x.cat === c.name && x.superCat === t.name).map((x) => `<option value="${x.id}" ${x.id === bulkVertical ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</optgroup>`).join("")).join("")}
      </select>
    </section>
    ${v ? `
    <section class="panel">
      <h2><span class="step-no">2</span> Download the template</h2>
      <p class="muted">${cols.length} columns (${cols.filter((c) => c.req).length} required — marked <strong>*</strong> in the header). Replace the sample rows with your products.</p>
      <button class="btn" id="bulk-template">⬇ ${esc(v.name)} template (.csv)</button>
      <details class="data-table"><summary>Allowed values for dropdown columns</summary>
        <table class="table"><tbody>${cols.filter((c) => c.o).map((c) => `<tr><th>${esc(c.h)}</th><td class="small">${c.o.map(esc).join(", ")}</td></tr>`).join("")}</tbody></table>
      </details>
    </section>
    <section class="panel">
      <h2><span class="step-no">3</span> Upload your filled CSV</h2>
      <label class="dropzone"><input type="file" accept=".csv,text/csv" id="bulk-file" /><span>📄 Choose a CSV file</span></label>
      <div id="bulk-result"></div>
    </section>` : ""}`;

  document.getElementById("bulk-vertical").addEventListener("change", (e) => { bulkVertical = e.target.value; bulkParsed = null; render(); });
  if (!v) return;
  document.getElementById("bulk-template").addEventListener("click", () => {
    const sizes = sizesOf(v);
    const lines = [cols.map((c) => csvCell(c.h + (c.req ? "*" : ""))).join(",")];
    const nSample = sizes ? 2 : 1;
    for (let i = 0; i < nSample; i++) lines.push(cols.map((c) => csvCell(sampleValue(c, v, i))).join(","));
    downloadText(`zzapkart-${v.id}-template.csv`, lines.join("\r\n"));
  });
  document.getElementById("bulk-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    bulkParsed = buildBulkGroups(text, v);
    renderBulkResult(v);
  });
  if (bulkParsed) renderBulkResult(v);
};

function renderBulkResult(v) {
  const box = document.getElementById("bulk-result");
  if (!box || !bulkParsed) return;
  if (bulkParsed.error) { box.innerHTML = `<div class="alert error">${esc(bulkParsed.error)}</div>`; return; }
  const ok = bulkParsed.groups.filter((g) => !g.errors.length);
  const bad = bulkParsed.groups.filter((g) => g.errors.length);
  box.innerHTML = `
    <div class="bulk-summary"><span class="ok">✓ ${ok.length} listing(s) OK</span><span class="bad">✕ ${bad.length} with errors</span></div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Group ID</th><th>Rows</th><th>Product</th><th>SKUs</th><th>Result</th></tr></thead>
      <tbody>${bulkParsed.groups.map((g) => `<tr>
        <td><strong>${esc(g.key)}</strong></td><td>${g.rowNums.join(", ")}</td><td>${esc(g.draft.name || "—")}</td>
        <td class="small">${g.draft.variants.map((x) => esc(`${x.sku}${x.size ? " (" + x.size + ")" : ""}`)).join(", ")}</td>
        <td>${g.errors.length ? `<div class="qc-reasons">${g.errors.slice(0, 6).map((e) => "• " + esc(e.msg)).join("<br>")}${g.errors.length > 6 ? `<br>…+${g.errors.length - 6}` : ""}</div>` : `<span class="status-pill s-live">Ready</span>`}</td>
      </tr>`).join("")}</tbody></table></div>
    ${ok.length ? `<button class="btn" id="bulk-create">Create ${ok.length} draft listing(s)</button>` : ""}`;
  const btn = document.getElementById("bulk-create");
  if (btn) btn.addEventListener("click", () => {
    let n = 0;
    ok.forEach((g) => {
      const d = g.draft;
      const rec = clone({ ...d, images: undefined });
      delete rec.images; delete rec.packerSame; delete rec.importerSame;
      Object.assign(rec, { status: "draft", image: "", imageCount: 0, quality: listingQuality({ ...d, images: [] }).score, createdAt: Date.now() });
      if (saveListing(rec)) n++;
    });
    notifySeller(me.id, `📄 Bulk upload: ${n} draft listing(s) created. Add images and send them for QC.`);
    bulkParsed = null;
    showToast(`${n} draft listings created ✓ — now add images`);
    location.hash = "listings/progress";
  });
}

// =====================================================================
// CATEGORY APPROVALS (restricted categories)
// =====================================================================
function viewApprovals() {
  content.innerHTML = `
    <h1 class="dash-title">Category Approvals</h1>
    <p class="muted">Some categories need a verified licence before you can sell. Without approval, listings stay as drafts and can't be sent for QC.</p>
    <div class="approval-grid">${Object.entries(RESTRICTED).map(([group, r]) => {
      const a = approvalFor(me.id, group);
      const st = !a ? ["Not applied", "s-completed"] : a.status === "approved" ? ["Approved", "s-approved"] : a.status === "pending" ? ["Pending review", "s-pending"] : ["Rejected", "s-rejected"];
      const verts = VERTICALS.filter((v) => TEMPLATES[v.template].restricted === group);
      return `<section class="panel">
        <div class="panel-head"><h2>${esc(r.label)}</h2><span class="status-pill ${st[1]}">${st[0]}</span></div>
        <p class="muted small">Required: <strong>${esc(r.license)}</strong></p>
        <p class="small">${[...new Set(verts.map((v) => v.cat))].map(esc).join(" · ")} (${verts.length} verticals)</p>
        ${a ? `<p class="small">License: ${esc(a.licenseNo)} · Valid till ${fmtDate(a.validTill)} · Applied ${fmtDate(a.at)}</p>` : ""}
        ${a && a.status === "rejected" ? `<div class="alert error small">Reason: ${esc(a.reason || "")}</div>` : ""}
        ${!a || a.status === "rejected" ? `<button class="btn" data-apply="${group}">${a ? "Apply again" : "Apply for approval"}</button>` : ""}
      </section>`;
    }).join("")}</div>`;
  content.querySelectorAll("[data-apply]").forEach((b) => b.addEventListener("click", () => approvalForm(b.dataset.apply)));
};

function approvalForm(group) {
  const r = RESTRICTED[group];
  openModal(`
    <form id="appr-form" class="checkout-form" novalidate>
      <div class="modal-head"><h2>${esc(r.label)} — approval</h2><button type="button" class="icon-btn" data-close aria-label="Close">✕</button></div>
      <label>${esc(r.license)} number <input name="licenseNo" placeholder="${esc(r.hint)}" maxlength="25" /><small class="err"></small></label>
      <label>Name on license <input name="nameOnLicense" value="${esc(me.shopName)}" /><small class="err"></small></label>
      <label>Valid till <input name="validTill" type="date" min="${new Date().toISOString().slice(0, 10)}" /><small class="err"></small></label>
      <label>License copy (photo / scan) <input name="doc" type="file" accept="image/*" /><small class="err"></small></label>
      <div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn" type="submit">Submit</button></div>
    </form>`);
  const f = document.getElementById("appr-form");
  const setErr = (n, m) => { f.elements[n].closest("label").querySelector(".err").textContent = m || ""; return !m; };
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const no = f.elements.licenseNo.value.trim();
    const till = f.elements.validTill.value;
    let doc = "";
    const ok = [
      setErr("licenseNo", r.pattern.test(no) ? "" : `Enter a valid number (${r.hint})`),
      setErr("nameOnLicense", f.elements.nameOnLicense.value.trim().length >= 3 ? "" : "Enter the name on the licence"),
      setErr("validTill", till && new Date(till) > new Date() ? "" : "Choose a future date"),
    ];
    try { doc = await readImage(f.elements.doc.files[0], 900); setErr("doc", ""); } catch (err) { ok.push(setErr("doc", err.message)); }
    if (!ok.every(Boolean)) return;
    const list = getApprovals();
    list.push({ id: uid("APR"), sellerId: me.id, group, licenseNo: no, nameOnLicense: f.elements.nameOnLicense.value.trim(), validTill: new Date(till).getTime(), doc, status: "pending", at: Date.now() });
    if (!saveApprovals(list)) return;
    notifySeller(me.id, `📝 ${r.label} category approval requested. We'll review it soon.`);
    closeModal();
    showToast("Approval request bhej di ✓");
    render();
  });
}

// =====================================================================
// LISTING GUIDELINES
// =====================================================================
function viewGuidelines() {
  content.innerHTML = `
    <h1 class="dash-title">Listing Guidelines</h1>
    <p class="muted">Follow these to pass QC faster and get more visibility.</p>
    <div class="guide-grid">
      <section class="panel"><h2>📋 Required for every listing</h2>
        <p class="small">Product name, brand, description, MRP, selling price, GST, HSN, SKU + stock (one per size), country of origin, generic name, net quantity, manufacturer + packer + importer (name, address, pincode), package L×B×H + weight, dispatch time, listing status and at least 1 image. Some categories need extra fields (e.g. T-shirts: fabric, fit, sleeve, neck, pattern, occasion, style code + size chart).</p></section>
      <section class="panel"><h2>📷 Images</h2>
        <ul class="small"><li><strong>Any size works</strong> — photos are fitted automatically</li><li>Apparel / footwear / bags / jewellery: 5:6 is best (1500×1800 px)</li><li>Longest side 1000 px+ for good zoom</li><li>Main image: white background, product only, filling ~85% of the frame</li><li>No text / watermark / logo / price / props</li><li>4–6 images: front, back, model, close-up, size chart, lifestyle</li><li>JPG, PNG, WEBP… · up to 1 GB</li></ul></section>
      <section class="panel"><h2>🎬 Product video</h2>
        <ul class="small"><li>Shown as a vertical reel on your product page and in "Shop the Reels"</li><li>Vertical 9:16 (e.g. 1080×1920) looks best</li><li>5 seconds to 2 minutes · up to 1 GB · or a YouTube link</li><li>Show only this product — no phone numbers or other platforms' logos</li></ul></section>
      <section class="panel"><h2>✏️ Title</h2>
        <ul class="small"><li>Pattern: Brand + Gender + Product + Fabric + Fit + Sleeve + Neck + Colour + Pack</li><li>No price / offer words (₹, % off, free, sale, best)</li><li>No keyword stuffing, no ALL CAPS</li><li>Put weight / size in the attributes, not the name</li></ul></section>
      <section class="panel"><h2>💰 Price, GST &amp; fees</h2>
        <ul class="small"><li>Selling price ≤ MRP; MRP must be a positive whole number</li><li>Apparel GST: 5% up to ₹2,500, 18% above; books 0%; imitation jewellery 3% — confirm the final rate with your CA</li><li>Knitted T-shirt HSN 6109 (cotton 61091000)</li><li>Always work out profit from the settlement amount (after fees)</li></ul></section>
      <section class="panel"><h2>📦 Package &amp; dispatch</h2>
        <ul class="small"><li>Enter accurate dimensions — the shipping fee uses them (dead vs volumetric L×B×H/5000)</li><li>A folded T-shirt pack is ~28×22×3 cm, 200–250 g</li><li>Shorter dispatch time = better ranking (next-day is best)</li></ul></section>
      <section class="panel"><h2>🔒 Restricted categories</h2>
        <ul class="small">${Object.values(RESTRICTED).map((r) => `<li>${esc(r.label)}: ${esc(r.license)}</li>`).join("")}<li>Toys: BIS (CM/L) number required</li><li>Apply from <a href="#approvals" class="link">Category Approvals</a></li></ul></section>
      <section class="panel wide"><h2>🚫 10 tips to avoid rejection</h2>
        <ol class="small">
          <li>Choose the right category / vertical — the wrong one means QC rejection or lower visibility</li>
          <li>Use the dropdown values for colour, fabric, pattern and neck</li>
          <li>Enter real package dimensions (values like 10×1×1 get flagged)</li>
          <li>No keyword stuffing in the title</li>
          <li>Keep the primary image clean</li>
          <li>Fill in the good-to-have fields too (up to ~21% more visibility)</li>
          <li>A separate SKU for each size (include the size in the SKU)</li>
          <li>Keep manufacturer / packer / importer details in one standard format — save defaults in your Profile</li>
          <li>Don't leave bank / KYC pending — payouts need a verified bank account</li>
          <li>Keep your dispatch time short</li>
        </ol></section>
    </div>`;
};
