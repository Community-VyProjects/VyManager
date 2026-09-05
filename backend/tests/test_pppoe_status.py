from pppoe_status import parse_pppoe_sessions


def test_parse_ipv4_pppoe_session_table():
    output = """
ifname | username |     ip     |    calling-sid    | rate-limit  | state  |  uptime  | rx-bytes | tx-bytes
-------+----------+------------+-------------------+-------------+--------+----------+----------+----------
ppp0   | foo      | 10.1.1.100 | 00:53:00:ba:db:15 | 20480/10240 | active | 00:00:11 | 214 B    | 76 B
"""

    sessions = parse_pppoe_sessions(output)

    assert len(sessions) == 1
    assert sessions[0].username == "foo"
    assert sessions[0].rx_bytes == 214
    assert sessions[0].tx_bytes == 76


def test_parse_dual_stack_units_and_empty_optional_fields():
    output = """
ifname | username | ip | ip6 | ip6-dp | calling-sid | rate-limit | state | uptime | rx-bytes | tx-bytes
ppp0 | test | 192.0.2.10 | 2001:db8::10/64 | 2001:db8:1::/56 | 00:53:00:12:42:eb | | active | 00:00:49 | 2.1 KiB | 1 MB
"""

    sessions = parse_pppoe_sessions(output)

    assert sessions[0].ipv6 == "2001:db8::10/64"
    assert sessions[0].ipv6_delegated == "2001:db8:1::/56"
    assert sessions[0].rx_bytes == 2150
    assert sessions[0].tx_bytes == 1_000_000