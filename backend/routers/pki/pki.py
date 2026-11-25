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
The mapper owns the config shape: GET /config returns its parse unchanged.
"""

import datetime
import inspect
import ipaddress
import logging
import re
import textwrap
from typing import Any, Dict, List, Literal, Optional, cast

from cryptography import x509
from cryptography.exceptions import UnsupportedAlgorithm
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import dh, ec, rsa
from cryptography.x509.oid import NameOID
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from starlette.concurrency import run_in_threadpool

from batch_dispatch import call_comma_batch_op, call_item_batch_op, resolve_batch_method
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from session_vyos_service import get_session_vyos_service
from vyos_builders.pki import PKIBatchBuilder
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.pki.pki import PKIMapper

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/pki", tags=["pki"])

# Armor labels each PEM op accepts: the wrappers vyos/pki.py uses on 1.4 and
# 1.5. Stored private keys are PKCS8 bodies on both versions.
_PRIVATE_KEY_LABELS = ("PRIVATE KEY", "ENCRYPTED PRIVATE KEY")
_PEM_OP_LABELS: Dict[str, tuple[str, ...]] = {
    "set_ca_certificate": ("CERTIFICATE",),
    "set_certificate_cert": ("CERTIFICATE",),
    "set_ca_crl": ("X509 CRL",),
    "set_ca_private_key": _PRIVATE_KEY_LABELS,
    "set_certificate_private_key": _PRIVATE_KEY_LABELS,
    "set_key_pair_private_key": _PRIVATE_KEY_LABELS,
    "set_dh_parameters": ("DH PARAMETERS",),
    "set_key_pair_public_key": ("PUBLIC KEY",),
    "set_openssh_private_key": ("OPENSSH PRIVATE KEY",),
}
# Unencrypted PKCS1 / SEC1 keys are converted to unencrypted PKCS8.
_CONVERTIBLE_KEY_LABELS = ("RSA PRIVATE KEY", "EC PRIVATE KEY")

# One armor line; the label is anything up to the closing dashes.
_ARMOR_LINE = re.compile(r"-----(?P<kind>BEGIN|END) (?P<label>[^\n]*?)-----")

# Lab tag syntax for every `pki <kind> <name>` node (same on 1.4 and 1.5).
NAME_PATTERN = re.compile(r"[-_a-zA-Z0-9][\w\-\.\+]*", re.ASCII)

_OPENVPN_BLOCK = re.compile(
    r"-----BEGIN OpenVPN Static key V(?P<version>\d+)-----(?P<body>.*?)-----END OpenVPN Static key V(?P=version)-----",
    re.DOTALL,
)

_RSA_SIZES = (2048, 3072, 4096)
_EC_CURVES = {256: ec.SECP256R1, 384: ec.SECP384R1, 521: ec.SECP521R1}
_COUNTRY = re.compile(r"[A-Za-z]{2}")
MAX_DAYS = 36500
MAX_COMMON_NAME = 64


def _block_body(body: str) -> str:
    """An armored block's body as VyOS stores it: ``#`` lines and whitespace removed."""
    lines = (line for line in body.splitlines() if not line.lstrip().startswith("#"))
    return "".join("".join(lines).split())


def _armor_blocks(value: str) -> List[tuple[str, str]]:
    """Every ``(label, body)`` block in *value*, in order.

    Text outside the blocks (openssl ``Bag Attributes`` / ``subject=`` headers,
    ``#`` comments) is ignored. A BEGIN with no END, an END with no BEGIN, a
    BEGIN inside a block, or an END whose label differs is a ValueError.
    """
    blocks: List[tuple[str, str]] = []
    open_label: Optional[str] = None
    body_start = 0
    for match in _ARMOR_LINE.finditer(value):
        kind, label = match.group("kind"), match.group("label")
        if kind == "BEGIN":
            if open_label is not None:
                raise ValueError(f"PEM block '{open_label}' has no matching END line")
            open_label, body_start = label, match.end()
            continue
        if open_label is None:
            raise ValueError(f"PEM END line '{label}' has no matching BEGIN line")
        if label != open_label:
            raise ValueError(f"PEM block BEGIN '{open_label}' ends with a different label '{label}'")
        blocks.append((open_label, value[body_start:match.start()]))
        open_label = None
    if open_label is not None:
        raise ValueError(f"PEM block '{open_label}' has no matching END line")
    return blocks


