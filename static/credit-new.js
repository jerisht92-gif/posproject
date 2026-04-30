function getConfig() {
  const el = document.getElementById("credit-inline-config");
  if (!el) return {};
  try { return JSON.parse(el.textContent || "{}"); } catch { return {}; }
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

function getVal(id) {
  return (document.getElementById(id)?.value || "").trim();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value ?? "";
}

function showToast(message, type = "success") {
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

function renderRows(items) {
  const tbody = document.getElementById("cnItemsBody");
  if (!tbody) return;
  if (!Array.isArray(items) || !items.length) {
    tbody.innerHTML = '<tr><td colspan="11" class="cn-empty">No returned items</td></tr>';
    return;
  }
  tbody.innerHTML = "";
  items.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${item.product_name ?? ""}</td>
      <td>${item.product_id ?? ""}</td>
      <td>${item.return_qty ?? item.return_quantity ?? item.returned_qty ?? item.quantity ?? 0}</td>
      <td>${item.uom ?? ""}</td>
      <td>${item.reason ?? item.return_reason ?? ""}</td>
      <td>${item.unit_price ?? 0}</td>
      <td>${item.tax_percent ?? 0}</td>
      <td>${item.discount ?? 0}</td>
      <td>${item.total ?? 0}</td>
      <td><button type="button" class="cn-delete-row-btn" title="Delete">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function calculateReturnedTotal() {
  let total = 0;
  document.querySelectorAll("#cnItemsBody tr").forEach((row) => {
    const totalCell = row.children[9];
    if (totalCell && totalCell.innerText) total += parseFloat(totalCell.innerText) || 0;
  });
  return total;
}

function calculateRefund() {
  const invoiceTotal = Math.max(parseFloat(getVal("cnInvoiceTotal")) || 0, 0);
  let amountPaid = Math.max(parseFloat(getVal("cnAmountPaid")) || 0, 0);
  if (amountPaid > invoiceTotal) amountPaid = invoiceTotal;
  let invoiceReturnAmount = Math.max(calculateReturnedTotal(), 0);
  if (invoiceReturnAmount > invoiceTotal) invoiceReturnAmount = invoiceTotal;
  const refundableBase = Math.min(invoiceReturnAmount, amountPaid);
  let refundPaid = Math.max(parseFloat(getVal("cnRefundPaid")) || 0, 0);
  if (refundPaid > refundableBase) refundPaid = refundableBase;
  setText("cnBalanceDue", Math.max(invoiceTotal - amountPaid, 0).toFixed(2));
  setText("cnInvoiceReturnAmount", invoiceReturnAmount.toFixed(2));
  setText("cnBalanceToRefund", Math.max(refundableBase - refundPaid, 0).toFixed(2));
}

async function loadInvoiceIds() {
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

function clearInvoiceData() {
  ["cnCustomerName","cnCustomerId","cnBillingAddress","cnPhone","cnInvoiceDate","cnDueDate","cnPaymentTerms","cnInvoiceStatus","cnPaymentStatus","cnInvoiceTotal"].forEach((id) => setVal(id, ""));
  setVal("cnAmountPaid", "0.00");
  setVal("cnRefundPaid", "");
  setText("invoice_total_display", "0.00");
  setText("cnBalanceDue", "0.00");
  setText("cnInvoiceReturnAmount", "0.00");
  setText("cnBalanceToRefund", "0.00");
  renderRows([]);
}

async function fillFromInvoice(invoiceId) {
  if (!invoiceId) return clearInvoiceData();
  const detailsRes = await fetch(`/api/invoice-details-credit/${encodeURIComponent(invoiceId)}`);
  const details = await detailsRes.json();
  if (!detailsRes.ok || !details.success) {
    clearInvoiceData();
    showToast("Failed to fetch invoice details", "error");
    return;
  }
  const inv = details.invoice || {};
  setVal("cnCustomerName", inv.customer_name || "");
  setVal("cnCustomerId", inv.customer_id || "");
  setVal("cnBillingAddress", inv.billing_address || "");
  setVal("cnPhone", inv.phone || "");
  setVal("cnInvoiceDate", inv.invoice_date || "");
  setVal("cnDueDate", inv.due_date || "");
  setVal("cnPaymentTerms", inv.payment_terms || "");
  setVal("cnInvoiceStatus", inv.status || "");
  setVal("cnPaymentStatus", inv.payment_status || "");
  setVal("cnInvoiceTotal", Number(inv.grand_total || 0).toFixed(2));
  setVal("cnAmountPaid", "0.00");
  setVal("cnRefundPaid", "");
  setText("invoice_total_display", Number(inv.grand_total || 0).toFixed(2));
  const retRes = await fetch(`/api/invoice-return-items/${encodeURIComponent(invoiceId)}`);
  const retData = retRes.ok ? await retRes.json() : { items: [] };
  renderRows(Array.isArray(retData?.items) ? retData.items : []);
  calculateRefund();
}

function setViewOnly() {
  document.querySelectorAll(".cn-card input, .cn-card textarea").forEach((el) => {
    if (el.id !== "cnId") el.readOnly = true;
  });
  document.querySelectorAll(".cn-card select").forEach((el) => { el.disabled = true; });
  ["cnSaveDraftBtn", "cnMarkPaidBtn", "cnDeleteBtn"].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.style.display = "none";
  });
  document.querySelectorAll(".cn-delete-row-btn").forEach((btn) => { btn.style.display = "none"; });
}

document.addEventListener("DOMContentLoaded", async () => {
  const config = getConfig();
  const mode = (config.mode || "new").toLowerCase();
  if (config.creditId) setVal("cnId", config.creditId);
  if (!getVal("cnDate")) setVal("cnDate", new Date().toISOString().split("T")[0]);

  try { await loadInvoiceIds(); } catch { showToast("Failed to load invoice IDs", "error"); }

  if (mode === "view") {
    setViewOnly();
  } else {
    document.getElementById("cnInvoiceRef")?.addEventListener("change", function () {
      fillFromInvoice(this.value).catch(() => showToast("Failed to fetch invoice details", "error"));
    });
    document.getElementById("cnAmountPaid")?.addEventListener("input", calculateRefund);
    document.getElementById("cnRefundPaid")?.addEventListener("input", calculateRefund);
    document.getElementById("cnItemsBody")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".cn-delete-row-btn");
      if (!btn) return;
      btn.closest("tr")?.remove();
      calculateRefund();
    });
  }

  document.getElementById("cnCancelBtn")?.addEventListener("click", () => { window.location.href = "/credit-note"; });
});
function getConfig() {
  const el = document.getElementById("credit-inline-config");
  if (!el) return {};
  try { return JSON.parse(el.textContent || "{}"); } catch { return {}; }
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

function getVal(id) {
  return (document.getElementById(id)?.value || "").trim();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value ?? "";
}

function showToast(message, type = "success") {
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

function renderRows(items) {
  const tbody = document.getElementById("cnItemsBody");
  if (!tbody) return;
  if (!Array.isArray(items) || !items.length) {
    tbody.innerHTML = '<tr><td colspan="11" class="cn-empty">No returned items</td></tr>';
    return;
  }
  tbody.innerHTML = "";
  items.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${item.product_name ?? ""}</td>
      <td>${item.product_id ?? ""}</td>
      <td>${item.return_qty ?? item.return_quantity ?? item.returned_qty ?? item.quantity ?? 0}</td>
      <td>${item.uom ?? ""}</td>
      <td>${item.reason ?? item.return_reason ?? ""}</td>
      <td>${item.unit_price ?? 0}</td>
      <td>${item.tax_percent ?? 0}</td>
      <td>${item.discount ?? 0}</td>
      <td>${item.total ?? 0}</td>
      <td><button type="button" class="cn-delete-row-btn" title="Delete">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function collectLineItems() {
  const rows = Array.from(document.querySelectorAll("#cnItemsBody tr"));
  return rows.map((row) => {
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
  }).filter(Boolean);
}

function collectPayload(status) {
  return {
    credit_note_id: getVal("cnId"),
    credit_note_date: getVal("cnDate"),
    invoice_ref_id: getVal("cnInvoiceRef"),
    created_by: getVal("cnCreatedBy"),
    branch: getVal("cnBranch"),
    currency: getVal("cnCurrency"),
    customer_name: getVal("cnCustomerName"),
    customer_id: getVal("cnCustomerId"),
    billing_address: getVal("cnBillingAddress"),
    phone: getVal("cnPhone"),
    invoice_date: getVal("cnInvoiceDate"),
    due_date: getVal("cnDueDate"),
    payment_terms: getVal("cnPaymentTerms"),
    invoice_status: getVal("cnInvoiceStatus"),
    payment_status: getVal("cnPaymentStatus"),
    invoice_total: getVal("cnInvoiceTotal"),
    amount_paid: getVal("cnAmountPaid"),
    balance_due: (document.getElementById("cnBalanceDue")?.innerText || "0").trim(),
    invoice_return_amount: (document.getElementById("cnInvoiceReturnAmount")?.innerText || "0").trim(),
    balance_to_refund: (document.getElementById("cnBalanceToRefund")?.innerText || "0").trim(),
    refund_mode: getVal("cnRefundMode"),
    refund_paid: getVal("cnRefundPaid"),
    refund_date: getVal("cnRefundDate"),
    adjusted_invoice_reference: getVal("cnAdjustedInvoiceRef"),
    items: collectLineItems(),
    status
  };
}

function calculateReturnedTotal() {
  let total = 0;
  document.querySelectorAll("#cnItemsBody tr").forEach((row) => {
    const totalCell = row.children[9];
    if (totalCell && totalCell.innerText) total += parseFloat(totalCell.innerText) || 0;
  });
  return total;
}

function calculateRefund() {
  const invoiceTotal = Math.max(parseFloat(getVal("cnInvoiceTotal")) || 0, 0);
  let amountPaid = Math.max(parseFloat(getVal("cnAmountPaid")) || 0, 0);
  if (amountPaid > invoiceTotal) amountPaid = invoiceTotal;
  let invoiceReturnAmount = Math.max(calculateReturnedTotal(), 0);
  if (invoiceReturnAmount > invoiceTotal) invoiceReturnAmount = invoiceTotal;
  const refundableBase = Math.min(invoiceReturnAmount, amountPaid);
  let refundPaid = Math.max(parseFloat(getVal("cnRefundPaid")) || 0, 0);
  if (refundPaid > refundableBase) refundPaid = refundableBase;

  setText("cnBalanceDue", Math.max(invoiceTotal - amountPaid, 0).toFixed(2));
  setText("cnInvoiceReturnAmount", invoiceReturnAmount.toFixed(2));
  setText("cnBalanceToRefund", Math.max(refundableBase - refundPaid, 0).toFixed(2));
}

async function loadInvoiceIds() {
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

function clearInvoiceData() {
  [
    "cnCustomerName", "cnCustomerId", "cnBillingAddress", "cnPhone",
    "cnInvoiceDate", "cnDueDate", "cnPaymentTerms", "cnInvoiceStatus",
    "cnPaymentStatus", "cnInvoiceTotal"
  ].forEach((id) => setVal(id, ""));
  setVal("cnAmountPaid", "0.00");
  setVal("cnRefundPaid", "");
  setText("invoice_total_display", "0.00");
  setText("cnBalanceDue", "0.00");
  setText("cnInvoiceReturnAmount", "0.00");
  setText("cnBalanceToRefund", "0.00");
  renderRows([]);
}

async function fillFromInvoice(invoiceId) {
  if (!invoiceId) return clearInvoiceData();
  const detailsRes = await fetch(`/api/invoice-details-credit/${encodeURIComponent(invoiceId)}`);
  const details = await detailsRes.json();
  if (!detailsRes.ok || !details.success) {
    clearInvoiceData();
    showToast("Failed to fetch invoice details", "error");
    return;
  }

  const inv = details.invoice || {};
  setVal("cnCustomerName", inv.customer_name || "");
  setVal("cnCustomerId", inv.customer_id || "");
  setVal("cnBillingAddress", inv.billing_address || "");
  setVal("cnPhone", inv.phone || "");
  setVal("cnInvoiceDate", inv.invoice_date || "");
  setVal("cnDueDate", inv.due_date || "");
  setVal("cnPaymentTerms", inv.payment_terms || "");
  setVal("cnInvoiceStatus", inv.status || "");
  setVal("cnPaymentStatus", inv.payment_status || "");
  setVal("cnInvoiceTotal", Number(inv.grand_total || 0).toFixed(2));
  setVal("cnAmountPaid", "0.00");
  setVal("cnRefundPaid", "");
  setText("invoice_total_display", Number(inv.grand_total || 0).toFixed(2));

  const retRes = await fetch(`/api/invoice-return-items/${encodeURIComponent(invoiceId)}`);
  const retData = retRes.ok ? await retRes.json() : { items: [] };
  renderRows(Array.isArray(retData?.items) ? retData.items : []);
  calculateRefund();
}

async function loadCreditNoteForView(creditId) {
  const res = await fetch(`/api/credit-notes/${encodeURIComponent(creditId)}`);
  const data = await res.json();
  if (!res.ok || !data?.success || !data?.item) throw new Error(data?.message || "Failed to load credit note");
  const item = data.item;

  setVal("cnId", item.credit_note_id || "");
  setVal("cnDate", item.credit_note_date || "");
  setVal("cnInvoiceRef", item.invoice_ref_id || "");
  setVal("cnCreatedBy", item.created_by || "");
  setVal("cnBranch", item.branch || "");
  setVal("cnCurrency", item.currency || "INR");
  setVal("cnCustomerName", item.customer_name || "");
  setVal("cnCustomerId", item.customer_id || "");
  setVal("cnBillingAddress", item.billing_address || "");
  setVal("cnPhone", item.phone || "");
  setVal("cnInvoiceDate", item.invoice_date || "");
  setVal("cnDueDate", item.due_date || "");
  setVal("cnPaymentTerms", item.payment_terms || "");
  setVal("cnInvoiceStatus", item.invoice_status || "");
  setVal("cnPaymentStatus", item.payment_status || "");
  setVal("cnInvoiceTotal", Number(item.invoice_total || 0).toFixed(2));
  setVal("cnAmountPaid", Number(item.amount_paid || 0).toFixed(2));
  setVal("cnRefundMode", item.refund_mode || "");
  setVal("cnRefundPaid", Number(item.refund_paid || 0).toFixed(2));
  setVal("cnRefundDate", item.refund_date || "");
  setVal("cnAdjustedInvoiceRef", item.adjusted_invoice_reference || "");
  setText("invoice_total_display", Number(item.invoice_total || 0).toFixed(2));
  setText("cnBalanceDue", Number(item.balance_due || 0).toFixed(2));
  setText("cnInvoiceReturnAmount", Number(item.invoice_return_amount || 0).toFixed(2));
  setText("cnBalanceToRefund", Number(item.balance_to_refund || 0).toFixed(2));
  renderRows(Array.isArray(item.items) ? item.items : []);
}

function enableViewOnlyMode() {
  document.querySelectorAll(".cn-card input, .cn-card select, .cn-card textarea").forEach((el) => {
    if (el.id === "cnId") return;
    if (el.tagName === "SELECT") el.disabled = true;
    else el.readOnly = true;
  });
  document.querySelectorAll(".cn-delete-row-btn").forEach((btn) => { btn.style.display = "none"; });
  ["cnSaveDraftBtn", "cnMarkPaidBtn", "cnDeleteBtn"].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.style.display = "none";
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const config = getConfig();
  const mode = (config.mode || "new").toString().toLowerCase();
  if (config.creditId) setVal("cnId", config.creditId);
  if (!getVal("cnDate")) setVal("cnDate", new Date().toISOString().split("T")[0]);

  try {
    await loadInvoiceIds();
  } catch {
    showToast("Failed to load invoice IDs", "error");
  }

  if (mode === "view" && config.creditId) {
    try {
      await loadCreditNoteForView(config.creditId);
      enableViewOnlyMode();
    } catch {
      showToast("Failed to load credit note details", "error");
    }
  } else {
    document.getElementById("cnInvoiceRef")?.addEventListener("change", function () {
      fillFromInvoice(this.value).catch(() => showToast("Failed to fetch invoice details", "error"));
    });
    document.getElementById("cnAmountPaid")?.addEventListener("input", calculateRefund);
    document.getElementById("cnRefundPaid")?.addEventListener("input", calculateRefund);
    document.getElementById("cnItemsBody")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".cn-delete-row-btn");
      if (!btn) return;
      btn.closest("tr")?.remove();
      calculateRefund();
    });
    calculateRefund();
  }

  document.getElementById("cnCancelBtn")?.addEventListener("click", () => {
    window.location.href = "/credit-note";
  });

  document.getElementById("cnSaveDraftBtn")?.addEventListener("click", async () => {
    const payload = collectPayload("Draft");
    if (!payload.credit_note_id) return showToast("Credit Note ID is required", "error");
    try {
      const res = await fetch("/api/credit-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error();
      window.location.href = `/credit-note?toast=${encodeURIComponent("Credit note saved as draft")}&type=success`;
    } catch {
      showToast("Failed to save credit note", "error");
    }
  });

  document.getElementById("cnMarkPaidBtn")?.addEventListener("click", async () => {
    const payload = collectPayload("Approved");
    if (!payload.credit_note_id) return showToast("Credit Note ID is required", "error");
    try {
      const res = await fetch(`/api/credit-notes/${encodeURIComponent(payload.credit_note_id)}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error();
      window.location.href = `/credit-note?toast=${encodeURIComponent("Credit note marked as paid")}&type=success`;
    } catch {
      showToast("Failed to mark as paid", "error");
    }
  });

  document.getElementById("cnDeleteBtn")?.addEventListener("click", async () => {
    const creditId = getVal("cnId");
    if (!creditId) return showToast("Credit Note ID is required", "error");
    try {
      const res = await fetch(`/api/credit-notes/${encodeURIComponent(creditId)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      window.location.href = `/credit-note?toast=${encodeURIComponent("Credit note deleted")}&type=success`;
    } catch {
      showToast("Failed to delete credit note", "error");
    }
  });

  document.getElementById("cnEmailAction")?.addEventListener("click", () => {
    const modal = document.getElementById("cnEmailModal");
    if (modal) modal.style.display = "flex";
  });
  document.getElementById("cnCancelEmailBtn")?.addEventListener("click", () => {
    const modal = document.getElementById("cnEmailModal");
    if (modal) modal.style.display = "none";
  });

  const tabs = document.querySelectorAll(".cn-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const key = tab.dataset.tab;
      document.getElementById("cnCommentsPanel")?.classList.toggle("hidden", key !== "comments");
      document.getElementById("cnHistoryPanel")?.classList.toggle("hidden", key !== "history");
      document.getElementById("cnAttachmentsPanel")?.classList.toggle("hidden", key !== "attachments");
    });
  });
});
function getConfig() {
  const el = document.getElementById("credit-inline-config");
  if (!el) return {};
  try {
    return JSON.parse(el.textContent || "{}");
  } catch {
    return {};
  }
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

function getVal(id) {
  return (document.getElementById(id)?.value || "").trim();
}

function getText(id) {
  return (document.getElementById(id)?.innerText || "").trim();
}

function showToast(message, type = "success") {
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

function renderRows(items) {
  const tbody = document.getElementById("cnItemsBody");
  if (!tbody) return;
  if (!Array.isArray(items) || !items.length) {
    tbody.innerHTML = '<tr><td colspan="11" class="cn-empty">No returned items</td></tr>';
    return;
  }
  tbody.innerHTML = "";
  items.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${item.product_name ?? ""}</td>
      <td>${item.product_id ?? ""}</td>
      <td>${item.return_qty ?? item.return_quantity ?? item.quantity ?? 0}</td>
      <td>${item.uom ?? ""}</td>
      <td>${item.reason ?? item.return_reason ?? ""}</td>
      <td>${item.unit_price ?? 0}</td>
      <td>${item.tax_percent ?? 0}</td>
      <td>${item.discount ?? 0}</td>
      <td>${item.total ?? 0}</td>
      <td><button type="button" class="cn-delete-row-btn" title="Delete">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function calculateReturnedTotal() {
  let total = 0;
  document.querySelectorAll("#cnItemsBody tr").forEach((row) => {
    const totalCell = row.children[9];
    if (totalCell && totalCell.innerText) total += parseFloat(totalCell.innerText) || 0;
  });
  return total;
}

function calculateRefund() {
  const invoiceTotal = Math.max(parseFloat(getVal("cnInvoiceTotal")) || 0, 0);
  const amountPaidInput = document.getElementById("cnAmountPaid");
  const refundPaidInput = document.getElementById("cnRefundPaid");
  const balanceDueEl = document.getElementById("cnBalanceDue");
  const invoiceReturnAmountEl = document.getElementById("cnInvoiceReturnAmount");
  const balanceToRefundEl = document.getElementById("cnBalanceToRefund");

  let amountPaid = Math.max(parseFloat(amountPaidInput?.value) || 0, 0);
  if (amountPaid > invoiceTotal) amountPaid = invoiceTotal;

  let invoiceReturnAmount = Math.max(calculateReturnedTotal(), 0);
  if (invoiceReturnAmount > invoiceTotal) invoiceReturnAmount = invoiceTotal;

  const refundableBase = Math.min(invoiceReturnAmount, amountPaid);
  let refundPaid = Math.max(parseFloat(refundPaidInput?.value) || 0, 0);
  if (refundPaid > refundableBase) refundPaid = refundableBase;

  if (amountPaidInput) amountPaidInput.max = invoiceTotal.toFixed(2);
  if (refundPaidInput) refundPaidInput.max = refundableBase.toFixed(2);
  if (balanceDueEl) balanceDueEl.innerText = Math.max(invoiceTotal - amountPaid, 0).toFixed(2);
  if (invoiceReturnAmountEl) invoiceReturnAmountEl.innerText = invoiceReturnAmount.toFixed(2);
  if (balanceToRefundEl) balanceToRefundEl.innerText = Math.max(refundableBase - refundPaid, 0).toFixed(2);
}

async function loadInvoiceIds() {
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

function clearInvoiceData() {
  [
    "cnCustomerName", "cnCustomerId", "cnBillingAddress", "cnPhone",
    "cnInvoiceDate", "cnDueDate", "cnPaymentTerms", "cnInvoiceStatus",
    "cnPaymentStatus", "cnInvoiceTotal"
  ].forEach((id) => setVal(id, ""));
  setVal("cnAmountPaid", "0.00");
  setVal("cnRefundPaid", "");
  const totalDisplay = document.getElementById("invoice_total_display");
  if (totalDisplay) totalDisplay.textContent = "0.00";
  renderRows([]);
  calculateRefund();
}

async function fillFromInvoice(invoiceId) {
  if (!invoiceId) return clearInvoiceData();
  const detailsRes = await fetch(`/api/invoice-details-credit/${encodeURIComponent(invoiceId)}`);
  const details = await detailsRes.json();
  if (!detailsRes.ok || !details.success) {
    clearInvoiceData();
    showToast("Failed to fetch invoice details", "error");
    return;
  }

  const inv = details.invoice || {};
  setVal("cnCustomerName", inv.customer_name || "");
  setVal("cnCustomerId", inv.customer_id || "");
  setVal("cnBillingAddress", inv.billing_address || "");
  setVal("cnPhone", inv.phone || "");
  setVal("cnInvoiceDate", inv.invoice_date || "");
  setVal("cnDueDate", inv.due_date || "");
  setVal("cnPaymentTerms", inv.payment_terms || "");
  setVal("cnInvoiceStatus", inv.status || "");
  setVal("cnPaymentStatus", inv.payment_status || "");
  setVal("cnInvoiceTotal", Number(inv.grand_total || 0).toFixed(2));
  setVal("cnAmountPaid", "0.00");
  setVal("cnRefundPaid", "");

  const totalDisplay = document.getElementById("invoice_total_display");
  if (totalDisplay) totalDisplay.textContent = Number(inv.grand_total || 0).toFixed(2);

  const retRes = await fetch(`/api/invoice-return-items/${encodeURIComponent(invoiceId)}`);
  const retData = retRes.ok ? await retRes.json() : { items: [] };
  renderRows(Array.isArray(retData?.items) ? retData.items : []);
  calculateRefund();
}

function collectLineItems() {
  const rows = Array.from(document.querySelectorAll("#cnItemsBody tr"));
  return rows.map((row) => {
    const cells = row.querySelectorAll("td");
    if (!cells || cells.length < 10) return null;
    const productName = (cells[1]?.innerText || "").trim();
    const productId = (cells[2]?.innerText || "").trim();
    if (!productName && !productId) return null;
    return {
      sno: (cells[0]?.innerText || "").trim(),
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
  }).filter(Boolean);
}

function collectPayload(status) {
  return {
    credit_note_id: getVal("cnId"),
    credit_note_date: getVal("cnDate"),
    invoice_ref_id: getVal("cnInvoiceRef"),
    created_by: getVal("cnCreatedBy"),
    branch: getVal("cnBranch"),
    currency: getVal("cnCurrency"),
    customer_name: getVal("cnCustomerName"),
    customer_id: getVal("cnCustomerId"),
    billing_address: getVal("cnBillingAddress"),
    phone: getVal("cnPhone"),
    invoice_date: getVal("cnInvoiceDate"),
    due_date: getVal("cnDueDate"),
    payment_terms: getVal("cnPaymentTerms"),
    invoice_status: getVal("cnInvoiceStatus"),
    payment_status: getVal("cnPaymentStatus"),
    invoice_total: getVal("cnInvoiceTotal"),
    amount_paid: getVal("cnAmountPaid"),
    balance_due: getText("cnBalanceDue"),
    invoice_return_amount: getText("cnInvoiceReturnAmount"),
    balance_to_refund: getText("cnBalanceToRefund"),
    refund_mode: getVal("cnRefundMode"),
    refund_paid: getVal("cnRefundPaid"),
    refund_date: getVal("cnRefundDate"),
    adjusted_invoice_reference: getVal("cnAdjustedInvoiceRef"),
    items: collectLineItems(),
    status
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const config = getConfig();
  if (config.creditId) setVal("cnId", config.creditId);
  if (!getVal("cnDate")) setVal("cnDate", new Date().toISOString().split("T")[0]);

  loadInvoiceIds().catch(() => showToast("Failed to load invoice IDs", "error"));

  document.getElementById("cnInvoiceRef")?.addEventListener("change", function () {
    fillFromInvoice(this.value).catch(() => showToast("Failed to fetch invoice details", "error"));
  });

  document.getElementById("cnCancelBtn")?.addEventListener("click", () => {
    window.location.href = "/credit-note";
  });

  document.getElementById("cnItemsBody")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".cn-delete-row-btn");
    if (!btn) return;
    btn.closest("tr")?.remove();
    calculateRefund();
  });

  document.getElementById("cnAmountPaid")?.addEventListener("input", calculateRefund);
  document.getElementById("cnRefundPaid")?.addEventListener("input", calculateRefund);
  calculateRefund();

  document.getElementById("cnSaveDraftBtn")?.addEventListener("click", async () => {
    const payload = collectPayload("Draft");
    if (!payload.credit_note_id) return showToast("Credit Note ID is required", "error");
    try {
      const res = await fetch("/api/credit-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("save failed");
      window.location.href = `/credit-note?toast=${encodeURIComponent("Credit note saved as draft")}&type=success`;
    } catch {
      showToast("Failed to save credit note", "error");
    }
  });

  document.getElementById("cnMarkPaidBtn")?.addEventListener("click", async () => {
    const payload = collectPayload("Approved");
    if (!payload.credit_note_id) return showToast("Credit Note ID is required", "error");
    try {
      const res = await fetch(`/api/credit-notes/${encodeURIComponent(payload.credit_note_id)}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("mark paid failed");
      window.location.href = `/credit-note?toast=${encodeURIComponent("Credit note marked as paid")}&type=success`;
    } catch {
      showToast("Failed to mark as paid", "error");
    }
  });

  document.getElementById("cnDeleteBtn")?.addEventListener("click", async () => {
    const creditId = getVal("cnId");
    if (!creditId) return showToast("Credit Note ID is required", "error");
    try {
      const res = await fetch(`/api/credit-notes/${encodeURIComponent(creditId)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      window.location.href = `/credit-note?toast=${encodeURIComponent("Credit note deleted")}&type=success`;
    } catch {
      showToast("Failed to delete credit note", "error");
    }
  });

  // Basic tab toggle
  const tabs = document.querySelectorAll(".cn-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const key = tab.dataset.tab;
      document.getElementById("cnCommentsPanel")?.classList.toggle("hidden", key !== "comments");
      document.getElementById("cnHistoryPanel")?.classList.toggle("hidden", key !== "history");
      document.getElementById("cnAttachmentsPanel")?.classList.toggle("hidden", key !== "attachments");
    });
  });

  // Basic email modal open/close
  document.getElementById("cnEmailAction")?.addEventListener("click", () => {
    const m = document.getElementById("cnEmailModal");
    if (m) m.style.display = "flex";
  });
  document.getElementById("cnCancelEmailBtn")?.addEventListener("click", () => {
    const m = document.getElementById("cnEmailModal");
    if (m) m.style.display = "none";
  });
});
function cfg() {
  const el = document.getElementById("credit-inline-config");
  if (!el) return {};
  try { return JSON.parse(el.textContent || "{}"); } catch { return {}; }
}

function setField(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

function calcReturnedTotal() {
  let total = 0;
  document.querySelectorAll("#cnItemsBody tr").forEach((row) => {
    const totalCell = row.children[9];
    if (totalCell && totalCell.innerText) total += parseFloat(totalCell.innerText) || 0;
  });
  return total;
}

function calcRefund() {
  const invoiceTotal = Math.max(parseFloat(document.getElementById("cnInvoiceTotal")?.value) || 0, 0);
  const amountPaidInput = document.getElementById("cnAmountPaid");
  const refundPaidInput = document.getElementById("cnRefundPaid");
  const balanceDueEl = document.getElementById("cnBalanceDue");
  const invoiceReturnAmountEl = document.getElementById("cnInvoiceReturnAmount");
  const balanceToRefundEl = document.getElementById("cnBalanceToRefund");

  let amountPaid = Math.max(parseFloat(amountPaidInput?.value) || 0, 0);
  if (amountPaid > invoiceTotal) amountPaid = invoiceTotal;
  let invoiceReturnAmount = Math.max(calcReturnedTotal(), 0);
  if (invoiceReturnAmount > invoiceTotal) invoiceReturnAmount = invoiceTotal;
  const refundableBase = Math.min(invoiceReturnAmount, amountPaid);
  let refundPaid = Math.max(parseFloat(refundPaidInput?.value) || 0, 0);
  if (refundPaid > refundableBase) refundPaid = refundableBase;

  if (amountPaidInput) amountPaidInput.max = invoiceTotal.toFixed(2);
  if (refundPaidInput) refundPaidInput.max = refundableBase.toFixed(2);
  if (balanceDueEl) balanceDueEl.innerText = Math.max(invoiceTotal - amountPaid, 0).toFixed(2);
  if (invoiceReturnAmountEl) invoiceReturnAmountEl.innerText = invoiceReturnAmount.toFixed(2);
  if (balanceToRefundEl) balanceToRefundEl.innerText = Math.max(refundableBase - refundPaid, 0).toFixed(2);
}

function renderRows(items) {
  const tbody = document.getElementById("cnItemsBody");
  if (!tbody) return;
  if (!Array.isArray(items) || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="cn-empty">No returned items</td></tr>';
    return;
  }
  tbody.innerHTML = "";
  items.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${item.product_name ?? ""}</td>
      <td>${item.product_id ?? ""}</td>
      <td>${item.return_qty ?? item.quantity ?? 0}</td>
      <td>${item.uom ?? ""}</td>
      <td>${item.reason ?? ""}</td>
      <td>${item.unit_price ?? 0}</td>
      <td>${item.tax_percent ?? 0}</td>
      <td>${item.discount ?? 0}</td>
      <td>${item.total ?? 0}</td>
      <td><button type="button" class="cn-delete-row-btn" title="Delete">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadInvoiceIds() {
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

function clearInvoiceData() {
  [
    "cnCustomerName", "cnCustomerId", "cnBillingAddress", "cnPhone",
    "cnInvoiceDate", "cnDueDate", "cnPaymentTerms", "cnInvoiceStatus",
    "cnPaymentStatus", "cnInvoiceTotal"
  ].forEach((id) => setField(id, ""));
  setField("cnAmountPaid", "0.00");
  setField("cnRefundPaid", "");
  const totalDisplay = document.getElementById("invoice_total_display");
  if (totalDisplay) totalDisplay.textContent = "0.00";
  renderRows([]);
  calcRefund();
}

async function onInvoiceChange(invoiceId) {
  if (!invoiceId) return clearInvoiceData();
  const detailsRes = await fetch(`/api/invoice-details-credit/${encodeURIComponent(invoiceId)}`);
  const details = await detailsRes.json();
  if (!detailsRes.ok || !details.success) return clearInvoiceData();

  const inv = details.invoice || {};
  setField("cnCustomerName", inv.customer_name || "");
  setField("cnCustomerId", inv.customer_id || "");
  setField("cnBillingAddress", inv.billing_address || "");
  setField("cnPhone", inv.phone || "");
  setField("cnInvoiceDate", inv.invoice_date || "");
  setField("cnDueDate", inv.due_date || "");
  setField("cnPaymentTerms", inv.payment_terms || "");
  setField("cnInvoiceStatus", inv.status || "");
  setField("cnPaymentStatus", inv.payment_status || "");
  setField("cnInvoiceTotal", Number(inv.grand_total || 0).toFixed(2));
  setField("cnAmountPaid", "0.00");
  setField("cnRefundPaid", "");
  const totalDisplay = document.getElementById("invoice_total_display");
  if (totalDisplay) totalDisplay.textContent = Number(inv.grand_total || 0).toFixed(2);

  const retRes = await fetch(`/api/invoice-return-items/${encodeURIComponent(invoiceId)}`);
  const retData = retRes.ok ? await retRes.json() : { items: [] };
  renderRows(Array.isArray(retData?.items) ? retData.items : []);
  calcRefund();
}

document.addEventListener("DOMContentLoaded", () => {
  const c = cfg();
  if (c.creditId) setField("cnId", c.creditId);
  if (!document.getElementById("cnDate")?.value) setField("cnDate", new Date().toISOString().split("T")[0]);

  loadInvoiceIds().catch(console.error);
  document.getElementById("cnInvoiceRef")?.addEventListener("change", function () {
    onInvoiceChange(this.value).catch(console.error);
  });
  document.getElementById("cnCancelBtn")?.addEventListener("click", () => { window.location.href = "/credit-note"; });
  document.getElementById("cnItemsBody")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".cn-delete-row-btn");
    if (!btn) return;
    btn.closest("tr")?.remove();
    calcRefund();
  });
  document.getElementById("cnAmountPaid")?.addEventListener("input", calcRefund);
  document.getElementById("cnRefundPaid")?.addEventListener("input", calcRefund);
  calcRefund();
});
function getConfig() {
  const el = document.getElementById("credit-inline-config");
  if (!el) return {};
  try {
    return JSON.parse(el.textContent || "{}");
  } catch {
    return {};
  }
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

function showToast(message, type = "success") {
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

function calculateReturnedTotal() {
  // Business rule: keep Invoice Return Amount as 0 by default.
  return 0;
}

function calculateRefund() {
  const invoiceTotal = Math.max(parseFloat(document.getElementById("cnInvoiceTotal")?.value) || 0, 0);
  const amountPaidInput = document.getElementById("cnAmountPaid");
  const refundPaidInput = document.getElementById("cnRefundPaid");
  const balanceDueEl = document.getElementById("cnBalanceDue");
  const invoiceReturnAmountEl = document.getElementById("cnInvoiceReturnAmount");
  const balanceToRefundEl = document.getElementById("cnBalanceToRefund");

  let amountPaid = Math.max(parseFloat(amountPaidInput?.value) || 0, 0);
  if (amountPaid > invoiceTotal) amountPaid = invoiceTotal;

  let invoiceReturnAmount = Math.max(calculateReturnedTotal(), 0);
  if (invoiceReturnAmount > invoiceTotal) invoiceReturnAmount = invoiceTotal;

  const refundableBase = Math.min(invoiceReturnAmount, amountPaid);
  let refundPaid = Math.max(parseFloat(refundPaidInput?.value) || 0, 0);
  if (refundPaid > refundableBase) refundPaid = refundableBase;

  if (amountPaidInput) amountPaidInput.max = invoiceTotal.toFixed(2);
  if (refundPaidInput) refundPaidInput.max = refundableBase.toFixed(2);
  if (balanceDueEl) balanceDueEl.innerText = Math.max(invoiceTotal - amountPaid, 0).toFixed(2);
  if (invoiceReturnAmountEl) invoiceReturnAmountEl.innerText = invoiceReturnAmount.toFixed(2);
  if (balanceToRefundEl) balanceToRefundEl.innerText = Math.max(refundableBase - refundPaid, 0).toFixed(2);
}

function renderRows(items, useReturnQty) {
  const tbody = document.getElementById("cnItemsBody");
  if (!tbody) return;

  if (!Array.isArray(items) || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="cn-empty">No returned items</td></tr>';
    return;
  }

  tbody.innerHTML = "";
  items.forEach((item, idx) => {
    const qty = useReturnQty ? item.return_qty : item.quantity;
    const reason = useReturnQty ? (item.reason || "") : "";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${item.product_name ?? ""}</td>
      <td>${item.product_id ?? ""}</td>
      <td>${qty ?? 0}</td>
      <td>${item.uom ?? ""}</td>
      <td>${reason}</td>
      <td>${item.unit_price ?? 0}</td>
      <td>${item.tax_percent ?? 0}</td>
      <td>${item.discount ?? 0}</td>
      <td>${item.total ?? 0}</td>
      <td>
        <button type="button" class="cn-delete-row-btn" title="Delete">
          <svg class="cn-delete-icon" viewBox="0 0 448 512" aria-hidden="true" focusable="false">
            <path d="M135.2 17.7C140.6 7.1 151.5 0 163.3 0h121.4c11.8 0 22.7 7.1 28.1 17.7L328 32h88c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64S14.3 32 32 32h88l15.2-14.3zM53.2 467c1.6 25.7 23 45 48.8 45h244c25.8 0 47.2-19.3 48.8-45L416 128H32l21.2 339z"/>
          </svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function fillFromInvoice(invoiceId) {
  if (!invoiceId) {
    [
      "cnCustomerName", "cnCustomerId", "cnBillingAddress", "cnPhone",
      "cnInvoiceDate", "cnDueDate", "cnPaymentTerms", "cnInvoiceStatus",
      "cnPaymentStatus", "cnInvoiceTotal", "cnAmountPaid", "cnRefundPaid"
    ].forEach((id) => setVal(id, ""));
    const totalDisplay = document.getElementById("invoice_total_display");
    if (totalDisplay) totalDisplay.textContent = "0.00";
    renderRows([], true);
    calculateRefund();
    return;
  }

  try {
    const detailsRes = await fetch(`/api/invoice-details-credit/${encodeURIComponent(invoiceId)}`);
    const details = await detailsRes.json();
    if (!detailsRes.ok || !details.success) {
      showToast("Failed to fetch invoice details", "error");
      return;
    }

    const inv = details.invoice || {};
    setVal("cnCustomerName", inv.customer_name || "");
    setVal("cnCustomerId", inv.customer_id || "");
    setVal("cnBillingAddress", inv.billing_address || "");
    setVal("cnPhone", inv.phone || "");
    setVal("cnInvoiceDate", inv.invoice_date || "");
    setVal("cnDueDate", inv.due_date || "");
    setVal("cnPaymentTerms", inv.payment_terms || "");
    setVal("cnInvoiceStatus", inv.status || "");
    setVal("cnPaymentStatus", inv.payment_status || "");
    setVal("cnInvoiceTotal", Number(inv.grand_total || 0).toFixed(2));

    const totalDisplay = document.getElementById("invoice_total_display");
    if (totalDisplay) totalDisplay.textContent = Number(inv.grand_total || 0).toFixed(2);

    // User requested: keep Amount Paid default as 0 on invoice selection.
    setVal("cnAmountPaid", "0.00");
    setVal("cnRefundPaid", "");

    const returnRes = await fetch(`/api/invoice-return-items/${encodeURIComponent(invoiceId)}`);
    const returnData = returnRes.ok ? await returnRes.json() : { items: [] };
    if (Array.isArray(returnData.items) && returnData.items.length) {
      renderRows(returnData.items, true);
    } else {
      // Credit Note should be based on returned items only.
      renderRows([], true);
    }

    calculateRefund();
  } catch (err) {
    console.error(err);
    showToast("Failed to fetch invoice details", "error");
  }
}

async function loadInvoiceIds() {
  const dropdown = document.getElementById("cnInvoiceRef");
  if (!dropdown) return;
  try {
    const res = await fetch("/api/invoices-credit");
    const data = await res.json();
    const invoices = Array.isArray(data?.invoices) ? data.invoices : [];
    dropdown.innerHTML = '<option value="">Select Invoice Ref. ID</option>';
    invoices.forEach((id) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = id;
      dropdown.appendChild(option);
    });
  } catch (err) {
    console.error(err);
    showToast("Failed to load invoice IDs", "error");
  }
}

function initTabsAndComments(userName) {
  const commentsTab = document.querySelector('.cn-tab[data-tab="comments"]');
  const historyTab = document.querySelector('.cn-tab[data-tab="history"]');
  const attachmentsTab = document.querySelector('.cn-tab[data-tab="attachments"]');
  const commentsPanel = document.getElementById("cnCommentsPanel");
  const historyPanel = document.getElementById("cnHistoryPanel");
  const attachmentsPanel = document.getElementById("cnAttachmentsPanel");
  const commentInput = document.getElementById("cnCommentInput");
  const addBtn = document.getElementById("cnAddCommentBtn");
  const commentList = document.getElementById("cnCommentList");
  const emptyState = document.getElementById("cnCommentEmpty");
  const comments = [];

  function toggleTab(tab) {
    const isComments = tab === "comments";
    const isHistory = tab === "history";
    const isAttachments = tab === "attachments";
    commentsTab?.classList.toggle("active", isComments);
    historyTab?.classList.toggle("active", isHistory);
    attachmentsTab?.classList.toggle("active", isAttachments);
    commentsPanel?.classList.toggle("hidden", !isComments);
    historyPanel?.classList.toggle("hidden", !isHistory);
    attachmentsPanel?.classList.toggle("hidden", !isAttachments);
  }

  function renderComments() {
    if (!commentList || !emptyState) return;
    commentList.innerHTML = "";
    if (!comments.length) {
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");
    comments.forEach((c) => {
      const row = document.createElement("div");
      row.className = "cn-comment-row";
      row.innerHTML = `
        <div class="cn-comment-meta">
          <span class="cn-comment-user">${c.user}</span>
          <span class="cn-comment-time">- ${c.time}</span>
        </div>
        <p class="cn-comment-msg">${c.message}</p>
      `;
      commentList.appendChild(row);
    });
  }

  if (commentInput && addBtn) {
    commentInput.addEventListener("input", () => {
      addBtn.disabled = commentInput.value.trim().length === 0;
    });
    addBtn.addEventListener("click", () => {
      const msg = commentInput.value.trim();
      if (!msg) return;
      comments.unshift({ user: userName, time: new Date().toLocaleString(), message: msg });
      commentInput.value = "";
      addBtn.disabled = true;
      renderComments();
      showToast("Comment added successfully", "success");
    });
  }

  commentsTab?.addEventListener("click", () => toggleTab("comments"));
  historyTab?.addEventListener("click", () => toggleTab("history"));
  attachmentsTab?.addEventListener("click", () => toggleTab("attachments"));
  renderComments();
}

function initEmailModal() {
  const cnEmailAction = document.getElementById("cnEmailAction");
  const modal = document.getElementById("cnEmailModal");
  const emailInput = document.getElementById("cnRecipientEmail");
  const sendBtn = document.getElementById("cnSendEmailBtn");
  const cancelBtn = document.getElementById("cnCancelEmailBtn");
  if (!cnEmailAction || !modal || !sendBtn || !cancelBtn) return;

  cnEmailAction.addEventListener("click", () => {
    modal.style.display = "flex";
    if (emailInput) emailInput.value = "";
  });
  cancelBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const config = getConfig();
  const userName = (config.userName || "User").toString().trim() || "User";
  if (config.creditId) setVal("cnId", config.creditId);
  if (!document.getElementById("cnDate")?.value) {
    setVal("cnDate", new Date().toISOString().split("T")[0]);
  }

  loadInvoiceIds();

  const refSelect = document.getElementById("cnInvoiceRef");
  if (refSelect) {
    refSelect.addEventListener("change", function () {
      fillFromInvoice(this.value);
    });
  }

  document.getElementById("cnCancelBtn")?.addEventListener("click", () => {
    window.location.href = "/credit-note";
  });

  document.getElementById("cnPdfAction")?.addEventListener("click", () => {
    const creditId = (document.getElementById("cnId")?.value || "").trim();
    if (!creditId) {
      showToast("Please save the credit note first before generating PDF", "error");
      return;
    }
    window.open(`/api/credit-notes/${encodeURIComponent(creditId)}/pdf`, "_blank");
  });

  document.getElementById("cnItemsBody")?.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest(".cn-delete-row-btn");
    if (!deleteBtn) return;
    const row = deleteBtn.closest("tr");
    if (row) row.remove();
    calculateRefund();
  });

  document.getElementById("cnAmountPaid")?.addEventListener("input", calculateRefund);
  document.getElementById("cnRefundPaid")?.addEventListener("input", calculateRefund);
  calculateRefund();

  initTabsAndComments(userName);
  initEmailModal();
});
function getCreditConfig() {
  const el = document.getElementById("credit-inline-config");
  if (!el) return {};
  try {
    return JSON.parse(el.textContent || "{}");
  } catch (e) {
    return {};
  }
}

function showToast(message, type) {
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

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

function calculateReturnedTotal() {
  let total = 0;
  document.querySelectorAll("#cnItemsBody tr").forEach((row) => {
    const totalCell = row.children[9];
    if (totalCell && totalCell.innerText) {
      total += parseFloat(totalCell.innerText) || 0;
    }
  });
  return total;
}

function calculateRefund() {
  const invoiceTotal = Math.max(parseFloat(document.getElementById("cnInvoiceTotal")?.value) || 0, 0);
  const amountPaidInput = document.getElementById("cnAmountPaid");
  const refundPaidInput = document.getElementById("cnRefundPaid");
  const balanceDueEl = document.getElementById("cnBalanceDue");
  const invoiceReturnAmountEl = document.getElementById("cnInvoiceReturnAmount");
  const balanceToRefundEl = document.getElementById("cnBalanceToRefund");

  let amountPaid = Math.max(parseFloat(amountPaidInput?.value) || 0, 0);
  if (amountPaid > invoiceTotal) amountPaid = invoiceTotal;

  let invoiceReturnAmount = Math.max(calculateReturnedTotal(), 0);
  if (invoiceReturnAmount > invoiceTotal) invoiceReturnAmount = invoiceTotal;

  const refundableBase = Math.min(invoiceReturnAmount, amountPaid);
  let refundPaid = Math.max(parseFloat(refundPaidInput?.value) || 0, 0);
  if (refundPaid > refundableBase) refundPaid = refundableBase;

  if (amountPaidInput) amountPaidInput.max = invoiceTotal.toFixed(2);
  if (refundPaidInput) refundPaidInput.max = refundableBase.toFixed(2);
  if (balanceDueEl) balanceDueEl.innerText = Math.max(invoiceTotal - amountPaid, 0).toFixed(2);
  if (invoiceReturnAmountEl) invoiceReturnAmountEl.innerText = invoiceReturnAmount.toFixed(2);
  if (balanceToRefundEl) balanceToRefundEl.innerText = Math.max(refundableBase - refundPaid, 0).toFixed(2);
}

function renderRows(items, useReturnQty) {
  const tbody = document.getElementById("cnItemsBody");
  if (!tbody) return;
  if (!Array.isArray(items) || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="cn-empty">No returned items</td></tr>';
    return;
  }
  tbody.innerHTML = "";
  items.forEach((item, idx) => {
    const qty = useReturnQty ? item.return_qty : item.quantity;
    const reason = useReturnQty ? (item.reason || "") : "";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${item.product_name ?? ""}</td>
      <td>${item.product_id ?? ""}</td>
      <td>${qty ?? 0}</td>
      <td>${item.uom ?? ""}</td>
      <td>${reason}</td>
      <td>${item.unit_price ?? 0}</td>
      <td>${item.tax_percent ?? 0}</td>
      <td>${item.discount ?? 0}</td>
      <td>${item.total ?? 0}</td>
      <td>
        <button type="button" class="cn-delete-row-btn" title="Delete">
          <svg class="cn-delete-icon" viewBox="0 0 448 512" aria-hidden="true" focusable="false">
            <path d="M135.2 17.7C140.6 7.1 151.5 0 163.3 0h121.4c11.8 0 22.7 7.1 28.1 17.7L328 32h88c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64S14.3 32 32 32h88l15.2-14.3zM53.2 467c1.6 25.7 23 45 48.8 45h244c25.8 0 47.2-19.3 48.8-45L416 128H32l21.2 339z"/>
          </svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadInvoiceList() {
  const dropdown = document.getElementById("cnInvoiceRef");
  if (!dropdown) return;
  try {
    const response = await fetch("/api/invoices-credit");
    const data = await response.json();
    const invoices = Array.isArray(data?.invoices) ? data.invoices : [];
    dropdown.innerHTML = '<option value="">Select Invoice Ref. ID</option>';
    invoices.forEach((inv) => {
      const option = document.createElement("option");
      option.value = String(inv || "");
      option.textContent = String(inv || "");
      dropdown.appendChild(option);
    });
  } catch (err) {
    console.error("Failed to load invoice reference IDs:", err);
  }
}

async function handleInvoiceSelection(invoiceId) {
  if (!invoiceId) {
    [
      "cnCustomerName", "cnCustomerId", "cnBillingAddress", "cnPhone",
      "cnInvoiceDate", "cnDueDate", "cnPaymentTerms", "cnInvoiceStatus",
      "cnPaymentStatus", "cnInvoiceTotal"
    ].forEach((id) => setValue(id, ""));
    renderRows([], true);
    calculateRefund();
    return;
  }

  try {
    const detailsRes = await fetch(`/api/invoice-details-credit/${encodeURIComponent(invoiceId)}`);
    const details = await detailsRes.json();
    if (!detailsRes.ok || !details.success) return;

    const inv = details.invoice || {};
    setValue("cnCustomerName", inv.customer_name || "");
    setValue("cnCustomerId", inv.customer_id || "");
    setValue("cnBillingAddress", inv.billing_address || "");
    setValue("cnPhone", inv.phone || "");
    setValue("cnInvoiceDate", inv.invoice_date || "");
    setValue("cnDueDate", inv.due_date || "");
    setValue("cnPaymentTerms", inv.payment_terms || "");
    setValue("cnInvoiceStatus", inv.status || "");
    setValue("cnPaymentStatus", inv.payment_status || "");
    setValue("cnInvoiceTotal", Number(inv.grand_total || 0).toFixed(2));
    const totalDisplay = document.getElementById("invoice_total_display");
    if (totalDisplay) totalDisplay.textContent = Number(inv.grand_total || 0).toFixed(2);

    const returnRes = await fetch(`/api/invoice-return-items/${encodeURIComponent(invoiceId)}`);
    const returnData = returnRes.ok ? await returnRes.json() : { items: [] };
    if (Array.isArray(returnData.items) && returnData.items.length) {
      renderRows(returnData.items, true);
    } else {
      renderRows(details.items || [], false);
    }
    calculateRefund();
  } catch (err) {
    console.error("Failed to load selected invoice:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const config = getCreditConfig();
  const cnIdInput = document.getElementById("cnId");
  const dateInput = document.getElementById("cnDate");
  const invoiceRef = document.getElementById("cnInvoiceRef");
  const cancelBtn = document.getElementById("cnCancelBtn");
  const amountPaidInput = document.getElementById("cnAmountPaid");
  const refundPaidInput = document.getElementById("cnRefundPaid");

  if (cnIdInput && config.creditId) cnIdInput.value = config.creditId;
  if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().split("T")[0];

  loadInvoiceList();
  if (invoiceRef) {
    invoiceRef.addEventListener("change", function () {
      handleInvoiceSelection(this.value);
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      window.location.href = "/credit-note";
    });
  }

  if (amountPaidInput) amountPaidInput.addEventListener("input", calculateRefund);
  if (refundPaidInput) refundPaidInput.addEventListener("input", calculateRefund);
  calculateRefund();

  const cnItemsBody = document.getElementById("cnItemsBody");
  if (cnItemsBody) {
    cnItemsBody.addEventListener("click", (e) => {
      const deleteBtn = e.target.closest(".cn-delete-row-btn");
      if (!deleteBtn) return;
      const row = deleteBtn.closest("tr");
      if (row) row.remove();
      calculateRefund();
    });
  }

  const commentsTab = document.querySelector('.cn-tab[data-tab="comments"]');
  const historyTab = document.querySelector('.cn-tab[data-tab="history"]');
  const attachmentsTab = document.querySelector('.cn-tab[data-tab="attachments"]');
  const commentsPanel = document.getElementById("cnCommentsPanel");
  const historyPanel = document.getElementById("cnHistoryPanel");
  const attachmentsPanel = document.getElementById("cnAttachmentsPanel");
  const commentInput = document.getElementById("cnCommentInput");
  const addBtn = document.getElementById("cnAddCommentBtn");
  const commentList = document.getElementById("cnCommentList");
  const emptyState = document.getElementById("cnCommentEmpty");
  const currentUser = (config.userName || "User").toString().trim() || "User";
  const comments = [];

  function toggleTab(tab) {
    const isComments = tab === "comments";
    const isHistory = tab === "history";
    const isAttachments = tab === "attachments";
    commentsTab?.classList.toggle("active", isComments);
    historyTab?.classList.toggle("active", isHistory);
    attachmentsTab?.classList.toggle("active", isAttachments);
    commentsPanel?.classList.toggle("hidden", !isComments);
    historyPanel?.classList.toggle("hidden", !isHistory);
    attachmentsPanel?.classList.toggle("hidden", !isAttachments);
  }

  function renderComments() {
    if (!commentList || !emptyState) return;
    commentList.innerHTML = "";
    if (!comments.length) {
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");
    comments.forEach((c) => {
      const row = document.createElement("div");
      row.className = "cn-comment-row";
      row.innerHTML = `
        <div class="cn-comment-meta">
          <span class="cn-comment-user">${c.user}</span>
          <span class="cn-comment-time">- ${c.time}</span>
        </div>
        <p class="cn-comment-msg">${c.message}</p>
      `;
      commentList.appendChild(row);
    });
  }

  if (commentInput && addBtn) {
    commentInput.addEventListener("input", () => {
      addBtn.disabled = commentInput.value.trim().length === 0;
    });
    addBtn.addEventListener("click", () => {
      const message = commentInput.value.trim();
      if (!message) return;
      comments.unshift({
        user: currentUser,
        time: new Date().toLocaleString(),
        message
      });
      commentInput.value = "";
      addBtn.disabled = true;
      renderComments();
      showToast("Comment added successfully", "success");
    });
  }

  commentsTab?.addEventListener("click", () => toggleTab("comments"));
  historyTab?.addEventListener("click", () => toggleTab("history"));
  attachmentsTab?.addEventListener("click", () => toggleTab("attachments"));
  renderComments();
});
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("creditSearchInput");
    const clearBtn = document.getElementById("creditClearBtn");
    const statusFilter = document.getElementById("creditStatusFilter");
    const customerFilter = document.getElementById("creditCustomerFilter");
    const fromDateInput = document.getElementById("creditFromDate");
    const toDateInput = document.getElementById("creditToDate");
  
    const tbody = document.getElementById("creditTbody");
    const noDataRow = document.getElementById("creditNoDataRow");
    const showingText = document.getElementById("creditShowingText");
    const prevBtn = document.getElementById("creditPrevBtn");
    const nextBtn = document.getElementById("creditNextBtn");
    const pageText = document.getElementById("creditPageText");
    const newCreditBtn = document.getElementById("newCreditBtn");
  
    const sortTh = document.getElementById("creditStatusSortTh");
    const sortMenu = document.getElementById("creditStatusSortMenu");
  
    const STATUS_ORDER = ["Draft", "Submitted", "Approved", "Cancelled"];
    const ROWS_PER_PAGE = 10;
  
    let allRows = [];
    let filteredRows = [];
    let currentPage = 1;
    let flyEl = null;
    let hideTimer = null;
  
    function getInlineConfig() {
      const el = document.getElementById("credit-inline-config");
      if (!el) return {};
      try {
        return JSON.parse(el.textContent || "{}");
      } catch (e) {
        return {};
      }
    }
  
    function formatCommentTimestamp(d = new Date()) {
      const date = d.toLocaleDateString("en-GB");
      let time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      time = time.replace(":", ".").toLowerCase();
      return `${date}, ${time}`;
    }
  
    function showToast(message, type = "success") {
      const toast = document.createElement("div");
      toast.className = type === "error" ? "error-notification" : "success-notification";
      toast.textContent = message;
      document.body.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add("show"));
      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 280);
      }, 2200);
    }
  
    function initCreditNoteComments() {
      const commentInput = document.getElementById("cnCommentInput");
      const addBtn = document.getElementById("cnAddCommentBtn");
      const commentList = document.getElementById("cnCommentList");
      const emptyState = document.getElementById("cnCommentEmpty");
      const commentsTab = document.querySelector('.cn-tab[data-tab="comments"]');
      const historyTab = document.querySelector('.cn-tab[data-tab="history"]');
      const attachmentsTab = document.querySelector('.cn-tab[data-tab="attachments"]');
      const commentsPanel = document.getElementById("cnCommentsPanel");
      const historyPanel = document.getElementById("cnHistoryPanel");
      const attachmentsPanel = document.getElementById("cnAttachmentsPanel");
  
      if (!commentInput || !addBtn || !commentList || !emptyState) return;
  
      const config = getInlineConfig();
      const currentUser = (config.userName || "User").toString().trim() || "User";
      const comments = [];
  
      function toggleTab(tab) {
        const isComments = tab === "comments";
        const isHistory = tab === "history";
        const isAttachments = tab === "attachments";
  
        commentsTab?.classList.toggle("active", isComments);
        historyTab?.classList.toggle("active", isHistory);
        attachmentsTab?.classList.toggle("active", isAttachments);
  
        commentsPanel?.classList.toggle("hidden", !isComments);
        historyPanel?.classList.toggle("hidden", !isHistory);
        attachmentsPanel?.classList.toggle("hidden", !isAttachments);
      }
  
      function setAddBtnState() {
        addBtn.disabled = commentInput.value.trim().length === 0;
      }
  
      function renderComments() {
        commentList.innerHTML = "";
        if (!comments.length) {
          emptyState.classList.remove("hidden");
          return;
        }
  
        emptyState.classList.add("hidden");
        comments.forEach((c) => {
          const row = document.createElement("div");
          row.className = "cn-comment-row";
          row.innerHTML = `
            <div class="cn-comment-meta">
              <span class="cn-comment-user">${escapeHtml(c.user)}</span>
              <span class="cn-comment-time">- ${escapeHtml(c.time)}</span>
            </div>
            <p class="cn-comment-msg">${escapeHtml(c.message)}</p>
          `;
          commentList.appendChild(row);
        });
      }
  
      commentInput.addEventListener("input", setAddBtnState);
      addBtn.addEventListener("click", () => {
        const message = commentInput.value.trim();
        if (!message) {
          setAddBtnState();
          return;
        }
  
        comments.unshift({
          user: currentUser,
          time: formatCommentTimestamp(new Date()),
          message
        });
  
        commentInput.value = "";
        setAddBtnState();
        renderComments();
        showToast("Comment added successfully", "success");
      });
  
      commentsTab?.addEventListener("click", () => toggleTab("comments"));
      historyTab?.addEventListener("click", () => toggleTab("history"));
      attachmentsTab?.addEventListener("click", () => toggleTab("attachments"));
  
      setAddBtnState();
      renderComments();
    }
  
    function norm(v) {
      return (v ?? "").toString().trim().toLowerCase();
    }
  
    function escapeHtml(v) {
      return (v ?? "")
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }
  
    function parseDate(dateValue) {
      if (!dateValue) return 0;
      return new Date(dateValue + "T00:00:00").getTime();
    }
  
    function totalPages() {
      return filteredRows.length === 0 ? 0 : Math.ceil(filteredRows.length / ROWS_PER_PAGE);
    }
  
    function statusRank(status) {
      const idx = STATUS_ORDER.indexOf((status || "").trim());
      return idx === -1 ? 999 : idx;
    }
  
    function statusClass(status) {
      const s = norm(status);
      if (s === "draft") return "credit-status-badge credit-status-draft";
      if (s === "submitted") return "credit-status-badge credit-status-submitted";
      if (s === "approved") return "credit-status-badge credit-status-approved";
      if (s === "cancelled") return "credit-status-badge credit-status-cancelled";
      return "credit-status-badge credit-status-draft";
    }
  
    function paymentClass(paymentStatus) {
      const s = norm(paymentStatus);
      if (s === "paid") return "credit-payment-paid";
      if (s === "partial") return "credit-payment-partial";
      return "credit-payment-unpaid";
    }
  
    function removeFly() {
      if (flyEl) {
        flyEl.remove();
        flyEl = null;
      }
    }
  
    function scheduleHide() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => removeFly(), 120);
    }
  
    function keepOpen() {
      clearTimeout(hideTimer);
    }
  
    function buildFlyMenu(row, anchorBtn) {
      const crnId = String(row.crn_id || "").trim();
      if (!crnId) return;
  
      flyEl = document.createElement("div");
      flyEl.className = "credit-act-fly";
  
      const mkItem = (label, onClick) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "credit-act-item";
        button.textContent = label;
        button.addEventListener("click", onClick);
        return button;
      };
  
      flyEl.appendChild(
        mkItem("View Details", () => {
          window.location.href = `/new-credit-note?crn_id=${encodeURIComponent(crnId)}&mode=view`;
        })
      );
  
      flyEl.appendChild(
        mkItem("Delete", async () => {
          const ok = window.confirm(`Delete Credit Note ${crnId}?`);
          if (!ok) return;
  
          let deletedOnServer = false;
          try {
            const res = await fetch(`/api/credit-notes/${encodeURIComponent(crnId)}`, {
              method: "DELETE"
            });
            deletedOnServer = res.ok;
          } catch (e) {
            deletedOnServer = false;
          }
  
          // Keep UI responsive even if backend delete endpoint is not ready yet.
          allRows = allRows.filter((r) => String(r.crn_id || "") !== crnId);
          applyFilters();
          removeFly();
  
          if (!deletedOnServer) {
            console.warn("Delete endpoint not available, removed only from current list view.");
          }
        })
      );
  
      flyEl.addEventListener("mouseenter", keepOpen);
      flyEl.addEventListener("mouseleave", scheduleHide);
      document.body.appendChild(flyEl);
  
      const btnRect = anchorBtn.getBoundingClientRect();
      flyEl.style.visibility = "hidden";
      flyEl.style.left = "0px";
      flyEl.style.top = "0px";
  
      const popRect = flyEl.getBoundingClientRect();
      const gap = 8;
      const dropY = 25;
  
      let top = btnRect.top - popRect.height - gap + dropY;
      if (top < 8) top = btnRect.bottom + gap + dropY;
  
      let left = btnRect.right - popRect.width;
      const maxLeft = window.innerWidth - popRect.width - 8;
      if (left > maxLeft) left = maxLeft;
      if (left < 8) left = 8;
  
      flyEl.style.left = `${Math.round(left)}px`;
      flyEl.style.top = `${Math.round(top)}px`;
      flyEl.style.visibility = "visible";
    }
  
    function attachHoverMenu(btn, row) {
      btn.addEventListener("mouseenter", () => {
        removeFly();
        keepOpen();
        buildFlyMenu(row, btn);
      });
      btn.addEventListener("mouseleave", scheduleHide);
    }
  
    function updatePager() {
      const tp = totalPages();
      prevBtn.disabled = currentPage <= 1 || tp === 0;
      nextBtn.disabled = currentPage >= tp || tp === 0;
  
      if (tp === 0) {
        pageText.innerHTML = "Page <strong>0</strong> of <strong>0</strong>";
      } else {
        pageText.innerHTML = `Page <strong>${currentPage}</strong> of <strong>${tp}</strong>`;
      }
    }
  
    function updateShowing() {
      if (!filteredRows.length) {
        showingText.textContent = "Showing 0 of 0 Entries";
        return;
      }
      const start = (currentPage - 1) * ROWS_PER_PAGE + 1;
      const end = Math.min(currentPage * ROWS_PER_PAGE, filteredRows.length);
      showingText.textContent = `Showing ${start}-${end} of ${filteredRows.length} Entries`;
    }
  
    function renderTable() {
      tbody.innerHTML = "";
  
      if (!filteredRows.length) {
        if (noDataRow) tbody.appendChild(noDataRow);
        updatePager();
        updateShowing();
        return;
      }
  
      const start = (currentPage - 1) * ROWS_PER_PAGE;
      const rows = filteredRows.slice(start, start + ROWS_PER_PAGE);
  
      rows.forEach((item) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="credit-td-check">
            <input type="checkbox" class="credit-row-check" data-id="${escapeHtml(item.crn_id)}">
          </td>
          <td>${escapeHtml(item.crn_id)}</td>
          <td>${escapeHtml(item.invoice_ref_id)}</td>
          <td>${escapeHtml(item.customer_name)}</td>
          <td>${escapeHtml(item.credit_note_date)}</td>
          <td>
            <span class="${statusClass(item.status)}">${escapeHtml(item.status)}</span>
          </td>
          <td class="${paymentClass(item.payment_status)}">${escapeHtml(item.payment_status)}</td>
          <td>
            <button type="button" class="credit-action-btn" title="Actions">⋮</button>
          </td>
        `;
        tbody.appendChild(tr);
  
        const dots = tr.querySelector(".credit-action-btn");
        if (dots) attachHoverMenu(dots, item);
      });
  
      updatePager();
      updateShowing();
    }
  
    function applyFilters() {
      const q = norm(searchInput.value);
      const status = statusFilter.value;
      const customer = customerFilter.value;
      const from = fromDateInput.value;
      const to = toDateInput.value;
  
      if (from && to && parseDate(to) < parseDate(from)) {
        toDateInput.value = "";
        alert("To date cannot be earlier than From date");
        return;
      }
  
      filteredRows = allRows.filter((row) => {
        const searchMatch =
          norm(row.crn_id).includes(q) ||
          norm(row.invoice_ref_id).includes(q) ||
          norm(row.customer_name).includes(q);
  
        const statusMatch = status === "all" || row.status === status;
        const customerMatch = customer === "all" || row.customer_name === customer;
  
        let dateMatch = true;
        if (from || to) {
          const rowDate = parseDate(row.credit_note_date);
          const fromTime = from ? parseDate(from) : null;
          const toTime = to ? parseDate(to) + 86400000 : null;
          if (fromTime && rowDate < fromTime) dateMatch = false;
          if (toTime && rowDate >= toTime) dateMatch = false;
        }
  
        return searchMatch && statusMatch && customerMatch && dateMatch;
      });
  
      currentPage = 1;
      renderTable();
    }
  
    function applyStatusSort(mode) {
      if (mode === "newest") {
        filteredRows.sort((a, b) => parseDate(b.credit_note_date) - parseDate(a.credit_note_date));
      } else if (mode === "oldest") {
        filteredRows.sort((a, b) => parseDate(a.credit_note_date) - parseDate(b.credit_note_date));
      } else if (mode === "progress") {
        filteredRows.sort((a, b) => statusRank(a.status) - statusRank(b.status));
      } else if (mode === "reverse") {
        filteredRows.sort((a, b) => statusRank(b.status) - statusRank(a.status));
      }
      currentPage = 1;
      renderTable();
    }
  
    async function loadCreditNotes() {
      try {
        const res = await fetch("/api/credit-notes");
        if (!res.ok) throw new Error("credit notes api unavailable");
        const payload = await res.json();
        const rows = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
  
        allRows = rows.map((r) => ({
          crn_id: r.crn_id || r.credit_note_id || "",
          invoice_ref_id: r.invoice_ref_id || r.invoice_id || "",
          customer_name: r.customer_name || "",
          credit_note_date: r.credit_note_date || r.note_date || "",
          status: r.status || "Draft",
          payment_status: r.payment_status || "Unpaid"
        }));
  
      } catch (err) {
        console.warn("Failed to load credit note data:", err);
        allRows = [];
      }
  
      filteredRows = [...allRows];
      renderTable();
    }
  
    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (statusFilter) statusFilter.addEventListener("change", applyFilters);
    if (customerFilter) customerFilter.addEventListener("change", applyFilters);
    if (fromDateInput) fromDateInput.addEventListener("change", applyFilters);
    if (toDateInput) toDateInput.addEventListener("change", applyFilters);
  
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        if (statusFilter) statusFilter.value = "all";
        if (customerFilter) customerFilter.value = "all";
        if (fromDateInput) fromDateInput.value = "";
        if (toDateInput) toDateInput.value = "";
        applyFilters();
      });
    }
  
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (prevBtn.disabled) return;
        currentPage -= 1;
        renderTable();
      });
    }
  
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (nextBtn.disabled) return;
        currentPage += 1;
        renderTable();
      });
    }
  
    window.addEventListener("scroll", () => removeFly(), true);
    window.addEventListener("resize", () => removeFly());
  
    if (sortTh && sortMenu) {
      sortTh.addEventListener("click", (e) => {
        if (e.target.closest("#creditStatusSortMenu")) return;
        sortTh.classList.toggle("open");
      });
  
      document.addEventListener("click", (e) => {
        if (!e.target.closest("#creditStatusSortTh")) {
          sortTh.classList.remove("open");
        }
      });
  
      sortMenu.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-sort]");
        if (!btn) return;
        applyStatusSort(btn.dataset.sort);
        sortTh.classList.remove("open");
      });
    }
  
    if (newCreditBtn) {
      newCreditBtn.addEventListener("click", () => {
        window.location.href = "/new-credit-note";
      });
    }
  
    const cancelBtn = document.getElementById("cnCancelBtn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        window.location.href = "/credit-note";
      });
    }
  
    const cnPdfAction = document.getElementById("cnPdfAction");
    if (cnPdfAction) {
      cnPdfAction.addEventListener("click", cnGeneratePDF);
    }
  
    const cnEmailAction = document.getElementById("cnEmailAction");
    if (cnEmailAction) {
      cnEmailAction.addEventListener("click", cnSendEmail);
    }
  
    const cnItemsBody = document.getElementById("cnItemsBody");
    if (cnItemsBody) {
      cnItemsBody.addEventListener("click", (e) => {
        const deleteBtn = e.target.closest(".cn-delete-row-btn");
        if (!deleteBtn) return;
  
        const tr = deleteBtn.closest("tr");
        if (!tr) return;
        tr.remove();
  
        const rows = Array.from(cnItemsBody.querySelectorAll("tr")).filter((row) => !row.querySelector(".cn-empty"));
        if (!rows.length) {
          cnItemsBody.innerHTML = '<tr><td colspan="11" class="cn-empty">No returned items</td></tr>';
          return;
        }
  
        rows.forEach((row, idx) => {
          const firstCell = row.querySelector("td");
          if (firstCell) firstCell.textContent = String(idx + 1);
        });
      });
    }
  
    if (tbody && pageText && showingText && prevBtn && nextBtn) {
      renderTable();
      loadCreditNotes();
    }
  
    initCreditNoteComments();
  });
  
  document.addEventListener("DOMContentLoaded", function () {
      const configElement = document.getElementById("credit-inline-config");
      let config = {};
  
      if (configElement) {
          try {
              config = JSON.parse(configElement.textContent || "{}");
          } catch (err) {
              console.warn("Invalid credit inline config:", err);
              config = {};
          }
      }
  
      const cnIdInput = document.getElementById("cnId");
      if (cnIdInput && config.creditId) {
          cnIdInput.value = config.creditId;
      }
  
      const dateInput = document.getElementById("cnDate");
      if (dateInput && !dateInput.value) {
          const today = new Date().toISOString().split("T")[0];
          dateInput.value = today;
      }
  
      const invoiceTotalDisplay = document.getElementById("invoice_total_display");
      const dropdown = document.getElementById("cnInvoiceRef");
      const tbody = document.getElementById("cnItemsBody");
      const amountPaidInput = document.getElementById("cnAmountPaid");
      const refundPaidInput = document.getElementById("cnRefundPaid");
      const saveDraftBtn = document.getElementById("cnSaveDraftBtn");
      const markPaidBtn = document.getElementById("cnMarkPaidBtn");
      const deleteBtn = document.getElementById("cnDeleteBtn");
  
      function setInputValue(id, val) {
          const el = document.getElementById(id);
          if (el) el.value = val ?? "";
      }
  
      function setInvoiceTotal(totalValue) {
          const numeric = Number(totalValue || 0);
          setInputValue("cnInvoiceTotal", numeric.toFixed(2));
          if (invoiceTotalDisplay) {
              invoiceTotalDisplay.textContent = numeric.toFixed(2);
          }
          if (amountPaidInput) {
              amountPaidInput.max = numeric.toFixed(2);
          }
      }
  
      function renderRows(items, isReturnItems) {
          if (!tbody) return;
          if (!Array.isArray(items) || items.length === 0) {
              tbody.innerHTML = '<tr><td colspan="11" class="cn-empty">No returned items</td></tr>';
              return;
          }
  
          tbody.innerHTML = "";
          items.forEach((item, idx) => {
              const qty = isReturnItems ? item.return_qty : item.quantity;
              const reason = isReturnItems ? (item.reason || "") : "";
              const tr = document.createElement("tr");
              tr.innerHTML = `
                  <td>${idx + 1}</td>
                  <td>${item.product_name ?? ""}</td>
                  <td>${item.product_id ?? ""}</td>
                  <td>${qty ?? 0}</td>
                  <td>${item.uom ?? ""}</td>
                  <td>${reason}</td>
                  <td>${item.unit_price ?? 0}</td>
                  <td>${item.tax_percent ?? 0}</td>
                  <td>${item.discount ?? 0}</td>
                  <td>${item.total ?? 0}</td>
                  <td>
                      <button type="button" class="cn-delete-row-btn" title="Delete">
                          <svg class="cn-delete-icon" viewBox="0 0 448 512" aria-hidden="true" focusable="false">
                              <path d="M135.2 17.7C140.6 7.1 151.5 0 163.3 0h121.4c11.8 0 22.7 7.1 28.1 17.7L328 32h88c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64S14.3 32 32 32h88l15.2-14.3zM53.2 467c1.6 25.7 23 45 48.8 45h244c25.8 0 47.2-19.3 48.8-45L416 128H32l21.2 339z"/>
                          </svg>
                      </button>
                  </td>
              `;
              tbody.appendChild(tr);
          });
      }
  
      function clearInvoiceFields() {
          [
              "cnCustomerName", "cnCustomerId", "cnBillingAddress", "cnPhone",
              "cnInvoiceDate", "cnDueDate", "cnPaymentTerms", "cnInvoiceStatus",
              "cnPaymentStatus", "cnInvoiceTotal"
          ].forEach((id) => setInputValue(id, ""));
  
          setInvoiceTotal(0);
          renderRows([], true);
          calculateRefund();
      }
  
      async function handleInvoiceSelection(invoiceId) {
          if (!invoiceId) {
              clearInvoiceFields();
              return;
          }
  
          try {
              const detailsRes = await fetch(`/api/invoice-details-credit/${encodeURIComponent(invoiceId)}`);
              const details = await detailsRes.json();
              if (!detailsRes.ok || !details.success) {
                  clearInvoiceFields();
                  return;
              }
  
              const inv = details.invoice || {};
              setInputValue("cnCustomerName", inv.customer_name || "");
              setInputValue("cnCustomerId", inv.customer_id || "");
              setInputValue("cnBillingAddress", inv.billing_address || "");
              setInputValue("cnPhone", inv.phone || "");
              setInputValue("cnInvoiceDate", inv.invoice_date || "");
              setInputValue("cnDueDate", inv.due_date || "");
              setInputValue("cnPaymentTerms", inv.payment_terms || "");
              setInputValue("cnInvoiceStatus", inv.status || "");
              setInputValue("cnPaymentStatus", inv.payment_status || "");
              setInvoiceTotal(inv.grand_total || 0);
  
              const returnRes = await fetch(`/api/invoice-return-items/${encodeURIComponent(invoiceId)}`);
              const returnData = returnRes.ok ? await returnRes.json() : { items: [] };
              if (Array.isArray(returnData.items) && returnData.items.length) {
                  renderRows(returnData.items, true);
              } else {
                  renderRows(details.items || [], false);
              }
  
              calculateRefund();
          } catch (err) {
              console.error("Failed to load selected invoice:", err);
              clearInvoiceFields();
          }
      }
  
      if (dropdown) {
          fetch("/api/invoices-credit")
              .then((response) => response.json())
              .then((data) => {
                  const invoices = Array.isArray(data?.invoices) ? data.invoices : [];
                  dropdown.innerHTML = '<option value="">Select Invoice Ref. ID</option>';
                  invoices.forEach((inv) => {
                      const option = document.createElement("option");
                      option.value = String(inv || "");
                      option.textContent = String(inv || "");
                      dropdown.appendChild(option);
                  });
              })
              .catch((err) => {
                  console.error("Failed to load invoice reference IDs:", err);
              });
  
          dropdown.addEventListener("change", function () {
              handleInvoiceSelection(this.value);
          });
      }
  
      function getText(id) {
          const el = document.getElementById(id);
          return (el?.innerText || "").trim();
      }
  
      function getValue(id) {
          const el = document.getElementById(id);
          return (el?.value || "").trim();
      }
  
      function collectLineItems() {
          const rows = Array.from(document.querySelectorAll("#cnItemsBody tr"));
          return rows
              .map((row) => {
                  const cells = row.querySelectorAll("td");
                  if (!cells || cells.length < 10) return null;
                  const productName = (cells[1]?.innerText || "").trim();
                  const productId = (cells[2]?.innerText || "").trim();
                  if (!productName && !productId) return null;
                  return {
                      sno: (cells[0]?.innerText || "").trim(),
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
  
      function collectCreditNotePayload(status) {
          return {
              credit_note_id: getValue("cnId"),
              credit_note_date: getValue("cnDate"),
              invoice_ref_id: getValue("cnInvoiceRef"),
              created_by: getValue("cnCreatedBy"),
              branch: getValue("cnBranch"),
              currency: getValue("cnCurrency"),
              customer_name: getValue("cnCustomerName"),
              customer_id: getValue("cnCustomerId"),
              billing_address: getValue("cnBillingAddress"),
              phone: getValue("cnPhone"),
              invoice_date: getValue("cnInvoiceDate"),
              due_date: getValue("cnDueDate"),
              payment_terms: getValue("cnPaymentTerms"),
              invoice_status: getValue("cnInvoiceStatus"),
              payment_status: getValue("cnPaymentStatus"),
              invoice_total: getValue("cnInvoiceTotal"),
              amount_paid: getValue("cnAmountPaid"),
              balance_due: getText("cnBalanceDue"),
              invoice_return_amount: getText("cnInvoiceReturnAmount"),
              balance_to_refund: getText("cnBalanceToRefund"),
              refund_mode: getValue("cnRefundMode"),
              refund_paid: getValue("cnRefundPaid"),
              refund_date: getValue("cnRefundDate"),
              adjusted_invoice_reference: getValue("cnAdjustedInvoiceRef"),
              items: collectLineItems(),
              status
          };
      }
  
      async function saveCreditNote(status) {
          const payload = collectCreditNotePayload(status);
          if (!payload.credit_note_id) {
              alert("Credit Note ID is required.");
              return false;
          }
          try {
              const res = await fetch("/api/credit-notes", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload)
              });
              if (!res.ok) throw new Error("save failed");
              const msg = status === "Approved" ? "Credit note marked as paid" : "Credit note saved as draft";
              window.location.href = `/credit-note?toast=${encodeURIComponent(msg)}&type=success`;
              return true;
          } catch (err) {
              console.error("Failed to save credit note:", err);
              showToast("Failed to save credit note", "error");
              return false;
          }
      }
  
      saveDraftBtn?.addEventListener("click", async () => {
          await saveCreditNote("Draft");
      });
  
      markPaidBtn?.addEventListener("click", async () => {
          const payload = collectCreditNotePayload("Approved");
          if (!payload.credit_note_id) {
              alert("Credit Note ID is required.");
              return;
          }
          try {
              const res = await fetch(`/api/credit-notes/${encodeURIComponent(payload.credit_note_id)}/mark-paid`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload)
              });
              if (!res.ok) throw new Error("mark paid failed");
              window.location.href = `/credit-note?toast=${encodeURIComponent("Credit note marked as paid")}&type=success`;
          } catch (err) {
              console.error("Failed to mark credit note as paid:", err);
              showToast("Failed to mark as paid", "error");
          }
      });
  
      deleteBtn?.addEventListener("click", async () => {
          const creditId = getValue("cnId");
          if (!creditId) {
              alert("Credit Note ID is required.");
              return;
          }
          const ok = window.confirm(`Delete Credit Note ${creditId}?`);
          if (!ok) return;
          try {
              const res = await fetch(`/api/credit-notes/${encodeURIComponent(creditId)}`, {
                  method: "DELETE"
              });
              if (!res.ok) throw new Error("delete failed");
              window.location.href = `/credit-note?toast=${encodeURIComponent("Credit note deleted")}&type=success`;
          } catch (err) {
              console.error("Failed to delete credit note:", err);
              showToast("Failed to delete credit note", "error");
          }
      });
  
      amountPaidInput?.addEventListener("input", calculateRefund);
      refundPaidInput?.addEventListener("input", calculateRefund);
      calculateRefund();
  });
  
  
  function calculateRefund() {
      const invoiceTotal = Math.max(parseFloat(document.getElementById("cnInvoiceTotal").value) || 0, 0);
      const amountPaidInput = document.getElementById("cnAmountPaid");
      const refundPaidInput = document.getElementById("cnRefundPaid");
      const balanceDueEl = document.getElementById("cnBalanceDue");
      const invoiceReturnAmountEl = document.getElementById("cnInvoiceReturnAmount");
      const balanceToRefundEl = document.getElementById("cnBalanceToRefund");
  
      let amountPaid = Math.max(parseFloat(amountPaidInput?.value) || 0, 0);
      if (amountPaid > invoiceTotal) amountPaid = invoiceTotal;
  
      let invoiceReturnAmount = Math.max(calculateReturnedTotal(), 0);
      if (invoiceReturnAmount > invoiceTotal) invoiceReturnAmount = invoiceTotal;
  
      const refundableBase = Math.min(invoiceReturnAmount, amountPaid);
  
      let refundPaid = Math.max(parseFloat(refundPaidInput?.value) || 0, 0);
      if (refundPaid > refundableBase) refundPaid = refundableBase;
  
      if (amountPaidInput) {
          const rawAmount = parseFloat(amountPaidInput.value);
          if (Number.isFinite(rawAmount) && rawAmount !== amountPaid) {
              amountPaidInput.value = amountPaid.toFixed(2);
          }
          amountPaidInput.max = invoiceTotal.toFixed(2);
      }
      if (refundPaidInput) {
          const rawRefund = parseFloat(refundPaidInput.value);
          if (Number.isFinite(rawRefund) && rawRefund !== refundPaid) {
              refundPaidInput.value = refundPaid.toFixed(2);
          }
          refundPaidInput.max = refundableBase.toFixed(2);
      }
  
      const balanceDue = Math.max(invoiceTotal - amountPaid, 0);
      const balanceToRefund = Math.max(refundableBase - refundPaid, 0);
  
      if (balanceDueEl) balanceDueEl.innerText = balanceDue.toFixed(2);
      if (invoiceReturnAmountEl) invoiceReturnAmountEl.innerText = invoiceReturnAmount.toFixed(2);
      if (balanceToRefundEl) balanceToRefundEl.innerText = balanceToRefund.toFixed(2);
  }
  function calculateReturnedTotal() {
      let total = 0;
  
      document.querySelectorAll("#cnItemsBody tr").forEach(row => {
          const totalCell = row.children[9]; // Total column
          if (totalCell && totalCell.innerText) {
              total += parseFloat(totalCell.innerText) || 0;
          }
      });
  
      return total;
  }
  
  
  function cnGeneratePDF() {
      const creditId = (document.getElementById("cnId")?.value || "").trim();
      if (!creditId) {
          const toast = document.createElement("div");
          toast.className = "error-notification";
          toast.textContent = "Please save the credit note first before generating PDF";
          document.body.appendChild(toast);
          requestAnimationFrame(() => toast.classList.add("show"));
          setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 280); }, 2200);
          return;
      }
      window.open(`/api/credit-notes/${encodeURIComponent(creditId)}/pdf`, "_blank");
  }
  
  function cnSendEmail() {
      const creditId = (document.getElementById("cnId")?.value || "").trim();
      if (!creditId) {
          const toast = document.createElement("div");
          toast.className = "error-notification";
          toast.textContent = "Please save the credit note first before sending email";
          document.body.appendChild(toast);
          requestAnimationFrame(() => toast.classList.add("show"));
          setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 280); }, 2200);
          return;
      }
  
      const modal = document.getElementById("cnEmailModal");
      if (!modal) return;
      modal.style.display = "flex";
  
      const emailInput = document.getElementById("cnRecipientEmail");
      if (emailInput) emailInput.value = "";
  
      const sendBtn = document.getElementById("cnSendEmailBtn");
      const cancelBtn = document.getElementById("cnCancelEmailBtn");
  
      const newSendBtn = sendBtn.cloneNode(true);
      const newCancelBtn = cancelBtn.cloneNode(true);
      sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  
      newCancelBtn.addEventListener("click", () => { modal.style.display = "none"; });
  
      newSendBtn.addEventListener("click", async () => {
          const recipient = (document.getElementById("cnRecipientEmail")?.value || "").trim();
          if (!recipient || !/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(recipient)) {
              alert("Please enter a valid email address.");
              return;
          }
          newSendBtn.disabled = true;
          newSendBtn.textContent = "Sending...";
          try {
              const res = await fetch(`/api/credit-notes/${encodeURIComponent(creditId)}/email`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: recipient })
              });
              const data = await res.json();
              const toast = document.createElement("div");
              toast.className = data.success ? "success-notification" : "error-notification";
              toast.textContent = data.success ? "Email sent successfully" : ("Failed to send email: " + (data.error || "Unknown error"));
              document.body.appendChild(toast);
              requestAnimationFrame(() => toast.classList.add("show"));
              setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 280); }, 2200);
              if (data.success) modal.style.display = "none";
          } catch (err) {
              alert("Failed to send email. Please try again.");
          } finally {
              newSendBtn.disabled = false;
              newSendBtn.textContent = "Send";
          }
      });
  }
  