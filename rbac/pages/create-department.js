// Create Department & embedded roles table (department_roles).
RbacBind.bindListPage({
  pageClass: "dept-create-page",
  tableBodyId: "rolesTable",
  headerMap: {
    "#addRoleBtn": "create",
    "button[type='submit'].btn-primary": "create",
    "#saveDeptEditBtn": "edit",
    "#confirmDeleteRole": "delete",
  },
  tableMap: {
    ".edit-btn": "edit",
    ".delete-btn": "delete",
  },
});
