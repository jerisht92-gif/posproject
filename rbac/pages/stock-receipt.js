// Stock receipt list (1st page) — create / view / edit on fly menu.
(function () {
  RbacBind.bindListPage({
    matcher: () => !!document.querySelector(".stock-receipt-container"),
    rootSelector: ".stock-receipt-container",
    tableBodyId: "tableBody",
    headerMap: {
      ".page-header button": "create",
      ".page-header a button": "create",
      ".page-header a": "create",
    },
    tableMap: {
      ".sr-act-item": "view",
    },
  });

  const SR_GENERATE_LABELS = ["generate stock return", "stock return"];

  function isStockReceiptListPage() {
    return !!document.getElementById("tableBody") && !!document.querySelector(".stock-receipt-container .page-header");
  }

  function isSrGenerateNavItem(btn) {
    const t = (btn.textContent || "").trim().toLowerCase();
    return SR_GENERATE_LABELS.some((label) => t.includes(label));
  }

  function clearSrNavRbac(el) {
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

  function tagStockReceiptFlyItems() {
    document.querySelectorAll(".sr-act-fly .sr-act-item").forEach((btn) => {
      const t = (btn.textContent || "").trim().toLowerCase();
      if (isSrGenerateNavItem(btn)) {
        clearSrNavRbac(btn);
        return;
      }
      if (t === "view" || t.includes("view")) {
        btn.setAttribute("data-rbac-action", "view");
        btn.removeAttribute("data-rbac-module");
      } else if (t === "edit" || t.includes("edit")) {
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

  function observeStockReceiptFlyMenu() {
    tagStockReceiptFlyItems();
    const obs = new MutationObserver(tagStockReceiptFlyItems);
    obs.observe(document.body, { childList: true, subtree: true });
  }

  function blockNewStockReceiptNavigation() {
    const link = document.querySelector(".stock-receipt-container .page-header a");
    const btn = document.querySelector(".stock-receipt-container .page-header button");
    [link, btn].forEach((el) => {
      if (!el || el.dataset.rbacNavBound === "1") return;
      el.dataset.rbacNavBound = "1";
      el.addEventListener(
        "click",
        (e) => {
          const rp = window.RbacPage;
          if (!rp || rp.can("create")) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          rp.showDeniedToast("You do not have permission to create a stock receipt.");
        },
        true
      );
    });
  }

  function bindListExtras() {
    if (!isStockReceiptListPage()) return;
    observeStockReceiptFlyMenu();
    blockNewStockReceiptNavigation();
  }

  if (window.RbacRegistry) {
    window.RbacRegistry.registerMatcher(isStockReceiptListPage, bindListExtras, "stock-receipt-list");
  }
})();
