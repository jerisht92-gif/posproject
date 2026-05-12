function cnCfg() {
  const el = document.getElementById("credit-inline-config");
  if (!el) return {};
  try { return JSON.parse(el.textContent || "{}"); } catch { return {}; }
}

function cnSet(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

function cnGet(id) {
  return (document.getElementById(id)?.value || "").trim();
}

function cnSetText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value ?? "";
}

function cnToast(message, type = "success") {
  const toast = document.createElement("div");
  const isErrorLike = type === "error" || type === "warning";
  toast.className = isErrorLike ? "error-notification" : "success-notification";
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  }, isErrorLike ? 2200 : 3000);
}

function cnRenderRows(items) {
  const body = document.getElementById("cnItemsBody");
  if (!body) return;
  if (!Array.isArray(items) || !items.length) {
    body.innerHTML = '<tr><td colspan="11" class="cn-empty">No returned items</td></tr>';
    return;
  }
  body.innerHTML = "";
  items.forEach((it, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${it.product_name ?? ""}</td>
      <td>${it.product_id ?? ""}</td>
      <td>${it.return_qty ?? it.return_quantity ?? it.returned_qty ?? it.quantity ?? 0}</td>
      <td>${it.uom ?? ""}</td>
      <td>${it.reason ?? it.return_reason ?? ""}</td>
      <td>${it.unit_price ?? 0}</td>
      <td>${it.tax_percent ?? 0}</td>
      <td>${it.discount ?? 0}</td>
      <td>${it.total ?? 0}</td>
      <td><button type="button" class="cn-delete-row-btn" title="Delete" aria-label="Delete row"><i class="fa-solid fa-trash" aria-hidden="true"></i></button></td>
    `;
    body.appendChild(tr);
  });
  cnSyncRowDeleteButtonsLockState();
}

function cnCalcRefund() {
  const invoiceTotal = Math.max(parseFloat(cnGet("cnInvoiceTotal")) || 0, 0);
  let amountPaid = Math.max(parseFloat(cnGet("cnAmountPaid")) || 0, 0);
  if (amountPaid > invoiceTotal) amountPaid = invoiceTotal;
  let returned = 0;
  document.querySelectorAll("#cnItemsBody tr").forEach((row) => {
    const cell = row.children[9];
    if (cell && cell.innerText) returned += parseFloat(cell.innerText) || 0;
  });
  if (returned > invoiceTotal) returned = invoiceTotal;
  const refundableBase = Math.min(returned, amountPaid);

  const refundPaidInput = document.getElementById("cnRefundPaid");
  if (refundPaidInput) {
    refundPaidInput.max = refundableBase.toFixed(2);
  }

  const rawRefund = Math.max(parseFloat(cnGet("cnRefundPaid")) || 0, 0);
  let refundPaid = rawRefund;
  if (refundPaid > refundableBase) {
    refundPaid = refundableBase;
    cnSet("cnRefundPaid", refundableBase.toFixed(2));
    if (refundPaidInput && document.activeElement === refundPaidInput && rawRefund > refundableBase) {
      cnToast(`Refund paid cannot exceed ${refundableBase.toFixed(2)}.`, "error");
    }
  }

  // Balance Due = Invoice Total - Invoice Return Amount - Amount Paid
  cnSetText("cnBalanceDue", Math.max(invoiceTotal - returned - amountPaid, 0).toFixed(2));
  cnSetText("cnInvoiceReturnAmount", returned.toFixed(2));
  cnSetText("cnBalanceToRefund", Math.max(refundableBase - refundPaid, 0).toFixed(2));
}

function cnMaybeAutoSetRefundDate() {
  const refundMode = document.getElementById("cnRefundMode");
  const refundDate = document.getElementById("cnRefundDate");
  if (!refundMode || !refundDate) return;
  if (!String(refundMode.value || "").trim()) return;
  if (String(refundDate.value || "").trim()) return;
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  refundDate.value = `${yyyy}-${mm}-${dd}`;
}

function cnSanitizeCreatedBy(raw) {
  let v = String(raw ?? "");
  // Allow letters + spaces only (no digits, no special chars).
  v = v.replace(/[^A-Za-z ]+/g, "");
  // Collapse multiple spaces and trim.
  v = v.replace(/\s+/g, " ").trim();
  // Hard cap for safety (input maxlength also exists).
  if (v.length > 30) v = v.slice(0, 30);
  return v;
}

function cnGetCreatedByValidationMessage(v) {
  if (!v) return "Created By is required (3 to 30 characters).";
  if (v.length < 3 || v.length > 30) return "Created By must be 3 to 30 characters.";
  if (!/^[A-Za-z ]+$/.test(v)) return "Created By can contain only letters and spaces.";
  return "";
}

function cnValidateCreatedByUI({ silent = false } = {}) {
  const el = document.getElementById("cnCreatedBy");
  if (!el) return true;
  const sanitized = cnSanitizeCreatedBy(el.value);
  if (el.value !== sanitized) el.value = sanitized;
  const msg = cnGetCreatedByValidationMessage(sanitized);
  if (msg) {
    if (!silent) cnToast(msg, "error");
    return false;
  }
  return true;
}

function cnSanitizeRefundPaidInput(el) {
  if (!el) return;
  if (String(el.value || "").includes("-")) {
    el.value = String(el.value || "").replace(/-/g, "");
  }
  const n = parseFloat(el.value);
  if (!Number.isFinite(n) || n < 0) {
    el.value = "0";
    return;
  }
  // Avoid float precision artifacts like 3403.2200000000003 while typing/spinner usage.
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  el.value = String(rounded);
}

function cnFormatRefundPaidOnBlur(el) {
  if (!el) return;
  const raw = String(el.value || "").trim();
  if (!raw) return;
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) {
    el.value = "0.00";
    return;
  }
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  el.value = rounded.toFixed(2);
}

/** Map `invoice-details-credit` line items into rows for the Returned Line Items table. */
function cnMapInvoiceLinesToReturnRows(invItems) {
  if (!Array.isArray(invItems) || !invItems.length) return [];
  return invItems.map((row) => {
    const qty = Number(row.quantity ?? 0);
    const unit = Number(row.unit_price ?? 0);
    const tax = Number(row.tax_percent ?? 0);
    const disc = Number(row.discount ?? 0);
    const lineTotal =
      row.total != null
        ? Number(row.total)
        : Math.round(qty * unit * (1 + tax / 100) * (1 - disc / 100) * 100) / 100;
    return {
      product_name: row.product_name ?? "",
      product_id: row.product_id ?? "",
      return_qty: qty,
      uom: row.uom ?? "",
      reason: row.reason ?? "",
      unit_price: unit,
      tax_percent: tax,
      discount: disc,
      total: lineTotal
    };
  });
}

function cnCollectLineItems() {
  const rows = Array.from(document.querySelectorAll("#cnItemsBody tr"));
  return rows
    .map((row) => {
      const cells = row.querySelectorAll("td");
      if (!cells || cells.length < 10) return null;
      const productName = (cells[1]?.innerText || "").trim();
      const productId = (cells[2]?.innerText || "").trim();
      if (!productName && !productId) return null;
      return {
        product_name: productName,
        product_id: productId,
        returned_qty: (cells[3]?.innerText || "").trim(),
        uom: (cells[4]?.innerText || "").trim(),
        reason: (cells[5]?.innerText || "").trim(),
        unit_price: (cells[6]?.innerText || "").trim(),
        tax_percent: (cells[7]?.innerText || "").trim(),
        discount: (cells[8]?.innerText || "").trim(),
        total: (cells[9]?.innerText || "").trim()
      };
    })
    .filter(Boolean);
}

function cnCollectPayload(status) {
  return {
    credit_note_id: cnGet("cnId"),
    credit_note_date: cnGet("cnDate"),
    invoice_ref_id: cnGet("cnInvoiceRef"),
    created_by: cnGet("cnCreatedBy"),
    branch: cnGet("cnBranch"),
    currency: cnGet("cnCurrency"),
    customer_name: cnGet("cnCustomerName"),
    customer_id: cnGet("cnCustomerId"),
    billing_address: cnGet("cnBillingAddress"),
    phone: cnGet("cnPhone"),
    invoice_date: cnGet("cnInvoiceDate"),
    due_date: cnGet("cnDueDate"),
    payment_terms: cnGet("cnPaymentTerms"),
    invoice_status: cnGet("cnInvoiceStatus"),
    payment_status: cnGet("cnPaymentStatus"),
    invoice_total: cnGet("cnInvoiceTotal"),
    amount_paid: cnGet("cnAmountPaid"),
    balance_due: (document.getElementById("cnBalanceDue")?.innerText || "0").trim(),
    invoice_return_amount: (document.getElementById("cnInvoiceReturnAmount")?.innerText || "0").trim(),
    balance_to_refund: (document.getElementById("cnBalanceToRefund")?.innerText || "0").trim(),
    refund_mode: cnGet("cnRefundMode"),
    refund_paid: cnGet("cnRefundPaid"),
    refund_date: cnGet("cnRefundDate"),
    items: cnCollectLineItems(),
    comments: cnPageComments.map((c) => {
      const at = c.at != null ? Number(c.at) : null;
      return {
        user: String(c.user || "User").slice(0, 200),
        message: String(c.message || "").slice(0, 4000),
        at: at != null && Number.isFinite(at) ? at : null,
      };
    }),
    status
  };
}

/** If return rows have 0 tax/disc (legacy API), copy from matching invoice line by product_id. */
function cnMergeReturnTaxDiscountFromInvoice(returnRows, invoiceLineRows) {
  if (!Array.isArray(returnRows) || !Array.isArray(invoiceLineRows) || !invoiceLineRows.length) {
    return returnRows;
  }
  const byPid = new Map();
  for (const row of invoiceLineRows) {
    const k = String(row.product_id ?? "").trim();
    if (k) byPid.set(k, row);
  }
  return returnRows.map((r) => {
    const k = String(r.product_id ?? "").trim();
    const inv = byPid.get(k);
    if (!inv) return r;
    const t = Number(r.tax_percent ?? 0);
    const d = Number(r.discount ?? 0);
    if (t !== 0 || d !== 0) return r;
    const it = Number(inv.tax_percent ?? 0);
    const id = Number(inv.discount ?? 0);
    if (it === 0 && id === 0) return r;
    return { ...r, tax_percent: it, discount: id };
  });
}

async function cnLoadInvoiceIds() {
  const sel = document.getElementById("cnInvoiceRef");
  if (!sel) return;
  const res = await fetch("/api/invoices-credit");
  const data = await res.json();
  const invoices = Array.isArray(data?.invoices) ? data.invoices : [];
  sel.innerHTML = '<option value="">Select Invoice Ref. ID</option>';
  invoices.forEach((id) => {
    const opt = document.createElement("option");
    opt.value = String(id || "");
    opt.textContent = String(id || "");
    sel.appendChild(opt);
  });
}

async function cnFillFromInvoice(invoiceId) {
  if (!invoiceId) {
    cnSet("cnCustomerName", "");
    cnSet("cnCustomerId", "");
    cnSet("cnBillingAddress", "");
    cnSet("cnPhone", "");
    cnSet("cnInvoiceDate", "");
    cnSet("cnDueDate", "");
    cnSet("cnPaymentTerms", "");
    cnSet("cnInvoiceStatus", "");
    cnSet("cnPaymentStatus", "");
    cnSet("cnInvoiceTotal", "");
    cnSetText("invoice_total_display", "0.00");
    cnRenderRows([]);
    cnCalcRefund();
    return;
  }
  const detailsRes = await fetch(`/api/invoice-details-credit/${encodeURIComponent(invoiceId)}`);
  const details = await detailsRes.json();
  if (!detailsRes.ok || !details.success) throw new Error("details fetch failed");
  const inv = details.invoice || {};
  cnSet("cnCustomerName", inv.customer_name || "");
  cnSet("cnCustomerId", inv.customer_id || "");
  cnSet("cnBillingAddress", inv.billing_address || "");
  cnSet("cnPhone", inv.phone || "");
  cnSet("cnInvoiceDate", inv.invoice_date || "");
  cnSet("cnDueDate", inv.due_date || "");
  cnSet("cnPaymentTerms", inv.payment_terms || "");
  cnSet("cnInvoiceStatus", inv.status || "");
  cnSet("cnPaymentStatus", inv.payment_status || "");
  cnSet("cnInvoiceTotal", Number(inv.grand_total || 0).toFixed(2));
  const paid = Number(inv.amount_paid ?? 0);
  cnSet("cnAmountPaid", paid.toFixed(2));
  cnSet("cnRefundPaid", "");
  cnSetText("invoice_total_display", Number(inv.grand_total || 0).toFixed(2));

  // Prefer lines from an existing Invoice Return for this invoice; otherwise use invoice line items
  // (invoice-return-items is empty until a return is saved — credit notes still need the sold lines).
  const retRes = await fetch(`/api/invoice-return-items/${encodeURIComponent(invoiceId)}`);
  const retData = retRes.ok ? await retRes.json() : { items: [] };
  const fromReturn = Array.isArray(retData?.items) ? retData.items : [];
  const fromInvoice = cnMapInvoiceLinesToReturnRows(details.items);
  let rows = fromReturn.length ? fromReturn : fromInvoice;
  if (fromReturn.length && fromInvoice.length) {
    rows = cnMergeReturnTaxDiscountFromInvoice(fromReturn, fromInvoice);
  }
  cnRenderRows(rows);
  cnCalcRefund();
  cnToast(`Invoice ${invoiceId} loaded successfully`);
}

/** In-page comments (Comments tab; not persisted until API support). */
const cnPageComments = [];
let cnCurrentStatus = "New";
let cnCurrentPaymentStatus = "";
let cnIsSavedNote = false;
let cnCoreSectionsLocked = false;

function cnSyncRowDeleteButtonsLockState() {
  document.querySelectorAll(".cn-delete-row-btn").forEach((btn) => {
    if (cnCoreSectionsLocked) {
      btn.style.display = "none";
      btn.disabled = true;
    } else {
      btn.style.display = "";
      btn.disabled = false;
    }
  });
}

function cnLockCoreSectionsForEditMode() {
  cnCoreSectionsLocked = true;
  // Credit Note core identity
  const cnDate = document.getElementById("cnDate");
  if (cnDate) cnDate.readOnly = true;
  const invoiceRef = document.getElementById("cnInvoiceRef");
  if (invoiceRef) invoiceRef.disabled = true;

  // Customer & Invoice details block
  [
    "cnCustomerName",
    "cnCustomerId",
    "cnBillingAddress",
    "cnPhone",
    "cnInvoiceDate",
    "cnDueDate",
    "cnInvoiceStatus",
    "cnPaymentStatus",
    "cnInvoiceTotal"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.readOnly = true;
  });
  const paymentTerms = document.getElementById("cnPaymentTerms");
  if (paymentTerms) paymentTerms.disabled = true;

  // Returned line items should be view-only in edit flow.
  cnSyncRowDeleteButtonsLockState();
}

function cnGetSortedComments() {
  return [...cnPageComments].sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0));
}

function cnParseTimeMs(v) {
  if (v == null || v === "") return 0;
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : 0;
}

function cnCommentDisplayTime(c) {
  if (c.at != null && Number.isFinite(Number(c.at))) return new Date(Number(c.at)).toLocaleString();
  if (c.time) return c.time;
  return "";
}

/** History tab: show full comment trail (including latest). */
function cnRefreshHistory() {
  const list = document.getElementById("cnHistoryList");
  const empty = document.getElementById("cnHistoryEmpty");
  if (!list || !empty) return;
  list.innerHTML = "";
  const allComments = cnGetSortedComments();
  allComments.forEach((c) => {
    const wrap = document.createElement("div");
    wrap.className = "cn-history-row";
    const body = document.createElement("div");
    body.className = "cn-history-body";
    const meta = document.createElement("p");
    meta.className = "cn-history-title";
    meta.textContent = `${c.user || "User"} - ${cnCommentDisplayTime(c)}`;
    const detail = document.createElement("p");
    detail.className = "cn-history-detail";
    detail.textContent = c.message || "";
    body.appendChild(meta);
    body.appendChild(detail);
    wrap.appendChild(body);
    list.appendChild(wrap);
  });
  empty.classList.toggle("cn-is-hidden", allComments.length > 0);
}

function cnRenderComments() {
  const commentList = document.getElementById("cnCommentList");
  const emptyState = document.getElementById("cnCommentEmpty");
  if (!commentList || !emptyState) return;
  commentList.innerHTML = "";
  const latestComment = cnGetSortedComments()[0];
  emptyState.hidden = Boolean(latestComment);
  if (!latestComment) return;
  const row = document.createElement("div");
  row.className = "cn-comment-row";
  const meta = document.createElement("div");
  meta.className = "cn-comment-meta";
  const userSpan = document.createElement("span");
  userSpan.className = "cn-comment-user";
  userSpan.textContent = latestComment.user;
  const timeSpan = document.createElement("span");
  timeSpan.className = "cn-comment-time";
  timeSpan.textContent = ` - ${cnCommentDisplayTime(latestComment)}`;
  meta.appendChild(userSpan);
  meta.appendChild(timeSpan);
  const p = document.createElement("p");
  p.className = "cn-comment-msg";
  p.textContent = latestComment.message;
  row.appendChild(meta);
  row.appendChild(p);
  commentList.appendChild(row);
}

async function cnLoadCreditNoteById(creditId) {
  if (!creditId) return;
  const res = await fetch(`/api/credit-notes/${encodeURIComponent(creditId)}`);
  const data = await res.json();
  if (!res.ok || !data?.success || !data?.item) throw new Error("credit note fetch failed");
  const it = data.item;
  cnSet("cnId", it.credit_note_id || "");
  cnSet("cnDate", it.credit_note_date || "");
  cnSet("cnInvoiceRef", it.invoice_ref_id || "");
  cnSet("cnCreatedBy", it.created_by || "");
  cnSet("cnBranch", it.branch || "");
  cnSet("cnCurrency", it.currency || "INR");
  cnSet("cnCustomerName", it.customer_name || "");
  cnSet("cnCustomerId", it.customer_id || "");
  cnSet("cnBillingAddress", it.billing_address || "");
  cnSet("cnPhone", it.phone || "");
  cnSet("cnInvoiceDate", it.invoice_date || "");
  cnSet("cnDueDate", it.due_date || "");
  cnSet("cnPaymentTerms", it.payment_terms || "");
  cnSet("cnInvoiceStatus", it.invoice_status || "");
  cnSet("cnPaymentStatus", it.payment_status || "");
  cnSet("cnInvoiceTotal", Number(it.invoice_total || 0).toFixed(2));
  cnSet("cnAmountPaid", Number(it.amount_paid || 0).toFixed(2));
  cnSet("cnRefundMode", it.refund_mode || "");
  cnSet("cnRefundPaid", Number(it.refund_paid || 0).toFixed(2));
  cnSet("cnRefundDate", it.refund_date || "");
  cnSetText("invoice_total_display", Number(it.invoice_total || 0).toFixed(2));
  cnSetText("cnBalanceDue", Number(it.balance_due || 0).toFixed(2));
  cnSetText("cnInvoiceReturnAmount", Number(it.invoice_return_amount || 0).toFixed(2));
  cnSetText("cnBalanceToRefund", Number(it.balance_to_refund || 0).toFixed(2));
  cnRenderRows(Array.isArray(it.items) ? it.items : []);
  cnCalcRefund();
  cnPageComments.length = 0;
  const com = it.comments;
  if (Array.isArray(com)) {
    const normalized = com
      .map((x) => ({
        user: String(x.user || x.author || x.created_by || "User").trim() || "User",
        message: String(x.message || x.text || x.comment || "").trim(),
        at:
          x.at != null && Number.isFinite(Number(x.at))
            ? Number(x.at)
            : cnParseTimeMs(x.created_at || x.time) || Date.now()
      }))
      .filter((x) => x.message);
    normalized.sort((a, b) => (b.at || 0) - (a.at || 0));
    normalized.forEach((c) => cnPageComments.push(c));
  }
  cnRenderComments();
  cnRefreshHistory();
  return it;
}

function cnEnableViewOnlyMode() {
  document.querySelectorAll(".cn-card input, .cn-card textarea").forEach((el) => {
    if (el.id === "cnId") return;
    el.readOnly = true;
  });
  document.querySelectorAll(".cn-card select").forEach((el) => {
    el.disabled = true;
  });
  document.querySelectorAll(".cn-delete-row-btn").forEach((btn) => {
    btn.style.display = "none";
  });
  ["cnSaveDraftBtn", "cnMarkPaidBtn", "cnDeleteBtn"].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.style.display = "none";
  });
  const refundPick = document.getElementById("cnRefundDateOpenBtn");
  if (refundPick) refundPick.disabled = true;
  const cIn = document.getElementById("cnCommentInput");
  if (cIn) {
    cIn.readOnly = true;
    cIn.placeholder = "";
  }
  const cAdd = document.getElementById("cnAddCommentBtn");
  if (cAdd) {
    cAdd.disabled = true;
    cAdd.style.display = "none";
  }
  if (typeof window !== "undefined") window.cnCreditAttachmentsReadOnly = true;
  try {
    cnUpdateAttachmentsReadonlyUI();
  } catch (_e) {
    /* noop */
  }
}

function cnApplyStatusPill(status) {
  const pill = document.getElementById("cnStatusPill");
  if (!pill) return;
  const st = String(status || "").trim() || "Draft";
  const statusKey = cnNormalizeStatus(st);
  pill.className = `cn-status-pill ${statusKey}`;
  pill.textContent = `Status: ${st}`;
  pill.classList.remove("cn-status-pill--hidden");
  pill.removeAttribute("aria-hidden");
}

function cnNormalizeStatus(v) {
  return String(v || "").trim().toLowerCase();
}

function cnNormalizePayment(v) {
  return String(v || "").trim().toLowerCase();
}

function cnSetActionEnabled(el, enabled) {
  if (!el) return;
  el.style.display = "";
  el.disabled = !enabled;
  el.style.opacity = enabled ? "1" : "0.55";
  el.style.pointerEvents = enabled ? "auto" : "none";
}

function cnSetFooterIconEnabled(el, enabled) {
  if (!el) return;
  el.style.opacity = enabled ? "1" : "0.5";
  el.style.pointerEvents = enabled ? "auto" : "none";
}

function cnHasAtLeastOneComment() {
  return Array.isArray(cnPageComments) && cnPageComments.length > 0;
}

function cnApplyWorkflowActions({ status, paymentStatus, isSaved }) {
  const st = cnNormalizeStatus(status);
  const ps = cnNormalizePayment(paymentStatus);
  const saveBtn = document.getElementById("cnSaveDraftBtn");
  const markBtn = document.getElementById("cnMarkPaidBtn");
  const cancelBtn = document.getElementById("cnDeleteBtn");
  const pdfAction = document.getElementById("cnPdfAction");
  const emailAction = document.getElementById("cnEmailAction");

  let canSave = false;
  let canMarkPaid = false;
  let canCancel = false;
  let canPdf = false;
  let canEmail = false;

  if (!isSaved) {
    canSave = true;
    canMarkPaid = true;
  } else if (st === "draft") {
    canSave = true;
    // Allow finalization from draft; backend will convert to Submitted+Paid.
    canMarkPaid = true;
    canCancel = true;
  } else if (st === "submitted") {
    canPdf = true;
    canEmail = true;
    canMarkPaid = ps !== "paid";
    canCancel = ps !== "paid";
  }

  // DNR-like rule: final action requires at least one comment.
  canMarkPaid = canMarkPaid && cnHasAtLeastOneComment();

  cnSetActionEnabled(saveBtn, canSave);
  cnSetActionEnabled(markBtn, canMarkPaid);
  cnSetActionEnabled(cancelBtn, canCancel);
  cnSetFooterIconEnabled(pdfAction, canPdf);
  cnSetFooterIconEnabled(emailAction, canEmail);
}

/** Remove native `title` tooltips on form fields (they duplicate labels and float over other inputs). Keeps title on row delete buttons. */
/** Refund date uses a hidden native picker indicator + calendar button so Chromium does not show “Show date picker” on hover. */
function cnInitRefundDatePicker() {
  const input = document.getElementById("cnRefundDate");
  const btn = document.getElementById("cnRefundDateOpenBtn");
  if (!input) return;
  const open = () => {
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch (_e) {
        /* InvalidStateError if already open, etc. */
      }
    }
    input.focus();
    try {
      input.click();
    } catch (_e) {
      /* noop */
    }
  };
  btn?.addEventListener("click", (e) => {
    e.preventDefault();
    open();
  });
}

function cnSuppressNativeFieldTooltips() {
  const cnRoot = document.querySelector(".cn-page");
  if (!cnRoot) return;
  const shouldStrip = (el) => {
    if (!el || !el.matches) return false;
    if (!el.matches("input, select, textarea, label")) return false;
    if (el.closest(".cn-delete-row-btn")) return false;
    return true;
  };
  const strip = () => {
    cnRoot.querySelectorAll("input, select, textarea, label").forEach((el) => {
      if (shouldStrip(el) && el.getAttribute("title")) el.removeAttribute("title");
    });
  };
  strip();
  if (typeof MutationObserver === "undefined") return;
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type !== "attributes" || m.attributeName !== "title") continue;
      const el = m.target;
      if (!cnRoot.contains(el)) continue;
      if (shouldStrip(el) && el.getAttribute("title")) el.removeAttribute("title");
    }
  }).observe(cnRoot, { subtree: true, attributes: true, attributeFilter: ["title"] });
}

const MAX_CN_ATTACHMENTS = 5;
const MAX_CN_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function cnCreditNoteAttachmentsReadOnly() {
  return typeof window !== "undefined" && !!window.cnCreditAttachmentsReadOnly;
}

function cnUpdateAttachmentsReadonlyUI() {
  const ro = cnCreditNoteAttachmentsReadOnly();
  const hint = document.getElementById("cnAttachmentsReadonlyHint");
  const sec = document.querySelector("#cnAttachmentsPanel .upload-section");
  if (hint) {
    hint.classList.toggle("cn-is-hidden", !ro);
  }
  if (sec) {
    sec.style.display = ro ? "none" : "";
  }
}

function cnEscapeHtmlText(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function cnFormatCreditFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function cnCreditFileIcon(ext) {
  const e = String(ext || "").toLowerCase();
  if (["pdf"].includes(e)) return "fa-solid fa-file-pdf";
  if (["doc", "docx"].includes(e)) return "fa-solid fa-file-word";
  if (["xls", "xlsx"].includes(e)) return "fa-solid fa-file-excel";
  if (["jpg", "jpeg", "png"].includes(e)) return "fa-solid fa-file-image";
  return "fa-regular fa-file";
}

function cnCreditFileIconClass(ext) {
  const e = String(ext || "").toLowerCase();
  if (["pdf"].includes(e)) return "pdf";
  if (["doc", "docx"].includes(e)) return "doc";
  if (["xls", "xlsx"].includes(e)) return "xls";
  if (["jpg", "jpeg"].includes(e)) return "jpg";
  if (["png"].includes(e)) return "png";
  return "default";
}

function cnRenderCreditAttachments(files) {
  const filesList = document.getElementById("cnFilesList");
  const fileCount = document.getElementById("cnFileCount");
  const uploadCard = document.getElementById("cnUploadCard");
  const uploadBtn = document.getElementById("cnUploadBtn");
  if (!filesList) return;

  window.cnCurrentCreditAttachments = files || [];
  const currentCount = files.length;
  const isFull = currentCount >= MAX_CN_ATTACHMENTS;
  const ro = cnCreditNoteAttachmentsReadOnly();

  if (fileCount) {
    fileCount.textContent = `${currentCount} / ${MAX_CN_ATTACHMENTS} files`;
  }
  if (uploadCard && !ro) {
    uploadCard.style.opacity = isFull ? "0.5" : "1";
    uploadCard.style.pointerEvents = isFull ? "none" : "auto";
    uploadCard.title = isFull ? "Maximum files reached" : "Click or drag to upload";
  }
  if (uploadBtn && !ro) {
    uploadBtn.disabled = isFull;
    uploadBtn.style.opacity = isFull ? "0.5" : "1";
  }

  if (!files || files.length === 0) {
    filesList.innerHTML =
      '<div class="no-files"><i class="fa-regular fa-folder-open"></i><p>No files attached yet</p></div>';
    return;
  }

  let html = "";
  files.forEach((file) => {
    const ext = file.original_filename ? file.original_filename.split(".").pop().toLowerCase() : "";
    const icon = cnCreditFileIcon(ext);
    const iconClass = cnCreditFileIconClass(ext);
    const size = cnFormatCreditFileSize(file.size || 0);
    const uploadDate = file.upload_date || "—";
    const id = file.id;
    const delBlock = ro
      ? ""
      : `<button type="button" class="btn-action btn-delete" onclick="openCnDeleteFileModal(${id})" title="Delete"><i class="fa-solid fa-trash-can"></i></button>`;
    html += `
    <div class="file-item" data-id="${id}">
      <div class="file-info">
        <div class="file-icon ${iconClass}"><i class="${icon}" aria-hidden="true"></i></div>
        <div class="file-details">
          <div class="file-name">${cnEscapeHtmlText(file.original_filename || "Unknown file")}</div>
          <div class="file-meta">
            <span><i class="fa-regular fa-file"></i> ${cnEscapeHtmlText(size)}</span>
            <span><i class="fa-regular fa-calendar"></i> ${cnEscapeHtmlText(uploadDate)}</span>
          </div>
        </div>
      </div>
      <div class="file-actions">
        <button type="button" class="btn-action btn-view" onclick="cnViewCreditAttachment(${id})" title="View"><i class="fa-regular fa-eye"></i></button>
        <button type="button" class="btn-action btn-download" onclick="cnDownloadCreditAttachment(${id})" title="Download"><i class="fa-solid fa-cloud-arrow-down"></i></button>
        ${delBlock}
      </div>
    </div>`;
  });
  filesList.innerHTML = html;
}

async function cnLoadCreditAttachments() {
  const id = cnGet("cnId");
  const filesList = document.getElementById("cnFilesList");
  if (!filesList) return;
  if (!id) {
    cnRenderCreditAttachments([]);
    return;
  }
  filesList.innerHTML =
    '<div class="loading-files"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading attachments...</p></div>';
  try {
    const res = await fetch(`/api/cn-attachments/${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = await res.json();
    if (data.success) {
      cnRenderCreditAttachments(data.attachments || []);
    } else {
      cnRenderCreditAttachments([]);
    }
  } catch (_e) {
    cnRenderCreditAttachments([]);
  }
}

function cnShowCreditUploading(filename) {
  const filesList = document.getElementById("cnFilesList");
  if (!filesList) return;
  const prev = filesList.querySelector(".file-item.uploading");
  if (prev) prev.remove();
  const uploading = document.createElement("div");
  uploading.className = "file-item uploading";
  uploading.innerHTML = `
    <div class="file-info">
      <div class="file-icon default"><i class="fa-solid fa-spinner fa-spin"></i></div>
      <div class="file-details">
        <div class="file-name">${cnEscapeHtmlText(filename)}</div>
        <div class="file-meta"><span>Uploading...</span></div>
      </div>
    </div>`;
  filesList.insertBefore(uploading, filesList.firstChild);
}

function cnRemoveCreditUploading() {
  const u = document.querySelector("#cnFilesList .file-item.uploading");
  if (u) u.remove();
}

function cnValidateCreditUploadFile(file) {
  if (file.size > MAX_CN_FILE_SIZE_BYTES) {
    cnToast(`${file.name} exceeds 10MB limit`, "error");
    return false;
  }
  const allowed = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png"];
  const ext = file.name.split(".").pop().toLowerCase();
  if (!allowed.includes(ext)) {
    cnToast(`${file.name} type not allowed. Allowed: PDF, DOC, XLS, JPG, PNG`, "error");
    return false;
  }
  return true;
}

async function cnUploadCreditFile(file) {
  if (!cnValidateCreditUploadFile(file)) return;
  const creditNoteId = cnGet("cnId");
  if (!creditNoteId) {
    cnToast("Credit Note ID missing", "error");
    return;
  }
  cnShowCreditUploading(file.name);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("credit_note_id", creditNoteId);
  try {
    let response = await fetch("/api/cn-upload-attachment", { method: "POST", body: formData });
    let data = await response.json();
    const uploadError = String(data?.error || data?.message || "").toLowerCase();

    // If note is not persisted yet, silently save draft and retry upload once.
    if (
      !data?.success &&
      uploadError.includes("save the credit note as draft first")
    ) {
      const saved = await cnSaveDraftInternal({ redirectOnSuccess: false, silent: true });
      if (saved) {
        response = await fetch("/api/cn-upload-attachment", { method: "POST", body: formData });
        data = await response.json();
      }
    }

    if (data.success) {
      cnToast(`${file.name} uploaded successfully!`, "success");
      await cnLoadCreditAttachments();
    } else {
      cnToast(`Upload failed: ${data.error || data.message || "Unknown error"}`, "error");
    }
  } catch (err) {
    console.error(err);
    cnToast("Upload failed. Please try again.", "error");
  } finally {
    cnRemoveCreditUploading();
  }
}

async function cnUploadCreditFiles(fileList) {
  for (const file of fileList) {
    if (file.size > MAX_CN_FILE_SIZE_BYTES) {
      cnToast(`${file.name} exceeds 10MB limit`, "error");
      continue;
    }
    await cnUploadCreditFile(file);
  }
}

function cnInitCreditAttachments() {
  const fileInput = document.getElementById("cnFileInput");
  const uploadCard = document.getElementById("cnUploadCard");
  const uploadBtn = document.getElementById("cnUploadBtn");
  const filesList = document.getElementById("cnFilesList");
  if (!fileInput || !uploadCard || !uploadBtn || !filesList) return;

  function maxReached() {
    const n = window.cnCurrentCreditAttachments ? window.cnCurrentCreditAttachments.length : 0;
    return n >= MAX_CN_ATTACHMENTS;
  }

  uploadCard.addEventListener("click", (e) => {
    e.preventDefault();
    if (cnCreditNoteAttachmentsReadOnly()) return;
    if (maxReached()) {
      cnToast(`Maximum ${MAX_CN_ATTACHMENTS} files allowed`, "warning");
      return;
    }
    fileInput.click();
  });

  uploadBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (cnCreditNoteAttachmentsReadOnly()) return;
    if (maxReached()) {
      cnToast(`Maximum ${MAX_CN_ATTACHMENTS} files allowed`, "warning");
      return;
    }
    fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    const currentCount = window.cnCurrentCreditAttachments ? window.cnCurrentCreditAttachments.length : 0;
    if (currentCount + files.length > MAX_CN_ATTACHMENTS) {
      cnToast(
        `Cannot upload ${files.length} file(s). Maximum ${MAX_CN_ATTACHMENTS} files allowed. You have ${currentCount} file(s).`,
        "warning"
      );
      fileInput.value = "";
      return;
    }
    if (files.length > 0) void cnUploadCreditFiles(files);
    fileInput.value = "";
  });

  uploadCard.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (cnCreditNoteAttachmentsReadOnly()) return;
    uploadCard.style.borderColor = "#007bff";
    uploadCard.style.background = "#f0f7ff";
  });
  uploadCard.addEventListener("dragleave", (e) => {
    e.preventDefault();
    uploadCard.style.borderColor = "#ddd";
    uploadCard.style.background = "#f8f9fa";
  });
  uploadCard.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadCard.style.borderColor = "#ddd";
    uploadCard.style.background = "#f8f9fa";
    if (cnCreditNoteAttachmentsReadOnly()) return;
    const files = Array.from(e.dataTransfer.files || []);
    const currentCount = window.cnCurrentCreditAttachments ? window.cnCurrentCreditAttachments.length : 0;
    if (currentCount + files.length > MAX_CN_ATTACHMENTS) {
      cnToast(`Cannot upload ${files.length} file(s). Maximum ${MAX_CN_ATTACHMENTS} files allowed.`, "warning");
      return;
    }
    if (files.length > 0) void cnUploadCreditFiles(files);
  });

  void cnLoadCreditAttachments();
}

