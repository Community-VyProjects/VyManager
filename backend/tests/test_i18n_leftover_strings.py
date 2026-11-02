"""Operator-visible leftovers go through t() and the catalog leaf.

The value sent to VyOS stays the token. A substring scan of a catalog is
not enough: another key can contain the same words.
"""

import json
from pathlib import Path

from tests.en_message import en_message

REPO = Path(__file__).resolve().parents[2]
MODAL = REPO / "frontend/src/components/webproxy/WebProxyTimePeriodModal.tsx"
CONTENT = REPO / "frontend/src/components/webproxy/WebProxyContent.tsx"
RELAY = REPO / "frontend/src/components/dhcp-relay/DHCPRelayModal.tsx"


def catalog_message(locale: str, catalog: str, key: str) -> str:
    path = REPO / "frontend" / "messages" / locale / catalog
    node = json.loads(path.read_text())
    for part in key.split("."):
        if not isinstance(node, dict) or part not in node:
            raise KeyError(f"{locale}/{catalog} has no {key}")
        node = node[part]
    if not isinstance(node, str):
        raise TypeError(f"{locale}/{catalog} {key} is not a string")
    return node


def test_webproxy_day_displays_use_catalog_keys():
    modal = MODAL.read_text()
    content = CONTENT.read_text()
    assert "t(`period.days.${key}`)" in modal
    assert 't("period.dayExists", { day: dayLabel(newDay) })' in modal
    assert "dayLabel(d.day)" in modal
    assert "{d.day}</span>" not in modal
    assert "t(`period.days.${key}`)" in content
    assert '`${d.day}${d.time' not in content
    assert en_message(REPO, "webproxy.json", "period.days.Sun") == "Sun"
    assert en_message(REPO, "webproxy.json", "period.days.weekdays") == "weekdays"
    assert en_message(REPO, "webproxy.json", "period.days.all") == "all"
    assert en_message(REPO, "webproxy.json", "period.dayExists") == 'Day "{day}" is already configured'
    assert catalog_message("zh-CN", "webproxy.json", "period.days.Sun") == "周日"
    assert catalog_message("zh-CN", "webproxy.json", "period.days.weekdays") == "工作日"
    assert catalog_message("zh-CN", "webproxy.json", "period.days.all") == "每天"


def test_relay_policy_token_stays_english():
    text = RELAY.read_text()
    assert '<span className="font-mono">{p.label}</span>' in text
    assert "t(`modal.policyLabels." not in text
    assert 't(`modal.policies.${p.value}`)' in text
    assert '{ value: "append", label: "Append" }' in text
    assert en_message(REPO, "dhcpRelay.json", "modal.policies.append") == "Append own relay options to packet"
    try:
        en_message(REPO, "dhcpRelay.json", "modal.policyLabels.append")
    except KeyError:
        missing = True
    else:
        missing = False
    assert missing
    try:
        catalog_message("zh-CN", "dhcpRelay.json", "modal.policyLabels.append")
    except KeyError:
        zh_missing = True
    else:
        zh_missing = False
    assert zh_missing


def test_dummy_type_tooltip_does_not_reuse_vlan_gloss():
    assert en_message(REPO, "dashboard.json", "interfaceStatistics.types.dummy") == "Dummy"
    dummy = catalog_message("zh-CN", "dashboard.json", "interfaceStatistics.types.dummy")
    vlan = catalog_message("zh-CN", "dashboard.json", "interfaceStatistics.types.vlan")
    assert dummy == "Dummy（哑接口）"
    assert vlan == "VLAN（虚拟）"
    assert dummy != vlan
    assert "(Dummy)" not in dummy


def test_leftover_strings_resolve_catalog_leaves():
    bgp = (REPO / "frontend/src/components/bgp/BgpContent.tsx").read_text()
    assert "afiNameKey(afi)" in bgp
    assert "t(`content.afiNames.${key}`)" in bgp
    assert "formatUnknownAfi(afi)" in bgp
    assert en_message(REPO, "bgp.json", "content.afiNames.ipv4-unicast") == "IPv4 Unicast"
    assert en_message(REPO, "bgp.json", "content.afiNames.l2vpn-evpn") == "L2VPN EVPN"
    assert catalog_message("zh-CN", "bgp.json", "content.afiNames.ipv4-unicast") == "IPv4 单播"
    assert catalog_message("zh-CN", "bgp.json", "content.afiNames.l2vpn-evpn") == "L2VPN EVPN"
    assert catalog_message("zh-CN", "bgp.json", "content.afiNames.ipv4-unicast") != en_message(
        REPO, "bgp.json", "content.afiNames.ipv4-unicast"
    )

    stats = (REPO / "frontend/src/components/dashboard/InterfaceStatisticsCard.tsx").read_text()
    assert 't(`interfaceStatistics.types.${meta.key}`)' in stats
    assert en_message(REPO, "dashboard.json", "interfaceStatistics.types.physicalEthernet") == "Physical (Ethernet)"
    assert catalog_message("zh-CN", "dashboard.json", "interfaceStatistics.types.physicalEthernet") == "物理（以太网）"
    assert catalog_message("zh-CN", "dashboard.json", "interfaceStatistics.types.other") == "其他"

    theme = (REPO / "frontend/src/components/ui/theme-selector.tsx").read_text()
    assert 't(`theme.names.${theme.id as BuiltInThemeId}`)' in theme
    assert en_message(REPO, "sharedUi.json", "theme.names.dark") == "Dark"
    assert catalog_message("zh-CN", "sharedUi.json", "theme.names.dark") == "深色"
    assert catalog_message("zh-CN", "sharedUi.json", "theme.names.emerald") == "翡翠"

    sla = (REPO / "frontend/src/components/sla/SLAContent.tsx").read_text()
    assert 't("content.owampFullName")' in sla
    assert 't("content.twampFullName")' in sla
    assert en_message(REPO, "sla.json", "content.owampFullName") == "One-Way Active Measurement Protocol"
    assert en_message(REPO, "sla.json", "content.twampFullName") == "Two-Way Active Measurement Protocol"
    assert catalog_message("zh-CN", "sla.json", "content.owampFullName") == "单向主动测量协议"
    assert catalog_message("zh-CN", "sla.json", "content.twampFullName") == "双向主动测量协议"

    vrf = (REPO / "frontend/src/components/ui/vrf-multi-select.tsx").read_text()
    assert 't("vrfMultiSelect.placeholder")' in vrf
    assert en_message(REPO, "sharedUi.json", "vrfMultiSelect.placeholder") == "Add VRF"
    assert catalog_message("zh-CN", "sharedUi.json", "vrfMultiSelect.placeholder") == "添加 VRF"

    layout = (REPO / "frontend/src/app/layout.tsx").read_text()
    assert 'getTranslations("sharedMisc")' in layout
    assert 't("appDescription")' in layout
    assert en_message(REPO, "sharedMisc.json", "appDescription") == "Professional VyOS Management Interface"
    assert catalog_message("zh-CN", "sharedMisc.json", "appDescription") == "专业的 VyOS 管理界面"
