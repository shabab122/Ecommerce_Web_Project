document.addEventListener("DOMContentLoaded", async () => {
  renderHeader("orders");
  renderFooter();
  if (!requireLogin()) return;

  const params = new URLSearchParams(window.location.search);
  const justPlaced = params.get("placed");
  await loadOrders(justPlaced);
});

async function loadOrders(justPlaced) {
  const root = document.getElementById("orders-root");
  try {
    const orders = await Api.get("/orders/my");

    let banner = "";
    if (justPlaced) {
      banner = `<div class="alert alert-success">Order placed successfully! Order ID: ${escapeHtml(justPlaced)}</div>`;
    }

    if (orders.length === 0) {
      root.innerHTML = `${banner}<div class="empty-state">You haven't placed any orders yet. <a href="products.html">Start shopping</a>.</div>`;
      return;
    }

    root.innerHTML =
      banner +
      orders
        .map(
          (o) => `
        <div class="order-card">
          <div class="order-head">
            <div>
              <strong>Order #${o._id.slice(-8).toUpperCase()}</strong>
              <div style="font-size:0.85rem;color:var(--ink-soft);">${new Date(o.createdAt).toLocaleString()}</div>
            </div>
            <span class="status-pill status-${o.status}">${o.status}</span>
          </div>
          ${o.items
            .map((i) => `<div class="order-line"><span>${escapeHtml(i.name)} × ${i.quantity}</span><span>${money(i.price * i.quantity)}</span></div>`)
            .join("")}
          <div class="order-line" style="font-weight:700;border-top:1px solid var(--border);padding-top:10px;margin-top:6px;">
            <span>Total</span><span>${money(o.totalAmount)}</span>
          </div>
        </div>
      `
        )
        .join("");
  } catch (e) {
    root.innerHTML = `<div class="empty-state">Could not load orders: ${escapeHtml(e.message)}</div>`;
  }
}
