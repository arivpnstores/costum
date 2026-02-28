apt install shellinabox -y
MYIP=$(curl -s --max-time 5 ipv4.icanhazip.com)
echo -e "WEB AKSES CMD : https://$MYIP:4200"
