"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { natService } from "@/lib/api/nat";
import { firewallGroupsService } from "@/lib/api/firewall-groups";
import type { FirewallGroup } from "@/lib/api/types/firewall-groups";
import type { SourceNATRule } from "@/lib/api/nat";

interface EditSourceNATModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: SourceNATRule | null;
  onSuccess: () => void;
}

export function EditSourceNATModal({ open, onOpenChange, rule, onSuccess }: EditSourceNATModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropdown data
  const [groups, setGroups] = useState<FirewallGroup[]>([]);

  // Form fields - Description
  const [description, setDescription] = useState("");

  // Source fields
  const [sourceType, setSourceType] = useState<"address" | "group" | "fqdn">("address");
  const [sourceAddress, setSourceAddress] = useState("");
  const [sourceInvert, setSourceInvert] = useState(false);
  const [sourcePort, setSourcePort] = useState("");
  const [sourceGroupType, setSourceGroupType] = useState("");
  const [sourceGroupName, setSourceGroupName] = useState("");

  // Source port type (input vs group)
  const [sourcePortType, setSourcePortType] = useState<"input" | "group">("input");
  const [sourcePortGroupName, setSourcePortGroupName] = useState("");

  // Destination fields
  const [destinationType, setDestinationType] = useState<"address" | "group" | "fqdn">("address");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationInvert, setDestinationInvert] = useState(false);
  const [destinationPort, setDestinationPort] = useState("");
  const [destinationGroupType, setDestinationGroupType] = useState("");
  const [destinationGroupName, setDestinationGroupName] = useState("");

  // Destination port type (input vs group)
  const [destPortType, setDestPortType] = useState<"input" | "group">("input");
  const [destPortGroupName, setDestPortGroupName] = useState("");

  // Outbound interface
  const [outboundInterfaceType, setOutboundInterfaceType] = useState<"name" | "group">("name");
  const [outboundInterfaceName, setOutboundInterfaceName] = useState("");
  const [outboundInterfaceGroup, setOutboundInterfaceGroup] = useState("");
  const [outboundInterfaceInvert, setOutboundInterfaceInvert] = useState(false);

  // Protocol and packet type
  const [protocol, setProtocol] = useState("");
  const [packetType, setPacketType] = useState("");

  // Translation
  const [translationType, setTranslationType] = useState<"ip" | "cidr" | "range" | "masquerade">("masquerade");
  const [translationAddress, setTranslationAddress] = useState("");
  const [translationPort, setTranslationPort] = useState("");
  const [translationPortMapping, setTranslationPortMapping] = useState(false);
  const [translationAddressMapping, setTranslationAddressMapping] = useState(false);

  // Load balance
  const [loadBalancingEnabled, setLoadBalancingEnabled] = useState(false);
  const [loadBalanceHash, setLoadBalanceHash] = useState("");
  const [loadBalanceBackend, setLoadBalanceBackend] = useState("");
  const [loadBalanceBackendWeight, setLoadBalanceBackendWeight] = useState("");

  // FQDN
  const [sourceFqdn, setSourceFqdn] = useState("");
  const [destinationFqdn, setDestinationFqdn] = useState("");

  // Flags
  const [disable, setDisable] = useState(false);
  const [exclude, setExclude] = useState(false);
  const [log, setLog] = useState(false);

  // Track original values to detect when fields are cleared
  const [originalSourceAddress, setOriginalSourceAddress] = useState("");
  const [originalSourcePort, setOriginalSourcePort] = useState("");
  const [originalSourceGroup, setOriginalSourceGroup] = useState(false);
  const [originalSourceFqdn, setOriginalSourceFqdn] = useState("");
  const [originalDestinationAddress, setOriginalDestinationAddress] = useState("");
  const [originalDestinationPort, setOriginalDestinationPort] = useState("");
  const [originalDestinationGroup, setOriginalDestinationGroup] = useState(false);
  const [originalDestinationFqdn, setOriginalDestinationFqdn] = useState("");
  const [originalOutboundInterfaceType, setOriginalOutboundInterfaceType] = useState<"name" | "group" | null>(null);
  const [originalSourcePortGroup, setOriginalSourcePortGroup] = useState("");
  const [originalDestPortGroup, setOriginalDestPortGroup] = useState("");
  const [originalTranslationPort, setOriginalTranslationPort] = useState("");
  const [originalTranslationPortMapping, setOriginalTranslationPortMapping] = useState(false);
  const [originalTranslationAddressMapping, setOriginalTranslationAddressMapping] = useState(false);

  // Reset all form fields to defaults
  const resetForm = () => {
    setDescription("");
    setSourceType("address");
    setSourceAddress("");
    setSourceInvert(false);
    setSourcePort("");
    setSourceGroupType("");
    setSourceGroupName("");
    setSourcePortType("input");
    setSourcePortGroupName("");
    setDestinationType("address");
    setDestinationAddress("");
    setDestinationInvert(false);
    setDestinationPort("");
    setDestinationGroupType("");
    setDestinationGroupName("");
    setDestPortType("input");
    setDestPortGroupName("");
    setOutboundInterfaceType("name");
    setOutboundInterfaceName("");
    setOutboundInterfaceGroup("");
    setOutboundInterfaceInvert(false);
    setProtocol("");
    setPacketType("");
    setTranslationType("masquerade");
    setTranslationAddress("");
    setTranslationPort("");
    setTranslationPortMapping(false);
    setTranslationAddressMapping(false);
    setLoadBalancingEnabled(false);
    setLoadBalanceHash("");
    setLoadBalanceBackend("");
    setLoadBalanceBackendWeight("");
    setSourceFqdn("");
    setDestinationFqdn("");
    setDisable(false);
    setExclude(false);
    setLog(false);
    // Reset original tracking values
    setOriginalSourceAddress("");
    setOriginalSourcePort("");
    setOriginalSourceGroup(false);
    setOriginalSourceFqdn("");
    setOriginalDestinationAddress("");
    setOriginalDestinationPort("");
    setOriginalDestinationGroup(false);
    setOriginalDestinationFqdn("");
    setOriginalOutboundInterfaceType(null);
    setOriginalSourcePortGroup("");
    setOriginalDestPortGroup("");
    setOriginalTranslationPort("");
    setOriginalTranslationPortMapping(false);
    setOriginalTranslationAddressMapping(false);
    setError(null);
  };

  // Load groups and interfaces on mount
  useEffect(() => {
    if (open) {
      loadGroups();
    }
  }, [open]);

  // Populate form when rule changes
  useEffect(() => {
    if (rule && open) {
      // Reset form first to clear any stale data from previous rule
      resetForm();
      populateForm(rule);
    }
  }, [rule, open]);

  // Auto-adjust protocol when ports are used
  useEffect(() => {
    const hasPort = sourcePort.trim() || destinationPort.trim() || sourcePortGroupName || destPortGroupName;
    const portCompatibleProtocols = ["tcp", "udp", "tcp_udp"];

    if (hasPort && !portCompatibleProtocols.includes(protocol)) {
      // Switch to tcp_udp when port is entered and current protocol is incompatible
      setProtocol("tcp_udp");
    } else if (!hasPort && portCompatibleProtocols.includes(protocol) && protocol !== "all") {
      // Switch back to "all" when ports are cleared
      setProtocol("all");
    }
  }, [sourcePort, destinationPort, sourcePortGroupName, destPortGroupName, protocol]);

  const populateForm = (rule: SourceNATRule) => {
    // Description
    setDescription(rule.description || "");

    // Source
    if (rule.source?.address) {
      setSourceType("address");
      const srcAddrInverted = rule.source.address.startsWith("!");
      setSourceInvert(srcAddrInverted);
      const cleanSrcAddr = srcAddrInverted ? rule.source.address.substring(1) : rule.source.address;
      setSourceAddress(cleanSrcAddr);
      setOriginalSourceAddress(cleanSrcAddr);
    } else if (rule.source?.group) {
      setSourceType("group");
      const groupEntries = Object.entries(rule.source.group).filter(([t]) => t !== "port-group");
      if (groupEntries.length > 0) {
        const [type, name] = groupEntries[0];
        const srcGrpInverted = name.startsWith("!");
        setSourceInvert(srcGrpInverted);
        setSourceGroupType(type);
        setSourceGroupName(srcGrpInverted ? name.substring(1) : name);
        setOriginalSourceGroup(true);
      }
    } else if (rule.source?.fqdn) {
      setSourceType("fqdn");
      setSourceFqdn(rule.source.fqdn);
      setOriginalSourceFqdn(rule.source.fqdn);
      setSourceInvert(false);
    } else {
      setSourceInvert(false);
      setOriginalSourceAddress("");
      setOriginalSourceGroup(false);
    }
    if (rule.source?.group?.["port-group"]) {
      setSourcePortType("group");
      setSourcePortGroupName(rule.source.group["port-group"]);
      setSourcePort("");
      setOriginalSourcePort("");
      setOriginalSourcePortGroup(rule.source.group["port-group"]);
    } else {
      setSourcePortType("input");
      setSourcePort(rule.source?.port || "");
      setSourcePortGroupName("");
      setOriginalSourcePort(rule.source?.port || "");
      setOriginalSourcePortGroup("");
    }

    // Destination
    if (rule.destination?.address) {
      setDestinationType("address");
      const dstAddrInverted = rule.destination.address.startsWith("!");
      setDestinationInvert(dstAddrInverted);
      const cleanDstAddr = dstAddrInverted ? rule.destination.address.substring(1) : rule.destination.address;
      setDestinationAddress(cleanDstAddr);
      setOriginalDestinationAddress(cleanDstAddr);
    } else if (rule.destination?.group) {
      setDestinationType("group");
      const groupEntries = Object.entries(rule.destination.group).filter(([t]) => t !== "port-group");
      if (groupEntries.length > 0) {
        const [type, name] = groupEntries[0];
        const dstGrpInverted = name.startsWith("!");
        setDestinationInvert(dstGrpInverted);
        setDestinationGroupType(type);
        setDestinationGroupName(dstGrpInverted ? name.substring(1) : name);
        setOriginalDestinationGroup(true);
      }
    } else if (rule.destination?.fqdn) {
      setDestinationType("fqdn");
      setDestinationFqdn(rule.destination.fqdn);
      setOriginalDestinationFqdn(rule.destination.fqdn);
      setDestinationInvert(false);
    } else {
      setDestinationInvert(false);
      setOriginalDestinationAddress("");
      setOriginalDestinationGroup(false);
    }
    if (rule.destination?.group?.["port-group"]) {
      setDestPortType("group");
      setDestPortGroupName(rule.destination.group["port-group"]);
      setDestinationPort("");
      setOriginalDestinationPort("");
      setOriginalDestPortGroup(rule.destination.group["port-group"]);
    } else {
      setDestPortType("input");
      setDestinationPort(rule.destination?.port || "");
      setDestPortGroupName("");
      setOriginalDestinationPort(rule.destination?.port || "");
      setOriginalDestPortGroup("");
    }

    // Outbound interface
    if (rule.outbound_interface) {
      const interfaceEntries = Object.entries(rule.outbound_interface);
      if (interfaceEntries.length > 0) {
        const [type, value] = interfaceEntries[0];
        setOutboundInterfaceType(type as "name" | "group");
        setOriginalOutboundInterfaceType(type as "name" | "group");

        // Check for inverted interface (starts with !)
        const isInverted = value.startsWith("!");
        setOutboundInterfaceInvert(isInverted);
        const cleanValue = isInverted ? value.substring(1) : value;

        if (type === "name") {
          setOutboundInterfaceName(cleanValue);
        } else {
          setOutboundInterfaceGroup(cleanValue);
        }
      }
    }

    // Protocol and packet type
    setProtocol(rule.protocol || "all");
    setPacketType(rule.packet_type || "");

    // Translation - detect type
    const transAddr = rule.translation?.address || "";
    if (transAddr === "masquerade") {
      setTranslationType("masquerade");
      setTranslationAddress("");
    } else if (transAddr.includes("/")) {
      setTranslationType("cidr");
      setTranslationAddress(transAddr);
    } else if (transAddr.includes("-")) {
      setTranslationType("range");
      setTranslationAddress(transAddr);
    } else if (transAddr) {
      setTranslationType("ip");
      setTranslationAddress(transAddr);
    }

    // Translation port and options
    const tPort = rule.translation?.port || "";
    setTranslationPort(tPort);
    setOriginalTranslationPort(tPort);
    const pm = rule.translation?.options?.port_mapping === "random";
    setTranslationPortMapping(pm);
    setOriginalTranslationPortMapping(pm);
    const am = rule.translation?.options?.address_mapping === "persistent";
    setTranslationAddressMapping(am);
    setOriginalTranslationAddressMapping(am);

    // Load balance
    const hasLoadBalancing = !!(rule.load_balance?.hash || rule.load_balance?.backends?.[0]);
    setLoadBalancingEnabled(hasLoadBalancing);
    setLoadBalanceHash(rule.load_balance?.hash || "");
    setLoadBalanceBackend(rule.load_balance?.backends?.[0]?.name || "");
    setLoadBalanceBackendWeight(rule.load_balance?.backends?.[0]?.weight || "");

    // Flags
    setDisable(rule.disable);
    setExclude(rule.exclude);
    setLog(rule.log);
  };

  const loadGroups = async () => {
    try {
      const config = await firewallGroupsService.getConfig();
      // Aggregate all groups from different categories
      const allGroups = [
        ...config.address_groups,
        ...config.ipv6_address_groups,
        ...config.network_groups,
        ...config.ipv6_network_groups,
        ...config.port_groups,
        ...config.interface_groups,
        ...config.mac_groups,
        ...config.domain_groups,
        ...config.remote_groups,
      ];
      setGroups(allGroups);
    } catch (err) {
      console.error("Failed to load firewall groups:", err);
    }
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!rule) return;

    setLoading(true);
    setError(null);

    try {
      const config: any = {};

      if (description.trim()) {
        config.description = description.trim();
      }

      // Source - handle both setting new values and deleting cleared values
      if (sourceType === "address") {
        if (sourceAddress.trim()) {
          config.source_address = sourceAddress.trim();
          config.source_address_invert = sourceInvert;
        } else if (originalSourceAddress) {
          // Address was cleared - need to delete it
          config.delete_source_address = true;
        }
        // If switching from group to address with no value, delete the group
        if (originalSourceGroup) {
          config.delete_source_group = true;
        }
        if (originalSourceFqdn) {
          config.delete_source_fqdn = true;
        }
      } else if (sourceType === "group") {
        if (sourceGroupType && sourceGroupName) {
          config.source_group_type = sourceGroupType;
          config.source_group_name = sourceGroupName;
          config.source_group_invert = sourceInvert;
        } else if (originalSourceGroup) {
          // Group was cleared - need to delete it
          config.delete_source_group = true;
        }
        // If switching from address to group with no value, delete the address
        if (originalSourceAddress) {
          config.delete_source_address = true;
        }
        if (originalSourceFqdn) {
          config.delete_source_fqdn = true;
        }
      } else if (sourceType === "fqdn") {
        if (sourceFqdn.trim()) {
          config.source_fqdn = sourceFqdn.trim();
        } else if (originalSourceFqdn) {
          config.delete_source_fqdn = true;
        }
        if (originalSourceAddress) config.delete_source_address = true;
        if (originalSourceGroup) config.delete_source_group = true;
      }

      if (sourcePortType === "input") {
        if (sourcePort.trim()) {
          config.source_port = sourcePort.trim();
        } else if (originalSourcePort) {
          config.delete_source_port = true;
        }
        if (originalSourcePortGroup) {
          config.delete_source_port_group = true;
        }
      } else if (sourcePortType === "group") {
        if (sourcePortGroupName) {
          config.source_port_group_name = sourcePortGroupName;
        }
        if (originalSourcePort) {
          config.delete_source_port = true;
        }
        if (originalSourcePortGroup && !sourcePortGroupName) {
          config.delete_source_port_group = true;
        }
      }

      // Destination - handle both setting new values and deleting cleared values
      if (destinationType === "address") {
        if (destinationAddress.trim()) {
          config.destination_address = destinationAddress.trim();
          config.destination_address_invert = destinationInvert;
        } else if (originalDestinationAddress) {
          // Address was cleared - need to delete it
          config.delete_destination_address = true;
        }
        // If switching from group to address with no value, delete the group
        if (originalDestinationGroup) {
          config.delete_destination_group = true;
        }
        if (originalDestinationFqdn) {
          config.delete_destination_fqdn = true;
        }
      } else if (destinationType === "group") {
        if (destinationGroupType && destinationGroupName) {
          config.destination_group_type = destinationGroupType;
          config.destination_group_name = destinationGroupName;
          config.destination_group_invert = destinationInvert;
        } else if (originalDestinationGroup) {
          // Group was cleared - need to delete it
          config.delete_destination_group = true;
        }
        // If switching from address to group with no value, delete the address
        if (originalDestinationAddress) {
          config.delete_destination_address = true;
        }
        if (originalDestinationFqdn) {
          config.delete_destination_fqdn = true;
        }
      } else if (destinationType === "fqdn") {
        if (destinationFqdn.trim()) {
          config.destination_fqdn = destinationFqdn.trim();
        } else if (originalDestinationFqdn) {
          config.delete_destination_fqdn = true;
        }
        if (originalDestinationAddress) config.delete_destination_address = true;
        if (originalDestinationGroup) config.delete_destination_group = true;
      }

      if (destPortType === "input") {
        if (destinationPort.trim()) {
          config.destination_port = destinationPort.trim();
        } else if (originalDestinationPort) {
          config.delete_destination_port = true;
        }
        if (originalDestPortGroup) {
          config.delete_destination_port_group = true;
        }
      } else if (destPortType === "group") {
        if (destPortGroupName) {
          config.destination_port_group_name = destPortGroupName;
        }
        if (originalDestinationPort) {
          config.delete_destination_port = true;
        }
        if (originalDestPortGroup && !destPortGroupName) {
          config.delete_destination_port_group = true;
        }
      }

      // Outbound interface - delete the old type when switching between name and group
      if (outboundInterfaceType === "name" && outboundInterfaceName) {
        if (originalOutboundInterfaceType === "group") {
          config.delete_outbound_interface_group = true;
        }
        config.outbound_interface_type = "name";
        config.outbound_interface_value = outboundInterfaceName;
        config.outbound_interface_invert = outboundInterfaceInvert;
      } else if (outboundInterfaceType === "group" && outboundInterfaceGroup) {
        if (originalOutboundInterfaceType === "name") {
          config.delete_outbound_interface_name = true;
        }
        config.outbound_interface_type = "group";
        config.outbound_interface_value = outboundInterfaceGroup;
        config.outbound_interface_invert = outboundInterfaceInvert;
      }

      // Protocol (don't send "all" - VyOS treats no protocol as all protocols)
      if (protocol && protocol !== "all") {
        config.protocol = protocol;
      } else if (protocol === "all" && rule.protocol) {
        // If changing from a specific protocol to "all", we need to delete the protocol
        config.delete_protocol = true;
      }

      // Packet type
      if (packetType) {
        config.packet_type = packetType;
      }

      // Translation
      config.translation_type = translationType;
      if (translationType === "masquerade") {
        config.translation_address = "masquerade";
      } else if (translationAddress.trim()) {
        config.translation_address = translationAddress.trim();
      }

      if (!translationPort.trim() && originalTranslationPort) {
        config.delete_translation_port = true;
      } else if (translationPort.trim()) {
        config.translation_port = translationPort.trim();
      }

      if (!translationPortMapping && originalTranslationPortMapping) {
        config.delete_translation_port_mapping = true;
      } else if (translationPortMapping) {
        config.translation_port_mapping = true;
      }

      if (!translationAddressMapping && originalTranslationAddressMapping) {
        config.delete_translation_address_mapping = true;
      } else if (translationAddressMapping) {
        config.translation_address_mapping = true;
      }

      // Load balance
      if (loadBalancingEnabled) {
        if (loadBalanceHash) {
          config.load_balance_hash = loadBalanceHash;
        }
        if (loadBalanceBackend.trim()) {
          config.load_balance_backend = loadBalanceBackend.trim();
        }
        if (loadBalanceBackendWeight.trim()) {
          config.load_balance_backend_weight = loadBalanceBackendWeight.trim();
        }
      }

      // Flags
      config.disable = disable;
      config.exclude = exclude;
      config.log = log;

      // Update the rule
      await natService.updateSourceRule(rule.rule_number, config);

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update source NAT rule");
    } finally {
      setLoading(false);
    }
  };

  const getAddressGroups = () => (groups || []).filter(g => g.type === "address-group" || g.type === "ipv6-address-group");
  const getNetworkGroups = () => (groups || []).filter(g => g.type === "network-group" || g.type === "ipv6-network-group");
  const getDomainGroups = () => (groups || []).filter(g => g.type === "domain-group");
  const getInterfaceGroups = () => (groups || []).filter(g => g.type === "interface-group");
  const getPortGroups = () => (groups || []).filter(g => g.type === "port-group");

  if (!rule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Source NAT Rule {rule.rule_number}</DialogTitle>
          <DialogDescription>
            Modify the source NAT rule configuration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error Alert */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for this rule"
              rows={2}
            />
          </div>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="source">Source</TabsTrigger>
              <TabsTrigger value="destination">Destination</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* Basic Tab */}
            <TabsContent value="basic" className="space-y-4">
              {/* Outbound Interface */}
              <div className="space-y-2">
                <Label>Outbound Interface Type</Label>
                <RadioGroup value={outboundInterfaceType} onValueChange={(v) => setOutboundInterfaceType(v as "name" | "group")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="name" id="outbound-name" />
                    <Label htmlFor="outbound-name">Interface Name</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="group" id="outbound-group" />
                    <Label htmlFor="outbound-group">Interface Group</Label>
                  </div>
                </RadioGroup>
              </div>

              {outboundInterfaceType === "name" ? (
                <div className="space-y-2">
                  <Label htmlFor="outbound-interface-name">Outbound Interface Name</Label>
                  <InterfaceSelect
                    value={outboundInterfaceName}
                    onValueChange={setOutboundInterfaceName}
                    id="outbound-interface-name"
                    placeholder="Select interface"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="outbound-interface-group">Outbound Interface Group</Label>
                  <Select value={outboundInterfaceGroup} onValueChange={setOutboundInterfaceGroup}>
                    <SelectTrigger id="outbound-interface-group">
                      <SelectValue placeholder="Select interface group" />
                    </SelectTrigger>
                    <SelectContent>
                      {getInterfaceGroups().map((group) => (
                        <SelectItem key={group.name} value={group.name}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="outbound-invert"
                  checked={outboundInterfaceInvert}
                  onCheckedChange={(checked) => setOutboundInterfaceInvert(checked === true)}
                />
                <Label htmlFor="outbound-invert" className="text-sm font-normal">
                  Invert match (all except this interface)
                </Label>
              </div>

              {/* Translation */}
              <div className="space-y-2">
                <Label>Translation Type</Label>
                <RadioGroup value={translationType} onValueChange={(v) => setTranslationType(v as "ip" | "cidr" | "range" | "masquerade")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="masquerade" id="trans-masquerade" />
                    <Label htmlFor="trans-masquerade">Masquerade (use outbound interface address)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ip" id="trans-ip" />
                    <Label htmlFor="trans-ip">IP Address</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cidr" id="trans-cidr" />
                    <Label htmlFor="trans-cidr">CIDR Block</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="range" id="trans-range" />
                    <Label htmlFor="trans-range">IP Range</Label>
                  </div>
                </RadioGroup>
              </div>

              {translationType !== "masquerade" && (
                <div className="space-y-2">
                  <Label htmlFor="translation-address">
                    Translation Address
                    {translationType === "cidr" && " (e.g., 192.168.1.0/24)"}
                    {translationType === "range" && " (e.g., 192.168.1.10-192.168.1.20)"}
                    {translationType === "ip" && " (e.g., 203.0.113.10)"}
                  </Label>
                  <Input
                    id="translation-address"
                    value={translationAddress}
                    onChange={(e) => setTranslationAddress(e.target.value)}
                    placeholder={
                      translationType === "cidr" ? "192.168.1.0/24"
                        : translationType === "range" ? "192.168.1.10-192.168.1.20"
                          : "203.0.113.10"
                    }
                    className="font-mono"
                  />
                </div>
              )}

              {translationType !== "masquerade" && (
                <div className="space-y-2">
                  <Label htmlFor="translation-port">Translation Port</Label>
                  <Input
                    id="translation-port"
                    value={translationPort}
                    onChange={(e) => setTranslationPort(e.target.value)}
                    placeholder="e.g., 8080 or 1024-65535"
                    className="font-mono"
                  />
                </div>
              )}

              {/* Translation Options */}
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="translation-port-mapping"
                    checked={translationPortMapping}
                    onCheckedChange={(checked) => setTranslationPortMapping(checked === true)}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="translation-port-mapping" className="text-sm font-medium cursor-pointer">
                      Randomize source port (port-mapping random)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Randomizes the outbound source port for privacy and security
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="translation-address-mapping"
                    checked={translationAddressMapping}
                    onCheckedChange={(checked) => setTranslationAddressMapping(checked === true)}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="translation-address-mapping" className="text-sm font-medium cursor-pointer">
                      Persistent address mapping
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      The same internal IP always maps to the same external IP
                    </p>
                  </div>
                </div>
              </div>

              {/* Protocol */}
              <div className="space-y-2">
                <Label htmlFor="protocol">Protocol</Label>
                <Select value={protocol} onValueChange={setProtocol}>
                  <SelectTrigger id="protocol">
                    <SelectValue />
                  </SelectTrigger>
                  {(sourcePort.trim() || destinationPort.trim() || sourcePortGroupName || destPortGroupName) ? (
                    // When ports are specified, only allow TCP/UDP protocols
                    <SelectContent>
                      <SelectItem value="tcp">TCP</SelectItem>
                      <SelectItem value="udp">UDP</SelectItem>
                      <SelectItem value="tcp_udp">TCP & UDP</SelectItem>
                    </SelectContent>
                  ) : (
                    // When no ports, allow all protocols
                    <SelectContent>
                      <SelectItem value="all">All (default)</SelectItem>
                      <SelectItem value="tcp">TCP</SelectItem>
                      <SelectItem value="udp">UDP</SelectItem>
                      <SelectItem value="tcp_udp">TCP & UDP</SelectItem>
                      <SelectItem value="icmp">ICMP</SelectItem>
                      <SelectItem value="ip">IP</SelectItem>
                      <SelectItem value="ipv6">IPv6</SelectItem>
                      <SelectItem value="hopopt">IPv6 Hop-by-Hop Option</SelectItem>
                      <SelectItem value="igmp">IGMP</SelectItem>
                      <SelectItem value="ggp">Gateway-Gateway Protocol</SelectItem>
                      <SelectItem value="ipencap">IP Encapsulated in IP</SelectItem>
                      <SelectItem value="st">ST Datagram Mode</SelectItem>
                      <SelectItem value="egp">Exterior Gateway Protocol</SelectItem>
                      <SelectItem value="igp">Interior Gateway Protocol</SelectItem>
                      <SelectItem value="pup">PARC Universal Packet</SelectItem>
                      <SelectItem value="hmp">Host Monitoring Protocol</SelectItem>
                      <SelectItem value="xns-idp">Xerox NS IDP</SelectItem>
                      <SelectItem value="rdp">Reliable Datagram Protocol</SelectItem>
                      <SelectItem value="iso-tp4">ISO Transport Protocol Class 4</SelectItem>
                      <SelectItem value="dccp">Datagram Congestion Control Protocol</SelectItem>
                      <SelectItem value="xtp">Xpress Transfer Protocol</SelectItem>
                      <SelectItem value="ddp">Datagram Delivery Protocol</SelectItem>
                      <SelectItem value="idpr-cmtp">IDPR Control Message Transport</SelectItem>
                      <SelectItem value="ipv6-route">IPv6 Routing Header</SelectItem>
                      <SelectItem value="ipv6-frag">IPv6 Fragment Header</SelectItem>
                      <SelectItem value="idrp">Inter-Domain Routing Protocol</SelectItem>
                      <SelectItem value="rsvp">Reservation Protocol</SelectItem>
                      <SelectItem value="gre">GRE</SelectItem>
                      <SelectItem value="esp">Encapsulating Security Payload</SelectItem>
                      <SelectItem value="ah">Authentication Header</SelectItem>
                      <SelectItem value="skip">SKIP</SelectItem>
                      <SelectItem value="ipv6-icmp">ICMPv6</SelectItem>
                      <SelectItem value="ipv6-nonxt">IPv6 No Next Header</SelectItem>
                      <SelectItem value="ipv6-opts">IPv6 Destination Options</SelectItem>
                      <SelectItem value="rspf">Radio Shortest Path First</SelectItem>
                      <SelectItem value="vmtp">Versatile Message Transport</SelectItem>
                      <SelectItem value="eigrp">EIGRP</SelectItem>
                      <SelectItem value="ospf">OSPF</SelectItem>
                      <SelectItem value="ax.25">AX.25 Frames</SelectItem>
                      <SelectItem value="ipip">IP-within-IP Encapsulation</SelectItem>
                      <SelectItem value="etherip">Ethernet-within-IP Encapsulation</SelectItem>
                      <SelectItem value="encap">IP Encapsulation</SelectItem>
                      <SelectItem value="pim">Protocol Independent Multicast</SelectItem>
                      <SelectItem value="ipcomp">IP Payload Compression</SelectItem>
                      <SelectItem value="vrrp">VRRP</SelectItem>
                      <SelectItem value="l2tp">L2TP</SelectItem>
                      <SelectItem value="isis">IS-IS over IPv4</SelectItem>
                      <SelectItem value="sctp">SCTP</SelectItem>
                      <SelectItem value="fc">Fibre Channel</SelectItem>
                      <SelectItem value="mobility-header">IPv6 Mobility Support</SelectItem>
                      <SelectItem value="udplite">UDP-Lite</SelectItem>
                      <SelectItem value="mpls-in-ip">MPLS-in-IP</SelectItem>
                      <SelectItem value="manet">MANET Protocols</SelectItem>
                      <SelectItem value="hip">Host Identity Protocol</SelectItem>
                      <SelectItem value="shim6">Shim6 Protocol</SelectItem>
                      <SelectItem value="wesp">Wrapped Encapsulating Security Payload</SelectItem>
                      <SelectItem value="rohc">Robust Header Compression</SelectItem>
                    </SelectContent>
                  )}
                </Select>
                {(sourcePort.trim() || destinationPort.trim() || sourcePortGroupName || destPortGroupName) && (
                  <p className="text-xs text-muted-foreground">
                    Only TCP/UDP protocols are available when using ports
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Source Tab */}
            <TabsContent value="source" className="space-y-4">
              <div className="space-y-2">
                <Label>Source Type</Label>
                <RadioGroup value={sourceType} onValueChange={(v) => setSourceType(v as "address" | "group" | "fqdn")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="address" id="source-address" />
                    <Label htmlFor="source-address">Address/Network</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="group" id="source-group" />
                    <Label htmlFor="source-group">Firewall Group</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fqdn" id="source-fqdn" />
                    <Label htmlFor="source-fqdn">FQDN</Label>
                  </div>
                </RadioGroup>
              </div>

              {sourceType === "fqdn" && (
                <div className="space-y-2">
                  <Label htmlFor="source-fqdn-input">Source FQDN</Label>
                  <Input
                    id="source-fqdn-input"
                    value={sourceFqdn}
                    onChange={(e) => setSourceFqdn(e.target.value)}
                    placeholder="e.g., example.com"
                    className="font-mono"
                  />
                </div>
              )}

              {sourceType === "address" ? (
                <div className="space-y-2">
                  <Label htmlFor="source-address-input">Source Address</Label>
                  <Input
                    id="source-address-input"
                    value={sourceAddress}
                    onChange={(e) => setSourceAddress(e.target.value)}
                    placeholder="e.g., 192.168.1.0/24 or 10.0.0.1"
                    className="font-mono"
                  />
                </div>
              ) : sourceType === "fqdn" ? null : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="source-group-type">Source Group Type</Label>
                    <Select value={sourceGroupType} onValueChange={setSourceGroupType}>
                      <SelectTrigger id="source-group-type">
                        <SelectValue placeholder="Select group type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="address-group">Address Group</SelectItem>
                        <SelectItem value="network-group">Network Group</SelectItem>
                        <SelectItem value="domain-group">Domain Group</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source-group-name">Source Group Name</Label>
                    <Select value={sourceGroupName} onValueChange={setSourceGroupName}>
                      <SelectTrigger id="source-group-name">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceGroupType === "address-group" && getAddressGroups().map((group) => (
                          <SelectItem key={group.name} value={group.name}>{group.name}</SelectItem>
                        ))}
                        {sourceGroupType === "network-group" && getNetworkGroups().map((group) => (
                          <SelectItem key={group.name} value={group.name}>{group.name}</SelectItem>
                        ))}
                        {sourceGroupType === "domain-group" && getDomainGroups().map((group) => (
                          <SelectItem key={group.name} value={group.name}>{group.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="source-invert"
                  checked={sourceInvert}
                  onCheckedChange={(checked) => setSourceInvert(checked === true)}
                />
                <Label htmlFor="source-invert" className="text-sm font-normal">
                  Invert match
                </Label>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">Source Port</Label>
                <RadioGroup value={sourcePortType} onValueChange={(v) => {
                  setSourcePortType(v as "input" | "group");
                  if (v === "input") setSourcePortGroupName("");
                  if (v === "group") setSourcePort("");
                }}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="input" id="source-port-input-radio" />
                    <Label htmlFor="source-port-input-radio">Port</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="group" id="source-port-group-radio" />
                    <Label htmlFor="source-port-group-radio">Port Group</Label>
                  </div>
                </RadioGroup>

                {sourcePortType === "input" ? (
                  <Input
                    id="source-port"
                    value={sourcePort}
                    onChange={(e) => setSourcePort(e.target.value)}
                    placeholder="e.g., 80, 443, 1024-65535"
                    className="font-mono"
                  />
                ) : (
                  <Select value={sourcePortGroupName} onValueChange={setSourcePortGroupName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select port group" />
                    </SelectTrigger>
                    <SelectContent>
                      {getPortGroups().map((g) => (
                        <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </TabsContent>

            {/* Destination Tab */}
            <TabsContent value="destination" className="space-y-4">
              <div className="space-y-2">
                <Label>Destination Type</Label>
                <RadioGroup value={destinationType} onValueChange={(v) => setDestinationType(v as "address" | "group" | "fqdn")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="address" id="dest-address" />
                    <Label htmlFor="dest-address">Address/Network</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="group" id="dest-group" />
                    <Label htmlFor="dest-group">Firewall Group</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fqdn" id="dest-fqdn" />
                    <Label htmlFor="dest-fqdn">FQDN</Label>
                  </div>
                </RadioGroup>
              </div>

              {destinationType === "fqdn" && (
                <div className="space-y-2">
                  <Label htmlFor="destination-fqdn-input">Destination FQDN</Label>
                  <Input
                    id="destination-fqdn-input"
                    value={destinationFqdn}
                    onChange={(e) => setDestinationFqdn(e.target.value)}
                    placeholder="e.g., example.com"
                    className="font-mono"
                  />
                </div>
              )}

              {destinationType === "address" ? (
                <div className="space-y-2">
                  <Label htmlFor="destination-address-input">Destination Address</Label>
                  <Input
                    id="destination-address-input"
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    placeholder="e.g., 203.0.113.0/24"
                    className="font-mono"
                  />
                </div>
              ) : destinationType === "fqdn" ? null : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="destination-group-type">Destination Group Type</Label>
                    <Select value={destinationGroupType} onValueChange={setDestinationGroupType}>
                      <SelectTrigger id="destination-group-type">
                        <SelectValue placeholder="Select group type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="address-group">Address Group</SelectItem>
                        <SelectItem value="network-group">Network Group</SelectItem>
                        <SelectItem value="domain-group">Domain Group</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destination-group-name">Destination Group Name</Label>
                    <Select value={destinationGroupName} onValueChange={setDestinationGroupName}>
                      <SelectTrigger id="destination-group-name">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinationGroupType === "address-group" && getAddressGroups().map((group) => (
                          <SelectItem key={group.name} value={group.name}>{group.name}</SelectItem>
                        ))}
                        {destinationGroupType === "network-group" && getNetworkGroups().map((group) => (
                          <SelectItem key={group.name} value={group.name}>{group.name}</SelectItem>
                        ))}
                        {destinationGroupType === "domain-group" && getDomainGroups().map((group) => (
                          <SelectItem key={group.name} value={group.name}>{group.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="destination-invert"
                  checked={destinationInvert}
                  onCheckedChange={(checked) => setDestinationInvert(checked === true)}
                />
                <Label htmlFor="destination-invert" className="text-sm font-normal">
                  Invert match
                </Label>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">Destination Port</Label>
                <RadioGroup value={destPortType} onValueChange={(v) => {
                  setDestPortType(v as "input" | "group");
                  if (v === "input") setDestPortGroupName("");
                  if (v === "group") setDestinationPort("");
                }}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="input" id="dest-port-input-radio" />
                    <Label htmlFor="dest-port-input-radio">Port</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="group" id="dest-port-group-radio" />
                    <Label htmlFor="dest-port-group-radio">Port Group</Label>
                  </div>
                </RadioGroup>

                {destPortType === "input" ? (
                  <Input
                    id="destination-port"
                    value={destinationPort}
                    onChange={(e) => setDestinationPort(e.target.value)}
                    placeholder="e.g., 80, 443, 8080"
                    className="font-mono"
                  />
                ) : (
                  <Select value={destPortGroupName} onValueChange={setDestPortGroupName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select port group" />
                    </SelectTrigger>
                    <SelectContent>
                      {getPortGroups().map((g) => (
                        <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4">
              {/* Packet Type */}
              <div className="space-y-2">
                <Label htmlFor="packet-type">Packet Type</Label>
                <Select value={packetType} onValueChange={setPacketType}>
                  <SelectTrigger id="packet-type">
                    <SelectValue placeholder="Select packet type (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="broadcast">Broadcast</SelectItem>
                    <SelectItem value="host">Host</SelectItem>
                    <SelectItem value="multicast">Multicast</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Load Balance */}
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="enable-load-balancing"
                      checked={loadBalancingEnabled}
                      onCheckedChange={(checked) => setLoadBalancingEnabled(checked === true)}
                      className="mt-1"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="enable-load-balancing" className="text-sm font-medium cursor-pointer">
                        Enable Load Balancing
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Distribute connections across multiple backend servers using a hash algorithm
                      </p>
                    </div>
                  </div>
                </div>

                {loadBalancingEnabled && (
                  <div className="space-y-4 pl-6 border-l-2 border-muted">
                    <div className="space-y-2">
                      <Label htmlFor="load-balance-hash">
                        Hash Method <span className="text-destructive">*</span>
                      </Label>
                      <Select value={loadBalanceHash} onValueChange={setLoadBalanceHash}>
                        <SelectTrigger id="load-balance-hash">
                          <SelectValue placeholder="Select hash algorithm" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="source-address">Source Address</SelectItem>
                          <SelectItem value="destination-address">Destination Address</SelectItem>
                          <SelectItem value="source-port">Source Port</SelectItem>
                          <SelectItem value="destination-port">Destination Port</SelectItem>
                          <SelectItem value="random">Random</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Algorithm used to distribute traffic across backend servers
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="load-balance-backend">
                        Backend Server IP <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="load-balance-backend"
                        value={loadBalanceBackend}
                        onChange={(e) => setLoadBalanceBackend(e.target.value)}
                        placeholder="e.g., 192.168.1.20"
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Internal IP address of the backend server to receive translated traffic
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="load-balance-weight">Backend Weight</Label>
                      <Input
                        id="load-balance-weight"
                        value={loadBalanceBackendWeight}
                        onChange={(e) => setLoadBalanceBackendWeight(e.target.value)}
                        placeholder="e.g., 10 (optional, relative weight)"
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Relative weight for this backend in load balancing
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Flags */}
              <div className="space-y-4">
                <h4 className="font-medium">Rule Flags</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="disable"
                      checked={disable}
                      onCheckedChange={(checked) => setDisable(checked === true)}
                    />
                    <Label htmlFor="disable" className="text-sm font-normal">
                      Disable this rule
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="exclude"
                      checked={exclude}
                      onCheckedChange={(checked) => setExclude(checked === true)}
                    />
                    <Label htmlFor="exclude" className="text-sm font-normal">
                      Exclude from NAT
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="log"
                      checked={log}
                      onCheckedChange={(checked) => setLog(checked === true)}
                    />
                    <Label htmlFor="log" className="text-sm font-normal">
                      Enable logging
                    </Label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Updating..." : "Update Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
