"""VRF failover, RPKI and DHCP servers are gated by the VRF mapper (issue #1195).

The labs differ: ``vrf name <vrf>`` has ``protocols failover``,
``protocols rpki``, ``service dhcp-server`` and ``service dhcpv6-server`` on
1.5 only. The version subclass lists them; the builder and capabilities read
that list. The RPKI paths live on the subclass only.
"""

from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers.vrf.vrf import VrfConfig
from vyos_builders.vrf.vrf_batch_builder import VrfBatchBuilder
from vyos_builders.vrf.vrf_protocol import FEATURE_BUILDERS
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.vrf.vrf import VrfMapper
from vyos_mappers.vrf.vrf_versions import VrfMapperV1_5, get_vrf_mapper

ROOT = Path(__file__).resolve().parents[1]
VERSIONS = ROOT / "vyos_mappers" / "vrf" / "vrf_versions"
ROLLING = "2026.09.23-0027-rolling"

ONLY_15 = {
    "failover": "failover",
    "rpki": "rpki",
    "dhcp": "dhcp_server",
    "dhcpv6": "dhcpv6_server",
}
LAB_15_ONLY = frozenset({
    "protocols failover",
    "protocols rpki",
    "service dhcp-server",
    "service dhcpv6-server",
})


def _ops(builder):
    """One op per 1.5-only feature, plus static which both labs have."""
    return {
        "failover": lambda: builder.set_vrf_failover_route("blue", "10.1.0.0/24"),
        "rpki": lambda: builder.set_vrf_rpki_cache("blue", "192.0.2.10"),
        "dhcp": lambda: builder.set_vrf_dhcp_disable("blue"),
        "dhcpv6": lambda: builder.delete_vrf_dhcpv6("blue"),
        "static": lambda: builder.delete_vrf_static("blue"),
    }


def test_factory_returns_one_class_per_lab():
    assert type(get_vrf_mapper("1.4")) is VrfMapper
    assert type(get_vrf_mapper("1.4.3")) is VrfMapper
    assert type(get_vrf_mapper("1.5")) is VrfMapperV1_5
    assert type(get_vrf_mapper(ROLLING)) is VrfMapperV1_5
    assert type(CommandMapperRegistry.get_mapper("vrf", ROLLING)) is VrfMapperV1_5


def test_versions_package_has_no_merge_proxy_or_empty_file():
    names = sorted(p.name for p in VERSIONS.glob("*.py"))
    assert names == ["__init__.py", "v1_5.py"]
    assert "MergedMapper" not in (VERSIONS / "__init__.py").read_text()


def test_versioned_nodes_are_the_1_5_only_lab_trees():
    assert get_vrf_mapper("1.4").versioned_nodes() == frozenset()
    assert get_vrf_mapper(ROLLING).versioned_nodes() == LAB_15_ONLY
    assert set(VrfMapper._VERSIONED_FEATURES.values()) == LAB_15_ONLY
    # Every key but rpki prefixes a global builder; rpki has its own mixin.
    assert set(VrfMapper._VERSIONED_FEATURES) - {"rpki"} < set(FEATURE_BUILDERS)


def test_rpki_paths_are_only_on_the_1_5_subclass():
    rpki_paths = [n for n in vars(VrfMapperV1_5) if n.startswith("get_rpki")]
    assert len(rpki_paths) == 11
    assert not [n for n in dir(VrfMapper) if "rpki" in n]


def test_parse_config_lives_on_the_mapper_class():
    for version in ("1.4", ROLLING):
        mapper = get_vrf_mapper(version)
        assert isinstance(mapper, VrfMapper)
        assert mapper.parse_config({}) == {"bind_to_all": False, "instances": []}


def _rpki_from(protocols):
    raw = {"vrf": {"name": {"blue": {"table": "100", "protocols": protocols}}}}
    config = VrfConfig(**get_vrf_mapper(ROLLING).parse_config(raw))
    return config.instances[0].rpki


def test_rpki_presence_is_key_membership():
    # A bare ``protocols rpki`` commits on 1.5 and parses as {}; the screen
    # offers Remove only when the node is reported.
    bare = _rpki_from({"rpki": {}})
    assert bare is not None
    assert bare.caches == [] and bare.expire_interval is None
    assert _rpki_from({"static": {}}) is None


