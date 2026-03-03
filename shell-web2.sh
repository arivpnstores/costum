apt update -y
apt install -y curl ca-certificates gnupg

# Tambahkan repo Node LTS (v20 stabil)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

apt install -y nodejs

mkdir -p /opt/webterm/public
cd /opt/webterm

cat > server.js <<'JS'
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');
const basicAuth = require('express-basic-auth');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const AUTH_USER = process.env.AUTH_USER || 'root';
const AUTH_PASS = process.env.AUTH_PASS || '123';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { transports: ['websocket'] });

app.use(basicAuth({
  users: { [AUTH_USER]: AUTH_PASS },
  challenge: true
}));

// serve xterm from npm (node_modules)
app.use('/xterm', express.static(path.join(__dirname, 'node_modules', 'xterm', 'lib')));
app.use('/xterm-addon-fit', express.static(path.join(__dirname, 'node_modules', 'xterm-addon-fit', 'lib')));

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  const shell = pty.spawn('/bin/bash', [], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: '/root',
    env: {
      ...process.env,
      TERM: 'xterm-256color'
    }
  });

  // forward pty -> browser
  shell.on('data', (data) => socket.emit('output', data));

  // browser -> pty
  socket.on('input', (data) => {
    if (typeof data === 'string') shell.write(data);
  });

  // resize from browser
  socket.on('resize', (size) => {
    try {
      const cols = Number(size?.cols);
      const rows = Number(size?.rows);
      if (Number.isFinite(cols) && Number.isFinite(rows) && cols > 0 && rows > 0) {
        shell.resize(cols, rows);
      }
    } catch (_) {}
  });

  socket.on('disconnect', () => {
    try { shell.kill(); } catch (_) {}
  });
});

server.listen(PORT, () => {
  console.log(`WebTerm running on port ${PORT}`);
});
JS

cat > public/index.html <<'HTML'
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WebTerm</title>

  <link rel="stylesheet" href="/xterm/xterm.css">
  <style>
    html, body { height: 100%; margin: 0; background: #0b0f14; }
    #topbar{
      height: 44px;
      display:flex; align-items:center; justify-content:space-between;
      padding: 0 12px;
      color:#cbd5e1;
      font: 14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      border-bottom: 1px solid rgba(148,163,184,.15);
      background: rgba(2,6,23,.5);
      backdrop-filter: blur(8px);
    }
    #badge{
      padding: 4px 10px;
      border: 1px solid rgba(148,163,184,.2);
      border-radius: 999px;
      color:#94a3b8;
    }
    #terminal { height: calc(100% - 44px); width: 100%; }
    .xterm-viewport::-webkit-scrollbar { width: 10px; }
    .xterm-viewport::-webkit-scrollbar-thumb { background: rgba(148,163,184,.25); border-radius: 10px; }
  </style>
</head>
<body>
  <div id="topbar">
    <div>WebTerm</div>
    <div id="badge">root shell</div>
  </div>
  <div id="terminal"></div>

  <script src="/socket.io/socket.io.js"></script>
  <script src="/xterm/xterm.js"></script>
  <script src="/xterm-addon-fit/xterm-addon-fit.js"></script>

  <script>
    const socket = io({ transports: ['websocket'] });

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      scrollback: 5000,
      convertEol: true
    });

    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(document.getElementById('terminal'));

    function doFit() {
      fitAddon.fit();
      socket.emit('resize', { cols: term.cols, rows: term.rows });
    }

    // initial fit
    doFit();

    // resize on window change
    window.addEventListener('resize', () => doFit());

    // server output -> terminal
    socket.on('output', (data) => term.write(data));

    // terminal input -> server (ini yang bikin Ctrl+C & arrow normal)
    term.onData((data) => {
      socket.emit('input', data);
    });

    // optional: notify if disconnected
    socket.on('disconnect', () => {
      term.write('\r\n\x1b[31m[disconnected]\x1b[0m\r\n');
    });
  </script>
</body>
</html>
HTML

cat > package.json <<'JSON'
{
  "name": "webterm",
  "version": "1.1.0",
  "main": "server.js",
  "private": true,
  "dependencies": {
    "express": "^4.18.2",
    "express-basic-auth": "^1.2.1",
    "node-pty": "^1.0.0",
    "socket.io": "^4.7.2",
    "xterm": "^5.5.0",
    "xterm-addon-fit": "^0.8.0"
  }
}
JSON

npm install --omit=dev

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
# GANTI USER/PASS DI SINI (WAJIB!)
Environment=AUTH_USER=root
Environment=AUTH_PASS=123
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
SH

systemctl daemon-reload
systemctl enable --now webterm
systemctl status webterm --no-pager -l

MYIP=$(curl -s --max-time 5 ipv4.icanhazip.com)
echo -e "\nWEB AKSES CMD : http://$MYIP:3000\nLOGIN BASIC AUTH : root / 123\n"
