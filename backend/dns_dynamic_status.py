"""Dynamic DNS operational status.

``ShowDynamicStatusDns`` is the typed GraphQL op for ``show dns dynamic status``
on both 1.4 and 1.5. It calls ``show_dynamic_status(raw=True)`` and normalizes
cache keys (``status-ipv4`` becomes ``status_ipv4``) before the response.
1.4 folds legacy ``ip`` / ``status`` cache keys into ``ipv4`` / ``ipv6`` inside
that script, so the typed op does not return them.

The result is one record per hostname, not per configured service name. The
config table joins on ``host-name``.
"""

import json
import logging
from typing import Any, List, Optional

import httpx
from pydantic import BaseModel

logger = logging.getLogger(__name__)

_UNCONFIGURED = "UnconfiguredSubsystem"


class DynamicDnsHostStatus(BaseModel):
    """One hostname from the ddclient cache."""

    host: str
    ipv4: Optional[str] = None
    ipv6: Optional[str] = None
    status_ipv4: Optional[str] = None
    status_ipv6: Optional[str] = None


class DynamicDnsStatusResponse(BaseModel):
    """Live dynamic DNS cache. ``available`` is false when the read was missed."""

    available: bool = True
    hosts: List[DynamicDnsHostStatus] = []


def dynamic_status_gql_query(key_literal: str) -> dict:
    """GraphQL body for ``ShowDynamicStatusDns``.

    ``key_literal`` must be a JSON-encoded API key (``json.dumps(key)``).
    Forwarding statistics are a different op and are not requested.
    """
    field = (
        "ShowDynamicStatusDns(data: {key: "
        + key_literal
        + "}) { success errors op_mode_error { name message } data { result } }"
    )
    return {"query": "{ " + field + " }"}


def _text(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _field(entry: dict, *keys: str) -> Optional[str]:
    for key in keys:
        if key in entry:
            text = _text(entry.get(key))
            if text is not None:
                return text
    return None


def parse_dynamic_dns_status(result: Any) -> List[DynamicDnsHostStatus]:
    """Parse ``ShowDynamicStatusDns`` ``data.result`` into host records.

    ``result`` is a list of dicts. Some deployments return that list as a
    JSON string. Empty address fields are absent, not a resolved IP. Rows
    without a hostname are dropped.
    """
    if isinstance(result, str):
        try:
            result = json.loads(result)
        except ValueError:
            return []
    if not isinstance(result, list):
        return []

    hosts: List[DynamicDnsHostStatus] = []
    for entry in result:
        if not isinstance(entry, dict):
            continue
        host = _field(entry, "host")
        if not host:
            continue
        hosts.append(
            DynamicDnsHostStatus(
                host=host,
                ipv4=_field(entry, "ipv4"),
                ipv6=_field(entry, "ipv6"),
                status_ipv4=_field(entry, "status_ipv4", "status-ipv4"),
                status_ipv6=_field(entry, "status_ipv6", "status-ipv6"),
            )
        )
    return hosts


def _from_node(node: dict) -> DynamicDnsStatusResponse:
    if not node.get("success"):
        error = node.get("op_mode_error") or {}
        if error.get("name") == _UNCONFIGURED:
            return DynamicDnsStatusResponse(available=True, hosts=[])
        logger.warning("ShowDynamicStatusDns op failed: %s", node.get("errors"))
        return DynamicDnsStatusResponse(available=False)
    result = (node.get("data") or {}).get("result")
    return DynamicDnsStatusResponse(available=True, hosts=parse_dynamic_dns_status(result))


async def fetch_dynamic_dns_status(service) -> DynamicDnsStatusResponse:
    """Fetch the ddclient cache. A timeout or transport failure is a missed sample.

    ``available`` is false and ``hosts`` is empty. The caller keeps the last
    sample. An unconfigured service is an empty cache, not a miss.
    """
    api_key = str(service.config.apikey)
    url = f"{service.config.protocol}://{service.config.hostname}:{service.config.port}/graphql"
    payload = dynamic_status_gql_query(json.dumps(api_key))
    try:
        async with httpx.AsyncClient(verify=service.config.verify, timeout=15.0) as client:
            resp = await client.post(url, json=payload, auth=("vyos", api_key))
        if resp.status_code != 200:
            logger.warning("ShowDynamicStatusDns HTTP error %d", resp.status_code)
            return DynamicDnsStatusResponse(available=False)
        body = resp.json()
        if body.get("errors"):
            logger.warning("ShowDynamicStatusDns field errors: %s", body["errors"])
        node = (body.get("data") or {}).get("ShowDynamicStatusDns") or {}
        return _from_node(node)
    except Exception as exc:
        if isinstance(exc, httpx.TimeoutException):
            logger.warning("ShowDynamicStatusDns fetch timed out")
        else:
            logger.exception("ShowDynamicStatusDns fetch failed")
        return DynamicDnsStatusResponse(available=False)
