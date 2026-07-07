"""Unit tests for the Segment Routing (SRv6) builder, mapper and config parsers.

The builder and mapper are pure logic: builder operations must translate to
exact VyOS configuration paths under ``protocols segment-routing``. Fixtures
mirror the config-dict shape returned by ``get_full_config`` for the
``protocols segment-routing`` subtree. No VyOS service or router needed.
"""

from routers.segment_routing.segment_routing import (
    _parse_locators,
    _parse_interfaces,
    _safe_int,
)
from vyos_builders import SegmentRoutingBatchBuilder


def make_builder(version="1.5"):
    return SegmentRoutingBatchBuilder(version=version)


def paths(builder):
    return [(op["op"], op["path"]) for op in builder.get_operations()]


# ============================================================================
# Builder → VyOS path translation
# ============================================================================


def test_locator_create_full():
    b = make_builder()
    b.set_locator_prefix("loc1", "2001:db8:aaaa::/48")
    b.set_locator_block_len("loc1", "40")
    b.set_locator_node_len("loc1", "24")
    b.set_locator_func_bits("loc1", "16")
    b.set_locator_behavior_usid("loc1")

    base = ["protocols", "segment-routing", "srv6", "locator", "loc1"]
    assert paths(b) == [
        ("set", base + ["prefix", "2001:db8:aaaa::/48"]),
        ("set", base + ["block-len", "40"]),
        ("set", base + ["node-len", "24"]),
        ("set", base + ["func-bits", "16"]),
        ("set", base + ["behavior-usid"]),
    ]


def test_locator_delete_operations():
    b = make_builder()
    b.delete_locator_behavior_usid("loc1")
    b.delete_locator("loc1")

    base = ["protocols", "segment-routing", "srv6", "locator", "loc1"]
    assert paths(b) == [
        ("delete", base + ["behavior-usid"]),
        ("delete", base),
    ]


def test_interface_hmac_operations():
    b = make_builder()
    b.set_interface_hmac("eth0", "drop")
    b.delete_interface_hmac("eth0")
    b.set_interface_srv6("eth1")
    b.delete_interface("eth1")

    assert paths(b) == [
        ("set", ["protocols", "segment-routing", "interface", "eth0", "srv6", "hmac", "drop"]),
        ("delete", ["protocols", "segment-routing", "interface", "eth0", "srv6", "hmac"]),
        ("set", ["protocols", "segment-routing", "interface", "eth1", "srv6"]),
        ("delete", ["protocols", "segment-routing", "interface", "eth1"]),
    ]


def test_delete_entire_segment_routing():
    b = make_builder()
    b.delete_segment_routing()
    assert paths(b) == [("delete", ["protocols", "segment-routing"])]


def test_delete_srv6_subtree():
    # Removing the last locator leaves an empty srv6 node that VyOS verify()
    # still treats as "SRv6 configured"; delete_srv6 clears the whole subtree.
    b = make_builder()
    b.delete_srv6()
    assert paths(b) == [("delete", ["protocols", "segment-routing", "srv6"])]


def test_modify_requires_recreate_flag():
    assert make_builder("1.4").get_capabilities()["version_info"]["modify_requires_recreate"] is True
    assert make_builder("1.5").get_capabilities()["version_info"]["modify_requires_recreate"] is False


def test_paths_identical_on_both_versions():
    ops = []
    for version in ("1.4", "1.5"):
        b = make_builder(version)
        b.set_locator_prefix("loc1", "2001:db8::/48")
        b.set_interface_hmac("eth0", "ignore")
        ops.append(paths(b))
    assert ops[0] == ops[1]


def test_capabilities_supported_on_both_versions():
    for version, key in (("1.4", "is_1_4"), ("1.5", "is_1_5")):
        caps = make_builder(version).get_capabilities()
        assert caps["version_info"][key] is True
        assert all(f["supported"] for f in caps["features"].values())


def test_builder_starts_empty():
    b = make_builder()
    assert b.is_empty()
    b.set_locator("loc1")
    assert not b.is_empty()


# ============================================================================
# Config parsers
# ============================================================================

# ``protocols segment-routing`` subtree as returned by get_full_config
SR_CONFIG = {
    "srv6": {
        "locator": {
            "loc1": {
                "prefix": "2001:db8:aaaa::/48",
                "block-len": "40",
                "node-len": "24",
                "func-bits": "16",
                "behavior-usid": {},
            },
            "loc2": {
                "prefix": "2001:db8:bbbb::/48",
            },
        },
    },
    "interface": {
        "eth0": {"srv6": {"hmac": "drop"}},
        "eth1": {"srv6": {}},
    },
}


def test_parse_locators():
    locators = {l.name: l for l in _parse_locators(SR_CONFIG["srv6"]["locator"])}
    assert set(locators) == {"loc1", "loc2"}

    loc1 = locators["loc1"]
    assert loc1.prefix == "2001:db8:aaaa::/48"
    assert loc1.block_len == 40
    assert loc1.node_len == 24
    assert loc1.func_bits == 16
    assert loc1.behavior_usid is True

    loc2 = locators["loc2"]
    assert loc2.prefix == "2001:db8:bbbb::/48"
    assert loc2.block_len is None
    assert loc2.behavior_usid is False


def test_parse_interfaces():
    interfaces = {i.name: i for i in _parse_interfaces(SR_CONFIG["interface"])}
    assert set(interfaces) == {"eth0", "eth1"}
    assert interfaces["eth0"].hmac == "drop"
    assert interfaces["eth1"].hmac is None


def test_parse_empty_inputs():
    assert _parse_locators({}) == []
    assert _parse_interfaces({}) == []
    assert _parse_locators({"bare": None})[0].prefix is None
    assert _parse_interfaces({"eth9": None})[0].hmac is None


def test_safe_int():
    assert _safe_int("40") == 40
    assert _safe_int(None) is None
    assert _safe_int("not-a-number") is None
