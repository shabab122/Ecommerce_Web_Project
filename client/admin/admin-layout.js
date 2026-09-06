function renderAdminShell(activePage) {
  const bar = document.getElementById("admin-topbar-user");
  const user = Api.getUser();

  document.getElementById("admin-sidebar").innerHTML = `
    <a href="../index.html" class="logo" style="margin-bottom:20px;">Nor<span>da</span> Admin</a>
    <a href="dashboard.html" class="${activePage === "dashboard" ? "active" : ""}">Dashboard</a>
    <a href="products.html" class="${activePage === "products" ? "active" : ""}">Products</a>
    <a href="categories.html" class="${activePage === "categories" ? "active" : ""}">Categories</a>
    <a href="orders.html" class="${activePage === "orders" ? "active" : ""}">Orders</a>
    <a href="../index.html">View storefront</a>
    <a href="#" id="admin-logout">Logout</a>
  `;

  if (bar && user) bar.textContent = user.name;

  document.getElementById("admin-logout").addEventListener("click", (e) => {
    e.preventDefault();
    Api.logout();
    window.location.href = "../login.html";
  });
}
