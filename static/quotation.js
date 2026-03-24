document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("quotationTableBody");
  const noDataRow = document.getElementById("noDataRow");

  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");
  const typeFilter = document.getElementById("typeFilter");
  const salesRepFilter = document.getElementById("salesRepFilter");
  const clearFilterBtn = document.getElementById("clearFilterBtn");

  const showingCount = document.getElementById("showingCount");
  const pageNow = document.getElementById("pageNow");
  const pageTotal = document.getElementById("pageTotal");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const pageEl = document.querySelector(".quotation-page");
  const roleRaw = pageEl?.dataset.role || "";
  const role = roleRaw.toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
  const permCreate = pageEl?.dataset.permCreate === "1";
  const permEdit = pageEl?.dataset.permEdit === "1";
  const isPlatformAdmin = ["superadmin", "admin"].includes(role);
  const canCreate = permCreate || isPlatformAdmin;
  const canEdit = permEdit || isPlatformAdmin;
  const canView = canEdit;

  const addQuotationBtn = document.getElementById("addQuotationBtn");
  if (addQuotationBtn) {
    addQuotationBtn.disabled = !canCreate;
    if (!canCreate && !addQuotationBtn.title) {
      addQuotationBtn.title = "No permission to create quotation";
    }
    addQuotationBtn.addEventListener("click", () => {
      if (!canCreate) return;
      window.location.href = "/add-new-quotation";
    });
  }

  let state = {
    q: "",
    status: "",
    type: "",
    sales_rep: "",
    page: 1,
    per_page: 10,
    total_pages: 1
  };

  // ==========================
  // ✅ Toast on redirect (success / error, 3 seconds)
  // ==========================
  function showRedirectToast(message, type, durationMs) {
    const duration = durationMs == null ? 3000 : durationMs;
    document
      .querySelectorAll(".success-notification, .error-notification")
      .forEach((n) => n.remove());

    const notification = document.createElement("div");
    notification.className =
      type === "error" ? "error-notification" : "success-notification";
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("show");
    }, 10);

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 400);
    }, duration);
  }

  const urlParams = new URLSearchParams(window.location.search);
  const toastMsg = urlParams.get("toast");
  const toastType = urlParams.get("toastType") || "success";
  if (toastMsg) {
    showRedirectToast(decodeURIComponent(toastMsg), toastType, 3000);
    window.history.replaceState({}, "", window.location.pathname);
  }

  function pill(status) {
    const s = (status || "draft").toLowerCase();
    return `<span class="pill ${s}">${s.charAt(0).toUpperCase() + s.slice(1)}</span>`;
  }


// ===================================================
// CURRENCY SYMBOLS MAP
// ===================================================
const currencySymbols = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'IND': '₹', 'INR': '₹',
    'SGD': 'S$', 'CAD': 'C$', 'AUD': 'A$', 'CHF': 'Fr', 'CNY': '¥',
    'HKD': 'HK$', 'NZD': 'NZ$', 'KRW': '₩', 'MXN': 'Mex$', 'BRL': 'R$',
    'RUB': '₽', 'ZAR': 'R', 'TRY': '₺', 'PLN': 'zł', 'THB': '฿',
    'IDR': 'Rp', 'MYR': 'RM', 'PHP': '₱', 'CZK': 'Kč', 'HUF': 'Ft',
    'ILS': '₪', 'SAR': '﷼', 'AED': 'د.إ', 'SEK': 'kr', 'NOK': 'kr',
    'DKK': 'kr', 'RON': 'lei', 'BGN': 'лв', 'HRK': 'kn', 'ISK': 'kr',
    'NGN': '₦', 'EGP': 'E£', 'PKR': '₨', 'LKR': 'Rs', 'NPR': 'रू',
    'BDT': '৳', 'VND': '₫', 'ARS': '$', 'CLP': '$', 'COP': '$',
    'PEN': 'S/', 'UYU': '$U', 'PYG': '₲', 'BOB': 'Bs', 'GTQ': 'Q',
    'HNL': 'L', 'NIO': 'C$', 'CRC': '₡', 'PAB': 'B/.'
};


/**
 * Format currency with symbol and 2 decimal places
 * @param {number|string} amount - The amount to format
 * @param {string} currencyCode - The currency code (USD, EUR, etc.)
 * @returns {string} Formatted currency string with symbol
 */
function formatCurrency(amount, currencyCode) {
    // Get the symbol from our map, default to '$' if not found
    const symbol = currencySymbols[currencyCode] || '$';
    
    // Convert amount to number (in case it's a string)
    const numericAmount = parseFloat(amount) || 0;
    
    // Return formatted string with symbol and 2 decimal places
    return `${symbol}${numericAmount.toFixed(2)}`;
}

  /**
   * Generate status pill with appropriate color based on status
   */
  function getStatusPill(status) {
    const s = (status || "draft").toLowerCase();
    
    // Map status to appropriate CSS class
    const statusClass = s.replace(' ', '-'); // Handle spaces if any
    
    // Capitalize first letter
    const displayText = s.charAt(0).toUpperCase() + s.slice(1);
    
    return `<span class="status-pill ${statusClass}">${displayText}</span>`;
  }

