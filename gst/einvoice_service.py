"""Phase 4–6 — e-Invoice IRN generate, cancel, fetch details, and persist results."""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from gst.einvoice_mapper import build_einvoice_payload, format_einvoice_date, gst_state_code
from gst.einvoice_schema import ensure_einvoice_schema
from gst.einvoice_tax import enrich_bill_item, enrich_invoice_item, fetch_invoice_items
from gst.whitebooks_client import WhiteBooksApiError, WhiteBooksClient

# NIC e-Invoice notified GST rate slabs (GstRt field).
NIC_NOTIFIED_GST_RATES = (0, 0.25, 3, 5, 12, 18, 28)

# WhiteBooks / NIC e-Invoice sandbox sample buyer (see generate-irn.txt).
SANDBOX_EINVOICE_BUYER_GSTIN = "29AWGPV7107B1Z1"


def _is_notified_gst_rate(rate: float) -> bool:
    return any(abs(rate - allowed) < 0.01 for allowed in NIC_NOTIFIED_GST_RATES)


def _line_effective_gst_rate(
    row: dict[str, Any],
    *,
    seller_gstin: str,
    buyer_gstin: str,
) -> float:
    """Mirror einvoice_mapper item GstRt logic for pre-flight validation."""
    taxable = float(row.get("taxable_value") or 0)
    cgst = float(row.get("cgst_amt") or 0)
    sgst = float(row.get("sgst_amt") or 0)
    igst = float(row.get("igst_amt") or 0)
    tax_pct = float(row.get("tax_pct") or 0)

    seller_st = gst_state_code(seller_gstin)
    buyer_st = gst_state_code(buyer_gstin)
    intra_state = bool(seller_st and buyer_st and seller_st == buyer_st)

    if cgst <= 0 and sgst <= 0 and igst <= 0 and tax_pct > 0 and taxable > 0:
        half = tax_pct / 2.0
        cgst = taxable * (half / 100.0)
        sgst = taxable * (half / 100.0)

    if not intra_state:
        igst = cgst + sgst + igst
        cgst = 0.0
        sgst = 0.0

    if tax_pct > 0:
        return round(tax_pct, 2)
    if taxable > 0 and (cgst + sgst + igst) > 0:
        return round(((cgst + sgst + igst) / taxable) * 100.0, 2)
    return 0.0


def _validate_buyer_gstin(buyer_gstin: str, *, seller_gstin: str) -> str | None:
    buyer = (buyer_gstin or "").strip().upper()
    seller = (seller_gstin or "").strip().upper()
    if buyer and seller and buyer == seller:
        return "Buyer GSTIN must differ from seller GSTIN for B2B e-Invoice."
    gst_verify = (os.getenv("WHITEBOOKS_GSTIN") or "").strip().upper()
    if buyer and gst_verify and buyer == gst_verify:
        return (
            f"Buyer GSTIN {buyer} is your GST verification sandbox ID, not valid for e-Invoice. "
            f"Use the WhiteBooks sandbox buyer GSTIN: {SANDBOX_EINVOICE_BUYER_GSTIN}."
        )
    return None


def _validate_item_gst_rates(
    items: list[dict[str, Any]],
    *,
    seller_gstin: str,
    buyer_gstin: str,
) -> list[str]:
    errors: list[str] = []
    allowed = ", ".join(str(r) for r in NIC_NOTIFIED_GST_RATES)
    for idx, row in enumerate(items, start=1):
        rate = _line_effective_gst_rate(row, seller_gstin=seller_gstin, buyer_gstin=buyer_gstin)
        if rate > 0 and not _is_notified_gst_rate(rate):
            errors.append(
                f"Line {idx}: GST rate {rate:g}% is not a notified e-Invoice slab "
                f"(allowed: {allowed}). Update the product tax rate and re-save the invoice."
            )
    return errors


def _row_to_dict(row, columns: list[str]) -> dict[str, Any]:
    if isinstance(row, dict):
        return dict(row)
    return {columns[i]: row[i] for i in range(len(columns))}


def load_seller_for_einvoice(cur, company_code: str | None) -> dict[str, Any] | None:
    code = (company_code or "").strip().upper()
    if code:
        cur.execute(
            """
            SELECT company_name, owner_name, gstin, email, phone_number,
                   address, city, state, pincode
            FROM company_information
            WHERE UPPER(TRIM(company_code)) = %s
            ORDER BY company_id
            LIMIT 1
            """,
            (code,),
        )
    else:
        cur.execute(
            """
            SELECT company_name, owner_name, gstin, email, phone_number,
                   address, city, state, pincode
            FROM company_information
            ORDER BY company_id
            LIMIT 1
            """
        )
    row = cur.fetchone()
    if not row:
        return None
    cols = [
        "company_name", "owner_name", "gstin", "email", "phone_number",
        "address", "city", "state", "pincode",
    ]
    return _row_to_dict(row, cols)


def load_buyer_for_einvoice(cur, customer_id: str | None) -> dict[str, Any] | None:
    cid = (customer_id or "").strip()
    if not cid:
        return None
    cur.execute(
        """
        SELECT name, company, gstin, email, phone, billing_address,
               street, city, state, zip_code, country
        FROM customers
        WHERE customer_id = %s
        LIMIT 1
        """,
        (cid,),
    )
    row = cur.fetchone()
    if not row:
        return None
    cols = [
        "name", "company", "gstin", "email", "phone", "billing_address",
        "street", "city", "state", "zip_code", "country",
    ]
    return _row_to_dict(row, cols)


