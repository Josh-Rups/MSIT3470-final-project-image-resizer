// IMPORTANT: keep your real API URL here
const API_URL = "https://8xob6xirxj.execute-api.us-east-1.amazonaws.com/prod/resize";

let currentFile = null;
let selectedSize = "small";
let imagesProcessed = 0;
let lastSize = "-";
let lastStatus = "-";

// Toast helper
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.transition = "opacity 0.4s ease";
        toast.style.opacity = "0";

        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// Accent theme selector
document.querySelectorAll(".theme-dot").forEach(dot => {
    dot.addEventListener("click", () => {
        const accent = dot.getAttribute("data-accent");
        let primary, primaryDark;

        if (accent === "green") {
            primary = "#16a34a"; primaryDark = "#15803d";
        } else if (accent === "purple") {
            primary = "#7c3aed"; primaryDark = "#6d28d9";
        } else if (accent === "orange") {
            primary = "#ea580c"; primaryDark = "#c2410c";
        } else {
            primary = "#2563eb"; primaryDark = "#1d4ed8";
        }

        document.documentElement.style.setProperty("--primary", primary);
        document.documentElement.style.setProperty("--primary-dark", primaryDark);
    });
});

// Dark / light mode toggle
document.querySelectorAll(".mode-pill").forEach(btn => {
    btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-mode");
        document.body.setAttribute("data-theme", mode);

        document.querySelectorAll(".mode-pill").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
    });
});

// File → base64 helper
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// Helper to get image dimensions
function getImageDimensions(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
            resolve({ width: "-", height: "-" });
        };
        img.src = src;
    });
}

// Show original preview as soon as a file is selected/dropped
async function showOriginalPreview(file) {
    const result = document.getElementById("result");

    if (!file) {
        result.innerHTML = '<div class="status info">No thumbnail generated yet.</div>';
        return;
    }

    try {
        const dataUrl = await toBase64(file);
        const dims = await getImageDimensions(dataUrl);

        result.innerHTML = `
            <div class="result-grid">
                <div>
                    <div class="result-panel-title">Original image (preview)</div>
                    <div class="image-frame">
                        <img src="${dataUrl}" alt="original preview">
                    </div>
                    <div class="result-meta">
                        ${dims.width} × ${dims.height} px
                    </div>
                </div>
                <div>
                    <div class="result-panel-title">Thumbnail</div>
                    <div class="image-frame placeholder-frame">
                        <div class="placeholder-text">
                            Click "Upload & Resize" to generate a thumbnail.
                        </div>
                    </div>
                </div>
            </div>
            <div class="result-url result-url-muted">
                Presigned URL will appear here after resizing.
            </div>
        `;
    } catch (e) {
        console.error("Preview error:", e);
        result.innerHTML = '<div class="status error">Unable to preview image.</div>';
    }
}

// Progress bar control
const progressBar = document.getElementById("progress-bar");
function startProgress() {
    progressBar.classList.add("active");
}
function stopProgress() {
    progressBar.classList.remove("active");
    progressBar.style.opacity = "0";
}

// File input change
document.getElementById("fileInput").addEventListener("change", async (e) => {
    if (!e.target.files.length) {
        currentFile = null;
        document.getElementById("fileName").textContent = "No file selected yet";
        await showOriginalPreview(null);
        return;
    }
    currentFile = e.target.files[0];
    document.getElementById("fileName").textContent = currentFile.name;
    await showOriginalPreview(currentFile);
});

// Drag & drop
const dropZone = document.getElementById("dropZone");
dropZone.addEventListener("click", (e) => {
    // If the user clicked directly on the file input or the fake button,
    // let the normal browser behavior handle it.
    if (e.target.id === "fileInput" || e.target.closest(".file-input-wrapper")) {
        return;
    }

    // Otherwise (click in empty drop area), open the file picker manually
    document.getElementById("fileInput").click();
});
dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("active");
});
dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("active");
});
dropZone.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropZone.classList.remove("active");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        currentFile = e.dataTransfer.files[0];
        document.getElementById("fileName").textContent = currentFile.name;
        await showOriginalPreview(currentFile);
    }
});

