"""VyOS 1.5 BGP mapper.

1.5-only leaves live here. Path methods do not re-check the node: the builder
already called ``require_node``.
"""

from typing import FrozenSet, List

from ..bgp import BgpMapper


class BgpMapperV1_5(BgpMapper):
    """VyOS 1.5 BGP mapper."""

    def redistribute_ipv4_protocols(self) -> FrozenSet[str]:
        return super().redistribute_ipv4_protocols() | {"nhrp"}

    def redistribute_ipv6_protocols(self) -> FrozenSet[str]:
        return super().redistribute_ipv6_protocols() | {"nhrp"}

    def redistribute_table_afis(self) -> FrozenSet[str]:
        return super().redistribute_table_afis() | {"ipv6-unicast"}

    def bmp_monitor_policies(self) -> FrozenSet[str]:
        return super().bmp_monitor_policies() | {"local-rib"}

    def as_notation_values(self) -> List[str]:
        return ["asdot", "asdot+"]

    def get_neighbor_link_state(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["address-family", "link-state"]

    def get_peer_group_link_state(self, name: str) -> List[str]:
        return self._peer_group(name) + ["address-family", "link-state"]

    def get_neighbor_bfd_strict(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["bfd", "strict"]

    def get_neighbor_bfd_strict_hold_time(self, neighbor: str, value: str) -> List[str]:
        return self._neighbor(neighbor) + ["bfd", "strict", "hold-time", value]

    def get_neighbor_bfd_strict_hold_time_delete(self, neighbor: str) -> List[str]:
        return self._neighbor(neighbor) + ["bfd", "strict", "hold-time"]

    def get_peer_group_bfd_strict(self, name: str) -> List[str]:
        return self._peer_group(name) + ["bfd", "strict"]

    def get_peer_group_bfd_strict_hold_time(self, name: str, value: str) -> List[str]:
        return self._peer_group(name) + ["bfd", "strict", "hold-time", value]

    def get_peer_group_bfd_strict_hold_time_delete(self, name: str) -> List[str]:
        return self._peer_group(name) + ["bfd", "strict", "hold-time"]

    def get_peer_group_solo(self, name: str) -> List[str]:
        return self._peer_group(name) + ["solo"]

    def get_parameters_as_notation(self, value: str) -> List[str]:
        if value not in self.as_notation_values():
            raise ValueError(
                f"as-notation {value} is not supported on this device")
        return self._bgp() + ["parameters", "as-notation", value]

    def get_parameters_as_notation_delete(self) -> List[str]:
        return self._bgp() + ["parameters", "as-notation"]

    def get_parameters_input_queue_limit(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "input-queue-limit", value]

    def get_parameters_input_queue_limit_delete(self) -> List[str]:
        return self._bgp() + ["parameters", "input-queue-limit"]

    def get_parameters_output_queue_limit(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "output-queue-limit", value]

    def get_parameters_output_queue_limit_delete(self) -> List[str]:
        return self._bgp() + ["parameters", "output-queue-limit"]

    def get_parameters_update_delay_establish_wait(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "update-delay", "establish-wait", value]

    def get_parameters_update_delay_establish_wait_delete(self) -> List[str]:
        return self._bgp() + ["parameters", "update-delay", "establish-wait"]

    def get_parameters_update_delay_max_delay(self, value: str) -> List[str]:
        return self._bgp() + ["parameters", "update-delay", "max-delay", value]

    def get_parameters_update_delay_max_delay_delete(self) -> List[str]:
        return self._bgp() + ["parameters", "update-delay", "max-delay"]

    def get_bmp_target_source_interface(self, name: str, value: str) -> List[str]:
        return self._bgp() + ["bmp", "target", name, "source-interface", value]

    def get_bmp_target_source_interface_delete(self, name: str) -> List[str]:
        return self._bgp() + ["bmp", "target", name, "source-interface"]
