"""Phase 1: signup tenant isolation unit tests (no DB)."""
import unittest

from signup_tenant import (
    FOUNDER_DUMMY_COMPANY_CODE,
    FOUNDER_ROLE,
    MEMBER_ROLE,
    is_dummy_company_code,
    normalize_company_code,
    normalize_company_name,
    resolve_signup_tenant,
    tenant_has_registered_code,
)


class TestSignupTenantNormalization(unittest.TestCase):
    def test_normalize_company_code_uppercases(self):
        self.assertEqual(normalize_company_code("  acme01  "), "ACME01")

    def test_is_dummy_company_code_pending_variants(self):
        self.assertTrue(is_dummy_company_code("PENDING"))
        self.assertTrue(is_dummy_company_code(" pending "))
        self.assertFalse(is_dummy_company_code("ACME01"))

    def test_tenant_has_registered_code(self):
        self.assertFalse(tenant_has_registered_code(["PENDING", ""]))
        self.assertTrue(tenant_has_registered_code(["PENDING", "ACME01"]))


class TestSignupTenantFounder(unittest.TestCase):
    """A1, A2, A9 — new company with PENDING."""

    def test_a1_new_company_pending_ok(self):
        r = resolve_signup_tenant(
            "Acme Ltd",
            "PENDING",
            company_name_exists=False,
            codes_for_name=[],
            name_and_code_match=False,
            registered_code_used_by_other_company=False,
        )
        self.assertTrue(r.ok)
        self.assertEqual(r.role, FOUNDER_ROLE)
        self.assertEqual(r.stored_company_code, FOUNDER_DUMMY_COMPANY_CODE)
        self.assertTrue(r.is_founder)

    def test_a2_pending_rejected_when_name_in_users(self):
        r = resolve_signup_tenant(
            "Acme Ltd",
            "PENDING",
            company_name_exists=True,
            codes_for_name=[],
            name_and_code_match=False,
            registered_code_used_by_other_company=False,
        )
        self.assertFalse(r.ok)
        self.assertIn("already registered", r.message.lower())

    def test_a2_pending_rejected_when_name_in_company_info(self):
        r = resolve_signup_tenant(
            "Acme Ltd",
            "PENDING",
            company_name_exists=False,
            codes_for_name=[],
            name_and_code_match=False,
            registered_code_used_by_other_company=False,
            company_registered_in_info=True,
            info_company_code="ACME01",
        )
        self.assertFalse(r.ok)
        self.assertIn("already registered", r.message.lower())

    def test_a9_pending_case_insensitive(self):
        r = resolve_signup_tenant(
            "New Co",
            "pending",
            company_name_exists=False,
            codes_for_name=[],
            name_and_code_match=False,
            registered_code_used_by_other_company=False,
        )
        self.assertTrue(r.ok)
        self.assertEqual(r.stored_company_code, FOUNDER_DUMMY_COMPANY_CODE)


class TestSignupTenantJoin(unittest.TestCase):
    """A3–A8 — join existing company."""

    def test_a4_code_belongs_to_other_company_users(self):
        r = resolve_signup_tenant(
            "Acme Ltd",
            "BETA99",
            company_name_exists=True,
            codes_for_name=[],
            name_and_code_match=False,
            registered_code_used_by_other_company=True,
        )
        self.assertFalse(r.ok)
        self.assertIn("another company", r.message.lower())

    def test_a4_code_belongs_to_other_company_info(self):
        r = resolve_signup_tenant(
            "Acme Ltd",
            "BETA99",
            company_name_exists=False,
            codes_for_name=[],
            name_and_code_match=False,
            registered_code_used_by_other_company=False,
            code_registered_in_info=True,
            code_info_company_name="other corp",
        )
        self.assertFalse(r.ok)
        self.assertIn("another company", r.message.lower())

    def test_a5_unknown_company(self):
        r = resolve_signup_tenant(
            "Unknown Inc",
            "ACME01",
            company_name_exists=False,
            codes_for_name=[],
            name_and_code_match=False,
            registered_code_used_by_other_company=False,
        )
        self.assertFalse(r.ok)
        self.assertIn("not registered", r.message.lower())
        self.assertIn(FOUNDER_DUMMY_COMPANY_CODE, r.message)

    def test_a6_setup_incomplete_only_pending_codes(self):
        r = resolve_signup_tenant(
            "Acme Ltd",
            "ACME01",
            company_name_exists=True,
            codes_for_name=["PENDING"],
            name_and_code_match=False,
            registered_code_used_by_other_company=False,
        )
        self.assertFalse(r.ok)
        self.assertIn("setup is not complete", r.message.lower())

    def test_a7_wrong_code_vs_company_information(self):
        r = resolve_signup_tenant(
            "Acme Ltd",
            "WRONG1",
            company_name_exists=False,
            codes_for_name=[],
            name_and_code_match=False,
            registered_code_used_by_other_company=False,
            company_registered_in_info=True,
            info_company_code="ACME01",
        )
        self.assertFalse(r.ok)
        self.assertIn("invalid company code", r.message.lower())

    def test_a8_join_via_company_information_ok(self):
        r = resolve_signup_tenant(
            "Acme Ltd",
            "ACME01",
            company_name_exists=False,
            codes_for_name=[],
            name_and_code_match=False,
            registered_code_used_by_other_company=False,
            company_registered_in_info=True,
            info_company_code="acme01",
        )
        self.assertTrue(r.ok)
        self.assertEqual(r.role, MEMBER_ROLE)
        self.assertEqual(r.stored_company_code, "ACME01")
        self.assertFalse(r.is_founder)

    def test_a3_join_users_name_and_code_match(self):
        r = resolve_signup_tenant(
            "Acme Ltd",
            "ACME01",
            company_name_exists=True,
            codes_for_name=["ACME01"],
            name_and_code_match=True,
            registered_code_used_by_other_company=False,
        )
        self.assertTrue(r.ok)
        self.assertEqual(r.role, MEMBER_ROLE)
        self.assertEqual(r.stored_company_code, "ACME01")

    def test_a3_join_rejected_name_code_mismatch(self):
        r = resolve_signup_tenant(
            "Acme Ltd",
            "ACME99",
            company_name_exists=True,
            codes_for_name=["ACME01"],
            name_and_code_match=False,
            registered_code_used_by_other_company=False,
        )
        self.assertFalse(r.ok)
        self.assertIn("do not match", r.message.lower())


class TestSignupTenantEdgeCases(unittest.TestCase):
    def test_company_name_trimmed_for_info_code_mismatch(self):
        r = resolve_signup_tenant(
            "  Acme Ltd  ",
            "ACME01",
            company_name_exists=False,
            codes_for_name=[],
            name_and_code_match=False,
            registered_code_used_by_other_company=False,
            company_registered_in_info=True,
            info_company_code="ACME01",
            code_registered_in_info=True,
            code_info_company_name=normalize_company_name("Acme Ltd").lower(),
        )
        self.assertTrue(r.ok)

    def test_join_ok_when_info_and_users_both_known(self):
        r = resolve_signup_tenant(
            "Acme Ltd",
            "ACME01",
            company_name_exists=True,
            codes_for_name=["PENDING", "ACME01"],
            name_and_code_match=True,
            registered_code_used_by_other_company=False,
            company_registered_in_info=True,
            info_company_code="ACME01",
        )
        self.assertTrue(r.ok)
        self.assertEqual(r.stored_company_code, "ACME01")


if __name__ == "__main__":
    unittest.main()
