// =====================================================================
// Admin: Listing QC queue + Category approval requests (demo)
// =====================================================================
function renderQC() {
  const box = document.getElementById("qc-list");
  if (!box) return;
  const sellers = new Map(getSellers().map((s) => [s.id, s]));
  const pending = getListings().filter((l) => l.status === "qc_pending").sort((a, b) => (a.submittedAt || 0) - (b.submittedAt || 0));
  if (!pending.length) { box.innerHTML = `<div class="panel"><p class="muted">The QC queue is empty.</p></div>`; return; }
  box.innerHTML = `
    <div class="qc-toolbar"><button class="btn" data-qc-pass-all="1">✓ Pass all (${pending.length})</button></div>
    ${pending.map((L) => {
      const v = getVertical(L.vertical);
      const tpl = templateOf(v);
      const s = sellers.get(L.sellerId);
      const attrs = tpl ? tpl.req.slice(0, 8).map((a) => `${esc(a.l)}: <strong>${esc((L.attrs || {})[a.k] ?? "—")}</strong>`).join(" · ") : "";
      return `
      <section class="panel qc-card" data-qc-card="${L.id}">
        <div class="order-head">
          <div class="prod-cell"><span class="thumb big">${safeImg(L.image) ? `<img src="${safeImg(L.image)}" alt="" />` : "📦"}</span>
            <div><strong>${esc(L.name)}</strong>
              <div class="muted small">${esc(v ? `${v.superCat} › ${v.cat} › ${v.name}` : "—")} · ${esc(s ? s.shopName : "")} · submitted ${fmtDateTime(L.submittedAt || L.updatedAt)}</div>
              <div class="small">Brand <strong>${esc(L.brand)}</strong> · MRP ${formatPrice(L.mrp)} · Price ${formatPrice(L.price)} · GST ${esc(L.gst)}% · HSN ${esc(L.hsn)} · Quality ${L.quality ?? "—"}%</div>
            </div></div>
          <span class="status-pill s-placed">QC in progress</span>
        </div>
        <div class="qc-imgs" id="qc-imgs-${L.id}"><span class="muted small">${L.imageCount || 0} image(s)…</span></div>
        ${L.video ? `<div class="qc-video" id="qc-vid-${L.id}">${L.video.kind === "yt"
          ? `<a class="link" href="https://www.youtube.com/watch?v=${encodeURIComponent(L.video.ytId)}" target="_blank" rel="noopener">▶ Watch the YouTube video</a> <small class="muted">— check: same product? no contact info / watermark?</small>`
          : `<span class="muted small">🎬 Loading video…</span>`}</div>` : `<p class="muted small">🎬 Video: none</p>`}
        <p class="small">${attrs}</p>
        <p class="small muted">SKUs: ${L.variants.map((x) => esc(`${x.sku}${x.size ? " (" + x.size + ")" : ""}: ${x.stock}`)).join(", ")}</p>
        <p class="small muted">Manufacturer: ${esc(L.manufacturer ? `${L.manufacturer.name}, ${L.manufacturer.pincode}` : "—")} · Origin: ${esc(L.countryOfOrigin || "—")} · Pack ${esc(L.pkg ? `${L.pkg.l}×${L.pkg.b}×${L.pkg.h} cm, ${L.pkg.w} g` : "—")}</p>
        <p class="small">${esc(L.description || "")}</p>
        <details class="qc-fail-box"><summary>Fail QC? Choose the reasons</summary>
          ${QC_REASONS.map((r, i) => `<label class="check"><input type="checkbox" value="${esc(r)}" data-reason="${L.id}" /> ${esc(r)}</label>`).join("")}
          <input class="reject-reason" id="qc-custom-${L.id}" placeholder="Other reason (optional)" />
          <button class="btn btn-danger" data-qc-fail="${L.id}">✕ QC Fail</button>
        </details>
        <div class="row-actions"><button class="btn" data-qc-pass="${L.id}">✓ QC Pass</button></div>
      </section>`;
    }).join("")}`;
  pending.forEach((L) => {
    if (L.video && L.video.kind === "file") {
      loadProductVideo(L.id).then((v) => {
        const el = document.getElementById("qc-vid-" + L.id);
        if (!el) { if (v) URL.revokeObjectURL(v.url); return; }
        el.innerHTML = v
          ? `<video controls playsinline preload="metadata" src="${v.url}" ${v.poster ? `poster="${v.poster}"` : ""}></video><small class="muted">🎬 ${fmtDuration(v.duration)} min · ${v.w}×${v.h} — check: same product? no contact info / watermark?</small>`
          : `<span class="text-danger small">Video file not found in this browser</span>`;
      });
    }
    if (!L.imageCount) return;
    MediaDB.get(L.id).then((imgs) => {
      const el = document.getElementById("qc-imgs-" + L.id);
      if (!el || !imgs) return;
      el.innerHTML = imgs.map((im) => `<a href="${safeImg(im.full)}" target="_blank" title="${im.w}×${im.h}"><img src="${safeImg(im.thumb || im.full)}" alt="" /><small>${im.w}×${im.h}</small></a>`).join("");
    });
  });
}

