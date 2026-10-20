/* Shared form helpers: validation, error display and the POST to the Django API. */
(() => {
  "use strict";

  const cfg = window.AIPIS_CONFIG || {};
  const API = (cfg.API_URL || "").replace(/\/$/, "");
  const EMAIL = cfg.CONTACT_EMAIL || "info@aipisgh.org";

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const setStatus = (form, msg, type, html = false) => {
    const el = form.querySelector(".form-status");
    el.className = "form-status" + (type ? " " + type : "");
    if (html) el.innerHTML = msg;
    else el.textContent = msg;
  };

  const clearErrors = (form) => {
    form.querySelectorAll(".field.invalid").forEach((f) => f.classList.remove("invalid"));
    form.querySelectorAll(".field-error").forEach((e) => e.remove());
  };

  const showErrors = (form, errors) => {
    Object.entries(errors).forEach(([name, msg]) => {
      const input = form.elements[name];
      if (!input) return;
      const field = input.closest(".field");
      field.classList.add("invalid");
      field.insertAdjacentHTML("beforeend", `<span class="field-error">${esc(msg)}</span>`);
    });
    const first = form.querySelector(".field.invalid input, .field.invalid textarea, .field.invalid select");
    if (first) first.focus();
  };

  const clientValidate = (form) => {
    const errors = {};
    form.querySelectorAll("[required]").forEach((el) => {
      if (!el.value.trim()) errors[el.name] = "This field is required.";
    });
    const email = form.elements.email;
    if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) errors.email = "Please enter a valid email address.";
    return errors;
  };

  async function submitForm(form, kind, subject, onSuccess) {
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
    const btn = form.querySelector('button[type="submit"]');
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
      const mailto = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}`;
      setStatus(form, `We could not reach the server. Please try again or <a href="${mailto}">send us an email</a>.`, "err", true);
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  window.AIPIS = Object.assign(window.AIPIS || {}, { forms: { esc, setStatus, submitForm } });
})();
