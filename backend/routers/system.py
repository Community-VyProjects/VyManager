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
    preserve_fqdn = "preserve-fqdn" in local_raw or "preserve-fqdn" in syslog_raw

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
            inet = host_cfg.get("inet") or []
            if isinstance(inet, str):
                inet = [inet]
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


def _parse_syslog_marker(system_config: dict, mapper) -> Optional[SyslogMarker]:
    syslog_raw = system_config.get("syslog", {}) or {}
    local_key = mapper.get_syslog_local_config_key()
    if local_key == "global":
        marker_raw = (syslog_raw.get("global", {}) or {}).get("marker", {}) or {}
    else:
        marker_raw = syslog_raw.get("marker", {}) or {}
    if not marker_raw:
        return None
    interval = marker_raw.get("interval")
    disabled = "disable" in marker_raw
    if interval is None and not disabled:
        return None
    return SyslogMarker(
        interval=int(interval) if interval else None,
        disabled=disabled,
    )


def _parse_login_radius(system_config: dict) -> Optional[RadiusConfig]:
    login_raw = system_config.get("login", {}) or {}
    radius_raw = login_raw.get("radius", {}) or {}
    if not radius_raw:
        return None
    servers = []
    for server_ip, server_cfg in (radius_raw.get("server", {}) or {}).items():
        if server_cfg is None:
            server_cfg = {}
        servers.append(RadiusServer(
            server=server_ip,
            port=int(server_cfg["port"]) if server_cfg.get("port") else None,
            timeout=int(server_cfg["timeout"]) if server_cfg.get("timeout") else None,
        ))
    source_address = radius_raw.get("source-address")
    timeout = radius_raw.get("timeout")
    return RadiusConfig(
        servers=servers,
        source_address=source_address,
        timeout=int(timeout) if timeout else None,
    )


def _parse_login_tacacs(system_config: dict) -> Optional[TacacsConfig]:
    login_raw = system_config.get("login", {}) or {}
    tacacs_raw = login_raw.get("tacacs", {}) or {}
    if not tacacs_raw:
        return None
    servers = []
    for server_ip, server_cfg in (tacacs_raw.get("server", {}) or {}).items():
        if server_cfg is None:
            server_cfg = {}
        servers.append(TacacsServer(
            server=server_ip,
            port=int(server_cfg["port"]) if server_cfg.get("port") else None,
            timeout=int(server_cfg["timeout"]) if server_cfg.get("timeout") else None,
        ))
    source_address = tacacs_raw.get("source-address")
    timeout = tacacs_raw.get("timeout")
    return TacacsConfig(
        servers=servers,
        source_address=source_address,
        timeout=int(timeout) if timeout else None,
    )


def _parse_conntrack_log(system_config: dict) -> Optional[ConntrackLog]:
    ct_raw = system_config.get("conntrack", {}) or {}
    log_raw = ct_raw.get("log", {}) or {}
    if not log_raw:
        return None
    entries = []
    for event, protocols_raw in log_raw.items():
        if protocols_raw is None:
            entries.append(ConntrackLogEntry(event=event, protocol="all"))
        elif isinstance(protocols_raw, dict):
            for protocol in protocols_raw:
                entries.append(ConntrackLogEntry(event=event, protocol=protocol))
        else:
            entries.append(ConntrackLogEntry(event=event, protocol="all"))
    if not entries:
        return None
    return ConntrackLog(entries=entries)


def _parse_conntrack_ignore(system_config: dict) -> List[ConntrackIgnoreRule]:
    ct_raw = system_config.get("conntrack", {}) or {}
    ignore_raw = ct_raw.get("ignore", {}) or {}
    rules = []
    for ip_version in ("ipv4", "ipv6"):
        rules_raw = (ignore_raw.get(ip_version, {}) or {}).get("rule", {}) or {}
        if isinstance(rules_raw, dict):
            for rule_id_str, rule_cfg in sorted(rules_raw.items(), key=lambda x: int(x[0])):
                if rule_cfg is None:
                    rule_cfg = {}
                src_raw = rule_cfg.get("source", {}) or {}
                dst_raw = rule_cfg.get("destination", {}) or {}
                rules.append(ConntrackIgnoreRule(
                    rule_id=int(rule_id_str),
                    ip_version=ip_version,
                    protocol=rule_cfg.get("protocol"),
                    source_address=src_raw.get("address"),
                    source_port=str(src_raw["port"]) if src_raw.get("port") else None,
                    destination_address=dst_raw.get("address"),
                    destination_port=str(dst_raw["port"]) if dst_raw.get("port") else None,
                    inbound_interface=rule_cfg.get("inbound-interface"),
                ))
    return rules


