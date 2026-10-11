"""Suricata batch builder.

Assembles set/delete ops under ``service suricata``. Version checks live
in the mapper. Two-argument ops encode their args as ``arg1,arg2``.
"""

from typing import Any, Dict

from vyos_builders.base import BatchBuilder
from vyos_mappers import CommandMapperRegistry


class SuricataBatchBuilder(BatchBuilder):
    def __init__(self, version: str):
        super().__init__(version)
        # Merged mapper is a runtime object; the registry types it as the base.
        self.m: Any = CommandMapperRegistry.get_mapper("suricata", version)

    def get_capabilities(self) -> Dict[str, Any]:
        return self.m.get_capabilities()

    def delete_suricata(self) -> "SuricataBatchBuilder":
        """Delete the Suricata service."""
        return self.add_delete(self.m.get_suricata_delete())

    def set_interface(self, name: str) -> "SuricataBatchBuilder":
        """Watch an interface."""
        return self.add_set(self.m.get_interface(name))

    def delete_interface(self, name: str) -> "SuricataBatchBuilder":
        """Stop watching an interface."""
        return self.add_delete(self.m.get_interface_delete(name))

    def set_address_group(self, name: str) -> "SuricataBatchBuilder":
        """Create an address group."""
        return self.add_set(self.m.get_address_group(name))

    def delete_address_group(self, name: str) -> "SuricataBatchBuilder":
        """Delete an address group."""
        return self.add_delete(self.m.get_address_group_delete(name))

    def set_address(self, name: str, value: str) -> "SuricataBatchBuilder":
        """Add an address or prefix to an address group. Value may start with !."""
        return self.add_set(self.m.get_address(name, value))

    def delete_address(self, name: str, value: str) -> "SuricataBatchBuilder":
        """Remove an address or prefix from an address group."""
        return self.add_delete(self.m.get_address_delete(name, value))

    def set_address_group_ref(self, name: str, ref: str) -> "SuricataBatchBuilder":
        """Add a nested address-group reference. Ref may start with !."""
        return self.add_set(self.m.get_address_group_ref(name, ref))

    def delete_address_group_ref(self, name: str, ref: str) -> "SuricataBatchBuilder":
        """Remove a nested address-group reference."""
        return self.add_delete(self.m.get_address_group_ref_delete(name, ref))

    def set_port_group(self, name: str) -> "SuricataBatchBuilder":
        """Create a port group."""
        return self.add_set(self.m.get_port_group(name))

    def delete_port_group(self, name: str) -> "SuricataBatchBuilder":
        """Delete a port group."""
        return self.add_delete(self.m.get_port_group_delete(name))

    def set_port(self, name: str, value: str) -> "SuricataBatchBuilder":
        """Add a port or range to a port group. Value may start with !."""
        return self.add_set(self.m.get_port(name, value))

    def delete_port(self, name: str, value: str) -> "SuricataBatchBuilder":
        """Remove a port or range from a port group."""
        return self.add_delete(self.m.get_port_delete(name, value))

    def set_port_group_ref(self, name: str, ref: str) -> "SuricataBatchBuilder":
        """Add a nested port-group reference. Ref may start with !."""
        return self.add_set(self.m.get_port_group_ref(name, ref))

    def delete_port_group_ref(self, name: str, ref: str) -> "SuricataBatchBuilder":
        """Remove a nested port-group reference."""
        return self.add_delete(self.m.get_port_group_ref_delete(name, ref))

    def delete_log(self) -> "SuricataBatchBuilder":
        """Delete Suricata log output."""
        return self.add_delete(self.m.get_log_delete())

    def set_log_eve_filename(self, filename: str) -> "SuricataBatchBuilder":
        """Set the EVE log file name."""
        return self.add_set(self.m.get_log_eve_filename(filename))

    def set_log_eve_filetype(self, filetype: str) -> "SuricataBatchBuilder":
        """Set the EVE destination to regular or syslog."""
        return self.add_set(self.m.get_log_eve_filetype(filetype))

    def set_log_eve_type(self, event_type: str) -> "SuricataBatchBuilder":
        """Enable an EVE event type."""
        return self.add_set(self.m.get_log_eve_type(event_type))

    def delete_log_eve_type(self, event_type: str) -> "SuricataBatchBuilder":
        """Disable an EVE event type."""
        return self.add_delete(self.m.get_log_eve_type_delete(event_type))
