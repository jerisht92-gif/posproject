document.addEventListener("DOMContentLoaded", () => {

    /* ================= ELEMENTS ================= */
    const form = document.getElementById("customerForm");
    const submitBtn = form?.querySelector('button[type="submit"]');
    const firstName = document.getElementById("firstName");
    const lastName  = document.getElementById("lastName");
    const company = document.getElementById("company");
    const email     = document.getElementById("email");
    const phone     = document.getElementById("phoneNumber");
    const pinInput  = document.querySelector('input[name="zipCode"]');
    const streetInput = document.querySelector('input[name="street"]');
    const cityInput=document.querySelector('input[name="city"]')
    const customerIdInput = document.getElementById("customerId");
    const stateInput=document.querySelector('input[name="state"]')
    const countryInput=document.querySelector('input[name="country"]')
    const billingAddressInput=document.querySelector('input[name="billingAddress"]')
    const shippingAddressInput=document.querySelector('input[name="shippingAddress"]')
    const addressInput=document.querySelector('input[name="address"]')
    const customerTypeInput = document.getElementById("customerType");
    const customerStatusInput = document.getElementById("customerStatus");
    const salesRepInput = document.getElementById("salesRep");
    const paymentTermsInput = document.getElementById("paymentTerms");
    const creditTermInput = document.getElementById("creditTerm");
    const taxIdInput = document.querySelector('input[name="gstNumber"]');
    const creditLimitInput = document.getElementById("creditLimit");
    const salesRepCustomInput = document.getElementById("salesRepCustom");
    const paymentTermsCustomInput = document.getElementById("paymentTermsCustom");
    const creditTermCustomInput = document.getElementById("creditTermCustom");
  
    /* ================= DISCARD ================= */
    document.getElementById("discardBtn").addEventListener("click", () => {
      window.location.href = "/customer";
    });
  
  // HELPER FUNCTION
  
  function scrollToField(input) {
    input.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
    input.focus();
  }
  
  // ================= CUSTOM INPUT =================
  // function inlineCustom(selectId, inputId) {
  //   const select = document.getElementById(selectId);
  //   const input  = document.getElementById(inputId);
  
  //   // when "+ Custom" selected
  //   select.addEventListener("change", () => {
  //     if (select.value === "custom") {
  //       select.style.display = "none";
  //       input.style.display = "block";
  
  //       input.value = "custom";
  //       input.focus();
  //     }
  //   });
  
  //   // save on blur or Enter
  //   async function saveCustomValue() {
  //     const value = input.value.trim();
  //     if (!value) {
  //       input.style.display = "none";
  //       select.style.display = "block";
  //       select.value = "";
  //       return;
  //     }
  
  //     // prevent duplicates
  //     let option = [...select.options].find(
  //       o => o.value.toLowerCase() === value.toLowerCase()
  //     );
  
  //     if (!option) {
  //       option = new Option(value, value);
  //       select.add(option);
  
  //       await fetch("/api/custom-dropdowns", {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({
  //           field: select.id === "paymentTerms" ? "paymentTerms" : "creditTerms",
  //           value
  //         })
  //       });
  //     }
  
  //     select.value = value;
  //     input.style.display = "none";
  //     select.style.display = "block";
  //   }
  
  //   input.addEventListener("blur", saveCustomValue);
  //   input.addEventListener("keydown", e => {
  //     if (e.key === "Enter") {
  //       e.preventDefault();
  //       saveCustomValue();
  //     }
  //   });
  // }
  
  
  
  
  
  function inlineCustom(selectId, inputId) {
    const select = document.getElementById(selectId);
    const input  = document.getElementById(inputId);
  
    select.addEventListener("change", () => {
      if (select.value === "custom") {
        select.style.display = "none";
        input.style.display = "block";
        input.value = "custom";
        input.focus();
      }
    });
  
    async function saveCustomValue() {
      const value = input.value.trim();
  
      if (!value) {
        input.style.display = "none";
        select.style.display = "block";
        select.value = "";
        return;
      }
  
      let option = [...select.options].find(
        o => o.value.toLowerCase() === value.toLowerCase()
      );
  
      if (!option) {
        option = new Option(value, value);
        select.add(option);
      }
  
      select.value = value;
      input.style.display = "none";
      select.style.display = "block";
    }
  
    input.addEventListener("blur", saveCustomValue);
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveCustomValue();
      }
    });
  }
  
  
  // INIT
  inlineCustom("paymentTerms", "paymentTermsCustom");
  inlineCustom("creditTerm", "creditTermCustom");
  inlineCustom("salesRep", "salesRepCustom"); // ✅ ADD THIS
  
  
  
  //After refersh dropdown show
  
  
  // async function loadCustomDropdowns() {
  //   const res = await fetch("/api/custom-dropdowns");
  //   const data = await res.json();
  
  //   data.paymentTerms.forEach(v => {
  //     if (![...paymentTermsInput.options].some(o => o.value === v)) {
  //       paymentTermsInput.add(new Option(v, v));
  //     }
  //   });
  
  //   data.creditTerms.forEach(v => {
  //     if (![...creditTermInput.options].some(o => o.value === v)) {
  //       creditTermInput.add(new Option(v, v));
  //     }
  //   });
  // }
  
  // ================= LOAD DROPDOWNS FROM CUSTOMER DB =================
  function addOptionIfMissing(select, value) {
    if (!select) return;
    const val = (value || "").trim();
    if (!val) return;

    // Explicitly block deprecated sales rep "Jerry"
    if (select.id === "salesRep" && val.toLowerCase() === "jerry") {
      return;
    }

    const exists = [...select.options].some(
      (o) => (o.value || o.textContent || "").trim().toLowerCase() === val.toLowerCase()
    );
    if (exists) return;

    const opt = new Option(val, val);

    // For Sales Rep: keep "+ Custom" directly under "Select Sales Rep",
    // so append all real values AFTER "+ Custom".
    if (select.id === "salesRep") {
      select.add(opt);
      return;
    }

    // For other dropdowns (Payment Terms, Credit Term), insert before "+ Custom"
    // so custom stays at the bottom.
    const customIndex = [...select.options].findIndex((o) => o.value === "custom");
    if (customIndex >= 0) {
      select.add(opt, select.options[customIndex]);
    } else {
      select.add(opt);
    }
  }
