(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.EasyGeminiAvatarPack = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LIMITS = Object.freeze({
    maxFiles: 100,
    maxFileBytes: 1024 * 1024,
    maxTotalBytes: 10 * 1024 * 1024,
    maxTextCharacters: 1000000
  });
  const ALLOWED_EXTENSIONS = new Set(['md', 'txt', 'json']);
  const SEMVER_RE = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/;
  const ID_RE = /^(avatar|skill)\.[a-z0-9.-]+$/;
  const PROFILE_ID_RE = /^profile\.[a-z0-9.-]+$/;
  const CAPABILITY_NAMES = new Set(['web_search', 'page_extract', 'file_upload', 'code_interpreter']);
  const CAPABILITY_LEVELS = new Set(['required', 'preferred', 'optional']);
  const UNAVAILABLE_POLICIES = new Set(['block', 'request-sources', 'continue-with-warning']);

  function fail(message) { throw new Error(message); }
  function isObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }
  function allowOnly(object, allowed, label) {
    const unknown = Object.keys(object || {}).filter(key => !allowed.includes(key));
    if (unknown.length) fail(`${label}に未知の項目があります: ${unknown.join(', ')}`);
  }
  function byteLength(text) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).length;
    return typeof Buffer !== 'undefined' ? Buffer.byteLength(text, 'utf8') : text.length * 3;
  }
  function extension(path) { return String(path).split('.').pop().toLowerCase(); }

  function normalizePath(rawPath) {
    const path = String(rawPath || '').replace(/\\/g, '/').trim();
    if (!path) fail('空のパスは使用できません');
    if (path.startsWith('/') || /^[A-Za-z]:/.test(path)) fail(`絶対パスは使用できません: ${path}`);
    const segments = path.split('/');
    if (segments.some(segment => !segment || segment === '..')) fail(`安全でない相対パスです: ${path}`);
    if (path.length > 240) fail(`パスが長すぎます: ${path}`);
    if (!ALLOWED_EXTENSIONS.has(extension(path))) fail(`許可されていないファイル形式です: ${path}`);
    if (!/^[A-Za-z0-9._/-]+\.(?:md|txt|json)$/i.test(path)) fail(`パスに使用できない文字があります: ${path}`);
    return path;
  }

  function requireString(value, label, maxLength) {
    if (typeof value !== 'string' || !value.trim()) fail(`${label}が必要です`);
    if (maxLength && value.length > maxLength) fail(`${label}が長すぎます`);
  }

  function validateRights(rights) {
    if (!isObject(rights)) fail('rightsが必要です');
    allowOnly(rights, ['visibility', 'license', 'redistribution', 'commercialUse'], 'rights');
    if (!['private', 'shared', 'public'].includes(rights.visibility)) fail('rights.visibilityが不正です');
    requireString(rights.license, 'rights.license', 160);
    if (typeof rights.redistribution !== 'boolean') fail('rights.redistributionが必要です');
    if (!['owner-only', 'allowed', 'prohibited', 'permission-required'].includes(rights.commercialUse)) {
      fail('rights.commercialUseが不正です');
    }
  }

  function validateTaggedFiles(items, label, referenced) {
    if (!Array.isArray(items)) fail(`${label}は配列で指定してください`);
    items.forEach((item, index) => {
      if (!isObject(item)) fail(`${label}[${index}]が不正です`);
      allowOnly(item, ['path', 'tags', 'priority'], `${label}[${index}]`);
      const path = normalizePath(item.path);
      if (!Array.isArray(item.tags) || !item.tags.length || item.tags.some(tag => !/^[a-z0-9-]+$/.test(tag))) {
        fail(`${label}[${index}].tagsが不正です`);
      }
      referenced.add(path);
    });
  }

  function validateContextPolicy(policy) {
    if (!isObject(policy) || !['selective', 'all'].includes(policy.strategy)) fail('contextPolicyが不正です');
    allowOnly(policy, ['strategy', 'maxExamples', 'maxReferenceCharacters'], 'contextPolicy');
    if (!Number.isInteger(policy.maxExamples) || policy.maxExamples < 0 || policy.maxExamples > 10) fail('contextPolicy.maxExamplesが不正です');
    if (!Number.isInteger(policy.maxReferenceCharacters) || policy.maxReferenceCharacters < 1000 || policy.maxReferenceCharacters > 500000) {
      fail('contextPolicy.maxReferenceCharactersが不正です');
    }
  }

  function validateCommonManifest(manifest, type) {
    if (!isObject(manifest)) fail('manifestがJSONオブジェクトではありません');
    const expectedFormat = type === 'avatar' ? 'easygemini-avatar-pack' : 'easygemini-task-skill-pack';
    if (manifest.format !== expectedFormat || manifest.formatVersion !== 1) fail('パック形式またはversionが未対応です');
    if (!ID_RE.test(manifest.id || '') || !manifest.id.startsWith(`${type === 'avatar' ? 'avatar' : 'skill'}.`)) fail('パックIDが不正です');
    if (!SEMVER_RE.test(manifest.version || '')) fail('versionはSemVerで指定してください');
    requireString(manifest.name, 'name', 120);
    requireString(manifest.language, 'language', 20);
    requireString(manifest.description, 'description', 500);
    if (!isObject(manifest.author)) fail('authorが必要です');
    allowOnly(manifest.author, type === 'avatar' ? ['name', 'url'] : ['name'], 'author');
    requireString(manifest.author.name, 'author.name', 120);
    validateRights(manifest.rights);
    validateContextPolicy(manifest.contextPolicy);
  }

  function validateAvatarManifest(manifest) {
    allowOnly(manifest, ['$schema', 'format', 'formatVersion', 'id', 'name', 'version', 'language', 'description', 'author', 'rights', 'entrypoints', 'examples', 'overlays', 'evals', 'excludedDomains', 'contextPolicy'], 'Avatar manifest');
    validateCommonManifest(manifest, 'avatar');
    const referenced = new Set();
    if (!isObject(manifest.entrypoints)) fail('entrypointsが必要です');
    allowOnly(manifest.entrypoints, ['voiceCore', 'styleRules', 'antiSlop'], 'entrypoints');
    ['voiceCore', 'styleRules', 'antiSlop'].forEach(key => referenced.add(normalizePath(manifest.entrypoints[key])));
    validateTaggedFiles(manifest.examples, 'examples', referenced);
    if (!Array.isArray(manifest.overlays)) fail('overlaysは配列で指定してください');
    manifest.overlays.forEach((overlay, index) => {
      if (!isObject(overlay) || !/^skill\.[a-z0-9.-]+$/.test(overlay.whenTaskSkillId || '')) fail(`overlays[${index}]が不正です`);
      allowOnly(overlay, ['whenTaskSkillId', 'path', 'examplePaths'], `overlays[${index}]`);
      referenced.add(normalizePath(overlay.path));
      (overlay.examplePaths || []).forEach(path => referenced.add(normalizePath(path)));
    });
    if (!Array.isArray(manifest.evals)) fail('evalsは配列で指定してください');
    manifest.evals.forEach(path => referenced.add(normalizePath(path)));
    return referenced;
  }

  function validateTaskSkillManifest(manifest) {
    allowOnly(manifest, ['$schema', 'format', 'formatVersion', 'id', 'name', 'version', 'language', 'description', 'author', 'rights', 'entrypoints', 'knowledge', 'examples', 'evals', 'capabilities', 'contextPolicy'], 'Task Skill manifest');
    validateCommonManifest(manifest, 'taskSkill');
    const referenced = new Set();
    if (!isObject(manifest.entrypoints)) fail('entrypointsが必要です');
    allowOnly(manifest.entrypoints, ['instructions', 'antiSlop'], 'entrypoints');
    ['instructions', 'antiSlop'].forEach(key => referenced.add(normalizePath(manifest.entrypoints[key])));
    validateTaggedFiles(manifest.knowledge, 'knowledge', referenced);
    validateTaggedFiles(manifest.examples, 'examples', referenced);
    if (!Array.isArray(manifest.evals)) fail('evalsは配列で指定してください');
    manifest.evals.forEach(path => referenced.add(normalizePath(path)));
    if (!Array.isArray(manifest.capabilities)) fail('capabilitiesは配列で指定してください');
    manifest.capabilities.forEach((capability, index) => {
      if (!isObject(capability) || !CAPABILITY_NAMES.has(capability.name) || !CAPABILITY_LEVELS.has(capability.level) || !UNAVAILABLE_POLICIES.has(capability.whenUnavailable)) {
        fail(`capabilities[${index}]が不正です`);
      }
      allowOnly(capability, ['name', 'level', 'whenUnavailable'], `capabilities[${index}]`);
    });
    return referenced;
  }

  function validateProfile(profile) {
    if (!isObject(profile) || profile.format !== 'easygemini-composition-profile' || profile.formatVersion !== 1) fail('Profile形式が不正です');
    allowOnly(profile, ['$schema', 'format', 'formatVersion', 'id', 'name', 'avatar', 'taskSkill', 'preferredModel', 'retrieval'], 'Profile');
    if (!PROFILE_ID_RE.test(profile.id || '')) fail('Profile IDが不正です');
    requireString(profile.name, 'Profile name', 120);
    for (const [label, ref, prefix] of [['avatar', profile.avatar, 'avatar.'], ['taskSkill', profile.taskSkill, 'skill.']]) {
      if (!isObject(ref) || !String(ref.id || '').startsWith(prefix) || !SEMVER_RE.test(ref.version || '')) fail(`Profile ${label}参照が不正です`);
      allowOnly(ref, ['id', 'version'], `Profile ${label}`);
    }
    const retrieval = profile.retrieval;
    if (!isObject(retrieval)) fail('Profile retrievalが必要です');
    allowOnly(retrieval, ['maxAvatarExamples', 'maxSkillExamples', 'maxReferenceCharacters'], 'Profile retrieval');
    ['maxAvatarExamples', 'maxSkillExamples'].forEach(key => {
      if (!Number.isInteger(retrieval[key]) || retrieval[key] < 0 || retrieval[key] > 10) fail(`Profile ${key}が不正です`);
    });
    if (!Number.isInteger(retrieval.maxReferenceCharacters) || retrieval.maxReferenceCharacters < 1000 || retrieval.maxReferenceCharacters > 500000) {
      fail('Profile maxReferenceCharactersが不正です');
    }
    return JSON.parse(JSON.stringify(profile));
  }

  function normalizeEntries(rawEntries) {
    if (!Array.isArray(rawEntries) || !rawEntries.length) fail('パックにファイルがありません');
    if (rawEntries.length > LIMITS.maxFiles) fail(`ファイル数が上限${LIMITS.maxFiles}を超えています`);
    const seen = new Set();
    let totalBytes = 0;
    let totalCharacters = 0;
    return rawEntries.map(raw => {
      const path = normalizePath(raw.path);
      const key = path.toLowerCase();
      if (seen.has(key)) fail(`重複パスです: ${path}`);
      seen.add(key);
      if (typeof raw.text !== 'string') fail(`テキストとして読めません: ${path}`);
      const bytes = byteLength(raw.text);
      if (bytes > LIMITS.maxFileBytes) fail(`単体サイズ上限を超えています: ${path}`);
      totalBytes += bytes;
      totalCharacters += raw.text.length;
      if (totalBytes > LIMITS.maxTotalBytes) fail('合計サイズ上限を超えています');
      if (totalCharacters > LIMITS.maxTextCharacters) fail('総テキスト文字数上限を超えています');
      const expectedMediaType = extension(path) === 'json' ? 'application/json' : extension(path) === 'md' ? 'text/markdown' : 'text/plain';
      if (raw.mediaType && raw.mediaType !== expectedMediaType) fail(`mediaTypeが拡張子と一致しません: ${path}`);
      return { path, mediaType: expectedMediaType, text: raw.text };
    });
  }

  function createPack(manifest, entries, metadata) {
    const type = manifest?.format === 'easygemini-avatar-pack' ? 'avatar' : manifest?.format === 'easygemini-task-skill-pack' ? 'taskSkill' : null;
    if (!type) fail('AvatarまたはTask Skillのmanifestではありません');
    const files = normalizeEntries(entries).filter(file => !['avatar.json', 'skill.json'].includes(file.path));
    const referenced = type === 'avatar' ? validateAvatarManifest(manifest) : validateTaskSkillManifest(manifest);
    const paths = new Set(files.map(file => file.path));
    referenced.forEach(path => { if (!paths.has(path)) fail(`manifestから参照されたファイルがありません: ${path}`); });
    const totalCharacters = files.reduce((sum, file) => sum + file.text.length, 0);
    return {
      key: `${manifest.id}@${manifest.version}`,
      type,
      manifest: JSON.parse(JSON.stringify(manifest)),
      files,
      fileCount: files.length,
      totalCharacters,
      enabled: metadata?.enabled !== false,
      source: metadata?.source || 'import',
      installedAt: metadata?.installedAt || new Date().toISOString()
    };
  }

  function parsePortableBundle(input, metadata) {
    const bundle = typeof input === 'string' ? JSON.parse(input) : input;
    if (!isObject(bundle) || bundle.bundleFormat !== 'easygemini-portable-pack' || bundle.bundleVersion !== 1) fail('portable pack形式が不正です');
    if (!Array.isArray(bundle.files)) fail('portable packのfilesが不正です');
    return createPack(bundle.manifest, bundle.files, metadata);
  }

  function parsePackFromEntries(rawEntries, metadata) {
    const entries = rawEntries.map(entry => ({ ...entry, path: String(entry.path || '').replace(/\\/g, '/') }));
    entries.forEach(entry => {
      if (entry.path.startsWith('/') || /^[A-Za-z]:/.test(entry.path)) fail(`絶対パスは使用できません: ${entry.path}`);
    });
    const manifestEntry = entries.find(entry => /(^|\/)(avatar|skill)\.json$/i.test(entry.path));
    if (!manifestEntry) fail('avatar.jsonまたはskill.jsonが見つかりません');
    const manifestPath = manifestEntry.path;
    const rootPrefix = manifestPath.slice(0, manifestPath.lastIndexOf('/') + 1);
    const relativeEntries = entries.map(entry => ({ ...entry, path: entry.path.startsWith(rootPrefix) ? entry.path.slice(rootPrefix.length) : entry.path }));
    let manifest;
    try { manifest = JSON.parse(manifestEntry.text); } catch { fail('manifest JSONを解析できません'); }
    return createPack(manifest, relativeEntries, metadata);
  }

  async function parseFolderFiles(fileList, metadata) {
    const files = Array.from(fileList || []);
    const entries = await Promise.all(files.map(async file => ({
      path: file.webkitRelativePath || file.name,
      text: await file.text()
    })));
    return parsePackFromEntries(entries, metadata);
  }

  function assertExportAllowed(pack) {
    if (!pack || !pack.manifest) fail('パックがありません');
    if (pack.type === 'avatar' && pack.manifest.rights?.redistribution === false) fail('このAvatarは再配布が許可されていないため書き出せません');
  }

  function buildPortableBundle(pack) {
    assertExportAllowed(pack);
    return {
      bundleFormat: 'easygemini-portable-pack',
      bundleVersion: 1,
      manifest: JSON.parse(JSON.stringify(pack.manifest)),
      files: pack.files.map(file => ({ path: file.path, mediaType: file.mediaType, text: file.text }))
    };
  }

  function diffPacks(previous, next) {
    const before = new Map((previous?.files || []).map(file => [file.path, file.text]));
    const after = new Map((next?.files || []).map(file => [file.path, file.text]));
    return {
      manifestChanged: JSON.stringify(previous?.manifest || null) !== JSON.stringify(next?.manifest || null),
      added: [...after.keys()].filter(path => !before.has(path)),
      removed: [...before.keys()].filter(path => !after.has(path)),
      changed: [...after.keys()].filter(path => before.has(path) && before.get(path) !== after.get(path))
    };
  }

  return {
    LIMITS,
    normalizePath,
    validateProfile,
    parsePortableBundle,
    parsePackFromEntries,
    parseFolderFiles,
    buildPortableBundle,
    assertExportAllowed,
    diffPacks
  };
});
