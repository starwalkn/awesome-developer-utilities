// cURL to Multi-Language Code Converter
// 100% Client-Side Engine

let currentLang = 'python';

const SAMPLES = {
    postJson: `curl 'https://api.github.com/repos/octocat/Hello-World/issues' \\
  -X POST \\
  -H 'Accept: application/vnd.github.v3+json' \\
  -H 'Authorization: token ghp_yourSecretPersonalToken12345' \\
  -H 'Content-Type: application/json' \\
  --data-raw '{"title":"Found a bug","body":"Having an issue with the latest release"}'`,

    authGet: `curl 'https://api.stripe.com/v1/customers?limit=10' \\
  -H 'Authorization: Bearer sk_test_51MzFakeKeySample999' \\
  -H 'Content-Type: application/x-www-form-urlencoded'`,

    formData: `curl 'https://httpbin.org/post' \\
  -X POST \\
  -F 'username=johndoe' \\
  -F 'email=john@example.com' \\
  -F 'status=active'`
};

// DOM references
const curlInput = document.getElementById('curlInput');
const codeOutput = document.getElementById('codeOutput');
const btnCopyCode = document.getElementById('btnCopyCode');
const btnClear = document.getElementById('btnClear');
const badgeMethod = document.getElementById('badgeMethod');
const badgeUrl = document.getElementById('badgeUrl');
const badgeHeaders = document.getElementById('badgeHeaders');
const badgeBody = document.getElementById('badgeBody');
const globalToast = document.getElementById('globalToast');

// ─── Tokenize & Parse cURL ────────────────────────────────────────────────────
function parseCurl(raw) {
    if (!raw || !raw.trim()) return null;

    // Clean escaped newlines and multiple spaces
    let clean = raw.replace(/\\\r?\n/g, ' ').replace(/\s+/g, ' ').trim();

    // Strip leading 'curl' command if present
    if (clean.toLowerCase().startsWith('curl ')) {
        clean = clean.slice(5).trim();
    }

    // Tokenizer supporting single & double quotes
    const tokens = [];
    const regex = /(?:[^\s"']+|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')+/g;
    let match;
    while ((match = regex.exec(clean)) !== null) {
        let t = match[0];
        // Strip outer quotes
        if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
            t = t.slice(1, -1);
        }
        tokens.push(t);
    }

    let url = '';
    let method = '';
    const headers = {};
    let data = '';
    let isJson = false;
    let user = '';

    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];

        if (t === '-X' || t === '--request') {
            method = tokens[++i] || 'GET';
        } else if (t === '-H' || t === '--header') {
            const h = tokens[++i] || '';
            const colon = h.indexOf(':');
            if (colon !== -1) {
                const k = h.slice(0, colon).trim();
                const v = h.slice(colon + 1).trim();
                headers[k] = v;
                if (k.toLowerCase() === 'content-type' && v.toLowerCase().includes('application/json')) {
                    isJson = true;
                }
            }
        } else if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary') {
            data = tokens[++i] || '';
            if (!method) method = 'POST';
        } else if (t === '-u' || t === '--user') {
            user = tokens[++i] || '';
        } else if (t === '-F' || t === '--form') {
            const f = tokens[++i] || '';
            data += (data ? '&' : '') + f;
            if (!method) method = 'POST';
        } else if (t.startsWith('http://') || t.startsWith('https://')) {
            url = t;
        } else if (!url && !t.startsWith('-')) {
            url = t;
        }
    }

    if (!method) {
        method = data ? 'POST' : 'GET';
    }

    // Check if data is valid JSON
    if (data && !isJson) {
        try {
            JSON.parse(data);
            isJson = true;
        } catch {
            isJson = false;
        }
    }

    return {
        url: url || 'https://api.example.com',
        method: method.toUpperCase(),
        headers,
        data,
        isJson,
        user
    };
}

// ─── Code Generators ──────────────────────────────────────────────────────────

