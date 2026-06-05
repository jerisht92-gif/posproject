"""Phase 5: tenant separation for Manage Users and Department & Roles (no DB)."""
import unittest

from signup_tenant import (
    FOUNDER_DUMMY_COMPANY_CODE,
    MASTERS_TENANT_TABLES,
    append_tenant_where,
    department_code_exists_for_tenant,
    resolve_masters_tenant_gate,
    row_visible_to_tenant,
    tenant_where_clause,
)


class TestMastersTenantGate(unittest.TestCase):
    """T-M01–T-M05 — session gate for manage-users / department-roles routes."""

    def test_t_m01_no_login_401(self):
        r = resolve_masters_tenant_gate("", "ACME01")
        self.assertFalse(r.allowed)
        self.assertEqual(r.http_status, 401)
        self.assertIn("login", r.message.lower())

    def test_t_m02_missing_company_code_401(self):
        r = resolve_masters_tenant_gate("admin@acme.com", "")
        self.assertFalse(r.allowed)
        self.assertEqual(r.http_status, 401)

    def test_t_m03_pending_company_code_403(self):
        r = resolve_masters_tenant_gate("founder@acme.com", FOUNDER_DUMMY_COMPANY_CODE)
        self.assertFalse(r.allowed)
        self.assertEqual(r.http_status, 403)
        self.assertIn("company setup", r.message.lower())

    def test_t_m04_registered_tenant_allowed(self):
        r = resolve_masters_tenant_gate("admin@acme.com", "ACME01")
        self.assertTrue(r.allowed)
        self.assertEqual(r.http_status, 200)
        self.assertEqual(r.message, "")

    def test_t_m05_pending_case_insensitive(self):
        r = resolve_masters_tenant_gate("founder@acme.com", " pending ")
        self.assertFalse(r.allowed)
        self.assertEqual(r.http_status, 403)


class TestMastersTenantWhere(unittest.TestCase):
    """T-M10–T-M12 — SQL tenant filter on users, departments, roles."""

    def test_t_m10_users_table_predicate(self):
        clause, params = tenant_where_clause("ACME01", table_alias="")
        self.assertIn("company_code", clause)
        self.assertNotIn("1=0", clause)
        self.assertEqual(params, ["ACME01"])

    def test_t_m11_departments_table_predicate(self):
        parts = ["LOWER(code) = LOWER(%s)"]
        params = ["sales"]
        append_tenant_where(parts, params, "ACME01", table_alias="")
        self.assertEqual(len(parts), 2)
        self.assertEqual(params, ["sales", "ACME01"])

    def test_t_m12_roles_table_with_alias(self):
        clause, params = tenant_where_clause("BETA99", table_alias="r")
        self.assertIn("r.company_code", clause)
        self.assertEqual(params, ["BETA99"])

    def test_empty_tenant_blocks_all_masters_queries(self):
        clause, params = tenant_where_clause("")
        self.assertEqual(clause, "1=0")
        self.assertEqual(params, [])

    def test_masters_tables_constant(self):
        self.assertEqual(MASTERS_TENANT_TABLES, ("users", "departments", "roles"))


class TestMastersRowIsolation(unittest.TestCase):
    """T-M20–T-M24 — IDOR: users, departments, roles must not cross tenants."""

    def test_t_m20_user_other_tenant_hidden(self):
        self.assertFalse(row_visible_to_tenant("BETA99", "ACME01"))

    def test_t_m21_user_same_tenant_visible(self):
        self.assertTrue(row_visible_to_tenant("acme01", "ACME01"))

    def test_t_m22_department_other_tenant_hidden(self):
        self.assertFalse(
            row_visible_to_tenant("BETA99", "ACME01"),
        )

    def test_t_m23_role_other_tenant_hidden(self):
        self.assertFalse(row_visible_to_tenant("BETA99", "ACME01"))

    def test_t_m24_row_without_company_code_hidden(self):
        self.assertFalse(row_visible_to_tenant(None, "ACME01"))
        self.assertFalse(row_visible_to_tenant("", "ACME01"))


class TestMastersDepartmentDuplicates(unittest.TestCase):
    """T-M30–T-M31 — duplicate department code only within tenant list."""

    def test_t_m30_duplicate_in_same_tenant_list(self):
        depts = [
            {"code": "SALES", "name": "Sales", "company_code": "ACME01"},
            {"code": "hr", "name": "HR", "company_code": "ACME01"},
        ]
        self.assertTrue(department_code_exists_for_tenant(depts, "sales"))
        self.assertTrue(department_code_exists_for_tenant(depts, " HR "))

    def test_t_m31_other_tenant_dept_not_in_scoped_list(self):
        """After DB tenant filter, BETA dept rows are absent — no false duplicate."""
        acme_only = [{"code": "SALES", "name": "Sales", "company_code": "ACME01"}]
        self.assertFalse(department_code_exists_for_tenant(acme_only, "OPS"))
        beta_row = {"code": "OPS", "name": "Ops", "company_code": "BETA99"}
        self.assertFalse(
            department_code_exists_for_tenant(acme_only, beta_row["code"]),
        )


if __name__ == "__main__":
    unittest.main()
