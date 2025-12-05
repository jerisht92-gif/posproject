// static/menu.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("menu.js loaded ✅");

  // ==========================
  // PATTERN A: .menu-toggle + data-target
  // (your older HTML style)
  // ==========================
  const legacyToggles = document.querySelectorAll(".menu-toggle[data-target]");

  legacyToggles.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;         // e.g. "masters-submenu"
      const submenu  = document.getElementById(targetId);

      if (!submenu) return;

      // toggle .open on that submenu
      submenu.classList.toggle("open");
    });
  });

  // ==========================
  // PATTERN B: .menu-dropdown .dropdown-toggle
  // (new style with wrapper)
  // ==========================
  const dropdownButtons = document.querySelectorAll(".menu-dropdown .dropdown-toggle");

  dropdownButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      const parent = btn.closest(".menu-dropdown");
      if (!parent) return;

      parent.classList.toggle("active"); // CSS will show submenu
    });
  });

  // ==========================
  // SIDEBAR BURGER (3 lines circle)
  // ==========================
  const burgerBtn = document.getElementById("menuToggleBtn");
  const sidebar   = document.querySelector(".sidebar");

  if (burgerBtn && sidebar) {
    burgerBtn.addEventListener("click", () => {
      sidebar.classList.toggle("sidebar-open");      // mobile slide
      sidebar.classList.toggle("sidebar-collapsed"); // desktop collapse
    });
  }
  // 🔎 GLOBAL SEARCH HANDLER
const searchInput = document.querySelector(".search-input");
const searchResultsBox = document.getElementById("searchResults");

if (searchInput && searchResultsBox) {

  searchInput.addEventListener("input", async () => {
    const q = searchInput.value.trim();

    if (!q || q.length < 2) {
      searchResultsBox.style.display = "none";
      searchResultsBox.innerHTML = "";
      return;
    }

    try {
      const resp = await fetch(`/search?q=${encodeURIComponent(q)}`);
      const data = await resp.json();
      const items = data.results || [];

      if (!items.length) {
        searchResultsBox.innerHTML = `
          <div class="search-result-item no-results">
            No matches found
          </div>`;
        searchResultsBox.style.display = "block";
        return;
      }

      searchResultsBox.innerHTML = items
        .map(item => `
          <div class="search-result-item" data-url="${item.url}">
            <span class="result-type">${item.type}</span>
            <span class="result-label">${item.label}</span>
          </div>
        `)
        .join("");

      searchResultsBox.style.display = "block";

      document.querySelectorAll(".search-result-item").forEach(el => {
        el.addEventListener("click", () => {
          const url = el.getAttribute("data-url");
          if (url) window.location.href = url;
        });
      });

    } catch (err) {
      console.error("Search error:", err);
    }
  });

  document.addEventListener("click", (e) => {
    if (!searchResultsBox.contains(e.target) && e.target !== searchInput) {
      searchResultsBox.style.display = "none";
    }
  });
}

  // ==========================
  // PROFILE DROPDOWN
  // ==========================
  const profileBtn      = document.getElementById("profileBtn");
  const profileDropdown = document.getElementById("profileDropdown");

  if (profileBtn && profileDropdown) {
    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
      if (!profileDropdown.classList.contains("show")) return;
      if (!profileDropdown.contains(e.target) && e.target !== profileBtn) {
        profileDropdown.classList.remove("show");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") profileDropdown.classList.remove("show");
    });
  }
});



  
