// =========================
// GLOBAL STATE
// =========================
window.SNR_COMMENTS = [];
window.SNR_TEMP_ATTACHMENTS = [];   
window.SNR_ATTACHMENTS = [];

let selectedDeleteFileId = null;
let selectedTempFileIndex = null;

const params =
    new URLSearchParams(window.location.search);

const srnNo =
    params.get("srn");

const mode =
    params.get("mode");

// =========================
// INIT
// =========================
document.addEventListener("DOMContentLoaded", async () => {

    console.log("SRN =", srnNo);
    console.log("MODE =", mode);

    if (srnNo) {

        await loadExistingSRN(srnNo);

    }

    bindTabs();
    bindCommentSection();
    bindAttachmentSection();

    const pdfBtn =
        document.getElementById("pdfBtn");

    const emailBtn =
        document.getElementById("emailBtn");

        if(mode === "view"){

            pdfBtn?.classList.remove("icon-disabled");
            emailBtn?.classList.remove("icon-disabled");

            pdfBtn.disabled = false;
            emailBtn.disabled = false;

        }else{

            pdfBtn?.classList.add("icon-disabled");
            emailBtn?.classList.add("icon-disabled");

            pdfBtn.disabled = true;
            emailBtn.disabled = true;
        }

    const cancelOrderBtn =
    document.getElementById("cancelOrderBtn");

if(mode === "edit"){

    cancelOrderBtn.disabled = false;
    cancelOrderBtn.classList.remove("icon-disabled");

}else{

    cancelOrderBtn.disabled = true;
    cancelOrderBtn.classList.add("icon-disabled");
}
    initLoad();
});

// ==========================
// COMMENT AUTHOR NAME
// ==========================
function getCommentAuthorName() {

    // try global variable
    const name = window.LOGGED_IN_USER_NAME;

    if (name && typeof name === "string" && name.trim().length > 0) {
        return name.trim();
    }

    // fallback: try meta from DOM (NO extra HTML needed, just safety)
    const metaName = document.querySelector("meta[name='user-name']")?.content;

    if (metaName && metaName.trim()) {
        return metaName.trim();
    }

    return "User";
}

// =========================
// GLOBAL SAFE INIT
// =========================
document.addEventListener("DOMContentLoaded", () => {
    if (!window.LOGGED_IN_USER_NAME) {
        window.LOGGED_IN_USER_NAME = "User";
    }
});
// =========================
// TAB SWITCH
// =========================
function bindTabs() {

    document.querySelectorAll(".comment-tabs .tab").forEach(tab => {

        tab.addEventListener("click", () => {

            document.querySelectorAll(".comment-tabs .tab")
                .forEach(t => t.classList.remove("active"));

            document.querySelectorAll(".tab-content")
                .forEach(c => c.style.display = "none");

            tab.classList.add("active");

            const target = tab.dataset.tab;
            document.getElementById(target).style.display = "block";
        });
    });
}

// =========================
// COMMENT SECTION
// =========================
function bindCommentSection() {

    const textarea = document.getElementById("commentText");
    const btn = document.getElementById("addCommentBtn");

    if (!textarea || !btn) return;

    btn.disabled = true;

    textarea.addEventListener("input", () => {
        btn.disabled = textarea.value.trim() === "";
    });

    btn.addEventListener("click", async () => {

        const srn = getSRN();
        const text = textarea.value.trim();

        if (!text) return;

            window.SNR_COMMENTS.push({

                commented_by: getCommentAuthorName(),

                commented_at: new Date(),

                comment_text: text

            });

            textarea.value = "";

            btn.disabled = true;

            renderComments();

            renderHistory();

            showAlert("Comment added", "success");
    });
}

// =========================
// ATTACHMENT SECTION
// =========================
function bindAttachmentSection() {

    const uploadBtn = document.getElementById("uploadBtn");
    const fileInput = document.getElementById("fileInput");

    const uploadBox = document.getElementById("uploadBox");

    if (!uploadBtn || !fileInput) return;

    // click button OR box
    uploadBtn.addEventListener("click", () => fileInput.click());
    uploadBox.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async (e) => {

        const files = [...e.target.files];
        if (!files.length) return;

        files.forEach(file => {

        const tempObj = {
            file_obj: file,
            file_name: file.name,

            file_size:
                (file.size / 1024).toFixed(2) + " KB",

            uploaded_at:
                new Date().toLocaleString(
                    "en-IN",
                    {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                )
        };

            window.SNR_TEMP_ATTACHMENTS.push(tempObj);
        });

        renderTempFiles(); // UI show

        showAlert(
                `${files[0].name} selected`,
                "success"
            );

        fileInput.value = "";
    });
}

// =========================
// INIT LOAD
// =========================
async function initLoad() {

    const srn = getSRN();
    if (!srn) return;

    await loadComments();
    await loadAttachments();
}

// =========================
// SRN HELPER
// =========================
function getSRN() {
    return document.querySelector("[name='srn_no']")?.value;
}

// =========================
// COMMENTS LOAD
// =========================
async function loadComments() {

    const srn = getSRN();

    const res = await fetch(`/api/get-stock-return-comments/${srn}`);
    const data = await res.json();

    if (data.success) {
        window.SNR_COMMENTS = data.comments;
        renderComments();
        renderHistory();
    }
}

// =========================
// COMMENTS RENDER
// =========================
function renderComments() {

    const commentsContainer =
        document.getElementById("liveComments");

    const noCommentsMsg =
        document.getElementById("noCommentsMsg");

    if (!commentsContainer) return;

    commentsContainer.innerHTML = "";

    if (!window.SNR_COMMENTS.length) {

        noCommentsMsg.style.display = "block";

        return;
    }

    noCommentsMsg.style.display = "none";

    window.SNR_COMMENTS
        .slice()
        .reverse()
        .forEach(c => {

            commentsContainer.appendChild(
                createComment(c)
            );

        });
}

