"""Container Router.

API endpoints for managing VyOS container configuration.
The template structure is identical between VyOS 1.4 and 1.5.

Endpoints:
  GET  /vyos/container/capabilities     — version-aware feature flags
  GET  /vyos/container/config           — normalized container configuration
  POST /vyos/container/batch            — atomic set/delete operations
  POST /vyos/container/image/add        — pull container image via SSH
  POST /vyos/container/image/delete     — remove container image via SSH
  POST /vyos/container/image/update     — update container image via SSH
  POST /vyos/container/restart          — restart container via SSH
"""

import asyncio
import re
import shlex

import asyncssh
import asyncpg

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.container import ContainerBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from ssh_key_manager import decrypt_private_key
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/container", tags=["container"])


# ============================================================================
# Pydantic Models
# ============================================================================


class ContainerDevice(BaseModel):
    name: str
    source: Optional[str] = None
    destination: Optional[str] = None


class ContainerEnvironment(BaseModel):
    name: str
    value: Optional[str] = None


class ContainerLabel(BaseModel):
    name: str
    value: Optional[str] = None


class ContainerHealthCheck(BaseModel):
    command: Optional[str] = None
    interval: Optional[str] = None
    retry: Optional[str] = None
    timeout: Optional[str] = None


class ContainerNetworkAttachment(BaseModel):
    name: str
    addresses: List[str] = []
    mac: Optional[str] = None


class ContainerPort(BaseModel):
    name: str
    source: Optional[str] = None
    destination: Optional[str] = None
    protocol: Optional[str] = None
    listen_addresses: List[str] = []


class ContainerSysctlParam(BaseModel):
    name: str
    value: Optional[str] = None


class ContainerTmpfs(BaseModel):
    name: str
    destination: Optional[str] = None
    size: Optional[str] = None


class ContainerVolume(BaseModel):
    name: str
    source: Optional[str] = None
    destination: Optional[str] = None
    mode: Optional[str] = None
    propagation: Optional[str] = None


class ContainerInstance(BaseModel):
    name: str
    image: Optional[str] = None
    description: Optional[str] = None
    disabled: bool = False
    allow_host_networks: bool = False
    allow_host_pid: bool = False
    privileged: bool = False
    arguments: Optional[str] = None
    command: Optional[str] = None
    entrypoint: Optional[str] = None
    cpu_quota: Optional[str] = None
    memory: Optional[str] = None
    shared_memory: Optional[str] = None
    uid: Optional[str] = None
    gid: Optional[str] = None
    host_name: Optional[str] = None
    log_driver: Optional[str] = None
    restart: Optional[str] = None
    capabilities: List[str] = []
    name_servers: List[str] = []
    devices: List[ContainerDevice] = []
    environments: List[ContainerEnvironment] = []
    labels: List[ContainerLabel] = []
    health_check: Optional[ContainerHealthCheck] = None
    networks: List[ContainerNetworkAttachment] = []
    ports: List[ContainerPort] = []
    sysctl_params: List[ContainerSysctlParam] = []
    tmpfs_mounts: List[ContainerTmpfs] = []
    volumes: List[ContainerVolume] = []


class ContainerNetworkConfig(BaseModel):
    name: str
    description: Optional[str] = None
    gateways: List[str] = []
    mtu: Optional[str] = None
    no_name_server: bool = False
    prefixes: List[str] = []
    network_type: Optional[str] = None
    macvlan_mode: Optional[str] = None
    macvlan_parent: Optional[str] = None
    vrf: Optional[str] = None


class ContainerRegistryAuth(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None


class ContainerRegistryMirror(BaseModel):
    address: Optional[str] = None
    host_name: Optional[str] = None
    path: Optional[str] = None
    port: Optional[str] = None


class ContainerRegistry(BaseModel):
    name: str
    disabled: bool = False
    insecure: bool = False
    authentication: Optional[ContainerRegistryAuth] = None
    mirror: Optional[ContainerRegistryMirror] = None


class ContainerConfig(BaseModel):
    containers: List[ContainerInstance] = []
    networks: List[ContainerNetworkConfig] = []
    registries: List[ContainerRegistry] = []


class ContainerBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated (e.g., 'mycontainer,eth0')."
        ),
    )


