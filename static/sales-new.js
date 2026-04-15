



// =========================================
// GLOBAL USER
// =========================================
window.CURRENT_USER = window.CURRENT_USER || "User";

// =========================================
// SALES ORDER PAGE SCRIPT
// =========================================
const CURRENCY = "₹";
const SALES_LIST_URL = "/sales-order";
/** Row item discount and global discount % cap (same as quotation). */
const MAX_SO_DISCOUNT_PERCENT = 90;

/** Same message as quotation date fields (YYYY-MM-DD + sensible year). */
const SO_INVALID_DATE_MSG =
  "Invalid date. Use format YYYY-MM-DD (e.g. 2026-03-09).";

window.SO_COMMENTS = window.SO_COMMENTS || [];
window.SO_PRODUCTS = [];
window.SO_PRODUCTS_MAP = {};

// =========================================
// BASIC NAVIGATION
// =========================================
function goBack() {
  window.location.href = SALES_LIST_URL;
}

function generatePO() {
  showToast("Generate (PO) coming soon!", "success");
}

function getCurrentSOId() {
  return (document.getElementById("salesOrderId")?.value || "").trim();
}

function getCurrentSOStatus() {
  const raw =
    window.__SO_DEBUG?.status ||
    window.__SO_DEBUG?.order_status ||
    "";
  return String(raw).trim().toLowerCase();
}

function formatSalesStatusText(status) {
  const s = String(status || "").trim().toLowerCase();

  if (s === "draft") return "Draft";
  if (s === "submitted" || s === "submitted(pa)" || s === "submitted (pa)") return "Submitted";
  if (s === "purchased") return "Purchased";
  if (s === "delivered") return "Delivered";
  if (s === "partially delivered" || s === "partially_delivered") return "Partially Delivered";
  if (s === "returned") return "Returned";
  if (s === "cancelled") return "Cancelled";

  return String(status || "").trim();
}

function getSalesStatusBadgeClass(status) {
  const s = String(status || "").trim().toLowerCase();

  if (s === "draft") return "so-head-status so-status-draft";
  if (s === "submitted" || s === "submitted(pa)" || s === "submitted (pa)") {
    return "so-head-status so-status-submitted";
  }
  if (s === "purchased") return "so-head-status so-status-purchased";
  if (s === "delivered") return "so-head-status so-status-delivered";
  if (s === "partially delivered" || s === "partially_delivered") {
    return "so-head-status so-status-partial";
  }
  if (s === "returned") return "so-head-status so-status-returned";
  if (s === "cancelled") return "so-head-status so-status-cancelled";

  return "so-head-status";
}

/**
 * Sales rep / customer dropdowns are not real inputs — lock when:
 * - view mode, or
 * - editing an existing order (URL / query id) in draft, or
 * - submitted (incl. submitted PO / PA variants).
 * New order (/sales-order/new, no id in URL) stays editable.
 */
function isSORepCustomerReadOnly() {
  if (typeof isSalesOrderViewMode === "function" && isSalesOrderViewMode()) return true;

  const s = getCurrentSOStatus().replace(/_/g, " ").replace(/\s+/g, " ").trim();
  const editingExisting = !!getSOIdSafe();

  if (!s) return false;

  if (s === "draft") return editingExisting;

  return s === "submitted" || s.startsWith("submitted");
}

function applySORepCustomerReadonlyUI() {
  const locked = isSORepCustomerReadOnly();
  [
    { selected: "salesRepSelected", err: "salesRepErr" },
    { selected: "customerSelected", err: "customerErr" }
  ].forEach(({ selected, err }) => {
    const el = document.getElementById(selected);
    const wrap = el?.closest(".custom-dropdown");
    if (wrap) wrap.classList.toggle("so-dropdown-readonly", locked);
    if (locked && el) {
      const errEl = document.getElementById(err);
      if (errEl) setFieldError(el, errEl, "");
    }
  });
}

function updateSalesOrderHeaderStatus(status) {
  const badge = document.getElementById("salesOrderStatusBadge");
  if (!badge) return;

  const cleanStatus = String(status || "").trim();
  if (!cleanStatus) {
    badge.className = "so-head-status so-status-hidden";
    badge.textContent = "";
    return;
  }

  badge.className = getSalesStatusBadgeClass(cleanStatus);
  badge.textContent = `Status: ${formatSalesStatusText(cleanStatus)}`;
}

// =========================================
// COMMON HELPERS
// =========================================
function toNumber(val) {
  if (val == null) return 0;
  return Number(String(val).replace(/[^\d.-]/g, "")) || 0;
}

function toDateInputValue(v) {
  if (!v) return "";
  const s = String(v).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  const m = s.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  return "";
}

function elAny(...ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}

function setValAny(ids, val) {
  const el = elAny(...ids);
  if (!el) return false;
  el.value = val ?? "";
  return true;
}

function setTextAny(ids, text) {
  const el = elAny(...ids);
  if (!el) return false;
  el.textContent = text ?? "";
  return true;
}

function setSelectAny(ids, raw) {
  const el = elAny(...ids);
  if (!el) return false;

  const v = String(raw ?? "").trim();
  if (!v) {
    el.value = "";
    return true;
  }

  const opt = [...el.options].find(
    (o) => (o.value || "").trim() === v || (o.textContent || "").trim() === v
  );

  el.value = opt ? opt.value : v;
  return true;
}

// =========================================
// TOAST (match Quotation design)
// =========================================
function showToast(message, type = "success") {
  const existing = document.querySelector(".success-notification, .error-notification");
  if (existing) existing.remove();

  const div = document.createElement("div");
  div.className = type === "success" ? "success-notification" : "error-notification";
  div.textContent = message;

  document.body.appendChild(div);

  // trigger show animation
  requestAnimationFrame(() => {
    div.classList.add("show");
  });

  setTimeout(() => {
    div.classList.remove("show");
    setTimeout(() => div.remove(), 300);
  }, 2600);
}

// =========================================
// BASIC DETAILS - SALES REP DROPDOWN
// =========================================
function toggleSalesRepDropdown() {
  if (isSORepCustomerReadOnly()) return;
  const dd = document.getElementById("salesRepDropdown");
  if (!dd) return;
  dd.style.display = dd.style.display === "block" ? "none" : "block";
}

function selectSalesRep(el) {
  if (isSORepCustomerReadOnly()) return;
  const name = (el.dataset.name || el.textContent || "").trim();
  document.getElementById("salesRepSelected").textContent = name || "Select Sales Rep";
  document.getElementById("salesRep").value = name;
  document.getElementById("salesRepDropdown").style.display = "none";
  updateSubmitButton();
}

function filterSalesRep() {
  const q = (document.getElementById("salesRepSearch")?.value || "").toLowerCase();

  document.querySelectorAll("#salesRepDropdown .dropdown-item").forEach((item) => {
    const name = (item.dataset.name || item.textContent || "").toLowerCase();
    item.style.display = name.includes(q) ? "block" : "none";
  });
}

// =========================================
// CUSTOMER INFORMATION
// =========================================
function toggleCustomerDropdown() {
  if (isSORepCustomerReadOnly()) return;
  const dd = document.getElementById("customerDropdown");
  if (!dd) return;
  dd.style.display = dd.style.display === "block" ? "none" : "block";
}

function filterCustomers() {
  const q = (document.getElementById("customerSearch")?.value || "").toLowerCase();

  document.querySelectorAll("#customerDropdown .dropdown-item").forEach((item) => {
    item.style.display = item.innerText.toLowerCase().includes(q) ? "block" : "none";
  });
}

function selectCustomer(element) {
  if (isSORepCustomerReadOnly()) return;
  const name = (element.textContent || "").trim();

  const selected = document.getElementById("customerSelected");
  if (selected) selected.textContent = name;

  const dd = document.getElementById("customerDropdown");
  if (dd) dd.style.display = "none";

  const idEl = document.getElementById("customer_id");
  const emailEl = document.getElementById("email");
  const phoneEl = document.getElementById("phone");
  const billEl = document.getElementById("billingAddress");
  const shipEl = document.getElementById("shippingAddress");

  if (idEl) idEl.value = element.dataset.id || "";
  if (emailEl) emailEl.value = element.dataset.email || "";
  if (phoneEl) phoneEl.value = element.dataset.phone || "";
  if (billEl) billEl.value = element.dataset.billing || "";
  if (shipEl) shipEl.value = element.dataset.shipping || "";








 // =========================================
// AUTO FILL SALES REP FROM CUSTOMER DATA
// =========================================
const salesRepValue =
  (element.dataset.salesRep ||
   element.dataset.salesrep ||
   element.dataset.sales_rep ||
   "").trim();

const salesRepInput = document.getElementById("salesRep");
const salesRepSelected = document.getElementById("salesRepSelected");

if (salesRepInput) {
  salesRepInput.value = salesRepValue;
}

if (salesRepSelected) {
  salesRepSelected.textContent = salesRepValue || "Select Sales Rep";
}

// Highlight correct rep in dropdown
document.querySelectorAll("#salesRepDropdown .dropdown-item").forEach(item => {
  const name = (item.dataset.name || item.textContent || "").trim();

  if (name === salesRepValue) {
    item.classList.add("active");
  } else {
    item.classList.remove("active");
  }
});

const salesRepDropdown = document.getElementById("salesRepDropdown");
if (salesRepDropdown) {
  salesRepDropdown.style.display = "none";
}
updateSubmitButton();
}






function isCustomerSelected() {
  const txt = (document.getElementById("customerSelected")?.textContent || "").trim().toLowerCase();
  return !!txt && !["select customer", "-", "—"].includes(txt);
}

// =========================================
// DATE AND FIELD VALIDATION
// =========================================
function setFieldError(inputEl, errEl, msg) {
  if (!inputEl || !errEl) return;

  if (msg) {
    inputEl.classList.add("input-invalid");
    errEl.textContent = msg;
  } else {
    inputEl.classList.remove("input-invalid");
    errEl.textContent = "";
  }
}

function setMinTodayByEl(el) {
  if (!el) return;
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  el.min = `${yyyy}-${mm}-${dd}`;
}

