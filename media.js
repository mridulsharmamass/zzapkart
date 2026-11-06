// =====================================================================
// Product images: IndexedDB me gallery (localStorage me sirf chhota thumbnail)
// =====================================================================
const MediaDB = (() => {
  let dbp = null;
  function open() {
    if (!dbp) {
      dbp = new Promise((resolve, reject) => {
        if (!("indexedDB" in window)) return reject(new Error("IndexedDB not available"));
        const req = indexedDB.open("zk_media", 1);
        req.onupgradeneeded = () => req.result.createObjectStore("gallery");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbp;
  }
  async function tx(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction("gallery", mode);
      const store = t.objectStore("gallery");
      const req = fn(store);
      t.oncomplete = () => resolve(req && req.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }
  return {
    put: (key, value) => tx("readwrite", (s) => s.put(value, String(key))).catch(() => null),
    get: (key) => tx("readonly", (s) => s.get(String(key))).catch(() => null),
    del: (key) => tx("readwrite", (s) => s.delete(String(key))).catch(() => null),
    clear: () => tx("readwrite", (s) => s.clear()).catch(() => null),
  };
})();

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error("Sirf JPG / PNG / WEBP image"));
    if (file.size > 10 * 1024 * 1024) return reject(new Error("Image 10 MB se chhoti honi chahiye"));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image khul nahi payi")); };
    img.src = url;
  });
}

function drawScaled(img, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * scale));
  c.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}

// Main image ka background white hai? (kinaaron ke pixels check)
function hasWhiteBorder(img) {
  const n = 48;
  const c = document.createElement("canvas");
  c.width = n; c.height = n;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, n, n);
  const d = ctx.getImageData(0, 0, n, n).data;
  let white = 0, total = 0;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (x > 2 && x < n - 3 && y > 2 && y < n - 3) continue; // sirf border ring
      const i = (y * n + x) * 4;
      total++;
      if (d[i] > 232 && d[i + 1] > 232 && d[i + 2] > 232) white++;
    }
  }
  return white / total >= 0.8;
}

