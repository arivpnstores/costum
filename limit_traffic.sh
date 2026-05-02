#!/bin/bash

# CONFIG
INTERFACE=$(ip route | grep default | awk '{print $5}' | head -n1)
LIMIT_DOWNLOAD=10000   # kbps (10mbit setelah limit)
LIMIT_UPLOAD=5000      # kbps
THRESHOLD=900          # GB trigger limit
MAX_DAILY=1000         # GB max per hari

# Ambil pemakaian hari ini (GB)
USAGE=$(vnstat -i $INTERFACE --oneline b | cut -d\; -f10)
USAGE_GB=$(echo "$USAGE / 1024 / 1024 / 1024" | bc)

echo "Usage hari ini: $USAGE_GB GB"

# Logic
if (( $(echo "$USAGE_GB >= $THRESHOLD" | bc -l) )); then
    echo "Limit aktif karena > ${THRESHOLD}GB"
    wondershaper $INTERFACE $LIMIT_DOWNLOAD $LIMIT_UPLOAD
else
    echo "Normal speed"
    wondershaper clear $INTERFACE
fi

# Safety kalau tembus 1TB
if (( $(echo "$USAGE_GB >= $MAX_DAILY" | bc -l) )); then
    echo "MAX 1TB tercapai - throttle berat"
    wondershaper $INTERFACE 1000 1000
fi
