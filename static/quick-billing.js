document.addEventListener("DOMContentLoaded", () => {
  const DELETED_KEY = "qb_deleted_items";
  const RESTORE_KEY = "qb_restore_request";

  function getDeletedItems() {
    try {
      return JSON.parse(localStorage.getItem(DELETED_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function setDeletedItems(items) {
    localStorage.setItem(DELETED_KEY, JSON.stringify(items));
  }

  function dismissBanner() {
    const existing = document.querySelector(".success-notification, .error-notification");
    if (existing) existing.remove();
  }

  function showSuccessNotification(message, durationMs = 2500) {
    dismissBanner();
    const notification = document.createElement("div");
    notification.className = "success-notification";
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add("show"), 10);
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode) notification.parentNode.removeChild(notification);
      }, 400);
    }, durationMs);
  }

  const QB = {
    DELETED_KEY,
    RESTORE_KEY,
    getDeletedItems,
    setDeletedItems,
    showSuccessNotification,
  };

  /* =========================================================
     1) ELEMENTS
  ========================================================= */

  // Scan input
  const scanInput = document.getElementById("scanInput");
  const scanIcon  = document.getElementById("scanIconBtn");

  // Billing table
  const tbody     = document.getElementById("billingTableBody");
  const noDataRow = document.getElementById("noDataRow");

  // Table pagination (10 rows per page — same as other list pages)
  const QB_ROWS_PER_PAGE = 10;
  let qbCurrentPage = 1;
  const qbShowingText = document.getElementById("qbShowingText");
  const qbPrevBtn     = document.getElementById("qbPrevBtn");
  const qbNextBtn     = document.getElementById("qbNextBtn");
  const qbPageNow     = document.getElementById("qbPageNow");
  const qbPageTotal   = document.getElementById("qbPageTotal");

  // Product pickers (select dropdowns — same as category / payment)
  const productCodeInput  = document.getElementById("productCodeInput");
  const productNameInput  = document.getElementById("productNameInput");

  // Filters
  const categoryFilter = document.getElementById("categoryFilter");
  const qbActionSelect = document.getElementById("qbActionSelect");
  const paymentMode    = document.getElementById("paymentMode");
  const qbDiscountModal = document.getElementById("qbDiscountModal");
  const qbDiscountInput = document.getElementById("qbDiscountInput");
  const qbDiscountApply = document.getElementById("qbDiscountApply");
  const qbDiscountCancel = document.getElementById("qbDiscountCancel");

  let qbDiscountTargetRow = null;
  const clearFilterBtn = document.getElementById("clearFilterBtn");

  // Buttons
  const printBtn   = document.getElementById("printBtn");

  // Print area
  const printArea  = document.getElementById("printArea");

  // Toast
  const qbToast    = document.getElementById("qbToast");
  const qbToastMsg = document.getElementById("qbToastMsg");
  let toastTimer = null;

  // Camera modal
  const cameraModal    = document.getElementById("cameraScannerModal");
  const cameraCloseBtn = document.getElementById("cameraCloseBtn");

 


  // Track last add source (manual vs scan)
  let __QB_LAST_ADD_SOURCE = "manual"; // "manual" | "scan"

  // Selected table row (Ctrl+I remove, quick actions)
  let selectedRow = null;

  /* =========================================================
     2) STORAGE KEYS + BASIC HELPERS
  ========================================================= */

  const CART_KEY  = "qb_cart_items";
  const MULTI_KEY = "qb_payment_detail";

  const num   = (v) => Number(v || 0);
  const money = (v) => num(v).toFixed(2);

  function showToast(message, type = "error") {
  // ✅ If toast HTML missing, fallback to alert
  if (!qbToast || !qbToastMsg) { 
    alert(message); 
    return; 
  }

  qbToastMsg.textContent = message;
  qbToast.classList.remove("error", "success", "show");
  qbToast.classList.add(type, "show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => qbToast.classList.remove("show"), 2500);
}

  function parseGstPercent(taxCode) {
    const m = String(taxCode || "").match(/(\d+(\.\d+)?)\s*%/);
    return m ? Number(m[1]) : 0;
  }

  function calc(qty, unitPrice, discountPercent, cgstRate, sgstRate) {
    const discountAmt = unitPrice * (discountPercent / 100);
    const selling     = Math.max(unitPrice - discountAmt, 0);
    const taxable     = selling * qty;
    const cgstAmt     = taxable * (cgstRate / 100);
    const sgstAmt     = taxable * (sgstRate / 100);
    const total       = taxable + cgstAmt + sgstAmt;

    return { taxable, cgstAmt, sgstAmt, total, discountAmt, selling };
  }

  function pickCode(p) {
    return String(
      p.product_id ??
      p.product_code ??
      p.code ??
      p.sku ??
      p.id ??
      ""
    ).trim().toUpperCase();
  }

  function pickName(p) {
    return String(
      p.product_name ??
      p.name ??
      p.item_name ??
      p.product ??
      ""
    ).trim();
  }

  /* =========================================================
     3) CART STORAGE
  ========================================================= */

  function saveCartToStorage() {
    if (!tbody) return;

    const rows = tbody.querySelectorAll("tr.data-row");
    const cart = Array.from(rows).map(row => ({
      code: row.dataset.code,
      qty: Number(row.querySelector(".qty-input")?.value || 1)
    }));

    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function loadCartFromStorage() {
    let cart = [];
    try { cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]"); }
    catch { cart = []; }
    return Array.isArray(cart) ? cart : [];
  }

  /* =========================================================
     5) SCAN UI HELPER
  ========================================================= */

  function showBarcodeInInput(barcode) {
    barcode = String(barcode || "").trim();
    if (!barcode) return;

    // Note: This re-fetches scanInput again; keeping as-is (no behavior change).
    const scanInput = document.getElementById("scanInput");
    if (!scanInput) return;

    // Show barcode number
    scanInput.value = barcode;

    // Trigger input listeners (if any)
    scanInput.dispatchEvent(new Event("input", { bubbles: true }));

    // Small flash effect
    scanInput.classList.add("scan-flash");
    setTimeout(() => scanInput.classList.remove("scan-flash"), 250);
  }

  /* =========================================================
     6) TABLE UI HELPERS
  ========================================================= */

  function getDataRowCount() {
    return tbody ? tbody.querySelectorAll("tr.data-row").length : 0;
  }

  function getAllDataRows() {
    return tbody ? [...tbody.querySelectorAll("tr.data-row")] : [];
  }

  function qbTotalPages() {
    const n = getDataRowCount();
    return Math.max(1, Math.ceil(n / QB_ROWS_PER_PAGE));
  }

  function updateSerialNumbers() {
    if (!tbody) return;

    getAllDataRows().forEach((row, index) => {
      const snoCell = row.querySelector(".col-sno");
      if (snoCell) snoCell.textContent = String(index + 1);
    });
  }

  function updateQbPagerUI() {
    const tp = qbTotalPages();
    const total = getDataRowCount();

    if (qbPrevBtn) qbPrevBtn.disabled = qbCurrentPage <= 1 || total === 0;
    if (qbNextBtn) qbNextBtn.disabled = qbCurrentPage >= tp || total === 0;
    if (qbPageNow) qbPageNow.textContent = String(qbCurrentPage);
    if (qbPageTotal) qbPageTotal.textContent = String(tp);
  }

  function updateQbShowing() {
    if (!qbShowingText) return;

    const total = getDataRowCount();
    if (!total) {
      qbShowingText.textContent = "Showing 0 Entries";
      return;
    }

    const start = (qbCurrentPage - 1) * QB_ROWS_PER_PAGE + 1;
    const end = Math.min(qbCurrentPage * QB_ROWS_PER_PAGE, total);
    qbShowingText.textContent = `Showing ${start}-${end} of ${total} Entries`;
  }

  function applyTablePagination(opts = {}) {
    const rows = getAllDataRows();
    const total = rows.length;
    const tp = qbTotalPages();

    if (opts.resetPage) qbCurrentPage = 1;
    if (opts.goLastPage) qbCurrentPage = tp;
    qbCurrentPage = Math.min(Math.max(1, qbCurrentPage), tp);

    const start = (qbCurrentPage - 1) * QB_ROWS_PER_PAGE;
    const end = start + QB_ROWS_PER_PAGE;

    rows.forEach((row, i) => {
      const onPage = i >= start && i < end;
      row.classList.toggle("qb-page-hidden", !onPage);
      row.style.display = onPage ? "" : "none";
    });

    updateNoDataRow();
    updateSerialNumbers();
    updateQbPagerUI();
    updateQbShowing();
  }

  function updateNoDataRow() {
    if (!noDataRow) return;

    const hasRows = getDataRowCount() > 0;
    noDataRow.style.display = hasRows ? "none" : "";
  }

  /* =========================================================
     7) DUPLICATE HANDLING (IN-TABLE)
  ========================================================= */

  function bumpIfExists(code, opts = {}) {
    if (!tbody) return false;

    const row = tbody.querySelector(`tr.data-row[data-code="${code}"]`);
    if (!row) return false;

    const rows = getAllDataRows();
    const rowIndex = rows.indexOf(row);
    if (rowIndex !== -1) {
      qbCurrentPage = Math.floor(rowIndex / QB_ROWS_PER_PAGE) + 1;
      applyTablePagination();
      selectRow(row);
    }

    const qtyInput = row.querySelector(".qty-input");
    if (!qtyInput) return true;

    if (opts.onlyCheck) {
      qtyInput.focus();
      qtyInput.select?.();
      window.__QB_LAST_QTY_INPUT = qtyInput;
      return true;
    }

    qtyInput.value = String((parseInt(qtyInput.value || "1", 10) || 1) + 1);
    qtyInput.dispatchEvent(new Event("input"));

    qtyInput.focus();
    qtyInput.select?.();
    window.__QB_LAST_QTY_INPUT = qtyInput;

    return true;
  }

  /* =========================================================
     8) MINI SUMMARY (TFOOT)
  ========================================================= */

  const sumTaxableEl   = document.getElementById("sumTaxableFoot");
  const sumTaxEl       = document.getElementById("sumTaxFoot");
  const sumTotalAmtEl  = document.getElementById("sumTotalAmtFoot");
  const sumInvoiceEl   = document.getElementById("sumInvoiceFoot");
  const sumRoundOffEl  = document.getElementById("sumRoundOffFoot");

  function applyRoundOff(totalAmount) {
    const rounded  = Math.round(totalAmount);
    const roundOff = +(rounded - totalAmount).toFixed(2);

    return {
      roundedAmount: rounded.toFixed(2),
      roundOffValue: roundOff.toFixed(2)
    };
  }

  function readMoneyText(text) {
    const t = String(text || "").replace(/[₹,\s]/g, "");
    const n = parseFloat(t);
    return isNaN(n) ? 0 : n;
  }

  function getCellValue(row, className, tdIndexFallback) {
    const byClass = row.querySelector(className);
    if (byClass) return readMoneyText(byClass.textContent);

    const tds = row.querySelectorAll("td");
    if (tds[tdIndexFallback]) return readMoneyText(tds[tdIndexFallback].textContent);

    return 0;
  }

  function updateMiniSummary() {
    if (!tbody) return;

    const rows = tbody.querySelectorAll("tr");
    let taxableSum = 0, cgstSum = 0, sgstSum = 0, invoiceSum = 0;

    rows.forEach((row) => {
      if (row.id === "noDataRow" || row.classList.contains("no-data-row")) return;

      taxableSum += getCellValue(row, ".col-taxable", 6);
      cgstSum    += getCellValue(row, ".col-cgst",    7);
      sgstSum    += getCellValue(row, ".col-sgst",    8);
      invoiceSum += getCellValue(row, ".col-total",   9);
    });

    const totalTax    = cgstSum + sgstSum;
    const totalAmount = invoiceSum;
    const r = applyRoundOff(totalAmount);

    const fmt = (n) => Number(n).toFixed(2);

    if (sumTaxableEl)  sumTaxableEl.textContent  = fmt(taxableSum);
    if (sumTaxEl)      sumTaxEl.textContent      = fmt(totalTax);
    if (sumTotalAmtEl) sumTotalAmtEl.textContent = fmt(totalAmount);
    if (sumRoundOffEl) sumRoundOffEl.textContent = r.roundOffValue;
    if (sumInvoiceEl)  sumInvoiceEl.textContent  = r.roundedAmount;

    const cardMap = [
      ["sumTaxableCard", taxableSum],
      ["sumTaxCard", totalTax],
      ["sumTotalAmtCard", totalAmount],
      ["sumRoundOffCard", r.roundOffValue],
    ];
    cardMap.forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = fmt(val);
    });

    qbUpdatePaymentPanel();
  }

  /* =========================================================
     9) FOOTER UI (no-data row + totals)
  ========================================================= */

  function refreshFooterUI() {
    applyTablePagination();
    updateMiniSummary();
    qbUpdatePaymentPanel();
    updateFinalizeState();
    updateHoldButtonState();
  }

