"""RBAC constants, route mapping, and permission helpers (rbac/ package)."""
from __future__ import annotations

RBAC_DEFAULT_DEPARTMENT = "General"
RBAC_DEFAULT_DEPARTMENT_CODE = "GENERAL"
RBAC_DEFAULT_BRANCH = "All Branches"

# Per-user custom limits are stored on users.user_permission (JSONB), like roles.permissions.

RBAC_MODULES = (
    "manage_users",
    "company_information",
    "department_roles",
    "products",
    "customer",
    "suppliers",
    "new_enquiry",
    "quotation",
    "quick_billing",
    "sales_order",
    "delivery_note",
    "delivery_note_return",
    "invoice",
    "invoice_return",
    "purchase",
    "stock_receipt",
    "stock_return",
    "credit_note",
    "debit_note",
    "payment",
)

RBAC_SUPER_ADMIN_ONLY_MODULES = frozenset({
    "manage_users",
    "company_information",
    "department_roles",
    "purchase",
    "stock_receipt",
    "stock_return",
    "credit_note",
    "debit_note",
    "payment",
})

RBAC_LEGACY_PARENT_SPLITS = {
    "sales": ("quick_billing", "sales_order"),
    "delivery": ("delivery_note", "delivery_note_return"),
    "stock": ("stock_receipt", "stock_return"),
    "credit": ("credit_note",),
    "debit": ("debit_note",),
}

RBAC_DEFAULT_ROLES = (
    {
        "role_name": "Super Admin",
        "description": "Full access to all modules and company settings.",
        "policy": "super_admin",
    },
    {
        "role_name": "Admin",
        "description": "Full access to all modules; use Limit Access to restrict.",
        "policy": "admin",
    },
    {
        "role_name": "User",
        "description": "No access until permissions are assigned.",
        "policy": "user",
    },
)

RBAC_MODULE_LABELS = {
    "manage_users": "Manage Users",
    "company_information": "Company Information",
    "department_roles": "Department & Roles",
    "products": "Products",
    "customer": "Customer",
    "suppliers": "Suppliers",
    "new_enquiry": "Enquiry List",
    "quotation": "Quotation",
    "quick_billing": "Quick Billing",
    "sales_order": "Sales Order",
    "delivery_note": "Delivery Note",
    "delivery_note_return": "Delivery Note Return",
    "invoice": "Invoice",
    "invoice_return": "Invoice Return",
    "purchase": "Purchase",
    "stock_receipt": "Stock Receipt",
    "stock_return": "Stock Return",
    "credit_note": "Credit Note",
    "debit_note": "Debit Note",
    "payment": "Payment",
}

RBAC_PERMISSION_MATRIX_EXCLUDE = frozenset({
    "manage_users",
    "department_roles",
    "company_information",
})

RBAC_PERMISSION_MATRIX_MODULES = tuple(
    m for m in RBAC_MODULES if m not in RBAC_PERMISSION_MATRIX_EXCLUDE
)

RBAC_PERMISSION_GROUPS = (
    ("Masters", ("products", "customer", "suppliers")),
    ("CRM", ("new_enquiry", "quotation")),
    (
        "Sales",
        (
            "quick_billing",
            "sales_order",
            "delivery_note",
            "delivery_note_return",
            "invoice",
            "invoice_return",
        ),
    ),
    ("Purchase", ("purchase", "stock_receipt", "stock_return")),
    ("Finance", ("credit_note", "debit_note", "payment")),
)


RBAC_DEFAULT_ROLE_NAMES = tuple(spec["role_name"] for spec in RBAC_DEFAULT_ROLES)

RBAC_MODULE_ALIASES = {
    "enquiry_list": "new_enquiry",
    "company_info": "company_information",
    "create_user": "manage_users",
    "grant_user_permissions_page": "manage_users",
    "purchase_page": "purchase",
    "invoice_main": "invoice",
    "invoice_list": "invoice",
    "new_invoice": "invoice",
    "new_invoice_return": "invoice_return",
    "invoice_return_list": "invoice_return",
    "inv_return": "invoice_return",
    "deliverynote_return": "delivery_note_return",
    "dnr_page_list": "delivery_note_return",
    "dn_return": "delivery_note_return",
    "new_credit_note": "credit_note",
    "new_debit_note": "debit_note",
    "create_payment": "payment",
    "finance": "payment",
    "sales_order": "sales_order",
    "quick_billing": "quick_billing",
    "delivery_note": "delivery_note",
    "delivery_note_return": "delivery_note_return",
    "stock_receipt": "stock_receipt",
    "stock_return": "stock_return",
    "suppliers": "suppliers",
    "supplier_new": "suppliers",
}

