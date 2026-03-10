// ===================================================
// COMPLETE QUOTATION SYSTEM WITH PROFESSIONAL ERP BEHAVIOR
// ===================================================

// Global variables
let products = [];
let rowCount = 0;
let otpTimer = null;
let otpExpiryTime = null;
let currentQuotationStatus = 'draft';
let currentEmail = '';
let currentQuotationId = '';
let isCheckingExpired = false;
let hasUnsavedChanges = false;
let initialFormState = {}; // Store initial form state for change detection

let currentCommentPage = 1;
let hasMoreComments = false;
let totalComments = 0;

// ===================================================
// LIMITS CONFIGURATION
// ===================================================
const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const COMMENTS_PER_PAGE = 5;

// Exchange rates (base currency: IND)
const exchangeRates = {
    'IND': 1.00,
    'USD': 0.012,
    'EUR': 0.011,
    'GBP': 0.0095,
    'SGD': 0.016
};

// Currency symbols for display
const currencySymbols = {
    'IND': '₹',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'SGD': 'S$'
};

// ===================================================
// SHOW TOAST FUNCTION - SINGLE STYLE FOR ALL TOASTS
// ===================================================

function showToast(message, type = 'info') {
    // Centered toast (Department & Roles style) for success / error / warning
    if (type === 'success' || type === 'error' || type === 'warning') {
        document
            .querySelectorAll('.success-notification, .error-notification')
            .forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className =
            type === 'success' ? 'success-notification' : 'error-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        // trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // auto hide (2s success, 3s error) – same as Department & Roles
        const duration = type === 'success' ? 2000 : 3000;
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 400);
        }, duration);
        return;
    }

    // Info / warning: simple top-right toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #cce5ff;
        color: #004085;
        padding: 10px 16px;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 9999;
        font-family: 'Segoe UI', Arial, sans-serif;
        max-width: 360px;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===================================================
// CAPTURE INITIAL FORM STATE FOR CHANGE DETECTION
// ===================================================

function captureInitialFormState() {
    initialFormState = {};
    
    // Capture main form fields
    const fields = [
        'quotationType', 'quotationDate', 'expiryDate', 'customerSelect',
        'currency', 'paymentTerms', 'expectedDate', 'customerPo', 'salesRep'
    ];
    
    fields.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            initialFormState[id] = element.value;
        }
    });
    
    // Capture global fields
    const globalDiscount = document.getElementById('globalDiscount');
    const shippingCharge = document.getElementById('shippingCharge');
    
    if (globalDiscount) initialFormState.globalDiscount = globalDiscount.value;
    if (shippingCharge) initialFormState.shippingCharge = shippingCharge.value;
    
    // Capture items table state
    initialFormState.items = [];
    const rows = document.querySelectorAll('#itemsTableBody tr');
    rows.forEach(row => {
        const rowData = {
            productId: row.querySelector('.product-id-cell')?.textContent || '',
            productSelect: row.querySelector('.product-select')?.value || '',
            quantity: row.querySelector('.quantity-input')?.value || '',
            discount: row.querySelector('.discount-input')?.value || '0',
            uom: row.querySelector('.uom-cell')?.textContent || '',
            unitPrice: row.querySelector('.unit-price-cell')?.textContent || '0',
            tax: row.querySelector('.tax-cell')?.textContent || '0'
        };
        initialFormState.items.push(rowData);
    });
    
    console.log("📸 Initial form state captured for change detection", initialFormState);
}





// ===================================================
// RESTRICT INPUT TO NUMBERS ONLY WITH MAX LENGTH
// ===================================================

function restrictToNumbers(event) {
    // Get the input element
    const input = event.target;
    
    // Allow only digits (0-9) and control keys (backspace, delete, tab, arrows)
    const key = event.key;
    
    // Allow control keys
    if (key === 'Backspace' || key === 'Delete' || key === 'Tab' || 
        key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || 
        key === 'ArrowDown' || key === 'Home' || key === 'End' || key === 'Enter') {
        return true;
    }
    
    // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if (event.ctrlKey && (key === 'a' || key === 'c' || key === 'v' || key === 'x')) {
        return true;
    }
    
    // Check if key is a digit (0-9)
    if (!/^\d+$/.test(key)) {
        event.preventDefault();
        return false;
    }
    
    // Check if input would exceed 10 digits
    const currentValue = input.value;
    const newValue = currentValue + key;
    
    if (newValue.length > 10) {
        event.preventDefault();
        showToast('Maximum 10 digits allowed', 'warning');
        return false;
    }
    
    return true;
}

// ===================================================
// VALIDATE PASTE EVENT FOR NUMBERS ONLY
// ===================================================

function validatePaste(event) {
    const input = event.target;
    
    // Get pasted data
    const pastedData = (event.clipboardData || window.clipboardData).getData('text');
    
    // Check if pasted data contains only digits
    if (!/^\d+$/.test(pastedData)) {
        event.preventDefault();
        showToast('Only numbers are allowed', 'warning');
        return false;
    }
    
    // Check length
    const currentValue = input.value;
    const newValue = currentValue + pastedData;
    
    if (newValue.length > 10) {
        event.preventDefault();
        showToast('Maximum 10 digits allowed', 'warning');
        return false;
    }
    
    return true;
}

// ===================================================
// APPLY NUMBER RESTRICTIONS TO ALL INPUTS
// ===================================================

function applyNumberRestrictions() {
    console.log("🔢 Applying number restrictions to inputs");
    
    // Select all quantity inputs
    const quantityInputs = document.querySelectorAll('.quantity-input');
    quantityInputs.forEach(input => {
        // Remove existing listeners to avoid duplicates
        input.removeEventListener('keydown', restrictToNumbers);
        input.removeEventListener('paste', validatePaste);
        
        // Add new listeners
        input.addEventListener('keydown', restrictToNumbers);
        input.addEventListener('paste', validatePaste);
        
        // Also add input event to ensure only numbers (for mobile devices)
        input.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '').substring(0, 10);
        });
    });
    
    // Select all discount inputs
    const discountInputs = document.querySelectorAll('.discount-input');
    discountInputs.forEach(input => {
        input.removeEventListener('keydown', restrictToNumbers);
        input.removeEventListener('paste', validatePaste);
        
        input.addEventListener('keydown', restrictToNumbers);
        input.addEventListener('paste', validatePaste);
        
        input.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '').substring(0, 10);
        });
    });
    
    // Global discount input
    const globalDiscount = document.getElementById('globalDiscount');
    if (globalDiscount) {
        globalDiscount.removeEventListener('keydown', restrictToNumbers);
        globalDiscount.removeEventListener('paste', validatePaste);
        
        globalDiscount.addEventListener('keydown', restrictToNumbers);
        globalDiscount.addEventListener('paste', validatePaste);
        
        globalDiscount.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '').substring(0, 10);
        });
    }
    
    // Shipping charge input
    const shippingCharge = document.getElementById('shippingCharge');
    if (shippingCharge) {
        shippingCharge.removeEventListener('keydown', restrictToNumbers);
        shippingCharge.removeEventListener('paste', validatePaste);
        
        shippingCharge.addEventListener('keydown', restrictToNumbers);
        shippingCharge.addEventListener('paste', validatePaste);
        
        shippingCharge.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '').substring(0, 5);
        });
    }
    
    console.log("✅ Number restrictions applied");
}

// ===================================================
// OBSERVER FOR DYNAMICALLY ADDED ROWS
// ===================================================

function observeNewRows() {
    const itemsTable = document.getElementById('itemsTableBody');
    if (!itemsTable) return;
    
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // New rows added, apply restrictions to new inputs
                setTimeout(() => {
                    applyNumberRestrictions();
                }, 100);
            }
        });
    });
    
    observer.observe(itemsTable, { childList: true, subtree: true });
    console.log("👀 Observer set up for new rows");
}





// ===================================================
// CHECK IF FORM HAS CHANGES
// ===================================================

function hasFormChanges() {
    // Check main form fields
    const fields = [
        'quotationType', 'quotationDate', 'expiryDate', 'customerSelect',
        'currency', 'paymentTerms', 'expectedDate', 'customerPo', 'salesRep'
    ];
    
    for (let id of fields) {
        const element = document.getElementById(id);
        if (element && initialFormState[id] !== element.value) {
            console.log(`📝 Change detected in ${id}: ${initialFormState[id]} -> ${element.value}`);
            return true;
        }
    }
    
    // Check global fields
    const globalDiscount = document.getElementById('globalDiscount');
    const shippingCharge = document.getElementById('shippingCharge');
    
    if (globalDiscount && initialFormState.globalDiscount !== globalDiscount.value) {
        return true;
    }
    if (shippingCharge && initialFormState.shippingCharge !== shippingCharge.value) {
        return true;
    }
    
    // Check items table
    const currentItems = [];
    const rows = document.querySelectorAll('#itemsTableBody tr');
    rows.forEach(row => {
        const rowData = {
            productId: row.querySelector('.product-id-cell')?.textContent || '',
            productSelect: row.querySelector('.product-select')?.value || '',
            quantity: row.querySelector('.quantity-input')?.value || '',
            discount: row.querySelector('.discount-input')?.value || '0',
            uom: row.querySelector('.uom-cell')?.textContent || '',
            unitPrice: row.querySelector('.unit-price-cell')?.textContent || '0',
            tax: row.querySelector('.tax-cell')?.textContent || '0'
        };
        currentItems.push(rowData);
    });
    
    // Compare items count first
    if (initialFormState.items.length !== currentItems.length) {
        return true;
    }
    
    // Compare each item
    for (let i = 0; i < currentItems.length; i++) {
        const initial = initialFormState.items[i];
        const current = currentItems[i];
        if (!initial) return true;
        
        if (initial.productSelect !== current.productSelect ||
            initial.quantity !== current.quantity ||
            initial.discount !== current.discount) {
            return true;
        }
    }
    
    return false;
}

// ===================================================
// DOCUMENT READY - INITIALIZATION
// ===================================================

document.addEventListener("DOMContentLoaded", function() {
    console.log("🚀 Page loaded - Initializing Quotation System...");
    
    // Check for expired quotations on page load
    setTimeout(() => {
        checkAndMarkExpiredQuotations();
        forceUpdateCurrentPageIfExpired();
    }, 2000);
    
    const quotationField = document.getElementById("quotationNumber");
    
    setQuotationDate();
    setExpiryDate();
    
    if (!quotationField.value) {
        console.log("🔄 Generating quotation ID...");
        fetch("/generate-quotation-id")
            .then(response => response.json())
            .then(data => {
                quotationField.value = data.quotation_id;
                console.log("✅ Quotation ID generated:", data.quotation_id);
                initializeAllComponents();
            })
            .catch(error => {
                console.error("Error generating ID:", error);
                quotationField.value = 'Q' + Date.now();
                initializeAllComponents();
            });
    } else {
        console.log("✅ Quotation ID exists:", quotationField.value);
        initializeAllComponents();
    }
    
    trackFormChanges();
});

// ===================================================
// TRACK FORM CHANGES FOR BUTTON ENABLE/DISABLE
// ===================================================

function trackFormChanges() {
    const formInputs = document.querySelectorAll('input:not([readonly]), select, textarea, .product-select, .quantity-input, .discount-input, #globalDiscount, #shippingCharge');
    
    formInputs.forEach(input => {
        input.addEventListener('change', function() {
            checkAndUpdateButtons();
            checkAndUpdateEditableButtons();
            // Track changes for Sent mode
            if (currentQuotationStatus === 'send' || currentQuotationStatus === 'submitted') {
                hasUnsavedChanges = true;
                updateButtonsForSentMode(true);
            }
        });
        
        input.addEventListener('input', function() {
            checkAndUpdateButtons();
            checkAndUpdateEditableButtons();
            if (currentQuotationStatus === 'send' || currentQuotationStatus === 'submitted') {
                hasUnsavedChanges = true;
                updateButtonsForSentMode(true);
            }
        });
    });
    
    const observer = new MutationObserver(function() {
        checkAndUpdateButtons();
        checkAndUpdateEditableButtons();
        if (currentQuotationStatus === 'send' || currentQuotationStatus === 'submitted') {
            hasUnsavedChanges = true;
            updateButtonsForSentMode(true);
        }
    });
    
    const tbody = document.getElementById('itemsTableBody');
    if (tbody) {
        observer.observe(tbody, { childList: true, subtree: true });
    }
}

// ===================================================
// CHECK AND UPDATE BUTTON STATES FOR EDITABLE STATUSES
// ===================================================

function checkAndUpdateEditableButtons() {
    const submitBtn = document.getElementById('submitBtn');
    const draftBtn = document.querySelector('.btn-draft');
    
    if (!submitBtn || !draftBtn) return;
    
    // Only apply change detection for draft, rejected, and expired statuses
    if (currentQuotationStatus === 'draft' || currentQuotationStatus === 'rejected' || currentQuotationStatus === 'expired') {
        const hasChanges = hasFormChanges();
        const isFormValid = checkFormValidity();
        const isDraftValid = checkDraftRequirements();
        
        console.log(`🔍 Change detection: ${hasChanges ? 'Changes detected' : 'No changes'}, Form valid: ${isFormValid}`);
        
        // Update Submit/Resubmit button
        if (hasChanges && isFormValid) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
            submitBtn.removeAttribute('title');
            
            if (currentQuotationStatus === 'rejected' || currentQuotationStatus === 'expired') {
                submitBtn.textContent = 'Resubmit';
            } else {
                submitBtn.textContent = 'Submit';
            }
            console.log(`✅ Submit button ENABLED - Changes detected`);
        } else {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
            submitBtn.style.cursor = 'not-allowed';
            submitBtn.setAttribute('title', hasChanges ? 'Please fill all mandatory fields' : 'No changes detected');
            console.log(`❌ Submit button DISABLED - ${hasChanges ? 'Invalid form' : 'No changes'}`);
        }
        
        // Update Draft button
        if (hasChanges && isDraftValid) {
            draftBtn.disabled = false;
            draftBtn.style.opacity = '1';
            draftBtn.style.cursor = 'pointer';
            draftBtn.removeAttribute('title');
            console.log(`✅ Draft button ENABLED - Changes detected`);
        } else {
            draftBtn.disabled = true;
            draftBtn.style.opacity = '0.5';
            draftBtn.style.cursor = 'not-allowed';
            draftBtn.setAttribute('title', hasChanges ? 'Fill all required fields to enable Save Draft' : 'No changes detected');
            console.log(`❌ Draft button DISABLED - ${hasChanges ? 'Invalid draft requirements' : 'No changes'}`);
        }
    }
}

// ===================================================
// CHECK AND UPDATE BUTTON STATES (ORIGINAL)
// ===================================================

function checkAndUpdateButtons() {
    const submitBtn = document.getElementById('submitBtn');
    const draftBtn = document.querySelector('.btn-draft');
    
    if (!submitBtn || !draftBtn) return;
    
    const isFormValid = checkFormValidity();
    const isDraftValid = checkDraftRequirements();
    const isEditableNow = isEditable();
    
    // This function is kept for backward compatibility
    // The main button logic is now in checkAndUpdateEditableButtons
}

// ===================================================
// UPDATE BUTTONS FOR SENT MODE
// ===================================================

// ===================================================
// UPDATE BUTTONS FOR SENT MODE - PROFESSIONAL ERP BEHAVIOR
// ===================================================

function updateButtonsForSentMode(changesMade) {
    const approveBtn = document.querySelector('.footer-item.approve');
    const rejectBtn = document.querySelector('.footer-item.reject');
    const submitBtn = document.querySelector('.btn-save');
    
    if (!approveBtn || !rejectBtn || !submitBtn) return;
    
    // Check if we're in view mode or edit mode
    const urlParams = new URLSearchParams(window.location.search);
    const isViewMode = urlParams.get('view');
    const isEditMode = urlParams.get('edit');
    
    // If in view mode, NEVER show action buttons
    if (isViewMode) {
        submitBtn.style.display = 'none';
        approveBtn.style.display = 'none';
        rejectBtn.style.display = 'none';
        return;
    }
    
    console.log(`🔄 Updating buttons for status: ${currentQuotationStatus}, changes: ${changesMade}, mode: ${isEditMode ? 'edit' : 'other'}`);
    
    // ============================================
    // PROFESSIONAL ERP RULES FOR EDIT MODE
    // ============================================
    
    // 1. SEND/SUBMITTED status - ALWAYS show Approve/Reject, NEVER show Submit
    if (currentQuotationStatus === 'send' || currentQuotationStatus === 'submitted') {
        approveBtn.style.display = 'flex';
        rejectBtn.style.display = 'flex';
        submitBtn.style.display = 'none';
        console.log("✅ Send/Submitted status - showing Approve/Reject buttons");
        return;
    }
    
    // 2. APPROVED status - NEVER show any action buttons
    if (currentQuotationStatus === 'approved') {
        approveBtn.style.display = 'none';
        rejectBtn.style.display = 'none';
        submitBtn.style.display = 'none';
        console.log("✅ Approved status - all buttons hidden");
        return;
    }
    
    // 3. REJECTED/EXPIRED status - Show Resubmit button
    if (currentQuotationStatus === 'rejected' || currentQuotationStatus === 'expired') {
        approveBtn.style.display = 'none';
        rejectBtn.style.display = 'none';
        submitBtn.style.display = 'flex';
        submitBtn.textContent = 'Resubmit';
        console.log("✅ Rejected/Expired status - showing Resubmit button");
        return;
    }
    
    // 4. DRAFT status - handled elsewhere
    // Default case - hide everything
    approveBtn.style.display = 'none';
    rejectBtn.style.display = 'none';
    submitBtn.style.display = 'none';
}
// ===================================================
// PROFESSIONAL ERP: CHECK IF EMAIL SHOULD BE ENABLED
// ===================================================

function isEmailEnabled() {
    // Email enabled only for Sent and Approved statuses
    return currentQuotationStatus === 'send' || 
           currentQuotationStatus === 'sent' || 
           currentQuotationStatus === 'submitted' || 
           currentQuotationStatus === 'approved';
}
// ===================================================
// PROFESSIONAL ERP: CHECK IF PDF SHOULD BE ENABLED
// ===================================================

function isPdfEnabled() {
    // PDF enabled for ALL statuses EXCEPT Draft
    // Rejected and Expired can VIEW (reference only)
    return currentQuotationStatus !== 'draft';
}
// ===================================================
// UPDATE ACTION BUTTONS BASED ON PROFESSIONAL ERP RULES
// ===================================================

// ===================================================
// UPDATE ACTION BUTTONS BASED ON PROFESSIONAL ERP RULES
// ===================================================

function updateActionButtons() {
    const pdfBtn = document.querySelector('.footer-item.pdf');
    const emailBtn = document.querySelector('.footer-item.email');
    
   if (pdfBtn) {
    const shouldEnable = isPdfEnabled();
    pdfBtn.disabled = !shouldEnable;
    pdfBtn.style.opacity = shouldEnable ? '1' : '0.5';
    pdfBtn.style.cursor = shouldEnable ? 'pointer' : 'not-allowed';
    
    // Set appropriate title based on status
    if (currentQuotationStatus === 'rejected') {
        pdfBtn.setAttribute('title', 'View Rejected Quotation (Reference Only)');
    } else if (currentQuotationStatus === 'expired') {
        pdfBtn.setAttribute('title', 'View Expired Quotation (Reference Only)');
    } else if (shouldEnable) {
        pdfBtn.setAttribute('title', 'Download PDF');
    } else {
        pdfBtn.setAttribute('title', 'PDF not available for draft');
    }
}
    
    if (emailBtn) {
    const shouldEnable = isEmailEnabled();
    emailBtn.disabled = !shouldEnable;
    emailBtn.style.opacity = shouldEnable ? '1' : '0.5';
    emailBtn.style.cursor = shouldEnable ? 'pointer' : 'not-allowed';
    
    // Set appropriate title based on status
    if (currentQuotationStatus === 'expired') {
        emailBtn.setAttribute('title', 'Email disabled - Quotation expired');
    } else if (currentQuotationStatus === 'rejected') {
        emailBtn.setAttribute('title', 'Email disabled - Quotation rejected');
    } else if (shouldEnable) {
        emailBtn.setAttribute('title', 'Send Email');
    } else {
        emailBtn.setAttribute('title', 'Email not available for this status');
    }
}
}
// ===================================================
// DATE FUNCTIONS
// ===================================================

function setQuotationDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const formattedDate = `${yyyy}-${mm}-${dd}`;
    
    const quotationDate = document.getElementById('quotationDate');
    if (quotationDate && !quotationDate.value) {
        quotationDate.value = formattedDate;
    }
}

function setExpiryDate() {
    const today = new Date();
    const expiry = new Date(today);
    expiry.setDate(today.getDate() + 15);
    
    const yyyy = expiry.getFullYear();
    const mm = String(expiry.getMonth() + 1).padStart(2, '0');
    const dd = String(expiry.getDate()).padStart(2, '0');
    const formattedDate = `${yyyy}-${mm}-${dd}`;
    
    const expiryDate = document.getElementById('expiryDate');
    if (expiryDate && !expiryDate.value) {
        expiryDate.value = formattedDate;
    }
}


// ===================================================
// DATE VALIDATION (FORMAT + EXPIRY & EXPECTED >= QUOTATION DATE)
// ===================================================

/** Check if value is a valid date string (YYYY-MM-DD) and within reasonable year range (1900-2100). */
function isValidDateString(value) {
    if (!value || typeof value !== 'string') return false;
    var trimmed = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
    var parts = trimmed.split('-');
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10) - 1;
    var d = parseInt(parts[2], 10);
    if (y < 1900 || y > 2100) return false;
    var date = new Date(y, m, d);
    if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return false;
    return true;
}

