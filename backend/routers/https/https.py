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
from vyos_builders.https import HTTPSBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

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
# Internal builder method denylist
# ============================================================================

_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty",
    "get_capabilities", "mappers", "version", "_operations", "m",
})


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

        https_raw = full_config.get("service", {}).get("https", {})
        if not https_raw:
            return HTTPSConfig()

        is_1_4 = "1.4" in service.get_version()

        return HTTPSConfig(
            listen_addresses=_parse_multi(https_raw.get("listen-address")),
            allow_client_addresses=_parse_multi(
                (https_raw.get("allow-client") or {}).get("address")
            ),
            port=_parse_int(https_raw.get("port")),
            request_body_size_limit=_parse_int(https_raw.get("request-body-size-limit")),
            tls_versions=_parse_multi(https_raw.get("tls-version")),
            vrf=_parse_scalar(https_raw.get("vrf")),
            enable_http_redirect="enable-http-redirect" in https_raw,
            certificates=_parse_certificates(https_raw.get("certificates", {})),
            api=_parse_api(https_raw.get("api", {}), is_1_4=is_1_4),
        )
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
            if operation.op in _INTERNAL_BUILDER_METHODS or operation.op.startswith("_"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation not allowed: {operation.op}",
                )

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


# ============================================================================
# Config parsers
# ============================================================================


def _parse_multi(value) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return sorted(str(v) for v in value)
    if isinstance(value, dict):
        return sorted(value.keys())
    return [str(value)]


def _parse_int(value) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _parse_scalar(value) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, list):
        return str(value[0]) if value else None
    return str(value)


def _parse_certificates(raw: dict) -> HTTPSCertificates:
    if not raw or not isinstance(raw, dict):
        return HTTPSCertificates()
    return HTTPSCertificates(
        certificate=_parse_scalar(raw.get("certificate")),
        ca_certificate=_parse_scalar(raw.get("ca-certificate")),
        dh_params=_parse_scalar(raw.get("dh-params")),
    )


def _parse_api_keys(raw) -> List[HTTPSApiKey]:
    if not raw or not isinstance(raw, dict):
        return []
    id_map = raw.get("id", {})
    if not isinstance(id_map, dict):
        return []
    result = []
    for key_id, attrs in sorted(id_map.items()):
        key_val = ""
        if isinstance(attrs, dict):
            key_val = _parse_scalar(attrs.get("key")) or ""
        result.append(HTTPSApiKey(id=key_id, key=key_val))
    return result


def _parse_graphql(raw: dict, is_1_4: bool) -> HTTPSGraphQL:
    if not raw or not isinstance(raw, dict):
        return HTTPSGraphQL()

    auth_raw = raw.get("authentication", {}) or {}
    auth = HTTPSGraphQLAuth(
        auth_type=_parse_scalar(auth_raw.get("type")),
        expiration=_parse_int(auth_raw.get("expiration")),
        secret_length=_parse_int(auth_raw.get("secret-length")),
    )

    if is_1_4:
        # CORS is at api level in 1.4, not under graphql — handled in _parse_api
        cors_origins: List[str] = []
    else:
        cors_raw = raw.get("cors", {}) or {}
        cors_origins = _parse_multi(cors_raw.get("allow-origin"))

    return HTTPSGraphQL(
        enabled=True,
        introspection="introspection" in raw,
        authentication=auth,
        cors_allow_origins=cors_origins,
    )


def _parse_api(raw: dict, is_1_4: bool) -> HTTPSApi:
    if not raw or not isinstance(raw, dict):
        return HTTPSApi()

    keys = _parse_api_keys(raw.get("keys", {}))
    graphql_raw = raw.get("graphql", {}) or {}
    graphql = _parse_graphql(graphql_raw, is_1_4=is_1_4) if graphql_raw else HTTPSGraphQL()

    if is_1_4:
        debug = "debug" in raw
        strict = "strict" in raw
        rest_enabled = debug or strict or bool(raw.get("keys"))
        # 1.4 CORS is at api level
        cors_origins = _parse_multi((raw.get("cors") or {}).get("allow-origin"))
        if cors_origins and graphql.enabled:
            graphql = HTTPSGraphQL(
                enabled=graphql.enabled,
                introspection=graphql.introspection,
                authentication=graphql.authentication,
                cors_allow_origins=cors_origins,
            )
        rest = HTTPSRestAPI(enabled=rest_enabled, debug=debug, strict=strict)
    else:
        rest_raw = raw.get("rest", {}) or {}
        rest_enabled = bool(rest_raw) or isinstance(rest_raw, dict)
        debug = "debug" in rest_raw if isinstance(rest_raw, dict) else False
        strict = "strict" in rest_raw if isinstance(rest_raw, dict) else False
        rest = HTTPSRestAPI(enabled=rest_enabled, debug=debug, strict=strict)

    return HTTPSApi(keys=keys, graphql=graphql, rest=rest)