function qbParseNumber(val) {
  return Number(String(val || "").replace(/[^\d.-]/g, "")) || 0;
}

function qbFormatINR(amount) {
  const n = Math.round((Number(amount) || 0) * 100) / 100;
  return "₹" + n.toFixed(2);
}

function qbSetBillTotal(text) {
  const el = document.getElementById("qbBillTotal");
  if (!el) return;
  el.textContent = text;
  fitQbInvoiceTotalFont();
}

function fitQbInvoiceTotalFont() {
  const el = document.getElementById("qbBillTotal");
  const wrap = el?.closest(".qb-invoice-total-amt-wrap");
  if (!el || !wrap) return;

  const maxW = wrap.clientWidth;
  if (maxW <= 0) {
    requestAnimationFrame(fitQbInvoiceTotalFont);
    return;
  }

  el.style.removeProperty("font-size");
  let size = 42;
  const minSize = 13;
  const setSize = (px) => el.style.setProperty("font-size", `${px}px`, "important");

  setSize(size);
  while (size > minSize && el.scrollWidth > maxW) {
    size -= 1;
    setSize(size);
  }
}

function initQbInvoiceTotalFitObserver() {
  const wrap = document.querySelector(".qb-invoice-total-amt-wrap");
  if (!wrap || typeof ResizeObserver === "undefined") return;

  const ro = new ResizeObserver(() => fitQbInvoiceTotalFont());
  ro.observe(wrap);
}

function qbGetInvoiceTotal() {
  const el = document.getElementById("sumInvoiceFoot");
  return el ? qbParseNumber(el.textContent) : 0;
}

