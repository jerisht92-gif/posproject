document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const editingSupplierId = (params.get("supplier_id") || "").trim().toUpperCase();
  const supplierForm = document.getElementById("supplierForm");
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
  const contactFirstNameInput = document.getElementById("contactFirstName");
  const contactLastNameInput = document.getElementById("contactLastName");
  const supplierPhoneInput = document.getElementById("supplierPhone");
  const alternateContactInput = document.getElementById("alternateContactNo");
  const relationshipManagerSelect = document.getElementById("relationshipManager");
  const relationshipManagerCustomInput = document.getElementById("relationshipManagerCustom");
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
  const SUPPLIER_PHONE_RE = /^[0-9]{7,20}$/;
  const SUPPLIER_CONTACT_RE = /^[A-Za-z .'-]{2,80}$/;
  const SUPPLIER_NAME_RE = /^[A-Za-z0-9 .,&()'/-]{3,100}$/;
  const SUPPLIER_ID_RE = /^SUP-\d{3,}$/i;
 
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
      company_registration_number: (formData.get("company_registration_number") || "").toString().trim(),
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
      mailing_address: (formData.get("mailing_address") || "").toString().trim(),
      warehouse_address: (formData.get("warehouse_address") || "").toString().trim(),
      billing_address: (formData.get("billing_address") || "").toString().trim(),
      registered_billing_address: (formData.get("registered_billing_address") || "").toString().trim(),
      bank_name: (formData.get("bank_name") || "").toString().trim(),
      payment_method: (formData.get("payment_method") || "").toString().trim(),
      bank_account_no: (formData.get("bank_account_no") || "").toString().trim(),
      payment_terms: (formData.get("payment_terms") || "").toString().trim(),
      iban_swift_code: (formData.get("iban_swift_code") || "").toString().trim(),
      tax_withholding_setup: (formData.get("tax_withholding_setup") || "").toString().trim(),
      currency: (formData.get("currency") || "").toString().trim(),
      categories_served: (formData.get("categories_served") || "").toString().trim(),
      inco_terms: (formData.get("inco_terms") || "").toString().trim(),
      product_service_catalog: (formData.get("product_service_catalog") || "").toString().trim(),
      freight_terms: (formData.get("freight_terms") || "").toString().trim(),
      minimum_order_quantity: (formData.get("minimum_order_quantity") || "").toString().trim(),
      return_replacement_policy: (formData.get("return_replacement_policy") || "").toString().trim(),
      average_delivery_time_days: (formData.get("average_delivery_time_days") || "").toString().trim(),
      contract_references: (formData.get("contract_references") || "").toString().trim(),
      compliance_certifications: (formData.get("compliance_certifications") || "").toString().trim(),
      risk_notes_flags: (formData.get("risk_notes_flags") || "").toString().trim(),
      compliance_status: (formData.get("compliance_status") || "").toString().trim(),
      last_risk_assessment_date: (formData.get("last_risk_assessment_date") || "").toString().trim(),
      risk_ratings: (formData.get("risk_ratings") || "").toString().trim(),
      on_time_delivery_rate: (formData.get("on_time_delivery_rate") || "").toString().trim(),
      quality_ratings: (formData.get("quality_ratings") || "").toString().trim(),
      defect_return_rate: (formData.get("defect_return_rate") || "").toString().trim(),
      last_evaluation_date: (formData.get("last_evaluation_date") || "").toString().trim(),
      contract_breaches: (formData.get("contract_breaches") || "").toString().trim(),
      improvement_plans: (formData.get("improvement_plans") || "").toString().trim(),
      complaints_registered: (formData.get("complaints_registered") || "").toString().trim(),
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
    if (!relationshipManagerSelect || !relationshipManagerCustomInput) return;
    const isCustom = relationshipManagerSelect.value === "custom";
    relationshipManagerCustomInput.style.display = isCustom ? "block" : "none";
    relationshipManagerCustomInput.disabled = !isCustom;
    if (!isCustom) relationshipManagerCustomInput.value = "";
  }
 
  function trimField(formData, name) {
    return (formData.get(name) || "").toString().trim();
  }
 
  function keepDigitsOnly(inputEl) {
    if (!inputEl) return;
    inputEl.addEventListener("input", () => {
      const digits = (inputEl.value || "").replace(/\D/g, "");
      if (inputEl.value !== digits) inputEl.value = digits;
    });
  }
 
  function keepLettersOnly(inputEl) {
    if (!inputEl) return;
    inputEl.addEventListener("input", () => {
      const letters = (inputEl.value || "").replace(/[^A-Za-z]/g, "");
      if (inputEl.value !== letters) inputEl.value = letters;
    });
  }
 
  function validateSupplierForm(formData) {
    const supplierId = trimField(formData, "supplier_id");
    const gstin = trimField(formData, "gstin");
    const supplierName = trimField(formData, "supplier_name");
    const companyReg = trimField(formData, "company_registration_number");
    const legalEntity = trimField(formData, "legal_entity_name");
    const country = trimField(formData, "country_of_registration");
    const supplierType = trimField(formData, "supplier_type");
    const supplierTier = trimField(formData, "supplier_tier");
    const status = trimField(formData, "status");
    const contactFirst = trimField(formData, "contact_first_name");
    const contactLast = trimField(formData, "contact_last_name");
    const email = trimField(formData, "email");
    const phone = trimField(formData, "phone_number");
    const regOffice = trimField(formData, "registered_office_address");
    const rmSel = trimField(formData, "relationship_manager");
    const rmCustom = trimField(formData, "relationship_manager_custom");
 
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
    if (!legalEntity) return "Legal entity name is required.";
    if (!country) return "Country of registration is required.";
    if (!supplierType) return "Supplier type is required.";
    if (!supplierTier) return "Supplier tier is required.";
    if (!status) return "Status is required.";
    if (!contactFirst) return "Primary contact first name is required.";
    if (!SUPPLIER_CONTACT_RE.test(contactFirst)) {
      return "Primary contact first name must be 2–80 letters (spaces, dots, apostrophes allowed).";
    }
    if (!contactLast) return "Last name is required.";
    if (!SUPPLIER_CONTACT_RE.test(contactLast)) {
      return "Last name must be 2–80 letters (spaces, dots, apostrophes allowed).";
    }
    if (!email) return "Email is required.";
    if (!SUPPLIER_EMAIL_RE.test(email)) return "Enter a valid email address.";
    if (!phone) return "Phone number is required.";
    if (!SUPPLIER_PHONE_RE.test(phone)) return "Enter a valid phone number.";
    if (!regOffice) return "Registered office address is required.";
    if (rmSel === "custom" && !rmCustom) {
      return "Enter relationship manager name.";
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
      if (
        relationshipManagerValue &&
        relationshipManagerValue.toLowerCase() !== "no relationship manager"
      ) {
        relationshipManagerSelect.value = "custom";
        relationshipManagerCustomInput.value = relationshipManagerValue;
      } else {
        relationshipManagerSelect.value = relationshipManagerValue || "";
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
    } catch (error) {
      showToast("Network error while loading supplier.", "error");
    }
  }

  function getSupplierIdForUploads() {
    const field = document.getElementById("supplierCode");
    return (field?.value || editingSupplierId || "").toString().trim().toUpperCase();
  }

  function totalAttachmentCount() {
    return serverAttachments.length + pendingFiles.length;
  }

  function renderFiles() {
    if (!filesList) return;
    filesList.innerHTML = "";
    const total = totalAttachmentCount();
    if (!total) {
      filesList.innerHTML =
        '<div class="no-files"><i class="fa-regular fa-folder-open"></i><p>No files attached yet</p></div>';
      if (fileCount) fileCount.textContent = `0 / ${MAX_ATTACHMENTS} files`;
      return;
    }

    if (fileCount) {
      fileCount.textContent = `${total} / ${MAX_ATTACHMENTS} files`;
    }

    serverAttachments.forEach((att) => {
      const row = document.createElement("div");
      row.className = "file-item";
      row.innerHTML = `<span>${escapeHtml(att.file_name)}</span><button type="button" class="remove-btn" data-server-id="${att.id}">Remove</button>`;
      filesList.appendChild(row);
    });

    pendingFiles.forEach((file, index) => {
      const row = document.createElement("div");
      row.className = "file-item";
      row.innerHTML = `<span>${escapeHtml(file.name)} (pending)</span><button type="button" class="remove-btn" data-pending-index="${index}">Remove</button>`;
      filesList.appendChild(row);
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

  async function uploadSupplierFile(file) {
    const supplierId = getSupplierIdForUploads();
    if (!supplierId) {
      showToast("Supplier ID is required before uploading files.", "error");
      return false;
    }
    const formData = new FormData();
    formData.append("supplier_id", supplierId);
    formData.append("file", file);
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
      const ok = await uploadSupplierFile(file);
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
 
  uploadBtn?.addEventListener("click", () => fileInput?.click());
  uploadCard?.addEventListener("click", () => fileInput?.click());
  uploadCard?.addEventListener("dragover", (event) => {
    event.preventDefault();
    uploadCard.style.borderColor = "#007bff";
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
    if (!(event.target instanceof HTMLElement)) return;
    if (!event.target.classList.contains("remove-btn")) return;

    const serverId = event.target.dataset.serverId;
    if (serverId) {
      const supplierId = getSupplierIdForUploads();
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

    const pendingIndex = Number(event.target.dataset.pendingIndex);
    if (!Number.isNaN(pendingIndex)) {
      pendingFiles.splice(pendingIndex, 1);
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
  keepLettersOnly(contactFirstNameInput);
  keepLettersOnly(contactLastNameInput);
  keepDigitsOnly(supplierPhoneInput);
  keepDigitsOnly(alternateContactInput);
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
      await uploadPendingFiles();
      setTimeout(() => {
        const savedSupplierId = (
          result?.supplier_id ||
          payload?.supplier_id ||
          editingSupplierId ||
          ""
        ).trim().toUpperCase();
        if (!savedSupplierId) return;
        window.location.href = `/supplier-new?supplier_id=${encodeURIComponent(savedSupplierId)}`;
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
 