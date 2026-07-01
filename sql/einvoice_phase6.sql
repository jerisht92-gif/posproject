-- Phase 6: e-Invoice cancel timestamp
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS irn_cancel_date TIMESTAMPTZ;
ALTER TABLE quick_bills ADD COLUMN IF NOT EXISTS irn_cancel_date TIMESTAMPTZ;
