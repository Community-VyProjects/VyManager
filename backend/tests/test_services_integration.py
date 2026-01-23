#!/usr/bin/env python3
"""
Integration tests for Phase 5: Core Services against live VyOS.

Run with: python tests/test_services_integration.py

Requires:
- Running backend on http://localhost:8000
- Valid user session (login first via frontend or API)
"""

import requests
import json
import sys


BASE_URL = "http://localhost:8000"

# Session to maintain cookies
session = requests.Session()


def login(username: str, password: str) -> bool:
    """Login to get session cookie."""
    resp = session.post(f"{BASE_URL}/auth/login", json={
        "username": username,
        "password": password
    })
    if resp.status_code == 200:
        print(f"[OK] Login successful as {username}")
        return True
    else:
        print(f"[FAIL] Login failed: {resp.status_code} - {resp.text}")
        return False


def get_vyos_sessions() -> list:
    """Get list of VyOS sessions."""
    resp = session.get(f"{BASE_URL}/session/list")
    if resp.status_code == 200:
        return resp.json().get("sessions", [])
    return []


def connect_to_instance(instance_id: str) -> bool:
    """Connect to a VyOS instance."""
    resp = session.post(f"{BASE_URL}/session/connect/{instance_id}")
    if resp.status_code == 200:
        print(f"[OK] Connected to instance {instance_id}")
        return True
    else:
        print(f"[FAIL] Connect failed: {resp.status_code} - {resp.text}")
        return False


def test_dns_config():
    """Test DNS Forwarding config endpoint."""
    print("\n=== Testing DNS Forwarding ===")

    resp = session.get(f"{BASE_URL}/vyos/dns/config")
    if resp.status_code == 200:
        data = resp.json()
        print(f"[OK] DNS Config retrieved: configured={data.get('configured')}")
        print(f"     Listen addresses: {data.get('listen_addresses', [])}")
        print(f"     Name servers: {len(data.get('name_servers', []))} configured")
        print(f"     DNSSEC: {data.get('dnssec')}")
        return True
    else:
        print(f"[FAIL] DNS Config: {resp.status_code} - {resp.text}")
        return False


def test_dns_capabilities():
    """Test DNS Forwarding capabilities endpoint."""
    resp = session.get(f"{BASE_URL}/vyos/dns/capabilities")
    if resp.status_code == 200:
        data = resp.json()
        print(f"[OK] DNS Capabilities: {len(data.get('dnssec_modes', []))} DNSSEC modes, {len(data.get('record_types', []))} record types")
        return True
    else:
        print(f"[FAIL] DNS Capabilities: {resp.status_code} - {resp.text}")
        return False


def test_ntp_config():
    """Test NTP config endpoint."""
    print("\n=== Testing NTP Service ===")

    resp = session.get(f"{BASE_URL}/vyos/ntp/config")
    if resp.status_code == 200:
        data = resp.json()
        print(f"[OK] NTP Config retrieved: configured={data.get('configured')}")
        print(f"     Servers: {len(data.get('servers', []))} configured")
        for srv in data.get('servers', [])[:3]:
            flags = []
            if srv.get('pool'): flags.append('pool')
            if srv.get('prefer'): flags.append('prefer')
            print(f"       - {srv.get('address')} {flags}")
        return True
    else:
        print(f"[FAIL] NTP Config: {resp.status_code} - {resp.text}")
        return False


def test_ntp_capabilities():
    """Test NTP capabilities endpoint."""
    resp = session.get(f"{BASE_URL}/vyos/ntp/capabilities")
    if resp.status_code == 200:
        data = resp.json()
        print(f"[OK] NTP Capabilities: {len(data.get('common_pools', []))} pools, {len(data.get('leap_second_modes', []))} leap second modes")
        return True
    else:
        print(f"[FAIL] NTP Capabilities: {resp.status_code} - {resp.text}")
        return False


def test_ntp_status():
    """Test NTP status endpoint."""
    resp = session.get(f"{BASE_URL}/vyos/ntp/status")
    if resp.status_code == 200:
        data = resp.json()
        print(f"[OK] NTP Status: success={data.get('success')}")
        return True
    else:
        print(f"[FAIL] NTP Status: {resp.status_code} - {resp.text}")
        return False


