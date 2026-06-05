"""Phase 3: Company Information tenant rules (no DB)."""
import unittest

from signup_tenant import (
    FOUNDER_DUMMY_COMPANY_CODE,
    can_access_company_information,
    normalize_company_info_website,
    validate_company_information_save,
    validate_company_info_unique_fields,
)


class TestCanAccessCompanyInformation(unittest.TestCase):
    def test_t_c02_super_admin_always_allowed(self):
        self.assertTrue(
            can_access_company_information(
                "ACME01",
                "acme ltd",
                "OTHER99",
                "other ltd",
                role="Super Admin",
            )
        )

    def test_t_c02_member_same_tenant_by_code(self):
        self.assertTrue(
            can_access_company_information(
                "ACME01",
                "acme ltd",
                "ACME01",
                "acme ltd",
                role="User",
            )
        )

    def test_t_c08_member_other_tenant_denied(self):
        self.assertFalse(
            can_access_company_information(
                "ACME01",
                "acme ltd",
                "BETA99",
                "beta ltd",
                role="User",
            )
        )

    def test_pending_founder_allowed(self):
        self.assertTrue(
            can_access_company_information(
                FOUNDER_DUMMY_COMPANY_CODE,
                "new co",
                "",
                "",
                role="User",
            )
        )


class TestValidateCompanyInformationSave(unittest.TestCase):
    def test_t_c03_non_admin_cannot_save(self):
        r = validate_company_information_save(
            "Acme Ltd",
            "ACME01",
            tenant_company_name="Acme Ltd",
            is_super_admin=False,
            code_used_by_other_tenant=False,
        )
        self.assertFalse(r.ok)
        self.assertIn("Super Admin", r.message)

    def test_t_c06_pending_code_rejected(self):
        r = validate_company_information_save(
            "Acme Ltd",
            "PENDING",
            tenant_company_name="Acme Ltd",
            is_super_admin=True,
            code_used_by_other_tenant=False,
        )
        self.assertFalse(r.ok)
        self.assertIn("PENDING", r.message)

    def test_t_c04_code_taken_by_other_tenant(self):
        r = validate_company_information_save(
            "Acme Ltd",
            "TAKEN1",
            tenant_company_name="Acme Ltd",
            is_super_admin=True,
            code_used_by_other_tenant=True,
        )
        self.assertFalse(r.ok)
        self.assertIn("already used", r.message.lower())

    def test_t_c05_wrong_company_name_rejected(self):
        r = validate_company_information_save(
            "Evil Corp",
            "ACME01",
            tenant_company_name="Acme Ltd",
            is_super_admin=True,
            code_used_by_other_tenant=False,
        )
        self.assertFalse(r.ok)
        self.assertIn("does not match", r.message.lower())

    def test_founder_save_ok(self):
        r = validate_company_information_save(
            "Acme Ltd",
            "ACME01",
            tenant_company_name="Acme Ltd",
            is_super_admin=True,
            code_used_by_other_tenant=False,
        )
        self.assertTrue(r.ok)
        self.assertEqual(r.company_name, "Acme Ltd")
        self.assertEqual(r.company_code, "ACME01")

    def test_empty_submitted_name_uses_tenant(self):
        r = validate_company_information_save(
            "",
            "ACME01",
            tenant_company_name="Acme Ltd",
            is_super_admin=True,
            code_used_by_other_tenant=False,
        )
        self.assertTrue(r.ok)
        self.assertEqual(r.company_name, "Acme Ltd")


class TestCompanyInfoUniqueFields(unittest.TestCase):
    def test_website_normalization_strips_protocol(self):
        self.assertEqual(
            normalize_company_info_website("https://Example.COM/"),
            normalize_company_info_website("example.com"),
        )

    def test_duplicate_email_rejected(self):
        r = validate_company_info_unique_fields(
            gstin="TAX001",
            registration_no="REG12345678",
            email="dup@test.com",
            website="example.com",
            phone="9876543210",
            conflicts={"email": "Other Co"},
        )
        self.assertFalse(r.ok)
        self.assertIn("Email", r.message)

    def test_no_conflict_ok(self):
        r = validate_company_info_unique_fields(
            gstin="TAX002",
            registration_no="REG87654321",
            email="ok@test.com",
            website="mysite.com",
            phone="9123456789",
            conflicts={},
        )
        self.assertTrue(r.ok)

    def test_missing_phone_rejected(self):
        r = validate_company_info_unique_fields(
            gstin="TAX003",
            registration_no="REG11111111",
            email="a@test.com",
            website="b.com",
            phone="",
            conflicts={},
        )
        self.assertFalse(r.ok)
        self.assertIn("Phone", r.message)


if __name__ == "__main__":
    unittest.main()