async function loadDropdownsFromCustomerJson() {
  try {
    const res = await fetch("/api/customers"); // ✅ FIXED
    const payload = await res.json();

    let customers = [];

    if (payload && payload.customers) {
      customers = payload.customers;
    }

    customers.forEach((c) => {
      addOptionIfMissing(customerTypeInput, c.customer_type);
      addOptionIfMissing(salesRepInput, c.sales_rep || "");
      addOptionIfMissing(paymentTermsInput, c.payment_terms || "");
      addOptionIfMissing(creditTermInput, c.credit_term || "");
    });

  } catch (e) {
    console.error("❌ Error loading customers:", e);
  }
}
  // Load all dropdown options from existing customer records.
  loadDropdownsFromCustomerJson();

  function showSuccessNotification(message) {
    const existing = document.querySelector(".success-notification");
    if (existing) existing.remove();

    if (!document.body) return;

    const notification = document.createElement("div");
    notification.className = "success-notification";
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("show");
    }, 10);

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
    const existingSuccess = document.querySelector(".success-notification");
    const existingError = document.querySelector(".error-notification");
    if (existingSuccess) existingSuccess.remove();
    if (existingError) existingError.remove();

    if (!document.body) return;

    const notification = document.createElement("div");
    notification.className = "error-notification";
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("show");
    }, 10);

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 400);
    }, 3000);
    }
  
    /* ================= CUSTOMER ID ================= */
    async function fetchCustomerId() {
      try {
        const res = await fetch("/api/customers/master-id");
        const data = await res.json();
        customerIdInput.value = data.customerId || "C001";
      } catch {
        customerIdInput.value = "C001";
      }
    }
    fetchCustomerId();
  
    /* ================= ERROR HELPERS (match Product edit modal) ================= */
    function setFieldError(input, message) {
      if (!input) return;
    const error = input.closest(".form-group")?.querySelector(".error-text");
      if (error) {
        error.textContent = message || "";
        error.style.display = message ? "block" : "none";
      }
      if (message) input.classList.add("input-error");
      else input.classList.remove("input-error");
    }

    function clearFieldError(input) {
      setFieldError(input, "");
    }

    const showError = setFieldError;
    const clearError = clearFieldError;

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const gstPattern =
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

    function selectEffectiveValue(selectEl, customEl) {
      if (!selectEl) return "";
      const v = (selectEl.value || "").trim();
      if (v === "custom") {
        return (customEl && (customEl.value || "").trim()) || "";
      }
      return v;
    }

    function validateFirstNameLive() {
      const v = (firstName?.value || "").trim();
      if (!v) {
        setFieldError(firstName, "First name is required.");
        return false;
      }
      if (v.length < 3) {
        setFieldError(firstName, "First name must be at least 3 characters.");
        return false;
      }
      clearFieldError(firstName);
      return true;
    }

    function validateLastNameLive() {
      const v = (lastName?.value || "").trim();
      if (!v) {
        setFieldError(lastName, "Last name is required.");
        return false;
      }
      if (v.length < 2) {
        setFieldError(lastName, "Last name must be at least 2 characters.");
        return false;
      }
      clearFieldError(lastName);
      return true;
    }

    function validateCompanyLive() {
      const v = (company?.value || "").trim();
      if (!v) {
        setFieldError(company, "Company is required.");
        return false;
      }
      if (v.length < 3) {
        setFieldError(company, "Company must be at least 3 characters.");
        return false;
      }
      clearFieldError(company);
      return true;
    }

    function validateEmailLive(forBlur) {
      const v = (email?.value || "").trim();
      if (!v) {
        setFieldError(email, "Email is required.");
        return false;
      }
      if (!forBlur && (!v.includes("@") || v.endsWith("@"))) {
        clearFieldError(email);
        return true;
      }
      if (!emailPattern.test(v)) {
        setFieldError(email, "Enter a valid email address.");
        return false;
      }
      clearFieldError(email);
      return true;
    }

    function validatePhoneLive() {
      const d = (phone?.value || "").replace(/\D/g, "");
      if (!d) {
        setFieldError(phone, "Phone number is required.");
        return false;
      }
      if (d.length !== 10) {
        setFieldError(phone, "Phone number must be exactly 10 digits.");
        return false;
      }
      clearFieldError(phone);
      return true;
    }

    function validateCustomerTypeLive() {
      if (!customerTypeInput?.value) {
        setFieldError(customerTypeInput, "Please select customer type.");
        return false;
      }
      clearFieldError(customerTypeInput);
      return true;
    }

    function validateCustomerStatusLive() {
      if (!customerStatusInput?.value) {
        setFieldError(customerStatusInput, "Please select customer status.");
        return false;
      }
      clearFieldError(customerStatusInput);
      return true;
    }

    function validateSalesRepLive() {
      if (!salesRepInput?.value) {
        setFieldError(salesRepInput, "Please select a sales rep.");
        return false;
      }
      if (salesRepInput.value === "custom") {
        const cv = (salesRepCustomInput?.value || "").trim();
        if (!cv || cv.length < 2) {
          setFieldError(
            salesRepCustomInput || salesRepInput,
            "Enter a sales rep name (min 2 characters)."
          );
          return false;
        }
        clearFieldError(salesRepCustomInput);
      } else if (salesRepCustomInput) {
        clearFieldError(salesRepCustomInput);
      }
      clearFieldError(salesRepInput);
      return true;
    }

    function validatePaymentTermsLive() {
      if (!paymentTermsInput?.value) {
        setFieldError(paymentTermsInput, "Please select payment terms.");
        return false;
      }
      if (paymentTermsInput.value === "custom") {
        const cv = (paymentTermsCustomInput?.value || "").trim();
        if (!cv || cv.length < 2) {
          setFieldError(
            paymentTermsCustomInput || paymentTermsInput,
            "Enter payment terms (min 2 characters)."
          );
          return false;
        }
        clearFieldError(paymentTermsCustomInput);
      } else if (paymentTermsCustomInput) {
        clearFieldError(paymentTermsCustomInput);
      }
      clearFieldError(paymentTermsInput);
      return true;
    }

    function validateCreditTermLive() {
      if (!creditTermInput?.value) {
        setFieldError(creditTermInput, "Please select credit term.");
        return false;
      }
      if (creditTermInput.value === "custom") {
        const cv = (creditTermCustomInput?.value || "").trim();
        if (!cv || cv.length < 2) {
          setFieldError(
            creditTermCustomInput || creditTermInput,
            "Enter credit term (min 2 characters)."
          );
          return false;
        }
        clearFieldError(creditTermCustomInput);
      } else if (creditTermCustomInput) {
        clearFieldError(creditTermCustomInput);
      }
      clearFieldError(creditTermInput);
      return true;
    }

    function validateRequiredTextInput(input, label, minLen, maxLen) {
      const v = (input?.value || "").trim();
      if (!v) {
        setFieldError(input, `${label} is required.`);
        return false;
      }
      if (minLen != null && v.length < minLen) {
        setFieldError(
          input,
          `${label} must be at least ${minLen} character${minLen === 1 ? "" : "s"}.`
        );
        return false;
      }
      if (maxLen != null && v.length > maxLen) {
        setFieldError(input, `${label} must be at most ${maxLen} characters.`);
        return false;
      }
      clearFieldError(input);
      return true;
    }

    function validateZipLive() {
      const d = (pinInput?.value || "").replace(/\D/g, "");
      if (!d) {
        setFieldError(pinInput, "Zip code is required.");
        return false;
      }
      if (d.length !== 6) {
        setFieldError(pinInput, "Zip code must be exactly 6 digits.");
        return false;
      }
      clearFieldError(pinInput);
      return true;
    }

    function validateTaxIdLive() {
      const v = (taxIdInput?.value || "").trim();
      if (!v) {
        setFieldError(taxIdInput, "Tax ID / GST is required.");
        return false;
      }
      if (!gstPattern.test(v)) {
        setFieldError(taxIdInput, "Enter a valid 15-character GST number.");
        return false;
      }
      clearFieldError(taxIdInput);
      return true;
    }

    function validateCreditLimitLive() {
      const raw = (creditLimitInput?.value || "").trim();
      if (!raw) {
        setFieldError(creditLimitInput, "Credit limit is required.");
        return false;
      }
      const n = Number(raw);
      if (isNaN(n) || n <= 0 || n > 10000000) {
        setFieldError(
          creditLimitInput,
          "Enter a valid credit limit (1 – 10,000,000)."
        );
        return false;
      }
      clearFieldError(creditLimitInput);
      return true;
    }

    function formPassesAllChecks() {
      const sr = selectEffectiveValue(salesRepInput, salesRepCustomInput);
      const pt = selectEffectiveValue(paymentTermsInput, paymentTermsCustomInput);
      const ct = selectEffectiveValue(creditTermInput, creditTermCustomInput);

      return (
        allMandatoryNonSelectFieldsComplete() &&
        !!customerTypeInput?.value &&
        !!customerStatusInput?.value &&
        !!salesRepInput?.value &&
        (salesRepInput.value !== "custom" || sr.length >= 2) &&
        !!paymentTermsInput?.value &&
        (paymentTermsInput.value !== "custom" || pt.length >= 2) &&
        !!creditTermInput?.value &&
        (creditTermInput.value !== "custom" || ct.length >= 2)
      );
    }

    /**
     * Dropdown live errors only after every mandatory non-select field is valid
     * (same rules as full form, excluding the five required selects).
     */
    function allMandatoryNonSelectFieldsComplete() {
      const fn = (firstName?.value || "").trim();
      const ln = (lastName?.value || "").trim();
      const em = (email?.value || "").trim();
      const ph = (phone?.value || "").replace(/\D/g, "");
      const cr = (creditLimitInput?.value || "").trim();
      const crNum = Number(cr);

      return (
        fn.length >= 3 &&
        ln.length >= 2 &&
        (company?.value || "").trim().length >= 3 &&
        emailPattern.test(em) &&
        ph.length === 10 &&
        (streetInput?.value || "").trim().length >= 1 &&
        (streetInput?.value || "").trim().length <= 40 &&
        (cityInput?.value || "").trim().length >= 1 &&
        (cityInput?.value || "").trim().length <= 20 &&
        (stateInput?.value || "").trim().length >= 1 &&
        (stateInput?.value || "").trim().length <= 20 &&
        (countryInput?.value || "").trim().length >= 1 &&
        (countryInput?.value || "").trim().length <= 20 &&
        (pinInput?.value || "").replace(/\D/g, "").length === 6 &&
        (addressInput?.value || "").trim().length >= 1 &&
        (addressInput?.value || "").trim().length <= 100 &&
        (billingAddressInput?.value || "").trim().length >= 1 &&
        (billingAddressInput?.value || "").trim().length <= 100 &&
        (shippingAddressInput?.value || "").trim().length >= 1 &&
        (shippingAddressInput?.value || "").trim().length <= 100 &&
        gstPattern.test((taxIdInput?.value || "").trim()) &&
        !!cr &&
        !isNaN(crNum) &&
        crNum > 0 &&
        crNum <= 10000000
      );
    }

    function validateAllDropdownsLive() {
      validateCustomerTypeLive();
      validateCustomerStatusLive();
      validateSalesRepLive();
      validatePaymentTermsLive();
      validateCreditTermLive();
    }

    function clearAllDropdownFieldErrors() {
      [
        customerTypeInput,
        customerStatusInput,
        salesRepInput,
        paymentTermsInput,
        creditTermInput,
      ].forEach((el) => {
        if (el) clearFieldError(el);
      });
      [salesRepCustomInput, paymentTermsCustomInput, creditTermCustomInput].forEach(
        (el) => {
          if (el) clearFieldError(el);
        }
      );
    }

    function updateSubmitButtonState() {
      if (!submitBtn) return;
      if (allMandatoryNonSelectFieldsComplete()) {
        validateAllDropdownsLive();
      } else {
        clearAllDropdownFieldErrors();
      }
      submitBtn.disabled = !formPassesAllChecks();
    }

    function runAllLiveValidators() {
      validateFirstNameLive();
      validateLastNameLive();
      validateCompanyLive();
      validateEmailLive(true);
      validatePhoneLive();
      validateCustomerTypeLive();
      validateCustomerStatusLive();
      validateSalesRepLive();
      validatePaymentTermsLive();
      validateCreditTermLive();
      validateRequiredTextInput(streetInput, "Street", 1, 40);
      validateRequiredTextInput(cityInput, "City", 1, 20);
      validateRequiredTextInput(stateInput, "State", 1, 20);
      validateRequiredTextInput(countryInput, "Country", 1, 20);
      validateZipLive();
      validateRequiredTextInput(addressInput, "Address", 1, 100);
      validateRequiredTextInput(billingAddressInput, "Billing address", 1, 100);
      validateRequiredTextInput(shippingAddressInput, "Shipping address", 1, 100);
      validateTaxIdLive();
      validateCreditLimitLive();
      updateSubmitButtonState();
    }
  
    const availableLimitInput = document.getElementById("availableLimit");

    /* ================= INPUT SANITIZE + LIVE VALIDATION (Product-style) ================= */
    if (firstName) {
      firstName.addEventListener("input", () => {
        firstName.value = firstName.value.replace(/[^A-Za-z ]/g, "").slice(0, 20);
        validateFirstNameLive();
        updateSubmitButtonState();
      });
      firstName.addEventListener("blur", () => {
        validateFirstNameLive();
        updateSubmitButtonState();
      });
    }

    if (lastName) {
      lastName.addEventListener("input", () => {
        lastName.value = lastName.value.replace(/[^A-Za-z ]/g, "").slice(0, 20);
        validateLastNameLive();
        updateSubmitButtonState();
      });
      lastName.addEventListener("blur", () => {
        validateLastNameLive();
        updateSubmitButtonState();
      });
    }

    if (company) {
      company.addEventListener("input", () => {
        company.value = company.value
          .replace(/[^A-Za-z0-9 &.,'()\/-]/g, "")
          .slice(0, 50);
        validateCompanyLive();
        updateSubmitButtonState();
      });
      company.addEventListener("blur", () => {
        validateCompanyLive();
        updateSubmitButtonState();
      });
    }

    if (phone) {
      phone.addEventListener("input", () => {
        phone.value = phone.value.replace(/\D/g, "").slice(0, 10);
        validatePhoneLive();
        updateSubmitButtonState();
      });
      phone.addEventListener("blur", () => {
        validatePhoneLive();
        updateSubmitButtonState();
      });
    }

    if (email) {
      email.addEventListener("input", () => {
        validateEmailLive(false);
        updateSubmitButtonState();
      });
      email.addEventListener("blur", () => {
        validateEmailLive(true);
        updateSubmitButtonState();
      });
    }

    document
      .querySelectorAll(
        'input[name="address"], input[name="billingAddress"], input[name="shippingAddress"]'
      )
      .forEach((input) => {
        input.addEventListener("input", () => {
          if (input.value.length > 100) input.value = input.value.slice(0, 100);
          const label =
            input.name === "billingAddress"
              ? "Billing address"
              : input.name === "shippingAddress"
              ? "Shipping address"
              : "Address";
          validateRequiredTextInput(input, label, 1, 100);
          updateSubmitButtonState();
        });
        input.addEventListener("blur", () => {
          const label =
            input.name === "billingAddress"
              ? "Billing address"
              : input.name === "shippingAddress"
              ? "Shipping address"
              : "Address";
          validateRequiredTextInput(input, label, 1, 100);
          updateSubmitButtonState();
        });
      });

    document
      .querySelectorAll('input[name="city"], input[name="state"], input[name="country"]')
      .forEach((input) => {
        input.addEventListener("input", () => {
          input.value = input.value.replace(/[^A-Za-z ]/g, "").slice(0, 20);
          const label =
            input.name === "city"
              ? "City"
              : input.name === "state"
              ? "State"
              : "Country";
          validateRequiredTextInput(input, label, 1, 20);
          updateSubmitButtonState();
        });
        input.addEventListener("blur", () => {
          const label =
            input.name === "city"
              ? "City"
              : input.name === "state"
              ? "State"
              : "Country";
          validateRequiredTextInput(input, label, 1, 20);
          updateSubmitButtonState();
        });
      });

    if (streetInput) {
  streetInput.addEventListener("input", () => {
    streetInput.value = streetInput.value.replace(/[^A-Za-z0-9 \/.-]/g, "");
    if (streetInput.value.length > 40) {
            streetInput.value = streetInput.value.slice(0, 40);
    }
        validateRequiredTextInput(streetInput, "Street", 1, 40);
        updateSubmitButtonState();
  });
  streetInput.addEventListener("blur", () => {
        validateRequiredTextInput(streetInput, "Street", 1, 40);
        updateSubmitButtonState();
      });
    }

    if (pinInput) {
      pinInput.addEventListener("input", () => {
        pinInput.value = pinInput.value.replace(/\D/g, "").slice(0, 6);
        validateZipLive();
        updateSubmitButtonState();
      });
  pinInput.addEventListener("blur", () => {
        validateZipLive();
        updateSubmitButtonState();
      });
    }

    if (taxIdInput) {
  taxIdInput.addEventListener("input", () => {
        taxIdInput.value = taxIdInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (taxIdInput.value.length > 15) {
            taxIdInput.value = taxIdInput.value.slice(0, 15);
    }
        validateTaxIdLive();
        updateSubmitButtonState();
  });
  taxIdInput.addEventListener("blur", () => {
        validateTaxIdLive();
        updateSubmitButtonState();
      });
    }

    if (creditLimitInput && availableLimitInput) {
  creditLimitInput.addEventListener("input", () => {
    let value = creditLimitInput.value.replace(/\D/g, "");
        value = value.replace(/^0+/, "") || "";
        if (value.length > 8) value = value.slice(0, 8);
    creditLimitInput.value = value;
    availableLimitInput.value = value ? value : "";
        validateCreditLimitLive();
        updateSubmitButtonState();
  });
  creditLimitInput.addEventListener("blur", () => {
        validateCreditLimitLive();
        updateSubmitButtonState();
  });
    }
  
  //email duplicate (compatible with new /api/customer response)
  async function emailAlreadyExists(emailValue) {
    const res = await fetch("/api/customers");
    const payload = await res.json();

    let customers = [];
    if (Array.isArray(payload)) {
      // Old format: plain array
      customers = payload;
    } else if (payload && payload.data && Array.isArray(payload.data.items)) {
      // New format: { success, data: { items: [...] } }
      customers = payload.data.items;
    }

    return customers.some(
      (c) => c.email && String(c.email).toLowerCase() === emailValue.toLowerCase()
    );
  }
  
  
  customerTypeInput.addEventListener("change", () => {
    validateCustomerTypeLive();
    updateSubmitButtonState();
  });
  
  customerStatusInput.addEventListener("change", () => {
    validateCustomerStatusLive();
    updateSubmitButtonState();
  });
  
  salesRepInput.addEventListener("change", () => {
    validateSalesRepLive();
    updateSubmitButtonState();
  });
  
  paymentTermsInput.addEventListener("change", () => {
    validatePaymentTermsLive();
    updateSubmitButtonState();
  });
  
  creditTermInput.addEventListener("change", () => {
    validateCreditTermLive();
    updateSubmitButtonState();
  });

  [
    customerTypeInput,
    customerStatusInput,
    salesRepInput,
    paymentTermsInput,
    creditTermInput,
  ].forEach((sel) => {
    if (!sel) return;
    sel.addEventListener("blur", () => updateSubmitButtonState());
  });

  [salesRepCustomInput, paymentTermsCustomInput, creditTermCustomInput].forEach(
    (el) => {
      if (!el) return;
      el.addEventListener("input", () => {
        validateSalesRepLive();
        validatePaymentTermsLive();
        validateCreditTermLive();
        updateSubmitButtonState();
      });
      el.addEventListener("blur", () => {
        validateSalesRepLive();
        validatePaymentTermsLive();
        validateCreditTermLive();
        updateSubmitButtonState();
      });
    }
  );
  
    /* ================= SUBMIT ================= */
    function resetSubmitBtn() {
      if (!submitBtn) return;
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtn.dataset.originalText || "Submit";
      delete submitBtn.dataset.originalText;
    }
    
    // Initialize button as disabled
    if (submitBtn) {
      submitBtn.disabled = true;
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
  
      runAllLiveValidators();

      if (!formPassesAllChecks()) {
        const order = [
          firstName,
          lastName,
          company,
          email,
          phone,
          customerTypeInput,
          customerStatusInput,
          salesRepInput,
          salesRepCustomInput,
          paymentTermsInput,
          paymentTermsCustomInput,
          creditTermInput,
          creditTermCustomInput,
          addressInput,
          streetInput,
          cityInput,
          stateInput,
          countryInput,
          pinInput,
          billingAddressInput,
          shippingAddressInput,
      taxIdInput,
          creditLimitInput,
        ];
        const firstBad = order.find((el) => el && el.classList.contains("input-error"));
        if (firstBad) scrollToField(firstBad);
        return;
      }

      // Disable submit like Add Product button
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.textContent = "Saving...";
      }

      // ✅ Directly proceed to save (no Confirm Save popup)
      handleSave();
    });
  
  async function handleSave() {
    //Duplicate Email Id
    const emailValue = email.value.trim();
  
    const exists = await emailAlreadyExists(emailValue);
    if (exists) {
      showError(email, "Email already exists");
      scrollToField(email);
      resetSubmitBtn();
      return;
    }
  
    //GST / tax Id duplicate
    const gstValue = taxIdInput.value.trim().toUpperCase();
  
    if (gstValue) {
      const res = await fetch("/api/customers");
      const payload = await res.json();
  
      let customers = [];
      if (Array.isArray(payload)) {
        customers = payload;
      } else if (payload && payload.data && Array.isArray(payload.data.items)) {
        customers = payload.data.items;
      }
  
      const gstExists = customers.some((c) => {
        const gst =
          (c.get && c.get("gstNumber")) ||
          c.gstNumber ||
          c.gst_id ||
          c.gst ||
          "";
        return String(gst).toUpperCase() === gstValue;
      });
  
      if (gstExists) {
        showError(taxIdInput, "GST / Tax ID already exists");
        taxIdInput.focus();
  
        taxIdInput.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        resetSubmitBtn();
        return; // ⛔ STOP SAVE
      }
    }
  
    const formData = Object.fromEntries(new FormData(form).entries());
    delete formData.customerId;
  
    console.log("Saving customer:", formData);
  
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
  
      const result = await res.json();
  
      if (!res.ok) {
        // 🔴 Error message (same style as Add New Product)
        const errMsg =
          result.message ||
          result.error ||
          "❌ Customer could not be created. Please check the details and try again.";
  
        showErrorNotification(errMsg);
        resetSubmitBtn();
        return;
      }
  
      const newId = result.customerId || result.customer_id || customerIdInput.value;
      const successMsg = newId
        ? `Customer has been created successfully (ID: ${newId})`
        : "Customer has been created successfully.";
      try {
        window.sessionStorage.setItem(
          "customerMasterRedirectToast",
          JSON.stringify({ message: successMsg })
        );
      } catch (_) {}
      window.location.href = "/customer";
    } catch (err) {
      console.error("❌ Error saving customer:", err);
      showErrorNotification("❌ Customer could not be created. Please try again.");
      resetSubmitBtn();
    }
  }
  
  });