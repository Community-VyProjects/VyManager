"""GET /config for firewall ipv4/ipv6 parses on the mapper, not in the router."""

import ast
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers.firewall.family import FirewallConfigResponse
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.firewall.family import FirewallFamilyMapper
from vyos_mappers.firewall.family_versions.v1_4 import FirewallFamilyMapperV1_4
from vyos_mappers.firewall.family_versions.v1_5 import FirewallFamilyMapperV1_5

ROUTER = Path(__file__).resolve().parents[1] / "routers" / "firewall" / "family.py"

RULE = {
    "action": "jump",
    "jump-target": "ZED",
    "description": "web",
    "protocol": "tcp",
    "disable": {},
    "source": {
        "address": "10.0.0.1",
        "geoip": {"country-code": "us", "inverse-match": {}},
        "group": {"address-group": "LAN"},
        "fqdn": "a.example",
    },
    "destination": {"port": "443", "group": {"dynamic-address-group": "DYN"}, "mac-address": "00:11:22:33:44:66"},
    "state": {"established": {}, "related": {}},
    "inbound-interface": {"interface-name": "eth1"},
    "outbound-interface": {"group": "WAN_IFS"},
    "set": {"dscp": "10", "ttl": "64", "hop-limit": "32", "tcp-mss": "1400"},
    "tcp": {"flags": {"syn": {}, "not": {"ack": {}}}, "mss": "500-1460"},
    "icmp": {"type-name": "echo-request", "code": 0},
    "icmpv6": {"type-name": "echo-reply", "type": 129},
    "dscp": {"8": {}, "16": {}},
    "gre": {"key": "9", "flags": {"checksum": {"unset": {}}, "key": {}}},
    "ipsec": {"match-ipsec-in": {}},
    "synproxy": {"tcp": {"mss": "1460"}},
    "ttl": {"eq": "64"},
    "hop-limit": {"lt": "200"},
    "add-address-to-group": {"source-address": {"address-group": "SEEN", "timeout": "1h"}},
}


def _family_tree():
    return {
        "forward": {"filter": {"default-action": "drop", "default-log": {}, "rule": {"20": {"action": "accept"}, "10": RULE}}},
        "input": {"filter": {"default-action": "accept"}},
        "name": {
            "ZED": {"default-action": "return", "rule": {"1": {"action": "accept"}}},
            "ABC": {"description": "c", "default-jump-target": "ZED", "rule": {"3": RULE}},
        },
        "prerouting": {"raw": {"default-action": "drop", "rule": {"7": {"action": "notrack"}}}},
    }


@pytest.mark.parametrize("mapper_cls", [FirewallFamilyMapperV1_4, FirewallFamilyMapperV1_5])
@pytest.mark.parametrize("family", ["ipv4", "ipv6"])
def test_parse_config_feeds_the_router_models(mapper_cls, family):
    mapper = mapper_cls("1.4" if mapper_cls is FirewallFamilyMapperV1_4 else "1.5", family)
    tree = {"firewall": {family: _family_tree(), "group": {"address-group": {}}}}
    config = FirewallConfigResponse(**mapper.parse_config(tree))

    assert config.forward.default_action == "drop"
    assert config.forward.default_log is True
    assert config.input.default_action == "accept"
    assert config.input.default_log is None
    assert config.output.rules == []
    assert [r.rule_number for r in config.forward.rules] == [10, 20]
    assert config.forward_rules == config.forward.rules
    assert [c.name for c in config.custom_chains] == ["ABC", "ZED"]
    assert config.custom_chains[0].default_jump_target == "ZED"
    assert config.custom_chains[0].rules[0].is_custom_chain is True
    assert config.custom_chains[0].rules[0].chain == "ABC"
    assert config.prerouting_raw is not None
    assert config.prerouting_raw.rules[0].chain == "prerouting_raw"
    assert config.total_rules == 2 + 2 + 1

    rule = config.forward.rules[0]
    assert rule.chain == "forward" and rule.is_custom_chain is False
    assert rule.disable is True and rule.log is False
    assert rule.source is not None and rule.source.geoip is not None
    assert rule.source.geoip.country_code == ["us"]
    assert rule.source.geoip.inverse_match is True
    assert rule.source.group == {"address-group": "LAN"}
    assert rule.source_fqdn == "a.example"
    assert rule.destination is not None and rule.destination.group == {"dynamic-address-group": "DYN"}
    assert rule.destination_mac_address == "00:11:22:33:44:66"
    assert rule.state is not None and rule.state.established and not rule.state.new
    assert rule.interface is not None
    assert rule.interface.inbound == "eth1" and rule.interface.outbound_group == "WAN_IFS"
    assert rule.tcp_flags == ["syn", "not ack"]
    assert rule.tcp_mss == "500-1460"
    assert rule.dscp_match == ["8", "16"]
    assert rule.gre is not None
    assert rule.gre.flags_checksum_unset is True and rule.gre.flags_checksum is False
    assert rule.gre.flags_key is True
    assert rule.ipsec is not None and rule.ipsec.match_ipsec_in is True and rule.ipsec.match_ipsec is False
    assert rule.synproxy_config is not None and rule.synproxy_config.tcp_mss == "1460"
    assert rule.add_address_to_group is not None
    assert rule.add_address_to_group.source_timeout == "1h"
    assert rule.set_tcp_mss == "1400"
    assert rule.packet_mods is not None and rule.packet_mods.dscp == "10"
    if family == "ipv4":
        assert rule.packet_mods.ttl == "64"
        assert rule.icmp_type_name == "echo-request" and rule.icmp_code == "0" and rule.icmp_type is None
        assert rule.ttl_match is not None and rule.ttl_match.eq == "64"
    else:
        assert rule.packet_mods.ttl == "32"
        assert rule.icmp_type_name == "echo-reply" and rule.icmp_type == "129" and rule.icmp_code is None
        assert rule.ttl_match is not None and rule.ttl_match.lt == "200"


