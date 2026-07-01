function cnCfg() {
  return {
    creditId: document.getElementById("creditIdValue")?.value || "",
    mode: document.getElementById("creditModeValue")?.value || "new",
    userName: document.getElementById("creditUserNameValue")?.value || ""
  };
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
  if (!message) return;
  document.querySelectorAll(".success-notification, .error-notification").forEach((el) => el.remove());
  const isErrorLike = type === "error" || type === "warning";
  if (type !== "success" && !isErrorLike) return;

  const toast = document.createElement("div");
  toast.className = isErrorLike ? "error-notification" : "success-notification";

  const text = document.createElement("span");
  text.textContent = message;

  if (isErrorLike) {
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "✕";
    icon.style.cssText = "font-size:18px;font-weight:bold;line-height:1;flex-shrink:0;";
    toast.appendChild(icon);
  }

  toast.appendChild(text);

  Object.assign(toast.style, {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%) translateY(-100px)",
    padding: "14px 28px",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    zIndex: "10000",
    opacity: "0",
    transition: "all 0.4s cubic-bezier(0.68,-0.55,0.265,1.55)",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    maxWidth: "min(700px, calc(100vw - 32px))",
    boxSizing: "border-box",
    textAlign: "center",
    background: isErrorLike
      ? "linear-gradient(135deg,#ffe6e6,#ffc2c2)"
      : "linear-gradient(135deg,#fff4f4,#ffe8e8)",
    color: "#a12828",
    border: "1.5px solid #a12828",
    boxShadow: isErrorLike
      ? "0 8px 24px rgba(161,40,40,0.35)"
      : "0 8px 24px rgba(161,40,40,0.25)",
  });
  text.style.cssText = "line-height:1.3;white-space:normal;overflow-wrap:anywhere;word-break:break-word;";

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
    toast.style.pointerEvents = "auto";
    toast.classList.add("show");
  });
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(-100px)";
    toast.style.pointerEvents = "none";
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
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
    const qty = it.return_qty ?? it.return_quantity ?? it.returned_qty ?? it.quantity ?? 0;
    const maxQty = Number(it.max_return_qty ?? qty ?? 0) || 0;
    const qtyVal = String(parseFloat(Number(qty || 0).toFixed(2)) || "0");
    const reasonVal = String(it.reason ?? it.return_reason ?? "").trim();
    const readOnly = cnIsFormLocked();
    const selectedId = String(it.product_id || "");
    const catalog = cnAllAvailableRows.length ? cnAllAvailableRows : cnCurrentRows;
    const usedIds = new Set(
      cnCurrentRows
        .filter((_, i) => i !== idx)
        .map((r) => String(r.product_id || ""))
        .filter(Boolean)
    );
    const productOptions = catalog
      .filter((r) => {
        const pid = String(r.product_id || "");
        return pid === selectedId || !usedIds.has(pid);
      })
      .map((r) => {
        const pid = String(r.product_id || "");
        const name = String(r.product_name || pid || "");
        const label = pid && name && name !== pid ? `${name} (${pid})` : name;
        const sel = pid === selectedId ? " selected" : "";
        return `<option value="${cnEscapeHtmlText(pid)}"${sel}>${cnEscapeHtmlText(label)}</option>`;
      })
      .join("");
    const productCell = readOnly
      ? `<td>${cnEscapeHtmlText(it.product_name ?? "")}</td>`
      : `<td><select class="cn-product-name" data-idx="${idx}"><option value="">Select Product</option>${productOptions}</select></td>`;
    const qtyCell = readOnly
      ? `<td>${qtyVal}</td>`
      : `<td><input type="number" min="0" max="${maxQty}" step="0.01" class="cn-return-qty-input" value="${qtyVal}" data-max-qty="${maxQty}"></td>`;
    const reasonCell = readOnly
      ? `<td>${reasonVal}</td>`
      : `<td class="cn-return-reason-cell">
          <select class="cn-return-reason-select" data-idx="${idx}">
          <option value="">Select reason</option>
          <option value="Damaged"${reasonVal === "Damaged" ? " selected" : ""}>Damaged</option>
          <option value="Defective"${reasonVal === "Defective" ? " selected" : ""}>Defective</option>
          <option value="Wrong Item"${reasonVal === "Wrong Item" ? " selected" : ""}>Wrong Item</option>
          <option value="Expired"${reasonVal === "Expired" ? " selected" : ""}>Expired</option>
          <option value="Other"${reasonVal === "Other" ? " selected" : ""}>Other</option>
        </select>
        <div class="cn-return-reason-error" data-idx="${idx}"></div>
        </td>`;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      ${productCell}
      <td>${it.product_id ?? ""}</td>
      ${qtyCell}
      <td>${it.uom ?? ""}</td>
      ${reasonCell}
      <td>${it.unit_price ?? 0}</td>
      <td>${it.tax_percent ?? 0}</td>
      <td>${it.discount ?? 0}</td>
      <td>${it.total ?? 0}</td>
      <td>
        <button type="button" class="cn-row-delete-btn" data-idx="${idx}" ${readOnly ? "disabled" : ""} title="Remove line">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    body.appendChild(tr);
  });
  cnSyncRowDeleteButtonsLockState();
  runLiveCreditNoteValidation();
}

