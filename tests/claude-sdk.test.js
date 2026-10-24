'use strict';

const assert = require('node:assert/strict');
const { runClaudeSdk } = require('../host/claude_sdk');

async function main() {
  const abortController = new AbortController();
  let request;
  const text = await runClaudeSdk({
    prompt: '本文', systemPrompt: '共通指示', model: 'claude-sonnet-5-5', abortController
  }, async () => ({
    query(input) {
      request = input;
      return (async function* () {
        yield { type: 'system', subtype: 'init', apiKeySource: 'oauth' };
        yield { type: 'result', subtype: 'success', result: '回答' };
      })();
    }
  }), async () => {});
  assert.equal(text, '回答');
  assert.equal(request.prompt, '本文');
  assert.equal(request.options.systemPrompt, '共通指示');
  assert.equal(request.options.model, 'claude-sonnet-5-5');
  assert.deepEqual(request.options.tools, []);
  assert.equal(request.options.abortController, abortController);
  assert.equal(request.options.persistSession, false);

  await assert.rejects(
    runClaudeSdk({ prompt: '本文' }, async () => ({
      query() {
        return (async function* () {
          yield { type: 'system', subtype: 'init', apiKeySource: 'oauth' };
          yield { type: 'result', subtype: 'error_during_execution', is_error: true, result: '認証エラー' };
        })();
      }
    }), async () => {}),
    /認証エラー/
  );
  await assert.rejects(
    runClaudeSdk({ prompt: '本文', abortController: new AbortController() }, async () => ({
      query() {
        return (async function* () {
          yield { type: 'system', subtype: 'init', apiKeySource: 'user' };
        })();
      }
    }), async () => {}),
    /認証元は user.*APIキー課金を避けるため/
  );
  assert.equal(await runClaudeSdk({ prompt: '本文' }, async () => ({
    query() {
      return (async function* () {
        yield { type: 'system', subtype: 'init', apiKeySource: 'none' };
        yield { type: 'result', subtype: 'success', result: '回答' };
      })();
    }
  }), async () => {}), '回答');
  await assert.rejects(
    runClaudeSdk({ prompt: '本文' }, async () => { throw new Error('SDKを起動してはいけません'); }, async () => {
      throw new Error('サブスク認証なし');
    }),
    /サブスク認証なし/
  );
  console.log('Claude SDK adapter: 5 checks passed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
