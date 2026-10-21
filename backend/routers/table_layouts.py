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
from datetime import datetime, timezone
from typing import Dict, List, Optional
import json
import logging
import re
import uuid

import asyncpg

from fastapi_permissions import reject_read_only_token
from org_scope import org_conn_self

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user", tags=["table_layouts"])

# The shared column hook's storage keys. A free-form key would let one
# account grow this JSON without a bound.
ALLOWED_LAYOUT_KEYS = frozenset({
    "firewall-policies-columns",
    "firewall-bridge-columns",
    "pppoe-session-columns",
})
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


class SaveTableLayoutBody(ColumnLayoutBody):
    """Write body. basedOn is the revision last read, not stored in the row."""

    basedOn: Optional[str] = None


class TableLayoutsResponse(BaseModel):
    layouts: Dict[str, ColumnLayoutBody]
    revisions: Dict[str, str] = {}
    exists: bool
    updatedAt: Optional[str] = None


def _require_user_id(request: Request) -> str:
    user = getattr(request.state, "user", None)
    user_id = user.get("id") if isinstance(user, dict) else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id


def _require_key(key: str) -> str:
    if key not in ALLOWED_LAYOUT_KEYS:
        raise HTTPException(status_code=422, detail="Invalid table layout key")
    return key


def _iso(value) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _revision_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def _as_layout_dict(raw):
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            return None
    return raw if isinstance(raw, dict) else None


def _key_revision(raw_layouts, key: str) -> Optional[str]:
    layouts = _as_layout_dict(raw_layouts)
    if layouts is None:
        return None
    value = layouts.get(key)
    value = _as_layout_dict(value)
    if value is None:
        return None
    revision = value.get("updatedAt")
    return revision if isinstance(revision, str) and revision else None


def _revisions(raw) -> Dict[str, str]:
    layouts = _as_layout_dict(raw)
    if layouts is None:
        return {}
    found: Dict[str, str] = {}
    for key in layouts:
        if not isinstance(key, str) or key not in ALLOWED_LAYOUT_KEYS:
            continue
        revision = _key_revision(layouts, key)
        if revision:
            found[key] = revision
    return found


def _shown_to_client(raw, key: str) -> bool:
    """A key the read omitted has no revision the client can send back."""
    return key in _parse_layouts(raw) and _key_revision(raw, key) is not None


def _conflict(raw, updated_at) -> dict:
    return {
        "layouts": {key: layout.model_dump() for key, layout in _parse_layouts(raw).items()},
        "revisions": _revisions(raw),
        "exists": True,
        "updatedAt": _iso(updated_at),
    }


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
        if not isinstance(key, str) or key not in ALLOWED_LAYOUT_KEYS:
            continue
        if not isinstance(value, dict):
            continue
        body = {field: value[field] for field in ("visible", "order") if field in value}
        try:
            parsed[key] = ColumnLayoutBody.model_validate(body)
        except ValueError:
            logger.warning("Ignoring malformed table layout key %s", key)
    return parsed


def _response(raw, exists: bool, updated_at=None) -> TableLayoutsResponse:
    return TableLayoutsResponse(
        layouts=_parse_layouts(raw),
        revisions=_revisions(raw),
        exists=exists,
        updatedAt=_iso(updated_at),
    )


@router.get("/table-layouts", response_model=TableLayoutsResponse)
async def get_table_layouts(
    request: Request,
    conn: asyncpg.Connection = Depends(org_conn_self),
):
    """The signed-in user's layouts. Missing row is an empty set, not an error."""
    user_id = _require_user_id(request)
    try:
        row = await conn.fetchrow(
            'SELECT layouts, "updatedAt" FROM user_table_layouts WHERE "userId" = $1',
            user_id,
        )
    except Exception:
        logger.exception("Unable to read table layouts")
        raise HTTPException(status_code=500, detail="Unable to read table layouts")
    if row is None:
        return TableLayoutsResponse(layouts={}, exists=False, updatedAt=None)
    return _response(row["layouts"], exists=True, updated_at=row["updatedAt"])