def test_path_prefix_has_no_version_check():
    src = (ROOT / "vyos_mappers" / "path_prefix.py").read_text()
    assert "require_feature_version" not in src
    assert '"1.4"' not in src and '"1.5"' not in src


@pytest.mark.parametrize("version", ["1.4", "1.5", ROLLING])
def test_capabilities_follow_the_mapper(version):
    features = VrfBatchBuilder(version).get_capabilities()["features"]
    expected = "1.4" not in version
    for key in ONLY_15.values():
        assert features[key]["supported"] is expected
    assert features["static_routes"]["supported"] is True


@pytest.mark.parametrize("version", ["1.4", "1.5", ROLLING])
def test_ops_follow_the_mapper(version):
    builder = VrfBatchBuilder(version)
    ops = _ops(builder)
    for proto in ONLY_15:
        if "1.4" in version:
            with pytest.raises(ValueError, match="not supported on this device"):
                ops[proto]()
        else:
            ops[proto]()
    ops["static"]()
    paths = [op["path"] for op in builder.get_operations()]
    assert ["vrf", "name", "blue", "protocols", "static"] in paths
    if "1.4" in version:
        assert len(paths) == 1


def test_a_version_string_cannot_open_a_tree_the_mapper_lacks(monkeypatch):
    # 1.5 string, mapper without the trees: capabilities and ops follow the
    # mapper, so a handwritten version check would fail here.
    monkeypatch.setattr(VrfMapperV1_5, "versioned_nodes", lambda self: frozenset())
    builder = VrfBatchBuilder("1.5")
    features = builder.get_capabilities()["features"]
    ops = _ops(builder)
    for proto, key in ONLY_15.items():
        assert features[key]["supported"] is False
        with pytest.raises(ValueError, match="not supported on this device"):
            ops[proto]()
    assert builder.get_operations() == []


def test_a_version_string_cannot_close_a_tree_the_mapper_has(monkeypatch):
    monkeypatch.setattr(VrfMapper, "versioned_nodes", lambda self: LAB_15_ONLY)
    builder = VrfBatchBuilder("1.4")
    features = builder.get_capabilities()["features"]
    ops = _ops(builder)
    for proto, key in ONLY_15.items():
        assert features[key]["supported"] is True
        if proto != "rpki":  # the RPKI paths exist on the 1.5 subclass only
            ops[proto]()
    paths = [op["path"][:5] for op in builder.get_operations()]
    assert ["vrf", "name", "blue", "protocols", "failover"] in paths
    assert ["vrf", "name", "blue", "service", "dhcp-server"] in paths
    assert ["vrf", "name", "blue", "service", "dhcpv6-server"] in paths


@pytest.fixture
def batch_client(monkeypatch):
    calls = []

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.4.3"

        def execute_batch(self, builder):
            calls.append(builder.get_operations())
            raise AssertionError("a rejected op must not reach the device")

    monkeypatch.setattr("routers.vrf.vrf.require_write_permission", allow)
    monkeypatch.setattr(
        "routers.vrf.vrf.get_session_vyos_service", lambda _req: FakeService()
    )
    from routers.vrf.vrf import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app), calls


@pytest.mark.parametrize(
    ("op", "value", "detail"),
    [
        ("set_vrf_failover_route", "10.1.0.0/24",
         "vrf protocols failover is not supported on this device"),
        ("set_vrf_dhcp_disable", None,
         "vrf service dhcp-server is not supported on this device"),
        ("delete_vrf_dhcpv6", None,
         "vrf service dhcpv6-server is not supported on this device"),
        ("set_vrf_rpki_cache_port", "192.0.2.10,3323",
         "vrf protocols rpki is not supported on this device"),
    ],
)
def test_1_4_batch_rejects_a_1_5_only_tree(batch_client, op, value, detail):
    client, calls = batch_client
    operations = [{"op": "delete_vrf_static", "value": "blue"}]
    operations.append({"op": op, "value": f"blue,{value}" if value else "blue"})
    response = client.post("/vyos/vrf/batch", json={"operations": operations})
    assert response.status_code == 400, response.text
    assert response.json()["detail"] == detail
    assert calls == []
