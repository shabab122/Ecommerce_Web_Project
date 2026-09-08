function renderHeader(activePage = "") {
  const user = Api.getUser();
  const header = document.getElementById("site-header");
  if (!header) return;

  header.innerHTML = `
    <div class="announcement-bar">
      <div class="container announcement-inner">
        <span>Free delivery on orders over ৳5,000</span>
        <span>Secure checkout · Honest pricing</span>
      </div>
    </div>
    <div class="site-header">
      <div class="header-inner container">
        <a href="index.html" class="logo" aria-label="Norda home">NOR<span>DA</span></a>
        <button class="mobile-toggle" id="mobile-toggle" type="button" aria-controls="header-menu" aria-expanded="false">
          <span></span><span></span><span></span><span class="sr-only">Open menu</span>
        </button>
        <div class="header-menu" id="header-menu">
          <nav class="main-nav" aria-label="Primary navigation">
            <a href="index.html" class="${activePage === "home" ? "active" : ""}">Home</a>
            <a href="products.html" class="${activePage === "products" ? "active" : ""}">Shop</a>
            ${user ? `<a href="orders.html" class="${activePage === "orders" ? "active" : ""}">Orders</a>` : ""}
            ${user ? `<a href="profile.html" class="${activePage === "profile" ? "active" : ""}">Profile</a>` : ""}
            ${user?.role === "admin" ? `<a href="admin/dashboard.html">Admin</a>` : ""}
          </nav>
          <form class="search-form" id="global-search-form" role="search">
            <label class="sr-only" for="global-search">Search products</label>
            <input type="search" id="global-search" name="q" placeholder="Search products or brands" autocomplete="off" />
            <button type="submit">Search</button>
          </form>
        </div>
        <div class="header-actions">
          <a href="cart.html" class="icon-link cart-link">
            <span>Cart</span><span id="cart-count" class="badge hidden">0</span>
          </a>
          ${
            user
              ? `<button type="button" id="logout-link" class="text-button">Sign out</button>`
              : `<a href="login.html" class="icon-link">Sign in</a>`
          }
        </div>
      </div>
    </div>
  `;

  const searchForm = document.getElementById("global-search-form");
  const searchInput = document.getElementById("global-search");
  const keyword = new URLSearchParams(window.location.search).get("keyword");
  if (keyword && searchInput) searchInput.value = keyword;
  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();
    window.location.href = "products.html" + (query ? "?keyword=" + encodeURIComponent(query) : "");
  });

  const toggle = document.getElementById("mobile-toggle");
  const menu = document.getElementById("header-menu");
  toggle?.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  document.getElementById("logout-link")?.addEventListener("click", async () => {
    await Api.post("/auth/logout").catch(() => {});
    Api.logout();
    window.location.href = "index.html";
  });

  refreshCartBadge();
}

function renderFooter() {
  const footer = document.getElementById("site-footer");
  if (!footer) return;
  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="index.html" class="logo">NOR<span>DA</span></a>
          <p>Useful things, thoughtfully selected for everyday life in Bangladesh.</p>
        </div>
        <div>
          <h4>Shop</h4>
          <ul>
            <li><a href="products.html">All products</a></li>
            <li><a href="products.html?featured=true">Featured picks</a></li>
            <li><a href="cart.html">Cart</a></li>
          </ul>
        </div>
        <div>
          <h4>Account</h4>
          <ul>
            <li><a href="profile.html">Profile</a></li>
            <li><a href="orders.html">Orders & invoices</a></li>
            <li><a href="login.html">Sign in</a></li>
          </ul>
        </div>
        <div>
          <h4>Store</h4>
          <ul>
            <li>Dhaka, Bangladesh</li>
            <li>Secure online payment</li>
            <li>14-day return window</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; ${new Date().getFullYear()} Norda</span>
        <span>Built for clear, dependable shopping.</span>
      </div>
    </div>
  `;
}

async function refreshCartBadge() {
  const badge = document.getElementById("cart-count");
  if (!badge || !Api.isLoggedIn()) {
    badge?.classList.add("hidden");
    return;
  }
  try {
    const cart = await Api.get("/cart");
    const count = (cart.items || []).reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.classList.toggle("hidden", count === 0);
  } catch {
    badge.classList.add("hidden");
  }
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value === null || value === undefined ? "" : String(value);
  return div.innerHTML;
}

function resolveImage(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const serverBase = API_BASE_URL.replace(/\/api\/?$/, "");
  return serverBase + (value.startsWith("/") ? value : "/" + value);
}

function requireLogin(redirectTo = "login.html") {
  if (Api.isLoggedIn()) return true;
  const current = window.location.pathname.split("/").pop() + window.location.search;
  window.location.href = redirectTo + "?next=" + encodeURIComponent(current);
  return false;
}

function requireAdmin() {
  if (Api.isAdmin()) return true;
  window.location.href = "../login.html";
  return false;
}

function money(value) {
  const amount = Number(value);
  return "৳" + (Number.isFinite(amount) ? amount : 0).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(value, includeTime = false) {
  const options = includeTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" };
  return new Intl.DateTimeFormat("en-BD", options).format(new Date(value));
}

function paymentLabel(value) {
  return {
    pending: "Payment pending",
    paid: "Paid",
    failed: "Payment failed",
    cancelled: "Payment cancelled",
  }[value] || value;
}
