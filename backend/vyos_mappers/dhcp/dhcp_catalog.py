"""Version-aware catalog of DHCP server leaves the dedicated methods do not cover.

Path placement comes from the 1.4 and 1.5 lab template trees. A leaf that a
version never had raises on set and on delete. Leaves that already have a
dedicated subnet or shared-network method stay out of that scope so the
existing form does not grow a second control for the same node.
"""

from typing import Any, Dict, List, Optional, Sequence, Tuple

VersionKey = str
Scope = str
RelPath = Tuple[str, ...]

SCOPES = ("global", "shared-network", "subnet", "range", "static-mapping")

# Subnet leaves the Create/Edit form already writes. Still offered on range
# and static-mapping, where those forms have no option fields.
_SUBNET_ALREADY_WIRED = frozenset({
    "bootfile-name",
    "bootfile-server",
    "client-prefix-length",
    "default-router",
    "domain-name",
    "domain-search",
    "name-server",
    "ntp-server",
    "tftp-server-name",
    "time-offset",
    "time-server",
    "wins-server",
    "wpad-url",
})

# Shared-network leaves with dedicated methods. The network editor writes
# those through the existing ops, not the catalog.
_NETWORK_ALREADY_WIRED = frozenset({
    "name-server",
    "domain-name",
    "domain-search",
})


class CatalogLeaf:
    def __init__(
        self,
        token: str,
        kind: str,
        label: str,
        help_text: str,
        paths: Dict[VersionKey, Dict[Scope, RelPath]],
        choices: Tuple[str, ...] = (),
        group: str = "Options",
        sample: Tuple[str, ...] = (),
    ) -> None:
        self.token = token
        self.kind = kind
        self.label = label
        self.help_text = help_text
        self.paths = paths
        self.choices = choices
        self.group = group
        self.sample = sample

    def rel(self, version: str, scope: str) -> Optional[RelPath]:
        return self.paths.get(_version_key(version), {}).get(scope)


def _version_key(version: str) -> VersionKey:
    return "1.4" if str(version).startswith("1.4") else "1.5"


def _opt(name: str) -> Dict[VersionKey, Dict[Scope, RelPath]]:
    """1.5 option child at every named scope. No 1.4 path."""
    rel = ("option", name)
    return {
        "1.5": {
            "shared-network": rel,
            "subnet": rel,
            "range": rel,
            "static-mapping": rel,
        }
    }


def _both_subnet_direct(name: str, *, network_14: bool = False) -> Dict[VersionKey, Dict[Scope, RelPath]]:
    """1.4 direct child of subnet (and shared-network when that tree has it).

    1.5 puts the same token under option at every scope.
    """
    paths: Dict[VersionKey, Dict[Scope, RelPath]] = {
        "1.4": {"subnet": (name,)},
        "1.5": {
            "shared-network": ("option", name),
            "subnet": ("option", name),
            "range": ("option", name),
            "static-mapping": ("option", name),
        },
    }
    if network_14:
        paths["1.4"]["shared-network"] = (name,)
    return paths


def _nested_unifi() -> Dict[VersionKey, Dict[Scope, RelPath]]:
    tail = ("vendor-option", "ubiquiti", "unifi-controller")
    return {
        "1.4": {"subnet": tail},
        "1.5": {
            "shared-network": ("option",) + tail,
            "subnet": ("option",) + tail,
            "range": ("option",) + tail,
            "static-mapping": ("option",) + tail,
        },
    }


def _ddns(field: str) -> Dict[VersionKey, Dict[Scope, RelPath]]:
    rel = ("dynamic-dns-update", field)
    return {"1.5": {"shared-network": rel, "subnet": rel}}


def _leaf(
    token: str,
    kind: str,
    label: str,
    help_text: str,
    paths: Dict[VersionKey, Dict[Scope, RelPath]],
    choices: Tuple[str, ...] = (),
    group: str = "Options",
    sample: Tuple[str, ...] = (),
) -> CatalogLeaf:
    return CatalogLeaf(token, kind, label, help_text, paths, choices, group, sample)


ENABLE = ("enable", "disable")

