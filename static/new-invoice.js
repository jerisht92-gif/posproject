// =====================================
// SHOWTOAST
// =====================================
function showToast(message, type = 'info') {
    console.log(`Toast (${type}): ${message}`);

    let className = '';
    if (type === 'success') className = 'success-notification';
    else if (type === 'error' || type === 'warning') className = 'error-notification';
    else return;

    const toast = document.createElement('div');
    toast.className = className;
    toast.textContent = message;

    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// =========================================
// STATUS BADGE COLOR FUNCTION
// =========================================
function updateStatusBadgeColor(status, invoiceId) {
    const statusBadge = document.getElementById('invoiceStatusBadge');
    if (!statusBadge) return;
    
    statusBadge.classList.remove('status-draft', 'status-send', 'status-paid', 'status-overdue', 'status-cancelled');
    
    const statusLower = status.toLowerCase();
    let badgeText = '';
    switch(statusLower) {
        case 'draft':
            statusBadge.classList.add('status-draft');
            badgeText = `Status:Draft`;
            document.title = `Status:Draft ${invoiceId}`;
            break;
        case 'send':
            statusBadge.classList.add('status-send');
            badgeText = `Status:Send`;
            document.title = `Status:Send ${invoiceId}`;
            break;
        case 'paid':
            statusBadge.classList.add('status-paid');
            badgeText = `Status:Paid`;
            document.title = `Status:Paid ${invoiceId}`;
            break;
        case 'overdue':
            statusBadge.classList.add('status-overdue');
            badgeText = `Status:OverDue`;
            document.title = `Status:OverDue ${invoiceId}`;
            break;
        case 'cancelled':
            statusBadge.classList.add('status-cancelled');
            badgeText = `Status:Cancelled`;
            document.title = `Status:Cancelled ${invoiceId}`;
            break;
        default:
            statusBadge.classList.add('status-draft');
            badgeText = `Status:${status.charAt(0).toUpperCase() + status.slice(1)}`;
            document.title = `${invoiceId}`;
    }
    
    // Set the badge text once (no overwrite later)
    statusBadge.textContent = badgeText;
}
// =========================================
// Sale Order Reference custom dropdown
// =========================================
function toggleSaleOrderDropdown() {
        if (!window.isEditable) return;  // 👈 add this line

    const dropdown = document.getElementById('saleOrderDropdown');
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
        document.getElementById('saleOrderSearch').focus();
    }
}

function filterSaleOrders() {
    const searchTerm = document.getElementById('saleOrderSearch').value.toLowerCase();
    const items = document.querySelectorAll('#saleOrderList .dropdown-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

function selectSaleOrder(element) {
    if (!window.isEditable) return;  // 👈 add this line
    const selectedValue = element.getAttribute('data-value');
    const selectedText = element.textContent.trim();

    const hiddenInput = document.getElementById('saleOrderRef');
    hiddenInput.value = selectedValue;
    document.getElementById('saleOrderSelected').textContent = selectedText;
    document.getElementById('saleOrderDropdown').style.display = 'none';
    hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
}

// =========================================
// Payment Terms custom dropdown
// =========================================
function togglePaymentTermDropdown() {
    if (!window.isEditable) return;  // 👈 add this line
    const dropdown = document.getElementById('paymentTermDropdown');
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
        document.getElementById('paymentTermSearch').focus();
    }
}

function filterPaymentTerms() {
    const searchTerm = document.getElementById('paymentTermSearch').value.toLowerCase();
    const items = document.querySelectorAll('#paymentTermList .dropdown-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

function selectPaymentTerm(element) {
    if (!window.isEditable) return;  // 👈 add this line
    const selectedValue = element.getAttribute('data-value');
    const selectedText = element.textContent.trim();

    const hiddenInput = document.getElementById('paymentTerms');
    hiddenInput.value = selectedValue;
    document.getElementById('paymentTermSelected').textContent = selectedText;
    document.getElementById('paymentTermDropdown').style.display = 'none';
    hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    recalculateDueDate();
}

// ===================================================
// SIMPLE OVERDUE CHECK FOR SINGLE INVOICE
// ===================================================
function checkOverdueStatus() {
    const dueDate = document.getElementById('dueDate')?.value;
    const paymentStatus = document.getElementById('paymentStatus')?.value;
    const statusField = document.getElementById('invoiceStatus');
    
    if (!dueDate || !paymentStatus) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    if (dueDate < today && paymentStatus !== 'Paid') {
        if (statusField && statusField.value !== 'Paid' && statusField.value !== 'Cancelled') {
            statusField.value = 'Overdue';
        }
        showOverdueWarning(dueDate);
    } else {
        const existingWarning = document.querySelector('.overdue-warning');
        if (existingWarning) existingWarning.remove();
        
        if (paymentStatus === 'Paid' && statusField && statusField.value === 'Overdue') {
            statusField.value = 'Paid';
        }
    }
}

function showOverdueWarning(dueDate) {
    const existingWarning = document.querySelector('.overdue-warning');
    if (existingWarning) existingWarning.remove();
    
    const warningDiv = document.createElement('div');
    warningDiv.className = 'overdue-warning';
    warningDiv.innerHTML = `
        <div class="alert alert-warning" style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px 20px; margin-bottom: 20px;">
            <i class="fa-solid fa-exclamation-triangle" style="color: #ffc107; margin-right: 10px;"></i>
            <strong>⚠️ OVERDUE INVOICE</strong> - This invoice was due on ${dueDate}. Please collect payment immediately.
        </div>
    `;
    const form = document.getElementById('invoiceForm');
    if (form && !document.querySelector('.overdue-warning')) {
        form.insertBefore(warningDiv, form.firstChild);
    }
}

// ===================================================
// OVERDUE STATUS FUNCTIONS
// ===================================================

function isOverdue(dueDate, paymentStatus, invoiceStatus) {
    if (paymentStatus === 'Paid' || invoiceStatus === 'Cancelled' || invoiceStatus === 'Paid') {
        return false;
    }
    if (!dueDate) return false;
    
    const today = new Date().toISOString().split('T')[0];
    return dueDate < today;
}

function getDisplayStatus(invoice) {
    if (invoice.status === 'Overdue') return 'Overdue';
    if (isOverdue(invoice.due_date, invoice.payment_status, invoice.status)) {
        return 'Overdue';
    }
    return invoice.status || 'Draft';
}

function getStatusBadge(status) {
    const statusColors = {
        'Draft': 'badge-secondary',
        'Send': 'badge-primary',
        'Paid': 'badge-success',
        'Cancelled': 'badge-danger',
        'Overdue': 'badge-warning'
    };
    const colorClass = statusColors[status] || 'badge-secondary';
    return `<span class="badge ${colorClass}" style="font-size: 14px; padding: 6px 12px;">${status}</span>`;
}

function updateStatusBadge(invoice) {
    const displayStatus = getDisplayStatus(invoice);
    const badgeContainer = document.getElementById('statusBadge');
    
    if (badgeContainer) {
        badgeContainer.innerHTML = getStatusBadge(displayStatus);
        if (displayStatus === 'Overdue') {
            const badge = badgeContainer.querySelector('.badge');
            if (badge) badge.style.animation = 'pulse 1.5s infinite';
        }
    }
    updateStatusBadgeColor(displayStatus,invoice.invoice_id);
}

async function syncOverdueStatus(invoiceId) {
    if (!invoiceId || invoiceId === 'Auto Generate') return;
    try {
        const response = await fetch(`/api/invoice/${invoiceId}/check-overdue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        if (data.success && data.is_overdue) {
            console.log(`⚠️ Invoice ${invoiceId} is overdue`);
            if (window.currentInvoiceData) {
                window.currentInvoiceData.status = 'Overdue';
                updateStatusBadge(window.currentInvoiceData);
            }
        }
    } catch (error) {
        console.error('Error checking overdue status:', error);
    }
}

// ===================================================
// TABS INITIALIZATION
// ===================================================
function initializeTabs() {
    console.log("🔘 Initializing tabs...");
    const tabs = document.querySelectorAll(".tab");
    const tabContents = document.querySelectorAll(".tab-content");

    if (tabs.length === 0) {
        console.error("❌ No tabs found!");
        return;
    }

    console.log(`✅ Found ${tabs.length} tabs`);

    tabContents.forEach(content => {
        content.style.display = "none";
    });

    const defaultTab = document.querySelector('.tab[data-tab="comments"]');
    if (defaultTab) {
        defaultTab.classList.add('active');
        const commentsTab = document.getElementById('comments');
        if (commentsTab) {
            commentsTab.style.display = 'block';
            console.log("✅ Showing comments tab by default");
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener("click", function() {
            console.log(`📌 Tab clicked: ${this.getAttribute('data-tab')}`);
            tabs.forEach(t => t.classList.remove("active"));
            this.classList.add("active");
            tabContents.forEach(content => {
                content.style.display = "none";
            });
            const selectedTab = this.getAttribute("data-tab");
            const tabElement = document.getElementById(selectedTab);
            if (tabElement) {
                tabElement.style.display = "block";
                console.log(`✅ Showing ${selectedTab} tab`);
                if (selectedTab === 'attachments') {
                    const invoiceId = document.getElementById("invoiceId")?.value;
                    if (invoiceId) loadAttachmentsForInvoice(invoiceId);
                }
                if (selectedTab === 'history') {
                    const invoiceId = document.getElementById("invoiceId")?.value;
                    if (invoiceId) loadCommentsForInvoice(invoiceId);
                }
            } else {
                console.error(`❌ Tab content not found: ${selectedTab}`);
            }
        });
    });
    console.log("✅ Tabs initialized successfully");
}

// ===================================================
// COMMENTS FUNCTIONALITY
// ===================================================
let currentCommentPage = 1;
const COMMENTS_PER_PAGE = 10;
let totalComments = 0;
let hasMoreComments = false;

function initializeComments() {
    const addBtn = document.getElementById("addCommentBtn");
    const commentInput = document.getElementById("commentText");
    const historyContainer = document.getElementById("history");

    if (!addBtn || !commentInput || !historyContainer) return;

    function updateAddButtonState() {
        addBtn.disabled = commentInput.value.trim() === "";
    }
    updateAddButtonState();
    commentInput.addEventListener('input', updateAddButtonState);

    addBtn.addEventListener("click", function(e) {
        e.preventDefault();
        const commentText = commentInput.value.trim();
        if (commentText === "") {
            showToast("Please enter a comment", 'warning');
            return;
        }
        const invoiceId = document.getElementById("invoiceId").value;
        if (!invoiceId) {
            showToast("Invoice ID not found", 'error');
            return;
        }
        const scrollPos = historyContainer.scrollTop;
        addBtn.disabled = true;
        addBtn.textContent = "Adding...";

        fetch(`/api/invoice/${invoiceId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comment_text: commentText })
        })
            .then(res => res.json())
            .then(data => {
                console.log("Comment saved:", data);
                commentInput.value = "";
                currentCommentPage = 1;
                return loadCommentsForInvoice(invoiceId, 1);
            })
            .then(() => {
                document.querySelector('[data-tab="history"]')?.click();
                setTimeout(() => historyContainer.scrollTop = scrollPos, 100);
                showToast('Comment added successfully', 'success');
            })
            .catch(error => {
                console.error("Error saving comment:", error);
                showToast("Error saving comment", 'error');
            })
            .finally(() => {
                addBtn.textContent = "Add New";
                updateAddButtonState();
            });
    });
}

