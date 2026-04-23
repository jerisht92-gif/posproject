
(function initDnrInlineConfig() {
  const el = document.getElementById("dnr-inline-config");
  if (el && el.textContent) {
    try {
      const cfg = JSON.parse(el.textContent.trim());
      window.currentUserName = cfg.currentUserName ?? "User";
      window.DNR_PAGE_MODE = cfg.pageMode || "new";
      window.DNR_RECORD_STATUS = cfg.dnrStatus ?? "";
    } catch (_e) {
      window.currentUserName = "User";
      window.DNR_PAGE_MODE = "new";
      window.DNR_RECORD_STATUS = "";
    }
  } else {
    window.currentUserName = "User";
    window.DNR_PAGE_MODE = "new";
    window.DNR_RECORD_STATUS = "";
  }
})();

const params = new URLSearchParams(window.location.search);

const dnrId = params.get("dnr_id") || params.get("id");
/** URL ?mode= + server default; drives edit vs view chrome */
const pageMode = params.get("mode") || window.DNR_PAGE_MODE || "new";

/** True when opening a new DNR (no dnr_id in URL). False for Edit/View from list — skip noisy IR load toasts. */
function isBrandNewDnrFromUrl() {
  return !(dnrId && String(dnrId).trim());
}

function normalizeDnrStatus(s) {
  const x = String(s ?? "")
    .trim()
    .toLowerCase();
  if (x === "cancelled" || x === "canceled") return "cancelled";
  if (x === "submitted") return "submitted";
  if (x === "draft") return "draft";
  return x || "draft";
}

function getStatusText() {
  return (
    document.querySelector(".status-pill")?.textContent?.trim().toLowerCase() || ""
  );
}

function getDnrStatusNorm() {
  const fromServer = window.DNR_RECORD_STATUS;
  if (fromServer) return normalizeDnrStatus(fromServer);

  // fallback → UI badge
  const ui = document.querySelector(".dnr-status-badge")?.textContent;
  if (ui) return normalizeDnrStatus(ui);

  return "draft";
}

function isDnrCommentsEditable() {
  return getDnrStatusNorm() === "draft" && pageMode !== "view";
}

/** Submitted / Cancelled / Draft+View — form must not be editable */
function isDnrFormReadOnly() {
  const st = getDnrStatusNorm();
  return (
    st === "submitted" ||
    st === "cancelled" ||
    (st === "draft" && pageMode === "view")
  );
}

/** Draft opened from list with Edit details — invoice + customer + line identity columns are read-only */
function isDraftEditDetailsFromList() {
  return getDnrStatusNorm() === "draft" && pageMode === "edit";
}

function isDnrCustomerLocked() {
  return isDnrFormReadOnly() || isDraftEditDetailsFromList();
}

function isDnrProductLineLocked() {
  return isDnrFormReadOnly() || isDraftEditDetailsFromList();
}

// =========================================
// DELIVERY NOTE RETURN NEW PAGE JS
// =========================================

// =========================================
// CUSTOMER DROPDOWN
// =========================================
function toggleCustomerDropdown() {
  if (isDnrCustomerLocked()) return;
  const dropdown = document.getElementById("customerNameDropdown");
  if (!dropdown) return;

  dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}

function filterCustomerDropdown() {
  if (isDnrCustomerLocked()) return;
  const input = document.getElementById("customerSearchInput");
  const list = document.querySelectorAll("#customerDropdownList .dropdown-item");

  if (!input) return;
  const filterValue = input.value.toLowerCase();

  list.forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(filterValue) ? "block" : "none";
  });
}

function selectCustomerItem(item) {
  if (isDnrCustomerLocked()) return;
  const selected = document.getElementById("customerNameSelected");
  const customerId = document.getElementById("customerId");
  const customerEmail = document.getElementById("customerEmail");
  const customerPhone = document.getElementById("customerPhone");
  const contactPerson = document.getElementById("contactPerson");
  const dropdown = document.getElementById("customerNameDropdown");

  if (selected) selected.textContent = item.textContent.trim();
  if (customerId) customerId.value = item.dataset.id || "";
  if (customerEmail) customerEmail.value = item.dataset.email || "";
  if (customerPhone) customerPhone.value = item.dataset.phone || "";
  if (contactPerson) contactPerson.value = item.dataset.contact || "";
  if (dropdown) dropdown.style.display = "none";

  validateSubmitButton();
}

// =========================================
// LINE ITEMS — product dropdown (same pattern as New Delivery Note)
// =========================================
function buildDnrLineProductOptions() {
  if (!window.DNR_PRODUCTS || !window.DNR_PRODUCTS.length) {
    return `<option value="">Select Product</option>`;
  }
  const opts = window.DNR_PRODUCTS.map((p) => {
    const pid = String(
      p.product_id || p.id || p.code || p.product_code || p.sku || ""
    ).trim();
    const name = String(p.product_name || p.name || p.title || "").trim();
    if (!pid) return "";
    return `<option value="${pid}">${name ? `${name} (${pid})` : pid}</option>`;
  }).join("");
  return `<option value="">Select Product</option>${opts}`;
}

async function loadDnrProducts() {
  try {
    const res = await fetch("/api/sales-products", { cache: "no-store" });
    const data = await res.json();
    const list =
      data && Array.isArray(data.products)
        ? data.products
        : data && data.data && Array.isArray(data.data.items)
          ? data.data.items
          : Array.isArray(data)
            ? data
            : [];
    window.DNR_PRODUCTS = list;
    const map = {};
    list.forEach((p) => {
      const pid = String(
        p.product_id || p.id || p.code || p.product_code || p.sku || ""
      ).trim();
      if (pid) map[pid] = p;
    });
    window.DNR_PRODUCTS_MAP = map;
    fillDnrLineProductSelects();
  } catch (e) {
    console.error("Failed to load products:", e);
    window.DNR_PRODUCTS = [];
    window.DNR_PRODUCTS_MAP = {};
    fillDnrLineProductSelects();
  }
}

function fillDnrLineProductSelects() {
   window.DNR_PRODUCTS_MAP = {};
  (window.DNR_PRODUCTS || []).forEach(p => {
    const pid = String(p.product_id || p.id || "").trim();
    if (pid) {
      window.DNR_PRODUCTS_MAP[pid] = p;
    }
  });


  const html = buildDnrLineProductOptions();
  document.querySelectorAll("#lineItemsTableBody select.product-name-select").forEach((sel) => {
    const old = sel.value;
    sel.innerHTML = html;
    if (old) sel.value = old;
  });
  if (isDraftEditDetailsFromList()) syncDnrReadOnlyFields();
}

function updateLineItemSerialNumbers() {
  const rows = document.querySelectorAll("#lineItemsTableBody tr");
  rows.forEach((row, index) => {
    const serialCell = row.querySelector(".serial-number-cell");
    if (serialCell) serialCell.textContent = index + 1;
  });
}

