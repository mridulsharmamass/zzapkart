// =====================================================================
// Seller Profile: business details, default compliance details,
// bank account + penny-drop verification (required for payouts)
// =====================================================================
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
const IFSC_BANKS = {
  SBIN: "State Bank of India", HDFC: "HDFC Bank", ICIC: "ICICI Bank", UTIB: "Axis Bank", KKBK: "Kotak Mahindra Bank",
  PUNB: "Punjab National Bank", BARB: "Bank of Baroda", CNRB: "Canara Bank", UBIN: "Union Bank of India", IDIB: "Indian Bank",
  YESB: "Yes Bank", INDB: "IndusInd Bank", IDFB: "IDFC FIRST Bank", BKID: "Bank of India", AIRP: "Airtel Payments Bank", PYTM: "Paytm Payments Bank",
};
const bankNameFromIfsc = (ifsc) => IFSC_BANKS[String(ifsc).slice(0, 4)] || "Bank (IFSC valid)";
const maskAcc = (a) => (a ? "X".repeat(Math.max(0, String(a).length - 4)) + String(a).slice(-4) : "");

function bankStatus() {
  const b = me.profile && me.profile.bank;
  if (!b) return "missing";
  if (b.status === "verifying" && Date.now() - (b.startedAt || 0) > 5000) return "unverified"; // page was reloaded mid-check
  return b.status;
}

// Penny drop: send ₹1, get the account holder's name from the bank and match it with the registered name (simulated)
function nameMatches(holder) {
  const toks = (s) => String(s || "").toUpperCase().split(/[^A-Z]+/).filter((t) => t.length >= 3);
  const mine = new Set([...toks(me.name), ...toks(me.shopName), ...toks(me.profile && me.profile.businessName)]);
  return toks(holder).some((t) => mine.has(t));
}

