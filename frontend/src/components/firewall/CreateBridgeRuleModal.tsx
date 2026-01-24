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
  type InterfaceOption,
} from "@/lib/api/firewall-bridge";

interface CreateBridgeRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chain: string;
  capabilities: BridgeCapabilities | null;
  existingRuleNumbers: number[];
  onSuccess: () => void;
}

export function CreateBridgeRuleModal({
  open,
  onOpenChange,
  chain,
  capabilities,
  existingRuleNumbers,
  onSuccess,
}: CreateBridgeRuleModalProps) {
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

  // Calculate next rule number (start at 100, increment by 1)
  const getNextRuleNumber = (): number => {
    if (existingRuleNumbers.length === 0) {
      return 100;
    }
    const maxRule = Math.max(...existingRuleNumbers);
    return maxRule + 1;
  };

  // Form state - Basic
  const [action, setAction] = useState("accept");
  const [description, setDescription] = useState("");
  const [log, setLog] = useState(false);
  const [disabled, setDisabled] = useState(false);

  // Source/Destination MAC
  const [sourceMac, setSourceMac] = useState("");
  const [destinationMac, setDestinationMac] = useState("");

  // Source/Destination IP (1.5+)
  const [sourceAddress, setSourceAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [sourcePort, setSourcePort] = useState("");
  const [destinationPort, setDestinationPort] = useState("");

  // VLAN
  const [vlanId, setVlanId] = useState("");
  const [vlanPriority, setVlanPriorityValue] = useState("");

  // Interface
  const [inboundInterface, setInboundInterface] = useState("");
  const [outboundInterface, setOutboundInterface] = useState("");

  // Protocol (1.5+)
  const [protocol, setProtocol] = useState("");

  // Ethernet Type (1.5+)
  const [ethernetType, setEthernetType] = useState("");

  // Jump target
  const [jumpTarget, setJumpTarget] = useState("");

  // Queue (1.5+)
  const [queue, setQueue] = useState("");

  // ICMP (1.5+)
  const [icmpType, setIcmpType] = useState("");
  const [icmpCode, setIcmpCode] = useState("");
  const [icmpTypeName, setIcmpTypeName] = useState("");

  // TCP (1.5+)
  const [tcpFlagsSyn, setTcpFlagsSyn] = useState(false);
  const [tcpFlagsAck, setTcpFlagsAck] = useState(false);
  const [tcpFlagsFin, setTcpFlagsFin] = useState(false);
  const [tcpFlagsRst, setTcpFlagsRst] = useState(false);

  // Rate limiting (1.5+)
  const [limitRate, setLimitRate] = useState("");
  const [limitBurst, setLimitBurst] = useState("");

  // Time-based (1.5+)
  const [timeStarttime, setTimeStarttime] = useState("");
  const [timeStoptime, setTimeStoptime] = useState("");
  const [timeWeekdays, setTimeWeekdays] = useState("");

  // Connection status (1.5+)
  const [connStatusNew, setConnStatusNew] = useState(false);
  const [connStatusEstablished, setConnStatusEstablished] = useState(false);
  const [connStatusRelated, setConnStatusRelated] = useState(false);
  const [connStatusInvalid, setConnStatusInvalid] = useState(false);

  // Packet modifications (1.5+)
  const [modifyDscp, setModifyDscp] = useState("");
  const [modifyMark, setModifyMark] = useState("");
  const [modifyVlanPriority, setModifyVlanPriority] = useState("");
  const [modifyTcpMss, setModifyTcpMss] = useState("");

  const isV15 = capabilities?.version_notes.full_support || false;

  const resetForm = () => {
    setAction("accept");
    setDescription("");
    setLog(false);
    setDisabled(false);
    setSourceMac("");
    setDestinationMac("");
    setSourceAddress("");
    setDestinationAddress("");
    setSourcePort("");
    setDestinationPort("");
    setVlanId("");
    setVlanPriorityValue("");
    setInboundInterface("");
    setOutboundInterface("");
    setProtocol("");
    setEthernetType("");
    setJumpTarget("");
    setQueue("");
    setIcmpType("");
    setIcmpCode("");
    setIcmpTypeName("");
    setTcpFlagsSyn(false);
    setTcpFlagsAck(false);
    setTcpFlagsFin(false);
    setTcpFlagsRst(false);
    setLimitRate("");
    setLimitBurst("");
    setTimeStarttime("");
    setTimeStoptime("");
    setTimeWeekdays("");
    setConnStatusNew(false);
    setConnStatusEstablished(false);
    setConnStatusRelated(false);
    setConnStatusInvalid(false);
    setModifyDscp("");
    setModifyMark("");
    setModifyVlanPriority("");
    setModifyTcpMss("");
    setError(null);
  };

  const handleSubmit = async () => {
    const ruleNum = getNextRuleNumber();

    setSaving(true);
    setError(null);

    // Build TCP flags arrays
    const tcpFlags: string[] = [];
    if (tcpFlagsSyn) tcpFlags.push("syn");
    if (tcpFlagsAck) tcpFlags.push("ack");
    if (tcpFlagsFin) tcpFlags.push("fin");
    if (tcpFlagsRst) tcpFlags.push("rst");

    try {
      const response = await bridgeFirewallService.createRule(chain, ruleNum, {
        action,
        description: description || undefined,
        log,
        disabled,
        source_mac: sourceMac || undefined,
        destination_mac: destinationMac || undefined,
        source_address: sourceAddress || undefined,
        destination_address: destinationAddress || undefined,
        source_port: sourcePort || undefined,
        destination_port: destinationPort || undefined,
        vlan_id: vlanId || undefined,
        vlan_priority: vlanPriority || undefined,
        inbound_interface: inboundInterface || undefined,
        outbound_interface: outboundInterface || undefined,
        protocol: protocol || undefined,
        ethernet_type: ethernetType || undefined,
        jump_target: jumpTarget || undefined,
        queue: queue || undefined,
        icmp_type: icmpType || undefined,
        icmp_code: icmpCode || undefined,
        icmp_type_name: icmpTypeName || undefined,
        tcp_flags: tcpFlags.length > 0 ? tcpFlags : undefined,
        limit_rate: limitRate || undefined,
        limit_burst: limitBurst || undefined,
        time_starttime: timeStarttime || undefined,
        time_stoptime: timeStoptime || undefined,
        time_weekdays: timeWeekdays || undefined,
        connection_status_new: connStatusNew || undefined,
        connection_status_established: connStatusEstablished || undefined,
        connection_status_related: connStatusRelated || undefined,
        connection_status_invalid: connStatusInvalid || undefined,
        set_dscp: modifyDscp || undefined,
        set_mark: modifyMark || undefined,
        set_vlan_priority: modifyVlanPriority || undefined,
        set_tcp_mss: modifyTcpMss || undefined,
      });

      if (response.success) {
        resetForm();
        onSuccess();
      } else {
        setError(response.error || "Failed to create rule");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Bridge Firewall Rule</DialogTitle>
          <DialogDescription>
            Add a new rule to the {chain} chain
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
                Rule will be created as <span className="font-mono font-semibold text-foreground">#{getNextRuleNumber()}</span>
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
                <Label htmlFor="disabled" className="font-normal">Create disabled</Label>
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
                Creating...
              </>
            ) : (
              "Create Rule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
