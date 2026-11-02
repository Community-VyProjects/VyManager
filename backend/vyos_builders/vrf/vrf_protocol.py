"""Reuse global feature builders under a VRF path prefix.

VRF configuration is the same command tree as the global feature, with
``vrf name <vrf>`` in front. ``PathPrefixMapper`` applies that prefix.
Version differences stay on the feature mapper.
"""

from __future__ import annotations

import inspect
from typing import Any, Callable, List, Optional, Tuple

from vyos_builders.bgp.bgp_batch_builder import BgpBatchBuilder
from vyos_builders.dhcp.dhcp import DHCPBatchBuilder
from vyos_builders.dhcpv6_server.dhcpv6_server_batch_builder import DHCPv6ServerBatchBuilder
from vyos_builders.failover.failover_batch_builder import FailoverBatchBuilder
from vyos_builders.isis.isis_batch_builder import IsisBatchBuilder
from vyos_builders.ospf.ospf_batch_builder import OspfBatchBuilder
from vyos_builders.ospfv3.ospfv3_batch_builder import Ospfv3BatchBuilder
from vyos_builders.static_routes.static_routes_batch_builder import StaticRoutesBatchBuilder
from vyos_builders.vrf.feature_modes import DIRECT, DROP, FLIP
from vyos_mappers.feature_leaves import (
    DhcpExtraLeaves,
    Dhcpv6ExtraLeaves,
    FailoverExtraLeaves,
    StaticExtraLeaves,
)
from vyos_mappers.path_prefix import PathPrefixMapper, require_feature_version

# Longest name first so "ospfv3" is not parsed as "ospf" and "dhcpv6" is not "dhcp".
PROTOCOL_BUILDERS = {
    "ospfv3": Ospfv3BatchBuilder,
    "ospf": OspfBatchBuilder,
    "isis": IsisBatchBuilder,
    "bgp": BgpBatchBuilder,
}
# Service and static trees. Root set exists only where the VRF UI enables the
# feature node itself. Delete of the feature root exists for every entry.
FEATURE_BUILDERS = {
    "dhcpv6": DHCPv6ServerBatchBuilder,
    "dhcp": DHCPBatchBuilder,
    "static": StaticRoutesBatchBuilder,
    "failover": FailoverBatchBuilder,
}
_ALL_BUILDERS = {**FEATURE_BUILDERS, **PROTOCOL_BUILDERS}
_PROTO_KEYS = tuple(sorted(_ALL_BUILDERS, key=len, reverse=True))


def vrf_protocol_op_exists(owner: Any, verb: str, proto: str, suffix: Optional[str]) -> bool:
    if proto in FEATURE_BUILDERS:
        return _feature_op_exists(owner, verb, proto, suffix)
    if suffix is None:
        return True
    inner_cls = PROTOCOL_BUILDERS[proto]
    if hasattr(inner_cls, f"{verb}_{suffix}"):
        return True
    mapper = owner.mappers.get(f"vrf_{proto}")
    if mapper is None:
        return False
    return any(
        hasattr(mapper, candidate)
        for candidate in (
            f"get_{proto}_{suffix}",
            f"get_{suffix}",
            f"get_{proto}_{suffix}_delete",
        )
    )


def parse_vrf_protocol_op(name: str) -> Optional[Tuple[str, str, Optional[str]]]:
    """Return (verb, proto, suffix) for set/delete_vrf_<proto>[_suffix]."""
    for verb in ("set", "delete"):
        prefix = f"{verb}_vrf_"
        if not name.startswith(prefix):
            continue
        rest = name[len(prefix) :]
        for proto in _PROTO_KEYS:
            if rest == proto:
                return verb, proto, None
            tagged = proto + "_"
            if rest.startswith(tagged):
                return verb, proto, rest[len(tagged) :]
    return None


class ArityError(ValueError):
    """Packed value does not match the global builder method's arity."""


