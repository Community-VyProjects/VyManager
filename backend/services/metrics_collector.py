"""
Metrics Collector Service

Background task that periodically collects system metrics from connected VyOS instances
and stores them in the database for historical graphing.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
import secrets

import asyncpg

logger = logging.getLogger(__name__)


class MetricsCollector:
    """
    Service for collecting and storing VyOS metrics.

    Collects:
    - CPU usage
    - Memory usage
    - Disk usage
    - Interface traffic (RX/TX bytes)
    - Conntrack connection count
    """

    def __init__(self, db_pool: asyncpg.Pool):
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._db_pool = db_pool
        # Store previous interface counters for rate calculation
        self._prev_counters: Dict[str, Dict[str, int]] = {}

    async def start(self, interval_seconds: int = 60):
        """Start the metrics collection loop."""
        if self._running:
            logger.warning("Metrics collector already running")
            return

        self._running = True
        self._task = asyncio.create_task(self._run_loop(interval_seconds))
        logger.info(f"Metrics collector started with {interval_seconds}s interval")

    async def stop(self):
        """Stop the metrics collection loop."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Metrics collector stopped")

    async def _run_loop(self, interval_seconds: int):
        """Main collection loop."""
        while self._running:
            try:
                await self._collect_all_metrics()
            except Exception as e:
                logger.error(f"Error in metrics collection loop: {e}")

            await asyncio.sleep(interval_seconds)

    async def _collect_all_metrics(self):
        """Collect metrics from all instances with active sessions."""
        if not self._db_pool:
            return

        try:
            async with self._db_pool.acquire() as conn:
                # Get instances with active sessions
                sessions = await conn.fetch(
                    """
                    SELECT DISTINCT "instanceId"
                    FROM active_sessions
                    WHERE "disconnectedAt" IS NULL
                    """
                )

                if not sessions:
                    return

                logger.debug(f"Collecting metrics for {len(sessions)} active instances")

                for session in sessions:
                    instance_id = session["instanceId"]
                    try:
                        await self._collect_instance_metrics(conn, instance_id)
                    except Exception as e:
                        logger.error(f"Error collecting metrics for instance {instance_id}: {e}")

        except Exception as e:
            logger.error(f"Error in metrics collection: {e}")

    async def _collect_instance_metrics(
        self,
        conn: asyncpg.Connection,
        instance_id: str
    ):
        """
        Collect metrics for a single instance.

        Note: This is a simplified implementation that stores placeholder values.
        Full implementation would require accessing the VyOS API through the session.
        """
        now = datetime.now(timezone.utc)
        metrics_to_insert = []

        # For now, we'll skip actual VyOS collection since we'd need session access
        # This serves as the schema/infrastructure for when collection is wired up
        # In production, this would be called from the session context or
        # maintain its own VyOS connections

        # Insert metrics if any were collected
        if metrics_to_insert:
            await conn.executemany(
                """
                INSERT INTO metrics_history (id, "instanceId", type, name, value, timestamp)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                metrics_to_insert
            )

    async def store_metrics(
        self,
        instance_id: str,
        cpu_percent: Optional[float] = None,
        memory_percent: Optional[float] = None,
        disk_metrics: Optional[List[Dict[str, Any]]] = None,
        interface_metrics: Optional[List[Dict[str, Any]]] = None,
        conntrack_count: Optional[int] = None,
    ):
        """
        Store metrics for an instance. Called from monitoring endpoints.

        Args:
            instance_id: The VyOS instance ID
            cpu_percent: CPU usage percentage
            memory_percent: Memory usage percentage
            disk_metrics: List of {mount_point, percent} dicts
            interface_metrics: List of {name, rx_bytes, tx_bytes} dicts
            conntrack_count: Number of conntrack connections
        """
        if not self._db_pool:
            return

        now = datetime.now(timezone.utc)
        metrics_to_insert = []

        def add_metric(metric_type: str, value: float, name: Optional[str] = None):
            metrics_to_insert.append((
                secrets.token_urlsafe(16),
                instance_id,
                metric_type,
                name,
                value,
                now
            ))

        if cpu_percent is not None:
            add_metric("CPU", cpu_percent)

        if memory_percent is not None:
            add_metric("MEMORY", memory_percent)

        if disk_metrics:
            for disk in disk_metrics:
                add_metric("DISK", disk.get("percent", 0), disk.get("mount_point"))

        if interface_metrics:
            for iface in interface_metrics:
                name = iface.get("name")
                if iface.get("rx_bytes") is not None:
                    add_metric("INTERFACE_RX", float(iface["rx_bytes"]), name)
                if iface.get("tx_bytes") is not None:
                    add_metric("INTERFACE_TX", float(iface["tx_bytes"]), name)

        if conntrack_count is not None:
            add_metric("CONNTRACK", float(conntrack_count))

        if metrics_to_insert:
            try:
                async with self._db_pool.acquire() as conn:
                    await conn.executemany(
                        """
                        INSERT INTO metrics_history (id, "instanceId", type, name, value, timestamp)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        """,
                        metrics_to_insert
                    )
            except Exception as e:
                logger.error(f"Error storing metrics: {e}")

    async def cleanup_old_metrics(self, retention_days: int = 7):
        """Delete metrics older than retention period."""
        if not self._db_pool:
            return

        try:
            cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
            async with self._db_pool.acquire() as conn:
                result = await conn.execute(
                    'DELETE FROM metrics_history WHERE timestamp < $1',
                    cutoff
                )
                logger.info(f"Cleaned up old metrics: {result}")
        except Exception as e:
            logger.error(f"Error cleaning up metrics: {e}")


# Global instance
metrics_collector: Optional[MetricsCollector] = None


async def start_metrics_collector(db_pool: asyncpg.Pool, interval_seconds: int = 60):
    """Initialize and start the global metrics collector."""
    global metrics_collector
    metrics_collector = MetricsCollector(db_pool)
    await metrics_collector.start(interval_seconds)


async def stop_metrics_collector():
    """Stop the global metrics collector."""
    global metrics_collector
    if metrics_collector:
        await metrics_collector.stop()
        metrics_collector = None


def get_metrics_collector() -> Optional[MetricsCollector]:
    """Get the global metrics collector instance."""
    return metrics_collector