/** Match add-new-quotation.js isValidDateString (YYYY-MM-DD, 1900–2100, real calendar date). */
function isValidSODateString(value) {
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

/** If user types more than 4 consecutive digits (e.g. year), keep only first 4 (quotation validateDateFormats). */
function sanitizeSOYearOverflowInField(field) {
  if (!field) return;
  let val = (field.value || "").trim();
  if (/(\d{4})\d+/.test(val)) {
    val = val.replace(/(\d{4})\d+/, "$1");
    field.value = val;
  }
}

/** Same as add-new-quotation.js attachYearClamp — limit year segment while typing. */
function attachSOYearClamp(input) {
  if (!input) return;
  input.addEventListener("input", function () {
    let v = input.value || "";
    v = v.replace(/[^\d-]/g, "");

    const iso = v.match(/^(\d{4,})-(\d{2})-(\d{2})$/);
    if (iso) {
      const year = iso[1].slice(0, 4);
      input.value = `${year}-${iso[2]}-${iso[3]}`;
      return;
    }

    const lastDash = v.lastIndexOf("-");
    if (lastDash !== -1) {
      const prefix = v.slice(0, lastDash + 1);
      let yearPart = v.slice(lastDash + 1).replace(/\D/g, "");
      if (yearPart.length > 4) yearPart = yearPart.slice(0, 4);
      input.value = prefix + yearPart;
      return;
    }

    const m = v.match(/^(\d{0,4})\d*$/);
    input.value = m ? m[1] : v;
  });
}

function isPastDateStr(yyyy_mm_dd) {
  if (!yyyy_mm_dd) return false;
  const s = String(yyyy_mm_dd).trim();
  if (!isValidSODateString(s)) return false;

  const dt = new Date(`${s}T00:00:00`);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  dt.setHours(0, 0, 0, 0);

  return dt < today;
}

/** Empty tracking is allowed; otherwise format depends on shipping method. */
function validateTrackingNumber(method, trackingRaw) {
  const t = String(trackingRaw || "").trim().toUpperCase();
  if (!t) return true;

  const m = String(method || "").trim();

  if (m === "DHL") {
    return /^[A-Z]{2}\d{9}$/.test(t);
  }
  if (m === "UPS") {
    return /^1Z[A-Z0-9]{1,23}$/.test(t) && t.length <= 25;
  }
  if (m === "FedEx") {
    return /^\d{12,14}$/.test(t);
  }
  return /^[A-Z0-9-]{6,25}$/.test(t);
}

function trackingNumberErrorMessage(method, trackingRaw) {
  const t = String(trackingRaw || "").trim().toUpperCase();
  if (!t) return "";
  if (validateTrackingNumber(method, trackingRaw)) return "";

  const m = String(method || "").trim();
  if (m === "DHL") return "Enter 2 letters followed by 9 digits.";
  if (m === "UPS") {
    if (!t.startsWith("1Z")) return "UPS tracking must start with 1Z.";
    return "Please enter a valid UPS tracking number.";
  }
  if (m === "FedEx") return "FedEx: enter 12–14 digits.";
  return "Use 6–25 letters, numbers, or hyphens.";
}

/** Practical email check for live validation (local part @ domain with TLD). */
function isValidEmailFormat(value) {
  const v = String(value || "").trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/** Digits only, exactly 10 (matches phone input max length on this form). */
function isValidPhoneFormat(value) {
  const v = String(value || "").replace(/\D/g, "");
  return /^\d{10}$/.test(v);
}

// =========================================
// SALES ORDER ITEMS
// =========================================
async function loadSOProducts() {
  try {
    const res = await fetch("/api/sales-products", { cache: "no-store" });
    const data = await res.json();

    const list =
      data && Array.isArray(data.products)
        ? data.products
        : data && data.data && Array.isArray(data.data.items)
        ? data.data.items
        : Array.isArray(data)
        ? data
        : [];

    window.SO_PRODUCTS = list;

    const map = {};
    list.forEach((p) => {
      const pid = String(
        p.product_id || p.id || p.code || p.product_code || p.sku || ""
      ).trim();

      if (pid) map[pid] = p;
    });

    window.SO_PRODUCTS_MAP = map;
    console.log("Products loaded:", list.length);
  } catch (e) {
    console.error("Failed to load products:", e);
    window.SO_PRODUCTS = [];
    window.SO_PRODUCTS_MAP = {};
  }
}

function buildProductOptions() {
  if (!window.SO_PRODUCTS.length) return `<option value="">No products</option>`;

  const opts = window.SO_PRODUCTS
    .map((p) => {
      const pid = String(
        p.product_id || p.id || p.code || p.product_code || p.sku || ""
      ).trim();
      const name = String(p.product_name || p.name || p.title || "").trim();

      if (!pid) return "";
      return `<option value="${pid}">${name ? `${name} (${pid})` : pid}</option>`;
    })
    .join("");

  return `<option value="">Select Product</option>${opts}`;
}

function fillAllProductSelects() {
  const html = buildProductOptions();

  document.querySelectorAll("select.productSelect").forEach((sel) => {
    const old = sel.value;
    sel.innerHTML = html;
    if (old) sel.value = old;
  });
}

function updateSerialNumbers() {
  const rows = document.querySelectorAll("#orderItemsBody tr");
  rows.forEach((r, idx) => {
    const sno = r.querySelector(".sno");
    if (sno) sno.innerText = idx + 1;
  });
}

/** Stock available for a product; Infinity means unlimited / unknown (same fields as quotation). */
function getProductAvailableQuantity(p) {
  if (!p || typeof p !== "object") return Infinity;
  const raw =
    p.available_quantity ??
    p.stock_level ??
    p.quantity ??
    p.stock ??
    p.qty ??
    p.available_qty;
  if (raw === undefined || raw === null || raw === "") return Infinity;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : Infinity;
}

function flashSOQtyStockBorder(qtyInput) {
  if (!qtyInput) return;
  qtyInput.style.borderColor = "#dc3545";
  qtyInput.style.borderWidth = "2px";
  setTimeout(() => {
    qtyInput.style.borderColor = "";
    qtyInput.style.borderWidth = "";
  }, 3000);
}

function refreshProductDropdowns() {
  const selects = Array.from(document.querySelectorAll(".productSelect"));

  const selectedValues = selects
    .map((s) => s.value)
    .filter((v) => v && v.trim() !== "");

  selects.forEach((currentSelect) => {
    const currentValue = currentSelect.value;

    Array.from(currentSelect.options).forEach((opt) => {
      if (!opt.value) {
        opt.disabled = false;
        return;
      }

      const usedElsewhere =
        selectedValues.includes(opt.value) &&
        opt.value !== currentValue;

      opt.disabled = usedElsewhere;

      if (usedElsewhere) {
        const originalText =
          opt.getAttribute("data-original-text") || opt.textContent;

        opt.setAttribute("data-original-text", originalText);
        opt.textContent = `${originalText} (Already added)`;
      } else {
        const originalText = opt.getAttribute("data-original-text");
        if (originalText) opt.textContent = originalText;
      }
    });
  });
}

function applyProductToRow(row, productId) {
  const pidCell = row.querySelector(".prodIdCell");
  const uomCell = row.querySelector(".uomCell");
  const taxCell = row.querySelector(".taxCell");
  const priceCell = row.querySelector(".priceCell");
  const discInput = row.querySelector(".discInput");
  const stockCell = row.querySelector(".stockCell");

  if (!productId || !window.SO_PRODUCTS_MAP[productId]) {
    if (pidCell) pidCell.textContent = "-";
    if (stockCell) stockCell.textContent = "0";
    if (uomCell) uomCell.textContent = "-";
    if (taxCell) taxCell.textContent = "0";
    row.dataset.taxPct = "0";
    row.dataset.availQty = "";
    return;
  }

  const p = window.SO_PRODUCTS_MAP[productId];
  const price = Number(p?.unit_price ?? p?.price ?? p?.selling_price ?? 0);

  const pid = String(p.product_id || p.id || p.code || productId);
  const availableQty = getProductAvailableQuantity(p);
  row.dataset.availQty = availableQty === Infinity ? "" : String(availableQty);
  const stock = Number(
    p.stock_level ?? p.quantity ?? p.stock ?? p.qty ?? p.available_qty ?? 0
  );
  const uomVal = String(p.uom || p.unit || "Nos").trim();

  let taxPct = 0;
  const taxCode = String(p.tax_code || p.taxCode || p.tax || "").trim();
  const m = taxCode.match(/(\d+(?:\.\d+)?)\s*%/);

  if (m) taxPct = Number(m[1]) || 0;
  else taxPct = Number(p.tax_pct ?? p.taxPct ?? 0) || 0;

  const defaultDisc = Number(p.discount ?? p.disc ?? 0) || 0;
  if (discInput && (!discInput.value || Number(discInput.value) === 0)) {
    discInput.value = defaultDisc;
  }

  if (pidCell) pidCell.textContent = pid;
if (uomCell) uomCell.textContent = uomVal;
if (priceCell) priceCell.textContent = `${CURRENCY} ${price.toFixed(2)}`; // 
if (taxCell) taxCell.textContent = String(taxPct);

  row.dataset.taxPct = String(taxPct);

  const qtyEl = row.querySelector(".qtyInput");
  const pname = (p.product_name || p.name || p.title || "this product").toString().trim();
  if (qtyEl && availableQty !== Infinity) {
    const q = parseFloat(qtyEl.value) || 0;
    if (q > availableQty) {
      showToast(`Only ${availableQty} units available for ${pname}`, "error");
      qtyEl.value = String(Math.max(0, Math.floor(availableQty)));
      flashSOQtyStockBorder(qtyEl);
    }
  }

  if (qtyEl) calculateRow(qtyEl);
}

function onProductChange(selectEl) {
  const row = selectEl.closest("tr");
  if (!row) return;

  try {
    applyProductToRow(row, selectEl.value);

    // Show success toast when a valid product is selected (match quotation UX)
    const pid = selectEl.value;
    if (pid && window.SO_PRODUCTS_MAP && window.SO_PRODUCTS_MAP[pid]) {
      const p = window.SO_PRODUCTS_MAP[pid];
      const name =
        (p.product_name || p.name || p.title || "Product").toString().trim();
      const price = Number(
        p.unit_price ?? p.price ?? p.selling_price ?? 0
      );

      // Determine currency symbol from current selection (default ₹)
      const currencyCode =
        document.getElementById("currency")?.value?.trim() || "IND";
      const currencySymbols = {
        IND: "₹",
        INR: "₹",
        USD: "$",
        EUR: "€",
        GBP: "£",
        SGD: "S$",
      };
      const symbol = currencySymbols[currencyCode] || currencyCode || "₹";

      showToast(
        `${name} selected. Price: ${symbol} ${price.toFixed(2)}`,
        "success"
      );
    }

    calculateRow(selectEl);
    refreshProductDropdowns();
  } finally {
    updateSOItemProductSelectValidation(selectEl);
  }
}

function calculateRow(el) {
  const row = el.closest("tr");
  if (!row) return;

  const qtyInput = row.querySelector(".qtyInput");
  const discInput = row.querySelector(".discInput");
  const taxPct = Number(row.dataset.taxPct || 0);

  const sel = row.querySelector("select.productSelect");
  const pid = sel?.value;
  const p = pid ? window.SO_PRODUCTS_MAP[pid] : null;
  const price = Number(p?.unit_price ?? p?.price ?? p?.selling_price ?? 0);
  const pname = (p?.product_name || p?.name || p?.title || "this product").toString().trim();

  let discPct = parseFloat(discInput?.value) || 0;
  if (discInput) {
    if (discPct < 0) {
      discPct = 0;
      discInput.value = 0;
      showToast("Item discount cannot be negative", "warning");
    } else if (discPct > MAX_SO_DISCOUNT_PERCENT) {
      discPct = MAX_SO_DISCOUNT_PERCENT;
      discInput.value = MAX_SO_DISCOUNT_PERCENT;
      showToast("Item discount limited to " + MAX_SO_DISCOUNT_PERCENT + "%", "warning");
    }
  }

  let qty = parseFloat(qtyInput?.value) || 0;
  const availRaw = row.dataset.availQty;
  const availableQty =
    availRaw === undefined || availRaw === ""
      ? Infinity
      : parseFloat(availRaw);
  const avail = Number.isFinite(availableQty) ? availableQty : Infinity;

  if (pid && qtyInput && avail !== Infinity && qty > avail) {
    showToast(`Only ${avail} units available for ${pname}`, "error");
    qty = Math.max(0, Math.floor(avail));
    qtyInput.value = String(qty);
    flashSOQtyStockBorder(qtyInput);
  }

  const base = qty * price;
  // Discount first
  const disc = base * (discPct / 100);
  const afterDiscount = base - disc;
  // Tax after discount
  const tax = afterDiscount * (taxPct / 100);
  // Final row total
  const total = afterDiscount + tax;
  row.dataset.base = String(afterDiscount);
  row.dataset.tax = String(tax);
  row.dataset.disc = String(disc);
  row.dataset.total = String(total);

  const totalCell = row.querySelector(".rowTotal");
  if (totalCell) totalCell.textContent = `${CURRENCY} ${total.toFixed(2)}`;

  updateSOItemRowQtyDiscountValidation(row);
  calculateTotals();
}

function deleteRow(btn) {
  const row = btn.closest("tr");
  if (!row) return;

  row.remove();
  updateSerialNumbers();
  calculateTotals();
  refreshProductDropdowns();
  validateAllSOItemRowsQtyDiscount();
  updateSOOrderSummaryValidation();
  updateSubmitButton();
}

function addItem() {
  const tbody = document.getElementById("orderItemsBody");
  if (!tbody) return;

  const tr = document.createElement("tr");
  tr.innerHTML = `
  <td class="sno"></td>

  <td>
    <div class="so-product-select-wrap">
      <select class="productSelect" onchange="onProductChange(this)">
        ${buildProductOptions()}
      </select>
      <span class="field-error so-product-select-error" aria-live="polite"></span>
    </div>
  </td>

  <td class="prodIdCell">-</td>

  <td>
    <input type="text" class="qtyInput" value="1" inputmode="numeric" pattern="[0-9]*" autocomplete="off">
  </td>

  <td class="uomCell">-</td>

  <td class="priceCell">₹ 0.00</td>

  <td class="taxCell">0</td>

  <td>
    <input type="text" class="discInput" value="0" inputmode="numeric" pattern="[0-9]*" autocomplete="off">
  </td>

  <td class="rowTotal">${CURRENCY} 0.00</td>

  <td class="so-action-col">
    <button class="so-delete-btn" type="button" onclick="deleteRow(this)" title="Delete">
      <i class="fa-solid fa-trash"></i>
    </button>
  </td>
`;
  tbody.appendChild(tr);
  updateSerialNumbers();

  const sel = tr.querySelector("select.productSelect");
  if (sel) applyProductToRow(tr, sel.value);

  calculateTotals();
  refreshProductDropdowns();
  const newRow = tbody.querySelector("tr:last-child");
  if (newRow) updateSOItemRowQtyDiscountValidation(newRow);
  const newSel = tr.querySelector("select.productSelect");
  if (newSel) updateSOItemProductSelectValidation(newSel);
  updateSOOrderSummaryValidation();
  updateSubmitButton();
}

function setupSalesOrderItemsQtyDiscNumericDelegation() {
  const tbody = document.getElementById("orderItemsBody");
  if (!tbody || tbody.dataset.qtyDiscNumericBound === "1") return;
  tbody.dataset.qtyDiscNumericBound = "1";

  tbody.addEventListener("input", function (e) {
    const el = e.target;
    if (
      !el ||
      (!el.classList.contains("qtyInput") && !el.classList.contains("discInput"))
    )
      return;
    if (typeof isSalesOrderViewMode === "function" && isSalesOrderViewMode()) return;
    if (el.disabled || el.readOnly) return;

    if (el.classList.contains("qtyInput")) {
      let v = (el.value || "").replace(/\D/g, "");
      if (v.length > 12) v = v.slice(0, 12);
      el.value = v;
      calculateRow(el);
      return;
    }

    if (el.classList.contains("discInput")) {
      let v = (el.value || "").replace(/\D/g, "");
      if (v === "") {
        el.value = "";
        calculateRow(el);
        return;
      }
      let n = parseInt(v, 10);
      if (Number.isNaN(n)) n = 0;
      if (n > MAX_SO_DISCOUNT_PERCENT) n = MAX_SO_DISCOUNT_PERCENT;
      el.value = String(n);
      calculateRow(el);
    }
  });
}

// =========================================
// LINE ITEM QTY / DISCOUNT + ORDER SUMMARY (align with quotation)
// =========================================
function isSalesOrderViewMode() {
  return getModeFromQuery() === "view";
}

function hasAnySOOrderItemProduct() {
  let found = false;
  document.querySelectorAll("#orderItemsBody tr").forEach((row) => {
    const pid = row.querySelector("select.productSelect")?.value?.trim() || "";
    if (pid) found = true;
  });
  return found;
}

function getSOItemQtyDiscountState(row) {
  const productSelect = row.querySelector("select.productSelect");
  if (!productSelect || !productSelect.value || String(productSelect.value).trim() === "") {
    return {
      hasProduct: false,
      quantityOk: true,
      discountOk: true,
      quantityInput: null,
      discountInput: null
    };
  }
  const quantityInput = row.querySelector(".qtyInput");
  const discountInput = row.querySelector(".discInput");
  const qtyRaw = quantityInput ? String(quantityInput.value).trim() : "";
  const discRaw = discountInput ? String(discountInput.value).trim() : "";

  const qty = parseFloat(qtyRaw);
  const quantityOk =
    qtyRaw !== "" && Number.isFinite(qty) && qty > 0 && Number.isInteger(qty);

  let discountOk = false;
  if (discRaw !== "") {
    const d = parseFloat(discRaw);
    discountOk = Number.isFinite(d) && d >= 0 && d <= MAX_SO_DISCOUNT_PERCENT;
  }

  return { hasProduct: true, quantityOk, discountOk, quantityInput, discountInput };
}

function updateSOItemRowQtyDiscountValidation(row) {
  if (!row) return;
  if (isSalesOrderViewMode()) {
    row.querySelectorAll(".qtyInput, .discInput").forEach((el) => el.classList.remove("input-error"));
    return;
  }
  const s = getSOItemQtyDiscountState(row);
  if (!s.hasProduct) {
    s.quantityInput?.classList.remove("input-error");
    s.discountInput?.classList.remove("input-error");
    return;
  }
  s.quantityInput?.classList.toggle("input-error", !s.quantityOk);
  s.discountInput?.classList.toggle("input-error", !s.discountOk);
}

function allSOItemRowsQtyDiscountValid() {
  if (isSalesOrderViewMode()) return true;
  const rows = document.querySelectorAll("#orderItemsBody tr");
  for (let i = 0; i < rows.length; i++) {
    const s = getSOItemQtyDiscountState(rows[i]);
    if (s.hasProduct && (!s.quantityOk || !s.discountOk)) return false;
  }
  return true;
}

function validateAllSOItemRowsQtyDiscount() {
  document.querySelectorAll("#orderItemsBody tr").forEach((row) => updateSOItemRowQtyDiscountValidation(row));
}

function getSOOrderSummaryState() {
  const globalInput = document.getElementById("globalDiscount");
  const shippingInput = document.getElementById("shipping");
  const need = hasAnySOOrderItemProduct();
  if (!need) {
    return { needSummary: false, globalOk: true, shippingOk: true, globalInput, shippingInput };
  }
  const gRaw = globalInput ? String(globalInput.value).trim() : "";
  const sRaw = shippingInput ? String(shippingInput.value).trim() : "";
  const g = parseFloat(gRaw);
  const globalOk =
    gRaw !== "" && Number.isFinite(g) && g >= 0 && g <= MAX_SO_DISCOUNT_PERCENT;
  const sh = parseFloat(sRaw);
  const shippingOk = sRaw !== "" && Number.isFinite(sh) && sh >= 0;
  return { needSummary: true, globalOk, shippingOk, globalInput, shippingInput };
}

function updateSOOrderSummaryValidation() {
  if (isSalesOrderViewMode()) {
    document.getElementById("globalDiscount")?.classList.remove("input-error");
    document.getElementById("shipping")?.classList.remove("input-error");
    return;
  }
  const st = getSOOrderSummaryState();
  if (!st.needSummary) {
    st.globalInput?.classList.remove("input-error");
    st.shippingInput?.classList.remove("input-error");
    return;
  }
  st.globalInput?.classList.toggle("input-error", !st.globalOk);
  st.shippingInput?.classList.toggle("input-error", !st.shippingOk);
}

function allSOOrderSummaryValid() {
  const st = getSOOrderSummaryState();
  if (!st.needSummary) return true;
  return st.globalOk && st.shippingOk;
}

/** Inline “Please select product” under Sales Order Items dropdown (like quotation). */
function updateSOItemProductSelectValidation(selectElement) {
  if (!selectElement || !selectElement.classList.contains("productSelect")) return;
  const wrap = selectElement.closest(".so-product-select-wrap");
  const errEl = wrap
    ? wrap.querySelector(".so-product-select-error")
    : selectElement.parentElement?.querySelector(".so-product-select-error");
  if (typeof isSalesOrderViewMode === "function" && isSalesOrderViewMode()) {
    if (errEl) errEl.textContent = "";
    selectElement.classList.remove("input-error");
    return;
  }
  const hasValue = !!(selectElement.value && String(selectElement.value).trim());
  if (errEl) errEl.textContent = hasValue ? "" : "Please select product";
  if (hasValue) selectElement.classList.remove("input-error");
  else selectElement.classList.add("input-error");
}

function validateAllSOItemProductSelects() {
  document.querySelectorAll("#orderItemsBody tr select.productSelect").forEach((sel) => {
    updateSOItemProductSelectValidation(sel);
  });
}

function paintSalesOrderLineAndSummaryValidation() {
  validateAllSOItemProductSelects();
  validateAllSOItemRowsQtyDiscount();
  updateSOOrderSummaryValidation();
}

function allItemsValid() {
  if (isSalesOrderViewMode()) return true;
  const rows = document.querySelectorAll("#orderItemsBody tr");
  if (!rows.length) return false;
  if (!hasAnySOOrderItemProduct()) return false;
  if (!allSOItemRowsQtyDiscountValid()) return false;
  if (!allSOOrderSummaryValid()) return false;
  return true;
}

// =========================================
// ORDER SUMMARY
// =========================================
function calculateTotals() {
  let subTotal = 0;
  let taxTotal = 0;

  document.querySelectorAll("#orderItemsBody tr").forEach((row) => {
    subTotal += Number(row.dataset.total || 0);
    taxTotal += Number(row.dataset.tax || 0);
  });

  const globalDiscountInput = document.getElementById("globalDiscount");
  let globalDiscPercent = Number(globalDiscountInput?.value || 0);

  // Match quotation behaviour: percentage 0–MAX_SO_DISCOUNT_PERCENT with warning toasts
  if (globalDiscPercent > MAX_SO_DISCOUNT_PERCENT) {
    globalDiscPercent = MAX_SO_DISCOUNT_PERCENT;
    if (globalDiscountInput) globalDiscountInput.value = MAX_SO_DISCOUNT_PERCENT;
    showToast("Global discount limited to " + MAX_SO_DISCOUNT_PERCENT + "%", "error");
  } else if (globalDiscPercent < 0) {
    globalDiscPercent = 0;
    if (globalDiscountInput) globalDiscountInput.value = 0;
    showToast("Global discount cannot be negative", "error");
  }

  const globalDiscAmt = (subTotal * globalDiscPercent) / 100;

  const shippingInput = document.getElementById("shipping");
  let ship = Number(shippingInput?.value || 0);

  // Shipping validation similar to quotation: no negative values
  if (ship < 0) {
    ship = 0;
    if (shippingInput) shippingInput.value = 0;
    showToast("Shipping charges cannot be negative", "error");
  }

  const grandBeforeRound = subTotal - globalDiscAmt + ship;
  const roundedGrand = Math.round(grandBeforeRound);
  const roundingAdj = +(roundedGrand - grandBeforeRound).toFixed(2);

  const subEl = document.getElementById("subtotal");
  const taxEl = document.getElementById("tax");
  const roundEl = document.getElementById("rounding");
  const grandEl = document.getElementById("grandTotal");

  if (subEl) subEl.textContent = `${CURRENCY} ${subTotal.toFixed(2)}`;
  if (taxEl) taxEl.textContent = `${CURRENCY} ${taxTotal.toFixed(2)}`;
  if (roundEl) roundEl.textContent = `${CURRENCY} ${roundingAdj.toFixed(2)}`;
  if (grandEl) grandEl.textContent = `${CURRENCY} ${(grandBeforeRound + roundingAdj).toFixed(2)}`;

  updateSOOrderSummaryValidation();
  updateSubmitButton();
}

// Attach live validation handlers for global discount and shipping, like quotation
document.addEventListener("DOMContentLoaded", () => {
  const gd = document.getElementById("globalDiscount");
  const ship = document.getElementById("shipping");

  if (gd) {
    // Restrict to digits only and positive values
    gd.addEventListener("input", () => {
      // Keep only digits
      let v = gd.value.replace(/\D/g, "");
      gd.value = v;
      calculateTotals();
    });

    gd.addEventListener("keydown", (e) => {
      // Allow control keys: backspace, delete, arrows, tab, enter, home/end
      const ctrlKeys = [
        "Backspace",
        "Delete",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Tab",
        "Enter",
        "Home",
        "End",
      ];
      if (ctrlKeys.includes(e.key)) return;

      // Block minus sign and any non-digit
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
        return;
      }
    });

    gd.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData("text") || "";
      const digits = pasted.replace(/\D/g, "");
      gd.value = digits;
      calculateTotals();
    });

    gd.addEventListener("change", calculateTotals);
    gd.addEventListener("blur", calculateTotals);
  }

  if (ship) {
    // Restrict Shipping Charges to digits only, max 5 digits
    ship.addEventListener("input", () => {
      let v = ship.value.replace(/\D/g, "");
      if (v.length > 5) v = v.slice(0, 5);
      ship.value = v;
      calculateTotals();
    });

    ship.addEventListener("keydown", (e) => {
      const ctrlKeys = [
        "Backspace",
        "Delete",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Tab",
        "Enter",
        "Home",
        "End",
      ];
      if (ctrlKeys.includes(e.key)) return;

      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
        return;
      }

      // Enforce max 5 digits at keypress
      if (ship.value.replace(/\D/g, "").length >= 5) {
        e.preventDefault();
      }
    });

    ship.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData("text") || "";
      let digits = pasted.replace(/\D/g, "");
      if (digits.length > 5) digits = digits.slice(0, 5);
      ship.value = digits;
      calculateTotals();
    });

    ship.addEventListener("change", calculateTotals);
    ship.addEventListener("blur", calculateTotals);
  }

  setupSalesOrderItemsQtyDiscNumericDelegation();
});

