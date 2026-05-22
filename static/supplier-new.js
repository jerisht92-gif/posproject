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
  const lastAssessmentDateWrap = supplierForm?.querySelector(
    '[data-date-field="last_risk_assessment_date"]'
  );
  const lastAssessmentDateInput = lastAssessmentDateWrap?.querySelector(
    'input[name="last_risk_assessment_date"]'
  );
  const lastAssessmentDatePicker = lastAssessmentDateWrap?.querySelector("input.supplier-date-native");
  const lastAssessmentDateBtn = lastAssessmentDateWrap?.querySelector(".supplier-date-open");
  const lastEvaluationDateWrap = supplierForm?.querySelector('[data-date-field="last_evaluation_date"]');
  const lastEvaluationDateInput = lastEvaluationDateWrap?.querySelector(
    'input[name="last_evaluation_date"]'
  );
  const lastEvaluationDatePicker = lastEvaluationDateWrap?.querySelector("input.supplier-date-native");
  const lastEvaluationDateBtn = lastEvaluationDateWrap?.querySelector(".supplier-date-open");
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
  const latestCommentPreview = document.getElementById("latestCommentPreview");
  const latestCommentMeta = document.getElementById("latestCommentMeta");
  const latestCommentText = document.getElementById("latestCommentText");
  const historyList = document.getElementById("historyList");
  const uploadCard = document.getElementById("uploadCard");
  const uploadBtn = document.getElementById("uploadBtn");
  const fileInput = document.getElementById("fileInput");
  const filesList = document.getElementById("filesList");
  const fileCount = document.getElementById("fileCount");
  const gstinInput = document.getElementById("gstin");
  const companyRegistrationInput = document.getElementById("companyRegistrationNumber");
  const contactFirstNameInput = document.getElementById("contactFirstName");
  const contactLastNameInput = document.getElementById("contactLastName");
  const supplierPhoneInput = document.getElementById("supplierPhone");
  const supplierEmailInput = document.getElementById("supplierEmail");
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
  /** Files picked in UI but not yet uploaded (waiting for supplier_id). */
  const pendingFiles = [];
  /** Attachments already saved on server for this supplier. */
  const serverAttachments = [];
  const MAX_ATTACHMENTS = 10;
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
  const ALLOWED_FILE_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png"]);
 
  const SUPPLIER_EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const SUPPLIER_PHONE_RE = /^[0-9]{10}$/;
  const SUPPLIER_CONTACT_RE = /^[A-Za-z]{2,80}$/;
  const SUPPLIER_BANK_NAME_RE = /^[A-Za-z]{2,100}$/;
  const SUPPLIER_BANK_ACCOUNT_RE = /^[0-9]{9,18}$/;
  const SUPPLIER_NAME_RE = /^[A-Za-z0-9 .,&()'/-]{3,100}$/;
  const SUPPLIER_REG_NO_RE = /^[A-Z0-9]{8,25}$/;
  const SUPPLIER_IBAN_SWIFT_RE = /^(?:[A-Z0-9]{8}|[A-Z0-9]{11})$/;
  const SUPPLIER_POSITIVE_NUMBER_RE = /^(?:0\.\d*[1-9]\d*|[1-9]\d*(?:\.\d+)?)$/;
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
  const SUPPLIER_DOC_UPLOAD_EXT = new Set(["pdf", "jpg", "jpeg", "png"]);
  const SUPPLIER_DOC_ACCEPT =
    ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
  const SUPPLIER_DOC_FILE_RULE_MSG = "must be PDF, JPG, or PNG only (max 10MB)";
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
      supplier_name: (formData.get("supplier_name") || "").toString().trim(),
      gstin: (formData.get("gstin") || "")
        .toString()
        .replace(/[^a-z0-9]/gi, "")
        .toUpperCase()
        .trim(),
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
      product_detail: (formData.get("product_detail") || "").toString().trim(),
      contact_first_name: (formData.get("contact_first_name") || "").toString().trim(),
      contact_last_name: (formData.get("contact_last_name") || "").toString().trim(),
      designation_role: (formData.get("designation_role") || "").toString().trim(),
      alternate_contact_no: (formData.get("alternate_contact_no") || "")
        .toString()
        .replace(/\D/g, "")
        .trim(),
      email: (formData.get("email") || "").toString().trim(),
      phone_number: (formData.get("phone_number") || "")
        .toString()
        .replace(/\D/g, "")
        .trim(),
      website: (formData.get("website") || "").toString().trim(),
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
      tax_withholding_setup: (formData.get("tax_withholding_setup") || "").toString().trim(),
      currency: (formData.get("currency") || "").toString().trim(),
      categories_served: (formData.get("categories_served") || "")
        .toString()
        .trim()
        .slice(0, PROC_FIELD_MAX.categories_served),
      inco_terms: (formData.get("inco_terms") || "").toString().trim(),
      product_service_catalog: (formData.get("product_service_catalog") || "")
        .toString()
        .trim()
        .slice(0, PROC_FIELD_MAX.product_service_catalog),
      freight_terms: (formData.get("freight_terms") || "").toString().trim(),
      minimum_order_quantity: sanitizePositiveNumber(
        (formData.get("minimum_order_quantity") || "").toString()
      ),
      return_replacement_policy: (formData.get("return_replacement_policy") || "")
        .toString()
        .trim()
        .slice(0, PROC_FIELD_MAX.return_replacement_policy),
      average_delivery_time_days: sanitizeNumericOnly(
        (formData.get("average_delivery_time_days") || "").toString()
      ),
      contract_references: (formData.get("contract_references") || "")
        .toString()
        .trim()
        .slice(0, PROC_FIELD_MAX.contract_references),
      compliance_certifications: (formData.get("compliance_certifications") || "")
        .toString()
        .trim()
        .slice(0, COMPLIANCE_FIELD_MAX.compliance_certifications),
      risk_notes_flags: (formData.get("risk_notes_flags") || "")
        .toString()
        .trim()
        .slice(0, COMPLIANCE_FIELD_MAX.risk_notes_flags),
      compliance_status: (formData.get("compliance_status") || "").toString().trim(),
      last_risk_assessment_date: (formData.get("last_risk_assessment_date") || "").toString().trim(),
      risk_ratings: (formData.get("risk_ratings") || "").toString().trim(),
      on_time_delivery_rate: sanitizePercent0to100(
        (formData.get("on_time_delivery_rate") || "").toString()
      ),
      quality_ratings: sanitizeRiskRating((formData.get("quality_ratings") || "").toString()),
      defect_return_rate: sanitizePercent0to100(
        (formData.get("defect_return_rate") || "").toString()
      ),
      last_evaluation_date: (formData.get("last_evaluation_date") || "").toString().trim(),
      contract_breaches: sanitizeContractBreach(
        (formData.get("contract_breaches") || "").toString()
      ),
      improvement_plans: (formData.get("improvement_plans") || "").toString().trim(),
      complaints_registered: sanitizePositiveNumber(
        (formData.get("complaints_registered") || "").toString()
      ),
      external_key_contact: (formData.get("external_key_contact") || "").toString().trim(),
      visit_history_meeting_notes: (formData.get("visit_history_meeting_notes") || "").toString().trim(),
      comments: (formData.get("comments") || "").toString().trim()
    };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") delete payload[key];
    });
    return payload;
  }
 
  function toggleRelationshipManagerCustomField() {
    if (!relationshipManagerSelect || !relationshipManagerCustomInput || !relationshipManagerWrap) return;
    const isCustom = relationshipManagerSelect.value === "custom";
    relationshipManagerWrap.classList.toggle("is-custom", isCustom);
    relationshipManagerCustomInput.disabled = !isCustom;
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
 
  function isValidEmail(value) {
    return SUPPLIER_EMAIL_RE.test((value || "").trim());
  }
 
  function validateEmailLive() {
    const v = (supplierEmailInput?.value || "").trim();
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
    supplierEmailInput.setAttribute("type", "email");
    supplierEmailInput.setAttribute("autocomplete", "email");
    supplierEmailInput.setAttribute(
      "pattern",
      "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}"
    );
    supplierEmailInput.setAttribute("title", "Enter a valid email address (e.g. name@example.com)");
    supplierEmailInput.addEventListener("input", () => {
      const raw = supplierEmailInput.value || "";
      if (raw !== raw.trimStart()) supplierEmailInput.value = raw.trimStart();
      validateEmailLive();
    });
    supplierEmailInput.addEventListener("blur", () => {
      supplierEmailInput.value = (supplierEmailInput.value || "").trim();
      validateEmailLive();
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
    const cleaned = sanitizePositiveNumber(minimumOrderQtyInput.value);
    if (minimumOrderQtyInput.value !== cleaned) minimumOrderQtyInput.value = cleaned;
    if (!cleaned) {
      setFieldError(minimumOrderQtyInput, "");
      return true;
    }
    if (!isValidPositiveNumber(cleaned)) {
      setFieldError(minimumOrderQtyInput, "Minimum order quantity must be a positive number.");
      return false;
    }
    setFieldError(minimumOrderQtyInput, "");
    return true;
  }
 
  function validateDeliveryTimeLive() {
    if (!deliveryTimeInput) return true;
    const cleaned = sanitizeNumericOnly(deliveryTimeInput.value);
    if (deliveryTimeInput.value !== cleaned) deliveryTimeInput.value = cleaned;
    if (!cleaned) {
      setFieldError(deliveryTimeInput, "");
      return true;
    }
    if (!isValidNumericOnly(cleaned)) {
      setFieldError(deliveryTimeInput, "Delivery time must be numeric only.");
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
    setupPositiveNumberField(minimumOrderQtyInput, validateMinimumOrderQtyLive);
    setupNumericOnlyField(deliveryTimeInput, validateDeliveryTimeLive);
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
 
  function sanitizeRiskRating(value) {
    let v = (value || "").replace(/[^\d.]/g, "");
    const dot = v.indexOf(".");
    if (dot !== -1) {
      v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "");
    }
    return v.trim();
  }
 
  function isValidRiskRating(value) {
    const v = sanitizeRiskRating(value);
    if (!v) return true;
    const n = Number(v);
    return Number.isFinite(n) && n >= RISK_RATING_MIN && n <= RISK_RATING_MAX;
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
 
  function openSupplierDatePicker(pickerEl) {
    if (!pickerEl) return;
    if (typeof pickerEl.showPicker === "function") {
      try {
        pickerEl.showPicker();
        return;
      } catch (_err) {
        /* fall through to click */
      }
    }
    pickerEl.focus({ preventScroll: true });
    try {
      pickerEl.click();
    } catch (_err) {
      /* noop */
    }
  }
 
  /** Date text fields: store typed value as-is; calendar only fills text when a date is picked. */
  function setupSupplierDateField(textEl, pickerEl, openBtn) {
    if (!textEl) return;
    textEl.setAttribute("placeholder", "dd-mm-yyyy");
    textEl.setAttribute("title", "dd-mm-yyyy");
    const syncPickerFromText = () => {
      if (!pickerEl) return;
      pickerEl.value = supplierDateDisplayToIso(textEl.value) || "";
    };
    const syncTextFromPicker = () => {
      if (!pickerEl || !pickerEl.value) return;
      const display = formatApiDateToDdMmYyyy(pickerEl.value);
      if (display) textEl.value = display;
    };
    pickerEl?.addEventListener("change", syncTextFromPicker);
    pickerEl?.addEventListener("input", syncTextFromPicker);
    const openCalendar = (e) => {
      e.preventDefault();
      e.stopPropagation();
      syncPickerFromText();
      openSupplierDatePicker(pickerEl);
    };
    if (openBtn) {
      openBtn.style.pointerEvents = "auto";
      openBtn.addEventListener("mousedown", openCalendar);
      openBtn.addEventListener("click", openCalendar);
    }
  }
 
  function validateSupplierDocFile(file) {
    if (!file) return "";
    const name = (file.name || "").trim();
    const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
    if (!SUPPLIER_DOC_UPLOAD_EXT.has(ext)) {
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
      if (inputEl) setFieldError(inputEl, `${label} ${SUPPLIER_DOC_FILE_RULE_MSG}.`);
      slotUploadFiles[slotKey] = null;
      if (inputEl) inputEl.value = "";
      renderSlotUploadList(slotKey);
      return false;
    }
    if (issue === "size") {
      if (inputEl) setFieldError(inputEl, `${label} must be 10MB or smaller.`);
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
      inputEl.setAttribute("accept", SUPPLIER_DOC_ACCEPT);
      inputEl.setAttribute("title", SUPPLIER_DOC_FILE_RULE_MSG);
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
      setFieldError(riskRatingInput, "Risk rating must be a decimal between 1 and 5.");
      return false;
    }
    setFieldError(riskRatingInput, "");
    return true;
  }
 
  let validateCertificationsLive = () => true;
  let validateRiskNotesLive = () => true;
 
  function setupComplianceFieldValidations() {
    setupSupplierDateField(
      lastAssessmentDateInput,
      lastAssessmentDatePicker,
      lastAssessmentDateBtn
    );
 
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
 
  function sanitizePercent0to100(value) {
    let v = (value || "").replace(/[^0-9.]/g, "");
    const dot = v.indexOf(".");
    if (dot !== -1) {
      v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "");
    }
    return v.trim();
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
    const cleaned = sanitizePercent0to100(onTimeDeliveryInput.value);
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
    const cleaned = sanitizePercent0to100(defectRateInput.value);
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
 
  function setupPercent0to100Field(inputEl, validateFn) {
    if (!inputEl) return;
    inputEl.setAttribute("inputmode", "decimal");
    inputEl.addEventListener("input", () => {
      const cleaned = sanitizePercent0to100(inputEl.value);
      if (inputEl.value !== cleaned) inputEl.value = cleaned;
      validateFn();
    });
    inputEl.addEventListener("blur", validateFn);
  }
 
  function setupPerformanceFieldValidations() {
    setupSupplierDateField(
      lastEvaluationDateInput,
      lastEvaluationDatePicker,
      lastEvaluationDateBtn
    );
    setupPercent0to100Field(onTimeDeliveryInput, validateOnTimeDeliveryLive);
    setupPercent0to100Field(defectRateInput, validateDefectRateLive);
 
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
    const email = trimField(formData, "email");
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
    const minimumOrderQty = sanitizePositiveNumber(trimField(formData, "minimum_order_quantity"));
    const deliveryTime = sanitizeNumericOnly(trimField(formData, "average_delivery_time_days"));
    const returnPolicy = trimField(formData, "return_replacement_policy");
    const contractReferences = trimField(formData, "contract_references");
    const certifications = trimField(formData, "compliance_certifications");
    const riskNotes = trimField(formData, "risk_notes_flags");
    const complianceStatus = trimField(formData, "compliance_status");
    const riskRating = sanitizeRiskRating(trimField(formData, "risk_ratings"));
    const onTimeDelivery = sanitizePercent0to100(trimField(formData, "on_time_delivery_rate"));
    const qualityRating = sanitizeRiskRating(trimField(formData, "quality_ratings"));
    const defectRate = sanitizePercent0to100(trimField(formData, "defect_return_rate"));
    const contractBreach = sanitizeContractBreach(trimField(formData, "contract_breaches"));
    const complaints = sanitizePositiveNumber(trimField(formData, "complaints_registered"));
 
    if (!supplierId) {
      return "Supplier ID is required. Wait for it to generate, then try again.";
    }
    if (!SUPPLIER_ID_RE.test(supplierId.toUpperCase())) {
      return "Supplier ID must be in SUP-001 format.";
    }
    if (!gstin) return "GSTIN is required.";
    if (!supplierName) return "Supplier name is required.";
    if (!SUPPLIER_NAME_RE.test(supplierName)) {
      return "Supplier name must be 3–100 characters and use allowed characters only.";
    }
    if (!companyReg) return "Company registration number is required.";
    if (!SUPPLIER_REG_NO_RE.test(companyReg)) {
      return "Company registration number must be 8–25 letters and numbers only.";
    }
    if (!legalEntity) return "Legal entity name is required.";
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
    if (minimumOrderQty && !isValidPositiveNumber(minimumOrderQty)) {
      return "Minimum order quantity must be a positive number.";
    }
    if (deliveryTime && !isValidNumericOnly(deliveryTime)) {
      return "Average delivery time must be numeric only.";
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
      return "Risk rating must be a decimal between 1 and 5.";
    }
    for (const { key, label } of SUPPLIER_SLOT_CONFIG) {
      const file = slotUploadFiles[key];
      if (!file) continue;
      const issue = validateSupplierDocFile(file);
      if (issue === "type") {
        return `${label} ${SUPPLIER_DOC_FILE_RULE_MSG}.`;
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
    return "";
  }
 
  function setSubmitting(isSubmitting) {
    if (!submitButton) return;
    const idleText = editingSupplierId ? "Update" : "Submit";
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
 
      if (key === "company_registration_number") {
        field.value = sanitizeRegistrationNo(stringValue);
        return;
      }
 
      if (key === "iban_swift_code") {
        field.value = sanitizeIbanSwift(stringValue);
        return;
      }
 
      if (key === "minimum_order_quantity") {
        field.value = sanitizePositiveNumber(stringValue);
        return;
      }
 
      if (key === "average_delivery_time_days") {
        field.value = sanitizeNumericOnly(stringValue);
        return;
      }
 
      if (key === "categories_served") {
        field.value = stringValue.slice(0, PROC_FIELD_MAX.categories_served);
        return;
      }
 
      if (key === "product_service_catalog") {
        field.value = stringValue.slice(0, PROC_FIELD_MAX.product_service_catalog);
        return;
      }
 
      if (key === "return_replacement_policy") {
        field.value = stringValue.slice(0, PROC_FIELD_MAX.return_replacement_policy);
        return;
      }
 
      if (key === "contract_references") {
        field.value = stringValue.slice(0, PROC_FIELD_MAX.contract_references);
        return;
      }
 
      if (key === "mailing_address" || key === "warehouse_address" || key === "billing_address") {
        field.value = stringValue.slice(0, ADDRESS_FIELD_MAX);
        return;
      }
 
      if (key === "compliance_certifications") {
        field.value = stringValue.slice(0, COMPLIANCE_FIELD_MAX.compliance_certifications);
        return;
      }
 
      if (key === "risk_notes_flags") {
        field.value = stringValue.slice(0, COMPLIANCE_FIELD_MAX.risk_notes_flags);
        return;
      }
 
      if (key === "risk_ratings" || key === "quality_ratings") {
        field.value = sanitizeRiskRating(stringValue);
        return;
      }
 
      if (key === "on_time_delivery_rate" || key === "defect_return_rate") {
        field.value = sanitizePercent0to100(stringValue);
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
    if (fileCount) {
      fileCount.textContent = `${total} / ${MAX_ATTACHMENTS} files`;
    }
    if (!total) {
      filesList.innerHTML =
        '<div class="no-files"><i class="fa-regular fa-folder-open"></i><p>No files attached yet</p></div>';
      return;
    }
 
    serverAttachments
      .filter((att) => !att.category || att.category === "attachments")
      .forEach((att) => {
      const wrap = document.createElement("div");
      wrap.innerHTML = buildSupAttRowHtml({
        name: att.file_name,
        sizeLabel: "—",
        dateLabel: att.uploaded_at || "—",
        serverId: String(att.id)
      });
      filesList.appendChild(wrap.firstElementChild);
    });
 
    pendingFiles.forEach((file, index) => {
      const wrap = document.createElement("div");
      wrap.innerHTML = buildSupAttRowHtml({
        name: `${file.name} (pending)`,
        sizeLabel: formatAttachmentFileSize(file.size),
        dateLabel: new Date(file.lastModified || Date.now()).toLocaleString(),
        pendingIndex: index
      });
      filesList.appendChild(wrap.firstElementChild);
    });
  }
 
  async function loadSupplierAttachments() {
    const supplierId = getSupplierIdForUploads();
    if (!supplierId) {
      serverAttachments.length = 0;
      renderFiles();
      return;
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
      if (!category) {
        await loadSupplierAttachments();
      }
      return true;
    } catch (error) {
      showToast("Network error while uploading file.", "error");
      return false;
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
      if (!ALLOWED_FILE_EXTENSIONS.has(extension)) {
        showToast(`Unsupported file type: ${file.name}`, "error");
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
 
  function renderLatestCommentPreview() {
    if (!latestCommentMeta || !latestCommentText) return;
    if (!comments.length) {
      latestCommentMeta.textContent = "No comments yet";
      latestCommentText.textContent = "Add a comment to see the latest update.";
      return;
    }
    const lastComment = comments[comments.length - 1];
    const author = (lastComment.author || loggedInUserName || "User").toString();
    latestCommentMeta.textContent = `${author} - ${lastComment.time}`;
    latestCommentText.textContent = lastComment.text || "-";
  }
 
  function renderComments() {
    if (!historyList) return;
    historyList.innerHTML = "";
    if (!comments.length) {
      historyList.innerHTML = '<div class="no-history-message">No history available.</div>';
      renderLatestCommentPreview();
      return;
    }
 
    renderLatestCommentPreview();
 
    comments
      .slice()
      .reverse()
      .forEach((item) => {
        const row = document.createElement("div");
        row.className = "history-item";
        const author = (item.author || loggedInUserName || "User").toString();
        row.innerHTML = `<p><strong>${escapeHtml(author)} - ${escapeHtml(item.time)}</strong></p><p>${escapeHtml(item.text)}</p>`;
        historyList.appendChild(row);
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
    uploadCard.classList.add("supplier-upload-card--drag");
  });
  uploadCard?.addEventListener("dragleave", () => {
    uploadCard.classList.remove("supplier-upload-card--drag");
  });
  uploadCard?.addEventListener("drop", (event) => {
    event.preventDefault();
    uploadCard.classList.remove("supplier-upload-card--drag");
    const droppedFiles = Array.from(event.dataTransfer?.files || []);
    void handleIncomingFiles(droppedFiles);
  });
  fileInput?.addEventListener("change", (event) => {
    const selectedFiles = Array.from(event.target?.files || []);
    void handleIncomingFiles(selectedFiles);
    fileInput.value = "";
  });
  filesList?.addEventListener("click", async (event) => {
    const btn = event.target instanceof HTMLElement ? event.target.closest(".att-btn") : null;
    if (!btn) return;
    const row = btn.closest(".sup-att__row");
    if (!row || !filesList.contains(row)) return;
 
    const serverId = row.dataset.serverId;
    const pendingIndex = row.dataset.pendingIndex;
    const supplierId = getSupplierIdForUploads();
 
    if (btn.classList.contains("view-btn")) {
      if (serverId) {
        viewSupplierAttachmentFile({ serverId });
      } else if (pendingIndex !== "") {
        const file = pendingFiles[Number(pendingIndex)];
        if (file) viewSupplierAttachmentFile({ pendingFile: file });
      }
      return;
    }
 
    if (btn.classList.contains("download-btn")) {
      if (serverId) {
        downloadSupplierAttachmentFile({ serverId });
      } else if (pendingIndex !== "") {
        const file = pendingFiles[Number(pendingIndex)];
        if (file) downloadSupplierAttachmentFile({ pendingFile: file });
      }
      return;
    }
 
    if (!btn.classList.contains("delete-btn")) return;
 
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
 
  gstinInput?.addEventListener("input", () => {
    const cleaned = (gstinInput.value || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
    if (gstinInput.value !== cleaned) gstinInput.value = cleaned;
  });
  setupCompanyRegistrationValidation();
  setupIbanSwiftValidation();
  setupProcurementFieldValidations();
  setupAddressFieldValidations();
  setupComplianceFieldValidations();
  setupSupplierDocumentUploads();
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
    validateContactFirstNameLive();
    validateContactLastNameLive();
    validateCompanyRegistrationLive();
    validateEmailLive();
    validatePhoneLive(supplierPhoneInput, true);
    validatePhoneLive(alternateContactInput, false);
    validateBankNameLive();
    validateBankAccountLive();
    validateIbanSwiftLive();
    validateAllProcurementFieldsLive();
    validateAllAddressFieldsLive();
    validateAllComplianceFieldsLive();
    validateAllPerformanceFieldsLive();
    if (formError) {
      if (formError.toLowerCase().includes("required")) {
        showToast("Please fill all mandatory fields.", "error");
      } else {
        showToast(formError, "error");
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
  renderLatestCommentPreview();
});
 
 