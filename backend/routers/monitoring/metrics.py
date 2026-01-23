"""
System Metrics Router

API endpoints for VyOS system metrics (CPU, memory, disk, uptime).
Uses session-based architecture - VyOS instance comes from user's active session.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import re

from session_vyos_service import get_session_vyos_service

router = APIRouter(prefix="/monitoring/metrics", tags=["monitoring"])


# ========================================================================
# Pydantic Models
# ========================================================================


class CPUMetrics(BaseModel):
    """CPU usage metrics."""
    usage_percent: float
    load_average: List[float]  # 1, 5, 15 minute load averages


class MemoryMetrics(BaseModel):
    """Memory usage metrics."""
    total_bytes: int
    used_bytes: int
    free_bytes: int
    available_bytes: int
    usage_percent: float
    buffers_bytes: int
    cached_bytes: int


class DiskMetrics(BaseModel):
    """Disk usage metrics for a single filesystem."""
    filesystem: str
    mount_point: str
    total_bytes: int
    used_bytes: int
    available_bytes: int
    usage_percent: float


class SystemMetrics(BaseModel):
    """Complete system metrics response."""
    cpu: CPUMetrics
    memory: MemoryMetrics
    disk: List[DiskMetrics]
    uptime: str
    timestamp: datetime


# ========================================================================
# Parsing Helpers
# ========================================================================


def parse_cpu_metrics(output: str, uptime_output: str = "") -> CPUMetrics:
    """
    Parse VyOS 'show system cpu' output.

    VyOS returns hardware info from 'show system cpu':
    CPU socket: 0
    CPU Vendor:       GenuineIntel
    Model:            Intel(R) Xeon(R) CPU D-1537 @ 1.70GHz
    Cores:            8
    Current MHz:      800.000

    Load averages come from 'show system uptime':
    Uptime: 1w 5d 18h 55m 30s

    Load averages:
    1  minute:   9.6%
    5  minutes:  7.1%
    15 minutes:  7.0%
    """
    usage_percent = 0.0
    load_average = [0.0, 0.0, 0.0]

    # CPU usage comes from load average (1 minute) as an approximation
    # Parse load averages from uptime output
    if uptime_output:
        lines = uptime_output.strip().split('\n')
        for line in lines:
            # Parse "1  minute:   9.6%" format
            match = re.search(r'1\s+minute:\s*([\d.]+)%?', line)
            if match:
                load_average[0] = float(match.group(1))
                usage_percent = load_average[0]  # Use 1-minute load as CPU usage
            match = re.search(r'5\s+minutes:\s*([\d.]+)%?', line)
            if match:
                load_average[1] = float(match.group(1))
            match = re.search(r'15\s+minutes:\s*([\d.]+)%?', line)
            if match:
                load_average[2] = float(match.group(1))

    return CPUMetrics(usage_percent=usage_percent, load_average=load_average)


def parse_memory_metrics(output: str) -> MemoryMetrics:
    """
    Parse VyOS 'show system memory' output.

    VyOS format:
    Total: 15.53 GB
    Free:  14.56 GB
    Used:  994.06 MB
    """
    total = used = free = available = buffers = cached = 0

    if not output:
        return MemoryMetrics(
            total_bytes=0, used_bytes=0, free_bytes=0,
            available_bytes=0, usage_percent=0.0,
            buffers_bytes=0, cached_bytes=0
        )

    def parse_size_with_unit(value_str: str) -> int:
        """Parse size like '15.53 GB' or '994.06 MB' to bytes."""
        value_str = value_str.strip().upper()
        # Check longer units first to avoid 'B' matching 'GB'
        multipliers = [
            ('TB', 1024**4),
            ('GB', 1024**3),
            ('MB', 1024**2),
            ('KB', 1024),
            ('B', 1),
        ]
        for unit, mult in multipliers:
            if unit in value_str:
                try:
                    # Extract numeric value
                    num_str = value_str.replace(unit, '').strip()
                    num = float(num_str)
                    return int(num * mult)
                except ValueError:
                    return 0
        return 0

    lines = output.strip().split('\n')

    for line in lines:
        line_lower = line.lower().strip()
        if line_lower.startswith('total:'):
            total = parse_size_with_unit(line.split(':', 1)[1])
        elif line_lower.startswith('free:'):
            free = parse_size_with_unit(line.split(':', 1)[1])
        elif line_lower.startswith('used:'):
            used = parse_size_with_unit(line.split(':', 1)[1])

    # Available is approximately free (VyOS doesn't separate buffers/cache here)
    available = free
    usage_percent = round((used / total * 100), 1) if total > 0 else 0.0

    return MemoryMetrics(
        total_bytes=total,
        used_bytes=used,
        free_bytes=free,
        available_bytes=available,
        usage_percent=usage_percent,
        buffers_bytes=buffers,
        cached_bytes=cached
    )


def parse_disk_metrics(output: str) -> List[DiskMetrics]:
    """
    Parse VyOS 'show system storage' output.

    VyOS format:
    Filesystem: /dev/sda3
    Size:       110G
    Used:       2.3G (3%)
    Available:  102G (97%)
    """
    disks = []

    if not output:
        return disks

    def parse_size(size_str: str) -> int:
        """Convert size string to bytes."""
        size_str = size_str.upper().strip()
        # Remove any percentage info like "(3%)"
        size_str = re.sub(r'\s*\(\d+%\)', '', size_str)
        multipliers = {'K': 1024, 'M': 1024**2, 'G': 1024**3, 'T': 1024**4}

        for suffix, mult in multipliers.items():
            if suffix in size_str:
                try:
                    return int(float(size_str.replace(suffix, '').strip()) * mult)
                except ValueError:
                    return 0

        try:
            return int(size_str)
        except ValueError:
            return 0

    # Parse the key-value format
    lines = output.strip().split('\n')
    filesystem = ""
    total = 0
    used = 0
    available = 0
    usage_percent = 0.0

    for line in lines:
        line_stripped = line.strip()
        if ':' in line_stripped:
            key, value = line_stripped.split(':', 1)
            key = key.strip().lower()
            value = value.strip()

            if key == 'filesystem':
                # If we have previous data, save it before starting new
                if filesystem and total > 0:
                    disks.append(DiskMetrics(
                        filesystem=filesystem,
                        mount_point="/",  # VyOS doesn't show mount in this format
                        total_bytes=total,
                        used_bytes=used,
                        available_bytes=available,
                        usage_percent=usage_percent
                    ))
                filesystem = value
                total = used = available = 0
                usage_percent = 0.0
            elif key == 'size':
                total = parse_size(value)
            elif key == 'used':
                # Extract percentage from "2.3G (3%)"
                pct_match = re.search(r'\((\d+)%\)', value)
                if pct_match:
                    usage_percent = float(pct_match.group(1))
                used = parse_size(value)
            elif key == 'available':
                available = parse_size(value)

    # Don't forget the last filesystem
    if filesystem and total > 0:
        disks.append(DiskMetrics(
            filesystem=filesystem,
            mount_point="/",
            total_bytes=total,
            used_bytes=used,
            available_bytes=available,
            usage_percent=usage_percent
        ))

    return disks


def parse_uptime(output: str) -> str:
    """
    Parse VyOS 'show system uptime' output.

    VyOS format:
    Uptime: 1w 5d 18h 55m 30s

    Load averages:
    1  minute:   9.6%
    5  minutes:  7.1%
    15 minutes:  7.0%
    """
    if not output:
        return "Unknown"

    # Extract uptime from "Uptime: 1w 5d 18h 55m 30s" format
    match = re.search(r'Uptime:\s*(.+?)(?:\n|$)', output)
    if match:
        return match.group(1).strip()

    # Legacy format: "up 45 days, 3:21, 1 user"
    match = re.search(r'up\s+(.+?),\s+\d+\s+user', output)
    if match:
        return match.group(1).strip()

    return output.strip().split('\n')[0]


# ========================================================================
# Endpoints
# ========================================================================


@router.get("/system", response_model=SystemMetrics)
async def get_system_metrics(request: Request):
    """
    Get comprehensive system metrics from VyOS.

    Returns:
        CPU usage, memory usage, disk usage, and uptime
    """
    try:
        service = get_session_vyos_service(request)

        # Fetch all metrics in parallel would be ideal, but VyOS API is synchronous
        # Execute show commands sequentially

        # CPU metrics
        cpu_response = service.device.show(path=["system", "cpu"])
        cpu_output = ""
        if cpu_response.status == 200:
            if isinstance(cpu_response.result, dict) and "data" in cpu_response.result:
                cpu_output = cpu_response.result["data"]
            elif isinstance(cpu_response.result, str):
                cpu_output = cpu_response.result

        # Memory metrics
        mem_response = service.device.show(path=["system", "memory"])
        mem_output = ""
        if mem_response.status == 200:
            if isinstance(mem_response.result, dict) and "data" in mem_response.result:
                mem_output = mem_response.result["data"]
            elif isinstance(mem_response.result, str):
                mem_output = mem_response.result

        # Disk metrics
        disk_response = service.device.show(path=["system", "storage"])
        disk_output = ""
        if disk_response.status == 200:
            if isinstance(disk_response.result, dict) and "data" in disk_response.result:
                disk_output = disk_response.result["data"]
            elif isinstance(disk_response.result, str):
                disk_output = disk_response.result

        # Uptime
        uptime_response = service.device.show(path=["system", "uptime"])
        uptime_output = ""
        if uptime_response.status == 200:
            if isinstance(uptime_response.result, dict) and "data" in uptime_response.result:
                uptime_output = uptime_response.result["data"]
            elif isinstance(uptime_response.result, str):
                uptime_output = uptime_response.result

        return SystemMetrics(
            cpu=parse_cpu_metrics(cpu_output, uptime_output),  # Pass uptime for load averages
            memory=parse_memory_metrics(mem_output),
            disk=parse_disk_metrics(disk_output),
            uptime=parse_uptime(uptime_output),
            timestamp=datetime.utcnow()
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cpu", response_model=CPUMetrics)
async def get_cpu_metrics(request: Request):
    """Get CPU metrics from VyOS."""
    try:
        service = get_session_vyos_service(request)

        # Get CPU info
        cpu_response = service.device.show(path=["system", "cpu"])
        cpu_output = ""
        if cpu_response.status == 200:
            if isinstance(cpu_response.result, dict) and "data" in cpu_response.result:
                cpu_output = cpu_response.result["data"]
            elif isinstance(cpu_response.result, str):
                cpu_output = cpu_response.result

        # Get uptime for load averages
        uptime_response = service.device.show(path=["system", "uptime"])
        uptime_output = ""
        if uptime_response.status == 200:
            if isinstance(uptime_response.result, dict) and "data" in uptime_response.result:
                uptime_output = uptime_response.result["data"]
            elif isinstance(uptime_response.result, str):
                uptime_output = uptime_response.result

        return parse_cpu_metrics(cpu_output, uptime_output)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/memory", response_model=MemoryMetrics)
async def get_memory_metrics(request: Request):
    """Get memory metrics from VyOS."""
    try:
        service = get_session_vyos_service(request)

        response = service.device.show(path=["system", "memory"])

        if response.status != 200:
            raise HTTPException(
                status_code=500,
                detail=f"VyOS command failed: {response.error}"
            )

        output = ""
        if isinstance(response.result, dict) and "data" in response.result:
            output = response.result["data"]
        elif isinstance(response.result, str):
            output = response.result

        return parse_memory_metrics(output)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/disk", response_model=List[DiskMetrics])
async def get_disk_metrics(request: Request):
    """Get disk metrics from VyOS."""
    try:
        service = get_session_vyos_service(request)

        response = service.device.show(path=["system", "storage"])

        if response.status != 200:
            raise HTTPException(
                status_code=500,
                detail=f"VyOS command failed: {response.error}"
            )

        output = ""
        if isinstance(response.result, dict) and "data" in response.result:
            output = response.result["data"]
        elif isinstance(response.result, str):
            output = response.result

        return parse_disk_metrics(output)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
