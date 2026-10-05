// Visual CIDR & Subnet Calculator Engine
// 100% Client-Side IPv4 Mathematics

// DOM Elements
const ipInput = document.getElementById('ipInput');
const prefixSelect = document.getElementById('prefixSelect');
const prefixSlider = document.getElementById('prefixSlider');
const sliderVal = document.getElementById('sliderVal');
const resNetmask = document.getElementById('resNetmask');
const resWildcard = document.getElementById('resWildcard');
const resNetwork = document.getElementById('resNetwork');
const resBroadcast = document.getElementById('resBroadcast');
const resUsableRange = document.getElementById('resUsableRange');
const resHosts = document.getElementById('resHosts');
const resTotalIps = document.getElementById('resTotalIps');
const binIp = document.getElementById('binIp');
const bitsNet = document.getElementById('bitsNet');
const bitsHost = document.getElementById('bitsHost');
const countNetBits = document.getElementById('countNetBits');
const countHostBits = document.getElementById('countHostBits');
const sliceSelect = document.getElementById('sliceSelect');
const slicingBody = document.getElementById('slicingBody');
const globalToast = document.getElementById('globalToast');

// ─── IPv4 Conversion Utilities ───────────────────────────────────────────────
function ipToInt(ip) {
    const parts = ip.trim().split('.').map(Number);
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
        return null;
    }
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function intToIp(intVal) {
    return [
        (intVal >>> 24) & 255,
        (intVal >>> 16) & 255,
        (intVal >>> 8) & 255,
        intVal & 255
    ].join('.');
}

function prefixToMask(prefix) {
    if (prefix === 0) return 0;
    return (~0 << (32 - prefix)) >>> 0;
}

function intToBinaryStr(intVal) {
    let str = (intVal >>> 0).toString(2).padStart(32, '0');
    return `${str.slice(0, 8)}.${str.slice(8, 16)}.${str.slice(16, 24)}.${str.slice(24, 32)}`;
}

// ─── Initialize Prefix Select ────────────────────────────────────────────────
function initPrefixOptions() {
    prefixSelect.innerHTML = '';
    for (let p = 32; p >= 0; p--) {
        const maskStr = intToIp(prefixToMask(p));
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = `/${p} — ${maskStr}`;
        if (p === 24) opt.selected = true;
        prefixSelect.appendChild(opt);
    }
}

// ─── Recalculate Subnet & UI ──────────────────────────────────────────────────
function calculate() {
    const rawIp = ipInput.value.trim();
    const prefix = parseInt(prefixSelect.value, 10);
    const ipVal = ipToInt(rawIp);

    if (ipVal === null) {
        resNetwork.textContent = 'Invalid IP Address';
        resNetmask.textContent = '—';
        resWildcard.textContent = '—';
        resBroadcast.textContent = '—';
        resUsableRange.textContent = '—';
        resHosts.textContent = '—';
        resTotalIps.textContent = '—';
        return;
    }

    const maskVal = prefixToMask(prefix);
    const wildcardVal = (~maskVal) >>> 0;
    const netVal = (ipVal & maskVal) >>> 0;
    const broadVal = (netVal | wildcardVal) >>> 0;

    const totalIps = prefix === 0 ? 4294967296 : 2 ** (32 - prefix);
    let usableHosts = 0;
    let usableRange = '';

    if (prefix === 32) {
        usableHosts = 1;
        usableRange = intToIp(netVal);
    } else if (prefix === 31) {
        usableHosts = 2; // RFC 3021
        usableRange = `${intToIp(netVal)} — ${intToIp(broadVal)}`;
    } else {
        usableHosts = Math.max(0, totalIps - 2);
        usableRange = `${intToIp(netVal + 1)} — ${intToIp(broadVal - 1)}`;
    }

    // Update Stats Display
    resNetmask.textContent = intToIp(maskVal);
    resWildcard.textContent = intToIp(wildcardVal);
    resNetwork.textContent = intToIp(netVal);
    resBroadcast.textContent = intToIp(broadVal);
    resUsableRange.textContent = usableRange;
    resHosts.textContent = usableHosts.toLocaleString();
    resTotalIps.textContent = totalIps.toLocaleString();

    // Update Binary Representation
    binIp.textContent = intToBinaryStr(ipVal);

    // Format Mask bits with highlight
    const maskBinRaw = (maskVal >>> 0).toString(2).padStart(32, '0');
    let netBitStr = '';
    let hostBitStr = '';

    for (let i = 0; i < 32; i++) {
        const bit = maskBinRaw[i];
        if (i < prefix) {
            netBitStr += bit;
            if ((i + 1) % 8 === 0 && i !== 31) netBitStr += '.';
        } else {
            hostBitStr += bit;
            if ((i + 1) % 8 === 0 && i !== 31) hostBitStr += '.';
        }
    }

    bitsNet.textContent = netBitStr;
    bitsHost.textContent = hostBitStr;
    countNetBits.textContent = prefix;
    countHostBits.textContent = 32 - prefix;

    // Update Slicing Options
    updateSlicing(netVal, prefix);
}