// =========================================
// COMMENTS / HISTORY
// =========================================
function getLoggedInUserName() {
  return (
    window.CURRENT_USER_NAME ||
    window.CURRENT_USER ||
    window.LOGGED_IN_USER ||
    document.getElementById("loggedInUserName")?.value ||
    document.getElementById("loggedInUser")?.value ||
    document.body?.dataset?.username ||
    "Admin"
  );
}

function fmtDateTime(iso) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso || "";

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    let hours = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, "0");
    const secs = String(d.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";

    hours = hours % 12 || 12;

    return `${day}/${month}/${year}, ${hours}:${mins}:${secs} ${ampm}`;
  } catch {
    return iso || "";
  }
}

function buildCommentRow(c) {
  const div = document.createElement("div");
  div.className = "so-ch-row";

  const by = (c.by || "Admin").trim();
  const at = fmtDateTime(c.at);

  div.innerHTML = `
    <div class="so-ch-row-meta">
      <span class="so-ch-row-user">${by}</span>
      <span class="so-ch-row-time">– ${at}</span>
    </div>
    <div class="so-ch-row-msg"></div>
  `;

  div.querySelector(".so-ch-row-msg").textContent = c.text || "";
  return div;
}

function renderComments() {
  const list = document.getElementById("commentList");
  const empty = document.getElementById("commentsEmpty");
  if (!list || !empty) return;

  list.innerHTML = "";

  if (!window.SO_COMMENTS.length) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  [...window.SO_COMMENTS].slice().reverse().forEach((c) => {
    list.appendChild(buildCommentRow(c));
  });
}

