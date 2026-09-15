"""OSPF and OSPFv3 graceful-restart helper enable router-id.

Both 1.4 and 1.5 accept the multi ipv4 leaf. Paths checked with
validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
"""

from pathlib import Path

import pytest

from routers.ospf.ospf import parse_graceful_restart as parse_ospf_gr
from routers.ospfv3.ospfv3 import parse_graceful_restart as parse_ospfv3_gr
from vyos_builders.ospf.ospf_batch_builder import OspfBatchBuilder
from vyos_builders.ospfv3.ospfv3_batch_builder import Ospfv3BatchBuilder

REPO = Path(__file__).resolve().parents[2]
OSPF_PAGE = REPO / "frontend/src/components/ospf/OspfContent.tsx"
OSPFV3_PAGE = REPO / "frontend/src/components/ospfv3/Ospfv3Content.tsx"
OSPF_API = REPO / "frontend/src/lib/api/ospf.ts"
OSPFV3_API = REPO / "frontend/src/lib/api/ospfv3.ts"

PATH = ["graceful-restart", "helper", "enable", "router-id", "192.0.2.1"]

CASES = [
    (
        OspfBatchBuilder,
        "set_graceful_restart_helper_enable_router_id",
        ("192.0.2.1",),
        "set",
        ["protocols", "ospf"] + PATH,
    ),
    (
        OspfBatchBuilder,
        "delete_graceful_restart_helper_enable_router_id",
        ("192.0.2.1",),
        "delete",
        ["protocols", "ospf"] + PATH,
    ),
    (
        Ospfv3BatchBuilder,
        "set_graceful_restart_helper_enable_router_id",
        ("192.0.2.1",),
        "set",
        ["protocols", "ospfv3"] + PATH,
    ),
    (
        Ospfv3BatchBuilder,
        "delete_graceful_restart_helper_enable_router_id",
        ("192.0.2.1",),
        "delete",
        ["protocols", "ospfv3"] + PATH,
    ),
]


@pytest.mark.parametrize("builder_cls, method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_helper_enable_router_id_paths(builder_cls, method, args, op, expected_path, version):
    builder = builder_cls(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


def test_parse_ospf_helper_router_ids_list():
    parsed = parse_ospf_gr(
        {"helper": {"enable": {"router-id": ["192.0.2.1", "192.0.2.2"]}}}
    )
    assert parsed.helper.enable is True
    assert parsed.helper.router_ids == ["192.0.2.1", "192.0.2.2"]


def test_parse_ospf_helper_router_ids_dict():
    parsed = parse_ospf_gr({"helper": {"enable": {"router-id": {"192.0.2.1": {}}}}})
    assert parsed.helper.router_ids == ["192.0.2.1"]


def test_parse_ospfv3_helper_router_ids_list():
    parsed = parse_ospfv3_gr(
        {"helper": {"enable": {"router-id": ["192.0.2.1"]}}}
    )
    assert parsed.helper.enable is True
    assert parsed.helper.router_ids == ["192.0.2.1"]


def test_pages_expose_helper_router_id():
    ospf = OSPF_PAGE.read_text()
    ospfv3 = OSPFV3_PAGE.read_text()
    assert 'id="ospf-gr-helper-router-id"' in ospf
    assert "Helper Router IDs" in ospf
    assert 'id="ospfv3-gr-helper-router-id"' in ospfv3
    assert "Helper Router IDs" in ospfv3
    for text in (ospf, ospfv3):
        assert "VyOS 1." not in text
        assert "1.5+" not in text
        assert "1.4 only" not in text


def test_api_emits_helper_router_id_ops():
    ospf = OSPF_API.read_text()
    ospfv3 = OSPFV3_API.read_text()
    for text in (ospf, ospfv3):
        assert "set_graceful_restart_helper_enable_router_id" in text
        assert "delete_graceful_restart_helper_enable_router_id" in text
