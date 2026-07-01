// Delivery Note list — create / view / edit on fly menu (draft & in-transit = edit).
(function () {
  RbacBind.bindListPage({
    pageClass: "delivery-note-page",
    matcher: () =>
      !!document.querySelector(".delivery-note-page") &&
      !document.getElementById("invoiceTableBody") &&
      !/invoice return/i.test((document.querySelector(".dn-heading")?.textContent || "")),
    tableBodyId: "dnTbody",
    headerMap: {
      "#newDeliveryNoteBtn": "create",
      ".dn-btn-primary": "create",
    },
  });

  const DN_GENERATE_NAV_IDS = ["#genDeliveryReturnBtn", "#genInvoiceBtn"];
  const DN_GENERATE_LABELS = ["generate delivery return", "generate invoice"];

  function isDnGenerateNavItem(btn) {
    const t = (btn.textContent || "").trim().toLowerCase();
    return DN_GENERATE_LABELS.some((label) => t.includes(label));
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
  }

  function isDeliveryNoteListPage() {
    return !!document.getElementById("dnTbody") && !!document.getElementById("newDeliveryNoteBtn");
  }

  function tagDeliveryNoteFlyItems() {
    document.querySelectorAll(".dn-act-fly .dn-act-item").forEach((btn) => {
      const t = (btn.textContent || "").trim().toLowerCase();
      if (isDnGenerateNavItem(btn)) {
        clearDnNavRbac(btn);
        return;
      }
      if (t.includes("view details")) {
        btn.setAttribute("data-rbac-action", "view");
        btn.removeAttribute("data-rbac-module");
      } else if (t.includes("edit details")) {
        btn.setAttribute("data-rbac-action", "edit");
        btn.removeAttribute("data-rbac-module");
      } else {
        btn.removeAttribute("data-rbac-action");
        btn.removeAttribute("data-rbac-module");
        btn.classList.remove("rbac-action-disabled");
        btn.removeAttribute("data-rbac-denied");
      }
    });

    DN_GENERATE_NAV_IDS.forEach((sel) => {
      document.querySelectorAll(sel).forEach(clearDnNavRbac);
    });

    if (window.RbacPage) window.RbacPage.applyAll(document);
  }

  function observeDeliveryNoteFlyMenu() {
    if (window.RbacBind && typeof window.RbacBind.observeBodyFlyMenu === "function") {
      return window.RbacBind.observeBodyFlyMenu(tagDeliveryNoteFlyItems);
    }
    tagDeliveryNoteFlyItems();
    return null;
  }

  function blockNewDeliveryNoteNavigation() {
    const btn = document.getElementById("newDeliveryNoteBtn");
    if (!btn || btn.dataset.rbacNavBound === "1") return;
    btn.dataset.rbacNavBound = "1";
    btn.addEventListener(
      "click",
      (e) => {
        const rp = window.RbacPage;
        if (!rp || rp.can("create")) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        rp.showDeniedToast("You do not have permission to create a delivery note.");
      },
      true
    );
  }

  function bindListExtras() {
    if (!isDeliveryNoteListPage()) return;
    observeDeliveryNoteFlyMenu();
    blockNewDeliveryNoteNavigation();
  }

  if (window.RbacRegistry) {
    window.RbacRegistry.registerMatcher(isDeliveryNoteListPage, bindListExtras, "delivery-note-list");
  }
})();
