#!/bin/vbash
# VyManager on-box installer for VyOS 1.4 and 1.5.
#
# Download, read, then run. Do not pipe curl into vbash.
#
#   curl -fsSL https://raw.githubusercontent.com/Community-VyProjects/VyManager/beta/install-vyos.sh -o install-vyos.sh
#   less install-vyos.sh
#   vbash install-vyos.sh
#
# From a git clone of the beta branch:
#
#   vbash install-vyos.sh
#
# Walks through SSH, HTTPS API, GraphQL, and the three containers.
# Prints the exact set list and requires yes before commit; save.
# Does not write firewall, NAT, or zone-policy.
# On failure the configure session is discarded. Pulled images may stay.

if [ -n "${BASH_VERSION:-}" ]; then
  set -eu
fi

REGISTRY="ghcr.io/community-vyprojects"
FRONTEND_IMAGE="${REGISTRY}/vymanager-frontend:beta"
BACKEND_IMAGE="${REGISTRY}/vymanager-backend:beta"
POSTGRES_IMAGE="postgres:16-alpine"
NET_NAME="vymanager"
NET_PREFIX_DEFAULT="172.31.255.0/24"
PG_ADDR_DEFAULT="172.31.255.2"
BE_ADDR_DEFAULT="172.31.255.3"
FE_ADDR_DEFAULT="172.31.255.4"
GW_ADDR_DEFAULT="172.31.255.1"
VOL_PG="/config/containers/vymanager-postgres"
KEY_ID="vymanager"

CMDFILE=""
SET_CMDS=()

info() { echo "  > $1"; }
warn() { echo "  ! $1"; }
fail() { echo "  x $1" >&2; exit 1; }

prompt() {
  local var_name="$1" prompt_text="$2" default="${3:-}"
  local input
  if [ -n "$default" ]; then
    echo -n "  ? ${prompt_text} [${default}]: "
    read -r input || true
    input="${input:-$default}"
  else
    echo -n "  ? ${prompt_text}: "
    read -r input || true
    while [ -z "$input" ]; do
      echo -n "  ! This field is required: "
      read -r input || true
    done
  fi
  printf -v "$var_name" "%s" "$input"
}

prompt_yn() {
  local prompt_text="$1" default="${2:-n}"
  local hint="y/N"
  [ "$default" = "y" ] && hint="Y/n"
  local input
  echo -n "  ? ${prompt_text} (${hint}): "
  read -r input || true
  input="${input:-$default}"
  case "$input" in
    y|Y|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

exists_active() {
  /bin/cli-shell-api existsActive "$@" >/dev/null 2>&1
}

active_value() {
  /bin/cli-shell-api returnActiveValue "$@" 2>/dev/null || true
}

rand_hex() {
  python3 -c "import secrets; print(secrets.token_hex(${1:-32}))"
}

rand_alnum() {
  python3 -c "import secrets,string; a=string.ascii_letters+string.digits; print(''.join(secrets.choice(a) for _ in range(${1:-32})))"
}

build_database_url() {
  printf "postgresql://vymanager:%s" "$1"
  printf "@%s:5432/vymanager" "$2"
}

quote_val() {
  case "$1" in
    *"'"*|*"\`"*|*\\*|*$'\n'*|*'$'*|*';'*|*'|'*)
      fail "Value contains a character that cannot be put in a set command"
      ;;
  esac
  printf "'%s'" "$1"
}

redact_set_line() {
  printf "%s\n" "$1" | sed -E \
    -e "s/(POSTGRES_PASSWORD value )'[^']*'/\1'<redacted>'/" \
    -e "s/(DATABASE_URL value )'[^']*'/\1'<redacted>'/" \
    -e "s/(BETTER_AUTH_SECRET value )'[^']*'/\1'<redacted>'/" \
    -e "s/(SSH_ENCRYPTION_KEY value )'[^']*'/\1'<redacted>'/" \
    -e "s/(VYMANAGER_APPLIANCE_API_KEY value )'[^']*'/\1'<redacted>'/" \
    -e "s/( keys id ${KEY_ID} key )'[^']*'/\1'<redacted>'/"
}

