// Comment add UI — unrestricted on create/edit forms (general rule); view-only forms may still gate.
(function (global) {
  const ADD_BUTTON_SELECTORS = [
    "#addCommentBtn",
    "#commentAddBtn",
    "#dbnAddCommentBtn",
    "#cnAddCommentBtn",
    "button[id*='AddComment' i]",
    "button.so-ch-addbtn",
  ];

  const ADD_INPUT_SELECTORS = [
    "#commentText",
    "#commentInput",
    "#cnCommentInput",
    "#dbnCommentInput",
    "textarea[id*='comment' i]",
  ];

  const ALL_SELECTORS = ADD_BUTTON_SELECTORS.concat(ADD_INPUT_SELECTORS);

  function isCreateOrEditForm() {
    return global.RbacPage && global.RbacPage.isCommentAddUnrestricted();
  }

  function clearCommentRbac(el) {
    el.removeAttribute("data-rbac-action");
    el.classList.remove("rbac-action-disabled");
    el.removeAttribute("data-rbac-denied");
    el.removeAttribute("data-rbac-message");
  }

  function eachCommentControl(root, fn) {
    if (!root) return;
    ALL_SELECTORS.forEach((sel) => {
      try {
        root.querySelectorAll(sel).forEach(fn);
      } catch (_e) {
        /* invalid selector */
      }
    });
  }

  function tagIn(root, selectors, action) {
    if (!root) return;
    selectors.forEach((sel) => {
      try {
        root.querySelectorAll(sel).forEach((el) => {
          if (!el.hasAttribute("data-rbac-action")) {
            el.setAttribute("data-rbac-action", action);
          }
        });
      } catch (_e) {
        /* invalid selector */
      }
    });
  }

  function bindComments(root) {
    const scope = root || document;
    if (isCreateOrEditForm()) {
      eachCommentControl(scope, (el) => clearCommentRbac(el));
      if (global.RbacPage) global.RbacPage.applyAll(scope);
      return;
    }
    tagIn(scope, ADD_BUTTON_SELECTORS, "comment_add");
    tagIn(scope, ADD_INPUT_SELECTORS, "comment_add");
    if (global.RbacPage) global.RbacPage.applyAll(scope);
  }

  let bindCommentsScheduled = false;

  function scheduleBindComments(root) {
    if (bindCommentsScheduled) return;
    bindCommentsScheduled = true;
    requestAnimationFrame(() => {
      bindCommentsScheduled = false;
      bindComments(root || document);
    });
  }

  function init() {
    bindComments(document);
    const obs = new MutationObserver(() => scheduleBindComments(document));
    obs.observe(document.body, { childList: true, subtree: true });
    const modeObs = new MutationObserver(() => scheduleBindComments(document));
    modeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-rbac-form-mode"],
    });
  }

  global.RbacComments = { bindComments };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
