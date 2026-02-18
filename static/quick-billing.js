document.addEventListener("DOMContentLoaded", () => {
  /* =========================================================
     1) ELEMENTS
  ========================================================= */

  // Scan input
  const scanInput = document.getElementById("scanInput");
  const scanIcon  = document.querySelector(".scan-icon");

  // Billing table
  const tbody     = document.getElementById("billingTableBody");
  const noDataRow = document.getElementById("noDataRow");
  const showingEl = document.getElementById("showingCount");

  // Inputs + datalist
  const productCodeInput  = document.getElementById("productCodeInput");
  const productCodeList   = document.getElementById("productCodeList");
  const productNameInput  = document.getElementById("productNameInput");
  const productNameList   = document.getElementById("productNameList");

  // Filters
  const categoryFilter = document.getElementById("categoryFilter");
  const featuresFilter = document.getElementById("featuresFilter");
  const paymentMode    = document.getElementById("paymentMode");
  const clearFilterBtn = document.getElementById("clearFilterBtn");

  // Buttons
  const deletedBtn = document.getElementById("deletedBtn");
  const printBtn   = document.getElementById("printBtn");

  // Print area
  const printArea  = document.getElementById("printArea");

  // Toast
  const qbToast    = document.getElementById("qbToast");
  const qbToastMsg = document.getElementById("qbToastMsg");
  let toastTimer = null;

  // Pager (UI only)
  const prevBtn     = document.getElementById("prevBtn");
  const nextBtn     = document.getElementById("nextBtn");
  const pageNowEl   = document.getElementById("pageNow");
  const pageTotalEl = document.getElementById("pageTotal");
  const ROWS_PER_PAGE = 10;

  // Camera modal
  const cameraModal    = document.getElementById("cameraScannerModal");
  const cameraCloseBtn = document.getElementById("cameraCloseBtn");

 


  // Track last add source (manual vs scan)
  let __QB_LAST_ADD_SOURCE = "manual"; // "manual" | "scan"

  /* =========================================================
     2) STORAGE KEYS + BASIC HELPERS
  ========================================================= */

  const CART_KEY  = "qb_cart_items";
  const MULTI_KEY = "qb_payment_detail";

  const num   = (v) => Number(v || 0);
  const money = (v) => num(v).toFixed(2);

  function showToast(message, type = "error") {
    if (!qbToast || !qbToastMsg) return;

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
     3) DELETED ITEMS STORAGE
  ========================================================= */

  function getDeletedItems() {
    try { return JSON.parse(localStorage.getItem("qb_deleted_items") || "[]"); }
    catch { return []; }
  }

  function setDeletedItems(items) {
    localStorage.setItem("qb_deleted_items", JSON.stringify(items));
  }

  /* =========================================================
     4) CART STORAGE
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

  function updateSerialNumbers() {
    if (!tbody) return;

    const rows = tbody.querySelectorAll("tr.data-row");
    rows.forEach((row, index) => {
      const snoCell = row.querySelector(".col-sno");
      if (snoCell) snoCell.textContent = String(index + 1);
    });
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

    if (sumTaxableEl)  sumTaxableEl.textContent  = taxableSum.toFixed(2);
    if (sumTaxEl)      sumTaxEl.textContent      = totalTax.toFixed(2);
    if (sumTotalAmtEl) sumTotalAmtEl.textContent = totalAmount.toFixed(2);
    if (sumRoundOffEl) sumRoundOffEl.textContent = r.roundOffValue;
    if (sumInvoiceEl)  sumInvoiceEl.textContent  = r.roundedAmount;
  }

  /* =========================================================
     9) PAGINATION UI (UI-ONLY)
  ========================================================= */

  function updatePagerButtons() {
    const pageNow   = parseInt(pageNowEl?.textContent || "1", 10);
    const pageTotal = parseInt(pageTotalEl?.textContent || "1", 10);

    if (pageTotal <= 1) {
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    if (prevBtn) prevBtn.disabled = pageNow <= 1;
    if (nextBtn) nextBtn.disabled = pageNow >= pageTotal;
  }

  function updateShowingText() {
    if (!showingEl || !tbody) return;

    const totalRows = tbody.querySelectorAll("tr.data-row").length;

    if (totalRows === 0) {
      showingEl.textContent = "Showing 0 Entries";
      return;
    }

    const currentPage = parseInt(pageNowEl?.textContent || "1", 10);
    const start = (currentPage - 1) * ROWS_PER_PAGE + 1;
    const end   = Math.min(start + ROWS_PER_PAGE - 1, totalRows);

    showingEl.textContent = `Showing ${start}–${end} of ${totalRows} Entities`;
  }

  /* =========================================================
   QB PAYMENT PANEL: Total auto-fill + Change auto-calc
========================================================= */

function qbParseNumber(val) {
  return Number(String(val || "").replace(/[^\d.-]/g, "")) || 0;
}

function qbFormatINR(amount) {
  const n = Math.round((Number(amount) || 0) * 100) / 100;
  return "₹" + n.toFixed(2);
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

  totalBox.value = qbFormatINR(total);

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
  // ✅ always fetch fresh (avoid scope/timing issue)
  const pm = document.getElementById("paymentMode");
  const mode = String(pm?.value || "").trim();

  const panel = document.getElementById("qbPaymentPanel");
  if (!panel) return;

  const cashReceived = document.getElementById("cashReceived");
  const changeReturn = document.getElementById("changeReturn");
  const qbBillTotal  = document.getElementById("qbBillTotal");
  const payHint      = document.getElementById("payHint");

  if (mode === "Cash") {
    panel.style.display = "";     // show
    qbUpdatePaymentPanel();
  } else {
    panel.style.display = "none"; // hide
    if (cashReceived) cashReceived.value = "";
    if (changeReturn) changeReturn.value = "₹0.00";
    if (qbBillTotal)  qbBillTotal.value  = "₹0.00";
    if (payHint)      payHint.textContent = "";
  }
}


  function refreshFooterUI() {
    updateNoDataRow();
    updatePagerButtons();
    updateShowingText();
    updateMiniSummary();
    // ✅ Payment panel total auto-fill + balance calc
    qbUpdatePaymentPanel();
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

    if (code) BY_CODE.set(code, p);
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

  function fillProductCodeDatalist(products) {
    if (!productCodeList) return;

    productCodeList.innerHTML = "";
    products.forEach((p) => {
      const code = pickCode(p);
      if (!code) return;

      const opt = document.createElement("option");
      opt.value = code;
      productCodeList.appendChild(opt);
    });
  }

  function fillProductNameDatalist(products) {
    if (!productNameList) return;

    productNameList.innerHTML = "";
    products.forEach((p) => {
      const name = pickName(p);
      if (!name) return;

      const opt = document.createElement("option");
      opt.value = name;
      productNameList.appendChild(opt);
    });
  }

  function uniq(arr) {
    return Array.from(new Set(arr.filter(Boolean)));
  }

  function setSelectOptions(selectEl, label, values) {
    if (!selectEl) return;

    selectEl.innerHTML = "";

    const first = document.createElement("option");
    first.value = "";
    first.selected = true;
    first.textContent = label;
    selectEl.appendChild(first);

    values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
    });
  }

  function refreshCategoryAndFeaturesLists(products) {
    const cats = uniq(products.map(getCategory));
    setSelectOptions(categoryFilter, "Categories", cats);

    const featList = [];
    products.forEach((p) => {
      const f = getFeatures(p);
      if (!f) return;

      f.split(",")
        .map(x => x.trim())
        .filter(Boolean)
        .forEach(x => featList.push(x));
    });

    setSelectOptions(featuresFilter, "Features", uniq(featList));
  }

  async function loadProductsOnPageLoad() {
    const res = await fetch("/api/products/qb");
    const data = await res.json();

    if (!res.ok || !data.success) throw new Error(data.message || "Products API error");

    ALL_PRODUCTS = Array.isArray(data.products) ? data.products : [];
    buildIndexes(ALL_PRODUCTS);

    fillProductCodeDatalist(ALL_PRODUCTS);
    fillProductNameDatalist(ALL_PRODUCTS);
    refreshCategoryAndFeaturesLists(ALL_PRODUCTS);
  }

  /* =========================================================
     11) ADD ROW FLOW
  ========================================================= */

  function resetInputsOnly() {
    if (productCodeInput) productCodeInput.value = "";
    if (productNameInput) productNameInput.value = "";

    fillProductCodeDatalist(ALL_PRODUCTS);
    fillProductNameDatalist(ALL_PRODUCTS);
  }

  function focusQtyAndBindEnter(qtyInput) {
    if (!qtyInput) return;

    qtyInput.focus();
    qtyInput.select?.();

    // Enter press flow
    qtyInput.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;

      e.preventDefault();
      e.stopPropagation();

      // Update totals
      qtyInput.dispatchEvent(new Event("input", { bubbles: true }));

      // Clear product inputs
      if (productCodeInput) productCodeInput.value = "";
      if (productNameInput) productNameInput.value = "";
      
      // ✅ Clear dropdown filters also
      // ✅ Clear category + feature dropdowns properly
resetCategoryAndFeatures();

// ✅ Ensure datalists also full reset
fillProductNameDatalist(ALL_PRODUCTS);
fillProductCodeDatalist(ALL_PRODUCTS);

      setTimeout(() => {
        if (__QB_LAST_ADD_SOURCE === "scan") {
          // Scan flow: clear scan input and ready for next scan
          if (scanInput) {
            scanInput.value = "";
            scanInput.focus();
            scanInput.select?.();
          }
        } else {
          // Manual flow: back to product name
          productNameInput?.focus();
          productNameInput?.select?.();
        }
      }, 0);
    }, { once: true });

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
          productNameInput?.select?.();
        }
      }, 0);
    }

    qtyInput.addEventListener("change", focusBackAfterQty);
    qtyInput.addEventListener("blur", focusBackAfterQty);
  }

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

    tr.innerHTML = `
      <td class="col-sno">1</td>
      <td class="col-code">${code}</td>
      <td class="col-name">${name}</td>
      <td class="col-qty">
        <input type="number" min="1" value="${qtyDefault}" class="qty-input">
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

    updateSerialNumbers();
    refreshFooterUI();
    saveCartToStorage();

    const qtyInput = tr.querySelector(".qty-input");
    window.__QB_LAST_QTY_INPUT = qtyInput;

    qtyInput?.addEventListener("input", () => {
      const qty = Math.max(parseInt(qtyInput.value || "1", 10) || 1, 1);
      const c2 = calc(qty, unitPrice, discountPercent, cgstRate, sgstRate);

      tr.querySelector(".col-taxable").textContent = money(c2.taxable);
      tr.querySelector(".col-cgst").textContent    = money(c2.cgstAmt);
      tr.querySelector(".col-sgst").textContent    = money(c2.sgstAmt);
      tr.querySelector(".col-total").textContent   = money(c2.total);

      refreshFooterUI();
      saveCartToStorage();
    });

    qtyInput?.addEventListener("change", resetInputsOnly);
    qtyInput?.addEventListener("blur", () => setTimeout(() => resetInputsOnly(), 0));

    tr.querySelector(".row-remove-btn")?.addEventListener("click", () => {
      const qtyVal = tr.querySelector(".qty-input")?.value || "1";

      const deleted = getDeletedItems();
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
      setDeletedItems(deleted);

      tr.remove();
      updateSerialNumbers();
      refreshFooterUI();
      saveCartToStorage();

      showToast(`${name} moved to Deleted Items`, "success");
    });

    focusQtyAndBindEnter(qtyInput);

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
  }
function resetCategoryAndFeatures() {
  if (categoryFilter) {
    categoryFilter.value = "";
    categoryFilter.selectedIndex = 0;
  }
  if (featuresFilter) {
    featuresFilter.value = "";
    featuresFilter.selectedIndex = 0;
  }

  fillProductNameDatalist(ALL_PRODUCTS);
  fillProductCodeDatalist(ALL_PRODUCTS);
}

  /* =========================================================
     12) FILTERS
  ========================================================= */

  function applyFilterAndShowNames() {
    let filtered = [...ALL_PRODUCTS];
    const cat  = String(categoryFilter?.value || "").trim();
    const feat = String(featuresFilter?.value || "").trim();

    if (cat) filtered = filtered.filter((p) => getCategory(p) === cat);

    if (feat) {
      filtered = filtered.filter((p) => {
        const all = getFeatures(p);
        return all.split(",").map((x) => x.trim()).includes(feat);
      });
    }

    fillProductNameDatalist(filtered);
    fillProductCodeDatalist(filtered);
  }

  categoryFilter?.addEventListener("change", applyFilterAndShowNames);
  featuresFilter?.addEventListener("change", applyFilterAndShowNames);

  /* =========================================================
     13) DATALIST SELECTION (NO DOUBLE ADD)
  ========================================================= */

  function isExactDatalistMatch(inputEl, listEl) {
    if (!inputEl || !listEl) return false;

    const v = String(inputEl.value || "").trim();
    if (!v) return false;

    return Array.from(listEl.options).some(opt => String(opt.value || "").trim() === v);
  }

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
    ensureOption(featuresFilter, "Features", feat);

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
    ensureOption(featuresFilter, "Features", feat);

    __QB_LAST_ADD_SOURCE = "manual";

    addRowFromProduct(p);
    refreshFooterUI();
  }

  // Product name input events
  productNameInput?.addEventListener("input", () => {
    if (isExactDatalistMatch(productNameInput, productNameList)) {
      handleProductNameSelection("input");
    }
  });

  productNameInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleProductNameSelection("enter");
    }
  });

  productNameInput?.addEventListener("blur", () => {
    if (isExactDatalistMatch(productNameInput, productNameList)) {
      handleProductNameSelection("blur");
    }
  });

  // Product code input events
  productCodeInput?.addEventListener("input", () => {
    productCodeInput.value = String(productCodeInput.value || "").toUpperCase();
    if (isExactDatalistMatch(productCodeInput, productCodeList)) {
      handleProductCodeSelection("input");
    }
  });

  productCodeInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleProductCodeSelection("enter");
    }
  });

  productCodeInput?.addEventListener("blur", () => {
    if (isExactDatalistMatch(productCodeInput, productCodeList)) {
      handleProductCodeSelection("blur");
    }
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


  // Block manual typing in scan input; allow only paste
  scanInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      showToast("Use scanner paste (Ctrl+V) to add", "error");
      if (scanInput) scanInput.value = "";
      return;
    }

    if (e.key === "Tab" || e.key === "Backspace") return;

    const k = e.key;
    const isPaste = (e.ctrlKey || e.metaKey) && (k.toLowerCase() === "v" || k === "Insert");
    if (isPaste) return;

    e.preventDefault();
    showToast("Scan only", "error");
  });

  scanInput?.addEventListener("paste", (e) => {
    e.preventDefault();

    const pasted = (e.clipboardData || window.clipboardData)?.getData("text") || "";
    const code = String(pasted).trim().toUpperCase();
    if (!code) return;

    scanAdd(code);
  });

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
            .quick-billing-tabs,.quick-billing-header,.qb-bottom-row,.qb-toast { display:none !important; }
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
            .inv-table{ margin-left:auto; border-collapse:collapse; font-size:12px; }
            .inv-table td{ padding:2px 6px; }
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
  });

  /* =========================================================
     17) FINALIZE BILL FLOW
  ========================================================= */

  const finalizeBtn    = document.getElementById("finalizeBtn");
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
    if (totalEl)  totalEl.value = "₹0.00";
    if (hintEl)   hintEl.textContent = "";
    refreshFooterUI();
    productNameInput?.focus();
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

  finalizeOk?.addEventListener("click", () => {
    const mode = String(paymentMode?.value || "").trim();
    if (!mode) {
      showToast("Select Payment Mode", "error");
      return;
    }

    if (mode === "Multiple") {
      const raw = localStorage.getItem("qb_payment_detail");
      if (!raw) {
        showToast("Enter Multiple payment split", "error");
        return;
      }
    }

    localStorage.setItem("qb_payment_mode", mode);
    finalizeModal?.classList.remove("show");

    doPrintIframe();

    setTimeout(() => {
      clearBillState();
      showToast("Bill completed", "success");
    }, 900);
  });

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
  if (featuresFilter) featuresFilter.value = "";

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
  if (totalEl)  totalEl.value = "₹0.00";
  if (hintEl)   hintEl.textContent = "";

  // ✅ rebuild dropdown options from ALL_PRODUCTS
  refreshCategoryAndFeaturesLists(ALL_PRODUCTS);
  fillProductCodeDatalist(ALL_PRODUCTS);
  fillProductNameDatalist(ALL_PRODUCTS);

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
    refreshFooterUI();
    productNameInput?.focus();
  }

  /* =========================================================
     20) DELETED PAGE LINK + RESTORE SUPPORT
  ========================================================= */

  deletedBtn?.addEventListener("click", () => {
    window.location.href = "/quick-billing/deleted";
  });

  function tryRestoreFromDeleted() {
    const raw = localStorage.getItem("qb_restore_request");
    if (!raw) return;

    localStorage.removeItem("qb_restore_request");

    let item;
    try { item = JSON.parse(raw); } catch { return; }
    if (!item?.code) return;

    const p = BY_CODE.get(String(item.code).toUpperCase());
    if (!p) return;

    addRowFromProduct(p, item.qty || 1);
    refreshFooterUI();
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
    if (!ALL_PRODUCTS || ALL_PRODUCTS.length === 0 || BY_BARCODE.size === 0) {
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

    cameraModal?.classList.add("show");
    targetEl.innerHTML = "";

    const deviceId = await getBackCameraId();

    detachQuaggaHandlers();

    if (!window.Quagga) {
      showToast("Quagga library not loaded", "error");
      cameraModal?.classList.remove("show");
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
      if (err) {
        console.error("Quagga init error:", err);
        showToast("Camera scanner init failed", "error");
        cameraModal?.classList.remove("show");
        return;
      }

      Quagga.start();
      quaggaRunning = true;

      __qbDetectedHandler = (result) => {
  const raw = result?.codeResult?.code || "";
  const digits = String(raw).replace(/\D/g, "");

  // Accept only 12 or 13 digits
  if (!(digits.length === 12 || digits.length === 13)) return;

  // If 13 digits, checksum must be valid (prevents wrong reads)
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
    try { detachQuaggaHandlers(); } catch {}

    try {
      if (window.Quagga && quaggaRunning) Quagga.stop();
    } catch {}
    quaggaRunning = false;

    const video = document.querySelector("#barcodeScanner video");
    const stream = video?.srcObject;
    if (stream?.getTracks) stream.getTracks().forEach(t => t.stop());
    if (video) video.srcObject = null;

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
  if (cashReceivedInput) cashReceivedInput.value = "";
  qbUpdatePaymentPanel();
});

/* ✅ Initial fill */
qbUpdatePaymentPanel();
updatePaymentUIByMode();

});