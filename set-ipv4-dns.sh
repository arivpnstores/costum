#!/bin/bash

echo "🚀 SETUP DNS + DISABLE IPV6"

# ================= UNLOCK =================
chattr -i /etc/resolv.conf 2>/dev/null
chattr -i /etc/sysctl.conf 2>/dev/null

# ================= DISABLE SYSTEMD RESOLVED =================
systemctl stop systemd-resolved 2>/dev/null
systemctl disable systemd-resolved 2>/dev/null

rm -f /etc/resolv.conf

# ================= DNS =================
cat <<EOF > /etc/resolv.conf
nameserver 1.1.1.1
nameserver 8.8.8.8
options timeout:1
options attempts:2
EOF

echo "✅ DNS UPDATED"

# ================= DISABLE IPV6 =================
cat <<EOF > /etc/sysctl.d/99-disable-ipv6.conf
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1
EOF

# Apply sysctl
sysctl --system > /dev/null 2>&1

echo "✅ IPV6 DISABLED"

# ================= LOCK DNS =================
chattr +i /etc/resolv.conf 2>/dev/null || true

echo "🔒 DNS LOCKED"

echo "🔥 DONE! VPS IPv4 ONLY + STABLE DNS"
