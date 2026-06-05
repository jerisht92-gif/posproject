"""
Tenant isolation rules for public signup.

- First founder of a company uses the dummy setup code (PENDING) and becomes Super Admin.
- Additional users join with the company name + registered code (set later on Company Info).
"""
from __future__ import annotations

import re
from dataclasses import dataclass

# Setup code for new companies; real code is assigned on dashboard Company Info page.
FOUNDER_DUMMY_COMPANY_CODE = "PENDING"
FOUNDER_ROLE = "Super Admin"
MEMBER_ROLE = "User"


def normalize_company_name(name: str) -> str:
    return (name or "").strip()


def normalize_company_code(code: str) -> str:
    return (code or "").strip().upper()


def is_dummy_company_code(code: str) -> bool:
    return normalize_company_code(code) == FOUNDER_DUMMY_COMPANY_CODE


def tenant_has_registered_code(codes_for_name: list[str]) -> bool:
    """True when at least one user under this company has a non-dummy code."""
    return any(
        c and not is_dummy_company_code(c)
        for c in codes_for_name
    )


def user_needs_company_setup(
    user_company_code: str,
    *,
    user_company_name: str = "",
    company_information_exists: bool = False,
) -> bool:
    """True when user must complete Company Information (login/dashboard redirect)."""
    if is_dummy_company_code(user_company_code):
        return True
    if not normalize_company_name(user_company_name):
        return False
    return not company_information_exists


def normalize_role(role: str) -> str:
    return (role or "").strip().lower().replace(" ", "").replace("_", "")


def is_super_admin_role(role: str) -> bool:
    return normalize_role(role) == "superadmin"


def can_access_company_information(
    user_company_code: str,
    user_company_name: str,
    info_company_code: str,
    info_company_name: str,
    *,
    role: str,
) -> bool:
    """Whether the logged-in user may open Company Information for their tenant."""
    if is_super_admin_role(role):
        return True
    if is_dummy_company_code(user_company_code):
        return True
    if not info_company_code and not info_company_name:
        return True
    if user_company_code and info_company_code and user_company_code == info_company_code:
        return True
    un = normalize_company_name(user_company_name).lower()
    inn = normalize_company_name(info_company_name).lower()
    if un and inn and un == inn:
        return True
    if is_dummy_company_code(user_company_code) and un and inn:
        return un == inn
    return False


@dataclass(frozen=True)
class CompanyInfoSaveResult:
    ok: bool
    message: str = ""
    company_name: str = ""
    company_code: str = ""


def validate_company_information_save(
    submitted_company_name: str,
    submitted_company_code: str,
    *,
    tenant_company_name: str,
    is_super_admin: bool,
    code_used_by_other_tenant: bool,
) -> CompanyInfoSaveResult:
    """Pure rules for POST /api/company-information (no I/O)."""
    if not is_super_admin:
        return CompanyInfoSaveResult(
            ok=False,
            message="Only Super Admin can save company information.",
        )
    tenant_name = normalize_company_name(tenant_company_name)
    if not tenant_name:
        return CompanyInfoSaveResult(
            ok=False,
            message="No company is linked to your account.",
        )
    code = normalize_company_code(submitted_company_code)
    if not code:
        return CompanyInfoSaveResult(ok=False, message="Company code is required.")
    if is_dummy_company_code(code):
        return CompanyInfoSaveResult(
            ok=False,
            message="Choose a permanent company code (not PENDING).",
        )
    submitted_name = normalize_company_name(submitted_company_name)
    if submitted_name and submitted_name.lower() != tenant_name.lower():
        return CompanyInfoSaveResult(
            ok=False,
            message="Company name does not match your registered company.",
        )
    if code_used_by_other_tenant:
        return CompanyInfoSaveResult(
            ok=False,
            message="This company code is already used by another company.",
        )
    return CompanyInfoSaveResult(
        ok=True,
        company_name=tenant_name,
        company_code=code,
    )


_COMPANY_INFO_UNIQUE_LABELS = {
    "gstin": "Tax ID",
    "registration_no": "Registration number",
    "email": "Email",
    "website": "Website",
    "phone_number": "Phone number",
}


def normalize_company_info_website(value: str) -> str:
    w = (value or "").strip().lower()
    w = re.sub(r"^https?://", "", w)
    return w.rstrip("/")


def normalize_company_info_phone(value: str) -> str:
    return re.sub(r"\D", "", (value or "").strip())


def validate_company_info_unique_fields(
    *,
    gstin: str,
    registration_no: str,
    email: str,
    website: str,
    phone: str,
    conflicts: dict[str, str],
) -> CompanyInfoSaveResult:
    """Ensure tax id, registration, email, website, phone are not used by another company."""
    required = {
        "gstin": (gstin or "").strip(),
        "registration_no": (registration_no or "").strip(),
        "email": (email or "").strip(),
        "website": (website or "").strip(),
        "phone_number": (phone or "").strip(),
    }
    for field, val in required.items():
        if not val:
            label = _COMPANY_INFO_UNIQUE_LABELS[field]
            return CompanyInfoSaveResult(
                ok=False,
                message=f"{label} is required.",
            )
        other = (conflicts.get(field) or "").strip()
        if other:
            label = _COMPANY_INFO_UNIQUE_LABELS[field]
            return CompanyInfoSaveResult(
                ok=False,
                message=f"{label} is already used by \"{other}\".",
            )
    return CompanyInfoSaveResult(ok=True)


