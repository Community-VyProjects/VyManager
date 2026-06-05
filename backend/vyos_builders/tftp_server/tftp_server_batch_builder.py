"""
TFTP Server Batch Builder

Generates VyOS set/delete operations for the TFTP server.

Configuration lives under: service tftp-server

Version differences:
  1.4 and 1.5 share identical TFTP server config paths — no version-specific overrides.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class TFTPServerBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["tftp_server"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "TFTPServerBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "TFTPServerBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4

        return {
            "version": self.version,
            "features": {
                "tftp_server": {
                    "supported": True,
                    "description": "Trivial File Transfer Protocol server",
                },
                "directory": {
                    "supported": True,
                    "description": "Folder containing files served by TFTP",
                },
                "allow_upload": {
                    "supported": True,
                    "description": "Allow TFTP file uploads (writes)",
                },
                "port": {
                    "supported": True,
                    "description": "UDP port the server listens on",
                    "default": "69",
                },
                "listen_address": {
                    "supported": True,
                    "description": "Local IP addresses to listen on, optionally per-VRF",
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }

    # =======================================================================
    # Global service
    # =======================================================================

    def delete_tftp_server(self) -> "TFTPServerBatchBuilder":
        return self.add_delete(self.m.get_tftp_server_delete())

    # ------------------------------------------------------------- directory
    def set_directory(self, value: str) -> "TFTPServerBatchBuilder":
        return self.add_set(self.m.get_directory(value))

    def delete_directory(self) -> "TFTPServerBatchBuilder":
        return self.add_delete(self.m.get_directory_delete())

    # --------------------------------------------------- allow-upload (flag)
    def set_allow_upload(self) -> "TFTPServerBatchBuilder":
        return self.add_set(self.m.get_allow_upload())

    def delete_allow_upload(self) -> "TFTPServerBatchBuilder":
        return self.add_delete(self.m.get_allow_upload())

    # ------------------------------------------------------------------ port
    def set_port(self, value: str) -> "TFTPServerBatchBuilder":
        return self.add_set(self.m.get_port(value))

    def delete_port(self) -> "TFTPServerBatchBuilder":
        return self.add_delete(self.m.get_port_delete())

    # --------------------------------------------- listen-address (tag node)
    def set_listen_address(self, address: str) -> "TFTPServerBatchBuilder":
        return self.add_set(self.m.get_listen_address(address))

    def delete_listen_address(self, address: str) -> "TFTPServerBatchBuilder":
        return self.add_delete(self.m.get_listen_address_delete(address))

    def set_listen_address_vrf(self, address: str, vrf: str) -> "TFTPServerBatchBuilder":
        return self.add_set(self.m.get_listen_address_vrf(address, vrf))

    def delete_listen_address_vrf(self, address: str) -> "TFTPServerBatchBuilder":
        return self.add_delete(self.m.get_listen_address_vrf_delete(address))