LEAVES: Tuple[CatalogLeaf, ...] = (
    _leaf(
        "ignore-client-id",
        "flag",
        "Ignore client ID",
        "Ignore the client identifier when looking up a lease",
        {"1.5": {"subnet": ("ignore-client-id",)}},
        group="Subnet",
    ),
    _leaf(
        "client-class",
        "text",
        "Client class",
        "Client class that must match before an address is assigned",
        {
            "1.5": {
                "subnet": ("client-class",),
                "range": ("client-class",),
            }
        },
        group="Subnet",
        sample=("LAN",),
    ),
    _leaf(
        "ip-forwarding",
        "flag",
        "IP forwarding",
        "Enable IP forwarding on the client",
        _both_subnet_direct("ip-forwarding"),
        group="Subnet",
    ),
    _leaf(
        "bootfile-size",
        "text",
        "Bootfile size",
        "Bootstrap file size in 512-byte blocks (1-16)",
        _both_subnet_direct("bootfile-size"),
        sample=("4",),
    ),
    _leaf(
        "ipv6-only-preferred",
        "text",
        "IPv6-only preferred",
        "Seconds to disable IPv4 on IPv6-only hosts",
        _both_subnet_direct("ipv6-only-preferred"),
        sample=("3600",),
    ),
    _leaf(
        "pop-server",
        "multi",
        "POP server",
        "POP3 server address",
        _both_subnet_direct("pop-server"),
        sample=("192.0.2.10",),
    ),
    _leaf(
        "smtp-server",
        "multi",
        "SMTP server",
        "SMTP server address",
        _both_subnet_direct("smtp-server"),
        sample=("192.0.2.11",),
    ),
    _leaf(
        "server-identifier",
        "text",
        "Server identifier",
        "Address advertised as the DHCP server identifier",
        _both_subnet_direct("server-identifier"),
        sample=("192.0.2.1",),
    ),
    _leaf(
        "static-route",
        "route",
        "Static route",
        "Classless static route (destination prefix and next hop)",
        _both_subnet_direct("static-route"),
        sample=("10.0.0.0/24", "192.0.2.1"),
    ),
    _leaf(
        "unifi-controller",
        "text",
        "UniFi controller",
        "Address of the UniFi controller",
        _nested_unifi(),
        sample=("192.0.2.20",),
    ),
    _leaf(
        "captive-portal",
        "text",
        "Captive portal",
        "Captive portal API endpoint",
        _opt("captive-portal"),
        sample=("http://portal.example/api",),
    ),
    _leaf(
        "capwap-controller",
        "text",
        "CAPWAP controller",
        "CAPWAP access controller address",
        _opt("capwap-controller"),
        sample=("192.0.2.30",),
    ),
    _leaf(
        "interface-mtu",
        "text",
        "Interface MTU",
        "Client interface MTU (576-16000)",
        _opt("interface-mtu"),
        sample=("1500",),
    ),
    _leaf(
        "time-zone",
        "text",
        "Time zone",
        "Time zone sent to clients",
        _opt("time-zone"),
        sample=("UTC",),
    ),
    _leaf(
        "bootfile-name",
        "text",
        "Bootfile name",
        "Bootstrap file name",
        _opt("bootfile-name"),
        sample=("pxelinux.0",),
    ),
    _leaf(
        "bootfile-server",
        "text",
        "Bootfile server",
        "Server that holds the initial boot file",
        _opt("bootfile-server"),
        sample=("192.0.2.40",),
    ),
    _leaf(
        "client-prefix-length",
        "text",
        "Client prefix length",
        "Client subnet mask length (0-32)",
        _opt("client-prefix-length"),
        sample=("24",),
    ),
    _leaf(
        "default-router",
        "text",
        "Default router",
        "Default gateway address",
        _opt("default-router"),
        sample=("192.0.2.1",),
    ),
    _leaf(
        "domain-name",
        "text",
        "Domain name",
        "Client domain name",
        _opt("domain-name"),
        sample=("example.com",),
    ),
    _leaf(
        "domain-search",
        "multi",
        "Domain search",
        "Client domain search list",
        _opt("domain-search"),
        sample=("example.com",),
    ),
    _leaf(
        "name-server",
        "multi",
        "Name server",
        "DNS server address",
        _opt("name-server"),
        sample=("192.0.2.53",),
    ),
    _leaf(
        "ntp-server",
        "multi",
        "NTP server",
        "NTP server address",
        _both_subnet_direct("ntp-server", network_14=True),
        sample=("192.0.2.123",),
    ),
    _leaf(
        "tftp-server-name",
        "text",
        "TFTP server name",
        "TFTP server name",
        _opt("tftp-server-name"),
        sample=("tftp.example.com",),
    ),
    _leaf(
        "time-offset",
        "text",
        "Time offset",
        "Offset in seconds from UTC",
        _opt("time-offset"),
        sample=("3600",),
    ),
    _leaf(
        "time-server",
        "multi",
        "Time server",
        "Time server address",
        _opt("time-server"),
        sample=("192.0.2.123",),
    ),
    _leaf(
        "wins-server",
        "multi",
        "WINS server",
        "WINS server address",
        _opt("wins-server"),
        sample=("192.0.2.12",),
    ),
    _leaf(
        "wpad-url",
        "text",
        "WPAD URL",
        "Web Proxy Autodiscovery URL",
        _opt("wpad-url"),
        sample=("http://wpad.example/wpad.dat",),
    ),
    _leaf(
        "subnet-parameters",
        "multi",
        "Subnet parameters",
        "Extra subnet parameters passed to the DHCP server",
        {"1.4": {"subnet": ("subnet-parameters",)}},
        group="Parameters",
        sample=("ping-timeout",),
    ),
    _leaf(
        "shared-network-parameters",
        "multi",
        "Shared network parameters",
        "Extra shared-network parameters passed to the DHCP server",
        {"1.4": {"shared-network": ("shared-network-parameters",)}},
        group="Parameters",
        sample=("authoritative",),
    ),
    _leaf(
        "static-mapping-parameters",
        "multi",
        "Static mapping parameters",
        "Extra static-mapping parameters passed to the DHCP server",
        {"1.4": {"static-mapping": ("static-mapping-parameters",)}},
        group="Parameters",
        sample=("ddns-hostname",),
    ),
    _leaf(
        "global-parameters",
        "multi",
        "Global parameters",
        "Extra global parameters passed to the DHCP server",
        {"1.4": {"global": ("global-parameters",)}},
        group="Parameters",
        sample=("authoritative",),
    ),
    _leaf(
        "log-level",
        "text",
        "Log level",
        "DHCP server log level",
        {"1.5": {"global": ("log-level",)}},
        choices=("fatal", "error", "warn", "info", "debug"),
        group="Server",
        sample=("info",),
    ),
    _leaf(
        "send-updates",
        "text",
        "Send updates",
        "Enable or disable dynamic DNS updates for this scope",
        _ddns("send-updates"),
        choices=ENABLE,
        group="Dynamic DNS",
        sample=("enable",),
    ),
    _leaf(
        "conflict-resolution",
        "text",
        "Conflict resolution",
        "DNS conflict resolution for this scope",
        _ddns("conflict-resolution"),
        choices=ENABLE,
        group="Dynamic DNS",
        sample=("enable",),
    ),
    _leaf(
        "override-client-update",
        "text",
        "Override client update",
        "Update forward and reverse DNS even when the client asks otherwise",
        _ddns("override-client-update"),
        choices=ENABLE,
        group="Dynamic DNS",
        sample=("disable",),
    ),
    _leaf(
        "override-no-update",
        "text",
        "Override no-update",
        "Update DNS even when the client asks the server not to",
        _ddns("override-no-update"),
        choices=ENABLE,
        group="Dynamic DNS",
        sample=("disable",),
    ),
    _leaf(
        "update-on-renew",
        "text",
        "Update on renew",
        "Update the DNS record when the lease is renewed",
        _ddns("update-on-renew"),
        choices=ENABLE,
        group="Dynamic DNS",
        sample=("enable",),
    ),
    _leaf(
        "replace-client-name",
        "text",
        "Replace client name",
        "How the server treats the name the client sent",
        _ddns("replace-client-name"),
        choices=("never", "always", "when-present", "when-not-present"),
        group="Dynamic DNS",
        sample=("never",),
    ),
    _leaf(
        "ttl-percent",
        "text",
        "TTL percent",
        "DNS record TTL as a percentage of the lease time",
        _ddns("ttl-percent"),
        group="Dynamic DNS",
        sample=("50",),
    ),
    _leaf(
        "generated-prefix",
        "text",
        "Generated prefix",
        "Prefix used when generating a fully qualified name",
        _ddns("generated-prefix"),
        group="Dynamic DNS",
        sample=("dyn",),
    ),
    _leaf(
        "qualifying-suffix",
        "text",
        "Qualifying suffix",
        "Suffix used when generating a fully qualified name",
        _ddns("qualifying-suffix"),
        group="Dynamic DNS",
        sample=("example.com",),
    ),
    _leaf(
        "hostname-char-replacement",
        "text",
        "Hostname character replacement",
        "Characters that replace invalid hostname characters",
        _ddns("hostname-char-replacement"),
        group="Dynamic DNS",
        sample=("x",),
    ),
    _leaf(
        "hostname-char-set",
        "text",
        "Hostname character set",
        "Regular expression of invalid hostname characters",
        _ddns("hostname-char-set"),
        group="Dynamic DNS",
        sample=("a",),
    ),
)

