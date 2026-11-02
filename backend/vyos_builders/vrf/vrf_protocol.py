"""Reuse global feature builders under a VRF path prefix.

VRF configuration is the same command tree as the global feature, with
``vrf name <vrf>`` in front. Path existence stays in the mapper. The prefix
is applied by :class:`PathPrefixMapper`, not by a second handwritten builder.
This module is the only place VRF builders learn that prefix.
"""

from __future__ import annotations

import inspect
from typing import Any, Callable, Dict, List, Optional, Tuple

from vyos_builders.bgp.bgp_batch_builder import BgpBatchBuilder
from vyos_builders.dhcp.dhcp import DHCPBatchBuilder
from vyos_builders.dhcpv6_server.dhcpv6_server_batch_builder import DHCPv6ServerBatchBuilder
from vyos_builders.failover.failover_batch_builder import FailoverBatchBuilder
from vyos_builders.isis.isis_batch_builder import IsisBatchBuilder
from vyos_builders.ospf.ospf_batch_builder import OspfBatchBuilder
from vyos_builders.ospfv3.ospfv3_batch_builder import Ospfv3BatchBuilder
from vyos_builders.static_routes.static_routes_batch_builder import StaticRoutesBatchBuilder
from vyos_mappers.path_prefix import PathPrefixMapper

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
_FEATURE_ROOT_SET = frozenset({"dhcp", "dhcpv6"})
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


def _call_with_packed_value(method: Callable[..., Any], value: Optional[str]) -> None:
    params = [p for p in inspect.signature(method).parameters if p != "self"]
    if not params:
        method()
        return
    if value is None:
        raise TypeError(f"{method.__name__} requires a value")
    if len(params) == 1:
        method(value)
        return
    extra = len(params)
    parts = value.split(",", extra - 1)
    if len(parts) != extra:
        raise TypeError(
            f"{method.__name__} expects {extra} comma-separated value(s), got {len(parts)}"
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


def _feature_method_names(proto: str, suffix: str) -> List[str]:
    """Global builder suffixes for a VRF op suffix. Structural renames only."""
    names: List[str] = []
    if proto == "static":
        if suffix.startswith("route6"):
            names.append("ipv6_route" + suffix[len("route6") :])
        elif suffix == "route" or suffix.startswith("route_"):
            names.append("ipv4_" + suffix)
    elif proto == "failover" and suffix.startswith("route_"):
        names.append(suffix[len("route_") :])
    elif proto == "dhcp":
        if suffix == "disable":
            names.append("global_disable")
        if suffix.startswith("ha_"):
            names.append("failover_" + suffix[len("ha_") :])
    elif proto == "dhcpv6" and suffix.startswith("shared_network_"):
        names.append("network_" + suffix[len("shared_network_") :])
    if suffix not in names:
        names.append(suffix)
    return names


def _feature_op_exists(owner: Any, verb: str, proto: str, suffix: Optional[str]) -> bool:
    mapper = owner.mappers.get(f"vrf_{proto}")
    if mapper is None:
        return False
    if suffix is None:
        if verb == "set" and proto not in _FEATURE_ROOT_SET:
            return False
        return hasattr(mapper, f"get_{proto}")
    return any(
        hasattr(mapper, candidate)
        for candidate in (
            f"get_{proto}_{suffix}",
            f"get_{suffix}",
            f"get_{proto}_{suffix}_delete",
        )
    )


def _feature_mapper_ops(
    owner: Any,
    verb: str,
    proto: str,
    suffix: Optional[str],
    vrf_name: str,
    value: Optional[str],
) -> Optional[List[Dict[str, Any]]]:
    mapper = owner.mappers.get(f"vrf_{proto}")
    if mapper is None:
        return None
    op = "set" if verb == "set" else "delete"
    if suffix is None:
        getter = getattr(mapper, f"get_{proto}", None)
        if getter is None:
            return None
        return [{"op": op, "path": getter(vrf_name)}]
    path = _mapper_path(mapper, proto, suffix, vrf_name, value, verb)
    if path is None:
        return None
    return [{"op": op, "path": path}]


def _install_prefix(inner: Any, prefix: List[str]) -> None:
    if getattr(inner, "mapper_key", None) and getattr(inner, "mappers", None) is not None:
        key = inner.mapper_key
        inner.mappers[key] = PathPrefixMapper(inner.mappers[key], prefix)
        return
    if hasattr(inner, "m"):
        inner.m = PathPrefixMapper(inner.m, prefix)


def _try_feature_builder(
    owner: Any,
    verb: str,
    proto: str,
    suffix: str,
    vrf_name: str,
    value: Optional[str],
    mapped_ops: List[Dict[str, Any]],
) -> Optional[List[Dict[str, Any]]]:
    """Call the global builder when its prefixed paths match the mapper."""
    if not mapped_ops:
        return None
    inner_cls = FEATURE_BUILDERS[proto]
    prefix = ["vrf", "name", vrf_name]
    for method_suffix in _feature_method_names(proto, suffix):
        method_name = f"{verb}_{method_suffix}"
        if not hasattr(inner_cls, method_name):
            continue
        inner = inner_cls(owner.version)
        _install_prefix(inner, prefix)
        method = getattr(inner, method_name)
        try:
            _call_with_packed_value(method, value)
        except (TypeError, ValueError):
            continue
        ops = [
            {"op": op["op"], "path": list(op.get("path") or [])}
            for op in inner.get_operations()
        ]
        if ops == mapped_ops:
            return ops
    return None


def _run_feature_op(
    owner: Any,
    verb: str,
    proto: str,
    suffix: Optional[str],
    vrf_name: str,
    value: Optional[str],
) -> Any:
    mapped = _feature_mapper_ops(owner, verb, proto, suffix, vrf_name, value)
    if mapped is None:
        # A packed value with the wrong arity was a silent no-op in the mixins.
        # Unknown ops never get here: vrf_protocol_op_exists already rejected them.
        return owner
    chosen = mapped
    if suffix is not None:
        global_ops = _try_feature_builder(owner, verb, proto, suffix, vrf_name, value, mapped)
        if global_ops is not None:
            chosen = global_ops
    for op in chosen:
        owner._operations.append(op)
    return owner


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
        except TypeError:
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
