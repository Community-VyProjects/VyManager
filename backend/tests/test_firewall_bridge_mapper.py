"""Bridge firewall mapper paths (audit D2-01).

Both VyOS 1.4 (sagitta) and 1.5 require the ``filter`` keyword for base
chains: ``set firewall bridge forward filter rule ...``. The mapper used
to emit the keyword only for 1.5, so every base-chain rule sent to a 1.4
device was an invalid path and the commit was rejected.
"""

import pytest

from vyos_mappers.firewall.bridge import BridgeFirewallMapper


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_base_chain_paths_include_filter(version):
    mapper = BridgeFirewallMapper(version)
    assert mapper.get_chain_path("forward") == ["firewall", "bridge", "forward", "filter"]
    assert mapper.get_rule_path("forward", 10) == [
        "firewall", "bridge", "forward", "filter", "rule", "10",
    ]
    assert mapper.get_chain_default_action("forward", "drop") == [
        "firewall", "bridge", "forward", "filter", "default-action", "drop",
    ]


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_custom_chain_paths_have_no_filter(version):
    mapper = BridgeFirewallMapper(version)
    assert mapper.get_chain_path("MY-CHAIN") == ["firewall", "bridge", "name", "MY-CHAIN"]
    assert mapper.get_rule_path("MY-CHAIN", 5) == [
        "firewall", "bridge", "name", "MY-CHAIN", "rule", "5",
    ]


def test_supported_chains_still_version_gated():
    assert BridgeFirewallMapper("1.4").get_supported_chains() == ["forward"]
    assert set(BridgeFirewallMapper("1.5").get_supported_chains()) == {
        "forward", "input", "output", "prerouting",
    }