/**
 * Get grand total value with currency symbol
 */
function getGrandTotal(quotation) {
    if (!quotation) return "0.00";
    
    let amount = 0;
    
    // STEP 3.1: Get the grand total amount from the quotation
    // Check different possible locations where the total might be stored
    if (quotation.totals?.grand_total !== undefined && quotation.totals?.grand_total !== null) {
        amount = quotation.totals.grand_total;
    } else if (quotation.grand_total !== undefined && quotation.grand_total !== null) {
        amount = quotation.grand_total;
    } else if (quotation.total !== undefined && quotation.total !== null) {
        amount = quotation.total;
    } else if (quotation.amount !== undefined && quotation.amount !== null) {
        amount = quotation.amount;
    } else {
        return "0.00";
    }
    
    // STEP 3.2: Get the currency code from the quotation
    const currencyCode = quotation.currency || 'USD';
    
    // STEP 3.3: Format the amount with currency symbol
    return formatCurrency(amount, currencyCode);
}

function render(rows) {
    tbody.innerHTML = "";
    if (!rows || rows.length === 0) {
      tbody.appendChild(noDataRow);
      noDataRow.style.display = "";
      return;
    }
    noDataRow.style.display = "none";

    rows.forEach(r => {
      const tr = document.createElement("tr");
      
      // STEP 4.1: Get the formatted grand total with currency symbol
      const formattedTotal = getGrandTotal(r);
      
      tr.innerHTML = `
        <td>${r.quotation_id || ""}</td>
        <td>${(r.quotation_type || "").toUpperCase()}</td>
        <td>${r.customer_name || ""}</td>
        <td>${r.sales_rep || ""}</td>
        <td>${r.quotation_date || ""}</td>
        <td>${getStatusPill(r.status)}</td>
        <td class="right">${formattedTotal}</td>
        <td class="center action-buttons">
          <button class="action-btn edit-btn ${canEdit ? "" : "edit-btn-disabled"}" data-id="${r.quotation_id}" style="color: white;" ${canEdit ? "" : "disabled title=\"No permission to edit quotation\""}>Edit</button>
          <button class="action-btn view-btn ${canView ? "" : "view-btn-disabled"}" data-id="${r.quotation_id}" style="color:white" ${canView ? "" : "disabled title=\"No permission to view quotation\""}>View</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Add event listeners to Edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!canEdit) return;
        const quotationId = btn.getAttribute('data-id');
        window.location.href = `/add-new-quotation?edit=${quotationId}`;
      });
    });

    // Add event listeners to View buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!canView) return;
        const quotationId = btn.getAttribute('data-id');
        window.location.href = `/add-new-quotation?view=${quotationId}`;
      });
    });
}
  function updatePager(totalEntries) {
    pageNow.textContent = String(state.page);
    pageTotal.textContent = String(state.total_pages);

    prevBtn.disabled = state.page <= 1;
    nextBtn.disabled = state.page >= state.total_pages;

    // Update showing count with better format
    if (totalEntries === 0) {
      showingCount.textContent = "Showing 0 entries";
    } else {
      const start = (state.page - 1) * state.per_page + 1;
      const end = Math.min(state.page * state.per_page, totalEntries);
      showingCount.textContent = `Showing ${start}-${end} of ${totalEntries} entries`;
    }
  }

  async function load() {
    const params = new URLSearchParams({
      q: state.q,
      status: state.status,
      type: state.type,
      sales_rep: state.sales_rep,
      page: String(state.page),
      per_page: String(state.per_page),
    });

    const res = await fetch(`/api/quotations?${params.toString()}`);
    const data = await res.json();

    state.total_pages = data.total_pages || 1;

    // Fill Sales Rep dropdown once from API data
    if (Array.isArray(data.sales_reps)) {
      const current = salesRepFilter.value;
      salesRepFilter.innerHTML = `<option value="">All</option>` +
        data.sales_reps.map(x => `<option value="${x}">${x}</option>`).join("");
      salesRepFilter.value = current;
    }

    render(data.items || []);
    updatePager(data.total || 0);
  }

  // Events
  searchInput.addEventListener("input", () => {
    state.q = searchInput.value.trim();
    state.page = 1;
    load();
  });

  statusFilter.addEventListener("change", () => {
    state.status = statusFilter.value;
    state.page = 1;
    load();
  });

  typeFilter.addEventListener("change", () => {
    state.type = typeFilter.value;
    state.page = 1;
    load();
  });

  salesRepFilter.addEventListener("change", () => {
    state.sales_rep = salesRepFilter.value;
    state.page = 1;
    load();
  });

  clearFilterBtn.addEventListener("click", () => {
    searchInput.value = "";
    statusFilter.value = "";
    typeFilter.value = "";
    salesRepFilter.value = "";
    state = { ...state, q: "", status: "", type: "", sales_rep: "", page: 1 };
    load();
  });

  prevBtn.addEventListener("click", () => {
    if (state.page > 1) { state.page -= 1; load(); }
  });

  nextBtn.addEventListener("click", () => {
    if (state.page < state.total_pages) { state.page += 1; load(); }
  });

  // initial load
  load();
});