from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class OpenfabricBatchBuilder:
    """Batch builder for OpenFabric protocol configuration."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["openfabric"]

    # ── Internals ─────────────────────────────────────────────────────────

    def add_set(self, path: List[str]) -> "OpenfabricBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "OpenfabricBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # ── Capabilities ──────────────────────────────────────────────────────

    def get_capabilities(self) -> Dict[str, Any]:
        is_v15 = "1.5" in self.version or "1.4" not in self.version
        return {
            "version": self.version,
            "features": {
                "openfabric": {
                    "supported": is_v15,
                    "description": "OpenFabric routing protocol",
                },
                "domain": {
                    "supported": is_v15,
                    "description": "OpenFabric domain configuration",
                },
                "domain_password": {
                    "supported": is_v15,
                    "description": "Domain authentication (MD5 / plaintext)",
                },
                "interface_address_family": {
                    "supported": is_v15,
                    "description": "Per-interface IPv4/IPv6 address-family",
                },
                "interface_password": {
                    "supported": is_v15,
                    "description": "Per-interface authentication (MD5 / plaintext)",
                },
                "fabric_tier": {
                    "supported": is_v15,
                    "description": "Static fabric tier (0-14)",
                },
            },
        }

    # ── NET ───────────────────────────────────────────────────────────────

    def set_net(self, net: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_net_path(net))

    def delete_net(self, net: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_net_path(net))

    # ── Domain lifecycle ──────────────────────────────────────────────────

    def set_domain(self, domain: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_path(domain))

    def delete_domain(self, domain: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_path(domain))

    # ── Domain – Fabric Tier ──────────────────────────────────────────────

    def set_domain_fabric_tier(self, domain: str, tier: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_fabric_tier_path(domain, tier))

    def delete_domain_fabric_tier(self, domain: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_fabric_tier_path(domain, ""))

    # ── Domain – Flags ────────────────────────────────────────────────────

    def set_domain_log_adjacency_changes(self, domain: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_log_adjacency_changes_path(domain))

    def delete_domain_log_adjacency_changes(self, domain: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_log_adjacency_changes_path(domain))

    def set_domain_purge_originator(self, domain: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_purge_originator_path(domain))

    def delete_domain_purge_originator(self, domain: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_purge_originator_path(domain))

    def set_domain_set_overload_bit(self, domain: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_set_overload_bit_path(domain))

    def delete_domain_set_overload_bit(self, domain: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_set_overload_bit_path(domain))

    # ── Domain – Timers / LSP ─────────────────────────────────────────────

    def set_domain_lsp_gen_interval(self, domain: str, val: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_lsp_gen_interval_path(domain, val))

    def delete_domain_lsp_gen_interval(self, domain: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_lsp_gen_interval_path(domain, ""))

    def set_domain_lsp_refresh_interval(self, domain: str, val: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_lsp_refresh_interval_path(domain, val))

    def delete_domain_lsp_refresh_interval(self, domain: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_lsp_refresh_interval_path(domain, ""))

    def set_domain_max_lsp_lifetime(self, domain: str, val: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_max_lsp_lifetime_path(domain, val))

    def delete_domain_max_lsp_lifetime(self, domain: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_max_lsp_lifetime_path(domain, ""))

    def set_domain_spf_interval(self, domain: str, val: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_spf_interval_path(domain, val))

    def delete_domain_spf_interval(self, domain: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_spf_interval_path(domain, ""))

    # ── Domain – Password ─────────────────────────────────────────────────

    def set_domain_password_md5(self, domain: str, pwd: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_password_md5_path(domain, pwd))

    def set_domain_password_plaintext(self, domain: str, pwd: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_password_plaintext_path(domain, pwd))

    def delete_domain_password(self, domain: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_password_path(domain))

    # ── Domain – Interface lifecycle ──────────────────────────────────────

    def set_domain_interface(self, domain: str, iface: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_interface_path(domain, iface))

    def delete_domain_interface(self, domain: str, iface: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_interface_path(domain, iface))

    # ── Domain – Interface – Address Family ───────────────────────────────

    def set_domain_interface_address_family_ipv4(self, domain: str, iface: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_interface_address_family_ipv4_path(domain, iface))

    def delete_domain_interface_address_family_ipv4(self, domain: str, iface: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_interface_address_family_ipv4_path(domain, iface))

    def set_domain_interface_address_family_ipv6(self, domain: str, iface: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_interface_address_family_ipv6_path(domain, iface))

    def delete_domain_interface_address_family_ipv6(self, domain: str, iface: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_interface_address_family_ipv6_path(domain, iface))

    def delete_domain_interface_address_family(self, domain: str, iface: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_interface_address_family_path(domain, iface))

    # ── Domain – Interface – Timers ───────────────────────────────────────

    def set_domain_interface_csnp_interval(self, domain: str, iface: str, val: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_interface_csnp_interval_path(domain, iface, val))

    def delete_domain_interface_csnp_interval(self, domain: str, iface: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_interface_csnp_interval_path(domain, iface, ""))

    def set_domain_interface_hello_interval(self, domain: str, iface: str, val: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_interface_hello_interval_path(domain, iface, val))

    def delete_domain_interface_hello_interval(self, domain: str, iface: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_interface_hello_interval_path(domain, iface, ""))

    def set_domain_interface_hello_multiplier(self, domain: str, iface: str, val: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_interface_hello_multiplier_path(domain, iface, val))

    def delete_domain_interface_hello_multiplier(self, domain: str, iface: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_interface_hello_multiplier_path(domain, iface, ""))

    def set_domain_interface_psnp_interval(self, domain: str, iface: str, val: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_interface_psnp_interval_path(domain, iface, val))

    def delete_domain_interface_psnp_interval(self, domain: str, iface: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_interface_psnp_interval_path(domain, iface, ""))

    # ── Domain – Interface – Metric ───────────────────────────────────────

    def set_domain_interface_metric(self, domain: str, iface: str, val: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_interface_metric_path(domain, iface, val))

    def delete_domain_interface_metric(self, domain: str, iface: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_interface_metric_path(domain, iface, ""))

    # ── Domain – Interface – Passive ──────────────────────────────────────

    def set_domain_interface_passive(self, domain: str, iface: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_interface_passive_path(domain, iface))

    def delete_domain_interface_passive(self, domain: str, iface: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_interface_passive_path(domain, iface))

    # ── Domain – Interface – Password ─────────────────────────────────────

    def set_domain_interface_password_md5(self, domain: str, iface: str, pwd: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_interface_password_md5_path(domain, iface, pwd))

    def set_domain_interface_password_plaintext(self, domain: str, iface: str, pwd: str) -> "OpenfabricBatchBuilder":
        return self.add_set(self.m.get_domain_interface_password_plaintext_path(domain, iface, pwd))

    def delete_domain_interface_password(self, domain: str, iface: str) -> "OpenfabricBatchBuilder":
        return self.add_delete(self.m.get_domain_interface_password_path(domain, iface))
