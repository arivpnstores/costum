#!/bin/bash
sed -i '/alias menu=\/usr\/local\/bin\/zivpn-manager/d' /root/.bashrc
sed -i '\/usr\/local\/bin\/zivpn-manager/d' /root/.bashrc
[ -f /root/.bash_profile ] && sed -i '/alias menu=\/usr\/local\/bin\/zivpn-manager/d' /root/.bash_profile
[ -f /root/.bash_profile ] && sed -i '\/usr\/local\/bin\/zivpn-manager/d' /root/.bash_profile
source /root/.bashrc
rm -rf /root/.profile
cat <<EOF > /root/.profile
if [ "$BASH" ]; then
  [ -f ~/.bashrc ] && . ~/.bashrc
fi

mesg n || true
ln -fs /usr/share/zoneinfo/Asia/Jakarta /etc/localtime
[ -n "$WEB_SERVER" ] && echo "$WEB_SERVER"
chmod +x .menu
bash .menu
EOF

cat <<'EOF' > /root/.menu
#!/bin/bash
# ===== AUTO MENU RAJA SERVER =====

if [ -z "$SSH_TTY" ]; then
  return
fi

clear
echo -e "DUAL SCRIPT VPS MANAGER"
echo -e "╔═══════════// \e[96mMENU UTAMA\e[0m //══════════╗"
echo -e "║ 1) Welcome ARISCTUNNEL V4"
echo -e "║ 2) Menu ARISCTUNNEL V4"
echo -e "║ 3) Menu ZIVPN UDP"
echo -e "║ 4) Speedtest VPS"
echo -e "║ 0) Exit Terminal"
echo -e "╚═════════════════════════════════════╝"
read -p "Pilih nomor: " pilih

case $pilih in
  1) welcome ;;
  2) menu ;;
  3) wget -q https://raw.githubusercontent.com/arivpnstores/udp-zivpn/main/zivpn-manager -O /usr/local/bin/zivpn-manager \
     && chmod +x /usr/local/bin/zivpn-manager \
     && /usr/local/bin/zivpn-manager ;;
  4) wget https://raw.githubusercontent.com/arivpnstores/v4/main/Cdy/speedtest -O /usr/bin/speedtest \
     && chmod +x /usr/bin/speedtest \
     && /usr/bin/speedtest ;;
  0) exit ;;
  *) echo "Pilihan tidak valid!" ;;
esac
EOF


echo "✅ /root/.profile berhasil di-set!"