def _bare_value(value: str) -> str:
    """A value with no armor: one token of base64 (or hex), trimmed."""
    bare = value.strip()
    if any(ch.isspace() for ch in bare):
        raise ValueError("A value without PEM armor must be a single line of base64 with no spaces")
    return bare


def _pkcs8_body(label: str, body: str) -> str:
    """An unencrypted PKCS1 / SEC1 key converted to an unencrypted PKCS8 body."""
    # `#` comment lines are dropped, as _block_body does for the stored value.
    lines = [line.strip() for line in body.splitlines() if not line.lstrip().startswith("#")]
    text = "\n".join(line for line in lines if line)
    pem = f"-----BEGIN {label}-----\n{text}\n-----END {label}-----\n".encode()
    try:
        key = serialization.load_pem_private_key(pem, password=None)
    except (ValueError, TypeError, UnsupportedAlgorithm):
        raise ValueError(f"The {label} block cannot be read")
    return _pem_body(key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption(),
    ).decode("utf-8"))


def _normalize_pem(op: str, value: str) -> str:
    """Single-line leaf value for a labelled PEM op, else ValueError (HTTP 400).

    The first block whose label the op accepts is used and the rest of the
    value is dropped. A legacy encrypted PEM (``Proc-Type: 4,ENCRYPTED``) is
    rejected; an unencrypted PKCS1 / SEC1 private key becomes PKCS8. A value
    with no armor must be one token of base64.
    """
    labels = _PEM_OP_LABELS[op]
    blocks = _armor_blocks(value)
    if not blocks:
        return _bare_value(value)
    convertible = _CONVERTIBLE_KEY_LABELS if labels == _PRIVATE_KEY_LABELS else ()
    for label, body in blocks:
        if label not in labels and label not in convertible:
            continue
        if "Proc-Type:" in body:
            raise ValueError(
                f"The {label} block uses legacy PEM encryption; convert it to PKCS8 "
                "(openssl pkcs8 -topk8) and import that"
            )
        stored = _pkcs8_body(label, body) if label in convertible else _block_body(body)
        if not stored:
            raise ValueError(f"The {label} block is empty")
        return stored
    expected = " or ".join(f"-----BEGIN {label}-----" for label in labels)
    raise ValueError(f"Expected a {expected} block")


def _pem_body(pem: str) -> str:
    """Body of the one block in PEM text this router generated itself."""
    ((_label, body),) = _armor_blocks(pem)
    return _block_body(body)


def _openssh_public_key_data(value: str) -> str:
    """VyOS stores only the base64 part of ``ssh-rsa <b64> [comment]``."""
    parts = value.split()
    if len(parts) >= 2 and parts[0].startswith("ssh-"):
        return parts[1]
    return _bare_value(value)


def _check_name(value: str) -> str:
    if not value.strip():
        raise ValueError("name must not be blank")
    if not NAME_PATTERN.fullmatch(value):
        raise ValueError(
            "name must start with a letter, digit, '-' or '_' and contain only "
            "letters, digits, '_', '-', '.' or '+'"
        )
    return value


def _mapper(version: str) -> PKIMapper:
    return cast(PKIMapper, CommandMapperRegistry.get_mapper("pki", version))


def _reject_existing(mapper: PKIMapper, full_config: Any, kind: str, name: str) -> None:
    """409 when ``pki <kind> <name>`` is already configured."""
    if mapper.raw_item(full_config, kind, name) is not None:
        raise HTTPException(status_code=409, detail=f"'{name}' already exists")


def _check_key(key_type: str, key_size: int, encrypt_key: bool, passphrase: Optional[str]) -> None:
    if encrypt_key and not passphrase:
        raise HTTPException(status_code=400, detail="Passphrase required when encrypt_key is True")
    if key_type == "rsa" and key_size not in _RSA_SIZES:
        raise HTTPException(status_code=400, detail="RSA key size must be 2048, 3072, or 4096")
    if key_type == "ec" and key_size not in _EC_CURVES:
        raise HTTPException(status_code=400, detail="EC key size must be 256, 384, or 521")


