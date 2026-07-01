// Stock return list (1st page) — create / view / edit / delete on fly menu.
(function () {
  RbacBind.bindListPage({
    pageClass: "srn-page",
    tableBodyId: "srnTbody",
    headerMap: {
      ".srn-header .srn-btn-primary": "create",
      ".srn-header a.srn-btn-primary": "create",
      "a.srn-btn-primary": "create",
    },
    tableMap: {
      ".srn-act-item": "view",
    },
  });

  const SNR_GENERATE_LABELS = ["debit note", "generate debit note"];

  function isStockReturnListPage() {
    return !!document.getElementById("srnTbody") && !!document.querySelector(".srn-page .srn-header");
  }

  function isSnrGenerateNavItem(btn) {
    const t = (btn.textContent || "").trim().toLowerCase();
    return SNR_GENERATE_LABELS.some((label) => t.includes(label));
  }

  function clearSnrNavRbac(el) {
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

  function tagStockReturnFlyItems() {
    document.querySelectorAll(".srn-act-fly .srn-act-item").forEach((btn) => {
      const t = (btn.textContent || "").trim().toLowerCase();
      if (isSnrGenerateNavItem(btn)) {
        clearSnrNavRbac(btn);
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

  function observeStockReturnFlyMenu() {
    tagStockReturnFlyItems();
    const obs = new MutationObserver(tagStockReturnFlyItems);
    obs.observe(document.body, { childList: true, subtree: true });
  }

  function blockNewStockReturnNavigation() {
    const link = document.querySelector(".srn-page .srn-header a.srn-btn-primary");
    if (!link || link.dataset.rbacNavBound === "1") return;
    link.dataset.rbacNavBound = "1";
    link.addEventListener(
      "click",
      (e) => {
        const rp = window.RbacPage;
        if (!rp || rp.can("create")) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        rp.showDeniedToast("You do not have permission to create a stock return.");
      },
      true
    );
  }

  function bindListExtras() {
    if (!isStockReturnListPage()) return;
    observeStockReturnFlyMenu();
    blockNewStockReturnNavigation();
  }

  if (window.RbacRegistry) {
    window.RbacRegistry.registerMatcher(isStockReturnListPage, bindListExtras, "stock-return-list");
  }
})();
