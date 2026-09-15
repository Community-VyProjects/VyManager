"""PBR source/destination GeoIP is 1.5-only.

1.5 accepts source and destination geoip country-code and inverse-match on
policy route and route6; 1.4 rejects them. Paths checked with validateTmplPath
on both lab hosts.
"""

import ast
from pathlib import Path

import pytest

from routers.route.route import MatchConditions, parse_match_conditions
from vyos_builders.route.route_batch_builder import RouteBatchBuilder

REPO = Path(__file__).resolve().parents[2]
CREATE = REPO / "frontend/src/components/policies/CreateRouteRuleModal.tsx"
EDIT = REPO / "frontend/src/components/policies/EditRouteRuleModal.tsx"
API = REPO / "frontend/src/lib/api/route.ts"
ROUTER = REPO / "backend/routers/route/route.py"

SOURCE_COUNTRY = ["policy", "route", "FOO", "rule", "10", "source", "geoip", "country-code", "US"]
SOURCE_INVERSE = ["policy", "route", "FOO", "rule", "10", "source", "geoip", "inverse-match"]
DEST_COUNTRY = ["policy", "route", "FOO", "rule", "10", "destination", "geoip", "country-code", "DE"]
DEST_INVERSE = ["policy", "route", "FOO", "rule", "10", "destination", "geoip", "inverse-match"]
SOURCE6_COUNTRY = ["policy", "route6", "FOO", "rule", "10", "source", "geoip", "country-code", "US"]
DEST6_COUNTRY = ["policy", "route6", "FOO", "rule", "10", "destination", "geoip", "country-code", "DE"]


def test_geoip_paths_v1_5():
    builder = RouteBatchBuilder(version="1.5")
    builder.set_match_source_geoip_country("route", "FOO", "10", "US")
    builder.set_match_source_geoip_inverse("route", "FOO", "10")
    builder.delete_match_source_geoip_inverse("route", "FOO", "10")
    builder.delete_match_source_geoip_country("route", "FOO", "10")
    builder.delete_match_source_geoip("route", "FOO", "10")
    builder.set_match_destination_geoip_country("route", "FOO", "10", "DE")
    builder.set_match_destination_geoip_inverse("route", "FOO", "10")
    builder.delete_match_destination_geoip_inverse("route", "FOO", "10")
    builder.delete_match_destination_geoip_country("route", "FOO", "10")
    builder.delete_match_destination_geoip("route", "FOO", "10")
    builder.set_match_source_geoip_country("route6", "FOO", "10", "US")
    builder.set_match_destination_geoip_country("route6", "FOO", "10", "DE")
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [
        ("set", SOURCE_COUNTRY),
        ("set", SOURCE_INVERSE),
        ("delete", SOURCE_INVERSE),
        ("delete", SOURCE_COUNTRY[:-1]),
        ("delete", SOURCE_COUNTRY[:-2]),
        ("set", DEST_COUNTRY),
        ("set", DEST_INVERSE),
        ("delete", DEST_INVERSE),
        ("delete", DEST_COUNTRY[:-1]),
        ("delete", DEST_COUNTRY[:-2]),
        ("set", SOURCE6_COUNTRY),
        ("set", DEST6_COUNTRY),
    ]


@pytest.mark.parametrize(
    "method,args",
    [
        ("set_match_source_geoip_country", ("route", "FOO", "10", "US")),
        ("delete_match_source_geoip_country", ("route", "FOO", "10")),
        ("set_match_source_geoip_inverse", ("route", "FOO", "10")),
        ("delete_match_source_geoip_inverse", ("route", "FOO", "10")),
        ("delete_match_source_geoip", ("route", "FOO", "10")),
        ("set_match_destination_geoip_country", ("route", "FOO", "10", "DE")),
        ("delete_match_destination_geoip_country", ("route", "FOO", "10")),
        ("set_match_destination_geoip_inverse", ("route", "FOO", "10")),
        ("delete_match_destination_geoip_inverse", ("route", "FOO", "10")),
        ("delete_match_destination_geoip", ("route", "FOO", "10")),
        ("set_match_source_geoip_country", ("route6", "FOO", "10", "US")),
        ("set_match_destination_geoip_country", ("route6", "FOO", "10", "DE")),
    ],
)
def test_geoip_rejected_on_v1_4(method, args):
    builder = RouteBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        getattr(builder, method)(*args)


def test_capability_gated_to_v1_5():
    caps_15 = RouteBatchBuilder(version="1.5").get_capabilities()
    caps_14 = RouteBatchBuilder(version="1.4").get_capabilities()
    assert caps_15["features"]["geoip_matching"]["supported"] is True
    assert caps_14["features"]["geoip_matching"]["supported"] is False


def test_parse_geoip_list_and_inverse():
    match = MatchConditions()
    parse_match_conditions(
        {
            "source": {
                "geoip": {
                    "country-code": ["US", "CA"],
                    "inverse-match": {},
                }
            },
            "destination": {"geoip": {"country-code": "DE"}},
        },
        match,
    )
    assert match.source_geoip is not None
    assert match.source_geoip.country_code == ["US", "CA"]
    assert match.source_geoip.inverse_match is True
    assert match.destination_geoip is not None
    assert match.destination_geoip.country_code == ["DE"]
    assert match.destination_geoip.inverse_match is False


def test_parse_geoip_dict_keys():
    match = MatchConditions()
    parse_match_conditions(
        {"source": {"geoip": {"country-code": {"us": {}, "de": {}}}}},
        match,
    )
    assert match.source_geoip is not None
    assert match.source_geoip.country_code == ["us", "de"]


def test_parse_geoip_absent():
    match = MatchConditions()
    parse_match_conditions({"source": {"address": "10.0.0.1"}}, match)
    assert match.source_geoip is None
    assert match.destination_geoip is None


def test_modals_gate_geoip():
    create = CREATE.read_text()
    edit = EDIT.read_text()
    assert 'id="sourceGeoipCountry"' in create
    assert 'id="destGeoipCountry"' in create
    assert "features.geoip_matching" in create
    assert 'id="edit-sourceGeoipCountry"' in edit
    assert 'id="edit-destGeoipCountry"' in edit
    assert "features.geoip_matching" in edit
    for text in (create, edit):
        assert "VyOS 1." not in text
        assert "1.5+" not in text
        assert "1.4 only" not in text


def test_api_emits_geoip_ops():
    text = API.read_text()
    assert "set_match_source_geoip_country" in text
    assert "set_match_source_geoip_inverse" in text
    assert "set_match_destination_geoip_country" in text
    assert "set_match_destination_geoip_inverse" in text


def test_reorder_recreates_geoip():
    text = ROUTER.read_text()
    assert "set_match_source_geoip_country" in text
    assert "set_match_source_geoip_inverse" in text
    assert "set_match_destination_geoip_country" in text
    assert "set_match_destination_geoip_inverse" in text


def test_route_batch_handler_maps_value_error_to_http_400():
    tree = ast.parse(ROUTER.read_text())
    handler = next(
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "route_batch_configure"
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
        h
        for h in ast.walk(handler)
        if isinstance(h, ast.ExceptHandler) and "ValueError" in _handler_names(h)
    ]
    assert value_error_handlers, "route_batch_configure must catch ValueError"
    status_codes = set()
    for h in value_error_handlers:
        for node in ast.walk(h):
            if isinstance(node, ast.Call) and getattr(node.func, "id", None) == "HTTPException":
                for kw in node.keywords:
                    if kw.arg == "status_code" and isinstance(kw.value, ast.Constant):
                        status_codes.add(kw.value.value)
    assert 400 in status_codes, "ValueError must map to HTTP 400"
