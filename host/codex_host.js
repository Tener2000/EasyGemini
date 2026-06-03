const { spawn } = require('child_process');
const readline = require('readline');

let codex = null;
let codexRl = null;
const hermesChildren = new Map();

function ensureCodex() {
  if (codex) return codex;

  // Spawn Codex App Server. shell:true resolves codex.cmd via PATH.
  codex = spawn('codex.cmd', ['app-server'], {
    shell: true,
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

  const command = [
    'hermes',
    '-z',
    shellQuote(prompt),
    '--provider',
    shellQuote(provider),
    '--model',
    shellQuote(model)
  ].join(' ');

  const child = spawn('wsl.exe', ['bash', '-lc', command], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  hermesChildren.set(id, child);

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

function decodeOutput(chunk) {
  if (chunk.length > 2 && chunk[1] === 0) {
    return chunk.toString('utf16le');
  }
  return chunk.toString('utf8');
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function handleMessage(message) {
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
