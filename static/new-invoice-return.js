// =====================================
// SHOW TOAST (simple version)
// =====================================
function showToast(message, type = 'info') {
    console.log(`Toast (${type}): ${message}`);
    let className = '';
    if (type === 'success') className = 'success-notification';
    else if (type === 'error' || type === 'warning') className = 'error-notification';
    else return;

    const toast = document.createElement('div');
    toast.className = className;
    toast.textContent = message;

    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ===================================================
// GLOBALS
// ===================================================
let currentInvoiceReturnId = null;
let tempInvoiceReturnId = null;
let currentStatus = null;
let isNewReturn = false;                 // true when creating a new return
let pendingComments = [];
let pendingAttachments = [];
/** Prevents double submit when Save Draft / Submit both fire or user double-clicks */
let _invoiceReturnSaveInFlight = false;

/** Only the clicked action uses :disabled; the sibling stays visually “idle” (not grey) but cannot receive clicks. */
function _applyIrFooterSavingStatus(status) {
    const bar = document.querySelector(".modal-footer-button");
    const saveDraftBtn = document.getElementById("irSaveDraftBtn");
    const submitBtn = document.getElementById("irSubmitBtn");
    const primary = status === "Draft" ? saveDraftBtn : submitBtn;
    const peer = status === "Draft" ? submitBtn : saveDraftBtn;
    if (bar) bar.classList.add("ir-footer-saving");
    if (primary) {
        primary.classList.add("ir-footer-primary-busy");
        primary.disabled = true;
    }
    if (peer) {
        peer.classList.add("ir-footer-peer-blocked");
        peer.setAttribute("aria-disabled", "true");
    }
}

function _clearIrFooterSavingUi() {
    const bar = document.querySelector(".modal-footer-button");
    const saveDraftBtn = document.getElementById("irSaveDraftBtn");
    const submitBtn = document.getElementById("irSubmitBtn");
    if (bar) bar.classList.remove("ir-footer-saving");
    [saveDraftBtn, submitBtn].forEach((b) => {
        if (!b) return;
        b.classList.remove("ir-footer-primary-busy", "ir-footer-peer-blocked");
        b.removeAttribute("aria-disabled");
    });
}

const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('edit_id');
const viewId = urlParams.get('view_id');
const heading = document.getElementById('pageHeading');

if (editId || viewId) {
    currentInvoiceReturnId = editId || viewId;
        heading.textContent = 'Invoice Return';

    tempInvoiceReturnId = null;
    isNewReturn = false;
} else {
        heading.textContent = 'New Invoice Return';

    // Generate temporary ID for new invoice returns
    tempInvoiceReturnId = 'TEMP_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    isNewReturn = true;
}

function getActiveInvoiceReturnId() {
    return currentInvoiceReturnId || tempInvoiceReturnId;
}

// Store original invoice values
let originalGrandTotal = 0;
let globalDiscountPct = 0;

    // Update page heading based on mode and status
// function updatePageHeading() {
    // const heading = document.getElementById('pageHeading');
// heading.contentType="Invoice Return";
   

    // // Append status if available
    // if (currentStatus) {
    //     const statusText = currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);
    //     heading.textContent = `${base} Status: ${statusText}`;
    // } else {
    //     heading.textContent = base;
    // }
// }

// ===================================================
// HELPER: Get status badge HTML
// ===================================================
function getStatusBadge(status) {
    const statusLower = (status || '').toLowerCase();
    let badgeClass = '';
    let displayText = '';
    const pageHeading=document.getElementById("pageHeading");
    switch(statusLower) {
        case 'draft':
            badgeClass = 'status-badge status-draft';
            displayText = 'Status:Draft';
            break;
        case 'submitted':
            badgeClass = 'status-badge status-send';
            displayText = 'Status:Submitted';
            break;
        case 'cancelled':
            badgeClass = 'status-badge status-cancelled';
            displayText = 'Status:Cancelled';
            break;
        default:
            badgeClass = 'status-badge status-draft';
            displayText = status || 'Draft';
    }
    
    return `<span class="${badgeClass}">${displayText}</span>`;
}

// ===================================================
// UPDATE PAGE TITLE BASED ON STATUS
// ===================================================
function updatePageTitle() {
    let title = 'Invoice Return';
    if (currentStatus) {
        const statusText = currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);
        title = `Invoice Return - ${statusText}`;
    } else if (isNewReturn) {
        title = 'Invoice Return - Draft';
    }
    document.title = title;
}

// ===================================================
// UPDATE BUTTON STATES BASED ON STATUS
// ===================================================
function updateButtonsByStatus(status) {
    const statusLower = (status || '').toLowerCase();
    currentStatus = statusLower;
    
    const saveDraftBtn = document.getElementById('irSaveDraftBtn');
    const submitBtn = document.getElementById('irSubmitBtn');
    const cancelInvoiceBtn = document.getElementById('cancelInvoiceBtn');
    const pdfAction = document.getElementById('pdfAction');
    const emailAction = document.getElementById('emailAction');
    const addCommentBtn = document.getElementById('addCommentBtn');
    const uploadCard = document.getElementById('uploadCard');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');
    const deliverInvoiceBtn = document.getElementById('deliverInvoiceBtn');   // 👈 add this

    
    // Get all form fields to enable/disable
    const formFields = document.querySelectorAll('#invoiceForm input:not([type="hidden"]), #invoiceForm select, #invoiceForm textarea');
    const itemDeleteBtns = document.querySelectorAll('.delete-row-btn');
    const returnQtyInputs = document.querySelectorAll('.return-qty-input');
    const serialInputs = document.querySelectorAll('.serial-input');
    const reasonSelects = document.querySelectorAll('.reason-select');
    // updatePageHeading();
    switch(statusLower) {
        case 'draft':
            if (saveDraftBtn) saveDraftBtn.disabled = false;
            if (submitBtn) submitBtn.disabled = true; // Will be enabled by checkSubmitButtonStatus
            if (cancelInvoiceBtn) cancelInvoiceBtn.disabled = true;
            if (pdfAction) {
                pdfAction.style.opacity = '0.5';
                pdfAction.style.pointerEvents = 'none';
                pdfAction.style.cursor = 'not-allowed';
            }
            if (emailAction) {
                emailAction.style.opacity = '0.5';
                emailAction.style.pointerEvents = 'none';
                emailAction.style.cursor = 'not-allowed';
            }
            // if (addCommentBtn) addCommentBtn.disabled = false;
            if (uploadCard) {
                uploadCard.style.opacity = '1';
                uploadCard.style.pointerEvents = 'auto';
            }
            if (uploadBtn) uploadBtn.disabled = false;
            if (fileInput) fileInput.disabled = false;
            
            // Enable all form fields for editing
            formFields.forEach(field => {
                field.disabled = false;
                field.readOnly = false;
            });
            itemDeleteBtns.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            });
            returnQtyInputs.forEach(input => { input.disabled = false; });
            serialInputs.forEach(input => { input.disabled = false; });
            reasonSelects.forEach(select => { select.disabled = false; });
            break;
            
        case 'submitted':
            if (saveDraftBtn) saveDraftBtn.disabled = true;
            if (submitBtn) submitBtn.disabled = true;
            if (cancelInvoiceBtn) cancelInvoiceBtn.disabled = false;
            if (pdfAction) {
                pdfAction.style.opacity = '1';
                pdfAction.style.pointerEvents = 'auto';
                pdfAction.style.cursor = 'pointer';
            }
            if (emailAction) {
                emailAction.style.opacity = '1';
                emailAction.style.pointerEvents = 'auto';
                emailAction.style.cursor = 'pointer';
            }
            if (addCommentBtn) addCommentBtn.disabled = false;
            if (uploadCard) {
                uploadCard.style.opacity = '0.5';
                uploadCard.style.pointerEvents = 'none';
            }
            if (uploadBtn) uploadBtn.disabled = true;
            if (fileInput) fileInput.disabled = true;
            
            // Make form read-only
            formFields.forEach(field => {
                field.disabled = true;
                field.readOnly = true;
            });
            itemDeleteBtns.forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            });
            returnQtyInputs.forEach(input => { input.disabled = true; });
            serialInputs.forEach(input => { input.disabled = true; });
            reasonSelects.forEach(select => { select.disabled = true; });
            break;
            
        case 'cancelled':
            if (saveDraftBtn) saveDraftBtn.disabled = true;
            if (submitBtn) submitBtn.disabled = true;
            if (cancelInvoiceBtn) cancelInvoiceBtn.disabled = true;
            if (pdfAction) {
                pdfAction.style.opacity = '1';
                pdfAction.style.pointerEvents = 'auto';
                pdfAction.style.cursor = 'pointer';
            }
            if (emailAction) {
                emailAction.style.opacity = '1';
                emailAction.style.pointerEvents = 'auto';
                emailAction.style.cursor = 'pointer';
            }
            if (addCommentBtn) addCommentBtn.disabled = false;
            if (uploadCard) {
                uploadCard.style.opacity = '0.5';
                uploadCard.style.pointerEvents = 'none';
            }
            if (uploadBtn) uploadBtn.disabled = true;
            if (fileInput) fileInput.disabled = true;
            
            // Make form read-only
            formFields.forEach(field => {
                field.disabled = true;
                field.readOnly = true;
            });
            itemDeleteBtns.forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            });
            returnQtyInputs.forEach(input => { input.disabled = true; });
            serialInputs.forEach(input => { input.disabled = true; });
            reasonSelects.forEach(select => { select.disabled = true; });
            break;
            
        default:
            // New record (no status)
            if (saveDraftBtn) saveDraftBtn.disabled = false;
            if (submitBtn) submitBtn.disabled = true;
            if (cancelInvoiceBtn) cancelInvoiceBtn.disabled = true;
            if (pdfAction) {
                pdfAction.style.opacity = '0.5';
                pdfAction.style.pointerEvents = 'none';
            }
            if (emailAction) {
                emailAction.style.opacity = '0.5';
                emailAction.style.pointerEvents = 'none';
            }
            formFields.forEach(field => {
                field.disabled = false;
                field.readOnly = false;
            });
    }


        // After the switch, set the deliver button state
    if (deliverInvoiceBtn) {
        deliverInvoiceBtn.disabled = (statusLower !== 'submitted');
    }

    
    // Disable/enable Invoice Reference dropdown for non‑draft statuses
    const saleOrderSelected = document.getElementById('saleOrderSelected');
    const invoiceReferenceID = document.getElementById('invoiceReferenceID');
    if (saleOrderSelected) {
        if (statusLower === 'draft') {
            saleOrderSelected.style.pointerEvents = 'auto';
            saleOrderSelected.style.opacity = '1';
            saleOrderSelected.style.cursor = 'pointer';
            if (invoiceReferenceID) invoiceReferenceID.disabled = false;
        } else {
            saleOrderSelected.style.pointerEvents = 'none';
            saleOrderSelected.style.opacity = '0.6';
            saleOrderSelected.style.cursor = 'not-allowed';
            if (invoiceReferenceID) invoiceReferenceID.disabled = true;
        }
    }
    
    // Update submit button status for draft
    // if (statusLower === 'draft' || !statusLower) {
    //     checkSubmitButtonStatus();
    // }
    
    updatePageTitle();
}

