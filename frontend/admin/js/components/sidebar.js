/* Dashboard shell: sign-in guard, sidebar navigation and mobile top bar. Injected where its <script> tag sits. */
(() => {
  "use strict";

  const { AdminAPI: API, AdminIcons: Icons, AdminUI: UI } = window;
  if (!API.requireAuth()) return;

  /* ---------- Navigation (edit menu items here) ---------- */
  const GROUPS = [
    {
      title: "Overview",
      items: [
        { href: "index.html", label: "Dashboard", icon: "grid" },
        { href: "analytics.html", label: "Analytics", icon: "chart" },
      ],
    },
    {
      title: "Submissions",
      items: [
        { href: "submissions.html", label: "All submissions", icon: "inbox", kinds: "all" },
        { href: "registrations.html", label: "Registrations", icon: "users", kinds: ["registration"] },
        { href: "partnerships.html", label: "Partnerships", icon: "briefcase", kinds: ["partnership"] },
        { href: "speakers.html", label: "Speakers and presenters", icon: "mic", kinds: ["keynote", "guest", "technical", "poster"] },
        { href: "exhibitors.html", label: "Exhibitors", icon: "bag", kinds: ["exhibitor"] },
        { href: "forensic.html", label: "Forensic Clinic", icon: "search", kinds: ["forensic"] },
        { href: "messages.html", label: "Messages", icon: "mail", kinds: ["contact"] },
      ],
    },
    {
      title: "Administration",
      items: [
        { href: "team.html", label: "Team", icon: "key", superuserOnly: true },
        { href: "account.html", label: "My account", icon: "user" },
      ],
    },
  ];

  const CSS = `
:root { --side-w: 272px; }
.side { position: fixed; inset: 0 auto 0 0; width: var(--side-w); z-index: 600; display: flex; flex-direction: column; padding: 1.2rem 0.9rem; background: radial-gradient(500px 300px at 0% 0%, rgba(244, 162, 76, 0.16), transparent 60%), linear-gradient(180deg, var(--green-950), var(--green-900)); color: #fff; overflow-y: auto; transition: transform 0.3s ease; }
.side-brand { display: flex; align-items: center; gap: 0.7rem; padding: 0.4rem 0.6rem 1.2rem; color: #fff; text-decoration: none; }
.side-brand img { background: #fff; border-radius: 12px; padding: 5px; }
.side-brand strong { display: block; font-family: var(--font-head); font-size: 1.3rem; letter-spacing: 0.04em; line-height: 1.1; }
.side-brand span { font-size: 0.8rem; color: var(--orange-300); font-weight: 600; }
.side-nav { flex: 1; display: grid; align-content: start; gap: 1.1rem; }
.side-title { margin: 0 0 0.3rem 0.8rem; font-family: var(--font-head); font-size: 0.74rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255, 255, 255, 0.62); }
.side-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.side-link { position: relative; display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.8rem; border-radius: 12px; color: #fff; font-weight: 600; font-size: 1rem; text-decoration: none; transition: background 0.2s, transform 0.2s; }
.side-link:hover { background: rgba(255, 255, 255, 0.1); color: #fff; transform: translateX(3px); }
.side-link.active { background: rgba(255, 255, 255, 0.16); }
.side-link.active::before { content: ""; position: absolute; left: -0.9rem; top: 22%; bottom: 22%; width: 4px; border-radius: 0 4px 4px 0; background: var(--orange-500); }
.side-link svg { flex-shrink: 0; opacity: 0.95; }
.side-count { margin-left: auto; min-width: 1.6rem; padding: 0.05rem 0.5rem; border-radius: 999px; background: var(--orange-500); color: var(--green-950); font-size: 0.8rem; font-weight: 800; text-align: center; }
.side-user { margin-top: 1rem; padding: 0.9rem; border-radius: 16px; background: rgba(255, 255, 255, 0.09); border: 1px solid rgba(255, 255, 255, 0.16); display: grid; gap: 0.7rem; }
.side-me { display: flex; align-items: center; gap: 0.7rem; min-width: 0; }
.side-avatar { flex-shrink: 0; width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; background: var(--orange-500); color: var(--green-950); font-family: var(--font-head); font-weight: 800; }
.side-me strong { display: block; font-size: 0.98rem; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.side-me small { color: rgba(255, 255, 255, 0.72); font-size: 0.82rem; }
.side-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.side-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.55rem 0.4rem; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.28); background: transparent; color: #fff; font: inherit; font-size: 0.9rem; font-weight: 600; cursor: pointer; text-decoration: none; transition: background 0.2s; }
.side-btn:hover { background: rgba(255, 255, 255, 0.14); color: #fff; }
.topbar { display: none; position: fixed; top: 0; left: 0; right: 0; height: 64px; z-index: 500; align-items: center; gap: 0.8rem; padding: 0 1rem; background: rgba(255, 255, 255, 0.92); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); border-bottom: 1px solid rgba(26, 92, 42, 0.14); }
.topbar button { width: 44px; height: 44px; border-radius: 12px; border: 1px solid rgba(26, 92, 42, 0.2); background: var(--green-50); color: var(--green-900); display: grid; place-items: center; cursor: pointer; }
.topbar strong { font-family: var(--font-head); font-size: 1.1rem; color: var(--green-900); }
.side-overlay { display: none; position: fixed; inset: 0; z-index: 550; background: rgba(8, 42, 26, 0.5); }
.admin-main { margin-left: var(--side-w); min-height: 100vh; padding: clamp(1.4rem, 3vw, 2.4rem) clamp(1rem, 3vw, 2.6rem) 4rem; }
@media (max-width: 980px) {
  .side { transform: translateX(-102%); box-shadow: var(--shadow-lg); }
  .side.open { transform: none; }
  .side-overlay.open { display: block; }
  .topbar { display: flex; }
  .admin-main { margin-left: 0; padding-top: 5.2rem; }
}
@media (prefers-reduced-motion: reduce) { .side, .side-link { transition: none; } }`;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  /* ---------- Markup ---------- */
  const user = API.session.user() || {};
  const current = location.pathname.split("/").pop().replace(/\.html$/, "") || "index";
  const isActive = (href) => href.replace(/\.html$/, "") === current;
  const initials = (user.name || user.username || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const link = (item) => `
    <li><a class="side-link${isActive(item.href) ? " active" : ""}" href="${item.href}"${isActive(item.href) ? ' aria-current="page"' : ""}>
      ${Icons.svg(item.icon)}<span>${UI.esc(item.label)}</span><span class="side-count" data-badge="${item.href}" hidden></span>
    </a></li>`;

  const nav = GROUPS.map((g) => {
    const items = g.items.filter((i) => !i.superuserOnly || user.is_superuser);
    return `<div><p class="side-title">${g.title}</p><ul class="side-list">${items.map(link).join("")}</ul></div>`;
  }).join("");

  const pageTitle = (GROUPS.flatMap((g) => g.items).find((i) => isActive(i.href)) || {}).label || "Dashboard";

  document.currentScript.insertAdjacentHTML(
    "beforebegin",
    `<div class="topbar"><button id="sideOpen" aria-label="Open menu">${Icons.svg("menu")}</button><strong>${UI.esc(pageTitle)}</strong></div>
<div class="side-overlay" id="sideOverlay"></div>
<aside class="side" id="side" aria-label="Dashboard navigation">
  <a class="side-brand" href="index.html"><img src="../assets/AIPIS-LOGO.png" alt="" width="42" height="42"><div><strong>AIPIS</strong><span>Admin dashboard</span></div></a>
  <nav class="side-nav">${nav}</nav>
  <div class="side-user">
    <div class="side-me"><span class="side-avatar">${UI.esc(initials)}</span><div style="min-width:0"><strong>${UI.esc(user.name || user.username || "")}</strong><small>${user.is_superuser ? "Administrator" : "Staff"}</small></div></div>
    <div class="side-actions">
      <a class="side-btn" href="../index.html" target="_blank" rel="noopener">${Icons.svg("external", 16)} Website</a>
      <button class="side-btn" id="signOut">${Icons.svg("logout", 16)} Sign out</button>
    </div>
  </div>
</aside>`
  );

  /* ---------- Behaviour ---------- */
  const side = document.getElementById("side");
  const overlay = document.getElementById("sideOverlay");
  const setOpen = (open) => {
    side.classList.toggle("open", open);
    overlay.classList.toggle("open", open);
  };
  document.getElementById("sideOpen").addEventListener("click", () => setOpen(true));
  overlay.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => e.key === "Escape" && setOpen(false));
  document.getElementById("signOut").addEventListener("click", () => API.logout());

  async function refreshBadges() {
    try {
      const data = await API.get("/badges/");
      GROUPS.flatMap((g) => g.items).forEach((item) => {
        if (!item.kinds) return;
        const n = item.kinds === "all" ? data.new_total : item.kinds.reduce((sum, k) => sum + (data.new_by_kind[k] || 0), 0);
        const el = side.querySelector(`[data-badge="${item.href}"]`);
        if (el) {
          el.textContent = n > 99 ? "99+" : n;
          el.hidden = n === 0;
        }
      });
    } catch {
      /* badges are optional; the page itself reports connection problems */
    }
  }

  // Keeps the stored profile fresh and signs out if the token has expired
  API.get("/me/").then((d) => API.session.updateUser(d.user)).catch(() => {});
  refreshBadges();

  window.AdminLayout = { refreshBadges };
})();