add_set() {
  SET_CMDS+=("set $*")
}

add_https_rest_if_15() {
  if [ "$FAMILY" = "1.5" ]; then
    add_set "service https api rest"
  fi
}

add_network_gateway_if_15() {
  if [ "$FAMILY" = "1.5" ]; then
    add_set "container network ${NET_NAME} gateway $(quote_val "$1")"
  fi
}

cleanup_cmds() {
  if [ -n "${CMDFILE:-}" ] && [ -f "$CMDFILE" ]; then
    rm -f "$CMDFILE"
  fi
}

require_vyos() {
  if [ ! -f /usr/share/vyos/version.json ] && [ ! -d /opt/vyatta ]; then
    fail "This script runs on a VyOS router. For Linux, use install.sh."
  fi
  if [ "$(id -u)" -eq 0 ]; then
    fail "Run as the vyos user, not root: vbash install-vyos.sh"
  fi
}

detect_vyos_family() {
  local ver=""
  if [ -f /usr/share/vyos/version.json ]; then
    ver="$(python3 -c "import json; print(json.load(open('/usr/share/vyos/version.json')).get('version',''))" 2>/dev/null || true)"
  fi
  case "$ver" in
    1.4*) echo "1.4" ;;
    *) echo "1.5" ;;
  esac
}

ssh_server_ip() {
  local c="${SSH_CONNECTION:-}"
  if [ -n "$c" ]; then
    set -f
    # client_ip client_port server_ip server_port
    set -- $c
    set +f
    if [ "$#" -ge 3 ]; then
      echo "$3"
      return
    fi
  fi
  echo ""
}

https_port_now() {
  local p
  p="$(active_value service https port)"
  if [ -n "$p" ]; then
    echo "$p"
  else
    echo "443"
  fi
}

list_vrfs() {
  if exists_active vrf; then
    /bin/cli-shell-api listNodes vrf name 2>/dev/null || true
  fi
}

check_ghcr() {
  if command -v curl >/dev/null 2>&1; then
    curl -sI --max-time 8 https://ghcr.io >/dev/null 2>&1
    return $?
  fi
  ping -c 1 -W 3 ghcr.io >/dev/null 2>&1
}

pull_image() {
  local img="$1"
  if sudo podman image inspect "$img" >/dev/null 2>&1; then
    info "Image already present: $img"
    return 0
  fi
  info "Pulling $img"
  if [ -n "${PULL_VRF:-}" ]; then
    sudo ip vrf exec "$PULL_VRF" podman pull "$img"
  else
    sudo podman pull "$img"
  fi
}

apply_config() {
  # script-template replaces bash 'set'. Do not use set -e after sourcing it.
  # shellcheck disable=SC1091
  source /opt/vyatta/etc/functions/script-template
  configure
  # shellcheck disable=SC1090
  if ! source "$CMDFILE"; then
    echo "  x Failed while applying set commands. Discarding." >&2
    discard
    exit 1
  fi
  if ! commit; then
    echo "  x commit failed. Discarding." >&2
    discard
    echo "  Pulled images, if any, were left in place." >&2
    exit 1
  fi
  save
}

