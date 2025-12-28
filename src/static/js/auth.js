function showErrors(el, messages) {
  if (!el) return;
  el.style.display = "block";
  el.innerText = Array.isArray(messages) ? messages.join("\n") : String(messages);
}

function hideErrors(el) {
  if (!el) return;
  el.style.display = "none";
  el.innerText = "";
}

async function apiPost(url, payload) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data = null;
  try { data = await resp.json(); } catch (e) {}

  if (!resp.ok) {
    // DRF validation format -> {field: [errors]}
    if (data && typeof data === "object") {
      const msgs = [];
      for (const k of Object.keys(data)) {
        msgs.push(`${k}: ${Array.isArray(data[k]) ? data[k].join(", ") : data[k]}`);
      }
      const err = new Error(msgs.join("\n"));
      err._data = data;
      err._status = resp.status;
      throw err;
    }
    const err = new Error(`Request failed (${resp.status})`);
    err._status = resp.status;
    throw err;
  }

  return data;
}

function looksLikeUserAlreadyExistsError(err) {
  const msg = (err && err.message) ? err.message.toLowerCase() : "";
  return msg.includes("username") && (msg.includes("exists") || msg.includes("already"));
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");

  if (loginForm) {
    const errBox = document.getElementById("login-errors");
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideErrors(errBox);

      const fd = new FormData(loginForm);
      const username = (fd.get("username") || "").toString().trim();
      const password = (fd.get("password") || "").toString();

      if (!username || !password) {
        showErrors(errBox, "Please fill username and password.");
        return;
      }

      try {
        const data = await apiPost("/api/auth/jwt/create/", { username, password });
        localStorage.setItem("access", data.access);
        localStorage.setItem("refresh", data.refresh);
        window.location.href = "/api/docs/";
      } catch (err) {
        showErrors(errBox, err.message || "Login failed.");
      }
    });
  }

  if (signupForm) {
    const errBox = document.getElementById("signup-errors");
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideErrors(errBox);

      const fd = new FormData(signupForm);
      const username = (fd.get("username") || "").toString().trim();
      const email = (fd.get("email") || "").toString().trim();
      const password = (fd.get("password") || "").toString();

      if (!username || !password) {
        showErrors(errBox, "Please fill username and password.");
        return;
      }

      try {
        await apiPost("/api/auth/register/", { username, email, password });
      } catch (err) {
        if (!looksLikeUserAlreadyExistsError(err)) {
          showErrors(errBox, err.message || "Sign up failed.");
          return;
        }
      }

      try {
        const data = await apiPost("/api/auth/jwt/create/", { username, password });
        localStorage.setItem("access", data.access);
        localStorage.setItem("refresh", data.refresh);
        window.location.href = "/api/docs/";
      } catch (err) {
        showErrors(errBox, err.message || "Login failed after sign up.");
      }
    });
  }
});

  const confirmEmailForm = document.getElementById("confirm-email-form");
  if (confirmEmailForm) {
    const errBox = document.getElementById("confirm-email-errors");
    confirmEmailForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideErrors(errBox);

      const fd = new FormData(confirmEmailForm);
      const code = (fd.get("code") || "").toString().trim();

      if (!code) {
        showErrors(errBox, "Please enter the code.");
        return;
      }

      // DEMO: pretend success
      window.location.href = "/login/";
    });

    const resend = document.getElementById("resend-email-code");
    if (resend) {
      resend.addEventListener("click", (e) => {
        e.preventDefault();
        showErrors(errBox, "Code resent (demo).");
      });
    }
  }

  const resetReqForm = document.getElementById("reset-password-request-form");
  if (resetReqForm) {
    const errBox = document.getElementById("reset-request-errors");
    resetReqForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideErrors(errBox);

      const fd = new FormData(resetReqForm);
      const email = (fd.get("email") || "").toString().trim();

      if (!email) {
        showErrors(errBox, "Please enter your email.");
        return;
      }

      // DEMO: pretend we sent code
      window.location.href = "/reset-password/code/";
    });
  }

  const resetCodeForm = document.getElementById("reset-password-code-form");
  if (resetCodeForm) {
    const errBox = document.getElementById("reset-code-errors");
    resetCodeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideErrors(errBox);

      const fd = new FormData(resetCodeForm);
      const code = (fd.get("code") || "").toString().trim();
      const newPassword = (fd.get("new_password") || "").toString();

      if (!code || !newPassword) {
        showErrors(errBox, "Please enter code and new password.");
        return;
      }

      // DEMO: pretend success
      window.location.href = "/login/";
    });
  }
