"""Phase 3 — compute and persist GST line tax for invoices and quick bills."""

from __future__ import annotations

import re
from typing import Any

from gst.einvoice_schema import ensure_einvoice_schema


def _as_float(value: Any, default: float = 0.0) -> float:
    if value in (None, ""):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _parse_money(value: Any) -> float:
    if value in (None, ""):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    text = re.sub(r"[₹,\s]", "", text)
    try:
        return float(text)
    except ValueError:
        return 0.0


def _table_has_company_code(cur, table_name: str) -> bool:
    cur.execute(
        """
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
          AND column_name = 'company_code'
        LIMIT 1
        """,
        (table_name,),
    )
    return cur.fetchone() is not None


def lookup_product_tax(
    cur,
    product_id: str | None,
    *,
    company_code: str | None = None,
) -> dict[str, Any] | None:
    pid = (product_id or "").strip()
    if not pid:
        return None

    def _query(where: list[str], params: list[Any]) -> dict[str, Any] | None:
        cur.execute(
            f"""
            SELECT hsn_code, tax_code, tax_percent, cgst, sgst, igst
            FROM products
            WHERE {' AND '.join(where)}
            LIMIT 1
            """,
            tuple(params),
        )
        row = cur.fetchone()
        if not row:
            return None
        if isinstance(row, dict):
            return row
        return {
            "hsn_code": row[0],
            "tax_code": row[1],
            "tax_percent": row[2],
            "cgst": row[3],
            "sgst": row[4],
            "igst": row[5],
        }

    where = ["product_id = %s"]
    params: list[Any] = [pid]
    if company_code and _table_has_company_code(cur, "products"):
        where.append("UPPER(TRIM(COALESCE(company_code, ''))) = UPPER(TRIM(%s))")
        params.append(company_code.strip().upper())
        row = _query(where, params)
        if row:
            return row

    return _query(["product_id = %s"], [pid])


def _resolve_rates_from_product(product: dict[str, Any] | None, tax_pct: float) -> tuple[float, float, float]:
    if product:
        cgst_r = _as_float(product.get("cgst"))
        sgst_r = _as_float(product.get("sgst"))
        igst_r = _as_float(product.get("igst"))
        if cgst_r > 0 or sgst_r > 0:
            return cgst_r, sgst_r, igst_r
        if igst_r > 0:
            return igst_r / 2.0, igst_r / 2.0, igst_r
        tp = _as_float(product.get("tax_percent"))
        if tp > 0:
            return tp / 2.0, tp / 2.0, tp
    if tax_pct > 0:
        return tax_pct / 2.0, tax_pct / 2.0, tax_pct
    return 0.0, 0.0, 0.0


def enrich_invoice_item(
    cur,
    item: dict[str, Any],
    *,
    company_code: str | None = None,
) -> dict[str, Any]:
    qty = _as_float(item.get("quantity"))
    unit_price = _as_float(item.get("unit_price"))
    tax_pct = _as_float(item.get("tax_pct"))
    disc_pct = _as_float(item.get("disc_pct"))

    line_gross = qty * unit_price
    discount_amt = line_gross * (disc_pct / 100.0)
    taxable_value = item.get("taxable_value")
    if taxable_value in (None, ""):
        taxable_value = line_gross - discount_amt
    taxable_value = round(_as_float(taxable_value), 2)

    hsn_code = (item.get("hsn_code") or "").strip()
    product = lookup_product_tax(cur, item.get("product_id"), company_code=company_code)
    if not hsn_code and product:
        hsn_code = (product.get("hsn_code") or "").strip()

    cgst_amt = item.get("cgst_amt")
    sgst_amt = item.get("sgst_amt")
    igst_amt = item.get("igst_amt")
    if cgst_amt in (None, "") or sgst_amt in (None, "") or igst_amt in (None, ""):
        cgst_r, sgst_r, igst_r = _resolve_rates_from_product(product, tax_pct)
        if cgst_amt in (None, ""):
            cgst_amt = round(taxable_value * cgst_r / 100.0, 2)
        else:
            cgst_amt = round(_as_float(cgst_amt), 2)
        if sgst_amt in (None, ""):
            sgst_amt = round(taxable_value * sgst_r / 100.0, 2)
        else:
            sgst_amt = round(_as_float(sgst_amt), 2)
        if igst_amt in (None, ""):
            igst_amt = (
                round(taxable_value * igst_r / 100.0, 2)
                if igst_r > (cgst_r + sgst_r)
                else 0.0
            )
        else:
            igst_amt = round(_as_float(igst_amt), 2)
    else:
        cgst_amt = round(_as_float(cgst_amt), 2)
        sgst_amt = round(_as_float(sgst_amt), 2)
        igst_amt = round(_as_float(igst_amt), 2)

    return {
        "product_name": item.get("product_name"),
        "product_id": item.get("product_id"),
        "quantity": int(qty) if qty == int(qty) else qty,
        "uom": item.get("uom"),
        "unit_price": unit_price,
        "tax_pct": tax_pct,
        "disc_pct": disc_pct,
        "hsn_code": hsn_code or None,
        "taxable_value": taxable_value,
        "cgst_amt": cgst_amt,
        "sgst_amt": sgst_amt,
        "igst_amt": igst_amt,
    }


