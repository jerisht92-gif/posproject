


document.addEventListener("DOMContentLoaded", () => {
  /* =========================================================
     CONFIG
  ========================================================== */
  const pageSize = 10;

  const API_URL = "/api/delivery-notes";
  const SECOND_PAGE_URL = "/delivery_note/form";

  /* =========================================================
     DOM REFERENCES
  ========================================================== */
  const tbody = document.getElementById("dnTbody");
  const noDataRow = document.getElementById("dnNoDataRow");

  const searchInput = document.getElementById("dnSearchInput");
  const clearBtn = document.getElementById("dnClearBtn");

  const statusFilter = document.getElementById("dnStatusFilter");
  const typeFilter = document.getElementById("dnTypeFilter");
  const fromDate = document.getElementById("dnFromDate");
  const toDate = document.getElementById("dnToDate");

  const showingText = document.getElementById("dnShowingText");
  const prevBtn = document.getElementById("dnPrevBtn");
  const nextBtn = document.getElementById("dnNextBtn");
  const pageText = document.getElementById("dnPageText");

  const newBtn = document.getElementById("newDeliveryNoteBtn");

  // Generate buttons (enabled when any row checkbox is checked)
  const genInvoiceBtn = document.getElementById("genInvoiceBtn");
  const genDeliveryReturnBtn = document.getElementById("genDeliveryReturnBtn");

  /* =========================================================
     STATE
  ========================================================== */
  let allRows = [];
  let filteredRows = [];
  let page = 1;

  /* =========================================================
     SMALL HELPERS
  ========================================================== */
  const titleCase = (s) => {
  const t = String(s || "").replaceAll("_", " ");
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
};

/* =========================================================
   DELIVERY NOTE STATUS MASTER
========================================================== */
const DELIVERY_NOTE_STATUSES = [
  "Draft",
  
  "Delivered",
  "Partially Delivered",
  "Returned",
  "Cancelled"
];

function loadDnStatusFilterOptions() {
  if (!statusFilter) return;

  statusFilter.innerHTML = "";

  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = "All";
  statusFilter.appendChild(allOpt);

  DELIVERY_NOTE_STATUSES.forEach((status) => {
    const opt = document.createElement("option");
    opt.value = normalizeStatus(status);
    opt.textContent = status;
    statusFilter.appendChild(opt);
  });
}
  function normalizeStatus(v) {
    return String(v || "").trim().toLowerCase().replaceAll(" ", "_");
  }

  const statusBadgeClass = (status) => normalizeStatus(status);

  function statusLabel(v) {
  const key = normalizeStatus(v);
  const map = {
    draft: "Draft",
    
    delivered: "Delivered",
    partially_delivered: "Partially Delivered",
    returned: "Returned",
    cancelled: "Cancelled",
  };
  return map[key] || "—";
}

  function setBtnDisabled(btn, disabled) {
    if (!btn) return;
    btn.classList.toggle("disabled", !!disabled);
    btn.disabled = !!disabled;
    btn.setAttribute("aria-disabled", disabled ? "true" : "false");
  }

  /* Match Sales Order / Quotation toast behavior */
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

  function parseISO(d) {
    if (!d) return null;
    const dt = new Date(d + "T00:00:00");
    return isNaN(dt.getTime()) ? null : dt;
  }

  /** Match sales-new.js / New Sales Order date fields (YYYY-MM-DD, 1900–2100, real calendar date). */
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
    if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return false;
    return true;
  }

  const DN_INVALID_DATE_MSG =
    "Invalid date. Use format YYYY-MM-DD (e.g. 2026-03-09).";

  const DN_DATE_RANGE_ERROR =
    "Delivery From date cannot be later than Delivery To date.";

  function isInvalidDeliveryDateRange(fd, td) {
    if (!fd || !td) return false;
    const a = parseISO(fd);
    const b = parseISO(td);
    return a && b && a.getTime() > b.getTime();
  }

  function inDateRange(rowDateStr, fromStr, toStr) {
    const d = parseISO(rowDateStr);
    if (!d) return false;

    const f = parseISO(fromStr);
    const t = parseISO(toStr);

    if (f && d < f) return false;
    if (t && d > t) return false;
    return true;
  }

  function clearDataRows() {
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll("tr"));
    rows.forEach((tr) => {
      if (tr.id !== "dnNoDataRow") tr.remove();
    });
  }

  /* =========================================================
     NAVIGATION / ACTION HELPERS
  ========================================================== */
  function goSecondPage(dnId, mode) {
    const url = `${SECOND_PAGE_URL}?id=${encodeURIComponent(dnId)}&mode=${encodeURIComponent(mode)}`;
    window.location.href = url;
  }

  function generateInvoice(dnId) {
    window.location.href = `/delivery-invoice/create/${encodeURIComponent(dnId)}`;
  }

  function generateDeliveryReturn(dnId) {
    window.location.href = `/deliverynote_return/new?dn_id=${encodeURIComponent(dnId)}`;
  }

  /* =========================================================
     BODY-ATTACHED HOVER FLY MENU (3 dots)
  ========================================================== */
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

  function buildFlyMenu(row, anchorBtn) {
    const dnId = row.dn_id;
    const st = normalizeStatus(row.status);

    const isDraft = st === "draft";
    const isPartial = st === "partially_delivered";
    const isDelivered = st === "delivered";
    const isReturned = st === "returned";
    const isCancelled = st === "cancelled";

    // First menu item is Edit only for Draft; otherwise View
    const firstLabel = isDraft ? "Edit details" : "View details";
    const firstMode = isDraft ? "edit" : "view";

    // Generate rules (same logic you had)
    let canReturn = isPartial || isDelivered || isReturned;
    let canInvoice = isPartial || isDelivered || isReturned;

    if (isCancelled || isDraft) {
      canReturn = false;
      canInvoice = false;
    }

    flyEl = document.createElement("div");
    flyEl.className = "dn-act-fly";

    const mkItem = (label, onClick, disabled) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dn-act-item";
      b.textContent = label;
      b.disabled = !!disabled;
      if (!disabled) b.addEventListener("click", onClick);
      return b;
    };

    flyEl.appendChild(mkItem(firstLabel, () => goSecondPage(dnId, firstMode), false));
    flyEl.appendChild(mkItem("Generate Delivery Return", () => generateDeliveryReturn(dnId), !canReturn));
    flyEl.appendChild(mkItem("Generate Invoice", () => generateInvoice(dnId), !canInvoice));

    flyEl.addEventListener("mouseenter", keepOpen);
    flyEl.addEventListener("mouseleave", scheduleHide);

    document.body.appendChild(flyEl);

    // Position the fly menu near the button
    const btnRect = anchorBtn.getBoundingClientRect();

    // Measure popup size
    flyEl.style.visibility = "hidden";
    flyEl.style.left = "0px";
    flyEl.style.top = "0px";
    const popRect = flyEl.getBoundingClientRect();

    const gap = 8;
    const DROP_Y = 25;

    // Try showing above; if not enough space, show below
    let top = btnRect.top - popRect.height - gap + DROP_Y;
    if (top < 8) top = btnRect.bottom + gap + DROP_Y;

    // Align right edge of popup to right edge of button
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
      buildFlyMenu(row, btn);
    });
    btn.addEventListener("mouseleave", scheduleHide);
  }

  window.addEventListener("scroll", () => removeFly(), true);
  window.addEventListener("resize", () => removeFly());

  /* =========================================================
     CHECKBOX -> ENABLE GENERATE BUTTONS
  ========================================================== */
  function toggleGenerateButtons() {
    const anyChecked = document.querySelectorAll(".row-check:checked").length > 0;
    if (genInvoiceBtn) genInvoiceBtn.disabled = !anyChecked;
    if (genDeliveryReturnBtn) genDeliveryReturnBtn.disabled = !anyChecked;
  }

  document.addEventListener("change", (e) => {
    if (!e.target.classList.contains("row-check")) return;
    toggleGenerateButtons();
  });

  /* =========================================================
     DATA LOAD
  ========================================================== */
  async function loadData() {
    try {
      const res = await fetch(API_URL, { cache: "no-store" });
      const result = await res.json();
      const data = result.data || [];

      allRows = Array.isArray(data)
        ? data.map((x) => ({
            dn_id: x.dn_id || "",
            so_ref: x.so_ref || "",
            customer_name: x.customer_name || "",
            delivery_type: x.delivery_type || "regular",
            delivery_date: x.delivery_date || "",
            status: normalizeStatus(x.delivery_status || x.status || "draft"),
          }))
        : [];
    } catch (e) {
      console.error(e);
      allRows = [];
    }

    applyFilters(true);
  }
  /* =========================================================
     FILTERS
  ========================================================== */
  function applyFilters(resetPage = false) {
    const q = (searchInput?.value || "").trim().toLowerCase();
    const st = (statusFilter?.value || "all").toLowerCase();
    const tp = (typeFilter?.value || "all").toLowerCase();
    const fdRaw = (fromDate?.value || "").trim();
    const tdRaw = (toDate?.value || "").trim();
    const fd = fdRaw && isValidListDateString(fdRaw) ? fdRaw : "";
    const td = tdRaw && isValidListDateString(tdRaw) ? tdRaw : "";

    filteredRows = allRows.filter((r) => {
      const hay = `${r.dn_id} ${r.so_ref} ${r.customer_name}`.toLowerCase();
      const okSearch = !q || hay.includes(q);

      const okStatus = st === "all" || String(r.status).toLowerCase() === st;
      const okType = tp === "all" || String(r.delivery_type).toLowerCase() === tp;

      const okDate = !fd && !td ? true : inDateRange(r.delivery_date, fd, td);

      return okSearch && okStatus && okType && okDate;
    });

    if (resetPage) page = 1;
    render();
  }

  /* =========================================================
     RENDER
  ========================================================== */
  function render() {
    if (!tbody) return;

    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;

    const startIndex = (page - 1) * pageSize;
    const pageItems = filteredRows.slice(startIndex, startIndex + pageSize);

    clearDataRows();

    if (pageItems.length === 0) {
      if (noDataRow) noDataRow.style.display = "";
    } else {
      if (noDataRow) noDataRow.style.display = "none";

      pageItems.forEach((r, idx) => {
        
        const tr = document.createElement("tr");

        // Checkbox cell
        const tdCheck = document.createElement("td");
        tdCheck.className = "dn-td-check";
        tdCheck.innerHTML = `<input type="checkbox" class="row-check" data-id="${r.dn_id}">`;

        const tdDn = document.createElement("td");
        tdDn.textContent = r.dn_id;

        const tdSo = document.createElement("td");
        tdSo.textContent = r.so_ref;

        const tdCus = document.createElement("td");
        tdCus.textContent = r.customer_name;

        const tdType = document.createElement("td");
        tdType.textContent = titleCase(r.delivery_type);

        const tdDate = document.createElement("td");
        tdDate.textContent = r.delivery_date;

        const tdStatus = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = `dn-badge ${statusBadgeClass(r.status)}`;
        badge.textContent = statusLabel(r.status);
        tdStatus.appendChild(badge);

        const tdAction = document.createElement("td");
        tdAction.className = "dn-td-action";
        tdAction.style.textAlign = "right";

        const dots = document.createElement("button");
        dots.type = "button";
        dots.className = "dn-act-dots";
        dots.textContent = "⋮";

        attachHoverMenu(dots, r);
        tdAction.appendChild(dots);

        // Append all cells in the exact table order
        tr.appendChild(tdCheck);
        
        tr.appendChild(tdDn);
        tr.appendChild(tdSo);
        tr.appendChild(tdCus);
        tr.appendChild(tdType);
        tr.appendChild(tdDate);
        tr.appendChild(tdStatus);
        tr.appendChild(tdAction);

        tbody.appendChild(tr);
      });
    }

    const shown = pageItems.length;
    if (showingText) showingText.textContent = `Showing ${shown} of ${total} Entries`;
    if (pageText) pageText.innerHTML = `Page <strong>${page}</strong> of <strong>${totalPages}</strong>`;

    setBtnDisabled(prevBtn, page <= 1 || total === 0);
    setBtnDisabled(nextBtn, page >= totalPages || total === 0);

    if (totalPages === 1) {
      setBtnDisabled(prevBtn, true);
      setBtnDisabled(nextBtn, true);
    }

    // Reset generate buttons after re-render
    toggleGenerateButtons();
  }

  /* =========================================================
     EVENTS
  ========================================================== */
  newBtn?.addEventListener("click", () => (window.location.href = "/delivery_note/new"));

  searchInput?.addEventListener("input", () => applyFilters(true));
  statusFilter?.addEventListener("change", () => applyFilters(true));
  typeFilter?.addEventListener("change", () => applyFilters(true));

  function handleFromDateFilter() {
    const fd = fromDate?.value?.trim() || "";
    if (fd && !isValidListDateString(fd)) {
      showToast(DN_INVALID_DATE_MSG, "error");
      if (fromDate) fromDate.value = "";
      applyFilters(true);
      return;
    }
    const td = toDate?.value?.trim() || "";
    if (td && !isValidListDateString(td)) {
      showToast(DN_INVALID_DATE_MSG, "error");
      if (toDate) toDate.value = "";
      applyFilters(true);
      return;
    }
    const fd2 = fromDate?.value || "";
    const td2 = toDate?.value || "";
    if (isInvalidDeliveryDateRange(fd2, td2)) {
      showToast(DN_DATE_RANGE_ERROR, "error");
      if (fromDate) fromDate.value = "";
    }
    applyFilters(true);
  }

  function handleToDateFilter() {
    const td = toDate?.value?.trim() || "";
    if (td && !isValidListDateString(td)) {
      showToast(DN_INVALID_DATE_MSG, "error");
      if (toDate) toDate.value = "";
      applyFilters(true);
      return;
    }
    const fd = fromDate?.value?.trim() || "";
    if (fd && !isValidListDateString(fd)) {
      showToast(DN_INVALID_DATE_MSG, "error");
      if (fromDate) fromDate.value = "";
      applyFilters(true);
      return;
    }
    const fd2 = fromDate?.value || "";
    const td2 = toDate?.value || "";
    if (isInvalidDeliveryDateRange(fd2, td2)) {
      showToast(DN_DATE_RANGE_ERROR, "error");
      if (toDate) toDate.value = "";
    }
    applyFilters(true);
  }

  fromDate?.addEventListener("change", handleFromDateFilter);
  fromDate?.addEventListener("blur", handleFromDateFilter);
  toDate?.addEventListener("change", handleToDateFilter);
  toDate?.addEventListener("blur", handleToDateFilter);

  clearBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (statusFilter) statusFilter.value = "all";
    if (typeFilter) typeFilter.value = "all";
    if (fromDate) fromDate.value = "";
    if (toDate) toDate.value = "";
    applyFilters(true);
    searchInput?.focus();
  });

  prevBtn?.addEventListener("click", () => {
    if (prevBtn.classList.contains("disabled")) return;
    page -= 1;
    render();
  });

  nextBtn?.addEventListener("click", () => {
    if (nextBtn.classList.contains("disabled")) return;
    page += 1;
    render();
  });

  /* =========================================================
     INIT
  ========================================================== */
  try {
    const dnToast = localStorage.getItem("deliveryNoteListToast");
    if (dnToast === "draft") {
      showToast("Delivery Note draft saved Successfully", "success");
      localStorage.removeItem("deliveryNoteListToast");
    } else if (dnToast === "updated") {
      showToast("Delivery Note updated Successfully", "success");
      localStorage.removeItem("deliveryNoteListToast");
    } else if (dnToast === "submitted") {
      showToast("Delivery Note submitted Successfully", "success");
      localStorage.removeItem("deliveryNoteListToast");
    }
  } catch (e) {}

  loadDnStatusFilterOptions();
  loadData();
});