/* Footer component: injected where its <script> tag sits. */
(() => {
  "use strict";

  const LINKS = [
    ["index.html", "Home"],
    ["about.html", "About"],
    ["programme.html", "Programme"],
    ["innovations.html", "Innovations"],
    ["speakers.html", "Call for Speakers"],
    ["who-attends.html", "Who attends"],
    ["partners.html", "Partners"],
    ["partner-with-us.html", "Partner with us"],
    ["register.html", "Register"],
    ["contact.html", "Contact"],
  ];

  const CSS = `
.footer { background: var(--green-950); color: #e9f3ec; padding: 3.5rem 0 2.5rem; }
.footer-inner { display: grid; gap: 1.6rem; }
.footer-brand { display: flex; gap: 1rem; align-items: flex-start; max-width: 640px; }
.footer-brand img { background: #fff; border-radius: 12px; padding: 5px; flex-shrink: 0; }
.footer-brand p { margin: 0; }
.footer-links { display: flex; flex-wrap: wrap; gap: 0.4rem 1.4rem; }
.footer-links a { color: #fff; text-decoration: none; font-weight: 600; }
.footer-links a:hover { color: var(--orange-300); text-decoration: underline; }
.footer-tag { margin: 0; color: var(--orange-300); font-family: var(--font-head); font-weight: 700; }`;

  const HTML = `
<footer class="footer">
  <div class="container footer-inner">
    <div class="footer-brand">
      <img src="assets/logo.svg" alt="" width="44" height="44">
      <p>Africa Infrastructure, Prosperity and Industrialisation Summit. Convened by KNUST (CABE and DCTM), AIPAF and GCI.</p>
    </div>
    <nav class="footer-links" aria-label="Footer">
      ${LINKS.map(([href, label]) => `<a href="${href}">${label}</a>`).join("")}
    </nav>
    <p class="footer-tag">Building infrastructure. Powering industry. Delivering prosperity.</p>
  </div>
</footer>`;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  document.currentScript.insertAdjacentHTML("beforebegin", HTML);
})();
