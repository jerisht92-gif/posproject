document.addEventListener("DOMContentLoaded", () => {
  const loginForm      = document.getElementById("loginForm");
  const emailInput     = document.getElementById("email");
  const passwordInput  = document.getElementById("password");
  const loginErrorMsg  = document.getElementById("loginErrorMsg");
  const emailError     = document.getElementById("emailError");
  const passwordError  = document.getElementById("passwordError");
  const togglePassword = document.getElementById("togglePassword");
  const eyeIcon        = document.getElementById("eyeIcon");
  const loginBtn       = document.getElementById("loginBtn");

  // const API_BASE = "https://anithag.pythonanywhere.com";
  const API_BASE = "";

  // =====================================================
  // 🚫 SAFEGUARD — Clear autofilled values on page load
  // =====================================================
  if (emailInput && emailInput.matches(":-webkit-autofill")) {
    emailInput.value = "";
  }
  if (passwordInput && passwordInput.matches(":-webkit-autofill")) {
    passwordInput.value = "";
  }

  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      emailInput.value = "";
      passwordInput.value = "";
    }
  });

  // --- Stop silent autofill; allow only user-initiated fill ---
  const realEmail = emailInput;
  const realPass  = passwordInput;

  realEmail.readOnly = true;
  realPass.readOnly  = true;
  realEmail.setAttribute("autocomplete", "off");
  realPass.setAttribute("autocomplete", "off");
  realEmail.setAttribute("name", "dummy-email");
  realPass.setAttribute("name", "dummy-password");
  realEmail.value = "";
  realPass.value  = "";

  const enableField = (el, opts) => {
    el.readOnly = false;
    el.setAttribute("name", opts.name);
    el.setAttribute("autocomplete", opts.autocomplete);
  };

  realEmail.addEventListener(
    "focus",
    () => {
      enableField(realEmail, { name: "email", autocomplete: "username" });
      setTimeout(() => realEmail.focus(), 0);
    },
    { once: true }
  );

  realPass.addEventListener(
    "focus",
    () => {
      enableField(realPass, { name: "password", autocomplete: "current-password" });
    },
    { once: true }
  );

  // =====================================================
  // ✅ Auto focus email field on load or refresh
  // =====================================================
  setTimeout(() => {
    if (realEmail) {
      realEmail.readOnly = false;
      realEmail.setAttribute("name", "email");
      realEmail.setAttribute("autocomplete", "username");
      realEmail.focus();
    }
  }, 50);

  // =====================================================
  // 🔔 Show messages based on query parameters
  // =====================================================
  const urlParams = new URLSearchParams(window.location.search);
  const message   = urlParams.get("message");

  if (message === "session_expired") {
    loginErrorMsg.textContent = "⏰ Session expired! Please log in again.";
    loginErrorMsg.style.color = "orange";
  } else if (message === "logged_out") {
    loginErrorMsg.textContent = "✅ You have been logged out successfully.";
    loginErrorMsg.style.color = "white";
  } else if (message === "invalid") {
    loginErrorMsg.textContent = "❌ Invalid email or password.";
    loginErrorMsg.style.color = "white";
  }

  // =====================================================
  // Show signup success message if redirected
  // =====================================================
  if (localStorage.getItem("signupSuccess") === "true") {
    loginErrorMsg.textContent = "✅ Signup successful! Please log in.";
    loginErrorMsg.style.color = "white";
    localStorage.removeItem("signupSuccess");
  }

  // =====================================================
  // Validation regex
  // =====================================================
  // ✅ UPDATED: allow any proper email (same style as backend)
  const emailRegex    = /^[A-Za-z0-9._%+-]{3,40}@[A-Za-z0-9.-]+\.[A-Za-z]{2,10}$/;
  const passwordRegex = /^(?=.*[A-Z])(?=(?:.*\d){3,})(?=.*[!@#$%^&*]).{8,15}$/;

  // =====================================================
  // Real-time email validation
  // =====================================================
  emailInput.addEventListener("input", () => {
    const emailVal = emailInput.value.trim();
    emailError.textContent    = "";
    loginErrorMsg.textContent = "";

    if (!emailVal) {
      emailError.textContent = "Email is required";
      emailError.style.color = "white";
    } else if (!emailRegex.test(emailVal)) {
      // ✅ UPDATED message
      emailError.textContent = "Enter a valid email address (example@company.com)";
      emailError.style.color = "white";
    }
    
    updateLoginButtonState();
  });

  // =====================================================
  // Caps Lock warning + password validation
  // =====================================================
  const capsWarning = document.createElement("div");
  capsWarning.id = "capsWarning";
  capsWarning.style.color     = "yellow";
  capsWarning.style.fontSize  = "12px";
  capsWarning.style.marginTop = "5px";

  // place caps warning just under the entire password row
  const passwordGroup = passwordInput.closest(".password-group") || passwordInput.parentNode;
  passwordGroup.insertBefore(capsWarning, passwordInput.parentNode.nextSibling);

  // check CapsLock on keyup
  passwordInput.addEventListener("keyup", (e) => {
    if (e.getModifierState && e.getModifierState("CapsLock")) {
      capsWarning.textContent = "⚠️ Caps Lock is ON";
    } else {
      capsWarning.textContent = "";
    }
  });

  // validate password content on input
  passwordInput.addEventListener("input", () => {
    validatePassword();
    updateLoginButtonState();
  });

  function validatePassword() {
    const passwordVal = passwordInput.value.trim();

    passwordError.textContent = "";
    passwordError.style.color = "white";

    if (!passwordVal) {
      passwordError.textContent = "Password is required";
    } else if (!passwordRegex.test(passwordVal)) {
      passwordError.textContent =
        "Min 8 chars, 3 numbers, 1 uppercase & 1 special char";
    } else {
      passwordError.textContent = "";
    }
  }

  // =====================================================
  // Disable copy, cut, paste
  // =====================================================
  ["copy", "cut", "paste"].forEach((evt) => {
    passwordInput.addEventListener(evt, (e) => {
      e.preventDefault();
      alert("Clipboard operations are disabled on password field for security.");
    });
  });

  // =====================================================
  // 👁 Toggle password visibility (single custom eye)
  // =====================================================
  togglePassword.addEventListener("click", (e) => {
    e.preventDefault();
    const isPassword = passwordInput.getAttribute("type") === "password";
    passwordInput.setAttribute("type", isPassword ? "text" : "password");

    if (isPassword) {
      // SHOW password → eye with slash
      eyeIcon.innerHTML = `
        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20
                 C5 20 1 12 1 12c.38-.78 1.87-3.32 5.29-6.71M9.9 4.24
                 A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8
                 a21.82 21.82 0 0 1-2.23 3.4M12 12
                 a3 3 0 0 0 3 3M3 3l18 18"></path>
      `;
    } else {
      // HIDE password → normal eye
      eyeIcon.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8
                 -4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      `;
    }

    // Always keep stroke same colour (dark gray/black)
    eyeIcon.setAttribute("stroke", "#555");
  });

  // =====================================================
  // ✅ Enable/Disable Login Button
  // =====================================================
  function updateLoginButtonState() {
    if (!loginBtn) return;
    
    const emailVal = emailInput.value.trim();
    const passwordVal = passwordInput.value.trim();
    
    // Enable button only if both email and password are valid
    const emailValid = emailVal && emailRegex.test(emailVal);
    const passwordValid = passwordVal && passwordRegex.test(passwordVal);
    
    loginBtn.disabled = !(emailValid && passwordValid);
  }


  // Initialize button as disabled
  if (loginBtn) {
    loginBtn.disabled = true;
  }

  // =====================================================
  // Login form submit handler
  // =====================================================
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Disable button and show loading state
    if (loginBtn) {
      loginBtn.disabled = true;
      const originalText = loginBtn.textContent;
      loginBtn.textContent = "Logging In...";
      loginBtn.dataset.originalText = originalText;
    }

    const emailVal    = emailInput.value.trim();
    const passwordVal = passwordInput.value.trim();
    const rememberMe  = document.getElementById("rememberMe")?.checked;

    let hasError = false;

    if (!emailVal) {
      emailError.textContent = "Email is required";
      emailError.style.color = "white";
      hasError = true;
    } else if (!emailRegex.test(emailVal)) {
      // ✅ UPDATED message
      emailError.textContent = "Enter a valid email address (example@company.com)";
      emailError.style.color = "white";
      hasError = true;
    }

    if (!passwordVal) {
      passwordError.textContent = "Password is required";
      passwordError.style.color = "white";
      hasError = true;
    }

    if (hasError) {
      loginErrorMsg.textContent = "";
      
      // Re-enable button on validation error
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = loginBtn.dataset.originalText || "Log In";
        updateLoginButtonState();
      }
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailVal, password: passwordVal, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.message.includes("locked")) {
          showMessage(`🔒 ${data.message}`, "lock");
          startLockCountdown(data.message);
          loginBtn.textContent = "Account Locked";
          loginBtn.disabled = true;
          return;
        }
        showMessage(data.message || "❌ Invalid email or password", "error");
        
        // Re-enable button on error
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.textContent = loginBtn.dataset.originalText || "Log In";
          updateLoginButtonState();
        }
        return;
      }

      showMessage("✅ Login successful!", "success");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    } catch (err) {
      console.error("Error:", err);
      showMessage("⚠️ Server error. Please try again later.", "error");
      
      // Re-enable button on error
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = loginBtn.dataset.originalText || "Log In";
        updateLoginButtonState();
      }
    }
  });

  // =====================================================
  // Utility functions
  // =====================================================
  function showMessage(msg, type) {
    loginErrorMsg.textContent = msg;
    if (type === "error") loginErrorMsg.style.color = "white";
    else if (type === "success") loginErrorMsg.style.color = "#00ff99";
    else if (type === "lock") loginErrorMsg.style.color = "#ffd11a";
    else loginErrorMsg.style.color = "#fff";
  }

  function startLockCountdown(msg) {
    const match = msg.match(/(\d+)\s*seconds?/);
    if (!match) return;

    let seconds = parseInt(match[1], 10);

    const interval = setInterval(() => {
      if (seconds <= 0) {
        clearInterval(interval);
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
        showMessage("🔓 You can try logging in again now.", "success");
        return;
      }
      loginBtn.textContent = `Locked (${seconds}s)`;
      seconds--;
    }, 1000);
  }
});