def _check_subject(country: Optional[str], common_name: str, days: int) -> None:
    if not 1 <= days <= MAX_DAYS:
        raise HTTPException(status_code=400, detail=f"days must be between 1 and {MAX_DAYS}")
    if country and not _COUNTRY.fullmatch(country):
        raise HTTPException(status_code=400, detail="country must be a 2-letter code")
    if not common_name.strip() or len(common_name) > MAX_COMMON_NAME:
        raise HTTPException(status_code=400, detail=f"common_name must be 1 to {MAX_COMMON_NAME} characters")


# A DNS SAN: optional leading "*.", labels of 1-63 [A-Za-z0-9-] chars that do
# not start or end with "-", 253 chars at most, and a last label that is not
# all digits.
_DNS_LABEL = r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
_DNS_NAME = re.compile(rf"(?:\*\.)?{_DNS_LABEL}(?:\.{_DNS_LABEL})*")
MAX_DNS_NAME = 253


def _san_entries(names: List[str]) -> List[x509.GeneralName]:
    """Each SAN as an IP or a DNS hostname, else 400 naming the entry."""
    entries: List[x509.GeneralName] = []
    for raw in names:
        san = raw.strip()
        if not san:
            continue
        try:
            entries.append(x509.IPAddress(ipaddress.ip_address(san)))
            continue
        except ValueError:
            pass  # Not an IP address: it must be a DNS hostname below.
        # An all-digit last label is a mistyped IP address, not a hostname.
        if len(san) > MAX_DNS_NAME or not _DNS_NAME.fullmatch(san) or san.rsplit(".", 1)[-1].isdigit():
            raise HTTPException(
                status_code=400,
                detail=f"Subject alternative name '{san}' is not an IP address or a DNS hostname",
            )
        entries.append(x509.DNSName(san))
    return entries


def _subject(request: Any) -> x509.Name:
    attrs = []
    if request.country:
        attrs.append(x509.NameAttribute(NameOID.COUNTRY_NAME, request.country.upper()))
    if request.state:
        attrs.append(x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, request.state))
    if request.locality:
        attrs.append(x509.NameAttribute(NameOID.LOCALITY_NAME, request.locality))
    if request.organization:
        attrs.append(x509.NameAttribute(NameOID.ORGANIZATION_NAME, request.organization))
    attrs.append(x509.NameAttribute(NameOID.COMMON_NAME, request.common_name))
    return x509.Name(attrs)


def _private_pem(private_key: Any, encrypt_key: bool, passphrase: Optional[str],
                 fmt: serialization.PrivateFormat = serialization.PrivateFormat.PKCS8) -> str:
    encryption: serialization.KeySerializationEncryption = (
        serialization.BestAvailableEncryption((passphrase or "").encode())
        if encrypt_key else serialization.NoEncryption()
    )
    return _pem_body(private_key.private_bytes(serialization.Encoding.PEM, fmt, encryption).decode("utf-8"))


def _parse_openvpn_key(output: Any) -> Optional[tuple[str, str]]:
    """(key, version) of the first ``OpenVPN Static key V<n>`` block.

    The key is as the key leaf stores it; the version is the header's ``<n>``,
    which VyOS's own install writes to the version leaf.
    """
    if not isinstance(output, str):
        return None
    match = _OPENVPN_BLOCK.search(output)
    if match is None:
        return None
    key = _block_body(match.group("body"))
    return (key, match.group("version")) if key else None


def _import_value(op: str, value: str) -> str:
    """A /batch value as the leaf stores it; ValueError (HTTP 400) for one VyOS cannot hold."""
    if op == "set_openvpn_shared_secret_key":
        value = _openvpn_key_value(value)
    elif op == "set_openssh_public_key":
        value = _openssh_public_key_data(value)
    elif op in _PEM_OP_LABELS:
        value = _normalize_pem(op, value)
    if "\n" in value or "\r" in value:
        raise ValueError(f"Operation {op} value must be a single line")
    return value


def _openvpn_key_value(value: str) -> str:
    """Key leaf value for an imported shared secret: the same block parse as generate.

    A value with no armor is the bare key; armor that is not an OpenVPN
    static key block is a ValueError (HTTP 400).
    """
    blocks = _armor_blocks(value)
    if not blocks:
        return _bare_value(value)
    parsed = _parse_openvpn_key(value)
    if parsed is None:
        raise ValueError("Not an OpenVPN static key block")
    return parsed[0]


