#!/bin/bash

echo "🚀 RESET + SET DNS + DISABLE IPV6"

# ================= UNLOCK =================
chattr -i /etc/resolv.conf 2>/dev/null
chattr -i /etc/sysctl.conf 2>/dev/null

# ================= RESET OLD CONFIG =================
sed -i '/disable_ipv6/d' /etc/sysctl.conf
sed -i '/tcp_congestion_control/d' /etc/sysctl.conf
sed -i '/default_qdisc/d' /etc/sysctl.conf

rm -f /etc/resolv.conf

# ================= DNS =================
cat <<EOF > /etc/resolv.conf
nameserver 1.1.1.1
nameserver 8.8.8.8
nameserver 9.9.9.9
EOF

echo "✅ DNS UPDATED"

# ================= DISABLE IPV6 =================
cat <<EOF >> /etc/sysctl.conf

# DISABLE IPV6
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1

EOF

# ================= APPLY =================
sysctl -p > /dev/null 2>&1

echo "✅ IPV6 DISABLED"

# ================= LOCK =================
chattr +i /etc/resolv.conf 2>/dev/null || true
chattr +i /etc/sysctl.conf 2>/dev/null || true

echo "🔒 LOCKED"

echo "🔥 DONE! CLEAN CONFIG + FAST DNS"