function renderHistory() {
  const list = document.getElementById("historyList");
  const empty = document.getElementById("historyEmpty");
  if (!list || !empty) return;

  list.innerHTML = "";

  if (!window.SO_COMMENTS.length) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  [...window.SO_COMMENTS].slice().reverse().forEach((c) => {
    list.appendChild(buildCommentRow(c));
  });
}

function setActiveTab(tab) {
  const btnC = document.getElementById("soTabComments");
  const btnH = document.getElementById("soTabHistory");
  const panelC = document.getElementById("soCommentsPanel");
  const panelH = document.getElementById("soHistoryPanel");

  if (!btnC || !btnH || !panelC || !panelH) return;

  const isComments = tab === "comments";

  btnC.classList.toggle("active", isComments);
  btnH.classList.toggle("active", !isComments);

  panelC.classList.toggle("hidden", !isComments);
  panelH.classList.toggle("hidden", isComments);

  if (isComments) renderComments();
  else renderHistory();
}

function updateCommentAddButton() {
  const input = document.getElementById("commentInput");
  const btn = document.getElementById("commentAddBtn");
  if (!input || !btn) return;

  const hasText = (input.value || "").trim().length > 0;
  const canType = !input.disabled && !input.readOnly;
  btn.disabled = !hasText || !canType;
}

function hasAtLeastOneComment() {
  return Array.isArray(window.SO_COMMENTS) && window.SO_COMMENTS.length > 0;
}

function addComment() {
  const input = document.getElementById("commentInput");
  if (!input) return;

  const text = (input.value || "").trim();
  if (!text) {
    showToast("Please enter comment", "error");
    return;
  }

  const loggedUser = getLoggedInUserName();

  window.SO_COMMENTS.push({
    text,
    by: loggedUser,
    at: new Date().toISOString()
  });

  input.value = "";
  updateCommentAddButton();
  showToast("Comment added", "success");

  renderComments();
  renderHistory();
  updateSubmitButton();
}

// =========================================
// LIVE VALIDATION (tiered, like Add New Quotation)
// =========================================
function soLiveTier1Basics() {
  const od = document.getElementById("orderDate")?.value?.trim();
  const ot = document.getElementById("orderType")?.value?.trim();
  return !!(od && isValidSODateString(od) && ot);
}

function soLiveTier2Rep() {
  return soLiveTier1Basics() && !!(document.getElementById("salesRep")?.value?.trim());
}

function soLiveTier3Customer() {
  return soLiveTier2Rep() && isCustomerSelected();
}

function soLiveTier4Addresses() {
  if (!soLiveTier3Customer()) return false;
  const bill = (document.getElementById("billingAddress")?.value || "").trim();
  const ship = (document.getElementById("shippingAddress")?.value || "").trim();
  const email = (document.getElementById("email")?.value || "").trim();
  const phone = (document.getElementById("phone")?.value || "").trim();
  return !!(bill && ship && isValidEmailFormat(email) && isValidPhoneFormat(phone));
}

