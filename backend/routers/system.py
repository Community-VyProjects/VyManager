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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/system", tags=["system"])

# Builder infrastructure methods that must never be invokable via the batch API
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty", "clear",
    "get_capabilities",
})


# Stub functions for backwards compatibility with app.py
def set_device_registry(registry):
    """Legacy function - no longer used."""
    pass


def set_configured_device_name(name):
    """Legacy function - no longer used."""
    pass


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
    inet: Optional[str] = None
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


class SystemConfig(BaseModel):
    """Full system configuration across all subsections."""
    hostname: Optional[str] = None
    domain_name: Optional[str] = None
    domain_search: List[str] = Field(default_factory=list)
    name_servers: List[str] = Field(default_factory=list)
    time_zone: Optional[str] = None
    performance: Optional[str] = None
    login: LoginConfig = Field(default_factory=LoginConfig)
    syslog: SyslogConfig = Field(default_factory=SyslogConfig)
    conntrack: ConntrackConfig = Field(default_factory=ConntrackConfig)
    config_management: ConfigManagement = Field(default_factory=ConfigManagement)
    static_host_mapping: List[StaticHostEntry] = Field(default_factory=list)
    console_devices: List[ConsoleDevice] = Field(default_factory=list)
    sysctl_parameters: List[SysctlParameter] = Field(default_factory=list)
    watchdog: Optional[WatchdogConfig] = None
    wireless_country_code: Optional[str] = None
    frr_profile: Optional[str] = None


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


# =============================================================================
# Config parsing helpers
# =============================================================================


def _parse_syslog_facilities(raw: dict) -> List[SyslogFacility]:
    """Parse facility node: {facility: {<name>: {level: <level>}}} → list."""
    facilities = []
    facility_raw = raw.get("facility", {}) if raw else {}
    if not isinstance(facility_raw, dict):
        return facilities
    for fac_name, fac_cfg in facility_raw.items():
        if fac_cfg is None:
            fac_cfg = {}
        level = fac_cfg.get("level") or "info"
        facilities.append(SyslogFacility(facility=fac_name, level=level))
    return facilities


def _parse_syslog(system_config: dict, mapper) -> SyslogConfig:
    syslog_raw = system_config.get("syslog", {}) or {}

    local_key = mapper.get_syslog_local_config_key()
    remote_key = mapper.get_syslog_remote_config_key()

    local_raw = syslog_raw.get(local_key, {}) or {}
    local_facilities = _parse_syslog_facilities(local_raw)
    preserve_fqdn = "preserve-fqdn" in local_raw

    remote_hosts = []
    remote_raw = syslog_raw.get(remote_key, {}) or {}
    if isinstance(remote_raw, dict):
        for host, host_cfg in remote_raw.items():
            if host_cfg is None:
                host_cfg = {}
            facilities = _parse_syslog_facilities(host_cfg)
            port_val = host_cfg.get("port")
            remote_hosts.append(SyslogRemoteHost(
                host=host,
                facilities=facilities,
                port=int(port_val) if port_val else None,
                protocol=host_cfg.get("protocol"),
            ))

    console_facilities = []
    console_raw = syslog_raw.get("console", {}) or {}
    if console_raw:
        console_facilities = _parse_syslog_facilities(console_raw)

    # 1.4-only: file targets
    files = []
    file_raw = syslog_raw.get("file", {}) or {}
    if isinstance(file_raw, dict):
        for fname, fcfg in file_raw.items():
            if fcfg is None:
                fcfg = {}
            files.append(SyslogFileEntry(
                filename=fname,
                facilities=_parse_syslog_facilities(fcfg),
            ))

    # 1.4-only: user targets
    users_syslog = []
    user_raw = syslog_raw.get("user", {}) or {}
    if isinstance(user_raw, dict):
        for uname, ucfg in user_raw.items():
            if ucfg is None:
                ucfg = {}
            users_syslog.append(SyslogUserEntry(
                username=uname,
                facilities=_parse_syslog_facilities(ucfg),
            ))

    return SyslogConfig(
        local_facilities=local_facilities,
        preserve_fqdn=preserve_fqdn,
        remote_hosts=remote_hosts,
        console_facilities=console_facilities,
        files=files,
        users=users_syslog,
    )


