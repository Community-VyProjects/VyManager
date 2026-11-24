"""Container Router.

API endpoints for managing VyOS container configuration.

Endpoints:
  GET  /vyos/container/capabilities     — version-aware feature flags
  GET  /vyos/container/config           — normalized container configuration
  POST /vyos/container/batch            — atomic set/delete operations
  POST /vyos/container/image/pull       — pull an image reference via GraphQL
  POST /vyos/container/image/update-ref — re-pull an image reference via GraphQL
  POST /vyos/container/image/delete-ref — remove an image reference via GraphQL
  POST /vyos/container/image/add        — pull a container's image via GraphQL
  POST /vyos/container/image/delete     — remove a container's image via GraphQL
  POST /vyos/container/image/update     — re-pull a container's configured image via GraphQL
  POST /vyos/container/restart          — restart container via GraphQL
  GET  /vyos/container/images           — images pulled on the device
  POST /vyos/container/log              — container log output
  GET/POST /vyos/container/base-dir     — check or create /config/containers (SSH)
  POST /vyos/container/mkdir, /touch    — create directories or files under it (SSH)
  GET/POST /vyos/container/file         — read or back up and write a file under it (SSH)
  POST /vyos/container/rmdir            — remove a directory under it (SSH)
"""

import asyncio
import json
import re
import shlex
from datetime import datetime, timezone

import asyncssh
import httpx
from packaging.version import InvalidVersion, Version
from requests.exceptions import RequestException

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union, cast
import appliance_mode
from session_vyos_service import get_session_vyos_service
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.container.container import ContainerMapper, GraphQLMutation
from vyos_builders.container import ContainerBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from org_scope import independent_org_conn, request_scoped_conn
from rbac_permissions import FeatureGroup
from ssh_key_manager import decrypt_private_key
from utils.ssh import SshHostKeyRejected, connect as connect_ssh
import logging
from batch_dispatch import call_comma_batch_op

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


class ContainerHealthCheck(BaseModel):
    command: Optional[str] = None
    interval: Optional[str] = None
    retry: Optional[str] = None
    timeout: Optional[str] = None


class ContainerImageUpdateStatus(BaseModel):
    available: bool = False
    current_tag: Optional[str] = None
    latest_tag: Optional[str] = None
    registry: Optional[str] = None
    checked_at: Optional[str] = None


class ContainerInstance(BaseModel):
    name: str
    image: Optional[str] = None
    description: Optional[str] = None
    disabled: bool = False
    allow_host_networks: bool = False
    allow_host_cgroups: bool = False
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
    stop_timeout: Optional[str] = None
    health_check: Optional[ContainerHealthCheck] = None
    capabilities: List[str] = []
    name_servers: List[str] = []
    devices: List[ContainerDevice] = []
    environments: List[ContainerEnvironment] = []
    labels: List[ContainerLabel] = []
    networks: List[ContainerNetworkAttachment] = []
    ports: List[ContainerPort] = []
    sysctl_params: List[ContainerSysctlParam] = []
    tmpfs_mounts: List[ContainerTmpfs] = []
    volumes: List[ContainerVolume] = []
    update_status: Optional[ContainerImageUpdateStatus] = None


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
    configured: bool = False
    containers: List[ContainerInstance] = []
    networks: List[ContainerNetworkConfig] = []
    registries: List[ContainerRegistry] = []


class ContainerBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Zero-arg methods: omit (a value is rejected). "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated (e.g., 'mycontainer,eth0'); "
            "the last argument keeps any commas."
        ),
    )


