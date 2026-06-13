"""Unit tests for the QoS shaper-stats text parser.

Fixtures are the exact ``show qos shaper detail`` output captured from a live
VyOS 1.4.3 box (the HTTP API returns this command as text, not JSON).
These tests exercise the pure parser only — no VyOS service or builder needed.
"""

from routers.qos.qos import parse_qos_shaper_detail, parse_qos_cake


# Captured verbatim from `show qos shaper detail` (4-class shaper on eth3).
DETAIL_ONE_IFACE = """\
-----------------------------------
Interface: eth3
Policy Name: VYMGR_PROBE

 Interface   | eth3
 Policy Name | VYMGR_PROBE
 Direction   | egress
 Class       | root
 Type        | htb
 Bandwidth   | 100000000
 Max. BW     | 100000000
 Bytes       | 0
 Packets     | 0
 Drops       | 0
 Queued      | 0
 Overlimit   | 0
 Requeue     | 0
 Lended      | 0
 Borrowed    | 0
 Giants      | 0

 Interface   | eth3
 Policy Name | VYMGR_PROBE
 Direction   | egress
 Class       | 10
 Type        | fq_codel
 Bandwidth   | 30000000
 Max. BW     | 30000000
 Bytes       | 4096
 Packets     | 32
 Drops       | 2
 Queued      | 0
 Overlimit   | 5
 Requeue     | 1
 Lended      | 0
 Borrowed    | 0
 Giants      | 0

 Interface   | eth3
 Policy Name | VYMGR_PROBE
 Direction   | egress
 Class       | 20
 Type        | fq_codel
 Bandwidth   | 20000000
 Max. BW     | 20000000
 Bytes       | 0
 Packets     | 0
 Drops       | 0
 Queued      | 0
 Overlimit   | 0
 Requeue     | 0
 Lended      | 0
 Borrowed    | 0
 Giants      | 0

 Interface   | eth3
 Policy Name | VYMGR_PROBE
 Direction   | egress
 Class       | default
 Type        | sfq
 Bandwidth   | 50000000
 Max. BW     | 50000000
 Bytes       | 0
 Packets     | 0
 Drops       | 0
 Queued      | 0
 Overlimit   | 0
 Requeue     | 0
 Lended      | 0
 Borrowed    | 0
 Giants      | 0
"""

NOT_APPLIED = "QoS is not applied to any interface!\n"


def test_parse_single_interface_four_classes():
    res = parse_qos_shaper_detail(DETAIL_ONE_IFACE)

    assert res.applied is True
    assert len(res.interfaces) == 1

    iface = res.interfaces[0]
    assert iface.interface == "eth3"
    assert iface.policy_name == "VYMGR_PROBE"

    # Order preserved as emitted (root, 10, 20, default).
    assert [c.class_name for c in iface.classes] == ["root", "10", "20", "default"]


def test_parse_class_fields_and_counters():
    res = parse_qos_shaper_detail(DETAIL_ONE_IFACE)
    by_name = {c.class_name: c for c in res.interfaces[0].classes}

    root = by_name["root"]
    assert root.queue_type == "htb"
    assert root.direction == "egress"
    assert root.bandwidth == 100_000_000
    assert root.ceiling == 100_000_000

    # Class 10 carries the only non-zero counters — verify int parsing.
    c10 = by_name["10"]
    assert c10.queue_type == "fq_codel"
    assert c10.bytes == 4096
    assert c10.packets == 32
    assert c10.drops == 2
    assert c10.overlimits == 5   # "Overlimit" -> overlimits
    assert c10.requeues == 1     # "Requeue"   -> requeues
    assert c10.bandwidth == 30_000_000
    assert c10.ceiling == 30_000_000


def test_not_applied_returns_empty():
    res = parse_qos_shaper_detail(NOT_APPLIED)
    assert res.applied is False
    assert res.interfaces == []


def test_empty_string_returns_empty():
    res = parse_qos_shaper_detail("")
    assert res.applied is False
    assert res.interfaces == []