function renderHistory() {

    const box = document.getElementById("historyList");
    box.innerHTML = "";

    if (!window.SNR_COMMENTS.length) {
        box.innerHTML = "<p>No history</p>";
        return;
    }

    window.SNR_COMMENTS.slice().reverse().forEach(c => {
        box.appendChild(createComment(c));
    });
}

function createComment(c) {

    const div = document.createElement("div");
    div.className = "comment-item";

    div.innerHTML = `
        <div class="comment-header">
            <span class="comment-user">${c.commented_by}-</span>
            <span class="comment-date">
                ${new Date(c.commented_at).toLocaleString()}
            </span>
        </div>

        <div class="comment-text">
            ${c.comment_text}
        </div>
    `;

    return div;
}
// =========================
// FILE UPLOAD
// =========================
async function uploadFiles(files) {

    const srn = getSRN();

    for (const file of files) {

        window.SNR_TEMP_ATTACHMENTS.push({

            file_name: file.name,

            file_obj: file,

            file_size:
                (file.size / 1024).toFixed(2) + " KB",

            uploaded_at:
                new Date().toLocaleString(
                    "en-IN",
                    {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                )
        });
    }

    // 2. RENDER UI ONLY
    renderTempFiles();

    showAlert("Files selected", "success");
}

// =========================
// LOAD FILES
// =========================
async function loadAttachments() {

    const srn = getSRN();

    const res = await fetch(`/api/get-stock-return-files/${srn}`);
    const data = await res.json();

    if (data.success) {
        window.SNR_ATTACHMENTS = data.files;
        renderFiles();
    }
}

// =========================
// RENDER FILES
// =========================
function renderFiles() {

    const box = document.getElementById("filesList");

    box.innerHTML = "";

    if (!window.SNR_ATTACHMENTS.length) {

        box.innerHTML = "<p>No files</p>";
        return;
    }

    window.SNR_ATTACHMENTS.forEach(f => {

        const row = document.createElement("div");

        row.className = "attachment-row";

        row.innerHTML = `

            <div class="attachment-left">

                <div class="pdfs-icon">
                    <i class="fa-solid fa-file-pdf"></i>
                </div>

                <div class="attachment-info">

                    <div class="attachment-name">
                        ${f.file_name}
                    </div>

                    <div class="attachment-meta">
                        ${f.file_size}
                        &nbsp;&nbsp;
                        ${f.uploaded_at}
                    </div>

                </div>

            </div>

            <div class="attachment-actions">

                <button
                    class="view-file-btn"
                    data-url="${f.file_url}">
                    <i class="fa-solid fa-eye"></i>
                </button>

                <button
                    class="download-file-btn"
                    data-url="${f.file_url}">
                    <i class="fa-solid fa-download"></i>
                </button>

                <button
                    class="delete-file-btn"
                    data-id="${f.id}">
                    <i class="fa-solid fa-trash"></i>
                </button>

            </div>

        `;

        box.appendChild(row);

    });

document.getElementById("fileCount").innerText =
    `${window.SNR_ATTACHMENTS.length + window.SNR_TEMP_ATTACHMENTS.length} / 10 files`;

    updateAttachmentTabCount();
}

function renderTempFiles() {

    const box =
        document.getElementById("filesList");

    box.innerHTML = "";

    if (!window.SNR_TEMP_ATTACHMENTS.length) {

        box.innerHTML = "<p>No files</p>";
        return;
    }

    window.SNR_TEMP_ATTACHMENTS.forEach((file,index) => {

        const row =
            document.createElement("div");

        row.className =
            "attachment-row";

        row.innerHTML = `

        <div class="attachment-left">

            <div class="pdfs-icon">
                <i class="fa-solid fa-file-pdf"></i>
            </div>

            <div class="attachment-info">

                <div class="attachment-name">
                    ${file.file_name}
                </div>

                <div class="attachment-meta">

                    ${file.file_size}

                    &nbsp;&nbsp;

                    ${file.uploaded_at}

                </div>

            </div>

        </div>

        <div class="attachment-actions">

            <button
                class="view-temp-file-btn"
                data-index="${index}">
                <i class="fa-solid fa-eye"></i>
            </button>

            <button
                class="download-temp-file-btn"
                data-index="${index}">
                <i class="fa-solid fa-download"></i>
            </button>

            <button
                class="delete-temp-file-btn"
                data-index="${index}">
                <i class="fa-solid fa-trash"></i>
            </button>

        </div>
        `;

        box.appendChild(row);

    });

    document.getElementById("fileCount").innerText =
        `${window.SNR_ATTACHMENTS.length + window.SNR_TEMP_ATTACHMENTS.length} / 10 files`;
        updateAttachmentTabCount();
}

document.addEventListener("click", function(e){

    const btn = e.target.closest(".view-file-btn");

    if(!btn) return;

    const url = btn.dataset.url;

    window.open(url, "_blank");

});

document.addEventListener("click", function(e){

    const btn = e.target.closest(".download-file-btn");

    if(!btn) return;

    const url = btn.dataset.url;

    const a = document.createElement("a");

    a.href = url;

    a.download = "";

    document.body.appendChild(a);

    a.click();

    a.remove();

});

document.addEventListener("click", function(e){

    const btn = e.target.closest(".delete-file-btn");

    if(!btn) return;

    selectedDeleteFileId = btn.dataset.id;

    document.getElementById("deleteFileModal")
        .style.display = "flex";

});

// =========================
// VIEW TEMP FILE
// =========================

document.addEventListener("click", function(e){

    const btn =
        e.target.closest(".view-temp-file-btn");

    if(!btn) return;

    const file =
        window.SNR_TEMP_ATTACHMENTS[
            btn.dataset.index
        ];

    const url =
        URL.createObjectURL(file.file_obj);

    window.open(url, "_blank");
});

// =========================
// DOWNLOAD TEMP FILE
// =========================

document.addEventListener("click", function(e){

    const btn =
        e.target.closest(".download-temp-file-btn");

    if(!btn) return;

    const file =
        window.SNR_TEMP_ATTACHMENTS[
            btn.dataset.index
        ];

    const url =
        URL.createObjectURL(file.file_obj);

    const a =
        document.createElement("a");

    a.href = url;
    a.download = file.file_name;

    document.body.appendChild(a);

    a.click();

    a.remove();

    URL.revokeObjectURL(url);
});

// =========================
// DELETE TEMP FILE
// =========================

document.addEventListener("click", function(e){

    const btn =
        e.target.closest(".delete-temp-file-btn");

    if(!btn) return;

    selectedTempFileIndex =
        Number(btn.dataset.index);

    selectedDeleteFileId = null;

    document.getElementById("deleteFileModal")
        .style.display = "flex";

});

document.getElementById("cancelDeleteBtn")
.addEventListener("click", () => {

    selectedDeleteFileId = null;
    selectedTempFileIndex = null;

    document.getElementById("deleteFileModal")
        .style.display = "none";

});

document.getElementById("confirmDeleteBtn")
.addEventListener("click", async () => {

    // Permanent File Delete
    if(selectedDeleteFileId){

        const res = await fetch(
            `/api/delete-stock-return-file/${selectedDeleteFileId}`,
            {
                method: "DELETE"
            }
        );

        const data = await res.json();

        if(data.success){

            await loadAttachments();

            showAlert(
                "File deleted",
                "success"
            );
        }
    }

    // Temporary File Delete
    else if(selectedTempFileIndex !== null){

        window.SNR_TEMP_ATTACHMENTS.splice(
            selectedTempFileIndex,
            1
        );

        renderTempFiles();

        showAlert(
            "File removed",
            "success"
        );
    }

    document.getElementById("deleteFileModal")
        .style.display = "none";

    selectedDeleteFileId = null;
    selectedTempFileIndex = null;

});

function updateAttachmentTabCount() {

    const count =
        window.SNR_ATTACHMENTS.length +
        window.SNR_TEMP_ATTACHMENTS.length;

    const badge =
        document.getElementById("attachmentTabCount");

    if (badge) {
        badge.textContent = count;
    }
}

function showAlert(message, type = "error") {

    const alertBox =
        document.getElementById("topAlert");

    const alertMessage =
        document.getElementById("alertMessage");

    const alertIcon =
        alertBox.querySelector(".alert-icon");

    alertBox.classList.remove(
        "success",
        "error",
        "warning",
        "show"
    );

    alertBox.classList.add(type);

    if (type === "success") {
        alertIcon.textContent = "✔";
    } else {
        alertIcon.textContent = "✖";
    }

    alertMessage.textContent = message;

    alertBox.style.display = "flex";

    requestAnimationFrame(() => {
        alertBox.classList.add("show");
    });

    setTimeout(() => {

        alertBox.classList.remove("show");

        setTimeout(() => {
            alertBox.style.display = "none";
        }, 300);

    }, 3000);
}
document.addEventListener("DOMContentLoaded", function () {

    const commentText = document.getElementById("commentText");
    const addBtn = document.getElementById("addCommentBtn");

    function toggleButton() {
        const value = commentText.value.trim();

        if (value.length > 0) {
            addBtn.disabled = false;
            addBtn.classList.add("enabled");
        } else {
            addBtn.disabled = true;
            addBtn.classList.remove("enabled");
        }
    }

    // listen typing
    commentText.addEventListener("input", toggleButton);

    // initial state check
    toggleButton();

});


// =============================================
// PAGE LOAD
// =============================================

document.addEventListener("DOMContentLoaded", async function () {

    console.log("DOM Loaded");
     
    // =========================================
    // LOAD EXISTING SRN
    // =========================================

    if (srnNo) {

        await loadExistingSRN(srnNo);

    }
    

    // =========================================
    // TAB SWITCHING
    // =========================================

    document.querySelectorAll(".comment-tabs .tab").forEach(function (tab) {

        tab.addEventListener("click", function () {

            document.querySelectorAll(".comment-tabs .tab").forEach(function (t) {
                t.classList.remove("active");
            });

            document.querySelectorAll(".tab-content").forEach(function (panel) {
                panel.style.display = "none";
            });

            tab.classList.add("active");

            const target = tab.getAttribute("data-tab");
            const panel = document.getElementById(target);
            if (panel) panel.style.display = "block";
        });
    });
   

    // =========================================
// LOAD EXISTING SRN
// =========================================

async function loadExistingSRN(srnNo) {

    try {

        const res =
            await fetch(`/api/stock-return/${srnNo}`);

        const data =
            await res.json();

        console.log("SRN DATA =>", data);

    } catch (err) {

        console.error(err);
    }
}


    // =========================================
    // BUTTONS
    // =========================================

    const saveDraftBtn =
        document.getElementById("saveDraftBtn");

    const submitBtn =
        document.getElementById("submitBtn");

    const cancelOrderBtn =
        document.getElementById("cancelOrderBtn");

    const cancelBtn =
        document.getElementById("cancelBtn");

        
    if (saveDraftBtn) {

        saveDraftBtn.addEventListener("click", function (e) {

            e.preventDefault();

            console.log("Draft Clicked");

            saveStockReturn("Draft");
        });
    }

    if (submitBtn) {

        submitBtn.addEventListener("click", function (e) {

            e.preventDefault();

            console.log("Submit Clicked");

            saveStockReturn("Submitted");
        });
    }

    if (cancelOrderBtn) {

        cancelOrderBtn.addEventListener("click", function (e) {

            e.preventDefault();

            console.log("Cancel Order Clicked");

            saveStockReturn("Cancelled");
        });
    }

    if (cancelBtn) {

        cancelBtn.addEventListener("click", function (e) {

            e.preventDefault();

            window.location.href = "/stock-return";
        });
    }

// =========================================
// GET GRN
// =========================================

const urlParams =
    new URLSearchParams(window.location.search);

const grnId =
    urlParams.get("grn");

console.log("GRN ID:", grnId);

const dropdown =
    document.getElementById("grnInput");

const displayBox =
    document.getElementById("grnDisplay");

if (grnId) {

    dropdown.style.display = "none";

    displayBox.style.display = "block";

    displayBox.value = grnId;

} else if (!srnNo) {

    dropdown.style.display = "block";

    displayBox.style.display = "none";
       document.getElementById("statusBadge")
        .style.display = "none";

    await loadSubmittedGRNs();
}


// =========================================
// GENERATE SRN
// =========================================

// =========================================
// GENERATE SRN (NEW RECORD ONLY)
// =========================================

if (!srnNo) {

    try {

        const srnRes =
            await fetch("/api/generate-srn");

        const srnData =
            await srnRes.json();

        console.log("SRN:", srnData);

        if (srnData.success) {

            document.querySelector(
                "[name='srn_no']"
            ).value = srnData.srn_number || "";

        }

    } catch (err) {

        console.error(err);

        showAlert(
            "SRN Generate Failed",
            "error"
        );
    }

}



// =========================================
// CHECK GRN
// =========================================

if (grnId) {

    try {

        const response =
            await fetch(`/api/grn/${grnId}`);

        const data =
            await response.json();

        console.log("GRN DATA:", data);

            if (data.error) {
                return;
            }

        document.querySelector(
            "[name='po_reference']"
        ).value = data.header.po_number || "";

        document.querySelector(
            "[name='supplier_name']"
        ).value = data.header.supplier_name || "";

        document.querySelector(
            "[name='supplier_email']"
        ).value = data.header.supplier_email || "";

        document.querySelector(
            "[name='received_date']"
        ).value = data.header.received_date || "";

        const tbody =
            document.getElementById("lineItemsBody");

        tbody.innerHTML = "";

        data.items.forEach((item, index) => {

            tbody.insertAdjacentHTML(
                "beforeend",
                `
                <tr>
                    <td>${index + 1}</td>
                    ...
                </tr>
                `
            );
        });

        calculateSummary();

    } catch (err) {

        console.error(err);

        showAlert(
            "GRN Load Failed",
            "error"
        );
    }

} else {

    console.log("Direct Stock Return Mode");

    // LOAD SUBMITTED GRNS
    loadSubmittedGRNs();
}

    // =========================================
    // FETCH GRN
    // =========================================

    try {

        const response =
            await fetch(`/api/grn/${grnId}`);

        const data =
            await response.json();

        console.log("GRN DATA:", data);

            if (data.error) {
                return;
            }

        document.querySelector(
            "[name='po_reference']"
        ).value = data.header.po_number || "";

        document.querySelector(
            "[name='supplier_name']"
        ).value = data.header.supplier_name || "";

        document.querySelector(
            "[name='supplier_email']"
        ).value = data.header.supplier_email || "";

        document.querySelector(
            "[name='received_date']"
        ).value = data.header.received_date || "";

        const tbody =
            document.getElementById("lineItemsBody");

        tbody.innerHTML = "";

        data.items.forEach((item, index) => {

            const row = `

            <tr>

                <td>${index + 1}</td>

                <td>
                    <input type="text"
                    class="li-input product-name"
                    value="${item.product_name || ''}"
                    readonly>
                </td>

                <td>
                    <input type="text"
                    class="li-input product-id"
                    value="${item.product_id || ''}"
                    readonly>
                </td>

                <td>
                    <input type="text"
                    class="li-input uom"
                    value="${item.uom || ''}"
                    readonly>
                </td>

                <td>
                    <input type="number"
                    class="li-input qty-ordered"
                    value="${item.qty_ordered || 0}"
                    readonly>
                </td>

                <td>
                    <input type="number"
                    class="li-input rejected-qty"
                    value="${item.rejected_qty || 0}"
                    readonly>
                </td>

                <td>
                    <input type="number"
                    class="li-input qty"
                    value="0">
                </td>

                <td>
                    <input type="text"
                    class="li-input return-reason">
                </td>

                <td>
                    <input type="number"
                    class="li-input price"
                    value="${item.unit_price || 0}"
                    readonly>
                </td>

                <td>
                    <input type="number"
                    class="li-input tax"
                    value="${item.tax_pct || 0}"
                    readonly>
                </td>

                <td>
                    <input type="number"
                    class="li-input discount"
                    value="${item.discount_pct || 0}"
                    readonly>
                </td>

                <td class="li-total">
                    0
                </td>

                <td>
                    <button type="button"
                    class="li-delete">
                        🗑
                    </button>
                </td>

            </tr>
            `;

            tbody.insertAdjacentHTML(
                "beforeend",
                row
            );
        });

        calculateSummary();

    } catch (err) {

        console.error(err);

        showAlert(
            "GRN Load Failed",
            "error"
        );
    }

});

// =========================================
// GRN DROPDOWN CHANGE
// =========================================

document.addEventListener("change", async function(e) {

    if (e.target.id !== "grnInput") return;

    const grnId = e.target.value;

    if (!grnId) return;

    try {

        const response =
            await fetch(`/api/grn/${grnId}`);

        const data =
            await response.json();

        console.log("GRN DATA:", data);

            if (data.error) {
                return;
            }

        // =====================================
        // HEADER
        // =====================================

        document.querySelector(
            "[name='po_reference']"
        ).value = data.header.po_number || "";

        document.querySelector(
            "[name='supplier_name']"
        ).value = data.header.supplier_name || "";

        document.querySelector(
            "[name='supplier_email']"
        ).value = data.header.supplier_email || "";

        document.querySelector(
            "[name='received_date']"
        ).value = data.header.received_date || "";

        // =====================================
        // LINE ITEMS
        // =====================================

        const tbody =
            document.getElementById("lineItemsBody");

        tbody.innerHTML = "";

        data.items.forEach((item, index) => {

            tbody.insertAdjacentHTML(
                "beforeend",
                `
                <tr>

                    <td>${index + 1}</td>

                    <td>
                        <input type="text"
                        class="li-input product-name"
                        value="${item.product_name || ''}"
                        readonly>
                    </td>

                    <td>
                        <input type="text"
                        class="li-input product-id"
                        value="${item.product_id || ''}"
                        readonly>
                    </td>

                    <td>
                        <input type="text"
                        class="li-input uom"
                        value="${item.uom || ''}"
                        readonly>
                    </td>

                    <td>
                        <input type="number"
                        class="li-input qty-ordered"
                        value="${item.qty_ordered || 0}"
                        readonly>
                    </td>

                    <td>
                        <input type="number"
                        class="li-input rejected-qty"
                        value="${item.rejected_qty || 0}"
                        readonly>
                    </td>

                    <td>
                        <input type="number"
                        class="li-input qty"
                        value="0"
                        min="0">
                    </td>

                    <td>
                        <input type="text"
                        class="li-input return-reason">
                    </td>

                    <td>
                        <input type="number"
                        class="li-input price"
                        value="${item.unit_price || 0}"
                        readonly>
                    </td>

                    <td>
                        <input type="number"
                        class="li-input tax"
                        value="${item.tax_pct || 0}"
                        readonly>
                    </td>

                    <td>
                        <input type="number"
                        class="li-input discount"
                        value="${item.discount_pct || 0}"
                        readonly>
                    </td>

                    <td class="li-total">
                        0
                    </td>

                    <td>
                        <button type="button"
                        class="li-delete">
                           <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>

                </tr>
                `
            );
        });

        calculateSummary();

    } catch (err) {

        console.error(err);

        showAlert(
            "Failed to load GRN",
            "error"
        );
    }
});

// =========================================
// LOAD SUBMITTED GRNs
// =========================================

async function loadSubmittedGRNs() {

        if (mode === "edit" || mode === "view") {
        return;
    }

    try {
        

        const response =
            await fetch("/api/submitted-grns");

        const data =
            await response.json();

        console.log("SUBMITTED GRNS:", data);

        const dropdown =
            document.getElementById("grnInput");

        if (!dropdown) return;

        dropdown.innerHTML = `
            <option value="">
                Select GRN
            </option>
        `;

        if (data.success) {

            data.data.forEach(grn => {

                dropdown.insertAdjacentHTML(
                    "beforeend",
                    `
                    <option value="${grn.grn_number}">
                        ${grn.grn_number}
                    </option>
                    `
                );

            });

        }

    } catch (err) {

        console.error(
            "Failed to load GRNs",
            err
        );

        showAlert(
            "Failed to load GRNs",
            "error"
        );
    }
}
// =============================================
// DELETE ROW
// =============================================

document.addEventListener("click", function (e) {

    if (e.target.classList.contains("li-delete")) {

        const row =
            e.target.closest("tr");

        row.remove();

        updateSerialNumbers();

        calculateSummary();
        validateForm();
    }
});

// =============================================
// AUTO CALCULATE
// =============================================
document.addEventListener("input", function (e) {

    // =====================================
    // RETURN QTY VALIDATION
    // =====================================

    if (e.target.classList.contains("qty")) {

        let value = e.target.value;

        // CHECK DECIMAL
        if (value.includes(".")) {

            showAlert(
                "Decimal values are not allowed in Return Qty",
                "error"
            );

            // CONVERT TO INTEGER
            e.target.value = parseInt(value) || 0;
        }

            // NEGATIVE BLOCK
            if (value.startsWith("-")) {

                showAlert(
                    "Negative values are not allowed",
                    "error"
                );

                e.target.value = 0;
                return;
            }

        calculateSummary();
        validateForm();
    }

       // RETURN REASON
    if (e.target.classList.contains("return-reason")) {

        validateForm();
    }

    // =====================================
    // GLOBAL DISCOUNT VALIDATION
    // =====================================

    if (e.target.id === "globalDiscount") {

        let discount =
            Number(e.target.value);

        if (discount < 0) {

            showAlert(
                "Discount cannot be below 0%",
                "error"
            );

            e.target.value = 0;
        }

        if (discount > 90) {

            showAlert(
                "Discount cannot exceed 90%",
                "error"
            );

            e.target.value = 90;
        }

        calculateSummary();
    }
});

document.addEventListener("DOMContentLoaded", function () {

    // Return Date Validation
    document.querySelector('input[name="return_date"]')
        .addEventListener("change", function () {

            const value = this.value;

            if (!value) return;

            const date = new Date(value);

            if (isNaN(date.getTime())) {

                showAlert(
                    "Invalid date is not accepted",
                    "error"
                );

                this.value = "";
                return;
            }

            const year = date.getFullYear();

            if (year < 1900 || year > 2100) {

                showAlert(
                    "Invalid date is not accepted",
                    "error"
                );

                this.value = "";
            }
        });
        validateForm();

});

document.addEventListener("DOMContentLoaded", function () {

    const returnDate =
        document.querySelector("[name='return_date']");

    const returnBy =
        document.querySelector("[name='return_by']");

    const returnDateError =
        document.getElementById("returnDateError");

    const returnByError =
        document.getElementById("returnByError");

    if (!returnDate || !returnBy) return;

    // =====================================
    // PAGE LOAD
    // =====================================

    returnDateError.style.display = "block";
    returnByError.style.display = "none";

    // =====================================
    // RETURN DATE
    // =====================================

    returnDate.addEventListener("change", function () {

        if (this.value) {

            // Hide Date Error
            returnDateError.style.display = "none";

            // Show Next Field Error
            if (!returnBy.value.trim()) {
                returnByError.style.display = "block";
            }

        } else {

            returnDateError.style.display = "block";
            returnByError.style.display = "none";
        }
         validateForm();
    });

    // =====================================
    // RETURN INITIATED BY
    // =====================================

    returnBy.addEventListener("input", function () {

        if (this.value.trim()) {

            returnByError.style.display = "none";

        } else {

            if (returnDate.value) {
                returnByError.style.display = "block";
            }
        }
            validateForm();
    });

});

// =============================================
// FORM VALIDATION
// =============================================
function validateForm() {

    const submitBtn =
        document.getElementById("submitBtn");

    if (!submitBtn) return;

    const returnDate =
        document.querySelector("[name='return_date']")?.value || "";

    const returnBy =
        document.querySelector("[name='return_by']")?.value.trim() || "";

    let qtyValid = false;
    let reasonValid = false;

    document.querySelectorAll(".qty").forEach(q => {

        if (Number(q.value) > 0) {
            qtyValid = true;
        }
    });

    document.querySelectorAll(".return-reason").forEach(r => {

        if (r.value.trim()) {
            reasonValid = true;
        }
    });

    submitBtn.disabled = !(
        returnDate &&
        returnBy &&
        qtyValid &&
        reasonValid
    );
}
// =============================================
// CALCULATE SUMMARY
// =============================================

function calculateSummary() {

    let originalTotal = 0;
    let totalTax = 0;
    let subtotal = 0;

    const globalDiscountPct =
        Number(
            document.getElementById("globalDiscount")
            ?.value || 0
        );

    document.querySelectorAll("#lineItemsBody tr")
    .forEach(row => {

        let qty =
            Number(
                row.querySelector(".qty")
                ?.value || 0
            );

        let price =
            Number(
                row.querySelector(".price")
                ?.value || 0
            );

        let taxPct =
            Number(
                row.querySelector(".tax")
                ?.value || 0
            );

        let discountPct =
            Number(
                row.querySelector(".discount")
                ?.value || 0
            );

        let baseTotal =
            qty * price;

        let itemDiscount =
            baseTotal * (discountPct / 100);

        let afterDiscount =
            baseTotal - itemDiscount;

        let taxAmount =
            afterDiscount * (taxPct / 100);

        let rowTotal =
            afterDiscount + taxAmount;

        const totalCell =
            row.querySelector(".li-total");

        if (totalCell) {

            totalCell.innerText =
                rowTotal.toFixed(2);
        }

        originalTotal += baseTotal;

        totalTax += taxAmount;

        subtotal += rowTotal;
    });

    const globalDiscountAmount =
        subtotal * (globalDiscountPct / 100);

    const amountRecover =
        subtotal - globalDiscountAmount;

    document.getElementById("originalTotal").innerText =
        `₹ ${originalTotal.toFixed(2)}`;

    document.getElementById("taxSummary").innerText =
        `₹ ${totalTax.toFixed(2)}`;

    document.getElementById("returnedSubtotal").innerText =
        `₹ ${subtotal.toFixed(2)}`;

    document.getElementById("discountAmount").innerText =
        `₹ ${globalDiscountAmount.toFixed(2)}`;

    document.getElementById("amountRecover").innerText =
        `₹ ${amountRecover.toFixed(2)}`;
          validateForm();
}

// =============================================
// UPDATE SERIAL NUMBERS
// =============================================

function updateSerialNumbers() {

    const rows =
        document.querySelectorAll(
            "#lineItemsBody tr"
        );

    rows.forEach((row, index) => {

        const snoCell =
            row.querySelector("td");

        if (snoCell) {

            snoCell.textContent =
                index + 1;
        }
    });
}



// =============================================
// SAVE STOCK RETURN
// =============================================

async function saveStockReturn(defaultStatus) {

    console.log("Saving Started");

    const urlParams =
        new URLSearchParams(window.location.search);

    const grnId =
        urlParams.get("grn");

    const selectedGRN =
    grnId ||
    document.getElementById("grnInput")?.value ||
    "";

// =========================================
// GET STATUS FROM BUTTON
// =========================================

        const statusDropdown =
            document.querySelector("[name='status']");

        let selectedStatus = defaultStatus;

        // sync dropdown with button action
        if (statusDropdown) {
            statusDropdown.value = defaultStatus;
        }

        console.log("Selected Status:", selectedStatus);

    // =========================================
    // VALIDATIONS
    // =========================================

    const srnNo =
        document.querySelector("[name='srn_no']")
        ?.value || "";

    const poReference =
        document.querySelector("[name='po_reference']")
        ?.value || "";

    const supplierName =
        document.querySelector("[name='supplier_name']")
        ?.value || "";

    const supplierEmail =
        document.querySelector("[name='supplier_email']")
        ?.value || "";

    const receivedDate =
        document.querySelector("[name='received_date']")
        ?.value || "";

    const returnDate =
        document.querySelector("[name='return_date']")
        ?.value || "";

    const returnBy =
        document.querySelector("[name='return_by']")
        ?.value || "";

    // =========================================
    // ITEMS
    // =========================================

    const rows =
        document.querySelectorAll(
            "#lineItemsBody tr"
        );

    const items = [];

    rows.forEach((row) => {

        items.push({

            product_name:
                row.querySelector(".product-name")
                ?.value || "",

            product_id:
                row.querySelector(".product-id")
                ?.value || "",

            uom:
                row.querySelector(".uom")
                ?.value || "",

            qty_ordered:
                Number(
                    row.querySelector(".qty-ordered")
                    ?.value || 0
                ),

            rejected_qty:
                Number(
                    row.querySelector(".rejected-qty")
                    ?.value || 0
                ),

            return_qty:
                Number(
                    row.querySelector(".qty")
                    ?.value || 0
                ),

            return_reason:
                row.querySelector(".return-reason")
                ?.value || "",

            unit_price:
                Number(
                    row.querySelector(".price")
                    ?.value || 0
                ),

            tax_pct:
                Number(
                    row.querySelector(".tax")
                    ?.value || 0
                ),

            discount_pct:
                Number(
                    row.querySelector(".discount")
                    ?.value || 0
                ),

            total:
                Number(
                    row.querySelector(".li-total")
                    ?.innerText || 0
                )
        });
    });

    // =========================================
    // GRAND TOTAL
    // =========================================

    const grandTotal =
        document.getElementById("amountRecover")
        ?.innerText
        .replace("₹", "")
        .trim() || "0";


    const commentPromises =
    window.SNR_COMMENTS.map(comment => {

        return fetch(
            "/api/add-stock-return-comment",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    srn_number: srnNo,

                    comment_text:
                        comment.comment_text,

                    commented_by:
                        comment.commented_by
                })
            }
        );

    });

    

    // =========================================
    // PAYLOAD
    // =========================================

    const payload = {

        srn_number: srnNo,

        grn_number: selectedGRN,

        po_number: poReference,

        supplier_name: supplierName,

        supplier_email: supplierEmail,

        received_date: receivedDate,

        return_date: returnDate,

        return_by: returnBy,

        grand_total: grandTotal,

        status: selectedStatus,

        items: items
    };

    console.log("Payload:", payload);

    // =========================================
    // API CALL
    // =========================================
