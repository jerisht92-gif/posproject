/**
 * Delivery Note Return — list page
 */
document.addEventListener("DOMContentLoaded", () => {
  const PAGE_SIZE = 10;
  const API_URL = "/api/delivery-note-returns";

  const tbody = document.getElementById("dnrTbody");
  const noData = document.getElementById("dnrNoData");
  const searchInput = document.getElementById("dnrSearchInput");
  const statusFilter = document.getElementById("dnrStatusFilter");
  // const customerFilter = document.getElementById("dnrCustomerFilter");
  const fromDate = document.getElementById("dnrFromDate");
  const toDate = document.getElementById("dnrToDate");
  const clearBtn = document.getElementById("dnrClearBtn");
  const showingEl = document.getElementById("dnrShowing");
  const prevBtn = document.getElementById("dnrPrevBtn");
  const nextBtn = document.getElementById("dnrNextBtn");
  const pageCurrentEl = document.getElementById("dnrPageCurrent");
  const pageTotalEl = document.getElementById("dnrPageTotal");
  const newBtn = document.getElementById("dnrNewBtn");

  if (!tbody || !statusFilter) return;

  let allRows = [];
  let filteredRows = [];
  let currentPage = 1;

  /** Body-attached hover fly menu (same pattern as delivery-note.js) */
  let dnrFlyEl = null;
  let dnrHideTimer = null;

  function removeDnrFly() {
    if (dnrFlyEl) {
      dnrFlyEl.remove();
      dnrFlyEl = null;
    }
  }

  function scheduleDnrHide() {
    clearTimeout(dnrHideTimer);
    dnrHideTimer = setTimeout(() => removeDnrFly(), 120);
  }

  function keepDnrFlyOpen() {
    clearTimeout(dnrHideTimer);
  }

  function goDnrDetailPage(dnrId, mode) {
    window.location.href = `/deliverynote_return/new?dnr_id=${encodeURIComponent(dnrId)}&mode=${encodeURIComponent(mode)}`;
  }

  function buildDnrFlyMenu(row, anchorBtn) {
    const dnrId = row.dnrId;
    const st = norm(row.status);

    const isDraft = st === "draft";

    let firstLabel = isDraft ? "Edit details" : "View details";
    let firstMode = isDraft ? "edit" : "view";

    removeDnrFly();
    dnrFlyEl = document.createElement("div");
    dnrFlyEl.className = "dnr-act-fly";

    const mkItem = (label, onClick, disabled) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dnr-act-item";
      b.textContent = label;
      b.disabled = !!disabled;
      if (!disabled) b.addEventListener("click", onClick);
      return b;
    };

    dnrFlyEl.appendChild(
      mkItem(firstLabel, () => goDnrDetailPage(dnrId, firstMode), false)
    );

    dnrFlyEl.addEventListener("mouseenter", keepDnrFlyOpen);
    dnrFlyEl.addEventListener("mouseleave", scheduleDnrHide);

    document.body.appendChild(dnrFlyEl);

    const btnRect = anchorBtn.getBoundingClientRect();

    dnrFlyEl.style.visibility = "hidden";
    dnrFlyEl.style.left = "0px";
    dnrFlyEl.style.top = "0px";

    const popRect = dnrFlyEl.getBoundingClientRect();

    const gap = 8;
    const DROP_Y = 25;

    let top = btnRect.top - popRect.height - gap + DROP_Y;
    if (top < 8) top = btnRect.bottom + gap + DROP_Y;

    let left = btnRect.right - popRect.width;
    const maxLeft = window.innerWidth - popRect.width - 8;

    if (left > maxLeft) left = maxLeft;
    if (left < 8) left = 8;

    dnrFlyEl.style.left = `${Math.round(left)}px`;
    dnrFlyEl.style.top = `${Math.round(top)}px`;
    dnrFlyEl.style.visibility = "visible";
  }
    

  function attachDnrHoverMenu(btn, row) {
    btn.addEventListener("mouseenter", () => {
      removeDnrFly();
      keepDnrFlyOpen();
      buildDnrFlyMenu(row, btn);
    });
    btn.addEventListener("mouseleave", scheduleDnrHide);
  }

  window.addEventListener("scroll", () => removeDnrFly(), true);
  window.addEventListener("resize", () => removeDnrFly());

  const esc = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const norm = (s) => String(s ?? "").trim().toLowerCase();

  function toDateObj(val) {
    if (!val) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    const dt = new Date(val);
    return isNaN(dt.getTime()) ? null : dt;
  }

  function formatDMY(val) {
    const dt = toDateObj(val);
    if (!dt) return "";
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const yy = dt.getFullYear();
    return `${dd}-${mm}-${yy}`;
  }

  function getField(row, ...keys) {
    for (const k of keys) {
      if (row && row[k] != null && row[k] !== "") return row[k];
    }
    return "";
  }

  function statusClass(status) {
    const s = norm(status);

    if (s === "draft") return "pill pill-draft";
    if (s === "submitted") return "pill pill-submitted";
    if (s === "cancelled") return "pill pill-cancelled";

    return "pill";
  }

  function fillFilterOptions() {
  statusFilter.innerHTML = `<option value="all">All</option>`;

  const fixedStatuses = ["Draft", "Submitted", "Cancelled"];

  fixedStatuses.forEach((status) => {
    const opt = document.createElement("option");
    opt.value = status;
    opt.textContent = status;
    statusFilter.appendChild(opt);
  });
}
  function applyFilters(resetPage = false) {
  if (resetPage) currentPage = 1;

  const q = norm(searchInput.value);
  const stVal = statusFilter.value;
  const from = toDateObj(fromDate.value);
  const to = toDateObj(toDate.value);

  filteredRows = allRows.filter((r) => {
    const dnrId = String(getField(r, "dnr_id", "dnrId", "id")).trim();
    const invRef = String(
      getField(r, "invoice_return_ref", "invoiceReturnRef", "inv_return_ref")
    ).trim();
    const custName = String(getField(r, "customer_name", "customerName", "cust_name")).trim();
    const custId = String(getField(r, "customer_id", "customerId", "cust_id")).trim();
    const status = String(getField(r, "status", "dnr_status")).trim();
    const dateVal = getField(r, "dnr_date", "dnrDate", "date");

    if (q) {
      const hay = norm(`${dnrId} ${invRef} ${custName} ${custId} ${status}`);
      if (!hay.includes(q)) return false;
    }

    if (stVal !== "all" && status !== stVal) return false;

    if (from || to) {
      const dt = toDateObj(dateVal);
      if (!dt) return false;

      dt.setHours(0, 0, 0, 0);

      if (from) {
        const f = new Date(from);
        f.setHours(0, 0, 0, 0);
        if (dt < f) return false;
      }

      if (to) {
        const t = new Date(to);
        t.setHours(0, 0, 0, 0);
        if (dt > t) return false;
      }
    }

    return true;
  });

  render();
}
  function totalPages() {
    return Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  }

  function pagedRows() {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }

  function render() {
    const tp = totalPages();
    if (currentPage > tp) currentPage = tp;
    tbody.innerHTML = "";
    const rows = pagedRows();
    const total = filteredRows.length;
    if (noData) noData.style.display = rows.length ? "none" : "block";

    rows.forEach((r) => {
      const dnrId = String(getField(r, "dnr_id", "dnrId", "id")).trim();
      const invRef = String(
        getField(r, "invoice_return_ref", "invoiceReturnRef", "inv_return_ref")
      ).trim();
      const custName = String(getField(r, "customer_name", "customerName", "cust_name")).trim();
      const dateVal = getField(r, "dnr_date", "dnrDate", "date");
      const status = String(getField(r, "status", "dnr_status")).trim();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="dnr-col-mark">
          <input class="dnr-markbox" type="checkbox" data-id="${esc(dnrId)}">
        </td>
        <td class="dnr-col-id">${esc(dnrId)}</td>
        <td class="dnr-col-ref">${esc(invRef)}</td>
        <td class="dnr-col-cust">${esc(custName)}</td>
        <td class="dnr-col-date">${esc(formatDMY(dateVal))}</td>
        <td class="dnr-col-status">
          <span class="${statusClass(status)}">${esc(status || "-")}</span>
        </td>
        <td class="dnr-col-action dnr-td-action">
          <button type="button" class="dnr-act-dots" title="Actions">⋮</button>
        </td>`;
      tbody.appendChild(tr);
      const dots = tr.querySelector(".dnr-act-dots");
      if (dots) attachDnrHoverMenu(dots, { dnrId, status });
    });

    const startIdx = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const endIdx = Math.min(currentPage * PAGE_SIZE, total);
    if (showingEl)
      showingEl.textContent = `Showing ${startIdx}–${endIdx} of ${total} Entries`;
    if (pageCurrentEl) pageCurrentEl.textContent = String(currentPage);
    if (pageTotalEl) pageTotalEl.textContent = String(tp);
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= tp;
  }

  async function loadData() {
    try {
      const res = await fetch(API_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("bad response");
      const result = await res.json();
      const list = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.items)
          ? result.items
          : Array.isArray(result)
            ? result
            : [];
      allRows = list;
    } catch {
      allRows = [];
    }
    fillFilterOptions();
    applyFilters(true);
  }

  let debounce = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => applyFilters(true), 150);
  });
  statusFilter.addEventListener("change", () => applyFilters(true));

  fromDate?.addEventListener("change", () => applyFilters(true));
  toDate?.addEventListener("change", () => applyFilters(true));
  clearBtn?.addEventListener("click", () => {
    searchInput.value = "";
    statusFilter.value = "all";
   
    fromDate.value = "";
    toDate.value = "";
    currentPage = 1;
    applyFilters(true);
  });
  prevBtn?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      render();
    }
  });
  nextBtn?.addEventListener("click", () => {
    if (currentPage < totalPages()) {
      currentPage++;
      render();
    }
  });
  if (newBtn) {
    newBtn.addEventListener("click", () => {
      window.location.href = "/deliverynote_return/new";
    });
  }

  const urlParams = new URLSearchParams(window.location.search);
  const toastMsg = urlParams.get("toast");
  if (toastMsg) {
    const n = document.createElement("div");
    n.className = "success-notification show";
    n.textContent = decodeURIComponent(toastMsg);
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
    window.history.replaceState({}, "", window.location.pathname);
  }

  loadData();
});
