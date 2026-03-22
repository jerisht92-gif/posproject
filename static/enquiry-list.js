/** Same REST base as Postman: /api/enquiries */
const ENQUIRIES_API = "/api/enquiries";

// ==========================
// ✅ GLOBAL VARIABLES & FUNCTIONS (outside DOMContentLoaded)
// ==========================

let currentItems = [];
let currentIndex = 0;
let currentCustomer = "";
let currentEnquiryId = null;

// Global variable for product deletion
let currentViewingProduct = {
    enquiryId: null,
    itemCode: null
};

// Global function for setting current product
function setCurrentProduct(enquiryId, itemCode) {
    currentViewingProduct.enquiryId = enquiryId;
    currentViewingProduct.itemCode = itemCode;
    console.log('Current product set:', currentViewingProduct);
}

// ==========================
// ✅ DELETE PRODUCT HANDLERS (outside DOMContentLoaded)
// ==========================

// Direct click handler for delete button
document.addEventListener('click', function(e) {
    // Check if delete button was clicked
    if (e.target.id === 'deleteItemBtn' || e.target.classList.contains('delete-item-btn')) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Delete button clicked');
        console.log('Current product:', currentViewingProduct);
        
        // Check if we have a product selected
        if (!currentViewingProduct.enquiryId || !currentViewingProduct.itemCode) {
            alert('No product selected for deletion');
            return;
        }
        
        // Show the delete modal
        const deleteModal = document.getElementById('deleteModal');
        if (deleteModal) {
            deleteModal.style.display = 'block';
        } else {
            alert('Delete modal not found');
        }
    }
});

