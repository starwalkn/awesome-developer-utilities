// Image Color Palette Extractor — 100% Client-Side Engine
let currentImage = null;
let extractedColors = [];
let activeTab = 'css';

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const workspaceGrid = document.getElementById('workspaceGrid');
const imageCanvas = document.getElementById('imageCanvas');
const canvasWrapper = document.getElementById('canvasWrapper');
const ctx = imageCanvas.getContext('2d');
const loupe = document.getElementById('loupe');
const loupePreview = document.getElementById('loupePreview');
const loupeHex = document.getElementById('loupeHex');
const colorCountSelect = document.getElementById('colorCount');
const colorSortSelect = document.getElementById('colorSort');
const swatchesGrid = document.getElementById('swatchesGrid');
const exportTabs = document.querySelectorAll('.export-tab');
const exportCode = document.getElementById('exportCode');
const btnCopyCode = document.getElementById('btnCopyCode');
const btnDownloadSvg = document.getElementById('btnDownloadSvg');
const sampleButtons = document.querySelectorAll('.btn-sample');
const globalToast = document.getElementById('globalToast');

// ─── Color Helpers ───────────────────────────────────────────────────────────
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function colorDistance(c1, c2) {
    // Weighted Euclidean distance for human perception
    const rmean = (c1.r + c2.r) / 2;
    const r = c1.r - c2.r;
    const g = c1.g - c2.g;
    const b = c1.b - c2.b;
    return Math.sqrt((((512 + rmean) * r * r) >> 8) + 4 * g * g + (((767 - rmean) * b * b) >> 8));
}

// ─── Palette Extraction Algorithm ────────────────────────────────────────────
function extractPalette(img, maxColors = 8, sortBy = 'dominance') {
    // Render downsampled image onto small offscreen canvas for instantaneous sampling
    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d');
    const sampleSize = 160;
    const scale = Math.min(sampleSize / img.naturalWidth, sampleSize / img.naturalHeight, 1);
    const sw = Math.floor(img.naturalWidth * scale);
    const sh = Math.floor(img.naturalHeight * scale);

    offCanvas.width = sw;
    offCanvas.height = sh;
    offCtx.drawImage(img, 0, 0, sw, sh);

    const imgData = offCtx.getImageData(0, 0, sw, sh).data;
    const colorBins = new Map();

    // Quantize into 5-bit color space (32 levels per channel = 32768 bins)
    for (let i = 0; i < imgData.length; i += 4) {
        const a = imgData[i + 3];
        if (a < 128) continue; // ignore transparent pixels

        const r = Math.round(imgData[i] / 8) * 8;
        const g = Math.round(imgData[i + 1] / 8) * 8;
        const b = Math.round(imgData[i + 2] / 8) * 8;

        const key = `${r},${g},${b}`;
        colorBins.set(key, (colorBins.get(key) || 0) + 1);
    }

    // Convert map to array and sort by frequency
    let rawColors = [];
    colorBins.forEach((count, key) => {
        const [r, g, b] = key.split(',').map(Number);
        rawColors.push({ r, g, b, count });
    });
    rawColors.sort((a, b) => b.count - a.count);

    // Cluster / Merge distinct colors to prevent identical swatches
    const distinctColors = [];
    const minDistanceThreshold = 42; // Minimum perceptual color difference

    for (const c of rawColors) {
        let isDistinct = true;
        for (const d of distinctColors) {
            if (colorDistance(c, d) < minDistanceThreshold) {
                d.count += c.count; // Merge weight
                isDistinct = false;
                break;
            }
        }
        if (isDistinct) {
            distinctColors.push({ ...c });
        }
        if (distinctColors.length >= maxColors * 2) break;
    }

    // Take top maxColors
    let finalColors = distinctColors.slice(0, maxColors);
    const totalSampleCount = finalColors.reduce((acc, c) => acc + c.count, 0) || 1;

    // Enhance each color with hex, hsl, and percentage
    finalColors = finalColors.map(c => {
        const hex = rgbToHex(c.r, c.g, c.b);
        const hsl = rgbToHsl(c.r, c.g, c.b);
        const pct = ((c.count / totalSampleCount) * 100).toFixed(1);
        return {
            r: c.r,
            g: c.g,
            b: c.b,
            hex,
            hsl,
            pct,
            rgbString: `rgb(${c.r}, ${c.g}, ${c.b})`
        };
    });

    // Apply Sorting
    if (sortBy === 'hue') {
        finalColors.sort((a, b) => a.hsl.h - b.hsl.h);
    } else if (sortBy === 'lightness') {
        finalColors.sort((a, b) => b.hsl.l - a.hsl.l);
    } // default is dominance (already sorted)

    return finalColors;
}

