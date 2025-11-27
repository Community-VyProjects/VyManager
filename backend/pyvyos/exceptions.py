"""PyVyOS exception hierarchy for typed error handling."""


class SDKError(Exception):
    """Base exception for all PyVyOS SDK errors."""
    pass


class HttpError(SDKError):
    """HTTP-level errors (network, timeout, status codes)."""
    
    def __init__(self, status: int, message: str):
        self.status = status
        self.message = message
        super().__init__(f"HTTP Error {status}: {message}")


class ApiError(SDKError):
    """API-level errors (when VyOS API returns success=False)."""
    
    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details
        super().__init__(message)


class ValidationError(SDKError):
    """Client-side validation errors (invalid parameters)."""
    
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)

