// ═══════════════════════════════════════════════════════════════
// CronWizard — Visual Cron Builder & Decoder
// 100% Client-Side · Pure Vanilla JS · No dependencies
// ═══════════════════════════════════════════════════════════════

// ─── Constants ───────────────────────────────────────────────────────────────
const MONTH_NAMES  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW_NAMES    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DOW_FULL     = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_FULL   = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
    min:  { mode: 'every', n: 5, from: 0, to: 30, step: 1, selected: [] },
    hr:   { mode: 'every', n: 6, from: 9, to: 17, step: 1, selected: [] },
    dom:  { mode: 'every', from: 1, to: 15, selected: [] },
    mo:   { mode: 'every', from: 1, to: 12, selected: [] },
    dow:  { mode: 'every', from: 1, to: 5,  selected: [] },
};

let useUtc = true;
const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;

// ─── Chip builders ────────────────────────────────────────────────────────────
function buildChips(containerId, values, labels, field) {
    const c = document.getElementById(containerId);
    c.innerHTML = '';
    values.forEach((v, i) => {
        const chip = document.createElement('div');
        chip.className = 'chip' + (state[field].selected.includes(v) ? ' selected' : '');
        chip.textContent = labels ? labels[i] : v;
        chip.dataset.val = v;
        chip.addEventListener('click', () => {
            chip.classList.toggle('selected');
            const idx = state[field].selected.indexOf(v);
            if (idx === -1) state[field].selected.push(v);
            else state[field].selected.splice(idx, 1);
            state[field].selected.sort((a, b) => a - b);
            rebuild();
        });
        c.appendChild(chip);
    });
}

// Build all chip grids on init
function initChips() {
    // Minutes 0–59 (show multiples of 5 for readability, all still selectable)
    const minVals = Array.from({length: 60}, (_, i) => i);
    buildChips('chips-min', minVals, null, 'min');

    // Hours 0–23
    const hrVals = Array.from({length: 24}, (_, i) => i);
    buildChips('chips-hr', hrVals, null, 'hr');

    // Days 1–31
    const domVals = Array.from({length: 31}, (_, i) => i + 1);
    buildChips('chips-dom', domVals, null, 'dom');

    // Months
    buildChips('chips-mo', Array.from({length:12}, (_,i)=>i+1), MONTH_NAMES, 'mo');

    // Weekdays
    buildChips('chips-dow', [0,1,2,3,4,5,6], DOW_NAMES, 'dow');
}

// ─── Field Expression Generators ─────────────────────────────────────────────
function getFieldExpr(field) {
    const s = state[field];
    switch (s.mode) {
        case 'every':   return '*';
        case 'every-n': return `*/${s.n}`;
        case 'specific':
            if (s.selected.length === 0) return '*';
            return s.selected.join(',');
        case 'range': {
            const base = `${s.from}-${s.to}`;
            return s.step > 1 ? `${base}/${s.step}` : base;
        }
        case 'ignore': return '?';
        default: return '*';
    }
}

function getFullExpression() {
    return [
        getFieldExpr('min'),
        getFieldExpr('hr'),
        getFieldExpr('dom'),
        getFieldExpr('mo'),
        getFieldExpr('dow'),
    ].join(' ');
}

