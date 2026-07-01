"""Session and database permission resolution, checks, and decorators."""
from __future__ import annotations

from functools import wraps

from flask import abort, g, jsonify, redirect, request, session, url_for

from rbac.constants import (
    RBAC_DEFAULT_DEPARTMENT,
    RBAC_MODULE_LABELS,
    RBAC_MODULES,
    RBAC_PATH_PREFIX_RULES,
    RBAC_PATH_SHARED_ANY,
    RBAC_ROUTE_SKIP_ENDPOINTS,
    RBAC_ROUTE_SKIP_PREFIXES,
    RBAC_SUPER_ADMIN_ONLY_MODULES,
    _enforce_view_required,
    _merge_rbac_permission_dict,
    _normalize_rbac_module_key,
    _rbac_empty_perm,
    _rbac_full_perm,
    _rbac_module_for_endpoint,
    _rbac_permissions_for_policy,
    rbac_action_from_http,
    rbac_permission_targets_for_key,
)
from rbac.tenant import (
    fetch_user_permissions_for_tenant,
    normalize_tenant_code,
)


RBAC_PERMISSIONS_OWNER_KEY = "_rbac_permissions_user_id"


def clear_auth_session():
    """Wipe session on logout so the next user cannot inherit role/permissions."""
    session.clear()


def normalize_role(role: str) -> str:
    return (role or "").strip().lower().replace(" ", "").replace("_", "")


def _app():
    """Late import to avoid circular dependency with app.py."""
    import app as flask_app

    return flask_app


def normalize_menu_permissions(raw):
    """Normalize roles.json permission block (nested or flat checkbox keys)."""
    if not isinstance(raw, dict):
        return _rbac_empty_perm()
    if any(k in raw for k in ("full_access", "view", "create", "edit", "delete")):
        return _enforce_view_required({
            "full_access": bool(raw.get("full_access")),
            "view": bool(raw.get("view")),
            "create": bool(raw.get("create")),
            "edit": bool(raw.get("edit")),
            "delete": bool(raw.get("delete")),
        })
    fa = fv = fc = fe = fd = False
    for k, v in raw.items():
        if not v:
            continue
        ks = str(k).lower()
        if ks.endswith("_full") or ks == "full_access":
            fa = True
        elif ks.endswith("_view"):
            fv = True
        elif ks.endswith("_create"):
            fc = True
        elif ks.endswith("_edit"):
            fe = True
        elif ks.endswith("_delete"):
            fd = True
    if fa:
        return _rbac_full_perm()
    return _enforce_view_required(
        {"full_access": False, "view": fv, "create": fc, "edit": fe, "delete": fd}
    )


def _normalize_user_permissions_payload(raw):
    """Normalize stored/API permissions to RBAC_MODULES keys."""
    out = {m: _rbac_empty_perm() for m in RBAC_MODULES}
    if not isinstance(raw, dict):
        return out
    for key, perm_block in raw.items():
        targets = rbac_permission_targets_for_key(key)
        if not targets:
            continue
        merged = normalize_menu_permissions(perm_block)
        for canon in targets:
            out[canon] = _merge_rbac_permission_dict(out[canon], merged)
    for canon in out:
        out[canon] = _enforce_view_required(out[canon])
    return out


def _permissions_dict_from_role_map(role_map):
    return _normalize_user_permissions_payload(role_map)


def resolve_tenant_code_for_user(cur, user_id, session_company_code=None):
    cc = normalize_tenant_code(session_company_code)
    if cc:
        return cc
    cur.execute(
        """
        SELECT UPPER(TRIM(company_code))
        FROM users
        WHERE user_id = %s
        LIMIT 1
        """,
        (int(user_id),),
    )
    row = cur.fetchone()
    return normalize_tenant_code(row[0] if row else "")


def _fetch_user_permission_rows(cur, user_id, tenant_code=None):
    """Return per-user permissions dict from users.user_permission JSON."""
    if not user_id:
        return None
    _app()._ensure_rbac_permission_tables(cur, migrate=False)
    if tenant_code is None:
        tenant_code = resolve_tenant_code_for_user(
            cur, user_id, session.get("company_code")
        )
    return fetch_user_permissions_for_tenant(
        cur,
        int(user_id),
        tenant_code,
        normalize=_normalize_user_permissions_payload,
    )


