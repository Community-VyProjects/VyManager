"""PPPoE session conntrack via GraphQL ShowConntrack.

`show conntrack` is incomplete. ShowConntrack(family: inet|inet6) is the
op-mode table dump on 1.4 and 1.5. Result is structured flow dicts, not a
text table.
"""

from __future__ import annotations

import ipaddress
import json
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class ConntrackUnavailable(Exception):
    """GraphQL ShowConntrack failed."""


def conntrack_family(ip: str) -> str:
    return "inet6" if ipaddress.ip_interface(ip).version == 6 else "inet"


def show_conntrack_query(api_key: str, family: str) -> str:
    if family not in ("inet", "inet6"):
        raise ValueError("conntrack family must be inet or inet6")
    key = json.dumps(api_key)
    return (
        "{ ShowConntrack(data: {key: "
        + key
        + ", family: "
        + family
        + "}) { success errors data { result } } }"
    )


def _endpoint(meta: list[dict], direction: str) -> tuple[str, str, str]:
    for item in meta:
        if item.get("direction") != direction:
            continue
        layer3 = item.get("layer3") or {}
        layer4 = item.get("layer4") or {}
        src = str(layer3.get("src") or "")
        dst = str(layer3.get("dst") or "")
        sport = layer4.get("sport")
        dport = layer4.get("dport")
        proto = str(layer4.get("protoname") or "")
        src_fmt = f"{src}:{sport}" if sport else src
        dst_fmt = f"{dst}:{dport}" if dport else dst
        return src_fmt, dst_fmt, proto
    return "", "", ""


def flow_touches_ip(flow: dict, address: str) -> bool:
    for item in flow.get("meta") or []:
        layer3 = item.get("layer3") or {}
        if layer3.get("src") == address or layer3.get("dst") == address:
            return True
    return False


def format_flow(flow: dict) -> str:
    meta = flow.get("meta") or []
    orig_src, orig_dst, proto = _endpoint(meta, "original")
    reply_src, reply_dst, _ = _endpoint(meta, "reply")
    independent = next((item for item in meta if item.get("direction") == "independent"), {})
    fid = independent.get("id", "")
    state = independent.get("state", "")
    timeout = independent.get("timeout", "")
    mark = independent.get("mark", "")
    zone = independent.get("zone", "")
    return (
        f"{fid}  {orig_src}  {orig_dst}  {reply_src}  {reply_dst}  "
        f"{proto}  {state}  {timeout}  {mark}  {zone}"
    ).strip()


def parse_conntrack_result(result: Any, address: str) -> list[str]:
    if isinstance(result, str):
        try:
            result = json.loads(result)
        except json.JSONDecodeError:
            return [line.strip() for line in result.splitlines() if address in line]
    if not isinstance(result, dict):
        return []
    conntrack = result.get("conntrack") or {}
    if conntrack.get("error"):
        return []
    flows = conntrack.get("flow") or []
    if isinstance(flows, dict):
        flows = [flows]
    lines = []
    for flow in flows:
        if isinstance(flow, dict) and flow_touches_ip(flow, address):
            lines.append(format_flow(flow))
    return lines


def connections_from_graphql_body(body: dict, address: str) -> list[str]:
    if body.get("errors"):
        raise ConntrackUnavailable("VyOS reported an error")
    node = (body.get("data") or {}).get("ShowConntrack") or {}
    if not node.get("success"):
        errs = node.get("errors") or []
        raise ConntrackUnavailable(
            "; ".join(str(e) for e in errs) if errs else "Unable to read conntrack entries"
        )
    result = (node.get("data") or {}).get("result")
    return parse_conntrack_result(result, address)


async def fetch_session_connections(service, ip: str) -> list[str]:
    address = str(ipaddress.ip_interface(ip).ip)
    family = conntrack_family(ip)
    api_key = str(service.config.apikey)
    url = f"{service.config.protocol}://{service.config.hostname}:{service.config.port}/graphql"
    query = show_conntrack_query(api_key, family)
    try:
        async with httpx.AsyncClient(verify=service.config.verify, timeout=15.0) as client:
            resp = await client.post(url, json={"query": query}, auth=("vyos", api_key))
    except Exception as exc:
        logger.exception("ShowConntrack request failed")
        raise ConntrackUnavailable("VyOS GraphQL request failed") from exc
    if resp.status_code != 200:
        raise ConntrackUnavailable("VyOS GraphQL request failed")
    return connections_from_graphql_body(resp.json(), address)
