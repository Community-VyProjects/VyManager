"""Interface catalog op paths come from the mapper, not a version string."""

import ast
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

import routers.show as show
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.interfaces.catalog import InterfaceCatalogMapper
from vyos_mappers.interfaces.catalog_versions import (
    InterfaceCatalogMapperV1_5,
    get_interface_catalog_mapper,
)

ROLLING = "2026.09.23-0027-rolling"
KERNEL_JSON = '[{"ifname": "eth0", "link_type": "ether"}, {"ifname": "tailscale0", "link_type": "none"}]'
CONFIG = {"interfaces": {"ethernet": {"eth0": {"description": "wan"}, "eth1": {"address": "192.0.2.1/24"}}}}


# ==================== Mapper ====================


@pytest.mark.parametrize(
    "version,cls",
    [
        ("1.4.3", InterfaceCatalogMapper),
        ("1.5", InterfaceCatalogMapperV1_5),
        (ROLLING, InterfaceCatalogMapperV1_5),
        ("", InterfaceCatalogMapperV1_5),
    ],
)
def test_factory_sends_only_a_1_4_string_to_the_shared_class(version, cls):
    mapper = get_interface_catalog_mapper(version)
    assert type(mapper) is cls
    assert type(CommandMapperRegistry.get_mapper("interface_catalog", version)) is cls


def test_kernel_list_is_only_on_the_1_5_subclass():
    v14 = get_interface_catalog_mapper("1.4.3")
    v15 = get_interface_catalog_mapper(ROLLING)
    assert v14.versioned_nodes() == frozenset()
    assert v15.versioned_nodes() == frozenset({"kernel json"})
    assert not hasattr(v14, "get_kernel_json_show_path")
    with pytest.raises(ValueError):
        v14.versioned_path("kernel json")
    with pytest.raises(ValueError):
        v15.versioned_path("kernel")


def test_show_paths_match_the_op_tree():
    for version in ("1.4.3", ROLLING):
        mapper = get_interface_catalog_mapper(version)
        assert mapper.get_counters_show_path() == ["interfaces", "counters"]
        assert mapper.get_ethernet_show_path() == ["interfaces", "ethernet"]
    assert get_interface_catalog_mapper(ROLLING).versioned_path("kernel json") == [
        "interfaces",
        "kernel",
        "json",
    ]


# ==================== Router ====================


class StubDevice:
    def __init__(self, replies):
        self.replies = replies
        self.paths = []

    def show(self, path):
        self.paths.append(path)
        reply = self.replies.get(tuple(path), SimpleNamespace(status=200, result="", error=False))
        if isinstance(reply, Exception):
            raise reply
        return reply


class StubService:
    def __init__(self, version, replies):
        self.version = version
        self.device = StubDevice(replies)

    def get_version(self):
        return self.version

    def get_full_config(self, refresh=False):
        return CONFIG


@pytest.fixture
def stub(monkeypatch):
    holder = {"version": "1.4.3", "replies": {}}
    permissions = []

    async def read(request, feature):
        permissions.append(("read", feature))

    async def any_read(request):
        permissions.append(("any", None))

    def service(request):
        holder["service"] = StubService(holder["version"], holder["replies"])
        return holder["service"]

    monkeypatch.setattr(show, "require_read_permission", read)
    monkeypatch.setattr(show, "require_any_read_permission", any_read)
    monkeypatch.setattr(show, "get_session_vyos_service", service)
    holder["permissions"] = permissions
    return holder


@pytest.fixture
def client(stub):
    app = FastAPI()
    app.include_router(show.router)
    return TestClient(app)


def _names(body):
    return [item["name"] for item in body["interfaces"]]


def test_1_4_builds_the_list_from_config_without_the_kernel_command(client, stub):
    response = client.get("/vyos/show/all-interfaces")
    assert response.status_code == 200
    assert _names(response.json()) == ["eth0", "eth1"]
    assert stub["service"].device.paths == []
    assert stub["permissions"] == [("any", None)]


def test_1_5_reads_the_kernel_list_and_merges_config(client, stub):
    stub["version"] = ROLLING
    stub["replies"][("interfaces", "kernel", "json")] = SimpleNamespace(
        status=200, result=KERNEL_JSON, error=False
    )
    response = client.get("/vyos/show/all-interfaces")
    assert response.status_code == 200
    assert stub["service"].device.paths == [["interfaces", "kernel", "json"]]
    body = response.json()
    assert set(_names(body)) == {"eth0", "eth1", "tailscale0"}
    assert next(i for i in body["interfaces"] if i["name"] == "eth0")["description"] == "wan"