@router.put("/table-layouts/{key}", response_model=TableLayoutsResponse)
async def save_table_layout(
    key: str,
    body: SaveTableLayoutBody,
    request: Request,
    asUser: Optional[str] = None,
    basedOn: Optional[str] = None,
    conn: asyncpg.Connection = Depends(org_conn_self),
):
    """Merge one table into the account row. Other tables on the row stay."""
    user_id = _require_user_id(request)
    if asUser is not None and asUser != user_id:
        raise HTTPException(status_code=403, detail="Signed-in user changed")
    reject_read_only_token(request)
    key = _require_key(key)
    claimed = basedOn or body.basedOn
    revision = _revision_now()
    layout_json = json.dumps({
        "visible": body.visible,
        "order": body.order,
        "updatedAt": revision,
    })
    try:
        existing = await conn.fetchrow(
            'SELECT layouts, "updatedAt" FROM user_table_layouts WHERE "userId" = $1',
            user_id,
        )
        if existing is None:
            row = await conn.fetchrow(
                """
                INSERT INTO user_table_layouts (id, "userId", layouts, "createdAt", "updatedAt")
                VALUES ($1, $2, jsonb_build_object($3::text, $4::jsonb), NOW(), NOW())
                ON CONFLICT ("userId") DO NOTHING
                RETURNING layouts, "updatedAt"
                """,
                str(uuid.uuid4()),
                user_id,
                key,
                layout_json,
            )
            if row is None:
                raced = await conn.fetchrow(
                    'SELECT layouts, "updatedAt" FROM user_table_layouts WHERE "userId" = $1',
                    user_id,
                )
                raced_layouts = _as_layout_dict(raced["layouts"]) if raced else None
                if raced is not None and key not in (raced_layouts or {}):
                    row = await conn.fetchrow(
                        """
                        UPDATE user_table_layouts
                        SET layouts = layouts || jsonb_build_object($2::text, $3::jsonb),
                            "updatedAt" = NOW()
                        WHERE "userId" = $1 AND NOT (layouts ? $2)
                        RETURNING layouts, "updatedAt"
                        """,
                        user_id,
                        key,
                        layout_json,
                    )
                if row is None:
                    current = await conn.fetchrow(
                        'SELECT layouts, "updatedAt" FROM user_table_layouts WHERE "userId" = $1',
                        user_id,
                    )
                    raise HTTPException(
                        status_code=409,
                        detail=_conflict(
                            current["layouts"] if current else None,
                            current["updatedAt"] if current else None,
                        ),
                    )
        else:
            layouts = _as_layout_dict(existing["layouts"]) or {}
            stored = _key_revision(layouts, key)
            shown = _shown_to_client(existing["layouts"], key)
            if shown and stored != claimed:
                raise HTTPException(
                    status_code=409,
                    detail=_conflict(existing["layouts"], existing["updatedAt"]),
                )
            if shown:
                row = await conn.fetchrow(
                    """
                    UPDATE user_table_layouts
                    SET layouts = layouts || jsonb_build_object($2::text, $3::jsonb),
                        "updatedAt" = NOW()
                    WHERE "userId" = $1 AND layouts->$2->>'updatedAt' = $4
                    RETURNING layouts, "updatedAt"
                    """,
                    user_id,
                    key,
                    layout_json,
                    claimed,
                )
            elif key in layouts:
                row = await conn.fetchrow(
                    """
                    UPDATE user_table_layouts
                    SET layouts = layouts || jsonb_build_object($2::text, $3::jsonb),
                        "updatedAt" = NOW()
                    WHERE "userId" = $1 AND layouts->$2 = $4::jsonb
                    RETURNING layouts, "updatedAt"
                    """,
                    user_id,
                    key,
                    layout_json,
                    json.dumps(layouts[key]),
                )
            else:
                row = await conn.fetchrow(
                    """
                    UPDATE user_table_layouts
                    SET layouts = layouts || jsonb_build_object($2::text, $3::jsonb),
                        "updatedAt" = NOW()
                    WHERE "userId" = $1 AND NOT (layouts ? $2)
                    RETURNING layouts, "updatedAt"
                    """,
                    user_id,
                    key,
                    layout_json,
                )
            if row is None:
                raced = await conn.fetchrow(
                    'SELECT layouts, "updatedAt" FROM user_table_layouts WHERE "userId" = $1',
                    user_id,
                )
                raise HTTPException(
                    status_code=409,
                    detail=_conflict(raced["layouts"] if raced else None, raced["updatedAt"] if raced else None),
                )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unable to save table layout")
        raise HTTPException(status_code=500, detail="Unable to save table layout")
    return _response(row["layouts"], exists=True, updated_at=row["updatedAt"])


