"""
System Option Performance Batch Builder

Builds batch operations for set/delete system option performance.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class SystemPerformanceBatchBuilder:
    """Batch builder for system option performance (single set or delete)."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mapper = CommandMapperRegistry.get_mapper("system_performance", version)

    def add_set(self, path: List[str]) -> "SystemPerformanceBatchBuilder":
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "SystemPerformanceBatchBuilder":
        self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    def set_performance(self, value: str) -> "SystemPerformanceBatchBuilder":
        """Add set system option performance <value>."""
        path = self.mapper.get_performance_set_path(value)
        return self.add_set(path)

    def delete_performance(self) -> "SystemPerformanceBatchBuilder":
        """Add delete system option performance."""
        path = self.mapper.get_performance_delete_path()
        return self.add_delete(path)
