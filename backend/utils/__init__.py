"""
Backend utilities module.
"""

from .crypto import encrypt_api_key, decrypt_api_key, generate_encryption_key
from .logging import get_logger, log_security_event
from .audit import (
    log_audit_event,
    audit_create,
    audit_update,
    audit_delete,
    audit_login,
    audit_logout,
    audit_connect,
    audit_disconnect,
    audit_config_change,
)

__all__ = [
    "encrypt_api_key",
    "decrypt_api_key",
    "generate_encryption_key",
    "get_logger",
    "log_security_event",
    "log_audit_event",
    "audit_create",
    "audit_update",
    "audit_delete",
    "audit_login",
    "audit_logout",
    "audit_connect",
    "audit_disconnect",
    "audit_config_change",
]
