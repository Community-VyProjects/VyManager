#!/usr/bin/env bash
# VyManager Installation Script
# Supports: Ubuntu/Debian, Fedora, CentOS/RHEL, Arch Linux, openSUSE
set -euo pipefail

# ============================================================================
# Colors & Formatting
# ============================================================================
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
MAGENTA='\033[35m'

# ============================================================================
# UI Helpers
# ============================================================================
banner() {
  clear
  echo -e "${CYAN}${BOLD}"
  echo "  ╔═══════════════════════════════════════════════╗"
  echo "  ║             VyManager Installer               ║"
  echo "  ║       Professional VyOS Management            ║"
  echo "  ╚═══════════════════════════════════════════════╝"
  echo -e "${RESET}"
}

info()    { echo -e "  ${CYAN}▸${RESET} $1"; }
success() { echo -e "  ${GREEN}✓${RESET} $1"; }
warn()    { echo -e "  ${YELLOW}!${RESET} $1"; }
fail()    { echo -e "  ${RED}✗${RESET} $1"; exit 1; }
step()    { echo -e "\n  ${MAGENTA}${BOLD}[$1/$TOTAL_STEPS]${RESET} ${BOLD}$2${RESET}\n"; }

prompt() {
  local var_name="$1" prompt_text="$2" default="${3:-}"
  if [[ -n "$default" ]]; then
    echo -en "  ${CYAN}?${RESET} ${prompt_text} ${DIM}(${default})${RESET}: "
    read -r input
    eval "$var_name=\"${input:-$default}\""
  else
    echo -en "  ${CYAN}?${RESET} ${prompt_text}: "
    read -r input
    while [[ -z "$input" ]]; do
      echo -en "  ${RED}!${RESET} This field is required: "
      read -r input
    done
    eval "$var_name=\"$input\""
  fi
}

prompt_secret() {
  local var_name="$1" prompt_text="$2"
  echo -en "  ${CYAN}?${RESET} ${prompt_text}: "
  read -rs input
  echo
  while [[ -z "$input" ]]; do
    echo -en "  ${RED}!${RESET} This field is required: "
    read -rs input
    echo
  done
  eval "$var_name=\"$input\""
}

prompt_yn() {
  local prompt_text="$1" default="${2:-y}"
  local hint="Y/n"
  [[ "$default" == "n" ]] && hint="y/N"
  echo -en "  ${CYAN}?${RESET} ${prompt_text} ${DIM}(${hint})${RESET}: "
  read -r input
  input="${input:-$default}"
  [[ "${input,,}" == "y" ]]
}

divider() {
  echo -e "  ${DIM}─────────────────────────────────────────────${RESET}"
}

# ============================================================================
# Detect Distro
# ============================================================================
detect_distro() {
  if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    DISTRO="${ID}"
    DISTRO_FAMILY="${ID_LIKE:-$ID}"
  else
    fail "Cannot detect Linux distribution"
  fi
}

# ============================================================================
# Install Docker
# ============================================================================
install_docker() {
  if command -v docker &>/dev/null; then
    success "Docker is already installed ($(docker --version | cut -d' ' -f3 | tr -d ','))"
    return
  fi

  info "Installing Docker for ${BOLD}${DISTRO}${RESET}..."

  case "$DISTRO" in
    ubuntu|debian)
      apt-get update -qq
      apt-get install -y -qq ca-certificates curl gnupg >/dev/null
      install -m 0755 -d /etc/apt/keyrings
      curl -fsSL "https://download.docker.com/linux/${DISTRO}/gpg" | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
      chmod a+r /etc/apt/keyrings/docker.gpg
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${DISTRO} $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        > /etc/apt/sources.list.d/docker.list
      apt-get update -qq
      apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin >/dev/null
      ;;
    fedora)
      dnf install -y -q dnf-plugins-core >/dev/null
      dnf config-manager addrepo --from-repofile=https://download.docker.com/linux/fedora/docker-ce.repo
      dnf install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin >/dev/null
      ;;
    centos|rhel|rocky|alma)
      yum install -y -q yum-utils >/dev/null
      yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo >/dev/null
      yum install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin >/dev/null
      ;;
    arch|manjaro)
      pacman -Sy --noconfirm --quiet docker docker-compose >/dev/null
      ;;
    opensuse*|sles)
      zypper install -y -q docker docker-compose >/dev/null
      ;;
    *)
      fail "Unsupported distribution: ${DISTRO}. Install Docker manually and re-run this script."
      ;;
  esac

  systemctl enable --now docker >/dev/null 2>&1
  success "Docker installed successfully"
}

