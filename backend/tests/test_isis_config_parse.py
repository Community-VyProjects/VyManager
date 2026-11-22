"""IS-IS GET /config parse lives on the mapper."""

from vyos_mappers.isis.config_parse import MASKED_SECRET
from vyos_mappers.isis.isis_versions import get_isis_mapper


def _tree():
    return {
        "protocols": {
            "isis": {
                "net": "49.0001.1921.6800.1001.00",
                "level": "level-2",
                "metric-style": "wide",
                "dynamic-hostname": {},
                "lsp-mtu": "1492",
                "area-password": {"md5": "area-md5"},
                "domain-password": {"plaintext-password": "dom"},
                "ldp-sync": {"holddown": "30"},
                "spf-delay-ietf": {"init-delay": "50", "short-delay": "200"},
                "topology": "ipv6-unicast",
                "interface": {
                    "eth1": {
                        "metric": "10",
                        "hello-padding": {},
                        "network": {"point-to-point": {}},
                        "password": {"md5": "if-md5"},
                        "bfd": {"profile": "bfd1"},
                        "fast-reroute": {
                            "lfa": {
                                "level-1": {
                                    "enable": {},
                                    "exclude": {"interface": {"eth9": {}}},
                                }
                            },
                            "ti-lfa": {
                                "level-1": {"node-protection": {"link-fallback": {}}}
                            },
                            "remote-lfa": {
                                "level-2": {
                                    "maximum-metric": "1000",
                                    "tunnel": {"mpls-ldp": {}},
                                }
                            },
                        },
                    },
                    "eth0": {"passive": {}},
                },
                "redistribute": {
                    "ipv4": {
                        "static": {"level-1": {}},
                        "bgp": {"level-2": {"metric": "20", "route-map": "RM"}},
                    },
                    "ipv6": {"connected": {"level-1": {"metric": "5"}}},
                },
                "default-information": {
                    "originate": {
                        "ipv4": {"level-2": {"always": {}, "metric": "10"}},
                        "ipv6": {"level-1": {"route-map": "DEF"}},
                    }
                },
                "segment-routing": {
                    "global-block": {
                        "low-label-value": "16000",
                        "high-label-value": "23999",
                    },
                    "srv6": {"locator": "LOC1", "interface": "dum0"},
                    "prefix": {
                        "10.0.0.0/24": {
                            "index": {
                                "value": "10",
                                "explicit-null": {},
                                "no-php-flag": {},
                            }
                        }
                    },
                },
                "traffic-engineering": {
                    "enable": {},
                    "address": "1.1.1.1",
                    "export": {},
                },
                "fast-reroute": {
                    "lfa": {
                        "local": {
                            "load-sharing": {"disable": {"level-1": {}}},
                            "priority-limit": {"high": {"level-2": {}}},
                            "tiebreaker": {
                                "downstream": {"index": {"1": {"level-1": {}}}}
                            },
                        },
                        "remote": {"prefix-list": {"PL1": {"level-2": {}}}},
                    }
                },
            }
        }
    }


def test_bare_isis_root_is_enabled_with_the_same_shape():
    """``protocols isis {}`` still exists, so it is enabled; absent is not."""
    bare = get_isis_mapper("1.5").parse_config({"protocols": {"isis": {}}})
    absent = get_isis_mapper("1.4").parse_config({})
    assert bare["enabled"] is True
    assert absent["enabled"] is False
    assert bare["interfaces"] == []
    assert set(bare) == set(absent)
    assert bare["global_config"] == absent["global_config"]
    assert bare["segment_routing"] == absent["segment_routing"]
    assert bare["traffic_engineering"] == {"enabled": False, "address": None, "export": False}


def test_passwords_are_masked_and_never_returned():
    tree = _tree()
    isis = tree["protocols"]["isis"]
    isis["interface"]["eth0"]["password"] = {"plaintext-password": "if-plain"}
    parsed = get_isis_mapper("1.5").parse_config(tree)
    gc = parsed["global_config"]
    assert gc["area_password_md5"] == MASKED_SECRET
    assert gc["area_password_plaintext"] is None
    assert gc["domain_password_md5"] is None
    assert gc["domain_password_plaintext"] == MASKED_SECRET
    eth0, eth1 = parsed["interfaces"]
    assert (eth0["password_md5"], eth0["password_plaintext"]) == (None, MASKED_SECRET)
    assert (eth1["password_md5"], eth1["password_plaintext"]) == (MASKED_SECRET, None)
    flat = repr(parsed)
    for secret in ("area-md5", "dom", "if-md5", "if-plain"):
        assert f"'{secret}'" not in flat


def test_srv6_interface_node_msd_and_locator_names():
    tree = _tree()
    tree["protocols"]["isis"]["segment-routing"]["srv6"] = {
        "locator": "LOC1",
        "interface": "dum0",
        "node-msd": {"max-segs-left": "5", "max-end-d": "3"},
    }
    tree["protocols"]["segment-routing"] = {
        "srv6": {"locator": {"LOC2": {"prefix": "2001:db8:2::/48"}, "LOC1": {}}}
    }
    parsed = get_isis_mapper("1.5").parse_config(tree)
    sr = parsed["segment_routing"]
    assert sr["srv6_locator"] == "LOC1"
    assert sr["srv6_interface"] == "dum0"
    assert sr["srv6_node_msd"] == {
        "max_end_d": 3, "max_end_pop": None, "max_h_encaps": None, "max_segs_left": 5,
    }
    assert parsed["srv6_locator_names"] == ["LOC1", "LOC2"]
    assert get_isis_mapper("1.5").parse_config(_tree())["srv6_locator_names"] == []


