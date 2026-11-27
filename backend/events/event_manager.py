"""
SSE Event Manager for Banner Status Updates

Manages per-instance event streams so the frontend receives instant
updates for config diff, commit-confirm, and power status changes
instead of polling.

Two update paths:
  1. Immediate — mutation endpoints call emit() after changes.
  2. Background — a poller detects external changes (e.g. CLI edits)
     and emits only when state actually differs from the last push.

Subscriber queues are asyncio queues owned by the event loop. emit() is
also called from threadpool workers (VyOSService.execute_batch runs under
run_in_threadpool), and asyncio queues are not thread-safe: a put from a
worker thread does not wake the SSE generator waiting in queue.get(). So
every delivery runs on the loop, handed over with call_soon_threadsafe
when emit() is called from another thread.
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Set

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
        # The loop that owns the subscriber queues, recorded on subscribe.
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    # ------------------------------------------------------------------
    # Subscribe / unsubscribe
    # ------------------------------------------------------------------

    def subscribe(self, instance_id: str) -> asyncio.Queue:
        """Add a new subscriber for an instance, returning its queue.

        Called from the SSE route on the event loop.
        """
        self._loop = asyncio.get_running_loop()
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

        Called from mutation endpoints for instant updates (on the loop or
        from a threadpool worker) and from the background poller when
        external changes are detected.
        """
        loop = self._loop
        if loop is None:
            return  # Nobody has ever subscribed.

        payload = json.dumps({"type": event_type, "data": data})
        try:
            running = asyncio.get_running_loop()
        except RuntimeError:
            running = None

        if running is loop:
            self._deliver(instance_id, payload)
            return
        try:
            loop.call_soon_threadsafe(self._deliver, instance_id, payload)
        except RuntimeError:
            # The loop is closed (shutdown); there is no stream left to wake.
            logger.debug("Dropped %s event for instance %s: event loop closed", event_type, instance_id)

    def _deliver(self, instance_id: str, payload: str) -> None:
        """Put one payload on every subscriber queue. Runs on the loop."""
        channel = self._channels.get(instance_id)
        if not channel:
            return
        for queue in channel.subscribers:
            queue.put_nowait(payload)

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


# Singleton
event_manager = EventManager()
