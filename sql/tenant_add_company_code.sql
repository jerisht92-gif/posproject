-- Phase 4: add tenant column to core tables (run once in Supabase/pgAdmin).
-- Backfill company_code from your company_information / users before strict isolation.

ALTER TABLE products ADD COLUMN IF NOT EXISTS company_code VARCHAR(32);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_code VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_code VARCHAR(32);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS company_code VARCHAR(32);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS company_code VARCHAR(32);

CREATE INDEX IF NOT EXISTS idx_products_company_code ON products (company_code);
CREATE INDEX IF NOT EXISTS idx_customers_company_code ON customers (company_code);
CREATE INDEX IF NOT EXISTS idx_users_company_code ON users (company_code);
CREATE INDEX IF NOT EXISTS idx_departments_company_code ON departments (company_code);
CREATE INDEX IF NOT EXISTS idx_roles_company_code ON roles (company_code);

-- Example backfill (replace YOURCODE):
-- UPDATE products SET company_code = 'YOURCODE' WHERE company_code IS NULL;
-- UPDATE customers SET company_code = 'YOURCODE' WHERE company_code IS NULL;
-- Backfill all users for each company (run per company or use JOIN):
-- UPDATE users u
-- SET company_code = ci.company_code
-- FROM company_information ci
-- WHERE LOWER(TRIM(u.company_name)) = LOWER(TRIM(ci.company_name))
--   AND (u.company_code IS NULL OR TRIM(u.company_code) = '' OR UPPER(u.company_code) = 'PENDING');
-- Multi-tenant: tag each company's rows (run per company; replace YOURCODE):
-- UPDATE departments SET company_code = 'YOURCODE'
-- WHERE company_code IS NULL OR TRIM(company_code) = '';
-- UPDATE roles SET company_code = 'YOURCODE'
-- WHERE company_code IS NULL OR TRIM(company_code) = '';
-- UPDATE users SET company_code = 'YOURCODE'
-- WHERE LOWER(TRIM(company_name)) = LOWER(TRIM('Your Company Name'))
--   AND (company_code IS NULL OR TRIM(company_code) = '' OR UPPER(company_code) = 'PENDING');
--
-- Or tag departments from users that share the same company_name:
-- UPDATE departments d SET company_code = u.company_code
-- FROM users u
-- WHERE (d.company_code IS NULL OR TRIM(d.company_code) = '')
--   AND LOWER(TRIM(u.company_name)) = LOWER(TRIM('Your Company Name Here'))
--   AND u.company_code IS NOT NULL AND TRIM(u.company_code) <> '' AND UPPER(u.company_code) <> 'PENDING';
