"""Read-model for HTTPS config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Version keys come from the mapper (MergedMapper), not from
hardcoded version branches here.
"""

from typing import Any, Dict, List, Optional


def _parse_multi(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return sorted(str(v) for v in value)
    if isinstance(value, dict):
        return sorted(value.keys())
    return [str(value)]


def _parse_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _parse_scalar(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, list):
        return str(value[0]) if value else None
    return str(value)


def _empty_auth() -> Dict[str, Any]:
    return {
        "auth_type": None,
        "expiration": None,
        "secret_length": None,
    }


def _empty_graphql() -> Dict[str, Any]:
    return {
        "enabled": False,
        "introspection": False,
        "authentication": _empty_auth(),
        "cors_allow_origins": [],
    }


def _empty_rest() -> Dict[str, Any]:
    return {"enabled": False, "debug": False, "strict": False}


def _empty_certificates() -> Dict[str, Any]:
    return {"certificate": None, "ca_certificate": None, "dh_params": None}


def _empty_api() -> Dict[str, Any]:
    return {
        "keys": [],
        "graphql": _empty_graphql(),
        "rest": _empty_rest(),
    }


def _empty() -> Dict[str, Any]:
    return {
        "listen_addresses": [],
        "allow_client_addresses": [],
        "port": None,
        "request_body_size_limit": None,
        "tls_versions": [],
        "vrf": None,
        "enable_http_redirect": False,
        "certificates": _empty_certificates(),
        "api": _empty_api(),
    }


def _cors_under_graphql(mapper) -> bool:
    """True when the mapper places CORS under the graphql node."""
    return "graphql" in mapper.get_api_cors_allow_origins_delete()


def _rest_is_container(mapper) -> bool:
    """True when debug and strict live under an api/rest container."""
    return bool(mapper.get_api_rest())


def _parse_certificates(raw: Any) -> Dict[str, Any]:
    if not raw or not isinstance(raw, dict):
        return _empty_certificates()
    return {
        "certificate": _parse_scalar(raw.get("certificate")),
        "ca_certificate": _parse_scalar(raw.get("ca-certificate")),
        "dh_params": _parse_scalar(raw.get("dh-params")),
    }


def _parse_api_keys(raw: Any) -> List[Dict[str, str]]:
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
        result.append({"id": key_id, "key": key_val})
    return result


def _parse_graphql(raw: dict, cors_under_graphql: bool) -> Dict[str, Any]:
    if not raw or not isinstance(raw, dict):
        return _empty_graphql()

    auth_raw = raw.get("authentication", {}) or {}
    auth = {
        "auth_type": _parse_scalar(auth_raw.get("type")),
        "expiration": _parse_int(auth_raw.get("expiration")),
        "secret_length": _parse_int(auth_raw.get("secret-length")),
    }

    if cors_under_graphql:
        cors_raw = raw.get("cors", {}) or {}
        cors_origins = _parse_multi(cors_raw.get("allow-origin"))
    else:
        cors_origins = []

    return {
        "enabled": True,
        "introspection": "introspection" in raw,
        "authentication": auth,
        "cors_allow_origins": cors_origins,
    }


def _parse_api(raw: dict, mapper) -> Dict[str, Any]:
    if not raw or not isinstance(raw, dict):
        return _empty_api()

    cors_under_graphql = _cors_under_graphql(mapper)
    keys = _parse_api_keys(raw.get("keys", {}))
    graphql_raw = raw.get("graphql", {}) or {}
    if graphql_raw:
        graphql = _parse_graphql(graphql_raw, cors_under_graphql)
    else:
        graphql = _empty_graphql()

    if not cors_under_graphql:
        # 1.4 CORS is an api child, not a graphql child. Keep it when graphql
        # is absent so a delete-and-rebuild save does not drop it.
        cors_raw = raw.get("cors")
        if isinstance(cors_raw, dict):
            cors_origins = _parse_multi(cors_raw.get("allow-origin"))
            if cors_origins:
                graphql = {**graphql, "cors_allow_origins": cors_origins}

    if _rest_is_container(mapper):
        # Presence is key membership. raw.get("rest", {}) invents a dict for
        # a missing node, and isinstance(that, dict) is always true.
        rest_node = raw["rest"] if "rest" in raw else None
        rest_raw = rest_node if isinstance(rest_node, dict) else {}
        rest = {
            "enabled": "rest" in raw,
            "debug": "debug" in rest_raw,
            "strict": "strict" in rest_raw,
        }
    else:
        # 1.4 has no api/rest node. Do not infer one from keys, debug, or
        # strict. Those flags are siblings of the key list.
        debug = "debug" in raw
        strict = "strict" in raw
        rest = {
            "enabled": False,
            "debug": debug,
            "strict": strict,
        }

    return {"keys": keys, "graphql": graphql, "rest": rest}


def parse_config(mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/https/config payload."""
    https_raw = full_config.get("service", {}).get("https", {})
    if not https_raw:
        return _empty()

    return {
        "listen_addresses": _parse_multi(https_raw.get("listen-address")),
        "allow_client_addresses": _parse_multi(
            (https_raw.get("allow-client") or {}).get("address")
        ),
        "port": _parse_int(https_raw.get("port")),
        "request_body_size_limit": _parse_int(
            https_raw.get("request-body-size-limit")
        ),
        "tls_versions": _parse_multi(https_raw.get("tls-version")),
        "vrf": _parse_scalar(https_raw.get("vrf")),
        "enable_http_redirect": "enable-http-redirect" in https_raw,
        "certificates": _parse_certificates(https_raw.get("certificates", {})),
        "api": _parse_api(https_raw.get("api", {}), mapper),
    }
