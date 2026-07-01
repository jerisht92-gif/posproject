// Supplier create / edit / view form (suppliers module).
(function () {
  function isSupplierForm() {
    return !!document.getElementById("supplierForm");
  }

  function isViewSupplierMode() {
    const params = new URLSearchParams(window.location.search);
    const supplierId = (params.get("supplier_id") || "").trim();
    if (!supplierId) return false;
    const viewFlag = (params.get("view") || "").trim().toLowerCase();
    if (viewFlag === "1" || viewFlag === "true" || viewFlag === "yes") return true;
    if (window.RbacPage && window.RbacPage.can("view") && !window.RbacPage.can("edit")) {
      return true;
    }
    return false;
  }

  function applyViewOnlyForm(root) {
    if (!root) return;

    const title = document.querySelector(".page-title");
    if (title) title.textContent = "View Supplier";

    root.querySelectorAll("input, select, textarea").forEach((el) => {
      if (el.type === "hidden") return;
      el.disabled = true;
      if (el.tagName !== "SELECT") el.readOnly = true;
    });

    root.querySelectorAll(
      [
        "button[type='submit']",
        "#deleteSupplierBtn",
        "#uploadBtn",
        ".supplier-file-input",
        "#addCommentBtn",
        "#commentText",
        ".att-btn.delete-btn",
        ".btn-action.btn-delete",
        ".supplier-edit-btn",
      ].join(", ")
    ).forEach((el) => {
      el.disabled = true;
      if (el.type === "submit" || el.id === "deleteSupplierBtn") {
        el.style.display = "none";
      }
    });

    const discard = document.getElementById("discardBtn");
    if (discard) {
      discard.textContent = "Back";
      discard.disabled = false;
      discard.classList.remove("rbac-action-disabled");
      discard.removeAttribute("data-rbac-denied");
    }

    root.querySelectorAll("#uploadCard, .supplier-doc-upload, .upload-card").forEach((el) => {
      el.style.pointerEvents = "none";
      el.style.opacity = "0.75";
    });

    root.classList.add("supplier-view-mode");
  }

  function bind() {
    if (!isSupplierForm()) return;
    const root = document.querySelector(".supplier-page");
    if (!root) return;

    const viewOnly = isViewSupplierMode();
    const isEdit = !!(new URLSearchParams(window.location.search).get("supplier_id") || "").trim();
    const saveAction = isEdit ? "edit" : "create";

    if (!viewOnly) {
      RbacBind.tagHeaders(root, {
        "button[type='submit'].btn-primary": saveAction,
        "#deleteSupplierBtn": "delete",
        "#uploadBtn": "edit",
      });
      if (window.RbacPage) window.RbacPage.applyAll(root);
      return;
    }

    applyViewOnlyForm(root);
    const obs = new MutationObserver(() => applyViewOnlyForm(root));
    obs.observe(root, { childList: true, subtree: true, attributes: true });

    if (window.RbacPage) {
      window.RbacPage.applyAll(root);
      applyViewOnlyForm(root);
    }
  }

  window.RbacRegistry.registerMatcher(isSupplierForm, bind, "supplier-form");
})();
