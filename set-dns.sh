#!/bin/bash

echo "🔧 Setting DNS & Speed Tweak..."

# Unlock dulu kalau sudah pernah dikunci
chattr -i /etc/resolv.conf 2>/dev/null
chattr -i /etc/sysctl.conf 2>/dev/null

# Tulis DNS terbaik (Fast + Secure)
cat <<EOF > /etc/resolv.conf
# LOCKED DNS - OPTIMAL
nameserver 1.1.1.1
nameserver 1.0.0.1
nameserver 8.8.8.8
nameserver 8.8.4.4
nameserver 9.9.9.9
EOF

echo "✅ DNS di-set!"
cat /etc/resolv.conf

# Speed & TCP Optimization
cat <<EOF >> /etc/sysctl.conf

# SPEED TWEAK OPTIMAL
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr
net.ipv4.tcp_fastopen=3
net.ipv4.tcp_mtu_probing=1
net.ipv4.tcp_window_scaling=1
net.ipv4.tcp_timestamps=1
net.ipv4.tcp_sack=1
EOF

sysctl -p

echo "✅ SYSCTL diterapkan!"
cat /etc/sysctl.conf

# Lock biar tidak diubah sistem
chattr +i /etc/resolv.conf
chattr +i /etc/sysctl.conf

echo "🔒 DNS & SYSCTL berhasil dikunci!"
