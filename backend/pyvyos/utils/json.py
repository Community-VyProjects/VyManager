"""JSON utilities with security (redaction) support."""

import json
from typing import Any, Dict, List


def redact_key(data: Dict[str, Any], keys: List[str] = None) -> Dict[str, Any]:
    """
    Redact sensitive keys from a dictionary.
    
    Args:
        data: Dictionary to redact
        keys: List of keys to redact (default: ["key", "apikey", "password"])
    
    Returns:
        Copy of data with specified keys redacted as "***REDACTED***"
    """
    if keys is None:
        keys = ["key", "apikey", "password"]
    
    if not isinstance(data, dict):
        return data
    
    redacted = data.copy()
    for key in keys:
        if key in redacted:
            redacted[key] = "***REDACTED***"
    
    return redacted


def safe_dumps(obj: Any, redact_keys: List[str] = None) -> str:
    """
    Safely serialize object to JSON with key redaction.
    
    Args:
        obj: Object to serialize
        redact_keys: Keys to redact if obj is a dict
    
    Returns:
        JSON string with sensitive data redacted
    """
    if isinstance(obj, dict):
        obj = redact_key(obj, redact_keys)
    
    return json.dumps(obj, default=str)

