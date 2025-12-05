// static/manage-users.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("manage-users.js loaded ✅");

  const createBtn   = document.getElementById("createUserBtn");
  const searchInput = document.getElementById("searchUsers");
  const tableBody   = document.getElementById("userTableBody");
  const noUserRow   = document.getElementById("noUserRow");
  

  // 👉 "Create New" button: go to /create-user
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      window.location.href = "/create-user";
    });
  }


  // 👉 Search filter for table
  if (searchInput && tableBody) {
    // all real data rows (skip no-data and noUserRow)
    const dataRows = Array.from(tableBody.querySelectorAll("tr")).filter(
      (row) =>
        row.id !== "noUserRow" &&
        !row.classList.contains("no-data-row")
    );

    function applyFilter() {
      const q = (searchInput.value || "").trim().toLowerCase();
      let visibleCount = 0;

      dataRows.forEach((row) => {
        const text = row.innerText.toLowerCase(); // row text (name+email+phone+role)

        if (!q || text.includes(q)) {
          row.style.display = "";
          visibleCount++;
        } else {
          row.style.display = "none";
        }
      });

      // show / hide "No users found"
      if (noUserRow) {
        if (q && visibleCount === 0) {
          noUserRow.style.display = "";
        } else {
          noUserRow.style.display = "none";
        }
      }
    }

    searchInput.addEventListener("input", applyFilter);
  }
});

document.addEventListener("DOMContentLoaded", function () {

  // ================================
  // DELETE USER (working version)
  // ================================
  const deleteButtons = document.querySelectorAll(".delete-btn");

  deleteButtons.forEach(btn => {
    btn.addEventListener("click", function () {
      const userId = this.getAttribute("data-id");
      const row = this.closest("tr");

      if (!userId) {
        console.error("No user ID found in delete button");
        return;
      }

      if (confirm("Are you sure you want to delete this user?")) {
        deleteUser(userId, row);
      }
    });
  });

  function deleteUser(id, rowElement) {
    fetch(`/delete-user/${id}`, { method: "DELETE" })
      .then(res => res.json())
      .then(data => {
        alert(data.message);

        if (rowElement) {
          rowElement.remove();
        }
      })
      .catch(err => console.error(err));
  }

});
