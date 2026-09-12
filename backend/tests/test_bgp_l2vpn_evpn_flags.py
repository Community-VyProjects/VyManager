"""BGP L2VPN EVPN address-family control flags — path, parse, capability, 400."""

import ast
from pathlib import Path

import pytest

from routers.bgp.bgp import parse_address_families
from vyos_builders.bgp.bgp_batch_builder import BgpBatchBuilder
from vyos_builders.vrf.vrf_batch_builder import VrfBatchBuilder
from vyos_mappers.bgp.bgp import BgpMapper
from vyos_mappers.vrf.vrf_bgp import VrfBgpMapper


def _method(flag: str, verb: str) -> str:
    return f"{verb}_af_l2vpn_evpn_{flag.replace('-', '_')}"


def _flag_cases():
    flags = sorted(BgpMapper("1.5").l2vpn_evpn_control_flags())
    cases = []
    for flag in flags:
        path = ["protocols", "bgp", "address-family", "l2vpn-evpn", flag]
        cases.append((_method(flag, "set"), "set", path))
        cases.append((_method(flag, "delete"), "delete", path))
    return cases


@pytest.mark.parametrize("method, op, expected_path", _flag_cases())
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_l2vpn_evpn_control_flag_paths(method, op, expected_path, version):
    builder = BgpBatchBuilder(version=version)
    getattr(builder, method)()
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_unknown_flag_rejected(version):
    mapper = BgpMapper(version)
    with pytest.raises(ValueError):
        mapper.get_af_l2vpn_evpn_flag("not-a-real-flag")
    vrf = VrfBgpMapper(version)
    with pytest.raises(ValueError):
        vrf.get_bgp_af_l2vpn_evpn_flag("blue", "not-a-real-flag")


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_capability_reads_mapper_allowlist(version):
    mapper_flags = BgpMapper(version).l2vpn_evpn_control_flags()
    caps = BgpBatchBuilder(version=version).get_capabilities()
    feature = caps["features"]["l2vpn_evpn_control_flags"]
    assert feature["supported"] is True
    assert set(feature["flags"]) == set(mapper_flags)
    vrf_caps = VrfBatchBuilder(version=version).get_capabilities()
    assert vrf_caps["features"]["l2vpn_evpn_control_flags"]["supported"] is True


def test_vrf_reuses_global_builder_with_prefix():
    global_ops = (
        BgpBatchBuilder("1.5")
        .set_af_l2vpn_evpn_advertise_all_vni()
        .get_operations()
    )
    vrf = VrfBatchBuilder("1.5")
    vrf.set_vrf_bgp_af_l2vpn_evpn_advertise_all_vni("blue")
    assert vrf.get_operations() == [
        {"op": op["op"], "path": ["vrf", "name", "blue"] + op["path"]}
        for op in global_ops
    ]


def test_parse_l2vpn_evpn_flags():
    families = parse_address_families({
        "ipv4-unicast": {"network": {"192.0.2.0/24": {}}},
        "l2vpn-evpn": {
            "advertise-all-vni": {},
            "rt-auto-derive": {},
            "rd": "1:1",
        },
    })
    by_afi = {f.afi: f for f in families}
    assert "l2vpn-evpn" in by_afi
    assert set(by_afi["l2vpn-evpn"].evpn_flags) == {
        "advertise-all-vni",
        "rt-auto-derive",
    }
    assert by_afi["ipv4-unicast"].evpn_flags == []
    assert by_afi["ipv4-unicast"].networks[0].prefix == "192.0.2.0/24"


def _handler_maps_value_error_to_400(router_path: Path, handler_name: str) -> None:
    tree = ast.parse(router_path.read_text())
    handler = next(
        node for node in ast.walk(tree)
        if isinstance(node, ast.AsyncFunctionDef) and node.name == handler_name
    )

    def _handler_names(exc):
        names = set()
        etype = exc.type
        if isinstance(etype, ast.Name):
            names.add(etype.id)
        elif isinstance(etype, ast.Tuple):
            names.update(e.id for e in etype.elts if isinstance(e, ast.Name))
        return names

    value_error_handlers = [
        h for h in ast.walk(handler)
        if isinstance(h, ast.ExceptHandler) and "ValueError" in _handler_names(h)
    ]
    assert value_error_handlers, f"{handler_name} must catch ValueError"

    status_codes = set()
    for h in value_error_handlers:
        for node in ast.walk(h):
            if isinstance(node, ast.Call) and getattr(node.func, "id", None) == "HTTPException":
                for kw in node.keywords:
                    if kw.arg == "status_code" and isinstance(kw.value, ast.Constant):
                        status_codes.add(kw.value.value)
    assert 400 in status_codes, "ValueError must map to HTTP 400"


def test_bgp_batch_handler_maps_value_error_to_http_400():
    router_path = Path(__file__).resolve().parents[1] / "routers" / "bgp" / "bgp.py"
    _handler_maps_value_error_to_400(router_path, "bgp_batch_configure")


def test_vrf_batch_handler_maps_value_error_to_http_400():
    router_path = Path(__file__).resolve().parents[1] / "routers" / "vrf" / "vrf.py"
    _handler_maps_value_error_to_400(router_path, "vrf_batch_configure")
