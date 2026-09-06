document.addEventListener("DOMContentLoaded", async () => {
  renderHeader();
  renderFooter();

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const root = document.getElementById("pd-root");

  if (!id) {
    root.innerHTML = `<div class="empty-state">No product specified.</div>`;
    return;
  }

  try {
    const product = await Api.get(`/products/${id}`);
    document.title = `${product.name} — Norda`;
    renderProduct(product);
    loadReviews(id);
  } catch (e) {
    root.innerHTML = `<div class="empty-state">Could not load this product: ${escapeHtml(e.message)}</div>`;
  }
});

function renderProduct(p) {
  const hasDiscount = p.discountPrice && p.discountPrice > 0 && p.discountPrice < p.price;
  const shownPrice = hasDiscount ? p.discountPrice : p.price;
  const img = p.images && p.images.length ? `<img src="${resolveImage(p.images[0])}" alt="${escapeHtml(p.name)}" />` : `<span>${escapeHtml(p.name)}</span>`;

  document.getElementById("pd-root").innerHTML = `
    <div class="breadcrumb"><a href="index.html">Home</a> / <a href="products.html">Shop</a> / ${escapeHtml(p.name)}</div>
    <div class="product-detail">
      <div class="pd-gallery">${img}</div>
      <div>
        <span class="pd-cat">${p.category ? escapeHtml(p.category.name) : ""}</span>
        <h1 class="pd-title">${escapeHtml(p.name)}</h1>
        ${p.ratingCount ? `<span class="rating">★ ${p.ratingAverage.toFixed(1)} out of 5 (${p.ratingCount} review${p.ratingCount === 1 ? "" : "s"})</span>` : `<span class="rating">No reviews yet</span>`}
        <div class="pd-price">
          <span class="price-now">${money(shownPrice)}</span>
          ${hasDiscount ? `<span class="price-old">${money(p.price)}</span>` : ""}
        </div>
        <p>${escapeHtml(p.description || "No description provided.")}</p>
        <div class="pd-actions">
          <input type="number" id="qty-input" class="qty-input" value="1" min="1" max="${Math.max(p.stock, 1)}" ${p.stock === 0 ? "disabled" : ""} />
          <button id="add-to-cart-btn" class="btn btn-primary" ${p.stock === 0 ? "disabled" : ""}>${p.stock === 0 ? "Out of stock" : "Add to cart"}</button>
        </div>
        <div id="pd-alert"></div>
        <div class="pd-meta">
          <div>Brand: ${escapeHtml(p.brand || "Generic")}</div>
          <div>${p.stock > 0 ? `${p.stock} in stock` : "Currently unavailable"}</div>
        </div>
      </div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" data-tab="reviews">Reviews</button>
      <button class="tab-btn" data-tab="write-review">Write a review</button>
    </div>
    <div class="tab-panel active" id="tab-reviews">
      <div id="review-list"><span class="spinner">Loading reviews…</span></div>
    </div>
    <div class="tab-panel" id="tab-write-review">
      ${
        Api.isLoggedIn()
          ? `
        <form id="review-form">
          <div class="field">
            <label for="review-rating">Rating</label>
            <select id="review-rating">
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Good</option>
              <option value="3">3 - Average</option>
              <option value="2">2 - Poor</option>
              <option value="1">1 - Terrible</option>
            </select>
          </div>
          <div class="field">
            <label for="review-comment">Comment</label>
            <textarea id="review-comment" rows="4" placeholder="Share your thoughts about this product"></textarea>
          </div>
          <button type="submit" class="btn btn-primary">Submit review</button>
        </form>
        <div id="review-form-alert"></div>
      `
          : `<p>Please <a href="login.html">log in</a> to write a review.</p>`
      }
    </div>
  `;

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((tp) => tp.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });

  const addBtn = document.getElementById("add-to-cart-btn");
  if (addBtn) {
    addBtn.addEventListener("click", async () => {
      if (!requireLogin()) return;
      const qty = Number(document.getElementById("qty-input").value) || 1;
      const alertBox = document.getElementById("pd-alert");
      try {
        await Api.post("/cart", { productId: p._id, quantity: qty });
        alertBox.innerHTML = `<div class="alert alert-success">Added to cart.</div>`;
        refreshCartBadge();
      } catch (e) {
        alertBox.innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
      }
    });
  }

  const reviewForm = document.getElementById("review-form");
  if (reviewForm) {
    reviewForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const rating = Number(document.getElementById("review-rating").value);
      const comment = document.getElementById("review-comment").value.trim();
      const alertBox = document.getElementById("review-form-alert");
      try {
        await Api.post("/reviews", { productId: p._id, rating, comment });
        alertBox.innerHTML = `<div class="alert alert-success">Thanks for your review!</div>`;
        loadReviews(p._id);
      } catch (e2) {
        alertBox.innerHTML = `<div class="alert alert-error">${escapeHtml(e2.message)}</div>`;
      }
    });
  }
}

async function loadReviews(productId) {
  const list = document.getElementById("review-list");
  try {
    const reviews = await Api.get(`/reviews/product/${productId}`);
    if (reviews.length === 0) {
      list.innerHTML = `<p>No reviews yet. Be the first to share your thoughts.</p>`;
      return;
    }
    list.innerHTML = reviews
      .map(
        (r) => `
        <div class="review-item">
          <div class="rev-head">
            <span>${escapeHtml(r.user ? r.user.name : "Anonymous")}</span>
            <span class="stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span>
          </div>
          <p>${escapeHtml(r.comment || "")}</p>
        </div>
      `
      )
      .join("");
  } catch (e) {
    list.innerHTML = `<p>Could not load reviews.</p>`;
  }
}
