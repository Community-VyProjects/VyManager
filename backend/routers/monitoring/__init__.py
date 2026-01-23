"""
Monitoring Router Module

Provides real-time monitoring endpoints for VyOS instances:
- System metrics (CPU, memory, disk)
- Interface traffic with rate calculation
- Connection tracking (conntrack)
- Alert management
"""

from .metrics import router as metrics_router
from .interfaces import router as interfaces_router
from .conntrack import router as conntrack_router
from .alerts import router as alerts_router
from .history import router as history_router

__all__ = [
    "metrics_router",
    "interfaces_router",
    "conntrack_router",
    "alerts_router",
    "history_router",
]
