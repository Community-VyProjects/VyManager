from typing import List


class OpenfabricMapperV1_4:
    """VyOS 1.4 – OpenFabric does not exist. All methods return empty lists (no-op)."""

    # Every method returns [] so the builder silently skips the operation.

    def get_openfabric_path(self) -> List[str]:
        return []

    def get_net_path(self, net: str) -> List[str]:
        return []

    def get_domain_path(self, domain: str) -> List[str]:
        return []

    def get_domain_fabric_tier_path(self, domain: str, tier: str) -> List[str]:
        return []

    def get_domain_log_adjacency_changes_path(self, domain: str) -> List[str]:
        return []

    def get_domain_purge_originator_path(self, domain: str) -> List[str]:
        return []

    def get_domain_set_overload_bit_path(self, domain: str) -> List[str]:
        return []

    def get_domain_lsp_gen_interval_path(self, domain: str, val: str) -> List[str]:
        return []

    def get_domain_lsp_refresh_interval_path(self, domain: str, val: str) -> List[str]:
        return []

    def get_domain_max_lsp_lifetime_path(self, domain: str, val: str) -> List[str]:
        return []

    def get_domain_spf_interval_path(self, domain: str, val: str) -> List[str]:
        return []

    def get_domain_password_md5_path(self, domain: str, pwd: str) -> List[str]:
        return []

    def get_domain_password_plaintext_path(self, domain: str, pwd: str) -> List[str]:
        return []

    def get_domain_password_path(self, domain: str) -> List[str]:
        return []

    def get_domain_interface_path(self, domain: str, iface: str) -> List[str]:
        return []

    def get_domain_interface_address_family_ipv4_path(self, domain: str, iface: str) -> List[str]:
        return []

    def get_domain_interface_address_family_ipv6_path(self, domain: str, iface: str) -> List[str]:
        return []

    def get_domain_interface_address_family_path(self, domain: str, iface: str) -> List[str]:
        return []

    def get_domain_interface_csnp_interval_path(self, domain: str, iface: str, val: str) -> List[str]:
        return []

    def get_domain_interface_hello_interval_path(self, domain: str, iface: str, val: str) -> List[str]:
        return []

    def get_domain_interface_hello_multiplier_path(self, domain: str, iface: str, val: str) -> List[str]:
        return []

    def get_domain_interface_psnp_interval_path(self, domain: str, iface: str, val: str) -> List[str]:
        return []

    def get_domain_interface_metric_path(self, domain: str, iface: str, val: str) -> List[str]:
        return []

    def get_domain_interface_passive_path(self, domain: str, iface: str) -> List[str]:
        return []

    def get_domain_interface_password_md5_path(self, domain: str, iface: str, pwd: str) -> List[str]:
        return []

    def get_domain_interface_password_plaintext_path(self, domain: str, iface: str, pwd: str) -> List[str]:
        return []

    def get_domain_interface_password_path(self, domain: str, iface: str) -> List[str]:
        return []