RBAC_ROUTE_MODULES = {
    # --- manage_users ---
    "manage_users": "manage_users",
    "create_user": "manage_users",
    "grant_user_permissions_page": "manage_users",
    "api_user_permissions": "manage_users",
    "api_get_users": "manage_users",
    "api_get_user": "manage_users",
    "api_get_user_by_id": "manage_users",
    "api_create_user": "manage_users",
    "api_update_user": "manage_users",
    "update_user": "manage_users",
    "delete_user": "manage_users",
    # --- company_information ---
    "company_info": "company_information",
    "company_logo": "company_information",
    "save_company_information": "company_information",
    # --- department_roles ---
    "department_roles": "department_roles",
    "department_new": "department_roles",
    "save_role": "department_roles",
    "edit_role": "department_roles",
    "delete_role": "department_roles",
    "create_department": "department_roles",
    "api_departments": "department_roles",
    "api_get_department": "department_roles",
    "api_create_department": "department_roles",
    "api_update_department": "department_roles",
    "api_delete_department": "department_roles",
    "api_roles": "department_roles",
    "api_get_role": "department_roles",
    "api_create_role": "department_roles",
    "api_update_role": "department_roles",
    "api_delete_role": "department_roles",
    # --- products ---
    "products": "products",
    "create_new_product_page": "products",
    "save_product": "products",
    "get_product": "products",
    "get_products": "products",
    "get_products_new": "products",
    "get_product_config": "products",
    "get_new_product_id": "products",
    "import_products": "products",
    "import_products_validated": "products",
    "download_template": "products",
    "upload_file": "products",
    "api_products": "products",
    "api_get_product": "products",
    "api_create_product": "products",
    "api_update_product": "products",
    "api_patch_product": "products",
    "api_delete_product": "products",
    "api_import_products": "products",
    "api_product_categories": "products",
    "api_product_tax_codes": "products",
    "api_product_uoms": "products",
    "api_product_warehouses": "products",
    "api_product_sizes": "products",
    "api_product_colors": "products",
    "api_product_suppliers": "products",
    "suppliers": "suppliers",
    "supplier_new": "suppliers",
    "create_supplier": "suppliers",
    "update_supplier": "suppliers",
    "delete_supplier": "suppliers",
    "get_supplier": "suppliers",
    "get_suppliers": "suppliers",
    "get_new_supplier_id": "suppliers",
    "check_supplier_gstin": "suppliers",
    "get_supplier_attachments": "suppliers",
    "upload_supplier_attachment": "suppliers",
    "delete_supplier_attachment": "suppliers",
    "download_supplier_attachment": "suppliers",
    "view_supplier_attachment": "suppliers",
    "get_suppliers_purchase": "suppliers",
    # --- customer ---
    "customer": "customer",
    "addnew_customer": "customer",
    "create_customer": "customer",
    "update_customer": "customer",
    "delete_customer": "customer",
    "import_customer": "customer",
    "import_customers_validated": "customer",
    "download_customer_template": "customer",
    "upload_customer_file": "customer",
    "api_customer": "customer",
    "api_get_customer": "customer",
    "api_get_customers": "customer",
    "api_update_customer": "customer",
    "api_delete_customer": "customer",
    "get_customers": "customer",
    "get_customer_by_name": "customer",
    "get_customers_quotation": "customer",
    "get_customer_payment_term": "customer",
    "get_new_customer_id": "customer",
    "get_master_customer_id": "customer",
    "check_customer_po": "customer",
    # --- new_enquiry ---
    "enquiry_list": "new_enquiry",
    "new_enquiry": "new_enquiry",
    "save_enquiry": "new_enquiry",
    "update_enquiry": "new_enquiry",
    "update_enquiry_items": "new_enquiry",
    "delete_enquiry": "new_enquiry",
    "delete_enquiry_item": "new_enquiry",
    "get_enquiry": "new_enquiry",
    "get_enquiry_items": "new_enquiry",
    "get_enquiry_add_items_": "new_enquiry",
    "check_email_enquiry": "new_enquiry",
    "api_enquiries_list": "new_enquiry",
    "api_enquiries_get_one": "new_enquiry",
    "api_enquiries_create": "new_enquiry",
    "api_enquiries_update": "new_enquiry",
    "api_enquiries_delete": "new_enquiry",
    # --- quotation ---
    "quotation": "quotation",
    "add_new_quotation": "quotation",
    "save_quotation": "quotation",
    "delete_quotation": "quotation",
    "get_quotation": "quotation",
    "get_single_quotation": "quotation",
    "get_quotations_by_status": "quotation",
    "update_quotation_status": "quotation",
    "send_quotation": "quotation",
    "generate_pdf": "quotation",
    "generate_quotation_id_route": "quotation",
    "check_quotation": "quotation",
    "debug_quotations": "quotation",
    "api_quotations": "quotation",
    "api_create_quotation": "quotation",
    "api_send_quotation_email": "quotation",
    # --- sales ---
    "sales_order": "sales_order",
    "sales_order_compat": "sales_order",
    "sales_order_new": "sales_order",
    "sales_order_edit": "sales_order",
    "sales_order_pdf": "sales_order",
    "sales_order_email": "sales_order",
    "quick_billing": "quick_billing",
    "quick_billing_deleted": "quick_billing",
    "save_quick_bill": "quick_billing",
    "handle_hold_bill": "quick_billing",
    "get_sales_order": "sales_order",
    "get_sales_order_purchase": "sales_order",
    "get_sales_products": "sales_order",
    "api_products_qb": "quick_billing",
    "api_quick_billing_list": "quick_billing",
    "api_quick_billing_get": "quick_billing",
    "api_quick_billing_create": "quick_billing",
    "api_quick_billing_update": "quick_billing",
    "api_quick_billing_delete": "quick_billing",
    "api_quick_billing_new_id": "quick_billing",
    # --- delivery ---
    "delivery_note": "delivery_note",
    "delivery_note_new": "delivery_note",
    "delivery_note_form": "delivery_note",
    "delivery_note_acknowledgement": "delivery_note",
    "delivery_note_pod_download": "delivery_note",
    "delivery_note_pod_delete": "delivery_note",
    "delivery_note_pdf": "delivery_note",
    "delivery_note_print": "delivery_note",
    "deliverynote_return_form": "delivery_note_return",
    "delivery_note_return_pdf": "delivery_note_return",
    "dnr_page_list": "delivery_note_return",
    "dnr_new_page": "delivery_note_return",
    "api_delivery_notes": "delivery_note",
    "api_delivery_note_one": "delivery_note",
    "api_next_dnr_id": "delivery_note_return",
    "get_delivery_note_returns": "delivery_note_return",
    "get_delivery_note_return_one": "delivery_note_return",
    "save_delivery_note_return": "delivery_note_return",
    "cancel_delivery_note_return": "delivery_note_return",
    "email_delivery_note_return": "delivery_note_return",
    # --- invoice ---
    "invoice_list": "invoice",
    "invoice_return_list": "invoice_return",
    "new_invoice": "invoice",
    "new_invoice_return": "invoice_return",
    "save_invoice": "invoice",
    "save_invoice_return": "invoice_return",
    "update_invoice": "invoice",
    "update_invoice_status": "invoice",
    "update_invoice_return_status": "invoice_return",
    "update_invoice_return_items_summary": "invoice_return",
    "get_invoice": "invoice",
    "get_invoice_api": "invoice",
    "get_invoice_details": "invoice",
    "get_invoices": "invoice",
    "get_invoices_payments": "invoice",
    "get_invoice_statuses": "invoice",
    "get_invoice_return_data": "invoice_return",
    "generate_invoice_return": "invoice_return",
    "invoice_pdf": "invoice",
    "invoice_return_pdf": "invoice_return",
    "send_invoice_email_api": "invoice",
    "send_invoice_return_email_api": "invoice_return",
    "add_payment_to_invoice_summary": "invoice",
    "api_get_invoice_for_return": "invoice_return",
    "api_invoice_returns": "invoice_return",
    "add_comment_invoice": "invoice",
    "add_comment_invoice_return": "invoice_return",
    "get_comments_invoice": "invoice",
    "get_comments_invoice_return": "invoice_return",
    "get_attachments_invoice": "invoice",
    "get_attachments_invoice_return": "invoice_return",
    "upload_attachment_invoice": "invoice",
    "upload_attachment_invoice_return": "invoice_return",
    "download_attachment_invoice": "invoice",
    "download_invoice_return_attachment": "invoice_return",
    "view_attachment_invoice": "invoice",
    "view_invoice_return_attachment": "invoice_return",
    "delete_invoice_attachment": "invoice",
    "delete_attachment_invoice_return": "invoice_return",
    # --- credit_note / debit_note ---
    "credit_note": "credit_note",
    "new_credit_note": "credit_note",
    "debit_note": "debit_note",
    "new_debit_note": "debit_note",
}


