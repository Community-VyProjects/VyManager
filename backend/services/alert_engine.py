"""
Alert Engine Service

Background task that periodically evaluates alert rules against current system metrics
and creates alert history records when conditions are triggered.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import asyncpg

from services.notification import notification_service

logger = logging.getLogger(__name__)


class AlertEngine:
    """
    Alert evaluation engine that runs as a background task.

    Evaluates enabled alert rules against current metrics from VyOS instances
    and creates alert history records when conditions are met.
    """

    def __init__(self, db_pool: asyncpg.Pool):
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._db_pool = db_pool

    async def start(self, interval_seconds: int = 30):
        """Start the alert evaluation loop."""
        if self._running:
            logger.warning("Alert engine already running")
            return

        self._running = True
        self._task = asyncio.create_task(self._run_loop(interval_seconds))
        logger.info(f"Alert engine started with {interval_seconds}s interval")

    async def stop(self):
        """Stop the alert evaluation loop."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Alert engine stopped")

    async def _run_loop(self, interval_seconds: int):
        """Main evaluation loop."""
        while self._running:
            try:
                await self._evaluate_all_rules()
            except Exception as e:
                logger.error(f"Error in alert evaluation loop: {e}")

            await asyncio.sleep(interval_seconds)

    async def _evaluate_all_rules(self):
        """Evaluate all enabled alert rules."""
        if not self._db_pool:
            logger.warning("Database pool not available")
            return

        try:
            async with self._db_pool.acquire() as conn:
                # Get all enabled rules
                rules = await conn.fetch(
                    """
                    SELECT id, "instanceId", name, description, type, severity,
                           enabled, conditions, "notifyInApp", "webhookUrl",
                           "telegramChatId", "telegramBotToken",
                           "cooldownSeconds", "lastTriggeredAt", "createdBy"
                    FROM alert_rules
                    WHERE enabled = true
                    """
                )

                if not rules:
                    return

                logger.debug(f"Evaluating {len(rules)} alert rules")

                # Group rules by instance
                rules_by_instance: Dict[str, List] = {}
                for rule in rules:
                    instance_id = rule["instanceId"]
                    if instance_id not in rules_by_instance:
                        rules_by_instance[instance_id] = []
                    rules_by_instance[instance_id].append(rule)

                # Evaluate rules for each instance
                for instance_id, instance_rules in rules_by_instance.items():
                    try:
                        await self._evaluate_instance_rules(conn, instance_id, instance_rules)
                    except Exception as e:
                        logger.error(f"Error evaluating rules for instance {instance_id}: {e}")

        except Exception as e:
            logger.error(f"Error fetching alert rules: {e}")

    async def _evaluate_instance_rules(
        self,
        conn: asyncpg.Connection,
        instance_id: str,
        rules: List
    ):
        """
        Evaluate all rules for a specific instance.

        Note: This requires an active VyOS session for the instance.
        Rules are only evaluated when users have active connections.
        For production, you might want a dedicated VyOS connection pool.
        """
        # For each rule, check if it should trigger
        for rule in rules:
            try:
                await self._evaluate_rule(conn, rule)
            except Exception as e:
                logger.error(f"Error evaluating rule {rule['id']}: {e}")

    async def _evaluate_rule(self, conn: asyncpg.Connection, rule: asyncpg.Record):
        """
        Evaluate a single alert rule.

        Currently implements a simplified evaluation that checks
        if enough time has passed since the last trigger (cooldown).

        Full implementation would fetch live metrics from VyOS and
        compare against thresholds.
        """
        # Check cooldown
        last_triggered = rule["lastTriggeredAt"]
        cooldown_seconds = rule["cooldownSeconds"] or 300

        if last_triggered:
            cooldown_end = last_triggered + timedelta(seconds=cooldown_seconds)
            if datetime.now(timezone.utc).replace(tzinfo=None) < cooldown_end:
                logger.debug(f"Rule {rule['id']} is in cooldown period")
                return

        # Parse conditions
        conditions = rule["conditions"]
        if isinstance(conditions, str):
            conditions = json.loads(conditions)
        elif conditions is None:
            conditions = {}

        # Evaluate based on rule type
        # Note: Full implementation would connect to VyOS and fetch real metrics
        # For now, this is a stub that can be extended
        triggered = False
        message = ""
        details: Dict[str, Any] = {}
        rule_type = rule["type"]

        if rule_type == "INTERFACE_DOWN":
            interface_name = conditions.get("interface", "")
            triggered = False
            message = f"Interface {interface_name} is down"
            details = {"interface": interface_name}

        elif rule_type == "HIGH_CPU":
            threshold = conditions.get("threshold", 90)
            duration = conditions.get("duration", 60)
            triggered = False
            message = f"CPU usage exceeded {threshold}% for {duration}s"
            details = {"threshold": threshold, "duration": duration}

        elif rule_type == "HIGH_MEMORY":
            threshold = conditions.get("threshold", 90)
            duration = conditions.get("duration", 60)
            triggered = False
            message = f"Memory usage exceeded {threshold}% for {duration}s"
            details = {"threshold": threshold, "duration": duration}

        elif rule_type == "HIGH_DISK":
            threshold = conditions.get("threshold", 90)
            triggered = False
            message = f"Disk usage exceeded {threshold}%"
            details = {"threshold": threshold}

        elif rule_type == "CONNECTION_THRESHOLD":
            threshold = conditions.get("threshold", 10000)
            triggered = False
            message = f"Connection count exceeded {threshold}"
            details = {"threshold": threshold}

        elif rule_type == "INTERFACE_ERRORS":
            interface_name = conditions.get("interface", "")
            threshold = conditions.get("threshold", 100)
            triggered = False
            message = f"Interface {interface_name} error count exceeded {threshold}"
            details = {"interface": interface_name, "threshold": threshold}

        elif rule_type == "BGP_NEIGHBOR_DOWN":
            neighbor = conditions.get("neighbor", "")
            triggered = False
            message = f"BGP neighbor {neighbor} is down"
            details = {"neighbor": neighbor}

        elif rule_type == "IPSEC_TUNNEL_DOWN":
            peer = conditions.get("peer", "")
            tunnel = conditions.get("tunnel", "")
            triggered = False
            if tunnel:
                message = f"IPsec tunnel {tunnel} to peer {peer} is down"
                details = {"peer": peer, "tunnel": tunnel}
            else:
                message = f"IPsec tunnel to peer {peer} is down"
                details = {"peer": peer}

        elif rule_type == "OPENVPN_TUNNEL_DOWN":
            openvpn_interface = conditions.get("openvpn_interface", "")
            triggered = False
            message = f"OpenVPN tunnel {openvpn_interface} is down"
            details = {"interface": openvpn_interface}

        elif rule_type == "WIREGUARD_PEER_DOWN":
            wireguard_interface = conditions.get("wireguard_interface", "")
            wireguard_peer = conditions.get("wireguard_peer", "")
            triggered = False
            if wireguard_peer:
                message = f"WireGuard peer {wireguard_peer} on {wireguard_interface} is unreachable"
                details = {"interface": wireguard_interface, "peer": wireguard_peer}
            else:
                message = f"WireGuard interface {wireguard_interface} has unreachable peers"
                details = {"interface": wireguard_interface}

        if triggered:
            await self._create_alert(conn, rule, message, details)

    async def _create_alert(
        self,
        conn: asyncpg.Connection,
        rule: asyncpg.Record,
        message: str,
        details: Dict[str, Any]
    ):
        """Create an alert history record and update the rule's last triggered time."""
        try:
            # Generate a unique ID (cuid-like)
            import secrets
            alert_id = secrets.token_urlsafe(16)

            # Create alert history
            await conn.execute(
                """
                INSERT INTO alert_history (id, "ruleId", "instanceId", type, severity, message, details, "triggeredAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """,
                alert_id,
                rule["id"],
                rule["instanceId"],
                rule["type"],
                rule["severity"],
                message,
                json.dumps(details),
                datetime.now(timezone.utc)
            )

            # Update rule's last triggered time
            await conn.execute(
                """
                UPDATE alert_rules SET "lastTriggeredAt" = $1 WHERE id = $2
                """,
                datetime.now(timezone.utc),
                rule["id"]
            )

            logger.info(f"Alert triggered: {rule['name']} - {message}")

            # Send notifications
            await self._send_notifications(rule, message, details)

        except Exception as e:
            logger.error(f"Error creating alert for rule {rule['id']}: {e}")

    async def _send_notifications(
        self,
        rule: asyncpg.Record,
        message: str,
        details: Dict[str, Any]
    ):
        """Send notifications for triggered alert via all configured channels."""
        webhook_url = rule.get("webhookUrl")
        telegram_chat_id = rule.get("telegramChatId")
        telegram_bot_token = rule.get("telegramBotToken")

        if not webhook_url and not telegram_chat_id:
            return

        try:
            results = await notification_service.send_alert(
                rule_name=rule["name"],
                rule_type=rule["type"],
                severity=rule["severity"],
                message=message,
                details=details,
                instance_id=rule["instanceId"],
                webhook_url=webhook_url,
                telegram_chat_id=telegram_chat_id,
                telegram_bot_token=telegram_bot_token,
            )

            for channel, success in results.items():
                if success:
                    logger.debug(f"{channel} notification sent for rule {rule['id']}")
                else:
                    logger.warning(f"{channel} notification failed for rule {rule['id']}")

        except Exception as e:
            logger.error(f"Error sending notifications for rule {rule['id']}: {e}")


# Global instance (initialized in app startup)
alert_engine: Optional[AlertEngine] = None


async def start_alert_engine(db_pool: asyncpg.Pool, interval_seconds: int = 30):
    """Initialize and start the global alert engine."""
    global alert_engine
    alert_engine = AlertEngine(db_pool)
    await alert_engine.start(interval_seconds)


async def stop_alert_engine():
    """Stop the global alert engine."""
    global alert_engine
    if alert_engine:
        await alert_engine.stop()
        alert_engine = None
