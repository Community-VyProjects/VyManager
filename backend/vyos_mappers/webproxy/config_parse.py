"""Read-model for webproxy config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree.
"""

from typing import Any, Dict, List, Optional

# A configured LDAP bind password is returned as this mask, never in clear.
MASKED_SECRET = "***"


def _parse_multi(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return sorted(str(v) for v in value)
    if isinstance(value, dict):
        return sorted(value.keys())
    return [str(value)]


def _parse_int(value: Any) -> Optional[int]:
    if isinstance(value, list):
        value = value[0] if value else None
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


def _empty_ldap() -> Dict[str, Any]:
    return {
        "server": None,
        "base_dn": None,
        "bind_dn": None,
        "filter_expression": None,
        "password": None,
        "username_attribute": None,
        "port": None,
        "version": None,
        "persistent_connection": False,
        "use_ssl": False,
    }


def _empty_authentication() -> Dict[str, Any]:
    return {
        "children": None,
        "credentials_ttl": None,
        "method": None,
        "realm": None,
        "ldap": _empty_ldap(),
    }


def _empty_squidguard() -> Dict[str, Any]:
    return {
        "allow_categories": [],
        "block_categories": [],
        "log": [],
        "local_block": [],
        "local_block_keyword": [],
        "local_block_url": [],
        "local_ok": [],
        "local_ok_url": [],
        "allow_ipaddr_url": False,
        "enable_safe_search": False,
        "default_action": None,
        "redirect_url": None,
        "auto_update_hour": None,
        "rules": [],
        "source_groups": [],
        "time_periods": [],
    }


def _empty_url_filtering() -> Dict[str, Any]:
    return {"disable": False, "squidguard": _empty_squidguard()}


def _empty() -> Dict[str, Any]:
    return {
        "append_domain": None,
        "cache_size": None,
        "default_port": None,
        "maximum_object_size": None,
        "mem_cache_size": None,
        "minimum_object_size": None,
        "outgoing_address": None,
        "reply_body_max_size": None,
        "disable_access_log": False,
        "domain_block": [],
        "domain_noncache": [],
        "reply_block_mime": [],
        "safe_ports": [],
        "ssl_safe_ports": [],
        "authentication": _empty_authentication(),
        "cache_peers": [],
        "listen_addresses": [],
        "url_filtering": _empty_url_filtering(),
    }


def _parse_authentication(raw: Any) -> Dict[str, Any]:
    if not isinstance(raw, dict) or not raw:
        return _empty_authentication()
    ldap_raw = raw.get("ldap", {}) if isinstance(raw.get("ldap"), dict) else {}
    ldap = _empty_ldap()
    ldap.update(
        {
            "server": _parse_scalar(ldap_raw.get("server")),
            "base_dn": _parse_scalar(ldap_raw.get("base-dn")),
            "bind_dn": _parse_scalar(ldap_raw.get("bind-dn")),
            "filter_expression": _parse_scalar(ldap_raw.get("filter-expression")),
            "password": MASKED_SECRET if _parse_scalar(ldap_raw.get("password")) else None,
            "username_attribute": _parse_scalar(ldap_raw.get("username-attribute")),
            "port": _parse_int(ldap_raw.get("port")),
            "version": _parse_scalar(ldap_raw.get("version")),
            "persistent_connection": "persistent-connection" in ldap_raw,
            "use_ssl": "use-ssl" in ldap_raw,
        }
    )
    return {
        "children": _parse_int(raw.get("children")),
        "credentials_ttl": _parse_int(raw.get("credentials-ttl")),
        "method": _parse_scalar(raw.get("method")),
        "realm": _parse_scalar(raw.get("realm")),
        "ldap": ldap,
    }


def _parse_cache_peers(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return []
    peers = []
    for name, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        peers.append(
            {
                "name": name,
                "address": _parse_scalar(attrs.get("address")),
                "http_port": _parse_int(attrs.get("http-port")),
                "icp_port": _parse_int(attrs.get("icp-port")),
                "options": _parse_scalar(attrs.get("options")),
                "type": _parse_scalar(attrs.get("type")),
            }
        )
    return peers


def _parse_listen_addresses(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return []
    addresses = []
    for addr, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        addresses.append(
            {
                "address": addr,
                "port": _parse_int(attrs.get("port")),
                "disable_transparent": "disable-transparent" in attrs,
            }
        )
    return addresses


def _parse_squidguard_rules(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return []
    rules = []
    for number, attrs in sorted(raw.items(), key=lambda kv: _parse_int(kv[0]) or 0):
        if not isinstance(attrs, dict):
            attrs = {}
        rules.append(
            {
                "number": str(number),
                "allow_categories": _parse_multi(attrs.get("allow-category")),
                "block_categories": _parse_multi(attrs.get("block-category")),
                "log": _parse_multi(attrs.get("log")),
                "local_block": _parse_multi(attrs.get("local-block")),
                "local_block_keyword": _parse_multi(attrs.get("local-block-keyword")),
                "local_block_url": _parse_multi(attrs.get("local-block-url")),
                "local_ok": _parse_multi(attrs.get("local-ok")),
                "local_ok_url": _parse_multi(attrs.get("local-ok-url")),
                "allow_ipaddr_url": "allow-ipaddr-url" in attrs,
                "enable_safe_search": "enable-safe-search" in attrs,
                "default_action": _parse_scalar(attrs.get("default-action")),
                "redirect_url": _parse_scalar(attrs.get("redirect-url")),
                "source_group": _parse_scalar(attrs.get("source-group")),
                "time_period": _parse_scalar(attrs.get("time-period")),
            }
        )
    return rules


def _parse_source_groups(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return []
    groups = []
    for name, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        groups.append(
            {
                "name": name,
                "address": _parse_multi(attrs.get("address")),
                "domain": _parse_multi(attrs.get("domain")),
                "ldap_ip_search": _parse_multi(attrs.get("ldap-ip-search")),
                "ldap_user_search": _parse_multi(attrs.get("ldap-user-search")),
                "description": _parse_scalar(attrs.get("description")),
                "user": _parse_scalar(attrs.get("user")),
            }
        )
    return groups


def _parse_time_periods(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return []
    periods = []
    for name, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        days_raw = attrs.get("days", {})
        days = []
        if isinstance(days_raw, dict):
            for day, day_attrs in sorted(days_raw.items()):
                time_val = None
                if isinstance(day_attrs, dict):
                    time_val = _parse_scalar(day_attrs.get("time"))
                days.append({"day": day, "time": time_val})
        periods.append(
            {
                "name": name,
                "description": _parse_scalar(attrs.get("description")),
                "days": days,
            }
        )
    return periods


def _parse_squidguard(raw: Any) -> Dict[str, Any]:
    if not isinstance(raw, dict) or not raw:
        return _empty_squidguard()
    auto_update = raw.get("auto-update", {})
    auto_update_hour = None
    if isinstance(auto_update, dict):
        auto_update_hour = _parse_int(auto_update.get("update-hour"))
    return {
        "allow_categories": _parse_multi(raw.get("allow-category")),
        "block_categories": _parse_multi(raw.get("block-category")),
        "log": _parse_multi(raw.get("log")),
        "local_block": _parse_multi(raw.get("local-block")),
        "local_block_keyword": _parse_multi(raw.get("local-block-keyword")),
        "local_block_url": _parse_multi(raw.get("local-block-url")),
        "local_ok": _parse_multi(raw.get("local-ok")),
        "local_ok_url": _parse_multi(raw.get("local-ok-url")),
        "allow_ipaddr_url": "allow-ipaddr-url" in raw,
        "enable_safe_search": "enable-safe-search" in raw,
        "default_action": _parse_scalar(raw.get("default-action")),
        "redirect_url": _parse_scalar(raw.get("redirect-url")),
        "auto_update_hour": auto_update_hour,
        "rules": _parse_squidguard_rules(raw.get("rule", {})),
        "source_groups": _parse_source_groups(raw.get("source-group", {})),
        "time_periods": _parse_time_periods(raw.get("time-period", {})),
    }


def _parse_url_filtering(raw: Any) -> Dict[str, Any]:
    if not isinstance(raw, dict) or not raw:
        return _empty_url_filtering()
    return {
        "disable": "disable" in raw,
        "squidguard": _parse_squidguard(raw.get("squidguard", {})),
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/webproxy/config payload."""
    wp = (full_config.get("service") or {}).get("webproxy")
    if not wp or not isinstance(wp, dict):
        return _empty()

    return {
        "append_domain": _parse_scalar(wp.get("append-domain")),
        "cache_size": _parse_int(wp.get("cache-size")),
        "default_port": _parse_int(wp.get("default-port")),
        "maximum_object_size": _parse_int(wp.get("maximum-object-size")),
        "mem_cache_size": _parse_int(wp.get("mem-cache-size")),
        "minimum_object_size": _parse_int(wp.get("minimum-object-size")),
        "outgoing_address": _parse_scalar(wp.get("outgoing-address")),
        "reply_body_max_size": _parse_int(wp.get("reply-body-max-size")),
        "disable_access_log": "disable-access-log" in wp,
        "domain_block": _parse_multi(wp.get("domain-block")),
        "domain_noncache": _parse_multi(wp.get("domain-noncache")),
        "reply_block_mime": _parse_multi(wp.get("reply-block-mime")),
        "safe_ports": _parse_multi(wp.get("safe-ports")),
        "ssl_safe_ports": _parse_multi(wp.get("ssl-safe-ports")),
        "authentication": _parse_authentication(wp.get("authentication", {})),
        "cache_peers": _parse_cache_peers(wp.get("cache-peer", {})),
        "listen_addresses": _parse_listen_addresses(wp.get("listen-address", {})),
        "url_filtering": _parse_url_filtering(wp.get("url-filtering", {})),
    }