def _apply_rbac_global_defaults(perms_dict):
    """Permissions every logged-in user gets (e.g. company_information view)."""
    out = {
        m: _enforce_view_required(perms_dict.get(m) or _rbac_empty_perm())
        for m in RBAC_MODULES
    }
    ci = out["company_information"]
    if not ci.get("full_access"):
        ci["view"] = True
    out["company_information"] = ci
    return out


def _role_permissions_for_profile(prof: dict) -> dict:
    """Role-based permissions before any per-user override."""
    empty = {m: _rbac_empty_perm() for m in RBAC_MODULES}
    if not prof:
        return empty

    rn = normalize_role(prof.get("role") or "")
    if rn == "admin":
        return _rbac_permissions_for_policy("admin")

    from signup_tenant import is_dummy_company_code

    tenant_code = (session.get("company_code") or "").strip().upper()
    roles = _app()._tenant_roles_cached(
        tenant_code if tenant_code and not is_dummy_company_code(tenant_code) else None
    )
    dept = (prof.get("department") or "").strip().lower()
    branch = (prof.get("branch") or "Main Branch").strip().lower()
    role_name = (prof.get("role") or "").strip().lower()
    matched = None
    for r in roles:
        if not isinstance(r, dict):
            continue
        rd = (r.get("department") or "").strip().lower()
        rb = (r.get("branch") or "").strip().lower()
        rr = (r.get("role") or "").strip().lower()
        if rd == dept and rb == branch and rr == role_name:
            matched = r
            break

    if not matched and role_name:
        for r in roles:
            if not isinstance(r, dict):
                continue
            rd = (r.get("department") or "").strip().lower()
            rr = (r.get("role") or "").strip().lower()
            if rd == RBAC_DEFAULT_DEPARTMENT.lower() and rr == role_name:
                matched = r
                break

    perms = (matched or {}).get("permissions") or {}
    return _normalize_user_permissions_payload(perms)


def rbac_superadmin_unrestricted(perms) -> bool:
    """True when Super Admin has no customized user_permission limits."""
    if not isinstance(perms, dict):
        return False
    return bool(perms.get("is_super_admin")) and not bool(perms.get("has_custom_permissions"))


def rbac_page_can_for_ui(perms, module_key=None, check_modules=None):
    """Page-level {view, create, edit, delete} for rbacPageCanData + UI guards."""
    check_modules = tuple(check_modules or ())
    base = {
        "is_super_admin": bool((perms or {}).get("is_super_admin")),
        "has_custom_permissions": bool((perms or {}).get("has_custom_permissions")),
        "unrestricted": rbac_superadmin_unrestricted(perms),
    }
    if base["unrestricted"]:
        base.update(
            view=True,
            create=True,
            edit=True,
            delete=True,
            comment_add=True,
        )
        return base
    if not module_key and not check_modules:
        base.update(view=True, comment_add=False)
        return base
    for action in ("view", "create", "edit", "delete"):
        if len(check_modules) > 1:
            base[action] = rbac_can_any(*check_modules, action=action, perms=perms)
        elif module_key:
            base[action] = rbac_can(module_key, action, perms=perms)
    base["comment_add"] = bool(base.get("create")) or bool(base.get("edit"))
    return base


