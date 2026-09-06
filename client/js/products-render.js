/** Builds the HTML for one product card, shared by home + shop pages. */
function productCardHtml(p) {
  const hasDiscount = p.discountPrice && p.discountPrice > 0 && p.discountPrice < p.price;
  const shownPrice = hasDiscount ? p.discountPrice : p.price;
  const img = p.images && p.images.length ? `<img src="${resolveImage(p.images[0])}" alt="${escapeHtml(p.name)}" />` : `<span>${escapeHtml(p.name)}</span>`;
  const catName = p.category && p.category.name ? p.category.name : "";

  let stockNote = "";
  if (p.stock === 0) stockNote = `<span class="stock-out">Out of stock</span>`;
  else if (p.stock <= 5) stockNote = `<span class="stock-low">Only ${p.stock} left</span>`;

  return `
    <a class="product-card" href="product-detail.html?id=${p._id}">
      <div class="product-thumb">
        ${hasDiscount ? `<span class="tag">Sale</span>` : ""}
        ${img}
      </div>
      <div class="product-info">
        <span class="product-cat">${escapeHtml(catName)}</span>
        <span class="product-name">${escapeHtml(p.name)}</span>
        <div class="product-price">
          <span class="price-now">${money(shownPrice)}</span>
          ${hasDiscount ? `<span class="price-old">${money(p.price)}</span>` : ""}
        </div>
        ${p.ratingCount ? `<span class="rating">★ ${p.ratingAverage.toFixed(1)} (${p.ratingCount})</span>` : ""}
        ${stockNote}
      </div>
    </a>
  `;
}

function resolveImage(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  // uploaded images are served from the API server's /uploads path
  const base = API_BASE_URL.replace(/\/api$/, "");
  return `${base}${path}`;
}
