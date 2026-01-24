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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import {
  bridgeFirewallService,
  type BridgeCapabilities,
  type BridgeRule,
  type InterfaceOption,
} from "@/lib/api/firewall-bridge";

interface EditBridgeRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chain: string;
  rule: BridgeRule;
  capabilities: BridgeCapabilities | null;
  onSuccess: () => void;
}

export function EditBridgeRuleModal({
  open,
  onOpenChange,
  chain,
  rule,
  capabilities,
  onSuccess,
}: EditBridgeRuleModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceOption[]>([]);
  const [loadingInterfaces, setLoadingInterfaces] = useState(false);

  // Load available interfaces when modal opens
  useEffect(() => {
    if (open) {
      loadInterfaces();
    }
  }, [open]);

  const loadInterfaces = async () => {
    setLoadingInterfaces(true);
    try {
      const response = await bridgeFirewallService.getInterfaces();
      setAvailableInterfaces(response.interfaces);
    } catch (err) {
      console.error("Failed to load interfaces:", err);
    } finally {
      setLoadingInterfaces(false);
    }
  };

  // Form state - Basic
  const [action, setAction] = useState(rule.action || "accept");
  const [description, setDescription] = useState(rule.description || "");
  const [log, setLog] = useState(rule.log);
  const [disabled, setDisabled] = useState(rule.disabled);

  // Source/Destination MAC
  const [sourceMac, setSourceMac] = useState(rule.source_mac || "");
  const [destinationMac, setDestinationMac] = useState(rule.destination_mac || "");

  // Source/Destination IP (1.5+)
  const [sourceAddress, setSourceAddress] = useState(rule.source_address || "");
  const [destinationAddress, setDestinationAddress] = useState(rule.destination_address || "");
  const [sourcePort, setSourcePort] = useState(rule.source_port || "");
  const [destinationPort, setDestinationPort] = useState(rule.destination_port || "");

  // VLAN
  const [vlanId, setVlanId] = useState(rule.vlan_id || "");
  const [vlanPriority, setVlanPriorityValue] = useState(rule.vlan_priority || "");

  // Interface
  const [inboundInterface, setInboundInterface] = useState(rule.inbound_interface || "");
  const [outboundInterface, setOutboundInterface] = useState(rule.outbound_interface || "");

  // Protocol (1.5+)
  const [protocol, setProtocol] = useState(rule.protocol || "");

  // Ethernet Type (1.5+)
  const [ethernetType, setEthernetType] = useState(rule.ethernet_type || "");

  // Jump target
  const [jumpTarget, setJumpTarget] = useState(rule.jump_target || "");

  // Queue (1.5+)
  const [queue, setQueue] = useState(rule.queue || "");

  // ICMP (1.5+)
  const [icmpType, setIcmpType] = useState(rule.icmp_type || "");
  const [icmpCode, setIcmpCode] = useState(rule.icmp_code || "");
  const [icmpTypeName, setIcmpTypeName] = useState(rule.icmp_type_name || "");

  // TCP (1.5+)
  const [tcpFlagsSyn, setTcpFlagsSyn] = useState(rule.tcp_flags?.includes("syn") || false);
  const [tcpFlagsAck, setTcpFlagsAck] = useState(rule.tcp_flags?.includes("ack") || false);
  const [tcpFlagsFin, setTcpFlagsFin] = useState(rule.tcp_flags?.includes("fin") || false);
  const [tcpFlagsRst, setTcpFlagsRst] = useState(rule.tcp_flags?.includes("rst") || false);

  // Rate limiting (1.5+)
  const [limitRate, setLimitRate] = useState(rule.limit_rate || "");
  const [limitBurst, setLimitBurst] = useState(rule.limit_burst || "");

  // Time-based (1.5+)
  const [timeStarttime, setTimeStarttime] = useState(rule.time_starttime || "");
  const [timeStoptime, setTimeStoptime] = useState(rule.time_stoptime || "");
  const [timeWeekdays, setTimeWeekdays] = useState(rule.time_weekdays || "");

  // Connection status (1.5+)
  const [connStatusNew, setConnStatusNew] = useState(rule.connection_status_new || false);
  const [connStatusEstablished, setConnStatusEstablished] = useState(rule.connection_status_established || false);
  const [connStatusRelated, setConnStatusRelated] = useState(rule.connection_status_related || false);
  const [connStatusInvalid, setConnStatusInvalid] = useState(rule.connection_status_invalid || false);

  // Packet modifications (1.5+)
  const [modifyDscp, setModifyDscp] = useState(rule.set_dscp || "");
  const [modifyMark, setModifyMark] = useState(rule.set_mark || "");
  const [modifyVlanPriority, setModifyVlanPriority] = useState(rule.set_vlan_priority || "");
  const [modifyTcpMss, setModifyTcpMss] = useState(rule.set_tcp_mss || "");

  const isV15 = capabilities?.version_notes.full_support || false;

  // Reset form when rule changes
  useEffect(() => {
    setAction(rule.action || "accept");
    setDescription(rule.description || "");
    setLog(rule.log);
    setDisabled(rule.disabled);
    setSourceMac(rule.source_mac || "");
    setDestinationMac(rule.destination_mac || "");
    setSourceAddress(rule.source_address || "");
    setDestinationAddress(rule.destination_address || "");
    setSourcePort(rule.source_port || "");
    setDestinationPort(rule.destination_port || "");
    setVlanId(rule.vlan_id || "");
    setVlanPriorityValue(rule.vlan_priority || "");
    setInboundInterface(rule.inbound_interface || "");
    setOutboundInterface(rule.outbound_interface || "");
    setProtocol(rule.protocol || "");
    setEthernetType(rule.ethernet_type || "");
    setJumpTarget(rule.jump_target || "");
    setQueue(rule.queue || "");
    setIcmpType(rule.icmp_type || "");
    setIcmpCode(rule.icmp_code || "");
    setIcmpTypeName(rule.icmp_type_name || "");
    setTcpFlagsSyn(rule.tcp_flags?.includes("syn") || false);
    setTcpFlagsAck(rule.tcp_flags?.includes("ack") || false);
    setTcpFlagsFin(rule.tcp_flags?.includes("fin") || false);
    setTcpFlagsRst(rule.tcp_flags?.includes("rst") || false);
    setLimitRate(rule.limit_rate || "");
    setLimitBurst(rule.limit_burst || "");
    setTimeStarttime(rule.time_starttime || "");
    setTimeStoptime(rule.time_stoptime || "");
    setTimeWeekdays(rule.time_weekdays || "");
    setConnStatusNew(rule.connection_status_new || false);
    setConnStatusEstablished(rule.connection_status_established || false);
    setConnStatusRelated(rule.connection_status_related || false);
    setConnStatusInvalid(rule.connection_status_invalid || false);
    setModifyDscp(rule.set_dscp || "");
    setModifyMark(rule.set_mark || "");
    setModifyVlanPriority(rule.set_vlan_priority || "");
    setModifyTcpMss(rule.set_tcp_mss || "");
    setError(null);
  }, [rule]);

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await bridgeFirewallService.updateRule(chain, rule.rule_number, rule, {
        action,
        description: description || null,
        log,
        disabled,
        source_mac: sourceMac || null,
        destination_mac: destinationMac || null,
        source_address: sourceAddress || null,
        destination_address: destinationAddress || null,
        source_port: sourcePort || null,
        destination_port: destinationPort || null,
        vlan_id: vlanId || null,
        vlan_priority: vlanPriority || null,
        inbound_interface: inboundInterface || null,
        outbound_interface: outboundInterface || null,
        protocol: protocol || null,
        ethernet_type: ethernetType || null,
        jump_target: jumpTarget || null,
        queue: queue || null,
        icmp_type: icmpType || null,
        icmp_code: icmpCode || null,
        icmp_type_name: icmpTypeName || null,
        limit_rate: limitRate || null,
        limit_burst: limitBurst || null,
        time_starttime: timeStarttime || null,
        time_stoptime: timeStoptime || null,
        time_weekdays: timeWeekdays || null,
        connection_status_new: connStatusNew,
        connection_status_established: connStatusEstablished,
        connection_status_related: connStatusRelated,
        connection_status_invalid: connStatusInvalid,
        set_dscp: modifyDscp || null,
        set_mark: modifyMark || null,
        set_vlan_priority: modifyVlanPriority || null,
        set_tcp_mss: modifyTcpMss || null,
      });

      if (response.success) {
        onSuccess();
      } else {
        setError(response.error || "Failed to update rule");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Bridge Firewall Rule</DialogTitle>
          <DialogDescription>
            Edit rule {rule.rule_number} in the {chain} chain
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="w-full flex-wrap h-auto">
            <TabsTrigger value="basic" className="flex-1">Basic</TabsTrigger>
            <TabsTrigger value="match" className="flex-1">Match</TabsTrigger>
            {isV15 && <TabsTrigger value="ip" className="flex-1">IP/Ports</TabsTrigger>}
            {isV15 && <TabsTrigger value="protocol" className="flex-1">Protocol</TabsTrigger>}
            {isV15 && <TabsTrigger value="advanced" className="flex-1">Advanced</TabsTrigger>}
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="bg-muted/50 rounded-md px-3 py-2 mb-2">
              <p className="text-sm text-muted-foreground">
                Editing rule <span className="font-mono font-semibold text-foreground">#{rule.rule_number}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Action *</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accept">Accept</SelectItem>
                  <SelectItem value="drop">Drop</SelectItem>
                  {isV15 && (
                    <>
                      <SelectItem value="continue">Continue</SelectItem>
                      <SelectItem value="jump">Jump</SelectItem>
                      <SelectItem value="return">Return</SelectItem>
                      <SelectItem value="queue">Queue</SelectItem>
                      <SelectItem value="notrack">No Track</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {action === "jump" && (
              <div className="space-y-2">
                <Label htmlFor="jumpTarget">Jump Target Chain *</Label>
                <Input
                  id="jumpTarget"
                  placeholder="Custom chain name"
                  value={jumpTarget}
                  onChange={(e) => setJumpTarget(e.target.value)}
                />
              </div>
            )}

            {action === "queue" && isV15 && (
              <div className="space-y-2">
                <Label htmlFor="queue">Queue Number</Label>
                <Input
                  id="queue"
                  placeholder="Queue number (0-65535)"
                  value={queue}
                  onChange={(e) => setQueue(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Rule description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="log"
                  checked={log}
                  onCheckedChange={(c) => setLog(c === true)}
                />
                <Label htmlFor="log" className="font-normal">Enable logging</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="disabled"
                  checked={disabled}
                  onCheckedChange={(c) => setDisabled(c === true)}
                />
                <Label htmlFor="disabled" className="font-normal">Disabled</Label>
              </div>
            </div>
          </TabsContent>

          {/* Match Tab - Layer 2 matching */}
          <TabsContent value="match" className="space-y-4 mt-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">MAC Address</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sourceMac">Source MAC</Label>
                  <Input
                    id="sourceMac"
                    placeholder="e.g., 00:11:22:33:44:55"
                    value={sourceMac}
                    onChange={(e) => setSourceMac(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destinationMac">Destination MAC</Label>
                  <Input
                    id="destinationMac"
                    placeholder="e.g., 00:11:22:33:44:55"
                    value={destinationMac}
                    onChange={(e) => setDestinationMac(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">VLAN</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vlanId">VLAN ID</Label>
                  <Input
                    id="vlanId"
                    type="number"
                    placeholder="1-4094"
                    value={vlanId}
                    onChange={(e) => setVlanId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vlanPriority">VLAN Priority</Label>
                  <Input
                    id="vlanPriority"
                    type="number"
                    placeholder="0-7"
                    value={vlanPriority}
                    onChange={(e) => setVlanPriorityValue(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Interface</h4>
              {loadingInterfaces ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading interfaces...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inboundInterface">Inbound Interface</Label>
                    <Select
                      value={inboundInterface || "_none_"}
                      onValueChange={(v) => setInboundInterface(v === "_none_" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_" textValue="None">None</SelectItem>
                        {availableInterfaces.map((iface) => (
                          <SelectItem key={iface.name} value={iface.name} textValue={iface.name}>
                            <div className="flex flex-col">
                              <span>{iface.name}</span>
                              {iface.description && (
                                <span className="text-xs text-muted-foreground">
                                  {iface.description}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="outboundInterface">Outbound Interface</Label>
                    <Select
                      value={outboundInterface || "_none_"}
                      onValueChange={(v) => setOutboundInterface(v === "_none_" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_" textValue="None">None</SelectItem>
                        {availableInterfaces.map((iface) => (
                          <SelectItem key={iface.name} value={iface.name} textValue={iface.name}>
                            <div className="flex flex-col">
                              <span>{iface.name}</span>
                              {iface.description && (
                                <span className="text-xs text-muted-foreground">
                                  {iface.description}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {isV15 && (
              <div className="space-y-2">
                <Label htmlFor="ethernetType">Ethernet Type</Label>
                <Select value={ethernetType || "_any_"} onValueChange={(v) => setEthernetType(v === "_any_" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_any_">Any</SelectItem>
                    <SelectItem value="arp">ARP</SelectItem>
                    <SelectItem value="ipv4">IPv4</SelectItem>
                    <SelectItem value="ipv6">IPv6</SelectItem>
                    <SelectItem value="802.1q">802.1Q (VLAN)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </TabsContent>

          {/* IP/Ports Tab (1.5+) */}
          {isV15 && (
            <TabsContent value="ip" className="space-y-4 mt-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Source</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sourceAddress">IP Address/Network</Label>
                    <Input
                      id="sourceAddress"
                      placeholder="e.g., 192.168.1.0/24 or !10.0.0.1"
                      value={sourceAddress}
                      onChange={(e) => setSourceAddress(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Prefix with ! to negate</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sourcePort">Port(s)</Label>
                    <Input
                      id="sourcePort"
                      placeholder="e.g., 80 or 80,443 or 1000-2000"
                      value={sourcePort}
                      onChange={(e) => setSourcePort(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Destination</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="destinationAddress">IP Address/Network</Label>
                    <Input
                      id="destinationAddress"
                      placeholder="e.g., 192.168.1.0/24 or !10.0.0.1"
                      value={destinationAddress}
                      onChange={(e) => setDestinationAddress(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Prefix with ! to negate</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destinationPort">Port(s)</Label>
                    <Input
                      id="destinationPort"
                      placeholder="e.g., 80 or 80,443 or 1000-2000"
                      value={destinationPort}
                      onChange={(e) => setDestinationPort(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          )}

          {/* Protocol Tab (1.5+) */}
          {isV15 && (
            <TabsContent value="protocol" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="protocol">Protocol</Label>
                <Select value={protocol || "_any_"} onValueChange={(v) => setProtocol(v === "_any_" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_any_">Any</SelectItem>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="udp">UDP</SelectItem>
                    <SelectItem value="icmp">ICMP</SelectItem>
                    <SelectItem value="icmpv6">ICMPv6</SelectItem>
                    <SelectItem value="tcp_udp">TCP+UDP</SelectItem>
                    <SelectItem value="gre">GRE</SelectItem>
                    <SelectItem value="esp">ESP</SelectItem>
                    <SelectItem value="ah">AH</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* TCP Flags */}
              {(protocol === "tcp" || protocol === "tcp_udp") && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">TCP Flags</Label>
                  <p className="text-xs text-muted-foreground mb-2">Match packets with these TCP flags set</p>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox id="tcpSyn" checked={tcpFlagsSyn} onCheckedChange={(c) => setTcpFlagsSyn(c === true)} />
                      <Label htmlFor="tcpSyn" className="font-normal">SYN</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="tcpAck" checked={tcpFlagsAck} onCheckedChange={(c) => setTcpFlagsAck(c === true)} />
                      <Label htmlFor="tcpAck" className="font-normal">ACK</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="tcpFin" checked={tcpFlagsFin} onCheckedChange={(c) => setTcpFlagsFin(c === true)} />
                      <Label htmlFor="tcpFin" className="font-normal">FIN</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="tcpRst" checked={tcpFlagsRst} onCheckedChange={(c) => setTcpFlagsRst(c === true)} />
                      <Label htmlFor="tcpRst" className="font-normal">RST</Label>
                    </div>
                  </div>
                </div>
              )}

              {/* ICMP Type/Code */}
              {(protocol === "icmp" || protocol === "icmpv6") && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="icmpTypeName">ICMP Type Name</Label>
                    <Select value={icmpTypeName || "_any_"} onValueChange={(v) => setIcmpTypeName(v === "_any_" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_any_">Any</SelectItem>
                        <SelectItem value="echo-request">Echo Request (ping)</SelectItem>
                        <SelectItem value="echo-reply">Echo Reply</SelectItem>
                        <SelectItem value="destination-unreachable">Destination Unreachable</SelectItem>
                        <SelectItem value="time-exceeded">Time Exceeded</SelectItem>
                        <SelectItem value="parameter-problem">Parameter Problem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="icmpType">ICMP Type (numeric)</Label>
                      <Input
                        id="icmpType"
                        type="number"
                        placeholder="0-255"
                        value={icmpType}
                        onChange={(e) => setIcmpType(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="icmpCode">ICMP Code</Label>
                      <Input
                        id="icmpCode"
                        type="number"
                        placeholder="0-255"
                        value={icmpCode}
                        onChange={(e) => setIcmpCode(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Connection Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Connection Status</Label>
                <p className="text-xs text-muted-foreground mb-2">Match packets based on connection tracking state</p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox id="connNew" checked={connStatusNew} onCheckedChange={(c) => setConnStatusNew(c === true)} />
                    <Label htmlFor="connNew" className="font-normal">New</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="connEstablished" checked={connStatusEstablished} onCheckedChange={(c) => setConnStatusEstablished(c === true)} />
                    <Label htmlFor="connEstablished" className="font-normal">Established</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="connRelated" checked={connStatusRelated} onCheckedChange={(c) => setConnStatusRelated(c === true)} />
                    <Label htmlFor="connRelated" className="font-normal">Related</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="connInvalid" checked={connStatusInvalid} onCheckedChange={(c) => setConnStatusInvalid(c === true)} />
                    <Label htmlFor="connInvalid" className="font-normal">Invalid</Label>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}

          {/* Advanced Tab (1.5+) */}
          {isV15 && (
            <TabsContent value="advanced" className="space-y-4 mt-4">
              {/* Rate Limiting */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Rate Limiting</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="limitRate">Rate</Label>
                    <Input
                      id="limitRate"
                      placeholder="e.g., 5/minute or 100/hour"
                      value={limitRate}
                      onChange={(e) => setLimitRate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Format: number/second|minute|hour|day</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="limitBurst">Burst</Label>
                    <Input
                      id="limitBurst"
                      type="number"
                      placeholder="Burst size"
                      value={limitBurst}
                      onChange={(e) => setLimitBurst(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Time-based Rules */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Time-based Rules</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeStarttime">Start Time</Label>
                    <Input
                      id="timeStarttime"
                      placeholder="HH:MM:SS"
                      value={timeStarttime}
                      onChange={(e) => setTimeStarttime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeStoptime">Stop Time</Label>
                    <Input
                      id="timeStoptime"
                      placeholder="HH:MM:SS"
                      value={timeStoptime}
                      onChange={(e) => setTimeStoptime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeWeekdays">Weekdays</Label>
                    <Input
                      id="timeWeekdays"
                      placeholder="e.g., Mon,Tue,Wed"
                      value={timeWeekdays}
                      onChange={(e) => setTimeWeekdays(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Packet Modifications */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Packet Modifications</h4>
                <p className="text-xs text-muted-foreground">Modify packet fields when the rule matches</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="modifyDscp">Set DSCP</Label>
                    <Input
                      id="modifyDscp"
                      type="number"
                      placeholder="0-63"
                      value={modifyDscp}
                      onChange={(e) => setModifyDscp(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modifyMark">Set Mark</Label>
                    <Input
                      id="modifyMark"
                      placeholder="Packet mark value"
                      value={modifyMark}
                      onChange={(e) => setModifyMark(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modifyVlanPriority">Set VLAN Priority</Label>
                    <Input
                      id="modifyVlanPriority"
                      type="number"
                      placeholder="0-7"
                      value={modifyVlanPriority}
                      onChange={(e) => setModifyVlanPriority(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modifyTcpMss">Set TCP MSS</Label>
                    <Input
                      id="modifyTcpMss"
                      placeholder="MSS value or 'clamp-mss-to-pmtu'"
                      value={modifyTcpMss}
                      onChange={(e) => setModifyTcpMss(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
