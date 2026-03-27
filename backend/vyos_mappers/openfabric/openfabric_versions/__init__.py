from ..openfabric import OpenfabricMapper
from .v1_4 import OpenfabricMapperV1_4
from .v1_5 import OpenfabricMapperV1_5


def get_openfabric_mapper(version: str):
    base = OpenfabricMapper(version)

    if "1.4" in version:
        version_specific = OpenfabricMapperV1_4()
    else:
        version_specific = OpenfabricMapperV1_5()

    class MergedMapper:
        def __getattr__(self, name):
            if hasattr(version_specific, name):
                return getattr(version_specific, name)
            return getattr(base, name)

    return MergedMapper()
