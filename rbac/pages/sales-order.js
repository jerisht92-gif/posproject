// Sales Order list — create / view / edit on fly menu + block new page without create.
(function () {
  RbacBind.bindListPage({
    pageClass: "sales-order-page",
    tableBodyId: "salesOrderTbody",
    headerMap: {
      "#newSalesOrderBtn": "create",
      ".header-actions .btn-primary": "create",
    },
  });

  const SO_GENERATE_NAV_IDS = ["#genPOBtn", "#genDNBtn", "#genINVBtn"];
  const SO_GENERATE_LABELS = [
    "generate purchase order",
    "generate delivery note",
    "generate invoice",
  ];

  function isSoGenerateNavItem(btn) {
    const t = (btn.textContent || "").trim().toLowerCase();
    return SO_GENERATE_LABELS.some((label) => t.includes(label));
  }

  function clearSoNavRbac(el) {
    if (!el) return;
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
  }

  function tagSalesOrderFlyItems() {
    document.querySelectorAll(".so-act-fly .so-act-item").forEach((btn) => {
      const t = (btn.textContent || "").trim().toLowerCase();
      if (isSoGenerateNavItem(btn)) {
        clearSoNavRbac(btn);
        return;
      }
      if (t.includes("view details")) {
        btn.setAttribute("data-rbac-action", "view");
      } else if (t.includes("edit details")) {
        btn.setAttribute("data-rbac-action", "edit");
      } else {
        btn.removeAttribute("data-rbac-action");
        btn.classList.remove("rbac-action-disabled");
        btn.removeAttribute("data-rbac-denied");
      }
    });

    SO_GENERATE_NAV_IDS.forEach((sel) => {
      document.querySelectorAll(sel).forEach(clearSoNavRbac);
    });

    if (window.RbacPage) window.RbacPage.applyAll(document);
  }

  function observeSalesOrderFlyMenu() {
    tagSalesOrderFlyItems();
    const obs = new MutationObserver(tagSalesOrderFlyItems);
    obs.observe(document.body, { childList: true, subtree: true });
  }

  function blockNewSalesOrderNavigation() {
    const btn = document.getElementById("newSalesOrderBtn");
    if (!btn || btn.dataset.rbacNavBound === "1") return;
    btn.dataset.rbacNavBound = "1";
    btn.addEventListener(
      "click",
      (e) => {
        const rp = window.RbacPage;
        if (!rp || rp.can("create")) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        rp.showDeniedToast("You do not have permission to create a sales order.");
      },
      true
    );
  }

  function isSalesOrderListPage() {
    return !!document.getElementById("salesOrderTbody") && !!document.getElementById("newSalesOrderBtn");
  }

  function bindListExtras() {
    if (!isSalesOrderListPage()) return;
    observeSalesOrderFlyMenu();
    blockNewSalesOrderNavigation();
  }

  if (window.RbacRegistry) {
    window.RbacRegistry.registerMatcher(isSalesOrderListPage, bindListExtras, "sales-order-list");
  }
})();
