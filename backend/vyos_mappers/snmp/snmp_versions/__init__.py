"""Factory for version-specific SNMP mappers."""
from ..snmp import SNMPMapper
from .v1_4 import SNMPMapperV1_4
from .v1_5 import SNMPMapperV1_5


def get_snmp_mapper(version: str):
    """Return a version-merged SNMP mapper."""
    base = SNMPMapper(version)

    if "1.4" in version:
        version_specific = SNMPMapperV1_4()
    else:
        version_specific = SNMPMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
