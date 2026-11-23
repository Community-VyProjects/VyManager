"""
IPoE Server Router

API endpoints for managing VyOS IPoE (IP over Ethernet) server configuration.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Optional, Any, cast
from session_vyos_service import get_session_vyos_service
from vyos_builders.ipoe_server import IPoEServerBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.ipoe_server import IPoEServerMapper
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from starlette.concurrency import run_in_threadpool
import logging
from batch_dispatch import call_item_batch_op

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/ipoe-server", tags=["ipoe-server"])

# Builder ops that split their value on "|" themselves (mac|ip, prefix|mask).
COMPOSITE_OPS = frozenset({
    "set_auth_mac_ip_address",
    "set_auth_mac_vlan",
    "set_auth_mac_rate_limit_download",
    "set_auth_mac_rate_limit_upload",
    "set_ipv6_pool_prefix",
    "set_ipv6_pool_delegate",
})


# ========================================================================
# Pydantic Models
# ========================================================================

class IPoEBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Operation value (use | as separator for multi-arg)")


class IPoEBatchRequest(BaseModel):
    item_name: str = Field(..., description="Primary identifier (interface, pool name, RADIUS server IP, or 'ipoe' for global ops)")
    operations: List[IPoEBatchOperation]

    @field_validator("item_name")
    @classmethod
    def _item_name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("item_name must not be blank")
        return value


class IPoERadiusServer(BaseModel):
    address: str
    key: Optional[str] = None
    port: Optional[str] = None
    acct_port: Optional[str] = None
    priority: Optional[str] = None
    fail_time: Optional[str] = None
    disabled: bool = False
    backup: bool = False
    disable_accounting: bool = False


class IPoERadiusDynamicAuthor(BaseModel):
    server: Optional[str] = None
    port: Optional[str] = None
    key: Optional[str] = None


class IPoERadiusRateLimit(BaseModel):
    enable: bool = False
    attribute: Optional[str] = None
    vendor: Optional[str] = None
    multiplier: Optional[str] = None


class IPoERadiusSettings(BaseModel):
    servers: List[IPoERadiusServer] = []
    source_address: Optional[str] = None
    timeout: Optional[str] = None
    max_try: Optional[str] = None
    nas_identifier: Optional[str] = None
    nas_ip_address: Optional[str] = None
    accounting_interim_interval: Optional[str] = None
    acct_interim_jitter: Optional[str] = None
    acct_timeout: Optional[str] = None
    preallocate_vif: bool = False
    dynamic_author: IPoERadiusDynamicAuthor = IPoERadiusDynamicAuthor()
    rate_limit: IPoERadiusRateLimit = IPoERadiusRateLimit()


class IPoEMacRateLimit(BaseModel):
    download: Optional[str] = None
    upload: Optional[str] = None


class IPoEAuthMac(BaseModel):
    mac: str
    ip_address: Optional[str] = None
    vlan: Optional[str] = None
    rate_limit: IPoEMacRateLimit = IPoEMacRateLimit()


class IPoEAuthInterface(BaseModel):
    interface: str
    macs: List[IPoEAuthMac] = []


class IPoEAuthentication(BaseModel):
    mode: Optional[str] = None
    interfaces: List[IPoEAuthInterface] = []
    radius: IPoERadiusSettings = IPoERadiusSettings()


class IPoEClientIPPool(BaseModel):
    name: str
    ranges: List[str] = []
    next_pool: Optional[str] = None


class IPoEIPv6Prefix(BaseModel):
    prefix: str
    mask: Optional[str] = None


class IPoEIPv6Delegate(BaseModel):
    prefix: str
    delegation_prefix: Optional[str] = None


class IPoEClientIPv6Pool(BaseModel):
    name: str
    prefixes: List[IPoEIPv6Prefix] = []
    delegates: List[IPoEIPv6Delegate] = []


class IPoEExternalDhcp(BaseModel):
    dhcp_relay: Optional[str] = None
    giaddr: Optional[str] = None


class IPoEInterface(BaseModel):
    interface: str
    mode: Optional[str] = None
    network: Optional[str] = None
    start_session: Optional[str] = None
    client_subnet: Optional[str] = None
    vlans: List[str] = []
    vlan_mon: bool = False
    lua_username: Optional[str] = None
    external_dhcp: Optional[IPoEExternalDhcp] = None


class IPoELog(BaseModel):
    level: Optional[str] = None


class IPoEShaper(BaseModel):
    fwmark: Optional[str] = None


class IPoESnmp(BaseModel):
    master_agent: bool = False


class IPoEExtendedScripts(BaseModel):
    on_change: Optional[str] = None
    on_down: Optional[str] = None
    on_pre_up: Optional[str] = None
    on_up: Optional[str] = None


class IPoELimits(BaseModel):
    burst: Optional[str] = None
    connection_limit: Optional[str] = None
    timeout: Optional[str] = None


class IPoETotals(BaseModel):
    auth_interfaces: int = 0
    radius_servers: int = 0
    client_ip_pools: int = 0
    client_ipv6_pools: int = 0
    interfaces: int = 0


class IPoEConfig(BaseModel):
    configured: bool = False
    description: Optional[str] = None
    default_pool: Optional[str] = None
    default_ipv6_pool: Optional[str] = None
    gateway_addresses: List[str] = []
    name_servers: List[str] = []
    max_concurrent_sessions: Optional[str] = None
    thread_count: Optional[str] = None
    lua_file: Optional[str] = None
    log: IPoELog = IPoELog()
    shaper: IPoEShaper = IPoEShaper()
    snmp: IPoESnmp = IPoESnmp()
    extended_scripts: IPoEExtendedScripts = IPoEExtendedScripts()
    limits: IPoELimits = IPoELimits()
    authentication: IPoEAuthentication = IPoEAuthentication()
    client_ip_pools: List[IPoEClientIPPool] = []
    client_ipv6_pools: List[IPoEClientIPv6Pool] = []
    interfaces: List[IPoEInterface] = []
    totals: IPoETotals = IPoETotals()


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ========================================================================
# Endpoint 1: Capabilities
# ========================================================================

@router.get("/capabilities")
async def get_ipoe_capabilities(request: Request):
    await require_read_permission(request, FeatureGroup.IPOE_SERVER)
    try:
        service = get_session_vyos_service(request)
        builder = IPoEServerBatchBuilder(version=service.get_version())
        return builder.get_capabilities()
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in ipoe capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 2: Config
# ========================================================================

@router.get("/config", response_model=IPoEConfig)
async def get_ipoe_config(http_request: Request, refresh: bool = False):
    await require_read_permission(http_request, FeatureGroup.IPOE_SERVER)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = cast(
            IPoEServerMapper,
            CommandMapperRegistry.get_mapper("ipoe_server", service.get_version()),
        )
        return IPoEConfig(**mapper.parse_config(full_config))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in ipoe config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 3: Batch
# ========================================================================

@router.post("/batch", response_model=VyOSResponse)
async def ipoe_batch_configure(http_request: Request, body: IPoEBatchRequest):
    await require_write_permission(http_request, FeatureGroup.IPOE_SERVER)
    try:
        service = get_session_vyos_service(http_request)
        builder = IPoEServerBatchBuilder(version=service.get_version())

        for operation in body.operations:
            value = operation.value
            # An empty part of a composite value would become an empty path node.
            # A missing value is left to call_item_batch_op ("requires a value").
            if (
                operation.op in COMPOSITE_OPS
                and value
                and value.strip()
                and not all(part.strip() for part in value.split("|"))
            ):
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation {operation.op} has an invalid value",
                )
            # Every op takes the request item; a value op also takes the op
            # value as one string (test_ipoe_server_batch_router locks the arity).
            try:
                call_item_batch_op(builder, operation.op, body.item_name, value)
            except ValueError:
                # A composite value with no "|" fails the builder's split.
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation {operation.op} has an invalid value",
                )

        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "IPoE server configuration updated"} if response.status == 200 else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in ipoe batch")
        raise HTTPException(status_code=500, detail="Internal server error")
