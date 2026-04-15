// static/removed-items.js
// Ensure the Quick Billing → Removed Items page shows a clear Fetch/XHR entry named "removed-items".

document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname !== "/quick-billing/deleted") return;
  // Prevent duplicate XHR if this script is ever loaded twice
  if (window.__removedItemsFetched) return;
  window.__removedItemsFetched = true;

  fetch("/removed-items?mode=ajax", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  })
    .then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then((payload) => {
      console.log("Removed Items metadata:", payload);
      // UI stays localStorage-driven; this XHR is just for DevTools visibility.
    })
    .catch((err) => {
      console.error("Error fetching removed-items metadata:", err);
    });
});

