-- GST / WhiteBooks API request log (Phase 1)
CREATE TABLE IF NOT EXISTS gst_api_logs (
    id              SERIAL PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    company_code    VARCHAR(20),
    user_email      VARCHAR(255),
    api_path        VARCHAR(255) NOT NULL,
    http_method     VARCHAR(10) NOT NULL,
    request_url     TEXT,
    request_headers JSONB,
    request_body    JSONB,
    response_status INTEGER,
    response_body   JSONB,
    success         BOOLEAN NOT NULL DEFAULT FALSE,
    error_message   TEXT,
    duration_ms     INTEGER
);

CREATE INDEX IF NOT EXISTS idx_gst_api_logs_created_at ON gst_api_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gst_api_logs_api_path ON gst_api_logs (api_path);
