"""
Commit-Confirm State Tracker

Tracks active commit-confirm sessions per VyOS instance.
When a commit-confirm is active, no further changes are allowed
until the user confirms or the timer expires (and VyOS auto-reverts).
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)


@dataclass
class CommitConfirmSession:
    instance_id: str
    started_at: datetime
    expires_at: datetime
    confirm_time_minutes: int
    action: str  # "reload" or "reboot"

    def seconds_remaining(self) -> int:
        delta = self.expires_at - datetime.now(timezone.utc)
        return max(0, int(delta.total_seconds()))

    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) >= self.expires_at

    def to_dict(self) -> dict:
        return {
            "active": True,
            "instance_id": self.instance_id,
            "confirm_time_minutes": self.confirm_time_minutes,
            "action": self.action,
            "started_at": self.started_at.isoformat(),
            "expires_at": self.expires_at.isoformat(),
            "seconds_remaining": self.seconds_remaining(),
        }


# In-memory store keyed by instance_id
_sessions: Dict[str, CommitConfirmSession] = {}


def set_active(
    instance_id: str,
    confirm_time_minutes: int,
    action: str = "reload",
) -> CommitConfirmSession:
    """Record a new active commit-confirm session for an instance."""
    now = datetime.now(timezone.utc)
    session = CommitConfirmSession(
        instance_id=instance_id,
        started_at=now,
        expires_at=now + timedelta(minutes=confirm_time_minutes),
        confirm_time_minutes=confirm_time_minutes,
        action=action,
    )
    _sessions[instance_id] = session
    logger.info(
        "Commit-confirm started for instance %s (%d min, action=%s)",
        instance_id, confirm_time_minutes, action,
    )
    return session


def get_active(instance_id: str) -> Optional[CommitConfirmSession]:
    """Return the active session if it exists and hasn't expired."""
    session = _sessions.get(instance_id)
    if session is None:
        return None
    if session.is_expired():
        logger.info("Commit-confirm expired for instance %s — VyOS should have reverted", instance_id)
        del _sessions[instance_id]
        return None
    return session


def is_active(instance_id: str) -> bool:
    """Return True if there is an active (non-expired) commit-confirm."""
    return get_active(instance_id) is not None


def clear(instance_id: str) -> None:
    """Clear the commit-confirm session (after confirm or explicit discard)."""
    if instance_id in _sessions:
        del _sessions[instance_id]
        logger.info("Commit-confirm cleared for instance %s", instance_id)
