// Whisper AI Subtitle Cleaner & Formatter
const SAMPLE_SRT = `1
00:00:01,200 --> 00:00:04,500
[Music]
Speaker 1: Welcome back to our weekly AI engineering session.

2
00:00:04,600 --> 00:00:07,800
Today we are diving deep into
autonomous coding agents and local models.

3
00:00:08,000 --> 00:00:11,300
[Applause]
As many of you know, latency and cost
have been the two biggest roadblocks.

4
00:00:11,500 --> 00:00:15,200
>> But with recent advancements in quantizations
like AWQ and EXL2, we are seeing 3x throughput.

5
00:00:15,400 --> 00:00:18,900
Let's look at the benchmarks on the slide.
First, inference time dropped from 85ms to 24ms.

6
00:00:19,100 --> 00:00:23,400
Second, memory consumption is now under 12GB of VRAM.
This means anyone with a modern RTX GPU can run this locally.`;

// DOM Elements
const rawInput = document.getElementById('rawInput');
const cleanedOutput = document.getElementById('cleanedOutput');
const statWords = document.getElementById('statWords');
const statChars = document.getElementById('statChars');
const statTime = document.getElementById('statTime');
const statStripped = document.getElementById('statStripped');

const chkTimestamps = document.getElementById('chkTimestamps');
const chkSoundTags = document.getElementById('chkSoundTags');
const chkSpeakerTags = document.getElementById('chkSpeakerTags');
const chkParagraphs = document.getElementById('chkParagraphs');
const chkDeduplicate = document.getElementById('chkDeduplicate');

const tabButtons = document.querySelectorAll('.tab-btn');
const btnCopy = document.getElementById('btnCopy');
const btnDownload = document.getElementById('btnDownload');
const btnLoadSample = document.getElementById('btnLoadSample');
const btnClear = document.getElementById('btnClear');
const copyToast = document.getElementById('copyToast');

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

let currentMode = 'clean';
let baseCleanText = '';

// Cleaning Function
function processText() {
    const raw = rawInput.value;
    if (!raw.trim()) {
        cleanedOutput.value = '';
        updateStats('', 0);
        return;
    }

    let text = raw;
    let strippedCount = 0;

    // 1. Remove WEBVTT header & metadata
    text = text.replace(/^WEBVTT[^\n]*\n+/i, '');
    text = text.replace(/NOTE[^\n]*\n+/gi, '');

    // 2. Remove Timestamps & Indices
    if (chkTimestamps.checked) {
        // Match standard SRT/VTT timestamps e.g. 00:00:01,200 --> 00:00:04,500
        const timestampRegex = /(?:\d+\r?\n)?(?:\d{1,2}:)?\d{2}:\d{2}[,\.]\d{2,3}\s*-->\s*(?:\d{1,2}:)?\d{2}:\d{2}[,\.]\d{2,3}[^\n]*\r?\n?/g;
        const matches = text.match(timestampRegex);
        if (matches) strippedCount = matches.length;
        text = text.replace(timestampRegex, '\n');

        // Remove standalone sequence numbers on their own line
        text = text.replace(/^\s*\d+\s*$/gm, '');
    }

    // 3. Remove Sound Tags [Music], (Applause), etc.
    if (chkSoundTags.checked) {
        text = text.replace(/\[\s*(?:Music|Applause|Laughter|Cheering|Silence|Background sound|music|applause|laughter|cheering|cough)[^\]]*\]/gi, '');
        text = text.replace(/\(\s*(?:Music|Applause|Laughter|Cheering|Silence|Background sound|music|applause)[^\)]*\)/gi, '');
    }

    // 4. Remove Speaker Tags (e.g. Speaker 1:, >>, JOHN DOE:)
    if (chkSpeakerTags.checked) {
        text = text.replace(/^\s*(?:Speaker\s*\w+|SPEAKER_\d+|Host|Guest|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*:\s*/gm, '');
        text = text.replace(/^\s*>>\s*/gm, '');
    }

    // Split into non-empty lines
    let lines = text.split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0);

    // 5. Remove consecutive duplicate lines (Whisper audio glitch loop)
    if (chkDeduplicate.checked) {
        const uniqueLines = [];
        for (let i = 0; i < lines.length; i++) {
            if (i === 0 || lines[i] !== lines[i - 1]) {
                uniqueLines.push(lines[i]);
            }
        }
        lines = uniqueLines;
    }

    // 6. Intelligent Paragraph Merging
    if (chkParagraphs.checked) {
        const paragraphs = [];
        let currentPara = [];
        let sentenceCountInPara = 0;

        lines.forEach(line => {
            currentPara.push(line);
            // Check if line ends with sentence terminator
            if (/[.?!。？！]$/.test(line)) {
                sentenceCountInPara++;
                // Form a paragraph every 3-4 sentences
                if (sentenceCountInPara >= 3) {
                    paragraphs.push(currentPara.join(' '));
                    currentPara = [];
                    sentenceCountInPara = 0;
                }
            }
        });

        if (currentPara.length > 0) {
            paragraphs.push(currentPara.join(' '));
        }

        baseCleanText = paragraphs.join('\n\n');
    } else {
        baseCleanText = lines.join('\n');
    }

    // Render formatted output according to mode
    renderOutput();
    updateStats(baseCleanText, strippedCount);
}

