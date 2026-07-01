// Purchase order form — navigate freely from Sales Order; restrict writes on this page with early toast.
(function () {
  const GUARD = () => window.RbacFormGuard || {};
  const ENTITY = "a purchase order";
  const TOAST_KEY = "rbacAccessToast";
  const PO_GENERATE_NAV_IDS = ["#stockReceiptBtn"];

  const STATIC_TAGS = [
    { sel: ".btn-save", action: "dynamic" },
    { sel: ".btn-draft", action: "dynamic" },
    { sel: ".so-add-item-btn", action: "dynamic" },
    { sel: ".footer-item.pdf", action: "view" },
    { sel: "#purchaseEmailBtn", action: "view" },
    { sel: ".footer-item.email", action: "view" },
    { sel: ".footer-item.edit", action: "edit" },
    { sel: ".footer-item.delete", action: "delete" },
    { sel: ".footer-item.approve", action: "edit" },
    { sel: ".footer-item.reject", action: "edit" },
    { sel: ".footer-item.sync", action: "edit" },
    { sel: ".cancel-order-btn", action: "delete" },
    { sel: "#uploadBtn", action: "dynamic" },
    { sel: "#fileInput", action: "dynamic" },
    { sel: "#confirmDeleteBtn", action: "edit" },
    { sel: "#deleteFileConfirmBtn", action: "edit" },
    { sel: "#deleteItemConfirmBtn", action: "item_delete" },
    { sel: "#verifyOtpBtn", action: "view" },
    { sel: "#resendOtpBtn", action: "view" },
  ];

  const ROW_TAGS = {
    ".so-delete-btn": "item_delete",
    ".file-btn.view-btn": "view",
    ".file-btn.delete-btn": "edit",
  };

  const EDITABLE_INPUT_SELECTORS = [
    "#ddate",
    "#status_dropdown",
    "#so_id",
    "#supplier_id",
    "#supplier",
    "#supplier_email",
    "#payment_terms",
    "input[name='notes']",
    "#global_discount",
    "#shipping",
    "#orderItemsBody input",
    "#orderItemsBody select",
  ];

  function isPurchaseForm() {
    return !!document.getElementById("poDataContainer");
  }

  function clearPoNavRbac(el) {
    if (!el) return;
    const businessDisabled = el.disabled;
    el.setAttribute("data-rbac-nav", "1");
    el.removeAttribute("data-rbac-action");
    el.removeAttribute("data-rbac-module");
    el.removeAttribute("data-rbac-denied");
    el.removeAttribute("data-rbac-message");
    el.removeAttribute("aria-disabled");
    el.classList.remove("rbac-action-disabled");
    if (window.RbacPage && typeof window.RbacPage.clearRbacDenied === "function") {
      window.RbacPage.clearRbacDenied(el);
    }
    el.disabled = businessDisabled;
  }

  function untagGenerateNavButtons(root) {
    PO_GENERATE_NAV_IDS.forEach((sel) => {
      root.querySelectorAll(sel).forEach(clearPoNavRbac);
    });
  }

  function watchGenerateNavButtons(root) {
    if (window.RbacBind && typeof window.RbacBind.watchGenerateNavUntag === "function") {
      return window.RbacBind.watchGenerateNavUntag(root, () => untagGenerateNavButtons(root));
    }
    untagGenerateNavButtons(root);
    return null;
  }

  function queryState() {
    const container = document.getElementById("poDataContainer");
    const mode = (container?.dataset.mode || "new").trim().toLowerCase();
    const poNumber =
      document.querySelector("input[name='po_number']")?.value?.trim() || "";
    const path = window.location.pathname.toLowerCase();
    let resolvedMode = mode;
    if (path.includes("/purchase/view/")) resolvedMode = "view";
    else if (path.includes("/purchase/edit/")) resolvedMode = "edit";
    else if (path.includes("/purchase-order")) resolvedMode = mode || "new";
    return {
      mode: resolvedMode,
      poNumber,
      isNew: resolvedMode === "new",
      isExplicitView: resolvedMode === "view",
    };
  }

  function saveAction(state) {
    return state.isNew ? "create" : "edit";
  }

  function isViewMode(state, rp) {
    if (state.isExplicitView) return true;
    if (state.poNumber && rp && rp.can("view") && !rp.can("edit") && !state.isNew) {
      return true;
    }
    return false;
  }

  function resolveAction(spec, state) {
    if (spec.action !== "dynamic") return spec.action;
    return saveAction(state);
  }

  function tagSpec(root, spec, state) {
    const action = resolveAction(spec, state);
    root.querySelectorAll(spec.sel).forEach((el) => {
      el.setAttribute("data-rbac-action", action);
      if (spec.module) el.setAttribute("data-rbac-module", spec.module);
      else el.removeAttribute("data-rbac-module");
    });
  }

  function tagEditableFields(root, state, writeLocked) {
    const action = writeLocked ? "view" : saveAction(state);
    EDITABLE_INPUT_SELECTORS.forEach((sel) => {
      root.querySelectorAll(sel).forEach((el) => {
        el.setAttribute("data-rbac-action", action);
        el.removeAttribute("data-rbac-module");
      });
    });
  }

  function applyAll(root) {
    if (window.RbacPage) window.RbacPage.applyAll(root);
  }

  const enforceLocks =
    window.RbacBind && typeof window.RbacBind.createEnforceGuard === "function"
      ? window.RbacBind.createEnforceGuard((root) => {
          untagGenerateNavButtons(root);
          applyAll(root);
        })
      : function enforceLocks(root) {
          untagGenerateNavButtons(root);
          applyAll(root);
        };

  async function bind() {
    if (!isPurchaseForm()) return;
    const root = document.querySelector(".page");
    const container = document.getElementById("poDataContainer");
    if (!root || !container) return;

    untagGenerateNavButtons(root);

    const guard = GUARD();
    const state = queryState();
    guard.showEarlyWriteToast?.(root, TOAST_KEY, guard.readEmbeddedPageCan?.() || {}, {
      isNew: state.isNew,
      isExplicitView: state.isExplicitView,
      label: ENTITY,
    });

    if (window.RbacSession && window.RbacSession.ensureLoaded) {
      await window.RbacSession.ensureLoaded();
    }

    const rp = window.RbacPage;
    if (window.RbacPage && typeof window.RbacPage.setFormMode === "function") {
      window.RbacPage.setFormMode(state.mode === "new" ? "create" : state.mode);
    }

    const restriction = guard.writeRestriction?.(rp, {
      isNew: state.isNew,
      isExplicitView: state.isExplicitView,
      label: ENTITY,
    }) || { restricted: false, message: "" };
    if (restriction.restricted) {
      guard.showToastOnce?.(root, TOAST_KEY, restriction.message);
    }

    const writeLocked = restriction.restricted || isViewMode(state, rp);
    root.classList.toggle("po-rbac-readonly", writeLocked);

    STATIC_TAGS.forEach((spec) => tagSpec(root, spec, state));
    tagEditableFields(root, state, writeLocked);

    if (!writeLocked) {
      const itemsBody = document.getElementById("orderItemsBody");
      const filesList = document.getElementById("filesList");
      if (window.RbacPage) {
        if (itemsBody) window.RbacPage.observeDynamic(itemsBody, ROW_TAGS);
        if (filesList) window.RbacPage.observeDynamic(filesList, ROW_TAGS);
      }
    }

    untagGenerateNavButtons(root);
    enforceLocks(root);
    watchGenerateNavButtons(root);
  }

  window.RbacRegistry.registerMatcher(isPurchaseForm, bind, "purchase-form");
})();