// File → { full (gallery), thumb (cards), w, h, whiteBg }
async function processProductImage(file) {
  const { img, url } = await loadImageFromFile(file);
  try {
    return {
      id: uid("IMG"),
      w: img.naturalWidth,
      h: img.naturalHeight,
      whiteBg: hasWhiteBorder(img),
      full: drawScaled(img, 1200, 0.82),
      thumb: drawScaled(img, 420, 0.78),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// =====================================================================
// Product video: MP4 / WebM / MOV · 1 GB tak · 5 sec – 2 min · kam se kam 360p
// File waisi hi IndexedDB me (key "video:<listingId>") + ek poster frame (JPEG)
// =====================================================================
const PRODUCT_VIDEO = { maxMB: 1024, minSec: 5, maxSec: 120, minSide: 360, goodSide: 720 };
const BIG_VIDEO = 100 * 1048576; // isse bade video save hone me thoda time lete hain

// 1048576 → "1 MB", 1073741824 → "1 GB"
function fmtBytes(b) {
  b = Number(b) || 0;
  if (b >= 1073741824) return (b / 1073741824).toFixed(2).replace(/\.?0+$/, "") + " GB";
  if (b >= 1048576) return (b / 1048576).toFixed(1).replace(/\.0$/, "") + " MB";
  return Math.max(1, Math.round(b / 1024)) + " KB";
}
// Browser / device me itni jagah hai? (bade videos ke liye — IndexedDB quota)
async function storageRoomFor(bytes) {
  try {
    if (!navigator.storage || !navigator.storage.estimate) return true;
    if (navigator.storage.persist) navigator.storage.persist().catch(() => {}); // data apne-aap delete na ho
    const { quota = 0, usage = 0 } = await navigator.storage.estimate();
    return !quota || quota - usage > bytes * 1.1 + 5 * 1048576;
  } catch {
    return true;
  }
}

function videoEvent(v, ok, ms, bad) {
  return new Promise((resolve, reject) => {
    const done = (fn, x) => { clearTimeout(timer); v.removeEventListener(ok, onOk); v.removeEventListener("error", onErr); fn(x); };
    const onOk = () => done(resolve);
    const onErr = () => done(reject, new Error(bad));
    const timer = setTimeout(() => done(reject, new Error(bad)), ms);
    v.addEventListener(ok, onOk);
    v.addEventListener("error", onErr);
  });
}

async function processProductVideo(file) {
  const P = PRODUCT_VIDEO;
  if (!file || !/^video\/(mp4|webm|quicktime)$/.test(file.type)) throw new Error("Sirf MP4, WebM ya MOV video upload karein");
  if (file.size > P.maxMB * 1048576) throw new Error(`Video ${fmtBytes(P.maxMB * 1048576)} tak ka ho sakta hai (ye ${fmtBytes(file.size)} hai) — chhota / compress karke upload karein`);
  if (file.size < 1024) throw new Error("Ye video file khaali ya kharab hai — doosri file chunein");
  if (!(await storageRoomFor(file.size))) throw new Error(`Is browser / device me ${fmtBytes(file.size)} ka video rakhne ki jagah nahi hai — device me jagah khaali karein ya chhota video chunein`);
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  try {
    const unplayable = "Ye video browser me chal nahi pa raha — MP4 (H.264) format me save karke upload karein";
    const meta = videoEvent(v, "loadedmetadata", 20000, unplayable);
    v.src = url;
    await meta;
    let duration = v.duration;
    if (!Number.isFinite(duration)) {
      // Kuch WebM files (screen / phone recorder) me length header me nahi hoti — end tak seek karke pata karo
      const known = new Promise((resolve) => {
        const t = setTimeout(() => resolve(NaN), 8000);
        v.addEventListener("durationchange", function onDc() {
          if (Number.isFinite(v.duration)) { clearTimeout(t); v.removeEventListener("durationchange", onDc); resolve(v.duration); }
        });
      });
      v.currentTime = 1e7;
      duration = await known;
    }
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("Video ki length pata nahi chal payi — doosri file try karein");
    if (duration < P.minSec) throw new Error(`Video kam se kam ${P.minSec} second ka ho (ye ${duration.toFixed(1)} sec hai)`);
    if (duration > P.maxSec + 0.5) throw new Error(`Video ${P.maxSec / 60} minute tak ka ho (ye ${fmtDuration(duration)} hai) — chhota karke upload karein`);
    const w = v.videoWidth, h = v.videoHeight;
    if (!w || !h) throw new Error("Is file me video nahi mila (sirf audio?)");
    if (Math.min(w, h) < P.minSide) throw new Error(`Video ki quality kam hai (${w}×${h}). Kam se kam ${P.minSide}p, best 720p / 1080p.`);
    // Poster: ~1 second wala frame (shuru ka black frame nahi)
    const seek = videoEvent(v, "seeked", 8000, "Video ka preview frame nahi ban paya");
    v.currentTime = Math.min(1, duration / 3);
    await seek;
    const scale = Math.min(1, 640 / Math.max(w, h));
    const c = document.createElement("canvas");
    c.width = Math.round(w * scale);
    c.height = Math.round(h * scale);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(v, 0, 0, c.width, c.height);
    return {
      kind: "file", id: uid("VID"), blob: file, type: file.type, name: String(file.name || "video").slice(0, 80), size: file.size,
      duration: Math.round(duration * 10) / 10, w, h, poster: c.toDataURL("image/jpeg", 0.8), lowRes: Math.min(w, h) < P.goodSide,
    };
  } finally {
    v.removeAttribute("src");
    v.load();
    URL.revokeObjectURL(url);
  }
}

// Product page / store: video IndexedDB se nikaal ke play karne layak URL
async function loadProductVideo(listingId) {
  const rec = await MediaDB.get(videoKey(listingId));
  if (!rec || !(rec.blob instanceof Blob)) return null;
  return { url: URL.createObjectURL(rec.blob), poster: safeImg(rec.poster), duration: rec.duration, w: rec.w, h: rec.h };
}

// Product gallery (product page + Brand Store): images + video thumbnail (▶).
// Video doosre number par — jaise bade marketplaces me.
async function mountProductGallery(p, main, thumbs) {
  const [imgs, vid] = await Promise.all([
    p.imageCount > 0 ? MediaDB.get(p.id) : null,
    p.video && p.video.kind === "file" ? loadProductVideo(p.id) : null,
  ]);
  if (!main.isConnected) { if (vid) URL.revokeObjectURL(vid.url); return; }
  const items = (imgs || []).map((im) => ({ t: "img", full: safeImg(im.full), thumb: safeImg(im.thumb || im.full) })).filter((x) => x.full);
  const at = Math.min(1, items.length);
  if (p.video && p.video.kind === "yt") items.splice(at, 0, { t: "yt", id: p.video.ytId, thumb: ytThumbUrl(p.video.ytId) });
  else if (vid) items.splice(at, 0, { t: "file", url: vid.url, thumb: vid.poster });
  if (!items.length) return;
  const name = esc(p.name);
  const show = (i) => {
    const it = items[i];
    main.classList.toggle("is-video", it.t !== "img");
    main.innerHTML = it.t === "img" ? `<img src="${it.full}" alt="${name}" />`
      : it.t === "yt" ? `<iframe src="${ytEmbedUrl(it.id)}&autoplay=1&mute=1" title="${name} — video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
      : `<video src="${it.url}" ${it.thumb ? `poster="${it.thumb}"` : ""} controls playsinline autoplay muted loop aria-label="${name} — video"></video>`;
    thumbs.querySelectorAll("button[data-gi]").forEach((b, j) => { b.classList.toggle("active", i === j); b.setAttribute("aria-pressed", String(i === j)); });
  };
  thumbs.innerHTML = items.map((it, i) => `<button type="button" data-gi="${i}" class="${it.t === "img" ? "" : "g-vid"}" aria-label="${it.t === "img" ? `Image ${i + 1}` : "Product video chalao"}">${it.thumb ? `<img src="${esc(it.thumb)}" alt="" />` : ""}${it.t === "img" ? "" : `<span class="g-play" aria-hidden="true">▶</span>`}</button>`).join("");
  thumbs.addEventListener("click", (e) => { const b = e.target.closest("button[data-gi]"); if (b) show(Number(b.dataset.gi)); });
  show(0);
}

// =====================================================================
// Brand Store: logo (square) + banner (3:1) processing
// =====================================================================
const STORE_LOGO = { min: 200, out: 256 };
const STORE_BANNER = { minW: 1000, minRatio: 2, maxRatio: 5, ratio: 3, outW: 1500, goodW: 1200 };

// Logo: beech se square crop → 256×256. Transparent ho to PNG, warna JPEG.
async function processStoreLogo(file) {
  const { img, url } = await loadImageFromFile(file);
  try {
    const w = img.naturalWidth, h = img.naturalHeight;
    if (Math.min(w, h) < STORE_LOGO.min) throw new Error(`Logo kam se kam ${STORE_LOGO.min}×${STORE_LOGO.min} px ka ho (ye ${w}×${h} hai)`);
    const side = Math.min(w, h);
    const c = document.createElement("canvas");
    c.width = c.height = STORE_LOGO.out;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, STORE_LOGO.out, STORE_LOGO.out);
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    let transparent = false;
    for (let i = 3; i < px.length; i += 4) if (px[i] < 250) { transparent = true; break; }
    let data;
    if (transparent) data = c.toDataURL("image/png");
    else {
      const j = document.createElement("canvas");
      j.width = j.height = STORE_LOGO.out;
      const jc = j.getContext("2d");
      jc.fillStyle = "#fff";
      jc.fillRect(0, 0, j.width, j.height);
      jc.drawImage(c, 0, 0);
      data = j.toDataURL("image/jpeg", 0.9);
    }
    return { data, w, h, cropped: w !== h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Banner: landscape (2:1 se 5:1) → beech se 3:1 crop → max 1500×500 JPEG
async function processStoreBanner(file) {
  const { img, url } = await loadImageFromFile(file);
  try {
    const w = img.naturalWidth, h = img.naturalHeight, r = w / h;
    if (w < STORE_BANNER.minW) throw new Error(`Banner kam se kam ${STORE_BANNER.minW} px chauda ho (ye ${w}×${h} hai). Recommended 1500×500 px.`);
    if (r < STORE_BANNER.minRatio || r > STORE_BANNER.maxRatio) throw new Error(`Banner landscape (lamba-chauda) hona chahiye, 3:1 jaisa — jaise 1500×500 px. Ye ${w}×${h} hai.`);
    let sw = w, sh = h;
    if (r > STORE_BANNER.ratio) sw = h * STORE_BANNER.ratio; else sh = w / STORE_BANNER.ratio;
    const outW = Math.min(STORE_BANNER.outW, Math.round(sw));
    const outH = Math.round(outW / STORE_BANNER.ratio);
    const c = document.createElement("canvas");
    c.width = outW; c.height = outH;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, outW, outH);
    return {
      id: uid("BNR"),
      data: c.toDataURL("image/jpeg", 0.85),
      w, h,
      cropped: Math.abs(r - STORE_BANNER.ratio) > 0.03,
      lowRes: sw < STORE_BANNER.goodW,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
