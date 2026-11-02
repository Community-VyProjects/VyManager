"""Read-model for DNS forwarding config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree.
"""

from typing import Any, Dict, List, Optional


def parse_multi(value) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return sorted(str(v) for v in value)
    if isinstance(value, dict):
        return sorted(value.keys())
    return [str(value)]


def parse_int(value) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def parse_scalar(value) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, list):
        return str(value[0]) if value else None
    return str(value)


def parse_name_servers(raw) -> List[Dict[str, Any]]:
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for ip, attrs in sorted(raw.items()):
        port = None
        if isinstance(attrs, dict):
            port = parse_int(attrs.get("port"))
        result.append({"ip": ip, "port": port})
    return result


def parse_domain_forwarders(raw: dict) -> List[Dict[str, Any]]:
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for domain, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        ns_raw = attrs.get("name-server", {})
        name_servers = []
        if isinstance(ns_raw, dict):
            for ip, ns_attrs in sorted(ns_raw.items()):
                port = None
                if isinstance(ns_attrs, dict):
                    port = parse_int(ns_attrs.get("port"))
                name_servers.append({"ip": ip, "port": port})
        result.append(
            {
                "domain": domain,
                "name_servers": name_servers,
                "addnta": "addnta" in attrs,
                "recursion_desired": "recursion-desired" in attrs,
            }
        )
    return result


def _record_rows(raw: dict):
    if not raw or not isinstance(raw, dict):
        return []
    rows = []
    for hostname, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        rows.append((hostname, attrs))
    return rows


def parse_a_records(raw: dict) -> List[Dict[str, Any]]:
    return [
        {
            "hostname": hostname,
            "address": parse_scalar(attrs.get("address")),
            "ttl": parse_int(attrs.get("ttl")),
            "disabled": "disable" in attrs,
        }
        for hostname, attrs in _record_rows(raw)
    ]


def parse_aaaa_records(raw: dict) -> List[Dict[str, Any]]:
    return [
        {
            "hostname": hostname,
            "address": parse_scalar(attrs.get("address")),
            "ttl": parse_int(attrs.get("ttl")),
            "disabled": "disable" in attrs,
        }
        for hostname, attrs in _record_rows(raw)
    ]


def parse_cname_records(raw: dict) -> List[Dict[str, Any]]:
    return [
        {
            "hostname": hostname,
            "target": parse_scalar(attrs.get("target")),
            "ttl": parse_int(attrs.get("ttl")),
            "disabled": "disable" in attrs,
        }
        for hostname, attrs in _record_rows(raw)
    ]


def parse_mx_records(raw: dict) -> List[Dict[str, Any]]:
    result = []
    for hostname, attrs in _record_rows(raw):
        servers = []
        server_raw = attrs.get("server", {})
        if isinstance(server_raw, dict):
            for srv, srv_attrs in sorted(server_raw.items()):
                priority = None
                if isinstance(srv_attrs, dict):
                    priority = parse_int(srv_attrs.get("priority"))
                servers.append({"server": srv, "priority": priority})
        result.append(
            {
                "hostname": hostname,
                "servers": servers,
                "ttl": parse_int(attrs.get("ttl")),
                "disabled": "disable" in attrs,
            }
        )
    return result


def parse_txt_records(raw: dict) -> List[Dict[str, Any]]:
    return [
        {
            "hostname": hostname,
            "value": parse_scalar(attrs.get("value")),
            "ttl": parse_int(attrs.get("ttl")),
            "disabled": "disable" in attrs,
        }
        for hostname, attrs in _record_rows(raw)
    ]


def parse_ns_records(raw: dict) -> List[Dict[str, Any]]:
    return [
        {
            "hostname": hostname,
            "target": parse_scalar(attrs.get("target")),
            "ttl": parse_int(attrs.get("ttl")),
            "disabled": "disable" in attrs,
        }
        for hostname, attrs in _record_rows(raw)
    ]