def _rbac_module_for_endpoint(endpoint):
    if not endpoint:
        return None
    return RBAC_ROUTE_MODULES.get(endpoint)


def _validate_rbac_route_modules():
    invalid = {
        ep: mod for ep, mod in RBAC_ROUTE_MODULES.items() if mod not in RBAC_MODULES
    }
    if invalid:
        raise ValueError(
            "RBAC_ROUTE_MODULES values must match RBAC_MODULES keys exactly: "
            + repr(invalid)
        )


_validate_rbac_route_modules()

RBAC_ROUTE_SKIP_PREFIXES = ("/static/",)
RBAC_ROUTE_SKIP_ENDPOINTS = frozenset({
    None,
    "static",
    "company_logo",
    "login",
    "login_post",
    "verify_login_otp",
    "logout",
    "dashboard",
    "profile",
    "home",
    "forgot_password",
    "send_reset_link",
    "check_email",
    "signup",
    "validate_signup_company",
    "send_otp",
    "verify_otp",
    "api_role_permissions_preview",
    "api_company_branches",
    "api_session_permissions",
    "api_monthly_sales",
    "api_top_products",
    "top_products",
    "search",
    "crm",
    "change_password",
    "reset_password",
})

RBAC_PATH_PREFIX_RULES = tuple(
    sorted(
        (
            ("/api/users/", "manage_users"),
            ("/api/user/", "manage_users"),
            ("/api/user-permissions", "manage_users"),
            ("/manage-users", "manage_users"),
            ("/create-user", "manage_users"),
            ("/update-user/", "manage_users"),
            ("/delete-user/", "manage_users"),
            ("/grant-permissions", "manage_users"),
            ("/api/company-information", "company_information"),
            ("/company_info", "company_information"),
            ("/api/departments", "department_roles"),
            ("/api/roles", "department_roles"),
            ("/department-roles", "department_roles"),
            ("/department-role/", "department_roles"),
            ("/save_role", "department_roles"),
            ("/api/products", "products"),
            ("/api/product-", "products"),
            ("/products/create", "products"),
            ("/products", "products"),
            ("/save-product", "products"),
            ("/api/save-quick-bill", "quick_billing"),
            ("/api/save-po-purchase", "purchase"),
            ("/api/save-stock-return", "stock_return"),
            ("/api/stock-return-attachments", "stock_return"),
            ("/api/stock-return/", "stock_return"),
            ("/api/stock-returns", "stock_return"),
            ("/api/add-stock-return-comment", "stock_return"),
            ("/api/get-stock-return-comments", "stock_return"),
            ("/api/get-stock-return-files", "stock_return"),
            ("/api/upload-stock-return-file", "stock_return"),
            ("/api/delete-stock-return-file", "stock_return"),
            ("/generate-stock-return-pdf", "stock_return"),
            ("/api/save-stock", "stock_receipt"),
            ("/save-invoice-return", "invoice_return"),
            ("/import-products", "products"),
            ("/import-products-validated", "products"),
            ("/download-template", "products"),
            ("/import", "products"),
            ("/upload", "products"),
            ("/api/customers", "customer"),
            ("/api/customer/", "customer"),
            ("/api/customer", "customer"),
            ("/addnew-customer", "customer"),
            ("/import-customer", "customer"),
            ("/import-customers-validated", "customer"),
            ("/update-customer/", "customer"),
            ("/delete-customer/", "customer"),
            ("/upload-customer", "customer"),
            ("/download-customer-template", "customer"),
            ("/customer", "customer"),
            ("/api/enquiries", "new_enquiry"),
            ("/api/enquiry-", "new_enquiry"),
            ("/api/enquiry/", "new_enquiry"),
            ("/enquiry-list", "new_enquiry"),
            ("/new-enquiry", "new_enquiry"),
            ("/save-enquiry", "new_enquiry"),
            ("/update-enquiry", "new_enquiry"),
            ("/delete-enquiry", "new_enquiry"),
            ("/generate-enquiry-id", "new_enquiry"),
            ("/get-enquiry-add-items", "new_enquiry"),
            ("/check-email-enquiry", "new_enquiry"),
            ("/enquiry", "new_enquiry"),
            ("/api/quotations", "quotation"),
            ("/api/quotation", "quotation"),
            ("/add-new-quotation", "quotation"),
            ("/save-quotation", "quotation"),
            ("/get-quotation", "quotation"),
            ("/get-quotations/", "quotation"),
            ("/delete-quotation/", "quotation"),
            ("/update-quotation", "quotation"),
            ("/send-quotation/", "quotation"),
            ("/generate-pdf/", "quotation"),
            ("/get-comments/", "quotation"),
            ("/add-comment", "quotation"),
            ("/quotation", "quotation"),
            ("/api/sales-order", "sales_order"),
            ("/api/sales-products", "sales"),
            ("/api/sales", "sales"),
            ("/sales-order", "sales_order"),
            ("/sales_order", "sales_order"),
            ("/quick-billing", "quick_billing"),
            ("/quick_billing", "quick_billing"),
            ("/quick-removebilling", "quick_billing"),
            ("/get-sales-order/", "sales_order"),
            ("/api/delivery-notes", "delivery_note"),
            ("/api/delivery", "delivery"),
            ("/delivery_note", "delivery_note"),
            ("/delivery-note", "delivery_note"),
            ("/dnr", "delivery_note_return"),
            ("/api/invoice", "invoice"),
            ("/invoice-return", "invoice_return"),
            ("/invoice_return", "invoice_return"),
            ("/generate-invoice-return", "invoice"),
            ("/get-invoice", "invoice"),
            ("/new-invoice", "invoice"),
            ("/save-invoice", "invoice"),
            ("/update-invoice/", "invoice"),
            ("/invoice/", "invoice"),
            
            ("/suppliers", "suppliers"),
            ("/supplier", "suppliers"),
            ("/purchase", "purchase"),
            ("/api/purchase", "purchase"),
            ("/delete_po/", "purchase"),
            ("/api/purchase-orders", "purchase"),
            ("/generate-purchase", "purchase"),
            ("/api/purchase-comments", "purchase"),
            ("/stock-receipt", "stock_receipt"),
            ("/stock_receipt", "stock_receipt"),
            ("/stock-return", "stock_return"),
            ("/stock_return", "stock_return"),
            ("/api/stock", "stock_receipt"),
            ("/api/stock-comments", "stock_receipt"),
            ("/generate-grn", "stock_receipt"),
            ("/generate-srn", "stock_return"),
            ("/api/get-stock-return-comments", "stock_return"),
            ("/credit-note", "credit_note"),
            ("/credit_note", "credit_note"),
            ("/new-credit-note", "credit_note"),
            ("/api/credit", "credit_note"),
            ("/debit-note", "debit_note"),
            ("/debit_note", "debit_note"),
            ("/new-debit-note", "debit_note"),
            ("/api/debit", "debit_note"),
            ("/create-payment", "payment"),
            ("/payment", "payment"),
            ("/delivery-note-return", "delivery_note_return"),
            ("/delivery_note_return", "delivery_note_return"),
            ("/deliverynote_return", "delivery_note_return"),
            ("/api/save-delivery-note-return", "delivery_note_return"),
            ("/api/cancel-delivery-note-return", "delivery_note_return"),
            ("/api/delivery-note-return", "delivery_note_return"),
            ("/api/delivery-note-returns", "delivery_note_return"),
            ("/invoice", "invoice"),
        ),
        key=lambda item: len(item[0]),
        reverse=True,
    )
)