/** Validate format of all three date fields when typed manually. Returns true if all are valid or empty. */
function validateDateFormats() {
    var ids = ['quotationDate', 'expiryDate', 'expectedDate'];
    var allValid = true;
    ids.forEach(function(id) {
        var field = document.getElementById(id);
        if (!field) return;
        var val = (field.value || '').trim();

        // Hard clamp: if user types more than 4 consecutive digits anywhere
        // (typically in the year part), trim it down to 4 digits.
        // Example: "dd-mm-345534" -> "dd-mm-3455"
        var mDigits = val.match(/(\d{4})\d+/);
        if (mDigits) {
            val = val.replace(/(\d{4})\d+/, '$1');
            field.value = val;
        }

        var errEl = document.getElementById(id + 'Error');
        if (!val) {
            if (errEl) errEl.remove();
            field.style.borderColor = '';
            return;
        }
        if (!isValidDateString(val)) {
            allValid = false;
            if (!errEl) {
                showDateError(id, 'Invalid date. Use format YYYY-MM-DD (e.g. 2026-03-09).');
            } else {
                errEl.textContent = 'Invalid date. Use format YYYY-MM-DD (e.g. 2026-03-09).';
            }
            field.style.borderColor = '#dc3545';
        } else {
            if (errEl) errEl.remove();
            field.style.borderColor = '';
        }
    });
    return allValid;
}

function validateDates() {
    const quotationDate = document.getElementById('quotationDate')?.value;
    const expiryDate = document.getElementById('expiryDate')?.value;
    const expectedDate = document.getElementById('expectedDate')?.value;
    let isValid = true;

    // Clear previous errors
    clearDateErrors();

    // Validate manual date format first (YYYY-MM-DD, valid day/month/year)
    if (!validateDateFormats()) return false;

    if (quotationDate) {
        const qDate = new Date(quotationDate);
        qDate.setHours(0,0,0,0);

        // Validate expiry date
        if (expiryDate) {
            const eDate = new Date(expiryDate);
            eDate.setHours(0,0,0,0);
            if (eDate < qDate) {
                showDateError('expiryDate', 'Expiry date cannot be before quotation date');
                isValid = false;
            }
        }

        // Validate expected date
        if (expectedDate) {
            const exDate = new Date(expectedDate);
            exDate.setHours(0,0,0,0);
            if (exDate < qDate) {
                showDateError('expectedDate', 'Expected date cannot be before quotation date');
                isValid = false;
            }
        }
    }
    return isValid;
}

function showDateError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    // Remove any existing error for this field
    const existingError = document.getElementById(`${fieldId}Error`);
    if (existingError) existingError.remove();

    const error = document.createElement('div');
    error.id = `${fieldId}Error`;
    error.className = 'error-message';
    error.style.color = '#dc3545';
    error.style.fontSize = '12px';
    error.style.marginTop = '4px';
    error.textContent = message;
    field.parentNode.appendChild(error);
    field.style.borderColor = '#dc3545';
}

function clearDateErrors() {
    ['quotationDate', 'expiryDate', 'expectedDate'].forEach(id => {
        const error = document.getElementById(`${id}Error`);
        if (error) error.remove();
        const field = document.getElementById(id);
        if (field) field.style.borderColor = '';
    });
}

// ===================================================
// CURRENCY CONVERSION FUNCTIONS
// ===================================================

function convertToIND(amount, fromCurrency) {
    if (fromCurrency === 'IND' || !fromCurrency) return amount;
    const rate = exchangeRates[fromCurrency];
    if (!rate) return amount;
    return amount / rate;
}

function convertFromIND(amount, toCurrency) {
    if (toCurrency === 'IND' || !toCurrency) return amount;
    const rate = exchangeRates[toCurrency];
    if (!rate) return amount;
    return amount * rate;
}

function formatCurrency(amount, currency = 'IND') {
    const symbol = currencySymbols[currency] || '₹';
    const convertedAmount = convertFromIND(amount, currency);
    return `${symbol} ${Math.round(convertedAmount)}`;
}

// ===================================================
// AUTO ROUNDING ADJUSTMENT FUNCTION
// ===================================================

function calculateAutoRounding(amount, currency = 'IND') {
    const roundingUnit = 1.00;
    const roundedAmount = Math.round(amount / roundingUnit) * roundingUnit;
    const adjustment = roundedAmount - amount;
    
    console.log(`🔄 Auto Rounding: ${amount.toFixed(4)} → ${roundedAmount.toFixed(2)} (adjustment: ${adjustment.toFixed(2)})`);
    
    return {
        roundedAmount: roundedAmount,
        adjustment: adjustment
    };
}

// ===================================================
// INITIALIZE ALL COMPONENTS
// ===================================================
// ===================================================
// CUSTOMER PO REFERENCE – LIVE DUPLICATE CHECK
// ===================================================

var _customerPoCheckDebounceTimer = null;
var _customerPoDuplicateShown = false;

function checkCustomerPoDuplicate() {
    const input = document.getElementById('customerPo');
    if (!input) return;
    const value = (input.value || '').trim();
    input.classList.remove('customer-po-duplicate');
    input.style.borderColor = '';
    input.style.boxShadow = '';
    _customerPoDuplicateShown = false;
    if (!value) return;

    const quotationId = document.getElementById('quotationNumber')?.value || '';
    const params = new URLSearchParams({ value: value });
    if (quotationId) params.set('exclude_quotation_id', quotationId);

    fetch('/check-customer-po?' + params.toString())
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (!data.success) return;
            if (data.duplicate) {
                input.classList.add('customer-po-duplicate');
                input.style.borderColor = '#c00';
                input.style.boxShadow = '0 0 0 1px #c00';
                if (!_customerPoDuplicateShown) {
                    _customerPoDuplicateShown = true;
                    showToast('Customer PO Reference already exists. Please use a unique value.', 'warning');
                }
            } else {
                input.classList.remove('customer-po-duplicate');
                input.style.borderColor = '';
                input.style.boxShadow = '';
            }
        })
        .catch(function() {});
}

function setupCustomerPoDuplicateCheck() {
    const input = document.getElementById('customerPo');
    if (!input) return;

    // Restrict to letters, numbers, hyphen, and single space only
    input.addEventListener('keydown', function(e) {
        var key = e.key;
        if (key.length === 1 && !/^[a-zA-Z0-9- ]$/.test(key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
        }
    });
    input.addEventListener('input', function() {
        var allowed = input.value.replace(/[^a-zA-Z0-9- ]/g, '');
        if (input.value !== allowed) input.value = allowed;
        input.classList.remove('customer-po-duplicate');
        input.style.borderColor = '';
        input.style.boxShadow = '';
        _customerPoDuplicateShown = false;
        if (_customerPoCheckDebounceTimer) clearTimeout(_customerPoCheckDebounceTimer);
        var value = (input.value || '').trim();
        if (!value) return;
        _customerPoCheckDebounceTimer = setTimeout(function() {
            _customerPoCheckDebounceTimer = null;
            checkCustomerPoDuplicate();
        }, 500);
    });
    input.addEventListener('paste', function(e) {
        var pasted = (e.clipboardData || window.clipboardData).getData('text');
        var allowed = pasted.replace(/[^a-zA-Z0-9- ]/g, '');
        if (pasted !== allowed) {
            e.preventDefault();
            var start = input.selectionStart, end = input.selectionEnd;
            var val = input.value || '';
            input.value = val.slice(0, start) + allowed + val.slice(end);
            input.setSelectionRange(start + allowed.length, start + allowed.length);
        }
    });

    input.addEventListener('blur', function() {
        checkCustomerPoDuplicate();
    });
}

function initializeAllComponents() {

    // Start tab navigation inside the form: focus first form field
    const form = document.querySelector('.form-grid');
    if (form) {
        const firstField = form.querySelector('input, select, textarea');
        if (firstField && typeof firstField.focus === 'function') {
            try { firstField.focus(); } catch (e) {}
        }
    }

    // 1️⃣ FIRST: Create all UI elements (totals, tabs, buttons, etc.)
    loadDropdowns();
    initializeCurrencyListener();
    initializeFormValidation();
    initializeGlobalFields();
    initializeTotalsStructure();      // <-- critical – creates shipping & discount inputs
    initializeTabs();
    initializeComments();
    initializeAttachments();
    initializeButtons();
    initializeActionButtons();
    setupOTPInputs();
    setupOTPModalHandlers();
    initializeSaveDraftButton();
    setupDraftButtonClick();
    initializeInputDisableOnProductSelect();
    setupCustomerPoDuplicateCheck();
    setTimeout(validateDraftButton, 500);
    
    const addItemBtn = document.getElementById('addItemBtn');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', function() {
            if (isEditable()) {
                addNewRow();
            } else {
                showToast('Cannot add items when quotation is ' + currentQuotationStatus, 'warning');
            }
        });
    }

    // Apply number restrictions (after elements exist)
    setTimeout(() => {
        applyNumberRestrictions();
        observeNewRows();
    }, 1000);

    // 2️⃣ THEN: Load products and quotation data
    loadProducts().then(() => {
        console.log("Products loaded, now adding first row...");
        const urlParams = new URLSearchParams(window.location.search);
        const viewId = urlParams.get('view');
        const editId = urlParams.get('edit');

        if (viewId) {
            loadQuotationForView(viewId);
        } 
        else if(editId){
            loadQuotationForEdit(editId);
        }
        else {
            // Add new quotation
            console.log("📄 Loading Add New Quotation page");
            addNewRow();
            currentQuotationStatus = 'draft';
            updateUIForStatus('draft');
        }
        
        setTimeout(() => {
            addExpiryCheckButton();
        }, 500);
        
    }).catch(error => {
        console.error("Failed to load products:", error);
        addNewRow();
        currentQuotationStatus = 'draft';
        updateUIForStatus('draft');
    });
    
    console.log("✅ All components initialized");
}
// ===================================================
// LOAD DROPDOWNS
// ===================================================

function loadDropdowns() {
    console.log("📋 Loading dropdowns...");
    
    const currencySelect = document.getElementById('currency');
    if (currencySelect) {
        currencySelect.innerHTML = '<option value="">Select Currency</option>';
        
        Object.keys(currencySymbols).forEach(currency => {
            const option = document.createElement('option');
            option.value = currency;
            option.textContent = `${currency} (${currencySymbols[currency]})`;
            currencySelect.appendChild(option);
        });
    }
    
    const customerSelect = document.getElementById("customerSelect");
    const salesRep = document.getElementById("salesRep");
    const paymentTerms = document.getElementById("paymentTerms");

    if (customerSelect && salesRep && paymentTerms) {
        fetch("/get-customers-quotation")
            .then(response => response.json())
            .then(data => {
                console.log("📋 Customers loaded:", data.length);
                var customerNames = [];
                var salesRepValues = [];
                var paymentTermsValues = [];
                var seenCustomer = {};
                var seenSalesRep = {};
                var seenPaymentTerms = {};

                data.forEach(customer => {
                    if (customer.status !== "Active") return;

                    var name = (customer.name || "").trim();
                    if (name && !seenCustomer[name]) {
                        seenCustomer[name] = true;
                        customerNames.push(name);
                    }

                    var rep = (customer.sales_rep || "").trim();
                    if (rep && !seenSalesRep[rep]) {
                        seenSalesRep[rep] = true;
                        salesRepValues.push(rep);
                    }

                    var terms = (customer.paymentTerms || "").trim();
                    if (terms && !seenPaymentTerms[terms]) {
                        seenPaymentTerms[terms] = true;
                        paymentTermsValues.push(terms);
                    }
                });

                customerNames.forEach(function(name) {
                    var opt = document.createElement("option");
                    opt.value = name;
                    opt.textContent = name;
                    customerSelect.appendChild(opt);
                });

                salesRepValues.forEach(function(rep) {
                    var opt = document.createElement("option");
                    opt.value = rep;
                    opt.textContent = rep;
                    salesRep.appendChild(opt);
                });

                paymentTermsValues.forEach(function(terms) {
                    var opt = document.createElement("option");
                    opt.value = terms;
                    opt.textContent = terms;
                    paymentTerms.appendChild(opt);
                });
            })
            .catch(error => console.error("❌ Error loading dropdowns:", error));
    }
}

// ===================================================
// PRODUCT LOADING
// ===================================================

async function loadProducts() {
    try {
        console.log("📦 Loading products from backend...");
        const response = await fetch('/get-products');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        products = await response.json();
        console.log('✅ Products loaded:', products.length, 'items');
        return products;
    } catch (error) {
        console.error('❌ Error loading products:', error);
        products = [];
        return [];
    }
}

// ===================================================
// INITIALIZE TOTALS STRUCTURE
// ===================================================

function initializeTotalsStructure() {
    console.log("💰 Initializing totals structure...");
    
    const totalsDiv = document.querySelector('.totals');
    if (!totalsDiv) return;
    
    if (document.getElementById('subtotalAmount')) return;
    
    totalsDiv.innerHTML = '';
    
    const subtotalRow = document.createElement('div');
    subtotalRow.innerHTML = `<span>Subtotal</span><span id="subtotalAmount">₹ 0.00</span>`;
    totalsDiv.appendChild(subtotalRow);
    
    const discountRow = document.createElement('div');
    discountRow.className = 'global-discount-row';
    discountRow.innerHTML = `
        <span>Global Discount (%)</span>
        <span>
            <input type="text" id="globalDiscount" class="global-discount-input" value="0" min="0" max="100" step="0.1" oninput="handleGlobalInput()" style="width: 80px; padding: 5px; border: 1px solid #ddd; border-radius: 4px; text-align: right;">
        </span>
    `;
    totalsDiv.appendChild(discountRow);
    
    const taxRow = document.createElement('div');
    taxRow.innerHTML = `<span>Tax Summary</span><span id="taxSummaryAmount">₹ 0</span>`;
    totalsDiv.appendChild(taxRow);
    
    const shippingRow = document.createElement('div');
    shippingRow.className = 'shipping-row';
    shippingRow.innerHTML = `
        <span>Shipping Charge</span>
        <span>
            <input type="text" id="shippingCharge" class="shipping-input" value="0" min="0" maxlength="5" step="0.01" oninput="handleGlobalInput()" style="width: 80px; padding: 5px; border: 1px solid #ddd; border-radius: 4px; text-align: right;">
        </span>
    `;
    totalsDiv.appendChild(shippingRow);
    
    const roundingRow = document.createElement('div');
    roundingRow.className = 'rounding-row';
    roundingRow.innerHTML = `
        <span>Rounding Adjustment</span>
        <span>
            <input type="number" id="roundingAdjustment" class="rounding-input" value="0" step="0.01" readonly style="width: 80px; padding: 5px; border: 1px solid #28a745; border-radius: 4px; text-align: right; border:none">
        </span>
    `;
    totalsDiv.appendChild(roundingRow);
    
    const grandTotalRow = document.createElement('div');
    grandTotalRow.className = 'grand-total';
    grandTotalRow.innerHTML = `<span>Grand Total</span><span id="grandTotalAmount">₹ 0</span>`;
    totalsDiv.appendChild(grandTotalRow);
    
    console.log("✅ Totals structure initialized");
}

// ===================================================
// GLOBAL INPUT HANDLER
// ===================================================

window.handleGlobalInput = function() {
    calculateGrandTotal();
    checkAndUpdateButtons();
    checkAndUpdateEditableButtons();
};

// ===================================================
// CURRENCY CHANGE LISTENER
// ===================================================

// ===================================================
// CURRENCY CHANGE LISTENER (UPDATED)
// ===================================================
function initializeCurrencyListener() {
    const currencySelect = document.getElementById('currency');
    if (currencySelect) {
        currencySelect.addEventListener('change', function() {
            const selectedCurrency = this.value;
            console.log(`💰 Currency changed to: ${selectedCurrency}`);

            // Update shipping charge display if we have a stored INR value
            if (window.currentShippingIND !== undefined) {
                const shippingInput = document.getElementById('shippingCharge');
                shippingInput.value = convertFromIND(window.currentShippingIND, selectedCurrency).toFixed(2);
            }

            // Update all row unit prices and totals
            const rows = document.querySelectorAll('#itemsTableBody tr');
            rows.forEach((row, index) => {
                const rowNumber = index + 1;
                const priceIND = parseFloat(row.dataset.priceIND);
                if (priceIND) {
                    const symbol = currencySymbols[selectedCurrency] || '₹';
                    const displayUnitPrice = convertFromIND(priceIND, selectedCurrency);
                    row.querySelector('.unit-price-cell').textContent = `${symbol} ${displayUnitPrice.toFixed(2)}`;
                }
                calculateRowTotal(rowNumber);
            });

            calculateGrandTotal();
            checkAndUpdateButtons();
            checkAndUpdateEditableButtons();

            if (selectedCurrency) {
                showToast(`Currency changed to ${selectedCurrency}`, 'success');
            }
        });
    }
}
// ===================================================
// GLOBAL FIELDS INITIALIZATION - WITH VALIDATION
// ===================================================

function initializeGlobalFields() {
    console.log("💰 Initializing global fields...");
    
    const globalDiscount = document.getElementById('globalDiscount');
    const shippingCharge = document.getElementById('shippingCharge');
    
    if (globalDiscount) {
        // Add validation events
        globalDiscount.addEventListener('input', function() {
            // Live validation - prevent going over 100 while typing
            let value = parseFloat(this.value) || 0;
            if (value > 100) {
                this.value = 100;
            } else if (value < 0) {
                this.value = 0;
            }
            calculateGrandTotal();
            checkAndUpdateButtons();
            checkAndUpdateEditableButtons();
        });
        
        globalDiscount.addEventListener('change', function() {
            validateGlobalDiscount();
        });
        
        globalDiscount.addEventListener('blur', function() {
            validateGlobalDiscount();
        });
    }
    
    if (shippingCharge) {
        shippingCharge.addEventListener('input', function() {
            calculateGrandTotal();
            checkAndUpdateButtons();
            checkAndUpdateEditableButtons();
        });
        shippingCharge.addEventListener('change', function() {
            calculateGrandTotal();
            checkAndUpdateButtons();
            checkAndUpdateEditableButtons();
        });
    }
    
    console.log("✅ Global fields initialized");
}
// ===================================================
// FORM VALIDATION
// ===================================================

function initializeFormValidation() {
    console.log("🔍 Initializing form validation...");
    
    const submitBtn = document.getElementById('submitBtn');
    const quotationType = document.getElementById('quotationType');
    const quotationDate = document.getElementById('quotationDate');
    const expiryDate = document.getElementById('expiryDate');
    const customerSelect = document.getElementById('customerSelect');
    const currency = document.getElementById('currency');
    const paymentTerms = document.getElementById('paymentTerms');
    const expectedDate = document.getElementById('expectedDate');
    const itemsTable = document.getElementById('itemsTableBody');
    
    if (!submitBtn) return;
    
    const formFields = [
        quotationType, quotationDate, expiryDate, 
        customerSelect, currency, paymentTerms, expectedDate
    ];

    // Shared helper: clamp year segment to max 4 digits for any date input
    function attachYearClamp(input) {
        if (!input) return;
        input.addEventListener('input', function () {
            let v = input.value || '';
            v = v.replace(/[^\d-]/g, '');

            // Handle native YYYY-MM-DD
            const iso = v.match(/^(\d{4,})-(\d{2})-(\d{2})$/);
            if (iso) {
                const year = iso[1].slice(0, 4);
                input.value = `${year}-${iso[2]}-${iso[3]}`;
                return;
            }

            // Handle dd-mm-yyyy style
            const lastDash = v.lastIndexOf('-');
            if (lastDash !== -1) {
                const prefix = v.slice(0, lastDash + 1);
                let yearPart = v.slice(lastDash + 1).replace(/\D/g, '');
                if (yearPart.length > 4) yearPart = yearPart.slice(0, 4);
                input.value = prefix + yearPart;
                return;
            }

            // Only year typed
            const m = v.match(/^(\d{0,4})\d*$/);
            input.value = m ? m[1] : v;
        });
    }

    // Apply the same clamp logic to all three date fields
    attachYearClamp(quotationDate);
    attachYearClamp(expiryDate);
    attachYearClamp(expectedDate);
    
     // Date validation listeners (format + relative dates; validate on blur when typed manually)
    [quotationDate, expiryDate, expectedDate].forEach(field => {
        if (field) {
            field.addEventListener('blur', function() {
                validateDateFormats();
                validateDates();
                checkAndUpdateButtons();
                checkAndUpdateEditableButtons();
            });
            field.addEventListener('change', function() {
                validateDates();
                checkAndUpdateButtons();
                checkAndUpdateEditableButtons();
            });
            field.addEventListener('input', function() {
                validateDateFormats();
                checkAndUpdateButtons();
                checkAndUpdateEditableButtons();
            });
        }
    });


    formFields.forEach(field => {
        if (field) {
            field.addEventListener('change', function() {
                checkAndUpdateButtons();
                checkAndUpdateEditableButtons();
            });
            field.addEventListener('input', function() {
                checkAndUpdateButtons();
                checkAndUpdateEditableButtons();
            });
            field.addEventListener('blur', function() {
                checkAndUpdateButtons();
                checkAndUpdateEditableButtons();
            });
        }
    });
    
    if (itemsTable) {
        const observer = new MutationObserver(function() {
            checkAndUpdateButtons();
            checkAndUpdateEditableButtons();
        });
        observer.observe(itemsTable, { childList: true, subtree: true });
    }
    
    const addItemBtn = document.getElementById('addItemBtn');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', () => {
            setTimeout(() => {
                checkAndUpdateButtons();
                checkAndUpdateEditableButtons();
            }, 100);
        });
    }
    
    function validateForm() {
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');
        
        const isFormValid = checkFormValidity();
        
        if (editId) {
            if (currentQuotationStatus === 'draft' || 
                currentQuotationStatus === 'rejected' || 
                currentQuotationStatus === 'expired') {
                
                if (isFormValid) {
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                    submitBtn.style.cursor = 'pointer';
                    submitBtn.removeAttribute('title');
                    
                    if (currentQuotationStatus === 'rejected') {
                        submitBtn.textContent = 'Resubmit';
                    } else if (currentQuotationStatus === 'expired') {
                        submitBtn.textContent = 'Resubmit';
                    } else {
                        submitBtn.textContent = 'Submit';
                    }
                    
                    console.log(`✅ ${currentQuotationStatus} edit mode - Submit ENABLED`);
                } else {
                    submitBtn.disabled = true;
                    submitBtn.style.opacity = '0.5';
                    submitBtn.style.cursor = 'not-allowed';
                    submitBtn.setAttribute('title', 'Please fill all mandatory fields');
                    console.log(`❌ ${currentQuotationStatus} edit mode - Submit DISABLED`);
                }
            } else {
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.5';
                submitBtn.style.cursor = 'not-allowed';
                submitBtn.setAttribute('title', 'Cannot submit - Status is ' + currentQuotationStatus);
            }
        } else {
            if (isFormValid) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
                submitBtn.removeAttribute('title');
                submitBtn.textContent = 'Submit';
            } else {
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.5';
                submitBtn.style.cursor = 'not-allowed';
                submitBtn.setAttribute('title', 'Please fill all mandatory fields');
            }
        }
    }
    
    function checkFormValidity() {
        if (!quotationType || !quotationType.value || quotationType.value === 'Select Quotation Type') return false;
        if (!quotationDate || !quotationDate.value) return false;
        if (!expiryDate || !expiryDate.value) return false;
        if (!customerSelect || !customerSelect.value) return false;
        if (!currency || !currency.value || currency.value === 'Select Currency') return false;
        if (!paymentTerms || !paymentTerms.value) return false;
        if (!expectedDate || !expectedDate.value) return false;
        // Add date validation
    if (!validateDates()) {
        return false;
    }

        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(expectedDate.value);
        selectedDate.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            showExpectedDateError(true);
            return false;
        } else {
            showExpectedDateError(false);
        }
        
        const rows = document.querySelectorAll('#itemsTableBody tr');
        let hasValidProduct = false;
        
        rows.forEach(row => {
            const productSelect = row.querySelector('.product-select');
            if (productSelect && productSelect.value) {
                hasValidProduct = true;
            }
        });
        
        return hasValidProduct;
    }
    
    function showExpectedDateError(show) {
        let errorElement = document.getElementById('expectedDateError');
        const expectedDate = document.getElementById('expectedDate');
        if (!expectedDate) return;
        
        if (show) {
            if (!errorElement) {
                errorElement = document.createElement('div');
                errorElement.id = 'expectedDateError';
                errorElement.className = 'error-message';
                errorElement.style.color = '#dc3545';
                errorElement.style.fontSize = '12px';
                errorElement.style.marginTop = '4px';
                errorElement.textContent = 'Expected date cannot be in the past';
                expectedDate.parentNode.appendChild(errorElement);
            }
            expectedDate.style.borderColor = '#dc3545';
        } else {
            if (errorElement) errorElement.remove();
            expectedDate.style.borderColor = '#e7b7b5';
        }
    }
    
    window.validateForm = validateForm;
    window.checkFormValidity = checkFormValidity;
    
    setTimeout(validateForm, 500);
}


