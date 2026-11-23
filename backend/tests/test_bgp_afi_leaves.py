"""BGP address-family leaves are gated per AFI, from one mapper table.

Read from node.def on VyOS 1.4 (100.64.64.4) and 1.5 rolling (100.64.64.5);
both labs have the same leaves per AFI. flowspec has no network or
aggregate-address, the vpn network node has only rd and label, and the
neighbor address-family leaves differ by AFI (no weight on flowspec, no
default-originate on vpn or l2vpn-evpn, ...).
"""

import inspect

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from vyos_builders.bgp.bgp_batch_builder import BgpBatchBuilder
from vyos_mappers.bgp.bgp_versions import get_bgp_mapper

VERSIONS = ("1.4.3", "2026.09.23-rolling")
ROUTER = "routers.bgp.bgp"

# address-family <afi> network <prefix> children, per lab.
NETWORK_CHILDREN = {
    "ipv4-unicast": {"backdoor", "route-map"},
    "ipv6-unicast": {"path-limit", "route-map"},
    "ipv4-multicast": {"backdoor", "route-map"},
    "ipv6-multicast": {"path-limit", "route-map"},
    "ipv4-labeled-unicast": {"backdoor", "route-map"},
    "ipv6-labeled-unicast": {"backdoor", "route-map"},
    "ipv4-vpn": {"label", "rd"},
    "ipv6-vpn": {"label", "rd"},
}
AGGREGATE_AFIS = {
    "ipv4-unicast", "ipv6-unicast", "ipv4-multicast", "ipv6-multicast",
    "ipv4-labeled-unicast", "ipv6-labeled-unicast",
}
FLOWSPEC_NEIGHBOR_LEAVES = {
    "filter-list", "prefix-list", "route-map", "route-reflector-client",
    "route-server-client", "soft-reconfiguration",
}
EVPN_NEIGHBOR_LEAVES = {
    "allowas-in", "attribute-unchanged", "nexthop-self", "route-map",
    "route-reflector-client", "route-server-client", "soft-reconfiguration",
}


def _args(method, afi):
    """Sample args: the AFI in the `afi` slot, a placeholder elsewhere."""
    params = list(inspect.signature(method).parameters)
    return [afi if p == "afi" else "10" if p in ("value", "distance") else "x" for p in params]


def _af_ops(builder, prefix):
    return [
        (name, method)
        for name, method in inspect.getmembers(builder, inspect.ismethod)
        if name.startswith(("set_", "delete_")) and prefix in name
        and "afi" in inspect.signature(method).parameters
    ]


@pytest.mark.parametrize("version", VERSIONS)
@pytest.mark.parametrize("kind", ["neighbor", "peer_group"])
def test_every_neighbor_af_op_follows_the_leaf_table(version, kind):
    mapper = get_bgp_mapper(version)
    afis = getattr(mapper, f"{kind}_address_families")()
    leaves_of = getattr(mapper, f"{kind}_af_leaves")
    checked = 0
    for name, _ in _af_ops(BgpBatchBuilder(version=version), f"_{kind}_af"):
        probe = BgpBatchBuilder(version=version)
        getattr(probe, name)(*_args(getattr(probe, name), "ipv6-unicast"))
        path = probe.get_operations()[0]["path"]
        leaf = path[6] if len(path) > 6 else None
        for afi in afis + ["ipv4-flowspec", "ipv4-multicast", "link-state"]:
            builder = BgpBatchBuilder(version=version)
            method = getattr(builder, name)
            ok = afi in afis and (leaf is None or leaf in leaves_of(afi))
            if ok:
                method(*_args(method, afi))
                assert builder.get_operations()[0]["path"][5] == afi
            else:
                with pytest.raises(ValueError, match="not supported"):
                    method(*_args(method, afi))
            checked += 1
    assert checked > 50


