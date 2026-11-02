const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { runClaudeSdk } = require('./claude_sdk');

let codex = null;
let codexRl = null;
const hermesChildren = new Map();
const claudeRuns = new Map();

function codexExecutable() {
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const binDir = path.join(localAppData, 'OpenAI', 'Codex', 'bin');
    try {
      const candidates = fs.readdirSync(binDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(binDir, entry.name, 'codex.exe'))
        .filter(file => fs.existsSync(file))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
      if (candidates.length) return candidates[0];
    } catch { /* デスクトップ版が見つからない場合はPATH上のCLIを使う */ }
  }
  return 'codex.cmd';
}

function ensureCodex() {
  if (codex) return codex;

  const executable = codexExecutable();
  codex = spawn(executable, ['app-server'], {
    shell: executable === 'codex.cmd',
    stdio: ['pipe', 'pipe', 'inherit']
  });

  codex.on('error', (err) => {
    sendMessage({ jsonrpc: '2.0', error: { code: -32000, message: 'Failed to start codex: ' + err.message }, id: null });
  });

  codex.on('exit', () => {
    codex = null;
    codexRl = null;
  });

  // Read line by line from Codex and send to Chrome.
  codexRl = readline.createInterface({
    input: codex.stdout,
    terminal: false
  });

  codexRl.on('line', (line) => {
    if (!line.trim()) return;
    try {
      const msg = JSON.parse(line);
      sendMessage(msg);
    } catch (e) {
      // Ignore non-JSON lines or log them to stderr.
    }
  });

  return codex;
}

function runHermesOneshot(message) {
  const id = message.id ?? null;
  const params = message.params || {};
  const prompt = String(params.prompt || '');
  const provider = String(params.provider || 'xai-oauth');
  const model = String(params.model || 'grok-4.3');

  if (!prompt.trim()) {
    sendMessage({ jsonrpc: '2.0', id, error: { code: -32602, message: 'Hermes prompt is empty' } });
    return;
  }

  // WSLのコマンドラインに本文を含めず、標準入力から渡す。
  const payload = Buffer.from(JSON.stringify({ prompt, provider, model }), 'utf8').toString('base64');
  const command = 'exec hermes -z "$1" --provider "$2" --model "$3"';
  const script = [
    'import base64, json, os',
    `payload = json.loads(base64.b64decode('${payload}'))`,
    `os.execvp('bash', ['bash', '-lc', ${JSON.stringify(command)}, 'easy-gemini', payload['prompt'], payload['provider'], payload['model']])`
  ].join('\n');

  const child = spawn('wsl.exe', ['python3', '-'], {
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  hermesChildren.set(id, child);
  child.stdin.on('error', () => {});
  child.stdin.end(script + '\n');

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += decodeOutput(chunk); });
  child.stderr.on('data', (chunk) => { stderr += decodeOutput(chunk); });

  child.on('error', (err) => {
    hermesChildren.delete(id);
    sendMessage({ jsonrpc: '2.0', id, error: { code: -32010, message: 'Failed to start Hermes via WSL: ' + err.message } });
  });

  child.on('exit', (code) => {
    hermesChildren.delete(id);
    if (code === 0) {
      sendMessage({ jsonrpc: '2.0', id, result: { text: stdout.trim() } });
    } else {
      const messageText = (stderr || stdout || `Hermes exited with code ${code}`).trim();
      sendMessage({ jsonrpc: '2.0', id, error: { code: -32011, message: formatHermesError(messageText) } });
    }
  });
}

function formatHermesError(text) {
  const raw = String(text || '').trim();
  if (/No Codex credentials stored/i.test(raw)) {
    return 'Hermes の openai-codex 認証が未設定です。WSL のターミナルで `hermes auth add openai-codex --type oauth` を実行してログインしてください。';
  }
  if (/Unknown provider 'openai'/i.test(raw)) {
    return "Hermes provider 'openai' は未登録です。GPT-5.5 (Hermes WSL) では provider に `openai-codex` を指定してください。";
  }
  return raw || 'Hermes failed';
}

function cancelHermes(id) {
  if (id == null) {
    for (const child of hermesChildren.values()) child.kill();
    hermesChildren.clear();
    return;
  }
  const child = hermesChildren.get(id);
  if (child) {
    child.kill();
    hermesChildren.delete(id);
  }
}

async function runClaudeOneshot(message) {
  const id = message.id ?? null;
  const params = message.params || {};
  const prompt = String(params.prompt || '');
  if (!prompt.trim()) {
    sendMessage({ jsonrpc: '2.0', id, error: { code: -32602, message: 'Claude prompt is empty' } });
    return;
  }
  const abortController = new AbortController();
  claudeRuns.set(id, abortController);
  try {
    const text = await runClaudeSdk({
      prompt,
      systemPrompt: String(params.systemPrompt || ''),
      model: String(params.model || 'claude-sonnet-5-5'),
      abortController
    });
    sendMessage({ jsonrpc: '2.0', id, result: { text } });
  } catch (error) {
    const messageText = error.code === 'ERR_MODULE_NOT_FOUND'
      ? 'Claude Agent SDK が未インストールです。host フォルダに @anthropic-ai/claude-agent-sdk を導入してください。'
      : (error.message || String(error));
    sendMessage({ jsonrpc: '2.0', id, error: { code: -32020, message: messageText } });
  } finally {
    claudeRuns.delete(id);
  }
}

function decodeOutput(chunk) {
  if (chunk.length > 2 && chunk[1] === 0) {
    return chunk.toString('utf16le');
  }
  return chunk.toString('utf8');
}

function handleMessage(message) {
  if (message?.method === 'claude/oneshot') {
    runClaudeOneshot(message);
    return;
  }
  if (message?.method === 'claude/cancel') {
    claudeRuns.get(message?.params?.id)?.abort();
    return;
  }
  if (message?.method === 'hermes/oneshot') {
    runHermesOneshot(message);
    return;
  }
  if (message?.method === 'hermes/cancel') {
    cancelHermes(message?.params?.id);
    return;
  }

  const appServer = ensureCodex();
  appServer.stdin.write(JSON.stringify(message) + '\n');
}

// Native Messaging reader (Chrome -> Node)
let buffer = Buffer.alloc(0);
process.stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  
  while (buffer.length >= 4) {
    const messageLength = buffer.readUInt32LE(0);
    if (buffer.length >= 4 + messageLength) {
      const messageBuffer = buffer.subarray(4, 4 + messageLength);
      buffer = buffer.subarray(4 + messageLength);
      
      try {
        const messageString = messageBuffer.toString('utf8');
        const message = JSON.parse(messageString);

        handleMessage(message);
      } catch (e) {
        sendMessage({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null });
      }
    } else {
      break;
    }
  }
});

process.stdin.on('end', () => {
  if (codex) codex.kill();
  cancelHermes(null);
  for (const run of claudeRuns.values()) run.abort();
  process.exit(0);
});

// Native Messaging writer (Node -> Chrome)
function sendMessage(msg) {
  const json = JSON.stringify(msg);
  const buffer = Buffer.from(json, 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(buffer.length, 0);
  process.stdout.write(lengthBuffer);
  process.stdout.write(buffer);
}
