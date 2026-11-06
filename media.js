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
