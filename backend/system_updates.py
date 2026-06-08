"""
System Updates — shared model and parser.

Parses the op-mode ``show system updates`` output, which is available when the
operator has configured ``set system update-check url <url>`` on the VyOS box.

Example output::

    Current version: 2026.03

    Update available: 2026.06.04-1035-rolling
    Update URL: https://github.com/vyos/vyos-nightly-build/releases/download/2026.06.04-1035-rolling/vyos-2026.06.04-1035-rolling-generic-amd64.iso

When no newer image exists, only the ``Current version`` line is present. When
``update-check url`` is not configured (or the command is unsupported) the
output is empty / lacks a current-version line, which we surface as
``configured = False`` rather than an error.

Shared by the per-instance endpoint (routers/show.py) and the site-level
fan-out (routers/site_updates).
"""

import re
from typing import Optional

from pydantic import BaseModel


class SystemUpdatesInfo(BaseModel):
    """Normalized result of ``show system updates`` for a single instance."""

    configured: bool = False  # update-check url is set and the command returned usable output
    current_version: Optional[str] = None
    update_available: bool = False
    available_version: Optional[str] = None  # the newer version string, when one exists
    update_url: Optional[str] = None  # the ISO URL reported by VyOS (display only — never fetched)


# "Current version: 2026.03"
_RE_CURRENT = re.compile(r"^\s*Current version:\s*(\S+)", re.MULTILINE)
# "Update available: 2026.06.04-1035-rolling"
_RE_AVAILABLE = re.compile(r"^\s*Update available:\s*(\S+)", re.MULTILINE)
# "Update URL: https://...iso"
_RE_URL = re.compile(r"^\s*Update URL:\s*(\S+)", re.MULTILINE)


def parse_system_updates(output: Optional[str]) -> SystemUpdatesInfo:
    """Parse ``show system updates`` text into a :class:`SystemUpdatesInfo`.

    A missing ``Current version`` line is treated as "not configured" rather
    than an error — that is the normal state when ``update-check url`` is unset.
    """
    text = output or ""

    current = _RE_CURRENT.search(text)
    if not current:
        # No current-version line: update-check is not configured (or unsupported).
        return SystemUpdatesInfo(configured=False)

    available = _RE_AVAILABLE.search(text)
    url = _RE_URL.search(text)

    return SystemUpdatesInfo(
        configured=True,
        current_version=current.group(1),
        update_available=available is not None,
        available_version=available.group(1) if available else None,
        update_url=url.group(1) if url else None,
    )