function qbUpdatePaymentPanel() {
  const total = qbGetInvoiceTotal();

  const totalBox  = document.getElementById("qbBillTotal");
  const cashInput = document.getElementById("cashReceived");
  const changeBox = document.getElementById("changeReturn");
  const hintEl    = document.getElementById("payHint");

  if (!totalBox || !cashInput || !changeBox || !hintEl) return;

  qbSetBillTotal(qbFormatINR(total));

  const received = qbParseNumber(cashInput.value);

  if (!cashInput.value || received <= 0) {
    changeBox.value = qbFormatINR(0);
    hintEl.textContent = "";
    return;
  }

  const diff = received - total;

  if (diff >= 0) {
    changeBox.value = qbFormatINR(diff);
    hintEl.textContent = diff === 0 ? "Exact amount received." : "Return balance to customer.";
  } else {
    changeBox.value = qbFormatINR(0);
    hintEl.textContent = "Due: " + qbFormatINR(Math.abs(diff));
  }
}
/* =========================================================
   OPTION A: Show payment panel ONLY for Cash
========================================================= */
function updatePaymentUIByMode() {
  const pm = document.getElementById("paymentMode");
  const mode = String(pm?.value || "").trim();

  const payFields = document.querySelector(".qb-pay-fields");
  const cashReceived = document.getElementById("cashReceived");
  const changeReturn = document.getElementById("changeReturn");
  const payHint = document.getElementById("payHint");

  if (mode === "Cash") {
    if (payFields) payFields.style.display = "";
    qbUpdatePaymentPanel();
  } else {
    if (payFields) payFields.style.display = "none";
    if (cashReceived) cashReceived.value = "";
    if (changeReturn) changeReturn.value = "₹0.00";
    if (payHint) payHint.textContent = "";
    qbUpdatePaymentPanel();
  }
}


  /* =========================================================
     10) PRODUCT DATA + INDEXES
  ========================================================= */

  let ALL_PRODUCTS = [];
  const BY_CODE    = new Map();
  const BY_NAME    = new Map();
  const BY_BARCODE = new Map();

  function buildIndexes(products) {
  BY_CODE.clear();
  BY_NAME.clear();
  BY_BARCODE.clear();

  window.BY_BARCODE = BY_BARCODE; // debug

  products.forEach((p) => {
    const code = pickCode(p);
    const name = pickName(p);

    // ---------- BARCODE NORMALIZE ----------
    const barcodeRaw = String(p.barcode ?? p.bar_code ?? p.ean ?? p.upc ?? "").trim();
    const barcode = barcodeRaw.replace(/\D/g, ""); // digits only

    if (barcode) {
      // exact
      BY_BARCODE.set(barcode, p);

      // without leading zeros
      BY_BARCODE.set(barcode.replace(/^0+/, ""), p);

      // common extra keys
      if (barcode.length === 13) {
        BY_BARCODE.set(barcode.slice(1), p);       // last 12
        BY_BARCODE.set(barcode.slice(-8), p);      // last 8
        BY_BARCODE.set(barcode.slice(-7), p);      // last 7
      } else if (barcode.length === 12) {
        BY_BARCODE.set("0" + barcode, p);          // ean13 variant
        BY_BARCODE.set(barcode.slice(-8), p);
        BY_BARCODE.set(barcode.slice(-7), p);
      }
    }

    if (code) {
      BY_CODE.set(code, p);
      const codeDigits = code.replace(/\D/g, "");
      if (codeDigits.length >= 4) {
        BY_BARCODE.set(codeDigits, p);
        BY_BARCODE.set(codeDigits.replace(/^0+/, ""), p);
      }
    }
    if (name) BY_NAME.set(name.toLowerCase(), p);
  });
}

  function getCategory(p) {
    return String(
      p.category ??
      p.sub_category ??
      p.type ??
      p.product_type ??
      ""
    ).trim();
  }

  function getFeatures(p) {
    return String(
      p.features ??
      p.specifications ??
      p.specification ??
      p.feature ??
      ""
    ).trim();
  }

  function pickFirstFeature(p) {
    const raw = getFeatures(p);
    if (!raw) return "";
    return raw.split(",").map(x => x.trim()).filter(Boolean)[0] || "";
  }

  function ensureOption(selectEl, labelText, value) {
    if (!selectEl) return;

    const v = String(value || "").trim();
    if (!v) {
      selectEl.value = "";
      return;
    }

    const exists = Array.from(selectEl.options).some(opt => opt.value === v);
    if (!exists) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
    }

    selectEl.value = v;
  }

  function populateProductSelect(selectEl, placeholder, values) {
    if (!selectEl) return;

    const currentValue = selectEl.value;
    selectEl.innerHTML = "";

    const first = document.createElement("option");
    first.value = "";
    first.textContent = placeholder;
    selectEl.appendChild(first);

    values.forEach((val) => {
      const v = String(val || "").trim();
      if (!v) return;
      const option = document.createElement("option");
      option.value = v;
      option.textContent = v;
      selectEl.appendChild(option);
    });

    if (currentValue && Array.from(selectEl.options).some((o) => o.value === currentValue)) {
      selectEl.value = currentValue;
    }
  }

  function fillProductCodeSelect(products) {
    const codes = uniq(products.map(pickCode)).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
    populateProductSelect(productCodeInput, "Product Code", codes);
  }

  function fillProductNameSelect(products) {
    const names = uniq(products.map(pickName)).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
    populateProductSelect(productNameInput, "Search Product", names);
  }

  function uniq(arr) {
    return Array.from(new Set(arr.filter(Boolean)));
  }

  /** Same pattern as products.js — fill category dropdown from /api/products meta */
  function populateCategoryFilter(categories, placeholder = "Categories") {
    if (!categoryFilter || !Array.isArray(categories)) return;

    const currentValue = categoryFilter.value;
    categoryFilter.innerHTML = "";

    const first = document.createElement("option");
    first.value = "";
    first.selected = true;
    first.textContent = placeholder;
    categoryFilter.appendChild(first);

    categories.forEach((category) => {
      const name = String(category || "").trim();
      if (!name) return;
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      categoryFilter.appendChild(option);
    });

    if (currentValue && Array.from(categoryFilter.options).some((o) => o.value === currentValue)) {
      categoryFilter.value = currentValue;
    }
  }

  async function loadCategoryFilterFromProductsPage() {
    try {
      const res = await fetch("/api/products?page=1&page_size=1");
      if (!res.ok) return false;

      const response = await res.json();
      const categories = response?.data?.meta?.categories;
      if (!Array.isArray(categories)) return false;

      populateCategoryFilter(categories, "Categories");
      return true;
    } catch (err) {
      console.warn("Unable to load categories from products API", err);
      return false;
    }
  }

  async function refreshCategoryAndFeaturesLists(products) {
    const loaded = await loadCategoryFilterFromProductsPage();
    if (!loaded && products) {
      const cats = uniq(products.map(getCategory)).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      );
      populateCategoryFilter(cats, "Categories");
    }
  }

  async function loadProductsOnPageLoad() {
    const res = await fetch("/api/products/qb");
    const data = await res.json();

    if (!res.ok || !data.success) throw new Error(data.message || "Products API error");

    ALL_PRODUCTS = Array.isArray(data.products) ? data.products : [];
    buildIndexes(ALL_PRODUCTS);

    fillProductCodeSelect(ALL_PRODUCTS);
    fillProductNameSelect(ALL_PRODUCTS);
    await refreshCategoryAndFeaturesLists(ALL_PRODUCTS);
  }

  /* =========================================================
     11) ADD ROW FLOW
  ========================================================= */

  function resetInputsOnly() {
    if (productCodeInput) productCodeInput.value = "";
    if (productNameInput) productNameInput.value = "";

    fillProductCodeSelect(ALL_PRODUCTS);
    fillProductNameSelect(ALL_PRODUCTS);
  }

  function focusQtyAndBindEnter(qtyInput) {
    if (!qtyInput) return;

    qtyInput.focus();
    qtyInput.select?.();



    // If user edits qty and clicks outside (no Enter)
    function focusBackAfterQty() {
      setTimeout(() => {
        if (typeof isAnyModalOpen === "function" && isAnyModalOpen()) return;
         resetCategoryAndFeatures();

        if (__QB_LAST_ADD_SOURCE === "scan") {
          if (scanInput) scanInput.value = "";
          scanInput?.focus();
          scanInput?.select?.();
        } else {
          productNameInput?.focus();
        }
      }, 0);
    }

    qtyInput.addEventListener("change", focusBackAfterQty);
    qtyInput.addEventListener("blur", focusBackAfterQty);
  }

  /* =========================================================
   ✅ GLOBAL QTY ENTER VALIDATION (Event Delegation)
   - works for ALL qty inputs (new rows + restored rows)
========================================================= */
tbody?.addEventListener("keydown", (e) => {
  const el = e.target;

  // only qty inputs
  if (!el || !el.classList.contains("qty-input")) return;
  if (e.key !== "Enter") return;

  let rawQty = Number(el.value);

  // minimum quantity = 1
  if (!rawQty || rawQty <= 0) {
    el.value = 1;
    rawQty = 1;
  }

  // ✅ valid qty
  e.preventDefault();
  e.stopPropagation();

  el.dispatchEvent(new Event("input", { bubbles: true }));

  // clear product inputs + filters
  if (productCodeInput) productCodeInput.value = "";
  if (productNameInput) productNameInput.value = "";
  resetCategoryAndFeatures();

  setTimeout(() => {
    if (__QB_LAST_ADD_SOURCE === "scan") {
      if (scanInput) {
        scanInput.value = "";
        scanInput.focus();
        scanInput.select?.();
      }
    } else {
      productNameInput?.focus();
    }
  }, 0);
});


  function addRowFromProduct(product, qtyPreset = 1, opts = {}) {
    if (!tbody) return;

    const { silent = false } = opts;

    const code = pickCode(product);
    const name = pickName(product);

    if (!code) {
      showToast("Product code missing in JSON", "error");
      return;
    }

    if (bumpIfExists(code)) {
      refreshFooterUI();
      saveCartToStorage();
      return;
    }

    const unitPrice       = num(product.unit_price ?? product.price ?? 0);
    const discountPercent = num(product.discount ?? 0);
    const gstPercent      = parseGstPercent(product.tax_code);
    const cgstRate        = gstPercent / 2;
    const sgstRate        = gstPercent / 2;

    const qtyDefault = Math.max(parseInt(qtyPreset || 1, 10) || 1, 1);
    const c = calc(qtyDefault, unitPrice, discountPercent, cgstRate, sgstRate);

    const tr = document.createElement("tr");
    tr.className = "data-row";
    tr.dataset.code = code;
    tr.dataset.unitPrice = String(unitPrice);
    tr.dataset.discountPercent = String(discountPercent);
    tr.dataset.cgstRate = String(cgstRate);
    tr.dataset.sgstRate = String(sgstRate);

    tr.innerHTML = `
      <td class="col-sno">1</td>
      <td class="col-code">${code}</td>
      <td class="col-name">${name}</td>
      <td class="col-qty">
  <input type="number" min="1" step="1" value="${qtyDefault}" class="qty-input" inputmode="numeric">
</td>
      <td class="col-price">${money(unitPrice)}</td>
      <td class="col-discount">${discountPercent.toFixed(2)}%</td>
      <td class="col-taxable">${money(c.taxable)}</td>
      <td class="col-cgst">${money(c.cgstAmt)}</td>
      <td class="col-sgst">${money(c.sgstAmt)}</td>
      <td class="col-total">${money(c.total)}</td>
      <td class="actions-col">
        <button type="button" class="row-remove-btn">Remove</button>
      </td>
    `;

    tbody.appendChild(tr);

    if (!silent) {
      qbCurrentPage = qbTotalPages();
      refreshFooterUI();
    } else {
      updateNoDataRow();
      updateSerialNumbers();
    }
    saveCartToStorage();

    const qtyInput = tr.querySelector(".qty-input");
    window.__QB_LAST_QTY_INPUT = qtyInput;

    qtyInput?.addEventListener("input", () => {
      recalculateRow(tr);
      refreshFooterUI();
      saveCartToStorage();
    });

    qtyInput?.addEventListener("change", resetInputsOnly);
    qtyInput?.addEventListener("blur", () => setTimeout(() => resetInputsOnly(), 0));

    tr.querySelector(".row-remove-btn")?.addEventListener("click", () => {
      const qtyVal = tr.querySelector(".qty-input")?.value || "1";

      const deleted = QB.getDeletedItems();
      deleted.unshift({
        code,
        name,
        qty: Number(qtyVal),
        unitPrice: unitPrice,
        discount: discountPercent,
        gst: (cgstRate + sgstRate),
        removedAt: new Date().toISOString(),
        removedBy: (window.QB_USER_NAME || "User")
      });
      QB.setDeletedItems(deleted);

      tr.remove();
      deleteHoldIfEmpty();

      const tp = qbTotalPages();
      if (qbCurrentPage > tp) qbCurrentPage = tp;

      refreshFooterUI();
      saveCartToStorage();

      const label = name || code || "Product";
      QB.showSuccessNotification(`${label} has been removed successfully`);
    });

    focusQtyAndBindEnter(qtyInput);
    selectRow(tr);

    if (!silent) {
      setTimeout(() => {
        qtyInput?.focus();
        qtyInput?.select?.();
      }, 0);
    }
  }

  function restoreCartToTable() {
    const cart = loadCartFromStorage();
    cart.forEach(item => {
      const p = BY_CODE.get(String(item.code || "").toUpperCase());
      if (p) addRowFromProduct(p, item.qty || 1, { silent: true });
    });
    qbCurrentPage = 1;
    applyTablePagination();
  }
