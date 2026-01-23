"""
Logs Router

API endpoints for viewing VyOS system logs.
Uses session-based architecture - VyOS instance comes from user's active session.
"""

from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import re

from session_vyos_service import get_session_vyos_service

router = APIRouter(prefix="/vyos/logs", tags=["logs"])


# ========================================================================
# Pydantic Models
# ========================================================================


class LogEntry(BaseModel):
    """Model for a single log entry."""
    timestamp: Optional[str] = None
    facility: Optional[str] = None
    severity: Optional[str] = None
    hostname: Optional[str] = None
    process: Optional[str] = None
    message: str
    raw: str


class LogsResponse(BaseModel):
    """Response containing log entries."""
    entries: List[LogEntry]
    total: int
    has_more: bool


class LogFiltersResponse(BaseModel):
    """Available log filters."""
    facilities: List[str]
    severities: List[str]


# ========================================================================
# Helper: Parse Log Entries
# ========================================================================


def parse_log_line(line: str) -> Optional[LogEntry]:
    """
    Parse a single log line into structured data.

    VyOS log format is typically:
    Jan 23 10:15:32 hostname process[pid]: message
    or
    2024-01-23T10:15:32.123456+00:00 hostname process[pid]: message
    """
    if not line or not line.strip():
        return None

    line = line.strip()

    # Try to parse RFC 3339 timestamp (journalctl format)
    rfc3339_pattern = r'^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[^\s]*)\s+(\S+)\s+(\S+?)(?:\[(\d+)\])?:\s*(.*)$'
    match = re.match(rfc3339_pattern, line)
    if match:
        return LogEntry(
            timestamp=match.group(1),
            hostname=match.group(2),
            process=match.group(3),
            message=match.group(5),
            raw=line
        )

    # Try to parse traditional syslog format
    # Pattern: Mon DD HH:MM:SS hostname process[pid]: message
    syslog_pattern = r'^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+?)(?:\[(\d+)\])?:\s*(.*)$'
    match = re.match(syslog_pattern, line)
    if match:
        return LogEntry(
            timestamp=match.group(1),
            hostname=match.group(2),
            process=match.group(3),
            message=match.group(5),
            raw=line
        )

    # Fallback: treat entire line as message
    return LogEntry(
        message=line,
        raw=line
    )


def parse_logs(output: str, limit: int = 500) -> List[LogEntry]:
    """Parse VyOS log output into structured entries."""
    entries = []

    if not output or not isinstance(output, str):
        return entries

    lines = output.strip().split('\n')

    # Process lines in reverse order (most recent first)
    for line in reversed(lines[-limit:]):
        entry = parse_log_line(line)
        if entry:
            entries.append(entry)

    return entries


# ========================================================================
# Endpoints
# ========================================================================


