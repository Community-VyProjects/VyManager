#!/usr/bin/env bash
set -e

# Import custom CA certificates if any are mounted
CA_DIR="/usr/local/share/ca-certificates/custom"
if [ -d "$CA_DIR" ] && [ "$(ls -A "$CA_DIR"/*.crt 2>/dev/null)" ]; then
    echo "Importing custom CA certificates..."
    update-ca-certificates
    export REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt
    export SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
    echo "Custom CA certificates imported."
fi

exec uvicorn app:app --host 0.0.0.0 --port 8000 --proxy-headers