function loadCommentsForInvoice(invoiceId, page = 1) {
    if (!invoiceId) {
        console.error("❌ No invoice ID provided for loading comments");
        return Promise.reject('Missing invoice ID');
    }
    console.log(`💬 Fetching comments for: ${invoiceId}, page ${page}`);
    const historyContainer = document.getElementById('history');
    if (!historyContainer) {
        console.error("❌ historyContainer element not found");
        return Promise.reject('History container not found');
    }
    if (page === 1) {
        historyContainer.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading comments...</div>';
    }
    return fetch(`/api/invoice/${invoiceId}/comments?page=${page}&per_page=${COMMENTS_PER_PAGE}`)
        .then(res => res.json())
        .then(data => {
            if (page === 1) historyContainer.innerHTML = '';
            if (!data.comments || data.comments.length === 0) {
                if (page === 1) historyContainer.innerHTML = '<div class="no-history-message">No comments yet</div>';
                totalComments = 0;
                hasMoreComments = false;
                return;
            }
            totalComments = data.total || data.comments.length;
            hasMoreComments = data.has_more || false;
            currentCommentPage = data.page || page;
            data.comments.forEach(item => {
                const div = document.createElement("div");
                div.classList.add("history-item");
                const user = item.author || 'System';
                const time = item.created_at ? new Date(item.created_at).toLocaleString() : '';
                const comment = item.text || '';
                div.innerHTML = `<span class="user">${escapeHtml(user)}</span><span class="time">– ${escapeHtml(time)}</span><p>${escapeHtml(comment)}</p>`;
                historyContainer.appendChild(div);
            });
            if (hasMoreComments) {
                const oldBtn = document.getElementById('loadMoreCommentsBtn');
                if (oldBtn) oldBtn.remove();
                const loadMoreBtn = document.createElement('button');
                loadMoreBtn.id = 'loadMoreCommentsBtn';
                loadMoreBtn.className = 'btn btn-link';
                loadMoreBtn.innerHTML = 'Load More Comments...';
                loadMoreBtn.onclick = () => {
                    loadMoreBtn.disabled = true;
                    loadMoreBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
                    loadCommentsForInvoice(invoiceId, currentCommentPage + 1).finally(() => { });
                };
                historyContainer.appendChild(loadMoreBtn);
            } else {
                const oldBtn = document.getElementById('loadMoreCommentsBtn');
                if (oldBtn) oldBtn.remove();
            }
            console.log(`✅ Loaded ${data.comments.length} comments (page ${page})`);
        })
        .catch(error => {
            console.error("❌ Error loading comments:", error);
            if (page === 1) historyContainer.innerHTML = '<div class="no-history-message">Error loading comments</div>';
        });
}

