"""Interpret a pyvyos ApiResponse without changing the client.

pyvyos keeps HTTP 200 when the VyOS API body says success=false and stores
the message on error. A false error value means there was no error.
"""


def commit_accepted(response) -> tuple[bool, str | None]:
    error = response.error if response.error else None
    return response.status == 200 and error is None, error
