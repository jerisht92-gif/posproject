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
  if (statusEl) {
    statusEl.textContent = "";
    statusEl.classList.remove("success");
  }
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

function setSending(isSending) {
  if (!sendBtn) return;
  sendBtn.disabled = isSending;
  sendBtn.textContent = isSending ? "Sending..." : "Send reset link";
}


// =============================
// 3. SEND RESET LINK (direct — no check-your-mail page)
// =============================
sendBtn.addEventListener("click", () => {
  clearMessages();

  if (!validateEmailField()) return;

  const email = emailInput.value.trim().toLowerCase();

  setSending(true);
  if (statusEl) {
    statusEl.textContent = "Sending reset link...";
    statusEl.classList.remove("success");
    statusEl.style.color = "#8f1e43";
  }

  fetch("/send-reset-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
    .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (ok && data.status === "ok") {
        emailErrorEl.textContent = "";
        if (statusEl) {
          statusEl.textContent =
            `Reset link sent to ${email}. Check your inbox and spam folder.`;
          statusEl.classList.add("success");
          statusEl.style.color = "#1a7f4e";
        }
        return;
      }
      emailErrorEl.textContent =
        data.message === "Email not registered."
          ? "Enter a registered email address."
          : data.message || "Could not send reset link.";
      if (statusEl) statusEl.textContent = "";
    })
    .catch(() => {
      if (statusEl) {
        statusEl.textContent = "Network error. Please try again.";
        statusEl.style.color = "#6e102c";
      }
    })
    .finally(() => setSending(false));
});