def test_multiple_interfaces_grouped_and_ordered():
    # Two interfaces, each with one class; built from the captured block shape.
    block = (
        " Interface   | {iface}\n"
        " Policy Name | {pol}\n"
        " Direction   | egress\n"
        " Class       | root\n"
        " Type        | htb\n"
        " Bandwidth   | 1000000\n"
        " Max. BW     | 1000000\n"
        " Bytes       | {b}\n"
        " Packets     | 0\n Drops | 0\n Queued | 0\n Overlimit | 0\n"
        " Requeue | 0\n Lended | 0\n Borrowed | 0\n Giants | 0\n"
    )
    text = (
        "-----\nInterface: eth2\n\n"
        + block.format(iface="eth2", pol="POL_A", b=11)
        + "\n"
        + block.format(iface="eth3", pol="POL_B", b=22)
    )

    res = parse_qos_shaper_detail(text)
    assert [i.interface for i in res.interfaces] == ["eth2", "eth3"]
    assert res.interfaces[0].policy_name == "POL_A"
    assert res.interfaces[0].classes[0].bytes == 11
    assert res.interfaces[1].policy_name == "POL_B"
    assert res.interfaces[1].classes[0].bytes == 22


# ---------------------------------------------------------------------------
# CAKE — captured verbatim from `show qos cake interface eth3` (diffserv3),
# with a few counters edited to non-zero to exercise integer parsing.
# ---------------------------------------------------------------------------

CAKE_DIFFSERV3 = """\
qdisc cake 1: root refcnt 9 bandwidth 50Mbit diffserv3 flows nonat nowash no-ack-filter split-gso rtt 100ms raw overhead 0
 Sent 123456 bytes 789 pkt (dropped 4, overlimits 6 requeues 2)
 backlog 1500b 0p requeues 2
 memory used: 256Kb of 4Mb
 capacity estimate: 50Mbit
 min/max network layer size:        65535 /       0
 min/max overhead-adjusted size:    65535 /       0
 average network hdr offset:            0

                   Bulk  Best Effort        Voice
  thresh       3125Kbit       50Mbit    12500Kbit
  target         5.81ms          5ms          5ms
  interval        101ms        100ms        100ms
  pk_delay          0us          0us          0us
  av_delay          0us          0us          0us
  sp_delay          0us          0us          0us
  backlog            0b          1500b          0b
  pkts                0          789            0
  bytes               0       123456            0
  way_inds            0            0            0
  way_miss            0            0            0
  way_cols            0            0            0
  drops               0            4            0
  marks               0            3            0
  ack_drop            0            0            0
  sp_flows            0            0            0
  bk_flows            0            0            0
  un_flows            0            0            0
  max_len             0            0            0
  quantum           300         1514          381
"""

# A non-cake qdisc (e.g. interface running fq_codel, not CAKE).
NOT_CAKE = "qdisc fq_codel 0: root refcnt 2 limit 10240p flows 1024 quantum 1514\n"


def test_parse_cake_qdisc_and_aggregate():
    res = parse_qos_cake(CAKE_DIFFSERV3, "eth3", "CAKE_PROBE")
    assert res is not None
    assert res.interface == "eth3"
    assert res.policy_name == "CAKE_PROBE"
    assert res.bandwidth == 50_000_000        # "50Mbit"
    assert res.diffserv == "diffserv3"
    assert res.flow_mode == "flows"
    assert res.capacity_estimate == 50_000_000
    assert res.memory_used == 256 * 1024      # "256Kb"
    assert res.memory_limit == 4 * 1024 * 1024  # "4Mb"
    # Aggregate from the "Sent ..." line.
    assert res.bytes == 123456
    assert res.packets == 789
    assert res.drops == 4
    assert res.overlimits == 6
    assert res.requeues == 2
    assert res.backlog == 1500


def test_parse_cake_tins():
    res = parse_qos_cake(CAKE_DIFFSERV3, "eth3")
    assert [t.name for t in res.tins] == ["Bulk", "Best Effort", "Voice"]

    be = res.tins[1]  # "Best Effort" carries the non-zero counters
    assert be.threshold_rate == 50_000_000    # "50Mbit"
    assert be.sent_bytes == 123456
    assert be.sent_packets == 789
    assert be.drops == 4
    assert be.marks == 3
    assert be.backlog_bytes == 1500

    assert res.tins[0].sent_bytes == 0        # Bulk
    assert res.tins[2].sent_bytes == 0        # Voice


def test_parse_cake_non_cake_qdisc_returns_none():
    assert parse_qos_cake(NOT_CAKE, "eth3") is None


def test_parse_cake_empty_returns_none():
    assert parse_qos_cake("", "eth3") is None
