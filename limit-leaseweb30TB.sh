#!/bin/bash

echo "=== INSTALL AUTO LIMIT 900GB ==="

# Install dependency
apt update -y
apt install -y vnstat wondershaper bc cron curl

systemctl enable vnstat
systemctl restart vnstat

# Detect interface
INTERFACE=$(ip route | grep default | awk '{print $5}' | head -n1)

echo "Interface: $INTERFACE"

# Script limit
cat > /usr/local/bin/limit_traffic.sh << 'EOF'
#!/bin/bash
INTERFACE=$(ip route | grep default | awk '{print $5}' | head -n1)

LIMIT_DOWNLOAD=100000
LIMIT_UPLOAD=100000
THRESHOLD=900
MAX_DAILY=1000

USAGE=$(vnstat -i $INTERFACE --oneline b | cut -d\; -f10)
USAGE_GB=$(echo "$USAGE / 1024 / 1024 / 1024" | bc)

if (( $(echo "$USAGE_GB >= $THRESHOLD" | bc -l) )); then
    wondershaper $INTERFACE $LIMIT_DOWNLOAD $LIMIT_UPLOAD
else
    wondershaper clear $INTERFACE
fi

if (( $(echo "$USAGE_GB >= $MAX_DAILY" | bc -l) )); then
    wondershaper $INTERFACE 1000 1000
fi
EOF

chmod +x /usr/local/bin/limit_traffic.sh

# Script reset
cat > /usr/local/bin/reset_limit.sh << 'EOF'
#!/bin/bash
INTERFACE=$(ip route | grep default | awk '{print $5}' | head -n1)

wondershaper clear $INTERFACE
vnstat --delete --force -i $INTERFACE
systemctl restart vnstat
EOF

chmod +x /usr/local/bin/reset_limit.sh

# Pasang cron
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/limit_traffic.sh") | crontab -
(crontab -l 2>/dev/null; echo "0 0 * * * /usr/local/bin/reset_limit.sh") | crontab -

echo "=== DONE ==="
echo "Auto limit aktif:"
echo "- >900GB → limit speed"
echo "- >1TB → throttle keras"
echo "- Reset tiap jam 00:00"
