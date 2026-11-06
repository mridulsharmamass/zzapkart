// =====================================================================
// Seller → Brand Store builder (sirf Premium plan)
// Seller ki apni mini website: logo, banners (carousel), featured products,
// collections, about + policy. Draft apne-aap save hota hai; "Publish" karne
// par buyers ko dikhta hai (store.html?s=<slug>).
// Routes: #store  #store/branding  #store/design  #store/banners  #store/products  #store/pages
// =====================================================================
const SB_TABS = [["branding", "🪪 Branding"], ["design", "🎨 Design"], ["banners", "🖼️ Banners"], ["products", "📦 Products & Collections"], ["pages", "📄 Pages"]];
const SB_MENU_PAGES = 3; // header menu me max pages
let sbPrevTimer = null;
const SB_RETURN_ORDER = ["7", "10", "30", "0"];
const sbClone = (x) => JSON.parse(JSON.stringify(x));
const sbImg = {}; // banner id → data URL (IndexedDB se ek baar load)
let SB = null;     // { draft, tab, tried }
let sbTimer = null;

function sbListings() {
  return listingsOfSeller(me.id).filter((l) => l.status !== "archived" && l.status !== "blocked");
}
function sbLiveIds() {
  return new Set(sbListings().filter(isListingLive).map((l) => l.id));
}
function sbFullUrl(slug) {
  return new URL(storeUrl(slug), location.href).href;
}

function sbDefault() {
  const base = slugify(me.shopName || me.name || "my-store").slice(0, 26).replace(/-+$/, "") || "store";
  const root = base.length >= 3 ? base : base + "-store";
  let slug = root;
  for (let n = 2; storeSlugTaken(slug, me.id); n++) slug = `${root}-${n}`;
  return {
    name: String(me.shopName || "").slice(0, 40), slug, tagline: "", about: "", theme: "purple",
    logo: "", banners: [], featured: [], collections: [], showNew: true, returnDays: "7",
  };
}

function sbLoad() {
  const st = me.store || {};
  const d = sbClone(st.draft || st.live || sbDefault());
  const ids = new Set(sbListings().map((l) => l.id));
  d.banners = d.banners || [];
  d.featured = (d.featured || []).filter((id) => ids.has(id));
  d.collections = (d.collections || []).map((c) => ({ ...c, productIds: (c.productIds || []).filter((id) => ids.has(id)) }));
  return d;
}

