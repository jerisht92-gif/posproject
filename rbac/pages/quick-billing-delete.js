// Quick billing removed-items page — permanent delete gated by delete permission.
(function () {
  const DELETE_SELECTORS = ["#delDeleteSelected", "#delConfirmOk"];

  function isQuickBillingDelete() {
    return !!document.querySelector(".qb-del-page");
  }

  function removedItemsAccessState() {
    const rp = window.RbacPage;
    if (!rp || rp.isUnrestricted()) {
      return { blocked: false, delete: true };
    }
    return { blocked: !rp.can("delete"), delete: rp.can("delete") };
  }

  function showRemovedItemsAccessWarning() {
    const page = document.querySelector(".qb-del-page");
    const rp = window.RbacPage;
    if (!page || !rp) return;

    const state = removedItemsAccessState();
    if (!state.blocked) {
      page.classList.remove("qb-rbac-page-blocked");
      page.querySelector(".qb-rbac-access-warning")?.remove();
      delete page.dataset.qbAccessWarned;
      return;
    }

    if (page.dataset.qbAccessWarned === "1") return;
    page.dataset.qbAccessWarned = "1";
    page.classList.add("qb-rbac-page-blocked");

    const banner = document.createElement("div");
    banner.className = "qb-rbac-access-warning";
    banner.setAttribute("role", "alert");
    banner.innerHTML =
      "<strong>Removed Items is not available for your account</strong>" +
      "<p>Your Super Admin has restricted Delete access for Quick Billing. " +
      "You cannot manage removed items on this page. Please contact your Super Admin.</p>";
    page.prepend(banner);

    rp.showDeniedToast(
      "Removed Items access is restricted for your account. Contact your Super Admin for access."
    );
  }

  function tagDeleteButtons(root) {
    DELETE_SELECTORS.forEach((sel) => {
      root.querySelectorAll(sel).forEach((el) => {
        el.setAttribute("data-rbac-action", "delete");
      });
    });
    if (window.RbacPage) window.RbacPage.applyAll(root);
  }

  function watchDeleteButtons(root) {
    tagDeleteButtons(root);
    const obs = new MutationObserver(() => tagDeleteButtons(root));
    obs.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["disabled", "class"],
    });
    return obs;
  }

  async function bind() {
    if (!isQuickBillingDelete()) return;
    const root = document.querySelector(".qb-del-page");
    if (!root) return;

    if (window.RbacSession?.ensureLoaded) {
      try {
        await window.RbacSession.ensureLoaded();
      } catch (_err) {
        /* optional */
      }
    }

    showRemovedItemsAccessWarning();
    if (!removedItemsAccessState().blocked) {
      watchDeleteButtons(root);
    }
  }

  window.RbacRegistry.registerMatcher(isQuickBillingDelete, bind, "quick-billing-delete");
})();