# ========================================================================
# Pydantic Models
# ========================================================================

class PKIBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name (e.g., create_ca, set_ca_certificate)")
    value: Optional[str] = Field(None, description="Operation value")


class PKIBatchRequest(BaseModel):
    """Batch request for PKI configuration changes."""
    item_name: Optional[str] = Field(
        None,
        description="Object name (CA, certificate, ...) for item ops; omitted for the global ops "
                    "(x509 defaults, delete_pki)",
    )
    operations: List[PKIBatchOperation]

    @field_validator("item_name")
    @classmethod
    def _item_name_valid(cls, value: Optional[str]) -> Optional[str]:
        return None if value is None else _check_name(value)


class _NamedRequest(BaseModel):
    """A generate request: the new object's name must be a valid lab tag."""
    name: str = Field(..., description="Name of the new object")

    @field_validator("name")
    @classmethod
    def _name_valid(cls, value: str) -> str:
        return _check_name(value)


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


def _commit_response(response: Any, message: str) -> VyOSResponse:
    """A commit is done only with status 200 and no error text."""
    ok = response.status == 200 and not response.error
    return VyOSResponse(
        success=ok,
        data={"message": message} if ok else None,
        error=None if ok else (response.error or "Commit failed"),
    )


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
        builder = PKIBatchBuilder(version=service.get_version())
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

    Returns every CA, certificate (with ACME info), DH parameter set, key
    pair, OpenSSH key and OpenVPN shared secret as lists with secrets masked,
    the x509 defaults, and per-collection totals.
    """
    await require_read_permission(request, FeatureGroup.PKI)
    try:
        service = get_session_vyos_service(request)
        mapper = _mapper(service.get_version())
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        return mapper.parse_config(full_config)
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
    field: str = Field(..., description="Field to reveal: private_key, parameters or key (the fields GET /config masks)")


@router.post("/reveal")
async def reveal_pki_value(http_request: Request, request: PKIRevealRequest):
    """
    Reveal an unmasked PKI value for viewing/copying.

    Requires WRITE permission since this exposes sensitive material.
    """
    await require_write_permission(http_request, FeatureGroup.PKI)
    try:
        service = get_session_vyos_service(http_request)
        mapper = _mapper(service.get_version())

        fields = mapper.reveal_kinds().get(request.item_type)
        if fields is None:
            raise HTTPException(status_code=400, detail=f"Invalid item type: {request.item_type}")
        if request.field not in fields:
            raise HTTPException(status_code=400, detail=f"Invalid field '{request.field}' for type '{request.item_type}'")

        full_config = await run_in_threadpool(service.get_full_config, refresh=False)
        item = mapper.raw_item(full_config, request.item_type, request.item_name)
        if item is None:
            raise HTTPException(status_code=404, detail=f"Item '{request.item_name}' not found")

        return {"value": item.get(request.field)}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error revealing PKI value")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Endpoint 3: Batch Operations
# ========================================================================

def _call_batch_op(builder: PKIBatchBuilder, op: str, item_name: Optional[str], value: Optional[str]) -> None:
    """Run one op: an op whose first parameter is ``name`` binds item_name; a global op takes none."""
    method = resolve_batch_method(builder, op)
    params = list(inspect.signature(method).parameters)
    if params and params[0] == "name":
        if item_name is None:
            raise HTTPException(status_code=400, detail=f"Operation {op} requires item_name")
        call_item_batch_op(builder, op, item_name, value)
        return
    if item_name is not None:
        raise HTTPException(status_code=400, detail=f"Operation {op} takes no item_name")
    if params and value is not None and not value.strip():
        raise HTTPException(status_code=400, detail=f"Operation {op} requires a value")
    call_comma_batch_op(builder, op, value)


@router.post("/batch", response_model=VyOSResponse)
async def pki_batch_configure(http_request: Request, request: PKIBatchRequest):
    """
    Execute a batch of PKI configuration operations in a single commit.

    An op whose first builder parameter is ``name`` (every CA, certificate,
    DH, key-pair, OpenSSH and OpenVPN op) is called with item_name and the
    op's value. The global ops (x509 defaults, delete_x509_defaults,
    delete_pki) are called with the value alone, and the request must not
    send an item_name for them. A full ``ssh-rsa <b64> [comment]`` line for
    set_openssh_public_key is stored as its base64 part.
    """
    await require_write_permission(http_request, FeatureGroup.PKI)
    try:
        service = get_session_vyos_service(http_request)
        builder = PKIBatchBuilder(version=service.get_version())

        try:
            for operation in request.operations:
                value = operation.value
                if value is not None:
                    value = _import_value(operation.op, value)
                _call_batch_op(builder, operation.op, request.item_name, value)
        except ValueError as exc:
            # _import_value raises ValueError for a value the leaf cannot hold
            # (armor, labels, PKCS8, whitespace, newlines); the builder raises it
            # for a value this VyOS version rejects.
            raise HTTPException(status_code=400, detail=str(exc))

        if builder.is_empty():
            return VyOSResponse(
                success=True,
                data={"message": "No operations to execute"},
            )

        response = await run_in_threadpool(service.execute_batch, builder)
        return _commit_response(response, "PKI configuration updated")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================================================
# Generate routes
#
# Each resolves the session first, validates, reads the config once
# (refresh=True) to return 409 for an existing name, and runs key generation
# and VyOS I/O through run_in_threadpool.
# ========================================================================

class GenerateCARequest(_NamedRequest):
    """Request to generate a self-signed Certificate Authority."""
    key_type: Literal["rsa", "ec"] = Field("rsa", description="Key type: rsa or ec")
    key_size: int = Field(2048, description="Key size in bits (RSA: 2048/3072/4096, EC: 256/384/521)")
    country: Optional[str] = Field(None, description="Country code (2 letters)")
    state: Optional[str] = Field(None, description="State or province")
    locality: Optional[str] = Field(None, description="Locality or city")
    organization: Optional[str] = Field(None, description="Organization name")
    common_name: str = Field(..., description="Common Name (CN), 1 to 64 characters")
    days: int = Field(3650, description="Validity period in days (1 to 36500)")
    encrypt_key: bool = Field(False, description="Encrypt the private key with a passphrase")
    passphrase: Optional[str] = Field(None, description="Passphrase for key encryption (required if encrypt_key is True)")
    revoke: bool = Field(False, description="Mark as revoked")
    system_install: bool = Field(False, description="Install to system trust store")


@router.post("/generate-ca", response_model=VyOSResponse)
async def generate_ca(http_request: Request, request: GenerateCARequest):
    """Generate a self-signed CA certificate and key, and commit them as ``pki ca <name>``."""
    await require_write_permission(http_request, FeatureGroup.PKI)
    try:
        service = get_session_vyos_service(http_request)
        _check_key(request.key_type, request.key_size, request.encrypt_key, request.passphrase)
        _check_subject(request.country, request.common_name, request.days)

        version = service.get_version()
        full_config = await run_in_threadpool(service.get_full_config, refresh=True)
        _reject_existing(_mapper(version), full_config, "ca", request.name)

        if request.key_type == "rsa":
            private_key = await run_in_threadpool(
                rsa.generate_private_key, public_exponent=65537, key_size=request.key_size,
            )
        else:
            private_key = await run_in_threadpool(ec.generate_private_key, _EC_CURVES[request.key_size]())

        subject = issuer = _subject(request)
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

        cert_pem = _pem_body(cert.public_bytes(serialization.Encoding.PEM).decode("utf-8"))
        key_pem = _private_pem(private_key, request.encrypt_key, request.passphrase)

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

        response = await run_in_threadpool(service.execute_batch, builder)
        return _commit_response(response, f"CA '{request.name}' generated and installed")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error generating CA")
        raise HTTPException(status_code=500, detail="Internal server error")


class GenerateKeyPairRequest(_NamedRequest):
    """Request to generate a public/private key pair."""
    key_type: Literal["rsa", "ec"] = Field("rsa", description="Key type: rsa or ec")
    key_size: int = Field(2048, description="Key size (RSA: 2048/3072/4096, EC: 256/384/521)")
    encrypt_key: bool = Field(False, description="Encrypt the private key")
    passphrase: Optional[str] = Field(None, description="Passphrase (required if encrypt_key is True)")


@router.post("/generate-key-pair", response_model=VyOSResponse)
async def generate_key_pair(http_request: Request, request: GenerateKeyPairRequest):
    """Generate a key pair and commit it as ``pki key-pair <name>``."""
    await require_write_permission(http_request, FeatureGroup.PKI)
    try:
        service = get_session_vyos_service(http_request)
        _check_key(request.key_type, request.key_size, request.encrypt_key, request.passphrase)

        version = service.get_version()
        full_config = await run_in_threadpool(service.get_full_config, refresh=True)
        _reject_existing(_mapper(version), full_config, "key_pair", request.name)

        if request.key_type == "rsa":
            private_key = await run_in_threadpool(
                rsa.generate_private_key, public_exponent=65537, key_size=request.key_size,
            )
        else:
            private_key = await run_in_threadpool(ec.generate_private_key, _EC_CURVES[request.key_size]())

        priv_pem = _private_pem(private_key, request.encrypt_key, request.passphrase)
        pub_pem = _pem_body(private_key.public_key().public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode("utf-8"))

        builder = PKIBatchBuilder(version=version)
        builder.create_key_pair(request.name)
        builder.set_key_pair_private_key(request.name, priv_pem)
        builder.set_key_pair_public_key(request.name, pub_pem)
        if request.encrypt_key:
            builder.set_key_pair_private_password_protected(request.name)

        response = await run_in_threadpool(service.execute_batch, builder)
        return _commit_response(response, f"Key pair '{request.name}' generated and installed")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error generating key pair")
        raise HTTPException(status_code=500, detail="Internal server error")


class GenerateDHRequest(_NamedRequest):
    """Request to generate Diffie-Hellman parameters."""
    key_size: int = Field(2048, description="Key size in bits (2048, 3072, or 4096)")


@router.post("/generate-dh", response_model=VyOSResponse)
async def generate_dh(http_request: Request, request: GenerateDHRequest):
    """
    Generate DH parameters and commit them as ``pki dh <name>``.

    DH parameter generation takes 30 seconds or more depending on key size.
    """
    await require_write_permission(http_request, FeatureGroup.PKI)
    try:
        service = get_session_vyos_service(http_request)
        if request.key_size not in _RSA_SIZES:
            raise HTTPException(status_code=400, detail="DH key size must be 2048, 3072, or 4096")

        version = service.get_version()
        full_config = await run_in_threadpool(service.get_full_config, refresh=True)
        _reject_existing(_mapper(version), full_config, "dh", request.name)

        parameters = await run_in_threadpool(dh.generate_parameters, generator=2, key_size=request.key_size)
        params_pem = _pem_body(parameters.parameter_bytes(
            serialization.Encoding.PEM,
            serialization.ParameterFormat.PKCS3,
        ).decode("utf-8"))

        builder = PKIBatchBuilder(version=version)
        builder.create_dh(request.name)
        builder.set_dh_parameters(request.name, params_pem)

        response = await run_in_threadpool(service.execute_batch, builder)
        return _commit_response(response, f"DH parameters '{request.name}' generated and installed")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error generating DH parameters")
        raise HTTPException(status_code=500, detail="Internal server error")


class GenerateCertificateRequest(_NamedRequest):
    """Request to generate a certificate signed by an existing CA."""
    ca_name: str = Field(..., description="Name of the CA to sign with")
    key_type: Literal["rsa", "ec"] = Field("rsa", description="Key type: rsa or ec")
    key_size: int = Field(2048, description="Key size (RSA: 2048/3072/4096, EC: 256/384/521)")
    country: Optional[str] = Field(None, description="Country code (2 letters)")
    state: Optional[str] = Field(None, description="State or province")
    locality: Optional[str] = Field(None, description="Locality or city")
    organization: Optional[str] = Field(None, description="Organization name")
    common_name: str = Field(..., description="Common Name (CN), 1 to 64 characters")
    days: int = Field(365, description="Validity period in days (1 to 36500)")
    subject_alt_names: Optional[List[str]] = Field(None, description="Subject Alternative Names (DNS names or IPs)")
    encrypt_key: bool = Field(False, description="Encrypt the private key with a passphrase")
    passphrase: Optional[str] = Field(None, description="Passphrase for key encryption")


def _reconstruct_pem(raw: str, label: str) -> bytes:
    """VyOS stores single-line base64; cryptography needs wrapped PEM."""
    wrapped = "\n".join(textwrap.wrap(raw.strip(), 64))
    return f"-----BEGIN {label}-----\n{wrapped}\n-----END {label}-----\n".encode()


def _load_signing_ca(ca_name: str, ca_data: Dict[str, Any]) -> tuple[x509.Certificate, Any]:
    """The CA's certificate and signing key, or 400 naming the CA."""
    ca_cert_raw = ca_data.get("certificate")
    ca_key_raw = ca_data.get("private_key")
    if not ca_cert_raw:
        raise HTTPException(status_code=400, detail=f"CA '{ca_name}' has no certificate")
    if not ca_key_raw:
        raise HTTPException(status_code=400, detail=f"CA '{ca_name}' has no private key")
    if ca_data.get("password_protected"):
        raise HTTPException(
            status_code=400,
            detail=f"CA '{ca_name}' has an encrypted private key. "
                   "Cannot use password-protected CAs for signing.",
        )
    try:
        ca_cert = x509.load_pem_x509_certificate(_reconstruct_pem(ca_cert_raw, "CERTIFICATE"))
    except (ValueError, TypeError, UnsupportedAlgorithm):
        raise HTTPException(status_code=400, detail=f"CA '{ca_name}' certificate cannot be loaded")
    try:
        ca_key = serialization.load_pem_private_key(_reconstruct_pem(ca_key_raw, "PRIVATE KEY"), password=None)
    except (ValueError, TypeError, UnsupportedAlgorithm):
        raise HTTPException(status_code=400, detail=f"CA '{ca_name}' private key cannot be loaded")
    if not isinstance(ca_key, (rsa.RSAPrivateKey, ec.EllipticCurvePrivateKey)):
        raise HTTPException(status_code=400, detail=f"CA '{ca_name}' private key cannot sign certificates")
    return ca_cert, ca_key


