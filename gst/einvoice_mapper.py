"""Map Stackly invoice data to WhiteBooks / NIC e-Invoice JSON (v1.1)."""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any


def _as_float(value: Any, default: float = 0.0) -> float:
    if value in (None, ""):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _round2(value: float) -> float:
    return round(float(value or 0), 2)


def gst_state_code(gstin: str) -> str:
    gstin = (gstin or "").strip().upper()
    return gstin[:2] if len(gstin) >= 2 else ""


def format_einvoice_date(value: Any) -> str:
    """NIC format DD/MM/YYYY."""
    if value is None or value == "":
        return date.today().strftime("%d/%m/%Y")
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y")
    if isinstance(value, date):
        return value.strftime("%d/%m/%Y")
    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(text[:10], fmt).strftime("%d/%m/%Y")
        except ValueError:
            continue
    return date.today().strftime("%d/%m/%Y")


_STATE_DEFAULT_PIN: dict[str, int] = {
    "27": 400001,  # Maharashtra
    "29": 560001,  # Karnataka
    "33": 600001,  # Tamil Nadu
    "07": 110001,  # Delhi
    "09": 201301,  # Uttar Pradesh
}

_STATE_PIN_PREFIXES: dict[str, tuple[str, ...]] = {
    "27": ("40", "41", "42", "43", "44"),
    "29": ("56", "57", "58", "59"),
    "33": ("60", "61", "62", "63", "64"),
}


def parse_pincode(value: Any, fallback: int = 560001, *, stcd: str | None = None) -> int:
    digits = re.sub(r"\D", "", str(value or ""))
    state = (stcd or "").strip()
    if state and state in _STATE_DEFAULT_PIN:
        fallback = _STATE_DEFAULT_PIN[state]
    pin = fallback
    if len(digits) >= 6:
        try:
            candidate = int(digits[:6])
            if 100000 <= candidate <= 999999:
                pin = candidate
        except ValueError:
            pass
    prefixes = _STATE_PIN_PREFIXES.get(state)
    if prefixes and not str(pin).startswith(prefixes):
        pin = fallback
    return pin


def _strip_nulls(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _strip_nulls(v) for k, v in value.items() if v is not None}
    if isinstance(value, list):
        return [_strip_nulls(v) for v in value]
    return value


def _nic_address_line(value: str, *, fallback: str = "NA") -> str:
    """NIC requires address lines to be 3-100 characters when present."""
    text = (value or "").strip()
    if len(text) < 3:
        text = fallback
    return text[:100]


def _party_block(
    *,
    gstin: str,
    legal_name: str,
    trade_name: str,
    addr1: str,
    addr2: str,
    city: str,
    pincode: Any,
    phone: str,
    email: str,
    pos: str | None = None,
) -> dict[str, Any]:
    stcd = gst_state_code(gstin)
    block = {
        "Gstin": gstin.strip().upper(),
        "LglNm": (legal_name or trade_name or "NA")[:100],
        "TrdNm": (trade_name or legal_name or "NA")[:100],
        "Addr1": _nic_address_line(addr1 or city or ""),
        "Addr2": _nic_address_line(addr2 or city or addr1 or ""),
        "Loc": (city or "NA")[:50],
        "Pin": parse_pincode(pincode, stcd=stcd or None),
        "Stcd": stcd or "27",
        "Ph": re.sub(r"\D", "", phone or "")[:15] or "9999999999",
        "Em": (email or "")[:100],
    }
    if pos:
        block["Pos"] = pos
    return block


def _split_address(address: str) -> tuple[str, str]:
    text = (address or "").strip()
    if not text:
        return "NA", ""
    if len(text) <= 100:
        return text, ""
    return text[:100], text[100:200]


