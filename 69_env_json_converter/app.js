
const elEnv = document.getElementById('env-in');
const elJson = document.getElementById('json-in');
const elShell = document.getElementById('shell-in');

let isSyncing = false;

function parseEnv(str, prefix='') {
    const obj = {};
    str.split('\n').forEach(line => {
        let cl = line.trim();
        if(prefix && cl.startsWith(prefix)) cl = cl.substring(prefix.length).trim();
        if(!cl || cl.startsWith('#')) return;
        
        const eqIdx = cl.indexOf('=');
        if(eqIdx > -1) {
            const key = cl.substring(0, eqIdx).trim();
            let val = cl.substring(eqIdx + 1).trim();
            if((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length - 1);
            }
            obj[key] = val;
        }
    });
    return obj;
}

function toEnv(obj) { return Object.entries(obj).map(([k,v]) => `${k}="${v}"`).join('\n'); }
function toShell(obj) { return Object.entries(obj).map(([k,v]) => `export ${k}="${v}"`).join('\n'); }

function syncFromEnv() {
    if(isSyncing) return;
    isSyncing = true;
    try {
        const obj = parseEnv(elEnv.value);
        elJson.value = Object.keys(obj).length ? JSON.stringify(obj, null, 2) : '';
        elShell.value = toShell(obj);
    } catch(e) {}
    isSyncing = false;
}

function syncFromJson() {
    if(isSyncing) return;
    isSyncing = true;
    try {
        const obj = JSON.parse(elJson.value || '{}');
        elEnv.value = toEnv(obj);
        elShell.value = toShell(obj);
    } catch(e) {} // ignore syntax errors while typing
    isSyncing = false;
}

function syncFromShell() {
    if(isSyncing) return;
    isSyncing = true;
    try {
        const obj = parseEnv(elShell.value, 'export ');
        elEnv.value = toEnv(obj);
        elJson.value = Object.keys(obj).length ? JSON.stringify(obj, null, 2) : '';
    } catch(e) {}
    isSyncing = false;
}

elEnv.addEventListener('input', syncFromEnv);
elJson.addEventListener('input', syncFromJson);
elShell.addEventListener('input', syncFromShell);