// ---------------------------------------------------------------------
// Save (draft) — har change ke 400ms baad
// ---------------------------------------------------------------------
function sbPersist() {
  clearTimeout(sbTimer);
  sbTimer = null;
  if (!SB) return;
  refreshMe();
  if (updateSeller(me.id, { store: { ...(me.store || {}), draft: SB.draft, updatedAt: Date.now() } })) refreshMe();
  const el = document.getElementById("sb-saved");
  if (el) el.textContent = "✓ Draft saved " + new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function sbChanged() {
  clearTimeout(sbTimer);
  sbTimer = setTimeout(sbPersist, 400);
  sbSide();
  sbShowErrors();
  const el = document.getElementById("sb-saved");
  if (el) el.textContent = "Saving…";
}

// ---------------------------------------------------------------------
// Validation: errors (publish rokte hain) + recommendations
// ---------------------------------------------------------------------
function sbChecks(d) {
  const E = [], W = [];
  const err = (k, msg, missing = false) => E.push({ k, msg, missing });
  const live = sbLiveIds();
  const name = String(d.name || "").trim();
  if (!name) err("name", "Store name daalein", true);
  else if (name.length < 3) err("name", "Store name kam se kam 3 characters ka ho");
  else if (/zzapkart/i.test(name)) err("name", "Store name me 'Zzapkart' nahi aa sakta");
  else if (CONTACT_RE.test(name)) err("name", "Store name me phone, email ya website allowed nahi");
  if (!STORE_SLUG_RE.test(d.slug)) err("slug", "URL 3–30 characters ka ho: sirf a-z, 0-9 aur '-' (shuru ya ant me '-' nahi)");
  else if (storeSlugTaken(d.slug, me.id)) err("slug", "Ye URL kisi aur store ka hai ya reserved hai — doosra chunein");
  if (CONTACT_RE.test(d.tagline || "")) err("tagline", "Tagline me phone, email ya website allowed nahi");
  if (CONTACT_RE.test(d.about || "")) err("about", "About me phone, email ya website allowed nahi");
  if (!d.logo) err("logo", "Logo upload karein", true);
  if (!d.banners.length) err("banners", "Kam se kam 1 banner lagayein", true);
  d.banners.forEach((b) => {
    const k = "banner-" + b.id;
    if (CONTACT_RE.test(`${b.headline} ${b.sub} ${b.cta}`)) err(k, "Banner text me phone, email ya website allowed nahi");
    if (String(b.link).startsWith("c:") && !d.collections.some((c) => "c:" + c.id === b.link)) err(k, "Is banner ki collection delete ho gayi — naya link chunein");
    if (String(b.link).startsWith("p:") && !live.has(Number(b.link.slice(2)))) err(k, "Is banner ka product abhi live nahi — doosra link chunein");
    if (String(b.link).startsWith("pg:") && !(d.pages || []).some((pg) => "pg:" + pg.id === b.link)) err(k, "Is banner ka page delete ho gaya — naya link chunein");
  });
  const seen = new Set();
  d.collections.forEach((c) => {
    const k = "coll-" + c.id;
    const n = String(c.name || "").trim().toLowerCase();
    if (n.length < 2) err(k, "Collection ka naam daalein (2–30 characters)");
    else if (seen.has(n)) err(k, "Do collections ka naam same nahi ho sakta");
    else if (CONTACT_RE.test(c.name)) err(k, "Naam me phone, email ya website allowed nahi");
    seen.add(n);
    if (!c.productIds.length) err(k, "Collection me kam se kam 1 product daalein");
  });
  if (!live.size) err("products", "Store ke liye kam se kam 1 live product chahiye (QC pass + in stock)", true);

  // Design + pages
  const ds = storeDesign(d);
  if (CONTACT_RE.test(ds.announce)) err("announce", "Announcement me phone, email ya website allowed nahi");
  const pages = d.pages || [];
  const slugs = new Set();
  pages.forEach((pg) => {
    const k = "page-" + pg.id;
    const title = String(pg.title || "").trim();
    const body = String(pg.body || "").trim();
    const slug = storePageSlug(pg);
    if (title.length < 2) err(k, "Page ka title daalein (2–40 characters)");
    else if (slugs.has(slug)) err(k, "Do pages ka title same nahi ho sakta");
    else if (CONTACT_RE.test(title)) err(k, "Title me phone, email ya website allowed nahi");
    slugs.add(slug);
    if (body.length < 20) err(k, "Page me kam se kam 20 characters likhein");
    else if (CONTACT_RE.test(body)) err(k, "Page me phone number, email ya website link allowed nahi — buyers Zzapkart support / chat se contact karte hain");
  });
  if (pages.filter((pg) => pg.menu).length > SB_MENU_PAGES) err("pages-menu", `Header menu me max ${SB_MENU_PAGES} pages — baaki footer me dikhenge`);

  if (String(d.about || "").trim().length < 30) W.push({ k: "about", msg: "About section likhein (30+ characters)" });
  if (!pages.length) W.push({ k: "pages", msg: "Privacy / Return policy jaise pages banayein" });
  if (!d.featured.length) W.push({ k: "featured", msg: "Featured products chunein" });
  if (!d.collections.length) W.push({ k: "collections", msg: "Kam se kam 1 collection banayein" });
  const notLive = new Set(d.featured.concat(...d.collections.map((c) => c.productIds)).filter((id) => !live.has(id)));
  if (notLive.size) W.push({ k: "notlive", msg: `${notLive.size} chune hue product abhi live nahi — live hote hi store par dikhenge` });
  return { E, W };
}

function sbStatus() {
  const st = me.store || {};
  const differs = !st.live || JSON.stringify(st.live) !== JSON.stringify(SB.draft);
  if (st.published && st.live) return differs ? ["Live · unpublished changes", "s-pending", differs] : ["Live", "s-live", differs];
  if (st.live) return ["Offline", "s-paused", differs];
  return ["Draft — publish nahi hua", "s-completed", differs];
}

function sbShowErrors() {
  const page = document.getElementById("sb-page");
  if (!page || !SB) return;
  const { E } = sbChecks(SB.draft);
  const shown = (x) => !x.missing || SB.tried;
  page.querySelectorAll("[data-err]").forEach((el) => {
    const e = E.find((x) => x.k === el.dataset.err && shown(x));
    el.textContent = e ? e.msg : "";
  });
  page.querySelectorAll("[data-sb]").forEach((inp) => inp.classList.toggle("invalid", E.some((x) => x.k === inp.dataset.sb && shown(x))));
  const hint = document.getElementById("sb-slug-hint");
  if (hint) hint.textContent = E.some((x) => x.k === "slug") ? "" : "✓ Available · " + sbFullUrl(SB.draft.slug);
}

// ---------------------------------------------------------------------
// Images (banners IndexedDB me)
// ---------------------------------------------------------------------
function sbLoadImgs(scope) {
  scope.querySelectorAll("img[data-banner-img]").forEach((img) => {
    const id = img.dataset.bannerImg;
    if (sbImg[id]) { img.src = sbImg[id]; return; }
    MediaDB.get(storeBannerKey(id)).then((data) => {
      if (!safeImg(data)) return;
      sbImg[id] = data;
      img.src = data;
    });
  });
}
// In banners ko ab koi (draft ya live) use nahi karta → IndexedDB se hatao
function sbGcBanners(candidates) {
  const st = me.store || {};
  const keep = new Set([...((st.draft && st.draft.banners) || []), ...((st.live && st.live.banners) || [])].map((b) => b.id));
  (candidates || []).forEach((b) => {
    if (keep.has(b.id)) return;
    MediaDB.del(storeBannerKey(b.id));
    delete sbImg[b.id];
  });
}

async function sbUploadLogo(file) {
  const errEl = document.querySelector('#sb-page [data-err="logo"]');
  if (errEl) errEl.textContent = "Processing…";
  try {
    const r = await processStoreLogo(file);
    SB.draft.logo = r.data;
    sbPersist();
    sbRenderMain();
    sbSide();
    showToast(["Logo upload ho gaya ✓", r.fitted && "poora logo square me fit kiya", r.lowRes && "500×500 px ho to aur saaf dikhega"].filter(Boolean).join(" · "));
  } catch (e) {
    if (errEl) errEl.textContent = e.message;
    showToast(e.message);
  }
}

async function sbUploadBanner(file) {
  const errEl = document.querySelector('#sb-page [data-err="banners"]');
  if (SB.draft.banners.length >= STORE_LIMITS.banners) return showToast(`Max ${STORE_LIMITS.banners} banners`);
  if (errEl) errEl.textContent = "Processing…";
  try {
    const r = await processStoreBanner(file);
    if (!(await MediaDB.put(storeBannerKey(r.id), r.data))) throw new Error("Banner save nahi ho paya (browser storage). Dobara try karein.");
    sbImg[r.id] = r.data;
    SB.draft.banners.push({ id: r.id, headline: "", sub: "", cta: "Shop now", link: "all", tone: "light", w: r.w, h: r.h });
    sbPersist();
    sbRenderMain();
    sbSide();
    showToast(["Banner add ho gaya ✓", r.fitted ? "poori photo banner me fit ki (kuch kata nahi)" : r.cropped && "3:1 me thoda crop kiya", r.lowRes && "1500×500 px ho to aur saaf dikhega"].filter(Boolean).join(" · "));
  } catch (e) {
    if (errEl) errEl.textContent = e.message;
    showToast(e.message);
  }
}

// ---------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------
function sbBrandingHTML(d) {
  return `
  <section class="panel">
    <h2>Store identity</h2>
    <div class="form-grid">
      <label>Store name *
        <input data-sb="name" value="${esc(d.name)}" maxlength="40" />
        <small class="hint">Store ke upar bada dikhega · 3–40 characters</small>
        <small class="err" data-err="name"></small>
      </label>
      <label>Store URL *
        <span class="sb-url"><span>store.html?s=</span><input data-sb="slug" value="${esc(d.slug)}" maxlength="30" autocomplete="off" spellcheck="false" /></span>
        <small class="hint sb-slug-hint" id="sb-slug-hint"></small>
        <small class="err" data-err="slug"></small>
      </label>
      <label class="full"><span>Tagline <span class="muted">(optional)</span></span>
        <input data-sb="tagline" value="${esc(d.tagline)}" maxlength="60" placeholder="Jaise: Everyday comfort, made in India" />
        <small class="err" data-err="tagline"></small>
      </label>
      <label class="full">About your store
        <textarea data-sb="about" rows="5" maxlength="600" placeholder="Aapka brand kya banata hai, kis cheez me khaas hai, kab se kaam kar rahe ho…">${esc(d.about)}</textarea>
        <small class="hint"><span id="sb-about-count">${String(d.about || "").length}</span>/600 · Phone, email ya website link allowed nahi</small>
        <small class="err" data-err="about"></small>
      </label>
    </div>
  </section>

  <section class="panel">
    <h2>Logo *</h2>
    <div class="sb-logo-row">
      <div class="sb-logo-prev">${safeImg(d.logo) ? `<img src="${safeImg(d.logo)}" alt="Store logo" />` : `<span>${esc(storeInitials(d.name))}</span>`}</div>
      <div class="sb-logo-info">
        <div class="row-actions">
          <button type="button" class="btn btn-sm" data-sb-act="pick-logo">${d.logo ? "Change logo" : "⬆ Upload logo"}</button>
          ${d.logo ? `<button type="button" class="btn btn-sm btn-outline" data-sb-act="del-logo">Remove</button>` : ""}
        </div>
        <ul class="sb-rules">
          <li><strong>Koi bhi size chalegi</strong> — square (500×500 px) best</li>
          <li>JPG, PNG, WEBP… · 1 GB tak · transparent PNG best</li>
          <li>Square na ho to poora logo square me fit ho jayega (kuch katega nahi)</li>
        </ul>
        <small class="err" data-err="logo"></small>
      </div>
    </div>
  </section>

  <section class="panel">
    <h2>Store policy</h2>
    <div class="form-grid">
      <label>Return policy
        <select data-sb="returnDays">${SB_RETURN_ORDER.map((v) => `<option value="${v}" ${String(d.returnDays) === v ? "selected" : ""}>${STORE_RETURNS[v]}</option>`).join("")}</select>
        <small class="hint">Store par har jagah dikhegi · poori policy <a class="link" href="#store/pages">📄 Pages</a> me likhein</small>
      </label>
    </div>
  </section>
  <p class="muted sb-next-tip">🎨 Theme colour, font, buttons aur layout → <a class="link" href="#store/design">Design tab</a></p>`;
}

// ---------------------------------------------------------------------
// 🎨 Design tab: colour (preset ya apna), font, buttons, header, grid, announcement, homepage sections
// ---------------------------------------------------------------------
function sbDefaultAnnounce(d) {
  return `🚚 ₹${FREE_DELIVERY_MIN}+ par FREE delivery · ↩️ ${STORE_RETURNS[d.returnDays] || STORE_RETURNS[7]} · 💵 Cash on Delivery available`;
}
function sbSetDesign(k, v) {
  const d = SB.draft;
  d.design = { ...storeDesign(d), [k]: v };
}
// Builder ka live preview: CSS variables + samples
function sbApplyPreview() {
  const page = document.getElementById("sb-page");
  if (!page || !SB) return;
  applyStoreVars(page, SB.draft);
  const pal = storePalette(SB.draft);
  const note = document.getElementById("sb-color-note");
  if (note) note.textContent = pal.light ? "Halka rang hai — buttons par text kaala dikhega aur links thode gehre, taaki sab padhne me saaf rahe." : "";
  const ds = storeDesign(SB.draft);
  const hp = document.getElementById("sbd-header-prev");
  if (hp) hp.className = "sbd-head-prev head-" + ds.header;
  const ann = document.getElementById("sbd-ann-prev");
  if (ann) { ann.textContent = ds.announce || sbDefaultAnnounce(SB.draft); ann.classList.toggle("off", !ds.announceOn); }
}

function sbDesignHTML(d) {
  const ds = storeDesign(d);
  const fill = storeTheme(d);
  const custom = d.theme === "custom";
  const radio = (name, val, cur, inner, cls = "") => `<label class="sbd-opt ${cls}"><input type="radio" name="sbd-${name}" data-sbd="${name}" value="${val}" ${String(cur) === String(val) ? "checked" : ""} />${inner}</label>`;
  return `
  <section class="panel">
    <h2>Theme colour</h2>
    <p class="muted">Buttons, links, announcement bar, badges aur highlights is rang me dikhenge.</p>
    <div class="sb-themes">${Object.entries(STORE_THEMES).map(([k, t]) => `
      <button type="button" class="sb-theme ${d.theme === k ? "active" : ""}" data-sb-act="theme" data-theme="${k}" style="--c:${t.color}" aria-pressed="${d.theme === k}"><i></i>${t.label}</button>`).join("")}
      <span class="sb-theme sb-theme-custom ${custom ? "active" : ""}"><i style="--c:${fill}"></i>Apna rang
        <input type="color" data-sbd-color="1" value="${fill}" aria-label="Apna theme colour chunein" /></span>
    </div>
    <div class="sbd-hex-row">
      <label>Hex code <input data-sbd-hex="1" value="${fill}" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Theme colour hex code" /></label>
      <small class="err" data-err="color"></small>
    </div>
    <div class="sbd-sample" aria-label="Preview">
      <span class="sbd-btn">Add to cart</span>
      <span class="sbd-btn alt">Buy it now</span>
      <span class="sbd-link">View all →</span>
      <span class="sbd-badge">New</span>
    </div>
    <small class="hint" id="sb-color-note"></small>
  </section>

  <section class="panel">
    <h2>Font</h2>
    <div class="sbd-grid">${Object.entries(STORE_FONTS).map(([k, f]) => {
      loadStoreFont(k);
      const fam = f.head ? `font-family:${f.head.replace(/'/g, "&#39;")}, sans-serif` : "";
      return radio("font", k, ds.font, `<span class="sbd-font-sample" style="${fam}">Aa ${esc(d.name || "Brand")}</span><small>${esc(f.label)}</small>`);
    }).join("")}</div>
  </section>

  <section class="panel">
    <h2>Buttons</h2>
    <div class="sbd-grid three">${Object.entries(STORE_BUTTONS).map(([k, b]) =>
      radio("buttons", k, ds.buttons, `<span class="sbd-btn" style="border-radius:${b.r}">Shop now</span><small>${b.label}</small>`)).join("")}</div>
  </section>

  <section class="panel">
    <h2>Header style</h2>
    <div class="sbd-grid three">${Object.entries(STORE_HEADERS).map(([k, l]) =>
      radio("header", k, ds.header, `<span class="sbd-head-mini head-${k}"><i></i><b></b><b></b><b></b></span><small>${l}</small>`)).join("")}</div>
    <div class="sbd-head-prev head-${ds.header}" id="sbd-header-prev" aria-hidden="true">
      <span class="sbd-hp-logo">${safeImg(d.logo) ? `<img src="${safeImg(d.logo)}" alt="" />` : esc(storeInitials(d.name))}</span>
      <strong>${esc(d.name || "Store name")}</strong>
      <span class="sbd-hp-nav"><span>Home</span><span>Shop all</span><span>About</span></span>
    </div>
  </section>

  <section class="panel">
    <h2>Product grid</h2>
    <p class="muted">Computer par ek line me kitne products (mobile par hamesha 2).</p>
    <div class="sbd-grid three">${STORE_COLS.map((n) =>
      radio("cols", n, ds.cols, `<span class="sbd-cols">${"<i></i>".repeat(n)}</span><small>${n} per row</small>`)).join("")}</div>
  </section>

  <section class="panel">
    <h2>Announcement bar</h2>
    <label class="check"><input type="checkbox" data-sbd-check="announceOn" ${ds.announceOn ? "checked" : ""} /> Store ke sabse upar announcement bar dikhao</label>
    <div class="form-grid">
      <label class="full"><span>Text <span class="muted">(khaali chhodo to default)</span></span>
        <input data-sbd-text="announce" value="${esc(ds.announce)}" maxlength="90" placeholder="${esc(sbDefaultAnnounce(d))}" />
        <small class="hint">Jaise: "🎉 Diwali Sale — sab par 20% tak off" · 90 characters tak</small>
        <small class="err" data-err="announce"></small>
      </label>
    </div>
    <div class="sbd-ann-prev ${ds.announceOn ? "" : "off"}" id="sbd-ann-prev">${esc(ds.announce || sbDefaultAnnounce(d))}</div>
  </section>

  <section class="panel">
    <h2>Homepage sections</h2>
    <p class="muted">Store ke home page par kaun se sections, kis order me. Banners hamesha sabse upar.</p>
    <ul class="sbd-secs">${ds.sections.map((s, i) => `
      <li class="${s.on ? "" : "off"}">
        <label class="check"><input type="checkbox" data-sbd-sec="${s.k}" ${s.on ? "checked" : ""} /> ${esc(STORE_SECTIONS[s.k])}</label>
        <button type="button" class="icon-mini" data-sb-act="sec-up" data-i="${i}" ${i === 0 ? "disabled" : ""} title="Upar" aria-label="${esc(STORE_SECTIONS[s.k])} upar">↑</button>
        <button type="button" class="icon-mini" data-sb-act="sec-down" data-i="${i}" ${i === ds.sections.length - 1 ? "disabled" : ""} title="Neeche" aria-label="${esc(STORE_SECTIONS[s.k])} neeche">↓</button>
      </li>`).join("")}</ul>
  </section>`;
}

// ---------------------------------------------------------------------
// 📄 Pages tab: Privacy Policy, Terms, Shipping, Returns, FAQ, Contact… (templates ya blank)
// ---------------------------------------------------------------------
function sbPagesHTML(d) {
  const pages = d.pages || [];
  const used = new Set(pages.map((p) => p.tpl).filter(Boolean));
  const full = pages.length >= STORE_PAGE_LIMIT;
  return `
  <section class="panel">
    <div class="panel-head"><h2>📄 Store pages (${pages.length}/${STORE_PAGE_LIMIT})</h2></div>
    <p class="muted">Apne store ke policy aur info pages khud banao. Saare pages store ke <strong>footer</strong> me dikhenge; chaho to <strong>header menu</strong> me bhi (max ${SB_MENU_PAGES}).</p>
    <div class="sb-tpl-row">
      <span class="small"><strong>Ready template se shuru karo:</strong></span>
      ${Object.entries(STORE_PAGE_TEMPLATES).filter(([k]) => !used.has(k)).map(([k, t]) => `<button type="button" class="chip" data-sb-act="page-tpl" data-tpl="${k}" ${full ? "disabled" : ""}>+ ${esc(t.label)}</button>`).join("")}
      <button type="button" class="chip" data-sb-act="page-add" ${full ? "disabled" : ""}>+ Blank page</button>
    </div>
    <small class="err" data-err="pages-menu"></small>
    <details class="sb-fmt-help"><summary>✍️ Formatting kaise karein?</summary>
      <table class="table small"><tbody>
        <tr><td><code>## Heading</code></td><td>Bada heading</td></tr>
        <tr><td><code>### Sub-heading</code></td><td>Chhota heading</td></tr>
        <tr><td><code>- point</code></td><td>Bullet list</td></tr>
        <tr><td><code>1. step</code></td><td>Numbered list</td></tr>
        <tr><td><code>**zaroori**</code></td><td><strong>Bold</strong> text</td></tr>
        <tr><td>Khaali line</td><td>Naya paragraph</td></tr>
      </tbody></table>
      <p class="small muted">Phone number, email aur website link allowed nahi — buyers Zzapkart chat / support se contact karte hain.</p>
    </details>
  </section>
  ${pages.map((pg, i) => `
  <section class="panel sb-pg" data-pid="${esc(pg.id)}">
    <div class="sb-pg-head">
      <span class="sb-pg-no">${i + 1}</span>
      <input data-sbp="title" value="${esc(pg.title)}" maxlength="40" placeholder="Page ka title (jaise Privacy Policy)" aria-label="Page ${i + 1} ka title" />
      <button type="button" class="icon-mini" data-sb-act="page-up" data-i="${i}" ${i === 0 ? "disabled" : ""} title="Upar" aria-label="Upar">↑</button>
      <button type="button" class="icon-mini" data-sb-act="page-down" data-i="${i}" ${i === pages.length - 1 ? "disabled" : ""} title="Neeche" aria-label="Neeche">↓</button>
      <button type="button" class="icon-mini danger" data-sb-act="page-del" data-i="${i}" title="Page delete karo" aria-label="Page delete karo">🗑</button>
    </div>
    <small class="hint sb-pg-link">Link: store.html?s=${esc(d.slug)}#page/<span data-pv="slug">${esc(storePageSlug(pg))}</span></small>
    <small class="err" data-err="page-${esc(pg.id)}"></small>
    <div class="sb-pg-edit">
      <label>Content
        <textarea data-sbp="body" rows="14" maxlength="${STORE_PAGE_MAX}" placeholder="Yahan likhein…">${esc(pg.body)}</textarea>
        <small class="hint"><span data-pv="count">${String(pg.body || "").length}</span>/${STORE_PAGE_MAX}</small>
      </label>
      <div class="sb-pg-prev"><span class="sb-pg-prev-tag">Preview</span><div class="sh-rich" data-pv="body">${storeRichText(pg.body)}</div></div>
    </div>
    <label class="check"><input type="checkbox" data-sbp-check="menu" ${pg.menu ? "checked" : ""} /> Header menu me bhi dikhao <span class="muted">(footer me hamesha dikhega)</span></label>
  </section>`).join("")}
  ${pages.length ? "" : `<div class="panel sb-empty-note"><p class="muted">Abhi koi page nahi. Upar se template chunein — Privacy Policy aur Return Policy se shuru karna achha hai.</p></div>`}`;
}

function sbAddPage(tplKey) {
  const d = SB.draft;
  d.pages = d.pages || [];
  if (d.pages.length >= STORE_PAGE_LIMIT) return showToast(`Max ${STORE_PAGE_LIMIT} pages`);
  const t = tplKey ? storePageTemplate(tplKey, d, me) : null;
  d.pages.push({ id: uid("PG"), title: t ? t.title : "", body: t ? t.body : "", menu: false, tpl: tplKey || "" });
  sbChanged();
  sbRenderMain();
  const cards = document.querySelectorAll("#sb-main .sb-pg");
  const last = cards[cards.length - 1];
  if (last) {
    last.scrollIntoView({ behavior: "smooth", block: "start" });
    last.querySelector(t ? "textarea" : "input").focus({ preventScroll: true });
  }
  showToast(t ? `"${t.title}" page ban gaya — apne hisaab se edit karein` : "Naya page — title aur content likhein");
}

function sbLinkOptions(d, cur) {
  const opt = (v, l) => `<option value="${esc(v)}" ${cur === v ? "selected" : ""}>${esc(l)}</option>`;
  const live = sbListings().filter(isListingLive);
  return opt("all", "All products") +
    (d.collections.length ? `<optgroup label="Collection">${d.collections.map((c) => opt("c:" + c.id, c.name || "(naam nahi)")).join("")}</optgroup>` : "") +
    (live.length ? `<optgroup label="Product">${live.map((p) => opt("p:" + p.id, p.name)).join("")}</optgroup>` : "") +
    ((d.pages || []).length ? `<optgroup label="Page">${d.pages.map((p) => opt("pg:" + p.id, p.title || "(title nahi)")).join("")}</optgroup>` : "") +
    opt("none", "Kahin nahi (sirf image)");
}

function sbBannerCard(d, b, i) {
  const tone = b.tone === "dark" ? "dark" : "light";
  return `
  <div class="sb-banner" data-bid="${esc(b.id)}">
    <div class="sb-banner-img tone-${tone}">
      <img data-banner-img="${esc(b.id)}" alt="Banner ${i + 1}" />
      <span class="sb-bn-num">#${i + 1}</span>
      <div class="bs-slide-text">
        <h2 data-pv="headline">${esc(b.headline)}</h2>
        <p data-pv="sub">${esc(b.sub)}</p>
        <span class="bs-cta ${b.cta && b.link !== "none" ? "" : "hidden"}" data-pv="cta">${esc(b.cta)}</span>
      </div>
    </div>
    <div class="form-grid">
      <label><span>Headline <span class="muted">(optional)</span></span>
        <input data-sbb="headline" value="${esc(b.headline)}" maxlength="40" placeholder="Summer Collection" /></label>
      <label><span>Sub-text <span class="muted">(optional)</span></span>
        <input data-sbb="sub" value="${esc(b.sub)}" maxlength="80" placeholder="Naye styles, naye rang" /></label>
      <label>Button text
        <input data-sbb="cta" value="${esc(b.cta)}" maxlength="20" placeholder="Shop now" /></label>
      <label>Click karne par kahan jaye
        <select data-sbb="link">${sbLinkOptions(d, b.link)}</select></label>
      <label>Text ka rang
        <select data-sbb="tone">
          <option value="light" ${tone === "light" ? "selected" : ""}>Safed text (dark image par)</option>
          <option value="dark" ${tone === "dark" ? "selected" : ""}>Kaala text (light image par)</option>
        </select></label>
    </div>
    <small class="err" data-err="banner-${esc(b.id)}"></small>
    <div class="row-actions">
      <button type="button" class="btn btn-sm btn-outline" data-sb-act="banner-up" data-i="${i}" ${i === 0 ? "disabled" : ""}>↑ Upar</button>
      <button type="button" class="btn btn-sm btn-outline" data-sb-act="banner-down" data-i="${i}" ${i === d.banners.length - 1 ? "disabled" : ""}>↓ Neeche</button>
      <button type="button" class="btn btn-sm btn-danger" data-sb-act="banner-del" data-i="${i}">🗑 Remove</button>
    </div>
  </div>`;
}

function sbBannersHTML(d) {
  const n = d.banners.length;
  return `
  <section class="panel">
    <div class="panel-head"><h2>Banners (${n}/${STORE_LIMITS.banners})</h2>
      <button type="button" class="btn btn-sm" data-sb-act="pick-banner" ${n >= STORE_LIMITS.banners ? "disabled" : ""}>+ Add banner</button></div>
    <ul class="sb-rules">
      <li><strong>Koi bhi size chalegi</strong> — 1500×500 px (3:1) best</li>
      <li>Lambi (landscape) photo beech se 3:1 me aati hai; square / portrait photo poori dikhegi, peeche usi ki blur photo · 1 GB tak</li>
      <li>Store ke upar slideshow me har 5 second me badlenge · max ${STORE_LIMITS.banners}</li>
    </ul>
    <small class="err" data-err="banners"></small>
    ${n ? d.banners.map((b, i) => sbBannerCard(d, b, i)).join("") : `
      <button type="button" class="sb-drop" data-sb-act="pick-banner"><span>🖼️</span><strong>Pehla banner upload karein</strong><small>1500×500 px · JPG / PNG</small></button>`}
  </section>`;
}

function sbTarget(target) {
  if (target === "featured") return { arr: SB.draft.featured, max: STORE_LIMITS.featured, title: "Featured products chunein" };
  const c = SB.draft.collections.find((x) => "c:" + x.id === target);
  return c ? { arr: c.productIds, max: STORE_LIMITS.perCollection, title: `"${c.name || "Collection"}" ke products` } : null;
}

function sbChips(ids, target) {
  if (!ids.length) return `<p class="muted sb-empty-note">Koi product nahi chuna.</p>`;
  const byId = new Map(sbListings().map((l) => [l.id, l]));
  return `<div class="sb-chips">${ids.map((id, i) => {
    const L = byId.get(id);
    if (!L) return "";
    const ds = LISTING_STATUS[listingDisplayStatus(L)];
    return `<div class="sb-chip">
      <span class="thumb">${thumbOf(L)}</span>
      <span class="sb-chip-name"><span>${esc(L.name || "(untitled)")}</span><small class="muted">${formatPrice(Number(L.price) || 0)}</small></span>
      <span class="status-pill ${ds.cls}">${ds.label}</span>
      <button type="button" class="icon-mini" data-sb-act="chip-up" data-target="${esc(target)}" data-i="${i}" ${i === 0 ? "disabled" : ""} title="Upar" aria-label="Upar">↑</button>
      <button type="button" class="icon-mini" data-sb-act="chip-down" data-target="${esc(target)}" data-i="${i}" ${i === ids.length - 1 ? "disabled" : ""} title="Neeche" aria-label="Neeche">↓</button>
      <button type="button" class="icon-mini danger" data-sb-act="chip-del" data-target="${esc(target)}" data-i="${i}" title="Hatao" aria-label="Hatao">✕</button>
    </div>`;
  }).join("")}</div>`;
}

function sbProductsHTML(d) {
  const ls = sbListings();
  const live = ls.filter(isListingLive);
  return `
  <section class="panel">
    <div class="panel-head"><h2>Store products</h2>
      <div class="row-actions"><a href="#add-listing" class="btn btn-sm">+ Add new product</a><a href="#bulk" class="btn btn-sm btn-outline">Bulk upload</a></div></div>
    <p>Aapki <strong>${live.length} live</strong> listing(s) store ke <strong>All products</strong> page par apne-aap dikhti hain.
      ${ls.length - live.length ? `<span class="muted">${ls.length - live.length} abhi live nahi (draft / QC / out of stock / inactive) — <a class="link" href="#listings">My Listings</a></span>` : ""}</p>
    <small class="err" data-err="products"></small>
    <p class="small muted">"New arrivals", featured aur collection rows ko home par dikhana / chhupana aur order badalna → <a class="link" href="#store/design">🎨 Design → Homepage sections</a></p>
  </section>

  <section class="panel">
    <div class="panel-head"><h2>⭐ Featured products (${d.featured.length}/${STORE_LIMITS.featured})</h2>
      <button type="button" class="btn btn-sm" data-sb-act="pick-prod" data-target="featured">+ Choose products</button></div>
    <p class="muted">Store home par banner ke theek neeche sabse pehle dikhenge.</p>
    ${sbChips(d.featured, "featured")}
  </section>

  <section class="panel">
    <div class="panel-head"><h2>🗂️ Collections (${d.collections.length}/${STORE_LIMITS.collections})</h2>
      <button type="button" class="btn btn-sm" data-sb-act="coll-add" ${d.collections.length >= STORE_LIMITS.collections ? "disabled" : ""}>+ New collection</button></div>
    <p class="muted">Har collection store ke menu me ek tab banti hai — jaise "Summer Collection", "T-Shirts", "Best Sellers".</p>
    ${d.collections.map((c, i) => `
      <div class="sb-coll" data-cid="${esc(c.id)}">
        <div class="sb-coll-head">
          <input data-sbc="name" data-ci="${i}" value="${esc(c.name)}" maxlength="30" placeholder="Collection ka naam" aria-label="Collection ka naam" />
          <button type="button" class="icon-mini" data-sb-act="coll-up" data-i="${i}" ${i === 0 ? "disabled" : ""} title="Upar" aria-label="Upar">↑</button>
          <button type="button" class="icon-mini" data-sb-act="coll-down" data-i="${i}" ${i === d.collections.length - 1 ? "disabled" : ""} title="Neeche" aria-label="Neeche">↓</button>
          <button type="button" class="icon-mini danger" data-sb-act="coll-del" data-i="${i}" title="Delete collection" aria-label="Delete collection">🗑</button>
        </div>
        <small class="err" data-err="coll-${esc(c.id)}"></small>
        ${sbChips(c.productIds, "c:" + c.id)}
        <button type="button" class="btn btn-sm btn-outline" data-sb-act="pick-prod" data-target="c:${esc(c.id)}">+ Add products (${c.productIds.length}/${STORE_LIMITS.perCollection})</button>
      </div>`).join("") || `<p class="muted sb-empty-note">Abhi koi collection nahi.</p>`}
  </section>`;
}

function sbPickProducts(target) {
  const t = sbTarget(target);
  if (!t) return;
  const ls = sbListings();
  if (!ls.length) { showToast("Pehle product add karein"); location.hash = "#add-listing"; return; }
  const sel = new Set(t.arr.map(String));
  openModal(`
    <div class="modal-head"><h2>${esc(t.title)}</h2><button type="button" class="icon-btn" data-close aria-label="Close">✕</button></div>
    <input type="search" id="sbp-q" class="sbp-q" placeholder="Product search karein" aria-label="Product search" />
    <p class="muted">Max ${t.max} · <strong id="sbp-count">${sel.size}</strong> chune · Jo abhi live nahi, wo live hote hi store par dikhenge</p>
    <div class="pick-list" id="sbp-list">${ls.map((L) => {
      const ds = LISTING_STATUS[listingDisplayStatus(L)];
      return `
      <label class="pick" data-name="${esc(`${L.name} ${L.brand || ""}`.toLowerCase())}">
        <input type="checkbox" value="${esc(L.id)}" ${sel.has(String(L.id)) ? "checked" : ""} />
        <span class="thumb">${thumbOf(L)}</span>
        <span class="pick-info"><strong>${esc(L.name || "(untitled)")}</strong><span class="muted">${formatPrice(Number(L.price) || 0)} · ${ds.label}</span></span>
      </label>`;
    }).join("")}</div>
    <div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button type="button" class="btn" id="sbp-done">Done</button></div>`);
  const box = document.getElementById("modal-box");
  box.querySelector("#sbp-q").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    box.querySelectorAll("#sbp-list .pick").forEach((el) => el.classList.toggle("hidden", !!q && !el.dataset.name.includes(q)));
  });
  box.querySelector("#sbp-list").addEventListener("change", (e) => {
    const cb = e.target;
    if (cb.checked) {
      if (sel.size >= t.max) { cb.checked = false; showToast(`Max ${t.max} products`); return; }
      sel.add(cb.value);
    } else sel.delete(cb.value);
    box.querySelector("#sbp-count").textContent = sel.size;
  });
  box.querySelector("#sbp-done").addEventListener("click", () => {
    const kept = t.arr.filter((id) => sel.has(String(id)));
    const added = ls.map((L) => L.id).filter((id) => sel.has(String(id)) && !kept.includes(id));
    t.arr.splice(0, t.arr.length, ...kept, ...added);
    closeModal();
    sbChanged();
    sbRenderMain();
    showToast("Products update ho gaye ✓");
  });
}

// ---------------------------------------------------------------------
// Sidebar: mini preview, checklist, Preview / Publish
// ---------------------------------------------------------------------
function sbSide() {
  const side = document.getElementById("sb-side");
  if (!side || !SB) return;
  const d = SB.draft;
  const { E, W } = sbChecks(d);
  const live = sbLiveIds();
  const st = me.store || {};
  const [label, cls, differs] = sbStatus();
  const req = [
    ["Store name aur URL", !E.some((x) => ["name", "slug", "tagline", "about"].includes(x.k)), "branding"],
    ["Logo", !!d.logo, "branding"],
    [`Banner (${d.banners.length}/${STORE_LIMITS.banners})`, d.banners.length > 0 && !E.some((x) => x.k.startsWith("banner")), "banners"],
    [`Live products (${live.size})`, live.size > 0, "products"],
  ];
  if (d.collections.length) req.push(["Collections sahi bhari", !E.some((x) => x.k.startsWith("coll-")), "products"]);
  if (E.some((x) => x.k === "announce")) req.push(["Announcement text", false, "design"]);
  if ((d.pages || []).length) req.push([`Pages sahi bhare (${d.pages.length})`, !E.some((x) => x.k.startsWith("page")), "pages"]);
  const rec = [
    ["About section", String(d.about || "").trim().length >= 30, "branding"],
    [`Featured products (${d.featured.length})`, d.featured.length > 0, "products"],
    [`Collections (${d.collections.length})`, d.collections.length > 0, "products"],
    [`Policy pages (${(d.pages || []).length})`, (d.pages || []).length > 0, "pages"],
  ];
  const b0 = d.banners[0];
  const notLive = W.find((w) => w.k === "notlive");
  const ds = storeDesign(d);
  side.innerHTML = `
    <section class="panel sb-side">
      <div class="sb-mini head-${ds.header}" style="--st:${storeTheme(d)}">
        ${ds.announceOn ? `<div class="sb-mini-ann"></div>` : ""}
        <div class="sb-mini-banner">${b0 ? `<img data-banner-img="${esc(b0.id)}" alt="" />` : `<span>Banner</span>`}</div>
        <div class="sb-mini-id">
          <span class="sb-mini-logo">${safeImg(d.logo) ? `<img src="${safeImg(d.logo)}" alt="" />` : esc(storeInitials(d.name))}</span>
          <span class="sb-mini-text"><strong>${esc(d.name || "Store name")}</strong><small>${esc(d.tagline || "Tagline")}</small></span>
        </div>
      </div>
      <div class="sb-status"><span class="status-pill ${cls}">${esc(label)}</span></div>
      <h3>Publish ke liye zaroori</h3>
      <ul class="sb-check">${req.map(([l, ok, tab]) => `<li class="${ok ? "ok" : "bad"}"><a href="#store/${tab}">${esc(l)}</a></li>`).join("")}</ul>
      <h3>Behtar store ke liye</h3>
      <ul class="sb-check">${rec.map(([l, ok, tab]) => `<li class="${ok ? "ok" : "rec"}"><a href="#store/${tab}">${esc(l)}</a></li>`).join("")}</ul>
      ${notLive ? `<p class="small text-warn">${esc(notLive.msg)}</p>` : ""}
      ${SB.tried && E.length ? `<ul class="err-list sb-errs">${E.map((x) => `<li class="err">${esc(x.msg)}</li>`).join("")}</ul>` : ""}
      <a class="btn btn-outline sb-btn" id="sb-preview" href="store.html?preview=1" target="_blank" rel="noopener" data-sb-act="preview">👁 Preview</a>
      <button type="button" class="btn checkout-btn" id="sb-publish" data-sb-act="publish" ${st.published && !differs ? "disabled" : ""}>${st.published ? (differs ? "🚀 Publish changes" : "✓ Published") : "🚀 Publish store"}</button>
      ${st.live && differs ? `<button type="button" class="link-btn" data-sb-act="discard">↺ Draft changes discard karo</button>` : ""}
      ${st.published ? `<button type="button" class="link-btn text-danger" data-sb-act="unpublish">Store offline karo</button>` : ""}
      <p class="small muted" id="sb-saved">Changes apne-aap draft me save hote hain.</p>
    </section>`;
  sbLoadImgs(side);
  const top = document.getElementById("sb-status-top");
  if (top) top.innerHTML = `<span class="status-pill ${cls}">${esc(label)}</span>`;
}

function sbRenderMain() {
  const main = document.getElementById("sb-main");
  if (!main || !SB) return;
  const d = SB.draft;
  const views = { banners: sbBannersHTML, products: sbProductsHTML, design: sbDesignHTML, pages: sbPagesHTML };
  main.innerHTML = (views[SB.tab] || sbBrandingHTML)(d);
  sbApplyPreview();
  sbLoadImgs(main);
  sbShowErrors();
}

// ---------------------------------------------------------------------
// Publish / unpublish / discard
// ---------------------------------------------------------------------
function sbPublish() {
  sbPersist();
  SB.tried = true;
  const { E } = sbChecks(SB.draft);
  if (E.length) {
    sbSide();
    sbShowErrors();
    const first = E[0].k;
    const tab = ["logo", "name", "slug", "tagline", "about"].includes(first) ? "branding"
      : first === "announce" ? "design" : first.startsWith("page") ? "pages"
      : first.startsWith("banner") ? "banners" : "products";
    showToast(`Publish se pehle ${E.length} cheez(en) theek karein`);
    if (SB.tab !== tab) location.hash = "#store/" + tab;
    return;
  }
  refreshMe();
  const st = me.store || {};
  const oldLive = st.live;
  const first = !st.publishedAt;
  const live = sbClone(SB.draft);
  updateSeller(me.id, { store: { ...st, draft: SB.draft, live, published: true, publishedAt: st.publishedAt || Date.now(), liveUpdatedAt: Date.now() } });
  refreshMe();
  if (oldLive) sbGcBanners(oldLive.banners);
  notifySeller(me.id, first
    ? `🏬 Aapka Brand Store "${live.name}" live ho gaya! Link: ${sbFullUrl(live.slug)}`
    : `🏬 Store changes publish ho gaye: "${live.name}"`);
  showToast(first ? "🎉 Aapka store live ho gaya!" : "Changes publish ho gaye ✓");
  SB.tried = false;
  render(); // nav ("View my Brand Store") bhi update ho
}

function sbUnpublish() {
  openModal(`
    <div class="modal-head"><h2>Store offline karein?</h2><button type="button" class="icon-btn" data-close aria-label="Close">✕</button></div>
    <p>Buyers ko store link par "Store abhi available nahi hai" dikhega. Aapka design save rahega — kabhi bhi dobara publish kar sakte hain.</p>
    <div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button type="button" class="btn btn-danger" id="sb-unpub-ok">Haan, offline karo</button></div>`);
  document.getElementById("sb-unpub-ok").addEventListener("click", () => {
    refreshMe();
    updateSeller(me.id, { store: { ...me.store, published: false } });
    refreshMe();
    closeModal();
    showToast("Store offline ho gaya");
    render();
  });
}

function sbDiscard() {
  refreshMe();
  const st = me.store || {};
  if (!st.live) return;
  const oldDraft = SB.draft;
  updateSeller(me.id, { store: { ...st, draft: sbClone(st.live), updatedAt: Date.now() } });
  refreshMe();
  sbGcBanners(oldDraft.banners);
  showToast("Draft wapas published version par aa gaya");
  render();
}

// ---------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------
function sbOnInput(e) {
  const t = e.target;
  if (t.type === "file") {
    if (e.type === "change" && t.files && t.files[0]) {
      const f = t.files[0];
      t.value = "";
      (t.id === "sb-file-logo" ? sbUploadLogo : sbUploadBanner)(f);
    }
    return;
  }
  // Text fields: sirf "input" par. Blur wala "change" sidebar dobara banata to Publish ka pehla click kho jaata.
  // Select / checkbox: sirf "change" par.
  const isText = t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && t.type !== "checkbox" && t.type !== "radio");
  if (isText !== (e.type === "input")) return;
  const d = SB.draft;
  if (t.dataset.sb) {
    let v = t.value;
    if (t.dataset.sb === "slug") {
      const clean = v.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-");
      if (clean !== v) t.value = clean;
      v = clean;
    }
    d[t.dataset.sb] = v;
    if (t.dataset.sb === "about") document.getElementById("sb-about-count").textContent = v.length;
    if (t.dataset.sb === "name" && !d.logo) {
      const sp = document.querySelector("#sb-main .sb-logo-prev span");
      if (sp) sp.textContent = storeInitials(v);
    }
  } else if (t.dataset.sbb) {
    const card = t.closest("[data-bid]");
    const b = d.banners.find((x) => x.id === card.dataset.bid);
    if (!b) return;
    b[t.dataset.sbb] = t.value;
    card.querySelector('[data-pv="headline"]').textContent = b.headline;
    card.querySelector('[data-pv="sub"]').textContent = b.sub;
    const cta = card.querySelector('[data-pv="cta"]');
    cta.textContent = b.cta;
    cta.classList.toggle("hidden", !b.cta || b.link === "none");
    card.querySelector(".sb-banner-img").className = "sb-banner-img tone-" + (b.tone === "dark" ? "dark" : "light");
  } else if (t.dataset.sbc) {
    const c = d.collections[Number(t.dataset.ci)];
    if (c) c.name = t.value;
  } else if (t.dataset.sbCheck) {
    d[t.dataset.sbCheck] = t.checked;
  } else if (t.dataset.sbdColor || t.dataset.sbdHex) {
    // Apna rang: color picker ya hex code. Re-render nahi (picker / typing ka focus na toote)
    let v = t.value.trim();
    const errEl = document.querySelector('#sb-main [data-err="color"]');
    if (t.dataset.sbdHex) {
      if (v && !v.startsWith("#")) v = "#" + v;
      if (!HEX_RE.test(v)) {
        const typing = v.length < 7 && /^#?[0-9a-f]*$/i.test(v);
        if (errEl) errEl.textContent = typing ? "" : "6 digit hex code daalein, jaise #e91e63";
        return;
      }
    }
    if (errEl) errEl.textContent = "";
    v = v.toLowerCase();
    d.theme = "custom";
    sbSetDesign("color", v);
    const main = document.getElementById("sb-main");
    main.querySelectorAll("button.sb-theme").forEach((b) => { b.classList.remove("active"); b.setAttribute("aria-pressed", "false"); });
    const cust = main.querySelector(".sb-theme-custom");
    if (cust) { cust.classList.add("active"); cust.querySelector("i").style.setProperty("--c", v); }
    const other = main.querySelector(t.dataset.sbdColor ? "[data-sbd-hex]" : "[data-sbd-color]");
    if (other) other.value = v;
    sbApplyPreview();
  } else if (t.dataset.sbd) {
    sbSetDesign(t.dataset.sbd, t.dataset.sbd === "cols" ? Number(t.value) : t.value);
    sbApplyPreview();
  } else if (t.dataset.sbdCheck) {
    sbSetDesign(t.dataset.sbdCheck, t.checked);
    sbApplyPreview();
  } else if (t.dataset.sbdText) {
    sbSetDesign(t.dataset.sbdText, t.value);
    sbApplyPreview();
  } else if (t.dataset.sbdSec) {
    const ds = storeDesign(d);
    const s = ds.sections.find((x) => x.k === t.dataset.sbdSec);
    if (!s) return;
    s.on = t.checked;
    d.design = ds;
    t.closest("li").classList.toggle("off", !t.checked);
  } else if (t.dataset.sbp || t.dataset.sbpCheck) {
    const card = t.closest("[data-pid]");
    const pg = (d.pages || []).find((x) => x.id === card.dataset.pid);
    if (!pg) return;
    if (t.dataset.sbpCheck) pg[t.dataset.sbpCheck] = t.checked;
    else if (t.dataset.sbp === "title") {
      pg.title = t.value;
      card.querySelector('[data-pv="slug"]').textContent = storePageSlug(pg);
    } else {
      pg.body = t.value;
      card.querySelector('[data-pv="count"]').textContent = t.value.length;
      clearTimeout(sbPrevTimer);
      sbPrevTimer = setTimeout(() => {
        const pv = card.querySelector('[data-pv="body"]');
        if (pv) pv.innerHTML = storeRichText(pg.body);
      }, 150);
    }
  } else return;
  sbChanged();
}

function sbDeletePage(i) {
  const pg = (SB.draft.pages || [])[i];
  if (!pg) return;
  const go = () => {
    SB.draft.pages.splice(i, 1);
    SB.draft.banners.forEach((bn) => { if (bn.link === "pg:" + pg.id) bn.link = "all"; });
    sbChanged();
    sbRenderMain();
    showToast("Page delete ho gaya");
  };
  if (String(pg.body || "").trim().length < 20) return go();
  openModal(`
    <div class="modal-head"><h2>"${esc(pg.title || "Page")}" delete karein?</h2><button type="button" class="icon-btn" data-close aria-label="Close">✕</button></div>
    <p>Is page ka saara content hat jayega. Publish karne ke baad buyers ko bhi nahi dikhega.</p>
    <div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button type="button" class="btn btn-danger" id="sb-pgdel-ok">Haan, delete karo</button></div>`);
  document.getElementById("sb-pgdel-ok").addEventListener("click", () => { closeModal(); go(); });
}

function sbOnClick(e) {
  const b = e.target.closest("[data-sb-act]");
  if (!b || b.disabled) return;
  const d = SB.draft;
  const i = Number(b.dataset.i);
  const swap = (arr, a, c) => { if (c < 0 || c >= arr.length) return; [arr[a], arr[c]] = [arr[c], arr[a]]; };
  const done = () => { sbChanged(); sbRenderMain(); };
  switch (b.dataset.sbAct) {
    case "theme": d.theme = b.dataset.theme; done(); break;
    case "pick-logo": document.getElementById("sb-file-logo").click(); break;
    case "del-logo": d.logo = ""; done(); break;
    case "pick-banner":
      if (d.banners.length >= STORE_LIMITS.banners) showToast(`Max ${STORE_LIMITS.banners} banners`);
      else document.getElementById("sb-file-banner").click();
      break;
    case "banner-up": swap(d.banners, i, i - 1); done(); break;
    case "banner-down": swap(d.banners, i, i + 1); done(); break;
    case "banner-del": {
      const [rm] = d.banners.splice(i, 1);
      sbPersist();
      sbGcBanners([rm]);
      done();
      break;
    }
    case "coll-add":
      if (d.collections.length >= STORE_LIMITS.collections) break;
      d.collections.push({ id: uid("C"), name: "", productIds: [] });
      done();
      document.querySelector(`#sb-main [data-sbc="name"][data-ci="${d.collections.length - 1}"]`)?.focus();
      break;
    case "coll-up": swap(d.collections, i, i - 1); done(); break;
    case "coll-down": swap(d.collections, i, i + 1); done(); break;
    case "coll-del": {
      const [c] = d.collections.splice(i, 1);
      let relinked = 0;
      d.banners.forEach((bn) => { if (bn.link === "c:" + c.id) { bn.link = "all"; relinked++; } });
      done();
      showToast(`Collection delete ho gayi${relinked ? " · banner link 'All products' par set kiya" : ""}`);
      break;
    }
    case "sec-up": case "sec-down": {
      const ds = storeDesign(d);
      swap(ds.sections, i, b.dataset.sbAct === "sec-up" ? i - 1 : i + 1);
      d.design = ds;
      done();
      break;
    }
    case "page-tpl": sbAddPage(b.dataset.tpl); break;
    case "page-add": sbAddPage(""); break;
    case "page-up": swap(d.pages, i, i - 1); done(); break;
    case "page-down": swap(d.pages, i, i + 1); done(); break;
    case "page-del": sbDeletePage(i); break;
    case "pick-prod": sbPickProducts(b.dataset.target); break;
    case "chip-up": case "chip-down": case "chip-del": {
      const t = sbTarget(b.dataset.target);
      if (!t) break;
      if (b.dataset.sbAct === "chip-del") t.arr.splice(i, 1);
      else swap(t.arr, i, b.dataset.sbAct === "chip-up" ? i - 1 : i + 1);
      done();
      break;
    }
    case "preview": sbPersist(); break; // link naye tab me khulta hai
    case "publish": sbPublish(); break;
    case "unpublish": sbUnpublish(); break;
    case "discard": sbDiscard(); break;
    case "copy": {
      const inp = document.getElementById("sb-link-out");
      const ok = () => showToast("Store link copy ho gaya ✓");
      const fallback = () => { inp.select(); try { document.execCommand("copy"); ok(); } catch { showToast("Link select ho gaya — Ctrl+C dabayein"); } };
      if (navigator.clipboard) navigator.clipboard.writeText(inp.value).then(ok, fallback); else fallback();
      break;
    }
  }
}

