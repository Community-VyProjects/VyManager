#!/usr/bin/env bash
set -e

# Import custom CA certificates if any are mounted. The container runs as a
# non-root user, so instead of update-ca-certificates (which writes to /etc)
# build a combined bundle in a writable location and point Python at it.
CA_DIR="/usr/local/share/ca-certificates/custom"
if [ -d "$CA_DIR" ] && [ "$(ls -A "$CA_DIR"/*.crt 2>/dev/null)" ]; then
    echo "Importing custom CA certificates..."
    CA_BUNDLE="${TMPDIR:-/tmp}/vymanager-ca-bundle.crt"
    cat /etc/ssl/certs/ca-certificates.crt "$CA_DIR"/*.crt > "$CA_BUNDLE"
    export REQUESTS_CA_BUNDLE="$CA_BUNDLE"
    export SSL_CERT_FILE="$CA_BUNDLE"
    echo "Custom CA certificates imported."
fi

exec uvicorn app:app --host 0.0.0.0 --port 8000 --proxy-headers
