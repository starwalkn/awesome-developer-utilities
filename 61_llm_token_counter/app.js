// Universal LLM Token Counter & Pricing Engine
const MODELS = [
    {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'OpenAI',
        providerClass: 'provider-openai',
        contextLimit: 128000,
        inputPerMillion: 2.50,
        outputPerMillion: 10.00,
        // Heuristic token multipliers relative to baseline
        wordRatio: 1.30,
        cjkRatio: 1.25,
        numRatio: 0.65,
        symRatio: 0.35
    },
    {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'OpenAI',
        providerClass: 'provider-openai',
        contextLimit: 128000,
        inputPerMillion: 0.15,
        outputPerMillion: 0.60,
        wordRatio: 1.30,
        cjkRatio: 1.25,
        numRatio: 0.65,
        symRatio: 0.35
    },
    {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        providerClass: 'provider-anthropic',
        contextLimit: 200000,
        inputPerMillion: 3.00,
        outputPerMillion: 15.00,
        wordRatio: 1.33,
        cjkRatio: 1.45,
        numRatio: 0.70,
        symRatio: 0.38
    },
    {
        id: 'claude-3-5-haiku',
        name: 'Claude 3.5 Haiku',
        provider: 'Anthropic',
        providerClass: 'provider-anthropic',
        contextLimit: 200000,
        inputPerMillion: 0.80,
        outputPerMillion: 4.00,
        wordRatio: 1.33,
        cjkRatio: 1.45,
        numRatio: 0.70,
        symRatio: 0.38
    },
    {
        id: 'gemini-2-0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'Google',
        providerClass: 'provider-google',
        contextLimit: 1048576,
        inputPerMillion: 0.10,
        outputPerMillion: 0.40,
        wordRatio: 1.25,
        cjkRatio: 1.15,
        numRatio: 0.60,
        symRatio: 0.32
    },
    {
        id: 'gemini-1-5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'Google',
        providerClass: 'provider-google',
        contextLimit: 2097152,
        inputPerMillion: 1.25,
        outputPerMillion: 5.00,
        wordRatio: 1.25,
        cjkRatio: 1.15,
        numRatio: 0.60,
        symRatio: 0.32
    },
    {
        id: 'deepseek-v3',
        name: 'DeepSeek-V3',
        provider: 'DeepSeek',
        providerClass: 'provider-deepseek',
        contextLimit: 64000,
        inputPerMillion: 0.14,
        outputPerMillion: 0.28,
        wordRatio: 1.28,
        cjkRatio: 1.18,
        numRatio: 0.62,
        symRatio: 0.34
    },
    {
        id: 'llama-3-3-70b',
        name: 'Llama 3.3 70B',
        provider: 'Meta / Groq',
        providerClass: 'provider-meta',
        contextLimit: 128000,
        inputPerMillion: 0.59,
        outputPerMillion: 0.79,
        wordRatio: 1.31,
        cjkRatio: 1.38,
        numRatio: 0.68,
        symRatio: 0.36
    }
];

const SAMPLES = {
    code: `import asyncio
import aiohttp
from bs4 import BeautifulSoup

async def fetch_page(url: str, session: aiohttp.ClientSession) -> str:
    """Fetch raw HTML content asynchronously with retry backoff."""
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    async with session.get(url, headers=headers, timeout=10) as response:
        if response.status == 200:
            return await response.text()
        raise Exception(f"HTTP error: {response.status}")

async def main():
    urls = ["https://example.com/api/v1", "https://example.org/data"]
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_page(u, session) for u in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        print(f"Processed {len(results)} requests concurrently.")

if __name__ == "__main__":
    asyncio.run(main())`,

    cjk: `【高并发大模型推理架构测试】
在微服务与大语言模型（LLM）的集成系统中，Token 的编码效率直接决定服务调用与吞吐成本。

基准测试结果：
1. 简体中文在早期 GPT-3.5（cl100k）环境下，每个汉字约消耗 1.8 至 2.4 个 Token。
2. 采用新一代 o200k 分词器（如 GPT-4o）与 DeepSeek-V3 之后，中文压缩率提升超过 35%，平均每字仅需 1.1 ~ 1.25 个 Token。
3. 针对百万级长上下文（Context Window），Gemini 2.0 与 DeepSeek-V3 表现出极高的推理性价比。

建议在上线前针对各语种混合比例进行精确计费评估。`,

    prompt: `You are an expert Data Extraction Agent.

Your goal is to parse the user's unstructured receipts and invoices into valid JSON adhering strictly to this schema:

{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "merchant_name": { "type": "string" },
    "transaction_date": { "type": "string", "format": "date" },
    "total_amount": { "type": "number", "minimum": 0 },
    "currency": { "type": "string", "enum": ["USD", "EUR", "TWD", "JPY", "GBP"] },
    "tax_amount": { "type": "number" },
    "line_items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "description": { "type": "string" },
          "quantity": { "type": "integer" },
          "unit_price": { "type": "number" }
        },
        "required": ["description", "quantity", "unit_price"]
      }
    }
  },
  "required": ["merchant_name", "transaction_date", "total_amount", "currency", "line_items"]
}

Always return ONLY valid raw JSON with zero conversational filler or markdown fences.`,

    article: `Attention Is All You Need (Vaswani et al., 2017) introduced the Transformer architecture, dispensing with recurrence and convolutions entirely. Based solely on self-attention mechanisms to draw global dependencies between input and output, the Transformer allows for significantly more parallelization and can reach a new state of the art in translation quality after being trained for as little as twelve hours on eight P100 GPUs.`
};