def enrich_bill_item(
    cur,
    item: dict[str, Any],
    *,
    company_code: str | None = None,
) -> dict[str, Any]:
    qty = _as_float(item.get("quantity") or item.get("qty") or 1, 1.0)
    price = _parse_money(item.get("price"))
    total = item.get("total")
    if total in (None, ""):
        total = qty * price
    else:
        total = _parse_money(total)

    taxable_value = item.get("taxable_value")
    if taxable_value in (None, ""):
        taxable_value = _parse_money(item.get("taxable")) or (qty * price)
    taxable_value = round(_as_float(taxable_value), 2)

    product = lookup_product_tax(cur, item.get("product_code"), company_code=company_code)
    hsn_code = (item.get("hsn_code") or "").strip()
    if not hsn_code and product:
        hsn_code = (product.get("hsn_code") or "").strip()

    cgst_amt = item.get("cgst_amt")
    sgst_amt = item.get("sgst_amt")
    igst_amt = item.get("igst_amt")
    if cgst_amt in (None, "") or sgst_amt in (None, ""):
        cgst_r = _as_float(item.get("cgst_rate"))
        sgst_r = _as_float(item.get("sgst_rate"))
        if cgst_r <= 0 and sgst_r <= 0 and product:
            cgst_r, sgst_r, _igst_r = _resolve_rates_from_product(product, 0.0)
        if cgst_amt in (None, ""):
            cgst_amt = round(_parse_money(item.get("cgst")) or (taxable_value * cgst_r / 100.0), 2)
        else:
            cgst_amt = round(_as_float(cgst_amt), 2)
        if sgst_amt in (None, ""):
            sgst_amt = round(_parse_money(item.get("sgst")) or (taxable_value * sgst_r / 100.0), 2)
        else:
            sgst_amt = round(_as_float(sgst_amt), 2)
        if igst_amt in (None, ""):
            igst_r = _as_float(item.get("igst_rate"))
            if igst_r <= 0 and product:
                _c, _s, igst_r = _resolve_rates_from_product(product, 0.0)
            igst_amt = round(_parse_money(item.get("igst")) or 0.0, 2)
            if igst_amt <= 0 and igst_r > 0:
                igst_amt = round(taxable_value * igst_r / 100.0, 2)
        else:
            igst_amt = round(_as_float(igst_amt), 2)
    else:
        cgst_amt = round(_as_float(cgst_amt), 2)
        sgst_amt = round(_as_float(sgst_amt), 2)
        igst_amt = round(_as_float(igst_amt), 2)

    if total <= 0:
        total = round(taxable_value + cgst_amt + sgst_amt + igst_amt, 2)

    return {
        "product_code": item.get("product_code"),
        "product_name": item.get("product_name"),
        "quantity": qty,
        "price": price,
        "total": round(_as_float(total), 2),
        "hsn_code": hsn_code or None,
        "taxable_value": taxable_value,
        "cgst_amt": cgst_amt,
        "sgst_amt": sgst_amt,
        "igst_amt": igst_amt,
    }