// ---------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------
function sbUpsell() {
  const st = me.store || {};
  content.innerHTML = `
    <h1 class="dash-title">🏬 Brand Store</h1>
    ${st.live ? `<div class="alert warn">Aapka store "<strong>${esc(st.live.name)}</strong>" abhi <strong>offline</strong> hai kyunki Premium plan active nahi hai. Premium lete hi wapas live ho jayega — design save hai.</div>` : ""}
    <section class="panel sb-upsell">
      <div class="sb-art" aria-hidden="true">
        <div class="sb-art-banner"></div>
        <div class="sb-art-head"><span></span><i></i></div>
        <div class="sb-art-grid"><span></span><span></span><span></span><span></span></div>
      </div>
      <div class="sb-upsell-text">
        <span class="status-pill s-pending">⭐ Premium feature</span>
        <h2>Zzapkart par apni khud ki mini website</h2>
        <ul class="sb-upsell-list">
          <li>🖼️ Apna <strong>logo</strong>, store ka naam aur <strong>apna rang, font, layout</strong></li>
          <li>📄 Apne pages — Privacy Policy, Terms, FAQ, Contact</li>
          <li>🎞️ <strong>5 tak banners</strong> — slideshow ke saath</li>
          <li>🗂️ <strong>Collections</strong> aur featured products</li>
          <li>🔗 Apna store link — Instagram / WhatsApp par share karo</li>
          <li>📈 Store visits report</li>
        </ul>
        <a href="#subscription" class="btn">⭐ Premium lo — ${formatPrice(PLANS.premium.price)}/month</a>
        <p class="muted">Aapka current plan: <strong>${esc(plan().name)}</strong></p>
      </div>
    </section>`;
}