// DOM References
const promptInput = document.getElementById('promptInput');
const statChars = document.getElementById('statChars');
const statWords = document.getElementById('statWords');
const statCjk = document.getElementById('statCjk');
const statAvgTokens = document.getElementById('statAvgTokens');
const modelsGrid = document.getElementById('modelsGrid');

const segLatin = document.getElementById('segLatin');
const segCjk = document.getElementById('segCjk');
const segNum = document.getElementById('segNum');
const segSym = document.getElementById('segSym');

const pctLatin = document.getElementById('pctLatin');
const pctCjk = document.getElementById('pctCjk');
const pctNum = document.getElementById('pctNum');
const pctSym = document.getElementById('pctSym');

const sampleSelect = document.getElementById('sampleSelect');
const fileUpload = document.getElementById('fileUpload');
const btnClear = document.getElementById('btnClear');
const globalToast = document.getElementById('globalToast');

// ─── Text Analyzer ───────────────────────────────────────────────────────────
function analyzeText(text) {
    const totalChars = text.length;
    const noSpaceChars = text.replace(/\s+/g, '').length;

    // Latin words
    const latinMatches = text.match(/[a-zA-Z]+/g) || [];
    const latinWordCount = latinMatches.length;
    const latinCharCount = latinMatches.reduce((acc, w) => acc + w.length, 0);

    // CJK characters (Chinese, Japanese Kana/Kanji, Korean Hangul)
    const cjkMatches = text.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g) || [];
    const cjkCount = cjkMatches.length;

    // Numbers
    const numMatches = text.match(/\d+/g) || [];
    const numCharCount = numMatches.reduce((acc, n) => acc + n.length, 0);

    // Symbols / Spaces / Other
    const symCharCount = Math.max(0, totalChars - latinCharCount - cjkCount - numCharCount);

    return {
        totalChars,
        noSpaceChars,
        latinWordCount,
        latinCharCount,
        cjkCount,
        numCharCount,
        symCharCount
    };
}

// ─── Token Estimator per Model ───────────────────────────────────────────────
function estimateTokens(analysis, model) {
    if (analysis.totalChars === 0) return 0;

    // Baseline calculation based on lexical components
    const fromWords = analysis.latinWordCount * model.wordRatio;
    const fromCjk = analysis.cjkCount * model.cjkRatio;
    const fromNums = analysis.numCharCount * model.numRatio;
    const fromSyms = analysis.symCharCount * model.symRatio;

    let total = Math.ceil(fromWords + fromCjk + fromNums + fromSyms);

    // Minimum fallback: at least 1 token if non-empty
    return Math.max(1, total);
}

// ─── Render Models Grid ──────────────────────────────────────────────────────
function buildModelCards() {
    modelsGrid.innerHTML = '';
    MODELS.forEach(m => {
        const card = document.createElement('div');
        card.className = 'model-card';
        card.id = `card-${m.id}`;
        card.innerHTML = `
            <div class="model-header">
                <div>
                    <div class="model-name">${m.name}</div>
                </div>
                <span class="model-provider ${m.providerClass}">${m.provider}</span>
            </div>

            <div class="token-stat-row">
                <span class="token-big" id="token-val-${m.id}">0</span>
                <span class="token-sub">tokens</span>
            </div>

            <div class="context-box">
                <div class="context-meta">
                    <span>Context Window</span>
                    <span id="ctx-label-${m.id}">0 / ${formatK(m.contextLimit)}</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" id="ctx-bar-${m.id}"></div>
                </div>
            </div>

            <div class="pricing-row">
                <div>
                    <span style="color:var(--muted); font-size:10px; text-transform:uppercase; display:block;">Est. Input Cost</span>
                    <span class="price-in" id="price-in-${m.id}">$0.0000</span>
                </div>
                <div style="text-align:right;">
                    <span style="color:var(--muted); font-size:10px; text-transform:uppercase; display:block;">If 1k Out</span>
                    <span class="price-out" id="price-out-${m.id}">+$0.0000</span>
                </div>
            </div>
        `;
        modelsGrid.appendChild(card);
    });
}

