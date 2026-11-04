// Demo Admin: KYC review, sellers list, platform orders
const DOC_LABEL = { aadhaar: "Aadhaar Card", pan: "PAN Card", license: "Business License / GST" };
const KYC_LABEL = { not_submitted: "Not submitted", pending: "Pending", approved: "Approved", rejected: "Rejected" };

function render() {
  const sellers = getSellers();
  const pending = sellers.filter((s) => s.kyc.status === "pending");

  // ---------- KYC requests ----------
  document.getElementById("kyc-list").innerHTML = pending.length ? pending.map((s) => `
    <section class="panel kyc-card">
      <div class="order-head">
        <div><strong>${esc(s.shopName)}</strong> — ${esc(s.name)}
          <div class="muted">${esc(s.email)} · ${esc(s.phone)} · Submitted ${fmtDateTime(s.kyc.submittedAt)}</div></div>
        <span class="status-pill s-placed">Pending</span>
      </div>
      <div class="order-grid">
        <div><h4>${DOC_LABEL[s.kyc.docType]}</h4><p>${esc(s.kyc.docNumber)}</p>
          ${safeImg(s.kyc.idImage) ? `<a href="${safeImg(s.kyc.idImage)}" target="_blank"><img class="doc-img" src="${safeImg(s.kyc.idImage)}" alt="ID document" /></a>` : ""}</div>
        <div><h4>Address Proof: ${esc(s.kyc.addressProofType)}</h4><p class="muted">${esc(s.kyc.address)}</p>
          ${safeImg(s.kyc.addrImage) ? `<a href="${safeImg(s.kyc.addrImage)}" target="_blank"><img class="doc-img" src="${safeImg(s.kyc.addrImage)}" alt="Address proof" /></a>` : ""}</div>
      </div>
      <div class="row-actions">
        <button class="btn" data-approve="${s.id}">✓ Approve</button>
        <input class="reject-reason" id="reason-${s.id}" placeholder="Reject reason (jaise: document saaf nahi hai)" />
        <button class="btn btn-danger" data-reject="${s.id}">✕ Reject</button>
      </div>
    </section>`).join("") : `<div class="panel"><p class="muted">Koi pending KYC request nahi.</p></div>`;

  // ---------- Sellers ----------
  document.getElementById("sellers").innerHTML = sellers.length ? `
    <table class="table"><thead><tr><th>Shop</th><th>Owner</th><th>Email</th><th>KYC</th><th>Plan</th><th>Products</th><th>Joined</th></tr></thead>
    <tbody>${sellers.map((s) => `<tr>
      <td><strong>${esc(s.shopName)}</strong></td><td>${esc(s.name)}</td><td>${esc(s.email)}</td>
      <td><span class="status-pill s-${s.kyc.status.replace("_", "-")}">${KYC_LABEL[s.kyc.status]}</span></td>
      <td>${activePlan(s).name}</td><td>${productsOfSeller(s.id).length}</td><td>${fmtDate(s.createdAt)}</td></tr>`).join("")}
    </tbody></table>` : `<p class="muted">Abhi koi seller registered nahi.</p>`;

  // ---------- Platform orders ----------
  const plat = shipmentsOfSeller(PLATFORM_SELLER);
  document.getElementById("platform-orders").innerHTML = plat.length ? `<section class="panel"><div class="table-wrap"><table class="table">
    <thead><tr><th>Order</th><th>Buyer</th><th>Items</th><th>Amount</th><th>Status</th><th></th></tr></thead>
    <tbody>${plat.map(({ order: o, shipment: sh }) => `<tr>
      <td>#${esc(o.id)}<div class="muted">${fmtDate(o.createdAt)}</div></td>
      <td>${esc(o.buyer.name)}<div class="muted">${esc(o.buyer.city)}</div></td>
      <td>${sh.items.map((i) => `${esc(i.name)} × ${i.qty}`).join("<br>")}</td>
      <td>${formatPrice(sh.amount)}</td>
      <td><span class="status-pill s-${sh.status.toLowerCase()}">${sh.status}</span></td>
      <td>${sh.status === "Placed" ? `<button class="btn-sm btn-outline" data-ship="${esc(o.id)}">Ship</button>`
        : sh.status === "Shipped" ? `<button class="btn-sm btn-outline" data-deliver="${esc(o.id)}">Deliver</button>` : "✓"}</td>
    </tr>`).join("")}</tbody></table></div></section>` : `<div class="panel"><p class="muted">Koi platform order nahi.</p></div>`;
}

document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.dataset.approve) {
    const s = getSeller(t.dataset.approve);
    updateSeller(s.id, { kyc: { ...s.kyc, status: "approved", reviewedAt: Date.now(), reason: "" } });
    notifySeller(s.id, "🎉 Aapka KYC approve ho gaya! Ab poora dashboard unlock hai — products add karna shuru karo.");
    showToast(`${s.shopName} approved ✓`);
    render();
  }
  if (t.dataset.reject) {
    const s = getSeller(t.dataset.reject);
    const reason = document.getElementById("reason-" + s.id).value.trim();
    if (reason.length < 5) { showToast("Reject ka reason likhein"); return; }
    updateSeller(s.id, { kyc: { ...s.kyc, status: "rejected", reviewedAt: Date.now(), reason } });
    notifySeller(s.id, `❌ KYC reject hua: ${reason}. Dobara submit karein.`);
    showToast(`${s.shopName} rejected`);
    render();
  }
  if (t.dataset.ship) {
    updateShipment(t.dataset.ship, PLATFORM_SELLER, "Shipped", { courier: "Ekart", trackingId: "EK" + Date.now().toString().slice(-8) });
    render();
  }
  if (t.dataset.deliver) {
    updateShipment(t.dataset.deliver, PLATFORM_SELLER, "Delivered");
    render();
  }
  if (t.id === "reset" && confirm("Saara demo data delete karna hai? Ye wapas nahi aayega.")) {
    Object.values(DB).forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem("zzapkart_cart");
    localStorage.removeItem("zzapkart_address");
    showToast("Demo data reset ho gaya");
    render();
  }
});

window.addEventListener("storage", render);
render();
