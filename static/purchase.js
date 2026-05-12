document.addEventListener("DOMContentLoaded", function () {

        // =====================================
    // VIEW MODE - DISABLE ALL FIELDS
    // =====================================

    if (window.location.pathname.includes("/purchase/view/")) {

        // Disable all inputs
        document.querySelectorAll("input").forEach(input => {
            input.readOnly = true;
        });

        // Disable all selects
        document.querySelectorAll("select").forEach(select => {
            select.disabled = true;
        });

        // Disable all textareas
        document.querySelectorAll("textarea").forEach(textarea => {
            textarea.readOnly = true;
        });

        // Disable all buttons except print / pdf / back
        document.querySelectorAll("button").forEach(button => {

            const text = button.innerText.toLowerCase();

            if (
                !text.includes("print") &&
                !text.includes("pdf") &&
                !text.includes("back")
            ) {
                button.disabled = true;
                button.style.opacity = "0.6";
                button.style.cursor = "not-allowed";
            }
        });

        showAlert("View Mode Enabled 👁️", "info");
    }
    

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
                    <td>${order.payment_terms || "-"}</td>
                    <td>₹ ${order.grand_total ? order.grand_total.toFixed(2) : "0.00"}</td>
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

            // populate supplier filter from all suppliers in DB
            try {
                const supRes = await fetch("/api/suppliers");
                const supData = await supRes.json();
                supplierFilter.innerHTML = '<option value="">All</option>';
                supData.forEach(s => {
                    if (s.name) {
                        supplierFilter.innerHTML += `<option value="${s.name}">${s.name}</option>`;
                    }
                });
            } catch (err) {
                console.error("Supplier filter load error:", err);
            }

            applyFilters();

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

    const searchValue = (searchInput.value || "").toLowerCase().trim();

    const statusValue = statusFilter.value.trim().toLowerCase();
    const supplierValue = supplierFilter.value.trim().toLowerCase();
    const paymentValue = paymentFilter.value.trim().toLowerCase();

    filteredRows = allRows.filter(row => {

        const cols = row.querySelectorAll("td");

        const rowStatus = (cols[5]?.innerText || "").trim().toLowerCase();
        const rowSupplier = (cols[2]?.innerText || "").trim().toLowerCase();
        const rowPayment = (cols[6]?.innerText || "").trim().toLowerCase();

        const rowText = row.innerText.toLowerCase();

        return (
            rowText.includes(searchValue) &&
            (statusValue === "" || rowStatus === statusValue) &&
            (supplierValue === "" || rowSupplier === supplierValue) &&
            (paymentValue === "" || rowPayment === paymentValue)
        );
    });

    showPage(1);
}

function showPage(page) {

    const totalRows = filteredRows.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);

    // ✅ EMPTY CASE
    if (totalRows === 0) {

        currentPage = 1;

        allRows.forEach(row => row.style.display = "none");

        document.querySelector(".page-info").innerHTML =
            `Page <b>0</b> of <b>0</b>`;

        btnPrev.disabled = true;
        btnNext.disabled = true;

        entryText.innerHTML = "<b>Showing 0 of 0 Entries</b>";
        return;
    }

    // ✅ FIX PAGE LIMIT
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    currentPage = page;

    const start = (currentPage - 1) * rowsPerPage;
    const end = Math.min(start + rowsPerPage, totalRows);

    // ✅ HIDE ALL
    allRows.forEach(row => row.style.display = "none");

    // ✅ SHOW CURRENT PAGE
    filteredRows.forEach((row, index) => {
        if (index >= start && index < end) {
            row.style.display = "table-row";
        }
    });

    // ✅ PAGE TEXT
    document.querySelector(".page-info").innerHTML =
        `Page <b>${currentPage}</b> of <b>${totalPages}</b>`;

    // ===========================
    // 🔥 BUTTON CONTROL (FINAL)
    // ===========================

    btnPrev.disabled = (currentPage === 1);
    btnNext.disabled = (currentPage === totalPages);

    // extra safety
    if (totalPages <= 1) {
        btnPrev.disabled = true;
        btnNext.disabled = true;
    }

    // ✅ ENTRY TEXT
    entryText.innerHTML =
        `<b>Showing ${start + 1}-${end} of ${totalRows} Entries</b>`;
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
                window.location.href = `/stock-new?id=${po_number}&mode=create`;
            }
    });

    // -------------------------
    // INITIAL LOAD
    // -------------------------
    loadPurchaseOrders();

});