(function () {
  'use strict';

  const packApi = EasyGeminiAvatarPack;
  const store = EasyGeminiAvatarStore;
  const listEl = document.querySelector('#list');
  const messageEl = document.querySelector('#message');
  const packTemplate = document.querySelector('#packCardTemplate');
  const profileTemplate = document.querySelector('#profileCardTemplate');
  const folderInput = document.querySelector('#folderInput');
  const portableInput = document.querySelector('#portableInput');
  const profileInput = document.querySelector('#profileInput');
  const inheritSelection = document.querySelector('#inheritSelection');
  let activeTab = 'avatar';

  function message(text, error) {
    messageEl.textContent = text || '';
    messageEl.style.color = error ? '#ef5350' : '';
  }

  function downloadJson(value, filename) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function metadataRows(pack) {
    const manifest = pack.manifest;
    const capabilities = (manifest.capabilities || []).map(item => `${item.name}: ${item.level} / ${item.whenUnavailable}`).join(', ') || 'なし';
    return [
      ['ID', manifest.id], ['version', manifest.version], ['作者', manifest.author?.name || '不明'], ['言語', manifest.language],
      ['公開範囲', manifest.rights?.visibility || 'private'], ['ライセンス', manifest.rights?.license || '未指定'],
      ['商用利用', manifest.rights?.commercialUse || 'owner-only'], ['再配布', manifest.rights?.redistribution ? '可' : '不可'],
      ['ファイル', `${pack.fileCount}件 / ${pack.totalCharacters.toLocaleString()}文字`], ['必要能力', capabilities],
      ['インストール元', pack.source || 'import'], ['インストール日時', pack.installedAt || '不明']
    ];
  }

  function renderMetadata(dl, rows) {
    dl.replaceChildren();
    rows.forEach(([label, value]) => {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      dl.append(dt, dd);
    });
  }

  async function importPack(pack) {
    const existing = await store.getPack(pack.type, pack.key);
    if (existing) {
      const diff = packApi.diffPacks(existing, pack);
      const summary = [`manifest変更: ${diff.manifestChanged ? 'あり' : 'なし'}`, `追加: ${diff.added.join(', ') || 'なし'}`, `変更: ${diff.changed.join(', ') || 'なし'}`, `削除: ${diff.removed.join(', ') || 'なし'}`].join('\n');
      if (!confirm(`同一ID/versionがインストール済みです。差分を確認して更新しますか？\n\n${summary}`)) return;
    }
    const manifest = pack.manifest;
    const rights = manifest.rights;
    const capabilities = (manifest.capabilities || []).map(item => `${item.name} (${item.level})`).join(', ') || 'なし';
    const notice = [
      `種別: ${pack.type === 'avatar' ? 'Avatar' : 'Task Skill'}`,
      `ID: ${manifest.id}@${manifest.version}`,
      `作者: ${manifest.author.name}`,
      `権利: ${rights.visibility} / ${rights.license} / 再配布${rights.redistribution ? '可' : '不可'}`,
      `要求能力: ${capabilities}`,
      `サイズ: ${pack.fileCount}件 / ${pack.totalCharacters.toLocaleString()}文字`,
      '',
      'インポート内容は信頼された命令ではなく参照データとして扱われます。保存しますか？'
    ].join('\n');
    if (!confirm(notice)) return;
    await store.putPack(pack);
    message(`${manifest.name} を保存しました`);
    activeTab = pack.type;
    updateTabs();
    await render();
  }

  async function renderPacks(type) {
    const packs = await store.listPacks(type, true);
    if (!packs.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = type === 'avatar' ? 'インストール済みのAvatarはありません。' : 'インストール済みのTask Skillはありません。';
      listEl.appendChild(empty);
      return;
    }
    for (const metadata of packs) {
      const pack = await store.getPack(type, metadata.key);
      const card = packTemplate.content.firstElementChild.cloneNode(true);
      card.querySelector('[data-field="name"]').textContent = `${pack.manifest.name} v${pack.manifest.version}`;
      card.querySelector('[data-field="summary"]').textContent = pack.manifest.id;
      card.querySelector('[data-field="description"]').textContent = pack.manifest.description;
      renderMetadata(card.querySelector('[data-field="metadata"]'), metadataRows(pack));
      card.querySelector('[data-field="details"]').textContent = `${JSON.stringify(pack.manifest, null, 2)}\n\nFiles:\n${pack.files.map(file => file.path).join('\n')}`;
      const enabled = card.querySelector('[data-action="enabled"]');
      enabled.checked = pack.enabled !== false;
      enabled.addEventListener('change', async () => {
        await store.setPackEnabled(type, pack.key, enabled.checked);
        message(`${pack.manifest.name} を${enabled.checked ? '有効' : '無効'}にしました`);
      });
      const exportButton = card.querySelector('[data-action="export"]');
      if (type === 'avatar' && pack.manifest.rights.redistribution === false) {
        exportButton.disabled = true;
        exportButton.title = '権利情報で再配布が禁止されています';
      }
      exportButton.addEventListener('click', () => {
        try {
          const bundle = packApi.buildPortableBundle(pack);
          const extension = type === 'avatar' ? 'easy-avatar.json' : 'easy-skill.json';
          downloadJson(bundle, `${pack.manifest.id}-${pack.manifest.version}.${extension}`);
        } catch (error) { message(error.message, true); }
      });
      card.querySelector('[data-action="duplicate"]').addEventListener('click', async () => {
        const suggestedId = `${type === 'avatar' ? 'avatar' : 'skill'}.my-${pack.manifest.id.split('.').slice(1).join('-')}`;
        const id = prompt('自分用コピーの新しいIDを入力してください', suggestedId);
        if (!id) return;
        const name = prompt('自分用コピーの名前を入力してください', `${pack.manifest.name} Copy`);
        if (!name) return;
        try {
          const copy = JSON.parse(JSON.stringify(pack));
          copy.manifest.id = id;
          copy.manifest.name = name;
          copy.manifest.author = { name: 'Local user' };
          copy.manifest.rights = { visibility: 'private', license: 'Owner controlled', redistribution: true, commercialUse: 'owner-only' };
          copy.key = `${id}@${copy.manifest.version}`;
          copy.source = `duplicate:${pack.key}`;
          copy.installedAt = new Date().toISOString();
          const validated = packApi.parsePortableBundle({ bundleFormat: 'easygemini-portable-pack', bundleVersion: 1, manifest: copy.manifest, files: copy.files }, { source: copy.source });
          await store.putPack(validated);
          message(`${name} を自分用として複製しました`);
          await render();
        } catch (error) { message(error.message, true); }
      });
      card.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        const ref = { id: pack.manifest.id, version: pack.manifest.version };
        const count = await store.countProfilesUsing(ref);
        if (!confirm(`${pack.manifest.name}を削除しますか？\n参照しているProfile: ${count}件\n履歴本文は削除されません。`)) return;
        await store.deletePack(type, pack.key);
        message(`${pack.manifest.name} を削除しました`);
        await render();
      });
      listEl.appendChild(card);
    }
  }

  async function renderProfiles() {
    const profiles = await store.listProfiles();
    if (!profiles.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = '保存済みの組合せProfileはありません。';
      listEl.appendChild(empty);
      return;
    }
    profiles.forEach(profile => {
      const card = profileTemplate.content.firstElementChild.cloneNode(true);
      card.querySelector('[data-field="name"]').textContent = profile.name;
      card.querySelector('[data-field="details"]').textContent = JSON.stringify(profile, null, 2);
      card.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        if (!confirm(`${profile.name}を削除しますか？`)) return;
        await store.deleteProfile(profile.id);
        message(`${profile.name} を削除しました`);
        await render();
      });
      listEl.appendChild(card);
    });
  }

  async function render() {
    listEl.replaceChildren();
    try {
      if (activeTab === 'profile') await renderProfiles();
      else await renderPacks(activeTab);
    } catch (error) {
      message(`表示に失敗しました: ${error.message}`, true);
    }
  }

  function updateTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
      const selected = tab.dataset.tab === activeTab;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
  }

  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', async () => {
    activeTab = tab.dataset.tab;
    updateTabs();
    await render();
  }));
  document.querySelector('#importFolder').addEventListener('click', () => folderInput.click());
  document.querySelector('#importPortable').addEventListener('click', () => portableInput.click());
  document.querySelector('#importProfile').addEventListener('click', () => profileInput.click());

  folderInput.addEventListener('change', async event => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    try { await importPack(await packApi.parseFolderFiles(files, { source: 'folder' })); }
    catch (error) { message(`読み込みを拒否しました: ${error.message}`, true); }
  });
  portableInput.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try { await importPack(packApi.parsePortableBundle(await file.text(), { source: file.name })); }
    catch (error) { message(`読み込みを拒否しました: ${error.message}`, true); }
  });
  profileInput.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const profile = packApi.validateProfile(JSON.parse(await file.text()));
      if (!confirm(`Profile「${profile.name}」を保存しますか？\nAvatar: ${profile.avatar.id}@${profile.avatar.version}\nTask Skill: ${profile.taskSkill.id}@${profile.taskSkill.version}`)) return;
      await store.putProfile(profile);
      activeTab = 'profile';
      updateTabs();
      message(`${profile.name} を保存しました`);
      await render();
    } catch (error) { message(`Profileを拒否しました: ${error.message}`, true); }
  });

  inheritSelection.addEventListener('change', async () => {
    await store.setInheritSelection(inheritSelection.checked);
    message(`新規タブの選択引継ぎを${inheritSelection.checked ? '有効' : '無効'}にしました`);
  });

  store.getInheritSelection().then(enabled => { inheritSelection.checked = enabled; });
  render();
})();