try {

    // 1. Save comments
    await Promise.all(commentPromises);

    // 2. Upload attachments
    await uploadAttachmentsToDB(srnNo);

    // 3. Save stock return
    const res = await fetch("/api/save-stock-return", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const data = await res.json();

    console.log("Server Response:", data);

    if (data.success) {

        showAlert(`${selectedStatus} Successfully`, "success");

        setTimeout(() => {
            window.location.href = "/stock-return";
        }, 1500);

    } else {

        showAlert(data.error || "Save Failed", "error");
    }

} catch (err) {

    console.error("Save Error:", err);
    showAlert("Server Error", "error");
}
}

async function uploadAttachmentsToDB(srnNo) {

    for (const file of window.SNR_TEMP_ATTACHMENTS) {

        const fd = new FormData();
        fd.append("srn_number", srnNo);
        fd.append("file", file.file_obj);

        await fetch("/api/upload-stock-return-file", {
            method: "POST",
            body: fd
        });
    }

    window.SNR_TEMP_ATTACHMENTS = [];
}

// =============================================
// PDF FUNCTION
// =============================================

function generateStockReturnPDF() {

    const urlParams = new URLSearchParams(window.location.search);
    const grnId = urlParams.get("grn");

    const payload = {
        srn_number: document.querySelector("[name='srn_no']").value,
        grn_number: grnId || document.getElementById("grnDisplay")?.value || "",
        po_number: document.querySelector("[name='po_reference']").value,
        supplier_name: document.querySelector("[name='supplier_name']").value,
        supplier_email: document.querySelector("[name='supplier_email']").value,
        return_date: document.querySelector("[name='return_date']").value,
        return_by: document.querySelector("[name='return_by']").value,
        status: document.querySelector("[name='status']")?.value || "Draft",

        subtotal: document.getElementById("returnedSubtotal").innerText.replace("₹","").trim(),
        tax: document.getElementById("taxSummary").innerText.replace("₹","").trim(),
        discount: document.getElementById("discountAmount").innerText.replace("₹","").trim(),
        grand_total: document.getElementById("amountRecover").innerText.replace("₹","").trim(),

        items: []
    };

    document.querySelectorAll("#lineItemsBody tr").forEach(row => {

        payload.items.push({
            product_name: row.querySelector(".product-name")?.value,
            return_qty: row.querySelector(".qty")?.value,
            unit_price: row.querySelector(".price")?.value,
            tax_pct: row.querySelector(".tax")?.value,
            discount_pct: row.querySelector(".discount")?.value,
            return_reason: row.querySelector(".return-reason")?.value,
            total: row.querySelector(".li-total")?.innerText
        });
    });

    fetch("/generate-stock-return-pdf", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
    .then(res => res.blob())
    .then(blob => {

        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${payload.srn_number}.pdf`;

        document.body.appendChild(a);
        a.click();
        a.remove();
    })
    .catch(err => {
        console.error(err);
        showAlert("PDF generation failed", "error");
    });
}

// =============================================
// EMAIL FUNCTION
// =============================================
// =============================================
// EMAIL FUNCTION
// =============================================
function sendStockReturnEmail() {

    const srn_number =
        document.querySelector("[name='srn_no']")?.value || "";

    const items = [];

    document.querySelectorAll("#lineItemsBody tr")
        .forEach(row => {

            items.push({

                product_name:
                    row.querySelector(".product-name")?.value || "",

                return_qty:
                    row.querySelector(".qty")?.value || 0,

                unit_price:
                    row.querySelector(".price")?.value || 0,

                tax_pct:
                    row.querySelector(".tax")?.value || 0,

                discount_pct:
                    row.querySelector(".discount")?.value || 0,

                return_reason:
                    row.querySelector(".return-reason")?.value || "",

                total:
                    row.querySelector(".li-total")?.innerText || 0
            });
        });

    const payload = {

        srn_number: srn_number,

        grn_number:
            document.getElementById("grnDisplay")?.value ||
            document.getElementById("grnInput")?.value ||
            "",

        po_number:
            document.querySelector("[name='po_reference']")?.value || "",

        supplier_name:
            document.querySelector("[name='supplier_name']")?.value || "",

        supplier_email:
            document.querySelector("[name='supplier_email']")?.value || "",

        return_by:
            document.querySelector("[name='return_by']")?.value || "",

        return_date:
            document.querySelector("[name='return_date']")?.value || "",

        status:
            document.querySelector("[name='status']")?.value ||
            document.getElementById("statusBadge")?.innerText
                .replace("Status:", "")
                .trim() ||
            "",

        subtotal:
            document.getElementById("returnedSubtotal")
                ?.innerText
                .replace("₹", "")
                .trim() || "0",

        tax:
            document.getElementById("taxSummary")
                ?.innerText
                .replace("₹", "")
                .trim() || "0",

        discount:
            document.getElementById("discountAmount")
                ?.innerText
                .replace("₹", "")
                .trim() || "0",

        grand_total:
            document.getElementById("amountRecover")
                ?.innerText
                .replace("₹", "")
                .trim() || "0",

        items: items
    };

    fetch(`/api/stock-return/${srn_number}/email`, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(payload)

    })
    .then(res => res.json())
    .then(data => {

        if (data.success) {

            showAlert(
                "Email sent successfully",
                "success"
            );

        } else {

            showAlert(
                data.message || "Email failed",
                "error"
            );
        }

    })
    .catch(err => {

        console.error(err);

        showAlert(
            "Server error",
            "error"
        );
    });
}

async function loadExistingSRN(srnNo){

    const res =
        await fetch(`/api/stock-return/${srnNo}`);

    const data =
        await res.json();

    console.log(data);

    // HEADER DATA

    document.querySelector("[name='srn_no']").value =
        data.header.srn_number || "";

    document.querySelector("[name='po_reference']").value =
        data.header.po_number || "";

    document.querySelector("[name='supplier_name']").value =
        data.header.supplier_name || "";

    document.querySelector("[name='supplier_email']").value =
        data.header.supplier_email || "";

    document.querySelector("[name='received_date']").value =
        data.header.received_date || "";

    document.querySelector("[name='return_date']").value =
        data.header.return_date || "";

    document.querySelector("[name='return_by']").value =
        data.header.return_by || "";

    // =====================================
    // SHOW EXISTING GRN IN EDIT/VIEW
    // =====================================

    const dropdown =
        document.getElementById("grnInput");

    const displayBox =
        document.getElementById("grnDisplay");

    if (mode === "edit" || mode === "view") {

        dropdown.style.display = "none";

        displayBox.style.display = "block";

        displayBox.value =
            data.header.grn_number || "";
    }

    const badge =
        document.getElementById("statusBadge");

    if (badge) {

        const status =
            (data.header.status || "").toLowerCase();

        badge.textContent =
            `Status : ${data.header.status || ""}`;

        badge.className =
            `status-badge ${status}`;
    }

    // ITEMS

    const tbody =
        document.getElementById("lineItemsBody");

    tbody.innerHTML = "";

    data.items.forEach((item,index)=>{

        tbody.insertAdjacentHTML(
            "beforeend",

            `
            <tr>

                <td>${index+1}</td>

                <td>
                    <input class="li-input product-name"
                    value="${item.product_name}">
                </td>

                <td>
                    <input class="li-input product-id"
                    value="${item.product_id}">
                </td>

                <td>
                    <input class="li-input uom"
                    value="${item.uom}">
                </td>

                <td>
                    <input class="li-input qty-ordered"
                    value="${item.qty_ordered}">
                </td>

                <td>
                    <input class="li-input rejected-qty"
                    value="${item.rejected_qty}">
                </td>

                <td>
                    <input class="li-input qty"
                    value="${item.return_qty}">
                </td>

                <td>
                    <input class="li-input return-reason"
                    value="${item.return_reason}">
                </td>

                <td>
                    <input class="li-input price"
                    value="${item.unit_price}">
                </td>

                <td>
                    <input class="li-input tax"
                    value="${item.tax_pct}">
                </td>

                <td>
                    <input class="li-input discount"
                    value="${item.discount_pct}">
                </td>

                <td class="li-total">
                    ${item.total}
                </td>

            </tr>
            `
        );

    });

    if (mode === "edit" || mode === "view") {

    document.querySelectorAll(`
        .product-name,
        .product-id,
        .uom,
        .qty-ordered,
        .rejected-qty,
        .price,
        .tax,
        .discount
    `).forEach(el => {

        el.style.border = "none";
        el.style.background = "transparent";
        el.style.boxShadow = "none";
        el.style.pointerEvents = "none";
        el.style.padding = "0";
    });
}

    if (mode === "edit" || mode === "view") {

    document
        .querySelectorAll(".live-error")
        .forEach(el => {
            el.style.display = "none";
        });
}

      // ==========================
    // VIEW / EDIT MODE
    // ==========================

    if(mode === "view"){

        document
            .querySelectorAll(
                "input,select,textarea,button"
            )
            .forEach(el=>{

                if(el.id !== "cancelBtn"){
                    el.disabled = true;
                }

            });

         // Hide Save Draft button
    document.getElementById("saveDraftBtn")
        ?.style.setProperty("display", "none");

    // Hide Submit button
    document.getElementById("submitBtn")
        ?.style.setProperty("display", "none");


    }

    if(mode === "edit"){

        // edit mode
        // nothing required

    }

    calculateSummary();
}