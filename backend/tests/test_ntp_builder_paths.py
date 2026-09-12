"""Golden path + version-gate cases for NTP timestamp receive-filter.

`service ntp timestamp interface IFACE receive-filter VALUE` only exists on
VyOS 1.5. The mapper must emit it on 1.5 and raise on 1.4, and the builder
capability must advertise it only on 1.5.
"""

import pytest

from vyos_builders.ntp import NTPBatchBuilder


BASE = ["service", "ntp"]


@pytest.mark.parametrize(
    "method, args, op, expected_path",
    [
        (
            "set_timestamp_interface_receive_filter",
            ("eth0", "all"),
            "set",
            BASE + ["timestamp", "interface", "eth0", "receive-filter", "all"],
        ),
        (
            "delete_timestamp_interface_receive_filter",
            ("eth0",),
            "delete",
            BASE + ["timestamp", "interface", "eth0", "receive-filter"],
        ),
    ],
)
def test_timestamp_receive_filter_paths_v1_5(method, args, op, expected_path):
    builder = NTPBatchBuilder(version="1.5")
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize(
    "method, args",
    [
        ("set_timestamp_interface_receive_filter", ("eth0", "all")),
        ("delete_timestamp_interface_receive_filter", ("eth0",)),
    ],
)
def test_timestamp_receive_filter_rejected_on_v1_4(method, args):
    builder = NTPBatchBuilder(version="1.4")
    with pytest.raises(ValueError):
        getattr(builder, method)(*args)


def test_capability_gated_to_v1_5():
    caps_15 = NTPBatchBuilder(version="1.5").get_capabilities()
    caps_14 = NTPBatchBuilder(version="1.4").get_capabilities()
    assert caps_15["features"]["timestamp_receive_filter"]["supported"] is True
    assert caps_14["features"]["timestamp_receive_filter"]["supported"] is False
