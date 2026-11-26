"""VRF OSPF ops run the global OSPF builder; the VRF mapper only holds fallbacks.

``vrf name <vrf> protocols ospf`` is the global OSPF tree on both labs (1.5
adds redistribute nhrp, retransmit-window and authentication null under the
same nodes). The global OSPF mapper and its 1.5 subclass own those leaves and
the redistribute allowlist, so the VRF capability flags and op gates read it
and a version string alone cannot turn either on.
"""

import inspect

import pytest

from vyos_builders.ospf.ospf_batch_builder import OspfBatchBuilder
from vyos_builders.vrf.vrf_batch_builder import VrfBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.base import BaseFeatureMapper
from vyos_mappers.ospf.ospf import OspfMapper
from vyos_mappers.ospf.ospf_versions.v1_5 import OspfMapperV1_5
from vyos_mappers.vrf.vrf_ospf import VrfOspfMapper

PREFIX = ["vrf", "name", "T-V", "protocols", "ospf"]

NHRP_OPS = [
    ("set_vrf_ospf_redistribute", "nhrp", "set", PREFIX + ["redistribute", "nhrp"]),
    ("delete_vrf_ospf_redistribute", "nhrp", "delete", PREFIX + ["redistribute", "nhrp"]),
    ("set_vrf_ospf_redistribute_metric", "nhrp,10", "set", PREFIX + ["redistribute", "nhrp", "metric", "10"]),
    ("delete_vrf_ospf_redistribute_metric", "nhrp", "delete", PREFIX + ["redistribute", "nhrp", "metric"]),
]

NULL_AUTH_OPS = [
    (
        "set_vrf_ospf_interface_authentication_null",
        "eth0",
        "set",
        PREFIX + ["interface", "eth0", "authentication", "null"],
        "interface authentication null",
    ),
    (
        "delete_vrf_ospf_area_virtual_link_authentication_null",
        "0,192.0.2.1",
        "delete",
        PREFIX + ["area", "0", "virtual-link", "192.0.2.1", "authentication", "null"],
        "virtual-link authentication null",
    ),
]


def _nhrp_flag(version: str) -> bool:
    return VrfBatchBuilder(version).get_capabilities()["features"]["ospf_redistribute_nhrp"]["supported"]


def _run(version: str, op: str, value: str):
    builder = VrfBatchBuilder(version)
    getattr(builder, op)("T-V", value)
    return [(o["op"], o["path"]) for o in builder.get_operations()]


def _global_paths(version: str):
    """CLI paths (under ``protocols ospf``) each global builder op queues for
    placeholder arguments, keyed by verb."""
    paths = {"set": set(), "delete": set()}
    for name, _ in inspect.getmembers(OspfBatchBuilder, inspect.isfunction):
        verb = name.split("_", 1)[0]
        if verb not in paths:
            continue
        builder = OspfBatchBuilder(version)
        method = getattr(builder, name)
        args = [f"A{i}" for i in range(len(inspect.signature(method).parameters))]
        try:
            method(*args)
        except (ValueError, TypeError):
            continue
        for op in builder.get_operations():
            paths[op["op"]].add(tuple(op["path"][2:]))
    return paths


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_mapper_holds_only_paths_the_global_builder_lacks(version):
    """VRF dispatch tries the global builder first, so a VRF OSPF path the
    global builder queues for both verbs is a second owner. Compares the CLI
    paths, so a getter under another name than the global op is caught too."""
    glob = _global_paths(version)
    mapper = VrfOspfMapper(version)
    duplicates = []
    for name, method in inspect.getmembers(mapper, inspect.ismethod):
        if not name.startswith("get_"):
            continue
        params = list(inspect.signature(method).parameters)[1:]
        samples = {"area_type": "nssa"}
        args = [samples.get(p, f"A{i}") for i, p in enumerate(params)]
        path = tuple(method("T-V", *args)[len(PREFIX):])
        set_owned = path in glob["set"]
        delete_owned = path in glob["delete"] or (params[-1:] == ["value"] and path[:-1] in glob["delete"])
        if set_owned and delete_owned:
            duplicates.append(name)
    assert duplicates == []


def test_mapper_has_no_redistribute_allowlist_or_version_check():
    for name in ("redistribute_protocols", "_require_redistribute", "_REDIST", "__init__"):
        assert name not in vars(VrfOspfMapper), name
    source = inspect.getsource(VrfOspfMapper)
    assert "in self.version" not in source
    assert '"1.4"' not in source and '"1.5"' not in source


