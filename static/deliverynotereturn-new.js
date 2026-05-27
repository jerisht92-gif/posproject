/* =============
DNR validation 
================*/

const DNR_CUSTOMER_REF_MIN = 3;
const DNR_CUSTOMER_REF_MAX = 30;
const DNR_CUSTOMER_REF_PATTERN = /^[A-Za-z0-9\-_/ ]+$/;
const DNR_ID_PATTERN = /^DNR-[0-9]+$/;

function validateDnrId(){

  const el =
    document.getElementById("dnrId");

  if(!el)
    return true;

  const val =
    el.value.trim();

  if(!val){

    showToast(
      "DNR ID is required",
      "error"
    );

    return false;

  }

  if(!DNR_ID_PATTERN.test(val)){

    showToast(
      "Invalid DNR ID format.",
      "error"
    );

    return false;

  }

  return true;

}

/* =========================================================
DNR ID — ensure auto id on new / edit form routes
========================================================= */

async function ensureDnrId(){

  const el = document.getElementById("dnrId");

  if(!el || el.value.trim())
    return;

  const urlId = new URLSearchParams(window.location.search)
      .get("id");

  if(urlId){

    el.value = urlId.trim();
    return;

  }

  try{

    const res = await fetch(
        "/api/delivery-note-return/next-id"
      );

    const data =
      await res.json();

    if(data && data.success && data.dnr_id)
      el.value = data.dnr_id;

  }
  catch(err){

    console.error(
      "DNR ID generate error:",
      err
    );

  }

}

ensureDnrId();

/* =========================================================
CURRENT DATE
========================================================= */

/* =========================================================
LIVE DATE VALIDATION
========================================================= */

const DNR_INVALID_DATE_MSG = "Invalid date. Use format DD-MM-YYYY (e.g. 31-05-2026).";

const DNR_EMPTY_DATE_MSG = "Please select DNR date.";

const DNR_DATE_TODAY_MSG = "DNR date must be today's date.";

const dnrDate = document.getElementById("dnrDate");

const dateError = document.getElementById("dateError");

function setDnrFieldError(el, message){

  if(!el)
    return;

  const msg =
    (message || "").trim();

  if(msg){

    el.textContent = msg;
    el.hidden = false;
    el.classList.add("is-visible");

  }
  else{

    el.textContent = "";
    el.hidden = true;
    el.classList.remove("is-visible");

  }

}

function formatDnrTodayIso(){

  const t = new Date();

  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;

}

function isDnrDateTodayValue(value){

  const v = String(value || "").trim();

  return !!v && v === formatDnrTodayIso();

}

function dnrDateRequiresToday(){

  const pageMode =
    new URLSearchParams(window.location.search).get("mode");

  const urlId =
    new URLSearchParams(window.location.search).get("id");

  if(
    pageMode === "view-submitted" ||
    pageMode === "view-cancelled" ||
    pageMode === "view"
  ){
    return false;
  }

  /* Draft edit: keep the date already saved on the record */
  if(pageMode === "edit" && urlId)
    return false;

  return !urlId;

}

/**
 * New DNR: readonly, today only.
 * Draft edit: min/max today (calendar cannot pick other days).
 * Submitted/Cancelled/view: readonly (preserve loaded date).
 */
function configureDnrDateField(opts){

  if(!dnrDate)
    return;

  const preserveValue =
    !!(opts && opts.preserveValue);

  const todayIso =
    formatDnrTodayIso();

  const pageMode =
    new URLSearchParams(window.location.search).get("mode");

  const urlId =
    new URLSearchParams(window.location.search).get("id");

  const viewOnly =
    pageMode === "view-submitted" ||
    pageMode === "view-cancelled" ||
    pageMode === "view";

  const isEditDraft =
    pageMode === "edit" && !!urlId;

  const isNew =
    !urlId && pageMode !== "edit";

  clearDnrDateNativeValidity();

  if(viewOnly){

    dnrDate.readOnly = true;
    dnrDate.removeAttribute("min");
    dnrDate.removeAttribute("max");
    dnrDate.classList.add("dnr-locked-field");

    return;

  }

  if(!preserveValue)
    dnrDate.value = todayIso;

  dnrDate.setAttribute("min", todayIso);
  dnrDate.setAttribute("max", todayIso);

  if(isNew){

    dnrDate.readOnly = true;
    dnrDate.classList.add("dnr-locked-field");

    return;

  }

  if(isEditDraft){

    dnrDate.readOnly = false;
    dnrDate.classList.remove("dnr-locked-field");
    dnrDate.removeAttribute("min");
    dnrDate.removeAttribute("max");

    return;

  }

  dnrDate.readOnly = true;
  dnrDate.classList.add("dnr-locked-field");

}

/** API DD-MM-YYYY (or ISO) → value for type="date" (YYYY-MM-DD). */
function dnrDateApiToIso(val){

  const s = String(val || "").trim();
  if(!s)
    return "";

  const iso = s.split("T")[0];
  if(/^\d{4}-\d{2}-\d{2}$/.test(iso))
    return iso;

  const dm = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if(dm)
    return `${dm[3]}-${dm[2]}-${dm[1]}`;

  return "";

}

/** type="date" value (YYYY-MM-DD) → API DD-MM-YYYY. */
function dnrDateIsoToApi(iso){

  const s = String(iso || "").trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s))
    return "";

  const [y, m, d] = s.split("-");
  return `${d}-${m}-${y}`;

}

function isValidDNRDateString(value){

  if(!value || typeof value !== "string")
    return false;

  const trimmed = value.trim();

  if(!/^\d{4}-\d{2}-\d{2}$/.test(trimmed))
    return false;

  const parts = trimmed.split("-");

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);

  if(y < 1900 || y > 2100)
    return false;

  const date = new Date(y, m, d);

  if(
    date.getFullYear() !== y ||
    date.getMonth() !== m ||
    date.getDate() !== d
  ){
    return false;
  }

  return true;

}

function clearDnrDateNativeValidity(){

  if(dnrDate)
    dnrDate.setCustomValidity("");

}

/** Clamp year segment to max 4 digits while typing (same as quotation expiry date). */
function attachDnrYearClamp(input){

  if(!input)
    return;

  input.addEventListener("input", function(){

    let v = input.value || "";
    v = v.replace(/[^\d-]/g, "");

    const iso = v.match(/^(\d{4,})-(\d{2})-(\d{2})$/);
    if(iso){
      const year = iso[1].slice(0, 4);
      input.value = `${year}-${iso[2]}-${iso[3]}`;
      return;
    }

    const lastDash = v.lastIndexOf("-");
    if(lastDash !== -1){
      const prefix = v.slice(0, lastDash + 1);
      let yearPart = v.slice(lastDash + 1).replace(/\D/g, "");
      if(yearPart.length > 4)
        yearPart = yearPart.slice(0, 4);
      input.value = prefix + yearPart;
      return;
    }

    const m = v.match(/^(\d{0,4})\d*$/);
    input.value = m ? m[1] : v;

  });

}

function validateDNRDate(){

  if(!dnrDate)
    return false;

  clearDnrDateNativeValidity();

  let dv = dnrDate.value.trim();

  const mDigits = dv.match(/(\d{4})\d+/);
  if(mDigits){
    dv = dv.replace(/(\d{4})\d+/, "$1");
    dnrDate.value = dv;
  }

  const badInput =
    !!dnrDate.validity?.badInput;

  if(!isValidDNRDateString(dv)){

    dnrDate.classList.add(
      "input-invalid"
    );

    const msg =
      !dv && !badInput
        ? DNR_EMPTY_DATE_MSG
        : DNR_INVALID_DATE_MSG;

    setDnrFieldError(
      dateError,
      msg
    );

    return false;

  }

  if(
    dnrDateRequiresToday() &&
    !isDnrDateTodayValue(dv)
  ){

    dnrDate.classList.add(
      "input-invalid"
    );

    setDnrFieldError(
      dateError,
      DNR_DATE_TODAY_MSG
    );

    return false;

  }

  dnrDate.classList.remove(
    "input-invalid"
  );

  setDnrFieldError(dateError, "");

  return true;

}

if(dnrDate){

  attachDnrYearClamp(dnrDate);
  clearDnrDateNativeValidity();

  dnrDate.addEventListener(
    "input",
    validateDNRDate
  );

  dnrDate.addEventListener(
    "change",
    validateDNRDate
  );

  dnrDate.addEventListener(
    "blur",
    validateDNRDate
  );

  dnrDate.addEventListener(
    "invalid",
    (e) => {

      e.preventDefault();
      validateDNRDate();

    }
  );

}

/* =========================================================
CUSTOMER REF NO — 3–30 chars (DNR_CUSTOMER_REF_*)
========================================================= */