_BY_TOKEN = {leaf.token: leaf for leaf in LEAVES}


def leaf_for(token: str) -> CatalogLeaf:
    leaf = _BY_TOKEN.get(token)
    if leaf is None:
        raise ValueError(f"Unknown DHCP option {token}")
    return leaf


def leaves_for(version: str, scope: str) -> List[CatalogLeaf]:
    key = _version_key(version)
    found = []
    for leaf in LEAVES:
        if scope not in leaf.paths.get(key, {}):
            continue
        if scope == "subnet" and leaf.token in _SUBNET_ALREADY_WIRED:
            continue
        if scope == "shared-network" and leaf.token in _NETWORK_ALREADY_WIRED:
            continue
        found.append(leaf)
    return found


def catalog_payload(version: str) -> Dict[str, List[Dict[str, Any]]]:
    payload: Dict[str, List[Dict[str, Any]]] = {}
    for scope in SCOPES:
        payload[scope.replace("-", "_")] = [
            {
                "token": leaf.token,
                "kind": leaf.kind,
                "label": leaf.label,
                "help": leaf.help_text,
                "choices": list(leaf.choices),
                "group": leaf.group,
            }
            for leaf in leaves_for(version, scope)
        ]
    return payload


def _anchor(scope: str, anchors: Sequence[str]) -> List[str]:
    base = ["service", "dhcp-server"]
    if scope == "global":
        if anchors:
            raise ValueError("global DHCP options do not take a name")
        return base
    if scope == "shared-network":
        if len(anchors) != 1 or not anchors[0]:
            raise ValueError("shared-network option requires a network name")
        return base + ["shared-network-name", anchors[0]]
    if scope == "subnet":
        if len(anchors) != 2 or not all(anchors):
            raise ValueError("subnet option requires a network name and subnet")
        return base + ["shared-network-name", anchors[0], "subnet", anchors[1]]
    if scope == "range":
        if len(anchors) != 3 or not all(anchors):
            raise ValueError("range option requires a network, subnet, and range")
        return base + [
            "shared-network-name", anchors[0], "subnet", anchors[1], "range", anchors[2],
        ]
    if scope == "static-mapping":
        if len(anchors) != 3 or not all(anchors):
            raise ValueError("static-mapping option requires a network, subnet, and name")
        return base + [
            "shared-network-name", anchors[0], "subnet", anchors[1],
            "static-mapping", anchors[2],
        ]
    raise ValueError(f"Unknown DHCP option scope {scope}")


