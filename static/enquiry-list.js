document.addEventListener("DOMContentLoaded", () => {
  // ==========================
  // ✅ Elements
  // ==========================
  const searchInput = document.getElementById("searchEnquiries");
  const tableBody = document.getElementById("enquiryTable");
  const showingCount = document.getElementById("showingCount");

  // Edit modal elements
  const editModal = document.getElementById("editEnquiryModal");
  const editId = document.getElementById("editEnquiryId");
  const editCode = document.getElementById("editEnquiryCode");
  const editFirstName = document.getElementById("editFirstName");
  const editLastName = document.getElementById("editLastName");
  const editPhoneNumber = document.getElementById("editPhoneNumber");
  const editEmail = document.getElementById("editEmail");

  const saveEditBtn = document.getElementById("saveEnquiryEditBtn");
  const closeEditBtn = document.getElementById("closeEnquiryEditBtn");

  // Delete modal elements
  const deleteModal = document.getElementById("deleteEnquiryModal");
  const deleteText = document.getElementById("deleteEnquiryText");
  const cancelDeleteBtn = document.getElementById("cancelEnquiryDeleteBtn");
  const confirmDeleteBtn = document.getElementById("confirmEnquiryDeleteBtn");

  // Error elements
  const errFirstName = document.getElementById("errFirstName");
  const errLastName = document.getElementById("errLastName");
  const errPhoneNumber = document.getElementById("errPhoneNumber");
  const errEmail = document.getElementById("errEmail");

  // ==========================
  // ✅ State
  // ==========================
  let activeModal = null;
  let lastFocusedEl = null;
  let deleteTargetId = null;

  // ==========================
  // ✅ Modal Functions
  // ==========================
  function getFocusable(modal) {
    if (!modal) return [];
    return [...modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )].filter(el => !el.disabled && el.offsetParent !== null);
  }

  function trapFocus(e) {
    if (!activeModal) return;
    if (e.key !== "Tab") return;

    const focusables = getFocusable(activeModal);
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openModal(modal) {
    if (!modal) return;

    lastFocusedEl = document.activeElement;

    if (activeModal && activeModal !== modal) closeModal(activeModal);

    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");

    activeModal = modal;

    const focusables = getFocusable(modal);
    if (focusables.length) focusables[0].focus();

    document.addEventListener("keydown", trapFocus);
  }

  function closeModal(modal) {
    if (!modal) return;

    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");

    if (activeModal === modal) {
      activeModal = null;
      document.removeEventListener("keydown", trapFocus);
    }

    if (lastFocusedEl) {
      lastFocusedEl.focus();
      lastFocusedEl = null;
    }
  }

  function clearErrors() {
    if (errFirstName) errFirstName.textContent = "";
    if (errLastName) errLastName.textContent = "";
    if (errPhoneNumber) errPhoneNumber.textContent = "";
    if (errEmail) errEmail.textContent = "";

    [editFirstName, editLastName, editPhoneNumber, editEmail].forEach(el => {
      if (el) el.classList.remove("input-error");
    });
  }

  // ==========================
  // ✅ Validation
  // ==========================
  function isValidName(v) {
    v = (v || "").trim();
    return v.length >= 3 && v.length <= 40 && /^[A-Za-z ]+$/.test(v);
  }

  function isValidEmail(v) {
    v = (v || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }

  function isValidPhone(v) {
    v = (v || "").trim();
    return /^\d{10}$/.test(v);
  }

  function validateEditFormSilent() {
    const firstName = (editFirstName?.value || "").trim();
    const lastName = (editLastName?.value || "").trim();
    const phone = (editPhoneNumber?.value || "").trim();
    const email = (editEmail?.value || "").trim();

    if (!isValidName(firstName)) return false;
    if (!isValidName(lastName)) return false;
    if (!isValidPhone(phone)) return false;
    if (!isValidEmail(email)) return false;

    return true;
  }

  function updateSaveButtonState() {
    if (!saveEditBtn) return;
    const ok = validateEditFormSilent();
    saveEditBtn.disabled = !ok;
  }

  // Live validation clearing
  function attachLiveClear(inputEl, errEl) {
    if (!inputEl || !errEl) return;
    inputEl.addEventListener("input", () => {
      if (errEl) errEl.textContent = "";
      inputEl.classList.remove("input-error");
      updateSaveButtonState();
    });
  }

  attachLiveClear(editFirstName, errFirstName);
  attachLiveClear(editLastName, errLastName);
  attachLiveClear(editPhoneNumber, errPhoneNumber);
  attachLiveClear(editEmail, errEmail);

  // Enable/disable Save button live
  [editFirstName, editLastName, editPhoneNumber, editEmail].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", updateSaveButtonState);
    el.addEventListener("blur", updateSaveButtonState);
    el.addEventListener("change", updateSaveButtonState);
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

  // ==========================
  // ✅ Show toast when redirected after create
  // ==========================
  try {
    const url = new URL(window.location.href);
    const created = url.searchParams.get("created");
    if (created === "success") {
      showSuccessNotification("Enquiry has been created successfully");
      // Clean the URL so the toast doesn't repeat on refresh
      url.searchParams.delete("created");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  } catch (e) {
    console.warn("URL parse failed for success toast:", e);
  }

  // ==========================
  // ✅ Search
  // ==========================
  if (searchInput && tableBody) {
    searchInput.addEventListener("keyup", () => {
      const filter = searchInput.value.toLowerCase();
      const rows = tableBody.querySelectorAll("tr");
      let visible = 0;

      rows.forEach((row) => {
        if (row.classList.contains("no-data-row")) {
          return;
        }
        const show = row.textContent.toLowerCase().includes(filter);
        row.style.display = show ? "" : "none";
        if (show) visible++;
      });

      if (showingCount) showingCount.textContent = visible;
    });
  }

  // ==========================
  // ✅ Click: Edit
  // ==========================
  document.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".edit-btn");
    const delBtn = e.target.closest(".delete-btn");

    // ---- EDIT
    if (editBtn) {
      e.preventDefault();
      e.stopPropagation();
      
      clearErrors();
      const enquiryId = editBtn.dataset.id;

      if (!enquiryId) {
        console.error("No enquiry ID found on edit button");
        return;
      }

      console.log("🔄 Opening edit modal for enquiry:", enquiryId);

      try {
        const res = await fetch(`/api/enquiry/${encodeURIComponent(enquiryId)}`);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const response = await res.json();

        if (!response.success) {
          alert(response.message || "Unable to load enquiry");
          return;
        }

        const enquiry = response.data || {};
        console.log("✅ Enquiry data loaded:", enquiry);

        if (editId) editId.value = enquiry.enquiry_id || enquiryId;
        if (editCode) editCode.value = enquiry.enquiry_id || enquiryId || "";
        if (editFirstName) editFirstName.value = enquiry.first_name || "";
        if (editLastName) editLastName.value = enquiry.last_number || enquiry.last_name || "";
        if (editPhoneNumber) editPhoneNumber.value = enquiry.phone_number || enquiry.phone || "";
        if (editEmail) editEmail.value = enquiry.email || "";

        if (saveEditBtn) {
          saveEditBtn.disabled = true;
        }

        if (!editModal) {
          console.error("❌ Edit modal element not found");
          return;
        }

        openModal(editModal);
        console.log("✅ Modal opened");

        setTimeout(() => {
          updateSaveButtonState();
        }, 10);
      } catch (err) {
        console.error("❌ edit load error:", err);
        alert("Server error while loading enquiry");
      }
    }

    // ---- DELETE (open custom modal like product delete dialog)
    if (delBtn) {
      e.preventDefault();
      e.stopPropagation();

      const enquiryId = delBtn.dataset.id;
      if (!enquiryId) {
        console.error("No enquiry ID found on delete button");
        return;
      }

      deleteTargetId = enquiryId;

      if (deleteText) {
        deleteText.textContent = `Are you sure you want to delete "${enquiryId}"?`;
      }

      if (deleteModal) {
        openModal(deleteModal);
      }
    }
  });

  // ==========================
  // ✅ Confirm Delete
  // ==========================
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async () => {
      if (!deleteTargetId) return;

      try {
        const res = await fetch(`/delete-enquiry/${encodeURIComponent(deleteTargetId)}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" }
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          alert(data.message || "Delete failed");
          return;
        }

        showSuccessNotification("Enquiry deleted successfully");
        closeModal(deleteModal);

        setTimeout(() => {
          window.location.reload();
        }, 500);
      } catch (err) {
        alert("Network error. Try again.");
      }
    });
  }

  // ==========================
  // ✅ Cancel Delete
  // ==========================
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener("click", () => {
      deleteTargetId = null;
      closeModal(deleteModal);
    });
  }

  // ==========================
  // ✅ Save Edit
  // ==========================
  if (saveEditBtn) {
    saveEditBtn.addEventListener("click", async () => {
      clearErrors();

      const id = editId?.value;
      if (!id) return;

      const firstName = (editFirstName?.value || "").trim();
      const lastName = (editLastName?.value || "").trim();
      const phone = (editPhoneNumber?.value || "").trim();
      const email = (editEmail?.value || "").trim();

      // Validation
      let hasError = false;

      if (!isValidName(firstName)) {
        if (errFirstName) errFirstName.textContent = "First name must be 3-40 letters only";
        if (editFirstName) editFirstName.classList.add("input-error");
        hasError = true;
      }

      if (!isValidName(lastName)) {
        if (errLastName) errLastName.textContent = "Last name must be 3-40 letters only";
        if (editLastName) editLastName.classList.add("input-error");
        hasError = true;
      }

      if (!isValidPhone(phone)) {
        if (errPhoneNumber) errPhoneNumber.textContent = "Phone must be exactly 10 digits";
        if (editPhoneNumber) editPhoneNumber.classList.add("input-error");
        hasError = true;
      }

      if (!isValidEmail(email)) {
        if (errEmail) errEmail.textContent = "Enter a valid email address";
        if (editEmail) editEmail.classList.add("input-error");
        hasError = true;
      }

      if (hasError) {
        return;
      }

      saveEditBtn.disabled = true;

      try {
        const res = await fetch(`/update-enquiry/${encodeURIComponent(id)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: firstName,
            last_number: lastName,
            phone_number: phone,
            email: email
          })
        });

        const response = await res.json();

        if (!res.ok || !response.success) {
          alert(response.message || "Update failed");
          saveEditBtn.disabled = false;
          return;
        }

        showSuccessNotification("Enquiry updated successfully");
        closeModal(editModal);
        
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } catch (err) {
        console.error("❌ save error:", err);
        alert("Server error while updating enquiry");
        saveEditBtn.disabled = false;
      }
    });
  }

  // ==========================
  // ✅ Close Modal
  // ==========================
  if (closeEditBtn) {
    closeEditBtn.addEventListener("click", () => {
      closeModal(editModal);
    });
  }

  // Close on overlay click
  if (editModal) {
    editModal.addEventListener("click", (e) => {
      if (e.target === editModal) {
        closeModal(editModal);
      }
    });
  }

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && activeModal) {
      closeModal(activeModal);
    }
  });
});
