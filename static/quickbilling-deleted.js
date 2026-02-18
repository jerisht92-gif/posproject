document.addEventListener("DOMContentLoaded", () => {
  const role = (window.QB_ROLE || "").toLowerCase();

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

  const ROWS_PER_PAGE = 10;

  function getDeletedItems() {
    try { return JSON.parse(localStorage.getItem("qb_deleted_items") || "[]"); }
    catch { return []; }
  }
  function setDeletedItems(items) {
    localStorage.setItem("qb_deleted_items", JSON.stringify(items));
  }

  function fmtDateTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    // dd-mm-yyyy hh:mm
    const dd = String(d.getDate()).padStart(2,"0");
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2,"0");
    const mi = String(d.getMinutes()).padStart(2,"0");
    return `${dd}-${mm}-${yy} ${hh}:${mi}`;
  }

 function applyFilters(items) {
  const q = String(delSearch?.value || "").trim().toLowerCase();

  let out = [...items];

  if (q) {
    out = out.filter(it =>
      String(it.code || "").toLowerCase().includes(q) ||
      String(it.name || "").toLowerCase().includes(q)
    );
  }

  return out;
}

  function getSelectedIndexes() {
    const checks = delTbody?.querySelectorAll("input.row-check:checked") || [];
    return Array.from(checks).map(ch => Number(ch.dataset.idx));
  }

  function canSuperAdmin() {
    
    return role.includes("super") || role === "super admin" || role === "superadmin";
  }

  function render() {
    const all = getDeletedItems();
    const filtered = applyFilters(all);

    // pagination
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
      delTbody.innerHTML = `<tr><td colspan="11" class="empty">No deleted items.</td></tr>`;
      if (delShowing) delShowing.textContent = `Showing 0–0 of ${total} Deleted Items`;
      if (delPrev) delPrev.disabled = true;
      if (delNext) delNext.disabled = true;
      return;
    }

    delTbody.innerHTML = pageItems.map((it, i) => {
      // IMPORTANT: selection + delete needs original index in "all"
      // so we store _globalIdx for actions
      const globalIdx = all.findIndex(x => x.removedAt === it.removedAt && x.code === it.code && x.name === it.name);
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
            <button class="row-btn restore-btn" data-restore="${globalIdx}">Restore</button>
            
          </td>
        </tr>
      `;
    }).join("");

    // footer text
    const start = startIndex + 1;
    const end = Math.min(startIndex + ROWS_PER_PAGE, total);
    if (delShowing) delShowing.textContent = `Showing ${start}–${end} of ${total} Entities`;

    if (delPrev) delPrev.disabled = pageNow <= 1;
    if (delNext) delNext.disabled = pageNow >= pageTotal;

    // disable permanent delete if not super admin
    if (!canSuperAdmin()) {
      delTbody.querySelectorAll("[data-perm]").forEach(btn => {
        btn.disabled = true;
        btn.title = "Only Super Admin can delete permanently";
        btn.style.opacity = "0.55";
        btn.style.cursor = "not-allowed";
      });
      if (delDeleteSelected) {
        delDeleteSelected.disabled = true;
        delDeleteSelected.title = "Only Super Admin can delete selected permanently";
        delDeleteSelected.style.opacity = "0.55";
        delDeleteSelected.style.cursor = "not-allowed";
      }
    }
  }

  // Restore / Permanent delete clicks
  delTbody?.addEventListener("click", (e) => {
    const t = e.target;

    // Restore
    if (t?.dataset?.restore) {
      const idx = Number(t.dataset.restore);
      const all = getDeletedItems();
      const item = all[idx];
      if (!item) return;

      // restore -> Quick billing needs addRowFromProduct.
      // simplest: store "restore_request" and go back to quick billing page.
      localStorage.setItem("qb_restore_request", JSON.stringify(item));
      // remove from deleted list
      all.splice(idx, 1);
      setDeletedItems(all);

      window.location.href = "/quick-billing"; // your quick billing route
      return;
    }

    // Permanent delete
    if (t?.dataset?.perm) {
      if (!canSuperAdmin()) return;
      const idx = Number(t.dataset.perm);
      const all = getDeletedItems();
      all.splice(idx, 1);
      setDeletedItems(all);
      render();
    }
  });

  // Select all
  delSelectAll?.addEventListener("change", () => {
    const checked = delSelectAll.checked;
    delTbody?.querySelectorAll("input.row-check").forEach(ch => ch.checked = checked);
  });

  // Delete selected (super admin)
  delDeleteSelected?.addEventListener("click", () => {
    if (!canSuperAdmin()) return;
    const idxs = getSelectedIndexes().sort((a,b)=>b-a);
    if (idxs.length === 0) return;

    const all = getDeletedItems();
    idxs.forEach(i => all.splice(i, 1));
    setDeletedItems(all);
    delSelectAll.checked = false;
    render();
  });

  // Search / From date / clear
  delSearch?.addEventListener("input", () => { if (delPageNow) delPageNow.textContent="1"; render(); });
  

  delClear?.addEventListener("click", () => {
    if (delSearch) delSearch.value = "";
    
    if (delPageNow) delPageNow.textContent="1";
    if (delSelectAll) delSelectAll.checked = false;
    render();
  });

  // Pager
  delPrev?.addEventListener("click", () => {
    const p = Number(delPageNow?.textContent || "1");
    if (delPageNow) delPageNow.textContent = String(Math.max(p-1, 1));
    render();
  });
  delNext?.addEventListener("click", () => {
    const p = Number(delPageNow?.textContent || "1");
    const t = Number(delPageTotal?.textContent || "1");
    if (delPageNow) delPageNow.textContent = String(Math.min(p+1, t));
    render();
  });

  render();
});