// Easy Geminiv3.6 — タブタイトル自動設定 + API使用量追跡
const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => Array.from(root.querySelectorAll(q));

const verEl = $('#ver');
const needKeyEl = $('#needKey');

const tabbarEl = $('#tabbar');
const addTabBtn = $('#addTab');
const paneEl = $('#pane');
const tplSession = $('#tpl-session');

const toastEl = $('#toast');

const GEMINI_HOST = 'https://generativelanguage.googleapis.com/v1beta';
const PRESET_KEY = 'easyGemini.presets.v2';
const PRESET_MAX = 200;
const SYSTEM_PROMPT_KEY = 'easyGemini.systemPrompt';
const DEFAULT_SYSTEM_PROMPT = [
  'You are an expert editor/writer.',
  "Do not ask follow-up questions; proceed directly.",
  "Write responses in the user's language (Japanese if the input is Japanese)."
].join(' ');

let sessions = [];
let activeId = null;

// ========= Utils =========
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.style.display = 'block';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (toastEl.style.display = 'none'), 1400);
}
function newId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function now() { return Date.now(); }

const ANTHROPIC_HOST = 'https://api.anthropic.com/v1';
const OPENAI_HOST = 'https://api.openai.com/v1';
const API_USAGE_KEY = 'easyGemini.apiUsage';

// ========= API使用量追跡 =========
async function getApiUsage() {
  const v = await new Promise(res => chrome.storage.local.get([API_USAGE_KEY], x => res(x?.[API_USAGE_KEY])));
  return v || {
    gemini: { inputTokens: 0, outputTokens: 0, lastUpdated: null },
    claude: { inputTokens: 0, outputTokens: 0, lastUpdated: null },
    openai: { inputTokens: 0, outputTokens: 0, lastUpdated: null }
  };
}

async function addApiUsage(apiType, inputTokens, outputTokens) {
  const usage = await getApiUsage();
  if (!usage[apiType]) {
    usage[apiType] = { inputTokens: 0, outputTokens: 0, lastUpdated: null };
  }
  usage[apiType].inputTokens += inputTokens || 0;
  usage[apiType].outputTokens += outputTokens || 0;
  usage[apiType].lastUpdated = new Date().toISOString();
  await chrome.storage.local.set({ [API_USAGE_KEY]: usage });
}

async function getKey(type = 'gemini') {
  const keyName = type === 'claude' ? 'claudeApiKey' : type === 'openai' ? 'openaiApiKey' : 'geminiApiKey';
  const local = await new Promise(res => chrome.storage.local.get([keyName], x => res(x?.[keyName] || '')));
  if (local) return local;
  try {
    const sync = await new Promise(res => chrome.storage.sync.get([keyName], x => res(x?.[keyName] || '')));
    return sync || '';
  } catch { return ''; }
}
async function hasKey(type = 'gemini') { return Boolean(await getKey(type)); }

async function getSystemPrompt() {
  const stored = await new Promise(res => chrome.storage.local.get([SYSTEM_PROMPT_KEY], x => res(x?.[SYSTEM_PROMPT_KEY])));
  return (typeof stored === 'string') ? stored : DEFAULT_SYSTEM_PROMPT;
}

async function loadPresets() {
  const v = await new Promise(res => chrome.storage.local.get([PRESET_KEY], x => res(x?.[PRESET_KEY] || [])));
  return Array.isArray(v) ? v : [];
}
function renderPresetOptions(sel, list) {
  sel.innerHTML = '';
  list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  if (!list.length) {
    const o = document.createElement('option'); o.value = ''; o.textContent = '（保存済みなし）'; sel.appendChild(o); return;
  }
  list.forEach((p, i) => { const o = document.createElement('option'); o.value = p.id; o.textContent = `${i + 1}. ${p.name}`; sel.appendChild(o); });
}

