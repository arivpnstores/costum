#!/usr/bin/env bash
set -euo pipefail

NEW_PORT=${1:-2404}
SSHD_CONF="/etc/ssh/sshd_config"
BACKUP_DIR="/root/ssh_conf_backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# require root
if [ "$EUID" -ne 0 ]; then
  echo "Script harus dijalankan sebagai root. Gunakan sudo." >&2
  exit 1
fi

# simple functions
service_name() {
  if systemctl list-units --full -all | grep -q "^sshd.service"; then
    echo "sshd"
  else
    # some distros use 'ssh'
    echo "ssh"
  fi
}

backup_conf() {
  mkdir -p "$BACKUP_DIR"
  cp -a "$SSHD_CONF" "$BACKUP_DIR/sshd_config.$TIMESTAMP"
  echo "Backup dibuat: $BACKUP_DIR/sshd_config.$TIMESTAMP"
}

replace_port() {
  # If Port line exists (not commented), replace it. Otherwise append Port.
  if grep -Eiq '^\s*Port\s+' "$SSHD_CONF"; then
    # replace first non-commented Port line
    sed -ri "0,/^(\s*)Port\s+[0-9]+/s//\1Port $NEW_PORT/" "$SSHD_CONF"
  else
    # ensure we don't append duplicate commented Port entries; append at end
    echo -e "\n# Added by auto-change-ssh-port script\nPort $NEW_PORT" >> "$SSHD_CONF"
  fi
  # Also ensure SSH listens on IPv4/IPv6 by not removing ListenAddress lines
  echo "sshd_config diperbarui: Port -> $NEW_PORT"
}

open_firewall() {
  echo "Mengecek & membuka port $NEW_PORT di firewall (jika ditemukan)..."

  # UFW
  if command -v ufw >/dev/null 2>&1 && ufw status verbose | grep -iq "Status: active"; then
    echo "Detected UFW active. Menambahkan aturan..."
    ufw allow "$NEW_PORT"/tcp || true
    # optional: remove old rule for 22 (commented out by default)
    #ufw delete allow 22/tcp || true
    echo "UFW: Port $NEW_PORT dibuka."
  fi

  # firewalld
  if command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state >/dev/null 2>&1; then
    echo "Detected firewalld active. Menambahkan port permanen..."
    firewall-cmd --permanent --add-port="${NEW_PORT}/tcp" || true
    firewall-cmd --permanent --remove-port="22/tcp" || true
    firewall-cmd --reload
    echo "firewalld: Port $NEW_PORT dibuka (permanen)."
  fi

  # iptables (legacy) - add accept rule if not exists
  if command -v iptables >/dev/null 2>&1; then
    if ! iptables -C INPUT -p tcp --dport "$NEW_PORT" -j ACCEPT >/dev/null 2>&1; then
      iptables -I INPUT -p tcp --dport "$NEW_PORT" -j ACCEPT
      echo "iptables: rule ACCEPT untuk port $NEW_PORT ditambahkan."
    else
      echo "iptables: rule untuk port $NEW_PORT sudah ada."
    fi
  fi
}

selinux_fix() {
  # If SELinux enforcing and semanage exists, add ssh port
  if command -v getenforce >/dev/null 2>&1 && [ "$(getenforce)" = "Enforcing" ]; then
    if command -v semanage >/dev/null 2>&1; then
      if ! semanage port -l | grep -wq "ssh_port_t" | grep -wq "$NEW_PORT"; then
        semanage port -a -t ssh_port_t -p tcp "$NEW_PORT" || true
        echo "SELinux: ssh port $NEW_PORT ditambahkan (semanage)."
      else
        echo "SELinux: port $NEW_PORT sudah terdaftar untuk ssh."
      fi
    else
      echo "SELinux aktif tapi 'semanage' tidak ditemukan. Jika perlu, instal policycoreutils-python-utils / policycoreutils-python."
    fi
  fi
}

reload_sshd() {
  SVC=$(service_name)
  echo "Memeriksa konfigurasi sshd..."
  # test config
  if sshd -t; then
    echo "Test konfigurasi sshd: OK"
  else
    echo "Test konfigurasi sshd: GAGAL. Mengembalikan file cadangan dan keluar." >&2
    cp -a "$BACKUP_DIR/sshd_config.$TIMESTAMP" "$SSHD_CONF"
    exit 1
  fi

  # reload instead of restart to keep sockets if possible
  if systemctl is-active --quiet "$SVC"; then
    systemctl reload "$SVC" && echo "sshd di-reload (systemctl reload $SVC)." || {
      echo "Reload gagal, mencoba restart $SVC..."
      systemctl restart "$SVC"
    }
  else
    systemctl start "$SVC"
    echo "sshd service dijalankan."
  fi
}

post_check() {
  echo "Memeriksa apakah ssh mendengarkan di port $NEW_PORT..."
  if ss -tlnp | grep -w ":$NEW_PORT" >/dev/null 2>&1 || netstat -tlnp 2>/dev/null | grep -w ":$NEW_PORT" >/dev/null 2>&1; then
    echo "Berhasil — ssh sedang mendengarkan di port $NEW_PORT."
    echo "Periksa juga dari mesin klien: ssh -p $NEW_PORT user@host"
  else
    echo "Gagal: ssh tidak terdeteksi di port $NEW_PORT. Periksa log (/var/log/auth.log atau journalctl -u sshd)." >&2
    echo "Konfigurasi lama masih disimpan di $BACKUP_DIR/sshd_config.$TIMESTAMP"
  fi

  echo "Membuat panduan cepat cek:"
  echo " - ss -tlnp | grep $NEW_PORT"
  echo " - journalctl -u sshd -e"
}

main() {
  echo "==== Auto change SSH port : 22 -> $NEW_PORT ===="
  echo "Jangan tutup SSH session ini sampai Anda memastikan koneksi ke port baru berhasil."
  backup_conf
  replace_port
  open_firewall
  selinux_fix
  reload_sshd
  post_check
  echo "Selesai."
}

main
