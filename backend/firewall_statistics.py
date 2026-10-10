"""Firewall rule counters from ``show firewall statistics``.

VyOS has no typed GraphQL op for firewall counters. Both 1.4 and 1.5 expose
them only as the text table behind ``Show(path: ["firewall", "statistics"])``.
"""

import json
import logging
import re
from typing import List, Optional

import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

FIREWALL_STATS_INTEREST = "firewall-statistics"
TOP_FIREWALL_HITS = 10

_RULESET_HEADER = re.compile(r'^(ipv4|ipv6|bridge) Firewall "([^"]+)"\s*$')
_DASH_RUN = re.compile(r"-{2,}")


class FirewallRuleCounter(BaseModel):
    """One ruleset rule, including the chain default-action counter."""

    family: str
    chain: str
    custom: bool
    rule: str
    action: str
    packets: int
    bytes: int


class FirewallStatisticsResponse(BaseModel):
    rules: List[FirewallRuleCounter] = Field(default_factory=list)


class FirewallHitsResponse(BaseModel):
    """Dashboard payload: busiest rules, ranked by packets."""

    hits: List[FirewallRuleCounter] = Field(default_factory=list)
    total: int = 0


def firewall_gql_fields(key_literal: str) -> List[str]:
    """GraphQL alias for ``show firewall statistics``.

    ``key_literal`` must already be ``json.dumps(api_key)``.
    """
    return [
        "FirewallStatistics: Show(data: {"
        f"key: {key_literal}, path: [\"firewall\", \"statistics\"]"
        "}) { success errors data { result } }"
    ]


def chain_key(quoted: str) -> tuple[str, bool]:
    """Map a statistics header (``forward filter``, ``name LAN``) to a UI chain.

    Custom rulesets are ``name <chain>``. Base chains are ``<hook> <priority>``;
    prerouting raw is the UI id ``prerouting_raw``.
    """
    hook, _, prior = quoted.partition(" ")
    if hook == "name":
        return prior, True
    if hook == "prerouting" and prior == "raw":
        return "prerouting_raw", False
    return hook, False


def _dash_only(line: str) -> bool:
    stripped = line.strip()
    return bool(stripped) and set(stripped) <= {"-"}


def _column_starts(separator: str) -> List[int]:
    return [match.start() for match in _DASH_RUN.finditer(separator)]


def _cells(line: str, starts: List[int]) -> List[str]:
    cells: List[str] = []
    for index, start in enumerate(starts):
        end = starts[index + 1] if index + 1 < len(starts) else None
        if start >= len(line):
            cells.append("")
            continue
        chunk = line[start:] if end is None else line[start:end]
        cells.append(chunk.strip())
    return cells


def _parse_int(value: str) -> Optional[int]:
    if not value or not value.isdigit():
        return None
    return int(value)


def _parse_table(lines: List[str], start: int, family: str, chain: str, custom: bool) -> tuple[List[FirewallRuleCounter], int]:
    """Parse one ruleset table. Returns counters and the index after the table."""
    header_at = None
    for index in range(start, len(lines)):
        stripped = lines[index].strip()
        if _RULESET_HEADER.match(stripped) or (header_at is None and _dash_only(lines[index]) and index > start):
            return [], index
        if stripped.startswith("Rule") and index + 1 < len(lines):
            header_at = index
            break
        if stripped.startswith("State"):
            return [], index
    if header_at is None:
        return [], start

    separator = lines[header_at + 1]
    starts = _column_starts(separator)
    if len(starts) < 3:
        return [], header_at + 1

    headers = _cells(lines[header_at], starts)
    try:
        rule_idx = headers.index("Rule")
        packets_idx = headers.index("Packets")
        bytes_idx = headers.index("Bytes")
        action_idx = headers.index("Action")
    except ValueError:
        return [], header_at + 2

    rules: List[FirewallRuleCounter] = []
    index = header_at + 2
    while index < len(lines):
        line = lines[index]
        if not line.strip() or _dash_only(line) or _RULESET_HEADER.match(line.strip()):
            break
        cells = _cells(line, starts)
        if max(rule_idx, packets_idx, bytes_idx, action_idx) >= len(cells):
            index += 1
            continue
        rule_id = cells[rule_idx]
        packets = _parse_int(cells[packets_idx])
        byte_count = _parse_int(cells[bytes_idx])
        action = cells[action_idx]
        if rule_id in ("default",) or rule_id.isdigit():
            if packets is not None and byte_count is not None and action:
                rules.append(FirewallRuleCounter(
                    family=family,
                    chain=chain,
                    custom=custom,
                    rule=rule_id,
                    action=action,
                    packets=packets,
                    bytes=byte_count,
                ))
        index += 1
    return rules, index


def parse_firewall_statistics(text: str) -> FirewallStatisticsResponse:
    """Parse ``show firewall statistics`` text into per-rule counters.

    State-policy sections are not rules and are ignored. Disabled rules are
    absent from the VyOS table; callers should treat a missing row as "no
    live counter", not as zero.
    """
    lines = (text or "").splitlines()
    rules: List[FirewallRuleCounter] = []
    index = 0
    while index < len(lines):
        match = _RULESET_HEADER.match(lines[index].strip())
        if not match:
            index += 1
            continue
        family, quoted = match.group(1), match.group(2)
        chain, custom = chain_key(quoted)
        parsed, index = _parse_table(lines, index + 1, family, chain, custom)
        rules.extend(parsed)
    return FirewallStatisticsResponse(rules=rules)


