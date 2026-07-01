// Loads all matching page RBAC bindings after DOM + session permissions are ready.
(function () {
  async function boot() {
    if (window.RbacSession && typeof window.RbacSession.ensureLoaded === "function") {
      try {
        await window.RbacSession.ensureLoaded();
      } catch (_err) {
        /* session perms optional */
      }
    }
    if (window.RbacPage && typeof window.RbacPage.refreshPageCan === "function") {
      window.RbacPage.refreshPageCan();
    }
    if (window.RbacRegistry && typeof window.RbacRegistry.run === "function") {
      window.RbacRegistry.run();
    }
    if (window.RbacPage && typeof window.RbacPage.applyAll === "function") {
      window.RbacPage.applyAll(document);
    }
    if (window.RbacComments && typeof window.RbacComments.bindComments === "function") {
      window.RbacComments.bindComments(document);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
