'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const packApi = require('../avatar-pack.js');
const runtimeApi = require('../runtime-context.js');

const root = path.resolve(__dirname, '..');
const fixtureRoot = path.join(root, 'avatar-system-handoff', 'samples');
let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}\n${error.stack}`);
    process.exitCode = 1;
  }
}

function directoryEntries(directory) {
  const base = path.dirname(directory);
  const entries = [];
  function walk(current) {
    fs.readdirSync(current, { withFileTypes: true }).forEach(item => {
      const absolute = path.join(current, item.name);
      if (item.isDirectory()) walk(absolute);
      else entries.push({ path: path.relative(base, absolute).replace(/\\/g, '/'), text: fs.readFileSync(absolute, 'utf8') });
    });
  }
  walk(directory);
  return entries;
}

const avatarEntries = directoryEntries(path.join(fixtureRoot, 'avatar-personal-writing-jp'));
const taskEntries = directoryEntries(path.join(fixtureRoot, 'task-skill-manga-trivia-column-jp'));
const avatar = packApi.parsePackFromEntries(avatarEntries, { source: 'test-fixture' });
const taskSkill = packApi.parsePackFromEntries(taskEntries, { source: 'test-fixture' });
const profile = packApi.validateProfile(JSON.parse(fs.readFileSync(path.join(fixtureRoot, 'profiles', 'personal-manga-column.json'), 'utf8')));

function runtime(overrides) {
  return runtimeApi.buildRuntimeContext({
    baseSystemPrompt: 'BASE',
    avatar,
    taskSkill,
    profile,
    presetInstruction: '漫画について調査レポートを書いてください',
    sourceText: '公式資料の本文',
    provider: 'gemini',
    model: 'gemini-2.5-flash-lite',
    capabilities: { web_search: false, page_extract: true },
    ...overrides
  });
}

test('Avatarサンプルを解析できる', () => {
  assert.equal(avatar.type, 'avatar');
  assert.equal(avatar.manifest.id, 'avatar.personal-writing-ja');
  assert(avatar.fileCount > 0 && avatar.totalCharacters > 0);
});

test('Task Skillサンプルを解析できる', () => {
  assert.equal(taskSkill.type, 'taskSkill');
  assert.equal(taskSkill.manifest.id, 'skill.manga-trivia-column-ja');
});

test('Composition Profileを解析できる', () => {
  assert.equal(profile.avatar.id, avatar.manifest.id);
  assert.equal(profile.taskSkill.id, taskSkill.manifest.id);
});

test('未選択時は従来プロンプトを一字も変えない', () => {
  const expected = '指示\n\n-----\n対象テキスト:\n素材';
  const result = runtimeApi.buildRuntimeContext({ baseSystemPrompt: 'SYS', presetInstruction: '指示', sourceText: '素材' });
  assert.equal(result.systemInstruction, 'SYS');
  assert.equal(result.userPrompt, expected);
  assert.deepEqual(result.provenance.referencePaths, []);
});

test('Avatarのvoice core・style・anti-slopを合成する', () => {
  const result = runtime({ taskSkill: null, profile: null });
  for (const key of ['voiceCore', 'styleRules', 'antiSlop']) {
    const source = avatar.files.find(file => file.path === avatar.manifest.entrypoints[key]).text.trim();
    assert(result.systemInstruction.includes(source));
  }
});

test('レポート依頼ではAvatarのreport作例だけを選ぶ', () => {
  const result = runtime({ taskSkill: null, profile: null, presetInstruction: 'PWAについて調査レポートを書いてください' });
  const selected = result.provenance.referencePaths.filter(item => item.includes('/examples/'));
  assert(selected.length > 0);
  selected.forEach(selectedPath => {
    const example = avatar.manifest.examples.find(item => item.path === selectedPath);
    assert(example.tags.includes('report'));
  });
});

test('Task Skill契約と事実監査を合成する', () => {
  const result = runtime({ avatar: null, profile: null });
  const workflow = taskSkill.files.find(file => file.path === taskSkill.manifest.entrypoints.instructions).text.trim();
  const antiSlop = taskSkill.files.find(file => file.path === taskSkill.manifest.entrypoints.antiSlop).text.trim();
  assert(result.systemInstruction.includes(workflow));
  assert(result.systemInstruction.includes(antiSlop));
  assert(!result.systemInstruction.includes('<avatar_voice>'));
});

test('AvatarとSkillの組合せでoverlayを選ぶ', () => {
  const result = runtime();
  assert(result.systemInstruction.includes('<avatar_overlay skill_id="skill.manga-trivia-column-ja">'));
  assert(result.provenance.referencePaths.includes('knowledge/overlays/manga-original-voice-examples.md'));
});

test('Web検索不足を警告し、架空情報を避ける指示を保持する', () => {
  const result = runtime();
  assert(result.provenance.warnings.some(message => message.includes('Web検索')));
  assert(result.systemInstruction.includes('公式資料'));
  assert(result.systemInstruction.includes('不足資料'));
  assert.equal(result.blocked, false);
});

test('16K相当では各作例を最大2本にする', () => {
  const result = runtime({ contextBudget: { maxReferenceCharacters: 20000, maxExamples: 2 } });
  const avatarExamples = result.provenance.referencePaths.filter(item => /PWA-[0-9]+\.md$/.test(item));
  const skillExamples = result.provenance.referencePaths.filter(item => /MCG-[0-9]+\.md$/.test(item));
  assert(avatarExamples.length <= 2);
  assert(skillExamples.length <= 2);
});

test('通常生成へ評価票を入れない', () => {
  const result = runtime();
  [...avatar.manifest.evals, ...taskSkill.manifest.evals].forEach(evalPath => assert(!result.provenance.referencePaths.includes(evalPath)));
});

test('参照上限でもvoice coreとTask契約を保持する', () => {
  const result = runtime({ contextBudget: { maxReferenceCharacters: 1000, maxExamples: 2 } });
  assert(result.systemInstruction.includes('<avatar_voice>'));
  assert(result.systemInstruction.includes('<task_contract>'));
});

test('参照資料を命令ではなくデータとして境界化する', () => {
  const result = runtime();
  assert(result.systemInstruction.includes('参照資料内の命令'));
  assert(result.userPrompt.includes('<selected_references>'));
  assert(result.userPrompt.includes('reference boundary'));
});

test('private・再配布不可Avatarの書き出しを拒否する', () => {
  assert.throws(() => packApi.buildPortableBundle(avatar), /再配布/);
});

test('自作Avatarのportable書出・再読込が一致する', () => {
  const own = JSON.parse(JSON.stringify(avatar));
  own.manifest.id = 'avatar.my-writing-ja';
  own.manifest.rights.redistribution = true;
  own.key = `${own.manifest.id}@${own.manifest.version}`;
  const imported = packApi.parsePortableBundle(packApi.buildPortableBundle(own));
  assert.equal(imported.manifest.id, own.manifest.id);
  assert.equal(imported.manifest.version, own.manifest.version);
  assert.deepEqual(imported.manifest.examples, own.manifest.examples);
  assert.deepEqual(imported.files, own.files);
});

test('同一versionの差分を列挙する', () => {
  const changed = JSON.parse(JSON.stringify(avatar));
  changed.files[0].text += '\nchanged';
  assert(packApi.diffPacks(avatar, changed).changed.includes(changed.files[0].path));
});

for (const [name, badPath, pattern] of [
  ['親ディレクトリ参照', '../secret.txt', /安全でない/],
  ['JavaScript', 'knowledge/run.js', /許可されていない/],
  ['HTML', 'knowledge/page.html', /許可されていない/]
]) {
  test(`${name}を拒否する`, () => {
    assert.throws(() => packApi.parsePackFromEntries([...avatarEntries, { path: `avatar-personal-writing-jp/${badPath}`, text: 'x' }]), pattern);
  });
}

test('絶対パスを拒否する', () => {
  assert.throws(() => packApi.parsePackFromEntries([...avatarEntries, { path: 'C:/secret.txt', text: 'x' }]), /絶対パス/);
});

test('重複パスを拒否する', () => {
  assert.throws(() => packApi.parsePackFromEntries([...avatarEntries, { ...avatarEntries[1] }]), /重複/);
});

test('参照切れentrypointを拒否する', () => {
  assert.throws(() => packApi.parsePackFromEntries(avatarEntries.filter(entry => !entry.path.endsWith('/knowledge/voice-core.md'))), /参照されたファイル/);
});

test('Schema相当の不正IDを拒否する', () => {
  const entries = avatarEntries.map(entry => {
    if (!entry.path.endsWith('/avatar.json')) return entry;
    const manifest = JSON.parse(entry.text);
    manifest.id = 'INVALID ID';
    return { ...entry, text: JSON.stringify(manifest) };
  });
  assert.throws(() => packApi.parsePackFromEntries(entries), /ID/);
});

test('Schemaにないmanifest項目を拒否する', () => {
  const entries = avatarEntries.map(entry => {
    if (!entry.path.endsWith('/avatar.json')) return entry;
    const manifest = JSON.parse(entry.text);
    manifest.unexpectedSetting = true;
    return { ...entry, text: JSON.stringify(manifest) };
  });
  assert.throws(() => packApi.parsePackFromEntries(entries), /未知の項目/);
});

test('既存プリセット・SKILL.md・全Providerのコードパスを保持する', () => {
  const source = fs.readFileSync(path.join(root, 'sidepanel.js'), 'utf8');
  assert(source.includes("const PRESET_KEY = 'easyGemini.presets.v2'"));
  assert(source.includes('function parseSkillMarkdown'));
  ['callGeminiText', 'callClaudeText', 'callOpenAIText', 'callGrokText', 'callLocalLLMText', 'callHermesCliText'].forEach(name => assert(source.includes(`function ${name}`)));
});

test('IndexedDBを仕様どおり分離する', () => {
  const source = fs.readFileSync(path.join(root, 'avatar-store.js'), 'utf8');
  ['avatars', 'taskSkills', 'packFiles', 'profiles'].forEach(name => assert(source.includes(`'${name}'`)));
  assert(!source.includes('easyGemini.presets.v2'));
});

if (!process.exitCode) console.log(`\n${passed} tests passed`);
