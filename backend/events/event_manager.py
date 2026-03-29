"""
SSE Event Manager for Banner Status Updates

Manages per-instance event streams so the frontend receives instant
updates for config diff, commit-confirm, and power status changes
instead of polling.

Two update paths:
  1. Immediate — mutation endpoints call emit() after changes.
  2. Background — a poller detects external changes (e.g. CLI edits)
     and emits only when state actually differs from the last push.
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict, Optional, Set

logger = logging.getLogger(__name__)

# ============================================================================
# Event types
# ============================================================================

EVENT_CONFIG_DIFF = "config_diff"
EVENT_COMMIT_CONFIRM = "commit_confirm"
EVENT_POWER_STATUS = "power_status"


# ============================================================================
# Per-instance subscriber management
# ============================================================================

@dataclass
class _InstanceChannel:
    """Holds the subscribers and last-known state for one VyOS instance."""
    subscribers: Set[asyncio.Queue] = field(default_factory=set)
    last_state: Dict[str, Any] = field(default_factory=dict)


class EventManager:
    """
    Central pub/sub hub for banner SSE events.

    Keyed by instance_id so each VyOS device has its own channel.
    """

    def __init__(self) -> None:
        self._channels: Dict[str, _InstanceChannel] = {}
        self._poller_task: Optional[asyncio.Task] = None
        self._poll_interval: int = 10  # seconds

    # ------------------------------------------------------------------
    # Subscribe / unsubscribe
    # ------------------------------------------------------------------

    def subscribe(self, instance_id: str) -> asyncio.Queue:
        """Add a new subscriber for an instance, returning its queue."""
        channel = self._channels.setdefault(instance_id, _InstanceChannel())
        queue: asyncio.Queue = asyncio.Queue()
        channel.subscribers.add(queue)
        logger.info("SSE subscriber added for instance %s (total: %d)",
                     instance_id, len(channel.subscribers))
        return queue

    def unsubscribe(self, instance_id: str, queue: asyncio.Queue) -> None:
        """Remove a subscriber queue."""
        channel = self._channels.get(instance_id)
        if channel:
            channel.subscribers.discard(queue)
            logger.info("SSE subscriber removed for instance %s (total: %d)",
                         instance_id, len(channel.subscribers))
            if not channel.subscribers:
                del self._channels[instance_id]

    # ------------------------------------------------------------------
    # Emit events
    # ------------------------------------------------------------------

    def emit(self, instance_id: str, event_type: str, data: Any) -> None:
        """
        Push an event to all subscribers of an instance.

        Called from mutation endpoints for instant updates and from the
        background poller when external changes are detected.
        """
        channel = self._channels.get(instance_id)
        if not channel or not channel.subscribers:
            return

        payload = json.dumps({"type": event_type, "data": data})

        dead_queues: list[asyncio.Queue] = []
        for queue in channel.subscribers:
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                dead_queues.append(queue)

        for q in dead_queues:
            channel.subscribers.discard(q)

    def emit_all_banner_state(
        self,
        instance_id: str,
        config_diff: Any,
        commit_confirm: Any,
        power_status: Any,
    ) -> None:
        """Emit a combined banner_state event with all three payloads."""
        channel = self._channels.get(instance_id)
        if not channel or not channel.subscribers:
            return

        payload = json.dumps({
            "type": "banner_state",
            "data": {
                "config_diff": config_diff,
                "commit_confirm": commit_confirm,
                "power_status": power_status,
            },
        })

        dead_queues: list[asyncio.Queue] = []
        for queue in channel.subscribers:
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                dead_queues.append(queue)

        for q in dead_queues:
            channel.subscribers.discard(q)

    # ------------------------------------------------------------------
    # Background poller
    # ------------------------------------------------------------------

    def update_last_state(self, instance_id: str, key: str, value: Any) -> bool:
        """
        Update cached state for an instance.
        Returns True if the value changed (i.e. an event should be emitted).
        """
        channel = self._channels.get(instance_id)
        if not channel:
            return False

        old = channel.last_state.get(key)
        serialized_new = json.dumps(value, sort_keys=True, default=str)
        serialized_old = json.dumps(old, sort_keys=True, default=str) if old is not None else None

        if serialized_new != serialized_old:
            channel.last_state[key] = value
            return True
        return False

    def get_subscribed_instance_ids(self) -> list[str]:
        """Return instance IDs that have at least one subscriber."""
        return [iid for iid, ch in self._channels.items() if ch.subscribers]

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def has_subscribers(self, instance_id: str) -> bool:
        channel = self._channels.get(instance_id)
        return bool(channel and channel.subscribers)


# Singleton
event_manager = EventManager()
