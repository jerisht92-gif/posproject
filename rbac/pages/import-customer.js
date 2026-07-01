// Import customers (customer).
(function () {
  function isImportCustomer() {
    const title = document.querySelector(".import-page .import-title");
    return !!title && /import customers/i.test((title.textContent || "").trim());
  }

  function bind() {
    if (!isImportCustomer()) return;
    const root = document.querySelector(".import-page");
    RbacBind.tagHeaders(root, { "#submitImport": "create" });
    if (window.RbacPage) window.RbacPage.applyAll(root);
  }

  window.RbacRegistry.registerMatcher(isImportCustomer, bind, "import-customer");
})();
