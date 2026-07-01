// Credit Note form — restrict writes with early toast; blank new requires create to open.
(function () {
  const GUARD = () => window.RbacFormGuard || {};
  const ENTITY = "a credit note";
  const TOAST_KEY = "cnAccessToast";

  const STATIC_TAGS = [
    { sel: "#cnSaveDraftBtn", action: "dynamic" },
    { sel: "#cnMarkPaidBtn", action: "dynamic" },
    { sel: "#cnAddItemBtn", action: "dynamic" },
    { sel: "#cnDeleteBtn", action: "delete" },
    { sel: "#cancelCnOkBtn", action: "delete" },
    { sel: "#cancelCnReason", action: "delete" },
    { sel: "#cnPdfAction", action: "view" },
    { sel: "#cnEmailAction", action: "view" },
    { sel: "#cnSendEmailBtn", action: "view" },
    { sel: "#cnRecipientEmail", action: "view" },
    { sel: "#cnFileInput", action: "dynamic" },
    { sel: "#cnUploadCard", action: "dynamic" },
    { sel: "#cnUploadBtn", action: "dynamic" },
    { sel: "#cnDeleteFileConfirmBtn", action: "edit" },
    { sel: ".btn-action.btn-view", action: "view" },
    { sel: ".btn-action.btn-download", action: "view" },
    { sel: ".btn-action.btn-delete", action: "edit" },
    { sel: ".cn-row-delete-btn", action: "item_delete" },
  ];

  const EDITABLE_INPUT_SELECTORS = [
    "#cnDate",
    "#cnInvoiceRef",
    "#cnCreatedBy",
    "#cnBranch",
    "#cnPaymentTerms",
    "#cnAmountPaid",
    "#cnRefundMode",
    "#cnRefundPaid",
    "#cnRefundDate",
    "#cnRefundDateOpenBtn",
    "#cnItemsBody .cn-return-qty-input",
    "#cnItemsBody .cn-return-reason-select",
  ];

  function isCreditForm() {
    return !!document.querySelector(".cn-page");
  }

  function queryState() {
    const params = new URLSearchParams(window.location.search);
    const urlId = (
      params.get("credit_note_id") ||
      params.get("crn_id") ||
      ""
    ).trim();
    const invoiceReturnRef = (params.get("invoice_return_ref") || "").trim();
    const mode = (
      params.get("mode") ||
      document.getElementById("creditModeValue")?.value ||
      "new"
    )
      .trim()
      .toLowerCase();
    const id =
      urlId ||
      (document.getElementById("creditIdValue")?.value || "").trim();
    const linkedFromInvoiceReturn = !!invoiceReturnRef && !urlId;
    const isNew = mode === "new" && !urlId;
    return {
      id,
      mode,
      isNew,
      linkedFromInvoiceReturn,
      isExplicitView: mode === "view",
    };
  }

  function saveAction(state) {
    if (state.isNew) return "create";
    return "edit";
  }

  function isViewMode(state, rp) {
    if (state.isExplicitView) return true;
    if (state.id && !state.isNew && rp && rp.can("view") && !rp.can("edit")) return true;
    return false;
  }

  function redirectWithoutCreate() {
    const rp = window.RbacPage;
    const msg = "You do not have permission to create a credit note.";
    if (rp && typeof rp.showDeniedToast === "function") rp.showDeniedToast(msg);
    window.location.replace("/credit-note");
  }

  function redirectToView(state) {
    if (!state.id) {
      redirectWithoutCreate();
      return;
    }
    window.location.replace(
      `/new-credit-note?credit_note_id=${encodeURIComponent(state.id)}&mode=view`
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
      el.removeAttribute("data-rbac-module");
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

  function tagDynamicRows(root) {
    const tbody = document.getElementById("cnItemsBody");
    if (!tbody || !window.RbacPage) return;
    window.RbacPage.observeDynamic(tbody, {
      ".cn-row-delete-btn": "item_delete",
    });
  }

  function tagDynamicAttachments(root) {
    const list = document.getElementById("cnFilesList");
    if (!list || !window.RbacPage) return;
    window.RbacPage.observeDynamic(list, {
      ".btn-action.btn-view": "view",
      ".btn-action.btn-download": "view",
      ".btn-action.btn-delete": "edit",
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
    if (!isCreditForm()) return;
    const root = document.querySelector(".cn-page");
    if (!root) return;

    const guard = GUARD();
    const state = queryState();
    guard.showEarlyWriteToast?.(root, TOAST_KEY, guard.readEmbeddedPageCan?.() || {}, {
      isNew: state.isNew,
      isExplicitView: state.isExplicitView,
      label: ENTITY,
    });

    if (window.RbacSession?.ensureLoaded) {
      await window.RbacSession.ensureLoaded();
    }

    const rp = window.RbacPage;

    if (window.RbacPage?.setFormMode) {
      const formMode = state.isExplicitView
        ? "view"
        : state.isNew
          ? "create"
          : state.mode === "edit"
            ? "edit"
            : "view";
      window.RbacPage.setFormMode(formMode);
    }

    if (state.isNew && !state.linkedFromInvoiceReturn && rp && !rp.can("create")) {
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
    root.classList.toggle("cn-rbac-readonly", writeLocked);

    STATIC_TAGS.forEach((spec) => tagSpec(root, spec, state));
    tagEditableFields(root, state, writeLocked);

    if (!writeLocked) {
      tagDynamicRows(root);
    }
    tagDynamicAttachments(root);

    enforceLocks(root);
  }

  window.RbacRegistry.registerMatcher(isCreditForm, bind, "credit-note-form");
})();
