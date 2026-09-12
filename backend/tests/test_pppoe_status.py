from pppoe_status import (
    PPPoEPpsTracker,
    PPPoESession,
    parse_accel_ppp_sessions,
    parse_pppoe_sessions,
)


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


def test_annotate_sessions_derives_pps_from_packet_counter_deltas():
    tracker = PPPoEPpsTracker()
    device = "device-a"

    first = [PPPoESession(interface="ppp0", username="u", state="active", rx_packets=100, tx_packets=200)]
    tracker.annotate_sessions(device, first)
    # No prior sample yet, so PPS is unknown on the first poll.
    assert first[0].rx_pps is None and first[0].tx_pps is None

    # Advance the tracker's stored timestamp so elapsed > 0 on the next poll.
    import time as _time
    key = f"{device}:ppp0"
    rx, tx, _ = tracker._previous[key]
    tracker._previous[key] = (rx, tx, _time.monotonic() - 4.0)

    second = [PPPoESession(interface="ppp0", username="u", state="active", rx_packets=140, tx_packets=280)]
    tracker.annotate_sessions(device, second)
    assert second[0].rx_pps is not None and second[0].rx_pps > 0
    assert second[0].tx_pps is not None and second[0].tx_pps > second[0].rx_pps


def test_annotate_sessions_scopes_counters_per_device():
    tracker = PPPoEPpsTracker()

    a = [PPPoESession(interface="ppp0", username="u", state="active", rx_packets=100, tx_packets=100)]
    b = [PPPoESession(interface="ppp0", username="u", state="active", rx_packets=999, tx_packets=999)]
    tracker.annotate_sessions("device-a", a)
    tracker.annotate_sessions("device-b", b)

    # Different device keys must not share counter history for the same interface.
    assert tracker._previous["device-a:ppp0"][0] == 100
    assert tracker._previous["device-b:ppp0"][0] == 999


def test_parse_accel_ppp_sessions_reads_packet_counters_and_bytes():
    result = [
        {
            "ifname": "ppp0",
            "username": "labuser",
            "ip": "10.55.55.10",
            "ip6": "",
            "ip6_dp": "",
            "type": "pppoe",
            "rate_limit": "10000/5000",
            "state": "active",
            "uptime_raw": "30",
            "calling_sid": "5a:2f:45:d9:b0:16",
            "sid": "7da9cdc301f030c1",
            "comp": "",
            "rx_bytes_raw": "4186",
            "tx_bytes_raw": "3870",
            "rx_pkts": "29",
            "tx_pkts": "25",
        }
    ]

    sessions = parse_accel_ppp_sessions(result)

    assert len(sessions) == 1
    s = sessions[0]
    assert s.interface == "ppp0"
    assert s.username == "labuser"
    assert s.ip == "10.55.55.10"
    assert s.rate_limit == "10000/5000"
    assert s.rx_bytes == 4186
    assert s.tx_bytes == 3870
    assert s.rx_packets == 29
    assert s.tx_packets == 25
    assert s.uptime == "00:00:30"
    # Empty accel-ppp fields become None, not "".
    assert s.ipv6 is None
    assert s.ipv6_delegated is None


def test_parse_accel_ppp_sessions_formats_dual_stack_and_long_uptime():
    result = [
        {
            "ifname": "ppp2",
            "username": "user-1",
            "ip": "192.0.2.10",
            "ip6": "2001:db8:200::/64",
            "ip6_dp": "2001:db8:140::/56",
            "state": "active",
            "uptime_raw": str(2 * 86400 + 3 * 3600 + 4 * 60 + 5),
            "rx_bytes_raw": "1000",
            "tx_bytes_raw": "2000",
            "rx_pkts": "10",
            "tx_pkts": "20",
        }
    ]

    s = parse_accel_ppp_sessions(result)[0]

    assert s.ipv6 == "2001:db8:200::/64"
    assert s.ipv6_delegated == "2001:db8:140::/56"
    assert s.uptime == "2d 03:04:05"


def test_parse_accel_ppp_sessions_accepts_json_encoded_string_result():
    import json
    result = json.dumps([
        {"ifname": "ppp0", "username": "u", "state": "active", "rx_pkts": "5", "tx_pkts": "6"}
    ])

    sessions = parse_accel_ppp_sessions(result)

    assert len(sessions) == 1
    assert sessions[0].rx_packets == 5
    assert sessions[0].tx_packets == 6


def test_parse_accel_ppp_sessions_ignores_incomplete_or_invalid_rows():
    assert parse_accel_ppp_sessions(None) == []
    assert parse_accel_ppp_sessions("not json") == []
    assert parse_accel_ppp_sessions([{"ifname": "ppp0"}]) == []  # missing username
    assert parse_accel_ppp_sessions([{"username": "u"}]) == []  # missing ifname
    assert parse_accel_ppp_sessions(["nonsense", 42]) == []


def test_parse_accel_ppp_sessions_missing_counters_leave_pps_unknown():
    result = [{"ifname": "ppp0", "username": "u", "state": "active"}]

    s = parse_accel_ppp_sessions(result)[0]

    assert s.rx_packets is None
    assert s.tx_packets is None
    assert s.rx_bytes == 0
    assert s.tx_bytes == 0


# ----------------------------------------------------------------------------
# Text-table fallback (parse_pppoe_sessions): retained for when the structured
# ShowSessionsAccelppp operation is unavailable.
# ----------------------------------------------------------------------------


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
