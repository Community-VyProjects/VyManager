"""Read-model for ``pki`` config.

Mappers own VyOS tree shape. ``parse_config`` returns the GET /config
response the client reads: each collection as a list, private keys, DH
parameters and OpenVPN keys masked as ``***``, and per-collection totals.
``raw_item`` reads one item unmasked for /reveal and for signing with a CA;
/reveal serves only the masked fields (``REVEAL_FIELDS``).
A ``multi:`` leaf (CA ``crl``, ACME ``domain-name``) is a list whether the
device returned one value or several.
"""

from typing import Any, Callable, Dict, List, Optional, Tuple

MASK = "***"

def _dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _list(value: Any) -> List[Any]:
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        return list(value.keys())
    if isinstance(value, str):
        return [value]
    return []


def _private(data: Dict[str, Any]) -> Dict[str, Any]:
    private = _dict(data.get("private"))
    return {
        "private_key": private.get("key"),
        "password_protected": "password-protected" in private,
    }


def _ca(name: str, data: Dict[str, Any]) -> Dict[str, Any]:
    private = _private(data)
    return {
        "name": name,
        "certificate": data.get("certificate"),
        "crl": _list(data.get("crl")),
        "description": data.get("description"),
        "private_key": private["private_key"],
        "password_protected": private["password_protected"],
        "revoke": "revoke" in data,
        "system_install": "system-install" in data,
    }


def _certificate(name: str, data: Dict[str, Any]) -> Dict[str, Any]:
    private = _private(data)
    acme = data.get("acme")
    acme_config = None
    if isinstance(acme, dict) and acme:
        acme_config = {
            "domain_names": _list(acme.get("domain-name")),
            "email": acme.get("email"),
            "listen_address": acme.get("listen-address"),
            "rsa_key_size": acme.get("rsa-key-size"),
            "url": acme.get("url"),
        }
    return {
        "name": name,
        "certificate": data.get("certificate"),
        "description": data.get("description"),
        "private_key": private["private_key"],
        "password_protected": private["password_protected"],
        "revoke": "revoke" in data,
        "acme": acme_config,
    }


def _dh(name: str, data: Dict[str, Any]) -> Dict[str, Any]:
    return {"name": name, "parameters": data.get("parameters")}


def _key_pair(name: str, data: Dict[str, Any]) -> Dict[str, Any]:
    private = _private(data)
    public = _dict(data.get("public"))
    return {
        "name": name,
        "private_key": private["private_key"],
        "password_protected": private["password_protected"],
        "public_key": public.get("key"),
    }


def _openssh(name: str, data: Dict[str, Any]) -> Dict[str, Any]:
    row = _key_pair(name, data)
    row["public_type"] = _dict(data.get("public")).get("type")
    return row


def _openvpn(name: str, data: Dict[str, Any]) -> Dict[str, Any]:
    return {"name": name, "key": data.get("key"), "version": data.get("version")}


# Kind -> (response key, raw tree reader, row parser, masked fields).
_KINDS: Dict[str, Tuple[str, Callable[[Dict[str, Any]], Any], Callable[[str, Dict[str, Any]], Dict[str, Any]], Tuple[str, ...]]] = {
    "ca": ("ca", lambda pki: pki.get("ca"), _ca, ("private_key",)),
    "certificate": ("certificates", lambda pki: pki.get("certificate"), _certificate, ("private_key",)),
    "dh": ("dh", lambda pki: pki.get("dh"), _dh, ("parameters",)),
    "key_pair": ("key_pairs", lambda pki: pki.get("key-pair"), _key_pair, ("private_key",)),
    "openssh": ("openssh", lambda pki: pki.get("openssh"), _openssh, ("private_key",)),
    "openvpn": (
        "openvpn_shared_secrets",
        lambda pki: _dict(pki.get("openvpn")).get("shared-secret"),
        _openvpn,
        ("key",),
    ),
}


# /reveal serves exactly the fields the parse masks.
REVEAL_FIELDS: Dict[str, Tuple[str, ...]] = {kind: spec[3] for kind, spec in _KINDS.items()}


def _rows(pki: Dict[str, Any], kind: str) -> Dict[str, Dict[str, Any]]:
    _key, read, parse, _masked = _KINDS[kind]
    return {
        name: parse(name, data)
        for name, data in _dict(read(pki)).items()
        if isinstance(data, dict)
    }


def _masked(row: Dict[str, Any], fields: Tuple[str, ...]) -> Dict[str, Any]:
    return {key: (MASK if key in fields and value else value) for key, value in row.items()}


def _x509_defaults(pki: Dict[str, Any]) -> Dict[str, Any]:
    x509 = _dict(pki.get("x509"))
    if "default" not in x509:
        return {}
    default = _dict(x509.get("default"))
    return {
        "country": default.get("country"),
        "locality": default.get("locality"),
        "organization": default.get("organization"),
        "state": default.get("state"),
    }


def parse_config(full_config: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """GET /config response. ``configured`` is key membership of ``pki``."""
    full_config = full_config or {}
    pki = _dict(full_config.get("pki"))
    result: Dict[str, Any] = {"configured": "pki" in full_config}
    totals: Dict[str, int] = {}
    for kind, (key, _read, _parse, masked) in _KINDS.items():
        rows = [_masked(row, masked) for row in _rows(pki, kind).values()]
        result[key] = rows
        totals[key] = len(rows)
    result["x509_defaults"] = _x509_defaults(pki)
    result["totals"] = totals
    return result


def raw_item(full_config: Optional[Dict[str, Any]], kind: str, name: str) -> Optional[Dict[str, Any]]:
    """One item of ``kind`` with its secrets unmasked, or None."""
    if kind not in _KINDS:
        return None
    pki = _dict((full_config or {}).get("pki"))
    return _rows(pki, kind).get(name)
