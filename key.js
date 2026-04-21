(() => {
  const $ = (q) => document.querySelector(q);
  const keyEl = $('#key');
  const showEl = $('#show');
  const saveBtn = $('#save');
  const clearBtn = $('#clear');
  const msgEl = $('#msg');
  const systemPromptEl = $('#systemPrompt');
  const savePromptBtn = $('#savePrompt');
  const resetPromptBtn = $('#resetPrompt');
  const promptMsgEl = $('#promptMsg');

  const SYSTEM_PROMPT_KEY = 'easyGemini.systemPrompt';
  const DEFAULT_SYSTEM_PROMPT = [
    'You are an expert editor/writer.',
    "Do not ask follow-up questions; proceed directly.",
    "Write responses in the user's language (Japanese if the input is Japanese)."
  ].join(' ');

  function flash(el, text) {
    if (!el) return;
    el.textContent = text || '';
    if (text) setTimeout(() => { el.textContent = ''; }, 1500);
  }

  const openaiKeyEl = $('#openaiKey');
  const grokKeyEl = $('#grokKey');
  const localUrlEl = $('#localUrl');
  const localModelEl = $('#localModel');
  const testLocalBtn = $('#testLocal');

  async function loadKey() {
    const v = await new Promise(res =>
      chrome.storage.local.get(['geminiApiKey', 'geminiAuthPriority', 'claudeApiKey', 'openaiApiKey', 'grokApiKey', 'localUrl', 'localModel'], x => res(x))
    );
    keyEl.value = v?.geminiApiKey || '';
    claudeKeyEl.value = v?.claudeApiKey || '';
    openaiKeyEl.value = v?.openaiApiKey || '';
    grokKeyEl.value = v?.grokApiKey || '';
    localUrlEl.value = v?.localUrl || '';
    localModelEl.value = v?.localModel || '';

    // Auth Priority
    const priority = v?.geminiAuthPriority || 'apikey';
    const radios = document.getElementsByName('geminiAuthPriority');
    for (const r of radios) {
      if (r.value === priority) r.checked = true;
    }
  }

  async function saveKey() {
    const v = (keyEl.value || '').trim();
    const c = (claudeKeyEl.value || '').trim();
    const o = (openaiKeyEl.value || '').trim();
    const g = (grokKeyEl.value || '').trim();
    const lu = (localUrlEl.value || '').trim();
    const lm = (localModelEl.value || '').trim();

    // Get Auth Priority
    let priority = 'apikey';
    const radios = document.getElementsByName('geminiAuthPriority');
    for (const r of radios) {
      if (r.checked) priority = r.value;
    }

    await chrome.storage.local.set({
      geminiApiKey: v,
      geminiAuthPriority: priority, // save priority
      claudeApiKey: c,
      openaiApiKey: o,
      grokApiKey: g,
      localUrl: lu,
      localModel: lm
    });
    flash(msgEl, '保存しました');
  }

  async function clearKey() {
    await chrome.storage.local.remove(['geminiApiKey', 'geminiAuthPriority', 'claudeApiKey', 'openaiApiKey', 'grokApiKey', 'localUrl', 'localModel']);
    keyEl.value = '';
    claudeKeyEl.value = '';
    openaiKeyEl.value = '';
    grokKeyEl.value = '';
    localUrlEl.value = '';
    localModelEl.value = '';

    // Reset priority to default
    const radios = document.getElementsByName('geminiAuthPriority');
    for (const r of radios) {
      if (r.value === 'apikey') r.checked = true;
    }

    flash(msgEl, '削除しました');
  }

  async function loadSystemPrompt() {
    const raw = await new Promise(res => chrome.storage.local.get([SYSTEM_PROMPT_KEY], x => res(x?.[SYSTEM_PROMPT_KEY])));
    if (typeof raw === 'string') systemPromptEl.value = raw;
    else systemPromptEl.value = DEFAULT_SYSTEM_PROMPT;
  }
  async function saveSystemPrompt() {
    const value = systemPromptEl.value || '';
    await chrome.storage.local.set({ [SYSTEM_PROMPT_KEY]: value });
    flash(promptMsgEl, 'システムプロンプトを保存しました');
  }
  async function resetSystemPrompt() {
    await chrome.storage.local.remove([SYSTEM_PROMPT_KEY]);
    systemPromptEl.value = DEFAULT_SYSTEM_PROMPT;
    flash(promptMsgEl, 'デフォルトに戻しました');
  }

  const claudeKeyEl = $('#claudeKey');

  // ========= API使用量ダッシュボード =========
  const API_USAGE_KEY = 'easyGemini.apiUsage';
  const resetUsageBtn = $('#resetUsage');
  const usageMsgEl = $('#usageMsg');

  // コストレート（$/1M tokens）
  const COST_RATES = {
    gemini: { input: 0.075, output: 0.30 },      // Gemini 2.5 Flash
    claude: { input: 3.00, output: 15.00 },       // Claude Sonnet 4
    openai: { input: 2.50, output: 10.00 },       // GPT-4o
    grok: { input: 5.00, output: 15.00 }          // Grok (仮)
  };

  function formatNumber(n) {
    return n.toLocaleString();
  }

  function calculateCost(apiType, inputTokens, outputTokens) {
    const rate = COST_RATES[apiType];
    if (!rate) return 0;
    const inputCost = (inputTokens / 1_000_000) * rate.input;
    const outputCost = (outputTokens / 1_000_000) * rate.output;
    return inputCost + outputCost;
  }

  async function loadUsage() {
    const usage = await new Promise(res =>
      chrome.storage.local.get([API_USAGE_KEY], x => res(x?.[API_USAGE_KEY] || {}))
    );

    const apis = ['gemini', 'claude', 'openai', 'grok'];
    let totalCost = 0;
    let maxTokens = 1; // 最大値を計算（バーの相対幅用）

    // 最大トークン数を計算
    apis.forEach(api => {
      const data = usage[api] || { inputTokens: 0, outputTokens: 0 };
      const total = data.inputTokens + data.outputTokens;
      if (total > maxTokens) maxTokens = total;
    });

    // 各APIの表示を更新
    apis.forEach(api => {
      const data = usage[api] || { inputTokens: 0, outputTokens: 0 };
      const total = data.inputTokens + data.outputTokens;
      const cost = calculateCost(api, data.inputTokens, data.outputTokens);
      totalCost += cost;

      // UI要素を更新
      $(`#${api}Input`).textContent = formatNumber(data.inputTokens);
      $(`#${api}Output`).textContent = formatNumber(data.outputTokens);
      $(`#${api}Total`).textContent = formatNumber(total);
      $(`#${api}Cost`).textContent = `$${cost.toFixed(4)}`;

      // バーの幅を更新（最大値との比率）
      const barPercent = maxTokens > 0 ? (total / maxTokens) * 100 : 0;
      $(`#${api}Bar`).style.width = `${Math.min(barPercent, 100)}%`;
    });

    // 合計コスト
    $('#totalCost').textContent = `$${totalCost.toFixed(4)}`;
  }

  async function resetUsage() {
    await chrome.storage.local.remove([API_USAGE_KEY]);
    await loadUsage();
    flash(usageMsgEl, '使用量をリセットしました');
  }

  // Events
  showEl.addEventListener('change', () => {
    const type = showEl.checked ? 'text' : 'password';
    keyEl.type = type;
    claudeKeyEl.type = type;
    openaiKeyEl.type = type;
    grokKeyEl.type = type;
  });
  saveBtn.addEventListener('click', saveKey);
  clearBtn.addEventListener('click', clearKey);
  savePromptBtn.addEventListener('click', saveSystemPrompt);
  resetPromptBtn.addEventListener('click', resetSystemPrompt);
  resetUsageBtn.addEventListener('click', resetUsage);
  testLocalBtn.addEventListener('click', async () => {
    const url = (localUrlEl.value || '').trim();
    const model = (localModelEl.value || '').trim();
    if (!url) return flash(msgEl, 'URLを入力してください');
    testLocalBtn.disabled = true;
    testLocalBtn.textContent = 'テスト中…';
    try {
      let baseUrl = url.replace(/\/+$/, '');
      if (baseUrl.includes(':11434') && !baseUrl.endsWith('/v1')) {
        baseUrl += '/v1';
      }
      const targetUrl = baseUrl + '/chat/completions';
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: 'say hi' }], max_tokens: 5 })
      });
      if (res.ok) flash(msgEl, '接続成功！');
      else throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      flash(msgEl, '接続失敗: ' + (e.message || 'Error'));
    } finally {
      testLocalBtn.disabled = false;
      testLocalBtn.textContent = '接続テスト';
    }
  });

  // Enterで保存（任意）
  keyEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveKey(); }
  });
  claudeKeyEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveKey(); }
  });
  openaiKeyEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveKey(); }
  });
  grokKeyEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveKey(); }
  });
  localUrlEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveKey(); }
  });
  localModelEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveKey(); }
  });

  // ストレージ変更監視（リアルタイム更新用）
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && API_USAGE_KEY in changes) {
      loadUsage();
    }
  });

  // 初期ロード
  loadKey();
  loadSystemPrompt();
  loadUsage();
})();
