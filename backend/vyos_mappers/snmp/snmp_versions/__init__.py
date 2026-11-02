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
        # parse_config must live here. A method on SNMPMapper is bound to
        # `base`, so mapper.version would not fall through on the call.
        def parse_config(self, full_config):
            from ..config_parse import parse_config as parse_snmp_config

            return parse_snmp_config(self, full_config)

        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
