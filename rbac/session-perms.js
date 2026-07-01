// Session permission matrix from /api/session/permissions (cross-module button checks).
// Always fetches fresh from the server — no long-lived in-memory or HTTP cache.
(function (global) {
  let perms = null;
  let loadPromise = null;

  function permissionFetchUrl() {
    return `/api/session/permissions?_=${Date.now()}`;
  }

  function isUnrestricted() {
    if (!perms || typeof perms !== "object") return false;
    return (
      perms.unrestricted === true ||
      (perms.is_super_admin === true && perms.has_custom_permissions !== true)
    );
  }

  function modAllows(mod, action) {
    const m = (mod && perms[mod]) || {};
    if (m.full_access) return true;
    if (action !== "view" && !m.view) return false;
    if (action === "comment_add") return !!(m.create || m.edit);
    return !!m[action];
  }

  function canModule(moduleKey, action) {
    const act = String(action || "view").trim().toLowerCase();
    const mod = String(moduleKey || "").trim();
    if (!mod) return false;
    if (isUnrestricted()) return true;
    if (global.RbacPage && typeof global.RbacPage.isUnrestricted === "function" && global.RbacPage.isUnrestricted()) {
      return true;
    }
    return modAllows(mod, act);
  }

  function fetchFresh() {
    if (loadPromise) return loadPromise;
    loadPromise = fetch(permissionFetchUrl(), {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then((r) => r.json())
      .then((data) => {
        perms = (data && data.permissions) || {};
        return perms;
      })
      .catch(() => {
        perms = {};
        return perms;
      })
      .finally(() => {
        loadPromise = null;
      });
    return loadPromise;
  }

  function ensureLoaded() {
    return fetchFresh();
  }

  function reload() {
    perms = null;
    loadPromise = null;
    return fetchFresh();
  }

  global.RbacSession = {
    get perms() {
      return perms;
    },
    ensureLoaded,
    reload,
    canModule,
    isUnrestricted,
  };
})(window);