class ContainerBatchRequest(BaseModel):
    operations: List[ContainerBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Internal builder method denylist
# ============================================================================

_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty",
    "get_capabilities", "mappers", "version", "_operations", "m",
})

# Validates container names: alphanumeric + hyphens only (matches VyOS node.def syntax).
# Must start with an alphanumeric character (no leading hyphen — a name like
# "-rm" would otherwise be parsable as a flag by upstream tooling) and be at
# most 63 characters long. This is the only user-supplied value that ever
# reaches the shell, so it is validated before anything else.
_CONTAINER_NAME_RE = re.compile(r'^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}$')

# Validates image references: registry/namespace/name:tag or name:tag etc.
# Allows the characters that appear in valid OCI image references.
_IMAGE_REF_RE = re.compile(r'^[a-zA-Z0-9][a-zA-Z0-9\-\._/:@]{0,254}$')

# Validates paths under /config/containers/.
# Each segment: alphanumeric + hyphens/dots/underscores. No spaces, no shell metacharacters.
_SAFE_CONTAINER_SUBPATH_RE = re.compile(
    r'^/config/containers/[a-zA-Z0-9][a-zA-Z0-9\-]*((/[a-zA-Z0-9][a-zA-Z0-9\-._]*)*)$'
)

# SSH timeouts (seconds)
_SSH_CONNECT_TIMEOUT = 15
_SSH_IMAGE_TIMEOUT = 300   # image pulls can take several minutes
_SSH_QUICK_TIMEOUT = 60    # delete / restart are fast

# ---------------------------------------------------------------------------
# Strict operation allowlist — the ONLY commands this code will ever execute.
# Each entry maps an internal key to (command_template, timeout).
# The template contains exactly one placeholder: {name}.
# No other substitution, no shell metacharacters, nothing else.
# ---------------------------------------------------------------------------
_CONTAINER_SSH_ALLOWLIST: Dict[str, tuple] = {
    "add_image":    ("add container image {name}",    _SSH_IMAGE_TIMEOUT),
    "delete_image": ("delete container image {name}", _SSH_QUICK_TIMEOUT),
    "update_image": ("update container image {name}", _SSH_IMAGE_TIMEOUT),
    "restart":      ("restart container {name}",      _SSH_QUICK_TIMEOUT),
}

# Validates registry names: hostname-style identifiers like "docker.io",
# "quay.io", or "registry.example.com:5000". Allows alphanumerics, dots,
# hyphens, and an optional :port suffix. Explicitly excludes whitespace and
# shell metacharacters even though registry names never reach the shell —
# they do flow into VyOS config and we want a clean rejection of garbage.
_REGISTRY_NAME_RE = re.compile(r'^[a-zA-Z0-9][a-zA-Z0-9.\-]{0,252}(?::[0-9]{1,5})?$')

# Builder-method prefixes whose first positional argument is an entity name.
# Each prefix maps to the regex its first arg must satisfy. The batch endpoint
# enforces this so names with shell metacharacters or other illegal patterns
# can never enter the VyOS config — defense-in-depth so they can't be
# referenced later by an SSH endpoint.
_NAME_PREFIXED_BUILDER_OPS: Dict[str, "re.Pattern"] = {
    "set_name":        _CONTAINER_NAME_RE,
    "delete_name":     _CONTAINER_NAME_RE,
    "set_network":     _CONTAINER_NAME_RE,
    "delete_network":  _CONTAINER_NAME_RE,
    "set_registry":    _REGISTRY_NAME_RE,
    "delete_registry": _REGISTRY_NAME_RE,
}


class ContainerImageRequest(BaseModel):
    container_name: str = Field(..., description="Container name as configured in VyOS")


class ContainerSSHResponse(BaseModel):
    success: bool
    output: Optional[str] = None
    error: Optional[str] = None