function soLiveTier5Payment() {
  if (!soLiveTier4Addresses()) return false;
  const pay = document.getElementById("paymentMethod")?.value?.trim();
  const due = document.getElementById("dueDate")?.value?.trim();
  const terms = (document.getElementById("terms")?.value || "").trim();
  return !!(pay && due && isValidSODateString(due) && terms);
}

function runLiveSalesOrderValidation() {
  if (typeof isSalesOrderViewMode === "function" && isSalesOrderViewMode()) return;

  const orderDate = document.getElementById("orderDate");
  const orderDateErr = document.getElementById("orderDateErr");
  if (orderDate && orderDateErr) {
    const ov = orderDate.value?.trim() || "";
    if (!ov) {
      setFieldError(orderDate, orderDateErr, "Please select order date.");
    } else if (!isValidSODateString(ov)) {
      setFieldError(orderDate, orderDateErr, SO_INVALID_DATE_MSG);
    } else {
      setFieldError(orderDate, orderDateErr, "");
    }
  }

  const orderType = document.getElementById("orderType");
  const orderTypeErr = document.getElementById("orderTypeErr");
  if (orderType && orderTypeErr) {
    if (!orderType.value?.trim()) {
      setFieldError(orderType, orderTypeErr, "Please select order type.");
    } else {
      setFieldError(orderType, orderTypeErr, "");
    }
  }

  const repCustLocked =
    typeof isSORepCustomerReadOnly === "function" && isSORepCustomerReadOnly();

  const salesRepSelected = document.getElementById("salesRepSelected");
  const salesRepErr = document.getElementById("salesRepErr");
  if (salesRepSelected && salesRepErr) {
    if (repCustLocked) {
      setFieldError(salesRepSelected, salesRepErr, "");
    } else if (!soLiveTier1Basics()) {
      setFieldError(salesRepSelected, salesRepErr, "");
    } else if (!document.getElementById("salesRep")?.value?.trim()) {
      setFieldError(salesRepSelected, salesRepErr, "Please select a sales rep.");
    } else {
      setFieldError(salesRepSelected, salesRepErr, "");
    }
  }

  const customerSelected = document.getElementById("customerSelected");
  const customerErr = document.getElementById("customerErr");
  if (customerSelected && customerErr) {
    if (repCustLocked) {
      setFieldError(customerSelected, customerErr, "");
    } else if (!soLiveTier2Rep()) {
      setFieldError(customerSelected, customerErr, "");
    } else if (!isCustomerSelected()) {
      setFieldError(customerSelected, customerErr, "Please select a customer.");
    } else {
      setFieldError(customerSelected, customerErr, "");
    }
  }

  const billEl = document.getElementById("billingAddress");
  const billErr = document.getElementById("billingAddressErr");
  const shipEl = document.getElementById("shippingAddress");
  const shipErr = document.getElementById("shippingAddressErr");
  const emailEl = document.getElementById("email");
  const emailErr = document.getElementById("emailErr");
  const phoneEl = document.getElementById("phone");
  const phoneErr = document.getElementById("phoneErr");

  if (!soLiveTier3Customer()) {
    if (billEl && billErr) setFieldError(billEl, billErr, "");
    if (shipEl && shipErr) setFieldError(shipEl, shipErr, "");
    if (emailEl && emailErr) setFieldError(emailEl, emailErr, "");
    if (phoneEl && phoneErr) setFieldError(phoneEl, phoneErr, "");
  } else {
    if (billEl && billErr) {
      setFieldError(billEl, billErr, billEl.value.trim() ? "" : "Please enter billing address.");
    }
    if (shipEl && shipErr) {
      setFieldError(shipEl, shipErr, shipEl.value.trim() ? "" : "Please enter shipping address.");
    }
    if (emailEl && emailErr) {
      const em = emailEl.value.trim();
      if (!em) {
        setFieldError(emailEl, emailErr, "Please enter email.");
      } else if (!isValidEmailFormat(em)) {
        setFieldError(emailEl, emailErr, "Please enter a valid email address.");
      } else {
        setFieldError(emailEl, emailErr, "");
      }
    }
    if (phoneEl && phoneErr) {
      const ph = phoneEl.value.replace(/\D/g, "");
      if (!ph) {
        setFieldError(phoneEl, phoneErr, "Please enter phone number.");
      } else if (!isValidPhoneFormat(ph)) {
        setFieldError(phoneEl, phoneErr, "Please enter a 10-digit phone number.");
      } else {
        setFieldError(phoneEl, phoneErr, "");
      }
    }
  }

  const payEl = document.getElementById("paymentMethod");
  const payErr = document.getElementById("paymentMethodErr");
  const dueDate = document.getElementById("dueDate");
  const dueDateErr = document.getElementById("dueDateErr");
  const termsEl = document.getElementById("terms");
  const termsErr = document.getElementById("termsErr");

  if (!soLiveTier4Addresses()) {
    if (payEl && payErr) setFieldError(payEl, payErr, "");
    if (dueDate && dueDateErr) setFieldError(dueDate, dueDateErr, "");
    if (termsEl && termsErr) setFieldError(termsEl, termsErr, "");
  } else {
    if (payEl && payErr) {
      setFieldError(payEl, payErr, payEl.value?.trim() ? "" : "Please select payment method.");
    }
    if (dueDate && dueDateErr) {
      const dv = dueDate.value?.trim() || "";
      if (!dv) {
        setFieldError(dueDate, dueDateErr, "Please select due date.");
      } else if (!isValidSODateString(dv)) {
        setFieldError(dueDate, dueDateErr, SO_INVALID_DATE_MSG);
      } else if (isPastDateStr(dv)) {
        setFieldError(dueDate, dueDateErr, "Due date cannot be in the past.");
      } else {
        setFieldError(dueDate, dueDateErr, "");
      }
    }
    if (termsEl && termsErr) {
      const tv = (termsEl.value || "").trim();
      setFieldError(termsEl, termsErr, tv ? "" : "Please enter terms & conditions.");
    }
  }

  const shipMethod = document.getElementById("shippingMethod");
  const shipMethodErr = document.getElementById("shippingMethodErr");
  const deliveryDate = document.getElementById("deliveryDate");
  const deliveryDateErr = document.getElementById("deliveryDateErr");

  const trackingEl = document.getElementById("trackingNumber");
  const trackingErr = document.getElementById("trackingError");

  if (!soLiveTier5Payment()) {
    if (shipMethod && shipMethodErr) setFieldError(shipMethod, shipMethodErr, "");
    if (deliveryDate && deliveryDateErr) setFieldError(deliveryDate, deliveryDateErr, "");
    if (trackingEl && trackingErr) setFieldError(trackingEl, trackingErr, "");
  } else {
    if (shipMethod && shipMethodErr) {
      setFieldError(
        shipMethod,
        shipMethodErr,
        shipMethod.value?.trim() ? "" : "Please select shipping method."
      );
    }
    if (deliveryDate && deliveryDateErr) {
      const delv = deliveryDate.value?.trim() || "";
      const orderV = orderDate?.value?.trim() || "";
      if (!delv) {
        setFieldError(deliveryDate, deliveryDateErr, "Please select expected delivery date.");
      } else if (!isValidSODateString(delv)) {
        setFieldError(deliveryDate, deliveryDateErr, SO_INVALID_DATE_MSG);
      } else if (isPastDateStr(delv)) {
        setFieldError(deliveryDate, deliveryDateErr, "Expected delivery cannot be in the past.");
      } else if (orderV && isValidSODateString(orderV) && delv < orderV) {
        setFieldError(
          deliveryDate,
          deliveryDateErr,
          "Expected delivery cannot be earlier than order date."
        );
      } else {
        setFieldError(deliveryDate, deliveryDateErr, "");
      }
    }
    if (trackingEl && trackingErr) {
      const msg = trackingNumberErrorMessage(shipMethod?.value || "", trackingEl.value);
      setFieldError(trackingEl, trackingErr, msg);
    }
  }
}

// =========================================
// FOOTER ACTIONS
// =========================================
function updateSubmitButton() {
  runLiveSalesOrderValidation();
  paintSalesOrderLineAndSummaryValidation();

  const submitBtn = document.getElementById("submitBtn");
  if (!submitBtn) return;

  const salesRep = document.getElementById("salesRep")?.value?.trim() || "";
  const orderType = document.getElementById("orderType")?.value?.trim() || "";
  const orderDate = document.getElementById("orderDate")?.value?.trim() || "";

  const payMethod = document.getElementById("paymentMethod")?.value?.trim() || "";
  const currency = document.getElementById("currency")?.value?.trim() || "";
  const dueDate = document.getElementById("dueDate")?.value?.trim() || "";
  const terms = (document.getElementById("terms")?.value || "").trim();

  const shipMethod = document.getElementById("shippingMethod")?.value?.trim() || "";
  const delDate = document.getElementById("deliveryDate")?.value?.trim() || "";
  const trackingVal = document.getElementById("trackingNumber")?.value || "";

  const billAddr = (document.getElementById("billingAddress")?.value || "").trim();
  const shipAddr = (document.getElementById("shippingAddress")?.value || "").trim();
  const email = (document.getElementById("email")?.value || "").trim();
  const emailOk = isValidEmailFormat(email);
  const phoneOk = isValidPhoneFormat(document.getElementById("phone")?.value || "");
  const trackingOk = validateTrackingNumber(shipMethod, trackingVal);

  const orderDateOk = !!orderDate && isValidSODateString(orderDate);
  const dueDateOk = !!dueDate && isValidSODateString(dueDate);
  const delDateOk = !!delDate && isValidSODateString(delDate);

  const allOk =
    !!billAddr &&
    !!shipAddr &&
    emailOk &&
    phoneOk &&
    !!salesRep &&
    !!orderType &&
    orderDateOk &&
    isCustomerSelected() &&
    !!payMethod &&
    !!currency &&
    dueDateOk &&
    !!terms &&
    !!shipMethod &&
    delDateOk &&
    trackingOk &&
    allItemsValid();

  submitBtn.style.display = "inline-flex";
  submitBtn.disabled = !allOk;
}

function updateCancelButton() {
  const cancelBtn = document.querySelector(".cancel-order");
  if (!cancelBtn) return;

  const status = getCurrentSOStatus();

  const allowed = [
    "draft",
    "submitted",
    "submitted po",
    "submitted_po",
    "partially delivered",
    "partially_delivered"
  ];

  cancelBtn.disabled = !allowed.includes(status);
}

