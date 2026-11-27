"""
SSE Event Manager for Banner Status Updates

Manages per-instance event streams so the frontend receives instant
updates for config diff, commit-confirm, and power status changes
instead of polling.

Two update paths:
  1. Immediate — mutation endpoints call emit() after changes.
  2. Background — a poller detects external changes (e.g. CLI edits)
     and emits only when state actually differs from the last push.

Subscriber queues are asyncio queues owned by the event loop that created
them. emit() is also called from threadpool workers (VyOSService.execute_batch
runs under run_in_threadpool), and asyncio queues are not thread-safe: a put
from a worker thread does not wake the SSE generator waiting in queue.get().
So each put is handed to the queue's own loop with call_soon_threadsafe when
emit() runs anywhere else, and a lock guards the channel table, which the
loop and the workers both read.
"""

import asyncio
import json
import logging
import threading
from dataclasses import dataclass, field
from typing import Any, Dict

import device_keys

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
    """Holds the subscribers and last-known state for one VyOS instance.

    Each subscriber queue maps to the event loop that owns it.
    """
    subscribers: Dict[asyncio.Queue, asyncio.AbstractEventLoop] = field(default_factory=dict)
    last_state: Dict[str, Any] = field(default_factory=dict)


class EventManager:
    """
    Central pub/sub hub for banner SSE events.

    One channel per instance row. emit() fans an event out to every verified
    row on the same router (device_keys); emit_to_instance() reaches one row.
    """

    def __init__(self) -> None:
        self._channels: Dict[str, _InstanceChannel] = {}
        # Guards _channels: subscribe/unsubscribe run on the loop, emit may
        # run on a threadpool worker.
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Subscribe / unsubscribe
    # ------------------------------------------------------------------

    def subscribe(self, instance_id: str) -> asyncio.Queue:
        """Add a new subscriber for an instance, returning its queue.

        Called from the SSE route on the event loop that will read the queue.
        """
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue = asyncio.Queue()
        with self._lock:
            channel = self._channels.setdefault(instance_id, _InstanceChannel())
            channel.subscribers[queue] = loop
            total = len(channel.subscribers)
        logger.info("SSE subscriber added for instance %s (total: %d)", instance_id, total)
        return queue

    def unsubscribe(self, instance_id: str, queue: asyncio.Queue) -> None:
        """Remove a subscriber queue."""
        with self._lock:
            channel = self._channels.get(instance_id)
            if not channel:
                return
            channel.subscribers.pop(queue, None)
            total = len(channel.subscribers)
            if not channel.subscribers:
                del self._channels[instance_id]
        logger.info("SSE subscriber removed for instance %s (total: %d)", instance_id, total)

    # ------------------------------------------------------------------
    # Emit events
    # ------------------------------------------------------------------

    def emit(self, instance_id: str, event_type: str, data: Any) -> None:
        """
        Push an event to all subscribers of an instance.

        Called from mutation endpoints for instant updates (on the loop or
        from a threadpool worker) and from the background poller when
        external changes are detected.

        Router events reach every instance row that points at the same router
        (see ``device_keys``), so a second site or organization on that router
        sees the change too. Use :meth:`emit_to_instance` for one row only.
        """
        self._deliver(device_keys.instances_on(device_keys.key_for(instance_id)), event_type, data)

    def emit_to_instance(self, instance_id: str, event_type: str, data: Any) -> None:
        """Push an event to the subscribers of this one instance row."""
        self._deliver({instance_id}, event_type, data)

    def _deliver(self, instance_ids: Any, event_type: str, data: Any) -> None:
        with self._lock:
            targets = [
                item
                for iid in instance_ids
                for item in (self._channels[iid].subscribers.items() if iid in self._channels else ())
            ]
        if not targets:
            return

        payload = json.dumps({"type": event_type, "data": data})
        try:
            running = asyncio.get_running_loop()
        except RuntimeError:
            running = None

        for queue, loop in targets:
            if loop is running:
                queue.put_nowait(payload)
                continue
            try:
                loop.call_soon_threadsafe(queue.put_nowait, payload)
            except RuntimeError:
                # That queue's loop is closed (shutdown); no stream is left to wake.
                logger.debug("Dropped %s event: event loop closed", event_type)

    # ------------------------------------------------------------------
    # Background poller
    # ------------------------------------------------------------------

    def update_last_state(self, instance_id: str, key: str, value: Any) -> bool:
        """
        Update cached state for an instance.
        Returns True if the value changed (i.e. an event should be emitted).
        """
        serialized_new = json.dumps(value, sort_keys=True, default=str)
        with self._lock:
            channel = self._channels.get(instance_id)
            if not channel:
                return False

            old = channel.last_state.get(key)
            serialized_old = json.dumps(old, sort_keys=True, default=str) if old is not None else None

            if serialized_new != serialized_old:
                channel.last_state[key] = value
                return True
            return False

    def get_subscribed_instance_ids(self) -> list[str]:
        """Return instance IDs that have at least one subscriber."""
        with self._lock:
            return [iid for iid, ch in self._channels.items() if ch.subscribers]


# Singleton
event_manager = EventManager()
