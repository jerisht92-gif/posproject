"""Phase 4: tenant-scoped data read / IDOR rules (no DB)."""
import unittest

from signup_tenant import (
    append_tenant_where,
    row_visible_to_tenant,
    tenant_where_clause,
)


class TestTenantWhereClause(unittest.TestCase):
    def test_t_c01_builds_predicate_and_param(self):
        clause, params = tenant_where_clause("ACME01", table_alias="p")
        self.assertIn("p.company_code", clause)
        self.assertEqual(params, ["ACME01"])

    def test_empty_tenant_blocks_all_rows(self):
        clause, params = tenant_where_clause("")
        self.assertEqual(clause, "1=0")
        self.assertEqual(params, [])

    def test_append_tenant_where_mutates_lists(self):
        parts = ["status = %s"]
        params = ["Active"]
        append_tenant_where(parts, params, "alpha01", table_alias="")
        self.assertEqual(len(parts), 2)
        self.assertEqual(params, ["Active", "ALPHA01"])


class TestRowVisibleToTenant(unittest.TestCase):
    """F1 / IDOR — cross-tenant row access."""

    def test_f1_same_tenant_visible(self):
        self.assertTrue(row_visible_to_tenant("ACME01", "acme01"))

    def test_f1_other_tenant_hidden(self):
        self.assertFalse(row_visible_to_tenant("BETA99", "ACME01"))

    def test_f1_null_row_code_not_visible(self):
        self.assertFalse(row_visible_to_tenant(None, "ACME01"))

    def test_f1_empty_session_not_visible(self):
        self.assertFalse(row_visible_to_tenant("ACME01", ""))


if __name__ == "__main__":
    unittest.main()
