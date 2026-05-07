const { spawn } = require('child_process');

const child = spawn('codex.cmd', ['app-server'], { shell: true, stdio: ['pipe', 'pipe', 'inherit'] });

child.stdout.on('data', (data) => {
  console.log('STDOUT:', data.toString());
  child.kill();
});

child.stdin.write(JSON.stringify({
  jsonrpc: "2.0",
  method: "initialize",
  id: 0,
  params: { clientInfo: { name: "test", title: "test", version: "1.0.0" } }
}) + "\n");