// Size chips
document.querySelectorAll("#sizeChips .chip").forEach(chip => {
    chip.addEventListener("click", () => {
        document.querySelectorAll("#sizeChips .chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        selectedSize = chip.getAttribute("data-size");
    });
});

// Stats updater
function updateStats(success) {
    if (success) {
        imagesProcessed += 1;
        lastStatus = "success";
    } else {
        lastStatus = "error";
    }
    lastSize = selectedSize;

    document.getElementById("statImages").textContent = imagesProcessed;
    document.getElementById("statLastSize").textContent = lastSize;
    document.getElementById("statLastStatus").textContent = lastStatus;
}

// Upload handler
document.getElementById("uploadBtn").onclick = async () => {
    const status = document.getElementById("status");
    const result = document.getElementById("result");
    const history = document.getElementById("history");
    const btn = document.getElementById("uploadBtn");
    const btnIcon = document.getElementById("btnIcon");
    const btnText = document.getElementById("btnText");

    if (!currentFile) {
        showToast("Please choose or drop an image file first.", "error");
        status.textContent = "Please choose or drop an image file first.";
        status.className = "status error";
        updateStats(false);
        return;
    }

    const dataUrl = await toBase64(currentFile);
    const originalDims = await getImageDimensions(dataUrl);

    const payload = {
        filename: currentFile.name,
        size: selectedSize,
        file: dataUrl.replace(/^data:.+;base64,/, "")
    };

    // Set loading state
    btn.disabled = true;
    btnIcon.innerHTML = "";
    const spinner = document.createElement("div");
    spinner.className = "spinner";
    btnIcon.appendChild(spinner);
    btnText.textContent = "Processing...";

    status.textContent = "Uploading and resizing...";
    status.className = "status info";
    showToast("Uploading and resizing image...", "info");
    startProgress();

    try {
        const resp = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const text = await resp.text();
        console.log("Raw response:", text);

        let data;
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error("Invalid JSON returned from API.");
        }

        if (!resp.ok) {
            throw new Error(data.error || "Request failed");
        }

        const url = data.url;
        const thumbDims = await getImageDimensions(url);

        status.textContent = "Thumbnail generated successfully.";
        status.className = "status success";
        showToast("Thumbnail generated successfully.", "success");
        updateStats(true);

        // Render result: original vs thumbnail + URL + copy
        result.innerHTML = `
            <div class="result-grid">
                <div>
                    <div class="result-panel-title">Original image</div>
                    <div class="image-frame">
                        <img src="${dataUrl}" alt="original preview">
                    </div>
                    <div class="result-meta">
                        ${originalDims.width} × ${originalDims.height} px
                    </div>
                </div>
                <div>
                    <div class="result-panel-title">Thumbnail (${selectedSize})</div>
                    <div class="image-frame thumb-frame">
					<img src="${url}" alt="thumbnail preview">
					</div>
                    <div class="result-meta">
                        ${thumbDims.width} × ${thumbDims.height} px
                    </div>
                </div>
            </div>
            <div class="result-url">Presigned URL:</div>
            <div class="url-row">
                <a class="url-link" href="${url}" target="_blank" rel="noopener noreferrer">
                    <span>${url}</span>
                </a>
                <button type="button" class="btn-ghost" id="copyUrlBtn">Copy URL</button>
            </div>
        `;

        // Copy button
        document.getElementById("copyUrlBtn").onclick = async () => {
            try {
                await navigator.clipboard.writeText(url);
                showToast("URL copied to clipboard.", "success");
            } catch {
                showToast("Unable to copy URL.", "error");
            }
        };

        // Add to history
        const thumbCard = document.createElement("div");
        thumbCard.className = "thumb-card";
        const img = document.createElement("img");
        img.src = url;
        img.alt = "thumbnail";

        const overlay = document.createElement("div");
        overlay.className = "thumb-overlay";

        const hoverMeta = document.createElement("div");
        hoverMeta.className = "hover-meta";

        const hoverSize = document.createElement("div");
        hoverSize.className = "hover-size";
        hoverSize.textContent = selectedSize;

        const hoverTime = document.createElement("div");
        hoverTime.className = "hover-time";
        hoverTime.textContent = new Date().toLocaleTimeString();

        hoverMeta.appendChild(hoverSize);
        hoverMeta.appendChild(hoverTime);
        overlay.appendChild(hoverMeta);

        thumbCard.appendChild(img);
        thumbCard.appendChild(overlay);

        thumbCard.onclick = () => window.open(url, "_blank");
        history.appendChild(thumbCard);

    } catch (err) {
        console.error("Unexpected error:", err);
        status.textContent = "Error: " + err.message;
        status.className = "status error";
        showToast("Error: " + err.message, "error");
        updateStats(false);
    } finally {
        // Reset button state
        btn.disabled = false;
        btnIcon.innerHTML = "";
        btnText.textContent = "Upload & Resize";
        stopProgress();
    }
};
