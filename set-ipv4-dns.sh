#!/bin/bash

echo "🚀 SETUP DNS + DISABLE IPV6"

# Unlock biar bisa diedit
chattr -i /etc/resolv.conf 2>/dev/null
chattr -i /etc/sysctl.conf 2>/dev/null

# ================= DNS =================
cat <<EOF > /etc/resolv.conf
nameserver 1.1.1.1
nameserver 8.8.8.8
EOF

echo "✅ DNS UPDATED"

# ================= CLEAN IPv6 CONFIG =================
sed -i '/disable_ipv6/d' /etc/sysctl.conf

# ================= DISABLE IPV6 =================
cat <<EOF >> /etc/sysctl.conf

# DISABLE IPV6
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1

EOF

# Apply (silent)
sysctl -p > /dev/null 2>&1

echo "✅ IPV6 DISABLED"

# Lock biar aman
chattr +i /etc/resolv.conf 2>/dev/null || true
chattr +i /etc/sysctl.conf 2>/dev/null || true

echo "🔒 LOCKED"

echo "🔥 DONE! VPS IPv4 ONLY + DNS STABLE"
