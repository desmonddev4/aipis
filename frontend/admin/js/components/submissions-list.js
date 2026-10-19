/* Submissions list: filters, status tabs, table, bulk actions, pagination and the detail drawer.
   Used by every list page. Configure per page with data-kinds on #listPage (empty = all types). */
(() => {
  "use strict";

  const { AdminAPI: API, AdminIcons: Icons, AdminUI: UI } = window;
  const root = document.getElementById("listRoot");
  const page = document.getElementById("listPage");
  if (!root || !page) return;

  const PAGE_KINDS = (page.dataset.kinds || "").split(",").filter(Boolean);
  const showKindColumn = PAGE_KINDS.length !== 1;
  const DETAIL_LABELS = {
    category: "Category", delegates: "Delegates", country: "Country", package: "Package",
    topic: "Topic", title: "Poster title", booths: "Booths", project: "Project", nominee: "Nominee",
    organisation_type: "Organisation type", website: "Website", consent: "Terms and privacy", proposal: "Partnership proposal", product_summary: "Products, services or projects", space_requirements: "Space or setup requirements",
  };
  const STATUSES = [["", "All"], ["new", "New"], ["in_progress", "In progress"], ["handled", "Handled"], ["archived", "Archived"]];

  const CSS = `
.toolbar { display: flex; flex-wrap: wrap; gap: 0.8rem; align-items: center; margin-bottom: 1rem; }
.search-box { position: relative; flex: 1 1 260px; }
.search-box svg { position: absolute; left: 0.9rem; top: 50%; transform: translateY(-50%); color: var(--ink-soft); pointer-events: none; }
.search-box input { padding-left: 2.8rem; }
.toolbar select, .toolbar input[type="date"] { width: auto; min-width: 150px; }
.tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 1rem; }
.tab { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 999px; border: 1.5px solid rgba(26, 92, 42, 0.28); background: #fff; color: var(--green-900); font: inherit; font-weight: 700; cursor: pointer; transition: background 0.2s, color 0.2s, border-color 0.2s; }
.tab:hover { border-color: var(--green-700); }
.tab[aria-pressed="true"] { background: var(--green-900); border-color: var(--green-900); color: #fff; }
.tab span { font-size: 0.82rem; padding: 0.05rem 0.5rem; border-radius: 999px; background: var(--green-50); color: var(--green-900); }
.tab[aria-pressed="true"] span { background: var(--orange-500); color: var(--green-950); }
.bulk { display: none; align-items: center; flex-wrap: wrap; gap: 0.6rem; padding: 0.7rem 1rem; margin-bottom: 1rem; border-radius: 14px; background: var(--green-900); color: #fff; font-weight: 600; }
.bulk.show { display: flex; }
.bulk .btn { padding: 0.45rem 0.9rem; font-size: 0.92rem; }
.bulk .btn-outline { color: #fff; border-color: rgba(255, 255, 255, 0.6); }
.bulk .btn-outline:hover { background: #fff; color: var(--green-900); }
.bulk .spacer { flex: 1; }
.table-wrap { overflow-x: auto; }
.data { width: 100%; border-collapse: collapse; }
.data th { text-align: left; padding: 0.85rem 1rem; font-family: var(--font-head); font-size: 0.86rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--green-900); background: var(--green-50); white-space: nowrap; }
.data th button { all: unset; cursor: pointer; display: inline-flex; gap: 0.3rem; align-items: center; }
.data td { padding: 0.9rem 1rem; border-top: 1px solid rgba(26, 92, 42, 0.12); vertical-align: middle; }
.data tbody tr { cursor: pointer; transition: background 0.15s; }
.data tbody tr:hover { background: var(--orange-50); }
.data tbody tr.unread td:first-child { box-shadow: inset 4px 0 0 var(--orange-500); }
.data tbody tr.unread .who strong { color: #000; }
.data .check { width: 44px; }
.data input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--green-700); cursor: pointer; }
.who { display: grid; gap: 0.1rem; min-width: 190px; }
.who strong { color: var(--green-900); font-size: 1.02rem; }
.who span { color: var(--ink-soft); font-size: 0.9rem; overflow-wrap: anywhere; }
.summary { color: var(--ink); max-width: 320px; overflow-wrap: anywhere; }
.when { color: var(--ink-soft); white-space: nowrap; font-size: 0.95rem; }
.row-open { all: unset; cursor: pointer; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: var(--green-700); }
.row-open:hover { background: var(--green-100); }
.skeleton td > div { height: 16px; border-radius: 8px; background: linear-gradient(90deg, #e8efe9, #f6f9f6, #e8efe9); background-size: 200% 100%; animation: shimmer 1.3s infinite; }
@keyframes shimmer { to { background-position: -200% 0; } }
.empty { display: grid; justify-items: center; gap: 0.5rem; padding: 3.5rem 1rem; text-align: center; color: var(--ink-soft); }
.empty svg { color: var(--orange-500); }
.empty strong { color: var(--green-900); font-size: 1.15rem; }
.pager { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.8rem; padding: 0.9rem 1rem; border-top: 1px solid rgba(26, 92, 42, 0.12); color: var(--ink-soft); font-weight: 600; }
.pager-btns { display: flex; gap: 0.35rem; }
.pager-btns button { min-width: 40px; height: 40px; padding: 0 0.6rem; border-radius: 10px; border: 1.5px solid rgba(26, 92, 42, 0.28); background: #fff; color: var(--green-900); font: inherit; font-weight: 700; cursor: pointer; }
.pager-btns button:hover:not(:disabled) { border-color: var(--green-700); background: var(--green-50); }
.pager-btns button[aria-current="page"] { background: var(--green-900); border-color: var(--green-900); color: #fff; }
.pager-btns button:disabled { opacity: 0.45; cursor: not-allowed; }

.drawer-overlay { position: fixed; inset: 0; z-index: 700; background: rgba(8, 42, 26, 0.45); opacity: 0; visibility: hidden; transition: opacity 0.25s, visibility 0.25s; }
.drawer-overlay.open { opacity: 1; visibility: visible; }
.drawer { position: fixed; top: 0; right: 0; bottom: 0; z-index: 710; width: min(560px, 100%); display: flex; flex-direction: column; background: #fff; box-shadow: var(--shadow-lg); transform: translateX(105%); transition: transform 0.3s ease; }
.drawer.open { transform: none; }
.drawer-head { display: flex; align-items: flex-start; gap: 1rem; padding: 1.3rem 1.5rem; border-bottom: 1px solid rgba(26, 92, 42, 0.14); background: linear-gradient(180deg, #fff, var(--orange-50)); }
.drawer-head h2 { font-size: 1.4rem; margin: 0.3rem 0 0; overflow-wrap: anywhere; }
.drawer-head .grow { flex: 1; min-width: 0; }
.icon-btn { flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; border: 0; background: var(--green-50); color: var(--green-900); display: grid; place-items: center; cursor: pointer; }
.icon-btn:hover { background: var(--orange-100); }
.drawer-body { flex: 1; overflow-y: auto; padding: 1.3rem 1.5rem 2rem; display: grid; gap: 1.5rem; align-content: start; }
.drawer-section h3 { font-size: 0.86rem; font-family: var(--font-head); letter-spacing: 0.1em; text-transform: uppercase; color: #8a4a05; margin: 0 0 0.6rem; }
.status-row { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
.status-row select { width: auto; min-width: 180px; }
.info { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem 1.2rem; margin: 0; }
.info dt { font-size: 0.82rem; font-weight: 700; color: var(--ink-soft); }
.info dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
.info .full { grid-column: 1 / -1; }
.message { white-space: pre-wrap; padding: 1rem 1.1rem; border-radius: 14px; background: var(--green-50); border: 1px solid rgba(26, 92, 42, 0.14); overflow-wrap: anywhere; }
.timeline { list-style: none; margin: 0 0 1rem; padding: 0; display: grid; gap: 0.7rem; }
.timeline li { padding: 0.8rem 1rem; border-radius: 12px; background: #fff; border: 1px solid rgba(26, 92, 42, 0.16); border-left: 4px solid var(--green-700); }
.timeline li.reply { border-left-color: var(--orange-500); background: var(--orange-50); }
.timeline .meta { display: flex; justify-content: space-between; gap: 0.6rem; font-size: 0.84rem; font-weight: 700; color: var(--ink-soft); margin-bottom: 0.25rem; }
.timeline .text { white-space: pre-wrap; overflow-wrap: anywhere; }
.drawer-form { display: grid; gap: 0.7rem; }
.drawer-foot { padding: 1rem 1.5rem; border-top: 1px solid rgba(26, 92, 42, 0.14); display: flex; justify-content: space-between; gap: 0.7rem; flex-wrap: wrap; }
@media (max-width: 820px) {
  .data thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .data, .data tbody, .data tr, .data td { display: block; width: 100%; }
  .data tbody tr { padding: 0.9rem 1rem; border-top: 1px solid rgba(26, 92, 42, 0.16); position: relative; }
  .data td { border: 0; padding: 0.2rem 0; }
  .data td.check { position: absolute; top: 0.8rem; right: 0.6rem; width: auto; }
  .data td.go { display: none; }
  .data .summary { max-width: none; }
  .data tbody tr.unread td:first-child { box-shadow: none; }
  .data tbody tr.unread { box-shadow: inset 4px 0 0 var(--orange-500); }
  .info { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) { .drawer, .drawer-overlay { transition: none; } .skeleton td > div { animation: none; } }`;
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  /* ---------- State ---------- */
  const params = new URLSearchParams(location.search);
  const state = {
    q: "",
    status: STATUSES.some(([v]) => v === params.get("status")) ? params.get("status") : "",
    kind: "",
    date_from: "",
    date_to: "",
    page: 1,
    ordering: "-created_at",
    results: [],
    count: 0,
    pages: 1,
    pageSize: 20,
    counts: {},
    selected: new Set(),
    loading: true,
    error: "",
  };
  let openId = null;

  /* ---------- Rendering ---------- */
  const kindOptions = Object.entries(UI.KIND_LABELS)
    .filter(([k]) => !PAGE_KINDS.length || PAGE_KINDS.includes(k))
    .map(([k, l]) => `<option value="${k}">${UI.esc(l)}</option>`)
    .join("");

  root.innerHTML = `
    <div class="toolbar">
      <div class="search-box">${Icons.svg("search", 18)}<input id="fSearch" type="search" placeholder="Search name, email, organisation or message" aria-label="Search"></div>
      ${showKindColumn ? `<select id="fKind" aria-label="Type"><option value="">All types</option>${kindOptions}</select>` : ""}
      <input id="fFrom" type="date" aria-label="From date" title="From date">
      <input id="fTo" type="date" aria-label="To date" title="To date">
      <button class="btn btn-outline" id="bRefresh">${Icons.svg("refresh", 18)} Refresh</button>
      <button class="btn btn-primary" id="bExport">${Icons.svg("download", 18)} Export CSV</button>
    </div>
    <div class="tabs" id="tabs" role="group" aria-label="Filter by status"></div>
    <div class="bulk" id="bulk"></div>
    <section class="card flush">
      <div class="table-wrap"><table class="data"><thead id="thead"></thead><tbody id="tbody"></tbody></table></div>
      <div id="empty"></div>
      <div class="pager" id="pager"></div>
    </section>`;
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="drawer-overlay" id="dOverlay"></div><aside class="drawer" id="drawer" aria-label="Submission details" aria-hidden="true"></aside>`
  );

  const $ = (id) => document.getElementById(id);

  function summary(s) {
    const d = s.details || {};
    switch (s.kind) {
      case "registration": return [d.category, d.delegates ? d.delegates + " delegates" : "", s.payment ? "GHS " + s.payment.amount_ghs + " / " + s.payment.status_label : "Payment not started"].filter(Boolean).join(" � ");
      case "partnership": return d.package || "General enquiry";
      case "technical": return d.topic || "";
      case "poster": return d.title || "";
      case "exhibitor": return d.booths ? `${d.booths} booth${d.booths === "1" ? "" : "s"}` : "";
      case "forensic": return d.project || "";
      case "keynote":
      case "guest": return d.nominee || "";
      default: return s.message;
    }
  }

  function renderHead() {
    const sortIcon = (key) => (state.ordering === key ? " ▲" : state.ordering === "-" + key ? " ▼" : "");
    $("thead").innerHTML = `<tr>
      <th class="check"><input type="checkbox" id="selAll" aria-label="Select all on this page"></th>
      <th><button data-sort="name">Contact${sortIcon("name")}</button></th>
      ${showKindColumn ? "<th>Type</th>" : ""}
      <th>Details</th>
      <th><button data-sort="status">Status${sortIcon("status")}</button></th>
      <th><button data-sort="created_at">Received${sortIcon("created_at")}</button></th>
      <th class="go"></th></tr>`;
  }

  function renderTabs() {
    $("tabs").innerHTML = STATUSES.map(([value, label]) => {
      const n = value ? state.counts[value] ?? 0 : state.counts.all ?? 0;
      return `<button class="tab" data-status="${value}" aria-pressed="${state.status === value}">${label} <span>${n}</span></button>`;
    }).join("");
  }

  function renderRows() {
    const cols = showKindColumn ? 7 : 6;
    if (state.loading) {
      $("tbody").innerHTML = Array.from({ length: 5 }, () => `<tr class="skeleton">${`<td><div></div></td>`.repeat(cols)}</tr>`).join("");
      $("empty").innerHTML = "";
      return;
    }
    if (state.error) {
      $("tbody").innerHTML = "";
      $("empty").innerHTML = `<div class="empty">${Icons.svg("alert", 36)}<strong>We could not load the submissions</strong><span>${UI.esc(state.error)}</span><button class="btn btn-primary" id="bRetry">Try again</button></div>`;
      return;
    }
    if (!state.results.length) {
      const filtering = state.q || state.status || state.kind || state.date_from || state.date_to;
      $("tbody").innerHTML = "";
      $("empty").innerHTML = `<div class="empty">${Icons.svg("inbox", 40)}<strong>${filtering ? "Nothing matches your filters" : "No submissions yet"}</strong><span>${filtering ? "Try a different search or clear the filters." : "New form submissions from the website will appear here."}</span></div>`;
      return;
    }
    $("empty").innerHTML = "";
    $("tbody").innerHTML = state.results
      .map((s) => `<tr data-id="${s.id}" class="${s.status === "new" ? "unread" : ""}">
        <td class="check"><input type="checkbox" data-select="${s.id}" ${state.selected.has(s.id) ? "checked" : ""} aria-label="Select ${UI.esc(s.name)}"></td>
        <td><div class="who"><strong>${UI.esc(s.name)}</strong><span>${UI.esc(s.organisation || s.email)}</span></div></td>
        ${showKindColumn ? `<td><span class="kind-tag">${UI.esc(UI.KIND_LABELS[s.kind] || s.kind)}</span></td>` : ""}
        <td class="summary">${UI.esc(summary(s)) || "<span class='muted'>None</span>"}</td>
        <td>${UI.badge(s.status)}</td>
        <td class="when" title="${UI.esc(UI.fmtDateTime(s.created_at))}">${UI.timeAgo(s.created_at)}</td>
        <td class="go"><button class="row-open" aria-label="Open ${UI.esc(s.name)}">${Icons.svg("eye", 18)}</button></td>
      </tr>`)
      .join("");
  }

  function renderPager() {
    if (state.loading || state.error || !state.count) {
      $("pager").innerHTML = "";
      return;
    }
    const from = (state.page - 1) * state.pageSize + 1;
    const to = Math.min(state.page * state.pageSize, state.count);
    const nums = [];
    for (let p = Math.max(1, state.page - 2); p <= Math.min(state.pages, state.page + 2); p++) nums.push(p);
    $("pager").innerHTML = `<span>Showing ${from}–${to} of ${state.count}</span>
      <div class="pager-btns">
        <button data-page="${state.page - 1}" ${state.page <= 1 ? "disabled" : ""} aria-label="Previous page">‹</button>
        ${nums.map((p) => `<button data-page="${p}" ${p === state.page ? 'aria-current="page"' : ""}>${p}</button>`).join("")}
        <button data-page="${state.page + 1}" ${state.page >= state.pages ? "disabled" : ""} aria-label="Next page">›</button>
      </div>`;
  }

  function renderBulk() {
    const n = state.selected.size;
    const bulk = $("bulk");
    bulk.classList.toggle("show", n > 0);
    bulk.innerHTML = n
      ? `<span>${n} selected</span><span class="spacer"></span>
         <button class="btn btn-primary" data-bulk="in_progress">Mark in progress</button>
         <button class="btn btn-primary" data-bulk="handled">Mark handled</button>
         <button class="btn btn-outline" data-bulk="archived">Archive</button>
         <button class="btn btn-danger" data-bulk="delete">${Icons.svg("trash", 16)} Delete</button>`
      : "";
    const all = $("selAll");
    if (all) {
      all.checked = state.results.length > 0 && state.results.every((s) => state.selected.has(s.id));
      all.indeterminate = !all.checked && state.results.some((s) => state.selected.has(s.id));
    }
  }

  const renderAll = () => {
    renderHead();
    renderTabs();
    renderRows();
    renderPager();
    renderBulk();
  };

  /* ---------- Data ---------- */
  const query = () => ({
    kind: state.kind || PAGE_KINDS.join(","),
    status: state.status,
    q: state.q,
    date_from: state.date_from,
    date_to: state.date_to,
    ordering: state.ordering,
  });

  let requestSeq = 0;
  async function load({ quiet = false } = {}) {
    const seq = ++requestSeq;
    if (!quiet) {
      state.loading = true;
      state.error = "";
      renderRows();
    }
    try {
      const data = await API.get("/submissions/", { ...query(), page: state.page, page_size: state.pageSize });
      if (seq !== requestSeq) return;
      Object.assign(state, { results: data.results, count: data.count, pages: data.pages, counts: data.counts, page: data.page, loading: false, error: "" });
      const visible = new Set(data.results.map((s) => s.id));
      if (!quiet) state.selected = new Set([...state.selected].filter((id) => visible.has(id)));
    } catch (err) {
      if (seq !== requestSeq) return;
      Object.assign(state, { loading: false, error: err.message });
    }
    renderAll();
  }

  /* ---------- Events ---------- */
  const search = UI.debounce((v) => {
    state.q = v.trim();
    state.page = 1;
    load();
  }, 350);
  $("fSearch").addEventListener("input", (e) => search(e.target.value));
  if ($("fKind")) $("fKind").addEventListener("change", (e) => Object.assign(state, { kind: e.target.value, page: 1 }) && load());
  $("fFrom").addEventListener("change", (e) => Object.assign(state, { date_from: e.target.value, page: 1 }) && load());
  $("fTo").addEventListener("change", (e) => Object.assign(state, { date_to: e.target.value, page: 1 }) && load());
  $("bRefresh").addEventListener("click", () => {
    load();
    window.AdminLayout && window.AdminLayout.refreshBadges();
  });
  $("bExport").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await API.download("/submissions/export/" + API.qs(query()), "aipis-submissions.csv");
      UI.toast("Export downloaded.");
    } catch (err) {
      UI.toast(err.message, "error");
    }
    btn.disabled = false;
  });

  root.addEventListener("click", async (e) => {
    const tab = e.target.closest("[data-status]");
    if (tab) {
      state.status = tab.dataset.status;
      state.page = 1;
      return load();
    }
    const pageBtn = e.target.closest("[data-page]");
    if (pageBtn && !pageBtn.disabled) {
      state.page = Number(pageBtn.dataset.page);
      return load();
    }
    const sort = e.target.closest("[data-sort]");
    if (sort) {
      const key = sort.dataset.sort;
      state.ordering = state.ordering === key ? "-" + key : key;
      state.page = 1;
      return load();
    }
    if (e.target.closest("#bRetry")) return load();

    const bulk = e.target.closest("[data-bulk]");
    if (bulk) return runBulk(bulk.dataset.bulk);

    if (e.target.closest("#selAll")) return;
    if (e.target.closest("[data-select]")) return;
    const row = e.target.closest("tr[data-id]");
    if (row) openDrawer(Number(row.dataset.id));
  });

  root.addEventListener("change", (e) => {
    if (e.target.id === "selAll") {
      state.results.forEach((s) => (e.target.checked ? state.selected.add(s.id) : state.selected.delete(s.id)));
      renderRows();
      renderBulk();
    } else if (e.target.dataset.select) {
      const id = Number(e.target.dataset.select);
      e.target.checked ? state.selected.add(id) : state.selected.delete(id);
      renderBulk();
    }
  });

  async function runBulk(action) {
    const ids = [...state.selected];
    if (action === "delete") {
      const ok = await UI.confirm({
        title: `Delete ${ids.length} submission${ids.length === 1 ? "" : "s"}?`,
        message: "This permanently removes them and their notes. This cannot be undone.",
        confirmText: "Delete",
        danger: true,
      });
      if (!ok) return;
    }
    try {
      const body = action === "delete" ? { ids, action: "delete" } : { ids, action: "status", status: action };
      const res = await API.post("/submissions/bulk/", body);
      UI.toast(action === "delete" ? `${res.count} deleted.` : `${res.count} updated.`);
      state.selected.clear();
      await load();
      window.AdminLayout && window.AdminLayout.refreshBadges();
    } catch (err) {
      UI.toast(err.message, "error");
    }
  }

  /* ---------- Drawer ---------- */
  const drawer = $("drawer");
  const overlay = $("dOverlay");

  function closeDrawer() {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    openId = null;
  }
  overlay.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => e.key === "Escape" && openId && !document.querySelector(".dlg-backdrop") && closeDrawer());

  function noteHTML(n) {
    return `<li class="${n.kind}"><div class="meta"><span>${n.kind === "reply" ? "Email sent" : "Note"} · ${UI.esc(n.author)}</span><span>${UI.fmtDateTime(n.created_at)}</span></div><div class="text">${UI.esc(n.text)}</div></li>`;
  }

  function drawerHTML(s) {
    let details = Object.entries(s.details || {})
      .filter(([k, v]) => v && k !== "attendees")
      .map(([k, v]) => `<div><dt>${UI.esc(DETAIL_LABELS[k] || k)}</dt><dd>${UI.esc(v)}</dd></div>`)
      .join("");
    const attendees = Array.isArray(s.details && s.details.attendees) ? s.details.attendees : [];
    if (attendees.length) {
      const rows = attendees.map((a, i) => (i + 1) + '. ' + UI.esc(a.name) + ' | ' + UI.esc(a.email) + ' | ' + UI.esc(a.category) + ' | ' + UI.esc(a.country)).join('<br>');
      details += '<div class="full"><dt>Delegates (' + attendees.length + ')</dt><dd>' + rows + '</dd></div>';
    }
    if (s.kind === "registration" && s.payment) {
      const p = s.payment;
      details += '<div><dt>Payment status</dt><dd>' + UI.esc(p.status_label) + '</dd></div><div><dt>Amount charged</dt><dd>GHS ' + UI.esc(p.amount_ghs) + '</dd></div><div><dt>USD registration total</dt><dd>USD ' + UI.esc(p.usd_amount) + '</dd></div><div><dt>Bank of Ghana USD/GHS rate</dt><dd>' + UI.esc(p.fx_rate) + ' (' + UI.esc(p.fx_rate_date) + ')</dd></div><div class="full"><dt>Paystack reference</dt><dd>' + UI.esc(p.reference) + '</dd></div>';
    }
    return `
      <div class="drawer-head">
        <div class="grow"><span class="kind-tag">${UI.esc(UI.KIND_LABELS[s.kind] || s.kind)}</span><h2>${UI.esc(s.name)}</h2></div>
        <button class="icon-btn" id="dClose" aria-label="Close">${Icons.svg("x")}</button>
      </div>
      <div class="drawer-body">
        <section class="drawer-section">
          <h3>Status</h3>
          <div class="status-row">
            <select id="dStatus" aria-label="Status">${STATUSES.slice(1).map(([v, l]) => `<option value="${v}" ${v === s.status ? "selected" : ""}>${l}</option>`).join("")}</select>
            <span>Received ${UI.fmtDateTime(s.created_at)}</span>
          </div>
        </section>
        <section class="drawer-section">
          <h3>Contact</h3>
          <dl class="info">
            <div><dt>Email</dt><dd><a href="mailto:${UI.esc(s.email)}">${UI.esc(s.email)}</a></dd></div>
            <div><dt>Phone</dt><dd>${s.phone ? `<a href="tel:${UI.esc(s.phone)}">${UI.esc(s.phone)}</a>` : "Not given"}</dd></div>
            <div class="full"><dt>Organisation</dt><dd>${UI.esc(s.organisation) || "Not given"}</dd></div>
            ${details}
          </dl>
        </section>
        ${s.message ? `<section class="drawer-section"><h3>Message</h3><div class="message">${UI.esc(s.message)}</div></section>` : ""}
        <section class="drawer-section">
          <h3>Activity</h3>
          <ul class="timeline" id="dNotes">${s.notes.length ? s.notes.map(noteHTML).join("") : '<li class="empty-note"><span class="muted">No notes or replies yet.</span></li>'}</ul>
          <form class="drawer-form" id="dNoteForm">
            <label for="dNote">Add an internal note (only your team sees this)</label>
            <textarea id="dNote" rows="3" required></textarea>
            <div><button class="btn btn-outline" type="submit">Save note</button></div>
          </form>
        </section>
        <section class="drawer-section">
          <h3>Reply by email</h3>
          <form class="drawer-form" id="dReplyForm">
            <div class="field"><label for="dSubject">Subject</label><input id="dSubject" value="${UI.esc("Re: AIPIS 2028 " + (UI.KIND_LABELS[s.kind] || "").toLowerCase())}" required></div>
            <div class="field"><label for="dBody">Message to ${UI.esc(s.name)}</label><textarea id="dBody" rows="6" required></textarea></div>
            <div><button class="btn btn-primary" type="submit">${Icons.svg("send", 16)} Send email</button></div>
          </form>
        </section>
      </div>
      <div class="drawer-foot">
        <button class="btn btn-danger" id="dDelete">${Icons.svg("trash", 16)} Delete</button>
        <button class="btn btn-outline" id="dClose2">Close</button>
      </div>`;
  }

  async function openDrawer(id) {
    openId = id;
    drawer.innerHTML = `<div class="drawer-head"><div class="grow"><h2>Loading...</h2></div><button class="icon-btn" id="dClose" aria-label="Close">${Icons.svg("x")}</button></div>`;
    drawer.classList.add("open");
    overlay.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    try {
      const { submission } = await API.get("/submissions/" + id + "/");
      if (openId !== id) return;
      drawer.innerHTML = drawerHTML(submission);
      bindDrawer(submission);
    } catch (err) {
      UI.toast(err.message, "error");
      closeDrawer();
    }
  }

  function bindDrawer(s) {
    const close = () => closeDrawer();
    $("dClose").addEventListener("click", close);
    $("dClose2").addEventListener("click", close);

    $("dStatus").addEventListener("change", async (e) => {
      try {
        const res = await API.patch("/submissions/" + s.id + "/", { status: e.target.value });
        UI.toast("Status updated.");
        $("dNotes").innerHTML = res.submission.notes.map(noteHTML).join("");
        await load({ quiet: true });
        window.AdminLayout && window.AdminLayout.refreshBadges();
      } catch (err) {
        e.target.value = s.status;
        UI.toast(err.message, "error");
      }
    });

    $("dNoteForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("button");
      btn.disabled = true;
      try {
        const { note } = await API.post("/submissions/" + s.id + "/notes/", { text: $("dNote").value });
        const list = $("dNotes");
        list.querySelector(".empty-note")?.remove();
        list.insertAdjacentHTML("beforeend", noteHTML(note));
        $("dNote").value = "";
        UI.toast("Note saved.");
      } catch (err) {
        UI.toast(err.message, "error");
      }
      btn.disabled = false;
    });

    $("dReplyForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("button");
      btn.disabled = true;
      try {
        const res = await API.post("/submissions/" + s.id + "/reply/", { subject: $("dSubject").value, body: $("dBody").value });
        $("dNotes").querySelector(".empty-note")?.remove();
        $("dNotes").insertAdjacentHTML("beforeend", noteHTML(res.note));
        $("dBody").value = "";
        $("dStatus").value = res.status;
        UI.toast("Email sent to " + s.email + ".");
        await load({ quiet: true });
        window.AdminLayout && window.AdminLayout.refreshBadges();
      } catch (err) {
        UI.toast(err.message, "error");
      }
      btn.disabled = false;
    });

    $("dDelete").addEventListener("click", async () => {
      const ok = await UI.confirm({
        title: "Delete this submission?",
        message: `${s.name}'s submission and all its notes will be permanently removed.`,
        confirmText: "Delete",
        danger: true,
      });
      if (!ok) return;
      try {
        await API.del("/submissions/" + s.id + "/");
        UI.toast("Submission deleted.");
        closeDrawer();
        state.selected.delete(s.id);
        await load();
        window.AdminLayout && window.AdminLayout.refreshBadges();
      } catch (err) {
        UI.toast(err.message, "error");
      }
    });
  }

  /* ---------- Start ---------- */
  renderAll();
  load().then(() => {
    const open = Number(params.get("open"));
    if (open) openDrawer(open);
  });
})();
