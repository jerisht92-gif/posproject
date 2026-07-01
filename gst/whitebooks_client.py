"""
WhiteBooks GST API client — Phase 0: configuration, authentication, token cache.

Credentials and base URL come from .env (see WHITEBOOKS_* variables).
"""

from __future__ import annotations

import os
import re
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Any
import requests

from gst.logger import log_gst_api_call

_PRIVATE_IP_RE = re.compile(
    r"^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|localhost)",
    re.IGNORECASE,
)


def _resolve_whitebooks_ip(raw: str) -> str:
    """Use first IP when comma-separated; prefer a non-private address if listed."""
    parts = [p.strip() for p in (raw or "").split(",") if p.strip()]
    if not parts:
        return "127.0.0.1"
    public = [p for p in parts if not _PRIVATE_IP_RE.match(p)]
    return public[0] if public else parts[0]


class WhiteBooksAuthError(Exception):
    """Raised when authentication fails or the API is unreachable."""

    def __init__(self, message: str, *, code: str | None = None, response: dict | None = None):
        super().__init__(message)
        self.code = code
        self.response = response or {}


class WhiteBooksApiError(Exception):
    """Raised when a WhiteBooks GST API call fails."""

    def __init__(
        self,
        message: str,
        *,
        http_status: int | None = None,
        status_cd: str | None = None,
        response: dict | None = None,
        log_id: int | None = None,
    ):
        super().__init__(message)
        self.http_status = http_status
        self.status_cd = status_cd
        self.response = response or {}
        self.log_id = log_id


class WhiteBooksConfig:
    """Load WhiteBooks settings from environment."""

    def __init__(self):
        self.env = (os.getenv("WHITEBOOKS_ENV") or "sandbox").strip().lower()
        default_base = (
            "https://apisandbox.whitebooks.in"
            if self.env == "sandbox"
            else "https://api.whitebooks.in"
        )
        self.base_url = (os.getenv("WHITEBOOKS_BASE_URL") or default_base).rstrip("/")
        default_auth = (
            "/authentication/authtoken"
            if self.env == "sandbox"
            else "/gst/v1.0/authenticate"
        )
        self.auth_path = (os.getenv("WHITEBOOKS_AUTH_PATH") or default_auth).strip()
        if not self.auth_path.startswith("/"):
            self.auth_path = "/" + self.auth_path

        self.client_id = (os.getenv("WHITEBOOKS_CLIENT_ID") or "").strip()
        self.client_secret = (os.getenv("WHITEBOOKS_CLIENT_SECRET") or "").strip()
        self.gst_username = (os.getenv("WHITEBOOKS_GST_USERNAME") or "").strip()
        self.gstin = (os.getenv("WHITEBOOKS_GSTIN") or "").strip().upper()
        self.password = os.getenv("WHITEBOOKS_GST_PASSWORD") or ""
        self.email = (
            (os.getenv("WHITEBOOKS_EMAIL") or os.getenv("EMAIL_ADDRESS") or "").strip()
        )
        self.ip_address = _resolve_whitebooks_ip(os.getenv("WHITEBOOKS_IP_ADDRESS") or "127.0.0.1")
        self.sandbox_otp = (os.getenv("WHITEBOOKS_SANDBOX_OTP") or "575757").strip()
        self.state_cd = (os.getenv("WHITEBOOKS_STATE_CD") or "").strip()
        if not self.state_cd and self.gstin and len(self.gstin) >= 2:
            self.state_cd = self.gstin[:2]
        self.timeout = max(5, int(os.getenv("WHITEBOOKS_TIMEOUT") or 30))
        # Sandbox GST token ~1 hour; e-Invoice portal token ~6 hours.
        self.token_ttl_seconds = max(60, int(os.getenv("WHITEBOOKS_TOKEN_TTL_SECONDS") or 3300))
        self.einvoice_token_ttl_seconds = max(
            60, int(os.getenv("WHITEBOOKS_EINVOICE_TOKEN_TTL_SECONDS") or 21600)
        )
        default_einvoice_generate = "/einvoice/type/GENERATE/version/V1_03"
        self.einvoice_generate_path = (
            os.getenv("WHITEBOOKS_EINVOICE_GENERATE_PATH") or default_einvoice_generate
        ).strip()
        if not self.einvoice_generate_path.startswith("/"):
            self.einvoice_generate_path = "/" + self.einvoice_generate_path
        default_einvoice_cancel = "/einvoice/type/CANCEL/version/V1_03"
        self.einvoice_cancel_path = (
            os.getenv("WHITEBOOKS_EINVOICE_CANCEL_PATH") or default_einvoice_cancel
        ).strip()
        if not self.einvoice_cancel_path.startswith("/"):
            self.einvoice_cancel_path = "/" + self.einvoice_cancel_path
        default_einvoice_getirn = "/einvoice/type/GETIRN/version/V1_03"
        self.einvoice_getirn_path = (
            os.getenv("WHITEBOOKS_EINVOICE_GETIRN_PATH") or default_einvoice_getirn
        ).strip()
        if not self.einvoice_getirn_path.startswith("/"):
            self.einvoice_getirn_path = "/" + self.einvoice_getirn_path
        default_einvoice_getirn_by_doc = "/einvoice/type/GETIRNBYDOCDETAILS/version/V1_03"
        self.einvoice_getirn_by_doc_path = (
            os.getenv("WHITEBOOKS_EINVOICE_GETIRNBYDOCDETAILS_PATH")
            or default_einvoice_getirn_by_doc
        ).strip()
        if not self.einvoice_getirn_by_doc_path.startswith("/"):
            self.einvoice_getirn_by_doc_path = "/" + self.einvoice_getirn_by_doc_path

        # e-Invoice uses separate portal credentials (EINS* prefix), not GST (GSTS*).
        self.einvoice_client_id = (
            os.getenv("WHITEBOOKS_EINVOICE_CLIENT_ID") or ""
        ).strip()
        self.einvoice_client_secret = (
            os.getenv("WHITEBOOKS_EINVOICE_CLIENT_SECRET") or ""
        ).strip()
        self.einvoice_username = (
            os.getenv("WHITEBOOKS_EINVOICE_USERNAME")
            or os.getenv("WHITEBOOKS_EINVOICE_GST_USERNAME")
            or ""
        ).strip()
        self.einvoice_password = os.getenv("WHITEBOOKS_EINVOICE_PASSWORD") or ""
        self.einvoice_gstin = (
            os.getenv("WHITEBOOKS_EINVOICE_GSTIN") or self.gstin
        ).strip().upper()
        self.einvoice_auth_path = (
            os.getenv("WHITEBOOKS_EINVOICE_AUTH_PATH") or "/einvoice/authenticate"
        ).strip()
        if not self.einvoice_auth_path.startswith("/"):
            self.einvoice_auth_path = "/" + self.einvoice_auth_path
        self.einvoice_sandbox_mock = (
            os.getenv("WHITEBOOKS_EINVOICE_SANDBOX_MOCK") or ""
        ).strip().lower() in ("1", "true", "yes")
        self.einvoice_auth_token = (
            os.getenv("WHITEBOOKS_EINVOICE_AUTH_TOKEN") or ""
        ).strip()
        self.einvoice_use_env_auth_token = (
            os.getenv("WHITEBOOKS_EINVOICE_USE_ENV_AUTH_TOKEN") or ""
        ).strip().lower() in ("1", "true", "yes")

    def has_einvoice_credentials(self) -> bool:
        return bool(
            self.einvoice_client_id
            and self.einvoice_client_secret
            and self.einvoice_username
            and self.einvoice_gstin
        )


