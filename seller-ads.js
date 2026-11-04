// =====================================================================
// Seller Ads Console — Campaign Manager, Create campaign, Campaign detail
// Routes:  #ads   #ads/new   #ads/c/<campaignId>/<tab>
// (seller.js ke helpers use karta hai: me, content, tile, pill, openModal...)
// =====================================================================

const ADS_UI = { range: "7", metric: "spend", filter: "all", search: "" };
let adDraft = null;

// ---------- formatting ----------
const money2 = (n) => (n === null || n === undefined ? "—" : "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }));
const pct = (n) => (n === null || n === undefined ? "—" : n.toFixed(n < 10 ? 2 : 1) + "%");
const ratio = (n) => (n === null || n === undefined ? "—" : n.toFixed(2) + "x");
const num = (n) => Number(n || 0).toLocaleString("en-IN");

const METRICS = {
  spend: { label: "Spend", fmt: money2, help: "Ad par kharcha" },
  sales: { label: "Sales", fmt: money2, help: "Ad click ke 7 din andar bikri" },
  acos: { label: "ACOS", fmt: pct, help: "Spend ÷ Sales (kam = behtar)" },
  roas: { label: "ROAS", fmt: ratio, help: "Sales ÷ Spend (zyada = behtar)" },
  imp: { label: "Impressions", fmt: num, help: "Ad kitni baar dikha" },
  clk: { label: "Clicks", fmt: num, help: "Ad par clicks" },
  ctr: { label: "CTR", fmt: pct, help: "Clicks ÷ Impressions" },
  orders: { label: "Orders", fmt: num, help: "Ad se aaye orders" },
};

const rangeStart = () => (ADS_UI.range === "life" ? 0 : startOfDay(Date.now() - (Number(ADS_UI.range) - 1) * DAY));
const rangeLabel = () => ({ "1": "Today", "7": "Last 7 days", "30": "Last 30 days", life: "Lifetime" })[ADS_UI.range];

function myCampaigns() {
  return getCampaigns().filter((c) => c.sellerId === me.id);
}

function toggle(attrs, on) {
  return `<label class="tgl" title="${on ? "Enabled" : "Paused"}"><input type="checkbox" ${attrs} ${on ? "checked" : ""} /><span></span></label>`;
}

function adStatusPill(c) {
  const s = campaignStatus(c);
  return `<span class="status-pill ad-st-${s.key}">${s.label}</span>`;
}

const typeBadge = (t) => `<span class="type-badge ${t === "SB" ? "sb" : "sp"}">${t === "SB" ? "Sponsored Brands" : "Sponsored Products"}</span>`;

function thumbOf(p) {
  return safeImg(p && p.image) ? `<img src="${safeImg(p.image)}" alt="" />` : "📦";
}

function dateInput(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseDateInput(v, endOfDay) {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  const t = new Date(y, m - 1, d).getTime();
  return endOfDay ? t + DAY - 1 : t;
}

// Metric cells for tables
function metricCells(s) {
  const d = s && s.ctr !== undefined ? s : derived({ ...emptyStats(), ...(s || {}) });
  return `<td class="num">${num(d.imp)}</td><td class="num">${num(d.clk)}</td><td class="num">${pct(d.ctr)}</td>
    <td class="num">${money2(d.spend)}</td><td class="num">${money2(d.cpc)}</td><td class="num">${num(d.orders)}</td>
    <td class="num">${money2(d.sales)}</td><td class="num">${pct(d.acos)}</td>`;
}
const METRIC_HEADS = `<th class="num">Impr.</th><th class="num">Clicks</th><th class="num">CTR</th><th class="num">Spend</th><th class="num">CPC</th><th class="num">Orders</th><th class="num">Sales</th><th class="num">ACOS</th>`;

// ---------- line chart (single metric over days) ----------
function seriesFor(campaigns) {
  const from = ADS_UI.range === "life"
    ? Math.min(Date.now(), ...campaigns.map((c) => c.createdAt).concat([Date.now() - 13 * DAY]))
    : rangeStart();
  const days = [];
  for (let t = startOfDay(from); t <= Date.now(); t += DAY) days.push(t);
  return days.map((t) => {
    const k = dayKey(t);
    const s = derived(sumStats(campaigns.map((c) => (c.daily || {})[k])));
    return { t, label: new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), value: s[ADS_UI.metric] ?? 0, stats: s };
  });
}

// Y-axis max: data na ho to metric ke hisaab se chhota default
function chartMax(points) {
  const m = Math.max(...points.map((p) => p.value || 0), 0);
  if (m > 0) return niceMax(m);
  return { spend: 100, sales: 100, acos: 100, ctr: 10, roas: 5 }[ADS_UI.metric] || 10;
}

function lineChart(points) {
  const W = 760, H = 220, pl = 56, pr = 28, pt = 14, pb = 28;
  const iw = W - pl - pr, ih = H - pt - pb;
  const max = chartMax(points);
  const x = (i) => pl + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v) => pt + ih - (v / max) * ih;
  const fmt = METRICS[ADS_UI.metric].fmt;
  const ticks = [0, 0.5, 1].map((f) => f * max);
  const every = Math.ceil(points.length / 7);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1)},${pt + ih} L${x(0)},${pt + ih} Z`;
  return `
    <svg viewBox="0 0 ${W} ${H}" class="chart line-chart" role="img" aria-label="${METRICS[ADS_UI.metric].label} by day">
      ${ticks.map((t) => `<line x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}" class="grid-line ${t === 0 ? "base" : ""}" />
        <text x="${pl - 8}" y="${y(t) + 4}" text-anchor="end" class="axis-label">${fmt(t)}</text>`).join("")}
      ${points.map((p, i) => (i % every === 0 || i === points.length - 1)
        ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="axis-label">${esc(p.label)}</text>` : "").join("")}
      <path d="${area}" class="line-area" />
      <path d="${path}" class="line" />
      <line class="crosshair hidden" y1="${pt}" y2="${pt + ih}" />
      <circle class="line-dot hidden" r="5" />
      <rect class="hit" x="${pl}" y="${pt}" width="${iw}" height="${ih}" />
    </svg>`;
}

function wireLineChart(wrap, points) {
  const svg = wrap.querySelector("svg");
  const tip = document.getElementById("chart-tip");
  const cross = svg.querySelector(".crosshair"), dot = svg.querySelector(".line-dot");
  const W = 760, pl = 56, pr = 28, pt = 14, ih = 220 - 14 - 28;
  const max = chartMax(points);
  svg.addEventListener("mousemove", (e) => {
    const r = svg.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W;
    const i = points.length === 1 ? 0 : Math.max(0, Math.min(points.length - 1, Math.round(((sx - pl) / (W - pl - pr)) * (points.length - 1))));
    const p = points[i];
    const px = points.length === 1 ? pl + (W - pl - pr) / 2 : pl + (i / (points.length - 1)) * (W - pl - pr);
    const py = pt + ih - (p.value / max) * ih;
    cross.setAttribute("x1", px); cross.setAttribute("x2", px); cross.classList.remove("hidden");
    dot.setAttribute("cx", px); dot.setAttribute("cy", py); dot.classList.remove("hidden");
    const s = p.stats;
    tip.innerHTML = `<strong>${esc(p.label)}</strong>
      <div>${METRICS[ADS_UI.metric].label}: <strong>${METRICS[ADS_UI.metric].fmt(p.value)}</strong></div>
      <div class="tip-sub">Spend ${money2(s.spend)} · Sales ${money2(s.sales)} · Clicks ${num(s.clk)}</div>`;
    tip.classList.remove("hidden");
    tip.style.left = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8) + "px";
    tip.style.top = e.clientY + 14 + "px";
  });
  svg.addEventListener("mouseleave", () => {
    tip.classList.add("hidden"); cross.classList.add("hidden"); dot.classList.add("hidden");
  });
}

