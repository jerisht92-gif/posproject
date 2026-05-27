const CURRENCY = "₹";
let pendingComments = [];
 
// pdf generation
 
 
document.querySelector(".footer-item.pdf")?.addEventListener("click", async () => {
    const payload = {
        po_number: document.querySelector("input[name='po_number']").value,
        supplier: document.querySelector("input[name='supplier']").value,
        status: document.getElementById("status_dropdown").value,
 
        pdate: document.querySelector("input[name='pdate']").value,
        ddate: document.querySelector("input[name='ddate']").value,
 
        payment_terms: document.querySelector("#payment_terms").value,
        currency: "INR",
 
        notes: document.querySelector("input[name='notes']").value,
 
        subtotal: document.getElementById("subtotal").innerText,
        tax: document.getElementById("tax").innerText,
        rounding: document.getElementById("rounding").innerText,
        grand_total: document.getElementById("grandTotal").innerText,
 
        items: collectItems()
    };
 
    try {
        const res = await fetch("/generate-purchase-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
 
        if (!res.ok) throw new Error("Failed to generate PDF");
 
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
 
        window.open(url, "_blank");
 
        const a = document.createElement("a");
        a.href = url;
        a.download = `PO-${payload.po_number}.pdf`;
        a.click();
 
    } catch (err) {
        console.error(err);
        showAlert("PDF generation failed!", "error");
    }
});
 
 
 
// ==========================
// EMAIL SEND
// ==========================
async function sendPurchaseOrderEmail() {
 
    const actionBtn =
        document.getElementById("purchaseEmailBtn") ||
        document.querySelector(".footer-item.email");
 
    const originalHTML =
        actionBtn ? actionBtn.innerHTML : "";
 
    try {
 
        // ==========================
        // FORM DATA
        // ==========================
 
        const poData = {
 
            po_number:
                document.querySelector("input[name='po_number']")?.value?.trim() || "",
 
            supplier:
                document.querySelector("input[name='supplier']")?.value?.trim() || "",
 
            supplier_email:
                document.getElementById("supplier_email")?.value?.trim() || "",
 
            pdate:
                document.querySelector("input[name='pdate']")?.value || "",
 
            ddate:
                document.querySelector("input[name='ddate']")?.value || "",
 
            status:
                document.getElementById("status_dropdown")?.value || "Draft",
 
            payment_terms:
                document.querySelector("select[name='payment_terms']")?.value || "",
 
            subtotal:
                parseFloat(
                    (document.getElementById("subtotal")?.innerText || "0")
                    .replace(/[₹,\s]/g, "")
                ) || 0,
 
            tax:
                parseFloat(
                    (document.getElementById("tax")?.innerText || "0")
                    .replace(/[₹,\s]/g, "")
                ) || 0,
 
            discount:
                parseFloat(
                    (document.getElementById("discount")?.innerText || "0")
                    .replace(/[₹,\s]/g, "")
                ) || 0,
 
            rounding:
                parseFloat(
                    document.querySelector("input[name='rounding']")?.value || 0
                ) || 0,
 
            grand_total:
                parseFloat(
                    (document.getElementById("grandTotal")?.innerText || "0")
                    .replace(/[₹,\s]/g, "")
                ) || 0,
 
            notes:
                document.querySelector("textarea[name='notes']")?.value || "",
 
            items: collectItems()
        };
 
        // ==========================
        // VALIDATION
        // ==========================
 
        if (!poData.po_number) {
 
            showAlert(
                "PO Number missing",
                "warning"
            );
 
            return;
        }
 
        if (!poData.supplier_email) {
 
            showAlert(
                "Supplier email missing",
                "warning"
            );
 
            return;
        }
 
        // ==========================
        // BUTTON LOADING
        // ==========================
 
        if (actionBtn) {
 
            actionBtn.disabled = true;
 
            actionBtn.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Sending...</span>
            `;
 
            actionBtn.style.opacity = "0.7";
            actionBtn.style.cursor = "wait";
        }
 
        // ==========================
        // API CALL
        // ==========================
 
        const response = await fetch(
            `/api/purchase-orders/${poData.po_number}/email`,
            {
                method: "POST",
 
                headers: {
                    "Content-Type": "application/json"
                },
 
                body: JSON.stringify(poData)
            }
        );
 
        // ==========================
        // RESPONSE CHECK
        // ==========================
 
        if (!response.ok) {
 
            throw new Error(
                `HTTP ERROR ${response.status}`
            );
        }
 
        const result = await response.json();
 
        console.log("EMAIL RESPONSE:", result);
 
        // ==========================
        // SUCCESS
        // ==========================
 
        if (result.success === true) {
 
            showAlert(
                `Email sent successfully to ${poData.supplier_email}`,
                "success"
            );
 
        } else {
 
            showAlert(
                result.message || "Email send failed",
                "error"
            );
        }
 
    } catch (err) {
 
        console.error("EMAIL ERROR:", err);
 
        showAlert(
            "Server / Network error",
            "error"
        );
 
    } finally {
 
        // ==========================
        // RESTORE BUTTON
        // ==========================
 
        if (actionBtn) {
 
            actionBtn.disabled = false;
 
            actionBtn.innerHTML = originalHTML;
 
            actionBtn.style.opacity = "";
            actionBtn.style.cursor = "";
        }
    }
}
 
// ==========================
// ELEMENTS
// ==========================
const commentText = document.getElementById("commentText");
const addCommentBtn = document.getElementById("addCommentBtn");
const historyDiv = document.getElementById("history");
const noHistoryMsg = document.getElementById("noHistoryMsg");
 
const fileInput = document.getElementById("fileInput");
 
const uploadCard = document.getElementById("uploadBox");
 
const uploadBtn = document.getElementById("uploadBtn");
 
const filesList = document.getElementById("filesList");
 
const fileCount = document.getElementById("fileCount");
 
let files = [];
const MAX_FILES = 5;
 
 
// ==========================
// ENABLE / DISABLE COMMENT BUTTON
// ==========================
commentText.addEventListener("input", () => {
    addCommentBtn.disabled = commentText.value.trim().length === 0;
    addCommentBtn.classList.toggle("enabled", commentText.value.trim().length > 0);
});
 
// ==========================
// ENABLE / DISABLE SUBMIT BUTTON BASED ON REQUIRED FIELDS
// ==========================
function checkRequiredFields() {
    const ddate = document.getElementById("ddate").value.trim();
    const supplier = document.getElementById("supplier").value.trim();
    const submitBtn = document.querySelector(".btn-save");
 
    const isValid = ddate && supplier && allItemsValid();
    if (submitBtn) {
        submitBtn.disabled = !isValid;
        submitBtn.style.opacity = isValid ? "1" : "0.5";
    }
}
 
// ==========================
// ADD COMMENT → MOVE TO HISTORY
// ==========================
 
addCommentBtn.addEventListener("click", (e) => {
 
    e.preventDefault();
 
    const text =
        commentText.value.trim();
 
    if (!text) return;
 
const comment = {
 
    comment: text,
 
    created_by:
        localStorage.getItem("loggedInUser")
        || "Admin",
 
    created_at:
        new Date().toLocaleString()
};
 
    // ==================================
    // TEMP STORE ONLY
    // ==================================
 
    pendingComments.push(comment);
 
    // ==================================
    // SHOW COMMENT BELOW BUTTON
    // ==================================
 
    renderLiveComments();
 
    // ==================================
    // SHOW IN HISTORY
    // ==================================
 
    renderHistoryComments();
 
    // ==================================
    // RESET
    // ==================================
 
    commentText.value = "";
 
    addCommentBtn.disabled = true;
 
    showAlert(
        "Comment Added",
        "success"
    );
});
 
async function loadComments(po_number) {
 
    try {
 
        const res =
            await fetch(`/api/purchase-comments/${po_number}`);
 
        const comments =
            await res.json();
 
        historyDiv.innerHTML = "";
 
        if (!comments.length) {
 
            historyDiv.innerHTML = `
                <p class="no-history-message">
                    No comments yet
                </p>
            `;
 
            return;
        }
 
        comments.forEach(item => {
 
            const div =
                document.createElement("div");
 
            div.classList.add("history-item");
 
            const date =
                new Date(item.created_at)
                .toLocaleString();
 
            div.innerHTML = `
                <div class="comment-top">
                    <strong>
                        ${item.created_by} - ${date}
                    </strong>
                </div>
 
                <div class="comment-text">
                    ${item.comment}
                </div>
            `;
 
            historyDiv.appendChild(div);
 
        });
 
    } catch (err) {
 
        console.error(err);
 
    }
}
 
function renderLiveComments() {
 
    const container =
        document.getElementById("liveComments");
 
    container.innerHTML = "";
 
    pendingComments.forEach(item => {
 
        container.innerHTML += `
 
            <div class="history-item">
 
            <div class="comment-top">
 
                <strong>
                    ${item.created_by} - ${item.created_at}
                </strong>
 
            </div>
 
                <div class="comment-text">
                    ${item.comment}
                </div>
 
            </div>
 
        `;
    });
}
 
function renderHistoryComments() {
 
    historyDiv.innerHTML = "";
 
    if (!pendingComments.length) {
 
        historyDiv.innerHTML = `
            <p class="no-history-message">
                No comments yet
            </p>
        `;
 
        return;
    }
 
    pendingComments.forEach(item => {
 
        const div =
            document.createElement("div");
 
        div.classList.add("history-item");
 
        div.innerHTML = `
 
            <div class="comment-top">
 
                <strong>
                    ${item.created_by} - ${item.created_at}
                </strong>
 
            </div>
 
            <div class="comment-text">
                ${item.comment}
            </div>
 
        `;
 
        historyDiv.appendChild(div);
    });
}
 
// ==========================
// Attachment
// ==========================
async function handleFiles(selectedFiles) {
 
    const po_number =
        document.querySelector("input[name='po_number']").value;
 
    if (!po_number) {
        showAlert("PO number missing", "error");
        return;
    }
 
        const newFiles = Array.from(selectedFiles);
 
    // 🔴 TOTAL LIMIT CHECK BEFORE LOOP
    if (files.length + newFiles.length > MAX_FILES) {
        showAlert(
            `Cannot be uploaded because your maximum limit (${MAX_FILES} files) is reached.`,
            "error"
        );
        return;
    }
 
        for (let f of selectedFiles) {
 
            // ==========================
            // FILE VALIDATION
            // ==========================
 
            const allowedExtensions = [
                "pdf",
                "doc",
                "docx",
                "xls",
                "xlsx",
                "jpg",
                "jpeg",
                "png"
            ];
 
            const maxSize =
                10 * 1024 * 1024; // 10MB
 
            const extension =
                f.name
                    .split(".")
                    .pop()
                    .toLowerCase();
 
            // INVALID FILE TYPE
            if (!allowedExtensions.includes(extension)) {
 
                showAlert(
                    "This file is not allowed",
                    "error"
                );
 
                continue;
            }
 
            // FILE SIZE CHECK
            if (f.size > maxSize) {
 
                showAlert(
                    "File size must be less than 10MB",
                    "error"
                );
 
                continue;
            }
 
            // ==========================
            // ADD FILE
            // ==========================
 
            files.push(f);
 
            const formData = new FormData();
 
            formData.append("po_number", po_number);
 
            formData.append("file", f);
 
        try {
 
            const res = await fetch("/api/purchase-attachments", {
                method: "POST",
                body: formData
            });
 
            const result = await res.json();
 
            if (!result.success) {
                showAlert("File attached successfully", "success");
            }
             else {
 
    showAlert("File attached successfully", "success");
}
 
        } catch (err) {
 
            console.error(err);
 
            showAlert("Upload error", "error");
        }
    }
 
   
    updateFileUI();
 
   
    await loadAttachments();
 
    // reset
    fileInput.value = "";
}
 
// ==========================
// TAB SWITCHING
// ==========================
document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        // Hide all tab contents
        document.querySelectorAll(".tab-content").forEach(c => c.style.display = "none");
        // Remove active from all tabs
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
 
        // Show current tab
        tab.classList.add("active");
        const target = tab.dataset.tab;
        document.getElementById(target).style.display = "block";
    });
});
 
// ==========================
// FILE UPLOAD / ATTACHMENTS
// ==========================
function updateFileUI() {
 
    filesList.innerHTML = "";
 
    if (files.length === 0) {
 
        filesList.innerHTML = `
            <div class="no-files">
                <i class="fa-solid fa-folder-open"></i>
                <p>No files attached yet</p>
            </div>
        `;
 
    } else {
 
        files.forEach((file, index) => {
 
            const fileURL = URL.createObjectURL(file);
 
            const div = document.createElement("div");
 
            div.classList.add("file-item");
 
            div.innerHTML = `
 
                <div class="file-left">
 
                    <div class="file-icon">
                        <i class="fa-solid fa-file-pdf"></i>
                    </div>
 
                    <div class="file-details">
                        <div class="file-name">${file.name}</div>
 
                        <div class="file-meta">
                            ${(file.size / 1024).toFixed(1)} KB
                        </div>
                    </div>
 
                </div>
 
                <div class="file-actions">
 
                    <!-- VIEW -->
                    <button type="button"
                            class="file-btn view-btn"
                            onclick="viewFile('${fileURL}')">
 
                        <i class="fa-solid fa-eye"></i>
 
                    </button>
 
                    <!-- DOWNLOAD -->
                    <button type="button"
                                class="file-btn download-btn"
                            onclick="downloadFile('${fileURL}','${file.name}')">
 
                        <i class="fa-solid fa-download"></i>
 
                    </button>
 
                    <!-- DELETE -->
                    <button type="button"
                            class="file-btn delete-btn"
                            onclick="deleteFile(${index})">
 
                        <i class="fa-solid fa-trash-can"></i>
 
                    </button>
 
                </div>
            `;
 
            filesList.appendChild(div);
 
        });
    }
 
    fileCount.textContent = `${files.length} / 5 files`;
}
 
// ==========================
// VIEW FILE
// ==========================
function viewFile(url) {
 
    const win = window.open("", "_blank");
 
    win.document.write(`
 
        <html>
        <head>
            <title>PDF Preview</title>
 
            <style>
                body{
                    margin:0;
                    overflow:hidden;
                }
 
                iframe{
                    width:100%;
                    height:100vh;
                    border:none;
                }
            </style>
 
        </head>
 
        <body>
 
            <iframe src="${url}"></iframe>
 
        </body>
        </html>
 
    `);
}
 
// ==========================
// DOWNLOAD FILE
// ==========================
function downloadFile(url, filename) {
 
    const a = document.createElement("a");
 
    a.href = url;
 
    a.download = filename;
 
    document.body.appendChild(a);
 
    a.click();
 
    document.body.removeChild(a);
}
 
// ==========================
// DELETE FILE
// ==========================
let deleteIndex = null;
 
// ==========================
// OPEN DELETE MODAL
// ==========================
function deleteFile(index) {
 
    deleteIndex = index;
 
    document.getElementById("deleteModal").style.display = "flex";
}
 
// ==========================
// CLOSE MODAL
// ==========================
function closeDeleteModal() {
 
    document.getElementById("deleteModal").style.display = "none";
 
    deleteIndex = null;
}
 
// ==========================
// CONFIRM DELETE
// ==========================
document
.getElementById("confirmDeleteBtn")
.addEventListener("click", () => {
 
    if (deleteIndex !== null) {
 
        files.splice(deleteIndex, 1);
 
        updateFileUI();
 
        showAlert("Attachment deleted", "success");
    }
 
    closeDeleteModal();
});
 
 
 
// Click upload triggers file input
uploadCard?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
});
 
uploadBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
});
 
// Handle file select
fileInput?.addEventListener("change", (e) => handleFiles(e.target.files));
 
// ==========================
// DRAG & DROP SUPPORT
// ==========================
 
[
    "dragenter",
    "dragover",
    "dragleave",
    "drop"
].forEach(eventName => {
 
    uploadCard?.addEventListener(
        eventName,
        preventDefaults,
        false
    );
});
 
// STOP BROWSER OPENING FILE
function preventDefaults(e) {
 
    e.preventDefault();
 
    e.stopPropagation();
}
 
// HANDLE DROP
uploadCard?.addEventListener(
    "drop",
    async (e) => {
 
        const droppedFiles =
            e.dataTransfer.files;
 
        if (!droppedFiles.length) return;
 
        await handleFiles(droppedFiles);
    }
);
 
// ==========================
// OTP MODAL
// ==========================
const otpModal = document.getElementById("otpModal");
const submitBtn = document.getElementById("submitBtn");
const closeOtp = document.querySelector(".close-otp-modal");
 
submitBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    otpModal.style.display = "flex";
});
 
// Close
closeOtp?.addEventListener("click", () => {
    otpModal.style.display = "none";
});
 
 
// OTP auto focus
document.querySelectorAll(".otp-digit").forEach((input, index, arr) => {
 
    input.addEventListener("input", () => {
        if (input.value && index < arr.length - 1) {
            arr[index + 1].focus();
        }
    });
 
    input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value && index > 0) {
            arr[index - 1].focus();
        }
    });
 
});
 
 
// ==========================
// REJECT MODAL
// ==========================
const rejectModal = document.getElementById("rejectModal");
 
document.querySelector(".footer-item.reject")?.addEventListener("click", () => {
    rejectModal.style.display = "flex";
});
 
document.getElementById("rejectCancelBtn")?.addEventListener("click", () => {
    rejectModal.style.display = "none";
});
 
document.getElementById("rejectOkBtn")?.addEventListener("click", () => {
    alert("Rejected!");
    rejectModal.style.display = "none";
});
 
 
 
 
 
 
// ==========================
// DELETE FILE MODAL (OPTIONAL)
// ==========================
const deleteFileModal = document.getElementById("deleteFileModal");
 
 
// ==========================
// FOOTER ACTIONS
// ==========================
document.querySelector(".footer-item.approve")?.addEventListener("click", () => {
    showAlert("Approved!", "success");
});
 
 
document.querySelector(".footer-item.sync")?.addEventListener("click", () => {
   showAlert("Sync Started", "info");
});
 
 
// ==========================
// GLOBAL CLOSE MODALS (CLICK OUTSIDE)
// ==========================
window.addEventListener("click", (e) => {
 
    if (e.target.classList.contains("reject-modal-overlay")) {
        e.target.style.display = "none";
    }
 
    if (e.target === otpModal) {
        otpModal.style.display = "none";
    }
 
});
  
async function loadSOProducts() {
  try {
    const res = await fetch("/api/products-new", { cache: "no-store" });
    const data = await res.json();
 
    const list =
      data && Array.isArray(data.products)
        ? data.products
        : data && data.data && Array.isArray(data.data.items)
        ? data.data.items
        : Array.isArray(data)
        ? data
        : [];
 
    window.SO_PRODUCTS = list;
 
    const map = {};
    list.forEach((p) => {
      const pid = String(
        p.product_id || p.id || p.code || p.product_code || p.sku || ""
      ).trim();
 
      if (pid) map[pid] = p;
            map[String(pid).trim()] = {
            ...p,
            unit_price: Number(p.unit_price || p.price || 0)
        };
    });
 
    window.SO_PRODUCTS_MAP = map;
    console.log("Products loaded:", list.length);
  } catch (e) {
    console.error("Failed to load products:", e);
    window.SO_PRODUCTS = [];
    window.SO_PRODUCTS_MAP = {};
  }
}
 
function buildProductOptions() {
  if (!window.SO_PRODUCTS.length) return `<option value="">No products</option>`;
 
  const opts = window.SO_PRODUCTS
    .map((p) => {
      const pid = String(
        p.product_id || p.id || p.code || p.product_code || p.sku || ""
      ).trim();
      const name = String(p.product_name || p.name || p.title || "").trim();
 
      if (!pid) return "";
      return `<option value="${pid}">${name ? `${name} (${pid})` : pid}</option>`;
    })
    .join("");
 
  return `<option value="">Select Product</option>${opts}`;
}
 
function fillAllProductSelects() {
  const html = buildProductOptions();
 
  document.querySelectorAll("select.productSelect").forEach((sel) => {
    const old = sel.value;
    sel.innerHTML = html;
    if (old) sel.value = old;
  });
}
 
function updateSerialNumbers() {
  const rows = document.querySelectorAll("#orderItemsBody tr");
  rows.forEach((r, idx) => {
    const sno = r.querySelector(".sno");
    if (sno) sno.innerText = idx + 1;
  });
}
 
function refreshProductDropdowns() {
  const selects = Array.from(document.querySelectorAll(".productSelect"));
 
  const selectedValues = selects
    .map((s) => s.value)
    .filter((v) => v && v.trim() !== "");
 
  selects.forEach((currentSelect) => {
    const currentValue = currentSelect.value;
 
    Array.from(currentSelect.options).forEach((opt) => {
      if (!opt.value) {
        opt.disabled = false;
        return;
      }
 
      const usedElsewhere =
        selectedValues.includes(opt.value) &&
        opt.value !== currentValue;
 
      opt.disabled = usedElsewhere;
 
      if (usedElsewhere) {
        const originalText =
          opt.getAttribute("data-original-text") || opt.textContent;
 
        opt.setAttribute("data-original-text", originalText);
        opt.textContent = `${originalText} (Already added)`;
      } else {
        const originalText = opt.getAttribute("data-original-text");
        if (originalText) opt.textContent = originalText;
      }
    });
  });
}
 
function applyProductToRow(row, productId) {
 
    const product =
        window.SO_PRODUCTS_MAP[String(productId).trim()];
 
    const pidCell = row.querySelector(".prodIdCell");
    const stockCell = row.querySelector(".stockCell");
    const uomCell = row.querySelector(".uomCell");
    const taxCell = row.querySelector(".taxCell");
    const priceInput = row.querySelector(".priceInput");
 
    // EMPTY
    if (!product) {
 
        if (pidCell) pidCell.innerText = "-";
        if (stockCell) stockCell.innerText = "0";
        if (uomCell) uomCell.innerText = "-";
        if (taxCell) taxCell.innerText = "0";
 
        if (priceInput) {
            priceInput.value = "0.00";
        }
 
        row.dataset.taxPct = "0";
 
        return;
    }
 
    // PRODUCT ID
    if (pidCell) {
        pidCell.innerText = product.product_id || "-";
    }
 
    // STOCK
    if (stockCell) {
        stockCell.innerText = product.stock_level || 0;
    }
 
    // UOM
    if (uomCell) {
        uomCell.innerText = product.uom_name || "-";
    }
 
    // TAX
    const tax = Number(product.tax_percent || 0);
 
    if (taxCell) {
        taxCell.innerText = tax;
    }
 
    row.dataset.taxPct = tax;
 
    // PRICE
    const price =
        Number(
            product.unit_price ||
            product.price ||
            0
        );
 
    console.log("PRODUCT:", product);
    console.log("PRICE FOUND:", price);
 
    if (priceInput) {
        priceInput.value = price.toFixed(2);
    }
 
    calculateRow(row.querySelector(".qtyInput"));
}
 
function onProductChange(selectEl) {
    const row = selectEl.closest("tr");
    if (!row) return;
 
    const productId = selectEl.value;
 
    // ❌ IF DUPLICATE → SHOW POPUP
    if (isDuplicateProduct(productId, row)) {
 
        showAlert("Product already selected in another row!", "warning");
 
        // Reset selection
        selectEl.value = "";
 
        // Reset row data
        validateRow(row);
        applyProductToRow(row, "");
        calculateRow(selectEl);
 
        return;
    }
 
    // ✅ NORMAL FLOW
    applyProductToRow(row, productId);
 
    const qtyEl = row.querySelector(".qtyInput");
    if (qtyEl) calculateRow(qtyEl);
 
    refreshProductDropdowns();
}
 
function calculateRow(el) {
  const row = el.closest("tr");
  if (!row) return;
 
  // 🔥 RUN VALIDATION FIRST
  validateRowStrict(row);
 
  const qty = Math.floor(Number(row.querySelector(".qtyInput")?.value || 0));
  const discPct = Math.min(Number(row.querySelector(".discInput")?.value || 0), 90);
  const taxPct = Number(row.dataset.taxPct || 0);
 
  const sel = row.querySelector("select.productSelect");
  const pid = sel?.value;
  const p = pid ? window.SO_PRODUCTS_MAP[pid] : null;
 
  const price = Number(row.querySelector(".priceInput")?.value || 0);
 
  const base = qty * price;
  const disc = base * (discPct / 100);
  const net = base - disc;
  const tax = net * (taxPct / 100);
 
  row.dataset.base = net;
  row.dataset.tax = tax;
 
  const total = net + tax;
 
  const totalCell = row.querySelector(".rowTotal");
  if (totalCell) totalCell.textContent = `${CURRENCY} ${total.toFixed(2)}`;
 
  calculateTotals();
}
 
function deleteRow(btn) {
  const row = btn.closest("tr");
  if (!row) return;
 
  row.remove();
  updateSerialNumbers();
  calculateTotals();
  refreshProductDropdowns();
 
}
 
 
function allItemsValid() {
  const rows = document.querySelectorAll("#orderItemsBody tr");
  if (!rows.length) return false;
 
  let ok = true;
  rows.forEach((row) => {
    const pid = row.querySelector("select.productSelect")?.value?.trim() || "";
    const qty = Number(row.querySelector(".qtyInput")?.value || 0);
    if (!pid || qty <= 0) ok = false;
  });
 
  return ok;
}
 
// =========================================
// ORDER SUMMARY
// =========================================
function calculateTotals() {
  let subTotal = 0;
  let taxTotal = 0;
 
  document.querySelectorAll("#orderItemsBody tr").forEach((row) => {
    subTotal += Number(row.dataset.base || 0);
    taxTotal += Number(row.dataset.tax || 0);
  });
 
  const globalDiscountInput = document.getElementById("global_discount");
  let globalDiscAmt = Number(globalDiscountInput?.value || 0);
 
  if (globalDiscAmt < 0) {
    globalDiscAmt = 0;
    if (globalDiscountInput) globalDiscountInput.value = 0;
  }
 
  if (globalDiscAmt > subTotal) {
    globalDiscAmt = subTotal;
    if (globalDiscountInput) globalDiscountInput.value = subTotal;
    showToast("Global Discount cannot exceed Subtotal", "error");
  }
 
  const shippingInput = document.getElementById("shipping");
  let ship = Number(shippingInput?.value || 0);
 
  if (ship < 0) {
    ship = 0;
    if (shippingInput) shippingInput.value = 0;
    showToast("Shipping charges cannot be negative", "error");
  }
 
  const grandBeforeRound = subTotal - globalDiscAmt + taxTotal + ship;
  const roundedGrand = Math.round(grandBeforeRound);
  const roundingAdj = +(roundedGrand - grandBeforeRound).toFixed(2);
 
  const subEl = document.getElementById("subtotal");
  const taxEl = document.getElementById("tax");
  const roundEl = document.getElementById("rounding");
  const grandEl = document.getElementById("grandTotal");
 
  if (subEl) subEl.textContent = `${CURRENCY} ${subTotal.toFixed(2)}`;
  if (taxEl) taxEl.textContent = `${CURRENCY} ${taxTotal.toFixed(2)}`;
  if (roundEl) roundEl.textContent = `${CURRENCY} ${roundingAdj.toFixed(2)}`;
  if (grandEl) grandEl.textContent = `${CURRENCY} ${(grandBeforeRound + roundingAdj).toFixed(2)}`;
}
 
function applyViewModeUI() {
    document.querySelectorAll("#poForm input:not([type='hidden']), #poForm select, #poForm textarea, #poForm button")
        .forEach(el => {
            if (!el.classList.contains('btn-discard')) {
                el.disabled = true;
            }
        });
 
    document.getElementById('commentText')?.setAttribute('disabled', 'disabled');
    document.getElementById('addCommentBtn')?.setAttribute('disabled', 'disabled');
    document.getElementById('fileInput')?.setAttribute('disabled', 'disabled');
    document.getElementById('uploadBtn')?.setAttribute('disabled', 'disabled');
 
    document.querySelectorAll("button.btn-discard").forEach(btn => {
        btn.disabled = false;
        btn.style.display = "inline-block";
    });
 
    document.querySelectorAll("button.btn-draft, button.btn-save").forEach(btn => btn.style.display = "none");
    document.querySelectorAll(".footer-item:not(.pdf):not(.email)").forEach(btn => btn.style.display = "none");
    document.querySelector(".footer-item.email")?.removeAttribute("disabled");
}
 
function showDropdown(input) {
  const listDiv = input.nextElementSibling;
  listDiv.style.display = "block";
  renderDropdownItems(input, window.SO_PRODUCTS);
}
 
function filterProducts(input) {
  const search = input.value.toLowerCase();
 
  const filtered = window.SO_PRODUCTS.filter(p => {
    const name = (p.product_name || "").toLowerCase();
    const pid = (p.product_id || "").toLowerCase();
    return name.includes(search) || pid.includes(search);
  });
 
  renderDropdownItems(input, filtered);
}
 
function renderDropdownItems(input, products) {
  const listDiv = input.nextElementSibling;
 
  if (!products.length) {
    listDiv.innerHTML = `<div class="dropdown-item">No products</div>`;
    return;
  }
 
  listDiv.innerHTML = products.map(p => {
    return `
      <div class="dropdown-item" onclick="selectProduct(this, '${p.product_id}')">
        ${p.product_name} (${p.product_id})
      </div>
    `;
  }).join("");
}
 
function selectProduct(element, productId) {
  const row = element.closest("tr");
  const input = row.querySelector(".productSearch");
  const listDiv = element.parentElement;
 
  const product = window.SO_PRODUCTS_MAP[productId];
 
  input.value = `${product.product_name} (${product.product_id})`;
  listDiv.style.display = "none";
 
  // 🔥 IMPORTANT: apply product data
  applyProductToRow(row, productId);
 
  calculateRow(input);
}
async function loadSalesOrders() {
    try {
        const res = await fetch("/api/sales-orders/ids");
        const data = await res.json();
 
        console.log("SO DATA:", data);
 
        const select = document.getElementById("so_id");
        if (!select) return;
 
        select.innerHTML = `<option value="">Select Sales Order</option>`;
 
        let salesOrderIds = [];
        if (Array.isArray(data)) {
            salesOrderIds = data;
        } else if (data && Array.isArray(data.orders)) {
            salesOrderIds = data.orders.map(order => order.so_id);
        } else if (data && Array.isArray(data.sales_orders)) {
            salesOrderIds = data.sales_orders;
        }
 
        salesOrderIds.forEach(id => {
            const option = document.createElement("option");
            option.value = id;
            option.textContent = id;
            select.appendChild(option);
        });

        const qsSoId = new URLSearchParams(window.location.search).get("so_id");
        if (qsSoId && salesOrderIds.includes(qsSoId) && !window.IS_EDIT_MODE) {
            select.value = qsSoId;
            loadSalesOrderData(qsSoId);
        }
 
    } catch (err) {
        console.error("SO LOAD ERROR:", err);
    }
}
 
function syncStatus() {
 
    const dropdown =
        document.getElementById("status_dropdown");
 
    const hidden =
        document.getElementById("status");
 
    const status =
        dropdown.value;
 
    if (hidden) {
        hidden.value = status;
    }
 
    setStatusColor(status);
 
    // UPDATE BADGE
    updateStatusBadge(status);
}
 
function updateStatusBadge(status) {
 
    const badge = document.getElementById("poStatusBadge");
 
    if (!badge) return;
 
    // RESET CLASSES
    badge.className = "status-badge";
 
    const statusMap = {
        "Draft": "status-draft",
        "Submitted": "status-submitted",
        "Pending": "status-pending",
        "Approved": "status-approved",
        "Rejected": "status-rejected",
        "Cancelled": "status-cancelled"
    };
 
    badge.classList.add(
        statusMap[status] || "status-draft"
    );
 
    badge.innerText = "Status : " + status;
}
 
// footer sections
async function handleAction(action) {
 
// Validate only for Submit / Approve
        if ((action === "Submitted" || action === "Approved") && !allItemsValid()) {
            showAlert("Add valid product & quantity", "warning");
            return;
        }
 
    const form = document.getElementById("poForm");
    const formData = new FormData(form);
    const items = collectItems();
 
    const currentStatus = document.getElementById("status_dropdown").value;
 
    console.log("Action:", action);
    console.log("Status:", currentStatus);
    console.log("Items:", items);
 
    // =========================
    // 🔒 WORKFLOW VALIDATION
    // =========================
    if (currentStatus === "Draft" && (action === "Approved" || action === "Rejected")) {
        showAlert("Submit before approve/reject!", "warning");
        return;
    }
 
    if (currentStatus === "Approved") {
       showAlert("Already approved. No changes allowed.", "warning");
        return;
    }
     
        if (action === "GoBack") {
        window.location.href = "/purchase";
        return;
    }
    // =========================
    // ⚠️ REQUIRED FIELD
    // =========================
    if (action === "Submitted" && !formData.get("supplier")) {
        alert("Supplier required!");
        return;
    }
 
    const ddateValue = formData.get("ddate");
 
    if (!ddateValue) {
        showAlert("Delivery date is required", "warning");
        return;
    }
 
    const ddate = new Date(ddateValue);
    const year = ddate.getFullYear();
 
    // INVALID DATE
    if (isNaN(ddate.getTime())) {
        showAlert("Invalid delivery date", "error");
        return;
    }
 
    // YEAR VALIDATION
    if (year > 2100 || year < 2000) {
        showAlert("Please enter a valid delivery date", "error");
        return;
    }
 
    // OPTIONAL:
    // DELIVERY DATE SHOULD NOT BE LESS THAN PURCHASE DATE
 
    const pdateValue = formData.get("pdate");
 
    if (pdateValue) {
 
        const pdate = new Date(pdateValue);
 
        if (ddate < pdate) {
            showAlert("Delivery date cannot be before Purchase date", "warning");
            return;
        }
    }
 
 
 
    if (action === "Approved") {
        if (!confirm("Are you sure to approve this PO?")) return;
    }
 
    if (action === "Rejected") {
        if (!confirm("Are you sure to reject this PO?")) return;
    }
 
 
   
    document.getElementById("status").value = action;
 
   
    updateActionButtons(action);
    setStatusColor(action);
    updateStatusBadge(action);
 
    try {
        const res = await fetch("/api/save-po-purchase", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                po_number: document.querySelector("input[name='po_number']").value || null,
 
                supplier_id: formData.get("supplier_id"),
 
                supplier_name: formData.get("supplier"),
 
                supplier_email:
                    document.getElementById("supplier_email")?.value || "",
 
                so_id: formData.get("so_id"),
 
                status: action,
 
                pdate: formData.get("pdate"),
 
                ddate: formData.get("ddate"),
 
                payment_terms: formData.get("payment_terms"),
                inco_terms: formData.get("inco_terms"),
                grand_total: parseFloat(
                 (document.getElementById("grandTotal")?.innerText || "0")
                 .replace(/[₹,\s]/g, "")
                 ),
 
                items: items
            })
        });
  const result = await res.json().catch(() => ({}));
 
        if (!res.ok) {
            console.error("Backend Error:", result);
 
            const msg = result.error || result.message || "Failed to save PO";
            showAlert(msg, "error");
 
            return;
        }
 
        if (action === "Draft") {
            showAlert("Saved as Draft ", "success");
        }
        else if (action === "Submitted") {
            showAlert("Purchase Order Submitted ", "success");
        }
        else if (action === "Approved") {
            showAlert("Purchase Order Approved ", "success");
        }
        else if (action === "Rejected") {
            showAlert("Purchase Order Rejected ❌", "error");
        }
        else {
            showAlert("Saved Successfully ", "success");
        }
 
        setTimeout(() => {
            window.location.href = "/purchase";
        }, 1500);
 
    } catch (err) {
        console.error(err);
        showAlert(err.message || "Server error!", "error");
    }
}
  
function setStatusColor(status) {
    const el = document.getElementById("status_dropdown");
    if (!el) return;
 
    el.style.color = "black";
    el.style.fontWeight = "400";
}
 
function collectItems() {
 
    const rows = document.querySelectorAll("#orderItemsBody tr");
 
    const items = [];
 
    rows.forEach(row => {
 
        const pid =
            row.querySelector(".productSelect")?.value || "";
 
        const p =
            window.SO_PRODUCTS_MAP[pid] || {};
 
        items.push({
 
            product_id: pid,
 
            product_name:
                p.product_name || "",
 
            qty:
                Number(
                    row.querySelector(".qtyInput")?.value || 0
                ),
 
            price:
                Number(
                    row.querySelector(".priceInput")?.value || 0
                ),
 
            tax: Number(row.dataset.taxPct || 0),
 
            discount:
                Number(
                    row.querySelector(".discInput")?.value || 0
                ),
 
            uom:
                row.querySelector(".uomCell")?.innerText || ""
 
        });
 
    });
 
    return items;
}
 
document.addEventListener("DOMContentLoaded", async () => {
 
     setupLiveValidation();
     validateInitialFields();
 
    const container = document.getElementById("poDataContainer");
 
    if (!container) return;
 
    const supplierSelect = document.querySelector("select[name='supplier_id']");
   
 
 
 
    const po_data = container.dataset.po
        ? JSON.parse(container.dataset.po)
        : {};
 
    const mode = container.dataset.mode || "new";
 
    // ✅ LOAD DATA FIRST
    await loadSuppliers();
    await loadSOProducts();
    await loadSalesOrders();
    updateFooterButtons(mode);
    fillAllProductSelects();
 
    document.addEventListener("input", checkRequiredFields);
    document.addEventListener("change", checkRequiredFields);
    document.getElementById("supplier_id")?.addEventListener("change", handleSupplierChange);
 
    const soSelect = document.querySelector("select[name='so_id']");
 
        if (soSelect) {
            soSelect.addEventListener("change", function () {
                const so_id = this.value;
 
                console.log("Selected SO:", so_id); // for testing
 
                if (so_id && !window.IS_EDIT_MODE) {
                    loadSalesOrderData(so_id);
                }
            });
        }
 
    // =========================
    // PREFILL FORM
    // =========================
if (po_data && po_data.po_number) {
 
    // =========================
    // BASIC FIELDS
    // =========================
    document.querySelector('[name="po_number"]').value =
        po_data.po_number || "";
 
    document.querySelector('[name="pdate"]').value =
        po_data.pdate || "";
 
    document.querySelector('[name="ddate"]').value =
        po_data.ddate || "";
 
    document.querySelector('[name="inco_terms"]').value =
        po_data.inco_terms || "";
 
    document.querySelector('[name="notes"]').value =
        po_data.notes || "";
 
    // =========================
    // WAIT FOR DROPDOWNS
    // =========================
    setTimeout(() => {
 
        // =========================
        // SALES ORDER
        // =========================
        const soSelect =
            document.querySelector('[name="so_id"]');
 
        if (soSelect && po_data.so_id) {
 
            // wait until options loaded
            setTimeout(() => {
 
                soSelect.value = po_data.so_id;
 
            }, 200);
        }
 
        // =========================
        // SUPPLIER
        // =========================
        const supplierSelect =
            document.querySelector('[name="supplier_id"]');
 
        if (supplierSelect && po_data.supplier_id) {
 
            setTimeout(() => {
 
                supplierSelect.value = po_data.supplier_id;
 
                handleSupplierChange();
 
            }, 200);
        }
 
        // =========================
        // PAYMENT TERMS
        // =========================
        const paymentTerms =
            document.querySelector('[name="payment_terms"]');
 
        if (paymentTerms && po_data.payment_terms) {
 
            setTimeout(() => {
 
                paymentTerms.value = po_data.payment_terms;
 
            }, 200);
        }
 
        // =========================
        // STATUS
        // =========================
        const statusEl =
            document.getElementById("status_dropdown");
 
        if (statusEl) {
 
            statusEl.value =
                po_data.status || "Draft";
        }
 
        updateStatusBadge(
            po_data.status || "Draft"
        );
 
    }, 500);
 
    // =========================
    // ITEMS
    // =========================
    if (po_data.items && po_data.items.length > 0) {
 
        const tbody =
            document.getElementById("orderItemsBody");
 
        tbody.innerHTML = "";
 
        po_data.items.forEach(item => {
            addItem(item);
        });
 
        setTimeout(() => {
 
            document.querySelectorAll("#orderItemsBody tr")
                .forEach(row => {
 
                const select =
                    row.querySelector(".productSelect");
 
                const pid =
                    row.querySelector(".prodIdCell")?.innerText;
 
                if (select && pid) {
 
                    select.value = pid;
 
                    applyProductToRow(row, pid);
                }
            });
 
            calculateTotals();
 
        }, 300);
 
       
    }
}
 
    if (mode === "view") {
 
    document.querySelectorAll("#poForm input:not([type='hidden']), #poForm select, #poForm textarea, #poForm button")
        .forEach(el => {
 
            if (!el.classList.contains('btn-discard')) {
                el.disabled = true;
            }
        });
 
    // CANCEL BUTTON ENABLE
    document.querySelector(".cancel-order-btn")?.removeAttribute("disabled");
 
    document.querySelector(".cancel-order-btn").style.opacity = "1";
    document.querySelector(".cancel-order-btn").style.pointerEvents = "auto";
 
    // EMAIL BUTTON ENABLE
    document.getElementById("purchaseEmailBtn")?.removeAttribute("disabled");
 
    document.getElementById("purchaseEmailBtn").style.opacity = "1";
 
    document.getElementById("purchaseEmailBtn").style.pointerEvents = "auto";
 
    document.getElementById("purchaseEmailBtn").style.cursor = "pointer";
 
    // COMMENTS DISABLE
    document.getElementById('commentText')?.setAttribute('disabled', 'disabled');
    document.getElementById('addCommentBtn')?.setAttribute('disabled', 'disabled');
    document.getElementById('fileInput')?.setAttribute('disabled', 'disabled');
    document.getElementById('uploadBtn')?.setAttribute('disabled', 'disabled');
 
    // KEEP CANCEL BUTTONS
    document.querySelectorAll("button.btn-discard").forEach(btn => {
        btn.disabled = false;
        btn.style.display = "inline-block";
    });
 
    // HIDE OTHER BUTTONS
    document.querySelectorAll("button.btn-draft, button.btn-save")
        .forEach(btn => btn.style.display = "none");
 
    document.querySelectorAll(".footer-item:not(.pdf):not(.email)")
        .forEach(btn => btn.style.display = "none");
}
 
    // =========================
    // EDIT MODE
    // =========================
    if (mode === "edit") {
        // Enable all fields for editing
        window.IS_EDIT_MODE = true;
        document.querySelectorAll("#poForm input:not([type='hidden']), #poForm select, #poForm textarea")
            .forEach(el => el.disabled = false);
        updateActionButtons(po_data.status);
        setStatusColor(po_data.status);
    }
 
    if (mode === "new" || mode === "edit") {
 
    const cancelBtn =
        document.querySelector(".cancel-order-btn");
 
    if (cancelBtn) {
 
        cancelBtn.disabled = true;
 
        cancelBtn.style.opacity = "0.5";
 
        cancelBtn.style.pointerEvents = "none";
    }
}
  // Add event listeners for required field validation
 
        const ddateInput = document.getElementById("ddate");
 
        ddateInput?.addEventListener("change", () => {
 
            checkRequiredFields();
 
            const value = ddateInput.value;
 
            // =========================
            // EMPTY CHECK
            // =========================
            if (!value) return;
 
            // =========================
            // INVALID DATE CHECK
            // =========================
            const selectedDate = new Date(value);
 
            if (isNaN(selectedDate.getTime())) {
 
                showAlert(
                    "Invalid delivery date is not allowed",
                    "warning"
                );
 
                ddateInput.value = "";
 
                ddateInput.blur();
 
                setTimeout(() => {
 
                    ddateInput.focus();
 
                    if (ddateInput.showPicker) {
                        ddateInput.showPicker();
                    }
 
                }, 3100);
 
                return;
            }
 
            // =========================
            // YEAR VALIDATION
            // =========================
            const year = selectedDate.getFullYear();
 
            if (year > 2100 || year < 2000) {
 
                showAlert(
                    "Please enter valid delivery date",
                    "warning"
                );
 
                ddateInput.value = "";
 
                ddateInput.blur();
 
                setTimeout(() => {
 
                    ddateInput.focus();
 
                    if (ddateInput.showPicker) {
                        ddateInput.showPicker();
                    }
 
                }, 3100);
 
                return;
            }
 
            // =========================
            // PAST DATE VALIDATION
            // =========================
            const today = new Date();
 
            today.setHours(0, 0, 0, 0);
 
            selectedDate.setHours(0, 0, 0, 0);
 
            if (selectedDate < today) {
 
                showAlert(
                    "Past delivery date is not allowed",
                    "warning"
                );
 
                ddateInput.value = "";
 
                ddateInput.blur();
 
                setTimeout(() => {
 
                    ddateInput.focus();
 
                    if (ddateInput.showPicker) {
                        ddateInput.showPicker();
                    }
 
                }, 3100);
 
                return;
            }
 
        });
        document.getElementById("supplier")?.addEventListener("input", checkRequiredFields);
 
        // Initial check
        checkRequiredFields();
 
 
});
 
// Add new item function
function resolveProductId(item = {}) {
    const idCandidates = [item.product_id, item.product_code, item.code, item.sku].filter(Boolean);
    if (idCandidates.length) return String(idCandidates[0]);
 
    const name = String(item.product_name || item.name || item.product || "").trim().toLowerCase();
    if (!name) return "";
 
    for (const p of window.SO_PRODUCTS || []) {
        const candidateName = String(p.product_name || p.name || "").trim().toLowerCase();
        const candidateId = String(p.product_id || p.id || p.code || p.sku || "").trim();
        if (candidateName && candidateName === name) {
            return candidateId;
        }
    }
 
    return "";
}
 
function addItem(item = {}) {
 
    const tbody =
        document.getElementById("orderItemsBody");
 
    const idx =
        tbody.children.length + 1;
 
    const productId =
        resolveProductId(item);
 
    const row =
        document.createElement("tr");
 
    row.innerHTML = `
 
        <td class="sno">${idx}</td>
 
        <td>
            <select
                class="productSelect"
                onchange="onProductChange(this)"
            >
                <option value="">
                    Select Product
                </option>
            </select>
        </td>
 
        <td class="prodIdCell">
            -
        </td>
 
        <td class="stockCell">
            0
        </td>
 
        <td>
            <input
                type="text"
                class="qtyInput"
                value="${parseFloat(item.qty) || 1}"
                oninput="sanitizeQuantity(this)"
            >
        </td>
 
        <td class="uomCell">
            -
        </td>
 
        <td>
            <input
                type="text"
                class="priceInput"
                value="${item.price ?? item.unit_price ?? 0}"              
                readonly
            >
        </td>
 
 
        <td class="taxCell">
            ${item.tax_pct || 0}
        </td>
 
 
 
        <td>
            <input
                type="number"
                class="discInput"
                value="${parseFloat(item.discount) || 0}"
                min="0"
                max="90"
                oninput="calculateRow(this)"
            >
            </td>
 
        <td class="rowTotal">
            ₹ 0.00
        </td>
 
        <td class="so-action-col">
            <button
                class="so-delete-btn"
                type="button"
                onclick="deleteRow(this)"
                title="Delete"
            >
                <i class="fa-solid fa-trash"></i>
            </button>
        </td>
            `;
 
    tbody.appendChild(row);
 
    const select =
        row.querySelector(".productSelect");
 
    select.innerHTML =
        buildProductOptions();
 
        if (productId) {
 
            setTimeout(() => {
 
                select.value = productId;
 
                applyProductToRow(row, productId);
 
                // force update
                const priceInput = row.querySelector(".priceInput");
 
                const product =
                    window.SO_PRODUCTS_MAP[String(productId).trim()];
 
                if (product && priceInput) {
 
                    priceInput.value =
                        Number(
                            product.unit_price ||
                            product.price ||
                            0
                        ).toFixed(2);
                }
 
                calculateRow(priceInput);
 
            }, 100);
        }
 
    updateSerialNumbers();
 
    refreshProductDropdowns();
}
 
 
document.querySelector(".footer-item.approve")?.addEventListener("click", () => {
    handleAction("Approved");
});
 
document.querySelector(".footer-item.reject")?.addEventListener("click", () => {
    handleAction("Rejected");
});
 
function updateActionButtons(status) {
 
    const approveBtn = document.querySelector(".footer-item.approve");
    const rejectBtn = document.querySelector(".footer-item.reject");
    const submitBtn = document.querySelector(".btn-save");
    const draftBtn = document.querySelector(".btn-draft");
 
    // Hide all first
    [approveBtn, rejectBtn, submitBtn, draftBtn].forEach(btn => {
        if (btn) btn.style.display = "none";
    });
 
    // =========================
    // Draft / Pending / Cancelled / Rejected
    // =========================
    if (
        status === "Draft" ||
        status === "Pending" ||
        status === "Cancelled" ||
        status === "Rejected"
    ) {
 
        if (submitBtn) {
            submitBtn.style.display = "inline-block";
        }
 
        if (draftBtn) {
            draftBtn.style.display = "inline-block";
        }
    }
 
    // =========================
    // Submitted
    // =========================
    else if (status === "Submitted") {
 
        // Hide submit button
        if (submitBtn) {
            submitBtn.style.display = "none";
        }
 
        if (draftBtn) {
            draftBtn.style.display = "none";
        }
 
        // Show approve/reject
        if (approveBtn) {
            approveBtn.style.display = "flex";
        }
 
        if (rejectBtn) {
            rejectBtn.style.display = "flex";
        }
    }
 
    // =========================
    // Approved
    // =========================
    else if (status === "Approved") {
 
        // No buttons
    }
}
 
 
 
 
function validateShipping(input) {
 
    let value = input.value;
 
    // remove non-numeric
    value = value.replace(/\D/g, '');
 
    // allow only 5 digits
    if (value.length > 5) {
        showAlert("Shipping charges should not exceed 5 digits", "warning");
 
        value = value.slice(0, 5);
    }
 
    input.value = value;
}
 
// =========================================
// CUSTOM ALERT FUNCTION
// =========================================
 
function showAlert(message, type = "warning") {
 
    const alertBox = document.getElementById("discountAlert");
    const msg = document.getElementById("alertMessage");
    const icon = document.querySelector(".alert-icon");
 
    // message
    msg.textContent = message;
 
    // remove previous classes
    alertBox.classList.remove("success", "error", "warning", "show");
 
    // success
    if (type === "success") {
 
        alertBox.classList.add("success");
 
        icon.textContent = "✓";
    }
 
    // error
    if (type === "error") {
 
        alertBox.classList.add("error");
 
        icon.textContent = "✕";
    }
 
    // warning
    if (type === "warning") {
 
        alertBox.classList.add("warning");
 
        icon.textContent = "!";
    }
 
    // show alert
    alertBox.style.display = "flex";
 
    // animation trigger
    setTimeout(() => {
        alertBox.classList.add("show");
    }, 10);
 
    // hide after 3 sec
    setTimeout(() => {
 
        alertBox.classList.remove("show");
 
        setTimeout(() => {
            alertBox.style.display = "none";
        }, 400);
 
    }, 3000);
}
 
function isDuplicateProduct(productId, currentRow) {
    let isDuplicate = false;
 
    document.querySelectorAll("#orderItemsBody tr").forEach(row => {
        if (row !== currentRow) {
            const selected = row.querySelector(".productSelect")?.value;
            if (selected === productId) {
                isDuplicate = true;
            }
        }
    });
 
    return isDuplicate;
}
function showRowError(row, message) {
    const err = row.querySelector(".error-msg");
    if (err) {
        err.textContent = message;
        err.style.display = "block";
    }
}
 
function clearRowError(row) {
    const err = row.querySelector(".error-msg");
    if (err) err.style.display = "none";
}
 
function updateFooterButtons(mode) {
 
    const pdfBtn = document.querySelector(".footer-item.pdf");
    const emailBtn = document.querySelector(".footer-item.email");
 
    // RESET FIRST
    [pdfBtn, emailBtn].forEach(btn => {
        if (!btn) return;
        btn.style.display = "flex";
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.pointerEvents = "auto";
    });
 
    // =========================
    // VIEW MODE
    // =========================
    if (mode === "view") {
 
        pdfBtn.disabled = false;
        emailBtn.disabled = false;
 
        // keep enabled
        pdfBtn.style.opacity = "1";
        emailBtn.style.opacity = "1";
    }
 
    // =========================
    // EDIT MODE
    // =========================
    if (mode === "edit") {
 
        pdfBtn.disabled = true;
        emailBtn.disabled = true;
 
        pdfBtn.style.opacity = "0.4";
        emailBtn.style.opacity = "0.4";
    }
 
    // =========================
    // NEW MODE
    // =========================
    if (mode === "new") {
 
        pdfBtn.disabled = true;
        emailBtn.disabled = true;
 
        pdfBtn.style.opacity = "0.4";
        emailBtn.style.opacity = "0.4";
    }
}
 
 
async function loadSalesOrderData(so_id) {
    console.log("loadSalesOrderData called with:", so_id);
 
        if (so_id) {
 
        showAlert(
            `Selected Sales Order ID: ${so_id}`,
            "success"
        );
 
    }
 
    try {
        const res = await fetch(`/api/sales-order-purchase/${so_id}`);
        console.log("API response status:", res.status);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        console.log("API data:", data);
 
        // ensure products loaded before adding items
        if (!window.SO_PRODUCTS || !window.SO_PRODUCTS.length) {
            console.log("Products not loaded yet, loading now...");
            await loadSOProducts();
            fillAllProductSelects();
        }
 
        // clear old rows and add new items
        const tbody = document.getElementById("orderItemsBody");
        tbody.innerHTML = "";
        console.log("Items to add:", data.items ? data.items.length : 0);
        (data.items || []).forEach(item => {
            console.log("Adding item:", item);
            addItem({
                product_id:   item.product_id,
                product_name: item.product_name,
                qty:          item.qty,
                tax_pct:      item.tax_pct,
                disc_pct:     item.disc_pct,
                price:        item.price,
                uom:          item.uom
            });
        });
        calculateTotals();
    } catch (err) {
        console.error("SO Load Error:", err);
    }
}
 
async function loadSuppliers() {
 
    try {
 
        const response = await fetch("/api/suppliers");
 
        const data = await response.json();
 
        console.log("Suppliers:", data);
 
        const select =
            document.getElementById("supplier_id");
 
        // clear dropdown
        select.innerHTML = `
            <option value="">
                Select Supplier
            </option>
        `;
 
        // global storage
        window.SUPPLIERS_BY_ID = {};
 
        data.forEach((supplier) => {
 
            const option =
                document.createElement("option");
 
            option.value = supplier.id;
 
            // dropdown shows supplier id
            option.textContent = supplier.id;
 
            select.appendChild(option);
 
            // store supplier details
            window.SUPPLIERS_BY_ID[supplier.id] = {
                name: supplier.name,
                email: supplier.email
            };
 
        });
 
    } catch (error) {
 
        console.error("Supplier Load Error:", error);
 
    }
}
 
 
function handleSupplierChange() {
 
    const supplierId =
        document.getElementById("supplier_id").value;
 
    const supplier =
        window.SUPPLIERS_BY_ID[supplierId];
 
    document.getElementById("supplier").value =
        supplier ? supplier.name : "";
 
    document.getElementById("supplier_email").value =
        supplier ? supplier.email : "";
}
 
 
 
 
async function savePO() {
 
    const payload = {
        po_number: String(document.querySelector("[name=po_number]").value || ""),
        supplier_id: document.querySelector("[name=supplier_id]").value,
        supplier: document.querySelector("[name=supplier]").value,
        so_id: document.querySelector("[name=so_id]").value,
        status: document.querySelector("[name=status]").value,
        pdate: document.querySelector("[name=pdate]").value,
        ddate: document.querySelector("[name=ddate]").value,
        payment_terms: document.querySelector("[name=payment_terms]").value,
        items:collectItems()   // your JS items
    };
 
    const res = await fetch("/api/save-po-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
 
    const data = await res.json();
 
    if (data.success) {
        alert("Saved!");
        window.location.href = "/purchase";
    }
}
 
// ==========================
// GLOBAL VALIDATION RULES
// ==========================
const MAX_DISCOUNT = 90;
 
function sanitizeQuantity(input) {
 
    let val = input.value;
 
    // =====================================
    // EMPTY VALUE → NO ALERT
    // =====================================
    if (val === "") {
        calculateRow(input);
        return;
    }
 
    // =====================================
    // NEGATIVE CHECK
    // =====================================
    if (val.includes("-")) {
 
        showAlert("Negative quantity not allowed", "warning");
 
        input.value = val.replace("-", "");
 
        calculateRow(input);
 
        return;
    }
 
    // =====================================
    // DECIMAL CHECK
    // =====================================
    if (val.includes(".")) {
 
        showAlert("Decimal quantity not allowed", "warning");
 
        input.value = parseInt(val) || 1;
 
        calculateRow(input);
 
        return;
    }
 
    // =====================================
    // REMOVE LETTERS
    // =====================================
    val = val.replace(/[^0-9]/g, "");
 
    let num = Number(val);
 
    // =====================================
    // ZERO CHECK
    // =====================================
    if (num === 0) {
 
        showAlert("Quantity must be greater than 0", "warning");
 
        input.value = 1;
 
        calculateRow(input);
 
        return;
    }
 
    input.value = num;
 
    calculateRow(input);
}
 
// Discount → 0 - 90 ONLY
function sanitizeDiscount(input) {
    let val = input.value;
 
    val = val.replace(/[^0-9]/g, "");
    val = Number(val);
 
    if (val > MAX_DISCOUNT) {
        val = MAX_DISCOUNT;
        showAlert("Discount cannot exceed 90%", "warning");
    }
 
    input.value = val;
}
 
function sanitizeMaxValue(input, maxValue, message) {
    let val = input.value;
 
    val = val.replace(/[^0-9]/g, "");
    val = Number(val);
 
    if (isNaN(val) || val < 0) {
        val = 0;
    }
 
    if (val > maxValue) {
        val = maxValue;
        showAlert(message, "warning");
    }
 
    input.value = val;
}
 
function sanitizeGlobalDiscount(input) {
    sanitizeMaxValue(input, 90, "Global discount cannot exceed 90%");
    calculateTotals(); // optional but recommended
}
 
// HARD VALIDATION BEFORE CALCULATION
function validateRowStrict(row) {
    const qtyInput = row.querySelector(".qtyInput");
    const discInput = row.querySelector(".discInput");
 
    let qty = Number(qtyInput?.value || 0);
    let disc = Number(discInput?.value || 0);
 
    let valid = true;
 
    // QUANTITY CHECK
    if (!Number.isInteger(qty) || qty < 0) {
        showAlert("Quantity must be a whole number", "error");
        qtyInput.value = Math.floor(qty || 1);
        valid = false;
    }
 
    // DISCOUNT CHECK
    if (disc < 0) {
        discInput.value = 0;
        valid = false;
    }
 
    if (disc > MAX_DISCOUNT) {
        discInput.value = MAX_DISCOUNT;
        showAlert("Discount max allowed is 90%", "warning");
        valid = false;
    }
 
    return valid;
}
 
// ==========================
// LIVE FIELD VALIDATION
// ==========================
 
const isEditMode =
    window.location.pathname.includes("/edit");
 
const isViewMode =
    window.location.pathname.includes("/view");
 
function setupLiveValidation() {
 
    if (isEditMode || isViewMode) {
        return;
    }
    const ddate =
        document.getElementById("ddate");
 
    const supplier =
        document.getElementById("supplier_id");
 
    const so =
        document.getElementById("so_id");
 
    const ddateError =
        document.getElementById("ddateError");
 
    const supplierError =
        document.getElementById("supplierError");
 
    const soError =
        document.getElementById("soError");
 
    // =========================
    // DELIVERY DATE
    // =========================
    ddate?.addEventListener("change", () => {
 
        if (!ddate.value.trim()) {
 
            ddateError.style.display = "block";
 
            ddateError.innerText =
                "Delivery Date is required";
 
        } else {
 
            ddateError.innerText = "";
 
            ddateError.style.display = "none";
        }
 
    });
 
    // =========================
    // SUPPLIER
    // =========================
    supplier?.addEventListener("change", () => {
 
        if (!supplier.value.trim()) {
 
            supplierError.style.display = "block";
 
            supplierError.innerText =
                "Supplier is required";
 
        } else {
 
            supplierError.innerText = "";
 
            supplierError.style.display = "none";
        }
 
    });
 
    // =========================
    // SALES ORDER
    // =========================
    so?.addEventListener("change", () => {
 
        if (!so.value.trim()) {
 
            soError.style.display = "block";
 
            soError.innerText =
                "Sales Order Reference is required";
 
        } else {
 
            soError.innerText = "";
 
            soError.style.display = "none";
        }
 
    });
 
}
 
function validateInitialFields() {
   
 
    if (isEditMode || isViewMode) {
        return;
    }
 
    const ddateError =
        document.getElementById("ddateError");
 
    const supplierError =
        document.getElementById("supplierError");
 
    const soError =
        document.getElementById("soError");
 
    // DELIVERY DATE
    if (!document.getElementById("ddate").value) {
 
        ddateError.style.display = "block";
 
        ddateError.innerText =
            "Delivery Date is required";
 
    } else {
 
        ddateError.style.display = "none";
    }
 
    // SUPPLIER
    if (!document.getElementById("supplier_id").value) {
 
        supplierError.style.display = "block";
 
        supplierError.innerText =
            "Supplier is required";
 
    } else {
 
        supplierError.style.display = "none";
    }
 
    // SALES ORDER
    if (!document.getElementById("so_id").value) {
 
        soError.style.display = "block";
 
        soError.innerText =
            "Sales Order Reference is required";
 
    } else {
 
        soError.style.display = "none";
    }
}
 
window.addEventListener("DOMContentLoaded", () => {
 
    const po_number =
        document.querySelector("input[name='po_number']").value;
 
    if (po_number) {
 
        loadComments(po_number);
 
    }
 
});
 
 
 