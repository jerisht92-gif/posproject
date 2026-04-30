function creditShowToast(message, type = "success") {
  if (!message) return;
  const toast = document.createElement("div");
  toast.className = type === "error" ? "error-notification" : "success-notification";
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  }, 2200);
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
  const customerFilter = document.getElementById("creditCustomerFilter");
  const tbody = document.getElementById("creditTbody");
  const showingText = document.getElementById("creditShowingText");
  const pageText = document.getElementById("creditPageText");
  const prevBtn = document.getElementById("creditPrevBtn");
  const nextBtn = document.getElementById("creditNextBtn");

  const ROWS_PER_PAGE = 10;
  let allRows = [];
  let filteredRows = [];
  let currentPage = 1;
  let flyEl = null;
  let hideTimer = null;
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
        creditShowToast("Credit note deleted", "success");
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
    if (!statusFilter || !customerFilter) return;
    const statusSet = new Set(["all"]);
    const customerSet = new Set(["all"]);
    allRows.forEach((r) => {
      if (r.status) statusSet.add(r.status);
      if (r.customer_name) customerSet.add(r.customer_name);
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

    const currentCustomer = customerFilter.value || "all";
    customerFilter.innerHTML = "";
    Array.from(customerSet).forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c === "all" ? "All" : c;
      customerFilter.appendChild(opt);
    });
    customerFilter.value = customerSet.has(currentCustomer) ? currentCustomer : "all";
  }

  function totalPages() {
    return filteredRows.length ? Math.ceil(filteredRows.length / ROWS_PER_PAGE) : 0;
  }

  function renderTable() {
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!filteredRows.length) {
      tbody.innerHTML = '<tr id="creditNoDataRow"><td colspan="8" class="credit-empty">No Credit Notes found</td></tr>';
      if (showingText) showingText.textContent = "Showing 0 of 0 Entries";
      if (pageText) pageText.innerHTML = "Page <strong>0</strong> of <strong>0</strong>";
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    const startIdx = (currentPage - 1) * ROWS_PER_PAGE;
    const pageRows = filteredRows.slice(startIdx, startIdx + ROWS_PER_PAGE);
    pageRows.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="credit-td-check"><input type="checkbox" class="credit-row-check"></td>
        <td>${escapeHtml(r.crn_id)}</td>
        <td>${escapeHtml(r.invoice_ref_id)}</td>
        <td>${escapeHtml(r.customer_name)}</td>
        <td>${escapeHtml(r.credit_note_date)}</td>
        <td>${escapeHtml(r.status)}</td>
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

  function applyFilters() {
    const q = norm(searchInput?.value);
    const s = statusFilter?.value || "all";
    const c = customerFilter?.value || "all";

    filteredRows = allRows.filter((r) => {
      const matchQ =
        norm(r.crn_id).includes(q) ||
        norm(r.invoice_ref_id).includes(q) ||
        norm(r.customer_name).includes(q);
      const matchS = s === "all" || r.status === s;
      const matchC = c === "all" || r.customer_name === c;
      return matchQ && matchS && matchC;
    });
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

  searchInput?.addEventListener("input", applyFilters);
  statusFilter?.addEventListener("change", applyFilters);
  customerFilter?.addEventListener("change", applyFilters);
  clearBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (statusFilter) statusFilter.value = "all";
    if (customerFilter) customerFilter.value = "all";
    applyFilters();
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
  