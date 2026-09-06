const state = {
  category: "",
  keyword: "",
  featured: "",
  minPrice: "",
  maxPrice: "",
  sort: "newest",
  page: 1,
  limit: 12,
};

document.addEventListener("DOMContentLoaded", async () => {
  renderHeader("products");
  renderFooter();

  const params = new URLSearchParams(window.location.search);
  state.category = params.get("category") || "";
  state.keyword = params.get("keyword") || "";
  state.featured = params.get("featured") || "";
  state.sort = params.get("sort") || "newest";

  document.getElementById("sort-select").value = state.sort;
  document.getElementById("sort-select").addEventListener("change", (e) => {
    state.sort = e.target.value;
    state.page = 1;
    loadProducts();
  });

  document.getElementById("price-form").addEventListener("submit", (e) => {
    e.preventDefault();
    state.minPrice = document.getElementById("min-price").value;
    state.maxPrice = document.getElementById("max-price").value;
    state.page = 1;
    loadProducts();
  });

  await loadCategoryFilters();
  await loadProducts();
});

async function loadCategoryFilters() {
  try {
    const categories = await Api.get("/categories");
    const list = document.getElementById("filter-categories");
    const items = categories
      .map(
        (c) =>
          `<li><a href="#" data-cat="${c._id}" class="${state.category === c._id ? "active" : ""}">${escapeHtml(c.name)}</a></li>`
      )
      .join("");
    list.innerHTML = `<li><a href="#" data-cat="" class="${state.category === "" ? "active" : ""}">All categories</a></li>${items}`;

    list.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        state.category = a.dataset.cat;
        state.page = 1;
        list.querySelectorAll("a").forEach((x) => x.classList.remove("active"));
        a.classList.add("active");
        loadProducts();
      });
    });
  } catch (e) {
    /* silently ignore filter load errors */
  }
}

async function loadProducts() {
  const grid = document.getElementById("product-grid");
  const resultCount = document.getElementById("result-count");
  grid.innerHTML = `<span class="spinner">Loading products…</span>`;

  const qs = new URLSearchParams();
  if (state.category) qs.set("category", state.category);
  if (state.keyword) qs.set("keyword", state.keyword);
  if (state.featured) qs.set("featured", state.featured);
  if (state.minPrice) qs.set("minPrice", state.minPrice);
  if (state.maxPrice) qs.set("maxPrice", state.maxPrice);
  qs.set("sort", state.sort);
  qs.set("page", state.page);
  qs.set("limit", state.limit);

  try {
    const data = await Api.get(`/products?${qs.toString()}`);
    resultCount.textContent = `${data.total} product${data.total === 1 ? "" : "s"} found`;

    if (data.products.length === 0) {
      grid.innerHTML = `<div class="empty-state">No products match these filters. Try clearing them.</div>`;
    } else {
      grid.innerHTML = data.products.map(productCardHtml).join("");
    }

    renderPagination(data.page, data.pages);
  } catch (e) {
    resultCount.textContent = "";
    grid.innerHTML = `<div class="empty-state">Could not load products: ${escapeHtml(e.message)}</div>`;
  }
}

function renderPagination(page, pages) {
  const el = document.getElementById("pagination");
  if (pages <= 1) {
    el.innerHTML = "";
    return;
  }
  let html = "";
  for (let i = 1; i <= pages; i++) {
    html += `<button class="${i === page ? "active" : ""}" data-page="${i}">${i}</button>`;
  }
  el.innerHTML = html;
  el.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.page = Number(btn.dataset.page);
      loadProducts();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}