class ContainerBatchRequest(BaseModel):
    operations: List[ContainerBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# Validates container names: alphanumeric + hyphens only (matches VyOS node.def syntax).
# Must start with an alphanumeric character (no leading hyphen — a name like
# "-rm" would otherwise be parsable as a flag by upstream tooling) and be at
# most 63 characters long. Container names reach GraphQL mutations, op-mode
# show paths and the VyOS config, so they are validated before anything else.
_CONTAINER_NAME_RE = re.compile(r'^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}$')

# Validates image references: registry/namespace/name:tag or name:tag etc.
# Allows the characters that appear in valid OCI image references.
_IMAGE_REF_RE = re.compile(r'^[a-zA-Z0-9][a-zA-Z0-9\-\._/:@]{0,254}$')

# Validates paths under /config/containers/.
# Each segment: alphanumeric + hyphens/dots/underscores. No spaces, no shell metacharacters.
_SAFE_CONTAINER_SUBPATH_RE = re.compile(
    r'^/config/containers/[a-zA-Z0-9][a-zA-Z0-9\-]*((/[a-zA-Z0-9][a-zA-Z0-9\-._]*)*)$'
)

# GraphQL timeouts (seconds)
_GQL_IMAGE_TIMEOUT = 300   # image pulls can take several minutes
_GQL_QUICK_TIMEOUT = 60    # delete / restart are fast

# SSH timeouts (seconds) — used only by the filesystem endpoints below, which
# have no GraphQL/HTTP-API equivalent (read/write/remove host paths).
_SSH_CONNECT_TIMEOUT = 15
_SSH_QUICK_TIMEOUT = 60

# One text per SSH-key gate. ContainerContent matches _SSH_KEY_NOT_CONFIGURED
# to show its set-up screen, so both gates must send the same string.
_SSH_KEY_NOT_CONFIGURED = "SSH key not configured."
_SSH_KEY_MISSING = "SSH private key missing."
_INVALID_CONTAINER_NAME = "Invalid container name. Must be alphanumeric and may contain hyphens."
_INVALID_IMAGE_REF = "Invalid image reference."

# Validates registry names: hostname-style identifiers like "docker.io",
# "quay.io", or "registry.example.com:5000". Allows alphanumerics, dots,
# hyphens, and an optional :port suffix. Explicitly excludes whitespace and
# shell metacharacters even though registry names never reach the shell —
# they do flow into VyOS config and we want a clean rejection of garbage.
_REGISTRY_NAME_RE = re.compile(r'^[a-zA-Z0-9][a-zA-Z0-9.\-]{0,252}(?::[0-9]{1,5})?$')

# Validates container network names exactly as the lab node.def does on 1.4
# and 1.5. Network names never reach a shell.
_NETWORK_NAME_RE = re.compile(r'^[-_a-zA-Z0-9]{1,11}$')

# Builder-method prefixes whose first positional argument is an entity name.
# Each prefix maps to the regex its first arg must satisfy. The batch endpoint
# enforces this so names with shell metacharacters or other illegal patterns
# can never enter the VyOS config — defense-in-depth so they can't be
# referenced later by an SSH endpoint.
_NAME_PREFIXED_BUILDER_OPS: Dict[str, "re.Pattern"] = {
    "set_name":        _CONTAINER_NAME_RE,
    "delete_name":     _CONTAINER_NAME_RE,
    "set_network":     _NETWORK_NAME_RE,
    "delete_network":  _NETWORK_NAME_RE,
    "set_registry":    _REGISTRY_NAME_RE,
    "delete_registry": _REGISTRY_NAME_RE,
}


def _refuse_appliance_stack_batch(op: str, value: Optional[str]) -> None:
    """Block generic Containers edit/delete of the on-box VyManager stack."""
    if not appliance_mode.is_appliance():
        return
    if op == "delete_container_root":
        raise HTTPException(status_code=400, detail=appliance_mode.STACK_GUARD_DETAIL)
    first = (value or "").split(",", 1)[0].strip()
    container_op = (
        op in ("set_name", "delete_name")
        or op.startswith("set_name_")
        or op.startswith("delete_name_")
    )
    network_op = (
        op in ("set_network", "delete_network")
        or op.startswith("set_network_")
        or op.startswith("delete_network_")
    )
    if container_op and appliance_mode.is_stack_container(first):
        raise HTTPException(status_code=400, detail=appliance_mode.STACK_GUARD_DETAIL)
    if network_op and appliance_mode.is_stack_network(first):
        raise HTTPException(status_code=400, detail=appliance_mode.STACK_GUARD_DETAIL)


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
# Mapper and GraphQL helpers — the mapper supplies the mutation documents
# ============================================================================


def _container_mapper(service: Any) -> ContainerMapper:
    return cast(ContainerMapper, CommandMapperRegistry.get_mapper("container", service.get_version()))


def _require_container_name(container_name: str) -> None:
    if not container_name or not _CONTAINER_NAME_RE.fullmatch(container_name):
        raise HTTPException(status_code=400, detail=_INVALID_CONTAINER_NAME)


async def _configured_container_image(service: Any, mapper: ContainerMapper, container_name: str) -> str:
    """Return the image ref set on ``container name <container_name> image``."""
    full_config = await run_in_threadpool(service.get_full_config, refresh=False)
    entry = next(
        (c for c in mapper.parse_config(full_config)["containers"] if c["name"] == container_name),
        None,
    )
    if entry is None:
        raise HTTPException(
            status_code=400,
            detail=f"Container {container_name} not found",
        )
    image = entry.get("image")
    if not isinstance(image, str) or not image.strip():
        raise HTTPException(
            status_code=400,
            detail=f"No image configured for container {container_name}",
        )
    image = image.strip()
    if not _IMAGE_REF_RE.fullmatch(image):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image reference on container {container_name}",
        )
    return image


