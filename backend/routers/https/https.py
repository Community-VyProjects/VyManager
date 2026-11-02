"""HTTPS Service Router.

API endpoints for managing VyOS HTTPS management interface configuration.

Endpoints:
  GET  /vyos/https/capabilities  — version-aware feature flags
  GET  /vyos/https/config        — normalized HTTPS service configuration
  POST /vyos/https/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_mappers.base import CommandMapperRegistry
from vyos_builders.https import HTTPSBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/https", tags=["https"])


# ============================================================================
# Pydantic Models
# ============================================================================


class HTTPSCertificates(BaseModel):
    certificate: Optional[str] = None
    ca_certificate: Optional[str] = None
    dh_params: Optional[str] = None


class HTTPSApiKey(BaseModel):
    id: str
    key: str


class HTTPSGraphQLAuth(BaseModel):
    auth_type: Optional[str] = None
    expiration: Optional[int] = None
    secret_length: Optional[int] = None


class HTTPSGraphQL(BaseModel):
    enabled: bool = False
    introspection: bool = False
    authentication: HTTPSGraphQLAuth = Field(default_factory=HTTPSGraphQLAuth)
    cors_allow_origins: List[str] = []


class HTTPSRestAPI(BaseModel):
    enabled: bool = False
    debug: bool = False
    strict: bool = False


class HTTPSApi(BaseModel):
    keys: List[HTTPSApiKey] = []
    graphql: HTTPSGraphQL = Field(default_factory=HTTPSGraphQL)
    rest: HTTPSRestAPI = Field(default_factory=HTTPSRestAPI)


class HTTPSConfig(BaseModel):
    listen_addresses: List[str] = []
    allow_client_addresses: List[str] = []
    port: Optional[int] = None
    request_body_size_limit: Optional[int] = None
    tls_versions: List[str] = []
    vrf: Optional[str] = None
    enable_http_redirect: bool = False
    certificates: HTTPSCertificates = Field(default_factory=HTTPSCertificates)
    api: HTTPSApi = Field(default_factory=HTTPSApi)


class HTTPSBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated."
        ),
    )


class HTTPSBatchRequest(BaseModel):
    operations: List[HTTPSBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_https_capabilities(request: Request):
    """Return HTTPS service feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.HTTPS)
    try:
        service = get_session_vyos_service(request)
        builder = HTTPSBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_https_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=HTTPSConfig)
async def get_https_config(http_request: Request, refresh: bool = False):
    """Return the full HTTPS service configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.HTTPS)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("https", service.get_version())
        return HTTPSConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error in get_https_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def https_batch_configure(http_request: Request, body: HTTPSBatchRequest):
    """Execute a batch of HTTPS service configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.HTTPS)
    try:
        service = get_session_vyos_service(http_request)
        builder = HTTPSBatchBuilder(version=service.get_version())

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
            data={"message": "HTTPS service configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in https_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")