function resetCategoryAndFeatures() {
  if (categoryFilter) {
    categoryFilter.value = "";
    categoryFilter.selectedIndex = 0;
  }
  resetActionDropdown();

  fillProductNameSelect(ALL_PRODUCTS);
  fillProductCodeSelect(ALL_PRODUCTS);
}

  function resetActionDropdown() {
    if (qbActionSelect) {
      qbActionSelect.value = "";
      qbActionSelect.selectedIndex = 0;
    }
  }

  function getTargetRow() {
    const selected = tbody?.querySelector("tr.data-row.row-selected");
    if (selected) return selected;
    const rows = tbody?.querySelectorAll("tr.data-row");
    return rows?.length ? rows[rows.length - 1] : null;
  }

  function selectRow(tr) {
    tbody?.querySelectorAll("tr.data-row").forEach((r) => {
      r.classList.remove("row-selected", "selected-row", "selected");
    });
    if (tr) {
      tr.classList.add("row-selected");
      selectedRow = tr;
    } else {
      selectedRow = null;
    }
  }

  function recalculateRow(tr) {
    if (!tr) return;

    const unitPrice = num(tr.dataset.unitPrice);
    const discountPercent = num(tr.dataset.discountPercent);
    const cgstRate = num(tr.dataset.cgstRate);
    const sgstRate = num(tr.dataset.sgstRate);
    const qtyInput = tr.querySelector(".qty-input");

    let qty = parseInt(qtyInput?.value || "1", 10) || 1;
    if (qty <= 0) {
      qty = 1;
      if (qtyInput) qtyInput.value = "1";
    }

    const c2 = calc(qty, unitPrice, discountPercent, cgstRate, sgstRate);

    const discCell = tr.querySelector(".col-discount");
    if (discCell) discCell.textContent = `${discountPercent.toFixed(2)}%`;

    tr.querySelector(".col-taxable").textContent = money(c2.taxable);
    tr.querySelector(".col-cgst").textContent = money(c2.cgstAmt);
    tr.querySelector(".col-sgst").textContent = money(c2.sgstAmt);
    tr.querySelector(".col-total").textContent = money(c2.total);
  }

  function openDiscountModal(row) {
    if (!qbDiscountModal || !row) return;
    qbDiscountTargetRow = row;
    if (qbDiscountInput) {
      qbDiscountInput.value = num(row.dataset.discountPercent).toFixed(2);
    }
    qbDiscountModal.classList.add("show");
    setTimeout(() => qbDiscountInput?.focus(), 50);
  }

  function closeDiscountModal() {
    qbDiscountModal?.classList.remove("show");
    qbDiscountTargetRow = null;
  }

  function applyDiscountToRow(row, percent) {
    if (!row) return;
    const p = Math.max(0, Math.min(100, num(percent)));
    row.dataset.discountPercent = String(p);
    recalculateRow(row);
    refreshFooterUI();
    saveCartToStorage();
    showToast(`Discount ${p.toFixed(2)}% applied`, "success");
  }

  function handleQuickAction(action) {
    const act = String(action || "").trim();
    if (!act) return;

    switch (act) {
      case "add_product":
        __QB_LAST_ADD_SOURCE = "manual";
        productNameInput?.focus();
        productNameInput?.select?.();
        showToast("Search or enter product to add", "success");
        break;

      case "barcode_scan":
        startBarcodeCamera();
        break;

      case "apply_discount": {
        const row = getTargetRow();
        if (!row) {
          showToast("Add a product first", "error");
          break;
        }
        selectRow(row);
        openDiscountModal(row);
        return;
      }

      case "change_quantity": {
        const row = getTargetRow();
        if (!row) {
          showToast("Add a product first", "error");
          break;
        }
        selectRow(row);
        const qtyInput = row.querySelector(".qty-input");
        qtyInput?.focus();
        qtyInput?.select?.();
        break;
      }

      case "remove_item": {
        const row = getTargetRow();
        if (!row) {
          showToast("No item to remove", "error");
          break;
        }
        selectRow(row);
        row.querySelector(".row-remove-btn")?.click();
        break;
      }

      default:
        break;
    }

    resetActionDropdown();
  }

  /* =========================================================
     12) FILTERS
  ========================================================= */

  function applyFilterAndShowNames() {
    let filtered = [...ALL_PRODUCTS];
    const cat  = String(categoryFilter?.value || "").trim();

    if (cat) filtered = filtered.filter((p) => getCategory(p) === cat);

    fillProductNameSelect(filtered);
    fillProductCodeSelect(filtered);
  }

  categoryFilter?.addEventListener("change", applyFilterAndShowNames);

  qbPrevBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    if (qbCurrentPage > 1) {
      qbCurrentPage -= 1;
      applyTablePagination();
    }
  });

  qbNextBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    if (qbCurrentPage < qbTotalPages()) {
      qbCurrentPage += 1;
      applyTablePagination();
    }
  });

  qbActionSelect?.addEventListener("change", () => {
    const action = qbActionSelect.value;
    if (!action) return;
    handleQuickAction(action);
  });

  tbody?.addEventListener("click", (e) => {
    const tr = e.target.closest("tr.data-row");
    if (!tr) return;
    if (e.target.closest(".row-remove-btn") || e.target.closest(".qty-input")) return;
    selectRow(tr);
  });

  function getVisibleDataRows() {
    return getAllDataRows().filter(
      (row) => !row.classList.contains("qb-page-hidden") && row.style.display !== "none"
    );
  }

  function isBillingTableNavBlocked() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function scrollSelectedRowIntoView() {
    if (!selectedRow) return;
    const wrap = tbody?.closest(".table-wrap");
    if (wrap) {
      const rowTop = selectedRow.offsetTop;
      const rowBottom = rowTop + selectedRow.offsetHeight;
      if (rowTop < wrap.scrollTop) {
        wrap.scrollTop = rowTop;
      } else if (rowBottom > wrap.scrollTop + wrap.clientHeight) {
        wrap.scrollTop = rowBottom - wrap.clientHeight;
      }
    } else {
      selectedRow.scrollIntoView({ block: "nearest" });
    }
  }

  function moveTableSelection(delta) {
    if (isBillingTableNavBlocked()) return;
    if (typeof isAnyModalOpen === "function" && isAnyModalOpen()) return;

    const visible = getVisibleDataRows();
    if (!visible.length) return;

    const current = tbody?.querySelector("tr.data-row.row-selected");
    let idx =
      current && visible.includes(current) ? visible.indexOf(current) : -1;

    if (idx < 0) {
      selectRow(delta > 0 ? visible[0] : visible[visible.length - 1]);
      scrollSelectedRowIntoView();
      return;
    }

    const nextIdx = idx + delta;

    if (nextIdx < 0) {
      if (qbCurrentPage > 1) {
        qbCurrentPage -= 1;
        applyTablePagination();
        const pageRows = getVisibleDataRows();
        if (pageRows.length) {
          selectRow(pageRows[pageRows.length - 1]);
          scrollSelectedRowIntoView();
        }
      }
      return;
    }

    if (nextIdx >= visible.length) {
      if (qbCurrentPage < qbTotalPages()) {
        qbCurrentPage += 1;
        applyTablePagination();
        const pageRows = getVisibleDataRows();
        if (pageRows.length) {
          selectRow(pageRows[0]);
          scrollSelectedRowIntoView();
        }
      }
      return;
    }

    selectRow(visible[nextIdx]);
    scrollSelectedRowIntoView();
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    if (isBillingTableNavBlocked()) return;
    if (typeof isAnyModalOpen === "function" && isAnyModalOpen()) return;

    e.preventDefault();
    moveTableSelection(e.key === "ArrowDown" ? 1 : -1);
  });

  qbDiscountCancel?.addEventListener("click", (e) => {
    e.preventDefault();
    closeDiscountModal();
    resetActionDropdown();
  });

  qbDiscountApply?.addEventListener("click", (e) => {
    e.preventDefault();
    if (!qbDiscountTargetRow) {
      closeDiscountModal();
      return;
    }
    applyDiscountToRow(qbDiscountTargetRow, qbDiscountInput?.value || 0);
    closeDiscountModal();
    resetActionDropdown();
  });

  qbDiscountModal?.addEventListener("click", (e) => {
    if (e.target === qbDiscountModal) closeDiscountModal();
  });

  qbDiscountInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      qbDiscountApply?.click();
    }
    if (e.key === "Escape") closeDiscountModal();
  });

  /* =========================================================
     13) PRODUCT DROPDOWN SELECTION (NO DOUBLE ADD)
  ========================================================= */

  let lastAddKey = "";
  let lastAddAt  = 0;

  function canProceedAdd(key) {
    const now = Date.now();
    if (key === lastAddKey && (now - lastAddAt) < 500) return false;

    lastAddKey = key;
    lastAddAt  = now;
    return true;
  }

  function handleProductNameSelection(source = "manual") {
    const raw = String(productNameInput?.value || "").trim();
    const nameKey = raw.toLowerCase();
    if (!nameKey) return;

    const p = BY_NAME.get(nameKey);
    if (!p) {
      if (source !== "input") showToast("Product not found", "error");
      return;
    }

    if (!canProceedAdd("name:" + nameKey)) return;

    if (productCodeInput) productCodeInput.value = pickCode(p);
    if (productNameInput) productNameInput.value = pickName(p);

    // Show category & features in dropdown
    const cat  = getCategory(p);
    const feat = pickFirstFeature(p);

    ensureOption(categoryFilter, "Categories", cat);

    __QB_LAST_ADD_SOURCE = "manual";

    addRowFromProduct(p);
    refreshFooterUI();
  }

  function handleProductCodeSelection(source = "manual") {
    const code = String(productCodeInput?.value || "").trim().toUpperCase();
    if (!code) return;

    const p = BY_CODE.get(code);
    if (!p) {
      if (source !== "input") showToast("Product not found", "error");
      return;
    }

    if (!canProceedAdd("code:" + code)) return;

    if (productCodeInput) productCodeInput.value = pickCode(p);
    if (productNameInput) productNameInput.value = pickName(p);

    // Show category & features in dropdown
    const cat  = getCategory(p);
    const feat = pickFirstFeature(p);

    ensureOption(categoryFilter, "Categories", cat);

    __QB_LAST_ADD_SOURCE = "manual";

    addRowFromProduct(p);
    refreshFooterUI();
  }

  productNameInput?.addEventListener("change", () => {
    handleProductNameSelection("change");
  });

  productCodeInput?.addEventListener("change", () => {
    handleProductCodeSelection("change");
  });

  /* =========================================================
     14) SCAN BAR — PASTE ONLY MODE
  ========================================================= */

  function scanAdd(raw) {
  const val = String(raw || "").trim();
  if (!val) return;

  const digits = val.replace(/\D/g, "");
  const codeUpper = val.toUpperCase();

  // Build lookup keys (try many)
  const keys = [];
  if (digits) {
    keys.push(digits);
    keys.push(digits.replace(/^0+/, ""));
    if (digits.length === 12) keys.push("0" + digits);
    if (digits.length >= 13) keys.push(digits.slice(1));
    keys.push(digits.slice(-8));
    keys.push(digits.slice(-7));
  }

  let p = null;

  // barcode map lookup
  for (const k of keys) {
    if (!k) continue;
    p = BY_BARCODE.get(k);
    if (p) break;
  }

  // fallback: product code map
  if (!p) p = BY_CODE.get(codeUpper);

  if (!p) {
    showToast("Product not found: " + (digits || val), "error");
    scanInput?.focus();
    scanInput?.select?.();
    return;
  }

  showBarcodeInInput(digits || val);

  const codeKey = pickCode(p);
  __QB_LAST_ADD_SOURCE = "scan";

  // Duplicate scan check (do NOT increase qty)
  if (codeKey && bumpIfExists(codeKey, { onlyCheck: true })) {
    showToast("Already scanned this product", "error");

    setTimeout(() => {
      const existingQty = tbody?.querySelector(`tr.data-row[data-code="${codeKey}"] .qty-input`);
      (existingQty || window.__QB_LAST_QTY_INPUT)?.focus();
      (existingQty || window.__QB_LAST_QTY_INPUT)?.select?.();
    }, 50);

    setTimeout(() => { if (scanInput) scanInput.value = ""; }, 800);
    return;
  }

  addRowFromProduct(p);
  refreshFooterUI();
  showToast("Barcode scanned", "success");

  setTimeout(() => {
    const lastQty =
      tbody?.querySelector("tr.data-row:last-child .qty-input") ||
      window.__QB_LAST_QTY_INPUT;

    lastQty?.focus();
    lastQty?.select?.();
    window.__QB_LAST_QTY_INPUT = lastQty;
  }, 80);
}


  // USB / Bluetooth scanner: types digits + Enter into scan field
  scanInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = String(scanInput?.value || "").trim();
      if (!code) return;
      __QB_LAST_ADD_SOURCE = "scan";
      scanAdd(code);
      if (scanInput) scanInput.value = "";
      return;
    }
    if (e.key === "Tab" || e.key === "Escape") return;
  });

  scanInput?.addEventListener("paste", (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData)?.getData("text") || "";
    const code = String(pasted).trim();
    if (!code) return;
    __QB_LAST_ADD_SOURCE = "scan";
    scanAdd(code);
    if (scanInput) scanInput.value = "";
  });

  async function saveQuickBillToServer(payload) {
  const res = await fetch("/api/save-quick-bill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  let data = {};
  try { data = await res.json(); } catch {}

  if (!res.ok || data.status !== "success") {
    throw new Error(data.message || "Failed to save bill");
  }

  return data; // {status:"success", invoice_id:"QB-..."}
}


  /* =========================================================
     15) PRINT (IFRAME)
  ========================================================= */

  function doPrintIframe() {
    if (!printArea) {
      showToast("Print area not found (#printArea)", "error");
      return;
    }

    let mode = localStorage.getItem("qb_payment_mode") || (paymentMode?.value || "-");

    const detailRaw = localStorage.getItem("qb_payment_detail");
    if (detailRaw) {
      try {
        const d = JSON.parse(detailRaw);
        if (d?.mode === "Multiple" && Array.isArray(d.parts)) {
          mode = d.parts.map(x => `${x.type} ₹${Number(x.amount || 0).toFixed(2)}`).join(" + ");
        }
      } catch {}
    }

    const invoiceNo = "QB-" + Date.now();
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB");

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;

    const timeStr = `${hours}:${minutes} ${ampm}`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((link) => `<link rel="stylesheet" href="${link.href}">`)
      .join("\n");

    // Convert qty inputs to text before printing
    const printClone = printArea.cloneNode(true);
    printClone.querySelectorAll("tr.data-row").forEach((r) => {
      r.style.display = "";
      r.classList.remove("qb-page-hidden");
    });
    const printFooter = printClone.querySelector(".table-footer");
    if (printFooter) printFooter.remove();

    printClone.querySelectorAll("input.qty-input").forEach(inp => {
      const span = document.createElement("span");
      span.textContent = inp.value;
      span.style.fontWeight = "600";
      inp.replaceWith(span);
    });

    const printableHTML = printClone.outerHTML;

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Stackly - Quick Billing</title>
          ${cssLinks}
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { margin: 0; font-family: Inter, Arial, sans-serif; }
            .quick-billing-header,.qb-filters,.qb-filters-row,.scan-pill,.qb-right-column,.qb-payment-card,.qb-no-print,.qb-toast { display:none !important; }
            .actions-col, th.actions-col { display:none !important; }
            .table-scroll-area{ overflow:visible !important; height:auto !important; }
            .billing-table{ width:100% !important; border-collapse:collapse; table-layout:auto; font-size:12px; }
            .billing-table th, .billing-table td{ padding:6px 6px; border-bottom:1px solid #ddd; white-space:nowrap; }
            .billing-table thead th{ font-weight:800; border-bottom:2px solid #000; }
            .col-price,.col-taxable,.col-cgst,.col-sgst,.col-total { text-align:right; }
            input{ border:none !important; background:transparent !important; width:40px; }
            .print-header{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;
              padding-bottom:8px; border-bottom:1px dashed #888; }
            .print-left{ display:flex; gap:10px; align-items:center; }
            .print-title{ font-weight:900; font-size:18px; }
            .inv-table{
  margin-left:auto;
  border-collapse:collapse;
  font-size:12px;
  table-layout:fixed;
  width: 260px;          /* optional: neat width */
}
.inv-table td{ padding:2px 6px; white-space:nowrap; }

/* ✅ labels + colon right align */
.inv-table td:nth-child(1){ text-align:right; font-weight:700; width:110px; }
.inv-table td:nth-child(2){ text-align:center; width:12px; padding-left:0; padding-right:0; }
.inv-table td:nth-child(3){ text-align:right; width:auto; }
            .print-footer{ margin-top:22px; text-align:center; font-size:14px; font-weight:700; }
          </style>
        </head>
        <body>
          <div class="print-header">
            <div class="print-left">
              <img src="/static/images/stack-img.webp" style="height:36px;" />
              <div class="print-title">Quick Billing</div>
            </div>

            <table class="inv-table">
              <tr><td><b>Invoice No</b></td><td>:</td><td>${invoiceNo}</td></tr>
              <tr><td><b>Date</b></td><td>:</td><td>${dateStr}</td></tr>
              <tr><td><b>Time</b></td><td>:</td><td>${timeStr}</td></tr>
              <tr><td><b>Payment Mode</b></td><td>:</td><td>${mode}</td></tr>
            </table>
          </div>

          ${printableHTML}

          <div class="print-footer">Thank you! Visit Again!</div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.error(e);
        showToast("Print blocked by browser", "error");
      }
      setTimeout(() => document.body.removeChild(iframe), 2000);
    }, 350);
  }

  printBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    doPrintIframe();
  });

  /* =========================================================
     16) PAYMENT MODE + MULTI PAY
  ========================================================= */

  const mpTotal   = document.getElementById("mpTotal");
  const mpCash    = document.getElementById("mpCash");
  const mpUpi     = document.getElementById("mpUpi");
  const mpCard    = document.getElementById("mpCard");
  const mpBalance = document.getElementById("mpBalance");
  const mpSave    = document.getElementById("mpSave");
  const mpCancel  = document.getElementById("mpCancel");

  const multiPayModal = document.getElementById("multiPayModal");
  if (multiPayModal) multiPayModal.style.display = "none";

  function getInvoiceTotal() {
    const t = String(sumInvoiceEl?.textContent || "0").replace(/[₹,\s]/g, "");
    const n = parseFloat(t);
    return isNaN(n) ? 0 : n;
  }

  function updateMultiSaveState() {
    const total = +getInvoiceTotal().toFixed(2);
    const cash  = +Number(mpCash?.value || 0).toFixed(2);
    const upi   = +Number(mpUpi?.value  || 0).toFixed(2);
    const card  = +Number(mpCard?.value || 0).toFixed(2);

    const paid = +(cash + upi + card).toFixed(2);
    const bal  = +(total - paid).toFixed(2);

    if (mpBalance) mpBalance.value = bal.toFixed(2);

    const ok = (paid > 0 && bal === 0);
    if (mpSave) {
      mpSave.disabled = !ok;
      mpSave.classList.toggle("is-disabled", !ok);
    }
  }

  function openMultiPayModal() {
    
  // ✅ Guard: modal inputs must exist
  if (!multiPayModal || !mpTotal || !mpCash || !mpUpi || !mpCard || !mpBalance || !mpSave || !mpCancel) {
    showToast("Multiple Pay modal fields missing (check HTML IDs)", "error");
    return;
  }

 
    const total = getInvoiceTotal();
    if (total <= 0) { showToast("No items added", "error"); return; }

    mpTotal.value   = total.toFixed(2);
    mpCash.value    = "";
    mpUpi.value     = "";
    mpCard.value    = "";
    mpBalance.value = total.toFixed(2);

    if (multiPayModal) multiPayModal.style.display = "flex";
    trapFocus(multiPayModal);

    updateMultiSaveState();
  }

  function closeMultiPayModal() {
    if (multiPayModal) {
      untrapFocus(multiPayModal);
      multiPayModal.style.display = "none";
    }
  }

  function focusLastQtyInput() {
    const el = window.__QB_LAST_QTY_INPUT;
    if (!el) return;
    setTimeout(() => { el.focus(); el.select?.(); }, 0);
  }

  // Note: This exists but is currently not wired; keeping as-is.
  function handlePaymentMode(mode) {
    mode = String(mode || "").trim();

    if (!mode) {
      showToast("Select Payment Mode", "error");
      return;
    }

    if (getDataRowCount() === 0) {
      showToast("No items added", "error");
      paymentMode.value = "";
      return;
    }

    if (mode === "Multiple") {
      openMultiPayModal();
      return;
    }

    localStorage.removeItem(MULTI_KEY);
    localStorage.setItem("qb_payment_mode", mode);

    focusLastQtyInput();
  }

  function focusFinalizeBtn() {
    setTimeout(() => {
      finalizeBtn?.focus();
    }, 0);
  }

  function commitPaymentMode(mode) {
    mode = String(mode || "").trim();

    if (!mode) {
      showToast("Select Payment Mode", "error");
      return;
    }

    if (getDataRowCount() === 0) {
      showToast("No items added", "error");
      if (paymentMode) paymentMode.value = "";
      return;
    }

    if (mode === "Multiple") {
      openMultiPayModal();
      return;
    }

    localStorage.removeItem(MULTI_KEY);
    localStorage.setItem("qb_payment_mode", mode);

    focusFinalizeBtn();
  }

  paymentMode?.addEventListener("change", () => {
  updatePaymentUIByMode(); // Cash panel show/hide only

  // ✅ If user selects Multiple using mouse → open popup immediately
  if (String(paymentMode.value || "").trim() === "Multiple") {
    openMultiPayModal();
  }
    updateFinalizeState();
});

  // Enter-based POS flow for payment mode
  paymentMode?.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();

  updatePaymentUIByMode();              // ✅ update UI also
  commitPaymentMode(paymentMode.value);
});

  mpCash?.addEventListener("input", updateMultiSaveState);
  mpUpi?.addEventListener("input", updateMultiSaveState);
  mpCard?.addEventListener("input", updateMultiSaveState);

  mpCancel?.addEventListener("click", () => {
    closeMultiPayModal();
    paymentMode?.focus();
    updateFinalizeState();
  });

  mpSave?.addEventListener("click", () => {
    const total = +getInvoiceTotal().toFixed(2);
    const cash  = +Number(mpCash?.value || 0).toFixed(2);
    const upi   = +Number(mpUpi?.value  || 0).toFixed(2);
    const card  = +Number(mpCard?.value || 0).toFixed(2);

    const paid = +(cash + upi + card).toFixed(2);
    const bal  = +(total - paid).toFixed(2);

    if (paid <= 0) { showToast("Enter at least one amount", "error"); return; }
    if (bal !== 0) { showToast(`Balance must be 0. Now: ${bal.toFixed(2)}`, "error"); return; }

    const parts = [];
    if (cash > 0) parts.push({ type: "Cash", amount: cash });
    if (upi  > 0) parts.push({ type: "UPI",  amount: upi  });
    if (card > 0) parts.push({ type: "Card", amount: card });

    localStorage.setItem(MULTI_KEY, JSON.stringify({ mode: "Multiple", parts, total }));

    if (paymentMode) paymentMode.value = "Multiple";
    closeMultiPayModal();
    focusLastQtyInput();
    updateFinalizeState();
  });

  /* =============================
   ✅ FINALIZE BUTTON STATE
   - Enable only when:     1) At least 1 row exists     2) Payment mode selected
     3) If Multiple => qb_payment_detail must exist
============================= */
function updateFinalizeState() {
  if (!finalizeBtn) return;

  const hasItems = getDataRowCount() > 0;
  const mode = String(paymentMode?.value || "").trim();

  let ok = hasItems && !!mode;

  // Multiple mode => split must be saved
  if (ok && mode === "Multiple") {
    const raw = localStorage.getItem("qb_payment_detail");
    ok = !!raw;
  }

  finalizeBtn.disabled = !ok;
  finalizeBtn.classList.toggle("is-disabled", !ok);
}

  /* =========================================================
     17) FINALIZE BILL FLOW
  ========================================================= */

  const finalizeBtn    = document.getElementById("finalizeBtn");
  if (finalizeBtn) finalizeBtn.disabled = true;
  updateFinalizeState();
  const finalizeModal  = document.getElementById("finalizeModal");
  const finalizeOk     = document.getElementById("finalizeOk");
  const finalizeCancel = document.getElementById("finalizeCancel");
  if (finalizeModal) finalizeModal.classList.remove("show");

  function clearBillState() {
    tbody?.querySelectorAll("tr.data-row").forEach(r => r.remove());
    localStorage.removeItem("qb_cart_items");

    localStorage.removeItem("qb_payment_mode");
    localStorage.removeItem("qb_payment_detail");
    if (paymentMode) paymentMode.value = "";
    // ✅ PAYMENT PANEL RESET (Screen only)
    const cashEl   = document.getElementById("cashReceived");
    const changeEl = document.getElementById("changeReturn");
    const totalEl  = document.getElementById("qbBillTotal");
    const hintEl   = document.getElementById("payHint");

    if (cashEl)   cashEl.value = "";
    if (changeEl) changeEl.value = "₹0.00";
    if (totalEl)  qbSetBillTotal("₹0.00");
    if (hintEl)   hintEl.textContent = "";
    refreshFooterUI();
    productNameInput?.focus();
  }

  async function saveBillToServer() {

  const rows = document.querySelectorAll("#billingTableBody tr.data-row");

  if (!rows.length) return false;

  // ---------- collect items ----------
  const items = [];
  rows.forEach(row => {
    items.push({
      product_code: row.querySelector(".col-code")?.textContent.trim(),
      product_name: row.querySelector(".col-name")?.textContent.trim(),
      qty: Number(row.querySelector(".qty-input")?.value || 1),
      price: Number(row.querySelector(".col-price")?.textContent || 0),
      total: Number(row.querySelector(".col-total")?.textContent || 0)
    });
  });

  // ---------- totals ----------
  const invoiceTotal = Number(
    document.getElementById("sumInvoiceFoot")?.textContent || 0
  );

  // ---------- payment ----------
  let paymentMode = localStorage.getItem("qb_payment_mode") || "-";

  const payload = {
    items: items,
    totals: { invoice_total: invoiceTotal },
    payment: { mode: paymentMode }
  };

  try {
    const res = await fetch("/api/save-quick-bill", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("Bill Saved:", data);

    return true;

  } catch (err) {
    console.error("Save failed:", err);
    alert("Bill not saved!");
    return false;
  }
}


  function runFinalizeBill() {
    if (getDataRowCount() === 0) {
      showToast("No items added", "error");
      return;
    }

    finalizeModal?.classList.add("show");

    setTimeout(() => {
      const focusable = getFocusableInModal(finalizeModal);
      if (focusable.length) focusable[0].focus();
    }, 0);

    trapFocus(finalizeModal);
  }

  finalizeBtn?.addEventListener("click", runFinalizeBill);

  finalizeCancel?.addEventListener("click", () => {
    untrapFocus(finalizeModal);
    finalizeModal?.classList.remove("show");
    productNameInput?.focus();
  });

  // finalizeOk?.addEventListener("click", async () => {
  //   const mode = String(paymentMode?.value || "").trim();
  //   if (!mode) {
  //     showToast("Select Payment Mode", "error");
  //     return;
  //   }

  //   if (mode === "Multiple") {
  //     const raw = localStorage.getItem("qb_payment_detail");
  //     if (!raw) {
  //       showToast("Enter Multiple payment split", "error");
  //       return;
  //     }
  //   }

  //   localStorage.setItem("qb_payment_mode", mode);
  //   finalizeModal?.classList.remove("show");

  //   // ✅ SAVE BILL (ADD THIS)
  // const ok = await saveBillToServer();
  // if (!ok) return;

  //   doPrintIframe();

  //   setTimeout(() => {
  //     clearBillState();
  //     showToast("Bill completed", "success");
  //   }, 900);
  // });

  /* =========================================================
     18) FOCUS TRAP
  ========================================================= */

  function highlightFocusedButton(modalEl, btn) {
    if (!modalEl) return;

    modalEl.querySelectorAll("button").forEach(b => b.classList.remove("active-focus"));
    if (btn) btn.classList.add("active-focus");
  }

  function getFocusableInModal(modalEl) {
    return Array.from(
      modalEl.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.disabled && el.offsetParent !== null);
  }

  function trapFocus(modalEl) {
    let items = getFocusableInModal(modalEl);
    if (!items.length) return;

    function focusAt(index) {
      items = getFocusableInModal(modalEl);
      if (!items.length) return;

      index = (index + items.length) % items.length;
      items[index].focus();
      highlightFocusedButton(modalEl, items[index]);
    }

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        modalEl.classList.remove("show");
        untrapFocus(modalEl);
        productNameInput?.focus();
        return;
      }

      items = getFocusableInModal(modalEl);
      if (!items.length) return;

      let index = items.indexOf(document.activeElement);
      if (index === -1) index = 0;

      if (e.key === "ArrowRight") { e.preventDefault(); focusAt(index + 1); return; }
      if (e.key === "ArrowLeft")  { e.preventDefault(); focusAt(index - 1); return; }

      if (e.key === "Tab") {
        e.preventDefault();
        focusAt(e.shiftKey ? index - 1 : index + 1);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        document.activeElement?.click();
      }
    }

    untrapFocus(modalEl);
    modalEl.__trapHandler = onKeyDown;
    modalEl.addEventListener("keydown", onKeyDown);

    setTimeout(() => {
      items = getFocusableInModal(modalEl);
      const target = items[1] || items[0];
      if (target) {
        target.focus();
        highlightFocusedButton(modalEl, target);
      }
    }, 50);
  }

  function untrapFocus(modalEl) {
    if (modalEl?.__trapHandler) {
      modalEl.removeEventListener("keydown", modalEl.__trapHandler);
      delete modalEl.__trapHandler;
    }
  }

  function isAnyModalOpen() {
    const finalizeOpen = finalizeModal?.classList.contains("show");
    const multiOpen    = (multiPayModal && multiPayModal.style.display === "flex");
    const cameraOpen   = cameraModal?.classList.contains("show");
    return !!(finalizeOpen || multiOpen || cameraOpen);
  }

  /* =========================================================
     19) CLEAR FILTER (PAYMENT ALSO CLEARS)
  ========================================================= */
