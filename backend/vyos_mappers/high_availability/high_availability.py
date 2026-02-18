from typing import List, Dict, Any


class HighAvailabilityMapper:
    def __init__(self, version: str):
        self.version = version
        self._base = ["high-availability"]

    # HA Global
    def get_ha_disable_path(self) -> List[str]:
        return self._base + ["disable"]

    # VRRP Global Parameters
    def get_vrrp_global_params_path(self) -> List[str]:
        return self._base + ["vrrp", "global-parameters"]

    def get_vrrp_global_startup_delay_path(self, value: str) -> List[str]:
        return self._base + ["vrrp", "global-parameters", "startup-delay", value]

    def get_vrrp_global_version_path(self, value: str) -> List[str]:
        return self._base + ["vrrp", "global-parameters", "version", value]

    def get_vrrp_global_garp_interval_path(self, value: str) -> List[str]:
        return self._base + ["vrrp", "global-parameters", "garp", "interval", value]

    def get_vrrp_global_garp_master_delay_path(self, value: str) -> List[str]:
        return self._base + ["vrrp", "global-parameters", "garp", "master-delay", value]

    def get_vrrp_global_garp_master_refresh_path(self, value: str) -> List[str]:
        return self._base + ["vrrp", "global-parameters", "garp", "master-refresh", value]

    def get_vrrp_global_garp_master_refresh_repeat_path(self, value: str) -> List[str]:
        return self._base + ["vrrp", "global-parameters", "garp", "master-refresh-repeat", value]

    def get_vrrp_global_garp_master_repeat_path(self, value: str) -> List[str]:
        return self._base + ["vrrp", "global-parameters", "garp", "master-repeat", value]

    def get_vrrp_snmp_path(self) -> List[str]:
        return self._base + ["vrrp", "snmp"]

    # VRRP Group paths
    def get_vrrp_group_path(self, name: str) -> List[str]:
        return self._base + ["vrrp", "group", name]

    def get_vrrp_group_vrid_path(self, name: str, vrid: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "vrid", vrid]

    def get_vrrp_group_interface_path(self, name: str, interface: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "interface", interface]

    def get_vrrp_group_address_path(self, name: str, address: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "address", address]

    def get_vrrp_group_address_interface_path(self, name: str, address: str, interface: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "address", address, "interface", interface]

    def get_vrrp_group_excluded_address_path(self, name: str, address: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "excluded-address", address]

    def get_vrrp_group_excluded_address_interface_path(self, name: str, address: str, interface: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "excluded-address", address, "interface", interface]

    def get_vrrp_group_priority_path(self, name: str, priority: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "priority", priority]

    def get_vrrp_group_advertise_interval_path(self, name: str, interval: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "advertise-interval", interval]

    def get_vrrp_group_auth_type_path(self, name: str, auth_type: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "authentication", "type", auth_type]

    def get_vrrp_group_auth_password_path(self, name: str, password: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "authentication", "password", password]

    def get_vrrp_group_auth_path(self, name: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "authentication"]

    def get_vrrp_group_preempt_delay_path(self, name: str, delay: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "preempt-delay", delay]

    def get_vrrp_group_no_preempt_path(self, name: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "no-preempt"]

    def get_vrrp_group_peer_address_path(self, name: str, peer: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "peer-address", peer]

    def get_vrrp_group_hello_source_address_path(self, name: str, addr: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "hello-source-address", addr]

    def get_vrrp_group_rfc3768_path(self, name: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "rfc3768-compatibility"]

    def get_vrrp_group_disable_path(self, name: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "disable"]

    def get_vrrp_group_description_path(self, name: str, desc: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "description", desc]

    # GARP per-group
    def get_vrrp_group_garp_interval_path(self, name: str, value: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "garp", "interval", value]

    def get_vrrp_group_garp_master_delay_path(self, name: str, value: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "garp", "master-delay", value]

    def get_vrrp_group_garp_master_refresh_path(self, name: str, value: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "garp", "master-refresh", value]

    def get_vrrp_group_garp_master_refresh_repeat_path(self, name: str, value: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "garp", "master-refresh-repeat", value]

    def get_vrrp_group_garp_master_repeat_path(self, name: str, value: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "garp", "master-repeat", value]

    def get_vrrp_group_garp_path(self, name: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "garp"]

    # Health check per-group
    def get_vrrp_group_health_check_failure_count_path(self, name: str, value: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "health-check", "failure-count", value]

    def get_vrrp_group_health_check_interval_path(self, name: str, value: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "health-check", "interval", value]

    def get_vrrp_group_health_check_ping_path(self, name: str, value: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "health-check", "ping", value]

    def get_vrrp_group_health_check_script_path(self, name: str, value: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "health-check", "script", value]

    def get_vrrp_group_health_check_path(self, name: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "health-check"]

    # Track per-group
    def get_vrrp_group_track_interface_path(self, name: str, iface: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "track", "interface", iface]

    def get_vrrp_group_track_exclude_vrrp_interface_path(self, name: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "track", "exclude-vrrp-interface"]

    def get_vrrp_group_track_path(self, name: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "track"]

    # Transition scripts per-group
    def get_vrrp_group_transition_script_backup_path(self, name: str, script: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "transition-script", "backup", script]

    def get_vrrp_group_transition_script_fault_path(self, name: str, script: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "transition-script", "fault", script]

    def get_vrrp_group_transition_script_master_path(self, name: str, script: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "transition-script", "master", script]

    def get_vrrp_group_transition_script_stop_path(self, name: str, script: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "transition-script", "stop", script]

    def get_vrrp_group_transition_script_path(self, name: str) -> List[str]:
        return self._base + ["vrrp", "group", name, "transition-script"]

    # VRRP Sync Group paths
    def get_vrrp_sync_group_path(self, name: str) -> List[str]:
        return self._base + ["vrrp", "sync-group", name]

    def get_vrrp_sync_group_member_path(self, name: str, member: str) -> List[str]:
        return self._base + ["vrrp", "sync-group", name, "member", member]

    def get_vrrp_sync_group_health_check_failure_count_path(self, name: str, value: str) -> List[str]:
        return self._base + ["vrrp", "sync-group", name, "health-check", "failure-count", value]

    def get_vrrp_sync_group_health_check_interval_path(self, name: str, value: str) -> List[str]:
        return self._base + ["vrrp", "sync-group", name, "health-check", "interval", value]

    def get_vrrp_sync_group_health_check_ping_path(self, name: str, value: str) -> List[str]:
        return self._base + ["vrrp", "sync-group", name, "health-check", "ping", value]

    def get_vrrp_sync_group_health_check_script_path(self, name: str, value: str) -> List[str]:
        return self._base + ["vrrp", "sync-group", name, "health-check", "script", value]

    def get_vrrp_sync_group_health_check_path(self, name: str) -> List[str]:
        return self._base + ["vrrp", "sync-group", name, "health-check"]

    def get_vrrp_sync_group_transition_script_backup_path(self, name: str, script: str) -> List[str]:
        return self._base + ["vrrp", "sync-group", name, "transition-script", "backup", script]

    def get_vrrp_sync_group_transition_script_fault_path(self, name: str, script: str) -> List[str]:
        return self._base + ["vrrp", "sync-group", name, "transition-script", "fault", script]

    def get_vrrp_sync_group_transition_script_master_path(self, name: str, script: str) -> List[str]:
        return self._base + ["vrrp", "sync-group", name, "transition-script", "master", script]

    def get_vrrp_sync_group_transition_script_stop_path(self, name: str, script: str) -> List[str]:
        return self._base + ["vrrp", "sync-group", name, "transition-script", "stop", script]

    def get_vrrp_sync_group_transition_script_path(self, name: str) -> List[str]:
        return self._base + ["vrrp", "sync-group", name, "transition-script"]

    # Virtual Server paths
    def get_virtual_server_path(self, name: str) -> List[str]:
        return self._base + ["virtual-server", name]

    def get_virtual_server_address_path(self, name: str, address: str) -> List[str]:
        return self._base + ["virtual-server", name, "address", address]

    def get_virtual_server_algorithm_path(self, name: str, algorithm: str) -> List[str]:
        return self._base + ["virtual-server", name, "algorithm", algorithm]

    def get_virtual_server_delay_loop_path(self, name: str, value: str) -> List[str]:
        return self._base + ["virtual-server", name, "delay-loop", value]

    def get_virtual_server_forward_method_path(self, name: str, method: str) -> List[str]:
        return self._base + ["virtual-server", name, "forward-method", method]

    def get_virtual_server_fwmark_path(self, name: str, value: str) -> List[str]:
        return self._base + ["virtual-server", name, "fwmark", value]

    def get_virtual_server_persistence_timeout_path(self, name: str, value: str) -> List[str]:
        return self._base + ["virtual-server", name, "persistence-timeout", value]

    def get_virtual_server_port_path(self, name: str, port: str) -> List[str]:
        return self._base + ["virtual-server", name, "port", port]

    def get_virtual_server_protocol_path(self, name: str, protocol: str) -> List[str]:
        return self._base + ["virtual-server", name, "protocol", protocol]

    def get_virtual_server_real_server_path(self, name: str, real_server: str) -> List[str]:
        return self._base + ["virtual-server", name, "real-server", real_server]

    # Real server sub-paths use composite value "real_server_addr|value"
    def get_virtual_server_real_server_port_path(self, name: str, real_server: str, port: str) -> List[str]:
        return self._base + ["virtual-server", name, "real-server", real_server, "port", port]

    def get_virtual_server_real_server_connection_timeout_path(self, name: str, real_server: str, value: str) -> List[str]:
        return self._base + ["virtual-server", name, "real-server", real_server, "connection-timeout", value]

    def get_virtual_server_real_server_health_check_script_path(self, name: str, real_server: str, script: str) -> List[str]:
        return self._base + ["virtual-server", name, "real-server", real_server, "health-check", "script", script]

    # Config parsing
    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        ha_config = full_config.get("high-availability", {})
        return {
            "disabled": "disable" in ha_config,
            "vrrp": self._parse_vrrp(ha_config.get("vrrp", {})),
            "virtual_servers": self._parse_virtual_servers(ha_config.get("virtual-server", {})),
        }

    def _parse_vrrp(self, vrrp_config: Dict[str, Any]) -> Dict[str, Any]:
        global_params = vrrp_config.get("global-parameters", {})
        garp_global = global_params.get("garp", {})

        groups = []
        for name, group_cfg in vrrp_config.get("group", {}).items():
            groups.append(self._parse_vrrp_group(name, group_cfg))

        sync_groups = []
        for name, sg_cfg in vrrp_config.get("sync-group", {}).items():
            sync_groups.append(self._parse_vrrp_sync_group(name, sg_cfg))

        return {
            "global_parameters": {
                "startup_delay": global_params.get("startup-delay"),
                "version": global_params.get("version"),
                "garp": {
                    "interval": garp_global.get("interval"),
                    "master_delay": garp_global.get("master-delay"),
                    "master_refresh": garp_global.get("master-refresh"),
                    "master_refresh_repeat": garp_global.get("master-refresh-repeat"),
                    "master_repeat": garp_global.get("master-repeat"),
                },
            },
            "snmp": "snmp" in vrrp_config,
            "groups": groups,
            "sync_groups": sync_groups,
        }

    def _parse_vrrp_group(self, name: str, cfg: Dict[str, Any]) -> Dict[str, Any]:
        addresses = []
        for addr, addr_cfg in cfg.get("address", {}).items():
            iface = None
            if isinstance(addr_cfg, dict):
                iface = addr_cfg.get("interface")
            addresses.append({"address": addr, "interface": iface})

        excluded_addresses = []
        for addr, addr_cfg in cfg.get("excluded-address", {}).items():
            iface = None
            if isinstance(addr_cfg, dict):
                iface = addr_cfg.get("interface")
            excluded_addresses.append({"address": addr, "interface": iface})

        peer_addresses = cfg.get("peer-address", [])
        if isinstance(peer_addresses, str):
            peer_addresses = [peer_addresses]

        track_interfaces = cfg.get("track", {}).get("interface", [])
        if isinstance(track_interfaces, str):
            track_interfaces = [track_interfaces]

        auth = cfg.get("authentication", {})
        garp = cfg.get("garp", {})
        health_check = cfg.get("health-check", {})
        track = cfg.get("track", {})
        transition_script = cfg.get("transition-script", {})

        return {
            "name": name,
            "vrid": cfg.get("vrid"),
            "interface": cfg.get("interface"),
            "addresses": addresses,
            "excluded_addresses": excluded_addresses,
            "priority": cfg.get("priority"),
            "advertise_interval": cfg.get("advertise-interval"),
            "authentication": {
                "type": auth.get("type"),
                "password": auth.get("password"),
            } if auth else None,
            "preempt_delay": cfg.get("preempt-delay"),
            "no_preempt": "no-preempt" in cfg,
            "peer_addresses": peer_addresses,
            "hello_source_address": cfg.get("hello-source-address"),
            "rfc3768_compatibility": "rfc3768-compatibility" in cfg,
            "disabled": "disable" in cfg,
            "description": cfg.get("description"),
            "garp": {
                "interval": garp.get("interval"),
                "master_delay": garp.get("master-delay"),
                "master_refresh": garp.get("master-refresh"),
                "master_refresh_repeat": garp.get("master-refresh-repeat"),
                "master_repeat": garp.get("master-repeat"),
            },
            "health_check": {
                "failure_count": health_check.get("failure-count"),
                "interval": health_check.get("interval"),
                "ping": health_check.get("ping"),
                "script": health_check.get("script"),
            },
            "track": {
                "interfaces": track_interfaces,
                "exclude_vrrp_interface": "exclude-vrrp-interface" in track,
            },
            "transition_script": {
                "backup": transition_script.get("backup"),
                "fault": transition_script.get("fault"),
                "master": transition_script.get("master"),
                "stop": transition_script.get("stop"),
            },
        }

    def _parse_vrrp_sync_group(self, name: str, cfg: Dict[str, Any]) -> Dict[str, Any]:
        members = cfg.get("member", [])
        if isinstance(members, str):
            members = [members]

        health_check = cfg.get("health-check", {})
        transition_script = cfg.get("transition-script", {})

        return {
            "name": name,
            "members": members,
            "health_check": {
                "failure_count": health_check.get("failure-count"),
                "interval": health_check.get("interval"),
                "ping": health_check.get("ping"),
                "script": health_check.get("script"),
            },
            "transition_script": {
                "backup": transition_script.get("backup"),
                "fault": transition_script.get("fault"),
                "master": transition_script.get("master"),
                "stop": transition_script.get("stop"),
            },
        }

    def _parse_virtual_servers(self, vs_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        servers = []
        for name, vs_cfg in vs_config.items():
            real_servers = []
            for rs_addr, rs_cfg in vs_cfg.get("real-server", {}).items():
                rs_cfg = rs_cfg if isinstance(rs_cfg, dict) else {}
                health_check = rs_cfg.get("health-check", {}) or {}
                real_servers.append({
                    "address": rs_addr,
                    "port": rs_cfg.get("port"),
                    "connection_timeout": rs_cfg.get("connection-timeout"),
                    "health_check_script": health_check.get("script") if isinstance(health_check, dict) else None,
                })

            servers.append({
                "name": name,
                "address": vs_cfg.get("address"),
                "algorithm": vs_cfg.get("algorithm"),
                "delay_loop": vs_cfg.get("delay-loop"),
                "forward_method": vs_cfg.get("forward-method"),
                "fwmark": vs_cfg.get("fwmark"),
                "persistence_timeout": vs_cfg.get("persistence-timeout"),
                "port": vs_cfg.get("port"),
                "protocol": vs_cfg.get("protocol"),
                "real_servers": real_servers,
            })
        return servers
