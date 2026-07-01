// Central RBAC core — page permissions from rbacPageCanData + declarative data-rbac-action.
(function (global) {
  function readPageCan() {
    const cfgEl = document.getElementById("rbacPageCanData");
    if (!cfgEl) return {};
    try {
      const parsed = JSON.parse(cfgEl.textContent || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_err) {
      return {};
    }
  }

  let pageCan = readPageCan();

  function refreshPageCan() {
    pageCan = readPageCan();
    return pageCan;
  }

  function isUnrestricted() {
    return (
      pageCan.unrestricted === true ||
      (pageCan.is_super_admin === true && pageCan.has_custom_permissions !== true)
    );
  }

  function inferFormModeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const mode = (params.get("mode") || "").trim().toLowerCase();
    const viewFlag = (params.get("view") || "").trim().toLowerCase();

    if (params.get("view_id") || mode === "view" || mode.startsWith("view-")) return "view";
    if (viewFlag === "1" || viewFlag === "true" || viewFlag === "yes") return "view";

    if (params.get("invoice_id") || params.get("so_id")) {
      return mode === "view" ? "view" : "edit";
    }
    if ((params.get("id") || "").trim()) {
      if (mode === "view" || mode.startsWith("view-")) return "view";
      return "edit";
    }
    const editIdKeys = [
      "supplier_id",
      "user_id",
      "enquiry_id",
      "quotation_id",
      "customer_id",
      "product_id",
      "invoice_id",
      "order_id",
      "edit_id",
      "credit_note_id",
      "crn_id",
      "debit_note_id",
      "dbn_id",
    ];
    for (const key of editIdKeys) {
      if ((params.get(key) || "").trim()) {
        if (mode === "view") return "view";
        return "edit";
      }
    }

    const path = window.location.pathname.toLowerCase();
    if (path.includes("/purchase/view/")) return "view";
    if (path.includes("/purchase/edit/")) return "edit";
    if (path.includes("/purchase-order")) return "create";
    if (path.includes("/new-debit-note")) {
      const mode = (params.get("mode") || "").trim().toLowerCase();
      if (mode === "view") return "view";
      if ((params.get("debit_note_id") || params.get("dbn_id") || "").trim()) {
        return mode === "view" ? "view" : "edit";
      }
      return "create";
    }
    if (path.includes("/new-credit-note")) {
      const mode = (params.get("mode") || "").trim().toLowerCase();
      if (mode === "view") return "view";
      if ((params.get("credit_note_id") || params.get("crn_id") || "").trim()) {
        return mode === "view" ? "view" : "edit";
      }
      return "create";
    }
    if (path.includes("/stock-new-return")) {
      const mode = (params.get("mode") || "").trim().toLowerCase();
      const srn = (params.get("srn") || "").trim();
      if (mode === "view") return "view";
      if (srn) return mode === "edit" ? "edit" : "edit";
      return "create";
    }
    if (path.includes("/stock-new")) {
      const mode = (params.get("mode") || "").trim().toLowerCase();
      const id = (params.get("id") || "").trim();
      if (mode === "view") return "view";
      if (id) return mode === "edit" ? "edit" : mode === "view" ? "view" : "edit";
      return "create";
    }
    if (
      /\/(new|create|add-new|addnew|supplier-new|supplier_new|credit-new|debit-new|new-credit-note|new-debit-note)(\/|$)/.test(
        path
      )
    ) {
      return "create";
    }
    return null;
  }

  function getFormMode() {
    const explicit = document.documentElement.dataset.rbacFormMode;
    if (explicit === "create" || explicit === "edit" || explicit === "view") return explicit;
    return inferFormModeFromUrl();
  }

  function setFormMode(mode) {
    const m = mode ? String(mode).trim().toLowerCase() : "";
    if (m === "create" || m === "edit" || m === "view") {
      document.documentElement.dataset.rbacFormMode = m;
    } else {
      delete document.documentElement.dataset.rbacFormMode;
    }
    applyAll(document);
    if (global.RbacComments && typeof global.RbacComments.bindComments === "function") {
      global.RbacComments.bindComments(document);
    }
  }

  /** General rule: comment add is never RBAC-blocked on create/edit forms. */
  function isCommentAddUnrestricted() {
    const mode = getFormMode();
    return mode === "create" || mode === "edit";
  }

  function isCommentAction(action) {
    const a = String(action || "").trim().toLowerCase();
    return a === "comment_add" || a === "add_comment" || a === "comment";
  }

  function can(action, moduleKey) {
    if (isUnrestricted()) return true;
    const a = String(action || "view").trim().toLowerCase();
    const mod = moduleKey ? String(moduleKey).trim() : "";
    if (mod && global.RbacSession && typeof global.RbacSession.canModule === "function") {
      return global.RbacSession.canModule(mod, a);
    }
    if (isCommentAction(a) && isCommentAddUnrestricted()) return true;
    if (isCommentAction(a)) {
      if (pageCan.view === false) return false;
      return pageCan.comment_add === true || pageCan.create === true || pageCan.edit === true;
    }
    if (a === "item_delete" || a === "line_delete") {
      if (pageCan.view === false) return false;
      return pageCan.create === true || pageCan.edit === true;
    }
    if (a === "view") return pageCan.view !== false;
    if (pageCan.view === false) return false;
    return pageCan[a] === true;
  }

  function denyMessage(action) {
    const labels = {
      create: "create",
      edit: "edit",
      delete: "delete",
      view: "view",
      comment_add: "add comments",
      add_comment: "add comments",
      comment: "add comments",
      item_delete: "change line items",
      line_delete: "change line items",
    };
    const a = labels[String(action || "").toLowerCase()] || action || "perform this action";
    return `You do not have permission to ${a} on this page.`;
  }

  function deniedElementMessage(el, action) {
    return (el && el.getAttribute("data-rbac-message")) || denyMessage(action);
  }

  function elementAction(el) {
    return String((el && el.getAttribute("data-rbac-action")) || "view").trim().toLowerCase();
  }

  function elementModule(el) {
    return (el && el.getAttribute("data-rbac-module")) || "";
  }

  function isRbacDeniedElement(el) {
    if (!el) return false;
    if (el.getAttribute("data-rbac-denied") === "1") return true;
    return el.classList.contains("rbac-action-disabled") && el.hasAttribute("data-rbac-action");
  }

  function markRbacDenied(el, act) {
    const msg = el.getAttribute("data-rbac-message") || denyMessage(act);
    el.classList.add("rbac-action-disabled");
    el.setAttribute("data-rbac-denied", "1");
    el.setAttribute("data-rbac-message", msg);
    el.setAttribute("aria-disabled", "true");
    if (!el.title) el.title = msg;

    if (el.tagName === "A") {
      if (!el.dataset.rbacOriginalHref && el.getAttribute("href")) {
        el.dataset.rbacOriginalHref = el.getAttribute("href");
      }
      el.setAttribute("href", "#");
      return;
    }

    if (!el.matches("button, input, select, textarea")) return;

    if (el.disabled) el.dataset.rbacNativeDisabled = "1";
    el.disabled = false;

    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.readOnly = true;
      el.dataset.rbacReadonly = "1";
    }
    if (el.tagName === "SELECT") {
      el.tabIndex = -1;
      el.dataset.rbacSelectBlocked = "1";
    }
  }

  function clearRbacDenied(el) {
    el.classList.remove("rbac-action-disabled");
    el.removeAttribute("data-rbac-denied");
    el.removeAttribute("data-rbac-message");
    el.removeAttribute("aria-disabled");

    if (el.tagName === "A" && el.dataset.rbacOriginalHref) {
      el.setAttribute("href", el.dataset.rbacOriginalHref);
    }

    if (el.dataset.rbacReadonly === "1") {
      el.readOnly = false;
      delete el.dataset.rbacReadonly;
    }
    if (el.dataset.rbacSelectBlocked === "1") {
      el.tabIndex = 0;
      delete el.dataset.rbacSelectBlocked;
    }
    if (el.dataset.rbacNativeDisabled === "1") {
      el.disabled = true;
      delete el.dataset.rbacNativeDisabled;
    } else if (
      el.matches("button, input, select, textarea") &&
      el.getAttribute("data-rbac-preserve-disabled") !== "1"
    ) {
      el.disabled = false;
    }
  }

  function applyElement(el, action) {
    if (!el) return;
    const act = String(action || el.getAttribute("data-rbac-action") || "view").trim().toLowerCase();
    const mod = el.getAttribute("data-rbac-module") || "";
    if (isCommentAction(act) && isCommentAddUnrestricted()) {
      clearRbacDenied(el);
      if (el.tagName === "A" && el.dataset.rbacOriginalHref) {
        el.setAttribute("href", el.dataset.rbacOriginalHref);
      }
      return;
    }
    if (can(act, mod)) {
      clearRbacDenied(el);
      if (el.tagName === "A" && el.dataset.rbacOriginalHref) {
        el.setAttribute("href", el.dataset.rbacOriginalHref);
      }
      return;
    }

    const hide = el.getAttribute("data-rbac-hide") === "1";
    if (hide || el.matches("tr, .card, .panel, section")) {
      el.style.display = "none";
      el.setAttribute("aria-hidden", "true");
      return;
    }

    if (el.matches("button, input, select, textarea, a")) {
      markRbacDenied(el, act);
    } else {
      el.style.display = "none";
      el.setAttribute("aria-hidden", "true");
    }
  }

  let applyingAll = false;

  function applyAll(root) {
    if (applyingAll) return;
    applyingAll = true;
    try {
      (root || document).querySelectorAll("[data-rbac-action]").forEach((el) => {
        applyElement(el, el.getAttribute("data-rbac-action"));
      });
    } finally {
      applyingAll = false;
    }
  }

  function showDeniedToast(message) {
    const text = message || "You do not have permission to access this page.";
    document.querySelectorAll(".access-denied-notification, .success-notification, .error-notification").forEach((n) => n.remove());
    const notification = document.createElement("div");
    notification.className = "access-denied-notification";
    notification.textContent = text;
    document.body.appendChild(notification);
    requestAnimationFrame(() => notification.classList.add("show"));
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 400);
    }, 4000);
  }

  let lastDeniedToastAt = 0;

  function guardDeniedInteraction(e) {
    const el = e.target.closest("[data-rbac-denied='1'], .rbac-action-disabled[data-rbac-action]");
    if (!el || el.closest("[data-rbac-nav='1']") || el.dataset.rbacNav === "1") return;
    if (!isRbacDeniedElement(el)) return;
    const action = elementAction(el);
    const mod = elementModule(el);
    if (can(action, mod)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const now = Date.now();
    if (now - lastDeniedToastAt < 400) return;
    lastDeniedToastAt = now;
    showDeniedToast(deniedElementMessage(el, action));
    return false;
  }

  function guardDeniedFocus(e) {
    const el = e.target.closest(
      "select[data-rbac-denied='1'], select.rbac-action-disabled[data-rbac-action], input[data-rbac-denied='1'], textarea[data-rbac-denied='1']"
    );
    if (!el || !isRbacDeniedElement(el)) return;
    const action = elementAction(el);
    const mod = elementModule(el);
    if (can(action, mod)) return;
    e.preventDefault();
    if (typeof el.blur === "function") el.blur();
    const now = Date.now();
    if (now - lastDeniedToastAt < 400) return;
    lastDeniedToastAt = now;
    showDeniedToast(deniedElementMessage(el, action));
  }

  function guardClick(e) {
    return guardDeniedInteraction(e);
  }

  function tagButtons(root, mapping) {
    if (!root || !mapping) return;
    Object.entries(mapping).forEach(([selector, action]) => {
      root.querySelectorAll(selector).forEach((el) => {
        if (!el.hasAttribute("data-rbac-action")) {
          el.setAttribute("data-rbac-action", action);
        }
      });
    });
    applyAll(root);
  }

  function observeDynamic(root, mapping) {
    if (!root) return null;
    const run = () => tagButtons(root, mapping);
    run();
    if (global.RbacBind && typeof global.RbacBind.observeDebounced === "function") {
      return global.RbacBind.observeDebounced(root, run, { childList: true, subtree: true });
    }
    const obs = new MutationObserver(run);
    obs.observe(root, { childList: true, subtree: true });
    return obs;
  }

  global.RbacPage = {
    pageCan,
    refreshPageCan,
    isUnrestricted,
    getFormMode,
    setFormMode,
    isCommentAddUnrestricted,
    can,
    denyMessage,
    applyElement,
    applyAll,
    clearRbacDenied,
    showDeniedToast,
    tagButtons,
    observeDynamic,
  };

  document.addEventListener("DOMContentLoaded", () => {
    applyAll();
    document.addEventListener("click", guardClick, true);
    document.addEventListener("pointerdown", guardDeniedInteraction, true);
    document.addEventListener("focusin", guardDeniedFocus, true);
  });
})(window);