def top_firewall_hits(stats: FirewallStatisticsResponse, limit: int = TOP_FIREWALL_HITS) -> FirewallHitsResponse:
    """Rules with at least one packet, busiest first."""
    ranked = [rule for rule in stats.rules if rule.packets > 0]
    ranked.sort(key=lambda rule: (rule.packets, rule.bytes), reverse=True)
    return FirewallHitsResponse(hits=ranked[:limit], total=len(ranked))


def zone_chain_names(config: Optional[dict]) -> dict[str, set[str]]:
    """Named chains referenced by ``firewall zone``, split by family.

    VyOS keeps ``firewall name`` and ``firewall ipv6-name`` in separate
    namespaces, so a shared string is not the same chain.
    """
    zones = ((config or {}).get("firewall") or {}).get("zone") or {}
    names = {"ipv4": set(), "ipv6": set()}

    def walk(node: object) -> None:
        if not isinstance(node, dict):
            return
        firewall = node.get("firewall")
        if isinstance(firewall, dict):
            ipv4_name = firewall.get("name")
            ipv6_name = firewall.get("ipv6-name")
            if isinstance(ipv4_name, str) and ipv4_name:
                names["ipv4"].add(ipv4_name)
            if isinstance(ipv6_name, str) and ipv6_name:
                names["ipv6"].add(ipv6_name)
        for child in node.values():
            if isinstance(child, dict):
                walk(child)

    if isinstance(zones, dict):
        walk(zones)
    return names


def visible_firewall_rules(
    rules: List[FirewallRuleCounter],
    *,
    policies: bool,
    zones: bool,
    bridge: bool,
    zone_chains: Optional[dict] = None,
) -> List[FirewallRuleCounter]:
    """Keep only counters the caller can already read as config.

    Policies covers every IPv4 and IPv6 ruleset, including named chains.
    Zones alone covers only named chains that zone config references for
    that family. Bridge covers the bridge family and nothing else.
    """
    allowed = zone_chains or {}
    visible: List[FirewallRuleCounter] = []
    for rule in rules:
        if rule.family == "bridge":
            if bridge:
                visible.append(rule)
            continue
        if rule.family not in ("ipv4", "ipv6"):
            continue
        if not rule.custom:
            if policies:
                visible.append(rule)
            continue
        family_chains = allowed.get(rule.family) or set()
        if policies or (zones and rule.chain in family_chains):
            visible.append(rule)
    return visible


def filter_firewall_statistics(
    stats: FirewallStatisticsResponse,
    *,
    policies: bool,
    zones: bool,
    bridge: bool,
    zone_chains: Optional[dict] = None,
) -> FirewallStatisticsResponse:
    return FirewallStatisticsResponse(
        rules=visible_firewall_rules(
            stats.rules,
            policies=policies,
            zones=zones,
            bridge=bridge,
            zone_chains=zone_chains,
        )
    )


def firewall_hits_for_viewer(
    data: dict,
    *,
    policies: bool,
    zones: bool,
    bridge: bool,
) -> dict:
    """Rank a shared statistics snapshot for one subscriber.

    The broadcaster fans one payload to every dashboard client. Filtering
    happens here so a zones-only viewer never receives policy or bridge rows,
    and their own hits are ranked after that cut rather than taken from the
    global top ten.
    """
    raw_rules = (data or {}).get("rules") or []
    stats = FirewallStatisticsResponse(rules=raw_rules)
    raw_chains = (data or {}).get("zone_chains") or {}
    zone_chains = {"ipv4": set(), "ipv6": set()}
    if isinstance(raw_chains, dict):
        for family in ("ipv4", "ipv6"):
            zone_chains[family] = {name for name in (raw_chains.get(family) or []) if isinstance(name, str)}
    filtered = filter_firewall_statistics(
        stats,
        policies=policies,
        zones=zones,
        bridge=bridge,
        zone_chains=zone_chains,
    )
    return top_firewall_hits(filtered).model_dump()


async def fetch_firewall_statistics_text(service) -> Optional[str]:
    """Fetch the statistics table. ``None`` means the query failed.

    An empty ruleset is a successful string (often just the header), not None.
    """
    api_key = str(service.config.apikey)
    url = f"{service.config.protocol}://{service.config.hostname}:{service.config.port}/graphql"
    payload = {"query": "{ " + " ".join(firewall_gql_fields(json.dumps(api_key))) + " }"}
    try:
        async with httpx.AsyncClient(verify=service.config.verify, timeout=20.0) as client:
            resp = await client.post(url, json=payload, auth=("vyos", api_key))
        if resp.status_code != 200:
            logger.error("GraphQL firewall statistics HTTP error %d", resp.status_code)
            return None
        body = resp.json()
        if body.get("errors"):
            logger.warning("GraphQL firewall statistics errors: %s", body["errors"])
        node = (body.get("data") or {}).get("FirewallStatistics") or {}
        if node.get("success") is False:
            logger.warning("GraphQL firewall statistics op failed: %s", node.get("errors"))
            return None
        result = (node.get("data") or {}).get("result")
        if not isinstance(result, str):
            return None
        return result
    except Exception:
        logger.exception("GraphQL firewall statistics fetch failed")
        return None
