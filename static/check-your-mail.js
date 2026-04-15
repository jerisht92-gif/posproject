// =============================
// ELEMENTS
// =============================
const cymEmailInput = document.getElementById("cym-email");
const cymResendBtn  = document.getElementById("cymResendBtn");
const cymStatusEl   = document.getElementById("cymStatus");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


// =============================
// VALIDATION
// =============================
function validateCymEmail() {
  const val = (cymEmailInput.value || "").trim();

  if (!val) {
    cymStatusEl.textContent = "Email is required.";
    cymStatusEl.style.color = "#ffffff";
    return false;
  }
  if (!emailRegex.test(val)) {
    cymStatusEl.textContent = "Please enter a valid email address.";
    cymStatusEl.style.color = "#ffffff";
    return false;
  }

  cymStatusEl.textContent = "";
  return true;
}


// =============================
// RESEND BUTTON CLICK
// =============================
cymResendBtn.addEventListener("click", () => {
  if (!validateCymEmail()) return;

  const email = cymEmailInput.value.trim();

  cymStatusEl.textContent = "Sending reset link...";
  cymStatusEl.style.color = "#ffd966";

  fetch("/send-reset-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "ok") {
      cymStatusEl.textContent = `Reset link sent to ${email}.`;
      cymStatusEl.style.color = "#00ff99";
    } else {
      cymStatusEl.textContent = data.message || "Could not send reset link.";
      cymStatusEl.style.color = "#ffffff";
    }
  })
  .catch(() => {
    cymStatusEl.textContent = "Network error. Please try again.";
    cymStatusEl.style.color = "#ffffff";
  });
});
