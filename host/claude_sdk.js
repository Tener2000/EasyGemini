const { execFile } = require('node:child_process');
const path = require('node:path');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

async function checkClaudeSubscription() {
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    throw new Error('認証用の環境変数が設定されています。意図しない課金を避けるためClaude SDKを中止しました。');
  }
  const executable = path.join(__dirname, 'node_modules', '@anthropic-ai', 'claude-agent-sdk-win32-x64', 'claude.exe');
  let status;
  try {
    const { stdout } = await execFileAsync(executable, ['auth', 'status'], { timeout: 10000, windowsHide: true });
    status = JSON.parse(stdout);
  } catch {
    throw new Error('Claude Code CLIのログイン状態を確認できません。公式CLIでログインしてください。');
  }
  if (!status.loggedIn || status.authMethod !== 'claude.ai' || status.apiProvider !== 'firstParty' || !['pro', 'max', 'team', 'enterprise'].includes(String(status.subscriptionType).toLowerCase())) {
    throw new Error('Claudeのサブスク認証を確認できません。公式CLIでログインしてください。');
  }
}

async function runClaudeSdk({ prompt, systemPrompt, model, abortController }, loadSdk = () => import('@anthropic-ai/claude-agent-sdk'), checkSubscription = checkClaudeSubscription) {
  await checkSubscription();
  const { query } = await loadSdk();
  let output = '';
  let subscriptionAuth = false;
  const stream = query({
    prompt,
    options: {
      model,
      systemPrompt,
      tools: [],
      maxTurns: 1,
      settingSources: [],
      persistSession: false,
      abortController
    }
  });
  for await (const message of stream) {
    if (message.type === 'system' && message.subtype === 'init') {
      if (!['oauth', 'none'].includes(message.apiKeySource)) {
        abortController?.abort();
        throw new Error(`Claude SDK の認証元は ${message.apiKeySource || '不明'} です。APIキー課金を避けるため中止しました。`);
      }
      subscriptionAuth = true;
    }
    if (message.type !== 'result') continue;
    if (!subscriptionAuth) throw new Error('Claude SDK の認証経路を確認できませんでした。');
    if (message.is_error || message.subtype !== 'success') {
      throw new Error(message.result || `Claude SDK: ${message.subtype || 'failed'}`);
    }
    output = message.result || '';
  }
  return output;
}

module.exports = { runClaudeSdk, checkClaudeSubscription };
