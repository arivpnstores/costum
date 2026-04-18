# costum
DNS SET + IPV4 ONLY LANGSUNG  
```bash
rm -f /etc/resolv.conf
echo "nameserver 1.1.1.1" > /etc/resolv.conf
echo "nameserver 8.8.8.8" >> /etc/resolv.conf
echo "net.ipv6.conf.all.disable_ipv6 = 1" >> /etc/sysctl.conf
echo "net.ipv6.conf.default.disable_ipv6 = 1" >> /etc/sysctl.conf
sysctl -p
```
LOCKING DNS + IPV4 ONLY
```bash
bash <(curl -sSL https://raw.githubusercontent.com/arivpnstores/costum/main/set-ipv4-dns.sh)
```
welcome zivpn
```bash
bash <(curl -sSL https://raw.githubusercontent.com/arivpnstores/costum/main/zimod.sh)
```
welcome potato
```bash
bash <(curl -sSL https://raw.githubusercontent.com/arivpnstores/costum/main/.profile)
```
dual sc
```bash
bash <(curl -sSL https://raw.githubusercontent.com/arivpnstores/costum/main/.bashrc)
```
app.js vpn no credit title
```bash
wget -O /root/BotVPN/app.js https://raw.githubusercontent.com/arivpnstores/costum/main/app.js && pm2 restart all
```
app.js zivpn no credit title
```bash
wget -O /root/BotZiVPN/app.js https://raw.githubusercontent.com/arivpnstores/costum/main/app2.js && pm2 restart all
```
UBAH PORT LOGIN VPS
```bash
bash <(curl -sSL https://raw.githubusercontent.com/arivpnstores/costum/main/port2404.sh)
```
WEB TERMINAL DEFAULT USER PW VPS
```bash
bash <(curl -sSL https://raw.githubusercontent.com/arivpnstores/costum/main/shell-web.sh)
```
