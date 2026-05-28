"""Service Monitoring Router.

API endpoints for managing VyOS service monitoring configuration.

Sub-services:
  telegraf       — metric collector with multiple output plugins (both 1.4 and 1.5)
  zabbix-agent   — Zabbix monitoring agent (both 1.4 and 1.5)
  prometheus     — Prometheus exporters: node, frr, blackbox (1.5 only)
  network-event  — Kernel netlink event logger (1.5 only)

Endpoints:
  GET  /vyos/service-monitoring/capabilities  — version-aware feature flags
  GET  /vyos/service-monitoring/config        — normalized configuration
  POST /vyos/service-monitoring/batch         — atomic set/delete operations
"""

import inspect
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from session_vyos_service import get_session_vyos_service
from vyos_builders.service_monitoring import ServiceMonitoringBatchBuilder

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/service-monitoring", tags=["service-monitoring"])


# =============================================================================
# Pydantic Models
# =============================================================================


class TelegrafInfluxDBAuth(BaseModel):
    token: Optional[str] = None
    organization: Optional[str] = None


class TelegrafInfluxDB(BaseModel):
    url: Optional[str] = None
    port: Optional[int] = None
    bucket: Optional[str] = None
    authentication: TelegrafInfluxDBAuth = Field(default_factory=TelegrafInfluxDBAuth)


class TelegrafLokiAuth(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None


class TelegrafLoki(BaseModel):
    url: Optional[str] = None
    port: Optional[int] = None
    metric_name_label: Optional[str] = None
    authentication: TelegrafLokiAuth = Field(default_factory=TelegrafLokiAuth)


class TelegrafSplunkAuth(BaseModel):
    token: Optional[str] = None
    insecure: bool = False


class TelegrafSplunk(BaseModel):
    url: Optional[str] = None
    authentication: TelegrafSplunkAuth = Field(default_factory=TelegrafSplunkAuth)


class TelegrafAzureAuth(BaseModel):
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    tenant_id: Optional[str] = None


class TelegrafAzure(BaseModel):
    url: Optional[str] = None
    database: Optional[str] = None
    table: Optional[str] = None
    group_metrics: Optional[str] = None
    authentication: TelegrafAzureAuth = Field(default_factory=TelegrafAzureAuth)


class TelegrafPrometheusClientAuth(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None


class TelegrafPrometheusClient(BaseModel):
    port: Optional[int] = None
    listen_address: Optional[str] = None
    metric_version: Optional[int] = None
    allow_from: List[str] = []
    authentication: TelegrafPrometheusClientAuth = Field(default_factory=TelegrafPrometheusClientAuth)


class TelegrafConfig(BaseModel):
    sources: List[str] = []
    vrf: Optional[str] = None
    influxdb: Optional[TelegrafInfluxDB] = None
    loki: Optional[TelegrafLoki] = None
    splunk: Optional[TelegrafSplunk] = None
    azure_data_explorer: Optional[TelegrafAzure] = None
    prometheus_client: Optional[TelegrafPrometheusClient] = None


class ZabbixAuth(BaseModel):
    mode: Optional[str] = None
    psk_id: Optional[str] = None
    psk_secret: Optional[str] = None


class ZabbixLimits(BaseModel):
    buffer_flush_interval: Optional[int] = None
    buffer_size: Optional[int] = None


class ZabbixLog(BaseModel):
    debug_level: Optional[str] = None
    size: Optional[int] = None
    remote_commands: bool = False


class ZabbixServerActive(BaseModel):
    address: str
    port: Optional[int] = None


class ZabbixConfig(BaseModel):
    host_name: Optional[str] = None
    port: Optional[int] = None
    listen_addresses: List[str] = []
    directory: Optional[str] = None
    timeout: Optional[int] = None
    servers: List[str] = []
    servers_active: List[ZabbixServerActive] = []
    authentication: ZabbixAuth = Field(default_factory=ZabbixAuth)
    limits: ZabbixLimits = Field(default_factory=ZabbixLimits)
    log: ZabbixLog = Field(default_factory=ZabbixLog)


class PrometheusExporterBase(BaseModel):
    port: Optional[int] = None
    listen_addresses: List[str] = []
    vrf: Optional[str] = None


class PrometheusNodeExporter(PrometheusExporterBase):
    textfile_collector: bool = False


class PrometheusBlackboxICMPModule(BaseModel):
    name: str
    preferred_ip_protocol: Optional[str] = None
    ip_protocol_fallback: bool = False
    timeout: Optional[int] = None


class PrometheusBlackboxDNSModule(BaseModel):
    name: str
    preferred_ip_protocol: Optional[str] = None
    ip_protocol_fallback: bool = False
    timeout: Optional[int] = None
    query_name: Optional[str] = None
    query_type: Optional[str] = None


class PrometheusBlackboxExporter(PrometheusExporterBase):
    icmp_modules: List[PrometheusBlackboxICMPModule] = []
    dns_modules: List[PrometheusBlackboxDNSModule] = []


class PrometheusConfig(BaseModel):
    node_exporter: Optional[PrometheusNodeExporter] = None
    frr_exporter: Optional[PrometheusExporterBase] = None
    blackbox_exporter: Optional[PrometheusBlackboxExporter] = None


class NetworkEventConfig(BaseModel):
    log_level: Optional[str] = None
    queue_size: Optional[int] = None
    events: List[str] = []


class ServiceMonitoringConfig(BaseModel):
    telegraf: Optional[TelegrafConfig] = None
    zabbix_agent: Optional[ZabbixConfig] = None
    prometheus: Optional[PrometheusConfig] = None
    network_event: Optional[NetworkEventConfig] = None


class ServiceMonitoringBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated (e.g., 'module_name,ipv4')."
        ),
    )


