document.addEventListener("DOMContentLoaded", async () => {
  renderHeader();
  renderFooter();
  if (!requireLogin()) return;
  await loadCheckout();
});

async function loadCheckout() {
  const root = document.getElementById("checkout-root");
  try {
    const cart = await Api.get("/cart");
    const items = (cart.items || []).filter((i) => i.product);

    if (items.length === 0) {
      root.innerHTML = `<div class="empty-state">Your cart is empty. <a href="products.html">Go shopping</a>.</div>`;
      return;
    }

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shipping = subtotal >= 50 ? 0 : 6.99;
    const total = subtotal + shipping;

    root.innerHTML = `
      <div class="cart-layout">
        <div>
          <h3>Shipping details</h3>
          <div id="checkout-alert"></div>
          <form id="checkout-form">
            <div class="field">
              <label for="address-line">Street address</label>
              <input type="text" id="address-line" required placeholder="123 Market Street" />
            </div>
            <div class="field">
              <label for="city">City</label>
              <input type="text" id="city" required placeholder="Dhaka" />
            </div>
            <div class="field">
              <label for="postcode">Postal code</label>
              <input type="text" id="postcode" required placeholder="1207" />
            </div>
            <div class="field">
              <label for="phone">Phone number</label>
              <input type="tel" id="phone" required placeholder="+880 1XXXXXXXXX" />
            </div>
            <div class="field">
              <label for="payment-method">Payment method</label>
              <select id="payment-method">
                <option value="cod">Cash on delivery</option>
                <option value="card">Card (demo — no real charge)</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary btn-block" id="place-order-btn">Place order</button>
          </form>
        </div>
        <div class="summary-card">
          <h3>Order summary</h3>
          ${items
            .map(
              (i) => `<div class="summary-row"><span>${escapeHtml(i.product.name)} × ${i.quantity}</span><span>${money(i.price * i.quantity)}</span></div>`
            )
            .join("")}
          <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? "Free" : money(shipping)}</span></div>
          <div class="summary-row summary-total"><span>Total</span><span>${money(total)}</span></div>
        </div>
      </div>
    `;

    document.getElementById("checkout-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("place-order-btn");
      btn.disabled = true;
      btn.textContent = "Placing order…";
      const alertBox = document.getElementById("checkout-alert");

      const payload = {
        shippingAddress: {
          line1: document.getElementById("address-line").value.trim(),
          city: document.getElementById("city").value.trim(),
          postCode: document.getElementById("postcode").value.trim(),
          phone: document.getElementById("phone").value.trim(),
        },
        paymentMethod: document.getElementById("payment-method").value,
      };

      try {
        const order = await Api.post("/orders", payload);
        window.location.href = `orders.html?placed=${order._id}`;
      } catch (err) {
        alertBox.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
        btn.disabled = false;
        btn.textContent = "Place order";
      }
    });
  } catch (e) {
    root.innerHTML = `<div class="empty-state">Could not load checkout: ${escapeHtml(e.message)}</div>`;
  }
}
