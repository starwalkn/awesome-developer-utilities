// JWT Decoder & Inspector — 100% Client-Side
const SAMPLE_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMzQ1NiIsIm5hbWUiOiJBbGljZSBEb2UiLCJlbWFpbCI6ImFsaWNlQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzI3OTAyODAwLCJleHAiOjk5OTk5OTk5OTksIm5iZiI6MTcyNzkwMjgwMCwianRpIjoiYWJjZGVmLTEyMzQ1NiIsImlzcyI6Imh0dHBzOi8vYXV0aC5leGFtcGxlLmNvbSIsImF1ZCI6Imh0dHBzOi8vYXBpLmV4YW1wbGUuY29tIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// DOM refs
const jwtInput      = document.getElementById('jwtInput');
const statusBar     = document.getElementById('statusBar');
const statusIcon    = document.getElementById('statusIcon');
const statusText    = document.getElementById('statusText');
const jwtVisual     = document.getElementById('jwtVisual');
const visHeader     = document.getElementById('visHeader');
const visPayload    = document.getElementById('visPayload');
const visSignature  = document.getElementById('visSignature');
const headerJson    = document.getElementById('headerJson');
const payloadJson   = document.getElementById('payloadJson');
const headerBadges  = document.getElementById('headerBadges');
const payloadBadges = document.getElementById('payloadBadges');
const sigRaw        = document.getElementById('sigRaw');
const sigInfo       = document.getElementById('sigInfo');
const verifySection = document.getElementById('verifySection');
const secretInput   = document.getElementById('secretInput');
const verifyResult  = document.getElementById('verifyResult');
const claimsCard    = document.getElementById('claimsCard');
const claimsBody    = document.getElementById('claimsBody');
const globalToast   = document.getElementById('globalToast');

// ─── Base64URL Decode ────────────────────────────────────────────────────────
function base64UrlDecode(str) {
    // Pad to multiple of 4
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4 !== 0) str += '=';
    try {
        return atob(str);
    } catch {
        throw new Error('Invalid Base64URL string');
    }
}

function parseSegment(segment) {
    const raw = base64UrlDecode(segment);
    return JSON.parse(raw);
}

// ─── JSON Syntax Highlighter ─────────────────────────────────────────────────
function highlightJson(obj) {
    const str = JSON.stringify(obj, null, 2);
    return str.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'json-key';
                } else {
                    cls = 'json-string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'json-bool';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return `<span class="${cls}">${match}</span>`;
        }
    );
}

// ─── Timestamp Formatter ─────────────────────────────────────────────────────
function formatTimestamp(ts) {
    if (!ts || typeof ts !== 'number') return null;
    const d = new Date(ts * 1000);
    return d.toISOString().replace('T', ' ').replace('Z', ' UTC');
}

function isExpired(exp) {
    if (!exp) return null;
    return Date.now() / 1000 > exp;
}

// ─── Status Bar Update ───────────────────────────────────────────────────────
function setStatus(type, icon, text) {
    statusBar.className = `status-bar status-${type}`;
    statusIcon.textContent = icon;
    statusText.textContent = text;
}

// ─── Claims Table Row ────────────────────────────────────────────────────────
const REGISTERED_CLAIMS = [
    { key: 'iss', name: 'Issuer', type: 'string' },
    { key: 'sub', name: 'Subject', type: 'string' },
    { key: 'aud', name: 'Audience', type: 'string' },
    { key: 'exp', name: 'Expiration Time', type: 'timestamp' },
    { key: 'nbf', name: 'Not Before', type: 'timestamp' },
    { key: 'iat', name: 'Issued At', type: 'timestamp' },
    { key: 'jti', name: 'JWT ID', type: 'string' },
];

