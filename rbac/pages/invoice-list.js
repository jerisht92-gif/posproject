// Invoice list — create / view / edit on fly menu; invoice return uses invoice_return module.
(function () {
  RbacBind.bindListPage({
    pageClass: "delivery-note-page",
    matcher: () =>
      !!document.getElementById("invoiceTableBody") &&
      !!document.getElementById("newInvoicePage") &&
      !document.getElementById("submitInvoiceBtn"),
    rootSelector: "#deliveryNotePage",
    tableBodyId: "invoiceTableBody",
    headerMap: {
      "#newInvoicePage": "create",
      ".dn-btn-primary": "create",
    },
  });

  const INV_GENERATE_LABELS = ["generate invoice return", "invoice return"];

  function isInvoiceListPage() {
    return (
      !!document.getElementById("invoiceTableBody") &&
      !!document.getElementById("newInvoicePage")
    );
  }

  function isInvGenerateNavItem(btn) {
    const t = (btn.textContent || "").trim().toLowerCase();
    return INV_GENERATE_LABELS.some((label) => t.includes(label));
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
  }

  function tagInvoiceFlyItems() {
    document.querySelectorAll(".dn-act-fly .dn-act-item").forEach((btn) => {
      const t = (btn.textContent || "").trim().toLowerCase();
      if (isInvGenerateNavItem(btn)) {
        clearInvNavRbac(btn);
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
    if (window.RbacPage) window.RbacPage.applyAll(document);
  }

  function observeInvoiceFlyMenu() {
    if (window.RbacBind && typeof window.RbacBind.observeBodyFlyMenu === "function") {
      return window.RbacBind.observeBodyFlyMenu(tagInvoiceFlyItems);
    }
    tagInvoiceFlyItems();
    return null;
  }

  function blockNewInvoiceNavigation() {
    const btn = document.getElementById("newInvoicePage");
    if (!btn || btn.dataset.rbacNavBound === "1") return;
    btn.dataset.rbacNavBound = "1";
    btn.addEventListener(
      "click",
      (e) => {
        const rp = window.RbacPage;
        if (!rp || rp.can("create")) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        rp.showDeniedToast("You do not have permission to create an invoice.");
      },
      true
    );
  }

  function bindListExtras() {
    if (!isInvoiceListPage()) return;
    observeInvoiceFlyMenu();
    blockNewInvoiceNavigation();
  }

  if (window.RbacRegistry) {
    window.RbacRegistry.registerMatcher(isInvoiceListPage, bindListExtras, "invoice-list");
  }
})();
