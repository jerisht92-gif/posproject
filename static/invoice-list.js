


// =========================================
// SHOW TOAST FUNCTION
// =========================================
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

document.addEventListener("DOMContentLoaded", () => {
    // DOM elements with null checks
    const invoiceStatusFilter = document.getElementById("invoiceStatus");
    const paymentStatusFilter = document.getElementById("paymentStatus");
    const searchInput = document.getElementById("searchInput");
    const fromDateInput = document.getElementById("fromDate");
    const toDateInput = document.getElementById("toDate");
    const clearFilterBtn = document.getElementById("clear-filter");
    const totalEntries = document.getElementById("totalEntries");
    const pageInfo = document.getElementById("pageInfo");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const newInvoiceBtn = document.getElementById("newInvoicePage");

    // Check if critical elements exist
    if (!prevBtn || !nextBtn) {
        console.error("Pagination buttons not found in DOM");
        return;
    }

    const rowsPerPage = 10;
    let currentPage = 1;
    let filteredRows = [];
    let allInvoicesData = [];

    // Helper function to set button disabled state (same as invoice-return-list)
    function setBtnDisabled(btn, disabled) {
        if (!btn) return;
        if (disabled) {
            btn.disabled = true;
            btn.classList.add('disabled');
        } else {
            btn.disabled = false;
            btn.classList.remove('disabled');
        }
    }

    // =========================================
    // DATE VALIDATION FUNCTION
    // =========================================
    function validateDates() {
        if (!fromDateInput || !toDateInput) return true;
        
        const fromDate = fromDateInput.value;
        const toDate = toDateInput.value;
        
        if (fromDate && toDate && toDate < fromDate) {
            alert('⚠️ "To Date" cannot be earlier than "From Date". Clearing "To Date" field.');
            
            if (typeof showToast === 'function') {
                showToast('⚠️ "To Date" cannot be earlier than "From Date". Clearing "To Date" field.', 'warning');
            }
            
            toDateInput.value = '';
            return false;
        }
        return true;
    }

    // =========================================
    // SIMPLE OVERDUE CHECK FUNCTION
    // =========================================
    function isOverdue(invoice) {
        if (!invoice.due_date) return false;
        if (invoice.payment_status === 'Paid') return false;
        if (invoice.status === 'Cancelled') return false;
        
        const today = new Date().toISOString().split('T')[0];
        return invoice.due_date < today;
    }
    
    // =========================================
    // GET DISPLAY STATUS (with overdue override)
    // =========================================
    function getDisplayStatus(invoice) {
        if (invoice.status === 'Cancelled') return 'Cancelled';
        if (invoice.payment_status === 'Paid') return 'Paid';
        if (isOverdue(invoice)) return 'Overdue';
        return invoice.status;
    }

    // --------------------------------------------------
    // Helper: attach dropdown events for action menus
    // --------------------------------------------------
    function attachDropdownEvents() {
        const menuBtns = document.querySelectorAll(".menu-btn");
        menuBtns.forEach(btn => {
            btn.removeEventListener("click", handleMenuClick);
            btn.addEventListener("click", handleMenuClick);
        });
    }

    function handleMenuClick(e) {
        e.stopPropagation();
        document.querySelectorAll(".dropdown").forEach(d => d.style.display = "none");
        const dropdown = e.target.nextElementSibling;
        if (dropdown) dropdown.style.display = "block";
    }

    document.addEventListener("click", () => {
        document.querySelectorAll(".dropdown").forEach(d => d.style.display = "none");
    });

    // --------------------------------------------------
    // Get status color class based on status value
    // --------------------------------------------------
    function getStatusColorClass(status) {
        const statusLower = status.toLowerCase();
        switch(statusLower) {
            case 'draft': return 'status-draft';
            case 'send': return 'status-send';
            case 'paid': return 'status-paid';
            case 'overdue': return 'status-overdue';
            case 'cancelled': return 'status-cancelled';
            default: return '';
        }
    }

    // --------------------------------------------------
    // Populate table with invoice data
    // --------------------------------------------------
    function populateTable(invoices) {
        const tbody = document.getElementById("invoiceTableBody");
        if (!tbody) return;
        tbody.innerHTML = "";
        
        allInvoicesData = invoices;

        invoices.forEach((invoice) => {
            const displayStatus = getDisplayStatus(invoice);
            
            const row = tbody.insertRow();

            // Column 0: Checkbox (Mark)
            const chkCell = row.insertCell(0);
            const chk = document.createElement("input");
            chk.type = "checkbox";
            chk.classList.add("invoice-checkbox");
            chk.dataset.id = invoice.invoice_id;
            chkCell.appendChild(chk);

            // Column 1: Invoice Id
            row.insertCell(1).textContent = invoice.invoice_id;

            // Column 2: Sales Order Ref.
            row.insertCell(2).textContent = invoice.sale_order_ref || "";

            // Column 3: Customer Name
            row.insertCell(3).textContent = invoice.customer_name;

            // Column 4: Invoice Date
            row.insertCell(4).textContent = invoice.invoice_date;

            // Column 5: Due Date
            row.insertCell(5).textContent = invoice.due_date || "";

            // Column 6: Payment Status
            const payCell = row.insertCell(6);
            payCell.textContent = invoice.payment_status;
            payCell.dataset.payment = invoice.payment_status.toLowerCase();

            // Status with color styling
            const statusCell = row.insertCell(7);
            const statusColorClass = getStatusColorClass(displayStatus);
            statusCell.innerHTML = `<span class="status-badge ${statusColorClass}">${displayStatus}</span>`;
            statusCell.dataset.status = displayStatus.toLowerCase();

            // Column 8: Action
            const actionCell = row.insertCell(8);
            actionCell.className = 'so-td-action';   // ← ADD THIS
            const isDraft = displayStatus.toLowerCase() === 'draft';
            const isCancelled = displayStatus.toLowerCase() === 'cancelled';
            const detailsText = isDraft ? 'Edit details' : 'View details';
            
            const isInvoiceReturnDisabled = isDraft || isCancelled;
            const disabledClass = isInvoiceReturnDisabled ? 'dn-act-item-disabled' : '';
            const disabledAttr = isInvoiceReturnDisabled ? 'style="opacity: 0.5; pointer-events: none;"' : '';
            
            actionCell.innerHTML = `
                <div class="menu-container">
                    <button class="menu-btn dn-act-dots">⋮</button>
                    <div class="dropdown dn-act-fly" style="display: none;">
                        <div class="dn-act-item">
                            <a href="/new-invoice?invoice_id=${invoice.invoice_id}" style="text-decoration:none; color: #111;">${detailsText}</a>
                        </div>
                        <div class="dn-act-item ${disabledClass}" ${disabledAttr}>
                            <a href="/generate-invoice-return/${invoice.invoice_id}" style="text-decoration:none; color: #111;">generate invoice return</a>
                        </div>
                    </div>
                </div>
            `;
        });

        attachDropdownEvents();
        const selectAll = document.getElementById("selectAll");
        if (selectAll) {
            selectAll.removeEventListener("change", handleSelectAll);
            selectAll.addEventListener("change", handleSelectAll);
        }
    }

    // --------------------------------------------------
    // Handle "Select All" checkbox
    // --------------------------------------------------
    function handleSelectAll(e) {
        const isChecked = e.target.checked;
        document.querySelectorAll(".invoice-checkbox").forEach(chk => {
            chk.checked = isChecked;
        });
    }

    // --------------------------------------------------
    // Fetch invoices from the server
    // --------------------------------------------------
    async function loadInvoices() {
        try {
            const response = await fetch('/get-invoice');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const invoices = await response.json();
            populateTable(invoices);
            applyFilters();
        } catch (error) {
            console.error('Error loading invoices:', error);
            const tbody = document.getElementById("invoiceTableBody");
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="9" class="dn-empty">Failed to load invoices. Please try again later.</td></tr>';
            }
            // Disable buttons on error
            setBtnDisabled(prevBtn, true);
            setBtnDisabled(nextBtn, true);
            if (totalEntries) totalEntries.textContent = "Showing 0 of 0 Entries";
            if (pageInfo) pageInfo.innerHTML = `Page <strong>0</strong> of <strong>0</strong>`;
        }
    }

    // --------------------------------------------------
    // Update pagination UI (similar to invoice-return-list)
    // --------------------------------------------------
    function updatePagerUI() {
        const totalRecords = filteredRows.length;
        const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / rowsPerPage);
        
        // Set button states
        setBtnDisabled(prevBtn, currentPage <= 1 || totalRecords === 0);
        setBtnDisabled(nextBtn, currentPage >= totalPages || totalRecords === 0);
        
        // Update page info
        if (pageInfo) {
            pageInfo.innerHTML = totalPages === 0 
                ? `Page <strong>0</strong> of <strong>0</strong>` 
                : `Page <strong>${currentPage}</strong> of <strong>${totalPages}</strong>`;
        }
        
        // Update showing entries
        if (totalEntries) {
            if (totalRecords === 0) {
                totalEntries.textContent = "Showing 0 of 0 Entries";
            } else {
                const from = (currentPage - 1) * rowsPerPage + 1;
                const to = Math.min(currentPage * rowsPerPage, totalRecords);
                totalEntries.textContent = `Showing ${from} to ${to} of ${totalRecords} Entries`;
            }
        }
    }

    // --------------------------------------------------
    // Apply filters based on user selections
    // --------------------------------------------------
    function applyFilters() {
        if (!invoiceStatusFilter || !paymentStatusFilter || !searchInput || !fromDateInput || !toDateInput) return;
        
        let statusVal = invoiceStatusFilter.value.toLowerCase();
        const paymentVal = paymentStatusFilter.value.toLowerCase();
        const searchVal = searchInput.value.toLowerCase();
        const fromDate = fromDateInput.value;
        const toDate = toDateInput.value;

        // Validate date range
        if (fromDate && toDate && toDate < fromDate) {
            alert("To date cannot be earlier than From date");
            if (toDateInput) {
                toDateInput.value = "";
                toDateInput.focus();
            }
            return;
        }

        if (statusVal === 'send') statusVal = 'send';

        const allRows = document.querySelectorAll("#invoiceTableBody tr");
        filteredRows = [];

        allRows.forEach(row => {
            const invoiceId = row.children[1] ? row.children[1].textContent.toLowerCase() : '';
            const paymentStatus = row.children[6] ? row.children[6].dataset.payment : '';
            const status = row.children[7] ? row.children[7].dataset.status : '';
            const invoiceDate = row.children[4] ? row.children[4].textContent : '';

            let show = true;
            if (statusVal && status !== statusVal) show = false;
            if (paymentVal && paymentStatus !== paymentVal) show = false;
            if (searchVal && !invoiceId.includes(searchVal)) show = false;
            if (fromDate && invoiceDate < fromDate) show = false;
            if (toDate && invoiceDate > toDate) show = false;

            if (show) filteredRows.push(row);
        });

        currentPage = 1;
        renderTable();
    }

    // --------------------------------------------------
    // Render current page of the filtered rows
    // --------------------------------------------------
    function renderTable() {
        // Hide all rows first
        const allRows = document.querySelectorAll("#invoiceTableBody tr");
        allRows.forEach(row => row.style.display = "none");

        // Check if there are any filtered rows
        if (filteredRows.length === 0) {
            updatePagerUI();
            return;
        }

        // Compute the rows for the current page
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const pageRows = filteredRows.slice(start, end);
        pageRows.forEach(row => row.style.display = "");

        // Update pagination
        updatePagerUI();
    }

    // --------------------------------------------------
    // Sorting the table rows
    // --------------------------------------------------
    function sortTableRows(sortType) {
        const statusOrder = {
            'draft': 1,
            'send': 2,
            'paid': 3,
            'overdue': 4,
            'cancelled': 5
        };

        filteredRows.sort((a, b) => {
            const statusA = a.children[7] ? a.children[7].dataset.status : '';
            const statusB = b.children[7] ? b.children[7].dataset.status : '';
            const dateA = a.children[4] ? a.children[4].textContent : '';
            const dateB = b.children[4] ? b.children[4].textContent : '';

            switch (sortType) {
                case 'newest':
                    return dateB.localeCompare(dateA);
                case 'oldest':
                    return dateA.localeCompare(dateB);
                case 'progress':
                    return (statusOrder[statusA] || 0) - (statusOrder[statusB] || 0);
                case 'reverse':
                    return (statusOrder[statusB] || 0) - (statusOrder[statusA] || 0);
                default:
                    return 0;
            }
        });

        const tbody = document.getElementById("invoiceTableBody");
        if (tbody) {
            filteredRows.forEach(row => tbody.appendChild(row));
        }

        currentPage = 1;
        renderTable();
    }

    // --------------------------------------------------
    // Status sort menu
    // --------------------------------------------------
    const statusSortTh = document.getElementById('statusSortTh');
    const statusSortMenu = document.getElementById('statusSortMenu');

    if (statusSortTh && statusSortMenu) {
        statusSortTh.addEventListener('click', (e) => {
            e.stopPropagation();
            statusSortMenu.style.display = statusSortMenu.style.display === 'block' ? 'none' : 'block';
        });

        document.addEventListener('click', (e) => {
            if (!statusSortTh.contains(e.target)) {
                statusSortMenu.style.display = 'none';
            }
        });

        const sortButtons = statusSortMenu.querySelectorAll('button');
        sortButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sortType = btn.getAttribute('data-sort');
                if (sortType) sortTableRows(sortType);
                statusSortMenu.style.display = 'none';
            });
        });
    }

    // --------------------------------------------------
    // Pagination buttons with safety checks
    // --------------------------------------------------
    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (!prevBtn.disabled && currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;
            if (!nextBtn.disabled && currentPage < totalPages && filteredRows.length > 0) {
                currentPage++;
                renderTable();
            }
        });
    }

    // --------------------------------------------------
    // Event listeners for filters
    // --------------------------------------------------
    if (invoiceStatusFilter) invoiceStatusFilter.addEventListener("change", applyFilters);
    if (paymentStatusFilter) paymentStatusFilter.addEventListener("change", applyFilters);
    if (searchInput) searchInput.addEventListener("input", applyFilters);
    
    if (fromDateInput) {
        fromDateInput.addEventListener("change", () => {
            validateDates();
            applyFilters();
        });
    }
    
    if (toDateInput) {
        toDateInput.addEventListener("change", () => {
            validateDates();
            applyFilters();
        });
    }

    if (clearFilterBtn) {
        clearFilterBtn.addEventListener("click", () => {
            if (invoiceStatusFilter) invoiceStatusFilter.value = "";
            if (paymentStatusFilter) paymentStatusFilter.value = "";
            if (searchInput) searchInput.value = "";
            if (fromDateInput) fromDateInput.value = "";
            if (toDateInput) toDateInput.value = "";
            applyFilters();
        });
    }

    if (newInvoiceBtn) {
        newInvoiceBtn.addEventListener("click", () => {
            window.location.href = "/new-invoice";
        });
    }

    // Initialize button states
    setBtnDisabled(prevBtn, true);
    setBtnDisabled(nextBtn, true);
    if (totalEntries) totalEntries.textContent = "Showing 0 of 0 Entries";
    if (pageInfo) pageInfo.innerHTML = `Page <strong>0</strong> of <strong>0</strong>`;

    // Start the app
    loadInvoices();
});