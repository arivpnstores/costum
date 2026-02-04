#!/bin/bash

echo "🔧 Setting & Lock DNS..."

# Tulis DNS
cat <<EOF > /etc/resolv.conf
# LOCKED DNS
nameserver 1.1.1.1
nameserver 8.8.8.8
nameserver 9.9.9.9
EOF

# Lock file agar tidak diubah system
chattr +i /etc/resolv.conf

echo "✅ DNS terkunci!"
echo "Isi DNS sekarang:"
cat /etc/resolv.conf

cat <<EOF >> /etc/sysctl.conf

# SPEED TWEAK
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr
net.ipv4.tcp_fastopen=3
net.ipv4.tcp_mtu_probing=1
EOF

sysctl -p

# Lock file agar tidak diubah system
chattr +i /etc/sysctl.conf

echo "✅ SYSCTL terkunci!"
echo "Isi SYSCTL sekarang:"
cat /etc/sysctl.conf
