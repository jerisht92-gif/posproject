-- HSN / SAC master codes (imported from HSN_SAC.xlsx)
CREATE TABLE IF NOT EXISTS hsn_code (
    id           SERIAL PRIMARY KEY,
    code         VARCHAR(20) NOT NULL,
    code_type    VARCHAR(3) NOT NULL CHECK (code_type IN ('HSN', 'SAC')),
    description  TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (code, code_type)
);

CREATE INDEX IF NOT EXISTS idx_hsn_code_code ON hsn_code (code);
CREATE INDEX IF NOT EXISTS idx_hsn_code_type_code ON hsn_code (code_type, code);
