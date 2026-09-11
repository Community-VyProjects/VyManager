from pppoe_status import PPPoEPpsTracker, parse_pppoe_interface_statistics, parse_pppoe_sessions


def test_pppoe_pps_tracker_uses_counter_delta_and_elapsed_time():
    tracker = PPPoEPpsTracker()

    assert tracker.update("device:ppp0", 100, 200, timestamp=10.0) == (None, None)
    assert tracker.update("device:ppp0", 160, 320, timestamp=13.0) == (20.0, 40.0)


def test_pppoe_pps_tracker_resets_after_missing_counters():
    tracker = PPPoEPpsTracker()

    tracker.update("device:ppp0", 100, 200, timestamp=10.0)
    assert tracker.update("device:ppp0", None, None, timestamp=11.0) == (None, None)
    assert tracker.update("device:ppp0", 160, 320, timestamp=13.0) == (None, None)


def test_pppoe_pps_tracker_throttles_sampling_by_min_interval():
    tracker = PPPoEPpsTracker(min_sample_interval=1.0)

    assert tracker.update("device:ppp0", 100, 200, timestamp=10.0) == (None, None)
    assert tracker.update("device:ppp0", 160, 320, timestamp=10.5) == (None, None)
    assert tracker.update("device:ppp0", 220, 440, timestamp=11.0) == (120.0, 240.0)


def test_pppoe_pps_tracker_can_be_disabled_and_cleared_without_reusing_state():
    tracker = PPPoEPpsTracker(min_sample_interval=0.0)

    assert tracker.update("device:ppp0", 100, 200, timestamp=10.0) == (None, None)
    tracker.disable()
    assert tracker.update("device:ppp0", 160, 320, timestamp=13.0) == (None, None)
    tracker.clear()
    tracker.enable()
    assert tracker.update("device:ppp0", 160, 320, timestamp=13.0) == (None, None)


def test_parse_pppoe_interface_statistics():
    output = """
      IN   PACK VJCOMP  VJUNC  VJERR  |      OUT   PACK VJCOMP  VJUNC NON-VJ
322444349 480580      0      0      0  | 2074508103 1731184      0      0 1731184
"""

    assert parse_pppoe_interface_statistics(output) == (480580, 1731184)


def test_parse_empty_pppoe_interface_statistics():
    assert parse_pppoe_interface_statistics("") == (None, None)


def test_parse_ipv4_pppoe_session_table():
    output = """
ifname | username |     ip     |    calling-sid    | rate-limit  | state  |  uptime  | rx-bytes | tx-bytes
-------+----------+------------+-------------------+-------------+--------+----------+----------+----------
ppp0   | test-user | 192.0.2.10 | 02:00:00:00:00:01 | 20480/10240 | active | 00:00:11 | 214 B    | 76 B
"""

    sessions = parse_pppoe_sessions(output)

    assert len(sessions) == 1
    assert sessions[0].username == "test-user"
    assert sessions[0].rx_bytes == 214
    assert sessions[0].tx_bytes == 76


def test_parse_dual_stack_units_and_empty_optional_fields():
    output = """
ifname | username | ip | ip6 | ip6-dp | calling-sid | rate-limit | state | uptime | rx-bytes | tx-bytes
ppp0 | test-user | 192.0.2.10 | 2001:db8::10/64 | 2001:db8:1::/56 | 02:00:00:00:00:02 | | active | 00:00:49 | 2.1 KiB | 1 MB
"""

    sessions = parse_pppoe_sessions(output)

    assert sessions[0].ipv6 == "2001:db8::10/64"
    assert sessions[0].ipv6_delegated == "2001:db8:1::/56"
    assert sessions[0].rx_bytes == 2150
    assert sessions[0].tx_bytes == 1_000_000


def test_parse_optional_vlan_and_mtu_columns():
    output = """
ifname | username | ip | vlan-id | mtu | state | rx-bytes | tx-bytes
ppp0 | test-user | 192.0.2.10 | 120 | 1492 | active | 1 KiB | 2 KiB
"""

    session = parse_pppoe_sessions(output)[0]

    assert session.vlan == "120"
    assert session.mtu == 1492


def test_parse_per_session_packet_counters_without_interface_fallback():
    output = """
ifname | username | ip | ip6 | rx-pkts | tx-packets | state | rx-bytes | tx-bytes
ppp0 | test-user | 192.0.2.10 | 2001:db8::10/64 | 12,345 | 678 | active | 1 KiB | 2 KiB
"""

    session = parse_pppoe_sessions(output)[0]

    assert session.rx_packets == 12345
    assert session.tx_packets == 678


def test_missing_per_session_packet_counters_are_unknown():
    output = """
ifname | username | ip | state | rx-bytes | tx-bytes
ppp0 | test-user | 192.0.2.10 | active | 1 KiB | 2 KiB
"""

    session = parse_pppoe_sessions(output)[0]

    assert session.rx_packets is None
    assert session.tx_packets is None


def test_parse_vyos_session_output_with_ipv6_and_decimal_units():
    output = """
 ifname  |     username      |       ip        |             ip6             |         ip6-dp          |    calling-sid    | rate-limit | state  |  uptime  | rx-bytes  |  tx-bytes
---------+-------------------+-----------------+-----------------------------+-------------------------+-------------------+------------+--------+----------+-----------+------------
 ppp2    | test-user-1       | 192.0.2.10      | 2001:db8:200:4000:200::/64 | 2001:db8:140::/56      | 02:00:00:00:00:03 |            | active | 05:01:18 | 21.8 MiB  | 607.0 MiB
 ppp82   | test-user-2       | 192.0.2.38      | 2001:db8:200:4026:200::/64 |                         | 02:00:00:00:00:04 |            | active | 05:01:18 | 41.3 MiB  | 1.2 GiB
"""

    sessions = parse_pppoe_sessions(output)

    assert len(sessions) == 2
    assert sessions[0].ipv6 == "2001:db8:200:4000:200::/64"
    assert sessions[0].ipv6_delegated == "2001:db8:140::/56"
    assert sessions[0].rx_bytes == int(21.8 * 1024 ** 2)
    assert sessions[0].tx_bytes == int(607.0 * 1024 ** 2)
    assert sessions[1].ipv6_delegated is None