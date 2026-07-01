// Customer create form (customer) — not the list page.
(function () {
  function isCustomerForm() {
    const title = document.querySelector(".customer-page .page-title");
    return !!title && /create new customer/i.test((title.textContent || "").trim());
  }

  function bind() {
    if (!isCustomerForm()) return;
    const root = document.querySelector(".customer-page");
    if (!root) return;

    RbacBind.tagHeaders(root, {
      "button[type='submit'].btn-primary": "create",
    });
    if (window.RbacPage) window.RbacPage.applyAll(root);
  }

  window.RbacRegistry.registerMatcher(isCustomerForm, bind, "customer-form");
})();
