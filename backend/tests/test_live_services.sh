#!/bin/bash
#
# Live test for Phase 5: Core Services
#
# Usage:
#   1. Login to VyManager in browser
#   2. Open Developer Tools > Application > Cookies
#   3. Copy the "better-auth.session_token" cookie value
#   4. Run: ./test_live_services.sh "YOUR_COOKIE_VALUE"
#
# Or export it:
#   export VYMANAGER_SESSION="your_cookie_value"
#   ./test_live_services.sh
#

BASE_URL="${BASE_URL:-http://localhost:8000}"

# Get session token from argument or environment
SESSION_TOKEN="${1:-$VYMANAGER_SESSION}"

if [ -z "$SESSION_TOKEN" ]; then
    echo "Error: No session token provided"
    echo ""
    echo "Usage: $0 <session_token>"
    echo ""
    echo "To get the session token:"
    echo "  1. Login to VyManager in your browser"
    echo "  2. Open Developer Tools (F12)"
    echo "  3. Go to Application > Cookies"
    echo "  4. Copy the 'better-auth.session_token' value"
    exit 1
fi

echo "============================================================"
echo "Phase 5: Core Services - Live Integration Tests"
echo "============================================================"
echo "Base URL: $BASE_URL"
echo ""

# Function to make authenticated request
auth_curl() {
    curl -s -b "better-auth.session_token=$SESSION_TOKEN" "$@"
}

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local endpoint="$2"
    local response
    local http_code

    response=$(auth_curl -w "\n%{http_code}" "$BASE_URL$endpoint")
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "200" ]; then
        echo "[PASS] $name (HTTP $http_code)"
        # Pretty print first part of response
        echo "$body" | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps({k:v for k,v in list(d.items())[:3]}, indent=2))" 2>/dev/null | head -10
    else
        echo "[FAIL] $name (HTTP $http_code)"
        echo "       Response: $(echo "$body" | head -c 200)"
    fi
    echo ""
}

echo "=== DNS Forwarding Tests ==="
test_endpoint "DNS Config" "/vyos/dns/config"
test_endpoint "DNS Capabilities" "/vyos/dns/capabilities"

echo "=== NTP Service Tests ==="
test_endpoint "NTP Config" "/vyos/ntp/config"
test_endpoint "NTP Capabilities" "/vyos/ntp/capabilities"
test_endpoint "NTP Status" "/vyos/ntp/status"

echo "=== SSH Service Tests ==="
test_endpoint "SSH Config" "/vyos/ssh/config"
test_endpoint "SSH Capabilities" "/vyos/ssh/capabilities"

echo "=== DHCP Relay Tests ==="
test_endpoint "DHCP Relay Config" "/vyos/dhcp-relay/config"
test_endpoint "DHCP Relay Capabilities" "/vyos/dhcp-relay/capabilities"

echo "============================================================"
echo "Test Complete"
echo "============================================================"
