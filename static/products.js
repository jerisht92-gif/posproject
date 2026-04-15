console.log("✅ products.js loaded");
// static/products.js
document.addEventListener("DOMContentLoaded", () => {
  // ==========================
  // ✅ Elements
  // ==========================
  const tableBody = document.getElementById("productTableBody");
  const noDataRow = document.getElementById("noDataRow");
  const showingCount = document.getElementById("showingCount");

  // ✅ Add New Product Button
  const addProductBtn = document.getElementById("addProductBtn");
  
  // ✅ Import Button
  const importBtn = document.getElementById("importBtn");

  // ✅ Search + Clear
  const searchInput = document.getElementById("searchInput");
  const clearFilterBtn = document.getElementById("clearFilterBtn");

  // ✅ Filter dropdowns
  const categoryFilter = document.getElementById("categoryFilter");
  const brandFilter = document.getElementById("brandFilter");
  const statusFilter = document.getElementById("statusFilter");
  const typeFilter = document.getElementById("typeFilter");

  // ✅ Pagination elements
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const currentPageSpan = document.getElementById("pageNow");
  const totalPagesSpan = document.getElementById("pageTotal");

  // Modals
  const editModal = document.getElementById("editProductModal");
  const deleteModal = document.getElementById("deleteProductModal");

  // Edit fields
  const editId = document.getElementById("editProductId");
  const editCode = document.getElementById("editProductCode");
  const editName = document.getElementById("editProductName");
  const editType = document.getElementById("editProductType");
  const editCategory = document.getElementById("editProductCategory");
  const editStatus = document.getElementById("editProductStatus");
  const editStock = document.getElementById("editProductStock");
  const editPrice = document.getElementById("editProductPrice");

  const saveEditBtn = document.getElementById("saveProductEditBtn");
  const closeEditBtn = document.getElementById("closeProductEditBtn");

  // Delete modal
  const deleteText = document.getElementById("deleteProductText");
  const cancelDeleteBtn = document.getElementById("cancelProductDeleteBtn");
  const confirmDeleteBtn = document.getElementById("confirmProductDeleteBtn");

  // Inline error elements
  const errName = document.getElementById("errProductName");
  const errType = document.getElementById("errProductType");
  const errCategory = document.getElementById("errProductCategory");
  const errStatus = document.getElementById("errProductStatus");
  const errStock = document.getElementById("errProductStock");
  const errPrice = document.getElementById("errProductPrice");

// ==========================
  // ✅ RBAC: data-perm-* from server (roles.json matrix) + legacy admin
  // ==========================
  const pageEl = document.querySelector(".product-page");
  const roleRaw = pageEl?.dataset.role || "";
  const role = roleRaw.toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
  const permCreate = pageEl?.dataset.permCreate === "1";
  const permEdit = pageEl?.dataset.permEdit === "1";
  const permDelete = pageEl?.dataset.permDelete === "1";
  const permImport = pageEl?.dataset.permImport === "1";
  const isPlatformAdmin = ["superadmin", "admin"].includes(role);
  const canEdit = permEdit || isPlatformAdmin;
  const canDelete = permDelete || role === "superadmin";
  const canCreateHeader = permCreate || isPlatformAdmin;

  if (addProductBtn) {
    addProductBtn.disabled = !canCreateHeader;
    if (!canCreateHeader) addProductBtn.title = "No access";
  }
  if (importBtn) {
    const canImport = permImport || isPlatformAdmin;
    importBtn.disabled = !canImport;
    if (!canImport) importBtn.title = "No access";
  }

  // ==========================
  // ✅ State
  // ==========================
  let products = [];
  let deleteTargetId = null;

  let currentPage = 1;
  const pageSize = 10;

  // ==========================
  // ✅ Modal + Focus Trap
  // ==========================
  let activeModal = null;
  let lastFocusedEl = null;

  function getFocusable(modal) {
    if (!modal) return [];
    return [...modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )].filter(el => !el.disabled && el.offsetParent !== null);
  }

  function trapFocus(e) {
    if (!activeModal) return;
    if (e.key !== "Tab") return;

    const focusables = getFocusable(activeModal);
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }


  
  function openModal(modal) {
    if (!modal) return;

    lastFocusedEl = document.activeElement;

    if (activeModal && activeModal !== modal) closeModal(activeModal);

    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");

    activeModal = modal;

    const focusables = getFocusable(modal);
    if (focusables.length) focusables[0].focus();

    document.addEventListener("keydown", trapFocus);
  }

  function closeModal(modal) {
    if (!modal) return;

    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");

    if (activeModal === modal) activeModal = null;

    document.removeEventListener("keydown", trapFocus);

    if (lastFocusedEl) {
      lastFocusedEl.focus();
      lastFocusedEl = null;
    }

    // Reset button state when closing edit modal (same as edit customer/department pattern)
    if (modal === editModal && saveEditBtn) {
      saveEditBtn.disabled = true;
    }
  }

  // ESC close whichever modal is open
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (activeModal === editModal) closeModal(editModal);
    if (activeModal === deleteModal) closeModal(deleteModal);
  });

  // click outside to close
  [editModal, deleteModal].forEach((modal) => {
    if (!modal) return;
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // ==========================
  // ✅ Inline Errors
  // ==========================
  function clearErrors() {
    [errName, errType, errCategory, errStatus, errStock, errPrice].forEach(el => {
      if (el) el.textContent = "";
    });

    [editName, editType, editCategory, editStatus, editStock, editPrice].forEach(el => {
      if (el) el.classList.remove("input-error");
    });
  }

  function setError(inputEl, errEl, msg) {
    if (errEl) errEl.textContent = msg || "";
    if (inputEl) {
      if (msg) inputEl.classList.add("input-error");
      else inputEl.classList.remove("input-error");
    }
  }

  function clearFieldError(inputEl, errEl) {
    setError(inputEl, errEl, "");
  }

  // ----- shared rules (live + Save button) -----
  function checkTextField(value, label) {
    const v = (value || "").trim();
    if (!v) return { ok: false, msg: `${label} is required.` };
    if (v.length < 3) return { ok: false, msg: `${label} must be at least 3 characters.` };
    if (v.length > 40) return { ok: false, msg: `${label} must be at most 40 characters.` };
    if (!/^[A-Za-z0-9 ()-]+$/.test(v)) {
      return {
        ok: false,
        msg: `${label}: use only letters, numbers, spaces, ( ) and -.`,
      };
    }
    return { ok: true, msg: "" };
  }

  function checkStatusValue(value) {
    const s = (value || "").trim();
    if (!["Active", "Inactive"].includes(s)) {
      return { ok: false, msg: "Select Active or Inactive." };
    }
    return { ok: true, msg: "" };
  }

  function checkStockValue(value) {
    if (value === "" || value == null) {
      return { ok: false, msg: "Stock level is required." };
    }
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n > 999999) {
      return { ok: false, msg: "Stock must be a whole number from 0 to 999999." };
    }
    return { ok: true, msg: "" };
  }

  function checkPriceValue(value) {
    if (value === "" || value == null) {
      return { ok: false, msg: "Price is required." };
    }
    const n = Number(value);
    if (Number.isNaN(n) || n < 0 || n > 9999999) {
      return { ok: false, msg: "Price must be a number from 0 to 9999999." };
    }
    return { ok: true, msg: "" };
  }

  function validateEditProductName() {
    const r = checkTextField(editName?.value, "Product Name");
    if (r.ok) clearFieldError(editName, errName);
    else setError(editName, errName, r.msg);
    return r.ok;
  }

  function validateEditProductType() {
    const r = checkTextField(editType?.value, "Type");
    if (r.ok) clearFieldError(editType, errType);
    else setError(editType, errType, r.msg);
    return r.ok;
  }

  function validateEditProductCategory() {
    const r = checkTextField(editCategory?.value, "Category");
    if (r.ok) clearFieldError(editCategory, errCategory);
    else setError(editCategory, errCategory, r.msg);
    return r.ok;
  }

  function validateEditProductStatus() {
    const r = checkStatusValue(editStatus?.value);
    if (r.ok) clearFieldError(editStatus, errStatus);
    else setError(editStatus, errStatus, r.msg);
    return r.ok;
  }

  function validateEditProductStock() {
    const r = checkStockValue(editStock?.value);
    if (r.ok) clearFieldError(editStock, errStock);
    else setError(editStock, errStock, r.msg);
    return r.ok;
  }

  function validateEditProductPrice() {
    const r = checkPriceValue(editPrice?.value);
    if (r.ok) clearFieldError(editPrice, errPrice);
    else setError(editPrice, errPrice, r.msg);
    return r.ok;
  }

  function validateAllEditFieldsLive() {
    validateEditProductName();
    validateEditProductType();
    validateEditProductCategory();
    validateEditProductStatus();
    validateEditProductStock();
    validateEditProductPrice();
    updateSaveButtonState();
  }

  function clampTextInput(inputEl, maxLen) {
    if (!inputEl) return;
    let v = inputEl.value;
    if (v.length > maxLen) inputEl.value = v.slice(0, maxLen);
  }

  if (editName) {
    editName.addEventListener("input", () => {
      clampTextInput(editName, 40);
      validateEditProductName();
      updateSaveButtonState();
    });
    editName.addEventListener("blur", () => {
      validateEditProductName();
      updateSaveButtonState();
    });
  }
  if (editType) {
    editType.addEventListener("input", () => {
      clampTextInput(editType, 40);
      validateEditProductType();
      updateSaveButtonState();
    });
    editType.addEventListener("blur", () => {
      validateEditProductType();
      updateSaveButtonState();
    });
  }
  if (editCategory) {
    editCategory.addEventListener("input", () => {
      clampTextInput(editCategory, 40);
      validateEditProductCategory();
      updateSaveButtonState();
    });
    editCategory.addEventListener("blur", () => {
      validateEditProductCategory();
      updateSaveButtonState();
    });
  }
  if (editStatus) {
    editStatus.addEventListener("change", () => {
      validateEditProductStatus();
      updateSaveButtonState();
    });
    editStatus.addEventListener("blur", () => {
      validateEditProductStatus();
      updateSaveButtonState();
    });
  }
  if (editStock) {
    editStock.addEventListener("input", () => {
      validateEditProductStock();
      updateSaveButtonState();
    });
    editStock.addEventListener("blur", () => {
      validateEditProductStock();
      updateSaveButtonState();
    });
  }
  if (editPrice) {
    editPrice.addEventListener("input", () => {
      validateEditProductPrice();
      updateSaveButtonState();
    });
    editPrice.addEventListener("blur", () => {
      validateEditProductPrice();
      updateSaveButtonState();
    });
  }

  // ==========================
  // ✅ SUCCESS NOTIFICATION FUNCTION
  // ==========================
  function showSuccessNotification(message) {
    // Remove existing notification if any
    const existing = document.querySelector(".success-notification");
    if (existing) existing.remove();

    // Create notification element
    const notification = document.createElement("div");
    notification.className = "success-notification";
    notification.textContent = message;
    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => {
      notification.classList.add("show");
    }, 10);

    // Hide and remove after 2 seconds
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 400); // Wait for fade-out animation
    }, 2000);
  }

  // Show cross-page success toast when redirected after creating a product
  try {
    const created = window.localStorage.getItem("productCreatedSuccess");
    if (created === "1") {
      showSuccessNotification("Product has been created successfully.");
      window.localStorage.removeItem("productCreatedSuccess");
    }
  } catch (e) {}

  // ==========================
  // ✅ ERROR NOTIFICATION FUNCTION
  // ==========================
  function showErrorNotification(message) {
    // Remove existing notifications if any
    const existingSuccess = document.querySelector(".success-notification");
    const existingError = document.querySelector(".error-notification");
    if (existingSuccess) existingSuccess.remove();
    if (existingError) existingError.remove();

    // Create notification element
    const notification = document.createElement("div");
    notification.className = "error-notification";
    notification.textContent = message;
    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => {
      notification.classList.add("show");
    }, 10);

    // Hide and remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 400); // Wait for fade-out animation
    }, 3000);
  }

  // ==========================
  // ✅ Form validity (same rules as live field validators)
  // ==========================
  function validateEditFormSilent() {
    return (
      checkTextField(editName?.value, "Product Name").ok &&
      checkTextField(editType?.value, "Type").ok &&
      checkTextField(editCategory?.value, "Category").ok &&
      checkStatusValue(editStatus?.value).ok &&
      checkStockValue(editStock?.value).ok &&
      checkPriceValue(editPrice?.value).ok
    );
  }

  // ==========================
  // ✅ Update Save Button State
  // ==========================
  function updateSaveButtonState() {
    if (!saveEditBtn) return;
    const ok = validateEditFormSilent();
    saveEditBtn.disabled = !ok;
  }

  // ==========================
  // ✅ Format Price (preserve user format)
  // ==========================
  function formatPrice(price) {
    const num = Number(price ?? 0);
    if (isNaN(num)) return "0";
    
    // If it's a whole number, display without decimals
    if (Number.isInteger(num)) {
      return num.toString();
    }
    
    // If it has decimals, convert to string (JavaScript automatically removes trailing zeros)
    // e.g., 100.50 -> "100.5", 100.00 -> "100", 100.55 -> "100.55"
    return num.toString();
  }

  
  // ==========================
  // ✅ Render Table (role-based buttons)
  // ==========================
  function renderTable(list) {
    if (!tableBody) return;
    tableBody.innerHTML = "";

    if (!list || list.length === 0) {
      if (noDataRow) {
        noDataRow.style.display = "";
        tableBody.appendChild(noDataRow);
      }
      return;
    }

    if (noDataRow) noDataRow.style.display = "none";

    list.forEach((p) => {
      const tr = document.createElement("tr");

      const editDisabledAttr = canEdit ? "" : "disabled title='No access'";
      const deleteDisabledAttr = canDelete ? "" : "disabled title='No access'";

      tr.innerHTML = `
        <td>${p.product_id || ""}</td>
        <td>${p.product_name || ""}</td>
        <td>${p.type || ""}</td>
        <td>${p.category || ""}</td>
        <td>${p.status || ""}</td>
        <td>${p.stock_level ?? 0}</td>
        <td>${formatPrice(p.price)}</td>
        <td>
          <div class="action-wrap">
            <button class="action-btn edit-btn" data-id="${p.product_id}" ${editDisabledAttr}>Edit</button>
            <button class="action-btn delete-btn" data-id="${p.product_id}" ${deleteDisabledAttr}>Delete</button>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  
  // ==========================
  // ✅ Load Products (Pagination + Search + Filters)
  // ==========================
  async function loadProducts(page = 1) {
    try {
      const q = (searchInput?.value || "").trim();
      const category = (categoryFilter?.value || "").trim();
      const status = (statusFilter?.value || "").trim();
      const type = (typeFilter?.value || "").trim();
      const brand = (brandFilter?.value || "").trim();

      const params = new URLSearchParams();
      params.set("page", page);
      params.set("page_size", 10);
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      if (brand) params.set("brand", brand);

      console.log("🔄 Fetching products from:", `/api/products?${params.toString()}`);
      const res = await fetch(`/api/products?${params.toString()}`);
      
      if (!res.ok) {
        console.error("❌ API response not OK:", res.status, res.statusText);
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const response = await res.json();
      console.log("✅ API response:", response);

      // API response structure: { success: true, data: { items: [], page: 1, ... } }
      const data = response.data || {};
      products = data.items || [];
      console.log("📊 Products loaded:", products.length, "items");
      renderTable(products);

      currentPage = data.page || 1;
      const totalPages = data.total_pages || 1;

      if (currentPageSpan) currentPageSpan.textContent = currentPage;
      if (totalPagesSpan) totalPagesSpan.textContent = totalPages;

      if (showingCount) {
        const totalItems = data.total_items ?? 0;
        const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const end = Math.min(currentPage * pageSize, totalItems);
        showingCount.textContent = `Showing ${start}–${end} of ${totalItems} Entities`;
      }

      if (prevBtn) prevBtn.disabled = currentPage <= 1;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

      // Update filter dropdowns with available options from backend
      if (data.meta) {
        // Update Category dropdown
        if (categoryFilter && data.meta.categories) {
          const currentCategoryValue = categoryFilter.value;
          categoryFilter.innerHTML = '<option value="">All</option>';
          data.meta.categories.forEach(category => {
            if (category) {
              const option = document.createElement("option");
              option.value = category;
              option.textContent = category;
              categoryFilter.appendChild(option);
            }
          });
          // Restore selected value if it still exists
          if (currentCategoryValue) {
            categoryFilter.value = currentCategoryValue;
          }
        }

        // Update Product Type dropdown
        if (typeFilter && data.meta.types) {
          const currentTypeValue = typeFilter.value;
          typeFilter.innerHTML = '<option value="">All</option>';
          data.meta.types.forEach(type => {
            if (type) {
              const option = document.createElement("option");
              option.value = type;
              option.textContent = type;
              typeFilter.appendChild(option);
            }
          });
          // Restore selected value if it still exists
          if (currentTypeValue) {
            typeFilter.value = currentTypeValue;
          }
        }

        // Update Status dropdown
        if (statusFilter && data.meta.statuses) {
          const currentStatusValue = statusFilter.value;
          statusFilter.innerHTML = '<option value="">All</option>';
          data.meta.statuses.forEach(status => {
            if (status) {
              const option = document.createElement("option");
              option.value = status;
              option.textContent = status;
              statusFilter.appendChild(option);
            }
          });
          // Restore selected value if it still exists
          if (currentStatusValue) {
            statusFilter.value = currentStatusValue;
          }
        }

        // Update Brand dropdown
        if (brandFilter && data.meta.brands) {
          const currentBrandValue = brandFilter.value;
          brandFilter.innerHTML = '<option value="">All</option>';
          data.meta.brands.forEach(brand => {
            if (brand) {
              const option = document.createElement("option");
              option.value = brand;
              option.textContent = brand;
              brandFilter.appendChild(option);
            }
          });
          // Restore selected value if it still exists
          if (currentBrandValue) {
            brandFilter.value = currentBrandValue;
          }
        }
      }

    } catch (err) {
      console.error("❌ loadProducts error:", err);
      console.error("Error details:", err.message, err.stack);
      renderTable([]);
      if (showingCount) showingCount.textContent = "Showing 0 Entities";
      if (currentPageSpan) currentPageSpan.textContent = "1";
      if (totalPagesSpan) totalPagesSpan.textContent = "1";
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
    }
  }

  // ==========================
  // ✅ Search + Filters (reset to page 1)
  // ==========================
  if (searchInput) {
    searchInput.addEventListener("input", () => loadProducts(1));
  }

  // Filter dropdown change listeners
  if (categoryFilter) {
    categoryFilter.addEventListener("change", () => loadProducts(1));
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", () => loadProducts(1));
  }

  if (typeFilter) {
    typeFilter.addEventListener("change", () => loadProducts(1));
  }

  // Brand filter (placeholder for future implementation)
  if (brandFilter) {
    brandFilter.addEventListener("change", () => loadProducts(1));
  }

  // ==========================
  // ✅ Clear Filters
  // ==========================
  if (clearFilterBtn) {
    clearFilterBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (categoryFilter) categoryFilter.value = "";
      if (brandFilter) brandFilter.value = "";
      if (statusFilter) statusFilter.value = "";
      if (typeFilter) typeFilter.value = "";
      loadProducts(1);
    });
  }

  // ==========================
  // ✅ Pagination Buttons
  // ==========================
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) loadProducts(currentPage - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      loadProducts(currentPage + 1);
    });
  }

  // ==========================
  // ✅ Click: Edit / Delete
  // ==========================
  document.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".edit-btn");
    const delBtn = e.target.closest(".delete-btn");

    // ---- EDIT
    if (editBtn) {
      // Skip if button is disabled
      if (editBtn.disabled) {
        console.log("Edit button is disabled, skipping action");
        return;
      }
      
      clearErrors();
      const id = editBtn.dataset.id;

      try {
        console.log("🔄 Fetching product for edit:", id);
        const res = await fetch(`/api/products/${id}`);
        
        if (!res.ok) {
          console.error("❌ API response not OK:", res.status, res.statusText);
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const response = await res.json();
        console.log("✅ API response:", response);

        if (!response.success) {
          alert(response.message || "Unable to load product");
          return;
        }

        // API returns: { success: true, data: { product_id, product_name, ... }, message: "..." }
        const p = response.data || {};

        editId.value = p.product_id;
        editCode.value = p.product_id || "";
        editName.value = p.product_name || "";
        editType.value = p.type || "";
        editCategory.value = p.category || "";
        editStatus.value = p.status || "Active";
        editStock.value = p.stock_level ?? 0;
        editPrice.value = p.price ?? 0;

        // Initialize button as disabled, then validate
        if (saveEditBtn) {
          saveEditBtn.disabled = true;
        }

        openModal(editModal);

        setTimeout(() => {
          validateAllEditFieldsLive();
        }, 10);
      } catch (err) {
        console.error("❌ edit load error:", err);
        alert("Server error while loading product");
      }
    }

    // ---- DELETE
    if (delBtn) {
      // Skip if button is disabled
      if (delBtn.disabled) {
        console.log("Delete button is disabled, skipping action");
        return;
      }
      
      const id = delBtn.dataset.id;
      deleteTargetId = id;

      if (deleteText) {
        deleteText.textContent = `Are you sure you want to delete "${id}"?`;
      }

      openModal(deleteModal);
    }
  });

  // ==========================
  // ✅ Save Edit
  // ==========================
  if (saveEditBtn) {
    saveEditBtn.addEventListener("click", async () => {
      const id = editId.value;

      validateAllEditFieldsLive();
      if (!validateEditFormSilent()) {
        return;
      }

      const name = (editName.value || "").trim();
      const type = (editType.value || "").trim();
      const category = (editCategory.value || "").trim();
      const status = (editStatus.value || "").trim();
      const stock = editStock.value;
      const price = editPrice.value;

      const payload = {
        product_name: name,
        type,
        category,
        status,
        stock_level: Number(stock),
        price: Number(price),
      };

      try {
        const res = await fetch(`/api/products/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        
        // Check for duplicate validation errors (409 status)
        if (!res.ok && res.status === 409) {
          showErrorNotification(data.message || "Duplicate product detected. Please check the product details.");
          return;
        }

        if (!data.success) {
          showErrorNotification(data.message || "Update failed");
          setError(editName, errName, data.message || "Update failed");
          return;
        }

        closeModal(editModal);
        loadProducts(currentPage);
        
        // Show success notification
        showSuccessNotification("Product has been edited successfully");
      } catch (err) {
        console.error("❌ update error:", err);
        showErrorNotification("Server error while updating product");
        setError(editName, errName, "Server error while updating product");
      }
    });
  }

  if (closeEditBtn) {
    closeEditBtn.addEventListener("click", () => closeModal(editModal));
  }

  // ==========================
  // ✅ Delete Confirm
  // ==========================
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener("click", () => {
      deleteTargetId = null;
      closeModal(deleteModal);
    });
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async () => {
      if (!deleteTargetId) return;

      try {
        const res = await fetch(`/api/products/${deleteTargetId}`, { method: "DELETE" });
        const data = await res.json();

        if (!res.ok) {
          alert(data.message || "Delete failed");
          return;
        }

        deleteTargetId = null;
        closeModal(deleteModal);
        loadProducts(currentPage);
        
        // Show success toast
        showSuccessNotification("Product has been deleted successfully");
      } catch (err) {
        console.error("❌ delete error:", err);
        alert("Server error while deleting product");
      }
    });
  }

  // ==========================
  // ✅ Add New Product Button
  // ==========================
  if (addProductBtn) {
    addProductBtn.addEventListener("click", () => {
      window.location.href = "/products/create";
    });
  }

  // ==========================
  // ✅ Import Button
  // ==========================
  if (importBtn) {
    importBtn.addEventListener("click", () => {
      window.location.href = "/import";
    });
  }

  // ==========================
  // ✅ INIT
  // ==========================
  loadProducts(1);
});