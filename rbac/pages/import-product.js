// Import products (products).
(function () {
  function isImportProduct() {
    const title = document.querySelector(".import-page .import-title");
    return !!title && /import products/i.test((title.textContent || "").trim());
  }

  function bind() {
    if (!isImportProduct()) return;
    const root = document.querySelector(".import-page");
    RbacBind.tagHeaders(root, { "#submitImport": "create" });
    if (window.RbacPage) window.RbacPage.applyAll(root);
  }

  window.RbacRegistry.registerMatcher(isImportProduct, bind, "import-product");
})();