def _parse_conntrack_global_timeouts(system_config: dict, mapper) -> Optional[ConntrackGlobalTimeouts]:
    if not mapper.supports_conntrack_global_timeouts():
        return None
    ct_raw = system_config.get("conntrack", {}) or {}
    timeout_raw = ct_raw.get("timeout", {}) or {}
    icmp = timeout_raw.get("icmp")
    other = timeout_raw.get("other")
    tcp_raw = timeout_raw.get("tcp", {}) or {}
    udp_raw = timeout_raw.get("udp", {}) or {}
    if not any([icmp, other, tcp_raw, udp_raw]):
        return None
    tcp = ConntrackTcpTimeouts(
        close=int(tcp_raw["close"]) if tcp_raw.get("close") else None,
        close_wait=int(tcp_raw["close-wait"]) if tcp_raw.get("close-wait") else None,
        established=int(tcp_raw["established"]) if tcp_raw.get("established") else None,
        fin_wait=int(tcp_raw["fin-wait"]) if tcp_raw.get("fin-wait") else None,
        last_ack=int(tcp_raw["last-ack"]) if tcp_raw.get("last-ack") else None,
        syn_recv=int(tcp_raw["syn-recv"]) if tcp_raw.get("syn-recv") else None,
        syn_sent=int(tcp_raw["syn-sent"]) if tcp_raw.get("syn-sent") else None,
        time_wait=int(tcp_raw["time-wait"]) if tcp_raw.get("time-wait") else None,
    )
    udp = ConntrackUdpTimeouts(
        other=int(udp_raw["other"]) if udp_raw.get("other") else None,
        stream=int(udp_raw["stream"]) if udp_raw.get("stream") else None,
    )
    return ConntrackGlobalTimeouts(
        icmp=int(icmp) if icmp else None,
        other=int(other) if other else None,
        tcp=tcp,
        udp=udp,
    )


def _parse_conntrack_timeout_custom(system_config: dict) -> List[ConntrackTimeoutCustomRule]:
    ct_raw = system_config.get("conntrack", {}) or {}
    timeout_raw = ct_raw.get("timeout", {}) or {}
    custom_raw = timeout_raw.get("custom", {}) or {}
    rules = []
    for ip_version in ("ipv4", "ipv6"):
        rules_raw = (custom_raw.get(ip_version, {}) or {}).get("rule", {}) or {}
        if isinstance(rules_raw, dict):
            for rule_id_str, rule_cfg in sorted(rules_raw.items(), key=lambda x: int(x[0])):
                if rule_cfg is None:
                    rule_cfg = {}
                protocol_raw = rule_cfg.get("protocol", {}) or {}
                tcp_raw = protocol_raw.get("tcp", {}) or {}
                udp_raw = protocol_raw.get("udp", {}) or {}
                src_raw = rule_cfg.get("source", {}) or {}
                dst_raw = rule_cfg.get("destination", {}) or {}
                protocol = next(iter(protocol_raw)) if protocol_raw else None
                tcp = ConntrackTimeoutRuleProtocol(
                    close=int(tcp_raw["close"]) if tcp_raw.get("close") else None,
                    close_wait=int(tcp_raw["close-wait"]) if tcp_raw.get("close-wait") else None,
                    established=int(tcp_raw["established"]) if tcp_raw.get("established") else None,
                    fin_wait=int(tcp_raw["fin-wait"]) if tcp_raw.get("fin-wait") else None,
                    last_ack=int(tcp_raw["last-ack"]) if tcp_raw.get("last-ack") else None,
                    syn_recv=int(tcp_raw["syn-recv"]) if tcp_raw.get("syn-recv") else None,
                    syn_sent=int(tcp_raw["syn-sent"]) if tcp_raw.get("syn-sent") else None,
                    time_wait=int(tcp_raw["time-wait"]) if tcp_raw.get("time-wait") else None,
                ) if tcp_raw else None
                udp = ConntrackTimeoutRuleProtocol(
                    other=int(udp_raw["other"]) if udp_raw.get("other") else None,
                    stream=int(udp_raw["stream"]) if udp_raw.get("stream") else None,
                ) if udp_raw else None
                rules.append(ConntrackTimeoutCustomRule(
                    rule_id=int(rule_id_str),
                    ip_version=ip_version,
                    protocol=protocol,
                    source_address=src_raw.get("address"),
                    destination_address=dst_raw.get("address"),
                    tcp=tcp,
                    udp=udp,
                ))
    return rules


