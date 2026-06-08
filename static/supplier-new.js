document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const editingSupplierId = (params.get("supplier_id") || "").trim().toUpperCase();
  const supplierForm = document.getElementById("supplierForm");
  const bankNameInput = supplierForm?.querySelector('input[name="bank_name"]');
  const bankAccountNoInput = supplierForm?.querySelector('input[name="bank_account_no"]');
  const ibanSwiftInput = supplierForm?.querySelector('input[name="iban_swift_code"]');
  const categoriesServedInput = supplierForm?.querySelector('input[name="categories_served"]');
  const productCatalogInput = supplierForm?.querySelector('input[name="product_service_catalog"]');
  const minimumOrderQtyInput = supplierForm?.querySelector('input[name="minimum_order_quantity"]');
  const deliveryTimeInput = supplierForm?.querySelector('input[name="average_delivery_time_days"]');
  const returnPolicyInput = supplierForm?.querySelector('input[name="return_replacement_policy"]');
  const contractReferencesInput = supplierForm?.querySelector('input[name="contract_references"]');
  const registeredAddressInput = document.getElementById("registeredOfficeAddress");
  const mailingAddressInput = document.getElementById("mailingAddress");
  const deliveryAddressInput = document.getElementById("warehouseAddress");
  const billingAddressInput = document.getElementById("billingAddress");
  const certificationsInput = supplierForm?.querySelector('input[name="compliance_certifications"]');
  const riskNotesInput = supplierForm?.querySelector('input[name="risk_notes_flags"]');
  const complianceStatusSelect = supplierForm?.querySelector('select[name="compliance_status"]');
  const lastAssessmentDateInput = document.getElementById("lastRiskAssessmentDate");
  const lastEvaluationDateInput = document.getElementById("lastEvaluationDate");
  const riskRatingInput = supplierForm?.querySelector('input[name="risk_ratings"]');
  const insuranceUploadInput = document.getElementById("insuranceUpload");
  const mitigationUploadInput = document.getElementById("mitigationUpload");
  const disputeResolutionUploadInput = document.getElementById("disputeResolutionUpload");
  const interactionLogsUploadInput = document.getElementById("interactionLogsUpload");
  const feedbackSurveysUploadInput = document.getElementById("feedbackSurveysUpload");
  const onTimeDeliveryInput = supplierForm?.querySelector('input[name="on_time_delivery_rate"]');
  const qualityRatingInput = supplierForm?.querySelector('input[name="quality_ratings"]');
  const defectRateInput = supplierForm?.querySelector('input[name="defect_return_rate"]');
  const contractBreachInput = supplierForm?.querySelector('input[name="contract_breaches"]');
  const complaintsInput = supplierForm?.querySelector('input[name="complaints_registered"]');
  const submitButton = supplierForm?.querySelector('button[type="submit"]');
  const discardButton = document.getElementById("discardBtn");
  const deleteSupplierBtn = document.getElementById("deleteSupplierBtn");
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");
  const addCommentBtn = document.getElementById("addCommentBtn");
  const commentText = document.getElementById("commentText");
  const historyContainer = document.getElementById("history");
  const uploadCard = document.getElementById("uploadCard");
  const uploadBtn = document.getElementById("uploadBtn");
  const fileInput = document.getElementById("fileInput");
  const filesList = document.getElementById("filesList");
  const fileCount = document.getElementById("fileCount");
  const supplierNameInput = document.getElementById("supplierName");
  const gstinInput = document.getElementById("gstin");
  const companyRegistrationInput = document.getElementById("companyRegistrationNumber");
  const contactFirstNameInput = document.getElementById("contactFirstName");
  const contactLastNameInput = document.getElementById("contactLastName");
  const supplierPhoneInput = document.getElementById("supplierPhone");
  const supplierEmailInput = document.getElementById("supplierEmail");
  const supplierWebsiteInput = document.getElementById("supplierWebsite");
  const alternateContactInput = document.getElementById("alternateContactNo");
  const relationshipManagerSelect = document.getElementById("relationshipManager");
  const relationshipManagerCustomInput = document.getElementById("relationshipManagerCustom");
  const relationshipManagerWrap = document.getElementById("relationshipManagerWrap");
  const loggedInUserName =
    (window.LOGGED_IN_USER_NAME || "").toString().trim() ||
    (document.querySelector(".dropdown-name")?.textContent || "").trim() ||
    "User";
 
  const comments = [];
  /** True when loaded `comments` field was a JSON array (history entries). */
  let storedCommentsFormatJson = false;
  let gstinCheckDebounceTimer = null;
  let gstinDuplicate = false;
  let lastGstinDuplicateToastValue = "";
  let originalGstin = "";
  const GSTIN_DUPLICATE_TOAST = "Duplicate Tax Identification Number Found.";
  const supplierGstinIndex = Array.isArray(window.SUPPLIER_GSTIN_INDEX)
    ? window.SUPPLIER_GSTIN_INDEX
    : [];
  /** Files picked in UI but not yet uploaded (waiting for supplier_id). */
  const pendingFiles = [];
  /** Attachments already saved on server for this supplier. */
  const serverAttachments = [];
  const MAX_ATTACHMENTS = 10;
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
  const SUPPLIER_UPLOAD_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png"]);
  const SUPPLIER_UPLOAD_ACCEPT =
    ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
  const SUPPLIER_UPLOAD_FORMAT_MSG =
    "Only PDF, JPEG, and PNG files are allowed.";
 
  const SUPPLIER_EMAIL_RE = /^[A-Za-z0-9.]+@[A-Za-z0-9.]+\.[A-Za-z]{2,}$/;
  const SUPPLIER_EMAIL_CHAR_STRIP = /[^A-Za-z0-9.@]/g;
  const SUPPLIER_WEBSITE_PREFIX = "www.";
  const SUPPLIER_WEBSITE_RE = /^www\.[A-Za-z0-9]+\.([A-Za-z0-9]+\.)*[A-Za-z]{2,}$/i;
  const SUPPLIER_WEBSITE_CHAR_STRIP = /[^A-Za-z0-9.]/g;
  const SUPPLIER_WEBSITE_MAX_LEN = 100;
  const SUPPLIER_PHONE_RE = /^[0-9]{10}$/;
  const SUPPLIER_CONTACT_RE = /^[A-Za-z]{2,80}$/;
  const SUPPLIER_BANK_NAME_RE = /^[A-Za-z]{2,100}$/;
  const SUPPLIER_BANK_ACCOUNT_RE = /^[0-9]{9,18}$/;
  const SUPPLIER_NAME_MAX = 30;
  const SUPPLIER_NAME_RE = /^[A-Za-z0-9 ]{3,30}$/;
  const LEGAL_ENTITY_NAME_RE = /^[A-Za-z0-9 ]{3,100}$/;
  const SUPPLIER_GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  const SUPPLIER_REG_NO_RE = /^[A-Z0-9]{8,25}$/;
  const SUPPLIER_IBAN_SWIFT_RE = /^(?:[A-Z0-9]{8}|[A-Z0-9]{11})$/;
  const SUPPLIER_POSITIVE_NUMBER_RE = /^(?:0\.\d*[1-9]\d*|[1-9]\d*(?:\.\d+)?)$/;
  const SUPPLIER_WHOLE_NUMBER_RE = /^[1-9]\d*$/;
  const SUPPLIER_NUMERIC_RE = /^[0-9]+$/;
  const PROC_FIELD_MAX = {
    categories_served: 100,
    product_service_catalog: 200,
    return_replacement_policy: 500,
    contract_references: 100
  };
  const REGISTERED_ADDRESS_MIN = 10;
  const ADDRESS_FIELD_MAX = 250;
  const COMPLIANCE_FIELD_MAX = {
    compliance_certifications: 100,
    risk_notes_flags: 500
  };
  const RISK_RATING_MIN = 1;
  const RISK_RATING_MAX = 5;
  const DELIVERY_TIME_DAYS_MAX = 7;
  const PERCENT_TWO_DECIMALS = 2;
  const SUPPLIER_ID_RE = /^SUP-\d{3,}$/i;
 
  const slotUploadFiles = {
    insurance: null,
    mitigation: null,
    dispute: null,
    interaction: null,
    feedback: null
  };
 
  const SUPPLIER_SLOT_CONFIG = [
    {
      key: "insurance",
      input: () => insuranceUploadInput,
      listId: "insuranceUploadList",
      label: "Insurance upload"
    },
    {
      key: "mitigation",
      input: () => mitigationUploadInput,
      listId: "mitigationUploadList",
      label: "Mitigation upload"
    },
    {
      key: "dispute",
      input: () => disputeResolutionUploadInput,
      listId: "disputeResolutionUploadList",
      label: "Dispute resolutions"
    },
    {
      key: "interaction",
      input: () => interactionLogsUploadInput,
      listId: "interactionLogsUploadList",
      label: "Interaction logs"
    },
    {
      key: "feedback",
      input: () => feedbackSurveysUploadInput,
      listId: "feedbackSurveysUploadList",
      label: "Feedback/surveys"
    }
  ];
 
  function showToast(message, type = "error") {
    const existing = document.querySelector(".success-notification, .error-notification");
    if (existing) existing.remove();
 
    const toast = document.createElement("div");
    toast.className = type === "success" ? "success-notification" : "error-notification";
    toast.textContent = message;
    document.body.appendChild(toast);
 
    requestAnimationFrame(() => {
      toast.classList.add("show");
    });
 
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
 
  function buildPayload(formData) {
    const relationshipManagerSelected = (formData.get("relationship_manager") || "").toString().trim();
    const relationshipManagerCustom = (formData.get("relationship_manager_custom") || "").toString().trim();
    const payload = {
      supplier_id: (formData.get("supplier_id") || "").toString().trim(),
      supplier_name: (formData.get("supplier_name") || "")
        .toString()
        .trim()
        .slice(0, SUPPLIER_NAME_MAX),
      gstin: sanitizeGstin((formData.get("gstin") || "").toString()),
      company_registration_number: (formData.get("company_registration_number") || "")
        .toString()
        .replace(/[^A-Za-z0-9]/g, "")
        .toUpperCase()
        .trim(),
      legal_entity_name: (formData.get("legal_entity_name") || "").toString().trim(),
      country_of_registration: (formData.get("country_of_registration") || "").toString().trim(),
      supplier_type: (formData.get("supplier_type") || "").toString().trim(),
      supplier_tier: (formData.get("supplier_tier") || "").toString().trim(),
      status: (formData.get("status") || "").toString().trim(),
      product_detail: (formData.get("product_detail") || "")
        .toString()
        .replace(/[^A-Za-z ]/g, "")
        .trim(),
      contact_first_name: (formData.get("contact_first_name") || "").toString().trim(),
      contact_last_name: (formData.get("contact_last_name") || "").toString().trim(),
      designation_role: (formData.get("designation_role") || "")
        .toString()
        .replace(/[^A-Za-z ]/g, "")
        .trim(),
      alternate_contact_no: (formData.get("alternate_contact_no") || "")
        .toString()
        .replace(/\D/g, "")
        .trim(),
      email: sanitizeEmailInput((formData.get("email") || "").toString()),
      phone_number: (formData.get("phone_number") || "")
        .toString()
        .replace(/\D/g, "")
        .trim(),
      website: normalizeWebsiteInput((formData.get("website") || "").toString()).trim(),
      relationship_manager:
        relationshipManagerSelected === "custom"
          ? relationshipManagerCustom
          : relationshipManagerSelected,
      registered_office_address: (formData.get("registered_office_address") || "").toString().trim(),
      mailing_address: (formData.get("mailing_address") || "")
        .toString()
        .trim()
        .slice(0, ADDRESS_FIELD_MAX),
      warehouse_address: (formData.get("warehouse_address") || "")
        .toString()
        .trim()
        .slice(0, ADDRESS_FIELD_MAX),
      billing_address: (formData.get("billing_address") || "")
        .toString()
        .trim()
        .slice(0, ADDRESS_FIELD_MAX),
      registered_billing_address: (formData.get("registered_billing_address") || "").toString().trim(),
      bank_name: (formData.get("bank_name") || "").toString().trim(),
      payment_method: (formData.get("payment_method") || "").toString().trim(),
      bank_account_no: (formData.get("bank_account_no") || "")
        .toString()
        .replace(/\D/g, "")
        .trim(),
      payment_terms: (formData.get("payment_terms") || "").toString().trim(),
      iban_swift_code: (formData.get("iban_swift_code") || "")
        .toString()
        .replace(/[^A-Za-z0-9]/g, "")
        .toUpperCase()
        .trim(),
      tax_withholding_setup: (formData.get("tax_withholding_setup") || "")
        .toString()
        .replace(/[^A-Za-z ]/g, "")
        .trim(),
      currency: (formData.get("currency") || "").toString().trim(),
      categories_served: (formData.get("categories_served") || "")
        .toString()
        .replace(/[^A-Za-z ]/g, "")
        .trim()
        .slice(0, PROC_FIELD_MAX.categories_served),
      inco_terms: (formData.get("inco_terms") || "").toString().trim(),
      product_service_catalog: (formData.get("product_service_catalog") || "")
        .toString()
        .replace(/[^A-Za-z ]/g, "")
        .trim()
        .slice(0, PROC_FIELD_MAX.product_service_catalog),
      freight_terms: (formData.get("freight_terms") || "").toString().trim(),
      minimum_order_quantity: sanitizeWholeNumber(
        (formData.get("minimum_order_quantity") || "").toString()
      ),
      return_replacement_policy: (formData.get("return_replacement_policy") || "")
        .toString()
        .replace(/[^A-Za-z0-9 ]/g, "")
        .trim()
        .slice(0, PROC_FIELD_MAX.return_replacement_policy),
      average_delivery_time_days: sanitizeDeliveryTimeDays(
        (formData.get("average_delivery_time_days") || "").toString()
      ),
      contract_references: (formData.get("contract_references") || "")
        .toString()
        .replace(/[^A-Za-z ]/g, "")
        .trim()
        .slice(0, PROC_FIELD_MAX.contract_references),
      compliance_certifications: (formData.get("compliance_certifications") || "")
        .toString()
        .replace(/[^A-Za-z0-9 @_\-]/g, "")
        .trim()
        .slice(0, COMPLIANCE_FIELD_MAX.compliance_certifications),
      risk_notes_flags: (formData.get("risk_notes_flags") || "")
        .toString()
        .replace(/[^A-Za-z ]/g, "")
        .trim()
        .slice(0, COMPLIANCE_FIELD_MAX.risk_notes_flags),
      compliance_status: (formData.get("compliance_status") || "").toString().trim(),
      last_risk_assessment_date: (formData.get("last_risk_assessment_date") || "").toString().trim(),
      risk_ratings: (formData.get("risk_ratings") || "").toString().trim(),
      on_time_delivery_rate: formatOnTimeDeliveryRate(
        (formData.get("on_time_delivery_rate") || "").toString()
      ),
      quality_ratings: sanitizeRiskRating((formData.get("quality_ratings") || "").toString()),
      defect_return_rate: formatDefectReturnRate(
        (formData.get("defect_return_rate") || "").toString()
      ),
      last_evaluation_date: (formData.get("last_evaluation_date") || "").toString().trim(),
      contract_breaches: sanitizeContractBreach(
        (formData.get("contract_breaches") || "").toString()
      ),
      improvement_plans: (formData.get("improvement_plans") || "")
        .toString()
        .replace(/[^A-Za-z ]/g, "")
        .trim(),
      complaints_registered: sanitizePositiveNumber(
        (formData.get("complaints_registered") || "").toString()
      ),
      external_key_contact: (formData.get("external_key_contact") || "").toString().trim(),
      visit_history_meeting_notes: (formData.get("visit_history_meeting_notes") || "")
        .toString()
        .replace(/[^A-Za-z ]/g, "")
        .trim(),
      comments: (formData.get("comments") || "").toString().trim()
    };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") delete payload[key];
    });
    return payload;
  }
 
  function isSupplierTabFocusable(el) {
    if (!el || el.disabled) return false;
    if (el.getAttribute("tabindex") === "-1") return false;
    if (el.type === "hidden" || el.type === "file") return false;
    if (el.readOnly && el.classList.contains("auto-field")) return false;
    const tabPanel = el.closest(".tab-content");
    if (tabPanel && tabPanel.style.display === "none") return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (el.offsetParent === null && el !== document.body) return false;
    return true;
  }

  function getSupplierTabFocusables() {
    if (!supplierForm) return [];
    const selector = [
      "input:not([type='hidden'])",
      "select",
      "textarea",
      "button.tab",
      "button.add-btn",
      "#uploadCard[tabindex='0']",
      ".form-footer button",
    ].join(", ");
    return Array.from(supplierForm.querySelectorAll(selector)).filter(isSupplierTabFocusable);
  }

  function focusSupplierField(el) {
    if (!el || typeof el.focus !== "function") return;
    el.focus();
    if (
      el instanceof HTMLInputElement &&
      ["text", "email", "url", "search", "tel"].includes(el.type) &&
      typeof el.select === "function"
    ) {
      try {
        el.select();
      } catch (_err) {
        /* ignore */
      }
    }
  }

  function setupSupplierFormTabNavigation() {
    if (!supplierForm) return;

    supplierForm.querySelectorAll("input.auto-field[readonly]").forEach((el) => {
      el.tabIndex = -1;
    });
    supplierForm.querySelectorAll('input[type="file"]').forEach((el) => {
      el.tabIndex = -1;
    });

    supplierForm.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;

      const focusables = getSupplierTabFocusables();
      if (!focusables.length) return;

      const current = document.activeElement;
      const idx = focusables.indexOf(current);
      if (idx === -1) return;

      event.preventDefault();
      const nextIdx = event.shiftKey
        ? (idx - 1 + focusables.length) % focusables.length
        : (idx + 1) % focusables.length;
      focusSupplierField(focusables[nextIdx]);
    });

    if (!editingSupplierId) {
      const firstField =
        getSupplierTabFocusables().find((el) => el.id === "gstin") ||
        getSupplierTabFocusables()[0];
      requestAnimationFrame(() => focusSupplierField(firstField));
    }
  }

  function toggleRelationshipManagerCustomField() {
    if (!relationshipManagerSelect || !relationshipManagerCustomInput || !relationshipManagerWrap) return;
    const isCustom = relationshipManagerSelect.value === "custom";
    relationshipManagerWrap.classList.toggle("is-custom", isCustom);
    relationshipManagerCustomInput.disabled = !isCustom;
    relationshipManagerCustomInput.tabIndex = isCustom ? 0 : -1;
    if (!isCustom) {
      relationshipManagerCustomInput.value = "";
    } else {
      requestAnimationFrame(() => relationshipManagerCustomInput.focus());
    }
  }
 
  function trimField(formData, name) {
    return (formData.get(name) || "").toString().trim();
  }
 
  function ensureFieldErrorEl(inputEl) {
    const group = inputEl?.closest(".form-group");
    if (!group) return null;
    let err = group.querySelector(".field-error-msg");
    if (!err) {
      err = document.createElement("small");
      err.className = "field-error-msg";
      err.setAttribute("aria-live", "polite");
      group.appendChild(err);
    }
    return err;
  }
 
  function setFieldError(inputEl, message) {
    if (!inputEl) return;
    const err = ensureFieldErrorEl(inputEl);
    inputEl.classList.toggle("input-error", !!message);
    inputEl.setAttribute("aria-invalid", message ? "true" : "false");
    if (err) {
      err.textContent = message || "";
      err.style.display = message ? "block" : "none";
    }
  }
 
  function isValidContactName(value) {
    return SUPPLIER_CONTACT_RE.test((value || "").trim());
  }
 
  function isValidPhone10(value) {
    const digits = (value || "").replace(/\D/g, "");
    return SUPPLIER_PHONE_RE.test(digits);
  }
 
  function sanitizeEmailInput(value) {
    let v = (value || "").replace(SUPPLIER_EMAIL_CHAR_STRIP, "");
    const at = v.indexOf("@");
    if (at !== -1) {
      v = v.slice(0, at + 1) + v.slice(at + 1).replace(/@/g, "");
    }
    return v.slice(0, 254);
  }

  function isValidEmail(value) {
    return SUPPLIER_EMAIL_RE.test(sanitizeEmailInput(value));
  }

  function validateEmailLive() {
    const v = sanitizeEmailInput(supplierEmailInput?.value || "");
    if (!v) {
      setFieldError(supplierEmailInput, "");
      return false;
    }
    if (!isValidEmail(v)) {
      setFieldError(supplierEmailInput, "Enter a valid email address (e.g. name@example.com).");
      return false;
    }
    setFieldError(supplierEmailInput, "");
    return true;
  }

  function setupEmailValidation() {
    if (!supplierEmailInput) return;
    supplierEmailInput.setAttribute("type", "text");
    supplierEmailInput.setAttribute("inputmode", "email");
    supplierEmailInput.setAttribute("autocomplete", "email");
    supplierEmailInput.setAttribute("maxlength", "254");
    supplierEmailInput.setAttribute(
      "pattern",
      "[A-Za-z0-9.]+@[A-Za-z0-9.]+\\.[A-Za-z]{2,}"
    );
    supplierEmailInput.setAttribute("title", "Enter a valid email address (e.g. name@example.com)");
    restrictInputCharacters(supplierEmailInput, SUPPLIER_EMAIL_CHAR_STRIP);
    supplierEmailInput.addEventListener("input", () => {
      const cleaned = sanitizeEmailInput(supplierEmailInput.value);
      if (supplierEmailInput.value !== cleaned) supplierEmailInput.value = cleaned;
      validateEmailLive();
    });
    supplierEmailInput.addEventListener("blur", () => {
      supplierEmailInput.value = sanitizeEmailInput(supplierEmailInput.value);
      validateEmailLive();
    });
  }

  function sanitizeWebsiteInput(value) {
    return (value || "").replace(SUPPLIER_WEBSITE_CHAR_STRIP, "").slice(0, SUPPLIER_WEBSITE_MAX_LEN);
  }

  function normalizeWebsiteInput(value) {
    let v = sanitizeWebsiteInput(value);
    if (!v) return "";
    if (v.toLowerCase() === "www") return SUPPLIER_WEBSITE_PREFIX;
    if (!v.toLowerCase().startsWith(SUPPLIER_WEBSITE_PREFIX)) {
      v = SUPPLIER_WEBSITE_PREFIX + v.replace(/^www\.?/i, "");
    }
    return v.slice(0, SUPPLIER_WEBSITE_MAX_LEN);
  }

  function isValidWebsite(value) {
    const v = normalizeWebsiteInput(value);
    if (!v) return true;
    return SUPPLIER_WEBSITE_RE.test(v);
  }

  function validateWebsiteLive() {
    const v = normalizeWebsiteInput(supplierWebsiteInput?.value || "");
    if (!v || v === SUPPLIER_WEBSITE_PREFIX) {
      setFieldError(supplierWebsiteInput, "");
      return true;
    }
    if (!isValidWebsite(v)) {
      setFieldError(
        supplierWebsiteInput,
        "Enter website as www.name.domain (e.g. www.example.com)."
      );
      return false;
    }
    setFieldError(supplierWebsiteInput, "");
    return true;
  }

  function applyWebsiteInput() {
    if (!supplierWebsiteInput) return;
    const normalized = normalizeWebsiteInput(supplierWebsiteInput.value);
    if (supplierWebsiteInput.value !== normalized) {
      supplierWebsiteInput.value = normalized;
    }
    validateWebsiteLive();
  }

  function setupWebsiteValidation() {
    if (!supplierWebsiteInput) return;
    supplierWebsiteInput.setAttribute("maxlength", String(SUPPLIER_WEBSITE_MAX_LEN));
    supplierWebsiteInput.setAttribute(
      "title",
      "Enter website as www.name.domain (e.g. www.example.com)"
    );
    supplierWebsiteInput.addEventListener("focus", () => {
      if (!supplierWebsiteInput.value.trim()) {
        supplierWebsiteInput.value = SUPPLIER_WEBSITE_PREFIX;
        try {
          supplierWebsiteInput.setSelectionRange(
            SUPPLIER_WEBSITE_PREFIX.length,
            SUPPLIER_WEBSITE_PREFIX.length
          );
        } catch (_err) {
          /* ignore */
        }
      }
    });
    supplierWebsiteInput.addEventListener("keydown", (event) => {
      if (event.key === "Tab") return;
      const start = supplierWebsiteInput.selectionStart ?? 0;
      const end = supplierWebsiteInput.selectionEnd ?? 0;
      if (
        start < SUPPLIER_WEBSITE_PREFIX.length &&
        (event.key === "Backspace" || event.key === "Delete")
      ) {
        event.preventDefault();
        try {
          supplierWebsiteInput.setSelectionRange(
            SUPPLIER_WEBSITE_PREFIX.length,
            SUPPLIER_WEBSITE_PREFIX.length
          );
        } catch (_err) {
          /* ignore */
        }
      }
      if (
        start < SUPPLIER_WEBSITE_PREFIX.length &&
        end <= SUPPLIER_WEBSITE_PREFIX.length &&
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        try {
          supplierWebsiteInput.setSelectionRange(
            SUPPLIER_WEBSITE_PREFIX.length,
            SUPPLIER_WEBSITE_PREFIX.length
          );
        } catch (_err) {
          /* ignore */
        }
      }
    });
    restrictInputCharacters(supplierWebsiteInput, SUPPLIER_WEBSITE_CHAR_STRIP);
    supplierWebsiteInput.addEventListener("input", applyWebsiteInput);
    supplierWebsiteInput.addEventListener("blur", () => {
      const normalized = normalizeWebsiteInput(supplierWebsiteInput.value);
      supplierWebsiteInput.value =
        normalized === SUPPLIER_WEBSITE_PREFIX ? "" : normalized.trim();
      validateWebsiteLive();
    });
  }

  function validateContactFirstNameLive() {
    const v = (contactFirstNameInput?.value || "").trim();
    if (!v) {
      setFieldError(contactFirstNameInput, "");
      return false;
    }
    if (!isValidContactName(v)) {
      setFieldError(contactFirstNameInput, "First name must be 2–80 letters only.");
      return false;
    }
    setFieldError(contactFirstNameInput, "");
    return true;
  }
 
  function validateContactLastNameLive() {
    const v = (contactLastNameInput?.value || "").trim();
    if (!v) {
      setFieldError(contactLastNameInput, "");
      return false;
    }
    if (!isValidContactName(v)) {
      setFieldError(contactLastNameInput, "Last name must be 2–80 letters only.");
      return false;
    }
    setFieldError(contactLastNameInput, "");
    return true;
  }
 
  function sanitizeGstin(value) {
    return (value || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 15);
  }

  function isValidSupplierGstin(value) {
    return SUPPLIER_GSTIN_RE.test(sanitizeGstin(value));
  }

  function gstinDuplicateMessage(conflict) {
    const supplierId = (conflict?.supplier_id || "").trim();
    return supplierId
      ? `This tax identification number is already registered (${supplierId}).`
      : GSTIN_DUPLICATE_TOAST;
  }

  function getGstinExcludeSupplierId() {
    return (
      editingSupplierId ||
      (document.getElementById("supplierCode")?.value || "").toString().trim().toUpperCase()
    );
  }

  function findLocalGstinDuplicate(gstin) {
    const cleaned = sanitizeGstin(gstin);
    if (!cleaned) return null;
    const excludeId = getGstinExcludeSupplierId();
    return (
      supplierGstinIndex.find(
        (row) => row.gstin === cleaned && row.supplier_id !== excludeId
      ) || null
    );
  }

  function notifyGstinDuplicate(conflict) {
    if (!gstinInput) return;
    const cleaned = sanitizeGstin(gstinInput.value);
    gstinDuplicate = true;
    setFieldError(gstinInput, gstinDuplicateMessage(conflict));
    if (cleaned && cleaned !== lastGstinDuplicateToastValue) {
      lastGstinDuplicateToastValue = cleaned;
      showToast(GSTIN_DUPLICATE_TOAST, "error");
    }
  }

  function checkGstinDuplicate() {
    if (!gstinInput) return false;
    const cleaned = sanitizeGstin(gstinInput.value);
    gstinDuplicate = false;
    if (!cleaned || !SUPPLIER_GSTIN_RE.test(cleaned)) {
      return false;
    }
    if (cleaned === originalGstin) {
      setFieldError(gstinInput, "");
      return false;
    }

    const conflict = findLocalGstinDuplicate(cleaned);
    if (conflict) {
      notifyGstinDuplicate(conflict);
      return true;
    }

    lastGstinDuplicateToastValue = "";
    setFieldError(gstinInput, "");
    return false;
  }

  function validateGstinLive() {
    if (!gstinInput) return true;
    const cleaned = sanitizeGstin(gstinInput.value);
    if (gstinInput.value !== cleaned) gstinInput.value = cleaned;
    if (!cleaned) {
      gstinDuplicate = false;
      setFieldError(gstinInput, "Tax identification number is required.");
      return false;
    }
    if (!SUPPLIER_GSTIN_RE.test(cleaned)) {
      gstinDuplicate = false;
      setFieldError(
        gstinInput,
        "Enter a valid 15-character GSTIN (e.g. 33ABCDE1234F1Z5)."
      );
      return false;
    }
    if (gstinDuplicate) {
      setFieldError(gstinInput, GSTIN_DUPLICATE_TOAST);
      return false;
    }
    setFieldError(gstinInput, "");
    return true;
  }

  let validateSupplierNameLive = () => true;

  function setupSupplierNameValidation() {
    validateSupplierNameLive = setupMaxLengthTextField(
      supplierNameInput,
      SUPPLIER_NAME_MAX,
      "Supplier name"
    );
  }

  function setupGstinValidation() {
    if (!gstinInput) return;
    gstinInput.setAttribute("maxlength", "15");
    gstinInput.setAttribute(
      "title",
      "15-character GSTIN: 2 digits + 5 letters + 4 digits + 1 letter + entity code + Z + check character"
    );
    gstinInput.addEventListener("input", () => {
      const cleaned = sanitizeGstin(gstinInput.value);
      if (gstinInput.value !== cleaned) gstinInput.value = cleaned;
      gstinDuplicate = false;
      lastGstinDuplicateToastValue = "";
      if (!cleaned) {
        setFieldError(gstinInput, "");
        return;
      }
      if (cleaned.length < 15) {
        setFieldError(gstinInput, "GSTIN must be exactly 15 characters.");
        return;
      }
      if (!SUPPLIER_GSTIN_RE.test(cleaned)) {
        setFieldError(
          gstinInput,
          "Enter a valid 15-character GSTIN (e.g. 33ABCDE1234F1Z5)."
        );
        return;
      }
      setFieldError(gstinInput, "");
      if (gstinCheckDebounceTimer) clearTimeout(gstinCheckDebounceTimer);
      gstinCheckDebounceTimer = setTimeout(() => {
        gstinCheckDebounceTimer = null;
        checkGstinDuplicate();
      }, 400);
    });
    gstinInput.addEventListener("blur", () => {
      checkGstinDuplicate();
      validateGstinLive();
    });
  }

  function sanitizeRegistrationNo(value) {
    return (value || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 25);
  }
 
  function isValidRegistrationNo(value) {
    return SUPPLIER_REG_NO_RE.test(sanitizeRegistrationNo(value));
  }
 
  function validateCompanyRegistrationLive() {
    if (!companyRegistrationInput) return false;
    const cleaned = sanitizeRegistrationNo(companyRegistrationInput.value);
    if (companyRegistrationInput.value !== cleaned) companyRegistrationInput.value = cleaned;
    if (!cleaned) {
      setFieldError(companyRegistrationInput, "");
      return false;
    }
    if (!isValidRegistrationNo(cleaned)) {
      setFieldError(
        companyRegistrationInput,
        "Registration number must be 8–25 letters and numbers only."
      );
      return false;
    }
    setFieldError(companyRegistrationInput, "");
    return true;
  }
 
  function sanitizeIbanSwift(value) {
    return (value || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 11);
  }
 
  function isValidIbanSwift(value) {
    return SUPPLIER_IBAN_SWIFT_RE.test(sanitizeIbanSwift(value));
  }
 
  function validateIbanSwiftLive() {
    if (!ibanSwiftInput) return true;
    const cleaned = sanitizeIbanSwift(ibanSwiftInput.value);
    if (ibanSwiftInput.value !== cleaned) ibanSwiftInput.value = cleaned;
    if (!cleaned) {
      setFieldError(ibanSwiftInput, "");
      return true;
    }
    if (!isValidIbanSwift(cleaned)) {
      setFieldError(
        ibanSwiftInput,
        "IBAN/SWIFT code must be exactly 8 or 11 uppercase letters and numbers."
      );
      return false;
    }
    setFieldError(ibanSwiftInput, "");
    return true;
  }
 
  function setupIbanSwiftValidation() {
    if (!ibanSwiftInput) return;
    ibanSwiftInput.setAttribute("maxlength", "11");
    ibanSwiftInput.setAttribute("pattern", "([A-Z0-9]{8}|[A-Z0-9]{11})");
    ibanSwiftInput.setAttribute(
      "title",
      "Exactly 8 or 11 uppercase letters and numbers"
    );
    ibanSwiftInput.addEventListener("input", () => {
      const cleaned = sanitizeIbanSwift(ibanSwiftInput.value);
      if (ibanSwiftInput.value !== cleaned) ibanSwiftInput.value = cleaned;
      validateIbanSwiftLive();
    });
    ibanSwiftInput.addEventListener("blur", validateIbanSwiftLive);
  }
 
  function sanitizePositiveNumber(value) {
    let v = (value || "").replace(/[^\d.]/g, "");
    const dot = v.indexOf(".");
    if (dot !== -1) {
      v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "");
    }
    return v.trim();
  }
 
  function sanitizeWholeNumber(value, maxLen = 10) {
    return sanitizeNumericOnly(value, maxLen);
  }

  function isValidWholeNumber(value) {
    const v = sanitizeWholeNumber(value);
    return !!v && SUPPLIER_WHOLE_NUMBER_RE.test(v);
  }

  function isValidPositiveNumber(value) {
    const v = sanitizePositiveNumber(value);
    return !!v && SUPPLIER_POSITIVE_NUMBER_RE.test(v);
  }
 
  function sanitizeNumericOnly(value, maxLen = 10) {
    return (value || "").replace(/\D/g, "").slice(0, maxLen);
  }
 
  function isValidNumericOnly(value) {
    const v = sanitizeNumericOnly(value);
    return !!v && SUPPLIER_NUMERIC_RE.test(v);
  }
 
  function validateMaxLengthField(inputEl, maxLen, label) {
    if (!inputEl) return true;
    const v = (inputEl.value || "").slice(0, maxLen);
    if (inputEl.value !== v) inputEl.value = v;
    const trimmed = v.trim();
    if (!trimmed) {
      setFieldError(inputEl, "");
      return true;
    }
    if (trimmed.length > maxLen) {
      setFieldError(inputEl, `${label} must be at most ${maxLen} characters.`);
      return false;
    }
    setFieldError(inputEl, "");
    return true;
  }
 
  function validateMinimumOrderQtyLive() {
    if (!minimumOrderQtyInput) return true;
    const cleaned = sanitizeWholeNumber(minimumOrderQtyInput.value);
    if (minimumOrderQtyInput.value !== cleaned) minimumOrderQtyInput.value = cleaned;
    if (!cleaned) {
      setFieldError(minimumOrderQtyInput, "");
      return true;
    }
    if (!isValidWholeNumber(cleaned)) {
      setFieldError(minimumOrderQtyInput, "Minimum order quantity must be a whole number.");
      return false;
    }
    setFieldError(minimumOrderQtyInput, "");
    return true;
  }
 
  function clampDeliveryTimeDays(value) {
    const v = (value || "").trim();
    if (!v) return v;
    const n = Number(v);
    if (Number.isFinite(n) && n > DELIVERY_TIME_DAYS_MAX) {
      return String(DELIVERY_TIME_DAYS_MAX);
    }
    return v;
  }

  function sanitizeDeliveryTimeDays(value) {
    return clampDeliveryTimeDays(sanitizeNumericOnly(value, 2));
  }

  function isValidDeliveryTimeDays(value) {
    const v = sanitizeDeliveryTimeDays(value);
    if (!v) return true;
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 && n <= DELIVERY_TIME_DAYS_MAX;
  }

  function validateDeliveryTimeLive() {
    if (!deliveryTimeInput) return true;
    const cleaned = sanitizeDeliveryTimeDays(deliveryTimeInput.value);
    if (deliveryTimeInput.value !== cleaned) deliveryTimeInput.value = cleaned;
    if (!cleaned) {
      setFieldError(deliveryTimeInput, "");
      return true;
    }
    if (!isValidDeliveryTimeDays(cleaned)) {
      setFieldError(
        deliveryTimeInput,
        `Average delivery time must be between 1 and ${DELIVERY_TIME_DAYS_MAX} days.`
      );
      return false;
    }
    setFieldError(deliveryTimeInput, "");
    return true;
  }
 
  function setupMaxLengthTextField(inputEl, maxLen, label) {
    if (!inputEl) return () => true;
    inputEl.setAttribute("maxlength", String(maxLen));
    const validate = () => validateMaxLengthField(inputEl, maxLen, label);
    inputEl.addEventListener("input", validate);
    inputEl.addEventListener("blur", validate);
    return validate;
  }
 
  function setupPositiveNumberField(inputEl, validateFn) {
    if (!inputEl) return;
    inputEl.setAttribute("inputmode", "decimal");
    inputEl.addEventListener("input", () => {
      const cleaned = sanitizePositiveNumber(inputEl.value);
      if (inputEl.value !== cleaned) inputEl.value = cleaned;
      validateFn();
    });
    inputEl.addEventListener("blur", validateFn);
  }
 
  function setupNumericOnlyField(inputEl, validateFn, maxLen = 10) {
    if (!inputEl) return;
    inputEl.setAttribute("maxlength", String(maxLen));
    inputEl.setAttribute("inputmode", "numeric");
    inputEl.setAttribute("pattern", "[0-9]+");
    inputEl.addEventListener("input", () => {
      const cleaned = sanitizeNumericOnly(inputEl.value, maxLen);
      if (inputEl.value !== cleaned) inputEl.value = cleaned;
      validateFn();
    });
    inputEl.addEventListener("blur", validateFn);
  }
 
  let validateCategoriesServedLive = () => true;
  let validateProductCatalogLive = () => true;
  let validateReturnPolicyLive = () => true;
  let validateContractReferencesLive = () => true;
 
  function setupProcurementFieldValidations() {
    validateCategoriesServedLive = setupMaxLengthTextField(
      categoriesServedInput,
      PROC_FIELD_MAX.categories_served,
      "Categories served"
    );
    validateProductCatalogLive = setupMaxLengthTextField(
      productCatalogInput,
      PROC_FIELD_MAX.product_service_catalog,
      "Product catalog"
    );
    validateReturnPolicyLive = setupMaxLengthTextField(
      returnPolicyInput,
      PROC_FIELD_MAX.return_replacement_policy,
      "Return policy"
    );
    validateContractReferencesLive = setupMaxLengthTextField(
      contractReferencesInput,
      PROC_FIELD_MAX.contract_references,
      "Contract references"
    );
    setupNumericOnlyField(minimumOrderQtyInput, validateMinimumOrderQtyLive);
    setupNumericOnlyField(deliveryTimeInput, validateDeliveryTimeLive, 1);
  }
 
  function validateAllProcurementFieldsLive() {
    validateCategoriesServedLive();
    validateProductCatalogLive();
    validateMinimumOrderQtyLive();
    validateDeliveryTimeLive();
    validateReturnPolicyLive();
    validateContractReferencesLive();
  }
 
  function validateRegisteredAddressLive() {
    if (!registeredAddressInput) return false;
    const v = (registeredAddressInput.value || "").trim();
    if (!v) {
      setFieldError(registeredAddressInput, "Registered address is required.");
      return false;
    }
    if (v.length < REGISTERED_ADDRESS_MIN) {
      setFieldError(
        registeredAddressInput,
        `Registered address must be at least ${REGISTERED_ADDRESS_MIN} characters.`
      );
      return false;
    }
    setFieldError(registeredAddressInput, "");
    return true;
  }
 
  let validateMailingAddressLive = () => true;
  let validateDeliveryAddressLive = () => true;
  let validateBillingAddressLive = () => true;
 
  function setupAddressFieldValidations() {
    if (registeredAddressInput) {
      registeredAddressInput.setAttribute("minlength", String(REGISTERED_ADDRESS_MIN));
      registeredAddressInput.addEventListener("input", validateRegisteredAddressLive);
      registeredAddressInput.addEventListener("blur", validateRegisteredAddressLive);
    }
    validateMailingAddressLive = setupMaxLengthTextField(
      mailingAddressInput,
      ADDRESS_FIELD_MAX,
      "Mailing address"
    );
    validateDeliveryAddressLive = setupMaxLengthTextField(
      deliveryAddressInput,
      ADDRESS_FIELD_MAX,
      "Delivery address"
    );
    validateBillingAddressLive = setupMaxLengthTextField(
      billingAddressInput,
      ADDRESS_FIELD_MAX,
      "Billing address"
    );
  }
 
  function validateAllAddressFieldsLive() {
    validateRegisteredAddressLive();
    validateMailingAddressLive();
    validateDeliveryAddressLive();
    validateBillingAddressLive();
  }
 
  function clampRiskRatingValue(value) {
    const v = (value || "").trim();
    if (!v) return v;
    if (v.endsWith(".")) {
      const intPart = v.slice(0, -1);
      if (intPart && Number(intPart) > RISK_RATING_MAX) return String(RISK_RATING_MAX);
      return v;
    }
    const n = Number(v);
    if (Number.isFinite(n) && n > RISK_RATING_MAX) return String(RISK_RATING_MAX);
    return v;
  }

  function sanitizeRiskRating(value) {
    let v = (value || "").replace(/[^\d.]/g, "");
    const dot = v.indexOf(".");
    if (dot !== -1) {
      const intPart = v.slice(0, dot).slice(0, 1);
      const decPart = v.slice(dot + 1).replace(/\./g, "").slice(0, 1);
      v = decPart.length ? `${intPart}.${decPart}` : `${intPart}.`;
    } else {
      v = v.slice(0, 1);
    }
    return clampRiskRatingValue(v.trim());
  }

  function isValidRiskRating(value) {
    const v = sanitizeRiskRating(value);
    if (!v) return true;
    if (!/^[1-5](\.\d)?$/.test(v)) return false;
    const n = Number(v);
    return Number.isFinite(n) && n >= RISK_RATING_MIN && n <= RISK_RATING_MAX;
  }
 
  const SUPPLIER_INVALID_DATE_MSG =
    "Invalid date. Use format YYYY-MM-DD (e.g. 2026-03-09).";

  function isValidSupplierDateString(value) {
    if (!value || typeof value !== "string") return false;
    const trimmed = value.trim();
    if (!trimmed) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
    const parts = trimmed.split("-");
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (y < 1900 || y > 2100) return false;
    const date = new Date(y, m, d);
    return (
      date.getFullYear() === y &&
      date.getMonth() === m &&
      date.getDate() === d
    );
  }

  function attachSupplierDateYearClamp(inputEl) {
    if (!inputEl) return;
    inputEl.addEventListener("input", () => {
      let v = inputEl.value || "";
      v = v.replace(/[^\d-]/g, "");
      const iso = v.match(/^(\d{4,})-(\d{2})-(\d{2})$/);
      if (iso) {
        const year = iso[1].slice(0, 4);
        inputEl.value = `${year}-${iso[2]}-${iso[3]}`;
        return;
      }
      const lastDash = v.lastIndexOf("-");
      if (lastDash !== -1) {
        const prefix = v.slice(0, lastDash + 1);
        let yearPart = v.slice(lastDash + 1).replace(/\D/g, "");
        if (yearPart.length > 4) yearPart = yearPart.slice(0, 4);
        inputEl.value = prefix + yearPart;
        return;
      }
      const m = v.match(/^(\d{0,4})\d*$/);
      inputEl.value = m ? m[1] : v;
    });
  }

  function handleSupplierDateValidation(dateEl) {
    if (!dateEl) return true;
    let val = (dateEl.value || "").trim();
    if (!val) {
      setFieldError(dateEl, "");
      return true;
    }
    const mDigits = val.match(/(\d{4})\d+/);
    if (mDigits) {
      val = val.replace(/(\d{4})\d+/, "$1");
      dateEl.value = val;
    }
    if (!isValidSupplierDateString(val)) {
      showToast(SUPPLIER_INVALID_DATE_MSG, "error");
      dateEl.value = "";
      setFieldError(dateEl, SUPPLIER_INVALID_DATE_MSG);
      return false;
    }
    setFieldError(dateEl, "");
    return true;
  }

  function formatApiDateToDdMmYyyy(val) {
    const s = String(val || "").trim();
    if (!s) return "";
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;
    const slash = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slash) return `${slash[1]}-${slash[2]}-${slash[3]}`;
    const iso = s.split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split("-");
      return `${d}-${m}-${y}`;
    }
    return "";
  }
 
  function formatApiDateToIso(val) {
    const s = String(val || "").trim();
    if (!s) return "";
    const iso = s.split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const dmDash = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dmDash) return `${dmDash[3]}-${dmDash[2]}-${dmDash[1]}`;
    return "";
  }
 
  function supplierDateDisplayToIso(val) {
    return formatApiDateToIso(val);
  }

  /** Native date fields — same validation/toast pattern as invoice Due Date. */
  function setupSupplierDateField(dateEl) {
    if (!dateEl) return;
    dateEl.setAttribute("placeholder", "dd-mm-yyyy");
    dateEl.setAttribute("title", "dd-mm-yyyy");
    attachSupplierDateYearClamp(dateEl);
    dateEl.addEventListener("change", () => handleSupplierDateValidation(dateEl));
    dateEl.addEventListener("blur", () => handleSupplierDateValidation(dateEl));
  }
 
  function validateSupplierDocFile(file) {
    if (!file) return "";
    const name = (file.name || "").trim();
    const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
    if (!SUPPLIER_UPLOAD_EXTENSIONS.has(ext)) {
      return "type";
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return "size";
    }
    return "";
  }
 
  function formatAttachmentFileSize(bytes) {
    const n = Number(bytes) || 0;
    if (n === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.min(Math.floor(Math.log(n) / Math.log(k)), sizes.length - 1);
    return `${parseFloat((n / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  function formatAttachmentUploadDate(value) {
    if (!value) return "Unknown date";
    const parsed = new Date(String(value).replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString();
  }

  function isTabAttachmentUpload(category) {
    return !category || category === "attachments";
  }

  function showUploading(filename) {
    if (!filesList) return;
    removeUploading();
    filesList.querySelector(".no-files")?.remove();
    filesList.querySelector(".loading-files")?.remove();
    const uploading = document.createElement("div");
    uploading.className = "file-item uploading";
    uploading.innerHTML =
      '<div class="file-info">' +
        '<div class="file-icon"><i class="fa-solid fa-spinner fa-spin"></i></div>' +
        '<div class="file-details">' +
          '<div class="file-name">' + escapeHtml(filename) + "</div>" +
          '<div class="upload-progress">Uploading...</div>' +
        "</div>" +
      "</div>";
    filesList.insertBefore(uploading, filesList.firstChild);
  }

  function removeUploading() {
    const uploading = filesList?.querySelector(".file-item.uploading");
    if (uploading) uploading.remove();
  }

  function updateAttachmentBadge(count) {
    const tab = document.querySelector('.tab[data-tab="attachments"]');
    if (!tab) return;
    const existingBadge = tab.querySelector(".attachment-badge");
    if (existingBadge) existingBadge.remove();
    if (count > 0) {
      const badge = document.createElement("span");
      badge.className = "attachment-badge";
      badge.textContent = String(count);
      tab.appendChild(badge);
    }
  }
 
  function getAttachmentFileIconMeta(name) {
    const ext = String(name || "").split(".").pop().toLowerCase();
    const map = {
      pdf: { icon: "fa-file-pdf", cls: "pdf" },
      doc: { icon: "fa-file-word", cls: "doc" },
      docx: { icon: "fa-file-word", cls: "doc" },
      xls: { icon: "fa-file-excel", cls: "xls" },
      xlsx: { icon: "fa-file-excel", cls: "xls" },
      jpg: { icon: "fa-file-image", cls: "png" },
      jpeg: { icon: "fa-file-image", cls: "png" },
      png: { icon: "fa-file-image", cls: "png" }
    };
    return map[ext] || { icon: "fa-file", cls: "default" };
  }
 
  function buildSupAttRowHtml(meta) {
    const icon = getAttachmentFileIconMeta(meta.name);
    const pendingAttr =
      meta.pendingIndex != null && meta.pendingIndex !== ""
        ? ' data-pending-index="' + String(meta.pendingIndex) + '"'
        : "";
    return (
      '<div class="sup-att__row" data-server-id="' + escapeHtml(meta.serverId || "") + '"' + pendingAttr + ' data-slot-key="' + escapeHtml(meta.slotKey || "") + '">' +
        '<div class="sup-att__file-left">' +
          '<div class="sup-att__fileicon-wrap ' + icon.cls + '"><i class="fa-solid ' + icon.icon + '"></i></div>' +
          '<div class="sup-att__file-info">' +
            '<span class="sup-att__row-name">' + escapeHtml(meta.name || "") + "</span>" +
            '<div class="sup-att__meta-row">' +
              '<span><i class="fa-regular fa-file"></i> ' + escapeHtml(meta.sizeLabel || "") + "</span>" +
              '<span><i class="fa-regular fa-calendar"></i> ' + escapeHtml(meta.dateLabel || "") + "</span>" +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="sup-att__row-actions">' +
          '<button type="button" class="att-btn view-btn" title="View"><i class="fa-regular fa-eye"></i></button>' +
          '<button type="button" class="att-btn download-btn" title="Download"><i class="fa-solid fa-cloud-arrow-down"></i></button>' +
          '<button type="button" class="att-btn delete-btn" title="Delete"><i class="fa-solid fa-trash-can"></i></button>' +
        "</div>" +
      "</div>"
    );
  }

  function buildFileItemHtml(meta) {
    const icon = getAttachmentFileIconMeta(meta.name);
    const pendingAttr =
      meta.pendingIndex != null && meta.pendingIndex !== ""
        ? ' data-pending-index="' + String(meta.pendingIndex) + '"'
        : "";
    const serverAttr = meta.serverId ? ' data-server-id="' + escapeHtml(meta.serverId) + '"' : "";
    return (
      '<div class="file-item"' + serverAttr + pendingAttr + ">" +
        '<div class="file-info">' +
          '<div class="file-icon ' + icon.cls + '"><i class="fa-solid ' + icon.icon + '"></i></div>' +
          '<div class="file-details">' +
            '<div class="file-name">' + escapeHtml(meta.name || "") + "</div>" +
            '<div class="file-meta">' +
              '<span><i class="fa-regular fa-file"></i> ' + escapeHtml(meta.sizeLabel || "") + "</span>" +
              '<span><i class="fa-regular fa-calendar"></i> ' + escapeHtml(meta.dateLabel || "") + "</span>" +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="file-actions">' +
          '<button type="button" class="btn-action btn-view" title="View"><i class="fa-regular fa-eye"></i></button>' +
          '<button type="button" class="btn-action btn-download" title="Download"><i class="fa-solid fa-cloud-arrow-down"></i></button>' +
          '<button type="button" class="btn-action btn-delete" title="Delete"><i class="fa-solid fa-trash-can"></i></button>' +
        "</div>" +
      "</div>"
    );
  }
 
  function viewSupplierAttachmentFile(fileMeta) {
    if (!fileMeta) return;
    const supplierId = getSupplierIdForUploads();
    if (fileMeta.serverId && supplierId) {
      window.open(
        `/api/supplier-attachments/${encodeURIComponent(supplierId)}/${encodeURIComponent(fileMeta.serverId)}/view`,
        "_blank"
      );
      return;
    }
    const blob = fileMeta.pendingFile;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
 
  function downloadSupplierAttachmentFile(fileMeta) {
    if (!fileMeta) return;
    const supplierId = getSupplierIdForUploads();
    if (fileMeta.serverId && supplierId) {
      window.location.href =
        `/api/supplier-attachments/${encodeURIComponent(supplierId)}/${encodeURIComponent(fileMeta.serverId)}/download`;
      return;
    }
    const blob = fileMeta.pendingFile;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = blob.name || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
 
  function renderSlotUploadList(slotKey) {
    const cfg = SUPPLIER_SLOT_CONFIG.find((c) => c.key === slotKey);
    if (!cfg) return;
    const listEl = document.getElementById(cfg.listId);
    const inputEl = cfg.input();
    const file = slotUploadFiles[slotKey];
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!file) {
      if (inputEl) setFieldError(inputEl, "");
      return;
    }
    listEl.innerHTML = buildSupAttRowHtml({
      name: file.name,
      sizeLabel: formatAttachmentFileSize(file.size),
      dateLabel: new Date(file.lastModified || Date.now()).toLocaleString(),
      slotKey
    });
  }
 
  function validateSlotUploadLive(slotKey, label) {
    const cfg = SUPPLIER_SLOT_CONFIG.find((c) => c.key === slotKey);
    const inputEl = cfg?.input();
    const file = slotUploadFiles[slotKey];
    if (!file) {
      if (inputEl) setFieldError(inputEl, "");
      return true;
    }
    const issue = validateSupplierDocFile(file);
    if (issue === "type") {
      if (inputEl) setFieldError(inputEl, `${label}: ${SUPPLIER_UPLOAD_FORMAT_MSG}`);
      showToast(`Invalid file format. ${SUPPLIER_UPLOAD_FORMAT_MSG}`, "error");
      slotUploadFiles[slotKey] = null;
      if (inputEl) inputEl.value = "";
      renderSlotUploadList(slotKey);
      return false;
    }
    if (issue === "size") {
      if (inputEl) setFieldError(inputEl, `${label} must be 10MB or smaller.`);
      showToast(`${label} must be 10MB or smaller.`, "error");
      slotUploadFiles[slotKey] = null;
      if (inputEl) inputEl.value = "";
      renderSlotUploadList(slotKey);
      return false;
    }
    if (inputEl) setFieldError(inputEl, "");
    return true;
  }
 
  function processSlotUploadFile(key, label, inputEl, file) {
    if (!file) {
      slotUploadFiles[key] = null;
      if (inputEl) inputEl.value = "";
      renderSlotUploadList(key);
      return;
    }
    slotUploadFiles[key] = file;
    validateSlotUploadLive(key, label);
    renderSlotUploadList(key);
  }
 
  function setupSupplierDocumentUploads() {
    SUPPLIER_SLOT_CONFIG.forEach(({ key, input, label }) => {
      const inputEl = input();
      if (!inputEl) return;
      inputEl.setAttribute("accept", SUPPLIER_UPLOAD_ACCEPT);
      inputEl.setAttribute("title", SUPPLIER_UPLOAD_FORMAT_MSG);
      inputEl.addEventListener("change", () => {
        processSlotUploadFile(key, label, inputEl, inputEl.files?.[0] || null);
      });
    });
 
    supplierForm?.addEventListener("click", async (event) => {
      const btn = event.target instanceof HTMLElement ? event.target.closest(".att-btn") : null;
      if (!btn) return;
      const row = btn.closest(".sup-att__row");
      if (!row || !row.closest(".supplier-doc-upload__list")) return;

      const slotKey = row.dataset.slotKey;
      const serverId = row.dataset.serverId;
      const file = slotKey ? slotUploadFiles[slotKey] : null;
      const supplierId = getSupplierIdForUploads();

      if (btn.classList.contains("view-btn")) {
        if (serverId) viewSupplierAttachmentFile({ serverId });
        else if (file) viewSupplierAttachmentFile({ pendingFile: file });
        return;
      }
      if (btn.classList.contains("download-btn")) {
        if (serverId) downloadSupplierAttachmentFile({ serverId });
        else if (file) downloadSupplierAttachmentFile({ pendingFile: file });
        return;
      }
      if (btn.classList.contains("delete-btn")) {
        if (serverId && supplierId) {
          try {
            const response = await fetch(
              `/api/supplier-attachments/${encodeURIComponent(supplierId)}/${encodeURIComponent(serverId)}`,
              { method: "DELETE" }
            );
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.success) {
              showToast(result?.message || "Failed to remove file.", "error");
              return;
            }
            await loadSupplierAttachments();
            hydrateSlotUploadsFromServer();
            showToast("File removed.", "success");
          } catch (error) {
            showToast("Network error while removing file.", "error");
          }
          return;
        }
        if (slotKey) {
          slotUploadFiles[slotKey] = null;
          const cfg = SUPPLIER_SLOT_CONFIG.find((c) => c.key === slotKey);
          if (cfg?.input()) cfg.input().value = "";
          renderSlotUploadList(slotKey);
        }
      }
    });
  }
 
  function validateAllSupplierDocumentUploadsLive() {
    let ok = true;
    SUPPLIER_SLOT_CONFIG.forEach(({ key, label }) => {
      if (!validateSlotUploadLive(key, label)) ok = false;
    });
    return ok;
  }
 
  async function uploadSlotFiles() {
    for (const { key } of SUPPLIER_SLOT_CONFIG) {
      const file = slotUploadFiles[key];
      if (!file) continue;
      const ok = await uploadSupplierFile(file, key);
      if (ok) {
        slotUploadFiles[key] = null;
        const cfg = SUPPLIER_SLOT_CONFIG.find((c) => c.key === key);
        if (cfg?.input()) cfg.input().value = "";
        renderSlotUploadList(key);
      }
    }
  }
 
  
  function validateComplianceStatusLive() {
    if (!complianceStatusSelect) return false;
    const v = (complianceStatusSelect.value || "").trim();
    if (!v) {
      setFieldError(complianceStatusSelect, "Compliance status is required.");
      return false;
    }
    setFieldError(complianceStatusSelect, "");
    return true;
  }
 
  function validateRiskRatingLive() {
    if (!riskRatingInput) return true;
    const cleaned = sanitizeRiskRating(riskRatingInput.value);
    if (riskRatingInput.value !== cleaned) riskRatingInput.value = cleaned;
    if (!cleaned) {
      setFieldError(riskRatingInput, "");
      return true;
    }
    if (!isValidRiskRating(cleaned)) {
      setFieldError(riskRatingInput, "Risk rating must be between 1 and 5 with one decimal place (e.g. 4.8).");
      return false;
    }
    setFieldError(riskRatingInput, "");
    return true;
  }
 
  let validateCertificationsLive = () => true;
  let validateRiskNotesLive = () => true;
 
  function setupComplianceFieldValidations() {
    setupSupplierDateField(lastAssessmentDateInput);
 
    validateCertificationsLive = setupMaxLengthTextField(
      certificationsInput,
      COMPLIANCE_FIELD_MAX.compliance_certifications,
      "Certifications"
    );
    validateRiskNotesLive = setupMaxLengthTextField(
      riskNotesInput,
      COMPLIANCE_FIELD_MAX.risk_notes_flags,
      "Risk notes"
    );
 
    if (complianceStatusSelect) {
      complianceStatusSelect.addEventListener("change", validateComplianceStatusLive);
      complianceStatusSelect.addEventListener("blur", validateComplianceStatusLive);
    }
 
    if (riskRatingInput) {
      riskRatingInput.setAttribute("inputmode", "decimal");
      riskRatingInput.addEventListener("input", () => {
        const cleaned = sanitizeRiskRating(riskRatingInput.value);
        if (riskRatingInput.value !== cleaned) riskRatingInput.value = cleaned;
        validateRiskRatingLive();
      });
      riskRatingInput.addEventListener("blur", validateRiskRatingLive);
    }
 
  }
 
  function validateAllComplianceFieldsLive() {
    validateCertificationsLive();
    validateRiskNotesLive();
    validateComplianceStatusLive();
    validateRiskRatingLive();
    validateAllSupplierDocumentUploadsLive();
  }
 
  function sanitizePercent0to100(value, maxDecimals = null) {
    let v = (value || "").replace(/[^0-9.]/g, "");
    const dot = v.indexOf(".");
    if (dot !== -1) {
      const intPart = v.slice(0, dot);
      let decPart = v.slice(dot + 1).replace(/\./g, "");
      if (maxDecimals != null) {
        decPart = decPart.slice(0, maxDecimals);
      }
      v = decPart.length ? `${intPart}.${decPart}` : `${intPart}.`;
    }
    return v.trim();
  }

  function roundPercent0to100(value, decimalPlaces = PERCENT_TWO_DECIMALS) {
    const v = sanitizePercent0to100(value, decimalPlaces);
    if (!v || v.endsWith(".")) return v.replace(/\.$/, "");
    const n = Number(v);
    if (!Number.isFinite(n)) return v;
    const clamped = Math.min(100, Math.max(0, n));
    return clamped.toFixed(decimalPlaces);
  }

  function sanitizePercentRateTwoDecimals(value) {
    return sanitizePercent0to100(value, PERCENT_TWO_DECIMALS);
  }

  function formatPercentRateTwoDecimals(value) {
    const v = (value || "").trim();
    if (!v) return "";
    return roundPercent0to100(v, PERCENT_TWO_DECIMALS);
  }

  function clampPercentInputToMax(value, max = 100) {
    const v = (value || "").trim();
    if (!v) return v;
    if (v.endsWith(".")) {
      const intPart = v.slice(0, -1);
      if (intPart && Number(intPart) > max) return String(max);
      return v;
    }
    const n = Number(v);
    if (Number.isFinite(n) && n > max) return String(max);
    return v;
  }

  function sanitizeOnTimeDeliveryRate(value) {
    return clampPercentInputToMax(sanitizePercentRateTwoDecimals(value), 100);
  }

  function formatOnTimeDeliveryRate(value) {
    return formatPercentRateTwoDecimals(value);
  }

  function sanitizeDefectReturnRate(value) {
    return clampPercentInputToMax(sanitizePercentRateTwoDecimals(value), 100);
  }

  function formatDefectReturnRate(value) {
    return formatPercentRateTwoDecimals(value);
  }
 
  function isValidPercent0to100(value) {
    const v = sanitizePercent0to100(value);
    if (!v) return true;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 100;
  }
 
  function isValidQualityRating(value) {
    const v = sanitizeRiskRating(value);
    if (!v) return true;
    if (!/^[1-5](\.\d)?$/.test(v)) return false;
    const n = Number(v);
    return Number.isFinite(n) && n >= RISK_RATING_MIN && n <= RISK_RATING_MAX;
  }
 
  function sanitizeContractBreach(value) {
    const letter = (value || "").replace(/[^yYnN]/g, "").slice(0, 1).toUpperCase();
    return letter === "Y" || letter === "N" ? letter : "";
  }
 
  function isValidContractBreach(value) {
    const v = sanitizeContractBreach(value);
    if (!v) return true;
    return v === "Y" || v === "N";
  }
 
  function validateOnTimeDeliveryLive() {
    if (!onTimeDeliveryInput) return true;
    const cleaned = sanitizeOnTimeDeliveryRate(onTimeDeliveryInput.value);
    if (onTimeDeliveryInput.value !== cleaned) onTimeDeliveryInput.value = cleaned;
    if (!cleaned) {
      setFieldError(onTimeDeliveryInput, "");
      return true;
    }
    if (!isValidPercent0to100(cleaned)) {
      setFieldError(onTimeDeliveryInput, "On-time delivery must be between 0 and 100.");
      return false;
    }
    setFieldError(onTimeDeliveryInput, "");
    return true;
  }
 
  function validateQualityRatingLive() {
    if (!qualityRatingInput) return true;
    const cleaned = sanitizeRiskRating(qualityRatingInput.value);
    if (qualityRatingInput.value !== cleaned) qualityRatingInput.value = cleaned;
    if (!cleaned) {
      setFieldError(qualityRatingInput, "");
      return true;
    }
    if (!isValidQualityRating(cleaned)) {
      setFieldError(qualityRatingInput, "Quality rating must be between 1 and 5.");
      return false;
    }
    setFieldError(qualityRatingInput, "");
    return true;
  }
 
  function validateDefectRateLive() {
    if (!defectRateInput) return true;
    const cleaned = sanitizeDefectReturnRate(defectRateInput.value);
    if (defectRateInput.value !== cleaned) defectRateInput.value = cleaned;
    if (!cleaned) {
      setFieldError(defectRateInput, "");
      return true;
    }
    if (!isValidPercent0to100(cleaned)) {
      setFieldError(defectRateInput, "Defect rate must be between 0 and 100.");
      return false;
    }
    setFieldError(defectRateInput, "");
    return true;
  }
 
  function validateComplaintsLive() {
    if (!complaintsInput) return true;
    const cleaned = sanitizePositiveNumber(complaintsInput.value);
    if (complaintsInput.value !== cleaned) complaintsInput.value = cleaned;
    if (!cleaned) {
      setFieldError(complaintsInput, "");
      return true;
    }
    if (!isValidPositiveNumber(cleaned)) {
      setFieldError(complaintsInput, "Complaints must be a positive number.");
      return false;
    }
    setFieldError(complaintsInput, "");
    return true;
  }
 
  function validateContractBreachLive() {
    if (!contractBreachInput) return true;
    const cleaned = sanitizeContractBreach(contractBreachInput.value);
    if (contractBreachInput.value !== cleaned) contractBreachInput.value = cleaned;
    if (!cleaned) {
      setFieldError(contractBreachInput, "");
      return true;
    }
    if (!isValidContractBreach(cleaned)) {
      setFieldError(contractBreachInput, "Contract breach must be Y or N only.");
      return false;
    }
    setFieldError(contractBreachInput, "");
    return true;
  }
 
  function setupOnTimeDeliveryField() {
    if (!onTimeDeliveryInput) return;
    onTimeDeliveryInput.setAttribute("inputmode", "decimal");
    onTimeDeliveryInput.addEventListener("input", () => {
      const cleaned = sanitizeOnTimeDeliveryRate(onTimeDeliveryInput.value);
      if (onTimeDeliveryInput.value !== cleaned) onTimeDeliveryInput.value = cleaned;
      validateOnTimeDeliveryLive();
    });
    onTimeDeliveryInput.addEventListener("blur", () => {
      const formatted = formatOnTimeDeliveryRate(onTimeDeliveryInput.value);
      if (formatted) onTimeDeliveryInput.value = formatted;
      validateOnTimeDeliveryLive();
    });
  }

  function setupDefectReturnField() {
    if (!defectRateInput) return;
    defectRateInput.setAttribute("inputmode", "decimal");
    defectRateInput.addEventListener("input", () => {
      const cleaned = sanitizeDefectReturnRate(defectRateInput.value);
      if (defectRateInput.value !== cleaned) defectRateInput.value = cleaned;
      validateDefectRateLive();
    });
    defectRateInput.addEventListener("blur", () => {
      const formatted = formatDefectReturnRate(defectRateInput.value);
      if (formatted) defectRateInput.value = formatted;
      validateDefectRateLive();
    });
  }

  function setupPerformanceFieldValidations() {
    setupSupplierDateField(lastEvaluationDateInput);
    setupOnTimeDeliveryField();
    setupDefectReturnField();
 
    if (qualityRatingInput) {
      qualityRatingInput.setAttribute("inputmode", "decimal");
      qualityRatingInput.addEventListener("input", () => {
        const cleaned = sanitizeRiskRating(qualityRatingInput.value);
        if (qualityRatingInput.value !== cleaned) qualityRatingInput.value = cleaned;
        validateQualityRatingLive();
      });
      qualityRatingInput.addEventListener("blur", validateQualityRatingLive);
    }
 
    if (contractBreachInput) {
      contractBreachInput.setAttribute("maxlength", "1");
      contractBreachInput.addEventListener("input", () => {
        const cleaned = sanitizeContractBreach(contractBreachInput.value);
        if (contractBreachInput.value !== cleaned) contractBreachInput.value = cleaned;
        validateContractBreachLive();
      });
      contractBreachInput.addEventListener("blur", validateContractBreachLive);
    }
 
    setupPositiveNumberField(complaintsInput, validateComplaintsLive);
  }
 
  function validateAllPerformanceFieldsLive() {
    validateOnTimeDeliveryLive();
    validateQualityRatingLive();
    validateDefectRateLive();
    validateComplaintsLive();
    validateContractBreachLive();
  }
 
  function setupCompanyRegistrationValidation() {
    if (!companyRegistrationInput) return;
    companyRegistrationInput.setAttribute("maxlength", "25");
    companyRegistrationInput.setAttribute("pattern", "[A-Z0-9]{8,25}");
    companyRegistrationInput.setAttribute(
      "title",
      "8–25 letters and numbers only (letters are uppercase)"
    );
    companyRegistrationInput.addEventListener("input", () => {
      const cleaned = sanitizeRegistrationNo(companyRegistrationInput.value);
      if (companyRegistrationInput.value !== cleaned) companyRegistrationInput.value = cleaned;
      validateCompanyRegistrationLive();
    });
    companyRegistrationInput.addEventListener("blur", validateCompanyRegistrationLive);
  }
 
  function isValidBankName(value) {
    return SUPPLIER_BANK_NAME_RE.test((value || "").trim());
  }
 
  function isValidBankAccount(value) {
    const digits = (value || "").replace(/\D/g, "");
    return SUPPLIER_BANK_ACCOUNT_RE.test(digits);
  }
 
  function validateBankNameLive() {
    const v = (bankNameInput?.value || "").trim();
    if (!v) {
      setFieldError(bankNameInput, "");
      return true;
    }
    if (!isValidBankName(v)) {
      setFieldError(bankNameInput, "Bank name must be 2–100 letters only.");
      return false;
    }
    setFieldError(bankNameInput, "");
    return true;
  }
 
  function validateBankAccountLive() {
    const digits = (bankAccountNoInput?.value || "").replace(/\D/g, "");
    if (!digits) {
      setFieldError(bankAccountNoInput, "");
      return true;
    }
    if (!isValidBankAccount(digits)) {
      setFieldError(bankAccountNoInput, "Account number must be 9–18 digits only.");
      return false;
    }
    setFieldError(bankAccountNoInput, "");
    return true;
  }
 
  function validatePhoneLive(inputEl, required) {
    if (!inputEl) return !required;
    const digits = (inputEl.value || "").replace(/\D/g, "");
    if (!digits) {
      if (required) {
        setFieldError(inputEl, "Phone number is required.");
        return false;
      }
      setFieldError(inputEl, "");
      return true;
    }
    if (!isValidPhone10(digits)) {
      setFieldError(inputEl, "Enter exactly 10 digits.");
      return false;
    }
    setFieldError(inputEl, "");
    return true;
  }
 
  function keepDigitsOnly(inputEl, options = {}) {
    if (!inputEl) return;
    const maxLen = options.maxLen ?? 10;
    const pattern = options.pattern ?? "[0-9]{10}";
    const validateFn = options.validateFn;
    inputEl.setAttribute("maxlength", String(maxLen));
    inputEl.setAttribute("inputmode", "numeric");
    inputEl.setAttribute("pattern", pattern);
    const runValidate = () => {
      if (typeof validateFn === "function") {
        validateFn();
      } else {
        validatePhoneLive(inputEl, inputEl === supplierPhoneInput);
      }
    };
    inputEl.addEventListener("input", () => {
      const digits = (inputEl.value || "").replace(/\D/g, "").slice(0, maxLen);
      if (inputEl.value !== digits) inputEl.value = digits;
      runValidate();
    });
    inputEl.addEventListener("blur", runValidate);
  }
 
  function keepLettersOnly(inputEl, options = {}) {
    if (!inputEl) return;
    const maxLen = options.maxLen ?? 80;
    const pattern = options.pattern ?? `[A-Za-z]{2,${maxLen}}`;
    const validateFn = options.validateFn;
    inputEl.setAttribute("maxlength", String(maxLen));
    inputEl.setAttribute("pattern", pattern);
    const runValidate = () => {
      if (typeof validateFn === "function") validateFn();
    };
    inputEl.addEventListener("input", () => {
      const letters = (inputEl.value || "").replace(/[^A-Za-z]/g, "").slice(0, maxLen);
      if (inputEl.value !== letters) inputEl.value = letters;
      runValidate();
    });
    inputEl.addEventListener("blur", runValidate);
  }

  const SUPPLIER_CHAR_STRIP = {
    name: /[^A-Za-z0-9 ]/g,
    text: /[^A-Za-z0-9 .,&()'/:\-/]/g,
    address: /[^A-Za-z0-9 ,.\-/]/g,
    website: /[^A-Za-z0-9.]/g,
    letters: /[^A-Za-z ]/g,
    certification: /[^A-Za-z0-9 @_\-]/g,
    general: /[^A-Za-z0-9 ]/g,
  };

  const SKIP_INPUT_CHAR_RESTRICTION_IDS = new Set([
    "supplierEmail",
    "supplierWebsite",
    "supplierCode",
    "gstin",
    "companyRegistrationNumber",
    "contactFirstName",
    "contactLastName",
    "supplierPhone",
    "alternateContactNo",
  ]);

  const SKIP_INPUT_CHAR_RESTRICTION_NAMES = new Set([
    "email",
    "website",
    "bank_name",
    "bank_account_no",
    "iban_swift_code",
    "minimum_order_quantity",
    "average_delivery_time_days",
    "risk_ratings",
    "on_time_delivery_rate",
    "quality_ratings",
    "defect_return_rate",
    "contract_breaches",
    "complaints_registered",
    "last_risk_assessment_date",
    "last_evaluation_date",
  ]);

  const INPUT_CHAR_RULE_BY_ID = {
    supplierName: "name",
    legalEntityName: "name",
    registeredOfficeAddress: "address",
    mailingAddress: "address",
    warehouseAddress: "address",
    billingAddress: "address",
    relationshipManagerCustom: "letters",
    commentText: "text",
  };

  const INPUT_CHAR_RULE_BY_NAME = {
    product_detail: "letters",
    designation_role: "letters",
    categories_served: "letters",
    product_service_catalog: "letters",
    return_replacement_policy: "name",
    contract_references: "letters",
    compliance_certifications: "certification",
    risk_notes_flags: "letters",
    tax_withholding_setup: "letters",
    improvement_plans: "letters",
    complaints_registered: "general",
    external_key_contact: "name",
    visit_history_meeting_notes: "letters",
  };

  function restrictInputCharacters(inputEl, stripRegex) {
    if (!inputEl || !stripRegex) return;

    const sanitize = (value) => (value || "").replace(stripRegex, "");

    const apply = () => {
      const maxLen = inputEl.maxLength > 0 ? inputEl.maxLength : null;
      let cleaned = sanitize(inputEl.value);
      if (maxLen != null) cleaned = cleaned.slice(0, maxLen);
      if (inputEl.value !== cleaned) inputEl.value = cleaned;
    };

    inputEl.addEventListener("input", apply);
    inputEl.addEventListener("paste", (event) => {
      event.preventDefault();
      const pasted = event.clipboardData?.getData("text") || "";
      const start = inputEl.selectionStart ?? inputEl.value.length;
      const end = inputEl.selectionEnd ?? inputEl.value.length;
      const merged = inputEl.value.slice(0, start) + pasted + inputEl.value.slice(end);
      const maxLen = inputEl.maxLength > 0 ? inputEl.maxLength : null;
      let cleaned = sanitize(merged);
      if (maxLen != null) cleaned = cleaned.slice(0, maxLen);
      inputEl.value = cleaned;
      const caret = Math.min(start + sanitize(pasted).length, cleaned.length);
      try {
        inputEl.setSelectionRange(caret, caret);
      } catch (_err) {
        /* ignore */
      }
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  function setupSupplierTextFieldRestrictions() {
    if (!supplierForm) return;

    supplierForm.querySelectorAll('input[type="text"], textarea').forEach((inputEl) => {
      if (inputEl.readOnly || inputEl.disabled) return;
      if (inputEl.id && SKIP_INPUT_CHAR_RESTRICTION_IDS.has(inputEl.id)) return;
      if (inputEl.name && SKIP_INPUT_CHAR_RESTRICTION_NAMES.has(inputEl.name)) return;

      let rule = "general";
      if (inputEl.id && INPUT_CHAR_RULE_BY_ID[inputEl.id]) {
        rule = INPUT_CHAR_RULE_BY_ID[inputEl.id];
      } else if (inputEl.name && INPUT_CHAR_RULE_BY_NAME[inputEl.name]) {
        rule = INPUT_CHAR_RULE_BY_NAME[inputEl.name];
      }

      restrictInputCharacters(inputEl, SUPPLIER_CHAR_STRIP[rule]);
    });
  }
 
  function validateSupplierForm(formData) {
    const supplierId = trimField(formData, "supplier_id");
    const gstin = trimField(formData, "gstin");
    const supplierName = trimField(formData, "supplier_name");
    const companyReg = sanitizeRegistrationNo(trimField(formData, "company_registration_number"));
    const legalEntity = trimField(formData, "legal_entity_name");
    const country = trimField(formData, "country_of_registration");
    const supplierType = trimField(formData, "supplier_type");
    const supplierTier = trimField(formData, "supplier_tier");
    const status = trimField(formData, "status");
    const contactFirst = trimField(formData, "contact_first_name");
    const contactLast = trimField(formData, "contact_last_name");
    const email = sanitizeEmailInput(trimField(formData, "email"));
    const website = normalizeWebsiteInput(trimField(formData, "website")).trim();
    const phone = trimField(formData, "phone_number").replace(/\D/g, "");
    const alternatePhone = trimField(formData, "alternate_contact_no").replace(/\D/g, "");
    const regOffice = trimField(formData, "registered_office_address");
    const mailingAddress = trimField(formData, "mailing_address");
    const deliveryAddress = trimField(formData, "warehouse_address");
    const billingAddress = trimField(formData, "billing_address");
    const rmSel = trimField(formData, "relationship_manager");
    const rmCustom = trimField(formData, "relationship_manager_custom");
    const bankName = trimField(formData, "bank_name");
    const bankAccount = trimField(formData, "bank_account_no").replace(/\D/g, "");
    const ibanSwift = sanitizeIbanSwift(trimField(formData, "iban_swift_code"));
    const categoriesServed = trimField(formData, "categories_served");
    const productCatalog = trimField(formData, "product_service_catalog");
    const minimumOrderQty = sanitizeWholeNumber(trimField(formData, "minimum_order_quantity"));
    const deliveryTime = sanitizeDeliveryTimeDays(trimField(formData, "average_delivery_time_days"));
    const returnPolicy = trimField(formData, "return_replacement_policy");
    const contractReferences = trimField(formData, "contract_references");
    const certifications = trimField(formData, "compliance_certifications");
    const riskNotes = trimField(formData, "risk_notes_flags");
    const complianceStatus = trimField(formData, "compliance_status");
    const riskRating = sanitizeRiskRating(trimField(formData, "risk_ratings"));
    const onTimeDelivery = formatOnTimeDeliveryRate(trimField(formData, "on_time_delivery_rate"));
    const qualityRating = sanitizeRiskRating(trimField(formData, "quality_ratings"));
    const defectRate = formatDefectReturnRate(trimField(formData, "defect_return_rate"));
    const contractBreach = sanitizeContractBreach(trimField(formData, "contract_breaches"));
    const complaints = sanitizePositiveNumber(trimField(formData, "complaints_registered"));
    const lastAssessmentDate = trimField(formData, "last_risk_assessment_date");
    const lastEvaluationDate = trimField(formData, "last_evaluation_date");

    if (!supplierId) {
      return "Supplier ID is required. Wait for it to generate, then try again.";
    }
    if (!SUPPLIER_ID_RE.test(supplierId.toUpperCase())) {
      return "Supplier ID must be in SUP-001 format.";
    }
    const gstinNorm = sanitizeGstin(gstin);
    if (!gstinNorm) return "Tax identification number is required.";
    if (!isValidSupplierGstin(gstinNorm)) {
      return "Enter a valid 15-character GSTIN (e.g. 33ABCDE1234F1Z5).";
    }
    if (findLocalGstinDuplicate(gstinNorm)) {
      return GSTIN_DUPLICATE_TOAST;
    }
    if (!supplierName) return "Supplier name is required.";
    if (!SUPPLIER_NAME_RE.test(supplierName)) {
      return `Supplier name must be 3–${SUPPLIER_NAME_MAX} letters and numbers only (no special characters).`;
    }
    if (!companyReg) return "Company registration number is required.";
    if (!SUPPLIER_REG_NO_RE.test(companyReg)) {
      return "Company registration number must be 8–25 letters and numbers only.";
    }
    if (!legalEntity) return "Legal entity name is required.";
    if (!LEGAL_ENTITY_NAME_RE.test(legalEntity)) {
      return "Legal entity name must be 3–100 letters and numbers only (no special characters).";
    }
    if (!country) return "Country of registration is required.";
    if (!supplierType) return "Supplier type is required.";
    if (!supplierTier) return "Supplier tier is required.";
    if (!status) return "Status is required.";
    if (!contactFirst) return "Primary contact first name is required.";
    if (!SUPPLIER_CONTACT_RE.test(contactFirst)) {
      return "Primary contact first name must be 2–80 letters only.";
    }
    if (!contactLast) return "Last name is required.";
    if (!SUPPLIER_CONTACT_RE.test(contactLast)) {
      return "Last name must be 2–80 letters only.";
    }
    if (!email) return "Email is required.";
    if (!SUPPLIER_EMAIL_RE.test(email)) return "Enter a valid email address.";
    if (website && !SUPPLIER_WEBSITE_RE.test(website)) {
      return "Enter website as www.name.domain (e.g. www.example.com).";
    }
    if (!phone) return "Phone number is required.";
    if (!SUPPLIER_PHONE_RE.test(phone)) return "Phone number must be exactly 10 digits.";
    if (alternatePhone && !SUPPLIER_PHONE_RE.test(alternatePhone)) {
      return "Alternate contact number must be exactly 10 digits.";
    }
    if (!regOffice) return "Registered address is required.";
    if (regOffice.length < REGISTERED_ADDRESS_MIN) {
      return `Registered address must be at least ${REGISTERED_ADDRESS_MIN} characters.`;
    }
    if (mailingAddress.length > ADDRESS_FIELD_MAX) {
      return "Mailing address must be at most 250 characters.";
    }
    if (deliveryAddress.length > ADDRESS_FIELD_MAX) {
      return "Delivery address must be at most 250 characters.";
    }
    if (billingAddress.length > ADDRESS_FIELD_MAX) {
      return "Billing address must be at most 250 characters.";
    }
    if (rmSel === "custom" && !rmCustom) {
      return "Enter relationship manager name.";
    }
    if (bankName && !SUPPLIER_BANK_NAME_RE.test(bankName)) {
      return "Bank name must be 2–100 letters only.";
    }
    if (bankAccount && !SUPPLIER_BANK_ACCOUNT_RE.test(bankAccount)) {
      return "Bank account number must be 9–18 digits only.";
    }
    if (ibanSwift && !SUPPLIER_IBAN_SWIFT_RE.test(ibanSwift)) {
      return "IBAN/SWIFT code must be exactly 8 or 11 uppercase letters and numbers.";
    }
    if (categoriesServed.length > PROC_FIELD_MAX.categories_served) {
      return "Categories served must be at most 100 characters.";
    }
    if (productCatalog.length > PROC_FIELD_MAX.product_service_catalog) {
      return "Product catalog must be at most 200 characters.";
    }
    if (minimumOrderQty && !isValidWholeNumber(minimumOrderQty)) {
      return "Minimum order quantity must be a whole number.";
    }
    if (deliveryTime && !isValidDeliveryTimeDays(deliveryTime)) {
      return `Average delivery time must be between 1 and ${DELIVERY_TIME_DAYS_MAX} days.`;
    }
    if (returnPolicy.length > PROC_FIELD_MAX.return_replacement_policy) {
      return "Return policy must be at most 500 characters.";
    }
    if (contractReferences.length > PROC_FIELD_MAX.contract_references) {
      return "Contract references must be at most 100 characters.";
    }
    if (certifications.length > COMPLIANCE_FIELD_MAX.compliance_certifications) {
      return "Certifications must be at most 100 characters.";
    }
    if (!complianceStatus) return "Compliance status is required.";
    if (riskNotes.length > COMPLIANCE_FIELD_MAX.risk_notes_flags) {
      return "Risk notes must be at most 500 characters.";
    }
    if (riskRating && !isValidRiskRating(riskRating)) {
      return "Risk rating must be between 1 and 5 with one decimal place (e.g. 4.8).";
    }
    for (const { key, label } of SUPPLIER_SLOT_CONFIG) {
      const file = slotUploadFiles[key];
      if (!file) continue;
      const issue = validateSupplierDocFile(file);
      if (issue === "type") {
        return `${label}: ${SUPPLIER_UPLOAD_FORMAT_MSG}`;
      }
      if (issue === "size") {
        return `${label} must be 10MB or smaller.`;
      }
    }
    if (onTimeDelivery && !isValidPercent0to100(onTimeDelivery)) {
      return "On-time delivery must be between 0 and 100.";
    }
    if (qualityRating && !isValidQualityRating(qualityRating)) {
      return "Quality rating must be between 1 and 5.";
    }
    if (defectRate && !isValidPercent0to100(defectRate)) {
      return "Defect rate must be between 0 and 100.";
    }
    if (complaints && !isValidPositiveNumber(complaints)) {
      return "Complaints must be a positive number.";
    }
    if (contractBreach && !isValidContractBreach(contractBreach)) {
      return "Contract breach must be Y or N only.";
    }
    if (lastAssessmentDate && !isValidSupplierDateString(lastAssessmentDate)) {
      return SUPPLIER_INVALID_DATE_MSG;
    }
    if (lastEvaluationDate && !isValidSupplierDateString(lastEvaluationDate)) {
      return SUPPLIER_INVALID_DATE_MSG;
    }
    return "";
  }
 
  function setSubmitting(isSubmitting) {
    if (!submitButton) return;
    const idleText = "Save";
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? "Saving..." : idleText;
  }
 
  async function populateSupplierId() {
    const supplierIdField = document.getElementById("supplierCode");
    if (!supplierIdField || supplierIdField.value || editingSupplierId) return;
    try {
      const response = await fetch("/api/suppliers/new-id");
      const result = await response.json().catch(() => ({}));
      if (response.ok && result?.supplierId) {
        supplierIdField.value = result.supplierId;
      }
    } catch (error) {
      // Keep form usable even if id prefetch fails.
    }
  }
 
  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }
 
  function seedCommentsHistoryFromStored(data) {
    comments.length = 0;
    storedCommentsFormatJson = false;
    const raw = data?.comments;
    if (raw == null) return;
    const text = String(raw).trim();
    if (!text) return;
 
    let timeLabel = "Stored";
    const u = data.updated_at;
    const c = data.created_at;
    if (u != null && String(u).trim() !== "") {
      timeLabel = String(u).slice(0, 16).replace("T", " ");
    } else if (c != null && String(c).trim() !== "") {
      timeLabel = String(c).slice(0, 16).replace("T", " ");
    }
 
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        storedCommentsFormatJson = true;
        parsed.forEach((item) => {
          if (item && typeof item === "object" && item.text != null) {
            comments.push({
              text: String(item.text),
              time: item.time != null ? String(item.time) : timeLabel,
              author: item.author != null ? String(item.author) : loggedInUserName
            });
          }
        });
        return;
      }
    } catch (e) {
      // plain text
    }
 
    comments.push({ text, time: timeLabel, author: loggedInUserName });
  }
 
  function fillFormFromData(data) {
    const relationshipManagerValue = (data?.relationship_manager || "").toString().trim();
    if (relationshipManagerSelect && relationshipManagerCustomInput) {
      const knownValues = Array.from(relationshipManagerSelect.options)
        .map((o) => String(o.value || "").trim())
        .filter((v) => v && v !== "custom");
      const lower = relationshipManagerValue.toLowerCase();
      if (!relationshipManagerValue) {
        relationshipManagerSelect.value = "";
      } else if (lower === "no relationship manager") {
        relationshipManagerSelect.value = "No Relationship Manager";
      } else if (knownValues.includes(relationshipManagerValue)) {
        relationshipManagerSelect.value = relationshipManagerValue;
      } else {
        relationshipManagerSelect.value = "custom";
        relationshipManagerCustomInput.value = relationshipManagerValue;
      }
      toggleRelationshipManagerCustomField();
    }
 
    Object.entries(data || {}).forEach(([key, value]) => {
      if (key === "comments") return;
      if (key === "relationship_manager") return;
      const field = supplierForm?.querySelector(`[name="${key}"]`);
      if (!field) return;
      if (field.type === "file") return;
      const stringValue = value == null ? "" : String(value);
 
      // If a <select> doesn't have the saved value as an <option>,
      // add it so the correct value is displayed on edit.
      if (field instanceof HTMLSelectElement) {
        if (stringValue) {
          const hasOption = Array.from(field.options).some((o) => String(o.value) === stringValue);
          if (!hasOption) {
            const opt = document.createElement("option");
            opt.value = stringValue;
            opt.textContent = stringValue;
            field.appendChild(opt);
          }
        }
        field.value = stringValue;
        return;
      }
 
      if (key === "supplier_name") {
        field.value = stringValue.slice(0, SUPPLIER_NAME_MAX);
        return;
      }

      if (key === "company_registration_number") {
        field.value = sanitizeRegistrationNo(stringValue);
        return;
      }

      if (key === "website") {
        field.value = normalizeWebsiteInput(stringValue);
        return;
      }
 
      if (key === "iban_swift_code") {
        field.value = sanitizeIbanSwift(stringValue);
        return;
      }
 
      if (key === "minimum_order_quantity") {
        field.value = sanitizeWholeNumber(stringValue);
        return;
      }
 
      if (key === "average_delivery_time_days") {
        field.value = sanitizeDeliveryTimeDays(stringValue);
        return;
      }
 
      if (key === "categories_served") {
        field.value = stringValue
          .replace(/[^A-Za-z ]/g, "")
          .slice(0, PROC_FIELD_MAX.categories_served);
        return;
      }
 
      if (key === "product_service_catalog") {
        field.value = stringValue
          .replace(/[^A-Za-z ]/g, "")
          .slice(0, PROC_FIELD_MAX.product_service_catalog);
        return;
      }
 
      if (key === "return_replacement_policy") {
        field.value = stringValue
          .replace(/[^A-Za-z0-9 ]/g, "")
          .slice(0, PROC_FIELD_MAX.return_replacement_policy);
        return;
      }
 
      if (key === "contract_references") {
        field.value = stringValue
          .replace(/[^A-Za-z ]/g, "")
          .slice(0, PROC_FIELD_MAX.contract_references);
        return;
      }
 
      if (key === "mailing_address" || key === "warehouse_address" || key === "billing_address") {
        field.value = stringValue.slice(0, ADDRESS_FIELD_MAX);
        return;
      }
 
      if (key === "compliance_certifications") {
        field.value = stringValue
          .replace(/[^A-Za-z0-9 @_\-]/g, "")
          .slice(0, COMPLIANCE_FIELD_MAX.compliance_certifications);
        return;
      }
 
      if (key === "risk_notes_flags") {
        field.value = stringValue
          .replace(/[^A-Za-z ]/g, "")
          .slice(0, COMPLIANCE_FIELD_MAX.risk_notes_flags);
        return;
      }
 
      if (key === "risk_ratings" || key === "quality_ratings") {
        field.value = sanitizeRiskRating(stringValue);
        return;
      }
 
      if (key === "on_time_delivery_rate") {
        field.value = formatOnTimeDeliveryRate(stringValue) || sanitizeOnTimeDeliveryRate(stringValue);
        return;
      }

      if (key === "defect_return_rate") {
        field.value = formatDefectReturnRate(stringValue) || sanitizeDefectReturnRate(stringValue);
        return;
      }
 
      if (key === "contract_breaches") {
        field.value = sanitizeContractBreach(stringValue);
        return;
      }
 
      if (key === "complaints_registered") {
        field.value = sanitizePositiveNumber(stringValue);
        return;
      }

      if (key === "improvement_plans") {
        field.value = stringValue.replace(/[^A-Za-z ]/g, "");
        return;
      }

      if (key === "visit_history_meeting_notes") {
        field.value = stringValue.replace(/[^A-Za-z ]/g, "");
        return;
      }

      if (key === "last_risk_assessment_date" || key === "last_evaluation_date") {
        field.value = formatApiDateToDdMmYyyy(stringValue);
        return;
      }
 
      field.value = stringValue;
    });
  }
 
  async function loadSupplierForEdit() {
    if (!editingSupplierId || !supplierForm) return;
    try {
      const response = await fetch(`/api/suppliers/${encodeURIComponent(editingSupplierId)}`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success || !result?.data) {
        showToast(result?.message || "Failed to load supplier.", "error");
        return;
      }
      fillFormFromData(result.data);
      originalGstin = sanitizeGstin(gstinInput?.value || "");
      seedCommentsHistoryFromStored(result.data);
      renderComments();
      if (addCommentBtn && commentText) {
        addCommentBtn.disabled = commentText.value.trim().length === 0;
      }
      const supplierIdField = document.getElementById("supplierCode");
      if (supplierIdField) supplierIdField.readOnly = true;
      if (submitButton) submitButton.textContent = "Update";
      const title = document.querySelector(".page-title");
      if (title) title.textContent = "Edit Supplier";
      await loadSupplierAttachments();
      hydrateSlotUploadsFromServer();
    } catch (error) {
      showToast("Network error while loading supplier.", "error");
    }
  }

  function hydrateSlotUploadsFromServer() {
    SUPPLIER_SLOT_CONFIG.forEach(({ key, listId }) => {
      const listEl = document.getElementById(listId);
      if (!listEl) return;
      const att = serverAttachments.find((a) => (a.category || "") === key);
      if (!att) {
        listEl.innerHTML = "";
        return;
      }
      listEl.innerHTML = buildSupAttRowHtml({
        name: att.file_name,
        sizeLabel: "—",
        dateLabel: att.uploaded_at || "—",
        serverId: String(att.id),
        slotKey: key
      });
    });
  }

  function getSupplierIdForUploads() {
    const field = document.getElementById("supplierCode");
    return (field?.value || editingSupplierId || "").toString().trim().toUpperCase();
  }
 
  function totalAttachmentCount() {
    const tabCount = serverAttachments.filter(
      (a) => !a.category || a.category === "attachments"
    ).length;
    return tabCount + pendingFiles.length;
  }
 
  function renderFiles() {
    if (!filesList) return;
    filesList.innerHTML = "";
    const total = totalAttachmentCount();
    const isFull = total >= MAX_ATTACHMENTS;
    if (fileCount) {
      fileCount.textContent = `${total} / ${MAX_ATTACHMENTS} files`;
    }
    if (uploadCard) {
      uploadCard.style.opacity = isFull ? "0.5" : "1";
      uploadCard.style.pointerEvents = isFull ? "none" : "auto";
      uploadCard.setAttribute("title", isFull ? "Maximum files reached" : "Click or drag to upload");
    }
    if (uploadBtn) {
      uploadBtn.disabled = isFull;
      uploadBtn.style.opacity = isFull ? "0.5" : "1";
      uploadBtn.setAttribute("title", isFull ? "Maximum files reached" : "Upload file");
    }
    const tabAttachments = serverAttachments.filter(
      (att) => !att.category || att.category === "attachments"
    );

    if (!total) {
      filesList.innerHTML =
        '<div class="no-files"><i class="fa-regular fa-folder-open"></i><p>No files attached yet</p></div>';
      updateAttachmentBadge(0);
      return;
    }

    tabAttachments.forEach((att) => {
      const wrap = document.createElement("div");
      wrap.innerHTML = buildFileItemHtml({
        name: att.file_name,
        sizeLabel: "—",
        dateLabel: formatAttachmentUploadDate(att.uploaded_at),
        serverId: String(att.id)
      });
      filesList.appendChild(wrap.firstElementChild);
    });

    pendingFiles.forEach((file, index) => {
      const wrap = document.createElement("div");
      wrap.innerHTML = buildFileItemHtml({
        name: file.name,
        sizeLabel: formatAttachmentFileSize(file.size),
        dateLabel: new Date(file.lastModified || Date.now()).toLocaleString(),
        pendingIndex: index
      });
      filesList.appendChild(wrap.firstElementChild);
    });

    updateAttachmentBadge(tabAttachments.length);
  }
 
  async function loadSupplierAttachments() {
    const supplierId = getSupplierIdForUploads();
    if (!supplierId) {
      serverAttachments.length = 0;
      renderFiles();
      return;
    }
    if (filesList) {
      filesList.innerHTML =
        '<div class="loading-files"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading attachments...</p></div>';
    }
    try {
      const response = await fetch(`/api/supplier-attachments/${encodeURIComponent(supplierId)}`);
      const result = await response.json().catch(() => ({}));
      serverAttachments.length = 0;
      if (response.ok && result?.success && Array.isArray(result.attachments)) {
        result.attachments.forEach((a) => serverAttachments.push(a));
      }
    } catch (error) {
      console.error("loadSupplierAttachments:", error);
    }
    renderFiles();
  }
 
  async function uploadSupplierFile(file, category = "") {
    const supplierId = getSupplierIdForUploads();
    if (!supplierId) {
      showToast("Supplier ID is required before uploading files.", "error");
      return false;
    }
    const showTabUpload = isTabAttachmentUpload(category);
    if (showTabUpload) showUploading(file.name);
    const formData = new FormData();
    formData.append("supplier_id", supplierId);
    formData.append("file", file);
    if (category) formData.append("category", category);
    try {
      const response = await fetch("/api/supplier-attachments", {
        method: "POST",
        body: formData,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        if (response.status === 404) {
          pendingFiles.push(file);
          renderFiles();
          return true;
        }
        showToast(result?.message || result?.error || "Upload failed.", "error");
        return false;
      }
      if (showTabUpload) {
        showToast(`${file.name} uploaded successfully!`, "success");
      }
      if (!category) {
        await loadSupplierAttachments();
      }
      return true;
    } catch (error) {
      showToast("Network error while uploading file.", "error");
      return false;
    } finally {
      if (showTabUpload) removeUploading();
    }
  }
 
  async function uploadPendingFiles() {
    if (!pendingFiles.length) return;
    const queue = pendingFiles.splice(0, pendingFiles.length);
    const failed = [];
    for (const file of queue) {
      const ok = await uploadSupplierFile(file);
      if (!ok) failed.push(file);
    }
    if (failed.length) pendingFiles.push(...failed);
    await loadSupplierAttachments();
  }
 
  async function handleIncomingFiles(candidateFiles) {
    const accepted = validateIncomingFiles(candidateFiles);
    if (!accepted.length) return;
 
    const supplierId = getSupplierIdForUploads();
    if (!supplierId) {
      accepted.forEach((file) => pendingFiles.push(file));
      renderFiles();
      return;
    }
 
    for (const file of accepted) {
      const ok = await uploadSupplierFile(file, "attachments");
      if (!ok) break;
    }
    await loadSupplierAttachments();
  }
 
  function validateIncomingFiles(candidateFiles) {
    const accepted = [];
 
    candidateFiles.forEach((file) => {
      const extension = (file.name.split(".").pop() || "").toLowerCase();
      if (!SUPPLIER_UPLOAD_EXTENSIONS.has(extension)) {
        showToast(`Invalid file format. ${SUPPLIER_UPLOAD_FORMAT_MSG}`, "error");
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        showToast(`File too large (max 10MB): ${file.name}`, "error");
        return;
      }
      accepted.push(file);
    });
 
    const remainingSlots = MAX_ATTACHMENTS - totalAttachmentCount();
    if (remainingSlots <= 0) {
      showToast(`You can upload up to ${MAX_ATTACHMENTS} files only.`, "error");
      return [];
    }
 
    if (accepted.length > remainingSlots) {
      showToast(`Only ${remainingSlots} more file(s) can be added.`, "error");
    }
    return accepted.slice(0, Math.max(remainingSlots, 0));
  }
 
  function renderComments() {
    if (!historyContainer) return;
    historyContainer.innerHTML = "";
    if (!comments.length) {
      historyContainer.innerHTML = '<div class="no-history-message">No history available.</div>';
      return;
    }

    comments
      .slice()
      .reverse()
      .forEach((item) => {
        const row = document.createElement("div");
        row.className = "history-item";
        const author = (item.author || loggedInUserName || "User").toString();
        row.innerHTML =
          `<span class="user">${escapeHtml(author)}</span>` +
          `<span class="time"> – ${escapeHtml(item.time)}</span>` +
          `<p>${escapeHtml(item.text)}</p>`;
        historyContainer.appendChild(row);
      });
  }
 
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      tabContents.forEach((content) => {
        content.style.display = "none";
      });
      const target = document.getElementById(tab.dataset.tab);
      if (target) target.style.display = "block";
      if (tab.dataset.tab === "attachments" && getSupplierIdForUploads()) {
        void loadSupplierAttachments();
      }
    });
  });
 
  uploadBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    fileInput?.click();
  });
  uploadCard?.addEventListener("click", () => fileInput?.click());
  uploadCard?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput?.click();
    }
  });
  uploadCard?.addEventListener("dragover", (event) => {
    event.preventDefault();
    uploadCard.style.borderColor = "#a12828";
    uploadCard.style.background = "#f0f7ff";
  });
  uploadCard?.addEventListener("dragleave", () => {
    uploadCard.style.borderColor = "#ddd";
    uploadCard.style.background = "#f8f9fa";
  });
  uploadCard?.addEventListener("drop", (event) => {
    event.preventDefault();
    uploadCard.style.borderColor = "#ddd";
    uploadCard.style.background = "#f8f9fa";
    const droppedFiles = Array.from(event.dataTransfer?.files || []);
    void handleIncomingFiles(droppedFiles);
  });
  fileInput?.addEventListener("change", (event) => {
    const selectedFiles = Array.from(event.target?.files || []);
    void handleIncomingFiles(selectedFiles);
    fileInput.value = "";
  });
  filesList?.addEventListener("click", async (event) => {
    const btn = event.target instanceof HTMLElement ? event.target.closest(".btn-action") : null;
    if (!btn) return;
    const row = btn.closest(".file-item");
    if (!row || !filesList.contains(row)) return;

    const serverId = row.dataset.serverId;
    const pendingIndex = row.dataset.pendingIndex;
    const supplierId = getSupplierIdForUploads();

    if (btn.classList.contains("btn-view")) {
      if (serverId) {
        viewSupplierAttachmentFile({ serverId });
      } else if (pendingIndex !== "") {
        const file = pendingFiles[Number(pendingIndex)];
        if (file) viewSupplierAttachmentFile({ pendingFile: file });
      }
      return;
    }
 
    if (btn.classList.contains("btn-download")) {
      if (serverId) {
        downloadSupplierAttachmentFile({ serverId });
      } else if (pendingIndex !== "") {
        const file = pendingFiles[Number(pendingIndex)];
        if (file) downloadSupplierAttachmentFile({ pendingFile: file });
      }
      return;
    }

    if (!btn.classList.contains("btn-delete")) return;
 
    if (serverId) {
      if (!supplierId) return;
      try {
        const response = await fetch(
          `/api/supplier-attachments/${encodeURIComponent(supplierId)}/${encodeURIComponent(serverId)}`,
          { method: "DELETE" }
        );
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) {
          showToast(result?.message || "Failed to remove file.", "error");
          return;
        }
        await loadSupplierAttachments();
        showToast("File removed.", "success");
      } catch (error) {
        showToast("Network error while removing file.", "error");
      }
      return;
    }
 
    const idx = Number(pendingIndex);
    if (!Number.isNaN(idx)) {
      pendingFiles.splice(idx, 1);
      renderFiles();
    }
  });
 
  commentText?.addEventListener("input", () => {
    if (!addCommentBtn) return;
    addCommentBtn.disabled = commentText.value.trim().length === 0;
  });
 
  setupSupplierNameValidation();
  setupGstinValidation();
  setupCompanyRegistrationValidation();
  setupIbanSwiftValidation();
  setupProcurementFieldValidations();
  setupAddressFieldValidations();
  setupComplianceFieldValidations();
  setupSupplierDocumentUploads();
  if (fileInput) {
    fileInput.setAttribute("accept", SUPPLIER_UPLOAD_ACCEPT);
    fileInput.setAttribute("title", SUPPLIER_UPLOAD_FORMAT_MSG);
  }
  setupPerformanceFieldValidations();
  keepLettersOnly(contactFirstNameInput, { validateFn: validateContactFirstNameLive });
  keepLettersOnly(contactLastNameInput, { validateFn: validateContactLastNameLive });
  keepLettersOnly(bankNameInput, {
    maxLen: 100,
    pattern: "[A-Za-z]{2,100}",
    validateFn: validateBankNameLive
  });
  keepDigitsOnly(supplierPhoneInput, {
    validateFn: () => validatePhoneLive(supplierPhoneInput, true)
  });
  keepDigitsOnly(alternateContactInput, {
    validateFn: () => validatePhoneLive(alternateContactInput, false)
  });
  keepDigitsOnly(bankAccountNoInput, {
    maxLen: 18,
    pattern: "[0-9]{9,18}",
    validateFn: validateBankAccountLive
  });
  setupEmailValidation();
  setupWebsiteValidation();
  setupSupplierFormTabNavigation();
  setupSupplierTextFieldRestrictions();
  relationshipManagerSelect?.addEventListener("change", toggleRelationshipManagerCustomField);
  addCommentBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    if (!commentText) return;
    const text = commentText.value.trim();
    if (!text) return;
    comments.push({ text, time: new Date().toLocaleString(), author: loggedInUserName });
    commentText.value = "";
    addCommentBtn.disabled = true;
    renderComments();
    showToast("Comment added.", "success");
  });
 
  discardButton?.addEventListener("click", () => {
    if (!supplierForm) return;
    supplierForm.reset();
    pendingFiles.length = 0;
    serverAttachments.length = 0;
    comments.length = 0;
    renderFiles();
    renderComments();
    if (addCommentBtn) addCommentBtn.disabled = true;
    // Discard means cancel this form session and leave without saving.
    window.location.href = "/suppliers";
  });
 
  deleteSupplierBtn?.addEventListener("click", async () => {
    if (!editingSupplierId) return;
    const confirmed = confirm("Are you sure you want to delete this supplier?");
    if (!confirmed) return;
    try {
      deleteSupplierBtn.disabled = true;
      const response = await fetch(`/api/suppliers/${encodeURIComponent(editingSupplierId)}`, {
        method: "DELETE"
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        showToast(result?.message || "Failed to delete supplier.", "error");
        return;
      }
      showToast("Supplier deleted successfully.", "success");
      setTimeout(() => {
        window.location.href = "/suppliers";
      }, 400);
    } catch (error) {
      showToast("Network error while deleting supplier.", "error");
    } finally {
      deleteSupplierBtn.disabled = false;
    }
  });
 
  supplierForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(supplierForm);
    const formError = validateSupplierForm(formData);
    validateSupplierNameLive();
    validateContactFirstNameLive();
    validateContactLastNameLive();
    checkGstinDuplicate();
    validateGstinLive();
    validateCompanyRegistrationLive();
    validateEmailLive();
    validateWebsiteLive();
    validatePhoneLive(supplierPhoneInput, true);
    validatePhoneLive(alternateContactInput, false);
    validateBankNameLive();
    validateBankAccountLive();
    validateIbanSwiftLive();
    validateAllProcurementFieldsLive();
    validateAllAddressFieldsLive();
    validateAllComplianceFieldsLive();
    validateAllPerformanceFieldsLive();
    if (formError || gstinDuplicate || !validateGstinLive()) {
      if (gstinDuplicate) {
        showToast(GSTIN_DUPLICATE_TOAST, "error");
      } else if (formError === SUPPLIER_INVALID_DATE_MSG) {
        if (
          lastAssessmentDateInput?.value &&
          !isValidSupplierDateString(lastAssessmentDateInput.value)
        ) {
          lastAssessmentDateInput.value = "";
          setFieldError(lastAssessmentDateInput, SUPPLIER_INVALID_DATE_MSG);
        }
        if (
          lastEvaluationDateInput?.value &&
          !isValidSupplierDateString(lastEvaluationDateInput.value)
        ) {
          lastEvaluationDateInput.value = "";
          setFieldError(lastEvaluationDateInput, SUPPLIER_INVALID_DATE_MSG);
        }
        showToast(SUPPLIER_INVALID_DATE_MSG, "error");
      } else if (formError?.toLowerCase().includes("required")) {
        showToast("Please fill all mandatory fields.", "error");
      } else {
        showToast(formError || "Please correct the highlighted fields.", "error");
      }
      return;
    }
    const payload = buildPayload(formData);
    const formComment = (formData.get("comments") || "").toString().trim();
    let useJsonCommentHistory = false;
    if (comments.length >= 2) {
      useJsonCommentHistory = true;
    } else if (comments.length === 1) {
      if (storedCommentsFormatJson) useJsonCommentHistory = true;
      else if (!editingSupplierId) useJsonCommentHistory = true;
      else if (formComment === "") useJsonCommentHistory = true;
    }
    if (useJsonCommentHistory && comments.length > 0) {
      payload.comments = JSON.stringify(
        comments.map((x) => ({ text: x.text, time: x.time, author: x.author || loggedInUserName }))
      );
    }
    if (payload.supplier_id) payload.supplier_id = payload.supplier_id.toUpperCase();
 
    try {
      setSubmitting(true);
      const endpoint = editingSupplierId
        ? `/api/suppliers/${encodeURIComponent(editingSupplierId)}`
        : "/api/suppliers";
      const method = editingSupplierId ? "PUT" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
 
      if (!response.ok || !result.success) {
        const serverMessage =
          result?.error || result?.message || "Failed to save supplier.";
        if (response.status === 409 && /duplicate tax identification/i.test(serverMessage)) {
          gstinDuplicate = true;
          setFieldError(gstinInput, GSTIN_DUPLICATE_TOAST);
          showToast(GSTIN_DUPLICATE_TOAST, "error");
          return;
        }
        showToast(serverMessage, "error");
        return;
      }

      showToast(editingSupplierId ? "Supplier updated successfully." : "Supplier saved successfully.", "success");
      try {
        await uploadPendingFiles();
        await uploadSlotFiles();
      } catch (uploadErr) {
        console.error("Supplier attachment upload after save:", uploadErr);
      }
      setTimeout(() => {
        window.location.href = "/suppliers";
      }, 600);
    } catch (error) {
      showToast("Network error while saving supplier.", "error");
    } finally {
      setSubmitting(false);
    }
  });
 
  if (addCommentBtn) addCommentBtn.disabled = true;
  if (discardButton) discardButton.disabled = !!editingSupplierId;
  toggleRelationshipManagerCustomField();
  loadSupplierForEdit();
  populateSupplierId();
  renderFiles();
  renderComments();
});
 
 