// ===================================================
// ATTACHMENTS FUNCTIONALITY
// ===================================================
const MAX_ATTACHMENTS = 10;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function initializeAttachments() {
    console.log("%c📎 ATTACHMENTS: Initializing...", "color: blue; font-weight: bold");
    const fileInput = document.getElementById('fileInput');
    const uploadCard = document.getElementById('uploadCard');
    const uploadBtn = document.getElementById('uploadBtn');
    const filesList = document.getElementById('filesList');
    const fileCount = document.getElementById('fileCount');

    if (!fileInput || !uploadCard || !uploadBtn || !filesList) {
        console.error("%c❌ ATTACHMENTS: Missing required elements!", "color: red; font-weight: bold");
        return;
    }
    console.log("%c✅ ATTACHMENTS: All elements found", "color: green; font-weight: bold");
    window.attachments = [];
    tryLoadAttachments();
    window.addEventListener('popstate', tryLoadAttachments);

    function tryLoadAttachments() {
        const invoiceId = document.getElementById('invoiceId')?.value;
        if (invoiceId) {
            console.log(`📎 Loading attachments for ID: ${invoiceId}`);
            loadAttachmentsForInvoice(invoiceId);
        } else {
            console.log("⚠️ No invoice ID yet, will retry in 1 second...");
            setTimeout(tryLoadAttachments, 1000);
        }
    }

    function isMaxFilesReached() {
        const currentCount = window.currentInvoiceAttachments ? window.currentInvoiceAttachments.length : 0;
        return currentCount >= MAX_ATTACHMENTS;
    }

    uploadCard.addEventListener('click', (e) => {
        e.preventDefault();
        if (isMaxFilesReached()) {
            showToast(`Maximum ${MAX_ATTACHMENTS} files allowed`, 'warning');
            return;
        }
        console.log("📎 Upload card clicked");
        fileInput.click();
    });

    uploadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isMaxFilesReached()) {
            showToast(`Maximum ${MAX_ATTACHMENTS} files allowed`, 'warning');
            return;
        }
        console.log("📎 Upload button clicked");
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        console.log("📎 File selected:", e.target.files.length, "files");
        const files = Array.from(e.target.files);
        const currentCount = window.currentInvoiceAttachments ? window.currentInvoiceAttachments.length : 0;
        if (currentCount + files.length > MAX_ATTACHMENTS) {
            showToast(`Cannot upload ${files.length} file(s). Maximum ${MAX_ATTACHMENTS} files allowed. You have ${currentCount} file(s).`, 'warning');
            fileInput.value = '';
            return;
        }
        if (files.length > 0) uploadFiles(files);
        fileInput.value = '';
    });

    uploadCard.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadCard.style.borderColor = '#007bff';
        uploadCard.style.background = '#f0f7ff';
    });

    uploadCard.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadCard.style.borderColor = '#ddd';
        uploadCard.style.background = '#f8f9fa';
    });

    uploadCard.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadCard.style.borderColor = '#ddd';
        uploadCard.style.background = '#f8f9fa';
        const files = Array.from(e.dataTransfer.files);
        const currentCount = window.currentInvoiceAttachments ? window.currentInvoiceAttachments.length : 0;
        if (currentCount + files.length > MAX_ATTACHMENTS) {
            showToast(`Cannot upload ${files.length} file(s). Maximum ${MAX_ATTACHMENTS} files allowed.`, 'warning');
            return;
        }
        console.log("📎 Files dropped:", files.length);
        if (files.length > 0) uploadFiles(files);
    });

    async function uploadFiles(fileList) {
        for (const file of fileList) {
            if (file.size > MAX_FILE_SIZE_BYTES) {
                showToast(`File ${file.name} exceeds ${MAX_FILE_SIZE_MB} MB limit`, 'error');
                continue;
            }
            await uploadFile(file);
        }
        const id = document.getElementById('invoiceId')?.value;
        if (id) loadAttachmentsForInvoice(id);
    }

    async function uploadFile(file) {
        if (!validateFile(file)) return;
        const id = document.getElementById('invoiceId')?.value;
        if (!id) {
            showToast("Invoice ID not found. Please save the invoice first.", 'warning');
            return;
        }
        showUploading(file.name);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await fetch(`/api/invoice/${id}/attachments`, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.success) {
                console.log(`✅ Uploaded: ${file.name}`);
                showToast(`${file.name} uploaded successfully!`, 'success');
            } else {
                showToast(`Upload failed: ${data.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error("❌ Upload error:", error);
            showToast('Upload failed. Please try again.', 'error');
        } finally {
            removeUploading();
        }
    }

    function validateFile(file) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
            showToast(`${file.name} exceeds ${MAX_FILE_SIZE_MB}MB limit`, 'error');
            return false;
        }
        const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];
        const ext = file.name.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            showToast(`${file.name} type not allowed. Allowed: PDF, DOC, XLS, JPG, PNG`, 'error');
            return false;
        }
        return true;
    }

    function showUploading(filename) {
        removeUploading();
        const uploading = document.createElement('div');
        uploading.className = 'file-item uploading';
        uploading.innerHTML = `<div class="file-info"><div class="file-icon"><i class="fa-solid fa-spinner fa-spin"></i></div><div class="file-details"><div class="file-name">${escapeHtml(filename)}</div><div class="upload-progress">Uploading...</div></div></div>`;
        filesList.insertBefore(uploading, filesList.firstChild);
    }

    function removeUploading() {
        const uploading = document.querySelector('.file-item.uploading');
        if (uploading) uploading.remove();
    }
}

function loadAttachmentsForInvoice(invoiceId) {
    if (!invoiceId) {
        console.error("❌ No invoice ID provided for loading attachments");
        return;
    }
    console.log(`📎 Fetching attachments for: ${invoiceId}`);
    const filesList = document.getElementById('filesList');
    if (filesList) filesList.innerHTML = '<div class="loading-files"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading attachments...</p></div>';
    fetch(`/api/invoice/${invoiceId}/attachments`)
        .then(response => response.json())
        .then(data => {
            console.log("📎 Attachments response:", data);
            if (data.success) {
                const files = data.attachments || [];
                console.log(`✅ Loaded ${files.length} attachments`);
                window.currentInvoiceAttachments = files;
                renderAttachments(files);
                updateAttachmentBadge(files.length);
            } else {
                console.warn("⚠️ Failed to load attachments:", data.error);
                renderAttachments([]);
            }
        })
        .catch(error => {
            console.error("❌ Error loading attachments:", error);
            renderAttachments([]);
        });
}

function renderAttachments(files) {
    console.log("📎 Rendering attachments:", files);
    const filesList = document.getElementById('filesList');
    const fileCount = document.getElementById('fileCount');
    const uploadCard = document.getElementById('uploadCard');
    const uploadBtn = document.getElementById('uploadBtn');

    if (!filesList) {
        console.error("❌ filesList element not found!");
        return;
    }
    window.currentInvoiceAttachments = files;
    const currentCount = files.length;
    const isFull = currentCount >= MAX_ATTACHMENTS;

    if (fileCount) fileCount.textContent = `${currentCount} / ${MAX_ATTACHMENTS} files`;
    if (uploadCard) {
        uploadCard.style.opacity = isFull ? '0.5' : '1';
        uploadCard.style.pointerEvents = isFull ? 'none' : 'auto';
        uploadCard.setAttribute('title', isFull ? 'Maximum files reached' : 'Click or drag to upload');
    }
    if (uploadBtn) {
        uploadBtn.disabled = isFull;
        uploadBtn.style.opacity = isFull ? '0.5' : '1';
        uploadBtn.setAttribute('title', isFull ? 'Maximum files reached' : 'Upload file');
    }

    if (!files || files.length === 0) {
        filesList.innerHTML = '<div class="no-files"><i class="fa-regular fa-folder-open"></i><p>No files attached yet</p></div>';
        updateAttachmentBadge(0);
        return;
    }

    let html = '';
    files.forEach(file => {
        const ext = file.filename ? file.filename.split('.').pop().toLowerCase() : '';
        const icon = getFileIcon(ext);
        const iconClass = getFileIconClass(ext);
        const size = formatFileSize(file.size || 0);
        const uploadDate = file.uploaded_at ? new Date(file.uploaded_at).toLocaleString() : 'Unknown date';
        html += `<div class="file-item" data-id="${file.id}"><div class="file-info"><div class="file-icon ${iconClass}"><i class="fa-solid ${icon}"></i></div><div class="file-details"><div class="file-name">${escapeHtml(file.filename || 'Unknown file')}</div><div class="file-meta"><span><i class="fa-regular fa-file"></i> ${size}</span><span><i class="fa-regular fa-calendar"></i> ${uploadDate}</span></div></div></div><div class="file-actions"><button class="btn-action btn-view" onclick="viewAttachment('${file.id}')" title="View"><i class="fa-regular fa-eye"></i></button><button class="btn-action btn-download" onclick="downloadAttachment('${file.id}')" title="Download"><i class="fa-solid fa-cloud-arrow-down"></i></button><button class="btn-action btn-delete" onclick="deleteAttachment('${file.id}')" title="Delete"><i class="fa-solid fa-trash-can"></i></button></div></div>`;
    });
    filesList.innerHTML = html;
    updateAttachmentBadge(files.length);
    console.log(`✅ Rendered ${files.length} attachments`);
}

function updateAttachmentBadge(count) {
    const tab = document.querySelector('.tab[data-tab="attachments"]');
    if (!tab) return;
    const existingBadge = tab.querySelector('.attachment-badge');
    if (existingBadge) existingBadge.remove();
    if (count > 0) {
        const badge = document.createElement('span');
        badge.className = 'attachment-badge';
        badge.textContent = count;
        tab.appendChild(badge);
    }
}

function getFileIcon(ext) {
    const icons = { 'pdf': 'fa-file-pdf', 'doc': 'fa-file-word', 'docx': 'fa-file-word', 'xls': 'fa-file-excel', 'xlsx': 'fa-file-excel', 'jpg': 'fa-file-image', 'jpeg': 'fa-file-image', 'png': 'fa-file-image' };
    return icons[ext] || 'fa-file';
}

function getFileIconClass(ext) {
    const classes = { 'pdf': 'pdf', 'doc': 'doc', 'docx': 'doc', 'xls': 'xls', 'xlsx': 'xls', 'jpg': 'jpg', 'jpeg': 'jpg', 'png': 'png' };
    return classes[ext] || 'default';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

window.viewAttachment = function(id) {
    const invoiceId = document.getElementById('invoiceId').value;
    window.open(`/api/invoice/${invoiceId}/attachments/${id}/download`, '_blank');
};

window.downloadAttachment = function(id) {
    const invoiceId = document.getElementById('invoiceId').value;
    window.location.href = `/api/invoice/${invoiceId}/attachments/${id}/download`;
};

window.deleteAttachment = async function(id) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    const invoiceId = document.getElementById('invoiceId').value;
    try {
        const response = await fetch(`/api/invoice/${invoiceId}/attachments/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            const fileItem = document.querySelector(`.file-item[data-id="${id}"]`);
            if (fileItem) fileItem.remove();
            const fileCount = document.getElementById('fileCount');
            if (fileCount) {
                const currentCount = parseInt(fileCount.textContent) || 0;
                fileCount.textContent = Math.max(0, currentCount - 1) + ' files';
            }
            const invoiceIdElem = document.getElementById('invoiceId')?.value;
            if (invoiceIdElem) loadAttachmentsForInvoice(invoiceIdElem);
            showToast('✅ File deleted successfully', 'success');
        } else {
            showToast('Delete failed: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error deleting attachment:', error);
        showToast('Delete failed. Please try again.', 'error');
    }
};

// ===================================================
// AUTO-FILL INVOICE FROM SALES ORDER
// ===================================================
function initializeSalesOrderAutoFill() {
    const salesOrderSelect = document.getElementById('saleOrderRef');
    const paymentMethodSelect = document.getElementById('paymentMethod');
    const currencySelect = document.getElementById('currency');
    
    if (!salesOrderSelect) {
        console.error("❌ Sales Order select element not found");
        return;
    }
    console.log("✅ Sales Order auto-fill ready");

    salesOrderSelect.addEventListener('change', function() {
        const soId = this.value;
        if (!soId) {
            clearPaymentDetails();
            if (paymentMethodSelect) paymentMethodSelect.disabled = true;
            if (currencySelect) currencySelect.disabled = true;
            const amountPaidInput = document.getElementById('amountPaid');
            if (amountPaidInput) {
                amountPaidInput.disabled = true;
                amountPaidInput.value = '0';
                const hiddenAmtPaid = document.getElementById('amtPaid');
                if (hiddenAmtPaid) hiddenAmtPaid.value = '0';
            }
            return;
        }
        console.log(`📦 Loading sales order: ${soId}`);
        fetch(`/get-sales-order/${soId}`)
            .then(response => {
                if (!response.ok) throw new Error('Network response failed');
                return response.json();
            })
            .then(data => {
                console.log("📦 Sales order data loaded:", data);
                if (data && Object.keys(data).length > 0) {
                    fillCustomerInfo(data);
                    fillCustomerRef(data);
                    fillPaymentDetails(data);
                    fillInvoiceItems(data);
                    fillOrderSummary(data);
                    refreshPaymentStatusWithOverdue();
                    fillDates(data);
                    const amountPaidInput = document.getElementById('amountPaid');
                    if (amountPaidInput) {
                        amountPaidInput.disabled = false;
                        amountPaidInput.value = '0';
                        const hiddenAmtPaid = document.getElementById('amtPaid');
                        if (hiddenAmtPaid) hiddenAmtPaid.value = '0';
                    }
                    if (paymentMethodSelect) paymentMethodSelect.disabled = false;
                    if (currencySelect) currencySelect.disabled = false;
                    calculateTotals();
                    if (window.checkAllFields) window.checkAllFields();
                    showToast('Sales order loaded successfully', 'success');
                } else {
                    showToast('Sales order data not found', 'error');
                }
            })
            .catch(error => {
                console.error("❌ Error:", error);
                showToast('Failed to load sales order', 'error');
            });
    });
}

function fillCustomerInfo(data) {
    const customerName = document.getElementById('customerName');
    if (customerName && data.customer_name) {
        customerName.value = data.customer_name;
        fetchCustomerPaymentTerms(data.customer_name);
        console.log("✅ Customer Name:", data.customer_name);
    }
    const customerId = document.getElementById('customerId');
    if (customerId && data.customer_id) customerId.value = data.customer_id;
    const billingAddress = document.getElementById('billingAddress');
    if (billingAddress && data.billing_address) billingAddress.value = data.billing_address;
    const shippingAddress = document.getElementById('shippingAddress');
    if (shippingAddress) shippingAddress.value = data.shipping_address || data.billing_address || '';
    const email = document.getElementById('email');
    if (email && data.email) email.value = data.email;
    const phone = document.getElementById('phone');
    if (phone && data.phone) phone.value = data.phone;
    const contactPerson = document.getElementById('contactPerson');
    if (contactPerson) contactPerson.value = data.contact_person || data.sales_rep || '';
}

function fillCustomerRef(data) {
    const customerRef = document.getElementById('customerRefNo');
    if (customerRef && data.customer_ref) customerRef.value = data.customer_ref;
}

function fillPaymentDetails(data) {
    const paymentMethod = document.getElementById('paymentMethod');
    if (paymentMethod && data.payment_method) {
        let optionExists = false;
        for (let opt of paymentMethod.options) {
            if (opt.value === data.payment_method) {
                optionExists = true;
                paymentMethod.value = data.payment_method;
                break;
            }
        }
        if (!optionExists) {
            const option = document.createElement('option');
            option.value = data.payment_method;
            option.text = data.payment_method;
            option.selected = true;
            paymentMethod.appendChild(option);
        }
        console.log("✅ Payment Method:", data.payment_method);
        paymentMethod.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const currency = document.getElementById('currency');
    if (currency && data.currency) {
        let optionExists = false;
        for (let opt of currency.options) {
            if (opt.value === data.currency) {
                optionExists = true;
                currency.value = data.currency;
                break;
            }
        }
        if (!optionExists) {
            const option = document.createElement('option');
            option.value = data.currency;
            option.text = data.currency;
            option.selected = true;
            currency.appendChild(option);
        }
        console.log("✅ Currency:", data.currency);
    }
    const paymentStatus = document.getElementById('paymentStatus');
    if (paymentStatus) paymentStatus.value = 'Pending';
}

function fillInvoiceItems(data) {
    if (!data.items || data.items.length === 0) {
        console.log("📦 No items to display");
        document.getElementById('itemsData').value = '';
        return;
    }
    console.log(`📦 Loading ${data.items.length} items`);
    const itemsTableBody = document.getElementById('itemsTableBody');
    if (!itemsTableBody) return;
    itemsTableBody.innerHTML = '';
    const itemsForJSON = [];
    data.items.forEach((item, index) => {
        const row = document.createElement('tr');
        const productName = item.product_name || '';
        const productId = item.product_id || '';
        const quantity = item.qty || item.quantity || 0;
        const uom = item.uom || item.unit_of_measure || '';
        const unitPrice = item.price || item.unit_price || 0;
        const taxPct = item.tax_pct || item.tax_percentage || 0;
        const discPct = item.disc_pct || item.discount || 0;
        const subtotal = quantity * unitPrice;
        const taxAmount = subtotal * (taxPct / 100);
        const discountAmount = subtotal * (discPct / 100);
        const total = subtotal + taxAmount - discountAmount;
        row.innerHTML = `<td class="item-sn">${index + 1}</td><td class="product-name">${escapeHtml(productName)}</td><td class="product-id">${escapeHtml(productId)}</td><td class="quantity">${quantity}</td><td class="uom">${escapeHtml(uom)}</td><td class="unit-price">${formatCurrency(unitPrice)}</td><td class="tax-pct">${taxPct}</td><td class="disc-pct">${discPct}</td><td class="total">${formatCurrency(total)}</td>`;
        itemsTableBody.appendChild(row);
        itemsForJSON.push({ product_name: productName, product_id: productId, quantity: quantity, uom: uom, unit_price: unitPrice, tax_pct: taxPct, disc_pct: discPct });
    });
    document.getElementById('itemsData').value = JSON.stringify(itemsForJSON);
    console.log(`✅ Added ${data.items.length} items to invoice`);
}

function fillOrderSummary(data) {
    const summaryFields = { 'Sub Total': data.subtotal || 0, 'Global Discount (%)': data.global_discount || 0, 'Tax Summary': data.tax_total || 0, 'Shipping Charges': data.shipping_charges || 0, 'Rounding Adjustment': data.rounding || 0, 'Grand Total': data.grand_total || 0, 'Balance Due': data.grand_total || 0 };
    const totalsDiv = document.getElementById('tax_total');
    if (!totalsDiv) return;
    const summaryDivs = totalsDiv.querySelectorAll('div');
    summaryDivs.forEach(div => {
        const span = div.querySelector('span:first-child');
        if (!span) return;
        const label = span.textContent.trim();
        const valueSpan = div.querySelector('span:last-child');
        if (!valueSpan) return;
        if (summaryFields.hasOwnProperty(label)) valueSpan.textContent = formatCurrency(summaryFields[label]);
    });
    console.log("✅ Order summary updated");
}

function fillDates(data) {
    const invoiceDate = document.getElementById('invoiceDate');
    if (invoiceDate) {
        const today = new Date().toISOString().split('T')[0];
        invoiceDate.value = today;
    }
    const dueDate = document.getElementById('dueDate');
    if (dueDate && data.due_date) dueDate.value = data.due_date;
}

// ===================================================
// PAYMENT STATUS & BALANCE DUE LOGIC (WITH OVERDUE)
// ===================================================

function updatePaymentStatusWithOverdue(grandTotal, paid, dueDate) {
    const paymentStatusField = document.getElementById('paymentStatus');
    const statusField = document.getElementById('invoiceStatus');
    if (!paymentStatusField) return;
    let status = 'Unpaid';
    if (paid > 0 && grandTotal > 0 && paid >= grandTotal) {
        status = 'Paid';
        if (statusField && statusField.value !== 'Paid') {
            statusField.value = 'Paid';
            updateStatusBadge({ status: 'Paid', due_date: dueDate, payment_status: 'Paid' });
        }
    } else if (paid > 0 && paid < grandTotal) {
        status = 'Partial';
    } else if (paid === 0 && dueDate && dueDate < new Date().toISOString().split('T')[0]) {
        status = 'Unpaid';
        if (statusField && statusField.value !== 'Paid' && statusField.value !== 'Cancelled') {
            statusField.value = 'Overdue';
            updateStatusBadge({ status: 'Overdue', due_date: dueDate, payment_status: 'Unpaid' });
            showOverdueWarning(dueDate);
        }
    } else if (paid === 0) {
        status = 'Unpaid';
    }
    if (paymentStatusField.tagName === 'INPUT') {
        paymentStatusField.value = status;
    } else {
        paymentStatusField.textContent = status;
    }
    return status;
}

function refreshPaymentStatusWithOverdue() {
    const amountPaidInput = document.getElementById('amountPaid');
    const grandTotalElement = document.querySelector('.grand-total span:last-child');
    const dueDateInput = document.getElementById('dueDate');
    if (!grandTotalElement || !amountPaidInput) return;
    const grandTotal = parseFloat(grandTotalElement.textContent) || 0;
    const paid = parseFloat(amountPaidInput.value) || 0;
    const dueDate = dueDateInput ? dueDateInput.value : null;
    updatePaymentStatusWithOverdue(grandTotal, paid, dueDate);
    const transactionDateInput = document.getElementById('transactionDate');
    if (transactionDateInput) {
        if (paid > 0) {
            const today = new Date().toISOString().split('T')[0];
            transactionDateInput.value = today;
        } else {
            transactionDateInput.value = '';
        }
    }
}

function initializePaymentTracking() {
    const amountPaidInput = document.getElementById('amountPaid');
    const dueDateInput = document.getElementById('dueDate');
    const grandTotalElement = document.querySelector('.grand-total span:last-child');
    const hiddenAmtPaid = document.getElementById('amtPaid');
    if (!amountPaidInput || !grandTotalElement) return;
    if (hiddenAmtPaid) {
        amountPaidInput.addEventListener('input', function() { hiddenAmtPaid.value = this.value; });
        hiddenAmtPaid.value = amountPaidInput.value;
    }
    function validateAndUpdateOverdue() {
        const grandTotalText = grandTotalElement.textContent || '0';
        const grandTotal = parseFloat(grandTotalText.replace(/[^\d.-]/g, '')) || 0;
        let amountPaid = parseFloat(amountPaidInput.value) || 0;
        if (amountPaid > grandTotal) {
            showToast(`Amount Paid cannot exceed Grand Total (${grandTotal})`, 'warning');
            amountPaidInput.value = '';
            amountPaid = 0;
        }
        refreshPaymentStatusWithOverdue();
        calculateTotals();
        if (dueDateInput && amountPaid > 0 && amountPaid >= grandTotal) {
            const statusField = document.getElementById('invoiceStatus');
            if (statusField && statusField.value === 'Overdue') {
                statusField.value = 'Paid';
                updateStatusBadge({ status: 'Paid', due_date: dueDateInput.value, payment_status: 'Paid' });
                const warningDiv = document.querySelector('.overdue-warning');
                if (warningDiv) warningDiv.remove();
                showToast('Invoice marked as Paid and is no longer overdue!', 'success');
            }
        }
    }
    amountPaidInput.addEventListener('input', validateAndUpdateOverdue);
    amountPaidInput.addEventListener('blur', validateAndUpdateOverdue);
    if (dueDateInput) dueDateInput.addEventListener('change', refreshPaymentStatusWithOverdue);
}

function refreshPaymentStatus() {
    const amountPaidInput = document.getElementById('amountPaid');
    const grandTotalElement = document.querySelector('.grand-total span:last-child');
    if (!grandTotalElement || !amountPaidInput) return;
    const grandTotal = parseFloat(grandTotalElement.textContent) || 0;
    const paid = parseFloat(amountPaidInput.value) || 0;
    updatePaymentStatus(grandTotal, paid);
    const transactionDateInput = document.getElementById('transactionDate');
    if (transactionDateInput) {
        if (paid > 0) {
            const today = new Date().toISOString().split('T')[0];
            transactionDateInput.value = today;
        } else {
            transactionDateInput.value = '';
        }
    }
}

function updatePaymentStatus(grandTotal, paid) {
    const paymentStatusField = document.getElementById('paymentStatus');
    if (!paymentStatusField) return;
    let status = 'Unpaid';
    if (paid > 0 && grandTotal > 0 && paid >= grandTotal) status = 'Paid';
    else if (paid > 0 && paid < grandTotal) status = 'Partial';
    else if (paid === 0) status = 'Unpaid';
    if (paymentStatusField.tagName === 'INPUT') {
        paymentStatusField.value = status;
    } else {
        paymentStatusField.textContent = status;
    }
}

// ===================================================
// PAYMENT REFERENCE LOGIC
// ===================================================
function initializePaymentRefLogic() {
    const paymentMethodSelect = document.getElementById('paymentMethod');
    const paymentRefInput = document.getElementById('paymentRefNo');
    if (!paymentMethodSelect || !paymentRefInput) return;
    paymentRefInput.maxLength = 30;
    paymentRefInput.addEventListener('input', function(e) {
        const pattern = /^[A-Za-z0-9\-\/]*$/;
        const val = this.value;
        if (!pattern.test(val)) {
            this.value = val.slice(0, -1);
            showToast('Only letters, numbers, hyphen (-) and slash (/) allowed', 'warning');
        }
    });
    paymentRefInput.addEventListener('blur', function() { this.value = this.value.trim(); });
    function togglePaymentRef() {
        const method = paymentMethodSelect.value;
        if (method === 'Cash' || method === '') {
            paymentRefInput.disabled = true;
            paymentRefInput.value = '';
            paymentRefInput.required = false;
        } else {
            paymentRefInput.disabled = false;
            paymentRefInput.required = true;
        }
        if (window.checkAllFields) window.checkAllFields();
    }
    paymentMethodSelect.addEventListener('change', togglePaymentRef);
    togglePaymentRef();
    window.togglePaymentRef = togglePaymentRef;
}

// ===================================================
// PAYMENT TERMS FROM CUSTOMER MASTER
// ===================================================
function loadPaymentTerms() {
    const paymentTermList = document.getElementById('paymentTermList');
    if (!paymentTermList) return;
    fetch('/api/payment-terms')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.terms.length > 0) {
                paymentTermList.innerHTML = '';
                data.terms.forEach(term => {
                    const item = document.createElement('div');
                    item.className = 'dropdown-item';
                    item.setAttribute('data-value', term);
                    item.textContent = term;
                    item.onclick = function() { selectPaymentTerm(this); };
                    paymentTermList.appendChild(item);
                });
            } else {
                paymentTermList.innerHTML = '<div class="dropdown-item">No terms found</div>';
            }
        })
        .catch(err => {
            console.error('Error loading payment terms:', err);
            paymentTermList.innerHTML = '<div class="dropdown-item">Error loading terms</div>';
        });
}

