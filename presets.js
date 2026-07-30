const PRESET_KEY = 'easyGemini.presets.v2';
const PRESET_MAX = 200;
const UNFILED_FOLDER = '\u672a\u5206\u985e';
const ALL_FOLDERS = '__all__';
const NEW_FOLDER = '__new__';
const $ = (q) => document.querySelector(q);

const listEl = $('#list');
const nameEl = $('#name');
const folderSelectEl = $('#folderSelect');
const folderEl = $('#folder');
const textEl = $('#text');
const searchEl = $('#search');
const folderFilterEl = $('#folderFilter');

const addBtn = $('#add');
const saveBtn = $('#save');
const deleteBtn = $('#delete');
const exportBtn = $('#export');
const importBtn = $('#importBtn');
const importInput = $('#importInput');

let activeId = null;
let dragId = null;
let knownFolders = [];

function newId(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function normalizeFolder(value) { return (value || '').trim() || UNFILED_FOLDER; }
function samePresetKey(a, b) {
  return normalizeFolder(a.folder) === normalizeFolder(b.folder) && (a.name || '') === (b.name || '');
}
function normalizePreset(item) {
  const createdAt = Number(item?.createdAt) || Date.now();
  return {
    id: item?.id || newId(),
    name: String(item?.name || '').trim(),
    text: String(item?.text || ''),
    folder: normalizeFolder(item?.folder),
    createdAt,
    updatedAt: Number(item?.updatedAt) || createdAt
  };
}
function getFolders(list) {
  return Array.from(new Set(list.map(p => normalizeFolder(p.folder)))).sort((a, b) => a.localeCompare(b, 'ja'));
}
function isVisible(p) {
  const folder = folderFilterEl.value || ALL_FOLDERS;
  const q = (searchEl.value || '').trim().toLowerCase();
  if (folder !== ALL_FOLDERS && normalizeFolder(p.folder) !== folder) return false;
  if (!q) return true;
  return `${p.name}
${p.text}
${normalizeFolder(p.folder)}`.toLowerCase().includes(q);
}
function setFolderEditorValue(folder) {
  const value = normalizeFolder(folder);
  folderEl.value = value;
  folderSelectEl.value = knownFolders.includes(value) ? value : NEW_FOLDER;
}

async function loadPresets() {
  const v = await new Promise(res => chrome.storage.local.get([PRESET_KEY], x => res(x?.[PRESET_KEY] || [])));
  return Array.isArray(v) ? v.map(normalizePreset).filter(p => p.name && p.text) : [];
}
async function savePresets(list) {
  await chrome.storage.local.set({ [PRESET_KEY]: list.map(normalizePreset).slice(0, PRESET_MAX) });
}
function appendOption(select, value, text) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = text;
  select.appendChild(option);
}
function renderFolderControls(list) {
  const folders = getFolders(list);
  const currentFilter = folderFilterEl.value || ALL_FOLDERS;
  const currentEditorFolder = normalizeFolder(folderEl.value);
  knownFolders = folders;

  folderFilterEl.innerHTML = '';
  appendOption(folderFilterEl, ALL_FOLDERS, '\u3059\u3079\u3066\u306e\u30d5\u30a9\u30eb\u30c0');
  folders.forEach(folder => appendOption(folderFilterEl, folder, folder));
  folderFilterEl.value = folders.includes(currentFilter) ? currentFilter : ALL_FOLDERS;

  folderSelectEl.innerHTML = '';
  appendOption(folderSelectEl, NEW_FOLDER, '\u65b0\u898f\u30d5\u30a9\u30eb\u30c0\u3092\u5165\u529b');
  folders.forEach(folder => appendOption(folderSelectEl, folder, folder));
  folderSelectEl.value = folders.includes(currentEditorFolder) ? currentEditorFolder : NEW_FOLDER;
}
function renderList(list, nextActiveId = activeId) {
  activeId = nextActiveId;
  renderFolderControls(list);
  listEl.innerHTML = '';

  const visible = list.filter(isVisible);
  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = '\u8a72\u5f53\u3059\u308b\u30d7\u30ea\u30bb\u30c3\u30c8\u304c\u3042\u308a\u307e\u305b\u3093';
    listEl.appendChild(empty);
    return;
  }

  let lastFolder = null;
  visible.forEach(p => {
    const folder = normalizeFolder(p.folder);
    if ((folderFilterEl.value || ALL_FOLDERS) === ALL_FOLDERS && folder !== lastFolder) {
      const label = document.createElement('div');
      label.className = 'folder-label';
      label.textContent = folder;
      listEl.appendChild(label);
      lastFolder = folder;
    }

    const div = document.createElement('div');
    div.className = 'item' + (p.id === activeId ? ' active' : '');
    div.draggable = true;
    div.dataset.id = p.id;
    div.title = p.name;

    const handle = document.createElement('span');
    handle.className = 'handle';
    handle.textContent = '::';
    const name = document.createElement('span');
    name.className = 'item-name';
    name.textContent = p.name;
    div.append(handle, name);

    div.addEventListener('click', () => select(p.id));
    div.addEventListener('dragstart', (e) => {
      dragId = p.id;
      div.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', p.id);
    });
    div.addEventListener('dragend', () => {
      dragId = null;
      div.classList.remove('dragging');
      clearDropMarks();
    });
    div.addEventListener('dragover', (e) => {
      if (!dragId || dragId === p.id) return;
      e.preventDefault();
      const after = isAfterMiddle(e, div);
      clearDropMarks();
      div.classList.add(after ? 'drop-after' : 'drop-before');
      e.dataTransfer.dropEffect = 'move';
    });
    div.addEventListener('drop', async (e) => {
      e.preventDefault();
      const sourceId = e.dataTransfer.getData('text/plain') || dragId;
      if (!sourceId || sourceId === p.id) return;
      await movePreset(sourceId, p.id, isAfterMiddle(e, div));
    });
    listEl.appendChild(div);
  });
}
function clearDropMarks() {
  listEl.querySelectorAll('.drop-before,.drop-after').forEach(el => el.classList.remove('drop-before', 'drop-after'));
}
function isAfterMiddle(event, element) {
  const rect = element.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2;
}
async function refresh(nextActiveId = activeId) {
  const list = await loadPresets();
  renderList(list, nextActiveId);
}

