// Shared page-binding helpers for static/rbac/pages/*.
(function (global) {
  const DEFAULT_TABLE_MAP = {
    ".edit-btn": "edit",
    ".delete-btn": "delete",
    ".view-btn": "view",
    ".action-btn.edit-btn": "edit",
    ".action-btn.delete-btn": "delete",
    ".action-btn.view-btn": "view",
  };

  function tagHeaders(root, selectors) {
    if (!root || !selectors) return;
    Object.entries(selectors).forEach(([selector, action]) => {
      root.querySelectorAll(selector).forEach((el) => {
        if (!el.hasAttribute("data-rbac-action")) {
          el.setAttribute("data-rbac-action", action);
        }
      });
    });
  }

  function bindListPage(opts) {
    const {
      pageClass,
      excludeClass,
      matcher,
      rootSelector,
      tableBodyId,
      tableBodySelector,
      headerMap,
      tableMap,
    } = opts;

    const map = Object.assign({}, DEFAULT_TABLE_MAP, tableMap || {});

    function isTargetPage() {
      if (typeof matcher === "function") return matcher();
      if (excludeClass && document.querySelector("." + excludeClass)) return false;
      if (pageClass && document.querySelector("." + pageClass)) return true;
      if (rootSelector && document.querySelector(rootSelector)) return true;
      return false;
    }

    function bind() {
      if (!isTargetPage()) return;

      const root =
        (rootSelector && document.querySelector(rootSelector)) ||
        (pageClass && document.querySelector("." + pageClass)) ||
        document;

      tagHeaders(root, headerMap || {});
      if (global.RbacPage) global.RbacPage.applyAll(root);

      const tbody =
        (tableBodyId && document.getElementById(tableBodyId)) ||
        (tableBodySelector && document.querySelector(tableBodySelector));

      if (tbody && global.RbacPage) {
        global.RbacPage.observeDynamic(tbody, map);
      }
    }

    if (typeof matcher === "function" && global.RbacRegistry) {
      global.RbacRegistry.registerMatcher(matcher, bind, pageClass || rootSelector || "page");
    } else if (pageClass && global.RbacRegistry) {
      global.RbacRegistry.register(pageClass, bind);
    }
  }

  function tagFlyMenuItems(menuSelector, itemSelector) {
    document.querySelectorAll(menuSelector).forEach((menu) => {
      menu.querySelectorAll(itemSelector).forEach((btn) => {
        if (btn.hasAttribute("data-rbac-action")) return;
        const t = (btn.textContent || "").trim().toLowerCase();
        if (t.includes("delete")) btn.setAttribute("data-rbac-action", "delete");
        else if (t.includes("edit")) btn.setAttribute("data-rbac-action", "edit");
        else btn.setAttribute("data-rbac-action", "view");
      });
    });
  }

  function observeFlyMenus(menuSelector, itemSelector) {
    const run = () => {
      tagFlyMenuItems(menuSelector, itemSelector);
      if (global.RbacPage) global.RbacPage.applyAll(document);
    };
    return observeBodyFlyMenu(run);
  }

  /**
   * Debounced observer that disconnects while the callback runs.
   * Prefer childList-only options — watching disabled/class causes feedback loops with applyAll.
   */
  function observeDebounced(target, callback, observeOptions) {
    let scheduled = false;
    let running = false;
    const obs = new MutationObserver(() => {
      if (scheduled || running) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        if (running) return;
        running = true;
        obs.disconnect();
        try {
          callback();
        } finally {
          running = false;
          obs.observe(target, observeOptions);
        }
      });
    });
    obs.observe(target, observeOptions);
    return obs;
  }

  /** Keep cross-page generate/nav buttons out of RBAC attribute tagging. */
  function watchGenerateNavUntag(root, untagFn) {
    if (!root || typeof untagFn !== "function") return null;
    untagFn(root);
    return observeDebounced(root, () => untagFn(root), {
      subtree: true,
      childList: true,
    });
  }

  function createEnforceGuard(fn) {
    let active = false;
    return function guarded(root) {
      if (active) return;
      active = true;
      try {
        return fn(root);
      } finally {
        active = false;
      }
    };
  }

  /** Safe fly-menu observer for list pages (childList only, debounced). */
  function observeBodyFlyMenu(callback) {
    if (typeof callback !== "function") return null;
    callback();
    return observeDebounced(document.body, callback, { childList: true, subtree: true });
  }

  global.RbacBind = {
    DEFAULT_TABLE_MAP,
    tagHeaders,
    tagFlyMenuItems,
    observeFlyMenus,
    observeDebounced,
    observeBodyFlyMenu,
    watchGenerateNavUntag,
    createEnforceGuard,
    bindListPage,
  };
})(window);