// ─── Human-Readable Describer ─────────────────────────────────────────────────
function describeField(expr, field) {
    if (expr === '*' || expr === '?') return null;

    if (expr.startsWith('*/')) {
        const n = parseInt(expr.slice(2));
        const unit = { min: 'minute', hr: 'hour', dom: 'day', mo: 'month', dow: 'day' }[field];
        return `every ${n} ${unit}${n > 1 ? 's' : ''}`;
    }

    if (expr.includes(',')) {
        const vals = expr.split(',').map(Number);
        if (field === 'mo') return 'in ' + vals.map(v => MONTH_FULL[v-1]).join(', ');
        if (field === 'dow') return 'on ' + vals.map(v => DOW_FULL[v]).join(', ');
        if (field === 'hr') return 'at hour ' + vals.map(v => `${v}:00`).join(', ');
        if (field === 'min') return 'at minute ' + vals.join(', ');
        return 'on day(s) ' + vals.join(', ') + ' of the month';
    }

    if (expr.includes('-')) {
        const parts = expr.split('/');
        const [from, to] = parts[0].split('-').map(Number);
        const step = parts[1] ? parseInt(parts[1]) : 1;

        if (field === 'dow') {
            const rangeStr = `${DOW_FULL[from]} through ${DOW_FULL[to]}`;
            return step > 1 ? `every ${step}th day of the week from ${rangeStr}` : `on ${rangeStr}`;
        }
        if (field === 'mo') {
            const rangeStr = `${MONTH_FULL[from-1]} to ${MONTH_FULL[to-1]}`;
            return step > 1 ? `every ${step} months from ${rangeStr}` : `from ${rangeStr}`;
        }
        if (field === 'hr') {
            const rangeStr = `${from}:00 to ${to}:00`;
            return step > 1 ? `every ${step} hours between ${rangeStr}` : `between ${rangeStr}`;
        }
        if (field === 'min') {
            return step > 1 ? `every ${step} minutes from minute ${from} to ${to}` : `from minute ${from} to ${to}`;
        }
        return step > 1 ? `every ${step} days from day ${from} to ${to}` : `from day ${from} to ${to} of the month`;
    }

    // Single value
    const n = parseInt(expr);
    if (field === 'mo') return `in ${MONTH_FULL[n-1]}`;
    if (field === 'dow') return `on ${DOW_FULL[n]}`;
    if (field === 'hr') return `at ${n}:00`;
    if (field === 'min') return `at minute ${n}`;
    return `on day ${n} of the month`;
}

function buildMeaning(expr) {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) return 'Invalid expression';

    const [min, hr, dom, mo, dow] = parts;

    // Special macros
    const specials = {
        '@yearly':  'Once a year at midnight on January 1st',
        '@annually':'Once a year at midnight on January 1st',
        '@monthly': 'Once a month at midnight on the 1st',
        '@weekly':  'Once a week at midnight on Sunday',
        '@daily':   'Once a day at midnight',
        '@midnight':'Once a day at midnight',
        '@hourly':  'Once an hour at the start of every hour',
        '@reboot':  'Once at system startup',
    };
    if (specials[expr.trim()]) return specials[expr.trim()];

    if (expr.trim() === '* * * * *') return 'Every minute of every day';
    if (expr.trim() === '0 * * * *') return 'At the start of every hour';
    if (expr.trim() === '0 0 * * *') return 'Every day at midnight (00:00 UTC)';

    const parts_desc = [];

    // Minute
    const minDesc = describeField(min, 'min');
    if (!minDesc && min === '*') parts_desc.push('every minute');
    else if (minDesc) parts_desc.push(minDesc);

    // Hour
    const hrDesc = describeField(hr, 'hr');
    if (!hrDesc && hr === '*') { /* every hour — implied */ }
    else if (hrDesc) parts_desc.push(hrDesc);

    // Combine to form sentence
    let sentence = '';
    if (min === '*' && hr === '*') sentence = 'Every minute';
    else if (min === '0' && hr !== '*') sentence = `At the start of the hour, ${hrDesc || 'every hour'}`;
    else if (min !== '*' && hr === '*') sentence = `At ${minDesc}, every hour`;
    else sentence = `At ${minDesc || `minute ${min}`}${hrDesc ? ', ' + hrDesc : ''}`;

    // Day / Weekday
    const domDesc = describeField(dom, 'dom');
    const dowDesc = describeField(dow, 'dow');
    if (domDesc && dom !== '?' && dow === '*') sentence += `, ${domDesc}`;
    else if (dowDesc && dom === '*') sentence += `, ${dowDesc}`;
    else if (domDesc && dowDesc) sentence += `, ${domDesc} (or ${dowDesc})`;

    // Month
    const moDesc = describeField(mo, 'mo');
    if (moDesc) sentence += `, ${moDesc}`;

    return sentence || 'Every minute of every day';
}

