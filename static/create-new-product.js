document.addEventListener("DOMContentLoaded", () => {
    /* ================= ELEMENTS ================= */
    const form = document.getElementById("createProductForm");
    const discardBtn = document.getElementById("discardBtn");
    const productTypeSelect = document.getElementById("productTypeSelect");
    const categorySelect = document.getElementById("categorySelect");
    const taxCodeSelect = document.getElementById("taxCodeSelect");
  
    const imageInput = document.getElementById("productImage");
    const productIdInput = document.querySelector("input[name='product_id']");
  
    // Helper: get 11 from "gst1 (11%)"
    function extractPercent(text) {
      const m = text.match(/\((\d+(?:\.\d+)?)%\)/);
      return m ? m[1] : "";
    }
  
    // Helper: Normalize spaces - replace multiple spaces with single space
    function normalizeSpaces(inputEl) {
      if (!inputEl) return;
      
      inputEl.addEventListener("input", (e) => {
        const original = e.target.value;
        // Replace multiple spaces (2 or more) with single space
        const normalized = original.replace(/\s{2,}/g, " ");
        
        // Only update if there was a change (to avoid cursor jumping issues)
        if (normalized !== original) {
          const cursorPos = e.target.selectionStart;
          e.target.value = normalized;
          // Adjust cursor position after normalization
          const newCursorPos = Math.max(0, cursorPos - (original.length - normalized.length));
          e.target.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
    }

    // Apply space normalization to all text input fields
    // Get all text inputs, textareas, and email inputs (excluding readonly and number inputs)
    const allTextInputs = document.querySelectorAll(
      'input[type="text"], input[type="email"], textarea'
    );
    
    allTextInputs.forEach(input => {
      // Skip readonly inputs and inputs that are already handled by specific restrictions
      if (input.readOnly) return;
      
      // Apply normalization
      normalizeSpaces(input);
    });
  
    /* =========================================================
       GLOBAL MODAL HELPERS (FOR ALL MODALS)
    ========================================================= */
    let activeModal = null;
  
    function showModal(modal, focusEl = null) {
      if (!modal) return;
      modal.classList.add("show");
      activeModal = modal;
  
      modal.setAttribute("tabindex", "-1");
      modal.focus();
  
      if (focusEl) {
        setTimeout(() => focusEl.focus(), 50);
      } else {
        const firstInput = modal.querySelector("input, select, button, textarea");
        if (firstInput) setTimeout(() => firstInput.focus(), 50);
      }
    }
  
    function hideModal(modal, returnFocusEl = null) {
      if (!modal) return;
      modal.classList.remove("show");
      if (activeModal === modal) activeModal = null;
  
      if (returnFocusEl) setTimeout(() => returnFocusEl.focus(), 50);
    }
  
    // Click outside closes modal
    function outsideClickClose(modal) {
      if (!modal) return;
      modal.addEventListener("click", (e) => {
        if (e.target === modal) hideModal(modal);
      });
    }
  
    // TAB Trap (keep focus inside modal)
    function getFocusable(modal) {
      return Array.from(
        modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !el.disabled && el.offsetParent !== null);
    }
  
    document.addEventListener("keydown", (e) => {
      // ESC key: close active modal
      if (e.key === "Escape" && activeModal) {
        // If closing Delete Category modal, restore Edit Category modal
        if (activeModal === deleteCategoryModal) {
          hideModal(activeModal);
          pendingDeleteCategoryValue = null;
          if (editCategoryModal) {
            showModal(editCategoryModal);
          }
        } else if (activeModal === deleteTaxCodeModal) {
          // If closing Delete Tax Code modal, restore Edit Tax Code modal
          hideModal(activeModal);
          pendingDeleteTaxCodeValue = null;
          if (editTaxCodeModal) {
            showModal(editTaxCodeModal);
          }
        } else if (activeModal === deleteUomModal) {
          // If closing Delete UOM modal, restore Edit UOM modal
          hideModal(activeModal);
          pendingDeleteUomValue = null;
          if (editUomModal) {
            showModal(editUomModal);
          }
        } else if (activeModal === deleteWarehouseModal) {
          // If closing Delete Warehouse modal, restore Edit Warehouse modal
          hideModal(activeModal);
          pendingDeleteWarehouseValue = null;
          if (editWarehouseModal) {
            showModal(editWarehouseModal);
          }
        } else if (activeModal === deleteSizeModal) {
          // If closing Delete Size modal, restore Size modal (edit mode)
          hideModal(activeModal);
          pendingDeleteSizeValue = null;
          if (sizeModal && typeof openSizeModal === "function") {
            openSizeModal("edit");
          }
        } else if (activeModal === deleteColorModal) {
          // If closing Delete Color modal, restore Color modal (edit mode)
          hideModal(activeModal);
          pendingDeleteColorValue = null;
          if (colorModal && typeof openColorModal === "function") {
            openColorModal("edit");
          }
        } else if (activeModal === deleteSupplierModal) {
          // If closing Delete Supplier modal, restore Supplier modal (edit mode)
          hideModal(activeModal);
          pendingDeleteSupplierValue = null;
          if (supplierModal && typeof openSupplierModal === "function") {
            openSupplierModal("edit");
          }
        } else {
          hideModal(activeModal);
        }
        return;
      }

      // Tab key: trap focus inside modal
      if (e.key !== "Tab") return;
      if (!activeModal) return;
  
      const focusables = getFocusable(activeModal);
      if (!focusables.length) return;
  
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
  
      if (!activeModal.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
        return;
      }
  
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  
    /* =========================================================
       SUCCESS POPUP HELPER
    ========================================================= */
    const successModal   = document.getElementById("successModal");
    const successMessage = document.getElementById("successMessage");
    const successOkBtn   = document.getElementById("successOkBtn");
    let successRedirectUrl = null;
  
    outsideClickClose(successModal);
  
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
      activeModal = successModal;
  
      if (successOkBtn) {
        successOkBtn.focus();
      }
    }
  
    if (successOkBtn) {
      successOkBtn.addEventListener("click", () => {
        hideModal(successModal);
        if (successRedirectUrl) {
          window.location.href = successRedirectUrl;
        }
      });
    }

    /* =========================================================
       GLOBAL SUCCESS / ERROR TOASTS
       (same design as Department & Roles)
    ========================================================= */
    function showSuccessNotification(message) {
      // Remove existing notification if any
      const existing = document.querySelector(".success-notification");
      if (existing) existing.remove();

      // Ensure body exists
      if (!document.body) {
        console.error("Cannot show notification: document.body not available");
        return;
      }

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

    function showErrorNotification(message) {
      const existingSuccess = document.querySelector(".success-notification");
      const existingError = document.querySelector(".error-notification");
      if (existingSuccess) existingSuccess.remove();
      if (existingError) existingError.remove();

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
  
    /* ================= DISCARD BUTTON ================= */
    if (discardBtn) {
      discardBtn.addEventListener("click", () => {
        window.location.href = "/products";
      });
    }
  
    /* =========================================================
       REGEX CONSTANTS
    ========================================================= */
      const PRODUCT_NAME_REGEX = /^[A-Za-z\s]{3,30}$/; // Only letters & spaces, 3–30 chars
  
    // Category: ONLY alphabets + spaces, length 3–50
    const CATEGORY_REGEX = /^(?=.*[A-Za-z])[A-Za-z\s]{3,50}$/;
  
    //  SIZE: letters, numbers, space, /, -   (1–20 chars)
    const SIZE_REGEX = /^(?=.*[A-Za-z0-9])[A-Za-z0-9\/\-\s]{1,20}$/;
  
    //  COLOR: only letters + spaces (3–20 chars)
    const COLOR_REGEX = /^(?=.*[A-Za-z])[A-Za-z\s]{3,20}$/;
  
    //  WEIGHT: 1–4 digits, optional .xx, optional unit (g, kg, mg, lb, oz, ml, l)
    const WEIGHT_REGEX =
      /^(?=.*\d)\d{1,4}(\.\d{1,2})?\s*(g|kg|mg|lb|oz|ml|l)?$/i;
  
    // ================= WAREHOUSE & INVENTORY REGEX =================
    const WAREHOUSE_NAME_REGEX =
      /^(?=.*[A-Za-z])[A-Za-z0-9][A-Za-z0-9\s&\-\/.,()]{2,49}$/; // 3–50 chars
  
    const LOCATION_REGEX =
      /^[A-Za-z0-9\s,.\-\/]{5,100}$/; // 5–100 chars, basic address chars
  
    const MANAGER_NAME_REGEX = /^[A-Za-z\s]{3,40}$/; // only letters + space
  
    const PHONE_OR_EMAIL_REGEX =
      /^(?:[0-9]{7,15}|[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})$/;
    // either 7–15 digit phone OR simple email
  
    // ================= SUPPLIER VALIDATION REGEX =================
    const SUPPLIER_NAME_REGEX   = /^[A-Za-z0-9 .,&'-]{3,60}$/; // 3–60 chars
    const PERSON_NAME_REGEX     = /^[A-Za-z\s]{3,40}$/;        // only letters + spaces
    const SUPPLIER_PHONE_REGEX  = /^(?:\+91[-\s]?)?[6-9]\d{9}$/; // Indian phone
    const SUPPLIER_EMAIL_REGEX  =
      /^[A-Za-z0-9._%+-]{3,40}@(gmail\.com|yahoo\.com|yahoo\.co\.in|outlook\.com|hotmail\.com|thestackly\.com|stackly\.in)$/i;
  
    // UOM name: at least 3, max 50 chars (letters, numbers, hyphen, space)
    const UOM_NAME_REGEX = /^(?=.*[A-Za-z])[A-Za-z0-9\s\-]{3,50}$/;
  
    /* =========================================================
        PRODUCT TYPE → CATEGORY MAP
    ========================================================= */
    const categoryMap = {
      /* Furniture */
      Furniture: [
        "Living Room",
        "Office",
        "Bedroom",
        "Dining Room",
        "Storage"
      ],
  
      /* Lighting */
      Lighting: [
        "Bedroom",
        "Home Decor",
        "Living Room"
      ],
  
      /* Electronics */
      Electronics: [
        "Accessories",
        "Audio",
        "Gadgets",
        "Appliances"
      ],
  
      /* Apparel */
      Apparel: [
        "Clothing",
        "Bedding"
      ],
  
      /* Kitchen */
      Kitchen: [
        "Drinkware",
        "Cookware",
        "Containers"
      ],
  
      /* Decor */
      Decor: [
        "Home Decor",
        "Wall Decor",
        "Table Decor"
      ],
  
      /* Fitness */
      Fitness: [
        "Exercise",
        "Gym Equipment"
      ],
  
      /* Stationery */
      Stationery: [
        "Office",
        "Storage"
      ],
  
      /* Outdoor */
      Outdoor: [
        "Garden",
        "Maintenance",
        "Sports"
      ],
  
      /* Appliances */
      Appliances: [
        "Home Appliances",
        "Kitchen",
        "Gadgets"
      ],
  
      /* Toys */
      Toys: [
        "Kids",
        "Learning"
      ],
  
      /* Beauty */
      Beauty: [
        "Personal Care",
        "Accessories"
      ]
    };
  
    if (categorySelect) categorySelect.disabled = false;

    // In‑memory cache so categories are read from JSON only once per type
    const savedCategoryCache = {};
  
    // Helper: load extra categories saved in backend for selected type
    function loadSavedCategoriesForType(selectedType) {
      if (!categorySelect) return;
  
      const hasType = !!selectedType;
      const typeKey = hasType ? selectedType.toLowerCase() : "__all__";
  
      // If we already fetched for this scope, use fast in‑memory cache
      if (savedCategoryCache[typeKey]) {
        savedCategoryCache[typeKey].forEach(name => {
          const catName = (name || "").trim();
          if (!catName) return;
          const exists = Array.from(categorySelect.options)
            .some(o => (o.value || "").toLowerCase() === catName.toLowerCase());
          if (!exists) {
            categorySelect.appendChild(new Option(catName, catName));
          }
        });
        return;
      }
  
      // Build URL: if no type → get all categories once
      const url = hasType
        ? `/api/product-categories?type=${encodeURIComponent(selectedType)}`
        : "/api/product-categories";
  
      // First time for this type → fetch from backend JSON via API, then cache
      fetch(url)
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (!data || !data.success || !Array.isArray(data.categories)) return;
  
          savedCategoryCache[typeKey] = data.categories.slice();
  
          data.categories.forEach(cat => {
            const name = (cat || "").trim();
            if (!name) return;
  
            const exists = Array.from(categorySelect.options)
              .some(o => (o.value || "").toLowerCase() === name.toLowerCase());
  
            if (!exists) {
              categorySelect.appendChild(new Option(name, name));
            }
          });
        })
        .catch(() => {
          // silent fail: don’t block UI if API not available
        });
    }
  
    if (productTypeSelect && categorySelect) {
      productTypeSelect.addEventListener("change", () => {
        const selectedType = productTypeSelect.value;
  
        categorySelect.innerHTML = '<option value="">Select Category</option>';
  
        if (!selectedType) {
          // When no product type selected, still show any global/user categories
          categorySelect.disabled = false;
          loadSavedCategoriesForType("");
          return;
        }
  
        categorySelect.disabled = false;
  
        // default/static categories
        if (categoryMap[selectedType]) {
        categoryMap[selectedType].forEach(cat => {
          categorySelect.appendChild(new Option(cat, cat));
        });
        }
  
        // plus any user-saved categories from backend
        loadSavedCategoriesForType(selectedType);
      });
    }

    // On initial load, pre-fill Category dropdown from JSON (global list)
    if (categorySelect) {
      loadSavedCategoriesForType("");
    }
  
    // extra safety: do not allow invalid category values
    if (categorySelect) {
      categorySelect.addEventListener("change", () => {
        const val = categorySelect.value;
        if (!val) return;
  
        if (!CATEGORY_REGEX.test(val)) {
          alert("❌ Invalid category name. Please choose a valid one.");
          categorySelect.value = "";
        }
      });
    }
  
    /* =========================================================
       IMAGE VALIDATION + PREVIEW
    ========================================================= */
    if (imageInput) {
      imageInput.addEventListener("change", () => {
        const file = imageInput.files[0];
        const imageError = document.querySelector(".upload-box .error-msg");
        const preview = document.getElementById("imagePreview");
        const placeholder = document.getElementById("uploadPlaceholder");
        const uploadHint = document.getElementById("uploadHint");
  
        if (!file) return;
  
        // type check
        if (!file.type.startsWith("image/")) {
          if (imageError) {
            imageError.innerText = "Only image files allowed!";
            imageError.style.display = "block";
          }
          imageInput.value = "";
          if (preview) preview.style.display = "none";
          if (placeholder) placeholder.style.display = "block";
          if (uploadHint) uploadHint.style.display = "block";
          return;
        }
  
        // size check
        if (file.size > 2 * 1024 * 1024) {
          if (imageError) {
            imageError.innerText = "Image must be under 2MB!";
            imageError.style.display = "block";
          }
          imageInput.value = "";
          if (preview) preview.style.display = "none";
          if (placeholder) placeholder.style.display = "block";
          if (uploadHint) uploadHint.style.display = "block";
          return;
        }
  
        // preview
        const reader = new FileReader();
        reader.onload = () => {
          if (preview) {
            preview.src = reader.result;
            preview.style.display = "block";
          }
          if (placeholder) placeholder.style.display = "none";
          if (uploadHint) uploadHint.style.display = "none";
        };
        reader.readAsDataURL(file);
  
        if (imageError) {
          imageError.innerText = "";
          imageError.style.display = "none";
        }
      });
    }
  
    /* =========================================================
       CATEGORY MODALS
    ========================================================= */
    const addNewCategoryLink = document.getElementById("addNewCategoryLink");
  
    const addCategoryModal = document.getElementById("addCategoryModal");
    const editCategoryModal = document.getElementById("editCategoryModal");
  
    const closeAddCategory = document.getElementById("closeAddCategory");
    const cancelAddCategory = document.getElementById("cancelAddCategory");
    const openEditCategoryBtn = document.getElementById("openEditCategoryBtn");
  
    const backToAddCategory = document.getElementById("backToAddCategory");
    const goAddNewBtn = document.getElementById("goAddNewBtn");
    const cancelEditCategory = document.getElementById("cancelEditCategory");
  
    const newCategoryName = document.getElementById("newCategoryName");
    const createCategoryBtn = document.getElementById("createCategoryBtn");
    const newCategoryError = document.getElementById("newCategoryError");

    // Validate Create Category button state
    function validateCreateCategory() {
      if (!createCategoryBtn) return;
      
      const name = (newCategoryName?.value || "").trim();
      
      // Check if category name is valid (at least 3 chars, matches regex)
      const CATEGORY_REGEX = /^[A-Za-z\s]{3,50}$/;
      const hasValidName = name && name.length >= 3 && CATEGORY_REGEX.test(name);
      
      // Check for duplicate (case-insensitive)
      let noDuplicate = true;
      if (hasValidName && categorySelect) {
        const exists = Array.from(categorySelect.options)
          .some(o => (o.value || "").toLowerCase() === name.toLowerCase());
        noDuplicate = !exists;
      }
      
      // Enable button only if all validations pass
      createCategoryBtn.disabled = !(hasValidName && noDuplicate);
    }
  
    const selectCategory = document.getElementById("selectCategory");
    const updateCategoryName = document.getElementById("updateCategoryName");
    const updateCategoryBtn = document.getElementById("updateCategoryBtn");
    const removeCategoryBtn = document.getElementById("removeCategoryBtn");
    const updateCategoryError = document.getElementById("updateCategoryError");

    // Delete Category Modal
    const deleteCategoryModal = document.getElementById("deleteCategoryModal");
    const deleteCategoryText = document.getElementById("deleteCategoryText");
    const cancelCategoryDeleteBtn = document.getElementById("cancelCategoryDeleteBtn");
    const confirmCategoryDeleteBtn = document.getElementById("confirmCategoryDeleteBtn");
    let pendingDeleteCategoryValue = null;
  
    outsideClickClose(addCategoryModal);
    outsideClickClose(editCategoryModal);
    
    // Custom outside click handler for Delete Category modal - restore Edit Category modal
    if (deleteCategoryModal) {
      deleteCategoryModal.addEventListener("click", (e) => {
        if (e.target === deleteCategoryModal) {
          hideModal(deleteCategoryModal);
          pendingDeleteCategoryValue = null;
          // Show Edit Category modal again
          if (editCategoryModal) {
            showModal(editCategoryModal);
          }
        }
      });
    }

    // Restrict Category Name inputs to alphabets and spaces while typing
    const CATEGORY_KEYBOARD_REGEX = /[^A-Za-z\s]/g;
    [newCategoryName, updateCategoryName].forEach(inputEl => {
      if (!inputEl) return;
      inputEl.addEventListener("input", () => {
        const original = inputEl.value || "";
        const cleaned = original.replace(CATEGORY_KEYBOARD_REGEX, "");
        if (cleaned !== original) {
          inputEl.value = cleaned;
        }
        // clear error when user corrects input
        if (newCategoryError && inputEl === newCategoryName) {
          newCategoryError.innerText = "";
          newCategoryError.style.display = "none";
        }
        if (inputEl === newCategoryName) {
          validateCreateCategory();
        }
      });
    });

    // Initial validation (button starts disabled)
    validateCreateCategory();
  
    // open Add Category
    if (addNewCategoryLink) {
      addNewCategoryLink.addEventListener("click", (e) => {
        e.preventDefault();
        hideModal(editCategoryModal);
        if (newCategoryName) newCategoryName.value = "";
        if (newCategoryError) {
          newCategoryError.innerText = "";
          newCategoryError.style.display = "none";
        }
        validateCreateCategory(); // Reset button state
        showModal(addCategoryModal, newCategoryName);
      });
    }
  
    // close Add Category
    [closeAddCategory, cancelAddCategory].forEach(btn => {
      if (btn) btn.addEventListener("click", () => {
        hideModal(addCategoryModal, addNewCategoryLink);
        validateCreateCategory(); // Reset button state
      });
    });
  
    // Add -> Edit
    if (openEditCategoryBtn) {
      openEditCategoryBtn.addEventListener("click", () => {
        hideModal(addCategoryModal);
  
        if (selectCategory && categorySelect) {
          selectCategory.innerHTML = '<option value="">Select Option</option>';
          Array.from(categorySelect.options).forEach(opt => {
            if (!opt.value) return;
            selectCategory.appendChild(new Option(opt.textContent, opt.value));
          });
        }
  
        if (updateCategoryName) updateCategoryName.value = "";
        if (updateCategoryError) {
          updateCategoryError.innerText = "";
          updateCategoryError.style.display = "none";
        }
  
        showModal(editCategoryModal, selectCategory);
      });
    }
  
    // Edit -> Add (back and +Add New)
    [backToAddCategory, goAddNewBtn].forEach(btn => {
      if (btn) btn.addEventListener("click", () => {
        hideModal(editCategoryModal);
        validateCreateCategory(); // Reset button state
        showModal(addCategoryModal, newCategoryName);
      });
    });
  
    // close Edit
    if (cancelEditCategory) {
      cancelEditCategory.addEventListener("click", () =>
        hideModal(editCategoryModal, addNewCategoryLink)
      );
    }
  
    // Create Category
    if (createCategoryBtn && categorySelect) {
      createCategoryBtn.addEventListener("click", () => {
        const name = (newCategoryName?.value || "").trim();
  
        if (!name) {
          if (newCategoryError) {
            newCategoryError.innerText = "Category name is required";
            newCategoryError.style.display = "block";
          }
          return;
        }
  
        if (!CATEGORY_REGEX.test(name)) {
          if (newCategoryError) {
            newCategoryError.innerText =
              "Category Name Should contain atleast 3 characters.";
            newCategoryError.style.display = "block";
          }
          return;
        }
  
        const exists = Array.from(categorySelect.options)
          .some(o => (o.value || "").toLowerCase() === name.toLowerCase());
  
        const selectedType = productTypeSelect ? productTypeSelect.value : "";
  
        // If category already exists (case-insensitive), block creation
        if (exists) {
          if (newCategoryError) {
            newCategoryError.innerText = "This category already exists.";
            newCategoryError.style.display = "block";
          }
          return;
        }

        // Update UI immediately (optimistic update)
        categorySelect.appendChild(new Option(name, name));
        categorySelect.disabled = false;
        categorySelect.value = name;

        // Reset form fields after successful save
        if (newCategoryName) newCategoryName.value = "";
        if (newCategoryError) {
          newCategoryError.innerText = "";
          newCategoryError.style.display = "none";
        }

        hideModal(addCategoryModal, addNewCategoryLink);
        
        // Show success toast immediately (same style as Department & Roles)
        // Small delay to ensure modal is fully closed and toast appears above content
        setTimeout(() => {
          showSuccessNotification("Category Name added successfully.");
        }, 150);

        // Save in backend so it persists across refresh (in background)
        fetch("/api/product-categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name,
            product_type: selectedType || ""
          })
        })
          .then(res => res.json())
          .then(data => {
            if (!data || !data.success) {
              // backend says duplicate etc. - show error but keep UI update
              const msg = data.message || "Failed to save category.";
              showErrorNotification(msg);
              // Optionally remove from dropdown if backend rejects
              const optionToRemove = Array.from(categorySelect.options)
                .find(o => o.value === name);
              if (optionToRemove) {
                optionToRemove.remove();
              }
            }
          })
          .catch(() => {
            // If server fails, show error but keep UI update
            showErrorNotification("Server error while saving category.");
          });
      });
    }
  
    // Validate Update Category button state
    function validateUpdateCategory() {
      if (!updateCategoryBtn) return;
      
      const oldName = selectCategory?.value || "";
      const newName = (updateCategoryName?.value || "").trim();
      
      // Check if category is selected
      const hasSelection = !!oldName;
      
      // Check if new name is valid (at least 3 chars, matches regex)
      const hasValidName = newName && newName.length >= 3 && CATEGORY_REGEX.test(newName);
      
      // Check for duplicate (case-insensitive), but allow updating to same name
      let noDuplicate = true;
      if (hasValidName && newName.toLowerCase() !== oldName.toLowerCase()) {
        const exists = Array.from(categorySelect?.options || [])
          .some(o => o.value.toLowerCase() === newName.toLowerCase());
        noDuplicate = !exists;
      }
      
      // Enable button only if all validations pass
      updateCategoryBtn.disabled = !(hasSelection && hasValidName && noDuplicate);
    }
  
    // Select Category (Edit modal) -> fill input
    if (selectCategory) {
      selectCategory.addEventListener("change", () => {
        const val = selectCategory.value;
        if (updateCategoryName) updateCategoryName.value = val || "";
        validateUpdateCategory();
      });
    }

    // Add event listeners for live validation
    if (updateCategoryName) {
      updateCategoryName.addEventListener("input", () => {
        validateUpdateCategory();
      });
    }

    // Initial validation
    validateUpdateCategory();
  
    // Update Category
    if (updateCategoryBtn && categorySelect && selectCategory) {
      updateCategoryBtn.addEventListener("click", () => {
        const oldName = selectCategory.value;
        const newName = (updateCategoryName?.value || "").trim();
  
        if (!oldName) {
          if (updateCategoryError) {
            updateCategoryError.innerText = "Select a category first";
            updateCategoryError.style.display = "block";
          }
          return;
        }
  
        if (!newName) {
          if (updateCategoryError) {
            updateCategoryError.innerText = "Updated name is required";
            updateCategoryError.style.display = "block";
          }
          return;
        }
  
        // Validate new name format (same as create)
        if (!CATEGORY_REGEX.test(newName)) {
          if (updateCategoryError) {
            updateCategoryError.innerText =
              "Category Name Should contain atleast 3 characters.";
            updateCategoryError.style.display = "block";
          }
          return;
        }

        // Check for duplicate (case-insensitive), but allow updating to same name
        if (newName.toLowerCase() !== oldName.toLowerCase()) {
          // First check against dropdown options (fast check)
          const existsInDropdown = Array.from(categorySelect.options)
            .some(o => o.value.toLowerCase() === newName.toLowerCase());
          
          if (existsInDropdown) {
            if (updateCategoryError) {
              updateCategoryError.innerText = "This category name already exists.";
              updateCategoryError.style.display = "block";
            }
            return;
          }

          // Also check against all categories from backend to catch duplicates across product types
          fetch("/api/product-categories")
            .then(res => (res.ok ? res.json() : null))
            .then(data => {
              if (data && data.success && Array.isArray(data.categories)) {
                // Check if new name already exists (case-insensitive), excluding the current category
                const existsInBackend = data.categories.some(
                  cat => cat.toLowerCase() === newName.toLowerCase() && 
                         cat.toLowerCase() !== oldName.toLowerCase()
                );
                
                if (existsInBackend) {
                  if (updateCategoryError) {
                    updateCategoryError.innerText = "This category name already exists.";
                    updateCategoryError.style.display = "block";
                  }
                  // Revert UI changes if duplicate found
                  Array.from(categorySelect.options).forEach(opt => {
                    if (opt.value === newName) {
                      opt.value = oldName;
                      opt.textContent = oldName;
                    }
                  });
                  Array.from(selectCategory.options).forEach(opt => {
                    if (opt.value === newName) {
                      opt.value = oldName;
                      opt.textContent = oldName;
                    }
                  });
                  categorySelect.value = oldName;
                  selectCategory.value = oldName;
                  if (updateCategoryName) updateCategoryName.value = oldName;
                  return;
                }
              }
              
              // No duplicate found, proceed with update
              performCategoryUpdate(oldName, newName);
            })
            .catch(() => {
              // If fetch fails, proceed with update (already checked dropdown)
              performCategoryUpdate(oldName, newName);
            });
          return; // Exit early, update will happen in fetch callback
        } else {
          // Name hasn't changed, no need to update
          hideModal(editCategoryModal, addNewCategoryLink);
          return;
        }
      });
    }

    // Helper function to perform category update
    function performCategoryUpdate(oldName, newName) {
      // Update UI immediately
        Array.from(categorySelect.options).forEach(opt => {
          if (opt.value === oldName) {
            opt.value = newName;
            opt.textContent = newName;
          }
        });
  
        Array.from(selectCategory.options).forEach(opt => {
          if (opt.value === oldName) {
            opt.value = newName;
            opt.textContent = newName;
          }
        });
  
        categorySelect.value = newName;
        selectCategory.value = newName;
  
        hideModal(editCategoryModal, addNewCategoryLink);

      // Show success toast immediately
      setTimeout(() => {
        showSuccessNotification("Category Name updated successfully.");
      }, 150);

      // Clear cache to force reload on next access
      const selectedType = productTypeSelect ? productTypeSelect.value : "";
      const typeKey = selectedType ? selectedType.toLowerCase() : "__all__";
      delete savedCategoryCache[typeKey];
    }
  
    // Remove Category - Show Delete Confirmation Modal
    if (removeCategoryBtn && categorySelect && selectCategory) {
      removeCategoryBtn.addEventListener("click", () => {
        const val = selectCategory.value;
        if (!val) return;
  
        pendingDeleteCategoryValue = val;
        
        // Hide Edit Category modal and show Delete Category modal
        if (editCategoryModal) {
          hideModal(editCategoryModal);
        }
        
        // Show delete confirmation modal
        if (deleteCategoryText) {
          deleteCategoryText.textContent = `Are you sure want to delete "${val}"?`;
        }
        if (deleteCategoryModal) {
          showModal(deleteCategoryModal);
        }
      });
    }

    // Cancel Delete Category
    if (cancelCategoryDeleteBtn) {
      cancelCategoryDeleteBtn.addEventListener("click", () => {
        hideModal(deleteCategoryModal);
        pendingDeleteCategoryValue = null;
        
        // Show Edit Category modal again
        if (editCategoryModal) {
          showModal(editCategoryModal);
        }
      });
    }

    // Confirm Delete Category
    if (confirmCategoryDeleteBtn && categorySelect && selectCategory) {
      confirmCategoryDeleteBtn.addEventListener("click", () => {
        if (!pendingDeleteCategoryValue) return;

        const val = pendingDeleteCategoryValue;

        // Remove from dropdowns
        Array.from(categorySelect.options).forEach(opt => {
          if (opt.value === val) opt.remove();
        });
  
        Array.from(selectCategory.options).forEach(opt => {
          if (opt.value === val) opt.remove();
        });
  
        if (updateCategoryName) updateCategoryName.value = "";
        
        // Close Delete Category modal (Edit Category modal stays closed)
        hideModal(deleteCategoryModal);
        
        pendingDeleteCategoryValue = null;
      });
    }
  
    /* =========================================================
       TAX CODE MODALS (WITH PERSISTENCE)
    ========================================================= */
    const addNewTaxCodeLink = document.getElementById("addNewTaxCodeLink");
  
    const addTaxCodeModal  = document.getElementById("addTaxCodeModal");
    const editTaxCodeModal = document.getElementById("editTaxCodeModal");
  
    const closeAddTaxCode = document.getElementById("closeAddTaxCode");
    const cancelAddTaxCode = document.getElementById("cancelAddTaxCode");
    const openEditTaxCodeBtn = document.getElementById("openEditTaxCodeBtn");
  
    const backToAddTaxCode = document.getElementById("backToAddTaxCode");
    const goAddTaxCodeBtn = document.getElementById("goAddTaxCodeBtn");
    const cancelEditTaxCode = document.getElementById("cancelEditTaxCode");
  
    const newTaxName = document.getElementById("newTaxName");
    const newTaxPercent = document.getElementById("newTaxPercent");
    const newTaxDesc = document.getElementById("newTaxDesc");
    const newTaxError = document.getElementById("newTaxError");
    const createTaxCodeBtn = document.getElementById("createTaxCodeBtn");

    // Validate Create Tax Code button state
    function validateCreateTaxCode() {
      if (!createTaxCodeBtn) return;
      
      const name = (newTaxName?.value || "").trim();
      const percentStr = (newTaxPercent?.value || "").trim();
      const percentNum = parseFloat(percentStr);
      
      // Check if tax name is valid (not empty, at least 3 chars, only letters and spaces)
      const TAX_NAME_REGEX = /^[A-Za-z\s]+$/;
      const hasValidName = name && name.length >= 3 && TAX_NAME_REGEX.test(name);
      
      // Check if tax percentage is valid (not empty, is a number, between 0 and 100)
      const hasValidPercent = percentStr && !isNaN(percentNum) && percentNum >= 0 && percentNum <= 100;
      
      // Check for duplicate (case-insensitive)
      let noDuplicate = true;
      if (hasValidName && taxCodeSelect) {
        const exists = Array.from(taxCodeSelect.options).some(o => {
          const base = ((o.textContent || o.value || "").split("(")[0] || "")
            .trim()
            .toLowerCase();
          return base === name.toLowerCase();
        });
        noDuplicate = !exists;
      }
      
      // Enable button only if all validations pass
      createTaxCodeBtn.disabled = !(hasValidName && hasValidPercent && noDuplicate);
    }
  
    const selectTaxCode = document.getElementById("selectTaxCode");
    const updateTaxPercent = document.getElementById("updateTaxPercent");
    const updateTaxDesc = document.getElementById("updateTaxDesc");
    const updateTaxError = document.getElementById("updateTaxError");
    const updateTaxCodeBtn = document.getElementById("updateTaxCodeBtn");
    const removeTaxCodeBtn = document.getElementById("removeTaxCodeBtn");

    // Delete Tax Code Modal
    const deleteTaxCodeModal = document.getElementById("deleteTaxCodeModal");
    const deleteTaxCodeText = document.getElementById("deleteTaxCodeText");
    const cancelTaxCodeDeleteBtn = document.getElementById("cancelTaxCodeDeleteBtn");
    const confirmTaxCodeDeleteBtn = document.getElementById("confirmTaxCodeDeleteBtn");
    let pendingDeleteTaxCodeValue = null;

    // cache for tax codes fetched from backend
    const taxCodeCache = { loaded: false, items: [] };

    // Restrict Tax Name inputs to alphabets and spaces while typing
    const TAXNAME_KEYBOARD_REGEX = /[^A-Za-z\s]/g;
    [newTaxName].forEach(inputEl => {
      if (!inputEl) return;
      inputEl.addEventListener("input", () => {
        const original = inputEl.value || "";
        const cleaned = original.replace(TAXNAME_KEYBOARD_REGEX, "");
        if (cleaned !== original) {
          inputEl.value = cleaned;
        }
        if (newTaxError) {
          newTaxError.innerText = "";
          newTaxError.style.display = "none";
        }
        validateCreateTaxCode();
      });
    });

    // Add event listeners for live validation
    if (newTaxPercent) {
      newTaxPercent.addEventListener("input", () => {
        validateCreateTaxCode();
      });
    }

    // Initial validation (button starts disabled)
    validateCreateTaxCode();

    // Restrict Tax Description inputs to alphabets, spaces, and special characters: & , / .
    const TAXDESC_KEYBOARD_REGEX = /[^A-Za-z\s&,./]/g;
    [newTaxDesc, updateTaxDesc].forEach(inputEl => {
      if (!inputEl) return;
      inputEl.addEventListener("input", () => {
        const original = inputEl.value || "";
        const cleaned = original.replace(TAXDESC_KEYBOARD_REGEX, "");
        if (cleaned !== original) {
          inputEl.value = cleaned;
        }
      });
    });
  
    outsideClickClose(addTaxCodeModal);
    outsideClickClose(editTaxCodeModal);
    
    // Custom outside click handler for Delete Tax Code modal - restore Edit Tax Code modal
    if (deleteTaxCodeModal) {
      deleteTaxCodeModal.addEventListener("click", (e) => {
        if (e.target === deleteTaxCodeModal) {
          hideModal(deleteTaxCodeModal);
          pendingDeleteTaxCodeValue = null;
          // Show Edit Tax Code modal again
          if (editTaxCodeModal) {
            showModal(editTaxCodeModal);
          }
        }
      });
    }
  
    // Validate Update Tax Code button state
    function validateUpdateTaxCode() {
      if (!updateTaxCodeBtn) return;
      
      const oldVal = selectTaxCode?.value || "";
      const percentStr = (updateTaxPercent?.value || "").trim();
      const percentNum = parseFloat(percentStr);
      
      // Check if tax code is selected
      const hasSelection = !!oldVal;
      
      // Check if tax percentage is valid
      const hasValidPercent = percentStr && !isNaN(percentNum) && percentNum >= 0 && percentNum <= 100;
      
      // Enable button only if all validations pass
      updateTaxCodeBtn.disabled = !(hasSelection && hasValidPercent);
    }
  
    // When user chooses a tax code in Edit modal, auto-fill fields
    if (selectTaxCode) {
      selectTaxCode.addEventListener("change", () => {
        const val = selectTaxCode.value;
  
        if (!val) {
          if (updateTaxPercent) updateTaxPercent.value = "";
          if (updateTaxDesc) updateTaxDesc.value = "";
          validateUpdateTaxCode();
          return;
        }
  
        const opt = Array.from(selectTaxCode.options).find(o => o.value === val);
  
        if (updateTaxPercent) {
          updateTaxPercent.value =
            (opt && opt.dataset.percent) || extractPercent(val) || "";
        }
  
        if (updateTaxDesc) {
          updateTaxDesc.value = (opt && opt.dataset.desc) || "";
        }
  
        if (updateTaxError) {
          updateTaxError.innerText = "";
          updateTaxError.style.display = "none";
        }
        
        validateUpdateTaxCode();
      });
    }

    // Add event listeners for live validation
    if (updateTaxPercent) {
      updateTaxPercent.addEventListener("input", () => {
        validateUpdateTaxCode();
      });
    }

    // Initial validation
    validateUpdateTaxCode();
  
    // Load tax codes from backend JSON and populate main select
    function loadSavedTaxCodes() {
      if (!taxCodeSelect) return;

      if (taxCodeCache.loaded) {
        taxCodeCache.items.forEach(item => {
          const code = (item.code || "").trim();
          if (!code) return;
          const percent = item.percent;
          const desc = item.description || "";

          const exists = Array.from(taxCodeSelect.options)
            .some(o => (o.value || "").toLowerCase() === code.toLowerCase());
          if (!exists) {
            const opt = new Option(code, code);
            if (!isNaN(percent)) opt.dataset.percent = String(percent);
            if (desc) opt.dataset.desc = desc;
            taxCodeSelect.appendChild(opt);
          }
        });
        return;
      }

      fetch("/api/product-tax-codes")
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (!data || !data.success || !Array.isArray(data.items)) return;
          taxCodeCache.loaded = true;
          taxCodeCache.items = data.items.slice();
          loadSavedTaxCodes();
          validateCreateTaxCode(); // Re-validate after loading tax codes
        })
        .catch(() => {});
    }

    // initial load for dropdown
    if (taxCodeSelect) {
      loadSavedTaxCodes();
    }
  
    // open Add Tax Code
    if (addNewTaxCodeLink) {
      addNewTaxCodeLink.addEventListener("click", (e) => {
        e.preventDefault();
        hideModal(editTaxCodeModal);
  
        if (newTaxName) newTaxName.value = "";
        if (newTaxPercent) newTaxPercent.value = "";
        if (newTaxDesc) newTaxDesc.value = "";
        if (newTaxError) {
          newTaxError.innerText = "";
          newTaxError.style.display = "none";
        }
  
        validateCreateTaxCode(); // Reset button state
        showModal(addTaxCodeModal, newTaxName);
      });
    }
  
    // close Add Tax Code
    [closeAddTaxCode, cancelAddTaxCode].forEach(btn => {
      if (btn) btn.addEventListener("click", () => {
        hideModal(addTaxCodeModal, addNewTaxCodeLink);
        validateCreateTaxCode(); // Reset button state
      });
    });
  
    // Add -> Edit Tax Code
    if (openEditTaxCodeBtn) {
      openEditTaxCodeBtn.addEventListener("click", () => {
        hideModal(addTaxCodeModal);
  
        if (selectTaxCode && taxCodeSelect) {
          selectTaxCode.innerHTML = '<option value="">Select Option</option>';
          Array.from(taxCodeSelect.options).forEach(opt => {
            if (!opt.value) return;
            const clone = new Option(opt.textContent, opt.value);
            clone.dataset.percent = opt.dataset.percent || "";
            clone.dataset.desc = opt.dataset.desc || "";
            selectTaxCode.appendChild(clone);
          });
        }
  
        if (updateTaxPercent) updateTaxPercent.value = "";
        if (updateTaxDesc) updateTaxDesc.value = "";
        if (updateTaxError) {
          updateTaxError.innerText = "";
          updateTaxError.style.display = "none";
        }
  
        showModal(editTaxCodeModal, selectTaxCode);
      });
    }
  
    // Edit -> Add Tax Code (back and +Add)
    [backToAddTaxCode, goAddTaxCodeBtn].forEach(btn => {
      if (btn) btn.addEventListener("click", () => {
        hideModal(editTaxCodeModal);
        validateCreateTaxCode(); // Reset button state
        showModal(addTaxCodeModal, newTaxName);
      });
    });
  
    // close Edit Tax Code
    if (cancelEditTaxCode) {
      cancelEditTaxCode.addEventListener("click", () =>
        hideModal(editTaxCodeModal, addNewTaxCodeLink)
      );
    }
  
    // Create Tax Code
    if (createTaxCodeBtn && taxCodeSelect) {
      createTaxCodeBtn.addEventListener("click", () => {
        const name = (newTaxName?.value || "").trim();
        const percentStr = (newTaxPercent?.value || "").trim();
        const percentNum = parseFloat(percentStr);
  
        if (!name || !percentStr) {
          if (newTaxError) {
            newTaxError.innerText = "Tax name & percentage required";
            newTaxError.style.display = "block";
          }
          return;
        }

        // Tax Name: only alphabets and spaces, at least 3 characters
        if (!/^[A-Za-z\s]+$/.test(name) || name.length < 3) {
          if (newTaxError) {
            newTaxError.innerText = "Tax Name should contain atleast 3 characters.";
            newTaxError.style.display = "block";
          }
          return;
        }
  
        if (isNaN(percentNum) || percentNum < 0 || percentNum > 100) {
          if (newTaxError) {
            newTaxError.innerText = "Tax percentage must be between 0 and 100";
            newTaxError.style.display = "block";
          }
          return;
        }
  
        const val = `${name} (${percentNum}%)`;
        const descValue = (newTaxDesc?.value || "").trim();
  
        // Check duplicates by Tax Name only (case-insensitive), ignoring %
        const exists = Array.from(taxCodeSelect.options).some(o => {
          const base = ((o.textContent || o.value || "").split("(")[0] || "")
            .trim()
            .toLowerCase();
          return base === name.toLowerCase();
        });
  
        // Block duplicate tax name
        if (exists) {
          if (newTaxError) {
            newTaxError.innerText = "This tax name already exists.";
            newTaxError.style.display = "block";
          }
          return;
        }

        // Update UI immediately (optimistic update)
          const opt = new Option(val, val);
          opt.dataset.percent = percentNum.toString();
          opt.dataset.desc = descValue;
          taxCodeSelect.appendChild(opt);
        taxCodeSelect.disabled = false;
        taxCodeSelect.value = val;

        // keep local cache in sync
        if (taxCodeCache.loaded) {
          taxCodeCache.items.push({
            code: val,
            percent: percentNum,
            description: descValue
          });
        }

        // Reset form fields after successful save
        if (newTaxName) newTaxName.value = "";
        if (newTaxPercent) newTaxPercent.value = "";
        if (newTaxDesc) newTaxDesc.value = "";
        if (newTaxError) {
          newTaxError.innerText = "";
          newTaxError.style.display = "none";
        }
  
        hideModal(addTaxCodeModal, addNewTaxCodeLink);

        // Reset button state
        validateCreateTaxCode();

        // Show success toast immediately (same style as Department & Roles)
        setTimeout(() => {
          showSuccessNotification("Tax Code added successfully.");
        }, 150);

        // persist in backend (in background)
        fetch("/api/product-tax-codes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: val,
            percent: percentNum,
            description: descValue
          })
        })
          .then(res => res.json())
          .then(data => {
            if (!data || !data.success) {
              // backend says duplicate etc. - show error but keep UI update
              const msg = data.message || "Failed to save tax code.";
              showErrorNotification(msg);
              // Optionally remove from dropdown if backend rejects
              const optionToRemove = Array.from(taxCodeSelect.options)
                .find(o => o.value === val);
              if (optionToRemove) {
                optionToRemove.remove();
              }
            }
          })
          .catch(() => {
            // If server fails, show error but keep UI update
            showErrorNotification("Server error while saving tax code.");
          });
      });
    }
  
    // Update Tax Code
    if (updateTaxCodeBtn && taxCodeSelect && selectTaxCode) {
      updateTaxCodeBtn.addEventListener("click", () => {
        const oldVal = selectTaxCode.value;
        const percentStr = (updateTaxPercent?.value || "").trim();
        const percentNum = parseFloat(percentStr);
  
        if (!oldVal) {
          if (updateTaxError) {
            updateTaxError.innerText = "Select a tax code first";
            updateTaxError.style.display = "block";
          }
          return;
        }
  
        if (!percentStr) {
          if (updateTaxError) {
            updateTaxError.innerText = "Tax percentage required";
            updateTaxError.style.display = "block";
          }
          return;
        }
  
        if (isNaN(percentNum) || percentNum < 0 || percentNum > 100) {
          if (updateTaxError) {
            updateTaxError.innerText = "Tax percentage must be between 0 and 100";
            updateTaxError.style.display = "block";
          }
          return;
        }
  
        const baseName = oldVal.split("(")[0].trim();
        const updated = `${baseName} (${percentNum}%)`;
        const descValue = (updateTaxDesc?.value || "").trim();
  
        // update main dropdown
        Array.from(taxCodeSelect.options).forEach(opt => {
          if (opt.value === oldVal) {
            opt.value = updated;
            opt.textContent = updated;
            opt.dataset.percent = percentNum.toString();
            opt.dataset.desc = descValue;
          }
        });
  
        // update edit dropdown
        Array.from(selectTaxCode.options).forEach(opt => {
          if (opt.value === oldVal) {
            opt.value = updated;
            opt.textContent = updated;
            opt.dataset.percent = percentNum.toString();
            opt.dataset.desc = descValue;
          }
        });
  
        taxCodeSelect.value = updated;
        selectTaxCode.value = updated;
  
        hideModal(editTaxCodeModal, addNewTaxCodeLink);

        // Show success toast immediately
        setTimeout(() => {
          showSuccessNotification("Tax Code values updated successfully.");
        }, 150);
      });
    }
  
    // Remove Tax Code - Show Delete Confirmation Modal
    if (removeTaxCodeBtn && taxCodeSelect && selectTaxCode) {
      removeTaxCodeBtn.addEventListener("click", () => {
        const val = selectTaxCode.value;
        if (!val) return;
  
        pendingDeleteTaxCodeValue = val;
        
        // Hide Edit Tax Code modal and show Delete Tax Code modal
        if (editTaxCodeModal) {
          hideModal(editTaxCodeModal);
        }
        
        // Show delete confirmation modal
        if (deleteTaxCodeText) {
          deleteTaxCodeText.textContent = `Are you sure want to delete "${val}"?`;
        }
        if (deleteTaxCodeModal) {
          showModal(deleteTaxCodeModal);
        }
      });
    }

    // Cancel Delete Tax Code
    if (cancelTaxCodeDeleteBtn) {
      cancelTaxCodeDeleteBtn.addEventListener("click", () => {
        hideModal(deleteTaxCodeModal);
        pendingDeleteTaxCodeValue = null;
        
        // Show Edit Tax Code modal again
        if (editTaxCodeModal) {
          showModal(editTaxCodeModal);
        }
      });
    }

    // Confirm Delete Tax Code
    if (confirmTaxCodeDeleteBtn && taxCodeSelect && selectTaxCode) {
      confirmTaxCodeDeleteBtn.addEventListener("click", () => {
        if (!pendingDeleteTaxCodeValue) return;

        const val = pendingDeleteTaxCodeValue;

        // Remove from dropdowns
        Array.from(taxCodeSelect.options).forEach(opt => {
          if (opt.value === val) opt.remove();
        });
  
        Array.from(selectTaxCode.options).forEach(opt => {
          if (opt.value === val) opt.remove();
        });
  
        if (updateTaxPercent) updateTaxPercent.value = "";
        if (updateTaxDesc) updateTaxDesc.value = "";
        
        // Close Delete Tax Code modal (Edit Tax Code modal stays closed)
        hideModal(deleteTaxCodeModal);
        
        pendingDeleteTaxCodeValue = null;
      });
    }
  
    /* =========================================================
       UOM (Unit Of Measurement) MODALS (WITH PERSISTENCE)
    ========================================================= */
    const addNewUomLink = document.getElementById("addNewUomLink");
    const uomSelect = document.getElementById("uomSelect");
  
    const addUomModal  = document.getElementById("addUomModal");
    const editUomModal = document.getElementById("editUomModal");
  
    const closeAddUom = document.getElementById("closeAddUom");
    const cancelAddUom = document.getElementById("cancelAddUom");
    const openEditUomBtn = document.getElementById("openEditUomBtn");
  
    const backToAddUom = document.getElementById("backToAddUom");
    const goAddUomBtn = document.getElementById("goAddUomBtn");
    const cancelEditUom = document.getElementById("cancelEditUom");
  
    const newUomName = document.getElementById("newUomName");
    const newUomItems = document.getElementById("newUomItems");
    const newUomDesc = document.getElementById("newUomDesc");
    const newUomError = document.getElementById("newUomError");
    const createUomBtn = document.getElementById("createUomBtn");

    // Validate Create UOM button state
    function validateCreateUom() {
      if (!createUomBtn) return;
      
      const name = (newUomName?.value || "").trim();
      const itemsStr = (newUomItems?.value || "").trim();
      const itemsNum = parseInt(itemsStr, 10);
      
      // Check if UOM name is valid (at least 3 chars, matches regex)
      const UOM_NAME_REGEX = /^(?=.*[A-Za-z])[A-Za-z0-9\s\-]{3,50}$/;
      const hasValidName = name && UOM_NAME_REGEX.test(name);
      
      // Check if items is valid (not empty, is a number, between 1 and 10000)
      const hasValidItems = itemsStr && !isNaN(itemsNum) && itemsNum >= 1 && itemsNum <= 10000;
      
      // Check for duplicate (case-insensitive)
      let noDuplicate = true;
      if (hasValidName && uomSelect) {
        const exists = Array.from(uomSelect.options)
          .some(o => (o.value || "").toLowerCase() === name.toLowerCase());
        noDuplicate = !exists;
      }
      
      // Enable button only if all validations pass
      createUomBtn.disabled = !(hasValidName && hasValidItems && noDuplicate);
    }
  
    const selectUomName = document.getElementById("selectUomName");
    const updateUomItems = document.getElementById("updateUomItems");
    const updateUomDesc = document.getElementById("updateUomDesc");
    const updateUomError = document.getElementById("updateUomError");
    const updateUomBtn = document.getElementById("updateUomBtn");
    const removeUomBtn = document.getElementById("removeUomBtn");

    // Delete UOM Modal
    const deleteUomModal = document.getElementById("deleteUomModal");
    const deleteUomText = document.getElementById("deleteUomText");
    const cancelUomDeleteBtn = document.getElementById("cancelUomDeleteBtn");
    const confirmUomDeleteBtn = document.getElementById("confirmUomDeleteBtn");
    let pendingDeleteUomValue = null;

    const uomCache = { loaded: false, items: [] };

    // Restrict UOM Name typing to alphabets and spaces
    const UOM_NAME_KEYBOARD_REGEX = /[^A-Za-z\s]/g;
    if (newUomName) {
      newUomName.addEventListener("input", () => {
        const original = newUomName.value || "";
        const cleaned = original.replace(UOM_NAME_KEYBOARD_REGEX, "");
        if (cleaned !== original) {
          newUomName.value = cleaned;
        }
        if (newUomError) {
          newUomError.innerText = "";
          newUomError.style.display = "none";
        }
        validateCreateUom();
      });
    }

    // Add event listeners for live validation
    if (newUomItems) {
      newUomItems.addEventListener("input", () => {
        validateCreateUom();
      });
    }

    // Initial validation (button starts disabled)
    validateCreateUom();

    function loadSavedUoms() {
      if (!uomSelect) return;

      if (uomCache.loaded) {
        uomCache.items.forEach(item => {
          const name = (item.name || "").trim();
          if (!name) return;
          const exists = Array.from(uomSelect.options)
            .some(o => (o.value || "").toLowerCase() === name.toLowerCase());
          if (!exists) {
            const opt = new Option(name, name);
            if (typeof item.items === "number") {
              opt.dataset.items = String(item.items);
            }
            if (item.description) {
              opt.dataset.desc = item.description;
            }
            uomSelect.appendChild(opt);
          }
        });
        return;
      }

      fetch("/api/product-uoms")
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (!data || !data.success || !Array.isArray(data.items)) return;
          uomCache.loaded = true;
          uomCache.items = data.items.slice();
          loadSavedUoms();
        })
        .catch(() => {});
    }

    if (uomSelect) {
      loadSavedUoms();
    }
  
    outsideClickClose(addUomModal);
    outsideClickClose(editUomModal);
    
    // Custom outside click handler for Delete UOM modal - restore Edit UOM modal
    if (deleteUomModal) {
      deleteUomModal.addEventListener("click", (e) => {
        if (e.target === deleteUomModal) {
          hideModal(deleteUomModal);
          pendingDeleteUomValue = null;
          // Show Edit UOM modal again
          if (editUomModal) {
            showModal(editUomModal);
          }
        }
      });
    }
  
    // Add New link opens Add UOM modal
    if (addNewUomLink) {
      addNewUomLink.addEventListener("click", (e) => {
        e.preventDefault();
        hideModal(editUomModal);
  
        if (newUomName) newUomName.value = "";
        if (newUomItems) newUomItems.value = "";
        if (newUomDesc) newUomDesc.value = "";
        if (newUomError) {
          newUomError.innerText = "";
          newUomError.style.display = "none";
        }
  
        showModal(addUomModal, newUomName);
      });
    }
  
    // close Add UOM
    [closeAddUom, cancelAddUom].forEach(btn => {
      if (btn) btn.addEventListener("click", () =>
        hideModal(addUomModal, addNewUomLink)
      );
    });
  
    // Add -> Edit UOM
    if (openEditUomBtn) {
      openEditUomBtn.addEventListener("click", () => {
        hideModal(addUomModal);
  
        if (selectUomName && uomSelect) {
          selectUomName.innerHTML = '<option value="">Select Option</option>';
  
          Array.from(uomSelect.options).forEach(opt => {
            if (!opt.value) return;
            const clone = new Option(opt.textContent, opt.value);
            clone.dataset.items = opt.dataset.items || "";
            clone.dataset.desc = opt.dataset.desc || "";
            selectUomName.appendChild(clone);
          });
        }
  
        if (updateUomItems) updateUomItems.value = "";
        if (updateUomDesc) updateUomDesc.value = "";
        if (updateUomError) {
          updateUomError.innerText = "";
          updateUomError.style.display = "none";
        }
  
        showModal(editUomModal, selectUomName);
      });
    }
  
    // Edit -> Add UOM (back and +Add UOM)
    [backToAddUom, goAddUomBtn].forEach(btn => {
      if (btn) btn.addEventListener("click", () => {
        hideModal(editUomModal);
        validateCreateUom(); // Reset button state
        showModal(addUomModal, newUomName);
      });
    });
  
    // close Edit UOM
    if (cancelEditUom) {
      cancelEditUom.addEventListener("click", () =>
        hideModal(editUomModal, addNewUomLink)
      );
    }
  
    // When user selects a UOM in Edit modal → autofill fields
    // Validate Update UOM button state
    function validateUpdateUom() {
      if (!updateUomBtn) return;
      
      const oldVal = selectUomName?.value || "";
      const itemsStr = (updateUomItems?.value || "").trim();
      const itemsNum = parseInt(itemsStr, 10);
      
      // Check if UOM is selected
      const hasSelection = !!oldVal;
      
      // Check if items is valid (not empty, is a number, between 1 and 10000)
      const hasValidItems = itemsStr && !isNaN(itemsNum) && itemsNum >= 1 && itemsNum <= 10000;
      
      // Enable button only if all validations pass
      updateUomBtn.disabled = !(hasSelection && hasValidItems);
    }

    if (selectUomName) {
      selectUomName.addEventListener("change", () => {
        const val = selectUomName.value;
  
        if (!val) {
          if (updateUomItems) updateUomItems.value = "";
          if (updateUomDesc) updateUomDesc.value = "";
          if (updateUomError) {
            updateUomError.innerText = "";
            updateUomError.style.display = "none";
          }
          validateUpdateUom();
          return;
        }
  
        const opt = Array.from(selectUomName.options).find(o => o.value === val);
  
        if (updateUomItems) {
          updateUomItems.value = (opt && opt.dataset.items) || "";
        }
        if (updateUomDesc) {
          updateUomDesc.value = (opt && opt.dataset.desc) || "";
        }
  
        if (updateUomError) {
          updateUomError.innerText = "";
          updateUomError.style.display = "none";
        }
        
        validateUpdateUom();
      });
    }

    // Add event listeners for live validation
    if (updateUomItems) {
      updateUomItems.addEventListener("input", () => {
        validateUpdateUom();
      });
    }

    // Initial validation
    validateUpdateUom();
  
    // Create UOM
    if (createUomBtn && uomSelect) {
      createUomBtn.addEventListener("click", () => {
        const name = (newUomName?.value || "").trim();
        const itemsStr = (newUomItems?.value || "").trim();
  
        if (!name || !itemsStr) {
          if (newUomError) {
            newUomError.innerText = "UOM name & No. of items required";
            newUomError.style.display = "block";
          }
          return;
        }
  
        if (!UOM_NAME_REGEX.test(name)) {
          if (newUomError) {
            newUomError.innerText =
              "UOM Name should contain atleast 3 characters.";
            newUomError.style.display = "block";
          }
          return;
        }
  
        const itemsNum = parseInt(itemsStr, 10);
        if (isNaN(itemsNum) || itemsNum < 1 || itemsNum > 10000) {
          if (newUomError) {
            newUomError.innerText = "Items must be between 1 and 10,000";
            newUomError.style.display = "block";
          }
          return;
        }
  
        const val = name;
        const descVal = (newUomDesc?.value || "").trim();
  
        const exists = Array.from(uomSelect.options)
          .some(o => (o.value || "").toLowerCase() === val.toLowerCase());
  
        // Block duplicate UOM (case-insensitive)
        if (exists) {
          if (newUomError) {
            newUomError.innerText = "This UOM already exists.";
            newUomError.style.display = "block";
          }
          return;
        }

        // Update UI immediately (optimistic update)
          const opt = new Option(val, val);
          opt.dataset.items = itemsNum.toString();
        opt.dataset.desc = descVal;
          uomSelect.appendChild(opt);
        uomSelect.disabled = false;
        uomSelect.value = val;

        if (uomCache.loaded) {
          uomCache.items.push({
            name: val,
            items: itemsNum,
            description: descVal
          });
        }

        // Reset form fields after successful save
        if (newUomName) newUomName.value = "";
        if (newUomItems) newUomItems.value = "";
        if (newUomDesc) newUomDesc.value = "";
        if (newUomError) {
          newUomError.innerText = "";
          newUomError.style.display = "none";
        }
  
        hideModal(addUomModal, addNewUomLink);

        // Reset button state
        validateCreateUom();

        // Show success toast immediately
        setTimeout(() => {
          showSuccessNotification("UOM Name added successfully.");
        }, 150);

        // Save in backend (in background)
        fetch("/api/product-uoms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: val,
            items: itemsNum,
            description: descVal
          })
        })
          .then(res => res.json())
          .then(data => {
            if (!data || !data.success) {
              const msg = data.message || "Failed to save UOM.";
              showErrorNotification(msg);
              const optionToRemove = Array.from(uomSelect.options)
                .find(o => o.value === val);
              if (optionToRemove) {
                optionToRemove.remove();
              }
            }
          })
          .catch(() => {
            showErrorNotification("Server error while saving UOM.");
          });
      });
    }
  
    // Update UOM
    if (updateUomBtn && uomSelect && selectUomName) {
      updateUomBtn.addEventListener("click", () => {
        // Clear error at start
        if (updateUomError) {
          updateUomError.innerText = "";
          updateUomError.style.display = "none";
        }

        const oldVal = selectUomName.value;
        const itemsStr = (updateUomItems?.value || "").trim();
  
        if (!oldVal) {
          if (updateUomError) {
            updateUomError.innerText = "Select a UOM first";
            updateUomError.style.display = "block";
          }
          return;
        }
  
        if (!itemsStr) {
          if (updateUomError) {
            updateUomError.innerText = "No. of items required";
            updateUomError.style.display = "block";
          }
          return;
        }
  
        const itemsNum = parseInt(itemsStr, 10);
        if (isNaN(itemsNum) || itemsNum < 1 || itemsNum > 10000) {
          if (updateUomError) {
            updateUomError.innerText = "Items must be between 1 and 10,000";
            updateUomError.style.display = "block";
          }
          return;
        }

        // Clear error if validation passes
        if (updateUomError) {
          updateUomError.innerText = "";
          updateUomError.style.display = "none";
        }
  
        const newName = oldVal;
        const descValue = (updateUomDesc?.value || "").trim();
  
        // update main dropdown
        Array.from(uomSelect.options).forEach(opt => {
          if (opt.value === oldVal) {
            opt.value = newName;
            opt.textContent = newName;
            opt.dataset.items = itemsNum.toString();
            opt.dataset.desc = descValue;
          }
        });
  
        // update edit dropdown
        Array.from(selectUomName.options).forEach(opt => {
          if (opt.value === oldVal) {
            opt.value = newName;
            opt.textContent = newName;
            opt.dataset.items = itemsNum.toString();
            opt.dataset.desc = descValue;
          }
        });
  
        uomSelect.value = newName;
        selectUomName.value = newName;
  
        hideModal(editUomModal, addNewUomLink);

        // Show success toast immediately
        setTimeout(() => {
          showSuccessNotification("UOM values updated successfully.");
        }, 150);
      });
    }
  
    // Remove UOM
    // Remove UOM - Show Delete Confirmation Modal
    if (removeUomBtn && uomSelect && selectUomName) {
      removeUomBtn.addEventListener("click", () => {
        const val = selectUomName.value;
        if (!val) return;
  
        pendingDeleteUomValue = val;
        
        // Hide Edit UOM modal and show Delete UOM modal
        if (editUomModal) {
          hideModal(editUomModal);
        }
        
        // Show delete confirmation modal
        if (deleteUomText) {
          deleteUomText.textContent = `Are you sure want to delete "${val}"?`;
        }
        if (deleteUomModal) {
          showModal(deleteUomModal);
        }
      });
    }

    // Cancel Delete UOM
    if (cancelUomDeleteBtn) {
      cancelUomDeleteBtn.addEventListener("click", () => {
        hideModal(deleteUomModal);
        pendingDeleteUomValue = null;
        
        // Show Edit UOM modal again
        if (editUomModal) {
          showModal(editUomModal);
        }
      });
    }

    // Confirm Delete UOM
    if (confirmUomDeleteBtn && uomSelect && selectUomName) {
      confirmUomDeleteBtn.addEventListener("click", () => {
        if (!pendingDeleteUomValue) return;

        const val = pendingDeleteUomValue;

        // Remove from dropdowns
        Array.from(uomSelect.options).forEach(opt => {
          if (opt.value === val) opt.remove();
        });
  
        Array.from(selectUomName.options).forEach(opt => {
          if (opt.value === val) opt.remove();
        });
  
        if (updateUomItems) updateUomItems.value = "";
        if (updateUomDesc) updateUomDesc.value = "";
        
        // Close Delete UOM modal (Edit UOM modal stays closed)
        hideModal(deleteUomModal);
        
        pendingDeleteUomValue = null;
      });
    }
  
    /* =========================================================
       WAREHOUSE MODALS (WITH PERSISTENCE)
    ========================================================= */
    const addNewWarehouseLink = document.getElementById("addNewWarehouseLink");
    const warehouseSelect = document.getElementById("warehouseSelect");
  
    const addWarehouseModal  = document.getElementById("addWarehouseModal");
    const editWarehouseModal = document.getElementById("editWarehouseModal");
  
    const closeAddWarehouse   = document.getElementById("closeAddWarehouse");
    const cancelAddWarehouse  = document.getElementById("cancelAddWarehouse");
    const openEditWarehouseBtn = document.getElementById("openEditWarehouseBtn");
  
    const backToAddWarehouse = document.getElementById("backToAddWarehouse");
    const goAddWarehouseBtn  = document.getElementById("goAddWarehouseBtn");
    const cancelEditWarehouse = document.getElementById("cancelEditWarehouse");
  
    const newWarehouseName     = document.getElementById("newWarehouseName");
    const newWarehouseLocation = document.getElementById("newWarehouseLocation");
    const newWarehouseManager  = document.getElementById("newWarehouseManager");
    const newWarehouseContact  = document.getElementById("newWarehouseContact");
    const newWarehouseNotes    = document.getElementById("newWarehouseNotes");
    const newWarehouseError    = document.getElementById("newWarehouseError");
    const createWarehouseBtn   = document.getElementById("createWarehouseBtn");

    // Validate Create Warehouse button state
    function validateCreateWarehouse() {
      if (!createWarehouseBtn) return;
      
      const name = (newWarehouseName?.value || "").trim();
      const location = (newWarehouseLocation?.value || "").trim();
      
      // Check if warehouse name is valid (at least 3 chars, matches regex)
      const WAREHOUSE_NAME_REGEX = /^[A-Za-z\s]{3,50}$/;
      const hasValidName = name && name.length >= 3 && WAREHOUSE_NAME_REGEX.test(name);
      
      // Check if location is valid (not empty, matches regex)
      const LOCATION_REGEX = /^[A-Za-z0-9\s,.\-\/]{5,100}$/;
      const hasValidLocation = location && LOCATION_REGEX.test(location);
      
      // Check for duplicate (case-insensitive)
      let noDuplicate = true;
      if (hasValidName && warehouseSelect) {
        const exists = Array.from(warehouseSelect.options)
          .some(o => (o.value || "").toLowerCase() === name.toLowerCase());
        noDuplicate = !exists;
      }
      
      // Enable button only if all validations pass
      createWarehouseBtn.disabled = !(hasValidName && hasValidLocation && noDuplicate);
    }
  
    const selectWarehouseName      = document.getElementById("selectWarehouseName");
    const updateWarehouseLocation  = document.getElementById("updateWarehouseLocation");
    const updateWarehouseManager   = document.getElementById("updateWarehouseManager");
    const updateWarehouseContact   = document.getElementById("updateWarehouseContact");
    const updateWarehouseNotes     = document.getElementById("updateWarehouseNotes");
    const updateWarehouseError     = document.getElementById("updateWarehouseError");
    const updateWarehouseBtn       = document.getElementById("updateWarehouseBtn");
    const removeWarehouseBtn       = document.getElementById("removeWarehouseBtn");

    // Delete Warehouse Modal
    const deleteWarehouseModal = document.getElementById("deleteWarehouseModal");
    const deleteWarehouseText = document.getElementById("deleteWarehouseText");
    const cancelWarehouseDeleteBtn = document.getElementById("cancelWarehouseDeleteBtn");
    const confirmWarehouseDeleteBtn = document.getElementById("confirmWarehouseDeleteBtn");
    let pendingDeleteWarehouseValue = null;

    const warehouseCache = { loaded: false, items: [] };

    // Common helper: restrict certain name inputs to alphabets + spaces
    const NAME_ALPHA_KEYBOARD_REGEX = /[^A-Za-z\s]/g;
    function restrictAlphaInput(inputEl, clearErrorFn) {
      if (!inputEl) return;
      inputEl.addEventListener("input", () => {
        const original = inputEl.value || "";
        const cleaned = original.replace(NAME_ALPHA_KEYBOARD_REGEX, "");
        if (cleaned !== original) {
          inputEl.value = cleaned;
        }
        if (typeof clearErrorFn === "function") clearErrorFn();
      });
    }

    // Apply keyboard restriction for Warehouse, Size, Color, Supplier names
    restrictAlphaInput(newWarehouseName, () => {
      if (newWarehouseError) {
        newWarehouseError.innerText = "";
        newWarehouseError.style.display = "none";
      }
      validateCreateWarehouse();
    });

    // Add event listeners for live validation
    if (newWarehouseLocation) {
      newWarehouseLocation.addEventListener("input", () => {
        validateCreateWarehouse();
      });
    }

    // Initial validation (button starts disabled)
    validateCreateWarehouse();

    function loadSavedWarehouses() {
      if (!warehouseSelect) return;

      if (warehouseCache.loaded) {
        warehouseCache.items.forEach(item => {
          const name = (item.name || "").trim();
          if (!name) return;
          const exists = Array.from(warehouseSelect.options)
            .some(o => (o.value || "").toLowerCase() === name.toLowerCase());
          if (!exists) {
            const opt = new Option(name, name);
            if (item.location) opt.dataset.location = item.location;
            if (item.manager)  opt.dataset.manager  = item.manager;
            if (item.contact)  opt.dataset.contact  = item.contact;
            if (item.notes)    opt.dataset.notes    = item.notes;
            warehouseSelect.appendChild(opt);
          }
        });
        return;
      }

      fetch("/api/product-warehouses")
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (!data || !data.success || !Array.isArray(data.items)) return;
          warehouseCache.loaded = true;
          warehouseCache.items = data.items.slice();
          loadSavedWarehouses();
        })
        .catch(() => {});
    }

    if (warehouseSelect) {
      loadSavedWarehouses();
    }
  
    outsideClickClose(addWarehouseModal);
    outsideClickClose(editWarehouseModal);
    
    // Custom outside click handler for Delete Warehouse modal - restore Edit Warehouse modal
    if (deleteWarehouseModal) {
      deleteWarehouseModal.addEventListener("click", (e) => {
        if (e.target === deleteWarehouseModal) {
          hideModal(deleteWarehouseModal);
          pendingDeleteWarehouseValue = null;
          // Show Edit Warehouse modal again
          if (editWarehouseModal) {
            showModal(editWarehouseModal);
          }
        }
      });
    }
  
    // "+ Add New" opens Add Warehouse modal
    if (addNewWarehouseLink) {
      addNewWarehouseLink.addEventListener("click", (e) => {
        e.preventDefault();
        hideModal(editWarehouseModal);
  
        if (newWarehouseName)     newWarehouseName.value = "";
        if (newWarehouseLocation) newWarehouseLocation.value = "";
        if (newWarehouseManager)  newWarehouseManager.value = "";
        if (newWarehouseContact)  newWarehouseContact.value = "";
        if (newWarehouseNotes)    newWarehouseNotes.value = "";
        if (newWarehouseError) {
          newWarehouseError.innerText = "";
          newWarehouseError.style.display = "none";
        }
  
        showModal(addWarehouseModal, newWarehouseName);
      });
    }
  
    // close Add Warehouse
    [closeAddWarehouse, cancelAddWarehouse].forEach(btn => {
      if (btn) btn.addEventListener("click", () => {
        hideModal(addWarehouseModal, addNewWarehouseLink);
        validateCreateWarehouse(); // Reset button state
      });
    });
  
    // Add -> Edit Warehouse
    if (openEditWarehouseBtn) {
      openEditWarehouseBtn.addEventListener("click", () => {
        hideModal(addWarehouseModal);
  
        if (selectWarehouseName && warehouseSelect) {
          selectWarehouseName.innerHTML = '<option value="">Select Option</option>';
  
          Array.from(warehouseSelect.options).forEach(opt => {
            if (!opt.value) return;
            const clone = new Option(opt.textContent, opt.value);
            clone.dataset.location = opt.dataset.location || "";
            clone.dataset.manager  = opt.dataset.manager || "";
            clone.dataset.contact  = opt.dataset.contact || "";
            clone.dataset.notes    = opt.dataset.notes || "";
            selectWarehouseName.appendChild(clone);
          });
        }
  
        if (updateWarehouseLocation) updateWarehouseLocation.value = "";
        if (updateWarehouseManager)  updateWarehouseManager.value = "";
        if (updateWarehouseContact)  updateWarehouseContact.value = "";
        if (updateWarehouseNotes)    updateWarehouseNotes.value = "";
        if (updateWarehouseError) {
          updateWarehouseError.innerText = "";
          updateWarehouseError.style.display = "none";
        }
  
        showModal(editWarehouseModal, selectWarehouseName);
      });
    }
  
    // Edit -> Add Warehouse (back and +Add New)
    [backToAddWarehouse, goAddWarehouseBtn].forEach(btn => {
      if (btn) btn.addEventListener("click", () => {
        hideModal(editWarehouseModal);
        validateCreateWarehouse(); // Reset button state
        showModal(addWarehouseModal, newWarehouseName);
      });
    });
  
    // close Edit Warehouse
    if (cancelEditWarehouse) {
      cancelEditWarehouse.addEventListener("click", () =>
        hideModal(editWarehouseModal, addNewWarehouseLink)
      );
    }
  
    // When user selects a warehouse in Edit modal → fill fields
    // Validate Update Warehouse button state
    function validateUpdateWarehouse() {
      if (!updateWarehouseBtn) return;
      
      const oldVal = selectWarehouseName?.value || "";
      const location = (updateWarehouseLocation?.value || "").trim();
      
      // Check if warehouse is selected
      const hasSelection = !!oldVal;
      
      // Check if location is valid (not empty, matches regex)
      const LOCATION_REGEX = /^[A-Za-z0-9\s,.\-\/]{5,100}$/;
      const hasValidLocation = location && LOCATION_REGEX.test(location);
      
      // Enable button only if all validations pass
      updateWarehouseBtn.disabled = !(hasSelection && hasValidLocation);
    }

    if (selectWarehouseName) {
      selectWarehouseName.addEventListener("change", () => {
        const val = selectWarehouseName.value;
        if (!val) {
          if (updateWarehouseLocation) updateWarehouseLocation.value = "";
          if (updateWarehouseManager)  updateWarehouseManager.value = "";
          if (updateWarehouseContact)  updateWarehouseContact.value = "";
          if (updateWarehouseNotes)    updateWarehouseNotes.value = "";
          if (updateWarehouseError) {
            updateWarehouseError.innerText = "";
            updateWarehouseError.style.display = "none";
          }
          validateUpdateWarehouse();
          return;
        }
  
        const opt = Array.from(selectWarehouseName.options).find(o => o.value === val);
  
        if (updateWarehouseLocation) updateWarehouseLocation.value = opt?.dataset.location || "";
        if (updateWarehouseManager)  updateWarehouseManager.value  = opt?.dataset.manager  || "";
        if (updateWarehouseContact)  updateWarehouseContact.value  = opt?.dataset.contact  || "";
        if (updateWarehouseNotes)    updateWarehouseNotes.value    = opt?.dataset.notes    || "";
  
        if (updateWarehouseError) {
          updateWarehouseError.innerText = "";
          updateWarehouseError.style.display = "none";
        }
        
        validateUpdateWarehouse();
      });
    }

    // Add event listeners for live validation
    if (updateWarehouseLocation) {
      updateWarehouseLocation.addEventListener("input", () => {
        validateUpdateWarehouse();
      });
    }

    // Initial validation
    validateUpdateWarehouse();
  
    // ✅ CREATE WAREHOUSE
    if (createWarehouseBtn && warehouseSelect) {
      createWarehouseBtn.addEventListener("click", () => {
        if (newWarehouseError) {
          newWarehouseError.innerText = "";
          newWarehouseError.style.display = "none";
        }
  
        const name      = (newWarehouseName?.value || "").trim();
        const location  = (newWarehouseLocation?.value || "").trim();
        const manager   = (newWarehouseManager?.value || "").trim();
        const contact   = (newWarehouseContact?.value || "").trim();
        const notes     = (newWarehouseNotes?.value || "").trim();
  
        // ---- required: warehouse name ----
        if (!name) {
          if (newWarehouseError) {
            newWarehouseError.innerText = "Warehouse name is required";
            newWarehouseError.style.display = "block";
          }
          return;
        }
        if (name.length < 3) {
          if (newWarehouseError) {
            newWarehouseError.innerText = "Warehouse Name should contain atleast 3 characters.";
            newWarehouseError.style.display = "block";
          }
          return;
        }
        if (!WAREHOUSE_NAME_REGEX.test(name)) {
          if (newWarehouseError) {
            newWarehouseError.innerText =
              "Warehouse name: 3–50 chars, letters/numbers, basic symbols only.";
            newWarehouseError.style.display = "block";
          }
          return;
        }
  
        // ---- required: location ----
        if (!location) {
          if (newWarehouseError) {
            newWarehouseError.innerText = "Location is required";
            newWarehouseError.style.display = "block";
          }
          return;
        }
        if (!LOCATION_REGEX.test(location)) {
          if (newWarehouseError) {
            newWarehouseError.innerText =
              "Location should be 5–100 characters (letters, numbers, , . - /).";
            newWarehouseError.style.display = "block";
          }
          return;
        }
  
        // ---- optional: manager name ----
        if (manager && !MANAGER_NAME_REGEX.test(manager)) {
          if (newWarehouseError) {
            newWarehouseError.innerText =
              "Manager name: 3–40 characters, letters and spaces only.";
            newWarehouseError.style.display = "block";
          }
          return;
        }
  
        // ---- optional: contact (phone or email) ----
        if (contact && !PHONE_OR_EMAIL_REGEX.test(contact)) {
          if (newWarehouseError) {
            newWarehouseError.innerText =
              "Contact must be a 7–15 digit phone number or a valid email.";
            newWarehouseError.style.display = "block";
          }
          return;
        }
  
        // ---- optional: notes length ----
        if (notes.length > 50) {
          if (newWarehouseError) {
            newWarehouseError.innerText =
              "Notes must be 50 characters or less.";
            newWarehouseError.style.display = "block";
          }
          return;
        }
  
        const val = name;
  
        const exists = Array.from(warehouseSelect.options)
          .some(o => (o.value || "").toLowerCase() === val.toLowerCase());
  
        // Block duplicate warehouse (case-insensitive)
        if (exists) {
          if (newWarehouseError) {
            newWarehouseError.innerText = "This warehouse already exists.";
            newWarehouseError.style.display = "block";
          }
          return;
        }

        // Update UI immediately (optimistic update)
          const opt = new Option(val, val);
          opt.dataset.location = location;
          opt.dataset.manager  = manager;
          opt.dataset.contact  = contact;
          opt.dataset.notes    = notes;
          warehouseSelect.appendChild(opt);
        warehouseSelect.disabled = false;
        warehouseSelect.value = val;

        if (warehouseCache.loaded) {
          warehouseCache.items.push({
            name: val,
            location,
            manager,
            contact,
            notes
          });
        }

        // Reset form fields after successful save
        if (newWarehouseName) newWarehouseName.value = "";
        if (newWarehouseLocation) newWarehouseLocation.value = "";
        if (newWarehouseManager) newWarehouseManager.value = "";
        if (newWarehouseContact) newWarehouseContact.value = "";
        if (newWarehouseNotes) newWarehouseNotes.value = "";
        if (newWarehouseError) {
          newWarehouseError.innerText = "";
          newWarehouseError.style.display = "none";
        }
  
        hideModal(addWarehouseModal, addNewWarehouseLink);

        // Reset button state
        validateCreateWarehouse();

        // Show success toast immediately
        setTimeout(() => {
          showSuccessNotification("Warehouse Name added successfully.");
        }, 150);

        // Save in backend (in background)
        fetch("/api/product-warehouses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: val,
            location,
            manager,
            contact,
            notes
          })
        })
          .then(res => res.json())
          .then(data => {
            if (!data || !data.success) {
              const msg = data.message || "Failed to save warehouse.";
              showErrorNotification(msg);
              const optionToRemove = Array.from(warehouseSelect.options)
                .find(o => o.value === val);
              if (optionToRemove) {
                optionToRemove.remove();
              }
            }
          })
          .catch(() => {
            showErrorNotification("Server error while saving warehouse.");
          });
      });
    }
  
    // ✅ UPDATE WAREHOUSE
    if (updateWarehouseBtn && warehouseSelect && selectWarehouseName) {
      updateWarehouseBtn.addEventListener("click", () => {
        if (updateWarehouseError) {
          updateWarehouseError.innerText = "";
          updateWarehouseError.style.display = "none";
        }
  
        const oldVal   = selectWarehouseName.value;
        const location = (updateWarehouseLocation?.value || "").trim();
        const manager  = (updateWarehouseManager?.value || "").trim();
        const contact  = (updateWarehouseContact?.value || "").trim();
        const notes    = (updateWarehouseNotes?.value || "").trim();
  
        if (!oldVal) {
          if (updateWarehouseError) {
            updateWarehouseError.innerText = "Select a warehouse first";
            updateWarehouseError.style.display = "block";
          }
          return;
        }
  
        if (!location) {
          if (updateWarehouseError) {
            updateWarehouseError.innerText = "Location is required";
            updateWarehouseError.style.display = "block";
          }
          return;
        }
        if (!LOCATION_REGEX.test(location)) {
          if (updateWarehouseError) {
            updateWarehouseError.innerText =
              "Location should be 5–100 characters (letters, numbers, , . - /).";
            updateWarehouseError.style.display = "block";
          }
          return;
        }
  
        if (manager && !MANAGER_NAME_REGEX.test(manager)) {
          if (updateWarehouseError) {
            updateWarehouseError.innerText =
              "Manager name: 3–40 characters, letters and spaces only.";
            updateWarehouseError.style.display = "block";
          }
          return;
        }
  
        if (contact && !PHONE_OR_EMAIL_REGEX.test(contact)) {
          if (updateWarehouseError) {
            updateWarehouseError.innerText =
              "Contact must be a 7–15 digit phone number or a valid email.";
            updateWarehouseError.style.display = "block";
          }
          return;
        }
  
        if (notes.length > 50) {
          if (updateWarehouseError) {
            updateWarehouseError.innerText =
              "Notes must be 50 characters or less.";
            updateWarehouseError.style.display = "block";
          }
          return;
        }

        // Clear error if validation passes
        if (updateWarehouseError) {
          updateWarehouseError.innerText = "";
          updateWarehouseError.style.display = "none";
        }
  
        const newName = oldVal;
  
        // main dropdown
        Array.from(warehouseSelect.options).forEach(opt => {
          if (opt.value === oldVal) {
            opt.value           = newName;
            opt.textContent     = newName;
            opt.dataset.location = location;
            opt.dataset.manager  = manager;
            opt.dataset.contact  = contact;
            opt.dataset.notes    = notes;
          }
        });
  
        // edit dropdown
        Array.from(selectWarehouseName.options).forEach(opt => {
          if (opt.value === oldVal) {
            opt.value           = newName;
            opt.textContent     = newName;
            opt.dataset.location = location;
            opt.dataset.manager  = manager;
            opt.dataset.contact  = contact;
            opt.dataset.notes    = notes;
          }
        });
  
        warehouseSelect.value = newName;
        selectWarehouseName.value = newName;
  
        hideModal(editWarehouseModal, addNewWarehouseLink);

        // Show success toast immediately
        setTimeout(() => {
          showSuccessNotification("Warehouse values updated successfully.");
        }, 150);
      });
    }
  
    // Remove Warehouse
    // Remove Warehouse - Show Delete Confirmation Modal
    if (removeWarehouseBtn && warehouseSelect && selectWarehouseName) {
      removeWarehouseBtn.addEventListener("click", () => {
        const val = selectWarehouseName.value;
        if (!val) return;
  
        pendingDeleteWarehouseValue = val;
        
        // Hide Edit Warehouse modal and show Delete Warehouse modal
        if (editWarehouseModal) {
          hideModal(editWarehouseModal);
        }
        
        // Show delete confirmation modal
        if (deleteWarehouseText) {
          deleteWarehouseText.textContent = `Are you sure want to delete "${val}"?`;
        }
        if (deleteWarehouseModal) {
          showModal(deleteWarehouseModal);
        }
      });
    }

    // Cancel Delete Warehouse
    if (cancelWarehouseDeleteBtn) {
      cancelWarehouseDeleteBtn.addEventListener("click", () => {
        hideModal(deleteWarehouseModal);
        pendingDeleteWarehouseValue = null;
        
        // Show Edit Warehouse modal again
        if (editWarehouseModal) {
          showModal(editWarehouseModal);
        }
      });
    }

    // Confirm Delete Warehouse
    if (confirmWarehouseDeleteBtn && warehouseSelect && selectWarehouseName) {
      confirmWarehouseDeleteBtn.addEventListener("click", () => {
        if (!pendingDeleteWarehouseValue) return;

        const val = pendingDeleteWarehouseValue;

        // Remove from dropdowns
        Array.from(warehouseSelect.options).forEach(opt => {
          if (opt.value === val) opt.remove();
        });
  
        Array.from(selectWarehouseName.options).forEach(opt => {
          if (opt.value === val) opt.remove();
        });
  
        if (updateWarehouseLocation) updateWarehouseLocation.value = "";
        if (updateWarehouseManager)  updateWarehouseManager.value = "";
        if (updateWarehouseContact)  updateWarehouseContact.value = "";
        if (updateWarehouseNotes)    updateWarehouseNotes.value = "";
        
        // Close Delete Warehouse modal (Edit Warehouse modal stays closed)
        hideModal(deleteWarehouseModal);
        
        pendingDeleteWarehouseValue = null;
      });
    }
  
    /* =========================================================
      ✅ SIZE MODAL (WITH PERSISTENCE)
    ========================================================= */
    const sizeModal       = document.getElementById("sizeModal");
    const addSizePage     = document.getElementById("addSizePage");
    const editSizePage    = document.getElementById("editSizePage");
    const openSizeLink    = document.getElementById("openSizeModalLink");
    const openEditSizeBtn = document.getElementById("openEditSizeBtn");
    const openAddSizeBtn  = document.getElementById("openAddSizeBtn");
    const cancelAddSize   = document.getElementById("cancelAddSize");
    const cancelEditSize  = document.getElementById("cancelEditSize");
    const addBackArrow2   = document.getElementById("addBackArrow2");
    const editBackArrow2  = document.getElementById("editBackArrow2");
    const newSizeInput    = document.getElementById("newSizeInput");
  
    const sizeMainSelect  = document.getElementById("sizeMainSelect");
    const sizeEditSelect  = document.getElementById("sizeSelect");
    const createSizeBtn   = document.getElementById("createSizeBtn");
    const updateSizeBtn   = document.getElementById("updateSizeBtn");
    const removeSizeBtn   = document.getElementById("removeSizeBtn");

    // Validate Create Size button state
    function validateCreateSize() {
      if (!createSizeBtn) return;
      
      const name = (newSizeInput?.value || "").trim();
      
      // Check if size name is valid (at least 3 chars, matches regex)
      const SIZE_REGEX = /^[A-Za-z0-9\s\/\-]{3,50}$/;
      const hasValidName = name && name.length >= 3 && SIZE_REGEX.test(name);
      
      // Check for duplicate (case-insensitive)
      let noDuplicate = true;
      if (hasValidName && sizeMainSelect) {
        const exists = Array.from(sizeMainSelect.options)
          .some(o => (o.value || "").toLowerCase() === name.toLowerCase());
        noDuplicate = !exists;
      }
      
      // Enable button only if all validations pass
      createSizeBtn.disabled = !(hasValidName && noDuplicate);
    }

    // Delete Size Modal
    const deleteSizeModal = document.getElementById("deleteSizeModal");
    const deleteSizeText = document.getElementById("deleteSizeText");
    const cancelSizeDeleteBtn = document.getElementById("cancelSizeDeleteBtn");
    const confirmSizeDeleteBtn = document.getElementById("confirmSizeDeleteBtn");
    let pendingDeleteSizeValue = null;

    const sizeCache = { loaded: false, items: [] };

    function loadSavedSizes() {
      if (!sizeMainSelect) return;

      if (sizeCache.loaded) {
        sizeCache.items.forEach(item => {
          const name = (item.name || "").trim();
          if (!name) return;
          const exists = Array.from(sizeMainSelect.options)
            .some(o => (o.value || "").toLowerCase() === name.toLowerCase());
          if (!exists) {
            sizeMainSelect.appendChild(new Option(name, name));
          }
        });
        return;
      }

      fetch("/api/product-sizes")
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (!data || !data.success || !Array.isArray(data.items)) return;
          sizeCache.loaded = true;
          sizeCache.items = data.items.slice();
          loadSavedSizes();
        })
        .catch(() => {});
    }

    if (sizeMainSelect) {
      loadSavedSizes();
    }
  
    outsideClickClose(sizeModal);
    
    // Custom outside click handler for Delete Size modal - restore Size modal
    if (deleteSizeModal) {
      deleteSizeModal.addEventListener("click", (e) => {
        if (e.target === deleteSizeModal) {
          hideModal(deleteSizeModal);
          pendingDeleteSizeValue = null;
          // Show Size modal again (in edit mode)
          if (sizeModal) {
            openSizeModal("edit");
          }
        }
      });
    }
  
    function syncSizeOptionsToEdit() {
      if (!sizeMainSelect || !sizeEditSelect) return;
  
      sizeEditSelect.innerHTML = '<option value="">Select Option</option>';
  
      Array.from(sizeMainSelect.options).forEach(opt => {
        if (!opt.value) return;
        sizeEditSelect.appendChild(
          new Option(opt.textContent, opt.value)
        );
      });
    }
  
    function openSizeModal(mode = "add") {
      if (!sizeModal) return;
  
      if (mode === "edit") {
        syncSizeOptionsToEdit();
        if (addSizePage)  addSizePage.style.display  = "none";
        if (editSizePage) editSizePage.style.display = "block";
        showModal(sizeModal, sizeEditSelect);
      } else {
        if (addSizePage)  addSizePage.style.display  = "block";
        if (editSizePage) editSizePage.style.display = "none";
        showModal(sizeModal, newSizeInput);
      }
    }
  
    // Size → + Add New
    if (openSizeLink) {
      openSizeLink.addEventListener("click", (e) => {
        e.preventDefault();
        openSizeModal("add");
      });
    }
  
    // Switch to Edit
    if (openEditSizeBtn) {
      openEditSizeBtn.addEventListener("click", () => openSizeModal("edit"));
    }
  
    // Switch back to Add from Edit
    if (openAddSizeBtn) {
      openAddSizeBtn.addEventListener("click", () => {
        validateCreateSize(); // Reset button state
        openSizeModal("add");
      });
    }
  
    // Close buttons (Cancel + Add back arrow)
    [cancelAddSize, cancelEditSize, addBackArrow2].forEach(btn => {
      if (btn) btn.addEventListener("click", () => {
        hideModal(sizeModal);
        validateCreateSize(); // Reset button state
      });
    });

    // Edit back arrow -> switch to Add New
    if (editBackArrow2) {
      editBackArrow2.addEventListener("click", () => {
        validateCreateSize(); // Reset button state
        openSizeModal("add");
      });
    }
  
      // Create Size
    const sizeError = document.getElementById("sizeError");
  
    // hide size error while typing
    if (newSizeInput && sizeError) {
      newSizeInput.addEventListener("input", () => {
        sizeError.innerText = "";
        sizeError.style.display = "none";
      });
    }

    // restrict Size Name to alphabets + spaces while typing
    restrictAlphaInput(newSizeInput, () => {
      if (sizeError) {
        sizeError.innerText = "";
        sizeError.style.display = "none";
      }
      validateCreateSize();
    });

    // Add event listeners for live validation
    if (newSizeInput) {
      newSizeInput.addEventListener("input", () => {
        validateCreateSize();
      });
    }

    // Initial validation (button starts disabled)
    validateCreateSize();
  
    if (createSizeBtn && sizeMainSelect && newSizeInput) {
      createSizeBtn.addEventListener("click", () => {
        if (sizeError) {
          sizeError.innerText = "";
          sizeError.style.display = "none";
        }
  
        const name = newSizeInput.value.trim();

        if (!name) {
            if (sizeError) {
              sizeError.innerText = "Size name is required";
              sizeError.style.display = "block";
            }
            return;
          }
        if (name.length < 3) {
          if (sizeError) {
            sizeError.innerText = "Size Name should contain atleast 3 characters.";
            sizeError.style.display = "block";
          }
          return;
        }
    
          if (!SIZE_REGEX.test(name)) {
            if (sizeError) {
              sizeError.innerText =
                "Invalid size. Use 1–20 characters with letters, numbers, space, / or -.";
              sizeError.style.display = "block";
            }
            return;
          }
    
          const exists = Array.from(sizeMainSelect.options)
            .some(o => (o.value || "").toLowerCase() === name.toLowerCase());
    
        // Block duplicate size (case-insensitive)
        if (exists) {
          if (sizeError) {
            sizeError.innerText = "This size already exists.";
            sizeError.style.display = "block";
          }
          return;
        }

        // Update UI immediately (optimistic update)
            const opt = new Option(name, name);
            sizeMainSelect.appendChild(opt);
          sizeMainSelect.disabled = false;
          sizeMainSelect.value = name;

        if (sizeCache.loaded) {
          sizeCache.items.push({ name });
        }

        // Reset form fields after successful save
        if (newSizeInput) newSizeInput.value = "";
        if (sizeError) {
          sizeError.innerText = "";
          sizeError.style.display = "none";
        }
    
        hideModal(sizeModal);

        // Reset button state
        validateCreateSize();

        // Show success toast immediately
        setTimeout(() => {
          showSuccessNotification("Size Name added successfully.");
        }, 150);

        // Save in backend (in background)
        fetch("/api/product-sizes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name })
        })
          .then(res => res.json())
          .then(data => {
            if (!data || !data.success) {
              const msg = data.message || "Failed to save size.";
              showErrorNotification(msg);
              const optionToRemove = Array.from(sizeMainSelect.options)
                .find(o => o.value === name);
              if (optionToRemove) {
                optionToRemove.remove();
              }
            }
          })
          .catch(() => {
            showErrorNotification("Server error while saving size.");
          });
        });
      }
    
    
      // When a size is chosen in Edit dropdown, fill the update input
      const updateSizeInput = document.getElementById("updateSizeInput");
      const updateSizeError = document.getElementById("updateSizeError");
      // Validate Update Size button state
      function validateUpdateSize() {
        if (!updateSizeBtn) return;
        
        const oldVal = sizeEditSelect?.value || "";
        const newVal = (updateSizeInput?.value || "").trim();
        
        // Check if size is selected
        const hasSelection = !!oldVal;
        
        // Check if new name is valid (not empty, at least 3 chars)
        const SIZE_REGEX = /^[A-Za-z\s]{3,50}$/;
        const hasValidName = newVal && newVal.length >= 3 && SIZE_REGEX.test(newVal);
        
        // Check for duplicate (case-insensitive), but allow updating to same name
        let noDuplicate = true;
        if (hasValidName && newVal.toLowerCase() !== oldVal.toLowerCase()) {
          // Check against dropdown options (fast check)
          const exists = Array.from(sizeMainSelect?.options || [])
            .some(o => o.value.toLowerCase() === newVal.toLowerCase());
          noDuplicate = !exists;
          
          // Note: Full backend check happens on button click, not during live validation
          // to avoid too many API calls while typing
        }
        
        // Enable button only if all validations pass
        updateSizeBtn.disabled = !(hasSelection && hasValidName && noDuplicate);
      }

      if (sizeEditSelect && updateSizeInput) {
        sizeEditSelect.addEventListener("change", () => {
          updateSizeInput.value = sizeEditSelect.value || "";
          if (updateSizeError) {
            updateSizeError.innerText = "";
            updateSizeError.style.display = "none";
          }
          validateUpdateSize();
        });
      }

      // Restrict Update Size Name to alphabets only by keyboard
      restrictAlphaInput(updateSizeInput, () => {
        if (updateSizeError) {
          updateSizeError.innerText = "";
          updateSizeError.style.display = "none";
        }
        validateUpdateSize();
      });

      // Add event listeners for live validation
      if (updateSizeInput) {
        updateSizeInput.addEventListener("input", () => {
          validateUpdateSize();
        });
      }

      // Initial validation
      validateUpdateSize();
    
      // Update Size
      if (updateSizeBtn && sizeMainSelect && sizeEditSelect && updateSizeInput) {
        updateSizeBtn.addEventListener("click", () => {
          const oldVal = sizeEditSelect.value;
          const newVal = updateSizeInput.value.trim();
    
          if (!oldVal) {
            if (updateSizeError) {
              updateSizeError.innerText = "Select a size first";
              updateSizeError.style.display = "block";
            }
            return;
          }
          if (!newVal) {
            if (updateSizeError) {
              updateSizeError.innerText = "Updated size name is required";
              updateSizeError.style.display = "block";
            }
            return;
          }

          // Validate new name format (same as create)
          const SIZE_REGEX = /^[A-Za-z\s]{3,50}$/;
          if (!SIZE_REGEX.test(newVal)) {
            if (updateSizeError) {
              updateSizeError.innerText =
                "Size Name should contain atleast 3 characters.";
              updateSizeError.style.display = "block";
            }
            return;
          }

          // Check for duplicate (case-insensitive), but allow updating to same name
          if (newVal.toLowerCase() !== oldVal.toLowerCase()) {
            // First check against dropdown options (fast check)
            const existsInDropdown = Array.from(sizeMainSelect.options)
              .some(o => o.value.toLowerCase() === newVal.toLowerCase());
            
            if (existsInDropdown) {
              if (updateSizeError) {
                updateSizeError.innerText = "This size name already exists.";
                updateSizeError.style.display = "block";
              }
              return;
            }

            // Also check against all sizes from backend to catch duplicates
            fetch("/api/product-sizes")
              .then(res => (res.ok ? res.json() : null))
              .then(data => {
                if (data && data.success && Array.isArray(data.items)) {
                  // Check if new name already exists (case-insensitive), excluding the current size
                  const existsInBackend = data.items.some(
                    item => {
                      const itemName = (item.name || "").trim().toLowerCase();
                      return itemName === newVal.toLowerCase() && 
                             itemName !== oldVal.toLowerCase();
                    }
                  );
                  
                  if (existsInBackend) {
                    if (updateSizeError) {
                      updateSizeError.innerText = "This size name already exists.";
                      updateSizeError.style.display = "block";
                    }
                    // Revert UI changes if duplicate found
                    Array.from(sizeMainSelect.options).forEach(opt => {
                      if (opt.value === newVal) {
                        opt.value = oldVal;
                        opt.textContent = oldVal;
                      }
                    });
                    Array.from(sizeEditSelect.options).forEach(opt => {
                      if (opt.value === newVal) {
                        opt.value = oldVal;
                        opt.textContent = oldVal;
                      }
                    });
                    sizeMainSelect.value = oldVal;
                    sizeEditSelect.value = oldVal;
                    if (updateSizeInput) updateSizeInput.value = oldVal;
                    return;
                  }
                }
                
                // No duplicate found, proceed with update
                performSizeUpdate(oldVal, newVal);
              })
              .catch(() => {
                // If fetch fails, proceed with update (already checked dropdown)
                performSizeUpdate(oldVal, newVal);
              });
            return; // Exit early, update will happen in fetch callback
          } else {
            // Name hasn't changed, no need to update
            hideModal(sizeModal);
            return;
          }
        });
      }

      // Helper function to perform size update
      function performSizeUpdate(oldVal, newVal) {
        // Clear error if validation passes
        if (updateSizeError) {
          updateSizeError.innerText = "";
          updateSizeError.style.display = "none";
          }
    
          // main dropdown
          Array.from(sizeMainSelect.options).forEach(opt => {
            if (opt.value === oldVal) {
              opt.value = newVal;
              opt.textContent = newVal;
            }
          });
    
          // edit dropdown
          Array.from(sizeEditSelect.options).forEach(opt => {
            if (opt.value === oldVal) {
              opt.value = newVal;
              opt.textContent = newVal;
            }
          });
    
          sizeMainSelect.value = newVal;
          sizeEditSelect.value = newVal;
    
          hideModal(sizeModal);

        // Show success toast immediately
        setTimeout(() => {
          showSuccessNotification("Size Name updated successfully.");
        }, 150);

        // Clear cache to force reload on next access
        sizeCache.loaded = false;
        sizeCache.items = [];
      }
    
      // Remove Size
      // Remove Size - Show Delete Confirmation Modal
      if (removeSizeBtn && sizeMainSelect && sizeEditSelect && updateSizeInput) {
        removeSizeBtn.addEventListener("click", () => {
          const val = sizeEditSelect.value;
          if (!val) return;
    
          pendingDeleteSizeValue = val;
          
          // Hide Size modal and show Delete Size modal
          if (sizeModal) {
            hideModal(sizeModal);
          }
          
          // Show delete confirmation modal
          if (deleteSizeText) {
            deleteSizeText.textContent = `Are you sure want to delete "${val}"?`;
          }
          if (deleteSizeModal) {
            showModal(deleteSizeModal);
          }
        });
      }

      // Cancel Delete Size
      if (cancelSizeDeleteBtn) {
        cancelSizeDeleteBtn.addEventListener("click", () => {
          hideModal(deleteSizeModal);
          pendingDeleteSizeValue = null;
          
          // Show Size modal again (in edit mode)
          if (sizeModal) {
            openSizeModal("edit");
          }
        });
      }

      // Confirm Delete Size
      if (confirmSizeDeleteBtn && sizeMainSelect && sizeEditSelect && updateSizeInput) {
        confirmSizeDeleteBtn.addEventListener("click", () => {
          if (!pendingDeleteSizeValue) return;

          const val = pendingDeleteSizeValue;

          // Remove from dropdowns
          Array.from(sizeMainSelect.options).forEach(opt => {
            if (opt.value === val) opt.remove();
          });
    
          Array.from(sizeEditSelect.options).forEach(opt => {
            if (opt.value === val) opt.remove();
          });
    
          sizeEditSelect.value = "";
          updateSizeInput.value = "";
          
          // Close Delete Size modal (Size modal stays closed)
          hideModal(deleteSizeModal);
          
          pendingDeleteSizeValue = null;
        });
      }
    
      /* =========================================================
         ✅ COLOR MODAL
      ========================================================= */
      const colorModal        = document.getElementById("colorModal");
      const addColorPage      = document.getElementById("addColorPage");
      const editColorPage     = document.getElementById("editColorPage");
      const openColorLink     = document.getElementById("openColorModalLink");
      const openEditColorBtn  = document.getElementById("openEditColorBtn");
      const openAddColorBtn   = document.getElementById("openAddColorBtn");
      const cancelAddColor    = document.getElementById("cancelAddColor");
      const cancelEditColor   = document.getElementById("cancelEditColor");
      const addBackArrow1     = document.getElementById("addBackArrow1");
      const editBackArrow1    = document.getElementById("editBackArrow1");
      const newColorInput     = document.getElementById("newColorInput");
    
      const colorMainSelect   = document.getElementById("colorMainSelect");
      const colorEditSelect   = document.getElementById("colorSelect");
      const createColorBtn    = document.getElementById("createSizeColor");
      const updateColorBtn    = document.getElementById("updateColorBtn");
      const removeColorBtn    = document.getElementById("removeColorBtn");
      const updateColorInput  = document.getElementById("updateColorInput");
      const updateColorError  = document.getElementById("updateColorError");

      // Validate Create Color button state
      function validateCreateColor() {
        if (!createColorBtn) return;
        
        const name = (newColorInput?.value || "").trim();
        
        // Check if color name is valid (at least 3 chars, matches regex)
        const COLOR_REGEX = /^[A-Za-z\s]{3,50}$/;
        const hasValidName = name && name.length >= 3 && COLOR_REGEX.test(name);
        
        // Check for duplicate (case-insensitive)
        let noDuplicate = true;
        if (hasValidName && colorMainSelect) {
          const exists = Array.from(colorMainSelect.options)
            .some(o => (o.value || "").toLowerCase() === name.toLowerCase());
          noDuplicate = !exists;
        }
        
        // Enable button only if all validations pass
        createColorBtn.disabled = !(hasValidName && noDuplicate);
      }

      // Delete Color Modal
      const deleteColorModal = document.getElementById("deleteColorModal");
      const deleteColorText = document.getElementById("deleteColorText");
      const cancelColorDeleteBtn = document.getElementById("cancelColorDeleteBtn");
      const confirmColorDeleteBtn = document.getElementById("confirmColorDeleteBtn");
      let pendingDeleteColorValue = null;

      const colorCache = { loaded: false, items: [] };

      function loadSavedColors() {
        if (!colorMainSelect) return;

        if (colorCache.loaded) {
          colorCache.items.forEach(item => {
            const name = (item.name || "").trim();
            if (!name) return;
            const exists = Array.from(colorMainSelect.options)
              .some(o => (o.value || "").toLowerCase() === name.toLowerCase());
            if (!exists) {
              colorMainSelect.appendChild(new Option(name, name));
            }
          });
          return;
        }

        fetch("/api/product-colors")
          .then(res => (res.ok ? res.json() : null))
          .then(data => {
            if (!data || !data.success || !Array.isArray(data.items)) return;
            colorCache.loaded = true;
            colorCache.items = data.items.slice();
            loadSavedColors();
          })
          .catch(() => {});
      }

      if (colorMainSelect) {
        loadSavedColors();
      }
    
      outsideClickClose(colorModal);
      
      // Custom outside click handler for Delete Color modal - restore Color modal
      if (deleteColorModal) {
        deleteColorModal.addEventListener("click", (e) => {
          if (e.target === deleteColorModal) {
            hideModal(deleteColorModal);
            pendingDeleteColorValue = null;
            // Show Color modal again (in edit mode)
            if (colorModal) {
              openColorModal("edit");
            }
          }
        });
      }
    
      function syncColorOptionsToEdit() {
        if (!colorMainSelect || !colorEditSelect) return;
    
        colorEditSelect.innerHTML = '<option value="">Select Option</option>';
    
        Array.from(colorMainSelect.options).forEach(opt => {
          if (!opt.value) return;
          colorEditSelect.appendChild(
            new Option(opt.textContent, opt.value)
          );
        });
      }
    
      function openColorModal(mode = "add") {
        if (!colorModal) return;
    
        if (mode === "edit") {
          syncColorOptionsToEdit();
          if (addColorPage)  addColorPage.style.display  = "none";
          if (editColorPage) editColorPage.style.display = "block";
          showModal(colorModal, colorEditSelect);
        } else {
          if (addColorPage)  addColorPage.style.display  = "block";
          if (editColorPage) editColorPage.style.display = "none";
          showModal(colorModal, newColorInput);
        }
      }
    
      if (openColorLink) {
        openColorLink.addEventListener("click", (e) => {
          e.preventDefault();
          openColorModal("add");
        });
      }
    
      if (openEditColorBtn) {
        openEditColorBtn.addEventListener("click", () => openColorModal("edit"));
      }
    
      if (openAddColorBtn) {
        openAddColorBtn.addEventListener("click", () => {
          validateCreateColor(); // Reset button state
          openColorModal("add");
        });
      }
    
      // Close buttons (Cancel + Add back arrow)
      [cancelAddColor, cancelEditColor, addBackArrow1].forEach(btn => {
        if (btn) btn.addEventListener("click", () => {
          hideModal(colorModal);
          validateCreateColor(); // Reset button state
        });
      });

      // Edit back arrow -> switch to Add New
      if (editBackArrow1) {
        editBackArrow1.addEventListener("click", () => {
          validateCreateColor(); // Reset button state
          openColorModal("add");
        });
      }
    
        // Create Color
      const colorError = document.getElementById("colorError");
    
      // hide color error while typing
      if (newColorInput && colorError) {
        newColorInput.addEventListener("input", () => {
          colorError.innerText = "";
          colorError.style.display = "none";
        });
      }

      // restrict Color Name to alphabets + spaces while typing
      restrictAlphaInput(newColorInput, () => {
        if (colorError) {
          colorError.innerText = "";
          colorError.style.display = "none";
        }
        validateCreateColor();
      });

      // Add event listeners for live validation
      if (newColorInput) {
        newColorInput.addEventListener("input", () => {
          validateCreateColor();
        });
      }

      // Initial validation (button starts disabled)
      validateCreateColor();
    
      if (createColorBtn && colorMainSelect && newColorInput) {
        createColorBtn.addEventListener("click", () => {
          if (colorError) {
            colorError.innerText = "";
            colorError.style.display = "none";
          }
    
          const name = newColorInput.value.trim();
    
          if (!name) {
            if (colorError) {
              colorError.innerText = "Color name is required";
              colorError.style.display = "block";
            }
            return;
          }
          if (name.length < 3) {
            if (colorError) {
              colorError.innerText = "Color Name should contain atleast 3 characters.";
              colorError.style.display = "block";
            }
            return;
          }
    
          if (!COLOR_REGEX.test(name)) {
            if (colorError) {
              colorError.innerText =
                "Invalid color. Use 3–20 letters and spaces only (e.g., Red, Dark Blue).";
              colorError.style.display = "block";
            }
            return;
          }
    
          const exists = Array.from(colorMainSelect.options)
            .some(o => (o.value || "").toLowerCase() === name.toLowerCase());
    
          // Block duplicate color (case-insensitive)
          if (exists) {
            if (colorError) {
              colorError.innerText = "This color already exists.";
              colorError.style.display = "block";
            }
            return;
          }

          // Update UI immediately (optimistic update)
            const opt = new Option(name, name);
            colorMainSelect.appendChild(opt);
          colorMainSelect.disabled = false;
          colorMainSelect.value = name;

          if (colorCache.loaded) {
            colorCache.items.push({ name });
          }

          // Reset form fields after successful save
          if (newColorInput) newColorInput.value = "";
          if (colorError) {
            colorError.innerText = "";
            colorError.style.display = "none";
          }
    
          hideModal(colorModal);

          // Reset button state
          validateCreateColor();

          // Show success toast immediately
          setTimeout(() => {
            showSuccessNotification("Color Name added successfully.");
          }, 150);

          // Save in backend (in background)
          fetch("/api/product-colors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name })
          })
            .then(res => res.json())
            .then(data => {
              if (!data || !data.success) {
                const msg = data.message || "Failed to save color.";
                showErrorNotification(msg);
                const optionToRemove = Array.from(colorMainSelect.options)
                  .find(o => o.value === name);
                if (optionToRemove) {
                  optionToRemove.remove();
                }
              }
            })
            .catch(() => {
              showErrorNotification("Server error while saving color.");
            });
        });
      }
    
    
      // Validate Update Color button state
      function validateUpdateColor() {
        if (!updateColorBtn) return;
        
        const oldVal = colorEditSelect?.value || "";
        const newVal = (updateColorInput?.value || "").trim();
        
        // Check if color is selected
        const hasSelection = !!oldVal;
        
        // Check if new name is valid (not empty, at least 3 chars)
        const COLOR_REGEX = /^[A-Za-z\s]{3,50}$/;
        const hasValidName = newVal && newVal.length >= 3 && COLOR_REGEX.test(newVal);
        
        // Check for duplicate (case-insensitive), but allow updating to same name
        let noDuplicate = true;
        if (hasValidName && newVal.toLowerCase() !== oldVal.toLowerCase()) {
          // Check against dropdown options (fast check)
          const exists = Array.from(colorMainSelect?.options || [])
            .some(o => o.value.toLowerCase() === newVal.toLowerCase());
          noDuplicate = !exists;
          
          // Note: Full backend check happens on button click, not during live validation
          // to avoid too many API calls while typing
        }
        
        // Enable button only if all validations pass
        updateColorBtn.disabled = !(hasSelection && hasValidName && noDuplicate);
      }
    
      // When selecting color in Edit, fill input
      if (colorEditSelect && updateColorInput) {
        colorEditSelect.addEventListener("change", () => {
          updateColorInput.value = colorEditSelect.value || "";
          if (updateColorError) {
            updateColorError.innerText = "";
            updateColorError.style.display = "none";
          }
          validateUpdateColor();
        });
      }

      // Restrict Update Color Name to alphabets only by keyboard
      restrictAlphaInput(updateColorInput, () => {
        if (updateColorError) {
          updateColorError.innerText = "";
          updateColorError.style.display = "none";
        }
        validateUpdateColor();
      });

      // Add event listeners for live validation
      if (updateColorInput) {
        updateColorInput.addEventListener("input", () => {
          validateUpdateColor();
        });
      }

      // Initial validation
      validateUpdateColor();
    
      // Update Color
      if (updateColorBtn && colorMainSelect && colorEditSelect && updateColorInput) {
        updateColorBtn.addEventListener("click", () => {
          const oldVal = colorEditSelect.value;
          const newVal = updateColorInput.value.trim();
    
          if (!oldVal) {
            if (updateColorError) {
              updateColorError.innerText = "Select a color first";
              updateColorError.style.display = "block";
            }
            return;
          }
          if (!newVal) {
            if (updateColorError) {
              updateColorError.innerText = "Updated color name is required";
              updateColorError.style.display = "block";
            }
            return;
          }

          // Validate new name format (same as create)
          const COLOR_REGEX = /^[A-Za-z\s]{3,50}$/;
          if (!COLOR_REGEX.test(newVal)) {
            if (updateColorError) {
              updateColorError.innerText =
                "Color Name should contain atleast 3 characters.";
              updateColorError.style.display = "block";
            }
            return;
          }

          // Check for duplicate (case-insensitive), but allow updating to same name
          if (newVal.toLowerCase() !== oldVal.toLowerCase()) {
            // First check against dropdown options (fast check)
            const existsInDropdown = Array.from(colorMainSelect.options)
              .some(o => o.value.toLowerCase() === newVal.toLowerCase());
            
            if (existsInDropdown) {
              if (updateColorError) {
                updateColorError.innerText = "This color name already exists.";
                updateColorError.style.display = "block";
              }
              return;
            }

            // Also check against all colors from backend to catch duplicates
            fetch("/api/product-colors")
              .then(res => (res.ok ? res.json() : null))
              .then(data => {
                if (data && data.success && Array.isArray(data.items)) {
                  // Check if new name already exists (case-insensitive), excluding the current color
                  const existsInBackend = data.items.some(
                    item => {
                      const itemName = (item.name || "").trim().toLowerCase();
                      return itemName === newVal.toLowerCase() && 
                             itemName !== oldVal.toLowerCase();
                    }
                  );
                  
                  if (existsInBackend) {
                    if (updateColorError) {
                      updateColorError.innerText = "This color name already exists.";
                      updateColorError.style.display = "block";
                    }
                    // Revert UI changes if duplicate found
                    Array.from(colorMainSelect.options).forEach(opt => {
                      if (opt.value === newVal) {
                        opt.value = oldVal;
                        opt.textContent = oldVal;
                      }
                    });
                    Array.from(colorEditSelect.options).forEach(opt => {
                      if (opt.value === newVal) {
                        opt.value = oldVal;
                        opt.textContent = oldVal;
                      }
                    });
                    colorMainSelect.value = oldVal;
                    colorEditSelect.value = oldVal;
                    if (updateColorInput) updateColorInput.value = oldVal;
                    return;
                  }
                }
                
                // No duplicate found, proceed with update
                performColorUpdate(oldVal, newVal);
              })
              .catch(() => {
                // If fetch fails, proceed with update (already checked dropdown)
                performColorUpdate(oldVal, newVal);
              });
            return; // Exit early, update will happen in fetch callback
          } else {
            // Name hasn't changed, no need to update
            hideModal(colorModal);
            return;
          }
        });
      }

      // Helper function to perform color update
      function performColorUpdate(oldVal, newVal) {
        // Clear error if validation passes
        if (updateColorError) {
          updateColorError.innerText = "";
          updateColorError.style.display = "none";
          }
    
          Array.from(colorMainSelect.options).forEach(opt => {
            if (opt.value === oldVal) {
              opt.value = newVal;
              opt.textContent = newVal;
            }
          });
    
          Array.from(colorEditSelect.options).forEach(opt => {
            if (opt.value === oldVal) {
              opt.value = newVal;
              opt.textContent = newVal;
            }
          });
    
          colorMainSelect.value = newVal;
          colorEditSelect.value = newVal;
    
          hideModal(colorModal);

        // Show success toast immediately
        setTimeout(() => {
          showSuccessNotification("Color Name updated successfully.");
        }, 150);

        // Clear cache to force reload on next access
        colorCache.loaded = false;
        colorCache.items = [];
      }
    
      // Remove Color
      // Remove Color - Show Delete Confirmation Modal
      if (removeColorBtn && colorMainSelect && colorEditSelect && updateColorInput) {
        removeColorBtn.addEventListener("click", () => {
          const val = colorEditSelect.value;
          if (!val) return;
    
          pendingDeleteColorValue = val;
          
          // Hide Color modal and show Delete Color modal
          if (colorModal) {
            hideModal(colorModal);
          }
          
          // Show delete confirmation modal
          if (deleteColorText) {
            deleteColorText.textContent = `Are you sure want to delete "${val}"?`;
          }
          if (deleteColorModal) {
            showModal(deleteColorModal);
          }
        });
      }

      // Cancel Delete Color
      if (cancelColorDeleteBtn) {
        cancelColorDeleteBtn.addEventListener("click", () => {
          hideModal(deleteColorModal);
          pendingDeleteColorValue = null;
          
          // Show Color modal again (in edit mode)
          if (colorModal) {
            openColorModal("edit");
          }
        });
      }

      // Confirm Delete Color
      if (confirmColorDeleteBtn && colorMainSelect && colorEditSelect && updateColorInput) {
        confirmColorDeleteBtn.addEventListener("click", () => {
          if (!pendingDeleteColorValue) return;

          const val = pendingDeleteColorValue;

          // Remove from dropdowns
          Array.from(colorMainSelect.options).forEach(opt => {
            if (opt.value === val) opt.remove();
          });
    
          Array.from(colorEditSelect.options).forEach(opt => {
            if (opt.value === val) opt.remove();
          });
    
          colorEditSelect.value = "";
          updateColorInput.value = "";
          
          // Close Delete Color modal (Color modal stays closed)
          hideModal(deleteColorModal);
          
          pendingDeleteColorValue = null;
        });
      }
    
      /* =========================================================
         ✅ SUPPLIER MODAL
      ========================================================= */
      const supplierModal        = document.getElementById("supplierModal");
      const addSupplierPage      = document.getElementById("addSupplierPage");
      const editSupplierPage     = document.getElementById("editSupplierPage");
      const openSupplierLink     = document.getElementById("openSupplierModalLink");
      const openEditSupplierBtn  = document.getElementById("openEditSupplierBtn");
      const openAddSupplierBtn   = document.getElementById("openAddSupplierBtn");
      const cancelAddSupplier    = document.getElementById("cancelAddSupplier");
      const cancelEditSupplier   = document.getElementById("cancelEditSupplier");
      const addBackArrow         = document.getElementById("addBackArrow");
      const editBackArrow        = document.getElementById("editBackArrow");
    
      const supplierMainSelect   = document.getElementById("supplierMainSelect");
      const supplierEditSelect   = document.getElementById("supplierSelect");
      const createSupplierBtn    = document.getElementById("createSupplierBtn");
      const updateSupplierBtn    = document.getElementById("updateSupplierBtn");
      const removeSupplierBtn    = document.getElementById("removeSupplierBtn");
      const updateSupplierError  = document.getElementById("updateSupplierError");
      const errEditSupplierContact = document.getElementById("errEditSupplierContact");
      const errEditSupplierPhone   = document.getElementById("errEditSupplierPhone");
      const errEditSupplierEmail   = document.getElementById("errEditSupplierEmail");
      const errEditSupplierAddress = document.getElementById("errEditSupplierAddress");

      // Delete Supplier Modal
      const deleteSupplierModal = document.getElementById("deleteSupplierModal");
      const deleteSupplierText = document.getElementById("deleteSupplierText");
      const cancelSupplierDeleteBtn = document.getElementById("cancelSupplierDeleteBtn");
      const confirmSupplierDeleteBtn = document.getElementById("confirmSupplierDeleteBtn");
      let pendingDeleteSupplierValue = null;
    
      const newSupplierName      = document.getElementById("newSupplierName");
      const newSupplierContact   = document.getElementById("newSupplierContactPerson");
      const newSupplierPhone     = document.getElementById("newSupplierPhone");
      const newSupplierEmail     = document.getElementById("newSupplierEmail");
      const newSupplierAddress   = document.getElementById("newSupplierAddress");

      // Validate Create Supplier button state
      function validateCreateSupplier() {
        if (!createSupplierBtn) return;
        
        const name = (newSupplierName?.value || "").trim();
        
        // Check if supplier name is valid (at least 3 chars, matches regex)
        const SUPPLIER_NAME_REGEX = /^[A-Za-z\s]{3,50}$/;
        const hasValidName = name && name.length >= 3 && SUPPLIER_NAME_REGEX.test(name);
        
        // Check for duplicate (case-insensitive)
        let noDuplicate = true;
        if (hasValidName && supplierMainSelect) {
          const exists = Array.from(supplierMainSelect.options)
            .some(o => (o.value || "").toLowerCase() === name.toLowerCase());
          noDuplicate = !exists;
        }
        
        // Enable button only if all validations pass
        createSupplierBtn.disabled = !(hasValidName && noDuplicate);
      }
    
      const editSupplierContact  = document.getElementById("editSupplierContactPerson");
      const editSupplierPhone    = document.getElementById("editSupplierPhone");
      const editSupplierEmail    = document.getElementById("editSupplierEmail");
      const editSupplierAddress  = document.getElementById("editSupplierAddress");
    
      // error spans
      const errSupplierName   = document.getElementById("errSupplierName");
      const errContactPerson  = document.getElementById("errContactPerson");
      const errPhone          = document.getElementById("errPhone");
      const errEmail          = document.getElementById("errEmail");
      const errAddress        = document.getElementById("errAddress");
    
      outsideClickClose(supplierModal);
      
      // Custom outside click handler for Delete Supplier modal - restore Supplier modal
      if (deleteSupplierModal) {
        deleteSupplierModal.addEventListener("click", (e) => {
          if (e.target === deleteSupplierModal) {
            hideModal(deleteSupplierModal);
            pendingDeleteSupplierValue = null;
            // Show Supplier modal again (in edit mode)
            if (supplierModal) {
              openSupplierModal("edit");
            }
          }
        });
      }

      const supplierCache = { loaded: false, items: [] };

      function loadSavedSuppliers() {
        if (!supplierMainSelect) return;

        if (supplierCache.loaded) {
          supplierCache.items.forEach(item => {
            const name = (item.name || "").trim();
            if (!name) return;
            const exists = Array.from(supplierMainSelect.options)
              .some(o => (o.value || "").toLowerCase() === name.toLowerCase());
            if (!exists) {
              const opt = new Option(name, name);
              opt.dataset.contact = item.contact || "";
              opt.dataset.phone   = item.phone || "";
              opt.dataset.email   = item.email || "";
              opt.dataset.address = item.address || "";
              supplierMainSelect.appendChild(opt);
            }
          });
          return;
        }

        fetch("/api/product-suppliers")
          .then(res => (res.ok ? res.json() : null))
          .then(data => {
            if (!data || !data.success || !Array.isArray(data.items)) return;
            supplierCache.loaded = true;
            supplierCache.items = data.items.slice();
            loadSavedSuppliers();
          })
          .catch(() => {});
      }

      if (supplierMainSelect) {
        loadSavedSuppliers();
      }
    
      function syncSupplierOptionsToEdit() {
        if (!supplierMainSelect || !supplierEditSelect) return;
    
        supplierEditSelect.innerHTML = '<option value="">Select Option</option>';
    
        Array.from(supplierMainSelect.options).forEach(opt => {
          if (!opt.value) return;
          const clone = new Option(opt.textContent, opt.value);
          clone.dataset.contact = opt.dataset.contact || "";
          clone.dataset.phone   = opt.dataset.phone   || "";
          clone.dataset.email   = opt.dataset.email   || "";
          clone.dataset.address = opt.dataset.address || "";
          supplierEditSelect.appendChild(clone);
        });
      }
    
      function openSupplierModal(mode = "add") {
        if (!supplierModal) return;
    
        if (mode === "edit") {
          syncSupplierOptionsToEdit();
          if (addSupplierPage)  addSupplierPage.style.display  = "none";
          if (editSupplierPage) editSupplierPage.style.display = "block";
          showModal(supplierModal, supplierEditSelect);
        } else {
          if (addSupplierPage)  addSupplierPage.style.display  = "block";
          if (editSupplierPage) editSupplierPage.style.display = "none";
          showModal(supplierModal, newSupplierName);
        }
      }
    
      // open links
      if (openSupplierLink) {
        openSupplierLink.addEventListener("click", (e) => {
          e.preventDefault();
          openSupplierModal("add");
        });
      }
      if (openEditSupplierBtn) {
        openEditSupplierBtn.addEventListener("click", () => openSupplierModal("edit"));
      }
      if (openAddSupplierBtn) {
        openAddSupplierBtn.addEventListener("click", () => {
          validateCreateSupplier(); // Reset button state
          openSupplierModal("add");
        });
      }

      // close buttons (Cancel + Add page back arrow)
      [cancelAddSupplier, cancelEditSupplier, addBackArrow].forEach(btn => {
        if (btn) btn.addEventListener("click", () => {
          hideModal(supplierModal);
          validateCreateSupplier(); // Reset button state
        });
      });

      // Edit Supplier back arrow → switch to Add New Supplier (keep modal open)
      if (editBackArrow) {
        editBackArrow.addEventListener("click", () => {
          validateCreateSupplier(); // ensure Create button state correct
          openSupplierModal("add");
        });
      }
    
      // helper to clear errors
      function clearSupplierErrors() {
        [errSupplierName, errContactPerson, errPhone, errEmail, errAddress].forEach(el => {
          if (!el) return;
          el.innerText = "";
          el.style.display = "none";
        });
      }
    
      // hide error when typing
      [
        [newSupplierName,   errSupplierName],
        [newSupplierContact,errContactPerson],
        [newSupplierPhone,  errPhone],
        [newSupplierEmail,  errEmail],
        [newSupplierAddress,errAddress]
      ].forEach(([input, errEl]) => {
        if (!input || !errEl) return;
        input.addEventListener("input", () => {
          errEl.innerText = "";
          errEl.style.display = "none";
        });
      });

      // restrict Supplier Name to alphabets + spaces while typing
      restrictAlphaInput(newSupplierName, () => {
        if (errSupplierName) {
          errSupplierName.innerText = "";
          errSupplierName.style.display = "none";
        }
        validateCreateSupplier();
      });

      // Add event listeners for live validation
      if (newSupplierName) {
        newSupplierName.addEventListener("input", () => {
          validateCreateSupplier();
        });
      }

      // Initial validation (button starts disabled)
      validateCreateSupplier();
    
      // Create Supplier
      if (createSupplierBtn && supplierMainSelect && newSupplierName) {
        createSupplierBtn.addEventListener("click", () => {
          clearSupplierErrors();
          let valid = true;
    
          const name    = (newSupplierName.value || "").trim();
          const contact = (newSupplierContact?.value || "").trim();
          const phone   = (newSupplierPhone?.value || "").trim();
          const email   = (newSupplierEmail?.value || "").trim();
          const address = (newSupplierAddress?.value || "").trim();
    
          // Supplier name
          if (!name) {
            valid = false;
            if (errSupplierName) {
              errSupplierName.innerText = "Supplier name is required";
              errSupplierName.style.display = "block";
            }
          } else if (!SUPPLIER_NAME_REGEX.test(name)) {
            valid = false;
            if (errSupplierName) {
              errSupplierName.innerText = "Supplier Name should contain atleast 3 characters.";
              errSupplierName.style.display = "block";
            }
          }
    
          // Contact person – same rules as Supplier Name
          if (!contact) {
            valid = false;
            if (errContactPerson) {
              errContactPerson.innerText = "Contact Person Name should contain atleast 3 characters.";
              errContactPerson.style.display = "block";
            }
          } else if (!PERSON_NAME_REGEX.test(contact)) {
            valid = false;
            if (errContactPerson) {
              errContactPerson.innerText = "Contact Person Name should contain atleast 3 characters.";
              errContactPerson.style.display = "block";
            }
          }
    
          // Phone
          if (!phone) {
            valid = false;
            if (errPhone) {
              errPhone.innerText = "Phone number is required";
              errPhone.style.display = "block";
            }
          } else if (!SUPPLIER_PHONE_REGEX.test(phone)) {
            valid = false;
            if (errPhone) {
              errPhone.innerText = "Enter a valid Indian phone (e.g. 9876543210 or +91 9876543210)";
              errPhone.style.display = "block";
            }
          }
    
          // Email
          if (!email) {
            valid = false;
            if (errEmail) {
              errEmail.innerText = "Email is required";
              errEmail.style.display = "block";
            }
          } else if (!SUPPLIER_EMAIL_REGEX.test(email)) {
            valid = false;
            if (errEmail) {
              errEmail.innerText = "Use a valid email (gmail, outlook, yahoo, stackly, ...)";
              errEmail.style.display = "block";
            }
          }
    
          // Address
          if (!address) {
            valid = false;
            if (errAddress) {
              errAddress.innerText = "Address is required";
              errAddress.style.display = "block";
            }
          } else if (address.length < 5 || address.length > 120) {
            valid = false;
            if (errAddress) {
              errAddress.innerText = "Address must be 5–120 characters";
              errAddress.style.display = "block";
            }
          }
    
          if (!valid) return;
    
          // Check duplicate supplier (case-insensitive)
          let opt = Array.from(supplierMainSelect.options)
            .find(o => (o.value || "").toLowerCase() === name.toLowerCase());
    
          if (opt) {
            // Duplicate name – show error on name field
            if (errSupplierName) {
              errSupplierName.innerText = "Supplier name already exists";
              errSupplierName.style.display = "block";
            }
            return;
          }
    
          // Update UI immediately (optimistic update)
            opt = new Option(name, name);
            supplierMainSelect.appendChild(opt);
          opt.dataset.contact = contact;
          opt.dataset.phone   = phone;
          opt.dataset.email   = email;
          opt.dataset.address = address;
          supplierMainSelect.disabled = false;
          supplierMainSelect.value = name;

          if (supplierCache.loaded) {
            const existing = supplierCache.items.find(
              s => (s.name || "").toLowerCase() === name.toLowerCase()
            );
            if (existing) {
              existing.contact = contact;
              existing.phone   = phone;
              existing.email   = email;
              existing.address = address;
            } else {
              supplierCache.items.push({ name, contact, phone, email, address });
            }
          }
    
          // Reset form fields after successful save
          if (newSupplierName) newSupplierName.value = "";
          if (newSupplierContact) newSupplierContact.value = "";
          if (newSupplierPhone) newSupplierPhone.value = "";
          if (newSupplierEmail) newSupplierEmail.value = "";
          if (newSupplierAddress) newSupplierAddress.value = "";
          clearSupplierErrors();

          hideModal(supplierModal);

          // Reset button state
          validateCreateSupplier();

          // Show success toast immediately
          setTimeout(() => {
            showSuccessNotification("Supplier Name added successfully.");
          }, 150);

          // Save in backend (in background)
          fetch("/api/product-suppliers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, contact, phone, email, address })
          })
            .then(res => res.json())
            .then(data => {
              if (!data || !data.success) {
                const msg = data.message || "Failed to save supplier.";
                showErrorNotification(msg);
                const optionToRemove = Array.from(supplierMainSelect.options)
                  .find(o => o.value === name);
                if (optionToRemove) {
                  optionToRemove.remove();
                }
              }
            })
            .catch(() => {
              showErrorNotification("Server error while saving supplier.");
            });
        });
      }
    
      // Validate Update Supplier button state
      function validateUpdateSupplier() {
        if (!updateSupplierBtn) return;
        
        const key = supplierEditSelect?.value || "";
        
        // Check if supplier is selected
        const hasSelection = !!key;
        
        // Enable button only if supplier is selected
        updateSupplierBtn.disabled = !hasSelection;
      }
    
      // When a supplier is selected in Edit → fill fields from dataset
      if (supplierEditSelect) {
        supplierEditSelect.addEventListener("change", () => {
          const val = supplierEditSelect.value;
          if (!val) {
            if (editSupplierContact) editSupplierContact.value = "";
            if (editSupplierPhone)   editSupplierPhone.value   = "";
            if (editSupplierEmail)   editSupplierEmail.value   = "";
            if (editSupplierAddress) editSupplierAddress.value = "";
            if (updateSupplierError) {
              updateSupplierError.innerText = "";
              updateSupplierError.style.display = "none";
            }
            validateUpdateSupplier();
            return;
          }
  
          // Clear error when a supplier is selected
          if (updateSupplierError) {
            updateSupplierError.innerText = "";
            updateSupplierError.style.display = "none";
          }
    
          const opt = Array.from(supplierEditSelect.options).find(o => o.value === val);
          if (!opt) return;
    
          if (editSupplierContact) editSupplierContact.value = opt.dataset.contact || "";
          if (editSupplierPhone)   editSupplierPhone.value   = opt.dataset.phone   || "";
          if (editSupplierEmail)   editSupplierEmail.value   = opt.dataset.email   || "";
          if (editSupplierAddress) editSupplierAddress.value = opt.dataset.address || "";
          
          // Clear individual field errors when supplier is selected
          if (errEditSupplierContact) {
            errEditSupplierContact.innerText = "";
            errEditSupplierContact.style.display = "none";
          }
          if (errEditSupplierPhone) {
            errEditSupplierPhone.innerText = "";
            errEditSupplierPhone.style.display = "none";
          }
          if (errEditSupplierEmail) {
            errEditSupplierEmail.innerText = "";
            errEditSupplierEmail.style.display = "none";
          }
          if (errEditSupplierAddress) {
            errEditSupplierAddress.innerText = "";
            errEditSupplierAddress.style.display = "none";
          }
          
          validateUpdateSupplier();
        });
      }

      // Clear errors when typing in Edit Supplier fields
      if (editSupplierContact && errEditSupplierContact) {
        editSupplierContact.addEventListener("input", () => {
          errEditSupplierContact.innerText = "";
          errEditSupplierContact.style.display = "none";
        });
      }
      if (editSupplierPhone && errEditSupplierPhone) {
        editSupplierPhone.addEventListener("input", () => {
          errEditSupplierPhone.innerText = "";
          errEditSupplierPhone.style.display = "none";
        });
      }
      if (editSupplierEmail && errEditSupplierEmail) {
        editSupplierEmail.addEventListener("input", () => {
          errEditSupplierEmail.innerText = "";
          errEditSupplierEmail.style.display = "none";
        });
      }
      if (editSupplierAddress && errEditSupplierAddress) {
        editSupplierAddress.addEventListener("input", () => {
          errEditSupplierAddress.innerText = "";
          errEditSupplierAddress.style.display = "none";
        });
      }

      // Initial validation
      validateUpdateSupplier();
    
      // Update Supplier (updates datasets only; name stays same)
      if (updateSupplierBtn && supplierMainSelect && supplierEditSelect) {
        updateSupplierBtn.addEventListener("click", () => {
          const key = supplierEditSelect.value;
          if (!key) {
            if (updateSupplierError) {
              updateSupplierError.innerText = "Select a supplier first";
              updateSupplierError.style.display = "block";
            }
            return;
          }

          // Clear all errors
          if (updateSupplierError) {
            updateSupplierError.innerText = "";
            updateSupplierError.style.display = "none";
          }
          if (errEditSupplierContact) {
            errEditSupplierContact.innerText = "";
            errEditSupplierContact.style.display = "none";
          }
          if (errEditSupplierPhone) {
            errEditSupplierPhone.innerText = "";
            errEditSupplierPhone.style.display = "none";
          }
          if (errEditSupplierEmail) {
            errEditSupplierEmail.innerText = "";
            errEditSupplierEmail.style.display = "none";
          }
          if (errEditSupplierAddress) {
            errEditSupplierAddress.innerText = "";
            errEditSupplierAddress.style.display = "none";
          }
    
          const contact = (editSupplierContact?.value || "").trim();
          const phone   = (editSupplierPhone?.value || "").trim();
          const email   = (editSupplierEmail?.value || "").trim();
          const address = (editSupplierAddress?.value || "").trim();

          let valid = true;

          // Contact Person – required, same rules as Create Supplier
          if (!contact) {
            valid = false;
            if (errEditSupplierContact) {
              errEditSupplierContact.innerText = "Contact Person Name should contain atleast 3 characters.";
              errEditSupplierContact.style.display = "block";
            }
          } else if (!PERSON_NAME_REGEX.test(contact)) {
            valid = false;
            if (errEditSupplierContact) {
              errEditSupplierContact.innerText = "Contact Person Name should contain atleast 3 characters.";
              errEditSupplierContact.style.display = "block";
            }
          }

          // Phone – required
          if (!phone) {
            valid = false;
            if (errEditSupplierPhone) {
              errEditSupplierPhone.innerText = "Phone number is required";
              errEditSupplierPhone.style.display = "block";
            }
          } else if (!SUPPLIER_PHONE_REGEX.test(phone)) {
            valid = false;
            if (errEditSupplierPhone) {
              errEditSupplierPhone.innerText = "Enter a valid Indian phone (e.g. 9876543210 or +91 9876543210)";
              errEditSupplierPhone.style.display = "block";
            }
          }

          // Email – required
          if (!email) {
            valid = false;
            if (errEditSupplierEmail) {
              errEditSupplierEmail.innerText = "Email is required";
              errEditSupplierEmail.style.display = "block";
            }
          } else if (!SUPPLIER_EMAIL_REGEX.test(email)) {
            valid = false;
            if (errEditSupplierEmail) {
              errEditSupplierEmail.innerText = "Use a valid email (gmail, outlook, yahoo, stackly, ...)";
              errEditSupplierEmail.style.display = "block";
            }
          }

          // Address – required
          if (!address) {
            valid = false;
            if (errEditSupplierAddress) {
              errEditSupplierAddress.innerText = "Address is required";
              errEditSupplierAddress.style.display = "block";
            }
          } else if (address.length < 5 || address.length > 120) {
            valid = false;
            if (errEditSupplierAddress) {
              errEditSupplierAddress.innerText = "Address must be 5–120 characters";
              errEditSupplierAddress.style.display = "block";
            }
          }

          if (!valid) return;
    
          // update main dropdown datasets
          Array.from(supplierMainSelect.options).forEach(opt => {
            if (opt.value === key) {
              opt.dataset.contact = contact;
              opt.dataset.phone   = phone;
              opt.dataset.email   = email;
              opt.dataset.address = address;
            }
          });
    
          // update edit dropdown datasets
          Array.from(supplierEditSelect.options).forEach(opt => {
            if (opt.value === key) {
              opt.dataset.contact = contact;
              opt.dataset.phone   = phone;
              opt.dataset.email   = email;
              opt.dataset.address = address;
            }
          });
    
          hideModal(supplierModal);

          // Show success toast immediately
          setTimeout(() => {
            showSuccessNotification("Supplier values updated successfully.");
          }, 150);
        });
      }
    
      // Remove Supplier
      // Remove Supplier - Show Delete Confirmation Modal
      if (removeSupplierBtn && supplierMainSelect && supplierEditSelect) {
        removeSupplierBtn.addEventListener("click", () => {
          const val = supplierEditSelect.value;
          if (!val) return;
    
          pendingDeleteSupplierValue = val;
          
          // Hide Supplier modal and show Delete Supplier modal
          if (supplierModal) {
            hideModal(supplierModal);
          }
          
          // Show delete confirmation modal
          if (deleteSupplierText) {
            deleteSupplierText.textContent = `Are you sure want to delete "${val}"?`;
          }
          if (deleteSupplierModal) {
            showModal(deleteSupplierModal);
          }
        });
      }

      // Cancel Delete Supplier
      if (cancelSupplierDeleteBtn) {
        cancelSupplierDeleteBtn.addEventListener("click", () => {
          hideModal(deleteSupplierModal);
          pendingDeleteSupplierValue = null;
          
          // Show Supplier modal again (in edit mode)
          if (supplierModal) {
            openSupplierModal("edit");
          }
        });
      }

      // Confirm Delete Supplier
      if (confirmSupplierDeleteBtn && supplierMainSelect && supplierEditSelect) {
        confirmSupplierDeleteBtn.addEventListener("click", () => {
          if (!pendingDeleteSupplierValue) return;

          const val = pendingDeleteSupplierValue;

          // Remove from dropdowns
          Array.from(supplierMainSelect.options).forEach(opt => {
            if (opt.value === val) opt.remove();
          });
    
          Array.from(supplierEditSelect.options).forEach(opt => {
            if (opt.value === val) opt.remove();
          });
    
          supplierEditSelect.value = "";
          if (editSupplierContact) editSupplierContact.value = "";
          if (editSupplierPhone)   editSupplierPhone.value   = "";
          if (editSupplierEmail)   editSupplierEmail.value   = "";
          if (editSupplierAddress) editSupplierAddress.value = "";
          
          // Close Delete Supplier modal (Supplier modal stays closed)
          hideModal(deleteSupplierModal);
          
          pendingDeleteSupplierValue = null;
        });
      }
    
      /* =========================================================
      FINAL FORM SUBMIT (VALIDATION + REALTIME + AJAX)
      ========================================================= */
      if (form) { 
    
        //  ALL required fields list (used for realtime + submit)
        const requiredFields = [
          { selector: "input[name='product_name']",    msg: "Product name is required" },
          { selector: "select[name='product_type']",   msg: "Product type is required" },
          { selector: "input[name='description']",    msg: "Description is required" },
          { selector: "select[name='category']",      msg: "Category is required" },
          { selector: "input[name='sub_category']",   msg: "Sub category is required" },
    
          { selector: "input[name='unit_price']",     msg: "Unit price is required" },
          { selector: "input[name='discount']",       msg: "Discount is required" },
          { selector: "select[name='tax_code']",      msg: "Tax code is required" },
    
          { selector: "input[name='quantity']",       msg: "Quantity is required" },
          { selector: "select[name='uom']",           msg: "UOM is required" },
    
          { selector: "input[name='stock_level']",    msg: "Stock level is required" },
          { selector: "input[name='reorder_level']",  msg: "Reorder level is required" },
          { selector: "select[name='warehouse']",     msg: "Warehouse is required" },
    
          { selector: "select[name='size']",          msg: "Size is required" },
          { selector: "select[name='color']",         msg: "Color is required" },
          { selector: "input[name='weight']",         msg: "Weight is required" },
    
          { selector: "[name='specifications']",      msg: "Specifications are required" },
          { selector: "select[name='supplier']",      msg: "Supplier is required" },
          { selector: "select[name='status']",        msg: "Status is required" },
          { selector: "select[name='product_usage']", msg: "Product usage is required" }
        ];
    
        //  Common helpers
        function showFieldError(el, message) {
          if (!el) return;
    
          const wrapper = el.closest(".field, .upload-box");
          const errorEl = wrapper ? wrapper.querySelector(".error-msg") : null;
    
          if (errorEl) {
            errorEl.innerText = message;
            errorEl.style.display = "block";
          }
          el.classList.add("input-error");
        }
    
        function clearFieldError(el) {
          if (!el) return;
    
          const wrapper = el.closest(".field, .upload-box");
          const errorEl = wrapper ? wrapper.querySelector(".error-msg") : null;
    
          if (errorEl) {
            errorEl.innerText = "";
            errorEl.style.display = "none";
          }
          el.classList.remove("input-error");
        }
    
        // Realtime “required” on blur / change
        function attachRealtimeRequired(selector, message) {
          const el = form.querySelector(selector);
          if (!el) return;
    
          const eventName = el.tagName === "SELECT" ? "change" : "blur";
    
          el.addEventListener(eventName, () => {
            const value = (el.value || "").toString().trim();
            if (!value) {
              showFieldError(el, message);
            } else {
              clearFieldError(el);
            }
          });
        }
    
        requiredFields.forEach(cfg => {
          attachRealtimeRequired(cfg.selector, cfg.msg);
        });
    
        // Realtime numeric range validation (only for pure number fields)
        function attachNumberRangeValidation(selector, min, max, message) {
          const el = form.querySelector(selector);
          if (!el) return;
    
          el.addEventListener("input", () => {
            const raw = el.value.trim();
    
            if (!raw) {
              // empty will be handled by "required" validator
              clearFieldError(el);
              return;
            }
    
            const num = parseFloat(raw);
            if (isNaN(num) || num < min || num > max) {
              showFieldError(el, message);
            } else {
              clearFieldError(el);
            }
          });
        }
    
        attachNumberRangeValidation(
          "input[name='unit_price']",
          0.01,
          99999999,
          "Unit price must be between 0 and 99,999,999"
        );
        attachNumberRangeValidation(
          "input[name='discount']",
          0,
          100,
          "Discount must be between 0 and 100%"
        );
        attachNumberRangeValidation(
          "input[name='stock_level']",
          0,
          999999,
          "Stock level must be between 0 and 999,999"
        );
        attachNumberRangeValidation(
          "input[name='reorder_level']",
          0,
          999999,
          "Reorder level must be between 0 and 999,999"
        );
       
    
        // SPECIAL: Product Name regex validation (letters + spaces only)
        const productNameInput = form.querySelector("input[name='product_name']");
        const productNameError = document.getElementById("productNameError");
    
        function validateProductName() {
          if (!productNameInput) return true;
    
          const value = (productNameInput.value || "").trim();
    
          // clear old
          if (productNameError) {
            productNameError.textContent = "";
            productNameError.style.display = "none";
          }
          productNameInput.classList.remove("input-error");
    
          if (!value) {
            if (productNameError) {
              productNameError.textContent = "Product name is required";
              productNameError.style.display = "block";
            }
            productNameInput.classList.add("input-error");
            return false;
          }
    
          if (!PRODUCT_NAME_REGEX.test(value)) {
            if (productNameError) {
              productNameError.textContent =
                "Only letters and spaces allowed (3–30 characters)";
              productNameError.style.display = "block";
            }
            productNameInput.classList.add("input-error");
            return false;
          }
    
          return true;
        }
    
        if (productNameInput) {
          // When cursor leaves the field → immediate validation
          productNameInput.addEventListener("blur", validateProductName);
    
          // While typing, if error already showing, re-check
          productNameInput.addEventListener("input", () => {
            if (productNameError && productNameError.style.display === "block") {
              validateProductName();
            }
          });
        }
    
        // Realtime WEIGHT pattern check (since it’s like "1kg")
        const weightInput = form.querySelector("input[name='weight']");
        if (weightInput) {
          weightInput.addEventListener("blur", () => {
            const v = (weightInput.value || "").trim();
            if (!v) {
              showFieldError(weightInput, "Weight is required");
              return;
            }
            if (!WEIGHT_REGEX.test(v)) {
              showFieldError(
                weightInput,
                "Enter a valid weight, e.g. 1kg, 0.5kg, 500g, 250 ml"
              );
            } else {
              clearFieldError(weightInput);
            }
          });
        }
    
        // 7) SUBMIT HANDLER
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          let isValid = true;
    
          // clear all old errors
          document.querySelectorAll(".error-msg").forEach(el => {
            el.innerText = "";
            el.style.display = "none";
          });
          form.querySelectorAll(".input-error").forEach(el => {
            el.classList.remove("input-error");
          });
    
          // required checks
          requiredFields.forEach(cfg => {
            const el = form.querySelector(cfg.selector);
            if (!el) return;
            const value = (el.value || "").toString().trim();
            if (!value) {
              isValid = false;
              showFieldError(el, cfg.msg);
            }
          });
    
          // product name regex
          if (!validateProductName()) {
            isValid = false;
          }
    
          // image required
          const imageError = document.querySelector(".upload-box .error-msg");
          if (imageInput && !imageInput.files.length) {
            isValid = false;
            if (imageError) {
              imageError.innerText = "Product image is required";
              imageError.style.display = "block";
            }
          }
    
          // Sub Category length
          const subCategoryEl = form.querySelector("input[name='sub_category']");
          if (subCategoryEl) {
            const v = (subCategoryEl.value || "").trim();
            if (v.length > 50) {
              isValid = false;
              showFieldError(subCategoryEl, "Maximum 50 characters allowed");
            }
          }
    
          // Unit Price
          const unitPriceEl = form.querySelector("input[name='unit_price']");
          if (unitPriceEl) {
            const price = parseFloat(unitPriceEl.value);
            if (isNaN(price) || price <= 0 || price > 99999999) {
              isValid = false;
              showFieldError(
                unitPriceEl,
                "Unit price must be between 0 and 99,999,999"
              );
            }
          }
    
          // Discount 0–100
          const discountEl = form.querySelector("input[name='discount']");
          if (discountEl) {
            const disc = parseFloat(discountEl.value);
            if (isNaN(disc) || disc < 0 || disc > 100) {
              isValid = false;
              showFieldError(
                discountEl,
                "Discount must be between 0 and 100%"
              );
            }
          }
    
          // Tax percentage from selected Tax Code (0–100)
          if (taxCodeSelect) {
            const taxText = taxCodeSelect.value || "";
            const percentStr = extractPercent(taxText);
            const percentNum = percentStr ? parseFloat(percentStr) : NaN;
    
            if (isNaN(percentNum) || percentNum < 0 || percentNum > 100) {
              isValid = false;
              showFieldError(
                taxCodeSelect,
                "Tax percentage must be between 0 and 100"
              );
            }
          }
    
          // Stock Level (0–999999)
          const stockLevelEl = form.querySelector("input[name='stock_level']");
          if (stockLevelEl) {
            const stock = parseInt(stockLevelEl.value, 10);
            if (isNaN(stock) || stock < 0 || stock > 999999) {
              isValid = false;
              showFieldError(
                stockLevelEl,
                "Stock level must be a number between 0 and 999,999"
              );
            }
          }
    
          // Reorder Level (0–999999, < stock)
          const reorderLevelEl = form.querySelector("input[name='reorder_level']");
          if (reorderLevelEl) {
            const reorder = parseInt(reorderLevelEl.value, 10);
            const stock = stockLevelEl ? parseInt(stockLevelEl.value, 10) : NaN;
    
            if (isNaN(reorder) || reorder < 0 || reorder > 999999) {
              isValid = false;
              showFieldError(
                reorderLevelEl,
                "Reorder level must be a number between 0 and 999,999"
              );
            } else if (!isNaN(stock) && reorder >= stock) {
              isValid = false;
              showFieldError(
                reorderLevelEl,
                "Reorder level should be less than current stock level"
              );
            }
          }
    
          // Weight pattern
          if (weightInput) {
            const weightVal = (weightInput.value || "").trim();
            if (!WEIGHT_REGEX.test(weightVal)) {
              isValid = false;
              showFieldError(
                weightInput,
                "Enter a valid weight, e.g. 1kg, 0.5kg, 500g, 250 ml"
              );
            }
          }
    
          // Specifications text (5–500 chars)
          const specsEl = form.querySelector("[name='specifications']");
          if (specsEl) {
            const text = (specsEl.value || "").trim();
    
            if (!text) {
              isValid = false;
              showFieldError(
                specsEl,
                "Specifications are required"
              );
            } else if (text.length < 5) {
              isValid = false;
              showFieldError(
                specsEl,
                "Write at least 5 characters"
              );
            } else if (text.length > 500) {
              isValid = false;
              showFieldError(
                specsEl,
                "Maximum 500 characters allowed"
              );
            }
          }
    
          // Related Products text (optional, but with pattern)
          const relatedEl = form.querySelector("input[name='related_products']");
          if (relatedEl) {
            const val = (relatedEl.value || "").trim();
            if (val && (val.length < 3 || val.length > 80)) {
              isValid = false;
              showFieldError(
                relatedEl,
                "Related product must be 3–80 characters"
              );
            }
            const invalidChars = /[^A-Za-z0-9\s.,&\-()/]/;
            if (val && invalidChars.test(val)) {
              isValid = false;
              showFieldError(
                relatedEl,
                "Use only letters, numbers and basic punctuation"
              );
            }
          }
    
          if (!isValid) return;
    
          // ✅ all good → AJAX submit
          const formData = new FormData(form);
    
          fetch("/save-product", {
            method: "POST",
            body: formData
          })
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                showSuccessModal(
                  `✅ Product saved successfully (ID: ${data.product_id})`,
                  "/products"
                );
    
                if (data.product_id && productIdInput) {
                  productIdInput.value = data.product_id;
                }
    
                form.reset();
                if (categorySelect) categorySelect.disabled = true;
              } else {
                showSuccessModal("❌ Failed to save product");
              }
            })
            .catch(() => {
              showSuccessModal("Server error while saving product");
            });
        });
      }
    });


    