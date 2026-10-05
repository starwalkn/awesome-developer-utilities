
const cb = document.querySelectorAll('input[type=checkbox]');
const cmd = document.getElementById('cmd-out');
const sym = document.getElementById('sym-out');

function calc() {
    let u = 0, g = 0, o = 0;
    let s = '-';
    
    if(document.getElementById('u-r').checked) { u += 4; s += 'r'; } else s += '-';
    if(document.getElementById('u-w').checked) { u += 2; s += 'w'; } else s += '-';
    if(document.getElementById('u-x').checked) { u += 1; s += 'x'; } else s += '-';
    
    if(document.getElementById('g-r').checked) { g += 4; s += 'r'; } else s += '-';
    if(document.getElementById('g-w').checked) { g += 2; s += 'w'; } else s += '-';
    if(document.getElementById('g-x').checked) { g += 1; s += 'x'; } else s += '-';
    
    if(document.getElementById('o-r').checked) { o += 4; s += 'r'; } else s += '-';
    if(document.getElementById('o-w').checked) { o += 2; s += 'w'; } else s += '-';
    if(document.getElementById('o-x').checked) { o += 1; s += 'x'; } else s += '-';
    
    cmd.innerText = chmod  file;
    sym.innerText = s;
}

cb.forEach(c => c.addEventListener('change', calc));
calc();
