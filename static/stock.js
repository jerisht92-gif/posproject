const urlParams = new URLSearchParams(window.location.search);
const stockMode = urlParams.get("mode") || "create";
const stockId = urlParams.get("id") || "";
let count = 1;
let loadedStock = null;

function addRow() {
    const table = document.getElementById("items-body");
    const row = `
        <tr>
            <td>${count++}</td>
            <td><input type="text"></td>
            <td><input type="text"></td>
            <td><input type="text"></td>
            <td><input class="qty-ordered" type="number"></td>
            <td><input class="qty-received" type="number"></td>
            <td><input class="qty-accepted" type="number"></td>
            <td><input class="qty-rejected" type="number" readonly></td>
            <td><input class="qty-remaining" type="number" readonly></td>
            <td><input type="text"></td>
            <td><input type="text"></td>
            <td class="so-action-col">
            <button type="button" onclick="deleteRow(this)" class="so-delete-btn">
                <i class="fa-solid fa-trash"></i>
            </button>
        </td>
        </tr>
    `;
    table.insertAdjacentHTML("beforeend", row);
    attachCalculation(table.lastElementChild);
}

function deleteRow(btn) {
    btn.closest("tr").remove();
}

function loadGRN() {

    fetch('/api/generate-grn')

        .then(res => {

            if (!res.ok) {
                throw new Error("Failed to fetch GRN");
            }

            return res.json();

        })

        .then(data => {

            console.log("GRN API RESPONSE:", data);

            const grnField = document.getElementById("grnField");

            if (grnField) {

                grnField.value = data.grn_number || "";

            }

        })

        .catch(err => {

            console.log("GRN Error:", err);

        });

}

function loadSubmittedPOs() {

    fetch("/api/submitted-pos")

        .then(res => res.json())

        .then(data => {

            const poField =
                document.getElementById("poField");

            poField.innerHTML =
                `<option value="">Select PO</option>`;

            data.forEach(po => {

                poField.innerHTML += `

                    <option value="${po.po_number}">
                        ${po.po_number}
                    </option>

                `;

            });

        })

        .catch(err => {

            console.log(err);

        });
}


function loadPOData(poNumber) {

    if (!poNumber) return;

    fetch(`/api/purchase/${poNumber}`)

        .then(res => res.json())

        .then(data => {

            document.getElementById("supplierName").value =
                data.supplier_name || "";

            document.getElementById("supplierEmail").value =
                data.supplier_email || "";

            const tbody =
                document.getElementById("items-body");

            tbody.innerHTML = "";

            data.items.forEach((item, index) => {

                const row = document.createElement("tr");

                row.innerHTML = `

                    <td>${index + 1}</td>

                    <td>
                        <input value="${item.product_name}" readonly>
                    </td>

                    <td>
                        <input value="${item.product_id}" readonly>
                    </td>

                    <td>
                        <input value="${item.uom}" readonly>
                    </td>

                    <td>
                        <input class="qty-ordered"
                               value="${item.qty}"
                               readonly>
                    </td>

                    <td>
                        <input class="unit-price"
                               type="number"
                               value="${item.price || 0}"
                               readonly>
                    </td>

                    <td>
                        <input class="tax-pct"
                               type="number"
                               value="${item.tax_pct || 0}"
                               readonly>
                    </td>

                    <td>
                        <input class="disc-pct"
                               type="number"
                               value="${item.disc_pct || 0}"
                               readonly>
                    </td>

                    <td>
                        <input class="qty-received"
                               type="number"
                               value="0">
                    </td>

                    <td>
                        <input class="qty-accepted"
                               type="number"
                               value="0">
                    </td>

                    <td>
                        <input class="qty-rejected"
                               value="0"
                               readonly>
                    </td>

                    <td>
                        <input class="qty-remaining"
                               value="${item.qty}"
                               readonly>
                    </td>

                    <td>
                        <input class="line-total"
                               value="0"
                               readonly>
                    </td>

                    <td>
                        <select class="warehouse">
                            <option value="">Select</option>
                            <option>Main Store</option>
                            <option>Secondary Store</option>
                        </select>
                    </td>

                    <td>
                        <select class="stock-dim">
                            <option value="">Select</option>
                            <option>Good</option>
                            <option>Damaged</option>
                        </select>
                    </td>

                    <td>
                        <button class="so-delete-btn"
                                type="button"
                                onclick="deleteRow(this)">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                `;

                tbody.appendChild(row);

                attachCalculation(row);

            });

        })

        .catch(err => {

            console.log(err);

            showToast("Unable to load PO", "error");

        });
}

function updateStatusDisplay(status) {
    const display = document.getElementById("statusDisplay");
    if (display) {
        display.value = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Draft";
    }
}

function updateStatusBadge(status){

    const badge =
        document.getElementById("statusBadge");

    if(!badge) return;

    // HIDE IN CREATE/NEW MODE
    if(stockMode === "new" || stockMode === "create"){

        badge.style.display = "none";
        return;
    }

    // SHOW IN EDIT/VIEW
    badge.style.display = "inline-flex";

    const normalized =
        (status || "draft").toLowerCase();

    // remove old classes
    badge.classList.remove(
        "status-draft",
        "status-submitted",
        "status-pending",
        "status-approved",
        "status-rejected",
        "status-cancelled"
    );

    // add new class
    badge.classList.add(`status-${normalized}`);

    // text
    badge.innerText =
        `Status : ${
            normalized.charAt(0).toUpperCase() +
            normalized.slice(1)
        }`;
}