const DNR_CUSTOMER_REF_DISALLOWED =
  /[@#$%^&*()+]/g;

const DNR_CUSTOMER_REF_MSG_CHARS =
  "Only letters, numbers, hyphen (-), underscore (_), and slash (/) are allowed in Customer Ref No.";

const DNR_CUSTOMER_REF_MSG_LEN =
  "Customer Ref No must be between 3 and 30 characters.";

const customerRefEl =
  document.getElementById("customerRef");

const customerRefError =
  document.getElementById("customerRefError");

function sanitizeCustomerRefValue(raw){

  return String(raw || "")
    .replace(DNR_CUSTOMER_REF_DISALLOWED,"")
    .replace(/[^A-Za-z0-9\-_/ ]/g,"")
    .slice(0,DNR_CUSTOMER_REF_MAX);

}

function validateCustomerRef(showInlineError = true){

  if(!customerRefEl)
    return true;

  const val =
    customerRefEl.value.trim();

  if(!val){

    customerRefEl.classList.remove("input-invalid");
    customerRefEl.removeAttribute("aria-describedby");

    setDnrFieldError(customerRefError, "");

    return true;

  }

  const lenOk =
    val.length >= DNR_CUSTOMER_REF_MIN &&
    val.length <= DNR_CUSTOMER_REF_MAX;

  const charsOk =
    DNR_CUSTOMER_REF_PATTERN.test(val);

  if(lenOk && charsOk){

    customerRefEl.classList.remove("input-invalid");
    customerRefEl.removeAttribute("aria-describedby");

    setDnrFieldError(customerRefError, "");

    return true;

  }

  if(showInlineError){

    customerRefEl.classList.add("input-invalid");
    customerRefEl.setAttribute(
      "aria-describedby",
      "customerRefError"
    );

    setDnrFieldError(
      customerRefError,
      !charsOk
        ? DNR_CUSTOMER_REF_MSG_CHARS
        : DNR_CUSTOMER_REF_MSG_LEN
    );

  }
  else{

    setDnrFieldError(customerRefError, "");

  }

  return false;

}

if(customerRefEl){

  customerRefEl.addEventListener(
    "input",
    ()=>{

      const start =
        customerRefEl.selectionStart;

      const before =
        customerRefEl.value;

      const cleaned =
        sanitizeCustomerRefValue(before);

      if(cleaned !== before){

        customerRefEl.value = cleaned;

        const pos =
          Math.max(
            0,
            (start || 0) -
              (before.length - cleaned.length)
          );

        customerRefEl.setSelectionRange(pos,pos);

      }

      validateCustomerRef(true);

    }
  );

  customerRefEl.addEventListener(
    "blur",
    ()=>{
      validateCustomerRef(true);
    }
  );

  customerRefEl.addEventListener(
    "paste",
    e=>{

      e.preventDefault();

      const paste =
        (e.clipboardData || window.clipboardData)
          .getData("text") || "";

      const start =
        customerRefEl.selectionStart ?? customerRefEl.value.length;

      const end =
        customerRefEl.selectionEnd ?? start;

      const merged =
        customerRefEl.value.slice(0,start) +
        paste +
        customerRefEl.value.slice(end);

      customerRefEl.value =
        sanitizeCustomerRefValue(merged);

      validateCustomerRef(true);

    }
  );

}


/* =========================================================
LOAD INVOICE RETURNS
========================================================= */
/* =========================================================
LOAD INVOICE RETURNS
========================================================= */

const IR_REF_PLACEHOLDER =
  "Select Invoice Return Reference ID";

function isCancelledInvoiceReturn(item){

  const st =
    String(item?.status || "")
      .trim()
      .toLowerCase();

  return st === "cancelled" || st === "draft";

}

function formatInvoiceReturnLabel(item){

  const rid =
    item.return_id ||
    item.invoice_return_id ||
    "";

  const name =
    String(item.customer_name || "").trim();

  if(!rid)
    return "";

  if(!name)
    return rid;

  return `${rid} - ${name}`;

}

function getInvoiceReturnLabelById(refId){

  const id =
    String(refId || "").trim();

  if(!id)
    return "";

  const list =
    window.invoiceReturnsAll ||
    window.invoiceReturns ||
    [];

  const found =
    list.find(item =>
      String(
        item.return_id ||
        item.invoice_return_id ||
        ""
      ) === id
    );

  return found
    ? formatInvoiceReturnLabel(found)
    : id;

}

function setInvoiceReturnRefDisplay(label){

  const selected =
    document.getElementById("invoiceReturnRefSelected");

  if(selected)
    selected.textContent =
      label || IR_REF_PLACEHOLDER;

}

function toggleInvoiceReturnRefDropdown(){

  const wrap =
    document.getElementById("dnrIrRefDropdown");

  const menu =
    document.getElementById("invoiceReturnRefDropdown");

  if(!wrap || !menu || wrap.classList.contains("dnr-ir-ref--locked"))
    return;

  const open =
    menu.style.display === "block";

  menu.style.display =
    open ? "none" : "block";

}

function selectInvoiceReturnRef(el){

  const wrap =
    document.getElementById("dnrIrRefDropdown");

  if(!wrap || wrap.classList.contains("dnr-ir-ref--locked"))
    return;

  const hidden =
    document.getElementById("invoiceReturnRef");

  const menu =
    document.getElementById("invoiceReturnRefDropdown");

  if(!hidden || !el)
    return;

  hidden.value =
    el.dataset.value || "";

  setInvoiceReturnRefDisplay(
    el.textContent.trim()
  );

  if(menu)
    menu.style.display = "none";

  hidden.dispatchEvent(
    new Event("change", { bubbles: true })
  );

}

function initInvoiceReturnRefDropdown(){

  const selected =
    document.getElementById("invoiceReturnRefSelected");

  if(selected){

    selected.addEventListener("click", () => {
      toggleInvoiceReturnRefDropdown();
    });

  }

  document.addEventListener("click", e => {

    const menu =
      document.getElementById("invoiceReturnRefDropdown");

    const wrap =
      document.getElementById("dnrIrRefDropdown");

    if(!menu || !wrap)
      return;

    if(
      !wrap.contains(e.target)
    ){
      menu.style.display = "none";
    }

  });

}

async function loadInvoiceReturns(currentDnrId){

  try{

    const qs =
      new URLSearchParams();

    qs.set(
      "exclude_linked_for_dnr",
      "1"
    );

    const dnrIdForExclude =
      currentDnrId != null
        ? String(currentDnrId).trim()
        : "";

    if(dnrIdForExclude)
      qs.set(
        "exclude_dnr_id",
        dnrIdForExclude
      );

    const res =
      await fetch(
        "/api/invoice-returns?" + qs.toString()
      );

    const json =
      await res.json();

    const list =
      Array.isArray(json)
        ? json
        : (json && Array.isArray(json.data) ? json.data : []);

    // window.invoiceReturnsAll = list;
    // window.invoiceReturns =
    //   list.filter(item => !isCancelledInvoiceReturn(item));
    window.invoiceReturnsAll = list;

    /* =========================================
    Hide:
    1. Cancelled invoice returns
    2. Already linked invoice returns
    ========================================= */

    const currentEditDnrId =
      currentDnrId != null
        ? String(currentDnrId).trim()
        : "";

    window.invoiceReturns = list.filter(item => {

      // hide cancelled / draft invoice returns
      if(isCancelledInvoiceReturn(item))
        return false;

      const linkedDnrId =
        String(item.linked_dnr_id || "").trim();

      // not linked anywhere → show
      if(!linkedDnrId)
        return true;

      // edit mode → allow current DNR own ref
      if(
        currentEditDnrId &&
        linkedDnrId === currentEditDnrId
      ){
        return true;
      }

      // already used in another DNR
      return false;

    });
    const listEl =
      document.getElementById("invoiceReturnRefList");

    if(!listEl)
      return;

    listEl.innerHTML = "";

    window.invoiceReturns.forEach(item=>{

      const rid =
        item.return_id ||
        item.invoice_return_id ||
        "";

      if(!rid)
        return;

      const row =
        document.createElement("div");

      row.className = "dnr-ir-ref-item";
      row.dataset.value = rid;
      row.textContent =
        formatInvoiceReturnLabel(item);

      row.addEventListener("click", () => {
        selectInvoiceReturnRef(row);
      });

      listEl.appendChild(row);

    });

    if(!window.invoiceReturns.length){

      const empty =
        document.createElement("div");

      empty.className = "dnr-ir-ref-item";
      empty.textContent = "No invoice returns found";
      empty.style.pointerEvents = "none";
      listEl.appendChild(empty);

    }

    const hidden =
      document.getElementById("invoiceReturnRef");

    if(hidden && hidden.value.trim()){

      setInvoiceReturnRefDisplay(
        getInvoiceReturnLabelById(hidden.value)
      );

    }
    else {

      setInvoiceReturnRefDisplay("");

    }

  }
  catch(err){

    console.error(
      "Invoice Return Load Error:",
      err
    );

  }

}

initInvoiceReturnRefDropdown();

/* =========================================================
LOAD SAVED DNR (view / edit from list)
========================================================= */

let isLoadingDnrRecord = false;

function formatDnrStatusLabel(status){

  const s =
    String(status || "")
      .trim()
      .toLowerCase();

  if(s === "draft")
    return "Draft";

  if(s === "submitted")
    return "Submitted";

  if(s === "cancelled")
    return "Cancelled";

  if(!s)
    return "";

  return (
    s.charAt(0).toUpperCase() +
    s.slice(1)
  );

}

function updateDnrPageHeader(pageTitle, status){

  const heading =
    document.getElementById("dnrPageHeading");

  const badge =
    document.getElementById("dnrStatusBadge");

  if(heading)
    heading.textContent = pageTitle || "Delivery Note Return";

  if(badge){

    const label =
      formatDnrStatusLabel(status);

    if(label){

      const slug =
        label.toLowerCase();

      badge.innerHTML = `

        <span class="dnr-status-badge dnr-status-badge--${slug}">
          Status : ${label}
        </span>

      `;

    }
    else{

      badge.innerHTML = "";

    }

  }

  const label =
    formatDnrStatusLabel(status);

  document.title =
    label
      ? `${pageTitle} - ${label}`
      : pageTitle;

}

function syncDnrHeaderFromMode(statusFromData){

  const urlId =
    params.get("id");

  const status =
    statusFromData ||
    (mode === "view-cancelled"
      ? "Cancelled"
      : mode === "view-submitted"
        ? "Submitted"
        : mode === "edit"
          ? "Draft"
          : "");

  if(isDnrViewOnlyMode()){

    updateDnrPageHeader(
      "View Delivery Note Return",
      status
    );

    return;

  }

  if(mode === "edit" || urlId){

    updateDnrPageHeader(
      "Edit Delivery Note Return",
      status || "Draft"
    );

    return;

  }

  updateDnrPageHeader(
    "New Delivery Note Return",
    ""
  );

}

function isDnrViewOnlyMode(){

  return (
    mode === "view-submitted" ||
    mode === "view-cancelled" ||
    mode === "view"
  );

}

function formatDnrDateTime(raw){

  if(!raw)
    return "";

  const d = new Date(raw);

  if(!Number.isNaN(d.getTime()))
    return d.toLocaleString();

  return String(raw);

}

function ensureInvoiceReturnOption(refId){

  const hidden =
    document.getElementById("invoiceReturnRef");

  const listEl =
    document.getElementById("invoiceReturnRefList");

  if(!hidden || !refId)
    return;

  const ref =
    String(refId).trim();

  let label =
    getInvoiceReturnLabelById(ref);

  if(listEl){

    const exists =
      listEl.querySelector(
        `.dnr-ir-ref-item[data-value="${CSS.escape(ref)}"]`
      );

    if(!exists){

      const row =
        document.createElement("div");

      row.className = "dnr-ir-ref-item";
      row.dataset.value = ref;
      row.textContent = label;

      row.addEventListener("click", () => {
        selectInvoiceReturnRef(row);
      });

      listEl.appendChild(row);

    }
    else {

      label =
        exists.textContent.trim();

    }

  }

  hidden.value = ref;
  setInvoiceReturnRefDisplay(label);

}

const DNR_RETURN_REASONS = [
  "Select Reason",
  "Damaged",
  "Wrong Product",
  "Quality Issue",
  "Expired",
  "Customer Request",
  "Other"
];

function isDnrReasonEditable(){

  const p =
    new URLSearchParams(window.location.search);

  const pageMode =
    p.get("mode");

  const urlId =
    p.get("id");

  if(
    pageMode === "view-submitted" ||
    pageMode === "view-cancelled" ||
    pageMode === "view"
  ){
    return false;
  }

  if(pageMode === "edit" && urlId)
    return true;

  return !urlId && pageMode !== "edit";

}

function applyStoredDnrReturnReason(reasonSelect, storedRaw){

  if(!reasonSelect)
    return;

  const raw =
    storedRaw != null
      ? String(storedRaw).trim()
      : "";

  if(!raw){

    reasonSelect.value = "Select Reason";
    return;

  }

  const values =
    Array.from(reasonSelect.options).map(o => o.value);

  if(values.includes(raw)){

    reasonSelect.value = raw;
    return;

  }

  const lower =
    raw.toLowerCase();

  for(const o of reasonSelect.options){

    if(
      o.value !== "Select Reason" &&
      o.value.toLowerCase() === lower
    ){

      reasonSelect.value = o.value;
      return;

    }

  }

  const opt =
    document.createElement("option");

  opt.value = raw;
  opt.textContent = raw;
  reasonSelect.appendChild(opt);
  reasonSelect.value = raw;

}

function appendDnrLineItemRow(tbody, item, index){

  const tr =
    document.createElement("tr");

  const reasonEditable =
    isDnrReasonEditable();

  const invQty =
    item.invoiced_qty != null
      ? item.invoiced_qty
      : item.invoice_qty != null
        ? item.invoice_qty
        : item.invoice_quantity;

  const retQty =
    item.returned_qty != null
      ? item.returned_qty
      : item.return_qty != null
        ? item.return_qty
        : item.return_quantity;

  const serial =
    item.serial_no != null && item.serial_no !== ""
      ? item.serial_no
      : (item.serial_number || "");

  const reason =
    item.return_reason != null && item.return_reason !== ""
      ? item.return_reason
      : (item.reason || "");

  [
    String(index + 1),
    item.product_name || "",
    item.product_id || "",
    item.uom || "",
    invQty ?? "",
    retQty ?? "",
    serial
  ].forEach(text => {

    const td =
      document.createElement("td");

    td.textContent =
      text != null
        ? String(text)
        : "";

    tr.appendChild(td);

  });

  const tdReason =
    document.createElement("td");

  if(reasonEditable){

    const reasonSelect =
      document.createElement("select");

    reasonSelect.className = "dnr-reason-select";

    DNR_RETURN_REASONS.forEach(reasonOpt => {

      const option =
        document.createElement("option");

      option.value = reasonOpt;
      option.textContent = reasonOpt;

      if(reasonOpt === "Select Reason")
        option.disabled = true;

      reasonSelect.appendChild(option);

    });

    applyStoredDnrReturnReason(reasonSelect, reason);
    tdReason.appendChild(reasonSelect);

  }
  else {

    tdReason.textContent =
      reason != null
        ? String(reason)
        : "";

  }

  tr.appendChild(tdReason);
  tbody.appendChild(tr);

}

function renderDnrLineItems(items){

  const tbody =
    document.getElementById("lineItemsBody");

  if(!tbody)
    return;

  tbody.innerHTML = "";

  if(!items || !items.length){

    const tr =
      document.createElement("tr");

    const td =
      document.createElement("td");

    td.colSpan = 8;
    td.textContent = "No items available";
    tr.appendChild(td);
    tbody.appendChild(tr);

    return;

  }

  items.forEach((item, index)=>{
    appendDnrLineItemRow(tbody, item, index);
  });

}

function isDnrSaveStatusAuditRow(row){

  const desc =
    (row && row.description || "").trim().toLowerCase();

  const action =
    (row && row.action || "").trim().toLowerCase();

  return (
    /saved as (draft|submitted)/.test(desc) ||
    /^saved as (draft|submitted)$/.test(action)
  );

}

function renderCombinedDnrHistory(historyRows = [], commentRows = []){

  const listEl =
    document.getElementById("historyList");

  if(!listEl)
    return;

  const combined = [];

  historyRows.forEach(h=>{

    if(isDnrSaveStatusAuditRow(h))
      return;

    combined.push({
      type: "history",
      created_at: h.created_at,
      created_by:
        (h.created_by || "").trim() ||
        getDnrCommentAuthorName(),
      text:
        h.description ||
        h.action ||
        ""
    });

  });

  commentRows.forEach(c=>{

    combined.push({
      type: "comment",
      created_at: c.raw_created_at || c.created_at || c.time,
      created_by:
        (c.author || c.created_by || "").trim() ||
        getDnrCommentAuthorName(),
      text:
        c.comment || ""
    });

  });

  combined.sort((a,b)=>{

    const da = new Date(a.created_at);
    const db = new Date(b.created_at);

    const ta =
      Number.isNaN(da.getTime())
        ? 0
        : da.getTime();

    const tb =
      Number.isNaN(db.getTime())
        ? 0
        : db.getTime();

    return ta - tb;

  });

  if(!combined.length){

    listEl.innerHTML = `

      <p class="empty-msg">
        No history available
      </p>

    `;

    return;

  }

  listEl.innerHTML = "";

  combined.forEach(row=>{

    const when =
      formatDnrDateTime(row.created_at);

    listEl.innerHTML += `

      <div class="history-card">

        <div class="history-meta">
          ${row.created_by}${when ? " — " + when : ""}
        </div>

        <p class="history-text">${row.text}</p>

      </div>

    `;

  });

}

let dnrAuditHistory = [];

function refreshDnrHistoryPanel(){

  renderCombinedDnrHistory(dnrAuditHistory, comments);

}

function lockDnrField(el){

  if(!el)
    return;

  const wrap =
    el.closest(".dnr-field");

  if(el.tagName === "SELECT"){

    el.disabled = true;
    if(wrap)
      wrap.classList.add("dnr-field--locked");

    return;

  }

  if(el.id === "invoiceReturnRef"){

    document
      .getElementById("dnrIrRefDropdown")
      ?.classList.add("dnr-ir-ref--locked");

    const menu =
      document.getElementById("invoiceReturnRefDropdown");

    if(menu)
      menu.style.display = "none";

    return;

  }

  if(el.tagName === "TEXTAREA" || el.type !== "hidden"){

    el.readOnly = true;
    el.removeAttribute("disabled");
    el.classList.add("dnr-locked-field");

  }

}

function applyDnrFormReadonly(){

  document
    .querySelectorAll(
      ".dnr-page input, .dnr-page textarea, .dnr-page select"
    )
    .forEach(lockDnrField);

  const tableWrap =
    document.querySelector(".dnr-table-wrap");

  if(tableWrap)
    tableWrap.classList.add("dnr-line-items--locked");

  if(addCommentBtn)
    addCommentBtn.setAttribute("disabled","");

}

function unlockDnrField(el){

  if(!el)
    return;

  const wrap =
    el.closest(".dnr-field");

  el.readOnly = false;
  el.disabled = false;
  el.classList.remove("dnr-locked-field");

  if(wrap)
    wrap.classList.remove("dnr-field--locked");

}

function applyDnrEditDraftLocks(){

  if(mode !== "edit")
    return;

  document.body.classList.add("dnr-edit-draft-mode");

  [
    "dnrId",
    "invoiceReturnRef",
    "customerName",
    "customerId",
    "customerEmail",
    "customerPhone",
    "contactPerson"
  ].forEach(id=>{

    lockDnrField(
      document.getElementById(id)
    );

  });

  unlockDnrField(customerRefEl);
  configureDnrDateField({ preserveValue: true });

}

function hideDnrCommentEditor(){

  const addLabel =
    document.querySelector(
      "#commentsContent > label"
    );

  if(addLabel)
    addLabel.style.display = "none";

  if(commentInput)
    commentInput.style.display = "none";

  if(addCommentBtn)
    addCommentBtn.style.display = "none";

}

async function loadDnrRecord(dnrId){

  if(!dnrId)
    return;

  isLoadingDnrRecord = true;

  try{

    const res =
      await fetch(
        `/api/delivery-note-return/${encodeURIComponent(dnrId)}`,
        { cache: "no-store" }
      );

    const json =
      await res.json();

    if(!json || !json.success || !json.data){

      showToast(
        (json && json.message) ||
          "Could not load delivery note return",
        "error"
      );

      return;

    }

    const d = json.data;

    const dnrIdEl =
      document.getElementById("dnrId");

    if(dnrIdEl)
      dnrIdEl.value = d.dnr_id || dnrId;

    if(dnrDate && d.dnr_date)
      dnrDate.value = dnrDateApiToIso(d.dnr_date);

    ensureInvoiceReturnOption(
      d.invoice_return_ref_id || ""
    );

    const setVal = (id, val)=>{

      const el =
        document.getElementById(id);

      if(el)
        el.value = val != null ? String(val) : "";

    };

    setVal("customerName", d.customer_name);
    setVal("customerId", d.customer_id);
    setVal("customerEmail", d.email);
    setVal("customerPhone", d.phone);
    setVal("contactPerson", d.contact_person);
    setVal("customerRef", d.customer_ref_no);

    renderDnrLineItems(d.items || []);

    comments.length = 0;

    (d.comments || []).forEach(c=>{

      comments.push({
        comment: c.comment || "",
        time: formatDnrDateTime(c.created_at),
        raw_created_at: c.created_at,
        author: (c.created_by || "").trim() || "User"
      });

    });

    renderCommentsList();

    dnrAuditHistory = d.history || [];
    refreshDnrHistoryPanel();

    if(window.dnrAttApi)
      window.dnrAttApi.loadFromServer(d.dnr_id || dnrId, d.attachments);

    syncDnrHeaderFromMode(d.status);

    if(isDnrViewOnlyMode()){

      configureDnrDateField({
        preserveValue: true
      });
      applyDnrFormReadonly();
      hideDnrCommentEditor();

    }
    else if(mode === "edit"){

      applyDnrEditDraftLocks();
      syncDnrEditDraftFooterButtons();

    }

  }
  catch(err){

    console.error(
      "DNR load error:",
      err
    );

    showToast(
      "Could not load delivery note return",
      "error"
    );

  }
  finally{

    isLoadingDnrRecord = false;

  }

}

async function initDnrPageFromUrl(){

  const urlId =
    (params.get("id") || "").trim();

  await loadInvoiceReturns(urlId);

  if(urlId)
    await loadDnrRecord(urlId);

}

/* =========================================================
AUTO FILL CUSTOMER DETAILS + LINE ITEMS (invoice return)
========================================================= */

function clearInvoiceReturnDerivedFields(){

  const ids = [
    "customerName",
    "customerId",
    "customerEmail",
    "customerPhone",
    "contactPerson",
    "customerRef"
  ];

  ids.forEach(id=>{

    const el =
      document.getElementById(id);

    if(el)
      el.value = "";

  });

  const tbody =
    document.getElementById("lineItemsBody");

  tbody.innerHTML = `

    <tr>
      <td colspan="8">
        No items available
      </td>
    </tr>

  `;

}

function normalizeInvoiceReturnFetch(json){

  if(!json || !json.success)
    return null;

  let header = null;
  let items = [];

  if(json.invoice_return){

    header = json.invoice_return;
    items = json.items || [];

  }
  else if(json.data && typeof json.data === "object" && !Array.isArray(json.data)){

    header = json.data;
    items = json.data.items || [];

  }

  if(!header)
    return null;

  return { header, items };

}

const invoiceReturnRefEl =
  document.getElementById("invoiceReturnRef");

if(invoiceReturnRefEl){

invoiceReturnRefEl.addEventListener(
  "change",
  async ()=>{

    if(isLoadingDnrRecord)
      return;

    const selectedId =
      invoiceReturnRefEl.value.trim();

    if(!selectedId){

      clearInvoiceReturnDerivedFields();
      return;

    }

    try{

      const res =
        await fetch(
          `/api/invoice-return/${encodeURIComponent(selectedId)}`
        );

      const json =
        await res.json();

      const norm =
        normalizeInvoiceReturnFetch(json);

      if(!norm){

        showToast(
          (json && json.error) ||
            (json && json.message) ||
            "Could not load invoice return",
          "error"
        );
        clearInvoiceReturnDerivedFields();
        return;

      }

      const data =
        norm.header;

      const items =
        norm.items;

      document.getElementById("customerName").value =
        data.customer_name || "";

      document.getElementById("customerId").value =
        data.customer_id || "";

      document.getElementById("customerEmail").value =
        data.email || "";

      document.getElementById("customerPhone").value =
        data.phone ||
        data.phone_number ||
        "";

      document.getElementById("contactPerson").value =
        data.contact_person || "";

      const refEl =
        document.getElementById("customerRef");

      if(refEl)
        refEl.value =
          data.customer_ref_no != null && data.customer_ref_no !== ""
            ? String(data.customer_ref_no)
            : "";

      const tbody =
        document.getElementById("lineItemsBody");

      tbody.innerHTML = "";

      if(items.length === 0){

        tbody.innerHTML = `

          <tr>
            <td colspan="8">
              No items available
            </td>
          </tr>

        `;

      }
      else{

        items.forEach((item, index)=>{
          appendDnrLineItemRow(tbody, item, index);
        });

      }

      showToast(
        "Invoice return loaded successfully",
        "success"
      );

    }
    catch(err){

      console.error(
        "Invoice Return Fetch Error:",
        err
      );

      showToast(
        "Could not load invoice return",
        "error"
      );
      clearInvoiceReturnDerivedFields();

    }

});

}

/* =========================================================
VIEW MODES
========================================================= */

const params =
  new URLSearchParams(window.location.search);

const mode =
  params.get("mode");

/* BUTTONS */

const pdfBtn =
  document.getElementById("dnrPdfAction");

const emailBtn =
  document.getElementById("dnrEmailAction");

function isNewDnrFormPage(){

  return (
    mode !== "view-submitted" &&
    mode !== "view-cancelled"
  );

}

function isBrandNewDnrPage(){

  const urlId =
    params.get("id");

  return (
    isNewDnrFormPage() &&
    !urlId &&
    mode !== "edit"
  );

}

function isDnrEditDraftPage(){

  return (
    mode === "edit" &&
    !!params.get("id")
  );

}

function getInvoiceReturnRefValue(){

  const el =
    document.getElementById("invoiceReturnRef");

  return el
    ? el.value.trim()
    : "";

}

function setFooterIconDisabled(
  el,
  disabled
){

  if(!el)
    return;

  if(disabled){

    el.classList.add("is-disabled");
    el.setAttribute(
      "aria-disabled",
      "true"
    );

  }
  else{

    el.classList.remove("is-disabled");
    el.removeAttribute("aria-disabled");

  }

}

function syncDnrEditDraftFooterButtons(){

  setFooterIconDisabled(pdfBtn, true);
  setFooterIconDisabled(emailBtn, true);

  if(cancelBtn)
    cancelBtn.disabled = false;

  if(saveDraftBtn)
    saveDraftBtn.disabled = false;

  if(submitBtn)
    submitBtn.disabled = false;

  /* Cancel DNR only applies after Submit — draft cannot be cancelled */
  if(cancelDnrBtn)
    cancelDnrBtn.disabled = true;

}

function syncBrandNewDnrFooterButtons(){

  const invoiceRef =
    getInvoiceReturnRefValue();

  const hasComment =
    comments.length > 0;

  setFooterIconDisabled(pdfBtn, true);
  setFooterIconDisabled(emailBtn, true);

  if(cancelDnrBtn)
    cancelDnrBtn.disabled = true;

  if(cancelBtn)
    cancelBtn.disabled = false;

  if(saveDraftBtn)
    saveDraftBtn.disabled = false;

  if(submitBtn)
    submitBtn.disabled =
      !invoiceRef ||
      !hasComment;

}

function syncNewDnrFooterButtons(){

  if(isDnrViewOnlyMode())
    return;

  if(isDnrEditDraftPage()){

    syncDnrEditDraftFooterButtons();
    return;

  }

  if(isBrandNewDnrPage())
    syncBrandNewDnrFooterButtons();

}

const cancelBtn =
  document.getElementById("dnrCancelBtn");

const cancelDnrBtn =
  document.getElementById("cancelDnrBtn");

const saveDraftBtn =
  document.getElementById("saveDraftBtn");

const submitBtn =
  document.getElementById("submitBtn");

const DNR_LIST_URL = "/deliverynote_return";

if(cancelBtn){

  cancelBtn.addEventListener(
    "click",
    ()=>{

      window.location.href = DNR_LIST_URL;

    }
  );

}

/* =========================================================
TABS
========================================================= */

const commentsTab =  document.getElementById("commentsTab");

const historyTab =  document.getElementById("historyTab");

const attachmentsTab =  document.getElementById("attachmentsTab");

const commentsContent =  document.getElementById("commentsContent");

const historyContent =  document.getElementById("historyContent");

const attachmentsContent =  document.getElementById("attachmentsContent");

function switchTab(tab){

  if(!commentsTab || !historyTab || !attachmentsTab)
    return;

  if(!commentsContent || !historyContent || !attachmentsContent)
    return;

  const showComments = tab === "comments";
  const showHistory = tab === "history";
  const showAttachments = tab === "attachments";

  commentsTab.classList.toggle("active", showComments);
  historyTab.classList.toggle("active", showHistory);
  attachmentsTab.classList.toggle("active", showAttachments);

  commentsTab.setAttribute(
    "aria-selected",
    showComments ? "true" : "false"
  );
  historyTab.setAttribute(
    "aria-selected",
    showHistory ? "true" : "false"
  );
  attachmentsTab.setAttribute(
    "aria-selected",
    showAttachments ? "true" : "false"
  );

  commentsContent.classList.toggle("active", showComments);
  historyContent.classList.toggle("active", showHistory);
  attachmentsContent.classList.toggle("active", showAttachments);

  commentsContent.hidden = !showComments;
  historyContent.hidden = !showHistory;
  attachmentsContent.hidden = !showAttachments;

  if(showHistory)
    refreshDnrHistoryPanel();

}

const dnrTabsHeader =
  document.querySelector(".dnr-tabs-header");

if(dnrTabsHeader){

  dnrTabsHeader.addEventListener(
    "click",
    e=>{

      const btn =
        e.target.closest(".dnr-tab-btn");

      if(!btn)
        return;

      if(btn.id === "commentsTab")
        switchTab("comments");
      else if(btn.id === "historyTab")
        switchTab("history");
      else if(btn.id === "attachmentsTab")
        switchTab("attachments");

    }
  );

}

/* =========================================================
TOAST
========================================================= */

function showToast(message, type = "success"){

  const existing =
    document.querySelectorAll(
      ".success-notification, .error-notification"
    );

  existing.forEach(el=>el.remove());

  let className = "success-notification";

  if(type === "error" || type === "warning")
    className = "error-notification";
  else if(type !== "success")
    return;

  const toast =
    document.createElement("div");

  toast.className = className;

  const icon = document.createElement("span");
  icon.className = "dnr-toast-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent =
    type === "error" || type === "warning" ? "✕" : "✓";

  const text = document.createElement("span");
  text.className = "dnr-toast-text";
  text.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(text);

  document.body.appendChild(toast);

  requestAnimationFrame(()=>{

    toast.classList.add("show");

  });

  setTimeout(()=>{

    toast.classList.remove("show");
    setTimeout(()=>toast.remove(), 400);

  }, 3000);

}

/* =========================================================
COMMENTS
========================================================= */

const commentInput =  document.getElementById("commentInput");

const addCommentBtn =  document.getElementById("addCommentBtn");

const latestComment =  document.getElementById("latestComment");

const historyList =  document.getElementById("historyList");

let comments = [];

function getDnrCommentAuthorName(){

  const n =
    window.LOGGED_IN_USER_NAME;

  if(typeof n === "string" && n.trim())
    return n.trim();

  return "User";

}

function updateAddCommentBtnState(){

  const ta =
    document.getElementById("commentInput");

  const btn =
    document.getElementById("addCommentBtn");

  if(!ta || !btn)
    return;

  const hasText =
    ta.value.trim().length > 0;

  if(hasText){

    btn.removeAttribute("disabled");
    btn.classList.add("is-enabled");

  }
  else{

    btn.setAttribute("disabled","");
    btn.classList.remove("is-enabled");

  }

}

if(commentInput && addCommentBtn){

  updateAddCommentBtnState();

  commentInput.addEventListener(
    "input",
    updateAddCommentBtnState
  );

  commentInput.addEventListener(
    "keyup",
    updateAddCommentBtnState
  );

  commentInput.addEventListener(
    "paste",
    ()=>{

      setTimeout(
        updateAddCommentBtnState,
        0
      );

    }
  );

}

addCommentBtn?.addEventListener("click",()=>{

  const value =    commentInput.value.trim();

  if(!value) return;

  const now = new Date();

const obj = {

  comment: value,
  time: now.toLocaleString(),
  raw_created_at: now.toISOString(),
  author: getDnrCommentAuthorName()

};

  comments.push(obj);

  renderCommentsList();
  refreshDnrHistoryPanel();

  commentInput.value = "";

  updateAddCommentBtnState();

  checkSubmitEnable();

  showToast("Comment added successfully", "success");

});

function renderCommentsList(){

  if(!latestComment)
    return;

  if(!comments.length){

    latestComment.innerHTML = `

      <p class="empty-msg">
        No comments yet
      </p>

    `;

    return;

  }

  const latest = comments[comments.length - 1];

  latestComment.innerHTML = `

    <div class="comment-card">

      <div class="comment-name">
        ${latest.author || getDnrCommentAuthorName()} —
        ${latest.time}
      </div>

      <p>${latest.comment}</p>

    </div>

  `;

}

/* =========================================================
DNR ATTACHMENTS (new ids: dnrAtt*)
========================================================= */

(function(){

  const inp =
    document.getElementById("dnrAttInput");

  const list =
    document.getElementById("dnrAttItems");

  const countEl =
    document.getElementById("dnrAttCount");

  const attachmentsTabBtn =
    document.getElementById("attachmentsTab");

  const attachmentsTabLabelEl =
    document.getElementById("attachmentsTabLabel");

  const btn =
    document.getElementById("dnrAttChooseBtn");

  const drop =
    document.getElementById("dnrAttDrop");

  if(!inp || !list || !countEl)
    return;

  const MAX = 10;
  const MAX_BYTES = 10 * 1024 * 1024;

  let files = [];
  let pendingDeleteFileIndex = null;

  function isServerAttachment(item){
    return !!(item && item.server && item.id);
  }

  function getCurrentDnrIdForAtt(){
    return (
      document.getElementById("dnrId")?.value?.trim() || ""
    );
  }

  function canUploadAttachmentNow(){

    const dnrId =
      getCurrentDnrIdForAtt();

    const urlId =
      new URLSearchParams(window.location.search).get("id");

    return !!(
      dnrId &&
      urlId &&
      urlId === dnrId &&
      !isDnrViewOnlyMode()
    );

  }

  async function uploadFileToServer(dnrId, file){

    const fd =
      new FormData();

    fd.append("file", file);
    fd.append("dnr_id", dnrId);

    const res =
      await fetch(
        "/api/dnr-upload-attachment",
        { method: "POST", body: fd }
      );

    const data =
      await res.json().catch(() => ({}));

    if(!res.ok || !data.success){

      throw new Error(
        (data && (data.error || data.message)) ||
          "Upload failed"
      );

    }

    const att =
      data.attachment || {};

    return {
      server: true,
      id: att.id,
      name: att.filename || file.name,
      size: att.size != null ? att.size : file.size,
      uploadedAt: att.uploaded_at || new Date().toLocaleString()
    };

  }

  const deleteFileModal =
    document.getElementById("dnrDeleteFileModal");
  const deleteFileCancelBtn =
    document.getElementById("dnrDeleteFileCancelBtn");
  const deleteFileConfirmBtn =
    document.getElementById("dnrDeleteFileConfirmBtn");

  function openDeleteFileModal(index){

    pendingDeleteFileIndex = index;
    if(!deleteFileModal) return;
    deleteFileModal.style.display = "flex";
    deleteFileModal.setAttribute("aria-hidden", "false");

  }

  function closeDeleteFileModal(){

    pendingDeleteFileIndex = null;
    if(!deleteFileModal) return;
    deleteFileModal.style.display = "none";
    deleteFileModal.setAttribute("aria-hidden", "true");

  }

  if(deleteFileCancelBtn){
    deleteFileCancelBtn.addEventListener("click", closeDeleteFileModal);
  }

  if(deleteFileConfirmBtn){
    deleteFileConfirmBtn.addEventListener("click", () => {
      const index = pendingDeleteFileIndex;
      closeDeleteFileModal();
      if(index == null) return;
      removeDnrFile(index);
    });
  }

  if(deleteFileModal){
    deleteFileModal.addEventListener("click", e => {
      if(e.target === deleteFileModal)
        closeDeleteFileModal();
    });
  }

  function formatFileSize(bytes){

    const n = Number(bytes) || 0;

    if(n === 0)
      return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.min(
      Math.floor(Math.log(n) / Math.log(k)),
      sizes.length - 1
    );

    return (
      parseFloat((n / Math.pow(k, i)).toFixed(1)) +
      " " +
      sizes[i]
    );

  }

  function getFileIconMeta(name){

    const ext =
      String(name || "")
        .split(".")
        .pop()
        .toLowerCase();

    const map = {
      pdf: { icon: "fa-file-pdf", cls: "pdf" },
      doc: { icon: "fa-file-word", cls: "doc" },
      docx: { icon: "fa-file-word", cls: "doc" },
      xls: { icon: "fa-file-excel", cls: "xls" },
      xlsx: { icon: "fa-file-excel", cls: "xls" },
      jpg: { icon: "fa-file-image", cls: "png" },
      jpeg: { icon: "fa-file-image", cls: "png" },
      png: { icon: "fa-file-image", cls: "png" },
    };

    return map[ext] || { icon: "fa-file", cls: "default" };

  }

  function formatAttachmentsTabLabel(count){

    const n =
      Math.max(0, Number(count) || 0);

    const word =
      n === 1
        ? "Attachment"
        : "Attachments";

    return "(" + n + ") " + word;

  }

  function syncAttachmentsTabLabel(count){

    const n =
      count != null
        ? Math.max(0, Number(count) || 0)
        : files.length;

    const text =
      formatAttachmentsTabLabel(n);

    if(attachmentsTabLabelEl)
      attachmentsTabLabelEl.textContent = text;
    else if(attachmentsTabBtn)
      attachmentsTabBtn.textContent = text;

  }

  function syncCount(){

    countEl.textContent =
      files.length + " / " + MAX + " files";

    syncAttachmentsTabLabel(files.length);

  }

  function renderDnrAttRows(){

    list.innerHTML = "";

    files.forEach((file, index) => {

      const fileName = file.name || "";
      const meta = getFileIconMeta(fileName);
      const row = document.createElement("div");
      row.className = "dnr-att__row";
      row.dataset.fileIndex = String(index);

      row.innerHTML =
        '<div class="dnr-att__file-left">' +
          '<div class="dnr-att__fileicon-wrap ' + meta.cls + '">' +
            '<i class="fa-solid ' + meta.icon + '"></i>' +
          '</div>' +
          '<div class="dnr-att__file-info">' +
            '<span class="dnr-att__row-name"></span>' +
            '<div class="dnr-att__meta-row">' +
              '<span class="dnr-att__meta-item">' +
                '<i class="fa-regular fa-file"></i> ' +
                '<span class="dnr-att__size"></span>' +
              '</span>' +
              '<span class="dnr-att__meta-item">' +
                '<i class="fa-regular fa-calendar"></i> ' +
                '<span class="dnr-att__date"></span>' +
              '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="dnr-att__row-actions">' +
          '<button type="button" class="att-btn view-btn" title="View">' +
            '<i class="fa-regular fa-eye"></i>' +
          '</button>' +
          '<button type="button" class="att-btn download-btn" title="Download">' +
            '<i class="fa-solid fa-cloud-arrow-down"></i>' +
          '</button>' +
          '<button type="button" class="att-btn delete-btn" title="Delete">' +
            '<i class="fa-solid fa-trash-can"></i>' +
          '</button>' +
        '</div>';

      row.querySelector(".dnr-att__row-name").textContent = fileName;
      row.querySelector(".dnr-att__size").textContent = formatFileSize(file.size);
      row.querySelector(".dnr-att__date").textContent =
        isServerAttachment(file)
          ? (file.uploadedAt || "—")
          : new Date(file.lastModified || Date.now()).toLocaleString();

      if(
        typeof isDnrViewOnlyMode === "function" &&
        isDnrViewOnlyMode()
      ){
        const delBtn = row.querySelector(".delete-btn");
        if(delBtn) delBtn.style.display = "none";
      }

      list.appendChild(row);

    });

    syncCount();

  }

  function viewDnrFile(file){

    if(!file) return;

    if(isServerAttachment(file)){
      window.open(
        `/api/dnr-attachment/${encodeURIComponent(file.id)}/view`,
        "_blank"
      );
      return;
    }

    const url = URL.createObjectURL(file);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);

  }

  function downloadDnrFile(file){

    if(!file) return;

    if(isServerAttachment(file)){
      window.location.href =
        `/api/dnr-attachment/${encodeURIComponent(file.id)}/download`;
      return;
    }

    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

  }

  async function removeDnrFile(index){

    if(index < 0 || index >= files.length) return;

    const item = files[index];

    if(isServerAttachment(item)){

      try{

        const res = await fetch(
          `/api/dnr-attachment/${encodeURIComponent(item.id)}`,
          { method: "DELETE" }
        );

        const data = await res.json().catch(() => ({}));

        if(!res.ok || !data.success){
          showToast(
            (data && (data.error || data.message)) || "Delete failed",
            "error"
          );
          return;
        }

      }
      catch(err){
        console.error("DNR attachment delete:", err);
        showToast("Delete failed", "error");
        return;
      }

    }

    files.splice(index, 1);
    renderDnrAttRows();
    showToast("File deleted successfully", "success");

  }

  list.addEventListener("click", e => {

    const viewBtn = e.target.closest(".view-btn");
    const downloadBtn = e.target.closest(".download-btn");
    const deleteBtn = e.target.closest(".delete-btn");

    if(!viewBtn && !downloadBtn && !deleteBtn) return;

    e.preventDefault();

    const row = e.target.closest(".dnr-att__row");
    if(!row) return;

    const index = parseInt(row.dataset.fileIndex, 10);
    const file = files[index];
    if(!file) return;

    if(viewBtn) viewDnrFile(file);
    else if(downloadBtn) downloadDnrFile(file);
    else if(deleteBtn) openDeleteFileModal(index);

  });

  async function addFromFileList(fileList){

    const arr =
      Array.from(fileList || []);

    if(!arr.length)
      return;

    const room =
      MAX - files.length;

    if(room <= 0){

      showToast(
        "Maximum " + MAX + " files reached",
        "error"
      );
      return;

    }

    const slice =
      arr.slice(0, room);

    let successCount = 0;

    for(const file of slice){

      if(file.size > MAX_BYTES){
        showToast(
          (file.name || "File") + " exceeds 10 MB",
          "error"
        );
        continue;
      }

      if(canUploadAttachmentNow()){

        try{

          const saved =
            await uploadFileToServer(
              getCurrentDnrIdForAtt(),
              file
            );

          files.push(saved);
          successCount++;

        }
        catch(err){

          console.error("DNR attachment upload:", err);
          showToast(
            err.message || "Upload failed",
            "error"
          );

        }

      }
      else{

        files.push(file);
        successCount++;

      }

    }

    renderDnrAttRows();

    if(successCount === 1){
      showToast(
        slice[0].name + " added successfully",
        "success"
      );
    }
    else if(successCount > 1){
      showToast(
        successCount + " files added successfully",
        "success"
      );
    }

  }

  function mapServerAttachments(list){

    return (list || []).map(att => ({
      server: true,
      id: att.id,
      name: att.filename || att.file_name || "",
      size: att.size != null ? att.size : 0,
      uploadedAt: att.uploaded_at || att.upload_date || ""
    }));

  }

  window.dnrAttApi = {

    getPendingFiles(){
      return files.filter(f => f instanceof File);
    },

    async uploadPending(dnrId){

      const pending =
        files.filter(f => f instanceof File);

      for(const file of pending){

        await uploadFileToServer(dnrId, file);

      }

      await window.dnrAttApi.loadFromServer(dnrId);

      return { ok: true };

    },

    async loadFromServer(dnrId, preloaded){

      files = mapServerAttachments(preloaded);

      if(!preloaded){

        try{

          const res =
            await fetch(
              `/api/dnr-attachments/${encodeURIComponent(dnrId)}`
            );

          const data =
            await res.json();

          if(data && data.success)
            files = mapServerAttachments(data.attachments);

        }
        catch(err){
          console.error("DNR attachments load:", err);
        }

      }

      renderDnrAttRows();

    },

    clear(){
      files = [];
      renderDnrAttRows();
    }

  };

  if(btn)
    btn.addEventListener(
      "click",
      ()=>inp.click()
    );

  if(drop){

    drop.addEventListener(
      "click",
      e=>{

        if(e.target === inp)
          return;

        inp.click();

      }
    );

    drop.addEventListener(
      "keydown",
      e=>{

        if(
          e.key !== "Enter" &&
          e.key !== " "
        )
          return;

        e.preventDefault();
        inp.click();

      }
    );

    [
      "dragenter",
      "dragover"
    ].forEach(ev=>{

      drop.addEventListener(
        ev,
        e=>{

          e.preventDefault();
          e.stopPropagation();
          drop.classList.add("dnr-att__drop--drag");

        }
      );

    });

    drop.addEventListener(
      "dragleave",
      e=>{

        e.preventDefault();

        if(!drop.contains(e.relatedTarget))
          drop.classList.remove("dnr-att__drop--drag");

      }
    );

    drop.addEventListener(
      "drop",
      e=>{

        e.preventDefault();
        e.stopPropagation();
        drop.classList.remove("dnr-att__drop--drag");

        const dt =
          e.dataTransfer &&
          e.dataTransfer.files;

        if(dt && dt.length)
          addFromFileList(dt);

      }
    );

  }

  inp.addEventListener(
    "change",
    e=>{

      addFromFileList(e.target.files);
      e.target.value = "";

    }
  );

  syncAttachmentsTabLabel(0);

})();

