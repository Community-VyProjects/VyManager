"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import {
  nat66Service,
  type NAT66SourceRule,
  type NAT66DestinationRule,
  type NAT66Capabilities,
} from "@/lib/api/nat66";
import { showService } from "@/lib/api/show";
import { firewallGroupsService } from "@/lib/api/firewall-groups";
import type { FirewallGroup } from "@/lib/api/types/firewall-groups";

interface NAT66RuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleType: "source" | "destination";
  editingRule?: NAT66SourceRule | NAT66DestinationRule | null;
  capabilities?: NAT66Capabilities | null;
  nextRuleNumber: number;
  onSuccess: () => void;
}

export function NAT66RuleDialog({
  open,
  onOpenChange,
  ruleType,
  editingRule,
  capabilities,
  nextRuleNumber,
  onSuccess,
}: NAT66RuleDialogProps) {
  const isEditing = !!editingRule;
  const isSource = ruleType === "source";
  const groupsSupported = capabilities?.features?.groups?.supported ?? false;

  // Dropdown data
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [groups, setGroups] = useState<FirewallGroup[]>([]);

  // Form fields
  const [description, setDescription] = useState("");
  const [protocol, setProtocol] = useState("all");
  const [interfaceName, setInterfaceName] = useState("");

  // Source - radio toggle: user input vs firewall group
  const [sourceType, setSourceType] = useState<"input" | "group">("input");
  const [sourceValue, setSourceValue] = useState("");
  const [sourceGroupType, setSourceGroupType] = useState("");
  const [sourceGroupName, setSourceGroupName] = useState("");
  // Source port - radio toggle: user input vs port group
  const [sourcePortType, setSourcePortType] = useState<"input" | "group">("input");
  const [sourcePort, setSourcePort] = useState("");
  const [sourcePortGroupName, setSourcePortGroupName] = useState("");

  // Destination - radio toggle: user input vs firewall group
  const [destinationType, setDestinationType] = useState<"input" | "group">("input");
  const [destinationValue, setDestinationValue] = useState("");
  const [destinationGroupType, setDestinationGroupType] = useState("");
  const [destinationGroupName, setDestinationGroupName] = useState("");
  // Destination port - radio toggle: user input vs port group
  const [destPortType, setDestPortType] = useState<"input" | "group">("input");
  const [destinationPort, setDestinationPort] = useState("");
  const [destPortGroupName, setDestPortGroupName] = useState("");

  // Translation
  const [translationType, setTranslationType] = useState<"address" | "masquerade">("address");
  const [translationAddress, setTranslationAddress] = useState("");
  const [translationPort, setTranslationPort] = useState("");

  // Flags
  const [disable, setDisable] = useState(false);
  const [exclude, setExclude] = useState(false);
  const [log, setLog] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load interfaces and firewall groups on open
  useEffect(() => {
    if (open) {
      loadInterfaces();
      if (groupsSupported) {
        loadGroups();
      }
    }
  }, [open, groupsSupported]);

  const loadInterfaces = async () => {
    try {
      const data = await showService.getAllInterfaces();
      setInterfaces(data.interfaces.map((i) => i.name).sort());
    } catch (err) {
      console.error("Failed to load interfaces:", err);
    }
  };

  const loadGroups = async () => {
    try {
      const config = await firewallGroupsService.getConfig();
      // NAT66 is IPv6-only: only ipv6-address, ipv6-network, mac, domain, port groups
      const allGroups = [
        ...config.ipv6_address_groups,
        ...config.ipv6_network_groups,
        ...config.port_groups,
        ...config.mac_groups,
        ...config.domain_groups,
      ];
      setGroups(allGroups);
    } catch (err) {
      console.error("Failed to load firewall groups:", err);
    }
  };

  // Group filter helpers - IPv6 only
  const getAddressGroups = () => (groups || []).filter(g => g.type === "ipv6-address-group");
  const getNetworkGroups = () => (groups || []).filter(g => g.type === "ipv6-network-group");
  const getDomainGroups = () => (groups || []).filter(g => g.type === "domain-group");
  const getMacGroups = () => (groups || []).filter(g => g.type === "mac-group");
  const getPortGroups = () => (groups || []).filter(g => g.type === "port-group");

  const getGroupsByType = (groupType: string) => {
    switch (groupType) {
      case "address-group": return getAddressGroups();
      case "network-group": return getNetworkGroups();
      case "domain-group": return getDomainGroups();
      case "mac-group": return getMacGroups();
      default: return [];
    }
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setError(null);
      if (editingRule) {
        setDescription(editingRule.description || "");
        setProtocol(editingRule.protocol || "all");
        setDisable(editingRule.disable);
        setExclude(editingRule.exclude);
        setLog(editingRule.log);

        if (isSource) {
          const rule = editingRule as NAT66SourceRule;
          setInterfaceName(rule.outbound_interface || "");
          // Determine source type: address group or user input
          const srcGroup = rule.source?.group;
          const srcHasAddrGroup = srcGroup && (srcGroup.address_group || srcGroup.network_group || srcGroup.domain_group || srcGroup.mac_group);
          if (srcHasAddrGroup) {
            setSourceType("group");
            if (srcGroup.address_group) { setSourceGroupType("address-group"); setSourceGroupName(srcGroup.address_group); }
            else if (srcGroup.network_group) { setSourceGroupType("network-group"); setSourceGroupName(srcGroup.network_group); }
            else if (srcGroup.domain_group) { setSourceGroupType("domain-group"); setSourceGroupName(srcGroup.domain_group); }
            else if (srcGroup.mac_group) { setSourceGroupType("mac-group"); setSourceGroupName(srcGroup.mac_group); }
            setSourceValue("");
          } else {
            setSourceType("input");
            setSourceValue(rule.source?.prefix || "");
            setSourceGroupType("");
            setSourceGroupName("");
          }
          // Source port: port group or user input
          if (srcGroup?.port_group) {
            setSourcePortType("group");
            setSourcePortGroupName(srcGroup.port_group);
            setSourcePort("");
          } else if (rule.source?.port) {
            setSourcePortType("input");
            setSourcePort(rule.source.port);
            setSourcePortGroupName("");
          } else {
            setSourcePortType("input");
            setSourcePort("");
            setSourcePortGroupName("");
          }
          // Destination address group or user input
          const dstGroup = rule.destination?.group;
          const dstHasAddrGroup = dstGroup && (dstGroup.address_group || dstGroup.network_group || dstGroup.domain_group || dstGroup.mac_group);
          if (dstHasAddrGroup) {
            setDestinationType("group");
            if (dstGroup.address_group) { setDestinationGroupType("address-group"); setDestinationGroupName(dstGroup.address_group); }
            else if (dstGroup.network_group) { setDestinationGroupType("network-group"); setDestinationGroupName(dstGroup.network_group); }
            else if (dstGroup.domain_group) { setDestinationGroupType("domain-group"); setDestinationGroupName(dstGroup.domain_group); }
            else if (dstGroup.mac_group) { setDestinationGroupType("mac-group"); setDestinationGroupName(dstGroup.mac_group); }
            setDestinationValue("");
          } else {
            setDestinationType("input");
            setDestinationValue(rule.destination?.prefix || "");
            setDestinationGroupType("");
            setDestinationGroupName("");
          }
          // Destination port: port group or user input
          if (dstGroup?.port_group) {
            setDestPortType("group");
            setDestPortGroupName(dstGroup.port_group);
            setDestinationPort("");
          } else if (rule.destination?.port) {
            setDestPortType("input");
            setDestinationPort(rule.destination.port);
            setDestPortGroupName("");
          } else {
            setDestPortType("input");
            setDestinationPort("");
            setDestPortGroupName("");
          }
        } else {
          const rule = editingRule as NAT66DestinationRule;
          setInterfaceName(rule.inbound_interface || "");
          // Source address group or user input
          const srcGroup = rule.source?.group;
          const srcHasAddrGroup = srcGroup && (srcGroup.address_group || srcGroup.network_group || srcGroup.domain_group || srcGroup.mac_group);
          if (srcHasAddrGroup) {
            setSourceType("group");
            if (srcGroup.address_group) { setSourceGroupType("address-group"); setSourceGroupName(srcGroup.address_group); }
            else if (srcGroup.network_group) { setSourceGroupType("network-group"); setSourceGroupName(srcGroup.network_group); }
            else if (srcGroup.domain_group) { setSourceGroupType("domain-group"); setSourceGroupName(srcGroup.domain_group); }
            else if (srcGroup.mac_group) { setSourceGroupType("mac-group"); setSourceGroupName(srcGroup.mac_group); }
            setSourceValue("");
          } else {
            setSourceType("input");
            setSourceValue(rule.source?.address || "");
            setSourceGroupType("");
            setSourceGroupName("");
          }
          // Source port
          if (srcGroup?.port_group) {
            setSourcePortType("group");
            setSourcePortGroupName(srcGroup.port_group);
            setSourcePort("");
          } else if (rule.source?.port) {
            setSourcePortType("input");
            setSourcePort(rule.source.port);
            setSourcePortGroupName("");
          } else {
            setSourcePortType("input");
            setSourcePort("");
            setSourcePortGroupName("");
          }
          // Destination address group or user input
          const dstGroup = rule.destination?.group;
          const dstHasAddrGroup = dstGroup && (dstGroup.address_group || dstGroup.network_group || dstGroup.domain_group || dstGroup.mac_group);
          if (dstHasAddrGroup) {
            setDestinationType("group");
            if (dstGroup.address_group) { setDestinationGroupType("address-group"); setDestinationGroupName(dstGroup.address_group); }
            else if (dstGroup.network_group) { setDestinationGroupType("network-group"); setDestinationGroupName(dstGroup.network_group); }
            else if (dstGroup.domain_group) { setDestinationGroupType("domain-group"); setDestinationGroupName(dstGroup.domain_group); }
            else if (dstGroup.mac_group) { setDestinationGroupType("mac-group"); setDestinationGroupName(dstGroup.mac_group); }
            setDestinationValue("");
          } else {
            setDestinationType("input");
            setDestinationValue(rule.destination?.address || "");
            setDestinationGroupType("");
            setDestinationGroupName("");
          }
          // Destination port
          if (dstGroup?.port_group) {
            setDestPortType("group");
            setDestPortGroupName(dstGroup.port_group);
            setDestinationPort("");
          } else if (rule.destination?.port) {
            setDestPortType("input");
            setDestinationPort(rule.destination.port);
            setDestPortGroupName("");
          } else {
            setDestPortType("input");
            setDestinationPort("");
            setDestPortGroupName("");
          }
        }

        const isMasq = isSource && editingRule.translation?.address === "masquerade";
        setTranslationType(isMasq ? "masquerade" : "address");
        setTranslationAddress(isMasq ? "" : editingRule.translation?.address || "");
        setTranslationPort(editingRule.translation?.port || "");
      } else {
        resetForm();
      }
    }
  }, [open, editingRule, isSource]);

  const resetForm = () => {
    setDescription("");
    setProtocol("all");
    setInterfaceName("");
    setSourceType("input");
    setSourceValue("");
    setSourceGroupType("");
    setSourceGroupName("");
    setSourcePortType("input");
    setSourcePort("");
    setSourcePortGroupName("");
    setDestinationType("input");
    setDestinationValue("");
    setDestinationGroupType("");
    setDestinationGroupName("");
    setDestPortType("input");
    setDestinationPort("");
    setDestPortGroupName("");
    setTranslationType(isSource ? "masquerade" : "address");
    setTranslationAddress("");
    setTranslationPort("");
    setDisable(false);
    setExclude(false);
    setLog(false);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const effectiveTranslationAddress =
        translationType === "masquerade" && isSource
          ? "masquerade"
          : translationAddress || undefined;

      // Determine source/dest values based on radio selection
      const effectiveSourceValue = sourceType === "input" ? sourceValue : undefined;
      const effectiveDestValue = destinationType === "input" ? destinationValue : undefined;
      // Port is only sent when user picked "input" for port
      const effectiveSourcePort = sourcePortType === "input" ? sourcePort : undefined;
      const effectiveDestPort = destPortType === "input" ? destinationPort : undefined;

      if (isSource) {
        if (isEditing) {
          await nat66Service.updateSourceRule(
            editingRule!.rule_number,
            editingRule as NAT66SourceRule,
            {
              description,
              sourcePrefix: effectiveSourceValue,
              sourcePort: effectiveSourcePort,
              destinationPrefix: effectiveDestValue,
              destinationPort: effectiveDestPort,
              outboundInterface: interfaceName,
              protocol: protocol === "all" ? "" : protocol,
              translationAddress: effectiveTranslationAddress,
              translationPort,
              exclude,
              log,
              disable,
            }
          );
        } else {
          await nat66Service.createSourceRule({
            ruleNumber: nextRuleNumber,
            description: description || undefined,
            sourcePrefix: effectiveSourceValue || undefined,
            sourcePort: effectiveSourcePort || undefined,
            destinationPrefix: effectiveDestValue || undefined,
            destinationPort: effectiveDestPort || undefined,
            outboundInterface: interfaceName || undefined,
            protocol: protocol && protocol !== "all" ? protocol : undefined,
            translationAddress: effectiveTranslationAddress,
            translationPort: translationPort || undefined,
            exclude,
            log,
            disable,
          });
        }

        // Handle source address groups
        if (sourceType === "group" && sourceGroupType && sourceGroupName && groupsSupported) {
          await nat66Service.batchConfigure(
            isEditing ? editingRule!.rule_number : nextRuleNumber,
            "source",
            [{ op: "set_source_rule_source_group", value: `${sourceGroupType}:${sourceGroupName}` }]
          );
        }
        // Handle source port group
        if (sourcePortType === "group" && sourcePortGroupName && groupsSupported) {
          await nat66Service.batchConfigure(
            isEditing ? editingRule!.rule_number : nextRuleNumber,
            "source",
            [{ op: "set_source_rule_source_group", value: `port-group:${sourcePortGroupName}` }]
          );
        }
        // Handle destination address groups
        if (destinationType === "group" && destinationGroupType && destinationGroupName && groupsSupported) {
          await nat66Service.batchConfigure(
            isEditing ? editingRule!.rule_number : nextRuleNumber,
            "source",
            [{ op: "set_source_rule_destination_group", value: `${destinationGroupType}:${destinationGroupName}` }]
          );
        }
        // Handle destination port group
        if (destPortType === "group" && destPortGroupName && groupsSupported) {
          await nat66Service.batchConfigure(
            isEditing ? editingRule!.rule_number : nextRuleNumber,
            "source",
            [{ op: "set_source_rule_destination_group", value: `port-group:${destPortGroupName}` }]
          );
        }
      } else {
        if (isEditing) {
          await nat66Service.updateDestinationRule(
            editingRule!.rule_number,
            editingRule as NAT66DestinationRule,
            {
              description,
              sourceAddress: effectiveSourceValue,
              sourcePort: effectiveSourcePort,
              destinationAddress: effectiveDestValue,
              destinationPort: effectiveDestPort,
              inboundInterface: interfaceName,
              protocol: protocol === "all" ? "" : protocol,
              translationAddress: translationAddress || undefined,
              translationPort,
              exclude,
              log,
              disable,
            }
          );
        } else {
          await nat66Service.createDestinationRule({
            ruleNumber: nextRuleNumber,
            description: description || undefined,
            sourceAddress: effectiveSourceValue || undefined,
            sourcePort: effectiveSourcePort || undefined,
            destinationAddress: effectiveDestValue || undefined,
            destinationPort: effectiveDestPort || undefined,
            inboundInterface: interfaceName || undefined,
            protocol: protocol && protocol !== "all" ? protocol : undefined,
            translationAddress: translationAddress || undefined,
            translationPort: translationPort || undefined,
            exclude,
            log,
            disable,
          });
        }

        // Handle source address groups
        if (sourceType === "group" && sourceGroupType && sourceGroupName && groupsSupported) {
          await nat66Service.batchConfigure(
            isEditing ? editingRule!.rule_number : nextRuleNumber,
            "destination",
            [{ op: "set_destination_rule_source_group", value: `${sourceGroupType}:${sourceGroupName}` }]
          );
        }
        // Handle source port group
        if (sourcePortType === "group" && sourcePortGroupName && groupsSupported) {
          await nat66Service.batchConfigure(
            isEditing ? editingRule!.rule_number : nextRuleNumber,
            "destination",
            [{ op: "set_destination_rule_source_group", value: `port-group:${sourcePortGroupName}` }]
          );
        }
        // Handle destination address groups
        if (destinationType === "group" && destinationGroupType && destinationGroupName && groupsSupported) {
          await nat66Service.batchConfigure(
            isEditing ? editingRule!.rule_number : nextRuleNumber,
            "destination",
            [{ op: "set_destination_rule_destination_group", value: `${destinationGroupType}:${destinationGroupName}` }]
          );
        }
        // Handle destination port group
        if (destPortType === "group" && destPortGroupName && groupsSupported) {
          await nat66Service.batchConfigure(
            isEditing ? editingRule!.rule_number : nextRuleNumber,
            "destination",
            [{ op: "set_destination_rule_destination_group", value: `port-group:${destPortGroupName}` }]
          );
        }
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const showPortFields = protocol === "tcp" || protocol === "udp" || protocol === "tcp_udp";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? `Edit ${isSource ? "Source" : "Destination"} Rule ${editingRule!.rule_number}`
              : `Create ${isSource ? "Source" : "Destination"} NAT66 Rule`}
          </DialogTitle>
          <DialogDescription>
            {isSource
              ? "Configure an IPv6-to-IPv6 source address translation rule."
              : "Configure an IPv6-to-IPv6 destination address translation rule."}
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

          {/* Rule Number (Auto-calculated) */}
          <div className="space-y-2 bg-muted/30 border border-muted rounded-lg p-4">
            <Label>Rule Number (Auto-assigned)</Label>
            <div className="text-2xl font-mono font-bold text-primary">
              {isEditing ? editingRule!.rule_number : nextRuleNumber}
            </div>
            <p className="text-xs text-muted-foreground">
              This rule will be automatically assigned number {isEditing ? editingRule!.rule_number : nextRuleNumber}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="nat66-desc">Description</Label>
            <Textarea
              id="nat66-desc"
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
              {/* Interface - dropdown from /vyos/show/all-interfaces */}
              <div className="space-y-2">
                <Label htmlFor="nat66-iface">
                  {isSource ? "Outbound Interface" : "Inbound Interface"}
                </Label>
                <Select value={interfaceName} onValueChange={setInterfaceName}>
                  <SelectTrigger id="nat66-iface">
                    <SelectValue placeholder="Select interface" />
                  </SelectTrigger>
                  <SelectContent>
                    {interfaces.map((iface) => (
                      <SelectItem key={iface} value={iface}>
                        {iface}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Translation */}
              {isSource && (
                <div className="space-y-2">
                  <Label>Translation Type</Label>
                  <RadioGroup value={translationType} onValueChange={(v) => setTranslationType(v as "address" | "masquerade")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="masquerade" id="nat66-trans-masq" />
                      <Label htmlFor="nat66-trans-masq">Masquerade (use outbound interface address)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="address" id="nat66-trans-addr-radio" />
                      <Label htmlFor="nat66-trans-addr-radio">IPv6 Address</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {(translationType !== "masquerade" || !isSource) && (
                <div className="space-y-2">
                  <Label htmlFor="nat66-trans-addr">
                    Translation Address
                  </Label>
                  <Input
                    id="nat66-trans-addr"
                    value={translationAddress}
                    onChange={(e) => setTranslationAddress(e.target.value)}
                    placeholder="fd02::1"
                    className="font-mono"
                  />
                </div>
              )}

              {showPortFields && (
                <div className="space-y-2">
                  <Label htmlFor="nat66-trans-port">Translation Port</Label>
                  <Input
                    id="nat66-trans-port"
                    value={translationPort}
                    onChange={(e) => setTranslationPort(e.target.value)}
                    placeholder="e.g., 8080"
                    className="font-mono"
                  />
                </div>
              )}

              {/* Protocol */}
              <div className="space-y-2">
                <Label htmlFor="nat66-protocol">Protocol</Label>
                <Select value={protocol} onValueChange={setProtocol}>
                  <SelectTrigger id="nat66-protocol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All (default)</SelectItem>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="udp">UDP</SelectItem>
                    <SelectItem value="tcp_udp">TCP & UDP</SelectItem>
                    <SelectItem value="icmpv6">ICMPv6</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Source Tab */}
            <TabsContent value="source" className="space-y-4">
              {/* Source address/prefix vs firewall group — independent of port */}
              <div className="space-y-3">
                <Label className="text-base font-medium">{isSource ? "Source Prefix" : "Source Address"}</Label>
                <RadioGroup value={sourceType} onValueChange={(v) => setSourceType(v as "input" | "group")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="input" id="nat66-source-input-radio" />
                    <Label htmlFor="nat66-source-input-radio">Address/Network</Label>
                  </div>
                  {groupsSupported && (
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="group" id="nat66-source-group-radio" />
                      <Label htmlFor="nat66-source-group-radio">Firewall Group</Label>
                    </div>
                  )}
                </RadioGroup>

                {sourceType === "input" ? (
                  <Input
                    id="nat66-source-input"
                    value={sourceValue}
                    onChange={(e) => setSourceValue(e.target.value)}
                    placeholder={isSource ? "fd00::/64" : "fd00::1"}
                    className="font-mono"
                  />
                ) : (
                  <div className="space-y-2">
                    <Select value={sourceGroupType} onValueChange={(v) => { setSourceGroupType(v); setSourceGroupName(""); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select group type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="address-group">IPv6 Address Group</SelectItem>
                        <SelectItem value="network-group">IPv6 Network Group</SelectItem>
                        <SelectItem value="domain-group">Domain Group</SelectItem>
                        <SelectItem value="mac-group">MAC Group</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={sourceGroupName} onValueChange={setSourceGroupName}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {getGroupsByType(sourceGroupType).map((g) => (
                          <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Source port vs port group — independent of address */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Source Port</Label>
                <RadioGroup value={sourcePortType} onValueChange={(v) => {
                  setSourcePortType(v as "input" | "group");
                  if (v === "input") setSourcePortGroupName("");
                  if (v === "group") setSourcePort("");
                }}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="input" id="nat66-source-port-input-radio" />
                    <Label htmlFor="nat66-source-port-input-radio">Port</Label>
                  </div>
                  {groupsSupported && (
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="group" id="nat66-source-port-group-radio" />
                      <Label htmlFor="nat66-source-port-group-radio">Port Group</Label>
                    </div>
                  )}
                </RadioGroup>

                {sourcePortType === "input" ? (
                  <Input
                    id="nat66-source-port"
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
              {/* Destination address/prefix vs firewall group — independent of port */}
              <div className="space-y-3">
                <Label className="text-base font-medium">{isSource ? "Destination Prefix" : "Destination Address"}</Label>
                <RadioGroup value={destinationType} onValueChange={(v) => setDestinationType(v as "input" | "group")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="input" id="nat66-dest-input-radio" />
                    <Label htmlFor="nat66-dest-input-radio">Address/Network</Label>
                  </div>
                  {groupsSupported && (
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="group" id="nat66-dest-group-radio" />
                      <Label htmlFor="nat66-dest-group-radio">Firewall Group</Label>
                    </div>
                  )}
                </RadioGroup>

                {destinationType === "input" ? (
                  <Input
                    id="nat66-dest-input"
                    value={destinationValue}
                    onChange={(e) => setDestinationValue(e.target.value)}
                    placeholder={isSource ? "fd01::/64" : "fd01::1"}
                    className="font-mono"
                  />
                ) : (
                  <div className="space-y-2">
                    <Select value={destinationGroupType} onValueChange={(v) => { setDestinationGroupType(v); setDestinationGroupName(""); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select group type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="address-group">IPv6 Address Group</SelectItem>
                        <SelectItem value="network-group">IPv6 Network Group</SelectItem>
                        <SelectItem value="domain-group">Domain Group</SelectItem>
                        <SelectItem value="mac-group">MAC Group</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={destinationGroupName} onValueChange={setDestinationGroupName}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {getGroupsByType(destinationGroupType).map((g) => (
                          <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Destination port vs port group — independent of address */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Destination Port</Label>
                <RadioGroup value={destPortType} onValueChange={(v) => {
                  setDestPortType(v as "input" | "group");
                  if (v === "input") setDestPortGroupName("");
                  if (v === "group") setDestinationPort("");
                }}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="input" id="nat66-dest-port-input-radio" />
                    <Label htmlFor="nat66-dest-port-input-radio">Port</Label>
                  </div>
                  {groupsSupported && (
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="group" id="nat66-dest-port-group-radio" />
                      <Label htmlFor="nat66-dest-port-group-radio">Port Group</Label>
                    </div>
                  )}
                </RadioGroup>

                {destPortType === "input" ? (
                  <Input
                    id="nat66-dest-port"
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
              <div className="space-y-4">
                <h4 className="font-medium">Rule Flags</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="nat66-disable"
                      checked={disable}
                      onCheckedChange={(checked) => setDisable(checked === true)}
                    />
                    <Label htmlFor="nat66-disable" className="text-sm font-normal">
                      Disable this rule
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="nat66-exclude"
                      checked={exclude}
                      onCheckedChange={(checked) => setExclude(checked === true)}
                    />
                    <Label htmlFor="nat66-exclude" className="text-sm font-normal">
                      Exclude from NAT
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="nat66-log"
                      checked={log}
                      onCheckedChange={(checked) => setLog(checked === true)}
                    />
                    <Label htmlFor="nat66-log" className="text-sm font-normal">
                      Enable logging
                    </Label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save" : "Create Rule")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
