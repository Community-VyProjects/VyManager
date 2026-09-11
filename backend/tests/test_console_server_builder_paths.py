"""Golden (method, args, expected_path) cases for ConsoleServerBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
"""

import pytest

from vyos_builders.console_server.console_server_batch_builder import (
    ConsoleServerBatchBuilder,
)


DEVICE = "ttyS0"
BASE = ["service", "console-server"]
NODE = BASE + ["device", DEVICE]

CASES = [
    ("delete_console_server", (), "delete", BASE),
    ("set_device", (DEVICE,), "set", NODE),
    ("delete_device", (DEVICE,), "delete", NODE),
    ("delete_devices", (), "delete", BASE + ["device"]),
    ("set_device_alias", (DEVICE, "core-console"), "set", NODE + ["alias", "core-console"]),
    ("delete_device_alias", (DEVICE,), "delete", NODE + ["alias"]),
    ("set_device_data_bits", (DEVICE, "8"), "set", NODE + ["data-bits", "8"]),
    ("delete_device_data_bits", (DEVICE,), "delete", NODE + ["data-bits"]),
    ("set_device_description", (DEVICE, "serial"), "set", NODE + ["description", "serial"]),
    ("delete_device_description", (DEVICE,), "delete", NODE + ["description"]),
    ("set_device_parity", (DEVICE, "none"), "set", NODE + ["parity", "none"]),
    ("delete_device_parity", (DEVICE,), "delete", NODE + ["parity"]),
    ("set_device_speed", (DEVICE, "9600"), "set", NODE + ["speed", "9600"]),
    ("delete_device_speed", (DEVICE,), "delete", NODE + ["speed"]),
    ("set_device_ssh_port", (DEVICE, "2222"), "set", NODE + ["ssh", "port", "2222"]),
    ("delete_device_ssh_port", (DEVICE,), "delete", NODE + ["ssh", "port"]),
    ("delete_device_ssh", (DEVICE,), "delete", NODE + ["ssh"]),
    ("set_device_stop_bits", (DEVICE, "1"), "set", NODE + ["stop-bits", "1"]),
    ("delete_device_stop_bits", (DEVICE,), "delete", NODE + ["stop-bits"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_console_server_builder_paths(method, args, op, expected_path, version):
    builder = ConsoleServerBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]
