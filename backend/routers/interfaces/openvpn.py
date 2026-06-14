"""
OpenVPN Interface Configuration Endpoints

All OpenVPN interface endpoints for VyOS configuration.
OpenVPN provides secure tunneling with site-to-site, client, and server modes.
"""

import base64
import inspect
import logging
from typing import Dict, List, Optional, Any

from cryptography import x509
from cryptography.x509.oid import NameOID
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ConfigDict
from starlette.concurrency import run_in_threadpool

from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from session_vyos_service import get_session_vyos_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/openvpn", tags=["openvpn-interface"])


# Stub functions for backwards compatibility with app.py
def set_device_registry(registry):
    """Legacy function - no longer used."""
    pass


def set_configured_device_name(name):
    """Legacy function - no longer used."""
    pass


# ============================================================================
# Request / Response Models
# ============================================================================


class BatchOperation(BaseModel):
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value (if required)")


class BatchRequest(BaseModel):
    interface: str = Field(..., description="Interface name (e.g., vtun0)")
    operations: List[BatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class OpenvpnAuthentication(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnLocalAddress(BaseModel):
    address: str
    subnet_mask: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnReplaceDefaultRoute(BaseModel):
    enabled: bool = False
    local: bool = False

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnKeepAlive(BaseModel):
    failure_count: Optional[str] = None
    interval: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnEncryption(BaseModel):
    cipher: Optional[str] = None
    data_ciphers: List[str] = Field(default_factory=list)
    data_ciphers_fallback: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnTls(BaseModel):
    auth_key: Optional[str] = None
    ca_certificates: List[str] = Field(default_factory=list)
    certificate: Optional[str] = None
    crypt_key: Optional[str] = None
    dh_params: Optional[str] = None
    peer_fingerprints: List[str] = Field(default_factory=list)
    role: Optional[str] = None
    tls_version_min: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnServerBridge(BaseModel):
    gateway: Optional[str] = None
    start: Optional[str] = None
    stop: Optional[str] = None
    subnet_mask: Optional[str] = None
    disable: bool = False

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnClientIpPool(BaseModel):
    start: Optional[str] = None
    stop: Optional[str] = None
    subnet_mask: Optional[str] = None
    disable: bool = False

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnClientIpv6Pool(BaseModel):
    base: Optional[str] = None
    disable: bool = False

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnServerClient(BaseModel):
    name: str
    disable: bool = False
    ip: Optional[str] = None
    push_route: List[str] = Field(default_factory=list)
    subnet: List[str] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnServerPushRoute(BaseModel):
    route: str
    metric: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnServerMfaTotp(BaseModel):
    challenge: Optional[str] = None
    digits: Optional[str] = None
    drift: Optional[str] = None
    slop: Optional[str] = None
    step: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnServer(BaseModel):
    subnet: List[str] = Field(default_factory=list)
    topology: Optional[str] = None
    domain_name: Optional[str] = None
    max_connections: Optional[str] = None
    name_server: List[str] = Field(default_factory=list)
    reject_unconfigured_clients: bool = False
    push_route: List[OpenvpnServerPushRoute] = Field(default_factory=list)
    bridge: Optional[OpenvpnServerBridge] = None
    client_ip_pool: Optional[OpenvpnClientIpPool] = None
    client_ipv6_pool: Optional[OpenvpnClientIpv6Pool] = None
    clients: List[OpenvpnServerClient] = Field(default_factory=list)
    mfa_totp: Optional[OpenvpnServerMfaTotp] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnIpConfig(BaseModel):
    adjust_mss: Optional[str] = None
    arp_cache_timeout: Optional[str] = None
    disable_arp_filter: bool = False
    disable_forwarding: bool = False
    enable_arp_accept: bool = False
    enable_arp_announce: bool = False
    enable_arp_ignore: bool = False
    enable_directed_broadcast: bool = False
    enable_proxy_arp: bool = False
    proxy_arp_pvlan: bool = False
    source_validation: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnIpv6Config(BaseModel):
    accept_dad: Optional[str] = None
    address_autoconf: bool = False
    address_eui64: Optional[str] = None
    address_no_default_link_local: bool = False
    address_interface_identifier: Optional[str] = None
    adjust_mss: Optional[str] = None
    base_reachable_time: Optional[str] = None
    disable_forwarding: bool = False
    dup_addr_detect_transmits: Optional[str] = None
    source_validation: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnInterfaceConfig(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    disabled: bool = False
    device_type: Optional[str] = None
    mode: Optional[str] = None
    protocol: Optional[str] = None
    vrf: Optional[str] = None
    persistent_tunnel: bool = False
    use_lzo_compression: bool = False
    redirect: Optional[str] = None
    replace_default_route: Optional[OpenvpnReplaceDefaultRoute] = None
    offload_dco: bool = False
    openvpn_options: List[str] = Field(default_factory=list)
    authentication: Optional[OpenvpnAuthentication] = None
    local_addresses: List[OpenvpnLocalAddress] = Field(default_factory=list)
    local_host: Optional[str] = None
    local_port: Optional[str] = None
    remote_address: List[str] = Field(default_factory=list)
    remote_host: List[str] = Field(default_factory=list)
    remote_port: Optional[str] = None
    keep_alive: Optional[OpenvpnKeepAlive] = None
    shared_secret_key: Optional[str] = None
    encryption: Optional[OpenvpnEncryption] = None
    hash: Optional[str] = None
    tls: Optional[OpenvpnTls] = None
    server: Optional[OpenvpnServer] = None
    ip: Optional[OpenvpnIpConfig] = None
    ipv6: Optional[OpenvpnIpv6Config] = None
    mirror_ingress: Optional[str] = None
    mirror_egress: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OpenvpnInterfacesConfigResponse(BaseModel):
    interfaces: List[OpenvpnInterfaceConfig] = Field(default_factory=list)
    total: int = 0


class OpenvpnClientExportRequest(BaseModel):
    interface: str = Field(..., description="Server-mode OpenVPN interface (e.g. vtun0)")
    ca: Optional[str] = Field(None, description="PKI CA name; defaults to the server's tls ca-certificate")
    certificate: str = Field(..., description="PKI certificate name issued to the client")
    key: Optional[str] = Field(None, description="PKI certificate key name; defaults to the certificate name")
    remote_host: Optional[str] = Field(None, description="Public address/hostname clients connect to (fills the remote line)")


class OpenvpnClientExportResponse(BaseModel):
    success: bool
    filename: Optional[str] = None
    config: Optional[str] = None
    error: Optional[str] = None


class OpenvpnExportCertificate(BaseModel):
    name: str
    cn: Optional[str] = None


class OpenvpnExportOptions(BaseModel):
    """PKI material available for building a client export, with decoded CNs.

    The certificate CN is what matches a server's per-client (`server client
    <name>`) settings, so the UI can map an assigned client to a certificate.
    """

    cas: List[str] = Field(default_factory=list)
    certificates: List[OpenvpnExportCertificate] = Field(default_factory=list)


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_capabilities(request: Request) -> Dict[str, Any]:
    """Return version-aware feature capabilities for OpenVPN interfaces."""
    await require_read_permission(request, FeatureGroup.OPENVPN)
    service = get_session_vyos_service(request)
    from vyos_builders.interfaces.openvpn import OpenvpnInterfaceBuilderMixin
    builder = OpenvpnInterfaceBuilderMixin(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config", response_model=OpenvpnInterfacesConfigResponse)
async def get_config(http_request: Request, refresh: bool = False) -> OpenvpnInterfacesConfigResponse:
    """Get all OpenVPN interface configurations from VyOS."""
    await require_read_permission(http_request, FeatureGroup.OPENVPN)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh)
        raw_config = full_config.get("interfaces", {}).get("openvpn", {})

        from vyos_mappers.interfaces.openvpn_versions import get_openvpn_mapper
        mapper = get_openvpn_mapper(service.get_version())
        parsed = mapper.parse_interfaces_of_type(raw_config)
        return OpenvpnInterfacesConfigResponse(**parsed)
    except Exception:
        logger.exception("Unhandled error in get_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: BatchRequest) -> VyOSResponse:
    """
    Configure an OpenVPN interface using batch operations.

    **Multi-parameter operations:** for builder methods that require more than
    the interface name + one value, encode extras in `value` using colon-separated
    components (e.g., `address:mask`, `client:ip`, `client:route`, `route:metric`).
    """
    await require_write_permission(http_request, FeatureGroup.OPENVPN)

    try:
        service = get_session_vyos_service(http_request)
        batch = service.create_openvpn_batch()

        for op in request.operations:
            if op.op in batch._INTERNAL_BUILDER_METHODS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation '{op.op}' is not a valid interface operation",
                )

            method = getattr(batch, op.op, None)
            if method is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported operation: {op.op}",
                )

            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 1:
                method(request.interface)
            elif len(params) == 2:
                if op.value is None:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{op.op}' requires a value",
                    )
                method(request.interface, op.value)
            elif len(params) == 3:
                if op.value is None:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{op.op}' requires a value",
                    )
                parts = op.value.split(":", 1)
                if len(parts) != 2:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{op.op}' requires value in 'param1:param2' format",
                    )
                method(request.interface, parts[0], parts[1])
            elif len(params) == 4:
                if op.value is None:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{op.op}' requires a value",
                    )
                parts = op.value.split(":", 2)
                if len(parts) != 3:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{op.op}' requires value in 'param1:param2:param3' format",
                    )
                method(request.interface, parts[0], parts[1], parts[2])
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation '{op.op}' has unexpected signature",
                )

        response = service.execute_batch(batch)
        return VyOSResponse(
            success=response.status == 200,
            data=response.result if isinstance(response.result, dict) else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except NotImplementedError as e:
        logger.info("Unsupported operation '%s' for this VyOS version: %s", op.op, e)
        raise HTTPException(
            status_code=400,
            detail=f"Operation '{op.op}' is not supported on this VyOS version",
        )
    except Exception:
        logger.exception("Unhandled error in batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Client config export (operational `generate openvpn client-config`)
# ============================================================================


def _certificate_cn(cert_b64: Optional[str]) -> Optional[str]:
    """Decode the Common Name from a base64 DER certificate (as stored in PKI).

    Returns None for missing/unissued (e.g. ACME) or unparseable certificates.
    """
    if not cert_b64:
        return None
    try:
        der = base64.b64decode(cert_b64 + "=" * (-len(cert_b64) % 4))
        cert = x509.load_der_x509_certificate(der)
        attrs = cert.subject.get_attributes_for_oid(NameOID.COMMON_NAME)
        return attrs[0].value if attrs else None
    except Exception:
        logger.warning("Could not decode certificate CN", exc_info=True)
        return None


@router.get("/export-options", response_model=OpenvpnExportOptions)
async def get_export_options(http_request: Request) -> OpenvpnExportOptions:
    """List PKI CAs and certificates (with decoded CNs) for the export dialog."""
    await require_read_permission(http_request, FeatureGroup.OPENVPN)
    service = get_session_vyos_service(http_request)
    full_config = await run_in_threadpool(service.get_full_config)

    pki = full_config.get("pki", {}) or {}
    cas = sorted((pki.get("ca", {}) or {}).keys())
    certificates = [
        OpenvpnExportCertificate(name=name, cn=_certificate_cn((data or {}).get("certificate")))
        for name, data in (pki.get("certificate", {}) or {}).items()
    ]
    certificates.sort(key=lambda c: c.name)
    return OpenvpnExportOptions(cas=cas, certificates=certificates)


def _apply_remote_host(ovpn: str, remote_host: str) -> str:
    """Rewrite the `remote <host> <port>` line with the user-supplied host.

    VyOS only fills a real address when the server has `local-host` set;
    otherwise it emits a `x.x.x.x` placeholder. The port (and any trailing
    tokens) are preserved.
    """
    lines = ovpn.splitlines()
    for idx, line in enumerate(lines):
        if line.strip().startswith("remote "):
            parts = line.split()
            rest = parts[2:]  # everything after the placeholder host (port, etc.)
            lines[idx] = " ".join(["remote", remote_host, *rest])
            break
    return "\n".join(lines) + ("\n" if ovpn.endswith("\n") else "")


def _build_tls_key_block(secret_hex: str, *, is_crypt: bool) -> str:
    """Build a <tls-auth>/<tls-crypt> inline block from a PKI shared-secret.

    VyOS stores the static key as a single hex line wrapped in the standard
    OpenVPN Static key V1 markers (matching the on-router .key file). tls-auth
    additionally needs `key-direction 1` on the client side (server uses 0).
    """
    tag = "tls-crypt" if is_crypt else "tls-auth"
    block = (
        f"<{tag}>\n"
        "-----BEGIN OpenVPN Static key V1-----\n"
        f"{secret_hex}\n"
        "-----END OpenVPN Static key V1-----\n"
        f"</{tag}>\n"
    )
    if not is_crypt:
        block += "key-direction 1\n"
    return block


@router.post("/client-export", response_model=OpenvpnClientExportResponse)
async def client_export(http_request: Request, request: OpenvpnClientExportRequest) -> OpenvpnClientExportResponse:
    """Generate a ready-to-use client .ovpn for a server-mode OpenVPN interface.

    Wraps VyOS's `generate openvpn client-config` op-mode command, then fills in
    the public remote host and embeds the server's TLS auth/crypt key so the
    resulting profile connects without hand-editing. Reveals private key
    material, so it requires write permission (same as PKI reveal).
    """
    await require_write_permission(http_request, FeatureGroup.OPENVPN)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)

        iface = request.interface
        ovpn_cfg = full_config.get("interfaces", {}).get("openvpn", {})
        iface_cfg = ovpn_cfg.get(iface)
        if iface_cfg is None:
            raise HTTPException(status_code=404, detail=f"OpenVPN interface '{iface}' not found")
        if iface_cfg.get("mode") != "server":
            raise HTTPException(
                status_code=400,
                detail="Client export is only available for server-mode interfaces",
            )

        tls_cfg = iface_cfg.get("tls", {}) or {}
        ca = request.ca or tls_cfg.get("ca-certificate")
        if isinstance(ca, list):
            ca = ca[0] if ca else None
        if not ca:
            raise HTTPException(
                status_code=400,
                detail="No CA certificate specified and none configured on the interface",
            )

        cert = request.certificate
        path = ["openvpn", "client-config", "interface", iface, "ca", ca, "certificate", cert]
        if request.key:
            path += ["key", request.key]

        response = await run_in_threadpool(service.generate, path)
        if response.status != 200 or not isinstance(response.result, str):
            error_msg = response.error if response.error else "Failed to generate client config"
            return OpenvpnClientExportResponse(success=False, error=str(error_msg))

        ovpn = response.result
        # VyOS prints this (and exits 0) when the interface has no openvpn config.
        if ovpn.strip() in {"", "OpenVPN not configured"} or "does not exist" in ovpn:
            return OpenvpnClientExportResponse(success=False, error=ovpn.strip() or "Empty client config")

        if request.remote_host:
            ovpn = _apply_remote_host(ovpn, request.remote_host)

        # Embed the server's TLS auth/crypt key (VyOS's generator omits it).
        crypt_key = tls_cfg.get("crypt-key")
        auth_key = tls_cfg.get("auth-key")
        secret_name = crypt_key or auth_key
        if secret_name:
            shared = (
                full_config.get("pki", {})
                .get("openvpn", {})
                .get("shared-secret", {})
                .get(secret_name, {})
            )
            secret_hex = shared.get("key")
            if secret_hex:
                ovpn = ovpn.rstrip("\n") + "\n\n" + _build_tls_key_block(
                    secret_hex, is_crypt=bool(crypt_key)
                )

        return OpenvpnClientExportResponse(
            success=True,
            filename=f"{iface}-{cert}.ovpn",
            config=ovpn,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in client_export")
        raise HTTPException(status_code=500, detail="Internal server error")