// ─── Next-Run Calculator ──────────────────────────────────────────────────────
function parseField(expr, min, max) {
    const result = new Set();
    if (expr === '*' || expr === '?') {
        for (let i = min; i <= max; i++) result.add(i);
        return result;
    }
    expr.split(',').forEach(part => {
        if (part.startsWith('*/')) {
            const step = parseInt(part.slice(2));
            for (let i = min; i <= max; i += step) result.add(i);
        } else if (part.includes('/')) {
            const [range, stepStr] = part.split('/');
            const step = parseInt(stepStr);
            const [from, to] = range.split('-').map(Number);
            for (let i = from; i <= to; i += step) result.add(i);
        } else if (part.includes('-')) {
            const [from, to] = part.split('-').map(Number);
            for (let i = from; i <= to; i++) result.add(i);
        } else {
            result.add(parseInt(part));
        }
    });
    return result;
}

function getNextRuns(expr, count = 10) {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) return [];

    // Handle special strings
    const now = new Date();
    let d = new Date(now);
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() + 1); // start from next minute

    let validMins, validHrs, validDom, validMo, validDow;
    try {
        validMins = parseField(parts[0], 0, 59);
        validHrs  = parseField(parts[1], 0, 23);
        validDom  = parseField(parts[2], 1, 31);
        validMo   = parseField(parts[3], 1, 12);
        validDow  = parseField(parts[4], 0, 6);
    } catch { return []; }

    const results = [];
    const isDomStar = parts[2] === '*' || parts[2] === '?';
    const isDowStar = parts[4] === '*' || parts[4] === '?';
    let iterations = 0;

    while (results.length < count && iterations < 525960) { // max 1 year of minutes
        iterations++;
        const mm = d.getUTCMonth() + 1;
        const dd = d.getUTCDate();
        const dow = d.getUTCDay();
        const hh = d.getUTCHours();
        const mn = d.getUTCMinutes();

        if (validMo.has(mm)) {
            // Handle DOW vs DOM interaction (Unix cron: both apply if both are specific)
            const domMatch = validDom.has(dd);
            const dowMatch = validDow.has(dow);
            const dayMatch = (isDomStar && isDowStar) ||
                             (isDomStar && dowMatch) ||
                             (isDowStar && domMatch) ||
                             (domMatch || dowMatch); // if either specified, either can match

            if (dayMatch && validHrs.has(hh) && validMins.has(mn)) {
                results.push(new Date(d));
            }
        }

        d = new Date(d.getTime() + 60000); // advance 1 minute
    }

    return results;
}

// ─── Format run time ──────────────────────────────────────────────────────────
function formatRunTime(d, utc) {
    if (utc) {
        return d.toISOString().replace('T', ' ').replace(/:\d{2}\.\d+Z$/, '') + ' UTC';
    }
    return d.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', weekday: 'short'
    });
}

function timeFromNow(d) {
    const diff = d - Date.now();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `in ${mins} min${mins !== 1 ? 's' : ''}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `in ${hrs} hr${hrs !== 1 ? 's' : ''}`;
    const days = Math.floor(hrs / 24);
    return `in ${days} day${days !== 1 ? 's' : ''}`;
}

// ─── Render runs table ────────────────────────────────────────────────────────
function renderRuns(expr) {
    const runs = getNextRuns(expr, 10);
    const tbody = document.getElementById('runsBody');
    if (runs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="color:var(--danger);padding:16px;">Could not calculate run times — check expression syntax.</td></tr>`;
        return;
    }
    tbody.innerHTML = runs.map((d, i) => `
        <tr>
            <td style="color:var(--muted);font-size:11px;">${i + 1}</td>
            <td>${formatRunTime(d, useUtc)}</td>
            <td class="from-now">${timeFromNow(d)}</td>
        </tr>
    `).join('');
}

