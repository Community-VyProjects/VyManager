"""PIM GET /config parse lives on the mapper (issue #966)."""

from vyos_mappers.pim.pim_versions import get_pim_mapper


def _tree():
    return {
        "protocols": {
            "pim": {
                "ecmp": {"rebalance": {}},
                "igmp": {"watermark-warning": "100"},
                "interface": {
                    "eth0": {
                        "bfd": {"profile": "fast"},
                        "dr-priority": "5",
                        "hello": "30",
                        "no-bsm": {},
                        "passive": {},
                        "source-address": "192.0.2.1",
                        "igmp": {
                            "disable": {},
                            "query-interval": "125",
                            "query-max-response-time": "100",
                            "version": "3",
                            "join": {
                                "224.0.0.1": {"source-address": ["192.0.2.10", "192.0.2.11"]},
                            },
                        },
                    }
                },
                "join-prune-interval": "60",
                "keep-alive-timer": "210",
                "no-v6-secondary": {},
                "packets": "3",
                "register-accept-list": {"prefix-list": "REG-PL"},
                "register-suppress-time": "bad",
                "rp": {
                    "address": {
                        "192.0.2.50": {"group": "224.1.0.0/16"},
                    },
                    "keep-alive-timer": "180",
                },
                "spt-switchover": {
                    "infinity-and-beyond": {"prefix-list": "SPT-PL"},
                },
                "ssm": {"prefix-list": "SSM-PL"},
            }
        }
    }


def test_parse_config_distinctive_fields():
    parsed = get_pim_mapper("1.4").parse_config(_tree())
    assert parsed["ecmp"] is True
    assert parsed["ecmp_rebalance"] is True
    assert parsed["igmp_watermark_warning"] == 100
    iface = parsed["interfaces"][0]
    assert iface["name"] == "eth0"
    assert iface["bfd"] is True
    assert iface["bfd_profile"] == "fast"
    assert iface["dr_priority"] == 5
    assert iface["hello"] == 30
    assert iface["no_bsm"] is True
    assert iface["no_unicast_bsm"] is False
    assert iface["passive"] is True
    assert iface["source_address"] == "192.0.2.1"
    assert iface["igmp"]["disabled"] is True
    assert iface["igmp"]["query_interval"] == 125
    assert iface["igmp"]["version"] == 3
    assert iface["igmp"]["joins"] == [
        {"group": "224.0.0.1", "source_addresses": ["192.0.2.10", "192.0.2.11"]}
    ]
    assert parsed["join_prune_interval"] == 60
    assert parsed["keep_alive_timer"] == 210
    assert parsed["no_v6_secondary"] is True
    assert parsed["packets"] == 3
    assert parsed["register_accept_list_prefix_list"] == "REG-PL"
    assert parsed["register_suppress_time"] is None
    assert parsed["rp"]["addresses"] == [
        {"address": "192.0.2.50", "groups": ["224.1.0.0/16"]}
    ]
    assert parsed["rp"]["keep_alive_timer"] == 180
    assert parsed["spt_switchover"] == {
        "infinity_and_beyond": True,
        "prefix_list": "SPT-PL",
    }
    assert parsed["ssm_prefix_list"] == "SSM-PL"


def test_ecmp_string_value_is_not_enabled():
    parsed = get_pim_mapper("1.5").parse_config(
        {"protocols": {"pim": {"ecmp": "yes"}}}
    )
    assert parsed["ecmp"] is False
    assert parsed["ecmp_rebalance"] is False


def test_spt_flag_present_as_none():
    parsed = get_pim_mapper("1.5").parse_config(
        {"protocols": {"pim": {"spt-switchover": {"infinity-and-beyond": None}}}}
    )
    assert parsed["spt_switchover"] == {
        "infinity_and_beyond": True,
        "prefix_list": None,
    }


def test_empty_tree():
    parsed = get_pim_mapper("1.5").parse_config({})
    assert parsed["ecmp"] is False
    assert parsed["interfaces"] == []
    assert parsed["rp"] is None
    assert parsed["spt_switchover"] is None
    assert parsed["igmp_watermark_warning"] is None
    assert parsed == get_pim_mapper("1.4").parse_config({"protocols": {"pim": None}})



def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_pim_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.pim.pim.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.pim.pim.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.pim.pim import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/pim/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["ecmp"] is True
    assert body["ecmp_rebalance"] is expected["ecmp_rebalance"]
    assert body["interfaces"][0]["igmp"]["joins"][0]["group"] == "224.0.0.1"
    assert body["spt_switchover"]["prefix_list"] == "SPT-PL"
    assert body["register_suppress_time"] is None
