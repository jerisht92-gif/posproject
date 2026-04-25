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
const firstNameInput = document.querySelector('input[name="firstName"]');
const lastNameInput = document.querySelector('input[name="lastName"]');
const phoneInput = document.querySelector('input[name="phone"]');
const countryCodeSelect = document.getElementById("countryCode");
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
  /^[A-Za-z0-9._%+-]{3,40}@(gmail\.com|yahoo\.com|yahoo\.co\.in|outlook\.com|hotmail\.com|thestackly\.com|stackly\.in)$/i;

const passwordRegex = /^(?=.*[A-Z])(?=(?:.*\d){3,})(?=.*[!@#$%^&*]).{8,15}$/;
const lastNameRegex = /^[A-Za-z\s]{1,30}$/;

const COUNTRY_RULES = {
  "91":  { min: 10, max: 10 }, // IN
  "971": { min: 9,  max: 9  }, // AE
  "974": { min: 8,  max: 8  }, // QA
  "966": { min: 9,  max: 9  }, // SA
  "94":  { min: 9,  max: 9  }, // LK
  "880": { min: 10, max: 10 }, // BD
  "977": { min: 10, max: 10 }, // NP
  "1":   { min: 10, max: 10 }, // US
  "44":  { min: 10, max: 10 }, // GB
  "61":  { min: 9,  max: 9  }, // AU
  "81":  { min: 10, max: 10 }, // JP (you added in dropdown)
};

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

function showErrorToast(message, durationMs = 3000) {
  document
    .querySelectorAll(".success-notification, .error-notification")
    .forEach((n) => n.remove());

  const notification = document.createElement("div");
  notification.className = "error-notification";
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => notification.classList.add("show"), 10);

  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 400);
  }, durationMs);
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
firstNameInput.addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/[^A-Za-z\s]/g, "");
  validateFirstName();
});

lastNameInput.addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/[^A-Za-z\s]/g, "");
  validateLastName();
});

function validateFirstName() {
  const val = firstNameInput.value.trim();
  if (!val) return showError(firstNameInput, "First name is required"), false;
  if (val.length < 3)
    return showError(firstNameInput, "Minimum 3 characters required"), false;
  if (!nameRegex.test(val))
    return showError(firstNameInput, "Use 3-20 letters only"), false;
  showSuccess(firstNameInput);
  return true;
}

function validateLastName() {
  const val = lastNameInput.value.trim();
  if (!val) return showError(lastNameInput, "Last name is required"), false;
  if (val.length < 1)
    return showError(lastNameInput, "Minimum 1 characters required"), false;
  if (!lastNameRegex.test(val))
    return showError(lastNameInput, "Use 1-30 letters only"), false;
  showSuccess(lastNameInput);
  return true;
}

function getSelectedCodeDigits() {
  // "+91" -> "91"
  return (countryCodeSelect?.value || "+91").replace("+", "");
}

function getPhoneRule() {
  const code = getSelectedCodeDigits();
  return COUNTRY_RULES[code] || { min: 8, max: 15 };
}

function buildFullPhone() {
  const code = countryCodeSelect.value;          // "+91"
  const num  = phoneInput.value.trim();          // "9876543210"
  return `${code}${num}`;                        // "+919876543210"
}

function updatePhoneMaxLength() {
  const rule = getPhoneRule();
  phoneInput.value = phoneInput.value.replace(/\D/g, "").slice(0, rule.max);
}

// when user types phone
phoneInput.addEventListener("input", () => {
  updatePhoneMaxLength();
  validatePhone();
});

// when user changes country
countryCodeSelect.addEventListener("change", () => {
  updatePhoneMaxLength();
  validatePhone();
});

function validatePhone() {
  const digits = phoneInput.value.trim();
  const rule   = getPhoneRule();
  const code   = countryCodeSelect.value;

  if (!digits) return showError(phoneInput, "Phone is required"), false;

  if (digits.length < rule.min || digits.length > rule.max) {
    return showError(
      phoneInput,
      `For ${code}, phone must be ${rule.min} digits`
    ), false;
  }

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
        // ⭐ Move cursor to OTP field
        setTimeout(() => {
          if (otpInput) otpInput.focus();
        }, 100);
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
        
        // Update signup button state after OTP verification
        updateSignupButtonState();
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
    showErrorToast(
      "Clipboard operations are disabled on password field for security."
    );
  });
});