def test_bare_load_sharing_disable_and_remote_prefix_list_parse():
    tree = _tree()
    frr = tree["protocols"]["isis"]["fast-reroute"]["lfa"]
    frr["local"]["load-sharing"] = {"disable": {}}
    frr["remote"] = {"prefix-list": {"PL9": {}}}
    parsed = get_isis_mapper("1.4").parse_config(tree)["fast_reroute"]
    assert parsed["lfa_load_sharing_disable"] is True
    assert parsed["lfa_load_sharing_disable_level1"] is False
    assert parsed["lfa_remote_prefix_list"] == [{"prefix_list": "PL9", "level": None}]
    leveled = get_isis_mapper("1.4").parse_config(_tree())["fast_reroute"]
    assert leveled["lfa_load_sharing_disable"] is False
    assert leveled["lfa_load_sharing_disable_level1"] is True


def test_bare_ldp_sync_is_enabled_without_holddown():
    tree = _tree()
    tree["protocols"]["isis"]["ldp-sync"] = {}
    gc = get_isis_mapper("1.5").parse_config(tree)["global_config"]
    assert gc["ldp_sync"] is True
    assert gc["ldp_sync_holddown"] is None
    absent = get_isis_mapper("1.5").parse_config({"protocols": {"isis": {}}})["global_config"]
    assert absent["ldp_sync"] is False


def test_bare_ti_lfa_node_is_enabled():
    tree = _tree()
    tree["protocols"]["isis"]["interface"]["eth0"]["fast-reroute"] = {"ti-lfa": {}}
    eth0 = get_isis_mapper("1.5").parse_config(tree)["interfaces"][0]
    assert eth0["ti_lfa"]["enabled"] is True
    assert eth0["ti_lfa"]["level1_enabled"] is False


def test_isis_parses_distinctive_fields():
    parsed = get_isis_mapper("1.5").parse_config(_tree())
    assert parsed["enabled"] is True
    assert parsed["global_config"]["net"] == "49.0001.1921.6800.1001.00"
    assert parsed["global_config"]["ldp_sync"] is True
    assert parsed["global_config"]["ldp_sync_holddown"] == 30
    assert parsed["global_config"]["lsp_mtu"] == 1492
    assert parsed["global_config"]["topology"] == "ipv6-unicast"
    assert parsed["global_config"]["area_password_md5"] == MASKED_SECRET
    assert parsed["global_config"]["spf_delay_ietf"]["init_delay"] == 50
    assert [iface["name"] for iface in parsed["interfaces"]] == ["eth0", "eth1"]
    eth1 = parsed["interfaces"][1]
    assert eth1["metric"] == 10
    assert eth1["point_to_point"] is True
    assert eth1["bfd_profile"] == "bfd1"
    assert eth1["lfa"]["level1_enabled"] is True
    assert eth1["lfa"]["level1_exclude_interfaces"] == ["eth9"]
    assert parsed["redistribute_ipv4"][0]["protocol"] == "bgp"
    assert parsed["redistribute_ipv4"][0]["metric"] == 20
    assert parsed["default_info_ipv4"][0]["always"] is True
    assert parsed["segment_routing"]["global_block_low"] == 16000
    assert parsed["segment_routing"]["prefixes"][0]["index_value"] == 10
    assert parsed["traffic_engineering"]["export"] is True
    assert parsed["fast_reroute"]["lfa_load_sharing_disable_level1"] is True
    assert parsed["fast_reroute"]["lfa_tiebreaker"][0]["index"] == "1"


def test_1_4_and_1_5_parse_15_only_nodes_the_same():
    """TI-LFA, remote LFA, and SRv6 are 1.5-only nodes. The parser reads them
    on every version, so the result does not differ."""
    tree = _tree()
    v14 = get_isis_mapper("1.4").parse_config(tree)
    v15 = get_isis_mapper("1.5").parse_config(tree)
    eth = next(iface for iface in v15["interfaces"] if iface["name"] == "eth1")
    eth14 = next(iface for iface in v14["interfaces"] if iface["name"] == "eth1")
    assert eth["ti_lfa"]["enabled"] is True
    assert eth["ti_lfa"]["level1_node_protection"] is True
    assert eth["ti_lfa"]["level1_link_fallback"] is True
    assert eth["remote_lfa"]["level2_enabled"] is True
    assert eth["remote_lfa"]["level2_max_metric"] == 1000
    assert eth["remote_lfa"]["level2_tunnel_mpls_ldp"] is True
    assert v15["segment_routing"]["srv6_locator"] == "LOC1"
    assert eth14["ti_lfa"] == eth["ti_lfa"]
    assert eth14["remote_lfa"] == eth["remote_lfa"]
    assert v14["segment_routing"]["srv6_locator"] == v15["segment_routing"]["srv6_locator"]



def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_isis_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.isis.isis.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.isis.isis.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.isis.isis import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/isis/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["enabled"] is True
    assert body["global_config"]["net"] == expected["global_config"]["net"]
    assert body["interfaces"][1]["ti_lfa"]["level1_link_fallback"] is True
    assert body["segment_routing"]["srv6_locator"] == "LOC1"
    assert body["global_config"]["area_password_md5"] == MASKED_SECRET
    assert body["interfaces"][1]["password_md5"] == MASKED_SECRET
    assert "if-md5" not in response.text and "area-md5" not in response.text
