document.addEventListener("DOMContentLoaded", () => {

  const addItemBtn = document.getElementById("addItemSubmit"); // modal button
  const productIdField = document.getElementById("newProductId");
  const productNameField = document.getElementById("newProductName");
  const productDescriptionField = document.getElementById("newProductDescription");
  const unitPriceField = document.getElementById("newUnitPrice");
  const sellingPriceField = document.getElementById("newSellingPrice");
  const quantityField = document.getElementById("newQuantity");
  const totalField = document.getElementById("newTotal");

  // Disable Add Item by default
  addItemBtn.disabled = true;

  // Validation function
  function validateAddItemFields() {
    // Check all required fields are filled
    const valid =
      productIdField.value.trim() !== "" &&
      productNameField.value.trim() !== "" &&
      productDescriptionField.value.trim() !== "" &&
      unitPriceField.value.trim() !== "" &&
      sellingPriceField.value.trim() !== "" &&
      quantityField.value.trim() !== "";

    addItemBtn.disabled = !valid;
  }

// Restrict Quantity and Selling Price to numbers only (max 10 digits)
[quantityField, sellingPriceField].forEach(field => {
  field.addEventListener("input", e => {
    // Only digits, max 10 characters
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
 
  // Recalculate total
  function updateTotal() {
    const qty = parseFloat(quantityField.value) || 0;
    const price = parseFloat(sellingPriceField.value) || 0;
    totalField.value = (qty * price).toFixed(2);
  }
    // Re-validate Add Item button
    validateAddItemFields();
  });
});
// Also re-validate Add Item button for other modal fields
[productIdField, productNameField, productDescriptionField, unitPriceField].forEach(field => {
    field.addEventListener("input", () => {
        validateAddItemFields();
      updateTotal();
});
});

});


function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.style.display = "flex";
        showProductSuccessNotification("Product added successfully");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.style.display = "none";
}