RBAC_PATH_SHARED_ANY = {
    "/get-customers-quotation": ("customer", "quotation", "quick_billing", "sales_order"),
    "/api/customer-by-name": ("customer", "quotation", "quick_billing", "sales_order", "invoice"),
    "/api/customers/new-id": ("customer",),
    "/api/customers/master-id": ("customer",),
}


def _normalize_rbac_module_key(module_key):
    key = (module_key or "").strip()
    if not key:
        return key
    return RBAC_MODULE_ALIASES.get(key, key)


def rbac_permission_targets_for_key(key):
    key = (key or "").strip()
    if not key:
        return ()
    if key in RBAC_LEGACY_PARENT_SPLITS:
        return tuple(c for c in RBAC_LEGACY_PARENT_SPLITS[key] if c in RBAC_MODULES)
    canon = _normalize_rbac_module_key(key)
    if canon in RBAC_MODULES:
        return (canon,)
    return ()


def _merge_rbac_permission_dict(left, right):
    left = left if isinstance(left, dict) else _rbac_empty_perm()
    right = right if isinstance(right, dict) else _rbac_empty_perm()
    if left.get("full_access") or right.get("full_access"):
        return _rbac_full_perm()
    return _enforce_view_required({
        "full_access": False,
        "view": bool(left.get("view")) or bool(right.get("view")),
        "create": bool(left.get("create")) or bool(right.get("create")),
        "edit": bool(left.get("edit")) or bool(right.get("edit")),
        "delete": bool(left.get("delete")) or bool(right.get("delete")),
    })


