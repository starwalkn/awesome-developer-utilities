
document.getElementById('parse-btn').addEventListener('click', () => {
    const raw = document.getElementById('cookie-input').value;
    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const resultsDiv = document.getElementById('results');
    const listDiv = document.getElementById('cookies-list');
    listDiv.innerHTML = '';
    
    if(lines.length === 0) return alert('Please enter at least one cookie.');
    
    let html = '';
    lines.forEach(line => {
        let cleanLine = line;
        if(cleanLine.toLowerCase().startsWith('set-cookie:')) {
            cleanLine = cleanLine.substring(11).trim();
        }
        
        const parts = cleanLine.split(';').map(p => p.trim()).filter(p => p.length > 0);
        if(parts.length === 0) return;
        
        const nv = parts[0].split('=');
        const name = nv[0];
        const val = nv.slice(1).join('=');
        
        const attrs = {
            secure: false, httponly: false, samesite: 'Not Set (Lax by default in modern browsers)',
            domain: 'Not Set (Host Only)', path: 'Not Set (Default)',
            maxAge: null, expires: null
        };
        
        for(let i=1; i<parts.length; i++) {
            const p = parts[i].toLowerCase();
            if(p === 'secure') attrs.secure = true;
            if(p === 'httponly') attrs.httponly = true;
            if(p.startsWith('samesite=')) attrs.samesite = parts[i].substring(9);
            if(p.startsWith('domain=')) attrs.domain = parts[i].substring(7);
            if(p.startsWith('path=')) attrs.path = parts[i].substring(5);
            if(p.startsWith('max-age=')) attrs.maxAge = parseInt(parts[i].substring(8));
            if(p.startsWith('expires=')) attrs.expires = parts[i].substring(8);
        }
        
        let expiryText = 'Session Cookie (Deletes when browser closes)';
        if(attrs.maxAge !== null) {
            expiryText = `Expires in ${attrs.maxAge} seconds`;
        } else if(attrs.expires !== null) {
            const d = new Date(attrs.expires);
            if(!isNaN(d)) {
                const diff = Math.max(0, d.getTime() - Date.now());
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                expiryText = `Expires on ${d.toUTCString()} (in ~${days} days)`;
            } else {
                expiryText = `Expires on ${attrs.expires.replace(/</g, '&lt;')} (Parse Error)`;
            }
        }

        html += `
        <div class="cookie-card">
            <div class="cookie-header">${name.replace(/</g, '&lt;')} = ${val.replace(/</g, '&lt;')}</div>
            <div class="cookie-body">
                <table>
                    <tr>
                        <th>Attribute</th>
                        <th>Value</th>
                        <th>Explanation & Security</th>
                    </tr>
                    <tr>
                        <td class="attr-name">HttpOnly</td>
                        <td>${attrs.httponly ? '✅ True' : '❌ False'}</td>
                        <td>
                            ${attrs.httponly ? 
                            '<span class="status-badge status-ok">Secure</span> Prevents JS/XSS from reading the cookie.' : 
                            '<span class="status-badge status-bad">Insecure</span> JS can read this cookie. Risk of XSS theft.'}
                        </td>
                    </tr>
                    <tr>
                        <td class="attr-name">Secure</td>
                        <td>${attrs.secure ? '✅ True' : '❌ False'}</td>
                        <td>
                            ${attrs.secure ? 
                            '<span class="status-badge status-ok">Secure</span> Cookie only sent over HTTPS.' : 
                            '<span class="status-badge status-warn">Warning</span> Cookie sent over unencrypted HTTP.'}
                        </td>
                    </tr>
                    <tr>
                        <td class="attr-name">SameSite</td>
                        <td>${attrs.samesite}</td>
                        <td>
                            ${attrs.samesite.toLowerCase() === 'strict' || attrs.samesite.toLowerCase() === 'lax' ? 
                            '<span class="status-badge status-ok">Secure</span> Protects against CSRF attacks.' : 
                            '<span class="status-badge status-warn">Warning</span> Missing or None. Potential CSRF risk if used for auth.'}
                        </td>
                    </tr>
                    <tr>
                        <td class="attr-name">Domain</td>
                        <td>${attrs.domain}</td>
                        <td>Where the cookie is sent. If not set, strictly limited to exact host.</td>
                    </tr>
                    <tr>
                        <td class="attr-name">Path</td>
                        <td>${attrs.path}</td>
                        <td>URL path required to send the cookie.</td>
                    </tr>
                    <tr>
                        <td class="attr-name">Lifetime</td>
                        <td colspan="2"><strong>${expiryText}</strong></td>
                    </tr>
                </table>
            </div>
        </div>
        `;
    });
    
    listDiv.innerHTML = html;
    resultsDiv.classList.remove('hidden');
});
