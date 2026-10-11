/* Analytics page: trends and breakdowns for a selectable period. */
(() => {
  "use strict";

  const { AdminAPI: API, AdminIcons: Icons, AdminUI: UI, AdminCharts: Charts } = window;
  const root = document.getElementById("analyticsRoot");
  const range = document.getElementById("range");

  const stat = (icon, label, value, note) => `
    <article class="card stat"><span class="stat-icon">${Icons.svg(icon, 22)}</span>
    <div><p class="stat-label">${label}</p><p class="stat-value">${value}</p><p class="stat-note">${note}</p></div></article>`;

  const panel = (id, title, note = "") => `<article class="card"><div class="card-head"><h2>${title}</h2></div>${note ? `<p class="muted-p">${note}</p>` : ""}<div id="${id}"></div></article>`;

  function render(d) {
    root.innerHTML = `
      <section class="stats">
        ${stat("inbox", "Submissions", d.total, `In the last ${d.days} days`)}
        ${stat("check", "Handled rate", d.handled_rate + "%", "Handled or archived")}
        ${stat("users", "Delegates registered", d.registrations.delegates, `From ${d.registrations.count} registration${d.registrations.count === 1 ? "" : "s"}`)}
        ${stat("bag", "Exhibition booths", d.exhibitors.booths, "Requested so far")}
      </section>
      <section class="card"><div class="card-head"><h2>Submissions per day</h2></div><div id="aTrend"></div></section>
      <section class="grid-2">${panel("aKinds", "By type")}${panel("aStatus", "By status")}</section>
      <section class="grid-2">${panel("aCats", "Registrations by category", "Number of registrations received.")}${panel("aCountries", "Top countries", "Where registrants are from.")}</section>
      <section class="grid-2">${panel("aPackages", "Partnership interest by package")}${panel("aOrgs", "Most active organisations")}</section>`;

    Charts.line(document.getElementById("aTrend"), d.daily);
    Charts.donut(document.getElementById("aKinds"), d.by_kind, { centre: "submissions" });
    Charts.donut(document.getElementById("aStatus"), d.by_status, { centre: "submissions" });
    Charts.bars(document.getElementById("aCats"), d.registrations.categories);
    Charts.bars(document.getElementById("aCountries"), d.registrations.countries, { orange: true });
    Charts.bars(document.getElementById("aPackages"), d.partnerships.packages);
    Charts.bars(document.getElementById("aOrgs"), d.top_organisations, { orange: true });
  }

  async function load() {
    root.innerHTML = '<div class="card chart-empty">Loading analytics...</div>';
    try {
      render(await API.get("/analytics/", { days: range.value }));
    } catch (err) {
      root.innerHTML = `<div class="card chart-empty"><div>${Icons.svg("alert", 32)}<p><strong>We could not load analytics</strong></p><p>${UI.esc(err.message)}</p><button class="btn btn-primary" id="retry">Try again</button></div></div>`;
      document.getElementById("retry").addEventListener("click", load);
    }
  }

  range.addEventListener("change", load);
  load();
})();
