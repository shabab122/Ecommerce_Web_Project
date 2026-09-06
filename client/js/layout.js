/**
 * Renders the shared header and footer into #site-header / #site-footer
 * placeholders that every page includes. Keeping this in one place means
 * nav/login state stays consistent across the whole site.
 */
function renderHeader(activePage = "") {
  const user = Api.getUser();
  const header = document.getElementById("site-header");
  if (!header) return;

  header.innerHTML = `
    <div class="header-inner container">
      <a href="index.html" class="logo">Nor<span>da</span></a>
      <nav class="main-nav">
        <a href="index.html" class="${activePage === "home" ? "active" : ""}">Home</a>
        <a href="products.html" class="${activePage === "products" ? "active" : ""}">Shop</a>
        <a href="orders.html" class="${activePage === "orders" ? "active" : ""}">My Orders</a>
        ${user && user.role === "admin" ? `<a href="admin/dashboard.html">Admin</a>` : ""}
      </nav>
      <form class="search-form" onsubmit="event.preventDefault(); window.location.href='products.html?keyword=' + encodeURIComponent(this.q.value);">
        <input type="text" name="q" placeholder="Search products..." aria-label="Search products" />
        <button type="submit" aria-label="Search">Search</button>
      </form>
      <div class="header-actions">
        <a href="cart.html" class="icon-link">Cart <span id="cart-count" class="badge hidden">0</span></a>
        ${
          user
            ? `<a href="#" id="logout-link" class="icon-link">Logout (${escapeHtml(user.name.split(" ")[0])})</a>`
            : `<a href="login.html" class="icon-link">Login</a>`
        }
      </div>
      <button class="mobile-toggle" id="mobile-toggle" aria-label="Menu">&#9776;</button>
    </div>
  `;

  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      Api.logout();
      window.location.href = "index.html";
    });
  }

  refreshCartBadge();
}

function renderFooter() {
  const footer = document.getElementById("site-footer");
  if (!footer) return;
  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div>
          <h4>Norda</h4>
          <p>A straightforward marketplace for electronics, fashion, home goods, sports gear and books.</p>
        </div>
        <div>
          <h4>Shop</h4>
          <ul>
            <li><a href="products.html">All products</a></li>
            <li><a href="cart.html">Cart</a></li>
            <li><a href="orders.html">My orders</a></li>
          </ul>
        </div>
        <div>
          <h4>Account</h4>
          <ul>
            <li><a href="login.html">Login</a></li>
            <li><a href="register.html">Create account</a></li>
          </ul>
        </div>
        <div>
          <h4>Info</h4>
          <ul>
            <li>Shipping &amp; returns</li>
            <li>Contact support</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; ${new Date().getFullYear()} Norda. Built with Node.js, Express and MongoDB.</span>
        <span>Demo storefront</span>
      </div>
    </div>
  `;
}

async function refreshCartBadge() {
  const badge = document.getElementById("cart-count");
  if (!badge) return;
  if (!Api.isLoggedIn()) {
    badge.classList.add("hidden");
    return;
  }
  try {
    const cart = await Api.get("/cart");
    const count = (cart.items || []).reduce((sum, i) => sum + i.quantity, 0);
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  } catch (e) {
    badge.classList.add("hidden");
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function requireLogin(redirectTo = "login.html") {
  if (!Api.isLoggedIn()) {
    window.location.href = `${redirectTo}?next=${encodeURIComponent(window.location.pathname.split("/").pop())}`;
    return false;
  }
  return true;
}

function requireAdmin() {
  if (!Api.isLoggedIn() || !Api.isAdmin()) {
    window.location.href = "../login.html";
    return false;
  }
  return true;
}

function money(n) {
  return `$${Number(n).toFixed(2)}`;
}
