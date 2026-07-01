"""WhiteBooks public GST APIs — GSTIN verify and HSN validation (Phase 2)."""

from __future__ import annotations

import os
import re
from typing import Any

from gst.whitebooks_client import WhiteBooksClient

GSTIN_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")
HSN_RE = re.compile(r"^\d{4,8}$")


def normalize_gstin(value: str) -> str:
    return (value or "").strip().upper().replace(" ", "")


def validate_gstin_format(gstin: str) -> bool:
    return bool(GSTIN_RE.match(normalize_gstin(gstin)))


def validate_hsn_format(hsn: str) -> bool:
    return bool(HSN_RE.match((hsn or "").strip()))


def _gstin_verify_path() -> str:
    path = (os.getenv("WHITEBOOKS_GSTIN_VERIFY_PATH") or "/public/search").strip()
    return path if path.startswith("/") else f"/{path}"


def _hsn_search_path() -> str:
    path = (os.getenv("WHITEBOOKS_HSN_SEARCH_PATH") or "").strip()
    if not path:
        return ""
    return path if path.startswith("/") else f"/{path}"


def _extract_taxpayer(payload: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(payload, dict):
        return None
    inner = payload.get("data")
    if isinstance(inner, dict) and inner.get("gstin"):
        return inner
    if payload.get("gstin"):
        return payload
    return None


def _format_taxpayer_result(
    *,
    cleaned: str,
    taxpayer: dict[str, Any],
    api_data: dict[str, Any] | None,
    log_id: int | None,
) -> dict[str, Any]:
    pradr = taxpayer.get("pradr") or {}
    addr = pradr.get("addr") if isinstance(pradr, dict) else None
    return {
        "success": True,
        "verified": True,
        "gstin": cleaned,
        "legal_name": taxpayer.get("lgnm"),
        "trade_name": taxpayer.get("tradeNam"),
        "status": taxpayer.get("sts"),
        "taxpayer_type": taxpayer.get("dty"),
        "registration_date": taxpayer.get("rgdt"),
        "state_jurisdiction": taxpayer.get("stj"),
        "principal_address": addr if isinstance(addr, dict) else None,
        "status_desc": api_data.get("status_desc") if isinstance(api_data, dict) else None,
        "log_id": log_id,
    }


def verify_gstin(client: WhiteBooksClient, gstin: str) -> dict[str, Any]:
    """Verify a GSTIN via WhiteBooks GET /public/search."""
    cleaned = normalize_gstin(gstin)
    if not cleaned:
        return {"success": False, "message": "GSTIN is required"}
    if not validate_gstin_format(cleaned):
        return {
            "success": False,
            "message": "Invalid GSTIN format (expected 15 characters, e.g. 27AAGCB1286Q2Z3)",
            "gstin": cleaned,
        }

    result = client.api_call(
        "GET",
        _gstin_verify_path(),
        params={"gstin": cleaned, "email": client.config.email},
    )
    if not result.get("success"):
        return {
            "success": False,
            "message": result.get("error_message") or "GSTIN verification failed",
            "gstin": cleaned,
            "log_id": result.get("log_id"),
        }

    api_data = result.get("data")
    if not isinstance(api_data, dict):
        api_data = {}
    taxpayer = _extract_taxpayer(api_data)
    if not taxpayer:
        return {
            "success": False,
            "message": "GSTIN not found or not registered with GST",
            "gstin": cleaned,
            "log_id": result.get("log_id"),
        }

    return _format_taxpayer_result(
        cleaned=cleaned,
        taxpayer=taxpayer,
        api_data=api_data,
        log_id=result.get("log_id"),
    )


def search_hsn(client: WhiteBooksClient, query: str) -> dict[str, Any]:
    """
    Validate HSN code format and optionally call WhiteBooks HSN search API.

    WhiteBooks sandbox exposes /public/search for GSTIN only; HSN lookup has no
    public sandbox endpoint in their OpenAPI spec. When WHITEBOOKS_HSN_SEARCH_PATH
    is unset, this returns format validation only.
    """
    hsn = (query or "").strip()
    if not hsn:
        return {"success": False, "message": "HSN code is required"}
    if not hsn.isdigit():
        return {"success": False, "message": "HSN code must contain digits only", "hsn": hsn}
    if not validate_hsn_format(hsn):
        return {"success": False, "message": "HSN code must be 4 to 8 digits", "hsn": hsn}

    path = _hsn_search_path()
    if not path:
        return {
            "success": True,
            "validated": True,
            "hsn": hsn,
            "source": "format",
            "api_available": False,
            "message": (
                "HSN format is valid. WhiteBooks HSN lookup is not available on "
                "sandbox public APIs — set WHITEBOOKS_HSN_SEARCH_PATH when configured."
            ),
        }

    last_result: dict[str, Any] | None = None
    for param_key in ("hsn", "hsncd", "q"):
        result = client.api_call(
            "GET",
            path,
            params={"email": client.config.email, param_key: hsn},
        )
        last_result = result
        if not result.get("success"):
            continue
        api_data = result.get("data")
        if isinstance(api_data, dict) and str(api_data.get("status_cd") or "") == "1":
            inner = api_data.get("data")
            return {
                "success": True,
                "validated": True,
                "hsn": hsn,
                "source": "whitebooks",
                "api_available": True,
                "description": inner if isinstance(inner, (dict, list)) else inner,
                "status_desc": api_data.get("status_desc"),
                "log_id": result.get("log_id"),
            }

    return {
        "success": True,
        "validated": True,
        "hsn": hsn,
        "source": "format",
        "api_available": True,
        "lookup_failed": True,
        "message": (
            (last_result or {}).get("error_message")
            or "HSN format is valid; WhiteBooks lookup returned no match."
        ),
        "log_id": (last_result or {}).get("log_id"),
    }
