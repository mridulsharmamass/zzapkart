// Product detail page: product.html?id=123[&slot=ad-slot-id]
const params = new URLSearchParams(location.search);
const product = PRODUCTS.find((p) => String(p.id) === params.get("id"));
const pdp = document.getElementById("pdp");

// Coming from an ad → record the click (duplicate clicks are free)
if (params.get("slot")) {
  recordAdClick(params.get("slot"));
  history.replaceState(null, "", "product.html?id=" + params.get("id"));
}

let selectedVariant = null;

function modalOpen(html) {
  let m = document.getElementById("pdp-modal");
  if (!m) {
    m = document.createElement("div");
    m.id = "pdp-modal";
    m.className = "modal";
    m.innerHTML = `<div class="modal-box"></div>`;
    m.addEventListener("click", (e) => { if (e.target === m || e.target.closest("[data-close]")) m.classList.add("hidden"); });
    document.body.appendChild(m);
  }
  m.querySelector(".modal-box").innerHTML = html;
  m.classList.remove("hidden");
}

function partyText(p) {
  return p && p.name ? `${esc(p.name)}, ${esc(p.address)} – ${esc(p.pincode)}` : "—";
}

if (!product) {
  pdp.innerHTML = `<div class="empty"><div class="empty-emoji">🔍</div><p>We couldn't find this product.</p><a href="index.html" class="btn">Go to Home</a></div>`;
} else {
  document.title = `${product.name} – Zzapkart`;
  trackView(product.id);
  const cat = CATEGORIES.find((c) => c.name === product.category);
  document.getElementById("crumbs").innerHTML =
    `<a href="index.html">Home</a> › ${cat ? `<a href="${categoryUrl(cat)}">${esc(cat.name)}</a> › ` : ""}${product.catName ? esc(product.catName) + " › " : ""}${esc(product.name)}`;

  const tpl = product.template ? TEMPLATES[product.template] : null;
  const off = discount(product);
  const sized = !!product.hasSizes;
  if (!sized && product.variants && product.variants.length === 1) selectedVariant = product.variants[0];
  const deliver = new Date(Date.now() + ((product.sla || 2) + 2) * DAY).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const hasChart = sized && tpl && tpl.sizeChart && Object.keys(product.sizeChart || {}).length > 0;

  pdp.innerHTML = `
    <section class="pdp panel">
      <div class="pdp-gallery">
        <div class="pdp-thumbs" id="pdp-thumbs"></div>
        <div class="pdp-img" id="pdp-main" style="background:${esc(product.color)}">${productThumb(product)}</div>
      </div>
      <div class="pdp-info">
        ${product.brand ? `<span class="pdp-brand">${esc(product.brand)}</span>` : ""}
        <h1>${esc(product.name)}</h1>
        <p class="sold-by">Sold by <strong>${esc(product.sellerName || "Zzapkart")}</strong></p>
        ${product.storeSlug ? `<a class="pdp-store-link" href="${storeUrl(product.storeSlug)}">🏬 Visit the ${esc(product.storeName)} store →</a>` : ""}
        ${product.rating ? `<span class="rating">${product.rating} ★</span>` : `<span class="rating new">New</span>`}
        <div class="price-row pdp-price">
          <span class="price">${formatPrice(product.price)}</span>
          ${off ? `<span class="mrp">${formatPrice(product.mrp)}</span><span class="off">${off}% off</span>` : ""}
        </div>
        <p class="muted small">Inclusive of all taxes</p>
        ${sized ? `
          <div class="size-head"><strong>Select Size</strong>${hasChart ? `<button class="link-btn" id="size-chart-btn">📏 Size Chart</button>` : ""}</div>
          <div class="size-picker" id="size-picker">
            ${product.variants.map((v) => `<button class="size-btn" data-vid="${esc(v.id)}" ${v.stock > 0 ? "" : "disabled"} title="${v.stock > 0 ? esc(v.size) : "Out of stock"}">${esc(v.size)}</button>`).join("")}
          </div>` : ""}
        <p class="stock-msg" id="stock-msg"></p>
        <p class="muted">🚚 Dispatch in ${product.sla || 2} day(s) · Delivery by <strong>${deliver}</strong> · FREE above ₹499</p>
        <div class="pdp-actions">
          <button class="btn add-btn" id="pdp-add">Add to Cart</button>
          <button class="btn buy-btn" id="pdp-buy">Buy Now</button>
        </div>
        ${product.features && product.features.filter(Boolean).length ? `
          <h3>Key Features</h3>
          <ul class="pdp-features">${product.features.filter(Boolean).map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
      </div>
    </section>
    <section class="panel pdp-specs" id="pdp-specs"></section>`;

  // ---------- Stock message ----------
  function updateStock() {
    const msg = document.getElementById("stock-msg");
    const total = product.stock === undefined ? Infinity : product.stock;
    const base = selectedVariant ? selectedVariant.stock : total;
    if (total === 0) { msg.className = "stock-msg text-danger"; msg.textContent = "Out of stock"; }
    else if (sized && !selectedVariant) { msg.className = "stock-msg muted"; msg.textContent = "Select a size"; }
    else if (base <= 5) { msg.className = "stock-msg text-warn"; msg.textContent = `Only ${base} left — hurry!`; }
    else { msg.className = "stock-msg green"; msg.textContent = "In stock"; }
    const disabled = total === 0 || (selectedVariant && selectedVariant.stock === 0);
    document.getElementById("pdp-add").disabled = disabled;
    document.getElementById("pdp-buy").disabled = disabled;
  }
  updateStock();

  const picker = document.getElementById("size-picker");
  if (picker) picker.addEventListener("click", (e) => {
    const b = e.target.closest(".size-btn");
    if (!b || b.disabled) return;
    picker.querySelectorAll(".size-btn").forEach((x) => x.classList.toggle("active", x === b));
    selectedVariant = product.variants.find((v) => v.id === b.dataset.vid);
    updateStock();
  });

  function addSelected() {
    if (sized && !selectedVariant) {
      showToast("Please select a size first");
      picker.classList.add("shake");
      setTimeout(() => picker.classList.remove("shake"), 500);
      return false;
    }
    const key = selectedVariant ? cartKey(product.id, selectedVariant.id) : String(product.id);
    const item = resolveCartItem(key, 0);
    const inCart = getCart()[key] || 0;
    if (!item || inCart >= item.maxStock) {
      showToast(`Only ${item ? item.maxStock : 0} in stock`);
      return false;
    }
    addToCart(key);
    trackCartAdd(product.id);
    return true;
  }
  document.getElementById("pdp-add").addEventListener("click", () => {
    if (addSelected()) showToast(`${product.name}${selectedVariant && selectedVariant.size ? " (" + selectedVariant.size + ")" : ""} added to your cart ✓`);
  });
  document.getElementById("pdp-buy").addEventListener("click", () => {
    const key = selectedVariant ? cartKey(product.id, selectedVariant.id) : String(product.id);
    if (getCart()[key] || addSelected()) location.href = "checkout.html";
  });

  // ---------- Size chart ----------
  const scBtn = document.getElementById("size-chart-btn");
  if (scBtn) scBtn.addEventListener("click", () => {
    const fields = tpl.sizeChart;
    modalOpen(`
      <div class="modal-head"><h2>Size Chart</h2><button type="button" class="icon-btn" data-close aria-label="Close">✕</button></div>
      <table class="table"><thead><tr><th>Size</th>${fields.map((f) => `<th>${esc(f.l)}</th>`).join("")}</tr></thead>
      <tbody>${product.variants.map((v) => `<tr><td><strong>${esc(v.size)}</strong></td>${fields.map((f) => `<td>${esc((product.sizeChart[v.size] || {})[f.k] ?? "—")}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
  });

  // ---------- Gallery (IndexedDB) ----------
  if ((product.imageCount > 0 || product.video) && typeof MediaDB !== "undefined") {
    mountProductGallery(product, document.getElementById("pdp-main"), document.getElementById("pdp-thumbs"));
  }

  // ---------- Description, specifications, legal info ----------
  const specs = [];
  if (product.brand) specs.push(["Brand", product.brand]);
  if (product.verticalName) specs.push(["Type", product.verticalName]);
  if (tpl) tpl.req.concat(tpl.good).forEach((a) => {
    const v = product.attrs && product.attrs[a.k];
    if (v !== undefined && v !== null && String(v).trim() !== "" && v !== "N/A") specs.push([a.l, v]);
  });
  if (product.genericName) specs.push(["Generic Name", product.genericName]);
  if (product.netQty) specs.push(["Net Quantity", product.netQty + " N"]);
  if (product.countryOfOrigin) specs.push(["Country of Origin", product.countryOfOrigin]);

  const specsEl = document.getElementById("pdp-specs");
  specsEl.innerHTML = `
    ${product.description ? `<h2>Product Description</h2><p class="pdp-desc">${esc(product.description)}</p>` : ""}
    ${specs.length ? `<h2>Specifications</h2>
      <table class="table spec-table"><tbody>${specs.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table>` : ""}
    ${product.manufacturer ? `<details class="legal-info"><summary>Manufacturing, Packaging &amp; Import Info</summary>
      <p><strong>Manufacturer:</strong> ${partyText(product.manufacturer)}</p>
      <p><strong>Packer:</strong> ${partyText(product.packer)}</p>
      <p><strong>Importer:</strong> ${partyText(product.importer)}</p>
      <p><strong>Country of Origin:</strong> ${esc(product.countryOfOrigin || "—")}</p>
    </details>` : ""}`;
  if (!product.description && !specs.length) specsEl.classList.add("hidden");

  // Sponsored products related to this item (ads from the same category)
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
