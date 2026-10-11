/* Account page: edit your details and change your password. */
(() => {
  "use strict";

  const { AdminAPI: API, AdminUI: UI } = window;
  const $ = (id) => document.getElementById(id);
  const me = API.session.user() || {};

  $("firstName").value = me.first_name || "";
  $("lastName").value = me.last_name || "";
  $("email").value = me.email || "";
  $("username").value = me.username || "";
  $("role").textContent = me.is_superuser ? "Administrator" : "Staff";

  const status = (el, msg, type) => {
    el.textContent = msg;
    el.className = "form-status" + (type ? " " + type : "");
  };

  $("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const out = $("profileStatus");
    status(out, "", "");
    try {
      const res = await API.patch("/me/", { first_name: $("firstName").value, last_name: $("lastName").value, email: $("email").value });
      API.session.updateUser(res.user);
      UI.toast("Your details were saved.");
    } catch (err) {
      status(out, err.message, "err");
    }
  });

  $("passwordForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const out = $("passwordStatus");
    status(out, "", "");
    if ($("newPassword").value !== $("confirmPassword").value) return status(out, "The two new passwords do not match.", "err");
    try {
      const res = await API.post("/password/", { current: $("currentPassword").value, new: $("newPassword").value });
      API.session.updateToken(res.token);
      e.target.reset();
      UI.toast("Password changed.");
    } catch (err) {
      status(out, err.message, "err");
    }
  });
})();
