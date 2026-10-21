"""Per-user table column layouts.

Visibility and order for tables that use the shared column hook. One JSON
object per account, keyed by the browser storage key (firewall-policies-columns,
and the same hook's other tables). Not per instance: the choice follows the
person onto the next router. Not shared: unlike firewall separators, another
operator must not see or replace this row.

The owner is always the session user. Callers cannot name a user id.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Dict, List
import json
import logging
import re
import uuid

import asyncpg

from org_scope import org_conn_self

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user", tags=["table_layouts"])

# Storage keys the hook already uses are lowercase with hyphens. Keep the
# charset tight so a path segment cannot be a nested jsonb path.
_KEY_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
_MAX_COLUMNS = 64


class ColumnLayoutBody(BaseModel):
    """One table's visible ids and full order. Both are column ids, not labels."""

    model_config = ConfigDict(extra="forbid")

    visible: List[str] = Field(..., max_length=_MAX_COLUMNS)
    order: List[str] = Field(..., max_length=_MAX_COLUMNS)

    @model_validator(mode="after")
    def coherent(self) -> "ColumnLayoutBody":
        for name, values in (("visible", self.visible), ("order", self.order)):
            if len(set(values)) != len(values):
                raise ValueError(f"duplicate column id in {name}")
            for item in values:
                if not _ID_RE.fullmatch(item):
                    raise ValueError(f"invalid column id in {name}")
        order_ids = set(self.order)
        if any(item not in order_ids for item in self.visible):
            raise ValueError("visible column is not in order")
        return self


class TableLayoutsResponse(BaseModel):
    layouts: Dict[str, ColumnLayoutBody]
    exists: bool


def _require_user_id(request: Request) -> str:
    user = getattr(request.state, "user", None)
    user_id = user.get("id") if isinstance(user, dict) else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id


def _require_key(key: str) -> str:
    if not _KEY_RE.fullmatch(key):
        raise HTTPException(status_code=422, detail="Invalid table layout key")
    return key


def _parse_layouts(raw) -> Dict[str, ColumnLayoutBody]:
    """Drop malformed keys instead of failing the whole read."""
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            return {}
    if not isinstance(raw, dict):
        return {}
    parsed: Dict[str, ColumnLayoutBody] = {}
    for key, value in raw.items():
        if not isinstance(key, str) or not _KEY_RE.fullmatch(key):
            continue
        if not isinstance(value, dict):
            continue
        try:
            parsed[key] = ColumnLayoutBody.model_validate(value)
        except ValueError:
            logger.warning("Ignoring malformed table layout key %s", key)
    return parsed


def _response(raw, exists: bool) -> TableLayoutsResponse:
    return TableLayoutsResponse(layouts=_parse_layouts(raw), exists=exists)


@router.get("/table-layouts", response_model=TableLayoutsResponse)
async def get_table_layouts(
    request: Request,
    conn: asyncpg.Connection = Depends(org_conn_self),
):
    """The signed-in user's layouts. Missing row is an empty set, not an error."""
    user_id = _require_user_id(request)
    try:
        row = await conn.fetchrow(
            'SELECT layouts FROM user_table_layouts WHERE "userId" = $1',
            user_id,
        )
    except Exception:
        logger.exception("Unable to read table layouts")
        raise HTTPException(status_code=500, detail="Unable to read table layouts")
    if row is None:
        return TableLayoutsResponse(layouts={}, exists=False)
    return _response(row["layouts"], exists=True)


@router.put("/table-layouts/{key}", response_model=TableLayoutsResponse)
async def save_table_layout(
    key: str,
    body: ColumnLayoutBody,
    request: Request,
    conn: asyncpg.Connection = Depends(org_conn_self),
):
    """Merge one table into the account row. Other tables on the row stay."""
    user_id = _require_user_id(request)
    key = _require_key(key)
    layout_json = json.dumps({"visible": body.visible, "order": body.order})
    try:
        row = await conn.fetchrow(
            """
            INSERT INTO user_table_layouts (id, "userId", layouts, "createdAt", "updatedAt")
            VALUES ($1, $2, jsonb_build_object($3::text, $4::jsonb), NOW(), NOW())
            ON CONFLICT ("userId") DO UPDATE
            SET layouts = user_table_layouts.layouts || jsonb_build_object($3::text, $4::jsonb),
                "updatedAt" = NOW()
            RETURNING layouts
            """,
            str(uuid.uuid4()),
            user_id,
            key,
            layout_json,
        )
    except Exception:
        logger.exception("Unable to save table layout")
        raise HTTPException(status_code=500, detail="Unable to save table layout")
    return _response(row["layouts"] if row else None, exists=row is not None)


@router.delete("/table-layouts/{key}", response_model=TableLayoutsResponse)
async def delete_table_layout(
    key: str,
    request: Request,
    conn: asyncpg.Connection = Depends(org_conn_self),
):
    """Remove one table. Reset to Default calls this so the other computer follows."""
    user_id = _require_user_id(request)
    key = _require_key(key)
    try:
        row = await conn.fetchrow(
            """
            UPDATE user_table_layouts
            SET layouts = layouts - $2,
                "updatedAt" = NOW()
            WHERE "userId" = $1
            RETURNING layouts
            """,
            user_id,
            key,
        )
    except Exception:
        logger.exception("Unable to delete table layout")
        raise HTTPException(status_code=500, detail="Unable to delete table layout")
    if row is None:
        return TableLayoutsResponse(layouts={}, exists=False)
    return _response(row["layouts"], exists=True)
