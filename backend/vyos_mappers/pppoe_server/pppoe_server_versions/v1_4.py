"""VyOS 1.4 specific PPPoE Server mapper overrides."""

from typing import List


class PPPoEServerMapperV1_4:
    def get_auth_any_login(self) -> List[str]:
        raise ValueError("authentication any-login is not supported on this device")

    def get_auth_any_login_delete(self) -> List[str]:
        raise ValueError("authentication any-login is not supported on this device")

    def get_interface_vpp_cp(self, iface: str) -> List[str]:
        raise ValueError("interface vpp-cp is not supported on this device")
