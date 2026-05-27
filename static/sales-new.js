


// =========================================
// GLOBAL USER
// =========================================
window.CURRENT_USER = window.CURRENT_USER || "User";

// =========================================
// SALES ORDER PAGE SCRIPT
// =========================================
const CURRENCY = "₹";
const SALES_LIST_URL = "/sales-order";

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
  if (s === "submitted") return "Submitted";
  if (s === "delivered") return "Delivered";
  if (s === "partially delivered" || s === "partially_delivered") return "Partially Delivered";
  if (s === "cancelled") return "Cancelled";

  return String(status || "").trim();
}

function getSalesStatusBadgeClass(status) {
  const s = String(status || "").trim().toLowerCase();

  if (s === "draft") return "so-head-status so-status-draft";
  if (s === "submitted") return "so-head-status so-status-submitted";
  if (s === "delivered") return "so-head-status so-status-delivered";
  if (s === "partially delivered" || s === "partially_delivered") {
    return "so-head-status so-status-partial";
  }
  if (s === "cancelled") return "so-head-status so-status-cancelled";

  return "so-head-status";
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

function syncSalesOrderPageHeading(pageTitle, status) {
  const heading = document.getElementById("soPageHeading");
  if (heading) heading.textContent = pageTitle || "New Sales Order";

  updateSalesOrderHeaderStatus(status);

  const label = formatSalesStatusText(status);
  document.title = label ? `${pageTitle} - ${label}` : pageTitle;
}

function syncSalesOrderPageHeadingFromMode(status) {
  const soId = getSOIdSafe();
  const mode = getModeFromQuery();
  let pageTitle = "New Sales Order";

  if (soId) {
    pageTitle = mode === "view" ? "View Sales Order" : "Edit Sales Order";
  }

  syncSalesOrderPageHeading(pageTitle, status);
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
  const dd = document.getElementById("salesRepDropdown");
  if (!dd) return;
  dd.style.display = dd.style.display === "block" ? "none" : "block";
}

function selectSalesRep(el) {

  document.querySelectorAll("#salesRepDropdown .dropdown-item")
    .forEach(item => item.classList.remove("active"));


  el.classList.add("active");
  const name = (el.dataset.name || el.textContent || "").trim();
  document.getElementById("salesRepSelected").textContent = name || "Select Sales Rep";
  document.getElementById("salesRep").value = name;
  document.getElementById("salesRepDropdown").style.display = "none";
  runLiveSalesOrderValidation();
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
  document.querySelectorAll("#customerDropdown .dropdown-item")
  .forEach(item => item.classList.remove("active"));

  element.classList.add("active");
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
  document.getElementById("customer_name").value = name;







 // =========================================
// AUTO FILL SALES REP FROM CUSTOMER DATA
// =========================================
const salesRepValue =
  element.getAttribute("data-sales-rep") ||
  element.dataset.salesRep ||
  element.dataset.salesrep ||
  element.dataset.sales_rep ||
  "";

const salesRepInput = document.getElementById("salesRep");
const salesRepSelected = document.getElementById("salesRepSelected");

if (salesRepInput) {
  salesRepInput.value = salesRepValue;
}

if (salesRepSelected) {
  salesRepSelected.textContent = salesRepValue || "Select Sales Rep";
  setFieldError(salesRepSelected, "salesRepErr", "");
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
runLiveSalesOrderValidation();
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
  const err =
    typeof errEl === "string" ? document.getElementById(errEl) : errEl;
  if (!inputEl || !err) return;

  if (msg) {
    inputEl.classList.add("input-invalid");
    err.textContent = msg;
  } else {
    inputEl.classList.remove("input-invalid");
    err.textContent = "";
  }
}

function isSalesOrderFormLocked() {
  const status = getCurrentSOStatus().replace(/\s+/g, "").toLowerCase();
  return [
    "submitted",
    "delivered",
    "partiallydelivered",
    "partially_delivered",
    "cancelled",
  ].includes(status);
}

function soTierOrderDateReady() {
  return !!document.getElementById("orderDate")?.value;
}

function soTierOrderTypeReady() {
  return (
    soTierOrderDateReady() &&
    !!document.getElementById("orderType")?.value?.trim()
  );
}

function soTierCustomerReady() {
  return soTierOrderTypeReady() && isCustomerSelected();
}

function validateOrderDateLive() {
  const el = document.getElementById("orderDate");
  if (!el || isSalesOrderFormLocked()) return;
  if (!el.value) {
    setFieldError(el, "orderDateErr", "Please select order date.");
  } else {
    setFieldError(el, "orderDateErr", "");
  }
}

function validateOrderTypeLive() {
  const el = document.getElementById("orderType");
  if (!el || isSalesOrderFormLocked()) return;
  if (!soTierOrderDateReady()) {
    setFieldError(el, "orderTypeErr", "");
    return;
  }
  if (!el.value?.trim()) {
    setFieldError(el, "orderTypeErr", "Please select order type.");
  } else {
    setFieldError(el, "orderTypeErr", "");
  }
}

function validateCustomerLive() {
  const selected = document.getElementById("customerSelected");
  if (!selected || isSalesOrderFormLocked()) return;
  if (!soTierOrderTypeReady()) {
    setFieldError(selected, "customerErr", "");
    return;
  }
  if (!isCustomerSelected()) {
    setFieldError(selected, "customerErr", "Please select a customer name.");
  } else {
    setFieldError(selected, "customerErr", "");
  }
}

function validateEmailLive() {
  const el = document.getElementById("email");
  if (!el || isSalesOrderFormLocked()) return;
  if (!soTierCustomerReady()) {
    setFieldError(el, "emailErr", "");
    return;
  }
  const v = (el.value || "").trim();
  if (!v) {
    setFieldError(el, "emailErr", "");
    return;
  }
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  setFieldError(el, "emailErr", ok ? "" : "Please enter a valid email address.");
}

function validatePhoneLive() {
  const el = document.getElementById("phone");
  if (!el || isSalesOrderFormLocked()) return;
  if (!soTierCustomerReady()) {
    setFieldError(el, "phoneErr", "");
    return;
  }
  const digits = (el.value || "").replace(/\D/g, "");
  if (!digits) {
    setFieldError(el, "phoneErr", "");
    return;
  }
  if (digits.length !== 10) {
    setFieldError(el, "phoneErr", "Phone number must be 10 digits.");
  } else {
    setFieldError(el, "phoneErr", "");
  }
}

function validatePaymentMethodLive() {
  const el = document.getElementById("paymentMethod");
  if (!el || isSalesOrderFormLocked()) return;
  if (!soTierCustomerReady()) {
    setFieldError(el, "paymentMethodErr", "");
    return;
  }
  if (!el.value?.trim()) {
    setFieldError(el, "paymentMethodErr", "Please select payment method.");
  } else {
    setFieldError(el, "paymentMethodErr", "");
  }
}

function validateShippingMethodLive() {
  const el = document.getElementById("shippingMethod");
  if (!el || isSalesOrderFormLocked()) return;
  if (!soTierCustomerReady()) {
    setFieldError(el, "shippingMethodErr", "");
    return;
  }
  if (!el.value?.trim()) {
    setFieldError(el, "shippingMethodErr", "Please select shipping method.");
  } else {
    setFieldError(el, "shippingMethodErr", "");
  }
}

function validateDueDateLive() {
  const el = document.getElementById("dueDate");
  if (!el || isSalesOrderFormLocked()) return;
  if (!soTierCustomerReady()) {
    setFieldError(el, "dueDateErr", "");
    return;
  }
  if (!el.value) {
    setFieldError(el, "dueDateErr", "Please select due date.");
    return;
  }
  if (isPastDateStr(el.value)) {
    setFieldError(
      el,
      "dueDateErr",
      "Past date is not allowed. Choose today or a future date."
    );
  } else {
    setFieldError(el, "dueDateErr", "");
  }
}

function validateDeliveryDateLive() {
  const el = document.getElementById("deliveryDate");
  const orderDate = document.getElementById("orderDate");
  if (!el || isSalesOrderFormLocked()) return;
  if (!soTierCustomerReady()) {
    setFieldError(el, "deliveryDateErr", "");
    return;
  }
  if (!el.value) {
    setFieldError(el, "deliveryDateErr", "Please select expected delivery.");
    return;
  }
  if (isPastDateStr(el.value)) {
    setFieldError(
      el,
      "deliveryDateErr",
      "Past date is not allowed. Choose today or a future date."
    );
    return;
  }
  if (orderDate?.value && el.value < orderDate.value) {
    setFieldError(
      el,
      "deliveryDateErr",
      "Expected Delivery cannot be earlier than Order Date."
    );
    return;
  }
  setFieldError(el, "deliveryDateErr", "");
}

function validateTermsLive() {
  const el = document.getElementById("terms");
  if (!el || isSalesOrderFormLocked()) return;
  if (!soTierCustomerReady()) {
    setFieldError(el, "termsErr", "");
    return;
  }
  const v = (el.value || "").trim();
  // Allow letters, numbers, spaces, and common punctuation used in T&C text
  if (v && !/^[A-Za-z0-9 .,'\-/&()]+$/.test(v)) {
    setFieldError(el, "termsErr", "Special characters are not allowed.");
  } else {
    setFieldError(el, "termsErr", "");
  }
}

function validateInternalNotesLive() {
  const el = document.getElementById("internalNotes");
  if (!el || isSalesOrderFormLocked()) return;
  if (!soTierCustomerReady()) {
    setFieldError(el, "internalNotesErr", "");
    return;
  }
  const v = (el.value || "").trim();
  if (v && !/^[A-Za-z0-9 ]+$/.test(v)) {
    setFieldError(el, "internalNotesErr", "Special characters are not allowed.");
  } else {
    setFieldError(el, "internalNotesErr", "");
  }
}

function validateCustomerNotesLive() {
  const el = document.getElementById("customerNotes");
  if (!el || isSalesOrderFormLocked()) return;
  if (!soTierCustomerReady()) {
    setFieldError(el, "customerNotesErr", "");
    return;
  }
  const v = (el.value || "").trim();
  if (v && !/^[A-Za-z0-9 ]+$/.test(v)) {
    setFieldError(el, "customerNotesErr", "Special characters are not allowed.");
  } else {
    setFieldError(el, "customerNotesErr", "");
  }
}

function validateTrackingLive() {
  const el = document.getElementById("trackingNumber");
  const shippingMethod = document.getElementById("shippingMethod");
  if (!el || isSalesOrderFormLocked()) return;
  if (!soTierCustomerReady()) {
    setFieldError(el, "trackingError", "");
    return;
  }

  const method = (shippingMethod?.value || "").trim();
  if (!method) {
    setFieldError(el, "trackingError", "");
    return;
  }

  const v = (el.value || "").trim().toUpperCase();
  if (!v) {
    setFieldError(el, "trackingError", "Please enter tracking number.");
    return;
  }

  if (!/^[A-Z0-9-]+$/.test(v)) {
    setFieldError(el, "trackingError", "Only letters, numbers, and hyphen are allowed.");
    return;
  }

  if (!validateTracking(v)) {
    setFieldError(el, "trackingError", "Tracking number must be 6–25 characters.");
    return;
  }

  setFieldError(el, "trackingError", "");
}

function validateItemsLive() {
  if (isSalesOrderFormLocked()) {
    updateProductValidationForAllRows(false);
    return;
  }
  updateProductValidationForAllRows(soTierCustomerReady());
}

function runLiveSalesOrderValidation() {
  if (isSalesOrderFormLocked()) {
    document
      .querySelectorAll(".sales-wrapper .field-error")
      .forEach((el) => {
        el.textContent = "";
      });
    document
      .querySelectorAll(".sales-wrapper .input-invalid")
      .forEach((el) => el.classList.remove("input-invalid"));
    updateProductValidationForAllRows(false);
    return;
  }

  const salesRepSelected = document.getElementById("salesRepSelected");
  if (salesRepSelected) setFieldError(salesRepSelected, "salesRepErr", "");

  validateOrderDateLive();
  validateOrderTypeLive();
  validateCustomerLive();
  validateEmailLive();
  validatePhoneLive();
  validatePaymentMethodLive();
  validateShippingMethodLive();
  validateDueDateLive();
  validateDeliveryDateLive();
  validateTermsLive();
  validateInternalNotesLive();
  validateCustomerNotesLive();
  validateTrackingLive();
  validateItemsLive();
}

function wireSalesOrderLiveValidation() {
  const pairs = [
    ["orderDate", ["change", "blur", "input"]],
    ["orderType", ["change", "blur"]],
    ["email", ["input", "blur"]],
    ["phone", ["input", "blur"]],
    ["paymentMethod", ["change", "blur"]],
    ["shippingMethod", ["change", "blur"]],
    ["dueDate", ["change", "blur", "input"]],
    ["deliveryDate", ["change", "blur", "input"]],
    ["terms", ["input", "blur"]],
    ["internalNotes", ["input", "blur"]],
    ["customerNotes", ["input", "blur"]],
    ["trackingNumber", ["input", "blur"]],
  ];

  pairs.forEach(([id, events]) => {
    const el = document.getElementById(id);
    if (!el) return;
    events.forEach((ev) => {
      el.addEventListener(ev, runLiveSalesOrderValidation);
    });
  });

  document.getElementById("customerSelected")?.addEventListener(
    "click",
    () => setTimeout(runLiveSalesOrderValidation, 0)
  );
}

function setMinTodayByEl(el) {
  if (!el) return;
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  el.min = `${yyyy}-${mm}-${dd}`;
}

function isPastDateStr(yyyy_mm_dd) {
  if (!yyyy_mm_dd) return false;

  const dt = new Date(`${yyyy_mm_dd}T00:00:00`);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  dt.setHours(0, 0, 0, 0);

  return dt < today;
}

function validateTracking(tracking) {
  if (!tracking) return true;

  const general = /^[A-Z0-9-]{6,25}$/;
  return general.test(tracking.toUpperCase());
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

function setProductRowValidation(row, shouldShow) {
  if (!row) return;
  const wrap = row.querySelector(".so-product-select-wrap");
  const sel = row.querySelector("select.productSelect");
  if (!wrap || !sel) return;

  if (shouldShow) {
    wrap.classList.add("show-error");
    sel.classList.add("input-error");
  } else {
    wrap.classList.remove("show-error");
    sel.classList.remove("input-error");
  }
}

function updateProductValidationForAllRows(showForInvalid = false) {
  document.querySelectorAll("#orderItemsBody tr").forEach((row) => {
    const pid = row.querySelector("select.productSelect")?.value?.trim() || "";
    setProductRowValidation(row, showForInvalid && !pid);
  });
}

function applyProductToRow(row, productId) {

  const stockCell = row.querySelector(".stockCell");
  const pidCell = row.querySelector(".prodIdCell");
  const uomCell = row.querySelector(".uomCell");
  const taxCell = row.querySelector(".taxCell");
  const priceCell = row.querySelector(".priceCell");   
  const discInput = row.querySelector(".discInput");

  if (!productId || !window.SO_PRODUCTS_MAP[productId]) {
    if (pidCell) pidCell.textContent = "-";
    if (stockCell) stockCell.textContent = "0";
    if (uomCell) uomCell.textContent = "-";
    if (taxCell) taxCell.textContent = "0";
    row.dataset.taxPct = "0";
    return;
  }

  const p = window.SO_PRODUCTS_MAP[productId];

  const price = Number(p?.unit_price ?? p?.price ?? p?.selling_price ?? 0);
  const pid = String(p.product_id || p.id || p.code || productId);

  const stock = Number(
    p.stock_level ?? p.available_stock ?? p.quantity ?? p.stock ?? p.qty ?? p.opening_stock ?? 0
  );
  const qtyInput = row.querySelector(".qtyInput");

  const uomVal = String(p.uom || p.unit || "Nos");

  let taxPct = Number(p.tax_percent || 0);

  // fallback if tax_percent not available
  if (!taxPct) {
    const m = String(p.tax_code || "").match(/(\d+(?:\.\d+)?)/);
    if (m) taxPct = Number(m[1]) || 0;
  }

  const defaultDisc = Number(p.discount ?? 0);

  if (discInput) {
    discInput.value = defaultDisc;
  }

  if (pidCell) pidCell.textContent = pid;
  if (stockCell) stockCell.textContent = stock;
  if (uomCell) uomCell.textContent = uomVal;
  if (priceCell) priceCell.textContent = `${CURRENCY} ${price.toFixed(2)}`;
  if (taxCell) taxCell.textContent = taxPct;
  if (qtyInput) {
    if (stock > 0) qtyInput.max = String(stock);
    else qtyInput.removeAttribute("max");
  }

  row.dataset.taxPct = String(taxPct);

  const qtyEl = row.querySelector(".qtyInput");
  if (qtyEl) calculateRow(qtyEl);
}
function onProductChange(selectEl) {
  const row = selectEl.closest("tr");
  if (!row) return;

  applyProductToRow(row, selectEl.value);
  setProductRowValidation(row, !selectEl.value);

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
  runLiveSalesOrderValidation();
  updateSubmitButton();
}

function calculateRow(el) {
  const row = el.closest("tr");
  if (!row) return;

  const qtyInput = row.querySelector(".qtyInput");
  const discInput = row.querySelector(".discInput");
  let qty = Number(qtyInput?.value || 0);
  let discPct = Number(discInput?.value || 0);
  const taxPct = Number(row.dataset.taxPct || 0);

  let pid = "";

// support both select & custom dropdown
const sel = row.querySelector("select.productSelect");
if (sel && sel.value) {
  pid = sel.value;
} else {
  pid = row.dataset.productId || "";
}
  const p = pid ? window.SO_PRODUCTS_MAP[pid] : null;
  const price = Number(p?.unit_price ?? p?.price ?? p?.selling_price ?? 0);
  const productName = String(p?.product_name || p?.name || p?.title || "product").trim();
  const stock = Number(
    p?.stock_level ?? p?.available_stock ?? p?.quantity ?? p?.stock ?? p?.qty ?? p?.opening_stock ?? 0
  );

  // Quantity validation: must be >= 1
  if (!Number.isFinite(qty) || qty < 1) {
    qty = 1;
    if (qtyInput) qtyInput.value = "1";
  }

  // If stock is available, prevent quantity from exceeding stock.
  if (stock > 0 && qty > stock) {
    qty = stock;
    if (qtyInput) qtyInput.value = String(stock);
    const stockWarnKey = `stock-${pid}-${stock}`;
    if (row.dataset.stockWarnKey !== stockWarnKey) {
      showToast(`Only ${stock} units available for ${productName}`, "error");
      row.dataset.stockWarnKey = stockWarnKey;
    }
  } else {
    row.dataset.stockWarnKey = "";
  }

  // Discount validation: 0 to 90%
  if (!Number.isFinite(discPct) || discPct < 0) {
    discPct = 0;
    if (discInput) discInput.value = "0";
  } else if (discPct > 90) {
    discPct = 90;
    if (discInput) discInput.value = "90";
    if (row.dataset.discWarned !== "1") {
      showToast("Discount limited to 90%", "error");
      row.dataset.discWarned = "1";
    }
  } else {
    row.dataset.discWarned = "";
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

  calculateTotals();
  runLiveSalesOrderValidation();
  updateSubmitButton();
}

function deleteRow(btn) {
  const row = btn.closest("tr");
  if (!row) return;

  row.remove();
  updateSerialNumbers();
  calculateTotals();
  refreshProductDropdowns();
  runLiveSalesOrderValidation();
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
      <small class="so-product-select-error">Please select product</small>
    </div>
  </td>

  <td class="prodIdCell">-</td>

  <td>
    <input type="number" class="qtyInput" value="1" min="1" oninput="calculateRow(this)">
  </td>

  <td class="uomCell">-</td>

  <td class="priceCell">₹ 0.00</td>

  <td class="taxCell">0</td>

  <td>
    <input type="number" class="discInput" value="0" min="0" oninput="calculateRow(this)">
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
  updateProductValidationForAllRows(true);
  updateSubmitButton();
}

function allItemsValid() {
  const rows = document.querySelectorAll("#orderItemsBody tr");
  if (!rows.length) return false;

  let ok = true;
  rows.forEach((row) => {
    const pid = row.querySelector("select.productSelect")?.value?.trim() || "";
    const qty = Number(row.querySelector(".qtyInput")?.value || 0);
    if (!pid || qty <= 0) ok = false;
  });

  return ok;
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

  // Match quotation behaviour: percentage 0–90 with warning toasts
  if (globalDiscPercent > 90) {
    globalDiscPercent = 90;
    if (globalDiscountInput) globalDiscountInput.value = 90;
    showToast("Global discount limited to 90%", "error");
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
});

// =========================================
// COMMENTS / HISTORY
// =========================================
function getLoggedInUserName() {
  return window.CURRENT_USER || "User";
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

  // Comments tab: latest entry only (full trail stays on History tab).
  const latest = [...window.SO_COMMENTS].sort(
    (a, b) => new Date(b.at || 0) - new Date(a.at || 0)
  )[0];
  if (latest) {
    list.appendChild(buildCommentRow(latest));
  }
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

  const value = input.value.trim();

  btn.disabled = value.length === 0;

  // 🔥 force UI update (important)
  btn.classList.toggle("disabled", value.length === 0);
}

function hasAtLeastOneComment() {
  return Array.isArray(window.SO_COMMENTS) && window.SO_COMMENTS.length > 0;
}
function addComment() {
  const input = document.getElementById("commentInput");
  if (!input || getModeFromQuery() === "view") return;

  const text = (input.value || "").trim();
  if (!text) {
    showToast("Please enter comment", "error");
    return;
  }

  const loggedUser = getLoggedInUserName();

  // Save locally only
  window.SO_COMMENTS.push({
    text: text,
    by: loggedUser,
    at: new Date().toISOString()
  });

  renderComments();
  renderHistory();

  input.value = "";
  updateCommentAddButton();
  updateSubmitButton();

  showToast("Comment added", "success");
}
// =========================================
// FOOTER ACTIONS  
// =========================================
function validateSalesOrder() {
  const customerOk = isCustomerSelected();

  const orderDate = document.getElementById("orderDate")?.value;
  const orderType = document.getElementById("orderType")?.value?.trim();
  const paymentMethod = document.getElementById("paymentMethod")?.value?.trim();
  const shippingMethod = document.getElementById("shippingMethod")?.value?.trim();

  const emailVal = (document.getElementById("email")?.value || "").trim();
  const emailOk =
    !emailVal || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);

  const phoneDigits = (document.getElementById("phone")?.value || "").replace(/\D/g, "");
  const phoneOk = !phoneDigits || phoneDigits.length === 10;

  const dueDate = document.getElementById("dueDate");
  const dueDateOk =
    !!dueDate?.value && !isPastDateStr(dueDate.value);

  const deliveryDate = document.getElementById("deliveryDate");
  const deliveryDateOk =
    !!deliveryDate?.value &&
    !isPastDateStr(deliveryDate.value) &&
    (!orderDate || deliveryDate.value >= orderDate);

  const trackingVal = (
    document.getElementById("trackingNumber")?.value || ""
  ).trim();
  const trackingOk = !shippingMethod || !!trackingVal;

  const itemsOk = allItemsValid();

  const inlineOk = !Array.from(
    document.querySelectorAll(".sales-wrapper .field-error")
  ).some((el) => (el.textContent || "").trim());

  const commentOk = getSOIdSafe() ? true : hasAtLeastOneComment();

  return (
    customerOk &&
    orderDate &&
    orderType &&
    paymentMethod &&
    shippingMethod &&
    emailOk &&
    phoneOk &&
    dueDateOk &&
    deliveryDateOk &&
    trackingOk &&
    itemsOk &&
    inlineOk &&
    commentOk
  );
}


function updateSubmitButton() {
  const submitBtn = document.getElementById("submitBtn");
  if (!submitBtn) return;

  runLiveSalesOrderValidation();

  const status = getCurrentSOStatus()
    .replace(/\s+/g, "")
    .toLowerCase();

  const nonEditableStatuses = [
    "submitted",
    "delivered",
    "partiallydelivered",
    "partially_delivered",
    "cancelled"
  ];

  // 🔥 STATUS FIRST
  if (nonEditableStatuses.includes(status)) {
    submitBtn.disabled = true;
    return;
  }

  // ✅ THEN VALIDATION
  const allOk = validateSalesOrder(); // your existing logic
  submitBtn.disabled = !allOk;
}

  function updateCancelButton() {
  const cancelBtn = document.querySelector(".cancel-order");
  if (!cancelBtn) return;

  const status = getCurrentSOStatus();

  const allowed = [];

  cancelBtn.disabled = !allowed.includes(status);
}

function updateGenerateDNButton() {
  const deliveryBtn = document.getElementById("genDNBtn");
  const invoiceBtn = document.getElementById("genInvBtn");

  if (!deliveryBtn || !invoiceBtn) return;

  const status = getCurrentSOStatus()
    .replace(/\s+/g, "")
    .toLowerCase();

  // Default disable both
  deliveryBtn.disabled = true;
  invoiceBtn.disabled = true;

  // Submitted — DN on, Invoice off
  if (status === "submitted") {
    deliveryBtn.disabled = false;
    return;
  }

  // Partially Delivered — DN on, Invoice off
  if (
    status === "partiallydelivered" ||
    status === "partially_delivered"
  ) {
    deliveryBtn.disabled = false;
    return;
  }

  // Delivered — Invoice on, DN off
  if (status === "delivered") {
    invoiceBtn.disabled = false;
  }
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
    internal_notes: (document.getElementById("internalNotes")?.value ?? "").trim(),
    customer_notes: (document.getElementById("customerNotes")?.value ?? "").trim(),
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
async function saveDraft() {
  runLiveSalesOrderValidation();

  if (!isCustomerSelected()) {
    showToast("Please select a customer name", "error");
    return;
  }

  if (!document.getElementById("orderType")?.value?.trim()) {
    showToast("Please select Order Type", "error");
    return;
  }

  if (!document.getElementById("paymentMethod")?.value?.trim()) {
    showToast("Please select payment method", "error");
    return;
  }

  const dueDateErr = (document.getElementById("dueDateErr")?.textContent || "").trim();
  if (!document.getElementById("dueDate")?.value) {
    showToast("Please select due date", "error");
    return;
  }
  if (dueDateErr) {
    showToast(dueDateErr, "error");
    return;
  }

  if (!document.getElementById("shippingMethod")?.value?.trim()) {
    showToast("Please select Shipping Method", "error");
    return;
  }

  const deliveryDateErr = (document.getElementById("deliveryDateErr")?.textContent || "").trim();
  if (!document.getElementById("deliveryDate")?.value) {
    showToast("Please select Expected Delivery", "error");
    return;
  }
  if (deliveryDateErr) {
    showToast(deliveryDateErr, "error");
    return;
  }

  const trackingErr = (document.getElementById("trackingError")?.textContent || "").trim();
  if (!document.getElementById("trackingNumber")?.value?.trim()) {
    showToast("Please enter Tracking Number", "error");
    return;
  }
  if (trackingErr) {
    showToast(trackingErr, "error");
    return;
  }

  if (!allItemsValid()) {
    updateProductValidationForAllRows(true);
    showToast("Please select product", "error");
    return;
  }

  const payload = collectSalesOrderPayload();

  console.log("PAYLOAD:", payload);

  try {
    // STEP 1: Save draft
    const res = await fetch("/api/sales-orders/save-draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      data = {};
    }

    if (!res.ok || !data.success) {
      throw new Error(data.message || data.error || "Unable to save draft");
    }

    const so_id = payload.so_id || data.so_id;

    // STEP 2: Save comments
    for (const c of window.SO_COMMENTS) {
      const cRes = await fetch(`/api/sales-orders/${so_id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          comment: c.text,
          user: c.by
        })
      });
      if (!cRes.ok) {
        console.warn("Comment save skipped for draft:", await cRes.text());
      }
    }

    // Clear local temp comments after DB save
    window.SO_COMMENTS = [];

    localStorage.setItem("salesOrderDraftSuccess", "1");
    window.location.href = SALES_LIST_URL;

  } catch (err) {
    console.error(err);
    showToast(err.message || "Unable to save draft", "error");
  }
}


async function submitOrder() {
  const btn = document.getElementById("submitBtn");
  btn.disabled = true;

  const payload = collectSalesOrderPayload();
  payload.status = "Submitted";

  try {
    const res = await fetch("/api/sales-orders/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      console.warn("JSON parse issue");
    }

    if (!res.ok || data.success === false) {
      throw new Error(data.message || data.error || "Submit failed");
    }

    const so_id = payload.so_id || data.so_id;

    for (const c of window.SO_COMMENTS) {
      await fetch(`/api/sales-orders/${so_id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: c.text,
          user: c.by
        })
      });
    }

    window.SO_COMMENTS = [];

    const qp = new URLSearchParams(window.location.search);
    const isEdit =
      !!getSOIdSafe() ||
      (qp.get("mode") || "").toLowerCase() === "edit";
    localStorage.setItem("salesOrderSuccess", isEdit ? "updated" : "added");

    window.location.href = SALES_LIST_URL;

  } catch (err) {
    console.error(err);
    showToast("Submit failed", "error");
    btn.disabled = false;
  }
}
// =========================================
// PDF / EMAIL ACTIONS 
// =========================================
function canEnablePdf(status) {
  const s = String(status || "").trim().toLowerCase().replace(/\s+/g, "");
  
  // Enabled for: Submitted, Partially Delivered, Delivered
  return [
    "submitted",
    "partiallydelivered",
    "delivered"
  ].includes(s);
}

function canEnableEmail(status) {
  const s = String(status || "").trim().toLowerCase().replace(/\s+/g, "");
  
  // Enabled for: Submitted, Partially Delivered, Delivered
  // Email is NOT enabled for Draft and Cancelled
  return [
    "submitted",
    "partiallydelivered",
    "delivered"
  ].includes(s);
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
  syncSalesOrderPageHeadingFromMode();
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
//    // ❌ Sales Order ID lock
//   const soIdEl = document.getElementById("salesOrderId");
//   if (soIdEl) {
//     soIdEl.readOnly = true;
//     soIdEl.style.pointerEvents = "none";
//   }

//   // ❌ Order Date lock
//   const orderDateEl = document.getElementById("orderDate");
//   if (orderDateEl) {
//     orderDateEl.readOnly = true;
//     orderDateEl.style.pointerEvents = "none";
//   }

//   // ❌ Customer lock
//   const customerSelected = document.getElementById("customerSelected");
//   const customerDropdown = document.getElementById("customerDropdown");
//   const customerSearch = document.getElementById("customerSearch");

//   if (customerSelected) {
//     customerSelected.style.pointerEvents = "none";
//   }

//   if (customerDropdown) {
//     customerDropdown.style.display = "none";
//     customerDropdown.style.pointerEvents = "none";
//   }

//   if (customerSearch) {
//     customerSearch.disabled = true;
//   }
// }

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
    const generatePOBtn = document.getElementById("generatePOBtn");
    if (generatePOBtn) generatePOBtn.disabled = true;
    return;
  }

  window.__SO_DEBUG = so;
  syncSalesOrderPageHeadingFromMode(so.status);

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
  console.log("DEBUG NOTES:", so.internal_notes, so.customer_notes);
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
          <select class="productSelect" onchange="onProductChange(this)">
            ${buildProductOptions()}
          </select>
        </td>
        <td class="prodIdCell">-</td>
        <td>
          <input type="number" class="qtyInput" value="${item.qty || 0}" min="1" oninput="calculateRow(this)">
        </td>
        <td class="uomCell">${item.uom || "-"}</td>
        <td class="priceCell">${CURRENCY} ${Number(item.line_total || 0).toFixed(2)}</td>
        <td class="taxCell">${item.tax_pct || 0}</td>
        <td>
          <input type="number" class="discInput" value="${item.disc_pct || 0}" min="0" oninput="calculateRow(this)">
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

// =====================================
// 🔥 STATUS BASED BUTTON CONTROL
// =====================================

const statusForButtons = getCurrentSOStatus()
  .replace(/\s+/g, "")
  .toLowerCase();

// Get all buttons
const saveDraftBtn = document.querySelector('button[onclick="saveDraft()"]');
const submitBtn = document.getElementById("submitBtn");
const generatePOBtn = document.getElementById("generatePOBtn");
const cancelOrderBtn = document.querySelector('.cancel-order') || document.querySelector('button[onclick*="cancelOrder"]');

// ===============================
// 🟡 DRAFT STATUS
// ===============================
if (statusForButtons === "draft") {
  if (saveDraftBtn) saveDraftBtn.disabled = false;
  if (submitBtn) submitBtn.disabled = false;
  if (generatePOBtn) generatePOBtn.disabled = true;
  if (cancelOrderBtn) cancelOrderBtn.disabled = true;
}

// ===============================
// 🔵 SUBMITTED STATUS
// ===============================
else if (statusForButtons === "submitted") {
  if (saveDraftBtn) saveDraftBtn.disabled = true;
  if (submitBtn) submitBtn.disabled = true;
  if (generatePOBtn) generatePOBtn.disabled = true;
  if (cancelOrderBtn) cancelOrderBtn.disabled = true;
}

// ===============================
// 🟢 DELIVERED STATUS
// ===============================
else if (statusForButtons === "delivered") {
  if (saveDraftBtn) saveDraftBtn.disabled = true;
  if (submitBtn) submitBtn.disabled = true;
  if (generatePOBtn) generatePOBtn.disabled = true;
  if (cancelOrderBtn) cancelOrderBtn.disabled = true;
}

// ===============================
// 🟠 PARTIALLY DELIVERED STATUS
// ===============================
else if (statusForButtons === "partiallydelivered" || statusForButtons === "partially delivered" || statusForButtons === "partially_delivered") {
  if (saveDraftBtn) saveDraftBtn.disabled = true;
  if (submitBtn) submitBtn.disabled = true;
  if (generatePOBtn) generatePOBtn.disabled = true;
  if (cancelOrderBtn) cancelOrderBtn.disabled = true;
}

// ===============================
// 🔴 CANCELLED STATUS
// ===============================
else if (statusForButtons === "cancelled") {
  if (saveDraftBtn) saveDraftBtn.disabled = true;  // ✅ Disabled for Cancelled
  if (submitBtn) submitBtn.disabled = true;  // ✅ Disabled for Cancelled
  if (generatePOBtn) generatePOBtn.disabled = true;  // ✅ Disabled for Cancelled
  if (cancelOrderBtn) cancelOrderBtn.disabled = true;  // ✅ Disabled for Cancelled
}

// ===============================
// ALL OTHER STATUS
// ===============================
else {
  if (saveDraftBtn) saveDraftBtn.disabled = true;
  if (submitBtn) submitBtn.disabled = true;
  if (generatePOBtn) generatePOBtn.disabled = true;
  if (cancelOrderBtn) cancelOrderBtn.disabled = true;
}

if (mode === "edit") {

  // ❌ LOCK THESE FIELDS IN EDIT MODE (Customer & Sales Rep are non-editable)

  // SO ID (always readonly)
  const soId = document.getElementById("salesOrderId");
  if (soId) soId.readOnly = true;

  // Customer Name (dropdown + selected) - NON-EDITABLE IN EDIT MODE
  const customerDropdown = document.getElementById("customerDropdown");
  const customerSelected = document.getElementById("customerSelected");

  if (customerDropdown) customerDropdown.style.display = "none";
  if (customerSelected) customerSelected.style.pointerEvents = "none";

  // Sales Rep (NON-EDITABLE IN EDIT MODE)
  const salesRepDropdown = document.getElementById("salesRepDropdown");
  const salesRepSelected = document.getElementById("salesRepSelected");

  if (salesRepDropdown) salesRepDropdown.style.display = "none";
  if (salesRepSelected) salesRepSelected.style.pointerEvents = "none";

  // Customer Information (NON-EDITABLE IN EDIT MODE)
  const customer_id = document.getElementById("customer_id");
  const billing = document.getElementById("billingAddress");
  const shipping = document.getElementById("shippingAddress");
  const email = document.getElementById("email");
  const phone = document.getElementById("phone");

  if (customer_id) customer_id.readOnly = true;
  if (billing) billing.readOnly = true;
  if (shipping) shipping.readOnly = true;
  if (email) email.readOnly = true;
  if (phone) phone.readOnly = true;

} else if (mode === "view") {

  // ✅ MAKE ALL FIELDS READONLY FOR VIEW MODE

  // Basic Details
  const soId = document.getElementById("salesOrderId");
  const orderDate = document.getElementById("orderDate");
  const orderType = document.getElementById("orderType");
  const paymentMethod = document.getElementById("paymentMethod");
  const currency = document.getElementById("currency");

  if (soId) soId.readOnly = true;
  if (orderDate) orderDate.readOnly = true;
  if (orderType) orderType.disabled = true;
  if (paymentMethod) paymentMethod.disabled = true;
  if (currency) currency.readOnly = true;

  // Customer Information
  const customerDropdown = document.getElementById("customerDropdown");
  const customerSelected = document.getElementById("customerSelected");
  const customerId = document.getElementById("customer_id");
  const billing = document.getElementById("billingAddress");
  const shippingAddress = document.getElementById("shippingAddress");
  const email = document.getElementById("email");
  const phone = document.getElementById("phone");

  if (customerDropdown) customerDropdown.style.display = "none";
  if (customerSelected) customerSelected.style.pointerEvents = "none";
  if (customerId) customerId.readOnly = true;
  if (billing) billing.readOnly = true;
  if (shippingAddress) shippingAddress.readOnly = true;
  if (email) email.readOnly = true;
  if (phone) phone.readOnly = true;

  // Sales Rep
  const salesRepDropdown = document.getElementById("salesRepDropdown");
  const salesRepSelected = document.getElementById("salesRepSelected");

  if (salesRepDropdown) salesRepDropdown.style.display = "none";
  if (salesRepSelected) salesRepSelected.style.pointerEvents = "none";

  // Payment Details
  const dueDate = document.getElementById("dueDate");
  const terms = document.getElementById("terms");

  if (dueDate) dueDate.readOnly = true;
  if (terms) terms.readOnly = true;

  // Logistics & Notes
  const shippingMethod = document.getElementById("shippingMethod");
  const deliveryDate = document.getElementById("deliveryDate");
  const trackingNumber = document.getElementById("trackingNumber");
  const internalNotes = document.getElementById("internalNotes");
  const customerNotes = document.getElementById("customerNotes");

  if (shippingMethod) shippingMethod.disabled = true;
  if (deliveryDate) deliveryDate.readOnly = true;
  if (trackingNumber) trackingNumber.readOnly = true;
  if (internalNotes) internalNotes.readOnly = true;
  if (customerNotes) customerNotes.readOnly = true;

  // Order Items (disable all product inputs)
  document.querySelectorAll("#orderItemsBody tr").forEach((row) => {
    const productSelect = row.querySelector("select.productSelect");
    const qtyInput = row.querySelector(".qtyInput");
    const discInput = row.querySelector(".discInput");
    const deleteBtn = row.querySelector(".so-delete-btn");

    if (productSelect) productSelect.disabled = true;
    if (qtyInput) qtyInput.readOnly = true;
    if (discInput) discInput.readOnly = true;
    if (deleteBtn) deleteBtn.disabled = true;
  });

  // Global Discount & Shipping Charges
  const globalDiscount = document.getElementById("globalDiscount");
  const shippingCharges = document.getElementById("shipping");

  if (globalDiscount) globalDiscount.readOnly = true;
  if (shippingCharges) shippingCharges.readOnly = true;

  // Disable add row button
  const addRowBtn = document.querySelector(".so-add-row-btn") || document.querySelector("button[onclick*='addRow']");
  if (addRowBtn) addRowBtn.disabled = true;

  if (saveDraftBtn) saveDraftBtn.disabled = true;
  if (submitBtn) submitBtn.disabled = true;
  if (generatePOBtn) generatePOBtn.disabled = true;
  if (cancelOrderBtn) cancelOrderBtn.disabled = true;

  const commentInput = document.getElementById("commentInput");
  if (commentInput) {
    commentInput.readOnly = true;
    commentInput.disabled = true;
    commentInput.placeholder = "";
  }
  const commentAddBtn = document.getElementById("commentAddBtn");
  if (commentAddBtn) {
    commentAddBtn.disabled = true;
    commentAddBtn.style.display = "none";
  }
}

  updateGenerateDNButton();

}


// =====================================
// 🔥 PDF & EMAIL CONTROL
// =====================================

const statusForDocs = getCurrentSOStatus()
  .replace(/\s+/g, "")
  .toLowerCase();

const pdfBtn = document.getElementById("pdfBtn");
const emailBtn = document.getElementById("emailBtn");

// Default: disable both
if (pdfBtn) pdfBtn.disabled = true;
if (emailBtn) emailBtn.disabled = true;

// Enable only for: Submitted, Partially Delivered, Delivered
const allowStatusesForPdfEmail = [
  "submitted",
  "partiallydelivered",
  "delivered"
];

if (allowStatusesForPdfEmail.includes(statusForDocs)) {
  if (pdfBtn) pdfBtn.disabled = false;
  if (emailBtn) emailBtn.disabled = false;
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
    await loadSOProducts();
    fillAllProductSelects();
    refreshProductDropdowns();
    // Show validation for any row where product is not selected.
    updateProductValidationForAllRows(true);

    const dueDate = document.getElementById("dueDate");
    const deliveryDate = document.getElementById("deliveryDate");
    const orderDate = document.getElementById("orderDate");

    const dueDateErr = document.getElementById("dueDateErr");
    const deliveryDateErr = document.getElementById("deliveryDateErr");

    setMinTodayByEl(dueDate);
    setMinTodayByEl(deliveryDate);

    wireSalesOrderLiveValidation();

    const tracking = document.getElementById("trackingNumber");
    tracking?.addEventListener("input", () => {
      let v = (tracking.value || "").toUpperCase();
      v = v.replace(/[^A-Z0-9-]/g, "");
      if (v.length > 25) v = v.slice(0, 25);
      tracking.value = v;
      runLiveSalesOrderValidation();
    });

    const phoneInput = document.getElementById("phone");
    if (phoneInput) {
      phoneInput.addEventListener("input", () => {
        let v = phoneInput.value.replace(/\D/g, "");
        if (v.length > 10) v = v.slice(0, 10);
        phoneInput.value = v;
      });
    }

    const termsEl = document.getElementById("terms");
    if (termsEl) {
      termsEl.addEventListener("input", () => {
        termsEl.value = (termsEl.value || "").replace(/[^A-Za-z0-9 .,'\-/&()]/g, "");
      });
      termsEl.addEventListener("blur", () => {
        termsEl.value = (termsEl.value || "").trim();
      });
    }

    ["internalNotes", "customerNotes"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", () => {
        el.value = (el.value || "").replace(/[^A-Za-z0-9 ]/g, "");
      });
      el.addEventListener("blur", () => {
        el.value = (el.value || "").trim();
      });
    });

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
      shippingMethod.addEventListener("change", runLiveSalesOrderValidation);
    }

    document.getElementById("globalDiscount")?.addEventListener("input", calculateTotals);
    document.getElementById("shipping")?.addEventListener("input", calculateTotals);

    if (getSOIdSafe()) {
      syncSalesOrderPageHeadingFromMode();
    }

    await prefillSalesOrderIfEdit();

    if (!getSOIdSafe()) {
      syncSalesOrderPageHeading("New Sales Order", "");
    }

    if (!window.__SO_DEBUG) {
      const generatePOBtn = document.getElementById("generatePOBtn");
      if (generatePOBtn) generatePOBtn.disabled = true;
    }

updateCancelButton();
updateGenerateDNButton();

    if (!getSOIdSafe()) {
      document.querySelectorAll("#orderItemsBody tr").forEach((row) => {
        const sel = row.querySelector(".productSelect");
        if (sel) applyProductToRow(row, sel.value);

        const qty = row.querySelector(".qtyInput");
        if (qty) calculateRow(qty);
      });
    }

    const commentInput = document.getElementById("commentInput");
    if (commentInput) {
      commentInput.addEventListener("input", updateCommentAddButton);
    }
    commentInput?.addEventListener("input", updateCommentAddButton);

    document.addEventListener("input", updateSubmitButton);
    document.addEventListener("change", updateSubmitButton);

    updateCommentAddButton();
    calculateTotals();
    runLiveSalesOrderValidation();
    updateSubmitButton();
    updateDocumentButtons();
    setActiveTab("comments");
  } catch (e) {
    console.error("Initialization failed:", e);
  }
});







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


