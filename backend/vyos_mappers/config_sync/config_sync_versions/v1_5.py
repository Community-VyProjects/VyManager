"""VyOS 1.5 Config-Sync mapper.

``service config-sync section system login`` exists only on 1.5.
"""
from typing import List

from ..config_sync import BASE, ConfigSyncMapper


class ConfigSyncMapperV1_5(ConfigSyncMapper):
    """VyOS 1.5 config-sync mapper with section system login."""

    def __init__(self, version: str):
        super().__init__(version)

    def get_section_system_login(self) -> List[str]:
        self._require_node("system_login")
        return BASE + ["section", "system", "login"]

    def get_section_system_login_delete(self) -> List[str]:
        self._require_node("system_login")
        return BASE + ["section", "system", "login"]
