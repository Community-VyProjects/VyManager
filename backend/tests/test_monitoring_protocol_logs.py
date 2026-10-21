"""Protocol monitors must tail the daemon log, not the debug-toggle parent.

`monitor protocol bgp` and `monitor protocol ospf` are incomplete on VyOS
1.4 and 1.5. Those nodes only have enable/disable children, so vbash
rejects them and the session never follows bgpd or ospfd. The streaming
leaves are `monitor log protocol bgp` and `monitor log protocol ospf`.
"""

from monitoring_commands import build_command


def test_bgp_monitor_tails_daemon_log():
    assert build_command("monitor_protocol_bgp", {}) == "monitor log protocol bgp"


def test_ospf_monitor_tails_daemon_log():
    assert build_command("monitor_protocol_ospf", {}) == "monitor log protocol ospf"