def _parse_login(system_config: dict) -> LoginConfig:
    login_raw = system_config.get("login", {}) or {}
    users_raw = login_raw.get("user", {}) or {}
    users = []
    if isinstance(users_raw, dict):
        for username, user_cfg in users_raw.items():
            if user_cfg is None:
                user_cfg = {}
            auth = user_cfg.get("authentication", {}) or {}
            has_password = bool(
                auth.get("encrypted-password") or auth.get("plaintext-password")
            )
            keys_raw = auth.get("public-keys", {}) or {}
            ssh_keys = []
            if isinstance(keys_raw, dict):
                for key_name, key_cfg in keys_raw.items():
                    if key_cfg is None:
                        key_cfg = {}
                    ssh_keys.append(LoginSshKey(
                        key_name=key_name,
                        key_type=key_cfg.get("type"),
                    ))
            users.append(LoginUser(
                username=username,
                full_name=user_cfg.get("full-name"),
                has_password=has_password,
                ssh_keys=ssh_keys,
            ))

    timeout_raw = login_raw.get("timeout")
    timeout = int(timeout_raw) if timeout_raw else None

    banner_raw = login_raw.get("banner", {}) or {}
    banners = LoginBanners(
        pre_login=banner_raw.get("pre-login"),
        post_login=banner_raw.get("post-login"),
    )

    op_groups_raw = login_raw.get("operator-group", {}) or {}
    operator_groups = list(op_groups_raw.keys()) if isinstance(op_groups_raw, dict) else []

    return LoginConfig(
        users=users,
        timeout=timeout,
        banners=banners,
        operator_groups=operator_groups,
    )


def _parse_conntrack(system_config: dict) -> ConntrackConfig:
    ct_raw = system_config.get("conntrack", {}) or {}

    # Modules: node with leaf children (each key = module name)
    modules_raw = ct_raw.get("modules", {}) or {}
    modules = list(modules_raw.keys()) if isinstance(modules_raw, dict) else []

    table_size = ct_raw.get("table-size")
    hash_size = ct_raw.get("hash-size")
    expect_size = ct_raw.get("expect-table-size")

    tcp_raw = ct_raw.get("tcp", {}) or {}
    tcp_loose = tcp_raw.get("loose")
    tcp_half_open = tcp_raw.get("half-open-connections")
    tcp_max_retrans = tcp_raw.get("max-retrans")

    return ConntrackConfig(
        modules=modules,
        table_size=int(table_size) if table_size else None,
        hash_size=int(hash_size) if hash_size else None,
        expect_table_size=int(expect_size) if expect_size else None,
        tcp_loose=tcp_loose,
        tcp_half_open_connections=int(tcp_half_open) if tcp_half_open else None,
        tcp_max_retrans=int(tcp_max_retrans) if tcp_max_retrans else None,
    )


def _parse_config_management(system_config: dict) -> ConfigManagement:
    cm_raw = system_config.get("config-management", {}) or {}
    revisions = cm_raw.get("commit-revisions")
    archive_raw = cm_raw.get("commit-archive", {}) or {}
    locations_raw = archive_raw.get("location", []) if isinstance(archive_raw, dict) else []
    if isinstance(locations_raw, str):
        locations_raw = [locations_raw]

    return ConfigManagement(
        commit_revisions=int(revisions) if revisions else None,
        archive_locations=locations_raw if isinstance(locations_raw, list) else [],
    )


def _parse_static_host_mapping(system_config: dict) -> List[StaticHostEntry]:
    shm_raw = system_config.get("static-host-mapping", {}) or {}
    hosts_raw = shm_raw.get("host-name", {}) if isinstance(shm_raw, dict) else {}
    entries = []
    if isinstance(hosts_raw, dict):
        for hostname, host_cfg in hosts_raw.items():
            if host_cfg is None:
                host_cfg = {}
            inet = host_cfg.get("inet")
            aliases_raw = host_cfg.get("alias", [])
            if isinstance(aliases_raw, str):
                aliases_raw = [aliases_raw]
            entries.append(StaticHostEntry(
                hostname=hostname,
                inet=inet,
                aliases=aliases_raw if isinstance(aliases_raw, list) else [],
            ))
    return entries