def _parse_ip_settings(system_config: dict) -> Optional[IpSettings]:
    ip_raw = system_config.get("ip", {}) or {}
    if not ip_raw:
        return None
    arp_raw = ip_raw.get("arp", {}) or {}
    multipath_raw = ip_raw.get("multipath", {}) or {}
    nht_raw = ip_raw.get("nht", {}) or {}
    table_size = arp_raw.get("ndp-table-size") or arp_raw.get("table-size")
    return IpSettings(
        arp_ndp_table_size=int(table_size) if table_size else None,
        disable_forwarding="disable-forwarding" in ip_raw,
        multipath_ignore_unreachable="ignore-unreachable-nexthops" in multipath_raw,
        multipath_layer4_hashing="layer4-hashing" in multipath_raw,
        nht_no_resolve_via_default="no-resolve-via-default" in nht_raw,
    )


def _parse_ipv6_settings(system_config: dict) -> Optional[Ipv6Settings]:
    ipv6_raw = system_config.get("ipv6", {}) or {}
    if not ipv6_raw:
        return None
    multipath_raw = ipv6_raw.get("multipath", {}) or {}
    nht_raw = ipv6_raw.get("nht", {}) or {}
    neighbor_raw = ipv6_raw.get("neighbor", {}) or {}
    return Ipv6Settings(
        disable_forwarding="disable-forwarding" in ipv6_raw,
        multipath_layer4_hashing="layer4-hashing" in multipath_raw,
        nht_no_resolve_via_default="no-resolve-via-default" in nht_raw,
        strict_dad="strict-dad" in ipv6_raw,
        neighbor_table_size=int(neighbor_raw["table-size"]) if neighbor_raw.get("table-size") else None,
    )


def _parse_lcd(system_config: dict) -> Optional[LcdConfig]:
    lcd_raw = system_config.get("lcd", {}) or {}
    if not lcd_raw:
        return None
    return LcdConfig(
        device=lcd_raw.get("device"),
        address=lcd_raw.get("address"),
        model=lcd_raw.get("model"),
    )


def _parse_logrotate_entry(raw: dict) -> Optional[LogrotateConfig]:
    if not raw:
        return None
    max_size = raw.get("max-size")
    rotate = raw.get("rotate")
    if max_size is None and rotate is None:
        return None
    return LogrotateConfig(
        max_size=int(max_size) if max_size else None,
        rotate_count=int(rotate) if rotate else None,
    )


def _parse_logs(system_config: dict) -> Optional[LogsConfig]:
    logs_raw = system_config.get("logs", {}) or {}
    if not logs_raw:
        return None
    logrotate_raw = logs_raw.get("logrotate", {}) or {}
    atop = _parse_logrotate_entry(logrotate_raw.get("atop", {}) or {})
    messages = _parse_logrotate_entry(logrotate_raw.get("messages", {}) or {})
    if atop is None and messages is None:
        return None
    return LogsConfig(atop=atop, messages=messages)


