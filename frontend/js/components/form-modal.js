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
    { name: "phone", label: "Phone (optional)", type: "phone" },
  ];
  const speakerBase = [
    ...base,
    text("honorific", "Title (optional)"),
    text("position", "Position or job title", { required: true }),
    text("country", "Country", { required: true, autocomplete: "country-name" }),
    text("whatsapp", "WhatsApp number (optional)", { autocomplete: "tel" }),
    area("bio", "Short professional biography", { required: true, maxlength: 2500 }),
    { name: "role", label: "Application role", type: "select", required: true, options: ["Distinguished Keynote Speaker", "Special Guest Speaker", "Panelist", "Technical Keynote Presenter", "Poster Presenter"] },
    area("message", "Summary of your presentation or contribution", { required: true, maxlength: 4000 }),
    { name: "photo", label: "Professional photograph (JPG, PNG or WEBP; max 5 MB)", type: "file", required: true, accept: "image/jpeg,image/png,image/webp" },
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
      title: "Register as a Distinguished Keynote Speaker",
      subject: "AIPIS 2027 Distinguished Keynote Speaker application",
      intro: "Apply directly to be considered as a Distinguished Keynote Speaker.",
      drawer: true,
      fields: speakerBase,
    },
    guest: {
      title: "Register as a Special Guest Speaker",
      subject: "AIPIS 2027 Special Guest Speaker application",
      intro: "Apply directly to be considered as a Special Guest Speaker.",
      drawer: true,
      fields: speakerBase,
    },
    panelist: {
      title: "Register as a Panelist",
      subject: "AIPIS 2027 panelist application",
      intro: "Panelists contribute practical experience to moderated discussions and take questions from delegates.",
      drawer: true,
      fields: speakerBase,
    },
    technical: {
      title: "Apply as a Technical Keynote Presenter",
      subject: "AIPIS 2027 Technical Keynote Presenter application",
      intro: "Present evidence and lessons in the peer-reviewed research and practice stream.",
      drawer: true,
      fields: speakerBase,
    },
    poster: {
      title: "Register as a Poster Presenter",
      subject: "AIPIS 2027 poster abstract",
      intro: "Apply directly to present research, case studies or project results in the poster exhibition.",
      drawer: true,
      fields: speakerBase,
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
      intro: "Early fees apply if paid by 28 February 2027. A 10 percent discount applies to registrations of five or more attendees.",
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
    roundtable: {
      title: "Request a Roundtable invitation",
      subject: "AIPIS 2027 Roundtable invitation request",
      intro: "Roundtables are closed sessions with limited invited participation. Share your details for the Secretariat to consider; submitting this request does not confirm an invitation.",
      success: "Your request has been received for consideration. This is not confirmation of an invitation; the AIPIS Secretariat will contact you.",
      drawer: true,
      fields: [
        text("name", "Full name", { required: true, autocomplete: "name" }),
        text("email", "Email", { required: true, type: "email", autocomplete: "email" }),
        text("organisation", "Organisation (optional)", { autocomplete: "organization" }),
        text("role", "Role or title", { required: true }),
        { name: "phone", label: "Phone (optional)", type: "phone" },
        text("country", "Country", { required: true, autocomplete: "country-name" }),
        { name: "roundtable", label: "Roundtable of interest", type: "select", required: true, options: [
          "Choose a roundtable",
          "Africa Infrastructure Bankability Roundtable",
          "Africa Infrastructure and Resource Diplomacy Roundtable",
          "Africa Infrastructure Maintainability Roundtable",
          "Africa Land, Traditional Authority and Infrastructure Roundtable (Africa Land TRAIR)",
        ] },
        area("experience", "Relevant experience", { required: true, maxlength: 2500 }),
        area("message", "Why would you like to attend, and what perspective would you bring?", { required: true }),
        { name: "consent", label: "I agree that AIPIS may use these details to review my request and contact me about it.", type: "checkbox", required: true, link: { href: "privacy-policy.html", label: "Read the privacy notice" } },
      ],
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
.modal .checkbox-label { display: flex; align-items: flex-start; gap: .65rem; }
.modal .checkbox-label input { width: 1.1rem; height: 1.1rem; margin: .15rem 0 0; padding: 0; border-radius: 4px; box-shadow: none; flex: none; accent-color: var(--md-g7); }
.modal .checkbox-label span { font-weight: 500; }
.modal .field-link { font-size: .9rem; }
.modal label { font-weight: 700; color: var(--md-g9); font-size: .95rem; }
.modal input, .modal select, .modal textarea {
  width: 100%; font: inherit; color: var(--md-ink); background: rgba(255,255,255,.85); border: 1.5px solid rgba(22,105,47,.28); border-radius: 14px; padding: .75rem 1rem;
  box-shadow: inset 0 1px 2px rgba(5,32,19,.06); transition: border-color .2s, box-shadow .2s, background .2s;
}
.modal .file-picker { position: relative; display: grid; gap: .3rem; }
.modal .file-input { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
.modal .file-picker-label { display: flex; align-items: center; gap: .85rem; padding: 1rem; border: 1.5px dashed rgba(22,105,47,.45); border-radius: 16px; background: linear-gradient(135deg, rgba(234,244,236,.8), rgba(255,255,255,.9)); color: var(--md-g9); cursor: pointer; transition: border-color .2s, background .2s, transform .2s; }
.modal .file-picker-label:hover, .modal .file-input:focus-visible + .file-picker-label { border-color: var(--md-o5); background: rgba(247,179,107,.18); transform: translateY(-2px); }
.modal .file-picker-icon { display: grid; place-items: center; width: 42px; height: 42px; flex: none; border-radius: 12px; background: var(--md-g7); color: #fff; }
.modal .file-picker-copy { display: grid; gap: .1rem; min-width: 0; }
.modal .file-picker-copy strong { font-family: var(--font-head, "Archivo", system-ui, sans-serif); }
.modal .file-picker-copy span { color: var(--md-soft); font-size: .9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
.modal.is-drawer { place-items: stretch end; padding: 0; }
.modal.is-drawer .modal-dialog { width: min(560px, 100%); height: 100%; max-height: 100svh; border-radius: 24px 0 0 24px; animation: modal-drawer-in .3s var(--md-ease); }
@keyframes modal-drawer-in { from { opacity: .7; transform: translateX(36px); } }
@media (max-width: 600px) { .modal.is-drawer .modal-dialog { width: 100%; border-radius: 20px 0 0 20px; } }
.role-picker { position: fixed; inset: 0; z-index: 410; display: grid; place-items: center; padding: 1rem; }
.role-picker[hidden] { display: none; }
.role-picker-backdrop { position: absolute; inset: 0; background: rgba(6,18,12,.66); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
.role-picker-dialog { position: relative; width: min(520px, 100%); padding: clamp(1.4rem, 4vw, 2.2rem); border-radius: 28px; background: linear-gradient(145deg, rgba(255,255,255,.98), rgba(255,255,255,.9)); box-shadow: 0 30px 70px rgba(0,0,0,.45); color: var(--md-ink); animation: modal-pop .35s var(--md-ease); }
.role-picker-dialog h3 { margin: .2rem 0 .5rem; color: var(--md-g9); }
.role-picker-dialog p { color: var(--md-soft); }
.role-picker-options { display: grid; gap: .65rem; margin-top: 1.2rem; }
.role-picker-options button { width: 100%; padding: .85rem 1rem; border: 1px solid rgba(22,105,47,.25); border-radius: 14px; background: rgba(22,105,47,.08); color: var(--md-g9); font: inherit; font-weight: 700; text-align: left; cursor: pointer; transition: background .2s, transform .2s; }
.role-picker-options button:hover { background: var(--md-o5); transform: translateY(-2px); }
.role-picker-options small { display: block; margin-top: .15rem; font-weight: 600; opacity: .72; }
.role-picker-close { position: absolute; top: 1rem; right: 1rem; width: 40px; height: 40px; border: 1px solid rgba(22,105,47,.2); border-radius: 50%; background: rgba(22,105,47,.1); color: var(--md-g9); cursor: pointer; }
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
  document.body.insertAdjacentHTML("beforeend", `<div class="role-picker" id="rolePicker" hidden>
    <div class="role-picker-backdrop" data-role-picker-close></div>
    <div class="role-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="rolePickerTitle">
      <button class="role-picker-close" type="button" data-role-picker-close aria-label="Close">&times;</button>
      <h3 id="rolePickerTitle">Choose an application role</h3>
      <p>Select the role you would like to apply for. Your choice will be carried into the application form.</p>
      <div class="role-picker-options">
        <button type="button" data-form="guest" data-role="Special Guest Speaker">Special Guest Speaker <small>· Up to 6 applications</small></button>
        <button type="button" data-form="keynote" data-role="Distinguished Keynote Speaker">Distinguished Keynote Speaker <small>· Up to 6 applications</small></button>
        <button type="button" data-form="panelist" data-role="Panelist">Panelist</button>
        <button type="button" data-form="technical" data-role="Technical Keynote Presenter">Technical Keynote Presenter <small>· Up to 12 applications</small></button>
        <button type="button" data-form="poster" data-role="Poster Presenter">Poster Presenter <small>· Up to 20 applications</small></button>
      </div>
    </div>
  </div>`);

  /* ---------- Behaviour ---------- */
  const modal = $("#modal");
  const form = $("#modalForm");
  const fieldsBox = $("#modalFields");
  const submitBtn = $('button[type="submit"]', form);
  const cancelBtn = $("#modalCancel");
  const rolePicker = $("#rolePicker");
  let lastTrigger = null;
  let currentKind = null;

  const fieldHTML = (f) => {
    const id = `m-${f.name}`;
    const req = f.required ? " required" : "";
    let control;
    if (f.type === "checkbox") return `<div class="field checkbox-field"><label class="checkbox-label"><input id="${id}" name="${esc(f.name)}" type="checkbox"${req}><span>${esc(f.label)}</span></label>${f.link ? `<a class="field-link" href="${esc(f.link.href)}" target="_blank" rel="noopener">${esc(f.link.label)}</a>` : ""}</div>`;
    if (f.type === "phone") control = window.AIPISPhoneInput.markup({ id, name: f.name });
    else if (f.type === "textarea") control = `<textarea id="${id}" name="${f.name}" rows="4"${f.maxlength ? ` maxlength="${esc(f.maxlength)}"` : ""}${req}></textarea>`;
    else if (f.type === "select")
      control = `<select id="${id}" name="${f.name}"${req}>${f.options.map((o, i) => `<option value="${i === 0 && f.required ? "" : esc(o)}">${esc(o)}</option>`).join("")}</select>`;
    else if (f.type === "file") control = `<div class="file-picker"><input class="file-input" id="${id}" name="${esc(f.name)}" type="file" accept="${esc(f.accept || "image/*")}"${req}><label class="file-picker-label" for="${id}"><span class="file-picker-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/></svg></span><span class="file-picker-copy"><strong>Choose a professional photo</strong><span data-file-name>No file selected · JPG, PNG or WEBP up to 5 MB</span></span></label></div>`;
    else {
      const extra = ["min", "max", "value", "autocomplete", "maxlength"].filter((k) => f[k] !== undefined).map((k) => ` ${k}="${esc(f[k])}"`).join("");
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
    modal.classList.toggle("is-drawer", Boolean(def.drawer));
    $("#modalTitle").textContent = def.title;
    $("#modalIntro").textContent = def.intro;
    fieldsBox.innerHTML = def.fields.map(fieldHTML).join("");
    window.AIPISPhoneInput.decorate(fieldsBox);
    if (trigger.dataset.package && form.elements.package) form.elements.package.value = trigger.dataset.package;
    if (trigger.dataset.role && form.elements.role) form.elements.role.value = trigger.dataset.role;
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

  function closeRolePicker() {
    rolePicker.hidden = true;
  }

  function openRolePicker(trigger) {
    rolePicker.hidden = false;
    rolePicker.dataset.trigger = "role-picker";
    rolePicker._trigger = trigger;
    $(".role-picker-options button", rolePicker).focus();
  }

  document.addEventListener("click", (e) => {
    const rolePickerLink = e.target.closest("[data-role-picker]");
    if (rolePickerLink) {
      if (location.pathname.endsWith("speakers.html")) e.preventDefault();
      else return;
      openRolePicker(rolePickerLink);
      return;
    }
    if (e.target.closest("[data-role-picker-close]")) {
      closeRolePicker();
      return;
    }
    const roleChoice = e.target.closest(".role-picker-options [data-form]");
    if (roleChoice) {
      closeRolePicker();
      open(roleChoice.dataset.form, roleChoice);
      return;
    }
    const trigger = e.target.closest("[data-form]");
    if (trigger) open(trigger.dataset.form, trigger);
    if (e.target.closest("[data-close]")) close();
  });

  form.addEventListener("change", (e) => {
    if (e.target.type !== "file") return;
    const name = e.target.closest(".file-picker")?.querySelector("[data-file-name]");
    if (name) name.textContent = e.target.files[0]?.name || "No file selected · JPG, PNG or WEBP up to 5 MB";
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
      $("#modalTitle").textContent = currentKind === "roundtable" ? "Request received" : "Thank you";
      setStatus(form, FORMS[currentKind].success || "Your submission has been received. The AIPIS Secretariat will be in touch.", "ok");
      submitBtn.hidden = true;
      cancelBtn.textContent = "Close";
      cancelBtn.focus();
    });
  });
})();
