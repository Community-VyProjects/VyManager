"""PIMv6 GET /config parse lives on the mapper (issue #966)."""

from vyos_mappers.pim6.pim6_versions import get_pim6_mapper


def _tree():
    return {
        "protocols": {
            "pim6": {
                "interface": {
                    "eth0": {
                        "dr-priority": "9",
                        "hello": "15",
                        "no-unicast-bsm": {},
                        "mld": {
                            "disable": {},
                            "interval": "125",
                            "last-member-query-count": "2",
                            "last-member-query-interval": "1000",
                            "max-response-time": "5000",
                            "version": "2",
                            "join": {
                                "ff02::1": {"source": "2001:db8::10"},
                            },
                        },
                    }
                },
                "join-prune-interval": "60",
                "keep-alive-timer": "bad",
                "packets": "1",
                "register-suppress-time": "5",
                "rp": {
                    "address": {
                        "2001:db8::1": {
                            "group": ["ff0e::/16"],
                            "prefix-list6": "MLD-PL",
                        }
                    },
                    "keep-alive-timer": "240",
                },
            }
        }
    }


def test_parse_config_distinctive_fields():
    parsed = get_pim6_mapper("1.5").parse_config(_tree())
    iface = parsed["interfaces"][0]
    assert iface["name"] == "eth0"
    assert iface["dr_priority"] == 9
    assert iface["hello"] == 15
    assert iface["no_bsm"] is False
    assert iface["no_unicast_bsm"] is True
    assert iface["passive"] is False
    assert iface["mld"]["disabled"] is True
    assert iface["mld"]["interval"] == 125
    assert iface["mld"]["last_member_query_count"] == 2
    assert iface["mld"]["last_member_query_interval"] == 1000
    assert iface["mld"]["max_response_time"] == 5000
    assert iface["mld"]["version"] == 2
    assert iface["mld"]["joins"] == [{"group": "ff02::1", "sources": ["2001:db8::10"]}]
    assert parsed["join_prune_interval"] == 60
    assert parsed["keep_alive_timer"] is None
    assert parsed["packets"] == 1
    assert parsed["register_suppress_time"] == 5
    assert parsed["rp"]["keep_alive_timer"] == 240
    assert parsed["rp"]["addresses"] == [
        {
            "address": "2001:db8::1",
            "groups": ["ff0e::/16"],
            "prefix_list6": "MLD-PL",
        }
    ]


def test_empty_tree():
    parsed = get_pim6_mapper("1.4").parse_config({})
    assert parsed == {
        "interfaces": [],
        "join_prune_interval": None,
        "keep_alive_timer": None,
        "packets": None,
        "register_suppress_time": None,
        "rp": None,
    }
    assert parsed == get_pim6_mapper("1.5").parse_config({"protocols": {"pim6": {}}})



def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_pim6_mapper("1.4").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.4"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr("routers.pim6.pim6.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.pim6.pim6.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.pim6.pim6 import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/pim6/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["interfaces"][0]["mld"]["joins"][0]["sources"] == ["2001:db8::10"]
    assert body["rp"]["addresses"][0]["prefix_list6"] == expected["rp"]["addresses"][0]["prefix_list6"]
    assert body["keep_alive_timer"] is None