# ============================================================================
# Generate Secrets
# ============================================================================
generate_secret() {
  openssl rand -base64 32
}

generate_hex() {
  openssl rand -hex 32
}

generate_db_pass() {
  # Alphanumeric only — avoids URL-encoding issues in DATABASE_URL
  # and special character issues with PostgreSQL connection strings
  openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 32
}

# ============================================================================
# Main
# ============================================================================
TOTAL_STEPS=5
INSTALL_DIR="/opt/vymanager"
REGISTRY="ghcr.io/community-vyprojects/vymanager"
USE_TRAEFIK=false

banner

# Pre-flight checks
[[ $EUID -ne 0 ]] && fail "Please run as root: ${BOLD}sudo bash install.sh${RESET}"

detect_distro
success "Detected: ${BOLD}${DISTRO}${RESET}"
echo

# ──────────────────────────────────────────────────────────────────────────────
step 1 "Install Docker"
# ──────────────────────────────────────────────────────────────────────────────
install_docker

# ──────────────────────────────────────────────────────────────────────────────
step 2 "Configure VyManager"
# ──────────────────────────────────────────────────────────────────────────────
info "Answer the following to configure your deployment.\n"

if prompt_yn "Use Traefik reverse proxy with automatic HTTPS (Let's Encrypt)?" "n"; then
  USE_TRAEFIK=true
  prompt       DOMAIN        "Domain name (e.g. vymanager.example.com)"
  prompt       ACME_EMAIL    "Email for Let's Encrypt certificates"
  APP_URL="https://${DOMAIN}"
  FRONTEND_PORT=""
  BACKEND_PORT=""
else
  prompt       APP_URL       "Application URL (e.g. https://vymanager.example.com)" "http://localhost:3000"
  prompt       FRONTEND_PORT "Frontend port" "3000"
  prompt       BACKEND_PORT  "Backend port" "8000"
fi

divider

prompt DB_USER "PostgreSQL username" "vymanager"
DB_PASS=$(generate_db_pass)
success "PostgreSQL password generated"

divider

if prompt_yn "Generate random secrets automatically?" "y"; then
  AUTH_SECRET=$(generate_secret)
  SSH_KEY=$(generate_hex)
  success "Secrets generated"
else
  prompt_secret AUTH_SECRET "Better Auth secret (base64 string)"
  prompt_secret SSH_KEY     "SSH encryption key (64-char hex)"
fi

echo

# ──────────────────────────────────────────────────────────────────────────────
step 3 "Create installation directory"
# ──────────────────────────────────────────────────────────────────────────────
mkdir -p "${INSTALL_DIR}"
success "Created ${INSTALL_DIR}"

# ──────────────────────────────────────────────────────────────────────────────
step 4 "Write configuration files"
# ──────────────────────────────────────────────────────────────────────────────
DB_URL="postgresql://${DB_USER}:${DB_PASS}@postgres:5432/vymanager"

if [[ "$USE_TRAEFIK" == true ]]; then
  # -- docker-compose.yml (Traefik) --
  cat > "${INSTALL_DIR}/docker-compose.yml" <<YAML
services:
  traefik:
    image: traefik:latest
    container_name: vymanager-traefik
    command:
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --entrypoints.web.http.redirections.entrypoint.to=websecure
      - --entrypoints.web.http.redirections.entrypoint.scheme=https
      - --certificatesresolvers.letsencrypt.acme.httpchallenge=true
      - --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web
      - --certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}
      - --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt_data:/letsencrypt
    networks:
      - vymanager
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    container_name: vymanager-postgres
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
      POSTGRES_DB: vymanager
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - vymanager
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d vymanager"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  backend:
    image: ${REGISTRY}-backend:beta
    container_name: vymanager-backend
    env_file:
      - .env
    networks:
      - vymanager
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    image: ${REGISTRY}-frontend:beta
    container_name: vymanager-frontend
    env_file:
      - .env
    networks:
      - vymanager
    restart: unless-stopped
    depends_on:
      backend:
        condition: service_healthy
      postgres:
        condition: service_healthy
    labels:
      traefik.enable: "true"
      traefik.http.routers.vymanager.rule: "Host(\`${DOMAIN}\`)"
      traefik.http.routers.vymanager.entrypoints: "websecure"
      traefik.http.routers.vymanager.tls.certresolver: "letsencrypt"
      traefik.http.services.vymanager.loadbalancer.server.port: "3000"

