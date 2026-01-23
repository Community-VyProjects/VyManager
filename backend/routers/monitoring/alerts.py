"""
Alert Rules Router

API endpoints for managing alert rules.
Requires database connection for CRUD operations.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

router = APIRouter(prefix="/monitoring/alerts", tags=["monitoring"])


# ========================================================================
# Enums (matching Prisma schema)
# ========================================================================


class AlertType(str, Enum):
    INTERFACE_DOWN = "INTERFACE_DOWN"
    HIGH_CPU = "HIGH_CPU"
    HIGH_MEMORY = "HIGH_MEMORY"
    HIGH_DISK = "HIGH_DISK"
    CONNECTION_THRESHOLD = "CONNECTION_THRESHOLD"
    INTERFACE_ERRORS = "INTERFACE_ERRORS"


class AlertSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


# ========================================================================
# Pydantic Models
# ========================================================================


class AlertRuleBase(BaseModel):
    """Base alert rule fields."""
    name: str
    description: Optional[str] = None
    type: AlertType
    severity: AlertSeverity = AlertSeverity.WARNING
    conditions: Dict[str, Any]
    notifyInApp: bool = True
    webhookUrl: Optional[str] = None
    telegramChatId: Optional[str] = None
    telegramBotToken: Optional[str] = None
    cooldownSeconds: int = 300


class CreateAlertRuleRequest(AlertRuleBase):
    """Request to create a new alert rule."""
    pass


class UpdateAlertRuleRequest(BaseModel):
    """Request to update an existing alert rule."""
    name: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[AlertSeverity] = None
    enabled: Optional[bool] = None
    conditions: Optional[Dict[str, Any]] = None
    notifyInApp: Optional[bool] = None
    webhookUrl: Optional[str] = None
    telegramChatId: Optional[str] = None
    telegramBotToken: Optional[str] = None
    cooldownSeconds: Optional[int] = None


class AlertRuleResponse(AlertRuleBase):
    """Alert rule response."""
    id: str
    instanceId: str
    enabled: bool
    createdBy: str
    createdAt: datetime
    updatedAt: datetime
    lastTriggeredAt: Optional[datetime] = None
    hasTelegram: bool = False  # Indicates if Telegram is configured (without exposing token)


class AlertRulesListResponse(BaseModel):
    """Response containing list of alert rules."""
    rules: List[AlertRuleResponse]
    total: int


class AlertHistoryItem(BaseModel):
    """A single alert history entry."""
    id: str
    ruleId: str
    ruleName: Optional[str] = None
    instanceId: str
    type: AlertType
    severity: AlertSeverity
    message: str
    details: Optional[Dict[str, Any]] = None
    acknowledged: bool
    acknowledgedBy: Optional[str] = None
    acknowledgedAt: Optional[datetime] = None
    resolved: bool
    resolvedAt: Optional[datetime] = None
    triggeredAt: datetime


class AlertHistoryResponse(BaseModel):
    """Response containing alert history."""
    alerts: List[AlertHistoryItem]
    total: int
    unacknowledgedCount: int


class ActiveAlertsResponse(BaseModel):
    """Response containing active alert counts."""
    count: int
    criticalCount: int
    warningCount: int


# ========================================================================
# Helper Functions
# ========================================================================


def get_instance_id(request: Request) -> str:
    """Get the instance ID from the active session."""
    if hasattr(request.state, 'instance') and request.state.instance:
        return request.state.instance.get('id')
    raise HTTPException(status_code=400, detail="No active VyOS session")


def get_user_id(request: Request) -> str:
    """Get the user ID from the request."""
    if hasattr(request.state, 'user') and request.state.user:
        return request.state.user.get('id')
    raise HTTPException(status_code=401, detail="Unauthorized")


async def get_db_pool(request: Request):
    """Get the database connection pool."""
    if hasattr(request.app.state, 'db_pool') and request.app.state.db_pool:
        return request.app.state.db_pool
    raise HTTPException(status_code=500, detail="Database not available")


# ========================================================================
# Alert Rules CRUD Endpoints
# ========================================================================


@router.get("/rules", response_model=AlertRulesListResponse)
async def get_alert_rules(request: Request):
    """Get all alert rules for the current instance."""
    try:
        instance_id = get_instance_id(request)
        pool = await get_db_pool(request)

        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, "instanceId", name, description, type, severity, enabled,
                       conditions, "notifyInApp", "webhookUrl", "telegramChatId",
                       "telegramBotToken", "cooldownSeconds",
                       "lastTriggeredAt", "createdBy", "createdAt", "updatedAt"
                FROM alert_rules
                WHERE "instanceId" = $1
                ORDER BY "createdAt" DESC
                """,
                instance_id
            )

            rules = []
            for row in rows:
                rules.append(AlertRuleResponse(
                    id=row['id'],
                    instanceId=row['instanceId'],
                    name=row['name'],
                    description=row['description'],
                    type=AlertType(row['type']),
                    severity=AlertSeverity(row['severity']),
                    enabled=row['enabled'],
                    conditions=row['conditions'],
                    notifyInApp=row['notifyInApp'],
                    webhookUrl=row['webhookUrl'],
                    telegramChatId=row['telegramChatId'],
                    telegramBotToken=None,  # Don't expose token
                    cooldownSeconds=row['cooldownSeconds'],
                    lastTriggeredAt=row['lastTriggeredAt'],
                    createdBy=row['createdBy'],
                    createdAt=row['createdAt'],
                    updatedAt=row['updatedAt'],
                    hasTelegram=bool(row['telegramChatId'] and row['telegramBotToken'])
                ))

            return AlertRulesListResponse(rules=rules, total=len(rules))

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rules", response_model=AlertRuleResponse)
async def create_alert_rule(request: Request, data: CreateAlertRuleRequest):
    """Create a new alert rule."""
    import json

    try:
        instance_id = get_instance_id(request)
        user_id = get_user_id(request)
        pool = await get_db_pool(request)

        async with pool.acquire() as conn:
            # Generate a unique ID
            import uuid
            rule_id = str(uuid.uuid4())[:25]  # cuid-like

            now = datetime.utcnow()

            row = await conn.fetchrow(
                """
                INSERT INTO alert_rules (
                    id, "instanceId", name, description, type, severity, enabled,
                    conditions, "notifyInApp", "webhookUrl", "telegramChatId",
                    "telegramBotToken", "cooldownSeconds",
                    "createdBy", "createdAt", "updatedAt"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING id, "instanceId", name, description, type, severity, enabled,
                          conditions, "notifyInApp", "webhookUrl", "telegramChatId",
                          "telegramBotToken", "cooldownSeconds",
                          "lastTriggeredAt", "createdBy", "createdAt", "updatedAt"
                """,
                rule_id, instance_id, data.name, data.description,
                data.type.value, data.severity.value, True,
                json.dumps(data.conditions), data.notifyInApp, data.webhookUrl,
                data.telegramChatId, data.telegramBotToken,
                data.cooldownSeconds, user_id, now, now
            )

            return AlertRuleResponse(
                id=row['id'],
                instanceId=row['instanceId'],
                name=row['name'],
                description=row['description'],
                type=AlertType(row['type']),
                severity=AlertSeverity(row['severity']),
                enabled=row['enabled'],
                conditions=row['conditions'] if isinstance(row['conditions'], dict) else json.loads(row['conditions']),
                notifyInApp=row['notifyInApp'],
                webhookUrl=row['webhookUrl'],
                telegramChatId=row['telegramChatId'],
                telegramBotToken=None,  # Don't expose token
                cooldownSeconds=row['cooldownSeconds'],
                lastTriggeredAt=row['lastTriggeredAt'],
                createdBy=row['createdBy'],
                createdAt=row['createdAt'],
                updatedAt=row['updatedAt'],
                hasTelegram=bool(row['telegramChatId'] and row['telegramBotToken'])
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/rules/{rule_id}", response_model=AlertRuleResponse)
async def update_alert_rule(
    request: Request,
    rule_id: str,
    data: UpdateAlertRuleRequest
):
    """Update an existing alert rule."""
    import json

    try:
        instance_id = get_instance_id(request)
        pool = await get_db_pool(request)

        async with pool.acquire() as conn:
            # Verify rule exists and belongs to instance
            existing = await conn.fetchrow(
                'SELECT id FROM alert_rules WHERE id = $1 AND "instanceId" = $2',
                rule_id, instance_id
            )
            if not existing:
                raise HTTPException(status_code=404, detail="Alert rule not found")

            # Build update query dynamically
            updates = []
            values = []
            param_idx = 1

            if data.name is not None:
                updates.append(f'name = ${param_idx}')
                values.append(data.name)
                param_idx += 1

            if data.description is not None:
                updates.append(f'description = ${param_idx}')
                values.append(data.description)
                param_idx += 1

            if data.severity is not None:
                updates.append(f'severity = ${param_idx}')
                values.append(data.severity.value)
                param_idx += 1

            if data.enabled is not None:
                updates.append(f'enabled = ${param_idx}')
                values.append(data.enabled)
                param_idx += 1

            if data.conditions is not None:
                updates.append(f'conditions = ${param_idx}')
                values.append(json.dumps(data.conditions))
                param_idx += 1

            if data.notifyInApp is not None:
                updates.append(f'"notifyInApp" = ${param_idx}')
                values.append(data.notifyInApp)
                param_idx += 1

            if data.webhookUrl is not None:
                updates.append(f'"webhookUrl" = ${param_idx}')
                values.append(data.webhookUrl)
                param_idx += 1

            if data.telegramChatId is not None:
                updates.append(f'"telegramChatId" = ${param_idx}')
                values.append(data.telegramChatId)
                param_idx += 1

            if data.telegramBotToken is not None:
                updates.append(f'"telegramBotToken" = ${param_idx}')
                values.append(data.telegramBotToken)
                param_idx += 1

            if data.cooldownSeconds is not None:
                updates.append(f'"cooldownSeconds" = ${param_idx}')
                values.append(data.cooldownSeconds)
                param_idx += 1

            if not updates:
                raise HTTPException(status_code=400, detail="No fields to update")

            # Add updatedAt
            updates.append(f'"updatedAt" = ${param_idx}')
            values.append(datetime.utcnow())
            param_idx += 1

            # Add rule_id for WHERE clause
            values.append(rule_id)

            query = f"""
                UPDATE alert_rules
                SET {', '.join(updates)}
                WHERE id = ${param_idx}
                RETURNING id, "instanceId", name, description, type, severity, enabled,
                          conditions, "notifyInApp", "webhookUrl", "telegramChatId",
                          "telegramBotToken", "cooldownSeconds",
                          "lastTriggeredAt", "createdBy", "createdAt", "updatedAt"
            """

            row = await conn.fetchrow(query, *values)

            return AlertRuleResponse(
                id=row['id'],
                instanceId=row['instanceId'],
                name=row['name'],
                description=row['description'],
                type=AlertType(row['type']),
                severity=AlertSeverity(row['severity']),
                enabled=row['enabled'],
                conditions=row['conditions'] if isinstance(row['conditions'], dict) else json.loads(row['conditions']),
                notifyInApp=row['notifyInApp'],
                webhookUrl=row['webhookUrl'],
                telegramChatId=row['telegramChatId'],
                telegramBotToken=None,  # Don't expose token
                cooldownSeconds=row['cooldownSeconds'],
                lastTriggeredAt=row['lastTriggeredAt'],
                createdBy=row['createdBy'],
                createdAt=row['createdAt'],
                updatedAt=row['updatedAt'],
                hasTelegram=bool(row['telegramChatId'] and row['telegramBotToken'])
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/rules/{rule_id}")
async def delete_alert_rule(request: Request, rule_id: str):
    """Delete an alert rule."""
    try:
        instance_id = get_instance_id(request)
        pool = await get_db_pool(request)

        async with pool.acquire() as conn:
            result = await conn.execute(
                'DELETE FROM alert_rules WHERE id = $1 AND "instanceId" = $2',
                rule_id, instance_id
            )

            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="Alert rule not found")

            return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========================================================================
# Alert History Endpoints
# ========================================================================


@router.get("/history", response_model=AlertHistoryResponse)
async def get_alert_history(
    request: Request,
    limit: int = 50,
    offset: int = 0,
    acknowledged: Optional[bool] = None,
    severity: Optional[AlertSeverity] = None
):
    """Get alert history for the current instance."""
    import json

    try:
        instance_id = get_instance_id(request)
        pool = await get_db_pool(request)

        async with pool.acquire() as conn:
            # Build query with filters
            where_clauses = ['"instanceId" = $1']
            values = [instance_id]
            param_idx = 2

            if acknowledged is not None:
                where_clauses.append(f'acknowledged = ${param_idx}')
                values.append(acknowledged)
                param_idx += 1

            if severity is not None:
                where_clauses.append(f'severity = ${param_idx}')
                values.append(severity.value)
                param_idx += 1

            where_sql = ' AND '.join(where_clauses)

            # Get total count
            count_row = await conn.fetchrow(
                f'SELECT COUNT(*) as count FROM alert_history WHERE {where_sql}',
                *values
            )
            total = count_row['count']

            # Get unacknowledged count
            unack_row = await conn.fetchrow(
                'SELECT COUNT(*) as count FROM alert_history WHERE "instanceId" = $1 AND acknowledged = false',
                instance_id
            )
            unacknowledged_count = unack_row['count']

            # Get paginated results with rule name
            values.extend([limit, offset])
            rows = await conn.fetch(
                f"""
                SELECT ah.id, ah."ruleId", ah."instanceId", ah.type, ah.severity,
                       ah.message, ah.details, ah.acknowledged, ah."acknowledgedBy",
                       ah."acknowledgedAt", ah.resolved, ah."resolvedAt", ah."triggeredAt",
                       ar.name as "ruleName"
                FROM alert_history ah
                LEFT JOIN alert_rules ar ON ah."ruleId" = ar.id
                WHERE {where_sql}
                ORDER BY ah."triggeredAt" DESC
                LIMIT ${param_idx} OFFSET ${param_idx + 1}
                """,
                *values
            )

            alerts = []
            for row in rows:
                details = row['details']
                if details and isinstance(details, str):
                    details = json.loads(details)

                alerts.append(AlertHistoryItem(
                    id=row['id'],
                    ruleId=row['ruleId'],
                    ruleName=row['ruleName'],
                    instanceId=row['instanceId'],
                    type=AlertType(row['type']),
                    severity=AlertSeverity(row['severity']),
                    message=row['message'],
                    details=details,
                    acknowledged=row['acknowledged'],
                    acknowledgedBy=row['acknowledgedBy'],
                    acknowledgedAt=row['acknowledgedAt'],
                    resolved=row['resolved'],
                    resolvedAt=row['resolvedAt'],
                    triggeredAt=row['triggeredAt']
                ))

            return AlertHistoryResponse(
                alerts=alerts,
                total=total,
                unacknowledgedCount=unacknowledged_count
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/history/{alert_id}/acknowledge")
async def acknowledge_alert(request: Request, alert_id: str):
    """Acknowledge an alert."""
    try:
        instance_id = get_instance_id(request)
        user_id = get_user_id(request)
        pool = await get_db_pool(request)

        async with pool.acquire() as conn:
            result = await conn.execute(
                """
                UPDATE alert_history
                SET acknowledged = true, "acknowledgedBy" = $1, "acknowledgedAt" = $2
                WHERE id = $3 AND "instanceId" = $4
                """,
                user_id, datetime.utcnow(), alert_id, instance_id
            )

            if result == "UPDATE 0":
                raise HTTPException(status_code=404, detail="Alert not found")

            return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/active", response_model=ActiveAlertsResponse)
async def get_active_alerts(request: Request):
    """Get count of active (unacknowledged) alerts."""
    try:
        instance_id = get_instance_id(request)
        pool = await get_db_pool(request)

        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical,
                    COUNT(*) FILTER (WHERE severity = 'WARNING') as warning
                FROM alert_history
                WHERE "instanceId" = $1 AND acknowledged = false
                """,
                instance_id
            )

            return ActiveAlertsResponse(
                count=row['total'],
                criticalCount=row['critical'],
                warningCount=row['warning']
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========================================================================
# Notification Test Endpoints
# ========================================================================


class TestNotificationRequest(BaseModel):
    """Request to test notification."""
    webhook_url: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_bot_token: Optional[str] = None


class TestNotificationResponse(BaseModel):
    """Response from notification test."""
    success: bool
    message: str


@router.post("/test-notification", response_model=TestNotificationResponse)
async def test_notification(request: Request, data: TestNotificationRequest):
    """
    Test notification delivery to webhook or Telegram.

    At least one notification channel must be provided.
    """
    from services.notification import notification_service

    try:
        if data.webhook_url:
            result = await notification_service.test_webhook(data.webhook_url)
            return TestNotificationResponse(**result)

        if data.telegram_chat_id and data.telegram_bot_token:
            result = await notification_service.test_telegram(
                data.telegram_chat_id,
                data.telegram_bot_token
            )
            return TestNotificationResponse(**result)

        raise HTTPException(
            status_code=400,
            detail="Provide either webhook_url or both telegram_chat_id and telegram_bot_token"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