// Confirm delete handler
document.addEventListener('click', function(e) {
    if (e.target.id === 'confirmDelete') {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Confirm delete clicked');
        
        const enquiryId = currentViewingProduct.enquiryId;
        const itemCode = currentViewingProduct.itemCode;
        
        if (!enquiryId || !itemCode) {
            alert('Missing enquiry ID or item code');
            document.getElementById('deleteModal').style.display = 'none';
            return;
        }

        // Disable button to prevent double submission
        e.target.disabled = true;
        e.target.textContent = 'Deleting...';

        fetch(`/delete-enquiry-item/${enquiryId}/${itemCode}`, {
            method: "DELETE",
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(res => {
            if (!res.ok) {
                throw new Error('Network response was not ok');
            }
            return res.json();
        })
        .then(data => {
            if (data.success) {
                // Close both modals first
                document.getElementById('deleteModal').style.display = 'none';
                document.getElementById("productModal").style.display = "none";

                // Show success toast instead of alert
                const existing = document.querySelector(".success-notification");
                if (existing) existing.remove();
                const toast = document.createElement("div");
                toast.className = "success-notification";
                toast.textContent = "Product deleted Successfully.";
                document.body.appendChild(toast);
                setTimeout(() => toast.classList.add("show"), 10);
                setTimeout(() => {
                    toast.classList.remove("show");
                    setTimeout(() => toast.remove(), 400);
                    location.reload();
                }, 2500);
            } else {
                alert(data.message || 'Delete failed');
                document.getElementById('deleteModal').style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while deleting');
            document.getElementById('deleteModal').style.display = 'none';
        })
        .finally(() => {
            // Re-enable button
            e.target.disabled = false;
            e.target.textContent = 'Delete';
        });
    }
});

// Cancel delete handler
document.addEventListener('click', function(e) {
    if (e.target.id === 'cancelDelete') {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('deleteModal').style.display = 'none';
    }
});

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const deleteModal = document.getElementById('deleteModal');
    if (e.target === deleteModal) {
        deleteModal.style.display = 'none';
    }
});

// ==========================
// ✅ DOM CONTENT LOADED
// ==========================
document.addEventListener("DOMContentLoaded", async () => {
    // ==========================
    // ✅ Elements
    // ==========================
    const searchInput = document.getElementById("searchEnquiries");
    const tableBody = document.getElementById("enquiryTable");
    const showingCount = document.getElementById("showingCount");
    const pageInfo = document.getElementById("pageInfo");
    const prevPageBtn = document.getElementById("prevPage");
    const nextPageBtn = document.getElementById("nextPage");

    if (!tableBody) return;

    // ==========================
    // Role + table render (data from GET /api/enquiries — same as Postman)
    // ==========================
    const pageEl = document.querySelector(".enquiry-page");
    const roleRaw = pageEl?.dataset.currentRole || pageEl?.dataset.role || "";
    const role = roleRaw.toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
    const canEdit = ["superadmin", "admin"].includes(role);
    const canDelete = ["superadmin"].includes(role);
    const editDisabledAttr = canEdit ? "" : " disabled title=\"Only Admin / Super Admin can edit\"";
    const deleteDisabledAttr = canDelete ? "" : " disabled title=\"Only Super Admin can delete\"";
    const editClass = canEdit ? "edit-btn action-btn" : "edit-btn action-btn edit-btn-disabled";
    const deleteClass = canDelete ? "delete-btn action-btn" : "delete-btn action-btn delete-btn-disabled";

    const rowsPerPage = 10;
    let currentPage = 1;

    function renderRows(items) {
        tableBody.innerHTML = "";
        if (!items || items.length === 0) {
            const tr = document.createElement("tr");
            tr.className = "no-data-row";
            const td = document.createElement("td");
            td.colSpan = 7;
            td.className = "no-data-cell";
            td.textContent = "No data Found";
            tr.appendChild(td);
            tableBody.appendChild(tr);
            return;
        }
        items.forEach((e) => {
            const tr = document.createElement("tr");
            const esc = (s) => String(s ?? "").replace(/</g, "&lt;");
            tr.innerHTML = `
        <td><span class="enquiry-id-link" data-id="${esc(e.enquiry_id)}">${esc(e.enquiry_id)}</span></td>
        <td>${esc(e.first_name)}</td>
        <td>${esc(e.last_name)}</td>
        <td>${esc(e.email)}</td>
        <td>${esc(e.phone_number || e.phone)}</td>
        <td>${esc(e.status)}</td>
        <td class="action-cell">
          <div class="action-buttons">
            <button class="${editClass}" data-id="${esc(e.enquiry_id)}"${editDisabledAttr}>Edit</button>
            <button class="${deleteClass}" data-id="${esc(e.enquiry_id)}"${deleteDisabledAttr}>Delete</button>
          </div>
        </td>`;
            tableBody.appendChild(tr);
        });
    }

    function getDataRows() {
        return Array.from(tableBody.querySelectorAll("tr")).filter((row) => !row.classList.contains("no-data-row"));
    }

    function renderPagination() {
        const rows = getDataRows();
        const totalEntries = rows.length;
        const totalPages = Math.max(1, Math.ceil(totalEntries / rowsPerPage) || 1);
        if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
        rows.forEach((row) => {
            row.style.display = "none";
        });
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        rows.slice(start, end).forEach((row) => {
            row.style.display = "";
        });
        const startEntry = totalEntries === 0 ? 0 : start + 1;
        const endEntry = Math.min(end, totalEntries);
        if (showingCount) {
            showingCount.textContent = totalEntries > 0 ? `${startEntry}-${endEntry} of ${totalEntries}` : "0";
        }
        if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
        if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
    }

    async function loadEnquiriesFromApi() {
        try {
            const res = await fetch(ENQUIRIES_API, {
                headers: { Accept: "application/json" },
                credentials: "same-origin",
                cache: "no-store",
            });
            const payload = await res.json();
            if (!res.ok || !payload.success) {
                console.error("Enquiry list API:", payload);
                return;
            }
            if (Array.isArray(payload.enquiries)) {
                renderRows(payload.enquiries);
                currentPage = 1;
                renderPagination();
            }
        } catch (err) {
            console.error("Error loading enquiries:", err);
        }
    }

    await loadEnquiriesFromApi();

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
    let formChanged = false;
    let productModalPreviousFocus = null;

    // ==========================
    // ✅ Modal Functions
    // ==========================
    function getFocusable(modal) {
        if (!modal) return [];
        return [...modal.querySelectorAll(
            'button, [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
        )].filter(el => !el.disabled && el.offsetParent !== null);
    }

    function trapFocus(e) {
        if (!activeModal || e.key !== "Tab") return;
        const focusables = getFocusable(activeModal);
        if (focusables.length === 0) return;
        const current = document.activeElement;
        const inside = activeModal.contains(current);
        if (!inside) {
            e.preventDefault();
            focusables[e.shiftKey ? focusables.length - 1 : 0].focus();
            return;
        }
        e.preventDefault();
        const idx = focusables.indexOf(current);
        if (e.shiftKey) {
            const nextIdx = idx <= 0 ? focusables.length - 1 : idx - 1;
            focusables[nextIdx].focus();
        } else {
            const nextIdx = idx < 0 || idx >= focusables.length - 1 ? 0 : idx + 1;
            focusables[nextIdx].focus();
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
        var path = window.location.pathname + (window.location.search || "");
        if (modal === editModal) history.pushState({ modal: "editEnquiry" }, "", path + "#edit-enquiry");
        if (modal === deleteModal) history.pushState({ modal: "deleteEnquiry" }, "", path + "#delete-enquiry");
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
        var h = window.location.hash;
        if ((modal === editModal && h === "#edit-enquiry") || (modal === deleteModal && h === "#delete-enquiry"))
            history.replaceState(null, "", window.location.pathname + (window.location.search || ""));
    }

    function clearErrors() {
        [errFirstName, errLastName, errPhoneNumber, errEmail].forEach(err => {
            if (err) err.textContent = "";
        });
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
    function isValidLastName(v) {
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

    // ==========================
    // ✅ Enable/Disable Edit Enquiry Save button (same pattern as Edit User)
    // ==========================
    function updateEnquirySaveButtonState() {
        if (!saveEditBtn) return;
        const firstName = (editFirstName?.value || "").trim();
        const lastName = (editLastName?.value || "").trim();
        const phone = (editPhoneNumber?.value || "").trim();
        const email = (editEmail?.value || "").trim();
        const firstValid = isValidName(firstName);
        const lastValid = isValidLastName(lastName);
        const phoneValid = isValidPhone(phone);
        const emailValid = isValidEmail(email);
        saveEditBtn.disabled = !(firstValid && lastValid && phoneValid && emailValid);
    }

    // ==========================
    // ✅ Success Notification (durationMs: default 2000, use 3000 for enquiry saved)
    // ==========================
    function showSuccessNotification(message, durationMs) {
        const duration = durationMs == null ? 2000 : durationMs;
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
        }, duration);
    }

    function showErrorToast(message, durationMs) {
        const duration = durationMs == null ? 3000 : durationMs;
        const existing = document.querySelector(".error-notification");
        if (existing) existing.remove();
        const toast = document.createElement("div");
        toast.className = "error-notification";
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add("show"), 10);
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }

    // ==========================
    // ✅ Show success toast when redirected after submit (3 seconds)
    // ==========================
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("saved") === "1") {
        showSuccessNotification("Enquiry saved successfully.", 3000);
        window.history.replaceState({}, "", window.location.pathname);
    }

    // ==========================
    // ✅ Role-based: show message if redirected (no create access)
    // ==========================
    if (urlParams.get("message") === "create_denied") {
        showSuccessNotification("Only Admin or Super Admin can create enquiries.");
        window.history.replaceState({}, "", window.location.pathname);
    }

    // ==========================
    // ✅ Search (client-side; clears pagination while typing)
    // ==========================
    if (searchInput && tableBody) {
        searchInput.addEventListener("keyup", () => {
            const filter = searchInput.value.toLowerCase().trim();
            const rows = getDataRows();
            if (!filter) {
                renderPagination();
                return;
            }
            let visible = 0;
            rows.forEach((row) => {
                const show = row.textContent.toLowerCase().includes(filter);
                row.style.display = show ? "" : "none";
                if (show) visible++;
            });
            if (showingCount) showingCount.textContent = visible > 0 ? `${visible} match(es)` : "0";
            if (pageInfo) pageInfo.textContent = "Search results";
            if (prevPageBtn) prevPageBtn.disabled = true;
            if (nextPageBtn) nextPageBtn.disabled = true;
        });
    }

    // ==========================
    // ✅ Edit Modal
    // ==========================
    document.addEventListener("click", async (e) => {
        const editBtn = e.target.closest(".edit-btn");
        if (!editBtn || editBtn.disabled || editBtn.classList.contains("edit-btn-disabled")) return;

        e.preventDefault();
        e.stopPropagation();
        clearErrors();

        const enquiryId = editBtn.dataset.id;
        if (!enquiryId) return alert("No enquiry ID found");

        try {
            const res = await fetch(`${ENQUIRIES_API}/${encodeURIComponent(enquiryId)}`, {
                headers: { Accept: "application/json" },
                credentials: "same-origin",
            });
            const response = await res.json();
            if (!res.ok || !response.success) {
                alert(response.message || "Unable to load enquiry");
                return;
            }

            const enquiry = response.enquiry || response.data || {};

            // Fill fields
            if (editId) editId.value = enquiry.enquiry_id || "";
            if (editCode) editCode.value = enquiry.enquiry_id || "";
            if (editFirstName) editFirstName.value = enquiry.first_name || "";
            if (editLastName) editLastName.value = enquiry.last_name || "";
            if (editPhoneNumber) editPhoneNumber.value = enquiry.phone_number || enquiry.phone || "";
            if (editEmail) editEmail.value = enquiry.email || "";

            formChanged = false;
            clearErrors();
            openModal(editModal);
            [editFirstName, editLastName, editPhoneNumber, editEmail].forEach(validateEditField);
            updateEnquirySaveButtonState();

        } catch (err) {
            console.error("Edit load error:", err);
            alert("Server error while loading enquiry");
        }
    });

    // First Name: allow only letters and space (alphabets only)
    if (editFirstName) {
        editFirstName.addEventListener("input", () => {
            let v = (editFirstName.value || "").replace(/[^A-Za-z ]/g, "");
            if (v.length > 40) v = v.slice(0, 40);
            editFirstName.value = v.replace(/\s+/g, " ");
        });
    }

    // Last Name: allow only letters and space (alphabets only); restrict digits/symbols
    if (editLastName) {
        editLastName.addEventListener("input", () => {
            let v = (editLastName.value || "").replace(/[^A-Za-z ]/g, "");
            if (v.length > 40) v = v.slice(0, 40);
            editLastName.value = v.replace(/\s+/g, " ");
        });
    }

    // Phone Number: allow only digits, max 10 (numeric-only input)
    if (editPhoneNumber) {
        editPhoneNumber.addEventListener("input", () => {
            let v = (editPhoneNumber.value || "").replace(/\D/g, "");
            if (v.length > 10) v = v.slice(0, 10);
            editPhoneNumber.value = v;
        });
    }

    // Email: restrict to lowercase (no capital letters)
    if (editEmail) {
        editEmail.addEventListener("input", () => {
            editEmail.value = (editEmail.value || "").toLowerCase();
        });
    }

    // ==========================
    // Live validation for Edit Enquiry (same as Create New Branch Users)
    // ==========================
    function validateEditField(field) {
        if (!field) return;
        const v = (field.value || "").trim();
        let message = "";
        if (field === editFirstName) {
            if (!v) message = "First Name is required.";
            else if (v.length < 3) message = "Minimum 3 Letters Required";
            else if (!isValidName(v)) message = "First name should contain only letters (max 40).";
        } else if (field === editLastName) {
            if (!v) message = "Last Name is required.";
            else if (v.length < 3) message = "Minimum 3 Letters Required";
            else if (!isValidLastName(v)) message = "Last name should contain only letters (max 40).";
        } else if (field === editPhoneNumber) {
            if (!v) message = "Phone is required.";
            else if (!isValidPhone(v)) message = "Phone must be exactly 10 digits";
        } else if (field === editEmail) {
            if (!v) message = "Email is required.";
            else if (!isValidEmail(v)) message = "Enter a valid email address";
        }
        const errEl = field === editFirstName ? errFirstName : field === editLastName ? errLastName : field === editPhoneNumber ? errPhoneNumber : errEmail;
        if (errEl) errEl.textContent = message;
        if (message) field.classList.add("input-error"); else field.classList.remove("input-error");
        updateEnquirySaveButtonState();
    }

    // Input + blur: live validation for each Edit Enquiry field
    [editFirstName, editLastName, editPhoneNumber, editEmail].forEach(el => {
        if (!el) return;
        el.addEventListener("input", () => {
            formChanged = true;
            validateEditField(el);
        });
        el.addEventListener("blur", () => validateEditField(el));
    });

    // ==========================
    // ✅ Pagination controls
    // ==========================
    if (prevPageBtn) {
        prevPageBtn.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                renderPagination();
            }
        });
    }
    if (nextPageBtn) {
        nextPageBtn.addEventListener("click", () => {
            const rows = getDataRows();
            const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
            if (currentPage < totalPages) {
                currentPage++;
                renderPagination();
            }
        });
    }

    // ==========================
    // ✅ Save Edit
    // ==========================
    if (saveEditBtn) {
        saveEditBtn.addEventListener("click", async () => {
            clearErrors();
            if (!formChanged) return;

            const id = editId?.value;
            const firstName = (editFirstName?.value || "").trim();
            const lastName = (editLastName?.value || "").trim();
            const phone = (editPhoneNumber?.value || "").trim();
            const email = (editEmail?.value || "").trim();

            let hasError = false;
            if (!isValidName(firstName)) { errFirstName.textContent = "First name must be 3-40 letters"; editFirstName.classList.add("input-error"); hasError = true; }
            if (!isValidLastName(lastName)) { errLastName.textContent = "Last name must be 3-40 letters"; editLastName.classList.add("input-error"); hasError = true; }
            if (!isValidPhone(phone)) { errPhoneNumber.textContent = "Phone must be exactly 10 digits"; editPhoneNumber.classList.add("input-error"); hasError = true; }
            if (!isValidEmail(email)) { errEmail.textContent = "Enter a valid email address"; editEmail.classList.add("input-error"); hasError = true; }
            if (hasError) {
                updateEnquirySaveButtonState();
                return;
            }

            saveEditBtn.disabled = true;

            try {
                const res = await fetch(`${ENQUIRIES_API}/${encodeURIComponent(id)}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    credentials: "same-origin",
                    body: JSON.stringify({
                        enquiry_details: {
                            first_name: firstName,
                            last_name: lastName,
                            phone: phone,
                            email: email,
                        },
                    }),
                });

                const response = await res.json();
                if (!res.ok || !response.success) {
                    alert(response.message || "Update failed");
                    saveEditBtn.disabled = false;
                    return;
                }

                showSuccessNotification("Enquiry updated successfully");
                closeModal(editModal);
                await loadEnquiriesFromApi();
                saveEditBtn.disabled = false;
            } catch (err) {
                console.error("Save error:", err);
                alert("Server error while updating enquiry");
                saveEditBtn.disabled = false;
            }
        });
    }

    // ==========================
    // ✅ Delete Enquiry Modal
    // ==========================
    document.addEventListener("click", (e) => {
        const delBtn = e.target.closest(".delete-btn");
        if (!delBtn || delBtn.disabled || delBtn.classList.contains("delete-btn-disabled")) return;
        e.preventDefault();
        e.stopPropagation();

        deleteTargetId = delBtn.dataset.id;
        if (!deleteTargetId) return;

        if (deleteText) deleteText.textContent = `Are you sure you want to delete "${deleteTargetId}"?`;
        if (deleteModal) openModal(deleteModal);
    });

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener("click", async () => {
            if (!deleteTargetId) return;
            try {
                const res = await fetch(`${ENQUIRIES_API}/${encodeURIComponent(deleteTargetId)}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    credentials: "same-origin",
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    alert(data.message || "Delete failed");
                    return;
                }
                showSuccessNotification("Enquiry deleted successfully");
                closeModal(deleteModal);
                await loadEnquiriesFromApi();
            } catch { 
                alert("Network error. Try again."); 
            }
        });
    }

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener("click", () => { 
            deleteTargetId = null; 
            closeModal(deleteModal); 
        });
    }

    // ==========================
    // ✅ Close Edit Modal
    // ==========================
    if (closeEditBtn) closeEditBtn.addEventListener("click", () => closeModal(editModal));
    if (editModal) editModal.addEventListener("click", (e) => { 
        if (e.target === editModal) closeModal(editModal); 
    });
    document.addEventListener("keydown", (e) => { 
        if (e.key === "Escape" && activeModal) closeModal(activeModal); 
    });

    // ==========================
    // ✅ VIEW PRODUCT
    // ==========================

    function showProduct(index) {
        const item = currentItems[index];
        if(!item) return;
        
        // ✅ SET CURRENT PRODUCT FOR DELETION
        setCurrentProduct(currentEnquiryId, item.item_code);

        const quantity = Math.max(1, parseFloat(item.quantity || 0) || 1);
        const unitPrice = parseFloat(item.unit_price || 0);
        const sellingPrice = Math.max(1, parseFloat(item.selling_price || 0) || 1);
        const total = quantity * sellingPrice;
        document.getElementById("modalProductId").textContent = `${item.item_code}`;
        document.getElementById("modalProductName").textContent = `${item.item_name}`;
        document.getElementById("modalDescription").textContent = item.description || '-';
        document.getElementById("modalQuantity").textContent = quantity;
        document.getElementById("modalUnitPrice").textContent = `${unitPrice}`;
        document.getElementById("modalSellingPrice").textContent = sellingPrice;
        document.getElementById("modalTotal").textContent = `${total}`;

        // Grand total of all products
        const grandTotal = currentItems.reduce((sum, prod) => {
            return sum + (parseFloat(prod.quantity || 0) * parseFloat(prod.selling_price || 0));
        }, 0);
        document.getElementById("modalGrandTotal").textContent = `${grandTotal}`;

        // Update counter
        document.getElementById("productCounter").textContent =
            `Product ${index+1} of ${currentItems.length}`;
                updateNavigation(); // 👈 add this line

    }

    // Fetch items on Enquiry click - UPDATED to use correct endpoint
    document.addEventListener("click", async (e) => {
        const link = e.target.closest(".enquiry-id-link");
        if(!link) return;

        const enquiryId = link.dataset.id;
        currentEnquiryId = enquiryId;

        try {
            const res = await fetch(`${ENQUIRIES_API}/${encodeURIComponent(enquiryId)}`, {
                headers: { Accept: "application/json" },
                credentials: "same-origin",
            });
            const data = await res.json();

            if (!data.success || !data.enquiry) {
                showErrorToast("No items found");
                return;
            }

            const items = data.enquiry.items || {};
            
            if (Object.keys(items).length === 0) {
                showErrorToast("This enquiry has no items");
                return;
            }
            
            currentItems = Object.values(items);
            currentIndex = 0;
            showProduct(currentIndex);
            const productModalEl = document.getElementById("productModal");
            productModalEl.style.display = "flex";
            productModalPreviousFocus = document.activeElement;
            const productFocusables = getFocusable(productModalEl);
            if (productFocusables.length) productFocusables[0].focus();
            document.addEventListener("keydown", productModalTrapKeydown);
            history.pushState({ modal: "viewProduct" }, "", window.location.pathname + (window.location.search || "") + "#view-product");

        } catch(err) {
            console.error("Error loading products:", err);
            showErrorToast("Error loading products");
        }
    });

    // Navigation arrows
  function updateNavigation() {
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const productCounter = document.getElementById("productCounter");

    // If 0 or 1 item → hide everything
    if (!currentItems || currentItems.length <= 1) {
        prevBtn.style.display = "none";
        nextBtn.style.display = "none";
        productCounter.style.display = "none";
        return;
      }

    // Show buttons if more than 1 product
    prevBtn.style.display = "inline-block";
    nextBtn.style.display = "inline-block";
    productCounter.style.display = "inline-block";
   
console.log("Index:", currentIndex);
console.log("Length:", currentItems.length);


    // 🔥 Disable logic
    prevBtn.disabled = (currentIndex === 0);
    nextBtn.disabled = (currentIndex === currentItems.length-1);
}


    // Navigation arrows

    document.getElementById("prevBtn").addEventListener("click", () => {
        if(currentIndex > 0) { 
            currentIndex--; 
            showProduct(currentIndex); 
        }
       
    });
    
    document.getElementById("nextBtn").addEventListener("click", () => {
        if(currentIndex < currentItems.length-1) { 
            currentIndex++; 
            showProduct(currentIndex); 
        }
    });


    


    function productModalTrapKeydown(e) {
        const productModalEl = document.getElementById("productModal");
        if (!productModalEl || productModalEl.style.display !== "flex") return;
        if (e.key === "Escape") {
            e.preventDefault();
            closeProductModal();
            return;
        }
        if (e.key !== "Tab") return;
        const focusables = getFocusable(productModalEl);
        if (focusables.length === 0) return;
        const current = document.activeElement;
        const inside = productModalEl.contains(current);
        if (!inside) {
            e.preventDefault();
            focusables[e.shiftKey ? focusables.length - 1 : 0].focus();
            return;
        }
        e.preventDefault();
        const idx = focusables.indexOf(current);
        if (e.shiftKey) {
            const nextIdx = idx <= 0 ? focusables.length - 1 : idx - 1;
            focusables[nextIdx].focus();
        } else {
            const nextIdx = idx < 0 || idx >= focusables.length - 1 ? 0 : idx + 1;
            focusables[nextIdx].focus();
        }
    }

    function closeProductModal() {
        document.removeEventListener("keydown", productModalTrapKeydown);
        if (productModalPreviousFocus) productModalPreviousFocus.focus();
        productModalPreviousFocus = null;
        document.getElementById("productModal").style.display = "none";
        if (window.location.hash === "#view-product") history.replaceState(null, "", window.location.pathname + (window.location.search || ""));
    }

    window.addEventListener("popstate", () => {
        const productModalEl = document.getElementById("productModal");
        if (productModalEl && productModalEl.style.display === "flex") {
            closeProductModal();
            return;
        }
        if (editModal && editModal.style.display === "flex") {
            closeModal(editModal);
            return;
        }
        if (deleteModal && deleteModal.style.display === "flex") closeModal(deleteModal);
    });

    // Close modal (click and keyboard for accessibility)
    const closeModalBtn = document.getElementById("closeModal");
    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", closeProductModal);
        closeModalBtn.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                closeProductModal();
            }
        });
    }

    // ==========================
    // ✅ EDIT PRODUCT BUTTON
    // ==========================
    const modalTitle = document.getElementById("modalTitle");
    const editBtn = document.getElementById("editBtn");
    const saveBtn = document.getElementById("saveBtn");
    const qtyEl = document.getElementById("modalQuantity");
    const spEl = document.getElementById("modalSellingPrice");

    // Default state
    if (qtyEl) qtyEl.contentEditable = "false";
    if (spEl) spEl.contentEditable = "false";
    if (saveBtn) saveBtn.disabled = true;

    if (editBtn && saveBtn) {
        editBtn.addEventListener("click", () => {
            if (qtyEl) { qtyEl.contentEditable = "true"; qtyEl.style.backgroundColor = "#fff9c4"; }
            if (spEl) { spEl.contentEditable = "true"; spEl.style.backgroundColor = "#fff9c4"; }
            if (modalTitle) modalTitle.textContent = "Edit Product";
        });
        function enableSave() { saveBtn.disabled = false; }
        [qtyEl, spEl].filter(Boolean).forEach(el => { el.addEventListener("input", enableSave); });
    }

    // Restrict quantity and selling price to numbers only; do not accept 0
    [qtyEl, spEl].filter(Boolean).forEach(el => {
        el.addEventListener("keydown", (e) => {
            if (["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Enter"].includes(e.key)) return;
            if (!/^\d$/.test(e.key)) e.preventDefault();
        });
        el.addEventListener("input", () => {
            const text = el.innerText.replace(/[^0-9]/g, "").trim();
            if (text === "0") el.innerText = ""; // do not accept 0 as a whole number
        });
        el.addEventListener("blur", () => {
            const num = getNumberFromDiv(el);
            if (num < 1) el.innerText = "1"; // ensure at least 1
            updateTotal();
        });
    });

    // Enter key updates total
    [qtyEl, spEl].filter(Boolean).forEach(el => {
        el.addEventListener("keydown", (e) => {
            if (el.contentEditable === "false") return;
            if (e.key === "Enter") {
                e.preventDefault();
                el.blur();
                updateTotal();
            }
        });
    });

    // Helper to safely parse number from contenteditable div
    function getNumberFromDiv(el) {
        if (!el) return 0;
        const text = el.innerText.replace(/[^0-9.]/g,'').trim();
        return parseFloat(text) || 0;
    }

    // Update total function
    function updateTotal() {
        const totalEl = document.getElementById("modalTotal");
        const qty = getNumberFromDiv(qtyEl);
        const sp = getNumberFromDiv(spEl);
        const total = qty * sp;
        totalEl.textContent = `${total}`;
        
        // Update currentItems array
        currentItems[currentIndex].quantity = qty;
        currentItems[currentIndex].selling_price = sp;
        
        // Recalculate grand total
        const grandTotal = currentItems.reduce((sum, item) => {
            const q = parseFloat(item.quantity || 0);
            const s = parseFloat(item.selling_price || 0);
            return sum + q * s;
        }, 0);
        document.getElementById("modalGrandTotal").textContent = `${grandTotal}`;
    }

    // ==========================
    // ✅ SAVE BUTTON (EDIT PRODUCT) – only when can_edit
    // ==========================
    let newEnquiryData = {};

    const saveBtnEl = document.getElementById("saveBtn");
    if (saveBtnEl) saveBtnEl.addEventListener("click", async () => {  
        const qty = getNumberFromDiv(qtyEl);
        const sp = getNumberFromDiv(spEl);
        const currentItem = currentItems[currentIndex];

        // Quantity and Selling price must be at least 1 (no 0)
        if (qty < 1) {
            alert("Quantity must be at least 1.");
            return;
        }
        if (sp < 1) {
            alert("Selling price must be at least 1.");
            return;
        }
        
        currentItem.quantity = qty;
        currentItem.selling_price = sp;

        if (!currentEnquiryId) {
            alert("No enquiry selected!");
            return;
        }

        if (!newEnquiryData[currentEnquiryId]) {
            newEnquiryData[currentEnquiryId] = { items: {} };
        }

        newEnquiryData[currentEnquiryId].items[currentItem.item_code] = {
            item_code: currentItem.item_code,
            item_name: currentItem.item_name,
            quantity: qty.toString(),
            selling_price: sp.toString(),
            unit_price: currentItem.unit_price,
            description: currentItem.description,
            total: (qty * sp)
        };

        try {
            const res = await fetch(`${ENQUIRIES_API}/${encodeURIComponent(currentEnquiryId)}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                credentials: "same-origin",
                body: JSON.stringify({ items: newEnquiryData[currentEnquiryId].items }),
            });
            const result = await res.json();
            if (result.success) {
                alert("Items saved successfully!");
                closeProductModal();
                await loadEnquiriesFromApi();
            } else {
                alert("Failed to save: " + (result.message || "Unknown error"));
            }
        } catch(err){
            console.error(err);
            alert("Server error while saving items");
        }
    });

    // Close product edit modal
    document.getElementById("closeProductEditBtn")?.addEventListener("click", () => {
        document.getElementById("productModal1").style.display = "none";
    });
});