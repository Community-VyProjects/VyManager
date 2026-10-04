"""VyOS 1.4 LLDP mapper.

Interface mode does not exist on 1.4. The disable presence flag does.
"""


def _unsupported(node: str) -> None:
    raise ValueError(f"{node} is not supported on this device")


class LLDPMapperV1_4:
    def supports_interface_mode(self) -> bool:
        return False

    def get_interface_mode(self, name: str, mode: str):
        _unsupported("interface mode")

    def get_interface_mode_delete(self, name: str):
        _unsupported("interface mode")