// ─── Main Rebuild ─────────────────────────────────────────────────────────────
function rebuild() {
    // Update state from inputs
    ['min','hr','dom','mo','dow'].forEach(f => {
        const s = state[f];
        if (s.mode === 'every-n') {
            const el = document.getElementById(`${f}-n`);
            if (el) s.n = parseInt(el.value) || 5;
        }
        if (s.mode === 'range') {
            const fr = document.getElementById(`${f}-from`);
            const to = document.getElementById(`${f}-to`);
            const st = document.getElementById(`${f}-step`);
            if (fr) s.from = parseInt(fr.value);
            if (to) s.to = parseInt(to.value);
            if (st) s.step = parseInt(st.value) || 1;
        }
        if (s.mode === 'range' && (f === 'mo')) {
            s.from = parseInt(document.getElementById('mo-from')?.value || 1);
            s.to   = parseInt(document.getElementById('mo-to')?.value || 12);
        }
        if (s.mode === 'range' && f === 'dow') {
            s.from = parseInt(document.getElementById('dow-from')?.value || 1);
            s.to   = parseInt(document.getElementById('dow-to')?.value || 5);
        }
    });

    const expr = getFullExpression();

    // Update display
    document.getElementById('exprOutput').textContent = expr;
    document.getElementById('exprMeaning').textContent = buildMeaning(expr);

    // Update field preview badges
    const fieldMap = { min: 'prev-min', hr: 'prev-hr', dom: 'prev-dom', mo: 'prev-mo', dow: 'prev-dow' };
    Object.entries(fieldMap).forEach(([f, id]) => {
        document.getElementById(id).textContent = getFieldExpr(f);
    });

    // Render run times
    renderRuns(expr);
}

// ─── Mode Button Handlers ─────────────────────────────────────────────────────
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const field = btn.dataset.field;
        const mode  = btn.dataset.mode;

        // Update buttons
        document.querySelectorAll(`.mode-btn[data-field="${field}"]`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Hide all panels for this field
        document.querySelectorAll(`[id^="${field}-"]`).forEach(p => {
            if (p.classList.contains('mode-panel')) p.classList.add('hidden');
        });

        // Show active panel
        const panel = document.getElementById(`${field}-${mode}`);
        if (panel) panel.classList.remove('hidden');

        state[field].mode = mode;
        rebuild();
    });
});

// ─── Input listeners (number inputs, selects) ─────────────────────────────────
document.querySelectorAll('.num-input, .num-input-sm, .select-sm').forEach(el => {
    el.addEventListener('input', rebuild);
    el.addEventListener('change', rebuild);
});

// ─── Timezone toggle ──────────────────────────────────────────────────────────
document.getElementById('tzName').textContent = tzName;
document.getElementById('btnUtc').addEventListener('click', () => {
    useUtc = true;
    document.getElementById('btnUtc').classList.add('active');
    document.getElementById('btnLocal').classList.remove('active');
    renderRuns(getFullExpression());
});
document.getElementById('btnLocal').addEventListener('click', () => {
    useUtc = false;
    document.getElementById('btnLocal').classList.add('active');
    document.getElementById('btnUtc').classList.remove('active');
    renderRuns(getFullExpression());
});

// ─── Copy expression button ───────────────────────────────────────────────────
document.getElementById('btnCopyExpr').addEventListener('click', () => {
    const expr = getFullExpression();
    navigator.clipboard.writeText(expr).then(() => showToast(`Copied: ${expr}`));
});

// ─── Tab Switcher ─────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        btn.classList.add('active');
        const tabId = 'tab-' + btn.dataset.tab;
        document.getElementById(tabId)?.classList.remove('hidden');
    });
});

// ─── Decode Tab ───────────────────────────────────────────────────────────────
document.getElementById('btnDecode').addEventListener('click', decodeExpression);
document.getElementById('decodeInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') decodeExpression();
});

