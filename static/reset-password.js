// =============================
// Token from body attribute
// =============================
const token = document.body.getAttribute("data-token");
// OR: const token = document.body.dataset.token;   // both are same
console.log("Reset token from HTML:", token);

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

// ✅ flag to know if reset already success
let resetSuccess = false;

// =============================
// Helpers
// =============================
function clearErrors() {
  newPwdErrorEl.textContent = "";
  confirmPwdErrorEl.textContent = "";
  statusEl.textContent = "";
}

// Password rule check
function checkPasswordRules(pwd) {
  const lengthOK   = pwd.length >= 8 && pwd.length <= 20;
  const hasUpper   = /[A-Z]/.test(pwd);
  const hasLower   = /[a-z]/.test(pwd);
  const hasNumber  = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

  return lengthOK && hasUpper && hasLower && hasNumber && hasSpecial;
}

function validatePasswords() {
  clearErrors();

  const pwd  = newPwdInput.value.trim();
  const cpwd = confirmPwdInput.value.trim();

  let ok = true;

  if (!pwd) {
    newPwdErrorEl.textContent = "Password is required.";
    ok = false;
  } else if (pwd.length < 8 || pwd.length > 20) {
    newPwdErrorEl.textContent = "Password must be 8–20 characters long.";
    ok = false;
  } else if (!checkPasswordRules(pwd)) {
    newPwdErrorEl.textContent =
      "Password must contain uppercase, lowercase, number and special character.";
    ok = false;
  }

  if (!cpwd) {
    confirmPwdErrorEl.textContent = "Please confirm your password.";
    ok = false;
  } else if (pwd && pwd !== cpwd) {
    confirmPwdErrorEl.textContent = "Passwords do not match.";
    ok = false;
  }

  return ok;
}

// =============================
// Events: live clearing + Caps Lock warning
// =============================
newPwdInput.addEventListener("input", () => {
  newPwdErrorEl.textContent = "";
  statusEl.textContent = "";
});

confirmPwdInput.addEventListener("input", () => {
  confirmPwdErrorEl.textContent = "";
  statusEl.textContent = "";
});

["keyup", "keydown"].forEach((ev) => {
  newPwdInput.addEventListener(ev, (e) => {
    if (e.getModifierState && e.getModifierState("CapsLock")) {
      capsWarningEl.textContent = "Warning: Caps Lock is ON.";
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
// Toggle eye buttons
// =============================
function toggleVisibility(input, btn) {
  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "🙈";
  } else {
    input.type = "password";
    btn.textContent = "👁";
  }
}

toggleNewBtn.addEventListener("click", () =>
  toggleVisibility(newPwdInput, toggleNewBtn)
);

toggleConfirmBtn.addEventListener("click", () =>
  toggleVisibility(confirmPwdInput, toggleConfirmBtn)
);

// =============================
// Submit handler + Login redirect
// =============================
resetBtn.addEventListener("click", () => {
  // ✅ after success, next click = go to login
  if (resetSuccess) {
    window.location.href = "/login";
    return;
  }

  if (!validatePasswords()) return;

  const password = newPwdInput.value.trim();

  statusEl.textContent = "Updating password...";
  statusEl.style.color = "#ffd966";

  fetch("/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "ok") {
        statusEl.textContent =
          "Password updated successfully. You can login now.";
        statusEl.style.color = "#00ff99";

        // 🎯 mark success
        resetSuccess = true;

        // Change button text + style
        resetBtn.textContent = "Login";
        resetBtn.classList.add("login-mode");

        // disable fields so user can't change again
        newPwdInput.disabled = true;
        confirmPwdInput.disabled = true;
      } else {
        statusEl.textContent =
          "Error: " + (data.message || "Could not update password.");
        statusEl.style.color = "#ffffff";
      }
    })
    .catch((err) => {
      console.error("Reset password fetch error:", err);
      statusEl.textContent = "Network error. Please try again.";
      statusEl.style.color = "#ffffff";
    });
});