function handleProductChange(selectElement) {
  if (isDnrProductLineLocked()) return;
  const row = selectElement.closest("tr");
  if (!row) return;

  const selectedOption =
    selectElement.selectedIndex >= 0
      ? selectElement.options[selectElement.selectedIndex]
      : null;
  const pid = String(selectElement.value || "").trim();

  const productIdCell = row.querySelector(".product-id-cell");
  const uomCell = row.querySelector(".uom-cell");
  const invoicedQtyCell = row.querySelector(".invoiced-qty-cell");
  const serialNoInput = row.querySelector(".serial-no-input");

  if (!pid || !selectedOption) {
    if (productIdCell) productIdCell.textContent = "-";
    if (uomCell) uomCell.textContent = "-";
    if (invoicedQtyCell) invoicedQtyCell.textContent = "0";
    if (serialNoInput) serialNoInput.value = "";
    validateSubmitButton();
    return;
  }

  const ds = selectedOption.dataset;
  const map = window.DNR_PRODUCTS_MAP || {};
  const mapped = map[pid];

  const idOut = ds.productId || pid;
  if (productIdCell) productIdCell.textContent = idOut || "-";

  let uom = "-";
  if (ds.uom) uom = String(ds.uom).trim() || "-";
  else if (mapped) {
    uom = String(mapped.uom || mapped.unit || mapped.unit_of_measure || "").trim() || "-";
  }
  if (uomCell) uomCell.textContent = uom;

  let inv = "0";
  if (ds.invoicedQty !== undefined && String(ds.invoicedQty).trim() !== "") {
    inv = String(ds.invoicedQty);
  }
  if (invoicedQtyCell) invoicedQtyCell.textContent = inv;

  if (serialNoInput) {
    if (ds.serialNo && String(ds.serialNo).trim() !== "" && ds.serialNo !== "N/A") {
      serialNoInput.value = ds.serialNo;
    } else {
      serialNoInput.value = "";
    }
  }

  validateSubmitButton();
}

function attachValidationListenersToRow(row) {
  const inputs = row.querySelectorAll("input, select");
  inputs.forEach(input => {
    input.addEventListener("input", validateSubmitButton);
    input.addEventListener("change", validateSubmitButton);
  });
}

// =========================================
// COMMENTS
// =========================================
function updateCommentButtonState() {
  const commentInput = document.getElementById("commentInput");
  const addCommentBtn = document.getElementById("addCommentBtn");

  if (!commentInput || !addCommentBtn) return;
  if (!isDnrCommentsEditable()) {
    addCommentBtn.disabled = true;
    return;
  }
  addCommentBtn.disabled = commentInput.value.trim() === "";
}

function addComment() {
  if (!isDnrCommentsEditable()) return;

  const commentInput = document.getElementById("commentInput");
  const commentList = document.getElementById("commentList");
  const commentsEmpty = document.getElementById("commentsEmpty");

  if (!commentInput || !commentList || !commentsEmpty) return;

  const commentText = commentInput.value.trim();
  if (!commentText) return;

  const now = new Date();
  const timeString = now.toLocaleString();

  const row = document.createElement("div");
  row.className = "so-ch-row";
  const userName = window.currentUserName || "User";

  row.innerHTML = `
    <div class="so-ch-row-meta">
      <span class="so-ch-row-user">${escapeHtml(userName)}</span>
      <span class="so-ch-row-time">– ${escapeHtml(timeString)}</span>
    </div>
    <div class="so-ch-row-msg"></div>
  `;
  row.querySelector(".so-ch-row-msg").textContent = commentText;

  commentList.prepend(row);
  commentInput.value = "";
  commentsEmpty.style.display = "none";
  updateCommentButtonState();
  validateSubmitButton();
  showToast("Comment added successfully", "success");
}

async function loadHistory() {

  const historyList = document.getElementById("historyList");
  const historyEmpty = document.getElementById("historyEmpty");

  if (!historyList) return;

  const dnrId = document.getElementById("dnrId")?.value;

if (!dnrId) {
  console.log("No DNR ID found");
  return;
}

  try {
    const res = await fetch(`/api/dnr-history/${dnrId}`);
    const data = await res.json();

    historyList.innerHTML = "";

    if (!data.success || !data.history || data.history.length === 0) {
      if (historyEmpty) historyEmpty.style.display = "block";
      return;
    }

    if (historyEmpty) historyEmpty.style.display = "none";

    data.history.forEach(item => {
      const row = document.createElement("div");
      row.className = "so-ch-row";

      row.innerHTML = `
        <div class="so-ch-row-meta">
          <span class="so-ch-row-user">${escapeHtml(item.user || "")}</span>
          <span class="so-ch-row-time">– ${escapeHtml(item.time || "")}</span>
        </div>
        <div class="so-ch-row-msg"></div>
      `;
      row.querySelector(".so-ch-row-msg").textContent = item.action || "";

      historyList.appendChild(row);
    });

  } catch (err) {
    console.error("History load failed", err);
  }
}

// =========================================
// TABS — same as New Sales Order (sales-new.js setActiveTab): .so-ch-pill + .so-ch-panel.hidden
// =========================================
function switchTab(activeTab) {
  const root = document.querySelector(".dnr-new-wrapper");
  const tabs = root
    ? root.querySelectorAll("#dnrCommentHistoryCard .so-ch-topbar .so-ch-pill[data-tab]")
    : [];
  const panels = {
    comments: document.getElementById("comments"),
    history: document.getElementById("history"),
    attachments: document.getElementById("attachments"),
  };

  tabs.forEach((t) => t.classList.remove("active"));
  Object.keys(panels).forEach((key) => {
    const p = panels[key];
    if (!p) return;
    if (key === activeTab) p.classList.remove("hidden");
    else p.classList.add("hidden");
  });

  const tabBtn = root?.querySelector(
    `#dnrCommentHistoryCard .so-ch-topbar .so-ch-pill[data-tab="${activeTab}"]`
  );
  if (tabBtn) tabBtn.classList.add("active");

  if (activeTab === "history") loadHistory();
  if (activeTab === "attachments") loadDnrAttachments();
}

// =========================================
// ATTACHMENTS (same pattern as quotation — upload card, list, view/download/delete)
// =========================================
const MAX_DNR_ATTACHMENTS = 5;
const MAX_DNR_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function getDnrIdFromPage() {
  return (document.getElementById("dnrId")?.value || "").trim();
}

function dnrAttachmentsReadOnly() {
  return isDnrFormReadOnly();
}

function getDnrFileIcon(ext) {
  const icons = {
    pdf: "fa-file-pdf",
    doc: "fa-file-word",
    docx: "fa-file-word",
    xls: "fa-file-excel",
    xlsx: "fa-file-excel",
    jpg: "fa-file-image",
    jpeg: "fa-file-image",
    png: "fa-file-image",
  };
  return icons[ext] || "fa-file";
}

function getDnrFileIconClass(ext) {
  const classes = {
    pdf: "pdf",
    doc: "doc",
    docx: "doc",
    xls: "xls",
    xlsx: "xls",
    jpg: "jpg",
    jpeg: "jpg",
    png: "png",
  };
  return classes[ext] || "default";
}

