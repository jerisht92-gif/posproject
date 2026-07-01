// static/create-user.js — create / edit branch users (edit via ?user_id=, like supplier-new)
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".create-form");
  if (!form) return;

  const urlParams = new URLSearchParams(window.location.search);
  const editUserIdEl = document.getElementById("editUserId");
  const editingUserId =
    parseInt(urlParams.get("user_id") || editUserIdEl?.value || "0", 10) || 0;
  const isEditMode = editingUserId > 0;
  const pageTitleEl = document.getElementById("createUserPageTitle");
  if (isEditMode && pageTitleEl) pageTitleEl.textContent = "Edit User";
  // Turn off browser's default validation UI (red borders, tooltips)
  form.setAttribute("novalidate", "true");
 
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

  function showSuccessNotification(message) {
    document.querySelectorAll(".success-notification, .error-notification").forEach((n) => n.remove());
    const notification = document.createElement("div");
    notification.className = "success-notification";
    notification.textContent = message;
    document.body.appendChild(notification);
    requestAnimationFrame(() => notification.classList.add("show"));
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 400);
    }, 2000);
  }

  function normalizeRole(r) {
    return (r || "").toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
  }
 
  // ---------- FIELD NODES ----------
  const firstName     = document.getElementById("firstName");
  const lastName      = document.getElementById("lastName");
  const email         = document.getElementById("email");
  const contact       = document.getElementById("contact");
  const countryCode   = document.getElementById("countryCode");
  const department    = document.getElementById("department");
  const role          = document.getElementById("role");
  const reportingTo   = document.getElementById("reportingTo");
  const availBranches = document.getElementById("availableBranches");
  const employeeId    = document.getElementById("employeeId");
  const saveButton    = form.querySelector('button[type="submit"]');
  const pageContainer = document.querySelector(".create-user-page");
  const PAGE_ROLE_NORM = (pageContainer?.dataset.currentRole || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "");
  const MANAGE_USERS_URL = "/manage-users";
  const CAN_GRANT_PERMISSIONS = PAGE_ROLE_NORM === "superadmin";
  const openGrantOnLoad = urlParams.get("open_grant") === "1";

  let pendingPermissions = null;
  let permissionsDirty = false;
  let initialEditRoleNorm = "";
  // ---------- REGEX RULES ----------
  const nameRegex      = /^[A-Za-z\s]{1,40}$/;
  const lastNameRegex  = /^[A-Za-z\s]{1,30}$/;
  const emailRegex =
    /^[A-Za-z0-9._%+-]{3,40}@(gmail\.com|yahoo\.com|yahoo\.co\.in|outlook\.com|hotmail\.com|thestackly\.com|stackly\.in)$/i;
  const empIdRegex     = /^[A-Za-z0-9\-]{1,20}$/;      // letters, numbers, '-', max 20
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
 
  function setupPhoneField(preserveExisting = false) {
    if (!contact) return;
    const maxLen = getCurrentPhoneLength();
    if (!preserveExisting) {
      contact.value = "";
    } else if (contact.value) {
      contact.value = contact.value.replace(/\D/g, "").slice(0, maxLen);
    }
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
    document.querySelectorAll(".input-error").forEach((el) => {
      el.classList.remove("input-error");
    });
  }
 
  function setEmailFieldError(message) {
    if (!email) return;
    setFieldError(email, message || "");
    email.classList.toggle("input-error", !!message);
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
    const lastNameValid = ln && ln.length >= 1 && lastNameRegex.test(ln);
 
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
 
    // Check Branch / Department / Role
    const departmentValid = department && department.value.trim() !== "";
    const roleValid       = role       && role.value.trim()       !== "";
 
    // Check Reporting To
    const rep = reportingTo.value.trim();
    const reportingToValid = rep && rep.length >= 3 && reportingRegex.test(rep);
 
    // Check Available Branches
    const ab = availBranches ? availBranches.value.trim() : "";
    const availBranchesValid = !!ab;
 
    // Check Employee ID
    const eid = employeeId.value.trim();
    const employeeIdValid = eid && empIdRegex.test(eid);
 
    // Enable Save button only if ALL fields are valid
    const allValid = firstNameValid && lastNameValid && emailValid &&
                     contactValid && countryCodeValid &&
                     departmentValid && roleValid && reportingToValid &&
                     availBranchesValid && employeeIdValid;
 
    // Live guidance: once all text fields are valid, prompt user to choose dropdowns
    const allTextValid =
      firstNameValid &&
      lastNameValid &&
      emailValid &&
      contactValid &&
      countryCodeValid &&
      reportingToValid &&
      availBranchesValid &&
      employeeIdValid;
 
    if (allTextValid) {
      if (!departmentValid && department) {
        setFieldError(department, "Please select a Department.");
      }
      if (!roleValid && role) {
        setFieldError(role, "Please select a Role.");
      }
      if (!availBranchesValid && availBranches) {
        setFieldError(availBranches, "Available Branches is required.");
      }
    }
 
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
 
  // First / Last name – only letters & spaces
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
      .slice(0, 30);
 
    const v = lastName.value.trim();
    if (!v) {
      setFieldError(lastName, "Last Name is required.");
    } else if (v.length < 1) {
      setFieldError(lastName, "Minimum 1 Letters Required");
    } else if (!lastNameRegex.test(v)) {
      setFieldError(lastName, "Last Name should contain only letters (1-30).");
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
 
  // Available Branches – select validation
  if (availBranches) {
    availBranches.addEventListener("change", () => {
      if (!availBranches.value.trim()) {
        setFieldError(availBranches, "Available Branches is required.");
      } else {
        setFieldError(availBranches, "");
      }
      validateAllFields();
    });
  }
 
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
 
  // LIVE email validation – message + .input-error (same pattern as other fields)
  if (email) {
    email.addEventListener("input", () => {
      const value = email.value.trim();
 
      if (!value) {
        setEmailFieldError("Email is required.");
        validateAllFields();
        return;
      }
 
      if (!value.includes("@")) {
        setEmailFieldError("Include an @ in your email address.");
        validateAllFields();
        return;
      }
 
      if (value.endsWith("@")) {
        setEmailFieldError("Enter the domain after @ (e.g. gmail.com).");
        validateAllFields();
        return;
      }
 
      const domainPart = value.slice(value.indexOf("@") + 1).trim();
      if (!domainPart) {
        setEmailFieldError("Enter the domain after @ (e.g. gmail.com).");
        validateAllFields();
        return;
      }
 
      if (!emailRegex.test(value)) {
        setEmailFieldError(
          "Use a valid email (@gmail.com, @yahoo.com, @outlook.com, @hotmail.com, @thestackly.com, @stackly.in)"
        );
        validateAllFields();
        return;
      }
 
      setEmailFieldError("");
      validateAllFields();
    });
  }
 
  // ============================
  // Load Department dropdown from data embedded in the page (no extra XHR)
  // ============================
  function loadDepartmentOptions() {
    if (!department) return;
    const list = Array.isArray(window.initialDepartments) ? window.initialDepartments : [];
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
  }
  loadDepartmentOptions();

  // ============================
  // Load Role dropdown — all roles from roles table
  // ============================
  let rolesFromApi = [];

  function populateRoleDropdown(list, preserveRole = "") {
    if (!role) return;
    const keep = (preserveRole || role.value || "").trim();
    role.innerHTML = '<option value="">Select Role</option>';
    rolesFromApi = Array.isArray(list) ? list : [];
    rolesFromApi.forEach((r) => {
      const name = (r.role || r.role_name || "").trim();
      if (!name) return;
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      if (r.id != null) opt.dataset.roleId = String(r.id);
      role.appendChild(opt);
    });
    if (keep && Array.from(role.options).some((o) => o.value === keep)) {
      role.value = keep;
    } else {
      role.value = "";
    }
    validateAllFields();
  }

  function fallbackRolesList() {
    if (Array.isArray(window.initialRolesForForm) && window.initialRolesForForm.length) {
      return window.initialRolesForForm;
    }
    return (window.initialRoles || [])
      .map((r) => ({ role: (r.role || r.role_name || "").trim(), permissions: r.permissions || {} }))
      .filter((r) => r.role);
  }

  async function refreshRoleOptions(preserveRole = "") {
    if (!role) return;
    const keep = (preserveRole || role.value || "").trim();
    const embedded = fallbackRolesList();
    if (embedded.length) {
      populateRoleDropdown(embedded, keep);
    }

    try {
      const res = await fetch("/api/users/form-roles", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.roles_for_form) && data.roles_for_form.length) {
        populateRoleDropdown(data.roles_for_form, keep);
        return;
      }
    } catch (err) {
      console.error("refreshRoleOptions:", err);
    }
    if (!embedded.length) {
      populateRoleDropdown([], keep);
    }
  }

  const ORPHAN_BRANCH_NAMES = new Set(["main branch"]);

  function isRegisteredBranch(name) {
    const n = String(name || "").trim().toLowerCase();
    if (!n || ORPHAN_BRANCH_NAMES.has(n)) return false;
    const list = Array.isArray(window.initialBranches) ? window.initialBranches : [];
    return list.some((b) => (b.name || "").trim().toLowerCase() === n);
  }

  function setBranchSelectValue(value) {
    if (!availBranches) return;
    const v = String(value || "").trim();
    if (!v || !isRegisteredBranch(v)) {
      availBranches.value = "";
      return;
    }
    availBranches.value = v;
  }

  // ============================
  // Load Available Branches from data embedded in the page
  // ============================
  function branchOptionLabel(b) {
    const name = (b.name || "").trim();
    const code = (b.code || "").trim();
    if (!name) return "";
    return code ? `${name} (${code})` : name;
  }

  function loadBranchOptions() {
    if (!availBranches) return;
    const list = Array.isArray(window.initialBranches) ? window.initialBranches : [];
    availBranches.innerHTML = '<option value="">Select Available Branch</option>';
    list.forEach((b) => {
      if (!b || typeof b !== "object") return;
      const name = (b.name || "").trim();
      if (!name || ORPHAN_BRANCH_NAMES.has(name.toLowerCase())) return;
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = branchOptionLabel(b);
      availBranches.appendChild(opt);
    });
    validateAllFields();
  }
  loadBranchOptions();

  // ============================
  // GRANT PERMISSIONS (Limit Access → users.user_permission JSON)
  // ============================
  const grantPermissionBtn = document.getElementById("grantPermissionBtn");
  const grantModal = document.getElementById("createGrantPermissionsModal");
  const grantUserLabel = document.getElementById("createGrantUserLabel");
  const cancelGrantBtn = document.getElementById("cancelCreateGrantBtn");
  const saveGrantBtn = document.getElementById("saveCreateGrantBtn");
  let grantSaving = false;

  function grantPermissionsHasAnyFromObj(perms) {
    return Object.values(perms || {}).some(
      (p) => p.full_access || p.view || p.create || p.edit || p.delete
    );
  }

  function applyGrantPermissionsToModal(permissions) {
    document.querySelectorAll("#createGrantPermissionsTableBody input[type='checkbox']").forEach((cb) => {
      cb.checked = false;
    });
    Object.keys(permissions || {}).forEach((menu) => {
      const row = document.querySelector(`#createGrantPermissionsTableBody tr[data-menu="${menu}"]`);
      if (!row || !permissions[menu]) return;
      ["full_access", "view", "create", "edit", "delete"].forEach((field) => {
        const suffix = field === "full_access" ? "full" : field;
        const cb = row.querySelector(`input[name="${menu}_${suffix}"]`);
        if (cb) cb.checked = !!permissions[menu][field];
      });
    });
  }

  function collectGrantPermissions() {
    const permissions = {};
    document.querySelectorAll("#createGrantPermissionsTableBody tr[data-menu]").forEach((row) => {
      const menu = row.dataset.menu;
      if (!menu) return;
      permissions[menu] = {
        full_access: !!row.querySelector(`[name="${menu}_full"]`)?.checked,
        view: !!row.querySelector(`[name="${menu}_view"]`)?.checked,
        create: !!row.querySelector(`[name="${menu}_create"]`)?.checked,
        edit: !!row.querySelector(`[name="${menu}_edit"]`)?.checked,
        delete: !!row.querySelector(`[name="${menu}_delete"]`)?.checked,
      };
      if (!permissions[menu].full_access && !permissions[menu].view) {
        permissions[menu].create = false;
        permissions[menu].edit = false;
        permissions[menu].delete = false;
      }
    });
    return permissions;
  }

  function setupGrantFullAccessLogic() {
    document.querySelectorAll("#createGrantPermissionsTableBody tr[data-menu]").forEach((row) => {
      const menu = row.dataset.menu;
      if (!menu) return;
      const fullCb = row.querySelector(`input[name="${menu}_full"]`);
      const viewCb = row.querySelector(`input[name="${menu}_view"]`);
      const createCb = row.querySelector(`input[name="${menu}_create"]`);
      const editCb = row.querySelector(`input[name="${menu}_edit"]`);
      const deleteCb = row.querySelector(`input[name="${menu}_delete"]`);
      const others = [viewCb, createCb, editCb, deleteCb].filter(Boolean);
      if (!fullCb) return;
      const syncFullAccess = () => {
        fullCb.checked = others.every((o) => o.checked);
      };
      fullCb.addEventListener("change", () => {
        others.forEach((cb) => { cb.checked = fullCb.checked; });
      });
      others.forEach((cb) => {
        cb.addEventListener("change", () => {
          if (cb !== viewCb && cb.checked && viewCb) {
            viewCb.checked = true;
          }
          if (cb === viewCb && viewCb && !viewCb.checked) {
            fullCb.checked = false;
            [createCb, editCb, deleteCb].filter(Boolean).forEach((o) => { o.checked = false; });
          }
          syncFullAccess();
        });
      });
    });
  }

  function getTargetRoleNorm() {
    const selected = normalizeRole(role?.value || "");
    if (selected) return selected;
    if (isEditMode && window.initialEditUser?.role) {
      return normalizeRole(window.initialEditUser.role);
    }
    return "";
  }

  function updateGrantButtonState() {
    if (!grantPermissionBtn || !CAN_GRANT_PERMISSIONS) return;
    const targetRole = getTargetRoleNorm();
    if (targetRole === "superadmin") {
      grantPermissionBtn.hidden = true;
      return;
    }
    grantPermissionBtn.hidden = false;
    const hasAny = grantPermissionsHasAnyFromObj(pendingPermissions);
    grantPermissionBtn.textContent = hasAny ? "Edit Access" : "Limit Access";
    grantPermissionBtn.classList.toggle("has-permissions", hasAny);
  }

  function closeGrantModal() {
    if (grantModal) {
      grantModal.classList.remove("show");
      grantModal.setAttribute("aria-hidden", "true");
    }
    if (saveGrantBtn) {
      saveGrantBtn.disabled = false;
      saveGrantBtn.textContent = "Save";
    }
    grantSaving = false;
  }

  function openGrantModal() {
    if (!grantModal) return;
    grantModal.classList.add("show");
    grantModal.setAttribute("aria-hidden", "false");
  }

  function updateGrantModalUserLabel(userFromApi) {
    if (!grantUserLabel) return;
    if (userFromApi?.name || userFromApi?.email) {
      grantUserLabel.textContent = `${userFromApi.name || ""} (${userFromApi.email || ""})`;
      return;
    }
    if (isEditMode && window.initialEditUser) {
      const u = window.initialEditUser;
      grantUserLabel.textContent = `${u.first_name || ""} ${u.last_name || ""}`.trim()
        + (u.email ? ` (${u.email})` : "");
      return;
    }
    const fn = (firstName?.value || "").trim();
    const ln = (lastName?.value || "").trim();
    const em = (email?.value || "").trim();
    grantUserLabel.textContent = fn || em
      ? `${fn} ${ln}`.trim() + (em ? ` (${em})` : "")
      : "New user — select permissions below";
  }

  function permissionApiUrl(path) {
    const sep = path.includes("?") ? "&" : "?";
    return `${path}${sep}_=${Date.now()}`;
  }

  async function fetchUserPermissionsFromApi(userId) {
    const res = await fetch(permissionApiUrl(`/api/users/${userId}/permissions`), {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to load user permissions.");
    }
    return data;
  }

  async function fetchRolePreviewPermissions() {
    const rl = (role?.value || "").trim();
    if (!rl) return null;
    if (normalizeRole(rl) === "superadmin") return null;
    const params = new URLSearchParams({
      role: rl,
      department: (department?.value || "").trim(),
      branch: (availBranches?.value || "").trim(),
    });
    const res = await fetch(permissionApiUrl(`/api/permissions/role-preview?${params}`), {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to load role permissions.");
    }
    return data;
  }

  function currentSelectedRole() {
    return (role?.value || "").trim();
  }

  function hasSelectedRoleChangedFromInitial() {
    if (!isEditMode || !initialEditRoleNorm) return false;
    return normalizeRole(currentSelectedRole()) !== initialEditRoleNorm;
  }

  async function syncPermissionsToSelectedRole() {
    const rl = currentSelectedRole();
    if (!rl) {
      pendingPermissions = null;
      return null;
    }
    if (normalizeRole(rl) === "superadmin") {
      pendingPermissions = null;
      return null;
    }
    await loadRolePreviewIntoPending();
    permissionsDirty = true;
    return pendingPermissions;
  }

  async function loadRolePreviewIntoPending() {
    const data = await fetchRolePreviewPermissions();
    if (data) {
      pendingPermissions = data.permissions || {};
    }
    return data;
  }

  async function loadPermissionsForModal() {
    const rl = currentSelectedRole();
    if (!rl) {
      throw new Error("Please select a role first.");
    }
    if (normalizeRole(rl) === "superadmin") {
      throw new Error("Super Admin always has full access.");
    }

    // Edit user, same role as page load — always load saved users.user_permission from API
    if (isEditMode && editingUserId && !hasSelectedRoleChangedFromInitial()) {
      const data = await fetchUserPermissionsFromApi(editingUserId);
      pendingPermissions = data.permissions || {};
      permissionsDirty = false;
      applyGrantPermissionsToModal(pendingPermissions);
      updateGrantModalUserLabel(data.user);
      return;
    }

    // Role changed or create user — role defaults from API
    await syncPermissionsToSelectedRole();
    applyGrantPermissionsToModal(pendingPermissions || {});
    updateGrantModalUserLabel();
  }

  async function openGrantPermissionsModal() {
    if (!CAN_GRANT_PERMISSIONS || !grantModal) return;
    const targetRole = getTargetRoleNorm();
    if (targetRole === "superadmin") {
      showErrorNotification("Super Admin always has full access.");
      return;
    }
    openGrantModal();
    if (grantUserLabel && isEditMode && window.initialEditUser) {
      const u = window.initialEditUser;
      grantUserLabel.textContent = `${u.first_name || ""} ${u.last_name || ""}`.trim()
        + (u.email ? ` (${u.email})` : "");
    }
    if (saveGrantBtn) {
      saveGrantBtn.disabled = true;
      saveGrantBtn.textContent = "Loading...";
    }
    try {
      await loadPermissionsForModal();
    } catch (err) {
      showErrorNotification(err.message || "Failed to load permissions.");
      closeGrantModal();
    } finally {
      if (saveGrantBtn) {
        saveGrantBtn.disabled = false;
        saveGrantBtn.textContent = "Save";
      }
    }
  }

  async function persistGrantPermissionsToApi(userId, perms) {
    const res = await fetch(permissionApiUrl(`/api/users/${userId}/permissions`), {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      cache: "no-store",
      body: JSON.stringify({ permissions: perms }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to save permissions");
    }
    return data;
  }

  async function saveGrantPermissions() {
    if (grantSaving) return;
    const perms = collectGrantPermissions();
    grantSaving = true;
    if (saveGrantBtn) {
      saveGrantBtn.disabled = true;
      saveGrantBtn.textContent = "Saving...";
    }
    try {
      if (isEditMode && editingUserId) {
        await persistGrantPermissionsToApi(editingUserId, perms);
        pendingPermissions = perms;
        permissionsDirty = false;
        if (window.RbacSession && typeof window.RbacSession.reload === "function") {
          window.RbacSession.reload().catch(() => {});
        }
      } else {
        pendingPermissions = perms;
        permissionsDirty = true;
        if (window.UnsavedWarning) UnsavedWarning.markDirty();
      }
      updateGrantButtonState();
      closeGrantModal();
      showSuccessNotification(isEditMode ? "Permissions saved to user" : "Permissions saved");
    } catch (err) {
      showErrorNotification(err.message || "Failed to save permissions");
    } finally {
      grantSaving = false;
      if (saveGrantBtn) {
        saveGrantBtn.disabled = false;
        saveGrantBtn.textContent = "Save";
      }
    }
  }

  setupGrantFullAccessLogic();
  if (grantPermissionBtn) {
    grantPermissionBtn.addEventListener("click", openGrantPermissionsModal);
  }
  if (cancelGrantBtn) cancelGrantBtn.addEventListener("click", closeGrantModal);
  if (saveGrantBtn) saveGrantBtn.addEventListener("click", saveGrantPermissions);
  if (grantModal) {
    grantModal.addEventListener("click", (e) => {
      if (e.target === grantModal) closeGrantModal();
    });
  }
  updateGrantButtonState();

  function ensureSelectOption(selectEl, value, label) {
    if (!selectEl || !value) return;
    const v = String(value).trim();
    if (!v) return;
    if (!Array.from(selectEl.options).some((o) => o.value === v)) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = label || v;
      selectEl.appendChild(opt);
    }
    selectEl.value = v;
  }

  function fillFormFromUser(user) {
    if (!user || typeof user !== "object") return;
    if (firstName) firstName.value = (user.first_name || "").trim();
    if (lastName) lastName.value = (user.last_name || "").trim();
    if (email) {
      email.value = (user.email || "").trim();
      email.readOnly = true;
      email.classList.add("readonly-field");
    }
    const cc = (user.country_code || "+91").trim();
    if (countryCode) countryCode.value = cc.startsWith("+") ? cc : `+${cc}`;
    if (contact) contact.value = (user.contact_number || "").trim();
    ensureSelectOption(department, user.department);
    setBranchSelectValue(user.available_branches);
    let roleVal = (user.role || "").trim();
    if (roleVal === "Super_Admin") roleVal = "Super Admin";
    initialEditRoleNorm = normalizeRole(roleVal);
    if (reportingTo) reportingTo.value = (user.reporting_to || "").trim();
    if (employeeId) employeeId.value = (user.employee_id || "").trim();
    const designationEl = document.getElementById("designation");
    if (designationEl) designationEl.value = (user.designation || "").trim();
    if (editUserIdEl && user.user_id) editUserIdEl.value = String(user.user_id);
    setupPhoneField(true);
    if (pageTitleEl) pageTitleEl.textContent = "Edit User";
    if (saveButton) {
      saveButton.textContent = "Update";
      saveButton.dataset.originalText = "Update";
    }
    validateAllFields();
  }

  async function loadUserForEdit() {
    if (!isEditMode) return;

    const embeddedUser =
      window.initialEditUser && typeof window.initialEditUser === "object"
        ? window.initialEditUser
        : null;

    if (embeddedUser && embeddedUser.user_id) {
      fillFormFromUser(embeddedUser);
      const roleVal = (embeddedUser.role || "").trim();
      await refreshRoleOptions(roleVal);
      if (roleVal && role?.value !== roleVal) ensureSelectOption(role, roleVal);
      await loadStoredPermissionsForEdit();
      updateGrantButtonState();
      if (openGrantOnLoad && CAN_GRANT_PERMISSIONS) {
        openGrantPermissionsModal();
      }
      return;
    }

    try {
      const res = await fetch(`/api/user/${editingUserId}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.user) {
        showErrorNotification(data.message || "Failed to load user.");
        return;
      }
      fillFormFromUser(data.user);
      const roleVal = (data.user.role || "").trim();
      await refreshRoleOptions(roleVal);
      if (roleVal && role?.value !== roleVal) ensureSelectOption(role, roleVal);
      await loadStoredPermissionsForEdit();
      updateGrantButtonState();
      if (openGrantOnLoad && CAN_GRANT_PERMISSIONS) {
        openGrantPermissionsModal();
      }
    } catch (err) {
      console.error("loadUserForEdit:", err);
      showErrorNotification("Network error while loading user.");
    }
  }

  async function loadStoredPermissionsForEdit() {
    if (!isEditMode || !CAN_GRANT_PERMISSIONS || !editingUserId) return null;
    try {
      const data = await fetchUserPermissionsFromApi(editingUserId);
      pendingPermissions = data.permissions || {};
      permissionsDirty = false;
      updateGrantButtonState();
      return data;
    } catch (err) {
      console.error("loadStoredPermissionsForEdit:", err);
    }
    return null;
  }

  async function initPage() {
    if (isEditMode) {
      await loadUserForEdit();
      return;
    }
    setupPhoneField();
    await refreshRoleOptions();
    if (saveButton) saveButton.disabled = true;
    validateAllFields();
  }

  initPage();

  if (!isEditMode && window.UnsavedWarning) {
    UnsavedWarning.enable({ root: ".create-user-page" });
  }

  department.addEventListener("change", async () => {
    if (department.value.trim()) setFieldError(department, "");
    if (currentSelectedRole() && hasSelectedRoleChangedFromInitial()) {
      try {
        await syncPermissionsToSelectedRole();
        updateGrantButtonState();
        if (grantModal?.classList.contains("show")) {
          applyGrantPermissionsToModal(pendingPermissions || {});
        }
      } catch (err) {
        console.error("department change permissions:", err);
      }
    }
    validateAllFields();
  });

  if (availBranches) {
    availBranches.addEventListener("change", async () => {
      if (availBranches.value.trim()) setFieldError(availBranches, "");
      if (currentSelectedRole() && hasSelectedRoleChangedFromInitial()) {
        try {
          await syncPermissionsToSelectedRole();
          updateGrantButtonState();
          if (grantModal?.classList.contains("show")) {
            applyGrantPermissionsToModal(pendingPermissions || {});
          }
        } catch (err) {
          console.error("branch change permissions:", err);
        }
      }
      validateAllFields();
    });
  }

  role.addEventListener("change", async () => {
    if (role.value.trim()) setFieldError(role, "");
    const newRoleNorm = normalizeRole(role.value);

    if (newRoleNorm === "superadmin") {
      pendingPermissions = null;
      permissionsDirty = false;
      updateGrantButtonState();
      validateAllFields();
      if (grantModal?.classList.contains("show")) closeGrantModal();
      return;
    }

    // Switched back to the user's original role — restore saved custom permissions
    if (isEditMode && initialEditRoleNorm && newRoleNorm === initialEditRoleNorm) {
      permissionsDirty = false;
      await loadStoredPermissionsForEdit();
      if (grantModal?.classList.contains("show")) {
        applyGrantPermissionsToModal(pendingPermissions || {});
      }
      validateAllFields();
      return;
    }

    // Any other role — load defaults from roles.permissions for that role
    pendingPermissions = null;
    try {
      await syncPermissionsToSelectedRole();
      updateGrantButtonState();
      if (grantModal?.classList.contains("show")) {
        applyGrantPermissionsToModal(pendingPermissions || {});
      }
    } catch (err) {
      console.error("role change permissions:", err);
      showErrorNotification(err.message || "Failed to load role permissions.");
    }

    validateAllFields();
  });

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
    } else if (ln.length < 1) {
      hasError = true;
      setFieldError(lastName, "Minimum 1 Letters Required");
    } else if (!lastNameRegex.test(ln)) {
      hasError = true;
      setFieldError(lastName, "Last Name should contain only letters (1-30).");
    }
 
    // Email (only if field exists – Admin)
    if (email) {
      const em = email.value.trim();
      if (!em) {
        hasError = true;
        setEmailFieldError("Email is required.");
      } else if (!emailRegex.test(em)) {
        hasError = true;
        setEmailFieldError(
          "Use a valid email (@gmail.com, @yahoo.com, @outlook.com, @hotmail.com, @thestackly.com, @stackly.in)"
        );
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
 
    // Available Branches – REQUIRED
    const ab = availBranches ? availBranches.value.trim() : "";
    if (!ab) {
      hasError = true;
      setFieldError(availBranches, "Available Branches is required.");
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
    jsonData.name = `${fn} ${ln}`.trim();
    const submitCc = (jsonData.country_code || "").trim();
    const submitCn = (jsonData.contact_number || "").trim();
    jsonData.phone = `${submitCc}${submitCn}`.trim();
    if (
      CAN_GRANT_PERMISSIONS
      && pendingPermissions
      && grantPermissionsHasAnyFromObj(pendingPermissions)
      && !["superadmin"].includes(normalizeRole(jsonData.role || role?.value))
    ) {
      jsonData.permissions = pendingPermissions;
    }

    const submitUrl = isEditMode ? `/update-user/${editingUserId}` : form.action;
    const submitMethod = isEditMode ? "PUT" : "POST";

    fetch(submitUrl, {
      method: submitMethod,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(jsonData)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        if (saveButton) {
          saveButton.textContent = saveButton.dataset.originalText || (isEditMode ? "Update" : "Save");
          delete saveButton.dataset.originalText;
        }
        if (window.UnsavedWarning) UnsavedWarning.allowLeave();
        window.location.href = isEditMode
          ? `${MANAGE_USERS_URL}?user_updated=1`
          : `${MANAGE_USERS_URL}?user_created=1`;
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
 