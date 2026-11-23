"""Op-mode ``show system updates``.

Both lab op trees have the command, so one class serves every version.
"""
from typing import List

from ..base import BaseFeatureMapper


class SystemUpdatesMapper(BaseFeatureMapper):
    """Shared mapper for ``show system updates`` on every VyOS version."""

    def get_updates_show_path(self) -> List[str]:
        """Op path of ``show system updates``."""
        return ["system", "updates"]
