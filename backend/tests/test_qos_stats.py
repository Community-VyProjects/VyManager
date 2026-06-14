"""Unit tests for the QoS stats JSON parsers.

Fixtures are the structured ``result`` returned by the typed GraphQL operations
``ShowShaperQos`` / ``ShowCakeQos`` (captured from a live VyOS 1.4.3 box). These
tests exercise the pure parsers only — no VyOS service or GraphQL call needed.
"""

from routers.qos.qos import parse_shaper_qos_json, parse_cake_qos_json


# ``ShowShaperQos(detail:true).result`` — class 10 counters edited non-zero.
SHAPER_JSON = {
    "qos": {
        "eth3": {
            "root": {
                "interface_name": "eth3", "policy_name": "VYMGR_PROBE",
                "direction": "egress", "class_name": "root", "queue_type": "htb",
                "rate": "100000000", "ceil": "100000000",
                "bytes": 0, "packets": 0, "drops": 0, "queued": 0,
                "overlimits": 0, "requeues": 0, "lended": 0, "borrowed": 0, "giants": 0,
            },
            "10": {
                "interface_name": "eth3", "policy_name": "VYMGR_PROBE",
                "direction": "egress", "class_name": "10", "queue_type": "fq_codel",
                "rate": "30000000", "ceil": "30000000",
                "bytes": 4096, "packets": 32, "drops": 2, "queued": 0,
                "overlimits": 5, "requeues": 1, "lended": 0, "borrowed": 0, "giants": 0,
            },
            "default": {
                "interface_name": "eth3", "policy_name": "VYMGR_PROBE",
                "direction": "egress", "class_name": "default", "queue_type": "sfq",
                "rate": "50000000", "ceil": "50000000",
                "bytes": 0, "packets": 0, "drops": 0, "queued": 0,
                "overlimits": 0, "requeues": 0, "lended": 0, "borrowed": 0, "giants": 0,
            },
        }
    }
}


def test_shaper_interface_and_classes():
    res = parse_shaper_qos_json(SHAPER_JSON)
    assert res.applied is True
    assert len(res.interfaces) == 1
    iface = res.interfaces[0]
    assert iface.interface == "eth3"
    assert iface.policy_name == "VYMGR_PROBE"
    assert [c.class_name for c in iface.classes] == ["root", "10", "default"]


def test_shaper_class_fields_and_counters():
    by_name = {c.class_name: c for c in parse_shaper_qos_json(SHAPER_JSON).interfaces[0].classes}

    root = by_name["root"]
    assert root.queue_type == "htb"
    assert root.direction == "egress"
    assert root.bandwidth == 100_000_000   # shaper rate already in bits/s
    assert root.ceiling == 100_000_000

    c10 = by_name["10"]
    assert c10.queue_type == "fq_codel"
    assert c10.bandwidth == 30_000_000
    assert c10.bytes == 4096
    assert c10.packets == 32
    assert c10.drops == 2
    assert c10.overlimits == 5
    assert c10.requeues == 1


def test_shaper_not_applied_or_empty():
    # ShowShaperQos returns success:false when nothing is applied -> None result.
    assert parse_shaper_qos_json(None).applied is False
    assert parse_shaper_qos_json(None).interfaces == []
    assert parse_shaper_qos_json({}).applied is False
    assert parse_shaper_qos_json({"qos": {}}).applied is False


# ``ShowCakeQos(ifname).result`` — wrapped as {"qos": {ifname: <qdisc>}};
# diffserv3, "Best Effort" tin edited non-zero.
CAKE_QDISC = {
    "kind": "cake", "handle": "1:", "root": True, "refcnt": 9,
    "options": {
        "bandwidth": 6250000, "diffserv": "diffserv3", "flowmode": "flows",
        "nat": False, "wash": False, "ingress": False, "ack_filter": "disabled",
        "split_gso": True, "rtt": 100000, "raw": True, "overhead": 0, "fwmark": "0",
    },
    "bytes": 123456, "packets": 789, "drops": 4, "overlimits": 6, "requeues": 2,
    "backlog": 1500, "qlen": 0,
    "memory_used": 262144, "memory_limit": 4194304, "capacity_estimate": 6250000,
    "tins": [
        {"threshold_rate": 390625, "sent_bytes": 0, "sent_packets": 0, "drops": 0, "ecn_mark": 0, "backlog_bytes": 0},
        {"threshold_rate": 6250000, "sent_bytes": 123456, "sent_packets": 789, "drops": 4, "ecn_mark": 3, "backlog_bytes": 1500},
        {"threshold_rate": 1562500, "sent_bytes": 0, "sent_packets": 0, "drops": 0, "ecn_mark": 0, "backlog_bytes": 0},
    ],
}

# What the endpoint actually passes the parser: the wrapped result.
CAKE_JSON = {"qos": {"eth3": CAKE_QDISC}}


def test_cake_aggregate_and_unit_conversion():
    res = parse_cake_qos_json(CAKE_JSON, "eth3", "CAKE_PROBE")
    assert res is not None
    assert res.interface == "eth3"
    assert res.policy_name == "CAKE_PROBE"
    assert res.diffserv == "diffserv3"
    assert res.flow_mode == "flows"
    # tc reports CAKE rates in bytes/s -> converted to bits/s (x8).
    assert res.bandwidth == 50_000_000          # 6_250_000 * 8
    assert res.capacity_estimate == 50_000_000
    assert res.memory_used == 262144            # bytes, no conversion
    assert res.memory_limit == 4194304
    assert res.bytes == 123456
    assert res.packets == 789
    assert res.drops == 4
    assert res.overlimits == 6
    assert res.requeues == 2
    assert res.backlog == 1500


def test_cake_tins_named_and_mapped():
    res = parse_cake_qos_json(CAKE_JSON, "eth3")
    assert [t.name for t in res.tins] == ["Bulk", "Best Effort", "Voice"]

    be = res.tins[1]
    assert be.threshold_rate == 50_000_000      # 6_250_000 * 8
    assert be.sent_bytes == 123456
    assert be.sent_packets == 789
    assert be.drops == 4
    assert be.marks == 3                        # "ecn_mark" -> marks
    assert be.backlog_bytes == 1500


def test_cake_unknown_diffserv_falls_back_to_tin_n():
    qdisc = {**CAKE_QDISC, "options": {**CAKE_QDISC["options"], "diffserv": "diffserv8"}}
    # tin count (3) doesn't match diffserv8's expected 8 -> generic names.
    res = parse_cake_qos_json({"qos": {"eth3": qdisc}}, "eth3")
    assert [t.name for t in res.tins] == ["Tin 0", "Tin 1", "Tin 2"]


def test_cake_non_cake_or_none_returns_none():
    assert parse_cake_qos_json({"qos": {"eth3": {"kind": "fq_codel"}}}, "eth3") is None
    assert parse_cake_qos_json(None, "eth3") is None
    assert parse_cake_qos_json({}, "eth3") is None
    assert parse_cake_qos_json({"qos": {}}, "eth3") is None
