document.addEventListener("DOMContentLoaded", () => {

  /* =====================================================
     DOM ELEMENTSs
  ===================================================== */

  const tbody = document.getElementById("dnrTbody");
  const noDataRow = document.getElementById("dnrNoDataRow");

  const searchInput = document.getElementById("dnrSearchInput");
  const clearBtn = document.getElementById("dnrClearBtn");

  const statusFilter = document.getElementById("dnrStatusFilter");

  const fromDate = document.getElementById("dnrFromDate");
  const toDate = document.getElementById("dnrToDate");

  const newBtn = document.getElementById("newDnrBtn");

  const API_URL = "/api/delivery-note-returns";
  /* PAGINATION */

  const showingText =
    document.getElementById("dnrShowingText");

  const prevBtn =
    document.getElementById("dnrPrevBtn");

  const nextBtn =
    document.getElementById("dnrNextBtn");

  const pageText =
    document.getElementById("dnrPageText");

  const statusSortTh =
    document.getElementById("statusSortTh");

  const statusSortMenu =
    document.getElementById("statusSortMenu");

  let allRows = [];
  let filteredRows = [];

  let page = 1;
  let currentStatusSortMode = "";
  let statusSortHideTimer = null;

  const pageSize = 10;



  /* =====================================================
     TOAST MESSAGE
  ===================================================== */

  function showToast(message, type = "success") {

    const existing = document.querySelector(
      ".success-notification, .error-notification"
    );

    if (existing) existing.remove();

    const div = document.createElement("div");

    div.className =
      type === "error"
        ? "error-notification"
        : "success-notification";

    div.textContent = message;

    document.body.appendChild(div);

    requestAnimationFrame(() => {
      div.classList.add("show");
    });

    setTimeout(() => {

      div.classList.remove("show");

      setTimeout(() => {
        div.remove();
      }, 300);

    }, 3000);

  }



  /* =====================================================
     DATE VALIDATION
  ===================================================== */

  const DNR_INVALID_DATE_MSG =
     "Invalid date. Use format DD-MM-YYYY (e.g. 31-05-2026).";

  function parseDnrRowDate(dateStr) {

    const s = String(dateStr || "").trim();
    if (!s) return null;

    const dm = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dm) {
      const d = parseInt(dm[1], 10);
      const m = parseInt(dm[2], 10) - 1;
      const y = parseInt(dm[3], 10);
      const dt = new Date(y, m, d);
      if (
        dt.getFullYear() === y &&
        dt.getMonth() === m &&
        dt.getDate() === d
      ) {
        return dt;
      }
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const dt = new Date(s.slice(0, 10) + "T00:00:00");
      return isNaN(dt.getTime()) ? null : dt;
    }

    return null;

  }

  const DNR_DATE_RANGE_ERROR =
    "Delivery Return From date cannot be later than Delivery Return To date.";



  function parseISO(d) {

    if (!d) return null;

    const dt = new Date(d + "T00:00:00");

    return isNaN(dt.getTime())
      ? null
      : dt;

  }



  function isValidListDateString(value) {

    if (!value || typeof value !== "string")
      return false;

    const trimmed = value.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed))
      return false;

    const parts = trimmed.split("-");

    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);

    if (y < 1900 || y > 2100)
      return false;

    const date = new Date(y, m, d);

    if (
      date.getFullYear() !== y ||
      date.getMonth() !== m ||
      date.getDate() !== d
    ) {
      return false;
    }

    return true;

  }



  function isInvalidDeliveryReturnDateRange(fd, td) {

    if (!fd || !td)
      return false;

    const fromTime = new Date(fd).getTime();
    const toTime = new Date(td).getTime();

    return fromTime > toTime;

  }



  function inDateRange(rowDateStr, fromStr, toStr) {

    const d = parseDnrRowDate(rowDateStr);

    if (!d) return false;

    const f = parseISO(fromStr);
    const t = parseISO(toStr);

    if (f && d < f) return false;

    if (t && d > t) return false;

    return true;

  }



  /* =====================================================
     LOAD STATUS FILTER
  ===================================================== */

  function loadStatusFilter(rows) {

    statusFilter.innerHTML = "";

    const allOption = document.createElement("option");

    allOption.value = "all";
    allOption.textContent = "All";

    statusFilter.appendChild(allOption);

    const uniqueStatuses = [...new Set(
      rows.map(r => r.status)
    )];

    uniqueStatuses.forEach(status => {

      if (!status) return;

      const option = document.createElement("option");

      option.value = status;
      option.textContent = status;

      statusFilter.appendChild(option);

    });

  }



  /* =====================================================
     LOAD DELIVERY NOTE RETURN LIST
  ===================================================== */

  function dnrListSortKey(row) {

    const idPart =
      parseInt(
        String(row.dnr_id || "").split("-")[1],
        10
      );

    const idNum =
      Number.isFinite(idPart)
        ? idPart
        : 0;

    const dateStr =
      String(row.dnr_date || "").trim();

    const dateTs =
      dateStr
        ? new Date(dateStr + "T00:00:00").getTime()
        : 0;

    return {
      dateTs: Number.isFinite(dateTs) ? dateTs : 0,
      idNum
    };

  }

  function sortDnrRowsNewestFirst(rows) {

    return [...(rows || [])].sort((a, b) => {

      const ka = dnrListSortKey(a);
      const kb = dnrListSortKey(b);

      if(kb.dateTs !== ka.dateTs)
        return kb.dateTs - ka.dateTs;

      return kb.idNum - ka.idNum;

    });

  }

  const DNR_STATUS_SORT_ORDER = [
    "draft",
    "submitted",
    "cancelled",
  ];

  function normalizeDnrStatus(v) {
    return String(v || "")
      .trim()
      .toLowerCase()
      .replaceAll(" ", "_");
  }

  function dnrStatusRank(status) {
    const key = normalizeDnrStatus(status);
    const i = DNR_STATUS_SORT_ORDER.indexOf(key);
    return i === -1 ? 999 : i;
  }

  function sortRowsByMode(rows, mode) {

    const list = [...(rows || [])];

    if (mode === "newest") {
      return sortDnrRowsNewestFirst(list);
    }

    if (mode === "oldest") {
      return list.sort((a, b) => {

        const ka = dnrListSortKey(a);
        const kb = dnrListSortKey(b);

        if (ka.dateTs !== kb.dateTs) {
          return ka.dateTs - kb.dateTs;
        }

        return ka.idNum - kb.idNum;

      });
    }

    if (mode === "progress") {
      return list.sort(
        (a, b) =>
          dnrStatusRank(a.status) - dnrStatusRank(b.status)
      );
    }

    if (mode === "reverse") {
      return list.sort(
        (a, b) =>
          dnrStatusRank(b.status) - dnrStatusRank(a.status)
      );
    }

    return list;

  }

  function syncStatusSortMenuActive() {

    if (!statusSortMenu) return;

    statusSortMenu
      .querySelectorAll("button[data-sort]")
      .forEach((b) => {
        b.classList.toggle(
          "dnr-sort-option--active",
          b.dataset.sort === currentStatusSortMode
        );
      });

  }

  function applyStatusSort(mode) {

    currentStatusSortMode = mode || "";
    syncStatusSortMenuActive();
    page = 1;
    applyFilters();

  }

  function openStatusSortMenu() {

    clearTimeout(statusSortHideTimer);
    statusSortTh?.classList.add("open");

  }

  function closeStatusSortMenu() {

    clearTimeout(statusSortHideTimer);
    statusSortTh?.classList.remove("open");

  }

  function scheduleStatusSortMenuClose() {

    clearTimeout(statusSortHideTimer);
    statusSortHideTimer = setTimeout(closeStatusSortMenu, 120);

  }

  async function loadDnrList() {

    try {

      const response = await fetch(API_URL);

      const data = await response.json();

      allRows = sortDnrRowsNewestFirst(data || []);

      loadStatusFilter(allRows);

      renderTable(allRows);

    }
    catch (error) {

      console.error(error);

      showToast(
        "Failed to load Delivery Note Return list",
        "error"
      );

    }

  }



  /* =====================================================
     RENDER TABLE
  ===================================================== */

  function renderTable(rows) {

  filteredRows = rows;

  tbody.innerHTML = "";

  const total = filteredRows.length;

  const totalPages =
    Math.max(1, Math.ceil(total / pageSize));

  if (page > totalPages) {
    page = totalPages;
  }

  if (page < 1) {
    page = 1;
  }

  const startIndex =
    (page - 1) * pageSize;

  const pageItems =
    filteredRows.slice(
      startIndex,
      startIndex + pageSize
    );

  /* EMPTY */

  if (!pageItems.length) {

    tbody.appendChild(noDataRow);

  }
  else {

    pageItems.forEach(row => {

      const tr =
        document.createElement("tr");

      /* ID */

      const tdId =
        document.createElement("td");

      tdId.textContent =
        row.dnr_id || "-";

      /* REF */

      const tdRef =
        document.createElement("td");

      tdRef.textContent =
        row.invoice_return_ref || "-";

      /* CUSTOMER */

      const tdCustomer =
        document.createElement("td");

      tdCustomer.textContent =
        row.customer_name || "-";

      /* DATE */

      const tdDate =
        document.createElement("td");

      tdDate.textContent =
        row.dnr_date || "-";

      /* STATUS */

      const tdStatus =
        document.createElement("td");

      tdStatus.className = "dnr-td-status";

      const statusBadge =
        document.createElement("span");

      statusBadge.className =
        `dnr-badge ${normalizeDnrStatus(row.status)}`;

      statusBadge.textContent =
        row.status || "-";

      tdStatus.appendChild(statusBadge);

      /* ACTION */

      const tdAction =
        document.createElement("td");

      tdAction.className =
        "dnr-td-action";

      const dots =
        document.createElement("button");

      dots.type = "button";

      dots.className =
        "dnr-act-dots";

      dots.textContent = "⋮";

      attachHoverMenu(dots, row);

      tdAction.appendChild(dots);

      /* APPEND */

      tr.appendChild(tdId);
      tr.appendChild(tdRef);
      tr.appendChild(tdCustomer);
      tr.appendChild(tdDate);
      tr.appendChild(tdStatus);
      tr.appendChild(tdAction);

      tbody.appendChild(tr);

    });

  }

  /* SHOWING */

  if (showingText) {

    const shown =
      pageItems.length;

    const start =
      total === 0
        ? 0
        : startIndex + 1;

    const end =
      startIndex + shown;

    showingText.textContent =
      `Showing ${start}-${end} of ${total} Entries`;

  }

  /* PAGE TEXT */

  if (pageText) {

    pageText.innerHTML =
      `Page <strong>${page}</strong> of <strong>${totalPages}</strong>`;

  }

  /* BUTTON STATES */

  if (prevBtn) {

    /* BUTTON STATES */

setBtnDisabled(
  prevBtn,
  page <= 1 || total === 0
);

setBtnDisabled(
  nextBtn,
  page >= totalPages || total === 0
);

/* SINGLE PAGE */

if (totalPages === 1) {

  setBtnDisabled(prevBtn, true);

  setBtnDisabled(nextBtn, true);

}
  }

}

  /* =====================================================
     APPLY FILTERS
  ===================================================== */

  function applyFilters() {

    const search =
      searchInput.value.trim().toLowerCase();

    const status =
      statusFilter.value;

    const fdRaw =
      fromDate.value.trim();

    const tdRaw =
      toDate.value.trim();

    const fd =
      fdRaw && isValidListDateString(fdRaw)
        ? fdRaw
        : "";

    const td =
      tdRaw && isValidListDateString(tdRaw)
        ? tdRaw
        : "";

    let filtered = [...allRows];



    /* SEARCH FILTER */

    if (search) {

      filtered = filtered.filter(r => {

        const dnrId =
          String(r.dnr_id || "").toLowerCase();

        const customer =
          String(r.customer_name || "").toLowerCase();

        const invoiceRef =
          String(r.invoice_return_ref || "").toLowerCase();

        return (
          dnrId.includes(search) ||
          customer.includes(search) ||
          invoiceRef.includes(search)
        );

      });

    }



    /* STATUS FILTER */

    if (status !== "all") {

      filtered = filtered.filter(r =>

        String(r.status) === status

      );

    }



    /* DATE FILTER */

    if (fd || td) {

      filtered = filtered.filter(r =>

        inDateRange(
          r.dnr_date,
          fd,
          td
        )

      );

    }

    if (currentStatusSortMode) {
      filtered = sortRowsByMode(
        filtered,
        currentStatusSortMode
      );
    }

    renderTable(filtered);

  }



  /* =====================================================
     FROM DATE FILTER
  ===================================================== */

  function handleFromDateFilter() {

    const fd =
      fromDate.value.trim();

    if (
      fd &&
      !isValidListDateString(fd)
    ) {

      showToast(
        DNR_INVALID_DATE_MSG,
        "error"
      );

      fromDate.value = "";

      applyFilters();

      return;

    }

    const td =
      toDate.value.trim();

    if (
      td &&
      !isValidListDateString(td)
    ) {

      showToast(
        DNR_INVALID_DATE_MSG,
        "error"
      );

      toDate.value = "";

      applyFilters();

      return;

    }

    if (
      isInvalidDeliveryReturnDateRange(fd, td)
    ) {

      showToast(
        DNR_DATE_RANGE_ERROR,
        "error"
      );

      fromDate.value = "";

      return;

    }

    applyFilters();

  }



  /* =====================================================
     TO DATE FILTER
  ===================================================== */

  function handleToDateFilter() {

    const td =
      toDate.value.trim();

    if (
      td &&
      !isValidListDateString(td)
    ) {

      showToast(
        DNR_INVALID_DATE_MSG,
        "error"
      );

      toDate.value = "";

      applyFilters();

      return;

    }

    const fd =
      fromDate.value.trim();

    if (
      fd &&
      !isValidListDateString(fd)
    ) {

      showToast(
        DNR_INVALID_DATE_MSG,
        "error"
      );

      fromDate.value = "";

      applyFilters();

      return;

    }

    if (
      isInvalidDeliveryReturnDateRange(fd, td)
    ) {

      showToast(
        DNR_DATE_RANGE_ERROR,
        "error"
      );

      toDate.value = "";

      return;

    }

    applyFilters();

  }



  /* =====================================================
     CLEAR FILTERS
  ===================================================== */

  function clearFilters() {

    searchInput.value = "";

    statusFilter.value = "all";

    fromDate.value = "";

    toDate.value = "";

    currentStatusSortMode = "";
    syncStatusSortMenuActive();

    renderTable(allRows);

  }



  /* =====================================================
     EVENTS
  ===================================================== */

  searchInput.addEventListener(
    "input",
    applyFilters
  );

  statusFilter.addEventListener(
    "change",
    applyFilters
  );

  fromDate.addEventListener(
    "change",
    handleFromDateFilter
  );

  fromDate.addEventListener(
    "blur",
    handleFromDateFilter
  );

  toDate.addEventListener(
    "change",
    handleToDateFilter
  );

  toDate.addEventListener(
    "blur",
    handleToDateFilter
  );

  clearBtn.addEventListener(
    "click",
    clearFilters
  );

  if (statusSortTh && statusSortMenu) {

    statusSortTh.addEventListener("mouseenter", openStatusSortMenu);
    statusSortTh.addEventListener("mouseleave", scheduleStatusSortMenuClose);
    statusSortMenu.addEventListener("mouseenter", openStatusSortMenu);
    statusSortMenu.addEventListener("mouseleave", scheduleStatusSortMenuClose);

    statusSortMenu.addEventListener("click", (e) => {

      const btn = e.target.closest("[data-sort]");

      if (!btn) return;

      applyStatusSort(btn.dataset.sort);
      closeStatusSortMenu();

    });

  }



  /* =====================================================
     NEW DELIVERY NOTE RETURN BUTTON
  ===================================================== */

  newBtn.addEventListener("click", () => {

    window.location.href =
      "/deliverynote_return/new";

  });

