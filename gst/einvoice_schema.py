"""Phase 3 — ensure e-Invoice / GST tax columns exist."""

from __future__ import annotations

_SCHEMA_READY = False

_EINVOICE_HEADER_COLUMNS: tuple[tuple[str, str], ...] = (
    ("irn", "VARCHAR(64)"),
    ("ack_no", "VARCHAR(32)"),
    ("ack_date", "TIMESTAMPTZ"),
    ("einvoice_status", "VARCHAR(32)"),
    ("signed_qr", "TEXT"),
    ("irn_cancel_date", "TIMESTAMPTZ"),
)

_INVOICE_COLUMNS = _EINVOICE_HEADER_COLUMNS

_QUICK_BILL_EXTRA_COLUMNS: tuple[tuple[str, str], ...] = (
    ("customer_id", "VARCHAR(64)"),
    ("customer_name", "VARCHAR(255)"),
    ("buyer_gstin", "VARCHAR(20)"),
    ("company_code", "VARCHAR(32)"),
)

_LINE_TAX_COLUMNS: tuple[tuple[str, str], ...] = (
    ("hsn_code", "VARCHAR(20)"),
    ("taxable_value", "NUMERIC(14, 2) DEFAULT 0"),
    ("cgst_amt", "NUMERIC(14, 2) DEFAULT 0"),
    ("sgst_amt", "NUMERIC(14, 2) DEFAULT 0"),
    ("igst_amt", "NUMERIC(14, 2) DEFAULT 0"),
)


def _column_exists(cur, table_name: str, column_name: str) -> bool:
    cur.execute(
        """
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
          AND column_name = %s
        LIMIT 1
        """,
        (table_name, column_name),
    )
    return cur.fetchone() is not None


def _ensure_columns(cur, table_name: str, columns: tuple[tuple[str, str], ...]) -> None:
    for col_name, col_def in columns:
        if not _column_exists(cur, table_name, col_name):
            cur.execute(
                f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col_name} {col_def}"
            )


def ensure_einvoice_schema(cur, conn=None) -> None:
    """Add Phase 3 columns to invoices, invoice_items, and bill_items."""
    global _SCHEMA_READY
    if _SCHEMA_READY:
        return

    _ensure_columns(cur, "invoices", _INVOICE_COLUMNS)
    _ensure_columns(cur, "quick_bills", _EINVOICE_HEADER_COLUMNS)
    _ensure_columns(cur, "quick_bills", _QUICK_BILL_EXTRA_COLUMNS)
    _ensure_columns(cur, "invoice_items", _LINE_TAX_COLUMNS)
    _ensure_columns(cur, "bill_items", _LINE_TAX_COLUMNS)

    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_invoice_items_hsn_code
        ON invoice_items (hsn_code)
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_invoices_einvoice_status
        ON invoices (einvoice_status)
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_quick_bills_einvoice_status
        ON quick_bills (einvoice_status)
        """
    )

    if conn is not None:
        conn.commit()
    _SCHEMA_READY = True
