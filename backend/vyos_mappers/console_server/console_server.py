"""Console Server Command Mapper."""
from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "console-server"]


class ConsoleServerMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Top-level
    # ========================================================================

    def get_console_server_delete(self) -> List[str]:
        return BASE

    # ========================================================================
    # device/<name>
    # ========================================================================

    def get_device(self, device: str) -> List[str]:
        return BASE + ["device", device]

    def get_device_delete(self, device: str) -> List[str]:
        return BASE + ["device", device]

    def get_devices_delete(self) -> List[str]:
        return BASE + ["device"]

    # device/<name>/alias
    def get_device_alias(self, device: str, alias: str) -> List[str]:
        return BASE + ["device", device, "alias", alias]

    def get_device_alias_delete(self, device: str) -> List[str]:
        return BASE + ["device", device, "alias"]

    # device/<name>/data-bits
    def get_device_data_bits(self, device: str, bits: str) -> List[str]:
        return BASE + ["device", device, "data-bits", bits]

    def get_device_data_bits_delete(self, device: str) -> List[str]:
        return BASE + ["device", device, "data-bits"]

    # device/<name>/description
    def get_device_description(self, device: str, description: str) -> List[str]:
        return BASE + ["device", device, "description", description]

    def get_device_description_delete(self, device: str) -> List[str]:
        return BASE + ["device", device, "description"]

    # device/<name>/parity
    def get_device_parity(self, device: str, parity: str) -> List[str]:
        return BASE + ["device", device, "parity", parity]

    def get_device_parity_delete(self, device: str) -> List[str]:
        return BASE + ["device", device, "parity"]

    # device/<name>/speed
    def get_device_speed(self, device: str, speed: str) -> List[str]:
        return BASE + ["device", device, "speed", speed]

    def get_device_speed_delete(self, device: str) -> List[str]:
        return BASE + ["device", device, "speed"]

    # device/<name>/ssh/port
    def get_device_ssh_port(self, device: str, port: str) -> List[str]:
        return BASE + ["device", device, "ssh", "port", port]

    def get_device_ssh_port_delete(self, device: str) -> List[str]:
        return BASE + ["device", device, "ssh", "port"]

    def get_device_ssh_delete(self, device: str) -> List[str]:
        return BASE + ["device", device, "ssh"]

    # device/<name>/stop-bits
    def get_device_stop_bits(self, device: str, bits: str) -> List[str]:
        return BASE + ["device", device, "stop-bits", bits]

    def get_device_stop_bits_delete(self, device: str) -> List[str]:
        return BASE + ["device", device, "stop-bits"]
