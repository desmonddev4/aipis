/* Team page: administrators manage staff accounts. */
(() => {
  "use strict";

  const { AdminAPI: API, AdminIcons: Icons, AdminUI: UI } = window;
  const root = document.getElementById("teamRoot");
  const me = API.session.user() || {};

  if (!me.is_superuser) {
    root.innerHTML = `<div class="card chart-empty"><div>${Icons.svg("key", 32)}<p><strong>Only administrators can manage the team.</strong></p><p>Ask an administrator if you need an account changed.</p></div></div>`;
    document.getElementById("addMember").hidden = true;
    return;
  }

  const passwordHint = "At least 8 characters, not too common and not only numbers.";

  function row(u) {
    const self = u.id === me.id;
    return `<tr data-id="${u.id}">
      <td><div class="who"><strong>${UI.esc(u.name)}${self ? " (you)" : ""}</strong><span>${UI.esc(u.username)}${u.email ? " · " + UI.esc(u.email) : ""}</span></div></td>
      <td><span class="kind-tag">${u.is_superuser ? "Administrator" : "Staff"}</span></td>
      <td>${u.is_active ? '<span class="badge badge-handled">Active</span>' : '<span class="badge badge-archived">Deactivated</span>'}</td>
      <td class="when">${UI.fmtDateTime(u.last_login)}</td>
      <td class="actions">
        <button class="btn btn-outline btn-sm" data-act="password">Reset password</button>
        ${self ? "" : `<button class="btn btn-outline btn-sm" data-act="toggle">${u.is_active ? "Deactivate" : "Activate"}</button>
        <button class="btn btn-outline btn-sm" data-act="role">${u.is_superuser ? "Make staff" : "Make admin"}</button>
        <button class="btn btn-danger btn-sm" data-act="delete">Delete</button>`}
      </td></tr>`;
  }

  let users = [];

  function render() {
    root.innerHTML = `<section class="card flush"><div class="table-wrap"><table class="data static">
      <thead><tr><th>Person</th><th>Role</th><th>Status</th><th>Last sign-in</th><th>Actions</th></tr></thead>
      <tbody>${users.map(row).join("")}</tbody></table></div></section>
      <p class="muted-p">Administrators can manage the team. Staff can work with submissions but cannot change other accounts.</p>`;
  }

  async function load() {
    root.innerHTML = '<div class="card chart-empty">Loading team...</div>';
    try {
      users = (await API.get("/users/")).results;
      render();
    } catch (err) {
      root.innerHTML = `<div class="card chart-empty"><div><p><strong>We could not load the team</strong></p><p>${UI.esc(err.message)}</p><button class="btn btn-primary" id="retry">Try again</button></div></div>`;
      document.getElementById("retry").addEventListener("click", load);
    }
  }

  document.getElementById("addMember").addEventListener("click", async () => {
    const done = await UI.formDialog({
      title: "Add a team member",
      intro: "They can sign in to this dashboard straight away with these details.",
      submitText: "Create account",
      fields: [
        { name: "first_name", label: "First name", autocomplete: "off" },
        { name: "last_name", label: "Last name" },
        { name: "email", label: "Email", type: "email" },
        { name: "username", label: "Username", required: true },
        { name: "password", label: "Temporary password", type: "password", required: true, hint: passwordHint, autocomplete: "new-password" },
        { name: "is_superuser", label: "Administrator (can manage the team)", type: "checkbox" },
      ],
      onSubmit: (v) => API.post("/users/", v),
    });
    if (done) {
      UI.toast("Team member added.");
      load();
    }
  });

  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const u = users.find((x) => x.id === Number(btn.closest("tr").dataset.id));
    const act = btn.dataset.act;

    try {
      if (act === "password") {
        const done = await UI.formDialog({
          title: `Reset password for ${u.name}`,
          intro: "They will be signed out everywhere and must use the new password.",
          submitText: "Set password",
          fields: [{ name: "password", label: "New password", type: "password", required: true, hint: passwordHint, autocomplete: "new-password" }],
          onSubmit: (v) => API.patch(`/users/${u.id}/`, { password: v.password }),
        });
        if (done) UI.toast("Password updated.");
      } else if (act === "toggle") {
        const ok = await UI.confirm({
          title: `${u.is_active ? "Deactivate" : "Activate"} ${u.name}?`,
          message: u.is_active ? "They will no longer be able to sign in." : "They will be able to sign in again.",
          confirmText: u.is_active ? "Deactivate" : "Activate",
          danger: u.is_active,
        });
        if (ok) {
          await API.patch(`/users/${u.id}/`, { is_active: !u.is_active });
          UI.toast("Account updated.");
          load();
        }
      } else if (act === "role") {
        const ok = await UI.confirm({
          title: u.is_superuser ? `Make ${u.name} a staff member?` : `Make ${u.name} an administrator?`,
          message: u.is_superuser ? "They will lose access to team management." : "They will be able to add, change and remove team members.",
          confirmText: "Confirm",
        });
        if (ok) {
          await API.patch(`/users/${u.id}/`, { is_superuser: !u.is_superuser });
          UI.toast("Role updated.");
          load();
        }
      } else if (act === "delete") {
        const ok = await UI.confirm({ title: `Delete ${u.name}?`, message: "Their account is removed permanently. Notes they wrote stay on submissions.", confirmText: "Delete", danger: true });
        if (ok) {
          await API.del(`/users/${u.id}/`);
          UI.toast("Account deleted.");
          load();
        }
      }
    } catch (err) {
      UI.toast(err.message, "error");
    }
  });

  load();
})();
