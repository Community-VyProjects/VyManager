"""Suricata command mapper.

Lab-checked on VyOS 1.5 rolling (100.64.64.5) and absent on 1.4.3
(100.64.64.50). Every path method raises on 1.4. Builders do not
version-check; they call these methods.

Leaves under ``service suricata``:

  interface <name>                         multi
  address-group <name>                    tag [a-z0-9-]+
    address <ipv4|ipv6|prefix|!exclude>   multi
    group <name|!name>                    multi
  port-group <name>                       tag [a-z0-9-]+
    port <port|range|!exclude>            multi
    group <name|!name>                    multi
  log eve filename <name>
  log eve filetype <regular|syslog>
  log eve type <allowlist>                multi
"""

from __future__ import annotations

import ipaddress
import re
from typing import List

from ..base import BaseFeatureMapper

BASE = ["service", "suricata"]

# Copied from the 1.5 interface node.def. VLAN names are prefix + digits + .digits.
_INTERFACE = re.compile(
    r"^(?:(?:bond|br|dum|en|ersp|eth|gnv|ifb|ipoe|lan|l2tp|l2tpeth|macsec|peth|ppp|pppoe|pptp|sstp|sstpc|tun|veth|vpptap|vpptun|vti|vtun|vxlan|wg|wlan|wwan)[0-9]+(?:\.\d+)?|pod-[-_a-zA-Z0-9]{1,11}|lo)$"
)
_GROUP_NAME = re.compile(r"^[a-z0-9-]+$")
_FILENAME = re.compile(r"^[^\x00-\x1f,]+$")

EVE_FILETYPES = ("regular", "syslog")
EVE_TYPES = (
    "alert",
    "anomaly",
    "http",
    "dns",
    "tls",
    "files",
    "drop",
    "smtp",
    "dnp3",
    "ftp",
    "rdp",
    "nfs",
    "smb",
    "tftp",
    "ikev2",
    "dcerpc",
    "krb5",
    "snmp",
    "rfb",
    "sip",
    "dhcp",
    "ssh",
    "mqtt",
    "http2",
    "flow",
    "netflow",
)

_UNSUPPORTED = "Suricata is not supported on this device"


def _reject_comma(value: str, label: str) -> None:
    if "," in value or any(ch.isspace() for ch in value):
        raise ValueError(f"Invalid {label}")


