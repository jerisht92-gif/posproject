function creditShowToast(message, type = "success") {
  if (!message) return;
  const existing = document.querySelector(".success-notification, .error-notification");
  if (existing) existing.remove();

  const isError = type === "error";
  const toast = document.createElement("div");
  toast.className = isError ? "error-notification" : "success-notification";
  toast.textContent = message;

  Object.assign(toast.style, {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%) translateY(-100px)",
    padding: "14px 28px",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    zIndex: "99999",
    opacity: "0",
    transition: "all 0.4s cubic-bezier(0.68,-0.55,0.265,1.55)",
    pointerEvents: "none",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: isError
      ? "linear-gradient(135deg,#ffe6e6,#ffc2c2)"
      : "linear-gradient(135deg,#fff4f4,#ffe8e8)",
    color: "#a12828",
    border: "1.5px solid #a12828",
    boxShadow: isError
      ? "0 8px 24px rgba(161,40,40,0.35)"
      : "0 8px 24px rgba(161,40,40,0.25)",
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
    toast.style.pointerEvents = "auto";
    toast.classList.add("show");
  });
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(-100px)";
    toast.style.pointerEvents = "none";
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

function norm(v) {
  return String(v ?? "").trim().toLowerCase();
}

function escapeHtml(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function creditStatusBadgeClass(status) {
  const s = norm(status);
  if (s === "draft") return "credit-status-draft";
  if (s === "submitted") return "credit-status-submitted";
  if (s === "cancelled" || s === "canceled") return "credit-status-cancelled";
  return "credit-status-draft";
}

function creditConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "credit-confirm-overlay";
    overlay.innerHTML = `
      <div class="credit-confirm-box" role="dialog" aria-modal="true" aria-label="Confirmation">
        <h3>Confirm Delete</h3>
        <p>${escapeHtml(message)}</p>
        <div class="credit-confirm-actions">
          <button type="button" class="credit-confirm-cancel">Cancel</button>
          <button type="button" class="credit-confirm-ok">Delete</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector(".credit-confirm-cancel")?.addEventListener("click", () => close(false));
    overlay.querySelector(".credit-confirm-ok")?.addEventListener("click", () => close(true));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(false);
    });
    const okBtn = overlay.querySelector(".credit-confirm-ok");
    if (okBtn) okBtn.focus();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const newCreditBtn = document.getElementById("newCreditBtn");
  const searchInput = document.getElementById("creditSearchInput");
  const clearBtn = document.getElementById("creditClearBtn");
  const statusFilter = document.getElementById("creditStatusFilter");
  const paymentFilter = document.getElementById("creditPaymentFilter");
  const fromDateInput = document.getElementById("creditFromDate");
  const toDateInput = document.getElementById("creditToDate");
  const tbody = document.getElementById("creditTbody");
  const showingText = document.getElementById("creditShowingText");
  const pageText = document.getElementById("creditPageText");
  const prevBtn = document.getElementById("creditPrevBtn");
  const nextBtn = document.getElementById("creditNextBtn");
  const statusSortTh = document.getElementById("creditStatusSortTh");
  const statusSortMenu = document.getElementById("creditStatusSortMenu");

  const ROWS_PER_PAGE = 10;
  const CREDIT_INVALID_DATE_MSG =
    "Invalid date. Use format DD-MM-YYYY (e.g. 31-05-2026).";
  const CREDIT_DATE_RANGE_ERROR =
    "Credit Note From date cannot be later than Credit Note To date.";
  let allRows = [];
  let filteredRows = [];
  let currentPage = 1;
  let currentSortMode = "";
  let flyEl = null;
  let hideTimer = null;
  let statusSortHideTimer = null;
  function removeFly() {
    if (flyEl) {
      flyEl.remove();
      flyEl = null;
    }
  }

  function keepFlyOpen() {
    clearTimeout(hideTimer);
  }

  function scheduleFlyHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => removeFly(), 120);
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

  function buildFlyMenu(row, anchorBtn) {
    if (!row?.crn_id) return;
    removeFly();
    flyEl = document.createElement("div");
    flyEl.className = "credit-act-fly";

    const isDraft = norm(row.status) === "draft";
    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "credit-act-item";
    viewBtn.textContent = isDraft ? "Edit Details" : "View Details";
    viewBtn.addEventListener("click", () => {
      window.location.href = `/new-credit-note?credit_note_id=${encodeURIComponent(row.crn_id)}&mode=${isDraft ? "edit" : "view"}`;
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "credit-act-item";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      const ok = await creditConfirm(`Delete Credit Note ${row.crn_id}?`);
      if (!ok) return;
      try {
        const res = await fetch(`/api/credit-notes/${encodeURIComponent(row.crn_id)}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
        allRows = allRows.filter((r) => r.crn_id !== row.crn_id);
        applyFilters();
        creditShowToast(`Credit note ${row.crn_id} deleted`, "success");
      } catch (err) {
        console.error(err);
        creditShowToast("Failed to delete credit note", "error");
      } finally {
        removeFly();
      }
    });

    flyEl.appendChild(viewBtn);
    flyEl.appendChild(deleteBtn);
    flyEl.addEventListener("mouseenter", keepFlyOpen);
    flyEl.addEventListener("mouseleave", scheduleFlyHide);
    document.body.appendChild(flyEl);

    const btnRect = anchorBtn.getBoundingClientRect();
    const menuRect = flyEl.getBoundingClientRect();
    const gap = 4; // keep flyout close to the 3-dot button
    let left = btnRect.right - menuRect.width + 2;
    let top = btnRect.top - menuRect.height + btnRect.height - 2;
    if (left < 8) left = 8;
    if (left + menuRect.width > window.innerWidth - 8) left = window.innerWidth - menuRect.width - 8;
    if (top < 8) top = Math.min(window.innerHeight - menuRect.height - 8, btnRect.bottom + gap);
    flyEl.style.left = `${Math.round(left)}px`;
    flyEl.style.top = `${Math.round(top)}px`;
  }


  if (newCreditBtn) {
    newCreditBtn.addEventListener("click", () => {
      window.location.href = "/new-credit-note";
    });
  }

  const params = new URLSearchParams(window.location.search);
  const toast = params.get("toast");
  const type = params.get("type") || "success";
  if (toast) {
    creditShowToast(toast, type);
    params.delete("toast");
    params.delete("type");
    const qs = params.toString();
    const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }

  function fillFilterOptions() {
    if (!statusFilter || !paymentFilter) return;
    const statusSet = new Set(["all"]);
    const paymentSet = new Set(["all"]);
    allRows.forEach((r) => {
      if (r.status) statusSet.add(r.status);
      if (r.payment_status) paymentSet.add(r.payment_status);
    });

    const currentStatus = statusFilter.value || "all";
    statusFilter.innerHTML = "";
    Array.from(statusSet).forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s === "all" ? "All" : s;
      statusFilter.appendChild(opt);
    });
    statusFilter.value = statusSet.has(currentStatus) ? currentStatus : "all";

    const currentPayment = paymentFilter.value || "all";
    paymentFilter.innerHTML = "";
    Array.from(paymentSet).forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p === "all" ? "All" : p;
      paymentFilter.appendChild(opt);
    });
    paymentFilter.value = paymentSet.has(currentPayment) ? currentPayment : "all";
  }

  function totalPages() {
    return filteredRows.length ? Math.ceil(filteredRows.length / ROWS_PER_PAGE) : 0;
  }

  function creditStatusRank(status) {
    const s = norm(status);
    if (s === "draft") return 0;
    if (s === "submitted") return 1;
    if (s === "cancelled" || s === "canceled") return 2;
    return 99;
  }

  function parseDateValue(v) {
    const t = Date.parse(String(v || "").trim());
    return Number.isNaN(t) ? 0 : t;
  }

  function applyStatusSort(mode) {
    if (!Array.isArray(filteredRows) || !filteredRows.length) return;
    currentSortMode = mode || "";
    const sorted = [...filteredRows];
    if (mode === "newest") {
      sorted.sort((a, b) => parseDateValue(b.credit_note_date) - parseDateValue(a.credit_note_date));
    } else if (mode === "oldest") {
      sorted.sort((a, b) => parseDateValue(a.credit_note_date) - parseDateValue(b.credit_note_date));
    } else if (mode === "progress") {
      sorted.sort((a, b) => creditStatusRank(a.status) - creditStatusRank(b.status));
    } else if (mode === "reverse") {
      sorted.sort((a, b) => creditStatusRank(b.status) - creditStatusRank(a.status));
    }
    filteredRows = sorted;
  }

  function renderTable() {
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!filteredRows.length) {
      tbody.innerHTML = '<tr id="creditNoDataRow"><td colspan="7" class="credit-empty">No Credit Notes found</td></tr>';
      if (showingText) showingText.textContent = "Showing 0 of 0 Entries";
      if (pageText) pageText.innerHTML = "Page <strong>0</strong> of <strong>0</strong>";
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    const startIdx = (currentPage - 1) * ROWS_PER_PAGE;
    const pageRows = filteredRows.slice(startIdx, startIdx + ROWS_PER_PAGE);
    pageRows.forEach((r) => {
      const statusClass = creditStatusBadgeClass(r.status);
      const rawDate = String(r.credit_note_date || "").trim();
      const isoDate = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
      const displayDate = isoDate
        ? `${isoDate[3]}-${isoDate[2]}-${isoDate[1]}`
        : rawDate;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(r.crn_id)}</td>
        <td>${escapeHtml(r.invoice_ref_id)}</td>
        <td>${escapeHtml(r.customer_name)}</td>
        <td>${escapeHtml(displayDate)}</td>
        <td><span class="credit-status-badge ${statusClass}">${escapeHtml(r.status)}</span></td>
        <td>${escapeHtml(r.payment_status)}</td>
        <td class="credit-td-action"><button type="button" class="credit-action-btn">⋮</button></td>
      `;
      const actionBtn = tr.querySelector(".credit-action-btn");
      if (actionBtn) {
        actionBtn.addEventListener("mouseenter", () => {
          keepFlyOpen();
          buildFlyMenu(r, actionBtn);
        });
        actionBtn.addEventListener("mouseleave", scheduleFlyHide);
      }
      tbody.appendChild(tr);
    });

    const start = startIdx + 1;
    const end = Math.min(startIdx + ROWS_PER_PAGE, filteredRows.length);
    if (showingText) showingText.textContent = `Showing ${start}-${end} of ${filteredRows.length} Entries`;
    const tp = totalPages();
    if (pageText) pageText.innerHTML = `Page <strong>${currentPage}</strong> of <strong>${tp}</strong>`;
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= tp;
  }

  function applyFilters(dateSource) {
    const q = norm(searchInput?.value);
    const s = statusFilter?.value || "all";
    const p = paymentFilter?.value || "all";
    let fdRaw = (fromDateInput?.value || "").trim();
    let tdRaw = (toDateInput?.value || "").trim();

    const isValidListDate = (value) => {
      if (!value || typeof value !== "string") return false;
      const trimmed = value.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
      const parts = trimmed.split("-");
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (y < 1900 || y > 2100) return false;
      const date = new Date(y, m, d);
      return (
        date.getFullYear() === y &&
        date.getMonth() === m &&
        date.getDate() === d
      );
    };

    if (fdRaw && !isValidListDate(fdRaw)) {
      creditShowToast(CREDIT_INVALID_DATE_MSG, "error");
      if (fromDateInput) fromDateInput.value = "";
      fdRaw = "";
    } else if (tdRaw && !isValidListDate(tdRaw)) {
      creditShowToast(CREDIT_INVALID_DATE_MSG, "error");
      if (toDateInput) toDateInput.value = "";
      tdRaw = "";
    } else if (
      fdRaw &&
      tdRaw &&
      new Date(fdRaw + "T00:00:00").getTime() > new Date(tdRaw + "T00:00:00").getTime()
    ) {
      creditShowToast(CREDIT_DATE_RANGE_ERROR, "error");
      if (dateSource === "from" && fromDateInput) fromDateInput.value = "";
      else if (dateSource === "to" && toDateInput) toDateInput.value = "";
      fdRaw = (fromDateInput?.value || "").trim();
      tdRaw = (toDateInput?.value || "").trim();
    }

    const fromDate = fdRaw && isValidListDate(fdRaw) ? fdRaw : "";
    const toDate = tdRaw && isValidListDate(tdRaw) ? tdRaw : "";

    filteredRows = allRows.filter((r) => {
      const matchQ =
        norm(r.crn_id).includes(q) ||
        norm(r.invoice_ref_id).includes(q) ||
        norm(r.customer_name).includes(q);
      const matchS = s === "all" || r.status === s;
      const matchP = p === "all" || r.payment_status === p;
      const rowDate = (r.credit_note_date || "").trim();
      const matchFrom = !fromDate || (rowDate && rowDate >= fromDate);
      const matchTo = !toDate || (rowDate && rowDate <= toDate);
      return matchQ && matchS && matchP && matchFrom && matchTo;
    });
    applyStatusSort(currentSortMode);
    currentPage = 1;
    renderTable();
  }

  async function loadCreditNotes() {
    try {
      const res = await fetch("/api/credit-notes");
      const payload = await res.json();
      if (!res.ok || !payload?.success) throw new Error(payload?.message || "Failed to load");
      allRows = Array.isArray(payload.items) ? payload.items : [];
      filteredRows = [...allRows];
      fillFilterOptions();
      renderTable();
    } catch (err) {
      console.error(err);
      creditShowToast("Failed to load credit notes", "error");
      allRows = [];
      filteredRows = [];
      renderTable();
    }
  }

  searchInput?.addEventListener("input", () => applyFilters());
  statusFilter?.addEventListener("change", () => applyFilters());
  paymentFilter?.addEventListener("change", () => applyFilters());
  [fromDateInput, toDateInput].forEach((dateInput) => {
    const dateSource = dateInput === fromDateInput ? "from" : "to";
    dateInput?.addEventListener("invalid", () => {
      creditShowToast(CREDIT_INVALID_DATE_MSG, "error");
      dateInput.value = "";
      applyFilters(dateSource);
    });
    dateInput?.addEventListener("input", () => {
      let v = dateInput.value || "";
      if (!v) return;
      const parts = v.split("-");
      if (parts[0] && parts[0].length > 4) {
        creditShowToast("Year must contain only 4 digits.", "error");
        dateInput.value = "";
        applyFilters(dateSource);
        return;
      }
      v = v.replace(/[^\d-]/g, "");
      const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (iso) {
        dateInput.value = `${iso[1]}-${iso[2]}-${iso[3]}`;
        return;
      }
      const segs = v.split("-");
      if (segs[1] && segs[1].length > 2) {
        dateInput.value = "";
        return;
      }
      if (segs[2] && segs[2].length > 2) {
        dateInput.value = "";
        return;
      }
      const m = v.match(/^(\d{0,4})\d*$/);
      dateInput.value = m ? m[1] : v;
    });
    dateInput?.addEventListener("change", () => applyFilters(dateSource));
    dateInput?.addEventListener("blur", () => applyFilters(dateSource));
  });
  statusSortMenu?.querySelectorAll("button[data-sort]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const mode = e.currentTarget?.getAttribute("data-sort") || "";
      applyStatusSort(mode);
      currentPage = 1;
      renderTable();
      statusSortTh?.classList.remove("open");
    });
  });

  statusSortTh?.addEventListener("mouseenter", openStatusSortMenu);
  statusSortTh?.addEventListener("mouseleave", scheduleStatusSortMenuClose);
  statusSortMenu?.addEventListener("mouseenter", openStatusSortMenu);
  statusSortMenu?.addEventListener("mouseleave", scheduleStatusSortMenuClose);

  statusSortTh?.addEventListener("click", (e) => {
    if (e.target.closest(".credit-sort-menu")) return;
    statusSortTh.classList.toggle("open");
  });

  clearBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (statusFilter) statusFilter.value = "all";
    if (paymentFilter) paymentFilter.value = "all";
    if (fromDateInput) fromDateInput.value = "";
    if (toDateInput) toDateInput.value = "";
    currentSortMode = "";
    statusSortTh?.classList.remove("open");
    filteredRows = [...allRows];
    currentPage = 1;
    renderTable();
  });
  prevBtn?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage -= 1;
      renderTable();
    }
  });
  nextBtn?.addEventListener("click", () => {
    if (currentPage < totalPages()) {
      currentPage += 1;
      renderTable();
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".credit-action-btn") && !e.target.closest(".credit-act-fly")) removeFly();
  });
  window.addEventListener("scroll", removeFly, true);
  window.addEventListener("resize", removeFly);

  loadCreditNotes();
});
  