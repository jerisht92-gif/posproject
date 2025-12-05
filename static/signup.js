// =============================
// 🌟 Element Selection
// =============================
const signupForm = document.getElementById("signupForm");
const sendOtpBtn = document.getElementById("sendOtpBtn");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");
const signupBtn = document.getElementById("signupBtn");
const otpInput = document.getElementById("otp");
const emailInput = document.getElementById("email");
const passwordInput = document.querySelector('input[name="password"]');
const nameInput = document.querySelector('input[name="name"]');
const phoneInput = document.querySelector('input[name="phone"]');
const statusMsg = document.getElementById("statusMsg");
const togglePassword = document.getElementById("togglePassword");
const eyeIcon = document.getElementById("eyeIcon");
const confirmPasswordInput = document.getElementById("confirmPassword");
const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");
const capsWarningSignup = document.getElementById("capsWarningSignup");
const eyeConfirmIcon = document.getElementById("eyeConfirmIcon");
const API_BASE = "https://anithag.pythonanywhere.com";

let welcomeSent = false;

// =============================
// 🌟 Regex Validation Rules
// =============================
const nameRegex = /^[A-Za-z\s]{3,20}$/;
const phoneRegex = /^[0-9]{10}$/;
const emailRegex =
  /^[A-Za-z0-9._%+-]{3,40}@(gmail\.com|yahoo\.com|yahoo\.co\.in|outlook\.com|hotmail\.com|stackly\.com|stackly\.in)$/i;

const passwordRegex = /^(?=.*[A-Z])(?=(?:.*\d){3,})(?=.*[!@#$%^&*]).{8,15}$/;

// =============================
// 🌟 Helper Functions
// =============================
function showError(input, message) {
  clearError(input);
  const parent = input.closest(".input-group");
  let err = parent.querySelector(".error-msg");

  if (!err) {
    err = document.createElement("small");
    err.classList.add("error-msg");
    err.style.color = "white";
    parent.appendChild(err);
  }

  err.textContent = message;
  input.style.borderColor = "white";
}

function showSuccess(input) {
  clearError(input);
  input.style.borderColor = "lightgreen";
}

function clearError(input) {
  const parent = input.closest(".input-group");
  const err = parent?.querySelector(".error-msg");
  if (err) err.remove();
  input.style.borderColor = "";
}

// Caps Lock warning handler
function handleCapsWarning(e) {
  if (!capsWarningSignup) return;
  const isOn = e.getModifierState && e.getModifierState("CapsLock");
  capsWarningSignup.style.display = isOn ? "block" : "none";
}

// =============================
// 🌟 Field Validations
// =============================
nameInput.addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/[^A-Za-z\s]/g, "");
  validateName();
});

function validateName() {
  const val = nameInput.value.trim();
  if (!val) return showError(nameInput, "Name is required"), false;
  if (val.length < 3)
    return showError(nameInput, "Minimum 3 characters required"), false;
  showSuccess(nameInput);
  return true;
}

phoneInput.addEventListener("input", () => {
  phoneInput.value = phoneInput.value.replace(/\D/g, "").slice(0, 10);
  validatePhone();
});

function validatePhone() {
  const val = phoneInput.value.trim();
  if (!val) return showError(phoneInput, "Phone is required"), false;
  if (!phoneRegex.test(val))
    return showError(phoneInput, "Enter 10-digit number"), false;
  showSuccess(phoneInput);
  return true;
}

emailInput.addEventListener("input", () => {
  validateEmail();   // this will also enable/disable the button
});

function validateEmail() {
  const val = emailInput.value.trim();

  // reset status text if you want
  // statusMsg.textContent = "";

  // Empty
  if (!val) {
    showError(emailInput, "Email is required");
    sendOtpBtn.disabled = true;
    return false;
  }

  // Length check (HTML maxlength is 30)
  if (val.length > 30) {
    showError(emailInput, "Email must be at most 30 characters");
    sendOtpBtn.disabled = true;
    return false;
  }

  // Regex format check
  if (!emailRegex.test(val)) {
    showError(emailInput, "Enter a valid email address (example@company.com)");
    sendOtpBtn.disabled = true;
    return false;
  }

  // ✅ Email format is OK
  showSuccess(emailInput);
  sendOtpBtn.disabled = false;   // 🔓 allow clicking Send OTP
  return true;
}


// Caps Lock events for password + confirm password
["keydown", "keyup"].forEach((evt) => {
  passwordInput.addEventListener(evt, handleCapsWarning);
  confirmPasswordInput.addEventListener(evt, handleCapsWarning);
});

passwordInput.addEventListener("blur", () => {
  capsWarningSignup.style.display = "none";
});
confirmPasswordInput.addEventListener("blur", () => {
  capsWarningSignup.style.display = "none";
});

