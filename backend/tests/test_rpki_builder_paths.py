"""RPKI builder golden paths, the version gate, and the mapper shape (issue #1415).

Lab (1.4.3 and a 1.5 rolling build): every ``protocols rpki`` leaf exists on
both versions except ``cache <ADDR> source-address`` (1.5 only).
"""

import inspect
from pathlib import Path

import pytest

from vyos_builders.rpki.rpki_batch_builder import DEFAULTS, RANGES, RpkiBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.rpki.rpki import RpkiMapper
from vyos_mappers.rpki.rpki_versions import RpkiMapperV1_5, get_rpki_mapper

BASE = ["protocols", "rpki"]
ADDR = "192.0.2.1"
CACHE = BASE + ["cache", ADDR]

# (method, args, op, path) for leaves both versions have.
BOTH = [
    ("set_cache", (ADDR,), "set", CACHE),
    ("delete_cache", (ADDR,), "delete", CACHE),
    ("set_cache_port", (ADDR, "3323"), "set", CACHE + ["port", "3323"]),
    ("delete_cache_port", (ADDR,), "delete", CACHE + ["port"]),
    ("set_cache_preference", (ADDR, "10"), "set", CACHE + ["preference", "10"]),
    ("delete_cache_preference", (ADDR,), "delete", CACHE + ["preference"]),
    ("set_cache_ssh_key", (ADDR, "rpki-key"), "set", CACHE + ["ssh", "key", "rpki-key"]),
    ("delete_cache_ssh_key", (ADDR,), "delete", CACHE + ["ssh", "key"]),
    ("set_cache_ssh_username", (ADDR, "rpki"), "set", CACHE + ["ssh", "username", "rpki"]),
    ("delete_cache_ssh_username", (ADDR,), "delete", CACHE + ["ssh", "username"]),
    ("delete_cache_ssh", (ADDR,), "delete", CACHE + ["ssh"]),
    ("set_expire_interval", ("7200",), "set", BASE + ["expire-interval", "7200"]),
    ("delete_expire_interval", (), "delete", BASE + ["expire-interval"]),
    ("set_polling_period", ("300",), "set", BASE + ["polling-period", "300"]),
    ("delete_polling_period", (), "delete", BASE + ["polling-period"]),
    ("set_retry_interval", ("600",), "set", BASE + ["retry-interval", "600"]),
    ("delete_retry_interval", (), "delete", BASE + ["retry-interval"]),
    ("delete_rpki", (), "delete", BASE),
]

# Leaves only 1.5 has; 1.4 raises ValueError.
V1_5_ONLY = [
    ("set_cache_source_address", (ADDR, "192.0.2.10"), "set", CACHE + ["source-address", "192.0.2.10"]),
    ("delete_cache_source_address", (ADDR,), "delete", CACHE + ["source-address"]),
]

VERSIONS = ["1.4", "1.5", "2026.09.23-0027-rolling"]


def _ops(builder):
    return [(item["op"], item["path"]) for item in builder.get_operations()]


