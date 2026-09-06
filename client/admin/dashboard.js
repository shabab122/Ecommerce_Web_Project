document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAdmin()) return;
  renderAdminShell("dashboard");
  await loadDashboard();
});

async function loadDashboard() {
  const root = document.getElementById("dashboard-root");
  try {
    const s = await Api.get("/admin/dashboard-summary");
    root.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${s.totalProducts}</div><div class="stat-label">Products</div></div>
        <div class="stat-card"><div class="stat-value">${s.totalCategories}</div><div class="stat-label">Categories</div></div>
        <div class="stat-card"><div class="stat-value">${s.totalUsers}</div><div class="stat-label">Customers</div></div>
        <div class="stat-card"><div class="stat-value">${s.totalOrders}</div><div class="stat-label">Orders</div></div>
        <div class="stat-card"><div class="stat-value">${money(s.totalRevenue)}</div><div class="stat-label">Revenue (paid orders)</div></div>
        <div class="stat-card"><div class="stat-value">${s.pendingOrders}</div><div class="stat-label">Pending orders</div></div>
      </div>

      <h3>Low stock products (5 or fewer left)</h3>
      ${
        s.lowStockProducts.length === 0
          ? `<p>Nothing running low right now.</p>`
          : `<table class="data-table">
              <thead><tr><th>Product</th><th>Stock left</th></tr></thead>
              <tbody>
                ${s.lowStockProducts.map((p) => `<tr><td>${escapeHtml(p.name)}</td><td>${p.stock}</td></tr>`).join("")}
              </tbody>
            </table>`
      }
    `;
  } catch (e) {
    root.innerHTML = `<div class="empty-state">Could not load dashboard: ${escapeHtml(e.message)}</div>`;
  }
}