def _rbac_empty_perm():
    return {"full_access": False, "view": False, "create": False, "edit": False, "delete": False}


def _rbac_full_perm():
    return {"full_access": True, "view": True, "create": True, "edit": True, "delete": True}


def _enforce_view_required(perm):
    """Module page access requires view; other actions cannot be granted without it."""
    perm = perm if isinstance(perm, dict) else _rbac_empty_perm()
    if perm.get("full_access"):
        return _rbac_full_perm()
    if not perm.get("view"):
        return _rbac_empty_perm()
    return {
        "full_access": False,
        "view": True,
        "create": bool(perm.get("create")),
        "edit": bool(perm.get("edit")),
        "delete": bool(perm.get("delete")),
    }


def _rbac_permissions_for_policy(policy: str) -> dict:
    if policy in ("super_admin", "admin"):
        return {m: _rbac_full_perm() for m in RBAC_MODULES}
    return {m: _rbac_empty_perm() for m in RBAC_MODULES}


def rbac_menu_visible(module_key, *, perms=None, super_admin_only=False) -> bool:
    """True when a sidebar link should be shown (not merely disabled)."""
    if super_admin_only:
        return bool((perms or {}).get("is_super_admin"))
    p = perms if isinstance(perms, dict) else {}
    if p.get("is_super_admin") and not p.get("has_custom_permissions"):
        return True
    canon = _normalize_rbac_module_key(module_key)
    if canon == "company_information":
        return True
    if not canon:
        return False
    mod = p.get(canon) or {}
    if mod.get("full_access"):
        return True
    return bool(mod.get("view"))


