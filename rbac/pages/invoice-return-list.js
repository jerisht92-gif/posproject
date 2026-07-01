// Invoice return list (invoice_return).
(function () {
  function isInvoiceReturnList() {
    const heading = document.querySelector(".dn-heading");
    return (
      !!heading &&
      /invoice return/i.test((heading.textContent || "").trim()) &&
      !document.getElementById("invoiceTableBody")
    );
  }

  async function bind() {
    if (!isInvoiceReturnList()) return;

    if (window.RbacSession && window.RbacSession.ensureLoaded) {
      await window.RbacSession.ensureLoaded();
    }

    const root = document.getElementById("deliveryNotePage") || document.body;

    RbacBind.tagHeaders(root, {
      "#newDeliveryNoteBtn": "create",
      ".dn-btn-primary": "create",
    });
    if (window.RbacPage) window.RbacPage.applyAll(root);
  }

  window.RbacRegistry.registerMatcher(isInvoiceReturnList, bind, "invoice-return-list");
})();
