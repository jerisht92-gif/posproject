// Purchase order list (1st page) — create / view / edit / delete on row menu.
(function () {
  RbacBind.bindListPage({
    matcher: () => !!document.querySelector(".purchase-wrapper"),
    rootSelector: ".purchase-wrapper",
    tableBodyId: "purchaseTableBody",
    headerMap: { ".header .new-btn": "create", "a.new-btn": "create" },
    tableMap: {
      ".dropdown-item.view": "view",
      ".dropdown-item.edit": "edit",
      ".dropdown-item.delete": "delete",
    },
  });

  const PO_GENERATE_LABELS = ["generate stock receipt", "stock receipt"];

  function isPurchaseListPage() {
    return !!document.getElementById("purchaseTableBody") && !!document.querySelector(".purchase-wrapper .new-btn");
  }

  function isPoGenerateNavItem(btn) {
    const t = (btn.textContent || "").trim().toLowerCase();
    return PO_GENERATE_LABELS.some((label) => t.includes(label));
  }

  function clearPoNavRbac(el) {
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

  function tagPurchaseFlyItems() {
    document.querySelectorAll(".dropdown-menu .dropdown-item").forEach((btn) => {
      const t = (btn.textContent || "").trim().toLowerCase();
      if (isPoGenerateNavItem(btn)) {
        clearPoNavRbac(btn);
        return;
      }
      if (t === "view" || t.includes("view")) {
        btn.setAttribute("data-rbac-action", "view");
        btn.removeAttribute("data-rbac-module");
      } else if (t === "edit" || t.includes("edit")) {
        btn.setAttribute("data-rbac-action", "edit");
        btn.removeAttribute("data-rbac-module");
      } else if (t.includes("delete")) {
        btn.setAttribute("data-rbac-action", "delete");
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

  function observePurchaseFlyMenu() {
    tagPurchaseFlyItems();
    const obs = new MutationObserver(tagPurchaseFlyItems);
    obs.observe(document.body, { childList: true, subtree: true });
  }

  function blockNewPurchaseNavigation() {
    const btn = document.querySelector(".purchase-wrapper .new-btn");
    if (!btn || btn.dataset.rbacNavBound === "1") return;
    btn.dataset.rbacNavBound = "1";
    btn.addEventListener(
      "click",
      (e) => {
        const rp = window.RbacPage;
        if (!rp || rp.can("create")) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        rp.showDeniedToast("You do not have permission to create a purchase order.");
      },
      true
    );
  }

  function bindListExtras() {
    if (!isPurchaseListPage()) return;
    observePurchaseFlyMenu();
    blockNewPurchaseNavigation();
  }

  if (window.RbacRegistry) {
    window.RbacRegistry.registerMatcher(isPurchaseListPage, bindListExtras, "purchase-list");
  }
})();
