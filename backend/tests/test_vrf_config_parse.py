"""VRF GET /config parse lives on the mapper (issue #966)."""

from vyos_mappers.vrf.vrf_versions import get_vrf_mapper


def _bfd_tree(bfd):
    return {
        "vrf": {
            "name": {
                "BLUE": {
                    "protocols": {
                        "static": {
                            "route": {
                                "10.0.0.0/24": {
                                    "next-hop": {
                                        "192.0.2.1": {"bfd": bfd},
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }


def _hop(parsed):
    return parsed["instances"][0]["static"]["routes"][0]["next_hops"][0]


def _sources(parsed):
    return _hop(parsed)["bfd_multi_hop_sources"]


def test_empty_vrf_tree():
    for version in ("1.4", "1.5"):
        parsed = get_vrf_mapper(version).parse_config({})
        assert parsed == {"bind_to_all": False, "instances": []}
        parsed = get_vrf_mapper(version).parse_config({"vrf": {}})
        assert parsed == {"bind_to_all": False, "instances": []}


def test_1_5_bfd_reads_source_address():
    tree = _bfd_tree(
        {
            "profile": "fast",
            "multi-hop": {"source-address": "192.0.2.10"},
        }
    )
    parsed = get_vrf_mapper("1.5").parse_config(tree)
    assert _sources(parsed) == [{"address": "192.0.2.10", "profile": None}]
    assert _hop(parsed)["bfd_profile"] == "fast"
    assert _hop(parsed)["bfd_enable"] is True
    assert _hop(parsed)["bfd_multi_hop"] is True


def test_1_4_bfd_reads_every_source_tag():
    tree = _bfd_tree(
        {"multi-hop": {"source": {"10.9.9.9": {"profile": "slow"}, "10.9.9.8": {}}}}
    )
    parsed = get_vrf_mapper("1.4").parse_config(tree)
    assert _sources(parsed) == [
        {"address": "10.9.9.9", "profile": "slow"},
        {"address": "10.9.9.8", "profile": None},
    ]


def test_each_version_reads_only_its_own_source_form():
    tree = _bfd_tree(
        {
            "multi-hop": {
                "source-address": "192.0.2.10",
                "source": {"10.9.9.9": {}},
            }
        }
    )
    assert _sources(get_vrf_mapper("1.5").parse_config(tree)) == [{"address": "192.0.2.10", "profile": None}]
    assert _sources(get_vrf_mapper("1.4").parse_config(tree)) == [{"address": "10.9.9.9", "profile": None}]


def test_parse_instance_subtrees_and_int_coercion():
    tree = {
        "vrf": {
            "bind-to-all": {},
            "name": {
                "BLUE": {
                    "description": "blue",
                    "disable": {},
                    "table": "100",
                    "vni": "5000",
                    "ip": {
                        "disable-forwarding": {},
                        "nht": {"no-resolve-via-default": {}},
                        "protocol": {"bgp": {"route-map": "RM1"}},
                    },
                    "protocols": {
                        "static": {
                            "route": {
                                "10.0.0.0/24": {
                                    "description": "lan",
                                    "next-hop": {
                                        "192.0.2.1": {"distance": "10"},
                                    },
                                    "blackhole": {"distance": "255", "tag": "1"},
                                }
                            }
                        },
                        "ospf": {
                            "parameters": {"router-id": "1.1.1.1"},
                            "area": {"0": {}},
                            "interface": {"eth1": {}},
                            "redistribute": {"connected": {}},
                        },
                        "bgp": {
                            "system-as": "65000",
                            "parameters": {"router-id": "1.1.1.1"},
                            "neighbor": {"192.0.2.2": {}},
                            "address-family": {
                                "ipv4-unicast": {
                                    "network": {
                                        "10.1.0.0/24": {
                                            "route-map": "OUT",
                                            "backdoor": {},
                                        }
                                    }
                                }
                            },
                        },
                        "isis": {"net": "49.0001.1921.6800.1001.00"},
                    },
                    "service": {
                        "dhcp-server": {
                            "shared-network-name": {
                                "LAN": {
                                    "subnet": {
                                        "10.1.0.0/24": {
                                            "option": {"default-router": "10.1.0.1"},
                                            "range": {"r1": {}, "r2": {}},
                                        }
                                    }
                                }
                            }
                        }
                    },
                }
            },
        }
    }
    parsed = get_vrf_mapper("1.5").parse_config(tree)
    assert parsed["bind_to_all"] is True
    inst = parsed["instances"][0]
    assert inst["name"] == "BLUE"
    assert inst["disabled"] is True
    assert inst["table"] == 100
    assert inst["vni"] == 5000
    assert inst["ip"]["disable_forwarding"] is True
    assert inst["ip"]["nht_no_resolve_via_default"] is True
    assert inst["ip"]["protocol_route_maps"] == [
        {"protocol": "bgp", "route_map": "RM1"}
    ]
    assert inst["ipv6"]["disable_forwarding"] is False
    assert inst["static"]["routes"][0]["next_hops"][0]["distance"] == 10
    route = inst["static"]["routes"][0]
    assert route["route_type"] == "ipv4"
    assert route["description"] == "lan"
    assert (route["blackhole"], route["blackhole_distance"], route["blackhole_tag"]) == (True, 255, 1)
    assert route["reject"] is False
    assert inst["static"]["routes6"] == []
    assert inst["ospf"]["router_id"] == "1.1.1.1"
    assert inst["ospf"]["areas"] == ["0"]
    assert inst["ospf"]["redistribute"] == ["connected"]
    assert inst["bgp"]["system_as"] == 65000
    assert inst["bgp"]["address_families"][0]["networks"][0]["backdoor"] is True
    assert inst["isis"]["net"] == "49.0001.1921.6800.1001.00"
    assert inst["rpki"] is None
    assert inst["failover"] is None
    assert inst["ospfv3"] is None
    assert inst["dhcpv6"] is None
    subnet = inst["dhcp"]["shared_networks"][0]["subnets"][0]
    assert subnet["default_router"] == "10.1.0.1"
    assert subnet["ranges"] == 2

    bad_as = {
        "vrf": {
            "name": {
                "RED": {"protocols": {"bgp": {"system-as": "not-a-number"}}}
            }
        }
    }
    assert get_vrf_mapper("1.4").parse_config(bad_as)["instances"][0]["bgp"]["system_as"] is None



def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _bfd_tree({"multi-hop": {"source-address": "192.0.2.10"}})
    tree["vrf"]["bind-to-all"] = {}
    expected = get_vrf_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.vrf.vrf.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.vrf.vrf.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.vrf.vrf import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/vrf/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["bind_to_all"] is True
    assert body["instances"][0]["name"] == expected["instances"][0]["name"]
    hop = body["instances"][0]["static"]["routes"][0]["next_hops"][0]
    assert hop["bfd_multi_hop_sources"] == [{"address": "192.0.2.10", "profile": None}]
    assert hop["address"] == "192.0.2.1"
