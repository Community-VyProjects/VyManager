"""Factory for service monitoring mappers.

The shared class is returned directly on 1.4. 1.5 paths live on the
subclass. A rolling string is 1.5. Only a string that contains ``1.4`` is 1.4.
"""

from ..service_monitoring import ServiceMonitoringMapper
from .v1_5 import ServiceMonitoringMapperV1_5


def get_service_monitoring_mapper(version: str) -> ServiceMonitoringMapper:
    """Return the service monitoring mapper for this device."""
    if "1.4" in version:
        return ServiceMonitoringMapper(version)
    return ServiceMonitoringMapperV1_5(version)


__all__ = ["ServiceMonitoringMapperV1_5", "get_service_monitoring_mapper"]
