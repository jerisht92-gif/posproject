"""Tenant-scoped RBAC reads (rbac/ package)."""
from __future__ import annotations

import json
from typing import Callable, Optional


def normalize_tenant_code(code: str | None) -> str:
    return (code or "").strip().upper()


def user_belongs_to_tenant(cur, user_id, tenant_code: str) -> bool:
    cc = normalize_tenant_code(tenant_code)
    if not user_id or not cc:
        return False
    cur.execute(
        """
        SELECT 1 FROM users
        WHERE user_id = %s
          AND UPPER(TRIM(COALESCE(company_code, ''))) = %s
        LIMIT 1
        """,
        (int(user_id), cc),
    )
    return cur.fetchone() is not None


def resolve_user_id_for_tenant(cur, email: str, tenant_code: str | None):
    email = (email or "").strip().lower()
    cc = normalize_tenant_code(tenant_code)
    if not email or not cc:
        return None
    cur.execute(
        """
        SELECT user_id FROM users
        WHERE LOWER(TRIM(email)) = %s
          AND UPPER(TRIM(COALESCE(company_code, ''))) = %s
        LIMIT 1
        """,
        (email, cc),
    )
    row = cur.fetchone()
    return int(row[0]) if row and row[0] is not None else None


def _table_has_column(cur, table_name: str, column_name: str) -> bool:
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


def _parse_stored_permissions_json(raw) -> Optional[dict]:
    if raw is None:
        return None
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except (TypeError, ValueError):
            return None
    return raw if isinstance(raw, dict) else None


def _stored_permissions_has_grants(raw: dict) -> bool:
    for perms in raw.values():
        if not isinstance(perms, dict):
            continue
        if any(
            perms.get(k)
            for k in ("full_access", "view", "create", "edit", "delete")
        ):
            return True
    return False


def _query_user_permissions_json(cur, user_id, *, tenant_code: str) -> Optional[dict]:
    del tenant_code
    if not user_id:
        return None
    if not _table_has_column(cur, "users", "user_permission"):
        return None
    cur.execute(
        """
        SELECT user_permission
        FROM users
        WHERE user_id = %s
          AND user_permission IS NOT NULL
        LIMIT 1
        """,
        (int(user_id),),
    )
    row = cur.fetchone()
    if not row:
        return None
    parsed = _parse_stored_permissions_json(row[0])
    if not parsed or not _stored_permissions_has_grants(parsed):
        return None
    return parsed


def fetch_user_permissions_for_tenant(
    cur,
    user_id,
    tenant_code: str | None,
    *,
    normalize: Optional[Callable[[dict], dict]] = None,
    allow_legacy_null: bool = True,
) -> Optional[dict]:
    del allow_legacy_null
    if not user_id:
        return None
    cc = normalize_tenant_code(tenant_code)
    if not cc:
        return None

    json_perms = _query_user_permissions_json(cur, user_id, tenant_code=cc)
    if json_perms is not None:
        return normalize(json_perms) if normalize else json_perms
    return None


def fetch_user_permissions_by_email_for_tenant(
    cur,
    email: str,
    tenant_code: str | None,
    *,
    normalize: Optional[Callable[[dict], dict]] = None,
    allow_legacy_null: bool = True,
) -> Optional[dict]:
    user_id = resolve_user_id_for_tenant(cur, email, tenant_code)
    if not user_id:
        return None
    return fetch_user_permissions_for_tenant(
        cur,
        user_id,
        tenant_code,
        normalize=normalize,
        allow_legacy_null=allow_legacy_null,
    )


rbac_user_belongs_to_tenant = user_belongs_to_tenant