def _refuse_stack_image(image: str) -> None:
    """On the appliance the VyManager stack's own images cannot be removed."""
    if appliance_mode.is_appliance() and appliance_mode.is_stack_image_ref(image):
        raise HTTPException(status_code=400, detail=appliance_mode.STACK_GUARD_DETAIL)


async def _require_ssh_key_configured(request: Request) -> None:
    """Enforce that the active instance still has an SSH key configured.

    The image/restart operations run over GraphQL, but the credential
    requirement is unchanged: an instance must have its SSH key set up before
    these operations are allowed. This keeps the gate identical to the old SSH
    path (both the API key and the SSH key must be present).
    """
    instance = getattr(request.state, "instance", None)
    if not instance:
        raise HTTPException(
            status_code=400,
            detail="No active instance. Connect to a VyOS instance first.",
        )

    async with request_scoped_conn(request) as conn:
        row = await conn.fetchrow(
            """
            SELECT "sshEncryptedPrivKey", "sshKeyNonce", "sshKeyConfigured"
            FROM instances WHERE id = $1
            """,
            instance["id"],
        )

    if not row:
        raise HTTPException(status_code=404, detail="Instance not found")
    if not row["sshKeyConfigured"]:
        raise HTTPException(status_code=409, detail=_SSH_KEY_NOT_CONFIGURED)
    if not row["sshEncryptedPrivKey"] or not row["sshKeyNonce"]:
        raise HTTPException(status_code=409, detail=_SSH_KEY_MISSING)


def _json_object(value: Any) -> Dict[str, Any]:
    """value when it is a JSON object, else {} (a GraphQL reply part may be null or a list)."""
    return value if isinstance(value, dict) else {}


async def _run_container_gql_command(
    request: Request,
    service: Any,
    mutation: GraphQLMutation,
    name: str,
    timeout: int,
    name_re: re.Pattern = _CONTAINER_NAME_RE,
) -> ContainerSSHResponse:
    """
    Run one container mutation from the container mapper over the VyOS GraphQL API.

    name is a container name (restart) or an image reference (the image
    operations, with name_re=_IMAGE_REF_RE); it is validated against name_re.
    The API key and the name are sent as GraphQL variables, so neither is
    written into the mutation text.
    """
    # --- Name validation ---
    if not name or not name_re.fullmatch(name):
        detail = _INVALID_IMAGE_REF if name_re is _IMAGE_REF_RE else _INVALID_CONTAINER_NAME
        raise HTTPException(status_code=400, detail=detail)

    # --- Session / credential checks (SSH key still required) ---
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    await _require_ssh_key_configured(request)

    api_key = str(service.config.apikey)
    url = (
        f"{service.config.protocol}://{service.config.hostname}"
        f":{service.config.port}/graphql"
    )
    field = mutation.field

    try:
        async with httpx.AsyncClient(verify=service.config.verify, timeout=float(timeout)) as client:
            resp = await client.post(
                url,
                json={"query": mutation.document, "variables": {"key": api_key, "name": name}},
                auth=("vyos", api_key),
            )
    except httpx.TimeoutException:
        return ContainerSSHResponse(success=False, error="Command timed out")
    except httpx.HTTPError as exc:
        logger.warning("Container GraphQL %s request failed: %s", field, exc)
        raise HTTPException(status_code=502, detail="GraphQL request failed")

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"GraphQL HTTP error {resp.status_code}")

    try:
        body = resp.json()
    except ValueError:
        body = None
    if not isinstance(body, dict):
        logger.warning("Container GraphQL %s returned a body that is not a JSON object", field)
        raise HTTPException(status_code=502, detail="GraphQL response is not a JSON object")
    if body.get("errors"):
        # Transport-level GraphQL errors (bad query, schema mismatch).
        errors_list = body["errors"] if isinstance(body["errors"], list) else [body["errors"]]
        message = "; ".join(
            str(e.get("message", e)) if isinstance(e, dict) else str(e) for e in errors_list
        )
        return ContainerSSHResponse(success=False, error=message or "GraphQL error")

    payload = _json_object(_json_object(body.get("data")).get(field))
    success = bool(payload.get("success"))
    errors = payload.get("errors")
    result = _json_object(payload.get("data")).get("result")

    if isinstance(result, (dict, list)):
        output = json.dumps(result)
    elif result is not None:
        output = str(result).strip()
    else:
        output = ""

    if success:
        return ContainerSSHResponse(success=True, output=output or None, error=None)

    if isinstance(errors, list):
        error_text = "; ".join(str(e) for e in errors if e)
    else:
        error_text = str(errors) if errors else ""
    return ContainerSSHResponse(
        success=False,
        output=output or None,
        error=error_text or output or f"{field} failed",
    )


