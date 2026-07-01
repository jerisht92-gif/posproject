// Sales order form (2nd page) — all buttons/inputs gated by permission matrix (sales_order + related modules).
(function () {
  const SO_GENERATE_NAV_IDS = ["#genDNBtn", "#genInvBtn", "#generatePOBtn"];

  const STATIC_TAGS = [
    { sel: "#submitBtn", action: "dynamic" },
    { sel: 'button[onclick="saveDraft()"]', action: "dynamic" },
    { sel: ".so-add-item-btn", action: "dynamic" },
    { sel: "#pdfBtn", action: "view" },
    { sel: "#emailBtn", action: "view" },
    { sel: ".btn.cancel-order", action: "delete" },
    { sel: "#cancelSoYes", action: "delete" },
  ];

  const ROW_TAGS = {
    ".so-delete-btn": "item_delete",
  };

  const EDITABLE_INPUT_SELECTORS = [
    "#orderDate",
    "#orderType",
    "#paymentMethod",
    "#dueDate",
    "#terms",
    "#shippingMethod",
    "#deliveryDate",
    "#trackingNumber",
    "#internalNotes",
    "#customerNotes",
    "#billingAddress",
    "#shippingAddress",
    "#email",
    "#phone",
    "#globalDiscount",
    "#shipping",
    "#orderItemsBody input",
    "#orderItemsBody select",
    "#salesRepSearch",
    "#customerSearch",
  ];

  function isSalesOrderForm() {
    return !!document.querySelector(".sales-wrapper") && !!document.getElementById("submitBtn");
  }

  function clearSoNavRbac(el) {
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
    SO_GENERATE_NAV_IDS.forEach((sel) => {
      root.querySelectorAll(sel).forEach(clearSoNavRbac);
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
      soId: (params.get("so_id") || "").trim(),
      mode: (params.get("mode") || "").trim().toLowerCase(),
    };
  }

  function saveAction(state) {
    return state.soId ? "edit" : "create";
  }

  function isViewMode(state) {
    if (state.mode === "view") return true;
    const rp = window.RbacPage;
    if (state.soId && rp && rp.can("view") && !rp.can("edit")) return true;
    return false;
  }

  function redirectWithoutCreate() {
    const rp = window.RbacPage;
    const msg = "You do not have permission to create a sales order.";
    if (rp && typeof rp.showDeniedToast === "function") rp.showDeniedToast(msg);
    window.location.replace("/sales-order");
  }

  function redirectToView(state) {
    window.location.replace(
      `/sales-order/new?so_id=${encodeURIComponent(state.soId)}&mode=view`
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

  function tagEditableFields(root, state) {
    const action = saveAction(state);
    EDITABLE_INPUT_SELECTORS.forEach((sel) => {
      root.querySelectorAll(sel).forEach((el) => {
        if (el.readOnly && el.id === "salesOrderId") return;
        el.setAttribute("data-rbac-action", action);
        el.removeAttribute("data-rbac-module");
      });
    });
    root.querySelectorAll("#salesRepSelected, #customerSelected").forEach((el) => {
      el.setAttribute("data-rbac-action", action);
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
    if (!isSalesOrderForm()) return;
    const root = document.querySelector(".sales-wrapper");
    if (!root) return;

    if (window.RbacSession && window.RbacSession.ensureLoaded) {
      await window.RbacSession.ensureLoaded();
    }

    const state = queryState();
    const rp = window.RbacPage;

    if (!state.soId && rp && !rp.can("create")) {
      redirectWithoutCreate();
      return;
    }

    if (state.soId && state.mode === "edit" && rp && !rp.can("edit") && rp.can("view")) {
      redirectToView(state);
      return;
    }

    if (isViewMode(state)) {
      untagGenerateNavButtons(root);
      applyAll(root);
      watchGenerateNavButtons(root);
      return;
    }

    STATIC_TAGS.forEach((spec) => tagSpec(root, spec, state));
    tagEditableFields(root, state);

    if (window.RbacBind && window.RbacPage) {
      const tbody = document.getElementById("orderItemsBody");
      if (tbody) {
        window.RbacPage.observeDynamic(tbody, ROW_TAGS);
      }
    } else {
      root.querySelectorAll(".so-delete-btn").forEach((el) => {
        el.setAttribute("data-rbac-action", "item_delete");
      });
    }

    untagGenerateNavButtons(root);
    enforceLocks(root);
    watchGenerateNavButtons(root);
  }

  window.RbacRegistry.registerMatcher(isSalesOrderForm, bind, "sales-order-form");
})();