// Render by Mode
function renderOutput() {
    if (!baseCleanText) {
        cleanedOutput.value = '';
        return;
    }

    switch (currentMode) {
        case 'clean':
            cleanedOutput.value = baseCleanText;
            break;

        case 'summary':
            cleanedOutput.value = `You are an elite research analyst and executive assistant. Below is the transcript of an audio recording/presentation.

Please perform a comprehensive synthesis with the following structure:
1. 🎯 Executive Summary (2-3 sentences capturing the core message)
2. 💡 Key Takeaways & Core Insights (4-6 actionable bullet points)
3. 📊 Notable Data Points & Metrics Mentioned
4. ❓ Critical Questions / Follow-ups

---
TRANSCRIPT:
${baseCleanText}`;
            break;

        case 'meeting':
            cleanedOutput.value = `Please format the following raw speech transcript into formal Meeting Minutes:

📋 Meeting Overview:
- Objective / Topic Discussed
- Key Decisions Made
- Action Items & Owner Checklist (Who does what by when)
- Unresolved Issues & Next Steps

---
TRANSCRIPT:
${baseCleanText}`;
            break;

        case 'podcast':
            cleanedOutput.value = `Act as an expert podcast producer. Transform the following raw transcript into compelling Podcast Show Notes:

🎙️ Episode Title Ideas (3 catchy options)
📝 Short Synopsis (100 words for Spotify/Apple Podcasts)
⏱️ Key Topics & Timestamps (Outline main conversational shifts)
🔥 Quotable Soundbites (3 memorable quotes)
🔗 Resources & Mentions

---
TRANSCRIPT:
${baseCleanText}`;
            break;

        case 'social':
            cleanedOutput.value = `Turn this transcript into a high-engagement Twitter/X thread (5-7 tweets) or LinkedIn post.
- Tweet 1: Hook the reader with a surprising problem or counter-intuitive insight.
- Tweets 2-5: Breakdown the core solution step-by-step with zero fluff.
- Tweet 6: Summarize the primary takeaway.
- Final Tweet: Call to action.

---
TRANSCRIPT:
${baseCleanText}`;
            break;
    }
}

// Stats Calculation
function updateStats(text, stripped) {
    if (!text) {
        statWords.textContent = '0';
        statChars.textContent = '0';
        statTime.textContent = '0m';
        statStripped.textContent = stripped.toString();
        return;
    }

    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = text.length;
    const minutes = Math.ceil(words / 200);

    statWords.textContent = words.toLocaleString();
    statChars.textContent = chars.toLocaleString();
    statTime.textContent = `${minutes}m`;
    statStripped.textContent = stripped.toLocaleString();
}

// Copy Action
btnCopy.addEventListener('click', () => {
    if (!cleanedOutput.value) return;
    navigator.clipboard.writeText(cleanedOutput.value).then(() => {
        copyToast.classList.add('show');
        setTimeout(() => copyToast.classList.remove('show'), 2000);
    });
});

// Download Action
btnDownload.addEventListener('click', () => {
    if (!cleanedOutput.value) return;
    const blob = new Blob([cleanedOutput.value], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${currentMode}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
});

// Sample & Clear
btnLoadSample.addEventListener('click', () => {
    rawInput.value = SAMPLE_SRT;
    processText();
});

btnClear.addEventListener('click', () => {
    rawInput.value = '';
    cleanedOutput.value = '';
    baseCleanText = '';
    updateStats('', 0);
});

// Mode Tabs
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        renderOutput();
    });
});

// Input Listeners
rawInput.addEventListener('input', processText);
[chkTimestamps, chkSoundTags, chkSpeakerTags, chkParagraphs, chkDeduplicate].forEach(chk => {
    chk.addEventListener('change', processText);
});

// File Drag & Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        readFile(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        readFile(e.target.files[0]);
    }
});

function readFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        rawInput.value = e.target.result;
        processText();
    };
    reader.readAsText(file);
}

// Initial sample load
rawInput.value = SAMPLE_SRT;
processText();
