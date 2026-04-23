// invoice-return-list.js – Full functionality with auto‑swap date validation
// Includes: API loading, search, filters, inclusive date range, sorting, pagination,
// correct Prev/Next button disabling, and "0 of 0" display when empty.
function norm(v) {
    return (v ?? "").toString().trim().toLowerCase();
  }
document.addEventListener("DOMContentLoaded", () => {
  /* =========================================================
     DOM ELEMENTS
  ========================================================== */
  const searchInput = document.getElementById("dnSearchInput");
  const clearFilterBtn = document.getElementById("dnClearBtn");
  const statusFilter = document.getElementById("dnStatusFilter");
  const customerFilter = document.getElementById("dnTypeFilter");
  const fromDate = document.getElementById("dnFromDate");
  const toDate = document.getElementById("dnToDate");

  const prevBtn = document.getElementById("dnPrevBtn");
  const nextBtn = document.getElementById("dnNextBtn");
  const pageTextDiv = document.getElementById("dnPageText");
  const showingText = document.getElementById("dnShowingText");

  const statusSortTh = document.getElementById("statusSortTh");
  const statusSortMenu = document.getElementById("statusSortMenu");

  const tbody = document.getElementById("dnTbody");
  const noDataRow = document.getElementById("dnNoDataRow");

  const newReturnBtn = document.getElementById("newDeliveryNoteBtn");

  /* =========================================================
     STATE
  ========================================================== */
  let allReturns = [];          // all records from API
  let filteredReturns = [];     // filtered/sorted subset
  let currentPage = 1;
  const ROWS_PER_PAGE = 10;

  const STATUS_ORDER = ["Draft", "Submitted", "Cancelled"];
  
  // Track active dropdown
  let activeDropdown = null;

  /* =========================================================
     HELPER FUNCTIONS
  ========================================================== */
 

  function safeText(v) {
    return v == null || v === "" ? "—" : String(v);
  }

  function parseDate(d) {
    if (!d) return 0;
    return new Date(d + "T00:00:00").getTime();
  }

  function statusRank(s) {
    const idx = STATUS_ORDER.indexOf(String(s || "").trim());
    return idx === -1 ? 999 : idx;
  }

  function totalPages() {
    return filteredReturns.length === 0 ? 0 : Math.ceil(filteredReturns.length / ROWS_PER_PAGE);
  }

  function getStatusClass(status) {
    const s = norm(status);
    if (s === "draft") return "so-status-badge so-status-draft";
    if (s === "submitted" || s === "send") return "so-status-badge so-status-send";
    if (s === "cancelled") return "so-status-badge so-status-cancelled";
    return "so-status-badge so-status-draft";
  }

  function setBtnDisabled(btn, disabled) {
    if (!btn) return;
    btn.classList.toggle("disabled", !!disabled);
    btn.disabled = !!disabled;
    btn.setAttribute("aria-disabled", disabled ? "true" : "false");
  }

  /* =========================================================
     ACTION DROPDOWN MENU FUNCTIONS (3 Options Only)
  ========================================================== */
function createActionMenu(returnId, returnStatus) {
    const menu = document.createElement("div");
    menu.className = "action-dropdown-menu";
    
    const statusLower = norm(returnStatus);
    const isDraft = statusLower === 'draft';
    const isCancelled = statusLower === 'cancelled';
    // Disable for Draft OR Cancelled
    const disableActions = isDraft || isCancelled;
    
    let menuHtml = '';
    
    // Option 1: Edit (draft) / View (others)
    if (isDraft) {
      menuHtml += `<div class="action-dropdown-item" data-action="edit" data-id="${returnId}"><span>Edit Details</span></div>`;
    } else {
      menuHtml += `<div class="action-dropdown-item" data-action="view" data-id="${returnId}"><span>View Details</span></div>`;
    }
    
    // Option 2: Generate Invoice – disabled for Draft and Cancelled
    menuHtml += `
      <div class="action-dropdown-item ${disableActions ? 'disabled-item' : ''}" data-action="generate-invoice" data-id="${returnId}" ${disableActions ? 'disabled' : ''}>
        <span>Generate Invoice</span>
      </div>
    `;
    
    // Option 3: Credit Note – disabled for Draft and Cancelled
    menuHtml += `
      <div class="action-dropdown-item ${disableActions ? 'disabled-item' : ''}" data-action="credit-note" data-id="${returnId}" ${disableActions ? 'disabled' : ''}>
        <span>Credit Note</span>
      </div>
    `;
    
    menu.innerHTML = menuHtml;
    return menu;
}

  function toggleActionMenu(event, returnId, returnStatus) {
    event.stopPropagation();
    
    // Close any open dropdown
    if (activeDropdown) {
      activeDropdown.remove();
      activeDropdown = null;
    }
    
    const button = event.currentTarget;
    const container = button.closest('.so-td-action');
    
    const menu = createActionMenu(returnId, returnStatus);
    container.appendChild(menu);
    activeDropdown = menu;
    
    // Position menu
    menu.style.position = 'absolute';
    menu.style.right = '0';
    menu.style.top = '100%';
    menu.style.marginTop = '5px';
    menu.style.zIndex = '1000';
    
    // Close menu when clicking outside
    setTimeout(() => {
      const closeHandler = (e) => {
        if (!container.contains(e.target) && !menu.contains(e.target)) {
          if (activeDropdown) {
            activeDropdown.remove();
            activeDropdown = null;
          }
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    }, 0);
    
    // Handle menu item clicks (only for non-disabled items)
    menu.querySelectorAll('.action-dropdown-item').forEach(item => {
      if (!item.hasAttribute('disabled')) {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = item.getAttribute('data-action');
          const id = item.getAttribute('data-id');
          handleAction(action, id);
          if (activeDropdown) {
            activeDropdown.remove();
            activeDropdown = null;
          }
        });
      }
    });
  }

 async function handleAction(action, returnId) {
  switch(action) {
    case 'view':
      window.location.href = `/new-invoice-return?view_id=${returnId}`;
      break;
    case 'edit':
      window.location.href = `/new-invoice-return?edit_id=${returnId}`;
      break;
    case 'generate-invoice':
      window.open(`/invoice-return/${returnId}/generate-invoice`, '_blank');
      break;
    case 'credit-note':
      window.open(`/invoice-return/${returnId}/credit-note`, '_blank');
      break;
    default:
      console.log('Unknown action:', action);
  }
}

  // Make functions available globally for onclick
  window.toggleActionMenuFromGlobal = function(event, returnId, status) {
    toggleActionMenu(event, returnId, status);
  };

  /* =========================================================
     FILTER LOGIC – with inclusive To date and validation popup
  ========================================================== */
  function applyFilters() {
    let q = (searchInput?.value || "").trim().toLowerCase();
    let status = statusFilter?.value || "";
    let customer = customerFilter?.value || "";
    let from = fromDate?.value || "";
    let to = toDate?.value || "";

    // Validate date range
    if (from && to && parseDate(to) < parseDate(from)) {
      alert("To date cannot be earlier than From date");
      if (toDate) {
        toDate.value = "";
        toDate.focus();
      }
      return; // Stop filtering
    }

    filteredReturns = allReturns.filter(item => {
      const idMatch = safeText(item.return_id).toLowerCase().includes(q) ||
                      safeText(item.invoice_ref).toLowerCase().includes(q);
      const statusMatch = !status || status === "all" || norm(item.status) === norm(status);
      const custMatch = !customer || customer === "all" || norm(item.customer_name) === norm(customer);

      let dateMatch = true;
      if (from || to) {
        const itemDate = parseDate(item.return_date);
        const fromTime = from ? parseDate(from) : null;
        const toTime = to ? parseDate(to) + 86400000 : null;
        if (fromTime && itemDate < fromTime) dateMatch = false;
        if (toTime && itemDate >= toTime) dateMatch = false;
      }
      return idMatch && statusMatch && custMatch && dateMatch;
    });

    currentPage = 1;
    renderTable();
  }

  /* =========================================================
     SORTING
  ========================================================== */
  function applyStatusSort(mode) {
    if (!filteredReturns.length) return;
    if (mode === "newest") {
      filteredReturns.sort((a, b) => parseDate(b.return_date) - parseDate(a.return_date));
    } else if (mode === "oldest") {
      filteredReturns.sort((a, b) => parseDate(a.return_date) - parseDate(b.return_date));
    } else if (mode === "progress") {
      filteredReturns.sort((a, b) => statusRank(a.status) - statusRank(b.status));
    } else if (mode === "reverse") {
      filteredReturns.sort((a, b) => statusRank(b.status) - statusRank(a.status));
    }
    currentPage = 1;
    renderTable();
  }

  /* =========================================================
     PAGINATION UI UPDATES
  ========================================================== */
  function updatePagerUI() {
    const tp = totalPages();
    const totalRecords = filteredReturns.length;
    setBtnDisabled(prevBtn, currentPage <= 1 || totalRecords === 0);
    setBtnDisabled(nextBtn, currentPage >= tp || totalRecords === 0);
    if (tp <= 1) {
      setBtnDisabled(prevBtn, true);
      setBtnDisabled(nextBtn, true);
    }
    if (pageTextDiv) {
      pageTextDiv.innerHTML = tp === 0 ? `Page 0 of 0` : `Page <strong>${currentPage}</strong> of <strong>${tp}</strong>`;
    }
  }

  function updateShowing() {
    if (!showingText) return;
    if (!filteredReturns.length) {
      showingText.textContent = "Showing 0 of 0 Entries";
      return;
    }
    const start = (currentPage - 1) * ROWS_PER_PAGE + 1;
    const end = Math.min(currentPage * ROWS_PER_PAGE, filteredReturns.length);
    showingText.textContent = `Showing ${start}-${end} of ${filteredReturns.length} Entries`;
  }

  /* =========================================================
     TABLE RENDERING
  ========================================================== */
  function renderTable() {
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!filteredReturns.length) {
      if (noDataRow) tbody.appendChild(noDataRow);
      updatePagerUI();
      updateShowing();
      return;
    }

    if (noDataRow?.parentNode === tbody) noDataRow.remove();

    if (currentPage > totalPages()) {
      currentPage = totalPages() || 1;
    }

    const start = (currentPage - 1) * ROWS_PER_PAGE;
    const end = Math.min(start + ROWS_PER_PAGE, filteredReturns.length);
    const pageData = filteredReturns.slice(start, end);

    pageData.forEach(item => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="so-check-td">
          <input type="checkbox" class="row-check" data-id="${item.return_id}">
        </td>
        <td class="so-id">${safeText(item.return_id)}</td>
        <td class="so-invoice-ref">${safeText(item.invoice_ref)}</td>
        <td class="so-customer">${safeText(item.customer_name)}</td>
        <td class="so-date">${safeText(item.return_date)}</td>
        <td class="so-status">
          <span class="${getStatusClass(item.status)}">${safeText(item.status)}</span>
        </td>
        <td class="so-td-action">
          <button class="so-act-dots" onclick="toggleActionMenuFromGlobal(event, '${item.return_id}', '${item.status}')" title="Actions">
            ⋮
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });

    updatePagerUI();
    updateShowing();
  }

  /* =========================================================
     EVENT LISTENERS
  ========================================================== */
  searchInput?.addEventListener("input", applyFilters);
  statusFilter?.addEventListener("change", applyFilters);
  customerFilter?.addEventListener("change", applyFilters);
  fromDate?.addEventListener("change", applyFilters);
  toDate?.addEventListener("change", applyFilters);

  clearFilterBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (statusFilter) statusFilter.value = "all";
    if (customerFilter) customerFilter.value = "all";
    if (fromDate) fromDate.value = "";
    if (toDate) toDate.value = "";
    applyFilters();
    searchInput?.focus();
  });

  prevBtn?.addEventListener("click", () => {
    if (prevBtn?.disabled) return;
    currentPage -= 1;
    renderTable();
  });

  nextBtn?.addEventListener("click", () => {
    if (nextBtn?.disabled) return;
    currentPage += 1;
    renderTable();
  });

  // Status sort menu
  if (statusSortTh && statusSortMenu) {
    statusSortTh.addEventListener("click", (e) => {
      if (e.target.closest("#statusSortMenu")) return;
      statusSortTh.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#statusSortTh")) {
        statusSortTh.classList.remove("open");
      }
    });
    statusSortMenu.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-sort]");
      if (!btn) return;
      applyStatusSort(btn.dataset.sort);
      statusSortTh.classList.remove("open");
    });
  }

  newReturnBtn?.addEventListener("click", () => {
    window.location.href = "/new-invoice-return";
  });

  /* =========================================================
     DATA LOADING
  ========================================================== */
  async function loadInvoiceReturns() {
    try {
      const res = await fetch("/api/invoice-returns");
      const payload = await res.json();
      if (payload.error || payload.message === "Unauthorized")
        throw new Error(payload.error || payload.message);
      const rows = Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload)
          ? payload
          : [];
      allReturns = rows.map((r) => ({
        return_id: r.invoice_return_id ?? r.return_id,
        invoice_ref: r.invoice_id ?? r.invoice_ref,
        customer_name: r.customer_name ?? "",
        return_date: r.return_date ?? "",
        status: r.status ?? "Draft",
      }));
      filteredReturns = [...allReturns];
      populateCustomerDropdown(); // optional
      renderTable();
    } catch (err) {
      console.error("Failed to load invoice returns:", err);
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="dn-empty">Error loading data</td></tr>';
      }
    }
  }

  function populateCustomerDropdown() {
    if (!customerFilter) return;
    const customers = [...new Set(allReturns.map(r => r.customer_name))].sort();
    customerFilter.innerHTML = '<option value="all">All Customers</option>' +
      customers.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  // Initial render shows "no data" while loading
  renderTable();
  loadInvoiceReturns();
});