// ===================================================
// GET ACTIVE INVOICE RETURN ID (temp or real)
// ===================================================
function getActiveInvoiceReturnId() {
    return currentInvoiceReturnId || tempInvoiceReturnId;
}


async function updateItemsAndSummary() {
    if (!currentInvoiceReturnId) {
        showToast("No invoice return ID found", 'error');
        return false;
    }
    if (currentStatus !== 'draft') {
        showToast("Only draft returns can be edited", 'warning');
        return false;
    }

    const items = [];
    const itemsTable = document.getElementById("itemsTableBody");
    if (itemsTable) {
        Array.from(itemsTable.rows).forEach(row => {
            const returnQty = parseFloat(row.cells[4].querySelector('.return-qty-input')?.value || 0);
            if (returnQty > 0) {
                const reasonSelect = row.cells[6].querySelector('.reason-select');
                if (!reasonSelect || reasonSelect.value === 'Select Reason') {
                    showToast(`Please select return reason for ${row.cells[1]?.textContent}`, 'warning');
                    hasErrors = true;
                    return;
                }
                items.push({
                    product_id: row.cells[2]?.textContent || "",
                    product_name: row.cells[1]?.textContent || "",
                    quantity: returnQty,
                    invoice_quantity: parseFloat(row.getAttribute('data-invoice-qty') || 0),
                    serial_number: row.cells[5].querySelector('.serial-input')?.value || "",
                    return_reason: reasonSelect?.value || "",
                    uom: row.cells[7]?.textContent || "",
                    unit_price: parseFloat(row.getAttribute('data-unit-price') || 0),
                    disc_pct: 0,
                    total: parseFloat(row.cells[11]?.textContent || 0)
                });
            }
        });
    }

    if (items.length === 0) {
        showToast("Please add at least one item with return quantity", 'warning');
        return false;
    }

    const summary = window.currentSummary || updateOrderSummary();
    const refundAmount = summary.refund_amount || 0;

    try {
        const response = await fetch(`/api/invoice-return/${currentInvoiceReturnId}/update-items-summary`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items, summary: { ...summary, refund_amount: refundAmount } })
        });
        const data = await response.json();
        if (data.success) {
            showToast("Items and summary updated successfully", 'success');
            return true;
        } else {
            showToast("Update failed: " + (data.error || 'Unknown error'), 'error');
            return false;
        }
    } catch (error) {
        console.error("Error updating items/summary:", error);
        showToast("Failed to update items/summary", 'error');
        return false;
    }
}

