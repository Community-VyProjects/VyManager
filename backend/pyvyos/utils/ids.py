"""ID generation utilities."""

import uuid


def request_id() -> str:
    """
    Generate a unique request ID for tracing.
    
    Returns:
        UUID4 string formatted for logging
    """
    return str(uuid.uuid4())

