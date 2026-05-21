"""Config-Sync Service Command Mapper."""
from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "config-sync"]


class ConfigSyncMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Service-level
    # ========================================================================

    def get_config_sync_delete(self) -> List[str]:
        return BASE

    # ========================================================================
    # Mode
    # ========================================================================

    def get_mode(self, value: str) -> List[str]:
        return BASE + ["mode", value]

    def get_mode_delete(self) -> List[str]:
        return BASE + ["mode"]

    # ========================================================================
    # Secondary
    # ========================================================================

    def get_secondary_address(self, address: str) -> List[str]:
        return BASE + ["secondary", "address", address]

    def get_secondary_address_delete(self) -> List[str]:
        return BASE + ["secondary", "address"]

    def get_secondary_key(self, key: str) -> List[str]:
        return BASE + ["secondary", "key", key]

    def get_secondary_key_delete(self) -> List[str]:
        return BASE + ["secondary", "key"]

    def get_secondary_port(self, port: str) -> List[str]:
        return BASE + ["secondary", "port", port]

    def get_secondary_port_delete(self) -> List[str]:
        return BASE + ["secondary", "port"]

    def get_secondary_timeout(self, timeout: str) -> List[str]:
        return BASE + ["secondary", "timeout", timeout]

    def get_secondary_timeout_delete(self) -> List[str]:
        return BASE + ["secondary", "timeout"]

    # ========================================================================
    # Sections — top-level presence flags
    # ========================================================================

    def get_section(self, section_name: str) -> List[str]:
        return BASE + ["section", section_name]

    # ========================================================================
    # Sections — sub-level presence flags (interfaces, protocols, qos,
    #            service, system)
    # ========================================================================

    def get_section_sub(self, section_name: str, sub_name: str) -> List[str]:
        return BASE + ["section", section_name, sub_name]
