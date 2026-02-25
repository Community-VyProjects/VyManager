"""
Monitoring Router

Provides SSH-based real-time monitoring for VyOS devices.
- REST endpoints for SSH key management (instance-id based, admin-accessible)
- WebSocket endpoint for streaming command output (session-based)

Architecture:
  Browser <--WebSocket--> FastAPI <--SSH (asyncssh)--> VyOS Device
"""

import asyncio
from datetime import datetime
from typing import Optional

import asyncpg
import asyncssh
from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from monitoring_commands import build_command, get_available_commands
from rbac_permissions import FeatureGroup, check_permission, PermissionLevel
from fastapi_permissions import require_read_permission
from ssh_key_manager import decrypt_private_key, generate_keypair

router = APIRouter(prefix="/vyos/monitoring", tags=["monitoring"])

# Track active monitoring sessions: user_id -> asyncio.Task
_active_sessions: dict[str, asyncio.Task] = {}

# Timeouts
IDLE_TIMEOUT_SECONDS = 300   # 5 minutes
MAX_DURATION_SECONDS = 1800  # 30 minutes


# ============================================================================
# Request/Response Models
# ============================================================================

class SSHKeyResponse(BaseModel):
    has_key: bool
    public_key: Optional[str] = None
    configured: bool = False
    ssh_port: int = 22
    ssh_username: Optional[str] = None


class SSHKeyGenerateResponse(BaseModel):
    success: bool
    public_key: str


class MarkConfiguredRequest(BaseModel):
    configured: bool = Field(default=True)


class GenericResponse(BaseModel):
    success: bool
    message: Optional[str] = None


# ============================================================================
# SSH Key Management Endpoints (instance-id based, site ADMIN required)
# ============================================================================

