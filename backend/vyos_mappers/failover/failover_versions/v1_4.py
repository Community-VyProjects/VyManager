"""
VyOS 1.4 Failover Mapper Overrides

1.4 differences:
- No dhcp-interface support
- check/target is a multi-value node (flat list of IPs, no sub-properties)
"""

from typing import List

_DHCP_UNSUPPORTED = "Failover dhcp-interface is not supported on VyOS 1.4"
_TARGET_INTERFACE_UNSUPPORTED = (
    "Failover check target interface is not supported on VyOS 1.4"
)
_TARGET_VRF_UNSUPPORTED = "Failover check target VRF is not supported on VyOS 1.4"


def _reject_dhcp(self, *_args, **_kwargs):
    raise ValueError(_DHCP_UNSUPPORTED)


def _reject_target_interface(self, *_args, **_kwargs):
    raise ValueError(_TARGET_INTERFACE_UNSUPPORTED)


def _reject_target_vrf(self, *_args, **_kwargs):
    raise ValueError(_TARGET_VRF_UNSUPPORTED)


class FailoverMapperV1_4:
    """VyOS 1.4 specific failover paths."""

    def _base(self) -> List[str]:
        return ["protocols", "failover"]

    # ========================================================================
    # Check Target (multi-value in 1.4 — just an IP list, no sub-nodes)
    # ========================================================================

    def get_next_hop_check_target(self, destination: str, next_hop: str, target: str) -> List[str]:
        """In 1.4, target is a multi-value leaf node."""
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "target", target]

    def get_next_hop_check_target_path(self, destination: str, next_hop: str) -> List[str]:
        """Path for deleting all targets."""
        return self._base() + ["route", destination, "next-hop", next_hop, "check", "target"]

    # interface and vrf under check/target exist only on 1.5.
    get_next_hop_check_target_interface = _reject_target_interface
    get_next_hop_check_target_interface_path = _reject_target_interface
    get_next_hop_check_target_vrf = _reject_target_vrf
    get_next_hop_check_target_vrf_path = _reject_target_vrf

    # dhcp-interface does not exist on 1.4.
    get_dhcp_interface_path = _reject_dhcp
    get_dhcp_interface_check_policy = _reject_dhcp
    get_dhcp_interface_check_policy_path = _reject_dhcp
    get_dhcp_interface_check_port = _reject_dhcp
    get_dhcp_interface_check_port_path = _reject_dhcp
    get_dhcp_interface_check_target = _reject_dhcp
    get_dhcp_interface_check_target_path = _reject_dhcp
    get_dhcp_interface_check_target_interface = _reject_dhcp
    get_dhcp_interface_check_target_interface_path = _reject_dhcp
    get_dhcp_interface_check_target_vrf = _reject_dhcp
    get_dhcp_interface_check_target_vrf_path = _reject_dhcp
    get_dhcp_interface_check_timeout = _reject_dhcp
    get_dhcp_interface_check_timeout_path = _reject_dhcp
    get_dhcp_interface_check_type = _reject_dhcp
    get_dhcp_interface_check_type_path = _reject_dhcp
    get_dhcp_interface_interface = _reject_dhcp
    get_dhcp_interface_interface_path = _reject_dhcp
    get_dhcp_interface_metric = _reject_dhcp
    get_dhcp_interface_metric_path = _reject_dhcp
    get_dhcp_interface_onlink = _reject_dhcp