networks:
  vymanager:
    driver: bridge

volumes:
  postgres_data:
  letsencrypt_data:
YAML
  success "docker-compose.yml (Traefik)"
else
  # -- docker-compose.yml (direct ports) --
  cat > "${INSTALL_DIR}/docker-compose.yml" <<YAML
services:
  postgres:
    image: postgres:16-alpine
    container_name: vymanager-postgres
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
      POSTGRES_DB: vymanager
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - vymanager
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d vymanager"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  backend:
    image: ${REGISTRY}-backend:beta
    container_name: vymanager-backend
    ports:
      - "${BACKEND_PORT}:8000"
    env_file:
      - .env
    restart: unless-stopped
    networks:
      - vymanager
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    image: ${REGISTRY}-frontend:beta
    container_name: vymanager-frontend
    ports:
      - "${FRONTEND_PORT}:3000"
    env_file:
      - .env
    restart: unless-stopped
    networks:
      - vymanager
    depends_on:
      backend:
        condition: service_healthy
      postgres:
        condition: service_healthy

networks:
  vymanager:
    driver: bridge

volumes:
  postgres_data:
    driver: local
YAML
  success "docker-compose.yml"
fi

# Build TRUSTED_ORIGINS
if [[ "$USE_TRAEFIK" == true ]]; then
  TRUSTED_ORIGINS="${APP_URL}"
  SECURE_COOKIES="true"
else
  TRUSTED_ORIGINS="${APP_URL},http://localhost:${FRONTEND_PORT}"
  SECURE_COOKIES="false"
fi

# -- .env --
cat > "${INSTALL_DIR}/.env" <<EOF
# VyManager Configuration
# Generated by install.sh

# ============================================================================
# Application Environment
# ============================================================================
NODE_ENV=production

# ============================================================================
# Better Auth Configuration
# ============================================================================
BETTER_AUTH_SECRET=${AUTH_SECRET}
BETTER_AUTH_SECURE_COOKIES=${SECURE_COOKIES}
BETTER_AUTH_URL=${APP_URL}
NEXT_PUBLIC_APP_URL=${APP_URL}

# ============================================================================
# Backend / Frontend
# ============================================================================
BACKEND_URL=http://backend:8000
FRONTEND_URL=${APP_URL}
SSH_ENCRYPTION_KEY=${SSH_KEY}

# Trusted origins for CORS (comma-separated list)
TRUSTED_ORIGINS=${TRUSTED_ORIGINS}

# ============================================================================
# Database
# ============================================================================
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASS}
DATABASE_URL=${DB_URL}
EOF
success ".env"

chmod 600 "${INSTALL_DIR}/.env"
success "Env file secured (chmod 600)"

# ──────────────────────────────────────────────────────────────────────────────
step 5 "Pull images & start VyManager"
# ──────────────────────────────────────────────────────────────────────────────
info "Pulling Docker images...\n"
docker compose -f "${INSTALL_DIR}/docker-compose.yml" pull

echo
info "Starting services...\n"
docker compose -f "${INSTALL_DIR}/docker-compose.yml" up -d

# ──────────────────────────────────────────────────────────────────────────────
# Done
# ──────────────────────────────────────────────────────────────────────────────
echo
echo -e "  ${GREEN}${BOLD}═══════════════════════════════════════════════${RESET}"
echo -e "  ${GREEN}${BOLD}  VyManager is running!${RESET}"
echo -e "  ${GREEN}${BOLD}═══════════════════════════════════════════════${RESET}"
echo
info "URL:        ${BOLD}${APP_URL}${RESET}"
info "Install:    ${BOLD}${INSTALL_DIR}${RESET}"
echo
info "Manage with:"
echo -e "    ${DIM}cd ${INSTALL_DIR}${RESET}"
echo -e "    ${DIM}docker compose logs -f        ${RESET}${DIM}# view logs${RESET}"
echo -e "    ${DIM}docker compose pull && \\\\${RESET}"
echo -e "    ${DIM}docker compose down && \\\\${RESET}"
echo -e "    ${DIM}docker compose up -d           ${RESET}${DIM}# update${RESET}"
echo