function loadItems(items) {
  const tbody = document.getElementById("orderItemsBody");
  tbody.innerHTML = "";

  items.forEach(item => {
    addItem();

    const row = tbody.lastElementChild;

    row.querySelector(".productSelect").value = item.product_id;
    applyProductToRow(row, item.product_id);

    row.querySelector(".qtyInput").value = item.qty;
    row.querySelector(".discInput").value = item.discount;

    calculateRow(row.querySelector(".qtyInput"));
  });
}

function setFormReadOnly() {
  const inputs = document.querySelectorAll("input, textarea, select");

  inputs.forEach(el => {
    el.setAttribute("readonly", true);
    el.setAttribute("disabled", true);
  });

  // hide buttons
  document.querySelectorAll("button").forEach(btn => {
    const text = btn.innerText.toLowerCase();

    if (
      text.includes("save") ||
      text.includes("submit") ||
      text.includes("add")
    ) {
      btn.style.display = "none";
    }
  });
}

document.getElementById("submitBtn")?.addEventListener("click", () => {
  submitOrder();
});

function openDropdown(input) {
  const list = input.nextElementSibling;
  if (!list) return;

  list.innerHTML = buildProductList("");
  list.style.display = "block";
}

function searchProduct(input) {
  const query = input.value.toLowerCase();
  const list = input.nextElementSibling;

  if (!list) return;

  list.innerHTML = buildProductList(query);
  list.style.display = "block";
}

function buildProductList(search = "") {
  if (!window.SO_PRODUCTS || !window.SO_PRODUCTS.length) {
    return `<div class="dropdown-item">No Products</div>`;
  }

  return window.SO_PRODUCTS
    .filter(p => {
      const name = (p.product_name || "").toLowerCase();
      const id = (p.product_id || "").toLowerCase();
      return name.includes(search) || id.includes(search);
    })
    .map(p => {
      const name = p.product_name || "Unnamed";
      const id = p.product_id || "";

      return `
        <div class="dropdown-item"
             onclick="selectProduct(this, '${id}', '${name}')">
          ${name} (${id})
        </div>
      `;
    })
    .join("");
}

function selectProduct(el, productId, productName) {
  const row = el.closest("tr");
  const input = row.querySelector(".productInput");
  const list = el.parentElement;

  if (input) input.value = productName;
  if (list) list.style.display = "none";
  row.dataset.productId = productId;

  // existing logic reuse
  applyProductToRow(row, productId);
}