// ================= DATA =================
let tableData = [];
let currentFilteredData = [];
 
let rowsPerPage = 10;
let currentPage = 1;
 
// ================= LOAD DATA =================
function loadStockReceipts() {

    fetch("/api/stock-receipts")
        .then(res => res.json())
        .then(data => {

            tableData = data.map(item => ({

                id: item.grn_number,
                po_id: item.po_number,
                supplier_name: item.supplier_name,   
                supplier: item.supplier_name,
                supplier_email: item.supplier_email,
                date: item.received_date,
                total: item.grand_total,
                status: item.status,
                received_by: item.received_by,
                qc_by: item.qc_done_by

            }));

            currentFilteredData = [...tableData];

            loadSupplierDropdown(tableData);

            displayTable(currentFilteredData);

        })
        .catch(err => {

            console.error("Error loading stock receipts:", err);

        });
}
 
function calculateTotal(items) {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (parseFloat(item.qty_accepted) || 0), 0);
}

function loadSupplierDropdown(data) {

    const supplierSet = new Set();

    const firstPageData = data.slice(0, rowsPerPage);

    firstPageData.forEach(item => {

        // 🔥 FIX HERE (use item.supplier OR item.supplier_name safely)
        const name = item.supplier_name || item.supplier;

        if (name && name.trim() !== "") {
            supplierSet.add(name);
        }
    });

    const supplierSelect = document.getElementById("suplier");

    supplierSelect.innerHTML = `<option value="all">All Suppliers</option>`;

    supplierSet.forEach(name => {
        supplierSelect.innerHTML += `<option value="${name}">${name}</option>`;
    });
}
 
// ================= DISPLAY =================
function displayTable(data){
 
    const table = document.getElementById("tableBody");
    table.innerHTML = "";
 
    const start = (currentPage-1)*rowsPerPage;
    const pageData = data.slice(start, start+rowsPerPage);
 
    pageData.forEach((row,index)=>{
        // Normalize status for badge classification and preserve display text
        const statusRaw = row.status || 'Draft';
        const statusNorm = statusRaw.toLowerCase().replace(/\s+/g, '-');
        const badgeClass = `status-badge status-${statusNorm}`;
        const statusDisplay = statusRaw;
        
        table.innerHTML += `
        <tr>
            <td>${start + index + 1}</td>
            <td>${row.id}</td>
            <td>${row.po_id}</td>
            <td>${row.supplier}</td>
            <td>${row.date}</td>
            <td>₹${parseFloat(row.total || 0).toFixed(2)}</td>
            <td><span class="${badgeClass}">${statusDisplay}</span></td>
            <td>${row.received_by}</td>
            <td>${row.qc_by}</td>
            <td>
               <button class="sr-act-dots" data-id="${row.id}" data-status="${row.status}">⋮</button>
            </td>
        </tr>
        `;
    });
 
    updatePagination(data);
}
 
// ================= PAGINATION =================
function updatePagination(data){

    const totalPages = Math.ceil(data.length / rowsPerPage);

    const start = (currentPage - 1) * rowsPerPage + 1;
    let end = currentPage * rowsPerPage;

    if (end > data.length) {
        end = data.length;
    }

    document.getElementById("pageInfo").innerText =
        `Page ${currentPage} of ${totalPages}`;

    document.getElementById("totalEntries").innerText = data.length;

    document.getElementById("showStart").innerText = data.length === 0 ? 0 : start;
    document.getElementById("showEnd").innerText = end;
}
 
document.querySelector(".prev-btn").onclick = ()=>{
    if(currentPage>1){
        currentPage--;
        displayTable(currentFilteredData);
    }
};
 
document.querySelector(".next-btn").onclick = ()=>{
    const totalPages = Math.ceil(currentFilteredData.length / rowsPerPage);
    if(currentPage<totalPages){
        currentPage++;
        displayTable(currentFilteredData);
    }
};
 