// ===================================================
// VALIDATE GLOBAL DISCOUNT - MAX 100%
// ===================================================

function validateGlobalDiscount() {
    const globalDiscount = document.getElementById('globalDiscount');
    if (!globalDiscount) return;
    
    let value = parseFloat(globalDiscount.value) || 0;
    
    // Ensure discount is between 0 and 100
    if (value < 0) {
        value = 0;
        globalDiscount.value = 0;
        showToast('Global discount cannot be negative', 'warning');
    } else if (value > 100) {
        value = 100;
        globalDiscount.value = 100;
        showToast('Global discount cannot exceed 100%', 'warning');
    }
    
    // Recalculate totals after validation
    calculateGrandTotal();
    checkAndUpdateButtons();
    checkAndUpdateEditableButtons();
    
    return value;
}

// ===================================================
// WORKFLOW MANAGEMENT - STATUS BASED UI
// ===================================================

function isEditable() {
    return currentQuotationStatus === 'draft' || 
           currentQuotationStatus === 'rejected' || 
           currentQuotationStatus === 'expired';
}

function getDisplayStatus() {
    const expiryDateInput = document.getElementById('expiryDate');
    if (!expiryDateInput || !expiryDateInput.value) {
        return currentQuotationStatus;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(expiryDateInput.value);
    expiryDate.setHours(0, 0, 0, 0);
    
    const isSentStatus = currentQuotationStatus === 'send' || 
                        currentQuotationStatus === 'sent' || 
                        currentQuotationStatus === 'submitted';
    
    if (isSentStatus && expiryDate < today) {
        console.log("✅ Showing EXPIRED for SENT quotation:", currentQuotationStatus);
        return 'expired';
    }
    
    return currentQuotationStatus;
}

function updateUIForStatus(status) {
    currentQuotationStatus = status;
    const displayStatus = getDisplayStatus();
    
    console.log(`🔄 updateUIForStatus: Original=${status}, Display=${displayStatus}`);
    
    const formInputs = document.querySelectorAll('input:not([readonly]), select, textarea, .product-select, .quantity-input, .discount-input, #globalDiscount, #shippingCharge');
    const addItemBtn = document.getElementById('addItemBtn');
    const submitBtn = document.querySelector('.btn-save');
    const draftBtn = document.querySelector('.btn-draft');
    const approveBtn = document.querySelector('.footer-item.approve');
    const rejectBtn = document.querySelector('.footer-item.reject');
    const pdfBtn = document.querySelector('.footer-item.pdf');
    const emailBtn = document.querySelector('.footer-item.email');
    
    const existingBadge = document.querySelector('.status-badge');
    if (existingBadge) existingBadge.remove();
    
    hasUnsavedChanges = false;
    
    const urlParams = new URLSearchParams(window.location.search);
    const isAddNewPage = !urlParams.get('view') && !urlParams.get('edit');
    const shouldShowBadge = !isAddNewPage;
    
    // Helper function to properly show footer items with correct flex layout
    function showFooterItem(btn, show = true) {
        if (!btn) return;
        if (show) {
            btn.style.display = 'flex';
            btn.style.flexDirection = 'column';
            btn.style.alignItems = 'center';
            btn.style.visibility = 'visible';
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        } else {
            btn.style.display = 'none';
            btn.style.visibility = 'hidden';
        }
    }
    
    switch(displayStatus) {
        case 'draft':
            formInputs.forEach(input => { input.disabled = false; input.style.backgroundColor = ''; });
            if (submitBtn) {
                submitBtn.style.display = 'inline-block';
                submitBtn.textContent = 'Submit';
            }
            if (draftBtn) draftBtn.style.display = 'inline-block';
            showFooterItem(approveBtn, false);
            showFooterItem(rejectBtn, false);
            showFooterItem(pdfBtn, true);
            showFooterItem(emailBtn, true);
            if (addItemBtn) { addItemBtn.disabled = false; addItemBtn.style.opacity = '1'; }
            
            if (shouldShowBadge) {
                showStatusBadge('draft', 'Draft');
            }
            
            setTimeout(() => {
                captureInitialFormState();
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.style.opacity = '0.5';
                    submitBtn.setAttribute('title', 'No changes detected');
                }
                if (draftBtn) {
                    draftBtn.disabled = true;
                    draftBtn.style.opacity = '0.5';
                    draftBtn.setAttribute('title', 'No changes detected');
                }
            }, 500);
            break;
        
        case 'send':
        case 'submitted':
            if (isAddNewPage) {
                formInputs.forEach(input => { 
                    input.disabled = true; 
                    // input.style.backgroundColor = '#f5f5f5';
                });
                if (submitBtn) submitBtn.style.display = 'none';
                if (draftBtn) draftBtn.style.display = 'none';
                showFooterItem(approveBtn, false);
                showFooterItem(rejectBtn, false);
                showFooterItem(pdfBtn, true);
                showFooterItem(emailBtn, true);
                if (addItemBtn) { addItemBtn.disabled = true; addItemBtn.style.opacity = '0.5'; }
                showStatusBadge('send', displayStatus === 'send' ? 'Sent' : 'Submitted');
            } 
            else {
                formInputs.forEach(input => { 
                    input.disabled = false;
                    // input.style.backgroundColor = '#fffff0';
                });
                
                // ✅ For send/submitted in edit mode - show Approve/Reject with proper flex layout
                if (submitBtn) submitBtn.style.display = 'none';
                if (draftBtn) draftBtn.style.display = 'none';
                showFooterItem(approveBtn, true);
                showFooterItem(rejectBtn, true);
                showFooterItem(pdfBtn, true);
                showFooterItem(emailBtn, true);
                if (addItemBtn) { addItemBtn.disabled = false; addItemBtn.style.opacity = '1'; }
                
                showStatusBadge('send', displayStatus === 'send' ? 'Pending Approval' : 'Submitted');
                
                setTimeout(() => {
                    captureInitialFormState();
                }, 1000);
            }
            
            if (!isAddNewPage) {
                setTimeout(() => {
                    trackFormChanges();
                }, 2000);
            }
            break;
        
        case 'approved':
            formInputs.forEach(input => { 
                input.disabled = true; 
                // input.style.backgroundColor = '#f5f5f5';
                // input.style.borderColor = '#ddd';
            });
            
            // ✅ For approved - show PDF, Email, Sync with proper flex layout
            if (submitBtn) submitBtn.style.display = 'none';
            if (draftBtn) draftBtn.style.display = 'none';
            showFooterItem(approveBtn, false);
            showFooterItem(rejectBtn, false);
            showFooterItem(pdfBtn, true);
            showFooterItem(emailBtn, true);
            if (addItemBtn) { addItemBtn.disabled = true; addItemBtn.style.opacity = '0.5'; }
            
            if (shouldShowBadge) {
                showStatusBadge('approved', 'Approved ✓');
            }
            break;
        
        case 'rejected':
            formInputs.forEach(input => { 
                input.disabled = false;
                // input.style.backgroundColor = '#fff0f0';
            });
            
            // ✅ For rejected - show Resubmit button with proper styling
            if (submitBtn) {
                submitBtn.style.display = 'inline-block';
                submitBtn.textContent = 'Resubmit';
                submitBtn.style.margin = '0 5px';
            }
            if (draftBtn) draftBtn.style.display = 'none';
            showFooterItem(approveBtn, false);
            showFooterItem(rejectBtn, false);
            showFooterItem(pdfBtn, true);
            showFooterItem(emailBtn, true);
            if (addItemBtn) { addItemBtn.disabled = false; addItemBtn.style.opacity = '1'; }
            
            if (shouldShowBadge) {
                showStatusBadge('rejected', 'Rejected ✗');
            }
            
            setTimeout(() => {
                captureInitialFormState();
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.style.opacity = '0.5';
                    submitBtn.setAttribute('title', 'No changes detected');
                }
            }, 500);
            break;
        
        case 'expired':
            formInputs.forEach(input => { 
                input.disabled = false;
                // input.style.backgroundColor = '#fff3f3';
                // input.style.borderColor = '#ffcccc';
            });
            
            // ✅ For expired - show Resubmit button with proper styling
            if (submitBtn) {
                submitBtn.style.display = 'inline-block';
                submitBtn.textContent = 'Resubmit';
                submitBtn.style.margin = '0 5px';
            }
            if (draftBtn) draftBtn.style.display = 'none';
            showFooterItem(approveBtn, false);
            showFooterItem(rejectBtn, false);
            showFooterItem(pdfBtn, true);
            showFooterItem(emailBtn, true);
            if (addItemBtn) { 
                addItemBtn.disabled = false; 
                addItemBtn.style.opacity = '1';
            }
            
            if (shouldShowBadge) {
                showStatusBadge('expired', 'Expired ⏰');
            }
            
            const expiryDate = document.getElementById('expiryDate')?.value;
            if (expiryDate) {
                showToast(`⚠️ This quotation expired on ${formatDate(expiryDate)}`, 'warning');
            }
            
            setTimeout(() => {
                captureInitialFormState();
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.style.opacity = '0.5';
                    submitBtn.setAttribute('title', 'No changes detected');
                }
            }, 500);
            break;
    }
    
    updateActionButtons();
    checkAndUpdateButtons();
    checkAndUpdateEditableButtons();
}
const style = document.createElement('style');
style.textContent = `
    .status-badge {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 500;
        margin-left: 15px;
        display: inline-block;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .status-badge.status-draft { background-color: #6c757d; color: white; }
    .status-badge.status-send { background-color: #ffc107; color: #212529; }
    .status-badge.status-sent { background-color: #ffc107; color: #212529; }
    .status-badge.status-submitted { background-color: #17a2b8; color: white; }
    .status-badge.status-approved { background-color: #28a745; color: white; }
    .status-badge.status-rejected { background-color: #dc3545; color: white; }
    .status-badge.status-expired { 
        background-color: #6c757d; 
        color: white;
        position: relative;
    }
    .status-badge.status-expired::before {
        content: "⏰";
        margin-right: 4px;
    }
`;
document.head.appendChild(style);

function showStatusBadge(status, text) {
    const title = document.querySelector('.quotation-title');
    if (title) {
        const badge = document.createElement('span');
        badge.className = `status-badge status-${status}`;
        badge.textContent = text;
        title.appendChild(badge);
    }
}

// ===================================================
// QUOTATION ITEMS TABLE
// ===================================================

function extractTaxPercentage(taxCode) {
    if (!taxCode) return 0;
    const match = taxCode.match(/\((\d+(?:\.\d+)?)%\)/);
    return match && match[1] ? parseFloat(match[1]) : 0;
}

function isProductAlreadyAdded(productId, currentRowId = null) {
    const rows = document.querySelectorAll('#itemsTableBody tr');
    
    for (let row of rows) {
        if (currentRowId && row.id === currentRowId) continue;
        const existingProductId = row.querySelector('.product-id-cell')?.textContent;
        if (existingProductId && existingProductId === productId) {
            return true;
        }
    }
    return false;
}

function updateDropdowns() {
    const allSelects = document.querySelectorAll('.product-select');
    const selectedProducts = new Set();
    
    document.querySelectorAll('#itemsTableBody tr').forEach(row => {
        const select = row.querySelector('.product-select');
        if (select && select.value) {
            selectedProducts.add(select.value);
        }
    });
    
    allSelects.forEach(select => {
        Array.from(select.options).forEach(option => {
            if (option.value && selectedProducts.has(option.value) && option.value !== select.value) {
                option.disabled = true;
                option.style.color = '#999';
                option.style.backgroundColor = '#f5f5f5';
                if (!option.textContent.includes('(Already added)')) {
                    option.textContent = option.textContent + ' (Already added)';
                }
            } else {
                option.disabled = false;
                option.style.color = '';
                option.style.backgroundColor = '';
                if (option.textContent.includes(' (Already added)')) {
                    option.textContent = option.textContent.replace(' (Already added)', '');
                }
            }
        });
    });
}function clearRow(row) {
    const currentCurrency = document.getElementById('currency')?.value || 'IND';
    const symbol = currencySymbols[currentCurrency] || '₹';
    
    row.querySelector('.product-id-cell').textContent = '';
    row.querySelector('.uom-cell').textContent = '';
    row.querySelector('.unit-price-cell').textContent = `${symbol} 0.00`;
    row.querySelector('.tax-cell').textContent = '';
    
    const quantityInput = row.querySelector('.quantity-input');
    if (quantityInput) {
        quantityInput.value = '';
        quantityInput.disabled = true;
        quantityInput.readOnly = true;
        quantityInput.style.backgroundColor = '#f5f5f5';
        quantityInput.style.cursor = 'not-allowed';
        quantityInput.placeholder = 'Select product first';
    }
    
    const discountInput = row.querySelector('.discount-input');
    if (discountInput) {
        discountInput.value = 0;
        discountInput.disabled = true;
        discountInput.readOnly = true;
        discountInput.style.backgroundColor = '#f5f5f5';
        discountInput.style.cursor = 'not-allowed';
    }
    
    // Reset total display with currency symbol
    row.querySelector('.row-total-cell').textContent = `${symbol} 0.00`;
    
    // Reset dataset
    row.dataset.priceIND = '0';
    row.dataset.exchangeRate = '1.00';
    row.dataset.rowTotal = '0';
    row.dataset.rowTotalIND = '0';
    row.dataset.taxAmount = '0';
    row.dataset.taxAmountIND = '0';
    row.dataset.status = '';
    
    const select = row.querySelector('.product-select');
    if (select) select.value = '';
}
// ===================================================
// MODIFIED ADD NEW ROW FUNCTION
// ===================================================
// ===================================================
// ADD NEW ROW - WITH DISABLED INPUTS BY DEFAULT
// ===================================================

// ===================================================
// ADD NEW ROW - WITH CURRENCY SYMBOL IN UNIT PRICE
// ===================================================

