"""
Console Router

Provides an interactive SSH PTY shell console for VyOS devices.

Architecture:
  Browser <--WebSocket--> FastAPI <--SSH PTY (asyncssh)--> VyOS Device

WebSocket protocol:
  Client → Server:
    {"type": "input", "data": "<text>"}          — raw keystrokes / stdin
    {"type": "resize", "cols": N, "rows": N}      — terminal resize

  Server → Client:
    {"type": "output", "data": "<text>"}        — PTY stdout/stderr
    {"type": "connected"}                       — SSH session ready
    {"type": "error", "message": "..."}         — fatal error (connection closed)
    {"type": "disconnected", "reason": "..."}  — session ended normally
"""

import asyncio
import logging
import os
from datetime import datetime
from typing import Optional

import asyncpg
import asyncssh
from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from fastapi_permissions import require_read_permission
from org_scope import request_scoped_conn
from rbac_permissions import FeatureGroup, PermissionLevel, check_permission
from session_cookie import verify_session_cookie
from ssh_key_manager import decrypt_private_key

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/console", tags=["console"])

# Active console sessions: user_id -> asyncio.Task
_active_console_sessions: dict[str, asyncio.Task] = {}

IDLE_TIMEOUT_SECONDS = 600    # 10 minutes of inactivity disconnects the session
MAX_DURATION_SECONDS = 14400  # 4 hour hard cap

DEFAULT_COLS = 220
DEFAULT_ROWS = 50
MAX_COLS = 500
MAX_ROWS = 500

# Defense against Cross-Site WebSocket Hijacking: only accept connections whose
# Origin header matches an entry in TRUSTED_ORIGINS (comma-separated). Falls back
# to FRONTEND_URL if TRUSTED_ORIGINS is not set.
_trusted_origins_raw = os.getenv("TRUSTED_ORIGINS") or os.getenv("FRONTEND_URL", "")
_TRUSTED_ORIGINS = {o.strip() for o in _trusted_origins_raw.split(",") if o.strip()}

# Hard cap on a single inbound WebSocket "input" payload (raw stdin bytes).
# Real keystrokes and pastes are tiny; anything larger is almost certainly abuse.
MAX_INPUT_BYTES = 64 * 1024  # 64 KB


# ============================================================================
# Response Models
# ============================================================================

class ConsoleStatusResponse(BaseModel):
    configured: bool
    ssh_port: int = 22
    ssh_username: Optional[str] = None


# ============================================================================
# REST Status Endpoint
# ============================================================================

@router.get("/status", response_model=ConsoleStatusResponse)
async def get_console_status(request: Request):
    """Check if the active instance has SSH configured for console access."""
    await require_read_permission(request, FeatureGroup.SSH_CONSOLE)

    user_id = request.state.user_id

    async with request_scoped_conn(request) as conn:
        active = await conn.fetchrow(
            'SELECT "instanceId" FROM active_sessions WHERE "userId" = $1',
            user_id,
        )

        if not active:
            raise HTTPException(status_code=404, detail="No active instance")

        instance = await conn.fetchrow(
            """
            SELECT "sshKeyConfigured", "sshPort", "sshUsername"
            FROM instances
            WHERE id = $1
            """,
            active["instanceId"],
        )

    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")

    return ConsoleStatusResponse(
        configured=bool(instance["sshKeyConfigured"]),
        ssh_port=instance["sshPort"],
        ssh_username=instance["sshUsername"],
    )


# ============================================================================
# WebSocket Console Endpoint
# ============================================================================