function renderClaimsTable(payload) {
    const now = Date.now() / 1000;
    const rows = REGISTERED_CLAIMS.map(({ key, name, type }) => {
        const value = payload[key];
        if (value === undefined) {
            return `<tr><td>${key}</td><td>${name}</td><td class="status-missing">—</td><td class="status-missing">Not Present</td></tr>`;
        }
        let displayVal = value;
        let status = '<span class="status-ok">✓ Present</span>';

        if (type === 'timestamp') {
            displayVal = `${value} (${formatTimestamp(value)})`;
            if (key === 'exp') {
                if (now > value) {
                    status = `<span class="status-warn">⚠ EXPIRED ${Math.floor((now - value) / 60)} min ago</span>`;
                } else {
                    const left = value - now;
                    const mins = Math.floor(left / 60);
                    const hrs  = Math.floor(left / 3600);
                    const unit = hrs > 1 ? `${hrs}h` : `${mins}m`;
                    status = `<span class="status-ok">✓ Valid (expires in ${unit})</span>`;
                }
            } else if (key === 'nbf' && now < value) {
                status = `<span class="status-warn">⚠ Not yet valid</span>`;
            }
        }
        return `<tr><td>${key}</td><td>${name}</td><td>${displayVal}</td><td>${status}</td></tr>`;
    });
    claimsBody.innerHTML = rows.join('');
}

// ─── Main Decode Function ────────────────────────────────────────────────────
function decodeJWT(raw) {
    raw = raw.trim();
    if (!raw) {
        resetUI();
        return;
    }

    const parts = raw.split('.');
    if (parts.length !== 3) {
        setStatus('invalid', '❌', `Invalid JWT format: expected 3 dot-separated segments, got ${parts.length}.`);
        resetOutputCards();
        return;
    }

    // Decode Header
    let header, payload;
    try {
        header = parseSegment(parts[0]);
    } catch (e) {
        setStatus('invalid', '❌', `Failed to decode Header: ${e.message}`);
        return;
    }

    try {
        payload = parseSegment(parts[1]);
    } catch (e) {
        setStatus('invalid', '❌', `Failed to decode Payload: ${e.message}`);
        return;
    }

    // Render Colorized Visual
    jwtVisual.style.display = 'block';
    visHeader.textContent    = parts[0];
    visPayload.textContent   = parts[1];
    visSignature.textContent = parts[2];

    // Render Header Card
    headerJson.innerHTML = highlightJson(header);
    headerBadges.innerHTML = '';
    if (header.alg) headerBadges.innerHTML += `<span class="claim-badge badge-alg">alg: ${header.alg}</span>`;
    if (header.typ) headerBadges.innerHTML += `<span class="claim-badge badge-typ">typ: ${header.typ}</span>`;
    if (header.kid) headerBadges.innerHTML += `<span class="claim-badge badge-claim">kid: ${header.kid}</span>`;

    // Render Payload Card
    payloadJson.innerHTML = highlightJson(payload);
    payloadBadges.innerHTML = '';

    const exp = payload.exp;
    const now = Date.now() / 1000;
    if (exp !== undefined) {
        if (now > exp) {
            payloadBadges.innerHTML += `<span class="claim-badge badge-expired">⚠ EXPIRED</span>`;
            setStatus('expired', '⚠️', `Token is EXPIRED — expired ${Math.floor((now - exp) / 60)} minutes ago (exp: ${formatTimestamp(exp)})`);
        } else {
            const left = exp - now;
            const hrs  = Math.floor(left / 3600);
            const mins = Math.floor((left % 3600) / 60);
            payloadBadges.innerHTML += `<span class="claim-badge badge-valid">✓ Valid — expires in ${hrs > 0 ? hrs + 'h ' : ''}${mins}m</span>`;
            setStatus('valid', '✅', `Token is VALID — expires in ${hrs > 0 ? hrs + 'h ' : ''}${mins}m (${formatTimestamp(exp)})`);
        }
    } else {
        payloadBadges.innerHTML += `<span class="claim-badge badge-claim">No expiry (exp not set)</span>`;
        setStatus('valid', '✅', 'Token structure is valid. No expiry claim (exp) found — token does not expire.');
    }
    if (payload.sub) payloadBadges.innerHTML += `<span class="claim-badge badge-claim">sub: ${payload.sub}</span>`;
    if (payload.iss) payloadBadges.innerHTML += `<span class="claim-badge badge-claim">iss: ${payload.iss}</span>`;

    // Render Signature Panel
    sigRaw.innerHTML = `<span class="sig-text">${parts[2]}</span>`;
    const alg = header.alg || 'Unknown';
    sigInfo.textContent = `Algorithm: ${alg} · Signature length: ${parts[2].length} chars (Base64URL encoded)`;

    // Show HMAC Verify if HS256/384/512
    if (/^HS\d{3}$/.test(alg)) {
        verifySection.style.display = 'block';
    } else {
        verifySection.style.display = 'none';
        verifyResult.textContent = '';
    }

    // Claims Table
    claimsCard.style.display = 'block';
    renderClaimsTable(payload);
}