/* =====================================================
   RESTRICT DATE INPUT
===================================================== */

function restrictDateInput(input) {

  if (!input) return;

  input.setAttribute("title", "");

  input.addEventListener("focus", () => {
    input.setAttribute("title", "");
  });

  input.addEventListener("mouseenter", () => {
    input.setAttribute("title", "");
  });

  input.addEventListener("invalid", (e) => {
    e.preventDefault();
    input.setCustomValidity("");
  });

  input.addEventListener("change", () => {
    input.setCustomValidity("");
  });

  input.addEventListener("blur", () => {
    input.setCustomValidity("");
  });

  input.addEventListener("input", () => {

    input.setCustomValidity("");

    let value = input.value;

    if (!value) return;

    const parts = value.split("-");

    /* YEAR */

    if (parts[0] && parts[0].length > 4) {
      parts[0] = parts[0].slice(0, 4);
      input.value = parts.join("-");
      return;
    }

    /* MONTH */

    if (parts[1] && parts[1].length > 2) {

      input.value = "";

      return;

    }

    /* DATE */

    if (parts[2] && parts[2].length > 2) {

      input.value = "";

    }

  });

}

/* =====================================================
   DATE INPUT RESTRICTION
===================================================== */

restrictDateInput(fromDate);

restrictDateInput(toDate);



