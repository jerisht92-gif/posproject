// Debit Note form — navigate freely from Stock Return; restrict writes with early toast.
(function () {
  const GUARD = () => window.RbacFormGuard || {};
  const ENTITY = "a debit note";
  const TOAST_KEY = "dbnAccessToast";

  const STATIC_TAGS = [
    { sel: "#dbnSaveDraftBtn", action: "dynamic" },
    { sel: "#dbnMarkPaidBtn", action: "dynamic" },
    { sel: "#dbnAddLineBtn", action: "dynamic" },
    { sel: "#dbnDeleteBtn", action: "delete" },
    { sel: "#cancelDbnOkBtn", action: "delete" },
    { sel: "#cancelDbnReason", action: "delete" },
    { sel: "#dbnPdfAction", action: "view" },
    { sel: "#dbnEmailAction", action: "view" },
    { sel: "#dbnFileInput", action: "dynamic" },
    { sel: "#dbnUploadCard", action: "dynamic" },
    { sel: "#dbnUploadBtn", action: "dynamic" },
    { sel: "#dbnDeleteFileConfirmBtn", action: "edit" },
    { sel: ".dbn-btn-action.dbn-btn-view", action: "view" },
    { sel: ".dbn-btn-action.dbn-btn-download", action: "view" },
    { sel: ".dbn-btn-action.dbn-btn-delete", action: "edit" },
    { sel: ".dbn-row-delete-btn", action: "item_delete" },
  ];

  const EDITABLE_INPUT_SELECTORS = [
    "#dbnDate",
    "#dbnPo",
    "#dbnCreatedBy",
    "#dbnBranch",
    "#dbnCreditLimit",
    "#dbnAmountPaidVendor",
    "#dbnRefundMode",
    "#dbnRefundDate",
    "#dbnAdjustedRef",
    "#dbnItemsBody input",
    "#dbnItemsBody select",
    "#dbnItemsBody textarea",
  ];

  function isDebitForm() {
    return !!document.querySelector(".dbn-page");
  }

  function queryState() {
    const params = new URLSearchParams(window.location.search);
    const urlId = (
      params.get("debit_note_id") ||
      params.get("dbn_id") ||
      ""
    ).trim();
    const srnRef = (params.get("srn") || "").trim();
    const mode = (
      params.get("mode") ||
      document.getElementById("dbnModeValue")?.value ||
      "new"
    )
      .trim()
      .toLowerCase();
    const id =
      urlId ||
      (document.getElementById("debitIdValue")?.value || "").trim() ||
      (document.getElementById("dbnId")?.value || "").trim();
    const linkedFromSrn = !!srnRef && !urlId;
    const isNew = mode === "new" && !urlId;
    return {
      id,
      mode,
      isNew,
      linkedFromSrn,
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
    const msg = "You do not have permission to create a debit note.";
    if (rp && typeof rp.showDeniedToast === "function") rp.showDeniedToast(msg);
    window.location.replace("/debit-note");
  }

  function redirectToView(state) {
    if (!state.id) {
      redirectWithoutCreate();
      return;
    }
    window.location.replace(
      `/new-debit-note?debit_note_id=${encodeURIComponent(state.id)}&mode=view`
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
        if (el.readOnly && el.id === "dbnId") return;
        el.setAttribute("data-rbac-action", action);
        el.removeAttribute("data-rbac-module");
      });
    });
  }

  function tagDynamicRows(root) {
    const tbody = document.getElementById("dbnItemsBody");
    if (!tbody || !window.RbacPage) return;
    window.RbacPage.observeDynamic(tbody, {
      ".dbn-row-delete-btn": "item_delete",
    });
  }

  function tagDynamicAttachments(root) {
    const list = document.getElementById("dbnFilesList");
    if (!list || !window.RbacPage) return;
    window.RbacPage.observeDynamic(list, {
      ".dbn-btn-action.dbn-btn-view": "view",
      ".dbn-btn-action.dbn-btn-download": "view",
      ".dbn-btn-action.dbn-btn-delete": "edit",
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
    if (!isDebitForm()) return;
    const root = document.querySelector(".dbn-page");
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

    if (state.isNew && !state.linkedFromSrn && rp && !rp.can("create")) {
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
    root.classList.toggle("dbn-rbac-readonly", writeLocked);

    STATIC_TAGS.forEach((spec) => tagSpec(root, spec, state));
    tagEditableFields(root, state, writeLocked);

    if (!writeLocked) {
      tagDynamicRows(root);
      tagDynamicAttachments(root);
    } else {
      tagDynamicAttachments(root);
    }

    enforceLocks(root);
  }

  window.RbacRegistry.registerMatcher(isDebitForm, bind, "debit-note-form");
})();
