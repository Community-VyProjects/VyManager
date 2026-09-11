"""Reuse global protocol builders under a VRF path prefix.

VRF protocol configuration is the same command tree as the global protocol,
with ``vrf name <vrf>`` in front. Path existence stays in the protocol mapper.
This module is the only place VRF builders learn that prefix.
"""

from __future__ import annotations

import inspect
from typing import Any, Callable, List, Optional, Tuple

from vyos_builders.bgp.bgp_batch_builder import BgpBatchBuilder
from vyos_builders.isis.isis_batch_builder import IsisBatchBuilder
from vyos_builders.ospf.ospf_batch_builder import OspfBatchBuilder
from vyos_builders.ospfv3.ospfv3_batch_builder import Ospfv3BatchBuilder

# Longest name first so "ospfv3" is not parsed as "ospf".
PROTOCOL_BUILDERS = {
    "ospfv3": Ospfv3BatchBuilder,
    "ospf": OspfBatchBuilder,
    "isis": IsisBatchBuilder,
    "bgp": BgpBatchBuilder,
}
_PROTO_KEYS = tuple(sorted(PROTOCOL_BUILDERS, key=len, reverse=True))


def vrf_protocol_op_exists(owner: Any, verb: str, proto: str, suffix: Optional[str]) -> bool:
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
    return None


def run_vrf_protocol_op(
    owner: Any,
    verb: str,
    proto: str,
    suffix: Optional[str],
    vrf_name: str,
    value: Optional[str] = None,
) -> Any:
    """Queue one VRF-prefixed protocol op onto ``owner``."""
    prefix = ["vrf", "name", vrf_name]
    if suffix is None:
        path = prefix + ["protocols", proto]
        return owner.add_set(path) if verb == "set" else owner.add_delete(path)

    inner = PROTOCOL_BUILDERS[proto](owner.version)
    inner_name = f"{verb}_{suffix}"
    method = getattr(inner, inner_name, None)
    if method is not None:
        _call_with_packed_value(method, value)
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
