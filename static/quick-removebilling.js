/**
 * Quick Remove Billing page — same behavior as Removed Items.
 */
document.addEventListener("DOMContentLoaded", () => {
  const DELETED_KEY = "qb_deleted_items";
  const RESTORE_KEY = "qb_restore_request";

  function getDeletedItems() {
    try {
      return JSON.parse(localStorage.getItem(DELETED_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function setDeletedItems(items) {
    localStorage.setItem(DELETED_KEY, JSON.stringify(items));
  }

  function purgeExpiredDeletedItems(maxAgeHours = 24) {
    const all = getDeletedItems();
    if (!all.length) return;

    const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
    const fresh = all.filter((it) => {
      if (!it.removedAt) return true;
      const t = Date.parse(it.removedAt);
      if (Number.isNaN(t)) return true;
      return t >= cutoff;
    });

    if (fresh.length !== all.length) {
      setDeletedItems(fresh);
    }
  }

  function fmtDateTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}-${mm}-${yy} ${hh}:${mi}`;
  }

  function dismissBanner() {
    const existing = document.querySelector(".success-notification, .error-notification");
    if (existing) existing.remove();
  }

  function showBanner(message, type, durationMs = 2500) {
    dismissBanner();
    const notification = document.createElement("div");
    notification.className = type === "error" ? "error-notification" : "success-notification";
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add("show"), 10);
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode) notification.parentNode.removeChild(notification);
      }, 400);
    }, durationMs);
  }

  function showSuccessNotification(message, durationMs = 2500) {
    showBanner(message, "success", durationMs);
  }

  function showErrorNotification(message, durationMs = 2500) {
    showBanner(message, "error", durationMs);
  }

  const QB = {
    DELETED_KEY,
    RESTORE_KEY,
    getDeletedItems,
    setDeletedItems,
    purgeExpiredDeletedItems,
    fmtDateTime,
    showSuccessNotification,
    showErrorNotification,
  };

  const delSearch = document.getElementById("delSearch");
  const delClear = document.getElementById("delClear");
  const delSelectAll = document.getElementById("delSelectAll");
  const delDeleteSelected = document.getElementById("delDeleteSelected");
  const delTbody = document.getElementById("delTbody");
  const delShowing = document.getElementById("delShowing");
  const delPrev = document.getElementById("delPrev");
  const delNext = document.getElementById("delNext");
  const delPageNow = document.getElementById("delPageNow");
  const delPageTotal = document.getElementById("delPageTotal");
  const delConfirmModal = document.getElementById("delConfirmModal");
  const delConfirmMsg = document.getElementById("delConfirmMsg");
  const delConfirmOk = document.getElementById("delConfirmOk");
  const delConfirmCancel = document.getElementById("delConfirmCancel");

  const ROWS_PER_PAGE = 10;
  const EMPTY_ROW_HTML =
    '<tr class="no-data-row"><td class="empty" colspan="11">No removed item found</td></tr>';

  function showDeleteConfirmModal(message) {
    return new Promise((resolve) => {
      if (!delConfirmModal || !delConfirmMsg || !delConfirmOk || !delConfirmCancel) {
        resolve(true);
        return;
      }

      delConfirmMsg.textContent = message;
      delConfirmModal.style.display = "flex";
      delConfirmModal.setAttribute("aria-hidden", "false");

      function cleanup() {
        delConfirmModal.style.display = "none";
        delConfirmModal.setAttribute("aria-hidden", "true");
        delConfirmOk.removeEventListener("click", onOk);
        delConfirmCancel.removeEventListener("click", onCancel);
        document.removeEventListener("keydown", onKeyDown);
      }

      function onOk() {
        cleanup();
        resolve(true);
      }

      function onCancel() {
        cleanup();
        resolve(false);
      }

      function onKeyDown(e) {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }

      delConfirmOk.addEventListener("click", onOk);
      delConfirmCancel.addEventListener("click", onCancel);
      document.addEventListener("keydown", onKeyDown);
      delConfirmCancel.focus();
    });
  }

  function applyFilters(items) {
    const q = String(delSearch?.value || "").trim().toLowerCase();
    if (!q) return [...items];

    return items.filter(
      (it) =>
        String(it.code || "").toLowerCase().includes(q) ||
        String(it.name || "").toLowerCase().includes(q)
    );
  }

  function getSelectedIndexes() {
    const checks = delTbody?.querySelectorAll("input.row-check:checked") || [];
    return Array.from(checks).map((ch) => Number(ch.dataset.idx));
  }

  function render() {
    QB.purgeExpiredDeletedItems();

    const all = getDeletedItems();
    const filtered = applyFilters(all);
    const total = filtered.length;
    const pageTotal = Math.max(Math.ceil(total / ROWS_PER_PAGE), 1);
    let pageNow = Number(delPageNow?.textContent || "1");
    if (pageNow > pageTotal) pageNow = pageTotal;
    if (pageNow < 1) pageNow = 1;

    if (delPageTotal) delPageTotal.textContent = String(pageTotal);
    if (delPageNow) delPageNow.textContent = String(pageNow);

    const startIndex = (pageNow - 1) * ROWS_PER_PAGE;
    const pageItems = filtered.slice(startIndex, startIndex + ROWS_PER_PAGE);

    if (!delTbody) return;

    if (pageItems.length === 0) {
      delTbody.innerHTML = EMPTY_ROW_HTML;
      if (delShowing) delShowing.textContent = `Showing 0–0 of ${total} Deleted Items`;
      if (delPrev) delPrev.disabled = true;
      if (delNext) delNext.disabled = true;
      if (delSelectAll) delSelectAll.checked = false;
      return;
    }

    delTbody.innerHTML = pageItems
      .map((it, i) => {
        const globalIdx = all.findIndex(
          (x) => x.removedAt === it.removedAt && x.code === it.code && x.name === it.name
        );
        const sno = startIndex + i + 1;

        return `
        <tr>
          <td><input type="checkbox" class="row-check" data-idx="${globalIdx}"></td>
          <td>${sno}</td>
          <td>${it.code || ""}</td>
          <td>${it.name || ""}</td>
          <td>${it.qty ?? ""}</td>
          <td>${Number(it.unitPrice || 0).toFixed(2)}</td>
          <td>${Number(it.discount || 0).toFixed(2)}%</td>
          <td>${Number(it.gst || 0).toFixed(2)}%</td>
          <td>${it.removedBy || "-"}</td>
          <td>${fmtDateTime(it.removedAt)}</td>
          <td>
            <button type="button" class="row-btn restore-btn" data-restore="${globalIdx}">Restore</button>
          </td>
        </tr>
      `;
      })
      .join("");

    const start = startIndex + 1;
    const end = Math.min(startIndex + ROWS_PER_PAGE, total);
    if (delShowing) delShowing.textContent = `Showing ${start}–${end} of ${total} Entities`;

    if (delPrev) delPrev.disabled = pageNow <= 1;
    if (delNext) delNext.disabled = pageNow >= pageTotal;
    if (delSelectAll) delSelectAll.checked = false;
  }

  delTbody?.addEventListener("click", (e) => {
    const t = e.target;
    if (!t?.dataset?.restore) return;

    const idx = Number(t.dataset.restore);
    const all = getDeletedItems();
    const item = all[idx];
    if (!item) return;

    localStorage.setItem(RESTORE_KEY, JSON.stringify(item));
    all.splice(idx, 1);
    setDeletedItems(all);

    window.location.href = "/quick-billing";
  });

  delSelectAll?.addEventListener("change", () => {
    const checked = delSelectAll.checked;
    delTbody?.querySelectorAll("input.row-check").forEach((ch) => {
      ch.checked = checked;
    });
  });

  delDeleteSelected?.addEventListener("click", async () => {
    const idxs = getSelectedIndexes().filter((i) => i >= 0).sort((a, b) => b - a);
    if (idxs.length === 0) {
      showErrorNotification("Please select at least one item to delete");
      return;
    }

    const label = idxs.length === 1 ? "1 selected item" : `${idxs.length} selected items`;
    const confirmed = await showDeleteConfirmModal(
      `Delete ${label} from Removed Items? This cannot be undone.`
    );
    if (!confirmed) return;

    const all = getDeletedItems();
    idxs.forEach((i) => {
      if (i >= 0 && i < all.length) all.splice(i, 1);
    });
    setDeletedItems(all);
    if (delSelectAll) delSelectAll.checked = false;
    if (delPageNow) delPageNow.textContent = "1";
    render();
    showSuccessNotification(
      idxs.length === 1
        ? "Item has been deleted successfully"
        : `${idxs.length} items have been deleted successfully`
    );
  });

  delSearch?.addEventListener("input", () => {
    if (delPageNow) delPageNow.textContent = "1";
    render();
  });

  delClear?.addEventListener("click", () => {
    if (delSearch) delSearch.value = "";
    if (delPageNow) delPageNow.textContent = "1";
    if (delSelectAll) delSelectAll.checked = false;
    render();
  });

  delPrev?.addEventListener("click", () => {
    const p = Number(delPageNow?.textContent || "1");
    if (delPageNow) delPageNow.textContent = String(Math.max(p - 1, 1));
    render();
  });

  delNext?.addEventListener("click", () => {
    const p = Number(delPageNow?.textContent || "1");
    const t = Number(delPageTotal?.textContent || "1");
    if (delPageNow) delPageNow.textContent = String(Math.min(p + 1, t));
    render();
  });

  render();
});