def insert_invoice_items(
    cur,
    invoice_id: str,
    items: list[dict[str, Any]],
    *,
    company_code: str | None = None,
) -> None:
    ensure_einvoice_schema(cur)
    for raw in items:
        item = enrich_invoice_item(cur, raw, company_code=company_code)
        cur.execute(
            """
            INSERT INTO invoice_items (
                invoice_id, product_name, product_id,
                quantity, uom, unit_price, tax_pct, disc_pct,
                hsn_code, taxable_value, cgst_amt, sgst_amt, igst_amt
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                invoice_id,
                item.get("product_name"),
                item.get("product_id"),
                int(item.get("quantity") or 0),
                item.get("uom"),
                item.get("unit_price"),
                item.get("tax_pct"),
                item.get("disc_pct"),
                item.get("hsn_code"),
                item.get("taxable_value"),
                item.get("cgst_amt"),
                item.get("sgst_amt"),
                item.get("igst_amt"),
            ),
        )


def fetch_invoice_items(cur, invoice_id: str) -> list[dict[str, Any]]:
    ensure_einvoice_schema(cur)
    cur.execute(
        """
        SELECT product_name, product_id, quantity, uom,
               unit_price, tax_pct, disc_pct,
               hsn_code, taxable_value, cgst_amt, sgst_amt, igst_amt
        FROM invoice_items
        WHERE invoice_id = %s
        ORDER BY id
        """,
        (invoice_id,),
    )
    items: list[dict[str, Any]] = []
    for row in cur.fetchall():
        if isinstance(row, dict):
            qty = _as_float(row.get("quantity"))
            price = _as_float(row.get("unit_price"))
            tax = _as_float(row.get("tax_pct"))
            disc = _as_float(row.get("disc_pct"))
            items.append({
                "product_name": row.get("product_name") or "",
                "product_id": row.get("product_id") or "",
                "quantity": qty,
                "uom": row.get("uom") or "",
                "unit_price": price,
                "tax_pct": tax,
                "disc_pct": disc,
                "hsn_code": row.get("hsn_code") or "",
                "taxable_value": _as_float(row.get("taxable_value")),
                "cgst_amt": _as_float(row.get("cgst_amt")),
                "sgst_amt": _as_float(row.get("sgst_amt")),
                "igst_amt": _as_float(row.get("igst_amt")),
                "total": qty * price * (1 - disc / 100) * (1 + tax / 100),
            })
            continue
        qty = _as_float(row[2])
        price = _as_float(row[4])
        tax = _as_float(row[5])
        disc = _as_float(row[6])
        items.append({
            "product_name": row[0] or "",
            "product_id": row[1] or "",
            "quantity": qty,
            "uom": row[3] or "",
            "unit_price": price,
            "tax_pct": tax,
            "disc_pct": disc,
            "hsn_code": row[7] or "",
            "taxable_value": _as_float(row[8]),
            "cgst_amt": _as_float(row[9]),
            "sgst_amt": _as_float(row[10]),
            "igst_amt": _as_float(row[11]),
            "total": qty * price * (1 - disc / 100) * (1 + tax / 100),
        })
    return items


def insert_bill_items(
    cur,
    bill_id: int,
    items: list[dict[str, Any]],
    *,
    company_code: str | None = None,
) -> None:
    ensure_einvoice_schema(cur)
    for raw in items:
        item = enrich_bill_item(cur, raw, company_code=company_code)
        cur.execute(
            """
            INSERT INTO bill_items (
                bill_id, product_code, product_name, quantity, price, total,
                hsn_code, taxable_value, cgst_amt, sgst_amt, igst_amt
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                bill_id,
                item.get("product_code"),
                item.get("product_name"),
                item.get("quantity"),
                item.get("price"),
                item.get("total"),
                item.get("hsn_code"),
                item.get("taxable_value"),
                item.get("cgst_amt"),
                item.get("sgst_amt"),
                item.get("igst_amt"),
            ),
        )


BILL_ITEM_JSON_FIELDS = """
    'product_code', bi.product_code,
    'product_name', bi.product_name,
    'quantity', bi.quantity,
    'price', bi.price,
    'total', bi.total,
    'hsn_code', bi.hsn_code,
    'taxable_value', bi.taxable_value,
    'cgst_amt', bi.cgst_amt,
    'sgst_amt', bi.sgst_amt,
    'igst_amt', bi.igst_amt
"""