function decodeExpression() {
    const raw = document.getElementById('decodeInput').value.trim();
    const result = document.getElementById('decodeResult');

    if (!raw) {
        result.innerHTML = `<p class="decode-error">Please enter a cron expression.</p>`;
        return;
    }

    // Handle special strings
    const specials = {
        '@yearly':  '0 0 1 1 *',
        '@annually':'0 0 1 1 *',
        '@monthly': '0 0 1 * *',
        '@weekly':  '0 0 * * 0',
        '@daily':   '0 0 * * *',
        '@midnight':'0 0 * * *',
        '@hourly':  '0 * * * *',
    };
    const expr = specials[raw] ? specials[raw] : raw;
    const isSpecial = !!specials[raw];

    const parts = expr.split(/\s+/);
    if (parts.length !== 5) {
        result.innerHTML = `<p class="decode-error">❌ Invalid format: expected 5 fields (minute hour day-of-month month day-of-week), got ${parts.length}.</p><p style="font-size:12px;color:var(--muted);margin-top:8px;">Valid special strings: @yearly @monthly @weekly @daily @hourly @reboot</p>`;
        return;
    }

    const [min, hr, dom, mo, dow] = parts;
    const meaning = buildMeaning(expr);
    const runs = getNextRuns(expr, 10);

    const fieldDescs = [
        { name: 'Minute',       val: min, desc: fieldHumanDesc(min, 0, 59, 'minute') },
        { name: 'Hour',         val: hr,  desc: fieldHumanDesc(hr,  0, 23, 'hour') },
        { name: 'Day of Month', val: dom, desc: fieldHumanDesc(dom, 1, 31, 'day-of-month') },
        { name: 'Month',        val: mo,  desc: fieldHumanDesc(mo,  1, 12, 'month') },
        { name: 'Day of Week',  val: dow, desc: fieldHumanDesc(dow, 0, 6,  'weekday') },
    ];

    result.innerHTML = `
        ${isSpecial ? `<div class="decode-special-badge">✓ Alias for: <code style="font-family:var(--mono);font-size:12px;">${expr}</code></div>` : ''}
        <div class="decode-meaning">${meaning}</div>
        <div class="decode-fields">
            ${fieldDescs.map(f => `
                <div class="decode-field-box">
                    <div class="decode-field-name">${f.name}</div>
                    <div class="decode-field-val">${f.val}</div>
                    <div class="decode-field-desc">${f.desc}</div>
                </div>
            `).join('')}
        </div>
        ${runs.length > 0 ? `
            <h4 style="font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-bottom:10px;">Next 5 Run Times (UTC)</h4>
            <table class="runs-table" style="margin-bottom:0">
                <thead><tr><th>#</th><th>Run Time</th><th>From Now</th></tr></thead>
                <tbody>
                    ${runs.slice(0,5).map((d,i) => `
                        <tr>
                            <td style="color:var(--muted);font-size:11px;">${i+1}</td>
                            <td>${formatRunTime(d, true)}</td>
                            <td class="from-now">${timeFromNow(d)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p class="decode-error" style="margin-top:12px;">⚠ Could not compute run times — check that the expression is valid.</p>'}
    `;
}

function fieldHumanDesc(expr, min, max, type) {
    if (expr === '*') return 'Every ' + type;
    if (expr === '?') return 'Any (ignored)';
    if (expr.startsWith('*/')) return `Every ${expr.slice(2)} ${type}s`;
    if (expr.includes('-')) {
        const [a, b] = expr.split('-').map(Number);
        if (type === 'month') return `${MONTH_NAMES[a-1]} through ${MONTH_NAMES[b-1]}`;
        if (type === 'weekday') return `${DOW_NAMES[a]} through ${DOW_NAMES[b]}`;
        return `From ${a} to ${b}`;
    }
    if (expr.includes(',')) {
        const vals = expr.split(',').map(Number);
        if (type === 'month') return vals.map(v => MONTH_NAMES[v-1]).join(', ');
        if (type === 'weekday') return vals.map(v => DOW_NAMES[v]).join(', ');
        return vals.join(', ');
    }
    const n = parseInt(expr);
    if (type === 'month') return MONTH_FULL[n - 1] || expr;
    if (type === 'weekday') return DOW_FULL[n] || expr;
    if (type === 'hour') return `At ${n}:00`;
    if (type === 'minute') return `At minute ${n}`;
    return `Day ${n}`;
}

// ─── Quick Presets ────────────────────────────────────────────────────────────
const PRESETS = [
    { name: 'Every Minute',           expr: '* * * * *',     cat: 'sys',  desc: 'Runs every single minute, 24/7.' },
    { name: 'Every 5 Minutes',        expr: '*/5 * * * *',   cat: 'sys',  desc: 'Runs every 5 minutes.' },
    { name: 'Every 15 Minutes',       expr: '*/15 * * * *',  cat: 'sys',  desc: 'Runs every quarter-hour.' },
    { name: 'Every Hour (on the dot)',expr: '0 * * * *',     cat: 'sys',  desc: 'Runs at the start of every hour.' },
    { name: 'Every 6 Hours',          expr: '0 */6 * * *',   cat: 'sys',  desc: 'Runs at 00:00, 06:00, 12:00, 18:00 UTC.' },
    { name: 'Daily at Midnight',      expr: '0 0 * * *',     cat: 'sys',  desc: 'Runs once per day at 00:00 UTC.' },
    { name: 'Daily at 9 AM',          expr: '0 9 * * *',     cat: 'web',  desc: 'Runs every morning at 09:00 UTC.' },
    { name: 'Weekdays at 9 AM',       expr: '0 9 * * 1-5',   cat: 'web',  desc: 'Mon–Fri at 09:00 UTC. Perfect for business-hours jobs.' },
    { name: 'Weekdays at 6 PM',       expr: '0 18 * * 1-5',  cat: 'web',  desc: 'Mon–Fri at 18:00 UTC. End-of-day aggregation.' },
    { name: 'Every Sunday at 2 AM',   expr: '0 2 * * 0',     cat: 'sys',  desc: 'Weekly maintenance window on Sunday night.' },
    { name: 'First of Month, 1 AM',   expr: '0 1 1 * *',     cat: 'data', desc: 'Monthly billing, reporting, or cleanup job.' },
    { name: 'First Mon of Month',     expr: '0 9 1-7 * 1',   cat: 'data', desc: 'First Monday of each month at 09:00 UTC.' },
    { name: 'Every Quarter',          expr: '0 0 1 */3 *',   cat: 'data', desc: 'Jan 1, Apr 1, Jul 1, Oct 1 at midnight.' },
    { name: 'Every January 1st',      expr: '0 0 1 1 *',     cat: 'data', desc: 'Annual job on New Year\'s Day.' },
    { name: 'CI Pipeline (push)',      expr: '*/10 * * * *',  cat: 'ci',   desc: 'Poll for build status every 10 minutes.' },
    { name: 'Nightly Build',          expr: '0 2 * * *',     cat: 'ci',   desc: 'Nightly at 2 AM — classic CI schedule.' },
    { name: 'Health Check (3-min)',   expr: '*/3 * * * *',   cat: 'sys',  desc: 'Uptime monitor polling every 3 minutes.' },
    { name: 'Log Rotation (Daily)',   expr: '0 0 * * *',     cat: 'sys',  desc: 'Rotate and compress logs at midnight.' },
    { name: 'Weekly Report (Fri PM)', expr: '0 16 * * 5',    cat: 'data', desc: 'Send weekly report every Friday at 4 PM UTC.' },
    { name: 'Cache Warm-Up (6 AM)',   expr: '0 6 * * *',     cat: 'web',  desc: 'Pre-warm caches before peak traffic.' },
];

const catBadge = { sys: 'badge-sys', web: 'badge-web', ci: 'badge-ci', data: 'badge-data' };
const catLabel = { sys: 'System', web: 'Web', ci: 'CI/CD', data: 'Data' };

function buildPresets() {
    const grid = document.getElementById('presetsGrid');
    grid.innerHTML = PRESETS.map(p => `
        <div class="preset-card" data-expr="${p.expr}">
            <div class="preset-header">
                <div class="preset-name">${p.name}</div>
                <span class="preset-badge ${catBadge[p.cat]}">${catLabel[p.cat]}</span>
            </div>
            <div class="preset-expr">${p.expr}</div>
            <div class="preset-desc">${p.desc}</div>
            <div class="preset-apply-hint">Click to load this preset ↗</div>
        </div>
    `).join('');

    grid.querySelectorAll('.preset-card').forEach(card => {
        card.addEventListener('click', () => {
            const expr = card.dataset.expr;
            // Switch to decode tab and decode it
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            document.querySelector('[data-tab="decode"]').classList.add('active');
            document.getElementById('tab-decode').classList.remove('hidden');

            document.getElementById('decodeInput').value = expr;
            decodeExpression();

            // Also update expression display
            document.getElementById('exprOutput').textContent = expr;
            document.getElementById('exprMeaning').textContent = buildMeaning(expr);

            showToast(`Loaded: ${expr}`);
        });
    });
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function copyEmail() {
    navigator.clipboard.writeText('donate@novafortixlab.com').then(() => showToast('Email copied!'));
}

function showToast(msg) {
    const t = document.getElementById('globalToast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
}

// ─── Initialize ───────────────────────────────────────────────────────────────
initChips();
buildPresets();
rebuild();
