const Api = {
  getToken() {
    return localStorage.getItem("norda_token");
  },

  setSession(user) {
    if (user.token) localStorage.setItem("norda_token", user.token);
    else localStorage.removeItem("norda_token");
    localStorage.setItem(
      "norda_user",
      JSON.stringify({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.address || null,
      })
    );
  },

  getUser() {
    try {
      const value = localStorage.getItem("norda_user");
      return value ? JSON.parse(value) : null;
    } catch {
      this.logout();
      return null;
    }
  },

  isLoggedIn() {
    return Boolean(this.getUser());
  },

  isAdmin() {
    return this.getUser()?.role === "admin";
  },

  logout() {
    localStorage.removeItem("norda_token");
    localStorage.removeItem("norda_user");
  },

  async request(path, { method = "GET", body, isForm = false } = {}) {
    const headers = { Accept: "application/json" };
    const token = this.getToken();
    if (token) headers.Authorization = "Bearer " + token;
    if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";

    let response;
    try {
      response = await fetch(API_BASE_URL + path, {
        method,
        headers,
        credentials: "include",
        body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      });
    } catch {
      throw new Error("Cannot reach the Norda server. Check that the API is running.");
    }

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");

    if (!response.ok) {
      const error = new Error(data?.message || "Request failed with status " + response.status);
      if (data?.orderId) error.orderId = data.orderId;
      if (data?.invoiceNumber) error.invoiceNumber = data.invoiceNumber;
      if (response.status === 401 && !path.includes("/auth/login")) this.logout();
      throw error;
    }
    return data;
  },

  get(path) {
    return this.request(path);
  },

  post(path, body, options = {}) {
    return this.request(path, { method: "POST", body, ...options });
  },

  put(path, body, options = {}) {
    return this.request(path, { method: "PUT", body, ...options });
  },

  del(path) {
    return this.request(path, { method: "DELETE" });
  },

  async download(path, fallbackName) {
    const headers = {};
    const token = this.getToken();
    if (token) headers.Authorization = "Bearer " + token;
    const response = await fetch(API_BASE_URL + path, {
      headers,
      credentials: "include",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || "Download failed");
    }
    const disposition = response.headers.get("content-disposition") || "";
    const filenameMatch = disposition.match(/filename="([^"]+)"/);
    const blobUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filenameMatch?.[1] || fallbackName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  },
};
