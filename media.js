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
