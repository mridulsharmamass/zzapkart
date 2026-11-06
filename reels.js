// =====================================================================
// Reels — short vertical product videos
//  • Home page "Shop the Reels" strip (previews play muted while on screen)
//  • Full-screen viewer: swipe / scroll / arrow keys between reels,
//    sound on/off, add to cart and open the product
// Sources: our demo reels (images/reels/*.mp4), seller uploads (stored in this
// browser) and YouTube links.
// =====================================================================
const REEL_REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const reelBlobUrls = new Map();
let RV = null; // open viewer state

function reelList() {
  return PRODUCTS.filter((p) => p.video && ["src", "file", "yt"].includes(p.video.kind)).map((p) => ({ p, v: p.video }));
}
function reelPoster(r) {
  return r.v.kind === "yt" ? ytThumbUrl(r.v.ytId) : safeImg(r.v.poster) || safeImg(r.p.image);
}
async function reelSrc(r) {
  if (r.v.kind === "src") return r.v.src;
  if (r.v.kind !== "file" || typeof loadProductVideo !== "function") return "";
  if (!reelBlobUrls.has(r.p.id)) {
    const x = await loadProductVideo(r.p.id);
    if (!x) return "";
    reelBlobUrls.set(r.p.id, x.url);
  }
  return reelBlobUrls.get(r.p.id);
}
function reelPriceHtml(p) {
  const off = discount(p);
  return `<strong>${formatPrice(p.price)}</strong>${off ? ` <s>${formatPrice(p.mrp)}</s> <em>${off}% off</em>` : ""}`;
}

// ---------------------------------------------------------------------
// Home page strip
// ---------------------------------------------------------------------
function renderReelsStrip(el) {
  if (!el) return;
  const list = reelList();
  if (!list.length) { el.innerHTML = ""; return; }
  el.innerHTML = `
    <section class="home-sec reels-sec" aria-label="Shop the Reels">
      <div class="section-head">
        <div><h2 class="section-title">🎬 Shop the Reels</h2><p class="section-sub">Short product videos from our sellers — tap to watch</p></div>
      </div>
      <div class="reels-row">${list.map((r, i) => `
        <button type="button" class="reel-card" data-reel="${i}" aria-label="Watch reel: ${esc(r.p.name)}">
          <span class="reel-media">${r.v.kind === "yt"
            ? `<img src="${esc(reelPoster(r))}" alt="" loading="lazy" />`
            : `<video muted loop playsinline preload="none" poster="${esc(reelPoster(r))}" data-reel-src="${i}" tabindex="-1"></video>`}</span>
          <span class="reel-badge" aria-hidden="true">▶ Reel</span>
          <span class="reel-info"><strong>${esc(r.p.name)}</strong><span>${reelPriceHtml(r.p)}</span></span>
        </button>`).join("")}</div>
    </section>`;
  if (!REEL_REDUCED && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => entries.forEach(async (en) => {
      const v = en.target;
      if (en.isIntersecting && !RV) {
        if (!v.src) {
          const s = await reelSrc(list[Number(v.dataset.reelSrc)]);
          if (!s) return;
          v.src = s;
        }
        v.play().catch(() => {});
      } else v.pause();
    }), { threshold: 0.6 });
    el.querySelectorAll("video[data-reel-src]").forEach((v) => io.observe(v));
  }
  el.addEventListener("click", (e) => {
    const c = e.target.closest("[data-reel]");
    if (c) openReels(list, Number(c.dataset.reel), c);
  });
}

// ---------------------------------------------------------------------
// Full-screen viewer
// ---------------------------------------------------------------------
function openReels(list, start = 0, opener = null) {
  if (!list || !list.length) return;
  closeReels(true);
  const el = document.createElement("div");
  el.className = "rv";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", "Product reels");
  el.innerHTML = `
    <div class="rv-top">
      <span class="rv-title">Reels</span>
      <button type="button" class="rv-btn" data-rv="mute" aria-label="Turn sound on" aria-pressed="false">🔇</button>
      <button type="button" class="rv-btn" data-rv="close" aria-label="Close reels">✕</button>
    </div>
    <div class="rv-scroll">${list.map((r, i) => `
      <section class="rv-slide" data-i="${i}" aria-label="Reel ${i + 1} of ${list.length}: ${esc(r.p.name)}">
        <div class="rv-stage">
          <span class="rv-bg" style="background-image:url('${esc(reelPoster(r))}')"></span>
          ${r.v.kind === "yt"
            ? `<div class="rv-yt" data-yt="${esc(r.v.ytId)}"></div>`
            : `<video class="rv-video" playsinline loop muted preload="none" poster="${esc(reelPoster(r))}"></video>`}
          <span class="rv-paused" aria-hidden="true">▶</span>
          <div class="rv-progress" aria-hidden="true"><span></span></div>
          <div class="rv-info">
            <span class="rv-seller">${esc(r.p.storeName || r.p.sellerName || "Zzapkart")}</span>
            <a class="rv-name" href="${productUrl(r.p)}">${esc(r.p.name)}</a>
            <span class="rv-price">${reelPriceHtml(r.p)}</span>
            <div class="rv-actions">
              ${!inStock(r.p) ? `<span class="rv-out">Out of stock</span>`
                : r.p.hasSizes ? `<a class="rv-cta" href="${productUrl(r.p)}">Select size</a>`
                : `<button type="button" class="rv-cta" data-rv-add="${r.p.id}">Add to cart</button>`}
              <a class="rv-cta alt" href="${productUrl(r.p)}">View product</a>
            </div>
          </div>
        </div>
      </section>`).join("")}</div>
    <button type="button" class="rv-nav up" data-rv="prev" aria-label="Previous reel">↑</button>
    <button type="button" class="rv-nav down" data-rv="next" aria-label="Next reel">↓</button>`;
  document.body.appendChild(el);
  document.body.classList.add("rv-lock");
  document.querySelectorAll(".reels-row video").forEach((v) => v.pause());
  const scroller = el.querySelector(".rv-scroll");
  RV = { el, list, scroller, muted: true, active: -1, opener: opener || document.activeElement };

  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    const i = Number(en.target.dataset.i);
    if (en.isIntersecting) reelActivate(i);
    else reelDeactivate(i);
  }), { root: scroller, threshold: 0.65 });
  el.querySelectorAll(".rv-slide").forEach((s) => io.observe(s));
  RV.io = io;

  el.addEventListener("click", reelClick);
  el.addEventListener("keydown", reelKey);
  scroller.scrollTop = start * scroller.clientHeight;
  el.querySelector('[data-rv="close"]').focus({ preventScroll: true });
}