/* =========================================================
   ACTION MENU (THREE DOTS HOVER)
========================================================= */

let flyEl = null;
let hideTimer = null;

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

function goViewPage(dnrId) {
  window.location.href =
    `/deliverynote_return/form?id=${encodeURIComponent(dnrId)}&mode=view`;
}

function buildFlyMenu(row, anchorBtn) {

  flyEl = document.createElement("div");
  flyEl.className = "dnr-act-fly";

  const status =
    String(row.status || "")
      .trim()
      .toLowerCase()
      .replaceAll(" ", "_");

  /* DRAFT CHECK */

  const isDraft =
    status === "draft";

  /* LABEL */

  const label =
    isDraft
      ? "Edit details"
      : "View details";

  /* MODE */

  let mode = "view";

  if(isDraft)
    mode = "edit";
  else if(status === "submitted")
    mode = "view-submitted";
  else if(status === "cancelled")
    mode = "view-cancelled";

  /* BUTTON */

  const btn =
  document.createElement("button");

  btn.type = "button";

  btn.className =
    "dnr-act-item";

  btn.textContent = label;

  btn.addEventListener("click", () => {

    window.location.href =
      `/deliverynote_return/form?id=${encodeURIComponent(row.dnr_id)}&mode=${mode}`;

  });

  flyEl.appendChild(btn);

  flyEl.addEventListener("mouseenter", keepOpen);
  flyEl.addEventListener("mouseleave", scheduleHide);

  document.body.appendChild(flyEl);

  /* ===== Position ===== */

  const rect = anchorBtn.getBoundingClientRect();

  flyEl.style.visibility = "hidden";
  flyEl.style.left = "0px";
  flyEl.style.top = "0px";

  const popRect = flyEl.getBoundingClientRect();

  const gap = 8;
  const DROP_Y = 25;

  let top =
    rect.top - popRect.height - gap + DROP_Y;

  if (top < 8) {
    top = rect.bottom + gap + DROP_Y;
  }

  let left = rect.right - popRect.width;

  const maxLeft =
    window.innerWidth - popRect.width - 8;

  if (left > maxLeft) {
    left = maxLeft;
  }

  if (left < 8) {
    left = 8;
  }

  flyEl.style.left = `${Math.round(left)}px`;
  flyEl.style.top = `${Math.round(top)}px`;
  flyEl.style.visibility = "visible";
}