// ===================================================
// LOAD EXISTING INVOICE RETURN DATA
// ===================================================
async function loadExistingInvoiceReturn(invoiceReturnId, isEditMode, isViewMode) {
    try {
        showToast("🔄 Loading invoice return data...", 'info');
        
        const response = await fetch(`/api/invoice-return/${invoiceReturnId}`);
        const data = await response.json();
        
        if (data.success) {
            const invoiceReturn = data.invoice_return;
            const items = data.items;
            const summary = data.summary;
            
            // Set current status
            currentStatus = (invoiceReturn.status || 'Draft').toLowerCase();
            
            // Update status badge
            const statusBadgeContainer = document.getElementById('invoiceStatusBadge');
            if (statusBadgeContainer) {
                statusBadgeContainer.innerHTML = getStatusBadge(invoiceReturn.status);
            }
            
            // Set invoice reference
            const saleOrderSelected = document.getElementById('saleOrderSelected');
            const invoiceReferenceID = document.getElementById('invoiceReferenceID');
            if (saleOrderSelected && invoiceReferenceID) {
                saleOrderSelected.textContent = invoiceReturn.invoice_id;
                invoiceReferenceID.value = invoiceReturn.invoice_id;
            }
            
            // Fill customer fields
            document.getElementById("customerName").value = invoiceReturn.customer_name || "";
            document.getElementById("customerId").value = invoiceReturn.customer_id || "";
            document.getElementById("email").value = invoiceReturn.email || "";
            document.getElementById("phone").value = invoiceReturn.phone || "";
            document.getElementById("contactPerson").value = invoiceReturn.contact_person || "";
            document.getElementById("customerRefNo").value = invoiceReturn.customer_ref_no || "";
            document.getElementById("invoicereturnDate").value = invoiceReturn.return_date || "";
            
            // Store original values for summary
            originalGrandTotal = summary.original_total || 0;
            globalDiscountPct = summary.discount_pct || 0;
            
            // Build items table
            let tbody = document.getElementById("itemsTableBody");
            tbody.innerHTML = "";
            if (items && items.length) {
    // Log the first item to see its properties (remove after debugging)
    console.log('First item from existing return:', items[0]);
    console.log('Keys of first item:', Object.keys(items[0]));

    items.forEach((item, index) => {
        // Try common field names for the original invoice quantity
        const maxQty = item.quantity || item.invoice_quantity || item.original_quantity || item.original_qty || 0;
        console.log(`Item ${index}: maxQty = ${maxQty}`);   // remove after debugging

        const unitPrice = item.unit_price || 0;
        const returnQty = item.return_quantity || 0;
                    // const returnQty = item.return_quantity || 0;
                    const serialNumber = item.serial_number || '';
                    const returnReason = item.return_reason || 'Select Reason';
                    
                    const row = tbody.insertRow();
                    row.setAttribute('data-product-id', item.product_id || '');
                    row.setAttribute('data-unit-price', unitPrice);
                    row.setAttribute('data-disc-pct', 0);
                    row.setAttribute('data-invoice-qty', maxQty);

                    // COLUMN 0: S.No
                    const cellSNo = row.insertCell(0);
                    cellSNo.textContent = index + 1;
                    cellSNo.style.textAlign = "center";
                    
                    // COLUMN 1: Product Name
                    const cellProductName = row.insertCell(1);
                    cellProductName.textContent = item.product_name || '';
                    cellProductName.className = 'product-name';
                    
                    // COLUMN 2: Product ID
                    const cellProductId = row.insertCell(2);
                    cellProductId.textContent = item.product_id || '';
                    cellProductId.className = 'product-id';
                    cellProductId.style.textAlign = "center";
                    
                    // COLUMN 3: Invoice Qty
                    const cellInvoiceQty = row.insertCell(3);
                    cellInvoiceQty.textContent = maxQty;
                    cellInvoiceQty.className = 'invoice-qty';
                    cellInvoiceQty.style.textAlign = "center";
                    
                    // COLUMN 4: Return Qty
                    const cellReturnQty = row.insertCell(4);
                    const returnQtyInput = document.createElement('input');
                    returnQtyInput.type = 'number';
                    returnQtyInput.step = 'any';
                    returnQtyInput.min = '0';
                    returnQtyInput.max = maxQty;
                    returnQtyInput.value = returnQty;
                    returnQtyInput.className = 'return-qty-input';
                    // returnQtyInput.style.width = '80px';
                    // returnQtyInput.style.textAlign = 'center';
                    // returnQtyInput.style.border-radius = '4px';
                                        // returnQtyInput.style.background-color="#523b39"

                    returnQtyInput.disabled = isViewMode;
                    returnQtyInput.addEventListener('input', function() {
                        validateReturnQty(this, maxQty);
                        updateItemTotal(row);
                        updateOrderSummary();
                        checkSubmitButtonStatus();
                    });
                    cellReturnQty.appendChild(returnQtyInput);
                    cellReturnQty.style.textAlign = "center";
                    
                    // COLUMN 5: Serial Number (Optional)
                    const cellSerialNo = row.insertCell(5);
                    const serialInput = document.createElement('input');
                    serialInput.type = 'text';
                    serialInput.placeholder = 'Enter serial number (Optional)';
                    serialInput.className = 'serial-input';
                    serialInput.style.width = '120px';
                    serialInput.style.padding = '5px';
                    serialInput.value = serialNumber;
                    serialInput.disabled = isViewMode;
                    cellSerialNo.appendChild(serialInput);
                    cellSerialNo.style.textAlign = "center";
                    
                    // COLUMN 6: Return Reason
                    const cellReturnReason = row.insertCell(6);
                    const reasonSelect = document.createElement('select');
                    reasonSelect.className = 'reason-select';
                    reasonSelect.style.width = '130px';
                    reasonSelect.style.padding = '5px';
                    reasonSelect.disabled = isViewMode;
                    const reasons = ['Select Reason', 'Damaged', 'Wrong Product', 'Quality Issue', 'Expired', 'Customer Request', 'Other'];
                    reasons.forEach(reason => {
                        const option = document.createElement('option');
                        option.value = reason;
                        option.textContent = reason;
                        if (reason === 'Select Reason') {
                            option.disabled = true;
                        }
                        reasonSelect.appendChild(option);
                    });
                    reasonSelect.value = returnReason;
                    reasonSelect.addEventListener('change', function() {
                        checkSubmitButtonStatus();
                    });
                    cellReturnReason.appendChild(reasonSelect);
                    cellReturnReason.style.textAlign = "center";
                    
                    // COLUMN 7: UOM
                    const cellUom = row.insertCell(7);
                    cellUom.textContent = item.uom || '';
                    cellUom.className = 'uom';
                    cellUom.style.textAlign = "center";
                    
                    // COLUMN 8: Unit Price
                    const cellUnitPrice = row.insertCell(8);
                    cellUnitPrice.textContent = unitPrice.toFixed(2);
                    cellUnitPrice.className = 'unit-price';
                    cellUnitPrice.style.textAlign = "right";
                    
                    // COLUMN 9: Tax (%) - Display as 0
                    const cellTax = row.insertCell(9);
                    cellTax.textContent = '0.00';
                    cellTax.className = 'tax-pct';
                    cellTax.style.textAlign = "center";
                    
                    // COLUMN 10: Discount (%) - Display as 0
                    const cellDisc = row.insertCell(10);
                    cellDisc.textContent = '0.00';
                    cellDisc.className = 'disc-pct';
                    cellDisc.style.textAlign = "center";
                    
                    // COLUMN 11: Total
                    const cellTotal = row.insertCell(11);
                    cellTotal.textContent = (returnQty * unitPrice).toFixed(2);
                    cellTotal.className = 'row-total';
                    cellTotal.style.textAlign = "right";
                    cellTotal.style.fontWeight = "bold";
                    
                    // COLUMN 12: Action
                    const cellAction = row.insertCell(12);
                    const deleteBtn = document.createElement('button');
                    deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
                    // deleteBtn.className = 'delete-row-btn';
                    deleteBtn.title = 'Remove this item from return';
                    // deleteBtn.style.color = '#dc3545';
                    deleteBtn.style.border = 'none';
                    deleteBtn.style.borderRadius = '5px';
                    deleteBtn.style.padding = '5px 10px';
                    deleteBtn.style.cursor = 'pointer';
                    if (isViewMode) {
                        deleteBtn.disabled = true;
                        deleteBtn.style.opacity = '0.5';
                        deleteBtn.style.cursor = 'not-allowed';
                    }
                    deleteBtn.addEventListener('click', function() {
                        if (confirm('Remove this item from the return?')) {
                            row.remove();
                            updateOrderSummary();
                            renumberRows();
                            checkSubmitButtonStatus();
                        }
                    });
                    cellAction.appendChild(deleteBtn);
                    cellAction.style.textAlign = "center";
                });
                updateOrderSummary();
            }
            
            // Load comments
            if (data.comments && data.comments.length) {
                const historyContainer = document.getElementById('history');
                if (historyContainer) {
                    historyContainer.innerHTML = '';
                    data.comments.forEach(comment => {
                        const div = document.createElement("div");
                        div.classList.add("history-item");
                        div.innerHTML = `
                            <span class="user">${escapeHtml(comment.author || 'System')}</span>
                            <span class="time">– ${escapeHtml(comment.created_at || '')}</span>
                            <p>${escapeHtml(comment.text || '')}</p>
                        `;
                        historyContainer.appendChild(div);
                    });
                }
            }
            
            // Load attachments
            if (data.attachments && data.attachments.length) {
                window.currentReturnAttachments = data.attachments;
                renderAttachments(data.attachments);
                updateAttachmentBadge(data.attachments.length);
            }
            
            // Update button states based on status
            updateButtonsByStatus(currentStatus);
            
            showToast(`Loaded invoice return successfully`, 'success');
        } else {
            showToast('Failed to load invoice return data', 'error');
        }
    } catch (error) {
        console.error('Error loading invoice return:', error);
        showToast('Failed to load invoice return data', 'error');
    }
}

// ===================================================
// TABS INITIALIZATION
// ===================================================
function initializeTabs() {
    console.log("🔘 Initializing tabs...");

    const tabs = document.querySelectorAll(".tab");
    const tabContents = document.querySelectorAll(".tab-content");

    if (tabs.length === 0) {
        console.error("❌ No tabs found!");
        return;
    }

    tabContents.forEach(content => {
        content.style.display = "none";
    });

    const defaultTab = document.querySelector('.tab[data-tab="comments"]');
    if (defaultTab) {
        defaultTab.classList.add('active');
        const commentsTab = document.getElementById('comments');
        if (commentsTab) commentsTab.style.display = 'block';
        console.log(" Showing comments tab by default");
    } else {
        if (tabs[0]) {
            tabs[0].classList.add('active');
            const firstContent = document.getElementById(tabs[0].getAttribute('data-tab'));
            if (firstContent) firstContent.style.display = 'block';
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener("click", function() {
            console.log(`📌 Tab clicked: ${this.getAttribute('data-tab')}`);

            tabs.forEach(t => t.classList.remove("active"));
            this.classList.add("active");

            tabContents.forEach(content => {
                content.style.display = "none";
            });

            const selectedTab = this.getAttribute("data-tab");
            const tabElement = document.getElementById(selectedTab);

            if (tabElement) {
                tabElement.style.display = "block";
                console.log(`✅ Showing ${selectedTab} tab`);

                if (selectedTab === 'attachments') {
                    const activeId = getActiveInvoiceReturnId();
                    if (activeId) {
                        loadAttachmentsForReturn(activeId);
                    }
                }
                if (selectedTab === 'history') {
                    const activeId = getActiveInvoiceReturnId();
                    if (activeId) {
                        loadCommentsForReturn(activeId, 1);
                    }
                }
                if (selectedTab === 'comments') {
                    const activeId = getActiveInvoiceReturnId();
                    if (activeId) {
                        loadCommentsForReturn(activeId, 1);
                    }
                }
            } else {
                console.error(`❌ Tab content not found: ${selectedTab}`);
            }
        });
    });

    console.log("✅ Tabs initialized successfully");
}

// ===================================================
// COMMENTS FUNCTIONALITY
// ===================================================
let currentCommentPage = 1;
const COMMENTS_PER_PAGE = 10;
let totalComments = 0;
let hasMoreComments = false;

