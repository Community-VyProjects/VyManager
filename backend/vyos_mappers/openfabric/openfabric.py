from typing import List


class OpenfabricMapper:
    """Base mapper for OpenFabric protocol paths (common across versions)."""

    def __init__(self, version: str):
        self.version = version

    # ── Root ──────────────────────────────────────────────────────────────
    def get_openfabric_path(self) -> List[str]:
        return ["protocols", "openfabric"]

    # ── NET ───────────────────────────────────────────────────────────────
    def get_net_path(self, net: str) -> List[str]:
        return ["protocols", "openfabric", "net", net]

    # ── Domain ────────────────────────────────────────────────────────────
    def get_domain_path(self, domain: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain]

    # ── Domain – Fabric Tier ──────────────────────────────────────────────
    def get_domain_fabric_tier_path(self, domain: str, tier: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "fabric-tier", tier]

    # ── Domain – Flags ────────────────────────────────────────────────────
    def get_domain_log_adjacency_changes_path(self, domain: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "log-adjacency-changes"]

    def get_domain_purge_originator_path(self, domain: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "purge-originator"]

    def get_domain_set_overload_bit_path(self, domain: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "set-overload-bit"]

    # ── Domain – Timers / LSP ─────────────────────────────────────────────
    def get_domain_lsp_gen_interval_path(self, domain: str, val: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "lsp-gen-interval", val]

    def get_domain_lsp_refresh_interval_path(self, domain: str, val: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "lsp-refresh-interval", val]

    def get_domain_max_lsp_lifetime_path(self, domain: str, val: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "max-lsp-lifetime", val]

    def get_domain_spf_interval_path(self, domain: str, val: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "spf-interval", val]

    # ── Domain – Passwords ────────────────────────────────────────────────
    def get_domain_password_md5_path(self, domain: str, pwd: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "domain-password", "md5", pwd]

    def get_domain_password_plaintext_path(self, domain: str, pwd: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "domain-password", "plaintext-password", pwd]

    def get_domain_password_path(self, domain: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "domain-password"]

    # ── Domain – Interface ────────────────────────────────────────────────
    def get_domain_interface_path(self, domain: str, iface: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "interface", iface]

    # ── Domain – Interface – Address Family ───────────────────────────────
    def get_domain_interface_address_family_ipv4_path(self, domain: str, iface: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "interface", iface, "address-family", "ipv4"]

    def get_domain_interface_address_family_ipv6_path(self, domain: str, iface: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "interface", iface, "address-family", "ipv6"]

    def get_domain_interface_address_family_path(self, domain: str, iface: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "interface", iface, "address-family"]

    # ── Domain – Interface – Timers ───────────────────────────────────────
    def get_domain_interface_csnp_interval_path(self, domain: str, iface: str, val: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "interface", iface, "csnp-interval", val]

    def get_domain_interface_hello_interval_path(self, domain: str, iface: str, val: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "interface", iface, "hello-interval", val]

    def get_domain_interface_hello_multiplier_path(self, domain: str, iface: str, val: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "interface", iface, "hello-multiplier", val]

    def get_domain_interface_psnp_interval_path(self, domain: str, iface: str, val: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "interface", iface, "psnp-interval", val]

    # ── Domain – Interface – Metric ───────────────────────────────────────
    def get_domain_interface_metric_path(self, domain: str, iface: str, val: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "interface", iface, "metric", val]

    # ── Domain – Interface – Passive ──────────────────────────────────────
    def get_domain_interface_passive_path(self, domain: str, iface: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "interface", iface, "passive"]

    # ── Domain – Interface – Password ─────────────────────────────────────
    def get_domain_interface_password_md5_path(self, domain: str, iface: str, pwd: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "interface", iface, "password", "md5", pwd]

    def get_domain_interface_password_plaintext_path(self, domain: str, iface: str, pwd: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "interface", iface, "password", "plaintext-password", pwd]

    def get_domain_interface_password_path(self, domain: str, iface: str) -> List[str]:
        return ["protocols", "openfabric", "domain", domain, "interface", iface, "password"]