def _require(version: str, scope: str, token: str) -> CatalogLeaf:
    leaf = leaf_for(token)
    if leaf.rel(version, scope) is None:
        raise ValueError(f"{token} is not supported on this device")
    return leaf


def _check_value(leaf: CatalogLeaf, value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{leaf.token} requires a value")
    if "|" in cleaned:
        raise ValueError(f"{leaf.token} value cannot contain '|'")
    if leaf.choices and cleaned not in leaf.choices:
        raise ValueError(f"Invalid {leaf.token} value")
    return cleaned


def set_path(
    version: str,
    scope: str,
    token: str,
    anchors: Sequence[str],
    values: Sequence[str] = (),
) -> List[str]:
    leaf = _require(version, scope, token)
    rel = list(leaf.rel(version, scope) or ())
    path = _anchor(scope, anchors) + rel
    if leaf.kind == "flag":
        if values:
            raise ValueError(f"{token} does not take a value")
        return path
    if leaf.kind == "route":
        if len(values) != 2:
            raise ValueError("static-route requires a prefix and a next hop")
        prefix = _check_value(leaf, values[0])
        hop = _check_value(leaf, values[1])
        return path + [prefix, "next-hop", hop]
    if len(values) != 1:
        raise ValueError(f"{token} requires a value")
    return path + [_check_value(leaf, values[0])]


def delete_path(
    version: str,
    scope: str,
    token: str,
    anchors: Sequence[str],
    values: Sequence[str] = (),
) -> List[str]:
    leaf = _require(version, scope, token)
    rel = list(leaf.rel(version, scope) or ())
    path = _anchor(scope, anchors) + rel
    if leaf.kind == "flag":
        return path
    if leaf.kind == "route":
        if len(values) != 1:
            raise ValueError("static-route delete requires a prefix")
        return path + [_check_value(leaf, values[0])]
    if leaf.kind == "multi":
        if len(values) != 1:
            raise ValueError(f"{token} delete requires a value")
        return path + [_check_value(leaf, values[0])]
    return path


def _as_list(node: Any) -> List[str]:
    if isinstance(node, dict):
        return [str(key) for key in node.keys()]
    if isinstance(node, list):
        return [str(item) for item in node]
    if node is None or node == "":
        return []
    return [str(node)]


def _as_text(node: Any) -> Optional[str]:
    if node is None or isinstance(node, (dict, list)):
        return None
    text = str(node).strip()
    return text or None


def _as_routes(node: Any) -> List[Dict[str, str]]:
    if not isinstance(node, dict):
        return []
    routes = []
    for prefix, body in node.items():
        hop = ""
        if isinstance(body, dict):
            raw_hop = body.get("next-hop")
            hop = "" if raw_hop is None else str(raw_hop)
        elif isinstance(body, str):
            hop = body
        routes.append({"prefix": str(prefix), "next_hop": hop})
    return routes


def parse_scope(cfg: Any, version: str, scope: str) -> Dict[str, Any]:
    if not isinstance(cfg, dict):
        return {}
    parsed: Dict[str, Any] = {}
    for leaf in leaves_for(version, scope):
        rel = leaf.rel(version, scope)
        if not rel:
            continue
        node: Any = cfg
        missing = False
        for seg in rel[:-1]:
            if not isinstance(node, dict) or seg not in node:
                missing = True
                break
            node = node[seg]
        if missing or not isinstance(node, dict) or rel[-1] not in node:
            if leaf.kind == "flag":
                parsed[leaf.token] = False
            continue
        raw = node[rel[-1]]
        if leaf.kind == "flag":
            parsed[leaf.token] = True
        elif leaf.kind == "multi":
            parsed[leaf.token] = _as_list(raw)
        elif leaf.kind == "route":
            parsed[leaf.token] = _as_routes(raw)
        else:
            text = _as_text(raw)
            if text is not None:
                parsed[leaf.token] = text
    return parsed


def parse_client_classes(dhcp_config: Any) -> List[Dict[str, Any]]:
    raw = dhcp_config.get("client-class") if isinstance(dhcp_config, dict) else None
    if not isinstance(raw, dict):
        return []
    classes = []
    for name, body in raw.items():
        data = body if isinstance(body, dict) else {}
        relay = data.get("relay-agent-information")
        relay = relay if isinstance(relay, dict) else {}
        classes.append({
            "name": str(name),
            "disable": "disable" in data,
            "circuit_id": _as_text(relay.get("circuit-id")),
            "remote_id": _as_text(relay.get("remote-id")),
        })
    return classes