function setFormEditable(editable) {

    // If view mode → force disable everything
    if (stockMode === "view") {
        editable = false;
    }

        document.querySelectorAll("input, select, textarea").forEach(el => {
        if (!el.id.includes("statusDisplay")) {
            el.disabled = !editable;
        }
    });

    const controls = document.querySelectorAll(
        "#receivedDate, #supplierName, #supplierEmail, #supplierDn, #supplierInvoice, " +
        "#receivedBy, #qcBy, #statusField, #poField, #items-body input, #items-body select"
    );

    controls.forEach(el => {

        // Skip status/grn fields
        if (
            el.id === "grnField" ||
            el.id === "statusDisplay"
        ) {
            return;
        }

        // Always readonly fields
        if (
            el.classList.contains("unit-price") ||
            el.classList.contains("tax-pct") ||
            el.classList.contains("disc-pct") ||
            el.classList.contains("qty-ordered") ||
            el.classList.contains("qty-rejected") ||
            el.classList.contains("qty-remaining") ||
            el.classList.contains("line-total")
        ) {

            el.readOnly = true;
            el.disabled = true;
            return;
        }

        // Editable fields
        el.disabled = !editable;
    });

    // Delete button
    document.querySelectorAll(".so-delete-btn").forEach(btn => {
        btn.disabled = !editable;
    });
}

function updateActionButtons(status) {

    const normalized = (status || "draft").toLowerCase();

    const saveDraftBtn = document.getElementById("saveDraftBtn");
    const submitBtn = document.getElementById("submitBtn");
    const cancelOrderBtn = document.getElementById("cancelOrderBtn");
    const stockReturnBtn = document.getElementById("stockReturnBtn");
    const pdfBtn = document.getElementById("pdfBtn");
    const emailBtn = document.getElementById("emailBtn");

    // =========================
    // RESET ALL (UI ONLY)
    // =========================

    if (saveDraftBtn) saveDraftBtn.disabled = true;
    if (submitBtn) submitBtn.disabled = true;   // ❗ ALWAYS DISABLED HERE
    if (cancelOrderBtn) cancelOrderBtn.disabled = true;
    if (stockReturnBtn) stockReturnBtn.disabled = true;
    if (cancelOrderBtn) {
    if (stockMode === "edit" && normalized !== "cancelled") {
        cancelOrderBtn.disabled = false;
    } else {
        cancelOrderBtn.disabled = true;
    }
}

    if (pdfBtn) {
        pdfBtn.disabled = true;
        pdfBtn.classList.add("disabled-btn");
    }

    if (emailBtn) {
        emailBtn.disabled = true;
        emailBtn.classList.add("disabled-btn");
    }

    // =========================
    // VIEW MODE
    // =========================
    if (stockMode === "view") {

        if (cancelOrderBtn) {
            cancelOrderBtn.disabled = (normalized === "cancelled");
        }

        if (pdfBtn) {
            pdfBtn.disabled = false;
            pdfBtn.classList.remove("disabled-btn");
        }

        if (emailBtn) {
            emailBtn.disabled = false;
            emailBtn.classList.remove("disabled-btn");
        }

        setFormEditable(false);
        return;
    }

    // =========================
    // DRAFT / CREATE MODE
    // =========================
    if (normalized === "draft") {

        if (saveDraftBtn) saveDraftBtn.disabled = false;
        

        setFormEditable(true);
    }

    // =========================
    // SUBMITTED MODE
    // =========================
    else if (normalized === "submitted") {

        if (stockReturnBtn) stockReturnBtn.disabled = false;
        

        setFormEditable(false);
    }

    // =========================
    // CANCELLED / RETURNED
    // =========================
    else {

        setFormEditable(false);
    }
}