function metricsBlock(campaigns) {
  const from = rangeStart();
  const t = derived(sumStats(campaigns.map((c) => campaignTotals(c, from))));
  const points = seriesFor(campaigns);
  return {
    html: `
      <div class="metric-strip">
        ${Object.entries(METRICS).map(([k, m]) => `
          <button class="metric-card ${ADS_UI.metric === k ? "active" : ""}" data-metric="${k}" title="${m.help}">
            <span class="stat-label">${m.label}</span>
            <span class="stat-value">${m.fmt(t[k])}</span>
          </button>`).join("")}
      </div>
      <section class="panel">
        <div class="panel-head"><h2>${METRICS[ADS_UI.metric].label} — ${rangeLabel()}</h2><span class="muted">${METRICS[ADS_UI.metric].help}</span></div>
        <div class="chart-wrap" id="ads-chart">${lineChart(points)}</div>
        <details class="data-table"><summary>Data table</summary>
          <table class="table"><thead><tr><th>Date</th><th class="num">Impr.</th><th class="num">Clicks</th><th class="num">Spend</th><th class="num">Orders</th><th class="num">Sales</th></tr></thead>
          <tbody>${points.map((p) => `<tr><td>${esc(p.label)}</td><td class="num">${num(p.stats.imp)}</td><td class="num">${num(p.stats.clk)}</td><td class="num">${money2(p.stats.spend)}</td><td class="num">${num(p.stats.orders)}</td><td class="num">${money2(p.stats.sales)}</td></tr>`).join("")}</tbody></table>
        </details>
      </section>`,
    wire() {
      content.querySelectorAll("[data-metric]").forEach((b) => b.addEventListener("click", () => { ADS_UI.metric = b.dataset.metric; render(); }));
      wireLineChart(document.getElementById("ads-chart"), points);
    },
  };
}

function rangeSelect() {
  return `<select class="range-select" id="ads-range" aria-label="Date range">
    ${[["1", "Today"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["life", "Lifetime"]].map(([v, l]) =>
      `<option value="${v}" ${ADS_UI.range === v ? "selected" : ""}>${l}</option>`).join("")}
  </select>`;
}
function wireRange() {
  document.getElementById("ads-range").addEventListener("change", (e) => { ADS_UI.range = e.target.value; render(); });
}

// =====================================================================
// Router
// =====================================================================
function renderAdsView() {
  const parts = location.hash.slice(1).split("/");
  if (parts[1] === "new") return renderCreateCampaign();
  if (parts[1] === "c" && parts[2]) return renderCampaignDetail(parts[2], parts[3] || "products");
  return renderCampaignManager();
}

