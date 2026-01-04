#!/bin/bash

echo "🔧 Mengatur DNS VPS..."

cat <<EOF > /etc/resolv.conf
# DNS Manual Setup
# Google DNS
nameserver 8.8.8.8
# Cloudflare DNS
nameserver 1.1.1.1
# Quad9 DNS (Anti-block)
nameserver 9.9.9.9
EOF

echo "✅ DNS berhasil diatur:"
cat /etc/resolv.conf