window.cnViewCreditAttachment = function (id) {
  window.open(`/api/cn-attachment/${id}/view`, "_blank");
};

window.cnDownloadCreditAttachment = function (id) {
  window.location.href = `/api/cn-attachment/${id}/download`;
};

window.cnDeleteCreditAttachment = async function (id) {
  try {
    const res = await fetch(`/api/cn-attachment/${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) throw new Error(data.error || data.message || "Delete failed");
    cnToast("File deleted successfully", "success");
    await cnLoadCreditAttachments();
  } catch (e) {
    cnToast(e.message || "Failed to delete attachment", "error");
  }
};

let _cnPendingDeleteAttachmentId = null;

window.openCnDeleteFileModal = function (id) {
  _cnPendingDeleteAttachmentId = id;
  const backdrop = document.getElementById("cnDeleteFileBackdrop");
  if (backdrop) {
    backdrop.removeAttribute("hidden");
    backdrop.classList.add("cn-modal-backdrop--open");
  }
};

window.closeCnDeleteFileModal = function () {
  _cnPendingDeleteAttachmentId = null;
  const backdrop = document.getElementById("cnDeleteFileBackdrop");
  if (backdrop) {
    backdrop.classList.remove("cn-modal-backdrop--open");
    backdrop.setAttribute("hidden", "");
  }
};

function cnInitTabsAndComments(userName) {
  const commentsTab = document.querySelector('.cn-tab[data-tab="comments"]');
  const historyTab = document.querySelector('.cn-tab[data-tab="history"]');
  const attachmentsTab = document.querySelector('.cn-tab[data-tab="attachments"]');
  const commentsPanel = document.getElementById("cnCommentsPanel");
  const historyPanel = document.getElementById("cnHistoryPanel");
  const attachmentsPanel = document.getElementById("cnAttachmentsPanel");
  const commentInput = document.getElementById("cnCommentInput");
  const addBtn = document.getElementById("cnAddCommentBtn");
  function toggleTab(tab) {
    const isComments = tab === "comments";
    const isHistory = tab === "history";
    const isAttachments = tab === "attachments";
    commentsTab?.classList.toggle("active", isComments);
    historyTab?.classList.toggle("active", isHistory);
    attachmentsTab?.classList.toggle("active", isAttachments);
    commentsPanel?.classList.toggle("cn-is-hidden", !isComments);
    historyPanel?.classList.toggle("cn-is-hidden", !isHistory);
    attachmentsPanel?.classList.toggle("cn-is-hidden", !isAttachments);
  }

  if (commentInput && addBtn) {
    const syncAddBtn = () => {
      addBtn.disabled = commentInput.value.trim().length === 0;
    };
    syncAddBtn();
    commentInput.addEventListener("input", syncAddBtn);
    addBtn.addEventListener("click", () => {
      const msg = commentInput.value.trim();
      if (!msg) return;
      cnPageComments.unshift({ user: userName, at: Date.now(), message: msg });
      commentInput.value = "";
      syncAddBtn();
      cnRenderComments();
      cnRefreshHistory();
      cnApplyWorkflowActions({
        status: cnCurrentStatus,
        paymentStatus: cnCurrentPaymentStatus,
        isSaved: cnIsSavedNote
      });
      cnToast("Comment added successfully", "success");
    });
  }

  commentsTab?.addEventListener("click", () => toggleTab("comments"));
  historyTab?.addEventListener("click", () => {
    toggleTab("history");
    cnRefreshHistory();
  });
  attachmentsTab?.addEventListener("click", () => {
    toggleTab("attachments");
    void cnLoadCreditAttachments();
  });
  cnRenderComments();
  cnRefreshHistory();
}

async function cnSaveDraftInternal({ redirectOnSuccess = false, silent = false } = {}) {
  if (!cnValidateCreatedByUI({ silent: true })) {
    if (!silent) cnToast("Please enter a valid Created By (3-30 letters/spaces only).", "error");
    return false;
  }
  const payload = cnCollectPayload("Draft");
  if (!payload.credit_note_id) {
    if (!silent) cnToast("Credit Note ID is required", "error");
    return false;
  }
  const res = await fetch("/api/credit-notes", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || "Failed to save credit note");
  }
  if (redirectOnSuccess) {
    window.location.href = `/credit-note?toast=${encodeURIComponent("Credit note saved as draft")}&type=success`;
  } else if (!silent) {
    cnToast("Credit note saved as draft", "success");
  }
  return true;
}

async function cnDoSaveDraft() {
  try {
    await cnSaveDraftInternal({ redirectOnSuccess: true });
  } catch (e) {
    cnToast(e.message || "Failed to save credit note", "error");
  }
}

async function cnDoMarkPaid() {
  try {
    // Ensure Created By stays valid before collecting payload.
    if (!cnValidateCreatedByUI({ silent: false })) return;
    const payload = cnCollectPayload("Approved");
    if (!payload.credit_note_id) return cnToast("Credit Note ID is required", "error");
    const res = await fetch(`/api/credit-notes/${encodeURIComponent(payload.credit_note_id)}/mark-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) throw new Error(data.message || "Failed to mark as paid");
    window.location.href = `/credit-note?toast=${encodeURIComponent("Credit note marked as paid")}&type=success`;
  } catch (e) {
    cnToast(e.message || "Failed to mark as paid", "error");
  }
}

