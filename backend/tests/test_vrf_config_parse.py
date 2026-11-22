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


def _secret_tree():
    return {
        "vrf": {
            "name": {
                "BLUE": {
                    "protocols": {
                        "bgp": {
                            "system-as": "65000",
                            "neighbor": {"192.0.2.2": {"password": "nbr-pw", "remote-as": "65001"}},
                            "peer-group": {"PG": {"password": "pg-pw"}},
                        },
                        "isis": {
                            "net": "49.0001.1921.6800.1001.00",
                            "area-password": {"md5": "area-md5"},
                            "domain-password": {"plaintext-password": "dom-pw"},
                            "interface": {
                                "eth1": {"password": {"plaintext-password": "if-pw"}},
                                "eth2": {"password": {"md5": "if-md5"}},
                                "eth3": {},
                            },
                        },
                        "ospf": {
                            "interface": {
                                "eth1": {"authentication": {"plaintext-password": "ospf-pw"}},
                                "eth2": {
                                    "authentication": {
                                        "md5": {"key-id": {"1": {"md5-key": "k1"}, "2": {"md5-key": "k2"}}}
                                    }
                                },
                            },
                            "area": {
                                "0": {
                                    "virtual-link": {
                                        "1.1.1.1": {"authentication": {"plaintext-password": "vl-pw"}},
                                        "2.2.2.2": {
                                            "authentication": {"md5": {"key-id": {"5": {"md5-key": "vl-k5"}}}}
                                        },
                                    }
                                }
                            },
                        },
                    },
                    "service": {
                        "dhcp-server": {
                            "dynamic-dns-update": {
                                "send-updates": "enable",
                                "tsig-key": {
                                    "K1": {"algorithm": "hmac-sha256", "secret": "c2VjcmV0"},
                                },
                            },
                            "shared-network-name": {
                                "LAN": {
                                    "description": "lan",
                                    "disable": {},
                                    "subnet": {
                                        "10.1.0.0/24": {
                                            "option": {"default-router": "10.1.0.1"},
                                            "range": {"r1": {"start": "10.1.0.10", "stop": "10.1.0.20"}},
                                            "static-mapping": {"h1": {"ip-address": "10.1.0.5", "mac": "00:11:22:33:44:55"}},
                                        }
                                    },
                                }
                            },
                        }
                    },
                }
            }
        }
    }


SECRETS = ("nbr-pw", "pg-pw", "area-md5", "dom-pw", "if-pw", "if-md5", "ospf-pw", "k1", "k2", "vl-pw", "vl-k5", "c2VjcmV0")


def test_raw_configs_mask_every_secret_leaf():
    import json

    tree = _secret_tree()
    before = json.dumps(tree, sort_keys=True)
    for version in ("1.4", "1.5"):
        inst = get_vrf_mapper(version).parse_config(tree)["instances"][0]
        dumped = json.dumps(inst)
        for secret in SECRETS:
            assert secret not in dumped, (version, secret)

        bgp = inst["bgp"]["raw_config"]
        assert bgp["neighbor"]["192.0.2.2"] == {"password": "***", "remote-as": "65001"}
        assert bgp["peer-group"]["PG"]["password"] == "***"
        isis = inst["isis"]["raw_config"]
        assert isis["area-password"] == {"md5": "***"}
        assert isis["domain-password"] == {"plaintext-password": "***"}
        assert isis["interface"]["eth1"]["password"] == {"plaintext-password": "***"}
        assert isis["interface"]["eth2"]["password"] == {"md5": "***"}
        assert isis["interface"]["eth3"] == {}
        ospf = inst["ospf"]["raw_config"]
        assert ospf["interface"]["eth1"]["authentication"] == {"plaintext-password": "***"}
        assert ospf["interface"]["eth2"]["authentication"]["md5"]["key-id"] == {
            "1": {"md5-key": "***"},
            "2": {"md5-key": "***"},
        }
        links = ospf["area"]["0"]["virtual-link"]
        assert links["1.1.1.1"]["authentication"] == {"plaintext-password": "***"}
        assert links["2.2.2.2"]["authentication"]["md5"]["key-id"] == {"5": {"md5-key": "***"}}
        ddns = inst["dhcp"]["raw_config"]["dynamic-dns-update"]
        assert ddns["tsig-key"] == {"K1": {"algorithm": "hmac-sha256", "secret": "***"}}
        assert ddns["send-updates"] == "enable"
    # Masking copies; the cached device tree keeps its values.
    assert json.dumps(tree, sort_keys=True) == before


def test_dhcp_summary_comes_from_global_read_model():
    from vyos_mappers.dhcp_server.dhcp_server_versions import get_dhcp_server_mapper

    tree = _secret_tree()
    service = tree["vrf"]["name"]["BLUE"]["service"]
    inst = get_vrf_mapper("1.5").parse_config(tree)["instances"][0]
    dhcp = inst["dhcp"]
    assert dhcp["configured"] is True
    assert dhcp["disabled"] is False
    assert dhcp["shared_networks"] == [
        {
            "name": "LAN",
            "description": "lan",
            "disabled": True,
            "subnets": [
                {"prefix": "10.1.0.0/24", "default_router": "10.1.0.1", "ranges": 1, "static_mappings": 1}
            ],
        }
    ]
    glob = get_dhcp_server_mapper("1.5").parse_config({"service": service})
    assert [n["name"] for n in glob["shared_networks"]] == ["LAN"]


def test_bare_vrf_dhcp_server_is_configured():
    tree = {"vrf": {"name": {"BLUE": {"service": {"dhcp-server": {"disable": {}}}}}}}
    dhcp = get_vrf_mapper("1.5").parse_config(tree)["instances"][0]["dhcp"]
    assert dhcp == {"configured": True, "disabled": True, "shared_networks": [], "raw_config": {"disable": {}}}
    tree = {"vrf": {"name": {"BLUE": {"service": {"dhcp-server": None}}}}}
    dhcp = get_vrf_mapper("1.5").parse_config(tree)["instances"][0]["dhcp"]
    assert dhcp["configured"] is True and dhcp["raw_config"] == {}


def test_get_config_response_masks_secrets(monkeypatch):
    tree = _secret_tree()

    async def allow(*_args, **_kwargs):
        return None

    class SecretService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.vrf.vrf.require_read_permission", allow)
    monkeypatch.setattr("routers.vrf.vrf.get_session_vyos_service", lambda _req: SecretService())

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.vrf.vrf import router

    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).get("/vyos/vrf/config")
    assert response.status_code == 200, response.text
    for secret in SECRETS:
        assert secret not in response.text, secret
    inst = response.json()["instances"][0]
    assert inst["dhcp"]["raw_config"]["dynamic-dns-update"]["tsig-key"]["K1"]["secret"] == "***"
    assert inst["dhcp"]["shared_networks"][0]["subnets"][0]["static_mappings"] == 1
