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
DESAIN="desain_p0t4t0"
WELCOME="welcome"
MENU="menu"
if [ -f "$DESAIN" ]; then
    cat "$DESAIN"
elif [ -f "$WELCOME" ]; then
    cat "$WELCOME"
elif [ -f "$MENU" ]; then
    cat "$MENU"
else
    echo ""
fi
EOF

echo "✅ /root/.profile berhasil di-set!"
