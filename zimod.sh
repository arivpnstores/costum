#!/bin/bash
rm -rf /root/.profile

cat <<EOF > /root/.profile
if [ "$BASH" ]; then
  [ -f ~/.bashrc ] && . ~/.bashrc
fi

mesg n || true
ln -fs /usr/share/zoneinfo/Asia/Jakarta /etc/localtime
$WEB_SERVER
EOF

if [ -f "/usr/local/bin/zivpn-manager" ]; then

    echo ""
    echo "┌──────────────────────────────────────┐"
    echo "│   PILIH MODE MENU VPS                │"
    echo "│--------------------------------------│"
    echo "│   1. Dual SC (Mode gabungan)         │"
    echo "│   2. ZIVPN Only (Menu standar)       │"
    echo "└──────────────────────────────────────┘"
    read -p "Pilih mode (1/2) : " mode

    if [ "$mode" = "1" ]; then
        bash <(curl -sSL https://raw.githubusercontent.com/arivpnstores/costum/main/.bashrc)
        echo "Mode: Dual SC aktif"

    elif [ "$mode" = "2" ]; then
        PROFILE_FILE="/root/.bashrc"
        [ -f "/root/.bash_profile" ] && PROFILE_FILE="/root/.bash_profile"

        ALIAS_CMD="alias menu='/usr/local/bin/zivpn-manager'"
        AUTORUN_CMD="/usr/local/bin/zivpn-manager"

        grep -qF "$ALIAS_CMD" "$PROFILE_FILE" || echo "$ALIAS_CMD" >> "$PROFILE_FILE"
        grep -qF "$AUTORUN_CMD" "$PROFILE_FILE" || echo "$AUTORUN_CMD" >> "$PROFILE_FILE"

        echo "The 'menu' command is now available."
        echo "The management menu will now open automatically on login."
        echo "Mode: ZIVPN Only aktif"

    else
        echo "Pilihan tidak valid, menu default tidak diaktifkan."
    fi

    echo "────────────────────────────────────────────────────"
    echo "Advanced management setup complete."
    echo "────────────────────────────────────────────────────"

else
    echo "File /usr/local/bin/zivpn-manager tidak ditemukan."
    echo "Menu tidak dapat diaktifkan otomatis."
fi