@pytest.mark.parametrize("tree", [
    {},
    {"firewall": {}},
    {"firewall": {"ipv4": {}}},
    {"firewall": {"ipv4": {"prerouting": {"raw": {}}, "name": {}}}},
])
def test_parse_config_unconfigured_returns_the_same_shape(tree):
    payload = FirewallFamilyMapperV1_5("1.5", "ipv4").parse_config(tree)
    assert payload == FirewallConfigResponse(**payload).model_dump()
    config = FirewallConfigResponse(**payload)
    assert config.forward.rules == [] and config.custom_chains == []
    assert config.prerouting_raw is None
    assert config.total_rules == 0


def _client(monkeypatch, version, full_config):
    async def allow(*_args, **_kwargs):
        return None

    service = SimpleNamespace(
        get_version=lambda: version,
        get_full_config=lambda refresh=False: full_config,
    )
    monkeypatch.setattr("routers.firewall.family.require_read_permission", allow)
    monkeypatch.setattr("routers.firewall.family.get_session_vyos_service", lambda _req: service)
    from routers.firewall.family import build_router

    app = FastAPI()
    app.include_router(build_router("ipv4"))
    app.include_router(build_router("ipv6"))
    return TestClient(app)


@pytest.mark.parametrize("version", ["1.4", "2026.09.23-0027-rolling"])
@pytest.mark.parametrize("family", ["ipv4", "ipv6"])
def test_get_config_loads_the_mapper_from_the_registry(monkeypatch, version, family):
    seen = []
    real = CommandMapperRegistry.get_mapper

    def record(feature, ver):
        mapper = real(feature, ver)
        seen.append((feature, ver, type(mapper)))
        return mapper

    monkeypatch.setattr(CommandMapperRegistry, "get_mapper", staticmethod(record))
    calls = []
    real_parse = FirewallFamilyMapper.parse_config

    def parse(self, full_config):
        calls.append(self.family)
        return real_parse(self, full_config)

    monkeypatch.setattr(FirewallFamilyMapper, "parse_config", parse)
    client = _client(monkeypatch, version, {"firewall": {family: _family_tree()}})
    resp = client.get(f"/vyos/firewall/{family}/config")
    assert resp.status_code == 200, resp.text
    expected = FirewallFamilyMapperV1_4 if version == "1.4" else FirewallFamilyMapperV1_5
    assert seen == [(f"firewall_{family}", version, expected)]
    assert calls == [family]
    assert resp.json()["total_rules"] == 5


def test_router_does_not_walk_the_config_tree():
    source = ROUTER.read_text()
    tree = ast.parse(source)
    names = {node.name for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)}
    assert "parse_rule" not in names and "prerouting_section" not in names
    assert 'get("firewall"' not in source
    assert "full_config[" not in source
