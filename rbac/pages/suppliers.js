// Supplier list — create / edit / delete + row click opens view mode when user has view access.
(function () {
  RbacBind.bindListPage({
    pageClass: "supplier-page",
    tableBodyId: "supplierTableBody",
    headerMap: {
      ".manage-header-right a.btn-primary": "create",
      "#confirmDeleteSupplierBtn": "delete",
    },
    tableMap: {
      ".supplier-edit-btn": "edit",
      ".supplier-delete-btn": "delete",
    },
  });

  function isSupplierListPage() {
    return !!document.getElementById("supplierTableBody") && !document.getElementById("supplierForm");
  }

  function bindSupplierViewLinks() {
    if (!isSupplierListPage()) return;
    const rp = window.RbacPage;
    if (!rp || !rp.can("view")) return;

    const tbody = document.getElementById("supplierTableBody");
    if (!tbody) return;

    tbody.querySelectorAll("tr").forEach((row) => {
      if (row.id === "noDataRow") return;
      const idCell = row.children[0];
      const nameCell = row.children[1];
      const supplierId = (idCell?.textContent || "").trim();
      if (!supplierId || !nameCell) return;

      [idCell, nameCell].forEach((cell) => {
        if (!cell || cell.dataset.rbacViewLink === "1") return;
        cell.dataset.rbacViewLink = "1";
        cell.classList.add("supplier-view-link");
        cell.style.cursor = "pointer";
        cell.title = "View supplier";
        cell.addEventListener("click", (e) => {
          if (e.target.closest("button, a")) return;
          window.location.href =
            `/supplier-new?supplier_id=${encodeURIComponent(supplierId)}&view=1`;
        });
      });
    });
  }

  function bindListViewLinks() {
    if (!isSupplierListPage()) return;
    bindSupplierViewLinks();
    const tbody = document.getElementById("supplierTableBody");
    if (tbody) {
      new MutationObserver(bindSupplierViewLinks).observe(tbody, {
        childList: true,
        subtree: true,
      });
    }
  }

  if (window.RbacRegistry) {
    window.RbacRegistry.registerMatcher(isSupplierListPage, bindListViewLinks, "supplier-list-view");
  }
})();