def _call_with_packed_value(method: Callable[..., Any], value: Optional[str]) -> None:
    params = [p for p in inspect.signature(method).parameters if p != "self"]
    if not params:
        method()
        return
    if value is None:
        raise ArityError(f"{method.__name__} requires a value")
    if len(params) == 1:
        method(value)
        return
    parts = value.split(",", len(params) - 1)
    if len(parts) != len(params):
        raise ArityError(
            f"{method.__name__} expects {len(params)} comma-separated value(s), got {len(parts)}"
        )
    method(*parts)


def _mapper_path(
    mapper: Any,
    proto: str,
    suffix: str,
    vrf_name: str,
    value: Optional[str],
    verb: str,
) -> Optional[List[str]]:
    if verb == "delete":
        candidates = (
            f"get_{proto}_{suffix}_delete",
            f"get_{suffix}_delete",
            f"get_{proto}_{suffix}",
            f"get_{suffix}",
        )
    else:
        candidates = (
            f"get_{proto}_{suffix}",
            f"get_{suffix}",
        )
    for candidate in candidates:
        getter = getattr(mapper, candidate, None)
        if getter is None:
            continue
        params = [p for p in inspect.signature(getter).parameters if p != "self"]
        extra = max(len(params) - 1, 0)
        if extra == 0:
            return getter(vrf_name)
        if value is None:
            continue
        if extra == 1:
            return getter(vrf_name, value)
        parts = value.split(",", extra - 1)
        if len(parts) != extra:
            continue
        return getter(vrf_name, *parts)
    if verb == "delete":
        return _parent_node_delete_path(mapper, proto, suffix, vrf_name, value)
    return None


def _parent_node_delete_path(
    mapper: Any,
    proto: str,
    suffix: str,
    vrf_name: str,
    value: Optional[str],
) -> Optional[List[str]]:
    """UI number/select clear omits the leaf. Drop the last SET-path element."""
    getter = getattr(mapper, f"get_{proto}_{suffix}", None) or getattr(
        mapper, f"get_{suffix}", None
    )
    if getter is None:
        return None
    params = [p for p in inspect.signature(getter).parameters if p != "self"]
    extra = max(len(params) - 1, 0)
    if extra < 1:
        return None
    dummy = "_"
    try:
        if extra == 1:
            path = getter(vrf_name, dummy)
        else:
            if value is None:
                return None
            need = extra - 1
            tokens = [value] if need == 1 else value.split(",", need - 1)
            if len(tokens) != need:
                return None
            path = getter(vrf_name, *tokens, dummy)
    except TypeError:
        return None
    if not path:
        return None
    return path[:-1]


def _alias(proto: str, suffix: str) -> str:
    """Map one VRF suffix onto one global builder method name."""
    if proto == "static":
        if suffix.startswith("route6"):
            return "ipv6_route" + suffix[len("route6") :]
        if suffix == "route" or suffix.startswith("route_"):
            return "ipv4_" + suffix
    elif proto == "failover" and suffix.startswith("route_"):
        return suffix[len("route_") :]
    elif proto == "dhcp":
        if suffix == "disable":
            return "global_disable"
        if suffix == "subnet_lease_default":
            return "subnet_lease"
        if suffix.startswith("ha_"):
            return "failover_" + suffix[len("ha_") :]
    elif proto == "dhcpv6":
        if suffix == "subnet_vendor_option_cisco_tftp_server":
            return "subnet_cisco_tftp_server"
        if suffix == "subnet_lease_time_default":
            return "subnet_lease_default"
        if suffix == "subnet_lease_time_minimum":
            return "subnet_lease_minimum"
        if suffix == "subnet_lease_time_maximum":
            return "subnet_lease_maximum"
        if suffix.startswith("subnet_static_mapping"):
            return suffix[len("subnet_") :]
        if suffix.startswith("shared_network_"):
            return "network_" + suffix[len("shared_network_") :]
    return suffix


_LEAF_CLASSES = {
    "static": StaticExtraLeaves,
    "failover": FailoverExtraLeaves,
    "dhcp": DhcpExtraLeaves,
    "dhcpv6": Dhcpv6ExtraLeaves,
}


def _mode_key(proto: str, verb: str, suffix: Optional[str]) -> str:
    return f"{proto}:{verb}:{suffix or ''}"


