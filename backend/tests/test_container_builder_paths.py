"""Golden (method, args, expected_path) cases for ContainerBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
1.5-only nodes are covered in test_container_version_gates.py.
"""

import pytest

from vyos_builders.container.container_batch_builder import ContainerBatchBuilder

NODE = ["container", "name", "web"]

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
    ("set_name_privileged", ("web",), "set", NODE + ["privileged"]),
    ("delete_name_privileged", ("web",), "delete", NODE + ["privileged"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_container_builder_paths(method, args, op, expected_path, version):
    builder = ContainerBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]
