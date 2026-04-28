


// =========================================
// SHOW TOAST FUNCTION
// =========================================
function showToast(message, type = 'info') {
    console.log(`Toast (${type}): ${message}`);

    if (type !== 'success' && type !== 'error' && type !== 'warning') return;

    const toast = document.createElement('div');
    toast.className = type === 'success' ? 'success-notification' : 'error-notification';
    const icon = document.createElement('span');
    icon.textContent = type === 'success' ? '✓' : '✕';
    icon.style.fontSize = '18px';
    icon.style.fontWeight = '700';
    icon.style.lineHeight = '1';

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);

    // Inline fallback so toast is visible even if page CSS lacks toast classes.
    const isError = type === 'error' || type === 'warning';
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%) translateY(-100px)';
    toast.style.padding = '14px 28px';
    toast.style.borderRadius = '10px';
    toast.style.fontSize = '15px';
    toast.style.fontWeight = '600';
    toast.style.zIndex = '10000';
    toast.style.opacity = '0';
    toast.style.transition = 'all 0.35s ease';
    toast.style.pointerEvents = 'none';
    toast.style.whiteSpace = 'nowrap';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '8px';
    toast.style.background = isError
        ? 'linear-gradient(135deg, #ffe6e6, #ffc2c2)'
        : 'linear-gradient(135deg, #fff4f4, #ffe8e8)';
    toast.style.color = '#a12828';
    toast.style.border = '1.5px solid #a12828';
    toast.style.boxShadow = isError
        ? '0 8px 24px rgba(161, 40, 40, 0.35)'
        : '0 8px 24px rgba(161, 40, 40, 0.25)';

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('show');
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
    setTimeout(() => {
        toast.classList.remove('show');
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-100px)';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

document.addEventListener("DOMContentLoaded", () => {
    const INVOICE_INVALID_DATE_MSG = "Invalid date. Use format YYYY-MM-DD (e.g. 2026-03-09).";
    const INVOICE_DATE_RANGE_ERROR = "Invoice From date cannot be later than Invoice To date";

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

    function normalizeDateKey(value) {
        if (!value) return null;
        // yyyy-mm-dd (native date input value)
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        // dd-mm-yyyy (defensive fallback)
        if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
            const [dd, mm, yyyy] = value.split("-");
            return `${yyyy}-${mm}-${dd}`;
        }
        // Last fallback for unexpected values
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return null;
        return d.toISOString().slice(0, 10);
    }

    function isValidListDateString(value) {
        if (!value || typeof value !== "string") return false;
        const trimmed = value.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
        const parts = trimmed.split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (y < 1900 || y > 2100) return false;
        const date = new Date(y, m, d);
        return (
            date.getFullYear() === y &&
            date.getMonth() === m &&
            date.getDate() === d
        );
    }

    function hasInvalidDateRange(fromValue, toValue) {
        const from = normalizeDateKey(fromValue);
        const to = normalizeDateKey(toValue);
        if (!from || !to) return false;
        return to < from;
    }

    // =========================================
    // DATE VALIDATION FUNCTION
    // =========================================
    function handleFromDateFilter() {
        const fd = fromDateInput?.value?.trim() || "";
        if (fd && !isValidListDateString(fd)) {
            showToast(INVOICE_INVALID_DATE_MSG, "error");
            if (fromDateInput) fromDateInput.value = "";
            applyFilters();
            return;
        }
        const td = toDateInput?.value?.trim() || "";
        if (td && !isValidListDateString(td)) {
            showToast(INVOICE_INVALID_DATE_MSG, "error");
            if (toDateInput) toDateInput.value = "";
            applyFilters();
            return;
        }

        if (hasInvalidDateRange(fd, td)) {
            showToast(INVOICE_DATE_RANGE_ERROR, "error");
            if (fromDateInput) fromDateInput.value = "";
        }
        applyFilters();
    }

    function handleToDateFilter() {
        const td = toDateInput?.value?.trim() || "";
        if (td && !isValidListDateString(td)) {
            showToast(INVOICE_INVALID_DATE_MSG, "error");
            if (toDateInput) toDateInput.value = "";
            applyFilters();
            return;
        }
        const fd = fromDateInput?.value?.trim() || "";
        if (fd && !isValidListDateString(fd)) {
            showToast(INVOICE_INVALID_DATE_MSG, "error");
            if (fromDateInput) fromDateInput.value = "";
            applyFilters();
            return;
        }

        if (hasInvalidDateRange(fd, td)) {
            showToast(INVOICE_DATE_RANGE_ERROR, "error");
            if (toDateInput) toDateInput.value = "";
        }
        applyFilters();
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
        e.preventDefault();
        e.stopPropagation();
        const button = e.currentTarget;
        const dropdown = button ? button.nextElementSibling : null;
        const shouldOpen = dropdown && dropdown.style.display !== "block";
        document.querySelectorAll(".dropdown").forEach(d => d.style.display = "none");
        if (dropdown) dropdown.style.display = shouldOpen ? "block" : "none";
    }

    document.addEventListener("click", (e) => {
        // Do not auto-close when user interacts inside action menu.
        if (e.target.closest(".menu-container")) return;
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
            row.dataset.kind = "invoice-row";

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
                    <button class="menu-btn dn-act-dots" type="button" aria-label="Open actions">⋮</button>
                    <div class="dropdown dn-act-fly" style="display: none;">
                        <div class="dn-act-item" data-href="/new-invoice?invoice_id=${invoice.invoice_id}">
                            <a href="/new-invoice?invoice_id=${invoice.invoice_id}" style="text-decoration:none; color: #111;">${detailsText}</a>
                        </div>
                        <div class="dn-act-item ${disabledClass}" ${disabledAttr} data-href="/generate-invoice-return/${invoice.invoice_id}">
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
            const row = chk.closest("tr");
            if (row) row.classList.toggle("row-selected", isChecked);
        });
    }

    function updateSelectAllState() {
        const selectAll = document.getElementById("selectAll");
        if (!selectAll) return;
        const checkboxes = document.querySelectorAll(".invoice-checkbox");
        if (!checkboxes.length) {
            selectAll.checked = false;
            return;
        }
        const checkedCount = Array.from(checkboxes).filter(chk => chk.checked).length;
        selectAll.checked = checkedCount === checkboxes.length;
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

        if (statusVal === 'send') statusVal = 'send';

        const allRows = document.querySelectorAll('#invoiceTableBody tr[data-kind="invoice-row"]');
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
        const tbody = document.getElementById("invoiceTableBody");
        if (!tbody) return;

        // Remove previous empty-state row before repainting
        const existingNoDataRow = tbody.querySelector('tr[data-kind="no-data"]');
        if (existingNoDataRow) existingNoDataRow.remove();

        // Hide all rows first
        const allRows = document.querySelectorAll('#invoiceTableBody tr[data-kind="invoice-row"]');
        allRows.forEach(row => row.style.display = "none");

        // Check if there are any filtered rows
        if (filteredRows.length === 0) {
            const noDataRow = tbody.insertRow();
            noDataRow.dataset.kind = "no-data";
            const cell = noDataRow.insertCell(0);
            cell.colSpan = 9;
            cell.className = "dn-empty";
            cell.textContent = "No invoices found";
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
        updateSelectAllState();
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
        fromDateInput.addEventListener("change", handleFromDateFilter);
        fromDateInput.addEventListener("blur", handleFromDateFilter);
    }
    
    if (toDateInput) {
        toDateInput.addEventListener("change", handleToDateFilter);
        toDateInput.addEventListener("blur", handleToDateFilter);
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

    // Keep row highlighting + mark-all state in sync
    document.addEventListener("change", (e) => {
        if (!e.target.classList.contains("invoice-checkbox")) return;
        const row = e.target.closest("tr");
        if (row) row.classList.toggle("row-selected", e.target.checked);
        updateSelectAllState();
    });

    // Make full dropdown action row clickable on first click.
    document.addEventListener("click", (e) => {
        const item = e.target.closest(".dn-act-item");
        if (!item) return;
        if (item.classList.contains("dn-act-item-disabled")) return;
        const href = item.getAttribute("data-href");
        if (!href) return;
        e.preventDefault();
        e.stopPropagation();
        window.location.href = href;
    });

    // Initialize button states
    setBtnDisabled(prevBtn, true);
    setBtnDisabled(nextBtn, true);
    if (totalEntries) totalEntries.textContent = "Showing 0 of 0 Entries";
    if (pageInfo) pageInfo.innerHTML = `Page <strong>0</strong> of <strong>0</strong>`;

    // Start the app
    loadInvoices();
});