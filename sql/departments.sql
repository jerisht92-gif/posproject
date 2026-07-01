-- Departments master table (Stackly POS)
-- Run once in pgAdmin/psql on a fresh database, or let app startup create it via _ensure_departments_table.

CREATE TABLE IF NOT EXISTS departments (
    department_id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    branch VARCHAR(100),
    description TEXT,
    company_code VARCHAR(32)
);

CREATE INDEX IF NOT EXISTS idx_departments_company_code ON departments (company_code);

-- Per-company unique code and name (multi-tenant)
CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_company_code_code_unique
    ON departments (company_code, code)
    WHERE company_code IS NOT NULL AND TRIM(company_code) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_company_code_name_unique
    ON departments (company_code, name)
    WHERE company_code IS NOT NULL AND TRIM(company_code) <> '';

-- Example row:
-- INSERT INTO departments (code, name, branch, description, company_code)
-- VALUES ('P001', 'Purchase', 'main_branch', 'purchase depts', 'YOURCOMPANYCODE');
