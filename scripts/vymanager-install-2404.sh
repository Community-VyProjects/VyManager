#!/bin/bash
################################################################################
# Script Name  : vymanager-install-2404.sh
# Description  : Interactive installer for vymanager on Ubuntu 24.04 LTS.
# Author       : John Harrison
# Created      : 2025-12-15
# Version      : 1.0.0
# License      : MIT
#
# Project      : ExileSolutionsCloud
# Repository   : https://github.com/jharrison712/exilesolutionscloud
#
# Changelog:
#   [2025-11-11] v1.0.0 — First stable release (full rewrite).
################################################################################
set -euo pipefail

################################# COLORS #######################################
if [[ -t 1 ]]; then
  BOLD="\e[1m"; RED="\e[31m"; GREEN="\e[32m"; YELLOW="\e[33m"; BLUE="\e[34m"; RESET="\e[0m"
else
  BOLD=""; RED=""; GREEN=""; YELLOW=""; BLUE=""; RESET=""
fi

log_step()    { echo -e "${BLUE}${BOLD}==>${RESET} ${BLUE}$*${RESET}"; }
log_info()    { echo -e "${GREEN}[*]${RESET} $*"; }
log_warn()    { echo -e "${YELLOW}[!]${RESET} $*"; }
log_error()   { echo -e "${RED}[x]${RESET} $*" >&2; }
log_success() { echo -e "${GREEN}${BOLD}✔${RESET} $*"; }

require_root() {
  [[ $EUID -eq 0 ]] || { log_error "Run this script as root (sudo)."; exit 1; }
}

gen_secret() {
  openssl rand -base64 48 | tr -d '\n'
}

detect_ip() {
  hostname -I 2>/dev/null | awk '{print $1}'
}

require_root

###############################################################################
# GLOBAL VARIABLES
###############################################################################
SERVER_IP="$(detect_ip)"
INSTALL_DIR="/opt/vymanager"
SERVICE_USER="vymanager"
SERVICE_HOME="/var/lib/vymanager"

DB_NAME="vymanager_auth"
DB_USER="vymanager"
DB_PASS="$(gen_secret)"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"

BETTER_AUTH_SECRET="$(gen_secret)"
VYOS_API_KEY="$(gen_secret)"

###############################################################################
# BANNER
###############################################################################
echo
echo "###############################################################################"
echo "# VyManager Production Installer (NO Docker)"
echo "#"
echo "# Frontend : http://${SERVER_IP}:3000"
echo "# Backend  : http://${SERVER_IP}:8000"
echo "# Docs     : http://${SERVER_IP}:8000/docs"
echo "###############################################################################"
echo

###############################################################################
# VyOS SETUP
###############################################################################
log_step "VyOS REST API key generated"

echo
echo "==================== RUN ON VYOS ROUTER ===================="
echo "conf"
echo "set service https api keys id fastapi key '${VYOS_API_KEY}'"
echo "set service https api rest"
echo "# optional:"
echo "# set service https api graphql"
echo "commit"
echo "save"
echo "exit"
echo "============================================================"
echo
read -r -p "Press ENTER once the VyOS commands are applied..."

###############################################################################
# VyOS CONFIG INPUT
###############################################################################
log_step "VyOS connection configuration"

read -r -p "VyOS hostname/IP [192.168.1.1]: " VYOS_HOSTNAME
VYOS_HOSTNAME="${VYOS_HOSTNAME:-192.168.1.1}"

read -r -p "VyOS device label [vyos15]: " VYOS_NAME
VYOS_NAME="${VYOS_NAME:-vyos15}"

read -r -p "VyOS HTTPS port [443]: " VYOS_PORT
VYOS_PORT="${VYOS_PORT:-443}"

read -r -p "Verify VyOS SSL certificate? [y/N]: " _ssl
[[ "${_ssl,,}" == "y" ]] && VYOS_VERIFY_SSL="true" || VYOS_VERIFY_SSL="false"

###############################################################################
# OS DEPENDENCIES
###############################################################################
log_step "Installing OS dependencies"
apt update -y
apt install -y \
  git curl ca-certificates gnupg build-essential \
  python3 python3-venv python3-pip \
  postgresql postgresql-client

###############################################################################
# NODE.JS 24
###############################################################################
log_step "Installing Node.js 24.x"
apt remove -y nodejs npm || true
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs
log_success "Node $(node -v) | npm $(npm -v)"

###############################################################################
# SERVICE USER
###############################################################################
log_step "Creating service user"
if ! id "${SERVICE_USER}" &>/dev/null; then
  useradd -r -m -d "${SERVICE_HOME}" -s /usr/sbin/nologin "${SERVICE_USER}"
fi

###############################################################################
# POSTGRESQL (PRISMA-SAFE FIX)
###############################################################################
log_step "Configuring PostgreSQL (deterministic + Prisma-safe)"
systemctl enable --now postgresql

