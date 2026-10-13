"""VyOS 1.5 LLDP mapper.

Interface disable does not exist on 1.5. Mode does.
"""


def _unsupported(node: str) -> None:
    raise ValueError(f"{node} is not supported on this device")


class LLDPMapperV1_5:
    def supports_interface_disable(self) -> bool:
        return False

    def get_interface_disable(self, name: str):
        _unsupported("interface disable")
