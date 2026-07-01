document.addEventListener("DOMContentLoaded", () => {
  loadTopProducts();
  loadMonthlySales();
});
 
// =============================
// 1️⃣ TOP SELLING PRODUCTS - PIE
// =============================
async function loadTopProducts() {
  const ctx = document.getElementById("topProductsChart");
  if (!ctx || !window.Chart) return;
 
  try {
    const res = await fetch("/api/top-products");
    const data = await res.json();
 
    const labels = data.map((item) => item.name);
    const values = data.map((item) => item.qty);
   const colors = [
   "#A5B4FC", // indigo
  "#67E8F9", // cyan
  "#6EE7B7", // green
  "#FDBA74", // orange
  "#FCA5A5"  // red
 
  ];
 
    Chart.Tooltip.positioners.outside = function(elements, eventPos) {
      if (!elements.length) return false;
      const arc = elements[0].element;
      const angle = (arc.startAngle + arc.endAngle) / 2;
      const r = arc.outerRadius + 16;
      const x = arc.x + Math.cos(angle) * r;
      const y = arc.y + Math.sin(angle) * r;
      return { x, y, xAlign: Math.cos(angle) >= 0 ? "left" : "right", yAlign: Math.sin(angle) >= 0 ? "top" : "bottom" };
    };
 
    const pieChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderColor: "#555555",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 14, font: { size: 12, weight: "700" }, color: "#4a1f1a" },
          },
          tooltip: {
            backgroundColor: "#fff",
            titleColor: "#a12828",
            bodyColor: "#4a1f1a",
            borderColor: "#a12828",
            borderWidth: 1.5,
            padding: 10,
            position: "outside",
            callbacks: {
              title: () => "",
              label: function(context) {
                const value = Number(context.raw) || 0;
                const data = context.dataset.data.map(Number);
                const total = data.reduce((a, b) => a + b, 0);
                const percent = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                context._percent = percent;
                return `${context.label}: ${value}`;
              },
              afterLabel: function(context) {
                return `★ ${context._percent}%`;
              },
              labelTextColor: () => "#4a1f1a",
              afterLabelColor: () => "#a12828",
            },
            bodyFont: { weight: "normal" },
            afterLabelFont: { weight: "900", size: 14 },
          },
        },
      },
    });
  } catch (e) {
    console.error("Top products chart error:", e);
  }
}
 
// =============================
// 2️⃣ MONTHLY SALES - BAR
// =============================
async function loadMonthlySales() {
  const ctx = document.getElementById("monthlySalesChart");
  if (!ctx || !window.Chart) return;
 
  try {
    const res = await fetch("/api/monthly-sales");
    const data = await res.json();
 
    const labels = data.map((item) => item.month);
    const values = data.map((item) => item.total);
const barColors = [
     "#A5B4FC", // soft indigo
  "#93C5FD", // light blue
  "#67E8F9", // cyan
  "#5EEAD4", // teal
  "#6EE7B7", // green
  "#BBF7D0", // light green
  "#FEF08A", // soft yellow
  "#FDE68A", // warm yellow
  "#FDBA74", // soft orange
  "#FCA5A5", // light red
  "#F9A8D4", // pink
  "#E9D5FF"  // lavender
 
];
    new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Sales (₹)",
            data: values,
            backgroundColor: barColors,
 
            borderColor: "#555555",
            borderWidth: 1,
            borderRadius: 8,
            barThickness: 16,
            maxBarThickness: 20,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: "#4a1f1a", font: { weight: "700" } } },
          y: {
            beginAtZero: true,
            grid: { borderDash: [4, 4], color: "#e1a3a3" },
            ticks: { color: "#4a1f1a", font: { weight: "700" } },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#fff",
            titleColor: "#a12828",
            bodyColor: "#4a1f1a",
            borderColor: "#a12828",
            borderWidth: 1.5,
            padding: 10,
            callbacks: {
              label: (ctx) => ` ₹${Number(ctx.parsed.y).toLocaleString("en-IN")}`,
            },
          },
        },
      },
    });
  } catch (e) {
    console.error("Monthly sales chart error:", e);
  }
}
 
 