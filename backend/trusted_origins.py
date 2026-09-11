"""WebSocket Origin allowlist (CSWSH defense).

CORS uses FRONTEND_URL defaulting to http://localhost:3000. The console and
monitoring sockets used an empty default and skipped the check when the set
was empty. Same default, and refuse the upgrade if the allowlist is empty.
"""

import os
from typing import Optional

DEFAULT_FRONTEND_URL = "http://localhost:3000"


def websocket_trusted_origins() -> set[str]:
    raw = os.getenv("TRUSTED_ORIGINS") or os.getenv(
        "FRONTEND_URL", DEFAULT_FRONTEND_URL
    )
    return {part.strip() for part in raw.split(",") if part.strip()}


def websocket_origin_allowed(origin: Optional[str]) -> bool:
    allowed = websocket_trusted_origins()
    if not allowed:
        return False
    return bool(origin) and origin in allowed