function sanitizeValue(value) {
    return value == null ? "" : String(value).replace(/"/g, '&quot;');
}

function createStockRow(item, index, editable) {

    const warehouseValue = sanitizeValue(item.warehouse);
    const stockDimValue = sanitizeValue(item.stock_in);

    const readOnlyAttr = editable ? "" : "readonly";
    const disabledAttr = editable ? "" : "disabled";
    const deleteAttr = editable ? "" : "disabled";

    return `
    <tr>

        <td>${index + 1}</td>

        <td>
            <input value="${sanitizeValue(item.product_name)}" readonly>
        </td>

        <td>
            <input value="${sanitizeValue(item.product_id)}" readonly>
        </td>

        <td>
            <input value="${sanitizeValue(item.uom)}" readonly>
        </td>

        <td>
            <input class="qty-ordered"
                   value="${item.qty_ordered || 0}"
                   readonly>
        </td>

        <td>
            <input class="unit-price"
                type="number"
                value="${item.price || 0}"
                readonly
                disabled>
        </td>

        <td>
                <input class="tax-pct"
                    type="number"
                    value="${item.tax_pct || 0}"
                    readonly
                    disabled>
        </td>

        <td>
                <input class="disc-pct"
                    type="number"
                    value="${item.disc_pct || 0}"
                    readonly
                    disabled>
        </td>

        <td>
            <input class="qty-received"
                   type="number"
                   value="${item.qty_received || 0}"
                   ${readOnlyAttr}>
        </td>

        <td>
            <input class="qty-accepted"
                   type="number"
                   value="${item.accepted_qty || 0}"
                   ${readOnlyAttr}>
        </td>

        <td>
            <input class="qty-rejected"
                   value="${item.rejected_qty || 0}"
                   readonly>
        </td>

        <td>
            <input class="qty-remaining"
                   value="${item.qty_remaining || 0}"
                   readonly>
        </td>

        <td>
            <input class="line-total"
                   value="${item.total || 0}"
                   readonly>
        </td>

        <td>
            <select class="warehouse" ${disabledAttr}>
                <option value="">Select</option>
                <option value="Main Store"
                    ${warehouseValue === "Main Store" ? "selected" : ""}>
                    Main Store
                </option>

                <option value="Secondary Store"
                    ${warehouseValue === "Secondary Store" ? "selected" : ""}>
                    Secondary Store
                </option>
            </select>
        </td>

        <td>
            <select class="stock-dim" ${disabledAttr}>
                <option value="">Select</option>

                <option value="Good"
                    ${stockDimValue === "Good" ? "selected" : ""}>
                    Good
                </option>

                <option value="Damaged"
                    ${stockDimValue === "Damaged" ? "selected" : ""}>
                    Damaged
                </option>
            </select>
        </td>

        <td>
            <button class="so-delete-btn"
                    type="button"
                    onclick="deleteRow(this)"
                    ${deleteAttr}>

                <i class="fa-solid fa-trash"></i>

            </button>
        </td>

    </tr>
    `;
}

function loadComments(grn) {

    fetch(`/api/stock-comments/${grn}`)
        .then(res => res.json())
        .then(data => {

            historyDiv.innerHTML = "";

            if (!data.length) {
                if (noHistoryMsg) noHistoryMsg.style.display = "block";
                return;
            }

            if (noHistoryMsg) noHistoryMsg.style.display = "none";

            data.forEach(c => {

                const div = document.createElement("div");
                div.classList.add("history-item");

                div.innerHTML = `
                    <p><strong>${c.created_by} - ${c.created_at}</strong></p>
                    <p>${c.comment}</p>
                `;

                historyDiv.appendChild(div);
            });
        });
}

function populateStockRows(items, editable) {
    const tbody = document.getElementById("items-body");
    tbody.innerHTML = "";
    count = 1;
    items.forEach((item, index) => {
        const row = document.createElement("tr");
        row.innerHTML = createStockRow(item, index, editable);
        tbody.appendChild(row);
        attachCalculation(row);
    });
}

function populateStockForm(stock) {
    loadedStock = stock;
    document.getElementById("grnField").value = stock.grn_number || "";
    document.getElementById("receivedDate").value = stock.received_date || "";
    document.getElementById("supplierName").value = stock.supplier_name || "";
    document.getElementById("supplierEmail").value = stock.supplier_email || "";
    document.getElementById("supplierDn").value = stock.supplier_dn_no || "";
    document.getElementById("supplierInvoice").value = stock.supplier_invoice_no || "";
    document.getElementById("receivedBy").value = stock.received_by || "";
    document.getElementById("qcBy").value = stock.qc_done_by || "";
    document.getElementById("statusField").value = stock.status || "draft";
    updateStatusDisplay(stock.status || "draft");
    updateStatusBadge(stock.status || "draft");
    updateActionButtons(stock.status || "draft");
    document.getElementById("poField").value = stock.po_number || "";
    const isEditable = stock.status === "draft" && stockMode === "edit";
    populateStockRows(stock.items || [], isEditable);
    loadComments(stock.grn_number);
    loadAttachments(stock.grn_number);
}
function calculateGrandTotal() {
    let total = 0;

    document.querySelectorAll(".line-total").forEach(el => {
        total += parseFloat(el.value) || 0;
    });

    document.getElementById("grandTotalField").value = total.toFixed(2);

    return total;
}



function loadStockById(id) {
    if (!id) return;
    fetch(`/api/stock-receipt/${encodeURIComponent(id)}`)
        .then(res => {
            if (!res.ok) throw new Error("Stock receipt not found");
            return res.json();
        })
        .then(data => populateStockForm(data))
        .catch(error => showToast(error.message || "Unable to load stock receipt", "error"));
}

function saveStock(status) {
    const po = document.getElementById("poField").value;
    if (!po) {
        showToast("PO field is empty", "error");
        return;
    }
    const rows = document.querySelectorAll("#items-body tr");

    if (!po) {
        showToast("Please select PO", "error");
        return;
    }
    if (rows.length === 0) {
        showToast("No items found", "error");
        return;
    }

    const items = [];
    for (let row of rows) {
        const received = row.querySelector(".qty-received").value;
        const accepted = row.querySelector(".qty-accepted").value;
        const warehouse = row.querySelector(".warehouse").value;
        if (!received || !accepted) {
            showToast("Enter Received & Accepted Qty", "error");
            return;
        }
        if (!warehouse) {
            showToast("Select Warehouse", "error");
            return;
        }
        items.push({

            product_name: row.cells[1].querySelector("input").value,

            product_id: row.cells[2].querySelector("input").value,

            uom: row.cells[3].querySelector("input").value,

            qty_ordered: parseInt(
                row.querySelector(".qty-ordered").value
            ) || 0,

            qty_received: parseInt(received) || 0,

            accepted_qty: parseInt(accepted) || 0,

            rejected_qty: parseInt(
                row.querySelector(".qty-rejected").value
            ) || 0,

            warehouse: warehouse,

            stock_in: row.querySelector(".stock-dim").value || "",
            unit_price: parseFloat(
                row.querySelector(".unit-price").value
            ) || 0,

            tax_pct: parseFloat(
                row.querySelector(".tax-pct").value
            ) || 0,

            disc_pct: parseFloat(
                row.querySelector(".disc-pct").value
            ) || 0,

            total: parseFloat(
                row.querySelector(".line-total").value
            ) || 0

        });
    }

    fetch("/api/save-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            grn_number: document.getElementById("grnField").value,
            po_number: po,
            received_date: document.getElementById("receivedDate").value,
            supplier_name: document.getElementById("supplierName").value,
            supplier_email: document.getElementById("supplierEmail").value,
            supplier_dn_no: document.getElementById("supplierDn").value,
            supplier_invoice_no: document.getElementById("supplierInvoice").value,
            received_by: document.getElementById("receivedBy").value,
            qc_done_by: document.getElementById("qcBy").value,
            items: items,
            status: status,
            grand_total: calculateGrandTotal()
        })
    })
    .then(res => res.json())
    .then(async data => {

        if (data.error) {

            showToast(data.error, "error");
            return;
        }

        const grn = data.grn_number;

        for (const c of pendingComments) {

            await fetch("/api/stock-comments", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    grn_number: grn,
                    comment: c.comment,
                    created_by: c.created_by

                })

            });

        }

        pendingComments = [];

        if (pendingAttachments.length > 0) {
            for (const f of pendingAttachments) {
                try {
                    await uploadStockFile(grn, f);
                } catch (uploadErr) {
                    console.error("Stock attachment upload after save:", uploadErr);
                }
            }
            pendingAttachments = [];
        }

        showToast(
            "Saved Successfully",
            "success"
        );

        window.location.replace('/stock-receipt');

    })
    .catch(err => {
        console.error(err);
        showToast("Unable to save stock receipt", "error");
    });
}

