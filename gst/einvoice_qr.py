"""Render NIC signed QR strings as PNG bytes for PDF and HTTP responses."""

from __future__ import annotations

from io import BytesIO
from typing import Any


def build_qr_png_bytes(data: str, *, box_size: int = 4) -> bytes | None:
    text = (data or "").strip()
    if not text:
        return None
    try:
        import qrcode
    except ImportError:
        return None
    try:
        qr = qrcode.QRCode(box_size=box_size, border=2)
        qr.add_data(text)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
    except Exception:
        return None


def build_einvoice_qr_flowable(
    invoice: dict[str, Any],
    *,
    width: float = 72,
    height: float = 72,
) -> Any | None:
    """Return a ReportLab Image flowable for the e-Invoice QR, or None."""
    irn = (invoice.get("irn") or "").strip()
    if not irn:
        return None
    einv_status = (invoice.get("einvoice_status") or "").strip().upper()
    if einv_status == "CANCELLED":
        return None

    qr_text = (invoice.get("signed_qr") or irn).strip()
    png = build_qr_png_bytes(qr_text)
    if not png:
        return None

    from reportlab.platypus import Image as RLImage

    img = RLImage(BytesIO(png), width=width, height=height)
    return img


def build_einvoice_qr_header_block(
    invoice: dict[str, Any],
    *,
    block_width: float = 148,
    qr_width: float = 72,
    qr_height: float = 72,
) -> Any | None:
    """QR image with IRN and Ack No stacked below — for PDF header top-right."""
    irn = (invoice.get("irn") or "").strip()
    einv_status = (invoice.get("einvoice_status") or "").strip().upper()
    if not irn or einv_status == "CANCELLED":
        return None

    from reportlab.lib import colors
    from reportlab.lib.enums import TA_RIGHT
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.platypus import Paragraph, Table, TableStyle

    qr_flowable = build_einvoice_qr_flowable(invoice, width=qr_width, height=qr_height)
    ack_no = (invoice.get("ack_no") or "").strip() or "-"

    styles = getSampleStyleSheet()
    irn_style = ParagraphStyle(
        name="EinvPdfIrn",
        parent=styles["Normal"],
        fontName="DejaVuSans",
        fontSize=6.5,
        leading=8,
        textColor=colors.HexColor("#1f2937"),
        alignment=TA_RIGHT,
    )
    ack_style = ParagraphStyle(
        name="EinvPdfAck",
        parent=irn_style,
        fontSize=7,
        leading=9,
        fontName="DejaVuSans-Bold",
    )

    rows: list[list[Any]] = []
    if qr_flowable:
        rows.append([qr_flowable])
    rows.append([Paragraph(f"<b>IRN:</b><br/>{irn}", irn_style)])
    rows.append([Paragraph(f"<b>Ack No:</b> {ack_no}", ack_style)])

    block = Table(rows, colWidths=[block_width])
    block.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -2), 2),
                ("BOTTOMPADDING", (0, -1), (-1, -1), 0),
            ]
        )
    )
    return block


def _format_ack_date(ack_date: Any) -> str:
    if ack_date is None:
        return "-"
    if hasattr(ack_date, "strftime"):
        return ack_date.strftime("%d/%m/%Y %H:%M")
    text = str(ack_date).strip()
    return text if text else "-"


def append_einvoice_pdf_section(
    elements: list[Any],
    invoice: dict[str, Any],
    *,
    section_style: Any,
    label_style: Any,
    value_style: Any,
    box_colon: Any,
    box_header: Any,
    icons: dict[tuple[str, int], Any],
    blank_icon: Any,
    Spacer: Any,
    Table: Any,
    TableStyle: Any,
    Paragraph: Any,
    colors: Any,
    usable_w: float,
    maroon_border: Any,
    maroon_light: Any,
    box_icon_w: float = 22,
    box_label_w: float = 74,
    box_colon_w: float = 10,
) -> None:
    """Add e-Invoice details block (no QR — QR is shown in the PDF header)."""
    irn = (invoice.get("irn") or "").strip()
    if not irn:
        return

    ack_no = (invoice.get("ack_no") or "").strip() or "-"
    ack_date_text = _format_ack_date(invoice.get("ack_date"))
    einv_status = (invoice.get("einvoice_status") or "GENERATED").strip()
    cancel_date = invoice.get("irn_cancel_date")
    cancel_date_text = _format_ack_date(cancel_date) if cancel_date else ""

    half_w = usable_w / 2
    box_value_half_w = half_w - box_icon_w - box_label_w - box_colon_w
    col_widths = [
        box_icon_w, box_label_w, box_colon_w, box_value_half_w,
        box_icon_w, box_label_w, box_colon_w, box_value_half_w,
    ]

    rows: list[list[Any]] = [
        [Paragraph("<b>e-INVOICE DETAILS</b>", box_header), "", "", "", "", "", "", ""],
        [
            icons.get(("document", 12), blank_icon),
            Paragraph("<b>IRN</b>", label_style),
            Paragraph(":", box_colon),
            Paragraph(irn, value_style),
            icons.get(("file", 12), blank_icon),
            Paragraph("<b>ACK No</b>", label_style),
            Paragraph(":", box_colon),
            Paragraph(ack_no, value_style),
        ],
        [
            icons.get(("calendar", 12), blank_icon),
            Paragraph("<b>ACK Date</b>", label_style),
            Paragraph(":", box_colon),
            Paragraph(ack_date_text, value_style),
            icons.get(("document", 12), blank_icon),
            Paragraph("<b>Status</b>", label_style),
            Paragraph(":", box_colon),
            Paragraph(einv_status, value_style),
        ],
    ]
    if cancel_date_text and cancel_date_text != "-":
        rows.append([
            icons.get(("calendar", 12), blank_icon),
            Paragraph("<b>IRN Cancel Date</b>", label_style),
            Paragraph(":", box_colon),
            Paragraph(cancel_date_text, value_style),
            "", "", "", "",
        ])

    einv_table = Table(rows, colWidths=col_widths)
    einv_table.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.8, maroon_border),
                ("ROUNDEDCORNERS", [4, 4, 4, 4]),
                ("BACKGROUND", (0, 0), (-1, 0), maroon_light),
                ("SPAN", (0, 0), (7, 0)),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 1), (0, -1), "CENTER"),
                ("ALIGN", (4, 1), (4, -1), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, 0), 6),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                ("TOPPADDING", (0, 1), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
                ("LEFTPADDING", (0, 1), (0, -1), 6),
                ("RIGHTPADDING", (0, 1), (0, -1), 2),
                ("LEFTPADDING", (4, 1), (4, -1), 10),
                ("RIGHTPADDING", (4, 1), (4, -1), 2),
                ("LEFTPADDING", (2, 1), (2, -1), 0),
                ("RIGHTPADDING", (2, 1), (2, -1), 4),
                ("LEFTPADDING", (6, 1), (6, -1), 0),
                ("RIGHTPADDING", (6, 1), (6, -1), 4),
                ("LINEBELOW", (0, 0), (-1, 0), 0.5, maroon_border),
            ]
        )
    )

    elements.append(Spacer(1, 14))
    elements.append(einv_table)
    elements.append(Spacer(1, 14))