async function cnDoCancelCreditNote() {
  try {
    const creditId = cnGet("cnId");
    if (!creditId) return cnToast("Credit Note ID is required", "error");
    const res = await fetch(`/api/credit-notes/${encodeURIComponent(creditId)}/cancel`, {
      method: "POST",
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      cnToast(data.message || "Failed to cancel credit note", "error");
      return;
    }
    if (data.success !== true) {
      cnToast(
        data.message ||
          "This credit note is not in the database yet. Save a draft first, or use Cancel to leave.",
        "error"
      );
      return;
    }
    window.location.href = `/credit-note?toast=${encodeURIComponent(`Credit note ${creditId} cancelled`)}&type=success`;
  } catch (e) {
    cnToast(e.message || "Failed to cancel credit note", "error");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const cfg = cnCfg();
  const qs = new URLSearchParams(window.location.search);
  const qsCreditId = (qs.get("credit_note_id") || qs.get("crn_id") || "").trim();
  const creditIdForPage = String(cfg.creditId || qsCreditId || "").trim();
  if (creditIdForPage) cnSet("cnId", creditIdForPage);
  if (!cnGet("cnDate")) cnSet("cnDate", new Date().toISOString().split("T")[0]);

  const mode = (qs.get("mode") || cfg.mode || "new").toString().trim().toLowerCase();
  cnCurrentStatus = "New";
  cnCurrentPaymentStatus = "";
  cnIsSavedNote = false;
  if (typeof window !== "undefined") {
    window.cnCreditAttachmentsReadOnly = mode === "view";
  }

  /* Wire Save / Mark paid / Delete / etc. first so a later init error cannot leave them dead. */
  document.getElementById("cnItemsBody")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".cn-delete-row-btn");
    if (!btn) return;
    if (cnCoreSectionsLocked) return;
    btn.closest("tr")?.remove();
    cnCalcRefund();
  });

  document.getElementById("cnCancelBtn")?.addEventListener("click", () => {
    window.location.href = "/credit-note";
  });

  document.getElementById("cnSaveDraftBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    void cnDoSaveDraft();
  });
  document.getElementById("cnMarkPaidBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    void cnDoMarkPaid();
  });
  document.getElementById("cnDeleteBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    void cnDoCancelCreditNote();
  });

  document.getElementById("cnPdfAction")?.addEventListener("click", () => {
    if (cnNormalizeStatus(cnCurrentStatus) !== "submitted") {
      cnToast("PDF is available only for submitted credit notes", "error");
      return;
    }
    const creditId = cnGet("cnId");
    if (!creditId) {
      cnToast("Please save the credit note first before generating PDF", "error");
      return;
    }
    window.open(`/api/credit-notes/${encodeURIComponent(creditId)}/pdf`, "_blank");
  });

  const emailAction = document.getElementById("cnEmailAction");
  emailAction?.addEventListener("click", async () => {
    if (cnNormalizeStatus(cnCurrentStatus) !== "submitted") {
      cnToast("Email is available only for submitted credit notes", "error");
      return;
    }
    const id = cnGet("cnId");
    if (!id) {
      cnToast("Please save the credit note first before sending email", "error");
      return;
    }
    if (emailAction.dataset.sending === "1") return;
    emailAction.dataset.sending = "1";
    // cnToast("Sending email...", "warning");
    try {
      const res = await fetch(`/api/credit-notes/${encodeURIComponent(id)}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Email sending failed");
      }
      cnToast(data?.message || "Email sent successfully", "success");
    } catch (err) {
      cnToast(err.message || "Failed to send email", "error");
    } finally {
      emailAction.dataset.sending = "0";
    }
  });

  document.getElementById("cnDeleteFileCancelBtn")?.addEventListener("click", () => {
    closeCnDeleteFileModal();
  });
  document.getElementById("cnDeleteFileConfirmBtn")?.addEventListener("click", async () => {
    if (_cnPendingDeleteAttachmentId != null) {
      const id = _cnPendingDeleteAttachmentId;
      closeCnDeleteFileModal();
      await window.cnDeleteCreditAttachment(id);
    }
  });
  document.getElementById("cnDeleteFileBackdrop")?.addEventListener("click", (e) => {
    if (e.target?.id === "cnDeleteFileBackdrop") closeCnDeleteFileModal();
  });

  try {
    cnSuppressNativeFieldTooltips();
  } catch (e) {
    console.warn("cnSuppressNativeFieldTooltips:", e);
  }

  try {
    cnInitRefundDatePicker();
  } catch (e) {
    console.warn("cnInitRefundDatePicker:", e);
  }

  // Load invoice IDs in background; do not block draft/view note hydration.
  const invoiceIdsPromise = cnLoadInvoiceIds().catch(() => {
    cnToast("Failed to load invoice IDs", "error");
  });

  const invoiceRef = document.getElementById("cnInvoiceRef");

  // Only `change` on <select> — do not also use `input` or `onchange` or the handler runs multiple times per pick (duplicate toasts).
  const onInvoiceRefChanged = function () {
    cnFillFromInvoice(this.value).catch(() => cnToast("Failed to fetch invoice details", "error"));
  };
  if (invoiceRef) {
    invoiceRef.addEventListener("change", onInvoiceRefChanged);
  }

  // For mode "new", creditId is only the next reserved number (not in DB yet) — do not GET it.
  if (creditIdForPage && mode !== "new") {
    cnLoadCreditNoteById(creditIdForPage)
      .then(async (it) => {
        const status = it?.status || "Draft";
        cnCurrentStatus = status;
        cnCurrentPaymentStatus = it?.payment_status || "";
        cnIsSavedNote = true;
        cnApplyStatusPill(status);
        const isDraft = String(status).trim().toLowerCase() === "draft";
        // Ensure the invoice dropdown contains options before finalizing selection.
        await invoiceIdsPromise;
        const invoiceRefEl = document.getElementById("cnInvoiceRef");
        if (invoiceRefEl && it?.invoice_ref_id) {
          invoiceRefEl.value = String(it.invoice_ref_id);
        }
        if (mode === "view" || !isDraft) cnEnableViewOnlyMode();
        else if (mode === "edit") {
          cnLockCoreSectionsForEditMode();
        }
        else if (typeof window !== "undefined") {
          window.cnCreditAttachmentsReadOnly = false;
          try {
            cnUpdateAttachmentsReadonlyUI();
          } catch (_e) {
            /* noop */
          }
        }
        cnApplyWorkflowActions({
          status: cnCurrentStatus,
          paymentStatus: cnCurrentPaymentStatus,
          isSaved: cnIsSavedNote
        });
        void cnLoadCreditAttachments();
      })
      .catch(() => cnToast("Failed to load credit note details", "error"));
  } else {
    await invoiceIdsPromise;
    if (invoiceRef && invoiceRef.value) {
      cnFillFromInvoice(invoiceRef.value).catch(() => cnToast("Failed to fetch invoice details", "error"));
    }
    // New (unsaved) note: no DB row yet — do not show a status pill ("Draft" would imply a saved draft).
    cnApplyWorkflowActions({
      status: cnCurrentStatus,
      paymentStatus: cnCurrentPaymentStatus,
      isSaved: cnIsSavedNote
    });
  }

  if (mode !== "view") {
    document.getElementById("cnAmountPaid")?.addEventListener("input", cnCalcRefund);
    document.getElementById("cnRefundPaid")?.addEventListener("input", (e) => {
      cnSanitizeRefundPaidInput(e.currentTarget);
    }, { capture: true });
    document.getElementById("cnRefundPaid")?.addEventListener("input", cnCalcRefund);
    document.getElementById("cnRefundPaid")?.addEventListener("blur", (e) => {
      cnFormatRefundPaidOnBlur(e.currentTarget);
      cnCalcRefund();
    });
    document.getElementById("cnRefundPaid")?.addEventListener("change", (e) => {
      cnFormatRefundPaidOnBlur(e.currentTarget);
      cnCalcRefund();
    });
    document.getElementById("cnRefundPaid")?.addEventListener("keydown", (e) => {
      // Prevent negatives and scientific notation.
      if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
    });
    document.getElementById("cnRefundMode")?.addEventListener("change", cnMaybeAutoSetRefundDate);

    const createdByEl = document.getElementById("cnCreatedBy");
    createdByEl?.addEventListener("input", () => {
      if (!createdByEl) return;
      createdByEl.value = cnSanitizeCreatedBy(createdByEl.value);
    });
    createdByEl?.addEventListener("keydown", (e) => {
      // Block digits/special chars; allow letters, space, and control/navigation keys.
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length === 1 && !/^[A-Za-z ]$/.test(e.key)) {
        e.preventDefault();
      }
      // Hard cap at 30 (unless backspace/delete).
      const isBackspace = e.key === "Backspace" || e.key === "Delete";
      const current = String(createdByEl?.value || "");
      if (!isBackspace && current.length >= 30) e.preventDefault();
    });
  }
  cnMaybeAutoSetRefundDate();

  const userName = (cfg.userName || "User").toString().trim() || "User";
  try {
    cnInitTabsAndComments(userName);
  } catch (e) {
    console.warn("cnInitTabsAndComments:", e);
  }
  try {
    cnInitCreditAttachments();
    cnUpdateAttachmentsReadonlyUI();
  } catch (e) {
    console.warn("cnInitCreditAttachments:", e);
  }
});
