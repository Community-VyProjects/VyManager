"""Firewall IPv4/IPv6 stacks share one family implementation (issue #662)."""

from pathlib import Path

from vyos_mappers.firewall.family_versions import get_firewall_family_mapper
from vyos_builders.firewall.family import FirewallFamilyBatchBuilder
from vyos_builders.firewall.ipv4 import FirewallIPv4BatchBuilder
from vyos_builders.firewall.ipv6 import FirewallIPv6BatchBuilder


def test_ipv4_and_ipv6_paths_differ_only_by_family():
    v4 = get_firewall_family_mapper("1.5", "ipv4")
    v6 = get_firewall_family_mapper("1.5", "ipv6")
    p4 = v4.get_base_chain_rule("forward", 10)
    p6 = v6.get_base_chain_rule("forward", 10)
    assert p4 == ["firewall", "ipv4", "forward", "filter", "rule", "10"]
    assert p6 == ["firewall", "ipv6", "forward", "filter", "rule", "10"]


def test_hop_leaf_is_ttl_on_ipv4_and_hop_limit_on_ipv6():
    v4 = get_firewall_family_mapper("1.5", "ipv4")
    v6 = get_firewall_family_mapper("1.5", "ipv6")
    assert v4.get_rule_set_ttl("forward", 1, "64")[-2:] == ["ttl", "64"]
    assert v6.get_rule_set_hop_limit("forward", 1, "64")[-2:] == ["hop-limit", "64"]
    assert v6.get_rule_set_ttl("forward", 1, "64")[-2:] == ["hop-limit", "64"]


def test_icmp_leaf_follows_family():
    v4 = get_firewall_family_mapper("1.5", "ipv4")
    v6 = get_firewall_family_mapper("1.5", "ipv6")
    assert "icmp" in v4.get_rule_icmp_type_name("forward", 1, "echo-request")
    assert "icmpv6" in v6.get_rule_icmpv6_type_name("forward", 1, "echo-request")


def _firewall_config_with_prerouting():
    raw = {
        "raw": {
            "default-action": "drop",
            "rule": {"10": {"action": "drop"}},
        }
    }
    return {
        "firewall": {
            "ipv4": {"prerouting": raw},
            "ipv6": {"prerouting": raw},
        }
    }


def test_get_config_prerouting_raw_is_ipv4_only(monkeypatch):
    """IPv6 GET /config must not fill prerouting_raw even if that node exists."""
    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_full_config(self, refresh=False):
            return _firewall_config_with_prerouting()

    monkeypatch.setattr("routers.firewall.family.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.firewall.family.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.firewall.family import build_router

    app = FastAPI()
    app.include_router(build_router("ipv4"))
    app.include_router(build_router("ipv6"))
    client = TestClient(app)

    ipv6 = client.get("/vyos/firewall/ipv6/config")
    assert ipv6.status_code == 200, ipv6.text
    assert ipv6.json()["prerouting_raw"] is None

    ipv4 = client.get("/vyos/firewall/ipv4/config")
    assert ipv4.status_code == 200, ipv4.text
    assert ipv4.json()["prerouting_raw"] is not None
    assert ipv4.json()["prerouting_raw"]["default_action"] == "drop"


def test_prerouting_is_ipv4_only():
    v4 = get_firewall_family_mapper("1.5", "ipv4")
    v6 = get_firewall_family_mapper("1.5", "ipv6")
    assert v4.get_prerouting_raw_rule(1)[1] == "ipv4"
    try:
        v6.get_prerouting_raw_rule(1)
        raised = False
    except ValueError:
        raised = True
    assert raised


def test_builders_are_thin_family_wrappers():
    assert issubclass(FirewallIPv4BatchBuilder, FirewallFamilyBatchBuilder)
    assert issubclass(FirewallIPv6BatchBuilder, FirewallFamilyBatchBuilder)
    v4 = FirewallIPv4BatchBuilder("1.5")
    v6 = FirewallIPv6BatchBuilder("1.5")
    assert v4.family == "ipv4"
    assert v6.family == "ipv6"
    assert v4.get_capabilities()["features"]["prerouting_raw"]["supported"] is True
    assert v6.get_capabilities()["features"]["prerouting_raw"]["supported"] is False
    assert v4.get_capabilities()["features"]["icmp_matching"]["supported"] is True
    assert v6.get_capabilities()["features"]["icmpv6_matching"]["supported"] is True


def test_ipv4_ipv6_modules_do_not_reimplement_the_stack():
    root = Path(__file__).resolve().parents[1]
    for rel in (
        "vyos_mappers/firewall/ipv4.py",
        "vyos_mappers/firewall/ipv6.py",
        "vyos_builders/firewall/ipv4.py",
        "vyos_builders/firewall/ipv6.py",
        "routers/firewall/ipv4.py",
        "routers/firewall/ipv6.py",
    ):
        lines = (root / rel).read_text().splitlines()
        assert len(lines) < 20, rel
