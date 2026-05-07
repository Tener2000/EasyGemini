import socket

req = """GET / HTTP/1.1
Host: 127.0.0.1:4500
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Origin: chrome-extension://abcdefghijklmnop

"""

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.connect(("127.0.0.1", 4500))
s.sendall(req.encode('utf-8'))
resp = s.recv(4096)
print(resp.decode('utf-8'))
s.close()