// ─── Render Canvas & Palette ─────────────────────────────────────────────────
function displayImageAndPalette(img) {
    currentImage = img;
    workspaceGrid.style.display = 'grid';

    // Draw on main interactive canvas
    const maxW = 540;
    const maxH = 400;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    const ratio = Math.min(maxW / w, maxH / h, 1);

    imageCanvas.width = Math.floor(w * ratio);
    imageCanvas.height = Math.floor(h * ratio);
    ctx.drawImage(img, 0, 0, imageCanvas.width, imageCanvas.height);

    updatePalette();
}

function updatePalette() {
    if (!currentImage) return;

    const count = parseInt(colorCountSelect.value, 10);
    const sort = colorSortSelect.value;
    extractedColors = extractPalette(currentImage, count, sort);

    // Render Swatches Grid
    swatchesGrid.innerHTML = '';
    extractedColors.forEach((color, idx) => {
        const card = document.createElement('div');
        card.className = 'swatch-card';
        card.innerHTML = `
            <div class="swatch-color" style="background-color: ${color.hex};">
                <span class="swatch-copy-hint">Copy</span>
            </div>
            <div class="swatch-meta">
                <span class="swatch-hex">${color.hex.toUpperCase()}</span>
                <span class="swatch-rgb">${color.rgbString}</span>
                <span class="swatch-pct">${color.pct}% of image</span>
            </div>
        `;

        card.addEventListener('click', () => {
            navigator.clipboard.writeText(color.hex).then(() => {
                showToast(`Copied ${color.hex.toUpperCase()} to clipboard!`);
            });
        });

        swatchesGrid.appendChild(card);
    });

    updateExportCode();
}

// ─── Code Export Suite ───────────────────────────────────────────────────────
function updateExportCode() {
    if (extractedColors.length === 0) return;

    let code = '';
    if (activeTab === 'css') {
        code = `:root {\n` +
            extractedColors.map((c, i) => `  --color-${i + 1}: ${c.hex}; /* ${c.pct}% */`).join('\n') +
            `\n}`;
    } else if (activeTab === 'tailwind') {
        const shades = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        code = `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n        palette: {\n` +
            extractedColors.map((c, i) => `          ${shades[i] || (i + 1) * 100}: '${c.hex}',`).join('\n') +
            `\n        }\n      }\n    }\n  }\n};`;
    } else if (activeTab === 'json') {
        code = JSON.stringify(extractedColors.map(c => ({
            hex: c.hex,
            rgb: c.rgbString,
            hsl: `hsl(${c.hsl.h}, ${c.hsl.s}%, ${c.hsl.l}%)`,
            coverage: `${c.pct}%`
        })), null, 2);
    } else if (activeTab === 'hex') {
        code = extractedColors.map(c => c.hex.toUpperCase()).join('\n');
    }

    exportCode.textContent = code;
}