// ========= Tabs =========
function ensureOneSession() {
  if (sessions.length === 0) {
    const id = newId();
    sessions.push({ id, title: 'NEW', model: 'gemini-3-flash-preview', tpl: '', src: '', out: '', status: '', running: false, abort: null, createdAt: now(), updatedAt: now() });
    activeId = id;
  }
}
function setActive(id) {
  activeId = id;
  renderTabs();
  renderActivePane();
}
function addTab() {
  const id = newId();
  sessions.push({ id, title: 'NEW', model: 'gemini-3-flash-preview', tpl: '', src: '', out: '', status: '', running: false, abort: null, createdAt: now(), updatedAt: now() });
  setActive(id);
}
function closeTab(id) {
  const idx = sessions.findIndex(s => s.id === id);
  if (idx < 0) return;
  if (sessions[idx].running) { toast('実行中のタブは閉じられません'); return; }
  sessions.splice(idx, 1);
  if (activeId === id) {
    if (sessions[idx]) activeId = sessions[idx].id;
    else if (sessions[idx - 1]) activeId = sessions[idx - 1].id;
    else activeId = sessions[0]?.id || null;
  }
  ensureOneSession();
  renderTabs();
  renderActivePane();
}
function tabTitle(s) {
  const t = (s.title || '').trim();
  return t || 'NEW';
}
function renderTabs() {
  tabbarEl.innerHTML = '';
  sessions.forEach((s) => {
    const b = document.createElement('button');
    b.className = 'tab' + (s.id === activeId ? ' active' : '');
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', s.id === activeId ? 'true' : 'false');
    b.textContent = tabTitle(s);
    if (s.running) b.textContent += ' ⏳';
    b.addEventListener('click', () => setActive(s.id));

    const x = document.createElement('button');
    x.className = 'x';
    x.textContent = '×';
    x.title = 'タブを閉じる';
    x.addEventListener('click', (e) => { e.stopPropagation(); closeTab(s.id); });

    b.appendChild(x);
    tabbarEl.appendChild(b);
  });
}

// ========= ページ本文抽出 =========
async function grabActiveTabContent() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || !tab.id) throw new Error('アクティブなタブが見つかりません');
  const url = tab.url || '';
  const u = new URL(url);
  const blockedSchemes = new Set(['chrome:', 'chrome-extension:', 'edge:', 'about:', 'view-source:']);
  if (blockedSchemes.has(u.protocol)) throw new Error('このページ種別（' + u.protocol.replace(':', '') + '）には注入できません');
  if (/^https?:\/\/chromewebstore\.google\.com\/?/.test(url)) throw new Error('Chrome Web Store には注入できません');
  if (/\.(pdf)(?:$|\?)/i.test(u.pathname)) throw new Error('PDFは本文抽出に対応していません');
  try {
    const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['extract.js'] });
    const text = results?.[0]?.result || '';
    return { text, url: tab.url || '', title: tab.title || '' };
  } catch (e) {
    if (u.protocol === 'file:') throw new Error('file:// は拡張の詳細で「ファイルのURLへのアクセスを許可」をONにしてください');
    throw new Error('スクリプト注入に失敗：' + (e.message || String(e)));
  }
}