async def _get_ssh_connection(request: Request) -> asyncssh.SSHClientConnection:
    """Return an SSH connection to the current session's instance, raising HTTPException on failure."""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    instance = getattr(request.state, "instance", None)
    if not instance:
        raise HTTPException(status_code=400, detail="No active instance.")

    async with request_scoped_conn(request) as conn:
        row = await conn.fetchrow(
            """SELECT host, "sshPort", "sshUsername", "sshEncryptedPrivKey", "sshKeyNonce", "sshKeyConfigured"
               FROM instances WHERE id = $1""",
            instance["id"],
        )

    if not row:
        raise HTTPException(status_code=404, detail="Instance not found")
    if not row["sshKeyConfigured"]:
        raise HTTPException(status_code=409, detail=_SSH_KEY_NOT_CONFIGURED)
    if not row["sshEncryptedPrivKey"] or not row["sshKeyNonce"]:
        raise HTTPException(status_code=409, detail=_SSH_KEY_MISSING)

    try:
        private_key_pem = decrypt_private_key(row["sshEncryptedPrivKey"], row["sshKeyNonce"], instance["id"])
        private_key = asyncssh.import_private_key(private_key_pem.decode("utf-8"))
    except Exception:
        logger.exception("Failed to decrypt the container SSH key")
        raise HTTPException(status_code=500, detail="Failed to decrypt SSH key")

    try:
        ssh_conn = await asyncio.wait_for(
            connect_ssh(
                open_conn=lambda: independent_org_conn(request),
                instance_id=instance["id"],
                host=row["host"],
                port=row["sshPort"] or 22,
                username=row["sshUsername"] or "vyos",
                client_keys=[private_key],
            ),
            timeout=_SSH_CONNECT_TIMEOUT,
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="SSH connection timed out")
    except SshHostKeyRejected as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except (OSError, asyncssh.Error) as exc:
        logger.warning("Container SSH connection failed: %s", exc)
        raise HTTPException(status_code=502, detail="SSH connection failed")

    return ssh_conn


def _ssh_text(value: Union[bytes, str, None]) -> str:
    """SSH output as text. run() decodes UTF-8 by default; bytes only appear without it."""
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return value or ""


