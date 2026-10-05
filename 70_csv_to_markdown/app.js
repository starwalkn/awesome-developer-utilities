
const csvIn = document.getElementById('csv-in');
const mdOut = document.getElementById('md-out');
const copyBtn = document.getElementById('copy-btn');

function parseCSV(text) {
    let p = '', row = [''], ret = [row], i = 0, r = 0, s = !0, l;
    for (l of text) {
        if ('"' === l) {
            if (s && l === p) row[i] += l;
            s = !s;
        } else if (',' === l && s) l = row[++i] = '';
        else if ('\n' === l && s) {
            if ('\r' === p) row[i] = row[i].slice(0, -1);
            row = ret[++r] = [l = '']; i = 0;
        } else row[i] += l;
        p = l;
    }
    return ret;
}

function csvToMd(csvText) {
    if(!csvText.trim()) return '';
    
    let isTsv = csvText.includes('\t') && !csvText.includes(',');
    let rows;
    if(isTsv) {
        rows = csvText.split('\n').map(r => r.split('\t').map(c => c.trim().replace(/\r/g, '')));
    } else {
        rows = parseCSV(csvText);
    }
    
    rows = rows.filter(r => r.join('').trim() !== '');
    if(rows.length === 0) return '';
    
    const headers = rows[0];
    const headerRow = '| ' + headers.join(' | ') + ' |';
    const separatorRow = '| ' + headers.map(() => '---').join(' | ') + ' |';
    
    let md = headerRow + '\n' + separatorRow + '\n';
    
    for(let i=1; i<rows.length; i++) {
        md += '| ' + rows[i].join(' | ') + ' |\n';
    }
    return md;
}

csvIn.addEventListener('input', () => {
    mdOut.value = csvToMd(csvIn.value);
});

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(mdOut.value);
    copyBtn.innerText = 'Copied!';
    setTimeout(() => copyBtn.innerText = 'Copy Markdown', 2000);
});
