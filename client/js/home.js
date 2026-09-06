document.addEventListener("DOMContentLoaded", async () => {
  renderHeader("home");
  renderFooter();

  try {
    const categories = await Api.get("/categories");
    document.getElementById("stat-categories").textContent = categories.length;

    const strip = document.getElementById("category-strip");
    strip.innerHTML = categories
      .map((c) => `<a class="category-chip" href="products.html?category=${c._id}">${escapeHtml(c.name)}</a>`)
      .join("");
  } catch (e) {
    document.getElementById("category-strip").innerHTML = `<span>Could not load categories.</span>`;
  }

  try {
    const featured = await Api.get("/products?featured=true&limit=8");
    renderGrid("featured-grid", featured.products);
  } catch (e) {
    renderGrid("featured-grid", []);
  }

  try {
    const latest = await Api.get("/products?sort=newest&limit=8");
    renderGrid("new-grid", latest.products);
  } catch (e) {
    renderGrid("new-grid", []);
  }
});

function renderGrid(elementId, products) {
  const el = document.getElementById(elementId);
  if (!products || products.length === 0) {
    el.innerHTML = `<div class="empty-state">No products to show yet. Try running the seed script.</div>`;
    return;
  }
  el.innerHTML = products.map(productCardHtml).join("");
}