// =========================================
// PAYLOAD
// =========================================
function collectSalesOrderPayload() {
  const items = [];

  document.querySelectorAll("#orderItemsBody tr").forEach((row) => {
    const sel = row.querySelector("select.productSelect");
    const pid = sel?.value || "";
    const pname = sel?.selectedOptions?.[0]?.textContent || "";

    const qty = Number(row.querySelector(".qtyInput")?.value || 0);
    const uom = (row.querySelector(".uomCell")?.textContent || "").trim();
    const taxPct = Number(row.dataset.taxPct || 0);
    const discPct = Number(row.querySelector(".discInput")?.value || 0);
    const lineTotal = toNumber(row.querySelector(".rowTotal")?.textContent || 0);

    const p = pid ? window.SO_PRODUCTS_MAP[pid] : null;
    const price = Number(p?.unit_price ?? p?.price ?? p?.selling_price ?? 0);

    if (pid) {
      items.push({
        product_id: pid,
        product_name: pname,
        qty,
        uom,
        price,
        tax_pct: taxPct,
        disc_pct: discPct,
        line_total: lineTotal
      });
    }
  });

  return {
    so_id: document.getElementById("salesOrderId")?.value || "",
    order_date: document.getElementById("orderDate")?.value || "",
    sales_rep: document.getElementById("salesRep")?.value || "",
    order_type: document.getElementById("orderType")?.value || "",

    customer_name: document.getElementById("customerSelected")?.textContent?.trim() || "",
    customer_id: document.getElementById("customer_id")?.value || "",

    billing_address: document.getElementById("billingAddress")?.value || "",
    shipping_address: document.getElementById("shippingAddress")?.value || "",
    email: document.getElementById("email")?.value || "",
    phone: document.getElementById("phone")?.value || "",

    items,

    shipping_method: document.getElementById("shippingMethod")?.value || "",
    delivery_date: document.getElementById("deliveryDate")?.value || "",
    tracking_number: document.getElementById("trackingNumber")?.value || "",
    internal_notes: document.getElementById("internalNotes")?.value || "",
    customer_notes: document.getElementById("customerNotes")?.value || "",

    payment_method: document.getElementById("paymentMethod")?.value || "",
    currency: document.getElementById("currency")?.value || "INR",
    due_date: document.getElementById("dueDate")?.value || "",
    terms: document.getElementById("terms")?.value || "",

    subtotal: toNumber(document.getElementById("subtotal")?.textContent),
    tax_total: toNumber(document.getElementById("tax")?.textContent),
    rounding: toNumber(document.getElementById("rounding")?.textContent),
    global_discount: toNumber(document.getElementById("globalDiscount")?.value),
    shipping_charges: toNumber(document.getElementById("shipping")?.value),
    grand_total: toNumber(document.getElementById("grandTotal")?.textContent),

    status: window.__SO_DEBUG?.status || window.__SO_DEBUG?.order_status || "",
    cancel_reason: window.__SO_DEBUG?.cancel_reason || "",
    cancelled_by: window.__SO_DEBUG?.cancelled_by || "",
    cancelled_at: window.__SO_DEBUG?.cancelled_at || "",
    status_history: Array.isArray(window.__SO_DEBUG?.status_history)
      ? window.__SO_DEBUG.status_history
      : []
  };
}

// =========================================
// SAVE / SUBMIT
// =========================================
function saveDraft() {
  const rep = document.getElementById("salesRep")?.value?.trim() || "";
  const type = document.getElementById("orderType")?.value?.trim() || "";

  if (!rep) {
    showToast("Please select Sales Rep", "error");
    return;
  }

  if (!type) {
    showToast("Please select Order Type", "error");
    return;
  }

  paintSalesOrderLineAndSummaryValidation();
  if (!hasAnySOOrderItemProduct()) {
    showToast("Please add at least one product line.", "error");
    return;
  }
  if (!allSOItemRowsQtyDiscountValid()) {
    showToast(
      "Each line needs a positive whole number quantity and discount % between 0 and " +
        MAX_SO_DISCOUNT_PERCENT +
        ".",
      "error"
    );
    return;
  }
  if (!allSOOrderSummaryValid()) {
    showToast(
      "Enter global discount (0–" +
        MAX_SO_DISCOUNT_PERCENT +
        "%) and shipping charges (0 or more).",
      "error"
    );
    return;
  }

  const odD = document.getElementById("orderDate")?.value?.trim() || "";
  const dueD = document.getElementById("dueDate")?.value?.trim() || "";
  const delD = document.getElementById("deliveryDate")?.value?.trim() || "";
  if (
    (odD && !isValidSODateString(odD)) ||
    (dueD && !isValidSODateString(dueD)) ||
    (delD && !isValidSODateString(delD))
  ) {
    showToast(SO_INVALID_DATE_MSG, "error");
    updateSubmitButton();
    return;
  }

  const payload = collectSalesOrderPayload();

  fetch("/api/sales-orders/save-draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then((r) => r.json())
    .then((data) => {
      if (!data.success) throw new Error("Draft save failed");
      // Flag for success toast on list page (draft)
      try {
        localStorage.setItem("salesOrderDraftSuccess", "1");
      } catch (e) {}
      window.location.href = SALES_LIST_URL;
    })
    .catch(() => showToast("Draft Save Error", "error"));
}

function submitOrder() {
  updateSubmitButton();

  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn && submitBtn.disabled) {
    paintSalesOrderLineAndSummaryValidation();
    showToast("Please fill all required fields before submit.", "error");
    return;
  }

  paintSalesOrderLineAndSummaryValidation();
  if (!allItemsValid()) {
    if (!hasAnySOOrderItemProduct()) {
      showToast("Please add at least one product line.", "error");
    } else if (!allSOItemRowsQtyDiscountValid()) {
      showToast(
        "Each line needs a positive whole number quantity and discount % between 0 and " +
          MAX_SO_DISCOUNT_PERCENT +
          ".",
        "error"
      );
    } else if (!allSOOrderSummaryValid()) {
      showToast(
        "Enter global discount (0–" +
          MAX_SO_DISCOUNT_PERCENT +
          "%) and shipping charges (0 or more).",
        "error"
      );
    }
    updateSubmitButton();
    return;
  }

  const orderDate = document.getElementById("orderDate")?.value;
  const deliveryDate = document.getElementById("deliveryDate")?.value;
  const method = document.getElementById("shippingMethod")?.value;
  const tracking = document.getElementById("trackingNumber")?.value.trim();

  if (
    deliveryDate &&
    orderDate &&
    isValidSODateString(String(deliveryDate).trim()) &&
    isValidSODateString(String(orderDate).trim()) &&
    deliveryDate < orderDate
  ) {
    showToast("Expected Delivery cannot be earlier than Order Date.", "error");
    return;
  }

  const odSubmit = document.getElementById("orderDate")?.value?.trim() || "";
  const dueSubmit = document.getElementById("dueDate")?.value?.trim() || "";
  const delSubmit = document.getElementById("deliveryDate")?.value?.trim() || "";
  if (
    (odSubmit && !isValidSODateString(odSubmit)) ||
    (dueSubmit && !isValidSODateString(dueSubmit)) ||
    (delSubmit && !isValidSODateString(delSubmit))
  ) {
    showToast(SO_INVALID_DATE_MSG, "error");
    updateSubmitButton();
    return;
  }

  if (!validateTrackingNumber(method, tracking)) {
    const hint = trackingNumberErrorMessage(method || "", tracking) || "Invalid tracking number format.";
    showToast(hint, "error");
    return;
  }

  const rep = document.getElementById("salesRep")?.value?.trim() || "";
  const type = document.getElementById("orderType")?.value?.trim() || "";

  if (!rep) {
    showToast("Please select Sales Rep", "error");
    return;
  }

  if (!type) {
    showToast("Please select Order Type", "error");
    return;
  }

  const payload = collectSalesOrderPayload();
  if (!payload.items.length) {
    showToast("Please add at least one item.", "error");
    return;
  }

  fetch("/api/sales-orders/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then((r) => r.json())
    .then((data) => {
      if (!data.success) throw new Error("Submit failed");
      // Flag for success toast on list page
      try {
        localStorage.setItem("salesOrderSuccess", "1");
      } catch (e) {}
      window.location.href = SALES_LIST_URL;
    })
    .catch(() => showToast("Submit Error", "error"));
}

// =========================================
// PDF / EMAIL ACTIONS
// =========================================
function canEnablePdf(status) {
  return [
    "draft",
    "submitted",
    "submitted po",
    "submitted_po",
    "delivered",
    "partially delivered",
    "partially_delivered"
  ].includes(status);
}

function canEnableEmail(status) {
  return [
    "submitted",
    "submitted po",
    "submitted_po",
    "delivered",
    "partially delivered",
    "partially_delivered"
  ].includes(status);
}

function getSOIdSafe() {
  const qp = new URLSearchParams(window.location.search);
  const qid = (qp.get("so_id") || qp.get("id") || "").trim();
  if (qid) return qid;

  const parts = window.location.pathname.split("/").filter(Boolean);
  const editIdx = parts.findIndex((p) => p.toLowerCase() === "edit");
  if (editIdx !== -1 && parts[editIdx + 1]) {
    return decodeURIComponent(parts[editIdx + 1]);
  }

  return "";
}



function updateDocumentButtons() {
  updateGenerateDnInvoiceButtons();

  const pdfBtn = document.getElementById("pdfBtn");
  const emailBtn = document.getElementById("emailBtn");
  if (!pdfBtn || !emailBtn) return;

  const soId = getCurrentSOId();
  const hasSavedSO = !!soId && !!getSOIdSafe();
  const status = getCurrentSOStatus();

  if (!hasSavedSO) {
    pdfBtn.disabled = true;
    emailBtn.disabled = true;
    return;
  }

  pdfBtn.disabled = !canEnablePdf(status);
  emailBtn.disabled = !canEnableEmail(status);
}

function openSoPdf() {
  const pdfBtn = document.getElementById("pdfBtn");

  if (pdfBtn?.disabled) {
    showToast("PDF not available for this status", "error");
    return;
  }

  const soId = getCurrentSOId();
  if (!soId) {
    showToast("SO ID missing", "error");
    return;
  }

  window.open(`/api/sales-orders/${encodeURIComponent(soId)}/pdf`, "_blank");
}

async function sendSalesOrderEmail() {
  const emailBtn = document.getElementById("emailBtn");

  if (emailBtn?.disabled) {
    showToast("Email not available for this status", "error");
    return;
  }

  try {
    const soId = getCurrentSOId();

    if (!soId) {
      showToast("Sales Order ID not found", "error");
      return;
    }

    if (emailBtn) {
      emailBtn.disabled = true;
      emailBtn.dataset.originalTitle = emailBtn.title || "";
      emailBtn.title = "Sending...";
      emailBtn.style.opacity = "0.7";
      emailBtn.style.cursor = "wait";
    }

    showToast("Sending email...", "success");

    const res = await fetch(`/api/sales-orders/${encodeURIComponent(soId)}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    const data = await res.json();

    if (data.success) {
      showToast("Email Sent Successfully", "success");
    } else {
      showToast(data.message || "Failed to send email", "error");
    }
  } catch (err) {
    console.error("Email send failed:", err);
    showToast("Something went wrong while sending email", "error");
  } finally {
    if (emailBtn) {
      emailBtn.disabled = false;
      emailBtn.title = emailBtn.dataset.originalTitle || "Send Mail";
      emailBtn.style.opacity = "";
      emailBtn.style.cursor = "";
    }

    updateDocumentButtons();
  }
}

// =========================================
// CANCEL ORDER MODAL
// =========================================
function openSoCancelModal(defaultText = "") {
  const backdrop = document.getElementById("cancelSoBackdrop");
  const reasonEl = document.getElementById("cancelSoReason");
  const btnYes = document.getElementById("cancelSoYes");
  const btnNo = document.getElementById("cancelSoNo");
  const btnX = document.getElementById("cancelSoX");

  const lastFocusedEl = document.activeElement;

  if (!backdrop || !reasonEl || !btnYes || !btnNo || !btnX) {
    showToast("Cancel modal HTML not found", "error");
    return Promise.resolve(null);
  }

  function getFocusable() {
    const modal = backdrop.querySelector(".pos-modal");
    if (!modal) return [];

    return [
      ...modal.querySelectorAll(
        'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ].filter((el) => el.offsetParent !== null);
  }

  reasonEl.value = defaultText;

  let resolveFn;
  const p = new Promise((resolve) => (resolveFn = resolve));

  function close() {
    backdrop.style.display = "none";
    btnYes.removeEventListener("click", onYes);
    btnNo.removeEventListener("click", onNo);
    btnX.removeEventListener("click", onNo);
    backdrop.removeEventListener("click", onBackdrop);
    document.removeEventListener("keydown", onKeydown);

    if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
      setTimeout(() => lastFocusedEl.focus(), 0);
    }
  }

  function onYes() {
    const reason = (reasonEl.value || "").trim();
    close();
    resolveFn(reason);
  }

  function onNo() {
    close();
    resolveFn(null);
  }

  function onBackdrop(e) {
    if (e.target === backdrop) onNo();
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      onNo();
      return;
    }

    if (e.key !== "Tab") return;

    const focusables = getFocusable();
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  backdrop.style.display = "flex";

  btnYes.addEventListener("click", onYes);
  btnNo.addEventListener("click", onNo);
  btnX.addEventListener("click", onNo);
  backdrop.addEventListener("click", onBackdrop);
  document.addEventListener("keydown", onKeydown);

  setTimeout(() => reasonEl.focus(), 50);

  return p;
}

async function cancelOrder() {
  const reason = await openSoCancelModal();
  if (reason === null) return;

  const cleanReason = (reason || "").trim();
  if (!cleanReason) {
    showToast("Please enter cancellation reason", "error");
    return;
  }

  const soId = getCurrentSOId();
  if (!soId) {
    showToast("Sales Order ID missing", "error");
    return;
  }

  try {
    const res = await fetch(`/api/sales-orders/${encodeURIComponent(soId)}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: cleanReason,
        cancelled_by: getLoggedInUserName()
      })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showToast(data.message || "Cancel failed", "error");
      return;
    }

    showToast("Order cancelled successfully", "success");

    setTimeout(() => {
      window.location.href = SALES_LIST_URL;
    }, 900);
  } catch (err) {
    console.error("Cancel order failed:", err);
    showToast("Network error while cancelling order", "error");
  }
}

