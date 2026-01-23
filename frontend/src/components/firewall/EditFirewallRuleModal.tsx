"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, RefreshCw } from "lucide-react";
import { firewallIPv4Service, type FirewallRule, type FirewallCapabilitiesResponse } from "@/lib/api/firewall-ipv4";
import { firewallIPv6Service } from "@/lib/api/firewall-ipv6";
import { firewallGroupsService, type FirewallGroup } from "@/lib/api/firewall-groups";
import { showService } from "@/lib/api/show";
import type { NetworkInterface } from "@/lib/api/interfaces";
import { CountryMultiSelect } from "./CountryMultiSelect";
import {
  getIPAddressError,
  getMACAddressError,
  getPortError,
} from "@/lib/validators/firewall";

interface EditFirewallRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  rule: FirewallRule;
  protocol?: "ipv4" | "ipv6";
  capabilities?: FirewallCapabilitiesResponse | null;
}

export function EditFirewallRuleModal({
  open,
  onOpenChange,
  onSuccess,
  rule,
  protocol = "ipv4",
  capabilities,
}: EditFirewallRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic fields
  const [description, setDescription] = useState("");
  const [action, setAction] = useState("accept");
  const [ruleProtocol, setRuleProtocol] = useState("");
  const [protocolInvert, setProtocolInvert] = useState(false);

  // Source fields
  const [sourceMode, setSourceMode] = useState<"any" | "address" | "group" | "geoip" | "mac">("any");
  const [sourceAddress, setSourceAddress] = useState("");
  const [sourceAddressInvert, setSourceAddressInvert] = useState(false);
  const [sourcePortMode, setSourcePortMode] = useState<"any" | "port" | "group">("any");
  const [sourcePort, setSourcePort] = useState("");
  const [sourcePortGroup, setSourcePortGroup] = useState("");
  const [sourceMac, setSourceMac] = useState("");
  const [sourceGeoipCountry, setSourceGeoipCountry] = useState<string[]>([]);
  const [sourceGeoipInverse, setSourceGeoipInverse] = useState(false);
  const [sourceGroupType, setSourceGroupType] = useState("");
  const [sourceGroupName, setSourceGroupName] = useState("");

  // Destination fields
  const [destMode, setDestMode] = useState<"any" | "address" | "group" | "geoip">("any");
  const [destAddress, setDestAddress] = useState("");
  const [destAddressInvert, setDestAddressInvert] = useState(false);
  const [destPortMode, setDestPortMode] = useState<"any" | "port" | "group">("any");
  const [destPort, setDestPort] = useState("");
  const [destPortGroup, setDestPortGroup] = useState("");
  const [destGeoipCountry, setDestGeoipCountry] = useState<string[]>([]);
  const [destGeoipInverse, setDestGeoipInverse] = useState(false);

  // Auto-adjust protocol when ports or port groups are used
  useEffect(() => {
    const hasPort = sourcePort.trim() || destPort.trim() || sourcePortGroup.trim() || destPortGroup.trim();
    const portCompatibleProtocols = ["tcp", "udp", "tcp_udp"];

    // If ports are used and protocol is not compatible (including empty string), set to tcp_udp
    if (hasPort && !portCompatibleProtocols.includes(ruleProtocol)) {
      setRuleProtocol("tcp_udp");
    }
  }, [sourcePort, destPort, sourcePortGroup, destPortGroup, ruleProtocol]);
  const [destGroupType, setDestGroupType] = useState("");
  const [destGroupName, setDestGroupName] = useState("");

  // State fields
  const [stateEstablished, setStateEstablished] = useState(false);
  const [stateNew, setStateNew] = useState(false);
  const [stateRelated, setStateRelated] = useState(false);
  const [stateInvalid, setStateInvalid] = useState(false);

  // Interface fields
  const [inboundInterface, setInboundInterface] = useState("");
  const [outboundInterface, setOutboundInterface] = useState("");

  // Advanced fields
  const [tcpFlags, setTcpFlags] = useState<Record<string, "disabled" | "enabled" | "not">>({
    syn: "disabled",
    ack: "disabled",
    fin: "disabled",
    rst: "disabled",
    psh: "disabled",
    urg: "disabled",
    ecn: "disabled",
    cwr: "disabled",
  });
  const [icmpTypeName, setIcmpTypeName] = useState("");
  const [jumpTarget, setJumpTarget] = useState("");
  const [dscp, setDscp] = useState("");
  const [mark, setMark] = useState("");
  const [ttl, setTtl] = useState("");

  // Flags
  const [disable, setDisable] = useState(false);
  const [log, setLog] = useState(false);

  // Validation errors
  const [sourceAddressError, setSourceAddressError] = useState<string | null>(null);
  const [destAddressError, setDestAddressError] = useState<string | null>(null);
  const [sourceMacError, setSourceMacError] = useState<string | null>(null);
  const [sourcePortError, setSourcePortError] = useState<string | null>(null);
  const [destPortError, setDestPortError] = useState<string | null>(null);

  // Data for dropdowns
  const [groups, setGroups] = useState<FirewallGroup[]>([]);
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [customChains, setCustomChains] = useState<string[]>([]);

  const loadGroups = async () => {
    try {
      const config = await firewallGroupsService.getConfig();

      // Load groups based on protocol
      if (protocol === "ipv4") {
        // IPv4: use address_groups and network_groups
        const allGroups = [
          ...config.address_groups,
          ...config.network_groups,
          ...config.port_groups,
          ...config.interface_groups,
          ...config.mac_groups,
          ...config.domain_groups,
          ...config.remote_groups,
        ];
        setGroups(allGroups);
      } else {
        // IPv6: use ipv6_address_groups and ipv6_network_groups
        const allGroups = [
          ...config.ipv6_address_groups,
          ...config.ipv6_network_groups,
          ...config.port_groups,
          ...config.interface_groups,
          ...config.mac_groups,
          ...config.domain_groups,
          ...config.remote_groups,
        ];
        setGroups(allGroups);
      }
    } catch (err) {
      console.error("Failed to load firewall groups:", err);
    }
  };

  const loadInterfaces = async () => {
    try {
      const response = await showService.getInterfaceCounters();
      if (response.interfaces) {
        // Map interface names to NetworkInterface objects
        const networkInterfaces: NetworkInterface[] = response.interfaces.map(i => ({
          name: i.interface,
          type: "ethernet" as const,
          addresses: [],
          description: null,
          vrf: null,
          "hw-id": null,
          "source-interface": null,
          authentication: null,
        }));
        setInterfaces(networkInterfaces);
      }
    } catch (err) {
      console.error("Failed to load interfaces:", err);
    }
  };

  const loadCustomChains = async () => {
    try {
      const service = protocol === "ipv4" ? firewallIPv4Service : firewallIPv6Service;
      const config = await service.getConfig();
      setCustomChains(config.custom_chains.map((c) => c.name));
    } catch (err) {
      console.error("Failed to load custom chains:", err);
    }
  };

  useEffect(() => {
    if (open && rule) {
      loadGroups();
      loadInterfaces();
      loadCustomChains();
      loadRuleData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rule]);

  // Auto-clear TCP flags when protocol changes away from TCP
  useEffect(() => {
    if (ruleProtocol !== "tcp") {
      const hasActiveTcpFlags = Object.values(tcpFlags).some(state => state !== "disabled");
      if (hasActiveTcpFlags) {
        // Reset all TCP flags to disabled
        setTcpFlags({
          syn: "disabled",
          ack: "disabled",
          fin: "disabled",
          rst: "disabled",
          psh: "disabled",
          urg: "disabled",
          ecn: "disabled",
          cwr: "disabled",
        });
      }
    }
  }, [ruleProtocol, tcpFlags]);

  // Auto-clear ICMP type when protocol changes away from ICMP
  useEffect(() => {
    if (ruleProtocol !== "icmp" && ruleProtocol !== "ipv6-icmp") {
      if (icmpTypeName) {
        setIcmpTypeName("");
      }
    }
  }, [ruleProtocol, icmpTypeName]);

  const loadRuleData = () => {
    setDescription(rule.description || "");
    setAction(rule.action || "accept");

    // Parse protocol and check for inversion
    const proto = rule.protocol || "";
    if (proto.startsWith("!")) {
      setRuleProtocol(proto.substring(1));
      setProtocolInvert(true);
    } else {
      setRuleProtocol(proto);
      setProtocolInvert(false);
    }

    // Source - determine mode and parse address/port
    // Reset defaults
    setSourceMode("any");
    setSourceAddress("");
    setSourceAddressInvert(false);
    setSourceGroupType("");
    setSourceGroupName("");
    setSourcePortMode("any");
    setSourcePort("");
    setSourcePortGroup("");
    setSourceMac("");
    setSourceGeoipCountry([]);
    setSourceGeoipInverse(false);

    // Determine source mode based on what's present
    if (rule.source?.mac_address) {
      // MAC address mode
      setSourceMode("mac");
      setSourceMac(rule.source.mac_address);
    } else if (rule.source?.geoip && rule.source.geoip.country_code && rule.source.geoip.country_code.length > 0) {
      // GeoIP mode
      setSourceMode("geoip");
      setSourceGeoipCountry(rule.source.geoip.country_code);
      setSourceGeoipInverse(rule.source.geoip.inverse_match || false);
    } else if (rule.source?.address) {
      // Address mode
      setSourceMode("address");
      const addr = rule.source.address;
      if (addr.startsWith("!")) {
        setSourceAddress(addr.substring(1));
        setSourceAddressInvert(true);
      } else {
        setSourceAddress(addr);
        setSourceAddressInvert(false);
      }
    } else if (rule.source?.group) {
      // Check if it's an address/network group (not port group)
      const entries = Object.entries(rule.source.group);
      let hasAddressGroup = false;
      for (const [type, name] of entries) {
        if (type !== "port-group") {
          // Address/network/domain/mac group
          setSourceMode("group");
          setSourceGroupType(type);
          setSourceGroupName(name);
          hasAddressGroup = true;
          break;
        }
      }
      if (!hasAddressGroup) {
        // Only port group present, keep mode as "any"
        setSourceMode("any");
      }
    }

    // Handle port separately (can coexist with any address mode)
    if (rule.source?.port) {
      setSourcePortMode("port");
      setSourcePort(rule.source.port);
    } else if (rule.source?.group && rule.source.group["port-group"]) {
      setSourcePortMode("group");
      setSourcePortGroup(rule.source.group["port-group"]);
    } else {
      setSourcePortMode("any");
    }

    // Destination - determine mode and parse address/port
    // Reset defaults
    setDestMode("any");
    setDestAddress("");
    setDestAddressInvert(false);
    setDestGroupType("");
    setDestGroupName("");
    setDestPortMode("any");
    setDestPort("");
    setDestPortGroup("");
    setDestGeoipCountry([]);
    setDestGeoipInverse(false);

    // Determine destination mode based on what's present
    if (rule.destination?.geoip && rule.destination.geoip.country_code && rule.destination.geoip.country_code.length > 0) {
      // GeoIP mode
      setDestMode("geoip");
      setDestGeoipCountry(rule.destination.geoip.country_code);
      setDestGeoipInverse(rule.destination.geoip.inverse_match || false);
    } else if (rule.destination?.address) {
      // Address mode
      setDestMode("address");
      const addr = rule.destination.address;
      if (addr.startsWith("!")) {
        setDestAddress(addr.substring(1));
        setDestAddressInvert(true);
      } else {
        setDestAddress(addr);
        setDestAddressInvert(false);
      }
    } else if (rule.destination?.group) {
      // Check if it's an address/network group (not port group)
      const entries = Object.entries(rule.destination.group);
      let hasAddressGroup = false;
      for (const [type, name] of entries) {
        if (type !== "port-group") {
          // Address/network/domain group
          setDestMode("group");
          setDestGroupType(type);
          setDestGroupName(name);
          hasAddressGroup = true;
          break;
        }
      }
      if (!hasAddressGroup) {
        // Only port group present, keep mode as "any"
        setDestMode("any");
      }
    }

    // Handle port separately (can coexist with any address mode)
    if (rule.destination?.port) {
      setDestPortMode("port");
      setDestPort(rule.destination.port);
    } else if (rule.destination?.group && rule.destination.group["port-group"]) {
      setDestPortMode("group");
      setDestPortGroup(rule.destination.group["port-group"]);
    } else {
      setDestPortMode("any");
    }

    // State
    setStateEstablished(rule.state?.established || false);
    setStateNew(rule.state?.new || false);
    setStateRelated(rule.state?.related || false);
    setStateInvalid(rule.state?.invalid || false);

    // Interface
    setInboundInterface(rule.interface?.inbound || "");
    setOutboundInterface(rule.interface?.outbound || "");

    // Advanced - TCP Flags
    const newTcpFlags: Record<string, "disabled" | "enabled" | "not"> = {
      syn: "disabled",
      ack: "disabled",
      fin: "disabled",
      rst: "disabled",
      psh: "disabled",
      urg: "disabled",
      ecn: "disabled",
      cwr: "disabled",
    };
    if (rule.tcp_flags) {
      // Handle both old array format and new object format
      if (Array.isArray(rule.tcp_flags)) {
        // Old format: ["syn", "ack", "!fin"]
        rule.tcp_flags.forEach((flag: string) => {
          if (flag.startsWith("!")) {
            const cleanFlag = flag.substring(1);
            if (cleanFlag in newTcpFlags) {
              newTcpFlags[cleanFlag] = "not";
            }
          } else if (flag in newTcpFlags) {
            newTcpFlags[flag] = "enabled";
          }
        });
      } else {
        // New format: {"syn": "enabled", "ack": "not"}
        Object.entries(rule.tcp_flags).forEach(([flag, state]) => {
          if (flag in newTcpFlags) {
            newTcpFlags[flag] = state as "disabled" | "enabled" | "not";
          }
        });
      }
    }
    setTcpFlags(newTcpFlags);

    // ICMP Type
    setIcmpTypeName(rule.icmp_type_name || "");
    setJumpTarget(rule.jump_target || "");
    setDscp(rule.packet_mods?.dscp || "");
    setMark(rule.packet_mods?.mark || "");
    setTtl(rule.packet_mods?.ttl || "");

    // Flags
    setDisable(rule.disable);
    setLog(rule.log);

    setError(null);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    // Clear previous validation errors
    setSourceAddressError(null);
    setDestAddressError(null);
    setSourceMacError(null);
    setSourcePortError(null);
    setDestPortError(null);

    // Validate inputs
    let hasValidationError = false;

    if (sourceMode === "address" && sourceAddress.trim()) {
      const error = getIPAddressError(sourceAddress.trim(), protocol);
      if (error) {
        setSourceAddressError(error);
        hasValidationError = true;
      }
    }

    if (destMode === "address" && destAddress.trim()) {
      const error = getIPAddressError(destAddress.trim(), protocol);
      if (error) {
        setDestAddressError(error);
        hasValidationError = true;
      }
    }

    if (sourceMode === "mac" && sourceMac.trim()) {
      const error = getMACAddressError(sourceMac.trim());
      if (error) {
        setSourceMacError(error);
        hasValidationError = true;
      }
    }

    if (sourcePortMode === "port" && sourcePort.trim()) {
      const error = getPortError(sourcePort.trim());
      if (error) {
        setSourcePortError(error);
        hasValidationError = true;
      }
    }

    if (destPortMode === "port" && destPort.trim()) {
      const error = getPortError(destPort.trim());
      if (error) {
        setDestPortError(error);
        hasValidationError = true;
      }
    }

    // Stop if validation failed
    if (hasValidationError) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build config object
      const config: Partial<FirewallRule> = {
        action,
      };

      if (description.trim()) {
        config.description = description.trim();
      }

      if (ruleProtocol && ruleProtocol !== "all") {
        config.protocol = protocolInvert ? `!${ruleProtocol}` : ruleProtocol;
      } else if ((ruleProtocol === "all" || ruleProtocol === "") && rule.protocol) {
        // Protocol changed to "all" or empty, but rule previously had a protocol - delete it
        config.protocol = null;
      }

      // Source
      const hasSourceAddress =
        (sourceMode === "address" && sourceAddress.trim()) ||
        (sourceMode === "group" && sourceGroupType && sourceGroupType !== "none" && sourceGroupName) ||
        (sourceMode === "geoip" && sourceGeoipCountry.length > 0) ||
        (sourceMode === "mac" && sourceMac.trim());

      const hasSourcePort =
        (sourcePortMode === "port" && sourcePort.trim()) ||
        (sourcePortMode === "group" && sourcePortGroup.trim());

      const hasSource = hasSourceAddress || hasSourcePort;

      // Check if we need to clear source (switching to "any" mode when rule had source before)
      const hadSource = rule.source && (
        rule.source.address ||
        rule.source.mac_address ||
        rule.source.geoip ||
        (rule.source.group && Object.keys(rule.source.group).some(k => k !== "port-group"))
      );

      if (hasSource || (sourceMode === "any" && hadSource)) {
        config.source = {};

        // Handle address mode - mutually exclusive with group, geoip, and mac
        if (sourceMode === "address" && sourceAddress.trim()) {
          const addr = sourceAddress.trim();
          config.source.address = sourceAddressInvert ? `!${addr}` : addr;
        } else if (sourceMode === "group" && sourceGroupType && sourceGroupType !== "none" && sourceGroupName) {
          // Address or network group - mutually exclusive with address, geoip, and mac
          config.source.group = { [sourceGroupType]: sourceGroupName };
        } else if (sourceMode === "geoip" && sourceGeoipCountry.length > 0) {
          // GeoIP - mutually exclusive with address, group, and mac
          config.source.geoip = {
            country_code: sourceGeoipCountry,
            inverse_match: sourceGeoipInverse || undefined,
          };
        } else if (sourceMode === "mac" && sourceMac.trim()) {
          // MAC address - mutually exclusive with address, group, and geoip
          config.source.mac_address = sourceMac.trim();
        }
        // If sourceMode === "any" and hadSource, config.source stays as {} which will trigger deletion

        // Handle port - either direct port or port group (separate from address/group/geoip/mac)
        if (sourcePortMode === "port" && sourcePort.trim()) {
          config.source.port = sourcePort.trim();
        } else if (sourcePortMode === "group" && sourcePortGroup.trim()) {
          // Port group - this is separate from address group
          if (!config.source.group) {
            config.source.group = {};
          }
          config.source.group["port-group"] = sourcePortGroup;
        }
      }

      // Destination
      const hasDestAddress =
        (destMode === "address" && destAddress.trim()) ||
        (destMode === "group" && destGroupType && destGroupType !== "none" && destGroupName) ||
        (destMode === "geoip" && destGeoipCountry.length > 0);

      const hasDestPort =
        (destPortMode === "port" && destPort.trim()) ||
        (destPortMode === "group" && destPortGroup.trim());

      const hasDest = hasDestAddress || hasDestPort;

      // Check if we need to clear destination (switching to "any" mode when rule had destination before)
      const hadDest = rule.destination && (
        rule.destination.address ||
        rule.destination.geoip ||
        (rule.destination.group && Object.keys(rule.destination.group).some(k => k !== "port-group"))
      );

      if (hasDest || (destMode === "any" && hadDest)) {
        config.destination = {};

        // Handle address mode - mutually exclusive with group and geoip
        if (destMode === "address" && destAddress.trim()) {
          const addr = destAddress.trim();
          config.destination.address = destAddressInvert ? `!${addr}` : addr;
        } else if (destMode === "group" && destGroupType && destGroupType !== "none" && destGroupName) {
          // Address or network group - mutually exclusive with address and geoip
          config.destination.group = { [destGroupType]: destGroupName };
        } else if (destMode === "geoip" && destGeoipCountry.length > 0) {
          // GeoIP - mutually exclusive with address and group
          config.destination.geoip = {
            country_code: destGeoipCountry,
            inverse_match: destGeoipInverse || undefined,
          };
        }
        // If destMode === "any" and hadDest, config.destination stays as {} which will trigger deletion

        // Handle port - either direct port or port group (separate from address/group/geoip)
        if (destPortMode === "port" && destPort.trim()) {
          config.destination.port = destPort.trim();
        } else if (destPortMode === "group" && destPortGroup.trim()) {
          // Port group - this is separate from address group
          if (!config.destination.group) {
            config.destination.group = {};
          }
          config.destination.group["port-group"] = destPortGroup;
        }
      }

      // State
      if (stateEstablished || stateNew || stateRelated || stateInvalid) {
        config.state = {
          established: stateEstablished || undefined,
          new: stateNew || undefined,
          related: stateRelated || undefined,
          invalid: stateInvalid || undefined,
        };
      } else {
        config.state = null;
      }

      // Interface
      if ((inboundInterface && inboundInterface !== "any") || (outboundInterface && outboundInterface !== "any")) {
        config.interface = {};
        if (inboundInterface && inboundInterface !== "any") config.interface.inbound = inboundInterface;
        if (outboundInterface && outboundInterface !== "any") config.interface.outbound = outboundInterface;
      } else {
        config.interface = null;
      }

      // Packet mods
      if (dscp || mark || ttl) {
        config.packet_mods = {};
        if (dscp) config.packet_mods.dscp = dscp;
        if (mark) config.packet_mods.mark = mark;
        if (ttl) config.packet_mods.ttl = ttl;
      } else {
        config.packet_mods = null;
      }

      // TCP Flags - only include flags that are not "disabled"
      const activeTcpFlags = Object.fromEntries(
        Object.entries(tcpFlags).filter(([_, state]) => state !== "disabled")
      );
      if (Object.keys(activeTcpFlags).length > 0) {
        config.tcp_flags = activeTcpFlags;
      } else {
        config.tcp_flags = null;
      }

      // ICMP type - only applicable for ICMP protocol
      if ((ruleProtocol === "icmp" || ruleProtocol === "ipv6-icmp") && icmpTypeName) {
        config.icmp_type_name = icmpTypeName;
      } else if ((ruleProtocol === "icmp" || ruleProtocol === "ipv6-icmp") && !icmpTypeName && rule.icmp_type_name) {
        // User cleared ICMP type while protocol is still ICMP - delete it
        config.icmp_type_name = null;
      } else if (ruleProtocol !== "icmp" && ruleProtocol !== "ipv6-icmp" && rule.icmp_type_name) {
        // Protocol changed away from ICMP but rule previously had ICMP type - delete it
        config.icmp_type_name = null;
      }

      // Jump target - only applicable for jump action
      if (action === "jump") {
        if (jumpTarget) {
          config.jump_target = jumpTarget;
        }
      } else if (rule.jump_target) {
        // Action is not jump but rule previously had a jump target - delete it
        config.jump_target = null;
      }

      config.disable = disable;
      config.log = log;

      // Update rule
      const service = protocol === "ipv4" ? firewallIPv4Service : firewallIPv6Service;
      await service.updateRule(
        rule.chain,
        rule.rule_number,
        rule.is_custom_chain,
        config,
        rule
      );

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update rule");
    } finally {
      setLoading(false);
    }
  };

  const availableTcpFlags = ["syn", "ack", "fin", "rst", "psh", "urg", "ecn", "cwr"];

  // ICMP Type names (standard ICMPv4 types)
  const icmpTypeOptions = [
    "echo-reply",
    "destination-unreachable",
    "source-quench",
    "redirect",
    "echo-request",
    "router-advertisement",
    "router-solicitation",
    "time-exceeded",
    "parameter-problem",
    "timestamp-request",
    "timestamp-reply",
    "address-mask-request",
    "address-mask-reply",
  ];

  const updateTcpFlag = (flag: string, value: "disabled" | "enabled" | "not") => {
    setTcpFlags((prev) => ({ ...prev, [flag]: value }));
  };

  // Filter groups by type for dropdowns (protocol-aware)
  const addressGroups = groups.filter((g) =>
    protocol === "ipv4" ? g.type === "address-group" : g.type === "ipv6-address-group"
  );
  const networkGroups = groups.filter((g) =>
    protocol === "ipv4" ? g.type === "network-group" : g.type === "ipv6-network-group"
  );
  const portGroups = groups.filter((g) => g.type === "port-group");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Firewall Rule {rule.rule_number} - {rule.chain.charAt(0).toUpperCase() + rule.chain.slice(1)} Chain
          </DialogTitle>
          <DialogDescription>
            Modify the configuration for rule {rule.rule_number}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="text-sm text-destructive/90">{error}</p>
            </div>
          </div>
        )}

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="source">Source</TabsTrigger>
            <TabsTrigger value="destination">Destination</TabsTrigger>
            <TabsTrigger value="state">State</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ruleNumber">Rule Number</Label>
              <Input
                id="ruleNumber"
                type="number"
                value={rule.rule_number}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Rule number cannot be changed
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="action">Action *</Label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger id="action">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accept">Accept</SelectItem>
                    <SelectItem value="drop">Drop</SelectItem>
                    <SelectItem value="reject">Reject</SelectItem>
                    <SelectItem value="continue">Continue</SelectItem>
                    <SelectItem value="return">Return</SelectItem>
                    <SelectItem value="jump">Jump</SelectItem>
                    <SelectItem value="queue">Queue</SelectItem>
                    <SelectItem value="synproxy">Synproxy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {action === "jump" && (
                <div className="space-y-2">
                  <Label htmlFor="jumpTarget">Jump Target *</Label>
                  <Select value={jumpTarget} onValueChange={setJumpTarget}>
                    <SelectTrigger id="jumpTarget">
                      <SelectValue placeholder="Select custom chain" />
                    </SelectTrigger>
                    <SelectContent>
                      {customChains.map((chainName) => (
                        <SelectItem key={chainName} value={chainName}>
                          {chainName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this rule"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ruleProtocol">Protocol</Label>
              <Select value={ruleProtocol} onValueChange={setRuleProtocol}>
                <SelectTrigger id="ruleProtocol">
                  <SelectValue placeholder="Any protocol" />
                </SelectTrigger>
                {(sourcePort.trim() || destPort.trim() || sourcePortGroup.trim() || destPortGroup.trim()) ? (
                  <SelectContent>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="udp">UDP</SelectItem>
                    <SelectItem value="tcp_udp">TCP & UDP</SelectItem>
                  </SelectContent>
                ) : (
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">All (default)</SelectItem>
                    <SelectItem value="tcp_udp">TCP & UDP</SelectItem>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="udp">UDP</SelectItem>
                    <SelectItem value="icmp">ICMP</SelectItem>
                    <SelectItem value="ipv6-icmp">IPv6-ICMP</SelectItem>
                    <SelectItem value="esp">ESP</SelectItem>
                    <SelectItem value="ah">AH</SelectItem>
                    <SelectItem value="gre">GRE</SelectItem>
                    <SelectItem value="ipip">IPIP</SelectItem>
                    <SelectItem value="sctp">SCTP</SelectItem>
                    <SelectItem value="igmp">IGMP</SelectItem>
                    <SelectItem value="ospf">OSPF</SelectItem>
                    <SelectItem value="pim">PIM</SelectItem>
                    <SelectItem value="vrrp">VRRP</SelectItem>
                    <SelectItem value="l2tp">L2TP</SelectItem>
                    <SelectItem value="ipv6">IPv6</SelectItem>
                    <SelectItem value="eigrp">EIGRP</SelectItem>
                    <SelectItem value="ax.25">AX.25</SelectItem>
                    <SelectItem value="dccp">DCCP</SelectItem>
                    <SelectItem value="ddp">DDP</SelectItem>
                    <SelectItem value="egp">EGP</SelectItem>
                    <SelectItem value="encap">ENCAP</SelectItem>
                    <SelectItem value="etherip">EtherIP</SelectItem>
                    <SelectItem value="ethernet">Ethernet</SelectItem>
                    <SelectItem value="fc">FC</SelectItem>
                    <SelectItem value="ggp">GGP</SelectItem>
                    <SelectItem value="hip">HIP</SelectItem>
                    <SelectItem value="hmp">HMP</SelectItem>
                    <SelectItem value="hopopt">HOPOPT</SelectItem>
                    <SelectItem value="idpr-cmtp">IDPR-CMTP</SelectItem>
                    <SelectItem value="idrp">IDRP</SelectItem>
                    <SelectItem value="igp">IGP</SelectItem>
                    <SelectItem value="ip">IP</SelectItem>
                    <SelectItem value="ipcomp">IPComp</SelectItem>
                    <SelectItem value="ipencap">IP-ENCAP</SelectItem>
                    <SelectItem value="ipv6-frag">IPv6-Frag</SelectItem>
                    <SelectItem value="ipv6-nonxt">IPv6-NoNxt</SelectItem>
                    <SelectItem value="ipv6-opts">IPv6-Opts</SelectItem>
                    <SelectItem value="ipv6-route">IPv6-Route</SelectItem>
                    <SelectItem value="isis">ISIS</SelectItem>
                    <SelectItem value="iso-tp4">ISO-TP4</SelectItem>
                    <SelectItem value="manet">MANET</SelectItem>
                    <SelectItem value="mobility-header">Mobility-Header</SelectItem>
                    <SelectItem value="mpls-in-ip">MPLS-in-IP</SelectItem>
                    <SelectItem value="mptcp">MPTCP</SelectItem>
                    <SelectItem value="pup">PUP</SelectItem>
                    <SelectItem value="rdp">RDP</SelectItem>
                    <SelectItem value="rohc">ROHC</SelectItem>
                    <SelectItem value="rspf">RSPF</SelectItem>
                    <SelectItem value="rsvp">RSVP</SelectItem>
                    <SelectItem value="shim6">Shim6</SelectItem>
                    <SelectItem value="skip">SKIP</SelectItem>
                    <SelectItem value="st">ST</SelectItem>
                    <SelectItem value="udplite">UDPLite</SelectItem>
                    <SelectItem value="vmtp">VMTP</SelectItem>
                    <SelectItem value="wesp">WESP</SelectItem>
                    <SelectItem value="xns-idp">XNS-IDP</SelectItem>
                    <SelectItem value="xtp">XTP</SelectItem>
                  </SelectContent>
                )}
              </Select>
              {(sourcePort.trim() || destPort.trim() || sourcePortGroup.trim() || destPortGroup.trim()) && (
                <p className="text-xs text-muted-foreground text-orange-600 dark:text-orange-400">
                  Only TCP/UDP protocols are available when using ports or port groups
                </p>
              )}
              {ruleProtocol && ruleProtocol !== "all" && (
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="protocolInvert"
                    checked={protocolInvert}
                    onCheckedChange={(checked) => setProtocolInvert(checked as boolean)}
                  />
                  <Label htmlFor="protocolInvert" className="cursor-pointer font-normal">
                    Invert match (match everything except this protocol)
                  </Label>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="disable"
                  checked={disable}
                  onCheckedChange={(checked) => setDisable(checked as boolean)}
                />
                <Label htmlFor="disable" className="cursor-pointer">
                  Disable rule
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="log"
                  checked={log}
                  onCheckedChange={(checked) => setLog(checked as boolean)}
                />
                <Label htmlFor="log" className="cursor-pointer">
                  Enable logging
                </Label>
              </div>
            </div>
          </TabsContent>

          {/* Source Tab */}
          <TabsContent value="source" className="space-y-4">
            {/* Mode Selection */}
            <div className="space-y-3">
              <Label>Source Match Type</Label>
              <RadioGroup value={sourceMode} onValueChange={(value: "any" | "address" | "group" | "geoip" | "mac") => setSourceMode(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="any" id="source-any-mode" />
                  <Label htmlFor="source-any-mode" className="cursor-pointer font-normal">
                    Any (no source restriction)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="address" id="source-address-mode" />
                  <Label htmlFor="source-address-mode" className="cursor-pointer font-normal">
                    Address (IP, CIDR, or range)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="group" id="source-group-mode" />
                  <Label htmlFor="source-group-mode" className="cursor-pointer font-normal">
                    Firewall Group
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="geoip" id="source-geoip-mode" />
                  <Label htmlFor="source-geoip-mode" className="cursor-pointer font-normal">
                    GeoIP (country codes)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mac" id="source-mac-mode" />
                  <Label htmlFor="source-mac-mode" className="cursor-pointer font-normal">
                    MAC Address
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Address Mode */}
            {sourceMode === "address" && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label htmlFor="sourceAddress">Source Address</Label>
                  <Input
                    id="sourceAddress"
                    value={sourceAddress}
                    onChange={(e) => {
                      setSourceAddress(e.target.value);
                      setSourceAddressError(null);
                    }}
                    placeholder={protocol === "ipv4" ? "192.168.1.0/24 or 192.168.1.10" : "2001:db8::/32 or 2001:db8::1"}
                    className={sourceAddressError ? "border-destructive" : ""}
                  />
                  {sourceAddressError ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {sourceAddressError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {protocol === "ipv4"
                        ? "IPv4 address, CIDR (x.x.x.x/x), or range (x.x.x.x-x.x.x.x)"
                        : "IPv6 address, CIDR (xxxx:xxxx::/x), or range"
                      }
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sourceAddressInvert"
                    checked={sourceAddressInvert}
                    onCheckedChange={(checked) => setSourceAddressInvert(checked as boolean)}
                  />
                  <Label htmlFor="sourceAddressInvert" className="cursor-pointer font-normal">
                    Invert match (match everything except this address)
                  </Label>
                </div>
              </div>
            )}

            {/* Group Mode */}
            {sourceMode === "group" && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sourceGroupType">Group Type</Label>
                    <Select value={sourceGroupType} onValueChange={setSourceGroupType}>
                      <SelectTrigger id="sourceGroupType">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="address-group">Address Group</SelectItem>
                        <SelectItem value="network-group">Network Group</SelectItem>
                        <SelectItem value="domain-group">Domain Group</SelectItem>
                        <SelectItem value="mac-group">MAC Group</SelectItem>
                        {capabilities?.features.remote_group?.supported && (
                          <SelectItem value="remote-group">Remote Group</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sourceGroupName">Group Name</Label>
                    <Select
                      value={sourceGroupName}
                      onValueChange={setSourceGroupName}
                      disabled={!sourceGroupType}
                    >
                      <SelectTrigger id="sourceGroupName">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceGroupType === "address-group" &&
                          addressGroups.map((g) => (
                            <SelectItem key={g.name} value={g.name}>
                              {g.name}
                            </SelectItem>
                          ))}
                        {sourceGroupType === "network-group" &&
                          networkGroups.map((g) => (
                            <SelectItem key={g.name} value={g.name}>
                              {g.name}
                            </SelectItem>
                          ))}
                        {sourceGroupType === "domain-group" &&
                          groups.filter((g) => g.type === "domain-group").map((g) => (
                            <SelectItem key={g.name} value={g.name}>
                              {g.name}
                            </SelectItem>
                          ))}
                        {sourceGroupType === "mac-group" &&
                          groups.filter((g) => g.type === "mac-group").map((g) => (
                            <SelectItem key={g.name} value={g.name}>
                              {g.name}
                            </SelectItem>
                          ))}
                        {sourceGroupType === "remote-group" &&
                          groups.filter((g) => g.type === "remote-group").map((g) => (
                            <SelectItem key={g.name} value={g.name}>
                              {g.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* GeoIP Mode */}
            {sourceMode === "geoip" && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <CountryMultiSelect
                  id="sourceGeoipCountry"
                  label="Source GeoIP Countries"
                  value={sourceGeoipCountry}
                  onChange={setSourceGeoipCountry}
                />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sourceGeoipInverse"
                    checked={sourceGeoipInverse}
                    onCheckedChange={(checked) => setSourceGeoipInverse(checked as boolean)}
                  />
                  <Label htmlFor="sourceGeoipInverse" className="text-sm font-normal cursor-pointer">
                    Exclude countries (inverse match)
                  </Label>
                </div>
              </div>
            )}

            {/* MAC Address Mode */}
            {sourceMode === "mac" && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label htmlFor="sourceMac">Source MAC Address</Label>
                  <Input
                    id="sourceMac"
                    value={sourceMac}
                    onChange={(e) => {
                      setSourceMac(e.target.value);
                      setSourceMacError(null);
                    }}
                    placeholder="aa:bb:cc:dd:ee:ff"
                    className={sourceMacError ? "border-destructive" : ""}
                  />
                  {sourceMacError ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {sourceMacError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Format: aa:bb:cc:dd:ee:ff
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Port Selection (available for all modes) */}
            <div className="space-y-3 pt-4 border-t">
              <Label>Source Port</Label>
              <RadioGroup value={sourcePortMode} onValueChange={(value: "any" | "port" | "group") => setSourcePortMode(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="any" id="edit-source-port-any-mode" />
                  <Label htmlFor="edit-source-port-any-mode" className="cursor-pointer font-normal">
                    Any (no port restriction)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="port" id="edit-source-port-mode" />
                  <Label htmlFor="edit-source-port-mode" className="cursor-pointer font-normal">
                    Port Number/Range
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="group" id="edit-source-port-group-mode" />
                  <Label htmlFor="edit-source-port-group-mode" className="cursor-pointer font-normal">
                    Port Group
                  </Label>
                </div>
              </RadioGroup>

              {sourcePortMode === "port" && (
                <div className="pl-6 border-l-2 border-primary/20 space-y-2">
                  <Input
                    id="sourcePort"
                    value={sourcePort}
                    onChange={(e) => {
                      setSourcePort(e.target.value);
                      setSourcePortError(null);
                    }}
                    placeholder="80,443,telnet,8080-8090"
                    className={sourcePortError ? "border-destructive" : ""}
                  />
                  {sourcePortError ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {sourcePortError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Port number, range, service name, or comma-separated list (e.g., 80,443,telnet,8080-8090)
                    </p>
                  )}
                </div>
              )}

              {sourcePortMode === "group" && (
                <div className="pl-6 border-l-2 border-primary/20">
                  <Select value={sourcePortGroup} onValueChange={setSourcePortGroup}>
                    <SelectTrigger id="sourcePortGroup">
                      <SelectValue placeholder="Select port group" />
                    </SelectTrigger>
                    <SelectContent>
                      {portGroups.map((g) => (
                        <SelectItem key={g.name} value={g.name}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(sourcePortMode === "port" || sourcePortMode === "group") && (
                <p className="text-xs text-muted-foreground">
                  Port specification requires TCP/UDP protocol
                </p>
              )}
            </div>
          </TabsContent>

          {/* Destination Tab */}
          <TabsContent value="destination" className="space-y-4">
            {/* Mode Selection */}
            <div className="space-y-3">
              <Label>Destination Match Type</Label>
              <RadioGroup value={destMode} onValueChange={(value: "any" | "address" | "group" | "geoip") => setDestMode(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="any" id="dest-any-mode" />
                  <Label htmlFor="dest-any-mode" className="cursor-pointer font-normal">
                    Any (no destination restriction)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="address" id="dest-address-mode" />
                  <Label htmlFor="dest-address-mode" className="cursor-pointer font-normal">
                    Address (IP, CIDR, or range)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="group" id="dest-group-mode" />
                  <Label htmlFor="dest-group-mode" className="cursor-pointer font-normal">
                    Firewall Group
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="geoip" id="dest-geoip-mode" />
                  <Label htmlFor="dest-geoip-mode" className="cursor-pointer font-normal">
                    GeoIP (country codes)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Address Mode */}
            {destMode === "address" && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label htmlFor="destAddress">Destination Address</Label>
                  <Input
                    id="destAddress"
                    value={destAddress}
                    onChange={(e) => {
                      setDestAddress(e.target.value);
                      setDestAddressError(null);
                    }}
                    placeholder={protocol === "ipv4" ? "192.168.1.0/24 or 192.168.1.10" : "2001:db8::/32 or 2001:db8::1"}
                    className={destAddressError ? "border-destructive" : ""}
                  />
                  {destAddressError ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {destAddressError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {protocol === "ipv4"
                        ? "IPv4 address, CIDR (x.x.x.x/x), or range (x.x.x.x-x.x.x.x)"
                        : "IPv6 address, CIDR (xxxx:xxxx::/x), or range"
                      }
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="destAddressInvert"
                    checked={destAddressInvert}
                    onCheckedChange={(checked) => setDestAddressInvert(checked as boolean)}
                  />
                  <Label htmlFor="destAddressInvert" className="cursor-pointer font-normal">
                    Invert match (match everything except this address)
                  </Label>
                </div>
              </div>
            )}

            {/* Group Mode */}
            {destMode === "group" && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="destGroupType">Group Type</Label>
                    <Select value={destGroupType} onValueChange={setDestGroupType}>
                      <SelectTrigger id="destGroupType">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="address-group">Address Group</SelectItem>
                        <SelectItem value="network-group">Network Group</SelectItem>
                        <SelectItem value="domain-group">Domain Group</SelectItem>
                        <SelectItem value="mac-group">MAC Group</SelectItem>
                        {capabilities?.features.remote_group?.supported && (
                          <SelectItem value="remote-group">Remote Group</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="destGroupName">Group Name</Label>
                    <Select
                      value={destGroupName}
                      onValueChange={setDestGroupName}
                      disabled={!destGroupType}
                    >
                      <SelectTrigger id="destGroupName">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {destGroupType === "address-group" &&
                          addressGroups.map((g) => (
                            <SelectItem key={g.name} value={g.name}>
                              {g.name}
                            </SelectItem>
                          ))}
                        {destGroupType === "network-group" &&
                          networkGroups.map((g) => (
                            <SelectItem key={g.name} value={g.name}>
                              {g.name}
                            </SelectItem>
                          ))}
                        {destGroupType === "domain-group" &&
                          groups.filter((g) => g.type === "domain-group").map((g) => (
                            <SelectItem key={g.name} value={g.name}>
                              {g.name}
                            </SelectItem>
                          ))}
                        {destGroupType === "mac-group" &&
                          groups.filter((g) => g.type === "mac-group").map((g) => (
                            <SelectItem key={g.name} value={g.name}>
                              {g.name}
                            </SelectItem>
                          ))}
                        {destGroupType === "remote-group" &&
                          groups.filter((g) => g.type === "remote-group").map((g) => (
                            <SelectItem key={g.name} value={g.name}>
                              {g.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* GeoIP Mode */}
            {destMode === "geoip" && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <CountryMultiSelect
                  id="destGeoipCountry"
                  label="Destination GeoIP Countries"
                  value={destGeoipCountry}
                  onChange={setDestGeoipCountry}
                />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="destGeoipInverse"
                    checked={destGeoipInverse}
                    onCheckedChange={(checked) => setDestGeoipInverse(checked as boolean)}
                  />
                  <Label htmlFor="destGeoipInverse" className="text-sm font-normal cursor-pointer">
                    Exclude countries (inverse match)
                  </Label>
                </div>
              </div>
            )}

            {/* Port Selection (available for all modes) */}
            <div className="space-y-3 pt-4 border-t">
              <Label>Destination Port</Label>
              <RadioGroup value={destPortMode} onValueChange={(value: "any" | "port" | "group") => setDestPortMode(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="any" id="edit-dest-port-any-mode" />
                  <Label htmlFor="edit-dest-port-any-mode" className="cursor-pointer font-normal">
                    Any (no port restriction)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="port" id="edit-dest-port-mode" />
                  <Label htmlFor="edit-dest-port-mode" className="cursor-pointer font-normal">
                    Port Number/Range
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="group" id="edit-dest-port-group-mode" />
                  <Label htmlFor="edit-dest-port-group-mode" className="cursor-pointer font-normal">
                    Port Group
                  </Label>
                </div>
              </RadioGroup>

              {destPortMode === "port" && (
                <div className="pl-6 border-l-2 border-primary/20 space-y-2">
                  <Input
                    id="destPort"
                    value={destPort}
                    onChange={(e) => {
                      setDestPort(e.target.value);
                      setDestPortError(null);
                    }}
                    placeholder="443,https,8080-8090"
                    className={destPortError ? "border-destructive" : ""}
                  />
                  {destPortError ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {destPortError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Port number, range, service name, or comma-separated list (e.g., 443,https,8080-8090)
                    </p>
                  )}
                </div>
              )}

              {destPortMode === "group" && (
                <div className="pl-6 border-l-2 border-primary/20">
                  <Select value={destPortGroup} onValueChange={setDestPortGroup}>
                    <SelectTrigger id="destPortGroup">
                      <SelectValue placeholder="Select port group" />
                    </SelectTrigger>
                    <SelectContent>
                      {portGroups.map((g) => (
                        <SelectItem key={g.name} value={g.name}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(destPortMode === "port" || destPortMode === "group") && (
                <p className="text-xs text-muted-foreground">
                  Port specification requires TCP/UDP protocol
                </p>
              )}
            </div>
          </TabsContent>

          {/* State Tab */}
          <TabsContent value="state" className="space-y-4">
            <div className="space-y-4">
              <Label>Connection State Matching</Label>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stateEstablished"
                    checked={stateEstablished}
                    onCheckedChange={(checked) => setStateEstablished(checked as boolean)}
                  />
                  <Label htmlFor="stateEstablished" className="cursor-pointer">
                    Established
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stateNew"
                    checked={stateNew}
                    onCheckedChange={(checked) => setStateNew(checked as boolean)}
                  />
                  <Label htmlFor="stateNew" className="cursor-pointer">
                    New
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stateRelated"
                    checked={stateRelated}
                    onCheckedChange={(checked) => setStateRelated(checked as boolean)}
                  />
                  <Label htmlFor="stateRelated" className="cursor-pointer">
                    Related
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stateInvalid"
                    checked={stateInvalid}
                    onCheckedChange={(checked) => setStateInvalid(checked as boolean)}
                  />
                  <Label htmlFor="stateInvalid" className="cursor-pointer">
                    Invalid
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inboundInterface">Inbound Interface</Label>
              <Select value={inboundInterface} onValueChange={setInboundInterface}>
                <SelectTrigger id="inboundInterface">
                  <SelectValue placeholder="Any interface" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {interfaces.map((iface) => (
                    <SelectItem key={iface.name} value={iface.name}>
                      {iface.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outboundInterface">Outbound Interface</Label>
              <Select value={outboundInterface} onValueChange={setOutboundInterface}>
                <SelectTrigger id="outboundInterface">
                  <SelectValue placeholder="Any interface" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {interfaces.map((iface) => (
                    <SelectItem key={iface.name} value={iface.name}>
                      {iface.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">TCP Flags</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Set individual TCP flag matching rules (requires TCP protocol only)
                </p>
              </div>
              {ruleProtocol !== "tcp" && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    TCP flags can only be used with TCP protocol (not TCP & UDP). Set the protocol to TCP in the Basic tab to enable TCP flags.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {availableTcpFlags.map((flag) => (
                  <div key={flag} className="space-y-2">
                    <Label htmlFor={`tcp-${flag}`} className="uppercase font-medium text-sm">
                      {flag}
                    </Label>
                    <Select
                      value={tcpFlags[flag]}
                      onValueChange={(value: "disabled" | "enabled" | "not") => {
                        // Auto-switch to TCP protocol when enabling a flag
                        if (value !== "disabled" && ruleProtocol !== "tcp") {
                          setRuleProtocol("tcp");
                        }
                        updateTcpFlag(flag, value);
                      }}
                      disabled={ruleProtocol !== "tcp"}
                    >
                      <SelectTrigger id={`tcp-${flag}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <SelectItem value="enabled">Match Set</SelectItem>
                        <SelectItem value="not">Match NOT Set</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <Label htmlFor="icmpTypeName" className="text-base font-semibold">ICMP Type</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Select ICMP type name to match (requires ICMP protocol)
                </p>
              </div>
              {ruleProtocol !== "icmp" && ruleProtocol !== "ipv6-icmp" && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    ICMP type can only be used with ICMP protocol. Set the protocol to ICMP in the Basic tab to enable ICMP type.
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Select
                  key={icmpTypeName || "empty"}
                  value={icmpTypeName || undefined}
                  onValueChange={(value) => {
                    // Auto-switch to ICMP protocol when selecting a type
                    if (value && ruleProtocol !== "icmp" && ruleProtocol !== "ipv6-icmp") {
                      setRuleProtocol("icmp");
                    }
                    setIcmpTypeName(value);
                  }}
                  disabled={ruleProtocol !== "icmp" && ruleProtocol !== "ipv6-icmp"}
                >
                  <SelectTrigger id="icmpTypeName" className="flex-1">
                    <SelectValue placeholder="Select ICMP type..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {icmpTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {icmpTypeName && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      setIcmpTypeName("");
                    }}
                    disabled={ruleProtocol !== "icmp" && ruleProtocol !== "ipv6-icmp"}
                    className="shrink-0"
                    title="Clear ICMP type"
                  >
                    ×
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <Label>Packet Modifications</Label>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dscp">DSCP</Label>
                  <Input
                    id="dscp"
                    value={dscp}
                    onChange={(e) => setDscp(e.target.value)}
                    placeholder="0-63"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mark">Mark</Label>
                  <Input
                    id="mark"
                    value={mark}
                    onChange={(e) => setMark(e.target.value)}
                    placeholder="Packet mark"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ttl">TTL</Label>
                  <Input
                    id="ttl"
                    value={ttl}
                    onChange={(e) => setTtl(e.target.value)}
                    placeholder="0-255"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Rule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
