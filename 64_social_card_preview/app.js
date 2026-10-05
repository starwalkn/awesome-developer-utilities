// Social Card Preview & OpenGraph Generator
// 100% Client-Side Engine

const DEFAULT_COVER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#312e81" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)" />
  <circle cx="200" cy="180" r="140" fill="#3b82f6" opacity="0.3" filter="blur(40px)" />
  <circle cx="1000" cy="450" r="180" fill="#ec4899" opacity="0.25" filter="blur(50px)" />
  <text x="600" y="280" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="58" font-weight="bold" fill="#ffffff" text-anchor="middle">NovaFortix Developer Suite</text>
  <text x="600" y="360" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="28" fill="#94a3b8" text-anchor="middle">High-Performance &bull; 100% Client-Side &bull; Zero Tracking</text>
  <rect x="500" y="420" width="200" height="48" rx="24" fill="#3b82f6" />
  <text x="600" y="452" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="18" font-weight="600" fill="#ffffff" text-anchor="middle">Explore Tools &rarr;</text>
</svg>
`);

// DOM elements
const inputTitle = document.getElementById('inputTitle');
const inputDesc = document.getElementById('inputDesc');
const inputUrl = document.getElementById('inputUrl');
const inputSite = document.getElementById('inputSite');
const imageUrl = document.getElementById('imageUrl');
const fileImage = document.getElementById('fileImage');
const countTitle = document.getElementById('countTitle');
const countDesc = document.getElementById('countDesc');
const metaCode = document.getElementById('metaCode');
const btnCopyMeta = document.getElementById('btnCopyMeta');
const btnLoadSample = document.getElementById('btnLoadSample');
const globalToast = document.getElementById('globalToast');

// Preview DOM elements
const discordSite = document.getElementById('discordSite');
const discordTitle = document.getElementById('discordTitle');
const discordDesc = document.getElementById('discordDesc');
const discordImg = document.getElementById('discordImg');

const twitterDomain = document.getElementById('twitterDomain');
const twitterTitle = document.getElementById('twitterTitle');
const twitterDesc = document.getElementById('twitterDesc');
const twitterImg = document.getElementById('twitterImg');

const googleSite = document.getElementById('googleSite');
const googleUrl = document.getElementById('googleUrl');
const googleTitle = document.getElementById('googleTitle');
const googleDesc = document.getElementById('googleDesc');

const fbDomain = document.getElementById('fbDomain');
const fbTitle = document.getElementById('fbTitle');
const fbDesc = document.getElementById('fbDesc');
const fbImg = document.getElementById('fbImg');

let currentCoverSrc = DEFAULT_COVER;

// Extract clean domain from URL
function getDomain(urlStr) {
    try {
        const u = new URL(urlStr.startsWith('http') ? urlStr : 'https://' + urlStr);
        return u.hostname || 'example.com';
    } catch {
        return 'example.com';
    }
}

// Update all preview cards
function updatePreviews() {
    const title = inputTitle.value.trim() || 'Next-Gen Developer Utilities | Fast, Private & Free';
    const desc = inputDesc.value.trim() || 'Instant client-side tools for developers, designers and creators. No tracking, zero servers, zero cookies.';
    const url = inputUrl.value.trim() || 'https://novafortixlab.com/tools';
    const site = inputSite.value.trim() || 'NovaFortix Tools';
    const domain = getDomain(url);

    // Update Counters
    countTitle.textContent = `${inputTitle.value.length} / 60`;
    if (inputTitle.value.length > 70) countTitle.className = 'char-count err';
    else if (inputTitle.value.length > 60) countTitle.className = 'char-count warn';
    else countTitle.className = 'char-count';

    countDesc.textContent = `${inputDesc.value.length} / 160`;
    if (inputDesc.value.length > 180) countDesc.className = 'char-count err';
    else if (inputDesc.value.length > 160) countDesc.className = 'char-count warn';
    else countDesc.className = 'char-count';

    // 1. Discord
    discordSite.textContent = site;
    discordTitle.textContent = title;
    discordDesc.textContent = desc;
    discordImg.src = currentCoverSrc;

    // 2. Twitter / X
    twitterDomain.textContent = domain;
    twitterTitle.textContent = title;
    twitterDesc.textContent = desc;
    twitterImg.src = currentCoverSrc;

    // 3. Google SERP
    googleSite.textContent = site;
    googleUrl.textContent = url;
    googleTitle.textContent = `${title} — ${site}`;
    googleDesc.textContent = desc;

    // 4. Facebook
    fbDomain.textContent = domain.toUpperCase();
    fbTitle.textContent = title;
    fbDesc.textContent = desc;
    fbImg.src = currentCoverSrc;

    // Generate HTML Meta tags
    generateMetaTags(title, desc, url, site);
}

function generateMetaTags(title, desc, url, site) {
    const imgSource = imageUrl.value.trim() || 'https://example.com/assets/og-image.png';

    const tags = `<!-- Primary Meta Tags -->
<title>${escapeHtml(title)}</title>
<meta name="title" content="${escapeHtml(title)}">
<meta name="description" content="${escapeHtml(desc)}">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:site_name" content="${escapeHtml(site)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:image" content="${escapeHtml(imgSource)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<!-- Twitter / X -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:url" content="${escapeHtml(url)}">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc)}">
<meta name="twitter:image" content="${escapeHtml(imgSource)}">`;

    metaCode.textContent = tags;
}

function escapeHtml(str) {
    return str.replace(/"/g, '&quot;');
}

// Platform Tabs Switcher
document.querySelectorAll('.plat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.plat-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.target;
        document.querySelectorAll('.preview-box').forEach(box => box.classList.add('hidden'));
        document.getElementById(`view-${target}`)?.classList.remove('hidden');
    });
});

// Input event listeners
[inputTitle, inputDesc, inputUrl, inputSite].forEach(el => {
    el.addEventListener('input', updatePreviews);
});

// Image URL listener
imageUrl.addEventListener('input', () => {
    const val = imageUrl.value.trim();
    if (val) {
        currentCoverSrc = val;
    } else {
        currentCoverSrc = DEFAULT_COVER;
    }
    updatePreviews();
});

// Local Image File upload listener
fileImage.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        currentCoverSrc = event.target.result;
        imageUrl.value = ''; // clear text URL
        updatePreviews();
        showToast(`Loaded ${file.name}`);
    };
    reader.readAsDataURL(file);
});

// Preset Sample Loader
btnLoadSample.addEventListener('click', () => {
    inputTitle.value = 'Ultimate Web & AI Developer Toolkit';
    inputDesc.value = 'Zero-bloat suite containing Visual Cron Builder, LLM Token Calculator, Image Color Extractor, and JWT Inspector. 100% private in-browser tools.';
    inputUrl.value = 'https://novafortixlab.com/tools';
    inputSite.value = 'NovaFortix Tools';
    currentCoverSrc = DEFAULT_COVER;
    imageUrl.value = '';
    updatePreviews();
    showToast('Loaded preset example!');
});

// Copy Meta tags
btnCopyMeta.addEventListener('click', () => {
    navigator.clipboard.writeText(metaCode.textContent).then(() => {
        showToast('Meta tags copied to clipboard!');
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

// Initialize
inputTitle.value = 'Universal Developer & AI Productivity Suite';
inputDesc.value = 'Free client-side tools for developers and creators. Fast, responsive, and completely private with zero server tracking.';
inputUrl.value = 'https://novafortixlab.com';
inputSite.value = 'NovaFortix Suite';
updatePreviews();