function applyDnrAttachmentUiMode() {
  const ro = dnrAttachmentsReadOnly();
  const card = document.getElementById("uploadCard");
  const btn = document.getElementById("uploadBtn");
  if (card) {
    card.style.display = ro ? "none" : "block";
    card.style.pointerEvents = ro ? "none" : "auto";
    card.style.opacity = ro ? "0.5" : "1";
  }
  if (btn) {
    btn.style.display = ro ? "none" : "inline-flex";
    btn.disabled = !!ro;
  }
}

function updateDnrAttachmentBadge(count) {
  const tab = document.getElementById("dnrTabAttachments");
  if (!tab) return;
  const existing = tab.querySelector(".attachment-badge");
  if (existing) existing.remove();
  if (count > 0) {
    const badge = document.createElement("span");
    badge.className = "attachment-badge";
    badge.textContent = String(count);
    tab.appendChild(badge);
  }
}

function renderDnrAttachments(files) {
  const filesList = document.getElementById("filesList");
  const fileCount = document.getElementById("fileCount");
  const uploadCard = document.getElementById("uploadCard");
  const uploadBtn = document.getElementById("uploadBtn");
  if (!filesList) return;

  window.currentDnrAttachments = files || [];
  const currentCount = files.length;
  const isFull = currentCount >= MAX_DNR_ATTACHMENTS;
  const ro = dnrAttachmentsReadOnly();

  if (fileCount) {
    fileCount.textContent = `${currentCount} / ${MAX_DNR_ATTACHMENTS} files`;
  }
  if (uploadCard && !ro) {
    uploadCard.style.opacity = isFull ? "0.5" : "1";
    uploadCard.style.pointerEvents = isFull ? "none" : "auto";
    uploadCard.title = isFull ? "Maximum files reached" : "Click or drag to upload";
  }
  if (uploadBtn && !ro) {
    uploadBtn.disabled = isFull;
    uploadBtn.style.opacity = isFull ? "0.5" : "1";
  }

  if (!files || files.length === 0) {
    filesList.innerHTML =
      '<div class="no-files"><i class="fa-regular fa-folder-open"></i><p>No files attached yet</p></div>';
    updateDnrAttachmentBadge(0);
    return;
  }

  let html = "";
  files.forEach((file) => {
    const ext = file.original_filename
      ? file.original_filename.split(".").pop().toLowerCase()
      : "";
    const icon = getDnrFileIcon(ext);
    const iconClass = getDnrFileIconClass(ext);
    const size = formatFileSize(file.size || 0);
    const uploadDate = file.upload_date || "—";
    const id = file.id;
    const delBlock = ro
      ? ""
      : `<button type="button" class="btn-action btn-delete" onclick="openDnrDeleteFileModal(${id})" title="Delete"><i class="fa-solid fa-trash-can"></i></button>`;
    html += `
    <div class="file-item" data-id="${id}">
      <div class="file-info">
        <div class="file-icon ${iconClass}"><i class="fa-solid ${icon}"></i></div>
        <div class="file-details">
          <div class="file-name">${escapeHtml(file.original_filename || "Unknown file")}</div>
          <div class="file-meta">
            <span><i class="fa-regular fa-file"></i> ${escapeHtml(size)}</span>
            <span><i class="fa-regular fa-calendar"></i> ${escapeHtml(uploadDate)}</span>
          </div>
        </div>
      </div>
      <div class="file-actions">
        <button type="button" class="btn-action btn-view" onclick="viewDnrAttachment(${id})" title="View"><i class="fa-regular fa-eye"></i></button>
        <button type="button" class="btn-action btn-download" onclick="downloadDnrAttachment(${id})" title="Download"><i class="fa-solid fa-cloud-arrow-down"></i></button>
        ${delBlock}
      </div>
    </div>`;
  });
  filesList.innerHTML = html;
  updateDnrAttachmentBadge(files.length);
}

