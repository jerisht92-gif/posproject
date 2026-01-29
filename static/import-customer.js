document.addEventListener("DOMContentLoaded", () => {
  // ==============================
  // ELEMENTS
  // ==============================
  const closeBtn = document.getElementById("closeBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const resetBtn = document.getElementById("resetBtn");

  const uploadBox = document.getElementById("uploadBox");
  const fileInput = document.getElementById("fileInput");

  const validCount = document.getElementById("validCount");
  const invalidCount = document.getElementById("invalidCount");
  const skippedCount = document.getElementById("skippedCount");

  const errorList = document.getElementById("errorList");
  const skippedList = document.getElementById("skippedList");
  const warningText = document.getElementById("noFileMsg");

  // ✅ Titles (you added id in HTML)
  const errorsTitle = document.getElementById("errorsTitle");
  const skippedTitle = document.getElementById("skippedTitle");

  const submitBtn = document.getElementById("submitImport");
  const importValidOnlyCheckbox = document.getElementById("importValidOnly");
  const importValidHint = document.getElementById("importValidHint");

  // ✅ keep selected file
  let selectedFile = null;
  let lastValidationResult = null;

  // ==============================
  // SAFETY CHECK
  // ==============================
  if (!uploadBox || !fileInput || !submitBtn) {
    console.error("❌ Required elements missing in HTML");
    return;
  }

  
//  Submit disabled before upload
submitBtn.disabled = true;

  // ==============================
  // CLOSE / CANCEL
  // ==============================
  function goBack() {
    window.location.href = "/customer";
  }

  if (closeBtn) closeBtn.addEventListener("click", goBack);
  if (cancelBtn) cancelBtn.addEventListener("click", goBack);

  // ==============================
  // RESET
  // ==============================
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      fileInput.value = "";
      selectedFile = null;
      lastValidationResult = null;

      // ✅ disable submit 
      submitBtn.disabled = true;

      validCount.textContent = "0";
      invalidCount.textContent = "0";
      skippedCount.textContent = "0";

      errorList.innerHTML = "";
      if (skippedList) skippedList.innerHTML = "";

      // ✅ Clear error and skipped lists on reset (titles remain visible)
      // Titles are always visible, only lists are cleared

      // ✅ Show "No file uploaded yet" message
      warningText.innerHTML = `<span class="msg-icon warn">⚠</span><span>No file uploaded yet</span>`;
      warningText.style.display = "flex";
      uploadBox.classList.remove("file-added");

      if (importValidOnlyCheckbox) importValidOnlyCheckbox.checked = false;
      if (importValidHint) importValidHint.style.display = "none";
    });
  }

  // ==============================
  // CLICK TO UPLOAD
  // ==============================
  uploadBox.addEventListener("click", () => fileInput.click());

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
  // FILE VALIDATION (SERVER)
  // ==============================
  function handleFile(file) {
    const allowed = ["csv", "xlsx"];
    const ext = file.name.split(".").pop().toLowerCase();

    if (!allowed.includes(ext)) {
      warningText.innerHTML =
        `<span class="msg-icon error">❌</span><span>Invalid file format (CSV / XLSX only)</span>`;
      uploadBox.classList.remove("file-added");
      fileInput.value = "";
      selectedFile = null;
      lastValidationResult = null;

      // ✅ disable submit for invalid file
      submitBtn.disabled = true;

      // ✅ Clear error and skipped lists if invalid format (titles remain visible)
      errorList.innerHTML = "";
      if (skippedList) skippedList.innerHTML = "";

      // ✅ Show error toast for invalid format
      if (typeof showToast === "function") {
        showToast("Invalid file format. Please upload a CSV or XLSX file.", "error");
      }

      return;
    }

    // ✅ store selected file
    selectedFile = file;

    uploadBox.classList.add("file-added");
    warningText.innerHTML =
      `<span class="msg-icon warn">⏳</span><span>Validating file: ${file.name} ...</span>`;
    warningText.style.display = "flex";

    validCount.textContent = "0";
    invalidCount.textContent = "0";
    skippedCount.textContent = "0";

    errorList.innerHTML = "";
    if (skippedList) skippedList.innerHTML = "";

    // ✅ Clear error and skipped lists while validating (titles remain visible)

    lastValidationResult = null;

    const formData = new FormData();
    formData.append("file", file);

fetch("/upload-customer", {
  method: "POST",
  body: formData
})
  .then(async (res) => {
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        (data && Array.isArray(data.error_details) && data.error_details[0]) ||
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
  .then((data) => {
    lastValidationResult = data || {};

    const valid = data.valid_rows || 0;
    const invalid = data.invalid_rows || 0;
    const skipped = data.skipped_rows || 0;

    validCount.textContent = valid;
    invalidCount.textContent = invalid;
    skippedCount.textContent = skipped;

    // ✅ Enable submit only when valid rows exist
    submitBtn.disabled = (valid === 0);

    // ✅ Hide "No file uploaded yet" when file is uploaded and validated
    if (warningText) {
      warningText.style.display = "none";
    }

    // ✅ A) Errors title show/hide + Correct summary message (same format as product import)
    errorList.innerHTML = "";

    // ✅ A) Populate error list (title always visible, like product import)
    const hasErrors = Array.isArray(data.error_details) && data.error_details.length > 0;

    if (hasErrors) {
      data.error_details.forEach((item) => {
        const li = document.createElement("li");
        // Handle both old format (string) and new format (object with row and errors)
        if (typeof item === "string") {
          li.textContent = item;
        } else if (item && typeof item === "object" && item.row && Array.isArray(item.errors)) {
          // New format: { row: number, errors: string[] }
          li.textContent = `Row ${item.row}: ${item.errors.join(", ")}`;
        } else {
          li.textContent = String(item);
        }
        errorList.appendChild(li);
      });

      if (skipped > 0) {
        warningText.innerHTML =
          `<span class="msg-icon warn">⚠</span><span>Upload completed with errors. ${valid} valid, ${invalid} invalid, ${skipped} skipped.</span>`;
        warningText.style.display = "flex";
      } else {
        warningText.innerHTML =
          `<span class="msg-icon warn">⚠</span><span>Upload completed with errors. ${valid} valid, ${invalid} invalid.</span>`;
        warningText.style.display = "flex";
      }
    } else {
      // No errors - list remains empty but title is still visible
      if (skipped > 0) {
        warningText.innerHTML =
          `<span class="msg-icon warn">⚠</span><span>${valid} rows valid, ${skipped} row${skipped > 1 ? "s" : ""} skipped.</span>`;
        warningText.style.display = "flex";
      } else {
        warningText.innerHTML =
          `<span class="msg-icon success">✅</span><span>All rows are valid</span>`;
        warningText.style.display = "flex";
      }
    }

    // ✅ B) Populate skipped rows list (title always visible, like product import)
    if (skippedList) {
      skippedList.innerHTML = "";

      if (data.skipped_row_numbers && data.skipped_row_numbers.length > 0) {
        data.skipped_row_numbers.forEach((rowNum) => {
          const li = document.createElement("li");
          li.textContent = `Row ${rowNum}: All columns are blank`;
          skippedList.appendChild(li);
        });
      }
      // If no skipped rows, list remains empty but title is still visible
    }
  })
  .catch((err) => {
    console.error(err);

    // ✅ Hide "No file uploaded yet" and show error
    if (warningText) {
      warningText.innerHTML =
        `<span class="msg-icon error">❌</span><span>${err.message}</span>`;
      warningText.style.display = "flex";
    }

    lastValidationResult = null;
    submitBtn.disabled = true;

    // ✅ Hide error and skipped sections on error
    if (errorsTitle) errorsTitle.style.display = "none";
    if (skippedTitle) skippedTitle.style.display = "none";
  });

  }

  // Hide hint when user ticks checkbox
  if (importValidOnlyCheckbox) {
    importValidOnlyCheckbox.addEventListener("change", () => {
      if (importValidHint) importValidHint.style.display = "none";
    });
  }

  // ==============================
  // DOWNLOAD TEMPLATE
  // ==============================
  window.downloadCustomerTemplate = function () {
    window.location.href = "/download-customer-template";
  };


// ============================== // TOAST // ==============================
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
      if (!selectedFile) {
        showToast("Please choose a file first.", "error");
        return;
      }

      if (!lastValidationResult) {
        showToast("Please wait until validation is completed.", "error");
        return;
      }

      const valid = lastValidationResult.valid_rows || 0;
      if (!valid) {
        showToast("There are no valid rows to import.", "error");
        return;
      }

      // Require checkbox
      if (!importValidOnlyCheckbox || !importValidOnlyCheckbox.checked) {
        if (importValidHint) importValidHint.style.display = "inline";
        return;
      }

      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/import-customers-validated", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (data && data.success === true) {
        const added = Number(data.added || 0);
        const updated = Number(data.updated || 0);
        const skipped = Number(data.skipped || 0);
        const details = Array.isArray(data.updated_details) ? data.updated_details : [];

        // ✅ 1) Imported + Updated
        if (added > 0 && updated > 0) {
          showToast(`Imported ${added} and Updated ${updated} customers successfully!`);

          setTimeout(() => {
            window.location.href = "/customer";
          }, 3000); // ✅ wait 3 sec

          return;
        }

        // ✅ 2) Imported only
        if (added > 0) {
          showToast(`Imported ${added} customers successfully!`);

          setTimeout(() => {
            window.location.href = "/customer";
          }, 3000); // ✅ wait 3 sec

          return;
        }

        // ✅ 3) Updated only (show which IDs + fields)
        if (updated > 0) {
          if (details.length > 0) {
            // show first 3 only (toast must be short)
            const lines = details.slice(0, 3).map(d => {
              const cid = d.customer_id || "";
              const fields = Array.isArray(d.fields) ? d.fields.join(", ") : "";
              return `ID ${cid}: ${fields} updated`;
            });

            if (details.length > 3) {
              lines.push(`...and ${details.length - 3} more`);
            }

            showToast(`Updated ${updated} customers<br>${lines.join("<br>")}`);
          } else {
            showToast(`Updated ${updated} customers successfully!`);
          }

          setTimeout(() => {
            window.location.href = "/customer";
          }, 3000); // ✅ wait 3 sec

          return;
        }

        // ✅ 4) Nothing added/updated
        showToast("Import completed, but no rows were added/updated.", "error");
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