async def _run_shell_command(
    request: Request,
    command: str,
    timeout: int = _SSH_QUICK_TIMEOUT,
    strip_output: bool = True,
) -> ContainerSSHResponse:
    """Run a plain POSIX shell command (not vbash) via SSH. Caller must pre-validate command.

    strip_output=False keeps stdout byte-for-byte, for a file read whose
    content is written back.
    """
    ssh_conn = await _get_ssh_connection(request)
    try:
        result = await asyncio.wait_for(
            ssh_conn.run(command, check=False),
            timeout=timeout,
        )
        output = _ssh_text(result.stdout)
        if strip_output:
            output = output.strip()
        success = result.exit_status == 0
        return ContainerSSHResponse(
            success=success,
            output=output or None,
            error=None if success else (_ssh_text(result.stderr).strip() or output.strip() or "Command failed"),
        )
    except asyncio.TimeoutError:
        return ContainerSSHResponse(success=False, error="Command timed out")
    except asyncssh.Error as exc:
        logger.warning("Container SSH command failed: %s", exc)
        return ContainerSSHResponse(success=False, error="SSH command failed")
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
    except HTTPException:
        raise
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
        parsed = _container_mapper(service).parse_config(full_config)

        # Image update status is not config-tree parsing. Keep it here.
        resolved = []
        status_tasks = []
        for raw in parsed["containers"]:
            container = ContainerInstance(**raw)
            if container.image:
                status_tasks.append((container, asyncio.create_task(_check_container_image_update_status(http_request, container.image))))
            else:
                resolved.append(container.model_copy(update={"update_status": None}))

        for container, task in status_tasks:
            resolved.append(container.model_copy(update={"update_status": await task}))

        return ContainerConfig(
            configured=parsed["configured"],
            containers=sorted(resolved, key=lambda c: c.name),
            networks=parsed["networks"],
            registries=parsed["registries"],
        )
    except HTTPException:
        raise
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

        # The mapper raises ValueError for a 1.5-only leaf on 1.4. Catch it
        # only around this loop: execute_batch raises ValueError for an empty
        # batch, and that stays a 500.
        try:
            for operation in body.operations:
                _refuse_appliance_stack_batch(operation.op, operation.value)
                # Ops whose first arg is a container/network/registry name
                # must match that name's regex. Prevents seeding the VyOS config
                # with names containing shell metacharacters or leading hyphens
                # that downstream SSH ops would later reject.
                name_pattern = next(
                    (
                        pattern
                        for prefix, pattern in _NAME_PREFIXED_BUILDER_OPS.items()
                        if operation.op.startswith(prefix)
                    ),
                    None,
                )
                # Environment and sysctl values commit empty on both labs.
                call_comma_batch_op(
                    builder,
                    operation.op,
                    operation.value,
                    may_be_empty=("value",),
                    name_pattern=name_pattern,
                )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Container configuration updated"} if response.status == 200 else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in container_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# GraphQL Endpoints — container image / instance operations
# These use the VyOS GraphQL mutations the container mapper returns
# (AddImageContainer / DeleteImageContainer / RestartContainer). All require
# CONTAINER WRITE permission and a configured SSH key on the instance (the
# credential gate is unchanged from the old SSH implementation).
# ============================================================================


class ContainerImageRefRequest(BaseModel):
    image: str = Field(..., description="Image reference (e.g. adguard/adguardhome:latest)")


def _validate_image_ref(image: str):
    if not image or not _IMAGE_REF_RE.fullmatch(image):
        raise HTTPException(status_code=400, detail=_INVALID_IMAGE_REF)


def _normalize_image_ref(image: str) -> str:
    value = image.strip()
    if not value:
        return value
    if ":" not in value.split("/")[-1]:
        value = f"{value}:latest"
    return value


def _parse_image_reference(image: str) -> tuple[str, str, str]:
    ref = image.strip()
    if not ref:
        return "", "", "latest"

    if "@" in ref:
        ref = ref.split("@", 1)[0]

    if "/" not in ref:
        if ":" in ref:
            name, tag = ref.rsplit(":", 1)
            return "docker.io", name, tag
        return "docker.io", ref, "latest"

    first, remainder = ref.split("/", 1)
    if "." in first or ":" in first or first == "localhost":
        registry = first
        path = remainder
    else:
        registry = "docker.io"
        path = ref

    if ":" in path.rsplit("/", 1)[-1]:
        path_no_tag, tag = path.rsplit(":", 1)
        return registry, path_no_tag, tag

    return registry, path, "latest"


