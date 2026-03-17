




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

  // PDF / Email
  const pdfBtn = document.getElementById("pdfBtn");
  const emailBtn = document.getElementById("emailBtn");

  // Safety guard
  if (!itemsBody) {
    console.error("itemsBody not found. Check id='itemsBody' in HTML.");
    return;
  }

  /* =========================================================
     SMALL NAV HELPER
  ========================================================== */
  function redirectAfter(url, ms = 1200) {
    setTimeout(() => (window.location.href = url), ms);
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
     TOAST (custom)
  ========================================================== */
  window.showToast = function (message, type = "success") {
    const old = document.querySelector(".app-toast");
    if (old) old.remove();

    const toast = document.createElement("div");
    toast.className = "app-toast";
    toast.innerHTML = `
      <span class="toast-icon">✓</span>
      <span class="toast-msg">${message}</span>
    `;

    document.body.appendChild(toast);

    // Force paint first
    setTimeout(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(-50%) translateY(0)";
    }, 20);

    // Hide
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(-16px)";
    }, 2600);

    // Remove
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 3000);
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
     INPUT FILTER HELPERS (Logistics)
  ========================================================== */
  function filterDeliveredBy(value) {
    return String(value || "")
      .replace(/[0-9]/g, "")
      .replace(/[^\p{L}\s.\-']/gu, "")
      .replace(/\s{2,}/g, " ")
      .trimStart();
  }

  const deliveryByError = document.getElementById("deliveryByError");

  function validateDeliveredBy() {
    if (!deliveryByEl) return false;

    const value = deliveryByEl.value.trim();
    const len = value.length;

    const setMsg = (txt) => {
      if (deliveryByError) deliveryByError.textContent = txt;
    };

    if (len === 0) {
      deliveryByEl.classList.remove("input-valid", "input-invalid");
      setMsg("");
      return false;
    }

    if (len < 3) {
      deliveryByEl.classList.add("input-invalid");
      deliveryByEl.classList.remove("input-valid");
      setMsg("Minimum 3 characters required");
      return false;
    }

    if (len > 40) {
      deliveryByEl.classList.add("input-invalid");
      deliveryByEl.classList.remove("input-valid");
      setMsg("Maximum 40 characters allowed");
      return false;
    }

    deliveryByEl.classList.remove("input-invalid");
    deliveryByEl.classList.add("input-valid");
    setMsg("");
    return true;
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
  "Pending",
  "In Transit",
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

function calcRowTotal(qty, rate, tax, discount) {
  const q = Number(qty || 0);
  const r = Number(rate || 0);
  const t = Number(tax || 0);
  const d = Number(discount || 0);

  const subtotal = q * r;
  const taxAmt = (subtotal * t) / 100;
  const total = subtotal + taxAmt - d;

  return total < 0 ? 0 : total;
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
    pending: "Pending",
    in_transit: "In Transit",
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

  function filterNameInput(value) {
    return String(value || "")
      .replace(/[0-9]/g, "")
      .replace(/[^\p{L}\s\.\-']/gu, "");
  }

  function filterPhoneInput(value) {
    return String(value || "").replace(/\D/g, "").slice(0, 10);
  }

  function isNameValid() {
    const v = (ackReceivedBy?.value || "").trim();
    if (v.length < 3 || v.length > 40) return false;
    if (!/^\p{L}/u.test(v)) return false;
    if (!/^[\p{L}\s\.\-']+$/u.test(v)) return false;
    return true;
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
      showToast("POD removed", "info");
    });
  }

  ackReceivedBy?.addEventListener("input", () => {
    const cleaned = filterNameInput(ackReceivedBy.value);
    if (ackReceivedBy.value !== cleaned) ackReceivedBy.value = cleaned;
  });

  ackContact?.addEventListener("input", () => {
    const cleaned = filterPhoneInput(ackContact.value);
    if (ackContact.value !== cleaned) ackContact.value = cleaned;
  });

  ackPodFile?.addEventListener("change", () => {
    uploadedAckFile = ackPodFile.files && ackPodFile.files[0] ? ackPodFile.files[0] : null;
    ackSaved = false;
    renderAckFiles();
    updatePdfEmailButtons();
  });

  function isAckValid() {
    const nameOk = isNameValid();
    const phoneOk = isPhoneValid();
    const fileOk = !!uploadedAckFile;
    return nameOk && phoneOk && fileOk;
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
      if (!isNameValid()) showToast("Received By must be 3 to 40 letters (no numbers).", "error");
      else if (!isPhoneValid()) showToast("Contact Number must be exactly 10 digits.", "error");
      else if (!uploadedAckFile) showToast("Please upload POD file (PDF/JPG/PNG).", "error");
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
  showToast("Email sent successfully ✔", "success");

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
    const canReturn = statusKey === "partially_delivered" || statusKey === "delivered";
    if (returnBtn) returnBtn.disabled = !(canReturn && mode !== "view");

    // Cancel DN enable/disable
    if (cancelDnBtn) {
      const canCancel = statusKey !== "cancelled" && !isFreshNew;
      cancelDnBtn.disabled = !canCancel;
    }

    // If ack disabled in edit/new, lock pdf/email
    if (!canEnableAck && mode !== "view") {
      ackSaved = false;
    }

    updatePdfEmailButtons();
  }

  /* =========================================================
     LINE ITEMS (Add row)
  ========================================================== */
  function addRow(prefill = {}) {
  const tr = document.createElement("tr");

  const qty = Number(prefill.qty ?? 1);
  const discount = Number(prefill.discount ?? 0);
  const rate = Number(prefill.rate ?? 0);
  const tax = Number(prefill.tax ?? 0);
  const total = calcRowTotal(qty, rate, tax, discount);

  tr.innerHTML = `
<td class="w-sno" style="text-align:center;">
  <span class="sno">1</span>
</td>

<td class="productNameCell">${prefill.product_name || ""}</td>
<td class="prodIdCell">${prefill.product_id || ""}</td>
<td class="uomCell">${prefill.uom || ""}</td>
<td class="rateCell">${formatMoney(rate)}</td>

<td class="w-qty">
  <input class="qtyInput" type="number" min="1" step="1" value="${qty}">
</td>

<td class="taxCell">${Number(tax || 0)}%</td>

<td class="w-discount">
  <input class="discountInput" type="number" min="0" step="0.01" value="${discount}">
</td>

<td class="rowTotal">${formatMoney(total)}</td>
`;
  const qtyInput = tr.querySelector(".qtyInput");
  const discountInput = tr.querySelector(".discountInput");
  const rateCell = tr.querySelector(".rateCell");
  const taxCell = tr.querySelector(".taxCell");
  const rowTotalCell = tr.querySelector(".rowTotal");
 

  function updateRowTotal() {
    const qtyVal = Number(qtyInput.value || 0);
    const discountVal = Number(discountInput.value || 0);
    const rateVal = Number(rateCell.textContent || 0);
    const taxVal = Number(String(taxCell.textContent || "").replace("%", "")) || 0;

    rowTotalCell.textContent = formatMoney(
      calcRowTotal(qtyVal, rateVal, taxVal, discountVal)
    );
  }

  qtyInput.addEventListener("input", () => {
    if (Number(qtyInput.value) < 1) qtyInput.value = 1;
    updateRowTotal();
    validateSubmit();
  });

  discountInput.addEventListener("input", () => {
    let v = Number(discountInput.value || 0);
    if (v < 0) {
      v = 0;
      showToast("Discount cannot be negative", "error");
    } else if (v > 90) {
      v = 90;
      showToast("Discount limited to 90%", "error");
    }
    discountInput.value = v;
    updateRowTotal();
    validateSubmit();
  });

 

  itemsBody.appendChild(tr);
  renumber();
  validateSubmit();
}

  /* =========================================================
     SALES ORDER REF -> AUTO FILL
  ========================================================== */
  async function loadSORefs() {
    if (!soRefSel) return;

    try {
    const res = await fetch("/api/sales-orders", { cache: "no-store" });
    const json = await res.json();

    // Support both plain list and wrapped { data: [...] } / { orders: [...] }
    const list = Array.isArray(json) ? json : (json.data || json.orders || []);

    soRefSel.innerHTML = `<option value="">Select Order Reference</option>`;
    (list || []).forEach((row) => {
        const id = row.so_id || row.id;
        if (!id) return;
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

  if (!soId) {
    if (custNameEl) custNameEl.value = "";
    if (destAddrEl) destAddrEl.value = "";
    if (trackingIdEl) trackingIdEl.value = "";
    itemsBody.innerHTML = "";
    validateSubmit();
    return;
  }

  try {
    const res = await fetch(`/api/sales-orders/${encodeURIComponent(soId)}`, {
      cache: "no-store"
    });

    if (!res.ok) {
      showToast("Failed to fetch Sales Order details", "error");
      return;
    }

    const json = await res.json();
    const so = json.order || json.data || json;

    console.log("Selected SO full data:", so);

    if (custNameEl) custNameEl.value = so.customer_name || "";
    if (destAddrEl) destAddrEl.value = so.shipping_address || "";
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
    rate: it.rate ?? it.unit_price ?? it.price ?? 0,
    tax: it.tax ?? it.tax_percent ?? it.tax_pct ?? it.taxPercent ?? 0,
    discount: it.discount ?? it.disc_pct ?? it.discount_pct ?? 0,
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
  return rows
    .map((tr) => ({
      product_id: tr.querySelector(".prodIdCell")?.textContent?.trim() || "",
      product_name: tr.querySelector(".productNameCell")?.textContent?.trim() || "",
      uom: tr.querySelector(".uomCell")?.textContent?.trim() || "",
      rate: Number(tr.querySelector(".rateCell")?.textContent || 0),
      qty: Number(tr.querySelector(".qtyInput")?.value || 0),
      tax: Number((tr.querySelector(".taxCell")?.textContent || "").replace("%", "")) || 0,
      discount: Number(tr.querySelector(".discountInput")?.value || 0),
      total: Number(tr.querySelector(".rowTotal")?.textContent || 0),
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
        showToast(status === "Draft" ? "Saved as draft" : "Delivery Note submitted", "success");
        redirectAfter("/delivery_note", 1500);
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
  if (dnDate) dnDate.value = dn.delivery_date || "";

  const soRefValue =
    dn.so_ref ||
    dn.sales_order_ref ||
    dn.salesOrderRef ||
    dn.so_id ||
    "";

  if (soRefSel) {
    soRefSel.value = soRefValue;

    if (soRefValue && soRefSel.value !== soRefValue) {
      const opt = document.createElement("option");
      opt.value = soRefValue;
      opt.textContent = soRefValue;
      soRefSel.appendChild(opt);
      soRefSel.value = soRefValue;
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
    rate: it.rate ?? it.unit_price ?? it.price ?? 0,
    tax: it.tax ?? it.tax_percent ?? it.tax_pct ?? it.taxPercent ?? 0,
    discount: it.discount ?? it.disc_pct ?? it.discount_pct ?? 0,
  });
});
  if (!itemsBody.querySelector("tr")) addRow();

  const stKey = normalizeKey(deliveryStatusEl?.value || dn.delivery_status || dn.status || "draft");
  applyStatusUI({ mode, statusKey: stKey, isFreshNew: false });

  validateSubmit();
}
  function setReadonlyView() {
    document
      .querySelectorAll(".dn2-page input, .dn2-page select, .dn2-page textarea, .dn2-page button")
      .forEach((el) => {
        if (el === cancelBtn) return;
        if (el === cancelDnBtn) return;
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

  function isFilled(selector) {
    const el = document.querySelector(selector);
    if (!el) return true;
    return (el.value || "").trim() !== "";
  }

  function validateSubmit() {
    if (!submitBtn) return;
    const allOk = requiredFields.every(isFilled) && validateDeliveredBy();
    const hasItems = document.querySelectorAll("#itemsBody tr").length > 0;
    submitBtn.disabled = !(allOk && hasItems);
  }

  requiredFields.forEach((sel) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.addEventListener("input", validateSubmit);
    el.addEventListener("change", validateSubmit);
  });

  itemsBody?.addEventListener("input", validateSubmit);
  itemsBody?.addEventListener("change", validateSubmit);

  /* =========================================================
     INPUT EVENTS (Logistics live filters)
  ========================================================== */
  deliveryByEl?.addEventListener("input", () => {
    const cleaned = filterDeliveredBy(deliveryByEl.value);
    if (deliveryByEl.value !== cleaned) deliveryByEl.value = cleaned;

    validateDeliveredBy();
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

  returnBtn?.addEventListener("click", () => {
    const id = dnId?.value || dnIdView?.value || "";
    if (!id) return showToast("Delivery Note ID not found", "error");
    window.location.href = `/delivery-return/create/${encodeURIComponent(id)}`;
  });

  deliveryStatusEl?.addEventListener("change", () => {
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

      if (mode === "view") {
        setReadonlyView();
      } else {
        if (pageTitleEl) pageTitleEl.textContent = "New Delivery Note";
        if (submitBtn) submitBtn.textContent = "Update Delivery Note";
      }
  } else {
  if (dnDate) dnDate.value = todayISO();

  loadDeliveryStatusOptions("draft");

  applyStatusUI({ mode: "new", statusKey: "draft", isFreshNew: true });

  validateSubmit();
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
  if (!soId) return;

  try {
    const res = await fetch(`/api/sales-orders/${encodeURIComponent(soId)}`, {
      cache: "no-store"
    });

    const data = await res.json();
    const so = data.order || data.data || data;

    if (!so) {
      showToast("Sales Order details not found", "error");
      return;
    }

    // basic fields
    const soRef = document.getElementById("soRef");
    const custName = document.getElementById("custName");
    const destAddr = document.getElementById("destAddr");
    const dnType = document.getElementById("dnType");

    if (soRef) soRef.value = so.so_id || soId;
    if (custName) custName.value = so.customer_name || so.customer || "";
    if (destAddr) destAddr.value = so.shipping_address || so.destination_address || "";
    if (dnType) dnType.value = "Sales Order";

    // line items
    const itemsBody = document.getElementById("itemsBody");
    if (itemsBody) {
      itemsBody.innerHTML = "";

      const items = Array.isArray(so.items) ? so.items : [];

      items.forEach((item, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td>
            <input type="text" value="${item.product_name || ""}" readonly>
          </td>
          <td>${item.product_id || ""}</td>
          <td>${item.uom || ""}</td>
          <td>${item.price || item.rate || 0}</td>
          <td>
            <input type="number" value="${item.qty || 0}" min="1" class="qtyInput">
          </td>
          <td>${item.tax_pct || 0}</td>
          <td>
            <input type="number" value="${item.disc_pct || 0}" min="0" class="discInput">
          </td>
          <td>${item.line_total || 0}</td>
          
        `;
        itemsBody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error("Prefill from sales order failed:", err);
    showToast("Failed to load Sales Order details", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  prefillFromSalesOrder();
});