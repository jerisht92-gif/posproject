// static/create-user.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".create-form");
  if (!form) return;

  // Turn off browser's default validation UI (red borders, tooltips)
  form.setAttribute("novalidate", "true");

  // ============================
  // ✅ TOAST NOTIFICATIONS (success / error)
  // ============================
  function showSuccessNotification(message) {
    // Remove any existing toasts
    document
      .querySelectorAll(".success-notification, .error-notification")
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
    // Remove any existing toasts
    document
      .querySelectorAll(".success-notification, .error-notification")
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

  // ---------- FIELD NODES ----------
  const firstName     = document.getElementById("firstName");
  const lastName      = document.getElementById("lastName");
  const email         = document.getElementById("email");
  const contact       = document.getElementById("contact");
  const countryCode   = document.getElementById("countryCode");
  const branch        = document.getElementById("branch");
  const department    = document.getElementById("department");
  const role          = document.getElementById("role");
  const reportingTo   = document.getElementById("reportingTo");
  const availBranches = document.getElementById("availableBranches");
  const employeeId    = document.getElementById("employeeId");
  const saveButton    = form.querySelector('button[type="submit"]');

  // ---------- REGEX RULES ----------
  const nameRegex      = /^[A-Za-z\s]{1,40}$/;
  const emailRegex =
    /^[A-Za-z0-9._%+-]{3,40}@(gmail\.com|yahoo\.com|yahoo\.co\.in|outlook\.com|hotmail\.com|thestackly\.com|stackly\.in)$/i;
  const empIdRegex     = /^[A-Za-z0-9\-]{1,20}$/;      // letters, numbers, '-', max 20
  const branchesRegex  = /^\d+(,\s*\d+)*$/;            // 1,2,3
  const reportingRegex = /^[A-Za-z.\-\s]{1,40}$/;      // letters, dot, hyphen, space

  // ✅ Per-country phone length rules (based on your final list)
  const phoneRules = {
    "+91": 10,  // India
    "+971": 9,  // United Arab Emirates
    "+974": 8,  // Qatar
    "+966": 9,  // Saudi Arabia
    "+94": 9,   // Sri Lanka
    "+880": 10, // Bangladesh
    "+977": 10, // Nepal
    "+1": 10,   // United States
    "+44": 10,  // United Kingdom (mobile)
    "+61": 9    // Australia
  };

  function getCurrentPhoneLength() {
    if (!countryCode) return 10;
    const code = countryCode.value;
    return phoneRules[code] || 10; // fallback 10
  }

  function setupPhoneField() {
    if (!contact) return;
    const maxLen = getCurrentPhoneLength();
    contact.value = "";
    contact.setAttribute("maxlength", String(maxLen));
    contact.setAttribute("data-maxlen", String(maxLen));
    contact.placeholder = "Enter " + maxLen + " digits";
  }

  // ==================================================
  //                 ERROR HELPERS
  // ==================================================
  function getErrorNode(input) {
    // 👉 attach error to the .form-field wrapper (not .phone-row)
    const parent = input.closest(".form-field");
    if (!parent) return null;

    let node = parent.querySelector(".field-error-msg");
    if (!node) {
      node = document.createElement("div");
      node.className = "field-error-msg";
      node.style.color = "#d9534f";
      node.style.fontSize = "12px";
      node.style.marginTop = "4px";
      parent.appendChild(node);
    }
    return node;
  }

  function setFieldError(input, message) {
    const node = getErrorNode(input);
    if (node) node.textContent = message || "";
  }

  function clearAllErrors() {
    document.querySelectorAll(".field-error-msg").forEach((n) => {
      n.textContent = "";
    });
  }

  // ==================================================
  //          VALIDATE ALL FIELDS & ENABLE/DISABLE SAVE BUTTON
  // ==================================================
  function validateAllFields() {
    if (!saveButton) return;

    // Check First Name
    const fn = firstName.value.trim();
    const firstNameValid = fn && fn.length >= 3 && nameRegex.test(fn);

    // Check Last Name
    const ln = lastName.value.trim();
    const lastNameValid = ln && ln.length >= 3 && nameRegex.test(ln);

    // Check Email (if field exists)
    let emailValid = true;
    if (email) {
      const em = email.value.trim();
      emailValid = em && emailRegex.test(em);
    }

    // Check Contact Number
    let contactValid = false;
    if (contact && countryCode) {
      const ph = contact.value.trim();
      const requiredLen = getCurrentPhoneLength();
      contactValid = ph && /^\d+$/.test(ph) && ph.length === requiredLen;
    }

    // Check Country Code
    const countryCodeValid = countryCode && countryCode.value.trim() !== "";

    // Check Branch
    const branchValid = branch && branch.value.trim() !== "";

    // Check Department
    const departmentValid = department && department.value.trim() !== "";

    // Check Role
    const roleValid = role && role.value.trim() !== "";

    // Check Reporting To
    const rep = reportingTo.value.trim();
    const reportingToValid = rep && rep.length >= 3 && reportingRegex.test(rep);

    // Check Available Branches
    const ab = availBranches.value.trim();
    const availBranchesValid = ab && branchesRegex.test(ab);

    // Check Employee ID
    const eid = employeeId.value.trim();
    const employeeIdValid = eid && empIdRegex.test(eid);

    // Enable Save button only if ALL fields are valid
    const allValid = firstNameValid && lastNameValid && emailValid && 
                     contactValid && countryCodeValid && branchValid && 
                     departmentValid && roleValid && reportingToValid && 
                     availBranchesValid && employeeIdValid;

    saveButton.disabled = !allValid;
  }

  // 🚫 Disable cut / copy / paste for Email & Employee ID
  ["paste", "copy", "cut"].forEach((evt) => {
    if (email) {
      email.addEventListener(evt, (e) => e.preventDefault());
    }
    if (employeeId) {
      employeeId.addEventListener(evt, (e) => e.preventDefault());
    }
  });

  // ==================================================
  //          LIVE INPUT RESTRICTIONS + CLEAR
  // ==================================================

  // First / Last name – only letters & spaces, max 40
  firstName.addEventListener("input", () => {
    firstName.value = firstName.value
      .replace(/[^A-Za-z\s]/g, "")
      .replace(/\s{2,}/g, " ")
      .slice(0, 40);

    const v = firstName.value.trim();
    if (!v) {
      setFieldError(firstName, "First Name is required.");
    } else if (v.length < 3) {
      setFieldError(firstName, "Minimum 3 Letters Required");
    } else if (!nameRegex.test(v)) {
      setFieldError(firstName, "First Name should contain only letters (max 40).");
    } else {
      setFieldError(firstName, "");
    }
    validateAllFields();
  });

  lastName.addEventListener("input", () => {
    lastName.value = lastName.value
      .replace(/[^A-Za-z\s]/g, "")
      .replace(/\s{2,}/g, " ")
      .slice(0, 40);

    const v = lastName.value.trim();
    if (!v) {
      setFieldError(lastName, "Last Name is required.");
    } else if (v.length < 3) {
      setFieldError(lastName, "Minimum 3 Letters Required");
    } else if (!nameRegex.test(v)) {
      setFieldError(lastName, "Last Name should contain only letters (max 40).");
    } else {
      setFieldError(lastName, "");
    }
    validateAllFields();
  });

  // Reporting To – letters, dot, hyphen, space + live validation
  reportingTo.addEventListener("input", () => {
    reportingTo.value = reportingTo.value
      .replace(/[^A-Za-z.\-\s]/g, "")
      .replace(/\s{2,}/g, " ")
      .slice(0, 40);

    const repVal = reportingTo.value.trim();

    if (!repVal) {
      setFieldError(reportingTo, "Reporting To is required.");
    } else if (repVal.length < 3) {
      setFieldError(reportingTo, "Minimum 3 Letters Required");
    } else if (!reportingRegex.test(repVal)) {
      setFieldError(
        reportingTo,
        "Reporting To may contain letters, dots, hyphens and spaces (max 40)."
      );
    } else {
      setFieldError(reportingTo, "");
    }
    validateAllFields();
  });

  // Available Branches – live validation (required + format 1,2,3)
  availBranches.addEventListener("input", () => {
    // allow only digits, comma, space
    availBranches.value = availBranches.value.replace(/[^0-9,\s]/g, "");
    const abVal = availBranches.value.trim();

    if (!abVal) {
      setFieldError(availBranches, "Available Branches is required.");
    } else if (!branchesRegex.test(abVal)) {
      setFieldError(availBranches, "Use format like: 1,2,3");
    } else {
      setFieldError(availBranches, "");
    }
    validateAllFields();
  });

  // Employee ID – letters, numbers, '-', max 20 + live validation
  employeeId.addEventListener("input", () => {
    employeeId.value = employeeId.value
      .replace(/[^A-Za-z0-9\-]/g, "")
      .slice(0, 20);

    const eidVal = employeeId.value.trim();
    if (!eidVal) {
      setFieldError(employeeId, "Employee ID is required.");
    } else if (!empIdRegex.test(eidVal)) {
      setFieldError(
        employeeId,
        "Employee ID may have letters, numbers and '-' (max 20)."
      );
    } else {
      setFieldError(employeeId, "");
    }
    validateAllFields();
  });

  // ✅ Contact – only digits + dynamic max length per country
  if (contact) {
    // When user types
    contact.addEventListener("input", () => {
      let v = contact.value.replace(/\D/g, ""); // keep only digits
      const maxLen = getCurrentPhoneLength();

      if (v.length > maxLen) {
        v = v.slice(0, maxLen);
      }
      contact.value = v;

      const ph = contact.value.trim();

      if (!ph) {
        setFieldError(contact, "Contact Number is required.");
      } else if (ph.length !== maxLen) {
        setFieldError(
          contact,
          `Contact Number must be exactly ${maxLen} digits for this country.`
        );
      } else {
        setFieldError(contact, "");
      }
      validateAllFields();
    });
  }

  // Change rules when country changes
  if (countryCode) {
    countryCode.addEventListener("change", () => {
      setupPhoneField();
      // re-validate current value if user already typed something
      if (contact && contact.value.trim()) {
        const ph = contact.value.trim();
        const maxLen = getCurrentPhoneLength();
        if (ph.length !== maxLen) {
          setFieldError(
            contact,
            `Contact Number must be exactly ${maxLen} digits for this country.`
          );
        } else {
          setFieldError(contact, "");
        }
      }
      validateAllFields();
    });
  }

  // LIVE email validation – message only, no red border (Admin view only)
  if (email) {
    email.addEventListener("input", () => {
      const value = email.value.trim();

      setFieldError(email, ""); // reset

      if (!value) {
        validateAllFields();
        return;
      }

      if (!value.includes("@") || value.endsWith("@")) {
        validateAllFields();
        return;
      }

      if (!emailRegex.test(value)) {
        setFieldError(email, "Enter a valid email address");
      }
      validateAllFields();
    });
  }

  // ============================
  // Load Department dropdown from departments.json via /api/departments
  // ============================
  function loadDepartmentOptions() {
    if (!department) return;
    fetch("/api/departments")
      .then((res) => res.json())
      .then((data) => {
        const list = (data && data.departments) ? data.departments : [];
        // Keep only "Select Department" placeholder
        department.innerHTML = '<option value="">Select Department</option>';
        list.forEach((d) => {
          if (!d || typeof d !== "object") return;
          const name = (d.name || d.department_name || "").trim();
          if (!name) return;
          const opt = document.createElement("option");
          opt.value = name;
          opt.textContent = name;
          department.appendChild(opt);
        });
        validateAllFields();
      })
      .catch((err) => {
        console.error("Error loading departments:", err);
        validateAllFields();
      });
  }
  loadDepartmentOptions();

  // ============================
  // Load Role dropdown from roles.json via /api/roles
  // ============================
  function loadRoleOptions() {
    if (!role) return;
    fetch("/api/roles")
      .then((res) => res.json())
      .then((data) => {
        const list = (data && data.roles) ? data.roles : [];
        role.innerHTML = '<option value="">Select Designation</option>';
        const seen = new Set();
        list.forEach((r) => {
          if (!r || typeof r !== "object") return;
          const name = (r.role || r.role_name || "").trim();
          if (!name || seen.has(name)) return;
          seen.add(name);
          const opt = document.createElement("option");
          opt.value = name;
          opt.textContent = name;
          role.appendChild(opt);
        });
        validateAllFields();
      })
      .catch((err) => {
        console.error("Error loading roles:", err);
        validateAllFields();
      });
  }
  loadRoleOptions();

  // Dropdowns – clear error when user chooses value
  branch.addEventListener("change", () => {
    if (branch.value.trim()) setFieldError(branch, "");
    validateAllFields();
  });

  department.addEventListener("change", () => {
    if (department.value.trim()) setFieldError(department, "");
    validateAllFields();
  });

  role.addEventListener("change", () => {
    if (role.value.trim()) setFieldError(role, "");
    validateAllFields();
  });

  // Run initial phone setup (based on default selected code)
  setupPhoneField();

  // Initialize Save button as disabled
  if (saveButton) {
    saveButton.disabled = true;
  }

  // Initial validation check
  validateAllFields();

  // ==================================================
  //                 SUBMIT VALIDATION
  // ==================================================
  form.addEventListener("submit", (e) => {
    // --------------------
    // ROLE-BASED ACCESS CHECK
    // Only Super Admin and Admin can create branch users
    // --------------------
    const pageContainer = document.querySelector(".create-user-page");
    const userRole = pageContainer ? (pageContainer.getAttribute("data-current-role") || "").toLowerCase().replace(/\s+/g, "") : "";
    
    if (userRole !== "superadmin" && userRole !== "admin") {
      e.preventDefault();
      e.stopPropagation();
      
      // Show error notification
      showErrorNotification("Create new branch user is restricted for your credentials.");
      return false;
    }

    clearAllErrors();
    let hasError = false;

    // First Name
    const fn = firstName.value.trim();
    if (!fn) {
      hasError = true;
      setFieldError(firstName, "First Name is required.");
    } else if (fn.length < 3) {
      hasError = true;
      setFieldError(firstName, "Minimum 3 Letters Required");
    } else if (!nameRegex.test(fn)) {
      hasError = true;
      setFieldError(firstName, "First Name should contain only letters (max 40).");
    }

    // Last Name
    const ln = lastName.value.trim();
    if (!ln) {
      hasError = true;
      setFieldError(lastName, "Last Name is required.");
    } else if (ln.length < 3) {
      hasError = true;
      setFieldError(lastName, "Minimum 3 Letters Required");
    } else if (!nameRegex.test(ln)) {
      hasError = true;
      setFieldError(lastName, "Last Name should contain only letters (max 40).");
    }

    // Email (only if field exists – Admin)
    if (email) {
      const em = email.value.trim();
      if (!em) {
        hasError = true;
        setFieldError(email, "Email is required.");
      } else if (!emailRegex.test(em)) {
        hasError = true;
        setFieldError(email, "Enter a valid email address.");
      }
    }

    // Contact Number – dynamic length based on country
    if (contact) {
      const ph = contact.value.trim();
      const requiredLen = getCurrentPhoneLength();

      if (!ph) {
        hasError = true;
        setFieldError(contact, "Contact Number is required.");
      } else if (!/^\d+$/.test(ph)) {
        hasError = true;
        setFieldError(contact, "Contact Number must contain digits only.");
      } else if (ph.length !== requiredLen) {
        hasError = true;
        setFieldError(
          contact,
          `Contact Number must be exactly ${requiredLen} digits for this country.`
        );
      }
    }

    // Branch – REQUIRED
    if (!branch.value.trim()) {
      hasError = true;
      setFieldError(branch, "Please select a Branch.");
    }

    // Department – REQUIRED
    if (!department.value.trim()) {
      hasError = true;
      setFieldError(department, "Please select a Department.");
    }

    // Role – REQUIRED
    if (!role.value.trim()) {
      hasError = true;
      setFieldError(role, "Please select a Role.");
    }

    // Reporting To – REQUIRED + format
    const rep = reportingTo.value.trim();
    if (!rep) {
      hasError = true;
      setFieldError(reportingTo, "Reporting To is required.");
    } else if (rep.length < 3) {
      hasError = true;
      setFieldError(reportingTo, "Minimum 3 Letters Required");
    } else if (!reportingRegex.test(rep)) {
      hasError = true;
      setFieldError(
        reportingTo,
        "Reporting To may contain letters, dots, hyphens and spaces (max 40)."
      );
    }

    // Available Branches – REQUIRED + format 1,2,3
    const ab = availBranches.value.trim();
    if (!ab) {
      hasError = true;
      setFieldError(availBranches, "Available Branches is required.");
    } else if (!branchesRegex.test(ab)) {
      hasError = true;
      setFieldError(availBranches, "Use format like: 1,2,3");
    }

    // Employee ID – REQUIRED + format
    const eid = employeeId.value.trim();
    if (!eid) {
      hasError = true;
      setFieldError(employeeId, "Employee ID is required.");
    } else if (!empIdRegex.test(eid)) {
      hasError = true;
      setFieldError(
        employeeId,
        "Employee ID may have letters, numbers and '-' (max 20)."
      );
    }

    // Country code – REQUIRED
    if (countryCode && !countryCode.value.trim()) {
      hasError = true;
      setFieldError(countryCode, "Please select a country code.");
    }

    if (hasError) {
      e.preventDefault(); // stop submit if any errors
      return false;
    }

    // ============================
    // ✅ CONVERT TO AJAX SUBMISSION (like create-department)
    // ============================
    e.preventDefault();
    e.stopPropagation();

    // Disable submit button and show loading state
    if (saveButton) {
      saveButton.disabled = true;
      const originalText = saveButton.textContent;
      saveButton.textContent = "Saving...";
      saveButton.dataset.originalText = originalText;
    }

    // Collect form data
    const formData = new FormData(form);
    const jsonData = {};
    formData.forEach((value, key) => {
      jsonData[key] = value;
    });

    // Submit via AJAX (same pattern as create-department)
    fetch(form.action, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(jsonData)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Reset button state
        if (saveButton) {
          saveButton.textContent = saveButton.dataset.originalText || "Save";
          delete saveButton.dataset.originalText;
        }

        // Redirect immediately; success toast will show on manage-users page
        window.location.href = "/manage-users?user_created=1";
      } else {
        // Show error notification
        showErrorNotification(data.message || "Failed to create user");
        
        // Re-enable button
        if (saveButton) {
          saveButton.disabled = false;
          saveButton.textContent = saveButton.dataset.originalText || "Save";
          delete saveButton.dataset.originalText;
        }
      }
    })
    .catch(err => {
      console.error("Error creating user:", err);
      showErrorNotification("Network error. Please try again.");
      
      // Re-enable button
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = saveButton.dataset.originalText || "Save";
        delete saveButton.dataset.originalText;
      }
    });

    return false;
  });
});

// // ===================== CLEAR BUTTON =====================
// const clearBtn   = document.getElementById("clearBtn");
// const createForm = document.querySelector(".create-form");

// if (clearBtn && createForm) {
//   clearBtn.addEventListener("click", () => {
//     createForm.reset(); // clears all inputs

//     // Also remove error messages if any
//     document.querySelectorAll(".field-error-msg").forEach((msg) => {
//       msg.textContent = "";
//     });

//     // Optional: reset field borders/styles
//     createForm.querySelectorAll("input, select").forEach((inp) => {
//       inp.style.borderColor = "";
//     });

//     // Disable Save button after clearing
//     const saveBtn = createForm.querySelector('button[type="submit"]');
//     if (saveBtn) {
//       saveBtn.disabled = true;
//     }
//   });
// }
