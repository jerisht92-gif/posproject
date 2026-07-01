// Invoice form — navigate freely from Sales Order / Delivery Note; restrict writes with early toast.
(function () {
  const GUARD = () => window.RbacFormGuard || {};
  const ENTITY = "an invoice";
  const TOAST_KEY = "rbacAccessToast";
  const INV_GENERATE_NAV_IDS = ["#invoiceReturnBtn"];

  const STATIC_TAGS = [
    { sel: "#submitInvoiceBtn", action: "dynamic" },
    { sel: "#saveDraftBtn", action: "dynamic" },
    { sel: "#markAsPaid", action: "edit" },
    { sel: "#cancelInvoiceBtn", action: "delete" },
    { sel: "#pdfAction", action: "view" },
    { sel: "#pdfLink", action: "view" },
    { sel: "#emailAction", action: "view" },
    { sel: "#sendEmailBtn", action: "view" },
    { sel: "#recipientEmail", action: "view" },
    { sel: "#fileInput", action: "dynamic" },
    { sel: "#uploadCard", action: "dynamic" },
    { sel: "#uploadBtn", action: "dynamic" },
    { sel: "#deleteFileConfirmBtn", action: "edit" },
    { sel: ".btn-action.btn-view", action: "view" },
    { sel: ".btn-action.btn-download", action: "view" },
    { sel: ".btn-action.btn-delete", action: "edit" },
  ];

  const EDITABLE_INPUT_SELECTORS = [
    "#customerRefNo",
    "#contactPerson",
    "#termsConditions",
    "#paymentMethod",
    "#paymentRefNo",
    "#amountPaid",
    ".tag-checkbox",
    "#tagAllCheckbox",
    "#saleOrderSelected",
  ];

  function isInvoiceForm() {
    return !!document.getElementById("submitInvoiceBtn");
  }

  function clearInvNavRbac(el) {
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
    INV_GENERATE_NAV_IDS.forEach((sel) => {
      root.querySelectorAll(sel).forEach(clearInvNavRbac);
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
    const invoiceId = (params.get("invoice_id") || "").trim();
    return {
      id: invoiceId || viewId,
      viewId,
      invoiceId,
      isView: !!viewId,
      isNew: !invoiceId && !viewId,
      isExplicitView: !!viewId,
    };
  }

  function saveAction(state) {
    return state.invoiceId ? "edit" : "create";
  }

  function isViewMode(state, rp) {
    if (state.isExplicitView) return true;
    if (state.id && rp && rp.can("view") && !rp.can("edit")) return true;
    return false;
  }

  function redirectWithoutCreate() {
    const rp = window.RbacPage;
    const msg = "You do not have permission to create an invoice.";
    if (rp && typeof rp.showDeniedToast === "function") rp.showDeniedToast(msg);
    window.location.replace("/invoice-list");
  }

  function redirectToView(state) {
    window.location.replace(
      `/new-invoice?view_id=${encodeURIComponent(state.id)}`
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
    if (!isInvoiceForm()) return;
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

    const fromLinkedGenerate = (() => {
      const params = new URLSearchParams(window.location.search);
      return !!(params.get("so_id") || params.get("dn_id") || "").trim();
    })();
    if (state.isNew && !fromLinkedGenerate && rp && !rp.can("create")) {
      redirectWithoutCreate();
      return;
    }

    if (state.invoiceId && !state.isView && rp && !rp.can("edit") && rp.can("view")) {
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
    root.classList.toggle("inv-rbac-readonly", writeLocked);

    STATIC_TAGS.forEach((spec) => tagSpec(root, spec, state));
    tagEditableFields(root, state, writeLocked);
    tagDynamicAttachments(root);

    untagGenerateNavButtons(root);
    enforceLocks(root);
    watchGenerateNavButtons(root);
  }

  window.RbacRegistry.registerMatcher(isInvoiceForm, bind, "invoice-form");
})();