// =====================================================================
// Campaign Manager
// =====================================================================
function renderCampaignManager() {
  const all = myCampaigns();
  const from = rangeStart();
  const month = dayKey().slice(0, 7);
  const billed = (me.adBill || {})[month] || 0;
  const q = ADS_UI.search.toLowerCase();
  const rows = all
    .filter((c) => ADS_UI.filter === "all" ? c.state !== "archived" : c.state === ADS_UI.filter)
    .filter((c) => !q || c.name.toLowerCase().includes(q));
  const mb = metricsBlock(all.filter((c) => c.state !== "archived"));
  const totals = derived(sumStats(rows.map((c) => campaignTotals(c, from))));

  content.innerHTML = `
    <div class="dash-head ads-head">
      <div>
        <h1 class="dash-title">Campaign Manager</h1>
        <p class="muted">Apne products ko search, category aur product pages par promote karo. Sirf click par paisa lagta hai.</p>
      </div>
      <div class="ads-head-actions">
        ${rangeSelect()}
        <a href="#ads/new" class="btn">+ Create campaign</a>
      </div>
    </div>

    <div class="billing-strip">
      <span>💳 Ad credits: <strong>${money2(me.adCredits || 0)}</strong></span>
      <span>🧾 Is mahine ka ad bill: <strong>${money2(billed)}</strong> <small class="muted">(credits ke baad, demo)</small></span>
      <span>⏱ Attribution: click ke ${ATTRIBUTION_DAYS} din andar order</span>
    </div>

    ${all.length ? mb.html : ""}

    ${all.length ? `
    <section class="panel">
      <div class="table-toolbar">
        <input type="search" id="camp-search" placeholder="Find a campaign" value="${esc(ADS_UI.search)}" />
        <div class="filter-tabs">${[["all", "All"], ["enabled", "Enabled"], ["paused", "Paused"], ["archived", "Archived"]].map(([k, l]) =>
          `<button class="chip ${ADS_UI.filter === k ? "active" : ""}" data-filter="${k}">${l}</button>`).join("")}</div>
      </div>
      <div class="table-wrap">
        <table class="table ads-table">
          <thead><tr><th>Active</th><th>Campaign</th><th>Status</th><th>Targeting</th><th>Start</th><th>End</th><th class="num">Daily budget</th>${METRIC_HEADS}<th class="num">ROAS</th></tr></thead>
          <tbody>
            ${rows.map((c) => {
              const t = campaignTotals(c, from);
              return `<tr>
                <td>${c.state === "archived" ? "—" : toggle(`data-camp-toggle="${c.id}"`, c.state === "enabled")}</td>
                <td class="camp-name"><a href="#ads/c/${c.id}">${esc(c.name)}</a>${typeBadge(c.type)}</td>
                <td>${adStatusPill(c)}</td>
                <td>${c.type === "SB" ? "Keywords" : c.targeting === "auto" ? "Automatic" : "Manual"}</td>
                <td>${fmtDate(c.startAt)}</td>
                <td>${c.endAt ? fmtDate(c.endAt) : "No end date"}</td>
                <td class="num">${money2(c.dailyBudget)}<div class="budget-track"><div style="width:${Math.min(100, (spentToday(c) / c.dailyBudget) * 100)}%"></div></div></td>
                ${metricCells(t)}<td class="num">${ratio(t.roas)}</td>
              </tr>`;
            }).join("") || `<tr><td colspan="17" class="muted">Is filter mein koi campaign nahi.</td></tr>`}
          </tbody>
          ${rows.length ? `<tfoot><tr><td></td><td><strong>Total (${rows.length})</strong></td><td colspan="4"></td><td></td>${metricCells(totals)}<td class="num">${ratio(totals.roas)}</td></tr></tfoot>` : ""}
        </table>
      </div>
      <p class="muted table-note">Budget bar = aaj ka kharcha. Metrics: ${rangeLabel()}.</p>
    </section>` : `
    <section class="panel ads-empty">
      <div class="empty-emoji">📣</div>
      <h2>Apna pehla ad campaign banao</h2>
      <p class="muted">Customer jab search karega, aapka product sabse upar "Sponsored" label ke saath dikhega. Aap sirf click par pay karte ho.</p>
      <div class="how-grid">
        <div><strong>1. Product chuno</strong><p class="muted">Kaunse products promote karne hain</p></div>
        <div><strong>2. Budget &amp; bid set karo</strong><p class="muted">Roz ka budget aur ek click ki max keemat</p></div>
        <div><strong>3. Results dekho</strong><p class="muted">Impressions, clicks, sales, ACOS</p></div>
      </div>
      <a href="#ads/new" class="btn">+ Create campaign</a>
    </section>`}`;

  if (all.length) {
    mb.wire();
    const s = document.getElementById("camp-search");
    s.addEventListener("input", () => {
      ADS_UI.search = s.value;
      clearTimeout(s._t);
      s._t = setTimeout(() => { render(); const n = document.getElementById("camp-search"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 300);
    });
    content.querySelectorAll("[data-filter]").forEach((b) => b.addEventListener("click", () => { ADS_UI.filter = b.dataset.filter; render(); }));
    content.querySelectorAll("[data-camp-toggle]").forEach((cb) => cb.addEventListener("change", () => {
      updateCampaign(cb.dataset.campToggle, (c) => { if (c.sellerId === me.id) c.state = cb.checked ? "enabled" : "paused"; });
      showToast(cb.checked ? "Campaign enabled" : "Campaign paused");
      render();
    }));
  }
  wireRange();
}

// =====================================================================
// Create campaign
// =====================================================================
const STOP = new Set(["for", "the", "and", "with", "set", "pack", "new", "men", "women"]);

function keywordSuggestions(productIds) {
  const seen = new Set(), out = [];
  const add = (t) => { t = normalizeQuery(t); if (t.length >= 3 && !seen.has(t)) { seen.add(t); out.push(t); } };
  productIds.map(sellerProductById).filter(Boolean).forEach((p) => {
    add(p.name);
    const w = words(p.name).filter((x) => x.length >= 3 && !STOP.has(x));
    w.forEach(add);
    for (let i = 0; i < w.length - 1; i++) add(w[i] + " " + w[i + 1]);
    add(p.category);
  });
  return out.slice(0, 14);
}

function newDraft(type) {
  const prods = productsOfSeller(me.id).filter((p) => p.stock > 0);
  return {
    type,
    name: `${type === "SB" ? "Sponsored Brands" : "Sponsored Products"} – ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
    start: dateInput(Date.now()),
    end: "",
    dailyBudget: 200,
    targeting: type === "SB" ? "manual" : "auto",
    defaultBid: Math.max(3, suggestedBid(prods[0] ? prods[0].category : "").mid),
    productIds: prods.slice(0, type === "SB" ? 3 : 1).map((p) => p.id),
    keywords: [],
    negatives: [],
    headline: "",
    matchTypes: { broad: true, phrase: true, exact: false },
  };
}

function renderCreateCampaign() {
  const prods = productsOfSeller(me.id);
  const inStockProds = prods.filter((p) => p.stock > 0);
  if (!inStockProds.length) {
    content.innerHTML = `
      <p class="breadcrumb-dark"><a href="#ads">Campaign Manager</a> › Create campaign</p>
      <section class="panel ads-empty"><div class="empty-emoji">📦</div><h2>Pehle product add karo</h2>
      <p class="muted">Ad chalane ke liye kam se kam ek in-stock product chahiye.</p><a href="#products" class="btn">Add product</a></section>`;
    return;
  }

  if (!adDraft) {
    content.innerHTML = `
      <p class="breadcrumb-dark"><a href="#ads">Campaign Manager</a> › Create campaign</p>
      <h1 class="dash-title">Choose your campaign type</h1>
      <div class="type-grid">
        <button class="type-card" data-type="SP">
          <div class="type-visual sp-visual"><span></span><span class="ad"></span><span></span><span></span></div>
          <h3>Sponsored Products</h3>
          <p>Individual products ko search results, category aur product pages par promote karo.</p>
          <ul><li>✓ Automatic ya keyword targeting</li><li>✓ Kam budget se shuru</li><li>✓ Naye sellers ke liye best</li></ul>
          <span class="btn">Continue</span>
        </button>
        <button class="type-card" data-type="SB">
          <div class="type-visual sb-visual"><span class="banner"></span><span></span><span></span><span></span></div>
          <h3>Sponsored Brands</h3>
          <p>Apni shop ka naam, headline aur 3 products search results ke sabse upar banner mein.</p>
          <ul><li>✓ Brand awareness</li><li>✓ Keyword targeting</li><li>✓ Ek saath 3 products</li></ul>
          <span class="btn">Continue</span>
        </button>
      </div>`;
    content.querySelectorAll("[data-type]").forEach((b) => b.addEventListener("click", () => { adDraft = newDraft(b.dataset.type); render(); }));
    return;
  }

  const d = adDraft;
  const isSB = d.type === "SB";
  const sugg = keywordSuggestions(d.productIds).filter((s) => !d.keywords.some((k) => k.text === s));
  const est = d.defaultBid > 0 ? Math.floor(d.dailyBudget / Math.max(1, d.targeting === "auto" ? d.defaultBid : (d.keywords[0]?.bid || d.defaultBid))) : 0;

  content.innerHTML = `
    <p class="breadcrumb-dark"><a href="#ads">Campaign Manager</a> › <a href="#" id="change-type">Create campaign</a> › ${isSB ? "Sponsored Brands" : "Sponsored Products"}</p>
    <h1 class="dash-title">Create ${isSB ? "Sponsored Brands" : "Sponsored Products"} campaign</h1>

    <div class="wizard">
      <form id="wiz" class="wizard-main checkout-form" novalidate>
        <section class="panel">
          <h2>Settings</h2>
          <div class="form-grid">
            <label class="full">Campaign name
              <input name="name" value="${esc(d.name)}" maxlength="80" />
              <small class="err" data-err="name"></small>
            </label>
            <label>Start date
              <input name="start" type="date" value="${d.start}" min="${dateInput(Date.now())}" />
              <small class="err" data-err="start"></small>
            </label>
            <label>End date <span class="muted">(optional)</span>
              <input name="end" type="date" value="${d.end}" min="${d.start}" />
              <small class="err" data-err="end"></small>
            </label>
            <label>Daily budget (₹)
              <input name="dailyBudget" type="number" min="${AD_MIN_DAILY_BUDGET}" step="10" value="${d.dailyBudget}" />
              <small class="hint">Roz ka max kharcha. Budget khatam hone par us din ad ruk jayega.</small>
              <small class="err" data-err="dailyBudget"></small>
            </label>
          </div>
        </section>

        ${isSB ? `
        <section class="panel">
          <h2>Brand creative</h2>
          <label>Headline
            <input name="headline" value="${esc(d.headline)}" maxlength="50" placeholder="Summer collection — 40% tak off" />
            <small class="hint">Max 50 characters. Banner mein aapki shop "${esc(me.shopName)}" ke saath dikhega.</small>
            <small class="err" data-err="headline"></small>
          </label>
        </section>` : ""}

        <section class="panel">
          <h2>Products <span class="muted">(${d.productIds.length} selected${isSB ? ", max 3" : ""})</span></h2>
          <div class="pick-list">
            ${prods.map((p) => `
              <label class="pick ${p.stock > 0 ? "" : "disabled"}">
                <input type="checkbox" data-pick="${p.id}" ${d.productIds.includes(p.id) ? "checked" : ""} ${p.stock > 0 ? "" : "disabled"} />
                <span class="thumb">${thumbOf(p)}</span>
                <span class="pick-info"><strong>${esc(p.name)}</strong><span class="muted">${formatPrice(p.price)} · Stock ${p.stock}${p.stock > 0 ? "" : " (out of stock)"}</span></span>
              </label>`).join("")}
          </div>
          <small class="err" data-err="products"></small>
        </section>

        <section class="panel">
          <h2>Targeting</h2>
          ${isSB ? `<p class="muted">Sponsored Brands keyword targeting use karta hai.</p>` : `
          <div class="pay-options">
            <label class="pay-opt ${d.targeting === "auto" ? "selected" : ""}">
              <input type="radio" name="targeting" value="auto" ${d.targeting === "auto" ? "checked" : ""} />
              <span><strong>Automatic targeting</strong><br><small class="muted">Zzapkart aapke product ke naam/category se related searches aur pages par ad dikhayega.</small></span>
            </label>
            <label class="pay-opt ${d.targeting === "manual" ? "selected" : ""}">
              <input type="radio" name="targeting" value="manual" ${d.targeting === "manual" ? "checked" : ""} />
              <span><strong>Manual targeting</strong><br><small class="muted">Aap khud keywords chuno aur har keyword ki bid set karo.</small></span>
            </label>
          </div>`}

          <label class="bid-row">Default bid (₹ per click)
            <input name="defaultBid" type="number" min="${AD_MIN_BID}" max="${AD_MAX_BID}" step="0.5" value="${d.defaultBid}" />
            <small class="hint">${d.targeting === "auto" ? "Search, category, product pages aur home par" : "Category, product pages aur home par"} yahi bid lagegi.
              Suggested: ₹${suggestedBid(sellerProductById(d.productIds[0])?.category || "").low}–₹${suggestedBid(sellerProductById(d.productIds[0])?.category || "").high}</small>
            <small class="err" data-err="defaultBid"></small>
          </label>

          ${d.targeting === "manual" ? `
          <div class="kw-builder">
            <div class="kw-col">
              <h3>Suggested keywords</h3>
              <div class="match-pick">Match type:
                ${Object.entries(MATCH_TYPES).map(([k, l]) => `<label><input type="checkbox" data-mt="${k}" ${d.matchTypes[k] ? "checked" : ""} /> ${l}</label>`).join("")}
              </div>
              <div class="kw-sugg">
                ${sugg.map((s) => `<div class="kw-sugg-row"><span>${esc(s)}</span><span class="muted">₹${suggestedBid(s).mid}</span><button type="button" class="btn-sm btn-outline" data-add-sugg="${esc(s)}">Add</button></div>`).join("") || `<p class="muted">Saare suggestions add ho gaye.</p>`}
              </div>
              <h3>Apne keywords</h3>
              <textarea id="kw-custom" rows="3" placeholder="Ek line mein ek keyword&#10;red tshirt&#10;cotton t shirt"></textarea>
              <button type="button" class="btn-sm btn-outline" id="kw-add-custom">Add keywords</button>
            </div>
            <div class="kw-col">
              <h3>Added keywords (${d.keywords.length})</h3>
              ${d.keywords.length ? `<table class="table kw-table"><thead><tr><th>Keyword</th><th>Match</th><th>Bid (₹)</th><th></th></tr></thead><tbody>
                ${d.keywords.map((k, i) => `<tr><td>${esc(k.text)}</td><td>${MATCH_TYPES[k.match]}</td>
                  <td><input type="number" class="bid-input" data-kw-bid="${i}" min="${AD_MIN_BID}" max="${AD_MAX_BID}" step="0.5" value="${k.bid}" /></td>
                  <td><button type="button" class="icon-btn" data-kw-del="${i}" aria-label="Remove">✕</button></td></tr>`).join("")}
              </tbody></table>` : `<p class="muted">Abhi koi keyword nahi. Left se add karo.</p>`}
              <small class="err" data-err="keywords"></small>
            </div>
          </div>` : ""}
        </section>

        <section class="panel">
          <h2>Negative keywords <span class="muted">(optional)</span></h2>
          <p class="muted">In searches par aapka ad nahi dikhega (jaise "free", "second hand").</p>
          <div class="neg-add">
            <input id="neg-text" placeholder="keyword" maxlength="60" />
            <select id="neg-match"><option value="phrase">Negative phrase</option><option value="exact">Negative exact</option></select>
            <button type="button" class="btn-sm btn-outline" id="neg-add">Add</button>
          </div>
          <div class="neg-list">${d.negatives.map((n, i) => `<span class="neg-chip">${esc(n.text)} <small>${n.match}</small><button type="button" data-neg-del="${i}" aria-label="Remove">✕</button></span>`).join("")}</div>
        </section>
      </form>

      <aside class="wizard-side panel">
        <h2>Summary</h2>
        <div class="sum-row"><span>Type</span><span>${isSB ? "Sponsored Brands" : "Sponsored Products"}</span></div>
        <div class="sum-row"><span>Products</span><span>${d.productIds.length}</span></div>
        <div class="sum-row"><span>Targeting</span><span>${d.targeting === "auto" ? "Automatic" : `${d.keywords.length} keywords`}</span></div>
        <div class="sum-row"><span>Daily budget</span><span id="sum-budget">${money2(d.dailyBudget)}</span></div>
        <div class="sum-row"><span>Est. clicks/day</span><span id="sum-est">~${est}</span></div>
        <div class="sum-row"><span>Ad credits</span><span>${money2(me.adCredits || 0)}</span></div>
        <p class="muted small">Aap sirf click par pay karte ho — second-price auction: agle advertiser se ₹1 zyada, aapki bid tak.</p>
        <button class="btn checkout-btn" id="launch">Launch campaign</button>
        <button class="btn btn-outline checkout-btn" id="cancel-wiz" type="button">Cancel</button>
      </aside>
    </div>`;

  wireWizard();
}

function wireWizard() {
  const d = adDraft;
  const f = document.getElementById("wiz");

  // Text/number inputs: draft update without re-render (focus aur agla click na toote)
  const updateSummary = () => {
    const bid = d.targeting === "auto" ? d.defaultBid : (d.keywords[0]?.bid || d.defaultBid);
    document.getElementById("sum-budget").textContent = money2(d.dailyBudget || 0);
    document.getElementById("sum-est").textContent = "~" + (bid > 0 ? Math.floor((d.dailyBudget || 0) / Math.max(1, bid)) : 0);
  };
  f.addEventListener("input", (e) => {
    const n = e.target.name;
    if (["name", "start", "end", "headline"].includes(n)) d[n] = e.target.value;
    if (n === "dailyBudget" || n === "defaultBid") d[n] = Number(e.target.value);
    if (e.target.dataset.kwBid !== undefined) d.keywords[Number(e.target.dataset.kwBid)].bid = Number(e.target.value);
    updateSummary();
  });
  // Structural changes: re-render
  f.addEventListener("change", (e) => {
    const t = e.target;
    if (t.name === "targeting") { d.targeting = t.value; render(); }
    if (t.dataset.pick) {
      const id = Number(t.dataset.pick);
      if (t.checked) {
        if (d.type === "SB" && d.productIds.length >= 3) { t.checked = false; showToast("Sponsored Brands mein max 3 products"); return; }
        d.productIds.push(id);
      } else d.productIds = d.productIds.filter((x) => x !== id);
      render();
    }
    if (t.dataset.mt) d.matchTypes[t.dataset.mt] = t.checked;
  });

  const addKeywords = (texts) => {
    const types = Object.keys(d.matchTypes).filter((k) => d.matchTypes[k]);
    if (!types.length) { showToast("Kam se kam ek match type chuno"); return; }
    let added = 0;
    texts.map(normalizeQuery).filter((t) => t.length >= 2).forEach((text) => types.forEach((match) => {
      if (!d.keywords.some((k) => k.text === text && k.match === match)) {
        d.keywords.push({ text, match, bid: suggestedBid(text).mid }); added++;
      }
    }));
    if (added) render();
  };
  content.querySelectorAll("[data-add-sugg]").forEach((b) => b.addEventListener("click", () => addKeywords([b.dataset.addSugg])));
  const custom = document.getElementById("kw-add-custom");
  if (custom) custom.addEventListener("click", () => addKeywords(document.getElementById("kw-custom").value.split("\n")));
  content.querySelectorAll("[data-kw-del]").forEach((b) => b.addEventListener("click", () => { d.keywords.splice(Number(b.dataset.kwDel), 1); render(); }));

  document.getElementById("neg-add").addEventListener("click", () => {
    const text = normalizeQuery(document.getElementById("neg-text").value);
    if (text.length < 2) return;
    d.negatives.push({ text, match: document.getElementById("neg-match").value });
    render();
  });
  content.querySelectorAll("[data-neg-del]").forEach((b) => b.addEventListener("click", () => { d.negatives.splice(Number(b.dataset.negDel), 1); render(); }));

  document.getElementById("change-type").addEventListener("click", (e) => { e.preventDefault(); adDraft = null; render(); });
  document.getElementById("cancel-wiz").addEventListener("click", () => { adDraft = null; location.hash = "ads"; });
  document.getElementById("launch").addEventListener("click", (e) => { e.preventDefault(); launchCampaign(); });
}

function launchCampaign() {
  const d = adDraft;
  const errs = {};
  if (d.name.trim().length < 3) errs.name = "Campaign ka naam daalein";
  const startAt = parseDateInput(d.start, false);
  const endAt = parseDateInput(d.end, true);
  if (!startAt || startAt < startOfDay(Date.now())) errs.start = "Aaj ya aage ki date";
  if (endAt && endAt < startAt) errs.end = "End date start ke baad honi chahiye";
  if (!(d.dailyBudget >= AD_MIN_DAILY_BUDGET)) errs.dailyBudget = `Kam se kam ₹${AD_MIN_DAILY_BUDGET}`;
  if (!(d.defaultBid >= AD_MIN_BID && d.defaultBid <= AD_MAX_BID)) errs.defaultBid = `₹${AD_MIN_BID} se ₹${AD_MAX_BID} ke beech`;
  else if (d.defaultBid > d.dailyBudget) errs.defaultBid = "Bid daily budget se zyada nahi ho sakti";
  if (!d.productIds.length) errs.products = "Kam se kam ek product chuno";
  if (d.type === "SB" && d.headline.trim().length < 5) errs.headline = "Headline likhein (5+ characters)";
  if (d.targeting === "manual") {
    if (!d.keywords.length) errs.keywords = "Kam se kam ek keyword add karo";
    else if (d.keywords.some((k) => !(k.bid >= AD_MIN_BID && k.bid <= AD_MAX_BID))) errs.keywords = `Har bid ₹${AD_MIN_BID}–₹${AD_MAX_BID}`;
  }
  content.querySelectorAll("[data-err]").forEach((el) => (el.textContent = errs[el.dataset.err] || ""));
  if (Object.keys(errs).length) {
    content.querySelector(`[data-err="${Object.keys(errs)[0]}"]`)?.closest("section")?.scrollIntoView({ behavior: "smooth", block: "center" });
    showToast("Kuch details theek karo");
    return;
  }

  const c = {
    id: uid("CMP"),
    sellerId: me.id,
    type: d.type,
    name: d.name.trim(),
    state: "enabled",
    startAt,
    endAt,
    dailyBudget: Math.round(d.dailyBudget),
    targeting: d.targeting,
    defaultBid: Math.round(d.defaultBid * 100) / 100,
    productIds: [...d.productIds],
    pausedProducts: [],
    keywords: d.keywords.map((k) => ({ id: uid("KW"), text: k.text, match: k.match, bid: k.bid, state: "enabled", stats: emptyStats() })),
    negatives: d.negatives.map((n) => ({ id: uid("NK"), ...n })),
    headline: d.headline.trim(),
    daily: {},
    createdAt: Date.now(),
  };
  const list = getCampaigns();
  list.unshift(c);
  if (!saveCampaigns(list)) return;
  notifySeller(me.id, `📣 Campaign "${c.name}" launch ho gaya — daily budget ${money2(c.dailyBudget)}.`);
  adDraft = null;
  showToast("Campaign launched ✓");
  location.hash = `ads/c/${c.id}`;
}

// =====================================================================
// Campaign detail
// =====================================================================
const DETAIL_TABS = [
  ["products", "Products"],
  ["targeting", "Targeting"],
  ["negatives", "Negative keywords"],
  ["terms", "Search terms"],
  ["placements", "Placements"],
  ["settings", "Settings"],
];

function renderCampaignDetail(id, tab) {
  const c = getCampaign(id);
  if (!c || c.sellerId !== me.id) {
    content.innerHTML = `<div class="panel empty"><p>Campaign nahi mila.</p><a href="#ads" class="btn">Back</a></div>`;
    return;
  }
  const mb = metricsBlock([c]);
  const tabs = DETAIL_TABS;

  content.innerHTML = `
    <p class="breadcrumb-dark"><a href="#ads">Campaign Manager</a> › ${esc(c.name)}</p>
    <div class="dash-head ads-head">
      <div class="camp-title">
        ${c.state === "archived" ? "" : toggle(`id="detail-toggle"`, c.state === "enabled")}
        <div>
          <h1 class="dash-title">${esc(c.name)}</h1>
          <div class="camp-meta">${typeBadge(c.type)} ${adStatusPill(c)}
            <span class="muted">Daily budget ${money2(c.dailyBudget)} · Aaj ka kharcha ${money2(spentToday(c))} · ${fmtDate(c.startAt)} – ${c.endAt ? fmtDate(c.endAt) : "No end date"}</span></div>
        </div>
      </div>
      <div class="ads-head-actions">${rangeSelect()}</div>
    </div>
    ${mb.html}
    <div class="sub-tabs">${tabs.map(([k, l]) => `<a href="#ads/c/${c.id}/${k}" class="${tab === k ? "active" : ""}">${l}</a>`).join("")}</div>
    <section class="panel" id="tab-body"></section>`;

  mb.wire();
  wireRange();
  const dt = document.getElementById("detail-toggle");
  if (dt) dt.addEventListener("change", () => {
    updateCampaign(c.id, (x) => (x.state = dt.checked ? "enabled" : "paused"));
    showToast(dt.checked ? "Campaign enabled" : "Campaign paused");
    render();
  });

  const body = document.getElementById("tab-body");
  ({ products: tabProducts, targeting: tabTargeting, negatives: tabNegatives, terms: tabTerms, placements: tabPlacements, settings: tabSettings }[tab] || tabProducts)(c, body);
}

const lifetimeNote = `<p class="muted table-note">Is table ke numbers lifetime hain.</p>`;

function tabProducts(c, body) {
  const all = productsOfSeller(me.id);
  body.innerHTML = `
    <div class="panel-head"><h2>Advertised products</h2><button class="btn-sm btn-outline" id="add-prods">+ Add products</button></div>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Active</th><th>Product</th><th class="num">Price</th><th class="num">Stock</th>${METRIC_HEADS}<th></th></tr></thead>
      <tbody>${c.productIds.map((pid) => {
        const p = sellerProductById(pid);
        if (!p) return "";
        const on = !(c.pausedProducts || []).includes(pid);
        return `<tr><td>${toggle(`data-prod-toggle="${pid}"`, on)}</td>
          <td><div class="prod-cell"><span class="thumb">${thumbOf(p)}</span>${esc(p.name)}</div></td>
          <td class="num">${formatPrice(p.price)}</td><td class="num ${p.stock === 0 ? "text-danger" : ""}">${p.stock}</td>
          ${metricCells((c.productStats || {})[pid])}
          <td><button class="icon-btn" data-prod-del="${pid}" title="Remove from campaign">✕</button></td></tr>`;
      }).join("")}</tbody>
    </table></div>${lifetimeNote}`;

  body.querySelectorAll("[data-prod-toggle]").forEach((cb) => cb.addEventListener("change", () => {
    const pid = Number(cb.dataset.prodToggle);
    updateCampaign(c.id, (x) => {
      x.pausedProducts = (x.pausedProducts || []).filter((p) => p !== pid);
      if (!cb.checked) x.pausedProducts.push(pid);
    });
    render();
  }));
  body.querySelectorAll("[data-prod-del]").forEach((b) => b.addEventListener("click", () => {
    if (c.productIds.length <= 1) { showToast("Campaign mein kam se kam ek product chahiye"); return; }
    updateCampaign(c.id, (x) => (x.productIds = x.productIds.filter((p) => p !== Number(b.dataset.prodDel))));
    render();
  }));
  document.getElementById("add-prods").addEventListener("click", () => {
    const avail = all.filter((p) => !c.productIds.includes(p.id) && p.stock > 0);
    if (!avail.length) { showToast("Add karne ke liye aur in-stock products nahi"); return; }
    if (c.type === "SB" && c.productIds.length >= 3) { showToast("Sponsored Brands mein max 3 products"); return; }
    openModal(`
      <div class="modal-head"><h2>Add products</h2><button type="button" class="icon-btn" data-close aria-label="Close">✕</button></div>
      <div class="pick-list">${avail.map((p) => `<label class="pick"><input type="checkbox" value="${p.id}" /><span class="thumb">${thumbOf(p)}</span>
        <span class="pick-info"><strong>${esc(p.name)}</strong><span class="muted">${formatPrice(p.price)}</span></span></label>`).join("")}</div>
      <div class="modal-actions"><button class="btn btn-outline" data-close>Cancel</button><button class="btn" id="add-prods-go">Add</button></div>`);
    document.getElementById("add-prods-go").addEventListener("click", () => {
      let ids = [...modalBox.querySelectorAll("input:checked")].map((i) => Number(i.value));
      if (c.type === "SB") ids = ids.slice(0, 3 - c.productIds.length);
      updateCampaign(c.id, (x) => x.productIds.push(...ids));
      closeModal();
      render();
    });
  });
}

function tabTargeting(c, body) {
  if (c.targeting === "auto" && c.type === "SP") {
    body.innerHTML = `
      <h2>Automatic targeting</h2>
      <p class="muted">Zzapkart aapke products ke naam, category aur description se related searches aur pages par ad dikhata hai.
        Kaunse searches par ad dikha, wo <a href="#ads/c/${c.id}/terms" class="link">Search terms</a> mein dekho — achhe terms ko manual campaign mein keyword bana sakte ho.</p>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Targeting</th><th>Bid (₹)</th>${METRIC_HEADS}</tr></thead>
        <tbody><tr><td><strong>Auto — search terms</strong></td>
          <td><input type="number" class="bid-input" id="auto-bid" min="${AD_MIN_BID}" max="${AD_MAX_BID}" step="0.5" value="${c.defaultBid}" /></td>
          ${metricCells(c.autoStats)}</tr></tbody>
      </table></div>${lifetimeNote}`;
    document.getElementById("auto-bid").addEventListener("change", (e) => saveBid(c.id, null, e.target));
    return;
  }

  const kws = (c.keywords || []).filter((k) => k.state !== "archived");
  body.innerHTML = `
    <div class="panel-head"><h2>Keywords</h2></div>
    <div class="neg-add kw-add-row">
      <input id="kw-new" placeholder="naya keyword" maxlength="60" />
      <select id="kw-new-match">${Object.entries(MATCH_TYPES).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select>
      <input id="kw-new-bid" type="number" min="${AD_MIN_BID}" max="${AD_MAX_BID}" step="0.5" placeholder="Bid ₹" class="bid-input" />
      <button class="btn-sm btn-outline" id="kw-new-add">+ Add keyword</button>
    </div>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Active</th><th>Keyword</th><th>Match</th><th>Suggested</th><th>Bid (₹)</th>${METRIC_HEADS}<th></th></tr></thead>
      <tbody>${kws.map((k) => {
        const sb = suggestedBid(k.text);
        return `<tr><td>${toggle(`data-kw-toggle="${k.id}"`, k.state === "enabled")}</td>
          <td><strong>${esc(k.text)}</strong></td><td>${MATCH_TYPES[k.match]}</td>
          <td class="muted">₹${sb.mid} <small>(₹${sb.low}–${sb.high})</small></td>
          <td><input type="number" class="bid-input" data-kw-bid="${k.id}" min="${AD_MIN_BID}" max="${AD_MAX_BID}" step="0.5" value="${k.bid}" /></td>
          ${metricCells(k.stats)}
          <td><button class="icon-btn" data-kw-archive="${k.id}" title="Remove">✕</button></td></tr>`;
      }).join("") || `<tr><td colspan="14" class="muted">Koi keyword nahi.</td></tr>`}</tbody>
    </table></div>
    <p class="muted table-note">Default bid (category, product pages, home): ₹${c.defaultBid} — <a href="#ads/c/${c.id}/settings" class="link">Settings</a> mein badlo. Numbers lifetime hain.</p>`;

  body.querySelectorAll("[data-kw-bid]").forEach((inp) => inp.addEventListener("change", () => saveBid(c.id, inp.dataset.kwBid, inp)));
  body.querySelectorAll("[data-kw-toggle]").forEach((cb) => cb.addEventListener("change", () => {
    updateCampaign(c.id, (x) => (x.keywords.find((k) => k.id === cb.dataset.kwToggle).state = cb.checked ? "enabled" : "paused"));
    render();
  }));
  body.querySelectorAll("[data-kw-archive]").forEach((b) => b.addEventListener("click", () => {
    updateCampaign(c.id, (x) => (x.keywords.find((k) => k.id === b.dataset.kwArchive).state = "archived"));
    render();
  }));
  document.getElementById("kw-new-add").addEventListener("click", () => {
    const text = normalizeQuery(document.getElementById("kw-new").value);
    const match = document.getElementById("kw-new-match").value;
    const bid = Number(document.getElementById("kw-new-bid").value) || suggestedBid(text).mid;
    if (text.length < 2) { showToast("Keyword likho"); return; }
    if (!(bid >= AD_MIN_BID && bid <= AD_MAX_BID)) { showToast(`Bid ₹${AD_MIN_BID}–₹${AD_MAX_BID}`); return; }
    if ((c.keywords || []).some((k) => k.text === text && k.match === match && k.state !== "archived")) { showToast("Ye keyword pehle se hai"); return; }
    updateCampaign(c.id, (x) => { x.keywords = x.keywords || []; x.keywords.push({ id: uid("KW"), text, match, bid, state: "enabled", stats: emptyStats() }); });
    showToast("Keyword added ✓");
    render();
  });
}

function saveBid(cid, kwId, input) {
  const bid = Math.round(Number(input.value) * 100) / 100;
  if (!(bid >= AD_MIN_BID && bid <= AD_MAX_BID)) {
    input.classList.add("invalid");
    showToast(`Bid ₹${AD_MIN_BID} se ₹${AD_MAX_BID} ke beech honi chahiye`);
    return;
  }
  input.classList.remove("invalid");
  updateCampaign(cid, (x) => {
    if (kwId) x.keywords.find((k) => k.id === kwId).bid = bid;
    else x.defaultBid = bid;
  });
  showToast(`Bid ₹${bid} save ✓`);
}

function tabNegatives(c, body) {
  body.innerHTML = `
    <h2>Negative keywords</h2>
    <p class="muted">In searches par is campaign ka ad nahi dikhega. Faltu clicks rokne ke liye use karo.</p>
    <div class="neg-add">
      <input id="neg-text" placeholder="keyword" maxlength="60" />
      <select id="neg-match"><option value="phrase">Negative phrase</option><option value="exact">Negative exact</option></select>
      <button class="btn-sm btn-outline" id="neg-add">+ Add</button>
    </div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Keyword</th><th>Match type</th><th></th></tr></thead>
      <tbody>${(c.negatives || []).map((n) => `<tr><td>${esc(n.text)}</td><td>Negative ${n.match}</td><td><button class="icon-btn" data-neg-del="${n.id}">✕</button></td></tr>`).join("")
        || `<tr><td colspan="3" class="muted">Koi negative keyword nahi.</td></tr>`}</tbody></table></div>`;
  document.getElementById("neg-add").addEventListener("click", () => {
    const text = normalizeQuery(document.getElementById("neg-text").value);
    if (text.length < 2) return;
    updateCampaign(c.id, (x) => { x.negatives = x.negatives || []; x.negatives.push({ id: uid("NK"), text, match: document.getElementById("neg-match").value }); });
    render();
  });
  body.querySelectorAll("[data-neg-del]").forEach((b) => b.addEventListener("click", () => {
    updateCampaign(c.id, (x) => (x.negatives = x.negatives.filter((n) => n.id !== b.dataset.negDel)));
    render();
  }));
}

function tabTerms(c, body) {
  const terms = Object.entries(c.searchTerms || {}).map(([t, s]) => ({ t, s: derived(s) })).sort((a, b) => b.s.imp - a.s.imp);
  const canKw = c.targeting === "manual" || c.type === "SB";
  body.innerHTML = `
    <h2>Search terms</h2>
    <p class="muted">Customers ne ye search kiya aur aapka ad dikha. Bikne wale terms ko keyword banao; bekaar terms ko negative.</p>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Customer search term</th>${METRIC_HEADS}<th>Actions</th></tr></thead>
      <tbody>${terms.map(({ t, s }) => `<tr><td><strong>${esc(t)}</strong></td>${metricCells(s)}
        <td class="row-actions">
          ${canKw ? `<button class="btn-sm btn-outline" data-term-kw="${esc(t)}">+ Keyword</button>` : ""}
          <button class="btn-sm btn-outline" data-term-neg="${esc(t)}">+ Negative</button>
        </td></tr>`).join("") || `<tr><td colspan="10" class="muted">Abhi koi search term nahi. Jab customers search karenge aur ad dikhega, yahan aayega.</td></tr>`}</tbody>
    </table></div>${lifetimeNote}`;
  body.querySelectorAll("[data-term-kw]").forEach((b) => b.addEventListener("click", () => {
    const text = b.dataset.termKw;
    updateCampaign(c.id, (x) => {
      if (!x.keywords.some((k) => k.text === text && k.match === "exact" && k.state !== "archived"))
        x.keywords.push({ id: uid("KW"), text, match: "exact", bid: suggestedBid(text).mid, state: "enabled", stats: emptyStats() });
    });
    showToast(`"${text}" exact keyword add hua ✓`);
    render();
  }));
  body.querySelectorAll("[data-term-neg]").forEach((b) => b.addEventListener("click", () => {
    const text = b.dataset.termNeg;
    updateCampaign(c.id, (x) => { x.negatives = x.negatives || []; if (!x.negatives.some((n) => n.text === text)) x.negatives.push({ id: uid("NK"), text, match: "exact" }); });
    showToast(`"${text}" negative add hua ✓`);
    render();
  }));
}

function tabPlacements(c, body) {
  const keys = c.type === "SB" ? ["top"] : Object.keys(PLACEMENTS);
  body.innerHTML = `
    <h2>Placements</h2>
    <p class="muted">Aapka ad website par kahan dikha aur kahan se bikri hui.</p>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Placement</th>${METRIC_HEADS}<th class="num">ROAS</th></tr></thead>
      <tbody>${keys.map((k) => { const s = derived((c.placementStats || {})[k] || emptyStats());
        return `<tr><td><strong>${PLACEMENTS[k]}</strong></td>${metricCells(s)}<td class="num">${ratio(s.roas)}</td></tr>`; }).join("")}</tbody>
    </table></div>${lifetimeNote}`;
}

function tabSettings(c, body) {
  body.innerHTML = `
    <form id="camp-settings" class="checkout-form" novalidate>
      <h2>Campaign settings</h2>
      <div class="form-grid">
        <label class="full">Campaign name <input name="name" value="${esc(c.name)}" maxlength="80" /></label>
        <label>Start date <input name="start" type="date" value="${dateInput(c.startAt)}" ${Date.now() >= c.startAt ? "disabled" : ""} />
          ${Date.now() >= c.startAt ? `<small class="hint">Campaign shuru ho chuka hai</small>` : ""}</label>
        <label>End date <input name="end" type="date" value="${dateInput(c.endAt)}" /></label>
        <label>Daily budget (₹) <input name="dailyBudget" type="number" min="${AD_MIN_DAILY_BUDGET}" step="10" value="${c.dailyBudget}" /></label>
        <label>Default bid (₹) <input name="defaultBid" type="number" min="${AD_MIN_BID}" max="${AD_MAX_BID}" step="0.5" value="${c.defaultBid}" /></label>
        ${c.type === "SB" ? `<label class="full">Headline <input name="headline" value="${esc(c.headline)}" maxlength="50" /></label>` : ""}
      </div>
      <small class="err" id="settings-err"></small>
      <div class="modal-actions" style="justify-content:flex-start"><button class="btn" type="submit">Save changes</button></div>
    </form>
    <div class="danger-zone settings-danger">
      <h2>Archive campaign</h2>
      <p class="muted">Archive karne par campaign hamesha ke liye band ho jayega (report dekhi ja sakti hai).</p>
      <button class="btn btn-danger" id="archive" ${c.state === "archived" ? "disabled" : ""}>${c.state === "archived" ? "Archived" : "Archive"}</button>
    </div>`;

  const f = document.getElementById("camp-settings");
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = (n) => (f.elements[n] ? f.elements[n].value.trim() : "");
    const budget = Number(v("dailyBudget")), bid = Number(v("defaultBid"));
    const startAt = f.elements.start.disabled ? c.startAt : parseDateInput(v("start"), false);
    const endAt = parseDateInput(v("end"), true);
    let err = "";
    if (v("name").length < 3) err = "Naam daalein";
    else if (!(budget >= AD_MIN_DAILY_BUDGET)) err = `Daily budget kam se kam ₹${AD_MIN_DAILY_BUDGET}`;
    else if (!(bid >= AD_MIN_BID && bid <= AD_MAX_BID)) err = `Bid ₹${AD_MIN_BID}–₹${AD_MAX_BID}`;
    else if (!startAt) err = "Start date chuno";
    else if (endAt && endAt < startAt) err = "End date start ke baad honi chahiye";
    else if (c.type === "SB" && v("headline").length < 5) err = "Headline likhein";
    document.getElementById("settings-err").textContent = err;
    if (err) return;
    updateCampaign(c.id, (x) => {
      x.name = v("name"); x.dailyBudget = Math.round(budget); x.defaultBid = bid;
      x.startAt = startAt; x.endAt = endAt;
      if (x.type === "SB") x.headline = v("headline");
    });
    showToast("Settings saved ✓");
    render();
  });
  document.getElementById("archive").addEventListener("click", () => {
    if (!confirm("Campaign archive karna hai? Ye dobara enable nahi hoga.")) return;
    updateCampaign(c.id, (x) => (x.state = "archived"));
    showToast("Campaign archived");
    location.hash = "ads";
  });
}
