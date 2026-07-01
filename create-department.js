// static/create-department.js
// Simple Fetch/XHR integration for the Department & Roles → Create Department page.

function branchOptionLabel(b) {
  const name = (b.name || "").trim();
  const code = (b.code || "").trim();
  if (!name) return "";
  return code ? `${name} (${code})` : name;
}

function populateBranchSelect(selectEl, branches, selectedValue) {
  if (!selectEl) return;
  const keep = (selectedValue || selectEl.value || "").trim();
  const list = Array.isArray(branches) ? branches : [];
  if (!list.length) return;

  selectEl.innerHTML = '<option value="">Select a branch</option>';
  list.forEach((b) => {
    const name = (b.name || "").trim();
    if (!name) return;
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = branchOptionLabel(b);
    if (name === keep) opt.selected = true;
    selectEl.appendChild(opt);
  });

  const hint = document.getElementById("branchSelectHint");
  if (hint) hint.style.display = "none";
}

function loadCompanyBranches(selectEl, selectedValue, onDone) {
  if (!selectEl) {
    if (typeof onDone === "function") onDone();
    return Promise.resolve();
  }

  const serverOptions = Array.from(selectEl.options)
    .filter((o) => o.value)
    .map((o) => ({ name: o.value, code: "" }));

  return fetch("/api/company-branches", { credentials: "same-origin", cache: "no-store" })
    .then((res) => res.json())
    .then((data) => {
      const hint = document.getElementById("branchSelectHint");
      if (!data || !data.success) {
        if (hint && serverOptions.length === 0) hint.style.display = "";
        return;
      }
      const branches = data.branches || [];
      if (branches.length) {
        populateBranchSelect(selectEl, branches, selectedValue);
      } else if (serverOptions.length) {
        populateBranchSelect(selectEl, serverOptions, selectedValue);
      } else if (hint) {
        hint.style.display = "";
      }
    })
    .catch((err) => {
      console.error("Error loading company branches:", err);
      const hint = document.getElementById("branchSelectHint");
      if (hint && serverOptions.length === 0) hint.style.display = "";
    })
    .finally(() => {
      if (typeof onDone === "function") onDone();
    });
}

window.loadCompanyBranches = loadCompanyBranches;