def load_invoice_bundle(cur, invoice_id: str) -> dict[str, Any] | None:
    ensure_einvoice_schema(cur)
    cur.execute(
        """
        SELECT invoice_id, invoice_date, due_date, customer_name, customer_id,
               billing_address, shipping_address, email, phone, contact_person,
               irn, ack_no, ack_date, einvoice_status, signed_qr, company_code, status
        FROM invoices
        WHERE invoice_id = %s
        LIMIT 1
        """,
        (invoice_id,),
    )
    row = cur.fetchone()
    if not row:
        return None
    cols = [
        "invoice_id", "invoice_date", "due_date", "customer_name", "customer_id",
        "billing_address", "shipping_address", "email", "phone", "contact_person",
        "irn", "ack_no", "ack_date", "einvoice_status", "signed_qr", "company_code", "status",
    ]
    invoice = _row_to_dict(row, cols)

    cur.execute(
        """
        SELECT sub_total, tax_total, grand_total, amount_paid, balance_due,
               COALESCE(shipping_charges, 0),
               COALESCE(rounding_adjustment, 0),
               COALESCE(global_discount_pct, 0)
        FROM invoice_summary
        WHERE invoice_id = %s
        ORDER BY id DESC
        LIMIT 1
        """,
        (invoice_id,),
    )
    srow = cur.fetchone()
    summary = {
        "sub_total": 0.0,
        "tax_total": 0.0,
        "grand_total": 0.0,
        "amount_paid": 0.0,
        "balance_due": 0.0,
        "shipping_charges": 0.0,
        "rounding_adjustment": 0.0,
        "global_discount": 0.0,
    }
    if srow:
        summary = {
            "sub_total": float(srow[0] or 0),
            "tax_total": float(srow[1] or 0),
            "grand_total": float(srow[2] or 0),
            "amount_paid": float(srow[3] or 0),
            "balance_due": float(srow[4] or 0),
            "shipping_charges": float(srow[5] or 0),
            "rounding_adjustment": float(srow[6] or 0),
            "global_discount": float(srow[7] or 0),
        }

    raw_items = fetch_invoice_items(cur, invoice_id)
    company_code = (invoice.get("company_code") or "").strip() or None
    items = [
        enrich_invoice_item(cur, row, company_code=company_code)
        for row in raw_items
    ]
    seller = load_seller_for_einvoice(cur, invoice.get("company_code"))
    buyer = load_buyer_for_einvoice(cur, invoice.get("customer_id"))

    return {
        "invoice": invoice,
        "items": items,
        "summary": summary,
        "seller": seller,
        "buyer": buyer,
    }


def resolve_seller_gstin(seller: dict[str, Any] | None, client: WhiteBooksClient) -> str:
    """
    GSTIN for SellerDtls in the NIC payload.
    Must match WHITEBOOKS_EINVOICE_GSTIN used for e-Invoice API authentication.
    """
    einvoice_gstin = client.for_einvoice()._active_gstin().strip().upper()
    if einvoice_gstin and len(einvoice_gstin) == 15:
        return einvoice_gstin

    company_gstin = ((seller or {}).get("gstin") or "").strip().upper()
    if company_gstin and len(company_gstin) == 15:
        return company_gstin

    return (client.active_gstin or "").strip().upper()


def format_einvoice_error_message(api_result: dict[str, Any], parsed: dict[str, Any] | None = None) -> str:
    """Turn WhiteBooks / NIC responses into a short user-facing message."""
    parsed = parsed or {}
    for candidate in (
        api_result.get("error_message"),
        parsed.get("status_desc"),
    ):
        text = (candidate or "").strip()
        if not text:
            continue
        if text.startswith("[") and "ErrorMessage" in text:
            try:
                rows = json.loads(text)
                if isinstance(rows, list):
                    msgs = [
                        str(row.get("ErrorMessage") or row.get("errorMessage") or "").strip()
                        for row in rows
                        if isinstance(row, dict)
                    ]
                    msgs = [m for m in msgs if m]
                    if msgs:
                        return msgs[0] if len(msgs) == 1 else "; ".join(msgs[:3])
            except (TypeError, ValueError, json.JSONDecodeError):
                pass
        nested = WhiteBooksClient._extract_embedded_error_message(text)
        if nested:
            return nested
        if len(text) > 220:
            return text[:217] + "..."
        return text
    return "IRN not returned by WhiteBooks."


def _is_duplicate_irn_error(api_result: dict[str, Any], message: str = "") -> bool:
    text = f"{message} {api_result.get('error_message') or ''} {api_result.get('status_desc') or ''}".lower()
    if "duplicate irn" in text:
        return True
    if '"errorcode":"2150"' in text.replace(" ", ""):
        return True
    return False


def _doc_details_from_payload(payload: dict[str, Any], doc_invoice: dict[str, Any]) -> tuple[str, str, str]:
    doc = payload.get("DocDtls") or {}
    doc_type = (doc.get("Typ") or "INV").strip().upper()
    doc_num = (doc.get("No") or doc_invoice.get("invoice_id") or "").strip()
    doc_date = (doc.get("Dt") or format_einvoice_date(doc_invoice.get("invoice_date"))).strip()
    return doc_type, doc_num, doc_date