function addNewRow() {
    rowCount++;
    console.log(`➕ Adding new row: ${rowCount}`);
    
    const tbody = document.getElementById('itemsTableBody');
    if (!tbody) return;
    
    const newRow = document.createElement('tr');
    newRow.id = `row-${rowCount}`;
    newRow.className = 'quotation-item-row';
    
    // Build product options
    let productOptions = '<option value="">Select Product</option>';
    
    if (products && products.length > 0) {
        const activeProducts = products.filter(p => p.status && p.status.toLowerCase() === 'active');
        
        if (activeProducts.length > 0) {
            activeProducts.forEach(product => {
                const productId = product.product_id || product.id || '';
                const productName = product.product_name || product.name || 'Unnamed Product';
                
                const availableQty = product.available_quantity || 
                                    product.stock || 
                                    product.quantity || 
                                    '∞';
                
                const displayText = availableQty !== '∞' 
                    ? `${productName} (Stock: ${availableQty})` 
                    : productName;
                
                const productData = JSON.stringify(product).replace(/'/g, "&apos;");
                productOptions += `<option value="${productId}" data-product='${productData}'>${displayText}</option>`;
            });
        }
    }
    
    // Get current currency symbol
    const currentCurrency = document.getElementById('currency')?.value || 'IND';
    const symbol = currencySymbols[currentCurrency] || '₹';
    
    // Create new row with ALL inputs disabled by default
    newRow.innerHTML = `
        <td class="sno-cell">${rowCount}</td>
        <td>
            <select class="product-select" onchange="handleProductSelect(this, ${rowCount})" style="width: 160px; padding: 5px; border: 1px solid #ddd; border-radius: 4px;" ${!isEditable() ? 'disabled' : ''}>
                ${productOptions}
            </select>
        </td>
        <td class="product-id-cell"></td>
        <td>
            <input type="text" 
                   class="quantity-input" 
                   placeholder="Select product first" 
                   onchange="handleItemChange(${rowCount})" 
                   oninput="handleItemChange(${rowCount})" 
                   style="width: 80px; padding: 5px; border: 1px solid #ddd; border-radius: 4px; background-color: #f5f5f5; cursor: not-allowed;" 
                   disabled
                   readonly
                   ${!isEditable() ? 'disabled' : ''}>
        </td>
        <td class="uom-cell"></td>
        <td class="unit-price-cell">${symbol} 0.00</td>
        <td class="tax-cell"></td>
        <td>
            <input type="text" 
                   class="discount-input" 
                   value="0" 
                   onchange="handleItemChange(${rowCount})" 
                   oninput="handleItemChange(${rowCount})" 
                   style="width: 70px; padding: 5px; border: 1px solid #ddd; border-radius: 4px; background-color: #f5f5f5; cursor: not-allowed;" 
                   disabled
                   readonly
                   ${!isEditable() ? 'disabled' : ''}>
        </td>
        <td class="row-total-cell">${symbol} 0.00</td>
        <td>
            <button type="button" onclick="openDeleteItemModal(${rowCount})" style="color: red; background: none; border: none; cursor: pointer; font-size: 16px;" ${!isEditable() ? 'disabled' : ''}>
                <i class="fa-solid fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(newRow);
    
    // Initialize dataset values
    newRow.dataset.priceIND = '0';
    newRow.dataset.exchangeRate = '1.00';
    newRow.dataset.rowTotal = '0';
    newRow.dataset.rowTotalIND = '0';
    newRow.dataset.taxAmount = '0';
    newRow.dataset.taxAmountIND = '0';
    
    updateDropdowns();
    
    // Check global inputs state after adding new row
    setTimeout(() => {
        checkAndUpdateGlobalInputs();
        checkAndUpdateButtons();
        checkAndUpdateEditableButtons();
    }, 100);
}
// ===================================================
// DISABLE QUANTITY/DISCOUNT INPUTS UNTIL PRODUCT SELECTED
// ===================================================

function initializeInputDisableOnProductSelect() {
    console.log("🔒 Initializing input disable logic...");
    
    // Initial disable of all quantity and discount inputs
    disableAllQuantityAndDiscountInputs();
    
    // Initially disable global inputs
    disableGlobalInputs();
    
    // Set up mutation observer to handle dynamically added rows
    const itemsTable = document.getElementById('itemsTableBody');
    if (itemsTable) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // New rows added, disable their inputs
                    setTimeout(() => {
                        disableQuantityAndDiscountForNewRows();
                        // Check if any products exist after new row added
                        checkAndUpdateGlobalInputs();
                    }, 100);
                }
            });
        });
        
        observer.observe(itemsTable, { childList: true, subtree: true });
    }
    
    console.log("✅ Input disable logic initialized");
}

function disableAllQuantityAndDiscountInputs() {
    // Disable all quantity inputs
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.disabled = true;
        input.style.backgroundColor = '#f5f5f5';
        input.style.cursor = 'not-allowed';
        input.placeholder = 'Select product first';
    });
    
    // Disable all discount inputs
    document.querySelectorAll('.discount-input').forEach(input => {
        input.disabled = true;
        input.style.backgroundColor = '#f5f5f5';
        input.style.cursor = 'not-allowed';
    });
}

function disableQuantityAndDiscountForNewRows() {
    document.querySelectorAll('#itemsTableBody tr').forEach(row => {
        const productSelect = row.querySelector('.product-select');
        const quantityInput = row.querySelector('.quantity-input');
        const discountInput = row.querySelector('.discount-input');
        
        // Only disable if no product is selected
        if (!productSelect || !productSelect.value) {
            if (quantityInput) {
                quantityInput.disabled = true;
                quantityInput.style.backgroundColor = '#f5f5f5';
                quantityInput.style.cursor = 'not-allowed';
                quantityInput.placeholder = 'Select product first';
            }
            if (discountInput) {
                discountInput.disabled = true;
                discountInput.style.backgroundColor = '#f5f5f5';
                discountInput.style.cursor = 'not-allowed';
            }
        }
    });
}

// ===================================================
// GLOBAL INPUTS CONTROL FUNCTIONS
// ===================================================
// ===================================================
// FIXED GLOBAL INPUTS CONTROL FUNCTIONS
// ===================================================
// ===================================================
// CHECK AND UPDATE GLOBAL INPUTS
// ===================================================

function checkAndUpdateGlobalInputs() {
    console.log("🔍 Checking if any product is selected...");
    
    const rows = document.querySelectorAll('#itemsTableBody tr');
    let anyProductSelected = false;
    
    rows.forEach(row => {
        const productSelect = row.querySelector('.product-select');
        if (productSelect && productSelect.value && productSelect.value !== '') {
            anyProductSelected = true;
        }
    });
    
    console.log(`Any product selected: ${anyProductSelected}`);
    
    const globalDiscount = document.getElementById('globalDiscount');
    const shippingCharge = document.getElementById('shippingCharge');
    
    if (anyProductSelected) {
        // Enable global inputs
        if (globalDiscount) {
            globalDiscount.disabled = false;
            globalDiscount.style.backgroundColor = '#fff5f5';
            globalDiscount.style.cursor = 'text';
            globalDiscount.removeAttribute('title');
            globalDiscount.style.opacity = '1';
            globalDiscount.readOnly = false;
        }
        if (shippingCharge) {
            shippingCharge.disabled = false;
            shippingCharge.style.backgroundColor = '#fff5f5';
            shippingCharge.style.cursor = 'text';
            shippingCharge.removeAttribute('title');
            shippingCharge.style.opacity = '1';
            shippingCharge.readOnly = false;
        }
    } else {
        // Disable global inputs
        if (globalDiscount) {
            globalDiscount.disabled = true;
            globalDiscount.style.backgroundColor = '#f5f5f5';
            globalDiscount.style.cursor = 'not-allowed';
            globalDiscount.setAttribute('title', 'Select a product first');
            globalDiscount.style.opacity = '0.5';
            globalDiscount.value = '0';
        }
        if (shippingCharge) {
            shippingCharge.disabled = true;
            shippingCharge.style.backgroundColor = '#f5f5f5';
            shippingCharge.style.cursor = 'not-allowed';
            shippingCharge.setAttribute('title', 'Select a product first');
            shippingCharge.style.opacity = '0.5';
            shippingCharge.value = '0';
        }
    }
}

// Alternative simpler version using Array.from and some()
function checkAndUpdateGlobalInputs_alternative() {
    console.log("🔍 Checking if any product is selected...");
    
    const rows = document.querySelectorAll('#itemsTableBody tr');
    const anyProductSelected = Array.from(rows).some(row => {
        const select = row.querySelector('.product-select');
        return select && select.value && select.value !== '';
    });
    
    console.log(`Any product selected: ${anyProductSelected}`);
    
    if (anyProductSelected) {
        enableGlobalInputs();
    } else {
        disableGlobalInputs();
    }
}

function enableGlobalInputs() {
    console.log("🌍 ENABLING global inputs");
    
    const globalDiscount = document.getElementById('globalDiscount');
    if (globalDiscount) {
        globalDiscount.disabled = false;
        globalDiscount.style.backgroundColor = '';
        globalDiscount.style.cursor = 'text';
        globalDiscount.removeAttribute('title');
        globalDiscount.style.opacity = '1';
        globalDiscount.readOnly = false;
        console.log("✅ Global discount enabled");
    } else {
        console.warn("⚠️ Global discount input not found");
    }
    
    const shippingCharge = document.getElementById('shippingCharge');
    if (shippingCharge) {
        shippingCharge.disabled = false;
        shippingCharge.style.backgroundColor = '';
        shippingCharge.style.cursor = 'text';
        shippingCharge.removeAttribute('title');
        shippingCharge.style.opacity = '1';
        shippingCharge.readOnly = false;
        console.log("✅ Shipping charge enabled");
    } else {
        console.warn("⚠️ Shipping charge input not found");
    }
}

function disableGlobalInputs() {
    console.log("🌍 DISABLING global inputs");
    
    const globalDiscount = document.getElementById('globalDiscount');
    if (globalDiscount) {
        globalDiscount.disabled = true;
        globalDiscount.style.backgroundColor = '#f5f5f5';
        globalDiscount.style.cursor = 'not-allowed';
        globalDiscount.setAttribute('title', 'Select a product first');
        globalDiscount.style.opacity = '0.5';
        globalDiscount.value = '0'; // Reset to 0 when disabled
        console.log("✅ Global discount disabled");
    }
    
    const shippingCharge = document.getElementById('shippingCharge');
    if (shippingCharge) {
        shippingCharge.disabled = true;
        shippingCharge.style.backgroundColor = '#f5f5f5';
        shippingCharge.style.cursor = 'not-allowed';
        shippingCharge.setAttribute('title', 'Select a product first');
        shippingCharge.style.opacity = '0.5';
        shippingCharge.value = '0'; // Reset to 0 when disabled
        console.log("✅ Shipping charge disabled");
    }
}

function disableInputsForRow(row) {
    const quantityInput = row.querySelector('.quantity-input');
    const discountInput = row.querySelector('.discount-input');
    
    if (quantityInput) {
        quantityInput.disabled = true;
        quantityInput.style.backgroundColor = '#f5f5f5';
        quantityInput.style.cursor = 'not-allowed';
        quantityInput.placeholder = 'Select product first';
        quantityInput.value = '';
    }
    
    if (discountInput) {
        discountInput.disabled = true;
        discountInput.style.backgroundColor = '#f5f5f5';
        discountInput.style.cursor = 'not-allowed';
        discountInput.value = 0;
    }
}

window.handleProductSelect = function(selectElement, rowId) {
    // STEP 1: Check if currency is selected
    const currencySelect = document.getElementById('currency');
    if (!currencySelect || !currencySelect.value) {
        showToast('❌ Please select a currency first before adding products', 'error');
        selectElement.value = '';
        currencySelect.style.borderColor = '#dc3545';
        currencySelect.style.borderWidth = '2px';
        currencySelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
            currencySelect.style.borderColor = '#ddd';
            currencySelect.style.borderWidth = '1px';
        }, 3000);
        return;
    }
    
    if (!isEditable()) return;
    
    // STEP 2: Get the row
    const row = document.getElementById(`row-${rowId}`);
    if (!row) return;
    
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    
    // Get input elements
    const quantityInput = row.querySelector('.quantity-input');
    const discountInput = row.querySelector('.discount-input');
    
    // STEP 3: If product is selected
    if (selectedOption.value) {
        try {
            // Parse product data from the option
            const productData = JSON.parse(selectedOption.dataset.product.replace(/&apos;/g, "'"));
            
            // Check if product is active
            if (productData.status && productData.status.toLowerCase() !== 'active') {
                showToast(`⚠️ This product is ${productData.status}`, 'error');
                selectElement.value = '';
                disableInputsForRow(row);
                return;
            }
            
            // Check if product already added
            const productId = productData.product_id || productData.id || '';
            if (isProductAlreadyAdded(productId, row.id)) {
                showToast(`❌ "${productData.product_name || productData.name}" is already added`, 'error');
                selectElement.value = '';
                disableInputsForRow(row);
                return;
            }
            
            // ============================================
            // STEP 4: GET PRODUCT PRICE IN IND (BASE CURRENCY)
            // ============================================
            const priceInIND = parseFloat(productData.unit_price || productData.price || 0);
            
            // ============================================
            // STEP 5: GET SELECTED CURRENCY AND EXCHANGE RATE
            // ============================================
            const selectedCurrency = currencySelect.value;
            const exchangeRate = exchangeRates[selectedCurrency] || 1.00;
            
            // ============================================
            // STEP 6: CONVERT PRICE TO DISPLAY CURRENCY
            // Formula: IND price × exchange rate = Display price
            // ============================================
            const convertedPrice = priceInIND * exchangeRate;
            
            // ============================================
            // STEP 7: STORE VALUES FOR LATER USE
            // ============================================
            row.dataset.priceIND = priceInIND;           // Store original IND price
            row.dataset.exchangeRate = exchangeRate;      // Store exchange rate used
            
            // ============================================
            // STEP 8: SET PRODUCT DETAILS IN THE ROW
            // ============================================
            // Set Unit of Measure
            row.querySelector('.uom-cell').textContent = productData.uom || '';
            
            // Calculate and set tax percentage
            let taxPercentage = 0;
            if (productData.tax_code) {
                taxPercentage = extractTaxPercentage(productData.tax_code);
            } else {
                taxPercentage = parseFloat(productData.tax) || 0;
            }
            row.querySelector('.tax-cell').textContent = taxPercentage;
            
            // Set product ID
            row.querySelector('.product-id-cell').textContent = productData.product_id || productData.id || '';
            
            // ============================================
            // STEP 9: SET UNIT PRICE (DISPLAY) WITH CURRENCY SYMBOL
            // ============================================
            const symbol = currencySymbols[selectedCurrency] || '₹';
            row.querySelector('.unit-price-cell').textContent = `${symbol} ${convertedPrice.toFixed(2)}`;
            
            // Set discount if available from product
            if (discountInput) {
                discountInput.value = productData.discount || 0;
            }
            
            // ===== ENABLE INPUTS FOR THIS ROW =====
            if (quantityInput) {
                quantityInput.disabled = false;
                quantityInput.readOnly = false;
                quantityInput.style.backgroundColor = '#fff5f5';
                quantityInput.style.cursor = 'text';
                quantityInput.placeholder = 'Enter qty';
                quantityInput.value = '';
                quantityInput.focus();
            }
            
            if (discountInput) {
                discountInput.disabled = false;
                discountInput.readOnly = false;
                discountInput.style.backgroundColor = '#fff5f5';
                discountInput.style.cursor = 'text';
            }
            
            // ===== ENABLE GLOBAL INPUTS =====
            checkAndUpdateGlobalInputs();
            
            // ============================================
            // STEP 11: RESET TOTAL DISPLAY WITH CURRENCY SYMBOL
            // ============================================
            row.querySelector('.row-total-cell').textContent = `${symbol} 0.00`;
            
            // Store product data
            row.dataset.product = JSON.stringify(productData);
            row.dataset.status = productData.status || 'active';
            
            // Update dropdowns to show "Already added"
            updateDropdowns();
            
            showToast(` ${productData.product_name || productData.name} selected. Price: ${symbol} ${convertedPrice.toFixed(2)}`, 'success');
            
            checkAndUpdateButtons();
            checkAndUpdateEditableButtons();
            
        } catch (e) {
            console.error('❌ Error parsing product data:', e);
            showToast('Error loading product data', 'error');
        }
    } else {
        // STEP 13: PRODUCT DESELECTED - clear and disable inputs
        clearRow(row);
        disableInputsForRow(row);
        checkAndUpdateGlobalInputs();
        updateDropdowns();
        calculateGrandTotal();
        checkAndUpdateButtons();
        checkAndUpdateEditableButtons();
    }
};
function disableInputsForRow(row) {
    const quantityInput = row.querySelector('.quantity-input');
    const discountInput = row.querySelector('.discount-input');
    
    if (quantityInput) {
        quantityInput.disabled = true;
        quantityInput.style.backgroundColor = '#f5f5f5';
        quantityInput.style.cursor = 'not-allowed';
        quantityInput.placeholder = 'Select product first';
        quantityInput.value = '';
    }
    
    if (discountInput) {
        discountInput.disabled = true;
        discountInput.style.backgroundColor = '#f5f5f5';
        discountInput.style.cursor = 'not-allowed';
        discountInput.value = 0;
    }
}

function enableGlobalInputs() {
    console.log("🌍 Enabling global inputs");
    
    const globalDiscount = document.getElementById('globalDiscount');
    if (globalDiscount) {
        globalDiscount.disabled = false;
        globalDiscount.style.backgroundColor = '';
        globalDiscount.style.cursor = 'text';
        globalDiscount.removeAttribute('title');
    }
    
    const shippingCharge = document.getElementById('shippingCharge');
    if (shippingCharge) {
        shippingCharge.disabled = false;
        shippingCharge.style.backgroundColor = '';
        shippingCharge.style.cursor = 'text';
        shippingCharge.removeAttribute('title');
    }
}

function disableGlobalInputs() {
    console.log("🌍 Disabling global inputs");
    
    const globalDiscount = document.getElementById('globalDiscount');
    if (globalDiscount) {
        globalDiscount.disabled = true;
        globalDiscount.style.backgroundColor = '#f5f5f5';
        globalDiscount.style.cursor = 'not-allowed';
        globalDiscount.setAttribute('title', 'Select a product first');
    }
    
    const shippingCharge = document.getElementById('shippingCharge');
    if (shippingCharge) {
        shippingCharge.disabled = true;
        shippingCharge.style.backgroundColor = '#f5f5f5';
        shippingCharge.style.cursor = 'not-allowed';
        shippingCharge.setAttribute('title', 'Select a product first');
    }
}
window.calculateRowTotal = function(rowId) {
    const row = document.getElementById(`row-${rowId}`);
    if (!row) return;

    const quantity = parseFloat(row.querySelector('.quantity-input')?.value) || 0;
    const priceIND = parseFloat(row.dataset.priceIND) || 0;   // ← use stored base price
    const taxPercent = parseFloat(row.querySelector('.tax-cell')?.textContent) || 0;
    const discountInput = row.querySelector('.discount-input');
    let discountPercent = parseFloat(discountInput?.value) || 0;

    // Apply same validation as global discount: 0–100%, toast if invalid
    if (discountInput) {
        if (discountPercent < 0) {
            discountPercent = 0;
            discountInput.value = 0;
            showToast('Item discount cannot be negative', 'warning');
        } else if (discountPercent > 100) {
            discountPercent = 100;
            discountInput.value = 100;
            showToast('Item discount limited to 100%', 'warning');
        }
    }

    const currentCurrency = document.getElementById('currency')?.value || 'IND';
    const symbol = currencySymbols[currentCurrency] || '₹';

    if (quantity <= 0 || priceIND <= 0) {
        // Reset values
        row.dataset.lineAmountIND = "0";
        row.dataset.taxAmountIND = "0";
        row.dataset.rowTotalIND = "0";
        row.querySelector('.row-total-cell').textContent = `${symbol} 0.00`;
        calculateGrandTotal();
        return;
    }

    // All calculations in IND (base currency)
    const lineTotalIND = quantity * priceIND;
    const discountAmountIND = lineTotalIND * (discountPercent / 100);
    const afterDiscountIND = lineTotalIND - discountAmountIND;
    const taxAmountIND = afterDiscountIND * (taxPercent / 100);
    const rowTotalIND = afterDiscountIND + taxAmountIND;

    // Store base values (as numbers)
    row.dataset.lineAmountIND = afterDiscountIND;
    row.dataset.taxAmountIND = taxAmountIND;
    row.dataset.rowTotalIND = rowTotalIND;

    // Display row total (converted to current currency)
    const displayAmount = convertFromIND(rowTotalIND, currentCurrency);
    row.querySelector('.row-total-cell').textContent = `${symbol} ${displayAmount.toFixed(2)}`;

    calculateGrandTotal();
};
// ===================================================
// MAIN GRAND TOTAL CALCULATION
function calculateGrandTotal() {
    let itemsSubtotalIND = 0;
    let totalTaxIND = 0;
    
    document.querySelectorAll('#itemsTableBody tr').forEach(row => {
        const rowTotalIND = parseFloat(row.dataset.rowTotalIND) || 0;
        const taxAmountIND = parseFloat(row.dataset.taxAmountIND) || 0;
        
        itemsSubtotalIND += rowTotalIND;
        totalTaxIND += taxAmountIND;
    });
    
    console.log(`💰 Calculated tax: ${totalTaxIND}`); // Debug log
    
    const currentCurrency = document.getElementById('currency').value || 'IND';
    
    // Validate global discount before using it
    let globalDiscountPercent = parseFloat(document.getElementById('globalDiscount')?.value) || 0;
    
    // Ensure discount is between 0 and 100
    if (globalDiscountPercent > 100) {
        globalDiscountPercent = 100;
        document.getElementById('globalDiscount').value = 100;
        showToast('Global discount limited to 100%', 'warning');
    } else if (globalDiscountPercent < 0) {
        globalDiscountPercent = 0;
        document.getElementById('globalDiscount').value = 0;
        showToast('Global discount cannot be negative', 'warning');
    }
    
    let shippingCharge = parseFloat(document.getElementById('shippingCharge')?.value) || 0;
    
    const shippingIND = convertToIND(shippingCharge, currentCurrency);
    const globalDiscountAmountIND = itemsSubtotalIND * (globalDiscountPercent / 100);
    const afterGlobalDiscountIND = itemsSubtotalIND - globalDiscountAmountIND;
    const beforeRoundingIND = afterGlobalDiscountIND + shippingIND;
    
    const { roundedAmount, adjustment } = calculateAutoRounding(beforeRoundingIND, currentCurrency);
    
    const roundingInput = document.getElementById('roundingAdjustment');
    if (roundingInput) {
        roundingInput.value = adjustment.toFixed(2);
    }
    
    const grandTotalIND = roundedAmount;
    
    updateTotalsDisplay(itemsSubtotalIND, totalTaxIND, globalDiscountAmountIND, 
                       shippingIND, adjustment, grandTotalIND, currentCurrency);
}
// ===================================================
// UPDATE TOTALS DISPLAY
// ===================================================
function updateTotalsDisplay(subtotalIND, taxIND, globalDiscountIND, shippingIND, roundingIND, grandTotalIND, currency) {
    const subtotal = convertFromIND(subtotalIND, currency);
    const tax = convertFromIND(taxIND, currency);
    const globalDiscount = convertFromIND(globalDiscountIND, currency);
    const shipping = convertFromIND(shippingIND, currency);
    const rounding = convertFromIND(roundingIND, currency);
    const grandTotal = convertFromIND(grandTotalIND, currency);
    
    const symbol = currencySymbols[currency] || '₹';
    
    const subtotalElement = document.getElementById('subtotalAmount');
    if (subtotalElement) subtotalElement.textContent = `${symbol} ${subtotal.toFixed(2)}`;
    
    const taxElement = document.getElementById('taxSummaryAmount');
    if (taxElement) {
        // Show tax with 2 decimal places instead of rounding
        taxElement.textContent = `${symbol} ${tax.toFixed(2)}`;
    }
    
    const grandTotalElement = document.getElementById('grandTotalAmount');
    if (grandTotalElement) grandTotalElement.textContent = `${symbol} ${Math.round(grandTotal)}`;
}
// ===================================================
// HANDLE ITEM CHANGE - WITH QUANTITY VALIDATION
// ===================================================

window.handleItemChange = function(rowId) {
    const row = document.getElementById(`row-${rowId}`);
    if (!row) return;
    
    const quantityInput = row.querySelector('.quantity-input');
    const quantity = parseFloat(quantityInput.value) || 0;
    const productSelect = row.querySelector('.product-select');
    
    if (productSelect && productSelect.value) {
        const selectedOption = productSelect.options[productSelect.selectedIndex];
        if (selectedOption && selectedOption.dataset.product) {
            try {
                const productData = JSON.parse(selectedOption.dataset.product.replace(/&apos;/g, "'"));
                
                const availableQuantity = parseFloat(productData.available_quantity) || 
                                         parseFloat(productData.stock) || 
                                         parseFloat(productData.quantity) || 
                                         Infinity;
                
                if (availableQuantity !== Infinity && quantity > availableQuantity) {
                    showToast(`❌ Only ${availableQuantity} units available for ${productData.product_name || productData.name}`, 'error');
                    quantityInput.value = availableQuantity;
                    quantityInput.style.borderColor = '#dc3545';
                    quantityInput.style.borderWidth = '2px';
                    
                    setTimeout(() => {
                        quantityInput.style.borderColor = '#ddd';
                        quantityInput.style.borderWidth = '1px';
                    }, 3000);
                    
                    calculateRowTotal(rowId);
                } else {
                    quantityInput.style.borderColor = '#ddd';
                    quantityInput.style.borderWidth = '1px';
                    calculateRowTotal(rowId);
                }
            } catch (e) {
                console.error('Error parsing product data:', e);
                calculateRowTotal(rowId);
            }
        } else {
            calculateRowTotal(rowId);
        }
    } else {
        calculateRowTotal(rowId);
    }
    
    checkAndUpdateButtons();
    checkAndUpdateEditableButtons();
};

// ===================================================
// REMOVE ROW
// ===================================================

// ===================================================
// MODIFIED REMOVE ROW FUNCTION
// (actual deletion logic, used after confirmation modal)
// ===================================================

window.removeRow = function(rowId) {
    if (!isEditable()) {
        showToast('Cannot remove items when quotation is approved', 'error');
        return;
    }
    
    const row = document.getElementById(`row-${rowId}`);
    if (row) {
        const select = row.querySelector('.product-select');
        const productName = select && select.value ? 
            select.options[select.selectedIndex]?.text.split(' (')[0] : 'Product';
        
        row.remove();
        renumberRows();
        calculateGrandTotal();
        updateDropdowns();
        
        // ===== CHECK IF ANY PRODUCTS REMAIN AFTER REMOVAL =====
        checkAndUpdateGlobalInputs();
        
        showToast(` ${productName} removed`, 'success');
        checkAndUpdateButtons();
        checkAndUpdateEditableButtons();
    }
};

// ===================================================
// DELETE ITEM CONFIRMATION MODAL (QUOTATION ITEMS)
// ===================================================

let pendingDeleteRowId = null;

window.openDeleteItemModal = function(rowId) {
    // Respect editability rules
    if (!isEditable()) {
        showToast('Cannot remove items when quotation is approved', 'error');
        return;
    }

    const row = document.getElementById(`row-${rowId}`);
    if (!row) return;

    const productIdCell = row.querySelector('.product-id-cell');
    const productId = (productIdCell?.textContent || '').trim() || 'this item';

    pendingDeleteRowId = rowId;

    const modal = document.getElementById('deleteItemModal');
    const textEl = document.getElementById('deleteItemText');
    if (!modal || !textEl) return;

    textEl.textContent = `Are you sure want to delete "${productId}"?`;
    modal.style.display = 'flex';
};

function closeDeleteItemModal() {
    const modal = document.getElementById('deleteItemModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

const deleteItemCancelBtn = document.getElementById('deleteItemCancelBtn');
const deleteItemConfirmBtn = document.getElementById('deleteItemConfirmBtn');

if (deleteItemCancelBtn) {
    deleteItemCancelBtn.addEventListener('click', () => {
        pendingDeleteRowId = null;
        closeDeleteItemModal();
    });
}

if (deleteItemConfirmBtn) {
    deleteItemConfirmBtn.addEventListener('click', () => {
        if (pendingDeleteRowId !== null) {
            window.removeRow(pendingDeleteRowId);
        }
        pendingDeleteRowId = null;
        closeDeleteItemModal();
    });
}

// ===================================================
// RENUMBER ROWS
// ===================================================

function renumberRows() {
    const rows = document.querySelectorAll('#itemsTableBody tr');
    rows.forEach((row, index) => {
        row.id = `row-${index + 1}`;
        const snoCell = row.querySelector('.sno-cell');
        if (snoCell) snoCell.textContent = index + 1;
    });
    rowCount = rows.length;
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
    
    console.log(`✅ Found ${tabs.length} tabs`);
    
    tabContents.forEach(content => {
        content.style.display = "none";
    });
    
    const defaultTab = document.querySelector('.tab[data-tab="comments"]');
    if (defaultTab) {
        defaultTab.classList.add('active');
        const commentsTab = document.getElementById('comments');
        if (commentsTab) {
            commentsTab.style.display = 'block';
            console.log("✅ Showing comments tab by default");
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
                    const quotationId = document.getElementById("quotationNumber")?.value;
                    if (quotationId) {
                        console.log("🔄 Refreshing attachments display");
                        loadAttachmentsForQuotation(quotationId);
                    }
                }
                
                if (selectedTab === 'history') {
                    const quotationId = document.getElementById("quotationNumber")?.value;
                    if (quotationId) {
                        console.log("🔄 Refreshing comments display");
                        loadCommentsForQuotation(quotationId);
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

function initializeComments() {
    const addBtn = document.getElementById("addCommentBtn");
    const commentInput = document.getElementById("commentText");
    const historyContainer = document.getElementById("history");
    
    if (!addBtn || !commentInput || !historyContainer) return;

    // Enable the "Add New" button only when the comment box is
    // editable and has some text typed in it.
    function updateAddCommentButtonState() {
        const hasText = commentInput.value.trim().length > 0;
        const isEditable = !commentInput.disabled && !commentInput.readOnly;

        if (isEditable && hasText) {
            addBtn.disabled = false;
            addBtn.style.opacity = "";
            addBtn.style.cursor = "pointer";
            addBtn.style.pointerEvents = "";
            addBtn.removeAttribute("title");
        } else {
            addBtn.disabled = true;
            addBtn.style.opacity = "0.5";
            addBtn.style.cursor = "not-allowed";
            addBtn.style.pointerEvents = "none";
        }
    }

    // Initial state on load
    updateAddCommentButtonState();

    // Re-evaluate whenever the user types in the comment box
    commentInput.addEventListener("input", updateAddCommentButtonState);

    addBtn.addEventListener("click", function(e) {
    e.preventDefault();
    
    const commentText = commentInput.value.trim();
    if (commentText === "") {
        showToast("Please enter a comment", 'warning');
        return;
    }

    const quotationId = document.getElementById("quotationNumber").value;
    if (!quotationId) {
        showToast("Quotation ID not found", 'error');
        return;
    }
    
    const scrollPos = historyContainer.scrollTop;
    
    addBtn.disabled = true;
    addBtn.textContent = "Adding...";

    fetch("/add-comment", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            quotation_id: quotationId,
            comment: commentText,
            user: "Admin"
        })
    })
    .then(res => res.json())
    .then(data => {
        console.log("Comment saved:", data);
        commentInput.value = "";
        // Reset to first page and reload
        currentCommentPage = 1;
        return loadCommentsForQuotation(quotationId, 1);
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
        addBtn.disabled = false;
        addBtn.textContent = "Add New";
    });
});
}

function loadCommentsForQuotation(quotationId, page = 1) {
    if (!quotationId) {
        console.error("❌ No quotation ID provided for loading comments");
        return Promise.reject('Missing quotation ID');
    }
    
    console.log(`💬 Fetching comments for: ${quotationId}, page ${page}`);
    
    const historyContainer = document.getElementById('history');
    if (!historyContainer) {
        console.error("❌ historyContainer element not found");
        return Promise.reject('History container not found');
    }
    
    // Show loader only for first page
    if (page === 1) {
        historyContainer.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading comments...</div>';
    }
    
    return fetch(`/get-comments/${quotationId}?page=${page}&per_page=${COMMENTS_PER_PAGE}`)
        .then(res => res.json())
        .then(data => {
            // Remove loader for first page
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
            
            totalComments = data.total;
            hasMoreComments = data.has_more;
            currentCommentPage = data.page;
            
            data.comments.forEach(item => {
                const div = document.createElement("div");
                div.classList.add("history-item");
                div.innerHTML = `
                    <span class="user">${escapeHtml(item.user || 'System')}</span>
                    <span class="time">– ${escapeHtml(item.time)}</span>
                    <p>${escapeHtml(item.comment)}</p>
                `;
                historyContainer.appendChild(div);
            });
            
            // Add "Load More" button if needed
            if (hasMoreComments) {
                // Remove any existing load more button first
                const oldBtn = document.getElementById('loadMoreCommentsBtn');
                if (oldBtn) oldBtn.remove();
                
                const loadMoreBtn = document.createElement('button');
                loadMoreBtn.id = 'loadMoreCommentsBtn';
                loadMoreBtn.className = 'btn btn-link';
                loadMoreBtn.innerHTML = 'Load More Comments...';
                loadMoreBtn.onclick = () => {
                    loadMoreBtn.disabled = true;
                    loadMoreBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
                    loadCommentsForQuotation(quotationId, currentCommentPage + 1).finally(() => {
                        // Button will be recreated if more pages exist
                    });
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
// ATTACHMENTS FUNCTIONALITY
// ===================================================

function initializeAttachments() {
    console.log("%c📎 ATTACHMENTS: Initializing...", "color: blue; font-weight: bold");
    
    const fileInput = document.getElementById('fileInput');
    const uploadCard = document.getElementById('uploadCard');
    const uploadBtn = document.getElementById('uploadBtn');
    const filesList = document.getElementById('filesList');
    const fileCount = document.getElementById('fileCount');
    
    if (!fileInput || !uploadCard || !uploadBtn || !filesList) {
        console.error("%c❌ ATTACHMENTS: Missing required elements!", "color: red; font-weight: bold");
        return;
    }
    
    console.log("%c✅ ATTACHMENTS: All elements found", "color: green; font-weight: bold");
    
    window.attachments = [];
    
    tryLoadAttachments();
    window.addEventListener('popstate', tryLoadAttachments);
    
    function tryLoadAttachments() {
        const quotationId = document.getElementById('quotationNumber')?.value;
        if (quotationId) {
            console.log(`📎 Loading attachments for ID: ${quotationId}`);
            loadAttachmentsForQuotation(quotationId);
        } else {
            console.log("⚠️ No quotation ID yet, will retry in 1 second...");
            setTimeout(tryLoadAttachments, 1000);
        }
    }
    
    // Helper to check if max files reached
    function isMaxFilesReached() {
        const currentCount = window.currentQuotationAttachments ? window.currentQuotationAttachments.length : 0;
        return currentCount >= MAX_ATTACHMENTS;
    }
    
    uploadCard.addEventListener('click', (e) => {
        e.preventDefault();
        if (isMaxFilesReached()) {
            showToast(`Maximum ${MAX_ATTACHMENTS} files allowed`, 'warning');
            return;
        }
        console.log("📎 Upload card clicked");
        fileInput.click();
    });
    
    uploadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isMaxFilesReached()) {
            showToast(`Maximum ${MAX_ATTACHMENTS} files allowed`, 'warning');
            return;
        }
        console.log("📎 Upload button clicked");
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        console.log("📎 File selected:", e.target.files.length, "files");
        const files = Array.from(e.target.files);
        
        const currentCount = window.currentQuotationAttachments ? window.currentQuotationAttachments.length : 0;
        if (currentCount + files.length > MAX_ATTACHMENTS) {
            showToast(`Cannot upload ${files.length} file(s). Maximum ${MAX_ATTACHMENTS} files allowed. You have ${currentCount} file(s).`, 'warning');
            fileInput.value = '';
            return;
        }
        
        if (files.length > 0) {
            uploadFiles(files);
        }
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
        
        const files = Array.from(e.dataTransfer.files);
        const currentCount = window.currentQuotationAttachments ? window.currentQuotationAttachments.length : 0;
        if (currentCount + files.length > MAX_ATTACHMENTS) {
            showToast(`Cannot upload ${files.length} file(s). Maximum ${MAX_ATTACHMENTS} files allowed.`, 'warning');
            return;
        }
        
        console.log("📎 Files dropped:", files.length);
        if (files.length > 0) {
            uploadFiles(files);
        }
    });
    
    async function uploadFiles(fileList) {
        for (const file of fileList) {
            // Size validation before upload
            if (file.size > MAX_FILE_SIZE_BYTES) {
                showToast(`File ${file.name} exceeds ${MAX_FILE_SIZE_MB} MB limit`, 'error');
                continue;
            }
            await uploadFile(file);
        }
        const id = document.getElementById('quotationNumber')?.value;
        if (id) {
            loadAttachmentsForQuotation(id);
        }
    }
    
    async function uploadFile(file) {
        if (!validateFile(file)) return;
        
        const id = document.getElementById('quotationNumber')?.value;
        if (!id) {
            showToast("Quotation ID not found. Please save the quotation first.", 'warning');
            return;
        }
        
        showUploading(file.name);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('quotation_id', id);
        
        try {
            const response = await fetch('/upload-attachment', { 
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
        // File size already checked in uploadFiles, but keep as backup
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
        
        filesList.insertBefore(uploading, filesList.firstChild);
    }
    
    function removeUploading() {
        const uploading = document.querySelector('.file-item.uploading');
        if (uploading) uploading.remove();
    }
}

function loadAttachmentsForQuotation(quotationId) {
    if (!quotationId) {
        console.error("❌ No quotation ID provided for loading attachments");
        return;
    }
    
    console.log(`📎 Fetching attachments for: ${quotationId}`);
    
    const filesList = document.getElementById('filesList');
    if (filesList) {
        filesList.innerHTML = '<div class="loading-files"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading attachments...</p></div>';
    }
    
    fetch(`/get-attachments/${quotationId}`)
        .then(response => response.json())
        .then(data => {
            console.log("📎 Attachments response:", data);
            
            if (data.success) {
                const files = data.attachments || [];
                console.log(`✅ Loaded ${files.length} attachments`);
                window.currentQuotationAttachments = files;
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
    
    // Store current attachments globally for limit checking
    window.currentQuotationAttachments = files;
    
    const currentCount = files.length;
    const isFull = currentCount >= MAX_ATTACHMENTS;
    
    // Update file count display with limit
    if (fileCount) {
        fileCount.textContent = `${currentCount} / ${MAX_ATTACHMENTS} files`;
    }
    
    // Update upload button/card disabled state
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
        const ext = file.original_filename ? file.original_filename.split('.').pop().toLowerCase() : '';
        const icon = getFileIcon(ext);
        const iconClass = getFileIconClass(ext);
        const size = formatFileSize(file.size || 0);
        const uploadDate = file.upload_date || 'Unknown date';
        
     html += `
    <div class="file-item" data-id="${file.id}">
        <div class="file-info">
            <div class="file-icon ${iconClass}"><i class="fa-solid ${icon}"></i></div>
            <div class="file-details">
                <div class="file-name">${escapeHtml(file.original_filename || 'Unknown file')}</div>
                <div class="file-meta">
                    <span><i class="fa-regular fa-file"></i> ${size}</span>
                    <span><i class="fa-regular fa-calendar"></i> ${uploadDate}</span>
                </div>
            </div>
        </div>
        <div class="file-actions">
            <button class="btn-action btn-view" onclick="viewAttachment('${file.id}')" title="View"><i class="fa-regular fa-eye"></i></button>
            <button class="btn-action btn-download" onclick="downloadAttachment('${file.id}')" title="Download"><i class="fa-solid fa-cloud-arrow-down"></i></button>
            <button class="btn-action btn-delete" onclick="openDeleteFileModal('${file.id}')" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
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

window.viewAttachment = function(id) { 
    window.open(`/view-attachment/${id}`, '_blank'); 
};

window.downloadAttachment = function(id) { 
    window.location.href = `/download-attachment/${id}`; 
};

window.deleteAttachment = async function(id) {
    try {
        const response = await fetch(`/delete-attachment/${id}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            const fileItem = document.querySelector(`.file-item[data-id="${id}"]`);
            if (fileItem) fileItem.remove();
            
            const fileCount = document.getElementById('fileCount');
            if (fileCount) {
                const currentCount = parseInt(fileCount.textContent) || 0;
                fileCount.textContent = Math.max(0, currentCount - 1) + ' files';
            }
            
            const quotationId = document.getElementById('quotationNumber')?.value;
            if (quotationId) {
                loadAttachmentsForQuotation(quotationId);
            }
            
            showToast(' File deleted successfully', 'success');
        } else {
            showToast('Delete failed: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error deleting attachment:', error);
        showToast('Delete failed. Please try again.', 'error');
    }
};

// ===================================================
// DELETE FILE CONFIRMATION MODAL (ATTACHMENTS)
// ===================================================

let pendingDeleteAttachmentId = null;

window.openDeleteFileModal = function(id) {
    pendingDeleteAttachmentId = id;
    const modal = document.getElementById('deleteFileModal');
    if (!modal) return;
    modal.style.display = 'flex';
};

function closeDeleteFileModal() {
    const modal = document.getElementById('deleteFileModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

const deleteFileCancelBtn = document.getElementById('deleteFileCancelBtn');
const deleteFileConfirmBtn = document.getElementById('deleteFileConfirmBtn');

if (deleteFileCancelBtn) {
    deleteFileCancelBtn.addEventListener('click', () => {
        pendingDeleteAttachmentId = null;
        closeDeleteFileModal();
    });
}

if (deleteFileConfirmBtn) {
    deleteFileConfirmBtn.addEventListener('click', async () => {
        if (pendingDeleteAttachmentId) {
            await window.deleteAttachment(pendingDeleteAttachmentId);
        }
        pendingDeleteAttachmentId = null;
        closeDeleteFileModal();
    });
}

// ===================================================
// OTP VERIFICATION MODAL
// ===================================================

function showOTPModal(email, quotationId) {
    currentEmail = email;
    currentQuotationId = quotationId;
    
    const modal = document.getElementById('otpModal');
    if (!modal) {
        console.error("OTP Modal element not found!");
        return;
    }
    
    const emailDisplay = document.getElementById('otpEmailDisplay');
    if (emailDisplay) emailDisplay.innerHTML = `Enter the 6-digit OTP sent to <strong>${email}</strong>`;
    
    document.querySelectorAll('.otp-digit').forEach(input => {
        input.value = '';
        input.disabled = false;
    });
    
    const firstInput = document.querySelector('.otp-digit');
    if (firstInput) firstInput.focus();
    
    const otpError = document.getElementById('otpError');
    if (otpError) otpError.style.display = 'none';
    
    const verifyBtn = document.getElementById('verifyOtpBtn');
    if (verifyBtn) verifyBtn.disabled = false;
    
    const resendBtn = document.getElementById('resendOtpBtn');
    if (resendBtn) {
        resendBtn.disabled = false;
        resendBtn.innerHTML = 'Resend OTP';
    }
    
    startOTPTimer(1 * 60);
    modal.style.display = 'block';
}

function closeOTPModal() {
    const modal = document.getElementById('otpModal');
    if (modal) modal.style.display = 'none';
    if (otpTimer) clearInterval(otpTimer);
}

function setupOTPInputs() {
    const inputs = document.querySelectorAll('.otp-digit');
    if (inputs.length === 0) return;
    
    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            if (e.target.value && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
            if (index === inputs.length - 1 && e.target.value) {
                setTimeout(() => verifyOTP(), 500);
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
        
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
            if (pasteData.length === 6) {
                inputs.forEach((inp, i) => inp.value = pasteData[i] || '');
                inputs[5].focus();
                setTimeout(() => verifyOTP(), 500);
            }
        });
    });
}

function setupOTPModalHandlers() {
    const closeBtn = document.querySelector('.close-otp-modal');
    if (closeBtn) closeBtn.addEventListener('click', closeOTPModal);
    
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('otpModal')) closeOTPModal();
    });
    
    const verifyBtn = document.getElementById('verifyOtpBtn');
    if (verifyBtn) verifyBtn.addEventListener('click', verifyOTP);
    
    const resendBtn = document.getElementById('resendOtpBtn');
    if (resendBtn) resendBtn.addEventListener('click', resendOTP);
    
    document.querySelectorAll('.otp-digit').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verifyOTP();
        });
    });
}

function getOTPFromInputs() {
    let otp = '';
    document.querySelectorAll('.otp-digit').forEach(input => otp += input.value);
    return otp;
}

function verifyOTP() {
    const otp = getOTPFromInputs();
    
    if (otp.length !== 6) {
        showOTPError('Please enter all 6 digits');
        return;
    }
    
    document.querySelectorAll('.otp-digit').forEach(input => input.disabled = true);
    const verifyBtn = document.getElementById('verifyOtpBtn');
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<span class="otp-spinner"></span> Verifying...';
    }
    
    fetch('/api/otp/verify', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            email: currentEmail,
            otp: otp,
            quotation_id: currentQuotationId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showOTPSuccess();
            setTimeout(() => {
                closeOTPModal();
                showToast(`✅ Quotation sent successfully to ${currentEmail}!`, 'success');
            }, 2000);
        } else {
            showOTPError(data.error || 'Invalid OTP. Please try again.');
            
            document.querySelectorAll('.otp-digit').forEach(input => {
                input.disabled = false;
                input.value = '';
            });
            document.querySelector('.otp-digit')?.focus();
            if (verifyBtn) {
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = 'Verify & Send';
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showOTPError('Network error. Please check your connection and try again.');
        
        document.querySelectorAll('.otp-digit').forEach(input => {
            input.disabled = false;
            input.value = '';
        });
        document.querySelector('.otp-digit')?.focus();
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = 'Verify & Send';
        }
    });
}

function showOTPError(message) {
    const errorDiv = document.getElementById('otpError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function showOTPSuccess() {
    const body = document.querySelector('.otp-modal-body');
    if (body) {
        body.innerHTML = `
            <div class="otp-success">
                <i class="fa-solid fa-check-circle" style="font-size: 60px; color: #4caf50; margin-bottom: 15px;"></i>
                <h3 style="color: #333; margin-bottom: 10px;">Verified Successfully!</h3>
                <p style="color: #666;">Sending quotation to ${currentEmail}...</p>
            </div>
        `;
    }
}

function startOTPTimer(duration) {
    const timerDisplay = document.getElementById('otpTimer');
    if (!timerDisplay) return;
    
    let timeLeft = duration;
    if (otpTimer) clearInterval(otpTimer);
    
    otpTimer = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        if (timeLeft <= 0) {
            clearInterval(otpTimer);
            handleOTPExpiry();
        }
        timeLeft--;
    }, 1000);
}

function handleOTPExpiry() {
    const timerDisplay = document.getElementById('otpTimer');
    if (timerDisplay) timerDisplay.innerHTML = '00:00';
    document.querySelectorAll('.otp-digit').forEach(input => input.disabled = true);
    
    const verifyBtn = document.getElementById('verifyOtpBtn');
    if (verifyBtn) verifyBtn.disabled = true;
    
    showOTPError('OTP expired. Please request a new one.');
    
    const resendBtn = document.getElementById('resendOtpBtn');
    if (resendBtn) resendBtn.disabled = false;
}

function resendOTP() {
    const resendBtn = document.getElementById('resendOtpBtn');
    if (!resendBtn) return;
    
    resendBtn.disabled = true;
    resendBtn.innerHTML = '<span class="otp-spinner"></span> Sending...';
    
    fetch('/api/otp/resend', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            email: currentEmail,
            quotation_id: currentQuotationId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.querySelectorAll('.otp-digit').forEach(input => {
                input.disabled = false;
                input.value = '';
            });
            document.querySelector('.otp-digit')?.focus();
            
            const verifyBtn = document.getElementById('verifyOtpBtn');
            if (verifyBtn) verifyBtn.disabled = false;
            
            const errorDiv = document.getElementById('otpError');
            if (errorDiv) errorDiv.style.display = 'none';
            
            startOTPTimer(5 * 60);
            showToast('✅ New OTP sent to your email', 'success');
        } else {
            showToast('❌ Failed to resend OTP: ' + (data.error || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('❌ Error resending OTP. Please try again.', 'error');
    })
    .finally(() => {
        resendBtn.disabled = false;
        resendBtn.innerHTML = 'Resend OTP';
    });
}

// ===================================================
// EMAIL HANDLERS - WITH PROFESSIONAL ERP RULES
// ===================================================

async function sendOTP(email, quotationId) {
    // Check if email is allowed for current status
    if (!isEmailEnabled()) {
        showToast(`Email not allowed for ${currentQuotationStatus} status`, 'warning');
        return;
    }
    
    setButtonLoading(true, 'Sending OTP...');
    
    try {
        console.log("📤 Sending OTP request for:", email, quotationId);
        
        const response = await fetch("/api/otp/send", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ 
                email: email, 
                quotation_id: quotationId 
            })
        });
        
        const data = await response.json();
        console.log("📥 OTP send response:", data);
        
        if (data.success) {
            setButtonLoading(false);
            showOTPModal(email, quotationId);
        } else {
            let errorMsg = data.error || "Unknown error";
            if (response.status === 429) {
                errorMsg = "Too many attempts. Please try again later.";
            }
            showToast("❌ Failed to send OTP: " + errorMsg, 'error');
            setButtonLoading(false);
        }
    } catch (error) {
        console.error("❌ Error in sendOTP:", error);
        showToast("❌ Network error. Please check your connection.", 'error');
        setButtonLoading(false);
    }
}

async function requestApproval(quotationId, recipientEmail) {
    setButtonLoading(true, 'Requesting approval...');
    
    const reason = prompt("Please provide a reason for sending another email:");
    if (!reason) {
        setButtonLoading(false);
        return;
    }
    
    try {
        const response = await fetch('/api/request-approval', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                quotation_id: quotationId,
                recipient: recipientEmail,
                reason: reason
            })
        });
        
        const data = await response.json();
        if (data.success) {
            showToast('✅ Approval request sent to manager. You will be notified when approved.', 'success');
        } else {
            showToast('❌ Failed to request approval: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error("Error:", error);
        showToast("Error requesting approval", 'error');
    } finally {
        setButtonLoading(false);
    }
}

async function promptForEmailWithModal(quotationId) {
    // First check if email is allowed for current status
    if (!isEmailEnabled()) {
        showToast(`Email cannot be sent for ${currentQuotationStatus} status`, 'warning');
        return;
    }

    const modal = document.getElementById("emailModal");
    const input = document.getElementById("emailInputModal");
    const okBtn = document.getElementById("emailOkBtn");
    if (!modal || !input || !okBtn) return;

    // Make sure field is editable and reset
    input.disabled = false;
    input.readOnly = false;
    input.value = "";
    okBtn.disabled = true;
    modal.style.display = "flex";
    setTimeout(() => input.focus(), 0);

    const onInput = () => {
        const value = input.value.trim();
        okBtn.disabled = !validateEmail(value);
    };

    const onOk = async () => {
        const email = input.value.trim();
        if (!validateEmail(email)) {
            showToast("Please enter a valid email address", 'warning');
            return;
        }

        modal.style.display = "none";
        input.removeEventListener("input", onInput);
        okBtn.removeEventListener("click", onOk);

        // Directly trigger server-side email send (limits + email send handled there)
        setButtonLoading(true, 'Sending quotation email...');
        try {
            const response = await fetch('/api/send-quotation-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quotation_id: quotationId,
                    email: email
                })
            });
            const data = await response.json();
            if (data.success) {
                showToast('Quotation sent successfully', 'success');
            } else {
                showToast(data.error || 'Failed to send quotation email', 'error');
            }
        } catch (error) {
            console.error("Error sending quotation email:", error);
            showToast("Error sending quotation email", 'error');
        } finally {
            setButtonLoading(false);
        }
    };

    const onCancel = () => {
        modal.style.display = "none";
        input.removeEventListener("input", onInput);
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
    };

    input.addEventListener("input", onInput);
    okBtn.addEventListener("click", onOk);
    const cancelBtn = document.getElementById("emailCancelBtn");
    cancelBtn?.addEventListener("click", onCancel);
}

// ===================================================
// ACTION BUTTONS - WITH PROFESSIONAL ERP RULES
// ===================================================

function initializeActionButtons() {
    console.log("Initializing action buttons...");
    
    document.querySelector(".footer-item.pdf")?.addEventListener("click", function() {
        const quotationId = document.getElementById("quotationNumber")?.value;
        if (!quotationId) {
            showToast("No quotation ID found", 'error');
            return;
        }
        
        // Check if PDF is allowed for current status
        if (!isPdfEnabled()) {
            showToast(`PDF download not available for ${currentQuotationStatus} status`, 'warning');
            return;
        }
        
        fetch(`/check-quotation/${quotationId}`)
            .then(response => response.json())
            .then(data => {
                if (data.exists) {
                    window.open(`/generate-pdf/${quotationId}`, '_blank');
                } else {
                    if (confirm('This quotation needs to be saved first. Save now?')) {
                        if (!validateRequiredFields()) return;
                        saveAndGeneratePDF(quotationId);
                    }
                }
            })
            .catch(error => {
                console.error("Error:", error);
                showToast("Error checking quotation", 'error');
            });
    });
    
    const emailBtn = document.querySelector(".footer-item.email");
    if (emailBtn) {
        console.log("✅ Email button found, attaching click handler");
        emailBtn.addEventListener("click", function(e) {
            e.preventDefault();
            console.log("📧 Email button clicked");
            
            const quotationId = document.getElementById("quotationNumber")?.value;
            if (!quotationId) {
                showToast("No quotation ID found", 'error');
                return;
            }
            
            // Check if email is allowed for current status
            if (!isEmailEnabled()) {
                showToast(`Email cannot be sent for ${currentQuotationStatus} status`, 'warning');
                return;
            }
            
            fetch(`/check-quotation/${quotationId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        if (data.exists) {
                            promptForEmailWithModal(quotationId);
                        } else {
                            if (confirm('This quotation needs to be saved first. Save now?')) {
                                if (!validateRequiredFields()) return;
                                saveAndPromptForEmailWithModal(quotationId);
                            }
                        }
                    } else {
                        showToast('Error checking quotation: ' + (data.error || 'Unknown error'), 'error');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showToast('Error checking quotation status', 'error');
                });
        });
    } else {
        console.error("❌ Email button not found!");
    }
    
}