def rbac_menu_group_visible(module_entries, *, perms=None) -> bool:
    """True when any item in a sidebar group should be shown."""
    for module_key, super_admin_only in module_entries:
        if rbac_menu_visible(
            module_key,
            perms=perms,
            super_admin_only=bool(super_admin_only),
        ):
            return True
    return False


def rbac_has_any_module_view(perms, *, exclude_company_information=True) -> bool:
    """True when user has view (or better) on any assignable module."""
    if not isinstance(perms, dict):
        return False
    if perms.get("is_super_admin") and not perms.get("has_custom_permissions"):
        return True
    for mod_key in RBAC_MODULES:
        if exclude_company_information and mod_key == "company_information":
            continue
        mod = perms.get(mod_key) or {}
        if mod.get("full_access") or mod.get("view"):
            return True
    return False


def rbac_post_login_landing_path(perms, *, needs_company_setup=False) -> str:
    """First page after login: company setup/restricted users → Company Information only."""
    if needs_company_setup or rbac_restricted_to_company_info_only(
        perms, needs_company_setup=needs_company_setup
    ):
        return "/company_info"
    if rbac_has_any_module_view(perms):
        return "/dashboard"
    return "/company_info"


def rbac_restricted_to_company_info_only(perms, *, needs_company_setup=False) -> bool:
    if needs_company_setup:
        return True
    if not isinstance(perms, dict):
        return True
    if perms.get("is_super_admin") and not perms.get("has_custom_permissions"):
        return False
    for mod_key in RBAC_MODULES:
        if mod_key == "company_information":
            continue
        mod = perms.get(mod_key) or {}
        if mod.get("full_access"):
            return False
        if mod.get("view") or mod.get("create") or mod.get("edit") or mod.get("delete"):
            return False
    return True


