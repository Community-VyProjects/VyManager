"""Broadcast Relay Service Command Mapper."""
from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "broadcast-relay"]


class BroadcastRelayMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    def _id(self, relay_id: str) -> List[str]:
        return BASE + ["id", relay_id]

    # ========================================================================
    # Global service paths
    # ========================================================================

    def get_global_disable(self) -> List[str]:
        return BASE + ["disable"]

    def get_broadcast_relay_delete(self) -> List[str]:
        return BASE

    # ========================================================================
    # Instance paths
    # ========================================================================

    def get_instance(self, relay_id: str) -> List[str]:
        return self._id(relay_id)

    def get_instance_address(self, relay_id: str, address: str) -> List[str]:
        return self._id(relay_id) + ["address", address]

    def get_instance_address_delete(self, relay_id: str) -> List[str]:
        return self._id(relay_id) + ["address"]

    def get_instance_description(self, relay_id: str, description: str) -> List[str]:
        return self._id(relay_id) + ["description", description]

    def get_instance_description_delete(self, relay_id: str) -> List[str]:
        return self._id(relay_id) + ["description"]

    def get_instance_disable(self, relay_id: str) -> List[str]:
        return self._id(relay_id) + ["disable"]

    def get_instance_interface(self, relay_id: str, interface: str) -> List[str]:
        return self._id(relay_id) + ["interface", interface]

    def get_instance_interface_delete(self, relay_id: str, interface: str) -> List[str]:
        return self._id(relay_id) + ["interface", interface]

    def get_instance_interfaces_delete(self, relay_id: str) -> List[str]:
        return self._id(relay_id) + ["interface"]

    def get_instance_port(self, relay_id: str, port: str) -> List[str]:
        return self._id(relay_id) + ["port", port]

    def get_instance_port_delete(self, relay_id: str) -> List[str]:
        return self._id(relay_id) + ["port"]