document.addEventListener("DOMContentLoaded", () => {

  /* =====================================================
     GLOBAL STATE
  ===================================================== */
  let productAdded = false;
  let enquiryId = null;
  let enquiryItems = {}; // store added products
  let isExistingEnquiry = false;
  /* =====================================================
     ELEMENTS
  ===================================================== */
  const addItemBtn = document.getElementById("addItemBtn");
  const submitBtn = document.getElementById("submitEnquiryBtn");
  const fillPopup = document.getElementById("fillEnquiryPopup");
  const fillOkBtn = document.getElementById("fillEnquiryOkBtn");

  const phoneField = document.querySelector('[name="phone_number"]');
  const firstNameField = document.querySelector('[name="first_name"]');
  const lastNameField = document.querySelector('[name="last_name"]');
  const emailField = document.querySelector('[name="email"]');

  const requiredNames = [
    "phone_number", "first_name", "last_name", "email",
    "street","city","state","country","zip",
    "enquiry_description","enquiry_type","enquiry_channel","source",
    "urgency","priority"
  ];

  /* =====================================================
     ERROR HELPERS
  ===================================================== */
  function showError(field, message) {
    let error = field.parentElement.querySelector(".field-error");
    if (!error) {
      error = document.createElement("small");
      error.className = "field-error";
      field.parentElement.appendChild(error);
    }
    error.innerText = message;
    field.classList.add("error");
  }

  function clearError(field) {
    const error = field.parentElement.querySelector(".field-error");
    if (error) error.innerText = "";
    field.classList.remove("error");
  }

  // =========================
  // ELEMENTS
  // =========================
  const resetBtn = document.getElementById("resetEnquiryBtn");   // Reset button on Enquiry page
  const cancelBtn = document.getElementById("cancelEnquiryBtn"); // Cancel button on Enquiry page
  const enquiryForm = document.getElementById("enquiryForm");    // Your main enquiry form
  const addItemModal = document.getElementById("productModal");  // Add Item modal

  // =========================
  // RESET BUTTON FUNCTIONALITY
  // Clears all fields in the Enquiry form
  // =========================
  resetBtn.addEventListener("click", () => {
    if (!enquiryForm) return;

    enquiryForm.reset();       // Reset all input/select fields
    enquiryItems = {};         // Clear all added items
    productAdded = false;      // Reset product added flag
    submitBtn.disabled = true; // Disable submit button again
  });

  // =========================
  // CANCEL BUTTON FUNCTIONALITY(new-enquiry)
  // Closes the Enquiry page modal or any active modal
    // =========================

cancelBtn.addEventListener("click", () => {
 window.location.href = "/enquiry-list";
});

  // =========================
// WITHOUT FILL THE FIELDS ERROR(ADD NEW ENQUIRY PRODUCT BUTTON)
  // =========================
fillOkBtn.addEventListener("click", () => {
  // Close the popup
  fillPopup.style.display = "none";
});

  // ==========================
  // ✅ Success Notification
  // ==========================
  function showSuccessNotification(message) {
    const existing = document.querySelector(".success-notification");
    if (existing) existing.remove();
    const notification = document.createElement("div");
    notification.className = "success-notification";
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add("show"), 10);
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 400);
    }, 2000);
  }

  /* =====================================================
     FIELD VALIDATION
  ===================================================== */
  function validateField(field) {
    const value = field.value.trim();
    if (!value) {
      clearError(field);
      return false;
    }

    switch (field.name) {
      case "phone_number":
        if (!/^\d{10}$/.test(value)) {
          showError(field, "Phone number must be 10 digits");
          return false;
        }
        break;
      case "first_name":
        if (value.length < 3) {
          showError(field, "Minimum 3 characters");
          return false;
        }
        break;
      case "last_name":
        if (!/^[A-Za-z]+$/.test(value)) { 
      return false;
}
  if (value.length > 25) {
          showError(field, "Maximum 25 characters allowed");
          return false;
        }
        break;
      case "email":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          showError(field, "Enter valid email address");
          return false;
        }
        break;
      case "street":
      case "unit":
      case "enquiry_description":
      case "city":
      case "state":
      case "country":
        if (value.length < 3) {
          showError(field, "Minimum 3 characters");
          return false;
        }
        break;
      case "zip":
        if (value.length < 5 || value.length > 10) {
          showError(field, "ZIP code must be 5–10 digits");
          return false;
        }
        break;
    }
    clearError(field);
    return true;
  }

  /* =====================================================
     FORM CHECKS
  ===================================================== */
  function isFormFilled() {
    return requiredNames.every(name => {
      const field = document.querySelector(`[name="${name}"]`);
      return field && field.value.trim() !== "";
    });
  }

  function isFormValid() {
    return requiredNames.every(name => {
      const field = document.querySelector(`[name="${name}"]`);
      return field && validateField(field);
    });
  }

  function updateSubmitButton() {
    submitBtn.disabled = !(isFormFilled() && isFormValid() && productAdded && enquiryId);
  }



  
  /* =====================================================
     INPUT RESTRICTIONS
  ===================================================== */
  phoneField?.addEventListener("input", e => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
    validateField(phoneField);
    updateSubmitButton();
  });

  firstNameField?.addEventListener("input", e => {
    e.target.value = e.target.value.replace(/[^A-Za-z]/g, "").slice(0, 15);
    validateField(firstNameField);
    updateSubmitButton();
  });

  lastNameField?.addEventListener("input", e => {
    let value = e.target.value.replace(/[^A-Za-z]/g, "");
    if (value.length > 25) value = value.slice(0, 25);
    e.target.value = value;
    validateField(lastNameField);
    updateSubmitButton();
  });

  document.querySelectorAll('[name="city"],[name="state"],[name="country"]').forEach(field => {
    field.addEventListener("input", e => {
      e.target.value = e.target.value.replace(/[^A-Za-z ]/g, "").slice(0, 30);
      validateField(field);
      updateSubmitButton();
    });
  });

  document.querySelector('[name="zip"]')?.addEventListener("input", e => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
    validateField(e.target);
    updateSubmitButton();
  });

  emailField?.addEventListener("input", () => {
    validateField(emailField);
    updateSubmitButton();
  });

  document.querySelectorAll('[name="street"], [name="unit"], [name="enquiry_description"]').forEach(field => {
    field.addEventListener("input", e => {
      e.target.value = e.target.value.replace(/[^A-Za-z0-9 ,.\-/]/g, "").slice(0, 100);
      validateField(field);
      updateSubmitButton();
    });
  });

  requiredNames.forEach(name => {
    const field = document.querySelector(`[name="${name}"]`);
    if (!field) return;
    field.addEventListener("change", updateSubmitButton);
  });

  /* =====================================================
     FETCH ENQUIRY ID
  ===================================================== */
  fetch("/generate-enquiry-id")
    .then(res => res.json())
    .then(data => {
      enquiryId = data.enquiry_id;
      const idField = document.querySelector('[name="enquiry_id"]');
      if (idField) idField.value = enquiryId;
      updateSubmitButton();
    });
  /* =====================================================
     ADD ITEM MODAL AND EMAIL CHECK DUPLICATE
  ===================================================== */
  addItemBtn.addEventListener("click", async e => {
  e.preventDefault();

  if (!isFormFilled()) {
    fillPopup.style.display = "flex";
    return;
  }

  const email = emailField.value.trim();
  if (!email) return;
const res = await fetch(`/check-email-enquiry?email=${email}`);

if (!res.ok) {
  console.error("Server error:", res.status);
  return;
}

const data = await res.json();

  // EMAIL EXISTS
  if (data.exists) {
      isExistingEnquiry = true;   // 🔥 IMPORTANT

    window.existingEnquiryId = data.enquiry_id;

    document.getElementById("emailExistsPopup").style.display = "flex";
    return;
  }

  // EMAIL NOT EXISTS → NORMAL FLOW
  openModal("productModal");
});

