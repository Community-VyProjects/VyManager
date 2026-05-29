"""Salt Minion Service Command Mapper."""
from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "salt-minion"]


class SaltMinionMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Global
    # ========================================================================

    def get_salt_minion_delete(self) -> List[str]:
        return BASE

    # ========================================================================
    # Hash (single value)
    # ========================================================================

    def get_hash(self, value: str) -> List[str]:
        return BASE + ["hash", value]

    def get_hash_delete(self) -> List[str]:
        return BASE + ["hash"]

    # ========================================================================
    # ID (single value)
    # ========================================================================

    def get_id(self, value: str) -> List[str]:
        return BASE + ["id", value]

    def get_id_delete(self) -> List[str]:
        return BASE + ["id"]

    # ========================================================================
    # Interval (single value)
    # ========================================================================

    def get_interval(self, value: str) -> List[str]:
        return BASE + ["interval", value]

    def get_interval_delete(self) -> List[str]:
        return BASE + ["interval"]

    # ========================================================================
    # Master-key (single value)
    # ========================================================================

    def get_master_key(self, value: str) -> List[str]:
        return BASE + ["master-key", value]

    def get_master_key_delete(self) -> List[str]:
        return BASE + ["master-key"]

    # ========================================================================
    # Master (multi-value)
    # ========================================================================

    def get_master(self, address: str) -> List[str]:
        return BASE + ["master", address]

    def get_master_delete(self, address: str) -> List[str]:
        return BASE + ["master", address]

    def get_all_masters_delete(self) -> List[str]:
        return BASE + ["master"]

    # ========================================================================
    # Source-interface (single value)
    # ========================================================================

    def get_source_interface(self, name: str) -> List[str]:
        return BASE + ["source-interface", name]

    def get_source_interface_delete(self) -> List[str]:
        return BASE + ["source-interface"]
