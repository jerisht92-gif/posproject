// Create Role page (department_roles) — rbac/pages only.
(function () {
  function isCreateRolePage() {
    return !!document.querySelector(".permission-table") && !!document.querySelector(".save-btn");
  }

  function bind() {
    if (!isCreateRolePage()) return;
    const root = document.querySelector(".container") || document.body;
    RbacBind.tagHeaders(root, {
      ".save-btn": "create",
      "#confirmOk": "create",
    });
    if (window.RbacPage) window.RbacPage.applyAll(root);
  }

  window.RbacRegistry.registerMatcher(isCreateRolePage, bind, "create-role");
})();
