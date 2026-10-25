/* Navbar component: floating glass navigation, injected where its <script> tag sits. */
(() => {
  "use strict";

  /* ---------- Menu content (edit links here) ---------- */
  const LINKS = [
    { key: "about", href: "about.html", label: "About" },
    {
      key: "programme",
      label: "Programme",
      children: [
        { href: "programme.html", label: "Summit programme in Accra" },
        { href: "programme.html#panels", label: "Thematic panels" },
        { href: "innovations.html", label: "The AIPIS Distinction: Seven Innovations" },
        { href: "innovations.html#roundtables", label: "The AIPIS Roundtables" },
        { href: "who-attends.html", label: "Audience" },
        { href: "register.html#online-registration", label: "Register to attend" },
      ],
    },
    {
      key: "speakers",
      label: "Call for Speakers",
      children: [
        { href: "speakers.html#keynote", label: "Distinguished Keynote Speakers" },
        { href: "speakers.html#guest", label: "Special Guest Speakers" },
        { href: "speakers.html#panelists", label: "Panelists" },
        { href: "speakers.html#technical", label: "Technical Keynote Presenters" },
        { href: "speakers.html#posters", label: "Poster Presenters" },
      ],
    },
    {
      key: "committees",
      label: "Organising Committee",
      children: [
        { href: "about.html#ssc", label: "Summit Steering Committee" },
        { href: "about.html#ioc", label: "International Organising Committee" },
        { href: "about.html#loc", label: "Local Organising Committee" },
        { href: "about.html#iab", label: "International Advisory Board" },
        { href: "about.html#scientific", label: "Scientific Committee" },
      ],
    },
    {
      key: "partners",
      label: "Partners",
      children: [
        { href: "partners.html#partners", label: "Convenors and founding partners" },
        { href: "partner-with-us.html#partner", label: "Call for partners and sponsors" },
        { href: "partner-with-us.html#packages", label: "Partnership packages" },
        { href: "partner-with-us.html#exhibitors", label: "Exhibitors" },
      ],
    },
    { key: "contact", href: "contact.html", label: "Contact" },
  ];
  const CTA = { key: "register", href: "register.html#online-registration", label: "Register to attend" };

  /* ---------- Styles (self-contained: does not depend on page variables) ---------- */
  const CSS = `
.nav-wrap, .skip-link {
  --nv-g9: #0a3a22; --nv-g8: #0f4d2c; --nv-g7: #16692f; --nv-g1: #e3f0e6; --nv-ink: #0f2418; --nv-soft: #3a4f43;
  --nv-o5: #f4a24c; --nv-o4: #f7b36b; --nv-o3: #ffc98a; --nv-ease: cubic-bezier(.2,.7,.2,1);
}
.skip-link { position: fixed; left: 1rem; top: -4rem; z-index: 200; background: var(--nv-g9); color: #fff; padding: 0.7rem 1rem; border-radius: 10px; }
.skip-link:focus-visible { top: 1rem; color: #fff; }
.nav-wrap { position: fixed; top: 14px; left: 0; right: 0; z-index: 100; display: flex; justify-content: center; pointer-events: none; font-family: var(--font-body, "Source Sans 3", system-ui, sans-serif); }
.nav {
  pointer-events: auto; width: min(1240px, 100% - 1.5rem); min-height: var(--nav-h, 72px);
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: 0.5rem 0.8rem 0.5rem 1rem; border-radius: 999px;
  background: linear-gradient(145deg, rgba(255,255,255,.82), rgba(255,255,255,.62));
  -webkit-backdrop-filter: blur(20px) saturate(160%); backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgba(255,255,255,.7); box-shadow: 0 10px 30px rgba(5,32,19,.18), inset 0 1px 0 rgba(255,255,255,.9);
  transition: box-shadow .3s ease, background .3s ease, transform .3s var(--nv-ease);
}
.nav.scrolled { background: linear-gradient(145deg, rgba(255,255,255,.94), rgba(255,255,255,.84)); box-shadow: 0 16px 38px rgba(5,32,19,.26), inset 0 1px 0 #fff; }
.brand { display: flex; align-items: center; gap: 0.7rem; text-decoration: none; color: var(--nv-g9); flex-shrink: 0; }
.brand img { background: #fff; border-radius: 50%; padding: 5px; box-shadow: 0 6px 18px rgba(6, 31, 18, 0.12); transition: transform .4s var(--nv-ease); }
.brand:hover img { transform: rotate(-8deg) scale(1.08); }
.brand-text { display: flex; flex-direction: column; line-height: 1.15; }
.brand-text strong { font-family: var(--font-head, "Archivo", system-ui, sans-serif); font-size: 1.3rem; letter-spacing: 0.04em; }
.brand-text small { font-size: 0.68rem; max-width: 190px; color: var(--nv-soft); font-weight: 600; }
.nav-menu { display: flex; align-items: center; gap: 0.1rem; list-style: none; margin: 0; padding: 0; }
.nav-menu a, .dropdown-toggle {
  position: relative; display: block; padding: 0.5rem 0.75rem; border-radius: 999px; text-decoration: none; font-family: inherit;
  color: var(--nv-ink); font-weight: 600; font-size: 0.95rem; line-height: 1.5; background: none; border: 0; cursor: pointer; transition: background .2s, color .2s;
}
.nav-menu > li > a:not(.nav-register)::after, .dropdown-toggle::after {
  content: ""; position: absolute; left: 50%; bottom: 3px; width: 0; height: 3px; border-radius: 3px; background: var(--nv-o5); transform: translateX(-50%); transition: width .3s var(--nv-ease);
}
.nav-menu > li > a:not(.nav-register):hover::after, .dropdown-toggle:hover::after, .has-dropdown:focus-within > .dropdown-toggle::after,
.nav-menu a.active::after, .has-dropdown.active > .dropdown-toggle::after { width: 22px; }
.nav-menu a:hover, .dropdown-toggle:hover, .nav-menu a.active, .has-dropdown.active > .dropdown-toggle { background: rgba(22,105,47,.1); color: var(--nv-g7); }
.nav-menu .nav-register {
  position: relative; overflow: hidden; margin-left: 0.4rem; padding: 0.6rem 1.3rem; border-radius: 999px;
  background: linear-gradient(135deg, rgba(247,179,107,.97), rgba(244,162,76,.88)); color: #052013; border: 1px solid rgba(255,255,255,.6);
  font-family: var(--font-head, "Archivo", system-ui, sans-serif); font-weight: 700; text-align: center;
  box-shadow: 0 8px 20px rgba(244,162,76,.38), inset 0 1px 0 rgba(255,255,255,.65); transition: transform .25s var(--nv-ease), box-shadow .25s;
}
.nav-menu .nav-register::before { content: ""; position: absolute; inset: 0; background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,.55) 50%, transparent 70%); transform: translateX(-120%); transition: transform .6s var(--nv-ease); }
.nav-menu .nav-register:hover::before { transform: translateX(120%); }
.nav-menu .nav-register:hover, .nav-menu .nav-register.active { background: linear-gradient(135deg, #f7b36b, #f4a24c); color: #052013; transform: translateY(-2px); box-shadow: 0 12px 26px rgba(244,162,76,.55), inset 0 1px 0 rgba(255,255,255,.7); }
.has-dropdown { position: relative; }
.dropdown-toggle { display: inline-flex; align-items: center; gap: 0.35rem; }
.dropdown-toggle svg { transition: transform .2s; }
.dropdown-toggle[aria-expanded="true"] svg { transform: rotate(180deg); }
.dropdown {
  position: absolute; top: calc(100% + 14px); left: 0; min-width: 300px; list-style: none; margin: 0; padding: 0.5rem;
  background: linear-gradient(145deg, rgba(255,255,255,.95), rgba(255,255,255,.86)); -webkit-backdrop-filter: blur(20px) saturate(160%); backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgba(255,255,255,.8); border-radius: 20px; box-shadow: 0 18px 40px rgba(5,32,19,.26), inset 0 1px 0 #fff;
  opacity: 0; visibility: hidden; transform: translateY(8px); transition: opacity .2s, transform .25s var(--nv-ease), visibility .2s;
}
.has-dropdown.open .dropdown, .has-dropdown:hover .dropdown, .has-dropdown:focus-within .dropdown { opacity: 1; visibility: visible; transform: none; }
.dropdown a { padding: 0.65rem 0.9rem; border-radius: 12px; }
.dropdown a::after { display: none; }
.dropdown a:hover { background: rgba(22,105,47,.1); padding-left: 1.2rem; }
.dropdown a { transition: background .2s, padding .25s var(--nv-ease), color .2s; }
.nav-toggle { display: none; width: 46px; height: 46px; border-radius: 50%; border: 1px solid rgba(255,255,255,.8); background: rgba(22,105,47,.12); flex-direction: column; justify-content: center; align-items: center; gap: 5px; cursor: pointer; transition: background .2s; }
.nav-toggle:hover { background: rgba(22,105,47,.2); }
.nav-toggle span { width: 22px; height: 2.5px; background: var(--nv-g9); border-radius: 2px; transition: transform .25s, opacity .25s; }
.nav-toggle[aria-expanded="true"] span:nth-child(1) { transform: translateY(7.5px) rotate(45deg); }
.nav-toggle[aria-expanded="true"] span:nth-child(2) { opacity: 0; }
.nav-toggle[aria-expanded="true"] span:nth-child(3) { transform: translateY(-7.5px) rotate(-45deg); }
@media (max-width: 1180px) {
  .brand-text small { display: none; }
  .nav-menu a, .dropdown-toggle { padding: 0.5rem 0.5rem; font-size: 0.9rem; }
}
@media (max-width: 960px) {
  .nav { border-radius: 28px; }
  .nav-toggle { display: flex; }
  .nav-menu {
    position: absolute; top: calc(100% + 10px); left: 0; right: 0; flex-direction: column; align-items: stretch; gap: 0.2rem; padding: 0.8rem;
    background: linear-gradient(145deg, rgba(255,255,255,.96), rgba(255,255,255,.88)); -webkit-backdrop-filter: blur(20px) saturate(160%); backdrop-filter: blur(20px) saturate(160%);
    border: 1px solid rgba(255,255,255,.8); border-radius: 24px; box-shadow: 0 18px 40px rgba(5,32,19,.28);
    max-height: calc(100svh - 120px); overflow-y: auto; opacity: 0; visibility: hidden; transform: translateY(-10px); transition: opacity .25s, transform .25s, visibility .25s;
  }
  .nav-menu.open { opacity: 1; visibility: visible; transform: none; }
  .nav-menu a, .dropdown-toggle { padding: 0.85rem 1rem; font-size: 1.05rem; width: 100%; justify-content: space-between; border-radius: 14px; }
  .nav-menu > li > a:not(.nav-register)::after, .dropdown-toggle::after { display: none; }
  .nav-menu .nav-register { margin: 0.4rem 0 0; }
  .dropdown { position: static; min-width: 0; opacity: 1; visibility: visible; transform: none; box-shadow: none; border: 0; border-left: 3px solid var(--nv-o5); border-radius: 0; margin: 0 0 0.4rem 1rem; padding: 0 0 0 0.3rem; display: none; background: transparent; -webkit-backdrop-filter: none; backdrop-filter: none; }
  .has-dropdown.open .dropdown { display: block; }
  .has-dropdown:not(.open):hover .dropdown, .has-dropdown:not(.open):focus-within .dropdown { display: none; }
}
@media (max-width: 600px) {
  .nav-wrap { top: 8px; }
  .brand-text strong { font-size: 1.2rem; }
}
@media (prefers-reduced-motion: reduce) {
  .nav, .nav-menu, .dropdown, .nav-register, .brand img, .nav-menu a::after, .dropdown-toggle::after { transition: none; }
}`;

  /* ---------- Markup ---------- */
  const CHEVRON =
    '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Works with both /about.html and the extension-less /about used on Vercel
  const current = (location.pathname.split("/").pop() || "index").replace(/\.html$/, "") || "index";
  const isActive = (key) => {
    const item = LINKS.find((link) => link.key === key);
    return key === current || Boolean(item?.children?.some((child) => child.href.split("#")[0].replace(/\.html$/, "") === current));
  };
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
      <img src="assets/AIPIS-LOGO.png" alt="" width="40" height="40">
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
