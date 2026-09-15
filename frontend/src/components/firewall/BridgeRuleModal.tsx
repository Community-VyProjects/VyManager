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
import { InterfaceSelect } from "@/components/ui/interface-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import {
  bridgeFirewallService,
  type BridgeCapabilities,
  type BridgeRule,
  type InterfaceOption,
} from "@/lib/api/firewall-bridge";
import {
  firewallActionSupported,
  firewallFeatureSupported,
} from "@/lib/api/firewall-capability-gates";

interface BridgeRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chain: string;
  capabilities: BridgeCapabilities | null;
  existingRuleNumbers: number[];
  onSuccess: () => void;
  existing?: BridgeRule | null;
}

// Rate limit units
const RATE_UNITS = [
  { value: "second", label: "/second" },
  { value: "minute", label: "/minute" },
  { value: "hour", label: "/hour" },
  { value: "day", label: "/day" },
];

// Weekday options - VyOS requires full names
const WEEKDAYS = [
  { value: "Monday", label: "Mon" },
  { value: "Tuesday", label: "Tue" },
  { value: "Wednesday", label: "Wed" },
  { value: "Thursday", label: "Thu" },
  { value: "Friday", label: "Fri" },
  { value: "Saturday", label: "Sat" },
  { value: "Sunday", label: "Sun" },
];

const parseRateLimit = (rate: string | null | undefined): { value: string; unit: string } => {
  if (!rate) return { value: "", unit: "minute" };
  const match = rate.match(/^(\d+)\/(second|minute|hour|day)$/);
  if (match) {
    return { value: match[1], unit: match[2] };
  }
  return { value: rate, unit: "minute" };
};

const parseAddress = (addr: string | null | undefined): { address: string; negate: boolean } => {
  if (!addr) return { address: "", negate: false };
  if (addr.startsWith("!")) {
    return { address: addr.slice(1), negate: true };
  }
  return { address: addr, negate: false };
};

const parseWeekdays = (days: string | null | undefined): string[] => {
  if (!days) return [];
  return days.split(",").map((d) => d.trim()).filter(Boolean);
};

const parseTimeForInput = (time: string | null | undefined): string => {
  if (!time) return "";
  const match = time.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : time;
};