// ========= Pane (Session UI) =========
function bindSessionUI(root, s) {
  const modelSel = $('[data-k="model"]', root);
  const titleEl = $('[data-k="title"]', root);
  const tplEl = $('[data-k="tpl"]', root);
  const srcEl = $('[data-k="src"]', root);
  const genBtn = $('[data-k="gen"]', root);
  const cancelBtn = $('[data-k="cancel"]', root);
  const copyBtn = $('[data-k="copy"]', root);
  const outEl = $('[data-k="out"]', root);
  const statusEl = $('[data-k="status"]', root);
  const presetSel = $('[data-k="presetSel"]', root);
  const insertPresetBtn = $('[data-k="insertPreset"]', root);
  const exportPresetsBtn = $('[data-k="exportPresets"]', root);
  const importBtn = $('[data-k="importBtn"]', root);
  const importInput = $('[data-k="importInput"]', root);
  const grabBtn = $('[data-k="grabPage"]', root);

  // 初期値
  modelSel.value = s.model || 'gemini-3-flash-preview';
  titleEl.value = s.title || '';
  tplEl.value = s.tpl || '';
  srcEl.value = s.src || '';
  outEl.textContent = s.out || '結果がここに表示されます。';
  outEl.classList.toggle('empty', !s.out);
  statusEl.textContent = s.status || '';

  // プリセット描画
  loadPresets().then(list => renderPresetOptions(presetSel, list));

  modelSel.addEventListener('change', () => { s.model = modelSel.value; s.updatedAt = now(); renderTabs(); });
  titleEl.addEventListener('input', () => { s.title = titleEl.value; s.updatedAt = now(); renderTabs(); });
  tplEl.addEventListener('input', () => { s.tpl = tplEl.value; s.updatedAt = now(); });
  srcEl.addEventListener('input', () => { s.src = srcEl.value; s.updatedAt = now(); });

  insertPresetBtn.addEventListener('click', async () => {
    const id = presetSel.value; if (!id) return;
    const list = await loadPresets();
    const p = list.find(x => x.id === id); if (!p) return toast('プリセットが見つかりません');
    tplEl.value = p.text || '';
    s.tpl = tplEl.value; s.updatedAt = now();
    toast(`挿入: ${p.name}`);
  });
  exportPresetsBtn.addEventListener('click', async () => {
    const list = await loadPresets();
    const blob = new Blob([JSON.stringify({ version: 2, items: list }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `easy-gemini-presets-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });
  importBtn.addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', async (e) => {
    const file = (e.target.files || [])[0]; e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text(); const json = JSON.parse(text);
      const items = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : []);
      if (!Array.isArray(items)) throw new Error('形式が不正です');
      const current = await loadPresets();
      const byName = new Map(current.map(x => [x.name, x]));
      for (const it of items) {
        if (!it?.name || !it?.text) continue;
        if (byName.has(it.name)) { const ex = byName.get(it.name); ex.text = it.text; ex.updatedAt = Date.now(); }
        else { byName.set(it.name, { id: newId(), name: it.name, text: it.text, createdAt: Date.now(), updatedAt: Date.now() }); }
      }
      const merged = Array.from(byName.values()).slice(0, PRESET_MAX);
      await chrome.storage.local.set({ [PRESET_KEY]: merged });
      renderPresetOptions(presetSel, merged);
      toast('プリセットを読み込みました');
    } catch (e2) { alert('読み込みに失敗: ' + (e2.message || e2)); }
  });

  grabBtn.addEventListener('click', async () => {
    try {
      grabBtn.disabled = true; grabBtn.textContent = '取得中…';
      const { text, title } = await grabActiveTabContent();
      if (!text) { toast('本文が見つかりません'); return; }
      srcEl.value = text; s.src = text; s.updatedAt = now();
      if (s.title === 'NEW' && title) {
        s.title = title.slice(0, 40);
        renderTabs();
      }
      toast(`本文を取得しました（${text.length} 文字）`);
    } catch (e) {
      toast((e && e.message) ? e.message : '取得に失敗しました');
    } finally {
      grabBtn.disabled = false; grabBtn.textContent = 'メインタブの本文を取得';
    }
  });

  async function buildPrompt() {
    const tpl = (tplEl.value || '').trim();
    const src = (srcEl.value || '').trim();
    if (tpl && src) return `${tpl}\n\n-----\n対象テキスト:\n${src}`;
    return tpl || src;
  }
  async function callGeminiText({ apiKey, model, text, systemPrompt, signal }) {
    const basePrompt = typeof systemPrompt === 'string' && systemPrompt.length
      ? `${systemPrompt}\n\nUser prompt:\n${text}`
      : text;
    const body = { contents: [{ role: 'user', parts: [{ text: basePrompt }] }] };
    const url = `${GEMINI_HOST}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const maxRetries = 5;
    let attempt = 0;

    while (true) {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });

      if (res.status === 429 && attempt < maxRetries) {
        attempt++;
        const delay = 2000 * Math.pow(2, attempt - 1); // 2s, 4s, 8s, 16s, 32s
        // console.log(`HTTP 429: Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        if (signal?.aborted) throw new Error('AbortError');
        continue;
      }

      if (!res.ok) {
        const raw = await res.text();
        try { const j = JSON.parse(raw); throw new Error(j?.error?.message || j?.message || `HTTP ${res.status}`); }
        catch { throw new Error(`HTTP ${res.status}`); }
      }
      const data = await res.json();
      // トークン使用量を追跡
      const usageMeta = data?.usageMetadata;
      if (usageMeta) {
        await addApiUsage('gemini', usageMeta.promptTokenCount || 0, usageMeta.candidatesTokenCount || 0);
      }
      const parts = data?.candidates?.[0]?.content?.parts || [];
      return parts.map(p => p.text || '').join('');
    }
  }

  async function callClaudeText({ apiKey, model, text, systemPrompt, signal }) {
    // Model ID mapping: UI値を実際のAPI用モデルIDに変換
    // Claude 3.5は2025年7月に廃止。現在はClaude 4.x系のみ利用可能
    const modelIdMap = {
      'claude-sonnet-4': 'claude-sonnet-4-20250514',
      'claude-sonnet-4-5': 'claude-sonnet-4-5-20250929',
      'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
      'claude-opus-4-5': 'claude-opus-4-5-20251101'
    };
    const modelId = modelIdMap[model] || model;

    const messages = [{ role: 'user', content: text }];
    const body = {
      model: modelId,
      max_tokens: 4096,
      messages: messages
    };
    if (systemPrompt) body.system = systemPrompt;

    const url = `${ANTHROPIC_HOST}/messages`;

    const headers = {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true' // Required for browser requests
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal
    });

    if (!res.ok) {
      const raw = await res.text();
      console.error('Claude API Error:', raw);
      try {
        const j = JSON.parse(raw);
        const errMsg = j?.error?.message || j?.message || `HTTP ${res.status}`;
        throw new Error(`Claude API: ${errMsg}`);
      } catch (parseErr) {
        throw new Error(`Claude API HTTP ${res.status}: ${raw.slice(0, 200)}`);
      }
    }

    const data = await res.json();
    // トークン使用量を追跡
    const usage = data?.usage;
    if (usage) {
      await addApiUsage('claude', usage.input_tokens || 0, usage.output_tokens || 0);
    }
    const content = data?.content || [];
    return content.filter(c => c.type === 'text').map(c => c.text).join('');
  }

  async function callOpenAIText({ apiKey, model, text, systemPrompt, signal }) {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: text });

    const body = {
      model: model,
      messages: messages
    };

    const url = `${OPENAI_HOST}/chat/completions`;

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    const maxRetries = 5;
    let attempt = 0;

    while (true) {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal
      });

      if (res.status === 429 && attempt < maxRetries) {
        attempt++;
        const delay = 2000 * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
        if (signal?.aborted) throw new Error('AbortError');
        continue;
      }

      if (!res.ok) {
        const raw = await res.text();
        try { const j = JSON.parse(raw); throw new Error(j?.error?.message || j?.message || `HTTP ${res.status}`); }
        catch { throw new Error(`HTTP ${res.status}`); }
      }

      const data = await res.json();
      // トークン使用量を追跡
      const usage = data?.usage;
      if (usage) {
        await addApiUsage('openai', usage.prompt_tokens || 0, usage.completion_tokens || 0);
      }
      const choices = data?.choices || [];
      return choices.map(c => c.message?.content || '').join('');
    }
  }

  async function onGenerate() {
    const text = await buildPrompt();
    if (!text) { outEl.textContent = '（指示・素材どちらも空です）'; outEl.classList.remove('empty'); return; }

    const modelVal = modelSel.value || 'gemini-3-flash-preview';
    const isClaude = modelVal.startsWith('claude-');
    const isOpenAI = modelVal.startsWith('gpt-') || modelVal.startsWith('o3-') || modelVal.startsWith('o3') || modelVal.startsWith('o4-');
    const apiType = isClaude ? 'claude' : isOpenAI ? 'openai' : 'gemini';
    const apiKey = await getKey(apiType);

    if (!apiKey) {
      needKeyEl.style.display = 'block';
      outEl.textContent = isClaude
        ? 'Claude APIキーが未設定です。「設定」から保存してください。'
        : isOpenAI
          ? 'OpenAI APIキーが未設定です。「設定」から保存してください。'
          : 'Gemini APIキーが未設定です。「設定」から保存してください。';
      outEl.classList.remove('empty');
      return;
    }

    s.abort = new AbortController();
    s.running = true;
    s.status = '生成中…';
    genBtn.disabled = true; genBtn.textContent = '生成中…';
    cancelBtn.style.display = 'inline-block'; cancelBtn.disabled = false; cancelBtn.textContent = 'キャンセル';
    outEl.textContent = '生成中…'; outEl.classList.remove('empty');
    renderTabs();

    try {
      const systemPrompt = await getSystemPrompt();
      let out = '';
      if (isClaude) {
        out = await callClaudeText({
          apiKey,
          model: modelVal,
          text,
          systemPrompt,
          signal: s.abort.signal
        });
      } else if (isOpenAI) {
        out = await callOpenAIText({
          apiKey,
          model: modelVal,
          text,
          systemPrompt,
          signal: s.abort.signal
        });
      } else {
        out = await callGeminiText({
          apiKey,
          model: modelVal,
          text,
          systemPrompt,
          signal: s.abort.signal
        });
      }
      s.out = out || '（空の出力）';
      outEl.textContent = s.out;
      s.status = '完了';

      // NEW のままなら素材の先頭行からタイトルを付ける
      if (s.title === 'NEW') {
        const firstLine = (s.src || '').split(/\r?\n/)[0].trim();
        if (firstLine) {
          s.title = firstLine.slice(0, 40);
          renderTabs();
        }
      }

    } catch (e) {
      if (e?.name === 'AbortError') { s.status = 'キャンセルしました'; }
      else { s.status = 'エラー: ' + (e.message || String(e)); }
      outEl.textContent = s.status;
    } finally {
      s.running = false; s.abort = null;
      genBtn.disabled = false; genBtn.textContent = 'Generate';
      cancelBtn.style.display = 'none';
      renderTabs();
    }
  }

  genBtn.addEventListener('click', onGenerate);
  cancelBtn.addEventListener('click', () => {
    if (s.abort) { cancelBtn.disabled = true; cancelBtn.textContent = 'キャンセル中…'; s.abort.abort('user'); }
  });
  copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText((outEl.textContent || '').trim()); toast('コピーしました'); } catch { }
  });

  root.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); onGenerate(); }
  });
}

