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
    panelist: {
      title: "Nominate or apply as a Panelist",
      subject: "AIPIS 2027 panelist nomination",
      intro: "Panelists contribute practical experience to moderated discussions and take questions from delegates.",
      fields: [...base, text("topic", "Session topic", { required: true }), area("message", "Your relevant experience", { required: true })],
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
      intro: "A 6 sq m booth costs USD 3,000 and includes 2 delegate passes and a listing in the exhibitor directory. Thirty booths are available.",
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
      intro: "Early fees apply if paid by 31 December 2026. Organisations registering five or more delegates receive a 10 percent discount.",
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

  /* ---------- Styles (scoped to .modal, self-contained) ---------- */
  const CSS = `
.modal {
  --md-g9: #0a3a22; --md-g7: #16692f; --md-ink: #0f2418; --md-soft: #3a4f43; --md-o5: #f4a24c; --md-ease: cubic-bezier(.2,.7,.2,1);
  position: fixed; inset: 0; z-index: 400; display: grid; place-items: center; padding: 1rem; font-family: var(--font-body, "Source Sans 3", system-ui, sans-serif);
}
.modal[hidden] { display: none; }
.modal-backdrop { position: absolute; inset: 0; background: radial-gradient(600px 400px at 80% 10%, rgba(244,162,76,.18), transparent 60%), rgba(6,18,12,.66); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); animation: modal-fade .25s; }
.modal-dialog {
  position: relative; width: min(600px, 100%); max-height: calc(100svh - 2rem); overflow-y: auto; border-radius: 28px; padding: clamp(1.4rem, 4vw, 2.2rem);
  background: linear-gradient(145deg, rgba(255,255,255,.97), rgba(255,255,255,.9)); -webkit-backdrop-filter: blur(24px) saturate(150%); backdrop-filter: blur(24px) saturate(150%);
  border: 1px solid rgba(255,255,255,.85); box-shadow: 0 30px 70px rgba(0,0,0,.45), inset 0 1px 0 #fff; color: var(--md-ink);
  animation: modal-pop .35s var(--md-ease);
}
.modal-dialog::before { content: ""; position: absolute; left: clamp(1.4rem, 4vw, 2.2rem); top: 0; width: 56px; height: 5px; border-radius: 0 0 6px 6px; background: var(--md-o5); }
.modal-dialog h3 { padding-right: 2.5rem; margin: .4rem 0 .5em; color: var(--md-g9); font-family: var(--font-head, "Archivo", system-ui, sans-serif); font-size: 1.35rem; line-height: 1.25; }
.modal-intro { color: var(--md-soft); margin: 0 0 1.1em; }
.modal-close { position: absolute; top: 1rem; right: 1rem; width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(22,105,47,.2); background: rgba(22,105,47,.1); color: var(--md-g9); display: grid; place-items: center; cursor: pointer; transition: background .2s, transform .35s var(--md-ease); }
.modal-close:hover { background: var(--md-o5); transform: rotate(90deg); }
.modal .field { display: grid; gap: .35rem; margin-bottom: 1rem; }
.modal label { font-weight: 700; color: var(--md-g9); font-size: .95rem; }
.modal input, .modal select, .modal textarea {
  width: 100%; font: inherit; color: var(--md-ink); background: rgba(255,255,255,.85); border: 1.5px solid rgba(22,105,47,.28); border-radius: 14px; padding: .75rem 1rem;
  box-shadow: inset 0 1px 2px rgba(5,32,19,.06); transition: border-color .2s, box-shadow .2s, background .2s;
}
.modal input:hover, .modal select:hover, .modal textarea:hover { border-color: rgba(22,105,47,.5); }
.modal input:focus, .modal select:focus, .modal textarea:focus { outline: none; background: #fff; border-color: var(--md-o5); box-shadow: 0 0 0 4px rgba(244,162,76,.3); }
.modal .field.invalid input, .modal .field.invalid select, .modal .field.invalid textarea { border-color: #b3261e; }
.modal .field-error { color: #b3261e; font-weight: 600; font-size: .92rem; }
.modal .form-status { min-height: 1.4em; font-weight: 600; margin: .4rem 0 .6rem; }
.modal .form-status.ok { color: var(--md-g7); }
.modal .form-status.err { color: #b3261e; }
.modal .form-status a { color: inherit; }
.modal .hp { position: absolute; left: -9999px; opacity: 0; height: 0; width: 0; }
.modal .modal-actions { display: flex; flex-wrap: wrap; gap: .8rem; margin-top: 1rem; }
.modal .modal-btn {
  position: relative; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; padding: .9rem 1.8rem; border-radius: 999px; border: 1px solid transparent;
  font-family: var(--font-head, "Archivo", system-ui, sans-serif); font-weight: 700; font-size: 1rem; line-height: 1.2; cursor: pointer;
  transition: transform .25s var(--md-ease), background .25s, color .25s, box-shadow .25s, border-color .25s;
}
.modal .modal-btn::before { content: ""; position: absolute; inset: 0; background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,.5) 50%, transparent 70%); transform: translateX(-120%); transition: transform .6s var(--md-ease); }
.modal .modal-btn:hover::before { transform: translateX(120%); }
.modal .modal-btn:hover { transform: translateY(-3px); }
.modal .modal-btn:active { transform: translateY(0) scale(.97); }
.modal .modal-btn[disabled] { opacity: .65; cursor: wait; transform: none; }
.modal .modal-btn-primary { background: linear-gradient(135deg, rgba(247,179,107,.97), rgba(244,162,76,.88)); color: #052013; border-color: rgba(255,255,255,.6); box-shadow: 0 8px 20px rgba(244,162,76,.38), inset 0 1px 0 rgba(255,255,255,.65); }
.modal .modal-btn-primary:hover { box-shadow: 0 14px 28px rgba(244,162,76,.55), inset 0 1px 0 rgba(255,255,255,.7); }
.modal .modal-btn-outline { background: rgba(22,105,47,.08); color: var(--md-g9); border-color: rgba(22,105,47,.45); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
.modal .modal-btn-outline:hover { background: var(--md-g7); color: #fff; border-color: var(--md-g7); }
.modal :focus-visible { outline: 3px solid var(--md-o5); outline-offset: 3px; border-radius: 8px; }
body.modal-open { overflow: hidden; }
@keyframes modal-fade { from { opacity: 0; } }
@keyframes modal-pop { from { opacity: 0; transform: translateY(24px) scale(.96); } }
@media (max-width: 600px) {
  .modal { align-items: end; padding: .5rem; }
  .modal-dialog { border-radius: 24px; }
  .modal .modal-btn { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .modal-backdrop, .modal-dialog { animation: none; }
  .modal .modal-btn, .modal-close { transition: none; }
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