/* =========================================================
COLLECT LINE ITEMS + SAVE PAYLOAD
========================================================= */

function collectDnrLineItems(){

  const tbody =
    document.getElementById("lineItemsBody");

  if(!tbody)
    return [];

  const items = [];

  tbody.querySelectorAll("tr").forEach(tr=>{

    const cells =
      tr.querySelectorAll("td");

    if(cells.length < 8)
      return;

    const productName =
      (cells[1].textContent || "").trim();

    if(
      !productName ||
      productName === "No items available"
    )
      return;

    const reasonSelect =
      tr.querySelector(".dnr-reason-select");

    let returnReason =
      reasonSelect
        ? (reasonSelect.value || "").trim()
        : (cells[7].textContent || "").trim();

    if(returnReason === "Select Reason")
      returnReason = "";

    items.push({

      product_name: productName,
      product_id: (cells[2].textContent || "").trim(),
      uom: (cells[3].textContent || "").trim(),
      invoiced_qty: (cells[4].textContent || "").trim(),
      returned_qty: (cells[5].textContent || "").trim(),
      serial_no: (cells[6].textContent || "").trim(),
      return_reason: returnReason

    });

  });

  return items;

}

function buildDnrSavePayload(status){

  return {

    dnr_id:
      document.getElementById("dnrId")?.value?.trim() || "",

    status,

    invoice_return_ref_id:
      getInvoiceReturnRefValue(),

    customer_name:
      document.getElementById("customerName")?.value?.trim() || "",

    customer_id:
      document.getElementById("customerId")?.value?.trim() || "",

    email:
      document.getElementById("customerEmail")?.value?.trim() || "",

    phone:
      document.getElementById("customerPhone")?.value?.trim() || "",

    contact_person:
      document.getElementById("contactPerson")?.value?.trim() || "",

    customer_ref_no:
      document.getElementById("customerRef")?.value?.trim() || "",

    dnr_date:
      dnrDateIsoToApi(
        document.getElementById("dnrDate")?.value?.trim() || ""
      ),

    items: collectDnrLineItems(),

    comments: comments.map(c => ({
    comment: c.comment || "",
    created_by: c.created_by || c.author || "",
    created_at: c.created_at || c.raw_created_at || ""
  })),

  };

}

