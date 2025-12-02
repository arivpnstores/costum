#!/bin/bash
apt update -y
apt install figlet -y
apt install lolcat -y
apt install ruby -y

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
.menu
EOF

cat <<EOF > /root/.menu
# ===== AUTO MENU RAJA SERVER =====
if [ -z "$SSH_TTY" ]; then
  return
fi

clear
figlet "VPS MANAGER" | lolcat
echo -e "╔═══════════// \e[96mMENU UTAMA\e[0m //══════════╗"
echo -e "║ 1) Menu Tunneling"
echo -e "║ 2) Menu ZIVPN UDP"
echo -e "║ 3) Speedtest VPS"
echo -e "║ 4) Welcome ARISCTUNNEL V4"
echo -e "║ 5) Welcome POTATO"
echo -e "║ 0) Exit Terminal"
echo -e "╚═════════════════════════════════════╝"
read -p "Pilih nomor: " pilih

case $pilih in
  1) menu ;;
  2) apt update -y && apt install screen ufw ruby lolcat curl wget python3-pip -y \
     && wget -q https://raw.githubusercontent.com/arivpnstores/udp-zivpn/main/install.sh -O /usr/local/bin/zivpn-manager \
     && chmod +x /usr/local/bin/zivpn-manager \
     && /usr/local/bin/zivpn-manager ;;
  3) wget https://raw.githubusercontent.com/arivpnstores/v4/main/Cdy/speedtest -O /usr/bin/speedtest \
     && chmod +x /usr/bin/speedtest \
     && /usr/bin/speedtest ;;
  4) welcome ;;
  5) desain p0t4t0 ;;
  0) exit ;;
  *) echo "Pilihan tidak valid!" ;;
esac
EOF


echo "✅ /root/.profile berhasil di-set!"
