/**
 * Stackly — single base URL for browser fetch() calls (matches server API paths).
 * Set window.__STACKLY_APP_BASE_URL__ from Flask (APP_BASE_URL env), e.g.
 *   https://posbilling.pythonanywhere.com
 * No trailing slash. Empty = same-origin (local dev).
 */
(function () {
  function getBase() {
    if (typeof window === "undefined") return "";
    var v = window.__STACKLY_APP_BASE_URL__;
    if (v == null || v === "") return "";
    return String(v).trim().replace(/\/+$/, "");
  }

  function joinPath(base, path) {
    var p = path == null ? "" : String(path);
    if (!p) return base || "";
    if (!p.startsWith("/")) p = "/" + p;
    if (!base) return p;
    return base + p;
  }

  /** Build absolute URL for a path starting with / */
  window.stacklyApiUrl = function (path) {
    return joinPath(getBase(), path);
  };

  window.stacklyGetAppBaseUrl = getBase;

  /** Full URL for in-app navigation when APP_BASE_URL is set */
  window.stacklyNavigate = function (path) {
    window.location.href = joinPath(getBase(), path);
  };

  var base = getBase();
  if (!base) return;

  var origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    try {
      if (typeof input === "string") {
        if (input.startsWith("/")) {
          input = joinPath(base, input);
        }
      } else if (typeof Request !== "undefined" && input instanceof Request) {
        var u = input.url;
        if (typeof u === "string" && u.startsWith("/")) {
          input = new Request(joinPath(base, u), input);
        }
      }
    } catch (e) {
      console.warn("stackly-api-base fetch patch:", e);
    }
    return origFetch(input, init);
  };
})();