def build_einvoice_payload(
    *,
    seller: dict[str, Any],
    buyer: dict[str, Any],
    invoice: dict[str, Any],
    items: list[dict[str, Any]],
    summary: dict[str, Any],
) -> dict[str, Any]:
    """Build POST body for /einvoice/type/GENERATE/version/V1_03."""
    seller_gstin = (seller.get("gstin") or "").strip().upper()
    buyer_gstin = (buyer.get("gstin") or "").strip().upper()
    seller_stcd = gst_state_code(seller_gstin)
    buyer_stcd = gst_state_code(buyer_gstin)
    intra_state = seller_stcd and buyer_stcd and seller_stcd == buyer_stcd

    seller_addr1, seller_addr2 = _split_address(seller.get("address") or "")
    buyer_addr1, buyer_addr2 = _split_address(
        buyer.get("billing_address") or invoice.get("billing_address") or buyer.get("street") or ""
    )

    item_list: list[dict[str, Any]] = []
    ass_val = cgst_val = sgst_val = igst_val = 0.0

    for idx, row in enumerate(items, start=1):
        qty = _as_float(row.get("quantity"))
        unit_price = _as_float(row.get("unit_price"))
        disc_pct = _as_float(row.get("disc_pct"))
        tax_pct = _as_float(row.get("tax_pct"))
        line_gross = qty * unit_price
        discount_amt = line_gross * (disc_pct / 100.0)
        taxable = _as_float(row.get("taxable_value"), line_gross - discount_amt)
        cgst_amt = _as_float(row.get("cgst_amt"))
        sgst_amt = _as_float(row.get("sgst_amt"))
        igst_amt = _as_float(row.get("igst_amt"))

        if cgst_amt <= 0 and sgst_amt <= 0 and igst_amt <= 0 and tax_pct > 0:
            half = tax_pct / 2.0
            cgst_amt = taxable * (half / 100.0)
            sgst_amt = taxable * (half / 100.0)

        if not intra_state:
            igst_amt = cgst_amt + sgst_amt + igst_amt
            cgst_amt = 0.0
            sgst_amt = 0.0

        tot_item_val = taxable + cgst_amt + sgst_amt + igst_amt
        ass_val += taxable
        cgst_val += cgst_amt
        sgst_val += sgst_amt
        igst_val += igst_amt

        hsn = (row.get("hsn_code") or "").strip() or "999999"
        qty_out: int | float = int(qty) if qty == int(qty) else _round2(qty)
        gst_rate = _round2(tax_pct)
        if gst_rate <= 0 and (cgst_amt + sgst_amt + igst_amt) > 0 and taxable > 0:
            gst_rate = _round2(((cgst_amt + sgst_amt + igst_amt) / taxable) * 100.0)
        item_list.append({
            "SlNo": str(idx),
            "IsServc": "N",
            "PrdDesc": (row.get("product_name") or "Item")[:300],
            "HsnCd": hsn,
            "Qty": qty_out,
            "Unit": (row.get("uom") or "NOS")[:8],
            "UnitPrice": _round2(unit_price),
            "TotAmt": _round2(line_gross),
            "Discount": _round2(discount_amt),
            "AssAmt": _round2(taxable),
            "GstRt": gst_rate,
            "CgstAmt": _round2(cgst_amt),
            "SgstAmt": _round2(sgst_amt),
            "IgstAmt": _round2(igst_amt),
            "TotItemVal": _round2(tot_item_val),
        })

    grand_total = _as_float(summary.get("grand_total"))
    if grand_total <= 0:
        grand_total = ass_val + cgst_val + sgst_val + igst_val
    rounding = _as_float(summary.get("rounding_adjustment"))

    return _strip_nulls({
        "Version": "1.1",
        "TranDtls": {
            "TaxSch": "GST",
            "SupTyp": "B2B",
            "RegRev": "N",
            "IgstOnIntra": "N",
        },
        "DocDtls": {
            "Typ": "INV",
            "No": (invoice.get("invoice_id") or "")[:16],
            "Dt": format_einvoice_date(invoice.get("invoice_date")),
        },
        "SellerDtls": _party_block(
            gstin=seller_gstin,
            legal_name=seller.get("company_name") or seller.get("owner_name") or "",
            trade_name=seller.get("company_name") or "",
            addr1=seller_addr1,
            addr2=seller_addr2,
            city=seller.get("city") or "",
            pincode=seller.get("pincode"),
            phone=seller.get("phone") or seller.get("phone_number") or "",
            email=seller.get("email") or "",
        ),
        "BuyerDtls": _party_block(
            gstin=buyer_gstin,
            legal_name=buyer.get("name") or buyer.get("company") or invoice.get("customer_name") or "",
            trade_name=buyer.get("company") or buyer.get("name") or "",
            addr1=buyer_addr1,
            addr2=buyer_addr2,
            city=buyer.get("city") or "",
            pincode=buyer.get("zip_code") or buyer.get("pincode"),
            phone=buyer.get("phone") or invoice.get("phone") or "",
            email=buyer.get("email") or invoice.get("email") or "",
            pos=buyer_stcd or seller_stcd,
        ),
        "ItemList": item_list,
        "ValDtls": {
            "AssVal": _round2(ass_val),
            "CgstVal": _round2(cgst_val),
            "SgstVal": _round2(sgst_val),
            "IgstVal": _round2(igst_val),
            "CesVal": 0,
            "StCesVal": 0,
            "Discount": 0,
            "OthChrg": _round2(_as_float(summary.get("shipping_charges"))),
            "RndOffAmt": _round2(rounding),
            "TotInvVal": _round2(grand_total),
        },
    })
