"""The Ethernet router reads its op path and mapper from the registry.

``GET /vyos/ethernet/{interface}/transceiver`` sends the device the path
``InterfaceCatalogMapper`` returns, and ``GET /vyos/ethernet/config`` parses
through the ``interface_ethernet`` factory instead of building the mapper
itself.
"""

import ast
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

import routers.interfaces.ethernet as ethernet
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.interfaces.catalog import InterfaceCatalogMapper
from vyos_mappers.interfaces.catalog_versions import (
    InterfaceCatalogMapperV1_5,
    get_interface_catalog_mapper,
)
from vyos_mappers.interfaces.ethernet_versions import get_ethernet_mapper

ROLLING = "2026.09.23-0027-rolling"
ROUTER = Path(ethernet.__file__)
OLD_PATH = ["interfaces", "ethernet", "eth0", "transceiver"]
MODULE = "Transceiver type: SFP+\nVendor name: Acme\nModule temperature: 31.2 C\n"
CONFIG = {"interfaces": {"ethernet": {"eth0": {"description": "wan"}}}}


# ==================== Mapper ====================


@pytest.mark.parametrize("version", ["1.4.3", "1.5", ROLLING])
def test_transceiver_path_is_the_old_op_path_on_every_version(version):
    mapper = get_interface_catalog_mapper(version)
    assert mapper.get_ethernet_transceiver_show_path("eth0") == OLD_PATH


def test_transceiver_path_is_shared_not_versioned():
    assert "get_ethernet_transceiver_show_path" in vars(InterfaceCatalogMapper)
    assert "get_ethernet_transceiver_show_path" not in vars(InterfaceCatalogMapperV1_5)


# ==================== Router ====================


class StubDevice:
    def __init__(self, reply):
        self.reply = reply
        self.paths = []

    def show(self, path):
        self.paths.append(path)
        if isinstance(self.reply, Exception):
            raise self.reply
        return self.reply


class StubService:
    def __init__(self, version, reply):
        self.version = version
        self.device = StubDevice(reply)

    def get_version(self):
        return self.version

    def get_full_config(self, refresh=False):
        return CONFIG


@pytest.fixture
def stub(monkeypatch):
    holder = {
        "version": "1.4.3",
        "reply": SimpleNamespace(status=200, result=MODULE, error=False),
        "permissions": [],
    }

    async def read(request, feature):
        holder["permissions"].append(("read", feature))

    def service(request):
        holder["service"] = StubService(holder["version"], holder["reply"])
        return holder["service"]

    monkeypatch.setattr(ethernet, "require_read_permission", read)
    monkeypatch.setattr(ethernet, "get_session_vyos_service", service)
    return holder


@pytest.fixture
def client(stub):
    app = FastAPI()
    app.include_router(ethernet.router)
    return TestClient(app, raise_server_exceptions=False)


@pytest.mark.parametrize("version", ["1.4.3", ROLLING])
def test_transceiver_reads_the_mapper_path(client, stub, version):
    stub["version"] = version
    response = client.get("/vyos/ethernet/eth0/transceiver")
    assert response.status_code == 200
    body = response.json()
    assert body["present"] is True
    assert body["transceiver"] == "SFP+"
    assert stub["service"].device.paths == [OLD_PATH]
    assert stub["permissions"] == [("read", ethernet.FeatureGroup.ETHERNET)]


def test_transceiver_path_comes_from_the_registry(client, stub, monkeypatch):
    class Tagged(InterfaceCatalogMapper):
        def get_ethernet_transceiver_show_path(self, interface):
            return ["tagged", interface]

    monkeypatch.setitem(CommandMapperRegistry._features, "interface_catalog", Tagged)
    response = client.get("/vyos/ethernet/eth0/transceiver")
    assert response.status_code == 200
    assert stub["service"].device.paths == [["tagged", "eth0"]]


@pytest.mark.parametrize(
    "reply,detail",
    [
        (
            SimpleNamespace(status=200, result="", error="API Error 200: command failed"),
            "API Error 200: command failed",
        ),
        (SimpleNamespace(status=500, result="", error=None), "Unable to read transceiver diagnostics"),
    ],
)
def test_refused_reply_is_502(client, stub, reply, detail):
    stub["reply"] = reply
    response = client.get("/vyos/ethernet/eth0/transceiver")
    assert response.status_code == 502
    assert response.json()["detail"] == detail


def test_non_text_result_reads_as_empty_output(client, stub):
    stub["reply"] = SimpleNamespace(status=200, result={"data": MODULE}, error=False)
    response = client.get("/vyos/ethernet/eth0/transceiver")
    assert response.status_code == 200
    body = response.json()
    assert body["present"] is False
    assert body["transceiver"] is None


def test_device_exception_is_500(client, stub):
    stub["reply"] = ConnectionError("device unreachable")
    response = client.get("/vyos/ethernet/eth0/transceiver")
    assert response.status_code == 500
    assert response.json()["detail"] == "Unable to read transceiver diagnostics"


def test_config_parses_through_the_ethernet_factory(client, stub, monkeypatch):
    calls = []

    def factory(version):
        calls.append(version)
        return get_ethernet_mapper(version)

    monkeypatch.setitem(CommandMapperRegistry._features, "interface_ethernet", factory)
    stub["version"] = ROLLING
    response = client.get("/vyos/ethernet/config")
    assert response.status_code == 200
    assert calls == [ROLLING]
    assert [i["name"] for i in response.json()["interfaces"]] == ["eth0"]


@pytest.mark.parametrize(
    "path",
    ["/vyos/ethernet/capabilities", "/vyos/ethernet/config", "/vyos/ethernet/eth0/transceiver"],
)
def test_session_lookup_400_survives(client, monkeypatch, path):
    def missing(request):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(ethernet, "get_session_vyos_service", missing)
    response = client.get(path)
    assert response.status_code == 400
    assert response.json()["detail"] == "No active session"


def test_transceiver_handler_builds_no_path_literal():
    tree = ast.parse(ROUTER.read_text())
    handler = next(
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "get_ethernet_transceiver"
    )
    lists = [node for stmt in handler.body for node in ast.walk(stmt) if isinstance(node, ast.List)]
    assert lists == []
