// Credit Note list — create / view / edit / delete on fly menu.
(function () {
  const FLY_SEL = ".credit-act-fly";
  const ITEM_SEL = ".credit-act-item";
  const ACTION_BTN_SEL = ".credit-action-btn";
  const FORM_PATH = "/new-credit-note";
  const ID_PARAM = "credit_note_id";

  RbacBind.bindListPage({
    pageClass: "credit-page",
    matcher: () =>
      !!document.querySelector(".credit-page") &&
      !!document.getElementById("newCreditBtn") &&
      !document.querySelector(".cn-page"),
    tableBodyId: "creditTbody",
    headerMap: {
      "#newCreditBtn": "create",
      ".credit-btn-primary": "create",
    },
  });

  function isCreditListPage() {
    return !!document.getElementById("creditTbody") && !!document.getElementById("newCreditBtn");
  }

  function stashFlyNoteIds() {
    const hovered = document.querySelector(`${ACTION_BTN_SEL}:hover`);
    const noteId = hovered?.closest("tr")?.cells?.[0]?.textContent?.trim() || "";
    document.querySelectorAll(FLY_SEL).forEach((fly) => {
      fly.querySelectorAll(ITEM_SEL).forEach((btn) => {
        if (noteId) btn.dataset.rbacNoteId = noteId;
      });
    });
  }

  function tagCreditFlyItems() {
    stashFlyNoteIds();
    const rp = window.RbacPage;
    document.querySelectorAll(`${FLY_SEL} ${ITEM_SEL}`).forEach((btn) => {
      const t = (btn.textContent || "").trim().toLowerCase();
      if (t.includes("delete")) {
        btn.setAttribute("data-rbac-action", "delete");
      } else if (t.includes("edit")) {
        if (rp && !rp.can("edit") && rp.can("view")) {
          btn.setAttribute("data-rbac-action", "view");
        } else {
          btn.setAttribute("data-rbac-action", "edit");
        }
      } else if (t.includes("view")) {
        btn.setAttribute("data-rbac-action", "view");
      } else {
        btn.removeAttribute("data-rbac-action");
        btn.classList.remove("rbac-action-disabled");
        btn.removeAttribute("data-rbac-denied");
      }
      btn.removeAttribute("data-rbac-module");
    });
    if (rp) rp.applyAll(document);
  }

  function observeCreditFlyMenu() {
    if (window.RbacBind && typeof window.RbacBind.observeBodyFlyMenu === "function") {
      return window.RbacBind.observeBodyFlyMenu(tagCreditFlyItems);
    }
    tagCreditFlyItems();
    return null;
  }

  function blockNewCreditNavigation() {
    const btn = document.getElementById("newCreditBtn");
    if (!btn || btn.dataset.rbacNavBound === "1") return;
    btn.dataset.rbacNavBound = "1";
    btn.addEventListener(
      "click",
      (e) => {
        const rp = window.RbacPage;
        if (!rp || rp.can("create")) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        rp.showDeniedToast("You do not have permission to create a credit note.");
      },
      true
    );
  }

  function bindFlyViewFallback() {
    if (document.body.dataset.rbacCreditFlyView === "1") return;
    document.body.dataset.rbacCreditFlyView = "1";
    document.addEventListener(
      "click",
      (e) => {
        const btn = e.target.closest(ITEM_SEL);
        if (!btn || !btn.closest(FLY_SEL)) return;
        const t = (btn.textContent || "").trim().toLowerCase();
        if (!t.includes("edit details")) return;
        const rp = window.RbacPage;
        if (!rp || rp.can("edit") || !rp.can("view")) return;
        const id = btn.dataset.rbacNoteId;
        if (!id) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        window.location.href = `${FORM_PATH}?${ID_PARAM}=${encodeURIComponent(id)}&mode=view`;
      },
      true
    );
  }

  function bindListExtras() {
    if (!isCreditListPage()) return;
    observeCreditFlyMenu();
    blockNewCreditNavigation();
    bindFlyViewFallback();
  }

  if (window.RbacRegistry) {
    window.RbacRegistry.registerMatcher(isCreditListPage, bindListExtras, "credit-note-list");
  }
})();