let dnrSaveInFlight = false;
let dnrCancelInFlight = false;


// in delivery note automatically status change to returned
async function updateDeliveryNoteStatusAfterReturn(invoiceReturnRefId) {
  if(!invoiceReturnRefId)
    return;

  try{
    await fetch("/api/update-delivery-note-status-after-return", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        invoice_return_ref_id: invoiceReturnRefId,
        status: "Returned"
      })
    });
  }
  catch(err){
    console.error("Delivery Note status update error:", err);
  }
}

async function saveDnr(status){

  if(dnrSaveInFlight)
    return;

  const invoiceRef =
    getInvoiceReturnRefValue();

  if(!invoiceRef){

    showToast(
      "Select Invoice Return Reference ID",
      "error"
    );

    return;

  }

  if(status === "Submitted" && comments.length === 0){

    showToast(
      "Please add at least one comment before submitting",
      "error"
    );

    return;

  }

  if(dnrDate && !validateDNRDate()){

    showToast(
      (dateError?.textContent || "").trim() ||
        DNR_INVALID_DATE_MSG,
      "error"
    );

    return;

  }

  if(!validateCustomerRef(true)){

    customerRefEl?.focus();

    return;

  }

  await ensureDnrId();

  if(!validateDnrId())
    return;

  const dnrIdVal =
    document.getElementById("dnrId")?.value?.trim() || "";

  const isDraft = status === "Draft";

  dnrSaveInFlight = true;

  try{

    const res =
      await fetch(
        "/api/save-delivery-note-return",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(
            buildDnrSavePayload(status)
          )
        }
      );

    const data =
      await res.json();

    if(data && data.success){

    // only update delivery note status if DNR is being submitted, not when saving as draft

      if(status === "Submitted"){
        await updateDeliveryNoteStatusAfterReturn(invoiceRef);
      }

      if(window.dnrAttApi){

        const pending =
          window.dnrAttApi.getPendingFiles();

        if(pending.length){

          try{

            await window.dnrAttApi.uploadPending(dnrIdVal);

          }
          catch(uploadErr){

            console.error(
              "DNR attachment upload after save:",
              uploadErr
            );

            showToast(
              uploadErr.message ||
                "Saved but some attachments failed to upload",
              "error"
            );

            syncNewDnrFooterButtons();
            return;

          }

        }

      }

      try{
        localStorage.setItem(
          "dnrListToast",
          isDraft ? "draft" : "submitted"
        );
      }
      catch(e){}

      window.location.href =
        DNR_LIST_URL;

      return;

    }

    showToast(
      (data && data.message) || "Save failed",
      "error"
    );

    syncNewDnrFooterButtons();

  }
  catch(err){

    console.error(
      "DNR save error:",
      err
    );

    showToast(
      "Network error",
      "error"
    );

    syncNewDnrFooterButtons();

  }
  finally{

    dnrSaveInFlight = false;

  }

}



