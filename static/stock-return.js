document.addEventListener("DOMContentLoaded", () => {

    let page = 1;
    const pageSize = 10;

    let data = [];

    const tbody = document.getElementById("srnTbody");

    const supplier =
        document.getElementById("supplierFilter");

    const status =
        document.getElementById("statusFilter");

    const search =
        document.getElementById("srnSearch");

    const fromDate =
        document.getElementById("fromDate");

    const toDate =
        document.getElementById("toDate");

    const prevBtn =
        document.getElementById("prevBtn");

    const nextBtn =
        document.getElementById("nextBtn");

    // =========================================
    // LOAD DATA
    // =========================================

// ✅ LOAD DATA FROM BACKEND
async function loadData() {

    try {

        const res =
            await fetch("/api/stock-returns");

        const response =
            await res.json();

        console.log("API RESPONSE:", response);

        // ✅ IMPORTANT
        data = response.data || [];

        // ✅ LOAD SUPPLIER DROPDOWN
        loadSupplierDropdown(data);

        // ✅ RENDER TABLE
        render(data);

    } catch (err) {

        console.error(
            "Failed to load data:",
            err
        );
    }
}

// =====================================
// LOAD SUPPLIER DROPDOWN
// =====================================

function loadSupplierDropdown(data) {

    const supplierFilter =
        document.getElementById("supplierFilter");

    // RESET
    supplierFilter.innerHTML = `
        <option value="all">All</option>
    `;

    // UNIQUE SUPPLIERS
    const suppliers = [
        ...new Set(
            data.map(d => d.supplier_name)
        )
    ];

    suppliers.forEach(name => {

        if (!name) return;

        supplierFilter.innerHTML += `
            <option value="${name}">
                ${name}
            </option>
        `;
    });
}

    // =========================================
    // STATUS RULES
    // =========================================

    function getDisabled(action, status) {

        status = (status || "").toLowerCase();

        if (status === "draft") {
            return action === "edit" ? "" : "disabled";
        }

        if (status === "submitted") {
            return "";
        }

        if (status === "cancelled") {
            return (
                action === "view" ||
                action === "edit"
            ) ? "" : "disabled";
        }

        if (status === "returned") {
            return "disabled";
        }

        return "";
    }

    // =========================================
    // DATE FILTER
    // =========================================

    function inDateRange(date, from, to) {

        if (!date) return true;

        const d = new Date(date);

        if (from && d < new Date(from))
            return false;

        if (to && d > new Date(to))
            return false;

        return true;
    }

    // =========================================
    // FILTER DATA
    // =========================================

    function getFilteredData() {

        let filtered = [...data];

        // Supplier Filter
        if (supplier.value !== "all") {

                filtered = filtered.filter(
                    d => d.supplier_name === supplier.value
                );
        }

        // Status Filter
        if (status.value !== "all") {

            filtered = filtered.filter(d =>
                d.status.toLowerCase() ===
                status.value.toLowerCase()
            );
        }

        // Search
        if (search.value.trim()) {

            const q =
                search.value.toLowerCase();

            filtered = filtered.filter(d =>

                (d.srn_number || "")
                .toLowerCase()
                .includes(q)

                ||

                (d.supplier_name || "")
                .toLowerCase()
                .includes(q)

                ||

                (d.grn_number || "")
                .toLowerCase()
                .includes(q)
            );
        }

        // Date
        filtered = filtered.filter(d =>
            inDateRange(
                d.return_date,
                fromDate.value,
                toDate.value
            )
        );

        return filtered;
    }

    // =========================================
    // RENDER TABLE
    // =========================================

    function render(list) {

        const total = list.length;

        const totalPages =
            Math.ceil(total / pageSize) || 1;

        if (page > totalPages)
            page = totalPages;

        if (page < 1)
            page = 1;

        const start =
            (page - 1) * pageSize;

        const pageData =
            list.slice(start, start + pageSize);

        tbody.innerHTML = "";

        if (!pageData.length) {

            tbody.innerHTML = `

                <tr>
                    <td colspan="8" style="text-align:left; padding-left:16px;">
                        No Stock Returns Found
                    </td>
                </tr>
            `;
        }

        pageData.forEach((r, index) => {

            tbody.innerHTML += `

                <tr>

                    <td>
                        ${r.srn_number || ""}
                    </td>

                    <td>
                        ${r.grn_number || ""}
                    </td>

                    <td>
                        ${r.return_date || ""}
                    </td>

                    <td>
                        ${r.supplier_name || ""}
                    </td>

                    <td>
                        ${r.return_by || ""}
                    </td>

                    <td>

                        <span class="badge ${r.status.toLowerCase()}">

                            ${r.status || ""}

                        </span>

                    </td>

                   <td>

                    <div class="action-wrap">

                        <button class="action-btn">⋮</button>

                        <div class="action-menu">

                            ${
                                r.status?.toLowerCase() === "draft"
                                ?
                                `
                                <div class="action-item"
                                    data-action="edit"
                                    data-srn="${r.srn_number}">
                                    Edit
                                </div>

                                <div class="action-item" data-action="delete">
                                    Delete
                                </div>
                                `
                                :
                                ""
                            }

                            ${
                                r.status?.toLowerCase() === "submitted"
                                ?
                                `
                                <div class="action-item"
                                    data-action="view"
                                    data-srn="${r.srn_number}">
                                    View
                                </div>

                                <div class="action-item" data-action="debit">
                                    Debit Note
                                </div>
                                `
                                :
                                ""
                            }

                            ${
                                r.status?.toLowerCase() === "cancelled"
                                ?
                                `
                                <div class="action-item"
                                    data-action="view"
                                    data-srn="${r.srn_number}">
                                    View
                                </div>
                                `
                                :
                                ""
                            }

                            ${
                                r.status?.toLowerCase() === "rejected"
                                ?
                                `
                                <div class="action-item"
                                    data-action="view"
                                    data-srn="${r.srn_number}">
                                    View
                                </div>
                                `
                                :
                                ""
                            }

                        </div>

                    </div>

                    </td>

                </tr>
            `;
        });

        document.getElementById(
            "showingText"
        ).textContent =

            `Showing ${total === 0 ? 0 : start + 1}
            to ${start + pageData.length}
            of ${total} Entries`;

        document.getElementById(
            "pageNow"
        ).textContent = page;

        document.getElementById(
            "pageTotal"
        ).textContent = totalPages;

        prevBtn.disabled = page === 1;

        nextBtn.disabled =
            page === totalPages;
    }

    // =========================================
    // FILTER
    // =========================================

    function filterData() {

        page = 1;

        render(getFilteredData());
    }

    // =========================================
    // EVENTS
    // =========================================

    supplier.addEventListener(
        "change",
        filterData
    );

    status.addEventListener(
        "change",
        filterData
    );

    search.addEventListener(
        "input",
        filterData
    );

    fromDate.addEventListener(
        "change",
        filterData
    );

    toDate.addEventListener(
        "change",
        filterData
    );

    prevBtn.addEventListener("click", () => {

        page--;

        render(getFilteredData());
    });

    nextBtn.addEventListener("click", () => {

        page++;

        render(getFilteredData());
    });

    // =========================================
    // CLEAR FILTER
    // =========================================

    document.getElementById("srnClear")
    .addEventListener("click", () => {

        supplier.value = "all";

        status.value = "all";

        search.value = "";

        fromDate.value = "";

        toDate.value = "";

        page = 1;

        render(data);
    });



    // =========================================
    // ACTION CLICK
    // =========================================

   document.addEventListener("click", function (e) {

    if (
        e.target.classList.contains("action-item") &&
        !e.target.classList.contains("disabled")
    ) {

        const action = e.target.dataset.action;
        const srnNo = e.target.dataset.srn;

        console.log("ACTION:", action);
        console.log("SRN:", srnNo);

        if (action === "view") {

            window.location.href =
                `/stock-new-return?srn=${srnNo}&mode=view`;
        }

        else if (action === "edit") {

            window.location.href =
                `/stock-new-return?srn=${srnNo}&mode=edit`;
        }

        else if (action === "delete") {

            alert("Delete");
        }

        else if (action === "debit") {

            window.location.href = "/debit-note";
        }
    }
});
    // =========================================
    // INITIAL LOAD
    // =========================================

    loadData();

});