const PRESET_KEY = 'easyGemini.presets.v2';
const PRESET_MAX = 200;
const $ = (q) => document.querySelector(q);

const listEl = $('#list');
const nameEl = $('#name');
const textEl = $('#text');

const addBtn = $('#add');
const saveBtn = $('#save');
const deleteBtn = $('#delete');
const exportBtn = $('#export');
const importBtn = $('#importBtn');
const importInput = $('#importInput');

function newId(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }

async function loadPresets() {
  const v = await new Promise(res => chrome.storage.local.get([PRESET_KEY], x => res(x?.[PRESET_KEY] || [])));
  return Array.isArray(v) ? v : [];
}
async function savePresets(list) {
  await chrome.storage.local.set({ [PRESET_KEY]: list.slice(0, PRESET_MAX) });
}
function renderList(list, activeId=null) {
  listEl.innerHTML = '';
  list.forEach(p => {
    const div = document.createElement('div');
    div.className = 'item' + (p.id===activeId ? ' active' : '');
    div.textContent = p.name;
    div.addEventListener('click', () => select(p.id));
    listEl.appendChild(div);
  });
}
async function refresh(activeId=null) {
  const list = await loadPresets();
  renderList(list, activeId);
}

async function select(id) {
  const list = await loadPresets();
  const p = list.find(x => x.id === id);
  renderList(list, id);
  if (p) { nameEl.value = p.name; textEl.value = p.text; }
}

addBtn.addEventListener('click', async () => {
  nameEl.value = ''; textEl.value = '';
  const list = await loadPresets();
  renderList(list, null);
  nameEl.focus();
});

saveBtn.addEventListener('click', async () => {
  const name = (nameEl.value||'').trim();
  const text = (textEl.value||'').trim();
  if (!name) { alert('名称を入力してください'); return; }
  if (!text) { alert('本文（指示）を入力してください'); return; }

  const list = await loadPresets();
  // ★ 同名があれば「買い替え上書き」
  const same = list.find(x => x.name === name);
  if (same) {
    same.text = text; same.updatedAt = Date.now();
    await savePresets(list);
    await refresh(same.id);
    return;
  }
  const item = { id: newId(), name, text, createdAt: Date.now(), updatedAt: Date.now() };
  list.unshift(item);
  if (list.length > PRESET_MAX) list.pop();
  await savePresets(list);
  await refresh(item.id);
});

deleteBtn.addEventListener('click', async () => {
  const list = await loadPresets();
  const curName = (nameEl.value||'').trim();
  if (!curName) return;
  const p = list.find(x => x.name === curName);
  if (!p) return;
  if (!confirm(`"${p.name}" を削除します。よろしいですか？`)) return;
  const next = list.filter(x => x.id !== p.id);
  await savePresets(next);
  nameEl.value=''; textEl.value='';
  await refresh(null);
});

exportBtn.addEventListener('click', async () => {
  const list = await loadPresets();
  const blob = new Blob([JSON.stringify({ version: 2, items: list }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `easy-gemini-presets-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => importInput.click());
importInput.addEventListener('change', async (e) => {
  const file = (e.target.files||[])[0]; e.target.value='';
  if (!file) return;
  try {
    const text = await file.text(); const json = JSON.parse(text);
    const items = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : []);
    if (!Array.isArray(items)) throw new Error('形式が不正です');

    const list = await loadPresets();
    const byName = new Map(list.map(x => [x.name, x]));
    for (const it of items) {
      if (!it?.name || !it?.text) continue;
      if (byName.has(it.name)) {
        const ex = byName.get(it.name);
        ex.text = it.text; ex.updatedAt = Date.now(); // ★ 同名は上書き
      } else {
        byName.set(it.name, { id: newId(), name: it.name, text: it.text, createdAt: Date.now(), updatedAt: Date.now() });
      }
    }
    const merged = Array.from(byName.values()).slice(0, PRESET_MAX);
    await savePresets(merged);
    await refresh(null);
  } catch (e2) {
    alert('読み込みに失敗: ' + (e2.message || e2));
  }
});

// init
refresh(null);