def test_ssh_config():
    """Test SSH config endpoint."""
    print("\n=== Testing SSH Service ===")

    resp = session.get(f"{BASE_URL}/vyos/ssh/config")
    if resp.status_code == 200:
        data = resp.json()
        print(f"[OK] SSH Config retrieved: configured={data.get('configured')}")
        print(f"     Port: {data.get('port')}")
        print(f"     Listen addresses: {data.get('listen_addresses', [])}")
        print(f"     Password auth disabled: {data.get('disable_password_authentication')}")
        print(f"     Dynamic protection: {data.get('dynamic_protection') is not None}")
        return True
    else:
        print(f"[FAIL] SSH Config: {resp.status_code} - {resp.text}")
        return False


def test_ssh_capabilities():
    """Test SSH capabilities endpoint."""
    resp = session.get(f"{BASE_URL}/vyos/ssh/capabilities")
    if resp.status_code == 200:
        data = resp.json()
        print(f"[OK] SSH Capabilities: {len(data.get('ciphers', []))} ciphers, {len(data.get('key_exchanges', []))} key exchanges")
        return True
    else:
        print(f"[FAIL] SSH Capabilities: {resp.status_code} - {resp.text}")
        return False


def test_dhcp_relay_config():
    """Test DHCP Relay config endpoint."""
    print("\n=== Testing DHCP Relay ===")

    resp = session.get(f"{BASE_URL}/vyos/dhcp-relay/config")
    if resp.status_code == 200:
        data = resp.json()
        dhcp = data.get('dhcp_relay', {})
        dhcpv6 = data.get('dhcpv6_relay', {})
        print(f"[OK] DHCP Relay Config retrieved:")
        print(f"     DHCPv4: configured={dhcp.get('configured')}, servers={len(dhcp.get('servers', []))}")
        print(f"     DHCPv6: configured={dhcpv6.get('configured')}")
        return True
    else:
        print(f"[FAIL] DHCP Relay Config: {resp.status_code} - {resp.text}")
        return False


def test_dhcp_relay_capabilities():
    """Test DHCP Relay capabilities endpoint."""
    resp = session.get(f"{BASE_URL}/vyos/dhcp-relay/capabilities")
    if resp.status_code == 200:
        data = resp.json()
        print(f"[OK] DHCP Relay Capabilities: {len(data.get('relay_agents_packets_options', []))} relay options")
        return True
    else:
        print(f"[FAIL] DHCP Relay Capabilities: {resp.status_code} - {resp.text}")
        return False


def main():
    print("=" * 60)
    print("Phase 5: Core Services Integration Tests")
    print("=" * 60)

    # Try to login
    if not login("admin", "admin"):
        print("\nTrying default credentials failed. Enter your credentials:")
        username = input("Username: ")
        password = input("Password: ")
        if not login(username, password):
            print("Cannot login. Exiting.")
            sys.exit(1)

    # Get sessions
    sessions = get_vyos_sessions()
    if not sessions:
        print("\nNo VyOS sessions found. Please connect to an instance first via the web UI.")
        print("Then re-run this test.")
        sys.exit(1)

    print(f"\nFound {len(sessions)} active session(s)")

    # Run tests
    results = []

    # DNS tests
    results.append(("DNS Config", test_dns_config()))
    results.append(("DNS Capabilities", test_dns_capabilities()))

    # NTP tests
    results.append(("NTP Config", test_ntp_config()))
    results.append(("NTP Capabilities", test_ntp_capabilities()))
    results.append(("NTP Status", test_ntp_status()))

    # SSH tests
    results.append(("SSH Config", test_ssh_config()))
    results.append(("SSH Capabilities", test_ssh_capabilities()))

    # DHCP Relay tests
    results.append(("DHCP Relay Config", test_dhcp_relay_config()))
    results.append(("DHCP Relay Capabilities", test_dhcp_relay_capabilities()))

    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)

    passed = sum(1 for _, r in results if r)
    failed = len(results) - passed

    for name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"  {status} {name}")

    print(f"\nTotal: {passed}/{len(results)} passed")

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