class ContainerImagesResponse(BaseModel):
    images: List[str] = []


class ContainerBaseDirResponse(BaseModel):
    exists: bool


class ContainerMkdirRequest(BaseModel):
    paths: List[str] = Field(..., description="Paths under /config/containers/ to create")


# ============================================================================
# SSH helper — operation key + validated name only, never a raw command string
# ============================================================================

async def _run_container_ssh_command(
    request: Request,
    operation: str,
    container_name: str,
    name_re: re.Pattern = _CONTAINER_NAME_RE,
) -> ContainerSSHResponse:
    """
    Execute one of the allowlisted container SSH operations.

    The operation key is resolved against _CONTAINER_SSH_ALLOWLIST before
    anything is sent over SSH.  The container_name is validated against
    name_re (defaults to _CONTAINER_NAME_RE).
    """
    # --- Allowlist check (must come before any other work) ---
    if operation not in _CONTAINER_SSH_ALLOWLIST:
        raise HTTPException(status_code=400, detail=f"Operation not permitted: {operation}")

    template, timeout = _CONTAINER_SSH_ALLOWLIST[operation]

    # --- Name validation ---
    if not container_name or not name_re.match(container_name):
        raise HTTPException(
            status_code=400,
            detail="Invalid container name. Must be alphanumeric and may contain hyphens.",
        )

    # Build the exact command from the hardcoded template — no user input in the template itself
    vyos_command = template.format(name=container_name)

    # --- Session / instance checks ---
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    instance = getattr(request.state, "instance", None)
    if not instance:
        raise HTTPException(
            status_code=400,
            detail="No active instance. Connect to a VyOS instance first.",
        )

    instance_id = instance["id"]
    db_pool: asyncpg.Pool = request.app.state.db_pool

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT host, "sshPort", "sshUsername",
                   "sshEncryptedPrivKey", "sshKeyNonce", "sshKeyConfigured"
            FROM instances WHERE id = $1
            """,
            instance_id,
        )

    if not row:
        raise HTTPException(status_code=404, detail="Instance not found")

    if not row["sshKeyConfigured"]:
        raise HTTPException(
            status_code=409,
            detail="SSH key not configured. Set it up via Sites > Edit Instance > SSH / Monitoring.",
        )

    if not row["sshEncryptedPrivKey"] or not row["sshKeyNonce"]:
        raise HTTPException(
            status_code=409,
            detail="SSH private key missing. Regenerate the SSH key in instance settings.",
        )

    # --- Key decryption ---
    try:
        private_key_pem = decrypt_private_key(row["sshEncryptedPrivKey"], row["sshKeyNonce"])
        private_key = asyncssh.import_private_key(private_key_pem.decode("utf-8"))
    except Exception as exc:
        logger.exception("Failed to decrypt SSH key for instance %s", instance_id)
        raise HTTPException(status_code=500, detail=f"Failed to decrypt SSH key: {exc}")

    ssh_username = row["sshUsername"] or "vyos"

    # --- SSH connection ---
    try:
        ssh_conn = await asyncio.wait_for(
            asyncssh.connect(
                row["host"],
                port=row["sshPort"] or 22,
                username=ssh_username,
                client_keys=[private_key],
                known_hosts=None,
            ),
            timeout=_SSH_CONNECT_TIMEOUT,
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="SSH connection timed out")
    except (OSError, asyncssh.Error) as exc:
        raise HTTPException(status_code=502, detail=f"SSH connection failed: {exc}")

    # --- Command execution ---
    try:
        result = await asyncio.wait_for(
            ssh_conn.run(
                f"vbash -ic '{vyos_command}'",
                check=False,
                stderr=asyncssh.STDOUT,
            ),
            timeout=timeout,
        )
        raw = result.stdout or ""
        # Strip vbash non-interactive warnings that always appear without a TTY
        lines = [
            ln for ln in raw.splitlines()
            if not ln.startswith("vbash:")
        ]
        output = "\n".join(lines).strip()
        success = result.exit_status == 0
        return ContainerSSHResponse(
            success=success,
            output=output or None,
            error=None if success else output or "Command failed",
        )
    except asyncio.TimeoutError:
        return ContainerSSHResponse(success=False, error="Command timed out")
    except asyncssh.Error as exc:
        return ContainerSSHResponse(success=False, error=f"SSH error: {exc}")
    finally:
        ssh_conn.close()


async def _get_ssh_connection(request: Request) -> tuple:
    """Return (ssh_conn, row) for the current session's instance, raising HTTPException on failure."""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    instance = getattr(request.state, "instance", None)
    if not instance:
        raise HTTPException(status_code=400, detail="No active instance.")

    db_pool: asyncpg.Pool = request.app.state.db_pool
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT host, "sshPort", "sshUsername", "sshEncryptedPrivKey", "sshKeyNonce", "sshKeyConfigured"
               FROM instances WHERE id = $1""",
            instance["id"],
        )

    if not row:
        raise HTTPException(status_code=404, detail="Instance not found")
    if not row["sshKeyConfigured"]:
        raise HTTPException(status_code=409, detail="SSH key not configured.")
    if not row["sshEncryptedPrivKey"] or not row["sshKeyNonce"]:
        raise HTTPException(status_code=409, detail="SSH private key missing.")

    try:
        private_key_pem = decrypt_private_key(row["sshEncryptedPrivKey"], row["sshKeyNonce"])
        private_key = asyncssh.import_private_key(private_key_pem.decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to decrypt SSH key: {exc}")

    try:
        ssh_conn = await asyncio.wait_for(
            asyncssh.connect(
                row["host"],
                port=row["sshPort"] or 22,
                username=row["sshUsername"] or "vyos",
                client_keys=[private_key],
                known_hosts=None,
            ),
            timeout=_SSH_CONNECT_TIMEOUT,
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="SSH connection timed out")
    except (OSError, asyncssh.Error) as exc:
        raise HTTPException(status_code=502, detail=f"SSH connection failed: {exc}")

    return ssh_conn


async def _run_shell_command(request: Request, command: str, timeout: int = _SSH_QUICK_TIMEOUT) -> ContainerSSHResponse:
    """Run a plain POSIX shell command (not vbash) via SSH. Caller must pre-validate command."""
    ssh_conn = await _get_ssh_connection(request)
    try:
        result = await asyncio.wait_for(
            ssh_conn.run(command, check=False),
            timeout=timeout,
        )
        output = (result.stdout or "").strip()
        success = result.exit_status == 0
        return ContainerSSHResponse(
            success=success,
            output=output or None,
            error=None if success else (result.stderr or output or "Command failed"),
        )
    except asyncio.TimeoutError:
        return ContainerSSHResponse(success=False, error="Command timed out")
    except asyncssh.Error as exc:
        return ContainerSSHResponse(success=False, error=f"SSH error: {exc}")
    finally:
        ssh_conn.close()


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_container_capabilities(request: Request):
    """Return container feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.CONTAINER)
    try:
        service = get_session_vyos_service(request)
        builder = ContainerBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_container_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=ContainerConfig)
