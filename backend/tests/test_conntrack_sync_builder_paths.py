"""Golden (method, args, expected_path) cases for ConntrackSyncBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
"""

import pytest

from vyos_builders.conntrack_sync.conntrack_sync_batch_builder import (
    ConntrackSyncBatchBuilder,
)


IFACE = "eth0"
BASE = ["service", "conntrack-sync"]

CASES = [
    ("delete_conntrack_sync", (), "delete", BASE),
    ("set_accept_protocol", ("tcp",), "set", BASE + ["accept-protocol", "tcp"]),
    ("delete_accept_protocol", ("tcp",), "delete", BASE + ["accept-protocol", "tcp"]),
    ("delete_accept_protocols", (), "delete", BASE + ["accept-protocol"]),
    ("set_disable_external_cache", (), "set", BASE + ["disable-external-cache"]),
    ("delete_disable_external_cache", (), "delete", BASE + ["disable-external-cache"]),
    ("set_disable_syslog", (), "set", BASE + ["disable-syslog"]),
    ("delete_disable_syslog", (), "delete", BASE + ["disable-syslog"]),
    ("set_event_listen_queue_size", ("8",), "set", BASE + ["event-listen-queue-size", "8"]),
    ("delete_event_listen_queue_size", (), "delete", BASE + ["event-listen-queue-size"]),
    ("set_expect_sync", ("ftp",), "set", BASE + ["expect-sync", "ftp"]),
    ("delete_expect_sync", ("ftp",), "delete", BASE + ["expect-sync", "ftp"]),
    ("delete_expect_syncs", (), "delete", BASE + ["expect-sync"]),
    (
        "set_failover_vrrp_sync_group",
        ("LAN",),
        "set",
        BASE + ["failover-mechanism", "vrrp", "sync-group", "LAN"],
    ),
    (
        "delete_failover_vrrp_sync_group",
        (),
        "delete",
        BASE + ["failover-mechanism", "vrrp", "sync-group"],
    ),
    ("delete_failover_mechanism", (), "delete", BASE + ["failover-mechanism"]),
    ("set_ignore_address", ("192.0.2.1",), "set", BASE + ["ignore-address", "192.0.2.1"]),
    ("delete_ignore_address", ("192.0.2.1",), "delete", BASE + ["ignore-address", "192.0.2.1"]),
    ("delete_ignore_addresses", (), "delete", BASE + ["ignore-address"]),
    ("set_interface", (IFACE,), "set", BASE + ["interface", IFACE]),
    ("delete_interface", (IFACE,), "delete", BASE + ["interface", IFACE]),
    ("delete_interfaces", (), "delete", BASE + ["interface"]),
    ("set_interface_peer", (IFACE, "192.0.2.2"), "set", BASE + ["interface", IFACE, "peer", "192.0.2.2"]),
    ("delete_interface_peer", (IFACE,), "delete", BASE + ["interface", IFACE, "peer"]),
    ("set_interface_port", (IFACE, "3780"), "set", BASE + ["interface", IFACE, "port", "3780"]),
    ("delete_interface_port", (IFACE,), "delete", BASE + ["interface", IFACE, "port"]),
    ("set_listen_address", ("192.0.2.10",), "set", BASE + ["listen-address", "192.0.2.10"]),
    ("delete_listen_address", ("192.0.2.10",), "delete", BASE + ["listen-address", "192.0.2.10"]),
    ("delete_listen_addresses", (), "delete", BASE + ["listen-address"]),
    ("set_mcast_group", ("225.0.0.50",), "set", BASE + ["mcast-group", "225.0.0.50"]),
    ("delete_mcast_group", (), "delete", BASE + ["mcast-group"]),
    ("set_startup_resync", (), "set", BASE + ["startup-resync"]),
    ("delete_startup_resync", (), "delete", BASE + ["startup-resync"]),
    ("set_sync_queue_size", ("1",), "set", BASE + ["sync-queue-size", "1"]),
    ("delete_sync_queue_size", (), "delete", BASE + ["sync-queue-size"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_conntrack_sync_builder_paths(method, args, op, expected_path, version):
    builder = ConntrackSyncBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]
