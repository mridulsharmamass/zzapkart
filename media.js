// =====================================================================
// Product images: gallery in IndexedDB (only a small thumbnail in localStorage)
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

// Images: any size / resolution / ratio works (files up to 1 GB), in any format the browser
// can open (JPG, PNG, WEBP, GIF, AVIF, BMP…) — they are always saved as small JPEG / PNG.
const IMAGE_MAX_BYTES = 1024 * 1048576;
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type).startsWith("image/") || /svg/i.test(file.type)) return reject(new Error("Please choose a photo / image file (JPG, PNG, WEBP…)"));
    if (file.size > IMAGE_MAX_BYTES) return reject(new Error(`Images can be up to 1 GB (this one is ${(file.size / 1073741824).toFixed(2)} GB)`));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) { URL.revokeObjectURL(url); reject(new Error("This image could not be opened")); return; }
      resolve({ img, url });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(/hei[cf]/i.test(file.type + file.name)
        ? "iPhone HEIC photos can't be opened in the browser — set your camera to 'Most Compatible' (JPG) or save the photo as JPG and upload again"
        : "This image could not be opened (the file may be damaged) — save it as JPG / PNG and try again"));
    };
    img.src = url;
  });
}

// Place the image in the middle of a white canvas with the given ratio (e.g. 5:6) — nothing is cropped.
// ratio null → unchanged. Scaled down to maxSide (never up).
function fitSize(iw, ih, ratio) {
  if (!ratio) return [iw, ih];
  const r = ratio[0] / ratio[1];
  return iw / ih > r ? [iw, Math.round(iw / r)] : [Math.round(ih * r), ih];
}
function drawFitted(img, ratio, maxSide, quality) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const [W, H] = fitSize(iw, ih, ratio);
  const scale = Math.min(1, maxSide / Math.max(W, H));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(W * scale));
  c.height = Math.max(1, Math.round(H * scale));
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, ((W - iw) / 2) * scale, ((H - ih) / 2) * scale, iw * scale, ih * scale);
  return c.toDataURL("image/jpeg", quality);
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

// Is the main image's background white? (checks the edge pixels)
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
      if (x > 2 && x < n - 3 && y > 2 && y < n - 3) continue; // only the border ring
      const i = (y * n + x) * 4;
      total++;
      if (d[i] > 232 && d[i + 1] > 232 && d[i + 2] > 232) white++;
    }
  }
  return white / total >= 0.8;
}

