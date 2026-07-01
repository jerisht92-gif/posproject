// Delivery note form — navigate freely from Sales Order; restrict writes on this page with early toast.
(function () {
  const GUARD = () => window.RbacFormGuard || {};
  const ENTITY = "a delivery note";
  const TOAST_KEY = "rbacAccessToast";
  const DN_GENERATE_NAV_IDS = ["#dn2ReturnBtn"];

  const STATIC_TAGS = [
    { sel: "#submitBtn", action: "dynamic" },
    { sel: "#saveDraftBtn", action: "dynamic" },
    { sel: "#dnAddItemBtn", action: "dynamic" },
    { sel: "#ackSaveBtn", action: "edit" },
    { sel: "#ackPodFile", action: "edit" },
    { sel: "#ackReceivedBy", action: "edit" },
    { sel: "#ackContact", action: "edit" },
    { sel: "#ackRemoveBtn", action: "edit" },
    { sel: "#ackDownloadBtn", action: "view" },
    { sel: "#cancelDnBtn", action: "delete" },
    { sel: "#cancelDnYes", action: "delete" },
    { sel: "#pdfBtn", action: "view" },
    { sel: "#emailBtn", action: "view" },
    { sel: "#dnSerialConfirmBtn", action: "dynamic" },
    { sel: "#dnSerialViewCloseBtn", action: "view" },
  ];

  const ROW_TAGS = {
    ".dn-delete-btn": "item_delete",
  };

  const EDITABLE_INPUT_SELECTORS = [
    "#dnDate",
    "#soRef",
    "#dnType",
    "#deliveryBy",
    "#deliveryStatus",
    "#vehicleNo",
    "#deliveryNotes",
    "#itemsBody input.qtyInput",
    "#itemsBody select.productSelect",
  ];

  function isDeliveryNoteForm() {
    return !!document.querySelector(".dn2-page") && !!document.getElementById("submitBtn");
  }

  function clearDnNavRbac(el) {
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
    DN_GENERATE_NAV_IDS.forEach((sel) => {
      root.querySelectorAll(sel).forEach(clearDnNavRbac);
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
    return {
      id: (params.get("id") || "").trim(),
      mode: (params.get("mode") || "").trim().toLowerCase(),
      isNew: !(params.get("id") || "").trim(),
      isExplicitView: (params.get("mode") || "").trim().toLowerCase() === "view",
    };
  }

  function saveAction(state) {
    return state.id ? "edit" : "create";
  }

  function isViewMode(state, rp) {
    if (state.isExplicitView) return true;
    if (state.id && rp && rp.can("view") && !rp.can("edit")) return true;
    return false;
  }

  function redirectWithoutCreate() {
    const rp = window.RbacPage;
    const msg = "You do not have permission to create a delivery note.";
    if (rp && typeof rp.showDeniedToast === "function") rp.showDeniedToast(msg);
    window.location.replace("/delivery_note");
  }

  function redirectToView(state) {
    window.location.replace(
      `/delivery_note/form?id=${encodeURIComponent(state.id)}&mode=view`
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

  function tagSerialButtons(root) {
    root.querySelectorAll(".dn-serial-btn").forEach((btn) => {
      const label = (btn.textContent || "").trim().toLowerCase();
      if (label === "view") {
        btn.setAttribute("data-rbac-action", "view");
      } else {
        btn.setAttribute("data-rbac-action", "item_delete");
      }
      btn.removeAttribute("data-rbac-module");
    });
  }

  function applyAll(root) {
    tagSerialButtons(root);
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
    if (!isDeliveryNoteForm()) return;
    const root = document.querySelector(".dn2-page");
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

    // Blank new DN (not from SO generate) still requires create to open.
    const fromSalesOrder = !!(new URLSearchParams(window.location.search).get("so_id") || "").trim();
    if (state.isNew && !fromSalesOrder && rp && !rp.can("create")) {
      redirectWithoutCreate();
      return;
    }

    if (state.id && state.mode === "edit" && rp && !rp.can("edit") && rp.can("view")) {
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
    root.classList.toggle("dn-rbac-readonly", writeLocked);

    STATIC_TAGS.forEach((spec) => tagSpec(root, spec, state));
    tagEditableFields(root, state, writeLocked);

    if (!writeLocked) {
      const tbody = document.getElementById("itemsBody");
      if (tbody && window.RbacPage) {
        window.RbacPage.observeDynamic(tbody, ROW_TAGS);
      } else {
        root.querySelectorAll(".dn-delete-btn").forEach((el) => {
          el.setAttribute("data-rbac-action", "item_delete");
        });
      }
    }

    untagGenerateNavButtons(root);
    enforceLocks(root);
    watchGenerateNavButtons(root);
  }

  window.RbacRegistry.registerMatcher(isDeliveryNoteForm, bind, "delivery-note-form");
})();
