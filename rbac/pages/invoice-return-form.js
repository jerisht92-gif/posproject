// Invoice return form — navigate freely from invoice page; restrict writes with early toast.
(function () {
  const GUARD = () => window.RbacFormGuard || {};
  const ENTITY = "an invoice return";
  const TOAST_KEY = "irAccessToast";
  const IR_GENERATE_NAV_IDS = ["#deliverInvoiceBtn"];

  const STATIC_TAGS = [
    { sel: "#irSubmitBtn", action: "dynamic" },
    { sel: "#irSaveDraftBtn", action: "dynamic" },
    { sel: "#cancelInvoiceBtn", action: "delete" },
    { sel: "#pdfAction", action: "view" },
    { sel: "#emailAction", action: "view" },
    { sel: "#fileInput", action: "dynamic" },
    { sel: "#uploadCard", action: "dynamic" },
    { sel: "#uploadBtn", action: "dynamic" },
    { sel: "#deleteFileConfirmBtn", action: "edit" },
    { sel: "#addCommentBtn", action: "comment_add" },
    { sel: "#commentText", action: "comment_add" },
    { sel: ".btn-action.btn-view", action: "view" },
    { sel: ".btn-action.btn-download", action: "view" },
    { sel: ".btn-action.btn-delete", action: "edit" },
  ];

  const EDITABLE_INPUT_SELECTORS = [
    "#saleOrderSelected",
    "#itemsTableBody input",
    "#itemsTableBody select",
    "#itemsTableBody textarea",
  ];

  function isInvoiceReturnForm() {
    return !!document.getElementById("irSubmitBtn");
  }

  function clearIrNavRbac(el) {
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
    if (businessDisabled) {
      el.setAttribute("data-rbac-preserve-disabled", "1");
    }
  }

  function untagGenerateNavButtons(root) {
    IR_GENERATE_NAV_IDS.forEach((sel) => {
      root.querySelectorAll(sel).forEach(clearIrNavRbac);
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
    const viewId = (params.get("view_id") || "").trim();
    const editId = (params.get("edit_id") || "").trim();
    return {
      id: editId || viewId,
      viewId,
      editId,
      isNew: !editId && !viewId,
      isExplicitView: !!viewId,
    };
  }

  function saveAction(state) {
    return state.editId || state.id ? "edit" : "create";
  }

  function isViewMode(state, rp) {
    if (state.isExplicitView) return true;
    if (state.id && rp && rp.can("view") && !rp.can("edit")) return true;
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

  function tagDynamicAttachments(root) {
    const filesList = document.getElementById("filesList");
    if (!filesList || !window.RbacPage) return;
    window.RbacPage.observeDynamic(filesList, {
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
      ? window.RbacBind.createEnforceGuard((root) => {
          untagGenerateNavButtons(root);
          applyAll(root);
        })
      : function enforceLocks(root) {
          untagGenerateNavButtons(root);
          applyAll(root);
        };

  async function bind() {
    if (!isInvoiceReturnForm()) return;
    const root = document.querySelector(".modal") || document.body;

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
    const restriction = guard.writeRestriction?.(rp, {
      isNew: state.isNew,
      isExplicitView: state.isExplicitView,
      label: ENTITY,
    }) || { restricted: false, message: "" };
    if (restriction.restricted) {
      guard.showToastOnce?.(root, TOAST_KEY, restriction.message);
    }

    const writeLocked = restriction.restricted || isViewMode(state, rp);
    root.classList.toggle("ir-rbac-readonly", writeLocked);

    STATIC_TAGS.forEach((spec) => tagSpec(root, spec, state));
    tagEditableFields(root, state, writeLocked);
    tagDynamicAttachments(root);

    if (!writeLocked) {
      const itemsBody = document.getElementById("itemsTableBody");
      if (itemsBody && window.RbacPage) {
        window.RbacPage.observeDynamic(itemsBody, {
          ".remove-item-btn": "item_delete",
          "button[onclick*='deleteRow']": "item_delete",
        });
      }
    }

    untagGenerateNavButtons(root);
    enforceLocks(root);
    watchGenerateNavButtons(root);
  }

  window.RbacRegistry.registerMatcher(isInvoiceReturnForm, bind, "invoice-return-form");
})();
