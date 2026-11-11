"""Read-model for ``service dhcp-server``.

The router calls ``DHCPServerMapper.parse_config`` and builds its response
models from these plain dicts. Where a leaf sits (under ``option`` or not,
``mac`` or ``mac-address``) comes from the version subclass.
"""

from typing import TYPE_CHECKING, Any, Dict, List, Optional

from .dhcp_server_catalog import _as_list, _as_text, parse_client_classes, parse_scope

if TYPE_CHECKING:
    from .dhcp_server import DHCPServerMapper

MASKED_SECRET = "***"


def _dict(node: Any) -> Dict[str, Any]:
    return node if isinstance(node, dict) else {}


def _options(mapper: "DHCPServerMapper", data: Dict[str, Any]) -> Dict[str, Any]:
    node: Any = data
    for seg in mapper.OPTION_PREFIX:
        node = _dict(node).get(seg)
    return _dict(node)


def _parse_ddns_domains(raw: Any) -> List[Dict[str, Any]]:
    domains = []
    for name, data in _dict(raw).items():
        node = _dict(data)
        servers = [
            {
                "id": str(sid),
                "address": _as_text(_dict(sdata).get("address")),
                "port": _as_text(_dict(sdata).get("port")),
            }
            for sid, sdata in _dict(node.get("dns-server")).items()
        ]
        domains.append({
            "name": str(name),
            "key_name": _as_text(node.get("key-name")),
            "dns_servers": servers,
        })
    return domains


def _parse_ddns(raw: Any) -> Dict[str, Any]:
    if raw is None:
        return {"present": False}
    node = _dict(raw)
    keys = [
        {
            "name": str(name),
            "algorithm": _as_text(_dict(data).get("algorithm")),
            "secret": MASKED_SECRET if _dict(data).get("secret") else None,
        }
        for name, data in _dict(node.get("tsig-key")).items()
    ]
    return {
        "present": True,
        "send_updates": _as_text(node.get("send-updates")),
        "conflict_resolution": _as_text(node.get("conflict-resolution")),
        "override_client_update": _as_text(node.get("override-client-update")),
        "override_no_update": _as_text(node.get("override-no-update")),
        "update_on_renew": _as_text(node.get("update-on-renew")),
        "replace_client_name": _as_text(node.get("replace-client-name")),
        "ttl_percent": _as_text(node.get("ttl-percent")),
        "generated_prefix": _as_text(node.get("generated-prefix")),
        "qualifying_suffix": _as_text(node.get("qualifying-suffix")),
        "hostname_char_replacement": _as_text(node.get("hostname-char-replacement")),
        "hostname_char_set": _as_text(node.get("hostname-char-set")),
        "tsig_keys": keys,
        "forward_domains": _parse_ddns_domains(node.get("forward-domain")),
        "reverse_domains": _parse_ddns_domains(node.get("reverse-domain")),
    }


def _parse_failover(raw: Any) -> Optional[Dict[str, Any]]:
    if raw is None:
        return None
    node = _dict(raw)
    return {
        "mode": _as_text(node.get("mode")),
        "name": _as_text(node.get("name")),
        "source_address": _as_text(node.get("source-address")),
        "remote": _as_text(node.get("remote")),
        "status": _as_text(node.get("status")),
        "certificate": _as_text(node.get("certificate")),
        "ca_certificate": _as_text(node.get("ca-certificate")),
    }


def _parse_static_mappings(mapper: "DHCPServerMapper", raw: Any) -> List[Dict[str, Any]]:
    key = mapper.CATALOG_KEY
    return [
        {
            "name": str(name),
            "ip_address": _as_text(_dict(data).get("ip-address")),
            "mac_address": _as_text(_dict(data).get(mapper.MAC_LEAF)),
            "duid": _as_text(_dict(data).get("duid")),
            "description": _as_text(_dict(data).get("description")),
            "disable": "disable" in _dict(data),
            "catalog": parse_scope(_dict(data), key, "static-mapping"),
        }
        for name, data in _dict(raw).items()
    ]


