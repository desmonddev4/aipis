/* Sign-in page. */
(() => {
  "use strict";

  const { AdminAPI: API } = window;
  const form = document.getElementById("loginForm");
  const status = document.getElementById("loginStatus");
  const toggle = document.getElementById("togglePassword");
  const password = document.getElementById("password");

  if (API.session.token()) location.replace("index.html");

  toggle.addEventListener("click", () => {
    const show = password.type === "password";
    password.type = show ? "text" : "password";
    toggle.textContent = show ? "Hide" : "Show";
    toggle.setAttribute("aria-pressed", String(show));
  });

  // Only follow simple page names so the next parameter cannot send people elsewhere
  const next = new URLSearchParams(location.search).get("next") || "";
  const match = /^([a-z-]+)(?:\.html)?(\?[\w=&%-]*)?$/i.exec(next);
  const target = match ? `${match[1]}.html${match[2] || ""}` : "index.html";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";
    status.className = "form-status";
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Signing in...";
    try {
      const res = await API.post(
        "/login/",
        { username: document.getElementById("username").value, password: password.value },
        { auth: false }
      );
      API.session.save(res.token, res.user, document.getElementById("remember").checked);
      location.replace(target);
    } catch (err) {
      status.textContent = err.message;
      status.className = "form-status err";
      btn.disabled = false;
      btn.textContent = "Sign in";
    }
  });
})();