async function select(id) {
  const list = await loadPresets();
  const p = list.find(x => x.id === id);
  renderList(list, id);
  if (p) {
    nameEl.value = p.name;
    setFolderEditorValue(p.folder);
    textEl.value = p.text;
  }
}
async function movePreset(sourceId, targetId, afterTarget) {
  const list = await loadPresets();
  const from = list.findIndex(x => x.id === sourceId);
  const to = list.findIndex(x => x.id === targetId);
  if (from < 0 || to < 0) return;
  const [item] = list.splice(from, 1);
  const targetIndex = list.findIndex(x => x.id === targetId);
  list.splice(targetIndex + (afterTarget ? 1 : 0), 0, item);
  await savePresets(list);
  await refresh(sourceId);
}

addBtn.addEventListener('click', async () => {
  activeId = null;
  nameEl.value = '';
  const defaultFolder = folderFilterEl.value && folderFilterEl.value !== ALL_FOLDERS ? folderFilterEl.value : '';
  folderEl.value = defaultFolder;
  textEl.value = '';
  await refresh(null);
  if (defaultFolder) setFolderEditorValue(defaultFolder);
  nameEl.focus();
});

saveBtn.addEventListener('click', async () => {
  const name = (nameEl.value || '').trim();
  const text = (textEl.value || '').trim();
  const folder = normalizeFolder(folderEl.value);
  if (!name) { alert('\u540d\u524d\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044'); return; }
  if (!text) { alert('\u672c\u6587\uff08\u6307\u793a\uff09\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044'); return; }

  const list = await loadPresets();
  let item = activeId ? list.find(x => x.id === activeId) : null;
  if (!item) item = list.find(x => samePresetKey(x, { name, folder }));
  if (item) {
    item.name = name;
    item.text = text;
    item.folder = folder;
    item.updatedAt = Date.now();
    await savePresets(list);
    await refresh(item.id);
    setFolderEditorValue(folder);
    return;
  }
  item = { id: newId(), name, text, folder, createdAt: Date.now(), updatedAt: Date.now() };
  list.unshift(item);
  if (list.length > PRESET_MAX) list.pop();
  await savePresets(list);
  await refresh(item.id);
  setFolderEditorValue(folder);
});

deleteBtn.addEventListener('click', async () => {
  const list = await loadPresets();
  const p = activeId ? list.find(x => x.id === activeId) : list.find(x => samePresetKey(x, { name: (nameEl.value || '').trim(), folder: folderEl.value }));
  if (!p) return;
  if (!confirm(`"${p.name}" \u3092\u524a\u9664\u3057\u307e\u3059\u3002\u3088\u308d\u3057\u3044\u3067\u3059\u304b\uff1f`)) return;
  const next = list.filter(x => x.id !== p.id);
  await savePresets(next);
  activeId = null;
  nameEl.value = '';
  folderEl.value = '';
  textEl.value = '';
  await refresh(null);
});

exportBtn.addEventListener('click', async () => {
  const list = await loadPresets();
  const blob = new Blob([JSON.stringify({ version: 3, items: list }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `easy-gemini-presets-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => importInput.click());
importInput.addEventListener('change', async (e) => {
  const file = (e.target.files || [])[0];
  e.target.value = '';
  if (!file) return;
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    const items = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : []);
    if (!Array.isArray(items)) throw new Error('\u5f62\u5f0f\u304c\u6b63\u3057\u304f\u3042\u308a\u307e\u305b\u3093');

    const list = await loadPresets();
    const merged = list.slice();
    for (const raw of items) {
      const it = normalizePreset(raw);
      if (!it.name || !it.text) continue;
      const ex = merged.find(x => samePresetKey(x, it));
      if (ex) {
        ex.text = it.text;
        ex.updatedAt = Date.now();
      } else {
        merged.push({ ...it, id: newId(), createdAt: Date.now(), updatedAt: Date.now() });
      }
    }
    await savePresets(merged.slice(0, PRESET_MAX));
    await refresh(null);
  } catch (e2) {
    alert('\u8aad\u307f\u8fbc\u307f\u306b\u5931\u6557: ' + (e2.message || e2));
  }
});

folderSelectEl.addEventListener('change', () => {
  if (folderSelectEl.value !== NEW_FOLDER) folderEl.value = folderSelectEl.value;
  else folderEl.focus();
});
folderEl.addEventListener('input', () => {
  const value = normalizeFolder(folderEl.value);
  folderSelectEl.value = knownFolders.includes(value) ? value : NEW_FOLDER;
});
searchEl.addEventListener('input', () => refresh(activeId));
folderFilterEl.addEventListener('change', () => refresh(activeId));

refresh(null);
