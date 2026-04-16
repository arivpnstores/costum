#!/bin/bash

# ===== CLEAN OLD CONFIG =====
sed -i '/alias menu=\/usr\/local\/bin\/zivpn-manager/d' /root/.bashrc
sed -i '\|/usr/local/bin/zivpn-manager|d' /root/.bashrc

[ -f /root/.bash_profile ] && {
  sed -i '/alias menu=\/usr\/local\/bin\/zivpn-manager/d' /root/.bash_profile
  sed -i '\|/usr/local/bin/zivpn-manager|d' /root/.bash_profile
}

source /root/.bashrc

# ===== SET .PROFILE =====
cat > /root/.profile <<'EOF'
if [ "$BASH" ]; then
  [ -f ~/.bashrc ] && . ~/.bashrc
fi

mesg n || true
ln -fs /usr/share/zoneinfo/Asia/Jakarta /etc/localtime

[ -n "$WEB_SERVER" ] && echo "$WEB_SERVER"

bash ~/.menu
EOF

# ===== CREATE MENU =====
cat > /root/.menu <<'EOF'
#!/bin/bash

# ===== VPS MANAGER MENU =====

if [[ -z "$PS1" ]]; then
  return
fi

clear

echo -e "\e[1;36m=====================================\e[0m"
echo -e "\e[1;32m      🚀 VPS MANAGER PANEL MENU      \e[0m"
echo -e "\e[1;36m=====================================\e[0m"

echo -e "\e[1;33m[1]\e[0m SCRIPT TUNNEL MENU"
echo -e "\e[1;33m[2]\e[0m ZIVPN UDP MANAGER"
echo -e "\e[1;33m[3]\e[0m SPEEDTEST VPS"
echo -e "\e[1;33m[0]\e[0m EXIT"

echo -e "\e[1;36m=====================================\e[0m"

read -rp "👉 Pilih menu: " pilih

case "$pilih" in
  1)
    menu
    ;;
  2)
    wget -q https://raw.githubusercontent.com/arivpnstores/udp-zivpn/main/zivpn-manager -O /usr/local/bin/zivpn-manager \
      && chmod +x /usr/local/bin/zivpn-manager \
      && /usr/local/bin/zivpn-manager
    ;;
  3)
    wget -q https://raw.githubusercontent.com/arivpnstores/v4/main/Cdy/speedtest -O /usr/bin/speedtest \
      && chmod +x /usr/bin/speedtest \
      && speedtest
    ;;
  0)
    echo -e "\e[1;31mKeluar...\e[0m"
    exit 0
    ;;
  *)
    echo -e "\e[1;31m❌ Pilihan tidak valid!\e[0m"
    ;;
esac
EOF

# ===== PERMISSION =====
chmod +x /root/.menu

# ===== FINAL =====
echo -e "\n\e[1;32m=====================================\e[0m"
echo -e "\e[1;32m   ✅ MENU BERHASIL DIINSTALL  \e[0m"
echo -e "\e[1;32m=====================================\e[0m"

source /root/.bashrc
source /root/.profile