def _parse_options(system_config: dict) -> Optional[SystemOptions]:
    option_raw = system_config.get("option", {}) or {}
    if not option_raw:
        return None
    keyboard_layout = option_raw.get("keyboard-layout")
    time_format = option_raw.get("time-format")
    ctrl_alt_delete = option_raw.get("ctrl-alt-delete")
    startup_beep = "startup-beep" in option_raw
    disable_usb_autosuspend = "disable-usb-autosuspend" in option_raw
    reboot_on_panic = "reboot-on-panic" in option_raw
    root_partition_auto_resize = "root-partition-auto-resize" in option_raw
    reboot_on_upgrade = "reboot-on-upgrade-failure" in option_raw
    rl_raw = option_raw.get("resource-limits", {}) or {}
    resource_limits = ResourceLimits(
        max_map_count=int(rl_raw["max-map-count"]) if rl_raw.get("max-map-count") else None,
        shmmax=int(rl_raw["shmmax"]) if rl_raw.get("shmmax") else None,
    ) if rl_raw else None
    kernel_raw = option_raw.get("kernel", {}) or {}
    kernel = None
    if kernel_raw:
        cpu_raw = kernel_raw.get("cpu", {}) or {}
        mem_raw = kernel_raw.get("memory", {}) or {}
        cpu = KernelCpuOptions(
            disable_nmi_watchdog="disable-nmi-watchdog" in cpu_raw,
            isolate_cpus=cpu_raw.get("isolate-cpus"),
            nohz_full=cpu_raw.get("nohz-full"),
            rcu_no_cbs=cpu_raw.get("rcu-no-cbs"),
        ) if cpu_raw else None
        mem = KernelMemoryOptions(
            default_hugepage_size=mem_raw.get("default-hugepage-size"),
            disable_numa_balancing="disable-numa-balancing" in mem_raw,
            hugepage_size=mem_raw.get("hugepage-size"),
        ) if mem_raw else None
        kernel = KernelOptions(
            disable_hpet="disable-hpet" in kernel_raw,
            disable_mce="disable-mce" in kernel_raw,
            disable_softlockup="disable-softlockup" in kernel_raw,
            cpu=cpu,
            memory=mem,
        )
    http_raw = option_raw.get("http-client", {}) or {}
    http_client = HttpClientOptions(
        source_address=http_raw.get("source-address"),
        source_interface=http_raw.get("source-interface"),
    ) if http_raw else None
    ssh_raw = option_raw.get("ssh-client", {}) or {}
    ssh_client = SshClientOptions(
        source_address=ssh_raw.get("source-address"),
        source_interface=ssh_raw.get("source-interface"),
    ) if ssh_raw else None
    if not any([
        keyboard_layout, time_format, ctrl_alt_delete, startup_beep,
        disable_usb_autosuspend, reboot_on_panic, root_partition_auto_resize,
        reboot_on_upgrade, resource_limits, kernel, http_client, ssh_client,
    ]):
        return None
    return SystemOptions(
        keyboard_layout=keyboard_layout,
        time_format=time_format,
        ctrl_alt_delete=ctrl_alt_delete,
        startup_beep=startup_beep,
        disable_usb_autosuspend=disable_usb_autosuspend,
        reboot_on_panic=reboot_on_panic,
        root_partition_auto_resize=root_partition_auto_resize,
        reboot_on_upgrade_failure=reboot_on_upgrade,
        resource_limits=resource_limits,
        kernel=kernel,
        http_client=http_client,
        ssh_client=ssh_client,
    )


def _parse_proxy(system_config: dict) -> Optional[ProxyConfig]:
    proxy_raw = system_config.get("proxy", {}) or {}
    if not proxy_raw:
        return None
    no_proxy = proxy_raw.get("no-proxy", [])
    if isinstance(no_proxy, str):
        no_proxy = [no_proxy]
    port = proxy_raw.get("port")
    return ProxyConfig(
        url=proxy_raw.get("url"),
        port=int(port) if port else None,
        username=proxy_raw.get("username"),
        no_proxy=no_proxy if isinstance(no_proxy, list) else [],
    )


def _parse_sflow_raw(sflow_raw: dict) -> SflowConfig:
    servers = []
    for server_ip, server_cfg in (sflow_raw.get("server", {}) or {}).items():
        if server_cfg is None:
            server_cfg = {}
        servers.append(SflowServer(
            server=server_ip,
            port=int(server_cfg["port"]) if server_cfg.get("port") else None,
            source_address=server_cfg.get("source-address"),
        ))
    sampling_rate = sflow_raw.get("sampling-rate")
    return SflowConfig(
        agent_address=sflow_raw.get("agent-address"),
        sampling_rate=int(sampling_rate) if sampling_rate else None,
        servers=servers,
    )