// ===================================================
// SUBMIT FUNCTIONS - WITH AUTO REDIRECT
// ===================================================

function initializeButtons() {
    document.getElementById("cancelBtn")?.addEventListener("click", function() {
        // if (confirm("Are you sure you want to cancel? All unsaved data will be lost.")) {
            window.location.href = "/quotation";
        // }
    });
    
    document.querySelector(".btn-draft")?.addEventListener("click", function(e) {
        e.preventDefault();
        const quotationId = document.getElementById("quotationNumber")?.value;
        if (!quotationId) {
            showToast("Quotation ID is required", 'error');
            return;
        }
        
        if (!checkDraftRequirements()) {
            showToast('Please fill all required fields before saving as draft', 'warning');
            return;
        }
        
        if (confirm('Save this quotation as DRAFT?')) {
            submitQuotationWithStatusAndRedirect('draft', true);
        }
    });
    
    document.getElementById("submitBtn")?.addEventListener("click", function(e) {
        e.preventDefault();
        
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');
        
        if (editId && currentQuotationStatus === 'draft') {
            console.log("✅ Edit mode with Draft status - allowing submit");
        }
        else if (editId && currentQuotationStatus === 'rejected') {
            console.log("✅ Edit mode with Rejected status - allowing resubmit");
        }
        else if (editId && currentQuotationStatus === 'expired') {
            console.log("✅ Edit mode with Expired status - allowing resubmit");
        }

        
        else if (editId) {
            showToast("This quotation cannot be submitted. Please use 'Save as Draft' to update.", 'warning');
            return;
        }
        
        let targetStatus = "send";
        
        if ((currentQuotationStatus === 'send' || currentQuotationStatus === 'submitted') && hasUnsavedChanges) {
            targetStatus = "send";
        }
        
        if (currentQuotationStatus === 'rejected' || currentQuotationStatus === 'expired') {
            targetStatus = "send";
        }
        
        if (!validateRequiredFields()) return;

        // Directly submit without browser confirmation dialog.
        submitQuotationWithStatusAndRedirect(targetStatus, true);
    });
    
    document.querySelector(".footer-item.approve")?.addEventListener("click", function() {
        if (confirm('Are you sure you want to APPROVE this quotation? This action cannot be undone.')) {
            submitQuotationWithStatusAndRedirect("approved", true);
        }
    });
    
    document.querySelector(".footer-item.reject")?.addEventListener("click", function() {
        const modal = document.getElementById("rejectModal");
        const input = document.getElementById("rejectReasonInput");
        const okBtn = document.getElementById("rejectOkBtn");
        if (!modal || !input || !okBtn) return;
        input.value = "";
        okBtn.disabled = true;
        modal.style.display = "flex";
        input.focus();
    });
}

