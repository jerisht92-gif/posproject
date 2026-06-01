(function() {
    // ---------- DOM Elements ----------
    const customerNameInput = document.getElementById('customerName');
    const paymentMethodInput = document.getElementById('paymentMethod');   // plain text input, disabled
    const transactionIdInput = document.getElementById('transactionId');
    const invoiceIdHidden = document.getElementById('invoiceId');
    const amountInput = document.getElementById('amount');
    const paymentDateInput = document.getElementById('paymentDate');
    const notesTextarea = document.getElementById('notes');
    const saveButton = document.getElementById('savePaymentBtn');
    const notesCounter = document.getElementById('notesCounter');

    // Custom dropdown UI elements (only for invoice)
    const invoiceDropdown = document.getElementById('invoiceDropdown');
    const invoiceSelected = document.getElementById('invoiceSelected');
    const invoiceOptionsDiv = document.getElementById('invoiceOptions');

    // Toast elements
    const successToast = document.getElementById('successToast');
    const errorToast = document.getElementById('errorToast');

    // Store invoice data: id → { customerName, balanceDue, paymentMethod }
    let invoiceMap = new Map();

    // Helper: show toast notification
    function showToast(toastElement, duration = 2800) {
        if (!toastElement) return;
        toastElement.classList.add('show');
        setTimeout(() => toastElement.classList.remove('show'), duration);
    }

    // Custom popup for amount exceeding balance
    function showAmountExceedsPopup(balanceDue) {
        const msg = `Amount cannot exceed balance due: ₹${balanceDue.toFixed(2)}. Amount has been adjusted.`;
        const tempToast = document.createElement('div');
        tempToast.className = 'error-notification';
        tempToast.textContent = msg;
        document.body.appendChild(tempToast);
        setTimeout(() => tempToast.classList.add('show'), 10);
        setTimeout(() => {
            tempToast.classList.remove('show');
            setTimeout(() => tempToast.remove(), 500);
        }, 2800);
    }

    // Custom popup for invalid date
    function showInvalidDatePopup() {
        const msg = `Please enter a valid date (YYYY-MM-DD).`;
        const tempToast = document.createElement('div');
        tempToast.className = 'error-notification';
        tempToast.textContent = msg;
        document.body.appendChild(tempToast);
        setTimeout(() => tempToast.classList.add('show'), 10);
        setTimeout(() => {
            tempToast.classList.remove('show');
            setTimeout(() => tempToast.remove(), 500);
        }, 2800);
    }

    // ---------- Validation Functions ----------
    function isValidCustomerName() {
        const name = customerNameInput.value.trim();
        if (name === '') return false;
        return /^[A-Za-z\s\-']+$/.test(name) && name.length <= 15;
    }

    function isValidTransactionId() {
        if (transactionIdInput.disabled) return true;   // disabled = not required
        const tid = transactionIdInput.value.trim();
        if (tid === '') return false;
        return /^[A-Za-z0-9]+$/.test(tid) && tid.length <= 15;
    }

    function isValidInvoiceId() {
        return invoiceIdHidden && invoiceIdHidden.value !== '';
    }

    function isValidAmount() {
        if (amountInput.disabled) return false;
        const amountRaw = amountInput.value.trim();
        if (amountRaw === '') return false;
        if (!/^\d+(\.\d{1,2})?$/.test(amountRaw)) return false;
        const amountNum = parseFloat(amountRaw);
        if (isNaN(amountNum) || amountNum <= 0) return false;

        const selectedId = invoiceIdHidden.value;
        if (selectedId && invoiceMap.has(selectedId)) {
            const balanceDue = invoiceMap.get(selectedId).balanceDue;
            if (balanceDue !== null && amountNum > balanceDue) {
                return false;
            }
        }
        return true;
    }

    function isValidPaymentMethod() {
        // Payment method is auto-filled from invoice – must have a value
        return paymentMethodInput && paymentMethodInput.value.trim() !== '';
    }

    function isValidDate() {
        const dateVal = paymentDateInput.value;
        if (dateVal === '') return false;
        const dateObj = new Date(dateVal);
        const isValid = !isNaN(dateObj.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(dateVal);
        return isValid;
    }

    function isValidNotes() {
        return notesTextarea.value.length <= 100;
    }

    function isFormComplete() {
        return isValidCustomerName() &&
               isValidTransactionId() &&
               isValidInvoiceId() &&
               isValidAmount() &&
               isValidPaymentMethod() &&
               isValidDate();
    }

    function isFullValid() {
        return isFormComplete() && isValidNotes();
    }

    function updateSaveButtonState() {
        if (saveButton) {
            const complete = isFormComplete();
            saveButton.disabled = !complete;
            saveButton.style.opacity = complete ? '1' : '0.6';
            saveButton.style.cursor = complete ? 'pointer' : 'not-allowed';
        }
    }

    // Update state of amount and transaction ID fields based on invoice selection and payment method
    function updateFieldStates() {
        const hasInvoice = invoiceIdHidden && invoiceIdHidden.value !== '';
        const paymentMethod = paymentMethodInput ? paymentMethodInput.value : '';
        const isCash = (paymentMethod === 'Cash');

        // Amount enabled only if an invoice is selected
        amountInput.disabled = !hasInvoice;
        if (!hasInvoice) {
            amountInput.value = '';
            amountInput.style.borderColor = '';
        } else if (amountInput.value) {
            amountInput.dispatchEvent(new Event('input'));
        }

        // Transaction ID enabled if invoice selected AND payment method is NOT Cash
        transactionIdInput.disabled = !hasInvoice || isCash;
        if (transactionIdInput.disabled) {
            transactionIdInput.value = '';
        } else if (transactionIdInput.value) {
            transactionIdInput.dispatchEvent(new Event('input'));
        }

        updateSaveButtonState();
    }

    // ---------- Auto-populate customer name & payment method on invoice change ----------
    function onInvoiceChange() {
        const selectedId = invoiceIdHidden.value;
        if (selectedId && invoiceMap.has(selectedId)) {
            const invoiceData = invoiceMap.get(selectedId);
            customerNameInput.value = invoiceData.customerName.slice(0, 15);

            // Auto-fill payment method from invoice
            const newMethod = invoiceData.paymentMethod || '';
            if (paymentMethodInput.value !== newMethod) {
                paymentMethodInput.value = newMethod;
                // Trigger change event so that field states (transaction ID) update
                paymentMethodInput.dispatchEvent(new Event('change', { bubbles: true }));
            }

            if (amountInput.value && !amountInput.disabled) {
                amountInput.dispatchEvent(new Event('input'));
            }
        } else {
            customerNameInput.value = '';
            paymentMethodInput.value = '';
            paymentMethodInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        updateFieldStates();
        updateSaveButtonState();
    }

    // ---------- Invoice Dropdown (populated from /api/invoices_payments) ----------
    async function loadInvoices() {
        try {
            invoiceSelected.textContent = 'Loading invoices...';
            const response = await fetch('/api/invoices_payments');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (!Array.isArray(data)) throw new Error('Invalid response format');
            populateInvoiceDropdown(data);
        } catch (error) {
            console.error('Error loading invoices:', error);
            invoiceSelected.textContent = 'Error loading invoices';
            showToast(errorToast, 3000);
            updateSaveButtonState();
        }
    }

    function populateInvoiceDropdown(invoices) {
        invoiceOptionsDiv.innerHTML = '';
        invoiceMap.clear();

        // ========== MODIFICATION: Show "No invoice id found" when no invoices ==========
        if (!invoices.length) {
            invoiceSelected.textContent = 'No invoice id found';
            invoiceIdHidden.value = '';
            // Clear any previously selected customer/payment method
            customerNameInput.value = '';
            paymentMethodInput.value = '';
            updateFieldStates();   // will disable amount and transaction ID
            return;
        }

        invoiceSelected.textContent = ' Select Invoice Id';
        invoiceIdHidden.value = '';

        invoices.forEach(inv => {
            const invoiceId = inv.id;
            let customerName = inv.customer_name || '';
            if (customerName.length > 15) customerName = customerName.slice(0, 15);
            let balanceDue = inv.balance_due !== undefined ? parseFloat(inv.balance_due) : null;
            if (isNaN(balanceDue)) balanceDue = null;
            const paymentMethod = inv.payment_method || '';

            invoiceMap.set(invoiceId, { customerName, balanceDue, paymentMethod });

            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.textContent = customerName ? `${invoiceId} - ${customerName}` : invoiceId;
            option.dataset.value = invoiceId;
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                invoiceIdHidden.value = invoiceId;
                invoiceSelected.textContent = option.textContent;
                document.querySelectorAll('#invoiceOptions .dropdown-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                invoiceOptionsDiv.style.display = 'none';
                invoiceIdHidden.dispatchEvent(new Event('change', { bubbles: true }));
                updateSaveButtonState();
            });
            invoiceOptionsDiv.appendChild(option);
        });

        invoiceIdHidden.removeEventListener('change', onInvoiceChange);
        invoiceIdHidden.addEventListener('change', onInvoiceChange);
    }

    function initInvoiceDropdown() {
        if (!invoiceDropdown || !invoiceSelected || !invoiceOptionsDiv) return;

        invoiceSelected.addEventListener('click', (e) => {
            e.stopPropagation();
            // Only open dropdown if there are options (i.e., invoices exist)
            if (invoiceOptionsDiv.children.length > 0) {
                invoiceOptionsDiv.style.display = invoiceOptionsDiv.style.display === 'block' ? 'none' : 'block';
            }
        });

        document.addEventListener('click', () => {
            invoiceOptionsDiv.style.display = 'none';
        });

        invoiceIdHidden.addEventListener('change', () => {
            const val = invoiceIdHidden.value;
            const selectedOption = Array.from(invoiceOptionsDiv.querySelectorAll('.dropdown-option'))
                .find(opt => opt.dataset.value === val);
            if (selectedOption) {
                invoiceSelected.textContent = selectedOption.textContent;
                invoiceOptionsDiv.querySelectorAll('.dropdown-option').forEach(opt => opt.classList.remove('active'));
                selectedOption.classList.add('active');
            } else {
                // If no invoice selected and there are no invoices at all, keep the "No invoice id found" text
                if (invoiceOptionsDiv.children.length === 0) {
                    invoiceSelected.textContent = 'No invoice id found';
                } else {
                    invoiceSelected.textContent = '-- Select Invoice --';
                }
            }
            updateSaveButtonState();
        });
    }

    // ---------- Amount validation with clamping and two decimal limit ----------
    function setupAmountValidation() {
        if (!amountInput) return;
        
        amountInput.addEventListener('input', function() {
            if (amountInput.disabled) return;
            
            let rawValue = this.value.trim();
            if (rawValue === '') {
                updateSaveButtonState();
                return;
            }
            
            let cleaned = rawValue.replace(/[^0-9.]/g, '');
            let parts = cleaned.split('.');
            if (parts.length > 2) {
                cleaned = parts[0] + '.' + parts.slice(1).join('');
            }
            if (parts.length === 2 && parts[1].length > 2) {
                cleaned = parts[0] + '.' + parts[1].slice(0, 2);
            }
            this.value = cleaned;
            
            let amountNum = parseFloat(cleaned);
            if (isNaN(amountNum)) {
                updateSaveButtonState();
                return;
            }
            
            const selectedId = invoiceIdHidden.value;
            if (selectedId && invoiceMap.has(selectedId)) {
                const balanceDue = invoiceMap.get(selectedId).balanceDue;
                if (balanceDue !== null && amountNum > balanceDue) {
                    const clamped = balanceDue.toFixed(2);
                    this.value = clamped;
                    showAmountExceedsPopup(balanceDue);
                    amountNum = balanceDue;
                    this.style.borderColor = '#b3261e';
                } else {
                    this.style.borderColor = '';
                }
            } else {
                this.style.borderColor = '';
            }
            updateSaveButtonState();
        });
        
        amountInput.addEventListener('blur', function() {
            if (amountInput.disabled) return;
            let val = this.value.trim();
            if (val === '') return;
            let num = parseFloat(val);
            if (!isNaN(num)) {
                this.value = num.toFixed(2);
            }
            if (isValidAmount()) {
                this.style.borderColor = '';
            }
            updateSaveButtonState();
        });
    }

    // ---------- Date validation ----------
    function setupDateValidation() {
        if (!paymentDateInput) return;
        
        function validateDateInput() {
            const dateVal = paymentDateInput.value;
            if (dateVal === '') {
                updateSaveButtonState();
                return;
            }
            const isValid = isValidDate();
            if (!isValid) {
                showInvalidDatePopup();
                paymentDateInput.style.borderColor = '#b3261e';
            } else {
                paymentDateInput.style.borderColor = '';
            }
            updateSaveButtonState();
        }
        
        paymentDateInput.addEventListener('input', validateDateInput);
        paymentDateInput.addEventListener('blur', validateDateInput);
        paymentDateInput.addEventListener('change', validateDateInput);
    }

    // ---------- Reset form ----------
    function resetForm() {
        customerNameInput.value = '';
        paymentMethodInput.value = '';
        transactionIdInput.value = '';
        invoiceIdHidden.value = '';
        amountInput.value = '';
        notesTextarea.value = '';
        if (notesCounter) notesCounter.innerText = '0';
        // Reset dropdown display
        if (invoiceSelected) {
            if (invoiceOptionsDiv.children.length === 0) {
                invoiceSelected.textContent = 'No invoice id found';
            } else {
                invoiceSelected.textContent = '-- Select Invoice --';
            }
        }
        // Reset any active option highlight
        const activeOpt = invoiceOptionsDiv.querySelector('.dropdown-option.active');
        if (activeOpt) activeOpt.classList.remove('active');
        updateFieldStates();
        updateSaveButtonState();
    }

    function setDefaultDate() {
        if (!paymentDateInput.value) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            paymentDateInput.value = `${yyyy}-${mm}-${dd}`;
        }
    }

    // ---------- Save handler ----------
    async function updateInvoiceAmountPaid(invoiceId, amount, paymentRefNo, transactionDate) {
        try {
            const response = await fetch(`/api/invoice-summary/${invoiceId}/add-payment`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    payment_ref_no: paymentRefNo,
                    transaction_date: transactionDate
                })
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Error updating invoice summary:', error);
            return false;
        }
    }

    function savePaymentHandler() {
        if (!isFullValid()) {
            showToast(errorToast, 2800);
            return;
        }

        const paymentData = {
            customerName: customerNameInput.value.trim().slice(0, 15),
            paymentMethod: paymentMethodInput.value.trim(),
            transactionId: transactionIdInput.value.trim().slice(0, 15),
            invoiceId: invoiceIdHidden.value,
            amount: amountInput.value.trim(),
            date: paymentDateInput.value,
            notes: notesTextarea.value.trim()
        };

        fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
        })
        .then(response => response.json().catch(() => { throw new Error('Invalid JSON response'); }))
        .then(async (data) => {
            if (data.success) {
                const updated = await updateInvoiceAmountPaid(
                    paymentData.invoiceId,
                    paymentData.amount,
                    paymentData.transactionId,
                    paymentData.date
                );
                if (!updated) {
                    console.warn('Payment recorded but invoice summary not updated.');
                }
                showToast(successToast, 2600);
                setTimeout(async () => {
                    resetForm();
                    await loadInvoices();
                    if (customerNameInput) customerNameInput.focus();
                }, 800);
            } else {
                console.error('Server error:', data.error || 'Unknown error');
                showToast(errorToast, 2800);
            }
        })
        .catch(error => {
            console.error('Network or parsing error:', error);
            showToast(errorToast, 2800);
        });
    }

    function cancelHandler() {
        window.location.href = '/invoice-list';   // redirect to invoice list
    }

    // ---------- Input restrictions ----------
    function restrictCustomerName() {
        if (!customerNameInput) return;
        customerNameInput.addEventListener('input', () => {
            let raw = customerNameInput.value;
            let filtered = raw.replace(/[^A-Za-z\s\-']/g, '');
            if (filtered !== raw) customerNameInput.value = filtered;
            if (customerNameInput.value.length > 15) customerNameInput.value = customerNameInput.value.slice(0, 15);
            updateSaveButtonState();
        });
    }

    function restrictTransactionId() {
        if (!transactionIdInput) return;
        transactionIdInput.addEventListener('input', () => {
            if (transactionIdInput.disabled) return;
            let raw = transactionIdInput.value;
            let filtered = raw.replace(/[^A-Za-z0-9]/g, '');
            if (filtered !== raw) transactionIdInput.value = filtered;
            if (transactionIdInput.value.length > 15) transactionIdInput.value = transactionIdInput.value.slice(0, 15);
            updateSaveButtonState();
        });
    }

    function restrictAmount() {
        if (!amountInput) return;
        amountInput.addEventListener('keydown', (e) => {
            if (amountInput.disabled) {
                e.preventDefault();
                return;
            }
            const key = e.key;
            if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
            if (key === '.' && amountInput.value.includes('.')) {
                e.preventDefault();
                return;
            }
            if (!/[0-9.]/.test(key)) e.preventDefault();
        });
    }

    function restrictNotes() {
        if (!notesTextarea) return;
        notesTextarea.addEventListener('input', () => {
            if (notesTextarea.value.length > 100) notesTextarea.value = notesTextarea.value.slice(0, 100);
            if (notesCounter) notesCounter.innerText = notesTextarea.value.length;
            updateSaveButtonState();
        });
    }

    function attachEvents() {
        if (customerNameInput) customerNameInput.addEventListener('blur', updateSaveButtonState);
        if (paymentMethodInput) paymentMethodInput.addEventListener('change', updateFieldStates);   // re-evaluate when method changes
        if (transactionIdInput) transactionIdInput.addEventListener('blur', updateSaveButtonState);
        if (amountInput) amountInput.addEventListener('blur', updateSaveButtonState);
        if (paymentDateInput) paymentDateInput.addEventListener('blur', updateSaveButtonState);
    }

    // ---------- Initialisation ----------
    async function init() {
        if (amountInput) amountInput.disabled = true;
        if (transactionIdInput) transactionIdInput.disabled = true;
        if (paymentMethodInput) paymentMethodInput.disabled = true;   // read-only, auto-filled

        restrictCustomerName();
        restrictTransactionId();
        restrictAmount();
        restrictNotes();
        attachEvents();
        setDefaultDate();

        initInvoiceDropdown();
        setupAmountValidation();
        setupDateValidation();

        await loadInvoices();

        updateFieldStates();
        updateSaveButtonState();
        if (saveButton) saveButton.addEventListener('click', savePaymentHandler);
        const cancelBtn = document.getElementById('cancelPaymentBtn');
        if (cancelBtn) cancelBtn.addEventListener('click', cancelHandler);
        if (notesCounter) notesCounter.innerText = '0';
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();