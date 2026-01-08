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

    // --------------------
    // REMOVE ERROR ON INPUT
    // --------------------
    [department, branch, role, description].forEach(el => {
        if (!el) return;
        el.addEventListener("input", () => removeError(el));
        el.addEventListener("change", () => removeError(el));
    });

    // --------------------
    // ROLE FIELD VALIDATION (alphabets + single spaces)
    // --------------------
    if (role) {
        role.addEventListener("input", () => {
            // Allow only letters and single spaces between words
            role.value = role.value
                .replace(/[^A-Za-z\s]/g, "")  // remove non-letters/spaces
                .replace(/\s{2,}/g, " ");     // collapse multiple spaces

            removeError(role);
            role.classList.remove("input-error");
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
                // CLEAR FORM
                department.value = "";
                branch.value = "";
                role.value = "";
                description.value = "";

                document.querySelectorAll("input[type='checkbox']")
                    .forEach(cb => cb.checked = false);

                clearErrors();

                // Show success toast (same style as edit department)
                // Page will NOT redirect; user stays on Create Roles
                showSuccessNotification("Data has been inserted successfully");
            } else {
                // Backend sends specific message for duplicates, etc.
                showErrorNotification(data.message || "Save failed ❌");
            }

        } catch (err) {
            console.error(err);
            showErrorNotification("Server error ❌");
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