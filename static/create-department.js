// static/create-department.js
(function () {
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
    // ✅ Description validation (alphabets + . , / & and single spaces)
    // ============================
    if (departmentDesc) {
      departmentDesc.addEventListener("input", () => {
        // Allow only letters, space, dot, comma, slash and ampersand
        departmentDesc.value = departmentDesc.value
          .replace(/[^A-Za-z\s.,\/&]/g, "")
          .replace(/\s{2,}/g, " ");
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
      departmentCode.addEventListener("input", () => {
        // Remove any characters that are not alphanumeric or hyphen
        departmentCode.value = departmentCode.value.replace(/[^A-Za-z0-9-]/g, "");
        
        const value = departmentCode.value.trim();
        
        if (!value) {
          setFieldError(departmentCode, "Code is required.");
        } else if (value.length < 3) {
          setFieldError(departmentCode, "Minimum 3 characters required.");
        } else if (value.length > 20) {
          setFieldError(departmentCode, "Maximum 20 characters allowed.");
        } else if (!/^[A-Za-z0-9-]+$/.test(value)) {
          setFieldError(departmentCode, "Code can contain only letters, numbers, and hyphen (-).");
        } else {
          clearFieldError(departmentCode);
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

      // Prevent paste of invalid characters
      departmentCode.addEventListener("paste", (e) => {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData("text");
        const allowedChars = pastedText.replace(/[^A-Za-z0-9-]/g, "");
        departmentCode.value = allowedChars;
        // Trigger input event to validate
        departmentCode.dispatchEvent(new Event("input"));
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
  // ✅ ROLE-BASED ACCESS CHECK FOR FORM SUBMISSION
  // Only Super Admin and Admin can create departments
  // ============================
  document.addEventListener("DOMContentLoaded", () => {
    const createForm = document.querySelector(".create-form");
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
      });
    }
  });

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

    // Prefill Department Name from main form, but allow user to edit it
    if (editDeptNameView && departmentName && !editDeptNameView.value) {
      editDeptNameView.value = departmentName.value || "";
    }
  }

  function closeEditModal() {
    if (!editModal) return;
    editModal.style.display = "none";

    if (removeEditTrap) removeEditTrap();
    removeEditTrap = null;

    // Clear errors when closing modal
    if (editDescError) editDescError.textContent = "";
    if (editDescInput) editDescInput.classList.remove("input-error");

    if (lastFocusBeforeEdit) lastFocusBeforeEdit.focus();
    lastFocusBeforeEdit = null;
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

      if (editDescError) editDescError.textContent = "";
      editDescInput.classList.remove("input-error");
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
  // ============================
  if (editDeptNameView) {
    editDeptNameView.addEventListener("input", () => {
      editDeptNameView.value = editDeptNameView.value
        .replace(/[^A-Za-z\s]/g, "")  // keep only letters and spaces
        .replace(/\s{2,}/g, " ");     // collapse multiple spaces
    });
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

    // if (editRoleInput) 
if (editRoleInput) {
  const roleText = oldRoleValue.trim();

  // Find matching option
  const option = Array.from(editRoleInput.options).find(
    (opt) => opt.value === roleText
  );

  editRoleInput.value = option ? option.value : "";
}
    if (editDescInput) editDescInput.value = (row.children[1]?.innerText || "").trim();

    openEditModal();
  });

  // ✅ Save edit
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      // Clear previous errors
      if (editDescError) editDescError.textContent = "";
      if (editDescInput) editDescInput.classList.remove("input-error");

      // Sanitize description then validate (mandatory)
      let rawDesc = editDescInput ? editDescInput.value : "";
      // Allow alphabets + . , / & and single spaces
      rawDesc = rawDesc.replace(/[^A-Za-z\s.,\/&]/g, "").replace(/\s{2,}/g, " ");
      if (editDescInput) editDescInput.value = rawDesc;

      const description = rawDesc.trim();
      
      if (!description) {
        if (editDescError) {
          editDescError.textContent = "Description is required.";
        }
        if (editDescInput) {
          editDescInput.classList.add("input-error");
          editDescInput.focus();
        }
        return;
      }
      
      // Validate 50 character limit
      if (description.length > 50) {
        if (editDescError) {
          editDescError.textContent = "Description must not exceed 50 characters.";
        }
        if (editDescInput) {
          editDescInput.classList.add("input-error");
          editDescInput.focus();
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
            showDeptSuccess("Data has been edited successfully");
          } else {
            // Show backend error message (e.g., duplicates)
            showDeptError(data.error || "Update failed");
          }
        })
        .catch((err) => {
          console.error("Edit role API error:", err);
          showDeptError("API error while updating role");
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
          if (data.success) location.reload();
          else alert(data.error || "Delete failed");
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