document.getElementById("emailOkBtn").addEventListener("click", async () => {
  document.getElementById("emailExistsPopup").style.display = "none";

  enquiryId = window.existingEnquiryId;
  document.querySelector('[name="enquiry_id"]').value = enquiryId;

  // Load old items (for duplicate check only)
  const res = await fetch(`/get-enquiry-add-items/${enquiryId}`);
  const data = await res.json();

  if (data.success) {
    enquiryItems = data.items || {};
  }

  // ❌ DO NOT enable submit here
  productAdded = false;

  updateSubmitButton();   // submit stays disabled ✅
  openModal("productModal");
});

document.getElementById("emailCancelBtn").addEventListener("click", () => {
  document.getElementById("emailExistsPopup").style.display = "none";

    // Reset the form
    if (enquiryForm) {
        enquiryForm.reset(); // Reset all input/select fields
    }
  // ❌ Do NOT open product modal
});

  /* =====================================================
     PRODUCT SAVE
  ===================================================== */
  window.addProduct = function (event) {
  event.preventDefault();

  const itemCode = document.getElementById("newProductId").value.trim();

  if (!itemCode) {
    alert("Enter item code");
    return;
  }

  // 🚫 DUPLICATE CHECK (OLD + NEW ITEMS)
  if (enquiryItems[itemCode]) {
    alert("This item code already exists for this enquiry");
    return; // ⛔ STOP — DO NOT UPDATE
  }
 

  const item = {
    item_code: itemCode,
    item_name: document.getElementById("newProductName").value.trim(),
    description: document.getElementById("newProductDescription").value.trim(),
    quantity: document.getElementById("newQuantity").value.trim(),
    unit_price: document.getElementById("newUnitPrice").value.trim(),
    selling_price: document.getElementById("newSellingPrice").value.trim(),
    total: document.getElementById("newTotal").value.trim(),
  };

  // ✅ SAFE TO ADD
  enquiryItems[itemCode] = item;
  productAdded = true;

  updateSubmitButton();
  closeModal("productModal");
};

  /* =====================================================
     SUBMIT ENQUIRY
  ===================================================== */
  submitBtn.addEventListener("click", async e => {
    e.preventDefault();
    const payload = {
enquiry_id: enquiryId,   
      enquiry_details: {
        first_name: firstNameField.value.trim(),
        last_name: lastNameField.value.trim(),
        phone: phoneField.value.trim(),
        email: emailField.value.trim(),
        street: document.querySelector('[name="street"]').value.trim(),
        unit: document.querySelector('[name="unit"]').value.trim(),
        city: document.querySelector('[name="city"]').value.trim(),
        state: document.querySelector('[name="state"]').value.trim(),
        country: document.querySelector('[name="country"]').value.trim(),
        zip: document.querySelector('[name="zip"]').value.trim(),
        enquiry_description: document.querySelector('[name="enquiry_description"]').value.trim(),
        enquiry_type: document.querySelector('[name="enquiry_type"]').value,
        enquiry_channel: document.querySelector('[name="enquiry_channel"]').value,
        source: document.querySelector('[name="source"]').value,
        urgency: document.querySelector('[name="urgency"]').value,
        priority: document.querySelector('[name="priority"]').value
      },
      items: enquiryItems
    };

    const res = await fetch("/save-enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      // alert("Enquiry saved successfully!");
      // location.reload();
window.location.href = "/enquiry-list";
 showSuccessNotification("Enquiry updated successfully");
        setTimeout(() => { window.location.reload(); }, 500);    }
           

    else {
      alert("Failed to save enquiry");
      return
    }
  });

  /* =====================================================
     ENABLE SUBMIT ON ANY FIELD CHANGE
  ===================================================== */
  document.querySelectorAll("input, select").forEach(field => {
    field.addEventListener("input", updateSubmitButton);
    field.addEventListener("change", updateSubmitButton);
  });

  submitBtn.disabled = true;

  const cancelAddItemBtn = document.getElementById("cancelAddItemBtn");

  // Close Add Item modal when Cancel clicked
  cancelAddItemBtn.addEventListener("click", () => {
    // Optional: clear fields
    const form = document.getElementById("addProductForm");
    form.reset();
    closeModal("productModal");
  });