// Reject modal buttons
document.getElementById("rejectCancelBtn")?.addEventListener("click", () => {
    const modal = document.getElementById("rejectModal");
    if (modal) modal.style.display = "none";
});

const rejectReasonInputEl = document.getElementById("rejectReasonInput");
const rejectOkBtnEl = document.getElementById("rejectOkBtn");

if (rejectReasonInputEl && rejectOkBtnEl) {
    rejectOkBtnEl.disabled = true;
    rejectReasonInputEl.addEventListener("input", () => {
        // Allow only alphabets and & , . plus spaces
        rejectReasonInputEl.value = rejectReasonInputEl.value.replace(/[^A-Za-z&,. ]/g, "");
        const text = rejectReasonInputEl.value.trim();
        rejectOkBtnEl.disabled = text.length < 3;
    });

    rejectOkBtnEl.addEventListener("click", () => {
        const modal = document.getElementById("rejectModal");
        const reason = rejectReasonInputEl.value.trim();
        if (!modal) return;
        if (reason.length < 3) {
            showToast('Rejection reason must be at least 3 characters', 'warning');
            return;
        }
        window.rejectionReason = reason;
        modal.style.display = "none";
        submitQuotationWithStatusAndRedirect("rejected", true);
    });
}

// ===================================================
// VALIDATE REQUIRED FIELDS FOR SUBMIT
// ===================================================

function validateRequiredFields() {
    console.log("🔍 Validating required fields for submission...");
    
    const required = [
        { id: 'quotationType', name: 'Quotation Type' },
        { id: 'quotationDate', name: 'Quotation Date' },
        { id: 'expiryDate', name: 'Expiry Date' },
        { id: 'customerSelect', name: 'Customer Name' },
        { id: 'currency', name: 'Currency' },
        { id: 'paymentTerms', name: 'Payment Terms' },
        { id: 'expectedDate', name: 'Expected Date' }
    ];
    
    const missing = [];
    
    required.forEach(field => {
        const element = document.getElementById(field.id);
        if (!element || !element.value || element.value === 'Select Quotation Type' || element.value === 'Select Currency' || element.value === '') {
            missing.push(field.name);
            console.log(`❌ Missing: ${field.name}`);
            
            if (element) {
                element.style.borderColor = '#dc3545';
                element.style.borderWidth = '2px';
                
                setTimeout(() => {
                    element.style.borderColor = '#ddd';
                    element.style.borderWidth = '1px';
                }, 3000);
            }
        } else {
            if (element) {
                element.style.borderColor = '#ddd';
                element.style.borderWidth = '1px';
            }
        }
    });
    
    const rows = document.querySelectorAll("#itemsTableBody tr");
    let hasProducts = false;
    
    rows.forEach(row => {
        const productSelect = row.querySelector('.product-select');
        if (productSelect && productSelect.value && productSelect.value !== '') {
            hasProducts = true;
        }
    });
    
    if (!hasProducts) {
        missing.push('At least one product');
        console.log("❌ Missing: At least one product");
        
        const addItemBtn = document.getElementById('addItemBtn');
        if (addItemBtn) {
            addItemBtn.style.borderColor = '#dc3545';
            addItemBtn.style.borderWidth = '2px';
            setTimeout(() => {
                addItemBtn.style.borderColor = '';
                addItemBtn.style.borderWidth = '';
            }, 3000);
        }
    }
    
    let hasValidQuantity = false;
    rows.forEach(row => {
        const productSelect = row.querySelector('.product-select');
        const quantityInput = row.querySelector('.quantity-input');
        if (productSelect && productSelect.value) {
            const quantity = parseFloat(quantityInput?.value) || 0;
            if (quantity > 0) {
                hasValidQuantity = true;
            }
        }
    });
    
    if (hasProducts && !hasValidQuantity) {
        console.log("⚠️ Warning: Products selected but quantities are zero");
    }
    
    if (missing.length > 0) {
        showToast(`Please fill all required fields:\n- ${missing.join('\n- ')}`, 'warning');
        return false;
    }
    
    console.log("✅ All required fields are valid!");
    return true;
}

// ===================================================
// SUBMIT WITH REDIRECT FUNCTION
// ===================================================
// ===================================================
// SUBMIT WITH REDIRECT FUNCTION - FIXED TAX CALCULATION
// ===================================================
// ===================================================
// SUBMIT WITH REDIRECT FUNCTION - FIXED TAX CALCULATION
// ===================================================

function submitQuotationWithStatusAndRedirect(status, shouldRedirect) {
    
    const quotationId = document.getElementById("quotationNumber")?.value || '';
    const quotationType = document.getElementById("quotationType")?.value || '';
    const quotationDate = document.getElementById("quotationDate")?.value || '';
    const expiryDate = document.getElementById("expiryDate")?.value || '';
    const customerPo = document.getElementById("customerPo")?.value || '';
    const salesRep = document.getElementById("salesRep")?.value || '';
    const paymentTerm = document.getElementById("paymentTerms")?.value || '';
    const customerName = document.getElementById("customerSelect")?.value || '';
    const currency = document.getElementById("currency")?.value || 'EUR';
    const expectedDate = document.getElementById("expectedDate")?.value || '';
    
    // Get exchange rate
    const exchangeRate = getCurrentExchangeRate();
    
    // Calculate all totals first
    calculateGrandTotal();
    
    // Get values as NUMBERS, not strings with symbols
    const subtotalValue = extractNumericValue(document.getElementById('subtotalAmount')?.textContent) || 0;
    
    // ===== FIX: Calculate tax directly from rows instead of relying on display =====
    let calculatedTaxValue = 0;
    const rows = document.querySelectorAll("#itemsTableBody tr");
    rows.forEach(row => {
        const taxAmountIND = parseFloat(row.dataset.taxAmountIND) || 0;
        calculatedTaxValue += convertFromIND(taxAmountIND, currency);
    });
    
    const grandTotalValue = extractNumericValue(document.getElementById('grandTotalAmount')?.textContent) || 0;
    
    // Get input values as numbers
    const globalDiscountPercent = parseFloat(document.getElementById('globalDiscount')?.value) || 0;
    const shippingChargeValue = parseFloat(document.getElementById('shippingCharge')?.value) || 0;
    const roundingAdjustmentValue = parseFloat(document.getElementById('roundingAdjustment')?.value) || 0;
    
    // Calculate base values
    let itemsSubtotalBase = 0;
    let totalTaxBase = 0;
    
    rows.forEach(row => {
        const rowTotalBase = parseFloat(row.dataset.rowTotalIND) || 0;
        const taxAmountBase = parseFloat(row.dataset.taxAmountIND) || 0;
        
        itemsSubtotalBase += rowTotalBase;
        totalTaxBase += taxAmountBase;
    });
    
    const data = {
        quotation_id: quotationId,
        quotation_type: quotationType,
        quotation_date: quotationDate,
        expiry_date: expiryDate,
        customer_po: customerPo,
        sales_rep: salesRep,
        paymentTerms: paymentTerm,
        customer_name: customerName,
        currency: currency,
        expected_date: expectedDate,
        status: status,
        status_date: new Date().toISOString(),
        submitted_by: 'Current User',
        rejection_reason: window.rejectionReason || '',
        items: [],
        totals: {
            // Store as NUMBERS, not strings
            subtotal: subtotalValue,
            tax_summary: calculatedTaxValue, // Use calculated value instead of extracted
            grand_total: grandTotalValue,
            global_discount_percent: globalDiscountPercent,
            shipping_charge: shippingChargeValue,
            rounding_adjustment: roundingAdjustmentValue,
            
            // Base values
            subtotal_base: itemsSubtotalBase,
            tax_base: totalTaxBase
        }
    };

    // Process items - store as NUMBERS
    rows.forEach((row, index) => {
        const productSelect = row.querySelector('.product-select');
        if (productSelect && productSelect.value) {
            const totalDisplayText = row.querySelector('.row-total-cell')?.textContent || '0';
            
            // Calculate tax amount for this item
            const quantity = parseFloat(row.querySelector('.quantity-input')?.value) || 0;
            const unitPriceText = row.querySelector('.unit-price-cell')?.textContent || '0';
            const unitPrice = parseFloat(unitPriceText.replace(/[^0-9.-]/g, '')) || 0;
            const taxPercent = parseFloat(row.querySelector('.tax-cell')?.textContent) || 0;
            const discountPercent = parseFloat(row.querySelector('.discount-input')?.value) || 0;
            
            const lineTotal = quantity * unitPrice;
            const discountAmount = lineTotal * (discountPercent / 100);
            const afterDiscount = lineTotal - discountAmount;
            const taxAmount = afterDiscount * (taxPercent / 100);
            
            data.items.push({
                sl_no: index + 1,
                product_id: row.querySelector('.product-id-cell')?.textContent || '',
                product_name: productSelect.options[productSelect.selectedIndex]?.text.split(' (')[0] || '',
                quantity: quantity,
                uom: row.querySelector('.uom-cell')?.textContent || '',
                unit_price: unitPrice,
                tax: taxPercent,
                tax_amount: taxAmount, // Add explicit tax amount
                discount: discountPercent,
                total: extractNumericValue(totalDisplayText),
                product_status: row.dataset.status || 'unknown'
            });
        }
    });

    console.log(`📤 Submitting quotation with status: ${status}`, data);
    console.log(`💰 Tax summary calculated: ${calculatedTaxValue}`);

    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
    }

    fetch("/save-quotation", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            let message = '';
            switch(status) {
                case 'draft': message = " Quotation saved as Draft"; break;
                case 'send': message = " Quotation Submitted Successfully!"; break;
                case 'approved': message = " Quotation Approved!"; break;
                case 'rejected': message = " Quotation Rejected"; break;
                case 'expired': message = " Quotation Expired"; break;
            }
            
            if (shouldRedirect) {
                const encoded = encodeURIComponent(message);
                const encodedType = encodeURIComponent('success');
                setTimeout(() => {
                    window.location.href = `/quotation?toast=${encoded}&toastType=${encodedType}`;
                }, 1500);
            } else {
                showToast(message, 'success');
            }
        } else {
            showToast("❌ Error: " + (result.error || "Unknown error"), 'error');
        }
    })
    .catch(error => {
        console.error("Error:", error);
        showToast("❌ Error saving quotation. Please try again.", 'error');
    })
    .finally(() => {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
        }
        window.rejectionReason = '';
    });
}
// ===================================================
// HELPER: Extract numeric value from formatted string
// ===================================================

function extractNumericValue(formattedString) {
    if (!formattedString) return 0;
    // Remove all currency symbols and non-numeric characters except . and -
    const numericString = formattedString.replace(/[^0-9.-]/g, '');
    return parseFloat(numericString) || 0;
}


// ===================================================
// GET CURRENT EXCHANGE RATE
// ===================================================

function getCurrentExchangeRate() {
    const currencySelect = document.getElementById('currency');
    const currency = currencySelect ? currencySelect.value : 'IND';
    return exchangeRates[currency] || 1.00;
}
// ===================================================
// SAVE AND GENERATE PDF
// ===================================================

function saveAndGeneratePDF(quotationId) {
    const quotationData = collectQuotationData('draft');
    fetch("/save-quotation", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(quotationData)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast("📝 Quotation saved as Draft", 'success');
            window.open(`/generate-pdf/${quotationId}`, '_blank');
        } else {
            showToast("❌ Error saving quotation: " + (result.error || "Unknown error"), 'error');
        }
    })
    .catch(error => {
        console.error("Error:", error);
        showToast("❌ Error saving quotation", 'error');
    });
}

function saveAndPromptForEmailWithModal(quotationId) {
    const quotationData = collectQuotationData('draft');
    
    setButtonLoading(true, 'Saving...');
    
    fetch("/save-quotation", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(quotationData)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast("📝 Quotation saved", 'success');
            setButtonLoading(false);
            promptForEmailWithModal(quotationId);
        } else {
            showToast("❌ Error saving: " + (result.error || "Unknown error"), 'error');
            setButtonLoading(false);
        }
    })
    .catch(error => {
        console.error("Error:", error);
        showToast("❌ Error saving quotation", 'error');
        setButtonLoading(false);
    });
}

function collectQuotationData(status) {
    const quotationId = document.getElementById("quotationNumber")?.value || '';
    const quotationType = document.getElementById("quotationType")?.value || '';
    const quotationDate = document.getElementById("quotationDate")?.value || '';
    const expiryDate = document.getElementById("expiryDate")?.value || '';
    const customerPo = document.getElementById("customerPo")?.value || '';
    const salesRep = document.getElementById("salesRep")?.value || '';
    const paymentTerm = document.getElementById("paymentTerms")?.value || '';
    const customerName = document.getElementById("customerSelect")?.value || '';
    const currency = document.getElementById("currency")?.value || '';
    const expectedDate = document.getElementById("expectedDate")?.value || '';
    
    const subtotalDisplay = document.getElementById('subtotalAmount')?.textContent || '₹ 0.00';
    const taxDisplay = document.getElementById('taxSummaryAmount')?.textContent || '₹ 0';
    const grandTotalDisplay = document.getElementById('grandTotalAmount')?.textContent || '₹ 0';
    
    const globalDiscount = document.querySelector('.global-discount-input')?.value || '0';
    const shippingCharge = document.getElementById('shippingCharge')?.value || '0';
    const roundingAdjustment = document.getElementById('roundingAdjustment')?.value || '0';
    
    const data = {
        quotation_id: quotationId,
        quotation_type: quotationType,
        quotation_date: quotationDate,
        expiry_date: expiryDate,
        customer_po: customerPo,
        sales_rep: salesRep,
        paymentTerms: paymentTerm,
        customer_name: customerName,
        currency: currency,
        expected_date: expectedDate,
        status: status,
        status_date: new Date().toISOString(),
        submitted_by: 'Current User',
        rejection_reason: '',
        items: [],
        totals: {
            subtotal: subtotalDisplay,
            tax_summary: taxDisplay,
            grand_total: grandTotalDisplay,
            global_discount_percent: globalDiscount,
            shipping_charge: shippingCharge,
            rounding_adjustment: roundingAdjustment
        }
    };

    const rows = document.querySelectorAll("#itemsTableBody tr");
    
    rows.forEach((row, index) => {
        const productSelect = row.querySelector('.product-select');
        if (productSelect && productSelect.value) {
            data.items.push({
                sl_no: index + 1,
                product_id: row.querySelector('.product-id-cell')?.textContent || '',
                product_name: productSelect.options[productSelect.selectedIndex]?.text.split(' (')[0] || '',
                quantity: row.querySelector('.quantity-input')?.value || '0',
                uom: row.querySelector('.uom-cell')?.textContent || '',
                unit_price: row.querySelector('.unit-price-cell')?.textContent || '0',
                tax: row.querySelector('.tax-cell')?.textContent || '0',
                discount: row.querySelector('.discount-input')?.value || '0',
                total: row.querySelector('.row-total-cell')?.textContent || '0',
                product_status: row.dataset.status || 'unknown'
            });
        }
    });

    return data;
}