def _parse_flow_accounting(system_config: dict, mapper) -> Optional[FlowAccountingConfig]:
    fa_raw = system_config.get("flow-accounting", {}) or {}
    if not fa_raw:
        return None
    iface_key = mapper.get_flow_accounting_interface_config_key()
    if iface_key == "root":
        iface_raw = fa_raw.get("interface", [])
    else:
        iface_raw = (fa_raw.get("netflow", {}) or {}).get("interface", [])
    if isinstance(iface_raw, str):
        interfaces = [iface_raw]
    elif isinstance(iface_raw, dict):
        interfaces = list(iface_raw.keys())
    elif isinstance(iface_raw, list):
        interfaces = iface_raw
    else:
        interfaces = []
    netflow_raw = fa_raw.get("netflow", {}) or {}
    netflow = None
    if netflow_raw:
        servers = []
        for server_ip, server_cfg in (netflow_raw.get("server", {}) or {}).items():
            if server_cfg is None:
                server_cfg = {}
            servers.append(NetflowServer(
                server=server_ip,
                port=int(server_cfg["port"]) if server_cfg.get("port") else None,
                source_address=server_cfg.get("source-address"),
            ))
        timeout_raw = netflow_raw.get("timeout", {}) or {}
        timeouts = NetflowTimeouts(
            expiry_interval=int(timeout_raw["expiry-interval"]) if timeout_raw.get("expiry-interval") else None,
            flow_generic=int(timeout_raw["flow-generic"]) if timeout_raw.get("flow-generic") else None,
            icmp=int(timeout_raw["icmp"]) if timeout_raw.get("icmp") else None,
            max_active_life=int(timeout_raw["max-active-life"]) if timeout_raw.get("max-active-life") else None,
            tcp_fin=int(timeout_raw["tcp-fin"]) if timeout_raw.get("tcp-fin") else None,
            tcp_generic=int(timeout_raw["tcp-generic"]) if timeout_raw.get("tcp-generic") else None,
            udp=int(timeout_raw["udp"]) if timeout_raw.get("udp") else None,
        ) if timeout_raw else None
        netflow = NetflowConfig(
            engine_id=int(netflow_raw["engine-id"]) if netflow_raw.get("engine-id") else None,
            max_flows=int(netflow_raw["max-flows"]) if netflow_raw.get("max-flows") else None,
            sampling_rate=int(netflow_raw["sampling-rate"]) if netflow_raw.get("sampling-rate") else None,
            source_address=netflow_raw.get("source-address"),
            version=netflow_raw.get("version"),
            servers=servers,
            timeouts=timeouts,
        )
    sflow = None
    if iface_key == "root":
        sflow_raw = fa_raw.get("sflow", {}) or {}
        if sflow_raw:
            sflow = _parse_sflow_raw(sflow_raw)
    return FlowAccountingConfig(interfaces=interfaces, netflow=netflow, sflow=sflow)


def _parse_sflow(full_config: dict, mapper) -> Optional[SflowConfig]:
    if mapper.get_sflow_config_root() != "sflow":
        return None
    sflow_raw = full_config.get("sflow", {}) or {}
    if not sflow_raw:
        return None
    return _parse_sflow_raw(sflow_raw)


def _parse_task_scheduler(system_config: dict) -> List[TaskSchedulerTask]:
    ts_raw = system_config.get("task-scheduler", {}) or {}
    tasks_raw = ts_raw.get("task", {}) or {}
    tasks = []
    if isinstance(tasks_raw, dict):
        for task_name, task_cfg in tasks_raw.items():
            if task_cfg is None:
                task_cfg = {}
            exe_raw = task_cfg.get("executable", {}) or {}
            tasks.append(TaskSchedulerTask(
                name=task_name,
                crontab_spec=task_cfg.get("crontab-spec"),
                interval=task_cfg.get("interval"),
                executable_path=exe_raw.get("path"),
                executable_arguments=exe_raw.get("arguments"),
            ))
    return tasks


def _parse_update_check(system_config: dict) -> Optional[UpdateCheckConfig]:
    uc_raw = system_config.get("update-check", {}) or {}
    if not uc_raw:
        return None
    return UpdateCheckConfig(
        url=uc_raw.get("url"),
        auto_install="auto-install-packages" in uc_raw,
    )


