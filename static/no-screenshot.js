// ======================================================
//  NO-SCREENSHOT SECURITY SCRIPT  (External JS File)
//  Applies to pages where screenshots must be blocked.
// ======================================================

// 1️⃣ Block PrintScreen (PrtSc)
document.addEventListener("keyup", function (e) {
    if (e.key === "PrintScreen") {
        navigator.clipboard.writeText(""); // Clears copied screenshot
        alert("Screenshots are not allowed on this page.");
    }
});

// 2️⃣ Block Print Command (Ctrl+P / Cmd+P)
document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        alert("Printing is disabled on this page.");
    }
});

// 3️⃣ Disable Right-Click Context Menu
document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});

// 4️⃣ Disable Copy, Cut, Paste
["copy", "cut", "paste"].forEach(evt => {
    document.addEventListener(evt, function(e) {
        e.preventDefault();
    });
});

// 5️⃣ Block Developer Tools Shortcuts
document.addEventListener("keydown", function (e) {
    const key = e.key.toLowerCase();

    // F12
    if (key === "f12") e.preventDefault();

    // Ctrl + Shift + I / J / C
    if (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key)) {
        e.preventDefault();
    }

    // Ctrl + U (View Source)
    if (e.ctrlKey && key === "u") {
        e.preventDefault();
    }
});

// 6️⃣ Blur Screen on Visibility Loss (Screenshot / Recorder Detection Trick)
document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
        document.body.style.filter = "blur(18px)";
    } else {
        document.body.style.filter = "none";
    }
});
