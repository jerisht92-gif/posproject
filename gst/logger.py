"""Persist WhiteBooks GST API calls to PostgreSQL for audit and debugging."""

from __future__ import annotations

import json
from typing import Any

_SENSITIVE_KEYS = frozenset({
    "client_secret",
    "password",
    "auth-token",
    "auth_token",
    "authtoken",
    "otp",
})

_TABLE_READY = False


def _redact_value(key: str, value: Any) -> Any:
    key_l = (key or "").strip().lower().replace("_", "-")
    if key_l in _SENSITIVE_KEYS or "secret" in key_l or "password" in key_l:
        if value in (None, ""):
            return value
        s = str(value)
        if len(s) <= 8:
            return "***"
        return f"{s[:4]}...{s[-2:]}"
    return value


def _redact_mapping(data: dict[str, Any] | None) -> dict[str, Any] | None:
    if not data:
        return None
    out = {}
    for k, v in data.items():
        if isinstance(v, dict):
            out[k] = _redact_mapping(v)
        else:
            out[k] = _redact_value(k, v)
    return out


def ensure_gst_api_logs_table(cur) -> None:
    global _TABLE_READY
    if _TABLE_READY:
        return
    cur.execute(
        """
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
        )
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_gst_api_logs_created_at
        ON gst_api_logs (created_at DESC)
        """
    )
    _TABLE_READY = True


def _json_safe(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    return str(value)


def log_gst_api_call(
    *,
    api_path: str,
    http_method: str,
    request_url: str,
    request_headers: dict[str, Any] | None = None,
    request_body: Any = None,
    response_status: int | None = None,
    response_body: Any = None,
    success: bool = False,
    error_message: str | None = None,
    duration_ms: int | None = None,
    user_email: str | None = None,
    company_code: str | None = None,
) -> int | None:
    """Insert one API log row; returns log id or None if DB unavailable."""
    try:
        from app import get_db_connection

        conn = get_db_connection()
        cur = conn.cursor()
        try:
            ensure_gst_api_logs_table(cur)
            safe_headers = _redact_mapping(request_headers or {})
            safe_body = _redact_mapping(request_body) if isinstance(request_body, dict) else request_body
            safe_resp = _json_safe(response_body)
            cur.execute(
                """
                INSERT INTO gst_api_logs (
                    company_code, user_email, api_path, http_method, request_url,
                    request_headers, request_body, response_status, response_body,
                    success, error_message, duration_ms
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    (company_code or "").strip().upper() or None,
                    (user_email or "").strip().lower() or None,
                    (api_path or "")[:255],
                    (http_method or "GET").upper()[:10],
                    request_url,
                    json.dumps(safe_headers) if safe_headers is not None else None,
                    json.dumps(_json_safe(safe_body)) if safe_body is not None else None,
                    response_status,
                    json.dumps(safe_resp) if safe_resp is not None else None,
                    bool(success),
                    (error_message or "")[:2000] or None,
                    duration_ms,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return int(row[0]) if row else None
        finally:
            cur.close()
            conn.close()
    except Exception as ex:
        print(f"gst_api_logs write skipped: {ex}")
        return None


def fetch_recent_gst_api_logs(limit: int = 20) -> list[dict[str, Any]]:
    """Return recent GST API log rows (newest first)."""
    from app import get_db_connection
    from psycopg2.extras import RealDictCursor

    limit = max(1, min(int(limit or 20), 100))
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        ensure_gst_api_logs_table(cur)
        conn.commit()
        cur.execute(
            """
            SELECT id, created_at, company_code, user_email, api_path, http_method,
                   request_url, response_status, success, error_message, duration_ms
            FROM gst_api_logs
            ORDER BY created_at DESC, id DESC
            LIMIT %s
            """,
            (limit,),
        )
        return [dict(r) for r in (cur.fetchall() or [])]
    finally:
        cur.close()
        conn.close()
