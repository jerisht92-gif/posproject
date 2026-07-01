// Debit Note list — create / view / edit / delete on fly menu.
(function () {
  const FLY_SEL = ".debit-act-fly";
  const ITEM_SEL = ".debit-act-item";
  const ACTION_BTN_SEL = ".debit-action-btn";
  const FORM_PATH = "/new-debit-note";
  const ID_PARAM = "debit_note_id";

  RbacBind.bindListPage({
    pageClass: "debit-page",
    matcher: () =>
      !!document.querySelector(".debit-page") &&
      !!document.getElementById("newDebitBtn") &&
      !document.querySelector(".dbn-page"),
    tableBodyId: "debitTbody",
    headerMap: {
      "#newDebitBtn": "create",
      ".debit-btn-primary": "create",
    },
  });

  function isDebitListPage() {
    return !!document.getElementById("debitTbody") && !!document.getElementById("newDebitBtn");
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

  function tagDebitFlyItems() {
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

  function observeDebitFlyMenu() {
    if (window.RbacBind && typeof window.RbacBind.observeBodyFlyMenu === "function") {
      return window.RbacBind.observeBodyFlyMenu(tagDebitFlyItems);
    }
    tagDebitFlyItems();
    return null;
  }

  function blockNewDebitNavigation() {
    const btn = document.getElementById("newDebitBtn");
    if (!btn || btn.dataset.rbacNavBound === "1") return;
    btn.dataset.rbacNavBound = "1";
    btn.addEventListener(
      "click",
      (e) => {
        const rp = window.RbacPage;
        if (!rp || rp.can("create")) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        rp.showDeniedToast("You do not have permission to create a debit note.");
      },
      true
    );
  }

  function bindFlyViewFallback() {
    if (document.body.dataset.rbacDebitFlyView === "1") return;
    document.body.dataset.rbacDebitFlyView = "1";
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
    if (!isDebitListPage()) return;
    observeDebitFlyMenu();
    blockNewDebitNavigation();
    bindFlyViewFallback();
  }

  if (window.RbacRegistry) {
    window.RbacRegistry.registerMatcher(isDebitListPage, bindListExtras, "debit-note-list");
  }
})();
