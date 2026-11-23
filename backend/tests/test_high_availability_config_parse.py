"""High-availability parse_config: the read model the screen loads."""

from typing import cast

import pytest

from vyos_mappers import CommandMapperRegistry
from vyos_mappers.high_availability import HighAvailabilityMapper


def _parse(tree, version="1.5"):
    mapper = cast(HighAvailabilityMapper, CommandMapperRegistry.get_mapper("high_availability", version))
    return mapper.parse_config(tree)


def test_unconfigured_returns_the_same_shape():
    assert _parse({}) == {
        "disabled": False,
        "vrrp": {
            "global_parameters": {
                "startup_delay": None,
                "version": None,
                "garp": {
                    "interval": None, "master_delay": None, "master_refresh": None,
                    "master_refresh_repeat": None, "master_repeat": None,
                },
            },
            "snmp": False,
            "snmp_trap": False,
            "groups": [],
            "sync_groups": [],
        },
        "virtual_servers": [],
    }


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_vrrp_password_loads_masked(version):
    parsed = _parse({"high-availability": {"vrrp": {"group": {"G0": {
        "authentication": {"type": "plaintext-password", "password": "s3cret"},
    }}}}}, version)
    assert parsed["vrrp"]["groups"][0]["authentication"] == {"type": "plaintext-password", "password": "***"}
    assert "s3cret" not in repr(parsed)


def test_group_without_authentication_is_none():
    parsed = _parse({"high-availability": {"vrrp": {"group": {"G0": {"vrid": "1"}}}}})
    assert parsed["vrrp"]["groups"][0]["authentication"] is None


def test_group_reads_every_leaf():
    group = _parse({"high-availability": {"vrrp": {"group": {"G0": {
        "vrid": "10",
        "interface": "eth1",
        "address": {"192.0.2.1/24": {"interface": "eth1"}, "192.0.2.2/24": {}},
        "excluded-address": {"192.0.2.9/24": {"interface": "eth2"}},
        "priority": "200",
        "advertise-interval": "2",
        "preempt-delay": "5",
        "no-preempt": {},
        "peer-address": "192.0.2.20",
        "hello-source-address": "192.0.2.3",
        "rfc3768-compatibility": {},
        "disable": {},
        "description": "lab",
        "garp": {"interval": "1", "master-delay": "2", "master-refresh": "3",
                 "master-refresh-repeat": "4", "master-repeat": "5"},
        "health-check": {"failure-count": "3", "interval": "10", "script": "/config/scripts/hc.sh", "timeout": "5"},
        "track": {"interface": ["eth2", "eth3"], "exclude-vrrp-interface": {}},
        "transition-script": {"backup": "/b", "fault": "/f", "master": "/m", "stop": "/s"},
    }}}}})["vrrp"]["groups"][0]
    assert group == {
        "name": "G0",
        "vrid": "10",
        "interface": "eth1",
        "addresses": [
            {"address": "192.0.2.1/24", "interface": "eth1"},
            {"address": "192.0.2.2/24", "interface": None},
        ],
        "excluded_addresses": [{"address": "192.0.2.9/24", "interface": "eth2"}],
        "priority": "200",
        "advertise_interval": "2",
        "authentication": None,
        "preempt_delay": "5",
        "no_preempt": True,
        "peer_addresses": ["192.0.2.20"],
        "hello_source_address": "192.0.2.3",
        "rfc3768_compatibility": True,
        "disabled": True,
        "description": "lab",
        "garp": {"interval": "1", "master_delay": "2", "master_refresh": "3",
                 "master_refresh_repeat": "4", "master_repeat": "5"},
        "health_check": {"failure_count": "3", "interval": "10", "ping": None,
                         "script": "/config/scripts/hc.sh", "timeout": "5"},
        "track": {"interfaces": ["eth2", "eth3"], "exclude_vrrp_interface": True},
        "transition_script": {"backup": "/b", "fault": "/f", "master": "/m", "stop": "/s"},
    }


def test_globals_sync_groups_and_virtual_servers():
    parsed = _parse({"high-availability": {
        "disable": {},
        "vrrp": {
            "global-parameters": {"startup-delay": "5", "version": "3", "garp": {"interval": "1"}},
            "snmp": {"trap": {}},
            "sync-group": {"S0": {"member": "G0", "health-check": {"ping": "192.0.2.1"},
                                  "transition-script": {"master": "/m"}}},
        },
        "virtual-server": {"V0": {
            "address": "192.0.2.50", "port": "80", "protocol": "tcp", "algorithm": "round-robin",
            "real-server": {"192.0.2.60": {"port": "8080", "connection-timeout": "5",
                                           "health-check": {"script": "/hc"}}},
        }},
    }})
    assert parsed["disabled"] is True
    assert parsed["vrrp"]["global_parameters"]["startup_delay"] == "5"
    assert parsed["vrrp"]["global_parameters"]["version"] == "3"
    assert parsed["vrrp"]["global_parameters"]["garp"]["interval"] == "1"
    assert parsed["vrrp"]["snmp"] is True
    assert parsed["vrrp"]["snmp_trap"] is True
    assert parsed["vrrp"]["sync_groups"] == [{
        "name": "S0",
        "members": ["G0"],
        "health_check": {"failure_count": None, "interval": None, "ping": "192.0.2.1",
                         "script": None, "timeout": None},
        "transition_script": {"backup": None, "fault": None, "master": "/m", "stop": None},
    }]
    server = parsed["virtual_servers"][0]
    assert server["address"] == "192.0.2.50"
    assert server["real_servers"] == [{
        "address": "192.0.2.60", "port": "8080", "connection_timeout": "5", "health_check_script": "/hc",
    }]


def test_snmp_without_trap():
    parsed = _parse({"high-availability": {"vrrp": {"snmp": {}}}})
    assert parsed["vrrp"]["snmp"] is True
    assert parsed["vrrp"]["snmp_trap"] is False
