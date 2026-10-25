(() => {
  "use strict";
  const form = document.getElementById("registration-form");
  if (!form) return;
  const list = document.getElementById("delegate-list");
  const add = document.getElementById("add-delegate");
  const error = document.getElementById("registration-error");
  const submit = document.getElementById("registration-submit");
  const categories = ["International delegate", "African delegate (outside Ghana)", "Ghanaian delegate", "Public sector and university staff (Ghana)", "Student or young professional (under 35)"];
  let count = 0;
  let checkoutUrl = "";
  function addDelegate() {
    if (count >= 50) return;
    count += 1;
    const card = document.createElement("fieldset");
    card.className = "delegate-card";
    const phone = window.AIPISPhoneInput.markup({ id: "phone-" + count, name: "", field: "phone", required: true });
    card.innerHTML = '<legend>Attendee ' + count + '</legend><button type="button" class="btn btn-outline remove-delegate" aria-label="Remove attendee ' + count + '">Remove</button><div class="registration-grid"><label>Full name<input data-field="name" autocomplete="name" required maxlength="120"></label><label>Email<input data-field="email" type="email" autocomplete="email" required maxlength="254"></label><div class="registration-phone-field"><label for="phone-' + count + '">Phone number</label>' + phone + '</div><label>Country<input data-field="country" autocomplete="country-name" required maxlength="100"></label><label>Registration category<select data-field="category" required><option value="">Choose category</option>' + categories.map((c) => '<option value="' + c + '">' + c + '</option>').join("") + '</select></label></div><div class="exhibitor-fields" hidden><p class="exhibitor-fields-heading">Exhibitor details</p><div class="registration-grid"><label>Organisation name<input data-field="organisation" autocomplete="organization" maxlength="200"></label><label>Organisation website<input data-field="website" type="url" autocomplete="url" placeholder="https://" maxlength="250"></label><label>Industry or sector<input data-field="sector" maxlength="120"></label><label>Exhibition space (m²)<input data-field="space_sqm" type="number" min="1" max="1000" step="1" inputmode="numeric"></label><label class="field-wide">Products, services or projects to exhibit<textarea data-field="product_summary" rows="3" maxlength="2000"></textarea></label><label class="field-wide">Stand and technical requirements<textarea data-field="space_requirements" rows="3" maxlength="1000"></textarea></label></div><p class="note">Exhibition space is priced at USD 3,000 per square metre.</p></div>';
    window.AIPISPhoneInput.decorate(card);
    const category = card.querySelector('[data-field="category"]');
    const exhibitorFields = card.querySelector(".exhibitor-fields");
    const exhibitorInputs = [...exhibitorFields.querySelectorAll("[data-field]")];
    function toggleExhibitorFields() {
      const isExhibitor = category.value === "Exhibitor";
      exhibitorFields.hidden = !isExhibitor;
      exhibitorFields.setAttribute("aria-hidden", String(!isExhibitor));
      exhibitorInputs.forEach((input) => { input.required = isExhibitor && ["organisation", "sector", "space_sqm", "product_summary"].includes(input.dataset.field); });
    }
    category.addEventListener("change", toggleExhibitorFields);
    toggleExhibitorFields();
    card.querySelector(".remove-delegate").addEventListener("click", () => { card.remove(); renumber(); });
    list.appendChild(card);
    renumber();
  }
  function renumber() {
    const cards = [...list.children];
    count = cards.length;
    cards.forEach((card, index) => { card.querySelector("legend").textContent = "Attendee " + (index + 1); card.querySelector("button").setAttribute("aria-label", "Remove attendee " + (index + 1)); });
    add.disabled = count >= 50;
  }
  add.addEventListener("click", addDelegate);
  addDelegate();
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); error.textContent = "";
    if (checkoutUrl) { window.location.assign(checkoutUrl); return; }
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const attendees = [...list.children].map((card) => Object.fromEntries([...card.querySelectorAll("[data-field]")].map((input) => [input.dataset.field, input.value.trim()])));
    const payload = { consent: data.get("consent") === "on", attendees, organisation: attendees[0] && attendees[0].organisation ? attendees[0].organisation : "" };
    submit.disabled = true; submit.textContent = "Calculating total...";
    try {
      const api = (window.AIPIS_CONFIG && window.AIPIS_CONFIG.API_URL) || "";
      const response = await fetch(api + "/api/registration/checkout/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || Object.values(result.errors || {}).join(" ") || "Could not start registration.");
      error.textContent = "Total: GHS " + result.ghs_amount + " (USD " + result.usd_amount + "). Bank of Ghana rate: " + result.fx_rate + ", dated " + result.fx_rate_date + ". Review this amount, then continue to Paystack.";
      checkoutUrl = result.authorization_url;
      form.querySelectorAll("input, select, button").forEach((field) => { if (field !== submit) field.disabled = true; });
      submit.disabled = false;
      submit.textContent = "Proceed to Paystack";
    } catch (err) { error.textContent = err.message || "Something went wrong. Please try again."; submit.disabled = false; submit.textContent = "Continue to payment"; }
  });
})();
