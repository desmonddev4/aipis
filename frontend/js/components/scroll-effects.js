/* Scroll effects: progress bar, back-to-top button and scroll-reveal animations. */
(() => {
  "use strict";

  const CSS = `
.progress { position: fixed; top: 0; left: 0; height: 4px; width: 0; z-index: 300; background: linear-gradient(90deg, var(--green-600), var(--orange-500)); }
.to-top { position: fixed; right: 1.2rem; bottom: 1.2rem; z-index: 90; width: 50px; height: 50px; border-radius: 50%; border: 0; background: var(--orange-500); color: var(--green-950); display: grid; place-items: center; box-shadow: var(--shadow-lg); cursor: pointer; transition: transform 0.2s, background 0.2s; }
.to-top[hidden] { display: none; }
.to-top:hover { transform: translateY(-3px); background: var(--orange-400); }
.js .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.7s ease, transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1); }
.js .reveal[data-delay="1"] { transition-delay: 0.08s; }
.js .reveal[data-delay="2"] { transition-delay: 0.16s; }
.js .reveal[data-delay="3"] { transition-delay: 0.24s; }
.js .reveal[data-delay="4"] { transition-delay: 0.32s; }
.js .reveal[data-delay="5"] { transition-delay: 0.4s; }
.js .reveal.in-view { opacity: 1; transform: none; }
.js .reveal.in-view.card:hover { transform: translateY(-6px); transition-delay: 0s; }
.js .reveal.in-view.tl-item:hover, .js .reveal.in-view.sdg:hover { transform: translateY(-5px); transition-delay: 0s; }
@media (prefers-reduced-motion: reduce) {
  .js .reveal { opacity: 1; transform: none; transition: none; }
}`;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  // Loaded in <head> so the reveal styles apply before first paint; the DOM work waits for the body.
  const init = () => {
    document.body.insertAdjacentHTML(
      "afterbegin",
      '<div class="progress" id="progress" aria-hidden="true"></div>'
    );
    document.body.insertAdjacentHTML(
      "beforeend",
      `<button class="to-top" id="toTop" aria-label="Back to top" hidden>
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m0 0l-6 6m6-6l6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>`
    );

    const progress = document.getElementById("progress");
    const toTop = document.getElementById("toTop");

    const update = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
      toTop.hidden = y < 700;
  };
  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          update();
          ticking = false;
        });
      }
    },
    { passive: true }
  );
  update();
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  const reveals = [...document.querySelectorAll(".reveal")];
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in-view");
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in-view"));
  }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
