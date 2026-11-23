"""Op-mode power commands: ``reboot``, ``poweroff`` and ``show reboot``.

Both lab op trees have the same ``now``, ``cancel``, ``at <HH:MM>`` and
``in <minutes>`` children under ``reboot`` and ``poweroff``, so one class
serves every version. The paths are the words below the root command; the
router picks ``device.reboot`` or ``device.poweroff`` for the root.
"""
from typing import List

from ..base import BaseFeatureMapper


class PowerMapper(BaseFeatureMapper):
    """Shared mapper for the power op commands on every VyOS version."""

    # ==================== Actions ====================

    def get_now_path(self) -> List[str]:
        """Path of ``reboot now`` / ``poweroff now``."""
        return ["now"]

    def get_cancel_path(self) -> List[str]:
        """Path of ``reboot cancel`` / ``poweroff cancel``."""
        return ["cancel"]

    def get_at_path(self, time: str) -> List[str]:
        """Path of ``reboot at <HH:MM>`` / ``poweroff at <HH:MM>``."""
        return ["at", time]

    def get_in_path(self, minutes: str) -> List[str]:
        """Path of ``reboot in <minutes>`` / ``poweroff in <minutes>``."""
        return ["in", minutes]

    # ==================== Status ====================

    def get_status_show_path(self) -> List[str]:
        """Op path of ``show reboot``, which reports a pending reboot or poweroff."""
        return ["reboot"]
