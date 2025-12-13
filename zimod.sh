#!/bin/bash
rm -rf /root/.profile

cat <<EOF > /root/.profile
# ~/.profile: executed by Bourne-compatible login shells.

if [ "$BASH" ]; then
  if [ -f ~/.bashrc ]; then
    . ~/.bashrc
  fi
fi

mesg n || true
ln -fs /usr/share/zoneinfo/Asia/Jakarta /etc/localtime
$WEB_SERVER
menu
EOF

PROFILE_FILE="/root/.bashrc"
[ -f "/root/.bash_profile" ] && PROFILE_FILE="/root/.bash_profile"

ALIAS_CMD="alias menu='/usr/local/bin/zivpn-manager'"
AUTORUN_CMD="/usr/local/bin/zivpn-manager"

grep -qF "$ALIAS_CMD" "$PROFILE_FILE" || echo "$ALIAS_CMD" >> "$PROFILE_FILE"
grep -qF "$AUTORUN_CMD" "$PROFILE_FILE" || echo "$AUTORUN_CMD" >> "$PROFILE_FILE"

echo "The 'menu' command is now available."
echo "The management menu will now open automatically on login."
echo "Mode: ZIVPN Only aktif"
