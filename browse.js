// =====================================================================
// Browse: all main categories → categories → sub-categories (verticals)
// Link: category.html?c=<slug>&sub=<category>&v=<sub-category>
// =====================================================================
const brMain = document.getElementById("browse-main");
const brSide = document.getElementById("browse-side");
const brInput = document.getElementById("browse-q");

const BR_GROUPS = CATEGORIES.map((c) => ({
  c,
  tree: (TAXONOMY.find((t) => t.name === c.name) || { cats: [] }).cats,
  items: productsOf(c.name),
}));
const brUrl = (c, sub, v) => categoryUrl(c) + (sub ? "&sub=" + encodeURIComponent(sub) : "") + (v ? "&v=" + encodeURIComponent(v) : "");
const brCount = (n) => (n ? `<span class="br-count">${n}</span>` : "");

const subTotal = BR_GROUPS.reduce((n, g) => n + g.tree.length, 0);
const vertTotal = BR_GROUPS.reduce((n, g) => n + g.tree.reduce((m, t) => m + t.v.length, 0), 0);
document.getElementById("browse-stats").textContent =
  `${CATEGORIES.length} main categories · ${subTotal} categories · ${vertTotal} sub-categories · ${PRODUCTS.length} products`;

function brRender() {
  const q = brInput.value.trim().toLowerCase();
  const hit = (s) => !q || s.toLowerCase().includes(q);
  let shown = 0;
  const sections = BR_GROUPS.map(({ c, tree, items }) => {
    const mainHit = hit(c.name);
    const cats = tree.map((t) => {
      const vs = mainHit || hit(t.name) ? t.v : t.v.filter(hit);
      return vs.length ? { t, vs } : null;
    }).filter(Boolean);
    if (!mainHit && !cats.length) return "";
    shown++;
    return `
    <section class="br-section" id="b-${c.slug}">
      <a class="br-head" href="${categoryUrl(c)}" style="background:${c.gradient}">
        <span class="br-emoji">${c.emoji}</span>
        <span class="br-head-text"><strong>${esc(c.name)}</strong><small>${esc(c.tagline)}</small></span>
        <span class="br-head-cta">${items.length} products · Shop all →</span>
      </a>
      ${cats.length ? `<div class="br-grid">${cats.map(({ t, vs }) => `
        <div class="br-sub panel">
          <a class="br-sub-title" href="${brUrl(c, t.name)}">${esc(t.name)} ${brCount(items.filter((p) => p.catName === t.name).length)}</a>
          <ul>${vs.map((v) => `<li><a href="${brUrl(c, t.name, v)}">${esc(v)}</a>${brCount(items.filter((p) => p.catName === t.name && p.verticalName === v).length)}</li>`).join("")}</ul>
        </div>`).join("")}</div>` : `<p class="muted br-none">Sub-categories for this category are coming soon.</p>`}
    </section>`;
  }).join("");
  brMain.innerHTML = sections || `<div class="empty"><div class="empty-emoji">🔍</div><p>"${esc(brInput.value.trim())}" — no matching category found.</p></div>`;
  brSide.innerHTML = `<strong class="br-side-title">Main categories</strong>` + BR_GROUPS.map(({ c, items }) =>
    `<a href="#b-${c.slug}" class="${brMain.querySelector("#b-" + c.slug) ? "" : "dim"}"><span>${c.emoji}</span>${esc(c.name)}${brCount(items.length)}</a>`).join("");
  return shown;
}

brInput.addEventListener("input", brRender);
brRender();
