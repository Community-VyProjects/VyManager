"""
Logging utilities for VyManager backend.

Provides structured logging with configurable levels.
"""

import logging
import os
import sys
from typing import Optional


# Configure log level from environment
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

# Create formatter
_formatter = logging.Formatter(
    fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

# Create console handler
_console_handler = logging.StreamHandler(sys.stdout)
_console_handler.setFormatter(_formatter)

# Cache for loggers
_loggers: dict = {}


def get_logger(name: str, level: Optional[str] = None) -> logging.Logger:
    """
    Get a configured logger instance.

    Args:
        name: Logger name (typically __name__ or module name).
        level: Optional log level override.

    Returns:
        Configured Logger instance.

    Example:
        >>> logger = get_logger(__name__)
        >>> logger.info("Processing request")
        >>> logger.error("Failed to connect", exc_info=True)
    """
    if name in _loggers:
        return _loggers[name]

    logger = logging.getLogger(name)

    # Set level
    effective_level = level or LOG_LEVEL
    logger.setLevel(getattr(logging, effective_level, logging.INFO))

    # Add handler if not already present
    if not logger.handlers:
        logger.addHandler(_console_handler)

    # Prevent propagation to root logger to avoid duplicate logs
    logger.propagate = False

    _loggers[name] = logger
    return logger


def log_security_event(
    event_type: str,
    user_id: Optional[str] = None,
    details: Optional[dict] = None,
    level: str = "WARNING"
) -> None:
    """
    Log a security-related event.

    Args:
        event_type: Type of security event (e.g., "failed_login", "session_hijack_attempt").
        user_id: User ID if available.
        details: Additional details as dictionary.
        level: Log level (default WARNING).

    Example:
        >>> log_security_event("failed_login", user_id="123", details={"ip": "1.2.3.4"})
    """
    logger = get_logger("security")

    message = f"SECURITY_EVENT: {event_type}"
    if user_id:
        message += f" | user_id={user_id}"
    if details:
        # Sanitize sensitive data
        safe_details = {
            k: v for k, v in details.items()
            if k.lower() not in ("password", "api_key", "token", "secret")
        }
        message += f" | details={safe_details}"

    log_func = getattr(logger, level.lower(), logger.warning)
    log_func(message)
