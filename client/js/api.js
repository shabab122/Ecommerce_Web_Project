/**
 * Thin wrapper around fetch() that attaches the JWT (if present) and
 * normalizes error handling for the whole frontend.
 */
const Api = {
  getToken() {
    return localStorage.getItem("norda_token");
  },

  setSession(user) {
    localStorage.setItem("norda_token", user.token);
    localStorage.setItem(
      "norda_user",
      JSON.stringify({ _id: user._id, name: user.name, email: user.email, role: user.role })
    );
  },

  getUser() {
    const raw = localStorage.getItem("norda_user");
    return raw ? JSON.parse(raw) : null;
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  isAdmin() {
    const user = this.getUser();
    return !!user && user.role === "admin";
  },

  logout() {
    localStorage.removeItem("norda_token");
    localStorage.removeItem("norda_user");
  },

  async request(path, { method = "GET", body, isForm = false } = {}) {
    const headers = {};
    const token = this.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (!isForm) headers["Content-Type"] = "application/json";

    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });

    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }

    if (!res.ok) {
      const message = (data && data.message) || `Request failed with status ${res.status}`;
      throw new Error(message);
    }
    return data;
  },

  get(path) {
    return this.request(path);
  },
  post(path, body, opts = {}) {
    return this.request(path, { method: "POST", body, ...opts });
  },
  put(path, body, opts = {}) {
    return this.request(path, { method: "PUT", body, ...opts });
  },
  del(path) {
    return this.request(path, { method: "DELETE" });
  },
};