@pytest.mark.parametrize("version", VERSIONS)
def test_neighbor_af_leaf_missing_on_the_afi_raises(version):
    builder = BgpBatchBuilder(version=version)
    for name, afi in [
        ("set_neighbor_af_weight", "ipv4-flowspec"),
        ("set_neighbor_af_default_originate", "ipv4-vpn"),
        ("set_neighbor_af_default_originate", "l2vpn-evpn"),
        ("set_neighbor_af_maximum_prefix", "l2vpn-evpn"),
        ("set_neighbor_af_as_override", "ipv6-flowspec"),
        ("set_neighbor_af_nexthop_self", "ipv4-flowspec"),
        ("set_peer_group_af_maximum_prefix", "l2vpn-evpn"),
        ("set_peer_group_af_route_map_import", "ipv4-multicast"),
        ("set_peer_group_af", "ipv4-flowspec"),
        ("set_neighbor_af", "link-state"),
    ]:
        method = getattr(builder, name)
        with pytest.raises(ValueError, match="not supported"):
            method(*_args(method, afi))
    assert builder.get_operations() == []
    mapper = get_bgp_mapper(version)
    assert mapper.neighbor_af_leaves("ipv4-flowspec") == frozenset(FLOWSPEC_NEIGHBOR_LEAVES)
    assert mapper.neighbor_af_leaves("l2vpn-evpn") == frozenset(EVPN_NEIGHBOR_LEAVES)
    assert "nexthop-local" in mapper.neighbor_af_leaves("ipv6-multicast")
    assert "capability" not in mapper.neighbor_af_leaves("ipv6-multicast")
    assert "default-originate" not in mapper.neighbor_af_leaves("ipv6-vpn")
    for afi in mapper.peer_group_address_families():
        assert mapper.peer_group_af_leaves(afi) == mapper.neighbor_af_leaves(afi)


@pytest.mark.parametrize("version", VERSIONS)
def test_network_and_aggregate_follow_the_lab_afis(version):
    mapper = get_bgp_mapper(version)
    for afi in mapper.address_families():
        children = NETWORK_CHILDREN.get(afi, set())
        if afi in NETWORK_CHILDREN:
            assert mapper.get_af_network(afi, "10.0.0.0/8")[-2:] == ["network", "10.0.0.0/8"]
            assert mapper.get_af_network_delete(afi, "10.0.0.0/8")[-1] == "10.0.0.0/8"
        else:
            with pytest.raises(ValueError, match="not supported"):
                mapper.get_af_network(afi, "10.0.0.0/8")
            with pytest.raises(ValueError, match="not supported"):
                mapper.get_af_network_delete(afi, "10.0.0.0/8")
        for child, call in [
            ("route-map", lambda: mapper.get_af_network_route_map(afi, "10.0.0.0/8", "RM")),
            ("backdoor", lambda: mapper.get_af_network_backdoor(afi, "10.0.0.0/8")),
            ("path-limit", lambda: mapper.get_af_network_path_limit(afi, "10.0.0.0/8", "1")),
            ("label", lambda: mapper.get_af_network_label(afi, "10.0.0.0/8", "16")),
            ("rd", lambda: mapper.get_af_network_rd(afi, "10.0.0.0/8", "1:1")),
        ]:
            if child in children:
                assert child in call()
            else:
                with pytest.raises(ValueError, match="not supported"):
                    call()
        aggregate = [
            lambda: mapper.get_af_aggregate_address(afi, "10.0.0.0/8"),
            lambda: mapper.get_af_aggregate_address_as_set(afi, "10.0.0.0/8"),
            lambda: mapper.get_af_aggregate_address_summary_only(afi, "10.0.0.0/8"),
            lambda: mapper.get_af_aggregate_address_route_map(afi, "10.0.0.0/8", "RM"),
            lambda: mapper.get_af_aggregate_address_delete(afi, "10.0.0.0/8"),
        ]
        for call in aggregate:
            if afi in AGGREGATE_AFIS:
                assert "aggregate-address" in call()
            else:
                with pytest.raises(ValueError, match="not supported"):
                    call()


