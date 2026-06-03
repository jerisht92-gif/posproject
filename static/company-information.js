document.addEventListener("DOMContentLoaded", () => {

    const companyPage = document.querySelector(".company-page");
    let canEdit = companyPage?.dataset.canEdit === "1";
    const isNewCompanyPage = companyPage?.dataset.isNewCompany === "1";

    const companyNameInput = document.getElementById("companyName");
    const companyCodeInput = document.getElementById("companyCode");
    const companyTypeSelect = document.getElementById("companyType");
    const ownerNameInput = document.getElementById("ownerName");
    const gstinInput = document.getElementById("gstin");
    const registrationInput = document.getElementById("registrationNo");
    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("phone");
    const websiteInput = document.getElementById("website");
    const addressInput = document.getElementById("address");
    const cityInput = document.getElementById("city");
    const stateSelect = document.getElementById("state");
    const countrySelect = document.getElementById("country");
    const pincodeInput = document.getElementById("pincode");
    const branchCountInput = document.getElementById("branchCount");
    const branchTableBody = document.getElementById("branchTableBody");
    const addBranchBtn = document.getElementById("addBranchBtn");
    const saveBtn = document.getElementById("saveCompanyBtn");
    const cancelBtn = document.getElementById("cancelBtn");
  
    const companyNameErr = document.getElementById("companyNameErr");
    const companyCodeErr = document.getElementById("companyCodeErr");
    const companyTypeErr = document.getElementById("companyTypeErr");
    const ownerNameErr = document.getElementById("ownerNameErr");
    const gstinErr = document.getElementById("gstinErr");
    const registrationErr = document.getElementById("registrationErr");
    const emailErr = document.getElementById("emailErr");
    const phoneErr = document.getElementById("phoneErr");
    const websiteErr = document.getElementById("websiteErr");
    const addressErr = document.getElementById("addressErr");
    const cityErr = document.getElementById("cityErr");
    const stateErr = document.getElementById("stateErr");
    const countryErr = document.getElementById("countryErr");
    const pincodeErr = document.getElementById("pincodeErr");
    const branchCountErr = document.getElementById("branchCountErr");
    const branchTableErr = document.getElementById("branchTableErr");
  
    const API_URL = "/api/company-information";
    let branchRowsBackup = [];

    function escapeViewText(text) {
      const d = document.createElement("div");
      d.textContent = text == null ? "" : String(text);
      return d.innerHTML;
    }

    function readBranchRowsFromTable() {
      const rows = [];
      branchTableBody.querySelectorAll("tr").forEach((row) => {
        if (row.dataset.viewMode === "1") {
          const cells = row.querySelectorAll("td");
          rows.push({
            branch_name: cells[1]?.textContent?.trim() || "",
            branch_code: cells[2]?.textContent?.trim() || "",
            phone: cells[3]?.textContent?.trim() || "",
            address: cells[4]?.textContent?.trim() || "",
            city: cells[5]?.textContent?.trim() || "",
            state: cells[6]?.textContent?.trim() || "",
          });
          return;
        }
        rows.push({
          branch_name: (row.querySelector(".branch-name")?.value || "").trim(),
          branch_code: (row.querySelector(".branch-code")?.value || "").trim(),
          phone: (row.querySelector(".branch-phone")?.value || "").trim(),
          address: (row.querySelector(".branch-address")?.value || "").trim(),
          city: (row.querySelector(".branch-city")?.value || "").trim(),
          state: (row.querySelector(".branch-state")?.value || "").trim(),
        });
      });
      return rows;
    }

    function renderBranchTableAsValues(branches) {
      branchTableBody.innerHTML = "";
      (branches || []).forEach((b, index) => {
        const tr = document.createElement("tr");
        tr.dataset.viewMode = "1";
        const display = (v) => escapeViewText(v || "—");
        tr.innerHTML = `
          <td class="sl-no">${index + 1}</td>
          <td class="branch-view-cell">${display(b.branch_name)}</td>
          <td class="branch-view-cell">${display(b.branch_code)}</td>
          <td class="branch-view-cell">${display(b.phone)}</td>
          <td class="branch-view-cell">${display(b.address)}</td>
          <td class="branch-view-cell">${display(b.city)}</td>
          <td class="branch-view-cell">${display(b.state)}</td>
        `;
        branchTableBody.appendChild(tr);
      });
    }

    function setViewOnlyMode() {
      branchRowsBackup = readBranchRowsFromTable();
      renderBranchTableAsValues(branchRowsBackup);

      document.querySelectorAll(
        ".company-card input, .company-card select, .company-card textarea"
      ).forEach((el) => {
        el.disabled = true;
        el.readOnly = true;
      });

      const logoFileEl = document.getElementById("logoFile");
      if (logoFileEl) {
        logoFileEl.disabled = true;
        const logoLabel = document.querySelector('label[for="logoFile"]');
        if (logoLabel) logoLabel.style.pointerEvents = "none";
      }
      if (addBranchBtn) addBranchBtn.style.display = "none";
      if (saveBtn) saveBtn.style.display = "none";
      if (cancelBtn) cancelBtn.textContent = "Back";

      const branchCountField = document.querySelector(".field.branch-count");
      if (branchCountField) branchCountField.style.display = "none";

      const actionHeader = document.querySelector(".branch-table thead th:last-child");
      if (actionHeader) actionHeader.style.display = "none";

      companyPage?.classList.add("company-view-only");
    }

    function setEditMode() {
      companyPage?.classList.remove("company-view-only");

      const branchCountField = document.querySelector(".field.branch-count");
      if (branchCountField) branchCountField.style.display = "";

      const actionHeader = document.querySelector(".branch-table thead th:last-child");
      if (actionHeader) actionHeader.style.display = "";

      const rowsToRestore = branchRowsBackup.length
        ? branchRowsBackup
        : readBranchRowsFromTable();
      branchTableBody.innerHTML = "";
      rowsToRestore.forEach((b) => addBranchRow(b));
      branchRowsBackup = [];

      document.querySelectorAll(
        ".company-card input, .company-card select, .company-card textarea, .branch-table input, .branch-table select"
      ).forEach((el) => {
        el.disabled = false;
        el.readOnly = false;
      });

      const logoFileEl = document.getElementById("logoFile");
      if (logoFileEl) logoFileEl.disabled = false;
      const logoLabel = document.querySelector('label[for="logoFile"]');
      if (logoLabel) logoLabel.style.pointerEvents = "";
      if (addBranchBtn) addBranchBtn.style.display = "";
      if (saveBtn) saveBtn.style.display = "";
      if (cancelBtn) cancelBtn.textContent = "Clear";

      const viewNote = document.querySelector(".company-view-only-note");
      if (viewNote) viewNote.style.display = "none";
    }

    function showNewCompanyForm(prefill) {
      clearForm();
      const p = prefill || {};
      if (p.company_name && companyNameInput) companyNameInput.value = p.company_name;
      if (p.owner_name && ownerNameInput) ownerNameInput.value = p.owner_name;
      if (p.email && emailInput) emailInput.value = p.email;
      if (p.phone && phoneInput) phoneInput.value = p.phone;
      if (p.country && countrySelect) countrySelect.value = p.country;
      if (companyCodeInput) companyCodeInput.placeholder = "Choose your permanent code (e.g. ACME01)";
      canEdit = true;
      setEditMode();
      if (saveBtn) {
        saveBtn.style.display = "";
        saveBtn.disabled = false;
      }
      runLiveValidation();
    }

    async function loadCompanyInformation() {
      try {
        const response = await fetch(API_URL);
        const result = await response.json();
        if (!response.ok || !result.success) {
          if (response.status === 403) {
            showToast(result.message || "Access denied.", "error");
          }
          return;
        }
        if (result.is_new_company || isNewCompanyPage || (!result.company && result.can_edit)) {
          showNewCompanyForm(result.prefill || {});
          return;
        }
        if (result.company) {
          clearForm({ company: result.company, branches: result.branches || [] });
        }
        if (result.can_edit === true) {
          canEdit = true;
          setEditMode();
        } else if (!canEdit) {
          setViewOnlyMode();
        }
      } catch (err) {
        console.error("Failed to load company information:", err);
        if (isNewCompanyPage) {
          showNewCompanyForm({});
        }
      }
    }
  
    const INDIAN_STATES = [
      "Tamil Nadu",
      "Andaman and Nicobar Islands",
      "Andhra Pradesh",
      "Arunachal Pradesh",
      "Assam",
      "Bihar",
      "Chandigarh",
      "Chhattisgarh",
      "Dadra and Nagar Haveli and Daman and Diu",
      "Delhi",
      "Goa",
      "Gujarat",
      "Haryana",
      "Himachal Pradesh",
      "Jammu and Kashmir",
      "Jharkhand",
      "Karnataka",
      "Kerala",
      "Ladakh",
      "Lakshadweep",
      "Madhya Pradesh",
      "Maharashtra",
      "Manipur",
      "Meghalaya",
      "Mizoram",
      "Nagaland",
      "Odisha",
      "Puducherry",
      "Punjab",
      "Rajasthan",
      "Sikkim",
      "Telangana",
      "Tripura",
      "Uttar Pradesh",
      "Uttarakhand",
      "West Bengal"
    ];
  
    const NAME_RE = /^[A-Za-z0-9 .,&()'/-]{3,100}$/;
    const CODE_RE = /^[A-Z0-9-]{2,20}$/;
    const OWNER_RE = /^[A-Za-z\s]{2,80}$/;
    const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
    const REG_RE = /^[A-Z0-9]{8,25}$/;
    const EMAIL_RE =
      /^[A-Za-z0-9._%+-]{1,64}@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*(?:com|in|org|net|edu|gov|info|biz|co|io|me|us|uk|au|asia|tech|store|online|site|app|dev|ai|co\.in|com\.in|net\.in|org\.in|gov\.in|ac\.in|edu\.in)$/i;
    const PHONE_RE = /^[0-9]{10}$/;
    const PIN_RE = /^[0-9]{6}$/;
    const CITY_RE = /^[A-Za-z\s]{2,50}$/;
    const ADDRESS_RE = /^[A-Za-z0-9 ,.\-/]{10,250}$/;
    const WEBSITE_RE =
      /^(https?:\/\/)?(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+(?:com|in|org|net|edu|gov|info|biz|co|io|me|us|uk|au|asia|tech|store|online|site|app|dev|ai|co\.in|com\.in|net\.in|org\.in|gov\.in|ac\.in|edu\.in)(?:\/[^\s]*)?$/i;
  
    function showToast(message, type = "success") {
      const existing = document.querySelector(".success-notification, .error-notification");
      if (existing) existing.remove();
  
      const div = document.createElement("div");
      div.className = type === "error" ? "error-notification" : "success-notification";
      const msg = document.createElement("span");
      msg.className = "toast-msg";
      msg.textContent = message;
      div.appendChild(msg);
      document.body.appendChild(div);
  
      requestAnimationFrame(() => {
        div.classList.add("show");
      });
  
      setTimeout(() => {
        div.classList.remove("show");
        setTimeout(() => div.remove(), 300);
      }, type === "error" ? 3000 : 2000);
    }
  
    function runLiveValidation() {
      let ok = true;
  
      const name = companyNameInput.value.trim();
      if (!name) {
        companyNameErr.textContent = "Company name is required.";
        companyNameInput.classList.add("input-error");
        ok = false;
      } else if (!NAME_RE.test(name)) {
        companyNameErr.textContent = "Use 3-100 letters, numbers, spaces, . , & ( ) ' / - only.";
        companyNameInput.classList.add("input-error");
        ok = false;
      } else {
        companyNameErr.textContent = "";
        companyNameInput.classList.remove("input-error");
      }
  
      const code = companyCodeInput.value.trim();
      if (!code) {
        companyCodeErr.textContent = "Company code is required.";
        companyCodeInput.classList.add("input-error");
        ok = false;
      } else if (!CODE_RE.test(code)) {
        companyCodeErr.textContent = "Use 2-20 uppercase letters, numbers or hyphen only.";
        companyCodeInput.classList.add("input-error");
        ok = false;
      } else {
        companyCodeErr.textContent = "";
        companyCodeInput.classList.remove("input-error");
      }
  
      const type = companyTypeSelect.value.trim();
      if (!type) {
        companyTypeErr.textContent = "Select company type.";
        companyTypeSelect.classList.add("input-error");
        ok = false;
      } else {
        companyTypeErr.textContent = "";
        companyTypeSelect.classList.remove("input-error");
      }
  
      const owner = ownerNameInput.value.trim();
      if (!owner) {
        ownerNameErr.textContent = "Owner name is required.";
        ownerNameInput.classList.add("input-error");
        ok = false;
      } else if (!OWNER_RE.test(owner)) {
        ownerNameErr.textContent = "Use 2-80 letters and spaces only.";
        ownerNameInput.classList.add("input-error");
        ok = false;
      } else {
        ownerNameErr.textContent = "";
        ownerNameInput.classList.remove("input-error");
      }
  
      const gstin = gstinInput.value.trim();
      if (!gstin) {
        gstinErr.textContent = "GSTIN is required.";
        gstinInput.classList.add("input-error");
        ok = false;
      } else if (gstin.length !== 15 || !GSTIN_RE.test(gstin)) {
        gstinErr.textContent = "Enter valid 15-character GSTIN.";
        gstinInput.classList.add("input-error");
        ok = false;
      } else {
        gstinErr.textContent = "";
        gstinInput.classList.remove("input-error");
      }
  
      const regNo = registrationInput.value.trim();
      if (regNo && !REG_RE.test(regNo)) {
        registrationErr.textContent = "Use 8-25 uppercase letters and numbers only.";
        registrationInput.classList.add("input-error");
        ok = false;
      } else {
        registrationErr.textContent = "";
        registrationInput.classList.remove("input-error");
      }
  
      const email = emailInput.value.trim();
      if (!email) {
        emailErr.textContent = "Email is required.";
        emailInput.classList.add("input-error");
        ok = false;
      } else if (!EMAIL_RE.test(email)) {
        emailErr.textContent = "Enter a valid email (e.g. name@gmail.com).";
        emailInput.classList.add("input-error");
        ok = false;
      } else {
        emailErr.textContent = "";
        emailInput.classList.remove("input-error");
      }
  
      const phone = phoneInput.value.trim();
      if (!phone) {
        phoneErr.textContent = "Phone number is required.";
        phoneInput.classList.add("input-error");
        ok = false;
      } else if (!PHONE_RE.test(phone)) {
        phoneErr.textContent = "Enter exactly 10 digits.";
        phoneInput.classList.add("input-error");
        ok = false;
      } else {
        phoneErr.textContent = "";
        phoneInput.classList.remove("input-error");
      }
  
      const website = websiteInput.value.trim();
      if (website && !WEBSITE_RE.test(website)) {
        websiteErr.textContent = "Enter a valid website (e.g. www.example.com).";
        websiteInput.classList.add("input-error");
        ok = false;
      } else {
        websiteErr.textContent = "";
        websiteInput.classList.remove("input-error");
      }
  
      const address = addressInput.value.trim();
      if (!address) {
        addressErr.textContent = "Address is required.";
        addressInput.classList.add("input-error");
        ok = false;
      } else if (!ADDRESS_RE.test(address)) {
        addressErr.textContent = "Use 10-250 letters, numbers, spaces, , . - / only.";
        addressInput.classList.add("input-error");
        ok = false;
      } else {
        addressErr.textContent = "";
        addressInput.classList.remove("input-error");
      }
  
      const city = cityInput.value.trim();
      if (!city) {
        cityErr.textContent = "City is required.";
        cityInput.classList.add("input-error");
        ok = false;
      } else if (!CITY_RE.test(city)) {
        cityErr.textContent = "Use 2-50 letters and spaces only.";
        cityInput.classList.add("input-error");
        ok = false;
      } else {
        cityErr.textContent = "";
        cityInput.classList.remove("input-error");
      }
  
      const state = stateSelect.value.trim();
      if (!state) {
        stateErr.textContent = "Select state.";
        stateSelect.classList.add("input-error");
        ok = false;
      } else if (!INDIAN_STATES.includes(state)) {
        stateErr.textContent = "Select a valid state from the list.";
        stateSelect.classList.add("input-error");
        ok = false;
      } else {
        stateErr.textContent = "";
        stateSelect.classList.remove("input-error");
      }
  
      const country = countrySelect.value.trim();
      if (!country) {
        countryErr.textContent = "Select country.";
        countrySelect.classList.add("input-error");
        ok = false;
      } else {
        countryErr.textContent = "";
        countrySelect.classList.remove("input-error");
      }
  
      const pin = pincodeInput.value.trim();
      if (!pin) {
        pincodeErr.textContent = "Pincode is required.";
        pincodeInput.classList.add("input-error");
        ok = false;
      } else if (!PIN_RE.test(pin)) {
        pincodeErr.textContent = "Enter exactly 6 digits.";
        pincodeInput.classList.add("input-error");
        ok = false;
      } else {
        pincodeErr.textContent = "";
        pincodeInput.classList.remove("input-error");
      }
  
      const branchRows = branchTableBody.querySelectorAll("tr");
      const branchNum = parseInt(branchCountInput.value, 10);
  
      if (!branchCountInput.value.trim() || !branchNum || branchNum < 1) {
        branchCountErr.textContent = "Enter number of branches.";
        branchCountInput.classList.add("input-error");
        ok = false;
      } else if (branchRows.length !== branchNum) {
        branchCountErr.textContent = "Branch table must match the number entered.";
        branchCountInput.classList.add("input-error");
        ok = false;
      } else {
        branchCountErr.textContent = "";
        branchCountInput.classList.remove("input-error");
      }
  
      let branchOk = branchRows.length > 0 && branchNum >= 1;
      branchTableBody.querySelectorAll("input, select").forEach((el) => {
        el.classList.remove("input-error");
      });
  
      branchRows.forEach((row) => {
        const bName = (row.querySelector(".branch-name")?.value || "").trim();
        const bCode = (row.querySelector(".branch-code")?.value || "").trim();
        const bPhone = (row.querySelector(".branch-phone")?.value || "").trim();
        const bCity = (row.querySelector(".branch-city")?.value || "").trim();
        const bState = (row.querySelector(".branch-state")?.value || "").trim();
  
        if (!bName) {
          row.querySelector(".branch-name")?.classList.add("input-error");
          branchOk = false;
        } else if (bName.length < 2 || bName.length > 80 || !/^[A-Za-z0-9\s.&()-]+$/.test(bName)) {
          row.querySelector(".branch-name")?.classList.add("input-error");
          branchOk = false;
        }
  
        if (bCode && !CODE_RE.test(bCode)) {
          row.querySelector(".branch-code")?.classList.add("input-error");
          branchOk = false;
        }
  
        if (bPhone && !PHONE_RE.test(bPhone)) {
          row.querySelector(".branch-phone")?.classList.add("input-error");
          branchOk = false;
        }
  
        if (bCity && !CITY_RE.test(bCity)) {
          row.querySelector(".branch-city")?.classList.add("input-error");
          branchOk = false;
        }
  
        if (bState && (bState.length < 2 || bState.length > 50 || !/^[A-Za-z\s]+$/.test(bState))) {
          row.querySelector(".branch-state")?.classList.add("input-error");
          branchOk = false;
        }
      });
  
      if (!branchOk && branchCountInput.value.trim() && branchNum >= 1 && branchRows.length === branchNum) {
        branchTableErr.textContent = "Branch Name is required. Any additional details entered must be valid.";
        ok = false;
      } else if (branchOk || !branchCountInput.value.trim() || !branchNum || branchNum < 1) {
        branchTableErr.textContent = "";
      }
  
      if (saveBtn) saveBtn.disabled = !ok;
      return ok;
    }
  
    function updateBranchNumbers() {
      const rows = branchTableBody.querySelectorAll("tr");
      rows.forEach((row, index) => {
        row.querySelector(".sl-no").textContent = index + 1;
      });
      branchCountInput.value = rows.length || "";
    }
  
    function syncSingleBranchFromContact() {
      const rows = branchTableBody.querySelectorAll("tr");
      if (rows.length !== 1) return;
      const row = rows[0];
      if (row.dataset.manualBranch === "1") return;
      row.querySelector(".branch-address").value = addressInput.value;
      row.querySelector(".branch-city").value = cityInput.value;
      row.querySelector(".branch-state").value = stateSelect.value;
      row.querySelector(".branch-phone").value = phoneInput.value;
    }
  
    function addBranchRow(data = {}) {
      if (typeof data === "string") {
        data = { branch_name: data };
      }
  
      const tr = document.createElement("tr");
      const branchStateValue = (data.state || "").trim();
      const branchStateOptions = INDIAN_STATES.map(
        (s) => `<option value="${s}"${s === branchStateValue ? " selected" : ""}>${s}</option>`
      ).join("");
      tr.innerHTML = `
        <td class="sl-no"></td>
        <td><input type="text" class="branch-name" placeholder="Branch name" maxlength="80" value="${data.branch_name || ""}"></td>
        <td><input type="text" class="branch-code" placeholder="Branch code" maxlength="20" value="${data.branch_code || ""}"></td>
        <td><input type="text" class="branch-phone" placeholder="Phone no." maxlength="10" value="${data.phone || ""}"></td>
        <td><input type="text" class="branch-address" placeholder="Address" maxlength="250" value="${data.address || ""}"></td>
        <td><input type="text" class="branch-city" placeholder="City" maxlength="50" value="${data.city || ""}"></td>
        <td>
          <select class="branch-state">
            <option value="">Select State</option>
            ${branchStateOptions}
          </select>
        </td>
        <td>
          <button type="button" class="branch-delete-btn" title="Delete" aria-label="Delete branch">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `;
  
      branchTableBody.appendChild(tr);
      updateBranchNumbers();
      syncSingleBranchFromContact();
      runLiveValidation();
    }
  
    function deleteBranchRow(button) {
      const row = button.closest("tr");
      row.remove();
      updateBranchNumbers();
      runLiveValidation();
    }
  
    function getCompanyData() {
      const branches = [];
  
      branchTableBody.querySelectorAll("tr").forEach((row) => {
        branches.push({
          branch_name: (row.querySelector(".branch-name")?.value || "").trim(),
          branch_code: (row.querySelector(".branch-code")?.value || "").trim(),
          phone: (row.querySelector(".branch-phone")?.value || "").trim(),
          address: (row.querySelector(".branch-address")?.value || "").trim(),
          city: (row.querySelector(".branch-city")?.value || "").trim(),
          state: (row.querySelector(".branch-state")?.value || "").trim(),
        });
      });
  
      return {
        company_name: companyNameInput.value.trim(),
        company_code: companyCodeInput.value.trim(),
        company_type: companyTypeSelect.value,
        owner_name: ownerNameInput.value.trim(),
        gstin: gstinInput.value.trim(),
        registration_no: registrationInput.value.trim(),
        email: emailInput.value.trim(),
        phone: phoneInput.value.trim(),
        website: websiteInput.value.trim(),
        address: addressInput.value.trim(),
        city: cityInput.value.trim(),
        state: stateSelect.value,
        country: countrySelect.value,
        pincode: pincodeInput.value.trim(),
        branches
      };
    }
  
    async function saveCompany() {
      if (!canEdit) {
        showToast("Only Super Admin can update company information.", "error");
        return;
      }
      if (!runLiveValidation()) {
        showToast("Please fix all errors before saving.", "error");
        return;
      }
  
      if (saveBtn) saveBtn.disabled = true;
  
      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(getCompanyData())
        });
  
        const result = await response.json();
  
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to save company information");
        }
  
        showToast(result.message || "Company information saved successfully");
        clearForm();
      } catch (error) {
        console.error(error);
        showToast(error.message || "Failed to save company information", "error");
      } finally {
        runLiveValidation();
      }
    }
  
    function clearForm(restore) {
      if (restore && restore.company) {
        const c = restore.company;
        companyNameInput.value = c.company_name || "";
        companyCodeInput.value = c.company_code || "";
        companyTypeSelect.value = c.company_type || "";
        ownerNameInput.value = c.owner_name || "";
        gstinInput.value = c.gstin || "";
        registrationInput.value = c.registration_no || "";
        emailInput.value = c.email || "";
        phoneInput.value = c.phone || "";
        websiteInput.value = c.website || "";
        addressInput.value = c.address || "";
        cityInput.value = c.city || "";
        stateSelect.value = c.state || "";
        countrySelect.value = c.country || "India";
        pincodeInput.value = c.pincode || "";
        const logoPreviewLoad = document.getElementById("logoPreview");
        const logoInnerLoad = document.getElementById("logoUploadInner");
        if (c.logo_url && logoPreviewLoad) {
          logoPreviewLoad.src = c.logo_url;
          logoPreviewLoad.style.display = "block";
          if (logoInnerLoad) logoInnerLoad.style.display = "none";
        }
        branchTableBody.innerHTML = "";
        const rows = restore.branches || [];
        if (rows.length) {
          branchCountInput.value = rows.length;
          rows.forEach((b) => addBranchRow(b));
        } else {
          branchCountInput.value = "";
        }
        runLiveValidation();
        return;
      }
  
      document.querySelectorAll(".company-card input:not([type='number']):not([type='file'])").forEach((el) => {
        el.value = "";
      });
  
      document.querySelectorAll(".company-card select").forEach((select) => {
        select.selectedIndex = 0;
      });
  
      document.querySelectorAll(".field-error-msg").forEach((el) => {
        el.textContent = "";
      });
  
      document.querySelectorAll(".input-error").forEach((el) => {
        el.classList.remove("input-error");
      });
  
      branchTableBody.innerHTML = "";
      branchCountInput.value = "";
  
      const logoFileEl = document.getElementById("logoFile");
      const logoPreviewEl = document.getElementById("logoPreview");
      const logoInnerEl = document.getElementById("logoUploadInner");
      if (logoFileEl) logoFileEl.value = "";
      if (logoPreviewEl) {
        logoPreviewEl.removeAttribute("src");
        logoPreviewEl.style.display = "none";
      }
      if (logoInnerEl) logoInnerEl.style.display = "";
  
      runLiveValidation();
    }
  
    companyNameInput.addEventListener("input", () => {
      companyNameInput.value = companyNameInput.value.replace(/[^A-Za-z0-9 .,&()'/-]/g, "").slice(0, 100);
      runLiveValidation();
    });
  
    companyCodeInput.addEventListener("input", () => {
      companyCodeInput.value = companyCodeInput.value.replace(/[^A-Za-z0-9-]/g, "").toUpperCase().slice(0, 20);
      runLiveValidation();
    });
  
    companyTypeSelect.addEventListener("change", runLiveValidation);
  
    ownerNameInput.addEventListener("input", () => {
      ownerNameInput.value = ownerNameInput.value.replace(/[^A-Za-z\s]/g, "").replace(/\s{2,}/g, " ").slice(0, 80);
      runLiveValidation();
    });
  
    gstinInput.addEventListener("input", () => {
      gstinInput.value = gstinInput.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 15);
      runLiveValidation();
    });
  
    registrationInput.addEventListener("input", () => {
      registrationInput.value = registrationInput.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 25);
      runLiveValidation();
    });
  
    emailInput.addEventListener("input", () => {
      emailInput.value = emailInput.value.replace(/[^A-Za-z0-9._%+\-@]/g, "").toLowerCase().slice(0, 80);
      runLiveValidation();
    });
  
    phoneInput.addEventListener("input", () => {
      phoneInput.value = phoneInput.value.replace(/\D/g, "").slice(0, 10);
      syncSingleBranchFromContact();
      runLiveValidation();
    });
  
    websiteInput.addEventListener("input", () => {
      websiteInput.value = websiteInput.value.replace(/[^A-Za-z0-9.\-/:?#&=%_]/g, "").slice(0, 100);
      runLiveValidation();
    });
  
    addressInput.addEventListener("input", () => {
      addressInput.value = addressInput.value.replace(/[^A-Za-z0-9 ,.\-/]/g, "").slice(0, 250);
      syncSingleBranchFromContact();
      runLiveValidation();
    });
  
    cityInput.addEventListener("input", () => {
      cityInput.value = cityInput.value.replace(/[^A-Za-z\s]/g, "").replace(/\s{2,}/g, " ").slice(0, 50);
      syncSingleBranchFromContact();
      runLiveValidation();
    });
  
    // Type-to-reorder for State dropdown (e.g. typing "tami" brings "Tamil Nadu" first)
    let stateTypeBuffer = "";
    let stateTypeTimer = null;
  
    const stateOriginalOptionHtmlByValue = {};
    Array.from(stateSelect.options).forEach((opt) => {
      stateOriginalOptionHtmlByValue[opt.value] = opt.outerHTML;
    });
  
    const stateOriginalOrderValues = Array.from(stateSelect.options).map((o) => o.value);
    const statePlaceholderHtml =
      stateSelect.querySelector('option[value=""]')?.outerHTML || `<option value="">Select State</option>`;
  
    stateSelect.addEventListener("keydown", (e) => {
      if (!e.key || e.key.length !== 1) return;
      if (!/^[a-zA-Z]$/.test(e.key)) return;
  
      stateTypeBuffer = (stateTypeBuffer + e.key).slice(-20).toLowerCase();
      clearTimeout(stateTypeTimer);
      stateTypeTimer = setTimeout(() => {
        stateTypeBuffer = "";
      }, 900);
  
      const currentValue = stateSelect.value;
  
      const ranked = Array.from(stateSelect.options)
        .filter((o) => (o.value || "").trim() !== "")
        .map((o) => ({ value: o.value, text: o.value.toLowerCase() }))
        .filter((x) => x.text.includes(stateTypeBuffer))
        .sort((a, b) => {
          const ai = a.text.indexOf(stateTypeBuffer);
          const bi = b.text.indexOf(stateTypeBuffer);
          if (ai !== bi) return ai - bi;
          return a.text.localeCompare(b.text);
        })
        .map((x) => x.value);
  
      if (!ranked.length) return;
  
      const remaining = stateOriginalOrderValues.filter((v) => v && !ranked.includes(v));
  
      stateSelect.innerHTML =
        statePlaceholderHtml +
        ranked.map((v) => stateOriginalOptionHtmlByValue[v]).join("") +
        remaining.map((v) => stateOriginalOptionHtmlByValue[v]).join("");
  
      stateSelect.value = currentValue;
    });
    countrySelect.addEventListener("change", runLiveValidation);
  
    pincodeInput.addEventListener("input", () => {
      pincodeInput.value = pincodeInput.value.replace(/\D/g, "").slice(0, 6);
      runLiveValidation();
    });
  
    branchTableBody.addEventListener("input", (e) => {
      const el = e.target;
      if (!el.matches("input")) return;
  
      if (
        el.classList.contains("branch-address") ||
        el.classList.contains("branch-city") ||
        el.classList.contains("branch-state") ||
        el.classList.contains("branch-phone")
      ) {
        el.closest("tr").dataset.manualBranch = "1";
      }
  
      if (el.classList.contains("branch-phone")) {
        el.value = el.value.replace(/\D/g, "").slice(0, 10);
      } else if (el.classList.contains("branch-name")) {
        el.value = el.value.replace(/[^A-Za-z0-9\s.&()-]/g, "").slice(0, 80);
      } else if (el.classList.contains("branch-code")) {
        el.value = el.value.replace(/[^A-Za-z0-9-]/g, "").toUpperCase().slice(0, 20);
      } else if (el.classList.contains("branch-city") || el.classList.contains("branch-state")) {
        el.value = el.value.replace(/[^A-Za-z\s]/g, "").replace(/\s{2,}/g, " ").slice(0, 50);
      } else if (el.classList.contains("branch-address")) {
        el.value = el.value.replace(/[^A-Za-z0-9 ,.\-/]/g, "").slice(0, 250);
      }
  
      runLiveValidation();
    });
  
    branchTableBody.addEventListener("change", (e) => {
      const el = e.target;
      if (!el.matches("select")) return;
  
      if (el.classList.contains("branch-state")) {
        el.closest("tr").dataset.manualBranch = "1";
      }
      runLiveValidation();
    });
  
    branchCountInput.addEventListener("input", () => {
      branchCountInput.value = branchCountInput.value.replace(/\D/g, "").slice(0, 2);
      const n = parseInt(branchCountInput.value, 10) || 0;
      const current = branchTableBody.querySelectorAll("tr").length;
  
      if (!n) {
        branchTableBody.innerHTML = "";
        updateBranchNumbers();
        runLiveValidation();
        return;
      }
  
      if (n > current) {
        for (let i = current; i < n; i++) {
          addBranchRow();
        }
      } else if (n < current) {
        while (branchTableBody.querySelectorAll("tr").length > n) {
          branchTableBody.lastElementChild.remove();
        }
        updateBranchNumbers();
      }
      if (n === 1) {
        const row = branchTableBody.querySelector("tr");
        if (row) row.dataset.manualBranch = "";
      }
      syncSingleBranchFromContact();
      runLiveValidation();
    });
  
    addBranchBtn.addEventListener("click", () => {
      addBranchRow();
      branchCountInput.value = branchTableBody.querySelectorAll("tr").length;
    });
  
    branchTableBody.addEventListener("click", (e) => {
      const deleteBtn = e.target.closest(".branch-delete-btn");
      if (!deleteBtn) return;
      if (branchTableBody.querySelectorAll("tr").length <= 1) {
        showToast("At least one branch is required.", "error");
        return;
      }
      deleteBranchRow(deleteBtn);
    });
  
    const logoFile = document.getElementById("logoFile");
    const logoInner = document.getElementById("logoUploadInner");
    const logoPreview = document.getElementById("logoPreview");
  
    if (logoFile) {
      logoFile.addEventListener("change", async () => {
        if (!canEdit) {
          showToast("Only Super Admin can update company information.", "error");
          logoFile.value = "";
          return;
        }
        const file = logoFile.files[0];
        if (!file) return;
  
        const lowerName = file.name.toLowerCase();
        const okExt = lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg") || lowerName.endsWith(".png");
        const okMime = file.type === "image/jpeg" || file.type === "image/png";
  
        if (!okExt || !okMime) {
          showToast("Only JPG or PNG allowed. This file type is not supported.", "error");
          logoFile.value = "";
          return;
        }
  
        if (file.size > 2 * 1024 * 1024) {
          showToast("Logo must be 2MB or smaller.", "error");
          logoFile.value = "";
          return;
        }
  
        const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
        const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
        const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
        const isWebp =
          head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
          head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;
  
        if (isWebp || (!isJpeg && !isPng)) {
          showToast("Only JPG or PNG allowed. Save the image as JPG/PNG and try again.", "error");
          logoFile.value = "";
          return;
        }
  
        try {
          const fd = new FormData();
          fd.append("file", file);
          const code = (companyCodeInput?.value || "").trim();
          if (code) fd.append("company_code", code);
          const res = await fetch("/api/company-information/logo", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok || !data.success) {
            showToast(data.message || "Logo upload failed", "error");
            logoFile.value = "";
            return;
          }
          if (logoPreview) {
            logoPreview.src = data.url || URL.createObjectURL(file);
            logoPreview.style.display = "block";
          }
          if (logoInner) logoInner.style.display = "none";
          showToast("Logo uploaded");
        } catch (err) {
          showToast("Logo upload failed. Please try again.", "error");
          logoFile.value = "";
        }
      });
    }
  
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.addEventListener("click", saveCompany);
    }
  
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        if (!canEdit) {
          window.history.back();
          return;
        }
        clearForm();
      });
    }

    loadCompanyInformation();
  });
  
