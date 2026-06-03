"""
Tenant isolation rules for public signup.

- First founder of a company uses the dummy setup code (PENDING) and becomes Super Admin.
- Additional users join with the company name + registered code (set later on Company Info).
"""
from __future__ import annotations

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
