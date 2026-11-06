// Category page: category.html?c=electronics — one page per category
const params = new URLSearchParams(location.search);
const slug = params.get("c");
const cat = CATEGORIES.find((c) => c.slug === slug);

const grid = document.getElementById("cat-grid");
const emptyEl = document.getElementById("cat-empty");
const searchInput = document.getElementById("cat-search");
const sortSelect = document.getElementById("sort");

if (!cat) {
  // Wrong / missing category
  document.getElementById("cat-title").textContent = "Category not found";
  document.getElementById("crumb").textContent = "Not found";
  document.querySelector(".toolbar").classList.add("hidden");
  searchInput.disabled = true;
  document.getElementById("cat-empty-msg").textContent = "This category doesn't exist. Pick a category below.";
  emptyEl.classList.remove("hidden");
} else {
  // Style the page with this category's colours / name
  document.title = `${cat.name} – Zzapkart`;
  document.getElementById("cat-hero").style.background = cat.gradient;
  document.getElementById("crumb").textContent = cat.name;
  document.getElementById("cat-title").textContent = cat.name;
  document.getElementById("cat-tagline").textContent = cat.tagline;
  document.getElementById("cat-emoji").textContent = cat.emoji;
  searchInput.placeholder = `Search in ${cat.name}`;

  const SORTERS = {
    popular: () => 0,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating,
    discount: (a, b) => discount(b) - discount(a),
  };

  // Sponsored products for this category (one auction per page load)
  const catSlots = runAuction({ placement: "category", category: cat.name }, 2);
  let catSlotsTracked = false;

  // Sub-category chips (category → sub-category)
  const subTree = (typeof TAXONOMY !== "undefined" ? TAXONOMY.find((t) => t.name === cat.name) : null);
  const subs = subTree ? subTree.cats.map((c) => c.name) : [];
  // Coming from browse.html: preselect the sub-category (?sub=) and product type (?v=)
  let sub = subs.includes(params.get("sub")) ? params.get("sub") : "All";
  let vert = params.get("v") || "";
  if (subs.length) {
    const bar = document.createElement("div");
    bar.className = "filter-tabs sub-chips";
    bar.id = "sub-chips";
    grid.parentNode.insertBefore(bar, grid);
    bar.addEventListener("click", (e) => {
      if (e.target.closest("[data-clear-v]")) { vert = ""; render(); return; }
      const b = e.target.closest("[data-sub]");
      if (!b) return;
      sub = b.dataset.sub;
      vert = "";
      render();
    });
  }

  function render() {
    const q = searchInput.value.trim().toLowerCase();
    const showAds = !q && sub === "All" && !vert && catSlots.length > 0;
    const adIds = new Set(showAds ? catSlots.map((s) => s.pid) : []);
    const list = productsOf(cat.name)
      .filter((p) => !q || `${p.name} ${p.brand || ""} ${p.verticalName || ""}`.toLowerCase().includes(q))
      .filter((p) => sub === "All" || p.catName === sub)
      .filter((p) => !vert || p.verticalName === vert)
      .sort(SORTERS[sortSelect.value]);

    const chips = document.getElementById("sub-chips");
    if (chips) {
      const all = productsOf(cat.name);
      chips.innerHTML = ["All"].concat(subs).map((n) => {
        const c = n === "All" ? all.length : all.filter((p) => p.catName === n).length;
        return `<button class="chip ${sub === n ? "active" : ""}" data-sub="${esc(n)}">${esc(n)} (${c})</button>`;
      }).join("") + (vert ? `<button class="chip vert-chip" data-clear-v="1" title="Remove filter">${esc(vert)} ✕</button>` : "");
    }
    document.getElementById("crumb").textContent = [cat.name, sub !== "All" ? sub : "", vert].filter(Boolean).join(" › ");
    grid.innerHTML = (showAds ? sponsoredCards(catSlots) : "") +
      list.filter((p) => !adIds.has(p.id)).map((p) => productCard(p)).join("");
    if (showAds && !catSlotsTracked) { trackSlotsShown(catSlots); catSlotsTracked = true; }
    emptyEl.classList.toggle("hidden", list.length > 0);
    document.getElementById("cat-empty-msg").textContent = q
      ? `No results for "${searchInput.value.trim()}" in ${cat.name}.`
      : "There are no products in this category yet.";
    document.getElementById("cat-count").textContent = `${list.length} products`;
  }

  searchInput.addEventListener("input", render);
  document.getElementById("cat-search-form").addEventListener("submit", (e) => { e.preventDefault(); render(); });
  sortSelect.addEventListener("change", render);
  enableAddToCart(grid);
  render();
}

// Links to the other categories
document.getElementById("other-cats").innerHTML = CATEGORIES.filter((c) => c !== cat)
  .map(
    (c) => `
    <a href="${categoryUrl(c)}" class="cat-tile" style="background:${c.gradient}">
      <span class="cat-tile-emoji">${c.emoji}</span>
      <span class="cat-tile-name">${c.name}</span>
      <span class="cat-tile-count">${productsOf(c.name).length} products</span>
    </a>`
  )
  .join("");