document.addEventListener("DOMContentLoaded", () => {
  console.log("create-department.js loaded ✅");

  const branchSelect = document.getElementById("branchSelect");
  const preselectedBranch = branchSelect?.value || "";
  loadCompanyBranches(branchSelect, preselectedBranch, () => {
    if (typeof window.updateNewDepartmentButtonState === "function") {
      window.updateNewDepartmentButtonState();
    }
  });

  // Fire a Fetch/XHR call so this page shows activity in DevTools → Network → Fetch/XHR.
  // We also log the number of existing roles for quick diagnostics.
  // Include page name so the request name is unique in Network → Fetch/XHR.
  fetch("/api/roles?page=create-department", { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then((payload) => {
      const total = Array.isArray(payload?.roles) ? payload.roles.length : 0;
      console.log(`Loaded ${total} roles via /api/roles for Create Department page.`);
      // Roles table is already rendered server-side; we only need the XHR + diagnostic info.
    })
    .catch((err) => {
      console.error("Error fetching roles on Create Department page:", err);
    });
});

// static/create-department.js
(function () {
  function showDeptSuccess(message) {
    document
      .querySelectorAll(".success-notification, .error-notification")
      .forEach((n) => n.remove());
    const notification = document.createElement("div");
    notification.className = "success-notification";
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add("show"), 10);
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 400);
    }, 2000);
  }

  function showDeptError(message) {
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

  // ============================
  // ✅ AUTO-FADE ERROR MESSAGE AFTER 3 SECONDS
  // ============================
  document.addEventListener("DOMContentLoaded", () => {
    const flashContainer = document.querySelector(".flash-container");
    if (flashContainer) {
      // Wait 3 seconds, then fade out
      setTimeout(() => {
        flashContainer.classList.add("fade-out");
        // Remove from DOM after fade-out animation completes
        setTimeout(() => {
          if (flashContainer.parentNode) {
            flashContainer.parentNode.removeChild(flashContainer);
          }
        }, 400); // Match CSS transition duration
      }, 3000); // 3 seconds
    }

    // ============================
    // ✅ LIVE VALIDATION FOR DEPARTMENT NAME AND CODE
    // ============================
    const departmentName   = document.getElementById("departmentName");
    const departmentCode   = document.getElementById("departmentCode");
    const departmentDesc   = document.getElementById("deptDesc");

    // Error helper functions
    function getErrorNode(input) {
      const parent = input?.closest(".form-field");
      if (!parent) return null;

      let node = parent.querySelector(".field-error-msg");
      if (!node) {
        node = document.createElement("div");
        node.className = "field-error-msg";
        node.style.color = "#c62828";
        node.style.fontSize = "12px";
        node.style.marginTop = "4px";
        node.style.minHeight = "16px";
        parent.appendChild(node);
      }
      return node;
    }

    // ============================
    // ✅ Description validation (alphabets + . , / & and single spaces, max 100 characters)
    // ============================
    if (departmentDesc) {
      departmentDesc.addEventListener("input", (e) => {
        // Allow only letters, space, dot, comma, slash and ampersand
        let value = departmentDesc.value
          .replace(/[^A-Za-z\s.,\/&]/g, "")
          .replace(/\s{2,}/g, " ");
        
        // Restrict to maximum 100 characters
        if (value.length > 100) {
          value = value.substring(0, 100);
        }
        
        departmentDesc.value = value;
      });
      
      // Prevent typing beyond 100 characters on keydown
      departmentDesc.addEventListener("keydown", (e) => {
        // Allow: backspace, delete, tab, escape, enter, arrow keys, home, end
        if ([8, 9, 27, 13, 46, 37, 38, 39, 40, 35, 36].indexOf(e.keyCode) !== -1 ||
            // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            (e.keyCode === 65 && e.ctrlKey === true) ||
            (e.keyCode === 67 && e.ctrlKey === true) ||
            (e.keyCode === 86 && e.ctrlKey === true) ||
            (e.keyCode === 88 && e.ctrlKey === true)) {
          return;
        }
        // Prevent typing if already at 100 characters
        if (departmentDesc.value.length >= 100) {
          e.preventDefault();
        }
      });
      
      // Handle paste events to limit to 100 characters
      departmentDesc.addEventListener("paste", (e) => {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData("text");
        let sanitized = pastedText
          .replace(/[^A-Za-z\s.,\/&]/g, "")
          .replace(/\s{2,}/g, " ");
        
        // Limit to 100 characters
        if (sanitized.length > 100) {
          sanitized = sanitized.substring(0, 100);
        }
        
        departmentDesc.value = sanitized;
        // Trigger input event to ensure any other handlers are notified
        departmentDesc.dispatchEvent(new Event("input"));
      });
    }

    function setFieldError(input, message) {
      const errorNode = getErrorNode(input);
      if (errorNode) {
        errorNode.textContent = message || "";
      }
      if (input) {
        if (message) {
          input.classList.add("input-error");
        } else {
          input.classList.remove("input-error");
        }
      }
    }

    function clearFieldError(input) {
      setFieldError(input, "");
    }

    // Department Name validation (min 3, max 20, alphabets only)
    if (departmentName) {
      departmentName.addEventListener("input", () => {
        // Allow only alphabets and single spaces between words
        departmentName.value = departmentName.value
          .replace(/[^A-Za-z\s]/g, "")
          .replace(/\s{2,}/g, " ")
          .slice(0, 20);

        const value = departmentName.value.trim();

        if (!value) {
          setFieldError(departmentName, "Department Name is required.");
        } else if (value.length < 3) {
          setFieldError(departmentName, "Minimum 3 characters required.");
        } else if (value.length > 20) {
          setFieldError(departmentName, "Maximum 20 characters allowed.");
        } else {
          clearFieldError(departmentName);
        }
      });

      // Also validate on blur
      departmentName.addEventListener("blur", () => {
        const value = departmentName.value.trim();
        if (!value) {
          setFieldError(departmentName, "Department Name is required.");
        } else if (value.length < 3) {
          setFieldError(departmentName, "Minimum 3 characters required.");
        } else if (value.length > 20) {
          setFieldError(departmentName, "Maximum 20 characters allowed.");
        }
      });
    }

    // Code validation (min 3, max 20, alphanumeric and hyphen only)
    if (departmentCode) {
      // Restrict input to alphanumeric and hyphen only (remove other special characters as user types)
      departmentCode.addEventListener("input", (e) => {
        // Remove any characters that are not alphanumeric or hyphen
        let value = departmentCode.value.replace(/[^A-Za-z0-9-]/g, "");
        
        // Restrict to maximum 20 characters
        if (value.length > 20) {
          value = value.substring(0, 20);
        }
        
        departmentCode.value = value;
        
        const trimmedValue = value.trim();
        
        if (!trimmedValue) {
          setFieldError(departmentCode, "Code is required.");
        } else if (trimmedValue.length < 3) {
          setFieldError(departmentCode, "Minimum 3 characters required.");
        } else if (trimmedValue.length > 20) {
          setFieldError(departmentCode, "Maximum 20 characters allowed.");
        } else if (!/^[A-Za-z0-9-]+$/.test(trimmedValue)) {
          setFieldError(departmentCode, "Code can contain only letters, numbers, and hyphen (-).");
        } else {
          clearFieldError(departmentCode);
        }
      });
      
      // Prevent typing beyond 20 characters on keydown
      departmentCode.addEventListener("keydown", (e) => {
        // Allow: backspace, delete, tab, escape, enter, arrow keys, home, end
        if ([8, 9, 27, 13, 46, 37, 38, 39, 40, 35, 36].indexOf(e.keyCode) !== -1 ||
            // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            (e.keyCode === 65 && e.ctrlKey === true) ||
            (e.keyCode === 67 && e.ctrlKey === true) ||
            (e.keyCode === 86 && e.ctrlKey === true) ||
            (e.keyCode === 88 && e.ctrlKey === true)) {
          return;
        }
        // Prevent typing if already at 20 characters
        if (departmentCode.value.length >= 20) {
          e.preventDefault();
        }
      });

      // Also validate on blur
      departmentCode.addEventListener("blur", () => {
        const value = departmentCode.value.trim();
        if (!value) {
          setFieldError(departmentCode, "Code is required.");
        } else if (value.length < 3) {
          setFieldError(departmentCode, "Minimum 3 characters required.");
        } else if (value.length > 20) {
          setFieldError(departmentCode, "Maximum 20 characters allowed.");
        } else if (!/^[A-Za-z0-9-]+$/.test(value)) {
          setFieldError(departmentCode, "Code can contain only letters, numbers, and hyphen (-).");
        }
      });

      // Prevent paste of invalid characters and limit to 20 characters
      departmentCode.addEventListener("paste", (e) => {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData("text");
        let allowedChars = pastedText.replace(/[^A-Za-z0-9-]/g, "");
        // Limit to 20 characters
        if (allowedChars.length > 20) {
          allowedChars = allowedChars.substring(0, 20);
        }
        departmentCode.value = allowedChars;
        // Trigger input event to validate
        departmentCode.dispatchEvent(new Event("input"));
    });
  }

    // ============================
    // Description validation (live, like Create New Branch Users)
    // ============================
    if (departmentDesc) {
      departmentDesc.addEventListener("input", () => {
        const value = (departmentDesc.value || "").trim();

        if (!value) {
          setFieldError(departmentDesc, "Description is required.");
        } else if (value.length > 100) {
          setFieldError(departmentDesc, "Description must be maximum 100 characters.");
        } else if (!/^[A-Za-z\s.,\/&]+$/.test(value)) {
          setFieldError(
            departmentDesc,
            "Description can use letters, spaces and . , / & only."
          );
        } else {
          clearFieldError(departmentDesc);
        }
      });

      departmentDesc.addEventListener("blur", () => {
        const value = (departmentDesc.value || "").trim();
        if (!value) {
          setFieldError(departmentDesc, "Description is required.");
        }
      });
    }

    // ============================
    // ✅ Enable/Disable New Department Save Button
    // ============================
    const createForm = document.querySelector(".create-form");
    const submitBtn = createForm ? createForm.querySelector('button[type="submit"]') : null;
    const branchSelect = document.getElementById("branchSelect");
    
    function updateNewDepartmentButtonState() {
      if (!submitBtn) return;
      
      const code = (departmentCode?.value || "").trim();
      const name = (departmentName?.value || "").trim();
      const branch = branchSelect?.value || "";
      const desc = (departmentDesc?.value || "").trim();
      
      // Validate code
      const codeValid = code && code.length >= 3 && code.length <= 20 && /^[A-Za-z0-9-]+$/.test(code);
      
      // Validate name
      const nameValid = name && name.length >= 3 && name.length <= 20 && /^[A-Za-z\s]+$/.test(name);
      
      // Validate branch
      const branchValid = !!branch;
      
      // Validate description
      const descValid = desc && desc.length <= 100 && /^[A-Za-z\s.,\/&]+$/.test(desc);
      
      // When all text fields are valid, force user to pick a branch
      const allTextValid = codeValid && nameValid && descValid;
      if (allTextValid) {
        if (!branchValid && branchSelect) {
          setFieldError(branchSelect, "Please select a Branch.");
        } else if (branchValid && branchSelect) {
          clearFieldError(branchSelect);
        }
      }
      
      // Enable button only if all fields are valid
      submitBtn.disabled = !(codeValid && nameValid && branchValid && descValid);
    }
    window.updateNewDepartmentButtonState = updateNewDepartmentButtonState;

    // Add event listeners to update button state
    if (departmentCode) {
      departmentCode.addEventListener("input", updateNewDepartmentButtonState);
      departmentCode.addEventListener("blur", updateNewDepartmentButtonState);
    }
    
    if (departmentName) {
      departmentName.addEventListener("input", updateNewDepartmentButtonState);
      departmentName.addEventListener("blur", updateNewDepartmentButtonState);
    }
    
    if (branchSelect) {
      branchSelect.addEventListener("change", updateNewDepartmentButtonState);
    }
    
    if (departmentDesc) {
      departmentDesc.addEventListener("input", updateNewDepartmentButtonState);
      departmentDesc.addEventListener("blur", updateNewDepartmentButtonState);
    }
    
    // Initialize button as disabled
    if (submitBtn) {
      submitBtn.disabled = true;
    }

    if (window.UnsavedWarning) {
      UnsavedWarning.enable({ root: ".create-form" });
    }

    const addRoleBtn = document.getElementById("addRoleBtn");
    if (addRoleBtn) {
      addRoleBtn.removeAttribute("onclick");
      addRoleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const url = "/department-role/create/new";
        if (window.UnsavedWarning) UnsavedWarning.tryLeave(url);
        else window.location.href = url;
      });
    }
    
    if (createForm) {
      createForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const pageContainer = document.querySelector(".dept-create-page");
        const userRole = pageContainer
          ? (pageContainer.getAttribute("data-current-role") || "").toLowerCase().replace(/\s+/g, "")
          : "";

        if (userRole !== "superadmin") {
          showDeptError("Only Super Admin can create new departments.");
          return;
        }

        const code = (departmentCode?.value || "").trim();
        const name = (departmentName?.value || "").trim();
        const branch = branchSelect?.value || "";
        const description = (departmentDesc?.value || "").trim();

        if (!code || !name || !branch || !description) {
          updateNewDepartmentButtonState();
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Saving...";
        }

        try {
          const res = await fetch("/api/departments", {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              code,
              name,
              department_name: name,
              branch,
              description,
            }),
          });

          const data = await res.json().catch(() => ({}));

          if (res.ok && data.success) {
            if (window.UnsavedWarning) UnsavedWarning.allowLeave();
            try {
              window.sessionStorage.setItem("deptCreatedSuccess", "1");
            } catch (_err) {
              /* ignore */
            }
            window.location.href = "/department-roles";
            return;
          }

          showDeptError(data.message || "Failed to save department.");
        } catch (err) {
          console.error("Create department error:", err);
          showDeptError("Server error while saving department.");
        }

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.originalText || "Save";
        }
      });
    }
  });

  const tableBody = document.getElementById("rolesTableBody");
  if (!tableBody) {
    return;
  }

  // ============================
  // ✅ Focus Trap Helpers
  // ============================
  function getFocusable(modal) {
    if (!modal) return [];
    return Array.from(
      modal.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);
  }

  function trapFocus(modal) {
    const focusable = getFocusable(modal);
    if (!focusable.length) return () => {};

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // focus first element
    first.focus();

    function handleKeyDown(e) {
      if (e.key !== "Tab") return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    modal.addEventListener("keydown", handleKeyDown);
    return () => modal.removeEventListener("keydown", handleKeyDown);
  }

  // ============================
  // ✏️ EDIT ROLE (MODAL)
  // ============================
  const editModal        = document.getElementById("editDeptModal");
  const editRoleInput    = document.getElementById("editRoleName");
  const editDescInput    = document.getElementById("editRoleDesc");
  const editDescError    = document.getElementById("editRoleDescError");
  const editDeptNameView = document.getElementById("editRoleDeptName");
  const editRoleError    = document.getElementById("editRoleNameError");
  const editDeptError    = document.getElementById("editRoleDeptNameError");
  const closeBtn         = document.getElementById("closeDeptEditBtn");
  const saveBtn          = document.getElementById("saveDeptEditBtn");

  async function loadRoleNameOptions() {
    if (!editRoleInput) return;
    try {
      const res = await fetch("/api/roles", { credentials: "same-origin", cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) return;
      const names = Array.isArray(data.role_names) && data.role_names.length
        ? data.role_names
        : (Array.isArray(data.roles) ? data.roles : [])
            .map((r) => (r.role || r.role_name || "").trim())
            .filter(Boolean);
      const seen = new Set();
      const current = editRoleInput.value;
      editRoleInput.innerHTML = '<option value="">Select Role</option>';
      names.forEach((name) => {
        const label = (name || "").trim();
        if (!label || seen.has(label.toLowerCase())) return;
        seen.add(label.toLowerCase());
        const opt = document.createElement("option");
        opt.value = label;
        opt.textContent = label;
        editRoleInput.appendChild(opt);
      });
      if (current && Array.from(editRoleInput.options).some((o) => o.value === current)) {
        editRoleInput.value = current;
      }
    } catch (err) {
      console.error("Error loading role dropdown:", err);
    }
  }
  loadRoleNameOptions();

  let oldRoleValue     = "";
  let currentEditRow   = null; // track which row is being edited
  let oldRoleId        = null; // DB role_id for persistence
  let removeEditTrap   = null;
  let lastFocusBeforeEdit = null;

  function openEditModal() {
    if (!editModal) return;
    lastFocusBeforeEdit = document.activeElement;
    editModal.style.display = "flex";
    removeEditTrap = trapFocus(editModal);

    // Always start with button disabled when modal opens
    if (saveBtn) {
      saveBtn.disabled = true;
    }
  }

  // Error helper functions
  function setRoleError(input, errorEl, msg) {
    if (errorEl) errorEl.textContent = msg;
    if (input) input.classList.add("input-error");
  }

  function clearRoleError(input, errorEl) {
    if (errorEl) errorEl.textContent = "";
    if (input) input.classList.remove("input-error");
  }

  function clearAllRoleErrors() {
    clearRoleError(editRoleInput, editRoleError);
    clearRoleError(editDescInput, editDescError);
    clearRoleError(editDeptNameView, editDeptError);
  }

  // ============================
  // ✅ Live validation for Edit Role fields (same concept as Edit User)
  // ============================
  function validateEditRoleField(field) {
    const roleVal = editRoleInput ? editRoleInput.value : "";
    const descVal = editDescInput ? editDescInput.value.trim() : "";
    const deptVal = editDeptNameView ? editDeptNameView.value.trim() : "";

    if (field === editRoleInput) {
      clearRoleError(editRoleInput, editRoleError);
      if (!roleVal) {
        setRoleError(editRoleInput, editRoleError, "Role is required.");
      }
    } else if (field === editDescInput) {
      clearRoleError(editDescInput, editDescError);
      if (!descVal) {
        setRoleError(editDescInput, editDescError, "Description is required.");
      } else if (descVal.length > 50) {
        setRoleError(editDescInput, editDescError, "Description must not exceed 50 characters.");
      } else if (!/^[A-Za-z\s.,\/&]+$/.test(descVal)) {
        setRoleError(
          editDescInput,
          editDescError,
          "Description can contain only letters, spaces, comma (,), slash (/), dot (.) and &."
        );
      }
    } else if (field === editDeptNameView) {
      clearRoleError(editDeptNameView, editDeptError);
      if (!deptVal) {
        setRoleError(editDeptNameView, editDeptError, "Department is required.");
      } else if (deptVal.length < 3) {
        setRoleError(editDeptNameView, editDeptError, "Minimum 3 characters required.");
      } else if (deptVal.length > 20) {
        setRoleError(editDeptNameView, editDeptError, "Maximum 20 characters allowed.");
      } else if (!/^[A-Za-z\s]+$/.test(deptVal)) {
        setRoleError(editDeptNameView, editDeptError, "Department can contain only letters and spaces.");
      }
    }

    // After updating field errors, refresh Save button state
    updateEditRoleButtonState();
  }

  function closeEditModal() {
    if (!editModal) return;
    editModal.style.display = "none";

    if (removeEditTrap) removeEditTrap();
    removeEditTrap = null;

    // Clear all errors when closing modal
    clearAllRoleErrors();
    
    // Reset button state to disabled when closing modal
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Save";
      delete saveBtn.dataset.originalText;
    }

    if (lastFocusBeforeEdit) lastFocusBeforeEdit.focus();
    lastFocusBeforeEdit = null;
  }

  // ============================
  // ✅ Enable/Disable Edit Role Save Button (Same pattern as Edit User)
  // ============================
  function updateEditRoleButtonState() {
    if (!saveBtn) return;
    
    const role = editRoleInput ? editRoleInput.value : "";
    const desc = editDescInput ? editDescInput.value.trim() : "";
    const dept = editDeptNameView ? editDeptNameView.value.trim() : "";
    
    // Validate role (required - must select from dropdown, not empty string)
    const roleValid = !!role && role !== "";
    
    // Validate description (required, max 50, allowed chars)
    // Same pattern as Edit User: field must exist, meet length requirements, and match format
    const descValid = desc && desc.length > 0 && desc.length <= 50 && /^[A-Za-z\s.,\/&]+$/.test(desc);
    
    // Validate department (required, 3-20 chars, letters + spaces only)
    // Same pattern as Edit User: field must exist, meet length requirements, and match format
    const deptValid = dept && dept.length >= 3 && dept.length <= 20 && /^[A-Za-z\s]+$/.test(dept);
    
    // Enable button only if ALL fields are valid (same logic as Edit User)
    // If any field is invalid, button stays disabled
    const allValid = roleValid && descValid && deptValid;
    saveBtn.disabled = !allValid;
  }

  // Clear error + sanitize when user types in description field
  if (editDescInput) {
    editDescInput.addEventListener("input", () => {
      let value = editDescInput.value;
      
      // Allow only alphabets + . , / & and single spaces
      value = value
        .replace(/[^A-Za-z\s.,\/&]/g, "")
        .replace(/\s{2,}/g, " ");
      
      // Limit to 50 characters
      if (value.length > 50) {
        value = value.substring(0, 50);
      }
      
      editDescInput.value = value;
      // Live validate description like Edit User
      validateEditRoleField(editDescInput);
    });
    
    // Also validate on blur
    editDescInput.addEventListener("blur", () => {
      validateEditRoleField(editDescInput);
    });
    
    // Prevent typing beyond 50 characters on keydown
    editDescInput.addEventListener("keydown", (e) => {
      // Allow: backspace, delete, tab, escape, enter, arrow keys, home, end
      if ([8, 9, 27, 13, 46, 37, 38, 39, 40, 35, 36].indexOf(e.keyCode) !== -1 ||
          // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
          (e.keyCode === 65 && e.ctrlKey === true) ||
          (e.keyCode === 67 && e.ctrlKey === true) ||
          (e.keyCode === 86 && e.ctrlKey === true) ||
          (e.keyCode === 88 && e.ctrlKey === true)) {
        return;
      }
      // Prevent typing if already at 50 characters
      if (editDescInput.value.length >= 50) {
        e.preventDefault();
      }
    });
    
    // Also validate on paste
    editDescInput.addEventListener("paste", (e) => {
      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData("text");
      let sanitized = pastedText
        .replace(/[^A-Za-z\s.,\/&]/g, "")
        .replace(/\s{2,}/g, " ");
      
      // Limit to 50 characters
      if (sanitized.length > 50) {
        sanitized = sanitized.substring(0, 50);
      }
      
      editDescInput.value = sanitized;
      // Trigger input event to validate
      editDescInput.dispatchEvent(new Event("input"));
    });
  }

  // ============================
  // ✅ Department (in Edit Role modal) validation
  //    - alphabets only
  //    - single space between words
  //    - maximum 20 characters
  // ============================
  if (editDeptNameView) {
    editDeptNameView.addEventListener("input", (e) => {
      let value = editDeptNameView.value
        .replace(/[^A-Za-z\s]/g, "")  // keep only letters and spaces
        .replace(/\s{2,}/g, " ");     // collapse multiple spaces
      
      // Restrict to maximum 20 characters
      if (value.length > 20) {
        value = value.substring(0, 20);
      }
      
      editDeptNameView.value = value;

      // Live validate department field
      validateEditRoleField(editDeptNameView);
    });
    
    // Also validate on blur
    editDeptNameView.addEventListener("blur", () => {
      validateEditRoleField(editDeptNameView);
    });
    
    // Prevent typing beyond 20 characters on keydown
    editDeptNameView.addEventListener("keydown", (e) => {
      // Allow: backspace, delete, tab, escape, enter, arrow keys, home, end
      if ([8, 9, 27, 13, 46, 37, 38, 39, 40, 35, 36].indexOf(e.keyCode) !== -1 ||
          // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
          (e.keyCode === 65 && e.ctrlKey === true) ||
          (e.keyCode === 67 && e.ctrlKey === true) ||
          (e.keyCode === 86 && e.ctrlKey === true) ||
          (e.keyCode === 88 && e.ctrlKey === true)) {
        return;
      }
      // Prevent typing if already at 20 characters
      if (editDeptNameView.value.length >= 20) {
        e.preventDefault();
      }
    });
    
    // Handle paste events to limit to 20 characters
    editDeptNameView.addEventListener("paste", (e) => {
      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData("text");
      let sanitized = pastedText
        .replace(/[^A-Za-z\s]/g, "")  // keep only letters and spaces
        .replace(/\s{2,}/g, " ");     // collapse multiple spaces
      
      // Limit to 20 characters
      if (sanitized.length > 20) {
        sanitized = sanitized.substring(0, 20);
      }
      
      editDeptNameView.value = sanitized;
      // Trigger input event to ensure any other handlers are notified
      editDeptNameView.dispatchEvent(new Event("input"));
    });
  }
  
  // Add event listener for role dropdown
  if (editRoleInput) {
    editRoleInput.addEventListener("change", () => {
      validateEditRoleField(editRoleInput);
    });
    
    // Also validate on blur
    editRoleInput.addEventListener("blur", () => {
      validateEditRoleField(editRoleInput);
    });
  }
  
  // Initialize button as disabled
  if (saveBtn) {
    saveBtn.disabled = true;
  }

  // Click outside edit modal closes it
  if (editModal) {
    editModal.addEventListener("click", (e) => {
      if (e.target === editModal) closeEditModal();
    });
  }

  // Cancel edit
  if (closeBtn) closeBtn.addEventListener("click", closeEditModal);

  // ✅ Edit button click (Event delegation)
  tableBody.addEventListener("click", function (e) {
    const editBtn = e.target.closest(".edit-btn");
    if (!editBtn || editBtn.disabled || editBtn.classList.contains("edit-btn-disabled")) return;

    const row = editBtn.closest("tr");
    if (!row) return;

    // remember which row is being edited so we can update it after save
    currentEditRow = row;

    oldRoleId = row.getAttribute("data-role-id") || "";
    oldRoleValue = (row.children[0]?.innerText || "").trim();

    // Populate role dropdown
if (editRoleInput) {
  const roleText = oldRoleValue.trim();
  // Find matching option
  const option = Array.from(editRoleInput.options).find(
    (opt) => opt.value === roleText
  );
  editRoleInput.value = option ? option.value : "";
}
    
    // Populate and sanitize description
    if (editDescInput) {
      let descValue = (row.children[1]?.innerText || "").trim();
      // Sanitize description to match allowed characters
      descValue = descValue
        .replace(/[^A-Za-z\s.,\/&]/g, "")
        .replace(/\s{2,}/g, " ");
      // Limit to 50 characters
      if (descValue.length > 50) {
        descValue = descValue.substring(0, 50);
      }
      editDescInput.value = descValue;
    }
    
    // Department: prefer value stored on this row (from DB via server render), else main form
    if (editDeptNameView) {
      let deptValue = (row.getAttribute("data-department-name") || "").trim();
      if (!deptValue && departmentName) {
        deptValue = (departmentName.value || "").trim();
      }
      deptValue = deptValue
        .replace(/[^A-Za-z\s]/g, "")
        .replace(/\s{2,}/g, " ");
      if (deptValue.length > 20) {
        deptValue = deptValue.substring(0, 20);
      }
      editDeptNameView.value = deptValue;
    }

    // Clear all errors before opening modal
    clearAllRoleErrors();
    
    // Always disable button before opening modal
    if (saveBtn) {
      saveBtn.disabled = true;
    }

    openEditModal();
    
    // Update button state when modal opens (same pattern as Edit User)
    // Use a small delay to ensure DOM is ready and fields are populated
    setTimeout(() => {
      // Run live validation once for all fields so messages show immediately if invalid
      if (editRoleInput) validateEditRoleField(editRoleInput);
      if (editDescInput) validateEditRoleField(editDescInput);
      if (editDeptNameView) validateEditRoleField(editDeptNameView);
    }, 10);
  });

  // ✅ Save edit
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      // Disable button and show loading state
      if (saveBtn) {
        saveBtn.disabled = true;
        const originalText = saveBtn.textContent;
        saveBtn.textContent = "Saving...";
        saveBtn.dataset.originalText = originalText;
      }
      
      // Clear all previous errors
      clearAllRoleErrors();

      const role = editRoleInput ? editRoleInput.value : "";
      const dept = editDeptNameView ? editDeptNameView.value.trim() : "";

      // Sanitize description then validate (mandatory)
      let rawDesc = editDescInput ? editDescInput.value : "";
      // Allow alphabets + . , / & and single spaces
      rawDesc = rawDesc.replace(/[^A-Za-z\s.,\/&]/g, "").replace(/\s{2,}/g, " ");
      if (editDescInput) editDescInput.value = rawDesc;

      const description = rawDesc.trim();
      
      let hasError = false;

      // Validate Role (required)
      if (!role) {
        setRoleError(editRoleInput, editRoleError, "Role is required.");
        hasError = true;
      }

      // Validate Description (required, max 50, format)
      if (!description) {
        setRoleError(editDescInput, editDescError, "Description is required.");
        hasError = true;
      } else if (description.length > 50) {
        setRoleError(editDescInput, editDescError, "Description must not exceed 50 characters.");
        hasError = true;
      } else if (!/^[A-Za-z\s.,\/&]+$/.test(description)) {
        setRoleError(editDescInput, editDescError, "Description can contain only letters, spaces, comma (,), slash (/), dot (.) and &.");
        hasError = true;
      }
      
      // Validate Department (required, 3-20 chars, letters + spaces only)
      if (!dept) {
        setRoleError(editDeptNameView, editDeptError, "Department is required.");
        hasError = true;
      } else if (dept.length < 3) {
        setRoleError(editDeptNameView, editDeptError, "Minimum 3 characters required.");
        hasError = true;
      } else if (dept.length > 20) {
        setRoleError(editDeptNameView, editDeptError, "Maximum 20 characters allowed.");
        hasError = true;
      } else if (!/^[A-Za-z\s]+$/.test(dept)) {
        setRoleError(editDeptNameView, editDeptError, "Department can contain only letters and spaces.");
        hasError = true;
      }
      
      if (hasError) {
        // Re-enable button on validation error
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = saveBtn.dataset.originalText || "Save";
          updateEditRoleButtonState();
        }
        return;
      }

      if (!oldRoleId) {
        showDeptError("Missing role reference. Please refresh the page and try again.");
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = saveBtn.dataset.originalText || "Save";
          updateEditRoleButtonState();
        }
        return;
      }

      // If validation passes, proceed with save
      fetch("/department-roles/create/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_id: oldRoleId ? parseInt(oldRoleId, 10) : null,
          old_role: oldRoleValue,
          role: editRoleInput ? editRoleInput.value : "",
          description: description,
          department: editDeptNameView ? editDeptNameView.value || "" : "",
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
          // Reset button text immediately after successful update
          if (saveBtn) {
            saveBtn.textContent = saveBtn.dataset.originalText || "Save";
            delete saveBtn.dataset.originalText;
          }
          
            // Close modal
            closeEditModal();

            // Update the currently edited row so changes are visible immediately
            try {
              if (currentEditRow) {
                if (currentEditRow.children[0]) {
                  currentEditRow.children[0].innerText = editRoleInput ? editRoleInput.value : "";
                }
                if (currentEditRow.children[1]) {
                  currentEditRow.children[1].innerText = description;
                }
                if (editDeptNameView) {
                  currentEditRow.setAttribute(
                    "data-department-name",
                    (editDeptNameView.value || "").trim()
                  );
                }
              }
            } catch (e) {
              console.warn("Could not update role row after edit:", e);
            }

            // Show success toast
          showDeptSuccess("Role has been updated successfully");
          } else {
            // Show backend error message (e.g., duplicates)
            showDeptError(data.error || "Update failed");
            
            // Re-enable button on error
            if (saveBtn) {
              saveBtn.disabled = false;
              saveBtn.textContent = saveBtn.dataset.originalText || "Save";
              updateEditRoleButtonState();
            }
          }
        })
        .catch((err) => {
          console.error("Edit role API error:", err);
          showDeptError("API error while updating role");
          
          // Re-enable button on error
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = saveBtn.dataset.originalText || "Save";
            updateEditRoleButtonState();
          }
        });
    });
  }

  // ============================
  // 🗑️ DELETE ROLE (CUSTOM MODAL)
  // ============================
  let pendingDeleteRoleId = null;
  let pendingDeleteRow = null;

  const deleteModal = document.getElementById("deleteRoleModal");
  const deleteRoleNameSpan = document.getElementById("deleteRoleName");
  const cancelDeleteBtn = document.getElementById("cancelDeleteRole");
  const confirmDeleteBtn = document.getElementById("confirmDeleteRole");

  let removeDeleteTrap = null;
  let lastFocusBeforeDelete = null;

  function openDeleteModal(roleName) {
    if (!deleteModal) return;

    if (deleteRoleNameSpan) deleteRoleNameSpan.innerText = roleName || "this role";

    lastFocusBeforeDelete = document.activeElement;
    deleteModal.classList.remove("hidden");

    removeDeleteTrap = trapFocus(deleteModal);
  }

  function closeDeleteModal() {
    if (!deleteModal) return;

    deleteModal.classList.add("hidden");

    if (removeDeleteTrap) removeDeleteTrap();
    removeDeleteTrap = null;

    if (lastFocusBeforeDelete) lastFocusBeforeDelete.focus();
    lastFocusBeforeDelete = null;

    pendingDeleteRoleId = null;
    pendingDeleteRow = null;
  }

  // Delete button click (single handler — duplicate listeners caused repeated alerts/modal opens)
  tableBody.addEventListener("click", (e) => {
    const btn = e.target.closest(".delete-btn");
    if (!btn || btn.disabled || btn.classList.contains("delete-btn-disabled")) return;

    const row = btn.closest("tr");
    if (!row) return;

    const roleName = (row.children[0]?.innerText || "").trim();
    const roleId = row.getAttribute("data-role-id");
    if (!roleId) {
      showDeptError("Missing role reference. Please refresh the page and try again.");
      return;
    }

    pendingDeleteRoleId = parseInt(roleId, 10);
    pendingDeleteRow = row;
    openDeleteModal(roleName);
  });

  // Cancel delete
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", closeDeleteModal);

  // Click outside delete modal closes it
  if (deleteModal) {
    deleteModal.addEventListener("click", (e) => {
      if (e.target === deleteModal) closeDeleteModal();
    });
  }

  // Confirm delete
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", () => {
      if (!pendingDeleteRoleId || confirmDeleteBtn.disabled) return;

      confirmDeleteBtn.disabled = true;
      const originalText = confirmDeleteBtn.textContent;
      confirmDeleteBtn.textContent = "Deleting...";

      fetch("/department-roles/create/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_id: pendingDeleteRoleId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            if (pendingDeleteRow && pendingDeleteRow.parentNode) {
              pendingDeleteRow.remove();
            }
            showDeptSuccess("Role has been deleted successfully");
          } else {
            showDeptError(data.error || data.message || "Delete failed");
          }
        })
        .catch(() => showDeptError("Delete failed"))
        .finally(() => {
          confirmDeleteBtn.disabled = false;
          confirmDeleteBtn.textContent = originalText;
          closeDeleteModal();
        });
    });
  }

 
  // ============================
  // ✅ ESC KEY CLOSE (Edit/Delete)
  // ============================
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;

    const editOpen = editModal && editModal.style.display === "flex";
    const deleteOpen = deleteModal && !deleteModal.classList.contains("hidden");

    if (editOpen) closeEditModal();
    if (deleteOpen) closeDeleteModal();
  });
})();