function initializeComments() {
    const addBtn = document.getElementById("addCommentBtn");
    const commentInput = document.getElementById("commentText");
    const historyContainer = document.getElementById("history");

    if (!addBtn || !commentInput || !historyContainer) return;

    function updateAddButtonState() {
        addBtn.disabled = commentInput.value.trim() === "";
    }
    updateAddButtonState();
    commentInput.addEventListener('input', updateAddButtonState);

    addBtn.addEventListener("click", function(e) {
        e.preventDefault();
        const commentText = commentInput.value.trim();
        if (commentText === "") {
            showToast("Please enter a comment", 'warning');
            return;
        }

        const activeId = getActiveInvoiceReturnId();
        if (!activeId) {
            showToast("Unable to save comment. Please refresh the page.", 'error');
            return;
        }

        const scrollPos = historyContainer.scrollTop;
        addBtn.disabled = true;
        addBtn.textContent = "Adding...";

        fetch(`/api/invoice-return/${activeId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                comment_text: commentText,
                is_temp: !currentInvoiceReturnId
            })
        })
            .then(res => res.json())
            .then(data => {
                console.log("Comment saved:", data);
                commentInput.value = "";
                currentCommentPage = 1;
                return loadCommentsForReturn(activeId, 1);
            })
            .then(() => {
                document.querySelector('[data-tab="history"]')?.click();
                setTimeout(() => historyContainer.scrollTop = scrollPos, 100);
                showToast('Comment added successfully', 'success');
            })
            .catch(error => {
                console.error("Error saving comment:", error);
                showToast("Error saving comment", 'error');
            })
            .finally(() => {
                addBtn.textContent = "Add New";
                updateAddButtonState();
            });
    });
}

function loadCommentsForReturn(invoiceReturnId, page = 1) {
    if (!invoiceReturnId) {
        console.error("❌ No invoice return ID provided for loading comments");
        return Promise.reject('Missing invoice return ID');
    }

    console.log(`💬 Fetching comments for: ${invoiceReturnId}, page ${page}`);

    const historyContainer = document.getElementById('history');
    if (!historyContainer) {
        console.error("❌ historyContainer element not found");
        return Promise.reject('History container not found');
    }

    if (page === 1) {
        historyContainer.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading comments...</div>';
    }

    return fetch(`/api/invoice-return/${invoiceReturnId}/comments?page=${page}&per_page=${COMMENTS_PER_PAGE}`)
        .then(res => res.json())
        .then(data => {
            if (page === 1) {
                historyContainer.innerHTML = '';
            }

            if (!data.comments || data.comments.length === 0) {
                if (page === 1) {
                    historyContainer.innerHTML = '<div class="no-history-message">No comments yet</div>';
                }
                totalComments = 0;
                hasMoreComments = false;
                return;
            }

            totalComments = data.total || data.comments.length;
            hasMoreComments = data.has_more || false;
            currentCommentPage = data.page || page;

            data.comments.forEach(item => {
                const div = document.createElement("div");
                div.classList.add("history-item");
                const user = item.author || 'System';
                const time = item.created_at ? new Date(item.created_at).toLocaleString() : '';
                const comment = item.text || '';
                div.innerHTML = `
                    <span class="user">${escapeHtml(user)}</span>
                    <span class="time">– ${escapeHtml(time)}</span>
                    <p>${escapeHtml(comment)}</p>
                `;
                historyContainer.appendChild(div);
            });

            if (hasMoreComments) {
                const oldBtn = document.getElementById('loadMoreCommentsBtn');
                if (oldBtn) oldBtn.remove();

                const loadMoreBtn = document.createElement('button');
                loadMoreBtn.id = 'loadMoreCommentsBtn';
                loadMoreBtn.className = 'btn btn-link';
                loadMoreBtn.innerHTML = 'Load More Comments...';
                loadMoreBtn.onclick = () => {
                    loadMoreBtn.disabled = true;
                    loadMoreBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
                    loadCommentsForReturn(invoiceReturnId, currentCommentPage + 1).finally(() => { });
                };
                historyContainer.appendChild(loadMoreBtn);
            } else {
                const oldBtn = document.getElementById('loadMoreCommentsBtn');
                if (oldBtn) oldBtn.remove();
            }

            console.log(`✅ Loaded ${data.comments.length} comments (page ${page})`);
        })
        .catch(error => {
            console.error("❌ Error loading comments:", error);
            if (page === 1) {
                historyContainer.innerHTML = '<div class="no-history-message">Error loading comments</div>';
            }
        });
}












// ===================================================
// ATTACHMENTS FUNCTIONALITY (Direct DB save – no local pending)
// ===================================================
const MAX_ATTACHMENTS = 10;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function initializeAttachments() {
    console.log("%c📎 ATTACHMENTS: Initializing...", "color: blue; font-weight: bold");

    const fileInput = document.getElementById('fileInput');
    const uploadCard = document.getElementById('uploadCard');
    const uploadBtn = document.getElementById('uploadBtn');
    const filesList = document.getElementById('filesList');

    if (!fileInput || !uploadCard || !uploadBtn || !filesList) {
        console.error("%c❌ ATTACHMENTS: Missing required elements!", "color: red; font-weight: bold");
        return;
    }

    console.log("%c✅ ATTACHMENTS: All elements found", "color: green; font-weight: bold");

    window.attachments = [];
    
    // Load attachments if a real return ID exists (not a temp ID)
    loadAttachmentsIfRealIdExists();

    function loadAttachmentsIfRealIdExists() {
        const returnIdElem = document.getElementById('invoiceReturnId');
        const returnId = returnIdElem ? returnIdElem.value : null;
        if (returnId && !returnId.startsWith('TEMP_')) {
            console.log(`📎 Loading attachments for Return ID: ${returnId}`);
            loadAttachmentsForReturn(returnId);
        } else {
            // Show a placeholder in attachments tab
            const filesList = document.getElementById('filesList');
            if (filesList) {
                filesList.innerHTML = '<div class="no-files"><i class="fa-regular fa-folder-open"></i><p>Save the invoice return first to attach files.</p></div>';
            }
        }
    }

    // Reload attachments when the return ID changes (after save)
    const returnIdInput = document.getElementById('invoiceReturnId');
    if (returnIdInput) {
        returnIdInput.addEventListener('change', loadAttachmentsIfRealIdExists);
    }

    function canUpload() {
        const returnIdElem = document.getElementById('invoiceReturnId');
        const returnId = returnIdElem ? returnIdElem.value : null;
        return returnId && !returnId.startsWith('TEMP_');
    }

    function isMaxFilesReached() {
        const currentCount = window.currentReturnAttachments ? window.currentReturnAttachments.length : 0;
        return currentCount >= MAX_ATTACHMENTS;
    }

    uploadCard.addEventListener('click', (e) => {
        e.preventDefault();
        if (!canUpload()) {
            showToast("Please save the invoice return first before uploading attachments.", 'warning');
            return;
        }
        if (isMaxFilesReached()) {
            showToast(`Maximum ${MAX_ATTACHMENTS} files allowed`, 'warning');
            return;
        }
        fileInput.click();
    });

    uploadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!canUpload()) {
            showToast("Please save the invoice return first before uploading attachments.", 'warning');
            return;
        }
        if (isMaxFilesReached()) {
            showToast(`Maximum ${MAX_ATTACHMENTS} files allowed`, 'warning');
            return;
        }
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (!canUpload()) {
            showToast("Please save the invoice return first before uploading attachments.", 'warning');
            fileInput.value = '';
            return;
        }
        const currentCount = window.currentReturnAttachments ? window.currentReturnAttachments.length : 0;
        if (currentCount + files.length > MAX_ATTACHMENTS) {
            showToast(`Cannot upload ${files.length} file(s). Maximum ${MAX_ATTACHMENTS} files allowed.`, 'warning');
            fileInput.value = '';
            return;
        }
        if (files.length > 0) uploadFiles(files);
        fileInput.value = '';
    });

    uploadCard.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadCard.style.borderColor = '#007bff';
        uploadCard.style.background = '#f0f7ff';
    });
    uploadCard.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadCard.style.borderColor = '#ddd';
        uploadCard.style.background = '#f8f9fa';
    });
    uploadCard.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadCard.style.borderColor = '#ddd';
        uploadCard.style.background = '#f8f9fa';
        if (!canUpload()) {
            showToast("Please save the invoice return first before uploading attachments.", 'warning');
            return;
        }
        const files = Array.from(e.dataTransfer.files);
        const currentCount = window.currentReturnAttachments ? window.currentReturnAttachments.length : 0;
        if (currentCount + files.length > MAX_ATTACHMENTS) {
            showToast(`Cannot upload ${files.length} file(s). Maximum ${MAX_ATTACHMENTS} files allowed.`, 'warning');
            return;
        }
        if (files.length > 0) uploadFiles(files);
    });

    async function uploadFiles(fileList) {
        for (const file of fileList) {
            if (file.size > MAX_FILE_SIZE_BYTES) {
                showToast(`File ${file.name} exceeds ${MAX_FILE_SIZE_MB} MB limit`, 'error');
                continue;
            }
            await uploadFile(file);
        }
        const returnIdElem = document.getElementById('invoiceReturnId');
        const returnId = returnIdElem ? returnIdElem.value : null;
        if (returnId && !returnId.startsWith('TEMP_')) {
            loadAttachmentsForReturn(returnId);
        }
    }

    async function uploadFile(file) {
        if (!validateFile(file)) return;
        const returnIdElem = document.getElementById('invoiceReturnId');
        const returnId = returnIdElem ? returnIdElem.value : null;
        if (!returnId || returnId.startsWith('TEMP_')) {
            showToast("Invoice Return ID not found. Please save the return first.", 'warning');
            return;
        }
        showUploading(file.name);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await fetch(`/api/invoice-return/${returnId}/attachments`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                console.log(`✅ Uploaded: ${file.name}`);
                showToast(`${file.name} uploaded successfully!`, 'success');
            } else {
                showToast(`Upload failed: ${data.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error("❌ Upload error:", error);
            showToast('Upload failed. Please try again.', 'error');
        } finally {
            removeUploading();
        }
    }

    function validateFile(file) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
            showToast(`${file.name} exceeds ${MAX_FILE_SIZE_MB}MB limit`, 'error');
            return false;
        }
        const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];
        const ext = file.name.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            showToast(`${file.name} type not allowed. Allowed: PDF, DOC, XLS, JPG, PNG`, 'error');
            return false;
        }
        return true;
    }

    function showUploading(filename) {
        removeUploading();
        const uploading = document.createElement('div');
        uploading.className = 'file-item uploading';
        uploading.innerHTML = `
            <div class="file-info">
                <div class="file-icon"><i class="fa-solid fa-spinner fa-spin"></i></div>
                <div class="file-details">
                    <div class="file-name">${escapeHtml(filename)}</div>
                    <div class="upload-progress">Uploading...</div>
                </div>
            </div>
        `;
        const filesList = document.getElementById('filesList');
        if (filesList) filesList.insertBefore(uploading, filesList.firstChild);
    }

    function removeUploading() {
        const uploading = document.querySelector('.file-item.uploading');
        if (uploading) uploading.remove();
    }
}

