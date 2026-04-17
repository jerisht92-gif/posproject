console.log("✅ deliverynote-new.js loaded v100");

document.addEventListener("DOMContentLoaded", () => {
  /* =========================================================
     DOM REFERENCES
  ========================================================== */
  const dnId = document.getElementById("dnId");
  const dnIdView = document.getElementById("dnIdView");
  const dnDate = document.getElementById("dnDate");

  const returnBtn = document.getElementById("dn2ReturnBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const cancelDnBtn = document.getElementById("cancelDnBtn"); // Cancel DN button

 
  const itemsBody = document.getElementById("itemsBody");

  const saveDraftBtn = document.getElementById("saveDraftBtn");
  const submitBtn = document.getElementById("submitBtn");

  const soRefSel = document.getElementById("soRef");
  const custNameEl = document.getElementById("custName");
  const dnTypeEl = document.getElementById("dnType");
  const destAddrEl = document.getElementById("destAddr");

  const deliveryByEl = document.getElementById("deliveryBy");
  const deliveryStatusEl = document.getElementById("deliveryStatus");
  const vehicleNoEl = document.getElementById("vehicleNo");
  const trackingIdEl = document.getElementById("trackingId");
  const deliveryNotesEl = document.getElementById("deliveryNotes");

  const dnDateErr = document.getElementById("dnDateErr");
  const soRefErr = document.getElementById("soRefErr");
  const custNameErr = document.getElementById("custNameErr");
  const dnTypeErr = document.getElementById("dnTypeErr");
  const destAddrErr = document.getElementById("destAddrErr");
  const lineItemsErr = document.getElementById("dnLineItemsErr");
  const deliveryStatusErr = document.getElementById("deliveryStatusErr");
  const vehicleNoErr = document.getElementById("vehicleNoErr");
  const trackingIdErr = document.getElementById("trackingIdErr");
  const deliveryNotesErr = document.getElementById("deliveryNotesErr");

  // Header UI
  const pageTitleEl = document.getElementById("dn2PageTitle");
  const statusPillEl = document.getElementById("dn2StatusPill");

  // Acknowledgement
  const ackSection = document.getElementById("ackSection");
  const ackSaveBtn = document.getElementById("ackSaveBtn");
  const ackReceivedBy = document.getElementById("ackReceivedBy");
  const ackContact = document.getElementById("ackContact");
  const ackPodFile = document.getElementById("ackPodFile");
  const ackFiles = document.getElementById("ackFiles");
  const ackReceivedByErr = document.getElementById("ackReceivedByErr");
  const ackContactErr = document.getElementById("ackContactErr");
  const ackPodErr = document.getElementById("ackPodErr");
  const ackUploadWrap = document.getElementById("ackUploadWrap");

  // PDF / Email
  const pdfBtn = document.getElementById("pdfBtn");
  const emailBtn = document.getElementById("emailBtn");

  // Safety guard
  if (!itemsBody) {
    console.error("itemsBody not found. Check id='itemsBody' in HTML.");
    return;
  }

  /* =========================================================
     QUERY PARAMS (new/edit/view)
  ========================================================== */
  function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  const editId = qs("id");
  const mode = (qs("mode") || (editId ? "edit" : "new")).toLowerCase(); // new/edit/view



  /* =========================================================
     TOAST (match sales-new.js / New Sales Order)
  ========================================================== */
  window.showToast = function (message, type = "success") {
    const t = String(type || "success").toLowerCase();
    const isError =
      t === "error" || t === "warn" || t === "warning" || t === "danger";

    const existing = document.querySelector(".success-notification, .error-notification");
    if (existing) existing.remove();

    const div = document.createElement("div");
    div.className = isError ? "error-notification" : "success-notification";
    div.textContent = message;

    document.body.appendChild(div);

    requestAnimationFrame(() => {
      div.classList.add("show");
    });

    setTimeout(() => {
      div.classList.remove("show");
      setTimeout(() => div.remove(), 300);
    }, 2600);
  };

  /* =========================================================
     CANCEL DN MODAL (custom)
  ========================================================== */
  function openCancelDnModal(defaultText = "") {
    const backdrop = document.getElementById("cancelDnBackdrop");
    const reasonEl = document.getElementById("cancelDnReason");
    const btnYes = document.getElementById("cancelDnYes");
    const btnNo = document.getElementById("cancelDnNo");
    const btnX = document.getElementById("cancelDnX");

    const lastFocusedEl = document.activeElement;

    if (!backdrop || !reasonEl || !btnYes || !btnNo || !btnX) {
      showToast("Cancel modal HTML not found", "error");
      return Promise.resolve(null);
    }

    function getFocusable() {
      const modal = backdrop.querySelector(".pos-modal");
      if (!modal) return [];
      return [
        ...modal.querySelectorAll(
          'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ),
      ].filter((el) => el.offsetParent !== null);
    }

    reasonEl.value = defaultText;
    reasonEl.disabled = false;
    reasonEl.readOnly = false;
    reasonEl.style.pointerEvents = "auto";

    let resolveFn;
    const p = new Promise((resolve) => (resolveFn = resolve));

    function close() {
      backdrop.style.display = "none";
      btnYes.removeEventListener("click", onYes);
      btnNo.removeEventListener("click", onNo);
      btnX.removeEventListener("click", onNo);
      backdrop.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKeydown);

      if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
        setTimeout(() => lastFocusedEl.focus(), 0);
      }
    }

    function onYes() {
      const reason = (reasonEl.value || "").trim();
      close();
      resolveFn(reason);
    }

    function onNo() {
      close();
      resolveFn(null);
    }

    function onBackdrop(e) {
      if (e.target === backdrop) onNo();
    }

    function onKeydown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onNo();
        return;
      }

      if (e.key !== "Tab") return;

      const focusables = getFocusable();
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
        return;
      }

      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
        return;
      }
    }

    backdrop.style.display = "flex";
    btnYes.addEventListener("click", onYes);
    btnNo.addEventListener("click", onNo);
    btnX.addEventListener("click", onNo);
    backdrop.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKeydown);

    setTimeout(() => {
      reasonEl.focus();
      const focusables = getFocusable();
      if (focusables.length) focusables[0].focus();
    }, 50);

    return p;
  }

  /* =========================================================
     LIVE VALIDATION (aligned with sales-new.js)
  ========================================================== */
  const DN_INVALID_DATE_MSG =
    "Invalid date. Use format YYYY-MM-DD (e.g. 2026-03-09).";

  const deliveryByError = document.getElementById("deliveryByError");

  function setFieldError(inputEl, errEl, msg) {
    if (!inputEl || !errEl) return;
    if (msg) {
      inputEl.classList.add("input-invalid");
      errEl.textContent = msg;
    } else {
      inputEl.classList.remove("input-invalid");
      errEl.textContent = "";
    }
  }

  /** Match sales-new.js isValidSODateString (YYYY-MM-DD, 1900–2100, real calendar date). */
  function isValidDNDateString(value) {
    if (!value || typeof value !== "string") return false;
    const trimmed = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
    const parts = trimmed.split("-");
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (y < 1900 || y > 2100) return false;
    const date = new Date(y, m, d);
    if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return false;
    return true;
  }

  function validateDeliveredBy() {
    if (!deliveryByEl) return false;

    const value = deliveryByEl.value.trim();
    const len = value.length;

    if (len === 0) {
      setFieldError(deliveryByEl, deliveryByError, "Please enter delivery by name.");
      return false;
    }
    if (len < 3) {
      setFieldError(deliveryByEl, deliveryByError, "Minimum 3 characters required");
      return false;
    }
    if (len > 20) {
      setFieldError(deliveryByEl, deliveryByError, "Maximum 20 characters allowed");
      return false;
    }
    setFieldError(deliveryByEl, deliveryByError, "");
    return true;
  }

  /** Mirrors submit rules without painting errors (used before first user interaction on new DN). */
  function dnFormIsComplete() {
    const dv = dnDate?.value?.trim() || "";
    if (!dv || !isValidDNDateString(dv)) return false;
    if (!soRefSel?.value?.trim()) return false;
    if (!custNameEl?.value?.trim()) return false;
    if (!dnTypeEl?.value?.trim()) return false;
    if (!destAddrEl?.value?.trim()) return false;
    const db = deliveryByEl?.value?.trim() || "";
    if (!db || db.length < 3 || db.length > 40) return false;
    if (!deliveryStatusEl?.value?.trim()) return false;
    if (!vehicleNoEl?.value?.trim()) return false;
    if (!trackingIdEl?.value?.trim()) return false;
    if (!deliveryNotesEl?.value?.trim()) return false;
    return !!(itemsBody && itemsBody.querySelectorAll("tr").length > 0);
  }

  let dnLiveValidationActive = false;

  function runLiveDNValidation() {
    if (mode === "view") return true;

    let ok = true;

    const dv = dnDate?.value?.trim() || "";
    if (!dv) {
      setFieldError(dnDate, dnDateErr, "Please select delivery date.");
      ok = false;
    } else if (!isValidDNDateString(dv)) {
      setFieldError(dnDate, dnDateErr, DN_INVALID_DATE_MSG);
      ok = false;
    } else {
      setFieldError(dnDate, dnDateErr, "");
    }

    if (!soRefSel?.value?.trim()) {
      setFieldError(soRefSel, soRefErr, "Please select sales order reference.");
      ok = false;
    } else {
      setFieldError(soRefSel, soRefErr, "");
    }

    const cn = custNameEl?.value?.trim() || "";
    if (!cn) {
      setFieldError(custNameEl, custNameErr, "Please enter customer name.");
      ok = false;
    } else {
      setFieldError(custNameEl, custNameErr, "");
    }

    if (!dnTypeEl?.value?.trim()) {
      setFieldError(dnTypeEl, dnTypeErr, "Please select delivery type.");
      ok = false;
    } else {
      setFieldError(dnTypeEl, dnTypeErr, "");
    }

    const da = destAddrEl?.value?.trim() || "";
    if (!da) {
      setFieldError(destAddrEl, destAddrErr, "Please enter destination address.");
      ok = false;
    } else {
      setFieldError(destAddrEl, destAddrErr, "");
    }

    if (!validateDeliveredBy()) ok = false;

    if (deliveryStatusEl && deliveryStatusErr) {
      if (!deliveryStatusEl.value?.trim()) {
        setFieldError(deliveryStatusEl, deliveryStatusErr, "Please select delivery status.");
        ok = false;
      } else {
        setFieldError(deliveryStatusEl, deliveryStatusErr, "");
      }
    }

    if (!vehicleNoEl?.value?.trim()) {
      setFieldError(vehicleNoEl, vehicleNoErr, "Please enter vehicle number.");
      ok = false;
    } else {
      setFieldError(vehicleNoEl, vehicleNoErr, "");
    }

    if (!trackingIdEl?.value?.trim()) {
      setFieldError(trackingIdEl, trackingIdErr, "Please enter tracking ID.");
      ok = false;
    } else {
      setFieldError(trackingIdEl, trackingIdErr, "");
    }

    if (!deliveryNotesEl?.value?.trim()) {
      setFieldError(deliveryNotesEl, deliveryNotesErr, "Please enter delivery notes.");
      ok = false;
    } else {
      setFieldError(deliveryNotesEl, deliveryNotesErr, "");
    }

    const hasItems = itemsBody && itemsBody.querySelectorAll("tr").length > 0;
    if (!hasItems) {
      if (lineItemsErr) lineItemsErr.textContent = "Add at least one line item.";
      ok = false;
    } else if (lineItemsErr) {
      lineItemsErr.textContent = "";
    }

    return ok;
  }

  function runLiveDNValidationOrSilent() {
    if (!dnLiveValidationActive) {
      return dnFormIsComplete();
    }
    return runLiveDNValidation();
  }

  /* =========================================================
     INPUT FILTER HELPERS (Logistics)
  ========================================================== */
  function filterDeliveredBy(value) {
    return String(value || "")
      .replace(/[0-9]/g, "")
      .replace(/[^\p{L}\s.\-']/gu, "")
      .replace(/\s{2,}/g, " ")
      .trimStart()
      .slice(0, 20);
  }

  function filterVehicleNo(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9\- ]/g, "")
      .replace(/\s{2,}/g, " ")
      .trimStart()
      .slice(0, 20);
  }

  function filterTrackingId(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "")
      .slice(0, 40);
  }

  function filterDeliveryNotes(value) {
    const v = String(value || "")
      .replace(/[<>{}\[\]]/g, "")
      .replace(/\s{3,}/g, "  ");
    return v.slice(0, 800);
  }

  /* =========================================================
     GENERAL HELPERS
  ========================================================== */
 

  function todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  /* =========================================================
   DELIVERY NOTE STATUS MASTER
========================================================== */
const DELIVERY_NOTE_STATUSES = [
  "Draft",
  
  "Delivered",
  "Partially Delivered",
  "Returned",
  "Cancelled"
];