def _parse_subnet(mapper: "DHCPServerMapper", cidr: str, data: Dict[str, Any]) -> Dict[str, Any]:
    key = mapper.CATALOG_KEY
    opts = _options(mapper, data)
    subnet_id = data.get("subnet-id")
    return {
        "subnet": str(cidr),
        "subnet_id": int(subnet_id) if subnet_id is not None else None,
        "description": _as_text(data.get("description")),
        "disable": "disable" in data,
        "default_router": _as_text(opts.get("default-router")),
        "name_servers": _as_list(opts.get("name-server")),
        "domain_name": _as_text(opts.get("domain-name")),
        "domain_search": _as_list(opts.get("domain-search")),
        "lease": _as_text(data.get("lease")),
        "ranges": [
            {
                "range_id": str(range_id),
                "start": _as_text(_dict(rdata).get("start")),
                "stop": _as_text(_dict(rdata).get("stop")),
                "catalog": parse_scope(_dict(rdata), key, "range"),
            }
            for range_id, rdata in _dict(data.get("range")).items()
        ],
        "excludes": _as_list(data.get("exclude")),
        "static_mappings": _parse_static_mappings(mapper, data.get("static-mapping")),
        "ping_check": "ping-check" in data,
        "enable_failover": "enable-failover" in data,
        "bootfile_name": _as_text(opts.get("bootfile-name")),
        "bootfile_server": _as_text(opts.get("bootfile-server")),
        "tftp_server_name": _as_text(opts.get("tftp-server-name")),
        "time_servers": _as_list(opts.get("time-server")),
        "ntp_servers": _as_list(opts.get("ntp-server")),
        "wins_servers": _as_list(opts.get("wins-server")),
        "time_offset": _as_text(opts.get("time-offset")),
        "client_prefix_length": _as_text(opts.get("client-prefix-length")),
        "wpad_url": _as_text(opts.get("wpad-url")),
        "catalog": parse_scope(data, key, "subnet"),
    }


def _parse_network(mapper: "DHCPServerMapper", name: str, data: Dict[str, Any]) -> Dict[str, Any]:
    opts = _options(mapper, data)
    return {
        "name": str(name),
        "description": _as_text(data.get("description")),
        "disable": "disable" in data,
        "authoritative": "authoritative" in data,
        "name_servers": _as_list(opts.get("name-server")),
        "domain_name": _as_text(opts.get("domain-name")),
        "domain_search": _as_list(opts.get("domain-search")),
        "ping_check": "ping-check" in data,
        "subnets": [
            _parse_subnet(mapper, cidr, _dict(sdata))
            for cidr, sdata in _dict(data.get("subnet")).items()
        ],
        "catalog": parse_scope(data, mapper.CATALOG_KEY, "shared-network"),
    }


def parse_config(mapper: "DHCPServerMapper", full_config: Any) -> Dict[str, Any]:
    """Return the GET /config payload for ``service dhcp-server``."""
    raw = _dict(full_config).get("service")
    if not isinstance(raw, dict) or "dhcp-server" not in raw:
        return {}
    dhcp = _dict(raw["dhcp-server"])
    networks = [
        _parse_network(mapper, name, _dict(data))
        for name, data in _dict(dhcp.get("shared-network-name")).items()
    ]
    subnets = [subnet for network in networks for subnet in network["subnets"]]
    return {
        "shared_networks": networks,
        "failover": _parse_failover(dhcp.get("high-availability")),
        "ddns": _parse_ddns(dhcp.get("dynamic-dns-update")),
        "global_config": {
            "listen_addresses": _as_list(dhcp.get("listen-address")),
            "listen_interfaces": _as_list(dhcp.get("listen-interface")),
            "hostfile_update": "hostfile-update" in dhcp,
            "host_decl_name": "host-decl-name" in dhcp,
            "disable": "disable" in dhcp,
            "catalog": parse_scope(dhcp, mapper.CATALOG_KEY, "global"),
        },
        "client_classes": parse_client_classes(dhcp),
        "total_subnets": len(subnets),
        "total_static_mappings": sum(len(s["static_mappings"]) for s in subnets),
    }