@router.websocket("/ws/shell")
async def websocket_console(websocket: WebSocket):
    """
    WebSocket endpoint for an interactive SSH PTY shell.

    Full bash shell access to the VyOS device. Requires SSH_CONSOLE WRITE
    permission. One session per user. Idle timeout: 10 min. Max: 4 hours.
    """
    # Origin allowlist (defense against Cross-Site WebSocket Hijacking). Done
    # BEFORE accept() so a forged cross-origin handshake never gets upgraded.

    origin = websocket.headers.get("origin")

    if _TRUSTED_ORIGINS and (not origin or origin not in _TRUSTED_ORIGINS):
        logger.warning(
            "Rejected console WebSocket from untrusted origin: %r",
            origin,
        )

        await websocket.close(code=1008)
        return

    await websocket.accept()

    user_info = await _authenticate_websocket(websocket)

    if not user_info:
        return

    user_id = user_info["user_id"]
    instance_id = user_info["instance_id"]

    db_pool = websocket.app.state.db_pool

    # If the user has an existing console session, cancel it so this new one can
    # take over. This handles browser refreshes, React Strict Mode double-mount in
    # dev, navigating away and back, etc. — all of which would otherwise hit a
    # race where the previous task hasn't cleaned up yet.
    existing = _active_console_sessions.get(user_id)

    if existing is not None and not existing.done():
        existing.cancel()

        try:
            await existing

        except asyncio.CancelledError:
            pass

        except Exception:
            logger.exception(
                "Console: error while cancelling existing session for user %s",
                user_id,
            )

    _active_console_sessions.pop(user_id, None)

    # RBAC: require SSH_CONSOLE WRITE permission
    has_perm = await check_permission(
        db_pool,
        user_id,
        instance_id,
        FeatureGroup.SSH_CONSOLE,
        PermissionLevel.WRITE,
    )

    if not has_perm:
        await websocket.send_json({
            "type": "error",
            "message": "You do not have permission to access the SSH console.",
        })

        await websocket.close()
        return

    ssh_conn = None
    ssh_process = None

    try:
        async with db_pool.acquire() as conn:
            instance = await conn.fetchrow(
                """
                SELECT host,
                       "sshPort",
                       "sshUsername",
                       "sshEncryptedPrivKey",
                       "sshKeyNonce",
                       "sshKeyConfigured"
                FROM instances
                WHERE id = $1
                """,
                instance_id,
            )

        if not instance:
            await websocket.send_json({
                "type": "error",
                "message": "Instance not found",
            })

            await websocket.close()
            return

        if not instance["sshKeyConfigured"]:
            await websocket.send_json({
                "type": "error",
                "message": (
                    "SSH key not configured. "
                    "Set it up via Sites > Edit Instance > SSH / Monitoring."
                ),
            })

            await websocket.close()
            return

        if not instance["sshEncryptedPrivKey"] or not instance["sshKeyNonce"]:
            await websocket.send_json({
                "type": "error",
                "message": (
                    "SSH private key not found. "
                    "Regenerate the SSH key in instance settings."
                ),
            })

            await websocket.close()
            return

        ssh_username = instance["sshUsername"] or "vyos"

        try:
            private_key_pem = decrypt_private_key(
                instance["sshEncryptedPrivKey"],
                instance["sshKeyNonce"],
            )

            private_key = asyncssh.import_private_key(
                private_key_pem.decode("utf-8")
            )

        except Exception:
            logger.exception(
                "Console: failed to decrypt SSH private key for instance %s",
                instance_id,
            )

            await websocket.send_json({
                "type": "error",
                "message": (
                    "SSH key could not be loaded. "
                    "Regenerate the SSH key in instance settings."
                ),
            })

            await websocket.close()
            return

        try:
            ssh_conn = await asyncio.wait_for(
                asyncssh.connect(
                    instance["host"],
                    port=instance["sshPort"],
                    username=ssh_username,
                    client_keys=[private_key],
                    known_hosts=None,
                ),
                timeout=15,
            )

        except asyncio.TimeoutError:
            await websocket.send_json({
                "type": "error",
                "message": "SSH connection timed out",
            })

            await websocket.close()
            return

        except (OSError, asyncssh.Error):
            logger.exception(
                "Console: SSH connection failed for instance %s",
                instance_id,
            )

            await websocket.send_json({
                "type": "error",
                "message": "SSH connection failed",
            })

            await websocket.close()
            return

        # Open interactive PTY shell (empty command = default login shell).
        # With request_pty=True the PTY merges stderr into stdout at the OS
        # level, so we do not pass stderr=asyncssh.STDOUT.
        try:
            ssh_process = await ssh_conn.create_process(
                term_type="xterm-256color",
                term_size=(DEFAULT_COLS, DEFAULT_ROWS),
                request_pty=True,
            )

        except asyncssh.Error:
            logger.exception(
                "Console: failed to open shell on instance %s",
                instance_id,
            )

            await websocket.send_json({
                "type": "error",
                "message": "Failed to open shell",
            })

            await websocket.close()
            return

        await websocket.send_json({"type": "connected"})

        start_time = asyncio.get_event_loop().time()
        last_activity = start_time

        _active_console_sessions[user_id] = asyncio.current_task()

        async def stream_output():
            """Forward SSH stdout to WebSocket."""
            nonlocal last_activity

            try:
                while True:
                    data = await asyncio.wait_for(
                        ssh_process.stdout.read(4096),
                        timeout=IDLE_TIMEOUT_SECONDS,
                    )

                    if not data:
                        break

                    last_activity = asyncio.get_event_loop().time()

                    if isinstance(data, bytes):
                        data = data.decode("utf-8", errors="replace")

                    await websocket.send_json({
                        "type": "output",
                        "data": data,
                    })

            except asyncio.TimeoutError:
                await _safe_send(websocket, {
                    "type": "disconnected",
                    "reason": (
                        "Session timed out due to inactivity (10 minutes)"
                    ),
                })

            except (ConnectionError, WebSocketDisconnect):
                return  # Client disconnected normally; stop forwarding output.

        async def forward_input():
            nonlocal last_activity

            while True:
                try:
                    msg = await websocket.receive_json()

                except WebSocketDisconnect:
                    return

                except Exception:
                    # Malformed JSON or transport hiccup — drop this frame, keep session alive.
                    continue

                last_activity = asyncio.get_event_loop().time()

                if not isinstance(msg, dict):
                    continue

                msg_type = msg.get("type")

                if msg_type == "input":
                    data = msg.get("data")

                    if not isinstance(data, str) or not data:
                        continue
                    # Reject absurd payloads to prevent memory abuse by an
                    # authenticated-but-malicious client.

                    if len(data.encode("utf-8", errors="replace")) > MAX_INPUT_BYTES:
                        logger.warning(
                            "Console: dropped oversized input from user %s",
                            user_id,
                        )

                        continue

                    try:
                        ssh_process.stdin.write(data)

                    except Exception:
                        # SSH channel closed — let stream_output detect EOF and end the session.
                        return

                elif msg_type == "resize":
                    try:
                        cols = max(
                            1,
                            min(int(msg.get("cols", DEFAULT_COLS)), MAX_COLS),
                        )

                        rows = max(
                            1,
                            min(int(msg.get("rows", DEFAULT_ROWS)), MAX_ROWS),
                        )

                    except (TypeError, ValueError):
                        continue

                    try:
                        ssh_process.change_terminal_size(cols, rows)

                    except (OSError, asyncssh.Error):
                        # Terminal resize is best-effort; ignore if the channel is already closing.
                        pass
                # Unknown msg_type: silently ignore (forwards-compat).

        async def monitor_auth():
            """
            Continuously verify:
            - session still exists
            - session not expired
            - active instance still exists
            - user still has SSH_CONSOLE WRITE permission
            """

            while True:
                await asyncio.sleep(30)
               
                try:
                    async with db_pool.acquire() as conn:
                        session = await conn.fetchrow(
                            """
                            SELECT s."expiresAt"
                            FROM sessions s
                            WHERE s.token = $1
                            """,
                            verify_session_cookie(
                                websocket.cookies.get("better-auth.session_token")
                                or websocket.cookies.get("__Secure-better-auth.session_token")
                                or ""
                            ),
                        )

                        if not session:
                            logger.warning(
                                "Console: session revoked for user %s",
                                user_id,
                            )

                            await _safe_send(websocket, {
                                "type": "disconnected",
                                "reason": "Session revoked",
                            })

                            return

                        if session["expiresAt"] < datetime.utcnow():
                            logger.warning(
                                "Console: session expired for user %s",
                                user_id,
                            )

                            await _safe_send(websocket, {
                                "type": "disconnected",
                                "reason": "Session expired",
                            })

                            return

                        active = await conn.fetchrow(
                            """
                            SELECT "instanceId"
                            FROM active_sessions
                            WHERE "userId" = $1
                            """,
                            user_id,
                        )

                        if not active:
                            logger.warning(
                                "Console: active instance removed for user %s",
                                user_id,
                            )

                            await _safe_send(websocket, {
                                "type": "disconnected",
                                "reason": "Active instance removed",
                            })

                            return

                    still_allowed = await check_permission(
                        db_pool,
                        user_id,
                        instance_id,
                        FeatureGroup.SSH_CONSOLE,
                        PermissionLevel.WRITE,
                    )

                    if not still_allowed:
                        logger.warning(
                            "Console: permissions revoked for user %s",
                            user_id,
                        )

                        await _safe_send(websocket, {
                            "type": "disconnected",
                            "reason": "Permissions revoked",
                        })

                        return

                except Exception:
                    logger.exception(
                        "Console: auth revalidation failed for user %s",
                        user_id,
                    )

                    await _safe_send(websocket, {
                        "type": "disconnected",
                        "reason": "Authorization check failed",
                    })

                    return
        
        async def check_max_duration():
            """Enforce the maximum session duration hard cap."""
            while True:
                await asyncio.sleep(60)

                elapsed = asyncio.get_event_loop().time() - start_time

                if elapsed >= MAX_DURATION_SECONDS:
                    await _safe_send(websocket, {
                        "type": "disconnected",
                        "reason": (
                            "Maximum session duration reached (4 hours)"
                        ),
                    })

                    return

        output_task = asyncio.create_task(stream_output())
        input_task = asyncio.create_task(forward_input())
        duration_task = asyncio.create_task(check_max_duration())
        auth_task = asyncio.create_task(monitor_auth())

        done, pending = await asyncio.wait(
            [
                output_task,
                input_task,
                duration_task,
                auth_task,
            ],
            return_when=asyncio.FIRST_COMPLETED,
        )

        # Remove the session entry immediately so a reconnect attempt
        # is not blocked by the "already active" check while we await cleanup.
        _active_console_sessions.pop(user_id, None)

        for task in pending:
            task.cancel()

            try:
                await task

            except asyncio.CancelledError:
                pass

            except Exception:
                logger.exception(
                    "Console: error while cancelling pending task",
                )

        for task in done:
            exc = task.exception()

            if exc and not isinstance(exc, asyncio.CancelledError):
                raise exc

    except WebSocketDisconnect:
        pass

    except Exception:
        logger.exception("Unexpected error in console WebSocket")

        await _safe_send(websocket, {
            "type": "error",
            "message": "Internal server error",
        })

    finally:
        _active_console_sessions.pop(user_id, None)

        if ssh_process:
            try:
                ssh_process.terminate()

                try:
                    await asyncio.wait_for(
                        ssh_process.wait_closed(),
                        timeout=5,
                    )

                except asyncio.TimeoutError:
                    logger.warning(
                        "Console: forcing zombie shell kill for user %s",
                        user_id,
                    )

                    ssh_process.kill()

                    try:
                        await asyncio.wait_for(
                            ssh_process.wait_closed(),
                            timeout=5,
                        )

                    except asyncio.TimeoutError:
                        logger.warning(
                            "Console: shell still not closed after SIGKILL",
                        )

            except Exception:
                logger.exception(
                    "Console: failed during SSH process cleanup",
                )

        if ssh_conn:
            try:
                ssh_conn.close()

                try:
                    await asyncio.wait_for(
                        ssh_conn.wait_closed(),
                        timeout=5,
                    )

                except asyncio.TimeoutError:
                    logger.warning(
                        "Console: SSH connection close timed out",
                    )

            except Exception:
                logger.exception(
                    "Console: failed during SSH connection cleanup",
                )

        await _safe_send(websocket, {
            "type": "disconnected",
            "reason": "Session ended",
        })

        try:
            await websocket.close()

        except Exception:
            pass


