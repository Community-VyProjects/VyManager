"""
Test script for Phase 5: Core Services

Tests DNS Forwarding, NTP, SSH, and DHCP Relay endpoints.
"""

import pytest
from fastapi.testclient import TestClient

from app import app


# Test that routers are properly loaded
def test_dns_router_loaded():
    """Test that DNS router is loaded."""
    client = TestClient(app)
    # Check if /vyos/dns/capabilities endpoint exists (returns 401/403 without auth, not 404)
    r = client.get("/vyos/dns/capabilities")
    assert r.status_code in [401, 403], f"Expected 401/403, got {r.status_code}: {r.text}"


def test_ntp_router_loaded():
    """Test that NTP router is loaded."""
    client = TestClient(app)
    r = client.get("/vyos/ntp/capabilities")
    assert r.status_code in [401, 403], f"Expected 401/403, got {r.status_code}: {r.text}"


def test_ssh_router_loaded():
    """Test that SSH router is loaded."""
    client = TestClient(app)
    r = client.get("/vyos/ssh/capabilities")
    assert r.status_code in [401, 403], f"Expected 401/403, got {r.status_code}: {r.text}"


def test_dhcp_relay_router_loaded():
    """Test that DHCP Relay router is loaded."""
    client = TestClient(app)
    r = client.get("/vyos/dhcp-relay/capabilities")
    assert r.status_code in [401, 403], f"Expected 401/403, got {r.status_code}: {r.text}"


# Test mappers can be imported
def test_dns_mapper_import():
    """Test that DNS mapper can be imported."""
    from vyos_mappers.services.dns import DNSForwardingMapper
    mapper = DNSForwardingMapper("1.4")
    assert mapper.get_base() == ["service", "dns", "forwarding"]
    assert mapper.get_listen_address("192.168.1.1") == ["service", "dns", "forwarding", "listen-address", "192.168.1.1"]
    assert mapper.get_name_server("8.8.8.8") == ["service", "dns", "forwarding", "name-server", "8.8.8.8"]


def test_ntp_mapper_import():
    """Test that NTP mapper can be imported."""
    from vyos_mappers.services.ntp import NTPMapper
    mapper = NTPMapper("1.4")
    assert mapper.get_base() == ["service", "ntp"]
    assert mapper.get_server("pool.ntp.org") == ["service", "ntp", "server", "pool.ntp.org"]


def test_ssh_mapper_import():
    """Test that SSH mapper can be imported."""
    from vyos_mappers.services.ssh import SSHMapper
    mapper = SSHMapper("1.4")
    assert mapper.get_base() == ["service", "ssh"]
    assert mapper.get_port("22") == ["service", "ssh", "port", "22"]


def test_dhcp_relay_mapper_import():
    """Test that DHCP Relay mapper can be imported."""
    from vyos_mappers.services.dhcp_relay import DHCPRelayMapper
    mapper = DHCPRelayMapper("1.4")
    assert mapper.get_dhcp_relay_base() == ["service", "dhcp-relay"]
    assert mapper.get_dhcp_relay_server("10.0.0.1") == ["service", "dhcp-relay", "server", "10.0.0.1"]


# Test mapper config parsing
def test_dns_mapper_parse_empty_config():
    """Test DNS mapper with empty config."""
    from vyos_mappers.services.dns import DNSForwardingMapper
    mapper = DNSForwardingMapper("1.4")
    result = mapper.parse_full_config({})
    assert result["configured"] is False
    assert result["listen_addresses"] == []
    assert result["name_servers"] == []


def test_dns_mapper_parse_config():
    """Test DNS mapper parsing real config."""
    from vyos_mappers.services.dns import DNSForwardingMapper
    mapper = DNSForwardingMapper("1.4")
    config = {
        "service": {
            "dns": {
                "forwarding": {
                    "listen-address": ["192.168.1.1"],
                    "allow-from": ["192.168.1.0/24"],
                    "name-server": {
                        "8.8.8.8": {},
                        "8.8.4.4": {"port": "53"}
                    },
                    "cache-size": "10000",
                    "dnssec": "validate"
                }
            }
        }
    }
    result = mapper.parse_full_config(config)
    assert result["configured"] is True
    assert "192.168.1.1" in result["listen_addresses"]
    assert "192.168.1.0/24" in result["allow_from"]
    assert len(result["name_servers"]) == 2
    assert result["cache_size"] == "10000"
    assert result["dnssec"] == "validate"


def test_ntp_mapper_parse_config():
    """Test NTP mapper parsing real config."""
    from vyos_mappers.services.ntp import NTPMapper
    mapper = NTPMapper("1.4")
    config = {
        "service": {
            "ntp": {
                "server": {
                    "pool.ntp.org": {"pool": {}},
                    "time.google.com": {"prefer": {}}
                },
                "listen-address": ["192.168.1.1"]
            }
        }
    }
    result = mapper.parse_full_config(config)
    assert result["configured"] is True
    assert len(result["servers"]) == 2
    assert "192.168.1.1" in result["listen_addresses"]


def test_ssh_mapper_parse_config():
    """Test SSH mapper parsing real config."""
    from vyos_mappers.services.ssh import SSHMapper
    mapper = SSHMapper("1.4")
    config = {
        "service": {
            "ssh": {
                "port": "22",
                "listen-address": ["192.168.1.1"],
                "disable-password-authentication": {}
            }
        }
    }
    result = mapper.parse_full_config(config)
    assert result["configured"] is True
    assert result["port"] == "22"
    assert result["disable_password_authentication"] is True


def test_dhcp_relay_mapper_parse_config():
    """Test DHCP Relay mapper parsing real config."""
    from vyos_mappers.services.dhcp_relay import DHCPRelayMapper
    mapper = DHCPRelayMapper("1.4")
    config = {
        "service": {
            "dhcp-relay": {
                "server": ["10.0.0.1", "10.0.0.2"],
                "interface": ["eth0", "eth1"],
                "relay-options": {
                    "hop-count": "10"
                }
            }
        }
    }
    result = mapper.parse_full_config(config)
    assert result["dhcp_relay"]["configured"] is True
    assert "10.0.0.1" in result["dhcp_relay"]["servers"]
    assert "eth0" in result["dhcp_relay"]["interfaces"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