function loadDeliveryStatusOptions(selectedValue = "") {
  if (!deliveryStatusEl) return;

  const normalizedSelected = normalizeKey(selectedValue || "");
  deliveryStatusEl.innerHTML = "";

  DELIVERY_NOTE_STATUSES.forEach((status) => {
    const opt = document.createElement("option");
    opt.value = normalizeKey(status);
    opt.textContent = status;

    if (normalizeKey(status) === normalizedSelected) {
      opt.selected = true;
    }

    deliveryStatusEl.appendChild(opt);
  });

  if (!selectedValue && DELIVERY_NOTE_STATUSES.length) {
    deliveryStatusEl.value = normalizeKey(DELIVERY_NOTE_STATUSES[0]);
  }
}

 

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}



  function setDnIdValue(id) {
    if (dnId) dnId.value = id;
    if (dnIdView) dnIdView.value = id;
  }

  function renumber() {
    [...itemsBody.querySelectorAll("tr")].forEach((tr, idx) => {
      const sno = tr.querySelector(".sno");
      if (sno) sno.textContent = String(idx + 1);
    });
  }

  function normalizeDeliveryStatus(v) {
  return normalizeKey(v || "draft");
}

  function normalizeKey(v) {
    return String(v || "").trim().toLowerCase().replaceAll(" ", "_");
  }

  function statusText(key) {
  const map = {
    draft: "Draft",
    
    partially_delivered: "Partially Delivered",
    delivered: "Delivered",
    returned: "Returned",
    cancelled: "Cancelled",
  };
  return map[key] || "";
}
  /* =========================================================
     ACK UI STATE + VALIDATION
  ========================================================== */
  let uploadedAckFile = null;
  let ackSaved = false;

  function showAckSection() {
    if (ackSection) ackSection.style.display = "";
  }

  function setAckDisabled(disabled) {
    if (!ackSection) return;
    ackSection.classList.toggle("ack-disabled", !!disabled);
  }

  /** Letters and spaces only (no digits, dots, or other special characters). Max 20 chars. */
  function filterNameInput(value) {
    return String(value || "")
      .replace(/[^\p{L}\s]/gu, "")
      .replace(/\s{2,}/g, " ")
      .slice(0, 20);
  }

  function filterPhoneInput(value) {
    return String(value || "").replace(/\D/g, "").slice(0, 10);
  }

  function isAllowedPodFile(file) {
    if (!file) return false;
    const name = String(file.name || "").toLowerCase();
    const type = String(file.type || "").toLowerCase();
    const allowedExt = [".pdf", ".jpg", ".jpeg", ".png"];
    const allowedMime = ["application/pdf", "image/jpeg", "image/png"];
    const hasAllowedExt = allowedExt.some((ext) => name.endsWith(ext));
    const hasAllowedMime = allowedMime.includes(type);
    return hasAllowedExt || hasAllowedMime;
  }

  function isNameValid() {
    const v = (ackReceivedBy?.value || "").trim();
    if (v.length < 3 || v.length > 20) return false;
    return /^[\p{L}]+(?:\s[\p{L}]+)*$/u.test(v);
  }

  function isPhoneValid() {
    const v = (ackContact?.value || "").trim();
    return /^\d{10}$/.test(v);
  }

  function renderAckFiles() {
    if (!ackFiles) return;

    if (!uploadedAckFile) {
      ackFiles.innerHTML = `<div class="ack-empty">No file uploaded yet.</div>`;
      return;
    }

    ackFiles.innerHTML = `
      <div class="ack-file-row">
        <div class="ack-file-name">1. ${uploadedAckFile.name}</div>
        <div class="ack-file-actions">
          <button type="button" class="ack-btn" id="ackDownloadBtn">Download</button>
          <button type="button" class="ack-btn ghost" id="ackRemoveBtn">Remove</button>
        </div>
      </div>
    `;

    document.getElementById("ackDownloadBtn")?.addEventListener("click", () => {
      const url = URL.createObjectURL(uploadedAckFile);
      const a = document.createElement("a");
      a.href = url;
      a.download = uploadedAckFile.name;
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById("ackRemoveBtn")?.addEventListener("click", () => {
      uploadedAckFile = null;
      ackSaved = false;
      if (ackPodFile) ackPodFile.value = "";
      renderAckFiles();
      updatePdfEmailButtons();
      runAckLiveValidation();
      showToast("POD removed", "info");
    });
  }

  ackReceivedBy?.addEventListener("input", () => {
    const cleaned = filterNameInput(ackReceivedBy.value);
    if (ackReceivedBy.value !== cleaned) ackReceivedBy.value = cleaned;
    runAckLiveValidation();
  });

  ackContact?.addEventListener("input", () => {
    const cleaned = filterPhoneInput(ackContact.value);
    if (ackContact.value !== cleaned) ackContact.value = cleaned;
    runAckLiveValidation();
  });

  ackPodFile?.addEventListener("change", () => {
    const picked = ackPodFile.files && ackPodFile.files[0] ? ackPodFile.files[0] : null;
    if (picked && !isAllowedPodFile(picked)) {
      uploadedAckFile = null;
      ackSaved = false;
      ackPodFile.value = "";
      renderAckFiles();
      updatePdfEmailButtons();
      runAckLiveValidation();
      showToast("Invalid file format. Upload only PDF, JPG, or PNG.", "error");
      return;
    }
    uploadedAckFile = picked;
    ackSaved = false;
    renderAckFiles();
    updatePdfEmailButtons();
    runAckLiveValidation();
  });

  function isAckValid() {
    const nameOk = isNameValid();
    const phoneOk = isPhoneValid();
    const fileOk = !!uploadedAckFile;
    return nameOk && phoneOk && fileOk;
  }

  /** Live validation for Customer Acknowledgement when status is Delivered or Partially Delivered. */
  function runAckLiveValidation() {
    if (!ackReceivedByErr || !ackContactErr || !ackPodErr) return;

    if (mode === "view") {
      setFieldError(ackReceivedBy, ackReceivedByErr, "");
      setFieldError(ackContact, ackContactErr, "");
      ackPodErr.textContent = "";
      ackUploadWrap?.classList.remove("ack-upload-invalid");
      return;
    }

    const st = normalizeKey(deliveryStatusEl?.value || "");
    const needAck =
      (st === "delivered" || st === "partially_delivered") &&
      ackSection &&
      !ackSection.classList.contains("ack-disabled");

    if (!needAck) {
      setFieldError(ackReceivedBy, ackReceivedByErr, "");
      setFieldError(ackContact, ackContactErr, "");
      ackPodErr.textContent = "";
      ackUploadWrap?.classList.remove("ack-upload-invalid");
      return;
    }

    const vName = (ackReceivedBy?.value || "").trim();
    if (!vName) {
      setFieldError(ackReceivedBy, ackReceivedByErr, "Please enter received by name.");
    } else if (!isNameValid()) {
      setFieldError(
        ackReceivedBy,
        ackReceivedByErr,
        "Use 3–20 characters. Letters and spaces only (no numbers or symbols)."
      );
    } else {
      setFieldError(ackReceivedBy, ackReceivedByErr, "");
    }

    const vPhone = (ackContact?.value || "").trim();
    if (!vPhone) {
      setFieldError(ackContact, ackContactErr, "Please enter contact number.");
    } else if (!isPhoneValid()) {
      setFieldError(ackContact, ackContactErr, "Contact number must be exactly 10 digits.");
    } else {
      setFieldError(ackContact, ackContactErr, "");
    }

    if (!uploadedAckFile) {
      ackPodErr.textContent = "Please upload a POD file (PDF, JPG, PNG).";
      ackUploadWrap?.classList.add("ack-upload-invalid");
    } else {
      ackPodErr.textContent = "";
      ackUploadWrap?.classList.remove("ack-upload-invalid");
    }
  }

  /* =========================================================
     PDF / EMAIL ENABLE RULES
  ========================================================== */
  function updatePdfEmailButtons() {
    const stKey = normalizeKey(deliveryStatusEl?.value || "");
    const statusOk = stKey === "partially_delivered" || stKey === "delivered";

    // In view: allow based on status only
    // In edit/new: require acknowledgement saved
    const canEnable = statusOk && (mode === "view" ? true : ackSaved);

    if (pdfBtn) pdfBtn.disabled = !canEnable;
    if (emailBtn) emailBtn.disabled = !canEnable;
  }

  ackSaveBtn?.addEventListener("click", async () => {
    if (!ackSection || ackSection.classList.contains("ack-disabled")) {
      showToast("Acknowledgement is disabled for this status.", "warn");
      return;
    }

    if (!isAckValid()) {
      const nameTrim = (ackReceivedBy?.value || "").trim();
      if (!nameTrim) {
        showToast("Please enter received by name.", "error");
      } else if (!isNameValid()) {
        showToast("Received By: letters and spaces only (3–20 characters). No numbers or symbols.", "error");
      } else if (!isPhoneValid()) {
        showToast("Contact Number must be exactly 10 digits.", "error");
      } else if (!uploadedAckFile) {
        showToast("Please upload POD file (PDF/JPG/PNG).", "error");
      }
      return;
    }

    // If you have backend API, call it here
    ackSaved = true;
    showToast("Acknowledgement saved.", "success");
    updatePdfEmailButtons();
  });

  pdfBtn?.addEventListener("click", () => {
    console.log("PDF button clicked");

    const id = dnId?.value || dnIdView?.value || "";
    if (!id) {
      showToast("DN ID missing", "error");
      return;
    }

    window.open(`/api/delivery-notes/${encodeURIComponent(id)}/pdf`, "_blank");
  });

  emailBtn?.addEventListener("click", async () => {
  console.log("Email button clicked");

  const id = dnId?.value || dnIdView?.value || "";
  if (!id) {
    showToast("DN ID missing. Save the Delivery Note first.", "error");
    return;
  }

  // show instantly
  showToast("Email sent successfully", "success");

  try {
    await fetch(`/api/delivery-notes/${encodeURIComponent(id)}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
  }
});
  /* =========================================================
     STATUS UI (title pill + ack enable + return enable)
  ========================================================== */
  function applyStatusUI({ mode, statusKey, isFreshNew }) {
    // Status pill
    if (statusPillEl) {
      if (isFreshNew) {
        statusPillEl.style.display = "none";
      } else {
        statusPillEl.style.display = "";
        statusPillEl.className = "dn2-status-pill " + statusKey;
        statusPillEl.textContent = "Status: " + statusText(statusKey);
      }
    }

    // ACK always visible; enable only for partial/delivered and not view
    showAckSection();

    const canEnableAck =
      (statusKey === "partially_delivered" || statusKey === "delivered") &&
      mode !== "view";

    setAckDisabled(!canEnableAck);

    // Return button enable only for partial/delivered (not view)
    const currentStatus = normalizeKey(
    deliveryStatusEl?.value || statusKey
  );

  const canReturn =
    currentStatus === "partially_delivered" ||
    currentStatus === "delivered";

  if (returnBtn) returnBtn.disabled = !canReturn;

    // Cancel DN enable/disable
    if (cancelDnBtn) {
      const canCancel = statusKey !== "cancelled" && !isFreshNew;
      cancelDnBtn.disabled = !canCancel;
    }

    // If ack disabled in edit/new, lock pdf/email
    if (!canEnableAck && mode !== "view") {
      ackSaved = false;
    }

    // Draft rule (edit only): lock SO reference + destination address.
    // Keep new-page draft editable so user can create a new DN.
    const lockDraftCoreFields = mode === "edit" && statusKey === "draft";
    if (soRefSel) soRefSel.disabled = lockDraftCoreFields;
    if (destAddrEl) {
      destAddrEl.readOnly = lockDraftCoreFields;
      destAddrEl.setAttribute("aria-readonly", lockDraftCoreFields ? "true" : "false");
      // Reuse same readonly visual style as Customer Name field.
      destAddrEl.classList.toggle("auto-field", lockDraftCoreFields);
    }

    updatePdfEmailButtons();
    runAckLiveValidation();
  }

  /* =========================================================
     LINE ITEMS (Add row)
  ========================================================== */
  function addRow(prefill = {}) {
  const tr = document.createElement("tr");

  const qty = Math.max(1, Math.floor(Number(prefill.qty ?? 1)) || 1);


  tr.innerHTML = `
<td class="w-sno"><span class="sno">1</span></td>

<td class="productNameCell">${prefill.product_name || ""}</td>
<td class="prodIdCell">${prefill.product_id || ""}</td>

<td class="w-qty">
  <input class="qtyInput" type="number" min="1" value="${qty}">
</td>

<td class="uomCell">${prefill.uom || ""}</td>

<td class="serialCell">
  <input type="text" 
       class="serialInput" 
       placeholder="Enter Serial No(s)"
       value="${prefill.serial_no || ""}">
</td>

<td class="dn-action-col">
  <button type="button" class="dn-delete-btn">
    <i class="fa-solid fa-trash"></i>
  </button>
</td>
`;
  const qtyInput = tr.querySelector(".qtyInput");




  qtyInput.addEventListener("keydown", (e) => {
    if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
      e.preventDefault();
    }
  });

  qtyInput.addEventListener("input", () => {
  let n = Number(qtyInput.value);

  if (qtyInput.value === "" || Number.isNaN(n)) {
    validateSubmit();
    return;
  }

  if (n < 1) {
    qtyInput.value = 1;
  } else {
    const i = Math.floor(n);
    if (i !== n) qtyInput.value = i;
  }

  validateSubmit(); 
});

  qtyInput.addEventListener("blur", () => {
  const n = Number(qtyInput.value);

  if (!qtyInput.value || Number.isNaN(n) || n < 1) {
    qtyInput.value = 1;
    validateSubmit(); 
  }
});



  itemsBody.appendChild(tr);
  renumber();
  validateSubmit();
}

  window.dnAddRow = addRow;

  if (itemsBody && itemsBody.dataset.dnDeleteBound !== "1") {
    itemsBody.dataset.dnDeleteBound = "1";
    itemsBody.addEventListener("click", (e) => {
      const btn = e.target.closest(".dn-delete-btn");
      if (!btn || !itemsBody.contains(btn)) return;
      e.preventDefault();
      const row = btn.closest("tr");
      if (!row) return;
      row.remove();
      renumber();
      validateSubmit();
    });
  }

  /* =========================================================
     SALES ORDER REF -> AUTO FILL
     Only SO refs that appear on a Delivery Note with status Partially Delivered.
  ========================================================== */
  function normalizeDnDeliveryStatusKey(v) {
    return String(v || "").trim().toLowerCase().replace(/\s+/g, "_");
  }

  function isPartiallyDeliveredNote(note) {
    const ds = note.delivery_status ?? note.status ?? "";
    return normalizeDnDeliveryStatusKey(ds) === "partially_delivered";
  }

  function ensureSoRefOption(soId) {
    if (!soRefSel || !soId) return;
    const v = String(soId).trim();
    if (!v) return;
    if (![...soRefSel.options].some((o) => o.value === v)) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      soRefSel.appendChild(opt);
    }
    soRefSel.value = v;
  }

 async function loadSORefs() {
  if (!soRefSel) return;

  try {
    const res = await fetch("/api/sales-orders");
    const json = await res.json();

    console.log("SO list:", json); // ✅ debug

    const list = json.orders || [];

    const refs = new Set();
    list.forEach((so) => {
      const id = (so.so_id || "").trim();
      if (id) refs.add(id);
    });

    const sorted = [...refs].sort();

    soRefSel.innerHTML = `<option value="">Select Order Reference</option>`;

    sorted.forEach((id) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = id;
      soRefSel.appendChild(opt);
    });

  } catch (e) {
    console.error("Failed to load SO refs:", e);
  }
}
  async function onSORefChange() {
  const soId = soRefSel?.value;
  console.log("Selected SO:", soId);

  if (!soId) {
    if (custNameEl) custNameEl.value = "";
    if (destAddrEl) destAddrEl.value = "";
    if (trackingIdEl) trackingIdEl.value = "";
    itemsBody.innerHTML = "";
    validateSubmit();
    return;
  }

  try {
    const res = await fetch(`/api/sales-orders/${encodeURIComponent(soId)}`);

    if (!res.ok) {
      showToast("Failed to fetch Sales Order details", "error");
      return;
    }

    const json = await res.json();

    if (!json.success) {
      showToast("Sales Order not found", "error");
      return;
    }

    const so = json.order;

    console.log("Selected SO full data:", so);

    // ✅ Customer Name
    if (custNameEl) {
      custNameEl.value = so.customer_name || "";
    }

    // ✅ Destination Address (IMPORTANT FIX)
    if (destAddrEl) {
      destAddrEl.value = so.shipping_address || so.billing_address || "";
    }

    // ✅ Tracking
    if (trackingIdEl) {
      trackingIdEl.value =
        so.tracking_number ||
        so.tracking_id ||
        so.trackingNo ||
        "";
    }

    itemsBody.innerHTML = "";

    const items = so.items || [];
    if (!items.length) {
      validateSubmit();
      return;
    }

    items.forEach((it) => {
    addRow({
      product_id: it.product_id || "",
      product_name: it.product_name || "",
      qty: it.qty ?? it.quantity ?? 1,
      uom: it.uom || "",
      serial_no: it.serial_no || ""
      
    });
});

    validateSubmit();
  } catch (e) {
    console.error("Failed to load SO detail:", e);
    showToast("Error loading Sales Order details", "error");
  }
}

  soRefSel?.addEventListener("change", onSORefChange);

  /* =========================================================
     COLLECT + SAVE
  ========================================================== */
  function collectItems() {
  const rows = [...itemsBody.querySelectorAll("tr")];
  return rows.map((tr) => ({
  product_id: tr.querySelector(".prodIdCell")?.textContent?.trim() || "",
  product_name: tr.querySelector(".productNameCell")?.textContent?.trim() || "",
  uom: tr.querySelector(".uomCell")?.textContent?.trim() || "",
  qty: Number(tr.querySelector(".qtyInput")?.value || 0),
  serial_no: tr.querySelector(".serialInput")?.value || ""
}))
.filter((x) => x.product_id);
}

  async function saveDN(status) {
    const payload = {
      dn_id: dnId?.value || dnIdView?.value || "",
      delivery_date: dnDate?.value || "",
      so_ref: soRefSel?.value || "",
      customer_name: custNameEl?.value || "",
      delivery_type: dnTypeEl?.value || "",
      destination_address: destAddrEl?.value || "",
      delivery_by: deliveryByEl?.value || "",
      delivery_status: deliveryStatusEl?.value || status,
      vehicle_no: vehicleNoEl?.value || "",
      tracking_id: trackingIdEl?.value || "",
      delivery_notes: deliveryNotesEl?.value || "",
      status: status, // Draft / Submitted
      items: collectItems(),
    };

    const url = editId ? `/api/delivery-notes/${encodeURIComponent(editId)}` : `/api/delivery-notes`;
    const method = editId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        try {
          const toastKey =
            editId && status !== "Draft"
              ? "updated"
              : status === "Draft"
                ? "draft"
                : "submitted";
          localStorage.setItem(
            "deliveryNoteListToast",
            toastKey
          );
        } catch (e) {}
        window.location.href = "/delivery_note";
      } else {
        showToast(data.message || "Save failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  }

  /* =========================================================
     LOAD FOR EDIT / VIEW
  ========================================================== */
  async function loadForEdit(dn_id) {
  const res = await fetch(`/api/delivery-notes/${encodeURIComponent(dn_id)}`, { cache: "no-store" });
  const json = await res.json();

  if (!json.success) {
    showToast(json.message || "Not found", "error");
    return;
  }

  const dn = json.data;

  setDnIdValue(dn.dn_id || "");
  if (dnDate) {
  const rawDate = dn.delivery_date || "";

  if (rawDate) {
    const d = new Date(rawDate);
    if (!isNaN(d)) {
      dnDate.value = d.toISOString().split("T")[0];
    } else {
      dnDate.value = "";
    }
  } else {
    dnDate.value = "";
  }
}

  const soRefValue =
    dn.so_ref ||
    dn.sales_order_ref ||
    dn.salesOrderRef ||
    dn.so_id ||
    "";

  if (soRefSel) {
    if (soRefValue) {
      ensureSoRefOption(soRefValue);
    } else {
      soRefSel.value = "";
    }
  }

  if (custNameEl) custNameEl.value = dn.customer_name || "";
  if (dnTypeEl) dnTypeEl.value = String(dn.delivery_type || "").trim().toLowerCase();
  if (destAddrEl) destAddrEl.value = dn.destination_address || "";

  if (deliveryByEl) deliveryByEl.value = dn.delivery_by || "";
 loadDeliveryStatusOptions(normalizeDeliveryStatus(dn.delivery_status || dn.status || "draft"));
  if (vehicleNoEl) vehicleNoEl.value = dn.vehicle_no || "";
  if (trackingIdEl) trackingIdEl.value = dn.tracking_id || "";
  if (deliveryNotesEl) deliveryNotesEl.value = dn.delivery_notes || "";

  itemsBody.innerHTML = "";

(dn.items || []).forEach((it) => {
  addRow({
    product_id: it.product_id || "",
    product_name: it.product_name || "",
    qty: it.qty ?? it.quantity ?? 1,
    uom: it.uom || "",
    serial_no: it.serial_no || ""   
  });
});

  if (!itemsBody.querySelector("tr")) addRow();

  const stKey = normalizeKey(deliveryStatusEl?.value || dn.delivery_status || dn.status || "draft");
  applyStatusUI({ mode, statusKey: stKey, isFreshNew: false });

  validateSubmit();
}
  function setReadonlyView() {
    document.querySelectorAll(".dn2-page .field-error").forEach((el) => {
      el.textContent = "";
    });
    document.querySelectorAll(".dn2-page .input-invalid").forEach((el) => {
      el.classList.remove("input-invalid");
    });
    ackUploadWrap?.classList.remove("ack-upload-invalid");

    document
      .querySelectorAll(".dn2-page input, .dn2-page select, .dn2-page textarea, .dn2-page button")
      .forEach((el) => {
        if (el === cancelBtn) return;
        if (el === cancelDnBtn) return;
        if (el === returnBtn) return;
        if (el.closest("#cancelDnBackdrop")) return;
        el.disabled = true;
      });

  
    saveDraftBtn?.style.setProperty("display", "none");
    submitBtn?.style.setProperty("display", "none");
  }

  /* =========================================================
     SUBMIT VALIDATION (enable/disable submit button)
  ========================================================== */
  const requiredFields = [
    "#dnDate",
    "#soRef",
    "#custName",
    "#dnType",
    "#destAddr",
    "#deliveryBy",
    "#deliveryStatus",
    "#vehicleNo",
    "#trackingId",
    "#deliveryNotes",
  ];

  function validateSubmit() {
    if (!submitBtn) return;
    submitBtn.disabled = !runLiveDNValidationOrSilent();
    runAckLiveValidation();
  }

  requiredFields.forEach((sel) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const onField = () => {
      dnLiveValidationActive = true;
      validateSubmit();
    };
    el.addEventListener("input", onField);
    el.addEventListener("change", onField);
  });

  itemsBody?.addEventListener("input", () => {
    dnLiveValidationActive = true;
    validateSubmit();
  });
  itemsBody?.addEventListener("change", () => {
    dnLiveValidationActive = true;
    validateSubmit();
  });

  /* =========================================================
     INPUT EVENTS (Logistics live filters)
  ========================================================== */
  deliveryByEl?.addEventListener("input", () => {
    const cleaned = filterDeliveredBy(deliveryByEl.value);
    if (deliveryByEl.value !== cleaned) deliveryByEl.value = cleaned;

    validateSubmit();
  });

  vehicleNoEl?.addEventListener("input", () => {
    const cleaned = filterVehicleNo(vehicleNoEl.value);
    if (vehicleNoEl.value !== cleaned) vehicleNoEl.value = cleaned;
    validateSubmit();
  });

  trackingIdEl?.addEventListener("input", () => {
    const cleaned = filterTrackingId(trackingIdEl.value);
    if (trackingIdEl.value !== cleaned) trackingIdEl.value = cleaned;
    validateSubmit();
  });

  deliveryNotesEl?.addEventListener("input", () => {
    const cleaned = filterDeliveryNotes(deliveryNotesEl.value);
    if (deliveryNotesEl.value !== cleaned) {
      const pos = deliveryNotesEl.selectionStart;
      deliveryNotesEl.value = cleaned;
      deliveryNotesEl.setSelectionRange(Math.min(pos, cleaned.length), Math.min(pos, cleaned.length));
    }
    validateSubmit();
  });

  /* =========================================================
     MAIN EVENTS
  ========================================================== */
  cancelBtn?.addEventListener("click", () => (window.location.href = "/delivery_note"));

 

  saveDraftBtn?.addEventListener("click", () => saveDN("Draft"));
  submitBtn?.addEventListener("click", () => saveDN("Submitted"));
  cancelDnBtn?.addEventListener("click", async () => {
    const id = dnId?.value || dnIdView?.value || "";

    if (!id) {
      showToast("Delivery Note ID missing", "error");
      return;
    }

    // 🔹 modal open
    const reason = await openCancelDnModal();

    if (reason === null) return;

    if (!reason.trim()) {
      showToast("Please enter cancellation reason", "error");
      return;
    }

    try {
      const res = await fetch(`/api/delivery-notes/${encodeURIComponent(id)}/cancel`, {
        method: "PUT", // 👈 IMPORTANT (your backend uses PUT)
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();

      if (data.success) {
        showToast("Delivery Note cancelled successfully", "success");

        // First page redirect
        window.location.href = "/delivery_note";
      } else {
        showToast(data.message || "Cancel failed", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error", "error");
    }
  });

  returnBtn?.addEventListener("click", () => {
    const id = dnId?.value || dnIdView?.value || "";
    if (!id) return showToast("Delivery Note ID not found", "error");
    window.location.href = `/delivery-return/create/${encodeURIComponent(id)}`;
  });

  deliveryStatusEl?.addEventListener("change", () => {
    dnLiveValidationActive = true;
    const stKey = normalizeKey(deliveryStatusEl.value);
    applyStatusUI({ mode, statusKey: stKey, isFreshNew: !editId });
    validateSubmit();
  });

  /* =========================================================
     INIT
  ========================================================== */
 (async function init() {
  showAckSection();
  renderAckFiles();
  loadDeliveryStatusOptions("draft");

  await loadSORefs();

    if (editId) {
      await loadForEdit(editId);
      dnLiveValidationActive = true;

      if (mode === "view") {
        setReadonlyView();
      } else {
        if (pageTitleEl) pageTitleEl.textContent = "New Delivery Note";
        if (submitBtn) submitBtn.textContent = "Update Delivery Note";
      }
      validateSubmit();
  } else {
  if (dnDate) dnDate.value = todayISO();

  loadDeliveryStatusOptions("draft");

  applyStatusUI({ mode: "new", statusKey: "draft", isFreshNew: true });

  validateSubmit();

  const prefilled = await prefillFromSalesOrder();
  if (prefilled) {
    dnLiveValidationActive = true;
    validateSubmit();
  }
}

    updatePdfEmailButtons();
  })();
});


// =========================================
// GET SALES ORDER ID FROM DELIVERY NOTE PAGE
// (Used to Prefill DN from Sales Order)
// =========================================
function getSoIdFromDnPage() {
  const fromHidden = (document.getElementById("prefillSoId")?.value || "").trim();
  if (fromHidden) return fromHidden;

  const qp = new URLSearchParams(window.location.search);
  return (qp.get("so_id") || "").trim();
}


async function prefillFromSalesOrder() {
  const soId = getSoIdFromDnPage();
  if (!soId) return false;

  try {
    const res = await fetch(`/api/sales-orders/${encodeURIComponent(soId)}`, {
      cache: "no-store"
    });

    const data = await res.json();
    const so = data.order || data.data || data;

    if (!so) {
      showToast("Sales Order details not found", "error");
      return false;
    }

    // basic fields
    const soRef = document.getElementById("soRef");
    const custName = document.getElementById("custName");
    const destAddr = document.getElementById("destAddr");
    const dnType = document.getElementById("dnType");

    if (soRef) {
      const v = so.so_id || soId;
      soRef.value = v;
      if (v && soRef.value !== v) {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        soRef.appendChild(opt);
        soRef.value = v;
      }
    }
    if (custName) custName.value = so.customer_name || so.customer || "";
    if (destAddr) destAddr.value = so.shipping_address || so.destination_address || "";
    if (dnType) dnType.value = "regular";

    // line items (same structure as addRow, incl. Action column)
    const itemsBodyEl = document.getElementById("itemsBody");
    const add = typeof window.dnAddRow === "function" ? window.dnAddRow : null;
    if (itemsBodyEl && add) {
      itemsBodyEl.innerHTML = "";
      const items = Array.isArray(so.items) ? so.items : [];
      items.forEach((item) => {
        add({
          product_id: item.product_id || "",
          product_name: item.product_name || "",
          qty: item.qty ?? item.quantity ?? 1,
          uom: item.uom || "",
          serial_no: item.serial_no || ""
        });
      });
    }
    return true;
  } catch (err) {
    console.error("Prefill from sales order failed:", err);
    showToast("Failed to load Sales Order details", "error");
    return false;
  }
}