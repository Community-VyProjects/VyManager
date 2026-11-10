"""Service screens live under components/service."""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SERVICE = REPO / "frontend/src/components/service"

FEATURES = (
    (
        "ssh",
        REPO / "frontend/src/app/(dashboard)/service/ssh/page.tsx",
        "SSHContent",
        ("SSHContent.tsx", "SSHAlgorithmsModal.tsx", "SSHAuthenticationModal.tsx"),
    ),
    (
        "snmp",
        REPO / "frontend/src/app/(dashboard)/service/snmp/page.tsx",
        "SNMPContent",
        ("SNMPContent.tsx", "SNMPCommunityModal.tsx", "SNMPv3UserModal.tsx"),
    ),
    (
        "lldp",
        REPO / "frontend/src/app/(dashboard)/service/lldp/page.tsx",
        "LLDPContent",
        ("LLDPContent.tsx", "LLDPSettingsModal.tsx", "LLDPInterfaceModal.tsx"),
    ),
    (
        "tftp-server",
        REPO / "frontend/src/app/(dashboard)/service/tftp-server/page.tsx",
        "TFTPServerContent",
        ("TFTPServerContent.tsx", "TFTPServerGeneralModal.tsx", "TFTPServerListenAddressModal.tsx"),
    ),
    (
        "dns-forwarding",
        REPO / "frontend/src/app/service/dns-forwarding/page.tsx",
        "DNSForwardingContent",
        ("DNSForwardingContent.tsx", "DNSForwardingSettingsModal.tsx", "DNSForwardingDomainModal.tsx"),
    ),
    (
        "broadcast-relay",
        REPO / "frontend/src/app/service/broadcast-relay/page.tsx",
        "BroadcastRelayContent",
        (
            "BroadcastRelayContent.tsx",
            "BroadcastRelayInstanceModal.tsx",
            "DeleteBroadcastRelayInstanceModal.tsx",
        ),
    ),
    (
        "config-sync",
        REPO / "frontend/src/app/service/config-sync/page.tsx",
        "ConfigSyncContent",
        ("ConfigSyncContent.tsx", "ConfigSyncModal.tsx"),
    ),
    (
        "conntrack-sync",
        REPO / "frontend/src/app/service/conntrack-sync/page.tsx",
        "ConntrackSyncContent",
        ("ConntrackSyncContent.tsx", "ConntrackSyncModal.tsx"),
    ),
    (
        "console-server",
        REPO / "frontend/src/app/service/console-server/page.tsx",
        "ConsoleServerContent",
        ("ConsoleServerContent.tsx", "ConsoleServerModal.tsx"),
    ),
    (
        "dhcp-relay",
        REPO / "frontend/src/app/(dashboard)/service/dhcp-relay/page.tsx",
        "DHCPRelayContent",
        ("DHCPRelayContent.tsx", "DHCPRelayModal.tsx"),
    ),
    (
        "dhcpv6-relay",
        REPO / "frontend/src/app/(dashboard)/service/dhcpv6-relay/page.tsx",
        "DHCPv6RelayContent",
        ("DHCPv6RelayContent.tsx", "DHCPv6RelayModal.tsx"),
    ),
    (
        "dhcpv6-server",
        REPO / "frontend/src/app/service/dhcpv6-server/page.tsx",
        "DHCPv6ServerContent",
        ("DHCPv6ServerContent.tsx", "DHCPv6ServerGlobalModal.tsx"),
    ),
    (
        "dns-dynamic",
        REPO / "frontend/src/app/service/dns-dynamic/page.tsx",
        "DNSDynamicContent",
        ("DNSDynamicContent.tsx", "DNSDynamicEntryModal.tsx"),
    ),
    (
        "event-handler",
        REPO / "frontend/src/app/service/event-handler/page.tsx",
        "EventHandlerContent",
        ("EventHandlerContent.tsx", "EventHandlerEventModal.tsx"),
    ),
    (
        "https",
        REPO / "frontend/src/app/service/https/page.tsx",
        "HTTPSContent",
        ("HTTPSContent.tsx", "HTTPSModal.tsx"),
    ),
    (
        "ndp-proxy",
        REPO / "frontend/src/app/(dashboard)/service/ndp-proxy/page.tsx",
        "NdpProxyContent",
        ("NdpProxyContent.tsx", "NdpProxyInterfaceModal.tsx"),
    ),
    (
        "pppoe-server",
        REPO / "frontend/src/app/service/pppoe-server/page.tsx",
        "SessionLabelRegistryDialog",
        ("SessionLabelRegistryDialog.tsx", "PPPoEStatsChart.tsx", "index.ts"),
    ),
    (
        "router-advert",
        REPO / "frontend/src/app/(dashboard)/service/router-advert/page.tsx",
        "RouterAdvertContent",
        ("RouterAdvertContent.tsx", "RouterAdvertInterfaceModal.tsx"),
    ),
    (
        "salt-minion",
        REPO / "frontend/src/app/(dashboard)/service/salt-minion/page.tsx",
        "SaltMinionContent",
        ("SaltMinionContent.tsx", "SaltMinionSettingsModal.tsx"),
    ),
    (
        "sla",
        REPO / "frontend/src/app/(dashboard)/service/sla/page.tsx",
        "SLAContent",
        ("SLAContent.tsx", "SLASettingsModal.tsx"),
    ),
    (
        "suricata",
        REPO / "frontend/src/app/(dashboard)/service/suricata/page.tsx",
        "SuricataContent",
        ("SuricataContent.tsx", "SuricataEditor.tsx"),
    ),
    (
        "webproxy",
        REPO / "frontend/src/app/service/webproxy/page.tsx",
        "WebProxyContent",
        ("WebProxyContent.tsx", "WebProxySettingsModal.tsx"),
    ),
)