// =========================================
// PREFILL SUPPORT
// =========================================
function getModeFromQuery() {
  const m = (new URLSearchParams(window.location.search).get("mode") || "").toLowerCase();
  return m || "edit";
}

function unwrapSalesOrderResponse(data) {
  if (!data) return null;

  const d1 = data.order || null;
  if (d1 && typeof d1 === "object") return d1;

  const d2 = data.data || null;
  if (d2 && typeof d2 === "object") {
    if (d2.order && typeof d2.order === "object") return d2.order;
    return d2;
  }

  if (typeof data === "object") return data;

  return null;
}

function normalizeSO(raw) {
  const so = raw || {};

  const so_id = so.so_id || so.soId || so.sales_order_id || so.salesOrderId || so.id || "";
  const order_date = so.order_date || so.orderDate || "";
  const order_type = so.order_type || so.orderType || "";
  const sales_rep = so.sales_rep || so.salesRep || "";

  const customer_name = so.customer_name || so.customerName || so.customer || "";
  const customer_id = so.customer_id || so.customerId || "";

  const billing_address = so.billing_address || so.billingAddress || "";
  const shipping_address = so.shipping_address || so.shippingAddress || "";

  const email = so.email || "";
  const phone = so.phone || so.mobile || "";

  const payment_method = so.payment_method || so.paymentMethod || "";
  const currency = so.currency || "INR";
  const due_date = so.due_date || so.dueDate || "";
  const terms = so.terms || so.termsAndConditions || "";

  const shipping_method = so.shipping_method || so.shippingMethod || "";
  const delivery_date = so.delivery_date || so.deliveryDate || so.expected_delivery || so.expectedDelivery || "";
  const tracking_number = so.tracking_number || so.trackingNumber || "";
  const internal_notes = so.internal_notes || so.internalNotes || "";
  const customer_notes = so.customer_notes || so.customerNotes || "";

  let items =
    so.items ||
    so.order_items ||
    so.orderItems ||
    so.lines ||
    so.line_items ||
    so.lineItems ||
    [];

  if (!Array.isArray(items)) items = [];

  items = items.map((it) => {
    const i = it || {};
    return {
      product_id: i.product_id || i.productId || i.sku || i.code || "",
      product_name: i.product_name || i.productName || i.name || "",
      qty: Number(i.qty ?? i.quantity ?? 0) || 0,
      uom: i.uom || i.unit || "Nos",
      tax_pct: Number(i.tax_pct ?? i.taxPct ?? 0) || 0,
      disc_pct: Number(i.disc_pct ?? i.discPct ?? i.discount_pct ?? 0) || 0,
      line_total: Number(i.line_total ?? i.lineTotal ?? i.total ?? 0) || 0
    };
  });

  return {
    ...so,
    so_id,
    order_date,
    order_type,
    sales_rep,
    customer_name,
    customer_id,
    billing_address,
    shipping_address,
    email,
    phone,
    payment_method,
    currency,
    due_date,
    terms,
    shipping_method,
    delivery_date,
    tracking_number,
    internal_notes,
    customer_notes,
    items,
    global_discount: Number(so.global_discount ?? so.globalDiscount ?? 0) || 0,
    shipping_charges: Number(so.shipping_charges ?? so.shippingCharges ?? 0) || 0
  };
}

