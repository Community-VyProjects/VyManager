"""VyOS 1.5 DHCP server mapper.

On 1.5 (Kea) the subnet and shared-network options sit under ``option`` and
the static-mapping hardware address is ``mac``. These leaves exist only here:
``subnet-id``, ``listen-interface``, ``subnet disable``, static-mapping
``duid`` and ``description``, high-availability ``certificate`` and
``ca-certificate``, the Kea ``dynamic-dns-update`` children, and
``client-class``.
"""
import re
from typing import List

from ..dhcp import DHCPMapper

_CLIENT_CLASS_NAME = re.compile(r"^[-_a-zA-Z0-9][\w\-\.\+]*$")


class DHCPMapperV1_5(DHCPMapper):
    """VyOS 1.5 DHCP server mapper."""

    OPTION_PREFIX = ("option",)
    MAC_LEAF = "mac"
    CATALOG_KEY = "1.5"
    # 1.5 GraphQL ClearDhcpServerLeaseDhcp clears any lease state.
    CLEARS_INACTIVE_LEASES = True

    # ==================== Global ====================

    def get_listen_interface(self, interface: str) -> List[str]:
        return ["service", "dhcp-server", "listen-interface", interface]

    def get_listen_interface_path(self, interface: str) -> List[str]:
        return ["service", "dhcp-server", "listen-interface", interface]

    # ==================== Subnet ====================

    def get_subnet_subnet_id(self, network_name: str, subnet: str, subnet_id: int) -> List[str]:
        return self.get_subnet(network_name, subnet) + ["subnet-id", str(subnet_id)]

    def get_subnet_disable(self, network_name: str, subnet: str) -> List[str]:
        return self.get_subnet(network_name, subnet) + ["disable"]

    def get_subnet_disable_path(self, network_name: str, subnet: str) -> List[str]:
        return self.get_subnet(network_name, subnet) + ["disable"]

    # ==================== Static Mapping ====================

    def get_static_mapping_duid(
        self, network_name: str, subnet: str, mapping_name: str, duid: str
    ) -> List[str]:
        return self.get_static_mapping(network_name, subnet, mapping_name) + ["duid", duid]

    def get_static_mapping_duid_path(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> List[str]:
        return self.get_static_mapping(network_name, subnet, mapping_name) + ["duid"]

    def get_static_mapping_description(
        self, network_name: str, subnet: str, mapping_name: str, description: str
    ) -> List[str]:
        return self.get_static_mapping(network_name, subnet, mapping_name) + [
            "description", description,
        ]

    def get_static_mapping_description_path(
        self, network_name: str, subnet: str, mapping_name: str
    ) -> List[str]:
        return self.get_static_mapping(network_name, subnet, mapping_name) + ["description"]

    # ==================== High Availability ====================

    def get_failover_certificate(self, name: str) -> List[str]:
        return ["service", "dhcp-server", "high-availability", "certificate", name]

    def get_failover_certificate_path(self) -> List[str]:
        return ["service", "dhcp-server", "high-availability", "certificate"]

    def get_failover_ca_certificate(self, name: str) -> List[str]:
        return ["service", "dhcp-server", "high-availability", "ca-certificate", name]

    def get_failover_ca_certificate_path(self) -> List[str]:
        return ["service", "dhcp-server", "high-availability", "ca-certificate"]

    # ==================== Kea dynamic-dns-update ====================

    def _ddns(self) -> List[str]:
        return ["service", "dhcp-server", "dynamic-dns-update"]

    def get_ddns_scalar(self, field: str, value: str) -> List[str]:
        return self._ddns() + [field, value]

    def get_ddns_scalar_path(self, field: str) -> List[str]:
        return self._ddns() + [field]

    def get_ddns_send_updates(self, value: str) -> List[str]:
        return self._ddns() + ["send-updates", value]

    def get_ddns_send_updates_path(self) -> List[str]:
        return self._ddns() + ["send-updates"]

    def get_ddns_tsig_key(self, name: str) -> List[str]:
        return self._ddns() + ["tsig-key", name]

    def get_ddns_tsig_key_path(self, name: str) -> List[str]:
        return self._ddns() + ["tsig-key", name]

    def get_ddns_tsig_key_algorithm(self, name: str, algorithm: str) -> List[str]:
        return self.get_ddns_tsig_key(name) + ["algorithm", algorithm]

    def get_ddns_tsig_key_secret(self, name: str, secret: str) -> List[str]:
        return self.get_ddns_tsig_key(name) + ["secret", secret]

    def get_ddns_domain(self, kind: str, domain: str) -> List[str]:
        return self._ddns() + [kind, domain]

    def get_ddns_domain_path(self, kind: str, domain: str) -> List[str]:
        return self._ddns() + [kind, domain]

    def get_ddns_domain_key_name(self, kind: str, domain: str, key_name: str) -> List[str]:
        return self.get_ddns_domain(kind, domain) + ["key-name", key_name]

    def get_ddns_domain_key_name_path(self, kind: str, domain: str) -> List[str]:
        return self.get_ddns_domain(kind, domain) + ["key-name"]

    def get_ddns_domain_dns_server_address(
        self, kind: str, domain: str, server_id: str, address: str
    ) -> List[str]:
        return self.get_ddns_domain_dns_server_path(kind, domain, server_id) + [
            "address", address,
        ]

    def get_ddns_domain_dns_server_port(
        self, kind: str, domain: str, server_id: str, port: str
    ) -> List[str]:
        return self.get_ddns_domain_dns_server_path(kind, domain, server_id) + ["port", port]

    def get_ddns_domain_dns_server_path(
        self, kind: str, domain: str, server_id: str
    ) -> List[str]:
        return self.get_ddns_domain(kind, domain) + ["dns-server", server_id]

    # ==================== Client Class ====================

    def _class_value(self, value: str, label: str) -> str:
        cleaned = str(value or "").strip()
        if not cleaned:
            raise ValueError(f"{label} requires a value")
        if "|" in cleaned:
            raise ValueError(f"{label} value cannot contain '|'")
        return cleaned

    def get_client_class(self, name: str) -> List[str]:
        if not _CLIENT_CLASS_NAME.match(name or ""):
            raise ValueError("Invalid client-class name")
        return ["service", "dhcp-server", "client-class", name]

    def get_client_class_path(self, name: str) -> List[str]:
        return self.get_client_class(name)

    def get_client_class_disable(self, name: str) -> List[str]:
        return self.get_client_class(name) + ["disable"]

    def get_client_class_disable_path(self, name: str) -> List[str]:
        return self.get_client_class(name) + ["disable"]

    def get_client_class_circuit_id(self, name: str, value: str) -> List[str]:
        cleaned = self._class_value(value, "circuit-id")
        return self.get_client_class(name) + [
            "relay-agent-information", "circuit-id", cleaned,
        ]

    def get_client_class_circuit_id_path(self, name: str) -> List[str]:
        return self.get_client_class(name) + ["relay-agent-information", "circuit-id"]

    def get_client_class_remote_id(self, name: str, value: str) -> List[str]:
        cleaned = self._class_value(value, "remote-id")
        return self.get_client_class(name) + [
            "relay-agent-information", "remote-id", cleaned,
        ]

    def get_client_class_remote_id_path(self, name: str) -> List[str]:
        return self.get_client_class(name) + ["relay-agent-information", "remote-id"]
