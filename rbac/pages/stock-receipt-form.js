// Stock receipt form — navigate freely from Purchase Order; restrict writes with early toast.
(function () {
  const GUARD = () => window.RbacFormGuard || {};
  const ENTITY = "a stock receipt";
  const TOAST_KEY = "srAccessToast";
  const SR_GENERATE_NAV_IDS = ["#stockReturnBtn"];

  const STATIC_TAGS = [
    { sel: "#submitBtn", action: "dynamic" },
    { sel: "#saveDraftBtn", action: "dynamic" },
    { sel: "#pdfBtn", action: "view" },
    { sel: "#emailBtn", action: "view" },
    { sel: "#cancelOrderBtn", action: "delete" },
    { sel: "#uploadBtn", action: "dynamic" },
    { sel: "#fileInput", action: "dynamic" },
    { sel: "#confirmDeleteBtn", action: "edit" },
    { sel: "#confirmYes", action: "dynamic" },
  ];

  const ROW_TAGS = {
    ".so-delete-btn": "item_delete",
    ".view-file": "view",
    ".delete-file": "edit",
  };

  const EDITABLE_INPUT_SELECTORS = [
    "#poField",
    "#receivedDate",
    "#supplierDn",
    "#supplierInvoice",
    "#receivedBy",
    "#qcBy",
    "#statusField",
    "#items-body input.qty-received",
    "#items-body input.qty-accepted",
    "#items-body select.warehouse",
    "#items-body select.stock-dim",
  ];

  function isStockReceiptForm() {
    return !!document.querySelector(".stock-container") && !!document.getElementById("submitBtn");
  }

  function clearSrNavRbac(el) {
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
    SR_GENERATE_NAV_IDS.forEach((sel) => {
      root.querySelectorAll(sel).forEach(clearSrNavRbac);
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
    const params = new URLSearchParams(window.location.search);
    const container = document.getElementById("stockDataContainer");
    const dataMode = (container?.dataset.mode || "").trim().toLowerCase();
    const urlMode = (params.get("mode") || dataMode || "create").trim().toLowerCase();
    const urlId = (params.get("id") || "").trim();
    const grnId = (document.getElementById("grnField")?.value || "").trim();
    const linkedFromPo = urlMode === "create" && !!urlId && !grnId;
    const isNew = !grnId && (urlMode === "create" || urlMode === "new");
    return {
      id: grnId || urlId,
      mode: isNew ? "create" : urlMode,
      isNew,
      linkedFromPo,
      isExplicitView: urlMode === "view",
    };
  }

  function saveAction(state) {
    return state.isNew ? "create" : "edit";
  }

  function isViewMode(state, rp) {
    if (state.isExplicitView) return true;
    if (state.id && !state.isNew && rp && rp.can("view") && !rp.can("edit")) return true;
    return false;
  }

  function redirectWithoutCreate() {
    const rp = window.RbacPage;
    const msg = "You do not have permission to create a stock receipt.";
    if (rp && typeof rp.showDeniedToast === "function") rp.showDeniedToast(msg);
    window.location.replace("/stock-receipt");
  }

  function redirectToView(state) {
    if (!state.id) {
      redirectWithoutCreate();
      return;
    }
    window.location.replace(
      `/stock-new?id=${encodeURIComponent(state.id)}&mode=view`
    );
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
    if (!isStockReceiptForm()) return;
    const root = document.querySelector(".stock-container");
    if (!root) return;

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
      const formMode = state.isNew ? "create" : state.mode === "view" ? "view" : "edit";
      window.RbacPage.setFormMode(formMode);
    }

    if (state.isNew && !state.linkedFromPo && rp && !rp.can("create")) {
      redirectWithoutCreate();
      return;
    }

    if (!state.isNew && state.mode === "edit" && rp && !rp.can("edit") && rp.can("view")) {
      redirectToView(state);
      return;
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
    root.classList.toggle("sr-rbac-readonly", writeLocked);

    STATIC_TAGS.forEach((spec) => tagSpec(root, spec, state));
    tagEditableFields(root, state, writeLocked);

    if (!writeLocked) {
      const itemsBody = document.getElementById("items-body");
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

  window.RbacRegistry.registerMatcher(isStockReceiptForm, bind, "stock-receipt-form");
})();
