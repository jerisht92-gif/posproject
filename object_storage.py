"""
S3-compatible object storage (e.g. Supabase Storage) for uploads.

Configure via environment variables (see .env.example). When not configured,
all upload paths fall back to local disk in app.py.

Object keys are stored under one bucket with a prefix per submodule, e.g.:
  quotation_attachments/QA-010/invoice_INV-010 (2).pdf
  supplier_attachments/SUP-001/contract.pdf
  invoice_attachments/INV-010/receipt.pdf
  deliverynote_attachments/DN-001/proof.pdf
  deliverynote_return_attachments/DNR-001/invoice.pdf
  (entity subfolder + original uploaded file name)

The public URL returned and stored in PostgreSQL is:
  {SUPABASE_PUBLIC_OBJECTS_BASE}/{object_key}
where SUPABASE_PUBLIC_OBJECTS_BASE ends with the same bucket id as S3_BUCKET, e.g.
  https://<project_ref>.supabase.co/storage/v1/object/public/uploaded-images
"""

from __future__ import annotations

import mimetypes
import os
import re
from typing import Optional, Tuple

# S3 / boto3 require bucket names to match (no spaces). Supabase bucket *id* must match.
_BUCKET_NAME_RE = re.compile(r"^[a-zA-Z0-9.\-_]{1,255}$")
_warned_invalid_bucket = False

try:
    import boto3
    from botocore.config import Config
except ImportError:  # pragma: no cover
    boto3 = None  # type: ignore
    Config = None  # type: ignore

# Prefixes inside the bucket (logical "subfolders")
MODULE_SUPPLIER_ATTACHMENTS = "supplier_attachments"
MODULE_QUOTATION_ATTACHMENTS = "quotation_attachments"
MODULE_INVOICE_ATTACHMENTS = "invoice_attachments"
MODULE_INVOICE_RETURN_ATTACHMENTS = "invoice_return_attachments"
MODULE_PURCHASE_ATTACHMENTS = "purchase_attachments"
MODULE_STOCK_ATTACHMENTS = "stock_attachments"
MODULE_CREDIT_NOTE_ATTACHMENTS = "credit_note_attachments"
MODULE_DELIVERY_NOTE_ATTACHMENTS = "deliverynote_attachments"
MODULE_DELIVERY_NOTE_RETURN_ATTACHMENTS = "deliverynote_return_attachments"
MODULE_PRODUCT_IMAGES = "product_images"
MODULE_IMPORTS = "imports"

_s3_client = None


def is_remote_url(value: Optional[str]) -> bool:
    s = (value or "").strip()
    return s.lower().startswith(("http://", "https://"))


def _s3_bucket_id_from_env() -> str:
    """Read S3_BUCKET with BOM/CRLF/quotes stripped (Windows .env / shell quirks)."""
    raw = os.getenv("S3_BUCKET")
    if raw is None:
        return ""
    s = raw.strip().strip('"').strip("'")
    s = s.replace("\ufeff", "").replace("\r", "").replace("\n", "")
    return s.strip()


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
                "Create a bucket in Supabase with a valid id (e.g. uploaded-images), then set "
                "S3_BUCKET and SUPABASE_PUBLIC_OBJECTS_BASE to that id. S3 uploads disabled until fixed."
            )
        return False
    return bool(
        (os.getenv("S3_ENDPOINT_URL") or "").strip()
        and (os.getenv("S3_ACCESS_KEY_ID") or "").strip()
        and (os.getenv("S3_SECRET_ACCESS_KEY") or "").strip()
        and b
        and (os.getenv("SUPABASE_PUBLIC_OBJECTS_BASE") or "").strip()
    )


def _bucket() -> str:
    """Bucket id for PutObject/DeleteObject — must pass S3 regex (same as Supabase bucket name)."""
    b = _s3_bucket_id_from_env()
    if not _BUCKET_NAME_RE.fullmatch(b):
        raise ValueError(
            "Invalid S3_BUCKET: use only letters, numbers, dot, hyphen, underscore (1–255 chars), "
            "e.g. uploaded-images. Match this id in Supabase Storage and in SUPABASE_PUBLIC_OBJECTS_BASE."
        )
    return b


def _public_base() -> str:
    return (os.getenv("SUPABASE_PUBLIC_OBJECTS_BASE") or "").strip().rstrip("/")


def public_url_for_key(object_key: str) -> str:
    key = (object_key or "").lstrip("/")
    base = _public_base()
    if not base:
        raise RuntimeError("SUPABASE_PUBLIC_OBJECTS_BASE must be set when using object storage")
    return f"{base}/{key}"


def object_key_from_public_url(url: str) -> Optional[str]:
    """Return object key for delete, given a URL we created with public_url_for_key."""
    if not is_remote_url(url):
        return None
    base = _public_base()
    u = (url or "").strip().split("?", 1)[0].rstrip("/")
    if not base:
        return None
    prefix = base + "/"
    if not u.startswith(prefix):
        return None
    return u[len(prefix) :].lstrip("/")


def _get_client():
    global _s3_client
    if _s3_client is not None:
        return _s3_client
    endpoint = (os.getenv("S3_ENDPOINT_URL") or "").strip()
    region = (os.getenv("S3_REGION") or "us-east-1").strip()
    _s3_client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=(os.getenv("S3_ACCESS_KEY_ID") or "").strip(),
        aws_secret_access_key=(os.getenv("S3_SECRET_ACCESS_KEY") or "").strip(),
        region_name=region,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
        ),
    )
    return _s3_client


def try_upload_stream(
    module_key: str, object_name: str, file_storage
) -> Optional[Tuple[str, int]]:
    """
    Upload a Werkzeug FileStorage to S3 if configured.

    object_name may be a single file name or a relative path under the module
    (e.g. "QA-013/invoice_INV-010 (2).pdf") — path segments must not be ".." or empty.

    Returns (public_url, size_bytes) or None to signal caller should save locally.
    """
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
    """Delete S3 object if URL matches our public base. Returns True if delete attempted."""
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