function loadAttachmentsForReturn(returnId) {
    if (!returnId || returnId.startsWith('TEMP_')) {
        console.error("❌ Invalid invoice return ID provided for loading attachments");
        return;
    }
    console.log(`📎 Fetching attachments for: ${returnId}`);
    const filesList = document.getElementById('filesList');
    if (filesList) {
        filesList.innerHTML = '<div class="loading-files"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading attachments...</p></div>';
    }
    fetch(`/api/invoice-return/${returnId}/attachments`)
        .then(response => response.json())
        .then(data => {
            console.log("📎 Attachments response:", data);
            if (data.success) {
                const files = data.attachments || [];
                console.log(`✅ Loaded ${files.length} attachments`);
                window.currentReturnAttachments = files;
                renderAttachments(files);
                updateAttachmentBadge(files.length);
            } else {
                console.warn("⚠️ Failed to load attachments:", data.error);
                renderAttachments([]);
            }
        })
        .catch(error => {
            console.error("❌ Error loading attachments:", error);
            renderAttachments([]);
        });
}

function renderAttachments(files) {
    console.log("📎 Rendering attachments:", files);
    const filesList = document.getElementById('filesList');
    const fileCount = document.getElementById('fileCount');
    const uploadCard = document.getElementById('uploadCard');
    const uploadBtn = document.getElementById('uploadBtn');

    if (!filesList) {
        console.error("❌ filesList element not found!");
        return;
    }
    window.currentReturnAttachments = files;
    const currentCount = files.length;
    const isFull = currentCount >= MAX_ATTACHMENTS;

    if (fileCount) fileCount.textContent = `${currentCount} / ${MAX_ATTACHMENTS} files`;
    if (uploadCard) {
        uploadCard.style.opacity = isFull ? '0.5' : '1';
        uploadCard.style.pointerEvents = isFull ? 'none' : 'auto';
        uploadCard.setAttribute('title', isFull ? 'Maximum files reached' : 'Click or drag to upload');
    }
    if (uploadBtn) {
        uploadBtn.disabled = isFull;
        uploadBtn.style.opacity = isFull ? '0.5' : '1';
        uploadBtn.setAttribute('title', isFull ? 'Maximum files reached' : 'Upload file');
    }

    if (!files || files.length === 0) {
        filesList.innerHTML = '<div class="no-files"><i class="fa-regular fa-folder-open"></i><p>No files attached yet</p></div>';
        updateAttachmentBadge(0);
        return;
    }

    let html = '';
    files.forEach(file => {
        const ext = file.filename ? file.filename.split('.').pop().toLowerCase() : '';
        const icon = getFileIcon(ext);
        const iconClass = getFileIconClass(ext);
        const size = formatFileSize(file.size || 0);
        const uploadDate = file.uploaded_at ? new Date(file.uploaded_at).toLocaleString() : 'Unknown date';
        html += `
            <div class="file-item" data-id="${file.id}">
                <div class="file-info">
                    <div class="file-icon ${iconClass}"><i class="fa-solid ${icon}"></i></div>
                    <div class="file-details">
                        <div class="file-name">${escapeHtml(file.filename || 'Unknown file')}</div>
                        <div class="file-meta">
                            <span><i class="fa-regular fa-file"></i> ${size}</span>
                            <span><i class="fa-regular fa-calendar"></i> ${uploadDate}</span>
                        </div>
                    </div>
                </div>
                 <div class="file-actions">
            <button type="button" class="btn-action btn-view" onclick="viewAttachment('${file.id}')" title="View"><i class="fa-regular fa-eye"></i></button>
            <button type="button" class="btn-action btn-download" onclick="downloadAttachment('${file.id}')" title="Download"><i class="fa-solid fa-cloud-arrow-down"></i></button>
            <button type="button" class="btn-action btn-delete" onclick="deleteAttachment('${file.id}')" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
        </div>
            </div>
        `;
    });
    filesList.innerHTML = html;
    updateAttachmentBadge(files.length);
    console.log(`✅ Rendered ${files.length} attachments`);
}

function updateAttachmentBadge(count) {
    const tab = document.querySelector('.tab[data-tab="attachments"]');
    if (!tab) return;
    const existingBadge = tab.querySelector('.attachment-badge');
    if (existingBadge) existingBadge.remove();
    if (count > 0) {
        const badge = document.createElement('span');
        badge.className = 'attachment-badge';
        badge.textContent = count;
        tab.appendChild(badge);
    }
}

function getFileIcon(ext) {
    const icons = {
        'pdf': 'fa-file-pdf', 'doc': 'fa-file-word', 'docx': 'fa-file-word',
        'xls': 'fa-file-excel', 'xlsx': 'fa-file-excel',
        'jpg': 'fa-file-image', 'jpeg': 'fa-file-image', 'png': 'fa-file-image'
    };
    return icons[ext] || 'fa-file';
}

