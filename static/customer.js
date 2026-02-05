

// static/customer.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ customer.js loaded");
  console.log("🔍 Checking DOM elements...");

  // ========= RBAC (FROM customer.html #rbac data-*) =========
  const rbacEl = document.getElementById("rbac");

  // Default role = user
  const ROLE_RAW = (rbacEl?.dataset?.role || "user").toLowerCase();
  const ROLE_NORM = ROLE_RAW.replace(/\s+/g, ""); // "super admin" -> "superadmin"

  // If you set data-can-* in html, we use it. Else fallback based on role.
  const CAN_CREATE = rbacEl
    ? rbacEl.dataset.canCreate === "1"
    : ROLE_NORM === "admin" || ROLE_NORM === "superadmin";

  const CAN_EDIT = rbacEl
    ? rbacEl.dataset.canEdit === "1"
    : ROLE_NORM === "admin" || ROLE_NORM === "superadmin";

  const CAN_DELETE = rbacEl
    ? rbacEl.dataset.canDelete === "1"
    : ROLE_NORM === "superadmin";

  const CAN_IMPORT = rbacEl
    ? rbacEl.dataset.canImport === "1"
    : ROLE_NORM === "admin" || ROLE_NORM === "superadmin";

  // For user role, hide sensitive columns
  const CAN_VIEW_SENSITIVE = ROLE_NORM !== "user";

  // ========= TABLE + FILTER ELEMENTS =========
  const tableBody = document.getElementById("customerTableBody");
  const noDataRow = document.getElementById("noDataRow");
  const showingCount = document.getElementById("showingCount");
  const pageNow = document.getElementById("pageNow");
  const pageTotal = document.getElementById("pageTotal");

  console.log("📋 Elements found:", {
    tableBody: !!tableBody,
    noDataRow: !!noDataRow,
    showingCount: !!showingCount,
    pageNow: !!pageNow,
    pageTotal: !!pageTotal,
  });

  const searchInput = document.getElementById("searchInput");
  const clearFilterBtn = document.getElementById("clearFilterBtn");

  const statusFilter = document.getElementById("statusFilter");
  const typeFilter = document.getElementById("typeFilter");
  const salesRepFilter = document.getElementById("salesRepFilter");

  const prevPageBtn = document.getElementById("prevPageBtn");
  const nextPageBtn = document.getElementById("nextPageBtn");

  // ========= EDIT MODAL ELEMENTS =========
  const editModal = document.getElementById("editCustomerModal");
  const editForm = document.getElementById("editCustomerForm");
  const editIdInput = document.getElementById("editCustomerId");

  const nameInput = document.getElementById("editName");
  const companyInput = document.getElementById("editCompany");
  const customerTypeInput = document.getElementById("editCustomerType");
  const emailInput = document.getElementById("editEmail");
  const creditLimitInput = document.getElementById("editCreditLimit");
  const statusInput = document.getElementById("editStatus");
  const cityInput = document.getElementById("editCity");

  const closeEditBtn = document.getElementById("closeEditBtn");
  const saveEditBtn = document.getElementById("saveEditBtn");

  // error messages under each field
  const nameError = document.getElementById("editNameError");
  const companyError = document.getElementById("editCompanyError");
  const customerTypeError = document.getElementById("editCustomerTypeError");
  const emailError = document.getElementById("editEmailError");
  const creditLimitError = document.getElementById("editCreditLimitError");
  const statusError = document.getElementById("editStatusError");
  const cityError = document.getElementById("editCityError");

  // ========= DELETE MODAL ELEMENTS =========
  const deleteModal = document.getElementById("deleteCustomerModal");
  const deleteCustomerLabel = document.getElementById("deleteCustomerLabel");
  const deleteCancelBtn = document.getElementById("deleteCancelBtn");
  const deleteConfirmBtn = document.getElementById("deleteConfirmBtn");

  // ========= HEADER BUTTONS =========
  const addCustomerBtn = document.getElementById("addCustomerBtn");
  const importCustomerBtn = document.getElementById("importCustomerBtn");

  console.log("🔘 Button elements found:", {
    addCustomerBtn: !!addCustomerBtn,
    importCustomerBtn: !!importCustomerBtn,
    CAN_CREATE: CAN_CREATE,
    CAN_IMPORT: CAN_IMPORT,
    ROLE_NORM: ROLE_NORM
  });

  // ========= DATA =========
  let allCustomer = [];
  let filtered = [];
  const PAGE_SIZE = 10;
  let currentPage = 1;

  let deleteTargetId = null;
  let deleteTargetName = "";

  // ==============================
  // ✅ Apply RBAC to header buttons
  // ==============================
  function applyHeaderRBAC() {
    console.log("🔐 Applying RBAC to buttons:", { CAN_CREATE, CAN_IMPORT });
    
    if (addCustomerBtn) {
      if (!CAN_CREATE) {
        addCustomerBtn.disabled = true;
        addCustomerBtn.classList.add("is-disabled");
        addCustomerBtn.title = "Access denied - Contact Admin";
      } else {
        addCustomerBtn.disabled = false;
        addCustomerBtn.classList.remove("is-disabled");
        addCustomerBtn.title = "Add New Customer";
      }
      console.log("✅ Add Customer button RBAC applied:", {
        disabled: addCustomerBtn.disabled,
        hasDisabledClass: addCustomerBtn.classList.contains("is-disabled"),
        title: addCustomerBtn.title
      });
    }

    if (importCustomerBtn) {
      if (!CAN_IMPORT) {
        importCustomerBtn.disabled = true;
        importCustomerBtn.classList.add("is-disabled");
        importCustomerBtn.title = "Access denied - Contact Admin";
      } else {
        importCustomerBtn.disabled = false;
        importCustomerBtn.classList.remove("is-disabled");
        importCustomerBtn.title = "Import Customers";
      }
      console.log("✅ Import Customer button RBAC applied:", {
        disabled: importCustomerBtn.disabled,
        hasDisabledClass: importCustomerBtn.classList.contains("is-disabled"),
        title: importCustomerBtn.title
      });
    }
  }
  applyHeaderRBAC();

  // ===================================
  // ✅ STRONG FOCUS TRAP (Tab stays INSIDE modal)
  // ===================================
  function trapFocus(modal) {
    if (!modal) return;

    const focusableSelectors =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const getFocusable = () =>
      Array.from(modal.querySelectorAll(focusableSelectors)).filter(
        (el) => !el.disabled && el.offsetParent !== null
      );

    let focusable = getFocusable();
    if (!focusable.length) return;

    const first = () => getFocusable()[0];
    const last = () => {
      const arr = getFocusable();
      return arr[arr.length - 1];
    };

    modal._prevFocus = document.activeElement;

    function handleKey(e) {
      if (!modal.classList.contains("show")) return;

      if (e.key === "Tab") {
        focusable = getFocusable();
        if (!focusable.length) return;

        const firstEl = first();
        const lastEl = last();

        if (!modal.contains(document.activeElement)) {
          e.preventDefault();
          firstEl.focus();
          return;
        }

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }

      if (e.key === "Escape") {
        if (modal.id === "editCustomerModal") closeEditModal();
        if (modal.id === "deleteCustomerModal") closeDeleteModal();
      }
    }

    function handleFocusIn(e) {
      if (!modal.classList.contains("show")) return;
      if (!modal.contains(e.target)) {
        const firstEl = first();
        firstEl && firstEl.focus();
      }
    }

    modal._focusHandler = handleKey;
    modal._focusInHandler = handleFocusIn;

    document.addEventListener("keydown", handleKey, true);
    document.addEventListener("focusin", handleFocusIn, true);

    setTimeout(() => {
      const firstEl = first();
      firstEl && firstEl.focus();
    }, 0);
  }

  function releaseFocus(modal) {
    if (!modal) return;

    if (modal._focusHandler) {
      document.removeEventListener("keydown", modal._focusHandler, true);
      modal._focusHandler = null;
    }

    if (modal._focusInHandler) {
      document.removeEventListener("focusin", modal._focusInHandler, true);
      modal._focusInHandler = null;
    }

    if (modal._prevFocus && typeof modal._prevFocus.focus === "function") {
      modal._prevFocus.focus();
    }
    modal._prevFocus = null;
  }

  // ===================================
  // ✅ Toast helper (reuse your toastBox)
  // ===================================
  function showToast(message) {
    const toastBox = document.getElementById("toastBox");
    if (!toastBox) return;

    const toast = document.createElement("div");
    toast.className = "toast-success";
    toast.innerHTML = message;

    toastBox.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ===================================
  // Top success / error banners (same style as Product Master)
  // ===================================
  function showSuccessNotification(message) {
    const existing = document.querySelector(".success-notification");
    if (existing) existing.remove();

    const notification = document.createElement("div");
    notification.className = "success-notification";
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("show");
    }, 10);

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 400);
    }, 2000);
  }

  function showErrorNotification(message) {
    const existingSuccess = document.querySelector(".success-notification");
    const existingError = document.querySelector(".error-notification");
    if (existingSuccess) existingSuccess.remove();
    if (existingError) existingError.remove();

    const notification = document.createElement("div");
    notification.className = "error-notification";
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("show");
    }, 10);

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 400);
    }, 3000);
  }

  // ===================================
  // PAGINATION BUTTON DISABLE (REAL)
  // ===================================
  function setPagerDisabled(prevDisabled, nextDisabled) {
    if (prevPageBtn) {
      prevPageBtn.disabled = !!prevDisabled;
      prevPageBtn.classList.toggle("disabled", !!prevDisabled);
    }
    if (nextPageBtn) {
      nextPageBtn.disabled = !!nextDisabled;
      nextPageBtn.classList.toggle("disabled", !!nextDisabled);
    }
  }

  // ===================================
  // FILTER + RENDER (with pagination)
  // ===================================
  function applyFilters() {
    console.log("🔍 applyFilters() called");

    if (!allCustomer || allCustomer.length === 0) {
      filtered = [];
      render();
      return;
    }

    const term = (searchInput?.value || "").trim().toLowerCase();
    const statusVal = (statusFilter?.value || "").trim();
    const typeVal = (typeFilter?.value || "").trim();
    const salesRepVal = (salesRepFilter?.value || "").trim();

    filtered = allCustomer.filter((c) => {
      const matchesSearch =
        !term ||
        (c.customer_id && String(c.customer_id).toLowerCase().includes(term)) ||
        (c.name && String(c.name).toLowerCase().includes(term));

      const status = String(c.status || "").toLowerCase();
      const cType = String(c.customer_type || c.company_type || "").toLowerCase();
      const rep = String(c.sales_rep || "").toLowerCase();

      const matchesStatus = !statusVal || status === statusVal.toLowerCase();
      const matchesType = !typeVal || cType === typeVal.toLowerCase();
      const matchesSalesRep = !salesRepVal || rep === salesRepVal.toLowerCase();

      return matchesSearch && matchesStatus && matchesType && matchesSalesRep;
    });

    currentPage = 1;
    render();
  }

  // mask helper (for user role)
  function maskValue(v) {
    if (v === null || v === undefined) return "********";
    const s = String(v);
    if (!s.trim()) return "********";
    const n = Math.min(12, Math.max(6, s.length));
    return "*".repeat(n);
  }

  function render() {
    console.log("🎨 render() called");

    if (!tableBody) {
      console.error("❌ tableBody not found!");
      return;
    }

    tableBody.innerHTML = "";

    if (!filtered || !filtered.length) {
      if (noDataRow) {
        noDataRow.style.display = "table-row";
        tableBody.appendChild(noDataRow);
      }
      if (showingCount) showingCount.textContent = "Showing 0 Entities";
      if (pageNow) pageNow.textContent = "1";
      if (pageTotal) pageTotal.textContent = "1";
      setPagerDisabled(true, true);
      return;
    }

    if (noDataRow) noDataRow.style.display = "none";

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);

    pageItems.forEach((c) => {
      const tr = document.createElement("tr");

      const id = c.customer_id || "";
      const name = c.name || "";
      const company = c.company || "";
      const ctype = c.customer_type || c.company_type || "";
      const status = c.status || "";

      const emailRaw = c.email || "";
      const creditRaw = c.credit_limit || "";

      const email = CAN_VIEW_SENSITIVE ? emailRaw : maskValue(emailRaw);
      const credit = CAN_VIEW_SENSITIVE ? creditRaw : maskValue(creditRaw);

      const city = c.city || "";

      tr.innerHTML = `
        <td>${id}</td>
        <td>${name}</td>
        <td>${company}</td>
        <td>${ctype}</td>
        <td>${status}</td>
        <td>${email}</td>
        <td>${credit}</td>
        <td>${city}</td>
        <td>
          <button class="action-btn edit-btn ${CAN_EDIT ? "" : "is-disabled"}"
                  data-id="${id}" ${CAN_EDIT ? "" : "disabled"}>
            Edit
          </button>

          <button class="action-btn delete-btn ${CAN_DELETE ? "" : "is-disabled"}"
                  data-id="${id}" data-name="${name || company || id}" ${CAN_DELETE ? "" : "disabled"}>
            Delete
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    const start = startIdx + 1;
    const end = startIdx + pageItems.length;
    if (showingCount) {
      showingCount.textContent = `Showing ${start}-${end} of ${filtered.length} Entities`;
    }

    if (pageNow) pageNow.textContent = String(currentPage);
    if (pageTotal) pageTotal.textContent = String(totalPages);

    // ✅ disable prev/next properly
    setPagerDisabled(currentPage === 1, currentPage === totalPages);
  }

  // ===================================
  // VALIDATION HELPERS (EDIT MODAL)
  // ===================================
  function clearErrors() {
    [
      nameError,
      companyError,
      customerTypeError,
      emailError,
      creditLimitError,
      statusError,
      cityError,
    ].forEach((el) => el && (el.textContent = ""));
  }

  function lettersOnlyKeypress(e) {
    const ch = e.key;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (ch.length !== 1) return;
    if (!/[A-Za-z\s]/.test(ch)) e.preventDefault();
  }

  // ✅ Company: allow & . , ' ( ) / -
  function companyKeypress(e) {
    const ch = e.key;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (ch.length !== 1) return;
    if (!/[A-Za-z0-9 &.,'()\/-]/.test(ch)) e.preventDefault();
  }

  function digitsOnlyKeypress(e) {
    const ch = e.key;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (ch.length !== 1) return;
    if (!/[0-9]/.test(ch)) e.preventDefault();
  }

  // Silent validation for button state (no error messages)
  function validateEditFormSilent() {
    const nameVal = (nameInput?.value || "").trim();
    const compVal = (companyInput?.value || "").trim();
    const compTypeVal = (customerTypeInput?.value || "").trim();
    const emailVal = (emailInput?.value || "").trim();
    const creditVal = (creditLimitInput?.value || "").trim();
    const statusVal = (statusInput?.value || "").trim();
    const cityVal = (cityInput?.value || "").trim();

    // Check all required fields are filled
    if (!nameVal || !/^[A-Za-z\s]{3,40}$/.test(nameVal)) {
      return false;
    }

    if (!compVal || !/^[A-Za-z0-9 &.,'()\/-]{3,50}$/.test(compVal)) {
      return false;
    }

    if (!compTypeVal || !/^[A-Za-z\s]{3,50}$/.test(compTypeVal)) {
      return false;
    }

    if (!emailVal || !/^[A-Za-z0-9._%+-]{3,40}@(gmail\.com|yahoo\.com|yahoo\.co\.in|outlook\.com|hotmail\.com|thestackly\.com|stackly\.in)$/i.test(emailVal)) {
      return false;
    }

    if (!creditVal) {
      return false;
    }
    const creditLimitNum = Number(creditVal);
    if (isNaN(creditLimitNum) || creditLimitNum <= 0 || creditLimitNum > 10000000) {
      return false;
    }

    if (!statusVal) {
      return false;
    }

    if (!cityVal || !/^[A-Za-z\s]{3,40}$/.test(cityVal)) {
      return false;
    }

    return true;
  }

  function validateEditForm() {
    clearErrors();
    let ok = true;

    const nameVal = (nameInput?.value || "").trim();
    const compVal = (companyInput?.value || "").trim();
    const compTypeVal = (customerTypeInput?.value || "").trim();
    const emailVal = (emailInput?.value || "").trim();
    const creditVal = (creditLimitInput?.value || "").trim();
    const statusVal = (statusInput?.value || "").trim();
    const cityVal = (cityInput?.value || "").trim();

    if (!nameVal) {
      if (nameError) nameError.textContent = "Customer name is required.";
      ok = false;
    } else if (!/^[A-Za-z\s]{3,40}$/.test(nameVal)) {
      if (nameError) nameError.textContent = "Name must be 3–40 letters only.";
      ok = false;
    }

    if (!compVal) {
      if (companyError) companyError.textContent = "Company is required.";
      ok = false;
    } else if (!/^[A-Za-z0-9 &.,'()\/-]{3,50}$/.test(compVal)) {
      if (companyError)
        companyError.textContent =
          "Company must be 3–50 chars (letters/numbers & symbols like & . , - ( ) / allowed).";
      ok = false;
    }

    if (!compTypeVal) {
      if (customerTypeError) customerTypeError.textContent = "Customer type is required.";
      ok = false;
    } else if (!/^[A-Za-z\s]{3,50}$/.test(compTypeVal)) {
      if (customerTypeError)
        customerTypeError.textContent = "Customer type must be 3–50 letters only.";
      ok = false;
    }

    if (!emailVal) {
      if (emailError) emailError.textContent = "Email is required.";
      ok = false;
    } else if (
      !/^[A-Za-z0-9._%+-]{3,40}@(gmail\.com|yahoo\.com|yahoo\.co\.in|outlook\.com|hotmail\.com|thestackly\.com|stackly\.in)$/i.test(
        emailVal
      )
    ) {
      if (emailError) emailError.textContent = "Enter a valid email address.";
      ok = false;
    }

    if (!creditVal) {
      if (creditLimitError) creditLimitError.textContent = "Credit limit is required.";
      ok = false;
    } else {
      const creditLimitNum = Number(creditVal);
      if (isNaN(creditLimitNum) || creditLimitNum <= 0) {
        if (creditLimitError)
          creditLimitError.textContent = "Credit limit must be a positive number.";
        ok = false;
      } else if (creditLimitNum > 10000000) {
        if (creditLimitError)
          creditLimitError.textContent = "Maximum allowed is 10,000,000.";
        ok = false;
      }
    }

    if (!statusVal) {
      if (statusError) statusError.textContent = "Status is required.";
      ok = false;
    }

    if (!cityVal) {
      if (cityError) cityError.textContent = "City is required.";
      ok = false;
    } else if (!/^[A-Za-z\s]{3,40}$/.test(cityVal)) {
      if (cityError) cityError.textContent = "City must be 3–40 letters only.";
      ok = false;
    }

    return ok;
  }

  function updateSaveButtonState() {
    if (!saveEditBtn) return;
    // Use silent validation for button state (no error messages)
    const ok = validateEditFormSilent();
    // Use disabled attribute only (same as edit department pattern)
    saveEditBtn.disabled = !ok;
  }

  // Keypress restrictions
  if (nameInput) nameInput.addEventListener("keypress", lettersOnlyKeypress);
  if (companyInput) companyInput.addEventListener("keypress", companyKeypress);
  if (customerTypeInput) customerTypeInput.addEventListener("keypress", lettersOnlyKeypress);
  if (cityInput) cityInput.addEventListener("keypress", lettersOnlyKeypress);
  if (creditLimitInput) creditLimitInput.addEventListener("keypress", digitsOnlyKeypress);

  // Enable/disable Save live (similar to product module pattern)
  [nameInput, companyInput, customerTypeInput, emailInput, creditLimitInput, statusInput, cityInput].forEach(
    (el) => {
      if (!el) return;
      // Input event for real-time validation
      el.addEventListener("input", updateSaveButtonState);
      // Change event for dropdowns
      el.addEventListener("change", updateSaveButtonState);
      // Blur event for validation when field loses focus (like product module)
      if (el.tagName !== "SELECT") {
        el.addEventListener("blur", updateSaveButtonState);
      }
    }
  );

  // ===================================
  // OPEN/CLOSE MODALS
  // ===================================
  function openEditModal(customer) {
    if (!editModal || !customer) return;
    clearErrors();
    
    // Initialize button as disabled first
    if (saveEditBtn) {
      saveEditBtn.disabled = true;
    }
    
    if (editIdInput) editIdInput.value = customer.customer_id || "";
    if (nameInput) nameInput.value = customer.name || "";
    if (companyInput) companyInput.value = customer.company || "";
    if (customerTypeInput)
      customerTypeInput.value = customer.customer_type || customer.company_type || "";
    if (emailInput) emailInput.value = customer.email || "";
    if (creditLimitInput) creditLimitInput.value = customer.credit_limit || "";
    if (statusInput) statusInput.value = customer.status || "";
    if (cityInput) cityInput.value = customer.city || "";
    
    // Initialize button as disabled, then validate
    if (saveEditBtn) {
      saveEditBtn.disabled = true;
    }
    
    editModal.classList.add("show");
    trapFocus(editModal);
    
    // Update button state after populating fields
    // Use setTimeout to ensure DOM is updated
    setTimeout(() => {
      updateSaveButtonState();
    }, 10);
  }

  function closeEditModal() {
    releaseFocus(editModal);
    if (editModal) editModal.classList.remove("show");
    // Reset button state when closing modal (same as edit department pattern)
    if (saveEditBtn) {
      saveEditBtn.disabled = true;
    }
  }

  function openDeleteModal(customer) {
    if (!deleteModal || !customer) return;

    deleteTargetId = customer.customer_id;
    deleteTargetName = customer.customer_id || customer.name || customer.company || "";

    if (deleteCustomerLabel) {
      // Show Customer ID in the dialog text (e.g. "C101")
      deleteCustomerLabel.textContent = deleteTargetId || deleteTargetName;
    }

    deleteModal.classList.add("show");
    trapFocus(deleteModal);
  }

  function closeDeleteModal() {
    releaseFocus(deleteModal);
    if (deleteModal) deleteModal.classList.remove("show");
    deleteTargetId = null;
    deleteTargetName = "";
  }

  // ===================================
  // EVENTS
  // ===================================

  // Header buttons
  if (addCustomerBtn) {
    console.log("✅ Add Customer button found, attaching click handler");
    addCustomerBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log("🖱️ Add New Customer button clicked");
      console.log("🔐 CAN_CREATE:", CAN_CREATE);
      console.log("🔐 Button disabled:", addCustomerBtn.disabled);
      
      if (!CAN_CREATE) {
        console.warn("❌ Access denied - CAN_CREATE is false");
        showToast("❌ Access denied. You don't have permission to add customers.");
        return;
      }
      
      console.log("➡️ Redirecting to /addnew-customer");
      window.location.href = "/addnew-customer";
    });
  } else {
    console.error("❌ Add Customer button NOT FOUND!");
  }

  if (importCustomerBtn) {
    console.log("✅ Import Customer button found, attaching click handler");
    importCustomerBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log("🖱️ Import Customer button clicked");
      console.log("🔐 CAN_IMPORT:", CAN_IMPORT);
      console.log("🔐 Button disabled:", importCustomerBtn.disabled);
      
      if (!CAN_IMPORT) {
        console.warn("❌ Access denied - CAN_IMPORT is false");
        showToast("❌ Access denied. You don't have permission to import customers.");
        return;
      }
      
      console.log("➡️ Redirecting to /import-customer");
      window.location.href = "/import-customer";
    });
  } else {
    console.error("❌ Import Customer button NOT FOUND!");
  }

  // filters
  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (statusFilter) statusFilter.addEventListener("change", applyFilters);
  if (typeFilter) typeFilter.addEventListener("change", applyFilters);
  if (salesRepFilter) salesRepFilter.addEventListener("change", applyFilters);

  if (clearFilterBtn) {
    clearFilterBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (statusFilter) statusFilter.value = "";
      if (typeFilter) typeFilter.value = "";
      if (salesRepFilter) salesRepFilter.value = "";
      applyFilters();
    });
  }

  // pagination
  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (prevPageBtn.disabled) return;
      if (currentPage <= 1) return;
      currentPage--;
      render();
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      if (nextPageBtn.disabled) return;
      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      if (currentPage >= totalPages) return;
      currentPage++;
      render();
    });
  }

  // ===== EDIT / DELETE BUTTONS – EVENT DELEGATION =====
  document.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".edit-btn");
    const deleteBtn = e.target.closest(".delete-btn");

    // ---- EDIT BUTTON ----
    if (editBtn) {
      e.preventDefault();

      if (editBtn.disabled || !CAN_EDIT) {
        showToast("❌ Access denied");
        return;
      }

      const id = editBtn.dataset.id;
      if (!id) return;

      const customer = allCustomer.find((c) => String(c.customer_id) === String(id));
      if (customer) openEditModal(customer);
      return;
    }

    // ---- DELETE BUTTON ----
    if (deleteBtn) {
      e.preventDefault();

      if (deleteBtn.disabled || !CAN_DELETE) {
        showToast("❌ Access denied");
        return;
      }

      const id = deleteBtn.dataset.id;
      if (!id) return;

      const customer = allCustomer.find((c) => String(c.customer_id) === String(id));
      if (customer) openDeleteModal(customer);
    }
  });

  // edit modal close
  if (closeEditBtn) {
    closeEditBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeEditModal();
    });
  }
  if (editModal) {
    editModal.addEventListener("click", (e) => {
      if (e.target === editModal) closeEditModal();
    });
  }

  // Save handler (shared by Save button click only — Enter does not submit, like other modules)
  function submitEditCustomer() {
    if (!CAN_EDIT) {
      showToast("❌ Access denied");
      return;
    }

    if (!validateEditForm()) {
      updateSaveButtonState();
      return;
    }

    const id = editIdInput?.value;
    if (!id) return;

    const payload = {
      name: (nameInput?.value || "").trim(),
      company: (companyInput?.value || "").trim(),
      customer_type: (customerTypeInput?.value || "").trim(),
      email: (emailInput?.value || "").trim(),
      credit_limit: (creditLimitInput?.value || "").trim(),
      status: (statusInput?.value || "").trim(),
      city: (cityInput?.value || "").trim(),
    };

    fetch(`/update-customer/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(`❌ ${data.message || "Update failed"}`);
          return null;
        }
        return data;
      })
      .then((data) => {
        if (!data || data.success === false || data.ok === false) {
          showErrorNotification(data?.message || "Customer update failed");
          return;
        }

        showSuccessNotification("Customer has been edited successfully");
        return fetchCustomer();
      })
      .then(() => closeEditModal())
      .catch((err) => {
        console.error("Update failed:", err);
        showErrorNotification("❌ Update failed");
      });
  }

  if (saveEditBtn) {
    saveEditBtn.addEventListener("click", (e) => {
      e.preventDefault();
      submitEditCustomer();
    });
  }

  // Prevent Enter in form from submitting (same as Products / Department & Roles edit modals)
  if (editForm) {
    editForm.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
      }
    });
  }

  // delete modal buttons
  if (deleteCancelBtn) {
    deleteCancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeDeleteModal();
    });
  }

  if (deleteModal) {
    deleteModal.addEventListener("click", (e) => {
      if (e.target === deleteModal) closeDeleteModal();
    });
  }

  if (deleteConfirmBtn) {
    deleteConfirmBtn.addEventListener("click", () => {
      if (!CAN_DELETE) {
        showToast("❌ Access denied");
        return;
      }
      if (!deleteTargetId) return;

      fetch(`/delete-customer/${encodeURIComponent(deleteTargetId)}`, {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            showToast(`❌ ${data.message || "Delete failed"}`);
            return null;
          }
          return data;
        })
        .then((data) => {
          if (!data || data.ok === false || data.success === false) {
            showErrorNotification(data?.message || "Customer delete failed");
            return;
          }

          // Top banner success message (same as Product Master) – CSS adds the tick icon
          showSuccessNotification("Customer has been deleted successfully");
          return fetchCustomer();
        })
        .then(() => closeDeleteModal())
        .catch((err) => {
          console.error("Delete failed:", err);
          showToast("❌ Delete failed");
        });
    });
  }

  // ===================================
  // LOAD DATA FROM BACKEND
  // ===================================
  function updateFilterOptions(select, values) {
    if (!select) return;
    // Keep first option (All), clear the rest
    while (select.options.length > 1) {
      select.remove(1);
    }
    if (!Array.isArray(values)) return;

    // Deduplicate and sort
    const unique = Array.from(
      new Set(
        values
          .map((v) => (v == null ? "" : String(v).trim()))
          .filter((v) => v !== "")
      )
    ).sort((a, b) => a.localeCompare(b));

    unique.forEach((val) => {
      const opt = document.createElement("option");
      opt.value = val.toLowerCase();
      opt.textContent = val;
      select.appendChild(opt);
    });
  }

  function populateFiltersFromData(customers, meta) {
    // Prefer meta from API if available
    const statuses =
      (meta && meta.statuses) ||
      customers.map((c) => c.status);

    const types =
      (meta && meta.types) ||
      customers.map((c) => c.customer_type || c.company_type);

    const reps =
      (meta && meta.sales_reps) ||
      customers.map((c) => c.sales_rep);

    updateFilterOptions(statusFilter, statuses);
    updateFilterOptions(typeFilter, types);
    updateFilterOptions(salesRepFilter, reps);
  }

  function fetchCustomer() {
    console.log("🔄 fetchCustomer() called");
    // Request a large page_size so we get all customers and handle
    // both old (array) and new ({success,data:{items}}) API formats.
    return fetch("/api/customer?page_size=1000")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((payload) => {
        let customers = [];
        let meta = null;

        // Old format: plain array
        if (Array.isArray(payload)) {
          customers = payload;
        }
        // New format: { success, data: { items: [...], meta: {...} } }
        else if (payload && payload.data && Array.isArray(payload.data.items)) {
          customers = payload.data.items;
          meta = payload.data.meta || null;
        }

        allCustomer = customers || [];
        populateFiltersFromData(allCustomer, meta);
        applyFilters();
      })
      .catch((err) => {
        console.error("❌ Error fetching customers:", err);
        allCustomer = [];
        applyFilters();
      });
  }

  // initial load
  fetchCustomer();
});