// ─── SVG Swatch Download ─────────────────────────────────────────────────────
btnDownloadSvg.addEventListener('click', () => {
    if (extractedColors.length === 0) return;

    const swatchW = 120;
    const swatchH = 140;
    const totalW = extractedColors.length * swatchW;
    const totalH = swatchH;

    let rects = '';
    extractedColors.forEach((c, i) => {
        const x = i * swatchW;
        rects += `
        <g transform="translate(${x}, 0)">
            <rect width="${swatchW}" height="${swatchH - 40}" fill="${c.hex}"/>
            <rect y="${swatchH - 40}" width="${swatchW}" height="40" fill="#0f172a"/>
            <text x="${swatchW / 2}" y="${swatchH - 18}" fill="#ffffff" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">${c.hex.toUpperCase()}</text>
        </g>`;
    });

    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">${rects}</svg>`;
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `palette_${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded SVG Swatch!');
});

// ─── Eyedropper Loupe Interactions ───────────────────────────────────────────
imageCanvas.addEventListener('mousemove', (e) => {
    const rect = imageCanvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    if (x >= 0 && x < imageCanvas.width && y >= 0 && y < imageCanvas.height) {
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);

        loupe.style.display = 'flex';
        loupe.style.left = `${e.clientX - canvasWrapper.getBoundingClientRect().left}px`;
        loupe.style.top = `${e.clientY - canvasWrapper.getBoundingClientRect().top}px`;
        loupePreview.style.backgroundColor = hex;
        loupeHex.textContent = hex.toUpperCase();
    }
});

imageCanvas.addEventListener('mouseleave', () => {
    loupe.style.display = 'none';
});

imageCanvas.addEventListener('click', (e) => {
    const rect = imageCanvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);

    navigator.clipboard.writeText(hex).then(() => {
        showToast(`Copied picked color ${hex.toUpperCase()}!`);
    });
});

// ─── File Upload & Drag-and-Drop ─────────────────────────────────────────────
dropzone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        loadUploadedFile(e.target.files[0]);
    }
});

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        loadUploadedFile(e.dataTransfer.files[0]);
    }
});

function loadUploadedFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file (PNG, JPG, WebP, SVG, etc.)');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => displayImageAndPalette(img);
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// ─── Curated Procedural Sample Generator ─────────────────────────────────────
function generateSampleImage(type) {
    const c = document.createElement('canvas');
    c.width = 600;
    c.height = 400;
    const cx = c.getContext('2d');

    if (type === 'cyberpunk') {
        const grad = cx.createLinearGradient(0, 0, 600, 400);
        grad.addColorStop(0, '#09090b');
        grad.addColorStop(0.4, '#1e1b4b');
        grad.addColorStop(0.7, '#4c1d95');
        grad.addColorStop(1, '#831843');
        cx.fillStyle = grad;
        cx.fillRect(0, 0, 600, 400);

        cx.fillStyle = '#06b6d4';
        cx.beginPath();
        cx.arc(200, 220, 110, 0, Math.PI * 2);
        cx.fill();

        cx.fillStyle = '#f43f5e';
        cx.beginPath();
        cx.arc(380, 180, 80, 0, Math.PI * 2);
        cx.fill();

        cx.fillStyle = '#facc15';
        cx.fillRect(120, 280, 360, 40);
    } else if (type === 'sunset') {
        const grad = cx.createLinearGradient(0, 0, 0, 400);
        grad.addColorStop(0, '#431407');
        grad.addColorStop(0.3, '#c2410c');
        grad.addColorStop(0.6, '#ea580c');
        grad.addColorStop(0.85, '#facc15');
        grad.addColorStop(1, '#1e293b');
        cx.fillStyle = grad;
        cx.fillRect(0, 0, 600, 400);

        // Sun
        cx.fillStyle = '#fef08a';
        cx.beginPath();
        cx.arc(300, 240, 70, 0, Math.PI * 2);
        cx.fill();
    } else if (type === 'nature') {
        const grad = cx.createLinearGradient(0, 0, 600, 400);
        grad.addColorStop(0, '#064e3b');
        grad.addColorStop(0.5, '#047857');
        grad.addColorStop(0.8, '#10b981');
        grad.addColorStop(1, '#a7f3d0');
        cx.fillStyle = grad;
        cx.fillRect(0, 0, 600, 400);

        cx.fillStyle = '#1e293b';
        cx.fillRect(0, 320, 600, 80);

        cx.fillStyle = '#78350f';
        cx.fillRect(260, 180, 80, 140);
    } else if (type === 'minimal') {
        cx.fillStyle = '#f5f5f4';
        cx.fillRect(0, 0, 600, 400);

        cx.fillStyle = '#d6d3d1';
        cx.beginPath();
        cx.arc(220, 200, 90, 0, Math.PI * 2);
        cx.fill();

        cx.fillStyle = '#78716c';
        cx.fillRect(320, 150, 140, 160);

        cx.fillStyle = '#b45309';
        cx.beginPath();
        cx.arc(420, 120, 35, 0, Math.PI * 2);
        cx.fill();
    }

    const img = new Image();
    img.onload = () => displayImageAndPalette(img);
    img.src = c.toDataURL();
}

sampleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        generateSampleImage(btn.dataset.sample);
        showToast(`Loaded ${btn.textContent.trim()} sample!`);
    });
});

// ─── Controls & Tabs Listeners ───────────────────────────────────────────────
colorCountSelect.addEventListener('change', updatePalette);
colorSortSelect.addEventListener('change', updatePalette);

exportTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        exportTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeTab = tab.dataset.tab;
        updateExportCode();
    });
});

btnCopyCode.addEventListener('click', () => {
    navigator.clipboard.writeText(exportCode.textContent).then(() => {
        showToast('Code copied to clipboard!');
    });
});

function copyEmail() {
    navigator.clipboard.writeText('donate@novafortixlab.com').then(() => {
        showToast('Email copied: donate@novafortixlab.com');
    });
}

function showToast(msg) {
    globalToast.textContent = msg;
    globalToast.classList.add('show');
    setTimeout(() => globalToast.classList.remove('show'), 2000);
}

// ─── Initialize with Cyberpunk Sample on First Load ─────────────────────────
generateSampleImage('cyberpunk');
