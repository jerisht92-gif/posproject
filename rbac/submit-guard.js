// Submit / Save / Update — require create or edit permission (RBAC-only, no business JS changes).
(function (global) {
  const EDIT_BUTTON_SELECTORS = [
    "#saveUserBtn",
    "#saveProductEditBtn",
    "#saveEnquiryEditBtn",
    "#saveDeptEditBtn",
    "#ackSaveBtn",
    "#saveGrantBtn",
    "#saveCreateGrantBtn",
    "#updateWarehouseBtn",
    "#updateCategoryBtn",
    "#updateTaxCodeBtn",
    "#updateUomBtn",
    "#updateSizeBtn",
    "#updateColorBtn",
    "#updateSupplierBtn",
    "button[id*='update' i]",
    "button[id*='Edit' i][id*='save' i]",
  ];

  const CREATE_BUTTON_SELECTORS = [
    ".save-btn",
    "#submitBtn",
    "#submitEnquiryBtn",
    "#submitInvoiceBtn",
    "#submitImport",
    "#savePaymentBtn",
    "#mpSave",
    "#confirmOk",
    "button.btn-submit",
    "button.btn-save",
    "button[type='submit']",
  ];

  const EDIT_URL_MARKERS = [
    /[?&]user_id=\d+/i,
    /[?&]supplier_id=/i,
    /[?&]customer_id=/i,
    /[?&]product_id=/i,
    /[?&]enquiry_id=/i,
    /[?&]quotation_id=/i,
    /[?&]invoice_id=/i,
    /[?&]edit=/i,
  ];

  function pageApi() {
    return global.RbacPage || null;
  }

  function can(action) {
    const rp = pageApi();
    return rp ? rp.can(action) : true;
  }

  function notify(action) {
    const rp = pageApi();
    const msg = rp ? rp.denyMessage(action) : "You do not have permission for this action.";
    if (rp && typeof rp.showDeniedToast === "function") {
      rp.showDeniedToast(msg);
    }
  }

  function urlLooksLikeEdit() {
    const href = window.location.pathname + window.location.search;
    return EDIT_URL_MARKERS.some((re) => re.test(href));
  }

  function formLooksLikeEdit(form) {
    if (!form) return false;
    const action = String(form.getAttribute("action") || "").toLowerCase();
    const method = String(form.getAttribute("method") || "GET").toUpperCase();
    if (method === "PUT" || method === "PATCH") return true;
    if (action.includes("/update") || action.includes("/edit")) return true;

    const idSelectors = [
      "#editUserId",
      "input[name='user_id']",
      "input[name='supplier_id']",
      "input[name='customer_id']",
      "input[name='product_id']",
      "input[name='enquiry_id']",
      "input[name='quotation_id']",
      "input[name='invoice_id']",
    ];
    for (const sel of idSelectors) {
      const el = form.querySelector(sel);
      if (el && String(el.value || "").trim()) return true;
    }
    return urlLooksLikeEdit();
  }

  function buttonLooksLikeEdit(btn) {
    if (!btn) return false;
    const id = String(btn.id || "").toLowerCase();
    const text = String(btn.textContent || "").toLowerCase();
    if (id.includes("update") || text.includes("update")) return true;
    if (id.includes("edit") && (id.includes("save") || text.includes("save"))) return true;
    if (btn.closest("form") && formLooksLikeEdit(btn.closest("form"))) return true;
    return urlLooksLikeEdit();
  }

  function inferSubmitAction(el) {
    if (!el) return "create";
    const existing = (el.getAttribute("data-rbac-action") || "").trim().toLowerCase();
    if (existing) return existing;
    if (buttonLooksLikeEdit(el)) return "edit";
    return "create";
  }

  function tagSubmitButton(el) {
    if (!el || el.hasAttribute("data-rbac-action")) return;
    const action = inferSubmitAction(el);
    el.setAttribute("data-rbac-action", action);
    if (pageApi()) pageApi().applyElement(el, action);
  }

  function tagAllSubmitButtons(root) {
    const scope = root || document;
    EDIT_BUTTON_SELECTORS.forEach((sel) => {
      try {
        scope.querySelectorAll(sel).forEach(tagSubmitButton);
      } catch (_e) {
        /* invalid selector in old browsers */
      }
    });
    CREATE_BUTTON_SELECTORS.forEach((sel) => {
      try {
        scope.querySelectorAll(sel).forEach((btn) => {
          if (!btn.hasAttribute("data-rbac-action")) tagSubmitButton(btn);
        });
      } catch (_e) {
        /* skip */
      }
    });
  }

  function guardFormSubmit(e) {
    const form = e.target;
    if (!form || form.tagName !== "FORM") return;
    if (form.dataset.rbacSkip === "1") return;

    let action = (form.dataset.rbacAction || "").trim().toLowerCase();
    if (!action) {
      action = formLooksLikeEdit(form) ? "edit" : "create";
    }
    if (can(action)) return;

    e.preventDefault();
    e.stopPropagation();
    notify(action);
  }

  function guardSubmitClick(e) {
    const btn = e.target.closest(
      "button[type='submit'], button.save-btn, button.btn-submit, button.btn-save, #submitBtn, #saveUserBtn"
    );
    if (!btn || btn.dataset.rbacDenied !== "1") return;
    const action = inferSubmitAction(btn);
    if (can(action)) return;
    e.preventDefault();
    e.stopPropagation();
    notify(action);
  }

  let tagSubmitScheduled = false;

  function scheduleTagSubmitButtons() {
    if (tagSubmitScheduled) return;
    tagSubmitScheduled = true;
    requestAnimationFrame(() => {
      tagSubmitScheduled = false;
      tagAllSubmitButtons(document);
    });
  }

  function init() {
    tagAllSubmitButtons(document);
    const obs = new MutationObserver(scheduleTagSubmitButtons);
    obs.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("submit", guardFormSubmit, true);
    document.addEventListener("click", guardSubmitClick, true);
  }

  global.RbacSubmit = {
    inferSubmitAction,
    tagAllSubmitButtons,
    formLooksLikeEdit,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