/* =========================================================
SAVE DRAFT / SUBMIT — handlers (DB via app.py)
First click while comment/inputs are focused: without mousedown
preventDefault the blur steals the click (needs two clicks).
========================================================= */

function bindDnrSaveButton(btn, status){

  if(!btn)
    return;

  btn.addEventListener(
    "mousedown",
    e=>{
      e.preventDefault();
    }
  );

  btn.addEventListener(
    "click",
    ()=>{
      saveDnr(status);
    }
  );

}

bindDnrSaveButton(saveDraftBtn, "Draft");
bindDnrSaveButton(submitBtn, "Submitted");

/* =========================================================
CANCEL DNR MODAL
========================================================= */

function openCancelDnrModal(defaultText = ""){

  const backdrop =
    document.getElementById("cancelDnrBackdrop");

  const reasonEl =
    document.getElementById("cancelDnrReason");

  const btnYes =
    document.getElementById("cancelDnrModalYes");

  const btnNo =
    document.getElementById("cancelDnrModalNo");

  const btnX =
    document.getElementById("cancelDnrModalX");

  const lastFocusedEl =
    document.activeElement;

  if(!backdrop || !reasonEl || !btnYes || !btnNo || !btnX)
    return Promise.resolve(null);

  function getFocusable(){

    const modal =
      backdrop.querySelector(".dnr-modal");

    if(!modal)
      return [];

    return [
      ...modal.querySelectorAll(
        'button:not([disabled]), textarea:not([disabled]), input:not([disabled])'
      )
    ].filter(el=>el.offsetParent !== null);

  }

  reasonEl.value = defaultText || "";
  reasonEl.readOnly = false;
  reasonEl.disabled = false;
  reasonEl.classList.remove("dnr-locked-field");
  backdrop.setAttribute("aria-hidden","false");

  let resolveFn;

  const p =
    new Promise(resolve=>{
      resolveFn = resolve;
    });

  function close(){

    backdrop.style.display = "none";
    backdrop.setAttribute("aria-hidden","true");
    btnYes.removeEventListener("click",onYes);
    btnNo.removeEventListener("click",onNo);
    btnX.removeEventListener("click",onNo);
    backdrop.removeEventListener("click",onBackdrop);
    document.removeEventListener("keydown",onKeydown);

    if(
      lastFocusedEl &&
      typeof lastFocusedEl.focus === "function"
    )
      setTimeout(()=>lastFocusedEl.focus(),0);

  }

  function onYes(){

    const reason =
      (reasonEl.value || "").trim();

    close();
    resolveFn(reason);

  }

  function onNo(){

    close();
    resolveFn(null);

  }

  function onBackdrop(e){

    if(e.target === backdrop)
      onNo();

  }

  function onKeydown(e){

    if(e.key === "Escape"){

      e.preventDefault();
      onNo();
      return;

    }

    if(e.key !== "Tab")
      return;

    const focusables =
      getFocusable();

    if(!focusables.length)
      return;

    const first =
      focusables[0];

    const last =
      focusables[focusables.length - 1];

    if(e.shiftKey && document.activeElement === first){

      e.preventDefault();
      last.focus();
      return;

    }

    if(!e.shiftKey && document.activeElement === last){

      e.preventDefault();
      first.focus();

    }

  }

  backdrop.style.display = "flex";
  btnYes.addEventListener("click",onYes);
  btnNo.addEventListener("click",onNo);
  btnX.addEventListener("click",onNo);
  backdrop.addEventListener("click",onBackdrop);
  document.addEventListener("keydown",onKeydown);

  setTimeout(()=>{
    reasonEl.focus();
  },50);

  return p;

}

