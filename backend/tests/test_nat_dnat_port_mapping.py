"""DNAT translation options port-mapping is valid on 1.4 and 1.5.

Source NAT already emits this leaf. Destination NAT must emit the dest twin
and advertise the set/delete ops.
"""

import pytest

from vyos_builders.nat import NATBatchBuilder

BASE = ["nat", "destination", "rule", "10", "translation", "options", "port-mapping"]

CASES = [
    (
        "set_destination_rule_translation_options_port_mapping",
        (10, "random"),
        "set",
        BASE + ["random"],
    ),
    (
        "delete_destination_rule_translation_options_port_mapping",
        (10,),
        "delete",
        BASE,
    ),
]


@pytest.mark.parametrize("version", ["1.4", "1.5"])
@pytest.mark.parametrize("method, args, op, expected_path", CASES)
def test_dnat_port_mapping_paths(version, method, args, op, expected_path):
    builder = NATBatchBuilder(version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_dnat_port_mapping_ops_advertised(version):
    caps = NATBatchBuilder(version).get_capabilities()
    dest_ops = caps["operations"]["destination_nat"]
    assert "set_destination_rule_translation_options_port_mapping" in dest_ops
    assert "delete_destination_rule_translation_options_port_mapping" in dest_ops
