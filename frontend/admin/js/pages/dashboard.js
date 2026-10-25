/* Overview page: headline numbers, 30-day trend, breakdown by type, recent and stale submissions. */
(() => {
  "use strict";

  const { AdminAPI: API, AdminIcons: Icons, AdminUI: UI, AdminCharts: Charts } = window;
  const root = document.getElementById("dashRoot");
  const user = API.session.user() || {};
  const first = (user.first_name || user.username || "").trim();
  document.getElementById("welcome").textContent = `Welcome back${first ? ", " + first : ""}. Here is what is happening with AIPIS 2027.`;

  const statCard = (icon, label, value, note, tone = "") => `
    <article class="card stat ${tone}">
      <span class="stat-icon">${Icons.svg(icon, 22)}</span>
      <div><p class="stat-label">${label}</p><p class="stat-value">${value}</p><p class="stat-note">${note}</p></div>
    </article>`;

  function trend(now, prev) {
    if (!now && !prev) return "No submissions in the last 14 days";
    if (!prev) return "All new this week";
    const pct = Math.round(((now - prev) / prev) * 100);
    return pct === 0 ? "Same as the previous 7 days" : `${pct > 0 ? "Up" : "Down"} ${Math.abs(pct)}% on the previous 7 days`;
  }

  const listItem = (s) => `
    <li><a class="row-link" href="submissions.html?open=${s.id}">
      <span class="avatar">${UI.esc((s.name || "?")[0].toUpperCase())}</span>
      <span class="row-main"><strong>${UI.esc(s.name)}</strong><small>${UI.esc(UI.KIND_LABELS[s.kind] || s.kind)}${s.organisation ? " · " + UI.esc(s.organisation) : ""}</small></span>
      <span class="row-side">${UI.badge(s.status)}<small>${UI.timeAgo(s.created_at)}</small></span>
    </a></li>`;

  function render(d) {
    const kindUrls = {
      registration: "registrations.html", partnership: "partnerships.html", exhibitor: "exhibitors.html", forensic: "forensic.html", contact: "messages.html",
      keynote: "speakers.html", guest: "speakers.html", panelist: "speakers.html", technical: "speakers.html", poster: "speakers.html",
    };
    const capacityItems = Object.values(d.capacity || {});
    const nearCapacity = capacityItems.filter((c) => c.remaining <= Math.max(1, Math.ceil(c.limit * 0.2)));
    const capacityNotice = nearCapacity.length ? `<p class="muted-p">${nearCapacity.map((c) => c.remaining === 0 ? `${UI.esc(c.label)} is full` : `${UI.esc(c.label)} has ${c.remaining} place${c.remaining === 1 ? "" : "s"} left`).join(" · ")}</p>` : `<p class="muted-p">All capped roles currently have healthy availability.</p>`;
    root.innerHTML = `
      <section class="stats">
        ${statCard("inbox", "Total submissions", d.total, `${d.last7} in the last 7 days`)}
        ${statCard("alert", "New", d.status.new, d.stale_new ? `${d.stale_new} waiting more than 3 days` : "Nothing is overdue", "tone-orange")}
        ${statCard("refresh", "In progress", d.status.in_progress, "Being followed up")}
        ${statCard("check", "Handled", d.status.handled, `${d.status.archived} archived`, "tone-green")}
        ${statCard("trend", "Last 7 days", d.last7, trend(d.last7, d.prev7))}
      </section>

      <section class="grid-2">
        <article class="card"><div class="card-head"><h2>Submissions, last 30 days</h2></div><div id="cTrend"></div></article>
        <article class="card"><div class="card-head"><h2>By type</h2></div><div id="cKinds"></div></article>
      </section>

      <section class="grid-2">
        <article class="card">
          <div class="card-head"><h2>Recent submissions</h2><a class="btn btn-outline btn-sm" href="submissions.html">View all</a></div>
          ${d.recent.length ? `<ul class="rows">${d.recent.map(listItem).join("")}</ul>` : '<div class="chart-empty">Nothing has been submitted yet.</div>'}
        </article>
        <article class="card">
          <div class="card-head"><h2>Needs attention</h2><a class="btn btn-outline btn-sm" href="submissions.html?status=new">All new</a></div>
          ${d.stale_items.length ? `<p class="muted-p">New submissions waiting for more than 3 days.</p><ul class="rows">${d.stale_items.map(listItem).join("")}</ul>` : `<div class="chart-empty">${Icons.svg("check", 28)}<span>You are all caught up. Nothing has been waiting more than 3 days.</span></div>`}
        </article>
      </section>

      <section class="card">
        <div class="card-head"><h2>Application capacity</h2><span class="muted">Live role limits</span></div>
        ${capacityNotice}
        <div class="quick">${capacityItems.map((c) => `<div class="quick-link ${c.remaining === 0 ? "capacity-full" : c.remaining <= Math.max(1, Math.ceil(c.limit * 0.2)) ? "capacity-near" : ""}"><strong>${c.used}/${c.limit}</strong><span>${UI.esc(c.label)} · ${c.remaining} remaining</span></div>`).join("")}</div>
      </section>

      <section class="card">
        <div class="card-head"><h2>Go to</h2></div>
        <div class="quick">${[...new Set(Object.values(kindUrls))].map((u) => {
          const kinds = Object.keys(kindUrls).filter((k) => kindUrls[k] === u);
          const n = d.by_kind.filter((k) => kinds.includes(k.key)).reduce((s, k) => s + k.count, 0);
          const names = { "registrations.html": "Registrations", "partnerships.html": "Partnerships", "exhibitors.html": "Exhibitors", "forensic.html": "Forensic Clinic", "messages.html": "Messages", "speakers.html": "Speakers and presenters" };
          return `<a class="quick-link" href="${u}"><strong>${n}</strong><span>${names[u]}</span></a>`;
        }).join("")}</div>
      </section>`;

    Charts.line(document.getElementById("cTrend"), d.daily);
    Charts.bars(document.getElementById("cKinds"), d.by_kind.map((k) => ({ label: k.label, count: k.count })));
  }

  async function load() {
    root.innerHTML = '<div class="card chart-empty">Loading your dashboard...</div>';
    try {
      render(await API.get("/overview/"));
    } catch (err) {
      root.innerHTML = `<div class="card chart-empty"><div>${Icons.svg("alert", 32)}<p><strong>We could not load the dashboard</strong></p><p>${UI.esc(err.message)}</p><button class="btn btn-primary" id="retry">Try again</button></div></div>`;
      document.getElementById("retry").addEventListener("click", load);
    }
  }
  load();
})();
