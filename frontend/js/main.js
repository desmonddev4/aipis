(() => {
  "use strict";

  const cfg = window.AIPIS_CONFIG || {};
  const API = (cfg.API_URL || "").replace(/\/$/, "");
  const EMAIL = cfg.CONTACT_EMAIL || "info@aipis.knust.edu.gh";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- Navbar ---------- */
  const nav = $("#nav");
  const navToggle = $("#navToggle");
  const navMenu = $("#navMenu");
  const dropdowns = $$(".has-dropdown");

  const closeMenu = () => {
    navMenu.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  };
  const closeDropdowns = (except) =>
    dropdowns.forEach((d) => {
      if (d !== except) {
        d.classList.remove("open");
        $(".dropdown-toggle", d).setAttribute("aria-expanded", "false");
      }
    });

  navToggle.addEventListener("click", () => {
    const open = navMenu.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });

  dropdowns.forEach((d) => {
    const btn = $(".dropdown-toggle", d);
    btn.addEventListener("click", () => {
      const open = !d.classList.contains("open");
      closeDropdowns(d);
      d.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
  });

  // Close menus after choosing a link, on outside click, or Escape
  navMenu.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      closeMenu();
      closeDropdowns();
    }
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#nav")) {
      closeMenu();
      closeDropdowns();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
      closeDropdowns();
    }
  });

  /* ---------- Scroll: progress, navbar state, back to top, scrollspy ---------- */
  const progress = $("#progress");
  const toTop = $("#toTop");
  const spyLinks = $$('.nav-menu a[href^="#"]:not(.btn)');
  const speakerIds = ["speakers", "keynote", "guest", "technical", "posters", "exhibitors"];
  const spyTargets = [...new Set(spyLinks.map((a) => a.getAttribute("href").slice(1)))]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    nav.classList.toggle("scrolled", y > 20);
    toTop.hidden = y < 700;

    let current = "";
    const line = window.innerHeight * 0.35;
    for (const el of spyTargets) {
      if (el.getBoundingClientRect().top <= line) current = el.id;
    }
    const inSpeakers = speakerIds.includes(current);
    spyLinks.forEach((a) => {
      const id = a.getAttribute("href").slice(1);
      a.classList.toggle("active", id === current);
    });
    dropdowns.forEach((d) => d.classList.toggle("active", inSpeakers));
  };
  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          onScroll();
          ticking = false;
        });
      }
    },
    { passive: true }
  );
  onScroll();
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  /* ---------- Scroll reveal ---------- */
  const reveals = $$(".reveal");
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

  /* ---------- Forms ---------- */
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
    contact: { subject: "AIPIS 2027 enquiry" },
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const fieldHTML = (f, idPrefix) => {
    const id = `${idPrefix}-${f.name}`;
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

  const setStatus = (form, msg, type, html = false) => {
    const el = $(".form-status", form);
    el.className = "form-status" + (type ? " " + type : "");
    if (html) el.innerHTML = msg;
    else el.textContent = msg;
  };

  const clearErrors = (form) => {
    $$(".field.invalid", form).forEach((f) => f.classList.remove("invalid"));
    $$(".field-error", form).forEach((e) => e.remove());
  };

  const showErrors = (form, errors) => {
    Object.entries(errors).forEach(([name, msg]) => {
      const input = form.elements[name];
      if (!input) return;
      const field = input.closest(".field");
      field.classList.add("invalid");
      field.insertAdjacentHTML("beforeend", `<span class="field-error">${esc(msg)}</span>`);
    });
    const first = $(".field.invalid input, .field.invalid textarea, .field.invalid select", form);
    if (first) first.focus();
  };

  const clientValidate = (form) => {
    const errors = {};
    $$("[required]", form).forEach((el) => {
      if (!el.value.trim()) errors[el.name] = "This field is required.";
    });
    const email = form.elements.email;
    if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) errors.email = "Please enter a valid email address.";
    return errors;
  };

  const mailtoFallback = (kind) => `mailto:${EMAIL}?subject=${encodeURIComponent((FORMS[kind] || {}).subject || "AIPIS 2027 enquiry")}`;

  async function submitForm(form, kind, onSuccess) {
    clearErrors(form);
    setStatus(form, "", "");
    const errors = clientValidate(form);
    if (Object.keys(errors).length) {
      showErrors(form, errors);
      setStatus(form, "Please correct the highlighted fields.", "err");
      return;
    }

    const payload = { kind };
    new FormData(form).forEach((v, k) => (payload[k] = v));
    const btn = $('button[type="submit"]', form);
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Sending...";

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30000); // Render free tier may need to wake up
      const res = await fetch(`${API}/api/submit/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        onSuccess();
        return;
      }
      if (data.errors && Object.keys(data.errors).some((k) => k !== "__all__")) showErrors(form, data.errors);
      setStatus(form, (data.errors && data.errors.__all__) || "Please correct the highlighted fields.", "err");
    } catch {
      setStatus(form, `We could not reach the server. Please try again or <a href="${mailtoFallback(kind)}">send us an email</a>.`, "err", true);
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  /* Contact form on the page */
  const contactForm = $("#contactForm");
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    submitForm(contactForm, "contact", () => {
      contactForm.reset();
      setStatus(contactForm, "Thank you. Your message has been sent to the AIPIS Secretariat.", "ok");
    });
  });

  /* Modal */
  const modal = $("#modal");
  const modalForm = $("#modalForm");
  const modalFields = $("#modalFields");
  let lastTrigger = null;
  let currentKind = null;

  const focusables = () => $$("input:not(.hp), select, textarea, button, a[href]", modal.querySelector(".modal-dialog")).filter((el) => !el.disabled);

  function openModal(kind, trigger) {
    const def = FORMS[kind];
    if (!def || !def.fields) return;
    currentKind = kind;
    lastTrigger = trigger;
    $("#modalTitle").textContent = def.title;
    $("#modalIntro").textContent = def.intro;
    modalFields.innerHTML = def.fields.map((f) => fieldHTML(f, "m")).join("");
    if (trigger && trigger.dataset.package && modalForm.elements.package) modalForm.elements.package.value = trigger.dataset.package;
    setStatus(modalForm, "", "");
    $$("button", modalForm).forEach((b) => (b.disabled = false));
    modal.hidden = false;
    document.body.classList.add("modal-open");
    const first = $("input, textarea, select", modalFields);
    if (first) first.focus();
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (lastTrigger) lastTrigger.focus();
  }

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-form]");
    if (trigger) {
      closeMenu();
      openModal(trigger.dataset.form, trigger);
    }
    if (e.target.closest("[data-close]")) closeModal();
  });

  modal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
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

  modalForm.addEventListener("submit", (e) => {
    e.preventDefault();
    submitForm(modalForm, currentKind, () => {
      modalFields.innerHTML = "";
      $("#modalIntro").textContent = "";
      $("#modalTitle").textContent = "Thank you";
      setStatus(modalForm, "Your submission has been received. The AIPIS Secretariat will be in touch.", "ok");
      $$('button[type="submit"]', modalForm).forEach((b) => (b.hidden = true));
      const cancel = $("[data-close]", modalForm);
      cancel.textContent = "Close";
      cancel.focus();
    });
  });

  // Restore submit button each time the modal opens
  new MutationObserver(() => {
    if (!modal.hidden) {
      $$('button[type="submit"]', modalForm).forEach((b) => (b.hidden = false));
      const cancel = $("[data-close]", modalForm);
      if (cancel) cancel.textContent = "Cancel";
    }
  }).observe(modal, { attributes: true, attributeFilter: ["hidden"] });
})();