def _effective_permissions_dict(
    cur,
    user_id,
    role=None,
    department=None,
    branch=None,
    stored=None,
    tenant_code=None,
):
    """Build {module_key: perm_dict} for session cache."""
    rn = normalize_role(role or "")
    if rn == "superadmin":
        if stored is None:
            if tenant_code is None and user_id:
                tenant_code = resolve_tenant_code_for_user(
                    cur, user_id, session.get("company_code")
                )
            if user_id:
                stored = _fetch_user_permission_rows(cur, int(user_id), tenant_code)
        if stored is not None:
            return _apply_rbac_global_defaults(stored)
        return {m: _rbac_full_perm() for m in RBAC_MODULES}

    if stored is None:
        if tenant_code is None:
            tenant_code = resolve_tenant_code_for_user(
                cur, user_id, session.get("company_code")
            )
        stored = _fetch_user_permission_rows(cur, int(user_id), tenant_code)

    if stored is not None:
        return _apply_rbac_global_defaults(stored)

    if rn == "admin":
        policy = _rbac_permissions_for_policy("admin")
        return _apply_rbac_global_defaults(
            {m: policy.get(m) or _rbac_empty_perm() for m in RBAC_MODULES}
        )

    prof = {
        "role": role or "",
        "department": department or "",
        "branch": (branch or "").strip() or "Main Branch",
    }
    role_perms = _role_permissions_for_profile(prof)
    any_role_grant = any(
        p.get("full_access") or p.get("view") or p.get("create") or p.get("edit") or p.get("delete")
        for p in role_perms.values()
    )
    if any_role_grant:
        return _apply_rbac_global_defaults(role_perms)
    return _apply_rbac_global_defaults(_rbac_permissions_for_policy("user"))


def _load_session_permissions(cur, user_id):
    """Load effective permissions into session after login."""
    _app()._ensure_rbac_permission_tables(cur, migrate=False)
    session["user_id"] = int(user_id)
    tenant_code = resolve_tenant_code_for_user(
        cur, user_id, session.get("company_code")
    )
    stored = _fetch_user_permission_rows(cur, int(user_id), tenant_code)
    session["has_custom_permissions"] = stored is not None
    session["permissions"] = _effective_permissions_dict(
        cur,
        user_id,
        role=session.get("role"),
        department=session.get("department"),
        branch=session.get("branch"),
        stored=stored,
        tenant_code=tenant_code,
    )
    session[RBAC_PERMISSIONS_OWNER_KEY] = int(user_id)
    try:
        _app()._invalidate_request_auth_cache()
    except Exception:
        pass


def _ensure_session_permissions_owner():
    """Reload permissions when session user_id and stored matrix owner diverge."""
    uid = session.get("user_id")
    if not uid or not session.get("user"):
        return
    owner = session.get(RBAC_PERMISSIONS_OWNER_KEY)
    if owner == uid:
        return
    if getattr(g, "_rbac_reloading_perms", False):
        return
    g._rbac_reloading_perms = True
    try:
        _app()._ensure_logged_in_user_context(reload_permissions=True)
    finally:
        g._rbac_reloading_perms = False
    if hasattr(g, "_effective_permissions"):
        delattr(g, "_effective_permissions")


def _refresh_session_permissions_if_current(user_id, cur=None):
    """Refresh cached session permissions after grant/save for the logged-in user."""
    if not session.get("user"):
        return
    session_uid = session.get("user_id")
    if session_uid is None:
        return
    if int(session_uid) != int(user_id):
        return
    own_conn = cur is None
    if own_conn:
        conn = _app().get_db_connection()
        cur = conn.cursor()
    try:
        _load_session_permissions(cur, int(user_id))
        _app()._invalidate_request_auth_cache()
    finally:
        if own_conn:
            cur.close()
            conn.close()


def _super_admin_json_denied():
    """403 JSON if current user is not Super Admin."""
    prof = _app().get_current_user_profile() or {}
    if normalize_role(prof.get("role")) == "superadmin":
        return None
    return jsonify({
        "success": False,
        "message": "Only Super Admin can manage user permissions.",
    }), 403


def _get_user_permissions_from_db(email: str):
    """Per-user permission matrix from users.user_permission JSON; None if not customized."""
    email = (email or "").strip()
    if not email:
        return None

    conn = _app().get_db_connection()
    cur = conn.cursor()
    try:
        _app()._ensure_rbac_permission_tables(cur, migrate=False)
        cur.execute(
            "SELECT user_id FROM users WHERE LOWER(email) = LOWER(%s) LIMIT 1",
            (email,),
        )
        row = cur.fetchone()
        if not row:
            return None
        tenant_code = resolve_tenant_code_for_user(
            cur, row[0], session.get("company_code")
        )
        return _fetch_user_permission_rows(cur, row[0], tenant_code)
    except Exception:
        return None
    finally:
        cur.close()
        conn.close()