def _is_newer_image_tag(current_tag: Optional[str], latest_tag: Optional[str]) -> bool:
    if not current_tag or not latest_tag or current_tag == latest_tag:
        return False
    if current_tag.lower() == "latest" or latest_tag.lower() == "latest":
        return False

    def _coerce_version(value: str):
        cleaned = value.strip().lower()
        if cleaned.startswith("v"):
            cleaned = cleaned[1:]
        try:
            return Version(cleaned)
        except InvalidVersion:
            return None

    current_version = _coerce_version(current_tag)
    latest_version = _coerce_version(latest_tag)

    if current_version is None or latest_version is None:
        return False
    return latest_version > current_version


async def _check_container_image_update_status(request: Request, image: str) -> Optional[ContainerImageUpdateStatus]:
    image_ref = (image or "").strip()
    if not image_ref:
        return None

    normalized = _normalize_image_ref(image_ref)
    registry, repository, current_tag = _parse_image_reference(normalized)
    if not repository or not current_tag:
        return None

    if current_tag.lower() == "latest":
        return ContainerImageUpdateStatus(
            available=False,
            current_tag=current_tag,
            latest_tag=current_tag,
            registry=registry,
            checked_at=datetime.now(timezone.utc).isoformat(),
        )

    if registry != "docker.io" or "/" not in repository:
        return None

    try:
        namespace, name = repository.split("/", 1)
        latest_url = f"https://hub.docker.com/v2/repositories/{namespace}/{name}/tags?page_size=100"
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(latest_url)
        if response.status_code != 200:
            return None

        payload = response.json() or {}
        results = payload.get("results") or []
        latest = None
        for entry in results:
            tag = (entry or {}).get("name")
            if not tag or tag.lower() == "latest":
                continue
            if _is_newer_image_tag(current_tag, tag):
                latest = tag
                break

        if latest is None:
            return ContainerImageUpdateStatus(
                available=False,
                current_tag=current_tag,
                latest_tag=current_tag,
                registry=registry,
                checked_at=datetime.now(timezone.utc).isoformat(),
            )

        return ContainerImageUpdateStatus(
            available=True,
            current_tag=current_tag,
            latest_tag=latest,
            registry=registry,
            checked_at=datetime.now(timezone.utc).isoformat(),
        )
    except Exception:
        logger.exception("Failed to resolve Docker tag metadata for %s", image_ref)
        return None


@router.post("/image/pull", response_model=ContainerSSHResponse)
@router.post("/image/update-ref", response_model=ContainerSSHResponse)
async def container_image_pull_ref(request: Request, body: ContainerImageRefRequest):
    """Pull, or re-pull, an image by reference (add/update container image <image-ref>)."""
    await require_write_permission(request, FeatureGroup.CONTAINER)
    _validate_image_ref(body.image)
    service = get_session_vyos_service(request)
    mapper = _container_mapper(service)
    return await _run_container_gql_command(
        request, service, mapper.add_image_mutation(), body.image, _GQL_IMAGE_TIMEOUT, name_re=_IMAGE_REF_RE
    )


@router.post("/image/delete-ref", response_model=ContainerSSHResponse)
async def container_image_delete_ref(request: Request, body: ContainerImageRefRequest):
    """Delete an image by reference (delete container image <image-ref>)."""
    await require_write_permission(request, FeatureGroup.CONTAINER)
    _validate_image_ref(body.image)
    _refuse_stack_image(body.image)
    service = get_session_vyos_service(request)
    mapper = _container_mapper(service)
    return await _run_container_gql_command(
        request, service, mapper.delete_image_mutation(), body.image, _GQL_QUICK_TIMEOUT, name_re=_IMAGE_REF_RE
    )


@router.post("/image/add", response_model=ContainerSSHResponse)
@router.post("/image/update", response_model=ContainerSSHResponse)
async def container_image_pull_configured(request: Request, body: ContainerImageRequest):
    """Pull, or re-pull, the image configured on a container.

    VyOS op-mode ``update container image <name>`` takes a container name, but
    GraphQL only exposes AddImageContainer, which takes an image reference (as
    op-mode ``add container image`` does). Resolve the image from config, then
    pull that ref.
    """
    await require_write_permission(request, FeatureGroup.CONTAINER)
    _require_container_name(body.container_name)
    service = get_session_vyos_service(request)
    mapper = _container_mapper(service)
    image = await _configured_container_image(service, mapper, body.container_name)
    return await _run_container_gql_command(
        request, service, mapper.add_image_mutation(), image, _GQL_IMAGE_TIMEOUT, name_re=_IMAGE_REF_RE
    )


