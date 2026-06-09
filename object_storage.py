"""
S3 object storage for uploads (AWS S3 or generic S3-compatible endpoints).

Configure via environment variables in `.env`. When not configured,
upload paths fall back to local disk in app.py.

Object keys are scoped by deployment environment, then submodule, e.g.:
  Dev/purchase_attachments/PO-001/invoice.pdf
  QA/creditnote_attachments/CRN-001/file.pdf
  Prod/company_information_attachments/RR001/logo.png

Environment folder (Dev | QA | Prod) is taken from S3_ENV_PREFIX, or inferred from
the browser Host on each upload (matched against S3_DEV_HOSTS / S3_QA_HOSTS and
APP_BASE_URL order: first URL = Dev, second = QA), then DB_HOST as fallback, else Prod.

Public URLs stored in PostgreSQL:
  AWS/native: https://{bucket}.s3.{region}.amazonaws.com/{key}
  Custom endpoint: set S3_PUBLIC_BASE_URL explicitly
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
MODULE_COMPANY_INFORMATION_ATTACHMENTS = "company_information_attachments"

ENV_DEV = "Dev"
ENV_QA = "QA"
ENV_PROD = "Prod"
_VALID_ENV_PREFIXES = frozenset({ENV_DEV, ENV_QA, ENV_PROD})

ALL_MODULE_KEYS = (
    MODULE_SUPPLIER_ATTACHMENTS,
    MODULE_QUOTATION_ATTACHMENTS,
    MODULE_INVOICE_ATTACHMENTS,
    MODULE_INVOICE_RETURN_ATTACHMENTS,
    MODULE_PURCHASE_ATTACHMENTS,
    MODULE_STOCK_ATTACHMENTS,
    MODULE_CREDIT_NOTE_ATTACHMENTS,
    MODULE_DELIVERY_NOTE_ATTACHMENTS,
    MODULE_DELIVERY_NOTE_RETURN_ATTACHMENTS,
    MODULE_PRODUCT_IMAGES,
    MODULE_IMPORTS,
    MODULE_COMPANY_INFORMATION_ATTACHMENTS,
)

_s3_client = None


def _normalize_env_prefix(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return ENV_PROD
    lowered = raw.lower()
    if lowered in ("dev", "development"):
        return ENV_DEV
    if lowered in ("qa", "quality", "staging"):
        return ENV_QA
    if lowered in ("prod", "production"):
        return ENV_PROD
    if raw in _VALID_ENV_PREFIXES:
        return raw
    return ENV_PROD


def _host_from_url(value: str) -> str:
    s = (value or "").strip()
    if not s:
        return ""
    if "://" in s:
        s = s.split("://", 1)[1]
    return s.split("/", 1)[0].split(":", 1)[0].strip()


def _hosts_from_env(env_var: str) -> frozenset:
    raw = (os.getenv(env_var) or "").strip()
    if not raw:
        return frozenset()
    hosts = set()
    for part in raw.split(","):
        host = _host_from_url(part) or part.strip()
        if host:
            hosts.add(host)
    return frozenset(hosts)


def _dev_qa_host_sets() -> Tuple[frozenset, frozenset]:
    """Dev/QA host lists from S3_DEV_HOSTS / S3_QA_HOSTS plus APP_BASE_URL order."""
    dev_hosts = set(_hosts_from_env("S3_DEV_HOSTS"))
    qa_hosts = set(_hosts_from_env("S3_QA_HOSTS"))
    app_urls = [u.strip() for u in (os.getenv("APP_BASE_URL") or "").split(",") if u.strip()]
    if app_urls:
        dev_from_app = _host_from_url(app_urls[0])
        if dev_from_app:
            dev_hosts.add(dev_from_app)
    if len(app_urls) > 1:
        qa_from_app = _host_from_url(app_urls[1])
        if qa_from_app:
            qa_hosts.add(qa_from_app)
    return frozenset(dev_hosts), frozenset(qa_hosts)


def _request_host() -> str:
    """Host from the current HTTP request (browser URL), without port."""
    try:
        from flask import has_request_context, request

        if has_request_context():
            return _host_from_url(f"http://{request.host}")
    except (ImportError, RuntimeError):
        pass
    return ""


def _env_prefix_for_host(host: str, dev_hosts: frozenset, qa_hosts: frozenset) -> Optional[str]:
    h = (host or "").strip()
    if not h:
        return None
    if h in dev_hosts:
        return ENV_DEV
    if h in qa_hosts:
        return ENV_QA
    return None


def _env_prefix_from_hosts() -> Optional[str]:
    dev_hosts, qa_hosts = _dev_qa_host_sets()

    # Browser URL first: http://16.16.206.242/ → Dev, http://13.61.154.67/ → QA
    browser_prefix = _env_prefix_for_host(_request_host(), dev_hosts, qa_hosts)
    if browser_prefix:
        return browser_prefix

    db_host = (os.getenv("DB_HOST") or "").strip()
    db_prefix = _env_prefix_for_host(db_host, dev_hosts, qa_hosts)
    if db_prefix:
        return db_prefix

    for raw_url in (os.getenv("APP_BASE_URL") or "").split(","):
        app_prefix = _env_prefix_for_host(_host_from_url(raw_url), dev_hosts, qa_hosts)
        if app_prefix:
            return app_prefix
    return None


def get_env_prefix() -> str:
    """Return S3 top-level folder for this deployment: Dev, QA, or Prod."""
    explicit = (os.getenv("S3_ENV_PREFIX") or os.getenv("OBJECT_STORAGE_ENV") or "").strip()
    if explicit:
        return _normalize_env_prefix(explicit)
    detected = _env_prefix_from_hosts()
    return detected if detected else ENV_PROD


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


def _is_aws_native() -> bool:
    """True when using standard AWS S3 (no custom endpoint)."""
    endpoint = _endpoint_url()
    if not endpoint:
        return True
    return "amazonaws.com" in endpoint.lower()


def _derive_aws_public_base() -> str:
    bucket = _s3_bucket_id_from_env()
    region = _s3_region()
    if not bucket:
        return ""
    return f"https://{bucket}.s3.{region}.amazonaws.com"


def _public_base() -> str:
    explicit = ((os.getenv("S3_PUBLIC_BASE_URL") or "").strip()).rstrip("/")
    if explicit:
        return explicit
    if _is_aws_native():
        return _derive_aws_public_base()
    return ""


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
    # Do not require env keys here: boto3 can use IAM role credentials (EC2 metadata).
    if not _public_base():
        return False
    if _is_aws_native():
        return True
    # For custom endpoints, require explicit S3_PUBLIC_BASE_URL.
    return bool(_endpoint_url() and _public_base())


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
        raise RuntimeError("Could not derive S3 public base URL from S3_BUCKET/S3_REGION")
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


def _sanitize_relative_path(relative_name: str) -> str:
    rel = (relative_name or "file").replace("\\", "/").strip("/")
    parts = [p for p in rel.split("/") if p and p != "." and p != ".."]
    return "/".join(parts) or "file"


def _build_object_key(module_key: str, relative_name: str) -> str:
    rel = _sanitize_relative_path(relative_name)
    mod = (module_key or "").strip().strip("/")
    inner = f"{mod}/{rel}" if mod else rel
    return f"{get_env_prefix()}/{inner}"


def ensure_environment_folders() -> None:
    """Create Dev/QA/Prod module prefix markers in the bucket (S3 has no real folders)."""
    if not is_enabled():
        return
    env = get_env_prefix()
    client = _get_client()
    bucket = _bucket()
    try:
        from botocore.exceptions import ClientError
    except ImportError:  # pragma: no cover
        return

    for module_key in ALL_MODULE_KEYS:
        marker_key = f"{env}/{module_key}/.keep"
        try:
            client.head_object(Bucket=bucket, Key=marker_key)
        except ClientError as ex:
            code = (ex.response or {}).get("Error", {}).get("Code", "")
            if code not in ("404", "NoSuchKey", "NotFound"):
                print(f"object_storage ensure_environment_folders head {marker_key}: {ex}")
                continue
            try:
                client.put_object(
                    Bucket=bucket,
                    Key=marker_key,
                    Body=b"",
                    ContentType="application/octet-stream",
                )
            except Exception as put_ex:  # pragma: no cover
                print(f"object_storage ensure_environment_folders put {marker_key}: {put_ex}")


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
    }
    # Use explicit credentials only when provided; otherwise let boto3 resolve
    # credentials from IAM role / instance profile / default provider chain.
    if access_key and secret_key:
        client_kwargs["aws_access_key_id"] = access_key
        client_kwargs["aws_secret_access_key"] = secret_key

    if endpoint:
        client_kwargs["endpoint_url"] = endpoint
        client_kwargs["config"] = Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
        )
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
    rel = _sanitize_relative_path(object_name)
    key = _build_object_key(module_key, rel)
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


def try_copy_object(module_key: str, src_object_name: str, dest_object_name: str) -> Optional[str]:
    """Copy within the bucket under {env}/{module_key}/; returns public URL for destination or None."""
    if not is_enabled():
        return None
    src_parts = [
        p
        for p in (src_object_name or "").replace("\\", "/").split("/")
        if p and p not in (".", "..")
    ]
    dest_parts = [
        p
        for p in (dest_object_name or "").replace("\\", "/").split("/")
        if p and p not in (".", "..")
    ]
    if not src_parts or not dest_parts:
        return None
    src_key = _build_object_key(module_key, "/".join(src_parts))
    dest_key = _build_object_key(module_key, "/".join(dest_parts))
    if src_key == dest_key:
        return public_url_for_key(dest_key)
    bucket = _bucket()
    client = _get_client()
    try:
        client.copy_object(
            CopySource={"Bucket": bucket, "Key": src_key},
            Bucket=bucket,
            Key=dest_key,
        )
        try:
            client.delete_object(Bucket=bucket, Key=src_key)
        except Exception:
            pass
        return public_url_for_key(dest_key)
    except Exception as ex:  # pragma: no cover
        print(f"object_storage try_copy_object: {ex}")
        return None


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
