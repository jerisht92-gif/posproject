// Registry for per-page RBAC bindings (static/rbac/pages/*).
(function (global) {
  const pages = {};
  const matchers = [];

  function register(pageKey, bindFn) {
    if (!pageKey || typeof bindFn !== "function") return;
    pages[pageKey] = bindFn;
  }

  function registerMatcher(testFn, bindFn, name) {
    if (typeof testFn !== "function" || typeof bindFn !== "function") return;
    matchers.push({ testFn, bindFn, name: name || "matcher" });
  }

  function run() {
    const ran = [];

    for (const item of matchers) {
      try {
        if (item.testFn()) {
          item.bindFn();
          ran.push(item.name);
        }
      } catch (err) {
        console.warn("[RBAC] matcher failed for", item.name, err);
      }
    }

    for (const [key, bindFn] of Object.entries(pages)) {
      if (
        document.querySelector("." + key) ||
        document.querySelector('[data-rbac-page="' + key + '"]')
      ) {
        try {
          bindFn();
          ran.push(key);
        } catch (err) {
          console.warn("[RBAC] page binding failed for", key, err);
        }
      }
    }

    return ran.length ? ran : null;
  }

  global.RbacRegistry = {
    register,
    registerMatcher,
    run,
    pages,
    matchers,
  };
})(window);