function genPython(req) {
    let code = `import requests\n\nurl = "${req.url}"\n\n`;

    // Headers
    if (Object.keys(req.headers).length > 0) {
        code += `headers = {\n`;
        for (const [k, v] of Object.entries(req.headers)) {
            code += `    "${k}": "${v.replace(/"/g, '\\"')}",\n`;
        }
        code += `}\n\n`;
    }

    // Body
    let dataArg = '';
    if (req.data) {
        if (req.isJson) {
            try {
                const formatted = JSON.stringify(JSON.parse(req.data), null, 4);
                code += `payload = ${formatted}\n\n`;
                dataArg = `, json=payload`;
            } catch {
                code += `payload = """${req.data}"""\n\n`;
                dataArg = `, data=payload`;
            }
        } else {
            code += `payload = "${req.data.replace(/"/g, '\\"')}"\n\n`;
            dataArg = `, data=payload`;
        }
    }

    // Auth
    let authArg = '';
    if (req.user) {
        const [u, p] = req.user.split(':');
        authArg = `, auth=("${u}", "${p || ''}")`;
    }

    const headersArg = Object.keys(req.headers).length > 0 ? `, headers=headers` : '';
    const fn = req.method.toLowerCase();
    code += `response = requests.${fn}(url${headersArg}${dataArg}${authArg})\n\n`;
    code += `print("Status:", response.status_code)\n`;
    code += `print(response.text)\n`;

    return code;
}

function genJavascript(req) {
    let code = `const url = '${req.url}';\n\n`;
    code += `const options = {\n`;
    code += `  method: '${req.method}',\n`;

    // Headers
    if (Object.keys(req.headers).length > 0) {
        code += `  headers: {\n`;
        for (const [k, v] of Object.entries(req.headers)) {
            code += `    '${k}': '${v.replace(/'/g, "\\'")}',\n`;
        }
        code += `  },\n`;
    }

    // Body
    if (req.data) {
        if (req.isJson) {
            code += `  body: JSON.stringify(${req.data})\n`;
        } else {
            code += `  body: '${req.data.replace(/'/g, "\\'")}'\n`;
        }
    }

    code += `};\n\n`;
    code += `try {\n`;
    code += `  const response = await fetch(url, options);\n`;
    code += `  const data = await response.json();\n`;
    code += `  console.log(data);\n`;
    code += `} catch (error) {\n`;
    code += `  console.error('Request failed:', error);\n`;
    code += `}\n`;

    return code;
}

function genAxios(req) {
    let code = `const axios = require('axios');\n\n`;
    code += `const config = {\n`;
    code += `  method: '${req.method.toLowerCase()}',\n`;
    code += `  url: '${req.url}',\n`;

    if (Object.keys(req.headers).length > 0) {
        code += `  headers: {\n`;
        for (const [k, v] of Object.entries(req.headers)) {
            code += `    '${k}': '${v.replace(/'/g, "\\'")}',\n`;
        }
        code += `  },\n`;
    }

    if (req.data) {
        if (req.isJson) {
            code += `  data: ${req.data}\n`;
        } else {
            code += `  data: '${req.data.replace(/'/g, "\\'")}'\n`;
        }
    }

    code += `};\n\n`;
    code += `axios(config)\n`;
    code += `  .then(response => {\n`;
    code += `    console.log(JSON.stringify(response.data, null, 2));\n`;
    code += `  })\n`;
    code += `  .catch(error => {\n`;
    code += `    console.error(error);\n`;
    code += `  });\n`;

    return code;
}