function reelSlide(i) { return RV && RV.el.querySelector(`.rv-slide[data-i="${i}"]`); }

async function reelActivate(i) {
  if (!RV) return;
  RV.active = i;
  const s = reelSlide(i);
  const r = RV.list[i];
  const yt = s.querySelector(".rv-yt");
  if (yt) {
    if (!yt.firstChild) yt.innerHTML = `<iframe src="${ytEmbedUrl(r.v.ytId)}&autoplay=1&mute=${RV.muted ? 1 : 0}&loop=1&playlist=${encodeURIComponent(r.v.ytId)}&playsinline=1" title="${esc(r.p.name)} — reel" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    return;
  }
  const v = s.querySelector("video");
  if (!v.src) {
    const src = await reelSrc(r);
    if (!src || !RV || RV.active !== i) return;
    v.src = src;
    v.addEventListener("timeupdate", () => {
      const bar = s.querySelector(".rv-progress span");
      if (bar && v.duration) bar.style.width = (v.currentTime / v.duration) * 100 + "%";
    });
    v.addEventListener("play", () => s.classList.remove("paused"));
    v.addEventListener("pause", () => s.classList.add("paused"));
  }
  v.muted = RV.muted;
  v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
}
function reelDeactivate(i) {
  const s = reelSlide(i);
  if (!s) return;
  const yt = s.querySelector(".rv-yt");
  if (yt) { yt.innerHTML = ""; return; }
  const v = s.querySelector("video");
  if (v && v.src) { v.pause(); s.classList.remove("paused"); }
}
function reelGo(d) {
  if (!RV) return;
  const n = Math.max(0, Math.min(RV.list.length - 1, RV.active + d));
  RV.scroller.scrollTo({ top: n * RV.scroller.clientHeight, behavior: REEL_REDUCED ? "auto" : "smooth" });
}
function reelSetMuted(m) {
  RV.muted = m;
  const b = RV.el.querySelector('[data-rv="mute"]');
  b.textContent = m ? "🔇" : "🔊";
  b.setAttribute("aria-label", m ? "Turn sound on" : "Turn sound off");
  b.setAttribute("aria-pressed", String(!m));
  RV.el.querySelectorAll("video").forEach((v) => (v.muted = m));
  const s = reelSlide(RV.active);
  const yt = s && s.querySelector(".rv-yt");
  if (yt) { yt.innerHTML = ""; reelActivate(RV.active); }
}
function reelAdd(id) {
  const p = PRODUCTS.find((x) => String(x.id) === String(id));
  if (!p) return;
  const key = p.variants && p.variants.length === 1 ? cartKey(p.id, p.variants[0].id) : String(p.id);
  const item = resolveCartItem(key, 0);
  if (!item || (getCart()[key] || 0) >= item.maxStock) { showToast(`Only ${item ? item.maxStock : 0} in stock`); return; }
  addToCart(key);
  trackCartAdd(p.id);
  showToast(`${p.name} added to your cart ✓`);
}
function reelClick(e) {
  const t = e.target;
  const act = t.closest("[data-rv]");
  if (act) {
    const a = act.dataset.rv;
    if (a === "close") return closeReels();
    if (a === "mute") return reelSetMuted(!RV.muted);
    if (a === "next") return reelGo(1);
    if (a === "prev") return reelGo(-1);
  }
  const add = t.closest("[data-rv-add]");
  if (add) return reelAdd(add.dataset.rvAdd);
  if (t.closest("a, button")) return;
  // Tap on the video: play / pause
  const v = t.closest(".rv-stage") && t.closest(".rv-stage").querySelector("video");
  if (v && v.src) { if (v.paused) v.play().catch(() => {}); else v.pause(); }
}
function reelKey(e) {
  if (e.key === "Escape") { e.preventDefault(); closeReels(); }
  else if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); reelGo(1); }
  else if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); reelGo(-1); }
  else if (e.key === "m" || e.key === "M") reelSetMuted(!RV.muted);
  else if (e.key === "Tab") {
    // Keep keyboard focus inside the viewer
    const f = [...RV.el.querySelectorAll("button, a[href]")].filter((x) => x.offsetParent);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}
function closeReels(silent) {
  if (!RV) return;
  RV.io.disconnect();
  RV.el.querySelectorAll("video").forEach((v) => { v.pause(); v.removeAttribute("src"); v.load(); });
  RV.el.remove();
  document.body.classList.remove("rv-lock");
  const op = RV.opener;
  RV = null;
  if (!silent && op && op.isConnected) op.focus({ preventScroll: true });
}