@router.delete("/table-layouts/{key}", response_model=TableLayoutsResponse)
async def delete_table_layout(
    key: str,
    request: Request,
    basedOn: Optional[str] = None,
    asUser: Optional[str] = None,
    conn: asyncpg.Connection = Depends(org_conn_self),
):
    """Remove one table. Reset to Default calls this so the other computer follows."""
    user_id = _require_user_id(request)
    if asUser is not None and asUser != user_id:
        raise HTTPException(status_code=403, detail="Signed-in user changed")
    reject_read_only_token(request)
    key = _require_key(key)
    try:
        existing = await conn.fetchrow(
            'SELECT layouts, "updatedAt" FROM user_table_layouts WHERE "userId" = $1',
            user_id,
        )
        if existing is None:
            return TableLayoutsResponse(layouts={}, exists=False, updatedAt=None)
        layouts = _as_layout_dict(existing["layouts"]) or {}
        if key not in layouts:
            return _response(existing["layouts"], exists=True, updated_at=existing["updatedAt"])
        if not _shown_to_client(existing["layouts"], key):
            row = await conn.fetchrow(
                """
                UPDATE user_table_layouts
                SET layouts = layouts - $2,
                    "updatedAt" = NOW()
                WHERE "userId" = $1 AND layouts->$2 = $3::jsonb
                RETURNING layouts, "updatedAt"
                """,
                user_id,
                key,
                json.dumps(layouts[key]),
            )
            if row is None:
                raced = await conn.fetchrow(
                    'SELECT layouts, "updatedAt" FROM user_table_layouts WHERE "userId" = $1',
                    user_id,
                )
                raise HTTPException(
                    status_code=409,
                    detail=_conflict(
                        raced["layouts"] if raced else None,
                        raced["updatedAt"] if raced else None,
                    ),
                )
            return _response(row["layouts"], exists=True, updated_at=row["updatedAt"])
        stored = _key_revision(existing["layouts"], key)
        if not (stored and stored == basedOn):
            raise HTTPException(
                status_code=409,
                detail=_conflict(existing["layouts"], existing["updatedAt"]),
            )
        row = await conn.fetchrow(
            """
            UPDATE user_table_layouts
            SET layouts = layouts - $2,
                "updatedAt" = NOW()
            WHERE "userId" = $1 AND layouts->$2->>'updatedAt' = $3
            RETURNING layouts, "updatedAt"
            """,
            user_id,
            key,
            basedOn,
        )
        if row is None:
            raced = await conn.fetchrow(
                'SELECT layouts, "updatedAt" FROM user_table_layouts WHERE "userId" = $1',
                user_id,
            )
            raise HTTPException(
                status_code=409,
                detail=_conflict(
                    raced["layouts"] if raced else None,
                    raced["updatedAt"] if raced else None,
                ),
            )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unable to delete table layout")
        raise HTTPException(status_code=500, detail="Unable to delete table layout")
    return _response(row["layouts"], exists=True, updated_at=row["updatedAt"])
