document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAdmin()) return;
  renderAdminShell("orders");

  document.getElementById("status-filter").addEventListener("change", loadOrders);
  await loadOrders();
});

async function loadOrders() {
  const root = document.getElementById("orders-root");
  const status = document.getElementById("status-filter").value;
  root.innerHTML = `<span class="spinner">Loading orders…</span>`;

  try {
    const qs = status ? `?status=${status}&limit=100` : `?limit=100`;
    const data = await Api.get(`/orders${qs}`);

    if (data.orders.length === 0) {
      root.innerHTML = `<div class="empty-state">No orders found.</div>`;
      return;
    }

    root.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Paid</th><th>Status</th><th>Update</th></tr></thead>
        <tbody>
          ${data.orders
            .map(
              (o) => `
            <tr>
              <td>#${o._id.slice(-8).toUpperCase()}<br /><span style="color:var(--ink-soft);font-size:0.8rem;">${new Date(o.createdAt).toLocaleDateString()}</span></td>
              <td>${o.user ? escapeHtml(o.user.name) : "Unknown"}</td>
              <td>${money(o.totalAmount)}</td>
              <td>${o.isPaid ? "Yes" : "No"}</td>
              <td><span class="status-pill status-${o.status}">${o.status}</span></td>
              <td>
                <select data-order="${o._id}" class="status-select">
                  ${["pending", "processing", "shipped", "delivered", "cancelled"]
                    .map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`)
                    .join("")}
                </select>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;

    root.querySelectorAll(".status-select").forEach((select) => {
      select.addEventListener("change", async () => {
        try {
          await Api.put(`/orders/${select.dataset.order}/status`, { status: select.value });
          showTopAlert("Order status updated.", "success");
          loadOrders();
        } catch (e) {
          showTopAlert(e.message, "error");
        }
      });
    });
  } catch (e) {
    root.innerHTML = `<div class="empty-state">Could not load orders: ${escapeHtml(e.message)}</div>`;
  }
}

function showTopAlert(message, type) {
  const box = document.getElementById("alert-box");
  box.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
  setTimeout(() => (box.innerHTML = ""), 3000);
}
