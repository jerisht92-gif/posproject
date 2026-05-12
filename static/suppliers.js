const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const typeFilter = document.getElementById("typeFilter");
const tierFilter = document.getElementById("tierFilter");
const clearBtn = document.getElementById("clearFilterBtn");
 
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageNow = document.getElementById("pageNow");
const pageTotal = document.getElementById("pageTotal");
const showingCount = document.getElementById("showingCount");
 
const ROWS_PER_PAGE = 10;
let currentPage = 1;
let filteredRows = [];
 
function showToast(message, type = "error") {
  const existing = document.querySelector(".success-notification, .error-notification");
  if (existing) existing.remove();
 
  const toast = document.createElement("div");
  toast.className = type === "success" ? "success-notification" : "error-notification";
  toast.textContent = message;
  document.body.appendChild(toast);
 
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });
 
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
 
function setBtnDisabled(btn, disabled) {
  if (!btn) return;
  btn.disabled = !!disabled;
  btn.setAttribute("aria-disabled", disabled ? "true" : "false");
}
 
function isDataRow(row) {
  return !!row && !row.querySelector("td.empty");
}
 
function rowMatches(row) {
  if (!isDataRow(row)) return false;
  const q = (searchInput?.value || "").trim().toLowerCase();
  if (q && !row.innerText.toLowerCase().includes(q)) return false;
 
  const statusVal = (statusFilter?.value || "all").toLowerCase();
  const typeVal = (typeFilter?.value || "all types").toLowerCase();
  const tierVal = (tierFilter?.value || "all").toLowerCase();
  const status = (row.children[3]?.innerText || "").toLowerCase();
  const type = (row.children[4]?.innerText || "").toLowerCase();
  const tier = (row.children[5]?.innerText || "").toLowerCase();
 
  if (statusVal !== "all" && !status.includes(statusVal)) return false;
  if (typeVal !== "all types" && !type.includes(typeVal)) return false;
  if (tierVal !== "all" && !tier.includes(tierVal)) return false;
  return true;
}
 
function getFilteredRows() {
  return Array.from(document.querySelectorAll("tbody tr")).filter(rowMatches);
}
 
function showCurrentPageRows() {
  document.querySelectorAll("tbody tr").forEach((row) => {
    if (row.querySelector("td.empty")) {
      row.style.display = filteredRows.length === 0 ? "" : "none";
      return;
    }
    row.style.display = "none";
  });
 
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  for (let i = startIndex; i < startIndex + ROWS_PER_PAGE && i < filteredRows.length; i++) {
    filteredRows[i].style.display = "";
  }
}
 
function updatePagination() {
  filteredRows = getFilteredRows();
  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / ROWS_PER_PAGE));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);
 
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const shown = filteredRows.slice(startIndex, startIndex + ROWS_PER_PAGE).length;
 
  if (showingCount) showingCount.textContent = `Showing ${shown} of ${total} Entries`;
  if (pageNow) pageNow.textContent = String(currentPage);
  if (pageTotal) pageTotal.textContent = String(totalPages);
 
  setBtnDisabled(prevBtn, currentPage <= 1 || total === 0);
  setBtnDisabled(nextBtn, currentPage >= totalPages || total === 0);
  if (totalPages === 1) {
    setBtnDisabled(prevBtn, true);
    setBtnDisabled(nextBtn, true);
  }
 
  showCurrentPageRows();
}
 
searchInput?.addEventListener("input", () => {
  currentPage = 1;
  updatePagination();
});
 
function applyFilters() {
  currentPage = 1;
  updatePagination();
}
 
statusFilter?.addEventListener("change", applyFilters);
typeFilter?.addEventListener("change", applyFilters);
tierFilter?.addEventListener("change", applyFilters);
 
clearBtn?.addEventListener("click", () => {
  if (searchInput) searchInput.value = "";
  if (statusFilter) statusFilter.selectedIndex = 0;
  if (typeFilter) typeFilter.selectedIndex = 0;
  if (tierFilter) tierFilter.selectedIndex = 0;
  currentPage = 1;
  updatePagination();
  searchInput?.focus();
});
 
prevBtn?.addEventListener("click", () => {
  if (prevBtn.disabled) return;
  currentPage -= 1;
  updatePagination();
});
 
nextBtn?.addEventListener("click", () => {
  if (nextBtn.disabled) return;
  currentPage += 1;
  updatePagination();
});
 
function getSupplierIdFromRow(row) {
  const supplierId = row.children[0].innerText.trim();
  return supplierId || "";
}
 
function editSupplier(supplierId) {
  window.location.href = `/supplier-new?supplier_id=${encodeURIComponent(supplierId)}`;
}
 
function deleteSupplier(supplierId, row) {
  if (confirm("Are you sure you want to delete this supplier?")) {
    fetch(`/api/suppliers/${encodeURIComponent(supplierId)}`, {
      method: "DELETE"
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) {
          throw new Error(result?.message || "Failed to delete supplier.");
        }
        row.remove();
        currentPage = 1;
        updatePagination();
        showToast("Supplier deleted successfully.", "success");
      })
      .catch((err) => {
        showToast(err.message || "Failed to delete supplier.", "error");
      });
  }
}
 
function attachActionButtonsToRows() {
  document.querySelectorAll("tbody tr").forEach((row) => {
    if (!isDataRow(row)) return;
 
    const editBtn = row.querySelector(".supplier-edit-btn");
    const deleteBtn = row.querySelector(".supplier-delete-btn");
    if (!editBtn || !deleteBtn) return;
 
    editBtn.addEventListener("click", () => {
      const supplierId = getSupplierIdFromRow(row);
      if (supplierId) editSupplier(supplierId);
    });
 
    deleteBtn.addEventListener("click", () => {
      const supplierId = getSupplierIdFromRow(row);
      if (supplierId) deleteSupplier(supplierId, row);
    });
  });
}
 
document.addEventListener("DOMContentLoaded", () => {
  updatePagination();
  attachActionButtonsToRows();
});
 
 