export function BridgeRuleModal({
  open,
  onOpenChange,
  chain,
  capabilities,
  existingRuleNumbers,
  onSuccess,
  existing,
}: BridgeRuleModalProps) {
  const isEdit = !!existing;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceOption[]>([]);
  const [loadingInterfaces, setLoadingInterfaces] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadInterfaces();
    if (existing) {
      populateForm(existing);
    } else {
      resetForm();
    }
  }, [open, existing]);

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

  // Source/Destination IP (1.5+) - with negation
  const [sourceAddress, setSourceAddress] = useState("");
  const [sourceAddressNegate, setSourceAddressNegate] = useState(false);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationAddressNegate, setDestinationAddressNegate] = useState(false);
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

  // Rate limiting (1.5+) - split into number and unit
  const [limitRateValue, setLimitRateValue] = useState("");
  const [limitRateUnit, setLimitRateUnit] = useState("minute");
  const [limitBurst, setLimitBurst] = useState("");

  // Time-based (1.5+) - using proper time format
  const [timeStarttime, setTimeStarttime] = useState("");
  const [timeStoptime, setTimeStoptime] = useState("");
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);

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

  const showIpPorts =
    firewallFeatureSupported(capabilities, "ip_matching") ||
    firewallFeatureSupported(capabilities, "port_matching");
  const showProtocol = firewallFeatureSupported(capabilities, "protocol_matching");
  const showAdvanced =
    firewallFeatureSupported(capabilities, "rate_limiting") ||
    firewallFeatureSupported(capabilities, "time_based") ||
    firewallFeatureSupported(capabilities, "packet_modifications");
  const showEthernetType = firewallFeatureSupported(capabilities, "ethernet_type_matching");

  const resetForm = () => {
    setAction("accept");
    setDescription("");
    setLog(false);
    setDisabled(false);
    setSourceMac("");
    setDestinationMac("");
    setSourceAddress("");
    setSourceAddressNegate(false);
    setDestinationAddress("");
    setDestinationAddressNegate(false);
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
    setLimitRateValue("");
    setLimitRateUnit("minute");
    setLimitBurst("");
    setTimeStarttime("");
    setTimeStoptime("");
    setSelectedWeekdays([]);
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

  const populateForm = (rule: BridgeRule) => {
    const newSourceAddr = parseAddress(rule.source_address);
    const newDestAddr = parseAddress(rule.destination_address);
    const newRate = parseRateLimit(rule.limit_rate);
    const newWeekdays = parseWeekdays(rule.time_weekdays);

    setAction(rule.action || "accept");
    setDescription(rule.description || "");
    setLog(rule.log);
    setDisabled(rule.disabled);
    setSourceMac(rule.source_mac || "");
    setDestinationMac(rule.destination_mac || "");
    setSourceAddress(newSourceAddr.address);
    setSourceAddressNegate(newSourceAddr.negate);
    setDestinationAddress(newDestAddr.address);
    setDestinationAddressNegate(newDestAddr.negate);
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
    setLimitRateValue(newRate.value);
    setLimitRateUnit(newRate.unit);
    setLimitBurst(rule.limit_burst || "");
    setTimeStarttime(parseTimeForInput(rule.time_starttime));
    setTimeStoptime(parseTimeForInput(rule.time_stoptime));
    setSelectedWeekdays(newWeekdays);
    setConnStatusNew(rule.connection_status_new || false);
    setConnStatusEstablished(rule.connection_status_established || false);
    setConnStatusRelated(rule.connection_status_related || false);
    setConnStatusInvalid(rule.connection_status_invalid || false);
    setModifyDscp(rule.set_dscp || "");
    setModifyMark(rule.set_mark || "");
    setModifyVlanPriority(rule.set_vlan_priority || "");
    setModifyTcpMss(rule.set_tcp_mss || "");
    setError(null);
  };

  // Toggle weekday selection
  const toggleWeekday = (day: string) => {
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Build limit_rate string from value and unit
  const buildLimitRate = (): string | null => {
    if (!limitRateValue) return null;
    return `${limitRateValue}/${limitRateUnit}`;
  };

  // Build time string from input (add seconds if needed)
  const buildTimeString = (time: string): string | null => {
    if (!time) return null;
    // If format is HH:MM, append :00 for seconds
    if (time.length === 5) {
      return `${time}:00`;
    }
    return time;
  };

  // Build weekdays string
  const buildWeekdays = (): string | null => {
    if (selectedWeekdays.length === 0) return null;
    return selectedWeekdays.join(",");
  };

  // Build address with negation
  const buildAddress = (addr: string, negate: boolean): string | null => {
    if (!addr) return null;
    return negate ? `!${addr}` : addr;
  };

  const submitUpdate = async () => {
    if (!existing) return;
    setSaving(true);
    setError(null);

    try {
      const response = await bridgeFirewallService.updateRule(chain, existing.rule_number, existing, {
        action,
        description: description || null,
        log,
        disabled,
        source_mac: sourceMac || null,
        destination_mac: destinationMac || null,
        source_address: buildAddress(sourceAddress, sourceAddressNegate),
        destination_address: buildAddress(destinationAddress, destinationAddressNegate),
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
        limit_rate: buildLimitRate(),
        limit_burst: limitBurst || null,
        time_starttime: buildTimeString(timeStarttime),
        time_stoptime: buildTimeString(timeStoptime),
        time_weekdays: buildWeekdays(),
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

  const handleSubmit = async () => {
    if (isEdit) {
      await submitUpdate();
      return;
    }

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
        source_address: buildAddress(sourceAddress, sourceAddressNegate) || undefined,
        destination_address: buildAddress(destinationAddress, destinationAddressNegate) || undefined,
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
        tcp_flags: tcpFlags.length > 0 ? tcpFlags.join(",") : undefined,
        limit_rate: buildLimitRate() || undefined,
        limit_burst: limitBurst || undefined,
        time_starttime: buildTimeString(timeStarttime) || undefined,
        time_stoptime: buildTimeString(timeStoptime) || undefined,
        time_weekdays: buildWeekdays() || undefined,
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
          <DialogTitle>{isEdit ? "Edit Bridge Firewall Rule" : "Create Bridge Firewall Rule"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Edit rule ${existing.rule_number} in the ${chain} chain`
              : `Add a new rule to the ${chain} chain`}
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
            {showIpPorts && <TabsTrigger value="ip" className="flex-1">IP/Ports</TabsTrigger>}
            {showProtocol && <TabsTrigger value="protocol" className="flex-1">Protocol</TabsTrigger>}
            {showAdvanced && <TabsTrigger value="advanced" className="flex-1">Advanced</TabsTrigger>}
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="bg-muted/50 rounded-md px-3 py-2 mb-2">
              <p className="text-sm text-muted-foreground">
                {isEdit ? (
                  <>
                    Editing rule <span className="font-mono font-semibold text-foreground">#{existing.rule_number}</span>
                    <span className="sr-only">Rule number cannot be changed</span>
                  </>
                ) : (
                  <>
                    Rule will be created as <span className="font-mono font-semibold text-foreground">#{getNextRuleNumber()}</span>
                  </>
                )}
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
                  {firewallActionSupported(capabilities, "continue") && (
                    <SelectItem value="continue">Continue</SelectItem>
                  )}
                  {firewallActionSupported(capabilities, "jump") && (
                    <SelectItem value="jump">Jump</SelectItem>
                  )}
                  {firewallActionSupported(capabilities, "return") && (
                    <SelectItem value="return">Return</SelectItem>
                  )}
                  {firewallActionSupported(capabilities, "queue") && (
                    <SelectItem value="queue">Queue</SelectItem>
                  )}
                  {firewallActionSupported(capabilities, "notrack") && (
                    <SelectItem value="notrack">No Track</SelectItem>
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

            {action === "queue" && firewallActionSupported(capabilities, "queue") && (
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
                <Label htmlFor="disabled" className="font-normal">{isEdit ? "Disabled" : "Create disabled"}</Label>
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
                    <InterfaceSelect
                      value={inboundInterface || "_none_"}
                      onValueChange={(v) => setInboundInterface(v === "_none_" ? "" : v)}
                      interfaces={availableInterfaces.map((i) => ({ name: i.name, type: "", description: i.description ?? null }))}
                      noneOption={{ label: "None", value: "_none_" }}
                      placeholder="None"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="outboundInterface">Outbound Interface</Label>
                    <InterfaceSelect
                      value={outboundInterface || "_none_"}
                      onValueChange={(v) => setOutboundInterface(v === "_none_" ? "" : v)}
                      interfaces={availableInterfaces.map((i) => ({ name: i.name, type: "", description: i.description ?? null }))}
                      noneOption={{ label: "None", value: "_none_" }}
                      placeholder="None"
                    />
                  </div>
                </div>
              )}
            </div>

            {showEthernetType && (
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

          {showIpPorts && (
            <TabsContent value="ip" className="space-y-4 mt-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Source</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sourceAddress">IP Address/Network</Label>
                    <div className="flex gap-2">
                      <Input
                        id="sourceAddress"
                        placeholder="e.g., 192.168.1.0/24"
                        value={sourceAddress}
                        onChange={(e) => setSourceAddress(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Checkbox
                        id="sourceAddressNegate"
                        checked={sourceAddressNegate}
                        onCheckedChange={(c) => setSourceAddressNegate(c === true)}
                      />
                      <Label htmlFor="sourceAddressNegate" className="text-xs font-normal text-muted-foreground">
                        Negate (match everything EXCEPT this address)
                      </Label>
                    </div>
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
                    <div className="flex gap-2">
                      <Input
                        id="destinationAddress"
                        placeholder="e.g., 192.168.1.0/24"
                        value={destinationAddress}
                        onChange={(e) => setDestinationAddress(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Checkbox
                        id="destinationAddressNegate"
                        checked={destinationAddressNegate}
                        onCheckedChange={(c) => setDestinationAddressNegate(c === true)}
                      />
                      <Label htmlFor="destinationAddressNegate" className="text-xs font-normal text-muted-foreground">
                        Negate (match everything EXCEPT this address)
                      </Label>
                    </div>
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

          {showProtocol && (
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

          {showAdvanced && (
            <TabsContent value="advanced" className="space-y-4 mt-4">
              {/* Rate Limiting */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Rate Limiting</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="limitRate">Rate Limit</Label>
                    <div className="flex gap-2">
                      <Input
                        id="limitRateValue"
                        type="number"
                        placeholder="Number"
                        min="1"
                        value={limitRateValue}
                        onChange={(e) => setLimitRateValue(e.target.value)}
                        className="flex-1"
                      />
                      <Select value={limitRateUnit} onValueChange={setLimitRateUnit}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RATE_UNITS.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">Maximum packets to match per time period</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="limitBurst">Burst Size</Label>
                    <Input
                      id="limitBurst"
                      type="number"
                      placeholder="5"
                      min="1"
                      value={limitBurst}
                      onChange={(e) => setLimitBurst(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Burst allowance</p>
                  </div>
                </div>
              </div>

              {/* Time-based Rules */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Time-based Rules</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeStarttime">Start Time</Label>
                    <Input
                      id="timeStarttime"
                      type="time"
                      value={timeStarttime}
                      onChange={(e) => setTimeStarttime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeStoptime">Stop Time</Label>
                    <Input
                      id="timeStoptime"
                      type="time"
                      value={timeStoptime}
                      onChange={(e) => setTimeStoptime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Active Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={selectedWeekdays.includes(day.value) ? "default" : "outline"}
                        size="sm"
                        className="w-12"
                        onClick={() => toggleWeekday(day.value)}
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedWeekdays.length === 0
                      ? "No days selected (rule active every day)"
                      : selectedWeekdays.length === 7
                        ? "Active every day"
                        : `Active on: ${selectedWeekdays.join(", ")}`}
                  </p>
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
                      min="0"
                      max="63"
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
                    <Select
                      value={modifyVlanPriority || "_none_"}
                      onValueChange={(v) => setModifyVlanPriority(v === "_none_" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">None</SelectItem>
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((p) => (
                          <SelectItem key={p} value={p.toString()}>
                            {p} - {p === 0 ? "Best Effort" : p === 1 ? "Background" : p === 2 ? "Spare" : p === 3 ? "Excellent Effort" : p === 4 ? "Controlled Load" : p === 5 ? "Video" : p === 6 ? "Voice" : "Network Control"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modifyTcpMss">Set TCP MSS</Label>
                    <Select
                      value={modifyTcpMss || "_none_"}
                      onValueChange={(v) => setModifyTcpMss(v === "_none_" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">None</SelectItem>
                        <SelectItem value="clamp-mss-to-pmtu">Clamp to PMTU (Recommended)</SelectItem>
                        <SelectItem value="1460">1460 (Standard Ethernet)</SelectItem>
                        <SelectItem value="1440">1440 (PPPoE)</SelectItem>
                        <SelectItem value="1400">1400 (VPN/Tunnels)</SelectItem>
                        <SelectItem value="1360">1360 (Double Encapsulation)</SelectItem>
                      </SelectContent>
                    </Select>
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
                {isEdit ? "Saving..." : "Creating..."}
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Create Rule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
