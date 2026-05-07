const ws = new WebSocket('ws://127.0.0.1:4500', { origin: 'chrome-extension://abcdefghijklmnop' });

ws.onopen = () => {
  console.log('connected');
  ws.close();
};
ws.onerror = (err) => {
  console.log('error:', err.message || err);
};
