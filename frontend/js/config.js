window.AIPIS_CONFIG = {
  // Backend API base URL. Set to your Render URL before deploying, e.g. "https://aipis-backend.onrender.com"
  API_URL: ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:8000"
    : "https://aipis-backend.onrender.com",
  CONTACT_EMAIL: "info@aipis.knust.edu.gh",
};