def tenant_where_clause(company_code: str, *, table_alias: str = "") -> tuple[str, list]:
    """SQL predicate fragment and params for tenant-scoped SELECT (no leading WHERE)."""
    code = normalize_company_code(company_code)
    if not code:
        return ("1=0", [])
    prefix = f"{table_alias}." if (table_alias or "").strip() else ""
    return (f"UPPER(TRIM({prefix}company_code)) = %s", [code])


def append_tenant_where(
    where_parts: list,
    params: list,
    company_code: str,
    *,
    table_alias: str = "",
) -> None:
    """Append tenant predicate to a list used as WHERE a AND b AND ..."""
    clause, extra = tenant_where_clause(company_code, table_alias=table_alias)
    where_parts.append(clause)
    params.extend(extra)


def row_visible_to_tenant(
    row_company_code: str | None,
    session_company_code: str,
) -> bool:
    """IDOR check: may the session tenant access this row?"""
    session_code = normalize_company_code(session_company_code)
    if not session_code:
        return False
    row_code = normalize_company_code(row_company_code or "")
    if not row_code:
        return False
    return row_code == session_code


# Tables scoped on Manage Users and Department & Roles pages.
MASTERS_TENANT_TABLES = ("users", "departments", "roles")


@dataclass(frozen=True)
class MastersTenantGateResult:
    allowed: bool
    http_status: int = 200
    message: str = ""


def resolve_masters_tenant_gate(
    user_email: str,
    company_code: str,
) -> MastersTenantGateResult:
    """
    Pure access gate for /manage-users, /department-roles, and related APIs (no I/O).

    Mirrors _masters_tenant_from_session / _session_tenant_code_or_response in app.py.
    """
    if not (user_email or "").strip():
        return MastersTenantGateResult(
            allowed=False,
            http_status=401,
            message="Session expired. Please login first.",
        )
    code = normalize_company_code(company_code)
    if not code:
        return MastersTenantGateResult(
            allowed=False,
            http_status=401,
            message="Session expired. Please login first.",
        )
    if is_dummy_company_code(code):
        return MastersTenantGateResult(
            allowed=False,
            http_status=403,
            message="Complete company setup before accessing this module.",
        )
    return MastersTenantGateResult(allowed=True)


def department_code_exists_for_tenant(
    departments: list,
    code: str,
) -> bool:
    """Case-insensitive duplicate check within a tenant-scoped department list."""
    new_code = (code or "").strip().lower()
    if not new_code:
        return False
    for dept in departments:
        if not isinstance(dept, dict):
            continue
        if (dept.get("code") or "").strip().lower() == new_code:
            return True
    return False


@dataclass(frozen=True)
class SignupTenantResult:
    ok: bool
    role: str = ""
    stored_company_code: str = ""
    message: str = ""
    is_founder: bool = False


def resolve_signup_tenant(
    company_name: str,
    company_code: str,
    *,
    company_name_exists: bool,
    codes_for_name: list[str],
    name_and_code_match: bool,
    registered_code_used_by_other_company: bool,
    company_registered_in_info: bool = False,
    info_company_code: str = "",
    code_registered_in_info: bool = False,
    code_info_company_name: str = "",
) -> SignupTenantResult:
    """
    Pure tenant resolution for signup (no I/O).

    New company  → company name not in DB → code must be PENDING.
    Join company → name + code must match users row or company_information.
    """
    code = normalize_company_code(company_code)
    cn_lower = normalize_company_name(company_name).lower()
    stored_code = code

    # --- New company founder ---
    if is_dummy_company_code(code):
        if company_name_exists or company_registered_in_info:
            return SignupTenantResult(
                ok=False,
                message=(
                    "This company is already registered. "
                    "Enter your company's registered code to join the team."
                ),
            )
        return SignupTenantResult(
            ok=True,
            role=FOUNDER_ROLE,
            stored_company_code=FOUNDER_DUMMY_COMPANY_CODE,
            is_founder=True,
        )

    # --- Join existing company (real code, not PENDING) ---

    if registered_code_used_by_other_company or (
        code_registered_in_info
        and code_info_company_name
        and code_info_company_name != cn_lower
    ):
        return SignupTenantResult(
            ok=False,
            message="Invalid company code. This code belongs to another company.",
        )

    company_known = company_name_exists or company_registered_in_info

    if not company_known:
        return SignupTenantResult(
            ok=False,
            message=(
                "This company is not registered yet. "
                f"To create a new company, use code {FOUNDER_DUMMY_COMPANY_CODE}."
            ),
        )

    # Company profile saved in Company Information
    if company_registered_in_info:
        expected = normalize_company_code(info_company_code)
        if code != expected:
            return SignupTenantResult(
                ok=False,
                message="Invalid company code. Check the code with your company admin.",
            )
        return SignupTenantResult(
            ok=True,
            role=MEMBER_ROLE,
            stored_company_code=expected,
            is_founder=False,
        )

    # Company exists in users only (founder may still be on PENDING)
    if not tenant_has_registered_code(codes_for_name):
        return SignupTenantResult(
            ok=False,
            message=(
                "Company setup is not complete yet. "
                "Ask your company Super Admin to finish Company Information, "
                f"or use {FOUNDER_DUMMY_COMPANY_CODE} if you are registering a new company."
            ),
        )

    if not name_and_code_match:
        return SignupTenantResult(
            ok=False,
            message="Invalid company code. Company name and code do not match.",
        )

    return SignupTenantResult(
        ok=True,
        role=MEMBER_ROLE,
        stored_company_code=stored_code,
        is_founder=False,
    )
