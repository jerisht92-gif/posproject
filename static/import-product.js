document.addEventListener("DOMContentLoaded", () => {

  // ==============================
  // FETCH/XHR MARKER FOR IMPORT PAGE (shows as 'import-product')
  // ==============================
  fetch("/api/import-product", { credentials: "same-origin" })
    .then((res) => res.json())
    .then((data) => {
      // Page already has all UI; this call is mainly for Network tab visibility
      // Optional: could use `data.allowed_extensions` or `data.template_url` in future.
      if (!data || !data.success) {
        console.warn("import-product metadata not available");
      }
    })
    .catch(() => {
      // Silent failure – no impact on UI
    });

  // ==============================
  // ELEMENTS
  // ==============================
  const closeBtn = document.querySelector(".close-btn");
  const cancelBtn = document.querySelector(".cancel-btn");
  const resetBtn = document.querySelector(".reset-btn");

  const uploadBox = document.getElementById("uploadBox");
  const fileInput = document.getElementById("fileInput");

  const validCount = document.getElementById("validCount");
  const invalidCount = document.getElementById("invalidCount");
  const skippedCount = document.getElementById("skippedCount");

  const errorList = document.getElementById("errorList");
  const skippedList = document.getElementById("skippedList");
  const warningText = document.querySelector(".warning");
  const importBtn = document.getElementById("importBtn");
  const submitBtn = document.getElementById("submitImport");
  const importValidOnlyCheckbox = document.getElementById("importValidOnly");
  const importValidHint = document.getElementById("importValidHint");

  let lastValidationResult = null;

  // ==============================
  // SAFETY CHECK
  // ==============================
  if (!uploadBox || !fileInput || !submitBtn) {
    console.error("Required elements missing in HTML");
    return;
  }

  // Initialize submit button as disabled
  if (submitBtn) {
    submitBtn.disabled = true;
  }

  // ==============================
  // PRODUCT MASTER → IMPORT
  // ==============================
  if (importBtn) {
    importBtn.addEventListener("click", () => {
      window.location.href = "/import";
    });
  }

  // ==============================
  // CLOSE / CANCEL
  // ==============================
  function goBack() {
    window.location.href = "/products";
  }

  if (closeBtn) closeBtn.addEventListener("click", goBack);
  if (cancelBtn) cancelBtn.addEventListener("click", goBack);

  // ==============================
  // RESET
  // ==============================
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      fileInput.value = "";
      validCount.textContent = "0";
      invalidCount.textContent = "0";
      skippedCount.textContent = "0";
      errorList.innerHTML = "";
      if (skippedList) skippedList.innerHTML = "";
      warningText.textContent = "⚠ No file uploaded yet";
      uploadBox.classList.remove("file-added");
      lastValidationResult = null;
      // Disable submit button when reset
      if (submitBtn) {
        submitBtn.disabled = true;
      }
    });
  }

  // ==============================
  // CLICK TO UPLOAD
  // ==============================
  uploadBox.addEventListener("click", () => {
    fileInput.click();
  });

  // ==============================
  // DRAG & DROP
  // ==============================
  uploadBox.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadBox.classList.add("drag");
  });

  uploadBox.addEventListener("dragleave", () => {
    uploadBox.classList.remove("drag");
  });

  uploadBox.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadBox.classList.remove("drag");

    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      handleFile(e.dataTransfer.files[0]);
    }
  });

  // ==============================
  // FILE SELECT
  // ==============================
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) {
      handleFile(fileInput.files[0]);
    }
  });

  // ==============================
  // FILE VALIDATION
  // ==============================
  function handleFile(file) {
    const allowed = ["csv", "xlsx"];
    const ext = file.name.split(".").pop().toLowerCase();

    if (!allowed.includes(ext)) {
      warningText.textContent = "❌ Invalid file format (CSV / XLSX only)";
      uploadBox.classList.remove("file-added");
      fileInput.value = "";
      // Disable submit button for invalid file
      if (submitBtn) {
        submitBtn.disabled = true;
      }
      return;
    }

    uploadBox.classList.add("file-added");
    warningText.textContent = `⏳ Validating file: ${file.name} ...`;

    validCount.textContent = "0";
    invalidCount.textContent = "0";
    skippedCount.textContent = "0";
    errorList.innerHTML = "";
    if (skippedList) skippedList.innerHTML = "";

    const formData = new FormData();
    formData.append("file", file);

    fetch("/upload", {
      method: "POST",
      body: formData
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg =
            (data && data.message) ||
            (data && data.error) ||
            "Validation failed. Please try again.";
          
          // Check if error is "No data found" and show toast
          if (msg && (msg.includes("No data found") || msg.toLowerCase().includes("no data"))) {
            showToast("No data found", "error");
          }
          
          throw new Error(msg);
        }

        return data;
      })
      .then(data => {
        lastValidationResult = data || {};

        const total = data.total_rows || 0;
        const valid = data.valid_rows || 0;
        const invalid = data.invalid_rows || 0;
        const skipped = data.skipped_rows || 0;

        validCount.textContent = valid;
        invalidCount.textContent = invalid;
        skippedCount.textContent = skipped;

        errorList.innerHTML = "";
        if (data.error_details && data.error_details.length) {
          warningText.textContent = "⚠ Upload completed with errors";
          data.error_details.forEach(item => {
            const li = document.createElement("li");
            li.textContent = `Row ${item.row}: ${item.errors.join(", ")}`;
            errorList.appendChild(li);
          });
        } else {
          warningText.textContent = "✅ All rows are valid";
        }

        // Display skipped rows
        skippedList.innerHTML = "";
        if (data.skipped_row_numbers && data.skipped_row_numbers.length > 0) {
          data.skipped_row_numbers.forEach(rowNum => {
            const li = document.createElement("li");
            li.textContent = `Row ${rowNum}: All columns are blank`;
            skippedList.appendChild(li);
          });
        }

        // Enable submit button after successful validation
        if (submitBtn) {
          submitBtn.disabled = false;
        }
      })
      .catch((err) => {
        console.error(err);

        // ✅ Show error message (only if not already handled above)
        if (err.message && !err.message.includes("No data found")) {
          warningText.textContent = `❌ ${err.message}`;
        }

        // Disable submit button on validation error
        if (submitBtn) {
          submitBtn.disabled = true;
        }
      });
  }

  // Hide hint when user manually ticks the checkbox
  if (importValidOnlyCheckbox) {
    importValidOnlyCheckbox.addEventListener("change", () => {
      if (importValidHint) {
        importValidHint.style.display = "none";
      }
    });
  }

  // ==============================
  // DOWNLOAD TEMPLATE
  // ==============================
  window.downloadTemplate = function () {
    window.location.href = "/download-template";
  };

  // ==============================
  // TOAST
  // ==============================
  function showToast(message, type = "success") {
    const toastBox = document.getElementById("toastBox");
    if (!toastBox) return;

    const toast = document.createElement("div");
    toast.className = "toast";

    // For success: show both red checkmark and green tick icon
    // For error: show X mark (same as "Errors Detected:" section)
    if (type === "success") {
      toast.innerHTML = `
        <span class="toast-icon">✓</span>
        <span class="toast-green-tick">✓</span>
        <span>${message}</span>
      `;
    } else {
      toast.innerHTML = `
        <span class="toast-icon error-icon">❌</span>
        <span>${message}</span>
      `;
    }

    toastBox.appendChild(toast);

    // ✅ hide after 3 sec
    setTimeout(() => {
      toast.classList.add("hide");
    }, 3000);

    // ✅ remove after hide animation (extra 400ms)
    setTimeout(() => {
      toast.remove();
    }, 3400);
  }

  // ==============================
  // SUBMIT → IMPORT VALIDATED ROWS
  // ==============================
  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      try {
        if (!fileInput.files.length) {
          showToast("Please select and validate a file first.", "error");
          return;
        }

        if (!lastValidationResult) {
          showToast("Please wait until validation is complete.", "error");
          return;
        }

        const valid = lastValidationResult.valid_rows || 0;
        if (!valid) {
          showToast("There are no valid rows to import.", "error");
          return;
        }
        
        // Require manual confirmation via checkbox
        if (!importValidOnlyCheckbox || !importValidOnlyCheckbox.checked) {
          if (importValidHint) {
            importValidHint.style.display = "inline";
          }
          return;
        }

        const formData = new FormData();
        formData.append("file", fileInput.files[0]);

        const res = await fetch("/import-products-validated", {
          method: "POST",
          body: formData
        });

        const data = await res.json();

        if (data && data.success === true) {
          const added = Number(data.added || 0);

          if (added > 0) {
            showToast(`Imported ${added} product(s) successfully!`);

            setTimeout(() => {
              window.location.href = "/products";
            }, 3000); // ✅ wait 3 sec

            return;
          }

          // ✅ Nothing added
          showToast("Import completed, but no products were added.", "error");
          return;
        }

        showToast((data && data.message) ? data.message : "Import failed. Please try again.", "error");
      } catch (err) {
        console.error("Import Error:", err);
        showToast("Import failed. Please try again.", "error");
      }
    });
  }

});