async def get_container_config(http_request: Request, refresh: bool = False):
    """Return the full container configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.CONTAINER)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        container_raw = full_config.get("container", {})
        if not container_raw:
            return ContainerConfig()

        containers = _parse_container_names(container_raw.get("name", {}))
        networks = _parse_container_networks(container_raw.get("network", {}))
        registries = _parse_container_registries(container_raw.get("registry", {}))

        return ContainerConfig(
            containers=sorted(containers, key=lambda c: c.name),
            networks=sorted(networks, key=lambda n: n.name),
            registries=sorted(registries, key=lambda r: r.name),
        )
    except Exception:
        logger.exception("Unhandled error in get_container_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def container_batch_configure(
    http_request: Request, body: ContainerBatchRequest
):
    """Execute a batch of container configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.CONTAINER)
    try:
        service = get_session_vyos_service(http_request)
        builder = ContainerBatchBuilder(version=service.get_version())

        for operation in body.operations:
            if operation.op in _INTERNAL_BUILDER_METHODS or operation.op.startswith("_"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation not allowed: {operation.op}",
                )

            # For ops whose first arg is a container/network/registry name,
            # enforce the appropriate regex. Prevents seeding the VyOS config
            # with names containing shell metacharacters or leading hyphens
            # that downstream SSH ops would later reject.
            for prefix, pattern in _NAME_PREFIXED_BUILDER_OPS.items():
                if operation.op.startswith(prefix):
                    first_arg = (operation.value or "").split(",", 1)[0].strip()
                    if not first_arg or not pattern.match(first_arg):
                        raise HTTPException(
                            status_code=400,
                            detail=f"Invalid name in operation '{operation.op}'.",
                        )
                    break

            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 0:
                method()
            elif len(params) == 1:
                if operation.value is not None:
                    method(operation.value)
                else:
                    method()
            elif len(params) >= 2:
                if operation.value and "," in operation.value:
                    parts = operation.value.split(",", len(params) - 1)
                    method(*parts)
                elif operation.value:
                    method(operation.value)

        response = service.execute_batch(builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Container configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in container_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# SSH Endpoints — container image / instance operations
# These use SSH because the VyOS HTTP API has no equivalent commands.
# All four require CONTAINER WRITE permission.
# ============================================================================


class ContainerImageRefRequest(BaseModel):
    image: str = Field(..., description="Image reference (e.g. adguard/adguardhome:latest)")


def _validate_image_ref(image: str):
    if not image or not _IMAGE_REF_RE.match(image):
        raise HTTPException(status_code=400, detail="Invalid image reference.")


@router.post("/image/pull", response_model=ContainerSSHResponse)
async def container_image_pull(request: Request, body: ContainerImageRefRequest):
    """Pull an image by reference directly (add container image <image-ref>)."""
    await require_write_permission(request, FeatureGroup.CONTAINER)
    _validate_image_ref(body.image)
    return await _run_container_ssh_command(request, "add_image", body.image, name_re=_IMAGE_REF_RE)


@router.post("/image/update-ref", response_model=ContainerSSHResponse)
async def container_image_update_ref(request: Request, body: ContainerImageRefRequest):
    """Update (re-pull) an image by reference (update container image <image-ref>)."""
    await require_write_permission(request, FeatureGroup.CONTAINER)
    _validate_image_ref(body.image)
    return await _run_container_ssh_command(request, "update_image", body.image, name_re=_IMAGE_REF_RE)


@router.post("/image/delete-ref", response_model=ContainerSSHResponse)
async def container_image_delete_ref(request: Request, body: ContainerImageRefRequest):
    """Delete an image by reference (delete container image <image-ref>)."""
    await require_write_permission(request, FeatureGroup.CONTAINER)
    _validate_image_ref(body.image)
    return await _run_container_ssh_command(request, "delete_image", body.image, name_re=_IMAGE_REF_RE)


@router.post("/image/add", response_model=ContainerSSHResponse)
async def container_image_add(request: Request, body: ContainerImageRequest):
    """Pull the image for a configured container (add container image <name>)."""
    await require_write_permission(request, FeatureGroup.CONTAINER)
    return await _run_container_ssh_command(request, "add_image", body.container_name)


@router.post("/image/delete", response_model=ContainerSSHResponse)
async def container_image_delete(request: Request, body: ContainerImageRequest):
    """Remove the image for a configured container (delete container image <name>)."""
    await require_write_permission(request, FeatureGroup.CONTAINER)
    return await _run_container_ssh_command(request, "delete_image", body.container_name)


@router.post("/image/update", response_model=ContainerSSHResponse)
async def container_image_update(request: Request, body: ContainerImageRequest):
    """Re-pull the latest image for a configured container (update container image <name>)."""
    await require_write_permission(request, FeatureGroup.CONTAINER)
    return await _run_container_ssh_command(request, "update_image", body.container_name)


@router.post("/restart", response_model=ContainerSSHResponse)
async def container_restart(request: Request, body: ContainerImageRequest):
    """Restart a running container (restart container name <name>)."""
    await require_write_permission(request, FeatureGroup.CONTAINER)
    return await _run_container_ssh_command(request, "restart", body.container_name)


# ============================================================================
# Show Endpoints — read-only device queries via pyvyos (no SSH required)
# ============================================================================


@router.get("/images", response_model=ContainerImagesResponse)
async def get_container_images(http_request: Request):
    """Return a list of container images pulled on the device."""
    await require_read_permission(http_request, FeatureGroup.CONTAINER)
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(service.device.show, path=["container", "image"])
        if response.status != 200:
            return ContainerImagesResponse(images=[])

        if isinstance(response.result, dict) and "data" in response.result:
            output = response.result["data"]
        elif isinstance(response.result, str):
            output = response.result
        else:
            output = ""

        images = []
        lines = output.splitlines()
        # Skip the header line (starts with REPOSITORY)
        for line in lines[1:]:
            parts = line.split()
            if len(parts) < 2:
                continue
            repo = parts[0]
            tag = parts[1]
            if repo != "<none>" and tag != "<none>":
                images.append(f"{repo}:{tag}")

        return ContainerImagesResponse(images=sorted(set(images)))
    except Exception:
        return ContainerImagesResponse(images=[])


@router.post("/log", response_model=ContainerSSHResponse)
async def get_container_log(http_request: Request, body: ContainerImageRequest):
    """Return log output for a container."""
    await require_read_permission(http_request, FeatureGroup.CONTAINER)
    if not body.container_name or not _CONTAINER_NAME_RE.match(body.container_name):
        raise HTTPException(status_code=400, detail="Invalid container name.")
    try:
        service = get_session_vyos_service(http_request)
        response = await run_in_threadpool(
            service.device.show, path=["container", "log", body.container_name]
        )

        if isinstance(response.result, dict) and "data" in response.result:
            output = response.result["data"]
        elif isinstance(response.result, str):
            output = response.result
        else:
            output = ""

        return ContainerSSHResponse(
            success=response.status == 200,
            output=output.strip() or None,
            error=response.error if response.status != 200 else None,
        )
    except Exception:
        logger.exception("Unhandled error in get_container_log")
        return ContainerSSHResponse(success=False, error="Failed to retrieve container log.")


# ============================================================================
# Filesystem / Directory Endpoints (SSH — plain shell, not vbash)
# ============================================================================


@router.get("/base-dir", response_model=ContainerBaseDirResponse)
async def check_base_dir(http_request: Request):
    """Check whether /config/containers exists on the device."""
    await require_read_permission(http_request, FeatureGroup.CONTAINER)
    result = await _run_shell_command(
        http_request,
        "test -d /config/containers && echo exists || echo missing",
    )
    return ContainerBaseDirResponse(exists="exists" in (result.output or ""))


@router.post("/base-dir", response_model=ContainerSSHResponse)
async def create_base_dir(http_request: Request):
    """Create /config/containers on the device."""
    await require_write_permission(http_request, FeatureGroup.CONTAINER)
    return await _run_shell_command(http_request, "sudo mkdir -p /config/containers")


@router.post("/mkdir", response_model=ContainerSSHResponse)
async def create_container_dirs(http_request: Request, body: ContainerMkdirRequest):
    """Create one or more directories under /config/containers/."""
    await require_write_permission(http_request, FeatureGroup.CONTAINER)
    if not body.paths:
        return ContainerSSHResponse(success=True)
    for path in body.paths:
        if not _SAFE_CONTAINER_SUBPATH_RE.match(path):
            raise HTTPException(status_code=400, detail=f"Invalid path: {path}")
    quoted = " ".join(shlex.quote(p) for p in body.paths)
    return await _run_shell_command(http_request, f"sudo mkdir -p {quoted}")


class ContainerRmdirRequest(BaseModel):
    path: str = Field(..., description="Path under /config/containers/ to remove")


@router.post("/rmdir", response_model=ContainerSSHResponse)
async def remove_container_dir(http_request: Request, body: ContainerRmdirRequest):
    """Recursively remove a directory under /config/containers/."""
    await require_write_permission(http_request, FeatureGroup.CONTAINER)
    if not _SAFE_CONTAINER_SUBPATH_RE.match(body.path):
        raise HTTPException(status_code=400, detail=f"Invalid path: {body.path}")
    return await _run_shell_command(http_request, f"sudo rm -rf {shlex.quote(body.path)}")


# ============================================================================
# Config Parsers
# ============================================================================


def _parse_multi(raw) -> List[str]:
    """Parse a multi-value field that may be a list, dict, or scalar."""
    if raw is None:
        return []
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        return list(raw.keys())
    return [str(raw)]


def _parse_container_names(names_raw: dict) -> List[ContainerInstance]:
    if not names_raw or not isinstance(names_raw, dict):
        return []
    result = []
    for name, cfg in names_raw.items():
        if cfg is None:
            cfg = {}
        result.append(_parse_container_instance(name, cfg))
    return result


def _parse_container_instance(name: str, cfg: dict) -> ContainerInstance:
    # Devices
    devices = []
    for dev_name, dev_cfg in (cfg.get("device") or {}).items():
        if dev_cfg is None:
            dev_cfg = {}
        devices.append(ContainerDevice(
            name=dev_name,
            source=dev_cfg.get("source"),
            destination=dev_cfg.get("destination"),
        ))

    # Environments
    environments = []
    for env_name, env_cfg in (cfg.get("environment") or {}).items():
        if env_cfg is None:
            env_cfg = {}
        environments.append(ContainerEnvironment(
            name=env_name,
            value=env_cfg.get("value"),
        ))

    # Labels
    labels = []
    for label_name, label_cfg in (cfg.get("label") or {}).items():
        if label_cfg is None:
            label_cfg = {}
        labels.append(ContainerLabel(
            name=label_name,
            value=label_cfg.get("value"),
        ))

    # Health check
    health_check = None
    hc_raw = cfg.get("health-check")
    if hc_raw and isinstance(hc_raw, dict):
        health_check = ContainerHealthCheck(
            command=hc_raw.get("command"),
            interval=hc_raw.get("interval"),
            retry=hc_raw.get("retry"),
            timeout=hc_raw.get("timeout"),
        )

    # Network attachments
    networks = []
    for net_name, net_cfg in (cfg.get("network") or {}).items():
        if net_cfg is None:
            net_cfg = {}
        networks.append(ContainerNetworkAttachment(
            name=net_name,
            addresses=_parse_multi(net_cfg.get("address")),
            mac=net_cfg.get("mac"),
        ))

    # Ports
    ports = []
    for port_name, port_cfg in (cfg.get("port") or {}).items():
        if port_cfg is None:
            port_cfg = {}
        ports.append(ContainerPort(
            name=port_name,
            source=port_cfg.get("source"),
            destination=port_cfg.get("destination"),
            protocol=port_cfg.get("protocol"),
            listen_addresses=_parse_multi(port_cfg.get("listen-address")),
        ))

    # Sysctl params
    sysctl_params = []
    for param_name, param_cfg in (cfg.get("sysctl", {}).get("parameter") or {}).items():
        if param_cfg is None:
            param_cfg = {}
        sysctl_params.append(ContainerSysctlParam(
            name=param_name,
            value=param_cfg.get("value"),
        ))

    # Tmpfs mounts
    tmpfs_mounts = []
    for tmpfs_name, tmpfs_cfg in (cfg.get("tmpfs") or {}).items():
        if tmpfs_cfg is None:
            tmpfs_cfg = {}
        tmpfs_mounts.append(ContainerTmpfs(
            name=tmpfs_name,
            destination=tmpfs_cfg.get("destination"),
            size=tmpfs_cfg.get("size"),
        ))

    # Volumes
    volumes = []
    for vol_name, vol_cfg in (cfg.get("volume") or {}).items():
        if vol_cfg is None:
            vol_cfg = {}
        volumes.append(ContainerVolume(
            name=vol_name,
            source=vol_cfg.get("source"),
            destination=vol_cfg.get("destination"),
            mode=vol_cfg.get("mode"),
            propagation=vol_cfg.get("propagation"),
        ))

    return ContainerInstance(
        name=name,
        image=cfg.get("image"),
        description=cfg.get("description"),
        disabled="disable" in cfg,
        allow_host_networks="allow-host-networks" in cfg,
        allow_host_pid="allow-host-pid" in cfg,
        privileged="privileged" in cfg,
        arguments=cfg.get("arguments"),
        command=cfg.get("command"),
        entrypoint=cfg.get("entrypoint"),
        cpu_quota=cfg.get("cpu-quota"),
        memory=cfg.get("memory"),
        shared_memory=cfg.get("shared-memory"),
        uid=cfg.get("uid"),
        gid=cfg.get("gid"),
        host_name=cfg.get("host-name"),
        log_driver=cfg.get("log-driver"),
        restart=cfg.get("restart"),
        capabilities=_parse_multi(cfg.get("capability")),
        name_servers=_parse_multi(cfg.get("name-server")),
        devices=sorted(devices, key=lambda d: d.name),
        environments=sorted(environments, key=lambda e: e.name),
        labels=sorted(labels, key=lambda l: l.name),
        health_check=health_check,
        networks=sorted(networks, key=lambda n: n.name),
        ports=sorted(ports, key=lambda p: p.name),
        sysctl_params=sorted(sysctl_params, key=lambda s: s.name),
        tmpfs_mounts=sorted(tmpfs_mounts, key=lambda t: t.name),
        volumes=sorted(volumes, key=lambda v: v.name),
    )


def _parse_container_networks(networks_raw: dict) -> List[ContainerNetworkConfig]:
    if not networks_raw or not isinstance(networks_raw, dict):
        return []
    result = []
    for net_name, cfg in networks_raw.items():
        if cfg is None:
            cfg = {}

        network_type = None
        macvlan_mode = None
        macvlan_parent = None
        type_cfg = cfg.get("type", {})
        if isinstance(type_cfg, dict):
            if "bridge" in type_cfg:
                network_type = "bridge"
            elif "macvlan" in type_cfg:
                network_type = "macvlan"
                mv_cfg = type_cfg.get("macvlan") or {}
                if isinstance(mv_cfg, dict):
                    macvlan_mode = mv_cfg.get("mode")
                    macvlan_parent = mv_cfg.get("parent")

        result.append(ContainerNetworkConfig(
            name=net_name,
            description=cfg.get("description"),
            gateways=_parse_multi(cfg.get("gateway")),
            mtu=cfg.get("mtu"),
            no_name_server="no-name-server" in cfg,
            prefixes=_parse_multi(cfg.get("prefix")),
            network_type=network_type,
            macvlan_mode=macvlan_mode,
            macvlan_parent=macvlan_parent,
            vrf=cfg.get("vrf"),
        ))
    return result


def _parse_container_registries(registries_raw: dict) -> List[ContainerRegistry]:
    if not registries_raw or not isinstance(registries_raw, dict):
        return []
    result = []
    for reg_name, cfg in registries_raw.items():
        if cfg is None:
            cfg = {}

        auth = None
        auth_raw = cfg.get("authentication")
        if auth_raw and isinstance(auth_raw, dict):
            auth = ContainerRegistryAuth(
                username=auth_raw.get("username"),
                password=auth_raw.get("password"),
            )

        mirror = None
        mirror_raw = cfg.get("mirror")
        if mirror_raw and isinstance(mirror_raw, dict):
            mirror = ContainerRegistryMirror(
                address=mirror_raw.get("address"),
                host_name=mirror_raw.get("host-name"),
                path=mirror_raw.get("path"),
                port=mirror_raw.get("port"),
            )

        result.append(ContainerRegistry(
            name=reg_name,
            disabled="disable" in cfg,
            insecure="insecure" in cfg,
            authentication=auth,
            mirror=mirror,
        ))
    return result
