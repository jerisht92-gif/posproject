// static/menu.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("menu.js loaded ✅");

  // ==========================
  // PATTERN A: .menu-toggle + data-target
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

  // ==========================
  // CROSS-TAB LOGOUT
  // When user logs out in one tab, all other tabs redirect to login.
  // ==========================
  const logoutLink = document.querySelector(".logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      fetch("/logout", { method: "GET", redirect: "manual", credentials: "include" })
        .then(() => {
          localStorage.setItem("session_logout", Date.now().toString());
          window.location.href = "/login?message=logged_out";
        })
        .catch(() => {
          localStorage.setItem("session_logout", Date.now().toString());
          window.location.href = "/login?message=logged_out";
        });
    });
  }

  window.addEventListener("storage", (e) => {
    if (e.key === "session_logout") {
      window.location.href = "/login?message=session_expired";
    }
  });

  // ==========================
  // FOCUS TRAP - Keep Tab within page (prevent browser address bar)
  // ==========================
  function getFocusableElements() {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
    
    return Array.from(document.querySelectorAll(focusableSelectors)).filter(el => {
      // Only include elements within the document body (exclude browser UI)
      if (!document.body.contains(el)) return false;
      
      // Exclude hidden elements
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             style.opacity !== '0' &&
             !el.hasAttribute('disabled') &&
             el.offsetWidth > 0 &&
             el.offsetHeight > 0;
    });
  }

  document.addEventListener('keydown', (e) => {
    // Only handle Tab key
    if (e.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    // Check if active element is within our page (not browser UI)
    const isWithinPage = document.body.contains(activeElement) || 
                         activeElement === document.body ||
                         activeElement === document.documentElement;

    // If focus is outside page, immediately bring it back
    if (!isWithinPage) {
      e.preventDefault();
      e.stopPropagation();
      firstElement.focus();
      return;
    }

    // If Shift+Tab on first element, go to last
    if (e.shiftKey && activeElement === firstElement) {
      e.preventDefault();
      e.stopPropagation();
      lastElement.focus();
      return;
    }

    // If Tab on last element, go to first
    if (!e.shiftKey && activeElement === lastElement) {
      e.preventDefault();
      e.stopPropagation();
      firstElement.focus();
      return;
    }

    // Additional safety: if focus somehow escapes, bring it back
    setTimeout(() => {
      if (!document.body.contains(document.activeElement) && 
          document.activeElement !== document.body &&
          document.activeElement !== document.documentElement) {
        firstElement.focus();
      }
    }, 0);
  });
});

  



//sidbar toggle
document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("menuToggleBtn");
  const sidebar = document.querySelector(".sidebar");

  // create overlay
  const overlay = document.createElement("div");
  overlay.className = "sidebar-overlay";
  document.body.appendChild(overlay);

  function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("show");
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
  }

  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", () => {
      if (sidebar.classList.contains("open")) {
        closeSidebar();     // ✅ CLOSE
      } else {
        openSidebar();      // ✅ OPEN
      }
    });
  }

  overlay.addEventListener("click", closeSidebar);

  // auto close when clicking menu link (mobile)
  document.querySelectorAll(".sidebar a").forEach(link => {
    link.addEventListener("click", closeSidebar);
  });

  const closeBtn = document.getElementById("sidebarCloseBtn");

if (closeBtn) {
  closeBtn.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
  });
}

});