function submitForm() {
    saveStock("submitted");
}

function saveDraft() {
    saveStock("draft");
}

function cancelOrder() {

    const grn = document.getElementById("grnField").value;

    console.log("Cancel clicked, GRN:", grn); // ✅ DEBUG

    if (!grn) {
        openConfirm("GRN ID missing ❌", () => {});
        return;
    }

    openConfirm("Are you sure you want to cancel this order?", () => {
        if (!stockId) {
            // New unsaved stock, just discard
            openConfirm("Draft discarded ✅", () => {});
            window.location.replace('/stock-receipt');
            return;
        }

        fetch(`/api/stock-receipts/${encodeURIComponent(grn)}/status`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status: "cancelled" })
        })
        .then(res => res.json())
        .then(data => {

            if (data.error) {
                openConfirm("Cancel failed ❌", () => {});
                return;
            }

            // ✅ update UI
            updateStatusUI("cancelled");

        })
        .catch(err => {
            console.error(err);
            openConfirm("Server error ❌", () => {});
        });

    });
}

function stockReturn() {
    const grn = document.getElementById("grnField").value;
    if (!grn) {
        showToast("Stock receipt ID is required to return stock", "error");
        return;
    }

    fetch(`/api/stock-receipts/${encodeURIComponent(grn)}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "returned" })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            showToast(data.error, "error");
            return;
        }

        showToast("Stock receipt marked as returned", "success");
        window.location.reload();
    })
    .catch(err => {
        console.error(err);
        showToast("Unable to update stock receipt status", "error");
    });
}

function closePage() {
    window.location.replace('/stock-receipt');
}

/* =========================
   LOAD TEST DATA
========================= */
function loadTestData() {
    // Only fill form fields if they're empty (don't override user input)
    let dateInput = document.querySelector('input[type="date"]');
    if (dateInput && !dateInput.value) {
        dateInput.value = "2026-04-16";
    }

    let supplierNameInput = document.querySelector('input[placeholder="Enter Supplier Name"]');
    if (supplierNameInput && !supplierNameInput.value) {
        supplierNameInput.value = "Test Supplier Co.";
    }

    let supplierDnInput = document.querySelector('input[placeholder="Enter Supplier DN No"]');
    if (supplierDnInput && !supplierDnInput.value) {
        supplierDnInput.value = "DN-2026-TEST-001";
    }

    let supplierInvoiceInput = document.querySelector('input[placeholder="Enter Supplier Invoice No"]');
    if (supplierInvoiceInput && !supplierInvoiceInput.value) {
        supplierInvoiceInput.value = "INV-2026-TEST-001";
    }

    // Fill Received By and QC By dropdowns if empty
    let receivedBySelect = document.querySelectorAll('select')[1];
    let qcBySelect = document.querySelectorAll('select')[2];
    
    if (receivedBySelect && !receivedBySelect.value) {
        receivedBySelect.innerHTML = '<option value="">-- Select Reference --</option><option value="Admin" selected>Admin</option><option value="Warehouse Lead">Warehouse Lead</option><option value="Supervisor">Supervisor</option>';
        receivedBySelect.value = "Admin";
    }
    
    if (qcBySelect && !qcBySelect.value) {
        qcBySelect.innerHTML = '<option value="">-- Select Reference --</option><option value="QC Team" selected>QC Team</option><option value="Inspector">Inspector</option><option value="Checker">Checker</option>';
        qcBySelect.value = "QC Team";
    }

    // Fill item rows with test data (quantities and selections)
    let rows = document.querySelectorAll("#items-body tr");
    if (rows.length > 0) {
        rows.forEach((row, index) => {
            // Set quantities
            let qtyReceivedInput = row.querySelector(".qty-received");
            let qtyAcceptedInput = row.querySelector(".qty-accepted");
            
            if (qtyReceivedInput && qtyAcceptedInput) {
                if (index === 0) {
                    // First item - 95 received, 95 accepted
                    if (!qtyReceivedInput.value) qtyReceivedInput.value = "95";
                    if (!qtyAcceptedInput.value) qtyAcceptedInput.value = "95";
                } else if (index === 1) {
                    // Second item - 50 received, 48 accepted
                    if (!qtyReceivedInput.value) qtyReceivedInput.value = "50";
                    if (!qtyAcceptedInput.value) qtyAcceptedInput.value = "48";
                }

                // Trigger calculation
                qtyReceivedInput.dispatchEvent(new Event('input'));
                qtyAcceptedInput.dispatchEvent(new Event('input'));
            }

            // Set warehouse and stock dimension
            let warehouseSelect = row.querySelector(".warehouse");
            let stockDimSelect = row.querySelector(".stock-dim");

            if (warehouseSelect && !warehouseSelect.value) {
                warehouseSelect.value = index === 0 ? "Main Store" : "Secondary Store";
            }

            if (stockDimSelect && !stockDimSelect.value) {
                stockDimSelect.value = index === 0 ? "Good" : "Damaged";
            }
        });
    }

    console.log("✅ Test data loaded successfully!");
}
function loadComments(grn) {

    fetch(`/api/stock-comments/${grn}`)
        .then(res => res.json())
        .then(data => {

            historyDiv.innerHTML = "";

            if (!data.length) {
                if (noHistoryMsg) noHistoryMsg.style.display = "block";
                return;
            }

            if (noHistoryMsg) noHistoryMsg.style.display = "none";

            data.forEach(c => {

                const div = document.createElement("div");
                div.classList.add("history-item");

                div.innerHTML = `
                    <p><strong>${c.created_by} - ${c.created_at}</strong></p>
                    <p>${c.comment}</p>
                `;

                historyDiv.appendChild(div);
            });
        });
}


/* =========================
   INIT
========================= */
window.onload = function () {

    if (stockMode === "create" || stockMode === "new") {
        loadGRN();
    }

    loadSubmittedPOs();

    document.getElementById("poField")
    .addEventListener("change", function () {

        loadPOData(this.value);

    });


    if (stockMode === "view" || stockMode === "edit") {

        loadStockById(stockId);

    }
    else if (stockMode === "create") {

        document.getElementById("statusField").value = "draft";

        updateStatusDisplay("draft");
        updateStatusBadge("draft");
        updateActionButtons("draft");

        document.getElementById("poField").value = stockId;

        fetch(`/api/purchase/${encodeURIComponent(stockId)}`)
            .then(res => res.json())
            .then(data => {

                document.getElementById("supplierName").value =
                    data.supplier_name || "";

                document.getElementById("supplierEmail").value =
                    data.supplier_email || "";

                document.getElementById("poField").value =
                    data.po_number || "";

                const tbody = document.getElementById("items-body");

                tbody.innerHTML = "";

                data.items.forEach((item, index) => {

                    const row = document.createElement("tr");

                    row.innerHTML = `
                        <td>${index + 1}</td>

                        <td>
                            <input value="${item.product_name}" readonly>
                        </td>

                        <td>
                            <input value="${item.product_id}" readonly>
                        </td>

                        <td>
                            <input value="${item.uom}" readonly>
                        </td>

                        <td>
                            <input class="qty-ordered"
                                   value="${item.qty}"
                                   readonly>
                        </td>

                        <td>
                            <input class="unit-price"
                                type="number"
                                value="${item.price || 0}" readonly>
                        </td>

                        <td>
                            <input class="tax-pct"
                                type="number"
                                value="${item.tax_pct || 0}" readonly>
                        </td>

                        <td>
                            <input class="disc-pct"
                                type="number"
                                value="${item.disc_pct || 0}" readonly>
                        </td>

                        <td>
                            <input class="qty-received"
                                   type="number"
                                   value="0">
                        </td>

                        <td>
                            <input class="qty-accepted"
                                   type="number"
                                   value="0">
                        </td>

                        <td>
                            <input class="qty-rejected"
                                   value="0"
                                   readonly>
                        </td>

                        <td>
                            <input class="qty-remaining"
                                   value="${item.qty}"
                                   readonly>
                        </td>

                         <td>
                            <input class="line-total"
                                type="number"
                                value="0"
                                readonly>
                        </td>

                        <td>
                            <select class="warehouse">
                                <option value="">Select</option>
                                <option>Main Store</option>
                                <option>Secondary Store</option>
                            </select>
                        </td>

                        <td>
                            <select class="stock-dim">
                                <option value="">Select</option>
                                <option>Good</option>
                                <option>Damaged</option>
                            </select>
                        </td>

                        <td>
                            <button class="so-delete-btn"
                                    type="button"
                                    onclick="deleteRow(this)">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    `;

                    tbody.appendChild(row);

                    attachCalculation(row);

                });

            })
            .catch(err => {
                console.error(err);
                showToast("purchase load PO details", "success");
            });

    }

    document.addEventListener("input", validateStockForm);

    document.addEventListener("change", validateStockForm);

    validateStockForm();
    setupLiveValidation("receivedDate", "receivedDateError");
    setupLiveValidation("supplierDn", "supplierDnError");
    setupLiveValidation("supplierInvoice", "supplierInvoiceError");
    setupLiveValidation("receivedBy", "receivedByError");
    setupLiveValidation("qcBy", "qcByError");
    setupReceivedDateValidation();
};


/* =========================
   SEND STOCK EMAIL
========================= */
function sendStockEmail() {

    let grn = document.getElementById("grnField").value;
    let po = document.getElementById("poField").value;

    if (!grn || !po) {
        showToast("Missing GRN or PO", "error");
        return;
    }

    let emailBtn = document.getElementById("emailBtn");
    let originalText = emailBtn.innerHTML;

    emailBtn.disabled = true;
    emailBtn.innerHTML = "Sending...";

    fetch(`/api/stock-receipts/${grn}/email`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            grn_id: grn,
            po_number: po
        })
    })
    .then(res => res.json())
    .then(data => {

        if (data.success) {
            showToast("Email sent successfully", "success");
        } else {
            showToast(data.message || "Email failed", "error");
        }

    })
    .catch(err => {
        console.error(err);
        showToast("Email failed", "error");
    })
    .finally(() => {
        emailBtn.disabled = false;
        emailBtn.innerHTML = originalText;
    });
}

/* =========================
   GENERATE STOCK PDF
========================= */
function generateStockPDF() {

    let grn = document.getElementById("grnField").value;

    if (!grn) {
        showToast("GRN Number not found", "error");
        return;
    }

    window.open(`/api/stock-receipt-pdf/${grn}`, "_blank");
}


// ==========================
// ELEMENTS
// ==========================
const commentText = document.getElementById("commentText");
const addCommentBtn = document.getElementById("addCommentBtn");
const historyDiv = document.getElementById("history");
const noHistoryMsg = document.getElementById("noHistoryMsg");

const fileInput = document.getElementById("fileInput");
const uploadBox = document.getElementById("uploadBox");
const uploadBtn = document.getElementById("uploadBtn");
const filesList = document.getElementById("filesList");
const fileCount = document.getElementById("fileCount");

let files = [];

const maxFiles = 5;

let pendingComments = [];
let pendingAttachments = [];
let serverAttachmentCount = 0;

const STOCK_UPLOAD_EXTENSIONS = new Set([
    "pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png",
]);

function validateStockFile(file) {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!STOCK_UPLOAD_EXTENSIONS.has(ext)) {
        showToast("This file is not allowed", "error");
        return false;
    }
    if (file.size > 10 * 1024 * 1024) {
        showToast("File size must be less than 10MB", "error");
        return false;
    }
    return true;
}

function stockAttachmentsUsePendingQueue() {
    return stockMode === "create" || stockMode === "new";
}

function totalAttachmentCount() {
    return pendingAttachments.length + serverAttachmentCount;
}

async function uploadStockFile(grn, file) {
    const formData = new FormData();
    formData.append("grn_number", grn);
    formData.append("file", file);

    const res = await fetch("/api/stock-attachments", {
        method: "POST",
        body: formData,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
        const msg = data.message || data.error || "Upload failed";
        throw new Error(msg);
    }

    return data;
}

// ==========================
// ENABLE / DISABLE COMMENT BUTTON
// ==========================
commentText.addEventListener("input", () => {
    addCommentBtn.disabled = commentText.value.trim().length === 0;
    addCommentBtn.classList.toggle("enabled", commentText.value.trim().length > 0);
});

// ==========================
// ADD COMMENT → MOVE TO HISTORY
// ==========================
addCommentBtn.addEventListener("click", (e) => {

    e.preventDefault();

    const text = commentText.value.trim();

    if (!text) return;

    pendingComments.push({

        comment: text,
        created_by: "Admin",
        created_at: new Date().toLocaleString()

    });

    commentText.value = "";

    addCommentBtn.disabled = true;

    renderPendingComments();

    showToast(
        "Comment Added Successfully",
        "success"
    );

});


function renderPendingComments() {

    historyDiv.innerHTML = "";

    if (pendingComments.length === 0) {

        noHistoryMsg.style.display = "block";
        return;
    }

    noHistoryMsg.style.display = "none";

    pendingComments.forEach(c => {

        const div = document.createElement("div");

        div.classList.add("history-item");

        div.innerHTML = `
            <p>
                <strong>
                    ${c.created_by}
                    -
                    ${c.created_at}
                </strong>
            </p>

            <p>${c.comment}</p>
        `;

        historyDiv.appendChild(div);

    });

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
    if (!filesList) return;

    filesList.innerHTML = "";

    if (pendingAttachments.length === 0 && serverAttachmentCount === 0) {
        filesList.innerHTML = `
            <div class="no-files">
                <i class="fa-regular fa-folder-open"></i>
                <p>No files attached yet</p>
            </div>`;
        fileCount.textContent = `0 / ${maxFiles} files`;
        return;
    }

    pendingAttachments.forEach((file, index) => {
        const div = document.createElement("div");
        div.classList.add("file-item", "file-item--pending");
        div.innerHTML = `<span>${file.name} <em>(pending save)</em></span>
                         <button type="button" class="delete-file" data-pending-index="${index}">❌</button>`;
        filesList.appendChild(div);
    });

    files.forEach((file, index) => {
        const div = document.createElement("div");
        div.classList.add("file-item");
        div.innerHTML = `<span>${file.name}</span>
                         <button type="button" class="delete-file" data-index="${index}">❌</button>`;
        filesList.appendChild(div);
    });

    fileCount.textContent = `${totalAttachmentCount()} / ${maxFiles} files`;
}

async function handleFiles(selectedFiles) {
    const grn = (document.getElementById("grnField")?.value || "").trim();

    if (!grn) {
        showToast("GRN not ready yet. Please wait a moment.", "warning");
        return;
    }

    const usePending = stockAttachmentsUsePendingQueue();
    let added = 0;

    for (const f of selectedFiles) {
        if (!validateStockFile(f)) continue;

        if (totalAttachmentCount() >= maxFiles) {
            showToast("Maximum 5 files allowed", "error");
            break;
        }

        if (usePending) {
            pendingAttachments.push(f);
            added++;
            continue;
        }

        try {
            await uploadStockFile(grn, f);
            added++;
        } catch (err) {
            console.error(err);
            showToast(err.message || "Upload error", "error");
        }
    }

    if (usePending) {
        updateFileUI();
        if (added === 1) {
            showToast(`${selectedFiles[0].name} added successfully`, "success");
        } else if (added > 1) {
            showToast(`${added} files added successfully`, "success");
        }
        return;
    }

    if (added > 0) {
        showToast(
            added === 1 ? "File attached successfully" : `${added} files attached successfully`,
            "success"
        );
    }
    loadAttachments(grn);
}

// Click upload triggers file input
// Click upload triggers file input
uploadBox?.addEventListener("click", () => fileInput.click());
uploadBtn?.addEventListener("click", () => fileInput.click());

// Handle file select
fileInput?.addEventListener("change", (e) => handleFiles(e.target.files));

// Drag & Drop
uploadBox?.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = "#a52a2a";
});

uploadBox?.addEventListener("dragleave", () => {
    uploadBox.style.borderColor = "#ccc";
});

uploadBox?.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = "#ccc";
    handleFiles(e.dataTransfer.files);
});

// Delete file
filesList?.addEventListener("click", (e) => {
    const btn = e.target.closest(".delete-file");
    if (!btn) return;

    const pendingIndex = btn.dataset.pendingIndex;
    if (pendingIndex !== undefined) {
        pendingAttachments.splice(Number(pendingIndex), 1);
        updateFileUI();
        return;
    }

    const index = btn.dataset.index;
    if (index !== undefined) {
        files.splice(Number(index), 1);
        updateFileUI();
    }
});

function loadAttachments(grn) {
    if (!grn || stockAttachmentsUsePendingQueue()) {
        updateFileUI();
        return;
    }

    fetch(`/api/stock-attachments/${encodeURIComponent(grn)}`)
        .then(res => res.json())
        .then(data => {
            const list = Array.isArray(data) ? data : (data.attachments || []);
            serverAttachmentCount = list.length;
            files = list.map((file) => ({
                name: file.file_name || file.filename || "attachment",
                file_path: file.file_path,
                attachment_id: file.attachment_id || file.id,
            }));

            filesList.innerHTML = "";

            if (list.length === 0 && pendingAttachments.length === 0) {
                filesList.innerHTML = `
                    <div class="no-files">
                        <i class="fa-regular fa-folder-open"></i>
                        <p>No files attached yet</p>
                    </div>`;
                fileCount.textContent = `0 / ${maxFiles} files`;
                return;
            }

            pendingAttachments.forEach((file, index) => {
                const div = document.createElement("div");
                div.classList.add("file-item", "file-item--pending");
                div.innerHTML = `<span>${file.name} <em>(pending save)</em></span>
                    <button type="button" class="delete-file" data-pending-index="${index}">❌</button>`;
                filesList.appendChild(div);
            });

            list.forEach((file) => {
                const div = document.createElement("div");
                div.classList.add("file-item");
                const viewHref = file.file_path || "#";
                div.innerHTML = `
                    <span>${file.file_name}</span>
                    <a href="${viewHref}" target="_blank" rel="noopener">View</a>
                `;
                filesList.appendChild(div);
            });

            fileCount.textContent = `${totalAttachmentCount()} / ${maxFiles} files`;
        })
        .catch((err) => {
            console.error("loadAttachments:", err);
            updateFileUI();
        });
}

let confirmCallback = null;

function openConfirm(message, callback){
    document.getElementById("confirmText").innerText = message;
    document.getElementById("confirmModal").style.display = "flex";
    confirmCallback = callback;
}

document.getElementById("confirmYes").onclick = function(){
    if(confirmCallback) confirmCallback();
    closeConfirm();
};

document.getElementById("confirmNo").onclick = closeConfirm;

function closeConfirm(){
    document.getElementById("confirmModal").style.display = "none";
}


function updateStatusUI(status){

    // update status display
    updateStatusDisplay(status);

    // disable buttons
    updateActionButtons(status);

    // optional: show toast
    showToast("Order Cancelled ");
}

function validateStockForm() {

    const submitBtn = document.getElementById("submitBtn");
    if (!submitBtn) return;

    // default always disabled
    submitBtn.disabled = true;

    if (stockMode === "view") return;

    const requiredFields = [
        "receivedDate",
        "supplierName",
        "supplierDn",
        "supplierInvoice",
        "receivedBy",
        "qcBy"
    ];

    for (let id of requiredFields) {
        const el = document.getElementById(id);
        if (!el || !el.value.trim()) return;
    }

    const rows = document.querySelectorAll("#items-body tr");
    if (rows.length === 0) return;

    for (let row of rows) {

        const received = row.querySelector(".qty-received");
        const accepted = row.querySelector(".qty-accepted");
        const warehouse = row.querySelector(".warehouse");
        const stockDim = row.querySelector(".stock-dim");

        if (
            !received?.value ||
            !accepted?.value ||
            !warehouse?.value ||
            !stockDim?.value
        ) return;
    }

    // ✅ ONLY HERE ENABLE SUBMIT
    submitBtn.disabled = false;
}

function showToast(message, type = "warning") {

    const toast = document.getElementById("toast");
    const msg = document.getElementById("toastMessage");
    const icon = document.querySelector(".alert-icon");

    msg.textContent = message;

    toast.classList.remove("success", "error", "warning", "show");

    if (type === "success") {
        toast.classList.add("success");
        icon.textContent = "✓";
    }

    if (type === "error") {
        toast.classList.add("error");
        icon.textContent = "✕";
    }

    if (type === "warning") {
        toast.classList.add("warning");
        icon.textContent = "!";
    }

    // show
    setTimeout(() => {
        toast.classList.add("show");
    }, 10);

    // hide after 3 sec
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}


function attachCalculation(row) {

    const qtyReceived =
        row.querySelector('.qty-received');

    const qtyAccepted =
        row.querySelector('.qty-accepted');

    const qtyRejected =
        row.querySelector('.qty-rejected');

    const qtyRemaining =
        row.querySelector('.qty-remaining');

    const qtyOrdered =
        row.querySelector('.qty-ordered');

    // IMPORTANT
    const unitPrice =
        row.querySelector('.unit-price');

    const taxPct =
        row.querySelector('.tax-pct');

    const discPct =
        row.querySelector('.disc-pct');

    if (qtyReceived) enforceIntegerInput(qtyReceived);
    if (qtyAccepted) enforceIntegerInput(qtyAccepted);

    function calculate() {

        if (
            !qtyReceived ||
            !qtyAccepted ||
            !qtyOrdered
        ) return;

        const received =
            parseFloat(qtyReceived.value) || 0;

        const accepted =
            parseFloat(qtyAccepted.value) || 0;

        const ordered =
            parseFloat(qtyOrdered.value) || 0;

        const rejected =
            Math.max(0, received - accepted);

        const remaining =
            Math.max(0, ordered - received);

        if (qtyRejected)
            qtyRejected.value = rejected;

        if (qtyRemaining)
            qtyRemaining.value = remaining;

        calculateLineTotal(row);
    }

    // Qty events
    if (qtyReceived)
        qtyReceived.addEventListener('input', calculate);

    if (qtyAccepted)
        qtyAccepted.addEventListener('input', calculate);

    // Price / Tax / Discount events
    if (unitPrice)
        unitPrice.addEventListener('input', calculate);

    if (taxPct)
        taxPct.addEventListener('input', calculate);

    if (discPct)
        discPct.addEventListener('input', calculate);

    // Initial calculation
    calculate();
}

function calculateLineTotal(row) {

    const qty =
        parseFloat(
            row.querySelector(".qty-received").value
        ) || 0;

    const price =
        parseFloat(
            row.querySelector(".unit-price").value
        ) || 0;

    const tax =
        parseFloat(
            row.querySelector(".tax-pct").value
        ) || 0;

    const disc =
        parseFloat(
            row.querySelector(".disc-pct").value
        ) || 0;

    let subtotal = qty * price;

    let taxAmount =
        subtotal * tax / 100;

    let discAmount =
        subtotal * disc / 100;

    let total =
        subtotal + taxAmount - discAmount;

    row.querySelector(".line-total").value =
        total.toFixed(2);

    document.getElementById("grandTotalField").value = calculateGrandTotal().toFixed(2);
}

function enforceIntegerInput(input) {

    input.addEventListener("input", function () {

        let value = this.value;

        // EMPTY check
        if (value === "") return;

        // =========================
        // 1. NEGATIVE VALUE CHECK
        // =========================
        if (parseFloat(value) < 0) {

            showToast("Negative values are not allowed", "error");

            this.value = "";
            return;
        }

        // =========================
        // 2. DECIMAL CHECK
        // =========================
        if (value.includes(".")) {

            showToast("Decimal values are not allowed", "error");

            // convert to integer
            this.value = Math.floor(parseFloat(value)) || 0;
        }
    });

    // =========================
    // BLOCK DOT & MINUS KEY
    // =========================
    input.addEventListener("keydown", function (e) {

        if (e.key === ".") {
            e.preventDefault();
            showToast("Decimal values are not allowed", "error");
        }

        if (e.key === "-") {
            e.preventDefault();
            showToast("Negative values are not allowed", "error");
        }
    });
}

function setupLiveValidation(inputId, errorId) {

    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);

    if (!input || !error) return;

    // EDIT / VIEW MODE skip
    if (stockMode === "edit" || stockMode === "view") {
        error.style.display = "none";
        return;
    }

    // Initially show if empty
    if (input.value.trim() === "") {
        error.style.display = "block";
    }

    // User enters value -> hide
    input.addEventListener("input", () => {

        if (input.value.trim() !== "") {
            error.style.display = "none";
        } else {
            error.style.display = "block";
        }

    });

    // For date/select fields
    input.addEventListener("change", () => {

        if (input.value.trim() !== "") {
            error.style.display = "none";
        } else {
            error.style.display = "block";
        }

    });

    // Focus -> hide immediately
    input.addEventListener("focus", () => {
        error.style.display = "none";
    });

    // Leave field empty -> show again
    input.addEventListener("blur", () => {

        if (input.value.trim() === "") {
            error.style.display = "block";
        }

    });
}
function setupReceivedDateValidation() {

    const dateField =
        document.getElementById("receivedDate");

    if (!dateField) return;

    dateField.addEventListener("change", function () {

        const value = this.value;

        // Empty skip
        if (!value) return;

        const selectedDate =
            new Date(value);

        const today =
            new Date();

        today.setHours(0, 0, 0, 0);

        // Invalid Date
        if (isNaN(selectedDate.getTime())) {

            showToast(
                "Invalid Date is not accepted",
                "error"
            );

            this.value = "";
            return;
        }

        // Future Date
        if (selectedDate > today) {

            showToast(
                "Future Date is not allowed",
                "error"
            );

            this.value = "";
            return;
        }

    });

}