"""
System Option Performance Batch Builder

Builds batch operations for set/delete system option performance.
"""

from vyos_mappers import CommandMapperRegistry
from vyos_builders.base import BatchBuilder


class SystemPerformanceBatchBuilder(BatchBuilder):
    """Batch builder for system option performance (single set or delete)."""

    def __init__(self, version: str):
        super().__init__(version)
        self.mapper = CommandMapperRegistry.get_mapper("system_performance", version)

    def set_performance(self, value: str) -> "SystemPerformanceBatchBuilder":
        """Add set system option performance <value>."""
        path = self.mapper.get_performance_set_path(value)
        return self.add_set(path)

    def delete_performance(self) -> "SystemPerformanceBatchBuilder":
        """Add delete system option performance."""
        path = self.mapper.get_performance_delete_path()
        return self.add_delete(path)