def _leaf_name(verb: str, suffix: Optional[str]) -> str:
    if suffix is None:
        return "get_root" if verb == "set" else "get_root_delete"
    return f"get_{suffix}" if verb == "set" else f"get_{suffix}_delete"


def _feature_mapper_cls(proto: str):
    if proto == "dhcp":
        from vyos_mappers.dhcp.dhcp import DHCPMapper
        return DHCPMapper
    if proto == "dhcpv6":
        from vyos_mappers.dhcpv6_server.dhcpv6_server import DHCPv6ServerMapper
        return DHCPv6ServerMapper
    if proto == "static":
        from vyos_mappers.static_routes.static_routes import StaticRoutesMapper
        return StaticRoutesMapper
    from vyos_mappers.failover.failover import FailoverMapper
    return FailoverMapper


def _feature_op_exists(owner: Any, verb: str, proto: str, suffix: Optional[str]) -> bool:
    from .legacy_ops import LEGACY_OPS
    name = f"{verb}_vrf_{proto}" if not suffix else f"{verb}_vrf_{proto}_{suffix}"
    return name in LEGACY_OPS


def _install_prefix(inner: Any, prefix: List[str]) -> None:
    if getattr(inner, "mapper_key", None) and getattr(inner, "mappers", None) is not None:
        key = inner.mapper_key
        inner.mappers[key] = PathPrefixMapper(inner.mappers[key], prefix)
        return
    if hasattr(inner, "m"):
        inner.m = PathPrefixMapper(inner.m, prefix)


def _queue(owner: Any, inner: Any) -> Any:
    for op in inner.get_operations():
        owner._operations.append({"op": op["op"], "path": list(op.get("path") or [])})
    return owner


def _call_aliased(inner: Any, verb: str, proto: str, suffix: str, value: Optional[str]) -> None:
    method = getattr(inner, f"{verb}_{_alias(proto, suffix)}")
    _call_with_packed_value(method, value)


def _emit_leaf(
    inner: Any,
    proto: str,
    verb: str,
    suffix: Optional[str],
    vrf_name: str,
    value: Optional[str],
) -> bool:
    """Queue one leaf the global builder does not expose.

    PathPrefixMapper adds the VRF prefix. The feature builder then records
    that path with add_set or add_delete.
    """
    gname = _leaf_name(verb, suffix)
    raw = getattr(_LEAF_CLASSES[proto], gname, None)
    if raw is None:
        raw = getattr(_feature_mapper_cls(proto), gname, None)
    if raw is None:
        return False
    params = [p for p in inspect.signature(raw).parameters if p != "self"]
    if not params:
        args: tuple = ()
    else:
        if value is None:
            raise ArityError(f"{gname} requires a value")
        parts = [value] if len(params) == 1 else value.split(",", len(params) - 1)
        if len(parts) != len(params):
            raise ArityError(
                f"{gname} expects {len(params)} comma-separated value(s), got {len(parts)}"
            )
        args = tuple(parts)
    wrapped = inner.mappers[inner.mapper_key] if getattr(inner, "mappers", None) else inner.m
    if not hasattr(wrapped, gname):
        wrapped = PathPrefixMapper(_LEAF_CLASSES[proto](), ["vrf", "name", vrf_name])
    path = getattr(wrapped, gname)(*args)
    if verb == "set":
        inner.add_set(path)
    else:
        inner.add_delete(path)
    return True


def _drop_set_leaf(inner: Any, proto: str, suffix: str, value: Optional[str]) -> bool:
    method = getattr(inner, f"set_{_alias(proto, suffix)}")
    params = [p for p in inspect.signature(method).parameters if p != "self"]
    tokens = [] if value is None else value.split(",")
    if len(tokens) + 1 != len(params):
        raise ArityError(
            f"set_{_alias(proto, suffix)} expects {len(params) - 1} comma-separated value(s), got {len(tokens)}"
        )
    method(*tokens, "_")
    ops = inner.get_operations()
    inner._operations.clear()
    for op in ops:
        inner.add_delete(op["path"][:-1])
    return True


