


document.addEventListener("DOMContentLoaded", () => {
  /* =========================================================
     DOM ELEMENTS
  ========================================================== */
  const searchInput = document.getElementById("searchInput");
  const clearFilterBtn = document.getElementById("clearFilterBtn");

  const statusFilter = document.getElementById("statusFilter");
  const orderTypeFilter = document.getElementById("orderTypeFilter");
  const salesRepFilter = document.getElementById("salesRepFilter");

  const tbody = document.getElementById("salesOrderTbody");
  const noDataRow = document.getElementById("noDataRow");

  const showingText = document.getElementById("showingText");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const pageNow = document.getElementById("pageNow");
const pageTotal = document.getElementById("pageTotal");
  

  const statusSortTh = document.getElementById("statusSortTh");
  const statusSortMenu = document.getElementById("statusSortMenu");

  const newSalesOrderBtn = document.getElementById("newSalesOrderBtn");
  const genPOBtn = document.getElementById("genPOBtn");
  const genDNBtn = document.getElementById("genDNBtn");
  const genINVBtn = document.getElementById("genINVBtn");

  /* =========================================================
     PAGE STATE
  ========================================================== */
  const ROWS_PER_PAGE = 10;

  let currentPage = 1;
  let allOrders = [];
  let filteredOrders = [];
  let currentStatusSortMode = "";

  let flyEl = null;
  let hideTimer = null;
  let statusSortHideTimer = null;

  /* =========================================================
     CONSTANTS
  ========================================================== */
  const STATUS_ORDER = [
    "Draft",
    "Submitted",
    "Partially Delivered",
    "Delivered",
    "Cancelled"
  ];

  /* =========================================================
     COMMON HELPERS
  ========================================================== */
  function showToast(message, type = "success") {
    const existing = document.querySelector(".success-notification, .error-notification");
    if (existing) existing.remove();

    const div = document.createElement("div");
    div.className = type === "success" ? "success-notification" : "error-notification";
    div.textContent = message;

    document.body.appendChild(div);

    requestAnimationFrame(() => {
      div.classList.add("show");
    });

    setTimeout(() => {
      div.classList.remove("show");
      setTimeout(() => div.remove(), 300);
    }, 3000);
  }

  // Show cross-page success toast if set by form page
  try {
    const flag = localStorage.getItem("salesOrderSuccess");

    if (flag === "updated") {
      setTimeout(() => {
        showToast("Sales order updated successfully.", "success");
        localStorage.removeItem("salesOrderSuccess");
      }, 300);
    } else if (flag === "added" || flag === "1") {
      setTimeout(() => {
        showToast("Sales order added successfully.", "success");
        localStorage.removeItem("salesOrderSuccess");
      }, 300);
    }

    const draftFlag = localStorage.getItem("salesOrderDraftSuccess");
    if (draftFlag === "1") {
      showToast("Sales order draft saved successfully.", "success");
      localStorage.removeItem("salesOrderDraftSuccess");
    }
  } catch (e) {}
  function safeText(value) {
    return value === null || value === undefined || value === ""
      ? "—"
      : String(value);
  }

  function getSalesStatusClass(status) {
  const s = norm(status);

  if (s === "draft") return "so-status-badge so-status-draft";
  if (s === "submitted") return "so-status-badge so-status-submitted";
  if (s === "delivered") return "so-status-badge so-status-delivered";
  if (s === "partially delivered" || s === "partially_delivered") {
    return "so-status-badge so-status-partial";
  }
  if (s === "cancelled") return "so-status-badge so-status-cancelled";

  return "so-status-badge";
}

  function formatMoney(value) {
    const num = Number(value);
    if (Number.isNaN(num)) return "—";
    return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  function norm(value) {
    return (value ?? "").toString().trim().toLowerCase();
  }

  function totalPages() {
    return Math.max(1, Math.ceil(filteredOrders.length / ROWS_PER_PAGE));
  }

  function parseDateAny(value) {
    const v = (value || "").trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
      return new Date(v.slice(0, 10) + "T00:00:00").getTime();
    }

    const match = v.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
    if (match) {
      return new Date(
        Number(match[3]),
        Number(match[2]) - 1,
        Number(match[1])
      ).getTime();
    }

    return 0;
  }

  function statusRank(status) {
    const index = STATUS_ORDER.indexOf(String(status || "").trim());
    return index === -1 ? 999 : index;
  }

  /* =========================================================
     PAGER UI
  ========================================================== */
  function updatePagerUI() {
  const tp = totalPages();

  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= tp;
  if (pageNow) pageNow.textContent = currentPage;
  if (pageTotal) pageTotal.textContent = tp;
}

  function updateShowing() {
    if (!showingText) return;

    if (!filteredOrders.length) {
      showingText.textContent = "Showing 0 Entries";
      return;
    }

    const start = (currentPage - 1) * ROWS_PER_PAGE + 1;
    const end = Math.min(currentPage * ROWS_PER_PAGE, filteredOrders.length);
    const total = filteredOrders.length;

    showingText.textContent = `Showing ${start}-${end} of ${total} Entries`;
  }

  /* =========================================================
     SORTING
  ========================================================== */
  function syncStatusSortMenuActive() {
    if (!statusSortMenu) return;
    statusSortMenu.querySelectorAll("button[data-sort]").forEach((b) => {
      b.classList.toggle("so-sort-option--active", b.dataset.sort === currentStatusSortMode);
    });
  }

  function applyStatusSort(mode) {
    currentStatusSortMode = mode || "";
    syncStatusSortMenuActive();

    if (!filteredOrders.length) {
      currentPage = 1;
      renderTable();
      return;
    }

    if (mode === "newest") {
      filteredOrders.sort(
        (a, b) => parseDateAny(b.order_date) - parseDateAny(a.order_date)
      );
    } else if (mode === "oldest") {
      filteredOrders.sort(
        (a, b) => parseDateAny(a.order_date) - parseDateAny(b.order_date)
      );
    } else if (mode === "progress") {
      filteredOrders.sort((a, b) => statusRank(a.status) - statusRank(b.status));
    } else if (mode === "reverse") {
      filteredOrders.sort((a, b) => statusRank(b.status) - statusRank(a.status));
    }

    currentPage = 1;
    renderTable();
  }

  /* =========================================================
     ROUTING ACTIONS
  ========================================================== */
  function goSalesOrderForm(soId, mode) {
  const id = String(soId || "").trim();

  if (!id || id === "—") {
    alert("SO ID missing. Cannot open View/Edit.");
    return;
  }

  if (mode === "edit") {
    window.location.href = `/sales-order/new?so_id=${encodeURIComponent(id)}&mode=edit`;
  } else {
    window.location.href = `/sales-order/new?so_id=${encodeURIComponent(id)}&mode=view`;
  }
}

  function generatePurchaseOrder(soId) {
    console.log("Generate Purchase Order:", soId);
  }

  function generateDeliveryNote(soId) {
    const id = String(soId || "").trim();
    if (!id) {
      showToast("Sales Order ID missing", "error");
      return;
    }
    window.location.href = `/delivery_note/new?so_id=${encodeURIComponent(id)}`;
  }

  function generateInvoice(soId) {
    const id = String(soId || "").trim();
    if (!id) {
      showToast("Sales Order ID missing", "error");
      return;
    }
    window.location.href = `/new-invoice?so_id=${encodeURIComponent(id)}`;
  }

  function openPdfSO(soId) {
    if (!soId) {
      showToast("SO ID missing", "error");
      return;
    }
    window.open(`/api/sales-orders/${encodeURIComponent(soId)}/pdf`, "_blank");
  }

  function sendEmailSO(soId) {
    if (!soId) {
      showToast("SO ID missing", "error");
      return;
    }
    // This would typically open a modal to compose email
    showToast("Email functionality coming soon", "success");
  }

  function openSoCancelModal(soId) {
    // This would open the cancel modal with the SO ID
    console.log("Open cancel modal for:", soId);
    showToast("Cancel functionality - modal to be implemented", "success");
  }

  /* =========================================================
     ACTION STATE - STATUS BASED RULES
  ========================================================== */
  function getSOActionState(status) {
  const s = norm(status);

  const state = {
    firstLabel: "View Details",
    firstMode: "view",
    canGeneratePO: false,
    canGenerateDN: false,
    canGenerateInvoice: false
  };

  // Draft — PO / DN / Invoice off
  if (s === "draft") {
    state.firstLabel = "Edit Details";
    state.firstMode = "edit";
    return state;
  }

  // Submitted — PO on, DN on, Invoice off
  if (s === "submitted") {
    state.canGeneratePO = true;
    state.canGenerateDN = true;
    return state;
  }

  // Partially Delivered — PO off, DN on, Invoice off
  if (
    s === "partially delivered" ||
    s === "partially_delivered"
  ) {
    state.canGenerateDN = true;
    return state;
  }

  // Delivered — Invoice on only
  if (s === "delivered") {
    state.canGenerateInvoice = true;
    return state;
  }

  // Cancelled — all off
  if (s === "cancelled") {
    return state;
  }

  return state;
}
  /* =========================================================
     HOVER ACTION MENU
  ========================================================== */
  function removeFly() {
    if (flyEl) {
      flyEl.remove();
      flyEl = null;
    }
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => removeFly(), 120);
  }

  function keepOpen() {
    clearTimeout(hideTimer);
  }

  function openStatusSortMenu() {
    clearTimeout(statusSortHideTimer);
    statusSortTh?.classList.add("open");
  }

  function scheduleStatusSortMenuClose() {
    clearTimeout(statusSortHideTimer);
    statusSortHideTimer = setTimeout(() => {
      statusSortTh?.classList.remove("open");
    }, 160);
  }

  function buildFlyMenuForSO(row, anchorBtn) {
    const soId = String(row.so_id || "").trim();
    if (!soId) return;

    const state = getSOActionState(row.status, row.stock_status);
    const {
      firstLabel,
      firstMode,
      canGeneratePO,
      canGenerateDN,
      canGenerateInvoice
    } = state;

    flyEl = document.createElement("div");
    flyEl.className = "so-act-fly";

    const mkItem = (label, onClick, disabled) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "so-act-item";
      button.textContent = label;
      button.disabled = !!disabled;

      if (!disabled) {
        button.addEventListener("click", onClick);
      }

      return button;
    };

    flyEl.appendChild(
  mkItem(firstLabel, () => goSalesOrderForm(soId, firstMode), false)
);

// Generate Purchase Order
flyEl.appendChild(
  mkItem(
    "Generate Purchase Order",
    () => generatePurchaseOrder(soId),
    !canGeneratePO
  )
);

flyEl.appendChild(
  mkItem(
    "Generate Delivery Note",
    () => generateDeliveryNote(soId),
    !canGenerateDN
  )
);

flyEl.appendChild(
  mkItem(
    "Generate Invoice",
    () => generateInvoice(soId),
    !canGenerateInvoice
  )

);

    flyEl.addEventListener("mouseenter", keepOpen);
    flyEl.addEventListener("mouseleave", scheduleHide);

    document.body.appendChild(flyEl);

    const btnRect = anchorBtn.getBoundingClientRect();

    flyEl.style.visibility = "hidden";
    flyEl.style.left = "0px";
    flyEl.style.top = "0px";

    const popRect = flyEl.getBoundingClientRect();
    const gap = 8;
    const dropY = 25;

    let top = btnRect.top - popRect.height - gap + dropY;
    if (top < 8) {
      top = btnRect.bottom + gap + dropY;
    }

    let left = btnRect.right - popRect.width;
    const maxLeft = window.innerWidth - popRect.width - 8;

    if (left > maxLeft) left = maxLeft;
    if (left < 8) left = 8;

    flyEl.style.left = `${Math.round(left)}px`;
    flyEl.style.top = `${Math.round(top)}px`;
    flyEl.style.visibility = "visible";
  }

  function attachHoverMenu(btn, row) {
    btn.addEventListener("mouseenter", () => {
      removeFly();
      keepOpen();
      buildFlyMenuForSO(row, btn);
    });

    btn.addEventListener("mouseleave", scheduleHide);
  }

  /* =========================================================
     TABLE RENDERING
  ========================================================== */
  function renderTable() {


    if (!tbody) return;

    tbody.innerHTML = "";

    if (!filteredOrders.length) {
      if (noDataRow) tbody.appendChild(noDataRow);
      currentPage = 1;
      updateShowing();
      updatePagerUI();
      return;
    }

    const tp = totalPages();
    currentPage = Math.min(Math.max(1, currentPage), tp);

    const start = (currentPage - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    const pageRows = filteredOrders.slice(start, end);

    if (noDataRow?.parentNode) {
      noDataRow.remove();
    }

    pageRows.forEach((order) => {
      const soIdRaw = String(order.so_id || "").trim();
      const soIdTxt = safeText(soIdRaw);

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td class="so-check-td">
          <input type="checkbox" class="so-row-check" data-id="${soIdRaw}">
        </td>

        <td>${soIdTxt}</td>
        <td>${safeText(order.order_type)}</td>
        <td>${safeText(order.customer_name)}</td>
        <td>${safeText(order.sales_rep)}</td>

        <td>${order.order_date ? new Date(order.order_date).toLocaleDateString("en-GB") : "—"}</td>
        <td>
  <span class="${getSalesStatusClass(order.status)}">
    ${safeText(order.status)}
  </span>
</td>
        <td>${safeText(order.stock_status)}</td>
        <td>${formatMoney(order.grand_total)}</td>

        <td class="so-td-action">
          <button
            type="button"
            class="so-act-dots"
            aria-label="Actions"
            ${soIdRaw ? "" : "disabled"}
          >
            ⋮
          </button>
        </td>
      `;

      const dots = tr.querySelector(".so-act-dots");
      if (dots && soIdRaw) {
        attachHoverMenu(dots, order);
      }

      tbody.appendChild(tr);
    });

    updateShowing();
    updatePagerUI();
    toggleButtons();
  }

  /* =========================================================
     FILTERS
  ========================================================== */
  function applyFilters() {
    const q = (searchInput?.value || "").trim().toLowerCase();
    const status = statusFilter?.value || "";
    const orderType = orderTypeFilter?.value || "";
    const salesRep = salesRepFilter?.value || "";

    filteredOrders = allOrders.filter((order) => {
      const idMatch = !q ||
        safeText(order.so_id).toLowerCase().includes(q) ||
        safeText(order.customer_name).toLowerCase().includes(q);
      const statusMatch = !status || safeText(order.status) === status;
      const typeMatch = !orderType || safeText(order.order_type) === orderType;
      const repMatch = !salesRep || safeText(order.sales_rep) === salesRep;

      return idMatch && statusMatch && typeMatch && repMatch;
    });

    currentPage = 1;
    if (currentStatusSortMode) {
      applyStatusSort(currentStatusSortMode);
    } else {
      renderTable();
    }
  }

  function fillSalesRepsDropdown() {
    if (statusFilter) {
      const prevStatus = statusFilter.value || "";
      statusFilter.innerHTML = '<option value="">All</option>';

      const uniqueStatuses = [
        ...new Set(
          allOrders
            .map((order) => String(order.status || "").trim())
            .filter(Boolean)
        ),
      ].sort((a, b) => statusRank(a) - statusRank(b));

      uniqueStatuses.forEach((status) => {
        const opt = document.createElement("option");
        opt.value = status;
        opt.textContent = status;
        statusFilter.appendChild(opt);
      });

      const hasPrev = [...statusFilter.options].some((o) => o.value === prevStatus);
      statusFilter.value = hasPrev ? prevStatus : "";
    }

    if (!salesRepFilter) return;

    const reps = [
      ...new Set(
        allOrders
          .map((order) => safeText(order.sales_rep))
          .filter((value) => value !== "—")
      )
    ].sort();

    salesRepFilter.innerHTML =
      `<option value="">All</option>` +
      reps.map((rep) => `<option value="${rep}">${rep}</option>`).join("");
  }

  /* =========================================================
     API LOADING
  ========================================================== */
  async function loadSalesOrders() {
    try {
      const res = await fetch("/api/sales-orders", { cache: "no-store" });
      if (!res.ok) throw new Error("API failed");

      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.orders || []);

      allOrders = list.map((order) => ({
        ...order,
        so_id: order.so_id || order.soId || order.sales_order_id || order.id || "",
        customer_name:
          order.customer_name || order.customer || order.customerName || "",
        sales_rep: order.sales_rep || order.salesRep || "",
        order_type: order.order_type || order.orderType || "",
        order_date: order.order_date || order.orderDate || "",
        status: order.status || "",
        stock_status: order.stock_status || order.stockStatus || "",
        grand_total: order.grand_total ?? order.grandTotal ?? 0
      }));

      filteredOrders = [...allOrders];
      fillSalesRepsDropdown();
      renderTable();
    } catch (error) {
      console.error(error);
      allOrders = [];
      filteredOrders = [];
      fillSalesRepsDropdown();
      renderTable();
    }
  }

  /* =========================================================
     EVENTS
  ========================================================== */
  searchInput?.addEventListener("input", applyFilters);
  statusFilter?.addEventListener("change", applyFilters);
  orderTypeFilter?.addEventListener("change", applyFilters);
  salesRepFilter?.addEventListener("change", applyFilters);

  clearFilterBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (statusFilter) statusFilter.value = "";
    if (orderTypeFilter) orderTypeFilter.value = "";
    if (salesRepFilter) salesRepFilter.value = "";
    applyFilters();
  });

  prevBtn?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage -= 1;
      renderTable();
    }
  });

  nextBtn?.addEventListener("click", () => {
    const tp = totalPages();

    if (currentPage < tp) {
      currentPage += 1;
      renderTable();
    }
  });

  if (statusSortTh && statusSortMenu) {
    statusSortTh.addEventListener("mouseenter", openStatusSortMenu);
    statusSortTh.addEventListener("mouseleave", scheduleStatusSortMenuClose);
    statusSortMenu.addEventListener("mouseenter", openStatusSortMenu);
    statusSortMenu.addEventListener("mouseleave", scheduleStatusSortMenuClose);

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

  newSalesOrderBtn?.addEventListener("click", () => {
    window.location.href = "/sales-order/new";
  });

  function toggleButtons() {
    const checked = [...document.querySelectorAll(".so-row-check:checked")];

    if (!checked.length) {
      if (genPOBtn) genPOBtn.disabled = true;
      if (genDNBtn) genDNBtn.disabled = true;
      if (genINVBtn) genINVBtn.disabled = true;
      return;
    }

    const soId = String(checked[0].dataset.id || "").trim();
    const allSameId = checked.every(
      (cb) => String(cb.dataset.id || "").trim() === soId
    );

    if (!allSameId || !soId) {
      if (genPOBtn) genPOBtn.disabled = true;
      if (genDNBtn) genDNBtn.disabled = true;
      if (genINVBtn) genINVBtn.disabled = true;
      return;
    }

    const order = allOrders.find(
      (o) => String(o.so_id || "").trim() === soId
    );
    const state = order ? getSOActionState(order.status) : null;

    if (genPOBtn) genPOBtn.disabled = !(state && state.canGeneratePO);
    if (genDNBtn) genDNBtn.disabled = !(state && state.canGenerateDN);
    if (genINVBtn) genINVBtn.disabled = !(state && state.canGenerateInvoice);
  }

  tbody?.addEventListener("change", (e) => {
    if (!e.target.classList.contains("so-row-check")) return;

    if (e.target.checked) {
      const currentId = String(e.target.dataset.id || "").trim();
      document.querySelectorAll(".so-row-check:checked").forEach((cb) => {
        if (cb === e.target) return;
        const otherId = String(cb.dataset.id || "").trim();
        if (otherId !== currentId) cb.checked = false;
      });
    }

    toggleButtons();
  });

  genPOBtn?.addEventListener("click", () => {
    const checked = document.querySelector(".so-row-check:checked");
    const soId = checked ? String(checked.dataset.id || "").trim() : "";
    if (soId) generatePurchaseOrder(soId);
  });

  genDNBtn?.addEventListener("click", () => {
    const checked = document.querySelector(".so-row-check:checked");
    const soId = checked ? String(checked.dataset.id || "").trim() : "";
    if (soId) generateDeliveryNote(soId);
  });

  genINVBtn?.addEventListener("click", () => {
    const checked = document.querySelector(".so-row-check:checked");
    const soId = checked ? String(checked.dataset.id || "").trim() : "";
    if (soId) generateInvoice(soId);
  });

  window.addEventListener("scroll", () => removeFly(), true);
  window.addEventListener("resize", () => removeFly());

  /* =========================================================
     INITIAL LOAD
  ========================================================== */
  loadSalesOrders();
});