// ─── HMAC Signature Verification ────────────────────────────────────────────
document.getElementById('btnVerify').addEventListener('click', async () => {
    const raw = jwtInput.value.trim();
    const secret = secretInput.value;
    if (!secret || !raw) {
        verifyResult.textContent = 'Please enter your signing secret.';
        verifyResult.className = 'verify-result verify-fail';
        return;
    }

    const parts = raw.split('.');
    if (parts.length !== 3) return;

    const alg = (() => {
        try { return parseSegment(parts[0]).alg; } catch { return 'HS256'; }
    })();

    const hashMap = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };
    const hashName = hashMap[alg] || 'SHA-256';

    try {
        const enc = new TextEncoder();
        const keyData = enc.encode(secret);
        const signingInput = enc.encode(`${parts[0]}.${parts[1]}`);

        const key = await crypto.subtle.importKey(
            'raw', keyData,
            { name: 'HMAC', hash: hashName },
            false, ['sign']
        );
        const sig = await crypto.subtle.sign('HMAC', key, signingInput);
        const computed = btoa(String.fromCharCode(...new Uint8Array(sig)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

        if (computed === parts[2]) {
            verifyResult.innerHTML = '✅ Signature is VALID! The secret matches.';
            verifyResult.className = 'verify-result verify-ok';
        } else {
            verifyResult.innerHTML = '❌ Signature is INVALID. The secret does not match.';
            verifyResult.className = 'verify-result verify-fail';
        }
    } catch (e) {
        verifyResult.textContent = `Verification error: ${e.message}`;
        verifyResult.className = 'verify-result verify-fail';
    }
});

// ─── Copy Buttons ────────────────────────────────────────────────────────────
document.querySelectorAll('.btn-copy-card').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.target);
        if (!target) return;
        const text = target.innerText || target.textContent;
        navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard! ✓'));
    });
});

function copyEmail() {
    navigator.clipboard.writeText('donate@novafortixlab.com').then(() => showToast('Email copied: donate@novafortixlab.com'));
}

function showToast(msg) {
    globalToast.textContent = msg;
    globalToast.classList.add('show');
    setTimeout(() => globalToast.classList.remove('show'), 2000);
}

// ─── Reset UI ────────────────────────────────────────────────────────────────
function resetOutputCards() {
    headerJson.innerHTML    = '{ }';
    payloadJson.innerHTML   = '{ }';
    headerBadges.innerHTML  = '';
    payloadBadges.innerHTML = '';
    sigRaw.innerHTML        = '<p class="sig-placeholder">Paste a token to see the signature</p>';
    sigInfo.textContent     = '';
    verifySection.style.display = 'none';
    claimsCard.style.display    = 'none';
    jwtVisual.style.display     = 'none';
}

function resetUI() {
    resetOutputCards();
    setStatus('idle', '⏳', 'Paste or type a JWT token in the input box below to begin...');
}

// ─── Input Events ────────────────────────────────────────────────────────────
jwtInput.addEventListener('input', () => decodeJWT(jwtInput.value));

document.getElementById('btnSample').addEventListener('click', () => {
    jwtInput.value = SAMPLE_JWT;
    decodeJWT(SAMPLE_JWT);
});

document.getElementById('btnClearAll').addEventListener('click', () => {
    jwtInput.value = '';
    secretInput.value = '';
    verifyResult.textContent = '';
    resetUI();
});

// ─── Init ────────────────────────────────────────────────────────────────────
resetUI();
