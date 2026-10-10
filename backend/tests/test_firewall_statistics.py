"""Parser and interest gating for firewall rule counters."""

import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from firewall_statistics import (
    FIREWALL_STATS_INTEREST,
    FirewallRuleCounter,
    chain_key,
    firewall_hits_for_viewer,
    parse_firewall_statistics,
    top_firewall_hits,
    visible_firewall_rules,
    zone_chain_names,
)
from rbac_permissions import FeatureGroup, PermissionLevel
from routers.show import (
    DeviceDataBroadcaster,
    _STREAM_INTERESTS,
    dashboard_stream,
    get_firewall_statistics,
    retain_firewall_interest,
)

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


def test_interested_subscriber_starts_a_fetch(monkeypatch):
    async def fake_fetch(service):
        return "Rulesets Statistics\n"

    monkeypatch.setattr("routers.show.fetch_firewall_statistics_text", fake_fetch)

    async def scenario():
        broadcaster = DeviceDataBroadcaster("instance", service=object())
        queue = asyncio.Queue()
        broadcaster._subscribers.append((queue, frozenset({FIREWALL_STATS_INTEREST})))
        broadcaster._handle_firewall_cycle(start=True)
        task = broadcaster._firewall_task
        assert task is not None
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)

    asyncio.run(scenario())


def test_firewall_cycle_respects_the_15_second_floor():
    async def scenario():
        broadcaster = DeviceDataBroadcaster("instance", service=object())
        queue = asyncio.Queue()
        broadcaster._subscribers.append((queue, frozenset({FIREWALL_STATS_INTEREST})))
        broadcaster._last_firewall_query_time = asyncio.get_running_loop().time()
        broadcaster._handle_firewall_cycle(start=True)
        assert broadcaster._firewall_task is None

    asyncio.run(scenario())


def test_unsubscribe_cancels_an_in_flight_firewall_fetch():
    async def scenario():
        broadcaster = DeviceDataBroadcaster("instance", service=object())
        queue = asyncio.Queue()
        other = asyncio.Queue()
        broadcaster._subscribers.append((queue, frozenset({FIREWALL_STATS_INTEREST})))
        broadcaster._subscribers.append((other, frozenset()))
        broadcaster._firewall_task = asyncio.create_task(asyncio.sleep(60))
        broadcaster.unsubscribe(queue)
        assert broadcaster._firewall_task is None
        assert broadcaster._subscribers == [(other, frozenset())]

    asyncio.run(scenario())


def test_zone_chain_names_reads_ipv4_and_ipv6_references():
    config = {
        "firewall": {
            "zone": {
                "LAN": {
                    "from": {"WAN": {"firewall": {"name": "WAN-LAN", "ipv6-name": "WAN-LAN-V6"}}},
                    "intra-zone-filtering": {"firewall": {"name": "LAN-LAN"}},
                }
            }
        }
    }
    assert zone_chain_names(config) == {
        "ipv4": {"WAN-LAN", "LAN-LAN"},
        "ipv6": {"WAN-LAN-V6"},
    }


def test_zones_only_viewer_does_not_see_policy_or_bridge_rules():
    stats = parse_firewall_statistics(LAB_SAMPLE)
    visible = visible_firewall_rules(
        stats.rules,
        policies=False,
        zones=True,
        bridge=False,
        zone_chains={"ipv4": {"Test"}, "ipv6": set()},
    )
    assert {(rule.family, rule.chain, rule.custom) for rule in visible} == {("ipv4", "Test", True)}

    hits = firewall_hits_for_viewer(
        {"rules": [rule.model_dump() for rule in stats.rules], "zone_chains": {"ipv4": ["Test"], "ipv6": []}},
        policies=False,
        zones=True,
        bridge=False,
    )
    assert hits["hits"] == []
    assert hits["total"] == 0


def test_policies_viewer_does_not_see_bridge_hits():
    stats = parse_firewall_statistics(LAB_SAMPLE)
    hits = firewall_hits_for_viewer(
        {"rules": [rule.model_dump() for rule in stats.rules], "zone_chains": {"ipv4": [], "ipv6": []}},
        policies=True,
        zones=False,
        bridge=False,
    )
    assert all(hit["family"] != "bridge" for hit in hits["hits"])
    assert hits["hits"][0]["chain"] == "forward"
    assert hits["total"] == 1


def test_shared_chain_name_does_not_cross_families():
    rules = [
        FirewallRuleCounter(family="ipv4", chain="Shared", custom=True, rule="1", action="accept", packets=5, bytes=5),
        FirewallRuleCounter(family="ipv6", chain="Shared", custom=True, rule="1", action="accept", packets=9, bytes=9),
    ]
    visible = visible_firewall_rules(
        rules,
        policies=False,
        zones=True,
        bridge=False,
        zone_chains={"ipv4": {"Shared"}, "ipv6": set()},
    )
    assert [(rule.family, rule.chain) for rule in visible] == [("ipv4", "Shared")]
    stats = parse_firewall_statistics(LAB_SAMPLE)
    visible = visible_firewall_rules(stats.rules, policies=False, zones=False, bridge=True)
    assert visible
    assert all(rule.family == "bridge" for rule in visible)


