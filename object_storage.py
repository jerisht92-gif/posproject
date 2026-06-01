"""
S3 object storage for uploads (AWS S3 or Supabase Storage S3-compatible API).

Configure via environment variables in `.env`. When not configured,
upload paths fall back to local disk in app.py.

Object keys use a prefix per submodule, e.g.:
  purchase_attachments/PO-001/invoice.pdf
  creditnote_attachments/CRN-001/file.pdf

Public URLs stored in PostgreSQL:
  AWS:  https://{bucket}.s3.{region}.amazonaws.com/{key}
  Supabase: {SUPABASE_PUBLIC_OBJECTS_BASE}/{key}
"""

from __future__ import annotations

import mimetypes
import os
import re
from typing import Optional, Tuple

_BUCKET_NAME_RE = re.compile(r"^[a-zA-Z0-9.\-_]{1,255}$")
_warned_invalid_bucket = False

try:
    import boto3
    from botocore.config import Config
except ImportError:  # pragma: no cover
    boto3 = None  # type: ignore
    Config = None  # type: ignore

MODULE_SUPPLIER_ATTACHMENTS = "supplier_attachments"
MODULE_QUOTATION_ATTACHMENTS = "quotation_attachments"
MODULE_INVOICE_ATTACHMENTS = "invoice_attachments"
MODULE_INVOICE_RETURN_ATTACHMENTS = "invoice_return_attachments"
MODULE_PURCHASE_ATTACHMENTS = "purchase_attachments"
MODULE_STOCK_ATTACHMENTS = "stock_attachments"
MODULE_CREDIT_NOTE_ATTACHMENTS = "creditnote_attachments"
MODULE_DELIVERY_NOTE_ATTACHMENTS = "deliverynote_attachments"
MODULE_DELIVERY_NOTE_RETURN_ATTACHMENTS = "deliverynote_return_attachments"
MODULE_PRODUCT_IMAGES = "product_images"
MODULE_IMPORTS = "imports"

_s3_client = None


def is_remote_url(value: Optional[str]) -> bool:
    s = (value or "").strip()
    return s.lower().startswith(("http://", "https://"))


def _s3_bucket_id_from_env() -> str:
    raw = os.getenv("S3_BUCKET")
    if raw is None:
        return ""
    s = raw.strip().strip('"').strip("'")
    s = s.replace("\ufeff", "").replace("\r", "").replace("\n", "")
    return s.strip()


def _s3_region() -> str:
    return (os.getenv("S3_REGION") or "eu-north-1").strip()


def _endpoint_url() -> str:
    return (os.getenv("S3_ENDPOINT_URL") or "").strip()


def _is_supabase_endpoint(endpoint: str) -> bool:
    return "supabase.co" in (endpoint or "").lower()


def _is_aws_native() -> bool:
    """True when using standard AWS S3 (no custom Supabase endpoint)."""
    if (os.getenv("S3_USE_AWS") or "").strip().lower() in ("1", "true", "yes", "on"):
        return True
    endpoint = _endpoint_url()
    if not endpoint:
        return True
    if _is_supabase_endpoint(endpoint):
        return False
    return "amazonaws.com" in endpoint.lower()


def _derive_aws_public_base() -> str:
    bucket = _s3_bucket_id_from_env()
    region = _s3_region()
    if not bucket:
        return ""
    return f"https://{bucket}.s3.{region}.amazonaws.com"


def _derive_supabase_public_base() -> str:
    endpoint = _endpoint_url()
    bucket = _s3_bucket_id_from_env()
    if not endpoint or not bucket:
        return ""
    m = re.search(
        r"https://([a-z0-9]+)\.storage\.supabase\.co",
        endpoint,
        flags=re.IGNORECASE,
    )
    if not m:
        return ""
    return f"https://{m.group(1)}.supabase.co/storage/v1/object/public/{bucket}"


def _public_base() -> str:
    explicit = (
        (os.getenv("S3_PUBLIC_BASE_URL") or "").strip()
        or (os.getenv("SUPABASE_PUBLIC_OBJECTS_BASE") or "").strip()
    ).rstrip("/")
    if explicit:
        return explicit
    if _is_aws_native():
        return _derive_aws_public_base()
    return _derive_supabase_public_base()