@router.post("/generate-certificate", response_model=VyOSResponse)
async def generate_certificate(http_request: Request, request: GenerateCertificateRequest):
    """
    Generate a certificate signed by an existing CA on the device.

    Reads the CA's certificate and private key from VyOS config,
    generates a new key, builds a certificate, signs it with the CA,
    and commits it as ``pki certificate <name>``.
    """
    await require_write_permission(http_request, FeatureGroup.PKI)
    try:
        service = get_session_vyos_service(http_request)
        _check_key(request.key_type, request.key_size, request.encrypt_key, request.passphrase)
        _check_subject(request.country, request.common_name, request.days)
        san_entries = _san_entries(request.subject_alt_names or [])

        version = service.get_version()
        mapper = _mapper(version)
        full_config = await run_in_threadpool(service.get_full_config, refresh=True)
        _reject_existing(mapper, full_config, "certificate", request.name)

        # The parse masks the CA key; signing needs the raw value.
        ca_data = mapper.raw_item(full_config, "ca", request.ca_name)
        if ca_data is None:
            raise HTTPException(status_code=404, detail=f"CA '{request.ca_name}' not found")
        ca_cert, ca_private_key = _load_signing_ca(request.ca_name, ca_data)

        if request.key_type == "rsa":
            cert_private_key = await run_in_threadpool(
                rsa.generate_private_key, public_exponent=65537, key_size=request.key_size,
            )
        else:
            cert_private_key = await run_in_threadpool(ec.generate_private_key, _EC_CURVES[request.key_size]())

        now = datetime.datetime.now(datetime.timezone.utc)
        builder = (
            x509.CertificateBuilder()
            .subject_name(_subject(request))
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

        if san_entries:
            builder = builder.add_extension(x509.SubjectAlternativeName(san_entries), critical=False)

        cert = builder.sign(ca_private_key, hashes.SHA256())
        cert_pem = _pem_body(cert.public_bytes(serialization.Encoding.PEM).decode("utf-8"))
        key_pem = _private_pem(cert_private_key, request.encrypt_key, request.passphrase)

        batch_builder = PKIBatchBuilder(version=version)
        batch_builder.create_certificate(request.name)
        batch_builder.set_certificate_cert(request.name, cert_pem)
        batch_builder.set_certificate_private_key(request.name, key_pem)
        if request.encrypt_key:
            batch_builder.set_certificate_private_password_protected(request.name)

        response = await run_in_threadpool(service.execute_batch, batch_builder)
        return _commit_response(
            response, f"Certificate '{request.name}' generated and signed by CA '{request.ca_name}'",
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error generating certificate")
        raise HTTPException(status_code=500, detail="Internal server error")


class GenerateOpenVPNSecretRequest(_NamedRequest):
    """Request to generate an OpenVPN shared secret."""


@router.post("/generate-openvpn-shared-secret", response_model=VyOSResponse)
async def generate_openvpn_shared_secret(http_request: Request, request: GenerateOpenVPNSecretRequest):
    """
    Generate an OpenVPN static key and commit it as ``pki openvpn shared-secret <name>``.

    Runs ``generate pki openvpn shared-secret`` without ``install`` (that form
    never commits, and would pass the name to a router shell), reads the
    printed ``OpenVPN Static key V<n>`` block, and writes the key and version
    ``<n>`` in one batch, as VyOS's own install does.
    """
    await require_write_permission(http_request, FeatureGroup.PKI)
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        mapper = _mapper(version)
        full_config = await run_in_threadpool(service.get_full_config, refresh=True)
        _reject_existing(mapper, full_config, "openvpn", request.name)

        generated = await run_in_threadpool(
            service.device.generate, path=mapper.openvpn_shared_secret_generate_path(),
        )
        if generated.status != 200 or generated.error:
            return VyOSResponse(
                success=False,
                error=generated.error or "Failed to generate OpenVPN shared secret",
            )
        parsed = _parse_openvpn_key(generated.result)
        if parsed is None:
            return VyOSResponse(success=False, error="VyOS returned no OpenVPN static key")
        key, key_version = parsed

        builder = PKIBatchBuilder(version=version)
        builder.create_openvpn_shared_secret(request.name)
        builder.set_openvpn_shared_secret_key(request.name, key)
        builder.set_openvpn_shared_secret_version(request.name, key_version)

        response = await run_in_threadpool(service.execute_batch, builder)
        return _commit_response(response, f"OpenVPN shared secret '{request.name}' generated and installed")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error generating OpenVPN shared secret")
        raise HTTPException(status_code=500, detail="Internal server error")


class GenerateOpenSSHRequest(_NamedRequest):
    """Request to generate an OpenSSH key pair."""
    key_size: int = Field(2048, description="RSA key size in bits (2048/3072/4096)")


@router.post("/generate-openssh", response_model=VyOSResponse)
async def generate_openssh(http_request: Request, request: GenerateOpenSSHRequest):
    """
    Generate an OpenSSH RSA key pair and commit it as ``pki openssh <name>``.

    The private key is in OpenSSH format, as VyOS's own generate command
    writes it. A failed commit returns its error.
    """
    await require_write_permission(http_request, FeatureGroup.PKI)
    try:
        service = get_session_vyos_service(http_request)
        if request.key_size not in _RSA_SIZES:
            raise HTTPException(status_code=400, detail="RSA key size must be 2048, 3072, or 4096")

        version = service.get_version()
        full_config = await run_in_threadpool(service.get_full_config, refresh=True)
        _reject_existing(_mapper(version), full_config, "openssh", request.name)

        # VyOS openssh supports ssh-rsa only.
        private_key = await run_in_threadpool(
            rsa.generate_private_key, public_exponent=65537, key_size=request.key_size,
        )
        priv_pem = _private_pem(private_key, False, None, serialization.PrivateFormat.OpenSSH)
        pub_key_data = _openssh_public_key_data(private_key.public_key().public_bytes(
            serialization.Encoding.OpenSSH,
            serialization.PublicFormat.OpenSSH,
        ).decode("utf-8"))

        builder = PKIBatchBuilder(version=version)
        builder.create_openssh(request.name)
        builder.set_openssh_public_type(request.name, "ssh-rsa")
        builder.set_openssh_public_key(request.name, pub_key_data)
        builder.set_openssh_private_key(request.name, priv_pem)

        response = await run_in_threadpool(service.execute_batch, builder)
        return _commit_response(response, f"OpenSSH key '{request.name}' generated and installed")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error generating OpenSSH key")
        raise HTTPException(status_code=500, detail="Internal server error")
