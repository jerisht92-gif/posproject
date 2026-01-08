document.addEventListener("DOMContentLoaded", () => {

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
      .then(res => {
        if (!res.ok) throw new Error("Server error");
        return res.json();
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
      })
      .catch(err => {
        console.error(err);
        warningText.textContent = "❌ Validation failed. Please try again.";
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
  // SUBMIT → IMPORT VALIDATED ROWS
  // ==============================
  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      if (!fileInput.files.length) {
        alert("Please select and validate a file first.");
        return;
      }

      if (!lastValidationResult) {
        alert("Please wait until validation is complete.");
        return;
      }

      const valid = lastValidationResult.valid_rows || 0;
      if (!valid) {
        alert("There are no valid rows to import.");
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

      fetch("/import-products-validated", {
        method: "POST",
        body: formData
      })
        .then(res => {
          if (!res.ok) throw new Error("Server error");
          return res.json();
        })
        .then(data => {
          // After successful import, go back to Product Master page
          window.location.href = "/products";
        })
        .catch(err => {
          console.error(err);
          alert("❌ Import failed. Please try again.");
        });
    });
  }

});