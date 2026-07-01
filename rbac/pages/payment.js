// Create Payment page (rbac/pages) — does not replace create-payment.js.
(function () {
  function isPaymentPage() {
    const saveBtn = document.getElementById("savePaymentBtn");
    const title = document.querySelector(".dn2-title");
    if (!saveBtn || !title) return false;
    return /create\s*payment/i.test((title.textContent || "").trim());
  }

  async function bindPayment() {
    if (!isPaymentPage()) return;

    if (window.RbacSession && window.RbacSession.ensureLoaded) {
      await window.RbacSession.ensureLoaded();
    }

    const root = document.querySelector(".dn2-page");
    if (!root) return;

    RbacBind.tagHeaders(root, {
      "#savePaymentBtn": "create",
    });
    if (window.RbacPage) window.RbacPage.applyAll(root);
  }

  window.RbacRegistry.registerMatcher(isPaymentPage, bindPayment, "payment");
})();