def _flip_set(inner: Any, proto: str, suffix: str, value: Optional[str]) -> None:
    method = getattr(inner, f"set_{_alias(proto, suffix)}")
    _call_with_packed_value(method, value)
    ops = list(inner.get_operations())
    inner._operations.clear()
    for op in ops:
        inner.add_delete(list(op["path"]))


def _emit_version_override(
    owner: Any,
    inner: Any,
    proto: str,
    verb: str,
    suffix: Optional[str],
    vrf_name: str,
    value: Optional[str],
) -> bool:
    """Use a version-merged VRF mapper override when that version defines one.

    The 1.4 class already returns [] for IPv4 next-hop segments and the
    tagged BFD source path. 1.5 defines the flat BFD source-address path.
    The builder does not inspect the version string.
    """
    if proto != "static" or not suffix:
        return False
    mapper = owner.mappers.get("vrf")
    if mapper is None:
        return False
    gname = "get_static_" + suffix + ("" if verb == "set" else "_delete")
    getter = getattr(mapper, gname, None)
    if getter is None:
        return False
    params = [p for p in inspect.signature(getter).parameters if p != "self"]
    extra = params[1:]
    if not extra:
        path = getter(vrf_name)
    else:
        if value is None:
            raise ArityError(f"{gname} requires a value")
        parts = [value] if len(extra) == 1 else value.split(",", len(extra) - 1)
        if len(parts) != len(extra):
            raise ArityError(
                f"{gname} expects {len(extra)} comma-separated value(s), got {len(parts)}"
            )
        path = getter(vrf_name, *parts)
    if path:
        if verb == "set":
            inner.add_set(path)
        else:
            inner.add_delete(path)
    return True


def _run_feature_op(
    owner: Any,
    verb: str,
    proto: str,
    suffix: Optional[str],
    vrf_name: str,
    value: Optional[str],
) -> Any:
    require_feature_version(proto, owner.version)
    inner = FEATURE_BUILDERS[proto](owner.version)
    _install_prefix(inner, ["vrf", "name", vrf_name])
    if _emit_version_override(owner, inner, proto, verb, suffix, vrf_name, value):
        return _queue(owner, inner)
    key = _mode_key(proto, verb, suffix)
    if suffix and key in DIRECT:
        _call_aliased(inner, verb, proto, suffix, value)
        return _queue(owner, inner)
    if suffix and key in FLIP:
        _flip_set(inner, proto, suffix, value)
        return _queue(owner, inner)
    if suffix and key in DROP:
        _drop_set_leaf(inner, proto, suffix, value)
        return _queue(owner, inner)
    if suffix:
        method = getattr(inner, f"{verb}_{_alias(proto, suffix)}", None)
        if method is not None:
            _call_with_packed_value(method, value)
            return _queue(owner, inner)
    if not _emit_leaf(inner, proto, verb, suffix, vrf_name, value):
        return owner
    return _queue(owner, inner)


def run_vrf_protocol_op(
    owner: Any,
    verb: str,
    proto: str,
    suffix: Optional[str],
    vrf_name: str,
    value: Optional[str] = None,
) -> Any:
    """Queue one VRF-prefixed feature op onto ``owner``."""
    if proto in FEATURE_BUILDERS:
        return _run_feature_op(owner, verb, proto, suffix, vrf_name, value)

    prefix = ["vrf", "name", vrf_name]
    if suffix is None:
        path = prefix + ["protocols", proto]
        return owner.add_set(path) if verb == "set" else owner.add_delete(path)

    inner = PROTOCOL_BUILDERS[proto](owner.version)
    inner_name = f"{verb}_{suffix}"
    method = getattr(inner, inner_name, None)
    if method is not None:
        try:
            _call_with_packed_value(method, value)
        except (TypeError, ArityError):
            if verb != "delete":
                raise
            method = None
        else:
            for op in inner.get_operations():
                path = op.get("path") or []
                owner._operations.append({"op": op["op"], "path": prefix + list(path)})
            return owner

    mapper = owner.mappers.get(f"vrf_{proto}")
    if mapper is not None:
        path = _mapper_path(mapper, proto, suffix, vrf_name, value, verb)
        if path is not None:
            return owner.add_set(path) if verb == "set" else owner.add_delete(path)

    raise AttributeError(inner_name)