async function prefillSalesOrderIfEdit() {
  const so_id = getSOIdSafe();
  if (!so_id) return;

  const mode = getModeFromQuery();
  console.log("Sales Order prefill:", so_id, "mode:", mode);

  let data;
  try {
    const res = await fetch(`/api/sales-orders/${encodeURIComponent(so_id)}`, {
      cache: "no-store"
    });
    data = await res.json();
  } catch (e) {
    console.error("Sales Order fetch error:", e);
    showToast("Sales Order fetch failed", "error");
    return;
  }

  const raw = unwrapSalesOrderResponse(data);
  const so = normalizeSO(raw);

  const commentsList = Array.isArray(so.comments)
    ? so.comments.map((c) => ({
        text: c.text || c.comment || c.message || "",
        by: c.by || c.user || c.username || c.author || "Admin",
        at: c.at || c.created_at || c.createdAt || new Date().toISOString()
      }))
    : [];

  const historyList = Array.isArray(so.status_history)
    ? so.status_history.map((h) => ({
        text: h.notes || `Status changed to ${h.status || "-"}`,
        by: h.user || h.by || "Admin",
        at: h.date || h.at || new Date().toISOString()
      }))
    : [];

  window.SO_COMMENTS = [...commentsList, ...historyList].sort(
    (a, b) => new Date(a.at) - new Date(b.at)
  );

  renderComments();
  renderHistory();

  if (!so || !so.so_id) {
    showToast("Sales Order not found", "error");
    return;
  }

  window.__SO_DEBUG = so;
  updateSalesOrderHeaderStatus(so.status);

  setValAny(["salesOrderId", "so_id"], so.so_id);
  setValAny(["orderDate", "order_date"], toDateInputValue(so.order_date));
  setSelectAny(["orderType", "order_type", "orderTypeSelect"], so.order_type);

  setValAny(["salesRep", "sales_rep"], so.sales_rep);
  setTextAny(["salesRepSelected", "sales_rep_selected"], so.sales_rep || "Select Sales Rep");

  setTextAny(
    ["customerSelected", "customer_selected", "customerNameSelected"],
    so.customer_name || "Select Customer"
  );
  setValAny(["customer_id", "customerId"], so.customer_id);
  setValAny(["billingAddress", "billing_address"], so.billing_address);
  setValAny(["shippingAddress", "shipping_address"], so.shipping_address);
  setValAny(["email"], so.email);
  setValAny(["phone"], so.phone);

  setValAny(["paymentMethod", "payment_method", "payment"], so.payment_method);
  setValAny(["currency", "currencySel", "currency_select"], so.currency);
  setValAny(["dueDate", "due_date", "paymentDueDate"], toDateInputValue(so.due_date));
  setValAny(["terms", "termsAndConditions", "tandc"], so.terms);

  setValAny(["shippingMethod", "shipping_method", "shipMethod"], so.shipping_method);
  setValAny(
    ["deliveryDate", "delivery_date", "expectedDelivery", "expected_delivery"],
    toDateInputValue(so.delivery_date)
  );
  setValAny(["trackingNumber", "tracking_number", "trackingNo"], so.tracking_number);
  setValAny(["internalNotes", "internal_notes", "notesInternal"], so.internal_notes);
  setValAny(["customerNotes", "customer_notes", "notesCustomer"], so.customer_notes);

  const trackingInput = elAny("trackingNumber", "tracking_number", "trackingNo");
  if (trackingInput) trackingInput.disabled = false;

  const tbody = document.getElementById("orderItemsBody");
  if (tbody && Array.isArray(so.items)) {
    tbody.innerHTML = "";

    so.items.forEach((item, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="sno">${index + 1}</td>
        <td>
          <div class="so-product-select-wrap">
            <select class="productSelect" onchange="onProductChange(this)">
              ${buildProductOptions()}
            </select>
            <span class="field-error so-product-select-error" aria-live="polite"></span>
          </div>
        </td>
        <td class="prodIdCell">-</td>
        <td>
          <input type="text" class="qtyInput" value="${item.qty || 0}" inputmode="numeric" pattern="[0-9]*" autocomplete="off">
        </td>
        <td class="uomCell">${item.uom || "-"}</td>
        <td class="priceCell">${CURRENCY} ${Number(item.line_total || 0).toFixed(2)}</td>
        <td class="taxCell">${item.tax_pct || 0}</td>
        <td>
          <input type="text" class="discInput" value="${item.disc_pct || 0}" inputmode="numeric" pattern="[0-9]*" autocomplete="off">
        </td>
        <td class="rowTotal">${CURRENCY} ${Number(item.line_total || 0).toFixed(2)}</td>
        <td class="so-action-col">
          <button class="so-delete-btn" type="button" onclick="deleteRow(this)" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `;

      tbody.appendChild(tr);

      const sel = tr.querySelector(".productSelect");
      if (sel) sel.value = item.product_id || "";

      applyProductToRow(tr, item.product_id);

      const qtyEl = tr.querySelector(".qtyInput");
      if (qtyEl) calculateRow(qtyEl);
    });

    updateSerialNumbers();
    refreshProductDropdowns();
  }

  const gd = document.getElementById("globalDiscount");
  if (gd) gd.value = so.global_discount || 0;

  const ship = document.getElementById("shipping");
  if (ship) ship.value = so.shipping_charges || 0;

  calculateTotals();
  paintSalesOrderLineAndSummaryValidation();

  if (mode === "view") {
    // Only lock the sales order form — not layout chrome (topbar search, notifications, profile).
    const soRoot = document.querySelector(".sales-wrapper");
    if (soRoot) {
      soRoot.querySelectorAll("input, select, textarea").forEach((el) => {
        el.disabled = true;
      });

      soRoot.querySelectorAll("button").forEach((btn) => {
        const id = (btn.id || "").toLowerCase();
        const txt = (btn.textContent || "").toLowerCase();

        if (id.includes("cancel") || txt.includes("cancel") || txt.includes("back")) return;
        btn.disabled = true;
      });
    }

    const cd = document.getElementById("customerDropdown");
    const rd = document.getElementById("salesRepDropdown");
    if (cd) cd.style.display = "none";
    if (rd) rd.style.display = "none";
  }

  applySORepCustomerReadonlyUI();
  updateDocumentButtons();
}

// =========================================
// PAGE INIT
// =========================================
document.addEventListener("click", function (e) {
  if (!e.target.closest(".custom-dropdown")) {
    const cust = document.getElementById("customerDropdown");
    const rep = document.getElementById("salesRepDropdown");
    if (cust) cust.style.display = "none";
    if (rep) rep.style.display = "none";
  }
});

document.getElementById("soTabComments")?.addEventListener("click", () => setActiveTab("comments"));
document.getElementById("soTabHistory")?.addEventListener("click", () => setActiveTab("history"));

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Wire early: if later init throws (e.g. row setup), comment UX still works
    (function wireCommentAddButtonSync() {
      const input = document.getElementById("commentInput");
      const sync = () => updateCommentAddButton();
      if (input) {
        ["input", "keyup", "paste", "change"].forEach((ev) =>
          input.addEventListener(ev, sync)
        );
      }
      document.getElementById("soCommentsPanel")?.addEventListener("input", (e) => {
        if (e.target?.id === "commentInput") sync();
      });
      sync();
    })();

    await loadSOProducts();
    fillAllProductSelects();
    refreshProductDropdowns();

    const dueDate = document.getElementById("dueDate");
    const deliveryDate = document.getElementById("deliveryDate");
    const orderDate = document.getElementById("orderDate");

    setMinTodayByEl(dueDate);
    setMinTodayByEl(deliveryDate);

    [orderDate, dueDate, deliveryDate].forEach((field) => {
      if (!field) return;
      attachSOYearClamp(field);
      const refreshDates = () => {
        sanitizeSOYearOverflowInField(field);
        updateSubmitButton();
      };
      field.addEventListener("input", refreshDates);
      field.addEventListener("blur", refreshDates);
      field.addEventListener("change", refreshDates);
    });

    const tracking = document.getElementById("trackingNumber");
    const trackingErr = document.getElementById("trackingError");

    tracking?.addEventListener("input", () => {
      const method = document.getElementById("shippingMethod")?.value || "";
      let v = (tracking.value || "").toUpperCase();
      if (method === "DHL") {
        v = v.replace(/[^A-Z0-9]/g, "");
        if (v.length > 11) v = v.slice(0, 11);
      } else if (method === "FedEx") {
        v = v.replace(/\D/g, "");
        if (v.length > 14) v = v.slice(0, 14);
      } else {
        v = v.replace(/[^A-Z0-9-]/g, "");
        if (v.length > 25) v = v.slice(0, 25);
      }
      tracking.value = v;
      setFieldError(tracking, trackingErr, "");
    });

    tracking?.addEventListener("blur", () => {
      const method = document.getElementById("shippingMethod")?.value || "";
      const v = (tracking.value || "").trim().toUpperCase();
      tracking.value = v;

      const msg = trackingNumberErrorMessage(method, v);
      setFieldError(tracking, trackingErr, msg);
    });

    // Phone number: allow only digits, max length 10
    const phoneInput = document.getElementById("phone");
    if (phoneInput) {
      phoneInput.addEventListener("input", () => {
        let v = phoneInput.value.replace(/\D/g, "");
        if (v.length > 10) v = v.slice(0, 10);
        phoneInput.value = v;
      });
    }

    function attachAlphaNumOnly(inputId, errId) {
      const el = document.getElementById(inputId);
      const err = document.getElementById(errId);
      if (!el || !err) return;

      el.addEventListener("input", () => {
        el.value = (el.value || "").replace(/[^A-Za-z0-9 ]/g, "");
        setFieldError(el, err, "");
      });

      el.addEventListener("blur", () => {
        const v = (el.value || "").trim();
        el.value = v;

        if (v && !/^[A-Za-z0-9 ]+$/.test(v)) {
          setFieldError(el, err, "Special characters are not allowed.");
        } else {
          setFieldError(el, err, "");
        }
      });
    }

    attachAlphaNumOnly("terms", "termsErr");
    attachAlphaNumOnly("internalNotes", "internalNotesErr");
    attachAlphaNumOnly("customerNotes", "customerNotesErr");

    const qp = new URLSearchParams(window.location.search);
    const hasSoInUrl =
      !!(qp.get("so_id") || qp.get("id")) ||
      /SO[-_]\d+/i.test(window.location.pathname);

    if (!hasSoInUrl) {
  const dateInput = document.getElementById("orderDate");
  if (dateInput && !dateInput.value) {
    const today = new Date();
    dateInput.value = today.toISOString().split("T")[0];
  }

  const currencyField = document.getElementById("currency");
  if (currencyField) currencyField.value = "INR";

  const termsField =
    document.getElementById("terms") ||
    document.getElementById("termsAndConditions") ||
    document.getElementById("tandc");

  if (termsField && !termsField.value.trim()) {
    termsField.value = "Goods once sold will not be taken back. Payment due within 15 days.";
  }
}

    const shippingMethod = document.getElementById("shippingMethod");
    const trackingInput = document.getElementById("trackingNumber");

    if (trackingInput) {
      trackingInput.disabled = false;
    }

    if (shippingMethod && trackingInput) {
      shippingMethod.addEventListener("change", function () {
        const method = this.value;

        if (method === "FedEx") {
          trackingInput.placeholder = "Enter 12–14 digits";
        } else if (method === "DHL") {
          trackingInput.placeholder = "Enter 2 letters + 9 digits";
        } else if (method === "UPS") {
          trackingInput.placeholder = "Must start with 1Z";
        } else {
          trackingInput.placeholder = "Enter tracking number";
        }
        updateSubmitButton();
      });
    }

    document.getElementById("globalDiscount")?.addEventListener("input", calculateTotals);
    document.getElementById("shipping")?.addEventListener("input", calculateTotals);

    await prefillSalesOrderIfEdit();

if (!getSOIdSafe()) {
  updateSalesOrderHeaderStatus("");
}

applySORepCustomerReadonlyUI();

updateCancelButton();

    if (!getSOIdSafe()) {
      document.querySelectorAll("#orderItemsBody tr").forEach((row) => {
        const sel = row.querySelector(".productSelect");
        if (sel) applyProductToRow(row, sel.value);

        const qty = row.querySelector(".qtyInput");
        if (qty) calculateRow(qty);
      });
    }

    document.addEventListener("input", updateSubmitButton);
    document.addEventListener("change", updateSubmitButton);

    updateCommentAddButton();
    calculateTotals();
    paintSalesOrderLineAndSummaryValidation();
    updateSubmitButton();
    updateDocumentButtons();
    setActiveTab("comments");
  } catch (e) {
    console.error("Initialization failed:", e);
  }
});









function updateGenerateDnInvoiceButtons() {
  const status = getCurrentSOStatus();

  const allowed = [
    "purchased",
    "submitted",
    "submitted(pa)",
    "submitted (pa)",
    "partially delivered",
    "partially_delivered"
  ];

  const enable = allowed.includes(status);

  const dn = document.getElementById("genDNBtn");
  const inv = document.getElementById("genInvBtn");
  if (dn) dn.disabled = !enable;
  if (inv) inv.disabled = !enable;
}

function generateDeliveryNote() {
  const btn = document.getElementById("genDNBtn");
  if (btn?.disabled) return;

  const soId = getCurrentSOId();

  if (!soId) {
    showToast("Sales Order ID missing", "error");
    return;
  }

  window.location.href = `/delivery_note/new?so_id=${encodeURIComponent(soId)}`;
}