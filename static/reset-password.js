// =============================
// Token from body attribute
// =============================
const token = document.body.getAttribute("data-token");

// =============================
// Element selection
// =============================
const newPwdInput       = document.getElementById("newPassword");
const confirmPwdInput   = document.getElementById("confirmPassword");
const newPwdErrorEl     = document.getElementById("newPwdError");
const confirmPwdErrorEl = document.getElementById("confirmPwdError");
const resetBtn          = document.getElementById("resetBtn");
const statusEl          = document.getElementById("resetStatus");
const capsWarningEl     = document.getElementById("capsWarning");
const toggleNewBtn      = document.getElementById("toggleNewPwd");
const toggleConfirmBtn  = document.getElementById("toggleConfirmPwd");
const eyeNewIcon        = document.getElementById("eyeNewIcon");
const eyeConfirmIcon    = document.getElementById("eyeConfirmIcon");

let resetSuccess = false;

// =============================
// Helpers
// =============================
function clearErrors() {
  newPwdErrorEl.textContent = "";
  confirmPwdErrorEl.textContent = "";
  newPwdInput?.closest(".password-group")?.classList.remove("input-error");
  confirmPwdInput?.closest(".password-group")?.classList.remove("input-error");
  statusEl.textContent = "";
  statusEl.className = "status-msg";
}

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "status-msg";
  if (type) statusEl.classList.add(type);
}

const PASSWORD_RULE_MSG =
  "Password must be 8–20 characters and include uppercase, lowercase, number and special character.";

function getNewPasswordError(pwd) {
  if (!pwd) return "Password is required.";
  if (pwd.length < 8 || pwd.length > 20) {
    return "Password must be 8–20 characters long.";
  }
  const hasUpper   = /[A-Z]/.test(pwd);
  const hasLower   = /[a-z]/.test(pwd);
  const hasNumber  = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
  if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    return PASSWORD_RULE_MSG;
  }
  return "";
}

function setPasswordGroupError(inputEl, errorEl, message) {
  const group = inputEl?.closest(".password-group");
  if (message) {
    errorEl.textContent = message;
    group?.classList.add("input-error");
    return false;
  }
  errorEl.textContent = "";
  group?.classList.remove("input-error");
  return true;
}

function validateNewPasswordLive() {
  if (!newPwdInput || newPwdInput.disabled) return true;
  const pwd = newPwdInput.value.trim();
  return setPasswordGroupError(newPwdInput, newPwdErrorEl, getNewPasswordError(pwd));
}

function validateConfirmPasswordLive() {
  if (!confirmPwdInput || confirmPwdInput.disabled) return true;
  const pwd = newPwdInput.value.trim();
  const cpwd = confirmPwdInput.value.trim();
  if (!cpwd) {
    return setPasswordGroupError(
      confirmPwdInput,
      confirmPwdErrorEl,
      "Please confirm your password."
    );
  }
  if (pwd && pwd !== cpwd) {
    return setPasswordGroupError(
      confirmPwdInput,
      confirmPwdErrorEl,
      "Passwords do not match."
    );
  }
  return setPasswordGroupError(confirmPwdInput, confirmPwdErrorEl, "");
}

function validatePasswords() {
  clearErrors();
  const newOk = validateNewPasswordLive();
  const confirmOk = validateConfirmPasswordLive();
  return newOk && confirmOk;
}

// =============================
// Events: live clearing + Caps Lock warning
// =============================
newPwdInput.addEventListener("input", () => {
  validateNewPasswordLive();
  if (confirmPwdInput.value.trim()) validateConfirmPasswordLive();
  setStatus("", null);
});

confirmPwdInput.addEventListener("input", () => {
  validateConfirmPasswordLive();
  setStatus("", null);
});

["keyup", "keydown"].forEach((ev) => {
  newPwdInput.addEventListener(ev, (e) => {
    if (e.getModifierState && e.getModifierState("CapsLock")) {
      capsWarningEl.textContent = "Caps Lock is ON.";
    } else {
      capsWarningEl.textContent = "";
    }
  });
});

// =============================
// Disable copy / paste / cut / right-click
// =============================
["copy", "cut", "paste", "contextmenu"].forEach((evt) => {
  newPwdInput.addEventListener(evt, (e) => e.preventDefault());
  confirmPwdInput.addEventListener(evt, (e) => e.preventDefault());
});

// =============================
// Toggle eye buttons (SVG icons)
// =============================
const EYE_OPEN = `
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
  <circle cx="12" cy="12" r="3"></circle>
`;

const EYE_CLOSED = `
  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20
           C5 20 1 12 1 12c.38-.78 1.87-3.32 5.29-6.71M9.9 4.24
           A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8
           a21.82 21.82 0 0 1-2.23 3.4M12 12
           a3 3 0 0 0 3 3M3 3l18 18"></path>
`;

function toggleVisibility(input, iconEl) {
  const isPassword = input.getAttribute("type") === "password";
  input.setAttribute("type", isPassword ? "text" : "password");
  iconEl.innerHTML = isPassword ? EYE_CLOSED : EYE_OPEN;
  iconEl.setAttribute("stroke", "currentColor");
}

toggleNewBtn.addEventListener("click", (e) => {
  e.preventDefault();
  toggleVisibility(newPwdInput, eyeNewIcon);
});

toggleConfirmBtn.addEventListener("click", (e) => {
  e.preventDefault();
  toggleVisibility(confirmPwdInput, eyeConfirmIcon);
});

// =============================
// Submit handler + Login redirect
// =============================
resetBtn.addEventListener("click", () => {
  if (resetSuccess) {
    window.location.href = "/login";
    return;
  }

  if (!validatePasswords()) return;

  const password = newPwdInput.value.trim();

  setStatus("Updating password...", null);
  resetBtn.disabled = true;

  fetch("/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "ok") {
        setStatus("Password updated successfully. You can log in now.", "success");
        resetSuccess = true;
        resetBtn.textContent = "Log In";
        resetBtn.disabled = false;
        newPwdInput.disabled = true;
        confirmPwdInput.disabled = true;
        toggleNewBtn.disabled = true;
        toggleConfirmBtn.disabled = true;
      } else {
        setStatus("Error: " + (data.message || "Could not update password."), "error");
        resetBtn.disabled = false;
      }
    })
    .catch((err) => {
      console.error("Reset password fetch error:", err);
      setStatus("Network error. Please try again.", "error");
      resetBtn.disabled = false;
    });
});
