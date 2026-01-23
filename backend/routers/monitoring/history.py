"""
Metrics History Router

API endpoints for querying historical metrics data.
Uses session-based architecture - VyOS instance comes from user's active session.
"""

from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime, timedelta, timezone
from enum import Enum

router = APIRouter(prefix="/monitoring/history", tags=["monitoring"])


# ========================================================================
# Pydantic Models
# ========================================================================


class MetricType(str, Enum):
    CPU = "CPU"
    MEMORY = "MEMORY"
    DISK = "DISK"
    INTERFACE_RX = "INTERFACE_RX"
    INTERFACE_TX = "INTERFACE_TX"
    CONNTRACK = "CONNTRACK"


class MetricDataPoint(BaseModel):
    """A single metric data point."""
    timestamp: datetime
    value: float
    name: Optional[str] = None


class MetricsSeries(BaseModel):
    """A series of metric data points."""
    type: MetricType
    name: Optional[str] = None
    data: List[MetricDataPoint]


class MetricsHistoryResponse(BaseModel):
    """Response containing historical metrics."""
    series: List[MetricsSeries]
    start_time: datetime
    end_time: datetime
    interval_seconds: int


class MetricsSummary(BaseModel):
    """Summary statistics for a metric."""
    type: MetricType
    name: Optional[str] = None
    min_value: float
    max_value: float
    avg_value: float
    current_value: Optional[float] = None
    data_points: int


class MetricsSummaryResponse(BaseModel):
    """Response containing metrics summaries."""
    summaries: List[MetricsSummary]
    period_hours: int


# ========================================================================
# Helper Functions
# ========================================================================


def get_instance_id(request: Request) -> str:
    """Get the instance ID from the active session."""
    if hasattr(request.state, 'instance') and request.state.instance:
        return request.state.instance.get('id')
    raise HTTPException(status_code=400, detail="No active VyOS session")


async def get_db_pool(request: Request):
    """Get the database connection pool."""
    if hasattr(request.app.state, 'db_pool') and request.app.state.db_pool:
        return request.app.state.db_pool
    raise HTTPException(status_code=500, detail="Database not available")


# ========================================================================
# Endpoints
# ========================================================================


@router.get("", response_model=MetricsHistoryResponse)
async def get_metrics_history(
    request: Request,
    metric_type: MetricType = Query(..., description="Type of metric to retrieve"),
    name: Optional[str] = Query(None, description="Name filter (interface name, mount point)"),
    hours: int = Query(24, ge=1, le=168, description="Hours of history to retrieve (1-168)"),
    interval: int = Query(60, ge=60, le=3600, description="Aggregation interval in seconds")
):
    """
    Get historical metrics data for graphing.

    Args:
        metric_type: The type of metric (CPU, MEMORY, DISK, INTERFACE_RX, INTERFACE_TX, CONNTRACK)
        name: Optional name filter (e.g., interface name, mount point)
        hours: Number of hours of history to retrieve (default 24, max 168/7 days)
        interval: Aggregation interval in seconds (default 60, min 60, max 3600)

    Returns:
        Time series data suitable for graphing
    """
    try:
        instance_id = get_instance_id(request)
        pool = await get_db_pool(request)

        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(hours=hours)

        async with pool.acquire() as conn:
            # Build query with optional name filter
            query = """
                SELECT
                    date_trunc('minute', timestamp) as bucket,
                    AVG(value) as avg_value,
                    name
                FROM metrics_history
                WHERE "instanceId" = $1
                  AND type = $2
                  AND timestamp >= $3
                  AND timestamp <= $4
            """
            params = [instance_id, metric_type.value, start_time, end_time]

            if name:
                query += " AND name = $5"
                params.append(name)

            query += """
                GROUP BY bucket, name
                ORDER BY bucket ASC
            """

            rows = await conn.fetch(query, *params)

            # Group by name
            series_map: dict = {}
            for row in rows:
                series_name = row['name']
                if series_name not in series_map:
                    series_map[series_name] = []
                series_map[series_name].append(
                    MetricDataPoint(
                        timestamp=row['bucket'],
                        value=row['avg_value'],
                        name=series_name
                    )
                )

            # Convert to response format
            series = []
            for series_name, data_points in series_map.items():
                series.append(MetricsSeries(
                    type=metric_type,
                    name=series_name,
                    data=data_points
                ))

            # If no name-based grouping, create a single series
            if not series and rows:
                series = [MetricsSeries(
                    type=metric_type,
                    name=None,
                    data=[
                        MetricDataPoint(timestamp=row['bucket'], value=row['avg_value'])
                        for row in rows
                    ]
                )]

            return MetricsHistoryResponse(
                series=series,
                start_time=start_time,
                end_time=end_time,
                interval_seconds=interval
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary", response_model=MetricsSummaryResponse)
async def get_metrics_summary(
    request: Request,
    hours: int = Query(24, ge=1, le=168, description="Hours to summarize")
):
    """
    Get summary statistics for all metrics over the specified period.

    Returns min, max, avg values for each metric type.
    """
    try:
        instance_id = get_instance_id(request)
        pool = await get_db_pool(request)

        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(hours=hours)

        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    type,
                    name,
                    MIN(value) as min_value,
                    MAX(value) as max_value,
                    AVG(value) as avg_value,
                    COUNT(*) as data_points
                FROM metrics_history
                WHERE "instanceId" = $1
                  AND timestamp >= $2
                  AND timestamp <= $3
                GROUP BY type, name
                ORDER BY type, name
                """,
                instance_id, start_time, end_time
            )

            # Get current values (most recent)
            current_values = {}
            current_rows = await conn.fetch(
                """
                SELECT DISTINCT ON (type, name)
                    type,
                    name,
                    value
                FROM metrics_history
                WHERE "instanceId" = $1
                ORDER BY type, name, timestamp DESC
                """,
                instance_id
            )
            for row in current_rows:
                key = (row['type'], row['name'])
                current_values[key] = row['value']

            summaries = []
            for row in rows:
                key = (row['type'], row['name'])
                summaries.append(MetricsSummary(
                    type=MetricType(row['type']),
                    name=row['name'],
                    min_value=row['min_value'],
                    max_value=row['max_value'],
                    avg_value=row['avg_value'],
                    current_value=current_values.get(key),
                    data_points=row['data_points']
                ))

            return MetricsSummaryResponse(
                summaries=summaries,
                period_hours=hours
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/interfaces")
async def get_available_interfaces(request: Request):
    """
    Get list of interfaces that have historical data.
    """
    try:
        instance_id = get_instance_id(request)
        pool = await get_db_pool(request)

        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT DISTINCT name
                FROM metrics_history
                WHERE "instanceId" = $1
                  AND type IN ('INTERFACE_RX', 'INTERFACE_TX')
                  AND name IS NOT NULL
                ORDER BY name
                """,
                instance_id
            )

            return {"interfaces": [row['name'] for row in rows]}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/cleanup")
async def cleanup_old_metrics(
    request: Request,
    retention_days: int = Query(7, ge=1, le=90, description="Keep data for this many days")
):
    """
    Delete metrics older than the specified retention period.
    """
    try:
        instance_id = get_instance_id(request)
        pool = await get_db_pool(request)

        cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)

        async with pool.acquire() as conn:
            result = await conn.execute(
                """
                DELETE FROM metrics_history
                WHERE "instanceId" = $1 AND timestamp < $2
                """,
                instance_id, cutoff
            )

            # Parse the result to get count
            deleted_count = int(result.split()[-1]) if result else 0

            return {
                "success": True,
                "deleted_count": deleted_count,
                "cutoff_date": cutoff.isoformat()
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
