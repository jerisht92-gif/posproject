// Quick billing — New Bill gated by create; full-page warning when module is unusable.
(function () {
  RbacBind.bindListPage({
    pageClass: "quick-billing-page",
    tableBodyId: "billingTableBody",
    headerMap: { "#newBillBtn": "create", ".qb-new-btn": "create" },
  });

  function isQuickBillingPage() {
    return !!document.querySelector(".quick-billing-page") && !!document.getElementById("newBillBtn");
  }

  function quickBillingAccessState() {
    const rp = window.RbacPage;
    if (!rp || rp.isUnrestricted()) {
      return { blocked: false, view: true, create: true, edit: true };
    }
    const view = rp.can("view");
    const create = rp.can("create");
    const edit = rp.can("edit");
    // POS billing needs create and/or edit; view-only is not usable.
    const blocked = !create && !edit;
    return { blocked, view, create, edit };
  }

  function deniedActionsLabel(state) {
    const parts = [];
    if (!state.view) parts.push("View");
    if (!state.create) parts.push("Create");
    if (!state.edit) parts.push("Edit");
    return parts.join(", ");
  }

  function showQuickBillingAccessWarning() {
    const page = document.querySelector(".quick-billing-page");
    const rp = window.RbacPage;
    if (!page || !rp) return;

    const state = quickBillingAccessState();
    if (!state.blocked) {
      page.classList.remove("qb-rbac-page-blocked");
      page.querySelector(".qb-rbac-access-warning")?.remove();
      delete page.dataset.qbAccessWarned;
      return;
    }

    if (page.dataset.qbAccessWarned === "1") return;
    page.dataset.qbAccessWarned = "1";
    page.classList.add("qb-rbac-page-blocked");

    const denied = deniedActionsLabel(state);
    const banner = document.createElement("div");
    banner.className = "qb-rbac-access-warning";
    banner.setAttribute("role", "alert");
    banner.innerHTML =
      "<strong>Quick Billing is not available for your account</strong>" +
      "<p>Your Super Admin has restricted " +
      (denied || "Create and Edit") +
      " access for Quick Billing. This page cannot be used until at least Create or Edit permission is granted. Please contact your Super Admin.</p>";
    page.prepend(banner);

    rp.showDeniedToast(
      "Quick Billing is restricted for your account. Contact your Super Admin for access."
    );
  }

  function enforceNewBillRbac() {
    const btn = document.getElementById("newBillBtn");
    const rp = window.RbacPage;
    if (!btn || !rp) return;
    btn.setAttribute("data-rbac-action", "create");
    if (!rp.can("create")) {
      rp.applyElement(btn, "create");
      return;
    }
    btn.classList.remove("rbac-action-disabled");
    btn.removeAttribute("data-rbac-denied");
    btn.removeAttribute("data-rbac-message");
    btn.removeAttribute("aria-disabled");
  }

  function watchNewBillBtn() {
    const btn = document.getElementById("newBillBtn");
    if (!btn) return;
    enforceNewBillRbac();
    const obs = new MutationObserver(() => {
      const rp = window.RbacPage;
      if (rp && !rp.can("create")) enforceNewBillRbac();
    });
    obs.observe(btn, { attributes: true, attributeFilter: ["disabled", "class"] });
  }

  function blockNewBillNavigation() {
    const btn = document.getElementById("newBillBtn");
    if (!btn || btn.dataset.rbacNavBound === "1") return;
    btn.dataset.rbacNavBound = "1";
    btn.addEventListener(
      "click",
      (e) => {
        const rp = window.RbacPage;
        if (!rp || rp.can("create")) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        rp.showDeniedToast("You do not have permission to create a new bill.");
      },
      true
    );
  }

  function blockNewBillShortcut() {
    if (document.body.dataset.qbRbacShortcutBound === "1") return;
    document.body.dataset.qbRbacShortcutBound = "1";
    document.addEventListener(
      "keydown",
      (e) => {
        if (!document.querySelector(".quick-billing-page")) return;
        if (quickBillingAccessState().blocked) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        if (!e.ctrlKey || String(e.key || "").toLowerCase() !== "e") return;
        const rp = window.RbacPage;
        if (!rp || rp.can("create")) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        rp.showDeniedToast("You do not have permission to create a new bill.");
      },
      true
    );
  }

  async function bindListExtras() {
    if (!isQuickBillingPage()) return;
    if (window.RbacSession?.ensureLoaded) {
      try {
        await window.RbacSession.ensureLoaded();
      } catch (_err) {
        /* optional */
      }
    }
    showQuickBillingAccessWarning();
    if (!quickBillingAccessState().blocked) {
      watchNewBillBtn();
      blockNewBillNavigation();
    }
    blockNewBillShortcut();
  }

  if (window.RbacRegistry) {
    window.RbacRegistry.registerMatcher(isQuickBillingPage, bindListExtras, "quick-billing-list");
  }
})();
