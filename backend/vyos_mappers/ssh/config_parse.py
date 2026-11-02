"""Read-model for SSH config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Version keys come from the mapper (MergedMapper), not from
hardcoded 1.4/1.5 branches here.
"""

from typing import Any, Dict, List


def _parse_multi_value(raw: Any) -> List[str]:
    """Parse a VyOS multi-value node into a sorted list of strings."""
    if raw is None:
        return []
    if isinstance(raw, list):
        return sorted(str(v) for v in raw)
    if isinstance(raw, dict):
        return sorted(raw.keys())
    return [str(raw)]


def _empty_access_control() -> Dict[str, List[str]]:
    return {
        "allow_users": [],
        "allow_groups": [],
        "deny_users": [],
        "deny_groups": [],
    }


def _empty_dynamic_protection() -> Dict[str, Any]:
    return {
        "enabled": False,
        "allow_from": [],
        "block_time": None,
        "detect_time": None,
        "threshold": None,
    }


def _empty_fido() -> Dict[str, bool]:
    return {"pin_required": False, "touch_required": False}


def _empty_rekey() -> Dict[str, Any]:
    return {"data": None, "time": None}


def _parse_access_control(ssh_raw: dict) -> Dict[str, List[str]]:
    ac = ssh_raw.get("access-control", {})
    if not isinstance(ac, dict):
        return _empty_access_control()
    allow = ac.get("allow", {}) or {}
    deny = ac.get("deny", {}) or {}
    return {
        "allow_users": _parse_multi_value(allow.get("user")),
        "allow_groups": _parse_multi_value(allow.get("group")),
        "deny_users": _parse_multi_value(deny.get("user")),
        "deny_groups": _parse_multi_value(deny.get("group")),
    }


def _parse_dynamic_protection(ssh_raw: dict) -> Dict[str, Any]:
    if "dynamic-protection" not in ssh_raw:
        return _empty_dynamic_protection()
    dp = ssh_raw.get("dynamic-protection") or {}
    if not isinstance(dp, dict):
        dp = {}
    return {
        "enabled": True,
        "allow_from": _parse_multi_value(dp.get("allow-from")),
        "block_time": dp.get("block-time"),
        "detect_time": dp.get("detect-time"),
        "threshold": dp.get("threshold"),
    }


def _parse_fido(ssh_raw: dict) -> Dict[str, bool]:
    fido = ssh_raw.get("fido", {})
    if not isinstance(fido, dict):
        return _empty_fido()
    return {
        "pin_required": "pin-required" in fido,
        "touch_required": "touch-required" in fido,
    }


def _parse_rekey(ssh_raw: dict) -> Dict[str, Any]:
    rekey = ssh_raw.get("rekey", {})
    if not isinstance(rekey, dict):
        return _empty_rekey()
    return {"data": rekey.get("data"), "time": rekey.get("time")}


def _empty() -> Dict[str, Any]:
    return {
        "ports": [],
        "listen_addresses": [],
        "vrfs": [],
        "disable_host_validation": False,
        "disable_password_authentication": False,
        "loglevel": None,
        "client_keepalive_interval": None,
        "ciphers": [],
        "macs": [],
        "key_exchanges": [],
        "hostkey_algorithms": [],
        "pubkey_accepted_algorithms": [],
        "trusted_user_ca": None,
        "access_control": _empty_access_control(),
        "dynamic_protection": _empty_dynamic_protection(),
        "fido": _empty_fido(),
        "rekey": _empty_rekey(),
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/ssh/config payload."""
    ssh_raw = full_config.get("service", {}).get("ssh", {})
    if not ssh_raw or not isinstance(ssh_raw, dict):
        return _empty()

    # Accept either cipher node name. The write mapper picks the version key.
    ciphers = ssh_raw.get("cipher", ssh_raw.get("ciphers"))
    return {
        "ports": _parse_multi_value(ssh_raw.get("port")),
        "listen_addresses": _parse_multi_value(ssh_raw.get("listen-address")),
        "vrfs": _parse_multi_value(ssh_raw.get("vrf")),
        "disable_host_validation": "disable-host-validation" in ssh_raw,
        "disable_password_authentication": (
            "disable-password-authentication" in ssh_raw
        ),
        "loglevel": ssh_raw.get("loglevel"),
        "client_keepalive_interval": ssh_raw.get("client-keepalive-interval"),
        "ciphers": _parse_multi_value(ciphers),
        "macs": _parse_multi_value(ssh_raw.get("mac")),
        "key_exchanges": _parse_multi_value(ssh_raw.get("key-exchange")),
        "hostkey_algorithms": _parse_multi_value(ssh_raw.get("hostkey-algorithm")),
        "pubkey_accepted_algorithms": _parse_multi_value(
            ssh_raw.get("pubkey-accepted-algorithm")
        ),
        "trusted_user_ca": ssh_raw.get("trusted-user-ca"),
        "access_control": _parse_access_control(ssh_raw),
        "dynamic_protection": _parse_dynamic_protection(ssh_raw),
        "fido": _parse_fido(ssh_raw),
        "rekey": _parse_rekey(ssh_raw),
    }
