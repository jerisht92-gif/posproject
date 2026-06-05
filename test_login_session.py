"""Phase 2: login session / company-setup redirect rules (no DB)."""
import unittest

from signup_tenant import (
    FOUNDER_DUMMY_COMPANY_CODE,
    user_needs_company_setup,
)


class TestUserNeedsCompanySetup(unittest.TestCase):
    """T-L01 / T-L02 — when login should send user to Company Information."""

    def test_t_l01_pending_code_always_needs_setup(self):
        self.assertTrue(
            user_needs_company_setup(
                FOUNDER_DUMMY_COMPANY_CODE,
                user_company_name="Acme Ltd",
                company_information_exists=True,
            )
        )

    def test_t_l01_pending_without_company_name_still_needs_setup(self):
        self.assertTrue(
            user_needs_company_setup(
                "PENDING",
                user_company_name="",
                company_information_exists=False,
            )
        )

    def test_t_l02_member_with_profile_no_setup(self):
        self.assertFalse(
            user_needs_company_setup(
                "ACME01",
                user_company_name="acme ltd",
                company_information_exists=True,
            )
        )

    def test_member_real_code_no_profile_still_needs_setup(self):
        """Edge: registered code but company_information row missing."""
        self.assertTrue(
            user_needs_company_setup(
                "ACME01",
                user_company_name="acme ltd",
                company_information_exists=False,
            )
        )

    def test_no_company_name_skips_setup_redirect(self):
        self.assertFalse(
            user_needs_company_setup(
                "ACME01",
                user_company_name="",
                company_information_exists=False,
            )
        )

    def test_pending_case_insensitive(self):
        self.assertTrue(
            user_needs_company_setup(
                " pending ",
                user_company_name="X",
                company_information_exists=True,
            )
        )


if __name__ == "__main__":
    unittest.main()
