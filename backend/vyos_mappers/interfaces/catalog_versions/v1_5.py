"""Interface catalog commands only the VyOS 1.5 op tree has."""
from typing import List

from ..catalog import InterfaceCatalogMapper


class InterfaceCatalogMapperV1_5(InterfaceCatalogMapper):
    """VyOS 1.5 adds ``show interfaces kernel``."""

    def get_kernel_json_show_path(self) -> List[str]:
        """Op path of ``show interfaces kernel json``."""
        return ["interfaces", "kernel", "json"]
