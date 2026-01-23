"""
Notification Service

Handles sending notifications to various channels:
- Telegram (bot messages)
- Webhooks (HTTP POST)
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional
import httpx

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Service for sending notifications to multiple channels.
    """

    def __init__(self, timeout: float = 10.0):
        self._timeout = timeout

    async def send_alert(
        self,
        rule_name: str,
        rule_type: str,
        severity: str,
        message: str,
        details: Dict[str, Any],
        instance_id: str,
        webhook_url: Optional[str] = None,
        telegram_chat_id: Optional[str] = None,
        telegram_bot_token: Optional[str] = None,
    ) -> Dict[str, bool]:
        """
        Send alert notification to all configured channels.

        Returns:
            Dict with success status for each channel attempted
        """
        results = {}

        if webhook_url:
            results["webhook"] = await self._send_webhook(
                webhook_url=webhook_url,
                rule_name=rule_name,
                rule_type=rule_type,
                severity=severity,
                message=message,
                details=details,
                instance_id=instance_id,
            )

        if telegram_chat_id and telegram_bot_token:
            results["telegram"] = await self._send_telegram(
                chat_id=telegram_chat_id,
                bot_token=telegram_bot_token,
                rule_name=rule_name,
                rule_type=rule_type,
                severity=severity,
                message=message,
                details=details,
                instance_id=instance_id,
            )

        return results

    async def _send_webhook(
        self,
        webhook_url: str,
        rule_name: str,
        rule_type: str,
        severity: str,
        message: str,
        details: Dict[str, Any],
        instance_id: str,
    ) -> bool:
        """Send notification via webhook."""
        try:
            payload = {
                "rule_name": rule_name,
                "type": rule_type,
                "severity": severity,
                "message": message,
                "details": details,
                "instance_id": instance_id,
                "triggered_at": datetime.utcnow().isoformat(),
            }

            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(
                    webhook_url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )

                if response.status_code >= 400:
                    logger.warning(
                        f"Webhook returned {response.status_code} for {webhook_url}"
                    )
                    return False

                logger.debug(f"Webhook notification sent to {webhook_url}")
                return True

        except Exception as e:
            logger.error(f"Error sending webhook to {webhook_url}: {e}")
            return False

    async def _send_telegram(
        self,
        chat_id: str,
        bot_token: str,
        rule_name: str,
        rule_type: str,
        severity: str,
        message: str,
        details: Dict[str, Any],
        instance_id: str,
    ) -> bool:
        """Send notification via Telegram bot."""
        try:
            # Format severity emoji
            severity_emoji = {
                "CRITICAL": "\u26a0\ufe0f",  # ⚠️
                "WARNING": "\u2757",  # ❗
                "INFO": "\u2139\ufe0f",  # ℹ️
            }.get(severity, "\U0001F514")  # 🔔

            # Build message text
            text_lines = [
                f"{severity_emoji} *{severity}*: {rule_name}",
                "",
                message,
                "",
                f"\U0001F4CB *Type:* `{rule_type}`",
                f"\U0001F4E6 *Instance:* `{instance_id[:8]}...`",
            ]

            # Add details if present
            if details:
                text_lines.append("")
                text_lines.append("*Details:*")
                for key, value in details.items():
                    text_lines.append(f"  \u2022 {key}: `{value}`")

            text_lines.append("")
            text_lines.append(f"\U0001F551 {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")

            text = "\n".join(text_lines)

            # Send via Telegram Bot API
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"

            payload = {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "Markdown",
                "disable_web_page_preview": True,
            }

            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(url, json=payload)

                if response.status_code != 200:
                    result = response.json()
                    logger.warning(
                        f"Telegram API error: {result.get('description', 'Unknown error')}"
                    )
                    return False

                logger.debug(f"Telegram notification sent to chat {chat_id}")
                return True

        except Exception as e:
            logger.error(f"Error sending Telegram message: {e}")
            return False

    async def test_webhook(self, webhook_url: str) -> Dict[str, Any]:
        """Test webhook connectivity."""
        try:
            payload = {
                "type": "test",
                "message": "VyManager webhook test",
                "timestamp": datetime.utcnow().isoformat(),
            }

            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(
                    webhook_url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )

                return {
                    "success": response.status_code < 400,
                    "status_code": response.status_code,
                    "message": "Webhook test successful" if response.status_code < 400 else f"HTTP {response.status_code}",
                }

        except httpx.TimeoutException:
            return {"success": False, "message": "Connection timed out"}
        except httpx.ConnectError as e:
            return {"success": False, "message": f"Connection failed: {str(e)}"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    async def test_telegram(self, chat_id: str, bot_token: str) -> Dict[str, Any]:
        """Test Telegram bot connectivity."""
        try:
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"

            payload = {
                "chat_id": chat_id,
                "text": "\u2705 VyManager: Telegram notification test successful!",
                "parse_mode": "Markdown",
            }

            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(url, json=payload)

                if response.status_code == 200:
                    return {"success": True, "message": "Test message sent successfully"}

                result = response.json()
                error_msg = result.get("description", "Unknown error")
                return {"success": False, "message": error_msg}

        except httpx.TimeoutException:
            return {"success": False, "message": "Connection timed out"}
        except Exception as e:
            return {"success": False, "message": str(e)}


# Global instance
notification_service = NotificationService()
