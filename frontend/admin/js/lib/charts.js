/* Dependency-free charts: line/area, horizontal bars and donut. */
(() => {
  "use strict";

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const PALETTE = ["#1a5c2a", "#f4a24c", "#0d3d26", "#ffc98a", "#4f9a62", "#c47b0b", "#9cc9a6", "#8a4a05", "#2f7d44", "#e08a2c"];

  const CSS = `
.chart-empty { display: grid; place-items: center; min-height: 140px; color: var(--ink-soft); font-weight: 600; text-align: center; }
.bars { display: grid; gap: 0.85rem; }
.bar-row { display: grid; grid-template-columns: minmax(110px, 38%) 1fr auto; gap: 0.8rem; align-items: center; }
.bar-label { font-weight: 600; font-size: 0.95rem; overflow-wrap: anywhere; }
.bar-track { height: 14px; border-radius: 999px; background: var(--green-50); overflow: hidden; }
.bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--green-700), var(--green-600)); width: 0; transition: width 0.8s cubic-bezier(0.2, 0.8, 0.2, 1); }
.bar-fill.orange { background: linear-gradient(90deg, var(--orange-500), var(--orange-300)); }
.bar-value { font-family: var(--font-head); font-weight: 700; color: var(--green-900); min-width: 2ch; text-align: right; }
.line-chart { width: 100%; height: auto; display: block; overflow: visible; }
.line-chart text { font-family: var(--font-body); font-size: 11px; fill: #35493d; font-weight: 600; }
.line-chart .grid-line { stroke: rgba(26, 92, 42, 0.14); stroke-width: 1; }
.line-chart .dot { fill: #fff; stroke: #1a5c2a; stroke-width: 2.5; opacity: 0; transition: opacity 0.15s; }
.line-chart .hit:hover + .dot, .line-chart .hit:focus + .dot { opacity: 1; }
.line-chart .hit { fill: transparent; }
.donut-wrap { display: flex; flex-wrap: wrap; align-items: center; gap: 1.4rem; }
.donut { width: 160px; height: 160px; flex-shrink: 0; }
.donut text { font-family: var(--font-head); fill: #0d3d26; }
.legend { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.45rem; flex: 1; min-width: 170px; }
.legend li { display: flex; align-items: center; gap: 0.6rem; font-weight: 600; font-size: 0.95rem; }
.legend i { width: 12px; height: 12px; border-radius: 4px; flex-shrink: 0; }
.legend b { margin-left: auto; font-family: var(--font-head); color: var(--green-900); }
@media (prefers-reduced-motion: reduce) { .bar-fill { transition: none; } }`;
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  const empty = (el, msg = "No data for this period yet.") => (el.innerHTML = `<div class="chart-empty">${esc(msg)}</div>`);

  function bars(el, items, { orange = false } = {}) {
    const data = items.filter((i) => i.count > 0);
    if (!data.length) return empty(el);
    const max = Math.max(...data.map((i) => i.count));
    el.innerHTML = `<div class="bars">${data
      .map((i) => `<div class="bar-row"><span class="bar-label">${esc(i.label)}</span><div class="bar-track"><div class="bar-fill${orange ? " orange" : ""}" data-w="${(i.count / max) * 100}"></div></div><span class="bar-value">${i.count}</span></div>`)
      .join("")}</div>`;
    requestAnimationFrame(() => el.querySelectorAll(".bar-fill").forEach((b) => (b.style.width = b.dataset.w + "%")));
  }

  function line(el, series) {
    const W = 640, H = 220, L = 34, R = 10, T = 14, B = 26;
    const max = Math.max(1, ...series.map((p) => p.count));
    const top = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
    if (!series.some((p) => p.count)) return empty(el, "No submissions in this period yet.");
    const x = (i) => L + (i * (W - L - R)) / Math.max(1, series.length - 1);
    const y = (v) => T + (1 - v / top) * (H - T - B);
    const pts = series.map((p, i) => [x(i), y(p.count)]);
    const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = `${path} L${pts[pts.length - 1][0].toFixed(1)} ${H - B} L${L} ${H - B} Z`;
    const grid = [0, 1, 2, 3, 4].map((g) => {
      const v = (top / 4) * g;
      return `<line class="grid-line" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    }).join("");
    const fmt = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    const ticks = [0, Math.floor((series.length - 1) / 2), series.length - 1];
    const labels = ticks.map((i, k) => `<text x="${x(i)}" y="${H - 6}" text-anchor="${k === 0 ? "start" : k === 2 ? "end" : "middle"}">${fmt(series[i].date)}</text>`).join("");
    const gid = "g" + Math.random().toString(36).slice(2, 8);
    const hits = series.map((p, i) => `<circle class="hit" cx="${x(i)}" cy="${y(p.count)}" r="9" tabindex="0"><title>${fmt(p.date)}: ${p.count}</title></circle><circle class="dot" cx="${x(i)}" cy="${y(p.count)}" r="5"/>`).join("");
    el.innerHTML = `<svg class="line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Submissions per day">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f4a24c" stop-opacity="0.55"/><stop offset="100%" stop-color="#f4a24c" stop-opacity="0.03"/></linearGradient></defs>
      ${grid}<path d="${area}" fill="url(#${gid})"/><path d="${path}" fill="none" stroke="#1a5c2a" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${hits}${labels}</svg>`;
  }

  function donut(el, items, { centre = "" } = {}) {
    const data = items.filter((i) => i.count > 0);
    const total = data.reduce((s, i) => s + i.count, 0);
    if (!total) return empty(el);
    const r = 56, c = 2 * Math.PI * r;
    let offset = 0;
    const segs = data.map((i, k) => {
      const len = (i.count / total) * c;
      const seg = `<circle cx="80" cy="80" r="${r}" fill="none" stroke="${PALETTE[k % PALETTE.length]}" stroke-width="22" stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 80 80)"><title>${esc(i.label)}: ${i.count}</title></circle>`;
      offset += len;
      return seg;
    }).join("");
    el.innerHTML = `<div class="donut-wrap"><svg class="donut" viewBox="0 0 160 160" role="img" aria-label="Breakdown chart">${segs}
      <text x="80" y="82" text-anchor="middle" font-size="26" font-weight="800">${total}</text><text x="80" y="100" text-anchor="middle" font-size="11" font-weight="600">${esc(centre)}</text></svg>
      <ul class="legend">${data.map((i, k) => `<li><i style="background:${PALETTE[k % PALETTE.length]}"></i>${esc(i.label)}<b>${i.count}</b></li>`).join("")}</ul></div>`;
  }

  window.AdminCharts = { bars, line, donut };
})();