@pytest.mark.parametrize("leaf, value, path", [
    ("router_id", "192.0.2.1", ["router-id", "192.0.2.1"]),
    ("abr_type", "cisco", ["abr-type", "cisco"]),
    ("opaque_lsa", None, ["opaque-lsa"]),
    ("rfc1583_compatibility", None, ["rfc1583-compatibility"]),
])
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_parameters_ops_run_the_global_builder(version, leaf, value, path):
    builder = VrfBatchBuilder(version)
    set_args = ("T-V", value) if value else ("T-V",)
    getattr(builder, f"set_vrf_ospf_parameters_{leaf}")(*set_args)
    getattr(builder, f"delete_vrf_ospf_parameters_{leaf}")("T-V")
    leaf_path = PREFIX + ["parameters"] + path
    assert [(o["op"], o["path"]) for o in builder.get_operations()] == [
        ("set", leaf_path),
        ("delete", leaf_path[:-1] if value else leaf_path),
    ]


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_passive_interface_default_runs_the_global_builder(version):
    builder = VrfBatchBuilder(version)
    builder.set_vrf_ospf_passive_interface_default("T-V")
    builder.delete_vrf_ospf_passive_interface_default("T-V")
    path = PREFIX + ["passive-interface", "default"]
    # passive-interface is a value leaf (allowed: default): the delete drops the value.
    assert [(o["op"], o["path"]) for o in builder.get_operations()] == [("set", path), ("delete", path[:-1])]


@pytest.mark.parametrize("area_type", ["normal", "nssa", "stub"])
def test_area_type_select_sets_a_lab_value(area_type):
    assert _run("1.5", "set_vrf_ospf_area_type", f"0,{area_type}") == [
        ("set", PREFIX + ["area", "0", "area-type", area_type]),
    ]


def test_area_type_outside_the_global_allowlist_is_rejected():
    with pytest.raises(ValueError, match="area-type bogus is not supported"):
        _run("1.4", "set_vrf_ospf_area_type", "0,bogus")


@pytest.mark.parametrize("version", ["1.4", "1.5", "rolling-202611"])
def test_registry_returns_the_base_mapper(version):
    mapper = CommandMapperRegistry.get_mapper("vrf_ospf", version)
    assert isinstance(mapper, BaseFeatureMapper)
    assert type(mapper) is VrfOspfMapper


@pytest.mark.parametrize("version, expected", [("1.4", False), ("1.5", True), ("rolling-202611", True)])
def test_nhrp_flag_follows_the_labs(version, expected):
    assert _nhrp_flag(version) is expected


@pytest.mark.parametrize("op, value, verb, path", NHRP_OPS, ids=[row[0] for row in NHRP_OPS])
def test_nhrp_ops_run_the_global_builder_on_1_5(op, value, verb, path):
    assert _run("1.5", op, value) == [(verb, path)]


@pytest.mark.parametrize("op, value, verb, path", NHRP_OPS, ids=[row[0] for row in NHRP_OPS])
def test_nhrp_ops_are_rejected_on_1_4(op, value, verb, path):
    with pytest.raises(ValueError, match="redistribute nhrp is not supported"):
        _run("1.4", op, value)


def test_nhrp_gate_reads_the_mapper_not_the_version(monkeypatch):
    """The 1.5 subclass without nhrp hides and rejects it on a 1.5 string; the
    shared class given nhrp allows it on a 1.4 string."""
    monkeypatch.setattr(OspfMapperV1_5, "redistribute_protocol_list", OspfMapper.redistribute_protocol_list)
    assert _nhrp_flag("1.5") is False
    for op, value, _verb, _path in NHRP_OPS:
        with pytest.raises(ValueError, match="redistribute nhrp is not supported"):
            _run("1.5", op, value)

    monkeypatch.setattr(OspfMapper, "_REDIST", OspfMapper._REDIST + ("nhrp",))
    assert _nhrp_flag("1.4") is True
    for op, value, verb, path in NHRP_OPS:
        assert _run("1.4", op, value) == [(verb, path)]


@pytest.mark.parametrize("op, value, verb, path, node", NULL_AUTH_OPS, ids=[row[0] for row in NULL_AUTH_OPS])
def test_null_authentication_runs_the_global_builder_on_1_5(op, value, verb, path, node):
    assert _run("1.5", op, value) == [(verb, path)]


@pytest.mark.parametrize("op, value, verb, path, node", NULL_AUTH_OPS, ids=[row[0] for row in NULL_AUTH_OPS])
def test_null_authentication_is_rejected_on_1_4(op, value, verb, path, node):
    with pytest.raises(ValueError, match=f"{node} is not supported"):
        _run("1.4", op, value)