def _parse_console(system_config: dict) -> List[ConsoleDevice]:
    console_raw = system_config.get("console", {}) or {}
    devices_raw = console_raw.get("device", {}) or {}
    devices = []
    if isinstance(devices_raw, dict):
        for dev_name, dev_cfg in devices_raw.items():
            if dev_cfg is None:
                dev_cfg = {}
            devices.append(ConsoleDevice(
                device=dev_name,
                speed=dev_cfg.get("speed"),
                powersave="powersave" in dev_cfg,
            ))
    return devices


def _parse_sysctl(system_config: dict) -> List[SysctlParameter]:
    sysctl_raw = system_config.get("sysctl", {}) or {}
    params_raw = sysctl_raw.get("parameter", {}) or {}
    params = []
    if isinstance(params_raw, dict):
        for pname, pcfg in params_raw.items():
            if pcfg is None:
                pcfg = {}
            val = pcfg.get("value")
            if val is not None:
                params.append(SysctlParameter(parameter=pname, value=str(val)))
    return params


def _parse_watchdog(system_config: dict) -> Optional[WatchdogConfig]:
    wd_raw = system_config.get("watchdog", {})
    if not wd_raw:
        return None
    timeout = wd_raw.get("timeout")
    reboot_timeout = wd_raw.get("reboot-timeout")
    if timeout is None and reboot_timeout is None:
        return None
    return WatchdogConfig(
        timeout=int(timeout) if timeout else None,
        reboot_timeout=int(reboot_timeout) if reboot_timeout else None,
    )


def _parse_name_servers(system_config: dict) -> List[str]:
    ns_val = system_config.get("name-server")
    if not ns_val:
        return []
    if isinstance(ns_val, list):
        return ns_val
    return [ns_val]


def _parse_domain_search(system_config: dict) -> List[str]:
    ds_raw = system_config.get("domain-search", {}) or {}
    if isinstance(ds_raw, dict):
        domains_raw = ds_raw.get("domain", [])
        if isinstance(domains_raw, list):
            return domains_raw
        if isinstance(domains_raw, str):
            return [domains_raw]
    return []


def _parse_performance(system_config: dict, version: str) -> Optional[str]:
    perf_mapper = CommandMapperRegistry.get_mapper("system_performance", version)
    option = system_config.get("option") or {}
    return perf_mapper.parse_performance(option)


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
        system_config = full_config.get("system", {}) or {}

        mapper = CommandMapperRegistry.get_mapper("system", version)

        return SystemConfig(
            hostname=system_config.get("host-name"),
            domain_name=system_config.get("domain-name"),
            domain_search=_parse_domain_search(system_config),
            name_servers=_parse_name_servers(system_config),
            time_zone=system_config.get("time-zone"),
            performance=_parse_performance(system_config, version),
            login=_parse_login(system_config),
            syslog=_parse_syslog(system_config, mapper),
            conntrack=_parse_conntrack(system_config),
            config_management=_parse_config_management(system_config),
            static_host_mapping=_parse_static_host_mapping(system_config),
            console_devices=_parse_console(system_config),
            sysctl_parameters=_parse_sysctl(system_config),
            watchdog=_parse_watchdog(system_config),
            wireless_country_code=system_config.get("wireless", {}).get("country-code") if system_config.get("wireless") else None,
            frr_profile=system_config.get("frr", {}).get("profile") if system_config.get("frr") else None,
        )
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
            if operation.op.startswith("_") or operation.op in _INTERNAL_BUILDER_METHODS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid operation: {operation.op}",
                )
            method = getattr(builder, operation.op, None)
            if not callable(method):
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown operation: {operation.op}",
                )

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