def is_enabled() -> bool:
    global _warned_invalid_bucket
    if boto3 is None or Config is None:
        return False
    if os.getenv("OBJECT_STORAGE_DISABLED", "").strip().lower() in ("1", "true", "yes", "on"):
        return False
    b = _s3_bucket_id_from_env()
    if not b or not _BUCKET_NAME_RE.fullmatch(b):
        if b and not _warned_invalid_bucket:
            _warned_invalid_bucket = True
            print(
                "object_storage: S3_BUCKET must match ^[a-zA-Z0-9.\\-_]{1,255}$ (no spaces). "
                "Example: pos-billing-upload. S3 uploads disabled until fixed."
            )
        return False
    access = (os.getenv("S3_ACCESS_KEY_ID") or os.getenv("AWS_ACCESS_KEY_ID") or "").strip()
    secret = (os.getenv("S3_SECRET_ACCESS_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY") or "").strip()
    has_keys = bool(access and secret)
    if not has_keys or not _public_base():
        return False
    if _is_aws_native():
        return True
    return bool(_endpoint_url())


def _bucket() -> str:
    b = _s3_bucket_id_from_env()
    if not _BUCKET_NAME_RE.fullmatch(b):
        raise ValueError(
            "Invalid S3_BUCKET: use only letters, numbers, dot, hyphen, underscore (1–255 chars), "
            "e.g. pos-billing-upload."
        )
    return b


def public_url_for_key(object_key: str) -> str:
    key = (object_key or "").lstrip("/")
    base = _public_base()
    if not base:
        raise RuntimeError("S3_PUBLIC_BASE_URL or SUPABASE_PUBLIC_OBJECTS_BASE must be set")
    return f"{base}/{key}"


def object_key_from_public_url(url: str) -> Optional[str]:
    if not is_remote_url(url):
        return None
    u = (url or "").strip().split("?", 1)[0].rstrip("/")
    base = _public_base()
    if base and u.startswith(base + "/"):
        return u[len(base) + 1 :].lstrip("/")
    bucket = _s3_bucket_id_from_env()
    region = _s3_region()
    virtual = f"https://{bucket}.s3.{region}.amazonaws.com/"
    if u.startswith(virtual):
        return u[len(virtual) :].lstrip("/")
    path_style = f"https://s3.{region}.amazonaws.com/{bucket}/"
    if u.startswith(path_style):
        return u[len(path_style) :].lstrip("/")
    return None


def _get_client():
    global _s3_client
    if _s3_client is not None:
        return _s3_client
    region = _s3_region()
    access_key = (os.getenv("S3_ACCESS_KEY_ID") or os.getenv("AWS_ACCESS_KEY_ID") or "").strip()
    secret_key = (os.getenv("S3_SECRET_ACCESS_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY") or "").strip()
    endpoint = _endpoint_url()

    client_kwargs = {
        "service_name": "s3",
        "region_name": region,
        "aws_access_key_id": access_key,
        "aws_secret_access_key": secret_key,
    }

    if _is_supabase_endpoint(endpoint):
        client_kwargs["endpoint_url"] = endpoint
        client_kwargs["config"] = Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
        )
    elif endpoint:
        client_kwargs["endpoint_url"] = endpoint
        client_kwargs["config"] = Config(signature_version="s3v4")
    else:
        # Native AWS S3 (e.g. pos-billing-upload in eu-north-1)
        client_kwargs["config"] = Config(signature_version="s3v4")

    _s3_client = boto3.client(**client_kwargs)
    return _s3_client


def try_upload_stream(
    module_key: str, object_name: str, file_storage
) -> Optional[Tuple[str, int]]:
    if not is_enabled():
        return None
    rel = (object_name or "file").replace("\\", "/").strip("/")
    parts = [p for p in rel.split("/") if p and p != "." and p != ".."]
    rel = "/".join(parts) or "file"
    mod = (module_key or "").strip().strip("/")
    key = f"{mod}/{rel}" if mod else rel
    basename = rel.split("/")[-1]
    try:
        file_storage.stream.seek(0)
    except Exception:
        pass
    data = file_storage.read()
    size = len(data)
    content_type = mimetypes.guess_type(basename)[0] or "application/octet-stream"
    _get_client().put_object(
        Bucket=_bucket(),
        Key=key,
        Body=data,
        ContentType=content_type,
    )
    return public_url_for_key(key), size


def delete_object_by_public_url(url: str) -> bool:
    if not is_enabled() or not is_remote_url(url):
        return False
    key = object_key_from_public_url(url)
    if not key:
        return False
    try:
        _get_client().delete_object(Bucket=_bucket(), Key=key)
        return True
    except Exception as ex:  # pragma: no cover
        print(f"object_storage delete_object_by_public_url: {ex}")
        return True