def _recover_irn_from_nic_by_doc(
    client: WhiteBooksClient,
    cur,
    conn,
    *,
    payload: dict[str, Any],
    doc_invoice: dict[str, Any],
    persist_fn,
    entity_id: str | int,
    entity_label: str,
    irp: str | None = None,
) -> dict[str, Any] | None:
    """When NIC returns duplicate IRN, pull existing IRN by document and persist locally."""
    doc_type, doc_num, doc_date = _doc_details_from_payload(payload, doc_invoice)
    if not doc_num or not doc_date:
        return None

    try:
        api_result = client.get_irn_by_doc_details(
            doc_type,
            doc_num,
            doc_date,
            irp=irp,
        )
    except WhiteBooksApiError as exc:
        return {
            "success": False,
            "message": (
                f"IRN exists on NIC for this invoice but could not be synced: "
                f"{format_einvoice_error_message({'error_message': str(exc)})}"
            ),
            "log_id": exc.log_id,
        }

    parsed = parse_irn_response(api_result)
    if not parsed.get("irn"):
        nested = parse_irn_response({"data": api_result.get("data") or {}})
        if nested.get("irn"):
            parsed = nested

    if not parsed.get("irn"):
        return None

    persist_fn(cur, conn, entity_id, parsed)
    return {
        "success": True,
        "recovered": True,
        "message": (
            f"IRN was already generated on NIC for {entity_label}. "
            "Details have been synced to this invoice."
        ),
        "irn": parsed.get("irn"),
        "ack_no": parsed.get("ack_no"),
        "ack_date": parsed.get("ack_date"),
        "einvoice_status": "GENERATED",
        "signed_qr": parsed.get("signed_qr"),
        "log_id": api_result.get("log_id"),
    }


