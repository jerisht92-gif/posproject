// static/department-roles.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("department-roles.js loaded ✅");

  // Check for flash success message on page load
  const flashSuccess = document.querySelector(".flash-success, .alert-success, [data-flash='success']");
  if (flashSuccess) {
    const message = flashSuccess.textContent.trim() || "Department has been created successfully";
    showSuccessNotification(message);
    // Remove flash element after showing toast
    setTimeout(() => {
      if (flashSuccess.parentNode) {
        flashSuccess.parentNode.removeChild(flashSuccess);
      }
    }, 100);
  }

  const createBtn   = document.getElementById("createDeptBtn");
  const searchInput = document.getElementById("searchDepartments");
  const tableBody   = document.getElementById("deptTableBody");
  const noDeptRow   = document.getElementById("noDeptRow");

  const showingSpan      = document.getElementById("showingCount");
  const currentPageSpan  = document.getElementById("currentPage");
  const totalPagesSpan   = document.getElementById("totalPages");
  const prevBtn          = document.getElementById("prevPage");
  const nextBtn          = document.getElementById("nextPage");

  // 👉 "Create New" button
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      window.location.href = "/department-roles/create";
    });
  }

  if (!tableBody) {
    console.warn("deptTableBody not found ❌");
    return;
  }

  // ============================
  // DATA (loaded via Fetch/XHR from /api/departments)
  // ============================
  let allDepartments = [];
  let filteredDepts = [];
  const PAGE_SIZE = 10;
  let currentPage = 1;
  let currentUserRole = "user";

  function normalizeRole(r) {
    return (r || "").toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
  }

  function fetchDepartments() {
    return fetch("/api/departments")
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then((payload) => {
        if (payload && payload.departments) {
          allDepartments = Array.isArray(payload.departments) ? payload.departments : [];
        } else {
          allDepartments = [];
        }
        const role = (payload && payload.current_user && payload.current_user.role) ? payload.current_user.role : "User";
        currentUserRole = normalizeRole(role);
        // Update header Create button RBAC based on role
        updateCreateButtonState();
        applyFilter();
      })
      .catch((err) => {
        console.error("Error fetching departments:", err);
        allDepartments = [];
        applyFilter();
      });
  }

  function canCreate() {
    return currentUserRole === "admin" || currentUserRole === "superadmin";
  }

  function updateCreateButtonState() {
    if (!createBtn) return;
    if (!canCreate()) {
      createBtn.disabled = true;
      createBtn.title = "Only Admin / Super Admin can create departments";
    } else {
      createBtn.disabled = false;
      createBtn.title = "";
    }
  }

  const canEdit = () => currentUserRole === "admin" || currentUserRole === "superadmin";
  const canDelete = () => currentUserRole === "superadmin";

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s == null ? "" : String(s);
    return div.innerHTML;
  }

  function updateNoDataRow() {
    const hasData = filteredDepts.length > 0;
    if (noDeptRow) noDeptRow.style.display = hasData ? "none" : "";
  }

  function updateCountsAndPages(total, totalPagesVal) {
    const startEntry = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const endEntry   = Math.min(currentPage * PAGE_SIZE, total);

    if (showingSpan) {
      showingSpan.textContent = total > 0 ? `${startEntry}-${endEntry} of ${total}` : "0";
    }
    if (currentPageSpan) currentPageSpan.textContent = currentPage;
    if (totalPagesSpan) totalPagesSpan.textContent = totalPagesVal;
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPagesVal;
  }

  function renderPage() {
    const total = filteredDepts.length;
    const totalPages = total === 0 ? 1 : Math.ceil(total / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const noRow = document.getElementById("noDeptRow");
    tableBody.innerHTML = "";
    if (noRow) tableBody.appendChild(noRow);

    if (filteredDepts.length === 0) {
      updateNoDataRow();
      updateCountsAndPages(0, 1);
      return;
    }

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageItems = filteredDepts.slice(start, end);

    if (noDeptRow) noDeptRow.style.display = "none";

    const canEditBtn = canEdit();
    const canDeleteBtn = canDelete();

    pageItems.forEach((d) => {
      const tr = document.createElement("tr");
      const code = (d.code || "").trim();
      const name = (d.name || "").trim();
      const desc = (d.description || "").trim();
      const id = d.id != null ? String(d.id) : "";

      tr.innerHTML = `
        <td>${escapeHtml(code)}</td>
        <td>${escapeHtml(name)}</td>
        <td>${escapeHtml(desc)}</td>
        <td class="action-cell">
          <div class="action-buttons">
            ${canEditBtn
              ? `<button class="action-btn edit-btn" type="button" data-id="${escapeHtml(id)}">Edit</button>`
              : `<button class="action-btn edit-btn-disabled" disabled title="No access">Edit</button>`}
            ${canDeleteBtn
              ? `<button class="action-btn delete-btn" type="button" data-id="${escapeHtml(id)}">Delete</button>`
              : `<button class="action-btn delete-btn-disabled" disabled title="Only Super Admin can delete">Delete</button>`}
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    updateNoDataRow();
    updateCountsAndPages(total, totalPages);
  }

  function applyFilter() {
    const q = (searchInput?.value || "").trim().toLowerCase();
    if (!q) {
      filteredDepts = allDepartments.slice();
    } else {
      filteredDepts = allDepartments.filter((d) => {
        const code = (d.code || "").toLowerCase();
        const name = (d.name || "").toLowerCase();
        const desc = (d.description || "").toLowerCase();
        return code.includes(q) || name.includes(q) || desc.includes(q);
      });
    }
    currentPage = 1;
    renderPage();
  }

  if (searchInput) searchInput.addEventListener("input", applyFilter);

  const searchBtn = document.querySelector(".search-icon-btn");
  if (searchBtn && searchInput) searchBtn.addEventListener("click", applyFilter);

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderPage();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const totalPages = Math.max(1, Math.ceil(filteredDepts.length / PAGE_SIZE));
      if (currentPage < totalPages) {
        currentPage++;
        renderPage();
      }
    });
  }

  // ============================
  // ✅ ACCESSIBILITY: Strong Focus Trap (FIX)
  // ============================
  let activeTrap = null;

  function getFocusable(container) {
    if (!container) return [];
    return Array.from(
      container.querySelectorAll(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.disabled && el.offsetParent !== null);
  }

  function enableTrap(container) {
    if (!container) return;

    // remove old trap if any
    disableTrap();

    activeTrap = { container };

    // capture=true to prevent focus leaving modal
    document.addEventListener("keydown", trapHandler, true);
  }

  function disableTrap() {
    activeTrap = null;
    document.removeEventListener("keydown", trapHandler, true);
  }

  function trapHandler(e) {
    if (!activeTrap) return;
    if (e.key !== "Tab") return;

    const container = activeTrap.container;
    const focusable = getFocusable(container);
    if (!focusable.length) return;

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    // Shift+Tab on first -> last
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
      return;
    }

    // Tab on last -> first
    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // ============================
  // ✏️ EDIT DEPARTMENT (MODAL)
  // ============================
  const editModal = document.getElementById("editDeptModal");
  const editId    = document.getElementById("editDeptId");
  const editCode  = document.getElementById("editDeptCode");
  const editName  = document.getElementById("editDeptName");
  const editDesc  = document.getElementById("editDeptDesc");

  const closeBtn  = document.getElementById("closeDeptEditBtn");
  const saveBtn   = document.getElementById("saveDeptEditBtn");

  // ✅ error elements (must exist in HTML)
  const codeErr = document.getElementById("editDeptCodeError");
  const nameErr = document.getElementById("editDeptNameError");
  const descErr = document.getElementById("editDeptDescError");

  function setErr(input, errEl, msg) {
    if (errEl) errEl.textContent = msg;
    if (input) input.classList.add("input-error");
  }

  function clrErr(input, errEl) {
    if (errEl) errEl.textContent = "";
    if (input) input.classList.remove("input-error");
  }

  function clearDeptErrors() {
    clrErr(editCode, codeErr);
    clrErr(editName, nameErr);
    clrErr(editDesc, descErr);
  }

  // ============================
  // ✅ CODE FIELD - Restrict to max 20 characters (alphanumeric and hyphen)
  // ============================
  if (editCode) {
    editCode.addEventListener("input", (e) => {
      // Remove any characters that are not alphanumeric or hyphen
      let value = editCode.value.replace(/[^A-Za-z0-9-]/g, "");
      
      // Restrict to maximum 20 characters
      if (value.length > 20) {
        value = value.substring(0, 20);
      }
      
      editCode.value = value;
      clrErr(editCode, codeErr);
    });
    
    // Prevent typing beyond 20 characters on keydown
    editCode.addEventListener("keydown", (e) => {
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
      if (editCode.value.length >= 20) {
        e.preventDefault();
      }
    });
    
    // Handle paste events to limit to 20 characters
    editCode.addEventListener("paste", (e) => {
      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData("text");
      let allowedChars = pastedText.replace(/[^A-Za-z0-9-]/g, "");
      // Limit to 20 characters
      if (allowedChars.length > 20) {
        allowedChars = allowedChars.substring(0, 20);
      }
      editCode.value = allowedChars;
      // Trigger input event to validate
      editCode.dispatchEvent(new Event("input"));
    });
  }

  // ============================
  // ✅ DEPARTMENT NAME FIELD - Restrict to max 20 characters (alphabets only)
  // ============================
  if (editName) {
    editName.addEventListener("input", (e) => {
      // Allow only alphabets and single spaces between words
      let value = editName.value
        .replace(/[^A-Za-z\s]/g, "")  // remove non-letters/spaces
        .replace(/\s{2,}/g, " ");     // collapse multiple spaces
      
      // Restrict to maximum 20 characters
      if (value.length > 20) {
        value = value.substring(0, 20);
      }
      
      editName.value = value;
      clrErr(editName, nameErr);
    });
    
    // Prevent typing beyond 20 characters on keydown
    editName.addEventListener("keydown", (e) => {
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
      if (editName.value.length >= 20) {
        e.preventDefault();
      }
    });
    
    // Handle paste events to limit to 20 characters
    editName.addEventListener("paste", (e) => {
      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData("text");
      let sanitized = pastedText
        .replace(/[^A-Za-z\s]/g, "")  // remove non-letters/spaces
        .replace(/\s{2,}/g, " ");     // collapse multiple spaces
      
      // Limit to 20 characters
      if (sanitized.length > 20) {
        sanitized = sanitized.substring(0, 20);
      }
      
      editName.value = sanitized;
      // Trigger input event to validate
      editName.dispatchEvent(new Event("input"));
    });
  }

  // ============================
  // ✅ DESCRIPTION FIELD - Restrict to max 100 characters (alphabets, . , / & and single spaces)
  // ============================
  if (editDesc) {
    editDesc.addEventListener("input", (e) => {
      // Allow only letters, space, dot, comma, slash and ampersand
      let value = editDesc.value
        .replace(/[^A-Za-z\s.,\/&]/g, "")  // Remove any character that is not A-Z, a-z, space, comma, slash, dot or ampersand
        .replace(/\s{2,}/g, " ");          // collapse multiple spaces
      
      // Restrict to maximum 100 characters
      if (value.length > 100) {
        value = value.substring(0, 100);
      }
      
      editDesc.value = value;
    clrErr(editDesc, descErr);
  });
    
    // Prevent typing beyond 100 characters on keydown
    editDesc.addEventListener("keydown", (e) => {
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
      if (editDesc.value.length >= 100) {
        e.preventDefault();
      }
    });
    
    // Handle paste events to limit to 100 characters
    editDesc.addEventListener("paste", (e) => {
      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData("text");
      let sanitized = pastedText
        .replace(/[^A-Za-z\s.,\/&]/g, "")  // Remove any character that is not A-Z, a-z, space, comma, slash, dot or ampersand
        .replace(/\s{2,}/g, " ");          // collapse multiple spaces
      
      // Limit to 100 characters
      if (sanitized.length > 100) {
        sanitized = sanitized.substring(0, 100);
      }
      
      editDesc.value = sanitized;
      // Trigger input event to validate
      editDesc.dispatchEvent(new Event("input"));
    });
  }

  let lastFocusedEdit = null;

  function openDeptModal() {
    if (!editModal) return;

    lastFocusedEdit = document.activeElement;
    clearDeptErrors();

    editModal.style.display = "flex";

    const focusable = getFocusable(editModal);
    if (focusable.length) focusable[0].focus();

    // ✅ enable strong trap
    enableTrap(editModal);
  }

  function closeDeptModal() {
    if (!editModal) return;

    editModal.style.display = "none";
    clearDeptErrors();
    
    // Reset button state when closing modal
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Save";
      delete saveBtn.dataset.originalText;
    }

    // ✅ disable trap
    disableTrap();

    if (lastFocusedEdit) lastFocusedEdit.focus();
  }

  // ============================
  // ✅ Enable/Disable Edit Department Save Button
  // ============================
  function updateEditDepartmentButtonState() {
    if (!saveBtn) return;
    
    const code = (editCode?.value || "").trim();
    const name = (editName?.value || "").trim();
    const desc = (editDesc?.value || "").trim();
    
    // Validate code
    const codeValid = code && code.length >= 3 && code.length <= 20 && /^[A-Za-z0-9-]+$/.test(code);
    
    // Validate name
    const nameValid = name && name.length >= 3 && name.length <= 20 && /^[A-Za-z\s]+$/.test(name);
    
    // Validate description
    const descValid = desc && desc.length <= 100 && /^[A-Za-z\s.,\/&]+$/.test(desc);
    
    // Enable button only if all fields are valid
    saveBtn.disabled = !(codeValid && nameValid && descValid);
  }

  // Add event listeners to update button state
  if (editCode) {
    editCode.addEventListener("input", updateEditDepartmentButtonState);
  }
  
  if (editName) {
    editName.addEventListener("input", updateEditDepartmentButtonState);
  }
  
  if (editDesc) {
    editDesc.addEventListener("input", updateEditDepartmentButtonState);
  }
  
  // Initialize button as disabled
  if (saveBtn) {
    saveBtn.disabled = true;
  }

  tableBody.addEventListener("click", (e) => {
    const btn = e.target.closest(".edit-btn");
    if (!btn || btn.disabled || btn.classList.contains("edit-btn-disabled")) return;

    const row = btn.closest("tr");
    if (!row) return;

    editId.value   = btn.dataset.id || "";
    editCode.value = row.children[0]?.innerText.trim() || "";
    editName.value = row.children[1]?.innerText.trim() || "";
    editDesc.value = row.children[2]?.innerText.trim() || "";

    openDeptModal();
    
    // Update button state when modal opens
    updateEditDepartmentButtonState();
  });

  closeBtn?.addEventListener("click", closeDeptModal);

  editModal?.addEventListener("click", (e) => {
    if (e.target === editModal) closeDeptModal();
  });

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

  // ============================
  // ❌ ERROR NOTIFICATION FUNCTION
  // ============================
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

  saveBtn?.addEventListener("click", () => {
    // Disable button and show loading state
    if (saveBtn) {
      saveBtn.disabled = true;
      const originalText = saveBtn.textContent;
      saveBtn.textContent = "Saving...";
      saveBtn.dataset.originalText = originalText;
    }
    
    const code = (editCode?.value || "").trim();
    const name = (editName?.value || "").trim();
    const desc = (editDesc?.value || "").trim();

    clearDeptErrors();
    let hasErr = false;

    if (!code) {
      setErr(editCode, codeErr, "Code is required.");
      hasErr = true;
    } else if (code.length < 3) {
      setErr(editCode, codeErr, "Minimum 3 characters required.");
      hasErr = true;
    } else if (code.length > 20) {
      setErr(editCode, codeErr, "Maximum 20 characters allowed.");
      hasErr = true;
    } else if (!/^[A-Za-z0-9-]+$/.test(code)) {
      setErr(editCode, codeErr, "Code can contain only letters, numbers, and hyphen (-).");
      hasErr = true;
    }

    if (!name) {
      setErr(editName, nameErr, "Department name is required.");
      hasErr = true;
    } else if (name.length < 3) {
      setErr(editName, nameErr, "Minimum 3 characters required.");
      hasErr = true;
    } else if (name.length > 20) {
      setErr(editName, nameErr, "Maximum 20 characters allowed.");
      hasErr = true;
    } else if (!/^[A-Za-z\s]+$/.test(name)) {
      setErr(editName, nameErr, "Name can contain only letters and spaces.");
      hasErr = true;
    }

    if (!desc) {
      setErr(editDesc, descErr, "Description is required.");
      hasErr = true;
    } else if (desc.length > 100) {
      setErr(editDesc, descErr, "Description must not exceed 100 characters.");
      hasErr = true;
    } else if (!/^[A-Za-z\s,\/.&]+$/.test(desc)) {
      setErr(
        editDesc,
        descErr,
        "Description can contain only letters, spaces, comma (,), slash (/), dot (.) and &."
      );
      hasErr = true;
    }

    if (hasErr) {
      // Re-enable button on validation error
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = saveBtn.dataset.originalText || "Save";
        updateEditDepartmentButtonState();
      }
      return;
    }

    fetch("/department-roles/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        id: editId.value,
        code,
        name,
        description: desc,
      }),
    })
      .then((r) => r.json().then((data) => ({ res: r, data })))
      .then(({ res, data }) => {
        if (res.status === 401) {
          showErrorNotification(data.error || "Session expired. Please log in again.");
          setTimeout(() => { window.location.href = "/login?message=session_expired"; }, 1500);
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = saveBtn.dataset.originalText || "Save";
          }
          return;
        }
        if (data.success) {
          if (saveBtn) {
            saveBtn.textContent = saveBtn.dataset.originalText || "Save";
            delete saveBtn.dataset.originalText;
          }
          closeDeptModal();
          showSuccessNotification("Department has been edited successfully");
          fetchDepartments();
        } else {
          showErrorNotification(data.error || "Update failed");
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = saveBtn.dataset.originalText || "Save";
            updateEditDepartmentButtonState();
          }
        }
      })
      .catch((err) => {
        console.error("Edit API error:", err);
        // Show error notification instead of alert
        showErrorNotification("API error while updating department");
        
        // Re-enable button on error
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = saveBtn.dataset.originalText || "Save";
          updateEditDepartmentButtonState();
        }
      });
  });

  // ============================
  // 🗑️ DELETE DEPARTMENT (MODAL)
  // ============================
  const deleteModal = document.getElementById("deleteDeptModal");
  const deleteText  = document.getElementById("deleteDeptText");
  const cancelDel   = document.getElementById("cancelDeptDeleteBtn");
  const confirmDel  = document.getElementById("confirmDeptDeleteBtn");

  let pendingDeptId = null;
  let lastFocusedDelete = null;

  function openDeleteDeptModal() {
    if (!deleteModal) return;

    lastFocusedDelete = document.activeElement;
    deleteModal.style.display = "flex";

    const focusable = getFocusable(deleteModal);
    if (focusable.length) focusable[0].focus();

    // ✅ enable strong trap
    enableTrap(deleteModal);
  }

  function closeDeleteDeptModal() {
    if (!deleteModal) return;

    deleteModal.style.display = "none";
    pendingDeptId = null;

    // ✅ disable trap
    disableTrap();

    if (lastFocusedDelete) lastFocusedDelete.focus();
  }

  tableBody.addEventListener("click", (e) => {
    const delBtn = e.target.closest(".delete-btn");
    if (!delBtn || delBtn.disabled || delBtn.classList.contains("delete-btn-disabled")) return;

    const row = delBtn.closest("tr");
    const deptId = delBtn.getAttribute("data-id");
    if (!deptId || !row) return;

    pendingDeptId = deptId;

    const deptCode = row.children[0]?.innerText.trim() || "this department";
    if (deleteText) {
      deleteText.textContent = `Are you sure you want to delete "${deptCode}"?`;
    }

    openDeleteDeptModal();
  });

  cancelDel?.addEventListener("click", closeDeleteDeptModal);

  deleteModal?.addEventListener("click", (e) => {
    if (e.target === deleteModal) closeDeleteDeptModal();
  });

  confirmDel?.addEventListener("click", () => {
    if (!pendingDeptId) return;

    fetch("/department-roles/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pendingDeptId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          closeDeleteDeptModal();
          showSuccessNotification("Department has been deleted successfully");
          fetchDepartments();
        } else {
          alert("Failed to delete department: " + (data.error || "Unknown error"));
        }
      })
      .catch((err) => {
        console.error("Delete error:", err);
        alert("Error deleting department. Please try again.");
      });
  });

  // initial load: fetch departments via XHR (same pattern as customer / products)
  fetchDepartments();
});
