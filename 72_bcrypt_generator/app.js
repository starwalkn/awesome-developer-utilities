
document.getElementById('gen-btn').addEventListener('click', () => {
    const pw = document.getElementById('gen-pw').value;
    const rounds = parseInt(document.getElementById('gen-rounds').value) || 10;
    const out = document.getElementById('gen-out');
    
    if(!pw) return alert('Enter a password to hash');
    
    const btn = document.getElementById('gen-btn');
    btn.innerText = 'Hashing...';
    
    // async via settimeout to let UI update
    setTimeout(() => {
        try {
            const salt = dcodeIO.bcrypt.genSaltSync(rounds);
            const hash = dcodeIO.bcrypt.hashSync(pw, salt);
            out.value = hash;
        } catch(e) {
            alert('Error generating hash. Check rounds (too high?).');
        }
        btn.innerText = 'Generate Bcrypt Hash';
    }, 50);
});

document.getElementById('ver-btn').addEventListener('click', () => {
    const hash = document.getElementById('ver-hash').value.trim();
    const pw = document.getElementById('ver-pw').value;
    const out = document.getElementById('ver-out');
    
    if(!hash || !pw) return alert('Enter both hash and password');
    
    try {
        const match = dcodeIO.bcrypt.compareSync(pw, hash);
        if(match) {
            out.className = 'ver-res match';
            out.innerText = '✅ Match! Password is correct.';
        } else {
            out.className = 'ver-res fail';
            out.innerText = '❌ Invalid password.';
        }
    } catch(e) {
        out.className = 'ver-res fail';
        out.innerText = '❌ Error: Invalid Bcrypt Hash Format.';
    }
});