@pytest.mark.parametrize("version", VERSIONS)
def test_other_af_leaves_follow_the_lab_afis(version):
    mapper = get_bgp_mapper(version)
    assert mapper.get_af_distance_external("ipv4-multicast", "20")[-2:] == ["external", "20"]
    with pytest.raises(ValueError, match="not supported"):
        mapper.get_af_distance_external("ipv4-labeled-unicast", "20")
    assert mapper.get_af_local_install_delete("ipv4-flowspec")[-1] == "local-install"
    with pytest.raises(ValueError, match="not supported"):
        mapper.get_af_local_install_delete("ipv4-unicast")
    with pytest.raises(ValueError, match="not supported"):
        mapper.get_af_import_vpn("ipv4-multicast")
    with pytest.raises(ValueError, match="not supported"):
        mapper.get_af_redistribute_delete("ipv4-multicast", "connected")
    assert mapper.get_af_redistribute_delete("ipv4-unicast", "connected")[-1] == "connected"


def test_capabilities_read_the_leaf_tables(monkeypatch):
    """A handwritten list in get_capabilities() would ignore this."""
    from vyos_mappers.bgp.bgp import BgpMapper

    monkeypatch.setattr(BgpMapper, "_AF_LEAVES", {"ipv4-unicast": ("network",)})
    monkeypatch.setattr(BgpMapper, "_NEIGHBOR_AF_LEAVES", {"ipv4-unicast": ("weight",)})
    monkeypatch.setattr(BgpMapper, "_PEER_GROUP_AFIS", ("ipv4-unicast",))
    for version in VERSIONS:
        caps = BgpBatchBuilder(version=version).get_capabilities()
        assert caps["address_family_types"] == {
            "neighbor": ["ipv4-unicast"],
            "peer_group": ["ipv4-unicast"],
            "global": ["ipv4-unicast"],
        }
        assert caps["address_family_leaves"] == {
            "neighbor": {"ipv4-unicast": ["weight"]},
            "peer_group": {"ipv4-unicast": ["weight"]},
            "global": {"ipv4-unicast": ["network"]},
        }


@pytest.mark.parametrize("version", VERSIONS)
def test_capabilities_keep_the_afi_order(version):
    caps = BgpBatchBuilder(version=version).get_capabilities()
    assert caps["address_family_types"]["global"] == [
        "ipv4-unicast", "ipv6-unicast", "ipv4-multicast", "ipv6-multicast",
        "ipv4-labeled-unicast", "ipv6-labeled-unicast", "ipv4-vpn", "ipv6-vpn",
        "ipv4-flowspec", "ipv6-flowspec", "l2vpn-evpn",
    ]
    assert caps["address_family_types"]["neighbor"] == caps["address_family_types"]["global"]
    assert caps["address_family_types"]["peer_group"] == [
        "ipv4-unicast", "ipv6-unicast", "ipv4-labeled-unicast",
        "ipv6-labeled-unicast", "ipv4-vpn", "ipv6-vpn", "l2vpn-evpn",
    ]
    assert "network" not in caps["address_family_leaves"]["global"]["ipv4-flowspec"]
    assert "weight" not in caps["address_family_leaves"]["neighbor"]["ipv4-flowspec"]


@pytest.fixture
def client(monkeypatch):
    from types import SimpleNamespace

    executed = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return "1.4"

        def execute_batch(self, batch):
            executed.append(batch.get_operations())
            return SimpleNamespace(status=200, result="", error=None)

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())

    from routers.bgp.bgp import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app), executed


def test_batch_leaf_missing_on_the_afi_is_400(client):
    test_client, executed = client
    resp = test_client.post("/vyos/bgp/batch", json={"operations": [
        {"op": "set_system_as", "value": "65000"},
        {"op": "set_af_network", "value": "ipv4-flowspec,10.0.0.0/8"},
    ]})
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == (
        "network is not supported for address-family ipv4-flowspec on this device"
    )
    assert executed == []