/* =========================================================
CANCEL DNR — handler (DB via app.py)
========================================================= */

async function cancelDnr(){

  if(cancelDnrBtn?.disabled)
    return;

  const dnrIdVal =
    document.getElementById("dnrId")?.value?.trim() || "";

  if(!dnrIdVal){

    showToast(
      "DNR ID is required",
      "error"
    );

    return;

  }

  const reason =
    await openCancelDnrModal();

  if(reason === null)
    return;

  if(dnrCancelInFlight)
    return;

  dnrCancelInFlight = true;

  try{

    const res =
      await fetch(
        "/api/cancel-delivery-note-return",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            dnr_id: dnrIdVal,
            reason
          })
        }
      );

    const data =
      await res.json();

    if(data && data.success){

      try{
        localStorage.setItem(
          "dnrListToast",
          "cancelled"
        );
      }
      catch(e){}

      window.location.href =
        DNR_LIST_URL;

      return;

    }

    showToast(
      (data && data.message) || "Cancel failed",
      "error"
    );

  }
  catch(err){

    console.error(
      "DNR cancel error:",
      err
    );

    showToast(
      "Network error",
      "error"
    );

  }
  finally{

    dnrCancelInFlight = false;

  }

}

/* =========================================================
NEW DNR — footer button states
========================================================= */

