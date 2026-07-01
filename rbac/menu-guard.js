// Sidebar / menu denied-link toasts (complements menu.js; no business logic moved).
(function () {
  function bindMenu() {
    document.querySelectorAll("[data-rbac-denied='1']").forEach((link) => {
      if (link.dataset.rbacMenuBound === "1") return;
      link.dataset.rbacMenuBound = "1";
      link.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const msg =
          link.getAttribute("data-rbac-message") ||
          "You do not have permission to access this page.";
        if (window.RbacPage && window.RbacPage.showDeniedToast) {
          window.RbacPage.showDeniedToast(msg);
        }
      });
    });
  }

  function boot() {
    bindMenu();
    const sidebar = document.querySelector(".sidebar, .menu-sidebar, nav.menu");
    if (sidebar) {
      new MutationObserver(bindMenu).observe(sidebar, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