def _parse_frr(system_config: dict) -> Optional[FrrConfig]:
    frr_raw = system_config.get("frr", {}) or {}
    if not frr_raw:
        return None
    bmp_raw = frr_raw.get("bmp", {}) or {}
    bmp = None
    if bmp_raw:
        targets = []
        for target_name, target_cfg in (bmp_raw.get("target", {}) or {}).items():
            if target_cfg is None:
                target_cfg = {}
            targets.append(FrrBmpTarget(
                name=target_name,
                address=target_cfg.get("address"),
                port=int(target_cfg["port"]) if target_cfg.get("port") else None,
            ))
        bmp = FrrBmpConfig(targets=targets)
    return FrrConfig(profile=frr_raw.get("profile"), bmp=bmp)


def _parse_acceleration(system_config: dict) -> Optional[AccelerationConfig]:
    acc_raw = system_config.get("acceleration", {}) or {}
    if not acc_raw:
        return None
    qat_raw = acc_raw.get("qat", {}) or {}
    devices_raw = qat_raw.get("dev", [])
    if isinstance(devices_raw, str):
        devices = [devices_raw]
    elif isinstance(devices_raw, list):
        devices = devices_raw
    elif isinstance(devices_raw, dict):
        devices = list(devices_raw.keys())
    else:
        devices = []
    return AccelerationConfig(qat_devices=devices)


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
        system_config = full_config.get("system", {}) or {}
        cm = _parse_config_management(system_config)

        if archive_location not in cm.archive_locations:
            raise HTTPException(
                status_code=400,
                detail="Archive location not found in device configuration",
            )

        # Use the value from device config (not user input) to break taint chain
        validated_location = cm.archive_locations[
            cm.archive_locations.index(archive_location)
        ]
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
        system_config = full_config.get("system", {}) or {}
        cm = _parse_config_management(system_config)

        if archive_location not in cm.archive_locations:
            raise HTTPException(
                status_code=400,
                detail="Archive location not found in device configuration",
            )

        validated_location = cm.archive_locations[
            cm.archive_locations.index(archive_location)
        ]

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
        system_config = full_config.get("system", {}) or {}
        cm = _parse_config_management(system_config)

        if body.archive_location not in cm.archive_locations:
            raise HTTPException(
                status_code=400,
                detail="Archive location not found in device configuration",
            )

        # Use the value from device config (not user input) to break taint chain
        validated_location = cm.archive_locations[
            cm.archive_locations.index(body.archive_location)
        ]

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
        system_config = full_config.get("system", {}) or {}

        mapper = CommandMapperRegistry.get_mapper("system", version)

        login_raw = system_config.get("login", {}) or {}
        max_ls_raw = login_raw.get("max-login-session")

        return SystemConfig(
            hostname=system_config.get("host-name"),
            domain_name=system_config.get("domain-name"),
            domain_search=_parse_domain_search(system_config),
            name_servers=_parse_name_servers(system_config),
            time_zone=system_config.get("time-zone"),
            performance=_parse_performance(system_config, version),
            login=_parse_login(system_config),
            max_login_session=int(max_ls_raw) if max_ls_raw else None,
            login_radius=_parse_login_radius(system_config),
            login_tacacs=_parse_login_tacacs(system_config),
            syslog=_parse_syslog(system_config, mapper),
            syslog_marker=_parse_syslog_marker(system_config, mapper),
            conntrack=_parse_conntrack(system_config),
            conntrack_log=_parse_conntrack_log(system_config),
            conntrack_ignore=_parse_conntrack_ignore(system_config),
            conntrack_global_timeouts=_parse_conntrack_global_timeouts(system_config, mapper),
            conntrack_timeout_custom=_parse_conntrack_timeout_custom(system_config),
            ip=_parse_ip_settings(system_config),
            ipv6=_parse_ipv6_settings(system_config),
            config_management=_parse_config_management(system_config),
            static_host_mapping=_parse_static_host_mapping(system_config),
            console_devices=_parse_console(system_config),
            sysctl_parameters=_parse_sysctl(system_config),
            watchdog=_parse_watchdog(system_config),
            wireless_country_code=(system_config.get("wireless") or {}).get("country-code"),
            frr=_parse_frr(system_config),
            lcd=_parse_lcd(system_config),
            logs=_parse_logs(system_config),
            options=_parse_options(system_config),
            proxy=_parse_proxy(system_config),
            flow_accounting=_parse_flow_accounting(system_config, mapper),
            sflow=_parse_sflow(full_config, mapper),
            task_scheduler=_parse_task_scheduler(system_config),
            update_check=_parse_update_check(system_config),
            acceleration=_parse_acceleration(system_config),
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
