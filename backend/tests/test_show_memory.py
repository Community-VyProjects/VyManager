"""Regression tests for VyOS GraphQL RAM accounting (values in bytes)."""
from routers.show import parse_gql_memory


def test_live_vyos_rolling_memory_does_not_count_cache_twice():
    # VyOS 999.202609141528, ROCK 5B: memory.show(raw=True).
    ram = {"total": 7856656384, "free": 6886948864, "used": 969707520,
           "buffers": 47730688, "cached": 1159532544}
    result = parse_gql_memory(ram)
    assert result == {"total": "7.32 GB", "free": "6.41 GB", "used": "924.79 MB"}


def test_missing_used_is_derived_from_available():
    assert parse_gql_memory({"total": 4096, "free": 1024, "cached": 2048}) == {
        "total": "4.00 KB", "free": "1.00 KB", "used": "3.00 KB"}


def test_zero_available_is_a_value():
    assert parse_gql_memory({"total": 1024, "free": 0, "used": 1024}) == {
        "total": "1.00 KB", "free": "0 B", "used": "1.00 KB"}


def test_explicit_zero_used_is_preserved():
    assert parse_gql_memory({"total": 1024, "free": 512, "used": 0})["used"] == "0 B"


def test_missing_memory():
    assert parse_gql_memory({}) == {"total": None, "free": None, "used": None}