function validatePassword() {
  const val = passwordInput.value.trim();
  if (passwordInput.disabled) return true;
  if (!val) return showError(passwordInput, "Password required"), false;
  if (!passwordRegex.test(val))
    return showError(
      passwordInput,
      "Min 8 chars, 3 numbers, 1 uppercase & 1 special char"
    ),
    false;
  showSuccess(passwordInput);
  return true;
}

let confirmTouched = false;

confirmPasswordInput.addEventListener("input", () => {
  confirmTouched = true;
  validateConfirmPassword();
});

function validateConfirmPassword() {
  if (!confirmTouched) return true;
  const pass = passwordInput.value.trim();
  const confirm = confirmPasswordInput.value.trim();
  if (!confirm)
    return showError(confirmPasswordInput, "Confirm Password required"), false;
  if (pass !== confirm)
    return showError(confirmPasswordInput, "Passwords do not match"), false;
  showSuccess(confirmPasswordInput);
  return true;
}

passwordInput.addEventListener("input", () => {
  validatePassword();
  validateConfirmPassword();
});

// =============================
// 🌟 OTP Attempt Limit + Cooldown + Verification Tracking
// =============================
let otpAttempts = 0;
const maxOtpAttempts = 5;
const otpCooldownTime = 30000; // 30 seconds cooldown
let otpVerified = false;
let otpCooldownActive = false;
let cooldownTimer = null;

