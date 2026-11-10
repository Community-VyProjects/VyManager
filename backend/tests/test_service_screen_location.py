"""SSH, SNMP, LLDP, TFTP server, DNS forwarding, broadcast relay, config sync, conntrack sync, and console server screens live under components/service."""

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
        assert f'from "@/components/{feature}/' not in text
