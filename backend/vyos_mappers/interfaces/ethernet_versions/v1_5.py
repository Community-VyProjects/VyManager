"""
VyOS 1.5 Ethernet Interface Mapper

Overrides for VyOS 1.5-specific behavior.
The base EthernetInterfaceMapper is designed for v1.5 features,
so this class mostly inherits without changes.
"""

from ..ethernet import EthernetInterfaceMapper


class EthernetMapper_v1_5(EthernetInterfaceMapper):
    """
    VyOS 1.5-specific ethernet interface mapper.

    Inherits from base implementation which includes all v1.5 features.
    This class exists for consistency and future v1.5-specific overrides.
    """

    # Base implementation includes all v1.5 features
    # No overrides needed currently

    # Future v1.5-specific features can be added here
    # Example:
    # def _parse_some_new_v15_feature(self, config: Dict[str, Any]) -> Dict[str, Any]:
    #     ...
