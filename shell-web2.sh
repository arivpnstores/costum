mkdir -p /opt/webterm/public
cd /opt/webterm

cat > server.js <<'JS'
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');
const basicAuth = require('express-basic-auth');

const PORT = 3000;
const AUTH_USER = 'root';
const AUTH_PASS = '123';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(basicAuth({
  users: { [AUTH_USER]: AUTH_PASS },
  challenge: true
}));

app.use(express.static(__dirname + '/public'));

io.on('connection', (socket) => {
  const shell = pty.spawn('/bin/bash', [], {
    name: 'xterm-color',
    cols: 120,
    rows: 30,
    cwd: '/root',
    env: process.env
  });

  shell.on('data', data => socket.emit('output', data));
  socket.on('input', input => shell.write(input));
  socket.on('disconnect', () => shell.kill());
});

server.listen(PORT, () => {
  console.log('Web Terminal running on port ' + PORT);
});
JS

cat > public/index.html <<'HTML'
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>WebTerm</title>
<style>
body{margin:0;background:#000;color:#0f0;font-family:monospace}
#term{white-space:pre-wrap;padding:10px;height:100vh;overflow:auto}
</style>
</head>
<body>
<div id="term"></div>
<input id="input" autofocus style="opacity:0;position:absolute">
<script src="/socket.io/socket.io.js"></script>
<script>
const term = document.getElementById('term');
const input = document.getElementById('input');
const socket = io();

socket.on('output', data => {
  term.textContent += data;
  term.scrollTop = term.scrollHeight;
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') socket.emit('input', '\n');
  else if (e.key === 'Backspace') socket.emit('input', '\x7f');
  else if (e.key.length === 1) socket.emit('input', e.key);
});
</script>
</body>
</html>
HTML

cat > package.json <<'JSON'
{
  "name": "webterm",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "node-pty": "^1.0.0",
    "express-basic-auth": "^1.2.1"
  }
}
JSON

npm install

cat > /etc/systemd/system/webterm.service <<'SH'
[Unit]
Description=Web Terminal Root Custom Login
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/webterm
ExecStart=/usr/bin/node /opt/webterm/server.js
Restart=always
RestartSec=3
User=root
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SH

systemctl daemon-reload
systemctl enable webterm
systemctl start webterm
systemctl status webterm
MYIP=$(curl -s --max-time 5 ipv4.icanhazip.com)
echo -e "WEB AKSES CMD : https://$MYIP:3000"