class WhiteBooksClient:
    """HTTP client for WhiteBooks GST sandbox / production APIs."""

    _token_cache: dict[str, dict[str, Any]] = {}
    _lock = threading.Lock()

    def __init__(self, config: WhiteBooksConfig | None = None, *, credential_profile: str = "gst"):
        self.config = config or WhiteBooksConfig()
        self._credential_profile = (
            "einvoice" if credential_profile == "einvoice" else "gst"
        )
        self._log_user_email: str | None = None
        self._log_company_code: str | None = None

    def for_einvoice(self) -> WhiteBooksClient:
        """Return a client bound to WHITEBOOKS_EINVOICE_* credentials."""
        client = WhiteBooksClient(self.config, credential_profile="einvoice")
        client._log_user_email = self._log_user_email
        client._log_company_code = self._log_company_code
        return client

    def _uses_einvoice_credentials(self) -> bool:
        return self._credential_profile == "einvoice"

    def _active_client_id(self) -> str:
        if self._uses_einvoice_credentials() and self.config.einvoice_client_id:
            return self.config.einvoice_client_id
        return self.config.client_id

    def _active_client_secret(self) -> str:
        if self._uses_einvoice_credentials() and self.config.einvoice_client_secret:
            return self.config.einvoice_client_secret
        return self.config.client_secret

    def _active_gst_username(self) -> str:
        if self._uses_einvoice_credentials() and self.config.einvoice_username:
            return self.config.einvoice_username
        return self.config.gst_username

    def _active_gstin(self) -> str:
        if self._uses_einvoice_credentials():
            return self.config.einvoice_gstin or self.config.gstin
        return self.config.gstin

    def _active_password(self) -> str:
        if self._uses_einvoice_credentials():
            return (self.config.einvoice_password or "").strip()
        return (self.config.password or "").strip()

    @property
    def active_gstin(self) -> str:
        return self._active_gstin()

    def validate_einvoice_config(self) -> list[str]:
        missing = []
        checks = (
            ("WHITEBOOKS_EINVOICE_CLIENT_ID", self.config.einvoice_client_id),
            ("WHITEBOOKS_EINVOICE_CLIENT_SECRET", self.config.einvoice_client_secret),
            ("WHITEBOOKS_EINVOICE_USERNAME", self.config.einvoice_username),
            ("WHITEBOOKS_EINVOICE_GSTIN", self.config.einvoice_gstin),
            ("WHITEBOOKS_EMAIL", self.config.email),
        )
        for name, value in checks:
            if not value:
                missing.append(name)
        if not self._active_password() and not (
            self.config.einvoice_use_env_auth_token and self.config.einvoice_auth_token
        ):
            missing.append("WHITEBOOKS_EINVOICE_PASSWORD")
        return missing

    def _env_einvoice_auth_token(self) -> str | None:
        if not self.config.einvoice_use_env_auth_token:
            return None
        token = (self.config.einvoice_auth_token or "").strip()
        return token or None

    def _active_auth_path(self) -> str:
        if self._uses_einvoice_credentials():
            return self.config.einvoice_auth_path
        return self.config.auth_path

    def _authenticate_http_method(self) -> str:
        path = self._active_auth_path().lower()
        if self._uses_einvoice_credentials() and "einvoice/authenticate" in path:
            return "GET"
        return "POST"

    def _is_einvoice_authenticate_path(self) -> bool:
        return (
            self._uses_einvoice_credentials()
            and "einvoice/authenticate" in self._active_auth_path().lower()
        )

    def _profile_key(self) -> str:
        return "einvoice" if self._uses_einvoice_credentials() else "gst"

    def _token_ttl_seconds(self) -> int:
        if self._uses_einvoice_credentials():
            return self.config.einvoice_token_ttl_seconds
        return self.config.token_ttl_seconds

    def _cache_key(self) -> str:
        return f"{self._profile_key()}:{self._active_gstin()}:{self._active_gst_username()}"

    def _token_expires_at(self) -> datetime:
        return datetime.now(timezone.utc) + timedelta(seconds=self._token_ttl_seconds())

    def _load_token_from_store(self) -> dict[str, Any] | None:
        from gst.auth_token_store import is_token_valid, load_auth_token

        row = load_auth_token(
            profile=self._profile_key(),
            gstin=self._active_gstin(),
            username=self._active_gst_username(),
        )
        if row and is_token_valid(row.get("expires_at")):
            return row
        return None

    def _persist_token(
        self,
        auth_token: str,
        *,
        auth_mode: str | None = None,
        expires_at: datetime | None = None,
        response_json: dict[str, Any] | None = None,
    ) -> datetime:
        from gst.auth_token_store import save_auth_token

        exp = expires_at or self._token_expires_at()
        save_auth_token(
            profile=self._profile_key(),
            gstin=self._active_gstin(),
            username=self._active_gst_username(),
            auth_token=auth_token,
            expires_at=exp,
            auth_mode=auth_mode,
            response_json=response_json,
        )
        return exp

    def _extract_token_expiry(self, data: dict[str, Any] | None) -> datetime | None:
        if not isinstance(data, dict):
            return None
        nested = data.get("data") or data.get("Data")
        if not isinstance(nested, dict):
            nested = data
        te = nested.get("TokenExpiry") or nested.get("token_expiry") or nested.get("tokenExpiry")
        if not te:
            return None
        text = str(te).strip()[:19]
        for fmt in ("%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M:%S"):
            try:
                dt = datetime.strptime(text, fmt)
                try:
                    from zoneinfo import ZoneInfo

                    return dt.replace(tzinfo=ZoneInfo("Asia/Kolkata")).astimezone(timezone.utc)
                except Exception:
                    return dt.replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        return None

    def _cache_token_result(self, result: dict[str, Any], *, expires_at: datetime | None = None) -> None:
        exp = expires_at or self._token_expires_at()
        with self._lock:
            self._token_cache[self._cache_key()] = {
                "result": result,
                "expires_at": exp.timestamp(),
            }

    def _resolve_active_auth_token(self) -> str | None:
        if self._uses_einvoice_credentials():
            env_token = self._env_einvoice_auth_token()
            if env_token:
                return env_token

        cache_key = self._cache_key()
        now = time.time()
        with self._lock:
            cached = self._token_cache.get(cache_key)
            if cached and cached.get("expires_at", 0) > now:
                token = (cached.get("result") or {}).get("auth_token")
                if token:
                    return token

        row = self._load_token_from_store()
        if row and row.get("auth_token"):
            token = row["auth_token"]
            self._cache_token_result(
                {"success": True, "auth_token": token, "auth_mode": "db_token"},
                expires_at=row.get("expires_at"),
            )
            return token
        return None

    def _einvoice_auth_failure_message(self) -> str:
        return (
            "WhiteBooks e-Invoice auth-token could not be obtained from the developer portal. "
            "Verify WHITEBOOKS_EINVOICE_* credentials, IP whitelist, and sandbox OTP on "
            "developer.whitebooks.in, then retry. The app will auto-fetch and store a fresh token."
        )

    def get_einvoice_auth_token(self, *, force_refresh: bool = False) -> str | None:
        """Return e-Invoice auth-token from DB cache or WhiteBooks /einvoice/authenticate."""
        einvoice_client = self.for_einvoice()
        result = einvoice_client.authenticate(force_refresh=force_refresh)
        if not result.get("success"):
            return None
        return result.get("auth_token")

    def set_log_context(self, *, user_email: str | None = None, company_code: str | None = None) -> None:
        """Attach session context to subsequent API log rows."""
        if user_email is not None:
            self._log_user_email = (user_email or "").strip().lower() or None
        if company_code is not None:
            self._log_company_code = (company_code or "").strip().upper() or None

    def is_sandbox(self) -> bool:
        return self.config.env == "sandbox"

    def password_required(self) -> bool:
        """e-Invoice always needs portal password; GST sandbox does not."""
        if self._uses_einvoice_credentials():
            return True
        return not self.is_sandbox()

    def validate_config(self) -> list[str]:
        """Return list of missing required .env keys."""
        if self._uses_einvoice_credentials():
            return self.validate_einvoice_config()
        missing = []
        checks = (
            ("WHITEBOOKS_CLIENT_ID", self.config.client_id),
            ("WHITEBOOKS_CLIENT_SECRET", self.config.client_secret),
            ("WHITEBOOKS_GST_USERNAME", self.config.gst_username),
            ("WHITEBOOKS_GSTIN", self.config.gstin),
            ("WHITEBOOKS_EMAIL", self.config.email),
        )
        for name, value in checks:
            if not value:
                missing.append(name)
        if self.password_required() and not (self.config.password or "").strip():
            missing.append("WHITEBOOKS_GST_PASSWORD")
        return missing

    def get_config_status(self) -> dict[str, Any]:
        """Non-secret configuration summary for health checks."""
        missing = self.validate_config()
        return {
            "env": self.config.env,
            "base_url": self.config.base_url,
            "auth_path": self.config.auth_path,
            "gstin": self.config.gstin,
            "gst_username": self.config.gst_username,
            "email": self.config.email,
            "ip_address": self.config.ip_address,
            "state_cd": self.config.state_cd,
            "sandbox_otp_set": bool(self.config.sandbox_otp) if self.is_sandbox() else None,
            "client_id_set": bool(self.config.client_id),
            "client_secret_set": bool(self.config.client_secret),
            "password_required": self.password_required(),
            "password_set": bool((self.config.password or "").strip()),
            "ip_is_private": bool(_PRIVATE_IP_RE.match(self.config.ip_address)),
            "missing": missing,
            "ready": len(missing) == 0,
        }

    def authenticate(self, *, force_refresh: bool = False) -> dict[str, Any]:
        """
        Call WhiteBooks authenticate API and return parsed result.
        Caches auth-token per GSTIN + username until TTL expires.
        """
        missing = self.validate_config()
        if missing:
            return {
                "success": False,
                "message": "WhiteBooks credentials incomplete in .env",
                "missing": missing,
                "hint": (
                    "Set WHITEBOOKS_GST_PASSWORD for production only."
                    if self.password_required()
                    else "Check client id, secret, GST username, GSTIN, and email in .env."
                ),
            }

        if self._uses_einvoice_credentials():
            env_token = self._env_einvoice_auth_token()
            if env_token:
                preview = env_token if len(env_token) <= 16 else f"{env_token[:12]}..."
                return {
                    "success": True,
                    "token_obtained": True,
                    "auth_token": env_token,
                    "token_preview": preview,
                    "token_source": "env",
                    "auth_mode": "env_token",
                }

        cache_key = self._cache_key()
        now = time.time()

        if force_refresh:
            from gst.auth_token_store import delete_auth_token

            delete_auth_token(
                profile=self._profile_key(),
                gstin=self._active_gstin(),
                username=self._active_gst_username(),
            )
            with self._lock:
                self._token_cache.pop(cache_key, None)
        elif not force_refresh:
            with self._lock:
                cached = self._token_cache.get(cache_key)
                if cached and cached["expires_at"] > now:
                    out = dict(cached["result"])
                    out["cached"] = True
                    out["token_source"] = "memory"
                    return out

            stored = self._load_token_from_store()
            if stored and stored.get("auth_token"):
                preview = stored["auth_token"]
                if len(preview) > 16:
                    preview = f"{preview[:12]}..."
                result = {
                    "success": True,
                    "token_obtained": True,
                    "auth_token": stored["auth_token"],
                    "token_preview": preview,
                    "expires_in_seconds": self._token_ttl_seconds(),
                    "auth_mode": stored.get("auth_mode") or "db_token",
                    "token_source": "database",
                    "expires_at": stored.get("expires_at").isoformat()
                    if stored.get("expires_at")
                    else None,
                }
                self._cache_token_result(result, expires_at=stored.get("expires_at"))
                return result

        started = time.time()
        auth_path = self._active_auth_path()
        http_method = self._authenticate_http_method()
        try:
            resp = self._post_authenticate()
        except requests.RequestException as exc:
            log_gst_api_call(
                api_path=auth_path,
                http_method=http_method,
                request_url=f"{self.config.base_url}{auth_path}",
                request_headers=self._auth_headers(),
                success=False,
                error_message=str(exc),
                duration_ms=int((time.time() - started) * 1000),
                user_email=self._log_user_email,
                company_code=self._log_company_code,
            )
            raise WhiteBooksAuthError(f"WhiteBooks API unreachable: {exc}") from exc

        result = self._parse_auth_response(resp)
        parsed_body = result.get("raw")
        if parsed_body is None and resp.text:
            parsed_body = {"raw": resp.text[:4000]}
        log_gst_api_call(
            api_path=auth_path,
            http_method=http_method,
            request_url=f"{self.config.base_url}{auth_path}",
            request_headers=self._auth_headers(),
            response_status=resp.status_code,
            response_body=parsed_body,
            success=bool(result.get("success")),
            error_message=None if result.get("success") else result.get("message"),
            duration_ms=int((time.time() - started) * 1000),
            user_email=self._log_user_email,
            company_code=self._log_company_code,
        )
        if result.get("success") and result.get("auth_token"):
            raw = result.get("raw") if isinstance(result.get("raw"), dict) else None
            token_exp = self._extract_token_expiry(raw) if raw else None
            expires_at = self._persist_token(
                result["auth_token"],
                auth_mode=result.get("auth_mode") or "einvoice_authenticate",
                expires_at=token_exp,
                response_json=raw,
            )
            result["token_source"] = "portal_api"
            result["expires_at"] = expires_at.isoformat()
            self._cache_token_result(result, expires_at=expires_at)
        return result

    def get_auth_token(self, *, force_refresh: bool = False) -> str | None:
        """Return cached or fresh auth-token; None when sandbox uses header-only auth."""
        result = self.authenticate(force_refresh=force_refresh)
        if not result.get("success"):
            raise WhiteBooksAuthError(result.get("message") or "Authentication failed", response=result)
        return result.get("auth_token")

    def api_call(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json_body: dict[str, Any] | None = None,
        data: dict[str, Any] | None = None,
        skip_auth: bool = False,
        raise_on_error: bool = False,
        auth_token: str | None = None,
        extra_headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """
        Call a WhiteBooks GST API endpoint with standard headers and DB logging.
        Authenticates automatically unless skip_auth=True.
        """
        method_u = (method or "GET").strip().upper()
        api_path = self._normalize_path(path)
        url = api_path if api_path.startswith("http") else f"{self.config.base_url}{api_path}"

        if not skip_auth and not auth_token:
            self.authenticate()

        headers = self._api_headers()
        if extra_headers:
            headers.update({k: str(v) for k, v in extra_headers.items() if v is not None})
        if auth_token:
            headers["auth-token"] = auth_token.strip()
        started = time.time()
        resp = None
        try:
            resp = requests.request(
                method_u,
                url,
                headers=headers,
                params=params,
                json=json_body,
                data=data,
                timeout=self.config.timeout,
            )
        except requests.RequestException as exc:
            log_id = log_gst_api_call(
                api_path=api_path,
                http_method=method_u,
                request_url=url,
                request_headers=headers,
                request_body=json_body or params or data,
                success=False,
                error_message=str(exc),
                duration_ms=int((time.time() - started) * 1000),
                user_email=self._log_user_email,
                company_code=self._log_company_code,
            )
            if raise_on_error:
                raise WhiteBooksApiError(str(exc), log_id=log_id) from exc
            return {
                "success": False,
                "message": str(exc),
                "log_id": log_id,
            }

        parsed = self._parse_api_response(resp, api_path=api_path)
        log_id = log_gst_api_call(
            api_path=api_path,
            http_method=method_u,
            request_url=url,
            request_headers=headers,
            request_body=json_body or params or data,
            response_status=resp.status_code,
            response_body=parsed.get("data"),
            success=bool(parsed.get("success")),
            error_message=parsed.get("error_message"),
            duration_ms=int((time.time() - started) * 1000),
            user_email=self._log_user_email,
            company_code=self._log_company_code,
        )
        parsed["log_id"] = log_id
        if raise_on_error and not parsed.get("success"):
            raise WhiteBooksApiError(
                parsed.get("error_message") or "WhiteBooks API call failed",
                http_status=parsed.get("http_status"),
                status_cd=parsed.get("status_cd"),
                response=parsed,
                log_id=log_id,
            )
        return parsed

    def generate_irn(self, payload: dict[str, Any], *, raise_on_error: bool = False) -> dict[str, Any]:
        """Generate e-Invoice IRN via WhiteBooks (uses e-Invoice credentials)."""
        einvoice_client = self.for_einvoice()
        missing = einvoice_client.validate_einvoice_config()
        if missing:
            return {
                "success": False,
                "message": (
                    "e-Invoice credentials incomplete in .env - set WHITEBOOKS_EINVOICE_* "
                    "(separate from GST credentials)."
                ),
                "missing": missing,
            }
        auth_token = self.get_einvoice_auth_token()
        if not auth_token:
            if self.is_sandbox() and self.config.einvoice_sandbox_mock:
                return {
                    "success": True,
                    "http_status": 200,
                    "status_cd": "1",
                    "data": {
                        "status_cd": "1",
                        "mock": True,
                        "Data": {
                            "Irn": self._sandbox_mock_irn(payload),
                            "AckNo": "SANDBOX",
                            "AckDt": time.strftime("%d/%m/%Y %H:%M:%S"),
                            "SignedQRCode": "",
                        },
                    },
                    "error_message": None,
                }
            return {
                "success": False,
                "message": self._einvoice_auth_failure_message(),
                "missing_auth_token": True,
            }

        params = {"email": self.config.email}
        result = einvoice_client.api_call(
            "POST",
            self.config.einvoice_generate_path,
            params=params,
            json_body=payload,
            raise_on_error=raise_on_error,
            skip_auth=True,
            auth_token=auth_token,
        )
        if (
            not result.get("success")
            and self._is_invalid_auth_token_error(result)
            and not raise_on_error
        ):
            fresh = self.get_einvoice_auth_token(force_refresh=True)
            if fresh and fresh != auth_token:
                result = einvoice_client.api_call(
                    "POST",
                    self.config.einvoice_generate_path,
                    params=params,
                    json_body=payload,
                    raise_on_error=raise_on_error,
                    skip_auth=True,
                    auth_token=fresh,
                )
        return result

    def cancel_irn(
        self,
        irn: str,
        *,
        reason: str = "3",
        remarks: str = "",
        raise_on_error: bool = False,
    ) -> dict[str, Any]:
        """Cancel an e-Invoice IRN via WhiteBooks (24h NIC window)."""
        einvoice_client = self.for_einvoice()
        missing = einvoice_client.validate_einvoice_config()
        if missing:
            return {
                "success": False,
                "message": "e-Invoice credentials incomplete in .env.",
                "missing": missing,
            }

        irn_val = (irn or "").strip()
        if len(irn_val) != 64:
            return {"success": False, "message": "A valid 64-character IRN is required to cancel."}

        auth_token = self.get_einvoice_auth_token()
        if not auth_token:
            if self.is_sandbox() and self.config.einvoice_sandbox_mock:
                return {
                    "success": True,
                    "http_status": 200,
                    "status_cd": "1",
                    "data": {
                        "status_cd": "1",
                        "mock": True,
                        "Data": {
                            "Irn": irn_val,
                            "CancelDate": time.strftime("%d/%m/%Y %H:%M:%S"),
                        },
                    },
                    "error_message": None,
                }
            return {
                "success": False,
                "message": self._einvoice_auth_failure_message(),
                "missing_auth_token": True,
            }

        payload = {
            "Irn": irn_val,
            "CnlRsn": str(reason or "3").strip()[:1],
            "CnlRem": (remarks or "")[:100],
        }
        params = {"email": self.config.email}
        return einvoice_client.api_call(
            "POST",
            self.config.einvoice_cancel_path,
            params=params,
            json_body=payload,
            raise_on_error=raise_on_error,
            skip_auth=True,
            auth_token=auth_token,
        )

    def get_irn_details(self, irn: str, *, raise_on_error: bool = False) -> dict[str, Any]:
        """Fetch e-Invoice details from WhiteBooks by IRN."""
        einvoice_client = self.for_einvoice()
        missing = einvoice_client.validate_einvoice_config()
        if missing:
            return {
                "success": False,
                "message": "e-Invoice credentials incomplete in .env.",
                "missing": missing,
            }

        irn_val = (irn or "").strip()
        if len(irn_val) != 64:
            return {"success": False, "message": "A valid 64-character IRN is required."}

        auth_token = self.get_einvoice_auth_token()
        if not auth_token:
            if self.is_sandbox() and self.config.einvoice_sandbox_mock:
                return {
                    "success": False,
                    "message": "Live IRN lookup requires a valid e-Invoice auth-token from the portal.",
                    "missing_auth_token": True,
                }
            return {
                "success": False,
                "message": self._einvoice_auth_failure_message(),
                "missing_auth_token": True,
            }

        # WhiteBooks GETIRN expects IRN in query param "param1", not "irn" or path suffix.
        params: dict[str, Any] = {"email": self.config.email, "param1": irn_val}
        path = self.config.einvoice_getirn_path
        if "{irn}" in path:
            path = path.replace("{irn}", irn_val)
        return einvoice_client.api_call(
            "GET",
            path,
            params=params,
            raise_on_error=raise_on_error,
            skip_auth=True,
            auth_token=auth_token,
        )

    def get_irn_by_doc_details(
        self,
        doc_type: str,
        doc_num: str,
        doc_date: str,
        *,
        irp: str | None = None,
        raise_on_error: bool = False,
    ) -> dict[str, Any]:
        """Fetch e-Invoice IRN from NIC using document type, number, and date."""
        einvoice_client = self.for_einvoice()
        missing = einvoice_client.validate_einvoice_config()
        if missing:
            return {
                "success": False,
                "message": "e-Invoice credentials incomplete in .env.",
                "missing": missing,
            }

        doc_type_val = (doc_type or "INV").strip().upper()
        doc_num_val = (doc_num or "").strip()
        doc_date_val = (doc_date or "").strip()
        if not doc_num_val or not doc_date_val:
            return {
                "success": False,
                "message": "Document number and date are required to sync IRN.",
            }

        auth_token = self.get_einvoice_auth_token()
        if not auth_token:
            return {
                "success": False,
                "message": self._einvoice_auth_failure_message(),
                "missing_auth_token": True,
            }

        params: dict[str, Any] = {
            "email": self.config.email,
            "param1": doc_type_val,
        }
        if irp:
            params["irp"] = irp.strip()

        return einvoice_client.api_call(
            "GET",
            self.config.einvoice_getirn_by_doc_path,
            params=params,
            extra_headers={
                "docnum": doc_num_val,
                "docdate": doc_date_val,
            },
            raise_on_error=raise_on_error,
            skip_auth=True,
            auth_token=auth_token,
        )

    @staticmethod
    def _sandbox_mock_irn(payload: dict[str, Any]) -> str:
        import hashlib

        doc = payload.get("DocDtls") or {}
        seed = f"{doc.get('No')}|{doc.get('Dt')}|sandbox"
        return hashlib.sha256(seed.encode("utf-8")).hexdigest()

    def _normalize_path(self, path: str) -> str:
        p = (path or "").strip()
        if p.startswith("http://") or p.startswith("https://"):
            return p
        if not p.startswith("/"):
            p = "/" + p
        return p

    def _api_headers(self) -> dict[str, str]:
        headers = dict(self._auth_headers())
        token = self._resolve_active_auth_token()
        if token:
            headers["auth-token"] = token
        return headers

    def _extract_api_error_message(self, data: Any, body_text: str) -> str | None:
        if isinstance(data, dict):
            err = data.get("error") or {}
            if isinstance(err, dict):
                msg = (err.get("message") or err.get("desc") or "").strip()
                if msg:
                    return msg
            status_desc = data.get("status_desc")
            if status_desc:
                nested = self._extract_embedded_error_message(str(status_desc))
                if nested:
                    return nested
            status_cd = str(data.get("status_cd") or "").strip()
            if status_cd == "0" and status_desc:
                return str(status_desc).strip()
        nested = self._extract_embedded_error_message(body_text)
        if nested:
            return nested
        return None

    @staticmethod
    def _extract_embedded_error_message(text: str) -> str | None:
        if not text:
            return None
        match = re.search(
            r'\\?"message\\?":\\?"([^"\\]+)\\?"',
            text,
        )
        if match:
            return match.group(1).replace("\\/", "/")
        match = re.search(r'"message":"([^"]+)"', text)
        if match:
            return match.group(1)
        return None

    def _parse_api_response(
        self,
        resp: requests.Response,
        *,
        api_path: str | None = None,
    ) -> dict[str, Any]:
        body_text = (resp.text or "").strip()
        data: Any = None
        if body_text:
            try:
                data = resp.json()
            except ValueError:
                data = {"raw": body_text}

        status_cd = None
        status_desc = None
        error_message = None
        if isinstance(data, dict):
            status_cd = str(data.get("status_cd") or "").strip() or None
            status_desc = data.get("status_desc")
            if status_cd == "0":
                error_message = self._extract_api_error_message(data, body_text)
            elif status_cd == "1":
                error_message = None
            elif status_cd is None:
                error_message = self._extract_api_error_message(data, body_text)

        if not body_text and 200 <= resp.status_code < 300:
            path_l = (api_path or "").lower()
            if self._uses_einvoice_credentials() or "einvoice" in path_l:
                error_message = self._einvoice_auth_failure_message()
            else:
                error_message = (
                    "WhiteBooks returned an empty response. "
                    "Verify credentials, IP whitelist, and sandbox account status."
                )

        http_ok = 200 <= resp.status_code < 300
        api_ok = status_cd != "0" if status_cd is not None else http_ok
        success = http_ok and api_ok and not error_message and bool(body_text)

        return {
            "success": success,
            "http_status": resp.status_code,
            "status_cd": status_cd,
            "status_desc": status_desc,
            "error_message": error_message,
            "data": data,
        }

    def _auth_headers(self) -> dict[str, str]:
        gstin = self._active_gstin()
        username = self._active_gst_username()
        state_cd = self.config.state_cd
        if self._uses_einvoice_credentials() and gstin and len(gstin) >= 2:
            state_cd = gstin[:2]
        headers = {
            "Accept": "application/json",
            "client_id": self._active_client_id(),
            "client_secret": self._active_client_secret(),
            "gstin": gstin,
            "username": username,
            "gst_username": username,
            "email": self.config.email,
            "ip_address": self.config.ip_address,
        }
        if state_cd:
            headers["state_cd"] = state_cd
        password = self._active_password()
        if password:
            headers["password"] = password
        return headers

    def _auth_query_params(self) -> dict[str, str]:
        params = {
            "email": self.config.email,
            "gst_username": self._active_gst_username(),
            "ip_address": self.config.ip_address,
            "client_id": self._active_client_id(),
            "client_secret": self._active_client_secret(),
            "gstin": self._active_gstin(),
        }
        password = self._active_password()
        if password:
            params["password"] = password
        return params

    def _auth_json_body(self) -> dict[str, str]:
        body = {
            "email": self.config.email,
            "gst_username": self._active_gst_username(),
            "ip_address": self.config.ip_address,
            "client_id": self._active_client_id(),
            "client_secret": self._active_client_secret(),
            "gstin": self._active_gstin(),
        }
        password = self._active_password()
        if password:
            body["password"] = password
        return body

    def _post_authenticate(self) -> requests.Response:
        """
        e-Invoice: GET /einvoice/authenticate?email= with credentials in headers.
        GST sandbox: POST /authentication/authtoken?email=&otp= with headers.
        Production GST: legacy /gst/v1.0/authenticate with optional password.
        """
        auth_path = self._active_auth_path()
        url = f"{self.config.base_url}{auth_path}"
        headers = self._auth_headers()
        timeout = self.config.timeout

        if self._is_einvoice_authenticate_path():
            return requests.get(
                url,
                headers=headers,
                params={"email": self.config.email},
                timeout=timeout,
            )

        if self.is_sandbox() and "authtoken" in auth_path.lower():
            if self._uses_einvoice_credentials() and self._active_password():
                pwd_params = self._auth_query_params()
                pwd_params["otp"] = self.config.sandbox_otp
                pwd_resp = requests.post(
                    url,
                    headers=headers,
                    params=pwd_params,
                    timeout=timeout,
                )
                parsed_pwd = self._parse_auth_response(pwd_resp, probe_only=True)
                if parsed_pwd.get("auth_token") or parsed_pwd.get("status_ok"):
                    return pwd_resp
            return requests.post(
                url,
                headers=headers,
                params={
                    "email": self.config.email,
                    "otp": self.config.sandbox_otp,
                    **(
                        {
                            "gst_username": self._active_gst_username(),
                            "password": self._active_password(),
                        }
                        if self._uses_einvoice_credentials() and self._active_password()
                        else {}
                    ),
                },
                timeout=timeout,
            )

        params = self._auth_query_params()
        attempts: list[tuple[str, dict[str, Any]]] = [
            ("sandbox_headers", {"url": url, "headers": headers, "timeout": timeout}),
            ("sandbox_query", {"url": url, "headers": headers, "params": params, "timeout": timeout}),
        ]
        if (self.config.password or "").strip():
            attempts.append(
                (
                    "json_body",
                    {
                        "url": url,
                        "headers": {**headers, "Content-Type": "application/json"},
                        "json": self._auth_json_body(),
                        "timeout": timeout,
                    },
                )
            )

        last_resp = None
        for _mode, kwargs in attempts:
            resp = requests.post(**kwargs)
            last_resp = resp
            parsed = self._parse_auth_response(resp, probe_only=True)
            if parsed.get("auth_token") or parsed.get("status_ok"):
                return resp
            if resp.text and "Invalid request" not in resp.text:
                return resp
        return last_resp

    def _find_auth_token_in_obj(self, obj: Any, *, depth: int = 0) -> str | None:
        if depth > 4 or not isinstance(obj, dict):
            return None
        for key in ("auth-token", "auth_token", "AuthToken", "authtoken"):
            val = obj.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()
        for key in ("data", "Data", "result", "Result", "response", "Response"):
            found = self._find_auth_token_in_obj(obj.get(key), depth=depth + 1)
            if found:
                return found
        return None

    def _extract_auth_token(self, resp: requests.Response, data: dict[str, Any]) -> str | None:
        auth_token = (
            resp.headers.get("auth-token")
            or resp.headers.get("Auth-Token")
            or resp.headers.get("authtoken")
        )
        if auth_token:
            return auth_token.strip()
        if isinstance(data, dict):
            return self._find_auth_token_in_obj(data)
        return None

    def _is_status_ok(self, data: dict[str, Any]) -> bool:
        status_cd = str(data.get("status_cd") or "").strip().lower()
        if status_cd in ("1", "success"):
            return True
        desc = (data.get("status_desc") or "").lower()
        return (
            "user name exists" in desc
            or "authentication succeeds" in desc
            or "gstr request succeeds" in desc
        )

    @staticmethod
    def _is_invalid_auth_token_error(result: dict[str, Any]) -> bool:
        msg = (result.get("error_message") or result.get("message") or "").lower()
        if "invalid token" in msg or "token expired" in msg or "auth-token" in msg:
            return True
        data = result.get("data")
        if isinstance(data, dict):
            nested = str(data.get("status_desc") or data.get("ErrorMessage") or "").lower()
            if "invalid token" in nested or "token expired" in nested:
                return True
        return False

    def _parse_auth_response(
        self,
        resp: requests.Response,
        *,
        probe_only: bool = False,
    ) -> dict[str, Any]:
        body_text = (resp.text or "").strip()
        data: dict[str, Any] = {}
        if body_text:
            try:
                parsed = resp.json()
                if isinstance(parsed, dict):
                    data = parsed
                else:
                    data = {"raw": parsed}
            except ValueError:
                data = {"raw": body_text}

        auth_token = self._extract_auth_token(resp, data)
        status_ok = self._is_status_ok(data) if isinstance(data, dict) else False
        if probe_only:
            return {"auth_token": auth_token, "status_ok": status_ok}

        if auth_token:
            preview = auth_token if len(auth_token) <= 16 else f"{auth_token[:12]}..."
            ttl = (
                self.config.einvoice_token_ttl_seconds
                if self._uses_einvoice_credentials()
                else self.config.token_ttl_seconds
            )
            return {
                "success": True,
                "token_obtained": True,
                "auth_token": auth_token,
                "token_preview": preview,
                "expires_in_seconds": ttl,
                "auth_mode": "einvoice_authenticate" if self._is_einvoice_authenticate_path() else "portal_api",
                "http_status": resp.status_code,
                "status_desc": data.get("status_desc") if isinstance(data, dict) else None,
                "raw": data or None,
            }

        if status_ok:
            return {
                "success": True,
                "token_obtained": False,
                "auth_mode": "sandbox_authtoken",
                "message": data.get("status_desc") or "WhiteBooks sandbox authentication acknowledged.",
                "http_status": resp.status_code,
                "status_cd": data.get("status_cd"),
                "raw": data or None,
            }

        if not body_text and resp.status_code == 200 and self._uses_einvoice_credentials():
            return {
                "success": False,
                "token_obtained": False,
                "message": self._einvoice_auth_failure_message(),
                "http_status": resp.status_code,
            }

        if (
            not body_text
            and resp.status_code == 200
            and self.is_sandbox()
            and "authtoken" in self.config.auth_path.lower()
        ):
            return {
                "success": True,
                "token_obtained": False,
                "auth_mode": "sandbox_authtoken",
                "message": (
                    "WhiteBooks sandbox authtoken call accepted (HTTP 200). "
                    "Matches developer portal OTP flow - credentials and IP are valid."
                ),
                "http_status": resp.status_code,
                "hint": "Use returned auth-token header on subsequent GST API calls when available.",
            }

        if not body_text and resp.status_code == 200 and self.is_sandbox():
            return {
                "success": True,
                "token_obtained": False,
                "auth_mode": "sandbox_credentials",
                "message": (
                    "WhiteBooks sandbox is reachable with your portal credentials. "
                    "No auth token was returned yet - whitelist WHITEBOOKS_IP_ADDRESS "
                    "on developer.whitebooks.in if required."
                ),
                "http_status": resp.status_code,
                "hint": "Sandbox credentials do not include a GST password.",
            }

        if not body_text and resp.status_code == 200:
            return {
                "success": False,
                "token_obtained": False,
                "message": (
                    "Authentication returned an empty response. "
                    "Verify credentials and IP whitelist on developer.whitebooks.in."
                ),
                "http_status": resp.status_code,
            }

        error = data.get("error") if isinstance(data, dict) else {}
        if not isinstance(error, dict):
            error = {}
        err_msg = (
            error.get("message")
            or error.get("desc")
            or body_text
            or f"HTTP {resp.status_code}"
        )
        return {
            "success": False,
            "token_obtained": False,
            "message": err_msg,
            "error_code": error.get("error_cd") or error.get("error_code"),
            "http_status": resp.status_code,
            "raw": data or None,
            "hint": (
                "Sandbox uses client id, secret, GST username, and GSTIN only."
                if self.is_sandbox()
                else None
            ),
        }


def get_whitebooks_client() -> WhiteBooksClient:
    return WhiteBooksClient()
