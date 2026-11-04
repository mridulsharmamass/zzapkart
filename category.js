// Category page: category.html?c=electronics — har category ka apna page
const slug = new URLSearchParams(location.search).get("c");
const cat = CATEGORIES.find((c) => c.slug === slug);

const grid = document.getElementById("cat-grid");
const emptyEl = document.getElementById("cat-empty");
const searchInput = document.getElementById("cat-search");
const sortSelect = document.getElementById("sort");

if (!cat) {
  // Galat / missing category
  document.getElementById("cat-title").textContent = "Category nahi mili";
  document.getElementById("crumb").textContent = "Not found";
  document.querySelector(".toolbar").classList.add("hidden");
  searchInput.disabled = true;
  document.getElementById("cat-empty-msg").textContent = "Ye category exist nahi karti. Neeche se koi category chuno.";
  emptyEl.classList.remove("hidden");
} else {
  // Page ko is category ke rang/naam se sajao
  document.title = `${cat.name} – Zzapkart`;
  document.getElementById("cat-hero").style.background = cat.gradient;
  document.getElementById("crumb").textContent = cat.name;
  document.getElementById("cat-title").textContent = cat.name;
  document.getElementById("cat-tagline").textContent = cat.tagline;
  document.getElementById("cat-emoji").textContent = cat.emoji;
  searchInput.placeholder = `${cat.name} mein search karo`;

  const SORTERS = {
    popular: () => 0,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating,
    discount: (a, b) => discount(b) - discount(a),
  };

  // Sponsored products is category ke liye (page load par ek auction)
  const catSlots = runAuction({ placement: "category", category: cat.name }, 2);
  let catSlotsTracked = false;

  function render() {
    const q = searchInput.value.trim().toLowerCase();
    const showAds = !q && catSlots.length > 0;
    const adIds = new Set(showAds ? catSlots.map((s) => s.pid) : []);
    const list = productsOf(cat.name)
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort(SORTERS[sortSelect.value]);

    grid.innerHTML = (showAds ? sponsoredCards(catSlots) : "") +
      list.filter((p) => !adIds.has(p.id)).map((p) => productCard(p)).join("");
    if (showAds && !catSlotsTracked) { trackSlotsShown(catSlots); catSlotsTracked = true; }
    emptyEl.classList.toggle("hidden", list.length > 0);
    document.getElementById("cat-empty-msg").textContent = q
      ? `"${searchInput.value.trim()}" ${cat.name} mein nahi mila.`
      : "Is category mein abhi koi product nahi hai.";
    document.getElementById("cat-count").textContent = `${list.length} products`;
  }

  searchInput.addEventListener("input", render);
  sortSelect.addEventListener("change", render);
  enableAddToCart(grid);
  render();
}

// Baaki categories ke links
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
