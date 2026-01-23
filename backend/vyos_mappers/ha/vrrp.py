"""
VRRP (Virtual Router Redundancy Protocol) Command Mapper

Handles VRRP/HA commands for high availability configuration.
"""

from typing import List, Dict, Any, Optional
from ..base import BaseFeatureMapper


class VRRPMapper(BaseFeatureMapper):
    """VRRP mapper with all high availability operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)

    # ========================================================================
    # VRRP Group Commands
    # ========================================================================

    def get_vrrp_group(self, name: str) -> List[str]:
        """Get command path for creating a VRRP group."""
        return ["high-availability", "vrrp", "group", name]

    def get_vrrp_group_vrid(self, name: str, vrid: str) -> List[str]:
        """Get command path for VRRP group VRID (1-255)."""
        return ["high-availability", "vrrp", "group", name, "vrid", vrid]

    def get_vrrp_group_interface(self, name: str, interface: str) -> List[str]:
        """Get command path for VRRP group interface."""
        return ["high-availability", "vrrp", "group", name, "interface", interface]

    def get_vrrp_group_address(self, name: str, address: str) -> List[str]:
        """Get command path for VRRP group virtual address (IP/mask)."""
        return ["high-availability", "vrrp", "group", name, "address", address]

    def get_vrrp_group_priority(self, name: str, priority: str) -> List[str]:
        """Get command path for VRRP group priority (1-255)."""
        return ["high-availability", "vrrp", "group", name, "priority", priority]

    def get_vrrp_group_disable(self, name: str) -> List[str]:
        """Get command path for disabling a VRRP group."""
        return ["high-availability", "vrrp", "group", name, "disable"]

    def get_vrrp_group_no_preempt(self, name: str) -> List[str]:
        """Get command path for no-preempt option."""
        return ["high-availability", "vrrp", "group", name, "no-preempt"]

    def get_vrrp_group_preempt_delay(self, name: str, delay: str) -> List[str]:
        """Get command path for preempt delay (seconds)."""
        return ["high-availability", "vrrp", "group", name, "preempt-delay", delay]

    def get_vrrp_group_rfc3768_compatibility(self, name: str) -> List[str]:
        """Get command path for RFC 3768 compatibility mode."""
        return ["high-availability", "vrrp", "group", name, "rfc3768-compatibility"]

    def get_vrrp_group_description(self, name: str, description: str) -> List[str]:
        """Get command path for VRRP group description."""
        return ["high-availability", "vrrp", "group", name, "description", description]

    def get_vrrp_group_description_path(self, name: str) -> List[str]:
        """Get command path for VRRP group description (for deletion)."""
        return ["high-availability", "vrrp", "group", name, "description"]

    # ========================================================================
    # VRRP Group Address Commands
    # ========================================================================

    def get_vrrp_group_excluded_address(self, name: str, address: str) -> List[str]:
        """Get command path for excluded address."""
        return ["high-availability", "vrrp", "group", name, "excluded-address", address]

    # ========================================================================
    # VRRP Group Unicast Commands
    # ========================================================================

    def get_vrrp_group_peer_address(self, name: str, peer: str) -> List[str]:
        """Get command path for unicast peer address."""
        return ["high-availability", "vrrp", "group", name, "peer-address", peer]

    def get_vrrp_group_hello_source_address(self, name: str, address: str) -> List[str]:
        """Get command path for hello source address (unicast mode)."""
        return ["high-availability", "vrrp", "group", name, "hello-source-address", address]

    # ========================================================================
    # VRRP Group Tracking Commands
    # ========================================================================

    def get_vrrp_group_track_interface(self, name: str, interface: str) -> List[str]:
        """Get command path for tracking an interface."""
        return ["high-availability", "vrrp", "group", name, "track", "interface", interface]

    def get_vrrp_group_track_exclude_vrrp_interface(self, name: str) -> List[str]:
        """Get command path for excluding VRRP interface from tracking."""
        return ["high-availability", "vrrp", "group", name, "track", "exclude-vrrp-interface"]

    # ========================================================================
    # VRRP Group Health Check Commands
    # ========================================================================

    def get_vrrp_group_health_check_script(self, name: str, script: str) -> List[str]:
        """Get command path for health check script."""
        return ["high-availability", "vrrp", "group", name, "health-check", "script", script]

    def get_vrrp_group_health_check_interval(self, name: str, interval: str) -> List[str]:
        """Get command path for health check interval (seconds)."""
        return ["high-availability", "vrrp", "group", name, "health-check", "interval", interval]

    def get_vrrp_group_health_check_failure_count(self, name: str, count: str) -> List[str]:
        """Get command path for health check failure count."""
        return ["high-availability", "vrrp", "group", name, "health-check", "failure-count", count]

    # ========================================================================
    # VRRP Group Transition Script Commands
    # ========================================================================

    def get_vrrp_group_transition_script_master(self, name: str, script: str) -> List[str]:
        """Get command path for master transition script."""
        return ["high-availability", "vrrp", "group", name, "transition-script", "master", script]

    def get_vrrp_group_transition_script_backup(self, name: str, script: str) -> List[str]:
        """Get command path for backup transition script."""
        return ["high-availability", "vrrp", "group", name, "transition-script", "backup", script]

    def get_vrrp_group_transition_script_fault(self, name: str, script: str) -> List[str]:
        """Get command path for fault transition script."""
        return ["high-availability", "vrrp", "group", name, "transition-script", "fault", script]

    def get_vrrp_group_transition_script_stop(self, name: str, script: str) -> List[str]:
        """Get command path for stop transition script."""
        return ["high-availability", "vrrp", "group", name, "transition-script", "stop", script]

    # ========================================================================
    # VRRP Authentication Commands
    # ========================================================================

    def get_vrrp_group_authentication_type(self, name: str, auth_type: str) -> List[str]:
        """Get command path for authentication type (plaintext-password, ah)."""
        return ["high-availability", "vrrp", "group", name, "authentication", "type", auth_type]

    def get_vrrp_group_authentication_password(self, name: str, password: str) -> List[str]:
        """Get command path for authentication password."""
        return ["high-availability", "vrrp", "group", name, "authentication", "password", password]

    # ========================================================================
    # VRRP Sync Group Commands
    # ========================================================================

    def get_sync_group(self, name: str) -> List[str]:
        """Get command path for creating a sync group."""
        return ["high-availability", "vrrp", "sync-group", name]

    def get_sync_group_member(self, name: str, member: str) -> List[str]:
        """Get command path for adding a member to sync group."""
        return ["high-availability", "vrrp", "sync-group", name, "member", member]

    def get_sync_group_transition_script_master(self, name: str, script: str) -> List[str]:
        """Get command path for sync group master transition script."""
        return ["high-availability", "vrrp", "sync-group", name, "transition-script", "master", script]

    def get_sync_group_transition_script_backup(self, name: str, script: str) -> List[str]:
        """Get command path for sync group backup transition script."""
        return ["high-availability", "vrrp", "sync-group", name, "transition-script", "backup", script]

    def get_sync_group_transition_script_fault(self, name: str, script: str) -> List[str]:
        """Get command path for sync group fault transition script."""
        return ["high-availability", "vrrp", "sync-group", name, "transition-script", "fault", script]

    # ========================================================================
    # VRRP Global Parameters Commands
    # ========================================================================

    def get_global_startup_delay(self, delay: str) -> List[str]:
        """Get command path for global startup delay (1-600 seconds)."""
        return ["high-availability", "vrrp", "global-parameters", "startup-delay", delay]

    def get_global_version(self, version: str) -> List[str]:
        """Get command path for global VRRP version (2 or 3)."""
        return ["high-availability", "vrrp", "global-parameters", "version", version]

    # GARP (Gratuitous ARP) settings
    def get_global_garp_interval(self, interval: str) -> List[str]:
        """Get command path for GARP interval (0.000-1000)."""
        return ["high-availability", "vrrp", "global-parameters", "garp", "interval", interval]

    def get_global_garp_master_delay(self, delay: str) -> List[str]:
        """Get command path for GARP master delay (1-255)."""
        return ["high-availability", "vrrp", "global-parameters", "garp", "master-delay", delay]

    def get_global_garp_master_refresh(self, refresh: str) -> List[str]:
        """Get command path for GARP master refresh (1-600)."""
        return ["high-availability", "vrrp", "global-parameters", "garp", "master-refresh", refresh]

    def get_global_garp_master_refresh_repeat(self, repeat: str) -> List[str]:
        """Get command path for GARP master refresh repeat (1-600)."""
        return ["high-availability", "vrrp", "global-parameters", "garp", "master-refresh-repeat", repeat]

    def get_global_garp_master_repeat(self, repeat: str) -> List[str]:
        """Get command path for GARP master repeat (1-600)."""
        return ["high-availability", "vrrp", "global-parameters", "garp", "master-repeat", repeat]

    # ========================================================================
    # Virtual Server Commands (Load Balancing)
    # ========================================================================

    def get_virtual_server(self, address: str) -> List[str]:
        """Get command path for creating a virtual server."""
        return ["high-availability", "virtual-server", address]

    def get_virtual_server_algorithm(self, address: str, algorithm: str) -> List[str]:
        """Get command path for VS algorithm (rr, wrr, lc, wlc, sh, dh, lblc, lblcr, sed, nq)."""
        return ["high-availability", "virtual-server", address, "algorithm", algorithm]

    def get_virtual_server_forward_method(self, address: str, method: str) -> List[str]:
        """Get command path for VS forward method (direct, nat, tunnel)."""
        return ["high-availability", "virtual-server", address, "forward-method", method]

    def get_virtual_server_port(self, address: str, port: str) -> List[str]:
        """Get command path for VS port."""
        return ["high-availability", "virtual-server", address, "port", port]

    def get_virtual_server_protocol(self, address: str, protocol: str) -> List[str]:
        """Get command path for VS protocol (tcp, udp)."""
        return ["high-availability", "virtual-server", address, "protocol", protocol]

    def get_virtual_server_real_server(self, address: str, real_server: str) -> List[str]:
        """Get command path for adding a real server."""
        return ["high-availability", "virtual-server", address, "real-server", real_server]

    def get_virtual_server_real_server_port(self, address: str, real_server: str, port: str) -> List[str]:
        """Get command path for real server port."""
        return ["high-availability", "virtual-server", address, "real-server", real_server, "port", port]

    def get_virtual_server_fwmark(self, address: str, fwmark: str) -> List[str]:
        """Get command path for VS firewall mark."""
        return ["high-availability", "virtual-server", address, "fwmark", fwmark]

    def get_virtual_server_delay_loop(self, address: str, delay: str) -> List[str]:
        """Get command path for VS delay loop."""
        return ["high-availability", "virtual-server", address, "delay-loop", delay]

    def get_virtual_server_persistence_timeout(self, address: str, timeout: str) -> List[str]:
        """Get command path for VS persistence timeout."""
        return ["high-availability", "virtual-server", address, "persistence-timeout", timeout]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_vrrp_groups(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse VRRP groups from config."""
        groups = []
        vrrp_config = config.get("group", {})

        for name, group_config in vrrp_config.items():
            if not isinstance(group_config, dict):
                continue

            # Parse addresses
            addresses = group_config.get("address", [])
            if isinstance(addresses, str):
                addresses = [addresses]

            # Parse excluded addresses
            excluded_addresses = group_config.get("excluded-address", [])
            if isinstance(excluded_addresses, str):
                excluded_addresses = [excluded_addresses]

            # Parse peer addresses (unicast)
            peer_addresses = group_config.get("peer-address", [])
            if isinstance(peer_addresses, str):
                peer_addresses = [peer_addresses]

            # Parse tracking
            track = None
            track_config = group_config.get("track", {})
            if isinstance(track_config, dict) and track_config:
                track_interfaces = track_config.get("interface", [])
                if isinstance(track_interfaces, str):
                    track_interfaces = [track_interfaces]
                track = {
                    "interfaces": track_interfaces,
                    "exclude_vrrp_interface": "exclude-vrrp-interface" in track_config,
                }

            # Parse health check
            health_check = None
            hc_config = group_config.get("health-check", {})
            if isinstance(hc_config, dict) and hc_config:
                health_check = {
                    "script": hc_config.get("script"),
                    "interval": hc_config.get("interval"),
                    "failure_count": hc_config.get("failure-count"),
                }

            # Parse transition scripts
            transition_scripts = None
            ts_config = group_config.get("transition-script", {})
            if isinstance(ts_config, dict) and ts_config:
                transition_scripts = {
                    "master": ts_config.get("master"),
                    "backup": ts_config.get("backup"),
                    "fault": ts_config.get("fault"),
                    "stop": ts_config.get("stop"),
                }

            # Parse authentication
            authentication = None
            auth_config = group_config.get("authentication", {})
            if isinstance(auth_config, dict) and auth_config:
                authentication = {
                    "type": auth_config.get("type"),
                    "password": auth_config.get("password"),
                }

            groups.append({
                "name": name,
                "vrid": group_config.get("vrid"),
                "interface": group_config.get("interface"),
                "addresses": addresses,
                "excluded_addresses": excluded_addresses,
                "priority": group_config.get("priority", "100"),
                "disable": "disable" in group_config,
                "no_preempt": "no-preempt" in group_config,
                "preempt_delay": group_config.get("preempt-delay"),
                "rfc3768_compatibility": "rfc3768-compatibility" in group_config,
                "description": group_config.get("description"),
                "hello_source_address": group_config.get("hello-source-address"),
                "peer_addresses": peer_addresses,
                "track": track,
                "health_check": health_check,
                "transition_scripts": transition_scripts,
                "authentication": authentication,
            })

        return groups

    def parse_sync_groups(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse VRRP sync groups from config."""
        sync_groups = []
        sg_config = config.get("sync-group", {})

        for name, sg_data in sg_config.items():
            if not isinstance(sg_data, dict):
                continue

            # Parse members
            members = sg_data.get("member", [])
            if isinstance(members, str):
                members = [members]

            # Parse transition scripts
            transition_scripts = None
            ts_config = sg_data.get("transition-script", {})
            if isinstance(ts_config, dict) and ts_config:
                transition_scripts = {
                    "master": ts_config.get("master"),
                    "backup": ts_config.get("backup"),
                    "fault": ts_config.get("fault"),
                }

            sync_groups.append({
                "name": name,
                "members": members,
                "transition_scripts": transition_scripts,
            })

        return sync_groups

    def parse_global_parameters(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse VRRP global parameters from config."""
        gp_config = config.get("global-parameters", {})
        if not isinstance(gp_config, dict):
            return {}

        # Parse GARP settings
        garp = None
        garp_config = gp_config.get("garp", {})
        if isinstance(garp_config, dict) and garp_config:
            garp = {
                "interval": garp_config.get("interval"),
                "master_delay": garp_config.get("master-delay"),
                "master_refresh": garp_config.get("master-refresh"),
                "master_refresh_repeat": garp_config.get("master-refresh-repeat"),
                "master_repeat": garp_config.get("master-repeat"),
            }

        return {
            "startup_delay": gp_config.get("startup-delay"),
            "version": gp_config.get("version"),
            "garp": garp,
        }

    def parse_virtual_servers(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse virtual servers from config."""
        virtual_servers = []
        vs_config = config.get("virtual-server", {})

        for address, vs_data in vs_config.items():
            if not isinstance(vs_data, dict):
                continue

            # Parse real servers
            real_servers = []
            rs_config = vs_data.get("real-server", {})
            for rs_addr, rs_data in rs_config.items() if isinstance(rs_config, dict) else []:
                if isinstance(rs_data, dict):
                    real_servers.append({
                        "address": rs_addr,
                        "port": rs_data.get("port"),
                    })

            virtual_servers.append({
                "address": address,
                "algorithm": vs_data.get("algorithm"),
                "forward_method": vs_data.get("forward-method"),
                "port": vs_data.get("port"),
                "protocol": vs_data.get("protocol"),
                "fwmark": vs_data.get("fwmark"),
                "delay_loop": vs_data.get("delay-loop"),
                "persistence_timeout": vs_data.get("persistence-timeout"),
                "real_servers": real_servers,
            })

        return virtual_servers

    def parse_full_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse full VRRP/HA configuration from VyOS.

        Args:
            full_config: Full VyOS config dictionary

        Returns:
            Parsed VRRP/HA configuration
        """
        ha_config = full_config.get("high-availability", {})
        vrrp_config = ha_config.get("vrrp", {})

        if not vrrp_config and not ha_config.get("virtual-server"):
            return {
                "configured": False,
                "groups": [],
                "sync_groups": [],
                "global_parameters": {},
                "virtual_servers": [],
            }

        return {
            "configured": True,
            "groups": self.parse_vrrp_groups(vrrp_config),
            "sync_groups": self.parse_sync_groups(vrrp_config),
            "global_parameters": self.parse_global_parameters(vrrp_config),
            "virtual_servers": self.parse_virtual_servers(ha_config),
        }