function getFileIconClass(ext) {
    const classes = {
        'pdf': 'pdf', 'doc': 'doc', 'docx': 'doc',
        'xls': 'xls', 'xlsx': 'xls',
        'jpg': 'jpg', 'jpeg': 'jpg', 'png': 'png'
    };
    return classes[ext] || 'default';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// View attachment (opens inline)
window.viewAttachment = function(attachmentId) {
    const invoiceReturnId = document.getElementById('invoiceReturnId').value;
    if (!invoiceReturnId) {
        showToast('Invoice Return ID not found', 'error');
        return;
    }
    window.open(`/api/invoice-return/${invoiceReturnId}/attachments/${attachmentId}/view`, '_blank');
};

window.downloadAttachment = function(id) {
    const returnIdElem = document.getElementById('invoiceReturnId');
    const returnId = returnIdElem ? returnIdElem.value : null;
    if (returnId && !returnId.startsWith('TEMP_')) {
        window.location.href = `/api/invoice-return/${returnId}/attachments/${id}/download`;
    } else {
        showToast("Return ID not found", 'error');
    }
};

window.deleteAttachment = async function(id) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    const returnIdElem = document.getElementById('invoiceReturnId');
    const returnId = returnIdElem ? returnIdElem.value : null;
    if (!returnId || returnId.startsWith('TEMP_')) {
        showToast("Return ID not found", 'error');
        return;
    }
    try {
        const response = await fetch(`/api/invoice-return/${returnId}/attachments/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            // Remove the file element from DOM
            const fileItem = document.querySelector(`.file-item[data-id="${id}"]`);
            if (fileItem) fileItem.remove();
            // Reload attachments to update the count
            loadAttachmentsForReturn(returnId);
            showToast('✅ File deleted successfully', 'success');
        } else {
            showToast('Delete failed: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error deleting attachment:', error);
        showToast('Delete failed. Please try again.', 'error');
    }
};








// ===================================================
// INVOICE REFERENCE DROPDOWN
// ===================================================
function toggleSaleOrderDropdown() {
    const invoiceRef = document.getElementById('invoiceReferenceID');
    if (invoiceRef && invoiceRef.disabled) {
        showToast('Invoice Reference cannot be changed for this status', 'warning');
        return;
    }
    const dropdown = document.getElementById('saleOrderDropdown');
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
        document.getElementById('InvoiceRefIDSearch').focus();
    }
}

function filterSaleOrders() {
    const searchTerm = document.getElementById('InvoiceRefIDSearch').value.toLowerCase();
    const items = document.querySelectorAll('#saleOrderList .dropdown-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

function selectSaleOrder(element) {
    const invoiceRef = document.getElementById('invoiceReferenceID');
    if (invoiceRef && invoiceRef.disabled) {
        showToast('Invoice Reference cannot be changed for this status', 'warning');
        return;
    }
    const selectedValue = element.getAttribute('data-value');
    const selectedText = element.textContent.trim();

    const hiddenInput = document.getElementById('invoiceReferenceID');
    hiddenInput.value = selectedValue;
    document.getElementById('saleOrderSelected').textContent = selectedText;
    document.getElementById('saleOrderDropdown').style.display = 'none';

    hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    loadInvoiceDetails(selectedValue);
}

// ===================================================
// CHECK IF SUBMIT BUTTON SHOULD BE ENABLED (Serial NOT mandatory)
// ===================================================
function checkSubmitButtonStatus() {
    const submitBtn = document.getElementById('irSubmitBtn');
    if (!submitBtn) return;
    
    const rows = document.querySelectorAll('#itemsTableBody tr');
    let hasValidItem = false;
    
    rows.forEach(row => {
        if (row.cells.length < 12) return;
        
        const returnQty = parseFloat(row.cells[4].querySelector('.return-qty-input')?.value || 0);
        const reasonSelect = row.cells[6].querySelector('.reason-select');
        
        const hasReturnQty = returnQty > 0;
        const hasReason = reasonSelect && reasonSelect.value !== 'Select Reason';
        
        if (hasReturnQty && hasReason) {
            hasValidItem = true;
        }
    });
    
    submitBtn.disabled = !hasValidItem;
    return hasValidItem;
}

// ===================================================
// LOAD INVOICE DETAILS
// ===================================================
function loadInvoiceDetails(invoiceId) {
    if (!invoiceId) {
        console.warn("Invoice ID empty, cannot fetch details");
        return;
    }

    showToast("🔄 Loading invoice details...", 'info');

    fetch(`/get-invoice-details/${invoiceId}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById("customerName").value = data.customer_name || "";
            document.getElementById("customerId").value = data.customer_id || "";
            document.getElementById("email").value = data.email || "";
            document.getElementById("phone").value = data.phone || "";
            document.getElementById("contactPerson").value = data.contact_person || "";
            document.getElementById("customerRefNo").value = data.customer_ref_no || "";

            originalGrandTotal = data.summary?.original_total || 0;
            globalDiscountPct = data.summary?.global_discount_pct || 0;

            let tbody = document.getElementById("itemsTableBody");
            tbody.innerHTML = "";
            
            if (data.items && data.items.length) {
                showToast(` Loaded ${data.items.length} items from invoice ${invoiceId}`, 'success');
                
                const isDraft = (currentStatus === 'draft');
                
                data.items.forEach((item, index) => {
                    const maxQty = item.quantity || 0;
                    const unitPrice = item.unit_price || 0;
                    
                    const row = tbody.insertRow();
                    row.setAttribute('data-product-id', item.product_id || '');
                    row.setAttribute('data-unit-price', unitPrice);
                    row.setAttribute('data-disc-pct', 0);
                    row.setAttribute('data-invoice-qty', maxQty);   // <-- ADD THIS LINE

                    
                    // COLUMN 0: S.No
                    const cellSNo = row.insertCell(0);
                    cellSNo.textContent = index + 1;
                    cellSNo.style.textAlign = "center";
                    
                    // COLUMN 1: Product Name
                    const cellProductName = row.insertCell(1);
                    cellProductName.textContent = item.product_name || '';
                    cellProductName.className = 'product-name';
                    
                    // COLUMN 2: Product ID
                    const cellProductId = row.insertCell(2);
                    cellProductId.textContent = item.product_id || '';
                    cellProductId.className = 'product-id';
                    cellProductId.style.textAlign = "center";
                    
                    // COLUMN 3: Invoice Qty
                    const cellInvoiceQty = row.insertCell(3);
                    cellInvoiceQty.textContent = maxQty;
                    cellInvoiceQty.className = 'invoice-qty';
                    cellInvoiceQty.style.textAlign = "center";
                    
                    // COLUMN 4: Return Qty
                    const cellReturnQty = row.insertCell(4);
                    const returnQtyInput = document.createElement('input');
                    returnQtyInput.type = 'number';
                    returnQtyInput.step = 'any';
                    returnQtyInput.min = '0';
                    returnQtyInput.max = maxQty;
                    // Auto‑fill if draft, otherwise 0
                    returnQtyInput.value =  '0';
                    returnQtyInput.className = 'return-qty-input';
                    returnQtyInput.style.width = '80px';
                    returnQtyInput.style.textAlign = 'center';
                    returnQtyInput.addEventListener('input', function() {
                        validateReturnQty(this, maxQty);
                        updateItemTotal(row);
                        updateOrderSummary();
                        checkSubmitButtonStatus();
                    });
                    cellReturnQty.appendChild(returnQtyInput);
                    cellReturnQty.style.textAlign = "center";
                    
                    // COLUMN 5: Serial Number (Optional)
                    const cellSerialNo = row.insertCell(5);
                    const serialInput = document.createElement('input');
                    serialInput.type = 'text';
                    serialInput.placeholder = 'Enter serial number (Optional)';
                    serialInput.className = 'serial-input';
                    serialInput.style.width = '120px';
                    serialInput.style.padding = '5px';
                    cellSerialNo.appendChild(serialInput);
                    cellSerialNo.style.textAlign = "center";
                    
                    // COLUMN 6: Return Reason
                    const cellReturnReason = row.insertCell(6);
                    const reasonSelect = document.createElement('select');
                    reasonSelect.className = 'reason-select';
                    reasonSelect.style.width = '130px';
                    reasonSelect.style.padding = '5px';
                    const reasons = ['Select Reason', 'Damaged', 'Wrong Product', 'Quality Issue', 'Expired', 'Customer Request', 'Other'];
                    reasons.forEach(reason => {
                        const option = document.createElement('option');
                        option.value = reason;
                        option.textContent = reason;
                        if (reason === 'Select Reason') {
                            option.disabled = true;
                        }
                        reasonSelect.appendChild(option);
                    });
                    // Set default reason if draft, otherwise keep 'Select Reason'
                    // if (isDraft) {
                        // reasonSelect.value = 'Customer Request';
                    // } else {
                        reasonSelect.value = 'Select Reason';
                    // }
                    reasonSelect.addEventListener('change', function() {
                        checkSubmitButtonStatus();
                    });
                    cellReturnReason.appendChild(reasonSelect);
                    cellReturnReason.style.textAlign = "center";
                    
                    // COLUMN 7: UOM
                    const cellUom = row.insertCell(7);
                    cellUom.textContent = item.uom || '';
                    cellUom.className = 'uom';
                    cellUom.style.textAlign = "center";
                    
                    // COLUMN 8: Unit Price
                    const cellUnitPrice = row.insertCell(8);
                    cellUnitPrice.textContent = unitPrice.toFixed(2);
                    cellUnitPrice.className = 'unit-price';
                    cellUnitPrice.style.textAlign = "right";
                    
                    // COLUMN 9: Tax (%) - Display as 0
                    const cellTax = row.insertCell(9);
                    cellTax.textContent = '0.00';
                    cellTax.className = 'tax-pct';
                    cellTax.style.textAlign = "center";
                    
                    // COLUMN 10: Discount (%) - Display as 0
                    const cellDisc = row.insertCell(10);
                    cellDisc.textContent = '0.00';
                    cellDisc.className = 'disc-pct';
                    cellDisc.style.textAlign = "center";
                    
                    // COLUMN 11: Total
                    const cellTotal = row.insertCell(11);
                    const initialTotal = (isDraft ? maxQty : 0) * unitPrice;
                    cellTotal.textContent = initialTotal.toFixed(2);
                    cellTotal.className = 'row-total';
                    cellTotal.style.textAlign = "right";
                    cellTotal.style.fontWeight = "bold";
                    
                    // COLUMN 12: Action
                    const cellAction = row.insertCell(12);
                    const deleteBtn = document.createElement('button');
                    deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
                    deleteBtn.className = 'delete-row-btn';
                    deleteBtn.title = 'Remove this item from return';
                    deleteBtn.style.color= '#dc3545';
                    // deleteBtn.style.color = 'white';
                    deleteBtn.style.border = 'none';
                    // deleteBtn.style.borderRadius = '5px';
                    // deleteBtn.style.padding = '5px 10px';
                    deleteBtn.style.cursor = 'pointer';
                    deleteBtn.addEventListener('click', function() {
                        if (confirm('Remove this item from the return?')) {
                            row.remove();
                            updateOrderSummary();
                            renumberRows();
                            checkSubmitButtonStatus();
                        }
                    });
                    cellAction.appendChild(deleteBtn);
                    cellAction.style.textAlign = "center";
                });
                updateOrderSummary();
                // checkSubmitButtonStatus();
            } else {
                tbody.innerHTML = '首届<td colspan="13" style="text-align: center;">No items found in this invoice\\';
                showToast("⚠️ No items found in this invoice", 'warning');
            }
        })
        .catch(err => {
            console.error("Error loading invoice details:", err);
            showToast("❌ Failed to load invoice details", 'error');
        });
}
// ===================================================
// VALIDATE RETURN QUANTITY
// ===================================================
function validateReturnQty(input, maxQty) {
    let value = parseFloat(input.value);
    if (isNaN(value)) value = 0;
    if (value < 0) value = 0;
    if (value > maxQty) {
        value = maxQty;
        input.value = value;
        showToast(`⚠️ Return quantity cannot exceed invoice quantity (${maxQty})`, 'warning');
    }
}

