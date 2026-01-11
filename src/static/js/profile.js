(function () {
  "use strict";

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return "";
  }

  function getCsrf() {
    const fromCookie = getCookie("csrftoken");
    if (fromCookie) return fromCookie;
    const inp = document.querySelector('#csrf-form input[name="csrfmiddlewaretoken"]');
    return inp ? inp.value : "";
  }

  const toastEl = document.getElementById("profile-toast");
  let toastTimer = null;

  function toast(msg, kind) {
    if (!toastEl) {
      if (msg) alert(msg);
      return;
    }

    toastEl.hidden = false;
    toastEl.classList.remove("is-error", "is-ok");
    if (kind === "ok") toastEl.classList.add("is-ok");
    if (kind === "error") toastEl.classList.add("is-error");
    toastEl.textContent = msg || "";

    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.hidden = true;
    }, 3200);
  }

  async function requestJson(url, opts) {
    const res = await fetch(url, {
      credentials: "same-origin",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRFToken": getCsrf(),
        ...(opts && opts.headers ? opts.headers : {})
      },
      ...opts
    });

    let data = null;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try {
        data = await res.json();
      } catch (_) {
        data = null;
      }
    }

    return { res, data };
  }

  const btnLogout = document.getElementById("btn-logout");
  const btnDelete = document.getElementById("btn-delete-account");

  if (btnLogout) {
    btnLogout.addEventListener("click", async function () {
      btnLogout.disabled = true;
      try {
        const { res, data } = await requestJson("/api/auth/logout/", { method: "POST" });
        if (res.status === 204) {
          window.location.href = "/login/";
          return;
        }
        if (res.status === 401) {
          window.location.href = "/login/";
          return;
        }
        const msg = (data && (data.detail || data.error)) || "Failed to logout.";
        toast(msg, "error");
      } catch (_) {
        toast("Network error.", "error");
      } finally {
        btnLogout.disabled = false;
      }
    });
  }

  if (btnDelete) {
    btnDelete.addEventListener("click", async function () {
      const ok = confirm("Delete account forever?");
      if (!ok) return;

      btnDelete.disabled = true;
      if (btnLogout) btnLogout.disabled = true;

      try {
        const { res, data } = await requestJson("/api/auth/profile/", { method: "DELETE" });

        if (res.status === 204) {
          window.location.href = "/signup/";
          return;
        }

        if (res.status === 401) {
          window.location.href = "/login/";
          return;
        }

        const msg = (data && (data.detail || data.error)) || "Failed to delete account.";
        toast(msg, "error");
      } catch (_) {
        toast("Network error.", "error");
      } finally {
        btnDelete.disabled = false;
        if (btnLogout) btnLogout.disabled = false;
      }
    });
  }
})();