//ADD ITEM AUTOMATICALLY FILL WHEN ENTER THE ITEM CODE
const productIdField = document.getElementById("newProductId");
const productNameField = document.getElementById("newProductName");
const productDescriptionField = document.getElementById("newProductDescription");
const unitPriceField = document.getElementById("newUnitPrice");
const sellingPriceField = document.getElementById("newSellingPrice");
const quantityField = document.getElementById("newQuantity");
const totalField = document.getElementById("newTotal");

let MAX_PRODUCT_ID_LENGTH = 4; // fallback default
let VALID_PRODUCT_IDS = [];    // will store all valid product IDs





async function loadProductConfig() {
    try {
        const res = await fetch("/get-product-config");
        const data = await res.json();

        if (data.success) {
            MAX_PRODUCT_ID_LENGTH = data.max_id_length;
            VALID_PRODUCT_IDS = data.product_ids;
            console.log("Max product ID length:", MAX_PRODUCT_ID_LENGTH);
            console.log("All product IDs:", VALID_PRODUCT_IDS);
        } else {
            console.warn("Failed to get product config:", data.message);
        }
    } catch (err) {
        console.error("Error fetching product config:", err);
    }
}
loadProductConfig();

let ITEM_CODE_LENGTH = MAX_PRODUCT_ID_LENGTH;

// Create or get the error element
let productError = productIdField.parentElement.querySelector(".field-error");
if (!productError) {
  productError = document.createElement("small");
  productError.className = "field-error";
  productIdField.parentElement.appendChild(productError);
}

// Listen to input for product code
productIdField.addEventListener("input", async () => {
  let code = productIdField.value.trim();

  // Prevent typing beyond max length
  if (code.length > MAX_PRODUCT_ID_LENGTH) {
    code = code.slice(0, MAX_PRODUCT_ID_LENGTH);
    productIdField.value = code;
  }

  // Clear previous fields & error
  productNameField.value = "";
  productDescriptionField.value = "";
  unitPriceField.value = "";
  sellingPriceField.value = "";
  quantityField.value = "";
  totalField.value = "";
  productError.innerText = "";

  // Don't search if code is empty
  if (code === "") {
    return;
  }

  // FIXED: Find exact match only
  const exactMatch = VALID_PRODUCT_IDS.find(pid => 
    String(pid).toLowerCase() === code.toLowerCase()
  );

  if (!exactMatch) {
    productError.innerText = `Item code "${code}" not found`;
    return;
  } 
  
  // ✅ Exact match found - auto-fill
  const prodCode = exactMatch;
  try {
    const res = await fetch(`/get-product/${prodCode}`);
    if (!res.ok) throw new Error("Product not found");
    const data = await res.json();

    if (data.success && data.product) {
      const prod = data.product;
      productNameField.value = prod.product_name || "";
      productDescriptionField.value = prod.description || "";
      unitPriceField.value = prod.unit_price || "";

      // Calculate Total only when user types in values
      function updateTotal() {
        const price = parseFloat(sellingPriceField.value);
        const qty = parseFloat(quantityField.value);
        if (!isNaN(price) && !isNaN(qty)) {
          totalField.value = (price * qty).toFixed(2);
        } else {
          totalField.value = "";
        }
      }

      sellingPriceField.addEventListener("input", updateTotal);
      quantityField.addEventListener("input", updateTotal);
    }
  } catch (err) {
    productError.innerText = `Product code "${prodCode}" not found`;
  }
});


});