function renderApprovalsAdmin() {
  const box = document.getElementById("appr-list");
  if (!box) return;
  const sellers = new Map(getSellers().map((s) => [s.id, s]));
  const list = getApprovals().filter((a) => a.status === "pending");
  box.innerHTML = list.length ? list.map((a) => {
    const s = sellers.get(a.sellerId);
    return `<section class="panel">
      <div class="order-head"><div><strong>${esc(RESTRICTED[a.group].label)}</strong> — ${esc(s ? s.shopName : "")}
        <div class="muted small">${esc(RESTRICTED[a.group].license)}: <strong>${esc(a.licenseNo)}</strong> · Name: ${esc(a.nameOnLicense)} · Valid till ${fmtDate(a.validTill)}</div></div>
        <span class="status-pill s-pending">Pending</span></div>
      ${safeImg(a.doc) ? `<a href="${safeImg(a.doc)}" target="_blank"><img class="doc-img" src="${safeImg(a.doc)}" alt="License" /></a>` : ""}
      <div class="row-actions">
        <button class="btn" data-appr-ok="${a.id}">✓ Approve</button>
        <input class="reject-reason" id="appr-reason-${a.id}" placeholder="Reject reason" />
        <button class="btn btn-danger" data-appr-no="${a.id}">✕ Reject</button>
      </div></section>`;
  }).join("") : `<div class="panel"><p class="muted">No pending category approvals.</p></div>`;
}

function qcDecide(id, pass, reasons) {
  const L = getListing(id);
  if (!L || L.status !== "qc_pending") return;
  L.qcAt = Date.now();
  if (pass) {
    L.status = "qc_passed";
    L.qcReasons = [];
    notifySeller(L.sellerId, `✅ QC pass: "${L.name}" ${L.listingStatus === "active" ? (L.stock > 0 ? "is now live" : "passed — add stock to go live") : "passed — activate it to go live"}.`);
  } else {
    L.status = "qc_failed";
    L.qcReasons = reasons;
    L.qcFailCount = (L.qcFailCount || 0) + 1;
    notifySeller(L.sellerId, `❌ QC error: "${L.name}" — ${reasons.join("; ")}. My Listings → Fix errors.`);
  }
  saveListing(L);
}

document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.dataset.qcPass) { qcDecide(Number(t.dataset.qcPass), true); showToast("QC pass ✓"); render(); }
  if (t.dataset.qcPassAll) {
    getListings().filter((l) => l.status === "qc_pending").forEach((l) => qcDecide(l.id, true));
    showToast("All listings passed QC ✓");
    render();
  }
  if (t.dataset.qcFail) {
    const id = t.dataset.qcFail;
    const reasons = [...document.querySelectorAll(`[data-reason="${id}"]:checked`)].map((c) => c.value);
    const custom = document.getElementById("qc-custom-" + id).value.trim();
    if (custom) reasons.push(custom);
    if (!reasons.length) { showToast("Choose at least one reason"); return; }
    qcDecide(Number(id), false, reasons);
    showToast("QC failed — the reasons were sent to the seller");
    render();
  }
  if (t.dataset.apprOk || t.dataset.apprNo) {
    const id = t.dataset.apprOk || t.dataset.apprNo;
    const list = getApprovals();
    const a = list.find((x) => x.id === id);
    if (!a) return;
    if (t.dataset.apprNo) {
      const reason = document.getElementById("appr-reason-" + id).value.trim();
      if (reason.length < 5) { showToast("Write a reason for rejecting"); return; }
      a.status = "rejected"; a.reason = reason;
    } else a.status = "approved";
    a.reviewedAt = Date.now();
    saveApprovals(list);
    notifySeller(a.sellerId, a.status === "approved" ? `🔓 ${RESTRICTED[a.group].label} category approved — you can now send listings for QC.` : `❌ ${RESTRICTED[a.group].label} approval rejected: ${a.reason}`);
    showToast(a.status === "approved" ? "Category approved ✓" : "Rejected");
    render();
  }
});
