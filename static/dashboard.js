// =============================
// Dashboard JS (charts only)
// =============================

document.addEventListener("DOMContentLoaded", () => {
  console.log("dashboard.js loaded ✅");

  // =============================
  // 1️⃣ TOP SELLING PRODUCTS - PIE
  //    (matches <canvas id="topProductsChart">)
  // =============================
  const productsCtx = document.getElementById("topProductsChart");

  if (productsCtx && window.Chart) {
    new Chart(productsCtx, {
      type: "pie",
      data: {
        labels: [], // TODO: add product names
        datasets: [
          {
            data: [], // TODO: add product values
            backgroundColor: ["#7b61ff", "#24c1a3", "#ffb34b", "#9b6bff"],
            borderColor: "#ffffff",
            borderWidth: 3,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 14,
              font: { size: 12 },
            },
          },
        },
      },
    });
  }

  // =============================
  // 2️⃣ MONTHLY SALES - BAR
  //    (matches <canvas id="monthlySalesChart">)
  // =============================
  const salesCtx = document.getElementById("monthlySalesChart");

  if (salesCtx && window.Chart) {
    new Chart(salesCtx, {
      type: "bar",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
          {
            label: "Sales (₹)",
            data: [], // TODO: add your sales data
            backgroundColor: "#4e6bff",
            borderRadius: 8,
            barThickness: 26,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            grid: {
              borderDash: [4, 4],
              color: "#d1d6ea",
            },
          },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });
  }
});
