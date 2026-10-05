
const headerDB = {
    'accept': 'Informs the server about the types of data that can be sent back. Important for content negotiation.',
    'accept-encoding': 'The encoding algorithm, usually a compression algorithm, that can be used on the resource sent back.',
    'authorization': 'Contains the credentials to authenticate a user agent with a server.',
    'cache-control': 'Holds directives (instructions) for caching in both requests and responses.',
    'content-type': 'Indicates the original media type of the resource (prior to any content encoding applied for sending).',
    'strict-transport-security': 'HSTS. Forces browsers to interact with the site only using HTTPS. Crucial security header.',
    'content-security-policy': 'CSP. Controls which resources the user agent is allowed to load. Mitigates XSS attacks.',
    'x-frame-options': 'Indicates whether a browser should be allowed to render a page in a <frame>, <iframe>, <embed> or <object>. Prevents clickjacking.',
    'x-content-type-options': 'Stops a browser from trying to MIME-sniff the content type and forces it to stick with the declared content-type.',
    'referrer-policy': 'Governs which referrer information, sent in the Referer header, should be included with requests made.',
    'access-control-allow-origin': 'Indicates whether the response can be shared with requesting code from the given origin. Key for CORS.',
    'set-cookie': 'Used to send cookies from the server to the user agent.',
    'server': 'Contains information about the software used by the origin server. Often recommended to mask this to hide versions.',
    'x-powered-by': 'Specifies the technology supporting the web application. Recommended to remove to hide technology stack.',
    'x-xss-protection': 'Legacy security header to enable XSS filtering. Largely superseded by CSP.',
    'permissions-policy': 'Provides a mechanism to allow and deny the use of browser features in its own frame, and in content within any <iframe> elements.'
};
const securityCritical = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy'];

document.getElementById('analyze-btn').addEventListener('click', () => {
    const raw = document.getElementById('header-input').value;
    const lines = raw.split('\n');
    const parsed = {};
    const keysLower = [];
    
    lines.forEach(line => {
        const match = line.match(/^([^:]+):\s*(.*)$/);
        if(match) {
            const key = match[1].trim();
            const val = match[2].trim();
            if(!parsed[key]) parsed[key] = [];
            parsed[key].push(val);
            keysLower.push(key.toLowerCase());
        }
    });

    const resultsDiv = document.getElementById('results');
    const listDiv = document.getElementById('header-list');
    const scoreDiv = document.getElementById('sec-score');
    
    if(Object.keys(parsed).length === 0) {
        alert('No valid headers found. Please paste valid HTTP headers (Format: Key: Value).');
        return;
    }

    listDiv.innerHTML = '';
    let secureFound = 0;
    
    for(const [key, vals] of Object.entries(parsed)) {
        const kLower = key.toLowerCase();
        const isSec = securityCritical.includes(kLower);
        if(isSec) secureFound++;
        
        const desc = headerDB[kLower] || 'Standard or custom HTTP header without specific documentation in current DB.';
        let badge = '';
        if(isSec) badge = `<span class="badge sec-green">Security Header</span>`;
        if(kLower === 'server' || kLower === 'x-powered-by') badge = `<span class="badge sec-red">Info Leak Risk</span>`;

        const html = `
            <div class="header-item">
                <div class="h-key">${key} ${badge}</div>
                ${vals.map(v => `<div class="h-val">${v.replace(/</g, '&lt;')}</div>`).join('')}
                <div class="h-desc">${desc}</div>
            </div>
        `;
        listDiv.innerHTML += html;
    }

    const missing = securityCritical.filter(h => !keysLower.includes(h));
    if(missing.length > 0 && (keysLower.includes('set-cookie') || keysLower.includes('content-type'))) {
         listDiv.innerHTML += `
            <div class="missing-headers">
                <h4 style="margin-top:0; color:var(--red);">Missing Security Headers</h4>
                <p style="font-size:0.9rem; color:#ccc;">This response is missing the following recommended security headers:</p>
                <ul style="margin-bottom:0;">${missing.map(m => `<li style="color:var(--text);">${m}</li>`).join('')}</ul>
            </div>
        `;
    }

    scoreDiv.className = 'security-score';
    if(secureFound >= 4) {
        scoreDiv.innerText = 'Security Grade: A (Excellent)';
        scoreDiv.classList.add('score-good');
    } else if(secureFound >= 2) {
        scoreDiv.innerText = 'Security Grade: C (Fair)';
        scoreDiv.classList.add('score-warn');
    } else if (keysLower.includes('content-type')) {
        scoreDiv.innerText = 'Security Grade: F (Poor)';
        scoreDiv.classList.add('score-bad');
    } else {
        scoreDiv.innerText = 'Header Analysis Complete (Request)';
        scoreDiv.classList.add('score-good');
    }

    resultsDiv.classList.remove('hidden');
});