function clearAll() {
  if (productCodeInput) productCodeInput.value = "";
  if (productNameInput) productNameInput.value = "";

  resetCategoryAndFeatures();

  if (scanInput) scanInput.value = "";

  if (paymentMode) paymentMode.value = "";
  localStorage.removeItem("qb_payment_mode");
  localStorage.removeItem("qb_payment_detail");

  // ✅ Payment panel reset
  const cashEl   = document.getElementById("cashReceived");
  const changeEl = document.getElementById("changeReturn");
  const totalEl  = document.getElementById("qbBillTotal");
  const hintEl   = document.getElementById("payHint");

  if (cashEl)   cashEl.value = "";
  if (changeEl) changeEl.value = "₹0.00";
  if (totalEl)  qbSetBillTotal("₹0.00");
  if (hintEl)   hintEl.textContent = "";

  // ✅ rebuild dropdown options from ALL_PRODUCTS
  refreshCategoryAndFeaturesLists(ALL_PRODUCTS);
  fillProductCodeSelect(ALL_PRODUCTS);
  fillProductNameSelect(ALL_PRODUCTS);

  updatePaymentUIByMode();
  refreshFooterUI();
  productNameInput?.focus();
}

// ✅ CLEAR FILTER BUTTON (MISSING IN YOUR CODE)
clearFilterBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  clearAll();
});

  function runClearBill() {
    if (getDataRowCount() === 0) return;
    if (!confirm("Clear current bill?")) return;

    clearAll();
    tbody?.querySelectorAll("tr.data-row").forEach(r => r.remove());
    localStorage.removeItem("qb_cart_items");
    qbCurrentPage = 1;
    refreshFooterUI();
    productNameInput?.focus();
  }

  /* =========================================================
     20) REMOVED ITEMS PAGE LINK + RESTORE
  ========================================================= */

  const deletedBtn = document.getElementById("deletedBtn");
  deletedBtn?.addEventListener("click", () => {
    window.location.href = "/quick-removebilling";
  });

  function tryRestoreFromDeleted() {
    const raw = localStorage.getItem(QB.RESTORE_KEY);
    if (!raw) return;

    localStorage.removeItem(QB.RESTORE_KEY);

    let item;
    try { item = JSON.parse(raw); } catch { return; }
    if (!item?.code) return;

    const p = BY_CODE.get(String(item.code).toUpperCase());
    if (!p) {
      showToast("Product not found for restore", "error");
      return;
    }

    addRowFromProduct(p, item.qty || 1);
    refreshFooterUI();

    const label = String(item.name || item.code || "Product").trim();
    QB.showSuccessNotification(`${label} has been restored successfully`);
  }

  /* =========================================================
     21) KEYBOARD SHORTCUTS
  ========================================================= */

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" && isAnyModalOpen()) return;

    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      runFinalizeBill();
      return;
    }

    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "x") {
      e.preventDefault();
      runClearBill();
      return;
    }

    // ✅ ALT + P => Focus payment mode