def normalize_bill_items_for_einvoice(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for row in items:
        qty = float(row.get("quantity") or row.get("qty") or 0)
        price = float(row.get("price") or row.get("unit_price") or 0)
        taxable = float(row.get("taxable_value") or 0)
        cgst = float(row.get("cgst_amt") or 0)
        sgst = float(row.get("sgst_amt") or 0)
        igst = float(row.get("igst_amt") or 0)
        tax_pct = float(row.get("tax_pct") or 0)
        if tax_pct <= 0 and taxable > 0:
            tax_pct = round(((cgst + sgst + igst) / taxable) * 100.0, 2)
        normalized.append({
            "product_name": row.get("product_name") or "",
            "product_id": row.get("product_code") or row.get("product_id") or "",
            "quantity": qty,
            "uom": row.get("uom") or "NOS",
            "unit_price": price,
            "tax_pct": tax_pct,
            "disc_pct": float(row.get("disc_pct") or 0),
            "hsn_code": row.get("hsn_code") or "",
            "taxable_value": taxable,
            "cgst_amt": cgst,
            "sgst_amt": sgst,
            "igst_amt": igst,
        })
    return normalized


def load_quick_bill_bundle(cur, bill_id: int) -> dict[str, Any] | None:
    ensure_einvoice_schema(cur)
    cur.execute(
        """
        SELECT id, created_at, user_email, payment_mode, invoice_total,
               irn, ack_no, ack_date, einvoice_status, signed_qr,
               customer_id, customer_name, buyer_gstin, company_code
        FROM quick_bills
        WHERE id = %s
        LIMIT 1
        """,
        (bill_id,),
    )
    row = cur.fetchone()
    if not row:
        return None
    cols = [
        "id", "created_at", "user_email", "payment_mode", "invoice_total",
        "irn", "ack_no", "ack_date", "einvoice_status", "signed_qr",
        "customer_id", "customer_name", "buyer_gstin", "company_code",
    ]
    bill = _row_to_dict(row, cols)

    cur.execute(
        """
        SELECT product_code, product_name, quantity, price, total,
               hsn_code, taxable_value, cgst_amt, sgst_amt, igst_amt
        FROM bill_items
        WHERE bill_id = %s
        ORDER BY id
        """,
        (bill_id,),
    )
    raw_items: list[dict[str, Any]] = []
    company_code = (bill.get("company_code") or "").strip() or None
    for brow in cur.fetchall():
        if isinstance(brow, dict):
            raw = dict(brow)
        else:
            raw = {
                "product_code": brow[0],
                "product_name": brow[1],
                "quantity": brow[2],
                "price": brow[3],
                "total": brow[4],
                "hsn_code": brow[5],
                "taxable_value": brow[6],
                "cgst_amt": brow[7],
                "sgst_amt": brow[8],
                "igst_amt": brow[9],
            }
        raw_items.append(enrich_bill_item(cur, raw, company_code=company_code))

    items = normalize_bill_items_for_einvoice(raw_items)
    grand_total = float(bill.get("invoice_total") or 0)
    tax_total = sum(
        float(i.get("cgst_amt") or 0) + float(i.get("sgst_amt") or 0) + float(i.get("igst_amt") or 0)
        for i in items
    )
    sub_total = sum(float(i.get("taxable_value") or 0) for i in items)
    if grand_total <= 0:
        grand_total = sub_total + tax_total

    buyer = None
    if bill.get("customer_id"):
        buyer = load_buyer_for_einvoice(cur, bill.get("customer_id"))
    if not buyer and (bill.get("buyer_gstin") or bill.get("customer_name")):
        buyer = {
            "name": bill.get("customer_name") or "",
            "company": bill.get("customer_name") or "",
            "gstin": bill.get("buyer_gstin") or "",
            "billing_address": "",
            "city": "",
            "state": "",
            "zip_code": "",
            "email": "",
            "phone": "",
        }

    seller = load_seller_for_einvoice(cur, bill.get("company_code"))
    invoice_stub = {
        "invoice_id": f"QB-{bill_id}",
        "invoice_date": bill.get("created_at"),
        "billing_address": (buyer or {}).get("billing_address") or "",
        "customer_name": bill.get("customer_name") or "",
    }
    summary = {
        "sub_total": sub_total,
        "tax_total": tax_total,
        "grand_total": grand_total,
        "shipping_charges": 0.0,
        "rounding_adjustment": 0.0,
    }
    return {
        "bill": bill,
        "invoice": invoice_stub,
        "items": items,
        "summary": summary,
        "seller": seller,
        "buyer": buyer or {},
    }


def validate_quick_bill_einvoice_prerequisites(
    bundle: dict[str, Any],
    *,
    fallback_seller_gstin: str | None = None,
) -> list[str]:
    errors: list[str] = []
    bill = bundle.get("bill") or {}
    items = bundle.get("items") or []
    buyer = bundle.get("buyer") or {}
    seller = bundle.get("seller") or {}

    if (bill.get("irn") or "").strip():
        errors.append("IRN already generated for this quick bill.")

    if not items:
        errors.append("Quick bill has no line items.")

    seller_gstin = (seller.get("gstin") or fallback_seller_gstin or "").strip().upper()
    if not seller_gstin or len(seller_gstin) != 15:
        errors.append("Seller GSTIN missing — set it in Company Information or .env.")

    buyer_gstin = (buyer.get("gstin") or bill.get("buyer_gstin") or "").strip().upper()
    if not buyer_gstin or len(buyer_gstin) != 15:
        errors.append("Buyer GSTIN missing — select a B2B customer with GSTIN on Quick Billing.")
    else:
        buyer_err = _validate_buyer_gstin(buyer_gstin, seller_gstin=seller_gstin)
        if buyer_err:
            errors.append(buyer_err)

    for idx, row in enumerate(items, start=1):
        hsn = (row.get("hsn_code") or "").strip()
        if not hsn:
            errors.append(f"Line {idx}: HSN code is required for e-Invoice.")
        qty = float(row.get("quantity") or 0)
        if qty <= 0:
            errors.append(f"Line {idx}: quantity must be greater than zero.")

    errors.extend(
        _validate_item_gst_rates(items, seller_gstin=seller_gstin, buyer_gstin=buyer_gstin)
    )

    return errors


def save_quick_bill_einvoice_result(cur, conn, bill_id: int, parsed: dict[str, Any]) -> None:
    ensure_einvoice_schema(cur)
    ack_date = parsed.get("ack_date")
    ack_ts = None
    if ack_date:
        for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d/%m/%Y", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
            try:
                ack_ts = datetime.strptime(str(ack_date).strip()[:19], fmt)
                break
            except ValueError:
                continue

    cur.execute(
        """
        UPDATE quick_bills
        SET irn = %s,
            ack_no = %s,
            ack_date = %s,
            einvoice_status = %s,
            signed_qr = %s
        WHERE id = %s
        """,
        (
            parsed.get("irn") or None,
            parsed.get("ack_no") or None,
            ack_ts,
            "GENERATED" if parsed.get("irn") else "FAILED",
            parsed.get("signed_qr") or None,
            bill_id,
        ),
    )
    conn.commit()


def _generate_irn_from_bundle(
    client: WhiteBooksClient,
    cur,
    conn,
    bundle: dict[str, Any],
    *,
    seller_gstin: str,
    doc_invoice: dict[str, Any],
    persist_fn,
    entity_id: str | int,
    entity_label: str,
) -> dict[str, Any]:
    seller = dict(bundle.get("seller") or {})
    seller["gstin"] = seller_gstin

    payload = build_einvoice_payload(
        seller=seller,
        buyer=bundle.get("buyer") or {},
        invoice=doc_invoice,
        items=bundle.get("items") or [],
        summary=bundle.get("summary") or {},
    )

    try:
        api_result = client.generate_irn(payload)
    except WhiteBooksApiError as exc:
        return {
            "success": False,
            "message": format_einvoice_error_message({"error_message": str(exc)}),
            "log_id": exc.log_id,
            "response": exc.response,
        }

    if api_result.get("missing_auth_token"):
        return {
            "success": False,
            "message": api_result.get("message") or "e-Invoice auth-token missing.",
            "missing_auth_token": True,
        }

    parsed = parse_irn_response(api_result)
    if not parsed.get("irn"):
        err_msg = format_einvoice_error_message(api_result, parsed)
        irp = None
        data = api_result.get("data")
        if isinstance(data, dict):
            irp = (data.get("irp") or "").strip() or None
        if _is_duplicate_irn_error(api_result, err_msg):
            recovered = _recover_irn_from_nic_by_doc(
                client,
                cur,
                conn,
                payload=payload,
                doc_invoice=doc_invoice,
                persist_fn=persist_fn,
                entity_id=entity_id,
                entity_label=entity_label,
                irp=irp,
            )
            if recovered:
                if recovered.get("success"):
                    recovered.setdefault("invoice_id", doc_invoice.get("invoice_id"))
                return recovered
            err_msg = (
                "NIC reports Duplicate IRN (invoice already submitted on the portal), "
                "but IRN details could not be synced for this document. "
                "Try Sync IRN, or create a new invoice with a new invoice number."
            )
        return {
            "success": False,
            "message": err_msg,
            "log_id": api_result.get("log_id"),
            "response": api_result,
            "payload_preview": {
                "DocDtls": payload.get("DocDtls"),
                "ItemCount": len(payload.get("ItemList") or []),
            },
        }

    persist_fn(cur, conn, entity_id, parsed)
    mock = bool((api_result.get("data") or {}).get("mock"))
    return {
        "success": True,
        "message": (
            "Sandbox mock IRN generated (configure WHITEBOOKS_EINVOICE_* credentials for live sandbox IRN)."
            if mock
            else f"e-Invoice IRN generated successfully for {entity_label}."
        ),
        "irn": parsed.get("irn"),
        "ack_no": parsed.get("ack_no"),
        "ack_date": parsed.get("ack_date"),
        "einvoice_status": "GENERATED",
        "signed_qr": parsed.get("signed_qr"),
        "log_id": api_result.get("log_id"),
    }


def validate_einvoice_prerequisites(
    bundle: dict[str, Any],
    *,
    fallback_seller_gstin: str | None = None,
) -> list[str]:
    errors: list[str] = []
    invoice = bundle.get("invoice") or {}
    items = bundle.get("items") or []
    seller = bundle.get("seller") or {}
    buyer = bundle.get("buyer") or {}

    if (invoice.get("irn") or "").strip():
        errors.append("IRN already generated for this invoice.")

    status = (invoice.get("status") or "").strip().lower()
    if status in ("cancelled", "draft"):
        errors.append("Invoice must be submitted (not Draft/Cancelled) before e-Invoice.")

    if not items:
        errors.append("Invoice has no line items.")

    seller_gstin = (seller.get("gstin") or fallback_seller_gstin or "").strip().upper()
    if not seller_gstin or len(seller_gstin) != 15:
        errors.append("Seller GSTIN missing — set it in Company Information or .env.")

    buyer_gstin = (buyer.get("gstin") or "").strip().upper()
    if not buyer_gstin or len(buyer_gstin) != 15:
        errors.append("Buyer GSTIN missing — add customer GSTIN for B2B e-Invoice.")
    else:
        buyer_err = _validate_buyer_gstin(buyer_gstin, seller_gstin=seller_gstin)
        if buyer_err:
            errors.append(buyer_err)

    for idx, row in enumerate(items, start=1):
        hsn = (row.get("hsn_code") or "").strip()
        if not hsn:
            errors.append(f"Line {idx}: HSN code is required for e-Invoice.")
        qty = float(row.get("quantity") or 0)
        if qty <= 0:
            errors.append(f"Line {idx}: quantity must be greater than zero.")

    errors.extend(
        _validate_item_gst_rates(items, seller_gstin=seller_gstin, buyer_gstin=buyer_gstin)
    )

    return errors


def parse_irn_response(api_result: dict[str, Any]) -> dict[str, Any]:
    """Extract IRN fields from WhiteBooks API response."""
    data = api_result.get("data") if isinstance(api_result, dict) else {}
    if not isinstance(data, dict):
        data = {}

    nested = data.get("data") or data.get("Data") or data
    if not isinstance(nested, dict):
        nested = {}

    def pick(*keys: str) -> str:
        for source in (nested, data):
            if not isinstance(source, dict):
                continue
            for key in keys:
                val = source.get(key)
                if val not in (None, ""):
                    return str(val).strip()
        return ""

    irn = pick("Irn", "irn", "IRN")
    ack_no = pick("AckNo", "ack_no", "AckNum", "ackNum")
    ack_dt = pick("AckDt", "ack_date", "AckDate", "ackDt")
    signed_qr = pick("SignedQRCode", "signed_qr", "SignedQrCode", "QrCode", "qr_code")

    return {
        "irn": irn,
        "ack_no": ack_no,
        "ack_date": ack_dt,
        "signed_qr": signed_qr,
        "status_cd": str(data.get("status_cd") or api_result.get("status_cd") or ""),
        "status_desc": data.get("status_desc") or api_result.get("status_desc"),
        "raw": data,
    }


def save_einvoice_result(cur, conn, invoice_id: str, parsed: dict[str, Any]) -> None:
    ensure_einvoice_schema(cur)
    ack_date = parsed.get("ack_date")
    ack_ts = None
    if ack_date:
        for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d/%m/%Y", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
            try:
                ack_ts = datetime.strptime(str(ack_date).strip()[:19], fmt)
                break
            except ValueError:
                continue

    cur.execute(
        """
        UPDATE invoices
        SET irn = %s,
            ack_no = %s,
            ack_date = %s,
            einvoice_status = %s,
            signed_qr = %s,
            updated_at = NOW()
        WHERE invoice_id = %s
        """,
        (
            parsed.get("irn") or None,
            parsed.get("ack_no") or None,
            ack_ts,
            "GENERATED" if parsed.get("irn") else "FAILED",
            parsed.get("signed_qr") or None,
            invoice_id,
        ),
    )
    conn.commit()


def generate_invoice_irn(
    client: WhiteBooksClient,
    cur,
    conn,
    invoice_id: str,
    *,
    company_code: str | None = None,
) -> dict[str, Any]:
    bundle = load_invoice_bundle(cur, invoice_id)
    if not bundle:
        return {"success": False, "message": "Invoice not found."}

    seller_gstin = resolve_seller_gstin(bundle.get("seller"), client)
    errors = validate_einvoice_prerequisites(
        bundle,
        fallback_seller_gstin=seller_gstin,
    )
    if errors:
        return {"success": False, "message": errors[0], "errors": errors}

    result = _generate_irn_from_bundle(
        client,
        cur,
        conn,
        bundle,
        seller_gstin=seller_gstin,
        doc_invoice=bundle.get("invoice") or {},
        persist_fn=lambda c, cn, _eid, parsed: save_einvoice_result(c, cn, invoice_id, parsed),
        entity_id=invoice_id,
        entity_label=f"invoice {invoice_id}",
    )
    if result.get("success"):
        result["invoice_id"] = invoice_id
    return result


def generate_quick_bill_irn(
    client: WhiteBooksClient,
    cur,
    conn,
    bill_id: int,
    *,
    company_code: str | None = None,
) -> dict[str, Any]:
    bundle = load_quick_bill_bundle(cur, bill_id)
    if not bundle:
        return {"success": False, "message": "Quick bill not found."}

    if company_code and not (bundle.get("bill") or {}).get("company_code"):
        bundle["bill"]["company_code"] = company_code
        bundle["seller"] = load_seller_for_einvoice(cur, company_code) or bundle.get("seller")

    seller_gstin = resolve_seller_gstin(bundle.get("seller"), client)
    errors = validate_quick_bill_einvoice_prerequisites(
        bundle,
        fallback_seller_gstin=seller_gstin,
    )
    if errors:
        return {"success": False, "message": errors[0], "errors": errors}

    bill = bundle.get("bill") or {}
    doc_invoice = {
        "invoice_id": f"QB-{bill_id}",
        "invoice_date": bill.get("created_at"),
        "billing_address": (bundle.get("buyer") or {}).get("billing_address") or "",
        "customer_name": bill.get("customer_name") or "",
    }
    result = _generate_irn_from_bundle(
        client,
        cur,
        conn,
        bundle,
        seller_gstin=seller_gstin,
        doc_invoice=doc_invoice,
        persist_fn=lambda c, cn, eid, parsed: save_quick_bill_einvoice_result(c, cn, int(eid), parsed),
        entity_id=bill_id,
        entity_label=f"quick bill #{bill_id}",
    )
    if result.get("success"):
        result["bill_id"] = bill_id
    return result


def _parse_ack_datetime(value: Any) -> datetime | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text = str(value).strip()
    for fmt in (
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d",
    ):
        try:
            dt = datetime.strptime(text[:19], fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _einvoice_record_dict(row, columns: list[str]) -> dict[str, Any]:
    data = _row_to_dict(row, columns)
    ack = data.get("ack_date")
    if hasattr(ack, "isoformat"):
        data["ack_date"] = ack.isoformat()
    cancel_dt = data.get("irn_cancel_date")
    if hasattr(cancel_dt, "isoformat"):
        data["irn_cancel_date"] = cancel_dt.isoformat()
    data["has_irn"] = bool((data.get("irn") or "").strip())
    return data


def load_invoice_einvoice_record(cur, invoice_id: str) -> dict[str, Any] | None:
    ensure_einvoice_schema(cur)
    cur.execute(
        """
        SELECT invoice_id, irn, ack_no, ack_date, einvoice_status, signed_qr,
               irn_cancel_date, status
        FROM invoices
        WHERE invoice_id = %s
        LIMIT 1
        """,
        (invoice_id,),
    )
    row = cur.fetchone()
    if not row:
        return None
    cols = [
        "invoice_id", "irn", "ack_no", "ack_date", "einvoice_status", "signed_qr",
        "irn_cancel_date", "status",
    ]
    return _einvoice_record_dict(row, cols)


def load_quick_bill_einvoice_record(cur, bill_id: int) -> dict[str, Any] | None:
    ensure_einvoice_schema(cur)
    cur.execute(
        """
        SELECT id, irn, ack_no, ack_date, einvoice_status, signed_qr, irn_cancel_date
        FROM quick_bills
        WHERE id = %s
        LIMIT 1
        """,
        (bill_id,),
    )
    row = cur.fetchone()
    if not row:
        return None
    cols = [
        "id", "irn", "ack_no", "ack_date", "einvoice_status", "signed_qr", "irn_cancel_date",
    ]
    data = _einvoice_record_dict(row, cols)
    data["bill_id"] = data.pop("id", bill_id)
    return data


def validate_cancel_prerequisites(record: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    irn = (record.get("irn") or "").strip()
    status = (record.get("einvoice_status") or "").strip().upper()

    if not irn:
        errors.append("No IRN exists for this document.")
    if status == "CANCELLED":
        errors.append("IRN is already cancelled.")
    if status == "FAILED":
        errors.append("Cannot cancel — e-Invoice generation failed.")

    ack_dt = _parse_ack_datetime(record.get("ack_date"))
    if ack_dt:
        now = datetime.now(timezone.utc)
        if now - ack_dt > timedelta(hours=24):
            errors.append("IRN can only be cancelled within 24 hours of generation.")

    return errors


def parse_cancel_response(api_result: dict[str, Any]) -> dict[str, Any]:
    data = api_result.get("data") if isinstance(api_result, dict) else {}
    if not isinstance(data, dict):
        data = {}
    nested = data.get("data") or data.get("Data") or data
    if not isinstance(nested, dict):
        nested = {}

    def pick(*keys: str) -> str:
        for source in (nested, data):
            if not isinstance(source, dict):
                continue
            for key in keys:
                val = source.get(key)
                if val not in (None, ""):
                    return str(val).strip()
        return ""

    return {
        "irn": pick("Irn", "irn", "IRN"),
        "cancel_date": pick("CancelDate", "cancel_date", "CancelDt"),
        "status_cd": str(data.get("status_cd") or api_result.get("status_cd") or ""),
        "status_desc": data.get("status_desc") or api_result.get("status_desc"),
        "raw": data,
    }


def save_invoice_einvoice_cancel(cur, conn, invoice_id: str, parsed: dict[str, Any]) -> None:
    ensure_einvoice_schema(cur)
    cancel_ts = _parse_ack_datetime(parsed.get("cancel_date")) or datetime.now(timezone.utc)
    cur.execute(
        """
        UPDATE invoices
        SET einvoice_status = %s,
            irn_cancel_date = %s,
            updated_at = NOW()
        WHERE invoice_id = %s
        """,
        ("CANCELLED", cancel_ts, invoice_id),
    )
    conn.commit()


def save_quick_bill_einvoice_cancel(cur, conn, bill_id: int, parsed: dict[str, Any]) -> None:
    ensure_einvoice_schema(cur)
    cancel_ts = _parse_ack_datetime(parsed.get("cancel_date")) or datetime.now(timezone.utc)
    cur.execute(
        """
        UPDATE quick_bills
        SET einvoice_status = %s,
            irn_cancel_date = %s
        WHERE id = %s
        """,
        ("CANCELLED", cancel_ts, bill_id),
    )
    conn.commit()


def merge_irn_details_from_api(parsed: dict[str, Any]) -> dict[str, Any]:
    """Normalize GET-IRN API payload into stored IRN fields."""
    irn_data = parse_irn_response({"data": parsed.get("data") or parsed})
    return irn_data


def save_invoice_einvoice_refresh(cur, conn, invoice_id: str, parsed: dict[str, Any]) -> None:
    if not parsed.get("irn"):
        return
    save_einvoice_result(cur, conn, invoice_id, parsed)


def save_quick_bill_einvoice_refresh(cur, conn, bill_id: int, parsed: dict[str, Any]) -> None:
    if not parsed.get("irn"):
        return
    save_quick_bill_einvoice_result(cur, conn, bill_id, parsed)


def _stored_irn_refresh_fallback(
    record: dict[str, Any],
    api_message: str,
) -> dict[str, Any] | None:
    """When NIC refresh fails but we already have IRN locally, keep showing stored data."""
    irn = (record.get("irn") or "").strip()
    if len(irn) != 64:
        return None
    msg = (api_message or "NIC lookup failed").strip()
    return {
        "success": True,
        "refreshed_from_api": False,
        "message": f"Could not refresh from NIC ({msg}). Showing stored e-Invoice details.",
        **record,
    }


def _try_doc_irn_recovery_on_refresh(
    client: WhiteBooksClient,
    cur,
    conn,
    *,
    invoice_id: str | None,
    bill_id: int | None,
    entity_label: str,
) -> dict[str, Any] | None:
    if not invoice_id:
        return None
    bundle = load_invoice_bundle(cur, invoice_id)
    if not bundle:
        return None
    seller_gstin = resolve_seller_gstin(bundle.get("seller"), client)
    payload = build_einvoice_payload(
        seller=dict(bundle.get("seller") or {}, gstin=seller_gstin),
        buyer=bundle.get("buyer") or {},
        invoice=bundle.get("invoice") or {},
        items=bundle.get("items") or [],
        summary=bundle.get("summary") or {},
    )
    return _recover_irn_from_nic_by_doc(
        client,
        cur,
        conn,
        payload=payload,
        doc_invoice=bundle.get("invoice") or {},
        persist_fn=lambda c, cn, _eid, parsed: save_invoice_einvoice_refresh(
            c, cn, invoice_id, parsed
        ),
        entity_id=invoice_id,
        entity_label=entity_label,
    )


def get_einvoice_details(
    client: WhiteBooksClient,
    cur,
    conn,
    *,
    invoice_id: str | None = None,
    bill_id: int | None = None,
    refresh: bool = False,
) -> dict[str, Any]:
    if bill_id is not None:
        record = load_quick_bill_einvoice_record(cur, bill_id)
        entity_label = f"quick bill #{bill_id}"
    elif invoice_id:
        record = load_invoice_einvoice_record(cur, invoice_id)
        entity_label = f"invoice {invoice_id}"
    else:
        return {"success": False, "message": "invoice_id or bill_id is required."}

    if not record:
        return {"success": False, "message": f"{entity_label.title()} not found."}

    irn = (record.get("irn") or "").strip()
    if refresh and not irn and invoice_id:
        bundle = load_invoice_bundle(cur, invoice_id)
        if bundle:
            seller_gstin = resolve_seller_gstin(bundle.get("seller"), client)
            payload = build_einvoice_payload(
                seller=dict(bundle.get("seller") or {}, gstin=seller_gstin),
                buyer=bundle.get("buyer") or {},
                invoice=bundle.get("invoice") or {},
                items=bundle.get("items") or [],
                summary=bundle.get("summary") or {},
            )
            recovered = _recover_irn_from_nic_by_doc(
                client,
                cur,
                conn,
                payload=payload,
                doc_invoice=bundle.get("invoice") or {},
                persist_fn=lambda c, cn, _eid, parsed: save_invoice_einvoice_refresh(
                    c, cn, invoice_id, parsed
                ),
                entity_id=invoice_id,
                entity_label=entity_label,
            )
            if recovered and recovered.get("success"):
                record = load_invoice_einvoice_record(cur, invoice_id) or record
                recovered["message"] = recovered.get("message") or f"e-Invoice synced for {entity_label}."
                return {"success": True, **record, **recovered}

    if refresh and irn and (record.get("einvoice_status") or "").upper() != "CANCELLED":
        try:
            api_result = client.get_irn_details(irn)
        except WhiteBooksApiError as exc:
            api_message = format_einvoice_error_message({"error_message": str(exc)})
            recovered = _try_doc_irn_recovery_on_refresh(
                client, cur, conn,
                invoice_id=invoice_id, bill_id=bill_id, entity_label=entity_label,
            )
            if recovered and recovered.get("success"):
                record = (
                    load_invoice_einvoice_record(cur, invoice_id)
                    if invoice_id
                    else load_quick_bill_einvoice_record(cur, bill_id)
                ) or record
                return {"success": True, **record, **recovered}
            fallback = _stored_irn_refresh_fallback(record, api_message)
            if fallback:
                return fallback
            return {
                "success": False,
                "message": api_message,
                "record": record,
            }
        if not api_result.get("success"):
            api_message = format_einvoice_error_message(api_result)
            recovered = _try_doc_irn_recovery_on_refresh(
                client, cur, conn,
                invoice_id=invoice_id, bill_id=bill_id, entity_label=entity_label,
            )
            if recovered and recovered.get("success"):
                record = (
                    load_invoice_einvoice_record(cur, invoice_id)
                    if invoice_id
                    else load_quick_bill_einvoice_record(cur, bill_id)
                ) or record
                return {"success": True, **record, **recovered}
            fallback = _stored_irn_refresh_fallback(record, api_message)
            if fallback:
                return {**fallback, "response": api_result}
            return {
                "success": False,
                "message": api_message,
                "record": record,
                "response": api_result,
            }
        merged = merge_irn_details_from_api(api_result)
        if bill_id is not None:
            save_quick_bill_einvoice_refresh(cur, conn, bill_id, merged)
            record = load_quick_bill_einvoice_record(cur, bill_id) or record
        else:
            save_invoice_einvoice_refresh(cur, conn, invoice_id, merged)
            record = load_invoice_einvoice_record(cur, invoice_id) or record

    return {
        "success": True,
        "message": f"e-Invoice details for {entity_label}.",
        **record,
    }


def cancel_einvoice_irn(
    client: WhiteBooksClient,
    cur,
    conn,
    *,
    invoice_id: str | None = None,
    bill_id: int | None = None,
    reason: str = "3",
    remarks: str = "",
) -> dict[str, Any]:
    if bill_id is not None:
        record = load_quick_bill_einvoice_record(cur, bill_id)
        entity_label = f"quick bill #{bill_id}"
    elif invoice_id:
        record = load_invoice_einvoice_record(cur, invoice_id)
        entity_label = f"invoice {invoice_id}"
    else:
        return {"success": False, "message": "invoice_id or bill_id is required."}

    if not record:
        return {"success": False, "message": f"{entity_label.title()} not found."}

    errors = validate_cancel_prerequisites(record)
    if errors:
        return {"success": False, "message": errors[0], "errors": errors}

    irn = (record.get("irn") or "").strip()
    try:
        api_result = client.cancel_irn(irn, reason=reason, remarks=remarks)
    except WhiteBooksApiError as exc:
        return {
            "success": False,
            "message": format_einvoice_error_message({"error_message": str(exc)}),
            "log_id": exc.log_id,
        }

    if api_result.get("missing_auth_token"):
        return {
            "success": False,
            "message": api_result.get("message") or "e-Invoice auth-token missing.",
            "missing_auth_token": True,
        }

    if not api_result.get("success"):
        parsed = parse_cancel_response(api_result)
        return {
            "success": False,
            "message": format_einvoice_error_message(api_result, parsed),
            "response": api_result,
        }

    parsed = parse_cancel_response(api_result)
    if not parsed.get("irn"):
        parsed["irn"] = irn

    if bill_id is not None:
        save_quick_bill_einvoice_cancel(cur, conn, bill_id, parsed)
    else:
        save_invoice_einvoice_cancel(cur, conn, invoice_id, parsed)

    mock = bool((api_result.get("data") or {}).get("mock"))
    return {
        "success": True,
        "message": (
            "Sandbox mock IRN cancelled."
            if mock
            else f"IRN cancelled successfully for {entity_label}."
        ),
        "irn": irn,
        "einvoice_status": "CANCELLED",
        "cancel_date": parsed.get("cancel_date"),
        "invoice_id": invoice_id,
        "bill_id": bill_id,
    }
