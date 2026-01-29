document.addEventListener("DOMContentLoaded", () => {

    /* ================= ELEMENTS ================= */
    const form = document.getElementById("customerForm");
    const firstName = document.getElementById("firstName");
    const lastName  = document.getElementById("lastName");
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

    // ✅ Success modal + toast (same pattern as Create New Product)
    const successModal      = document.getElementById("customerSuccessModal");
    const successMessage    = document.getElementById("customerSuccessMessage");
    const successOkBtn      = document.getElementById("customerSuccessOkBtn");
    let successRedirectUrl  = null;
  
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
  
        await fetch("/api/custom-dropdowns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            field:
              select.id === "paymentTerms"
                ? "paymentTerms"
                : select.id === "creditTerm"
                ? "creditTerms"
                : "salesReps",
            value
          })
        });
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
  
  // ================= LOAD DROPDOWNS FROM customer.json + custom-dropdowns =================
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
      const res = await fetch("/api/customer?page_size=1000");
      const payload = await res.json();

      let customers = [];
      if (Array.isArray(payload)) {
        customers = payload;
      } else if (payload && payload.data && Array.isArray(payload.data.items)) {
        customers = payload.data.items;
      }

      customers.forEach((c) => {
        addOptionIfMissing(customerTypeInput, c.customer_type || c.company_type);
        addOptionIfMissing(salesRepInput, c.sales_rep);
        addOptionIfMissing(paymentTermsInput, c.paymentTerms);
        addOptionIfMissing(creditTermInput, c.creditTerm);
      });
    } catch (e) {
      console.error("❌ Error loading dropdowns from customer.json:", e);
    }
  }

  async function loadCustomDropdowns() {
    try {
      const res = await fetch("/api/custom-dropdowns");
      const data = await res.json();

      if (data.paymentTerms) {
        data.paymentTerms.forEach((v) => addOptionIfMissing(paymentTermsInput, v));
      }

      if (data.creditTerms) {
        data.creditTerms.forEach((v) => addOptionIfMissing(creditTermInput, v));
      }

      if (data.salesReps && salesRepInput) {
        data.salesReps.forEach((v) => addOptionIfMissing(salesRepInput, v));
      }
    } catch (e) {
      console.error("❌ Error loading custom dropdowns:", e);
    }
  }

  // First load values from existing customers, then merge any saved custom values
  loadDropdownsFromCustomerJson().then(loadCustomDropdowns);

  /* ================= SUCCESS MODAL + TOAST HELPERS ================= */
  function showSuccessModal(message, redirectUrl = null) {
    if (!successModal) {
      alert(message);
      if (redirectUrl) window.location.href = redirectUrl;
      return;
    }

    successRedirectUrl = redirectUrl;

    if (successMessage) {
      successMessage.textContent = message;
    }

    successModal.classList.add("show");
    if (successOkBtn) {
      successOkBtn.focus();
    }
  }

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

    /* ================= SUCCESS OK BUTTON HANDLER ================= */
    if (successOkBtn) {
      successOkBtn.addEventListener("click", () => {
        if (successModal) {
          successModal.classList.remove("show");
        }
        if (successRedirectUrl) {
          const target = successRedirectUrl;
          successRedirectUrl = null;
          window.location.href = target;
        }
      });
    }
  
    /* ================= CUSTOMER ID ================= */
    async function fetchCustomerId() {
      try {
        const res = await fetch("/api/customers/master-id");
        const data = await res.json();
        customerIdInput.value = data.customerId || "C101";
      } catch {
        customerIdInput.value = "C101";
      }
    }
    fetchCustomerId();
  
    /* ================= ERROR HELPERS ================= */
  function showError(input, message) {
    const error = input.closest(".form-group")?.querySelector(".error-text");
    if (!error) return;
  
    error.textContent = message;
    error.style.display = "block";
    input.classList.add("input-error");
  }
  
    function clearError(input) {
      const error = input.closest(".form-group").querySelector(".error-text");
      if (error) {
        error.textContent = "";
        error.style.display = "none";
      }
    }
  
    /* ================= INPUT RULES ================= */
    firstName.addEventListener("input", () => {
      firstName.value = firstName.value.replace(/[^A-Za-z ]/g, "").slice(0, 20);
      clearError(firstName);
    });
  
    lastName.addEventListener("input", () => {
      lastName.value = lastName.value.replace(/[^A-Za-z ]/g, "").slice(0, 20);
      clearError(lastName);
    });
  
    phone.addEventListener("input", () => {
      phone.value = phone.value.replace(/\D/g, "");
      
    if (phone.value.length > 10) {
            phone.value = phone.value.slice(0, 10);
  
      showError(phone, "Exactly 10 Number Allow");
    } else {
      clearError(phone);
    }
    
  phone.addEventListener("blur", () => {
    if (phone.value.length === 10) {
      clearError(phone);
    }
  
  });
    });
  
    email.addEventListener("input", () => clearError(email));
  
    /* ================= ADDRESS LIMIT (50 chars) ================= */
  document.querySelectorAll(
    'input[name="address"], input[name="billingAddress"], input[name="shippingAddress"]'
  ).forEach(input => {
  
    // prevent typing more than 50 chars
    input.addEventListener("input", () => {
      if (input.value.length > 100) {
        input.value = input.value.slice(0, 100);
                    showError(input, "Minimum 100 characters required");
  
      }
      else{
      clearError(input);
      }
    });
  
    
  input.addEventListener("blur", () => {
    if (input.value.length === 100) {
      clearError(input);
    }
  
  });
  
  });                                                                                                                                                                                      
  
  /* ================= CITY / STATE / COUNTRY ================= */
  document.querySelectorAll(
    'input[name="city"], input[name="state"], input[name="country"]'
  ).forEach(input => {
    input.addEventListener("input", () => {
      // allow only letters and space
      input.value = input.value.replace(/[^A-Za-z ]/g, "");
  
      // limit to 20 characters
      if (input.value.length > 20) {
        input.value = input.value.slice(0, 20);
              showError(input, "Minimum 20 characters required");
  
        
      }
      else{
  
      clearError(input);
      }
  
    });
  
    
  input.addEventListener("blur", () => {
    if (input.value.length === 20) {
      clearError(input);
    }
  
  });
  });
  
  
  // STREET
  
  streetInput.addEventListener("input", () => {
    // allow letters, numbers, space, /, ., -
    streetInput.value = streetInput.value.replace(/[^A-Za-z0-9 \/.-]/g, "");
  
    if (streetInput.value.length > 40) {
            streetInput.value = streetInput.value.slice(0, 40);
  
      showError(streetInput, "Maximum 40 characters allowed");
    } else {
      clearError(streetInput);
    }
  });
  
  
  streetInput.addEventListener("blur", () => {
    if (streetInput.value.length === 40) {
      clearError(streetInput);
    }
  
  });
  
  
  //  ZIP Code
  
  pinInput.addEventListener("input", () => {
    pinInput.value = pinInput.value.replace(/\D/g, "");
    
    if (pinInput.value.length > 6) {
            pinInput.value = pinInput.value.slice(0, 6);
  
      showError(pinInput, "exact 6 number only");
    } else {
      clearError(pinInput);
    }
    
  });
  
  pinInput.addEventListener("blur", () => {
    if (pinInput.value.length === 6) {
      clearError(pinInput);
    }
  
  });
  
  //tax Id
  const taxIdInput = document.querySelector('input[name="gstNumber"]');
  
  taxIdInput.addEventListener("input", () => {
    // Uppercase + alphanumeric only
    taxIdInput.value = taxIdInput.value .toUpperCase() .replace(/[^A-Z0-9]/g, "") ;
  
  
    if (taxIdInput.value.length >15) {
            taxIdInput.value = taxIdInput.value.slice(0, 15);
  
      showError(taxIdInput, "exact 15 number only");
    } else {
      clearError(taxIdInput);
    }
  
  // clearError(taxIdInput);
  });
  
  
  taxIdInput.addEventListener("blur", () => {
    if (taxIdInput.value.length === 15) {
      clearError(taxIdInput);
    }
  
  });
  
  
  //CREDIT LIMIT
  
  const creditLimitInput = document.getElementById("creditLimit");
  const availableLimitInput = document.getElementById("availableLimit");
  creditLimitInput.addEventListener("input", () => {
    let value = creditLimitInput.value.replace(/\D/g, "");
    value = value.replace(/^0+/, "");
  
    if (value.length > 6) {
      value = value.slice(0, 6);
      showError(creditLimitInput, "Maximum 6 digits allowed");
    } else {
      clearError(creditLimitInput);
    }
  
    creditLimitInput.value = value;
    availableLimitInput.value = value ? value : "";
  
  });
  
  creditLimitInput.addEventListener("blur", () => {
    if (creditLimitInput.value) {
      clearError(creditLimitInput);
    }
  });
  
  
  
  
  //email duplicate (compatible with new /api/customer response)
  async function emailAlreadyExists(emailValue) {
    const res = await fetch("/api/customer");
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
    if (customerTypeInput.value) {
      clearError(customerTypeInput);
    }
  });
  
  
  customerStatusInput.addEventListener("change", () => {
    if (customerStatusInput.value) {
      clearError(customerStatusInput);
    }
  });
  
  
  salesRepInput.addEventListener("change", () => {
    if (salesRepInput.value) {
      clearError(salesRepInput);
    }
  });
  
  
  paymentTermsInput.addEventListener("change", () => {
    if (paymentTermsInput.value) {
      clearError(paymentTermsInput);
    }
  });
  
  creditTermInput.addEventListener("change", () => {
    if (creditTermInput.value) {
      clearError(creditTermInput);
    }
  });
  
    /* ================= SUBMIT ================= */
    const submitBtn = form.querySelector('button[type="submit"]');

    function resetSubmitBtn() {
      if (!submitBtn) return;
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtn.dataset.originalText || "Submit";
      delete submitBtn.dataset.originalText;
    }

    // ============================
    // ✅ Enable/Disable Submit Button
    // ============================
    function updateSubmitButtonState() {
      if (!submitBtn) return;
      
      let allValid = true;
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
      
      // First Name (required, min 3 chars)
      if (!firstName || !firstName.value.trim() || firstName.value.trim().length < 3) {
        allValid = false;
      }
      
      // Last Name (required)
      if (!lastName || !lastName.value.trim()) {
        allValid = false;
      }
      
      // Phone (required, exactly 10 digits)
      if (!phone || !phone.value.trim() || phone.value.trim().length !== 10) {
        allValid = false;
      }
      
      // Email (required, valid format)
      if (!email || !email.value.trim() || !emailPattern.test(email.value.trim())) {
        allValid = false;
      }
      
      // Zip Code (required, exactly 6 digits)
      if (!pinInput || !pinInput.value.trim() || pinInput.value.trim().length !== 6) {
        allValid = false;
      }
      
      // Street (required)
      if (!streetInput || !streetInput.value.trim()) {
        allValid = false;
      }
      
      // City (required)
      if (!cityInput || !cityInput.value.trim()) {
        allValid = false;
      }
      
      // State (required)
      if (!stateInput || !stateInput.value.trim()) {
        allValid = false;
      }
      
      // Country (required)
      if (!countryInput || !countryInput.value.trim()) {
        allValid = false;
      }
      
      // Billing Address (required)
      if (!billingAddressInput || !billingAddressInput.value.trim()) {
        allValid = false;
      }
      
      // Shipping Address (required)
      if (!shippingAddressInput || !shippingAddressInput.value.trim()) {
        allValid = false;
      }
      
      // Address (required)
      if (!addressInput || !addressInput.value.trim()) {
        allValid = false;
      }
      
      // Customer Type (required dropdown)
      if (!customerTypeInput || !customerTypeInput.value) {
        allValid = false;
      }
      
      // Customer Status (required dropdown)
      if (!customerStatusInput || !customerStatusInput.value) {
        allValid = false;
      }
      
      // Sales Rep (required dropdown)
      if (!salesRepInput || !salesRepInput.value) {
        allValid = false;
      }
      
      // Payment Terms (required dropdown)
      if (!paymentTermsInput || !paymentTermsInput.value) {
        allValid = false;
      }
      
      // Credit Term (required dropdown)
      if (!creditTermInput || !creditTermInput.value) {
        allValid = false;
      }
      
      // Tax ID / GST (required, valid format)
      if (!taxIdInput || !taxIdInput.value.trim() || !gstPattern.test(taxIdInput.value.trim())) {
        allValid = false;
      }
      
      // Credit Limit (required, max 10,000,000)
      const creditLimit = creditLimitInput ? Number(creditLimitInput.value) : NaN;
      if (!creditLimitInput || !creditLimitInput.value.trim() || isNaN(creditLimit) || creditLimit <= 0 || creditLimit > 10000000) {
        allValid = false;
      }
      
      // Enable button only if all validations pass
      submitBtn.disabled = !allValid;
    }
    
    // Add event listeners to update button state
    const fieldsToWatch = [
      firstName, lastName, phone, email, pinInput, streetInput, cityInput,
      stateInput, countryInput, billingAddressInput, shippingAddressInput,
      addressInput, customerTypeInput, customerStatusInput, salesRepInput,
      paymentTermsInput, creditTermInput, taxIdInput, creditLimitInput
    ];
    
    fieldsToWatch.forEach(field => {
      if (!field) return;
      const eventName = field.tagName === "SELECT" ? "change" : "input";
      field.addEventListener(eventName, updateSubmitButtonState);
      if (field.tagName !== "SELECT") {
        field.addEventListener("blur", updateSubmitButtonState);
      }
    });
    
    // Initialize button as disabled
    if (submitBtn) {
      submitBtn.disabled = true;
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
  
  let isValid = true;
  let firstErrorField = null;
  
      /* REQUIRED FIELDS */
      document.querySelectorAll("[data-required]").forEach(field => {
        if (!field.value.trim()) {
          showError(field, "This field is required");
          isValid = false;
        }
      });
  
  
  
  
  
      if (!firstName.value) {
   showError(firstName, "first Name is required");
  isValid = false;
  if (!firstErrorField) firstErrorField = firstName;
  } 
  
   else if (firstName.value && firstName.value.length < 3) {
        showError(firstName, "Minimum 3 characters required");
        isValid = false;
        if (!firstErrorField) firstErrorField = firstName;
  
      }
  
  
   if (!lastName.value) {
    showError(lastName, "last Name is required");
    isValid = false;
    if (!firstErrorField) firstErrorField = lastName;
  } 
  
      if (!phone.value) {
    showError(phone, "phone Number is required");
    isValid = false;
    if (!firstErrorField) firstErrorField = phone;
  } 
  
  else if (phone.value && phone.value.length !== 10) {
        showError(phone, "Phone number must be 10 digits");
        isValid = false;
        if (!firstErrorField) firstErrorField = phone;
  }
  
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email.value) {
    showError(email, "Email is required");
    isValid = false;
    if (!firstErrorField) firstErrorField = email;
  } 
  
   else   if (email.value && !emailPattern.test(email.value)) {
        showError(email, "Enter valid email address");
        isValid = false;
        if (!firstErrorField) firstErrorField = email;
  }
    if (!pinInput.value) {
    showError(pinInput, "Zip code is required");
    isValid = false;
    if (!firstErrorField) firstErrorField = pinInput;
  } 
  
  
   else   if (pinInput.value && pinInput.value.length !== 6) {
        showError(pinInput, "Zip  code must be exactly 6 digits");
        isValid = false;
        if (!firstErrorField) firstErrorField = pinInput;
  }
  
  
      
      if (!streetInput.value) {
    showError(streetInput, "Street is required");
    isValid = false;
    if (!firstErrorField) firstErrorField = streetInput;
  } 
  
  
  
      if (!cityInput.value) {
    showError(cityInput, "City is required");
    isValid = false;
    if (!firstErrorField) firstErrorField = cityInput;
  } 
     
      if (!stateInput.value) {
    showError(stateInput, "State is required");
    isValid = false;
    if (!firstErrorField) firstErrorField = stateInput;
  } 
  
      if (!countryInput.value) {
    showError(countryInput, "Country is required");
    isValid = false;
    if (!firstErrorField) firstErrorField = countryInput;
  } 
  
      if (!billingAddressInput.value) {
    showError(billingAddressInput, "Billing Address is required");
    isValid = false;
    if (!firstErrorField) firstErrorField = billingAddressInput;
  } 
  
      if (!shippingAddressInput.value) {
    showError(shippingAddressInput, "Shipping Address is required");
    isValid = false;
    if (!firstErrorField) firstErrorField =shippingAddressInput;
  } 
  
  
      if (!addressInput.value) {
    showError(addressInput, " Address is required");
    isValid = false;
    if (!firstErrorField) firstErrorField = addressInput;
  } 
  
  // CUSTOMER TYPE (DROPDOWN)
  if (!customerTypeInput.value) {
    showError(customerTypeInput, "Please select customer type");
    isValid = false;
    if (!firstErrorField) firstErrorField = customerTypeInput;
  
  }
  
  // CUSTOMER Status (DROPDOWN)
  if (!customerStatusInput.value) {
    showError(customerStatusInput, "Please select customer Status");
    isValid = false;
    if (!firstErrorField) firstErrorField = customerStatusInput;
  
  }
  
  // SALES REPTYPE (DROPDOWN)
  if (!salesRepInput.value) {
    showError(salesRepInput, "Please select Sale Rep");
    isValid = false;
    if (!firstErrorField) firstErrorField = salesRepInput;
  
  }
  
  // PAYMENT TERM (DROPDOWN)
  if (!paymentTermsInput.value) {
    showError(paymentTermsInput, "Please select Paymen Terms");
    isValid = false;
    if (!firstErrorField) firstErrorField = paymentTermsInput;
  
  }
  
  // CREDIT TERM (DROPDOWN)
  if (!creditTermInput.value) {
    showError(creditTermInput, "Please select Credit Terms");
    isValid = false;
    if (!firstErrorField) firstErrorField = creditTermInput;
  
  }
  
      /* ================= TAX / GST ID ================= */
  const gstPattern =
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
      if (!taxIdInput.value) {
    showError(taxIdInput, "Tax Id is required");
    isValid = false;
    if (!firstErrorField) firstErrorField = taxIdInput;
  } 
  
  else if (taxIdInput.value && !gstPattern.test(taxIdInput.value)) {
    showError(
      taxIdInput,
      "Enter valid GST number (15 characters)"
    );
    isValid = false;
    if (!firstErrorField) firstErrorField = taxIdInput;
  
  }
  
  
  /* ================= CREDIT LIMIT ================= */
  const creditLimit = Number(creditLimitInput.value);
  
  if (!creditLimitInput.value) {
    showError(creditLimitInput, "Credit limit is required");
    isValid = false;
    if (!firstErrorField) firstErrorField = creditLimitInput;
  
  }  
  else if (creditLimit > 10000000) {
    showError(creditLimitInput, "Maximum allowed is 10,000,000");
    isValid = false;
    if (!firstErrorField) firstErrorField = creditLimitInput;
  }
  
      if (!isValid) {
        scrollToField(firstErrorField);
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
  
  function showError(input, message) {
    const error = input.closest(".form-group").querySelector(".error-text");
    error.textContent = message;
    error.style.display = "block";
    input.classList.add("input-error");
  }
  
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
      const res = await fetch("/api/customer");
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
  
        // Top red error banner
        showErrorNotification(errMsg);
  
        // Center popup with detailed message (no redirect on error)
        showSuccessModal(errMsg, null);
        resetSubmitBtn();
        return;
      }
  
      // ✅ Same success UX as Add New Product
      const newId = result.customerId || result.customer_id || customerIdInput.value;
  
      // Top success banner
      showSuccessNotification("Customer has been created successfully");
  
      // Center popup with green tick + ID (same style as Product)
      showSuccessModal(
        `✅ Customer saved successfully (ID: ${newId})`,
        "/customer"
      );
  
      // Reset form + next ID (in case user stays on page)
      form.reset();
      fetchCustomerId();
    } catch (err) {
      console.error("❌ Error saving customer:", err);
      showErrorNotification("❌ Customer could not be created. Please try again.");
      resetSubmitBtn();
    }
  }
  
  });