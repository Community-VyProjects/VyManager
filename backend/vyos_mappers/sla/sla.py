"""SLA Service Command Mapper."""
from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "sla"]


class SLAMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Global
    # ========================================================================

    def get_sla_delete(self) -> List[str]:
        return BASE

    # ========================================================================
    # OWAMP server
    # ========================================================================

    def get_owamp_server(self) -> List[str]:
        return BASE + ["owamp-server"]

    def get_owamp_server_delete(self) -> List[str]:
        return BASE + ["owamp-server"]

    def get_owamp_server_port(self, port: str) -> List[str]:
        return BASE + ["owamp-server", "port", port]

    def get_owamp_server_port_delete(self) -> List[str]:
        return BASE + ["owamp-server", "port"]

    # ========================================================================
    # TWAMP server
    # ========================================================================

    def get_twamp_server(self) -> List[str]:
        return BASE + ["twamp-server"]

    def get_twamp_server_delete(self) -> List[str]:
        return BASE + ["twamp-server"]

    def get_twamp_server_port(self, port: str) -> List[str]:
        return BASE + ["twamp-server", "port", port]

    def get_twamp_server_port_delete(self) -> List[str]:
        return BASE + ["twamp-server", "port"]