// ===================================================
// UPDATE ITEM TOTAL
// ===================================================
function updateItemTotal(row) {
    const returnQtyInput = row.cells[4].querySelector('.return-qty-input');
    const returnQty = parseFloat(returnQtyInput?.value || 0);
    const unitPrice = parseFloat(row.getAttribute('data-unit-price') || 0);
    
    const lineTotal = returnQty * unitPrice;
    const totalCell = row.cells[11];
    totalCell.textContent = lineTotal.toFixed(2);
}

// ===================================================
// UPDATE ORDER SUMMARY
// ===================================================
function updateOrderSummary() {
    const rows = document.querySelectorAll('#itemsTableBody tr');
    let returnSubtotal = 0;
    
    rows.forEach(row => {
        if (row.cells.length < 12) return;
        
        const returnQty = parseFloat(row.cells[4].querySelector('.return-qty-input')?.value || 0);
        const unitPrice = parseFloat(row.getAttribute('data-unit-price') || 0);
        
        returnSubtotal += returnQty * unitPrice;
    });
    
    const globalDiscountAmount = (returnSubtotal * globalDiscountPct) / 100;
    const refundAmount = returnSubtotal - globalDiscountAmount;
    
    const summaryDiv = document.getElementById("tax_total");
    if (summaryDiv) {
        summaryDiv.innerHTML = `
            <div><span>Original Grand Total</span><span>${originalGrandTotal.toFixed(2)}</span></div>
            <div><span>Global Discount (%)</span><span>${globalDiscountPct.toFixed(2)}</span></div>
            <div><span>Return Subtotal</span><span>${returnSubtotal.toFixed(2)}</span></div>
            <div><span>Global Discount Amount</span><span>${globalDiscountAmount.toFixed(2)}</span></div>
            <div><span>Rounding Adjustment</span><span>0.00</span></div>
            <div class="grand-total"><span>Amount to Refund</span><span>${refundAmount.toFixed(2)}</span></div>
        `;
    }
    
    window.currentSummary = {
        original_total: originalGrandTotal,
        discount_pct: globalDiscountPct,
        discount_amount: globalDiscountAmount,
        subtotal: returnSubtotal,
        tax_amount: 0,
        rounding: 0,
        refund_amount: refundAmount
    };
    
    return window.currentSummary;
}

function renumberRows() {
    const rows = document.querySelectorAll('#itemsTableBody tr');
    rows.forEach((row, idx) => {
        if (row.cells.length > 0 && row.cells[0]) {
            row.cells[0].textContent = idx + 1;
        }
    });
}

// ===================================================
// SAVE PENDING DATA
// ===================================================
async function savePendingData() {
    if (!currentInvoiceReturnId) return;
    
    console.log("💾 Saving pending comments and attachments...");
    
    if (pendingComments.length > 0) {
        for (const comment of pendingComments) {
            try {
                await fetch(`/api/invoice-return/${currentInvoiceReturnId}/comments`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ comment_text: comment.text })
                });
                console.log("Saved pending comment:", comment.text);
            } catch (error) {
                console.error("Error saving pending comment:", error);
            }
        }
        pendingComments = [];
    }
    
    if (pendingAttachments.length > 0) {
        for (const attachment of pendingAttachments) {
            try {
                const blob = base64ToBlob(attachment.data);
                const file = new File([blob], attachment.filename, { type: blob.type });
                const formData = new FormData();
                formData.append('file', file);
                await fetch(`/api/invoice-return/${currentInvoiceReturnId}/attachments`, {
                    method: 'POST',
                    body: formData
                });
                console.log("Saved pending attachment:", attachment.filename);
            } catch (error) {
                console.error("Error saving pending attachment:", error);
            }
        }
        pendingAttachments = [];
    }
    
    if (pendingComments.length === 0 && pendingAttachments.length === 0) {
        loadCommentsForReturn(currentInvoiceReturnId, 1);
        loadAttachmentsForReturn(currentInvoiceReturnId);
    }
}

function base64ToBlob(base64) {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
}

