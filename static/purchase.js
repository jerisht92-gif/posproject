document.addEventListener("DOMContentLoaded", function () {

    // -------------------------
    // ELEMENTS
    // -------------------------
    const searchInput = document.getElementById("searchInput");
    const clearBtn = document.querySelector(".clear-btn");
    const btnNext = document.querySelector(".btn-next");
    const btnPrev = document.querySelector(".btn-prev");
    const entryText = document.querySelector(".pagination span");

    const statusFilter = document.getElementById("statusFilter");
    const supplierFilter = document.getElementById("supplierFilter");
    const paymentFilter = document.getElementById("payment");

    const tbody = document.getElementById("purchaseTableBody"); // main tbody
    let allRows = [];  // will store current rows
    let filteredRows = [];

    let currentPage = 1;
    const rowsPerPage = 10;

    // -------------------------
    // FETCH PURCHASE ORDERS
    // -------------------------
    async function loadPurchaseOrders() {
        try {
            const res = await fetch("/api/purchase-list");
            const orders = await res.json();

            tbody.innerHTML = "";

            orders.forEach((order, index) => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${order.po_number}</td>
                    <td>${order.supplier || "-"}</td>
                    <td>${order.pdate || "-"}</td>
                    <td>${order.ddate || "-"}</td>
                    <td>
                        <span class="status-badge ${getStatusClass(order.status)}">
                            ${order.status}
                        </span>
                    </td>
                    <td>${order.payment || "-"}</td>
                    <td>${order.value || "-"}</td>
                    <td class="action-buttons">
                        <div class="dropdown">
                            <button class="btn-more">⋮</button>
                            <div class="dropdown-menu">
                                <button class="dropdown-item view" data-id="${order.po_number}" ${order.status === 'Draft' ? 'disabled' : ''}>View</button>
                                <button class="dropdown-item edit" data-id="${order.po_number}" ${order.status !== 'Draft' ? 'disabled' : ''}>Edit</button>
                                <button class="dropdown-item delete" data-id="${order.po_number}" ${order.status !== 'Draft' ? 'disabled' : ''}>Delete</button>
                                <button class="dropdown-item stock-receipt" data-id="${order.po_number}" ${['Draft','Cancelled','Closed'].includes(order.status) ? 'disabled' : ''}>Generate Stock Receipt</button>
                            </div>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });

            // Refresh rows
            allRows = Array.from(tbody.querySelectorAll("tr"));
            filteredRows = [...allRows];

            applyFilters(); // apply filters and show first page

        } catch (err) {
            console.error("Error loading purchase orders:", err);
        }
    }

    // -------------------------
    // STATUS CLASS
    // -------------------------
    function getStatusClass(status) {
        switch (status) {
            case 'Draft': return 'status-draft';
            case 'Submitted': return 'status-submitted';
            case 'Partially Received': return 'status-partial';
            case 'Received': return 'status-received';
            case 'Cancelled': return 'status-cancelled';
            case 'Closed': return 'status-closed';
            default: return '';
        }
    }

    // -------------------------
    // FILTER FUNCTION
    // -------------------------
    function applyFilters() {
        const searchValue = searchInput.value.toLowerCase();
        const statusValue = statusFilter.value.toLowerCase();
        const supplierValue = supplierFilter.value.toLowerCase();
        const paymentValue = paymentFilter.value.toLowerCase();

        filteredRows = allRows.filter(row => {
            const text = row.innerText.toLowerCase();
            const status = row.children[5].innerText.toLowerCase();
            const supplier = row.children[2].innerText.toLowerCase();
            const payment = row.children[6].innerText.toLowerCase();

            return (
                text.includes(searchValue) &&
                (!statusValue || status.includes(statusValue)) &&
                (!supplierValue || supplier.includes(supplierValue)) &&
                (!paymentValue || payment.includes(paymentValue))
            );
        });

        showPage(1);
    }

    // -------------------------
    // PAGINATION
    // -------------------------
function showPage(page) {
    const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
    if (page > totalPages) page = totalPages || 1;
    currentPage = page;

    const start = (page - 1) * rowsPerPage;
    const end = Math.min(start + rowsPerPage, filteredRows.length);

    allRows.forEach(row => row.style.display = "none");
    filteredRows.forEach((row, index) => {
        if (index >= start && index < end) row.style.display = "";
    });

    document.querySelector(".page-info").innerText = `Page ${currentPage} of ${totalPages || 1}`;
    btnPrev.disabled = currentPage === 1;
    btnNext.disabled = currentPage === totalPages;

    if (filteredRows.length === 0) {
        entryText.innerText = `Showing 0 of 0 Entries`;
    } else {
        entryText.innerText = `Showing ${start + 1}-${end} of ${filteredRows.length} Entries`;
    }
}

    // -------------------------
    // EVENT LISTENERS
    // -------------------------
    searchInput.addEventListener("keyup", applyFilters);
    statusFilter.addEventListener("change", applyFilters);
    supplierFilter.addEventListener("change", applyFilters);
    paymentFilter.addEventListener("change", applyFilters);

    clearBtn.addEventListener("click", function () {
        searchInput.value = "";
        statusFilter.value = "";
        supplierFilter.value = "";
        paymentFilter.value = "";
        applyFilters();
    });

    btnNext.addEventListener("click", () => showPage(currentPage + 1));
    btnPrev.addEventListener("click", () => showPage(currentPage - 1));

    // -------------------------
    // DROPDOWN TOGGLE (Delegation)
    // -------------------------
    document.addEventListener("click", function (e) {
        const btn = e.target.closest(".btn-more");
        if (btn) {
            e.stopPropagation();
            // Close all other dropdowns
            document.querySelectorAll(".dropdown").forEach(d => {
                if (d !== btn.parentElement) d.classList.remove("show");
            });
            // Toggle this dropdown
            btn.parentElement.classList.toggle("show");
        } else {
            // Click outside - close all
            document.querySelectorAll(".dropdown").forEach(d => d.classList.remove("show"));
        }
    });

    // -------------------------
    // ACTION BUTTONS (Delete/Edit/View)
    // -------------------------
    document.addEventListener("click", async function (e) {
        const target = e.target.closest("button");
        if (!target) return;

        const po_number = target.dataset.id;
        if (!po_number) return;

        // DELETE
        if (target.classList.contains("delete") && !target.disabled) {
            if (confirm(`Are you sure you want to delete ${po_number}?`)) {
                try {
                    const response = await fetch(`/delete_po/${po_number}`, { method: "DELETE" });
                    const data = await response.json();
                    if (response.ok && data.success) {
                        const row = tbody.querySelector(`button[data-id="${po_number}"]`).closest("tr");
                        row.remove();
                        allRows = Array.from(tbody.querySelectorAll("tr"));
                        applyFilters();
                        alert(data.message);
                    } else {
                        alert(data.message || "Failed to delete PO.");
                    }
                } catch (err) {
                    console.error(err);
                    alert("Error deleting PO.");
                }
            }
        }

        // EDIT
        if (target.classList.contains("edit") && !target.disabled) {
            window.location.href = `/purchase/edit/${po_number}`;
        }

        // VIEW
        if (target.classList.contains("view") && !target.disabled) {
            window.location.href = `/purchase/view/${po_number}`;
        }

        // GENERATE STOCK RECEIPT
        if (target.classList.contains("stock-receipt") && !target.disabled) {
            window.location.href = `/generate_stock_receipt/${po_number}`;
        }
    });

    // -------------------------
    // INITIAL LOAD
    // -------------------------
    loadPurchaseOrders();

});