// Delivery note return form — navigate freely; restrict writes on this page with early toast.
(function () {
  const GUARD = () => window.RbacFormGuard || {};
  const ENTITY = "a delivery note return";
  const TOAST_KEY = "dnrAccessToast";

  const STATIC_TAGS = [
    { sel: "#submitBtn", action: "dynamic" },
    { sel: "#saveDraftBtn", action: "dynamic" },
    { sel: "#cancelDnrBtn", action: "delete" },
    { sel: "#cancelDnrModalYes", action: "delete" },
    { sel: "#cancelDnrReason", action: "delete" },
    { sel: "#dnrPdfAction", action: "view" },
    { sel: "#dnrEmailAction", action: "view" },
    { sel: "#dnrAttInput", action: "dynamic" },
    { sel: "#dnrAttChooseBtn", action: "dynamic" },
    { sel: "#dnrAttDrop", action: "dynamic" },
    { sel: "#dnrDeleteFileConfirmBtn", action: "edit" },
    { sel: ".att-btn.view-btn", action: "view" },
    { sel: ".att-btn.download-btn", action: "view" },
    { sel: ".att-btn.delete-btn", action: "edit" },
  ];

  const EDITABLE_INPUT_SELECTORS = [
    "#dnrDate",
    "#invoiceReturnRef",
    "#customerRef",
    "#lineItemsBody input",
    "#lineItemsBody select",
    "#lineItemsBody textarea",
  ];

  function isDnrForm() {
    return !!document.querySelector(".dnr-page") && !!document.getElementById("submitBtn");
  }

  function queryState() {
    const params = new URLSearchParams(window.location.search);
    const mode = (params.get("mode") || "").trim().toLowerCase();
    const id = (params.get("id") || "").trim();
    const dnRef = (params.get("dn_id") || "").trim();
    const invoiceReturnRef = (params.get("invoice_return_ref") || "").trim();
    const linkedFromGenerate = !!(dnRef || invoiceReturnRef) && !id;
    return {
      id,
      mode,
      isNew: !id,
      linkedFromGenerate,
      isExplicitView: mode === "view" || mode.startsWith("view-"),
    };
  }

  function redirectWithoutCreate() {
    const rp = window.RbacPage;
    const msg = "You do not have permission to create a delivery note return.";
    if (rp && typeof rp.showDeniedToast === "function") rp.showDeniedToast(msg);
    window.location.replace("/deliverynote_return");
  }

  function saveAction(state) {
    return state.id ? "edit" : "create";
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
        if (el.readOnly && el.id === "dnrId") return;
        el.setAttribute("data-rbac-action", action);
        el.removeAttribute("data-rbac-module");
      });
    });
  }

  function tagDynamicAttachments(root) {
    const tbody = document.getElementById("dnrAttItems");
    if (!tbody || !window.RbacPage) return;
    window.RbacPage.observeDynamic(tbody, {
      ".att-btn.view-btn": "view",
      ".att-btn.download-btn": "view",
      ".att-btn.delete-btn": "edit",
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
    if (!isDnrForm()) return;
    const root = document.querySelector(".dnr-page");
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

    if (state.isNew && !state.linkedFromGenerate && rp && !rp.can("create")) {
      redirectWithoutCreate();
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
    root.classList.toggle("dnr-rbac-readonly", writeLocked);

    STATIC_TAGS.forEach((spec) => tagSpec(root, spec, state));
    tagEditableFields(root, state, writeLocked);
    tagDynamicAttachments(root);

    if (!writeLocked) {
      const lineBody = document.getElementById("lineItemsBody");
      if (lineBody && window.RbacPage) {
        window.RbacPage.observeDynamic(lineBody, {
          ".dn-delete-btn": "item_delete",
          "button[onclick*='deleteRow']": "item_delete",
        });
      }
    }

    enforceLocks(root);
  }

  window.RbacRegistry.registerMatcher(isDnrForm, bind, "dnr-form");
})();