def rbac_policy_for_default_role(role_name: str) -> str | None:
    rn = (role_name or "").strip().lower().replace(" ", "").replace("_", "")
    if rn == "superadmin":
        return "super_admin"
    if rn == "admin":
        return "admin"
    if rn == "user":
        return "user"
    for spec in RBAC_DEFAULT_ROLES:
        if spec["role_name"].strip().lower() == (role_name or "").strip().lower():
            return spec["policy"]
    return None


def rbac_default_permissions_for_role_name(role_name: str) -> dict:
    policy = rbac_policy_for_default_role(role_name)
    if not policy:
        return {m: _rbac_empty_perm() for m in RBAC_MODULES}
    return _rbac_permissions_for_policy(policy)


# Path fragments that mean edit/save-update (even on POST).
RBAC_ACTION_EDIT_PATH_MARKERS = (
    "/update",
    "/edit",
    "update-items",
    "update-status",
)

# GET form pages: opening a create screen needs create; edit screen needs edit.
RBAC_GET_FORM_CREATE_PREFIXES = (
    "/products/create",
    "/create-new-product",
    "/addnew-customer",
    "/customer-addnew-customer",
    "/create-department",
    "/department-role/create",
    "/department-roles/create",
    "/create-user",
    "/supplier-new",
    "/supplier_new",
    "/new-enquiry",
    "/add-new-quotation",
    "/new-invoice",
    "/new-invoice-return",
    "/deliverynote-new",
    "/deliverynotereturn-new",
    "/sales-new",
    "/stock-new",
    "/stock-new-return",
    "/credit-new",
    "/debit-new",
    "/create-payment",
    "/purchase-order",
)

RBAC_GET_FORM_EDIT_QUERY_KEYS = (
    "user_id",
    "supplier_id",
    "customer_id",
    "product_id",
    "enquiry_id",
    "quotation_id",
    "invoice_id",
    "order_id",
    "edit_id",
)


def rbac_path_is_comment_request(path: str) -> bool:
    """True when the request is a comment read/write API (not the whole document save)."""
    p = (path or "").lower()
    markers = (
        "/comments",
        "/comment",
        "purchase-comments",
        "stock-comments",
        "stock-return-comments",
        "/get-comments",
        "/add-comment",
    )
    return any(m in p for m in markers)


def _path_indicates_edit_action(path: str) -> bool:
    p = (path or "").lower()
    return any(marker in p for marker in RBAC_ACTION_EDIT_PATH_MARKERS)


