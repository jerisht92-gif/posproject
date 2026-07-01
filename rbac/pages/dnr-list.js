// Delivery note return list — view / edit on fly menu; new navigates to form (restrictions apply there).
(function () {
  RbacBind.bindListPage({
    pageClass: "dnr-page",
    matcher: () =>
      !!document.querySelector(".dnr-page") &&
      !!document.getElementById("newDnrBtn") &&
      !document.getElementById("submitBtn"),
    tableBodyId: "dnrTbody",
    headerMap: {},
  });

  function isDnrListPage() {
    return !!document.getElementById("dnrTbody") && !!document.getElementById("newDnrBtn");
  }

  function tagDnrFlyItems() {
    document.querySelectorAll(".dnr-act-fly .dnr-act-item").forEach((btn) => {
      const t = (btn.textContent || "").trim().toLowerCase();
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
    if (window.RbacPage) window.RbacPage.applyAll(document);
  }

  function observeDnrFlyMenu() {
    if (window.RbacBind && typeof window.RbacBind.observeBodyFlyMenu === "function") {
      return window.RbacBind.observeBodyFlyMenu(tagDnrFlyItems);
    }
    tagDnrFlyItems();
    return null;
  }

  function bindListExtras() {
    if (!isDnrListPage()) return;
    observeDnrFlyMenu();
  }

  if (window.RbacRegistry) {
    window.RbacRegistry.registerMatcher(isDnrListPage, bindListExtras, "dnr-list");
  }
})();