def test_named_service_screens_left_the_sibling_directories():
    for feature, _page, _symbol, _files in FEATURES:
        assert not (REPO / "frontend/src/components" / feature).exists()


def test_named_service_screens_live_under_service():
    for feature, _page, _symbol, files in FEATURES:
        for name in files:
            assert (SERVICE / feature / name).exists(), name


def test_named_service_pages_import_screens_from_service():
    for feature, page, symbol, _files in FEATURES:
        text = page.read_text()
        assert f'from "@/components/service/{feature}/{symbol}"' in text
        assert f'from "@/components/{feature}' not in text


def test_ipoe_server_screens_live_under_service():
    assert not (REPO / "frontend/src/components/ipoe-server").exists()
    assert (SERVICE / "ipoe-server" / "index.ts").exists()
    text = (REPO / "frontend/src/app/service/ipoe-server/page.tsx").read_text()
    assert 'from "@/components/service/ipoe-server"' in text
    assert 'from "@/components/ipoe-server"' not in text


def test_pppoe_page_imports_the_barrel_from_service():
    text = (REPO / "frontend/src/app/service/pppoe-server/page.tsx").read_text()
    assert '} from "@/components/service/pppoe-server";' in text


def test_pppoe_dashboard_card_imports_chart_from_service():
    text = (REPO / "frontend/src/components/dashboard/PppoeStatsCard.tsx").read_text()
    assert 'from "@/components/service/pppoe-server/PPPoEStatsChart"' in text
    assert 'from "@/components/pppoe-server' not in text


def test_service_monitoring_screens_live_under_service():
    assert not (REPO / "frontend/src/components/service-monitoring").exists()
    assert (REPO / "frontend/src/components/monitoring").is_dir()
    assert (SERVICE / "monitoring" / "ServiceMonitoringContent.tsx").exists()
    text = (REPO / "frontend/src/app/(dashboard)/service/monitoring/page.tsx").read_text()
    assert 'from "@/components/service/monitoring/ServiceMonitoringContent"' in text
    assert "service-monitoring" not in text