@router.get("", response_model=LogsResponse)
async def get_logs(
    request: Request,
    lines: int = Query(default=100, ge=10, le=1000, description="Number of log lines to fetch"),
    filter_text: Optional[str] = Query(default=None, description="Filter logs containing this text"),
    process: Optional[str] = Query(default=None, description="Filter by process name"),
):
    """
    Get recent system logs from VyOS.

    Uses 'show log' command to fetch recent log entries.

    Args:
        lines: Number of log lines to fetch (10-1000)
        filter_text: Optional text filter
        process: Optional process name filter

    Returns:
        Structured log entries
    """
    try:
        service = get_session_vyos_service(request)

        # Try different log commands - VyOS versions differ in available commands
        output = ""
        last_error = None

        # Try commands in order of preference
        log_commands = [
            ["log"],  # Basic 'show log' - most compatible
            ["log", "tail", str(lines)],  # 'show log tail N'
            ["log", "syslog"],  # Some VyOS versions
        ]

        for cmd_path in log_commands:
            try:
                response = service.device.show(path=cmd_path)

                if response.status == 200:
                    # Extract output
                    if isinstance(response.result, dict) and "data" in response.result:
                        output = response.result["data"]
                    elif isinstance(response.result, str):
                        output = response.result

                    # Check if output contains error message
                    if output and "cannot open" not in output.lower() and "no such file" not in output.lower():
                        break
                    else:
                        last_error = output
                        output = ""
                else:
                    last_error = response.error
            except Exception as e:
                last_error = str(e)
                continue

        # If no output was retrieved, return empty with info
        if not output:
            # Return empty response with info about the error
            if last_error:
                return LogsResponse(
                    entries=[LogEntry(
                        message=f"Unable to fetch logs from VyOS device. The device may not have traditional syslog configured. Error: {last_error}",
                        raw=f"Error: {last_error}"
                    )],
                    total=1,
                    has_more=False
                )
            return LogsResponse(entries=[], total=0, has_more=False)

        # Parse log entries
        entries = parse_logs(output, limit=lines)

        # Apply filters
        if filter_text:
            filter_lower = filter_text.lower()
            entries = [e for e in entries if filter_lower in e.raw.lower()]

        if process:
            process_lower = process.lower()
            entries = [e for e in entries if e.process and process_lower in e.process.lower()]

        return LogsResponse(
            entries=entries,
            total=len(entries),
            has_more=len(entries) >= lines
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/boot", response_model=LogsResponse)
async def get_boot_logs(
    request: Request,
    lines: int = Query(default=100, ge=10, le=500, description="Number of log lines to fetch"),
):
    """
    Get boot logs from VyOS.

    Uses 'show log boot' command to fetch boot-related log entries.

    Returns:
        Structured log entries from boot
    """
    try:
        service = get_session_vyos_service(request)

        # Execute 'show log boot' command
        response = service.device.show(path=["log", "boot"])

        # Extract output
        output = ""
        if response.status == 200:
            if isinstance(response.result, dict) and "data" in response.result:
                output = response.result["data"]
            elif isinstance(response.result, str):
                output = response.result

        # Check for error in output
        if not output or "cannot open" in output.lower() or "no such file" in output.lower():
            return LogsResponse(
                entries=[LogEntry(
                    message="Boot logs are not available on this VyOS device",
                    raw="Boot logs unavailable"
                )],
                total=1,
                has_more=False
            )

        # Parse log entries
        entries = parse_logs(output, limit=lines)

        return LogsResponse(
            entries=entries,
            total=len(entries),
            has_more=False
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search", response_model=LogsResponse)
async def search_logs(
    request: Request,
    query: str = Query(..., min_length=1, description="Search query"),
    lines: int = Query(default=200, ge=10, le=1000, description="Number of log lines to search through"),
):
    """
    Search through recent logs for a specific pattern.

    Uses 'show log' and filters results.

    Args:
        query: Search query (case-insensitive)
        lines: Number of log lines to search through

    Returns:
        Matching log entries
    """
    try:
        service = get_session_vyos_service(request)

        # Try to get logs
        output = ""
        for cmd_path in [["log"], ["log", "tail", str(lines)]]:
            try:
                response = service.device.show(path=cmd_path)
                if response.status == 200:
                    if isinstance(response.result, dict) and "data" in response.result:
                        output = response.result["data"]
                    elif isinstance(response.result, str):
                        output = response.result
                    if output and "cannot open" not in output.lower():
                        break
            except:
                continue

        if not output or "cannot open" in output.lower():
            return LogsResponse(entries=[], total=0, has_more=False)

        # Parse log entries
        entries = parse_logs(output, limit=lines)

        # Filter by query
        query_lower = query.lower()
        entries = [e for e in entries if query_lower in e.raw.lower()]

        return LogsResponse(
            entries=entries,
            total=len(entries),
            has_more=False
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/processes")
async def get_log_processes(request: Request):
    """
    Get list of unique processes that appear in recent logs.

    Useful for filtering logs by process.

    Returns:
        List of process names
    """
    try:
        service = get_session_vyos_service(request)

        # Try to get logs
        output = ""
        for cmd_path in [["log"], ["log", "tail", "500"]]:
            try:
                response = service.device.show(path=cmd_path)
                if response.status == 200:
                    if isinstance(response.result, dict) and "data" in response.result:
                        output = response.result["data"]
                    elif isinstance(response.result, str):
                        output = response.result
                    if output and "cannot open" not in output.lower():
                        break
            except:
                continue

        if not output or "cannot open" in output.lower():
            return {"processes": []}

        # Parse log entries
        entries = parse_logs(output, limit=500)

        # Extract unique processes
        processes = set()
        for entry in entries:
            if entry.process:
                # Remove any trailing brackets or numbers
                process_name = entry.process.split('[')[0]
                processes.add(process_name)

        return {"processes": sorted(list(processes))}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