if (e.altKey && !e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "p") {
  e.preventDefault();
  paymentMode?.focus();
  paymentMode?.click?.();   // optional (some browsers open dropdown)
  return;
}

    if (e.key === "Escape") {
      if (finalizeModal?.classList.contains("show")) {
        e.preventDefault();
        finalizeModal.classList.remove("show");
        productNameInput?.focus();
        return;
      }

      if (multiPayModal && multiPayModal.style.display === "flex") {
        e.preventDefault();
        closeMultiPayModal();
        paymentMode?.focus();
        return;
      }

      if (cameraModal?.classList.contains("show")) {
        e.preventDefault();
        stopBarcodeCamera();
        return;
      }
    }
  });

  /* =========================================================
     22) CAMERA SCANNER INTEGRATION (QUAGGA)
  ========================================================= */

  let quaggaRunning = false;
  let barcodeCameraSession = 0;

  function releaseMediaElement(el) {
    if (!el) return;
    try { el.pause(); } catch {}
    const stream = el.srcObject;
    if (stream?.getTracks) {
      stream.getTracks().forEach((t) => {
        try { t.stop(); } catch {}
      });
    }
    el.srcObject = null;
    el.removeAttribute("src");
    try { el.load(); } catch {}
  }

  function releaseBarcodeScannerMedia() {
    const targetEl = document.querySelector("#barcodeScanner");
    if (targetEl) {
      targetEl.querySelectorAll("video, audio").forEach(releaseMediaElement);
    }

    try {
      const access = window.Quagga?.CameraAccess;
      if (access && typeof access.getActiveTrack === "function") {
        const track = access.getActiveTrack();
        if (track && track.readyState === "live") {
          track.stop();
        }
      }
      if (access && typeof access.release === "function") {
        access.release();
      }
    } catch {}
  }

  function isValidEAN13(code) {
    const s = String(code || "").replace(/\D/g, "");
    if (s.length !== 13) return false;

    const digits = s.split("").map(Number);
    const check  = digits[12];

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += digits[i] * ((i % 2 === 0) ? 1 : 3);
    }

    const calc = (10 - (sum % 10)) % 10;
    return calc === check;
  }

  let __qbDetectedHandler = null;
  let __qbLastDetected = "";
  let __qbLastDetectedAt = 0;

  async function ensureCameraPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch (e) {
      console.error(e);
      showToast("Camera permission blocked", "error");
      return false;
    }
  }

  async function getBackCameraId() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videos  = devices.filter(d => d.kind === "videoinput");

    console.log("Available cameras:", videos.map(v => v.label || v.deviceId));

    for (const cam of videos) {
      const name = (cam.label || "").toLowerCase();
      if (name.includes("back") || name.includes("rear") || name.includes("usb")) {
        return cam.deviceId;
      }
    }

    return videos[0]?.deviceId || null;
  }

  function detachQuaggaHandlers() {
    try {
      if (window.Quagga && __qbDetectedHandler && Quagga.offDetected) {
        Quagga.offDetected(__qbDetectedHandler);
      }
    } catch {}

    __qbDetectedHandler = null;

    try {
      if (window.Quagga && Quagga.offProcessed) Quagga.offProcessed();
    } catch {}
  }

  async function startBarcodeCamera() {
    stopBarcodeCamera();

    if (!ALL_PRODUCTS || ALL_PRODUCTS.length === 0) {
      showToast("Products not loaded yet", "error");
      return;
    }

    const ok = await ensureCameraPermission();
    if (!ok) return;

    const targetEl = document.querySelector("#barcodeScanner");
    if (!targetEl) {
      showToast("barcodeScanner div not found", "error");
      return;
    }

    const session = barcodeCameraSession;

    cameraModal?.classList.add("show");
    targetEl.innerHTML = "";

    const deviceId = await getBackCameraId();
    if (session !== barcodeCameraSession) return;

    detachQuaggaHandlers();

    if (!window.Quagga) {
      showToast("Quagga library not loaded", "error");
      stopBarcodeCamera();
      return;
    }

    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: targetEl,
        constraints: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      },
      locator: { patchSize: "large", halfSample: true },
      numOfWorkers: 0,
      frequency: 12,
      decoder: {
  readers: [
    "ean_reader",
    "ean_8_reader",
    "upc_reader",
    "upc_e_reader"
  ]
},

      locate: true
    }, function (err) {
      if (session !== barcodeCameraSession) {
        try {
          releaseBarcodeScannerMedia();
          if (window.Quagga) Quagga.stop();
        } catch {}
        return;
      }

      if (err) {
        console.error("Quagga init error:", err);
        showToast("Camera scanner init failed", "error");
        stopBarcodeCamera();
        return;
      }

      Quagga.start();
      quaggaRunning = true;

      __qbDetectedHandler = (result) => {
  const raw = result?.codeResult?.code || "";
  const digits = String(raw).replace(/\D/g, "");

  // EAN-8 / EAN-12 / EAN-13 or product code (4+ digits)
  if (digits.length < 4) return;
  if (digits.length === 13 && !isValidEAN13(digits)) return;

  const now = Date.now();
  if (digits === __qbLastDetected && (now - __qbLastDetectedAt) < 1200) return;

  __qbLastDetected = digits;
  __qbLastDetectedAt = now;

  // Try add (scanAdd already does all fallbacks)
  stopBarcodeCamera();
  __QB_LAST_ADD_SOURCE = "scan";
  scanAdd(digits);
};


      Quagga.onDetected(__qbDetectedHandler);
    });
  }

  function stopBarcodeCamera() {
    barcodeCameraSession += 1;

    try { detachQuaggaHandlers(); } catch {}

    try {
      if (window.Quagga) {
        releaseBarcodeScannerMedia();
        Quagga.stop();
      }
    } catch {}
    quaggaRunning = false;

    const targetEl = document.querySelector("#barcodeScanner");
    if (targetEl) targetEl.innerHTML = "";

    cameraModal?.classList.remove("show");
  }

  // Camera open/close
  scanIcon?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    startBarcodeCamera();
  });

  cameraCloseBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    stopBarcodeCamera();
  });

  cameraModal?.addEventListener("click", (e) => {
    if (e.target === cameraModal) {
      stopBarcodeCamera();
    }
  });
  // =========================================================