def test_the_mapper_decides_not_the_version_string(client, stub, monkeypatch):
    def swapped(version):
        if "1.4" in version:
            return InterfaceCatalogMapperV1_5(version)
        return InterfaceCatalogMapper(version)

    monkeypatch.setitem(CommandMapperRegistry._features, "interface_catalog", swapped)
    stub["replies"][("interfaces", "kernel", "json")] = SimpleNamespace(
        status=200, result=KERNEL_JSON, error=False
    )
    client.get("/vyos/show/all-interfaces")
    assert stub["service"].device.paths == [["interfaces", "kernel", "json"]]

    stub["version"] = ROLLING
    client.get("/vyos/show/all-interfaces")
    assert stub["service"].device.paths == []


@pytest.mark.parametrize(
    "reply",
    [
        SimpleNamespace(status=200, result={}, error="API Error 200: command failed"),
        SimpleNamespace(status=500, result={}, error="HTTP Error 500: boom"),
        SimpleNamespace(status=200, result="", error=False),
        SimpleNamespace(status=200, result='{"eth0": {}}', error=False),
        ConnectionError("device unreachable"),
    ],
)
def test_a_refused_empty_or_failed_kernel_list_falls_back_to_config(client, stub, reply):
    stub["version"] = ROLLING
    stub["replies"][("interfaces", "kernel", "json")] = reply
    response = client.get("/vyos/show/all-interfaces")
    assert response.status_code == 200
    assert _names(response.json()) == ["eth0", "eth1"]


def test_counters_read_the_mapper_path(client, stub):
    stub["replies"][("interfaces", "counters")] = SimpleNamespace(
        status=200,
        result=(
            "Interface    Rx Packets    Rx Bytes      Tx Packets    Tx Bytes      "
            "Rx Dropped    Tx Dropped    Rx Errors    Tx Errors\n"
            "-----------  ------------  ------------  ------------  ------------  "
            "------------  ------------  -----------  -----------\n"
            "eth0         10            20            30            40            "
            "1             2             3            4\n"
        ),
        error=False,
    )
    response = client.get("/vyos/show/interface-counters")
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert stub["service"].device.paths == [["interfaces", "counters"]]
    assert stub["permissions"] == [("read", show.FeatureGroup.INTERFACES)]


def test_a_refused_counters_read_is_a_500(client, stub):
    stub["replies"][("interfaces", "counters")] = SimpleNamespace(
        status=200, result={}, error="API Error 200: command failed"
    )
    response = client.get("/vyos/show/interface-counters")
    assert response.status_code == 500
    assert response.json()["detail"] == "Unable to read interface counters"


def test_available_ethernet_reads_the_mapper_path(client, stub):
    stub["replies"][("interfaces", "ethernet")] = SimpleNamespace(
        status=200, result="eth0\neth1\neth2\n", error=False
    )
    response = client.get("/vyos/show/available-ethernet-interfaces")
    assert response.status_code == 200
    assert response.json() == {"interfaces": ["eth0", "eth2"], "total": 2}
    assert stub["service"].device.paths == [["interfaces", "ethernet"]]
    assert stub["permissions"] == [("read", show.FeatureGroup.ETHERNET)]


def test_a_refused_ethernet_read_lists_nothing(client, stub):
    stub["replies"][("interfaces", "ethernet")] = SimpleNamespace(
        status=200, result={}, error="API Error 200: command failed"
    )
    response = client.get("/vyos/show/available-ethernet-interfaces")
    assert response.status_code == 200
    assert response.json() == {"interfaces": [], "total": 0}


@pytest.mark.parametrize(
    "route",
    ["/vyos/show/all-interfaces", "/vyos/show/interface-counters", "/vyos/show/available-ethernet-interfaces"],
)
def test_session_400_survives(client, monkeypatch, route):
    def no_session(request):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(show, "get_session_vyos_service", no_session)
    response = client.get(route)
    assert response.status_code == 400
    assert response.json()["detail"] == "No active session"


@pytest.mark.parametrize(
    "name",
    ["get_all_interfaces", "get_interface_counters", "get_available_ethernet_interfaces"],
)
def test_interface_handlers_build_no_show_path_and_read_no_version(name):
    tree = ast.parse((Path(show.__file__)).read_text())
    handler = next(
        node for node in tree.body if isinstance(node, ast.AsyncFunctionDef) and node.name == name
    )
    for node in ast.walk(handler):
        if isinstance(node, ast.keyword) and node.arg == "path":
            assert not isinstance(node.value, ast.List), f"{name} builds a show path"
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            assert "1.4" not in node.value and "1.5" not in node.value, name