@router.post("/instances/{instance_id}/ssh-key/generate", response_model=SSHKeyGenerateResponse)
async def generate_ssh_key(instance_id: str, request: Request):
    """Generate a new SSH keypair for an instance. Requires site ADMIN."""
    await _require_instance_admin(request, instance_id)
    db_pool = _get_db_pool(request)

    keypair = generate_keypair()

    async with db_pool.acquire() as conn:
        updated = await conn.fetchval(
            """
            UPDATE instances
            SET "sshPublicKey" = $1,
                "sshEncryptedPrivKey" = $2,
                "sshKeyNonce" = $3,
                "sshKeyConfigured" = false,
                "updatedAt" = NOW()
            WHERE id = $4
            RETURNING id
            """,
            keypair["public_key"],
            keypair["encrypted_private_key"],
            keypair["nonce"],
            instance_id,
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Instance not found")

    return SSHKeyGenerateResponse(
        success=True,
        public_key=keypair["public_key"],
    )


@router.get("/instances/{instance_id}/ssh-key/status", response_model=SSHKeyResponse)
async def get_ssh_key_status(instance_id: str, request: Request):
    """Get SSH key status for an instance. Requires site ADMIN."""
    await _require_instance_admin(request, instance_id)
    db_pool = _get_db_pool(request)

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT "sshPublicKey", "sshKeyConfigured", "sshPort", "sshUsername"
            FROM instances WHERE id = $1
            """,
            instance_id,
        )

    if not row:
        raise HTTPException(status_code=404, detail="Instance not found")

    return SSHKeyResponse(
        has_key=row["sshPublicKey"] is not None,
        public_key=row["sshPublicKey"],
        configured=row["sshKeyConfigured"],
        ssh_port=row["sshPort"],
        ssh_username=row["sshUsername"],
    )


@router.post("/instances/{instance_id}/ssh-key/mark-configured", response_model=GenericResponse)
async def mark_ssh_key_configured(instance_id: str, request: Request, body: MarkConfiguredRequest):
    """Mark SSH key as configured on the VyOS device. Requires site ADMIN."""
    await _require_instance_admin(request, instance_id)
    db_pool = _get_db_pool(request)

    async with db_pool.acquire() as conn:
        has_key = await conn.fetchval(
            'SELECT "sshPublicKey" IS NOT NULL FROM instances WHERE id = $1',
            instance_id,
        )
        if has_key is None:
            raise HTTPException(status_code=404, detail="Instance not found")
        if not has_key:
            raise HTTPException(
                status_code=400,
                detail="No SSH key generated yet. Generate a key first.",
            )

        await conn.execute(
            """
            UPDATE instances
            SET "sshKeyConfigured" = $1, "updatedAt" = NOW()
            WHERE id = $2
            """,
            body.configured,
            instance_id,
        )

    return GenericResponse(success=True, message="SSH key status updated")


@router.delete("/instances/{instance_id}/ssh-key", response_model=GenericResponse)
async def delete_ssh_key(instance_id: str, request: Request):
    """Remove SSH key from an instance. Requires site ADMIN."""
    await _require_instance_admin(request, instance_id)
    db_pool = _get_db_pool(request)

    async with db_pool.acquire() as conn:
        updated = await conn.fetchval(
            """
            UPDATE instances
            SET "sshPublicKey" = NULL,
                "sshEncryptedPrivKey" = NULL,
                "sshKeyNonce" = NULL,
                "sshKeyConfigured" = false,
                "updatedAt" = NOW()
            WHERE id = $1
            RETURNING id
            """,
            instance_id,
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Instance not found")

    return GenericResponse(success=True, message="SSH key removed")


@router.get("/commands")
async def list_commands(request: Request):
    """List available monitoring commands."""
    await require_read_permission(request, FeatureGroup.MONITORING)
    return {"commands": get_available_commands()}


# ============================================================================
# WebSocket Monitoring Endpoint (session-based)
# ============================================================================

@router.websocket("/ws/monitor")
async def websocket_monitor(websocket: WebSocket):
    """
    WebSocket endpoint for real-time monitoring.

    Protocol:
    1. Client connects (authenticated via session cookie)
    2. Client sends: {"command": "monitor_traffic", "params": {"iface": "eth0"}}
    3. Server streams: {"type": "output", "data": "..."}
    4. Client sends: {"type": "stop"} to terminate
    5. Server sends: {"type": "stopped"} when done
    """
    await websocket.accept()

    # Authenticate via session cookie
    user_info = await _authenticate_websocket(websocket)
    if not user_info:
        return

    user_id = user_info["user_id"]
    instance_id = user_info["instance_id"]
    db_pool = websocket.app.state.db_pool

    # Check if user already has an active monitoring session
    if user_id in _active_sessions and not _active_sessions[user_id].done():
        await websocket.send_json({
            "type": "error",
            "data": "You already have an active monitoring session. Stop it first.",
        })
        await websocket.close()
        return

    # Check WRITE permission for MONITORING
    has_permission = await check_permission(
        db_pool, user_id, instance_id, FeatureGroup.MONITORING, PermissionLevel.WRITE
    )
    if not has_permission:
        await websocket.send_json({
            "type": "error",
            "data": "Insufficient permissions for monitoring.",
        })
        await websocket.close()
        return

    ssh_conn = None
    ssh_process = None

    try:
        # Signal ready to receive command
        await websocket.send_json({"type": "ready"})

        raw = await asyncio.wait_for(websocket.receive_json(), timeout=30)

        command_name = raw.get("command")
        command_params = raw.get("params", {})

        if not command_name:
            await websocket.send_json({"type": "error", "data": "No command specified"})
            await websocket.close()
            return

        # Validate and build command
        try:
            command_str = build_command(command_name, command_params)
        except ValueError as e:
            await websocket.send_json({"type": "error", "data": str(e)})
            await websocket.close()
            return

        # Get instance SSH config
        async with db_pool.acquire() as conn:
            instance = await conn.fetchrow(
                """
                SELECT host, "sshPort", "sshUsername", "sshEncryptedPrivKey",
                       "sshKeyNonce", "sshKeyConfigured"
                FROM instances WHERE id = $1
                """,
                instance_id,
            )

        if not instance:
            await websocket.send_json({"type": "error", "data": "Instance not found"})
            await websocket.close()
            return

        if not instance["sshKeyConfigured"]:
            await websocket.send_json({
                "type": "error",
                "data": "SSH key not configured. Set it up via Sites > Edit Instance > SSH / Monitoring.",
            })
            await websocket.close()
            return

        if not instance["sshEncryptedPrivKey"] or not instance["sshKeyNonce"]:
            await websocket.send_json({
                "type": "error",
                "data": "SSH private key not found. Regenerate the SSH key in instance settings.",
            })
            await websocket.close()
            return

        ssh_username = instance["sshUsername"] or "vyos"

        # Decrypt private key
        try:
            private_key_pem = decrypt_private_key(
                instance["sshEncryptedPrivKey"],
                instance["sshKeyNonce"],
            )
            private_key = asyncssh.import_private_key(private_key_pem.decode("utf-8"))
        except Exception as e:
            await websocket.send_json({
                "type": "error",
                "data": f"Failed to decrypt SSH key: {str(e)}",
            })
            await websocket.close()
            return

        # Connect via SSH
        await websocket.send_json({"type": "status", "data": "Connecting via SSH..."})

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
                "data": "SSH connection timed out",
            })
            await websocket.close()
            return
        except (OSError, asyncssh.Error) as e:
            await websocket.send_json({
                "type": "error",
                "data": f"SSH connection failed: {str(e)}",
            })
            await websocket.close()
            return

        await websocket.send_json({"type": "status", "data": f"Running: vbash -ic '{command_str}'"})

        # Start SSH command - wrap in vbash for VyOS operational mode
        vbash_command = f"vbash -ic '{command_str}'"
        ssh_process = await ssh_conn.create_process(
            vbash_command,
            stderr=asyncssh.STDOUT,
        )

        start_time = asyncio.get_event_loop().time()

        # Register active session
        _active_sessions[user_id] = asyncio.current_task()

        async def stream_output():
            """Read SSH stdout and send to WebSocket."""
            try:
                while True:
                    data = await asyncio.wait_for(
                        ssh_process.stdout.read(4096),
                        timeout=IDLE_TIMEOUT_SECONDS,
                    )
                    if not data:
                        break
                    await websocket.send_json({"type": "output", "data": data})
            except asyncio.TimeoutError:
                await websocket.send_json({
                    "type": "status",
                    "data": "Session timed out due to inactivity",
                })
            except (ConnectionError, WebSocketDisconnect):
                pass

        async def listen_for_stop():
            """Listen for stop command from client."""
            try:
                while True:
                    msg = await websocket.receive_json()
                    if msg.get("type") == "stop":
                        return
            except (WebSocketDisconnect, Exception):
                return

        async def check_max_duration():
            """Enforce maximum session duration."""
            while True:
                await asyncio.sleep(10)
                elapsed = asyncio.get_event_loop().time() - start_time
                if elapsed >= MAX_DURATION_SECONDS:
                    await websocket.send_json({
                        "type": "status",
                        "data": "Maximum session duration reached (30 minutes)",
                    })
                    return

        output_task = asyncio.create_task(stream_output())
        stop_task = asyncio.create_task(listen_for_stop())
        duration_task = asyncio.create_task(check_max_duration())

        done, pending = await asyncio.wait(
            [output_task, stop_task, duration_task],
            return_when=asyncio.FIRST_COMPLETED,
        )

        for task in pending:
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "data": str(e)})
        except Exception:
            pass
    finally:
        _active_sessions.pop(user_id, None)

        if ssh_process:
            try:
                ssh_process.terminate()
            except Exception:
                pass

        if ssh_conn:
            try:
                ssh_conn.close()
            except Exception:
                pass

        try:
            await websocket.send_json({"type": "stopped"})
        except Exception:
            pass

        try:
            await websocket.close()
        except Exception:
            pass


# ============================================================================
# Helper Functions
# ============================================================================

def _get_user_id(request: Request) -> Optional[str]:
    """Get authenticated user ID from request state."""
    return getattr(request.state, "user_id", None)


def _get_db_pool(request: Request) -> asyncpg.Pool:
    """Get database pool from app state."""
    db_pool = getattr(request.app.state, "db_pool", None)
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")
    return db_pool


async def _require_instance_admin(request: Request, instance_id: str) -> str:
    """
    Require the user to be a site-level ADMIN.
    Returns the user_id.
    Raises HTTPException if not authenticated or not admin.
    """
    user_id = _get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    db_pool = _get_db_pool(request)

    async with db_pool.acquire() as conn:
        site_role = await conn.fetchval(
            "SELECT role FROM users WHERE id = $1",
            user_id,
        )

    if site_role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Only site ADMIN users can manage SSH keys",
        )

    return user_id


async def _authenticate_websocket(websocket: WebSocket) -> Optional[dict]:
    """
    Authenticate WebSocket connection using session cookie.
    Returns user_info dict or None if auth fails.
    """
    db_pool = getattr(websocket.app.state, "db_pool", None)
    if not db_pool:
        await websocket.send_json({"type": "error", "data": "Database not available"})
        await websocket.close()
        return None

    cookies = websocket.cookies
    session_token = cookies.get("better-auth.session_token") or cookies.get(
        "__Secure-better-auth.session_token"
    )

    if not session_token:
        await websocket.send_json({"type": "error", "data": "Not authenticated"})
        await websocket.close()
        return None

    token_parts = session_token.split(".")
    token_id = token_parts[0] if len(token_parts) > 0 else session_token

    async with db_pool.acquire() as conn:
        session = await conn.fetchrow(
            """
            SELECT s.id, s."userId", s."expiresAt", u.email, u.name
            FROM sessions s
            JOIN users u ON s."userId" = u.id
            WHERE s.token = $1
            """,
            token_id,
        )

        if not session:
            await websocket.send_json({"type": "error", "data": "Session not found"})
            await websocket.close()
            return None

        if session["expiresAt"] < datetime.utcnow():
            await websocket.send_json({"type": "error", "data": "Session expired"})
            await websocket.close()
            return None

        active = await conn.fetchrow(
            """
            SELECT "instanceId" FROM active_sessions WHERE "userId" = $1
            """,
            session["userId"],
        )

        if not active:
            await websocket.send_json({
                "type": "error",
                "data": "No active instance. Connect to an instance first.",
            })
            await websocket.close()
            return None

        return {
            "user_id": session["userId"],
            "instance_id": active["instanceId"],
            "email": session["email"],
        }
