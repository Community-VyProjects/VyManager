"""DHCP lease-clear capability comes from the mapper, not a version sniff in the UI."""

from vyos_builders.dhcp_server.dhcp_server_batch_builder import DHCPServerBatchBuilder
from vyos_mappers.dhcp_server.dhcp_server_versions import get_dhcp_server_mapper


def test_mapper_1_4_cannot_clear_inactive():
    assert get_dhcp_server_mapper("1.4").CLEARS_INACTIVE_LEASES is False


def test_mapper_1_5_can_clear_inactive():
    assert get_dhcp_server_mapper("2026.09.23-0027-rolling").CLEARS_INACTIVE_LEASES is True


def test_capabilities_1_4_hides_inactive_clear():
    fields = DHCPServerBatchBuilder(version="1.4").get_capabilities()["fields"]
    assert fields["clear_inactive_lease"]["supported"] is False


def test_capabilities_1_5_advertises_inactive_clear():
    fields = DHCPServerBatchBuilder(version="1.5").get_capabilities()["fields"]
    assert fields["clear_inactive_lease"]["supported"] is True