function formatK(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toString();
}

function formatCost(cost) {
    if (cost === 0) return '$0.0000';
    if (cost < 0.0001) return '< $0.0001';
    if (cost < 1) return '$' + cost.toFixed(4);
    return '$' + cost.toFixed(2);
}

// ─── Recalculate Everything ──────────────────────────────────────────────────
function updateCalculations() {
    const text = promptInput.value;
    const analysis = analyzeText(text);

    // Update Overview Stats
    statChars.innerHTML = `${analysis.totalChars.toLocaleString()} <span class="stat-sub">/ ${analysis.noSpaceChars.toLocaleString()}</span>`;
    statWords.textContent = analysis.latinWordCount.toLocaleString();
    statCjk.textContent = analysis.cjkCount.toLocaleString();

    // Update Density Bar
    const total = analysis.totalChars || 1;
    const pLatin = Math.round((analysis.latinCharCount / total) * 100);
    const pCjk = Math.round((analysis.cjkCount / total) * 100);
    const pNum = Math.round((analysis.numCharCount / total) * 100);
    const pSym = Math.max(0, 100 - pLatin - pCjk - pNum);

    segLatin.style.width = `${pLatin}%`;
    segCjk.style.width = `${pCjk}%`;
    segNum.style.width = `${pNum}%`;
    segSym.style.width = `${pSym}%`;

    pctLatin.textContent = `${pLatin}%`;
    pctCjk.textContent = `${pCjk}%`;
    pctNum.textContent = `${pNum}%`;
    pctSym.textContent = `${pSym}%`;

    // Calculate tokens for each model
    let tokenSum = 0;
    MODELS.forEach(m => {
        const tokens = analysis.totalChars === 0 ? 0 : estimateTokens(analysis, m);
        tokenSum += tokens;

        // Token display
        document.getElementById(`token-val-${m.id}`).textContent = tokens.toLocaleString();

        // Context progress bar
        const ctxPercent = Math.min(100, (tokens / m.contextLimit) * 100);
        const bar = document.getElementById(`ctx-bar-${m.id}`);
        bar.style.width = `${ctxPercent}%`;
        if (ctxPercent > 85) {
            bar.style.background = 'var(--danger)';
        } else if (ctxPercent > 60) {
            bar.style.background = 'var(--amber)';
        } else {
            bar.style.background = 'linear-gradient(90deg, #10b981, #06b6d4)';
        }
        document.getElementById(`ctx-label-${m.id}`).textContent = `${tokens.toLocaleString()} / ${formatK(m.contextLimit)}`;

        // Pricing calculations
        const inputCost = (tokens / 1000000) * m.inputPerMillion;
        const outCostSample = (1000 / 1000000) * m.outputPerMillion;

        document.getElementById(`price-in-${m.id}`).textContent = formatCost(inputCost);
        document.getElementById(`price-out-${m.id}`).textContent = '+' + formatCost(outCostSample);
    });

    const avgTokens = analysis.totalChars === 0 ? 0 : Math.round(tokenSum / MODELS.length);
    statAvgTokens.textContent = avgTokens.toLocaleString();
}

// ─── Event Handlers ──────────────────────────────────────────────────────────
promptInput.addEventListener('input', updateCalculations);

sampleSelect.addEventListener('change', () => {
    const val = sampleSelect.value;
    if (SAMPLES[val]) {
        promptInput.value = SAMPLES[val];
        updateCalculations();
        showToast('Sample loaded!');
    }
});

btnClear.addEventListener('click', () => {
    promptInput.value = '';
    sampleSelect.value = '';
    updateCalculations();
    showToast('Cleared!');
});

fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        promptInput.value = event.target.result;
        updateCalculations();
        showToast(`Loaded ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    };
    reader.readAsText(file);
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

// ─── Init ────────────────────────────────────────────────────────────────────
buildModelCards();
// Load English paper sample by default (100% English)
promptInput.value = SAMPLES.article;
updateCalculations();