// ===================================================
// GENERIC STATUS UPDATE (Common Endpoint)
// ===================================================
async function updateReturnStatus(newStatus) {
    if (!currentInvoiceReturnId) {
        showToast("No invoice return ID found", 'error');
        return;
    }

    if (newStatus === currentStatus) {
        showToast(`Status is already ${newStatus}`, 'info');
        return;
    }

    // Optional: prevent changing a cancelled return
    if (currentStatus === 'cancelled') {
        showToast('Cannot change a cancelled return', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/invoice-return/${currentInvoiceReturnId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await response.json();

        if (data.success) {
            showToast(`Status updated to ${newStatus}`, 'success');
            currentStatus = newStatus.toLowerCase();
            updateButtonsByStatus(currentStatus);
            const statusBadgeContainer = document.getElementById('invoiceStatusBadge');
            if (statusBadgeContainer) {
                statusBadgeContainer.innerHTML = getStatusBadge(newStatus);
            }
        } else {
            showToast('Failed to update status: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Failed to update status', 'error');
    }
}

// ===================================================
// SUBMIT INVOICE RETURN (Updates temp ID to real ID)
// ===================================================
function submitInvoiceReturn(status) {
    if (_invoiceReturnSaveInFlight) {
        return;
    }
    // Lock immediately so a second handler (double event / both buttons) cannot start another save
    _invoiceReturnSaveInFlight = true;
    const releaseSaveLock = () => {
        _invoiceReturnSaveInFlight = false;
    };

    const invoiceId = document.getElementById("invoiceReferenceID").value;
    if (!invoiceId) {
        showToast("Please select an Invoice Reference ID", 'warning');
        releaseSaveLock();
        return;
    }

    const itemsTable = document.getElementById("itemsTableBody");
    const items = [];
    let hasErrors = false;

    if (itemsTable) {
        Array.from(itemsTable.rows).forEach((row) => {
            const returnQty = parseFloat(row.cells[4].querySelector(".return-qty-input")?.value || 0);
            if (returnQty > 0) {
                const reasonSelect = row.cells[6].querySelector(".reason-select");
                const productName = row.cells[1]?.textContent || "";
                const serialInput = row.cells[5].querySelector(".serial-input");
                const invoiceQty = parseFloat(row.getAttribute("data-invoice-qty") || 0);

                if (!reasonSelect || reasonSelect.value === "Select Reason") {
                    showToast(`Please select return reason for ${productName}`, "warning");
                    hasErrors = true;
                    return;
                }

                items.push({
                    product_id: row.cells[2]?.textContent || "",
                    product_name: productName,
                    quantity: returnQty,
                    invoice_quantity: invoiceQty,
                    serial_number: serialInput?.value || "",
                    return_reason: reasonSelect?.value || "",
                    uom: row.cells[7]?.textContent || "",
                    unit_price: parseFloat(row.getAttribute("data-unit-price") || 0),
                    disc_pct: 0,
                    total: parseFloat(row.cells[11]?.textContent || 0),
                });
            }
        });
    }

    if (hasErrors) {
        releaseSaveLock();
        return;
    }

    if (items.length === 0) {
        showToast("Please add at least one item with return quantity", "warning");
        releaseSaveLock();
        return;
    }

    const summary = window.currentSummary || updateOrderSummary();
    const refundAmount = summary.refund_amount || 0;

    const data = {
        invoice_id: invoiceId,
        customer_name: document.getElementById("customerName")?.value || "",
        customer_id: document.getElementById("customerId")?.value || "",
        email: document.getElementById("email")?.value || "",
        phone: document.getElementById("phone")?.value || "",
        contact_person: document.getElementById("contactPerson")?.value || "",
        customer_ref_no: document.getElementById("customerRefNo")?.value || "",
        return_date:
            document.getElementById("invoicereturnDate")?.value ||
            new Date().toISOString().split("T")[0],
        refund_amount: refundAmount,
        status: status,
        items: items,
        temp_id: tempInvoiceReturnId,
        summary: {
            original_total: summary.original_total,
            discount_pct: summary.discount_pct,
            subtotal: summary.subtotal,
            discount_amount: summary.discount_amount,
            tax_amount: 0,
            rounding: summary.rounding,
            refund_amount: refundAmount,
        },
    };

    if (currentInvoiceReturnId) {
        data.invoice_return_id = currentInvoiceReturnId;
    }

    _applyIrFooterSavingStatus(status);

    let releaseLockAfterResponse = true;

    showToast(`💾 Saving ${status}...`, "info");

    fetch("/save-invoice-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
        .then((res) => res.json())
        .then((res) => {
            if (res.success) {
                releaseLockAfterResponse = false;
                currentInvoiceReturnId = res.invoice_return_id;
                tempInvoiceReturnId = null;

                if (status === "Submitted") {
                    currentStatus = "submitted";
                } else if (status === "Draft") {
                    currentStatus = "draft";
                }
                // Do not call updateButtonsByStatus here — it would re-enable the footer before redirect and feels like “both buttons” released.

                const statusBadgeContainer = document.getElementById("invoiceStatusBadge");
                if (statusBadgeContainer) {
                    statusBadgeContainer.innerHTML = getStatusBadge(status);
                }

                const addCommentBtn = document.getElementById("addCommentBtn");
                if (addCommentBtn) {
                    addCommentBtn.disabled = false;
                }

                showToast(` Saved as ${status} - ID: ${res.invoice_return_id}`, "success");
                setTimeout(() => {
                    window.location.href = "/invoice-return-list";
                }, 1500);
            } else {
                showToast("Error: " + (res.message || "Unknown error"), "error");
            }
        })
        .catch((err) => {
            console.error("Error saving invoice return:", err);
            showToast("Failed to save invoice return", "error");
        })
        .finally(() => {
            if (releaseLockAfterResponse) {
                releaseSaveLock();
                _clearIrFooterSavingUi();
                updateMainButtons();
            }
        });
}

// ===================================================
// MAIN BUTTONS
// ===================================================
function updateMainButtons() {
    const invoiceRef = document.getElementById('invoiceReferenceID');
    const hasRef = invoiceRef && invoiceRef.value.trim() !== "";
    const saveDraftBtn = document.getElementById('irSaveDraftBtn');
    const submitBtn = document.getElementById('irSubmitBtn');
    
    if (saveDraftBtn && currentStatus === 'draft') saveDraftBtn.disabled = !hasRef;
    if (currentStatus === 'draft' || !currentStatus) {
        checkSubmitButtonStatus();
    }
}

// ===================================================
// HELPER FUNCTIONS
// ===================================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function loadSaleOrders() {
    const list = document.getElementById('saleOrderList');
    if (!list) return;

    fetch('/api/sales-orders')
        .then(res => res.json())
        .then(data => {
            if (!data.success) return;
            list.innerHTML = '';
            data.orders.forEach(order => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.setAttribute('data-value', order.so_id);
                item.textContent = `${order.so_id} - ${order.customer_name}`;
                item.onclick = function () {
                    selectSaleOrder(this);
                };
                list.appendChild(item);
            });
        })
        .catch(err => {
            console.error("Error loading sales orders:", err);
        });
}

// ===================================================
// CANCEL INVOICE RETURN (now uses common status endpoint)
// ===================================================
function cancelInvoiceReturn() {
    if (!currentInvoiceReturnId) {
        showToast("No invoice return to cancel", 'warning');
        return;
    }
    
    // if (!confirm('Are you sure you want to cancel this invoice return? This action cannot be undone.')) {
        // return;
    // }
    
    updateReturnStatus('cancelled');
    window.location.href="/invoice-return-list"
}

function generatePDF() {
    if (!currentInvoiceReturnId) {
        showToast("Please save the invoice return first before generating PDF", 'warning');
        return;
    }
    window.open(`/invoice-return/${currentInvoiceReturnId}/pdf`, '_blank');
}

function sendEmail() {
    if (!currentInvoiceReturnId) {
        showToast("Please save the invoice return first before sending email", 'warning');
        return;
    }

    // Show the modal
    const modal = document.getElementById('emailModal');
    if (!modal) {
        showToast("Email modal not found. Please refresh the page.", 'error');
        return;
    }
    modal.style.display = 'flex'; // or 'block' depending on your CSS

    // Clear previous input
    const emailInput = document.getElementById('recipientEmail');
    emailInput.value = '';

    // Remove any existing event listeners (to avoid duplicates)
    const sendBtn = document.getElementById('sendEmailBtn');
    const cancelBtn = document.getElementById('cancelEmailBtn');

    // Replace with new click handlers
    const newSendBtn = sendBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    // Send email when user clicks send
    newSendBtn.addEventListener('click', async () => {
        const recipientEmail = emailInput.value.trim();
        if (!recipientEmail) {
            showToast("Please enter a valid email address.", 'warning');
            return;
        }

        // Simple email format validation
        const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
        if (!emailRegex.test(recipientEmail)) {
            showToast("Please enter a valid email address.", 'warning');
            return;
        }

        // Disable button while sending
        newSendBtn.disabled = true;
        newSendBtn.textContent = "Sending...";

        try {
            const response = await fetch(`/api/invoice-return/${currentInvoiceReturnId}/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: recipientEmail })
            });
            const data = await response.json();

            if (data.success) {
                showToast('Email sent successfully', 'success');
                modal.style.display = 'none';
            } else {
                showToast('Failed to send email: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error sending email:', error);
            showToast('Failed to send email', 'error');
        } finally {
            newSendBtn.disabled = false;
            newSendBtn.textContent = "Send Email";
        }
    });

    // Cancel button closes the modal
    newCancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
}

// ===================================================
// MAIN INITIALIZATION
// ===================================================
document.addEventListener('DOMContentLoaded', function() {
    const returnDateField = document.getElementById("invoicereturnDate");
    if (returnDateField && !editId && !viewId) {
        returnDateField.value = new Date().toISOString().split("T")[0];
    }



    initializeTabs();
    initializeComments();
    initializeAttachments();

    if (editId || viewId) {
        // Load existing invoice return for edit or view
        const isEditMode = !!editId;
        const isViewMode = !!viewId;
        currentInvoiceReturnId = editId || viewId;
        tempInvoiceReturnId = null;
        isNewReturn = false;
        loadExistingInvoiceReturn(currentInvoiceReturnId, isEditMode, isViewMode);
    } else {
        // New invoice return
        currentStatus = 'draft';
        updateButtonsByStatus('draft');
        
        const invoiceRef = document.getElementById('invoiceReferenceID');
        if (invoiceRef) {
            invoiceRef.addEventListener('change', function() {
                updateMainButtons();
            });
        }
        
        console.log("🆕 New invoice return - Using temp ID:", tempInvoiceReturnId);
    }


const deliverBtn = document.getElementById('deliverInvoiceBtn');
if (deliverBtn) {
    deliverBtn.addEventListener('click', () => {
        if (!currentInvoiceReturnId) {
            showToast("No invoice return ID found", 'warning');
            return;
        }
        // Replace with your actual target URL
        // Example: open a delivery note page with the return ID
        window.location.href = `/delivery-note-return?return_id=${currentInvoiceReturnId}`;
        // Or open in a new tab: window.open(...);
    });
}

    const cancelBtn = document.getElementById("cancelBtn");
    if (cancelBtn) {
        cancelBtn.addEventListener("click", function() {
            window.location.href = "/invoice-return-list";
        });
    }
    
    const cancelInvoiceReturnBtn = document.getElementById("cancelInvoiceBtn");
    if (cancelInvoiceReturnBtn) {
        cancelInvoiceReturnBtn.addEventListener("click", cancelInvoiceReturn);
    }

    // Save Draft / Submit — same pattern as new-invoice.js: single capture-phase delegate on .modal-footer-button
    const footerBtnRow = document.querySelector(".modal-footer-button");
    if (footerBtnRow && !footerBtnRow.dataset.irFooterDelegated) {
        footerBtnRow.dataset.irFooterDelegated = "1";
        footerBtnRow.addEventListener(
            "click",
            function (e) {
                const btn = e.target && e.target.closest ? e.target.closest("button") : null;
                if (!btn || !footerBtnRow.contains(btn)) return;
                if (btn.id !== "irSaveDraftBtn" && btn.id !== "irSubmitBtn") return;
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                if (btn.classList.contains("ir-footer-peer-blocked")) return;
                if (btn.id === "irSubmitBtn") {
                    if (btn.disabled || btn.getAttribute("aria-disabled") === "true") return;
                    submitInvoiceReturn("Submitted");
                } else {
                    if (btn.disabled) return;
                    submitInvoiceReturn("Draft");
                }
            },
            true
        );
    }

    const invForm = document.getElementById("invoiceForm");
    if (invForm) {
        invForm.addEventListener(
            "submit",
            function (e) {
                e.preventDefault();
                e.stopPropagation();
            },
            true
        );
    }
    
    const pdfAction = document.getElementById("pdfAction");
    if (pdfAction) {
        pdfAction.addEventListener("click", generatePDF);
    }
    
    const emailAction = document.getElementById("emailAction");
    if (emailAction) {
        emailAction.addEventListener("click", sendEmail);
    }

    loadSaleOrders();
    // updatePageHeading(); // add this call

    document.addEventListener('click', function(e) {
        const soDropdown = document.getElementById('saleOrderDropdown');
        const soSelected = document.getElementById('saleOrderSelected');
        if (soSelected && !soSelected.contains(e.target) && soDropdown && !soDropdown.contains(e.target)) {
            soDropdown.style.display = 'none';
        }
    });
});