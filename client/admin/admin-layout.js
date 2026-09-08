function renderAdminShell(activePage) {
  const bar = document.getElementById("admin-topbar-user");
  const user = Api.getUser();

  document.getElementById("admin-sidebar").innerHTML = `
    <a href="../index.html" class="logo admin-logo">NOR<span>DA</span><small>Admin</small></a>
    <nav aria-label="Admin navigation">
      <span class="admin-nav-label">Workspace</span>
      <a href="dashboard.html" class="${activePage === "dashboard" ? "active" : ""}">Overview</a>
      <a href="products.html" class="${activePage === "products" ? "active" : ""}">Products</a>
      <a href="categories.html" class="${activePage === "categories" ? "active" : ""}">Categories</a>
      <a href="brands.html" class="${activePage === "brands" ? "active" : ""}">Brands</a>
      <a href="orders.html" class="${activePage === "orders" ? "active" : ""}">Orders</a>
      <a href="invoices.html" class="${activePage === "invoices" ? "active" : ""}">Invoices</a>
    </nav>
    <div class="admin-sidebar-foot">
      <a href="../index.html">View storefront ↗</a>
      <a href="#" id="admin-logout">Sign out</a>
    </div>
  `;

  if (bar && user) bar.textContent = user.name;

  document.getElementById("admin-logout").addEventListener("click", async (e) => {
    e.preventDefault();
    await Api.post("/auth/logout").catch(() => {});
    Api.logout();
    window.location.href = "../login.html";
  });
}