SELF="$0"
case "$SELF" in
  /*) ;;
  *) SELF="$(pwd)/$SELF" ;;
esac

if [ "${1:-}" = "--apply" ]; then
  CMDFILE="${VYMANAGER_INSTALL_CMDS:-}"
  [ -n "$CMDFILE" ] && [ -f "$CMDFILE" ] || fail "Internal error: missing command file"
  if [ "$(id -g -n)" != "vyattacfg" ]; then
    exec sg vyattacfg -c "/bin/vbash \"${SELF}\" --apply"
  fi
  apply_config
  cleanup_cmds
  echo
  info "commit; save completed."
  exit 0
fi

if [ "${1:-}" = "--self-test" ]; then
  u="$(build_database_url SecretPass1 172.31.255.2)"
  want="$(printf "postgresql://vymanager:%s" SecretPass1; printf "@%s:5432/vymanager" 172.31.255.2)"
  [ "$u" = "$want" ] || fail "database url mismatch"
  case "$u" in
    *SecretPass1*) ;;
    *) fail "password missing from database url" ;;
  esac
  q="$(quote_val ok-value)"
  [ "$q" = "'ok-value'" ] || fail "quote_val wrapping"
  if (quote_val "bad'value") >/dev/null 2>&1; then
    fail "quote_val should reject quotes"
  fi
  line="set container name vymanager-backend environment DATABASE_URL value '$(build_database_url SecretPass1 172.31.255.2)'"
  red="$(redact_set_line "$line")"
  case "$red" in
    *SecretPass1*) fail "redact leaked password" ;;
  esac
  case "$red" in
    *"<redacted>"*) ;;
    *) fail "redact missing marker" ;;
  esac
  FAMILY=1.4
  SET_CMDS=()
  add_https_rest_if_15
  add_network_gateway_if_15 172.31.255.1
  [ "${#SET_CMDS[@]}" -eq 0 ] || fail "1.4 emitted a 1.5-only path"
  FAMILY=1.5
  SET_CMDS=()
  add_https_rest_if_15
  add_network_gateway_if_15 172.31.255.1
  [ "${#SET_CMDS[@]}" -eq 2 ] || fail "1.5 missing rest or gateway"
  echo "self-test ok"
  exit 0
fi

require_vyos

echo
echo "  VyManager on-box installer"
echo "  SSH, HTTPS API, GraphQL, then containers."
echo "  Firewall, NAT, and zone-policy are left untouched."
echo

FAMILY="$(detect_vyos_family)"
prompt FAMILY "VyOS family for the seeded instance (1.4 or 1.5)" "$FAMILY"
case "$FAMILY" in
  1.4|1.5) ;;
  *) fail "Family must be 1.4 or 1.5" ;;
esac

SSH_IP="$(ssh_server_ip)"
if [ -z "$SSH_IP" ]; then
  prompt SSH_IP "IPv4/IPv6 of the interface you SSH to (API listen-address if HTTPS is new)"
else
  prompt SSH_IP "Address containers use to reach this router's HTTPS API" "$SSH_IP"
fi
[ -n "$SSH_IP" ] || fail "API address is required"

HTTPS_PORT="$(https_port_now)"
prompt UI_PORT "UI port (must not be the VyOS API port ${HTTPS_PORT})" "3000"
case "$UI_PORT" in
  ''|*[!0-9]*) fail "UI port must be an integer" ;;
esac
if [ "$UI_PORT" -lt 1 ] || [ "$UI_PORT" -gt 65535 ]; then
  fail "UI port out of range"
fi
if [ "$UI_PORT" = "$HTTPS_PORT" ]; then
  fail "UI port ${UI_PORT} is the VyOS API port. Pick another port."
fi

prompt APP_URL "URL you will type in the browser" "http://${SSH_IP}:${UI_PORT}"
prompt NET_PREFIX "Container network prefix" "$NET_PREFIX_DEFAULT"
GW_ADDR="$GW_ADDR_DEFAULT"
if [ "$FAMILY" = "1.5" ]; then
  prompt GW_ADDR "Container network gateway" "$GW_ADDR_DEFAULT"
fi
prompt PG_ADDR "Postgres address on that network" "$PG_ADDR_DEFAULT"
prompt BE_ADDR "Backend address on that network" "$BE_ADDR_DEFAULT"
prompt FE_ADDR "Frontend address on that network" "$FE_ADDR_DEFAULT"

PULL_VRF=""
if check_ghcr; then
  info "ghcr.io is reachable from the default routing table."
else
  warn "ghcr.io is not reachable from the default routing table."
  echo "  Existing VRFs:"
  VRFS="$(list_vrfs)"
  if [ -n "$VRFS" ]; then
    echo "$VRFS" | sed "s/^/    /"
  else
    echo "    (none in config)"
  fi
  prompt PULL_VRF "VRF name used to pull images and attach the container network"
  [ -n "$PULL_VRF" ] || fail "A VRF is required when the default table cannot reach ghcr.io"
fi

prompt NET_VRF "VRF for the container network (blank for default table)" "${PULL_VRF:-}"

echo
info "About 1 GB RAM for postgres + backend + frontend."
info "Postgres data stays on persistent disk under ${VOL_PG}."
info "Do not bind the UI to the VyOS API port (${HTTPS_PORT})."
echo
info "Ports that must be reachable from your browser/SSH client:"
info "  SSH (existing), HTTPS API (${HTTPS_PORT}), UI (${UI_PORT})"
info "This installer does not write firewall, NAT, or zone-policy."
echo

# --- SSH: enable only if missing; never change listen-address, port, or keys
if exists_active service ssh; then
  info "service ssh is already present. Leaving listen-address, port, and keys unchanged."
else
  add_set "service ssh"
fi

# --- HTTPS / API / GraphQL
if exists_active service https; then
  info "service https is already present. Not changing existing listen-address or port."
else
  add_set "service https listen-address $(quote_val "$SSH_IP")"
fi

if exists_active service https api graphql authentication type; then
  info "GraphQL is already present."
else
  add_set "service https api graphql"
  add_set "service https api graphql authentication type key"
fi

if [ "$FAMILY" = "1.5" ] && exists_active service https api rest; then
  info "HTTPS REST is already present."
else
  add_https_rest_if_15
fi

API_KEY=""
if exists_active service https api keys id "$KEY_ID"; then
  API_KEY="$(active_value service https api keys id "$KEY_ID" key)"
  info "Reusing existing API key id ${KEY_ID}."
else
  API_KEY="$(rand_hex 32)"
  add_set "service https api keys id ${KEY_ID} key $(quote_val "$API_KEY")"
fi
[ -n "$API_KEY" ] || fail "Could not obtain an API key"

# --- Containers
STACK_EXISTS=0
if exists_active container name vymanager-postgres \
  || exists_active container name vymanager-backend \
  || exists_active container name vymanager-frontend; then
  STACK_EXISTS=1
  warn "A vymanager-* container already exists. Not rewriting container config."
  warn "Delete those container names in configure if you want a clean reinstall."
fi

DB_PASS="$(rand_alnum 32)"
AUTH_SECRET="$(rand_hex 32)"
SSH_KEY="$(rand_hex 32)"
DB_URL="$(build_database_url "$DB_PASS" "$PG_ADDR")"

if [ "$STACK_EXISTS" -eq 0 ]; then
  if exists_active container network "$NET_NAME"; then
    info "Container network ${NET_NAME} already exists. Not changing prefix/VRF."
  else
    add_set "container network ${NET_NAME} prefix $(quote_val "$NET_PREFIX")"
    add_network_gateway_if_15 "$GW_ADDR"
    if [ -n "$NET_VRF" ]; then
      add_set "container network ${NET_NAME} vrf $(quote_val "$NET_VRF")"
    fi
  fi

  add_set "container name vymanager-postgres image $(quote_val "$POSTGRES_IMAGE")"
  add_set "container name vymanager-postgres restart always"
  add_set "container name vymanager-postgres network ${NET_NAME} address $(quote_val "$PG_ADDR")"
  add_set "container name vymanager-postgres volume pgdata source $(quote_val "$VOL_PG")"
  add_set "container name vymanager-postgres volume pgdata destination '/var/lib/postgresql/data'"
  add_set "container name vymanager-postgres environment POSTGRES_USER value vymanager"
  add_set "container name vymanager-postgres environment POSTGRES_PASSWORD value $(quote_val "$DB_PASS")"
  add_set "container name vymanager-postgres environment POSTGRES_DB value vymanager"

  add_set "container name vymanager-backend image $(quote_val "$BACKEND_IMAGE")"
  add_set "container name vymanager-backend restart always"
  add_set "container name vymanager-backend network ${NET_NAME} address $(quote_val "$BE_ADDR")"
  add_set "container name vymanager-backend environment NODE_ENV value production"
  add_set "container name vymanager-backend environment VYMANAGER_MODE value appliance"
  add_set "container name vymanager-backend environment VYMANAGER_APPLIANCE_HOST value $(quote_val "$SSH_IP")"
  add_set "container name vymanager-backend environment VYMANAGER_APPLIANCE_API_KEY value $(quote_val "$API_KEY")"
  add_set "container name vymanager-backend environment VYMANAGER_APPLIANCE_VERSION value $(quote_val "$FAMILY")"
  add_set "container name vymanager-backend environment VYMANAGER_APPLIANCE_PORT value $(quote_val "$HTTPS_PORT")"
  add_set "container name vymanager-backend environment VYMANAGER_APPLIANCE_PROTOCOL value https"
  add_set "container name vymanager-backend environment DATABASE_URL value $(quote_val "$DB_URL")"
  add_set "container name vymanager-backend environment BETTER_AUTH_SECRET value $(quote_val "$AUTH_SECRET")"
  add_set "container name vymanager-backend environment SSH_ENCRYPTION_KEY value $(quote_val "$SSH_KEY")"
  add_set "container name vymanager-backend environment FRONTEND_URL value $(quote_val "$APP_URL")"
  add_set "container name vymanager-backend environment FRONTEND_INTERNAL_URL value $(quote_val "http://${FE_ADDR}:3000")"
  add_set "container name vymanager-backend environment TRUSTED_ORIGINS value $(quote_val "$APP_URL")"

  add_set "container name vymanager-frontend image $(quote_val "$FRONTEND_IMAGE")"
  add_set "container name vymanager-frontend restart always"
  add_set "container name vymanager-frontend network ${NET_NAME} address $(quote_val "$FE_ADDR")"
  add_set "container name vymanager-frontend port ui source $(quote_val "$UI_PORT")"
  add_set "container name vymanager-frontend port ui destination 3000"
  add_set "container name vymanager-frontend port ui protocol tcp"
  add_set "container name vymanager-frontend environment NODE_ENV value production"
  add_set "container name vymanager-frontend environment DATABASE_URL value $(quote_val "$DB_URL")"
  add_set "container name vymanager-frontend environment BETTER_AUTH_SECRET value $(quote_val "$AUTH_SECRET")"
  add_set "container name vymanager-frontend environment BETTER_AUTH_URL value $(quote_val "$APP_URL")"
  add_set "container name vymanager-frontend environment NEXT_PUBLIC_APP_URL value $(quote_val "$APP_URL")"
  add_set "container name vymanager-frontend environment BACKEND_URL value $(quote_val "http://${BE_ADDR}:8000")"
  add_set "container name vymanager-frontend environment TRUSTED_ORIGINS value $(quote_val "$APP_URL")"
fi

echo
echo "  Proposed set commands"
echo "  ---------------------"
if [ "${#SET_CMDS[@]}" -eq 0 ]; then
  info "Nothing to set. SSH/API/containers already match."
  exit 0
fi
i=0
while [ "$i" -lt "${#SET_CMDS[@]}" ]; do
  echo "  $(redact_set_line "${SET_CMDS[$i]}")"
  i=$((i + 1))
done
echo

if ! prompt_yn "Commit this list and save?" "n"; then
  info "Aborted. No configure session was opened."
  exit 0
fi

if [ "$STACK_EXISTS" -eq 0 ]; then
  sudo mkdir -p "$VOL_PG"
  pull_image "$POSTGRES_IMAGE"
  pull_image "$BACKEND_IMAGE"
  pull_image "$FRONTEND_IMAGE"
fi

CMDFILE="$(mktemp /tmp/vymanager-install.XXXXXX)"
chmod 600 "$CMDFILE"
i=0
while [ "$i" -lt "${#SET_CMDS[@]}" ]; do
  printf "%s\n" "${SET_CMDS[$i]}" >> "$CMDFILE"
  i=$((i + 1))
done
trap cleanup_cmds EXIT
export VYMANAGER_INSTALL_CMDS="$CMDFILE"

if [ "$(id -g -n)" != "vyattacfg" ]; then
  exec sg vyattacfg -c "/bin/vbash \"${SELF}\" --apply"
fi
apply_config
cleanup_cmds
trap - EXIT

echo
info "VyManager containers will come up after commit (frontend migrates on start)."
info "Open ${APP_URL} and create the first local admin."
info "SSH remains the out-of-band path if the UI is unreachable."
echo