def get_effective_permissions_for_session(*, fresh=False):
    """Effective permissions: Super Admin full; others use per-user limits or role defaults.

    When fresh=True (permission APIs), always read from the database instead of
    reusing session-stored permission JSON.
    """
    if not fresh and hasattr(g, "_effective_permissions"):
        return g._effective_permissions

    empty = {m: _rbac_empty_perm() for m in RBAC_MODULES}
    if not session.get("user"):
        g._effective_permissions = {"is_platform_admin": False, "is_super_admin": False, **empty}
        return g._effective_permissions

    _ensure_session_permissions_owner()

    prof = _app().get_current_user_profile()
    if not prof:
        g._effective_permissions = {"is_platform_admin": False, "is_super_admin": False, **empty}
        return g._effective_permissions

    rn = normalize_role(prof.get("role") or "")
    if rn == "superadmin":
        has_custom = False
        session_perms = None
        if not fresh:
            has_custom = bool(session.get("has_custom_permissions"))
            session_perms = session.get("permissions")
        else:
            user_perms = _get_user_permissions_from_db(prof.get("email"))
            if user_perms is not None:
                has_custom = True
                session_perms = user_perms
        if has_custom and isinstance(session_perms, dict):
            out = {
                "is_platform_admin": True,
                "is_super_admin": True,
                "has_custom_permissions": True,
            }
            merged = _apply_rbac_global_defaults(session_perms)
            for m in RBAC_MODULES:
                out[m] = merged.get(m) or _rbac_empty_perm()
            g._effective_permissions = out
            return g._effective_permissions
        full = _rbac_permissions_for_policy("super_admin")
        full["is_platform_admin"] = True
        full["is_super_admin"] = True
        full["has_custom_permissions"] = False
        g._effective_permissions = full
        return g._effective_permissions

    if not fresh:
        session_perms = session.get("permissions")
        if isinstance(session_perms, dict) and session.get("user_id"):
            has_custom = bool(session.get("has_custom_permissions"))
            out = {
                "is_platform_admin": rn == "admin" and not has_custom,
                "is_super_admin": False,
                "has_custom_permissions": has_custom,
            }
            merged = _apply_rbac_global_defaults(session_perms)
            for m in RBAC_MODULES:
                out[m] = merged.get(m) or _rbac_empty_perm()
            g._effective_permissions = out
            return g._effective_permissions

    user_perms = _get_user_permissions_from_db(prof.get("email"))
    if user_perms is not None:
        session["permissions"] = user_perms
        session["has_custom_permissions"] = True
        out = {
            "is_platform_admin": False,
            "is_super_admin": False,
            "has_custom_permissions": True,
        }
        for m in RBAC_MODULES:
            out[m] = user_perms.get(m) or _rbac_empty_perm()
        g._effective_permissions = out
        return g._effective_permissions

    if rn == "admin":
        admin_perms = _rbac_permissions_for_policy("admin")
        admin_perms["is_platform_admin"] = True
        admin_perms["is_super_admin"] = False
        admin_perms["has_custom_permissions"] = False
        g._effective_permissions = admin_perms
        return g._effective_permissions

    role_perms = _role_permissions_for_profile(prof)
    out = {"is_platform_admin": False, "is_super_admin": False, "has_custom_permissions": False}
    for m in RBAC_MODULES:
        out[m] = role_perms.get(m) or _rbac_empty_perm()
    g._effective_permissions = out
    return g._effective_permissions


def _mod_allows_action(mod, action):
    mod = mod or {}
    if mod.get("full_access"):
        return True
    if action != "view" and not mod.get("view"):
        return False
    if action == "comment_add":
        return bool(mod.get("create") or mod.get("edit"))
    return bool(mod.get(action))


