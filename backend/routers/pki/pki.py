"""
PKI (Public Key Infrastructure) Router

API endpoints for managing VyOS PKI configuration including:
- Certificate Authorities (CA)
- Certificates (including ACME/Let's Encrypt)
- Diffie-Hellman parameters
- Key Pairs
- OpenSSH keys
- OpenVPN shared secrets
- X509 defaults

Uses session-based architecture - VyOS instance comes from user's active session.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, Literal
from session_vyos_service import get_session_vyos_service
from vyos_builders.pki import PKIBatchBuilder
from vyos_mappers.pki import PKIMapper
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/pki", tags=["pki"])

# Builder infrastructure methods that must never be invokable via the batch API
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty", "clear", "operation_count",
})

# Operations whose values contain PEM/key data that must be newline-stripped
_PEM_VALUE_OPS = frozenset({
    "set_ca_certificate", "set_ca_private_key", "set_ca_crl",
    "set_certificate_cert", "set_certificate_private_key",
    "set_dh_parameters",
    "set_key_pair_private_key", "set_key_pair_public_key",
    "set_openssh_private_key", "set_openssh_public_key",
    "set_openvpn_shared_secret_key",
})


def _normalize_pem(value: str) -> str:
    """Strip PEM headers/footers and newlines so VyOS gets a single-line base64 value.

    VyOS config values cannot contain newlines.  If *value* looks like PEM-encoded
    data, the ``-----BEGIN …-----`` / ``-----END …-----`` wrapper lines are removed
    and all remaining whitespace is collapsed, yielding a continuous base64 string.
    Non-PEM values are returned unchanged.
    """
    import re
    stripped = value.strip()
    if stripped.startswith("-----BEGIN "):
        # Remove header and footer lines, then collapse whitespace
        stripped = re.sub(r"-----[A-Z0-9 ]+-----", "", stripped)
        return stripped.replace("\n", "").replace("\r", "").replace(" ", "")
    return stripped


# ========================================================================
# Pydantic Models
# ========================================================================

class PKIBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name (e.g., create_ca, set_ca_certificate)")
    value: Optional[str] = Field(None, description="Operation value")


class PKIBatchRequest(BaseModel):
    """Batch request for PKI configuration changes."""
    item_name: str = Field(..., description="Primary item name (e.g., CA name, cert name, or placeholder for global ops)")
    operations: List[PKIBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ========================================================================
# Endpoint 1: Capabilities
# ========================================================================

@router.get("/capabilities")
async def get_pki_capabilities(request: Request):
    """
    Get PKI capabilities based on device VyOS version.

    Returns feature flags indicating which operations are supported.
    """
    await require_read_permission(request, FeatureGroup.PKI)
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()

        builder = PKIBatchBuilder(version=version)
        return builder.get_capabilities()
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 2: Config (Generalized Data)
# ========================================================================

@router.get("/config")
async def get_pki_config(request: Request, refresh: bool = False):
    """
    Get PKI configuration from VyOS.

    Returns generalized PKI configuration data including:
    - Certificate Authorities
    - Certificates (with ACME info)
    - Diffie-Hellman parameters
    - Key Pairs
    - OpenSSH keys
    - OpenVPN shared secrets
    - X509 defaults
    """
    await require_read_permission(request, FeatureGroup.PKI)
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()

        full_config = service.get_full_config(refresh=refresh)

        mapper = PKIMapper(version)
        config = mapper.parse_config(full_config)

        # Convert CA dict to list for frontend
        ca_list = []
        for name, data in config.get("ca", {}).items():
            # Mask private keys
            masked = {**data}
            if masked.get("private_key"):
                masked["private_key"] = "***"
            ca_list.append(masked)

        # Convert certificates dict to list
        cert_list = []
        for name, data in config.get("certificates", {}).items():
            masked = {**data}
            if masked.get("private_key"):
                masked["private_key"] = "***"
            cert_list.append(masked)

        # Convert DH dict to list
        dh_list = []
        for name, data in config.get("dh", {}).items():
            masked = {**data}
            if masked.get("parameters"):
                masked["parameters"] = "***"
            dh_list.append(masked)

        # Convert key pairs dict to list
        key_pair_list = []
        for name, data in config.get("key_pairs", {}).items():
            masked = {**data}
            if masked.get("private_key"):
                masked["private_key"] = "***"
            key_pair_list.append(masked)

        # Convert OpenSSH dict to list
        openssh_list = []
        for name, data in config.get("openssh", {}).items():
            masked = {**data}
            if masked.get("private_key"):
                masked["private_key"] = "***"
            openssh_list.append(masked)

        # Convert OpenVPN shared secrets dict to list
        openvpn_list = []
        for name, data in config.get("openvpn_shared_secrets", {}).items():
            masked = {**data}
            if masked.get("key"):
                masked["key"] = "***"
            openvpn_list.append(masked)

        return {
            "configured": config.get("configured", False),
            "ca": ca_list,
            "certificates": cert_list,
            "dh": dh_list,
            "key_pairs": key_pair_list,
            "openssh": openssh_list,
            "openvpn_shared_secrets": openvpn_list,
            "x509_defaults": config.get("x509_defaults", {}),
            "totals": {
                "ca": len(ca_list),
                "certificates": len(cert_list),
                "dh": len(dh_list),
                "key_pairs": len(key_pair_list),
                "openssh": len(openssh_list),
                "openvpn_shared_secrets": len(openvpn_list),
            },
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint: Reveal (unmasked value for a specific PKI item field)
# ========================================================================

class PKIRevealRequest(BaseModel):
    """Request to reveal an unmasked PKI value."""
    item_type: str = Field(..., description="PKI item type: ca, certificate, dh, key_pair, openssh, openvpn")
    item_name: str = Field(..., description="Item name")
    field: str = Field(..., description="Field to reveal: certificate, private_key, public_key, parameters, key, crl")


@router.post("/reveal")
async def reveal_pki_value(http_request: Request, request: PKIRevealRequest):
    """
    Reveal an unmasked PKI value for viewing/copying.

    Requires WRITE permission since this exposes sensitive material.
    """
    await require_write_permission(http_request, FeatureGroup.PKI)
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        full_config = service.get_full_config(refresh=False)

        mapper = PKIMapper(version)
        config = mapper.parse_config(full_config)

        # Map item_type to config section
        type_map = {
            "ca": "ca",
            "certificate": "certificates",
            "dh": "dh",
            "key_pair": "key_pairs",
            "openssh": "openssh",
            "openvpn": "openvpn_shared_secrets",
        }

        section = type_map.get(request.item_type)
        if not section:
            raise HTTPException(status_code=400, detail=f"Invalid item type: {request.item_type}")

        items = config.get(section, {})
        item = items.get(request.item_name)
        if not item:
            raise HTTPException(status_code=404, detail=f"Item '{request.item_name}' not found")

        # Allowed fields per type
        allowed_fields = {
            "ca": ["certificate", "private_key", "crl"],
            "certificate": ["certificate", "private_key"],
            "dh": ["parameters"],
            "key_pair": ["private_key", "public_key"],
            "openssh": ["private_key", "public_key"],
            "openvpn": ["key"],
        }

        if request.field not in allowed_fields.get(request.item_type, []):
            raise HTTPException(status_code=400, detail=f"Invalid field '{request.field}' for type '{request.item_type}'")

        value = item.get(request.field)

        return {"value": value}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error revealing PKI value")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 3: Batch Operations
# ========================================================================

@router.post("/batch", response_model=VyOSResponse)
async def pki_batch_configure(http_request: Request, request: PKIBatchRequest):
    """
    Execute a batch of PKI configuration operations.

    All operations are executed in a single VyOS commit for atomicity.

    The item_name field serves as the primary identifier for the operations
    (e.g., CA name for CA ops, cert name for cert ops, or a
    placeholder like "pki" for global settings like X509 defaults).

    Each operation's `op` field maps to a method on PKIBatchBuilder.
    The `value` field provides additional parameters when needed.
    """
    await require_write_permission(http_request, FeatureGroup.PKI)
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        builder = PKIBatchBuilder(version=version)

        for operation in request.operations:
            if operation.op.startswith("_") or operation.op in _INTERNAL_BUILDER_METHODS:
                raise HTTPException(status_code=400, detail=f"Invalid operation: {operation.op}")

            method = getattr(builder, operation.op, None)
            if not callable(method):
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown operation: {operation.op}"
                )

            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            # Normalize PEM values (strip headers/newlines) for cert/key ops
            op_value = operation.value
            if op_value is not None and operation.op in _PEM_VALUE_OPS:
                op_value = _normalize_pem(op_value)

            args = []
            if len(params) >= 1:
                args.append(request.item_name)
            if len(params) >= 2 and op_value is not None:
                if len(params) >= 3:
                    parts = op_value.split("|", len(params) - 2)
                    args.extend(parts)
                else:
                    args.append(op_value)

            method(*args)

        if builder.is_empty():
            return VyOSResponse(
                success=True,
                data={"message": "No operations to execute"},
            )

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "PKI configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 4: Generate CA
# ========================================================================

class GenerateCARequest(BaseModel):
    """Request to generate a self-signed Certificate Authority."""
    name: str = Field(..., description="CA name")
    key_type: Literal["rsa", "ec"] = Field("rsa", description="Key type: rsa or ec")
    key_size: int = Field(2048, description="Key size in bits (RSA: 2048/3072/4096, EC: 256/384/521)")
    country: Optional[str] = Field(None, description="Country code (2 letters)")
    state: Optional[str] = Field(None, description="State or province")
    locality: Optional[str] = Field(None, description="Locality or city")
    organization: Optional[str] = Field(None, description="Organization name")
    common_name: str = Field(..., description="Common Name (CN)")
    days: int = Field(3650, description="Validity period in days")
    encrypt_key: bool = Field(False, description="Encrypt the private key with a passphrase")
    passphrase: Optional[str] = Field(None, description="Passphrase for key encryption (required if encrypt_key is True)")
    revoke: bool = Field(False, description="Mark as revoked")
    system_install: bool = Field(False, description="Install to system trust store")


@router.post("/generate-ca", response_model=VyOSResponse)
async def generate_ca(http_request: Request, request: GenerateCARequest):
    """
    Generate a self-signed CA certificate and install it on the device.

    Uses Python's cryptography library to generate the CA cert+key,
    then installs via the normal batch config API.
    """
    await require_write_permission(http_request, FeatureGroup.PKI)
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa, ec

        # Validate
        if request.encrypt_key and not request.passphrase:
            raise HTTPException(status_code=400, detail="Passphrase required when encrypt_key is True")

        if request.key_type == "rsa" and request.key_size not in (2048, 3072, 4096):
            raise HTTPException(status_code=400, detail="RSA key size must be 2048, 3072, or 4096")

        if request.key_type == "ec" and request.key_size not in (256, 384, 521):
            raise HTTPException(status_code=400, detail="EC key size must be 256, 384, or 521")

        # Generate private key
        if request.key_type == "rsa":
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=request.key_size,
            )
        else:
            curve_map = {256: ec.SECP256R1(), 384: ec.SECP384R1(), 521: ec.SECP521R1()}
            private_key = ec.generate_private_key(curve_map[request.key_size])

        # Build subject
        name_attrs = []
        if request.country:
            name_attrs.append(x509.NameAttribute(NameOID.COUNTRY_NAME, request.country[:2]))
        if request.state:
            name_attrs.append(x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, request.state))
        if request.locality:
            name_attrs.append(x509.NameAttribute(NameOID.LOCALITY_NAME, request.locality))
        if request.organization:
            name_attrs.append(x509.NameAttribute(NameOID.ORGANIZATION_NAME, request.organization))
        name_attrs.append(x509.NameAttribute(NameOID.COMMON_NAME, request.common_name))
        subject = issuer = x509.Name(name_attrs)

        # Build certificate
        now = datetime.datetime.now(datetime.timezone.utc)
        cert = (
            x509.CertificateBuilder()
            .subject_name(subject)
            .issuer_name(issuer)
            .public_key(private_key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(now)
            .not_valid_after(now + datetime.timedelta(days=request.days))
            .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
            .add_extension(
                x509.KeyUsage(
                    digital_signature=True, key_cert_sign=True, crl_sign=True,
                    content_commitment=False, key_encipherment=False,
                    data_encipherment=False, key_agreement=False,
                    encipher_only=False, decipher_only=False,
                ),
                critical=True,
            )
            .add_extension(
                x509.SubjectKeyIdentifier.from_public_key(private_key.public_key()),
                critical=False,
            )
            .sign(private_key, hashes.SHA256())
        )

        # Serialize and strip PEM headers/newlines for VyOS config
        cert_pem = _normalize_pem(
            cert.public_bytes(serialization.Encoding.PEM).decode("utf-8")
        )

        if request.encrypt_key:
            key_pem = _normalize_pem(private_key.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.PKCS8,
                serialization.BestAvailableEncryption(request.passphrase.encode()),
            ).decode("utf-8"))
        else:
            key_pem = _normalize_pem(private_key.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.PKCS8,
                serialization.NoEncryption(),
            ).decode("utf-8"))

        # Install on device via batch operations
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = PKIBatchBuilder(version=version)

        builder.create_ca(request.name)
        builder.set_ca_certificate(request.name, cert_pem)
        builder.set_ca_private_key(request.name, key_pem)

        if request.encrypt_key:
            builder.set_ca_private_password_protected(request.name)
        if request.revoke:
            builder.set_ca_revoke(request.name)
        if request.system_install:
            builder.set_ca_system_install(request.name)

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": f"CA '{request.name}' generated and installed"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error generating CA")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 5: Generate Key Pair
# ========================================================================

class GenerateKeyPairRequest(BaseModel):
    """Request to generate a public/private key pair."""
    name: str = Field(..., description="Key pair name")
    key_type: Literal["rsa", "ec"] = Field("rsa", description="Key type: rsa or ec")
    key_size: int = Field(2048, description="Key size (RSA: 2048/3072/4096, EC: 256/384/521)")
    encrypt_key: bool = Field(False, description="Encrypt the private key")
    passphrase: Optional[str] = Field(None, description="Passphrase (required if encrypt_key is True)")


@router.post("/generate-key-pair", response_model=VyOSResponse)
async def generate_key_pair(http_request: Request, request: GenerateKeyPairRequest):
    """Generate a key pair and install it on the device."""
    await require_write_permission(http_request, FeatureGroup.PKI)
    try:
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import rsa, ec

        if request.encrypt_key and not request.passphrase:
            raise HTTPException(status_code=400, detail="Passphrase required when encrypt_key is True")
        if request.key_type == "rsa" and request.key_size not in (2048, 3072, 4096):
            raise HTTPException(status_code=400, detail="RSA key size must be 2048, 3072, or 4096")
        if request.key_type == "ec" and request.key_size not in (256, 384, 521):
            raise HTTPException(status_code=400, detail="EC key size must be 256, 384, or 521")

        # Generate private key
        if request.key_type == "rsa":
            private_key = rsa.generate_private_key(public_exponent=65537, key_size=request.key_size)
        else:
            curve_map = {256: ec.SECP256R1(), 384: ec.SECP384R1(), 521: ec.SECP521R1()}
            private_key = ec.generate_private_key(curve_map[request.key_size])

        # Serialize private key
        if request.encrypt_key:
            priv_pem = _normalize_pem(private_key.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.PKCS8,
                serialization.BestAvailableEncryption(request.passphrase.encode()),
            ).decode("utf-8"))
        else:
            priv_pem = _normalize_pem(private_key.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.PKCS8,
                serialization.NoEncryption(),
            ).decode("utf-8"))

        # Serialize public key
        pub_pem = _normalize_pem(private_key.public_key().public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode("utf-8"))

        # Install on device
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = PKIBatchBuilder(version=version)

        builder.create_key_pair(request.name)
        builder.set_key_pair_private_key(request.name, priv_pem)
        builder.set_key_pair_public_key(request.name, pub_pem)
        if request.encrypt_key:
            builder.set_key_pair_private_password_protected(request.name)

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": f"Key pair '{request.name}' generated and installed"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error generating key pair")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 6: Generate DH Parameters
# ========================================================================

class GenerateDHRequest(BaseModel):
    """Request to generate Diffie-Hellman parameters."""
    name: str = Field(..., description="DH parameters name")
    key_size: int = Field(2048, description="Key size in bits (2048, 3072, or 4096)")


@router.post("/generate-dh", response_model=VyOSResponse)
async def generate_dh(http_request: Request, request: GenerateDHRequest):
    """
    Generate DH parameters and install them on the device.

    Note: DH parameter generation is computationally expensive and may take
    30 seconds or more depending on key size.
    """
    await require_write_permission(http_request, FeatureGroup.PKI)
    try:
        from cryptography.hazmat.primitives.asymmetric import dh
        from cryptography.hazmat.primitives import serialization

        if request.key_size not in (2048, 3072, 4096):
            raise HTTPException(status_code=400, detail="DH key size must be 2048, 3072, or 4096")

        # Generate DH parameters (this is CPU-intensive)
        parameters = dh.generate_parameters(generator=2, key_size=request.key_size)

        # Serialize to PEM and normalize
        params_pem = _normalize_pem(parameters.parameter_bytes(
            serialization.Encoding.PEM,
            serialization.ParameterFormat.PKCS3,
        ).decode("utf-8"))

        # Install on device
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = PKIBatchBuilder(version=version)

        builder.create_dh(request.name)
        builder.set_dh_parameters(request.name, params_pem)

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": f"DH parameters '{request.name}' generated and installed"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error generating DH parameters")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 7: Generate Certificate (signed by a CA)
# ========================================================================

class GenerateCertificateRequest(BaseModel):
    """Request to generate a certificate signed by an existing CA."""
    name: str = Field(..., description="Certificate name")
    ca_name: str = Field(..., description="Name of the CA to sign with")
    key_type: Literal["rsa", "ec"] = Field("rsa", description="Key type: rsa or ec")
    key_size: int = Field(2048, description="Key size (RSA: 2048/3072/4096, EC: 256/384/521)")
    country: Optional[str] = Field(None, description="Country code (2 letters)")
    state: Optional[str] = Field(None, description="State or province")
    locality: Optional[str] = Field(None, description="Locality or city")
    organization: Optional[str] = Field(None, description="Organization name")
    common_name: str = Field(..., description="Common Name (CN)")
    days: int = Field(365, description="Validity period in days")
    subject_alt_names: Optional[List[str]] = Field(None, description="Subject Alternative Names (DNS names or IPs)")
    encrypt_key: bool = Field(False, description="Encrypt the private key with a passphrase")
    passphrase: Optional[str] = Field(None, description="Passphrase for key encryption")


@router.post("/generate-certificate", response_model=VyOSResponse)
async def generate_certificate(http_request: Request, request: GenerateCertificateRequest):
    """
    Generate a certificate signed by an existing CA on the device.

    Reads the CA's certificate and private key from VyOS config,
    generates a new key pair, builds a certificate, signs it with the CA,
    and installs everything on the device.
    """
    await require_write_permission(http_request, FeatureGroup.PKI)
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa, ec
        import ipaddress

        # Validate key params
        if request.encrypt_key and not request.passphrase:
            raise HTTPException(status_code=400, detail="Passphrase required when encrypt_key is True")
        if request.key_type == "rsa" and request.key_size not in (2048, 3072, 4096):
            raise HTTPException(status_code=400, detail="RSA key size must be 2048, 3072, or 4096")
        if request.key_type == "ec" and request.key_size not in (256, 384, 521):
            raise HTTPException(status_code=400, detail="EC key size must be 256, 384, or 521")

        # Get VyOS config to read CA cert and private key
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        full_config = service.get_full_config(refresh=False)

        mapper = PKIMapper(version)
        config = mapper.parse_config(full_config)

        ca_data = config.get("ca", {}).get(request.ca_name)
        if not ca_data:
            raise HTTPException(status_code=404, detail=f"CA '{request.ca_name}' not found")

        ca_cert_raw = ca_data.get("certificate")
        ca_key_raw = ca_data.get("private_key")
        if not ca_cert_raw:
            raise HTTPException(status_code=400, detail=f"CA '{request.ca_name}' has no certificate")
        if not ca_key_raw:
            raise HTTPException(status_code=400, detail=f"CA '{request.ca_name}' has no private key")
        if ca_data.get("password_protected"):
            raise HTTPException(
                status_code=400,
                detail=f"CA '{request.ca_name}' has an encrypted private key. "
                       "Cannot use password-protected CAs for signing.",
            )

        # VyOS stores certs/keys as single-line base64 without PEM headers.
        # Reconstruct valid PEM for the cryptography library.
        def _reconstruct_pem(raw: str, label: str) -> bytes:
            # Insert newlines every 64 chars for valid PEM
            import textwrap
            b64 = raw.strip()
            wrapped = "\n".join(textwrap.wrap(b64, 64))
            return f"-----BEGIN {label}-----\n{wrapped}\n-----END {label}-----\n".encode()

        ca_cert = x509.load_pem_x509_certificate(_reconstruct_pem(ca_cert_raw, "CERTIFICATE"))
        ca_private_key = serialization.load_pem_private_key(
            _reconstruct_pem(ca_key_raw, "PRIVATE KEY"),
            password=None,
        )

        # Generate the certificate's private key
        if request.key_type == "rsa":
            cert_private_key = rsa.generate_private_key(
                public_exponent=65537, key_size=request.key_size,
            )
        else:
            curve_map = {256: ec.SECP256R1(), 384: ec.SECP384R1(), 521: ec.SECP521R1()}
            cert_private_key = ec.generate_private_key(curve_map[request.key_size])

        # Build subject
        name_attrs = []
        if request.country:
            name_attrs.append(x509.NameAttribute(NameOID.COUNTRY_NAME, request.country[:2]))
        if request.state:
            name_attrs.append(x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, request.state))
        if request.locality:
            name_attrs.append(x509.NameAttribute(NameOID.LOCALITY_NAME, request.locality))
        if request.organization:
            name_attrs.append(x509.NameAttribute(NameOID.ORGANIZATION_NAME, request.organization))
        name_attrs.append(x509.NameAttribute(NameOID.COMMON_NAME, request.common_name))
        subject = x509.Name(name_attrs)

        # Build certificate
        now = datetime.datetime.now(datetime.timezone.utc)
        builder = (
            x509.CertificateBuilder()
            .subject_name(subject)
            .issuer_name(ca_cert.subject)
            .public_key(cert_private_key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(now)
            .not_valid_after(now + datetime.timedelta(days=request.days))
            .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
            .add_extension(
                x509.KeyUsage(
                    digital_signature=True, key_encipherment=True,
                    content_commitment=False, data_encipherment=False,
                    key_cert_sign=False, crl_sign=False,
                    key_agreement=False, encipher_only=False, decipher_only=False,
                ),
                critical=True,
            )
            .add_extension(
                x509.AuthorityKeyIdentifier.from_issuer_public_key(ca_private_key.public_key()),
                critical=False,
            )
            .add_extension(
                x509.SubjectKeyIdentifier.from_public_key(cert_private_key.public_key()),
                critical=False,
            )
        )

        # Add Subject Alternative Names if provided
        if request.subject_alt_names:
            san_entries: list = []
            for san in request.subject_alt_names:
                san = san.strip()
                if not san:
                    continue
                # Try to parse as IP address first
                try:
                    ip = ipaddress.ip_address(san)
                    san_entries.append(x509.IPAddress(ip))
                except ValueError:
                    san_entries.append(x509.DNSName(san))

            if san_entries:
                builder = builder.add_extension(
                    x509.SubjectAlternativeName(san_entries),
                    critical=False,
                )

        # Sign with CA key
        cert = builder.sign(ca_private_key, hashes.SHA256())

        # Serialize
        cert_pem = _normalize_pem(
            cert.public_bytes(serialization.Encoding.PEM).decode("utf-8")
        )

        if request.encrypt_key:
            key_pem = _normalize_pem(cert_private_key.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.PKCS8,
                serialization.BestAvailableEncryption(request.passphrase.encode()),
            ).decode("utf-8"))
        else:
            key_pem = _normalize_pem(cert_private_key.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.PKCS8,
                serialization.NoEncryption(),
            ).decode("utf-8"))

        # Install on device via batch operations
        batch_builder = PKIBatchBuilder(version=version)

        batch_builder.create_certificate(request.name)
        batch_builder.set_certificate_cert(request.name, cert_pem)
        batch_builder.set_certificate_private_key(request.name, key_pem)
        if request.encrypt_key:
            batch_builder.set_certificate_private_password_protected(request.name)

        response = service.execute_batch(batch_builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": f"Certificate '{request.name}' generated and signed by CA '{request.ca_name}'"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error generating certificate")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 8: Generate OpenVPN Shared Secret
# ========================================================================

class GenerateOpenVPNSecretRequest(BaseModel):
    """Request to generate an OpenVPN shared secret."""
    name: str = Field(..., description="Shared secret name")


@router.post("/generate-openvpn-shared-secret", response_model=VyOSResponse)
async def generate_openvpn_shared_secret(http_request: Request, request: GenerateOpenVPNSecretRequest):
    """
    Generate an OpenVPN shared secret using VyOS's built-in generate command.

    Uses: generate pki openvpn shared-secret install <name>
    This generates the secret and commits it to the config automatically.
    """
    await require_write_permission(http_request, FeatureGroup.PKI)
    try:
        service = get_session_vyos_service(http_request)

        response = service.device.generate(
            path=["pki", "openvpn", "shared-secret", "install", request.name]
        )

        if response.status != 200:
            return VyOSResponse(
                success=False,
                error=response.error or "Failed to generate OpenVPN shared secret",
            )

        return VyOSResponse(
            success=True,
            data={"message": f"OpenVPN shared secret '{request.name}' generated and installed"},
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error generating OpenVPN shared secret")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 9: Generate OpenSSH Key
# ========================================================================

class GenerateOpenSSHRequest(BaseModel):
    """Request to generate an OpenSSH key pair."""
    name: str = Field(..., description="OpenSSH key name")
    key_size: int = Field(2048, description="RSA key size in bits (2048/3072/4096)")


@router.post("/generate-openssh", response_model=VyOSResponse)
async def generate_openssh(http_request: Request, request: GenerateOpenSSHRequest):
    """
    Generate an OpenSSH RSA key pair and install it on the device.

    Generates an RSA key, serialises the private key in both OpenSSH and PKCS8
    formats, then attempts to install using the OpenSSH format first (matching
    VyOS's own generate command) and falls back to PKCS8 if that fails.
    """
    await require_write_permission(http_request, FeatureGroup.PKI)
    try:
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import rsa

        if request.key_size not in (2048, 3072, 4096):
            raise HTTPException(status_code=400, detail="RSA key size must be 2048, 3072, or 4096")

        # Generate RSA key (VyOS openssh only supports ssh-rsa)
        private_key = rsa.generate_private_key(
            public_exponent=65537, key_size=request.key_size,
        )

        # Prepare both private key formats to try
        priv_openssh = _normalize_pem(private_key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.OpenSSH,
            serialization.NoEncryption(),
        ).decode("utf-8"))

        priv_pkcs8 = _normalize_pem(private_key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        ).decode("utf-8"))

        # Serialize public key in OpenSSH format and extract just the base64 part
        pub_ssh = private_key.public_key().public_bytes(
            serialization.Encoding.OpenSSH,
            serialization.PublicFormat.OpenSSH,
        ).decode("utf-8")
        pub_parts = pub_ssh.split(" ", 2)
        pub_key_data = pub_parts[1] if len(pub_parts) >= 2 else pub_ssh

        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Try OpenSSH format first (matches VyOS's own generate output)
        for fmt_name, priv_pem in [("OpenSSH", priv_openssh), ("PKCS8", priv_pkcs8)]:
            builder = PKIBatchBuilder(version=version)
            builder.create_openssh(request.name)
            builder.set_openssh_public_type(request.name, "ssh-rsa")
            builder.set_openssh_public_key(request.name, pub_key_data)
            builder.set_openssh_private_key(request.name, priv_pem)

            logger.info("OpenSSH generate attempt (%s): ops=%s", fmt_name, builder.get_operations())
            response = service.execute_batch(builder)
            logger.info("OpenSSH generate (%s): status=%s error=%s", fmt_name, response.status, response.error)

            if response.status == 200:
                return VyOSResponse(
                    success=True,
                    data={"message": f"OpenSSH key '{request.name}' generated and installed (format: {fmt_name})"},
                )

            # If first format failed, delete the partial node before retrying
            if fmt_name == "OpenSSH":
                logger.info("OpenSSH format failed, cleaning up and trying PKCS8")
                cleanup = PKIBatchBuilder(version=version)
                cleanup.delete_openssh(request.name)
                service.execute_batch(cleanup)

        # Both formats failed
        return VyOSResponse(
            success=False,
            error=response.error or "Failed to install OpenSSH key — both OpenSSH and PKCS8 formats were rejected by VyOS",
        )

        return VyOSResponse(
            success=response.status == 200,
            data={"message": f"OpenSSH key '{request.name}' generated and installed"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error generating OpenSSH key")
        raise HTTPException(status_code=500, detail="Internal server error")
