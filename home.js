// Home page: category list, har category ka alag section, search
const searchInput = document.getElementById("search");
const browseView = document.getElementById("browse-view");
const searchView = document.getElementById("search-view");
const hero = document.getElementById("hero");

const SECTION_LIMIT = 4; // har section mein home par kitne products dikhane hain

// ---------- Saari categories ki list (tiles) ----------
document.getElementById("cat-tiles").innerHTML = CATEGORIES.map(
  (c) => `
    <a href="${categoryUrl(c)}" class="cat-tile" style="background:${c.gradient}">
      <span class="cat-tile-emoji">${c.emoji}</span>
      <span class="cat-tile-name">${c.name}</span>
      <span class="cat-tile-count">${productsOf(c.name).length} products</span>
    </a>`
).join("");

// ---------- Sponsored (seller ads) ----------
const sponsoredEl = document.getElementById("sponsored");
const ads = liveCampaigns().slice(0, 4);
if (ads.length) {
  sponsoredEl.innerHTML = `
    <section class="cat-section sponsored-section">
      <div class="cat-section-head" style="border-left-color:#ff2d95">
        <div>
          <h2>📣 Sponsored Products</h2>
          <p class="muted">Hamare sellers ke promoted products</p>
        </div>
      </div>
      <div class="grid">${ads.map(({ campaign, product }) => productCard(product, { campaignId: campaign.id })).join("")}</div>
    </section>`;
  ads.forEach(({ campaign }) => recordImpression(campaign.id));
  enableAddToCart(sponsoredEl);
}

// ---------- Har category ka alag section ----------
const sectionsEl = document.getElementById("category-sections");
sectionsEl.innerHTML = CATEGORIES.map((c) => {
  const items = productsOf(c.name);
  if (items.length === 0) return "";
  return `
    <section class="cat-section">
      <div class="cat-section-head" style="border-left-color:${c.gradient.match(/#\w+/)[0]}">
        <div>
          <h2>${c.emoji} ${c.name}</h2>
          <p class="muted">${c.tagline}</p>
        </div>
        <a href="${categoryUrl(c)}" class="btn view-all">View All (${items.length}) →</a>
      </div>
      <div class="grid">${items.slice(0, SECTION_LIMIT).map(productCard).join("")}</div>
    </section>`;
}).join("");
enableAddToCart(sectionsEl);

// ---------- Search ----------
const searchGrid = document.getElementById("search-grid");
enableAddToCart(searchGrid);

function runSearch() {
  const raw = searchInput.value.trim();
  const q = raw.toLowerCase();
  const searching = q.length > 0;

  browseView.classList.toggle("hidden", searching);
  hero.classList.toggle("hidden", searching);
  searchView.classList.toggle("hidden", !searching);
  if (!searching) return;

  const list = PRODUCTS.filter(
    (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  );
  searchGrid.innerHTML = list.map(productCard).join("");
  document.getElementById("empty").classList.toggle("hidden", list.length > 0);
  document.getElementById("result-info").textContent = `"${raw}" ke liye ${list.length} result(s)`;
}

searchInput.addEventListener("input", runSearch);

// Doosre page se search karke aaye ho to (?q=...) wala text bhar do
const initialQ = new URLSearchParams(location.search).get("q");
if (initialQ) searchInput.value = initialQ;
runSearch();
