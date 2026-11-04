"""RPKI and router-advert leaves that exist on 1.5 and not on 1.4.

Lab-checked with cli-shell-api validateTmplPath on 1.4 (100.64.64.50) and
1.5 (100.64.64.5):

- ``protocols rpki cache <addr> source-address``: INVALID on 1.4, VALID on 1.5
- ``vrf name <vrf> protocols rpki`` (whole subtree): INVALID on 1.4, VALID on 1.5
- ``service router-advert interface <if> captive-portal``: INVALID on 1.4, VALID on 1.5
- ``service router-advert interface <if> prefix <p> base-interface``: INVALID on 1.4,
  VALID on 1.5
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from vyos_builders.router_advert.router_advert_batch_builder import RouterAdvertBatchBuilder
from vyos_builders.rpki.rpki_batch_builder import RpkiBatchBuilder
from vyos_builders.vrf.vrf_batch_builder import VrfBatchBuilder
from vyos_mappers.router_advert.router_advert import RouterAdvertMapper
from vyos_mappers.rpki.rpki import RpkiMapper
from vyos_mappers.vrf.vrf_rpki import VrfRpkiMapper

CACHE = "192.0.2.10"
RPKI_CACHE = ["protocols", "rpki", "cache", CACHE]
IFACE = "eth1"
PREFIX = "2001:db8::/64"
RA_IF = ["service", "router-advert", "interface", IFACE]
VRF = "RED"
VRF_RPKI = ["vrf", "name", VRF, "protocols", "rpki"]


def _ops(builder):
    return [(item["op"], item["path"]) for item in builder.get_operations()]


# ---------------------------------------------------------------------------
# Builder paths: emitted on 1.5, rejected on 1.4 with nothing queued
# ---------------------------------------------------------------------------

RPKI_CASES = [
    ("set_cache_source_address", (CACHE, "192.0.2.1"), "set", RPKI_CACHE + ["source-address", "192.0.2.1"]),
    ("delete_cache_source_address", (CACHE,), "delete", RPKI_CACHE + ["source-address"]),
]

RA_CASES = [
    ("set_interface_captive_portal", (IFACE, "https://portal.example/api"), "set",
     RA_IF + ["captive-portal", "https://portal.example/api"]),
    ("delete_interface_captive_portal", (IFACE,), "delete", RA_IF + ["captive-portal"]),
    ("set_prefix_base_interface", (IFACE, PREFIX, "eth0"), "set",
     RA_IF + ["prefix", PREFIX, "base-interface", "eth0"]),
    ("delete_prefix_base_interface", (IFACE, PREFIX), "delete",
     RA_IF + ["prefix", PREFIX, "base-interface"]),
]

VRF_RPKI_CASES = [
    ("set_vrf_rpki", (VRF,), "set", VRF_RPKI),
    ("delete_vrf_rpki", (VRF,), "delete", VRF_RPKI),
    ("set_vrf_rpki_expire_interval", (VRF, "7200"), "set", VRF_RPKI + ["expire-interval", "7200"]),
    ("delete_vrf_rpki_expire_interval", (VRF,), "delete", VRF_RPKI + ["expire-interval"]),
    ("set_vrf_rpki_polling_period", (VRF, "300"), "set", VRF_RPKI + ["polling-period", "300"]),
    ("delete_vrf_rpki_polling_period", (VRF,), "delete", VRF_RPKI + ["polling-period"]),
    ("set_vrf_rpki_retry_interval", (VRF, "600"), "set", VRF_RPKI + ["retry-interval", "600"]),
    ("delete_vrf_rpki_retry_interval", (VRF,), "delete", VRF_RPKI + ["retry-interval"]),
    ("set_vrf_rpki_cache", (VRF, CACHE), "set", VRF_RPKI + ["cache", CACHE]),
    ("delete_vrf_rpki_cache", (VRF, CACHE), "delete", VRF_RPKI + ["cache", CACHE]),
    ("set_vrf_rpki_cache_port", (VRF, f"{CACHE},3323"), "set", VRF_RPKI + ["cache", CACHE, "port", "3323"]),
    ("delete_vrf_rpki_cache_port", (VRF, CACHE), "delete", VRF_RPKI + ["cache", CACHE, "port"]),
    ("set_vrf_rpki_cache_preference", (VRF, f"{CACHE},1"), "set",
     VRF_RPKI + ["cache", CACHE, "preference", "1"]),
    ("delete_vrf_rpki_cache_preference", (VRF, CACHE), "delete", VRF_RPKI + ["cache", CACHE, "preference"]),
    ("set_vrf_rpki_cache_source_address", (VRF, f"{CACHE},192.0.2.1"), "set",
     VRF_RPKI + ["cache", CACHE, "source-address", "192.0.2.1"]),
    ("delete_vrf_rpki_cache_source_address", (VRF, CACHE), "delete",
     VRF_RPKI + ["cache", CACHE, "source-address"]),
    ("set_vrf_rpki_cache_ssh_key", (VRF, f"{CACHE},key1"), "set",
     VRF_RPKI + ["cache", CACHE, "ssh", "key", "key1"]),
    ("delete_vrf_rpki_cache_ssh_key", (VRF, CACHE), "delete", VRF_RPKI + ["cache", CACHE, "ssh", "key"]),
    ("set_vrf_rpki_cache_ssh_username", (VRF, f"{CACHE},rpki"), "set",
     VRF_RPKI + ["cache", CACHE, "ssh", "username", "rpki"]),
    ("delete_vrf_rpki_cache_ssh_username", (VRF, CACHE), "delete",
     VRF_RPKI + ["cache", CACHE, "ssh", "username"]),
]

BUILDER_CASES = (
    [(RpkiBatchBuilder, *case) for case in RPKI_CASES]
    + [(RouterAdvertBatchBuilder, *case) for case in RA_CASES]
    + [(VrfBatchBuilder, *case) for case in VRF_RPKI_CASES]
)


@pytest.mark.parametrize("builder_cls, method, args, op, expected_path", BUILDER_CASES)
def test_v15_only_paths_emit_on_1_5(builder_cls, method, args, op, expected_path):
    builder = builder_cls(version="1.5")
    getattr(builder, method)(*args)
    assert _ops(builder) == [(op, expected_path)]


@pytest.mark.parametrize("builder_cls, method, args, op, expected_path", BUILDER_CASES)
def test_v15_only_paths_rejected_on_1_4(builder_cls, method, args, op, expected_path):
    builder = builder_cls(version="1.4")
    with pytest.raises(ValueError, match="not supported on this device"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


@pytest.mark.parametrize(
    "method, args, expected_path",
    [
        ("set_cache_port", (CACHE, "3323"), RPKI_CACHE + ["port", "3323"]),
        ("set_cache_preference", (CACHE, "1"), RPKI_CACHE + ["preference", "1"]),
    ],
)
def test_shared_rpki_cache_leaves_still_emit_on_1_4(method, args, expected_path):
    """The gate is per leaf. Port and preference exist on both builds."""
    builder = RpkiBatchBuilder(version="1.4")
    getattr(builder, method)(*args)
    assert _ops(builder) == [("set", expected_path)]


def test_shared_ra_prefix_leaf_still_emits_on_1_4():
    builder = RouterAdvertBatchBuilder(version="1.4")
    builder.set_prefix_valid_lifetime(IFACE, PREFIX, "3600")
    assert _ops(builder) == [("set", RA_IF + ["prefix", PREFIX, "valid-lifetime", "3600"])]


# ---------------------------------------------------------------------------
# Capabilities read the mapper knowledge
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("version, expected", [("1.4", False), ("1.5", True)])
def test_capabilities_follow_version(version, expected):
    rpki = RpkiBatchBuilder(version=version).get_capabilities()["features"]
    assert rpki["cache_source_address"]["supported"] is expected
    assert rpki["cache_servers"]["supported"] is True

    ra = RouterAdvertBatchBuilder(version=version).get_capabilities()["features"]
    assert ra["captive_portal"]["supported"] is expected
    assert ra["prefix_base_interface"]["supported"] is expected

    vrf = VrfBatchBuilder(version=version).get_capabilities()["features"]
    assert vrf["rpki"]["supported"] is expected


def test_rpki_capability_reads_the_mapper(monkeypatch):
    """A second handwritten version check in get_capabilities() would ignore this."""
    monkeypatch.setattr(RpkiMapper, "versioned_cache_nodes", lambda self: frozenset())
    features = RpkiBatchBuilder(version="1.5").get_capabilities()["features"]
    assert features["cache_source_address"]["supported"] is False


def test_ra_capabilities_read_the_mapper(monkeypatch):
    monkeypatch.setattr(RouterAdvertMapper, "versioned_interface_nodes", lambda self: frozenset())
    features = RouterAdvertBatchBuilder(version="1.5").get_capabilities()["features"]
    assert features["captive_portal"]["supported"] is False
    assert features["prefix_base_interface"]["supported"] is True

    monkeypatch.undo()
    monkeypatch.setattr(RouterAdvertMapper, "versioned_prefix_nodes", lambda self: frozenset())
    features = RouterAdvertBatchBuilder(version="1.5").get_capabilities()["features"]
    assert features["captive_portal"]["supported"] is True
    assert features["prefix_base_interface"]["supported"] is False


def test_vrf_rpki_capability_reads_the_mapper(monkeypatch):
    monkeypatch.setattr(VrfRpkiMapper, "is_supported", lambda self: False)
    features = VrfBatchBuilder(version="1.5").get_capabilities()["features"]
    assert features["rpki"]["supported"] is False


# ---------------------------------------------------------------------------
# Batch endpoints: 400 on 1.4 without a commit, commit errors stay internal
# ---------------------------------------------------------------------------


def _client(monkeypatch, module, version, execute=None):
    captured = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return version

        def execute_batch(self, batch):
            if execute is not None:
                return execute(batch)
            captured.append(batch.get_operations())
            return SimpleNamespace(status=200, result="", error=None)

    monkeypatch.setattr(f"{module}.require_write_permission", allow)
    monkeypatch.setattr(f"{module}.get_session_vyos_service", lambda _req: Service())

    router = __import__(module, fromlist=["router"]).router
    app = FastAPI()
    app.include_router(router)
    return TestClient(app), captured


RPKI_MODULE = "routers.rpki.rpki"
RA_MODULE = "routers.router_advert.router_advert"
VRF_MODULE = "routers.vrf.vrf"

ENDPOINT_CASES = [
    (RPKI_MODULE, "/vyos/rpki/batch",
     {"operations": [{"op": "set_cache_source_address", "value": f"{CACHE},192.0.2.1"}]},
     [("set", RPKI_CACHE + ["source-address", "192.0.2.1"])]),
    (RPKI_MODULE, "/vyos/rpki/batch",
     {"operations": [{"op": "delete_cache_source_address", "value": CACHE}]},
     [("delete", RPKI_CACHE + ["source-address"])]),
    (RA_MODULE, "/vyos/router-advert/batch",
     {"groups": [{"interface": IFACE, "operations": [
         {"op": "set_interface_captive_portal", "value": "https://portal.example/api"}]}]},
     [("set", RA_IF + ["captive-portal", "https://portal.example/api"])]),
    (RA_MODULE, "/vyos/router-advert/batch",
     {"groups": [{"interface": IFACE, "prefix": PREFIX, "operations": [
         {"op": "set_prefix_base_interface", "value": "eth0"}]}]},
     [("set", RA_IF + ["prefix", PREFIX, "base-interface", "eth0"])]),
    (VRF_MODULE, "/vyos/vrf/batch",
     {"operations": [{"op": "set_vrf_rpki_cache_source_address", "value": f"{VRF},{CACHE},192.0.2.1"}]},
     [("set", VRF_RPKI + ["cache", CACHE, "source-address", "192.0.2.1"])]),
    (VRF_MODULE, "/vyos/vrf/batch",
     {"operations": [{"op": "set_vrf_rpki_cache", "value": f"{VRF},{CACHE}"}]},
     [("set", VRF_RPKI + ["cache", CACHE])]),
]


@pytest.mark.parametrize("module, url, body, expected", ENDPOINT_CASES)
def test_batch_writes_leaf_on_1_5(monkeypatch, module, url, body, expected):
    client, captured = _client(monkeypatch, module, "1.5")
    response = client.post(url, json=body)
    assert response.status_code == 200, response.text
    assert [(item["op"], item["path"]) for item in captured[0]] == expected


@pytest.mark.parametrize("module, url, body, expected", ENDPOINT_CASES)
def test_batch_rejects_leaf_on_1_4_without_commit(monkeypatch, module, url, body, expected):
    client, captured = _client(monkeypatch, module, "1.4")
    response = client.post(url, json=body)
    assert response.status_code == 400, response.text
    assert "not supported on this device" in response.json()["detail"]
    assert captured == []


@pytest.mark.parametrize("module, url, body, expected", ENDPOINT_CASES)
def test_batch_commit_value_error_stays_internal(monkeypatch, module, url, body, expected):
    """Only the build phase maps ValueError to 400. A commit-time error
    must not echo its message to the client."""

    def boom(_batch):
        raise ValueError("secret device detail")

    client, _ = _client(monkeypatch, module, "1.5", execute=boom)
    response = client.post(url, json=body)
    assert response.status_code == 500
    assert "secret" not in response.text