// File → { full (gallery), thumb (cards), w, h, whiteBg, fitted }
// ratio (e.g. [5, 6] for clothing): a photo of any size is fitted to that ratio on a white
// background (no cropping). w / h = the size after fitting.
async function processProductImage(file, ratio = null) {
  const { img, url } = await loadImageFromFile(file);
  try {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const fit = ratio && Math.abs(iw / ih - ratio[0] / ratio[1]) > 0.03 ? ratio : null;
    const [w, h] = fitSize(iw, ih, fit);
    return {
      id: uid("IMG"),
      w, h, ow: iw, oh: ih, fitted: !!fit,
      whiteBg: hasWhiteBorder(img),
      full: drawFitted(img, fit, 1200, 0.82),
      thumb: drawFitted(img, fit, 420, 0.78),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// =====================================================================
// Product video: MP4 / WebM / MOV · up to 1 GB · 5 sec – 2 min · at least 360p
// File waisi hi IndexedDB me (key "video:<listingId>") + ek poster frame (JPEG)
// =====================================================================
const PRODUCT_VIDEO = { maxMB: 1024, minSec: 5, maxSec: 120, minSide: 360, goodSide: 720 };
const BIG_VIDEO = 100 * 1048576; // bigger videos take a few seconds to save

// 1048576 → "1 MB", 1073741824 → "1 GB"
function fmtBytes(b) {
  b = Number(b) || 0;
  if (b >= 1073741824) return (b / 1073741824).toFixed(2).replace(/\.?0+$/, "") + " GB";
  if (b >= 1048576) return (b / 1048576).toFixed(1).replace(/\.0$/, "") + " MB";
  return Math.max(1, Math.round(b / 1024)) + " KB";
}
// Is there enough room in this browser / device? (for big videos — IndexedDB quota)
async function storageRoomFor(bytes) {
  try {
    if (!navigator.storage || !navigator.storage.estimate) return true;
    if (navigator.storage.persist) navigator.storage.persist().catch(() => {}); // so the browser doesn't clear it automatically
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
  if (!file || !/^video\/(mp4|webm|quicktime)$/.test(file.type)) throw new Error("Please upload an MP4, WebM or MOV video");
  if (file.size > P.maxMB * 1048576) throw new Error(`Videos can be up to ${fmtBytes(P.maxMB * 1048576)} (this one is ${fmtBytes(file.size)}) — please compress it and try again`);
  if (file.size < 1024) throw new Error("This video file is empty or damaged — please choose another file");
  if (!(await storageRoomFor(file.size))) throw new Error(`There isn't enough space in this browser / device for a ${fmtBytes(file.size)} video — free up some space or choose a smaller video`);
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  try {
    const unplayable = "This video can't be played in the browser — save it as MP4 (H.264) and upload again";
    const meta = videoEvent(v, "loadedmetadata", 20000, unplayable);
    v.src = url;
    await meta;
    let duration = v.duration;
    if (!Number.isFinite(duration)) {
      // Some WebM files (screen / phone recorders) don't store the length in the header — seek to the end to find it
      const known = new Promise((resolve) => {
        const t = setTimeout(() => resolve(NaN), 8000);
        v.addEventListener("durationchange", function onDc() {
          if (Number.isFinite(v.duration)) { clearTimeout(t); v.removeEventListener("durationchange", onDc); resolve(v.duration); }
        });
      });
      v.currentTime = 1e7;
      duration = await known;
    }
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("We couldn't read the video's length — please try another file");
    if (duration < P.minSec) throw new Error(`The video must be at least ${P.minSec} seconds long (this one is ${duration.toFixed(1)} sec)`);
    if (duration > P.maxSec + 0.5) throw new Error(`The video can be up to ${P.maxSec / 60} minutes (this one is ${fmtDuration(duration)}) — please trim it and upload again`);
    const w = v.videoWidth, h = v.videoHeight;
    if (!w || !h) throw new Error("No video found in this file (audio only?)");
    if (Math.min(w, h) < P.minSide) throw new Error(`The video quality is too low (${w}×${h}). Use at least ${P.minSide}p — 720p / 1080p is best.`);
    // Poster: the frame at ~1 second (not the black first frame)
    const seek = videoEvent(v, "seeked", 8000, "We couldn't create a preview frame for this video");
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

// Product page / store: get a playable URL for the video from IndexedDB
async function loadProductVideo(listingId) {
  const rec = await MediaDB.get(videoKey(listingId));
  if (!rec || !(rec.blob instanceof Blob)) return null;
  return { url: URL.createObjectURL(rec.blob), poster: safeImg(rec.poster), duration: rec.duration, w: rec.w, h: rec.h };
}

// Product gallery (product page + Brand Store): photos + the product video as a vertical reel.
// The video is the second item, so shoppers see the main photo first.
async function mountProductGallery(p, main, thumbs) {
  const [imgs, vid] = await Promise.all([
    p.imageCount > 0 ? MediaDB.get(p.id) : null,
    p.video && p.video.kind === "file" ? loadProductVideo(p.id) : null,
  ]);
  if (!main.isConnected) { if (vid) URL.revokeObjectURL(vid.url); return; }
  let items = (imgs || []).map((im) => ({ t: "img", full: safeImg(im.full), thumb: safeImg(im.thumb || im.full) })).filter((x) => x.full);
  if (!items.length && safeImg(p.image)) items = [{ t: "img", full: safeImg(p.image), thumb: safeImg(p.image) }];
  const at = Math.min(1, items.length);
  const v = p.video;
  if (v && v.kind === "yt") items.splice(at, 0, { t: "yt", id: v.ytId, thumb: ytThumbUrl(v.ytId) });
  else if (v && v.kind === "src") items.splice(at, 0, { t: "file", url: v.src, thumb: safeImg(v.poster) || safeImg(p.image) });
  else if (vid) items.splice(at, 0, { t: "file", url: vid.url, thumb: vid.poster });
  if (!items.length) return;
  const name = esc(p.name);
  const reelBtn = typeof openReels === "function" ? `<button type="button" class="reel-open" data-reel-open="1" aria-label="Watch as reel (full screen)">⛶ Watch as reel</button>` : "";
  const show = (i) => {
    const it = items[i];
    main.classList.toggle("is-video", it.t !== "img");
    if (it.t === "img") main.innerHTML = `<img src="${it.full}" alt="${name}" />`;
    else {
      const bg = it.thumb ? `<span class="reel-bg" style="background-image:url('${esc(it.thumb)}')"></span>` : "";
      const player = it.t === "yt"
        ? `<iframe src="${ytEmbedUrl(it.id)}&autoplay=1&mute=1&loop=1&playlist=${encodeURIComponent(it.id)}" title="${name} — video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
        : `<video src="${esc(it.url)}" ${it.thumb ? `poster="${esc(it.thumb)}"` : ""} controls playsinline autoplay muted loop aria-label="${name} — video"></video>`;
      main.innerHTML = `${bg}<div class="reel-frame">${player}</div>${reelBtn}`;
    }
    thumbs.querySelectorAll("button[data-gi]").forEach((b, j) => { b.classList.toggle("active", i === j); b.setAttribute("aria-pressed", String(i === j)); });
  };
  thumbs.innerHTML = items.map((it, i) => `<button type="button" data-gi="${i}" class="${it.t === "img" ? "" : "g-vid"}" aria-label="${it.t === "img" ? `Photo ${i + 1}` : "Play the product reel"}">${it.thumb ? `<img src="${esc(it.thumb)}" alt="" />` : ""}${it.t === "img" ? "" : `<span class="g-play" aria-hidden="true">▶</span>`}</button>`).join("");
  thumbs.addEventListener("click", (e) => { const b = e.target.closest("button[data-gi]"); if (b) show(Number(b.dataset.gi)); });
  main.addEventListener("click", (e) => {
    if (!e.target.closest("[data-reel-open]")) return;
    main.querySelector("video")?.pause();
    openReels(reelList(), Math.max(0, reelList().findIndex((r) => String(r.p.id) === String(p.id))));
  });
  show(0);
}

// =====================================================================
// Brand Store: logo (square) + banner (3:1) processing
// =====================================================================
// Any size works — the logo / banner is fitted automatically (nothing important is cut off)
const STORE_LOGO = { out: 256, good: 200 };
const STORE_BANNER = { minRatio: 2, maxRatio: 5, ratio: 3, outW: 1500, goodW: 1200 };

// Logo: the whole logo fitted into a 256×256 square (no cropping). PNG if transparent / padded, otherwise JPEG.
async function processStoreLogo(file) {
  const { img, url } = await loadImageFromFile(file);
  try {
    const w = img.naturalWidth, h = img.naturalHeight;
    const S = STORE_LOGO.out;
    const scale = S / Math.max(w, h);
    const dw = Math.max(1, Math.round(w * scale)), dh = Math.max(1, Math.round(h * scale));
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h, (S - dw) / 2, (S - dh) / 2, dw, dh);
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
    return { data, w, h, fitted: Math.abs(w - h) > 2, lowRes: Math.max(w, h) < STORE_LOGO.good };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Banner (any size):
//  • landscape 2:1 – 5:1 → centred 3:1 crop (slight) → max 1500×500 JPEG
//  • square / portrait / very wide → the whole image in the middle, on a blurred copy of itself (nothing cut off)
async function processStoreBanner(file) {
  const { img, url } = await loadImageFromFile(file);
  try {
    const w = img.naturalWidth, h = img.naturalHeight, r = w / h;
    const B = STORE_BANNER;
    if (r < B.minRatio || r > B.maxRatio) {
      const outW = B.outW, outH = Math.round(B.outW / B.ratio);
      const c = document.createElement("canvas");
      c.width = outW; c.height = outH;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#1e0b3d";
      ctx.fillRect(0, 0, outW, outH);
      // Behind: the same photo covering the whole banner, blurred and slightly darkened
      const cover = Math.max(outW / w, outH / h);
      ctx.save();
      ctx.filter = "blur(28px) brightness(0.8)";
      ctx.drawImage(img, (outW - w * cover) / 2, (outH - h * cover) / 2, w * cover, h * cover);
      ctx.restore();
      // In front: the whole photo, uncropped
      const fit = Math.min(outW / w, outH / h);
      ctx.drawImage(img, (outW - w * fit) / 2, (outH - h * fit) / 2, w * fit, h * fit);
      return { id: uid("BNR"), data: c.toDataURL("image/jpeg", 0.85), w, h, cropped: false, fitted: true, lowRes: h < 400 && w < B.goodW };
    }
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
      fitted: false,
      lowRes: sw < STORE_BANNER.goodW,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