class ServiceMonitoringBatchRequest(BaseModel):
    operations: List[ServiceMonitoringBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# =============================================================================
# Internal denylist
# =============================================================================

_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty",
    "get_capabilities", "mappers", "version", "_operations", "m",
})


# =============================================================================
# Endpoint 1: Capabilities
# =============================================================================


@router.get("/capabilities")
async def get_service_monitoring_capabilities(request: Request):
    """Return service monitoring feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.SERVICE_MONITORING)
    try:
        service = get_session_vyos_service(request)
        builder = ServiceMonitoringBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_service_monitoring_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# Endpoint 2: Config
# =============================================================================


@router.get("/config", response_model=ServiceMonitoringConfig)
async def get_service_monitoring_config(http_request: Request, refresh: bool = False):
    """Return the full service monitoring configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.SERVICE_MONITORING)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        monitoring_raw = full_config.get("service", {}).get("monitoring", {})
        if not monitoring_raw:
            return ServiceMonitoringConfig()

        return ServiceMonitoringConfig(
            telegraf=_parse_telegraf(monitoring_raw.get("telegraf")),
            zabbix_agent=_parse_zabbix(monitoring_raw.get("zabbix-agent")),
            prometheus=_parse_prometheus(monitoring_raw.get("prometheus")),
            network_event=_parse_network_event(monitoring_raw.get("network-event")),
        )
    except Exception:
        logger.exception("Unhandled error in get_service_monitoring_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# Endpoint 3: Batch
# =============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def service_monitoring_batch_configure(
    http_request: Request, body: ServiceMonitoringBatchRequest
):
    """Execute a batch of service monitoring configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.SERVICE_MONITORING)
    try:
        service = get_session_vyos_service(http_request)
        builder = ServiceMonitoringBatchBuilder(version=service.get_version())

        for operation in body.operations:
            if operation.op in _INTERNAL_BUILDER_METHODS or operation.op.startswith("_"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation not allowed: {operation.op}",
                )

            method = getattr(builder, operation.op, None)
            if method is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown operation: {operation.op}",
                )

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
            data={"message": "Service monitoring configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in service_monitoring_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# Config parsers
# =============================================================================


def _str_val(raw) -> Optional[str]:
    """Safely coerce a config value to string."""
    if raw is None:
        return None
    if isinstance(raw, dict):
        return next(iter(raw.keys()), None)
    return str(raw)


def _int_val(raw) -> Optional[int]:
    v = _str_val(raw)
    if v is None:
        return None
    try:
        return int(v)
    except (ValueError, TypeError):
        return None


def _multi_list(raw) -> List[str]:
    """Parse a VyOS multi-value node into a sorted list."""
    if raw is None:
        return []
    if isinstance(raw, list):
        return sorted(raw)
    if isinstance(raw, dict):
        return sorted(raw.keys())
    return [str(raw)]


def _parse_telegraf(raw) -> Optional[TelegrafConfig]:
    if not raw or not isinstance(raw, dict):
        return None

    return TelegrafConfig(
        sources=_multi_list(raw.get("source")),
        vrf=_str_val(raw.get("vrf")),
        influxdb=_parse_telegraf_influxdb(raw.get("influxdb")),
        loki=_parse_telegraf_loki(raw.get("loki")),
        splunk=_parse_telegraf_splunk(raw.get("splunk")),
        azure_data_explorer=_parse_telegraf_azure(raw.get("azure-data-explorer")),
        prometheus_client=_parse_telegraf_prometheus_client(raw.get("prometheus-client")),
    )


def _parse_telegraf_influxdb(raw) -> Optional[TelegrafInfluxDB]:
    if not raw or not isinstance(raw, dict):
        return None
    auth_raw = raw.get("authentication", {}) or {}
    return TelegrafInfluxDB(
        url=_str_val(raw.get("url")),
        port=_int_val(raw.get("port")),
        bucket=_str_val(raw.get("bucket")),
        authentication=TelegrafInfluxDBAuth(
            token=_str_val(auth_raw.get("token")),
            organization=_str_val(auth_raw.get("organization")),
        ),
    )


def _parse_telegraf_loki(raw) -> Optional[TelegrafLoki]:
    if not raw or not isinstance(raw, dict):
        return None
    auth_raw = raw.get("authentication", {}) or {}
    return TelegrafLoki(
        url=_str_val(raw.get("url")),
        port=_int_val(raw.get("port")),
        metric_name_label=_str_val(raw.get("metric-name-label")),
        authentication=TelegrafLokiAuth(
            username=_str_val(auth_raw.get("username")),
            password=_str_val(auth_raw.get("password")),
        ),
    )


def _parse_telegraf_splunk(raw) -> Optional[TelegrafSplunk]:
    if not raw or not isinstance(raw, dict):
        return None
    auth_raw = raw.get("authentication", {}) or {}
    return TelegrafSplunk(
        url=_str_val(raw.get("url")),
        authentication=TelegrafSplunkAuth(
            token=_str_val(auth_raw.get("token")),
            insecure="insecure" in auth_raw,
        ),
    )


def _parse_telegraf_azure(raw) -> Optional[TelegrafAzure]:
    if not raw or not isinstance(raw, dict):
        return None
    auth_raw = raw.get("authentication", {}) or {}
    return TelegrafAzure(
        url=_str_val(raw.get("url")),
        database=_str_val(raw.get("database")),
        table=_str_val(raw.get("table")),
        group_metrics=_str_val(raw.get("group-metrics")),
        authentication=TelegrafAzureAuth(
            client_id=_str_val(auth_raw.get("client-id")),
            client_secret=_str_val(auth_raw.get("client-secret")),
            tenant_id=_str_val(auth_raw.get("tenant-id")),
        ),
    )


def _parse_telegraf_prometheus_client(raw) -> Optional[TelegrafPrometheusClient]:
    if not raw or not isinstance(raw, dict):
        return None
    auth_raw = raw.get("authentication", {}) or {}
    return TelegrafPrometheusClient(
        port=_int_val(raw.get("port")),
        listen_address=_str_val(raw.get("listen-address")),
        metric_version=_int_val(raw.get("metric-version")),
        allow_from=_multi_list(raw.get("allow-from")),
        authentication=TelegrafPrometheusClientAuth(
            username=_str_val(auth_raw.get("username")),
            password=_str_val(auth_raw.get("password")),
        ),
    )


def _parse_zabbix(raw) -> Optional[ZabbixConfig]:
    if not raw or not isinstance(raw, dict):
        return None

    auth_raw = raw.get("authentication", {}) or {}
    psk_raw = auth_raw.get("psk", {}) or {}
    limits_raw = raw.get("limits", {}) or {}
    log_raw = raw.get("log", {}) or {}

    servers_active = []
    sa_raw = raw.get("server-active", {})
    if sa_raw and isinstance(sa_raw, dict):
        for addr, sa_cfg in sa_raw.items():
            port = None
            if sa_cfg and isinstance(sa_cfg, dict):
                port = _int_val(sa_cfg.get("port"))
            servers_active.append(ZabbixServerActive(address=addr, port=port))
    servers_active.sort(key=lambda s: s.address)

    return ZabbixConfig(
        host_name=_str_val(raw.get("host-name")),
        port=_int_val(raw.get("port")),
        listen_addresses=_multi_list(raw.get("listen-address")),
        directory=_str_val(raw.get("directory")),
        timeout=_int_val(raw.get("timeout")),
        servers=_multi_list(raw.get("server")),
        servers_active=servers_active,
        authentication=ZabbixAuth(
            mode=_str_val(auth_raw.get("mode")),
            psk_id=_str_val(psk_raw.get("id")),
            psk_secret=_str_val(psk_raw.get("secret")),
        ),
        limits=ZabbixLimits(
            buffer_flush_interval=_int_val(limits_raw.get("buffer-flush-interval")),
            buffer_size=_int_val(limits_raw.get("buffer-size")),
        ),
        log=ZabbixLog(
            debug_level=_str_val(log_raw.get("debug-level")),
            size=_int_val(log_raw.get("size")),
            remote_commands="remote-commands" in log_raw,
        ),
    )


def _parse_prometheus(raw) -> Optional[PrometheusConfig]:
    if not raw or not isinstance(raw, dict):
        return None

    return PrometheusConfig(
        node_exporter=_parse_prometheus_node_exporter(raw.get("node-exporter")),
        frr_exporter=_parse_prometheus_base_exporter(raw.get("frr-exporter")),
        blackbox_exporter=_parse_prometheus_blackbox(raw.get("blackbox-exporter")),
    )


def _parse_prometheus_base_exporter(raw) -> Optional[PrometheusExporterBase]:
    if not raw or not isinstance(raw, dict):
        return None
    return PrometheusExporterBase(
        port=_int_val(raw.get("port")),
        listen_addresses=_multi_list(raw.get("listen-address")),
        vrf=_str_val(raw.get("vrf")),
    )


def _parse_prometheus_node_exporter(raw) -> Optional[PrometheusNodeExporter]:
    if not raw or not isinstance(raw, dict):
        return None
    collectors_raw = raw.get("collectors", {}) or {}
    return PrometheusNodeExporter(
        port=_int_val(raw.get("port")),
        listen_addresses=_multi_list(raw.get("listen-address")),
        vrf=_str_val(raw.get("vrf")),
        textfile_collector="textfile" in collectors_raw,
    )


def _parse_prometheus_blackbox(raw) -> Optional[PrometheusBlackboxExporter]:
    if not raw or not isinstance(raw, dict):
        return None

    modules_raw = raw.get("modules", {}) or {}

    icmp_modules = []
    icmp_raw = modules_raw.get("icmp", {})
    if icmp_raw and isinstance(icmp_raw, dict):
        for name, cfg in icmp_raw.items():
            cfg = cfg or {}
            icmp_modules.append(PrometheusBlackboxICMPModule(
                name=name,
                preferred_ip_protocol=_str_val(cfg.get("preferred-ip-protocol")),
                ip_protocol_fallback="ip-protocol-fallback" in cfg,
                timeout=_int_val(cfg.get("timeout")),
            ))
    icmp_modules.sort(key=lambda m: m.name)

    dns_modules = []
    dns_raw = modules_raw.get("dns", {})
    if dns_raw and isinstance(dns_raw, dict):
        for name, cfg in dns_raw.items():
            cfg = cfg or {}
            dns_modules.append(PrometheusBlackboxDNSModule(
                name=name,
                preferred_ip_protocol=_str_val(cfg.get("preferred-ip-protocol")),
                ip_protocol_fallback="ip-protocol-fallback" in cfg,
                timeout=_int_val(cfg.get("timeout")),
                query_name=_str_val(cfg.get("query-name")),
                query_type=_str_val(cfg.get("query-type")),
            ))
    dns_modules.sort(key=lambda m: m.name)

    return PrometheusBlackboxExporter(
        port=_int_val(raw.get("port")),
        listen_addresses=_multi_list(raw.get("listen-address")),
        vrf=_str_val(raw.get("vrf")),
        icmp_modules=icmp_modules,
        dns_modules=dns_modules,
    )


def _parse_network_event(raw) -> Optional[NetworkEventConfig]:
    if not raw or not isinstance(raw, dict):
        return None

    events_raw = raw.get("event", {})
    if isinstance(events_raw, dict):
        events = sorted(events_raw.keys())
    else:
        events = []

    return NetworkEventConfig(
        log_level=_str_val(raw.get("log-level")),
        queue_size=_int_val(raw.get("queue-size")),
        events=events,
    )