// HOLD SUBSYSTEM – Professional POS behavior
// Hold removed only on finalization OR when bill becomes empty (zero items)
// Added Ctrl+D to delete current hold when loaded (with custom modal)
// Added Ctrl+B to open held bill
// Added Ctrl+I to remove selected item
// Custom modals for overwrite and delete confirmation (Ctrl+O / Ctrl+C)
// =========================================================
const holdBillBtn = document.getElementById('holdBillBtn');
const newBillBtn = document.getElementById('newBillBtn');

let isHoldLoaded = false;          // true when a hold is either saved (but not loaded) or currently displayed
let activeBillFromHold = false;    // true only when current working bill was loaded from hold
// selectedRow declared near top of DOMContentLoaded (for Ctrl+I)
let isOverwriteModalOpen = false;  // flag for overwrite modal
let isDeleteModalOpen = false;     // flag for delete modal

// ---------- Row selection (uses row-selected — same as other pages) ----------
function initRowSelection() {
  /* handled by selectRow() on tbody click */
}

function clearSelection() {
  tbody?.querySelectorAll("tr.data-row").forEach((r) => {
    r.classList.remove("row-selected", "selected-row", "selected");
  });
  selectedRow = null;
}

// ---------- Update button states ----------
function updateHoldButtonState() {
  if (!holdBillBtn) return;

  // Enable Hold when current bill has at least 1 item.
  // Overwrite confirmation is handled inside `holdCurrentBill()` via /api/hold-bill.
  const hasItems = getDataRowCount() > 0;
  holdBillBtn.disabled = !hasItems;
  holdBillBtn.classList.toggle("is-disabled", !hasItems);
}

function updateNewButtonState() {
  newBillBtn.disabled = isHoldLoaded;
}

// ---------- Check if bill empty and delete hold ----------
async function deleteHoldIfEmpty() {
  console.log('deleteHoldIfEmpty called, row count:', getDataRowCount());
  if (getDataRowCount() === 0) {
    console.log('Bill empty, deleting hold...');
    try {
      await fetch('/api/hold-bill', { method: 'DELETE' });
      console.log('Hold deleted');
    } catch (err) {
      console.error('Failed to delete hold file', err);
    }
    isHoldLoaded = false;
    await updateHoldButtonState();
    updateNewButtonState();
  }
}

