/* Footer component: injected where its <script> tag sits.
   Glass panel on a dark neutral base. Columns collapse into accordions on mobile. */
(() => {
  "use strict";

  /* ---------- Content (edit links here) ---------- */
  const COLUMNS = [
    {
      title: "The summit",
      links: [
        ["index.html", "Home"],
        ["about.html", "About"],
        ["programme.html", "Programme"],
        ["innovations.html", "Innovations"],
      ],
    },
    {
      title: "Take part",
      links: [
        ["register.html", "Register"],
        ["speakers.html", "Call for Speakers"],
        ["who-attends.html", "Who attends"],
        ["partner-with-us.html", "Partner with us"],
      ],
    },
    {
      title: "Connect",
      links: [
        ["partners.html", "Partners"],
        ["contact.html", "Contact"],
        ["privacy-policy.html", "Privacy policy"],
        ["terms-and-conditions.html", "Terms and conditions"],
        ["cookie-policy.html", "Cookie policy"],
        ["mailto:info@aipis.knust.edu.gh", "info@aipis.knust.edu.gh"],
        ["tel:+233243555882", "+233 (0) 243 555 882"],
      ],
    },
  ];

  /* ---------- Styles ---------- */
  const CSS = `
.footer {
  --ft-o5: #f4a24c; --ft-o3: #ffc98a; --ft-ease: cubic-bezier(.2,.7,.2,1);
  position: relative; overflow: hidden; padding: 3rem 0 2rem; color: #cfdcd3;
  background: radial-gradient(900px 420px at 85% -10%, rgba(244,162,76,.14), transparent 60%), radial-gradient(700px 380px at 5% 110%, rgba(31,138,62,.16), transparent 60%), linear-gradient(180deg, #0d1511, #070c09);
  font-family: var(--font-body, "Source Sans 3", system-ui, sans-serif);
}
.footer .container { position: relative; z-index: 1; width: min(1120px, 100% - 2.5rem); margin-inline: auto; }
.f-glass {
  border-radius: 28px; padding: clamp(1.4rem, 1rem + 1.8vw, 2.4rem);
  background: linear-gradient(145deg, rgba(255,255,255,.1), rgba(255,255,255,.03));
  -webkit-backdrop-filter: blur(18px) saturate(140%); backdrop-filter: blur(18px) saturate(140%);
  border: 1px solid rgba(255,255,255,.14); box-shadow: 0 18px 44px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.18);
}
.f-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.2rem; padding-bottom: 1.4rem; border-bottom: 1px solid rgba(255,255,255,.12); }
.f-brand { display: flex; gap: 1rem; align-items: flex-start; max-width: 600px; }
.f-brand img { background: rgba(255,255,255,.98); border-radius: 50%; padding: 6px; flex-shrink: 0; box-shadow: 0 10px 22px rgba(0, 0, 0, 0.18); transition: transform .4s var(--ft-ease); }
.f-brand:hover img { transform: rotate(-6deg) scale(1.06); }
.f-brand p { margin: 0; line-height: 1.55; }
.f-up {
  flex-shrink: 0; width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; color: #fff; cursor: pointer;
  background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.3); box-shadow: inset 0 1px 0 rgba(255,255,255,.25);
  transition: transform .25s var(--ft-ease), background .25s, color .25s, border-color .25s;
}
.f-up:hover { transform: translateY(-4px); background: var(--ft-o5); color: #052013; border-color: transparent; }
.f-cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.6rem; padding: 1.6rem 0; }
.f-toggle {
  display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0; margin: 0 0 .8rem; background: none; border: 0; cursor: default;
  font-family: var(--font-head, "Archivo", system-ui, sans-serif); font-weight: 700; font-size: 1rem; color: var(--ft-o3); text-align: left;
}
.f-toggle:disabled { color: var(--ft-o3); opacity: 1; }
.f-toggle svg { display: none; transition: transform .25s var(--ft-ease); }
.f-panel { list-style: none; margin: 0; padding: 0; display: grid; gap: .15rem; }
.f-panel a {
  display: inline-block; padding: .3rem 0; color: #e6efe9; text-decoration: none; font-weight: 500; overflow-wrap: anywhere;
  transition: color .2s, transform .25s var(--ft-ease);
}
.f-panel a:hover { color: var(--ft-o3); transform: translateX(5px); }
.f-tag { margin: 0; padding-top: 1.2rem; border-top: 1px solid rgba(255,255,255,.12); color: var(--ft-o3); font-family: var(--font-head, "Archivo", system-ui, sans-serif); font-weight: 700; }
.f-copyright { margin: 0.85rem 0 0; color: rgba(255,255,255,.7); font-size: 0.92rem; text-align: center; }
.f-legal { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.75rem 1rem; margin: 0.7rem 0 0; text-align: center; }
.f-legal a { color: rgba(255,255,255,.82); text-decoration: none; font-size: 0.9rem; }
.f-legal a:hover { color: var(--ft-o3); }
.footer :focus-visible { outline: 3px solid var(--ft-o5); outline-offset: 3px; border-radius: 8px; }

@media (max-width: 760px) {
  .footer { padding: 2rem 0 1.5rem; }
  .f-cols { grid-template-columns: 1fr; gap: 0; padding: .6rem 0 1rem; }
  .f-col { border-bottom: 1px solid rgba(255,255,255,.12); }
  .f-toggle { cursor: pointer; margin: 0; padding: 1rem 0; font-size: 1.05rem; }
  .f-toggle svg { display: block; }
  .f-col.open .f-toggle svg { transform: rotate(180deg); }
  .f-panel { display: none; padding: 0 0 1rem; }
  .f-col.open .f-panel { display: grid; animation: f-open .3s var(--ft-ease); }
}
@keyframes f-open { from { opacity: 0; transform: translateY(-6px); } }
@media (prefers-reduced-motion: reduce) {
  .f-up, .f-panel a, .f-brand img, .f-toggle svg { transition: none; }
  .f-col.open .f-panel { animation: none; }
}`;

  /* ---------- Markup ---------- */
  const CHEVRON =
    '<svg width="14" height="14" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const cols = COLUMNS.map(
    (c, i) => `
      <div class="f-col">
        <button class="f-toggle" type="button" aria-expanded="false" aria-controls="f-panel-${i}">${c.title} ${CHEVRON}</button>
        <ul class="f-panel" id="f-panel-${i}">
          ${c.links.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join("")}
        </ul>
      </div>`
  ).join("");

  const HTML = `
<footer class="footer">
  <div class="container">
    <div class="f-glass">
      <div class="f-top">
        <div class="f-brand">
          <img src="assets/AIPIS-LOGO.png" alt="" width="44" height="44">
          <p>Africa Infrastructure, Prosperity and Industrialisation Summit. Convened by KNUST (CABE and DCTM), AIPAF and GCI.</p>
        </div>
        <button class="f-up" type="button" aria-label="Back to top">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m0 0l-6 6m6-6l6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <nav class="f-cols" aria-label="Footer">${cols}
      </nav>
      <p class="f-tag">Building infrastructure. Powering industry. Delivering prosperity.</p>
      <p class="f-copyright">Â© 2028 AIPIS. All rights reserved.</p>
      <div class="f-legal" aria-label="Legal links">
        <a href="https://aipis-frontend.vercel.app/privacy-policy.html">Privacy policy</a>
        <a href="https://aipis-frontend.vercel.app/terms-and-conditions.html">Terms and conditions</a>
        <a href="https://aipis-frontend.vercel.app/cookie-policy.html">Cookie policy</a>
      </div>
    </div>
  </div>
</footer>`;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  document.currentScript.insertAdjacentHTML("beforebegin", HTML);

  /* ---------- Behaviour ---------- */
  const footer = document.querySelector(".footer");
  const colEls = [...footer.querySelectorAll(".f-col")];
  const mq = window.matchMedia("(max-width: 760px)");

  // On desktop all columns are always open and the headings are not buttons in effect.
  const sync = () => {
    colEls.forEach((col) => {
      const btn = col.querySelector(".f-toggle");
      if (mq.matches) {
        btn.disabled = false;
        btn.setAttribute("aria-expanded", String(col.classList.contains("open")));
      } else {
        btn.disabled = true;
        btn.removeAttribute("aria-expanded");
      }
    });
  };

  colEls.forEach((col) => {
    const btn = col.querySelector(".f-toggle");
    btn.addEventListener("click", () => {
      if (!mq.matches) return;
      const open = col.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
  });

  footer.querySelector(".f-up").addEventListener("click", () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  });

  (mq.addEventListener ? mq.addEventListener("change", sync) : mq.addListener(sync));
  sync();
})();