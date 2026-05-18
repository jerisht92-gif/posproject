const CURRENCY = "₹";

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
    const emailBtn = document.getElementById("purchaseEmailBtn");

    try {
        const actionBtn = emailBtn || document.querySelector(".footer-item.email");
        
        // Collect PO data
        const poData = {

            po_number:
                document.querySelector("input[name='po_number']")?.value
                || document.querySelector("input[readonly]")?.value,

            supplier:
                document.querySelector("input[name='supplier']")?.value
                || "",

            // ADD THIS
            supplier_email:
                document.getElementById("supplier_email")?.value || "",

            so_id:
                document.querySelector("select[name='so_id']")?.value || "",

            status:
                document.getElementById("status_dropdown")?.value || "Draft",

            pdate:
                document.querySelector("input[name='pdate']")?.value || "",

            ddate:
                document.querySelector("input[name='ddate']")?.value || "",

            payment_terms:
                document.querySelector("select[name='payment_terms']")?.value || "",

            currency:
                document.querySelector("select[name='currency']")?.value || "INR",

            shipping:
                parseFloat(
                    document.querySelector("input[name='shipping']")?.value || 0
                ),

            global_discount:
                parseFloat(
                    document.querySelector("input[name='globalDiscount']")?.value || 0
                ),
            rounding:
                parseFloat(
                    document.querySelector("input[name='rounding']")?.value || 0
                ),

            subtotal:
                parseFloat(
                    (document.getElementById("subtotal")?.innerText || "0")
                        .replace(/[₹,\s]/g, "")
                ),

            tax:
                parseFloat(
                    (document.getElementById("tax")?.innerText || "0")
                        .replace(/[₹,\s]/g, "")
                ),

            discount_total:
                parseFloat(
                    (document.getElementById("discountTotal")?.innerText || "0")
                        .replace(/[₹,\s]/g, "")
                ),

            grand_total:
                parseFloat(
                    (document.getElementById("grandTotal")?.innerText || "0")
                        .replace(/[₹,\s]/g, "")
                ),

            notes:
                document.querySelector("textarea[name='notes']")?.value || "",

            items:
                collectItems(),

        };

        if (!poData.po_number) {
            showAlert("PO Number missing", "warning");
            return;
        }

        // Show confirmation
        showAlert(
            `Sending PO ${poData.po_number} to ${poData.supplier_email}`,
            "info"
        );

        // Disable button and show loading state
        const originalText = actionBtn?.innerText || "Email";
        if (actionBtn) {
            actionBtn.innerText = "Sending...";
            actionBtn.disabled = true;
            actionBtn.style.opacity = "0.7";
            actionBtn.style.cursor = "wait";
        }

        // Send to backend endpoint
        const res = await fetch(`/api/purchase-orders/${poData.po_number}/email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(poData)
        });

        const result = await res.json();

        if (result.success) {
          showAlert(`PO ${poData.po_number} emailed successfully ✅`, "success");
        } else {
            showAlert(result.message || "Failed to send email", "error");
        }

    } catch (err) {
        console.error(err);
        showAlert("Network / Server error", "error");
    } finally {
        if (emailBtn) {
            emailBtn.innerText = "Email";
            emailBtn.disabled = false;
            emailBtn.style.opacity = "";
            emailBtn.style.cursor = "";
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
const uploadCard = document.getElementById("uploadCard");
const uploadBtn = document.getElementById("uploadBtn");
const filesList = document.getElementById("filesList");
const fileCount = document.getElementById("fileCount");

let files = [];

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
addCommentBtn.addEventListener("click", async (e) => {

    e.preventDefault();

    const text = commentText.value.trim();

    if (!text) return;

    const po_number =
        document.querySelector("input[name='po_number']").value;

    try {

        const res = await fetch("/api/purchase-comments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                po_number: po_number,
                comment: text,
                created_by: "Admin"
            })
        });

        const result = await res.json();

        if (!res.ok) {
            showAlert(result.error || "Failed", "error");
            return;
        }

        const div = document.createElement("div");

        div.classList.add("history-item");

        const time = new Date().toLocaleString();

        div.innerHTML = `
            <p>
                <strong>Admin - ${time}</strong>
            </p>
            <p>${text}</p>
        `;

        historyDiv.appendChild(div);

        if (noHistoryMsg) {
            noHistoryMsg.style.display = "none";
        }

        commentText.value = "";

        addCommentBtn.disabled = true;

        showAlert("Comment Added", "success");

    } catch (err) {

        console.error(err);

        showAlert("Comment save failed", "error");

    }

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

    for (let f of selectedFiles) {

        // ✅ ADD THIS
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
                showAlert("Upload failed", "error");
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
                <i class="fa-regular fa-folder-open"></i>
                <p>No files attached yet</p>
            </div>`;
    } else {
        files.forEach((file, index) => {
            const div = document.createElement("div");
            div.classList.add("file-item");
            div.innerHTML = `<span>${file.name}</span>
                             <button class="delete-file" data-index="${index}">❌</button>`;
            filesList.appendChild(div);
        });
    }
    fileCount.textContent = `${files.length} file(s)`;
}



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



