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
                alert("Product deleted successfully");
                
                // Close both modals
                document.getElementById('deleteModal').style.display = 'none';
                document.getElementById("productModal").style.display = "none";
                
                // Reload the page
                location.reload();
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
            e.target.textContent = 'OK';
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
    let formChanged = false;

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
        return v.length <= 40 && /^[A-Za-z ]+$/.test(v);
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

    // ==========================
    // ✅ Search Function
    // ==========================
    if (searchInput && tableBody) {
        searchInput.addEventListener("keyup", () => {
            const filter = searchInput.value.toLowerCase();
            const rows = tableBody.querySelectorAll("tr");
            let visible = 0;
            rows.forEach(row => {
                if (row.classList.contains("no-data-row")) return;
                const show = row.textContent.toLowerCase().includes(filter);
                row.style.display = show ? "" : "none";
                if (show) visible++;
            });
            if (showingCount) showingCount.textContent = visible;
        });
    }

    // ==========================
    // ✅ Edit Modal
    // ==========================
    document.addEventListener("click", async (e) => {
        const editBtn = e.target.closest(".edit-btn");
        if (!editBtn) return;

        e.preventDefault();
        e.stopPropagation();
        clearErrors();

        const enquiryId = editBtn.dataset.id;
        if (!enquiryId) return alert("No enquiry ID found");

        try {
            const res = await fetch(`/api/enquiry/${encodeURIComponent(enquiryId)}`);
            const response = await res.json();
            if (!res.ok || !response.success) {
                alert(response.message || "Unable to load enquiry");
                return;
            }

            const enquiry = response.data;

            // Fill fields
            if (editId) editId.value = enquiry.enquiry_id || "";
            if (editCode) editCode.value = enquiry.enquiry_id || "";
            if (editFirstName) editFirstName.value = enquiry.first_name || "";
            if (editLastName) editLastName.value = enquiry.last_name || "";
            if (editPhoneNumber) editPhoneNumber.value = enquiry.phone_number || enquiry.phone || "";
            if (editEmail) editEmail.value = enquiry.email || "";

            // Reset formChanged
            formChanged = false;
            if (saveEditBtn) saveEditBtn.disabled = true;

            openModal(editModal);

            // Track changes
            [editFirstName, editLastName, editPhoneNumber, editEmail].forEach(el => {
                if (!el) return;
                el.addEventListener("input", () => {
                    formChanged = true;
                    saveEditBtn.disabled = false;
                });
            });

        } catch (err) {
            console.error("Edit load error:", err);
            alert("Server error while loading enquiry");
        }
    });

    // ==========================
    // ✅ FOOTER PART
    // ==========================
    const rowsPerPage = 10;

    const tbody = document.getElementById("enquiryTable");
    if (!tbody) return;

    // get only real data rows
    const rows = Array.from(tbody.querySelectorAll("tr"))
        .filter(row => !row.classList.contains("no-data-row"));

    const prevBtn = document.getElementById("prevPage");
    const nextBtn = document.getElementById("nextPage");
    const pageInfo = document.getElementById("pageInfo");
    const entriesInfo = document.querySelector(".entries-info");
    const pagination = document.querySelector(".pagination-controls");

    let currentPage = 1;
    const totalEntries = rows.length;
    const totalPages = Math.ceil(totalEntries / rowsPerPage);

    function renderTable() {
        // hide all rows
        rows.forEach(row => row.style.display = "none");

        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;

        rows.slice(start, end).forEach(row => {
            row.style.display = "";
        });

        // footer text
        entriesInfo.textContent = `Showing ${totalEntries} entries`;
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

        // button state
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
    }

    // events
    prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    nextBtn.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });

    // hide pagination if not needed
    // if (totalEntries <= rowsPerPage) {
    //     pagination.style.display = "none";
    // }

    // initial render
    renderTable();

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
            if (hasError) return;

            saveEditBtn.disabled = true;

            try {
                const res = await fetch(`/update-enquiry/${encodeURIComponent(id)}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        first_name: firstName,
                        last_name: lastName,
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
                setTimeout(() => { window.location.reload(); }, 500);
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
        if (!delBtn) return;
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
                setTimeout(() => window.location.reload(), 500);
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

        const quantity = parseFloat(item.quantity || 0);
        const unitPrice = parseFloat(item.unit_price || 0);
        const sellingPrice = parseFloat(item.selling_price || 0);
        const total = quantity * sellingPrice;
        document.getElementById("modalProductId").textContent = `${item.item_code}`;
        document.getElementById("modalProductName").textContent = `${item.item_name}`;
        document.getElementById("modalDescription").textContent = item.description || '-';
        document.getElementById("modalQuantity").textContent = quantity;
        document.getElementById("modalUnitPrice").textContent = `${unitPrice}`;
        document.getElementById("modalSellingPrice").textContent = `${sellingPrice}`;
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
            // ✅ Use the CORRECT endpoint
            const res = await fetch(`/get-enquiry-add-items/${encodeURIComponent(enquiryId)}`);
            const data = await res.json();
            
            if(!data.success) { 
                alert("No items found"); 
                return; 
            }

            // ✅ Get items directly - NO FILTERING
            const items = data.items || {};
            
            if (Object.keys(items).length === 0) {
                alert("This enquiry has no items");
                return;
            }
            
            currentItems = Object.values(items);
            currentIndex = 0;
            showProduct(currentIndex);
            document.getElementById("productModal").style.display = "flex";
            
        } catch(err) {
            console.error("Error loading products:", err);
            alert("Error loading products");
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


    


    // Close modal
    document.getElementById("closeModal").addEventListener("click", () => {
        document.getElementById("productModal").style.display = "none";
    });

    // ==========================
    // ✅ EDIT PRODUCT BUTTON
    // ==========================
    const modalTitle = document.getElementById("modalTitle");
    const editBtn = document.getElementById("editBtn");
    const saveBtn = document.getElementById("saveBtn");
    const qtyEl = document.getElementById("modalQuantity");
    const spEl = document.getElementById("modalSellingPrice");

    // Default state
    qtyEl.contentEditable = "false";
    spEl.contentEditable = "false";
    saveBtn.disabled = true;

    // Edit button click
    editBtn.addEventListener("click", () => {
        qtyEl.contentEditable = "true";
        spEl.contentEditable = "true";
        qtyEl.style.backgroundColor = "#fff9c4";
        spEl.style.backgroundColor = "#fff9c4";
        modalTitle.textContent = "Edit Product";
    });

    // Restrict quantity and selling price to numbers only
    [qtyEl, spEl].forEach(el => {
        el.addEventListener("keydown", (e) => {
            if (["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Enter"].includes(e.key)) return;
            if (!/^\d$/.test(e.key)) e.preventDefault();
        });
    });

    function enableSave() {
        saveBtn.disabled = false;
    }

    [qtyEl, spEl].forEach(el => {
        el.addEventListener("input", enableSave);
    });

    // Enter key updates total
    [qtyEl, spEl].forEach(el => {
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
    // ✅ SAVE BUTTON (EDIT PRODUCT)
    // ==========================
    let newEnquiryData = {};

    document.getElementById("saveBtn").addEventListener("click", async () => {  
        const qty = getNumberFromDiv(qtyEl);
        const sp = getNumberFromDiv(spEl);
        const currentItem = currentItems[currentIndex];
        
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
            const res = await fetch(`/update-enquiry-items/${encodeURIComponent(currentEnquiryId)}`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ items: newEnquiryData[currentEnquiryId].items })
            });
            const result = await res.json();
            if(result.success){
                alert("Items saved successfully!");
                window.location.href = "/enquiry-list";
            } else {
                alert("Failed to save: " + result.message);
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