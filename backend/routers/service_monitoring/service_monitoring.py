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
from vyos_mappers.base import CommandMapperRegistry
from vyos_builders.service_monitoring import ServiceMonitoringBatchBuilder
from batch_dispatch import resolve_batch_method

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
        version = service.get_version()
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("service_monitoring", version)
        return ServiceMonitoringConfig(**mapper.parse_config(full_config))
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
            method = resolve_batch_method(builder, operation.op)

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
