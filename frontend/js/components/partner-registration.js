(() => {
  "use strict";
  const packages = [
    { name: "Founding Partner", fee: "USD 60,000", slots: "3 slots", benefits: "Recognition on all materials and report covers; opening keynote; International Advisory Board seat; roundtable with the Founding Government Partners; 10 VIP passes; 36 sq m exhibition space." },
    { name: "Prosperity Index Partner", fee: "USD 30,000", slots: "5 slots", benefits: "Joint sponsor credit on the Prosperity Index (one of five); shared launch speaking role; Index Technical Reference Group seat; 4 VIP passes; 9 sq m exhibition space." },
    { name: "Strategic Partner", fee: "USD 25,000", slots: "4 slots", benefits: "Naming of one main session or one of the AIPIS Roundtables; panel speaking slot; logo on stage and materials; 6 passes; 18 sq m exhibition space." },
    { name: "Knowledge Partner", fee: "USD 20,000 or in kind", slots: "4 slots", benefits: "Co-author credit on a summit report; one research session; Scientific Committee seat; 4 passes." },
    { name: "Industry Partner", fee: "USD 20,000", slots: "8 slots", benefits: "Procurement Exchange priority with up to 15 buyer meetings; field day hosting option; 9 sq m exhibition space; 3 passes." },
    { name: "Session Partner", fee: "USD 15,000", slots: "10 slots", benefits: "Naming of one thematic panel, session or award; one speaker or moderator role; 2 passes." },
    { name: "Gala Dinner Partner", fee: "USD 15,000", slots: "1 slot", benefits: "Naming of the Gala Dinner; welcome address; 10 dinner seats; 3 passes." },
    { name: "Field Day Partner", fee: "USD 12,000", slots: "1 slot", benefits: "Branding on field day transport and materials; remarks at one site; 3 passes." },
    { name: "Student and Young Professional Bursary Partner", fee: "USD 10,000", slots: "3 slots", benefits: "Funds 40 bursaries; named bursary scheme; 2 passes." },
    { name: "Delegate Kit and Digital Partner", fee: "USD 8,000", slots: "1 slot", benefits: "Branding on delegate kits, lanyards and the summit app; 2 passes." },
    { name: "Exhibitor", fee: "USD 3,000 per booth", slots: "30 booths", benefits: "One 6 sq m booth includes 2 delegate passes and a listing in the exhibitor directory." },
    { name: "General partnership enquiry", fee: "To be discussed", slots: "Subject to availability", benefits: "Tell us which partnership area interests your organisation and the Summit team will follow up." }
  ];
  const byName = new Map(packages.map((item) => [item.name, item]));
  const params = new URLSearchParams(location.search);
  const requested = params.get("package") || (params.get("role") === "exhibitor" ? "Exhibitor" : "");
  const form = document.getElementById("partner-application");
  const panels = [...form.querySelectorAll("[data-panel]")];
  const steps = [...document.querySelectorAll(".steps li")];
  const packageSelect = document.getElementById("package");
  const selectWrap = document.getElementById("package-select-wrap");
  const fixedPackage = document.getElementById("fixed-package");
  const exhibitor = document.getElementById("exhibitor-fields");
  const proposalWrap = document.getElementById("partnership-proposal-wrap");
  const error = document.getElementById("application-error");
  let current = 0;
  let selected = byName.get(requested);
  if (!selected) selected = byName.get("General partnership enquiry");
  if (requested && !byName.has(requested)) {
    document.getElementById("page-title").textContent = "Choose a partner package";
    error.textContent = "That package was not recognised. Please choose an application from the package list.";
  }
  packages.filter((p) => p.name !== "Exhibitor").forEach((p) => {
    const option = document.createElement("option"); option.value = p.name; option.textContent = p.name; packageSelect.appendChild(option);
  });
  function updatePackage() {
    selected = byName.get(packageSelect.value) || selected;
    const isExhibitor = selected.name === "Exhibitor";
    exhibitor.hidden = !isExhibitor;
    proposalWrap.hidden = isExhibitor;
    document.getElementById("proposal").required = !isExhibitor;
    document.getElementById("booths").required = isExhibitor;
    document.getElementById("product-summary").required = isExhibitor;
    document.getElementById("package-title").textContent = selected.name;
    document.getElementById("package-meta").textContent = selected.fee + " | " + selected.slots;
    document.getElementById("package-benefits").textContent = selected.benefits;
    document.getElementById("package-requirement").textContent = isExhibitor ? "Request the number of 6 sq m booths and describe the products, services or projects to display. Setup needs are optional." : "Describe the organisation contribution or activation proposed for this package.";
    document.getElementById("page-title").textContent = isExhibitor ? "Exhibitor registration" : "Partner registration";
    document.getElementById("application-title").textContent = isExhibitor ? "Exhibitor application" : "Partnership application";
    document.getElementById("review-summary").textContent = selected.name + " — " + selected.fee + ". " + selected.benefits;
  }
  if (requested && byName.has(requested)) {
    selectWrap.hidden = true;
    fixedPackage.value = selected.name;
    packageSelect.disabled = true;
  } else {
    selectWrap.hidden = false;
    packageSelect.value = selected.name;
  }
  packageSelect.addEventListener("change", updatePackage);
  updatePackage();
  function updateReview() {
    const data = new FormData(form);
    const lines = [
      "Package: " + selected.name + " (" + selected.fee + ")",
      "Organisation: " + (data.get("organisation") || ""),
      "Organisation type: " + (data.get("organisation_type") || ""),
      "Country: " + (data.get("country") || ""),
      "Website: " + (data.get("website") || "Not provided"),
      "Lead contact: " + (data.get("name") || ""),
      "Email: " + (data.get("email") || ""),
      "Phone: " + (data.get("phone") || "Not provided")
    ];
    if (selected.name === "Exhibitor") {
      lines.push("Booths requested: " + (data.get("booths") || "1"));
      lines.push("Products or services: " + (data.get("product_summary") || ""));
      lines.push("Space or setup requirements: " + (data.get("space_requirements") || "None provided"));
    } else {
      lines.push("Proposed support: " + (data.get("proposal") || ""));
    }
    document.getElementById("review-summary").textContent = lines.join("\n");
  }
  function showStep(index) {
    current = index;
    panels.forEach((panel, i) => { panel.hidden = i !== current; });
    steps.forEach((step, i) => { if (i === current) step.setAttribute("aria-current", "step"); else step.removeAttribute("aria-current"); });
    if (current === 2) updateReview();
    error.textContent = "";
  }
  function validatePanel(panel) {
    for (const field of panel.querySelectorAll("input, select, textarea")) {
      if (field.disabled || field.closest("[hidden]")) continue;
      if (field.required && !field.value.trim()) { field.focus(); error.textContent = "Please complete " + (field.labels && field.labels[0] ? field.labels[0].textContent : "the required field") + "."; return false; }
      if (!field.checkValidity()) { field.reportValidity(); return false; }
    }
    return true;
  }
  form.querySelectorAll("[data-next]").forEach((button) => button.addEventListener("click", () => {
    updatePackage();
    if (validatePanel(panels[current])) showStep(Math.min(current + 1, panels.length - 1));
  }));
  form.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", () => showStep(Math.max(current - 1, 0))));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validatePanel(panels[current])) return;
    if (!document.getElementById("consent").checked) { error.textContent = "Please agree to the registration terms and privacy notice."; return; }
    const data = new FormData(form);
    const isExhibitor = selected.name === "Exhibitor";
    const payload = {
      kind: isExhibitor ? "exhibitor" : "partnership",
      name: data.get("name").trim(),
      email: data.get("email").trim(),
      organisation: data.get("organisation").trim(),
      phone: data.get("phone").trim(),
      country: data.get("country").trim(),
      organisation_type: data.get("organisation_type"),
      website: data.get("website").trim(),
      package: selected.name,
      proposal: isExhibitor ? "" : data.get("proposal").trim(),
      booths: isExhibitor ? data.get("booths") : "",
      product_summary: isExhibitor ? data.get("product_summary").trim() : "",
      space_requirements: isExhibitor ? data.get("space_requirements").trim() : "",
      consent: data.get("consent") === "on",
      message: isExhibitor ? data.get("product_summary").trim() : data.get("proposal").trim()
    };
    const button = document.getElementById("submit-application");
    button.disabled = true; button.textContent = "Submitting...";
    error.textContent = "";
    try {
      const api = (window.AIPIS_CONFIG && window.AIPIS_CONFIG.API_URL) || "";
      const response = await fetch(api + "/api/submit/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error((result.errors && (result.errors.__all__ || Object.values(result.errors).join(" "))) || "We could not submit the application. Please check the form and try again.");
      form.hidden = true;
      const confirmation = document.getElementById("application-result");
      confirmation.hidden = false;
      confirmation.className = "success";
      confirmation.textContent = "Thank you. Your " + (isExhibitor ? "exhibitor registration" : "partnership application") + " has been sent to the AIPIS team. We will contact you using the email address provided.";
    } catch (err) {
      error.textContent = err.message || "We could not submit the application. Please try again.";
      button.disabled = false; button.textContent = "Submit application";
    }
  });
  showStep(0);
})();