function viewStore() {
  if (sbTimer) sbPersist();
  refreshMe();
  if (!plan().brandStore) { SB = null; return sbUpsell(); }
  const tab = location.hash.split("/")[1];
  const tried = SB ? SB.tried : false;
  SB = { draft: sbLoad(), tab: SB_TABS.some(([k]) => k === tab) ? tab : "branding", tried };
  if (!me.store || !me.store.draft) sbPersist(); // pehli baar: draft (aur URL) reserve karo

  const st = me.store || {};
  const stats = storeStats(me.id);
  content.innerHTML = `
    <div id="sb-page" class="sb-page" style="--st:${storeTheme(SB.draft)}">
      <div class="sb-titlebar">
        <h1 class="dash-title">🏬 Brand Store</h1>
        <span id="sb-status-top"></span>
      </div>
      <p class="muted sb-sub">Zzapkart par aapki apni mini website — apna logo, banners, collections aur products. Buyers ise <strong>store link</strong> se ya product page ke "Visit store" se kholte hain.</p>
      ${st.adminBlocked ? `<div class="alert error">⛔ Zzapkart admin ne aapka store band kiya hai: <strong>${esc(st.adminBlocked.reason)}</strong>. Theek karke support se contact karein — tab tak store buyers ko nahi dikhega.</div>` : ""}
      ${st.published && st.live ? `
        <section class="panel sb-livebar">
          <span class="sb-live-dot" aria-hidden="true"></span><strong>Store live hai</strong>
          <input id="sb-link-out" class="sb-link-out" readonly value="${esc(sbFullUrl(st.live.slug))}" aria-label="Store link" />
          <button type="button" class="btn btn-sm" data-sb-act="copy">Copy link</button>
          <a class="btn btn-sm btn-outline" href="${esc(storeUrl(st.live.slug))}" target="_blank" rel="noopener">Open store ↗</a>
          <span class="sb-stat"><strong>${stats.last7}</strong> visits (7 din)</span>
          <span class="sb-stat"><strong>${stats.total}</strong> total visits</span>
          <span class="sb-stat"><strong>${storeSubscribers(me.id).length}</strong> newsletter subscribers</span>
        </section>` : st.live ? `<div class="alert warn">Store abhi <strong>offline</strong> hai. "Publish" karte hi wapas live ho jayega.</div>` : ""}
      <nav class="sub-tabs sb-tabs">${SB_TABS.map(([k, l]) => `<a href="#store/${k}" class="${k === SB.tab ? "active" : ""}">${l}</a>`).join("")}</nav>
      <div id="sb-root" class="wizard lf-wrap sb-wrap checkout-form">
        <div class="wizard-main" id="sb-main"></div>
        <aside class="wizard-side" id="sb-side"></aside>
      </div>
      <input type="file" id="sb-file-logo" accept="image/*" hidden />
      <input type="file" id="sb-file-banner" accept="image/*" hidden />
    </div>`;
  const page = document.getElementById("sb-page");
  page.addEventListener("input", sbOnInput);
  page.addEventListener("change", sbOnInput);
  page.addEventListener("click", sbOnClick);
  sbRenderMain();
  sbSide();
}
