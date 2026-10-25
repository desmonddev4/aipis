/* API client for the staff dashboard: token storage, authenticated requests, CSV download. */
(() => {
  "use strict";

  const cfg = window.AIPIS_CONFIG || {};
  const BASE = (cfg.API_URL || "").replace(/\/$/, "") + "/api/admin";
  const TOKEN = "aipis_admin_token";
  const USER = "aipis_admin_user";

  const read = (key) => sessionStorage.getItem(key) || localStorage.getItem(key);

  const session = {
    token: () => read(TOKEN),
    user: () => {
      try {
        return JSON.parse(read(USER) || "null");
      } catch {
        return null;
      }
    },
    // "remember" keeps the sign-in across browser restarts; otherwise it ends with the tab
    save(token, user, remember) {
      session.clear();
      const store = remember ? localStorage : sessionStorage;
      store.setItem(TOKEN, token);
      store.setItem(USER, JSON.stringify(user));
    },
    updateUser(user) {
      const store = localStorage.getItem(TOKEN) ? localStorage : sessionStorage;
      store.setItem(USER, JSON.stringify(user));
    },
    updateToken(token) {
      const store = localStorage.getItem(TOKEN) ? localStorage : sessionStorage;
      store.setItem(TOKEN, token);
    },
    clear() {
      [sessionStorage, localStorage].forEach((s) => {
        s.removeItem(TOKEN);
        s.removeItem(USER);
      });
    },
  };

  class ApiError extends Error {
    constructor(message, status, field) {
      super(message);
      this.status = status;
      this.field = field;
    }
  }

  const toLogin = () => {
    const next = location.pathname.split("/").pop() + location.search;
    location.replace("login.html" + (next && next !== "login.html" ? "?next=" + encodeURIComponent(next) : ""));
  };

  async function request(method, path, body, { auth = true } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (auth) headers.Authorization = "Bearer " + session.token();
    let res;
    try {
      res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    } catch {
      throw new ApiError("Cannot reach the server. Check your internet connection and try again.", 0);
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && auth) {
      session.clear();
      toLogin();
      throw new ApiError("Your session has ended. Please sign in again.", 401);
    }
    if (!res.ok) throw new ApiError(data.error || "Something went wrong. Please try again.", res.status, data.field);
    return data;
  }

  const qs = (params) => {
    const p = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") p.set(k, v);
    });
    const s = p.toString();
    return s ? "?" + s : "";
  };

  async function download(path, fallbackName) {
    const res = await fetch(BASE + path, { headers: { Authorization: "Bearer " + session.token() } });
    if (res.status === 401) {
      session.clear();
      toLogin();
      return;
    }
    if (!res.ok) throw new ApiError("The export could not be created.", res.status);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fallbackName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function openFile(path) {
    const res = await fetch(BASE + path, { headers: { Authorization: "Bearer " + session.token() } });
    if (res.status === 401) {
      session.clear();
      toLogin();
      return;
    }
    if (!res.ok) throw new ApiError("The file could not be opened.", res.status);
    const url = URL.createObjectURL(await res.blob());
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  window.AdminAPI = {
    session,
    ApiError,
    qs,
    download,
    openFile,
    get: (path, params) => request("GET", path + qs(params)),
    post: (path, body, opts) => request("POST", path, body ?? {}, opts),
    patch: (path, body) => request("PATCH", path, body ?? {}),
    del: (path) => request("DELETE", path),
    // Send visitors without a session to the sign-in page
    requireAuth() {
      if (!session.token()) {
        toLogin();
        return false;
      }
      return true;
    },
    logout() {
      session.clear();
      location.replace("login.html");
    },
  };
})();