["copy", "cut", "paste"].forEach((evt) => {
  confirmPasswordInput.addEventListener(evt, function (e) {
    e.preventDefault();
    showErrorToast(
      "Clipboard operations are disabled on password field for security."
    );
  });
});

// =============================
// ✅ Enable/Disable Signup Button
// =============================
function updateSignupButtonState() {
  if (!signupBtn) return;
  
  const validFirstName = validateFirstName();
  const validLastName = validateLastName();
  const validPhone = validatePhone();
  const validEmail = validateEmail();
  const validPass = validatePassword();
  const validConfirm = validateConfirmPassword();
  
  // Also check if OTP is verified
  const isOtpVerified = otpVerified;
  
  // Enable button only if all fields are valid AND OTP is verified
  signupBtn.disabled = !(validFirstName && validLastName && validPhone && validEmail && validPass && validConfirm && isOtpVerified);
}

// Call updateSignupButtonState whenever fields change
firstNameInput.addEventListener("input", () => {
  validateFirstName();
  updateSignupButtonState();
});

lastNameInput.addEventListener("input", () => {
  validateLastName();
  updateSignupButtonState();
});

phoneInput.addEventListener("input", () => {
  validatePhone();
  updateSignupButtonState();
});

emailInput.addEventListener("input", () => {
  validateEmail();
  updateSignupButtonState();
});

passwordInput.addEventListener("input", () => {
  validatePassword();
  validateConfirmPassword();
  updateSignupButtonState();
});

confirmPasswordInput.addEventListener("input", () => {
  validateConfirmPassword();
  updateSignupButtonState();
});

// Note: verifyOtpBtn.onclick is already defined below, and it calls updateSignupButtonState() after successful verification

// Initialize button as disabled
if (signupBtn) {
  signupBtn.disabled = true;
}

// =============================
// 💾 Signup Submit
// =============================
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Disable button and show loading state
  if (signupBtn) {
    signupBtn.disabled = true;
    const originalText = signupBtn.textContent;
    signupBtn.textContent = "Signing Up...";
    signupBtn.dataset.originalText = originalText;
  }

  const validFirstName = validateFirstName();
  const validLastName = validateLastName();
  const validPhone = validatePhone();
  const validEmail = validateEmail();
  const validPass = validatePassword();
  const validConfirm = validateConfirmPassword();

  if (!validFirstName || !validLastName || !validPhone || !validEmail || !validPass || !validConfirm) {
    statusMsg.textContent = "❌ Please Fill all the fields .";
    statusMsg.style.color = "white";
    
    // Re-enable button on validation error
    if (signupBtn) {
      signupBtn.disabled = false;
      signupBtn.textContent = signupBtn.dataset.originalText || "Sign Up";
    }
    return;
  }

  const fullName = `${firstNameInput.value.trim()} ${lastNameInput.value.trim()}`.trim();
  const userData = {
    name: fullName,
    first_name: firstNameInput.value.trim(),
    last_name: lastNameInput.value.trim(),
    phone: buildFullPhone(),
    country_code: countryCodeSelect.value,
    contact_number: phoneInput.value.trim(),
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
      otpVerified = false;

      otpInput.disabled = true;
      verifyOtpBtn.disabled = true;
      passwordInput.disabled = true;
      confirmPasswordInput.disabled = true;
      
      // Re-enable button on error
      if (signupBtn) {
        signupBtn.disabled = true; // Keep disabled since form is reset
        signupBtn.textContent = signupBtn.dataset.originalText || "Sign Up";
      }
      return;
    }

    if (!res.ok) {
      statusMsg.textContent = data.message || "❌ Signup failed!";
      statusMsg.style.color = "white";
      
      // Re-enable button on error
      if (signupBtn) {
        signupBtn.disabled = false;
        signupBtn.textContent = signupBtn.dataset.originalText || "Sign Up";
        updateSignupButtonState();
      }
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
    
    // Re-enable button on error
    if (signupBtn) {
      signupBtn.disabled = false;
      signupBtn.textContent = signupBtn.dataset.originalText || "Sign Up";
      updateSignupButtonState();
    }
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
              name: `${firstNameInput.value.trim()} ${lastNameInput.value.trim()}`.trim() || "User",
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
