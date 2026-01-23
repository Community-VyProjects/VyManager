"""
QoS (Quality of Service) / Traffic Policy Mapper for VyOS

Provides path generation and configuration parsing for QoS policies.
Supports: Shaper, Rate-Control, Limiter, FQ-CoDel, Fair-Queue,
Priority-Queue, Round-Robin, Network-Emulator, Random-Detect, CAKE, Drop-Tail.
"""

from typing import Dict, List, Any, Optional


class QoSMapper:
    """Mapper for VyOS QoS/Traffic Policy CLI commands."""

    def __init__(self, version: str = "1.4"):
        self.version = version
        # VyOS 1.4+ uses 'qos' instead of 'traffic-policy'
        self.prefix = "qos"

    # =========================================================================
    # Base Policy Commands
    # =========================================================================

    def get_policy_base(self, policy_type: str, name: str) -> List[str]:
        """Base path for a policy."""
        return [self.prefix, "policy", policy_type, name]

    def get_policy_description(self, policy_type: str, name: str, description: str) -> List[str]:
        """Set policy description."""
        return [*self.get_policy_base(policy_type, name), "description", description]

    # =========================================================================
    # Shaper Policy (HTB)
    # =========================================================================

    def get_shaper_bandwidth(self, name: str, bandwidth: str) -> List[str]:
        """Set shaper total bandwidth."""
        return [*self.get_policy_base("shaper", name), "bandwidth", bandwidth]

    def get_shaper_class(self, name: str, class_id: str) -> List[str]:
        """Base path for shaper class."""
        return [*self.get_policy_base("shaper", name), "class", class_id]

    def get_shaper_class_bandwidth(self, name: str, class_id: str, bandwidth: str) -> List[str]:
        """Set guaranteed bandwidth for class."""
        return [*self.get_shaper_class(name, class_id), "bandwidth", bandwidth]

    def get_shaper_class_ceiling(self, name: str, class_id: str, ceiling: str) -> List[str]:
        """Set maximum bandwidth for class."""
        return [*self.get_shaper_class(name, class_id), "ceiling", ceiling]

    def get_shaper_class_priority(self, name: str, class_id: str, priority: str) -> List[str]:
        """Set class priority (0-7)."""
        return [*self.get_shaper_class(name, class_id), "priority", priority]

    def get_shaper_class_burst(self, name: str, class_id: str, burst: str) -> List[str]:
        """Set class burst size."""
        return [*self.get_shaper_class(name, class_id), "burst", burst]

    def get_shaper_class_queue_type(self, name: str, class_id: str, queue_type: str) -> List[str]:
        """Set class queue type."""
        return [*self.get_shaper_class(name, class_id), "queue-type", queue_type]

    def get_shaper_class_match(self, name: str, class_id: str, match_name: str) -> List[str]:
        """Base path for class match rule."""
        return [*self.get_shaper_class(name, class_id), "match", match_name]

    def get_shaper_class_match_ip_source(self, name: str, class_id: str, match_name: str, address: str) -> List[str]:
        """Match IP source address."""
        return [*self.get_shaper_class_match(name, class_id, match_name), "ip", "source", "address", address]

    def get_shaper_class_match_ip_dest(self, name: str, class_id: str, match_name: str, address: str) -> List[str]:
        """Match IP destination address."""
        return [*self.get_shaper_class_match(name, class_id, match_name), "ip", "destination", "address", address]

    def get_shaper_class_match_ip_dscp(self, name: str, class_id: str, match_name: str, dscp: str) -> List[str]:
        """Match DSCP value."""
        return [*self.get_shaper_class_match(name, class_id, match_name), "ip", "dscp", dscp]

    def get_shaper_class_match_ip_protocol(self, name: str, class_id: str, match_name: str, protocol: str) -> List[str]:
        """Match IP protocol."""
        return [*self.get_shaper_class_match(name, class_id, match_name), "ip", "protocol", protocol]

    def get_shaper_class_match_ip_source_port(self, name: str, class_id: str, match_name: str, port: str) -> List[str]:
        """Match source port."""
        return [*self.get_shaper_class_match(name, class_id, match_name), "ip", "source", "port", port]

    def get_shaper_class_match_ip_dest_port(self, name: str, class_id: str, match_name: str, port: str) -> List[str]:
        """Match destination port."""
        return [*self.get_shaper_class_match(name, class_id, match_name), "ip", "destination", "port", port]

    def get_shaper_class_set_dscp(self, name: str, class_id: str, dscp: str) -> List[str]:
        """Set DSCP marking for class."""
        return [*self.get_shaper_class(name, class_id), "set-dscp", dscp]

    def get_shaper_default_bandwidth(self, name: str, bandwidth: str) -> List[str]:
        """Set default class bandwidth."""
        return [*self.get_policy_base("shaper", name), "default", "bandwidth", bandwidth]

    def get_shaper_default_ceiling(self, name: str, ceiling: str) -> List[str]:
        """Set default class ceiling."""
        return [*self.get_policy_base("shaper", name), "default", "ceiling", ceiling]

    def get_shaper_default_queue_type(self, name: str, queue_type: str) -> List[str]:
        """Set default class queue type."""
        return [*self.get_policy_base("shaper", name), "default", "queue-type", queue_type]

    # =========================================================================
    # Rate-Control Policy (TBF)
    # =========================================================================

    def get_rate_control_bandwidth(self, name: str, bandwidth: str) -> List[str]:
        """Set rate-control bandwidth."""
        return [*self.get_policy_base("rate-control", name), "bandwidth", bandwidth]

    def get_rate_control_burst(self, name: str, burst: str) -> List[str]:
        """Set rate-control burst."""
        return [*self.get_policy_base("rate-control", name), "burst", burst]

    def get_rate_control_latency(self, name: str, latency: str) -> List[str]:
        """Set rate-control latency."""
        return [*self.get_policy_base("rate-control", name), "latency", latency]

    # =========================================================================
    # Limiter Policy (Ingress Policer)
    # =========================================================================

    def get_limiter_class(self, name: str, class_id: str) -> List[str]:
        """Base path for limiter class."""
        return [*self.get_policy_base("limiter", name), "class", class_id]

    def get_limiter_class_bandwidth(self, name: str, class_id: str, bandwidth: str) -> List[str]:
        """Set limiter class bandwidth."""
        return [*self.get_limiter_class(name, class_id), "bandwidth", bandwidth]

    def get_limiter_class_burst(self, name: str, class_id: str, burst: str) -> List[str]:
        """Set limiter class burst."""
        return [*self.get_limiter_class(name, class_id), "burst", burst]

    def get_limiter_class_priority(self, name: str, class_id: str, priority: str) -> List[str]:
        """Set limiter class priority."""
        return [*self.get_limiter_class(name, class_id), "priority", priority]

    def get_limiter_default_bandwidth(self, name: str, bandwidth: str) -> List[str]:
        """Set limiter default bandwidth."""
        return [*self.get_policy_base("limiter", name), "default", "bandwidth", bandwidth]

    def get_limiter_default_burst(self, name: str, burst: str) -> List[str]:
        """Set limiter default burst."""
        return [*self.get_policy_base("limiter", name), "default", "burst", burst]

    # =========================================================================
    # FQ-CoDel Policy
    # =========================================================================

    def get_fq_codel_quantum(self, name: str, quantum: str) -> List[str]:
        """Set FQ-CoDel quantum."""
        return [*self.get_policy_base("fq-codel", name), "codel-quantum", quantum]

    def get_fq_codel_flows(self, name: str, flows: str) -> List[str]:
        """Set FQ-CoDel flows."""
        return [*self.get_policy_base("fq-codel", name), "flows", flows]

    def get_fq_codel_interval(self, name: str, interval: str) -> List[str]:
        """Set FQ-CoDel interval."""
        return [*self.get_policy_base("fq-codel", name), "interval", interval]

    def get_fq_codel_queue_limit(self, name: str, limit: str) -> List[str]:
        """Set FQ-CoDel queue limit."""
        return [*self.get_policy_base("fq-codel", name), "queue-limit", limit]

    def get_fq_codel_target(self, name: str, target: str) -> List[str]:
        """Set FQ-CoDel target."""
        return [*self.get_policy_base("fq-codel", name), "target", target]

    # =========================================================================
    # CAKE Policy
    # =========================================================================

    def get_cake_bandwidth(self, name: str, bandwidth: str) -> List[str]:
        """Set CAKE bandwidth."""
        return [*self.get_policy_base("cake", name), "bandwidth", bandwidth]

    def get_cake_flow_isolation(self, name: str, mode: str) -> List[str]:
        """Set CAKE flow isolation mode."""
        return [*self.get_policy_base("cake", name), "flow-isolation", mode]

    def get_cake_rtt(self, name: str, rtt: str) -> List[str]:
        """Set CAKE RTT."""
        return [*self.get_policy_base("cake", name), "rtt", rtt]

    # =========================================================================
    # Priority Queue Policy
    # =========================================================================

    def get_priority_queue_class(self, name: str, class_id: str) -> List[str]:
        """Base path for priority queue class."""
        return [*self.get_policy_base("priority-queue", name), "class", class_id]

    def get_priority_queue_class_queue_type(self, name: str, class_id: str, queue_type: str) -> List[str]:
        """Set priority queue class queue type."""
        return [*self.get_priority_queue_class(name, class_id), "queue-type", queue_type]

    def get_priority_queue_class_queue_limit(self, name: str, class_id: str, limit: str) -> List[str]:
        """Set priority queue class queue limit."""
        return [*self.get_priority_queue_class(name, class_id), "queue-limit", limit]

    # =========================================================================
    # Round-Robin Policy (DRR)
    # =========================================================================

    def get_round_robin_class(self, name: str, class_id: str) -> List[str]:
        """Base path for round-robin class."""
        return [*self.get_policy_base("round-robin", name), "class", class_id]

    def get_round_robin_class_quantum(self, name: str, class_id: str, quantum: str) -> List[str]:
        """Set round-robin class quantum."""
        return [*self.get_round_robin_class(name, class_id), "quantum", quantum]

    def get_round_robin_class_queue_limit(self, name: str, class_id: str, limit: str) -> List[str]:
        """Set round-robin class queue limit."""
        return [*self.get_round_robin_class(name, class_id), "queue-limit", limit]

    def get_round_robin_class_queue_type(self, name: str, class_id: str, queue_type: str) -> List[str]:
        """Set round-robin class queue type."""
        return [*self.get_round_robin_class(name, class_id), "queue-type", queue_type]

    # =========================================================================
    # Network Emulator Policy
    # =========================================================================

    def get_network_emulator_bandwidth(self, name: str, bandwidth: str) -> List[str]:
        """Set network emulator bandwidth."""
        return [*self.get_policy_base("network-emulator", name), "bandwidth", bandwidth]

    def get_network_emulator_delay(self, name: str, delay: str) -> List[str]:
        """Set network emulator delay."""
        return [*self.get_policy_base("network-emulator", name), "delay", delay]

    def get_network_emulator_loss(self, name: str, loss: str) -> List[str]:
        """Set network emulator packet loss percentage."""
        return [*self.get_policy_base("network-emulator", name), "loss", loss]

    def get_network_emulator_corruption(self, name: str, corruption: str) -> List[str]:
        """Set network emulator corruption percentage."""
        return [*self.get_policy_base("network-emulator", name), "corruption", corruption]

    def get_network_emulator_reordering(self, name: str, reordering: str) -> List[str]:
        """Set network emulator reordering percentage."""
        return [*self.get_policy_base("network-emulator", name), "reordering", reordering]

    def get_network_emulator_queue_limit(self, name: str, limit: str) -> List[str]:
        """Set network emulator queue limit."""
        return [*self.get_policy_base("network-emulator", name), "queue-limit", limit]

    # =========================================================================
    # Drop-Tail Policy (PFIFO)
    # =========================================================================

    def get_drop_tail_queue_limit(self, name: str, limit: str) -> List[str]:
        """Set drop-tail queue limit."""
        return [*self.get_policy_base("drop-tail", name), "queue-limit", limit]

    # =========================================================================
    # Fair-Queue Policy (SFQ)
    # =========================================================================

    def get_fair_queue_hash_interval(self, name: str, interval: str) -> List[str]:
        """Set fair-queue hash interval."""
        return [*self.get_policy_base("fair-queue", name), "hash-interval", interval]

    def get_fair_queue_queue_limit(self, name: str, limit: str) -> List[str]:
        """Set fair-queue queue limit."""
        return [*self.get_policy_base("fair-queue", name), "queue-limit", limit]

    # =========================================================================
    # Random-Detect Policy (GRED)
    # =========================================================================

    def get_random_detect_bandwidth(self, name: str, bandwidth: str) -> List[str]:
        """Set random-detect bandwidth."""
        return [*self.get_policy_base("random-detect", name), "bandwidth", bandwidth]

    def get_random_detect_precedence(self, name: str, precedence: str) -> List[str]:
        """Base path for random-detect precedence."""
        return [*self.get_policy_base("random-detect", name), "precedence", precedence]

    def get_random_detect_precedence_avg_packet(self, name: str, precedence: str, size: str) -> List[str]:
        """Set precedence average packet size."""
        return [*self.get_random_detect_precedence(name, precedence), "average-packet", size]

    def get_random_detect_precedence_min_threshold(self, name: str, precedence: str, threshold: str) -> List[str]:
        """Set precedence minimum threshold."""
        return [*self.get_random_detect_precedence(name, precedence), "minimum-threshold", threshold]

    def get_random_detect_precedence_max_threshold(self, name: str, precedence: str, threshold: str) -> List[str]:
        """Set precedence maximum threshold."""
        return [*self.get_random_detect_precedence(name, precedence), "maximum-threshold", threshold]

    def get_random_detect_precedence_mark_probability(self, name: str, precedence: str, prob: str) -> List[str]:
        """Set precedence mark probability."""
        return [*self.get_random_detect_precedence(name, precedence), "mark-probability", prob]

    # =========================================================================
    # Interface Binding
    # =========================================================================

    def get_interface_egress(self, interface: str, policy: str) -> List[str]:
        """Apply policy to interface egress."""
        return [self.prefix, "interface", interface, "egress", policy]

    def get_interface_ingress(self, interface: str, policy: str) -> List[str]:
        """Apply policy to interface ingress."""
        return [self.prefix, "interface", interface, "ingress", policy]

    def get_interface_egress_path(self, interface: str) -> List[str]:
        """Path for interface egress policy."""
        return [self.prefix, "interface", interface, "egress"]

    def get_interface_ingress_path(self, interface: str) -> List[str]:
        """Path for interface ingress policy."""
        return [self.prefix, "interface", interface, "ingress"]

    # =========================================================================
    # Configuration Parsing
    # =========================================================================

    def parse_full_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse the full QoS configuration from VyOS.

        Args:
            config: Raw VyOS configuration dictionary

        Returns:
            Parsed QoS configuration
        """
        qos_config = config.get(self.prefix, {})

        result = {
            "configured": bool(qos_config),
            "policies": [],
            "interface_bindings": [],
        }

        # Parse policies
        policy_section = qos_config.get("policy", {})
        for policy_type, policies in policy_section.items():
            if isinstance(policies, dict):
                for policy_name, policy_data in policies.items():
                    parsed = self._parse_policy(policy_type, policy_name, policy_data)
                    result["policies"].append(parsed)

        # Parse interface bindings
        interface_section = qos_config.get("interface", {})
        for interface_name, bindings in interface_section.items():
            if isinstance(bindings, dict):
                binding = {
                    "interface": interface_name,
                    "egress": bindings.get("egress"),
                    "ingress": bindings.get("ingress"),
                }
                result["interface_bindings"].append(binding)

        return result

    def _parse_policy(self, policy_type: str, name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse a single QoS policy."""
        policy = {
            "name": name,
            "type": policy_type,
            "description": data.get("description"),
            "bandwidth": data.get("bandwidth"),
            "classes": [],
            "default": {},
        }

        # Parse type-specific fields
        if policy_type == "shaper":
            policy["classes"] = self._parse_shaper_classes(data.get("class", {}))
            policy["default"] = {
                "bandwidth": data.get("default", {}).get("bandwidth"),
                "ceiling": data.get("default", {}).get("ceiling"),
                "queue_type": data.get("default", {}).get("queue-type"),
            }

        elif policy_type == "rate-control":
            policy["burst"] = data.get("burst")
            policy["latency"] = data.get("latency")

        elif policy_type == "limiter":
            policy["classes"] = self._parse_limiter_classes(data.get("class", {}))
            policy["default"] = {
                "bandwidth": data.get("default", {}).get("bandwidth"),
                "burst": data.get("default", {}).get("burst"),
            }

        elif policy_type == "fq-codel":
            policy["codel_quantum"] = data.get("codel-quantum")
            policy["flows"] = data.get("flows")
            policy["interval"] = data.get("interval")
            policy["queue_limit"] = data.get("queue-limit")
            policy["target"] = data.get("target")

        elif policy_type == "cake":
            policy["flow_isolation"] = data.get("flow-isolation")
            policy["rtt"] = data.get("rtt")

        elif policy_type == "network-emulator":
            policy["delay"] = data.get("delay")
            policy["loss"] = data.get("loss")
            policy["corruption"] = data.get("corruption")
            policy["reordering"] = data.get("reordering")
            policy["queue_limit"] = data.get("queue-limit")
            policy["burst"] = data.get("burst")

        elif policy_type == "priority-queue":
            policy["classes"] = self._parse_priority_queue_classes(data.get("class", {}))

        elif policy_type == "round-robin":
            policy["classes"] = self._parse_round_robin_classes(data.get("class", {}))

        elif policy_type == "drop-tail":
            policy["queue_limit"] = data.get("queue-limit")

        elif policy_type == "fair-queue":
            policy["hash_interval"] = data.get("hash-interval")
            policy["queue_limit"] = data.get("queue-limit")

        elif policy_type == "random-detect":
            policy["precedences"] = self._parse_random_detect_precedences(data.get("precedence", {}))

        return policy

    def _parse_shaper_classes(self, class_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse shaper classes."""
        classes = []
        for class_id, data in class_data.items():
            if isinstance(data, dict):
                cls = {
                    "id": class_id,
                    "bandwidth": data.get("bandwidth"),
                    "ceiling": data.get("ceiling"),
                    "priority": data.get("priority"),
                    "burst": data.get("burst"),
                    "queue_type": data.get("queue-type"),
                    "set_dscp": data.get("set-dscp"),
                    "matches": self._parse_matches(data.get("match", {})),
                }
                classes.append(cls)
        return classes

    def _parse_limiter_classes(self, class_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse limiter classes."""
        classes = []
        for class_id, data in class_data.items():
            if isinstance(data, dict):
                cls = {
                    "id": class_id,
                    "bandwidth": data.get("bandwidth"),
                    "burst": data.get("burst"),
                    "priority": data.get("priority"),
                    "matches": self._parse_matches(data.get("match", {})),
                }
                classes.append(cls)
        return classes

    def _parse_priority_queue_classes(self, class_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse priority-queue classes."""
        classes = []
        for class_id, data in class_data.items():
            if isinstance(data, dict):
                cls = {
                    "id": class_id,
                    "queue_type": data.get("queue-type"),
                    "queue_limit": data.get("queue-limit"),
                    "matches": self._parse_matches(data.get("match", {})),
                }
                classes.append(cls)
        return classes

    def _parse_round_robin_classes(self, class_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse round-robin classes."""
        classes = []
        for class_id, data in class_data.items():
            if isinstance(data, dict):
                cls = {
                    "id": class_id,
                    "quantum": data.get("quantum"),
                    "queue_limit": data.get("queue-limit"),
                    "queue_type": data.get("queue-type"),
                    "matches": self._parse_matches(data.get("match", {})),
                }
                classes.append(cls)
        return classes

    def _parse_random_detect_precedences(self, prec_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse random-detect precedences."""
        precedences = []
        for prec_id, data in prec_data.items():
            if isinstance(data, dict):
                prec = {
                    "id": prec_id,
                    "average_packet": data.get("average-packet"),
                    "mark_probability": data.get("mark-probability"),
                    "minimum_threshold": data.get("minimum-threshold"),
                    "maximum_threshold": data.get("maximum-threshold"),
                    "queue_limit": data.get("queue-limit"),
                }
                precedences.append(prec)
        return precedences

    def _parse_matches(self, match_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse match rules."""
        matches = []
        for match_name, data in match_data.items():
            if isinstance(data, dict):
                match = {
                    "name": match_name,
                    "description": data.get("description"),
                    "interface": data.get("interface"),
                    "mark": data.get("mark"),
                    "vif": data.get("vif"),
                }

                # Parse IP match rules
                ip_data = data.get("ip", {})
                if ip_data:
                    match["ip"] = {
                        "dscp": ip_data.get("dscp"),
                        "protocol": ip_data.get("protocol"),
                        "source_address": ip_data.get("source", {}).get("address") if isinstance(ip_data.get("source"), dict) else None,
                        "source_port": ip_data.get("source", {}).get("port") if isinstance(ip_data.get("source"), dict) else None,
                        "destination_address": ip_data.get("destination", {}).get("address") if isinstance(ip_data.get("destination"), dict) else None,
                        "destination_port": ip_data.get("destination", {}).get("port") if isinstance(ip_data.get("destination"), dict) else None,
                    }

                # Parse IPv6 match rules
                ipv6_data = data.get("ipv6", {})
                if ipv6_data:
                    match["ipv6"] = {
                        "dscp": ipv6_data.get("dscp"),
                        "protocol": ipv6_data.get("protocol"),
                        "source_address": ipv6_data.get("source", {}).get("address") if isinstance(ipv6_data.get("source"), dict) else None,
                        "destination_address": ipv6_data.get("destination", {}).get("address") if isinstance(ipv6_data.get("destination"), dict) else None,
                    }

                # Parse Ethernet match rules
                ether_data = data.get("ether", {})
                if ether_data:
                    match["ether"] = {
                        "protocol": ether_data.get("protocol"),
                        "source": ether_data.get("source"),
                        "destination": ether_data.get("destination"),
                    }

                matches.append(match)
        return matches
