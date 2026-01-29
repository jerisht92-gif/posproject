document.addEventListener("DOMContentLoaded", () => {

    let isSaving = false;

    // --------------------
    // TOAST NOTIFICATIONS (same style as Edit Department & Roles)
    // --------------------
    function showSuccessNotification(message) {
        // Remove existing notifications
        document.querySelectorAll(".success-notification, .error-notification")
            .forEach((n) => n.remove());

        const notification = document.createElement("div");
        notification.className = "success-notification";
        notification.textContent = message;
        document.body.appendChild(notification);

        // Trigger animation
        setTimeout(() => {
            notification.classList.add("show");
        }, 10);

        // Hide after 2 seconds
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
        // Remove existing notifications
        document.querySelectorAll(".success-notification, .error-notification")
            .forEach((n) => n.remove());

        const notification = document.createElement("div");
        notification.className = "error-notification";
        notification.textContent = message;
        document.body.appendChild(notification);

        // Trigger animation
        setTimeout(() => {
            notification.classList.add("show");
        }, 10);

        // Hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove("show");
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 400);
        }, 3000);
    }

    // --------------------
    // BUTTONS
    // --------------------
    const saveBtn   = document.querySelector(".save-btn");
    const resetBtn  = document.querySelector(".reset-btn");
    const cancelBtn = document.querySelector(".cancel-btn");

    // --------------------
    // FIELDS
    // --------------------
    const department  = document.getElementById("department");
    const branch      = document.getElementById("branch");
    const role        = document.getElementById("role");
    const description = document.getElementById("deptDesc");

    // --------------------
    // CONFIRM MODAL
    // --------------------
    const confirmModal  = document.getElementById("confirmModal");
    const confirmOk     = document.getElementById("confirmOk");
    const confirmCancel = document.getElementById("confirmCancel");

    // --------------------
    // ERROR HELPERS
    // --------------------
    function clearErrors() {
        document.querySelectorAll(".error-msg").forEach(e => e.remove());
    }

    function showError(el, msg) {
        const div = document.createElement("div");
        div.className = "error-msg";
        div.innerText = msg;
        el.parentElement.appendChild(div);
    }

    function removeError(el) {
        const err = el.parentElement.querySelector(".error-msg");
        if (err) err.remove();
        if (el) el.classList.remove("input-error");
    }

    // ============================
    // ✅ Enable/Disable Create Role Save Button
    // ============================
    function updateCreateRoleButtonState() {
        if (!saveBtn) return;
        
        const dept = department?.value || "";
        const br = branch?.value || "";
        const roleVal = role?.value.trim() || "";
        const desc = description?.value.trim() || "";
        
        // Validate department
        const deptValid = !!dept;
        
        // Validate branch
        const branchValid = !!br;
        
        // Validate role (alphabets + spaces, max 20)
        const roleValid = roleVal && roleVal.length >= 3 && roleVal.length <= 20 && /^[A-Za-z\s]+$/.test(roleVal);
        
        // Validate description (max 50, allowed chars)
        const descValid = desc && desc.length <= 50 && /^[A-Za-z\s.,/&]+$/.test(desc);
        
        // Check if at least one permission is checked
        let anyChecked = false;
        document.querySelectorAll("tbody tr").forEach(row => {
            const menu = row.dataset.menu;
            if (!menu) return;
            const checks = row.querySelectorAll("input[type='checkbox']");
            checks.forEach(cb => {
                if (cb.checked) anyChecked = true;
            });
        });
        
        // Enable button only if all fields are valid AND at least one permission is checked
        saveBtn.disabled = !(deptValid && branchValid && roleValid && descValid && anyChecked);
    }

    // --------------------
    // REMOVE ERROR ON INPUT
    // --------------------
    [department, branch, role, description].forEach(el => {
        if (!el) return;
        el.addEventListener("input", () => {
            removeError(el);
            updateCreateRoleButtonState();
        });
        el.addEventListener("change", () => {
            removeError(el);
            updateCreateRoleButtonState();
    });
    });
    
    // Add permission checkbox listeners
    document.querySelectorAll("tbody tr").forEach(row => {
        const checks = row.querySelectorAll("input[type='checkbox']");
        checks.forEach(cb => {
            cb.addEventListener("change", updateCreateRoleButtonState);
        });
    });
    
    // ============================
    // ✅ Full Access Auto-Select Logic
    // ============================
    function setupFullAccessLogic() {
        document.querySelectorAll("tbody tr").forEach(row => {
            const menu = row.dataset.menu;
            if (!menu) return;
            
            // Get the Full Access checkbox
            const fullAccessCheckbox = row.querySelector(`input[name='${menu}_full']`);
            if (!fullAccessCheckbox) return;
            
            // Get all other checkboxes (View, Create, Edit, Delete)
            const viewCheckbox = row.querySelector(`input[name='${menu}_view']`);
            const createCheckbox = row.querySelector(`input[name='${menu}_create']`);
            const editCheckbox = row.querySelector(`input[name='${menu}_edit']`);
            const deleteCheckbox = row.querySelector(`input[name='${menu}_delete']`);
            
            const otherCheckboxes = [viewCheckbox, createCheckbox, editCheckbox, deleteCheckbox].filter(cb => cb !== null);
            
            // When Full Access is checked/unchecked
            fullAccessCheckbox.addEventListener("change", (e) => {
                const isChecked = e.target.checked;
                
                // Update all other checkboxes in the row
                otherCheckboxes.forEach(cb => {
                    cb.checked = isChecked;
                });
                
                // Update button state
                updateCreateRoleButtonState();
            });
            
            // When any individual checkbox changes, update Full Access
            otherCheckboxes.forEach(cb => {
                cb.addEventListener("change", () => {
                    // Check if all other checkboxes are checked
                    const allChecked = otherCheckboxes.every(checkbox => checkbox.checked);
                    
                    // Update Full Access checkbox accordingly
                    fullAccessCheckbox.checked = allChecked;
                    
                    // Update button state
                    updateCreateRoleButtonState();
                });
            });
        });
    }
    
    // Initialize Full Access logic
    setupFullAccessLogic();
    
    // Initialize button as disabled
    if (saveBtn) {
        saveBtn.disabled = true;
    }

    // --------------------
    // ROLE FIELD VALIDATION (alphabets + single spaces, max 20 characters)
    // --------------------
    if (role) {
        role.addEventListener("input", (e) => {
            // Allow only letters and single spaces between words
            let value = role.value
                .replace(/[^A-Za-z\s]/g, "")  // remove non-letters/spaces
                .replace(/\s{2,}/g, " ");     // collapse multiple spaces
            
            // Restrict to maximum 20 characters
            if (value.length > 20) {
                value = value.substring(0, 20);
            }
            
            role.value = value;

            removeError(role);
            role.classList.remove("input-error");
        });
        
        // Prevent typing beyond 20 characters on keydown
        role.addEventListener("keydown", (e) => {
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
            if (role.value.length >= 20) {
                e.preventDefault();
            }
        });
        
        // Handle paste events to limit to 20 characters
        role.addEventListener("paste", (e) => {
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData("text");
            let sanitized = pastedText
                .replace(/[^A-Za-z\s]/g, "")  // remove non-letters/spaces
                .replace(/\s{2,}/g, " ");     // collapse multiple spaces
            
            // Limit to 20 characters
            if (sanitized.length > 20) {
                sanitized = sanitized.substring(0, 20);
            }
            
            role.value = sanitized;
            // Trigger input event to validate
            role.dispatchEvent(new Event("input"));
        });
    }

    // --------------------
    // DESCRIPTION FIELD VALIDATION (alphabets, . , / & and single spaces, max 50 chars)
    // --------------------
    if (description) {
        description.addEventListener("input", () => {
            let value = description.value;
            
            // Remove any characters that are not alphabets, . , / & or spaces
            // Then collapse multiple spaces to single space
            value = value
                .replace(/[^A-Za-z\s.,/&]/g, "")
                .replace(/\s{2,}/g, " ");
            
            // Limit to 50 characters
            if (value.length > 50) {
                value = value.substring(0, 50);
            }
            
            description.value = value;
            
            // Clear error when user types
            removeError(description);
            description.classList.remove("input-error");
        });

        // Also validate on paste
        description.addEventListener("paste", (e) => {
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData("text");
            let sanitized = pastedText
                .replace(/[^A-Za-z\s.,/&]/g, "")
                .replace(/\s{2,}/g, " ");
            
            // Limit to 50 characters
            if (sanitized.length > 50) {
                sanitized = sanitized.substring(0, 50);
            }
            
            description.value = sanitized;
            // Trigger input event to validate
            description.dispatchEvent(new Event("input"));
        });
    }

    // =====================================================
    // SAVE BUTTON → VALIDATE → SHOW CONFIRM MODAL
    // =====================================================
    saveBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (isSaving) return;

        clearErrors();
        let valid = true;

        // --------------------
        // ROLE-BASED ACCESS CHECK
        // Only Super Admin and Admin can create roles
        // --------------------
        const header = document.querySelector(".header");
        const userRole = header ? (header.getAttribute("data-current-role") || "").toLowerCase().replace(/\s+/g, "") : "";
        
        if (userRole !== "superadmin" && userRole !== "admin") {
            showErrorNotification("User cannot create roles.");
            return;
        }

        if (!department.value) { showError(department, "Select department"); valid = false; }
        if (!branch.value)     { showError(branch, "Select branch"); valid = false; }
        if (!role.value)       { showError(role, "Role is required"); valid = false; }
        
        // Validate description field
        const descValue = description.value.trim();
        if (!descValue) {
            showError(description, "Description is required.");
            if (description) description.classList.add("input-error");
            valid = false;
        } else if (descValue.length > 50) {
            showError(description, "Description must not exceed 50 characters.");
            if (description) description.classList.add("input-error");
            valid = false;
        } else if (!/^[A-Za-z\s.,/&]+$/.test(descValue)) {
            showError(description, "Description can contain only letters, spaces, comma (,), slash (/), dot (.) and &.");
            if (description) description.classList.add("input-error");
            valid = false;
        } else {
            // Sanitize description before saving (ensure single spaces)
            description.value = descValue.replace(/\s{2,}/g, " ");
        }

        // --------------------
        // PERMISSIONS CHECK
        // --------------------
        let anyChecked = false;
        document.querySelectorAll("tbody tr").forEach(row => {
            const menu = row.dataset.menu;
            if (!menu) return;

            const checks = row.querySelectorAll("input[type='checkbox']");
            checks.forEach(cb => {
                if (cb.checked) anyChecked = true;
            });
        });

        if (!anyChecked) {
            alert("Please select at least one permission");
            valid = false;
        }

        // ❌ Stop here if invalid
        if (!valid) return;

        // ✅ Show confirmation modal
        confirmModal.style.display = "flex";
    });

    // =====================================================
    // CANCEL CONFIRM MODAL
    // =====================================================
    confirmCancel.addEventListener("click", () => {
        confirmModal.style.display = "none";
    });

    // =====================================================
    // CONFIRM SAVE → ACTUAL SAVE LOGIC
    // =====================================================
    confirmOk.addEventListener("click", async () => {
        confirmModal.style.display = "none";
        if (isSaving) return;
        isSaving = true;
        
        // Disable confirm button and show loading state
        if (confirmOk) {
            confirmOk.disabled = true;
            const originalText = confirmOk.textContent;
            confirmOk.textContent = "Saving...";
            confirmOk.dataset.originalText = originalText;
        }

        // --------------------
        // COLLECT PERMISSIONS
        // --------------------
        const permissions = {};

        document.querySelectorAll("tbody tr").forEach(row => {
            const menu = row.dataset.menu;
            if (!menu) return;

            permissions[menu] = {
                full_access: row.querySelector(`[name='${menu}_full']`)?.checked || false,
                view:        row.querySelector(`[name='${menu}_view']`)?.checked || false,
                create:      row.querySelector(`[name='${menu}_create']`)?.checked || false,
                edit:        row.querySelector(`[name='${menu}_edit']`)?.checked || false,
                delete:      row.querySelector(`[name='${menu}_delete']`)?.checked || false
            };
        });

        // --------------------
        // SEND TO FLASK
        // --------------------
        try {
            const res = await fetch("/save_role", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    department: department.value,
                    branch: branch.value,
                    role: role.value,
                    description: description.value,
                    permissions
                })
            });

            const data = await res.json();

            if (data.status === "success") {
                // Reset button text immediately after successful creation
                if (confirmOk) {
                    confirmOk.textContent = confirmOk.dataset.originalText || "OK";
                    delete confirmOk.dataset.originalText;
                    confirmOk.disabled = false;
                }
                
                // Show success toast
                showSuccessNotification("Role has been created successfully");
                
                // Navigate to Create New Department & Roles page after a short delay
                setTimeout(() => {
                    window.location.href = "/department-roles/create";
                }, 1500); // Wait 1.5 seconds to show the success message
            } else {
                // Backend sends specific message for duplicates, etc.
                showErrorNotification(data.message || "Save failed ❌");
                
                // Re-enable button on error
                if (confirmOk) {
                    confirmOk.disabled = false;
                    confirmOk.textContent = confirmOk.dataset.originalText || "OK";
                }
            }

        } catch (err) {
            console.error(err);
            showErrorNotification("Server error ❌");
            
            // Re-enable button on error
            if (confirmOk) {
                confirmOk.disabled = false;
                confirmOk.textContent = confirmOk.dataset.originalText || "OK";
            }
        }

        isSaving = false;
    });

    // --------------------
    // RESET BUTTON
    // --------------------
    resetBtn.addEventListener("click", (e) => {
        e.preventDefault();
        clearErrors();
        document.querySelectorAll("input[type='checkbox']")
            .forEach(cb => cb.checked = false);
    });

    // --------------------
    // CANCEL BUTTON
    // --------------------
    cancelBtn.addEventListener("click", () => window.history.back());

});