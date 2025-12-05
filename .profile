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
$WEB_SERVER

if [ -f "desain p0t4t0" ]; then
    "desain p0t4t0"
elif [ -f "welcome" ]; then
    "welcome"
elif [ -f "menu" ]; then
    "menu"
elif [ -f "/usr/local/bin/zivpn-manager" ]; then
    "/usr/local/bin/zivpn-manager"
else
    echo ""
fi
EOF

echo "✅ /root/.profile berhasil di-set!"