class SuricataMapper(BaseFeatureMapper):
    def supported(self) -> bool:
        return "1.4" not in self.version

    def _require(self) -> None:
        if not self.supported():
            raise ValueError(_UNSUPPORTED)

    def get_capabilities(self) -> dict:
        supported = self.supported()
        return {
            "version": self.version,
            "features": {
                "suricata": {
                    "supported": supported,
                    "description": "Network intrusion detection on selected interfaces",
                },
                "eve_log": {
                    "supported": supported,
                    "description": "EVE JSON logging to a file or syslog",
                    "filetypes": list(EVE_FILETYPES),
                    "types": list(EVE_TYPES),
                },
            },
        }

    # ------------------------------------------------------------------
    # Service
    # ------------------------------------------------------------------

    def get_suricata_delete(self) -> List[str]:
        self._require()
        return list(BASE)

    def get_interface(self, name: str) -> List[str]:
        self._require()
        if not _INTERFACE.match(name):
            raise ValueError(f"Invalid interface name: {name}")
        return BASE + ["interface", name]

    def get_interface_delete(self, name: str) -> List[str]:
        return self.get_interface(name)

    # ------------------------------------------------------------------
    # Address groups
    # ------------------------------------------------------------------

    def get_address_group(self, name: str) -> List[str]:
        self._require()
        return BASE + ["address-group", self._group_name(name)]

    def get_address_group_delete(self, name: str) -> List[str]:
        return self.get_address_group(name)

    def get_address(self, name: str, value: str) -> List[str]:
        return self.get_address_group(name) + ["address", self._address(value)]

    def get_address_delete(self, name: str, value: str) -> List[str]:
        return self.get_address(name, value)

    def get_address_group_ref(self, name: str, ref: str) -> List[str]:
        return self.get_address_group(name) + ["group", self._group_ref(ref)]

    def get_address_group_ref_delete(self, name: str, ref: str) -> List[str]:
        return self.get_address_group_ref(name, ref)

    # ------------------------------------------------------------------
    # Port groups
    # ------------------------------------------------------------------

    def get_port_group(self, name: str) -> List[str]:
        self._require()
        return BASE + ["port-group", self._group_name(name)]

    def get_port_group_delete(self, name: str) -> List[str]:
        return self.get_port_group(name)

    def get_port(self, name: str, value: str) -> List[str]:
        return self.get_port_group(name) + ["port", self._port(value)]

    def get_port_delete(self, name: str, value: str) -> List[str]:
        return self.get_port(name, value)

    def get_port_group_ref(self, name: str, ref: str) -> List[str]:
        return self.get_port_group(name) + ["group", self._group_ref(ref)]

    def get_port_group_ref_delete(self, name: str, ref: str) -> List[str]:
        return self.get_port_group_ref(name, ref)

    # ------------------------------------------------------------------
    # EVE log
    # ------------------------------------------------------------------

    def get_log_delete(self) -> List[str]:
        self._require()
        return BASE + ["log"]

    def get_log_eve_filename(self, filename: str) -> List[str]:
        self._require()
        if not filename or not _FILENAME.match(filename):
            raise ValueError("Invalid log file name")
        return BASE + ["log", "eve", "filename", filename]

    def get_log_eve_filetype(self, filetype: str) -> List[str]:
        self._require()
        if filetype not in EVE_FILETYPES:
            raise ValueError("Invalid log destination")
        return BASE + ["log", "eve", "filetype", filetype]

    def get_log_eve_type(self, event_type: str) -> List[str]:
        self._require()
        if event_type not in EVE_TYPES:
            raise ValueError(f"Invalid log type: {event_type}")
        return BASE + ["log", "eve", "type", event_type]

    def get_log_eve_type_delete(self, event_type: str) -> List[str]:
        return self.get_log_eve_type(event_type)

    # ------------------------------------------------------------------
    # Value checks
    # ------------------------------------------------------------------

    @staticmethod
    def _group_name(name: str) -> str:
        if not _GROUP_NAME.match(name):
            raise ValueError(
                "Group names must be lowercase letters, digits, and hyphens"
            )
        return name

    @staticmethod
    def _group_ref(ref: str) -> str:
        _reject_comma(ref, "group reference")
        body = ref[1:] if ref.startswith("!") else ref
        if not body or body.startswith("!") or not _GROUP_NAME.match(body):
            raise ValueError("Invalid group reference")
        return ref

    @staticmethod
    def _address(value: str) -> str:
        _reject_comma(value, "address")
        if "%" in value:
            raise ValueError(f"Invalid address or prefix: {value}")
        body = value[1:] if value.startswith("!") else value
        if not body or body.startswith("!"):
            raise ValueError("Invalid address or prefix")
        try:
            if "/" in body:
                ipaddress.ip_network(body, strict=True)
            else:
                ipaddress.ip_address(body)
        except ValueError as exc:
            raise ValueError(f"Invalid address or prefix: {value}") from exc
        return value

    @staticmethod
    def _port_number(text: str) -> int:
        if not text.isdigit() or (len(text) > 1 and text.startswith("0")):
            raise ValueError("Invalid port or port range")
        number = int(text)
        if not 1 <= number <= 65535:
            raise ValueError("Invalid port or port range")
        return number

    @staticmethod
    def _port(value: str) -> str:
        _reject_comma(value, "port")
        body = value[1:] if value.startswith("!") else value
        if not body or body.startswith("!"):
            raise ValueError("Invalid port or port range")
        if "-" in body:
            start_s, end_s = body.split("-", 1)
            if SuricataMapper._port_number(start_s) > SuricataMapper._port_number(end_s):
                raise ValueError("Port range start must not exceed the end")
        else:
            SuricataMapper._port_number(body)
        return value
