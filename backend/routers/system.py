"""
System Configuration Endpoints

API endpoints for managing VyOS system configuration:
  - GET  /vyos/system/capabilities  — version-aware feature flags
  - GET  /vyos/system/config        — full system config (all subsections)
  - POST /vyos/system/batch         — atomic batch operations
  - GET  /vyos/system/info          — instance/connection info (legacy)
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
import inspect
import logging

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from vyos_mappers import CommandMapperRegistry
from vyos_builders import SystemBatchBuilder
from utils.archive_url import (
    list_archive_files as _list_archive_files,
    fetch_archive_file_content,
    transform_archive_to_load_url,
    validate_filename,
)
from utils.vyos_config_parser import parse_vyos_config
from batch_dispatch import resolve_batch_method

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/system", tags=["system"])


# =============================================================================
# Pydantic models — Response
# =============================================================================


class SystemInfo(BaseModel):
    """System information response model."""
    instance_id: str
    instance_name: str
    site_name: str
    vyos_version: str
    connection_host: str
    connected: bool


class LoginSshKey(BaseModel):
    key_name: str
    key_type: Optional[str] = None


class LoginUser(BaseModel):
    username: str
    full_name: Optional[str] = None
    has_password: bool = False
    ssh_keys: List[LoginSshKey] = Field(default_factory=list)


class LoginBanners(BaseModel):
    pre_login: Optional[str] = None
    post_login: Optional[str] = None


class LoginConfig(BaseModel):
    users: List[LoginUser] = Field(default_factory=list)
    timeout: Optional[int] = None
    banners: LoginBanners = Field(default_factory=LoginBanners)
    operator_groups: List[str] = Field(default_factory=list)


class SyslogFacility(BaseModel):
    facility: str
    level: str


class SyslogRemoteHost(BaseModel):
    host: str
    facilities: List[SyslogFacility] = Field(default_factory=list)
    port: Optional[int] = None
    protocol: Optional[str] = None


class SyslogFileEntry(BaseModel):
    filename: str
    facilities: List[SyslogFacility] = Field(default_factory=list)


class SyslogUserEntry(BaseModel):
    username: str
    facilities: List[SyslogFacility] = Field(default_factory=list)


class SyslogConfig(BaseModel):
    """Normalised syslog config — local/global mapped to 'local_facilities'."""
    local_facilities: List[SyslogFacility] = Field(default_factory=list)
    preserve_fqdn: bool = False
    remote_hosts: List[SyslogRemoteHost] = Field(default_factory=list)
    console_facilities: List[SyslogFacility] = Field(default_factory=list)
    # 1.4 only
    files: List[SyslogFileEntry] = Field(default_factory=list)
    users: List[SyslogUserEntry] = Field(default_factory=list)


class ConntrackConfig(BaseModel):
    modules: List[str] = Field(default_factory=list)
    table_size: Optional[int] = None
    hash_size: Optional[int] = None
    expect_table_size: Optional[int] = None
    tcp_loose: Optional[str] = None
    tcp_half_open_connections: Optional[int] = None
    tcp_max_retrans: Optional[int] = None


class ConfigManagement(BaseModel):
    commit_revisions: Optional[int] = None
    archive_locations: List[str] = Field(default_factory=list)


class StaticHostEntry(BaseModel):
    hostname: str
    inet: List[str] = Field(default_factory=list)
    aliases: List[str] = Field(default_factory=list)


class ConsoleDevice(BaseModel):
    device: str
    speed: Optional[str] = None
    powersave: bool = False


class SysctlParameter(BaseModel):
    parameter: str
    value: str


class WatchdogConfig(BaseModel):
    timeout: Optional[int] = None
    reboot_timeout: Optional[int] = None


class SyslogMarker(BaseModel):
    interval: Optional[int] = None
    disabled: bool = False


class RadiusServer(BaseModel):
    server: str
    port: Optional[int] = None
    timeout: Optional[int] = None


class RadiusConfig(BaseModel):
    servers: List[RadiusServer] = Field(default_factory=list)
    source_address: Optional[str] = None
    timeout: Optional[int] = None


class TacacsServer(BaseModel):
    server: str
    port: Optional[int] = None
    timeout: Optional[int] = None


class TacacsConfig(BaseModel):
    servers: List[TacacsServer] = Field(default_factory=list)
    source_address: Optional[str] = None
    timeout: Optional[int] = None


class ConntrackLogEntry(BaseModel):
    event: str
    protocol: str


class ConntrackLog(BaseModel):
    entries: List[ConntrackLogEntry] = Field(default_factory=list)


class ConntrackIgnoreRule(BaseModel):
    rule_id: int
    ip_version: str = "ipv4"
    protocol: Optional[str] = None
    source_address: Optional[str] = None
    source_port: Optional[str] = None
    destination_address: Optional[str] = None
    destination_port: Optional[str] = None
    inbound_interface: Optional[str] = None


class ConntrackTcpTimeouts(BaseModel):
    close: Optional[int] = None
    close_wait: Optional[int] = None
    established: Optional[int] = None
    fin_wait: Optional[int] = None
    last_ack: Optional[int] = None
    syn_recv: Optional[int] = None
    syn_sent: Optional[int] = None
    time_wait: Optional[int] = None


class ConntrackUdpTimeouts(BaseModel):
    other: Optional[int] = None
    stream: Optional[int] = None


class ConntrackGlobalTimeouts(BaseModel):
    icmp: Optional[int] = None
    other: Optional[int] = None
    tcp: ConntrackTcpTimeouts = Field(default_factory=ConntrackTcpTimeouts)
    udp: ConntrackUdpTimeouts = Field(default_factory=ConntrackUdpTimeouts)


class ConntrackTimeoutRuleProtocol(BaseModel):
    close: Optional[int] = None
    close_wait: Optional[int] = None
    established: Optional[int] = None
    fin_wait: Optional[int] = None
    last_ack: Optional[int] = None
    syn_recv: Optional[int] = None
    syn_sent: Optional[int] = None
    time_wait: Optional[int] = None
    other: Optional[int] = None
    stream: Optional[int] = None


class ConntrackTimeoutCustomRule(BaseModel):
    rule_id: int
    ip_version: str = "ipv4"
    protocol: Optional[str] = None
    source_address: Optional[str] = None
    destination_address: Optional[str] = None
    tcp: Optional[ConntrackTimeoutRuleProtocol] = None
    udp: Optional[ConntrackTimeoutRuleProtocol] = None


class IpSettings(BaseModel):
    arp_ndp_table_size: Optional[int] = None
    disable_forwarding: bool = False
    multipath_ignore_unreachable: bool = False
    multipath_layer4_hashing: bool = False
    nht_no_resolve_via_default: bool = False


class Ipv6Settings(BaseModel):
    disable_forwarding: bool = False
    multipath_layer4_hashing: bool = False
    nht_no_resolve_via_default: bool = False
    strict_dad: bool = False
    neighbor_table_size: Optional[int] = None


class LcdConfig(BaseModel):
    device: Optional[str] = None
    address: Optional[str] = None
    model: Optional[str] = None


class LogrotateConfig(BaseModel):
    max_size: Optional[int] = None
    rotate_count: Optional[int] = None


class LogsConfig(BaseModel):
    atop: Optional[LogrotateConfig] = None
    messages: Optional[LogrotateConfig] = None


class KernelCpuOptions(BaseModel):
    disable_nmi_watchdog: bool = False
    isolate_cpus: Optional[str] = None
    nohz_full: Optional[str] = None
    rcu_no_cbs: Optional[str] = None


class KernelMemoryOptions(BaseModel):
    default_hugepage_size: Optional[str] = None
    disable_numa_balancing: bool = False
    hugepage_size: Optional[str] = None


class KernelOptions(BaseModel):
    disable_hpet: bool = False
    disable_mce: bool = False
    disable_softlockup: bool = False
    cpu: Optional[KernelCpuOptions] = None
    memory: Optional[KernelMemoryOptions] = None


class ResourceLimits(BaseModel):
    max_map_count: Optional[int] = None
    shmmax: Optional[int] = None


class HttpClientOptions(BaseModel):
    source_address: Optional[str] = None
    source_interface: Optional[str] = None


class SshClientOptions(BaseModel):
    source_address: Optional[str] = None
    source_interface: Optional[str] = None


class SystemOptions(BaseModel):
    keyboard_layout: Optional[str] = None
    time_format: Optional[str] = None
    ctrl_alt_delete: Optional[str] = None
    startup_beep: bool = False
    disable_usb_autosuspend: bool = False
    reboot_on_panic: bool = False
    root_partition_auto_resize: bool = False
    reboot_on_upgrade_failure: bool = False
    resource_limits: Optional[ResourceLimits] = None
    kernel: Optional[KernelOptions] = None
    http_client: Optional[HttpClientOptions] = None
    ssh_client: Optional[SshClientOptions] = None


class ProxyConfig(BaseModel):
    url: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    no_proxy: List[str] = Field(default_factory=list)


class NetflowServer(BaseModel):
    server: str
    port: Optional[int] = None
    source_address: Optional[str] = None


class NetflowTimeouts(BaseModel):
    expiry_interval: Optional[int] = None
    flow_generic: Optional[int] = None
    icmp: Optional[int] = None
    max_active_life: Optional[int] = None
    tcp_fin: Optional[int] = None
    tcp_generic: Optional[int] = None
    udp: Optional[int] = None


class NetflowConfig(BaseModel):
    engine_id: Optional[int] = None
    max_flows: Optional[int] = None
    sampling_rate: Optional[int] = None
    source_address: Optional[str] = None
    version: Optional[str] = None
    servers: List[NetflowServer] = Field(default_factory=list)
    timeouts: Optional[NetflowTimeouts] = None


class SflowServer(BaseModel):
    server: str
    port: Optional[int] = None
    source_address: Optional[str] = None


class SflowConfig(BaseModel):
    agent_address: Optional[str] = None
    sampling_rate: Optional[int] = None
    servers: List[SflowServer] = Field(default_factory=list)


class FlowAccountingConfig(BaseModel):
    interfaces: List[str] = Field(default_factory=list)
    netflow: Optional[NetflowConfig] = None
    sflow: Optional[SflowConfig] = None


class TaskSchedulerTask(BaseModel):
    name: str
    crontab_spec: Optional[str] = None
    interval: Optional[str] = None
    executable_path: Optional[str] = None
    executable_arguments: Optional[str] = None


class UpdateCheckConfig(BaseModel):
    url: Optional[str] = None
    auto_install: bool = False


class FrrBmpTarget(BaseModel):
    name: str
    address: Optional[str] = None
    port: Optional[int] = None


class FrrBmpConfig(BaseModel):
    targets: List[FrrBmpTarget] = Field(default_factory=list)


class FrrConfig(BaseModel):
    profile: Optional[str] = None
    bmp: Optional[FrrBmpConfig] = None


class AccelerationConfig(BaseModel):
    qat_devices: List[str] = Field(default_factory=list)


class SystemConfig(BaseModel):
    """Full system configuration across all subsections."""
    hostname: Optional[str] = None
    domain_name: Optional[str] = None
    domain_search: List[str] = Field(default_factory=list)
    name_servers: List[str] = Field(default_factory=list)
    time_zone: Optional[str] = None
    performance: Optional[str] = None
    # Login
    login: LoginConfig = Field(default_factory=LoginConfig)
    max_login_session: Optional[int] = None
    login_radius: Optional[RadiusConfig] = None
    login_tacacs: Optional[TacacsConfig] = None
    # Syslog
    syslog: SyslogConfig = Field(default_factory=SyslogConfig)
    syslog_marker: Optional[SyslogMarker] = None
    # Conntrack
    conntrack: ConntrackConfig = Field(default_factory=ConntrackConfig)
    conntrack_log: Optional[ConntrackLog] = None
    conntrack_ignore: List[ConntrackIgnoreRule] = Field(default_factory=list)
    conntrack_global_timeouts: Optional[ConntrackGlobalTimeouts] = None
    conntrack_timeout_custom: List[ConntrackTimeoutCustomRule] = Field(default_factory=list)
    # Network IP settings
    ip: Optional[IpSettings] = None
    ipv6: Optional[Ipv6Settings] = None
    # Config management
    config_management: ConfigManagement = Field(default_factory=ConfigManagement)
    static_host_mapping: List[StaticHostEntry] = Field(default_factory=list)
    console_devices: List[ConsoleDevice] = Field(default_factory=list)
    sysctl_parameters: List[SysctlParameter] = Field(default_factory=list)
    # Watchdog (1.5 only)
    watchdog: Optional[WatchdogConfig] = None
    # Wireless (1.5 only)
    wireless_country_code: Optional[str] = None
    # FRR
    frr: Optional[FrrConfig] = None
    # LCD
    lcd: Optional[LcdConfig] = None
    # Logs / logrotate
    logs: Optional[LogsConfig] = None
    # System options (kernel, resource-limits, http/ssh-client)
    options: Optional[SystemOptions] = None
    # Proxy
    proxy: Optional[ProxyConfig] = None
    # Flow accounting
    flow_accounting: Optional[FlowAccountingConfig] = None
    # sFlow standalone (1.5 top-level)
    sflow: Optional[SflowConfig] = None
    # Task scheduler
    task_scheduler: List[TaskSchedulerTask] = Field(default_factory=list)
    # Update check
    update_check: Optional[UpdateCheckConfig] = None
    # Acceleration (QAT)
    acceleration: Optional[AccelerationConfig] = None


# =============================================================================
# Pydantic models — Batch request
# =============================================================================


class SystemBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Value for the operation. For methods needing two extra args, "
            "use comma-separated: 'arg1,arg2'."
        ),
    )


class SystemBatchRequest(BaseModel):
    item_name: str = Field(..., description="Primary item identifier (hostname, username, IP, …)")
    operations: List[SystemBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class GeneralSettingsRequest(BaseModel):
    """Atomic update for all general system settings in one VyOS commit."""
    hostname: Optional[str] = None
    clear_hostname: bool = False
    domain_name: Optional[str] = None
    clear_domain_name: bool = False
    time_zone: Optional[str] = None
    clear_time_zone: bool = False
    performance: Optional[str] = None
    clear_performance: bool = False
    name_servers_add: List[str] = Field(default_factory=list)
    name_servers_remove: List[str] = Field(default_factory=list)


class LoginSettingsRequest(BaseModel):
    """Atomic update for login timeout and banners in one VyOS commit."""
    timeout: Optional[int] = None
    clear_timeout: bool = False
    pre_login_banner: Optional[str] = None
    clear_pre_login_banner: bool = False
    post_login_banner: Optional[str] = None
    clear_post_login_banner: bool = False


class WatchdogSettingsRequest(BaseModel):
    """Atomic update for watchdog timeout and reboot-timeout in one VyOS commit."""
    timeout: Optional[int] = None
    clear_timeout: bool = False
    reboot_timeout: Optional[int] = None
    clear_reboot_timeout: bool = False


class ConfigRestoreRequest(BaseModel):
    """Request to restore config from an archive location."""
    archive_location: str = Field(..., description="Archive URL (must be in device config)")
    filename: str = Field(..., description="Backup filename to restore")



# =============================================================================
# Endpoint 0: General settings (single atomic commit)
# =============================================================================


@router.post("/general", response_model=VyOSResponse)
async def update_general_settings(
    http_request: Request,
    body: GeneralSettingsRequest,
) -> VyOSResponse:
    """
    Update all general system settings in a single VyOS commit.

    Combines hostname, domain, timezone, performance, and name-server changes
    that would otherwise require separate /batch calls (each needing a different
    item_name) into one atomic operation.
    """
    await require_write_permission(http_request, FeatureGroup.SYSTEM)
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = SystemBatchBuilder(version=version)

        if body.hostname:
            builder.set_hostname(body.hostname)
        elif body.clear_hostname:
            builder.delete_hostname()

        if body.domain_name:
            builder.set_domain_name(body.domain_name)
        elif body.clear_domain_name:
            builder.delete_domain_name()

        if body.time_zone:
            builder.set_time_zone(body.time_zone)
        elif body.clear_time_zone:
            builder.delete_time_zone()

        # Performance uses its own mapper but ops go into the same builder/commit
        if body.performance:
            perf_mapper = CommandMapperRegistry.get_mapper("system_performance", version)
            builder.add_set(perf_mapper.get_performance_set_path(body.performance))
        elif body.clear_performance:
            perf_mapper = CommandMapperRegistry.get_mapper("system_performance", version)
            builder.add_delete(perf_mapper.get_performance_delete_path())

        for ns in body.name_servers_remove:
            builder.delete_name_server(ns)
        for ns in body.name_servers_add:
            builder.add_name_server(ns)

        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No changes to apply"})

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "General settings updated"},
            error=response.error if response.error else None,
        )
    except Exception:
        logger.exception("Unhandled error in update_general_settings")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# Endpoint 0b: Login settings (single atomic commit)
# =============================================================================


@router.post("/login-settings", response_model=VyOSResponse)
async def update_login_settings(
    http_request: Request,
    body: LoginSettingsRequest,
) -> VyOSResponse:
    """
    Update login timeout and banners in a single VyOS commit.

    Combines timeout, pre-login banner, and post-login banner changes that
    would otherwise require separate /batch calls (each needing a different
    item_name) into one atomic operation.
    """
    await require_write_permission(http_request, FeatureGroup.SYSTEM)
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = SystemBatchBuilder(version=version)

        if body.timeout is not None:
            builder.set_login_timeout(str(body.timeout))
        elif body.clear_timeout:
            builder.delete_login_timeout()

        if body.pre_login_banner is not None:
            builder.set_pre_login_banner(body.pre_login_banner)
        elif body.clear_pre_login_banner:
            builder.delete_pre_login_banner()

        if body.post_login_banner is not None:
            builder.set_post_login_banner(body.post_login_banner)
        elif body.clear_post_login_banner:
            builder.delete_post_login_banner()

        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No changes to apply"})

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Login settings updated"},
            error=response.error if response.error else None,
        )
    except Exception:
        logger.exception("Unhandled error in update_login_settings")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# Endpoint 0c: Watchdog settings (single atomic commit)
# =============================================================================


@router.post("/watchdog-settings", response_model=VyOSResponse)
async def update_watchdog_settings(
    http_request: Request,
    body: WatchdogSettingsRequest,
) -> VyOSResponse:
    """
    Update watchdog timeout and reboot-timeout in a single VyOS commit.

    Combines both timeout fields that would otherwise need separate /batch
    calls (each needing a different item_name) into one atomic operation.
    """
    await require_write_permission(http_request, FeatureGroup.SYSTEM)
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = SystemBatchBuilder(version=version)

        if body.timeout is not None:
            builder.set_watchdog_timeout(str(body.timeout))
        elif body.clear_timeout:
            builder.delete_watchdog_timeout()

        if body.reboot_timeout is not None:
            builder.set_watchdog_reboot_timeout(str(body.reboot_timeout))

        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No changes to apply"})

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Watchdog settings updated"},
            error=response.error if response.error else None,
        )
    except Exception:
        logger.exception("Unhandled error in update_watchdog_settings")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# Endpoint 0d: List archive files
# =============================================================================


@router.get("/config/archive-files")
async def list_archive_files_endpoint(request: Request, archive_location: str):
    """
    List available backup files at a configured archive location.

    The archive_location must be present in the device's commit-archive config.
    """
    await require_read_permission(request, FeatureGroup.SYSTEM)
    try:
        service = get_session_vyos_service(request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=False)
        mapper = CommandMapperRegistry.get_mapper("system", service.get_version())
        locations = mapper.parse_config_management(
            full_config.get("system", {}) or {}
        )["archive_locations"]

        if archive_location not in locations:
            raise HTTPException(
                status_code=400,
                detail="Archive location not found in device configuration",
            )

        # Use the value from device config (not user input) to break taint chain
        validated_location = locations[locations.index(archive_location)]
        files = await _list_archive_files(validated_location)
        return {"files": files, "archive_location": validated_location}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in list_archive_files_endpoint")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# Endpoint 0e: Diff current config vs a remote archive backup
# =============================================================================


def _normalize(v: Any) -> Any:
    """Unwrap single-element lists so ["us"] == "us" when diffing."""
    if isinstance(v, list) and len(v) == 1:
        return v[0]
    return v


def _deep_diff(current: Dict, saved: Dict, path: str = "") -> tuple:
    """Recursively compare two configuration dicts. Returns (added, removed, modified)."""
    added: Dict[str, Any] = {}
    removed: Dict[str, Any] = {}
    modified: Dict[str, Any] = {}

    for key in current:
        full = f"{path}.{key}" if path else key
        if key not in saved:
            added[full] = current[key]
        elif isinstance(current[key], dict) and isinstance(saved[key], dict):
            a, r, m = _deep_diff(current[key], saved[key], full)
            added.update(a)
            removed.update(r)
            modified.update(m)
        elif _normalize(current[key]) != _normalize(saved[key]):
            modified[full] = {"old": saved[key], "new": current[key]}

    for key in saved:
        if key not in current:
            full = f"{path}.{key}" if path else key
            removed[full] = saved[key]

    return added, removed, modified


@router.get("/config/archive-diff")
async def get_archive_diff(request: Request, archive_location: str, filename: str):
    """
    Compare current running config with a remote archive backup file.

    Returns the same ConfigDiffResponse shape as /vyos/config/diff so the
    frontend can reuse the same diff-rendering component.
    """
    await require_read_permission(request, FeatureGroup.CONFIGURATION)
    try:
        if not validate_filename(filename):
            raise HTTPException(status_code=400, detail="Invalid filename format")

        service = get_session_vyos_service(request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=False)
        mapper = CommandMapperRegistry.get_mapper("system", service.get_version())
        locations = mapper.parse_config_management(
            full_config.get("system", {}) or {}
        )["archive_locations"]

        if archive_location not in locations:
            raise HTTPException(
                status_code=400,
                detail="Archive location not found in device configuration",
            )

        validated_location = locations[locations.index(archive_location)]

        try:
            content = await fetch_archive_file_content(validated_location, filename)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        try:
            backup_config = parse_vyos_config(content)
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Failed to parse backup file: {exc}")

        current_config = await run_in_threadpool(service.get_full_config, refresh=False)
        added, removed, modified = _deep_diff(backup_config, current_config)

        return {
            "has_changes": bool(added or removed or modified),
            "added": added,
            "removed": removed,
            "modified": modified,
            "summary": {
                "added": len(added),
                "removed": len(removed),
                "modified": len(modified),
            },
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_archive_diff")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# Endpoint 0f: Restore config from archive
# =============================================================================


@router.post("/config/restore", response_model=VyOSResponse)
async def restore_config(http_request: Request, body: ConfigRestoreRequest):
    """
    Restore configuration from a backup file at an archive location.

    Validates:
      - archive_location is in device config
      - filename matches allowed pattern (prevents path traversal)

    Uses VyOS config_file_load API with protocol-specific URL transformation.
    """
    await require_write_permission(http_request, FeatureGroup.SYSTEM)
    try:
        if not validate_filename(body.filename):
            raise HTTPException(
                status_code=400,
                detail="Invalid filename format",
            )

        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=False)
        mapper = CommandMapperRegistry.get_mapper("system", service.get_version())
        locations = mapper.parse_config_management(
            full_config.get("system", {}) or {}
        )["archive_locations"]

        if body.archive_location not in locations:
            raise HTTPException(
                status_code=400,
                detail="Archive location not found in device configuration",
            )

        # Use the value from device config (not user input) to break taint chain
        validated_location = locations[locations.index(body.archive_location)]

        try:
            load_url = transform_archive_to_load_url(
                validated_location, body.filename
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        response = await run_in_threadpool(service.device.config_file_load, file=load_url)
        return VyOSResponse(
            success=response.status == 200,
            data=response.result if response.result else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in restore_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# Endpoint 1: Capabilities
# =============================================================================


@router.get("/capabilities")
async def get_system_capabilities(request: Request) -> Dict[str, Any]:
    """
    Return version-aware feature flags for the system section.

    The frontend uses this to:
    - Know which syslog model is active (local vs global, remote vs host)
    - Know which features are 1.5-only (watchdog, wireless, operator-group)
    - Show the correct performance profile options
    - Show available conntrack modules
    """
    await require_read_permission(request, FeatureGroup.SYSTEM)
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = SystemBatchBuilder(version=version)
        caps = builder.get_capabilities()

        # Merge performance capabilities
        perf_mapper = CommandMapperRegistry.get_mapper("system_performance", version)
        perf_options = perf_mapper.get_valid_performance_options()
        caps["performance_options"] = [
            {"value": v, "label": label, "description": desc}
            for v, label, desc in perf_options
        ]

        return caps
    except Exception:
        logger.exception("Unhandled error in get_system_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# Endpoint 2: Config
# =============================================================================


@router.get("/config", response_model=SystemConfig)
async def get_system_config(request: Request, refresh: bool = False) -> SystemConfig:
    """
    Return full system configuration across all subsections.

    Config is normalised for both VyOS 1.4 and 1.5 — the frontend does not
    need to know the VyOS version to render the data.
    """
    await require_read_permission(request, FeatureGroup.SYSTEM)
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("system", version)
        return SystemConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error in get_system_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# Endpoint 3: Batch operations
# =============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def system_batch_configure(
    http_request: Request,
    body: SystemBatchRequest,
) -> VyOSResponse:
    """
    Execute a batch of system configuration operations atomically.

    The ``item_name`` field identifies the primary item (hostname, username,
    IP address, syslog facility, etc.).  Each operation's ``value`` field
    provides one additional argument; for operations requiring two extra
    arguments, encode them comma-separated: ``"facility,level"``.

    Available operations mirror ``SystemBatchBuilder`` public methods.

    Example — change hostname::

        POST /vyos/system/batch
        {
            "item_name": "new-hostname",
            "operations": [{"op": "set_hostname"}]
        }

    Example — add syslog remote host facility::

        POST /vyos/system/batch
        {
            "item_name": "192.168.1.100",
            "operations": [{"op": "set_syslog_remote_facility", "value": "all,info"}]
        }
    """
    await require_write_permission(http_request, FeatureGroup.SYSTEM)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = SystemBatchBuilder(version=version)

        for operation in body.operations:
            method = resolve_batch_method(builder, operation.op)

            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]
            n = len(params)

            if n == 0:
                method()
            elif n == 1:
                method(body.item_name)
            elif n == 2:
                if operation.value is None:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{operation.op}' requires a value",
                    )
                method(body.item_name, operation.value)
            elif n >= 3:
                # Third (and beyond) args encoded as comma-separated in value
                if not operation.value:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{operation.op}' requires a comma-separated value",
                    )
                extra = operation.value.split(",", n - 2)
                if len(extra) < n - 1:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{operation.op}' requires {n - 1} comma-separated values",
                    )
                method(body.item_name, *extra[: n - 1])

        response = await run_in_threadpool(service.execute_batch, builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "System configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in system_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# Legacy endpoints (kept for backwards compatibility)
# =============================================================================


@router.get("/info", response_model=SystemInfo)
async def get_system_info(request: Request) -> SystemInfo:
    """Get system information about the active VyOS instance."""
    await require_read_permission(request, FeatureGroup.SYSTEM)
    try:
        service = get_session_vyos_service(request)
        instance = request.state.instance
        version = service.get_version()
        hostname = service.config.hostname

        try:
            await run_in_threadpool(service.get_full_config)
            connected = True
        except Exception:
            connected = False

        site = getattr(request.state, "site", None)

        return SystemInfo(
            instance_id=instance["id"],
            instance_name=instance["name"],
            site_name=site["name"] if site and site.get("name") else "Unknown",
            vyos_version=version,
            connection_host=hostname,
            connected=connected,
        )
    except Exception:
        logger.exception("Unhandled error in get_system_info")
        raise HTTPException(status_code=500, detail="Internal server error")
