// / ✅ MAKE THESE GLOBAL
// Updated function with default
function openModal(modalId = "productModal") {
    document.getElementById(modalId).style.display = "flex";
  
    if (modalId === "productModal") {
      fetch("/generate-product-id")
        .then(res => {
          if (!res.ok) throw new Error("Network response was not OK");
          return res.json();
        })
        .then(data => {
          const form = document.getElementById("addProductForm");
          form.product_id.value = data.product_id; // set generated code
          form.product_id.readOnly = true;
        })
        .catch(err => console.error("Failed to generate product code:", err));
    }
  }
  
  
  // Event listener for Add Item button
  document.getElementById("addItemBtn").addEventListener("click", () => {
    openModal("productModal"); // always open the "Add Product" modal
  });
  
  function closeModal(modalId = null) {
    if (modalId) {
      document.getElementById(modalId).style.display = "none";
    } else {
      document.getElementById("productModal").style.display = "none";
      document.getElementById("productModal1").style.display = "none";
    }
  }
  
  let isEditMode = false;
  let editProductId = null;
  
  // ==============================
  // ✅ Edit Product Elements (will be initialized in DOMContentLoaded)
  // ==============================
  let editProductModal = null;
  let editProductIdInput = null;
  let editProductDescription = null;
  let editUnitPrice = null;
  let editSellingPrice = null;
  let editQuantity = null;
  let editTotal = null;
  let saveProductEditBtn = null;
  let closeProductEditBtn = null;
  
  // Error elements
  let errProductDescription = null;
  let errUnitPrice = null;
  let errSellingPrice = null;
  let errQuantity = null;

  function editProduct(productId) {
    fetch("/get-products")
      .then(res => res.json())
      .then(products => {
        const product = products.find(p => p.product_id === productId);
        if (!product) {
          alert("Product not found!");
          return;
        }
  
        // Clear errors
        clearProductEditErrors();
  
        // Populate form fields
        if (editProductIdInput) editProductIdInput.value = product.product_id || "";
        if (editProductDescription) editProductDescription.value = product.description || "";
        if (editUnitPrice) editUnitPrice.value = product.unit_price || "";
        if (editSellingPrice) editSellingPrice.value = product.selling_price || "";
        if (editQuantity) editQuantity.value = product.quantity || "";
        if (editTotal) editTotal.value = product.total || "";
  
        isEditMode = true;
        editProductId = productId;
  
        openModal("productModal1");
        
        // Update button state after populating form
        setTimeout(() => {
          updateProductEditButtonState();
        }, 10);
      });
  }

  // ==============================
  // ✅ Clear Errors
  // ==============================
  function clearProductEditErrors() {
    if (errProductDescription) errProductDescription.textContent = "";
    if (errUnitPrice) errUnitPrice.textContent = "";
    if (errSellingPrice) errSellingPrice.textContent = "";
    if (errQuantity) errQuantity.textContent = "";
    
    [editProductDescription, editUnitPrice, editSellingPrice, editQuantity].forEach(el => {
      if (el) el.classList.remove("input-error");
    });
  }

  // ==============================
  // ✅ Validation Functions
  // ==============================
  function isValidDescription(v) {
    v = (v || "").trim();
    return v.length >= 1 && v.length <= 100;
  }

  function isValidPrice(v) {
    v = (v || "").trim();
    const num = parseFloat(v);
    return !isNaN(num) && num > 0 && /^\d+(\.\d{1,2})?$/.test(v);
  }

  function isValidQuantity(v) {
    v = (v || "").trim();
    const num = parseFloat(v);
    return !isNaN(num) && num > 0 && Number.isInteger(num) && /^\d+$/.test(v);
  }

  function validateProductEditFormSilent() {
    const description = (editProductDescription?.value || "").trim();
    const unitPrice = (editUnitPrice?.value || "").trim();
    const sellingPrice = (editSellingPrice?.value || "").trim();
    const quantity = (editQuantity?.value || "").trim();

    if (!isValidDescription(description)) return false;
    if (!isValidPrice(unitPrice)) return false;
    if (!isValidPrice(sellingPrice)) return false;
    if (!isValidQuantity(quantity)) return false;

    return true;
  }

  function updateProductEditButtonState() {
    if (!saveProductEditBtn) return;
    const ok = validateProductEditFormSilent();
    saveProductEditBtn.disabled = !ok;
  }

  // Live validation clearing
  function attachProductLiveClear(inputEl, errEl) {
    if (!inputEl || !errEl) return;
    inputEl.addEventListener("input", () => {
      if (errEl) errEl.textContent = "";
      inputEl.classList.remove("input-error");
      updateProductEditButtonState();
      
      // Auto-calculate total
      calculateProductTotal();
    });
  }

  // Calculate total
  function calculateProductTotal() {
    if (!editSellingPrice || !editQuantity || !editTotal) return;
    const sellingPrice = parseFloat(editSellingPrice.value.trim()) || 0;
    const quantity = parseFloat(editQuantity.value.trim()) || 0;
    const total = sellingPrice * quantity;
    editTotal.value = total || "";
  }

  // Attach live validation (will be initialized in DOMContentLoaded)
  function initializeProductEditValidation() {
    if (editProductDescription && errProductDescription) {
      attachProductLiveClear(editProductDescription, errProductDescription);
    }
    if (editUnitPrice && errUnitPrice) {
      attachProductLiveClear(editUnitPrice, errUnitPrice);
    }
    if (editSellingPrice && errSellingPrice) {
      attachProductLiveClear(editSellingPrice, errSellingPrice);
      editSellingPrice.addEventListener("input", calculateProductTotal);
    }
    if (editQuantity && errQuantity) {
      attachProductLiveClear(editQuantity, errQuantity);
      editQuantity.addEventListener("input", calculateProductTotal);
    }

    // Enable/disable Save button live
    [editProductDescription, editUnitPrice, editSellingPrice, editQuantity].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", updateProductEditButtonState);
      el.addEventListener("blur", updateProductEditButtonState);
      el.addEventListener("change", updateProductEditButtonState);
    });
  }

  // ==============================
  // ✅ Save Product Edit Handler (will be attached in DOMContentLoaded)
  // ==============================
  function attachSaveProductEditHandler() {
    if (!saveProductEditBtn) return;
    
    saveProductEditBtn.addEventListener("click", async () => {
      if (!editProductId) {
        alert("No product selected for editing");
        return;
      }

      // Validate form
      let isValid = true;
      clearProductEditErrors();

      const description = (editProductDescription?.value || "").trim();
      const unitPrice = (editUnitPrice?.value || "").trim();
      const sellingPrice = (editSellingPrice?.value || "").trim();
      const quantity = (editQuantity?.value || "").trim();

      // Validate Description
      if (!isValidDescription(description)) {
        if (errProductDescription) {
          errProductDescription.textContent = "Product Description is required (1-100 characters)";
        }
        if (editProductDescription) editProductDescription.classList.add("input-error");
        isValid = false;
      }

      // Validate Unit Price
      if (!isValidPrice(unitPrice)) {
        if (errUnitPrice) {
          errUnitPrice.textContent = "Cost Price must be a valid number greater than 0";
        }
        if (editUnitPrice) editUnitPrice.classList.add("input-error");
        isValid = false;
      }

      // Validate Selling Price
      if (!isValidPrice(sellingPrice)) {
        if (errSellingPrice) {
          errSellingPrice.textContent = "Selling Price must be a valid number greater than 0";
        }
        if (editSellingPrice) editSellingPrice.classList.add("input-error");
        isValid = false;
      }

      // Validate Quantity
      if (!isValidQuantity(quantity)) {
        if (errQuantity) {
          errQuantity.textContent = "Quantity must be a valid whole number greater than 0";
        }
        if (editQuantity) editQuantity.classList.add("input-error");
        isValid = false;
      }

      if (!isValid) {
        // Scroll to first error
        const firstError = [editProductDescription, editUnitPrice, editSellingPrice, editQuantity]
          .find(el => el && el.classList.contains("input-error"));
        if (firstError) {
          firstError.scrollIntoView({ behavior: "smooth", block: "center" });
          firstError.focus();
        }
        return;
      }

      // Disable button during submission
      saveProductEditBtn.disabled = true;

      // Calculate total
      const total = parseFloat(sellingPrice) * parseFloat(quantity);

      // Prepare product data
      const product = {
        product_id: editProductIdInput?.value || editProductId,
        description: description,
        unit_price: parseFloat(unitPrice),
        selling_price: parseFloat(sellingPrice),
        quantity: parseFloat(quantity),
        total: total
      };

      try {
        const res = await fetch(`/update-product/${encodeURIComponent(editProductId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(product),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          alert(data.error || "Update failed");
          saveProductEditBtn.disabled = false;
          return;
        }

        // Mark in sessionStorage so we can show toast after reload
        try {
          sessionStorage.setItem("enquiry_product_updated", "1");
        } catch (e) {
          console.warn("Unable to persist product-updated flag:", e);
        }

        // Close modal and reset flags
        closeModal("productModal1");
        isEditMode = false;
        editProductId = null;

        // Full page reload so everything (including other totals) is in sync
        window.location.reload();
      } catch (err) {
        console.error("Error updating product:", err);
        saveProductEditBtn.disabled = false;
      }
    });
  }

  // ==============================
  // ✅ Success Notification (for Edit Product)
  // ==============================
  function showProductSuccessNotification(message) {
    const existing = document.querySelector(".success-notification");
    if (existing) existing.remove();

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

  // ==============================
  // ✅ Success Modal + Toast Helpers (for Enquiry Form Submission)
  // ==============================
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
  
  let deleteProductId = null; // store which product to delete
  
  // Open confirmation overlay
  function deleteProduct(productId) {
    deleteProductId = productId; // save id to delete
    const msgEl = document.getElementById("deleteProductText");
    if (msgEl) {
      msgEl.textContent = `Are you sure you want to delete "${productId}"?`;
    }
    document.getElementById("confirmOverlay1").style.display = "flex";
  }
  
  
  
  function openEditOverlay() {
    document.getElementById("productModal1").style.display = "flex";
  }
  
  function closeEditOverlay() {
    document.getElementById("productModal1").style.display = "none";
  }
  
  function openDeleteOverlay() {
    document.getElementById("confirmOverlay1").style.display = "flex";
  }
  
  function closeDeleteOverlay() {
    document.getElementById("confirmOverlay1").style.display = "none";
  }
  
  
  
document.addEventListener("DOMContentLoaded", () => {
  // If a product was just updated, show a toast once after reload
  try {
    const updatedFlag = sessionStorage.getItem("enquiry_product_updated");
    if (updatedFlag === "1") {
      sessionStorage.removeItem("enquiry_product_updated");
      showProductSuccessNotification("Product updated successfully");
    }

    const addedFlag = sessionStorage.getItem("enquiry_product_added");
    if (addedFlag === "1") {
      sessionStorage.removeItem("enquiry_product_added");
      showProductSuccessNotification("Product added successfully");
    }
  } catch (e) {
    console.warn("Unable to read product-updated/added flag:", e);
  }
  
    const form = document.getElementById("form-enquiry");
    const overlay = document.getElementById("confirmOverlay");
    const confirmOk = document.getElementById("confirmOk");
    const confirmCancel = document.getElementById("confirmCancel");
    const enquiryIdInput = document.querySelector('input[name="enquiry_id"]');
    
    // ✅ Success modal + toast (same pattern as Create New Customer)
    const successModal      = document.getElementById("enquirySuccessModal");
    const successMessage    = document.getElementById("enquirySuccessMessage");
    const successOkBtn      = document.getElementById("enquirySuccessOkBtn");
    let successRedirectUrl  = null;
    
    // ==============================
    // ✅ Initialize Edit Product Elements
    // ==============================
    editProductModal = document.getElementById("productModal1");
    editProductIdInput = document.getElementById("editProductId");
    editProductDescription = document.getElementById("editProductDescription");
    editUnitPrice = document.getElementById("editUnitPrice");
    editSellingPrice = document.getElementById("editSellingPrice");
    editQuantity = document.getElementById("editQuantity");
    editTotal = document.getElementById("editTotal");
    saveProductEditBtn = document.getElementById("saveProductEditBtn");
    closeProductEditBtn = document.getElementById("closeProductEditBtn");

    // ==============================
    // ✅ Initialize Add New Product Elements (for live total)
    // ==============================
    const newProductDescription = document.getElementById("newProductDescription");
    const newUnitPrice          = document.getElementById("newUnitPrice");
    const newSellingPrice       = document.getElementById("newSellingPrice");
    const newQuantity           = document.getElementById("newQuantity");
    const newTotal              = document.getElementById("newTotal");
    const addItemBtn            = document.getElementById("addItemSubmit");

    // Live total for Add New Product
    function calculateNewProductTotal() {
      if (!newSellingPrice || !newQuantity || !newTotal) return;
      const sp  = parseFloat(newSellingPrice.value.trim()) || 0;
      const qty = parseFloat(newQuantity.value.trim()) || 0;
      const tot = sp * qty;
      newTotal.value = tot ? tot : "";
    }

    // Enable / disable Add Item button based on validation (reuse same helpers as Edit)
    function updateAddItemButtonState() {
      if (!addItemBtn) return;

      const desc = (newProductDescription?.value || "").trim();
      const up   = (newUnitPrice?.value || "").trim();
      const sp   = (newSellingPrice?.value || "").trim();
      const qty  = (newQuantity?.value || "").trim();

      const ok =
        isValidDescription(desc) &&
        isValidPrice(up) &&
        isValidPrice(sp) &&
        isValidQuantity(qty);

      addItemBtn.disabled = !ok;
    }

    // Attach listeners for live total + button state
    if (newSellingPrice) {
      newSellingPrice.addEventListener("input", () => {
        calculateNewProductTotal();
        updateAddItemButtonState();
      });
      newSellingPrice.addEventListener("blur", () => {
        calculateNewProductTotal();
        updateAddItemButtonState();
      });
    }
    if (newQuantity) {
      newQuantity.addEventListener("input", () => {
        calculateNewProductTotal();
        updateAddItemButtonState();
      });
      newQuantity.addEventListener("blur", () => {
        calculateNewProductTotal();
        updateAddItemButtonState();
      });
    }
    if (newProductDescription) {
      newProductDescription.addEventListener("input", updateAddItemButtonState);
      newProductDescription.addEventListener("blur", updateAddItemButtonState);
    }
    if (newUnitPrice) {
      newUnitPrice.addEventListener("input", updateAddItemButtonState);
      newUnitPrice.addEventListener("blur", updateAddItemButtonState);
    }

    // Initialize Add Item as disabled until all fields valid
    if (addItemBtn) {
      addItemBtn.disabled = true;
    }
    
    // Error elements
    errProductDescription = document.getElementById("errProductDescription");
    errUnitPrice = document.getElementById("errUnitPrice");
    errSellingPrice = document.getElementById("errSellingPrice");
    errQuantity = document.getElementById("errQuantity");
    
    // Initialize Edit Product Save button as disabled
    if (saveProductEditBtn) {
      saveProductEditBtn.disabled = true;
    }
    
    // Initialize validation listeners
    initializeProductEditValidation();
    
    // Attach Save button handler
    attachSaveProductEditHandler();
    
    // Close Product Edit Modal handler
    if (closeProductEditBtn) {
      closeProductEditBtn.addEventListener("click", () => {
        closeModal("productModal1");
        clearProductEditErrors();
        if (saveProductEditBtn) saveProductEditBtn.disabled = true;
      });
    }

    // ==============================
    // ✅ Enable / Disable Submit Button (same pattern as Create New Product)
    // ==============================
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

    function updateSubmitButtonState() {
      if (!form || !submitBtn) return;

      let allValid = true;
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // Get all form fields
      const phoneField    = form.querySelector('input[name="phone_number"]');
      const firstNameFld  = form.querySelector('input[name="first_name"]');
      const emailField    = form.querySelector('input[name="email"]');
      const streetField   = form.querySelector('input[name="street"]');
      const cityField     = form.querySelector('input[name="city"]');
      const stateField    = form.querySelector('input[name="state"]');
      const zipField      = form.querySelector('input[name="zip"]');
      const countryField  = form.querySelector('input[name="country"]');
      const descField     = form.querySelector('input[name="enquiry_description"]');

      const enquiryType   = form.querySelector('select[name="enquiry_type"]');
      const channelField  = form.querySelector('select[name="enquiry_channel"]');
      const sourceField   = form.querySelector('select[name="source"]');
      const heardField    = form.querySelector('select[name="heard_about"]');
      const urgencyField  = form.querySelector('select[name="urgency"]');
      const statusField   = form.querySelector('select[name="staus"]');
      const priorityField = form.querySelector('select[name="priority"]');

      // Phone: required, exactly 10 digits
      if (!phoneField || phoneField.value.trim().length !== 10) {
        allValid = false;
      }

      // First name: required (non-empty)
      if (!firstNameFld || !firstNameFld.value.trim()) {
        allValid = false;
      }

      // Email: required, valid format
      const emVal = emailField ? emailField.value.trim() : "";
      if (!emVal || !emailPattern.test(emVal)) {
        allValid = false;
      }

      // Street: required (non-empty)
      if (!streetField || !streetField.value.trim()) {
        allValid = false;
      }

      // City: required (non-empty)
      if (!cityField || !cityField.value.trim()) {
        allValid = false;
      }

      // State: required (non-empty)
      if (!stateField || !stateField.value.trim()) {
        allValid = false;
      }

      // ZIP: required, exactly 6 digits
      if (!zipField || zipField.value.trim().length !== 6) {
        allValid = false;
      }

      // Country: required (non-empty)
      if (!countryField || !countryField.value.trim()) {
        allValid = false;
      }

      // Enquiry description: required (non-empty)
      if (!descField || !descField.value.trim()) {
        allValid = false;
      }

      // Required dropdowns – must have non-empty value (not default "")
      if (!enquiryType || !enquiryType.value) allValid = false;
      if (!channelField || !channelField.value) allValid = false;
      if (!sourceField || !sourceField.value) allValid = false;
      if (!heardField || !heardField.value) allValid = false;
      if (!urgencyField || !urgencyField.value) allValid = false;
      if (!statusField || !statusField.value) allValid = false;
      if (!priorityField || !priorityField.value) allValid = false;

      // Enable button only if all validations pass
      submitBtn.disabled = !allValid;
    }

    if (form && submitBtn) {
      // Watch all required fields (same pattern as create-new-product.js)
      const watchFields = [
        'input[name="phone_number"]',
        'input[name="first_name"]',
        'input[name="email"]',
        'input[name="street"]',
        'input[name="city"]',
        'input[name="state"]',
        'input[name="zip"]',
        'input[name="country"]',
        'input[name="enquiry_description"]',
        'select[name="enquiry_type"]',
        'select[name="enquiry_channel"]',
        'select[name="source"]',
        'select[name="heard_about"]',
        'select[name="urgency"]',
        'select[name="staus"]',
        'select[name="priority"]'
      ];

      watchFields.forEach((selector) => {
        const field = form.querySelector(selector);
        if (!field) return;
        
        // For SELECT elements, use 'change' event
        // For INPUT elements, use both 'input' and 'blur' events
        const eventName = field.tagName === "SELECT" ? "change" : "input";
        field.addEventListener(eventName, updateSubmitButtonState);
        
        if (field.tagName !== "SELECT") {
          field.addEventListener("blur", updateSubmitButtonState);
        }
      });

      // Initialize button as disabled (same pattern as create-new-product.js)
      submitBtn.disabled = true;
      
      // Run once in case some fields already have values (e.g., back/forward cache)
      updateSubmitButtonState();
    }
   
  
  // Cancel deletion
  document.getElementById("confirmCancel1").addEventListener("click", () => {
    deleteProductId = null;
    document.getElementById("confirmOverlay1").style.display = "none";
  });
  
  // Confirm deletion
  document.getElementById("confirmOk1").addEventListener("click", async () => {
    if (!deleteProductId) return;

    try {
      const res = await fetch(`/delete-product/${encodeURIComponent(deleteProductId)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || (data.status && data.status !== "success")) {
        alert(data.message || "Delete failed");
        return;
      }

      showSuccessNotification("Product deleted successfully");
      deleteProductId = null;
      document.getElementById("confirmOverlay1").style.display = "none";

      // Match enquiry delete UX: slight delay then full refresh
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Network error. Try again.");
    }
  });
  
  
  
  
    loadProducts();
  
    document.getElementById("addItemBtn").addEventListener("click", openModal);
    // document.getElementById("addProductForm").addEventListener("submit", addProduct);
  
  
  
  
    document.getElementById("addProductForm").addEventListener("submit", addProduct); // Add Product form
    // Edit Product form now uses Save button click handler (see below)
  
  
  
  
  
  /* ================= ADD PRODUCT ================= */
  function addProduct(e) {
    e.preventDefault();
  
    const form = e.target;
  
    const product = {
      product_id: form.product_id.value,
      description: form.description.value,
      unit_price: Number(form.unit_price.value),
      selling_price: Number(form.querySelectorAll("input[type='number']")[1].value),
      quantity: Number(form.quantity.value),
    };
  
    product.total = product.selling_price * product.quantity;

    // Disable Add Item button during submission (same pattern as Edit Product Save)
    const addItemBtn = document.getElementById("addItemSubmit");
    if (addItemBtn) {
      addItemBtn.disabled = true;
    }
  
    fetch("/add-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          alert(errorData.error || errorData.message || "Failed to add product");
          if (addItemBtn) {
            addItemBtn.disabled = false;
          }
          return;
        }

        const data = await res.json().catch(() => ({}));

        // Check if success (handle both True and true from Python)
        if (data.success !== true && data.success !== "true") {
          alert(data.error || data.message || "Failed to add product");
          if (addItemBtn) {
            addItemBtn.disabled = false;
          }
          return;
        }

        // Mark in sessionStorage so we can show toast after reload (exact same pattern as Edit Product Save)
        try {
          sessionStorage.setItem("enquiry_product_added", "1");
        } catch (e) {
          console.warn("Unable to persist product-added flag:", e);
        }

        // Close modal and reset flags (exact same pattern as Edit Product Save)
        closeModal("productModal");
        isEditMode = false;
        editProductId = null;

        // Full page reload so everything (including other totals) is in sync (exact same pattern as Edit Product Save)
        // Use setTimeout to ensure sessionStorage is written before reload
        setTimeout(() => {
          window.location.reload();
        }, 100);
      })
      .catch((err) => {
        console.error("Error adding product:", err);
        alert("Network error. Try again.");
        if (addItemBtn) {
          addItemBtn.disabled = false;
        }
      });
  }
  
  /* ================= LOAD TABLE ================= */
  function loadProducts() {
    fetch("/get-products") // should read enquiry-product.json
      .then(res => res.json())
      .then(data => {
        const tbody = document.getElementById("productTableBody");
        tbody.innerHTML = ""; // clear table
  
        let grandTotal = 0;
  
        if (data.length > 0) {
          // populate product rows
          data.forEach((p, index) => {
            const rowTotal = Number(p.total) || 0;
            grandTotal += rowTotal;
  
            tbody.innerHTML += `
              <tr>
                <td>${index + 1}</td>
                <td>${p.product_id}</td>
                <td>${p.description}</td>
                <td>₹${p.unit_price}</td>
                <td>₹${p.selling_price}</td>
                <td>${p.quantity}</td>
                <td>₹${rowTotal}</td>
                <td class="action-icons">
                  <span class="icon edit-icon" title="Edit" onclick="editProduct('${p.product_id}')">✏️</span>
                  <span class="icon delete-icon" title="Delete" onclick="deleteProduct('${p.product_id}')">🗑️</span>
                </td>
              </tr>
            `;
          });
        }
  
        // Add Grand Total row **always**
        tbody.innerHTML += `
          <tr class="total-row">
          <td></td>
                  <td></td>
  
            <td ><b>Grand Total</b></td>
                    <td></td>
          <td></td>
          <td></td>
          
  
            <td><b>₹${grandTotal}</b></td>
            <td></td>
          </tr>
        `;
      })
      .catch(err => {
        console.error("Failed to load products:", err);
        // If fetch fails, still show Grand Total row
        const tbody = document.getElementById("productTableBody");
        tbody.innerHTML = `
          <tr class="total-row">
                  <td></td>
          <td></td>
  
            <td><b>Grand Total</b></td>
                    <td></td>
          <td></td>
          <td></td>
  
            <td><b>₹0</b></td>
            <td></td>
          </tr>
        `;
      });
  }
  
  
  /* ================= DELETE ================= */
  // function deleteProduct(id) {
  //   fetch(`/delete-product/${id}`, { method: "DELETE" })
  //     .then(res => res.json())
  //     .then(() => loadProducts());
  // }
  
  
  
  
  
  
  
  
  
  //EDIT BUTTON
  
  function addProduct(e) {
    e.preventDefault();
  
    const form = isEditMode 
      ? document.getElementById("addProductForm1") 
      : document.getElementById("addProductForm");
  
    const product = {
      product_id: form.product_id.value,
      description: form.description.value,
      unit_price: Number(form.unit_price.value),
      selling_price: Number(form.selling_price.value),
      quantity: Number(form.quantity.value),
    };
  
    product.total = product.selling_price * product.quantity;

    // Disable Add Item button during submission (same pattern as Edit Product Save)
    const addItemBtn = document.getElementById("addItemSubmit");
    if (addItemBtn && !isEditMode) {
      addItemBtn.disabled = true;
    }
  
    const url = isEditMode
      ? `/update-product/${editProductId}`
      : "/add-product";
  
    const method = isEditMode ? "PUT" : "POST";
  
    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          alert(errorData.error || errorData.message || "Operation failed");
          if (addItemBtn && !isEditMode) {
            addItemBtn.disabled = false;
          }
          return;
        }

        const data = await res.json().catch(() => ({}));

        // Check if success (handle both True and true from Python)
        if (data.success !== true && data.success !== "true" && (!isEditMode || !data.success)) {
          alert(data.error || data.message || "Operation failed");
          if (addItemBtn && !isEditMode) {
            addItemBtn.disabled = false;
          }
          return;
        }

        if (isEditMode) {
          // Edit mode: same logic as Edit Product Save button
          try {
            sessionStorage.setItem("enquiry_product_updated", "1");
          } catch (e) {
            console.warn("Unable to persist product-updated flag:", e);
          }

          closeModal("productModal1");
          isEditMode = false;
          editProductId = null;

          window.location.reload();
        } else {
          // Add mode: same logic as Edit Product Save button
          try {
            sessionStorage.setItem("enquiry_product_added", "1");
          } catch (e) {
            console.warn("Unable to persist product-added flag:", e);
          }

          closeModal("productModal");
          isEditMode = false;
          editProductId = null;

          // Full page reload so everything (including other totals) is in sync (exact same pattern as Edit Product Save)
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      })
      .catch((err) => {
        console.error("Error:", err);
        alert("Network error. Try again.");
        if (addItemBtn && !isEditMode) {
          addItemBtn.disabled = false;
        }
      });
  
  
  
  }
  
  
  
  //ADD ITEM ERROR
  
  
  
  
  
  
  
  
  
  
  
  
    // Mapping field names to user-friendly labels
    const fieldLabels = {
      phone_number: "Phone Number",
      first_name: "First Name",
      last_number: "Last Name",
      email: "Email",
      street: "Street Address",
      unit: "Apartment / Suite / Unit",
      city: "City",
      state: "State / Province / Region",
      zip: "Postal / ZIP Code",
      country: "Country",
      enquiry_type: "Enquiry Type",
      enquiry_description: "Enquiry Description",
      enquiry_channel: "Enquiry Channel",
      source: "Source",
      heard_about: "How Did You Hear About This?",
      urgency: "Urgency / Timeline",
      staus: "Status",
      priority: "Priority"
    };
  
    // Add span elements for error messages dynamically
    Object.keys(fieldLabels).forEach(name => {
      const field = form.querySelector(`[name="${name}"]`);
      if (field) {
        const errorSpan = document.createElement("span");
        errorSpan.className = "error-message";
        errorSpan.style.color = "#d32f2f";
        errorSpan.style.fontSize = "12px";
        errorSpan.style.display = "none";
        field.parentNode.appendChild(errorSpan);
      }
    });
  
  
  //HELPER FUNCTION
    function scrollToError(element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
    element.focus();
  }
  
  
  
  
    //PHONE NUMBER
  
  const phoneInput = document.querySelector('input[name="phone_number"]');
  const phoneError = phoneInput.parentNode.querySelector(".error-message");
  
  // ✅ Live phone validation – hide error as soon as value becomes valid
  phoneInput.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, ""); // keep only digits
  
    // Hard limit to 10 digits
    if (value.length > 10) {
      value = value.slice(0, 10);
    }

    // Update field
    e.target.value = value;

    // When 0 < length < 10, we don't show live error; final check happens on submit.
    // When exactly 10 digits, clear any previous error.
    if (value.length === 10 || value.length === 0) {
      phoneError.textContent = "";
      phoneError.style.display = "none";
    } else if (value.length > 10) {
      phoneError.textContent = "Phone Number cannot exceed 10 digits";
      phoneError.style.display = "block";
    }
  });
  
  
  
  //FIRST NAME
  
  
  const firstNameInput = document.querySelector('input[name="first_name"]');
  const firstNameError = firstNameInput.parentNode.querySelector(".error-message");
  
  firstNameInput.addEventListener("input", (e) => {
    // Allow only letters and spaces
    let value = e.target.value.replace(/[^a-zA-Z ]/g, "");
  
    // Limit maximum 20 characters
    if (value.length > 20) {
      value = value.slice(0, 20);
      firstNameError.textContent = "First Name cannot exceed 20 characters";
      firstNameError.style.display = "block";
    } else {
      firstNameError.textContent = "";
      firstNameError.style.display = "none";
    }
  
    e.target.value = value;
  });
  
  
  
  //LAST NAME
  
  
  const lastNameInput = document.querySelector('input[name="last_number"]'); // matches your HTML
  const lastNameError = lastNameInput.parentNode.querySelector(".error-message");
  
  lastNameInput.addEventListener("input", (e) => {
    // Allow only letters and spaces
    let value = e.target.value.replace(/[^a-zA-Z ]/g, "");
  
    // Limit maximum 20 characters
    if (value.length > 20) {
      value = value.slice(0, 20);
      lastNameError.textContent = "Last Name cannot exceed 20 characters";
      lastNameError.style.display = "block";
    } else {
      lastNameError.textContent = "";
      lastNameError.style.display = "none";
    }
  
    e.target.value = value;
  });
  
  
  //EMAIL
  const emailInput = document.querySelector('input[name="email"]');
  const emailError = emailInput.parentNode.querySelector(".error-message");
  
  
  
  //STREET
  
  const streetInput = document.querySelector('input[name="street"]');
  const streetError = streetInput.parentNode.querySelector(".error-message");
  
  streetInput.addEventListener("input", () => {
    // Allow letters, numbers, space, , . /
    let value = streetInput.value.replace(/[^a-zA-Z0-9 ,./-]/g, "");
  
    // Max 100 characters
    if (value.length > 100) {
      value = value.slice(0, 100);
      streetError.textContent = "Street Address cannot exceed 100 characters";
      streetError.style.display = "block";
    } else {
      streetError.textContent = "";
      streetError.style.display = "none";
    }
  
    streetInput.value = value;
  });
  
  
  //CITY
  
  const cityInput = document.querySelector('input[name="city"]');
  const cityError = cityInput.parentNode.querySelector(".error-message");
  
  cityInput.addEventListener("input", () => {
    // Allow letters, numbers, space, , . /
    let value = cityInput.value.replace(/[^a-zA-Z\s]/g, "");
  
    // Max 100 characters
    if (value.length > 30) {
      value = value.slice(0, 30);
      cityError.textContent = "City not exceed 30 character";
      cityError.style.display = "block";
    } else {
      cityError.textContent = "";
      cityError.style.display = "none";
    }
  
    cityInput.value = value;
  });
  
  
  
  
  
  
  //STATE
  const stateInput = document.querySelector('input[name="state"]');
  const stateError = stateInput.parentNode.querySelector(".error-message");
  
  
  stateInput.addEventListener("input", () => {
    // Allow letters, numbers, space, , . /
    let value = stateInput.value.replace(/[^a-zA-Z\s]/g, "");
  
    // Max 100 characters
    if (value.length > 30) {
      value = value.slice(0, 30);
      stateError.textContent = "state not exceed 30 character";
      stateError.style.display = "block";
    } else {
      stateError.textContent = "";
      stateError.style.display = "none";
    }
  
    stateInput.value = value;
  });
  
  
  
  
  
  //ZIP
  
  
  const zipInput = document.querySelector('input[name="zip"]');
  const zipError = zipInput.parentNode.querySelector(".error-message");
  
  // ✅ Live ZIP validation – hide error when value becomes valid
  zipInput.addEventListener("input", () => {
    let value = zipInput.value.replace(/\D/g, ""); // digits only
  
    // Hard limit to 6 digits
    if (value.length > 6) {
      value = value.slice(0, 6);
    }
  
    zipInput.value = value;

    // When exactly 6 digits (or empty while typing), hide error.
    if (value.length === 6 || value.length === 0) {
      zipError.textContent = "";
      zipError.style.display = "none";
    } else if (value.length > 6) {
      zipError.textContent = "PIN code must be exactly 6 digits";
      zipError.style.display = "block";
    }
  });
  
  
  //COUNTRY
  
  
  const countryInput = document.querySelector('input[name="country"]');
  const countryError = countryInput.parentNode.querySelector(".error-message");
  
  
  countryInput.addEventListener("input", () => {
    // Allow letters, numbers, space, , . /
    let value = countryInput.value.replace(/[^a-zA-Z\s]/g, "");
  
    // Max 100 characters
    if (value.length > 30) {
      value = value.slice(0, 30);
      countryError.textContent = "country not exceed 30 character";
      countryError.style.display = "block";
    } else {
      countryError.textContent = "";
      countryError.style.display = "none";
    }
  
    countryInput.value = value;
  });
  
  
  
  //ENQUIRY DESCRIPTION
  
  
  
  const enquiryDescInput = document.querySelector('input[name="enquiry_description"]');
  const enquiryDescError = enquiryDescInput.parentNode.querySelector(".error-message");
  
  enquiryDescInput.addEventListener("input", () => {
    let value = enquiryDescInput.value;
  
    if (value.length > 200) {
      value = value.slice(0, 200);
      enquiryDescError.textContent = "Max 200 characters allowed";
      enquiryDescError.style.display = "block";
    } else {
      enquiryDescError.textContent = "";
      enquiryDescError.style.display = "none";
    }
  
    enquiryDescInput.value = value;
  });
  
  
  
  //ENQUIRY TYPE
  
  const enquiryTypeSelect = document.querySelector('select[name="enquiry_type"]');
  const enquiryTypeError = enquiryTypeSelect.parentNode.querySelector(".error-message");
  enquiryTypeSelect.addEventListener("change", () => {
    if (enquiryTypeSelect.value !== "") {
      // User selected a valid option → hide error
      enquiryTypeError.textContent = "";
      enquiryTypeError.style.display = "none";
    }
  });
  
  
  //ENQUIRY CHANNEL
  
  
  const enquiryChannelSelect = document.querySelector('select[name="enquiry_channel"]');
  const enquiryChannelError = enquiryChannelSelect.parentNode.querySelector(".error-message");
  enquiryChannelSelect.addEventListener("change", () => {
    if (enquiryChannelSelect.value !== "") {
      // User selected a valid option → hide error
      enquiryChannelError.textContent = "";
      enquiryChannelError.style.display = "none";
    }
  });
  
  
  //SOURCE
  
  
  const sourceSelect = document.querySelector('select[name="source"]');
  const sourceError = sourceSelect.parentNode.querySelector(".error-message");
  sourceSelect.addEventListener("change", () => {
    if (sourceSelect.value !== "") {
      // User selected a valid option → hide error
      sourceError.textContent = "";
      sourceError.style.display = "none";
    }
  });
  
  
  //HOW DID
  
  const heardSelect = document.querySelector('select[name="heard_about"]');
  const heardError = heardSelect.parentNode.querySelector(".error-message");
  heardSelect.addEventListener("change", () => {
    if (heardSelect.value !== "") {
      // User selected a valid option → hide error
      heardError.textContent = "";
      heardError.style.display = "none";
    }
  });
  
  //URGENCY
  
  
  
  const urgencySelect = document.querySelector('select[name="urgency"]');
  const urgencyError = urgencySelect.parentNode.querySelector(".error-message");
  urgencySelect.addEventListener("change", () => {
    if (urgencySelect.value !== "") {
      // User selected a valid option → hide error
      urgencyError.textContent = "";
      urgencyError.style.display = "none";
    }
  });
  
  
  
  
  //STATUS
  
  
  
  const statusSelect = document.querySelector('select[name="staus"]');
  const statusError = statusSelect.parentNode.querySelector(".error-message");
  statusSelect.addEventListener("change", () => {
    if (statusSelect.value !== "") {
      // User selected a valid option → hide error
      statusError.textContent = "";
      statusError.style.display = "none";
    }
  });
  
  
  
  
  //PRIORITY
  
  
  const prioritySelect = document.querySelector('select[name="priority"]');
  const priorityError =prioritySelect.parentNode.querySelector(".error-message");
  prioritySelect.addEventListener("change", () => {
    if (prioritySelect.value !== "") {
      // User selected a valid option → hide error
     priorityError.textContent = "";
      priorityError.style.display = "none";
    }
  });
  
  
  //UNIT
  
  
  
  const unitInput = document.querySelector('input[name="unit"]');
  const unitError = unitInput.parentNode.querySelector(".error-message");
  
  unitInput.addEventListener("input", () => {
    if (unitInput.value.trim() !== "") {
      unitError.textContent = "";
      unitError.style.display = "none";
    }
  });
  
  
  //EMAIL
  
  // const emailInput1 = document.querySelector('input[name="email"]');
  // const emailError1 = emailInput1.parentNode.querySelector(".error-message");
  
  // emailInput1.addEventListener("input", () => {
  //   if (emailInput1.value.trim() !== "") {
  //     emailError1.textContent = "";
  //     emailError1.style.display = "none";
  //   }
  // });
  
  
  
  //ADD ITEM VALIDATION
  
  
  const unitPriceInput = document.querySelector('input[name="unit_price"]');
  const unitPriceError = unitPriceInput.parentNode.querySelector(".error-message");
  
  unitPriceInput.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, ""); // remove non-digits
  
    if (value.length > 10) {
      value = value.slice(0, 10); // limit to 10 digits
      // unitPriceError.textContent = "Phone Number cannot exceed 10 digits"; // show error
      unitPriceError.style.display = "block";
      
    } else {
      unitPriceError.textContent = ""; // clear error if <=10
      unitPriceError.style.display = "none";
      
    }
  
    e.target.value = value;
  });
  
  
  
  
  const sellingpriceInput = document.querySelector('input[name="selling_price"]');
  const sellingpriceError = sellingpriceInput.parentNode.querySelector(".error-message");
  
  sellingpriceInput.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, ""); // remove non-digits
  
    if (value.length > 10) {
      value = value.slice(0, 10); // limit to 10 digits
      // unitPriceError.textContent = "Phone Number cannot exceed 10 digits"; // show error
      sellingpriceError.style.display = "block";
      
    } else {
      sellingpriceError.textContent = ""; // clear error if <=10
      sellingpriceError.style.display = "none";
      
    }
  
    e.target.value = value;
  });
  
  
  
  
  
  
  
  
  const quantityInput = document.querySelector('input[name="quantity"]');
  const quantityError = quantityInput.parentNode.querySelector(".error-message");
  
  quantityInput.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, ""); // remove non-digits
  
    if (value.length > 10) {
      value = value.slice(0, 10); // limit to 10 digits
      // unitPriceError.textContent = "Phone Number cannot exceed 10 digits"; // show error
      quantityError.style.display = "block";
      
    } else {
      quantityError.textContent = ""; // clear error if <=10
      quantityError.style.display = "none";
      
    }
  
    e.target.value = value;
  });
  
  
  
  
  
  const descInput = document.querySelector('input[name="description"]');
  const descError = descInput.parentNode.querySelector(".error-message");
  
  descInput.addEventListener("input", () => {
    let value = descInput.value;
  
    if (value.length > 20) {
      value = value.slice(0, 20);
      // enquiryDescError.textContent = "Max 200 characters allowed";
      descError.style.display = "block";
    } else {
      descError.textContent = "";
      descError.style.display = "none";
    }
  
    descInput.value = value;
  });
  
  
  
  
  
  const unitPriceInput1 = document.getElementById('unit_price');
  const unitPriceError1 = unitPriceInput1.parentNode.querySelector(".error-message");
  
  unitPriceInput1.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, ""); // remove non-digits
  
    if (value.length > 10) {
      value = value.slice(0, 10); // limit to 10 digits
      // unitPriceError.textContent = "Phone Number cannot exceed 10 digits"; // show error
      unitPriceError1.style.display = "block";
      
    } else {
      unitPriceError1.textContent = ""; // clear error if <=10
      unitPriceError1.style.display = "none";
      
    }
  
    e.target.value = value;
    updateEditProductButtonState(); // Update button state on input
  });
  
  
  
  
  
  
  const unitPriceInput2 = document.getElementById('selling_price');
  const unitPriceError2 = unitPriceInput2.parentNode.querySelector(".error-message");
  
  unitPriceInput2.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, ""); // remove non-digits
  
    if (value.length > 10) {
      value = value.slice(0, 10); // limit to 10 digits
      // unitPriceError.textContent = "Phone Number cannot exceed 10 digits"; // show error
      unitPriceError2.style.display = "block";
      
    } else {
      unitPriceError2.textContent = ""; // clear error if <=10
      unitPriceError2.style.display = "none";
      
    }
  
    e.target.value = value;
    updateEditProductButtonState(); // Update button state on input
  });
  
  
  
  
  
  
  
  
  
    
  const quantityInput1= document.getElementById('quantity');
  const quantityError1 = quantityInput1.parentNode.querySelector(".error-message");
  
  quantityInput1.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, ""); // remove non-digits
  
    if (value.length > 10) {
      value = value.slice(0, 10); // limit to 10 digits
      // unitPriceError.textContent = "Phone Number cannot exceed 10 digits"; // show error
      quantityError1.style.display = "block";
      
    } else {
      quantityError1.textContent = ""; // clear error if <=10
      quantityError1.style.display = "none";
      
    }
  
    e.target.value = value;
    updateEditProductButtonState(); // Update button state on input
  });
  
  
  
  
  
  
  
  
  const descInput1 = document.getElementById('description');
  const descError1 = descInput1.parentNode.querySelector(".error-message");
  
  descInput1.addEventListener("input", () => {
    let value = descInput1.value;
  
    if (value.length > 20) {
      value = value.slice(0, 20);
      // enquiryDescError.textContent = "Max 200 characters allowed";
      descError1.style.display = "block";
    } else {
      descError1.textContent = "";
      descError1.style.display = "none";
    }
  
    descInput1.value = value;
    updateEditProductButtonState(); // Update button state on input
  });
  
  
  async function checkEmailExists(email) {
    console.log("Calling /check-email API");
  
    const res = await fetch("/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
  
    const data = await res.json();
    console.log("Email exists response:", data);
  
    return data.exists;
  }
  
  
  
  
    // ================= Form submit =================
    form.addEventListener("submit",async (e) => {
      e.preventDefault();
  
      // let isValid = true;
      let isValid = true;
    let firstErrorField = null;
  Object.keys(fieldLabels).forEach(name => {
    const field = form.querySelector(`[name="${name}"]`);
    const errorSpan = field.parentNode.querySelector(".error-message");
  
    if (!field.value || field.value === "Select Enquiry Type" || field.value === "Pick an Option") {
      errorSpan.textContent = `${fieldLabels[name]} is required`;
      errorSpan.style.display = "block";
      isValid = false;
  
      // 🔥 FIX — only set ONCE
      if (!firstErrorField) {
        firstErrorField = field;
      }
    } else {
      errorSpan.textContent = "";
      errorSpan.style.display = "none";
    }
  });
  
  
  //PHONE NUMBER
  if (phoneInput.value==false) {
    phoneError.textContent = "Phone Number is required";
        if (!firstErrorField) firstErrorField = phoneInput;
  
  
  }
  
  else  if (phoneInput.value.length !== 10) {
    phoneError.textContent = "Phone Number must be exactly 10 digits";
    phoneError.style.display = "block";
    isValid = false;
        if (!firstErrorField) firstErrorField = phoneInput;
  
  } else {
    phoneError.textContent = "";
    phoneError.style.display = "none";
  }
  
  
  
  //FIRST NAME
  
  
  
  const firstNameValue = firstNameInput.value.trim();
  if(firstNameValue==false){
      firstNameError.textContent="First Name is required";
          if (!firstErrorField) firstErrorField = firstNameInput;
  
  }
  
  else if (firstNameValue.length < 3) {
    firstNameError.textContent = "First Name must be at least 3 characters";
    firstNameError.style.display = "block";
    isValid = false;
        if (!firstErrorField) firstErrorField = firstNameInput;
  
  } else {
    firstNameError.textContent = "";
    firstNameError.style.display = "none";
  }
  
  //EMAIL
  
  
  
  const emailValue = emailInput.value.trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailValue) {
    emailError.textContent = "Email is required";
    emailError.style.display = "block";
    isValid = false;
     if (!firstErrorField) firstErrorField = emailInput;
  
  } else if (!emailPattern.test(emailValue)) {
    emailError.textContent = "Please enter a valid email address";
    emailError.style.display = "block";
    isValid = false;
        if (!firstErrorField) firstErrorField = emailInput;
  
  } else {
    emailError.textContent = "";
    emailError.style.display = "none";
  }
  
  
  //STREET
  
  
  const streetValue = streetInput.value.trim();
  
  if (!streetValue) {
    streetError.textContent = "Street Address is required";
    streetError.style.display = "block";
    isValid = false;
        if (!firstErrorField) firstErrorField = streetInput;
  
  } else if (streetValue.length < 5) {
    streetError.textContent = "Street Address must be at least 5 characters";
    streetError.style.display = "block";
    isValid = false;
        if (!firstErrorField) firstErrorField = streetInput;
  
  } else {
    streetError.textContent = "";
    streetError.style.display = "none";
  }
  
  
  //CITY
  const cityValue = cityInput.value.trim();
  
  if (cityValue === "") {
    cityError.textContent = "City is required";
    cityError.style.display = "block";
    isValid = false;
        if (!firstErrorField) firstErrorField = cityInput;
  
  } else if (cityValue.length < 3) {
    cityError.textContent = "City must be at least 3 characters";
    cityError.style.display = "block";
    isValid = false;
        if (!firstErrorField) firstErrorField = cityInput;
  
  }
  
  //STATE
  
  
  
  const stateValue = stateInput.value.trim();
  
  if (stateValue === "") {
    stateError.textContent = "State is required";
    stateError.style.display = "block";
    isValid = false;
        if (!firstErrorField) firstErrorField = stateInput;
  
  } else if (stateValue.length < 2) {
    stateError.textContent = "State must be at least 2 characters";
    stateError.style.display = "block";
    isValid = false;
        if (!firstErrorField) firstErrorField = stateInput;
  
  }
  
  
  
  
  //ZIP
  
  
  
  
  const zipValue = zipInput.value.trim();
  
  if (zipValue === "") {
    zipError.textContent = "ZIP / PIN code is required";
    zipError.style.display = "block";
    isValid = false;
        if (!firstErrorField) firstErrorField =zipInput;
  
  } else if (zipValue.length !== 6) {
    zipError.textContent = "PIN code must be exactly 6 digits";
    zipError.style.display = "block";
    isValid = false;
        if (!firstErrorField) firstErrorField = zipInput;
  
  }
  
  
  
  //COUNTRY
  
  
  
  const countryValue = countryInput.value.trim();
  
  if (countryValue === "") {
    countryError.textContent = "Country is required";
    countryError.style.display = "block";
    isValid = false;
        if (!firstErrorField) firstErrorField = countryInput;
  
  } else if (countryValue.length < 3) {
    countryError.textContent = "Country must be at least 3 characters";
    countryError.style.display = "block";
    isValid = false;
        if (!firstErrorField) firstErrorField = countryInput;
  
  }
  
  
  //ENQUIRY DESCRIPTION
  
  
  
  
  const enquiryDescValue = enquiryDescInput.value.trim();
  
  if (enquiryDescValue === "") {
    enquiryDescError.textContent = "Enquiry Description is required";
    enquiryDescError.style.display = "block";
    isValid = false;
        if (!firstErrorField) firstErrorField = enquiryDescInput;
  
  } else if (enquiryDescValue.length < 5) {
    enquiryDescError.textContent =
      "Enquiry Description must be at least 5 characters";
    enquiryDescError.style.display = "block";
    isValid = false;
        if (!firstErrorField) firstErrorField = enquiryDescInput;
  
  }
  
  
  
    // 🚨 Move to first error
    if (!isValid) {
      scrollToError(firstErrorField);
      return;
    }
  
  
  
  
  // ================= EMAIL EXISTS CHECK =================
  const emailExists = await checkEmailExists(emailValue);
  
  if (emailExists) {
    emailError.textContent = "This email already exists";
    emailError.style.display = "block";
    scrollToError(emailInput);
    return; // ❌ STOP submit here
  }
  
  
      // if (!isValid) return; // stop if validation failed
  
      // Show confirmation popup if validation passed
      overlay.style.display = "flex";
    });
  
    // ================= Cancel =================
    confirmCancel.addEventListener("click", () => {
      overlay.style.display = "none";
    });
  
    // ================= OK =================
    confirmOk.addEventListener("click", () => {
      overlay.style.display = "none";

      // Disable submit button during save
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.textContent = "Saving...";
      }
  
      // Collect form data
      const formData = new FormData(form);
      let enquiryData = {};
      formData.forEach((value, key) => {
        enquiryData[key] = value;
      });
  
      // Send to backend
      fetch("/save-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enquiryData),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));

          if (!res.ok || data.status !== "success") {
            const errMsg =
              data.error ||
              data.message ||
              "Enquiry could not be created. Please check the details and try again.";

            showErrorNotification(errMsg);
            showSuccessModal(errMsg, null);

            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent =
                submitBtn.dataset.originalText || "Submit";
              delete submitBtn.dataset.originalText;
            }
            return;
          }

          // ✅ Success - same UX as Create New Customer / Product
          const newId = data.enquiry_id || enquiryIdInput.value;

          // Top success banner
          showSuccessNotification("Enquiry has been created successfully");

          // Center popup with green tick + ID and redirect to Enquiry List
          showSuccessModal(
            `✅ Enquiry saved successfully (ID: ${newId})`,
            "/enquiry-list"
          );

          // Reset form + enquiry ID (in case user stays on page)
          form.reset();
          enquiryIdInput.value = "ENQ-XXXX";

          // Reset submit button
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent =
              submitBtn.dataset.originalText || "Submit";
            delete submitBtn.dataset.originalText;
          }
        })
        .catch((err) => {
          console.error("❌ Error saving enquiry:", err);
          showErrorNotification(
            "❌ Enquiry could not be created. Please try again."
          );
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent =
              submitBtn.dataset.originalText || "Submit";
            delete submitBtn.dataset.originalText;
          }
        });
    });
  
    // ================= Reset =================
    form.addEventListener("reset", () => {
      overlay.style.display = "none";
      enquiryIdInput.value = "ENQ-XXXX";
      // Hide all error messages
      form.querySelectorAll(".error-message").forEach(span => span.style.display = "none");
    });   
  });