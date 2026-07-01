// Stock return form — navigate freely from Stock Receipt; restrict writes with early toast.
(function () {
  const GUARD = () => window.RbacFormGuard || {};
  const ENTITY = "a stock return";
  const TOAST_KEY = "snrAccessToast";

  const STATIC_TAGS = [
    { sel: "#submitBtn", action: "dynamic" },
    { sel: "#saveDraftBtn", action: "dynamic" },
    { sel: ".btn-save", action: "dynamic" },
    { sel: ".btn-draft", action: "dynamic" },
    { sel: "#pdfBtn", action: "view" },
    { sel: "#emailBtn", action: "view" },
    { sel: "#cancelOrderBtn", action: "delete" },
    { sel: "#uploadBtn", action: "dynamic" },
    { sel: "#fileInput", action: "dynamic" },
    { sel: "#confirmDeleteBtn", action: "edit" },
  ];

  const ROW_TAGS = {
    ".li-delete": "item_delete",
    ".view-file-btn": "view",
    ".delete-file-btn": "edit",
    ".delete-temp-file-btn": "edit",
  };

  const EDITABLE_INPUT_SELECTORS = [
    "#grnInput",
    "input[name='return_date']",
    "input[name='return_by']",
    "select.status-select",
    "#globalDiscount",
    "#lineItemsBody input.qty",
    "#lineItemsBody input.return-reason",
    "#lineItemsBody input.price",
    "#lineItemsBody input.tax",
    "#lineItemsBody input.discount",
  ];

  function isStockReturnForm() {
    return !!document.querySelector(".snr-page") && !!document.getElementById("submitBtn");
  }

  function queryState() {
    const params = new URLSearchParams(window.location.search);
    const mode = (params.get("mode") || "new").trim().toLowerCase();
    const grn = (params.get("grn") || "").trim();
    const srn =
      (params.get("srn") || "").trim() ||
      (document.querySelector("input[name='srn_no']")?.value || "").trim();
    const linkedFromGrn = !!grn && !srn;
    const isNew = !srn;
    return {
      srn,
      grn,
      mode: isNew ? "create" : mode,
      isNew,
      linkedFromGrn,
      isExplicitView: mode === "view",
    };
  }

  function saveAction(state) {
    return state.isNew ? "create" : "edit";
  }

  function isViewMode(state, rp) {
    if (state.isExplicitView) return true;
    if (state.srn && rp && rp.can("view") && !rp.can("edit")) return true;
    return false;
  }

  function redirectWithoutCreate() {
    const rp = window.RbacPage;
    const msg = "You do not have permission to create a stock return.";
    if (rp && typeof rp.showDeniedToast === "function") rp.showDeniedToast(msg);
    window.location.replace("/stock-return");
  }

  function redirectToView(state) {
    if (!state.srn) {
      redirectWithoutCreate();
      return;
    }
    window.location.replace(
      `/stock-new-return?srn=${encodeURIComponent(state.srn)}&mode=view`
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
      ? window.RbacBind.createEnforceGuard((root) => applyAll(root))
      : function enforceLocks(root) {
          applyAll(root);
        };

  async function bind() {
    if (!isStockReturnForm()) return;
    const root = document.querySelector(".snr-page");
    if (!root) return;

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

    if (state.isNew && !state.linkedFromGrn && rp && !rp.can("create")) {
      redirectWithoutCreate();
      return;
    }

    if (state.srn && state.mode === "edit" && rp && !rp.can("edit") && rp.can("view")) {
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
    root.classList.toggle("snr-rbac-readonly", writeLocked);

    STATIC_TAGS.forEach((spec) => tagSpec(root, spec, state));
    tagEditableFields(root, state, writeLocked);

    if (!writeLocked) {
      const lineItemsBody = document.getElementById("lineItemsBody");
      const filesList = document.getElementById("filesList");
      if (window.RbacPage) {
        if (lineItemsBody) window.RbacPage.observeDynamic(lineItemsBody, ROW_TAGS);
        if (filesList) window.RbacPage.observeDynamic(filesList, ROW_TAGS);
      }
    }

    enforceLocks(root);
  }

  window.RbacRegistry.registerMatcher(isStockReturnForm, bind, "stock-return-form");
})();
