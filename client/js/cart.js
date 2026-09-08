document.addEventListener("DOMContentLoaded", async () => {
  renderHeader();
  renderFooter();
  if (!requireLogin()) return;
  await loadCart();
});

async function loadCart() {
  const root = document.getElementById("cart-root");
  try {
    const [cart, store] = await Promise.all([Api.get("/cart"), Api.get("/store/config")]);
    const items = (cart.items || []).filter((item) => item.product);
    if (!items.length) {
      root.innerHTML = `
        <div class="empty-state spacious">
          <span class="empty-kicker">Your cart is clear</span>
          <h2>Ready to find something useful?</h2>
          <p>Browse the catalog and add products you want to compare or buy.</p>
          <a href="products.html" class="btn btn-primary">Continue shopping</a>
        </div>
      `;
      return;
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = subtotal >= store.freeShippingThreshold ? 0 : store.flatShippingFee;
    const total = subtotal + shipping;
    root.innerHTML = `
      <div class="cart-layout">
        <div class="cart-items">
          <div class="cart-list-heading">
            <h2>${items.length} item${items.length === 1 ? "" : "s"}</h2>
            <button class="text-button danger-text" type="button" id="clear-cart">Clear cart</button>
          </div>
          ${items.map(cartRow).join("")}
        </div>
        <aside class="summary-card" aria-label="Order summary">
          <span class="eyebrow">Summary</span>
          <h2>Order total</h2>
          <div class="summary-row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
          <div class="summary-row"><span>Delivery</span><span>${shipping ? money(shipping) : "Free"}</span></div>
          ${shipping ? `<p class="shipping-progress">Add ${money(store.freeShippingThreshold - subtotal)} more for free delivery.</p>` : `<p class="shipping-progress success-text">Your order qualifies for free delivery.</p>`}
          <div class="summary-row summary-total"><span>Total</span><span>${money(total)}</span></div>
          <a href="checkout.html" class="btn btn-primary btn-block">Continue to checkout</a>
          <a href="products.html" class="summary-link">Keep shopping</a>
          <p class="summary-note">Final prices and stock are checked again before the order is created.</p>
        </aside>
      </div>
    `;
    bindCart(items);
  } catch (error) {
    root.innerHTML = `<div class="empty-state"><h2>Cart unavailable</h2><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function cartRow(item) {
  const image = item.product.images?.length ? resolveImage(item.product.images[0]) : "";
  return `
    <article class="cart-row" data-item-id="${item._id}" data-stock="${item.product.stock}">
      <a class="cart-thumb" href="product-detail.html?id=${item.product._id}">
        ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(item.product.name)}" />` : `<span>${escapeHtml(item.product.name.charAt(0))}</span>`}
      </a>
      <div class="cart-product">
        <a href="product-detail.html?id=${item.product._id}">${escapeHtml(item.product.name)}</a>
        <span>${money(item.price)} each</span>
        <button class="remove-link" type="button">Remove</button>
      </div>
      <div class="cart-qty">
        <button class="btn-icon qty-decrease" type="button" aria-label="Decrease quantity">−</button>
        <label class="sr-only" for="qty-${item._id}">Quantity</label>
        <input id="qty-${item._id}" type="number" class="qty-value" min="1" max="${item.product.stock}" value="${item.quantity}" />
        <button class="btn-icon qty-increase" type="button" aria-label="Increase quantity">+</button>
      </div>
      <strong class="cart-line-total">${money(item.price * item.quantity)}</strong>
    </article>
  `;
}

function bindCart() {
  document.querySelectorAll(".cart-row").forEach((row) => {
    const input = row.querySelector(".qty-value");
    const maximum = Number(row.dataset.stock);
    const update = async (value) => {
      const quantity = Math.min(Math.max(Number(value) || 1, 1), maximum);
      input.value = quantity;
      row.classList.add("is-updating");
      try {
        await Api.put("/cart/" + row.dataset.itemId, { quantity });
        await loadCart();
        refreshCartBadge();
      } catch (error) {
        row.classList.remove("is-updating");
        window.alert(error.message);
      }
    };
    row.querySelector(".qty-decrease").addEventListener("click", () => update(Number(input.value) - 1));
    row.querySelector(".qty-increase").addEventListener("click", () => update(Number(input.value) + 1));
    input.addEventListener("change", () => update(input.value));
    row.querySelector(".remove-link").addEventListener("click", async () => {
      row.classList.add("is-updating");
      try {
        await Api.del("/cart/" + row.dataset.itemId);
        await loadCart();
        refreshCartBadge();
      } catch (error) {
        row.classList.remove("is-updating");
        window.alert(error.message);
      }
    });
  });

  document.getElementById("clear-cart")?.addEventListener("click", async () => {
    if (!window.confirm("Remove every item from your cart?")) return;
    await Api.del("/cart");
    await loadCart();
    refreshCartBadge();
  });
}