def test_stats_endpoint_403_without_any_firewall_read(monkeypatch):
    async def deny(request, feature, level):
        assert level == PermissionLevel.READ
        return False

    monkeypatch.setattr("routers.show.has_permission", deny)

    async def scenario():
        with pytest.raises(HTTPException) as exc:
            await get_firewall_statistics(SimpleNamespace())
        assert exc.value.status_code == 403

    asyncio.run(scenario())


def test_stats_endpoint_filters_zones_only_response(monkeypatch):
    async def allow_zones(request, feature, level):
        return feature == FeatureGroup.FIREWALL_ZONES

    class Service:
        def get_full_config(self, refresh=False):
            return {"firewall": {"zone": {"LAN": {"from": {"WAN": {"firewall": {"name": "Test"}}}}}}}

    async def fake_fetch(service):
        return LAB_SAMPLE

    monkeypatch.setattr("routers.show.has_permission", allow_zones)
    monkeypatch.setattr("routers.show.get_session_vyos_service", lambda request: Service())
    monkeypatch.setattr("routers.show.fetch_firewall_statistics_text", fake_fetch)

    async def scenario():
        response = await get_firewall_statistics(SimpleNamespace())
        keys = {(rule.family, rule.chain, rule.custom) for rule in response.rules}
        assert keys == {("ipv4", "Test", True)}

    asyncio.run(scenario())


def test_stream_drops_firewall_interest_without_permission():
    requested = {"firewall-statistics", "pppoe-sessions"}
    assert retain_firewall_interest(requested, include_firewall=False) == {"pppoe-sessions"}
    kept = {"firewall-statistics"}
    assert retain_firewall_interest(kept, include_firewall=True) == {"firewall-statistics"}


def test_dashboard_stream_filters_each_subscriber(monkeypatch):
    """Run the stream generator so a missed helper call fails the test."""
    shared = {
        "rules": [
            {"family": "ipv4", "chain": "Shared", "custom": True, "rule": "1", "action": "accept", "packets": 5, "bytes": 5},
            {"family": "ipv6", "chain": "Shared", "custom": True, "rule": "1", "action": "accept", "packets": 9, "bytes": 9},
            {"family": "ipv4", "chain": "forward", "custom": False, "rule": "100", "action": "accept", "packets": 100, "bytes": 100},
            {"family": "bridge", "chain": "Test", "custom": True, "rule": "1", "action": "accept", "packets": 4, "bytes": 4},
        ],
        "zone_chains": {"ipv4": ["Shared"], "ipv6": []},
    }

    class FakeBroadcaster:
        def __init__(self):
            self.subscribed = None

        def subscribe(self, interests):
            self.subscribed = set(interests)
            queue = asyncio.Queue()
            queue.put_nowait({"type": "firewall-statistics", "data": shared})
            return queue

        def unsubscribe(self, queue):
            return None

    holder = {}

    def fake_broadcaster(service):
        holder["broadcaster"] = FakeBroadcaster()
        return holder["broadcaster"]

    async def allow_zones(request, feature, level):
        return feature == FeatureGroup.FIREWALL_ZONES

    class Request:
        def __init__(self):
            self.state = SimpleNamespace(user={"id": "user"})
            self._seen = 0

        async def is_disconnected(self):
            self._seen += 1
            return self._seen > 1

    monkeypatch.setattr("routers.show.get_session_vyos_service", lambda request: SimpleNamespace(config=SimpleNamespace(instance_id="inst")))
    monkeypatch.setattr("routers.show.has_permission", allow_zones)
    monkeypatch.setattr("routers.show._get_broadcaster", fake_broadcaster)

    async def scenario():
        response = await dashboard_stream(Request(), interest=["firewall-statistics"])
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)
        return "".join(chunks)

    body = asyncio.run(scenario())
    assert "firewall-statistics" in holder["broadcaster"].subscribed
    assert "ipv6" not in body
    assert "forward" not in body
    assert "bridge" not in body
    assert "Shared" in body


def test_dashboard_stream_drops_interest_and_events_without_permission(monkeypatch):
    class FakeBroadcaster:
        def __init__(self):
            self.subscribed = None

        def subscribe(self, interests):
            self.subscribed = set(interests)
            queue = asyncio.Queue()
            queue.put_nowait({
                "type": "firewall-statistics",
                "data": {"rules": [{"family": "ipv4", "chain": "forward", "custom": False, "rule": "1", "action": "drop", "packets": 3, "bytes": 3}], "zone_chains": {"ipv4": [], "ipv6": []}},
            })
            return queue

        def unsubscribe(self, queue):
            return None

    holder = {}

    def fake_broadcaster(service):
        holder["broadcaster"] = FakeBroadcaster()
        return holder["broadcaster"]

    async def deny(request, feature, level):
        return False

    class Request:
        def __init__(self):
            self.state = SimpleNamespace(user={"id": "user"})
            self._seen = 0

        async def is_disconnected(self):
            self._seen += 1
            return self._seen > 1

    monkeypatch.setattr("routers.show.get_session_vyos_service", lambda request: SimpleNamespace(config=SimpleNamespace(instance_id="inst")))
    monkeypatch.setattr("routers.show.has_permission", deny)
    monkeypatch.setattr("routers.show._get_broadcaster", fake_broadcaster)

    async def scenario():
        response = await dashboard_stream(Request(), interest=["firewall-statistics"])
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)
        return "".join(chunks)

    body = asyncio.run(scenario())
    assert "firewall-statistics" not in holder["broadcaster"].subscribed
    assert "event: firewall-statistics" not in body