function checkSubmitEnable(){

  if(dnrDate)
    validateDNRDate();

  syncNewDnrFooterButtons();

}

document
  .getElementById("invoiceReturnRef")
  ?.addEventListener(
    "change",
    checkSubmitEnable
  );

/* =========================================================
PAGE HEADER (title + status badge)
========================================================= */

syncDnrHeaderFromMode();

/* =========================================================
READ ONLY VIEW MODE
========================================================= */

if(mode === "view-submitted"){

  document.body.classList.add(
    "dnr-view-mode"
  );

  configureDnrDateField({
    preserveValue: true
  });

  applyDnrFormReadonly();

  /* ENABLE */

  setFooterIconDisabled(pdfBtn, false);
  setFooterIconDisabled(emailBtn, false);

  if(cancelBtn)
    cancelBtn.disabled = false;

  if(cancelDnrBtn)
    cancelDnrBtn.disabled = false;

  /* DISABLE */

  if(saveDraftBtn)
    saveDraftBtn.disabled = true;

  if(submitBtn)
    submitBtn.disabled = true;

}


if(mode === "view-cancelled"){

  document.body.classList.add(
    "dnr-cancelled-view-mode"
  );

  configureDnrDateField({
    preserveValue: true
  });

  applyDnrFormReadonly();

  /* ENABLE (same as invoice return — PDF/Email for cancelled records) */

  setFooterIconDisabled(pdfBtn, false);
  setFooterIconDisabled(emailBtn, false);

  if(cancelBtn)
    cancelBtn.disabled = false;

  /* DISABLE */

  if(cancelDnrBtn)
    cancelDnrBtn.disabled = true;

  if(saveDraftBtn)
    saveDraftBtn.disabled = true;

  if(submitBtn)
    submitBtn.disabled = true;

}