def parse_ptr_records(raw: dict) -> List[Dict[str, Any]]:
    return [
        {
            "hostname": hostname,
            "target": parse_scalar(attrs.get("target")),
            "ttl": parse_int(attrs.get("ttl")),
            "disabled": "disable" in attrs,
        }
        for hostname, attrs in _record_rows(raw)
    ]


def parse_naptr_records(raw: dict) -> List[Dict[str, Any]]:
    result = []
    for hostname, attrs in _record_rows(raw):
        rules = []
        rule_raw = attrs.get("rule", {})
        if isinstance(rule_raw, dict):
            for rule, rule_attrs in sorted(rule_raw.items()):
                if not isinstance(rule_attrs, dict):
                    rule_attrs = {}
                rules.append(
                    {
                        "rule": str(rule),
                        "order": parse_int(rule_attrs.get("order")),
                        "preference": parse_int(rule_attrs.get("preference")),
                        "lookup_a": "lookup-a" in rule_attrs,
                        "lookup_srv": "lookup-srv" in rule_attrs,
                        "protocol_specific": "protocol-specific" in rule_attrs,
                        "resolve_uri": "resolve-uri" in rule_attrs,
                        "regexp": parse_scalar(rule_attrs.get("regexp")),
                        "replacement": parse_scalar(rule_attrs.get("replacement")),
                        "service": parse_scalar(rule_attrs.get("service")),
                    }
                )
        result.append(
            {
                "hostname": hostname,
                "rules": rules,
                "ttl": parse_int(attrs.get("ttl")),
                "disabled": "disable" in attrs,
            }
        )
    return result


def parse_spf_records(raw: dict) -> List[Dict[str, Any]]:
    return [
        {
            "hostname": hostname,
            "value": parse_scalar(attrs.get("value")),
            "ttl": parse_int(attrs.get("ttl")),
            "disabled": "disable" in attrs,
        }
        for hostname, attrs in _record_rows(raw)
    ]


def parse_srv_records(raw: dict) -> List[Dict[str, Any]]:
    result = []
    for hostname, attrs in _record_rows(raw):
        entries = []
        entry_raw = attrs.get("entry", {})
        if isinstance(entry_raw, dict):
            for entry, entry_attrs in sorted(entry_raw.items()):
                if not isinstance(entry_attrs, dict):
                    entry_attrs = {}
                entries.append(
                    {
                        "entry": str(entry),
                        "hostname": parse_scalar(entry_attrs.get("hostname")),
                        "port": parse_int(entry_attrs.get("port")),
                        "priority": parse_int(entry_attrs.get("priority")),
                        "weight": parse_int(entry_attrs.get("weight")),
                    }
                )
        result.append(
            {
                "hostname": hostname,
                "entries": entries,
                "ttl": parse_int(attrs.get("ttl")),
                "disabled": "disable" in attrs,
            }
        )
    return result


def parse_authoritative_domains(raw: dict) -> List[Dict[str, Any]]:
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for domain, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        records_raw = attrs.get("records", {})
        if not isinstance(records_raw, dict):
            records_raw = {}
        result.append(
            {
                "domain": domain,
                "disabled": "disable" in attrs,
                "records": {
                    "a": parse_a_records(records_raw.get("a", {})),
                    "aaaa": parse_aaaa_records(records_raw.get("aaaa", {})),
                    "cname": parse_cname_records(records_raw.get("cname", {})),
                    "mx": parse_mx_records(records_raw.get("mx", {})),
                    "txt": parse_txt_records(records_raw.get("txt", {})),
                    "ns": parse_ns_records(records_raw.get("ns", {})),
                    "ptr": parse_ptr_records(records_raw.get("ptr", {})),
                    "naptr": parse_naptr_records(records_raw.get("naptr", {})),
                    "spf": parse_spf_records(records_raw.get("spf", {})),
                    "srv": parse_srv_records(records_raw.get("srv", {})),
                },
            }
        )
    return result