function cnCalcRefund() {
  const invoiceTotal = Math.max(parseFloat(cnGet("cnInvoiceTotal")) || 0, 0);
  let amountPaid = Math.max(parseFloat(cnGet("cnAmountPaid")) || 0, 0);
  if (amountPaid > invoiceTotal) amountPaid = invoiceTotal;
  let returned = 0;
  document.querySelectorAll("#cnItemsBody tr").forEach((row) => {
    const qtyCell = row.children[3];
    const qtyInput = qtyCell?.querySelector(".cn-return-qty-input");
    const qty = qtyInput ? parseFloat(qtyInput.value) || 0 : parseFloat(qtyCell?.innerText) || 0;
    const unit = parseFloat(row.children[6]?.innerText) || 0;
    const tax = parseFloat(row.children[7]?.innerText) || 0;
    const disc = parseFloat(row.children[8]?.innerText) || 0;
    const lineTotal =
      Math.round(qty * unit * (1 + tax / 100) * (1 - disc / 100) * 100) / 100;
    if (row.children[9]) row.children[9].innerText = String(lineTotal);
    returned += lineTotal;
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

  // Balance Due = Invoice Total - Amount Paid (outstanding on original invoice)
  cnSetText("cnBalanceDue", Math.max(invoiceTotal - amountPaid, 0).toFixed(2));
  cnSetText("cnInvoiceReturnAmount", returned.toFixed(2));
  cnSetText("cnBalanceToRefund", Math.max(refundableBase - refundPaid, 0).toFixed(2));
  runLiveCreditNoteValidation();
}

function cnMaybeAutoSetRefundDate() {
  const refundMode = document.getElementById("cnRefundMode");
  const refundDate = document.getElementById("cnRefundDate");
  if (!refundMode || !refundDate) return;
  if (!String(refundMode.value || "").trim()) return;
  if (String(refundDate.value || "").trim()) return;
  const noteDate = (document.getElementById("cnDate")?.value || "").trim();
  const today = new Date().toISOString().split("T")[0];
  refundDate.value = noteDate && today < noteDate ? noteDate : today;
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
  if (!v || v.length < 3 || v.length > 30) return "Created By must be 3 to 30 characters.";
  if (!/^[A-Za-z ]+$/.test(v)) return "Created By can contain only letters and spaces.";
  return "";
}

function cnIsFormLocked() {
  return !!document.querySelector(".cn-page.cn-view-only");
}

function cnFieldEditable(el) {
  if (!el || cnIsFormLocked()) return false;
  if (el.disabled) return false;
  if (el.readOnly) return false;
  return true;
}

function cnSetFieldError(inputEl, errEl, msg) {
  let err = typeof errEl === "string" ? document.getElementById(errEl) : errEl;
  if (!err && inputEl && typeof errEl === "string") {
    const host =
      inputEl.closest(".cn-field") ||
      inputEl.closest(".cn-row") ||
      inputEl.closest(".cn-section");
    if (host) {
      err = document.createElement("span");
      err.className = "cn-field-error";
      err.id = errEl;
      err.setAttribute("aria-live", "polite");
      err.hidden = true;
      const tableWrap = host.querySelector(".cn-table-wrap");
      if (tableWrap) host.insertBefore(err, tableWrap);
      else host.appendChild(err);
    }
  }
  if (!inputEl || !err) return;
  if (msg) {
    if (inputEl.matches("input, select, textarea")) {
      inputEl.classList.add("input-invalid");
      inputEl.setAttribute("aria-invalid", "true");
    }
    err.textContent = msg;
    err.hidden = false;
    err.classList.add("is-visible");
  } else {
    if (inputEl.matches("input, select, textarea")) {
      inputEl.classList.remove("input-invalid");
      inputEl.removeAttribute("aria-invalid");
    }
    err.textContent = "";
    err.hidden = true;
    err.classList.remove("is-visible");
  }
}

function cnIsValidDateString(value) {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const parts = trimmed.split("-");
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (y < 1900 || y > 2100) return false;
  const date = new Date(y, m, d);
  return date.getFullYear() === y && date.getMonth() === m && date.getDate() === d;
}

function cnInvoiceRefReady() {
  return !!(document.getElementById("cnInvoiceRef")?.value || "").trim();
}

function cnHasLineItems() {
  const body = document.getElementById("cnItemsBody");
  if (!body) return false;
  if (body.querySelector(".cn-empty")) return false;
  return Array.from(body.querySelectorAll("tr")).some((tr) => {
    const sel = tr.querySelector(".cn-product-name");
    if (sel) return !!(sel.value || "").trim();
    const name = (tr.children[1]?.innerText || "").trim();
    const id = (tr.children[2]?.innerText || "").trim();
    return !!(name || id);
  });
}

function runLiveCreditNoteValidation({ strictRefund = false, forSave = false } = {}) {
  if (!forSave && cnIsFormLocked()) {
    document.querySelectorAll(".cn-page .cn-field-error").forEach((el) => {
      el.textContent = "";
      el.hidden = true;
      el.classList.remove("is-visible");
    });
    document
      .querySelectorAll(".cn-page .input-invalid")
      .forEach((el) => el.classList.remove("input-invalid"));
    return true;
  }

  let ok = true;

  const dateEl = document.getElementById("cnDate");
  if (cnFieldEditable(dateEl)) {
    const today = new Date().toISOString().split("T")[0];
    const pageMode = (new URLSearchParams(window.location.search).get("mode") || cnCfg().mode || "new")
      .toString()
      .trim()
      .toLowerCase();
    if (pageMode === "new") {
      dateEl.min = today;
      if ((dateEl.value || "").trim() && dateEl.value < today) {
        dateEl.value = today;
      }
    } else {
      dateEl.removeAttribute("min");
    }
    const dv = (dateEl.value || "").trim();
    if (!dv) {
      cnSetFieldError(dateEl, "cnDateErr", "Please select credit note date.");
      ok = false;
    } else if (!cnIsValidDateString(dv)) {
      cnSetFieldError(dateEl, "cnDateErr", "Invalid date. Use format YYYY-MM-DD.");
      ok = false;
    } else {
      cnSetFieldError(dateEl, "cnDateErr", "");
    }
  }

  const invRefEl = document.getElementById("cnInvoiceRef");
  if (cnFieldEditable(invRefEl)) {
    if (!(invRefEl.value || "").trim()) {
      cnSetFieldError(invRefEl, "cnInvoiceRefErr", "Please select invoice reference ID.");
      ok = false;
    } else {
      cnSetFieldError(invRefEl, "cnInvoiceRefErr", "");
    }
  }

  const createdEl = document.getElementById("cnCreatedBy");
  if (cnFieldEditable(createdEl)) {
    const sanitized = cnSanitizeCreatedBy(createdEl.value);
    if (createdEl.value !== sanitized) createdEl.value = sanitized;
    const msg = cnGetCreatedByValidationMessage(sanitized);
    if (msg) {
      cnSetFieldError(
        createdEl,
        "cnCreatedByErr",
        !sanitized ? "Please enter created by." : msg
      );
      ok = false;
    } else {
      cnSetFieldError(createdEl, "cnCreatedByErr", "");
    }
  }

  const branchEl = document.getElementById("cnBranch");
  if (cnFieldEditable(branchEl)) {
    if (!(branchEl.value || "").trim()) {
      cnSetFieldError(branchEl, "cnBranchErr", "Please select branch.");
      ok = false;
    } else {
      cnSetFieldError(branchEl, "cnBranchErr", "");
    }
  }

  const payTermsEl = document.getElementById("cnPaymentTerms");
  if (cnFieldEditable(payTermsEl) && cnInvoiceRefReady()) {
    if (!(payTermsEl.value || "").trim()) {
      cnSetFieldError(payTermsEl, "cnPaymentTermsErr", "Please select payment terms.");
      ok = false;
    } else {
      cnSetFieldError(payTermsEl, "cnPaymentTermsErr", "");
    }
  } else if (payTermsEl) {
    cnSetFieldError(payTermsEl, "cnPaymentTermsErr", "");
  }

  const billEl = document.getElementById("cnBillingAddress");
  if (cnFieldEditable(billEl) && cnInvoiceRefReady()) {
    if (!(billEl.value || "").trim()) {
      cnSetFieldError(billEl, "cnBillingAddressErr", "Please enter billing address.");
      ok = false;
    } else {
      cnSetFieldError(billEl, "cnBillingAddressErr", "");
    }
  } else if (billEl) {
    cnSetFieldError(billEl, "cnBillingAddressErr", "");
  }

  const itemsTable = document.getElementById("cnItemsTable");
  let returnReasonOk = true;
  if (cnInvoiceRefReady()) {
    if (!cnHasLineItems()) {
      cnSetFieldError(itemsTable, "cnItemsErr", "Please add at least one returned line item.");
      returnReasonOk = false;
      ok = false;
    } else {
      document.querySelectorAll("#cnItemsBody tr").forEach((row) => {
        if (row.querySelector(".cn-empty")) return;
        const reasonEl = row.querySelector(".cn-return-reason-select");
        const reasonErr = row.querySelector(".cn-return-reason-error");
        if (reasonErr) reasonErr.textContent = "";
        if (!reasonEl) return;
        const qtyCell = row.children[3];
        const qtyInput = qtyCell?.querySelector(".cn-return-qty-input");
        const qty = qtyInput
          ? parseFloat(qtyInput.value) || 0
          : parseFloat(qtyCell?.innerText) || 0;
        if (qty <= 0) {
          reasonEl.classList.remove("input-invalid");
          reasonEl.removeAttribute("aria-invalid");
          return;
        }
        const reason = (reasonEl.value || "").trim();
        if (!reason) {
          reasonEl.classList.add("input-invalid");
          reasonEl.setAttribute("aria-invalid", "true");
          if (reasonErr) reasonErr.textContent = "Please select return reason.";
          returnReasonOk = false;
          ok = false;
        } else {
          reasonEl.classList.remove("input-invalid");
          reasonEl.removeAttribute("aria-invalid");
        }
      });
      cnSetFieldError(itemsTable, "cnItemsErr", "");
    }
  } else {
    returnReasonOk = false;
    cnSetFieldError(itemsTable, "cnItemsErr", "");
    document.querySelectorAll("#cnItemsBody .cn-return-reason-error").forEach((el) => {
      el.textContent = "";
    });
  }

  const amountEl = document.getElementById("cnAmountPaid");
  if (cnFieldEditable(amountEl) && cnInvoiceRefReady()) {
    cnSanitizeRefundPaidInput(amountEl);
    const raw = String(amountEl.value ?? "").trim();
    const invoiceTotal = Math.max(parseFloat(cnGet("cnInvoiceTotal")) || 0, 0);
    if (!raw) {
      cnSetFieldError(amountEl, "cnAmountPaidErr", "Please enter amount paid by customer.");
      ok = false;
    } else {
      const n = parseFloat(raw);
      if (n > invoiceTotal) {
        cnSetFieldError(amountEl, "cnAmountPaidErr", "Amount paid cannot exceed invoice total.");
        ok = false;
      } else {
        cnSetFieldError(amountEl, "cnAmountPaidErr", "");
      }
    }
  } else if (amountEl) {
    cnSetFieldError(amountEl, "cnAmountPaidErr", "");
  }

  const refundModeEl = document.getElementById("cnRefundMode");
  const refundPaidEl = document.getElementById("cnRefundPaid");
  const refundDateEl = document.getElementById("cnRefundDate");
  const noteDate = (document.getElementById("cnDate")?.value || "").trim().slice(0, 10);
  const refundModeVal = (refundModeEl?.value || "").trim();
  if (refundDateEl) {
    if (noteDate && cnIsValidDateString(noteDate)) {
      refundDateEl.min = noteDate;
      const rvMin = (refundDateEl.value || "").trim().slice(0, 10);
      if (rvMin && rvMin < noteDate && !forSave) {
        refundDateEl.value = noteDate;
      }
    } else {
      refundDateEl.removeAttribute("min");
    }
  }

  if (strictRefund) {
    if (cnFieldEditable(refundModeEl) && !refundModeVal) {
      cnSetFieldError(refundModeEl, "cnRefundModeErr", "Please select refund mode.");
      ok = false;
    } else if (refundModeEl) {
      cnSetFieldError(refundModeEl, "cnRefundModeErr", "");
    }

    if (cnFieldEditable(refundPaidEl)) {
      const raw = String(refundPaidEl.value ?? "").trim();
      const n = parseFloat(raw);
      const max = parseFloat(refundPaidEl.max) || 0;
      if (!raw || !Number.isFinite(n) || n <= 0) {
        cnSetFieldError(refundPaidEl, "cnRefundPaidErr", "Please enter refund paid amount.");
        ok = false;
      } else if (n > max && max >= 0) {
        cnSetFieldError(
          refundPaidEl,
          "cnRefundPaidErr",
          `Refund paid cannot exceed ${max.toFixed(2)}.`
        );
        ok = false;
      } else {
        cnSetFieldError(refundPaidEl, "cnRefundPaidErr", "");
      }
    }
  } else {
    if (refundModeEl) cnSetFieldError(refundModeEl, "cnRefundModeErr", "");
    if (refundPaidEl) {
      const raw = String(refundPaidEl.value ?? "").trim();
      if (raw) {
        const n = parseFloat(raw);
        const max = parseFloat(refundPaidEl.max) || 0;
        if (Number.isFinite(n) && n > max && max >= 0) {
          cnSetFieldError(
            refundPaidEl,
            "cnRefundPaidErr",
            `Refund paid cannot exceed ${max.toFixed(2)}.`
          );
          ok = false;
        } else {
          cnSetFieldError(refundPaidEl, "cnRefundPaidErr", "");
        }
      } else {
        cnSetFieldError(refundPaidEl, "cnRefundPaidErr", "");
      }
    }
  }

  if (refundDateEl && cnFieldEditable(refundDateEl) && cnInvoiceRefReady() && returnReasonOk) {
    const rv = (refundDateEl.value || "").trim().slice(0, 10);
    if (!rv) {
      cnSetFieldError(refundDateEl, "cnRefundDateErr", "Please select refund date.");
      ok = false;
    } else if (!cnIsValidDateString(rv)) {
      cnSetFieldError(refundDateEl, "cnRefundDateErr", "Invalid date. Use format YYYY-MM-DD.");
      ok = false;
    } else if (noteDate && cnIsValidDateString(noteDate) && rv < noteDate) {
      cnSetFieldError(refundDateEl, "cnRefundDateErr", "Refund date cannot be earlier than credit note date.");
      ok = false;
    } else {
      cnSetFieldError(refundDateEl, "cnRefundDateErr", "");
    }
  } else if (refundDateEl) {
    cnSetFieldError(refundDateEl, "cnRefundDateErr", "");
  }

  return ok;
}

function validateCreditNoteForm(strictRefund = false) {
  if (cnIsFormLocked()) return true;
  return runLiveCreditNoteValidation({ strictRefund, forSave: true });
}

function cnSanitizeRefundPaidInput(el) {
  if (!el) return;
  let raw = String(el.value || "");
  if (raw.includes("-") || /[a-zA-Z]/.test(raw)) {
    el.value = "0";
    return;
  }
  const cleaned = raw.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
  if (cleaned !== raw) el.value = cleaned;
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
    const qty = Number(
      row.return_qty ?? row.return_quantity ?? row.returned_qty ?? row.quantity ?? 0
    );
    const unit = Number(row.unit_price ?? 0);
    const tax = Number(row.tax_percent ?? 0);
    const disc = Number(row.discount ?? 0);
    const lineTotal = Math.round(qty * unit * (1 + tax / 100) * (1 - disc / 100) * 100) / 100;
    return {
      product_name: row.product_name ?? "",
      product_id: row.product_id ?? "",
      return_qty: qty,
      max_return_qty: qty,
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
      const productSelect = cells[1]?.querySelector(".cn-product-name");
      const productName = productSelect
        ? String(productSelect.selectedOptions[0]?.text || "").trim()
        : (cells[1]?.innerText || "").trim();
      const productId = productSelect
        ? String(productSelect.value || "").trim()
        : (cells[2]?.innerText || "").trim();
      if (!productName && !productId) return null;
      return {
        product_name: productName,
        product_id: productId,
        returned_qty: (cells[3]?.querySelector(".cn-return-qty-input")?.value || cells[3]?.innerText || "").trim(),
        uom: (cells[4]?.innerText || "").trim(),
        reason: (cells[5]?.querySelector(".cn-return-reason-select")?.value || cells[5]?.innerText || "").trim(),
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
    comments: cnPageComments
      .filter((c) => String(c.type || "COMMENT").toUpperCase() === "COMMENT")
      .map((c) => {
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
  const currentCreditId = String(cnGet("cnId") || "").trim();
  const [invRes, cnRes] = await Promise.all([
    fetch("/api/invoices-credit"),
    fetch("/api/credit-notes"),
  ]);
  const invPayload = await invRes.json().catch(() => ({}));
  const rawList = Array.isArray(invPayload?.invoices) ? invPayload.invoices : [];
  const list = rawList.map((item) => {
    if (typeof item === "string") {
      return { invoice_id: item, customer_name: "", status: "" };
    }
    return item;
  });
  const usedInvoiceIds = new Set();
  if (cnRes.ok) {
    const cnPayload = await cnRes.json().catch(() => ({}));
    const notes = Array.isArray(cnPayload?.items) ? cnPayload.items : [];
    notes.forEach((n) => {
      const ref = String(n.invoice_ref_id || "").trim();
      const cnId = String(n.crn_id || n.credit_note_id || "").trim();
      if (!ref) return;
      if (currentCreditId && cnId === currentCreditId) return;
      usedInvoiceIds.add(ref);
    });
  }
  sel.innerHTML = '<option value="">Select Invoice Ref. ID</option>';
  list.forEach((item) => {
    const invId = String(item?.invoice_id || "").trim();
    if (!invId) return;
    const st = String(item?.status || "").trim().toLowerCase();
    if (st === "cancelled" || st === "draft") return;
    if (usedInvoiceIds.has(invId)) return;
    const customerName = String(item?.customer_name || "").trim();
    const opt = document.createElement("option");
    opt.value = invId;
    opt.textContent = customerName ? `${invId} - ${customerName}` : invId;
    sel.appendChild(opt);
  });
}

async function cnFillFromInvoice(invoiceRef) {
  const paymentTermsEl = document.getElementById("cnPaymentTerms");
  if (!invoiceRef) {
    cnSet("cnCustomerName", "");
    cnSet("cnCustomerId", "");
    cnSet("cnBillingAddress", "");
    cnSet("cnPhone", "");
    cnSet("cnInvoiceDate", "");
    cnSet("cnDueDate", "");
    cnSet("cnPaymentTerms", "");
    if (paymentTermsEl) paymentTermsEl.disabled = false;
    cnSet("cnInvoiceStatus", "");
    cnSet("cnPaymentStatus", "");
    cnSet("cnInvoiceTotal", "");
    cnSetText("invoice_total_display", "0.00");
    cnAllAvailableRows = [];
    cnCurrentRows = [];
    cnReturnStateById.clear();
    cnRenderRows([]);
    cnCalcRefund();
    runLiveCreditNoteValidation();
    return;
  }
  let invoiceId = String(invoiceRef || "").trim();
  if (/^ir-/i.test(invoiceId)) {
    const irRes = await fetch(`/api/invoice-return/${encodeURIComponent(invoiceId)}`);
    const irJson = await irRes.json().catch(() => ({}));
    if (!irRes.ok || irJson?.success === false) {
      throw new Error(irJson?.error || irJson?.message || "Invoice return fetch failed");
    }
    invoiceId = String(irJson.invoice_return?.invoice_id || "").trim();
    if (!invoiceId) throw new Error("Invoice return has no linked invoice");
  }
  const detailsRes = await fetch(`/api/invoice-details-credit/${encodeURIComponent(invoiceId)}`);
  const details = await detailsRes.json();
  if (!detailsRes.ok || !details.success) throw new Error("Invoice details fetch failed");
  const inv = details.invoice || {};
  const invStatus = String(inv.status || "").trim().toLowerCase();
  if (invStatus === "cancelled" || invStatus === "draft") {
    cnToast("Cancelled or draft invoices cannot be used for a credit note.", "error");
    return;
  }
  cnSet("cnCustomerName", inv.customer_name || "");
  cnSet("cnCustomerId", inv.customer_id || "");
  cnSet("cnBillingAddress", inv.billing_address || "");
  cnSet("cnPhone", inv.phone || "");
  cnSet("cnInvoiceDate", inv.invoice_date || "");
  cnSet("cnDueDate", inv.due_date || "");
  cnSet("cnPaymentTerms", inv.payment_terms || "");
  if (paymentTermsEl) paymentTermsEl.disabled = true;
  cnSet("cnInvoiceStatus", inv.status || "");
  cnSet("cnPaymentStatus", inv.payment_status || "");
  cnSet("cnInvoiceTotal", Number(inv.grand_total || 0).toFixed(2));
  const paid = Number(inv.amount_paid ?? 0);
  cnSet("cnAmountPaid", paid.toFixed(2));
  cnSet("cnRefundPaid", "");
  cnSetText("invoice_total_display", Number(inv.grand_total || 0).toFixed(2));

  const fromInvoice = Array.isArray(details.items) ? details.items : [];
  cnAllAvailableRows = cnMapInvoiceLinesToReturnRows(fromInvoice);
  cnCurrentRows = cnAllAvailableRows.map((row) => ({ ...row }));
  cnReturnStateById.clear();
  cnRenderRows(cnCurrentRows);
  cnCalcRefund();
  runLiveCreditNoteValidation();
  cnToast(`Invoice ${invoiceId} loaded successfully`);
}

/** In-page activity log (comments + history actions). */
const cnPageComments = [];
let cnCurrentStatus = "New";
let cnCurrentPaymentStatus = "";
let cnIsSavedNote = false;
let cnCoreSectionsLocked = false;
let cnAllAvailableRows = [];
let cnCurrentRows = [];
const cnReturnStateById = new Map();

function cnSyncRowDeleteButtonsLockState() {
  const locked = cnIsFormLocked();
  document.querySelectorAll(".cn-row-delete-btn").forEach((btn) => {
    btn.disabled = locked;
    btn.style.display = "";
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

  const addItemBtn = document.getElementById("cnAddItemBtn");
  if (addItemBtn) addItemBtn.disabled = false;
  cnSyncRowDeleteButtonsLockState();
  document.querySelectorAll(".cn-page .cn-field-error").forEach((el) => {
    el.textContent = "";
    el.hidden = true;
    el.classList.remove("is-visible");
  });
  document
    .querySelectorAll(".cn-page .input-invalid")
    .forEach((el) => el.classList.remove("input-invalid"));
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
    wrap.className = "history-card";
    const when = cnCommentDisplayTime(c);
    const who = c.user || "User";
    const histStatus = String(c.status || cnCurrentStatus || "Draft").trim() || "Draft";
    wrap.innerHTML = `<div class="history-meta">${cnEscapeHtmlText(who)}${when ? ` — ${cnEscapeHtmlText(when)}` : ""}</div><p class="history-text">${cnEscapeHtmlText(`${histStatus}:${c.message || ""}`)}</p>`;
    list.appendChild(wrap);
  });
  empty.classList.toggle("cn-is-hidden", allComments.length > 0);
}

function cnRenderComments() {
  const commentList = document.getElementById("cnCommentList");
  const emptyState = document.getElementById("cnCommentEmpty");
  if (!commentList || !emptyState) return;
  commentList.innerHTML = "";
  const latestComment = cnGetSortedComments().find((c) => String(c.type || "COMMENT").toUpperCase() === "COMMENT");
  emptyState.hidden = Boolean(latestComment);
  if (!latestComment) return;
  const row = document.createElement("div");
  row.className = "comment-card";
  const when = cnCommentDisplayTime(latestComment);
  row.innerHTML = `<div class="comment-name">${cnEscapeHtmlText(latestComment.user)}${when ? ` — ${cnEscapeHtmlText(when)}` : ""}</div><p>${cnEscapeHtmlText(latestComment.message)}</p>`;
  commentList.appendChild(row);
}

async function cnLoadCreditNoteById(creditId) {
  if (!creditId) return;
  const res = await fetch(`/api/credit-notes/${encodeURIComponent(creditId)}`);
  const data = await res.json();
  if (!res.ok || !data?.success || !data?.item) throw new Error("credit note fetch failed");
  const it = data.item;
  cnSet("cnId", it.credit_note_id || "");
  cnSet("cnDate", String(it.credit_note_date || "").slice(0, 10));
  cnSet("cnInvoiceRef", it.invoice_ref_id || "");
  cnSet("cnCreatedBy", it.created_by || "");
  const branchEl = document.getElementById("cnBranch");
  const savedBranch = String(it.branch || "").trim();
  if (branchEl && savedBranch) {
    let branchFound = false;
    for (const opt of branchEl.options) {
      if (opt.value === savedBranch) {
        branchFound = true;
        break;
      }
    }
    if (!branchFound) {
      const opt = document.createElement("option");
      opt.value = savedBranch;
      opt.textContent = savedBranch;
      branchEl.appendChild(opt);
    }
    branchEl.value = savedBranch;
  } else {
    cnSet("cnBranch", it.branch || "");
  }
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
  cnSet("cnRefundDate", String(it.refund_date || "").slice(0, 10));
  cnSetText("invoice_total_display", Number(it.invoice_total || 0).toFixed(2));
  cnSetText("cnBalanceDue", Number(it.balance_due || 0).toFixed(2));
  cnSetText("cnInvoiceReturnAmount", Number(it.invoice_return_amount || 0).toFixed(2));
  cnSetText("cnBalanceToRefund", Number(it.balance_to_refund || 0).toFixed(2));
  cnCurrentRows = cnMapInvoiceLinesToReturnRows(Array.isArray(it.items) ? it.items : []);
  cnAllAvailableRows = cnCurrentRows.map((row) => ({ ...row }));
  cnRenderRows(cnCurrentRows);
  cnCalcRefund();
  const keepLocal = cnPageComments.map((c) => ({ ...c }));
  cnPageComments.length = 0;
  const com = it.comments;
  if (Array.isArray(com)) {
    const cnDisplayUser = (cnCfg().userName || "User").toString().trim() || "User";
    const normalized = com
      .map((x) => {
        let user = String(x.user || x.author || x.created_by || "User").trim() || "User";
        if (user.includes("@") && cnDisplayUser) user = cnDisplayUser;
        return {
          user,
          type: String(x.type || x.activity_type || "COMMENT").trim().toUpperCase(),
          status: String(x.status || it.status || cnCurrentStatus || "Draft").trim() || "Draft",
          message: String(x.message || x.text || x.comment || "").trim(),
          at:
            x.at != null && Number.isFinite(Number(x.at))
              ? Number(x.at)
              : cnParseTimeMs(x.created_at || x.time) || Date.now()
        };
      })
      .filter((x) => {
        const msg = String(x.message || "").trim().toLowerCase();
        if (!msg) return false;
        if (msg === "draft created" || msg === "draft updated") return false;
        return true;
      });
    normalized.sort((a, b) => (b.at || 0) - (a.at || 0));
    normalized.forEach((c) => cnPageComments.push(c));
  }
  keepLocal.forEach((c) => {
    const msg = String(c.message || "").trim();
    if (!msg) return;
    if (!cnPageComments.some((x) => String(x.message || "").trim() === msg)) {
      cnPageComments.push(c);
    }
  });
  cnPageComments.sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0));
  cnRenderComments();
  cnRefreshHistory();
  runLiveCreditNoteValidation();
  return it;
}

function cnEnableViewOnlyMode() {
  document.querySelector(".cn-page")?.classList.add("cn-view-only");
  document.querySelectorAll(".cn-card input, .cn-card textarea").forEach((el) => {
    el.readOnly = true;
  });
  document.querySelectorAll(".cn-card select").forEach((el) => {
    el.disabled = true;
  });
  document.querySelectorAll(".cn-row-delete-btn").forEach((btn) => {
    btn.disabled = true;
    btn.style.display = "";
  });
  const addItemBtn = document.getElementById("cnAddItemBtn");
  if (addItemBtn) addItemBtn.style.display = "none";
  ["cnSaveDraftBtn", "cnMarkPaidBtn"].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.style.display = "none";
  });
  const cancelBtn = document.getElementById("cnDeleteBtn");
  if (cancelBtn) cnSetActionEnabled(cancelBtn, false);
  const refundPick = document.getElementById("cnRefundDateOpenBtn");
  if (refundPick) refundPick.disabled = true;
  runLiveCreditNoteValidation();
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
  return Array.isArray(cnPageComments)
    && cnPageComments.some((c) => String(c.type || "COMMENT").toUpperCase() === "COMMENT");
}

function cnApplyWorkflowActions({ status, paymentStatus, isSaved }) {
  const st = cnNormalizeStatus(status);
  const ps = cnNormalizePayment(paymentStatus);
  const saveBtn = document.getElementById("cnSaveDraftBtn");
  const markBtn = document.getElementById("cnMarkPaidBtn");
  const cancelBtn = document.getElementById("cnDeleteBtn");
  const addItemBtn = document.getElementById("cnAddItemBtn");
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
    canMarkPaid = true;
    canCancel = true;
  } else if (st === "submitted") {
    canPdf = true;
    canEmail = true;
    canMarkPaid = ps !== "paid";
    canCancel = false;
  } else if (st === "cancelled" || st === "canceled") {
    canCancel = false;
  }

  // DNR-like rule: final action requires at least one comment.
  canMarkPaid = canMarkPaid && cnHasAtLeastOneComment();

  cnSetActionEnabled(saveBtn, canSave);
  cnSetActionEnabled(markBtn, canMarkPaid);
  cnSetActionEnabled(cancelBtn, canCancel);
  if (addItemBtn) addItemBtn.disabled = cnIsFormLocked();
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
    if (el.closest(".cn-row-delete-btn")) return false;
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

const MAX_CN_ATTACHMENTS = 10;
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
  const attTabLabel = document.getElementById("cnAttachmentsTabLabel");
  if (attTabLabel) {
    attTabLabel.textContent = `(${currentCount}) ${currentCount === 1 ? "Attachment" : "Attachments"}`;
  }
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
  if (!cnIsSavedNote) {
    const saved = await cnSaveDraftInternal({ redirectOnSuccess: false, silent: true });
    if (!saved) {
      cnToast("Please complete required fields and save draft before uploading attachments.", "error");
      return;
    }
    cnIsSavedNote = true;
  }
  cnShowCreditUploading(file.name);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("credit_note_id", creditNoteId);
  try {
    let response = await fetch("/api/cn-upload-attachment", { method: "POST", body: formData });
    let data = await response.json();
    const uploadError = String(data?.error || data?.message || "").toLowerCase();

    if (
      !data?.success &&
      uploadError.includes("save the credit note as draft first")
    ) {
      const saved = await cnSaveDraftInternal({ redirectOnSuccess: false, silent: true });
      if (saved) {
        cnIsSavedNote = true;
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
      cnPageComments.unshift({
        user: userName,
        type: "COMMENT",
        status: String(cnCurrentStatus || "Draft").trim() || "Draft",
        at: Date.now(),
        message: msg
      });
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
  const commentInput = document.getElementById("cnCommentInput");
  const pendingMsg = (commentInput?.value || "").trim();
  if (pendingMsg) {
    const userName = (cnCfg().userName || "User").toString().trim() || "User";
    cnPageComments.unshift({
      user: userName,
      type: "COMMENT",
      status: String(cnCurrentStatus || "Draft").trim() || "Draft",
      at: Date.now(),
      message: pendingMsg
    });
    if (commentInput) commentInput.value = "";
    cnRenderComments();
    cnRefreshHistory();
  }
  if (!validateCreditNoteForm(false)) {
    if (!silent) {
      const err =
        document.querySelector(".cn-page .cn-field-error.is-visible") ||
        document.querySelector("#cnItemsBody .cn-return-reason-error:not(:empty)");
      cnToast(err?.textContent || "Please complete required fields.", "error");
    }
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
  if (window.UnsavedWarning) UnsavedWarning.allowLeave();
  cnIsSavedNote = true;
  if (redirectOnSuccess) {
    window.location.href = `/credit-note?toast=${encodeURIComponent("Credit note saved as Draft successfully")}&type=success`;
  } else if (!silent) {
    cnToast("Credit note saved as Draft successfully", "success");
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
    if (!validateCreditNoteForm(true)) {
      const err =
        document.querySelector(".cn-page .cn-field-error.is-visible") ||
        document.querySelector("#cnItemsBody .cn-return-reason-error:not(:empty)");
      cnToast(err?.textContent || "Please complete required fields.", "error");
      return;
    }
    const saved = await cnSaveDraftInternal({ redirectOnSuccess: false, silent: true });
    if (!saved) {
      cnToast("Save the credit note first, then mark as paid.", "error");
      return;
    }
    const payload = cnCollectPayload("Submitted");
    if (!payload.credit_note_id) return cnToast("Credit Note ID is required", "error");
    const res = await fetch(`/api/credit-notes/${encodeURIComponent(payload.credit_note_id)}/mark-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) throw new Error(data.message || "Failed to mark as paid");
    if (window.UnsavedWarning) UnsavedWarning.allowLeave();
    window.location.href = `/credit-note?toast=${encodeURIComponent("Credit note saved as Submitted successfully")}&type=success`;
  } catch (e) {
    cnToast(e.message || "Failed to mark as paid", "error");
  }
}

async function cnDoCancelCreditNote() {
  try {
    const creditId = cnGet("cnId");
    if (!creditId) return cnToast("Credit Note ID is required", "error");

    const backdrop = document.getElementById("cancelCnBackdrop");
    const reasonEl = document.getElementById("cancelCnReason");
    const okBtn = document.getElementById("cancelCnOkBtn");
    const dismissBtn = document.getElementById("cancelCnDismissBtn");
    const closeBtn = document.getElementById("cancelCnCloseBtn");
    if (!backdrop || !reasonEl || !okBtn || !dismissBtn || !closeBtn) {
      cnToast("Cancel popup not found", "error");
      return;
    }

    const reason = await new Promise((resolve) => {
      reasonEl.value = "";
      const done = (val) => {
        backdrop.style.display = "none";
        okBtn.onclick = null;
        dismissBtn.onclick = null;
        closeBtn.onclick = null;
        backdrop.onclick = null;
        resolve(val);
      };
      okBtn.onclick = () => done((reasonEl.value || "").trim());
      dismissBtn.onclick = () => done(null);
      closeBtn.onclick = () => done(null);
      backdrop.onclick = (e) => {
        if (e.target === backdrop) done(null);
      };
      backdrop.style.display = "flex";
      reasonEl.focus();
    });
    if (reason === null) return;

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
    if (window.UnsavedWarning) UnsavedWarning.allowLeave();
    window.location.href = `/credit-note?toast=${encodeURIComponent("Credit note saved as Cancelled successfully")}&type=success`;
  } catch (e) {
    cnToast(e.message || "Failed to cancel credit note", "error");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const cfg = cnCfg();
  const qs = new URLSearchParams(window.location.search);
  const qsCreditId = (qs.get("credit_note_id") || qs.get("crn_id") || "").trim();
  const creditIdForPage = String(cfg.creditId || qsCreditId || "").trim();
  const mode = (qs.get("mode") || cfg.mode || "new").toString().trim().toLowerCase();
  const CREDIT_LIST_URL = "/credit-note";
  if (creditIdForPage) cnSet("cnId", creditIdForPage);
  if (!cnGet("cnDate") && mode === "new") cnSet("cnDate", new Date().toISOString().split("T")[0]);

  const cnPageTitleEl = document.getElementById("cnPageTitle");
  if (cnPageTitleEl) {
    let cnPageTitle = "New Credit Note";
    if (creditIdForPage && mode !== "new") {
      cnPageTitle = mode === "view" ? "View Credit Note" : "Edit Credit Note";
    }
    cnPageTitleEl.textContent = cnPageTitle;
  }
  cnCurrentStatus = "New";
  cnCurrentPaymentStatus = "";
  cnIsSavedNote = false;
  if (typeof window !== "undefined") {
    window.cnCreditAttachmentsReadOnly = mode === "view";
  }

  /* Wire Save / Mark paid / Delete / etc. first so a later init error cannot leave them dead. */
  document.getElementById("cnItemsBody")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".cn-row-delete-btn");
    if (!btn) return;
    if (btn.disabled || cnIsFormLocked()) return;
    const idx = Number(btn.getAttribute("data-idx"));
    if (!Number.isInteger(idx) || idx < 0 || idx >= cnCurrentRows.length) return;
    const row = cnCurrentRows[idx];
    const tr = btn.closest("tr");
    if (row && tr) {
      const pid = String(row.product_id || "").trim();
      if (pid) {
        const cells = tr.querySelectorAll("td");
        cnReturnStateById.set(pid, {
          return_qty: cells[3]?.querySelector(".cn-return-qty-input")?.value || cells[3]?.innerText || row.return_qty || 0,
          reason: (cells[5]?.querySelector(".cn-return-reason-select")?.value || cells[5]?.innerText || row.reason || row.return_reason || "").trim()
        });
      }
    }
    cnCurrentRows.splice(idx, 1);
    cnRenderRows(cnCurrentRows);
    cnCalcRefund();
    runLiveCreditNoteValidation();
    if (window.UnsavedWarning) UnsavedWarning.markDirty();
  });
  document.getElementById("cnItemsBody")?.addEventListener("keydown", (e) => {
    if (!e.target.matches(".cn-return-qty-input")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (["-", "+", "e", "E"].includes(e.key)) {
      e.preventDefault();
      return;
    }
    if (e.key.length === 1 && !/^\d$/.test(e.key) && e.key !== ".") {
      e.preventDefault();
      return;
    }
    if (e.key === "." && String(e.target.value || "").includes(".")) {
      e.preventDefault();
    }
  });
  document.getElementById("cnItemsBody")?.addEventListener("input", (e) => {
    if (!e.target.matches(".cn-return-qty-input")) return;
    const maxQty = parseFloat(e.target.getAttribute("data-max-qty") || e.target.max || "0") || 0;
    let raw = (e.target.value ?? "").toString();
    const sanitized = raw.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
    if (sanitized !== raw) {
      e.target.value = sanitized;
      raw = sanitized;
    }
    raw = raw.trim();
    if (raw === "") return;
    const qty = parseFloat(raw);
    if (Number.isNaN(qty)) return;
    if (qty <= 0) {
      cnToast("Return Qty value cannot be zero or negative", "error");
      const corrected = maxQty > 0 ? Math.min(1, maxQty) : 0;
      e.target.value = corrected === 0 ? "" : String(corrected);
      cnCalcRefund();
      return;
    }
    if (maxQty > 0 && qty > maxQty) {
      e.target.value = String(maxQty);
      cnToast(`Returned qty cannot exceed ${maxQty}`, "error");
    }
    cnCalcRefund();
  });
  document.getElementById("cnItemsBody")?.addEventListener("change", (e) => {
    if (e.target.matches(".cn-product-name")) {
      const idx = Number(e.target.getAttribute("data-idx"));
      if (!Number.isInteger(idx) || idx < 0 || idx >= cnCurrentRows.length) return;
      const row = cnCurrentRows[idx];
      if (!e.target.value) {
        row.product_id = "";
        row.product_name = "";
        row.return_qty = 0;
        row.max_return_qty = 0;
        row.uom = "";
        row.reason = "";
        row.unit_price = 0;
        row.tax_percent = 0;
        row.discount = 0;
        row.total = 0;
        cnRenderRows(cnCurrentRows);
        cnCalcRefund();
        runLiveCreditNoteValidation();
        return;
      }
      const match = cnAllAvailableRows.find((r) => String(r.product_id) === String(e.target.value));
      if (!match) {
        cnToast("Product not found for this invoice", "error");
        return;
      }
      const pid = String(match.product_id || "");
      const savedState = cnReturnStateById.get(pid);
      const maxQ = Number(match.max_return_qty ?? match.return_qty ?? 0);
      const returnQty = savedState ? Number(savedState.return_qty || 0) : Number(match.return_qty ?? 0);
      const unit = Number(match.unit_price || 0);
      const tax = Number(match.tax_percent || 0);
      const disc = Number(match.discount || 0);
      row.product_id = match.product_id ?? "";
      row.product_name = match.product_name ?? "";
      row.return_qty = returnQty;
      row.max_return_qty = maxQ;
      row.uom = match.uom ?? "";
      row.reason = savedState?.reason || match.reason || "";
      row.unit_price = unit;
      row.tax_percent = tax;
      row.discount = disc;
      row.total = Math.round(returnQty * unit * (1 + tax / 100) * (1 - disc / 100) * 100) / 100;
      cnRenderRows(cnCurrentRows);
      cnCalcRefund();
      runLiveCreditNoteValidation();
      return;
    }
    if (e.target.matches(".cn-return-reason-select")) {
      runLiveCreditNoteValidation();
    }
  });

  document.getElementById("cnAddItemBtn")?.addEventListener("click", () => {
    if (cnIsFormLocked()) return;
    const invoiceRef = (document.getElementById("cnInvoiceRef")?.value || "").trim();
    if (!invoiceRef) {
      cnToast("Select an invoice first", "error");
      return;
    }
    const catalog = cnAllAvailableRows.length ? cnAllAvailableRows : cnCurrentRows;
    if (!catalog.length) {
      cnToast("No line items available for this invoice", "error");
      return;
    }
    const used = new Set(cnCurrentRows.map((r) => String(r.product_id || "")).filter(Boolean));
    const hasAvailable = catalog.some((r) => {
      const id = String(r.product_id || "");
      return id && !used.has(id);
    });
    if (!hasAvailable) {
      cnToast("All invoice products are already added", "warning");
      return;
    }
    cnCurrentRows.push({
      product_name: "",
      product_id: "",
      return_qty: 0,
      max_return_qty: 0,
      uom: "",
      reason: "",
      unit_price: 0,
      tax_percent: 0,
      discount: 0,
      total: 0
    });
    cnRenderRows(cnCurrentRows);
    cnCalcRefund();
    runLiveCreditNoteValidation();
    if (window.UnsavedWarning) UnsavedWarning.markDirty();
  });

  document.getElementById("cnCancelBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (window.UnsavedWarning) {
      UnsavedWarning.tryLeave(CREDIT_LIST_URL);
    } else {
      window.location.href = CREDIT_LIST_URL;
    }
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
    cnFillFromInvoice(this.value)
      .catch(() => cnToast("Failed to fetch invoice details", "error"))
      .finally(() => {
        if (mode !== "edit") runLiveCreditNoteValidation();
      });
  };
  if (invoiceRef) {
    invoiceRef.addEventListener("change", onInvoiceRefChanged);
  }

  // For mode "new", creditId is only the next reserved number (not in DB yet) — do not GET it.
  if (creditIdForPage && mode !== "new") {
    try {
      await invoiceIdsPromise;
      const it = await cnLoadCreditNoteById(creditIdForPage);
      const status = it?.status || "Draft";
      cnCurrentStatus = status;
      cnCurrentPaymentStatus = it?.payment_status || "";
      cnIsSavedNote = true;
      cnApplyStatusPill(status);
      const isDraft = String(status).trim().toLowerCase() === "draft";
      const invoiceRefEl = document.getElementById("cnInvoiceRef");
      const savedRef = String(it?.invoice_ref_id || "").trim();
      if (invoiceRefEl && savedRef) {
        let hasRef = false;
        for (const opt of invoiceRefEl.options) {
          if (opt.value === savedRef) {
            hasRef = true;
            break;
          }
        }
        if (!hasRef) {
          const opt = document.createElement("option");
          opt.value = savedRef;
          const savedCustomer = String(it?.customer_name || "").trim();
          opt.textContent = savedCustomer ? `${savedRef} - ${savedCustomer}` : savedRef;
          invoiceRefEl.appendChild(opt);
        }
        invoiceRefEl.value = savedRef;
      }
      if (mode === "view" || !isDraft) cnEnableViewOnlyMode();
      else if (mode === "edit") {
        cnLockCoreSectionsForEditMode();
      } else if (typeof window !== "undefined") {
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
      runLiveCreditNoteValidation();
      void cnLoadCreditAttachments();
    } catch (_e) {
      cnToast("Failed to load credit note details", "error");
    }
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
    document.getElementById("cnAmountPaid")?.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (["-", "+", "e", "E"].includes(e.key)) {
        e.preventDefault();
        return;
      }
      if (e.key.length === 1 && !/^\d$/.test(e.key) && e.key !== ".") e.preventDefault();
      if (e.key === "." && String(e.target.value || "").includes(".")) e.preventDefault();
    });
    document.getElementById("cnAmountPaid")?.addEventListener("input", (e) => {
      cnSanitizeRefundPaidInput(e.currentTarget);
      cnCalcRefund();
    }, { capture: true });
    document.getElementById("cnAmountPaid")?.addEventListener("change", (e) => {
      cnSanitizeRefundPaidInput(e.currentTarget);
      cnCalcRefund();
    });
    document.getElementById("cnRefundPaid")?.addEventListener("input", (e) => {
      cnSanitizeRefundPaidInput(e.currentTarget);
      cnCalcRefund();
      runLiveCreditNoteValidation();
    }, { capture: true });
    document.getElementById("cnRefundPaid")?.addEventListener("blur", (e) => {
      cnFormatRefundPaidOnBlur(e.currentTarget);
      cnCalcRefund();
      runLiveCreditNoteValidation();
    });
    document.getElementById("cnRefundPaid")?.addEventListener("change", (e) => {
      cnFormatRefundPaidOnBlur(e.currentTarget);
      cnCalcRefund();
      runLiveCreditNoteValidation();
    });
    document.getElementById("cnRefundPaid")?.addEventListener("keydown", (e) => {
      if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
    });
    document.getElementById("cnRefundMode")?.addEventListener("change", () => {
      cnMaybeAutoSetRefundDate();
      runLiveCreditNoteValidation();
    });
    document.getElementById("cnRefundMode")?.addEventListener("blur", () => runLiveCreditNoteValidation());
    ["change", "blur", "input"].forEach((ev) => {
      document.getElementById("cnRefundDate")?.addEventListener(ev, () => runLiveCreditNoteValidation());
    });

    const createdByEl = document.getElementById("cnCreatedBy");
    createdByEl?.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length === 1 && !/^[A-Za-z ]$/.test(e.key)) {
        e.preventDefault();
      }
      const isBackspace = e.key === "Backspace" || e.key === "Delete";
      const current = String(createdByEl?.value || "");
      if (!isBackspace && current.length >= 30) e.preventDefault();
    });

    if (mode !== "edit") {
      [
        ["cnDate", ["change", "blur", "input"]],
        ["cnInvoiceRef", ["change", "blur"]],
        ["cnCreatedBy", ["input", "blur"]],
        ["cnBranch", ["change", "blur", "input"]],
        ["cnPaymentTerms", ["change", "blur"]],
        ["cnBillingAddress", ["input", "blur"]],
        ["cnAmountPaid", ["input", "blur", "change"]],
      ].forEach(([id, events]) => {
        const el = document.getElementById(id);
        if (!el) return;
        events.forEach((ev) => {
          el.addEventListener(ev, () => runLiveCreditNoteValidation());
        });
      });
      createdByEl?.addEventListener("input", () => {
        if (!createdByEl) return;
        createdByEl.value = cnSanitizeCreatedBy(createdByEl.value);
        runLiveCreditNoteValidation();
      });
      runLiveCreditNoteValidation();
    } else {
      createdByEl?.addEventListener("input", () => {
        if (!createdByEl) return;
        createdByEl.value = cnSanitizeCreatedBy(createdByEl.value);
      });
      runLiveCreditNoteValidation();
    }
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

  if (mode === "new" && window.UnsavedWarning) {
    UnsavedWarning.enable({ root: ".cn-page" });
  }
});
