const { spawn } = require('child_process');
const readline = require('readline');

// Spawn Codex App Server
// using shell: true to resolve 'codex' command via PATH
const codex = spawn('codex.cmd', ['app-server'], {
  shell: true,
  stdio: ['pipe', 'pipe', 'inherit']
});

codex.on('error', (err) => {
  sendMessage({ jsonrpc: '2.0', error: { code: -32000, message: 'Failed to start codex: ' + err.message }, id: null });
});

codex.on('exit', (code) => {
  process.exit(code || 0);
});

// Read line by line from Codex and send to Chrome
const rl = readline.createInterface({
  input: codex.stdout,
  terminal: false
});

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    sendMessage(msg);
  } catch (e) {
    // Ignore non-JSON lines or log them to stderr
  }
});

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
        
        // Forward to Codex
        codex.stdin.write(JSON.stringify(message) + '\n');
      } catch (e) {
        sendMessage({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null });
      }
    } else {
      break;
    }
  }
});

process.stdin.on('end', () => {
  codex.kill();
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
