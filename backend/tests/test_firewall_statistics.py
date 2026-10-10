"""Parser and interest gating for firewall rule counters."""

import asyncio

from firewall_statistics import (
    FIREWALL_STATS_INTEREST,
    chain_key,
    parse_firewall_statistics,
    top_firewall_hits,
)
from routers.show import DeviceDataBroadcaster, _STREAM_INTERESTS

# Captured from the 1.4 lab Show(path: ["firewall", "statistics"]) op.
LAB_SAMPLE = """\
Rulesets Statistics

---------------------------------
ipv4 Firewall "forward filter"

Rule       Packets     Bytes  Action    Source         Destination    Inbound-Interface    Outbound-interface
-------  ---------  --------  --------  -------------  -------------  -------------------  --------------------
100         220483  26475823  accept    any            any            any                  any
101              0         0  accept    !192.168.8.3   192.168.1.1    any                  any
103              0         0  accept    Test_addr      any            any                  any
default          0         0  accept    any            any            any                  any


---------------------------------
ipv4 Firewall "name Test"

Rule       Packets    Bytes  Action    Source    Destination    Inbound-Interface    Outbound-interface
-------  ---------  -------  --------  --------  -------------  -------------------  --------------------
100              0        0  accept    any       any            any                  any
default          0        0  drop      any       any            any                  any


---------------------------------
ipv4 State Policy

State    Packets    Bytes  Conditions
-------  ---------  -----  ----------
invalid        9       80  ct state invalid


---------------------------------
bridge Firewall "name Test"

Rule       Packets    Bytes  Action    Source    Destination    Inbound-Interface    Outbound-interface
-------  ---------  -------  --------  --------  -------------  -------------------  --------------------
102              4       90  accept    any       any            eth1.100             eth1.200
default          0        0  accept    any       any            any                  any
"""


def test_chain_key_maps_base_custom_and_prerouting():
    assert chain_key("forward filter") == ("forward", False)
    assert chain_key("name Test") == ("Test", True)
    assert chain_key("name LAN-WAN") == ("LAN-WAN", True)
    assert chain_key("prerouting raw") == ("prerouting_raw", False)


def test_parse_lab_sample_joins_on_family_chain_and_rule():
    stats = parse_firewall_statistics(LAB_SAMPLE)
    by_key = {(rule.family, rule.chain, rule.custom, rule.rule): rule for rule in stats.rules}

    forward = by_key[("ipv4", "forward", False, "100")]
    assert forward.packets == 220483
    assert forward.bytes == 26475823
    assert forward.action == "accept"

    assert by_key[("ipv4", "Test", True, "default")].action == "drop"
    assert by_key[("bridge", "Test", True, "102")].packets == 4
    # State policy is not a firewall rule.
    assert all(rule.chain != "invalid" for rule in stats.rules)
    assert len(stats.rules) == 8


def test_parse_empty_and_header_only():
    assert parse_firewall_statistics("").rules == []
    assert parse_firewall_statistics("Rulesets Statistics\n").rules == []


def test_parse_prerouting_raw_section():
    text = """\
---------------------------------
ipv6 Firewall "prerouting raw"

Rule    Packets    Bytes  Action    Source    Destination    Inbound-Interface    Outbound-interface
------  ---------  -----  --------  --------  -------------  -------------------  --------------------
10           3        30  drop      any       any            any                  any
"""
    rules = parse_firewall_statistics(text).rules
    assert len(rules) == 1
    assert rules[0].family == "ipv6"
    assert rules[0].chain == "prerouting_raw"
    assert rules[0].custom is False
    assert rules[0].rule == "10"
    assert rules[0].packets == 3


def test_top_hits_drop_zeros_and_rank_by_packets():
    stats = parse_firewall_statistics(LAB_SAMPLE)
    hits = top_firewall_hits(stats, limit=1)
    assert hits.total == 2
    assert len(hits.hits) == 1
    assert hits.hits[0].packets == 220483
    assert hits.hits[0].chain == "forward"


def test_firewall_statistics_is_an_interest_not_a_shared_fetch():
    assert FIREWALL_STATS_INTEREST in _STREAM_INTERESTS


def test_firewall_cycle_does_not_fetch_without_a_subscriber():
    broadcaster = DeviceDataBroadcaster("instance", service=object())
    broadcaster._handle_firewall_cycle(start=True)
    assert broadcaster._firewall_task is None

    queue = asyncio.Queue()
    broadcaster._subscribers.append((queue, frozenset({FIREWALL_STATS_INTEREST})))
    broadcaster._subscribers = []
    broadcaster._handle_firewall_cycle(start=True)
    assert broadcaster._firewall_task is None
