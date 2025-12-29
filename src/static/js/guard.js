(function () {
  document.documentElement.classList.add("page-hidden");
})();

async function jwtVerify(token) {
  const resp = await fetch("/api/auth/jwt/verify/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return resp.ok;
}

function clearTokens() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}

function showPage() {
  document.documentElement.classList.remove("page-hidden");
  document.documentElement.classList.add("page-visible");
}

async function requireAuth() {
  const access = (localStorage.getItem("access") || "").trim();
  if (!access) {
    window.location.replace("/login/");
    return;
  }

  const ok = await jwtVerify(access);
  if (!ok) {
    clearTokens();
    window.location.replace("/login/");
    return;
  }

  showPage();
}

document.addEventListener("DOMContentLoaded", () => {
  requireAuth();
});
