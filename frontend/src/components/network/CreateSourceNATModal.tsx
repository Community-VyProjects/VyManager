"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { natService } from "@/lib/api/nat";
import { firewallGroupsService } from "@/lib/api/firewall-groups";
import { ethernetService } from "@/lib/api/ethernet";
import type { FirewallGroup } from "@/lib/api/types/firewall-groups";
import type { EthernetInterface } from "@/lib/api/types/ethernet";

interface CreateSourceNATModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateSourceNATModal({ open, onOpenChange, onSuccess }: CreateSourceNATModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropdown data
  const [groups, setGroups] = useState<FirewallGroup[]>([]);
  const [interfaces, setInterfaces] = useState<EthernetInterface[]>([]);

  // Auto-calculated rule number
  const [ruleNumber, setRuleNumber] = useState<number>(10);

  // Form fields
  const [description, setDescription] = useState("");

  // Source
  const [sourceType, setSourceType] = useState<"address" | "group">("address");
  const [sourceAddress, setSourceAddress] = useState("");
  const [sourceGroupType, setSourceGroupType] = useState("");
  const [sourceGroupName, setSourceGroupName] = useState("");
  const [sourcePort, setSourcePort] = useState("");

  // Destination
  const [destinationType, setDestinationType] = useState<"address" | "group">("address");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationGroupType, setDestinationGroupType] = useState("");
  const [destinationGroupName, setDestinationGroupName] = useState("");
  const [destinationPort, setDestinationPort] = useState("");

  // Outbound interface
  const [outboundInterfaceType, setOutboundInterfaceType] = useState<"name" | "group">("name");
  const [outboundInterfaceName, setOutboundInterfaceName] = useState("");
  const [outboundInterfaceGroup, setOutboundInterfaceGroup] = useState("");
  const [outboundInterfaceInvert, setOutboundInterfaceInvert] = useState(false);

  // Protocol & Packet Type
  const [protocol, setProtocol] = useState("all");
  const [packetType, setPacketType] = useState("");

  // Translation
  const [translationType, setTranslationType] = useState<"ip" | "cidr" | "range" | "masquerade">("masquerade");
  const [translationAddress, setTranslationAddress] = useState("");

  // Load Balance
  const [loadBalancingEnabled, setLoadBalancingEnabled] = useState(false);
  const [loadBalanceHash, setLoadBalanceHash] = useState("");
  const [loadBalanceBackend, setLoadBalanceBackend] = useState("");

  // Flags
  const [disable, setDisable] = useState(false);
  const [exclude, setExclude] = useState(false);
  const [log, setLog] = useState(false);

  // Load groups, interfaces, and calculate next rule number on mount
  useEffect(() => {
    if (open) {
      loadGroups();
      loadInterfaces();
      calculateNextRuleNumber();
    }
  }, [open]);

  // Auto-adjust protocol when ports are used
  useEffect(() => {
    const hasPort = sourcePort.trim() || destinationPort.trim();
    const portCompatibleProtocols = ["tcp", "udp", "tcp_udp"];

    if (hasPort && !portCompatibleProtocols.includes(protocol)) {
      // Switch to tcp_udp when port is entered and current protocol is incompatible
      setProtocol("tcp_udp");
    } else if (!hasPort && portCompatibleProtocols.includes(protocol) && protocol !== "all") {
      // Switch back to "all" when ports are cleared
      setProtocol("all");
    }
  }, [sourcePort, destinationPort, protocol]);

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

  const loadInterfaces = async () => {
    try {
      const config = await ethernetService.getConfig();
      setInterfaces(config.interfaces);
    } catch (err) {
      console.error("Failed to load interfaces:", err);
    }
  };

  const calculateNextRuleNumber = async () => {
    try {
      const config = await natService.getConfig();

      // Find the maximum rule number for SOURCE NAT rules only
      const sourceRuleNumbers = config.source_rules.map(r => r.rule_number);

      if (sourceRuleNumbers.length === 0) {
        setRuleNumber(100); // Start at 100 if no source rules exist
      } else {
        const maxRuleNumber = Math.max(...sourceRuleNumbers);
        setRuleNumber(maxRuleNumber + 1);
      }
    } catch (err) {
      console.error("Failed to calculate next rule number:", err);
      setRuleNumber(100); // Default to 100 on error
    }
  };

  const resetForm = () => {
    // Don't reset ruleNumber - it's auto-calculated
    setDescription("");
    setSourceType("address");
    setSourceAddress("");
    setSourceGroupType("");
    setSourceGroupName("");
    setSourcePort("");
    setDestinationType("address");
    setDestinationAddress("");
    setDestinationGroupType("");
    setDestinationGroupName("");
    setDestinationPort("");
    setOutboundInterfaceType("name");
    setOutboundInterfaceName("");
    setOutboundInterfaceGroup("");
    setOutboundInterfaceInvert(false);
    setProtocol("all");
    setPacketType("");
    setTranslationType("masquerade");
    setTranslationAddress("");
    setLoadBalanceHash("");
    setLoadBalanceBackend("");
    setDisable(false);
    setExclude(false);
    setLog(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const config: any = {};

      if (description.trim()) {
        config.description = description.trim();
      }

      // Source
      if (sourceType === "address" && sourceAddress.trim()) {
        config.source_address = sourceAddress.trim();
      } else if (sourceType === "group" && sourceGroupType && sourceGroupName) {
        config.source_group_type = sourceGroupType;
        config.source_group_name = sourceGroupName;
      }
      if (sourcePort.trim()) {
        config.source_port = sourcePort.trim();
      }

      // Destination
      if (destinationType === "address" && destinationAddress.trim()) {
        config.destination_address = destinationAddress.trim();
      } else if (destinationType === "group" && destinationGroupType && destinationGroupName) {
        config.destination_group_type = destinationGroupType;
        config.destination_group_name = destinationGroupName;
      }
      if (destinationPort.trim()) {
        config.destination_port = destinationPort.trim();
      }

      // Outbound interface
      if (outboundInterfaceType === "name" && outboundInterfaceName) {
        config.outbound_interface_type = "name";
        config.outbound_interface_value = outboundInterfaceName;
        config.outbound_interface_invert = outboundInterfaceInvert;
      } else if (outboundInterfaceType === "group" && outboundInterfaceGroup) {
        config.outbound_interface_type = "group";
        config.outbound_interface_value = outboundInterfaceGroup;
        config.outbound_interface_invert = outboundInterfaceInvert;
      }

      // Protocol (don't send "all" - VyOS treats no protocol as all protocols)
      if (protocol && protocol !== "all") {
        config.protocol = protocol;
      }

      // Packet type
      if (packetType) {
        config.packet_type = packetType;
      }

      // Translation
      if (translationType !== "masquerade" && translationAddress.trim()) {
        config.translation_type = translationType;
        config.translation_address = translationAddress.trim();
      }

      // Load balance
      if (loadBalancingEnabled) {
        if (loadBalanceHash) {
          config.load_balance_hash = loadBalanceHash;
        }
        if (loadBalanceBackend.trim()) {
          config.load_balance_backend = loadBalanceBackend.trim();
        }
      }

      // Flags
      config.disable = disable;
      config.exclude = exclude;
      config.log = log;

      // Use auto-calculated rule number
      await natService.createSourceRule(ruleNumber, config);

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create source NAT rule");
    } finally {
      setLoading(false);
    }
  };

  const getAddressGroups = () => (groups || []).filter(g => g.type === "address-group" || g.type === "ipv6-address-group");
  const getNetworkGroups = () => (groups || []).filter(g => g.type === "network-group" || g.type === "ipv6-network-group");
  const getDomainGroups = () => (groups || []).filter(g => g.type === "domain-group");
  const getInterfaceGroups = () => (groups || []).filter(g => g.type === "interface-group");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Source NAT Rule</DialogTitle>
          <DialogDescription>
            Create a new source NAT rule for outbound traffic translation.
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
            <Label htmlFor="rule-number">Rule Number (Auto-assigned)</Label>
            <div className="text-2xl font-mono font-bold text-primary">
              {ruleNumber}
            </div>
            <p className="text-xs text-muted-foreground">
              This rule will be automatically assigned number {ruleNumber}
            </p>
          </div>

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
                  <Select value={outboundInterfaceName} onValueChange={setOutboundInterfaceName}>
                    <SelectTrigger id="outbound-interface-name">
                      <SelectValue placeholder="Select interface" />
                    </SelectTrigger>
                    <SelectContent>
                      {interfaces.map((iface) => (
                        <SelectItem key={iface.name} value={iface.name}>
                          {iface.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

              {/* Protocol */}
              <div className="space-y-2">
                <Label htmlFor="protocol">Protocol</Label>
                <Select value={protocol} onValueChange={setProtocol}>
                  <SelectTrigger id="protocol">
                    <SelectValue />
                  </SelectTrigger>
                  {(sourcePort.trim() || destinationPort.trim()) ? (
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
                {(sourcePort.trim() || destinationPort.trim()) && (
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
                <RadioGroup value={sourceType} onValueChange={(v) => setSourceType(v as "address" | "group")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="address" id="source-address" />
                    <Label htmlFor="source-address">Address/Network</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="group" id="source-group" />
                    <Label htmlFor="source-group">Firewall Group</Label>
                  </div>
                </RadioGroup>
              </div>

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
              ) : (
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
                        {sourceGroupType === "address-group" && getAddressGroups().map((g) => (
                          <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                        ))}
                        {sourceGroupType === "network-group" && getNetworkGroups().map((g) => (
                          <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                        ))}
                        {sourceGroupType === "domain-group" && getDomainGroups().map((g) => (
                          <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="source-port">Source Port</Label>
                <Input
                  id="source-port"
                  value={sourcePort}
                  onChange={(e) => setSourcePort(e.target.value)}
                  placeholder="e.g., 80, 443, 1024-65535"
                  className="font-mono"
                />
              </div>
            </TabsContent>

            {/* Destination Tab */}
            <TabsContent value="destination" className="space-y-4">
              <div className="space-y-2">
                <Label>Destination Type</Label>
                <RadioGroup value={destinationType} onValueChange={(v) => setDestinationType(v as "address" | "group")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="address" id="dest-address" />
                    <Label htmlFor="dest-address">Address/Network</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="group" id="dest-group" />
                    <Label htmlFor="dest-group">Firewall Group</Label>
                  </div>
                </RadioGroup>
              </div>

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
              ) : (
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
                        {destinationGroupType === "address-group" && getAddressGroups().map((g) => (
                          <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                        ))}
                        {destinationGroupType === "network-group" && getNetworkGroups().map((g) => (
                          <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                        ))}
                        {destinationGroupType === "domain-group" && getDomainGroups().map((g) => (
                          <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="destination-port">Destination Port</Label>
                <Input
                  id="destination-port"
                  value={destinationPort}
                  onChange={(e) => setDestinationPort(e.target.value)}
                  placeholder="e.g., 80, 443, 8080"
                  className="font-mono"
                />
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
            {loading ? "Creating..." : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
