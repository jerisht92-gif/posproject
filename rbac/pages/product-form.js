// Create / edit product form (products).
(function () {
  function bind() {
    const root = document.querySelector(".create-product-page");
    if (!root) return;

    RbacBind.tagHeaders(root, {
      "button[type='submit'].btn.primary": "create",
      "button[type='submit'].btn-primary": "create",
      "#updateWarehouseBtn": "edit",
      "#updateCategoryBtn": "edit",
      "#updateTaxCodeBtn": "edit",
      "#updateUomBtn": "edit",
      "#updateSizeBtn": "edit",
      "#updateColorBtn": "edit",
      "#updateSupplierBtn": "edit",
      "#addNewCategoryLink": "create",
      "#addNewTaxCodeLink": "create",
    });
    if (window.RbacPage) window.RbacPage.applyAll(root);
  }

  window.RbacRegistry.register("create-product-page", bind);
})();