document.getElementById("srFromDate").addEventListener("change", applyFilters);
document.getElementById("srToDate").addEventListener("change", applyFilters);
// ================= FILTER + SEARCH =================
function applyFilters(){
 
    const search = document.getElementById("searchInput").value.toLowerCase();
    const status = document.getElementById("stockrecieptstatus").value.toLowerCase();
    const supplier = document.getElementById("suplier").value.toLowerCase();
 
    const fromDate = document.getElementById("srFromDate").value;
    const toDate = document.getElementById("srToDate").value;
 
    currentFilteredData = tableData.filter(row => {
 
        const searchMatch = row.id.toLowerCase().includes(search);
        const statusMatch = (status === "all") || (row.status === status);
        const supplierMatch =
            (supplier === "all") ||
            (row.supplier_name === supplier);
 
        // DATE FILTER (FIXED)
        let dateMatch = true;
 
        if (fromDate && toDate) {
            dateMatch = row.date >= fromDate && row.date <= toDate;
        }
        else if (fromDate) {
            dateMatch = row.date >= fromDate;
        }
        else if (toDate) {
            dateMatch = row.date <= toDate;
        }
 
        return searchMatch && statusMatch && supplierMatch && dateMatch;
    });
 
    currentPage = 1;
    displayTable(currentFilteredData);
}
 
// EVENTS
document.getElementById("searchInput").addEventListener("input", applyFilters);
document.getElementById("stockrecieptstatus").addEventListener("change", applyFilters);
document.getElementById("suplier").addEventListener("change", applyFilters);
 
// ================= CLEAR =================
document.querySelector(".clear-filter").onclick = ()=>{
 
    document.getElementById("searchInput").value = "";
    document.getElementById("stockrecieptstatus").value = "all";
    document.getElementById("suplier").value = "all";
 
    document.getElementById("srFromDate").value = "";
    document.getElementById("srToDate").value = "";
 
    currentFilteredData = [...tableData];
    currentPage = 1;
    displayTable(currentFilteredData);
};
 

function handleView(id){
    window.location.href = `/stock-new?id=${id}&mode=view`;
}

function handleEdit(id){
    window.location.href = `/stock-new?id=${id}&mode=edit`;
}

function handleReturn(id){
    window.location.href = `/stock-new-return?grn=${id}`;
}


function generateStockReturn(id) {
    window.location.href = `/stock-return?grn=${id}`;
}

// ================= ACTION MENU =================
let activeMenu = null;

document.addEventListener("click", function(e){

    if(activeMenu){
        activeMenu.remove();
        activeMenu = null;
    }

    if(e.target.classList.contains("sr-act-dots")){

        e.stopPropagation();

        const rect = e.target.getBoundingClientRect();
        const id = e.target.dataset.id;
        const status = e.target.dataset.status.toLowerCase();

       let canView = false;
       let canEdit = false;
       let canReturn = false;

        // ===== DRAFT =====
        if (status === "draft") {
            canEdit = true;
        }

        // ===== SUBMITTED =====
        else if (status === "submitted") {
            canView = true;
            canReturn = true;
        }

        // ===== OTHERS =====
        else {
            canView = true;
        }
        const menu = document.createElement("div");
        menu.className = "sr-act-fly";

        menu.innerHTML = `


            <button class="sr-act-item"
                ${!canView ? 'disabled' : ''}
                onclick="handleView('${id}')">
                View
            </button>

            <button class="sr-act-item"
                ${!canEdit ? 'disabled' : ''}
                onclick="handleEdit('${id}')">
                Edit
            </button>

            <button class="sr-act-item"
                ${!canReturn ? 'disabled' : ''}
                onclick="handleReturn('${id}')">
                Generate Stock Return
            </button>

`;

        document.body.appendChild(menu);

        menu.style.top = rect.bottom + "px";
        menu.style.left = rect.right - 160 + "px";

        menu.addEventListener("click", function(e){
            e.stopPropagation();
        });

        activeMenu = menu;
    }
});
 
// INIT
loadStockReceipts();