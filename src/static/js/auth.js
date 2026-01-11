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

async function apiPost(url, payload, headersExtra = {}) {
    const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headersExtra },
        body: JSON.stringify(payload),
    });

    let data = null;
    try {
        data = await resp.json();
    } catch (e) {}

    if (!resp.ok) {
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

function getPendingEmail() {
    return (localStorage.getItem("pending_email") || "").trim();
}

function setPendingEmail(email) {
    localStorage.setItem("pending_email", (email || "").trim());
}

function clearPendingEmail() {
    localStorage.removeItem("pending_email");
}

document.addEventListener("DOMContentLoaded", () => {
    const access = (localStorage.getItem("access") || "").trim();
    if (access) {
        fetch("/api/auth/jwt/verify/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: access }),
        }).then((r) => {
            if (
                r.ok &&
                (window.location.pathname === "/login/" ||
                    window.location.pathname === "/signup/")
            ) {
                window.location.replace("/notes/");
            }
        });
    }

    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const confirmEmailForm = document.getElementById("confirm-email-form");
    const resetReqForm = document.getElementById("reset-password-request-form");
    const resetCodeForm = document.getElementById("reset-password-code-form");

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
                window.location.href = "/notes/";
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
            const passwordConfirm = (fd.get("password_confirm") || "").toString();

            if (!username || !email || !password || !passwordConfirm) {
                showErrors(errBox, "Please fill username, email and both password fields.");
                return;
            }

            if (password !== passwordConfirm) {
                showErrors(errBox, "Passwords do not match.");
                return;
            }

            try {
                await apiPost("/api/auth/register/", {
                    username,
                    email,
                    password,
                    password_confirm: passwordConfirm,
                });
                setPendingEmail(email);
                window.location.href = "/confirm-email/";
            } catch (err) {
                showErrors(errBox, err.message || "Sign up failed.");
            }
        });
    }

    if (confirmEmailForm) {
        const errBox = document.getElementById("confirm-email-errors");

        confirmEmailForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideErrors(errBox);

            const fd = new FormData(confirmEmailForm);
            const code = (fd.get("code") || "").toString().trim();
            const email = getPendingEmail();

            if (!email) {
                showErrors(errBox, "No email found. Please sign up again.");
                return;
            }

            if (!code) {
                showErrors(errBox, "Please enter the code.");
                return;
            }

            try {
                await apiPost("/api/auth/email/confirm/", { email, code });
                clearPendingEmail();
                window.location.href = "/login/";
            } catch (err) {
                showErrors(errBox, err.message || "Confirmation failed.");
            }
        });

        const resend = document.getElementById("resend-email-code");
        if (resend) {
            resend.addEventListener("click", async (e) => {
                e.preventDefault();
                hideErrors(errBox);

                const email = getPendingEmail();
                if (!email) {
                    showErrors(errBox, "No email found. Please sign up again.");
                    return;
                }

                try {
                    await apiPost("/api/auth/email/resend/", { email, code: "000000" });
                    showErrors(errBox, "Code resent.");
                } catch (err) {
                    showErrors(errBox, err.message || "Resend failed.");
                }
            });
        }
    }

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

            window.location.href = "/reset-password/code/";
        });
    }

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

            window.location.href = "/login/";
        });
    }
});