function viewProfile() {
  const p = me.profile || {};
  const pick = p.pickup || {};
  const d = sellerDefaults();
  const b = p.bank || {};
  const bst = { missing: ["Not added", "s-completed"], unverified: ["Not verified", "s-pending"], verifying: ["Verifying…", "s-shipped"], verified: ["Verified ✓", "s-approved"], failed: ["Failed", "s-rejected"] }[bankStatus()];
  content.innerHTML = `
    <h1 class="dash-title">Profile &amp; Bank</h1>
    ${bankStatus() !== "verified" ? `<div class="alert warn">💳 Your bank account isn't verified — <strong>payouts need a verified bank account</strong>. Complete the penny-drop verification below.</div>` : ""}

    <section class="panel">
      <div class="panel-head"><h2>Bank account (payouts)</h2><span class="status-pill ${bst[1]}">${bst[0]}</span></div>
      ${b.status === "verified" ? `<p>${esc(b.bankName)} · A/c ${esc(maskAcc(b.account))} · IFSC ${esc(b.ifsc)}<br><span class="muted small">Name at bank: ${esc(b.verifiedName)} · Verified ${fmtDateTime(b.verifiedAt)} (₹1 penny drop)</span></p>
        <button class="btn-sm btn-outline" id="bank-change">Change bank account</button>` : ""}
      ${b.status === "failed" ? `<div class="alert error small">Penny drop fail: ${esc(b.reason)}</div>` : ""}
      <form id="bank-form" class="checkout-form ${b.status === "verified" ? "hidden" : ""}" novalidate>
        <div class="form-grid">
          <label>Account holder name <input name="holder" value="${esc(b.holder || me.name)}" /><small class="err"></small></label>
          <label>IFSC <input name="ifsc" value="${esc(b.ifsc || "")}" maxlength="11" placeholder="HDFC0001234" /><small class="hint" id="bank-name">${b.ifsc ? esc(bankNameFromIfsc(b.ifsc)) : ""}</small><small class="err"></small></label>
          <label>Account number <input name="account" inputmode="numeric" maxlength="18" value="${esc(b.account || "")}" /><small class="err"></small></label>
          <label>Confirm account number <input name="account2" inputmode="numeric" maxlength="18" value="${esc(b.account || "")}" /><small class="err"></small></label>
        </div>
        <p class="muted small">To verify, we send ₹1 to the account (penny drop) and match the name in the bank's records with your registered name / shop name.</p>
        <button class="btn" type="submit" id="bank-verify">${bankStatus() === "verifying" ? "Verifying…" : "Save &amp; Verify (₹1 penny drop)"}</button>
      </form>
    </section>

    <section class="panel">
      <h2>Business details</h2>
      <form id="biz-form" class="checkout-form" novalidate>
        <div class="form-grid">
          <label>Business / shop name <input name="businessName" value="${esc(p.businessName || me.shopName)}" /><small class="err"></small></label>
          <label>GSTIN <input name="gstin" value="${esc(p.gstin || "")}" maxlength="15" placeholder="22AAAAA0000A1Z5" /><small class="hint">Required for most categories (except exempt items such as books)</small><small class="err"></small></label>
          <label>PAN <input name="pan" value="${esc(p.pan || "")}" maxlength="10" placeholder="AAAAA0000A" /><small class="err"></small></label>
          <label>Pickup pincode <input name="pincode" value="${esc(pick.pincode || "")}" maxlength="6" /><small class="err"></small></label>
          <label class="full">Pickup address <textarea name="address" rows="2">${esc(pick.address || "")}</textarea><small class="err"></small></label>
          <label>City <input name="city" value="${esc(pick.city || "")}" /><small class="err"></small></label>
          <label>State <input name="state" value="${esc(pick.state || "")}" /><small class="err"></small></label>
        </div>
        <button class="btn" type="submit">Save business details</button>
      </form>
    </section>

    <section class="panel">
      <h2>Default compliance details</h2>
      <p class="muted">Save your manufacturer / packer / importer details once — they will be filled in automatically for every new listing and bulk upload.</p>
      <form id="def-form" class="checkout-form" novalidate>
        <label>Country of origin <select name="countryOfOrigin">${OPT.countries.map((c) => `<option ${c === d.countryOfOrigin ? "selected" : ""}>${c}</option>`).join("")}</select></label>
        ${["manufacturer", "packer", "importer"].map((k) => `
          <h3 class="sub-h">${k[0].toUpperCase() + k.slice(1)}</h3>
          ${k !== "manufacturer" ? `<label class="check"><input type="checkbox" name="${k}Same" ${!d[k].name || JSON.stringify(d[k]) === JSON.stringify(d.manufacturer) ? "checked" : ""} /> Same as manufacturer</label>` : ""}
          <div class="form-grid party-${k}">
            <label>Name <input name="${k}.name" value="${esc(d[k].name)}" /><small class="err"></small></label>
            <label>Pincode <input name="${k}.pincode" value="${esc(d[k].pincode)}" maxlength="6" /><small class="err"></small></label>
            <label class="full">Address <textarea name="${k}.address" rows="2">${esc(d[k].address)}</textarea><small class="err"></small></label>
          </div>`).join("")}
        <button class="btn" type="submit">Save defaults</button>
      </form>
    </section>`;

  // ---------- Bank ----------
  const bf = document.getElementById("bank-form");
  const setErr = (f, n, m) => { const el = f.elements[n].closest("label").querySelector(".err"); el.textContent = m || ""; f.elements[n].classList.toggle("invalid", !!m); return !m; };
  bf.elements.ifsc.addEventListener("input", (e) => {
    e.target.value = e.target.value.toUpperCase();
    document.getElementById("bank-name").textContent = IFSC_RE.test(e.target.value) ? bankNameFromIfsc(e.target.value) : "";
  });
  ["account", "account2"].forEach((n) => bf.elements[n].addEventListener("input", (e) => (e.target.value = e.target.value.replace(/\D/g, ""))));
  const chg = document.getElementById("bank-change");
  if (chg) chg.addEventListener("click", () => { bf.classList.remove("hidden"); chg.remove(); });
  bf.addEventListener("submit", (e) => {
    e.preventDefault();
    const holder = bf.elements.holder.value.trim(), ifsc = bf.elements.ifsc.value.trim().toUpperCase();
    const acc = bf.elements.account.value.trim(), acc2 = bf.elements.account2.value.trim();
    const ok = [
      setErr(bf, "holder", holder.length >= 3 ? "" : "Enter the account holder's name"),
      setErr(bf, "ifsc", IFSC_RE.test(ifsc) ? "" : "IFSC format: 4 letters + 0 + 6 characters"),
      setErr(bf, "account", /^\d{9,18}$/.test(acc) ? "" : "Account number 9–18 digits"),
      setErr(bf, "account2", acc === acc2 ? "" : "The account numbers don't match"),
    ].every(Boolean);
    if (!ok) return;
    const bank = { holder, ifsc, account: acc, bankName: bankNameFromIfsc(ifsc), status: "verifying", startedAt: Date.now(), attempts: ((me.profile && me.profile.bank && me.profile.bank.attempts) || 0) + 1 };
    updateSeller(me.id, { profile: { ...(me.profile || {}), bank } });
    refreshMe();
    document.getElementById("bank-verify").textContent = "Sending ₹1…";
    document.getElementById("bank-verify").disabled = true;
    setTimeout(() => {
      refreshMe();
      const bankName = holder.toUpperCase(); // beneficiary name returned by the bank (simulated)
      const matched = nameMatches(holder);
      const result = matched
        ? { ...bank, status: "verified", verifiedName: bankName, verifiedAt: Date.now(), reason: "" }
        : { ...bank, status: "failed", verifiedName: bankName, reason: `The bank's name "${bankName}" doesn't match your registered name "${me.name}" or shop "${me.shopName}"` };
      updateSeller(me.id, { profile: { ...(me.profile || {}), bank: result } });
      notifySeller(me.id, matched ? `🏦 Bank account verified (${result.bankName} ${maskAcc(acc)}). Payouts are now enabled.` : `❌ Bank verification failed: the name didn't match. Please add the correct account.`);
      showToast(matched ? "Bank verified ✓" : "Verification failed — the name didn't match");
      render();
    }, 1200);
  });

  // ---------- Business ----------
  const zf = document.getElementById("biz-form");
  zf.elements.gstin.addEventListener("input", (e) => (e.target.value = e.target.value.toUpperCase()));
  zf.elements.pan.addEventListener("input", (e) => (e.target.value = e.target.value.toUpperCase()));
  zf.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = (n) => zf.elements[n].value.trim();
    const gstin = v("gstin").toUpperCase(), pan = v("pan").toUpperCase();
    const ok = [
      setErr(zf, "businessName", v("businessName").length >= 3 ? "" : "Enter your business name"),
      setErr(zf, "gstin", !gstin || GSTIN_RE.test(gstin) ? "" : "Invalid GSTIN format (15 characters)"),
      setErr(zf, "pan", !pan || PAN_RE.test(pan) ? (gstin && pan && gstin.slice(2, 12) !== pan ? "PAN and GSTIN don't match" : "") : "PAN format: AAAAA0000A"),
      setErr(zf, "pincode", !v("pincode") || PINCODE_RE.test(v("pincode")) ? "" : "6-digit pincode"),
    ].every(Boolean);
    if (!ok) return;
    updateSeller(me.id, { profile: { ...(me.profile || {}), businessName: v("businessName"), gstin, pan: pan || (gstin ? gstin.slice(2, 12) : ""), pickup: { address: v("address"), city: v("city"), state: v("state"), pincode: v("pincode") } } });
    showToast("Business details saved ✓");
    render();
  });

  // ---------- Defaults ----------
  const df = document.getElementById("def-form");
  const toggleParty = () => ["packer", "importer"].forEach((k) => df.querySelector(".party-" + k).classList.toggle("hidden", df.elements[k + "Same"].checked));
  toggleParty();
  df.addEventListener("change", toggleParty);
  df.addEventListener("submit", (e) => {
    e.preventDefault();
    const get = (k) => ({ name: df.elements[k + ".name"].value.trim(), address: df.elements[k + ".address"].value.trim(), pincode: df.elements[k + ".pincode"].value.trim() });
    const parties = { manufacturer: get("manufacturer") };
    ["packer", "importer"].forEach((k) => (parties[k] = df.elements[k + "Same"].checked ? { ...parties.manufacturer } : get(k)));
    let ok = true;
    Object.entries(parties).forEach(([k, p]) => {
      ok = setErr(df, `${k}.name`, p.name.length >= 3 ? "" : "Enter a name") && ok;
      ok = setErr(df, `${k}.address`, p.address.length >= 10 ? "" : "Enter the full address") && ok;
      ok = setErr(df, `${k}.pincode`, PINCODE_RE.test(p.pincode) ? "" : "6-digit pincode") && ok;
    });
    if (!ok) return;
    updateSeller(me.id, { profile: { ...(me.profile || {}), defaults: { ...parties, countryOfOrigin: df.elements.countryOfOrigin.value } } });
    showToast("Default details saved ✓ — they'll be filled in for new listings");
    render();
  });
}