# ============================================================================
# Helper Functions
# ============================================================================

async def _safe_send(websocket: WebSocket, data: dict) -> None:
    try:
        await websocket.send_json(data)

    except Exception:
        pass


async def _authenticate_websocket(websocket: WebSocket) -> Optional[dict]:
    """
    Authenticate a WebSocket connection via session cookie.
    Returns {user_id, instance_id, email} or None if auth fails (connection closed).
    """

    db_pool = getattr(websocket.app.state, "db_pool", None)

    if not db_pool:
        await websocket.send_json({
            "type": "error",
            "message": "Database not available",
        })

        await websocket.close()
        return None

    cookies = websocket.cookies

    session_token = (
        cookies.get("better-auth.session_token")
        or cookies.get("__Secure-better-auth.session_token")
    )

    if not session_token:
        await websocket.send_json({
            "type": "error",
            "message": "Not authenticated",
        })

        await websocket.close()
        return None

    token_id = verify_session_cookie(session_token)

    if not token_id:
        await websocket.send_json({
            "type": "error",
            "message": "Invalid session token",
        })

        await websocket.close()
        return None

    async with db_pool.acquire() as conn:
        session = await conn.fetchrow(
            """
            SELECT s.id,
                   s."userId",
                   s."expiresAt",
                   u.email
            FROM sessions s
            JOIN users u
              ON s."userId" = u.id
            WHERE s.token = $1
            """,
            token_id,
        )

        if not session:
            await websocket.send_json({
                "type": "error",
                "message": "Session not found",
            })

            await websocket.close()
            return None

        if session["expiresAt"] < datetime.utcnow():
            await websocket.send_json({
                "type": "error",
                "message": "Session expired",
            })

            await websocket.close()
            return None

        active = await conn.fetchrow(
            'SELECT "instanceId" FROM active_sessions WHERE "userId" = $1',
            session["userId"],
        )

        if not active:
            await websocket.send_json({
                "type": "error",
                "message": (
                    "No active instance. "
                    "Connect to an instance first."
                ),
            })

            await websocket.close()
            return None

    return {
        "user_id": session["userId"],
        "instance_id": active["instanceId"],
        "email": session["email"],
    }