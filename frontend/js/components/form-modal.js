/* Form modal: every [data-form="..."] button on any page opens this dialog. Edit form fields in FORMS. */
(() => {
  "use strict";

  const { esc, setStatus, submitForm } = window.AIPIS.forms;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- Form definitions ---------- */
  const text = (name, label, opts = {}) => ({ name, label, type: "text", ...opts });
  const area = (name, label, opts = {}) => ({ name, label, type: "textarea", ...opts });
  const base = [
    text("name", "Full name", { required: true, autocomplete: "name" }),
    text("email", "Email", { required: true, type: "email", autocomplete: "email" }),
    text("organisation", "Organisation", { autocomplete: "organization" }),
    text("phone", "Phone (optional)", { type: "tel", autocomplete: "tel" }),
  ];

  const REG_CATEGORIES = [
    "International delegate",
    "African delegate (outside Ghana)",
    "Ghanaian delegate",
    "Public sector and university staff (Ghana)",
    "Student or young professional (under 35)",
  ];
  const PACKAGES = [
    "Founding Partner", "Prosperity Index Partner", "Strategic Partner", "Knowledge Partner", "Industry Partner",
    "Session Partner", "Gala Dinner Partner", "Field Day Partner",
    "Student and Young Professional Bursary Partner", "Delegate Kit and Digital Partner", "General partnership enquiry",
  ];

  const FORMS = {
    keynote: {
      title: "Nominate a Distinguished Keynote Speaker",
      subject: "AIPIS 2027 Distinguished Keynote Speaker nomination",
      intro: "Distinguished Keynote Speakers are invited by the Summit Steering Committee; nominations are welcome.",
      fields: [...base, text("nominee", "Nominee name and title", { required: true }), area("message", "Why this nominee?", { required: true })],
    },
    guest: {
      title: "Propose a Special Guest Speaker",
      subject: "AIPIS 2027 Special Guest Speaker proposal",
      intro: "Tell us about the speaker and the experience they would share.",
      fields: [...base, text("nominee", "Speaker name and title", { required: true }), area("message", "Proposal", { required: true })],
    },
    technical: {
      title: "Apply as a Technical Keynote Presenter",
      subject: "AIPIS 2027 Technical Keynote Presenter application",
      intro: "Present evidence and lessons in the peer-reviewed research and practice stream.",
      fields: [...base, text("topic", "Proposed topic", { required: true }), area("message", "Summary of your presentation and background", { required: true })],
    },
    poster: {
      title: "Submit a poster abstract",
      subject: "AIPIS 2027 poster abstract",
      intro: "Share research, case studies or project results in the poster exhibition.",
      fields: [...base, text("title", "Poster title", { required: true }), area("message", "Abstract", { required: true })],
    },
    exhibitor: {
      title: "Book an exhibition booth",
      subject: "AIPIS 2027 exhibition booking",
      intro: "A 6 sq m booth costs USD 5,000 and includes 2 delegate passes and a listing in the exhibitor directory. Thirty booths are available.",
      fields: [...base, text("booths", "Number of booths", { type: "number", min: 1, max: 30, value: 1 }), area("message", "Anything we should know? (optional)")],
    },
    partnership: {
      title: "Request the partnership prospectus",
      subject: "AIPIS 2027 partnership enquiry",
      intro: "Tell us which package interests you and we will send the prospectus.",
      fields: [...base, { name: "package", label: "Package of interest", type: "select", options: PACKAGES }, area("message", "Message (optional)")],
    },
    registration: {
      title: "Register to attend",
      subject: "AIPIS 2027 registration",
      intro: "Early fees apply if paid by 31 May 2027. Organisations registering five or more delegates receive a 10 percent discount.",
      fields: [
        ...base,
        { name: "category", label: "Delegate category", type: "select", options: REG_CATEGORIES },
        text("country", "Country"),
        text("delegates", "Number of delegates", { type: "number", min: 1, max: 500, value: 1 }),
        area("message", "Notes (optional)"),
      ],
    },
    forensic: {
      title: "Nominate a project for the Forensic Clinic",
      subject: "AIPIS 2027 Forensic Clinic nomination",
      intro: "Nominate a stalled or abandoned project for review by panels of engineers, quantity surveyors, lawyers and auditors.",
      fields: [...base, text("project", "Project name", { required: true }), text("country", "Country"), area("message", "Describe the project and why it stalled", { required: true })],
    },
  };

  /* ---------- Styles (scoped to .modal so they never clash with page CSS) ---------- */
  const CSS = `
.modal { position: fixed; inset: 0; z-index: 400; display: grid; place-items: center; padding: 1rem; }
.modal[hidden] { display: none; }
.modal-backdrop { position: absolute; inset: 0; background: rgba(8, 42, 26, 0.6); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); animation: modal-fade 0.25s; }
.modal-dialog { position: relative; width: min(600px, 100%); max-height: calc(100svh - 2rem); overflow-y: auto; border-radius: 24px; padding: clamp(1.4rem, 4vw, 2.2rem); background: rgba(255, 255, 255, 0.97); box-shadow: var(--shadow-lg); color: var(--ink); animation: modal-pop 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
.modal-dialog h3 { padding-right: 2.5rem; margin: 0 0 0.6em; color: var(--green-900); }
.modal-intro { color: var(--ink-soft); margin: 0 0 1em; }
.modal-close { position: absolute; top: 1rem; right: 1rem; width: 40px; height: 40px; border-radius: 50%; border: 0; background: var(--green-50); color: var(--green-900); display: grid; place-items: center; cursor: pointer; transition: background 0.2s; }
.modal-close:hover { background: var(--orange-100); }
.modal .field { display: grid; gap: 0.35rem; margin-bottom: 1rem; }
.modal label { font-weight: 700; color: var(--green-900); font-size: 0.98rem; }
.modal input, .modal select, .modal textarea { width: 100%; font: inherit; color: var(--ink); background: #fff; border: 2px solid rgba(26, 92, 42, 0.28); border-radius: 14px; padding: 0.8rem 1rem; transition: border-color 0.2s, box-shadow 0.2s; }
.modal input:focus, .modal select:focus, .modal textarea:focus { outline: none; border-color: var(--orange-500); box-shadow: 0 0 0 4px rgba(244, 162, 76, 0.3); }
.modal .field.invalid input, .modal .field.invalid select, .modal .field.invalid textarea { border-color: #b3261e; }
.modal .field-error { color: #b3261e; font-weight: 600; font-size: 0.92rem; }
.modal .form-status { min-height: 1.4em; font-weight: 600; margin: 0.4rem 0 0.6rem; }
.modal .form-status.ok { color: var(--green-700); }
.modal .form-status.err { color: #b3261e; }
.modal .form-status a { color: inherit; }
.modal .hp { position: absolute; left: -9999px; opacity: 0; height: 0; width: 0; }
.modal .modal-actions { display: flex; flex-wrap: wrap; gap: 0.9rem; margin-top: 1rem; }
.modal .modal-btn { display: inline-flex; align-items: center; justify-content: center; padding: 1rem 1.9rem; border-radius: 999px; border: 2px solid transparent; font-family: var(--font-head); font-weight: 700; font-size: 1.08rem; line-height: 1.2; cursor: pointer; transition: transform 0.2s, background 0.2s, color 0.2s; }
.modal .modal-btn:hover { transform: translateY(-2px); }
.modal .modal-btn[disabled] { opacity: 0.65; cursor: wait; transform: none; }
.modal .modal-btn-primary { background: var(--orange-500); color: var(--green-950); box-shadow: 0 8px 20px rgba(244, 162, 76, 0.4); }
.modal .modal-btn-primary:hover { background: var(--orange-400); }
.modal .modal-btn-outline { background: transparent; color: var(--green-900); border-color: var(--green-700); }
.modal .modal-btn-outline:hover { background: var(--green-700); color: #fff; }
body.modal-open { overflow: hidden; }
@keyframes modal-fade { from { opacity: 0; } }
@keyframes modal-pop { from { opacity: 0; transform: translateY(20px) scale(0.97); } }
@media (max-width: 600px) {
  .modal .modal-btn { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .modal-backdrop, .modal-dialog { animation: none; }
}`;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modal" id="modal" hidden>
  <div class="modal-backdrop" data-close></div>
  <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
    <button class="modal-close" data-close aria-label="Close">
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
    </button>
    <h3 id="modalTitle"></h3>
    <p class="modal-intro" id="modalIntro"></p>
    <form id="modalForm" novalidate>
      <div id="modalFields"></div>
      <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <p class="form-status" role="status" aria-live="polite"></p>
      <div class="modal-actions">
        <button class="modal-btn modal-btn-primary" type="submit">Submit</button>
        <button class="modal-btn modal-btn-outline" id="modalCancel" type="button" data-close>Cancel</button>
      </div>
    </form>
  </div>
</div>`
  );

  /* ---------- Behaviour ---------- */
  const modal = $("#modal");
  const form = $("#modalForm");
  const fieldsBox = $("#modalFields");
  const submitBtn = $('button[type="submit"]', form);
  const cancelBtn = $("#modalCancel");
  let lastTrigger = null;
  let currentKind = null;

  const fieldHTML = (f) => {
    const id = `m-${f.name}`;
    const req = f.required ? " required" : "";
    let control;
    if (f.type === "textarea") control = `<textarea id="${id}" name="${f.name}" rows="4"${req}></textarea>`;
    else if (f.type === "select")
      control = `<select id="${id}" name="${f.name}">${f.options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}</select>`;
    else {
      const extra = ["min", "max", "value", "autocomplete"].filter((k) => f[k] !== undefined).map((k) => ` ${k}="${esc(f[k])}"`).join("");
      control = `<input id="${id}" name="${f.name}" type="${f.type}"${extra}${req}>`;
    }
    return `<div class="field"><label for="${id}">${esc(f.label)}${f.required ? " *" : ""}</label>${control}</div>`;
  };

  const focusables = () => $$("input:not(.hp), select, textarea, button, a[href]", modal).filter((el) => !el.disabled && !el.hidden);

  function open(kind, trigger) {
    const def = FORMS[kind];
    if (!def) return;
    currentKind = kind;
    lastTrigger = trigger;
    $("#modalTitle").textContent = def.title;
    $("#modalIntro").textContent = def.intro;
    fieldsBox.innerHTML = def.fields.map(fieldHTML).join("");
    if (trigger.dataset.package && form.elements.package) form.elements.package.value = trigger.dataset.package;
    setStatus(form, "", "");
    submitBtn.hidden = false;
    submitBtn.disabled = false;
    cancelBtn.textContent = "Cancel";
    modal.hidden = false;
    document.body.classList.add("modal-open");
    const first = $("input, textarea, select", fieldsBox);
    if (first) first.focus();
  }

  function close() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (lastTrigger) lastTrigger.focus();
  }

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-form]");
    if (trigger) open(trigger.dataset.form, trigger);
    if (e.target.closest("[data-close]")) close();
  });

  modal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
    if (e.key === "Tab") {
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submitForm(form, currentKind, FORMS[currentKind].subject, () => {
      fieldsBox.innerHTML = "";
      $("#modalIntro").textContent = "";
      $("#modalTitle").textContent = "Thank you";
      setStatus(form, "Your submission has been received. The AIPIS Secretariat will be in touch.", "ok");
      submitBtn.hidden = true;
      cancelBtn.textContent = "Close";
      cancelBtn.focus();
    });
  });
})();
