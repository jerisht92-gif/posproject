// static/create-department.js
(function () {
  // ============================
  // ✅ CREATE-DEPARTMENTS: fetch on load so Fetch/XHR tab shows "create-departments"
  // ============================
  document.addEventListener("DOMContentLoaded", () => {
    fetch("/api/create-departments", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          // Page is already server-rendered with branches/roles; optional: sync or use data here
        }
      })
      .catch(() => {});

    // ============================
    // ✅ AUTO-FADE ERROR MESSAGE AFTER 3 SECONDS
    // ============================
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
      
      // Enable button only if all fields are valid
      submitBtn.disabled = !(codeValid && nameValid && branchValid && descValid);
    }

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
    
    if (createForm) {
      createForm.addEventListener("submit", (e) => {
        const pageContainer = document.querySelector(".dept-create-page");
        const userRole = pageContainer ? (pageContainer.getAttribute("data-current-role") || "").toLowerCase().replace(/\s+/g, "") : "";
        
        if (userRole !== "superadmin" && userRole !== "admin") {
          e.preventDefault();
          e.stopPropagation();
          
          // Show error notification
          showDeptError("User cannot create new departments.");
          return false;
        }
        
        // Disable submit button and show loading state
        if (submitBtn) {
          submitBtn.disabled = true;
          const originalText = submitBtn.textContent;
          submitBtn.textContent = "Saving...";
          submitBtn.dataset.originalText = originalText;
        }
      });
    }
  });

  const tableBody = document.getElementById("rolesTableBody");
  if (!tableBody) {
    // Even if table doesn't exist, error message fade should still work
    return;
  }

  // ============================
  // ✅ TOAST NOTIFICATIONS (success / error)
  //   - same style as Department & Roles page
  // ============================
  function showDeptSuccess(message) {
    // Remove any existing toasts
    document
      .querySelectorAll(".success-notification, .error-notification")
      .forEach((n) => n.remove());

    const notification = document.createElement("div");
    notification.className = "success-notification";
    notification.textContent = message;
    document.body.appendChild(notification);

    // trigger animation
    setTimeout(() => {
      notification.classList.add("show");
    }, 10);

    // auto hide after 2s
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 400);
    }, 2000);
  }

  function showDeptError(message) {
    // Remove any existing toasts
    document
      .querySelectorAll(".success-notification, .error-notification")
      .forEach((n) => n.remove());

    const notification = document.createElement("div");
    notification.className = "error-notification";
    notification.textContent = message;
    document.body.appendChild(notification);

    // trigger animation
    setTimeout(() => {
      notification.classList.add("show");
    }, 10);

    // auto hide after 3s
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 400);
    }, 3000);
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

  let oldRoleValue     = "";
  let currentEditRow   = null; // track which row is being edited
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

      clearRoleError(editDescInput, editDescError);
      
      // Update button state
      updateEditRoleButtonState();
    });
    
    // Also validate on blur
    editDescInput.addEventListener("blur", () => {
      updateEditRoleButtonState();
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
      
      clearRoleError(editDeptNameView, editDeptError);
      
      // Update button state
      updateEditRoleButtonState();
    });
    
    // Also validate on blur
    editDeptNameView.addEventListener("blur", () => {
      updateEditRoleButtonState();
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
      clearRoleError(editRoleInput, editRoleError);
      updateEditRoleButtonState();
    });
    
    // Also validate on blur
    editRoleInput.addEventListener("blur", () => {
      updateEditRoleButtonState();
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
    
    // Populate and sanitize department from main form
    if (editDeptNameView && departmentName) {
      let deptValue = (departmentName.value || "").trim();
      // Sanitize department to match allowed characters
      deptValue = deptValue
        .replace(/[^A-Za-z\s]/g, "")
        .replace(/\s{2,}/g, " ");
      // Limit to 20 characters
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
      updateEditRoleButtonState();
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

      // If validation passes, proceed with save
      fetch("/department-roles/create/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
              }
            } catch (e) {
              console.warn("Could not update role row after edit:", e);
            }

            // Show success toast (same style as department edit)
          showDeptSuccess("Department has been edited successfully");
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
  let pendingDeleteDescription = "";

  const deleteModal = document.getElementById("deleteRoleModal");
  const deleteRoleNameSpan = document.getElementById("deleteRoleName");
  const cancelDeleteBtn = document.getElementById("cancelDeleteRole");
  const confirmDeleteBtn = document.getElementById("confirmDeleteRole");

  let removeDeleteTrap = null;
  let lastFocusBeforeDelete = null;

  function openDeleteModal(roleName, description) {
    if (!deleteModal) return;

    pendingDeleteDescription = description;

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

    pendingDeleteDescription = "";
  }

  // ✅ Delete button click (Event delegation)
  tableBody.addEventListener("click", (e) => {
    const btn = e.target.closest(".delete-btn");
    if (!btn || btn.disabled || btn.classList.contains("delete-btn-disabled")) return;

    const row = btn.closest("tr");
    const roleName = row ? (row.children[0]?.innerText || "").trim() : "";

    const description = btn.getAttribute("data-description");
    if (!description) {
      alert("Description not found in button");
      return;
    }

    openDeleteModal(roleName, description);
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
      if (!pendingDeleteDescription) return;

      fetch("/department-roles/create/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: pendingDeleteDescription }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            showDeptSuccess("Role has been deleted successfully");
            setTimeout(() => {
              location.reload();
            }, 500);
          } else {
            alert(data.error || "Delete failed");
          }
        })
        .catch(() => alert("Delete failed"))
        .finally(() => closeDeleteModal());
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