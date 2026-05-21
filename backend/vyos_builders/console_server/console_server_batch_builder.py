"""Console Server Batch Builder.

Generates VyOS set/delete operations for the console-server service.

Configuration lives under: service console-server

Structure:
  service console-server
    device <name>                           # tagged node (ttyS0, ttyUSB0, etc.)
      alias <text>                          # human-readable name (1-128 chars)
      data-bits <7|8>                       # default: 8
      description <text>                   # 0-255 chars
      parity <even|odd|none>               # default: none
      speed <300|1200|2400|4800|9600|
             19200|38400|57600|115200>
      ssh
        port <1-65535>                      # SSH port for remote console access
      stop-bits <1|2>                       # default: 1

The template structure is identical between VyOS 1.4 and 1.5.
Multi-argument batch operations encode compound values as "arg1,arg2"
(comma-separated), matching the project's standard batch dispatch pattern.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class ConsoleServerBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["console_server"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "ConsoleServerBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "ConsoleServerBatchBuilder":
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
                "console_server": {
                    "supported": True,
                    "description": "Serial console server service",
                },
                "alias": {
                    "supported": True,
                    "description": "Human-readable name for a console device",
                },
                "data_bits": {
                    "supported": True,
                    "description": "Serial port data bits",
                    "options": ["7", "8"],
                    "default": "8",
                },
                "description": {
                    "supported": True,
                    "description": "Free-text description for a console device",
                },
                "parity": {
                    "supported": True,
                    "description": "Serial port parity",
                    "options": ["even", "odd", "none"],
                    "default": "none",
                },
                "speed": {
                    "supported": True,
                    "description": "Serial port baud rate",
                    "options": [
                        "300", "1200", "2400", "4800", "9600",
                        "19200", "38400", "57600", "115200",
                    ],
                },
                "ssh_port": {
                    "supported": True,
                    "description": "TCP port for SSH remote access to this console (1-65535)",
                },
                "stop_bits": {
                    "supported": True,
                    "description": "Serial port stop bits",
                    "options": ["1", "2"],
                    "default": "1",
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }

    # -----------------------------------------------------------------------
    # Top-level delete
    # -----------------------------------------------------------------------

    def delete_console_server(self) -> "ConsoleServerBatchBuilder":
        """Delete the entire console-server configuration."""
        return self.add_delete(self.m.get_console_server_delete())

    # -----------------------------------------------------------------------
    # device (tagged node)
    # -----------------------------------------------------------------------

    def set_device(self, device: str) -> "ConsoleServerBatchBuilder":
        """Create or touch a device node."""
        return self.add_set(self.m.get_device(device))

    def delete_device(self, device: str) -> "ConsoleServerBatchBuilder":
        return self.add_delete(self.m.get_device_delete(device))

    def delete_devices(self) -> "ConsoleServerBatchBuilder":
        """Remove all device nodes."""
        return self.add_delete(self.m.get_devices_delete())

    # device/<name>/alias
    def set_device_alias(self, device: str, alias: str) -> "ConsoleServerBatchBuilder":
        return self.add_set(self.m.get_device_alias(device, alias))

    def delete_device_alias(self, device: str) -> "ConsoleServerBatchBuilder":
        return self.add_delete(self.m.get_device_alias_delete(device))

    # device/<name>/data-bits
    def set_device_data_bits(self, device: str, bits: str) -> "ConsoleServerBatchBuilder":
        return self.add_set(self.m.get_device_data_bits(device, bits))

    def delete_device_data_bits(self, device: str) -> "ConsoleServerBatchBuilder":
        return self.add_delete(self.m.get_device_data_bits_delete(device))

    # device/<name>/description
    def set_device_description(self, device: str, description: str) -> "ConsoleServerBatchBuilder":
        return self.add_set(self.m.get_device_description(device, description))

    def delete_device_description(self, device: str) -> "ConsoleServerBatchBuilder":
        return self.add_delete(self.m.get_device_description_delete(device))

    # device/<name>/parity
    def set_device_parity(self, device: str, parity: str) -> "ConsoleServerBatchBuilder":
        return self.add_set(self.m.get_device_parity(device, parity))

    def delete_device_parity(self, device: str) -> "ConsoleServerBatchBuilder":
        return self.add_delete(self.m.get_device_parity_delete(device))

    # device/<name>/speed
    def set_device_speed(self, device: str, speed: str) -> "ConsoleServerBatchBuilder":
        return self.add_set(self.m.get_device_speed(device, speed))

    def delete_device_speed(self, device: str) -> "ConsoleServerBatchBuilder":
        return self.add_delete(self.m.get_device_speed_delete(device))

    # device/<name>/ssh/port
    def set_device_ssh_port(self, device: str, port: str) -> "ConsoleServerBatchBuilder":
        return self.add_set(self.m.get_device_ssh_port(device, port))

    def delete_device_ssh_port(self, device: str) -> "ConsoleServerBatchBuilder":
        return self.add_delete(self.m.get_device_ssh_port_delete(device))

    def delete_device_ssh(self, device: str) -> "ConsoleServerBatchBuilder":
        """Remove the entire ssh block for a device."""
        return self.add_delete(self.m.get_device_ssh_delete(device))

    # device/<name>/stop-bits
    def set_device_stop_bits(self, device: str, bits: str) -> "ConsoleServerBatchBuilder":
        return self.add_set(self.m.get_device_stop_bits(device, bits))

    def delete_device_stop_bits(self, device: str) -> "ConsoleServerBatchBuilder":
        return self.add_delete(self.m.get_device_stop_bits_delete(device))