function renderActivePane() {
  paneEl.innerHTML = '';
  const s = sessions.find(x => x.id === activeId);
  if (!s) return;
  const frag = document.importNode(tplSession.content, true);
  const root = frag.firstElementChild;
  bindSessionUI(root, s);
  paneEl.appendChild(frag);
}

// ========= Storage change =========
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local') return;
  if (PRESET_KEY in changes) {
    const root = $('.session', paneEl);
    if (root) {
      const sel = $('[data-k="presetSel"]', root);
      if (sel) {
        const list = await loadPresets();
        renderPresetOptions(sel, list);
      }
    }
  }
  if ('geminiApiKey' in changes || 'claudeApiKey' in changes || 'openaiApiKey' in changes) {
    const hasG = await hasKey('gemini');
    const hasC = await hasKey('claude');
    const hasO = await hasKey('openai');
    if (needKeyEl) needKeyEl.style.display = (hasG || hasC || hasO) ? 'none' : 'block';
  }
});

// ========= Global buttons =========
$('#openKey').addEventListener('click', () => {
  window.open(chrome.runtime.getURL('key.html'), '_blank', 'noopener,noreferrer,width=560,height=420');
});
$('#openManager').addEventListener('click', () => {
  window.open(chrome.runtime.getURL('presets.html'), '_blank', 'noopener,noreferrer,width=880,height=640');
});
addTabBtn.addEventListener('click', addTab);

// ========= Init =========
(async () => {
  try { verEl.textContent = `v${chrome.runtime.getManifest()?.version || ''}`; } catch { }
  // Check all keys roughly to hide warning if at least one exists
  const hasG = await hasKey('gemini');
  const hasC = await hasKey('claude');
  const hasO = await hasKey('openai');
  needKeyEl.style.display = (hasG || hasC || hasO) ? 'none' : 'block';
  ensureOneSession();
  renderTabs();
  renderActivePane();
})();
