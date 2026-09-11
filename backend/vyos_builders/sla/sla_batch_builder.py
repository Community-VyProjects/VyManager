"""
SLA Service Batch Builder

Generates VyOS set/delete operations for the SLA service.

Configuration lives under: service sla

Structure:
  service sla
    owamp-server          # One-way active measurement protocol (OWAMP) server
      port <1-65535>      # Optional — default 861
    twamp-server          # Two-way active measurement protocol (TWAMP) server
      port <1-65535>      # Optional — default 862

Version differences:
  1.4 and 1.5 share identical SLA config paths — no version-specific overrides.
"""

from typing import Dict, Any
from vyos_mappers import CommandMapperRegistry
from vyos_builders.base import BatchBuilder


class SLABatchBuilder(BatchBuilder):
    def __init__(self, version: str):
        super().__init__(version)
        self.m = CommandMapperRegistry.get_mapper("sla", version)

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4

        return {
            "version": self.version,
            "features": {
                "sla": {
                    "supported": True,
                    "description": "Service Level Agreement (SLA) measurement service",
                },
                "owamp_server": {
                    "supported": True,
                    "description": "One-Way Active Measurement Protocol (OWAMP) server",
                    "default_port": 861,
                    "port_range": "1-65535",
                },
                "twamp_server": {
                    "supported": True,
                    "description": "Two-Way Active Measurement Protocol (TWAMP) server",
                    "default_port": 862,
                    "port_range": "1-65535",
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }

    # -----------------------------------------------------------------------
    # Global
    # -----------------------------------------------------------------------

    def delete_sla(self) -> "SLABatchBuilder":
        """Delete the entire SLA service configuration."""
        return self.add_delete(self.m.get_sla_delete())

    # -----------------------------------------------------------------------
    # OWAMP server
    # -----------------------------------------------------------------------

    def set_owamp_server(self) -> "SLABatchBuilder":
        """Enable the OWAMP server."""
        return self.add_set(self.m.get_owamp_server())

    def delete_owamp_server(self) -> "SLABatchBuilder":
        """Disable and remove the OWAMP server configuration."""
        return self.add_delete(self.m.get_owamp_server_delete())

    def set_owamp_server_port(self, port: str) -> "SLABatchBuilder":
        """Set the OWAMP server listening port (default: 861)."""
        return self.add_set(self.m.get_owamp_server_port(port))

    def delete_owamp_server_port(self) -> "SLABatchBuilder":
        """Reset the OWAMP server port to its default (861)."""
        return self.add_delete(self.m.get_owamp_server_port_delete())

    # -----------------------------------------------------------------------
    # TWAMP server
    # -----------------------------------------------------------------------

    def set_twamp_server(self) -> "SLABatchBuilder":
        """Enable the TWAMP server."""
        return self.add_set(self.m.get_twamp_server())

    def delete_twamp_server(self) -> "SLABatchBuilder":
        """Disable and remove the TWAMP server configuration."""
        return self.add_delete(self.m.get_twamp_server_delete())

    def set_twamp_server_port(self, port: str) -> "SLABatchBuilder":
        """Set the TWAMP server listening port (default: 862)."""
        return self.add_set(self.m.get_twamp_server_port(port))

    def delete_twamp_server_port(self) -> "SLABatchBuilder":
        """Reset the TWAMP server port to its default (862)."""
        return self.add_delete(self.m.get_twamp_server_port_delete())
