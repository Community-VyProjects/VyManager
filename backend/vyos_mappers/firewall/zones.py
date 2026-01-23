"""
Firewall Zones Mapper

Maps VyOS firewall zone configuration to/from API-friendly format.
Zone-based policy provides a way to define firewall rules between zones.
"""

from typing import Dict, Any, List, Optional


class ZonesMapper:
    """Maps VyOS zone-based firewall configuration."""

    CONFIG_PATH = ["firewall", "zone"]

    @staticmethod
    def get_config_paths() -> Dict[str, List[str]]:
        """Return configuration paths for zone-based firewall."""
        return {
            "zones": ["firewall", "zone"],
        }

    @staticmethod
    def parse_zone(zone_name: str, zone_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse a single zone configuration."""
        zone = {
            "name": zone_name,
            "description": zone_data.get("description"),
            "default_action": zone_data.get("default-action"),
            "interfaces": [],
            "from_zones": [],
            "intra_zone_filtering": None,
        }

        # Parse interfaces
        if "interface" in zone_data:
            interfaces = zone_data["interface"]
            if isinstance(interfaces, list):
                zone["interfaces"] = interfaces
            elif isinstance(interfaces, str):
                zone["interfaces"] = [interfaces]

        # Parse from-zone policies
        if "from" in zone_data:
            from_data = zone_data["from"]
            if isinstance(from_data, dict):
                for from_zone_name, from_config in from_data.items():
                    from_entry = {
                        "zone": from_zone_name,
                        "firewall": {
                            "ipv4_ruleset": from_config.get("firewall", {}).get("name"),
                            "ipv6_ruleset": from_config.get("firewall", {}).get("ipv6-name"),
                        }
                    }
                    zone["from_zones"].append(from_entry)

        # Parse intra-zone filtering (traffic within the same zone)
        if "intra-zone-filtering" in zone_data:
            intra = zone_data["intra-zone-filtering"]
            if isinstance(intra, dict):
                zone["intra_zone_filtering"] = {
                    "action": intra.get("action"),
                    "firewall": {
                        "ipv4_ruleset": intra.get("firewall", {}).get("name"),
                        "ipv6_ruleset": intra.get("firewall", {}).get("ipv6-name"),
                    }
                }

        return zone

    @classmethod
    def parse_config(cls, full_config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse VyOS zone configuration into API format."""
        zones = []
        zones_data = full_config.get("firewall", {}).get("zone", {})

        if isinstance(zones_data, dict):
            for zone_name, zone_config in zones_data.items():
                if isinstance(zone_config, dict):
                    zones.append(cls.parse_zone(zone_name, zone_config))

        return {"zones": zones}

    @staticmethod
    def to_vyos_commands(zone: Dict[str, Any], operation: str = "set") -> List[str]:
        """
        Generate VyOS commands for zone configuration.

        Args:
            zone: Zone configuration dict
            operation: 'set' or 'delete'
        """
        commands = []
        zone_name = zone["name"]
        base = f"firewall zone {zone_name}"

        if operation == "delete":
            return [f"delete {base}"]

        # Description
        if zone.get("description"):
            commands.append(f"set {base} description '{zone['description']}'")

        # Default action
        if zone.get("default_action"):
            commands.append(f"set {base} default-action {zone['default_action']}")

        # Interfaces
        for interface in zone.get("interfaces", []):
            commands.append(f"set {base} interface {interface}")

        # From-zone policies
        for from_entry in zone.get("from_zones", []):
            from_zone = from_entry["zone"]
            firewall = from_entry.get("firewall", {})

            if firewall.get("ipv4_ruleset"):
                commands.append(
                    f"set {base} from {from_zone} firewall name {firewall['ipv4_ruleset']}"
                )
            if firewall.get("ipv6_ruleset"):
                commands.append(
                    f"set {base} from {from_zone} firewall ipv6-name {firewall['ipv6_ruleset']}"
                )

        # Intra-zone filtering
        intra = zone.get("intra_zone_filtering")
        if intra:
            if intra.get("action"):
                commands.append(f"set {base} intra-zone-filtering action {intra['action']}")
            firewall = intra.get("firewall", {})
            if firewall.get("ipv4_ruleset"):
                commands.append(
                    f"set {base} intra-zone-filtering firewall name {firewall['ipv4_ruleset']}"
                )
            if firewall.get("ipv6_ruleset"):
                commands.append(
                    f"set {base} intra-zone-filtering firewall ipv6-name {firewall['ipv6_ruleset']}"
                )

        return commands

    @staticmethod
    def generate_policy_matrix(zones: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Generate a zone-to-zone policy matrix for display.

        Returns a list of policy entries showing traffic flow between zones.
        """
        policies = []
        zone_names = [z["name"] for z in zones]

        for zone in zones:
            # Traffic from other zones to this zone
            for from_entry in zone.get("from_zones", []):
                policies.append({
                    "from_zone": from_entry["zone"],
                    "to_zone": zone["name"],
                    "ipv4_ruleset": from_entry.get("firewall", {}).get("ipv4_ruleset"),
                    "ipv6_ruleset": from_entry.get("firewall", {}).get("ipv6_ruleset"),
                    "type": "inter-zone",
                })

            # Intra-zone traffic
            intra = zone.get("intra_zone_filtering")
            if intra:
                policies.append({
                    "from_zone": zone["name"],
                    "to_zone": zone["name"],
                    "action": intra.get("action"),
                    "ipv4_ruleset": intra.get("firewall", {}).get("ipv4_ruleset"),
                    "ipv6_ruleset": intra.get("firewall", {}).get("ipv6_ruleset"),
                    "type": "intra-zone",
                })

        return policies