@router.post("/image/delete", response_model=ContainerSSHResponse)
async def container_image_delete(request: Request, body: ContainerImageRequest):
    """Remove the image configured on a container.

    Op-mode ``delete container image`` takes an image id or reference, so the
    image is resolved from the container's config first.
    """
    await require_write_permission(request, FeatureGroup.CONTAINER)
    _require_container_name(body.container_name)
    if appliance_mode.is_appliance() and appliance_mode.is_stack_container(body.container_name):
        raise HTTPException(status_code=400, detail=appliance_mode.STACK_GUARD_DETAIL)
    service = get_session_vyos_service(request)
    mapper = _container_mapper(service)
    image = await _configured_container_image(service, mapper, body.container_name)
    _refuse_stack_image(image)
    return await _run_container_gql_command(
        request, service, mapper.delete_image_mutation(), image, _GQL_QUICK_TIMEOUT, name_re=_IMAGE_REF_RE
    )


@router.post("/restart", response_model=ContainerSSHResponse)
async def container_restart(request: Request, body: ContainerImageRequest):
    """Restart a running container (restart container name <name>)."""
    await require_write_permission(request, FeatureGroup.CONTAINER)
    _require_container_name(body.container_name)
    service = get_session_vyos_service(request)
    mapper = _container_mapper(service)
    return await _run_container_gql_command(
        request, service, mapper.restart_mutation(), body.container_name, _GQL_QUICK_TIMEOUT
    )


# ============================================================================
# Show Endpoints — read-only device queries via pyvyos (no SSH required)
# ============================================================================

_IMAGES_SHOW_FAILED = "Failed to list container images"
_LOG_SHOW_FAILED = "Failed to retrieve container log"


async def _show_output(service: Any, path: List[str], detail: str) -> str:
    """Op-mode show output; 502 when the device refuses or cannot be reached.

    A failed show is not empty output: the caller would report no images or
    an empty log for a device error.
    """
    try:
        response = await run_in_threadpool(service.device.show, path=path)
    except RequestException as e:
        logger.warning("Container show %s request failed: %s", " ".join(path), e)
        raise HTTPException(status_code=502, detail=detail)
    if response.status != 200 or response.error:
        logger.warning(
            "Container show %s failed (status %s): %s", " ".join(path), response.status, response.error
        )
        raise HTTPException(status_code=502, detail=detail)
    return response.result if isinstance(response.result, str) else ""


@router.get("/images", response_model=ContainerImagesResponse)
async def get_container_images(http_request: Request):
    """Return a list of container images pulled on the device."""
    await require_read_permission(http_request, FeatureGroup.CONTAINER)
    try:
        service = get_session_vyos_service(http_request)
        mapper = _container_mapper(service)
        output = await _show_output(service, mapper.get_image_show_path(), _IMAGES_SHOW_FAILED)

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
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_container_images")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/log", response_model=ContainerSSHResponse)
async def get_container_log(http_request: Request, body: ContainerImageRequest):
    """Return log output for a container."""
    await require_read_permission(http_request, FeatureGroup.CONTAINER)
    _require_container_name(body.container_name)
    try:
        service = get_session_vyos_service(http_request)
        mapper = _container_mapper(service)
        output = await _show_output(service, mapper.get_log_show_path(body.container_name), _LOG_SHOW_FAILED)
        return ContainerSSHResponse(success=True, output=output.strip() or None, error=None)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_container_log")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Filesystem / Directory Endpoints (SSH — plain shell, not vbash)
# ============================================================================


def _require_container_path(path: str) -> None:
    """HTTP 400 unless path is a safe path under /config/containers/.

    On the appliance the stack's volumes (its database among them) are refused
    for every read and write, the same as rmdir.
    """
    if not _SAFE_CONTAINER_SUBPATH_RE.fullmatch(path):
        raise HTTPException(status_code=400, detail=f"Invalid path: {path}")
    if appliance_mode.is_appliance() and appliance_mode.is_stack_volume_path(path):
        raise HTTPException(status_code=400, detail=appliance_mode.STACK_GUARD_DETAIL)


