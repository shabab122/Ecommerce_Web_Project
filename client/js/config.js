// When Express serves the storefront, use the current origin. Live Server
// development falls back to the API on localhost:5000.
const separateDevelopmentClient =
  window.location.protocol === "file:" || ["3000", "5173", "5500", "8080"].includes(window.location.port);
const API_BASE_URL =
  window.NORDA_API_URL || (separateDevelopmentClient ? "http://localhost:5000/api" : "/api");
