"""
BGP Protocol Command Mapper

Handles BGP (Border Gateway Protocol) configuration commands.
Supports neighbors, address families, route filtering, and communities.

Version differences:
- VyOS 1.3 and earlier: set protocols bgp <asn> parameters router-id <value>
- VyOS 1.4+: set protocols bgp system-as <asn>, set protocols bgp parameters router-id <value>
"""

from typing import List, Dict, Any, Optional
from ..base import BaseFeatureMapper


class BGPMapper(BaseFeatureMapper):
    """BGP protocol mapper with all BGP configuration operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)
        # VyOS 1.4+ uses new BGP syntax without ASN in path
        self._use_new_syntax = self._is_version_14_or_newer(version)

    def _is_version_14_or_newer(self, version: str) -> bool:
        """Check if VyOS version is 1.4 or newer."""
        try:
            # Handle versions like "1.4", "1.5", "1.4.0", "rolling"
            if "rolling" in version.lower():
                return True  # Rolling releases use new syntax
            parts = version.split(".")
            major = int(parts[0])
            minor = int(parts[1]) if len(parts) > 1 else 0
            return major > 1 or (major == 1 and minor >= 4)
        except (ValueError, IndexError):
            return True  # Default to new syntax for unknown versions

    def _bgp_base(self, asn: str = None) -> List[str]:
        """Get BGP base path based on version."""
        if self._use_new_syntax:
            return ["protocols", "bgp"]
        else:
            return ["protocols", "bgp", asn] if asn else ["protocols", "bgp"]

    # ========================================================================
    # Basic BGP Configuration Paths
    # ========================================================================

    def get_system_as(self, asn: str) -> List[str]:
        """Get command path for setting BGP AS number (VyOS 1.4+)."""
        return ["protocols", "bgp", "system-as", asn]

    def get_bgp(self, asn: str) -> List[str]:
        """Get command path for creating BGP with AS number."""
        if self._use_new_syntax:
            return ["protocols", "bgp", "system-as", asn]
        return ["protocols", "bgp", asn]

    def get_bgp_delete(self, asn: str) -> List[str]:
        """Get command path for deleting entire BGP configuration."""
        if self._use_new_syntax:
            # VyOS 1.4+: delete the entire protocols bgp tree
            return ["protocols", "bgp"]
        # VyOS 1.3: delete protocols bgp <asn>
        return ["protocols", "bgp", asn]

    def get_router_id(self, asn: str, router_id: str) -> List[str]:
        """Get command path for setting BGP router ID."""
        if self._use_new_syntax:
            return ["protocols", "bgp", "parameters", "router-id", router_id]
        return ["protocols", "bgp", asn, "parameters", "router-id", router_id]

    def get_router_id_path(self, asn: str) -> List[str]:
        """Get command path for router ID (for deletion)."""
        if self._use_new_syntax:
            return ["protocols", "bgp", "parameters", "router-id"]
        return ["protocols", "bgp", asn, "parameters", "router-id"]

    def get_log_neighbor_changes(self, asn: str) -> List[str]:
        """Get command path for logging neighbor changes."""
        if self._use_new_syntax:
            return ["protocols", "bgp", "parameters", "log-neighbor-changes"]
        return ["protocols", "bgp", asn, "parameters", "log-neighbor-changes"]

    def get_no_fast_external_failover(self, asn: str) -> List[str]:
        """Get command path for disabling fast external failover."""
        if self._use_new_syntax:
            return ["protocols", "bgp", "parameters", "no-fast-external-failover"]
        return ["protocols", "bgp", asn, "parameters", "no-fast-external-failover"]

    def get_default_local_pref(self, asn: str, value: str) -> List[str]:
        """Get command path for default local preference."""
        if self._use_new_syntax:
            return ["protocols", "bgp", "parameters", "default", "local-pref", value]
        return ["protocols", "bgp", asn, "parameters", "default", "local-pref", value]

    def get_confederation_identifier(self, asn: str, confed_id: str) -> List[str]:
        """Get command path for confederation identifier."""
        if self._use_new_syntax:
            return ["protocols", "bgp", "parameters", "confederation", "identifier", confed_id]
        return ["protocols", "bgp", asn, "parameters", "confederation", "identifier", confed_id]

    def get_confederation_peers(self, asn: str, peer_asn: str) -> List[str]:
        """Get command path for confederation peers."""
        if self._use_new_syntax:
            return ["protocols", "bgp", "parameters", "confederation", "peers", peer_asn]
        return ["protocols", "bgp", asn, "parameters", "confederation", "peers", peer_asn]

    # ========================================================================
    # Helper Methods
    # ========================================================================

    def _neighbor_base(self, asn: str, neighbor: str) -> List[str]:
        """Get base path for neighbor configuration."""
        if self._use_new_syntax:
            return ["protocols", "bgp", "neighbor", neighbor]
        return ["protocols", "bgp", asn, "neighbor", neighbor]

    def _peer_group_base(self, asn: str, group: str) -> List[str]:
        """Get base path for peer group configuration."""
        if self._use_new_syntax:
            return ["protocols", "bgp", "peer-group", group]
        return ["protocols", "bgp", asn, "peer-group", group]

    def _af_base(self, asn: str, family: str) -> List[str]:
        """Get base path for address family configuration."""
        if self._use_new_syntax:
            return ["protocols", "bgp", "address-family", family]
        return ["protocols", "bgp", asn, "address-family", family]

    # ========================================================================
    # Neighbor Configuration Paths
    # ========================================================================

    def get_neighbor(self, asn: str, neighbor: str) -> List[str]:
        """Get command path for creating a neighbor."""
        return self._neighbor_base(asn, neighbor)

    def get_neighbor_remote_as(self, asn: str, neighbor: str, remote_as: str) -> List[str]:
        """Get command path for neighbor remote AS."""
        return self._neighbor_base(asn, neighbor) + ["remote-as", remote_as]

    def get_neighbor_remote_as_path(self, asn: str, neighbor: str) -> List[str]:
        """Get command path for remote AS (for deletion)."""
        return self._neighbor_base(asn, neighbor) + ["remote-as"]

    def get_neighbor_description(self, asn: str, neighbor: str, description: str) -> List[str]:
        """Get command path for neighbor description."""
        return self._neighbor_base(asn, neighbor) + ["description", description]

    def get_neighbor_description_path(self, asn: str, neighbor: str) -> List[str]:
        """Get command path for neighbor description (for deletion)."""
        return self._neighbor_base(asn, neighbor) + ["description"]

    def get_neighbor_shutdown(self, asn: str, neighbor: str) -> List[str]:
        """Get command path for shutting down a neighbor."""
        return self._neighbor_base(asn, neighbor) + ["shutdown"]

    def get_neighbor_update_source(self, asn: str, neighbor: str, source: str) -> List[str]:
        """Get command path for neighbor update source."""
        return self._neighbor_base(asn, neighbor) + ["update-source", source]

    def get_neighbor_update_source_path(self, asn: str, neighbor: str) -> List[str]:
        """Get command path for update source (for deletion)."""
        return self._neighbor_base(asn, neighbor) + ["update-source"]

    def get_neighbor_ebgp_multihop(self, asn: str, neighbor: str, hops: str) -> List[str]:
        """Get command path for eBGP multihop."""
        return self._neighbor_base(asn, neighbor) + ["ebgp-multihop", hops]

    def get_neighbor_ebgp_multihop_path(self, asn: str, neighbor: str) -> List[str]:
        """Get command path for eBGP multihop (for deletion)."""
        return self._neighbor_base(asn, neighbor) + ["ebgp-multihop"]

    def get_neighbor_password(self, asn: str, neighbor: str, password: str) -> List[str]:
        """Get command path for neighbor password (MD5 auth)."""
        return self._neighbor_base(asn, neighbor) + ["password", password]

    def get_neighbor_password_path(self, asn: str, neighbor: str) -> List[str]:
        """Get command path for password (for deletion)."""
        return self._neighbor_base(asn, neighbor) + ["password"]

    def get_neighbor_passive(self, asn: str, neighbor: str) -> List[str]:
        """Get command path for passive neighbor."""
        return self._neighbor_base(asn, neighbor) + ["passive"]

    def get_neighbor_disable_connected_check(self, asn: str, neighbor: str) -> List[str]:
        """Get command path for disabling connected check."""
        return self._neighbor_base(asn, neighbor) + ["disable-connected-check"]

    def get_neighbor_timers_holdtime(self, asn: str, neighbor: str, holdtime: str) -> List[str]:
        """Get command path for neighbor hold time."""
        return self._neighbor_base(asn, neighbor) + ["timers", "holdtime", holdtime]

    def get_neighbor_timers_keepalive(self, asn: str, neighbor: str, keepalive: str) -> List[str]:
        """Get command path for neighbor keepalive."""
        return self._neighbor_base(asn, neighbor) + ["timers", "keepalive", keepalive]

    def get_neighbor_timers_path(self, asn: str, neighbor: str) -> List[str]:
        """Get command path for timers (for deletion)."""
        return self._neighbor_base(asn, neighbor) + ["timers"]

    # BFD
    def get_neighbor_bfd(self, asn: str, neighbor: str) -> List[str]:
        """Get command path for enabling BFD for neighbor."""
        return self._neighbor_base(asn, neighbor) + ["bfd"]

    def get_neighbor_bfd_check_control_plane_failure(self, asn: str, neighbor: str) -> List[str]:
        """Get command path for BFD control plane failure check."""
        return self._neighbor_base(asn, neighbor) + ["bfd", "check-control-plane-failure"]

    # ========================================================================
    # Peer Group Configuration Paths
    # ========================================================================

    def get_peer_group(self, asn: str, group: str) -> List[str]:
        """Get command path for creating a peer group."""
        return self._peer_group_base(asn, group)

    def get_peer_group_remote_as(self, asn: str, group: str, remote_as: str) -> List[str]:
        """Get command path for peer group remote AS."""
        return self._peer_group_base(asn, group) + ["remote-as", remote_as]

    def get_peer_group_description(self, asn: str, group: str, description: str) -> List[str]:
        """Get command path for peer group description."""
        return self._peer_group_base(asn, group) + ["description", description]

    def get_peer_group_update_source(self, asn: str, group: str, source: str) -> List[str]:
        """Get command path for peer group update source."""
        return self._peer_group_base(asn, group) + ["update-source", source]

    def get_peer_group_ebgp_multihop(self, asn: str, group: str, hops: str) -> List[str]:
        """Get command path for peer group eBGP multihop."""
        return self._peer_group_base(asn, group) + ["ebgp-multihop", hops]

    def get_peer_group_passive(self, asn: str, group: str) -> List[str]:
        """Get command path for peer group passive mode."""
        return self._peer_group_base(asn, group) + ["passive"]

    def get_neighbor_peer_group(self, asn: str, neighbor: str, group: str) -> List[str]:
        """Get command path for assigning neighbor to peer group."""
        return self._neighbor_base(asn, neighbor) + ["peer-group", group]

    # ========================================================================
    # Address Family Configuration Paths
    # ========================================================================

    def get_address_family(self, asn: str, family: str) -> List[str]:
        """Get command path for address family (ipv4-unicast, ipv6-unicast, l2vpn-evpn)."""
        return self._af_base(asn, family)

    def get_af_neighbor(self, asn: str, family: str, neighbor: str) -> List[str]:
        """Get command path for address family neighbor."""
        return self._af_base(asn, family) + ["neighbor", neighbor]

    def get_af_neighbor_activate(self, asn: str, family: str, neighbor: str) -> List[str]:
        """Get command path for activating neighbor in address family."""
        # In some VyOS versions, neighbors are activated by default
        # This is used when explicit activation is needed
        return self._af_base(asn, family) + ["neighbor", neighbor]

    def get_af_neighbor_route_map_import(self, asn: str, family: str, neighbor: str, route_map: str) -> List[str]:
        """Get command path for neighbor import route-map."""
        return self._af_base(asn, family) + ["neighbor", neighbor, "route-map", "import", route_map]

    def get_af_neighbor_route_map_export(self, asn: str, family: str, neighbor: str, route_map: str) -> List[str]:
        """Get command path for neighbor export route-map."""
        return self._af_base(asn, family) + ["neighbor", neighbor, "route-map", "export", route_map]

    def get_af_neighbor_prefix_list_import(self, asn: str, family: str, neighbor: str, prefix_list: str) -> List[str]:
        """Get command path for neighbor import prefix-list."""
        return self._af_base(asn, family) + ["neighbor", neighbor, "prefix-list", "import", prefix_list]

    def get_af_neighbor_prefix_list_export(self, asn: str, family: str, neighbor: str, prefix_list: str) -> List[str]:
        """Get command path for neighbor export prefix-list."""
        return self._af_base(asn, family) + ["neighbor", neighbor, "prefix-list", "export", prefix_list]

    def get_af_neighbor_soft_reconfiguration_inbound(self, asn: str, family: str, neighbor: str) -> List[str]:
        """Get command path for soft reconfiguration inbound."""
        return self._af_base(asn, family) + ["neighbor", neighbor, "soft-reconfiguration", "inbound"]

    def get_af_neighbor_maximum_prefix(self, asn: str, family: str, neighbor: str, max_prefix: str) -> List[str]:
        """Get command path for maximum prefix limit."""
        return self._af_base(asn, family) + ["neighbor", neighbor, "maximum-prefix", max_prefix]

    def get_af_neighbor_default_originate(self, asn: str, family: str, neighbor: str) -> List[str]:
        """Get command path for default originate."""
        return self._af_base(asn, family) + ["neighbor", neighbor, "default-originate"]

    def get_af_neighbor_route_reflector_client(self, asn: str, family: str, neighbor: str) -> List[str]:
        """Get command path for route reflector client."""
        return self._af_base(asn, family) + ["neighbor", neighbor, "route-reflector-client"]

    def get_af_neighbor_next_hop_self(self, asn: str, family: str, neighbor: str) -> List[str]:
        """Get command path for next-hop-self."""
        return self._af_base(asn, family) + ["neighbor", neighbor, "nexthop-self"]

    def get_af_neighbor_remove_private_as(self, asn: str, family: str, neighbor: str) -> List[str]:
        """Get command path for remove-private-as."""
        return self._af_base(asn, family) + ["neighbor", neighbor, "remove-private-as"]

    def get_af_neighbor_allowas_in(self, asn: str, family: str, neighbor: str, number: str) -> List[str]:
        """Get command path for allowas-in."""
        return self._af_base(asn, family) + ["neighbor", neighbor, "allowas-in", "number", number]

    def get_af_neighbor_as_override(self, asn: str, family: str, neighbor: str) -> List[str]:
        """Get command path for as-override."""
        return self._af_base(asn, family) + ["neighbor", neighbor, "as-override"]

    # Network and redistribution
    def get_af_network(self, asn: str, family: str, network: str) -> List[str]:
        """Get command path for advertising a network."""
        return self._af_base(asn, family) + ["network", network]

    def get_af_network_route_map(self, asn: str, family: str, network: str, route_map: str) -> List[str]:
        """Get command path for network route-map."""
        return self._af_base(asn, family) + ["network", network, "route-map", route_map]

    def get_af_redistribute(self, asn: str, family: str, protocol: str) -> List[str]:
        """Get command path for redistributing a protocol."""
        return self._af_base(asn, family) + ["redistribute", protocol]

    def get_af_redistribute_route_map(self, asn: str, family: str, protocol: str, route_map: str) -> List[str]:
        """Get command path for redistribution route-map."""
        return self._af_base(asn, family) + ["redistribute", protocol, "route-map", route_map]

    def get_af_redistribute_metric(self, asn: str, family: str, protocol: str, metric: str) -> List[str]:
        """Get command path for redistribution metric."""
        return self._af_base(asn, family) + ["redistribute", protocol, "metric", metric]

    # Aggregate addresses
    def get_af_aggregate_address(self, asn: str, family: str, prefix: str) -> List[str]:
        """Get command path for aggregate address."""
        return self._af_base(asn, family) + ["aggregate-address", prefix]

    def get_af_aggregate_address_summary_only(self, asn: str, family: str, prefix: str) -> List[str]:
        """Get command path for aggregate address summary-only."""
        return self._af_base(asn, family) + ["aggregate-address", prefix, "summary-only"]

    def get_af_aggregate_address_as_set(self, asn: str, family: str, prefix: str) -> List[str]:
        """Get command path for aggregate address as-set."""
        return self._af_base(asn, family) + ["aggregate-address", prefix, "as-set"]

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_bgp_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse full BGP configuration from VyOS.

        Args:
            config: Raw BGP config dictionary from VyOS (under protocols > bgp)

        Returns:
            Parsed BGP configuration as dictionary
        """
        if not config:
            return {"configured": False, "asn": None, "neighbors": [], "networks": []}

        # VyOS 1.4+ uses system-as, older versions use ASN as key
        asn = None
        bgp_config = {}

        # Check for VyOS 1.4+ format (system-as at top level)
        if "system-as" in config:
            asn = config.get("system-as")
            bgp_config = config
        else:
            # Old format: BGP config is keyed by ASN
            for key, value in config.items():
                if isinstance(value, dict):
                    asn = key
                    bgp_config = value
                    break

        if not asn:
            return {"configured": False, "asn": None, "neighbors": [], "networks": []}

        # Parse parameters
        parameters = bgp_config.get("parameters", {})
        router_id = parameters.get("router-id")

        # Parse neighbors
        neighbors = self._parse_neighbors(bgp_config.get("neighbor", {}))

        # Parse peer groups
        peer_groups = self._parse_peer_groups(bgp_config.get("peer-group", {}))

        # Parse address families
        address_families = self._parse_address_families(bgp_config.get("address-family", {}))

        return {
            "configured": True,
            "asn": asn,
            "router_id": router_id,
            "log_neighbor_changes": "log-neighbor-changes" in parameters,
            "no_fast_external_failover": "no-fast-external-failover" in parameters,
            "neighbors": neighbors,
            "peer_groups": peer_groups,
            "address_families": address_families,
            "parameters": parameters,
        }

    def _parse_neighbors(self, neighbors_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse neighbor configurations."""
        neighbors = []
        for neighbor_addr, neighbor_cfg in neighbors_config.items():
            if not isinstance(neighbor_cfg, dict):
                continue

            timers = neighbor_cfg.get("timers", {})
            bfd = neighbor_cfg.get("bfd", {})

            neighbors.append({
                "address": neighbor_addr,
                "remote_as": neighbor_cfg.get("remote-as"),
                "description": neighbor_cfg.get("description"),
                "shutdown": "shutdown" in neighbor_cfg,
                "update_source": neighbor_cfg.get("update-source"),
                "ebgp_multihop": neighbor_cfg.get("ebgp-multihop"),
                "password": neighbor_cfg.get("password"),
                "passive": "passive" in neighbor_cfg,
                "disable_connected_check": "disable-connected-check" in neighbor_cfg,
                "peer_group": neighbor_cfg.get("peer-group"),
                "timers": {
                    "holdtime": timers.get("holdtime"),
                    "keepalive": timers.get("keepalive"),
                } if timers else None,
                "bfd": {
                    "enabled": bool(bfd) or "bfd" in neighbor_cfg,
                    "check_control_plane_failure": "check-control-plane-failure" in bfd if isinstance(bfd, dict) else False,
                } if bfd or "bfd" in neighbor_cfg else None,
            })

        return neighbors

    def _parse_peer_groups(self, peer_groups_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse peer group configurations."""
        peer_groups = []
        for group_name, group_cfg in peer_groups_config.items():
            if not isinstance(group_cfg, dict):
                continue

            peer_groups.append({
                "name": group_name,
                "remote_as": group_cfg.get("remote-as"),
                "description": group_cfg.get("description"),
                "update_source": group_cfg.get("update-source"),
                "ebgp_multihop": group_cfg.get("ebgp-multihop"),
                "passive": "passive" in group_cfg,
            })

        return peer_groups

    def _parse_address_families(self, af_config: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """Parse address family configurations."""
        address_families = {}
        for af_name, af_cfg in af_config.items():
            if not isinstance(af_cfg, dict):
                continue

            # Parse networks
            networks = []
            for network, net_cfg in af_cfg.get("network", {}).items():
                if isinstance(net_cfg, dict):
                    networks.append({
                        "prefix": network,
                        "route_map": net_cfg.get("route-map"),
                    })
                else:
                    networks.append({"prefix": network, "route_map": None})

            # Parse redistributions
            redistributions = []
            for protocol, redist_cfg in af_cfg.get("redistribute", {}).items():
                if isinstance(redist_cfg, dict):
                    redistributions.append({
                        "protocol": protocol,
                        "route_map": redist_cfg.get("route-map"),
                        "metric": redist_cfg.get("metric"),
                    })
                else:
                    redistributions.append({"protocol": protocol, "route_map": None, "metric": None})

            # Parse aggregate addresses
            aggregates = []
            for prefix, agg_cfg in af_cfg.get("aggregate-address", {}).items():
                if isinstance(agg_cfg, dict):
                    aggregates.append({
                        "prefix": prefix,
                        "summary_only": "summary-only" in agg_cfg,
                        "as_set": "as-set" in agg_cfg,
                    })
                else:
                    aggregates.append({"prefix": prefix, "summary_only": False, "as_set": False})

            # Parse neighbor settings within address family
            af_neighbors = []
            for neighbor, neighbor_cfg in af_cfg.get("neighbor", {}).items():
                if isinstance(neighbor_cfg, dict):
                    route_map = neighbor_cfg.get("route-map", {})
                    prefix_list = neighbor_cfg.get("prefix-list", {})

                    af_neighbors.append({
                        "address": neighbor,
                        "route_map_import": route_map.get("import"),
                        "route_map_export": route_map.get("export"),
                        "prefix_list_import": prefix_list.get("import"),
                        "prefix_list_export": prefix_list.get("export"),
                        "soft_reconfiguration_inbound": "soft-reconfiguration" in neighbor_cfg,
                        "maximum_prefix": neighbor_cfg.get("maximum-prefix"),
                        "default_originate": "default-originate" in neighbor_cfg,
                        "route_reflector_client": "route-reflector-client" in neighbor_cfg,
                        "next_hop_self": "nexthop-self" in neighbor_cfg,
                        "remove_private_as": "remove-private-as" in neighbor_cfg,
                        "as_override": "as-override" in neighbor_cfg,
                    })

            address_families[af_name] = {
                "networks": networks,
                "redistributions": redistributions,
                "aggregates": aggregates,
                "neighbors": af_neighbors,
            }

        return address_families
