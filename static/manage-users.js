// static/manage-users.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("manage-users.js loaded ✅");

  // ============================
  // ✅ SUCCESS NOTIFICATION FUNCTION
  // ============================
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

  function showErrorNotification(message) {
    document
      .querySelectorAll(".success-notification, .error-notification")
      .forEach((n) => n.remove());
    const notification = document.createElement("div");
    notification.className = "error-notification";
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add("show"), 10);
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 400);
    }, 3000);
  }

  // Show success toast when redirected from create-user (user_created=1)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("user_created") === "1") {
    showSuccessNotification("User has been created successfully");
    // Remove query param from URL without reload
    if (window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  const createBtn    = document.getElementById("createUserBtn");
  const searchInput  = document.getElementById("searchUsers");
  const tableBody    = document.getElementById("userTableBody");
  const noUserRow    = document.getElementById("noUserRow");
  const showingCount = document.getElementById("showingCount");

  const prevBtn  = document.getElementById("prevPage");
  const nextBtn  = document.getElementById("nextPage");
  const pageNow  = document.getElementById("pageNow");
  const pageTotal = document.getElementById("pageTotal");

  // ============================
  // RBAC for header "+ Create New" button
  // Disable for plain "user" role (same as Edit)
  // ============================
  const pageContainer = document.querySelector(".manage-users-page");
  const PAGE_ROLE_RAW = (pageContainer?.dataset.currentRole || "user").toLowerCase();
  const PAGE_ROLE_NORM = PAGE_ROLE_RAW.replace(/\s+/g, "").replace(/_/g, "");
  const CAN_CREATE_USER = PAGE_ROLE_NORM === "admin" || PAGE_ROLE_NORM === "superadmin";

  if (createBtn) {
    if (!CAN_CREATE_USER) {
      createBtn.disabled = true;
      createBtn.title = "Only Admin / Super Admin can create users";
    } else {
      // 👉 Go to Create User page
      createBtn.addEventListener("click", () => {
        window.location.href = "/create-user";
      });
    }
  }

  // ============================
  //   DATA (loaded via Fetch/XHR from /api/users)
  // ============================
  let allUsers = [];
  let currentPage = 1;
  let totalItems = 0;
  let totalPages = 1;
  const rowsPerPage = 10;
  let currentUserRole = "user"; // from API for RBAC
  let usersFetchController = null;
  let usersSearchDebounceTimer = null;

  function normalizeRole(r) {
    return (r || "").toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
  }

  function fetchUsers() {
    const q = (searchInput?.value || "").trim();
    const params = new URLSearchParams({
      mode: "ajax",
      page: String(currentPage),
      page_size: String(rowsPerPage),
    });
    if (q) params.set("q", q);

    if (usersFetchController) usersFetchController.abort();
    usersFetchController = new AbortController();

    return fetch(`/manage-users?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: usersFetchController.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then((payload) => {
        if (payload && payload.users) {
          allUsers = Array.isArray(payload.users) ? payload.users : [];
        } else {
          allUsers = [];
        }
        totalItems = Number(payload?.total || 0);
        totalPages = Number(payload?.total_pages || 1);
        currentPage = Number(payload?.page || currentPage);
        const role = (payload && payload.current_user && payload.current_user.role) ? payload.current_user.role : "User";
        currentUserRole = normalizeRole(role);
        renderPage();
      })
      .catch((err) => {
        if (err && err.name === "AbortError") return;
        console.error("Error fetching users:", err);
        allUsers = [];
        totalItems = 0;
        totalPages = 1;
        renderPage();
      });
  }

  const CAN_EDIT  = currentUserRole === "admin" || currentUserRole === "superadmin";
  const CAN_DELETE = currentUserRole === "superadmin";

  function getCanEdit() {
    return currentUserRole === "admin" || currentUserRole === "superadmin";
  }
  function getCanDelete() {
    return currentUserRole === "superadmin";
  }

  function renderPage() {
    if (!tableBody) return;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    // Keep noUserRow reference, clear rest
    const noRow = document.getElementById("noUserRow");
    tableBody.innerHTML = "";
    if (noRow) tableBody.appendChild(noRow);

    if (!allUsers.length) {
      if (noUserRow) noUserRow.style.display = "";
      if (showingCount) showingCount.textContent = "0";
      if (pageNow) pageNow.textContent = "1";
      if (pageTotal) pageTotal.textContent = "1";
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    if (noUserRow) noUserRow.style.display = "none";

    const canEdit = getCanEdit();
    const canDelete = getCanDelete();

    allUsers.forEach((u, idx) => {
      if (!u || typeof u !== "object") return;
      const name = (u.name || "").trim();
      const email = (u.email || "").trim();
      const phone = (u.phone || "").trim();
      const role = (u.role || "User").trim();
      const userId = u.user_id;
      const emailDisplay = canEdit ? email : "*************";
      const phoneDisplay = canEdit ? phone : "**********";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(name)}</td>
        <td>${escapeHtml(emailDisplay)}</td>
        <td>${escapeHtml(phoneDisplay)}</td>
        <td>${escapeHtml(role)}</td>
        <td class="action-cell">
          <div class="action-buttons">
            ${canEdit
              ? `<button class="action-btn edit-btn" data-id="${userId}">Edit</button>`
              : `<button class="action-btn edit-btn-disabled" disabled title="No access">Edit</button>`}
            ${canDelete
              ? `<button class="action-btn delete-btn" data-id="${userId}">Delete</button>`
              : `<button class="action-btn delete-btn-disabled" disabled title="Only Super Admin can delete">Delete</button>`}
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    const startEntry = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
    const endEntry = Math.min(currentPage * rowsPerPage, totalItems);
    if (showingCount) showingCount.textContent = totalItems > 0 ? `${startEntry}-${endEntry} of ${totalItems}` : "0";
    if (pageNow) pageNow.textContent = String(currentPage);
    if (pageTotal) pageTotal.textContent = String(totalPages);
    if (prevBtn) prevBtn.disabled = currentPage <= 1 || totalItems === 0;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages || totalItems === 0;
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s == null ? "" : String(s);
    return div.innerHTML;
  }

  function applyFilter() {
    currentPage = 1;
    fetchUsers();
  }

  if (searchInput && tableBody) {
    searchInput.addEventListener("input", () => {
      if (usersSearchDebounceTimer) clearTimeout(usersSearchDebounceTimer);
      usersSearchDebounceTimer = setTimeout(() => {
        applyFilter();
      }, 250);
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentPage <= 1) return;
      currentPage--;
      fetchUsers();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (currentPage >= totalPages) return;
      currentPage++;
      fetchUsers();
    });
  }

 // ============================
//   DELETE USER (MODAL) — event delegation for dynamically loaded rows
// ============================
const deleteModal      = document.getElementById("deleteUserModal");
const deleteUserText   = document.getElementById("deleteUserText");
const cancelDeleteBtn  = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

let lastFocusedDelete = null;
let pendingDeleteId  = null; // user index in allUsers

function openDeleteModal() {
  if (!deleteModal) return;
  lastFocusedDelete = document.activeElement;
  deleteModal.style.display = "flex";
  const focusable = deleteModal.querySelectorAll(
    'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length) focusable[0].focus();
  trapFocus(deleteModal);
}

function closeDeleteModal() {
  if (!deleteModal) return;
  deleteModal.style.display = "none";
  if (lastFocusedDelete) lastFocusedDelete.focus();
  pendingDeleteId = null;
}

tableBody.addEventListener("click", (e) => {
  const btn = e.target.closest(".delete-btn");
  if (!btn || btn.disabled || btn.classList.contains("delete-btn-disabled")) return;
  const userId = btn.getAttribute("data-id");
  const row = btn.closest("tr");
  if (userId === null || userId === "" || !row) return;
  pendingDeleteId = userId;
  const name = row.querySelectorAll("td")[0]?.textContent.trim() || "this user";
  if (deleteUserText) deleteUserText.textContent = `Are you sure you want to delete "${name}"?`;
  openDeleteModal();
});

cancelDeleteBtn?.addEventListener("click", closeDeleteModal);

window.addEventListener("click", (e) => {
  if (e.target === deleteModal) closeDeleteModal();
});

confirmDeleteBtn?.addEventListener("click", () => {
  if (pendingDeleteId === null || pendingDeleteId === undefined) return;

  fetch(`/delete-user/${pendingDeleteId}`, {
    method: "DELETE"
  })
    .then((res) => res.json())
    .then((data) => {
      closeDeleteModal();
      showSuccessNotification("User has been deleted successfully");

      // 🔥 CORRECT FIX
      fetchUsers();   // <-- reload from DB
    })
    .catch((err) => {
      console.error("Delete error:", err);
      alert("Error deleting user.");
    });
});
  // ================================
  //   EDIT USER – MODAL LOGIC
  // ================================
  const modal         = document.getElementById("editUserModal");
  const closeEditBtn  = document.getElementById("closeEditBtn");
  const saveEditBtn   = document.getElementById("saveEditBtn");

  const editNameInput  = document.getElementById("editName");
  const editEmailInput = document.getElementById("editEmail");
  const editPhoneInput = document.getElementById("editPhone");
  const editRoleSelect = document.getElementById("editRole");
  const editFirstNameInput = document.getElementById("editFirstName");
  const editLastNameInput = document.getElementById("editLastName");
  const editBranchInput = document.getElementById("editBranch");
  const editDepartmentInput = document.getElementById("editDepartment");
  const editReportingToInput = document.getElementById("editReportingTo");
  const editAvailableBranchesInput = document.getElementById("editAvailableBranches");
  const editEmployeeIdInput = document.getElementById("editEmployeeId");

  // Country rules (national number length) — same set as Create New Branch Users
  const COUNTRY_RULES = {
    "91":  { min: 10, max: 10 },
    "971": { min: 9,  max: 9  },
    "974": { min: 8,  max: 8  },
    "966": { min: 9,  max: 9  },
    "94":  { min: 9,  max: 9  },
    "880": { min: 10, max: 10 },
    "977": { min: 10, max: 10 },
    "1":   { min: 10, max: 10 },
    "44":  { min: 10, max: 10 },
    "61":  { min: 9,  max: 9  },
  };

  function parseE164(phoneRaw) {
    const s = (phoneRaw || "").trim();
    if (!s.startsWith("+")) return null;
    const digits = s.slice(1).replace(/\D/g, "");
    if (!digits) return null;
    const codes = Object.keys(COUNTRY_RULES).sort((a, b) => b.length - a.length);
    const code = codes.find((c) => digits.startsWith(c));
    if (!code) return { countryCode: null, national: digits };
    return { countryCode: code, national: digits.slice(code.length) };
  }

  // error elements (must exist in HTML)
  const nameError  = document.getElementById("editNameError");
  const emailError = document.getElementById("editEmailError");
  const phoneError = document.getElementById("editPhoneError");
  const roleError  = document.getElementById("editRoleError");
  const firstNameError = document.getElementById("editFirstNameError");
  const lastNameError = document.getElementById("editLastNameError");
  const branchError = document.getElementById("editBranchError");
  const departmentError = document.getElementById("editDepartmentError");
  const reportingToError = document.getElementById("editReportingToError");
  const availableBranchesError = document.getElementById("editAvailableBranchesError");
  const employeeIdError = document.getElementById("editEmployeeIdError");

  // 🔹 Accessibility: remember last focused element (tab)
  let lastFocusedElement = null;

  function setError(inputEl, errorEl, msg) {
    if (errorEl) errorEl.textContent = msg;
    if (inputEl) inputEl.classList.add("input-error");
  }

  function clearError(inputEl, errorEl) {
    if (errorEl) errorEl.textContent = "";
    if (inputEl) inputEl.classList.remove("input-error");
  }

  function clearAllErrors() {
    clearError(editNameInput,  nameError);
    clearError(editEmailInput, emailError);
    clearError(editPhoneInput, phoneError);
    clearError(editRoleSelect, roleError);
    clearError(editFirstNameInput, firstNameError);
    clearError(editLastNameInput, lastNameError);
    clearError(editBranchInput, branchError);
    clearError(editDepartmentInput, departmentError);
    clearError(editReportingToInput, reportingToError);
    clearError(editAvailableBranchesInput, availableBranchesError);
    clearError(editEmployeeIdInput, employeeIdError);
  }

  function splitName(fullName) {
    const normalized = (fullName || "").trim().replace(/\s+/g, " ");
    if (!normalized) return { firstName: "", lastName: "" };
    const parts = normalized.split(" ");
    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || "",
    };
  }

  // ✅ strict email domains (same as Create New Branch Users)
  const strictEmailRegex =
    /^[A-Za-z0-9._%+-]{3,40}@(gmail\.com|yahoo\.com|yahoo\.co\.in|outlook\.com|hotmail\.com|thestackly\.com|stackly\.in)$/i;
  const nameRegex = /^[A-Za-z\s]+$/;
  const firstNameRegex = /^[A-Za-z\s]{1,40}$/;
  const lastNameRegex = /^[A-Za-z\s]{1,30}$/;
  const reportingRegex = /^[A-Za-z.\-\s]{1,40}$/;
  const branchesRegex = /^\d+(,\s*\d+)*$/;
  const employeeIdRegex = /^[A-Za-z0-9\-]{1,20}$/;

  let originalName  = "";
  let originalEmail = "";
  let originalPhone = "";
  let originalRole  = "";
  let originalFirstName = "";
  let originalLastName = "";
  let originalBranch = "";
  let originalDepartment = "";
  let originalReportingTo = "";
  let originalAvailableBranches = "";
  let originalEmployeeId = "";

  let currentEditId = null;
  let currentEditRow   = null;

  // ============================
  // ✅ Enable/Disable Edit User Save Button
  // ============================
  function updateEditUserButtonState() {
    if (!saveEditBtn) return;
    
    const name = (editNameInput?.value || "").trim();
    const email = (editEmailInput?.value || "").trim();
    const phone = (editPhoneInput?.value || "").trim();
    const role = (editRoleSelect?.value || "").trim();
    const firstName = (editFirstNameInput?.value || "").trim();
    const lastName = (editLastNameInput?.value || "").trim();
    const branch = (editBranchInput?.value || "").trim();
    const department = (editDepartmentInput?.value || "").trim();
    const reportingTo = (editReportingToInput?.value || "").trim();
    const availableBranches = (editAvailableBranchesInput?.value || "").trim();
    const employeeId = (editEmployeeIdInput?.value || "").trim();
    
    const nameValid =
      name && name.length >= 3 && name.length <= 40 && nameRegex.test(name);
    
    // Validate email
    const emailValid = email && strictEmailRegex.test(email);
    
    // Validate phone
    let phoneValid = false;
    if (phone) {
      if (phone.startsWith("+")) {
        const parsed = parseE164(phone);
        if (parsed) {
          if (parsed.countryCode) {
            const rule = COUNTRY_RULES[parsed.countryCode];
            const nLen = (parsed.national || "").length;
            phoneValid = nLen >= rule.min && nLen <= rule.max;
          } else {
            const digitsCount = phone.slice(1).replace(/\D/g, "").length;
            phoneValid = digitsCount >= 8 && digitsCount <= 15;
          }
        }
      } else {
        phoneValid = /^\d{10}$/.test(phone);
      }
    }
    
    // Validate role
    const roleValid = !!role;
    const firstNameValid = firstName && firstNameRegex.test(firstName);
    const lastNameValid = lastName && lastNameRegex.test(lastName);
    const branchValid = !!branch;
    const departmentValid = !!department;
    const reportingToValid = reportingTo && reportingRegex.test(reportingTo);
    const availableBranchesValid = availableBranches && branchesRegex.test(availableBranches);
    const employeeIdValid = employeeId && employeeIdRegex.test(employeeId);
    
    // Enable button only if all fields are valid
    saveEditBtn.disabled = !(
      nameValid &&
      emailValid &&
      phoneValid &&
      roleValid &&
      firstNameValid &&
      lastNameValid &&
      branchValid &&
      departmentValid &&
      reportingToValid &&
      availableBranchesValid &&
      employeeIdValid
    );
  }

  // ============================
  // ✅ Live field validation (like Create New Branch Users)
  // ============================
  function validateEditEmailDisplay(forBlur) {
    if (!editEmailInput) return;
    const email = (editEmailInput.value || "").trim();
    clearError(editEmailInput, emailError);
    if (!email) {
      setError(editEmailInput, emailError, "Email is required.");
    } else if (!forBlur && (!email.includes("@") || email.endsWith("@"))) {
      // still typing local part or domain — same pattern as create-user.js
    } else if (!strictEmailRegex.test(email)) {
      setError(editEmailInput, emailError, "Enter a valid email address");
    }
    updateEditUserButtonState();
  }

  function validateEditField(field) {
    if (!field) return;
    const name  = (editNameInput?.value  || "").trim();
    const phone = (editPhoneInput?.value || "").trim();
    const role  = (editRoleSelect?.value || "").trim();
    const firstName = (editFirstNameInput?.value || "").trim();
    const lastName = (editLastNameInput?.value || "").trim();
    const branch = (editBranchInput?.value || "").trim();
    const department = (editDepartmentInput?.value || "").trim();
    const reportingTo = (editReportingToInput?.value || "").trim();
    const availableBranches = (editAvailableBranchesInput?.value || "").trim();
    const employeeId = (editEmployeeIdInput?.value || "").trim();

    if (field === editNameInput) {
      clearError(editNameInput, nameError);
      if (!name) {
        setError(editNameInput, nameError, "Name is required.");
      } else if (name.length < 3) {
        setError(editNameInput, nameError, "Minimum 3 Letters Required");
      } else if (name.length > 40) {
        setError(
          editNameInput,
          nameError,
          "Name should contain only letters (max 40)."
        );
      } else if (!nameRegex.test(name)) {
        setError(
          editNameInput,
          nameError,
          "Name should contain only letters (max 40)."
        );
      }
    } else if (field === editPhoneInput) {
      clearError(editPhoneInput, phoneError);
      if (!phone) {
        setError(editPhoneInput, phoneError, "Phone number is required.");
      } else if (phone.startsWith("+")) {
        const parsed = parseE164(phone);
        if (!parsed) {
          setError(editPhoneInput, phoneError, "Enter valid phone like +974XXXXXXXX.");
        } else if (!parsed.countryCode) {
          const digitsCount = phone.slice(1).replace(/\D/g, "").length;
          if (digitsCount < 8 || digitsCount > 15) {
            setError(editPhoneInput, phoneError, "Phone must be 8 to 15 digits after +.");
          }
        } else {
          const rule = COUNTRY_RULES[parsed.countryCode];
          const nLen = (parsed.national || "").length;
          if (nLen < rule.min || nLen > rule.max) {
            setError(
              editPhoneInput,
              phoneError,
              `Contact Number must be exactly ${rule.min} digits for this country.`
            );
          }
        }
      } else if (!/^\d{10}$/.test(phone)) {
        setError(editPhoneInput, phoneError, "Enter 10 digit number or use +countrycode.");
      }
    } else if (field === editRoleSelect) {
      clearError(editRoleSelect, roleError);
      if (!role) {
        setError(editRoleSelect, roleError, "Please select a Role.");
      }
    } else if (field === editFirstNameInput) {
      clearError(editFirstNameInput, firstNameError);
      if (!firstName) {
        setError(editFirstNameInput, firstNameError, "First Name is required.");
      } else if (!firstNameRegex.test(firstName)) {
        setError(editFirstNameInput, firstNameError, "First Name should contain only letters (1-40).");
      }
    } else if (field === editLastNameInput) {
      clearError(editLastNameInput, lastNameError);
      if (!lastName) {
        setError(editLastNameInput, lastNameError, "Last Name is required.");
      } else if (!lastNameRegex.test(lastName)) {
        setError(editLastNameInput, lastNameError, "Last Name should contain only letters (1-30).");
      }
    } else if (field === editBranchInput) {
      clearError(editBranchInput, branchError);
      if (!branch) {
        setError(editBranchInput, branchError, "Branch is required.");
      }
    } else if (field === editDepartmentInput) {
      clearError(editDepartmentInput, departmentError);
      if (!department) {
        setError(editDepartmentInput, departmentError, "Department is required.");
      }
    } else if (field === editReportingToInput) {
      clearError(editReportingToInput, reportingToError);
      if (!reportingTo) {
        setError(editReportingToInput, reportingToError, "Reporting To is required.");
      } else if (!reportingRegex.test(reportingTo)) {
        setError(editReportingToInput, reportingToError, "Reporting To may contain letters, dots, hyphens and spaces.");
      }
    } else if (field === editAvailableBranchesInput) {
      clearError(editAvailableBranchesInput, availableBranchesError);
      if (!availableBranches) {
        setError(editAvailableBranchesInput, availableBranchesError, "Available Branches is required.");
      } else if (!branchesRegex.test(availableBranches)) {
        setError(editAvailableBranchesInput, availableBranchesError, "Use format like: 1,2,3");
      }
    } else if (field === editEmployeeIdInput) {
      clearError(editEmployeeIdInput, employeeIdError);
      if (!employeeId) {
        setError(editEmployeeIdInput, employeeIdError, "Employee ID is required.");
      } else if (!employeeIdRegex.test(employeeId)) {
        setError(editEmployeeIdInput, employeeIdError, "Employee ID may have letters, numbers and '-' (max 20).");
      }
    }

    updateEditUserButtonState();
  }

  function runEditModalLiveValidation() {
    validateEditField(editNameInput);
    validateEditEmailDisplay(true);
    validateEditField(editPhoneInput);
    validateEditField(editRoleSelect);
    validateEditField(editFirstNameInput);
    validateEditField(editLastNameInput);
    validateEditField(editBranchInput);
    validateEditField(editDepartmentInput);
    validateEditField(editReportingToInput);
    validateEditField(editAvailableBranchesInput);
    validateEditField(editEmployeeIdInput);
  }

  // ---- input restrictions + live validation while typing / on blur ----
  if (editNameInput) {
    editNameInput.addEventListener("input", () => {
      let value = editNameInput.value;
      value = value.replace(/[^A-Za-z\s]/g, "");
      value = value.replace(/\s{2,}/g, " ");
      if (value.length > 40) value = value.slice(0, 40);
      editNameInput.value = value;
      validateEditField(editNameInput);
    });
    editNameInput.addEventListener("blur", () => validateEditField(editNameInput));
  }

  if (editEmailInput) {
    editEmailInput.addEventListener("input", () => {
      validateEditEmailDisplay(false);
    });
    editEmailInput.addEventListener("blur", () => validateEditEmailDisplay(true));
  }
 
  if (editPhoneInput) {
    editPhoneInput.addEventListener("input", () => {
      let v = editPhoneInput.value || "";
 
      // allow digits and only one leading +
      v = v.replace(/[^\d+]/g, "");
      v = v.replace(/(?!^)\+/g, "");
 
      if (v.startsWith("+")) {
        let digits = v.slice(1).replace(/\D/g, "");
 
        // detect country code (longest match first)
        const codes = Object.keys(COUNTRY_RULES).sort((a, b) => b.length - a.length);
        const code = codes.find(c => digits.startsWith(c));
 
        if (code) {
          const rule = COUNTRY_RULES[code];
          const national = digits.slice(code.length).slice(0, rule.max);
          digits = code + national;
        } else {
          digits = digits.slice(0, 15);
        }
 
        v = "+" + digits;
      } else {
        v = v.replace(/\D/g, "").slice(0, 15);
      }
 
      editPhoneInput.value = v;
      validateEditField(editPhoneInput);
    });
    editPhoneInput.addEventListener("blur", () => validateEditField(editPhoneInput));
  }
 
  if (editRoleSelect) {
    editRoleSelect.addEventListener("change", () => {
      validateEditField(editRoleSelect);
    });
    editRoleSelect.addEventListener("blur", () => validateEditField(editRoleSelect));
  }

  if (editFirstNameInput) {
    editFirstNameInput.addEventListener("input", () => {
      let v = editFirstNameInput.value || "";
      v = v.replace(/[^A-Za-z\s]/g, "").replace(/\s{2,}/g, " ").slice(0, 40);
      editFirstNameInput.value = v;
      validateEditField(editFirstNameInput);
    });
    editFirstNameInput.addEventListener("blur", () => validateEditField(editFirstNameInput));
  }

  if (editLastNameInput) {
    editLastNameInput.addEventListener("input", () => {
      let v = editLastNameInput.value || "";
      v = v.replace(/[^A-Za-z\s]/g, "").replace(/\s{2,}/g, " ").slice(0, 30);
      editLastNameInput.value = v;
      validateEditField(editLastNameInput);
    });
    editLastNameInput.addEventListener("blur", () => validateEditField(editLastNameInput));
  }

  if (editBranchInput) {
    editBranchInput.addEventListener("change", () => validateEditField(editBranchInput));
    editBranchInput.addEventListener("blur", () => validateEditField(editBranchInput));
  }

  if (editDepartmentInput) {
    editDepartmentInput.addEventListener("change", () => validateEditField(editDepartmentInput));
    editDepartmentInput.addEventListener("blur", () => validateEditField(editDepartmentInput));
  }

  if (editReportingToInput) {
    editReportingToInput.addEventListener("input", () => {
      let v = editReportingToInput.value || "";
      v = v.replace(/[^A-Za-z.\-\s]/g, "").replace(/\s{2,}/g, " ").slice(0, 40);
      editReportingToInput.value = v;
      validateEditField(editReportingToInput);
    });
    editReportingToInput.addEventListener("blur", () => validateEditField(editReportingToInput));
  }

  if (editAvailableBranchesInput) {
    editAvailableBranchesInput.addEventListener("input", () => {
      let v = editAvailableBranchesInput.value || "";
      v = v.replace(/[^0-9,\s]/g, "");
      editAvailableBranchesInput.value = v;
      validateEditField(editAvailableBranchesInput);
    });
    editAvailableBranchesInput.addEventListener("blur", () => validateEditField(editAvailableBranchesInput));
  }

  if (editEmployeeIdInput) {
    editEmployeeIdInput.addEventListener("input", () => {
      let v = editEmployeeIdInput.value || "";
      v = v.replace(/[^A-Za-z0-9\-]/g, "").slice(0, 20);
      editEmployeeIdInput.value = v;
      validateEditField(editEmployeeIdInput);
    });
    editEmployeeIdInput.addEventListener("blur", () => validateEditField(editEmployeeIdInput));
  }

  // Initialize button as disabled when modal opens
  if (saveEditBtn) {
    saveEditBtn.disabled = true;
  }

  // ---- modal helpers ----
  function openModal() {
  if (!modal) return;

  lastFocusedElement = document.activeElement; // save focus
  modal.style.display = "flex";

  const focusable = modal.querySelectorAll(
    'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (focusable.length) {
    focusable[0].focus(); // focus first field
  }

  trapFocus(modal);
}

  function closeModal() {
  if (!modal) return;

  modal.style.display = "none";

  if (lastFocusedElement) {
    lastFocusedElement.focus(); // restore focus
  }

  currentEditId = null;
  currentEditRow   = null;
  clearAllErrors();
  
  // Reset button state when closing modal
  if (saveEditBtn) {
    saveEditBtn.disabled = true;
    saveEditBtn.textContent = "Save";
    delete saveEditBtn.dataset.originalText;
  }
}

function trapFocus(container) {
  // ✅ prevent adding listener again and again
  if (container.dataset.trap === "1") return;
  container.dataset.trap = "1";

  const getFocusable = () =>
    container.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

  container.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;

    const focusable = getFocusable();
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}


  // ---- open modal on edit (event delegation for dynamically loaded rows) ----
  tableBody.addEventListener("click", (e) => {
    const btn = e.target.closest(".edit-btn");
    if (!btn || btn.disabled || btn.classList.contains("edit-btn-disabled")) return;
    const idxStr = btn.getAttribute("data-id");
    if (idxStr === null) return;

    const idx = parseInt(idxStr, 10);
    if (isNaN(idx) || idx < 0) return;

    currentEditId = idx;
    currentEditRow   = btn.closest("tr");

    const u = allUsers.find((item) => Number(item?.user_id) === idx);
    if (!u) return;
    const name  = (u && u.name) ? String(u.name).trim() : "";
    const email = (u && u.email) ? String(u.email).trim() : "";
    const phone = (u && u.phone) ? String(u.phone).trim() : "";
    const firstNameFromDb = (u && u.first_name) ? String(u.first_name).trim() : "";
    const lastNameFromDb = (u && u.last_name) ? String(u.last_name).trim() : "";
    const split = splitName(name);
    const firstName = firstNameFromDb || split.firstName;
    const lastName = lastNameFromDb || split.lastName;
    const branch = (u && u.branch) ? String(u.branch).trim() : "";
    const department = (u && u.department) ? String(u.department).trim() : "";
    const reportingTo = (u && u.reporting_to) ? String(u.reporting_to).trim() : "";
    const availableBranches = (u && u.available_branches) ? String(u.available_branches).trim() : "";
    const employeeId = (u && u.employee_id) ? String(u.employee_id).trim() : "";
    let role  = (u && u.role) ? String(u.role).trim() : "";
    if (role === "Super_Admin") role = "Super Admin";

    if (editNameInput)  editNameInput.value  = name;
    if (editEmailInput) editEmailInput.value = email;
    if (editPhoneInput) editPhoneInput.value = phone;
    if (editRoleSelect) editRoleSelect.value = role;
    if (editFirstNameInput) editFirstNameInput.value = firstName;
    if (editLastNameInput) editLastNameInput.value = lastName;
    if (editBranchInput) editBranchInput.value = branch;
    if (editDepartmentInput) editDepartmentInput.value = department;
    if (editReportingToInput) editReportingToInput.value = reportingTo;
    if (editAvailableBranchesInput) editAvailableBranchesInput.value = availableBranches;
    if (editEmployeeIdInput) editEmployeeIdInput.value = employeeId;

    originalName  = name;
    originalEmail = email;
    originalPhone = phone;
    originalRole  = role;
    originalFirstName = firstName;
    originalLastName = lastName;
    originalBranch = branch;
    originalDepartment = department;
    originalReportingTo = reportingTo;
    originalAvailableBranches = availableBranches;
    originalEmployeeId = employeeId;

    clearAllErrors();
    openModal();
    runEditModalLiveValidation();
  });

  // close modal
  closeEditBtn?.addEventListener("click", closeModal);

  window.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  // ---- save edit (INLINE ERRORS for all fields) ----
  saveEditBtn?.addEventListener("click", () => {
    if (currentEditId === null || currentEditRow === null) {
      console.error("No row is being edited currently.");
      return;
    }

    // Disable button and show loading state
    if (saveEditBtn) {
      saveEditBtn.disabled = true;
      const originalText = saveEditBtn.textContent;
      saveEditBtn.textContent = "Saving...";
      saveEditBtn.dataset.originalText = originalText;
    }

    const name  = (editNameInput?.value  || "").trim();
    const email = (editEmailInput?.value || "").trim();
    const phone = (editPhoneInput?.value || "").trim();
    const role  = (editRoleSelect?.value || "").trim();
    const first_name = (editFirstNameInput?.value || "").trim();
    const last_name = (editLastNameInput?.value || "").trim();
    const branch = (editBranchInput?.value || "").trim();
    const department = (editDepartmentInput?.value || "").trim();
    const reporting_to = (editReportingToInput?.value || "").trim();
    const available_branches = (editAvailableBranchesInput?.value || "").trim();
    const employee_id = (editEmployeeIdInput?.value || "").trim();

    clearAllErrors();
    let hasError = false;

    // NAME: 3 to 40
    if (!name) {
      setError(editNameInput, nameError, "Name is required.");
      hasError = true;
    } else if (name.length < 3) {
      setError(editNameInput, nameError, "Minimum 3 Letters Required");
      hasError = true;
    } else if (name.length > 40) {
      setError(
        editNameInput,
        nameError,
        "Name should contain only letters (max 40)."
      );
      hasError = true;
    } else if (!nameRegex.test(name)) {
      setError(
        editNameInput,
        nameError,
        "Name should contain only letters (max 40)."
      );
      hasError = true;
    }

    // EMAIL: strict domains
    if (!email) {
      setError(editEmailInput, emailError, "Email is required.");
      hasError = true;
    } else if (!strictEmailRegex.test(email)) {
      setError(editEmailInput, emailError, "Enter a valid email address");
      hasError = true;
    }

   // ✅ PHONE validation (supports +countrycode)
if (!phone) {
  setError(editPhoneInput, phoneError, "Phone number is required.");
  hasError = true;
} else if (phone.startsWith("+")) {
  const parsed = parseE164(phone);

  if (!parsed) {
    setError(editPhoneInput, phoneError, "Enter valid phone like +974XXXXXXXX.");
    hasError = true;
  } else if (!parsed.countryCode) {
    // unknown country code -> allow but validate general E.164 length
    const digitsCount = phone.slice(1).replace(/\D/g, "").length;
    if (digitsCount < 8 || digitsCount > 15) {
      setError(editPhoneInput, phoneError, "Phone must be 8 to 15 digits after +.");
      hasError = true;
    }
  } else {
    const rule = COUNTRY_RULES[parsed.countryCode];
    const nLen = (parsed.national || "").length;

    if (nLen < rule.min || nLen > rule.max) {
      setError(
        editPhoneInput,
        phoneError,
        `Contact Number must be exactly ${rule.min} digits for this country.`
      );
      hasError = true;
    }
  }
} else {
  // no + given -> treat as local (default 10, you can change)
  if (!/^\d{10}$/.test(phone)) {
    setError(editPhoneInput, phoneError, "Enter 10 digit number or use +countrycode.");
    hasError = true;
  }
}

    if (!role) {
      setError(editRoleSelect, roleError, "Please select a Role.");
      hasError = true;
    }

    if (!first_name) {
      setError(editFirstNameInput, firstNameError, "First Name is required.");
      hasError = true;
    } else if (!firstNameRegex.test(first_name)) {
      setError(editFirstNameInput, firstNameError, "First Name should contain only letters (1-40).");
      hasError = true;
    }

    if (!last_name) {
      setError(editLastNameInput, lastNameError, "Last Name is required.");
      hasError = true;
    } else if (!lastNameRegex.test(last_name)) {
      setError(editLastNameInput, lastNameError, "Last Name should contain only letters (1-30).");
      hasError = true;
    }

    if (!branch) {
      setError(editBranchInput, branchError, "Branch is required.");
      hasError = true;
    }

    if (!department) {
      setError(editDepartmentInput, departmentError, "Department is required.");
      hasError = true;
    }

    if (!reporting_to) {
      setError(editReportingToInput, reportingToError, "Reporting To is required.");
      hasError = true;
    } else if (!reportingRegex.test(reporting_to)) {
      setError(editReportingToInput, reportingToError, "Reporting To may contain letters, dots, hyphens and spaces.");
      hasError = true;
    }

    if (!available_branches) {
      setError(editAvailableBranchesInput, availableBranchesError, "Available Branches is required.");
      hasError = true;
    } else if (!branchesRegex.test(available_branches)) {
      setError(editAvailableBranchesInput, availableBranchesError, "Use format like: 1,2,3");
      hasError = true;
    }

    if (!employee_id) {
      setError(editEmployeeIdInput, employeeIdError, "Employee ID is required.");
      hasError = true;
    } else if (!employeeIdRegex.test(employee_id)) {
      setError(editEmployeeIdInput, employeeIdError, "Employee ID may have letters, numbers and '-' (max 20).");
      hasError = true;
    }

    if (hasError) {
      // Re-enable button on validation error
      if (saveEditBtn) {
        saveEditBtn.disabled = false;
        saveEditBtn.textContent = saveEditBtn.dataset.originalText || "Save";
        updateEditUserButtonState();
      }
      return;
    }

    // no changes
    const nameChanged  = name  !== originalName;
    const emailChanged = email !== originalEmail;
    const phoneChanged = phone !== originalPhone;
    const roleChanged  = role  !== originalRole;
    const firstNameChanged = first_name !== originalFirstName;
    const lastNameChanged = last_name !== originalLastName;
    const branchChanged = branch !== originalBranch;
    const departmentChanged = department !== originalDepartment;
    const reportingToChanged = reporting_to !== originalReportingTo;
    const availableBranchesChanged = available_branches !== originalAvailableBranches;
    const employeeIdChanged = employee_id !== originalEmployeeId;

    if (!nameChanged && !emailChanged && !phoneChanged && !roleChanged &&
        !firstNameChanged && !lastNameChanged && !branchChanged &&
        !departmentChanged && !reportingToChanged &&
        !availableBranchesChanged && !employeeIdChanged) {
      showErrorNotification("No changes to save.");
      
      // Re-enable button
      if (saveEditBtn) {
        saveEditBtn.disabled = false;
        saveEditBtn.textContent = saveEditBtn.dataset.originalText || "Save";
        updateEditUserButtonState();
      }
      return;
    }

    const payload = {
      user_id: currentEditId,
      name,
      email,
      phone,
      role,
      first_name,
      last_name,
      branch,
      department,
      reporting_to,
      available_branches,
      employee_id,
    };

    fetch(`/update-user/${currentEditId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    })
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (res.status === 401) {
          alert(data.message || "Session expired. Please log in again.");
          setTimeout(() => { window.location.href = "/login?message=session_expired"; }, 500);
          if (saveEditBtn) {
            saveEditBtn.disabled = false;
            saveEditBtn.textContent = saveEditBtn.dataset.originalText || "Save";
            updateEditUserButtonState();
          }
          return;
        }
        if (data.success) {
          if (saveEditBtn) {
            saveEditBtn.textContent = saveEditBtn.dataset.originalText || "Save";
            delete saveEditBtn.dataset.originalText;
          }
          closeModal();
          showSuccessNotification("User has been edited successfully");
          return fetchUsers();
        } else {
          alert(data.message || "Failed to update user.");
          if (saveEditBtn) {
            saveEditBtn.disabled = false;
            saveEditBtn.textContent = saveEditBtn.dataset.originalText || "Save";
            updateEditUserButtonState();
          }
        }
      })
      .catch((err) => {
        console.error("Error updating user:", err);
        alert("Error updating user.");
        
        // Re-enable button on error
        if (saveEditBtn) {
          saveEditBtn.disabled = false;
          saveEditBtn.textContent = saveEditBtn.dataset.originalText || "Save";
          updateEditUserButtonState();
        }
      });
  });

  // initial load: fetch users via XHR (same pattern as customer / products)
  fetchUsers();
});