function syncWithSoftC(quotationId) {
    const syncBtn = document.querySelector(".footer-item.sync");
    if (!syncBtn) return;
    const originalHTML = syncBtn.innerHTML;
    syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
    syncBtn.style.opacity = '0.7';
    syncBtn.style.pointerEvents = 'none';
    
    fetch("/sync-softc", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ quotation_id: quotationId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast("✅ Successfully synced with Soft-C", 'success');
        } else {
            showToast("❌ Sync failed: " + (data.error || "Unknown error"), 'error');
        }
    })
    .catch(error => {
        console.error("Error:", error);
        showToast("❌ Error syncing with Soft-C", 'error');
    })
    .finally(() => {
        syncBtn.innerHTML = originalHTML;
        syncBtn.style.opacity = '1';
        syncBtn.style.pointerEvents = 'auto';
    });
}

function saveAndSyncSoftC(quotationId) {
    const quotationData = collectQuotationData('draft');
    const syncBtn = document.querySelector(".footer-item.sync");
    if (!syncBtn) return;
    const originalHTML = syncBtn.innerHTML;
    syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    syncBtn.style.opacity = '0.7';
    syncBtn.style.pointerEvents = 'none';
    
    fetch("/save-quotation", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(quotationData)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast("📝 Quotation saved as Draft", 'success');
            syncWithSoftC(quotationId);
        } else {
            showToast("❌ Error saving quotation: " + (result.error || "Unknown error"), 'error');
            syncBtn.innerHTML = originalHTML;
            syncBtn.style.opacity = '1';
            syncBtn.style.pointerEvents = 'auto';
        }
    })
    .catch(error => {
        console.error("Error:", error);
        showToast("❌ Error saving quotation", 'error');
        syncBtn.innerHTML = originalHTML;
        syncBtn.style.opacity = '1';
        syncBtn.style.pointerEvents = 'auto';
    });
}

function setButtonLoading(isLoading, text) {
    const emailBtn = document.querySelector(".footer-item.email");
    if (!emailBtn) return;
    
    if (isLoading) {
        if (!emailBtn.dataset.originalHTML) {
            emailBtn.dataset.originalHTML = emailBtn.innerHTML;
        }
        emailBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${text}`;
        emailBtn.style.opacity = '0.7';
        emailBtn.style.pointerEvents = 'none';
    } else {
        if (emailBtn.dataset.originalHTML) {
            emailBtn.innerHTML = emailBtn.dataset.originalHTML;
        }
        emailBtn.style.opacity = '1';
        emailBtn.style.pointerEvents = 'auto';
    }
}
// ===================================================
// LOAD QUOTATION FOR VIEW (CORRECTED)
// ===================================================
// ===================================================
// LOAD QUOTATION FOR VIEW (FULLY CORRECTED)
// ===================================================
function loadQuotationForView(quotationId) {
    console.log(`📝 Loading quotation for VIEW: ${quotationId}`);

    fetch(`/get-quotation/${encodeURIComponent(quotationId)}`)
        .then(response => response.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Quotation not found');
            const quotation = data.quotation || data;
            processLoadedQuotation(quotation);
        })
        .catch(error => {
            console.error('Error loading quotation:', error);
            showToast('Error loading quotation', 'error');
            addNewRow();
        });

    function processLoadedQuotation(quotation) {
        console.log('✅ Quotation loaded:', quotation);
        currentQuotationStatus = quotation.status;
        currentQuotationId = quotation.quotation_id;

        // Populate main fields
        document.getElementById('quotationNumber').value = quotation.quotation_id || '';
        document.getElementById('quotationType').value = quotation.quotation_type || 'Standard';
        document.getElementById('quotationDate').value = quotation.quotation_date || '';
        document.getElementById('expiryDate').value = quotation.expiry_date || '';
        document.getElementById('customerPo').value = quotation.customer_po || '';
        document.getElementById('currency').value = quotation.currency || 'IND';
        document.getElementById('expectedDate').value = quotation.expected_date || '';
        document.getElementById('customerSelect').value = quotation.customer_name || '';
        document.getElementById('salesRep').value = quotation.sales_rep || '';
        document.getElementById('paymentTerms').value = quotation.paymentTerms || '';

        // --- Convert and store shipping charge in IND ---
        const savedCurrency = quotation.currency;
        const savedShipping = parseFloat(quotation.totals?.shipping_charge) || 0;
        const shippingIND = convertToIND(savedShipping, savedCurrency);
        window.currentShippingIND = shippingIND; // store globally for currency changes

        // Set shipping input to current currency value
        const currentCurrency = document.getElementById('currency').value;
        document.getElementById('shippingCharge').value = convertFromIND(shippingIND, currentCurrency).toFixed(2);

        // Set global discount (percentage, no conversion)
        if (quotation.totals?.global_discount_percent) {
            document.querySelector('.global-discount-input').value = quotation.totals.global_discount_percent;
        }

        // Clear and rebuild items table
        const tbody = document.getElementById('itemsTableBody');
        tbody.innerHTML = '';
        rowCount = 0;

        if (quotation.items && quotation.items.length > 0) {
            console.log(`📦 Loading ${quotation.items.length} items`);

            quotation.items.forEach((item, index) => {
                addNewRow(); // creates row with disabled inputs

                setTimeout(() => {
                    const rowNumber = index + 1;
                    const row = document.getElementById(`row-${rowNumber}`);
                    if (!row) return;

                    // Static cells
                    row.querySelector('.product-id-cell').textContent = item.product_id || '';
                    row.querySelector('.uom-cell').textContent = item.uom || '';
                    row.querySelector('.tax-cell').textContent = item.tax || item.tax_percent || '0';

                    // --- Compute base INR price ---
                    let unitPriceIND;
                    if (item.unit_price_ind) {
                        // Direct INR price from backend (recommended)
                        unitPriceIND = parseFloat(item.unit_price_ind) || 0;
                    } else {
                        // Fallback: convert from saved currency to INR
                        const savedRate = exchangeRates[savedCurrency] || 1;
                        const displayPrice = parseFloat(item.unit_price) || 0;
                        unitPriceIND = displayPrice / savedRate;
                    }
                    row.dataset.priceIND = unitPriceIND;

                    // --- Set quantity and discount from saved data ---
                    row.querySelector('.quantity-input').value = item.quantity || 1;
                    row.querySelector('.discount-input').value = item.discount || 0;

                    // --- Update unit price display using CURRENT currency ---
                    const currentCurrency = document.getElementById('currency').value;
                    const symbol = currencySymbols[currentCurrency] || '₹';
                    const displayUnitPrice = convertFromIND(unitPriceIND, currentCurrency);
                    row.querySelector('.unit-price-cell').textContent = `${symbol} ${displayUnitPrice.toFixed(2)}`;

                    // --- Recalculate row total (this updates row total cell) ---
                    calculateRowTotal(rowNumber);

                    // --- Set product select dropdown (optional, for reference) ---
                    const productSelect = row.querySelector('.product-select');
                    if (productSelect && item.product_name) {
                        let found = false;
                        for (let i = 0; i < productSelect.options.length; i++) {
                            const optionText = productSelect.options[i].text.split(' (')[0];
                            if (optionText === item.product_name) {
                                productSelect.selectedIndex = i;
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            const option = document.createElement('option');
                            option.value = item.product_id || '';
                            option.textContent = item.product_name;
                            option.selected = true;
                            option.disabled = true;
                            option.style.fontStyle = 'italic';
                            productSelect.appendChild(option);
                        }
                    }
                }, 0);
            });

            // After all rows are processed, ensure grand total is recalculated
            setTimeout(() => {
                calculateGrandTotal();
            }, 50);
        } else {
            addNewRow();
            calculateGrandTotal();
        }

        // --- Populate totals display (without overwriting shipping/global discount) ---
        setTimeout(() => {
            if (quotation.totals) {
                const symbol = currencySymbols[currentCurrency] || '₹';
             
// --- Convert and store shipping charge in IND ---
const shippingInput = document.getElementById('shippingCharge');
if (shippingInput) {
    const savedCurrency = quotation.currency;
    const savedShipping = parseFloat(quotation.totals?.shipping_charge) || 0;
    const shippingIND = convertToIND(savedShipping, savedCurrency);
    window.currentShippingIND = shippingIND; // store globally for currency changes
    const currentCurrency = document.getElementById('currency').value;
    shippingInput.value = convertFromIND(shippingIND, currentCurrency).toFixed(2);
    console.log('✅ Shipping set to:', shippingInput.value);
} else {
    console.warn('⚠️ shippingCharge input not found');
}

// --- Set global discount ---
const globalDiscountInput = document.querySelector('.global-discount-input');
if (globalDiscountInput && quotation.totals?.global_discount_percent !== undefined) {
    globalDiscountInput.value = quotation.totals.global_discount_percent;
    console.log('✅ Global discount set to:', globalDiscountInput.value);
} else {
    console.warn('⚠️ globalDiscount input not found or value missing');
}


                // Subtotal
                const subtotalElement = document.getElementById('subtotalAmount');
                if (subtotalElement && quotation.totals.subtotal) {
                    let subtotalValue = quotation.totals.subtotal;
                    if (typeof subtotalValue === 'string') {
                        subtotalValue = parseFloat(subtotalValue.replace(/[^0-9.-]/g, '')) || 0;
                    }
                    subtotalElement.textContent = `${symbol} ${subtotalValue.toFixed(2)}`;
                }

                // Tax summary
                const taxElement = document.getElementById('taxSummaryAmount');
                if (taxElement) {
                    let taxValue = 0;
                    if (quotation.totals.tax_summary) {
                        taxValue = quotation.totals.tax_summary;
                    } else if (quotation.totals.tax) {
                        taxValue = quotation.totals.tax;
                    } else if (quotation.totals.tax_amount) {
                        taxValue = quotation.totals.tax_amount;
                    }
                    if (typeof taxValue === 'string') {
                        taxValue = parseFloat(taxValue.replace(/[^0-9.-]/g, '')) || 0;
                    }
                    taxElement.textContent = `${symbol} ${taxValue.toFixed(2)}`;
                }

                // Grand total
                const grandTotalElement = document.getElementById('grandTotalAmount');
                if (grandTotalElement && quotation.totals.grand_total) {
                    let grandTotalValue = quotation.totals.grand_total;
                    if (typeof grandTotalValue === 'string') {
                        grandTotalValue = parseFloat(grandTotalValue.replace(/[^0-9.-]/g, '')) || 0;
                    }
                    grandTotalElement.textContent = `${symbol} ${grandTotalValue.toFixed(2)}`;
                }

                // Rounding adjustment (optional)
                const roundingAdjustment = document.getElementById('roundingAdjustment');
                if (roundingAdjustment) {
                    roundingAdjustment.value = quotation.totals.rounding_adjustment || '0';
                }
            } else {
                calculateGrandTotal();
            }
        }, quotation.items ? (quotation.items.length * 100 + 500) : 500);

        // Load attachments and comments
        loadAttachmentsForQuotation(quotationId);
        loadCommentsForQuotation(quotationId);

        // Make page read‑only for view mode
        makeViewModeReadOnly(quotation.status);

        showToast(' Quotation loaded successfully', 'success');
    }
}
// ===================================================
// DISABLE COMMENT AND ATTACHMENT SECTIONS IN VIEW MODE
// ===================================================

function disableCommentAndAttachmentSections() {
    console.log("🔒 Disabling comment and attachment sections");
    
    // Disable comment textarea
    const commentTextarea = document.getElementById('commentText');
    if (commentTextarea) {
        commentTextarea.disabled = true;
        commentTextarea.style.backgroundColor = '#f5f5f5';
        commentTextarea.style.cursor = 'not-allowed';
        commentTextarea.placeholder = 'Comments are read-only in view mode';
        commentTextarea.readOnly = true; // Add this for extra safety
    } else {
        console.warn("Comment textarea not found");
    }
    
    // Disable add comment button
    const addCommentBtn = document.getElementById('addCommentBtn');
    if (addCommentBtn) {
        addCommentBtn.disabled = true;
        addCommentBtn.style.opacity = '0.5';
        addCommentBtn.style.cursor = 'not-allowed';
        addCommentBtn.style.pointerEvents = 'none';
        addCommentBtn.setAttribute('title', 'Cannot add comments in view mode');
    } else {
        console.warn("Add comment button not found");
    }
    
    // Disable file upload
    const fileInput = document.getElementById('fileInput');
    const uploadCard = document.getElementById('uploadCard');
    const uploadBtn = document.getElementById('uploadBtn');
    
    if (fileInput) {
        fileInput.disabled = true;
    } else {
        console.warn("File input not found");
    }
    
    if (uploadCard) {
        uploadCard.style.pointerEvents = 'none';
        uploadCard.style.opacity = '0.5';
        uploadCard.style.cursor = 'not-allowed';
        uploadCard.setAttribute('title', 'Cannot upload files in view mode');
    } else {
        console.warn("Upload card not found");
    }
    
    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.style.opacity = '0.5';
        uploadBtn.style.cursor = 'not-allowed';
        uploadBtn.style.pointerEvents = 'none';
        uploadBtn.setAttribute('title', 'Cannot upload files in view mode');
    } else {
        console.warn("Upload button not found");
    }
    
    // Hide delete buttons on existing files
    setTimeout(() => {
        const deleteButtons = document.querySelectorAll('.btn-delete');
        console.log(`🔒 Hiding ${deleteButtons.length} delete buttons`);
        deleteButtons.forEach(btn => {
            btn.style.display = 'none';
        });
    }, 500);
}

// ===================================================
// MAKE VIEW MODE READ-ONLY (NOW WITH EDIT & DELETE)
// ===================================================

// ===================================================
// MAKE VIEW MODE READ-ONLY (NOW WITH EDIT & DELETE)
// ===================================================
// ===================================================
// MAKE VIEW MODE READ-ONLY (NOW WITH EDIT & DELETE)
// ===================================================

function makeViewModeReadOnly(status) {
    console.log(`🔒 Setting view mode for status: ${status}`);
    
    // 1. Disable ALL form inputs
    const allInputs = document.querySelectorAll('input, select, textarea, .product-select, .quantity-input, .discount-input, #globalDiscount, #shippingCharge');
    allInputs.forEach(input => {
        input.disabled = true;
        input.style.backgroundColor = '#f5f5f5';
        input.style.cursor = 'default';
    });
    
    // 2. Get all buttons
    const submitBtn = document.querySelector('.btn-save');
    const draftBtn = document.querySelector('.btn-draft');
    const approveBtn = document.querySelector('.footer-item.approve');
    const rejectBtn = document.querySelector('.footer-item.reject');
    const editBtn = document.querySelector('.footer-item.edit');
    const deleteBtn = document.querySelector('.footer-item.delete');
    const pdfBtn = document.querySelector('.footer-item.pdf');
    const emailBtn = document.querySelector('.footer-item.email');
    
    // 3. FORCE HIDE submit button completely (multiple methods)
    if (submitBtn) {
        submitBtn.style.display = 'none';
        submitBtn.style.visibility = 'hidden';
        submitBtn.style.opacity = '0';
        submitBtn.style.pointerEvents = 'none';
        submitBtn.disabled = true;
        submitBtn.setAttribute('hidden', 'true');
        console.log("✅ Submit button forcefully hidden");
    } else {
        console.warn("⚠️ Submit button not found!");
    }
    
    // Also try to hide by parent and class name (more aggressive)
    const allPossibleSubmitButtons = document.querySelectorAll('.btn-save, button[type="submit"], #submitBtn');
    allPossibleSubmitButtons.forEach(btn => {
        btn.style.display = 'none';
        btn.style.visibility = 'hidden';
        console.log("✅ Hidden additional submit button:", btn);
    });
    
    // Hide draft button
    if (draftBtn) {
        draftBtn.style.display = 'none';
        draftBtn.style.visibility = 'hidden';
    }
    
    // 4. Handle Approve/Reject buttons based on status
    if (status === 'send' || status === 'submitted') {
        // For send/submitted status, show Approve/Reject buttons
        if (approveBtn) {
            approveBtn.style.display = 'flex';
            approveBtn.style.visibility = 'visible';
            approveBtn.style.flexDirection = 'column';
            approveBtn.style.alignItems = 'center';
            approveBtn.style.opacity = '1';
            approveBtn.style.pointerEvents = 'auto';
            approveBtn.onclick = () => {
                if (confirm('Are you sure you want to APPROVE this quotation? This action cannot be undone.')) {
                    submitQuotationWithStatusAndRedirect("approved", true);
                }
            };
            console.log("✅ Approve button shown for status:", status);
        }
        
        if (rejectBtn) {
            rejectBtn.style.display = 'flex';
            rejectBtn.style.visibility = 'visible';
            rejectBtn.style.flexDirection = 'column';
            rejectBtn.style.alignItems = 'center';
            rejectBtn.style.opacity = '1';
            rejectBtn.style.pointerEvents = 'auto';
            rejectBtn.onclick = () => {
                const reason = prompt('Please enter reason for rejection:');
                if (reason !== null) {
                    if (reason.trim() === '') {
                        showToast('Rejection reason is required', 'warning');
                        return;
                    }
                    window.rejectionReason = reason;
                    submitQuotationWithStatusAndRedirect("rejected", true);
                }
            };
            console.log("✅ Reject button shown for status:", status);
        }
    } else {
        // For other statuses, hide Approve/Reject buttons
        if (approveBtn) {
            approveBtn.style.display = 'none';
            approveBtn.style.visibility = 'hidden';
        }
        if (rejectBtn) {
            rejectBtn.style.display = 'none';
            rejectBtn.style.visibility = 'hidden';
        }
    }

    // 5. SHOW/HIDE view-mode buttons based on status table
    // Edit button - visible for Draft, Sent, Rejected, Expired
    if (editBtn) {
        const showEdit = ['draft', 'send', 'sent', 'submitted', 'rejected', 'expired'].includes(status);
        
        if (showEdit) {
            editBtn.style.display = 'flex';
            editBtn.style.visibility = 'visible';
            editBtn.style.flexDirection = 'column';
            editBtn.style.alignItems = 'center';
            
            if (editBtn.children.length === 0 || !editBtn.querySelector('i')) {
                editBtn.innerHTML = `
                    <i class="fa-solid fa-pen-to-square"></i>
                    <span>Edit</span>
                `;
            }
            
            editBtn.onclick = () => {
                window.location.href = `/add-new-quotation?edit=${currentQuotationId}`;
            };
        } else {
            editBtn.style.display = 'none';
            editBtn.style.visibility = 'hidden';
        }
    }
    
    // Delete button - visible only for Draft
    if (deleteBtn) {
        const showDelete = status === 'draft';
        
        if (showDelete) {
            deleteBtn.style.display = 'flex';
            deleteBtn.style.visibility = 'visible';
            deleteBtn.style.flexDirection = 'column';
            deleteBtn.style.alignItems = 'center';
            
            if (deleteBtn.children.length === 0 || !deleteBtn.querySelector('i')) {
                deleteBtn.innerHTML = `
                    <i class="fa-solid fa-trash"></i>
                    <span>Delete</span>
                `;
            }
            
            deleteBtn.onclick = () => deleteQuotation(currentQuotationId);
        } else {
            deleteBtn.style.display = 'none';
            deleteBtn.style.visibility = 'hidden';
        }
    }
    
    // PDF button - always visible
    if (pdfBtn) {
        pdfBtn.style.display = 'flex';
        pdfBtn.style.visibility = 'visible';
        pdfBtn.style.flexDirection = 'column';
        pdfBtn.style.alignItems = 'center';
        pdfBtn.onclick = () => {
            window.open(`/generate-pdf/${currentQuotationId}`, '_blank');
        };
    }
    
    // Email button - only for Sent and Approved
    if (emailBtn) {
        const showEmail = ['send', 'sent', 'submitted', 'approved'].includes(status);
        if (showEmail) {
            emailBtn.style.display = 'flex';
            emailBtn.style.visibility = 'visible';
            emailBtn.style.flexDirection = 'column';
            emailBtn.style.alignItems = 'center';
            emailBtn.onclick = () => promptForEmailWithModal(currentQuotationId);
        } else {
            emailBtn.style.display = 'none';
            emailBtn.style.visibility = 'hidden';
        }
    }
    
    // 6. Disable Add Item button
    const addItemBtn = document.getElementById('addItemBtn');
    if (addItemBtn) {
        addItemBtn.disabled = true;
        addItemBtn.style.opacity = '0.5';
        addItemBtn.style.cursor = 'default';
    }
    
    // 7. Update page title
    const titleElement = document.querySelector('.quotation-title');
    if (titleElement) {
        titleElement.textContent = `View Quotation: ${currentQuotationId}`;
                showStatusBadgeForView(status);

    }

    // 8. DISABLE COMMENT AND ATTACHMENT SECTIONS (single call)
    disableCommentAndAttachmentSections();
    
    // 9. Double-check after a small delay (in case something else overrides)
    setTimeout(() => {
        const checkSubmit = document.querySelector('.btn-save');
        if (checkSubmit && checkSubmit.style.display !== 'none') {
            console.log("⚠️ Submit button reappeared! Hiding again...");
            checkSubmit.style.display = 'none';
            checkSubmit.style.visibility = 'hidden';
        }
    }, 500);
}





// ===================================================
// ADD STATUS BADGE FOR VIEW MODE
// ===================================================

function showStatusBadgeForView(status) {
    const title = document.querySelector('.quotation-title');
    if (!title) return;
    
    // Remove existing badge
    const existingBadge = document.querySelector('.status-badge');
    if (existingBadge) existingBadge.remove();
    
    // Create new badge
    const badge = document.createElement('span');
    badge.className = `status-badge status-${status}`;
    
    // Set text based on status
    switch(status) {
        case 'draft': badge.textContent = 'Draft'; break;
        case 'send': 
        case 'sent': badge.textContent = 'Sent'; break;
        case 'submitted': badge.textContent = 'Submitted'; break;
        case 'approved': badge.textContent = 'Approved ✓'; break;
        case 'rejected': badge.textContent = 'Rejected ✗'; break;
        case 'expired': badge.textContent = 'Expired ⏰'; break;
        default: badge.textContent = status;
    }
    
    title.appendChild(badge);
}

// ===================================================
// UPDATE ACTION BUTTONS FOR VIEW MODE
// ===================================================

function updateActionButtonsForViewMode(status) {
    const pdfBtn = document.querySelector('.footer-item.pdf');
    const emailBtn = document.querySelector('.footer-item.email');
    
    // PDF button - always enabled for view mode
    if (pdfBtn) {
        pdfBtn.disabled = false;
        pdfBtn.style.opacity = '1';
        pdfBtn.style.cursor = 'pointer';
        
        // Set title based on status
        if (status === 'rejected') {
            pdfBtn.setAttribute('title', 'View Rejected Quotation (Reference Only)');
        } else if (status === 'expired') {
            pdfBtn.setAttribute('title', 'View Expired Quotation (Reference Only)');
        } else {
            pdfBtn.setAttribute('title', 'Download PDF');
        }
    }
    
    // Email button - enabled only for Sent and Approved
    if (emailBtn) {
        const shouldEnable = status === 'send' || 
                            status === 'sent' || 
                            status === 'submitted' || 
                            status === 'approved';
        
        emailBtn.disabled = !shouldEnable;
        emailBtn.style.opacity = shouldEnable ? '1' : '0.5';
        emailBtn.style.cursor = shouldEnable ? 'pointer' : 'not-allowed';
        
        if (status === 'expired') {
            emailBtn.setAttribute('title', 'Email disabled - Quotation expired');
        } else if (status === 'rejected') {
            emailBtn.setAttribute('title', 'Email disabled - Quotation rejected');
        } else if (shouldEnable) {
            emailBtn.setAttribute('title', 'Send Email');
        } else {
            emailBtn.setAttribute('title', 'Email not available for this status');
        }
    }
}



// ===================================================
// DELETE QUOTATION (ONLY FOR DRAFT)
// ===================================================
// ===================================================
// DELETE QUOTATION (ONLY FOR DRAFT) - FIXED VERSION
// ===================================================

function deleteQuotation(quotationId) {
    if (!confirm('Are you sure you want to delete this quotation? This action cannot be undone.')) {
        return;
    }
    
    console.log(`🗑️ Attempting to delete quotation: ${quotationId}`);
    
    // Show loading toast
    showToast('Deleting quotation...', 'info');
    
    fetch(`/delete-quotation/${quotationId}`, { 
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(async response => {
        // Check if response is OK
        if (!response.ok) {
            // Try to get error message from response
            const text = await response.text();
            try {
                const errorData = JSON.parse(text);
                throw new Error(errorData.error || `Server error: ${response.status}`);
            } catch {
                throw new Error(`Server error: ${response.status} - ${text.substring(0, 100)}`);
            }
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showToast(`✅ Quotation is "${quotationId}" deleted successfully ` , 'success');

            setTimeout(() => {
                window.location.href = '/quotation';
            }, 1500);
        } else {
            showToast('❌ Delete failed: ' + (data.error || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        console.error('Error deleting:', error);
        showToast('❌ Delete failed: ' + error.message, 'error');
    });
}


// ===================================================
// LOAD QUOTATION FOR EDIT 
// ===================================================
function loadQuotationForEdit(quotationId) {
    console.log(`📝 Loading quotation for EDIT: ${quotationId}`);

    const fetchQuotation = () =>
        fetch(`/get-quotation/${encodeURIComponent(quotationId)}`)
            .then(response => response.json().then(data => {
                if (!response.ok) throw new Error(data.error || `Failed to load (${response.status})`);
                return data;
            }));

    Promise.all([loadProducts(), fetchQuotation()]).then(([, data]) => {
                if (!data.success) throw new Error(data.error || 'Failed to load');
                const quotation = data.quotation || data;
                console.log('✅ Quotation loaded for edit:', quotation);

                currentQuotationStatus = quotation.status;
                currentQuotationId = quotation.quotation_id;

                // Populate main fields
                document.getElementById('quotationNumber').value = quotation.quotation_id || '';
                document.getElementById('quotationType').value = quotation.quotation_type || 'Standard';
                document.getElementById('quotationDate').value = quotation.quotation_date || '';
                document.getElementById('expiryDate').value = quotation.expiry_date || '';
                document.getElementById('customerPo').value = quotation.customer_po || '';
                document.getElementById('currency').value = quotation.currency || 'IND';
                document.getElementById('expectedDate').value = quotation.expected_date || '';
                document.getElementById('customerSelect').value = quotation.customer_name || '';
                document.getElementById('salesRep').value = quotation.sales_rep || '';
                document.getElementById('paymentTerms').value = quotation.paymentTerms || '';

                // --- Convert and store shipping charge in IND ---
                const savedCurrency = quotation.currency;
                const savedShipping = parseFloat(quotation.totals?.shipping_charge) || 0;
                const shippingIND = convertToIND(savedShipping, savedCurrency);
                window.currentShippingIND = shippingIND;

                const currentCurrency = document.getElementById('currency').value;
                document.getElementById('shippingCharge').value = convertFromIND(shippingIND, currentCurrency).toFixed(2);

                // Set global discount (percentage, no conversion)
                if (quotation.totals?.global_discount_percent) {
                    document.querySelector('.global-discount-input').value = quotation.totals.global_discount_percent;
                }

                // Clear and rebuild items table
                const tbody = document.getElementById('itemsTableBody');
                tbody.innerHTML = '';
                rowCount = 0;

                if (quotation.items && quotation.items.length > 0) {
                    quotation.items.forEach((item, index) => {
                        addNewRow();

                        setTimeout(() => {
                            const rowNumber = index + 1;
                            const row = document.getElementById(`row-${rowNumber}`);
                            if (!row) return;

                            // Static cells
                            row.querySelector('.product-id-cell').textContent = item.product_id || '';
                            row.querySelector('.uom-cell').textContent = item.uom || '';
                            row.querySelector('.tax-cell').textContent = item.tax || item.tax_percent || '0';

                            // --- Compute base INR price ---
                            let unitPriceIND;
                            if (item.unit_price_ind) {
                                unitPriceIND = parseFloat(item.unit_price_ind) || 0;
                            } else {
                                const savedRate = exchangeRates[savedCurrency] || 1;
                                const displayPrice = parseFloat(item.unit_price) || 0;
                                unitPriceIND = displayPrice / savedRate;
                            }
                            row.dataset.priceIND = unitPriceIND;

                     // Set quantity
                   const quantityInput = row.querySelector('.quantity-input');
                              if (quantityInput) {
                                   quantityInput.value = item.quantity || 1;
                                  quantityInput.disabled = false;
                                  quantityInput.readOnly = false;
                                  quantityInput.style.backgroundColor = '#fff5f5';
                                  quantityInput.style.cursor = 'text';
                               }

                          // Set discount
                        const discountInput = row.querySelector('.discount-input');
                            if (discountInput) {
                      discountInput.value = item.discount || 0;
                    discountInput.disabled = false;
                     discountInput.readOnly = false;
                      discountInput.style.backgroundColor = '#fff5f5';
                    discountInput.style.cursor = 'text';
                        }
                            // --- Update unit price display using CURRENT currency ---
                            const currentCurrency = document.getElementById('currency').value;
                            const symbol = currencySymbols[currentCurrency] || '₹';
                            const displayUnitPrice = convertFromIND(unitPriceIND, currentCurrency);
                            row.querySelector('.unit-price-cell').textContent = `${symbol} ${displayUnitPrice.toFixed(2)}`;

                            // --- Recalculate row total ---
                            calculateRowTotal(rowNumber);

                            // --- Set product select dropdown ---
                            const productSelect = row.querySelector('.product-select');
                            if (productSelect && item.product_name) {
                                let found = false;
                                for (let i = 0; i < productSelect.options.length; i++) {
                                    const optionText = productSelect.options[i].text.split(' (')[0];
                                    if (optionText === item.product_name) {
                                        productSelect.selectedIndex = i;
                                        found = true;
                                        break;
                                    }
                                }
                                if (!found) {
                                    const option = document.createElement('option');
                                    option.value = item.product_id || '';
                                    option.textContent = item.product_name;
                                    option.selected = true;
                                    option.disabled = true; // still disabled to avoid re‑selection
                                    option.style.fontStyle = 'italic';
                                    productSelect.appendChild(option);
                                }
                            }
                        }, 0);
                    });

                    setTimeout(() => {
                        updateDropdowns();
                        checkAndUpdateGlobalInputs();
                        calculateGrandTotal();
                        updateUIForStatus(quotation.status);
                    }, 50);
                } else {
                    addNewRow();
                    checkAndUpdateGlobalInputs();
                    calculateGrandTotal();
                    updateUIForStatus(quotation.status);
                }

                // --- Populate totals display (without overwriting shipping/global discount) ---
                setTimeout(() => {
                    if (quotation.totals) {
                        const symbol = currencySymbols[currentCurrency] || '₹';
// --- Convert and store shipping charge in IND ---
const shippingInput = document.getElementById('shippingCharge');
if (shippingInput) {
    const savedCurrency = quotation.currency;
    const savedShipping = parseFloat(quotation.totals?.shipping_charge) || 0;
    const shippingIND = convertToIND(savedShipping, savedCurrency);
    window.currentShippingIND = shippingIND; // store globally for currency changes
    const currentCurrency = document.getElementById('currency').value;
    shippingInput.value = convertFromIND(shippingIND, currentCurrency).toFixed(2);
    console.log('✅ Shipping set to:', shippingInput.value);
} else {
    console.warn('⚠️ shippingCharge input not found');
}

// --- Set global discount ---
const globalDiscountInput = document.querySelector('.global-discount-input');
if (globalDiscountInput && quotation.totals?.global_discount_percent !== undefined) {
    globalDiscountInput.value = quotation.totals.global_discount_percent;
    console.log('✅ Global discount set to:', globalDiscountInput.value);
} else {
    console.warn('⚠️ globalDiscount input not found or value missing');
}
                        const subtotalElement = document.getElementById('subtotalAmount');
                        if (subtotalElement && quotation.totals.subtotal) {
                            let subtotalValue = quotation.totals.subtotal;
                            if (typeof subtotalValue === 'string') {
                                subtotalValue = parseFloat(subtotalValue.replace(/[^0-9.-]/g, '')) || 0;
                            }
                            subtotalElement.textContent = `${symbol} ${subtotalValue.toFixed(2)}`;
                        }

                        const taxElement = document.getElementById('taxSummaryAmount');
                        if (taxElement) {
                            let taxValue = 0;
                            if (quotation.totals.tax_summary) {
                                taxValue = quotation.totals.tax_summary;
                            } else if (quotation.totals.tax) {
                                taxValue = quotation.totals.tax;
                            } else if (quotation.totals.tax_amount) {
                                taxValue = quotation.totals.tax_amount;
                            }
                            if (typeof taxValue === 'string') {
                                taxValue = parseFloat(taxValue.replace(/[^0-9.-]/g, '')) || 0;
                            }
                            taxElement.textContent = `${symbol} ${taxValue.toFixed(2)}`;
                        }

                        const grandTotalElement = document.getElementById('grandTotalAmount');
                        if (grandTotalElement && quotation.totals.grand_total) {
                            let grandTotalValue = quotation.totals.grand_total;
                            if (typeof grandTotalValue === 'string') {
                                grandTotalValue = parseFloat(grandTotalValue.replace(/[^0-9.-]/g, '')) || 0;
                            }
                            grandTotalElement.textContent = `${symbol} ${grandTotalValue.toFixed(2)}`;
                        }

                        const roundingAdjustment = document.getElementById('roundingAdjustment');
                        if (roundingAdjustment) {
                            roundingAdjustment.value = quotation.totals.rounding_adjustment || '0';
                        }
                    } else {
                        calculateGrandTotal();
                    }
                }, quotation.items && quotation.items.length ? 80 : 50);

                // Load attachments and comments
                loadAttachmentsForQuotation(quotationId);
                loadCommentsForQuotation(quotationId);

                document.querySelector('h1').innerHTML = `Edit Quotation: ${quotationId}`;
                showToast('✅ Quotation loaded for editing', 'success');
    }).catch(error => {
        console.error('Error loading quotation or products:', error);
        if (!currentQuotationId) {
            showToast('Error loading quotation. Please try again.', 'error');
            addNewRow();
        }
    });
}

async function loadProducts() {
    try {
        console.log("📦 Loading products from backend...");
        const response = await fetch('/get-products');
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text}`);
        }
        products = await response.json();
        console.log('✅ Products loaded:', products.length, 'items');
        return products;
    } catch (error) {
        console.error('❌ Error loading products:', error);
        products = [];
        return [];
    }
}
// ===================================================
// EXPIRED QUOTATION CHECK - ONLY SENT STATUS
// ===================================================

