#!/bin/bash

echo "🚀 OPTIMASI VPS MAX PERFORMANCE"

# Unlock dulu
chattr -i /etc/resolv.conf 2>/dev/null
chattr -i /etc/sysctl.conf 2>/dev/null

# DNS optimal (fast & stabil)
cat <<EOF > /etc/resolv.conf
nameserver 1.1.1.1
nameserver 8.8.8.8
EOF

echo "✅ DNS OK"

# SYSCTL SUPER OPTIMIZED
cat <<EOF >> /etc/sysctl.conf

# BBR
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr

# TCP OPTIMIZATION
net.core.rmem_max=67108864
net.core.wmem_max=67108864
net.ipv4.tcp_rmem=4096 87380 67108864
net.ipv4.tcp_wmem=4096 65536 67108864

net.ipv4.tcp_fastopen=3
net.ipv4.tcp_mtu_probing=1
net.ipv4.tcp_window_scaling=1
net.ipv4.tcp_sack=1
net.ipv4.tcp_timestamps=1

# CONNECTION HANDLING
net.core.netdev_max_backlog=250000
net.core.somaxconn=4096
net.ipv4.tcp_max_syn_backlog=8192
net.ipv4.tcp_syncookies=1

# PORT & TIME_WAIT
net.ipv4.ip_local_port_range=1024 65535
net.ipv4.tcp_fin_timeout=15
net.ipv4.tcp_tw_reuse=1

EOF

sysctl -p

echo "✅ SYSCTL SUPER OPTIMIZED"

# Lock biar tidak diubah sistem
chattr +i /etc/resolv.conf
chattr +i /etc/sysctl.conf

echo "🔥 VPS SIAP TEMPUR!"
