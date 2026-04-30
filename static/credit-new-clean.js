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
  toast.className = type === "error" ? "error-notification" : "success-notification";
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  }, 2200);
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
      <td><button type="button" class="cn-delete-row-btn">Delete</button></td>
    `;
    body.appendChild(tr);
  });
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
  let refundPaid = Math.max(parseFloat(cnGet("cnRefundPaid")) || 0, 0);
  if (refundPaid > refundableBase) refundPaid = refundableBase;
  cnSetText("cnBalanceDue", Math.max(invoiceTotal - amountPaid, 0).toFixed(2));
  cnSetText("cnInvoiceReturnAmount", returned.toFixed(2));
  cnSetText("cnBalanceToRefund", Math.max(refundableBase - refundPaid, 0).toFixed(2));
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
  cnSet("cnAmountPaid", "0.00");
  cnSet("cnRefundPaid", "");
  cnSetText("invoice_total_display", Number(inv.grand_total || 0).toFixed(2));

  const retRes = await fetch(`/api/invoice-return-items/${encodeURIComponent(invoiceId)}`);
  const retData = retRes.ok ? await retRes.json() : { items: [] };
  cnRenderRows(Array.isArray(retData?.items) ? retData.items : []);
  cnCalcRefund();
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
  cnSet("cnAdjustedInvoiceRef", it.adjusted_invoice_reference || "");
  cnSetText("invoice_total_display", Number(it.invoice_total || 0).toFixed(2));
  cnSetText("cnBalanceDue", Number(it.balance_due || 0).toFixed(2));
  cnSetText("cnInvoiceReturnAmount", Number(it.invoice_return_amount || 0).toFixed(2));
  cnSetText("cnBalanceToRefund", Number(it.balance_to_refund || 0).toFixed(2));
  cnRenderRows(Array.isArray(it.items) ? it.items : []);
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
}

function cnApplyStatusPill(status) {
  const pill = document.getElementById("cnStatusPill");
  if (!pill) return;
  const st = String(status || "").trim() || "Draft";
  pill.textContent = `Status: ${st}`;
  pill.style.display = "inline-flex";
}

document.addEventListener("DOMContentLoaded", async () => {
  const cfg = cnCfg();
  if (cfg.creditId) cnSet("cnId", cfg.creditId);
  if (!cnGet("cnDate")) cnSet("cnDate", new Date().toISOString().split("T")[0]);

  try { await cnLoadInvoiceIds(); } catch { cnToast("Failed to load invoice IDs", "error"); }

  const mode = (cfg.mode || "new").toLowerCase();
  const invoiceRef = document.getElementById("cnInvoiceRef");

  // Always allow invoice selection fetch in this page.
  const onInvoiceRefChanged = function () {
    cnFillFromInvoice(this.value).catch(() => cnToast("Failed to fetch invoice details", "error"));
  };
  if (invoiceRef) {
    invoiceRef.addEventListener("change", onInvoiceRefChanged);
    invoiceRef.addEventListener("input", onInvoiceRefChanged);
    invoiceRef.onchange = onInvoiceRefChanged;
  }

  if (cfg.creditId) {
    cnLoadCreditNoteById(cfg.creditId)
      .then((it) => {
        const status = it?.status || "Draft";
        cnApplyStatusPill(status);
        const isDraft = String(status).trim().toLowerCase() === "draft";
        if (mode === "view" || !isDraft) cnEnableViewOnlyMode();
      })
      .catch(() => cnToast("Failed to load credit note details", "error"));
  } else {
    if (invoiceRef && invoiceRef.value) {
      cnFillFromInvoice(invoiceRef.value).catch(() => cnToast("Failed to fetch invoice details", "error"));
    }
    cnApplyStatusPill("Draft");
  }

  if (mode !== "view") {
    document.getElementById("cnAmountPaid")?.addEventListener("input", cnCalcRefund);
    document.getElementById("cnRefundPaid")?.addEventListener("input", cnCalcRefund);
  }

  document.getElementById("cnCancelBtn")?.addEventListener("click", () => {
    window.location.href = "/credit-note";
  });

  document.getElementById("cnPdfAction")?.addEventListener("click", () => {
    const creditId = cnGet("cnId");
    if (!creditId) {
      cnToast("Please save the credit note first before generating PDF", "error");
      return;
    }
    window.open(`/api/credit-notes/${encodeURIComponent(creditId)}/pdf`, "_blank");
  });

  const emailAction = document.getElementById("cnEmailAction");
  const emailModal = document.getElementById("cnEmailModal");
  const emailInput = document.getElementById("cnRecipientEmail");
  const sendBtn = document.getElementById("cnSendEmailBtn");
  const cancelEmailBtn = document.getElementById("cnCancelEmailBtn");

  emailAction?.addEventListener("click", () => {
    const id = cnGet("cnId");
    if (!id) return cnToast("Please save the credit note first before sending email", "error");
    if (emailModal) emailModal.style.display = "flex";
    if (emailInput) emailInput.value = "";
  });

  cancelEmailBtn?.addEventListener("click", () => {
    if (emailModal) emailModal.style.display = "none";
  });

  sendBtn?.addEventListener("click", async () => {
    const id = cnGet("cnId");
    if (!id) return cnToast("Please save the credit note first before sending email", "error");
    const recipient = (emailInput?.value || "").trim();
    if (!recipient || !/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(recipient)) {
      return cnToast("Please enter a valid email address", "error");
    }
    sendBtn.disabled = true;
    const oldText = sendBtn.innerText;
    sendBtn.innerText = "Sending...";
    try {
      const res = await fetch(`/api/credit-notes/${encodeURIComponent(id)}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recipient })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Email sending failed");
      cnToast("Email sent successfully", "success");
      if (emailModal) emailModal.style.display = "none";
    } catch (err) {
      cnToast(err.message || "Failed to send email", "error");
    } finally {
      sendBtn.disabled = false;
      sendBtn.innerText = oldText || "Send";
    }
  });
});
