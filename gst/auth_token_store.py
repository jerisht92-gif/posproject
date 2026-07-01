"""Persist WhiteBooks GST / e-Invoice auth tokens in PostgreSQL."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any

_TABLE_READY = False
_REFRESH_BUFFER_SECONDS = 300


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _table_has_column(cur, table_name: str, column_name: str) -> bool:
    cur.execute(
        """
        SELECT 1 FROM information_schema.columns
        WHERE table_name = %s AND column_name = %s
        LIMIT 1
        """,
        (table_name, column_name),
    )
    return cur.fetchone() is not None


def ensure_gst_auth_tokens_table(cur) -> None:
    global _TABLE_READY
    if _TABLE_READY:
        return
    cur.execute(
        """
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
        )
        """
    )
    if not _table_has_column(cur, "gst_auth_tokens", "response_json"):
        cur.execute(
            "ALTER TABLE gst_auth_tokens ADD COLUMN IF NOT EXISTS response_json JSONB"
        )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_gst_auth_tokens_expires
        ON gst_auth_tokens (expires_at DESC)
        """
    )
    _TABLE_READY = True


def is_token_valid(
    expires_at: datetime | None,
    *,
    buffer_seconds: int = _REFRESH_BUFFER_SECONDS,
) -> bool:
    exp = _as_utc(expires_at)
    if exp is None:
        return False
    return exp > _now_utc() + timedelta(seconds=buffer_seconds)


def load_auth_token(
    *,
    profile: str,
    gstin: str,
    username: str,
) -> dict[str, Any] | None:
    """Load a stored token row if present (caller checks expiry)."""
    profile_key = (profile or "").strip().lower()
    gstin_key = (gstin or "").strip().upper()
    user_key = (username or "").strip()
    if not profile_key or not gstin_key or not user_key:
        return None

    try:
        from app import get_db_connection
    except ImportError:
        return None

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            ensure_gst_auth_tokens_table(cur)
            has_json = _table_has_column(cur, "gst_auth_tokens", "response_json")
            if has_json:
                cur.execute(
                    """
                    SELECT auth_token, expires_at, obtained_at, updated_at,
                           auth_mode, response_json
                    FROM gst_auth_tokens
                    WHERE credential_profile = %s
                      AND gstin = %s
                      AND username = %s
                    LIMIT 1
                    """,
                    (profile_key, gstin_key, user_key),
                )
            else:
                cur.execute(
                    """
                    SELECT auth_token, expires_at, obtained_at, updated_at, auth_mode
                    FROM gst_auth_tokens
                    WHERE credential_profile = %s
                      AND gstin = %s
                      AND username = %s
                    LIMIT 1
                    """,
                    (profile_key, gstin_key, user_key),
                )
            row = cur.fetchone()
        conn.commit()
    except Exception:
        conn.rollback()
        return None
    finally:
        conn.close()

    if not row:
        return None

    response_json = None
    if len(row) > 5 and row[5] is not None:
        response_json = row[5] if isinstance(row[5], dict) else None
        if response_json is None and row[5]:
            try:
                response_json = json.loads(row[5]) if isinstance(row[5], str) else row[5]
            except (TypeError, ValueError, json.JSONDecodeError):
                response_json = None

    return {
        "auth_token": row[0],
        "expires_at": _as_utc(row[1]),
        "obtained_at": _as_utc(row[2]),
        "updated_at": _as_utc(row[3]),
        "auth_mode": row[4],
        "response_json": response_json,
        "credential_profile": profile_key,
        "gstin": gstin_key,
        "username": user_key,
    }


def save_auth_token(
    *,
    profile: str,
    gstin: str,
    username: str,
    auth_token: str,
    expires_at: datetime,
    auth_mode: str | None = None,
    response_json: dict[str, Any] | None = None,
) -> None:
    """Upsert auth token for a credential profile + GSTIN + username."""
    profile_key = (profile or "").strip().lower()
    gstin_key = (gstin or "").strip().upper()
    user_key = (username or "").strip()
    token = (auth_token or "").strip()
    if not profile_key or not gstin_key or not user_key or not token:
        return

    exp = _as_utc(expires_at) or (_now_utc() + timedelta(hours=1))
    json_payload = json.dumps(response_json) if isinstance(response_json, dict) else None

    try:
        from app import get_db_connection
    except ImportError:
        return

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            ensure_gst_auth_tokens_table(cur)
            has_json = _table_has_column(cur, "gst_auth_tokens", "response_json")
            if has_json:
                cur.execute(
                    """
                    INSERT INTO gst_auth_tokens (
                        credential_profile, gstin, username, auth_token,
                        expires_at, obtained_at, updated_at, auth_mode, response_json
                    )
                    VALUES (%s, %s, %s, %s, %s, NOW(), NOW(), %s, %s::jsonb)
                    ON CONFLICT (credential_profile, gstin, username)
                    DO UPDATE SET
                        auth_token = EXCLUDED.auth_token,
                        expires_at = EXCLUDED.expires_at,
                        updated_at = NOW(),
                        auth_mode = EXCLUDED.auth_mode,
                        response_json = EXCLUDED.response_json
                    """,
                    (
                        profile_key,
                        gstin_key,
                        user_key,
                        token,
                        exp,
                        auth_mode,
                        json_payload,
                    ),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO gst_auth_tokens (
                        credential_profile, gstin, username, auth_token,
                        expires_at, obtained_at, updated_at, auth_mode
                    )
                    VALUES (%s, %s, %s, %s, %s, NOW(), NOW(), %s)
                    ON CONFLICT (credential_profile, gstin, username)
                    DO UPDATE SET
                        auth_token = EXCLUDED.auth_token,
                        expires_at = EXCLUDED.expires_at,
                        updated_at = NOW(),
                        auth_mode = EXCLUDED.auth_mode
                    """,
                    (profile_key, gstin_key, user_key, token, exp, auth_mode),
                )
        conn.commit()
    except Exception:
        conn.rollback()
    finally:
        conn.close()


def delete_auth_token(*, profile: str, gstin: str, username: str) -> None:
    """Remove stored token (e.g. on force refresh)."""
    profile_key = (profile or "").strip().lower()
    gstin_key = (gstin or "").strip().upper()
    user_key = (username or "").strip()
    if not profile_key or not gstin_key or not user_key:
        return

    try:
        from app import get_db_connection
    except ImportError:
        return

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            ensure_gst_auth_tokens_table(cur)
            cur.execute(
                """
                DELETE FROM gst_auth_tokens
                WHERE credential_profile = %s AND gstin = %s AND username = %s
                """,
                (profile_key, gstin_key, user_key),
            )
        conn.commit()
    except Exception:
        conn.rollback()
    finally:
        conn.close()
