-- Phase 5: e-Invoice on quick bills + customer context
ALTER TABLE quick_bills ADD COLUMN IF NOT EXISTS irn VARCHAR(64);
ALTER TABLE quick_bills ADD COLUMN IF NOT EXISTS ack_no VARCHAR(32);
ALTER TABLE quick_bills ADD COLUMN IF NOT EXISTS ack_date TIMESTAMPTZ;
ALTER TABLE quick_bills ADD COLUMN IF NOT EXISTS einvoice_status VARCHAR(32);
ALTER TABLE quick_bills ADD COLUMN IF NOT EXISTS signed_qr TEXT;
ALTER TABLE quick_bills ADD COLUMN IF NOT EXISTS customer_id VARCHAR(64);
ALTER TABLE quick_bills ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE quick_bills ADD COLUMN IF NOT EXISTS buyer_gstin VARCHAR(20);
ALTER TABLE quick_bills ADD COLUMN IF NOT EXISTS company_code VARCHAR(32);

CREATE INDEX IF NOT EXISTS idx_quick_bills_einvoice_status ON quick_bills (einvoice_status);