function genGo(req) {
    let code = `package main\n\n`;
    code += `import (\n`;
    code += `    "fmt"\n`;
    code += `    "io"\n`;
    code += `    "net/http"\n`;
    if (req.data) code += `    "strings"\n`;
    code += `)\n\n`;

    code += `func main() {\n`;
    code += `    url := "${req.url}"\n`;

    if (req.data) {
        code += `    payload := strings.NewReader(\`${req.data}\`)\n`;
        code += `    req, err := http.NewRequest("${req.method}", url, payload)\n`;
    } else {
        code += `    req, err := http.NewRequest("${req.method}", url, nil)\n`;
    }

    code += `    if err != nil {\n        panic(err)\n    }\n\n`;

    for (const [k, v] of Object.entries(req.headers)) {
        code += `    req.Header.Add("${k}", "${v}")\n`;
    }

    code += `\n    res, err := http.DefaultClient.Do(req)\n`;
    code += `    if err != nil {\n        panic(err)\n    }\n`;
    code += `    defer res.Body.Close()\n\n`;
    code += `    body, _ := io.ReadAll(res.Body)\n`;
    code += `    fmt.Println(res.Status)\n`;
    code += `    fmt.Println(string(body))\n`;
    code += `}\n`;

    return code;
}

function genPhp(req) {
    let code = `<?php\n\n$curl = curl_init();\n\n`;
    code += `curl_setopt_array($curl, array(\n`;
    code += `  CURLOPT_URL => '${req.url}',\n`;
    code += `  CURLOPT_RETURNTRANSFER => true,\n`;
    code += `  CURLOPT_CUSTOMREQUEST => '${req.method}',\n`;

    if (req.data) {
        code += `  CURLOPT_POSTFIELDS => '${req.data.replace(/'/g, "\\'")}',\n`;
    }

    if (Object.keys(req.headers).length > 0) {
        code += `  CURLOPT_HTTPHEADER => array(\n`;
        for (const [k, v] of Object.entries(req.headers)) {
            code += `    '${k}: ${v.replace(/'/g, "\\'")}',\n`;
        }
        code += `  ),\n`;
    }

    code += `));\n\n`;
    code += `$response = curl_exec($curl);\n`;
    code += `curl_close($curl);\n\n`;
    code += `echo $response;\n`;

    return code;
}

// ─── Render Code & Meta ───────────────────────────────────────────────────────
function updateCode() {
    const raw = curlInput.value.trim();
    if (!raw) {
        codeOutput.textContent = '// Paste a cURL command on the left to generate code';
        badgeMethod.textContent = 'NONE';
        badgeUrl.textContent = '—';
        badgeHeaders.textContent = '0';
        badgeBody.textContent = 'None';
        return;
    }

    const req = parseCurl(raw);
    if (!req) return;

    // Update Meta badges
    badgeMethod.textContent = req.method;
    badgeUrl.textContent = req.url;
    badgeHeaders.textContent = Object.keys(req.headers).length;

    let bodyText = 'None';
    if (req.data) {
        bodyText = req.isJson ? 'JSON' : 'Raw / URL-encoded';
    }
    badgeBody.textContent = bodyText;

    // Generate selected language
    let code = '';
    switch (currentLang) {
        case 'python': code = genPython(req); break;
        case 'javascript': code = genJavascript(req); break;
        case 'axios': code = genAxios(req); break;
        case 'go': code = genGo(req); break;
        case 'php': code = genPhp(req); break;
        default: code = genPython(req); break;
    }

    codeOutput.textContent = code;
}

// ─── Event Handlers ──────────────────────────────────────────────────────────
curlInput.addEventListener('input', updateCode);

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentLang = btn.dataset.lang;
        updateCode();
    });
});

document.querySelectorAll('.btn-sample').forEach(btn => {
    btn.addEventListener('click', () => {
        const sampleKey = btn.dataset.sample;
        if (SAMPLES[sampleKey]) {
            curlInput.value = SAMPLES[sampleKey];
            updateCode();
            showToast(`Loaded ${btn.textContent} sample!`);
        }
    });
});

btnClear.addEventListener('click', () => {
    curlInput.value = '';
    updateCode();
    showToast('Cleared input!');
});

btnCopyCode.addEventListener('click', () => {
    const code = codeOutput.textContent;
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
        showToast('Code copied to clipboard! ✓');
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

// Init with sample
curlInput.value = SAMPLES.postJson;
updateCode();
