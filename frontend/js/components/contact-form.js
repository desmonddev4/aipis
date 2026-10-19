/* Contact form on contact.html (the markup lives in that page). */
(() => {
  "use strict";

  const form = document.getElementById("contactForm");
  if (!form) return;
  const { setStatus, submitForm } = window.AIPIS.forms;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submitForm(form, "contact", "AIPIS 2028 enquiry", () => {
      form.reset();
      setStatus(form, "Thank you. Your message has been sent to the AIPIS Secretariat.", "ok");
    });
  });
})();