/* =========================================================
FOOTER: PDF / Email
========================================================= */

function getSavedDnrIdForActions(){

  return (
    document.getElementById("dnrId")?.value?.trim() || ""
  );

}

function isDnrSavedOnPage(){

  const dnrId =
    getSavedDnrIdForActions();

  if(!dnrId)
    return false;

  if(isDnrViewOnlyMode())
    return true;

  if(mode === "edit" && params.get("id"))
    return true;

  return false;

}

function generateDnrPdf(){

  const dnrId =
    getSavedDnrIdForActions();

  if(!dnrId){

    showToast(
      "Save the delivery note return first to generate a PDF",
      "error"
    );

    return;

  }

  if(!isDnrSavedOnPage()){

    showToast(
      "Save the delivery note return first to generate a PDF",
      "error"
    );

    return;

  }

  window.open(
    `/api/delivery-note-returns/${encodeURIComponent(dnrId)}/pdf`,
    "_blank"
  );

}

async function sendDnrEmail(){

  const dnrId =
    getSavedDnrIdForActions();

  if(!dnrId || !isDnrSavedOnPage()){

    showToast(
      "Save the delivery note return first to send email",
      "error"
    );

    return;

  }

  try{

    const res =
      await fetch(
        `/api/delivery-note-returns/${encodeURIComponent(dnrId)}/email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

    const data =
      await res.json().catch(() => ({}));

    if(res.ok && data.success !== false){

      showToast(
        "Email sent successfully",
        "success"
      );

      return;

    }

    showToast(
      (data && data.message) ||
        "Email could not be sent",
      "error"
    );

  }
  catch(err){

    console.error(
      "DNR email error:",
      err
    );

    showToast(
      "Email could not be sent",
      "error"
    );

  }

}

/* =========================================================
FOOTER: list navigation
========================================================= */

cancelDnrBtn?.addEventListener(
  "click",
  ()=>{
    cancelDnr();
  }
);

if(pdfBtn){

  pdfBtn.addEventListener(
    "click",
    ()=>{

      if(pdfBtn.classList.contains("is-disabled"))
        return;

      generateDnrPdf();

    }
  );

}

if(emailBtn){

  emailBtn.addEventListener(
    "click",
    ()=>{

      if(emailBtn.classList.contains("is-disabled"))
        return;

      sendDnrEmail();

    }
  );

}

if(isBrandNewDnrPage()){

  configureDnrDateField();
  syncBrandNewDnrFooterButtons();

}
else if(isDnrEditDraftPage()){

  syncDnrEditDraftFooterButtons();

}

/* Enable Add New when comment box has text (always runs) */

document.addEventListener(
  "input",
  (e)=>{

    if(
      e.target &&
      e.target.id === "commentInput"
    ){

      updateAddCommentBtnState();

    }

  },
  true
);

document.addEventListener(
  "keyup",
  (e)=>{

    if(
      e.target &&
      e.target.id === "commentInput"
    ){

      updateAddCommentBtnState();

    }

  },
  true
);

updateAddCommentBtnState();

initDnrPageFromUrl();