-- WhiteBooks auth token cache (GST + e-Invoice profiles)

CREATE TABLE IF NOT EXISTS gst_auth_tokens (
    id                  SERIAL PRIMARY KEY,
    credential_profile  VARCHAR(20) NOT NULL,
    gstin               VARCHAR(15) NOT NULL,
    username            VARCHAR(128) NOT NULL,
    auth_token          TEXT NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    obtained_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    auth_mode           VARCHAR(32),
    response_json       JSONB,
    UNIQUE (credential_profile, gstin, username)
);

ALTER TABLE gst_auth_tokens
    ADD COLUMN IF NOT EXISTS response_json JSONB;

CREATE INDEX IF NOT EXISTS idx_gst_auth_tokens_expires
ON gst_auth_tokens (expires_at DESC);
