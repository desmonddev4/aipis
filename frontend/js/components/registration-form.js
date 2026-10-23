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
    card.innerHTML = '<legend>Attendee ' + count + '</legend><button type="button" class="btn btn-outline remove-delegate" aria-label="Remove attendee ' + count + '">Remove</button><div class="registration-grid"><label>Full name<input data-field="name" autocomplete="name" required maxlength="120"></label><label>Email<input data-field="email" type="email" autocomplete="email" required maxlength="254"></label><label>Country<input data-field="country" autocomplete="country-name" required maxlength="100"></label><label>Registration category<select data-field="category" required><option value="">Choose category</option>' + categories.map((c) => '<option value="' + c + '">' + c + '</option>').join("") + '</select></label></div>';
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
    const payload = { consent: data.get("consent") === "on", attendees };
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