function fetchCustomerPaymentTerms(customerName) {
    if (!customerName) return;
    fetch(`/api/customer-by-name/${encodeURIComponent(customerName)}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.customer && data.customer.paymentTerms) {
                const term = data.customer.paymentTerms;
                const hiddenInput = document.getElementById('paymentTerms');
                hiddenInput.value = term;
                document.getElementById('paymentTermSelected').textContent = term;
                recalculateDueDate();
            }
        })
        .catch(err => console.error('Error fetching customer:', err));
}

function recalculateDueDate() {
    const invoiceDateInput = document.getElementById('invoiceDate');
    const paymentTermsHidden = document.getElementById('paymentTerms');
    const dueDateInput = document.getElementById('dueDate');
    if (!invoiceDateInput || !paymentTermsHidden || !dueDateInput) return;
    const invoiceDateStr = invoiceDateInput.value;
    const term = paymentTermsHidden.value;
    if (!invoiceDateStr || !term) return;
    const days = parseInt(term.replace(/\D/g, ''), 10);
    if (isNaN(days) || days <= 0) return;
    const invoiceDate = new Date(invoiceDateStr);
    invoiceDate.setDate(invoiceDate.getDate() + days);
    dueDateInput.value = invoiceDate.toISOString().split('T')[0];
    refreshPaymentStatusWithOverdue();
}

// ===================================================
// BUTTON STATE BASED ON STATUS
// ===================================================
function setButtonStateByStatus(status) {
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const submitBtn = document.getElementById('submitInvoiceBtn');
    const cancelInvoiceBtn = document.getElementById('cancelInvoiceBtn');
    const markAsPaidBtn = document.getElementById('markAsPaid');
    const pdfAction = document.getElementById('pdfAction');
    const emailAction = document.getElementById('emailAction');
    const addCommentBtn = document.getElementById('addCommentBtn');
    const invoiceReturnBtn = document.getElementById('invoiceReturnBtn');   // 👈 add this line
    const statusLower = status.toLowerCase();
    if (saveDraftBtn) saveDraftBtn.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    if (cancelInvoiceBtn) cancelInvoiceBtn.disabled = true;
    if (markAsPaidBtn) markAsPaidBtn.disabled = true;
    if (pdfAction) pdfAction.classList.add('disabled');
    if (emailAction) emailAction.classList.add('disabled');
    if (addCommentBtn) addCommentBtn.disabled = true;
    switch(statusLower) {
        case 'draft':
            if (saveDraftBtn) saveDraftBtn.disabled = false;
            if (addCommentBtn) {
                const commentInput = document.getElementById('commentText');
                addCommentBtn.disabled = !commentInput || commentInput.value.trim() === '';
            }
            break;
        case 'send':
            if (cancelInvoiceBtn) cancelInvoiceBtn.disabled = false;
            if (markAsPaidBtn) markAsPaidBtn.disabled = false;
            if (pdfAction) pdfAction.classList.remove('disabled');
            if (emailAction) emailAction.classList.remove('disabled');
            if (addCommentBtn) {
                const commentInput = document.getElementById('commentText');
                addCommentBtn.disabled = !commentInput || commentInput.value.trim() === '';
            }
            break;
        case 'overdue':
            if (cancelInvoiceBtn) cancelInvoiceBtn.disabled = true;
            if (markAsPaidBtn) markAsPaidBtn.disabled = false;
            if (pdfAction) pdfAction.classList.remove('disabled');
            if (emailAction) emailAction.classList.remove('disabled');
            if (addCommentBtn) {
                const commentInput = document.getElementById('commentText');
                addCommentBtn.disabled = !commentInput || commentInput.value.trim() === '';
            }
            break;
        case 'paid':
            if (cancelInvoiceBtn) cancelInvoiceBtn.disabled = false;
            if (pdfAction) pdfAction.classList.remove('disabled');
            if (emailAction) emailAction.classList.remove('disabled');
            break;
        case 'cancelled':
            if (pdfAction) pdfAction.classList.remove('disabled');
            if (emailAction) emailAction.classList.remove('disabled');
            break;
        default:
            break;
    }


     // Enable Invoice Return button for allowed statuses
    if (invoiceReturnBtn) {
        const allowedStatuses = ['send', 'paid', 'overdue'];   // adjust as needed
        invoiceReturnBtn.disabled = !allowedStatuses.includes(status.toLowerCase());
        // window.location.href="/new-invoice-return";
    }
}




// ===================================================
// MAKE FORM READ-ONLY
// ===================================================
function makeFormReadOnly() {
    const form = document.getElementById('invoiceForm');
    if (!form) return;
    const elements = form.querySelectorAll('input:not([type="hidden"]), select, textarea');
    elements.forEach(el => {
        el.disabled = true;
        el.readOnly = true;
    });
    const addItemBtn = document.querySelector('.add-item-btn');
    if (addItemBtn) addItemBtn.disabled = true;
    const removeItemBtns = document.querySelectorAll('.remove-item-btn');
    removeItemBtns.forEach(btn => btn.disabled = true);
}

// ===================================================
// HELPER FUNCTIONS
// ===================================================
function formatCurrency(value) {
    const num = parseFloat(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function cleanNumeric(str) {
    if (str === undefined || str === null) return 0;
    const cleaned = str.toString().replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

function clearPaymentDetails() {
    const paymentMethod = document.getElementById('paymentMethod');
    if (paymentMethod) paymentMethod.value = '';
    const currency = document.getElementById('currency');
    if (currency) currency.value = '';
    const paymentRef = document.getElementById('paymentRefNo');
    if (paymentRef) {
        paymentRef.value = '';
        paymentRef.disabled = true;
    }
    const paymentStatus = document.getElementById('paymentStatus');
    if (paymentStatus) paymentStatus.value = '';
    const amountPaidInput = document.getElementById('amountPaid');
    if (amountPaidInput) {
        amountPaidInput.value = '0';
        const hiddenAmtPaid = document.getElementById('amtPaid');
        if (hiddenAmtPaid) hiddenAmtPaid.value = '0';
    }
    if (window.togglePaymentRef) window.togglePaymentRef();
}

function loadSaleOrders() {
    const list = document.getElementById('saleOrderList');
    if (!list) return;
    fetch('/api/sales-orders')
        .then(res => res.json())
        .then(data => {
            if (!data.success) return;
            list.innerHTML = '';
            data.orders.forEach(order => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.setAttribute('data-value', order.so_id);
                item.textContent = `${order.so_id} - ${order.customer_name}`;
                item.onclick = function () { selectSaleOrder(this); };
                list.appendChild(item);
            });
        })
        .catch(err => { console.error("Error loading sales orders:", err); });
}

// ===================================================
// INVOICE SUMMARY CALCULATIONS
// ===================================================
function updateInvoiceSummary(subTotal, taxTotal, shipping, rounding, grandTotal, balanceDue) {
    const totalsDiv = document.getElementById("tax_total");
    if (!totalsDiv) return;
    const subTotalInput = document.getElementById("subTotalInput");
    if (subTotalInput) subTotalInput.value = subTotal.toFixed(2);
    const taxTotalInput = document.getElementById("taxTotalInput");
    if (taxTotalInput) taxTotalInput.value = taxTotal.toFixed(2);
    const grandTotalInput = document.getElementById("grandTotalInput");
    if (grandTotalInput) grandTotalInput.value = grandTotal.toFixed(2);
    const balanceDueInput = document.getElementById("balanceDueInput");
    if (balanceDueInput) balanceDueInput.value = balanceDue.toFixed(2);
    const subTotalSpan = totalsDiv.querySelector('div:first-child span:last-child');
    if (subTotalSpan) subTotalSpan.textContent = subTotal.toFixed(2);
    const taxSpan = totalsDiv.querySelector('div:nth-child(3) span:last-child');
    if (taxSpan) taxSpan.textContent = taxTotal.toFixed(2);
    const shippingSpan = totalsDiv.querySelector('div:nth-child(4) span:last-child');
    if (shippingSpan) shippingSpan.textContent = shipping.toFixed(2);
    const roundingSpan = totalsDiv.querySelector('div:nth-child(5) span:last-child');
    if (roundingSpan) roundingSpan.textContent = rounding.toFixed(2);
    const grandTotalSpan = totalsDiv.querySelector('.grand-total span:last-child');
    if (grandTotalSpan) grandTotalSpan.textContent = grandTotal.toFixed(2);
    const balanceDueSpan = totalsDiv.querySelector('.grand-total:last-child span:last-child');
    if (balanceDueSpan) balanceDueSpan.textContent = balanceDue.toFixed(2);
}

function calculateTotals() {
    const rows = document.querySelectorAll("#itemsTableBody tr");
    let subTotal = 0;
    let taxTotal = 0;
    let grandTotalBeforeShipping = 0;
    rows.forEach(row => {
        const qty = cleanNumeric(row.querySelector(".quantity")?.textContent || 0);
        const unitPrice = cleanNumeric(row.querySelector(".unit-price")?.textContent || 0);
        const taxPct = cleanNumeric(row.querySelector(".tax-pct")?.textContent || 0);
        const discPct = cleanNumeric(row.querySelector(".disc-pct")?.textContent || 0);
        const lineTotal = qty * unitPrice;
        const discountAmount = lineTotal * (discPct / 100);
        const taxAmount = (lineTotal - discountAmount) * (taxPct / 100);
        subTotal += lineTotal;
        taxTotal += taxAmount;
        const lineTotalAfterDiscount = lineTotal - discountAmount + taxAmount;
        grandTotalBeforeShipping += lineTotalAfterDiscount;
        const totalCell = row.querySelector(".total");
        if (totalCell) totalCell.textContent = formatCurrency(lineTotalAfterDiscount);
    });
    const shipping = parseFloat(document.getElementById("shippingCharges")?.value || 0);
    const rounding = parseFloat(document.getElementById("roundingAdjustment")?.value || 0);
    const grandTotal = grandTotalBeforeShipping + shipping + rounding;
    const amountPaid = parseFloat(document.getElementById("amountPaid")?.value || 0);
    const balanceDue = grandTotal - amountPaid;
    updateInvoiceSummary(subTotal, taxTotal, shipping, rounding, grandTotal, balanceDue);
}

// ===================================================
// ADD ITEM ROW
// ===================================================
function addItemRow(item) {
    const itemsTableBody = document.getElementById('itemsTableBody');
    if (!itemsTableBody) return;
    const row = itemsTableBody.insertRow();
    const productName = item.product_name || '';
    const productId = item.product_id || '';
    const quantity = item.quantity || 0;
    const uom = item.uom || '';
    const unitPrice = item.unit_price || 0;
    const taxPct = item.tax_pct || 0;
    const discPct = item.disc_pct || 0;
    const total = item.total || (quantity * unitPrice * (1 - discPct/100) * (1 + taxPct/100));
    row.innerHTML = `<td class="item-sn">${itemsTableBody.rows.length}</td><td class="product-name">${escapeHtml(productName)}</td><td class="product-id">${escapeHtml(productId)}</td><td class="quantity">${quantity}</td><td class="uom">${escapeHtml(uom)}</td><td class="unit-price">${formatCurrency(unitPrice)}</td><td class="tax-pct">${taxPct}</td><td class="disc-pct">${discPct}</td><td class="total">${formatCurrency(total)}</td>`;
    updateItemsDataFromTable();
    calculateTotals();
}

function updateItemsDataFromTable() {
    const rows = document.querySelectorAll("#itemsTableBody tr");
    const items = [];
    rows.forEach(row => {
        items.push({
            product_name: row.querySelector(".product-name")?.innerText || "",
            product_id: row.querySelector(".product-id")?.innerText || "",
            quantity: cleanNumeric(row.querySelector(".quantity")?.innerText || 0),
            uom: row.querySelector(".uom")?.innerText || "",
            unit_price: cleanNumeric(row.querySelector(".unit-price")?.innerText || 0),
            tax_pct: cleanNumeric(row.querySelector(".tax-pct")?.innerText || 0),
            disc_pct: cleanNumeric(row.querySelector(".disc-pct")?.innerText || 0)
        });
    });
    document.getElementById("itemsData").value = JSON.stringify(items);
}

function updateSummaryDisplay() { calculateTotals(); }

// ===================================================
// UPDATE INVOICE STATUS (FIXED - Redirects to invoice list)
// ===================================================
async function updateInvoiceStatus(newStatus) {
    const invoiceId = document.getElementById('invoiceId').value;
    if (!invoiceId || invoiceId === 'Auto Generate') {
        showToast('Invoice ID not found', 'error');
        return;
    }
    try {
        const response = await fetch(`/api/invoice/${invoiceId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await response.json();
        if (data.success) {
            if (newStatus === 'Paid') {
                const paymentStatusField = document.getElementById('paymentStatus');
                if (paymentStatusField) {
                    if (paymentStatusField.tagName === 'INPUT') {
                        paymentStatusField.value = 'Paid';
                    } else {
                        paymentStatusField.textContent = 'Paid';
                    }
                }
                const warningDiv = document.querySelector('.overdue-warning');
                if (warningDiv) warningDiv.remove();
            }
            showToast(data.message, 'success');
            // FIXED: Correct redirect to invoice list
            setTimeout(() => {
                window.location.href = '/invoice-list';
            }, 1500);
        } else {
            showToast('Error: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error updating invoice status:', error);
        showToast('Failed to update invoice status', 'error');
    }
}

// ===================================================
// FORM SUBMISSION (UNIFIED)
// ===================================================
let _invoiceSaveInFlight = false;

function submitFormViaFetch(status) {
    if (_invoiceSaveInFlight) {
        return;
    }
    const form = document.getElementById('invoiceForm');
    if (!form) {
        console.error("Form not found");
        return;
    }
    calculateTotals();
    const rows = document.querySelectorAll("#itemsTableBody tr");
    if (rows.length === 0) {
        showToast("Please add at least one item to the invoice.", 'warning');
        return;
    }
    const items = [];
    rows.forEach(row => {
        items.push({
            product_name: row.querySelector(".product-name")?.innerText || "",
            product_id: row.querySelector(".product-id")?.innerText || "",
            quantity: cleanNumeric(row.querySelector(".quantity")?.innerText || 0),
            uom: row.querySelector(".uom")?.innerText || "",
            unit_price: cleanNumeric(row.querySelector(".unit-price")?.innerText || 0),
            tax_pct: cleanNumeric(row.querySelector(".tax-pct")?.innerText || 0),
            disc_pct: cleanNumeric(row.querySelector(".disc-pct")?.innerText || 0)
        });
    });

    document.getElementById("itemsData").value = JSON.stringify(items);
    const statusField = document.getElementById('invoiceStatus');
    if (statusField) statusField.value = status;
    const formData = new FormData(form);
    const isEditingExisting = isEditing;
    let url, method;
    if (isEditingExisting) {
        url = `/update-invoice/${document.getElementById('invoiceId').value}`;
        method = 'PUT';
    } else {
        url = form.action;
        method = 'POST';
    }
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const submitBtn = document.getElementById('submitInvoiceBtn');
    const activeBtn = status === 'Draft' ? saveDraftBtn : submitBtn;
    if (activeBtn) activeBtn.disabled = true;
    _invoiceSaveInFlight = true;
    fetch(url, { method: method, body: formData })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showToast(data.message, 'success');
                setTimeout(() => { window.location.href = '/invoice-list'; }, 1500);
            } else {
                showToast('Save failed: ' + (data.error || 'Unknown error'), 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('An error occurred while saving.', 'error');
        })
        .finally(() => {
            _invoiceSaveInFlight = false;
            if (activeBtn) activeBtn.disabled = false;
        });
}

// ===================================================
// LOAD EXISTING INVOICE
// ===================================================
const urlParams = new URLSearchParams(window.location.search);
const invoiceId = urlParams.get('invoice_id');
let isEditing = false;
let currentStatus = null;
// Inside loadInvoiceData, after setting currentStatus
// window.isEditable = currentStatus === 'draft';
async function loadInvoiceData(invoiceId) {
    console.log("🔍 loadInvoiceData called with ID:", invoiceId);
    try {
        const response = await fetch(`/api/invoice/${invoiceId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log("✅ API response received:", data);

        const inv = data.invoice;
        window.currentInvoiceData = inv;

        // ---- Helper to safely set element value ----
        function setElemValue(id, value) {
            const el = document.getElementById(id);
            if (el) {
                el.value = value ?? '';
                console.log(`  ✅ Set ${id} =`, value);
            } else {
                console.warn(`⚠️ Element with id "${id}" not found`);
            }
        }

        // ---- Populate basic fields ----
        setElemValue('invoiceId', inv.invoice_id);
        setElemValue('invoiceDate', inv.invoice_date);
        setElemValue('dueDate', inv.due_date);
        setElemValue('invoiceStatusDisplay', inv.status || '');
        setElemValue('customerName', inv.customer_name);
        setElemValue('paymentStatus', inv.payment_status);
        setElemValue('paymentMethod', inv.payment_method || '');
        setElemValue('currency', inv.currency || '');
        setElemValue('paymentRefNo', inv.payment_ref_no || '');
        setElemValue('transactionDate', inv.transaction_date || '');
        setElemValue('customerRefNo', inv.customer_ref_no || '');
        setElemValue('invoiceTags', inv.invoice_tags || '');
        setElemValue('termsConditions', inv.terms_conditions || '');
        setElemValue('billingAddress', inv.billing_address || '');
        setElemValue('shippingAddress', inv.shipping_address || '');
        setElemValue('email', inv.email || '');
        setElemValue('phone', inv.phone || '');
        setElemValue('contactPerson', inv.contact_person || '');
        setElemValue('saleOrderRef', inv.sale_order_ref || '');

        // Sale Order dropdown display
        const soSelected = document.getElementById('saleOrderSelected');
        if (soSelected) {
            soSelected.textContent = inv.sale_order_ref || 'Select Sales Order';
        }

        // Payment Terms
        if (inv.payment_terms) {
            const termDiv = document.getElementById('paymentTermSelected');
            if (termDiv) termDiv.textContent = inv.payment_terms;
            setElemValue('paymentTerms', inv.payment_terms);
        }

        // Status & badge
        const displayStatus = getDisplayStatus(inv);
        document.getElementById('invoiceStatus').value = displayStatus;
        const currentStatus = displayStatus.toLowerCase();
        window.isEditable = currentStatus === 'draft';
        console.log("📌 Current status:", displayStatus, " | Editable:", window.isEditable);

        updateStatusBadge({ status: displayStatus, due_date: inv.due_date, payment_status: inv.payment_status });
        if (displayStatus === 'Overdue') showOverdueWarning(inv.due_date);

        // PDF link
        const pdfLink = document.querySelector('#pdfAction a');
        if (pdfLink) pdfLink.href = `/invoice/${inv.invoice_id}/pdf`;

        // ---- Line items ----
        const tbody = document.getElementById('itemsTableBody');
        if (!tbody) {
            console.error("❌ itemsTableBody not found!");
        } else {
            tbody.innerHTML = '';
            if (data.items && data.items.length > 0) {
                console.log(`📦 Adding ${data.items.length} items`);
                data.items.forEach(item => addItemRow(item));
            } else {
                console.log("📦 No items in response");
            }
        }

        // ---- Summary ----
        const summary = data.summary || {};
        setElemValue('subTotalInput', summary.sub_total || 0);
        setElemValue('taxTotalInput', summary.tax_total || 0);
        setElemValue('grandTotalInput', summary.grand_total || 0);
        setElemValue('balanceDueInput', summary.balance_due || 0);
        setElemValue('shippingCharges', summary.shipping_charges || 0);
        setElemValue('roundingAdjustment', summary.rounding_adjustment || 0);
        setElemValue('amtPaid', summary.amount_paid || 0);
        setElemValue('globalDiscount', summary.global_discount || 0);

        function updateSummaryLine(label, value) {
            const totalsDiv = document.getElementById('tax_total');
            if (!totalsDiv) return;
            const divs = totalsDiv.querySelectorAll('div');
            for (let div of divs) {
                const span = div.querySelector('span:first-child');
                if (span && span.textContent.trim() === label) {
                    const valueSpan = div.querySelector('span:last-child');
                    if (valueSpan) valueSpan.textContent = formatCurrency(value);
                    break;
                }
            }
        }

        updateSummaryLine('Sub Total', summary.sub_total);
        updateSummaryLine('Global Discount (%)', summary.global_discount);
        updateSummaryLine('Tax Summary', summary.tax_total);
        updateSummaryLine('Shipping Charges', summary.shipping_charges);
        updateSummaryLine('Rounding Adjustment', summary.rounding_adjustment);
        updateSummaryLine('Grand Total', summary.grand_total);
        updateSummaryLine('Balance Due', summary.balance_due);

        // Amount Paid input
        const amountPaidInput = document.getElementById('amountPaid');
        if (amountPaidInput) amountPaidInput.value = summary.amount_paid || 0;

        // ---- Comments & Attachments ----
        const historyContainer = document.getElementById('history');
        if (historyContainer) {
            historyContainer.innerHTML = '';
            if (data.comments && data.comments.length > 0) {
                data.comments.forEach(comment => {
                    const div = document.createElement('div');
                    div.className = 'comment-item';
                    div.innerHTML = `<strong>${comment.date}</strong>: ${comment.text}`;
                    historyContainer.appendChild(div);
                });
            } else {
                historyContainer.innerHTML = '<div class="no-history-message">No history available.</div>';
            }
        }

        const filesList = document.getElementById('filesList');
        if (filesList) {
            filesList.innerHTML = '';
            if (data.attachments && data.attachments.length > 0) {
                data.attachments.forEach(file => {
                    const fileDiv = document.createElement('div');
                    fileDiv.className = 'file-item';
                    fileDiv.innerHTML = `<i class="fa-regular fa-file"></i><span class="file-name">${escapeHtml(file.name)}</span><span class="file-date">${file.date}</span><a href="${file.path}" target="_blank" class="file-download">Download</a>`;
                    filesList.appendChild(fileDiv);
                });
                const fileCountSpan = document.getElementById('fileCount');
                if (fileCountSpan) fileCountSpan.textContent = `${data.attachments.length} files`;
            } else {
                filesList.innerHTML = '<div class="no-files"><i class="fa-regular fa-folder-open"></i><p>No files attached yet</p></div>';
            }
        }

        // Title & buttons
        const titleEl = document.querySelector('.quotation-title');
        if (titleEl) titleEl.textContent = `Invoice`;
        document.title = `Invoice ${inv.invoice_id} - ${displayStatus}`;
        setButtonStateByStatus(displayStatus);

        // Make form read‑only if NOT draft
        if (currentStatus !== 'draft') makeFormReadOnly();

        isEditing = true;
        syncOverdueStatus(invoiceId);

        console.log("✅ loadInvoiceData completed successfully");
    } catch (error) {
        console.error("❌ Error in loadInvoiceData:", error);
        alert('Could not load invoice details. Check console for errors.');
    }
}

// ===================================================
// ADD CSS STYLES FOR OVERDUE
// ===================================================
function addOverdueStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
        .overdue-warning { animation: slideDown 0.3s ease-out; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        .badge-warning { background-color: #ffc107; color: #856404; font-weight: 600; }
        .text-overdue { color: #dc3545; font-weight: bold; }
        .overdue-tooltip { position: relative; cursor: help; }
        .overdue-tooltip:hover:after { content: "This invoice is past due date"; position: absolute; background: #333; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px; bottom: 100%; left: 50%; transform: translateX(-50%); white-space: nowrap; z-index: 1000; }
    `;
    document.head.appendChild(style);
}

// ===================================================
// OVERDUE MONITOR
// ===================================================
function startOverdueMonitor() {
    setInterval(() => {
        const invoiceId = document.getElementById('invoiceId')?.value;
        if (invoiceId && invoiceId !== 'Auto Generate') syncOverdueStatus(invoiceId);
    }, 300000);
}

// ===================================================
// MAIN INITIALIZATION
// ===================================================
document.addEventListener('DOMContentLoaded', function() {
    const amountPaidInput = document.getElementById('amountPaid');
    if (amountPaidInput) amountPaidInput.disabled = true;
    const paymentMethodSelect = document.getElementById('paymentMethod');
    const currencySelect = document.getElementById('currency');
    if (paymentMethodSelect) paymentMethodSelect.disabled = true;
    if (currencySelect) currencySelect.disabled = true;
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '/invoice-list';
        });
    } else {
        console.warn('Cancel button (id="cancelBtn") not found');
    }


    const invoiceReturnBtn = document.getElementById('invoiceReturnBtn');
if (invoiceReturnBtn) {
    invoiceReturnBtn.addEventListener('click', function() {
        const invoiceId = document.getElementById('invoiceId').value;
        if (invoiceId && invoiceId !== 'Auto Generate') {
            // Open the invoice return page with the invoice ID as a query parameter
            window.location.href = `/new-invoice-return?invoice_id=${invoiceId}`;
        } else {
            showToast('Please save the invoice first.', 'warning');
        }
    });
}
    const customerRefNo = document.getElementById('customerRefNo');
    if (customerRefNo) {
        customerRefNo.maxLength = 10;
        customerRefNo.addEventListener('input', function(e) {
            const pattern = /^[A-Za-z0-9\-\/]*$/;
            const val = this.value;
            if (!pattern.test(val)) {
                this.value = val.slice(0, -1);
                showToast('Only letters, numbers, hyphen (-) and slash (/) allowed', 'warning');
            }
        });
    }
    const termsField = document.getElementById('termsConditions');
    if (termsField) termsField.maxLength = 50;
    document.addEventListener('click', function(e) {
        const soDropdown = document.getElementById('saleOrderDropdown');
        const soSelected = document.getElementById('saleOrderSelected');
        if (soSelected && !soSelected.contains(e.target) && !soDropdown.contains(e.target)) soDropdown.style.display = 'none';
        const ptDropdown = document.getElementById('paymentTermDropdown');
        const ptSelected = document.getElementById('paymentTermSelected');
        if (ptSelected && !ptSelected.contains(e.target) && !ptDropdown.contains(e.target)) ptDropdown.style.display = 'none';
    });
    initializeTabs();
    initializeComments();
    initializeAttachments();
    initializeSalesOrderAutoFill();
    initializePaymentTracking();
    refreshPaymentStatus();
    initializePaymentRefLogic();
    loadPaymentTerms();
    loadSaleOrders();
    const invoiceDateInput = document.getElementById('invoiceDate');
    const paymentTermsHidden = document.getElementById('paymentTerms');
    if (invoiceDateInput) invoiceDateInput.addEventListener('change', recalculateDueDate);
    if (paymentTermsHidden) paymentTermsHidden.addEventListener('change', recalculateDueDate);
    const form = document.getElementById('invoiceForm');
    if (!form) {
        console.error('❌ Form with id "invoiceForm" not found. Check your HTML.');
        return;
    }
    window.checkAllFields = function() {
        const requiredFields = document.querySelectorAll('#invoiceForm [required]');
        let allFilled = true;
        requiredFields.forEach(field => {
            const val = field.value.trim();
            if (val === '') allFilled = false;
        });
        const itemRows = document.querySelectorAll('#itemsTableBody tr');
        if (itemRows.length === 0) allFilled = false;
        const submitBtn = document.getElementById('submitInvoiceBtn');
        if (submitBtn) submitBtn.disabled = !allFilled;
    };
    const allPossibleFields = document.querySelectorAll('#invoiceForm input, #invoiceForm select, #invoiceForm textarea');
    allPossibleFields.forEach(field => {
        field.addEventListener('input', window.checkAllFields);
        field.addEventListener('change', window.checkAllFields);
    });
    window.checkAllFields();
    const footerBtnRow = document.querySelector('.modal-footer-button');
    if (footerBtnRow) {
        footerBtnRow.addEventListener('click', function (e) {
            const btn = e.target && e.target.closest ? e.target.closest('button') : null;
            if (!btn || !footerBtnRow.contains(btn)) return;
            if (btn.id !== 'saveDraftBtn' && btn.id !== 'submitInvoiceBtn') return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (btn.id === 'submitInvoiceBtn' && btn.disabled) return;
            if (btn.id === 'saveDraftBtn') {
                submitFormViaFetch('Draft');
            } else {
                submitFormViaFetch('Send');
            }
        }, true);
    }
    if (invoiceId) {
        const markAsPaidBtn = document.getElementById('markAsPaid');
        const cancelInvoiceBtn = document.getElementById('cancelInvoiceBtn');
        if (markAsPaidBtn) markAsPaidBtn.addEventListener('click', () => updateInvoiceStatus('Paid'));
        if (cancelInvoiceBtn) cancelInvoiceBtn.addEventListener('click', () => updateInvoiceStatus('Cancelled'));
    }
    else {
    // New invoice – make dropdowns editable
    window.isEditable = true;
}
    calculateTotals();
    if (invoiceId) {
        loadInvoiceData(invoiceId);
    } else {
        setButtonStateByStatus('Draft');
    }
    addOverdueStyles();
    startOverdueMonitor();
    
    if (!invoiceId) {
        const dueDateField = document.getElementById('dueDate');
        const paymentStatusField = document.getElementById('paymentStatus');
        if (dueDateField) dueDateField.addEventListener('change', checkOverdueStatus);
        if (paymentStatusField) paymentStatusField.addEventListener('change', checkOverdueStatus);
        setTimeout(checkOverdueStatus, 500);
    }
    
    const emailAction = document.getElementById('emailAction');
    const emailModal = document.getElementById('emailModal');
    const closeModal = document.querySelector('.email-modal-close');
    const cancelEmailBtn = document.getElementById('cancelEmailBtn');
    const sendEmailBtn = document.getElementById('sendEmailBtn');
    const recipientEmailInput = document.getElementById('recipientEmail');
    const emailMessageTextarea = document.getElementById('emailMessage');
    function showEmailModal() {
        if (!emailModal) return;
        const invoiceIdElement = document.getElementById('invoiceId');
        if (invoiceIdElement && invoiceIdElement.value && invoiceIdElement.value !== 'Auto Generate') {
            const customerEmail = document.getElementById('email')?.value;
            if (customerEmail && recipientEmailInput) recipientEmailInput.value = customerEmail;
            emailModal.style.display = 'flex';
        } else {
            showToast('Please save the invoice first before sending email.', 'warning');
        }
    }
    function hideEmailModal() { if (emailModal) emailModal.style.display = 'none'; }
    if (emailAction && emailModal) {
        emailAction.removeEventListener('click', showEmailModal);
        emailAction.addEventListener('click', showEmailModal);
    }
    if (closeModal) closeModal.addEventListener('click', hideEmailModal);
    if (cancelEmailBtn) cancelEmailBtn.addEventListener('click', hideEmailModal);
    window.addEventListener('click', (e) => { if (e.target === emailModal) hideEmailModal(); });
    if (sendEmailBtn) {
        sendEmailBtn.addEventListener('click', async () => {
            const recipient = recipientEmailInput ? recipientEmailInput.value.trim() : '';
            if (!recipient) { showToast('Please enter a recipient email address.', 'warning'); return; }
            const invoiceIdElement = document.getElementById('invoiceId');
            if (!invoiceIdElement || !invoiceIdElement.value || invoiceIdElement.value === 'Auto Generate') {
                showToast('Invoice not saved yet. Please save the invoice first.', 'error');
                return;
            }
            const invoiceId = invoiceIdElement.value;
            const message = emailMessageTextarea ? emailMessageTextarea.value.trim() : '';
            sendEmailBtn.disabled = true;
            sendEmailBtn.textContent = 'Sending...';
            try {
                const response = await fetch(`/api/invoice/${invoiceId}/send-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: recipient, message: message })
                });
                const data = await response.json();
                if (data.success) {
                    showToast('Email send successfully!', 'success');
                    hideEmailModal();
                    if (recipientEmailInput) recipientEmailInput.value = '';
                    if (emailMessageTextarea) emailMessageTextarea.value = '';
                } else {
                    showToast('Failed to send email: ' + (data.error || 'Unknown error'), 'error');
                }
            } catch (error) {
                console.error(error);
                showToast('Error sending email. Please try again.', 'error');
            } finally {
                sendEmailBtn.disabled = false;
                sendEmailBtn.textContent = 'Send Email';
            }
        });
    }
});