PG_HBA="/etc/postgresql/$(ls /etc/postgresql)/main/pg_hba.conf"
sed -i 's/peer/scram-sha-256/g' "$PG_HBA"
systemctl reload postgresql

sudo -u postgres psql <<SQL
DROP DATABASE IF EXISTS ${DB_NAME};
DROP ROLE IF EXISTS ${DB_USER};
CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

psql "${DATABASE_URL}" -c '\q' || {
  log_error "PostgreSQL authentication failed"
  exit 1
}

log_success "PostgreSQL ready"

###############################################################################
# CLONE VYMANAGER
###############################################################################
log_step "Cloning VyManager (beta)"
rm -rf "${INSTALL_DIR}"
git clone --branch beta https://github.com/Community-VyProjects/VyManager.git "${INSTALL_DIR}"
chown -R "${SERVICE_USER}:${SERVICE_USER}" "${INSTALL_DIR}"

###############################################################################
# BACKEND SETUP
###############################################################################
log_step "Setting up backend"
cd "${INSTALL_DIR}/backend"

sudo -u "${SERVICE_USER}" python3 -m venv venv
sudo -u "${SERVICE_USER}" venv/bin/pip install --upgrade pip
sudo -u "${SERVICE_USER}" venv/bin/pip install -r requirements.txt

sudo -u "${SERVICE_USER}" cp .env.example .env
sudo -u "${SERVICE_USER}" sed -i \
  -e "s|^VYOS_NAME=.*|VYOS_NAME=${VYOS_NAME}|" \
  -e "s|^VYOS_HOSTNAME=.*|VYOS_HOSTNAME=${VYOS_HOSTNAME}|" \
  -e "s|^VYOS_APIKEY=.*|VYOS_APIKEY=${VYOS_API_KEY}|" \
  -e "s|^VYOS_VERSION=.*|VYOS_VERSION=1.5|" \
  -e "s|^VYOS_PROTOCOL=.*|VYOS_PROTOCOL=https|" \
  -e "s|^VYOS_PORT=.*|VYOS_PORT=${VYOS_PORT}|" \
  -e "s|^VYOS_VERIFY_SSL=.*|VYOS_VERIFY_SSL=${VYOS_VERIFY_SSL}|" \
  .env

###############################################################################
# FRONTEND SETUP
###############################################################################
log_step "Setting up frontend"
cd "${INSTALL_DIR}/frontend"

sudo -u "${SERVICE_USER}" env HOME="${SERVICE_HOME}" npm install
sudo -u "${SERVICE_USER}" env HOME="${SERVICE_HOME}" npm run build

sudo -u "${SERVICE_USER}" cat > .env <<EOF
NODE_ENV=production
VYMANAGER_ENV=production
BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
DATABASE_URL=${DATABASE_URL}
TRUSTED_ORIGINS=http://${SERVER_IP}:3000,http://localhost:3000
EOF

###############################################################################
# PRISMA MIGRATIONS
###############################################################################
log_step "Running Prisma migrations"
sudo -u "${SERVICE_USER}" npx prisma migrate deploy
sudo -u "${SERVICE_USER}" npx prisma generate

###############################################################################
# SYSTEMD SERVICES
###############################################################################
log_step "Creating systemd services"

cat >/etc/systemd/system/vymanager-backend.service <<EOF
[Unit]
Description=VyManager Backend
After=network.target postgresql.service
Wants=postgresql.service

[Service]
User=${SERVICE_USER}
WorkingDirectory=${INSTALL_DIR}/backend
Environment=PATH=${INSTALL_DIR}/backend/venv/bin
ExecStart=${INSTALL_DIR}/backend/venv/bin/python -m uvicorn app:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

cat >/etc/systemd/system/vymanager-frontend.service <<EOF
[Unit]
Description=VyManager Frontend
After=network.target vymanager-backend.service
Requires=vymanager-backend.service

[Service]
User=${SERVICE_USER}
WorkingDirectory=${INSTALL_DIR}/frontend
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
ExecStart=/usr/bin/npm run start
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now vymanager-backend vymanager-frontend

###############################################################################
# FINAL OUTPUT
###############################################################################
echo
log_success "VyManager installation completed successfully"
echo
echo "====================== SAVE THESE ======================"
echo "Database Name : ${DB_NAME}"
echo "Database User : ${DB_USER}"
echo "Database Pass : ${DB_PASS}"
echo
echo "VyOS API Key  : ${VYOS_API_KEY}"
echo "======================================================="
echo
echo "Frontend : http://${SERVER_IP}:3000"
echo "Backend  : http://${SERVER_IP}:8000"
echo "Docs     : http://${SERVER_IP}:8000/docs"
echo

