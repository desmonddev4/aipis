/* UI helpers: escaping, dates, status badges, toasts, confirm and form dialogs. */
(() => {
  "use strict";

  const Icons = window.AdminIcons;

  const KIND_LABELS = {
    contact: "Message",
    registration: "Registration",
    partnership: "Partnership",
    keynote: "Keynote nomination",
    guest: "Guest speaker",
    technical: "Technical presenter",
    poster: "Poster abstract",
    exhibitor: "Exhibitor booking",
    forensic: "Forensic Clinic",
  };
  const STATUS_LABELS = { new: "New", in_progress: "In progress", handled: "Handled", archived: "Archived" };

  const CSS = `
.badge { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.22rem 0.7rem; border-radius: 999px; font-size: 0.82rem; font-weight: 700; line-height: 1.4; white-space: nowrap; }
.badge::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.badge-new { background: #ffe9cc; color: #8a4a05; }
.badge-in_progress { background: #dbeafe; color: #1d4a8a; }
.badge-handled { background: #d6efdc; color: #14562a; }
.badge-archived { background: #e8ecea; color: #4a5a52; }
.kind-tag { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 8px; background: var(--green-50); color: var(--green-900); font-size: 0.82rem; font-weight: 700; }

.toasts { position: fixed; right: 1.2rem; bottom: 1.2rem; z-index: 900; display: grid; gap: 0.6rem; width: min(380px, calc(100% - 2.4rem)); }
.toast { display: flex; gap: 0.7rem; align-items: flex-start; padding: 0.9rem 1rem; border-radius: 14px; background: var(--green-900); color: #fff; font-weight: 600; box-shadow: var(--shadow-lg); animation: ui-in 0.25s ease; }
.toast svg { flex-shrink: 0; margin-top: 2px; }
.toast.error { background: #8f1d16; }
.toast.leaving { opacity: 0; transform: translateY(8px); transition: 0.25s; }

.dlg-backdrop { position: fixed; inset: 0; z-index: 800; display: grid; place-items: center; padding: 1rem; background: rgba(8, 42, 26, 0.55); -webkit-backdrop-filter: blur(5px); backdrop-filter: blur(5px); animation: ui-fade 0.2s; }
.dlg { width: min(520px, 100%); max-height: calc(100svh - 2rem); overflow-y: auto; background: #fff; border-radius: 22px; padding: clamp(1.3rem, 4vw, 2rem); box-shadow: var(--shadow-lg); animation: ui-in 0.25s ease; }
.dlg h2 { font-size: 1.4rem; margin: 0 0 0.4rem; }
.dlg p { color: var(--ink-soft); margin: 0 0 1rem; }
.dlg .dlg-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.7rem; margin-top: 1.2rem; }
.dlg .dlg-error { color: #b3261e; font-weight: 600; margin: 0.5rem 0 0; min-height: 1.2em; }
@keyframes ui-in { from { opacity: 0; transform: translateY(10px); } }
@keyframes ui-fade { from { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .toast, .dlg, .dlg-backdrop { animation: none; } }`;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const dateTimeFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const fmtDate = (iso) => (iso ? dateFmt.format(new Date(iso)) : "Never");
  const fmtDateTime = (iso) => (iso ? dateTimeFmt.format(new Date(iso)) : "Never");

  function timeAgo(iso) {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + " h ago";
    if (s < 86400 * 7) return Math.floor(s / 86400) + " d ago";
    return fmtDate(iso);
  }

  const debounce = (fn, ms = 300) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };

  const badge = (status) => `<span class="badge badge-${esc(status)}">${esc(STATUS_LABELS[status] || status)}</span>`;

  let toastBox;
  function toast(message, type = "ok") {
    if (!toastBox) {
      toastBox = document.createElement("div");
      toastBox.className = "toasts";
      toastBox.setAttribute("role", "status");
      toastBox.setAttribute("aria-live", "polite");
      document.body.appendChild(toastBox);
    }
    const el = document.createElement("div");
    el.className = "toast" + (type === "error" ? " error" : "");
    el.innerHTML = Icons.svg(type === "error" ? "alert" : "check", 18) + `<span>${esc(message)}</span>`;
    toastBox.appendChild(el);
    setTimeout(() => {
      el.classList.add("leaving");
      setTimeout(() => el.remove(), 260);
    }, 4000);
  }

  function openDialog(html, onKey) {
    const backdrop = document.createElement("div");
    backdrop.className = "dlg-backdrop";
    backdrop.innerHTML = `<div class="dlg" role="dialog" aria-modal="true">${html}</div>`;
    const previous = document.activeElement;
    document.body.appendChild(backdrop);
    document.body.style.overflow = "hidden";
    const close = () => {
      backdrop.remove();
      document.body.style.overflow = "";
      document.removeEventListener("keydown", key);
      if (previous && previous.focus) previous.focus();
    };
    const key = (e) => {
      if (e.key === "Escape") onKey();
    };
    document.addEventListener("keydown", key);
    return { backdrop, dlg: backdrop.firstElementChild, close };
  }

  function confirmDialog({ title, message, confirmText = "Confirm", danger = false }) {
    return new Promise((resolve) => {
      const { backdrop, dlg, close } = openDialog(
        `<h2>${esc(title)}</h2><p>${esc(message)}</p>
         <div class="dlg-actions">
           <button class="btn btn-outline" data-act="no">Cancel</button>
           <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-act="yes">${esc(confirmText)}</button>
         </div>`,
        () => done(false)
      );
      const done = (v) => {
        close();
        resolve(v);
      };
      dlg.addEventListener("click", (e) => {
        const act = e.target.closest("[data-act]");
        if (act) done(act.dataset.act === "yes");
      });
      backdrop.addEventListener("mousedown", (e) => {
        if (e.target === backdrop) done(false);
      });
      dlg.querySelector('[data-act="no"]').focus();
    });
  }

  // fields: [{name,label,type,required,hint,value,autocomplete,options:[{value,label}]}]
  function formDialog({ title, intro = "", fields, submitText = "Save", onSubmit }) {
    return new Promise((resolve) => {
      const rows = fields
        .map((f) => {
          const id = "dlg-" + f.name;
          let control;
          if (f.type === "checkbox")
            return `<label class="check-row"><input type="checkbox" name="${f.name}" ${f.value ? "checked" : ""}> <span>${esc(f.label)}</span></label>`;
          if (f.type === "select")
            control = `<select id="${id}" name="${f.name}">${f.options.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("")}</select>`;
          else if (f.type === "textarea") control = `<textarea id="${id}" name="${f.name}" rows="5" ${f.required ? "required" : ""}>${esc(f.value || "")}</textarea>`;
          else
            control = `<input id="${id}" name="${f.name}" type="${f.type || "text"}" value="${esc(f.value || "")}" autocomplete="${f.autocomplete || "off"}" ${f.required ? "required" : ""}>`;
          return `<div class="field"><label for="${id}">${esc(f.label)}${f.required ? " *" : ""}</label>${control}${f.hint ? `<small class="hint">${esc(f.hint)}</small>` : ""}</div>`;
        })
        .join("");

      const { backdrop, dlg, close } = openDialog(
        `<h2>${esc(title)}</h2>${intro ? `<p>${esc(intro)}</p>` : ""}
         <form novalidate>${rows}<p class="dlg-error" role="alert"></p>
           <div class="dlg-actions"><button type="button" class="btn btn-outline" data-act="cancel">Cancel</button><button type="submit" class="btn btn-primary">${esc(submitText)}</button></div>
         </form>`,
        () => done(null)
      );
      const form = dlg.querySelector("form");
      const errBox = dlg.querySelector(".dlg-error");
      const submit = form.querySelector('[type="submit"]');
      const done = (v) => {
        close();
        resolve(v);
      };

      backdrop.addEventListener("mousedown", (e) => {
        if (e.target === backdrop) done(null);
      });
      dlg.querySelector('[data-act="cancel"]').addEventListener("click", () => done(null));
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errBox.textContent = "";
        form.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
        const values = {};
        for (const f of fields) {
          const el = form.elements[f.name];
          values[f.name] = f.type === "checkbox" ? el.checked : el.value.trim();
          if (f.required && !values[f.name]) {
            el.closest(".field").classList.add("invalid");
            errBox.textContent = `Please fill in: ${f.label}.`;
            el.focus();
            return;
          }
        }
        submit.disabled = true;
        try {
          await onSubmit(values);
          done(values);
        } catch (err) {
          errBox.textContent = err.message || "Something went wrong.";
          const bad = err.field && form.elements[err.field];
          if (bad) {
            bad.closest(".field").classList.add("invalid");
            bad.focus();
          }
          submit.disabled = false;
        }
      });
      const first = form.querySelector("input:not([type=checkbox]), textarea, select");
      if (first) first.focus();
    });
  }

  window.AdminUI = {
    KIND_LABELS,
    STATUS_LABELS,
    esc,
    fmtDate,
    fmtDateTime,
    timeAgo,
    debounce,
    badge,
    toast,
    confirm: confirmDialog,
    formDialog,
  };
})();
