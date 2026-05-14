#!/bin/bash

echo "🚀 NETWORK OPTIMIZATION"

# Unlock
chattr -i /etc/resolv.conf 2>/dev/null

# ================= DNS =================
cat <<EOF > /etc/resolv.conf
nameserver 1.1.1.1
nameserver 1.0.0.1
options edns0
options single-request-reopen
timeout:2
attempts:3
EOF

# ================= SYSCTL =================
cat <<EOF > /etc/sysctl.d/99-network.conf

# BBR
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr

# Faster TCP
net.ipv4.tcp_fastopen=3
net.ipv4.tcp_slow_start_after_idle=0
net.ipv4.tcp_low_latency=1

# Queue
net.core.somaxconn=65535
net.ipv4.tcp_max_syn_backlog=8192

# Port Range
net.ipv4.ip_local_port_range=1024 65535

# Reuse
net.ipv4.tcp_tw_reuse=1
net.ipv4.tcp_fin_timeout=15

EOF

sysctl --system > /dev/null 2>&1

echo "✅ DONE"