function attachHoverMenu(btn, row) {

  btn.addEventListener("mouseenter", () => {
    removeFly();
    keepOpen();
    buildFlyMenu(row, btn);
  });

  btn.addEventListener("mouseleave", scheduleHide);
}

window.addEventListener("scroll", removeFly, true);
window.addEventListener("resize", removeFly);


/* =====================================================
   PAGINATION EVENTS
===================================================== */

prevBtn?.addEventListener("click", () => {

  if (page <= 1) return;

  page--;

  renderTable(filteredRows);

});

nextBtn?.addEventListener("click", () => {

  const totalPages =
    Math.max(
      1,
      Math.ceil(filteredRows.length / pageSize)
    );

  if (page >= totalPages) return;

  page++;

  renderTable(filteredRows);

});


function setBtnDisabled(btn, disabled) {

  if (!btn) return;

  btn.classList.toggle(
    "disabled",
    !!disabled
  );

  btn.disabled = !!disabled;

  btn.setAttribute(
    "aria-disabled",
    disabled ? "true" : "false"
  );

}
  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  try {

    const dnrToast =
      localStorage.getItem("dnrListToast");

    if(dnrToast === "draft"){

      showToast(
        "Delivery note return saved as Draft successfully",
        "success"
      );

      localStorage.removeItem("dnrListToast");

    }
    else if(dnrToast === "submitted"){

      showToast(
        "Delivery note return saved as Submitted successfully",
        "success"
      );

      localStorage.removeItem("dnrListToast");

    }
    else if(dnrToast === "cancelled"){

      showToast(
        "Delivery note return saved as Cancelled successfully",
        "success"
      );

      localStorage.removeItem("dnrListToast");

    }

  }
  catch(e){}

  loadDnrList();

});