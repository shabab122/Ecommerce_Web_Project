document.addEventListener("DOMContentLoaded", async () => {
  renderHeader();
  renderFooter();

  if (!requireLogin()) return;
  await loadCart();
});

function resolveImageSafe(images) {
  if (images && images.length) return resolveImage(images[0]);
  return "";
}

async function loadCart() {
  const root = document.getElementById("cart-root");
  try {
    const cart = await Api.get("/cart");
    const items = (cart.items || []).filter((i) => i.product);

    if (items.length === 0) {
      root.innerHTML = `
        <div class="empty-state">
          Your cart is empty.
          <br /><br />
          <a href="products.html" class="btn btn-primary">Continue shopping</a>
        </div>
      `;
      return;
    }

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shipping = subtotal >= 50 ? 0 : 6.99;
    const total = subtotal + shipping;

    root.innerHTML = `
      <div class="cart-layout">
        <div>
          ${items
            .map(
              (item) => `
            <div class="cart-row" data-item-id="${item._id}" data-stock="${item.product.stock}">
              <div class="cart-thumb">${
                resolveImageSafe(item.product.images)
                  ? `<img src="${resolveImageSafe(item.product.images)}" alt="${escapeHtml(item.product.name)}" />`
                  : ""
              }</div>
              <div>
                <a href="product-detail.html?id=${item.product._id}"><strong>${escapeHtml(item.product.name)}</strong></a>
                <div>${money(item.price)} each</div>
              </div>
              <div class="cart-qty">
                <button class="btn-icon qty-decrease" aria-label="Decrease quantity">−</button>
                <input type="number" class="qty-value" min="1" max="${item.product.stock}" value="${item.quantity}" />
                <button class="btn-icon qty-increase" aria-label="Increase quantity">+</button>
              </div>
              <div style="text-align:right;">
                <div><strong>${money(item.price * item.quantity)}</strong></div>
                <button class="remove-link">Remove</button>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
        <div class="summary-card">
          <h3>Order summary</h3>
          <div class="summary-row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
          <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? "Free" : money(shipping)}</span></div>
          <div class="summary-row summary-total"><span>Total</span><span>${money(total)}</span></div>
          <a href="checkout.html" class="btn btn-primary btn-block">Proceed to checkout</a>
        </div>
      </div>
    `;

    attachCartHandlers();
  } catch (e) {
    root.innerHTML = `<div class="empty-state">Could not load cart: ${escapeHtml(e.message)}</div>`;
  }
}

function attachCartHandlers() {
  document.querySelectorAll(".cart-row").forEach((row) => {
    const itemId = row.dataset.itemId;
    const maxStock = Number(row.dataset.stock);
    const input = row.querySelector(".qty-value");

    row.querySelector(".qty-decrease").addEventListener("click", () => {
      const val = Math.max(1, Number(input.value) - 1);
      input.value = val;
      updateQuantity(itemId, val);
    });
    row.querySelector(".qty-increase").addEventListener("click", () => {
      const val = Math.min(maxStock, Number(input.value) + 1);
      input.value = val;
      updateQuantity(itemId, val);
    });
    input.addEventListener("change", () => {
      let val = Number(input.value);
      if (val < 1) val = 1;
      if (val > maxStock) val = maxStock;
      input.value = val;
      updateQuantity(itemId, val);
    });
    row.querySelector(".remove-link").addEventListener("click", () => removeItem(itemId));
  });
}

async function updateQuantity(itemId, quantity) {
  try {
    await Api.put(`/cart/${itemId}`, { quantity });
    await loadCart();
    refreshCartBadge();
  } catch (e) {
    alert(e.message);
  }
}

async function removeItem(itemId) {
  try {
    await Api.del(`/cart/${itemId}`);
    await loadCart();
    refreshCartBadge();
  } catch (e) {
    alert(e.message);
  }
}
