// Company Information view-only / save guard (rbac/pages).
(function () {
  function bind() {
    const root = document.querySelector(".company-page");
    if (!root) return;

    const canEdit = root.dataset.canEdit === "1";
    const isNew = root.dataset.isNewCompany === "1";
    if (window.RbacPage && typeof window.RbacPage.isUnrestricted === "function" && window.RbacPage.isUnrestricted()) {
      return;
    }
    if (isNew || canEdit) return;

    ["#saveCompanyBtn", "#editCompanyBtn"].forEach((sel) => {
      const el = document.querySelector(sel);
      if (el && !el.hasAttribute("data-rbac-action")) {
        el.setAttribute("data-rbac-action", "edit");
      }
    });

    if (window.RbacPage) window.RbacPage.applyAll(root);
  }

  window.RbacRegistry.register("company-page", bind);
})();