// Delete file
filesList?.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-file")) {
        const index = e.target.dataset.index;
        files.splice(index, 1);
        updateFileUI();
    }
});




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
  const pidCell = row.querySelector(".prodIdCell");
  const stockCell = row.querySelector(".stockCell");
  const uomCell = row.querySelector(".uomCell");
  const taxCell = row.querySelector(".taxCell");
  const discInput = row.querySelector(".discInput");

  if (!productId || !window.SO_PRODUCTS_MAP[productId]) {
    if (pidCell) pidCell.textContent = "-";
    if (stockCell) stockCell.textContent = "0";
    if (uomCell) uomCell.textContent = "-";
    if (taxCell) taxCell.textContent = "0";
    row.dataset.taxPct = "0";
    return;
  }

  const p = window.SO_PRODUCTS_MAP[productId];

  const pid = String(p.product_id || p.id || p.code || productId);
  const stock = Number(
    p.stock_level ?? p.quantity ?? p.stock ?? p.qty ?? p.available_qty ?? 0
  );
  const uomVal = String(p.uom || p.unit || "Nos").trim();

  let taxPct = 0;
  const taxCode = String(p.tax_code || p.taxCode || p.tax || "").trim();
  const m = taxCode.match(/(\d+(?:\.\d+)?)\s*%/);

  if (m) taxPct = Number(m[1]) || 0;
  else taxPct = Number(p.tax_pct ?? p.taxPct ?? 0) || 0;

  const defaultDisc = Number(p.discount ?? p.disc ?? 0) || 0;
  if (discInput && (!discInput.value || Number(discInput.value) === 0)) {
    discInput.value = defaultDisc;
  }

  if (pidCell) pidCell.textContent = pid;
  if (stockCell) stockCell.textContent = String(stock);
  if (uomCell) uomCell.textContent = uomVal;
  if (taxCell) taxCell.textContent = String(taxPct);

  row.dataset.taxPct = String(taxPct);

  const qtyEl = row.querySelector(".qtyInput");
  if (qtyEl) calculateRow(qtyEl);
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

  const price = Number(p?.unit_price || p?.price || 0);

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

  const globalDiscountInput = document.getElementById("globalDiscount");
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

    if (action === "GoBack") {
        window.location.href = "/purchase";
        return;
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
            showAlert("Saved as Draft ✅", "success");
        } 
        else if (action === "Submitted") {
            showAlert("Purchase Order Submitted ✅", "success");
        } 
        else if (action === "Approved") {
            showAlert("Purchase Order Approved ✅", "success");
        } 
        else if (action === "Rejected") {
            showAlert("Purchase Order Rejected ❌", "error");
        } 
        else {
            showAlert("Saved Successfully ✅", "success");
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
                    p.unit_price || 0
                ),

            tax_pct: Number(row.dataset.taxPct || 0), 

            disc_pct:
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

                if (so_id) {
                    loadSalesOrderData(so_id);
                }
            });
        }

    // =========================
    // PREFILL FORM
    // =========================
    if (po_data && po_data.po_number) {

        document.querySelector('[name="po_number"]').value = po_data.po_number || "";
        document.querySelector('[name="supplier"]').value = po_data.supplier_name || "";
        document.querySelector('[name="supplier_id"]').value = po_data.supplier_id || "";
        document.querySelector('[name="supplier_email"]').value = po_data.supplier_email || "";
        document.querySelector('[name="so_id"]').value = po_data.so_id || "";
        document.querySelector('[name="pdate"]').value = po_data.pdate || "";
        document.querySelector('[name="ddate"]').value = po_data.ddate || "";
        document.querySelector('[name="payment_terms"]').value = po_data.payment_terms || "";
        document.querySelector('[name="inco_terms"]').value = po_data.inco_terms || "";
        document.querySelector('[name="notes"]').value = po_data.notes || "";

        const statusEl = document.getElementById("status_dropdown");
        if (statusEl) statusEl.value = po_data.status || "Draft";
        updateStatusBadge(po_data.status || "Draft");

        // Sync hidden status field
        const hiddenStatus = document.getElementById("status");
        if (hiddenStatus) hiddenStatus.value = po_data.status || "Draft";

        // Trigger supplier change to populate name and email if supplier_id is set
        if (po_data.supplier_id) {
            handleSupplierChange();
        }

        if (po_data.items && po_data.items.length > 0) {
            const tbody = document.getElementById("orderItemsBody");
            tbody.innerHTML = "";

            po_data.items.forEach(item => addItem(item));
        }

        // 🔥 APPLY PRODUCT DATA AFTER RENDER
        setTimeout(() => {
            document.querySelectorAll("#orderItemsBody tr").forEach(row => {
                const select = row.querySelector(".productSelect");
                const pid = row.querySelector(".prodIdCell")?.innerText;

                if (select && pid) {
                    select.value = pid;
                    applyProductToRow(row, pid);
                }
            });

            calculateTotals();
        }, 200);
    }

    // =========================
    // VIEW MODE (READ ONLY)
    // =========================
    if (mode === "view") {
        document.querySelectorAll("#poForm input:not([type='hidden']), #poForm select, #poForm textarea, #poForm button")
            .forEach(el => {
                if (!el.classList.contains('btn-discard')) {
                    el.disabled = true;
                }
            });

        // Also prevent adding comments or uploading files while viewing
        document.getElementById('commentText')?.setAttribute('disabled', 'disabled');
        document.getElementById('addCommentBtn')?.setAttribute('disabled', 'disabled');
        document.getElementById('fileInput')?.setAttribute('disabled', 'disabled');
        document.getElementById('uploadBtn')?.setAttribute('disabled', 'disabled');

        // Keep cancel buttons enabled in view mode
        document.querySelectorAll("button.btn-discard").forEach(btn => {
            btn.disabled = false;
            btn.style.display = "inline-block";
        });

        // Hide submit/draft buttons in view mode, keep Cancel actions active
        document.querySelectorAll("button.btn-draft, button.btn-save").forEach(btn => btn.style.display = "none");
        document.querySelectorAll(".footer-item:not(.pdf):not(.email)").forEach(btn => btn.style.display = "none");
    }

    // =========================
    // EDIT MODE
    // =========================
    if (mode === "edit") {
        // Enable all fields for editing
        document.querySelectorAll("#poForm input:not([type='hidden']), #poForm select, #poForm textarea")
            .forEach(el => el.disabled = false);
        updateActionButtons(po_data.status);
        setStatusColor(po_data.status);
    }

    // Add event listeners for required field validation
    document.getElementById("ddate")?.addEventListener("input", checkRequiredFields);
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
                type="number"
                class="qtyInput"
                value="${item.qty || 1}"
                min="1"
                oninput="calculateRow(this)"
            >
        </td>

        <td class="uomCell">
            -
        </td>

        <td class="taxCell">
             ${item.tax_pct || 0}
        </td>

        <td>
            <input
                type="number"
                class="discInput"
                value="${item.disc_pct || 0}"
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
                type="button"
                onclick="deleteRow(this)"
                class="so-delete-btn"
                title="Delete Item"
            >
                        <svg xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor">
                        <path d="M9 3V4H4V6H5V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V6H20V4H15V3H9ZM7 6H17V19H7V6ZM9 8V17H11V8H9ZM13 8V17H15V8H13Z"/>
                    </svg>
            </button>
        </td>
            `;

    tbody.appendChild(row);

    const select =
        row.querySelector(".productSelect");

    select.innerHTML =
        buildProductOptions();

    if (productId) {

        select.value = productId;

        applyProductToRow(
            row,
            productId
        );

        calculateRow(select);
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

function showAlert(message, type = "warning") {
    const alertBox = document.getElementById("discountAlert");
    const msg = document.getElementById("alertMessage");
    const icon = document.querySelector(".alert-icon");

    msg.textContent = message;

    alertBox.classList.remove("success", "error", "warning");

    if (type === "success") {
        alertBox.classList.add("success");
        icon.textContent = "✓";
    }
    if (type === "error") {
        alertBox.classList.add("error");
        icon.textContent = "✕";
    }
    if (type === "warning") {
        alertBox.classList.add("warning");
        icon.textContent = "!";
    }

    alertBox.style.display = "flex";

    setTimeout(() => {
        alertBox.style.display = "none";
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

/** Normalize GET /api/suppliers rows (object or legacy tuple array). */
function normalizeSupplierApiRow(row) {
    if (Array.isArray(row)) {
        return {
            id: String(row[0] || "").trim(),
            name: String(row[1] || "").trim(),
            email: String(row[2] || "").trim(),
        };
    }
    if (!row || typeof row !== "object") {
        return { id: "", name: "", email: "" };
    }
    return {
        id: String(row.id || row.supplier_id || "").trim(),
        name: String(row.name || row.supplier_name || "").trim(),
        email: String(row.email || "").trim(),
    };
}

async function loadSuppliers() {
    const select = document.getElementById("supplier_id");
    if (!select) return;

    try {
        const response = await fetch("/api/suppliers");
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        const rows = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

        select.innerHTML = `<option value="">Select Supplier</option>`;
        window.SUPPLIERS_BY_ID = {};

        rows.forEach((raw) => {
            const supplier = normalizeSupplierApiRow(raw);
            if (!supplier.id) return;

            const option = document.createElement("option");
            option.value = supplier.id;
            option.textContent = supplier.id;
            select.appendChild(option);

            window.SUPPLIERS_BY_ID[supplier.id] = {
                name: supplier.name,
                email: supplier.email,
            };
        });
    } catch (error) {
        console.error("Supplier Load Error:", error);
        select.innerHTML = `<option value="">Select Supplier</option>`;
        window.SUPPLIERS_BY_ID = {};
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
        po_number: document.querySelector("[name=po_number]").value,
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

// Quantity → INTEGER ONLY
function sanitizeQuantity(input) {
    let val = input.value;

    // allow only numbers + dot
    val = val.replace(/[^0-9.]/g, "");

    // allow only one dot
    val = val.replace(/(\..*)\./g, "$1");

    // EMPTY FIELD → allow empty (IMPORTANT FIX)
    if (val === "") {
        input.value = "";
        calculateRow(input);   // update totals
        return;
    }

    let num = Number(val);

    if (isNaN(num)) {
        input.value = "";
        return;
    }

    // decimal warning
    if (val.includes(".")) {
        showAlert("Decimal not allowed in quantity", "warning");
    }

    // force integer
    num = Math.floor(num);

    input.value = String(num);

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



window.addEventListener("DOMContentLoaded", () => {

    const po_number =
        document.querySelector("input[name='po_number']").value;

    if (po_number) {

        loadComments(po_number);

    }

});