function checkAndMarkExpiredQuotations() {
    if (isCheckingExpired) {
        console.log("⏳ Expiry check already in progress...");
        return;
    }
    
    isCheckingExpired = true;
    console.log("🔍 Checking for expired quotations (only SENT status)...");
    
    fetch('/api/quotations')
        .then(response => response.json())
        .then(data => {
            let quotations = [];
            if (data.items) quotations = data.items;
            else if (Array.isArray(data)) quotations = data;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const currentId = document.getElementById('quotationNumber')?.value;
            if (currentId) {
                const currentQuotation = quotations.find(q => q.quotation_id === currentId);
                if (currentQuotation) {
                    const expiryDate = new Date(currentQuotation.expiry_date);
                    expiryDate.setHours(0, 0, 0, 0);
                    
                    const isSentStatus = currentQuotation.status === 'send' || 
                                        currentQuotation.status === 'sent' || 
                                        currentQuotation.status === 'submitted';
                    
                    if (isSentStatus && expiryDate < today) {
                        console.log("⚠️ Current quotation is expired! Updating UI...");
                        currentQuotationStatus = currentQuotation.status;
                        updateUIForStatus(currentQuotation.status);
                    }
                }
            }
        })
        .catch(error => console.error('Error:', error))
        .finally(() => isCheckingExpired = false);
}

// ===================================================
// FORCE UPDATE CURRENT PAGE IF EXPIRED (ONLY SENT)
// ===================================================

function forceUpdateCurrentPageIfExpired() {
    console.log("🔄 Checking if current page needs expired UI...");
    
    const currentId = document.getElementById('quotationNumber')?.value;
    if (!currentId) {
        console.log("📝 Not on a quotation page");
        return;
    }
    
    const expiryInput = document.getElementById('expiryDate');
    if (!expiryInput || !expiryInput.value) {
        console.log("📅 No expiry date found");
        return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(expiryInput.value);
    expiryDate.setHours(0, 0, 0, 0);
    
    const isSentStatus = currentQuotationStatus === 'send' || 
                        currentQuotationStatus === 'sent' || 
                        currentQuotationStatus === 'submitted';
    
    console.log("Current status:", currentQuotationStatus);
    console.log("Is sent status:", isSentStatus);
    console.log("Expired?", expiryDate < today);
    
    if (isSentStatus && expiryDate < today) {
        console.log("⚠️ FORCING UI UPDATE - Quotation is EXPIRED!");
        updateUIForStatus(currentQuotationStatus);
        showToast(`⚠️ This quotation expired on ${formatDate(expiryDate)}`, 'warning');
    }
}

// ===================================================
// VALIDATE EXPECTED DATE
// ===================================================

function validateExpectedDate() {
    const expectedDate = document.getElementById('expectedDate');
    if (!expectedDate || !expectedDate.value) return true;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(expectedDate.value);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showToast('⚠️ Expected date cannot be in the past', 'warning');
        expectedDate.style.borderColor = '#dc3545';
        expectedDate.style.borderWidth = '2px';
        
        setTimeout(() => {
            expectedDate.style.borderColor = '#ddd';
            expectedDate.style.borderWidth = '1px';
        }, 3000);
        
        return false;
    }
    
    return true;
}

// (year clamp for all date fields is attached inside initializeFormValidation)

// ===================================================
// ADD MANUAL EXPIRY CHECK BUTTON
// ===================================================

function addExpiryCheckButton() {
    const footerActions = document.querySelector('.footer-actions');
    if (!footerActions) return;
    
    if (document.getElementById('checkExpiryBtn')) return;
    
    const checkExpiryBtn = document.createElement('button');
    checkExpiryBtn.id = 'checkExpiryBtn';
    checkExpiryBtn.className = 'footer-item';
    checkExpiryBtn.innerHTML = '<i class="fa-regular fa-clock"></i> Check Expired';
    checkExpiryBtn.onclick = function() {
        checkAndMarkExpiredQuotations();
    };
    checkExpiryBtn.title = 'Check for expired quotations (display only)';
    
    footerActions.appendChild(checkExpiryBtn);
    console.log("✅ Expiry check button added");
}

// ===================================================
// SAVE DRAFT BUTTON - ENABLE/DISABLE LOGIC
// ===================================================

function initializeSaveDraftButton() {
    console.log("💾 Initializing Save Draft button...");
    
    const saveDraftBtn = document.querySelector('.btn-draft');
    if (!saveDraftBtn) {
        console.error("❌ Save Draft button not found!");
        return;
    }
    
    saveDraftBtn.disabled = true;
    saveDraftBtn.style.opacity = '0.5';
    saveDraftBtn.style.cursor = 'not-allowed';
    saveDraftBtn.setAttribute('title', 'Fill all required fields to enable Save Draft');
    
    addDraftValidationListeners();
    
    console.log("✅ Save Draft button initialized");
}

function addDraftValidationListeners() {
    const requiredFields = [
        { id: 'quotationType', name: 'Quotation Type' },
        { id: 'quotationDate', name: 'Quotation Date' },
        { id: 'expiryDate', name: 'Expiry Date' },
        { id: 'customerSelect', name: 'Customer Name' },
        { id: 'currency', name: 'Currency' },
        { id: 'paymentTerms', name: 'Payment Terms' },
        { id: 'expectedDate', name: 'Expected Date' }
    ];
    
    requiredFields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
            element.addEventListener('change', validateDraftButton);
            element.addEventListener('input', validateDraftButton);
            element.addEventListener('blur', validateDraftButton);
        }
    });
    
    const itemsTable = document.getElementById('itemsTableBody');
    if (itemsTable) {
        const observer = new MutationObserver(validateDraftButton);
        observer.observe(itemsTable, { 
            childList: true, 
            subtree: true,
            attributes: true,
            attributeFilter: ['value']
        });
    }
    
    const addItemBtn = document.getElementById('addItemBtn');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', () => {
            setTimeout(validateDraftButton, 100);
        });
    }
    
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('product-select') || 
            e.target.classList.contains('quantity-input')) {
            validateDraftButton();
        }
    });
    
    console.log("✅ Draft validation listeners added");
}

function validateDraftButton() {
    const saveDraftBtn = document.querySelector('.btn-draft');
    if (!saveDraftBtn) return;
    
    if (!isEditable()) {
        saveDraftBtn.disabled = true;
        saveDraftBtn.style.opacity = '0.5';
        saveDraftBtn.style.cursor = 'not-allowed';
        saveDraftBtn.setAttribute('title', 'Cannot save draft in current status');
        return;
    }
    
    const isDraftValid = checkDraftRequirements();
    
    if (isDraftValid) {
        saveDraftBtn.disabled = false;
        saveDraftBtn.style.opacity = '1';
        saveDraftBtn.style.cursor = 'pointer';
        saveDraftBtn.removeAttribute('title');
        console.log("💾 Save Draft ENABLED - All fields filled");
    } else {
        saveDraftBtn.disabled = true;
        saveDraftBtn.style.opacity = '0.5';
        saveDraftBtn.style.cursor = 'not-allowed';
        saveDraftBtn.setAttribute('title', 'Fill all required fields to enable Save Draft');
        console.log("💾 Save Draft DISABLED - Missing required fields");
    }
}

function checkDraftRequirements() {
    const quotationType = document.getElementById('quotationType');
    if (!quotationType || !quotationType.value || quotationType.value === 'Select Quotation Type') {
        console.log("❌ Missing: Quotation Type");
        return false;
    }
    
    const quotationDate = document.getElementById('quotationDate');
    if (!quotationDate || !quotationDate.value) {
        console.log("❌ Missing: Quotation Date");
        return false;
    }
    
    const expiryDate = document.getElementById('expiryDate');
    if (!expiryDate || !expiryDate.value) {
        console.log("❌ Missing: Expiry Date");
        return false;
    }
    
    const customerSelect = document.getElementById('customerSelect');
    if (!customerSelect || !customerSelect.value) {
        console.log("❌ Missing: Customer Name");
        return false;
    }
    
    const currency = document.getElementById('currency');
    if (!currency || !currency.value || currency.value === 'Select Currency') {
        console.log("❌ Missing: Currency");
        return false;
    }
    
    const paymentTerms = document.getElementById('paymentTerms');
    if (!paymentTerms || !paymentTerms.value) {
        console.log("❌ Missing: Payment Terms");
        return false;
    }
    
    const expectedDate = document.getElementById('expectedDate');
    if (!expectedDate || !expectedDate.value) {
        console.log("❌ Missing: Expected Date");
        return false;
    }

    
    // Add date validation for draft as well
    if (!validateDates()) {
        return false;
    }
    
    const rows = document.querySelectorAll('#itemsTableBody tr');
    let hasProduct = false;
    
    rows.forEach(row => {
        const productSelect = row.querySelector('.product-select');
        if (productSelect && productSelect.value) {
            hasProduct = true;
        }
    });
    
    if (!hasProduct) {
        console.log("❌ Missing: At least one product");
        return false;
    }
    
    console.log("✅ All draft requirements met!");
    return true;
}

function setupDraftButtonClick() {
    const saveDraftBtn = document.querySelector('.btn-draft');
    if (!saveDraftBtn) return;
    
    saveDraftBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        if (!checkDraftRequirements()) {
            showToast('Please fill all required fields before saving as draft', 'warning');
            return;
        }
        
        if (confirm('Save this quotation as DRAFT?')) {
            submitQuotationWithStatusAndRedirect('draft', true);
        }
    });
    
    console.log("✅ Draft button click handler setup");
}





// ===================================================
// HELPER FUNCTIONS
// ===================================================

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}