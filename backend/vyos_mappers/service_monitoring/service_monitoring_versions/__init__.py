"""Factory for version-specific Service Monitoring mappers."""
from ..service_monitoring import ServiceMonitoringMapper
from .v1_4 import ServiceMonitoringMapperV1_4
from .v1_5 import ServiceMonitoringMapperV1_5


def get_service_monitoring_mapper(version: str):
    """Return a version-merged Service Monitoring mapper."""
    base = ServiceMonitoringMapper(version)

    if "1.4" in version:
        version_specific = ServiceMonitoringMapperV1_4()
    else:
        version_specific = ServiceMonitoringMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
