document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderFooter();

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAlert();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      try {
        const user = await Api.post("/auth/login", { email, password });
        Api.setSession(user);
        const params = new URLSearchParams(window.location.search);
        const next = params.get("next");
        window.location.href = user.role === "admin" ? "admin/dashboard.html" : next && next !== "login.html" ? next : "index.html";
      } catch (err) {
        showAlert(err.message, "error");
      }
    });
  }

  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAlert();
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      try {
        const user = await Api.post("/auth/register", { name, email, password });
        Api.setSession(user);
        showAlert("Account created! Redirecting…", "success");
        setTimeout(() => (window.location.href = "index.html"), 700);
      } catch (err) {
        showAlert(err.message, "error");
      }
    });
  }
});

function showAlert(message, type) {
  const box = document.getElementById("alert-box");
  if (!box) return;
  box.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
}
function clearAlert() {
  const box = document.getElementById("alert-box");
  if (box) box.innerHTML = "";
}