@router.get("/base-dir", response_model=ContainerBaseDirResponse)
async def check_base_dir(http_request: Request):
    """Check whether /config/containers exists on the device."""
    await require_read_permission(http_request, FeatureGroup.CONTAINER)
    result = await _run_shell_command(
        http_request,
        "test -d /config/containers && echo exists || echo missing",
    )
    if not result.success:
        # A failed check is not a missing directory: do not offer to create it.
        raise HTTPException(status_code=502, detail=result.error or "Command failed")
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
        _require_container_path(path)
    quoted = " ".join(shlex.quote(p) for p in body.paths)
    return await _run_shell_command(http_request, f"sudo mkdir -p {quoted}")


class ContainerTouchRequest(BaseModel):
    paths: List[str] = Field(..., description="File paths under /config/containers/ to create if absent")


class ContainerFileResponse(BaseModel):
    success: bool
    content: Optional[str] = None
    error: Optional[str] = None


class ContainerFileWriteRequest(BaseModel):
    path: str = Field(..., description="File path under /config/containers/ to write")
    content: str = Field(..., description="New file content")


@router.post("/touch", response_model=ContainerSSHResponse)
async def touch_container_files(http_request: Request, body: ContainerTouchRequest):
    """Create one or more files under /config/containers/ without truncating existing ones."""
    await require_write_permission(http_request, FeatureGroup.CONTAINER)
    if not body.paths:
        return ContainerSSHResponse(success=True)
    for path in body.paths:
        _require_container_path(path)
    quoted = " ".join(shlex.quote(p) for p in body.paths)
    return await _run_shell_command(http_request, f"sudo touch {quoted}")


@router.get("/file", response_model=ContainerFileResponse)
async def read_container_file(http_request: Request, path: str):
    """Read a file under /config/containers/."""
    await require_read_permission(http_request, FeatureGroup.CONTAINER)
    _require_container_path(path)
    result = await _run_shell_command(http_request, f"sudo cat {shlex.quote(path)}", strip_output=False)
    if not result.success:
        return ContainerFileResponse(success=False, error=result.error)
    return ContainerFileResponse(success=True, content=result.output or "")


@router.post("/file", response_model=ContainerSSHResponse)
async def write_container_file(http_request: Request, body: ContainerFileWriteRequest):
    """Back up then overwrite a file under /config/containers/."""
    await require_write_permission(http_request, FeatureGroup.CONTAINER)
    _require_container_path(body.path)
    bak = body.path + ".bak"
    if not _SAFE_CONTAINER_SUBPATH_RE.fullmatch(bak):
        raise HTTPException(status_code=400, detail="Backup path invalid")
    ssh_conn = await _get_ssh_connection(http_request)
    try:
        await asyncio.wait_for(
            ssh_conn.run(f"sudo cp {shlex.quote(body.path)} {shlex.quote(bak)} 2>/dev/null || true", check=False),
            timeout=_SSH_QUICK_TIMEOUT,
        )
        result = await asyncio.wait_for(
            ssh_conn.run(f"sudo tee {shlex.quote(body.path)} > /dev/null", input=body.content, check=False),
            timeout=_SSH_QUICK_TIMEOUT,
        )
        success = result.exit_status == 0
        return ContainerSSHResponse(
            success=success,
            error=None if success else (_ssh_text(result.stderr).strip() or "Write failed"),
        )
    except asyncio.TimeoutError:
        return ContainerSSHResponse(success=False, error="Command timed out")
    except asyncssh.Error as exc:
        logger.warning("Container SSH file write failed: %s", exc)
        return ContainerSSHResponse(success=False, error="SSH command failed")
    finally:
        ssh_conn.close()


class ContainerRmdirRequest(BaseModel):
    path: str = Field(..., description="Path under /config/containers/ to remove")


@router.post("/rmdir", response_model=ContainerSSHResponse)
async def remove_container_dir(http_request: Request, body: ContainerRmdirRequest):
    """Recursively remove a directory under /config/containers/."""
    await require_write_permission(http_request, FeatureGroup.CONTAINER)
    _require_container_path(body.path)
    return await _run_shell_command(http_request, f"sudo rm -rf {shlex.quote(body.path)}")