async function loadDnrAttachments() {
  const id = getDnrIdFromPage();
  const filesList = document.getElementById("filesList");
  if (!id) {
    renderDnrAttachments([]);
    return;
  }
  if (filesList) {
    filesList.innerHTML =
      '<div class="loading-files"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading attachments...</p></div>';
  }
  try {
    const res = await fetch(`/api/dnr-attachments/${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = await res.json();
    if (data.success) {
      renderDnrAttachments(data.attachments || []);
    } else {
      renderDnrAttachments([]);
    }
  } catch (_e) {
    renderDnrAttachments([]);
  }
}

function showDnrUploading(filename) {
  const filesList = document.getElementById("filesList");
  if (!filesList) return;
  const prev = filesList.querySelector(".file-item.uploading");
  if (prev) prev.remove();
  const uploading = document.createElement("div");
  uploading.className = "file-item uploading";
  uploading.innerHTML = `
    <div class="file-info">
      <div class="file-icon default"><i class="fa-solid fa-spinner fa-spin"></i></div>
      <div class="file-details">
        <div class="file-name">${escapeHtml(filename)}</div>
        <div class="file-meta"><span>Uploading...</span></div>
      </div>
    </div>`;
  filesList.insertBefore(uploading, filesList.firstChild);
}

function removeDnrUploading() {
  const u = document.querySelector("#filesList .file-item.uploading");
  if (u) u.remove();
}

function validateDnrUploadFile(file) {
  if (file.size > MAX_DNR_FILE_SIZE_BYTES) {
    showToast(`${file.name} exceeds 10MB limit`, "error");
    return false;
  }
  const allowed = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png"];
  const ext = file.name.split(".").pop().toLowerCase();
  if (!allowed.includes(ext)) {
    showToast(`${file.name} type not allowed. Allowed: PDF, DOC, XLS, JPG, PNG`, "error");
    return false;
  }
  return true;
}

async function uploadDnrFile(file) {
  if (!validateDnrUploadFile(file)) return;
  const dnr_id = getDnrIdFromPage();
  if (!dnr_id) {
    showToast("DNR ID missing", "error");
    return;
  }
  showDnrUploading(file.name);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("dnr_id", dnr_id);
  try {
    const response = await fetch("/api/dnr-upload-attachment", { method: "POST", body: formData });
    const data = await response.json();
    if (data.success) {
      showToast(`${file.name} uploaded successfully!`, "success");
      await loadDnrAttachments();
    } else {
      showToast(`Upload failed: ${data.error || "Unknown error"}`, "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Upload failed. Please try again.", "error");
  } finally {
    removeDnrUploading();
  }
}

async function uploadDnrFiles(fileList) {
  for (const file of fileList) {
    if (file.size > MAX_DNR_FILE_SIZE_BYTES) {
      showToast(`${file.name} exceeds 10MB limit`, "error");
      continue;
    }
    await uploadDnrFile(file);
  }
}

function initializeDnrAttachments() {
  const fileInput = document.getElementById("fileInput");
  const uploadCard = document.getElementById("uploadCard");
  const uploadBtn = document.getElementById("uploadBtn");
  const filesList = document.getElementById("filesList");
  if (!fileInput || !uploadCard || !uploadBtn || !filesList) return;

  applyDnrAttachmentUiMode();

  function isMaxFilesReached() {
    const n = window.currentDnrAttachments ? window.currentDnrAttachments.length : 0;
    return n >= MAX_DNR_ATTACHMENTS;
  }

  uploadCard.addEventListener("click", (e) => {
    e.preventDefault();
    if (dnrAttachmentsReadOnly()) return;
    if (isMaxFilesReached()) {
      showToast(`Maximum ${MAX_DNR_ATTACHMENTS} files allowed`, "warning");
      return;
    }
    fileInput.click();
  });

  uploadBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (dnrAttachmentsReadOnly()) return;
    if (isMaxFilesReached()) {
      showToast(`Maximum ${MAX_DNR_ATTACHMENTS} files allowed`, "warning");
      return;
    }
    fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    const currentCount = window.currentDnrAttachments ? window.currentDnrAttachments.length : 0;
    if (currentCount + files.length > MAX_DNR_ATTACHMENTS) {
      showToast(
        `Cannot upload ${files.length} file(s). Maximum ${MAX_DNR_ATTACHMENTS} files allowed. You have ${currentCount} file(s).`,
        "warning"
      );
      fileInput.value = "";
      return;
    }
    if (files.length > 0) uploadDnrFiles(files);
    fileInput.value = "";
  });

  uploadCard.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (dnrAttachmentsReadOnly()) return;
    uploadCard.style.borderColor = "#007bff";
    uploadCard.style.background = "#f0f7ff";
  });
  uploadCard.addEventListener("dragleave", (e) => {
    e.preventDefault();
    uploadCard.style.borderColor = "#ddd";
    uploadCard.style.background = "#f8f9fa";
  });
  uploadCard.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadCard.style.borderColor = "#ddd";
    uploadCard.style.background = "#f8f9fa";
    if (dnrAttachmentsReadOnly()) return;
    const files = Array.from(e.dataTransfer.files || []);
    const currentCount = window.currentDnrAttachments ? window.currentDnrAttachments.length : 0;
    if (currentCount + files.length > MAX_DNR_ATTACHMENTS) {
      showToast(`Cannot upload ${files.length} file(s). Maximum ${MAX_DNR_ATTACHMENTS} files allowed.`, "warning");
      return;
    }
    if (files.length > 0) uploadDnrFiles(files);
  });

  loadDnrAttachments();
}

window.viewDnrAttachment = function (id) {
  window.open(`/api/dnr-attachment/${id}/view`, "_blank");
};

window.downloadDnrAttachment = function (id) {
  window.location.href = `/api/dnr-attachment/${id}/download`;
};

window.deleteDnrAttachment = async function (id) {
  try {
    const response = await fetch(`/api/dnr-attachment/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (data.success) {
      showToast("File deleted successfully", "success");
      await loadDnrAttachments();
    } else {
      showToast(`Delete failed: ${data.error || "Unknown error"}`, "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Delete failed. Please try again.", "error");
  }
};

let _dnrPendingDeleteAttachmentId = null;

window.openDnrDeleteFileModal = function (id) {
  _dnrPendingDeleteAttachmentId = id;
  const backdrop = document.getElementById("dnrDeleteFileBackdrop");
  if (backdrop) backdrop.style.display = "flex";
};

window.closeDnrDeleteFileModal = function () {
  _dnrPendingDeleteAttachmentId = null;
  const backdrop = document.getElementById("dnrDeleteFileBackdrop");
  if (backdrop) backdrop.style.display = "none";
};

/// =========================================
// SUBMIT VALIDATION
// =========================================
function validateSubmitButton() {
  const dnrDate = document.getElementById("dnrDate");
  const customerNameSelected = document.getElementById("customerNameSelected");
  const submitBtn = document.getElementById("submitBtn");
  const firstRow = document.querySelector("#lineItemsTableBody tr");

  if (!submitBtn) return;

  const st = getDnrStatusNorm();
  if (st !== "draft" || pageMode === "view") {
    submitBtn.disabled = true;
    return;
  }

  // =========================================
  // EDIT MODE VALIDATION
  // =========================================
  if (pageMode === "edit") {
    let isValid = true;
    if (!firstRow) {
      submitBtn.disabled = true;
      return;
    }

    if (!dnrDate || dnrDate.value.trim() === "") isValid = false;

    if (
      !customerNameSelected ||
      customerNameSelected.textContent.trim() === "Select Customer"
    ) {
      isValid = false;
    }

    const customerId = document.getElementById("customerId");
    if (!customerId || customerId.value.trim() === "") isValid = false;

    const customerRefNo = document.getElementById("customerRefNo");
    if (!customerRefNo || customerRefNo.value.trim() === "") isValid = false;

    if (firstRow) {
  const productName = firstRow.children[1]?.textContent.trim();
  const productId = firstRow.children[2]?.textContent.trim();
  const uom = firstRow.children[3]?.textContent.trim();
  const retQtyInput = firstRow.querySelector(".returned-qty-input");
  const returnedQty = retQtyInput
    ? parseInt(retQtyInput.value || "0", 10)
    : parseInt(firstRow.children[5]?.textContent || "0", 10);
  const reasonInput = firstRow.querySelector(".reason-input");
  const reason = reasonInput
    ? reasonInput.value.trim()
    : (firstRow.children[7]?.textContent || "").trim();

  if (!productName || productName === "-" || !productId || productId === "-") {
    isValid = false;
  }

  if (!uom || uom === "-") {
  isValid = false;
}

  if (isNaN(returnedQty) || returnedQty <= 0) {
    isValid = false;
  }

  if (!reason || reason === "-" || reason === "") {
    isValid = false;
  }

    } else {
      isValid = false;
    }

    submitBtn.disabled = !isValid;
    return;
  }

  // =========================================
  // NEW MODE VALIDATION
  // =========================================
  let isValid = true;

  if (!dnrDate || dnrDate.value.trim() === "") isValid = false;

  const customerRefNo = document.getElementById("customerRefNo");
  if (!customerRefNo || customerRefNo.value.trim() === "") isValid = false;

  if (
    !customerNameSelected ||
    customerNameSelected.textContent.trim() === "Select Customer"
  ) {
    isValid = false;
  }

  if (firstRow) {
  const productCell = firstRow.children[1];

  const returnedQtyInput = firstRow.querySelector(".returned-qty-input");
  const reasonInput = firstRow.querySelector(".reason-input");

  const returnedQtyCell = firstRow.querySelector(".returned-qty-cell");
  const reasonCell = firstRow.querySelector(".reason-cell");

  // ✅ PRODUCT
  if (
    !productCell ||
    productCell.textContent.trim() === "" ||
    productCell.textContent.trim() === "-"
  ) {
    isValid = false;
  }

  // ✅ RETURN QTY (input OR text)
  let returnedQty = 0;

  if (returnedQtyInput) {
    returnedQty = Number(returnedQtyInput.value);
  } else if (returnedQtyCell) {
    returnedQty = Number(returnedQtyCell.textContent);
  }

  if (!returnedQty || returnedQty <= 0) {
    isValid = false;
  }

  // ✅ REASON (input OR text)
  let reason = "";

  if (reasonInput) {
    reason = reasonInput.value.trim();
  } else if (reasonCell) {
    reason = reasonCell.textContent.trim();
    
  }

  if (!reason) {
    isValid = false;
  }

} else {
  isValid = false;
}
  // =========================================
  // COMMENT CHECK (new mode only)
  // =========================================
  if (pageMode === "new") {
    const commentList = document.getElementById("commentList");
    const hasAddedComment =
      commentList && commentList.querySelectorAll(".so-ch-row").length > 0;
    if (!hasAddedComment) isValid = false;
  }

  submitBtn.disabled = !isValid;
}
// =========================================
// ACTIONS (saveDraftDnr / openDnrPdf / sendDnrEmail defined below)
// =========================================
async function readDnrApiJson(res) {
  const text = await res.text();
  if (!text) {
    return { success: false, message: res.statusText || `Request failed (${res.status})` };
  }
  try {
    const parsed = JSON.parse(text);
    if (!res.ok) {
      parsed.success = false;
      if (!parsed.message) {
        parsed.message = `HTTP ${res.status}`;
      }
    }
    return parsed;
  } catch {
    return { success: false, message: text.slice(0, 300) || `Request failed (${res.status})` };
  }
}

function collectDnrLineItems() {
  const rows = document.querySelectorAll("#lineItemsTableBody tr");
  const items = [];
  rows.forEach(row => {
    const cells = row.querySelectorAll("td");
    const retQtyInput = row.querySelector(".returned-qty-input");
    const reasonInput = row.querySelector(".reason-input");
    items.push({
      product_id: cells[2]?.textContent?.trim() || null,
      product_name: cells[1]?.textContent?.trim() || null,
      uom: cells[3]?.textContent?.trim() || null,
      invoice_quantity: parseFloat(cells[4]?.textContent) || 0,
      return_quantity: retQtyInput ? parseFloat(retQtyInput.value) || 0 : parseFloat(cells[5]?.textContent) || 0,
      serial_number: cells[6]?.textContent.trim() || "",
      return_reason: reasonInput ? reasonInput.value.trim() : cells[7]?.textContent.trim() || ""
    });
  });
  console.log("FINAL ITEMS:", items);
  return items;
}

/**
 * @param {string} status
 * @param {{ syncComments?: boolean }} [options] - syncComments false: omit comments + set sync_comments=false so server keeps existing DB comments
 */
function buildDnrPayload(status, options = {}) {
  const syncComments = options.syncComments !== false;
  const data = {
    dnr_id: document.getElementById("dnrId").value,
    dnr_date: document.getElementById("dnrDate").value,
    invoice_ref: document.getElementById("invoiceReturnReferenceId").value,
    customer_ref_no: document.getElementById("customerRefNo")?.value || "",
    customer_name: document.getElementById("customerNameSelected")?.textContent?.trim() || "",
    customer_id: document.getElementById("customerId").value,
    customer_email: document.getElementById("customerEmail").value,
    customer_phone: document.getElementById("customerPhone").value,
    contact_person: document.getElementById("contactPerson").value,
    status,
    items: collectDnrLineItems(),
  };
  if (syncComments) {
    const comments = [];
    document.querySelectorAll("#commentList .so-ch-row").forEach((row) => {
      comments.push({
        user: row.querySelector(".so-ch-row-user")?.innerText,
        message: row.querySelector(".so-ch-row-msg")?.innerText,
        time: row.querySelector(".so-ch-row-time")?.innerText,
      });
    });
    data.comments = comments;
  } else {
    data.sync_comments = false;
  }
  return data;
}

async function submitDnr() {
  if (getDnrStatusNorm() !== "draft" || pageMode === "view") return;
  const submitBtn = document.getElementById("submitBtn");
  if (!submitBtn || submitBtn.style.display === "none") return;
  validateSubmitButton();
  if (submitBtn.disabled) {
    showToast("Please fill all required fields, then add at least one comment using Add New before submitting.", "error");
    return;
  }
  try {
    const res = await fetch("/api/save-dnr-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildDnrPayload("Submitted")),
    });
    const result = await readDnrApiJson(res);
    if (result.success) {
      if (result.database) {
        console.info("DNR saved to database:", result.database, "dnr_id:", result.dnr_id);
      }
      // Success toast only on list page (/deliverynote_return) via ?toast= — avoid flash on this page
      const message = encodeURIComponent("Delivery Note Return submitted successfully.");
      const type = encodeURIComponent("success");
      window.location.href = `/deliverynote_return?toast=${message}&toastType=${type}`;
    } else {
      showToast(result.message || "Submit failed", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Server error while submitting", "error");
  }
}

// =========================================
// CANCEL MODAL
// =========================================
function openCancelDnrModal() {
  const btn = document.getElementById("cancelDnrBtn");
  if (btn?.disabled) return;
  const backdrop = document.getElementById("cancelDnrBackdrop");
  if (backdrop) backdrop.style.display = "flex";
}

function closeCancelDnrModal() {
  const backdrop = document.getElementById("cancelDnrBackdrop");
  const reasonBox = document.getElementById("cancelDnrReason");

  if (backdrop) backdrop.style.display = "none";
  if (reasonBox) reasonBox.value = "";
}

async function confirmCancelDnr() {
  const reasonBox = document.getElementById("cancelDnrReason");
  const reason = reasonBox ? reasonBox.value.trim() : "";

  if (!reason) {
    showToast("Please enter cancellation reason.", "error");
    return;
  }

  const dnrIdEl = document.getElementById("dnrId");
  if (!dnrIdEl || !String(dnrIdEl.value || "").trim()) {
    showToast("DNR ID missing", "error");
    return;
  }

  closeCancelDnrModal();

  try {
    const payload = buildDnrPayload("Cancelled", { syncComments: false });
    payload.history_description = `Cancelled: ${reason}`.slice(0, 4000);

    const res = await fetch("/api/save-dnr-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await readDnrApiJson(res);
    if (!result.success) {
      showToast(result.message || "Could not cancel delivery note return", "error");
      return;
    }
    const message = encodeURIComponent("Delivery Note Return cancelled");
    const type = encodeURIComponent("success");
    window.location.href = `/deliverynote_return?toast=${message}&toastType=${type}`;
  } catch (e) {
    console.error(e);
    showToast("Server error while cancelling", "error");
  }
}

// =========================================
// STATUS BADGE
// =========================================
function setStatusBadge(statusText, statusClass) {
  const badge = document.getElementById("dnrStatusBadge");
  if (!badge) return;

  badge.textContent = statusText;
  badge.className = "dn2-status-pill dnr-status-badge";
  badge.classList.remove("dnr-status-hidden");
  badge.classList.add(statusClass);
}

// =========================================
// HELPERS
// =========================================
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


// =========================================
// URL helpers + optional autofill from DN (?dn_id=)
// =========================================
function getParam(name) {
  return new URL(window.location.href).searchParams.get(name);
}

async function loadDeliveryNoteData() {
  const dnId = getParam("dn_id");
  if (!dnId) return;

  try {
    const res = await fetch(`/api/delivery-note/${encodeURIComponent(dnId)}`);
    const data = await res.json();

    if (!data.success) return;

    const dn = data.item;

    const cref = document.getElementById("customerRefNo");
    if (cref) cref.value = dn.customer_ref_no || "";

    const cid = document.getElementById("customerId");
    if (cid) cid.value = dn.customer_id || "";

    const email = document.getElementById("customerEmail");
    if (email) email.value = dn.customer_email || "";

    const phone = document.getElementById("customerPhone");
    if (phone) phone.value = dn.customer_phone || "";

    const contact = document.getElementById("contactPerson");
   
    if (contact) {
      if (contact && (!contact.value || contact.value.trim() === "")) {
      contact.value = dn.contact_person || "";
    }
    }
    const selected = document.getElementById("customerNameSelected");
    if (selected) selected.textContent = dn.customer_name || "Select Customer";

    validateSubmitButton();
  } catch (err) {
    console.error("Failed to load Delivery Note for autofill", err);
  }
}

function populateLineItemsFromInvoiceReturn(items) {
  console.log("ITEMS:", items);

  const tableBody = document.getElementById("lineItemsTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  const isReadOnly = isDnrFormReadOnly();

  (items || []).forEach((item, index) => {
    const tr = document.createElement("tr");

    const pid = escapeHtml(String(item.product_id || ""));
    const pName = escapeHtml(String(item.product_name || ""));
    const uom = escapeHtml(String(item.uom || ""));
    const retQty = item.return_quantity ?? 0;
    const reason = escapeHtml(String(item.return_reason ?? ""));
    const serial = escapeHtml(String(item.serial_number ?? ""));
    const invQty = item.invoice_quantity ?? 0;

    const retQtyCell = isReadOnly
      ? `<td class="returned-qty-cell">${retQty}</td>`
      : `<td class="returned-qty-cell"><input type="number" class="returned-qty-input" min="0" value="${retQty}"></td>`;

    const reasonCell = isReadOnly
      ? `<td class="reason-cell">${reason}</td>`
      : `<td class="reason-cell"><input type="text" class="reason-input" value="${reason}"></td>`;

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td class="product-name-cell" data-value="${pName}">${pName || "-"}</td>
      <td class="product-id-cell" data-value="${pid}">${pid || "-"}</td>
      <td class="uom-cell" data-value="${uom}">${uom || "-"}</td>
      <td class="invoiced-qty-cell">${invQty}</td>
      ${retQtyCell}
      <td class="serial-cell">${serial}</td>
      ${reasonCell}
    `;

    tableBody.appendChild(tr);
    attachValidationListenersToRow(tr);
  });

  setTimeout(() => validateSubmitButton(), 100);
}

async function applyInvoiceReturnSelection() {
  const sel = document.getElementById("invoiceReturnReferenceId");
  if (!sel || !sel.value) {
    populateLineItemsFromInvoiceReturn([]);
    return;
  }
  try {
    const res = await fetch(`/api/invoice-return/${encodeURIComponent(sel.value)}`);
    const data = await res.json();
    console.log("ITEMS:", data.items);
    if (!data.success || !data.invoice_return) {
      showToast("Invoice return data not found", "error");
      populateLineItemsFromInvoiceReturn([]);
      return;
    }
    const ir = data.invoice_return;
    const nameEl = document.getElementById("customerNameSelected");
    if (nameEl) nameEl.textContent = ir.customer_name || "Select Customer";
    const cid = document.getElementById("customerId");
    if (cid) {
      const v = ir.customer_id;
      cid.value = v != null && v !== "" ? String(v) : "";
    }
    const email = document.getElementById("customerEmail");
    if (email) email.value = ir.email || "";
    const phone = document.getElementById("customerPhone");
    if (phone) phone.value = ir.phone || "";
    const contact = document.getElementById("contactPerson");
    if (contact && (!contact.value || contact.value.trim() === "")) {
      contact.value = ir.contact_person || "";
    }
    const cref = document.getElementById("customerRefNo");
    if (cref) cref.value = ir.customer_ref_no || "";

    // Lock customer fields — all data comes from IR, user must not edit
    ["customerId", "customerEmail", "customerPhone", "contactPerson"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.readOnly = true;
    });
    const nameEl2 = document.getElementById("customerNameSelected");
    if (nameEl2) {
      nameEl2.style.pointerEvents = "none";
      nameEl2.style.opacity = "0.85";
    }

    const rawItems = Array.isArray(data.items) ? data.items : [];

    const items = rawItems.map(i => ({
    product_id: i.product_id || "-",
    product_name: i.product_name || "-",


    uom: i.uom || i.unit || i.uom_name || "Nos",

    invoice_quantity: i.invoiced_qty || i.invoice_quantity || 0,
    return_quantity: i.returned_qty || i.return_quantity || 0,
    serial_number: i.serial_no || i.serial_number || "",
    return_reason: i.return_reason || ""
  }));

    console.log("FINAL ITEMS:", items);

    populateLineItemsFromInvoiceReturn(items);

    if (isBrandNewDnrFromUrl()) {
      if (items.length > 0) {
        showToast("Invoice return loaded successfully", "success");
      } else {
        showToast("Invoice return loaded — no line items on this return", "warning");
      }
    }
    validateSubmitButton();
    syncDnrReadOnlyFields();
  } catch (e) {
    console.error("Invoice return detail failed", e);
    showToast("Failed to load invoice return", "error");
    populateLineItemsFromInvoiceReturn([]);
  }
}

// =========================================
// INITIALIZE
// =========================================
document.addEventListener("DOMContentLoaded", () => {
  loadInvoiceReturnOptions();
  const today = new Date().toISOString().split("T")[0];
  const dnrDate = document.getElementById("dnrDate");
  const commentInput = document.getElementById("commentInput");
  if (dnrDate) dnrDate.value = today;

  if (commentInput) {
    commentInput.addEventListener("input", updateCommentButtonState);
  }

  document
    .querySelectorAll("#dnrCommentHistoryCard .so-ch-topbar .so-ch-pill[data-tab]")
    .forEach((tabBtn) => {
      tabBtn.addEventListener("click", () => {
        const name = tabBtn.getAttribute("data-tab");
        if (name) switchTab(name);
      });
    });

  initializeDnrAttachments();

  document.getElementById("dnrDeleteFileCancelBtn")?.addEventListener("click", () => {
    closeDnrDeleteFileModal();
  });
  document.getElementById("dnrDeleteFileConfirmBtn")?.addEventListener("click", async () => {
    if (_dnrPendingDeleteAttachmentId != null) {
      await window.deleteDnrAttachment(_dnrPendingDeleteAttachmentId);
    }
    closeDnrDeleteFileModal();
  });

  document.querySelectorAll("#lineItemsTableBody tr").forEach(row => {
    attachValidationListenersToRow(row);
  });

  document.addEventListener("click", function (event) {
    const customerDropdown = document.querySelector(".custom-dropdown");
    const customerMenu = document.getElementById("customerNameDropdown");

    if (customerDropdown && !customerDropdown.contains(event.target) && customerMenu) {
      customerMenu.style.display = "none";
    }
  });

  if (!dnrId) handleMode();
  validateSubmitButton();
  updateCommentButtonState();

  document.getElementById("pdfBtn")?.addEventListener("click", openDnrPdf);
  document.getElementById("emailBtn")?.addEventListener("click", () => {
    sendDnrEmail().catch((e) => console.error(e));
  });

  document.getElementById("invoiceReturnReferenceId")?.addEventListener("change", (e) => {

  
  if (pageMode === "edit") return;

  applyInvoiceReturnSelection().catch((e) => console.error(e));
});

  (async () => {
    await loadDeliveryNoteData();
    if (dnrId) await loadDNRDetails(dnrId);

    setTimeout(() => {
      validateSubmitButton();
    }, 200);
  })();

  const paramsToast = new URLSearchParams(window.location.search);
  const toastMessage = paramsToast.get("toast");
  if (toastMessage) {
    showToast(decodeURIComponent(toastMessage));
  }
});



async function loadDNRDetails(id) {
  try {
    const res = await fetch(`/api/delivery-note-return/${encodeURIComponent(id)}`);
    const raw = await readDnrApiJson(res);
    if (!raw.success) return;
    const data = raw.data || raw;
    if (!data || !data.dnr_id) return;
    const el = (x) => document.getElementById(x);
    if (el("dnrId") && data.dnr_id != null) el("dnrId").value = data.dnr_id;
    const dateVal = data.date || data.return_date || data.dnr_date;
    if (el("dnrDate") && dateVal) el("dnrDate").value = String(dateVal).slice(0, 10);
    const sel = el("customerNameSelected");
    if (sel && data.customer_name) sel.textContent = data.customer_name;
    const cid = el("customerId");
      if (cid) {
        const v = data.customer_id;
        cid.value = v != null && v !== "" ? String(v) : "";
      }
    if (el("customerEmail") && data.email != null) el("customerEmail").value = data.email;
    if (el("customerPhone") && data.phone != null) el("customerPhone").value = data.phone;
    const contact = el("contactPerson");
    if (contact && (!contact.value || contact.value.trim() === "")) {
      contact.value = data.contact_person || "";
    }
    if (el("customerRefNo") && data.customer_ref_no != null) el("customerRefNo").value = data.customer_ref_no;

    window.DNR_RECORD_STATUS = data.status || "";
    const st = getDnrStatusNorm();
    if (st === "submitted") setStatusBadge("Submitted", "dnr-status-submitted");
    else if (st === "cancelled") setStatusBadge("Cancelled", "dnr-status-cancelled");
    else setStatusBadge("Draft", "dnr-status-draft");

    const irRef = data.invoice_return_ref_id || data.invoice_return_ref;
    const invSel = el("invoiceReturnReferenceId");
    if (invSel && irRef) {
      // Ensure the option exists (it may be filtered out in new-mode dropdown)
      if (!invSel.querySelector(`option[value="${irRef}"]`)) {
        const opt = document.createElement("option");
        opt.value = irRef;
        opt.textContent = irRef;
        invSel.appendChild(opt);
      }
      invSel.value = irRef;
    }

    if (Array.isArray(data.items) && data.items.length > 0) {
      console.log("DNR DB ITEMS:", data.items);
      populateLineItemsFromInvoiceReturn(
        (data.items || []).map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          uom: item.uom,
          invoice_quantity: item.invoiced_qty,   // ✅ FIX
          return_quantity: item.returned_qty,    // ✅ FIX
          serial_number: item.serial_no,         // ✅ FIX
          return_reason: item.return_reason || item.reason  // ✅ FIX
        }))
      );
    }
    if (data.comments) loadComments(data.comments);
    handleMode();
    setTimeout(() => {
      validateSubmitButton();
    }, 200);
    applyDnrToolbarUi();
  } catch (_e) {
    console.warn("DNR detail load failed");
  }
}

function syncDnrReadOnlyFields() {
  const wrap = document.querySelector(".dnr-new-wrapper");
  if (!wrap) return;

  const fullRo = isDnrFormReadOnly();
  const partialDraftEdit = isDraftEditDetailsFromList();

  wrap.classList.toggle("dnr-page-readonly", fullRo);
  wrap.classList.toggle("dnr-draft-edit-partial", partialDraftEdit && !fullRo);

  const drop = document.getElementById("customerNameDropdown");
  if (drop && (fullRo || partialDraftEdit)) drop.style.display = "none";

  const clearLineCellLocks = () => {
    wrap.querySelectorAll(".dnr-draft-line-cell-lock").forEach((td) => {
      td.classList.remove("dnr-draft-line-cell-lock");
    });
  };

  if (fullRo) {
    clearLineCellLocks();
    const editable = false;
    const ro = true;
    wrap.querySelectorAll(".dn2-card input, .dn2-card select, .dn2-card textarea").forEach((el) => {
      if (el.type === "hidden") return;
      if (el.id === "dnrId") {
        el.readOnly = true;
        el.setAttribute("readonly", "readonly");
        return;
      }
      el.disabled = ro;
    });
    wrap.querySelectorAll("#lineItemsTableBody input, #lineItemsTableBody select").forEach((el) => {
      el.disabled = ro;
    });
    const ddSelFull = document.getElementById("customerNameSelected");
    if (ddSelFull) {
      ddSelFull.style.pointerEvents = "none";
      ddSelFull.style.opacity = "0.85";
      ddSelFull.setAttribute("aria-disabled", "true");
    }
    const commentInputFull = document.getElementById("commentInput");
    if (commentInputFull) {
      commentInputFull.disabled = !editable || !isDnrCommentsEditable();
    }
    return;
  }

  wrap.querySelectorAll(".dn2-card input, .dn2-card select, .dn2-card textarea").forEach((el) => {
    if (el.type === "hidden") return;
    if (el.id === "dnrId") {
      el.readOnly = true;
      el.setAttribute("readonly", "readonly");
      return;
    }
    el.disabled = false;
  });
  wrap.querySelectorAll("#lineItemsTableBody input, #lineItemsTableBody select").forEach((el) => {
    el.disabled = false;
  });
  clearLineCellLocks();

  const ddSel = document.getElementById("customerNameSelected");
  if (ddSel) {
    ddSel.style.pointerEvents = "";
    ddSel.style.opacity = "";
    ddSel.setAttribute("aria-disabled", "false");
  }

  const invSel = document.getElementById("invoiceReturnReferenceId");
  const custSearch = document.getElementById("customerSearchInput");

  if (partialDraftEdit) {
    if (invSel) invSel.disabled = true;
    ["customerEmail", "customerPhone", "contactPerson"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = true;
    });
    if (ddSel) {
      ddSel.style.pointerEvents = "none";
      ddSel.style.opacity = "0.85";
      ddSel.setAttribute("aria-disabled", "true");
    }
    if (custSearch) custSearch.disabled = true;

    wrap.querySelectorAll("#lineItemsTableBody select.product-name-select").forEach((sel) => {
      sel.disabled = true;
    });
    wrap.querySelectorAll("#lineItemsTableBody tr").forEach((row) => {
      row.querySelectorAll(".prodIdCell, .uomCell, .invoiced-qty-cell").forEach((td) => {
        td.classList.add("dnr-draft-line-cell-lock");
      });
    });
  } else {
    if (invSel) invSel.disabled = false;
    if (custSearch) custSearch.disabled = false;
  }

  const commentInput = document.getElementById("commentInput");
  if (commentInput) {
    commentInput.disabled = !isDnrCommentsEditable();
  }
}

function applyDnrToolbarUi() {
  const st = getDnrStatusNorm();
  const isDraft = st === "draft";
  const isSubmitted = st === "submitted";

  const saveDraftBtn = document.getElementById("saveDraftBtn");
  const submitBtn = document.getElementById("submitBtn");
  const pdfBtn = document.getElementById("pdfBtn");
  const emailBtn = document.getElementById("emailBtn");
  const cancelDnrBtn = document.getElementById("cancelDnrBtn");
  const cancelBackBtn = document.getElementById("dnrFooterCancelBtn");

  if (cancelBackBtn) {
    cancelBackBtn.disabled = false;
    cancelBackBtn.style.opacity = "";
  }

  const showDraftSubmit = isDraft;
  if (saveDraftBtn) {
    saveDraftBtn.style.display = showDraftSubmit ? "" : "none";
    saveDraftBtn.disabled = !showDraftSubmit;
  }
  if (submitBtn) {
    submitBtn.style.display = showDraftSubmit ? "inline-block" : "none";
    if (!showDraftSubmit) submitBtn.disabled = true;
  }

  if (pdfBtn) {
    pdfBtn.disabled = !isSubmitted;
    pdfBtn.style.opacity = isSubmitted ? "" : "0.45";
  }
  if (emailBtn) {
    emailBtn.disabled = !isSubmitted;
    emailBtn.style.opacity = isSubmitted ? "" : "0.45";
  }
  // Cancel DNR: Submitted (view), or Draft in edit mode — not Cancelled / not draft+view
  const canCancelDnr =
    isSubmitted || (isDraft && pageMode === "edit");
  if (cancelDnrBtn) {
    cancelDnrBtn.disabled = !canCancelDnr;
    cancelDnrBtn.style.opacity = canCancelDnr ? "" : "0.45";
  }

  updateCommentButtonState();
}

function handleMode() {
  syncDnrReadOnlyFields();
  applyDnrToolbarUi();
  applyDnrAttachmentUiMode();
  loadDnrAttachments();
}

function loadComments(existingComments) {

  const commentList = document.getElementById("commentList");
  const commentsEmpty = document.getElementById("commentsEmpty");

  if (!existingComments || existingComments.length === 0) {
    if (commentList) commentList.innerHTML = "";
    if (commentsEmpty) commentsEmpty.style.display = "block";
    validateSubmitButton();
    return;
  }

  commentList.innerHTML = "";

  existingComments.forEach(c => {
    const row = document.createElement("div");
    row.className = "so-ch-row";

    row.innerHTML = `
      <div class="so-ch-row-meta">
        <span class="so-ch-row-user">${escapeHtml(c.user || "")}</span>
        <span class="so-ch-row-time">– ${escapeHtml(c.time || "")}</span>
      </div>
      <div class="so-ch-row-msg"></div>
    `;
    row.querySelector(".so-ch-row-msg").textContent = c.message || "";

    commentList.appendChild(row);
  });

  if (commentsEmpty) commentsEmpty.style.display = "none";
  validateSubmitButton();
}

// =========================================================
// GO BACK TO (cancel button)DELIVERY NOTE RETURN LIST PAGE
// =========================================================
function goBackToDnrList(){
  window.location.href = "/deliverynote_return";
}
// ===================================================
// SAVE DRAFT DELIVERY NOTE RETURN
// ===================================================

async function saveDraftDnr() {
  const saveDraftBtn = document.getElementById("saveDraftBtn");
  if (!saveDraftBtn || saveDraftBtn.style.display === "none" || saveDraftBtn.disabled) return;
  if (getDnrStatusNorm() !== "draft" || pageMode === "view") return;

  const data = buildDnrPayload("Draft");

  try {
    const res = await fetch("/api/save-dnr-draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await readDnrApiJson(res);

    if (result.success) {
      if (result.database) {
        console.info("DNR draft saved to database:", result.database, "dnr_id:", result.dnr_id);
      }
      const message = encodeURIComponent("Delivery Note Return saved as Draft");
      const type = encodeURIComponent("success");
      setTimeout(() => {
        window.location.href = `/deliverynote_return?toast=${message}&toastType=${type}`;
      }, 800);
    } else {
      showToast(result.message || "Failed to save draft", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Server error while saving draft", "error");
  }
}

// ===============================================
// TOAST (same pattern as new-invoice.js — success-notification)
// ===============================================
function showToast(message, type = "success") {
  if (!message) return;
  let className = "success-notification";
  if (type === "error" || type === "warning") {
    className = "error-notification";
  } else if (type !== "success") {
    return;
  }

  const toast = document.createElement("div");
  toast.className = className;
  toast.textContent = message;

  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

function openDnrPdf() {
  const pdfBtn = document.getElementById("pdfBtn");
  if (pdfBtn?.disabled) return;

  const id = document.getElementById("dnrId").value;

  if (!id) {
    showToast("DNR ID missing", "error");
    return;
  }

  window.open(`/api/delivery-note-returns/${encodeURIComponent(id)}/pdf`, "_blank");
}

async function sendDnrEmail() {
  const emailBtn = document.getElementById("emailBtn");
  if (emailBtn?.disabled) return;

  const id = document.getElementById("dnrId").value;

  if (!id) {
    showToast("DNR ID missing", "error");
    return;
  }

  const res = await fetch(`/api/delivery-note-returns/${encodeURIComponent(id)}/email`, {
    method: "POST",
  });

  const data = await readDnrApiJson(res);

  if (data.success) {
    showToast("Email sent successfully", "success");
  } else {
    showToast(data.message || "Email failed", "error");
  }

}


async function loadInvoiceReturnOptions() {
  const sel = document.getElementById("invoiceReturnReferenceId");

  if (!sel) return;

  try {
    const [irRes, dnrRes] = await Promise.all([
      fetch("/api/invoice-returns"),
      fetch("/api/delivery-note-returns")
    ]);
    const irData = await irRes.json();
    const dnrData = await dnrRes.json();

    // API returns array directly or {items: [...]}
    const list = Array.isArray(irData) ? irData : (irData.items || []);

    // Collect IR IDs already used in any DNR
    const usedIrIds = new Set(
      (dnrData.items || dnrData.data || [])
        .map(d => (d.invoice_return_ref || d.invoice_return_ref_id || "").trim())
        .filter(Boolean)
    );

    sel.innerHTML = '<option value="">Select Invoice Return</option>';

    list.forEach(item => {
      const irId = item.invoice_return_id || item.return_id || "";
      if (!irId) return;
      if (usedIrIds.has(irId)) return;
      const opt = document.createElement("option");
      opt.value = irId;
      opt.textContent = irId;
      sel.appendChild(opt);
    });

    sel.addEventListener("change", async function () {
      const irId = this.value;
      if (!irId) return;
      const res = await fetch(`/api/invoice-return-items/${irId}`);
      const data = await res.json();
      console.log("IR ITEMS:", data.items);
      populateLineItemsFromInvoiceReturn(data.items || []);
    });

  } catch (err) {
    console.error(err);
  }
}