// ---------- Custom Overwrite Modal ----------
const holdOverwriteModal = document.getElementById('holdOverwriteModal');
const holdOverwriteOk = document.getElementById('holdOverwriteOk');
const holdOverwriteCancel = document.getElementById('holdOverwriteCancel');

function showOverwriteModal() {
  return new Promise((resolve) => {
    if (!holdOverwriteModal) {
      resolve(confirm('A held bill already exists. Overwrite?'));
      return;
    }

    isOverwriteModalOpen = true;
    holdOverwriteModal.style.display = 'flex';
    trapFocus(holdOverwriteModal);

    function onOk() {
      cleanup();
      resolve(true);
    }
    function onCancel() {
      cleanup();
      resolve(false);
    }
    function onKeyDown(e) {
      if (!isOverwriteModalOpen) return;
      if (e.ctrlKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        onOk();
      } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    }
    function cleanup() {
      isOverwriteModalOpen = false;
      holdOverwriteModal.style.display = 'none';
      untrapFocus(holdOverwriteModal);
      holdOverwriteOk.removeEventListener('click', onOk);
      holdOverwriteCancel.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKeyDown);
    }

    holdOverwriteOk.addEventListener('click', onOk);
    holdOverwriteCancel.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKeyDown);
  });
}

// ---------- Custom Delete Modal ----------
const holdDeleteModal = document.getElementById('holdDeleteModal');
const holdDeleteOk = document.getElementById('holdDeleteOk');
const holdDeleteCancel = document.getElementById('holdDeleteCancel');

function showDeleteModal() {
  return new Promise((resolve) => {
    if (!holdDeleteModal) {
      resolve(confirm('Are you sure you want to delete this hold?'));
      return;
    }

    isDeleteModalOpen = true;
    holdDeleteModal.style.display = 'flex';
    trapFocus(holdDeleteModal);

    function onOk() {
      cleanup();
      resolve(true);
    }
    function onCancel() {
      cleanup();
      resolve(false);
    }
    function onKeyDown(e) {
      if (!isDeleteModalOpen) return;
      if (e.ctrlKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        onOk();
      } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    }
    function cleanup() {
      isDeleteModalOpen = false;
      holdDeleteModal.style.display = 'none';
      untrapFocus(holdDeleteModal);
      holdDeleteOk.removeEventListener('click', onOk);
      holdDeleteCancel.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKeyDown);
    }

    holdDeleteOk.addEventListener('click', onOk);
    holdDeleteCancel.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKeyDown);
  });
}

// ---------- Load held bill (does NOT delete the hold file) ----------
async function loadHeldBill() {
  try {
    const res = await fetch('/api/hold-bill');
    const data = await res.json();
    if (!res.ok || !data.held) {
      showToast('No held bill', 'error');
      await updateHoldButtonState();
      return;
    }

    const holdData = data.bill;
    clearBillState();

    if (Array.isArray(holdData.items)) {
      holdData.items.forEach(item => {
        const product = BY_CODE.get(String(item.code || '').toUpperCase());
        if (product) {
          addRowFromProduct(product, item.qty || 1, { silent: true });
        }
      });
    }

    if (holdData.paymentMode && paymentMode) {
      paymentMode.value = holdData.paymentMode;
      if (holdData.paymentMode === 'Multiple' && holdData.paymentDetail) {
        localStorage.setItem('qb_payment_detail', JSON.stringify(holdData.paymentDetail));
      } else {
        localStorage.removeItem('qb_payment_detail');
      }
    }

    refreshFooterUI();
    showToast('Hold bill loaded', 'success');

    isHoldLoaded = true;
    activeBillFromHold = true;
    updateNewButtonState();
    await updateHoldButtonState();
    clearSelection();
  } catch (err) {
    showToast('Error loading hold', 'error');
  }
}

// ---------- Save current bill (overwrites any previous hold) ----------
async function holdCurrentBill() {
  if (getDataRowCount() === 0) {
    showToast('No items to hold', 'error');
    return;
  }

  // Check if a hold already exists
  try {
    const checkRes = await fetch('/api/hold-bill');
    const checkData = await checkRes.json();
    if (checkData.held) {
      const shouldOverwrite = await showOverwriteModal();
      if (!shouldOverwrite) {
        return; // user cancelled
      }
    }
  } catch (err) {
    console.error('Error checking hold existence', err);
    showToast('Error checking hold status', 'error');
    return;
  }

  // Gather items from table
  const rows = document.querySelectorAll('#billingTableBody tr.data-row');
  const items = [];
  rows.forEach(row => {
    items.push({
      code: row.dataset.code,
      qty: Number(row.querySelector('.qty-input')?.value || 1)
    });
  });

  const paymentModeValue = paymentMode?.value || '';
  let paymentDetail = null;
  if (paymentModeValue === 'Multiple') {
    const raw = localStorage.getItem('qb_payment_detail');
    if (raw) {
      try { paymentDetail = JSON.parse(raw); } catch {}
    }
  }

  const payload = { items, paymentMode: paymentModeValue, paymentDetail };

  try {
    const res = await fetch('/api/hold-bill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to hold bill');

    showToast('Bill held', 'success');
    // clearBillState();
    isHoldLoaded = true;
    activeBillFromHold = false;
    await updateHoldButtonState();
    updateNewButtonState();
    clearSelection();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------- New bill (clear current, but do NOT delete hold file) ----------
async function newBill() {
  clearBillState();
  isHoldLoaded = false;
  activeBillFromHold = false;
  await updateHoldButtonState();
  updateNewButtonState();
  clearSelection();
}

// ---------- Finalize bill – delete hold file ----------
async function finalizeAndRemoveHold() {
  try {
    await fetch('/api/hold-bill', { method: 'DELETE' });
  } catch (err) {
    console.error('Failed to delete hold file', err);
  }
  isHoldLoaded = false;
  activeBillFromHold = false;
  await updateHoldButtonState();
  updateNewButtonState();
  clearSelection();
}

// ---------- Delete current hold (Ctrl+D) with custom modal ----------
async function deleteCurrentHold() {
  if (!isHoldLoaded) {
    showToast('No hold bill is currently loaded', 'error');
    return;
  }

  const confirmed = await showDeleteModal();
  if (!confirmed) return;

  try {
    await fetch('/api/hold-bill', { method: 'DELETE' });
    showToast('Hold bill deleted', 'success');
    clearBillState();
    isHoldLoaded = false;
    activeBillFromHold = false;
    await updateHoldButtonState();
    updateNewButtonState();
    clearSelection();
  } catch (err) {
    console.error('Failed to delete hold file', err);
    showToast('Error deleting hold bill', 'error');
  }
}

// ---------- Remove selected item (Ctrl+I) ----------
async function removeSelectedItem() {
  if (!selectedRow) {
    showToast('Please select an item to remove', 'error');
    return;
  }
  const removeBtn = selectedRow.querySelector('.row-remove-btn');
  if (removeBtn) {
    removeBtn.click();
  } else {
    showToast('Remove button not found', 'error');
  }
}

// ---------- Attach click events ----------
holdBillBtn.addEventListener('click', async () => {
  if (holdBillBtn.disabled) return;
  await loadHeldBill();
});

newBillBtn.addEventListener('click', async () => {
  if (newBillBtn.disabled) return;
  await newBill();
});

// ---------- Keyboard shortcuts (blocked when any modal open) ----------
document.addEventListener('keydown', (e) => {
  if (isOverwriteModalOpen || isDeleteModalOpen) return;

  if (!e.ctrlKey) return;

  const key = e.key.toLowerCase();
  if (['h', 'e', 'd', 'b', 'i'].includes(key)) {
    e.preventDefault();
  }

  if (key === 'h') {
    holdCurrentBill();
  } else if (key === 'e') {
    newBill();
  } else if (key === 'd') {
    deleteCurrentHold();
  } else if (key === 'b') {
    loadHeldBill();
  } else if (key === 'i') {
    removeSelectedItem();
  }
});

// ---------- Finalize listener (integrated) ----------
finalizeOk.addEventListener('click', async () => {
  const mode = String(paymentMode?.value || '').trim();
  if (!mode) { showToast('Select Payment Mode', 'error'); return; }
  if (mode === 'Multiple' && !localStorage.getItem('qb_payment_detail')) {
    showToast('Enter Multiple payment split', 'error'); return;
  }
  localStorage.setItem('qb_payment_mode', mode);
  finalizeModal?.classList.remove('show');

  const ok = await saveBillToServer();
  if (!ok) return;

  // Delete hold only when the current bill actually came from a loaded hold.
  // This keeps a separately held bill safe while you complete another new bill.
  if (activeBillFromHold) {
    await finalizeAndRemoveHold();
  } else {
    await updateHoldButtonState();
    updateNewButtonState();
  }

  doPrintIframe();
  setTimeout(() => {
    clearBillState();
    showToast('Bill completed', 'success');
  }, 900);
});

// ---------- Initialize row selection ----------
initRowSelection();

// ---------- Initial state ----------
updateHoldButtonState();
updateNewButtonState(); // New button enabled on page load


/* =========================================================
     23) INIT (ONLY ONE)
 ========================================================= */

  (async () => {
    try {
      await loadProductsOnPageLoad();
      restoreCartToTable();
      tryRestoreFromDeleted();
      refreshFooterUI();
    } catch (e) {
      console.error(e);
      showToast("Unable to load products (API error)", "error");
      refreshFooterUI();
    }
  })();

/* ✅ Listeners (attach once) */
const cashReceivedInput = document.getElementById("cashReceived");
cashReceivedInput?.addEventListener("input", qbUpdatePaymentPanel);

const clearPaymentBtn = document.getElementById("clearPaymentBtn");
clearPaymentBtn?.addEventListener("click", () => {
  clearBillState();
  clearSelection();
});

/* ✅ Initial fill */
initQbInvoiceTotalFitObserver();
qbUpdatePaymentPanel();
updatePaymentUIByMode();

let qbInvoiceTotalFitTimer;
window.addEventListener("resize", () => {
  clearTimeout(qbInvoiceTotalFitTimer);
  qbInvoiceTotalFitTimer = setTimeout(fitQbInvoiceTotalFont, 80);
});

});