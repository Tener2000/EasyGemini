(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.EasyGeminiAvatarStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DB_NAME = 'easyGeminiPacks';
  const DB_VERSION = 1;
  const LAST_SELECTION_KEY = 'easyGemini.avatar.lastSelection';
  const INHERIT_SELECTION_KEY = 'easyGemini.avatar.inheritSelection';

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('avatars')) db.createObjectStore('avatars', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('taskSkills')) db.createObjectStore('taskSkills', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('packFiles')) db.createObjectStore('packFiles', { keyPath: ['packKey', 'path'] });
        if (!db.objectStoreNames.contains('profiles')) db.createObjectStore('profiles', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDBを開けません'));
    });
  }

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB操作に失敗しました'));
    });
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('IndexedDBトランザクションに失敗しました'));
      transaction.onabort = () => reject(transaction.error || new Error('IndexedDBトランザクションが中断されました'));
    });
  }

  function storeName(type) {
    if (type === 'avatar') return 'avatars';
    if (type === 'taskSkill') return 'taskSkills';
    throw new Error('不明なパック種別です');
  }

  async function getSmallSetting(key) {
    if (globalThis.chrome?.storage?.local) {
      return new Promise(resolve => chrome.storage.local.get([key], value => resolve(value?.[key])));
    }
    const raw = globalThis.localStorage?.getItem(key);
    if (raw == null) return undefined;
    try { return JSON.parse(raw); } catch { return undefined; }
  }

  async function setSmallSetting(key, value) {
    if (globalThis.chrome?.storage?.local) {
      await chrome.storage.local.set({ [key]: value });
      return;
    }
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  }

  async function putPack(pack) {
    const db = await openDb();
    const name = storeName(pack.type);
    const tx = db.transaction([name, 'packFiles'], 'readwrite');
    const metadata = { ...pack, files: undefined };
    tx.objectStore(name).put(metadata);
    const fileStore = tx.objectStore('packFiles');
    fileStore.delete(IDBKeyRange.bound([pack.key, ''], [pack.key, '\uffff']));
    pack.files.forEach(file => fileStore.put({ packKey: pack.key, ...file }));
    await transactionDone(tx);
    db.close();
    return metadata;
  }

  async function getPack(type, refOrKey) {
    if (!refOrKey) return null;
    const key = typeof refOrKey === 'string' ? refOrKey : `${refOrKey.id}@${refOrKey.version}`;
    const db = await openDb();
    const metadata = await requestResult(db.transaction(storeName(type), 'readonly').objectStore(storeName(type)).get(key));
    if (!metadata) { db.close(); return null; }
    const files = await requestResult(db.transaction('packFiles', 'readonly').objectStore('packFiles').getAll());
    db.close();
    return { ...metadata, files: files.filter(file => file.packKey === key).map(({ packKey, ...file }) => file) };
  }

  async function listPacks(type, includeDisabled = true) {
    const db = await openDb();
    const rows = await requestResult(db.transaction(storeName(type), 'readonly').objectStore(storeName(type)).getAll());
    db.close();
    return rows.filter(row => includeDisabled || row.enabled !== false).sort((a, b) => a.manifest.name.localeCompare(b.manifest.name, 'ja'));
  }

  async function setPackEnabled(type, key, enabled) {
    const pack = await getPack(type, key);
    if (!pack) throw new Error('パックが見つかりません');
    pack.enabled = Boolean(enabled);
    return putPack(pack);
  }

  async function deletePack(type, key) {
    const db = await openDb();
    const name = storeName(type);
    const tx = db.transaction([name, 'packFiles'], 'readwrite');
    tx.objectStore(name).delete(key);
    tx.objectStore('packFiles').delete(IDBKeyRange.bound([key, ''], [key, '\uffff']));
    await transactionDone(tx);
    db.close();
  }

  async function putProfile(profile) {
    const db = await openDb();
    const tx = db.transaction('profiles', 'readwrite');
    tx.objectStore('profiles').put({ ...profile, installedAt: profile.installedAt || new Date().toISOString() });
    await transactionDone(tx);
    db.close();
  }

  async function listProfiles() {
    const db = await openDb();
    const profiles = await requestResult(db.transaction('profiles', 'readonly').objectStore('profiles').getAll());
    db.close();
    return profiles.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }

  async function getProfile(id) {
    if (!id) return null;
    const db = await openDb();
    const profile = await requestResult(db.transaction('profiles', 'readonly').objectStore('profiles').get(id));
    db.close();
    return profile || null;
  }

  async function deleteProfile(id) {
    const db = await openDb();
    const tx = db.transaction('profiles', 'readwrite');
    tx.objectStore('profiles').delete(id);
    await transactionDone(tx);
    db.close();
  }

  async function countProfilesUsing(ref) {
    const profiles = await listProfiles();
    return profiles.filter(profile => [profile.avatar, profile.taskSkill].some(item => item?.id === ref.id && item?.version === ref.version)).length;
  }

  async function getLastSelection() {
    const stored = await getSmallSetting(LAST_SELECTION_KEY);
    return stored && typeof stored === 'object' ? stored : { avatarRef: null, taskSkillRef: null, profileId: null };
  }

  async function setLastSelection(selection) {
    const safe = {
      avatarRef: selection?.avatarRef || null,
      taskSkillRef: selection?.taskSkillRef || null,
      profileId: selection?.profileId || null
    };
    await setSmallSetting(LAST_SELECTION_KEY, safe);
    return safe;
  }

  async function getInheritSelection() {
    const stored = await getSmallSetting(INHERIT_SELECTION_KEY);
    return stored !== false;
  }

  async function setInheritSelection(enabled) {
    await setSmallSetting(INHERIT_SELECTION_KEY, Boolean(enabled));
  }

  return {
    DB_NAME,
    LAST_SELECTION_KEY,
    INHERIT_SELECTION_KEY,
    putPack,
    getPack,
    listPacks,
    setPackEnabled,
    deletePack,
    putProfile,
    getProfile,
    listProfiles,
    deleteProfile,
    countProfilesUsing,
    getLastSelection,
    setLastSelection,
    getInheritSelection,
    setInheritSelection
  };
});
