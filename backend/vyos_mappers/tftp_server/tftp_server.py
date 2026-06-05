"""TFTP Server Command Mapper.

Maps TFTP server configuration to VyOS config paths under: service tftp-server

Structure (identical on VyOS 1.4 and 1.5):
  service tftp-server
    directory <path>            # single
    allow-upload               # presence
    port <1-65535>             # single, default 69
    listen-address <ip>        # tag node
      vrf <name>               # single, per listen-address
"""
from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "tftp-server"]


class TFTPServerMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    def get_tftp_server_delete(self) -> List[str]:
        return BASE

    # ------------------------------------------------------------- directory
    def get_directory(self, value: str) -> List[str]:
        return BASE + ["directory", value]

    def get_directory_delete(self) -> List[str]:
        return BASE + ["directory"]

    # --------------------------------------------------- allow-upload (flag)
    def get_allow_upload(self) -> List[str]:
        return BASE + ["allow-upload"]

    # ------------------------------------------------------------------ port
    def get_port(self, value: str) -> List[str]:
        return BASE + ["port", value]

    def get_port_delete(self) -> List[str]:
        return BASE + ["port"]

    # --------------------------------------------- listen-address (tag node)
    def get_listen_address(self, address: str) -> List[str]:
        return BASE + ["listen-address", address]

    def get_listen_address_delete(self, address: str) -> List[str]:
        return BASE + ["listen-address", address]

    def get_listen_address_vrf(self, address: str, vrf: str) -> List[str]:
        return BASE + ["listen-address", address, "vrf", vrf]

    def get_listen_address_vrf_delete(self, address: str) -> List[str]:
        return BASE + ["listen-address", address, "vrf"]
