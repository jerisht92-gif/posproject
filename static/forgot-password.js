// =============================
// 1. ELEMENTS & CONSTANTS
// =============================
const emailInput   = document.getElementById("fpEmail");
const sendBtn      = document.getElementById("fpSendBtn");
const emailErrorEl = document.getElementById("fpEmailError");
const statusEl     = document.getElementById("fpStatus");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


// =============================
// 2. HELPER FUNCTIONS
// =============================
function clearMessages() {
  emailErrorEl.textContent = "";
  if (statusEl) statusEl.textContent = "";
}

function validateEmailField() {
  const val = (emailInput.value || "").trim();

  if (!val) {
    emailErrorEl.textContent = "Email is required.";
    return false;
  }
  if (!emailRegex.test(val)) {
    emailErrorEl.textContent = "Please enter a valid email address.";
    return false;
  }

  return true;
}


// =============================
// 3. CLICK HANDLER
// =============================
sendBtn.addEventListener("click", () => {
  clearMessages();

  // 1️⃣ Format check
  if (!validateEmailField()) return;

  const email = emailInput.value.trim();

  if (statusEl) {
    statusEl.textContent = "Checking email...";
    statusEl.style.color = "#ffd966";
  }

  // 2️⃣ Ask backend if email is registered
  fetch("/check-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "ok") {
        const encoded = encodeURIComponent(email);
        window.location.href = "/check-your-mail?email=" + encoded;
      } else {
        emailErrorEl.textContent = "Enter a registered email address.";
        if (statusEl) statusEl.textContent = "";
      }
    })
    .catch(() => {
      if (statusEl) {
        statusEl.textContent = "Network error. Please try again.";
        statusEl.style.color = "#ffffff";
      }
    });
});