// =============================
// 📩 Send OTP
// =============================
sendOtpBtn.onclick = function () {
  // 🔒 double-check before sending
  if (!validateEmail()) {
    statusMsg.textContent = "⚠️ Please enter a valid email address.";
    statusMsg.style.color = "orange";
    return;
  }

  const email = emailInput.value.trim();

  // Prevent resend if OTP already verified
  if (otpVerified) {
    statusMsg.textContent = "✅ OTP already verified. No need to resend.";
    statusMsg.style.color = "lightgreen";
    return;
  }

  // Prevent resend during cooldown
  if (otpCooldownActive) {
    statusMsg.textContent = "⏳ Please wait before requesting another OTP.";
    statusMsg.style.color = "orange";
    return;
  }

  // Limit attempts
  if (otpAttempts >= maxOtpAttempts) {
    statusMsg.textContent = "❌ Too many OTP requests. Try again later.";
    statusMsg.style.color = "white";
    sendOtpBtn.disabled = true;
    return;
  }

  if (!email) {
    statusMsg.textContent = "⚠️ Please enter your email first!";
    statusMsg.style.color = "orange";
    return;
  }

  otpAttempts++;
  statusMsg.textContent = "Sending OTP...";
  statusMsg.style.color = "white";
  sendOtpBtn.disabled = true;

  // Start cooldown
  otpCooldownActive = true;
  let timeLeft = otpCooldownTime / 1000;
  sendOtpBtn.textContent = `Resend OTP (${timeLeft}s)`;

  cooldownTimer = setInterval(() => {
    if (otpVerified) {
      clearInterval(cooldownTimer);
      otpCooldownActive = false;
      sendOtpBtn.disabled = true;
      sendOtpBtn.textContent = "OTP Verified";
      return;
    }

    timeLeft--;
    sendOtpBtn.textContent = `Resend OTP (${timeLeft}s)`;

    if (timeLeft <= 0) {
      clearInterval(cooldownTimer);
      otpCooldownActive = false;
      sendOtpBtn.disabled = false;
      sendOtpBtn.textContent = "ReSend OTP";
    }
  }, 1000);

  // Send OTP request
  fetch("/send_otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
    .then((res) => res.json())
    .then((data) => {
      statusMsg.textContent = data.message;
      if (data.success) {
        otpInput.disabled = false;
        verifyOtpBtn.disabled = false;
        confirmPasswordInput.disabled = false;
        statusMsg.style.color = "lightgreen";
      } else {
        statusMsg.style.color = "white";
      }
    })
    .catch(() => {
      statusMsg.textContent = "❌ Error sending OTP!";
      statusMsg.style.color = "white";
    });
};

// OTP must be ONLY digits and max 6
otpInput.addEventListener("input", () => {
  otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
});


// =============================
// ✅ Verify OTP
// =============================
verifyOtpBtn.onclick = function () {
  const email = emailInput.value.trim();
  const otp = otpInput.value.trim();

  if (!otp) {
    statusMsg.textContent = "⚠️ Enter OTP to verify!";
    statusMsg.style.color = "orange";
    return;
  }

  statusMsg.textContent = "Verifying OTP...";
  statusMsg.style.color = "white";

  fetch("/verify_otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  })
    .then((res) => res.json())
    .then((data) => {
      statusMsg.textContent = data.message;
      if (data.success) {
        otpVerified = true;
        verifyOtpBtn.disabled = true;
        otpInput.disabled = true;
        passwordInput.disabled = false;
        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = "OTP Verified";
        statusMsg.style.color = "lightgreen";

        if (cooldownTimer) {
          clearInterval(cooldownTimer);
          otpCooldownActive = false;
        }
      } else {
        statusMsg.style.color = "white";
      }
    })
    .catch(() => {
      statusMsg.textContent = "❌ Verification failed!";
      statusMsg.style.color = "white";
    });
};

// Disable copy, cut, paste on password fields
["copy", "cut", "paste"].forEach((evt) => {
  passwordInput.addEventListener(evt, function (e) {
    e.preventDefault();
    alert(
      "Clipboard operations are disabled on password field for security."
    );
  });
});

["copy", "cut", "paste"].forEach((evt) => {
  confirmPasswordInput.addEventListener(evt, function (e) {
    e.preventDefault();
    alert(
      "Clipboard operations are disabled on password field for security."
    );
  });
});

// =============================
// 💾 Signup Submit
// =============================
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const validName = validateName();
  const validPhone = validatePhone();
  const validEmail = validateEmail();
  const validPass = validatePassword();
  const validConfirm = validateConfirmPassword();

  if (!validName || !validPhone || !validEmail || !validPass || !validConfirm) {
    statusMsg.textContent = "❌ Please Fill all the fields .";
    statusMsg.style.color = "white";
    return;
  }

  const userData = {
    name: nameInput.value.trim(),
    phone: phoneInput.value.trim(),
    email: emailInput.value.trim(),
    password: passwordInput.value.trim(),
  };

  try {
    const res = await fetch("/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await res.json();

    if (res.status === 409) {
      // User exists / validation failed
      statusMsg.textContent = data.message;
      statusMsg.style.color = "orange";

      signupForm.reset();
      sendOtpBtn.textContent = "Send OTP";

      otpInput.disabled = true;
      verifyOtpBtn.disabled = true;
      passwordInput.disabled = true;
      confirmPasswordInput.disabled = true;
      return;
    }

    if (!res.ok) {
      statusMsg.textContent = data.message || "❌ Signup failed!";
      statusMsg.style.color = "white";
      return;
    }

    // Signup success
    statusMsg.textContent = data.message;
    statusMsg.style.color = "lightgreen";
    signupForm.reset();
    otpInput.disabled = true;
    verifyOtpBtn.disabled = true;
    passwordInput.disabled = true;
    confirmPasswordInput.disabled = true;

    setTimeout(() => {
      window.location.href = "/login";
    }, 1000);
  } catch (err) {
    statusMsg.textContent = "❌ Server error. Try again later.";
    statusMsg.style.color = "white";
  }
});

// =============================
// Optional: external verifyOtp using API_BASE
// =============================
async function verifyOtp() {
  const email = emailInput.value.trim();
  const otp = otpInput.value.trim();

  if (!otp) {
    statusMsg.textContent = "⚠️ Enter OTP to verify!";
    statusMsg.style.color = "orange";
    return;
  }

  statusMsg.textContent = "Verifying OTP...";
  statusMsg.style.color = "white";

  try {
    const res = await fetch(`${API_BASE}/verify_otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();
    statusMsg.textContent = data.message;

    if (data.success) {
      verifyOtpBtn.disabled = true;
      otpInput.disabled = true;
      passwordInput.disabled = false;
      statusMsg.style.color = "lightgreen";

      // Send welcome email once
      if (!welcomeSent) {
        try {
          await fetch(`${API_BASE}/send_welcome`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: email,
              name: nameInput.value.trim() || "User",
            }),
          });
          console.log("Welcome email sent");
          welcomeSent = true;
        } catch (err) {
          console.log("Failed to send welcome email:", err);
        }
      }
    } else {
      statusMsg.style.color = "white";
    }
  } catch (err) {
    statusMsg.textContent = "❌ Verification failed!";
    statusMsg.style.color = "white";
    console.error(err);
  }
}

// =============================
// 👁️ Password Toggle
// =============================
togglePassword.addEventListener("click", (e) => {
  e.preventDefault();
  const type =
    passwordInput.getAttribute("type") === "password" ? "text" : "password";
  passwordInput.setAttribute("type", type);

  if (type === "text") {
    eyeIcon.innerHTML =
      '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C5 20 1 12 1 12a21.79 21.79 0 0 1 5.29-6.71M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.82 21.82 0 0 1-2.23 3.4M12 12a3 3 0 0 0 3 3M3 3l18 18"/>';
  } else {
    eyeIcon.innerHTML =
      '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
  }
});

// =============================
// 👁️ Confirm Password Toggle
// =============================
toggleConfirmPassword.addEventListener("click", (e) => {
  e.preventDefault();
  const type =
    confirmPasswordInput.getAttribute("type") === "password"
      ? "text"
      : "password";
  confirmPasswordInput.setAttribute("type", type);

  if (type === "text") {
    eyeConfirmIcon.innerHTML =
      '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C5 20 1 12 1 12a21.79 21.79 0 0 1 5.29-6.71M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.82 21.82 0 0 1-2.23 3.4M12 12a3 3 0 0 0 3 3M3 3l18 18"/>';
  } else {
    eyeConfirmIcon.innerHTML =
      '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
  }
});