def test_every_builder_op_has_a_golden_row():
    ops = {
        name
        for name, _ in inspect.getmembers(RpkiBatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
    }
    assert ops == {row[0] for row in BOTH + V1_5_ONLY}


@pytest.mark.parametrize("version", VERSIONS)
@pytest.mark.parametrize("method, args, op, path", BOTH)
def test_shared_paths(version, method, args, op, path):
    builder = RpkiBatchBuilder(version=version)
    getattr(builder, method)(*args)
    assert _ops(builder) == [(op, path)]


@pytest.mark.parametrize("version", ["1.5", "2026.09.23-0027-rolling"])
@pytest.mark.parametrize("method, args, op, path", V1_5_ONLY)
def test_1_5_only_paths(version, method, args, op, path):
    builder = RpkiBatchBuilder(version=version)
    getattr(builder, method)(*args)
    assert _ops(builder) == [(op, path)]


@pytest.mark.parametrize("method, args, op, path", V1_5_ONLY)
def test_1_5_only_paths_raise_on_1_4(method, args, op, path):
    builder = RpkiBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="^rpki cache source-address is not supported on this device$"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


# ---------------------------------------------------------------------------
# Mapper shape: shared class on 1.4, a 1.5 subclass, no merge proxy
# ---------------------------------------------------------------------------


def test_factory_returns_the_shared_class_on_1_4_and_the_subclass_otherwise():
    assert type(get_rpki_mapper("1.4")) is RpkiMapper
    assert type(get_rpki_mapper("1.4.3")) is RpkiMapper
    # The 1.5 lab reports a rolling string; only a string with 1.4 is 1.4.
    for version in ("1.5", "2026.09.23-0027-rolling", "latest", "circinus"):
        assert type(get_rpki_mapper(version)) is RpkiMapperV1_5


@pytest.mark.parametrize("version, expected", [("1.4", RpkiMapper), ("1.5", RpkiMapperV1_5)])
def test_registry_returns_the_factory_class(version, expected):
    assert type(CommandMapperRegistry.get_mapper("rpki", version)) is expected


def test_source_address_paths_live_only_on_the_subclass():
    for name in ("get_cache_source_address", "get_cache_source_address_delete"):
        assert not hasattr(RpkiMapper, name)
        assert name in RpkiMapperV1_5.__dict__
    assert RpkiMapper("1.4").versioned_cache_nodes() == frozenset()
    assert RpkiMapperV1_5("1.5").versioned_cache_nodes() == frozenset({"source-address"})


def test_no_empty_version_files():
    package = Path(__file__).resolve().parents[1] / "vyos_mappers" / "rpki" / "rpki_versions"
    assert sorted(p.name for p in package.glob("*.py")) == ["__init__.py", "v1_5.py"]


def test_shared_mapper_has_no_init_override():
    assert "__init__" not in RpkiMapper.__dict__
    assert "__init__" not in RpkiMapperV1_5.__dict__


# ---------------------------------------------------------------------------
# Capabilities: ranges and defaults, no version_info
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("version", VERSIONS)
def test_capabilities_serve_ranges_and_defaults(version):
    caps = RpkiBatchBuilder(version=version).get_capabilities()
    assert "version_info" not in caps
    assert caps["ranges"] == RANGES
    assert caps["defaults"] == DEFAULTS
    assert caps["ranges"]["expire_interval"] == {"min": 600, "max": 172800}
    assert caps["ranges"]["polling_period"] == {"min": 1, "max": 86400}
    assert caps["ranges"]["retry_interval"] == {"min": 1, "max": 7200}
    assert caps["ranges"]["port"] == {"min": 1, "max": 65535}
    assert caps["ranges"]["preference"] == {"min": 1, "max": 255}
    assert caps["defaults"] == {"expire_interval": 7200, "polling_period": 300, "retry_interval": 600}


# ---------------------------------------------------------------------------
# Value checks mirror the lab validators
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("address", ["192.0.2.1", "2001:db8::1", "rpki.example.com", "rpki-1"])
def test_cache_address_accepts_ip_and_hostname(address):
    builder = RpkiBatchBuilder(version="1.5")
    builder.set_cache(address)
    assert _ops(builder) == [("set", BASE + ["cache", address])]


@pytest.mark.parametrize("address", ["", "-rpki", "rpki cache", "rpki_cache", "192.0.2.1/32", "fe80::1%eth0", "::ffff:192.0.2.1"])
@pytest.mark.parametrize("method", ["set_cache", "delete_cache", "delete_cache_ssh"])
def test_cache_address_rejects_what_the_lab_rejects(method, address):
    builder = RpkiBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="^rpki cache address must be an IP address or a hostname$"):
        getattr(builder, method)(address)
    assert builder.get_operations() == []


@pytest.mark.parametrize("key", sorted(RANGES))
def test_numeric_leaves_take_the_lab_bounds(key):
    bounds = RANGES[key]
    # The 400 detail names the CLI leaf, as the sibling messages do.
    LEAF = {
        "port": "cache port",
        "preference": "cache preference",
        "expire_interval": "expire-interval",
        "polling_period": "polling-period",
        "retry_interval": "retry-interval",
    }
    method = {
        "port": "set_cache_port",
        "preference": "set_cache_preference",
        "expire_interval": "set_expire_interval",
        "polling_period": "set_polling_period",
        "retry_interval": "set_retry_interval",
    }[key]
    prefix = (ADDR,) if key in ("port", "preference") else ()
    for good in (bounds["min"], bounds["max"]):
        builder = RpkiBatchBuilder(version="1.5")
        getattr(builder, method)(*prefix, str(good))
        assert _ops(builder)[0][1][-1] == str(good)
    for bad in (str(bounds["min"] - 1), str(bounds["max"] + 1), "x", "1.5", " 1", "\u0663"):
        builder = RpkiBatchBuilder(version="1.5")
        with pytest.raises(ValueError, match=f"^rpki {LEAF[key]} must be a number from {bounds['min']} to {bounds['max']}$"):
            getattr(builder, method)(*prefix, bad)
        assert builder.get_operations() == []


@pytest.mark.parametrize("source", ["2001:db8::1", "192.0.2", "192.0.2.010", "host"])
def test_source_address_is_ipv4(source):
    builder = RpkiBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="^rpki cache source-address must be an IPv4 address$"):
        builder.set_cache_source_address(ADDR, source)
    assert builder.get_operations() == []


@pytest.mark.parametrize("username", ["", "x" * 129, "r\u00e9"])
def test_ssh_username_is_1_to_128_ascii(username):
    builder = RpkiBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match="^rpki cache ssh username must be 1 to 128 ASCII characters$"):
        builder.set_cache_ssh_username(ADDR, username)
    assert builder.get_operations() == []
    builder.set_cache_ssh_username(ADDR, "x" * 128)
    assert _ops(builder) == [("set", CACHE + ["ssh", "username", "x" * 128])]