def rbac_can(module_key, action="view", perms=None):
    """True if session user may perform action on module."""
    module_key = _normalize_rbac_module_key(module_key)
    if module_key == "company_information" and action == "view":
        return True
    if perms is None and hasattr(g, "_effective_permissions"):
        perms = g._effective_permissions
    p = perms if perms is not None else get_effective_permissions_for_session()
    if rbac_superadmin_unrestricted(p):
        return True
    if action == "comment_add":
        return rbac_can(module_key, "create", perms=p) or rbac_can(module_key, "edit", perms=p)
    if p.get("is_super_admin"):
        return _mod_allows_action(p.get(module_key), action)
    if (
        p.get("is_platform_admin")
        and not p.get("has_custom_permissions")
        and module_key not in RBAC_SUPER_ADMIN_ONLY_MODULES
    ):
        return True
    mod = p.get(module_key) or {}
    return _mod_allows_action(mod, action)


def rbac_can_any(*module_keys, action="view", perms=None):
    return any(rbac_can(m, action, perms) for m in module_keys)


def has_permission(user_id, module_key, action="view"):
    """Check user_permission (or role fallback) for a specific user_id."""
    module_key = _normalize_rbac_module_key(module_key)
    if not user_id or module_key not in RBAC_MODULES:
        return False
    conn = _app().get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT email, role, available_branches, department
            FROM users
            WHERE user_id = %s
            LIMIT 1
            """,
            (int(user_id),),
        )
        row = cur.fetchone()
        if not row:
            return False
        _email, role, branch, department = row
        if normalize_role(role) == "superadmin":
            tenant_code = resolve_tenant_code_for_user(cur, int(user_id), session.get("company_code"))
            stored = _fetch_user_permission_rows(cur, int(user_id), tenant_code)
            if stored is None:
                return True
            mod = stored.get(module_key) or _rbac_empty_perm()
            return _mod_allows_action(mod, action)
        tenant_code = resolve_tenant_code_for_user(cur, int(user_id), session.get("company_code"))
        stored = _fetch_user_permission_rows(cur, int(user_id), tenant_code)
        if stored is not None:
            mod = stored.get(module_key) or _rbac_empty_perm()
        elif normalize_role(role) == "admin":
            mod = _rbac_permissions_for_policy("admin").get(module_key) or _rbac_empty_perm()
        else:
            prof = {
                "role": role,
                "department": department,
                "branch": (branch or "").strip() or "Main Branch",
            }
            mod = _role_permissions_for_profile(prof).get(module_key) or _rbac_empty_perm()
        return _mod_allows_action(mod, action)
    except Exception:
        return False
    finally:
        cur.close()
        conn.close()


def _check_session_permission(module_key, action="view"):
    """True if session permissions allow action on module."""
    if not session.get("user"):
        return False
    perms = get_effective_permissions_for_session()
    if rbac_superadmin_unrestricted(perms):
        return True
    targets = rbac_permission_targets_for_key(module_key)
    if not targets:
        canon = _normalize_rbac_module_key(module_key)
        if canon == "company_information" and (action == "view" or session.get("needs_company_setup")):
            return True
        if canon in RBAC_MODULES:
            return rbac_can(canon, action)
        return False
    if len(targets) == 1 and targets[0] == "company_information":
        if action == "view" or session.get("needs_company_setup"):
            return True
    if len(targets) == 1:
        return rbac_can(targets[0], action)
    return rbac_can_any(*targets, action=action)


def has_permission_for_session(module_key, action="view"):
    """Session-scoped permission check."""
    if not session.get("user"):
        return False
    return _check_session_permission(module_key, action)


def _rbac_action_from_request():
    """Map HTTP method / path to permission action (create / edit / delete / view)."""
    return rbac_action_from_http(
        request.method,
        request.path,
        query_args=request.args,
    )


def _rbac_module_for_path(path):
    """Resolve RBAC module from request path."""
    path = path or ""
    path_norm = path.rstrip("/") or "/"
    path_lower = path_norm.lower()
    for shared_prefix, modules in RBAC_PATH_SHARED_ANY.items():
        if path_lower.startswith(shared_prefix.lower()):
            return ("__shared__", modules)
    for prefix, module_key in RBAC_PATH_PREFIX_RULES:
        if path_lower.startswith(prefix.lower()):
            return (module_key, None)
    ep = request.endpoint
    module_key = _rbac_module_for_endpoint(ep)
    if module_key:
        return (module_key, None)
    return (None, None)


def rbac_denied_response(module_key, action="view"):
    label = RBAC_MODULE_LABELS.get(module_key, module_key)
    action_labels = {
        "view": "view",
        "create": "create",
        "edit": "edit",
        "delete": "delete",
    }
    action_label = action_labels.get(action, action)
    message = f"You do not have permission to {action_label} {label}."
    if _app().wants_json() or request.is_json:
        return jsonify({"success": False, "message": message}), 403
    session["access_denied_message"] = message
    if _app()._restricted_to_company_info_only():
        return redirect(url_for("company_info"))
    return redirect(url_for("dashboard"))


def permission_required(module, action=None):
    """Decorator: enforce session permissions (loaded at login)."""

    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            act = action or _rbac_action_from_request()
            if not _check_session_permission(module, act):
                canon = _normalize_rbac_module_key(module)
                label = RBAC_MODULE_LABELS.get(canon, canon)
                session["access_denied_message"] = (
                    f"You do not have permission to {act} {label}."
                )
                abort(403)
            return f(*args, **kwargs)

        return wrapper

    return decorator


def require_permission(module_key, action=None):
    """Decorator: enforce permissions with friendly redirect/JSON response."""

    def decorator(view_func):
        @wraps(view_func)
        def wrapped(*args, **kwargs):
            act = action or _rbac_action_from_request()
            canon = _normalize_rbac_module_key(module_key)
            if not _check_session_permission(module_key, act):
                return rbac_denied_response(canon, act)
            return view_func(*args, **kwargs)

        return wrapped

    return decorator


def enforce_rbac_module_access():
    """Enforce user_permission on all module routes (before_request handler)."""
    if not session.get("user"):
        return None
    path = request.path or ""
    for prefix in RBAC_ROUTE_SKIP_PREFIXES:
        if path.startswith(prefix):
            return None
    if request.endpoint in RBAC_ROUTE_SKIP_ENDPOINTS:
        return None

    module_key, shared_modules = _rbac_module_for_path(path)
    if not module_key:
        return None

    action = _rbac_action_from_request()

    if module_key == "__shared__":
        if rbac_can_any(*shared_modules, action=action):
            return None
        return rbac_denied_response(shared_modules[0], action)

    if module_key == "company_information" and (action == "view" or session.get("needs_company_setup")):
        return None

    if has_permission_for_session(module_key, action):
        return None

    return rbac_denied_response(module_key, action)


PERMISSION_NO_CACHE_VALUE = "no-cache, no-store, must-revalidate, max-age=0, private"

PERMISSION_API_PATH_MARKERS = (
    "/api/session/permissions",
    "/api/permissions/",
    "/api/users/",
    "/api/user-permissions",
)


def is_permission_api_path(path: str | None) -> bool:
    """True for user/role permission JSON endpoints (must not be cached)."""
    p = (path or "").lower().rstrip("/") or "/"
    if p == "/api/session/permissions":
        return True
    if p.startswith("/api/permissions/"):
        return True
    if p.startswith("/api/user-permissions"):
        return True
    if p.startswith("/api/users/") and "/permissions" in p:
        return True
    return False


def apply_permission_no_cache(resp):
    """Set cache headers so browsers/proxies always fetch fresh permission data."""
    resp.headers["Cache-Control"] = PERMISSION_NO_CACHE_VALUE
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    resp.headers["Vary"] = "Cookie"
    return resp


def permission_jsonify(payload, status=200):
    """JSON response for permission APIs with no-cache headers."""
    resp = jsonify(payload)
    resp.status_code = int(status)
    return apply_permission_no_cache(resp)


def register_permission_cache_headers(flask_app):
    """Attach after_request hook: permission user/role APIs are never cached."""

    @flask_app.after_request
    def _permission_api_no_cache(resp):
        if is_permission_api_path(request.path):
            apply_permission_no_cache(resp)
        return resp

    return flask_app