// ─── Subnet Partitioning / Slicing Planner ───────────────────────────────────
function updateSlicing(netVal, basePrefix) {
    const currentVal = parseInt(sliceSelect.value, 10);
    sliceSelect.innerHTML = '';

    if (basePrefix >= 30) {
        sliceSelect.innerHTML = '<option value="">No subnets available</option>';
        slicingBody.innerHTML = '<tr><td colspan="4" style="color:var(--muted); text-align:center;">Network prefix too small to partition further.</td></tr>';
        return;
    }

    const maxSlice = Math.min(basePrefix + 6, 32);
    for (let p = basePrefix + 1; p <= maxSlice; p++) {
        const count = 2 ** (p - basePrefix);
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = `/${p} (${count} equal subnets)`;
        if (p === (currentVal || basePrefix + 2)) opt.selected = true;
        sliceSelect.appendChild(opt);
    }

    renderSlicingTable(netVal, basePrefix);
}

function renderSlicingTable(netVal, basePrefix) {
    const targetPrefix = parseInt(sliceSelect.value, 10);
    if (!targetPrefix || targetPrefix <= basePrefix) return;

    const numSubnets = 2 ** (targetPrefix - basePrefix);
    const subnetSize = 2 ** (32 - targetPrefix);
    const limit = Math.min(numSubnets, 16); // render up to 16 for UI performance

    let rows = '';
    for (let i = 0; i < limit; i++) {
        const subNet = (netVal + (i * subnetSize)) >>> 0;
        const subBroad = (subNet + subnetSize - 1) >>> 0;

        let rangeStr = '';
        let hosts = 0;
        if (targetPrefix === 32) {
            rangeStr = intToIp(subNet);
            hosts = 1;
        } else if (targetPrefix === 31) {
            rangeStr = `${intToIp(subNet)} — ${intToIp(subBroad)}`;
            hosts = 2;
        } else {
            rangeStr = `${intToIp(subNet + 1)} — ${intToIp(subBroad - 1)}`;
            hosts = subnetSize - 2;
        }

        rows += `
            <tr>
                <td style="color:var(--accent2); font-weight:700;">${intToIp(subNet)}/${targetPrefix}</td>
                <td style="color:#86efac;">${rangeStr}</td>
                <td style="color:var(--muted);">${intToIp(subBroad)}</td>
                <td style="color:#fdba74; font-weight:700;">${hosts.toLocaleString()}</td>
            </tr>
        `;
    }

    if (numSubnets > limit) {
        rows += `<tr><td colspan="4" style="color:var(--muted); text-align:center; font-style:italic;">... and ${numSubnets - limit} more subnets</td></tr>`;
    }

    slicingBody.innerHTML = rows;
}

// ─── Event Handlers ──────────────────────────────────────────────────────────
ipInput.addEventListener('input', calculate);

prefixSelect.addEventListener('change', () => {
    prefixSlider.value = prefixSelect.value;
    sliderVal.textContent = `/${prefixSelect.value}`;
    calculate();
});

prefixSlider.addEventListener('input', () => {
    prefixSelect.value = prefixSlider.value;
    sliderVal.textContent = `/${prefixSlider.value}`;
    calculate();
});

sliceSelect.addEventListener('change', () => {
    const rawIp = ipInput.value.trim();
    const prefix = parseInt(prefixSelect.value, 10);
    const ipVal = ipToInt(rawIp);
    if (ipVal !== null) {
        const maskVal = prefixToMask(prefix);
        const netVal = (ipVal & maskVal) >>> 0;
        renderSlicingTable(netVal, prefix);
    }
});

document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
        ipInput.value = btn.dataset.ip;
        prefixSelect.value = btn.dataset.prefix;
        prefixSlider.value = btn.dataset.prefix;
        sliderVal.textContent = `/${btn.dataset.prefix}`;
        calculate();
        showToast(`Loaded ${btn.textContent} preset!`);
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

// ─── Init ────────────────────────────────────────────────────────────────────
initPrefixOptions();
calculate();
