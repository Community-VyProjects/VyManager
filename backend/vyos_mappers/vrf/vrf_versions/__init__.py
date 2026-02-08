"""Factory for version-specific VRF mappers."""
from ..vrf import VrfMapper
from ..vrf_static import VrfStaticMapper
from .v1_4 import VrfMapperV1_4
from .v1_5 import VrfMapperV1_5


def get_vrf_mapper(version: str):
    """Factory function to get appropriate VRF core mapper for version."""
    base = VrfMapper(version)

    if "1.4" in version:
        version_specific = VrfMapperV1_4()
    elif "1.5" in version or "latest" in version:
        version_specific = VrfMapperV1_5()
    else:
        version_specific = VrfMapperV1_5()  # Default to latest

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()


def get_vrf_static_mapper(version: str):
    """Factory function for VRF static route mapper with version-specific BFD paths."""
    base = VrfStaticMapper()

    if "1.4" in version:
        version_specific = VrfMapperV1_4()
    elif "1.5" in version or "latest" in version:
        version_specific = VrfMapperV1_5()
    else:
        version_specific = VrfMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