def parse_zone_caches(raw: dict) -> List[Dict[str, Any]]:
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for zone, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}
        source = attrs.get("source", {}) or {}
        opts_raw = attrs.get("options", {}) or {}
        refresh_raw = opts_raw.get("refresh", {}) or {}
        result.append(
            {
                "zone": zone,
                "source_url": source.get("url"),
                "source_axfr": source.get("axfr"),
                "options": {
                    "dnssec": opts_raw.get("dnssec"),
                    "max_zone_size": parse_int(opts_raw.get("max-zone-size")),
                    "refresh_interval": parse_int(refresh_raw.get("interval")),
                    "refresh_on_reload": "on-reload" in refresh_raw,
                    "retry_interval": parse_int(opts_raw.get("retry-interval")),
                    "timeout": parse_int(opts_raw.get("timeout")),
                    "zonemd": opts_raw.get("zonemd"),
                },
            }
        )
    return result


def parse_ecs_options(raw: dict) -> Dict[str, Any]:
    if not raw or not isinstance(raw, dict):
        return {
            "ecs_add_for": [],
            "ecs_ipv4_bits": None,
            "edns_subnet_allow_list": [],
        }
    return {
        "ecs_add_for": parse_multi(raw.get("ecs-add-for")),
        "ecs_ipv4_bits": parse_int(raw.get("ecs-ipv4-bits")),
        "edns_subnet_allow_list": parse_multi(raw.get("edns-subnet-allow-list")),
    }


def _empty_forwarding() -> Dict[str, Any]:
    return {
        "listen_addresses": [],
        "allow_from": [],
        "name_servers": [],
        "port": None,
        "cache_size": None,
        "dnssec": None,
        "system": False,
        "negative_ttl": None,
        "timeout": None,
        "dhcp_interfaces": [],
        "ignore_hosts_file": False,
        "no_serve_rfc1918": False,
        "source_addresses": [],
        "serve_stale_extension": None,
        "dns64_prefix": None,
        "exclude_throttle_addresses": [],
        "domain_forwarders": [],
        "authoritative_domains": [],
        "zone_caches": [],
        "ecs_options": parse_ecs_options({}),
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/dns-forwarding/config payload."""
    fwd = full_config.get("service", {}).get("dns", {}).get("forwarding", {})
    if not fwd:
        return _empty_forwarding()
    return {
        "listen_addresses": parse_multi(fwd.get("listen-address")),
        "allow_from": parse_multi(fwd.get("allow-from")),
        "name_servers": parse_name_servers(fwd.get("name-server")),
        "port": parse_int(fwd.get("port")),
        "cache_size": parse_int(fwd.get("cache-size")),
        "dnssec": fwd.get("dnssec"),
        "system": "system" in fwd,
        "negative_ttl": parse_int(fwd.get("negative-ttl")),
        "timeout": parse_int(fwd.get("timeout")),
        "dhcp_interfaces": parse_multi(fwd.get("dhcp")),
        "ignore_hosts_file": "ignore-hosts-file" in fwd,
        "no_serve_rfc1918": "no-serve-rfc1918" in fwd,
        "source_addresses": parse_multi(fwd.get("source-address")),
        "serve_stale_extension": parse_int(fwd.get("serve-stale-extension")),
        "dns64_prefix": fwd.get("dns64-prefix"),
        "exclude_throttle_addresses": parse_multi(fwd.get("exclude-throttle-address")),
        "domain_forwarders": parse_domain_forwarders(fwd.get("domain", {})),
        "authoritative_domains": parse_authoritative_domains(
            fwd.get("authoritative-domain", {})
        ),
        "zone_caches": parse_zone_caches(fwd.get("zone-cache", {})),
        "ecs_options": parse_ecs_options(fwd.get("options", {})),
    }