def rbac_action_from_get_path(path, query_args=None) -> str:
    """Map GET requests to view / create-form / edit-form actions."""
    p = (path or "").lower().rstrip("/") or "/"
    args = query_args or {}

    if p.startswith("/create-user"):
        try:
            uid = int(args.get("user_id") or 0)
        except (TypeError, ValueError):
            uid = 0
        return "edit" if uid > 0 else "create"

    if p.startswith("/supplier-new") or p.startswith("/supplier_new"):
        view_flag = str(args.get("view") or "").strip().lower()
        if view_flag in ("1", "true", "yes"):
            return "view"
        return "edit" if (args.get("supplier_id") or "").strip() else "create"

    if p.startswith("/sales-order/new") or p.startswith("/sales-new"):
        mode = str(args.get("mode") or "").strip().lower()
        if mode == "view":
            return "view"
        if (args.get("so_id") or "").strip():
            return "edit"
        return "create"

    if (
        p.startswith("/delivery_note/form")
        or p.startswith("/delivery_note/new")
        or p.startswith("/deliverynote-new")
    ):
        mode = str(args.get("mode") or "").strip().lower()
        if mode == "view":
            return "view"
        if (args.get("id") or "").strip():
            return "edit"
        return "view"

    if (
        p.startswith("/deliverynote_return/form")
        or p.startswith("/deliverynote_return/new")
        or p.startswith("/deliverynotereturn-new")
    ):
        mode = str(args.get("mode") or "").strip().lower()
        if mode == "view" or mode.startswith("view-"):
            return "view"
        if (args.get("id") or "").strip():
            return "edit"
        if (args.get("dn_id") or args.get("invoice_return_ref") or "").strip():
            return "view"
        return "view"

    if p.startswith("/new-invoice") and not p.startswith("/new-invoice-return"):
        if (args.get("view_id") or "").strip():
            return "view"
        if (args.get("invoice_id") or "").strip():
            return "edit"
        return "view"

    if p.startswith("/new-invoice-return"):
        if (args.get("view_id") or "").strip():
            return "view"
        if (args.get("edit_id") or "").strip():
            return "view"
        return "view"

    if p.startswith("/new-credit-note"):
        mode = str(args.get("mode") or "").strip().lower()
        if mode == "view":
            return "view"
        if (args.get("invoice_return_ref") or "").strip():
            return "view"
        if (args.get("credit_note_id") or args.get("crn_id") or "").strip():
            return "edit"
        return "create"

    if p.startswith("/new-debit-note"):
        mode = str(args.get("mode") or "").strip().lower()
        if mode == "view":
            return "view"
        if (args.get("srn") or "").strip():
            return "view"
        if (args.get("debit_note_id") or args.get("dbn_id") or "").strip():
            return "edit"
        return "create"

    if p.startswith("/purchase/view/"):
        return "view"
    if p.startswith("/purchase/edit/"):
        return "edit"
    if p.startswith("/purchase-order"):
        return "view"

    if p.startswith("/stock-new") and not p.startswith("/stock-new-return"):
        mode = str(args.get("mode") or "").strip().lower()
        if mode == "view":
            return "view"
        if mode == "create":
            return "view"
        if (args.get("id") or "").strip():
            return "edit"
        return "view"

    if p.startswith("/stock-new-return"):
        mode = str(args.get("mode") or "").strip().lower()
        if mode == "view":
            return "view"
        if (args.get("srn") or "").strip():
            return "view"
        return "view"

    for key in RBAC_GET_FORM_EDIT_QUERY_KEYS:
        if key == "user_id":
            continue
        val = args.get(key)
        if val is not None and str(val).strip():
            return "edit"

    for prefix in RBAC_GET_FORM_CREATE_PREFIXES:
        if p.startswith(prefix.lower()):
            return "create"

    return "view"


def rbac_action_from_http(method, path, query_args=None):
    """Map HTTP method + path (+ query on GET) to RBAC action."""
    path = (path or "").lower()
    method = (method or "GET").upper()

    if rbac_path_is_comment_request(path):
        if method == "GET":
            return "view"
        if method in ("POST", "PUT", "PATCH"):
            return "comment_add"

    if method == "GET":
        return rbac_action_from_get_path(path, query_args)

    if method == "DELETE" or "/delete" in path:
        return "delete"

    if _path_indicates_edit_action(path):
        return "edit"

    if method in ("PUT", "PATCH"):
        return "edit"

    if method == "POST":
        return "create"

    return "view"


def rbac_module_for_path(path, endpoint=None):
    path = path or ""
    path_lower = (path.rstrip("/") or "/").lower()
    for shared_prefix, modules in RBAC_PATH_SHARED_ANY.items():
        if path_lower.startswith(shared_prefix.lower()):
            return "__shared__", modules
    best_module = None
    best_len = -1
    for prefix, module_key in RBAC_PATH_PREFIX_RULES:
        pl = prefix.lower()
        if path_lower.startswith(pl) and len(pl) > best_len:
            best_module = module_key
            best_len = len(pl)
    if best_module:
        return best_module, None
    if endpoint:
        module_key = _rbac_module_for_endpoint(endpoint)
        if module_key:
            return module_key, None
    return None, None
