"""Golden (method, args, expected_path) cases for ContainerBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Every version-agnostic valueless set_* leaf has a matching delete_*.
1.5-only nodes are covered in test_container_version_gates.py.
"""

import pytest

from vyos_builders.container.container_batch_builder import ContainerBatchBuilder

NODE = ["container", "name", "web"]
NET = ["container", "network", "lan"]
REG = ["container", "registry", "ghcr.io"]

CASES = [
    ("set_name", ("web",), "set", NODE),
    ("delete_name", ("web",), "delete", NODE),
    ("set_name_image", ("web", "nginx"), "set", NODE + ["image", "nginx"]),
    ("delete_name_image", ("web",), "delete", NODE + ["image"]),
    ("set_name_description", ("web", "test"), "set", NODE + ["description", "test"]),
    ("delete_name_description", ("web",), "delete", NODE + ["description"]),
    ("set_name_disable", ("web",), "set", NODE + ["disable"]),
    ("delete_name_disable", ("web",), "delete", NODE + ["disable"]),
    ("set_name_allow_host_networks", ("web",), "set", NODE + ["allow-host-networks"]),
    ("delete_name_allow_host_networks", ("web",), "delete", NODE + ["allow-host-networks"]),
    ("set_name_allow_host_pid", ("web",), "set", NODE + ["allow-host-pid"]),
    ("delete_name_allow_host_pid", ("web",), "delete", NODE + ["allow-host-pid"]),
    ("set_name_privileged", ("web",), "set", NODE + ["privileged"]),
    ("delete_name_privileged", ("web",), "delete", NODE + ["privileged"]),
    ("set_network", ("lan",), "set", NET),
    ("delete_network", ("lan",), "delete", NET),
    ("set_network_no_name_server", ("lan",), "set", NET + ["no-name-server"]),
    ("delete_network_no_name_server", ("lan",), "delete", NET + ["no-name-server"]),
    ("set_registry", ("ghcr.io",), "set", REG),
    ("delete_registry", ("ghcr.io",), "delete", REG),
    ("set_registry_disable", ("ghcr.io",), "set", REG + ["disable"]),
    ("delete_registry_disable", ("ghcr.io",), "delete", REG + ["disable"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_container_builder_paths(method, args, op, expected_path, version):
    builder = ContainerBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]
