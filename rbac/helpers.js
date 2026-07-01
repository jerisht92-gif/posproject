// RBAC helpers for page bindings and dynamic table rows.
(function (global) {
  function page() {
    return global.RbacPage || null;
  }

  function can(action) {
    const rp = page();
    return rp ? rp.can(action) : false;
  }

  function button(action, className, label, attrs) {
    const extra = attrs ? " " + attrs : "";
    return (
      '<button class="' +
      className +
      '" data-rbac-action="' +
      action +
      '"' +
      extra +
      ">" +
      label +
      "</button>"
    );
  }

  function applyAll(root) {
    const rp = page();
    if (rp && typeof rp.applyAll === "function") {
      rp.applyAll(root);
    }
  }

  function tagAndApply(root, mapping) {
    const rp = page();
    if (rp && typeof rp.tagButtons === "function") {
      rp.tagButtons(root, mapping);
    }
  }

  function observeTable(tbody, mapping) {
    const rp = page();
    if (rp && typeof rp.observeDynamic === "function") {
      return rp.observeDynamic(tbody, mapping);
    }
    return null;
  }

  function readDataset(containerSelector) {
    const el = document.querySelector(containerSelector);
    if (!el) return {};
    return {
      role: (el.dataset.role || "").toLowerCase(),
      canCreate: el.dataset.permCreate === "1" || el.dataset.canCreate === "1",
      canEdit: el.dataset.permEdit === "1" || el.dataset.canEdit === "1",
      canDelete: el.dataset.permDelete === "1" || el.dataset.canDelete === "1",
      canImport: el.dataset.permImport === "1" || el.dataset.canImport === "1",
    };
  }

  function maskIfDenied(value, action) {
    return can(action) ? value : "*************";
  }

  const ACTION_BUTTON_MAP = {
    ".edit-btn": "edit",
    ".delete-btn": "delete",
    ".view-btn": "view",
    "#addProductBtn": "create",
    "#importBtn": "create",
    "#addCustomerBtn": "create",
    "#importCustomerBtn": "create",
    "#addQuotationBtn": "create",
    "#createUserBtn": "create",
    "#createDeptBtn": "create",
    "#confirmDeleteBtn": "delete",
    "#confirmProductDeleteBtn": "delete",
    "#confirmDeptDeleteBtn": "delete",
  };

  global.Rbac = {
    can,
    button,
    applyAll,
    tagAndApply,
    observeTable,
    readDataset,
    maskIfDenied,
    ACTION_BUTTON_MAP,
  };

  function readEmbeddedPageCan() {
    try {
      const el = document.getElementById("rbacPageCanData");
      if (!el) return {};
      return JSON.parse(el.textContent || "{}") || {};
    } catch (_err) {
      return {};
    }
  }

  function showToastOnce(root, datasetKey, message) {
    if (!root || !message || root.dataset[datasetKey] === "1") return;
    root.dataset[datasetKey] = "1";
    const rp = global.RbacPage;
    if (rp && typeof rp.showDeniedToast === "function") {
      rp.showDeniedToast(message);
    }
  }

  function writeRestriction(rp, { isNew, isExplicitView, label }) {
    const name = label || "this record";
    if (!rp || rp.isUnrestricted()) {
      return { restricted: false, message: "" };
    }
    if (isNew) {
      if (!rp.can("create")) {
        return {
          restricted: true,
          message: `You do not have permission to create ${name}. This page is read-only.`,
        };
      }
      return { restricted: false, message: "" };
    }
    if (isExplicitView) {
      return { restricted: false, message: "" };
    }
    if (!rp.can("edit")) {
      return {
        restricted: true,
        message: `You do not have permission to edit this ${name}. This page is read-only.`,
      };
    }
    return { restricted: false, message: "" };
  }

  function showEarlyWriteToast(root, datasetKey, earlyCan, { isNew, isExplicitView, label }) {
    if (!root || earlyCan.unrestricted) return;
    const name = label || "this record";
    if (isNew && earlyCan.create !== true) {
      showToastOnce(
        root,
        datasetKey,
        `You do not have permission to create ${name}. This page is read-only.`
      );
      return;
    }
    if (!isNew && !isExplicitView && earlyCan.edit !== true && earlyCan.view === true) {
      showToastOnce(
        root,
        datasetKey,
        `You do not have permission to edit this ${name}. This page is read-only.`
      );
    }
  }

  global.RbacFormGuard = {
    readEmbeddedPageCan,
    showToastOnce,
    writeRestriction,
    showEarlyWriteToast,
  };
})(window);
