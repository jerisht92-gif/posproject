// Add new quotation form (quotation).
(function () {
  function isQuotationForm() {
    return !!document.querySelector(".quotation-full") && !!document.getElementById("submitBtn");
  }

  function bind() {
    if (!isQuotationForm()) return;
    const root = document.querySelector(".quotation-full") || document.body;

    RbacBind.tagHeaders(root, {
      "#submitBtn": "create",
      ".btn-save": "create",
    });
    if (window.RbacPage) window.RbacPage.applyAll(root);
  }

  window.RbacRegistry.registerMatcher(isQuotationForm, bind, "quotation-form");
})();
