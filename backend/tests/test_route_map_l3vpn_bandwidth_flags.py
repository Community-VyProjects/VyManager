"""Route-map set l3vpn-nexthop encapsulation gre and extcommunity
bandwidth-non-transitive (#976).

Lab-checked with cli-shell-api validateTmplPath on 1.4 (100.64.64.50) and
1.5 (100.64.64.5): ``set l3vpn-nexthop encapsulation gre``, the
``set l3vpn-nexthop`` subtree the delete op removes, and
``set extcommunity bandwidth-non-transitive`` are VALID on both. Both leaves
are valueless. VyOS conf_mode/policy.py rejects bandwidth-non-transitive
without ``set extcommunity bandwidth``.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers.route_map.route_map import parse_set_actions
from vyos_builders.route_map.route_map_batch_builder import RouteMapBatchBuilder

NAME = "RM"
RULE = "10"
RULE_PATH = ["policy", "route-map", NAME, "rule", RULE]

PATH_CASES = [
    (
        "set_extcommunity_bandwidth_non_transitive",
        (NAME, RULE),
        "set",
        RULE_PATH + ["set", "extcommunity", "bandwidth-non-transitive"],
    ),
    (
        "set_l3vpn_nexthop_encapsulation_gre",
        (NAME, RULE),
        "set",
        RULE_PATH + ["set", "l3vpn-nexthop", "encapsulation", "gre"],
    ),
    ("delete_set_l3vpn_nexthop", (NAME, RULE), "delete", RULE_PATH + ["set", "l3vpn-nexthop"]),
]


def _ops(operations):
    return [(item["op"], item["path"]) for item in operations]


@pytest.mark.parametrize("version", ["1.4", "1.5"])
@pytest.mark.parametrize("method, args, op, expected_path", PATH_CASES)
def test_flag_paths_on_both_versions(version, method, args, op, expected_path):
    builder = RouteMapBatchBuilder(version=version)
    getattr(builder, method)(*args)
    assert _ops(builder.get_operations()) == [(op, expected_path)]


def test_parse_reads_both_flags():
    set_actions = parse_set_actions(
        {
            "extcommunity": {"bandwidth": "100", "bandwidth-non-transitive": {}},
            "l3vpn-nexthop": {"encapsulation": {"gre": {}}},
        }
    )
    assert set_actions.extcommunity_bandwidth == "100"
    assert set_actions.extcommunity_bandwidth_non_transitive is True
    assert set_actions.l3vpn_nexthop_encapsulation_gre is True


def test_parse_defaults_both_flags_off():
    set_actions = parse_set_actions({"extcommunity": {"bandwidth": "100"}, "l3vpn-nexthop": {}})
    assert set_actions.extcommunity_bandwidth_non_transitive is False
    assert set_actions.l3vpn_nexthop_encapsulation_gre is False


def _client(monkeypatch, captured):
    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return "1.5"

        def execute_batch(self, batch):
            captured.append(batch.get_operations())
            return SimpleNamespace(status=200, result="", error=None)

    monkeypatch.setattr("routers.route_map.route_map.require_write_permission", allow)
    monkeypatch.setattr(
        "routers.route_map.route_map.get_session_vyos_service",
        lambda _req: Service(),
    )
    from routers.route_map.route_map import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def _reorder(client, set_actions):
    return client.post(
        "/vyos/route-map/reorder",
        json={
            "route_map_name": NAME,
            "rules": [
                {
                    "old_number": 10,
                    "new_number": 20,
                    "rule_data": {"rule_number": 10, "action": "permit", "set": set_actions},
                }
            ],
        },
    )


def test_reorder_rewrites_both_flags(monkeypatch):
    """Drag-save deletes the rule and recreates it. Dropping a flag here
    wipes a value the batch save just wrote."""
    captured = []
    response = _reorder(
        _client(monkeypatch, captured),
        {
            "extcommunity_bandwidth": "100",
            "extcommunity_bandwidth_non_transitive": True,
            "l3vpn_nexthop_encapsulation_gre": True,
        },
    )
    assert response.status_code == 200, response.text
    ops = _ops(captured[0])
    rule = ["policy", "route-map", NAME, "rule", "20", "set"]
    assert ("set", rule + ["extcommunity", "bandwidth", "100"]) in ops
    assert ("set", rule + ["extcommunity", "bandwidth-non-transitive"]) in ops
    assert ("set", rule + ["l3vpn-nexthop", "encapsulation", "gre"]) in ops


def test_reorder_omits_flags_that_are_off(monkeypatch):
    captured = []
    response = _reorder(_client(monkeypatch, captured), {"extcommunity_bandwidth": "100"})
    assert response.status_code == 200, response.text
    paths = [item["path"] for item in captured[0]]
    assert not any("bandwidth-non-transitive" in path for path in paths)
    assert not any("l3vpn-nexthop" in path for path in paths)


@pytest.mark.parametrize(
    "op, expected_tail",
    [
        ("set_extcommunity_bandwidth_non_transitive", ["set", "extcommunity", "bandwidth-non-transitive"]),
        ("set_l3vpn_nexthop_encapsulation_gre", ["set", "l3vpn-nexthop", "encapsulation", "gre"]),
        ("delete_set_l3vpn_nexthop", ["set", "l3vpn-nexthop"]),
    ],
)
def test_batch_dispatches_flag_ops(monkeypatch, op, expected_tail):
    """The rule modal sends these op names; the batch endpoint must resolve them."""
    captured = []
    response = _client(monkeypatch, captured).post(
        "/vyos/route-map/batch",
        json={"name": NAME, "rule_number": 10, "operations": [{"op": op}]},
    )
    assert response.status_code == 200, response.text
    assert [item["path"] for item in captured[0]] == [RULE_PATH + expected_tail]
