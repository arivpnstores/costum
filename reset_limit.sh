#!/bin/bash
INTERFACE=$(ip route | grep default | awk '{print $5}' | head -n1)
wondershaper clear $INTERFACE
vnstat --delete --force -i $INTERFACE
systemctl restart vnstat
