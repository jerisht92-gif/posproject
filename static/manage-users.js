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
  const pageInfo = document.getElementById("pageInfo");

  // 👉 Go to Create User page
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      window.location.href = "/create-user";
    });
  }

  // ============================
  //   DATA (loaded via Fetch/XHR from /api/users)
  // ============================
  let allUsers = [];
  let filteredIndices = []; // indices into allUsers that match search
  let currentPage = 1;
  const rowsPerPage = 10;
  let currentUserRole = "user"; // from API for RBAC

  function normalizeRole(r) {
    return (r || "").toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
  }

  function fetchUsers() {
    return fetch("/api/users")
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
        const role = (payload && payload.current_user && payload.current_user.role) ? payload.current_user.role : "User";
        currentUserRole = normalizeRole(role);
        applyFilter();
      })
      .catch((err) => {
        console.error("Error fetching users:", err);
        allUsers = [];
        applyFilter();
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

    const totalRows = filteredIndices.length;
    const totalPages = totalRows === 0 ? 1 : Math.ceil(totalRows / rowsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageIndices = filteredIndices.slice(start, end);

    // Keep noUserRow reference, clear rest
    const noRow = document.getElementById("noUserRow");
    tableBody.innerHTML = "";
    if (noRow) tableBody.appendChild(noRow);

    if (pageIndices.length === 0) {
      if (noUserRow) noUserRow.style.display = "";
      if (showingCount) showingCount.textContent = "0";
      if (pageInfo) pageInfo.textContent = "Page 0 of 0";
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    if (noUserRow) noUserRow.style.display = "none";

    const canEdit = getCanEdit();
    const canDelete = getCanDelete();

    pageIndices.forEach((idx) => {
      const u = allUsers[idx];
      if (!u || typeof u !== "object") return;
      const name = (u.name || "").trim();
      const email = (u.email || "").trim();
      const phone = (u.phone || "").trim();
      const role = (u.role || "User").trim();
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
              ? `<button class="action-btn edit-btn" data-id="${idx}">Edit</button>`
              : `<button class="action-btn edit-btn-disabled" disabled title="No access">Edit</button>`}
            ${canDelete
              ? `<button class="action-btn delete-btn" data-id="${idx}">Delete</button>`
              : `<button class="action-btn delete-btn-disabled" disabled title="Only Super Admin can delete">Delete</button>`}
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    const startEntry = totalRows === 0 ? 0 : start + 1;
    const endEntry = Math.min(end, totalRows);
    if (showingCount) showingCount.textContent = totalRows > 0 ? `${startEntry}-${endEntry} of ${totalRows}` : "0";
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage <= 1 || totalRows === 0;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages || totalRows === 0;
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s == null ? "" : String(s);
    return div.innerHTML;
  }

  function applyFilter() {
    const q = (searchInput?.value || "").trim().toLowerCase();
    if (!q) {
      filteredIndices = allUsers.map((_, i) => i);
    } else {
      filteredIndices = allUsers
        .map((u, i) => {
          const name = (u.name || "").toLowerCase();
          const email = (u.email || "").toLowerCase();
          const phone = (u.phone || "").toLowerCase();
          const role = (u.role || "").toLowerCase();
          return (name.includes(q) || email.includes(q) || phone.includes(q) || role.includes(q)) ? i : -1;
        })
        .filter((i) => i >= 0);
    }
    currentPage = 1;
    renderPage();
  }

  if (searchInput && tableBody) {
    searchInput.addEventListener("input", applyFilter);
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      currentPage--;
      renderPage();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      currentPage++;
      renderPage();
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
  fetch(`/delete-user/${pendingDeleteId}`, { method: "DELETE" })
    .then((res) => res.json())
    .then((data) => {
      closeDeleteModal();
      showSuccessNotification("User has been deleted successfully");
      return fetchUsers();
    })
    .catch((err) => {
      console.error(err);
      closeDeleteModal();
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



  // error elements (must exist in HTML)
  const nameError  = document.getElementById("editNameError");
  const emailError = document.getElementById("editEmailError");
  const phoneError = document.getElementById("editPhoneError");
  const roleError  = document.getElementById("editRoleError");

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
  }

  // ✅ strict email domains (same idea as your backend)
  const strictEmailRegex =
    /^[A-Za-z0-9._%+-]{3,40}@(gmail\.com|yahoo\.com|yahoo\.co\.in|outlook\.com|hotmail\.com|thestackly\.com|stackly\.in)$/i;

  let originalName  = "";
  let originalEmail = "";
  let originalPhone = "";
  let originalRole  = "";

  let currentEditIndex = null;
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
    
    // Validate name
    const nameValid = name && name.length >= 3 && name.length <= 40 && /^[A-Za-z\s]+$/.test(name);
    
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
    
    // Enable button only if all fields are valid
    saveEditBtn.disabled = !(nameValid && emailValid && phoneValid && roleValid);
  }

  // ---- input restrictions + clear inline error while typing ----
  if (editNameInput) {
    editNameInput.addEventListener("input", () => {
      let value = editNameInput.value;
      value = value.replace(/[^A-Za-z\s]/g, "");
      value = value.replace(/\s+/g, " ");
      if (value.length > 40) value = value.slice(0, 40);
      editNameInput.value = value;
      clearError(editNameInput, nameError);
      updateEditUserButtonState();
    });
  }

  if (editEmailInput) {
    editEmailInput.addEventListener("input", () => {
      clearError(editEmailInput, emailError);
      updateEditUserButtonState();
    });
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
          const national = digits.slice(code.length).slice(0, rule.max); // ✅ limit exact digits
          digits = code + national;
        } else {
          // unknown country → allow max 15 digits after +
          digits = digits.slice(0, 15);
        }

        v = "+" + digits;
      } else {
        // if user types without +, just keep digits (max 15)
        v = v.replace(/\D/g, "").slice(0, 15);
      }

      editPhoneInput.value = v;
      clearError(editPhoneInput, phoneError);
      updateEditUserButtonState();
    });
  }


  if (editRoleSelect) {
    editRoleSelect.addEventListener("change", () => {
      clearError(editRoleSelect, roleError);
      updateEditUserButtonState();
    });
  }
  
  // Initialize button as disabled when modal opens
  if (saveEditBtn) {
    saveEditBtn.disabled = true;
  }

  // ✅ Country rules (national number length)
// key = country calling code without '+'
const COUNTRY_RULES = {
  "91":  { min: 10, max: 10 }, // IN
  "971": { min: 9,  max: 9  }, // AE (UAE)
  "974": { min: 8,  max: 8  }, // QA (Qatar)
  "966": { min: 9,  max: 9  }, // SA (Saudi)
  "94":  { min: 9,  max: 9  }, // LK (Sri Lanka)
  "880": { min: 10, max: 10 }, // BD (Bangladesh)
  "977": { min: 10, max: 10 }, // NP (Nepal)
  "1":   { min: 10, max: 10 }, // US
  "44":  { min: 10, max: 10 }, // GB (UK)  ✅ (10 or 11 sometimes, but keep 10 if your app needs fixed)
  "61":  { min: 9,  max: 9  }, // AU (Australia)
};


// Parse +<countrycode><nationalnumber>
function parseE164(phoneRaw) {
  const s = (phoneRaw || "").trim();

  // must start with +
  if (!s.startsWith("+")) return null;

  // remove +
  const digits = s.slice(1).replace(/\D/g, "");
  if (!digits) return null;

  // find matching country code (longest match first)
  const codes = Object.keys(COUNTRY_RULES).sort((a, b) => b.length - a.length);
  const code = codes.find(c => digits.startsWith(c));
  if (!code) return { countryCode: null, national: digits }; // unknown code

  return { countryCode: code, national: digits.slice(code.length) };
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

  currentEditIndex = null;
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
    if (isNaN(idx) || idx < 0 || idx >= allUsers.length) return;

    currentEditIndex = idx;
    currentEditRow   = btn.closest("tr");

    const u = allUsers[idx];
    const name  = (u && u.name) ? String(u.name).trim() : "";
    const email = (u && u.email) ? String(u.email).trim() : "";
    const phone = (u && u.phone) ? String(u.phone).trim() : "";
    let role  = (u && u.role) ? String(u.role).trim() : "";
    if (role === "Super Admin") role = "Super_Admin";

    if (editNameInput)  editNameInput.value  = name;
    if (editEmailInput) editEmailInput.value = email;
    if (editPhoneInput) editPhoneInput.value = phone;
    if (editRoleSelect) editRoleSelect.value = role;

    originalName  = name;
    originalEmail = email;
    originalPhone = phone;
    originalRole  = role;

    clearAllErrors();
    openModal();
    updateEditUserButtonState();
  });

  // close modal
  closeEditBtn?.addEventListener("click", closeModal);

  window.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  // ---- save edit (INLINE ERRORS for all fields) ----
  saveEditBtn?.addEventListener("click", () => {
    if (currentEditIndex === null || currentEditRow === null) {
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

    clearAllErrors();
    let hasError = false;

    // NAME: 3 to 40
    if (!name) {
      setError(editNameInput, nameError, "Name is required.");
      hasError = true;
    } else if (name.length < 3) {
      setError(editNameInput, nameError, "Name must be at least 3 characters.");
      hasError = true;
    } else if (name.length > 40) {
      setError(editNameInput, nameError, "Name must be maximum 40 characters.");
      hasError = true;
    } else if (!/^[A-Za-z\s]+$/.test(name)) {
      setError(editNameInput, nameError, "Name can contain only letters and spaces.");
      hasError = true;
    }

    // EMAIL: strict domains
    if (!email) {
      setError(editEmailInput, emailError, "Email is required.");
      hasError = true;
    } else if (!strictEmailRegex.test(email)) {
      setError(
        editEmailInput,
        emailError,
        "Enter a valid email."
      );
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
        `For +${parsed.countryCode}, phone must be ${rule.min} digits.`
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

    // ROLE: required
    if (!role) {
      setError(editRoleSelect, roleError, "Role is required.");
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

    if (!nameChanged && !emailChanged && !phoneChanged && !roleChanged) {
      // keep your old behavior (alert) OR you can show a small message.
      alert("No changes to save.");
      
      // Re-enable button
      if (saveEditBtn) {
        saveEditBtn.disabled = false;
        saveEditBtn.textContent = saveEditBtn.dataset.originalText || "Save";
        updateEditUserButtonState();
      }
      return;
    }

    const payload = { index: currentEditIndex, name, email, phone, role };

    fetch("/update-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
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
