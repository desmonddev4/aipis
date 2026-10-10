/* Navbar component: floating glass navigation, injected where its <script> tag sits. */
(() => {
  "use strict";

  /* ---------- Menu content (edit links here) ---------- */
  const LINKS = [
    { key: "about", href: "about.html", label: "About" },
    { key: "programme", href: "programme.html", label: "Programme" },
    { key: "innovations", href: "innovations.html", label: "Innovations" },
    {
      key: "speakers",
      label: "Call for Speakers",
      children: [
        { href: "speakers.html", label: "All roles" },
        { href: "speakers.html#keynote", label: "Distinguished Keynote Speakers" },
        { href: "speakers.html#guest", label: "Special Guest Speakers" },
        { href: "speakers.html#technical", label: "Technical Keynote Presenters" },
        { href: "speakers.html#posters", label: "Poster Presenters" },
        { href: "speakers.html#exhibitors", label: "Exhibitors" },
      ],
    },
    { key: "who-attends", href: "who-attends.html", label: "Who attends" },
    { key: "partners", href: "partners.html", label: "Partners" },
    { key: "partner-with-us", href: "partner-with-us.html", label: "Partner with us" },
    { key: "contact", href: "contact.html", label: "Contact" },
  ];
  const CTA = { key: "register", href: "register.html", label: "Register" };

  /* ---------- Styles ---------- */
  const CSS = `
.skip-link { position: fixed; left: 1rem; top: -4rem; z-index: 200; background: var(--green-900); color: #fff; padding: 0.7rem 1rem; border-radius: 10px; }
.skip-link:focus { top: 1rem; color: #fff; }
.nav-wrap { position: fixed; top: 14px; left: 0; right: 0; z-index: 100; display: flex; justify-content: center; pointer-events: none; }
.nav {
  pointer-events: auto; width: min(1240px, 100% - 1.5rem); min-height: var(--nav-h);
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: 0.5rem 0.8rem 0.5rem 1rem; border-radius: 22px;
  background: rgba(255, 255, 255, 0.86); -webkit-backdrop-filter: blur(16px) saturate(140%); backdrop-filter: blur(16px) saturate(140%);
  border: 1px solid rgba(26, 92, 42, 0.14); box-shadow: var(--shadow); transition: box-shadow 0.3s ease, background 0.3s ease;
}
.nav.scrolled { background: rgba(255, 255, 255, 0.94); box-shadow: var(--shadow-lg); }
.brand { display: flex; align-items: center; gap: 0.7rem; text-decoration: none; color: var(--green-900); flex-shrink: 0; }
.brand-text { display: flex; flex-direction: column; line-height: 1.15; }
.brand-text strong { font-family: var(--font-head); font-size: 1.4rem; letter-spacing: 0.04em; }
.brand-text small { font-size: 0.68rem; max-width: 190px; color: var(--ink-soft); font-weight: 600; }
.nav-menu { display: flex; align-items: center; gap: 0.1rem; list-style: none; margin: 0; padding: 0; }
.nav-menu a, .dropdown-toggle {
  display: block; padding: 0.55rem 0.7rem; border-radius: 12px; text-decoration: none; font-family: var(--font-body);
  color: var(--ink); font-weight: 600; font-size: 0.98rem; line-height: 1.5; background: none; border: 0; cursor: pointer; transition: background 0.2s, color 0.2s;
}
.nav-menu a:hover, .dropdown-toggle:hover, .nav-menu a.active, .has-dropdown.active > .dropdown-toggle { background: var(--green-50); color: var(--green-700); }
.nav-menu .nav-register {
  margin-left: 0.4rem; padding: 0.55rem 1.2rem; border-radius: 999px; background: var(--orange-500); color: var(--green-950);
  font-family: var(--font-head); font-weight: 700; text-align: center; box-shadow: 0 8px 20px rgba(244, 162, 76, 0.4);
  transition: transform 0.2s, background 0.2s, box-shadow 0.2s;
}
.nav-menu .nav-register:hover, .nav-menu .nav-register.active { background: var(--orange-400); color: var(--green-950); transform: translateY(-2px); box-shadow: 0 12px 26px rgba(244, 162, 76, 0.55); }
.has-dropdown { position: relative; }
.dropdown-toggle { display: inline-flex; align-items: center; gap: 0.35rem; }
.dropdown-toggle svg { transition: transform 0.2s; }
.dropdown-toggle[aria-expanded="true"] svg { transform: rotate(180deg); }
.dropdown {
  position: absolute; top: calc(100% + 12px); left: 0; min-width: 290px; list-style: none; margin: 0; padding: 0.5rem;
  background: rgba(255, 255, 255, 0.98); border: 1px solid rgba(26, 92, 42, 0.14); border-radius: 18px; box-shadow: var(--shadow-lg);
  opacity: 0; visibility: hidden; transform: translateY(8px); transition: opacity 0.2s, transform 0.2s, visibility 0.2s;
}
.has-dropdown.open .dropdown, .has-dropdown:hover .dropdown, .has-dropdown:focus-within .dropdown { opacity: 1; visibility: visible; transform: none; }
.dropdown a { padding: 0.65rem 0.9rem; }
.nav-toggle { display: none; width: 46px; height: 46px; border-radius: 14px; border: 1px solid rgba(26, 92, 42, 0.2); background: var(--green-50); flex-direction: column; justify-content: center; align-items: center; gap: 5px; cursor: pointer; }
.nav-toggle span { width: 22px; height: 2.5px; background: var(--green-900); border-radius: 2px; transition: transform 0.25s, opacity 0.25s; }
.nav-toggle[aria-expanded="true"] span:nth-child(1) { transform: translateY(7.5px) rotate(45deg); }
.nav-toggle[aria-expanded="true"] span:nth-child(2) { opacity: 0; }
.nav-toggle[aria-expanded="true"] span:nth-child(3) { transform: translateY(-7.5px) rotate(-45deg); }
@media (max-width: 1180px) {
  .brand-text small { display: none; }
  .nav-menu a, .dropdown-toggle { padding: 0.5rem 0.5rem; font-size: 0.92rem; }
}
@media (max-width: 1040px) {
  .nav-toggle { display: flex; }
  .nav-menu {
    position: absolute; top: calc(100% + 10px); left: 0; right: 0; flex-direction: column; align-items: stretch; gap: 0.2rem; padding: 0.8rem;
    background: rgba(255, 255, 255, 0.98); border: 1px solid rgba(26, 92, 42, 0.14); border-radius: 22px; box-shadow: var(--shadow-lg);
    max-height: calc(100svh - 120px); overflow-y: auto; opacity: 0; visibility: hidden; transform: translateY(-10px); transition: opacity 0.25s, transform 0.25s, visibility 0.25s;
  }
  .nav-menu.open { opacity: 1; visibility: visible; transform: none; }
  .nav-menu a, .dropdown-toggle { padding: 0.85rem 1rem; font-size: 1.05rem; width: 100%; justify-content: space-between; }
  .nav-menu .nav-register { margin: 0.4rem 0 0; }
  .dropdown { position: static; min-width: 0; opacity: 1; visibility: visible; transform: none; box-shadow: none; border: 0; border-left: 3px solid var(--orange-500); border-radius: 0; margin: 0 0 0.4rem 1rem; padding: 0 0 0 0.3rem; display: none; background: transparent; }
  .has-dropdown.open .dropdown { display: block; }
  .has-dropdown:not(.open):hover .dropdown, .has-dropdown:not(.open):focus-within .dropdown { display: none; }
}
@media (max-width: 600px) {
  .nav-wrap { top: 8px; }
  .brand-text strong { font-size: 1.25rem; }
}
@media (prefers-reduced-motion: reduce) {
  .nav, .nav-menu, .dropdown, .nav-register { transition: none; }
}`;

  /* ---------- Markup ---------- */
  const CHEVRON =
    '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Works with both /about.html and the extension-less /about used on Vercel
  const current = (location.pathname.split("/").pop() || "index").replace(/\.html$/, "") || "index";
  const isActive = (key) => key === current;
  const cur = (key) => (isActive(key) ? ' class="active" aria-current="page"' : "");

  const items = LINKS.map((l) => {
    if (!l.children) return `<li><a href="${l.href}"${cur(l.key)}>${l.label}</a></li>`;
    const sub = l.children.map((c) => `<li><a href="${c.href}">${c.label}</a></li>`).join("");
    return `<li class="has-dropdown${isActive(l.key) ? " active" : ""}">
      <button class="dropdown-toggle" aria-expanded="false" aria-haspopup="true">${l.label} ${CHEVRON}</button>
      <ul class="dropdown">${sub}</ul>
    </li>`;
  }).join("");

  const HTML = `
<a class="skip-link" href="#main">Skip to content</a>
<header class="nav-wrap">
  <nav class="nav" id="nav" aria-label="Main">
    <a class="brand" href="index.html" aria-label="AIPIS home">
      <img src="assets/logo.svg" alt="" width="40" height="40">
      <span class="brand-text">
        <strong>AIPIS</strong>
        <small>Africa Infrastructure, Prosperity and Industrialisation Summit</small>
      </span>
    </a>
    <button class="nav-toggle" id="navToggle" aria-expanded="false" aria-controls="navMenu" aria-label="Toggle menu">
      <span></span><span></span><span></span>
    </button>
    <ul class="nav-menu" id="navMenu">
      ${items}
      <li><a class="nav-register${isActive(CTA.key) ? " active" : ""}" href="${CTA.href}"${isActive(CTA.key) ? ' aria-current="page"' : ""}>${CTA.label}</a></li>
    </ul>
  </nav>
</header>`;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  document.currentScript.insertAdjacentHTML("beforebegin", HTML);

  /* ---------- Behaviour ---------- */
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("navMenu");
  const dropdowns = [...menu.querySelectorAll(".has-dropdown")];

  const closeMenu = () => {
    menu.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };
  const closeDropdowns = (except) =>
    dropdowns.forEach((d) => {
      if (d !== except) {
        d.classList.remove("open");
        d.querySelector(".dropdown-toggle").setAttribute("aria-expanded", "false");
      }
    });

  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  dropdowns.forEach((d) => {
    const btn = d.querySelector(".dropdown-toggle");
    btn.addEventListener("click", () => {
      const open = !d.classList.contains("open");
      closeDropdowns(d);
      d.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
  });

  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      closeMenu();
      closeDropdowns();
    }
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#nav")) {
      closeMenu();
      closeDropdowns();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
      closeDropdowns();
    }
  });

  // Close the mobile menu when a modal trigger elsewhere on the page is used
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-form]")) closeMenu();
  });

  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 20);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
