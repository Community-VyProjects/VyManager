"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, Plus, X } from "lucide-react";
import { routeService, RouteCapabilitiesResponse, MatchConditions, SetActions } from "@/lib/api/route";
import { firewallGroupsService, FirewallGroup } from "@/lib/api/firewall-groups";
import { apiClient } from "@/lib/api/client";

interface EditRouteRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  policyType: string;
  policyName: string;
  rule: any;
  capabilities: RouteCapabilitiesResponse | null;
}

const PROTOCOLS = [
  "all", "tcp_udp", "tcp", "udp", "icmp", "ah", "ax.25", "dccp", "ddp", "egp",
  "eigrp", "encap", "esp", "etherip", "ethernet", "fc", "ggp", "gre", "hip",
  "hmp", "hopopt", "idpr-cmtp", "idrp", "igmp", "igp", "ip", "ipcomp", "ipencap",
  "ipip", "ipv6", "ipv6-frag", "ipv6-icmp", "ipv6-nonxt", "ipv6-opts", "ipv6-route",
  "isis", "iso-tp4", "l2tp", "manet", "mobility-header", "mpls-in-ip", "mptcp",
  "ospf", "pim", "pup", "rdp", "rohc", "rspf", "rsvp", "sctp", "shim6", "skip",
  "st", "udplite", "vmtp", "vrrp", "wesp", "xns-idp", "xtp"
];

const ICMP_TYPE_NAMES = [
  "echo-reply", "destination-unreachable", "source-quench", "redirect", "echo-request",
  "time-exceeded", "parameter-problem", "timestamp-request", "timestamp-reply",
  "address-mask-request", "address-mask-reply"
];

const ICMPV6_TYPE_NAMES = [
  "destination-unreachable", "packet-too-big", "time-exceeded", "parameter-problem",
  "echo-request", "echo-reply", "mld-listener-query", "mld-listener-report",
  "mld-listener-done", "nd-router-solicit", "nd-router-advert", "nd-neighbor-solicit",
  "nd-neighbor-advert", "nd-redirect", "router-renumbering", "ind-neighbor-solicit",
  "ind-neighbor-advert", "ind-neighbor-redirect", "mld2-listener-report"
];

const PACKET_TYPES = ["broadcast", "multicast", "unicast"];

const CONNECTION_STATES = ["established", "invalid", "new", "related"];

const TCP_FLAGS = ["syn", "ack", "fin", "rst", "urg", "psh"];

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function EditRouteRuleModal({
  open,
  onOpenChange,
  onSuccess,
  policyType,
  policyName,
  rule,
  capabilities,
}: EditRouteRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<FirewallGroup[]>([]);

  // Basic fields
  const [description, setDescription] = useState("");
  const [disable, setDisable] = useState(false);
  const [log, setLog] = useState(false);

  // Match Conditions - Address
  const [sourceAddress, setSourceAddress] = useState("");
  const [sourceAddressInvert, setSourceAddressInvert] = useState(false);
  const [destAddress, setDestAddress] = useState("");
  const [destAddressInvert, setDestAddressInvert] = useState(false);
  const [sourceMac, setSourceMac] = useState("");
  const [sourceMacInvert, setSourceMacInvert] = useState(false);
  const [destMac, setDestMac] = useState("");
  const [destMacInvert, setDestMacInvert] = useState(false);

  // Match Conditions - Groups (address/domain are mutually exclusive, mac and port are independent)
  const [sourceAddressDomainType, setSourceAddressDomainType] = useState<string>("none");
  const [sourceAddressDomainValue, setSourceAddressDomainValue] = useState<string>("");
  const [sourceMacGroup, setSourceMacGroup] = useState<string>("");
  const [sourcePortGroup, setSourcePortGroup] = useState<string>("");

  const [destAddressDomainType, setDestAddressDomainType] = useState<string>("none");
  const [destAddressDomainValue, setDestAddressDomainValue] = useState<string>("");
  const [destMacGroup, setDestMacGroup] = useState<string>("");
  const [destPortGroup, setDestPortGroup] = useState<string>("");

  // Match Conditions - Port
  const [sourcePort, setSourcePort] = useState("");
  const [destPort, setDestPort] = useState("");

  // Match Conditions - Protocol
  const [protocol, setProtocol] = useState("");
  const [tcpFlags, setTcpFlags] = useState<string[]>([]);

  // Match Conditions - ICMP
  const [icmpType, setIcmpType] = useState("");
  const [icmpTypeName, setIcmpTypeName] = useState("");
  const [icmpCode, setIcmpCode] = useState("");
  const [icmpv6Type, setIcmpv6Type] = useState("");
  const [icmpv6TypeName, setIcmpv6TypeName] = useState("");
  const [icmpv6Code, setIcmpv6Code] = useState("");

  // Match Conditions - Packet Characteristics
  const [fragment, setFragment] = useState<boolean | null>(null);
  const [packetType, setPacketType] = useState("");
  const [packetLength, setPacketLength] = useState("");
  const [packetLengthExclude, setPacketLengthExclude] = useState("");
  const [dscp, setDscp] = useState("");
  const [dscpExclude, setDscpExclude] = useState("");

  // Match Conditions - State & Marks
  const [connectionState, setConnectionState] = useState<string[]>([]);
  const [ipsec, setIpsec] = useState<boolean | null>(null);
  const [connectionMark, setConnectionMark] = useState("");
  const [mark, setMark] = useState("");

  // Match Conditions - TTL/Hop Limit
  const [ttlOperator, setTtlOperator] = useState("");
  const [ttlValue, setTtlValue] = useState("");
  const [hopLimitOperator, setHopLimitOperator] = useState("");
  const [hopLimitValue, setHopLimitValue] = useState("");

  // Match Conditions - Time-based
  const [monthdays, setMonthdays] = useState("");
  const [startDate, setStartDate] = useState("");
  const [stopDate, setStopDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [stopTime, setStopTime] = useState("");
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [utc, setUtc] = useState(false);

  // Match Conditions - Rate Limiting
  const [limitBurst, setLimitBurst] = useState("");
  const [limitRate, setLimitRate] = useState("");
  const [recentCount, setRecentCount] = useState("");
  const [recentTime, setRecentTime] = useState("");

  // Set Actions
  const [actionDrop, setActionDrop] = useState(false);
  const [actionConnectionMark, setActionConnectionMark] = useState("");
  const [actionDscp, setActionDscp] = useState("");
  const [actionMark, setActionMark] = useState("");
  const [actionTableMode, setActionTableMode] = useState<"none" | "main" | "custom">("none");
  const [actionTable, setActionTable] = useState("");
  const [actionTcpMss, setActionTcpMss] = useState("");
  const [actionVrf, setActionVrf] = useState("");


  useEffect(() => {
    if (open) {
      loadGroups();
      if (rule) {
        loadRuleData();
      }
    }
  }, [open, rule]);

  // Protocol validation: must be tcp/udp/tcp_udp when using ports or port-groups
  useEffect(() => {
    const hasPort = sourcePort.trim() || destPort.trim() || sourcePortGroup || destPortGroup;
    const validProtocols = ["tcp", "udp", "tcp_udp"];

    if (hasPort && !validProtocols.includes(protocol)) {
      setProtocol("tcp_udp");
    }
  }, [sourcePort, destPort, sourcePortGroup, destPortGroup, protocol]);

  const loadGroups = async () => {
    try {
      const config = await firewallGroupsService.getConfig();
      const allGroups = [
        ...config.address_groups,
        ...config.ipv6_address_groups,
        ...config.network_groups,
        ...config.ipv6_network_groups,
        ...config.port_groups,
        ...config.interface_groups,
        ...config.domain_groups,
        ...config.mac_groups,
      ];
      setGroups(allGroups);
    } catch (err) {
      console.error("Failed to load groups:", err);
    }
  };


  const loadRuleData = () => {
    const match = rule.match || {};
    const set = rule.set || {};

    // Basic
    setDescription(rule.description || "");
    setDisable(rule.disable || false);
    setLog(rule.log || false);

    // Match - Address - parse invert prefix (!)
    const srcAddr = match.source_address || "";
    if (srcAddr.startsWith("!")) {
      setSourceAddress(srcAddr.substring(1));
      setSourceAddressInvert(true);
    } else {
      setSourceAddress(srcAddr);
      setSourceAddressInvert(false);
    }

    const dstAddr = match.destination_address || "";
    if (dstAddr.startsWith("!")) {
      setDestAddress(dstAddr.substring(1));
      setDestAddressInvert(true);
    } else {
      setDestAddress(dstAddr);
      setDestAddressInvert(false);
    }

    const srcMac = match.source_mac_address || "";
    if (srcMac.startsWith("!")) {
      setSourceMac(srcMac.substring(1));
      setSourceMacInvert(true);
    } else {
      setSourceMac(srcMac);
      setSourceMacInvert(false);
    }

    const dstMac = match.destination_mac_address || "";
    if (dstMac.startsWith("!")) {
      setDestMac(dstMac.substring(1));
      setDestMacInvert(true);
    } else {
      setDestMac(dstMac);
      setDestMacInvert(false);
    }

    // Match - Groups (detect which type is set)
    if (match.source_group_address) {
      setSourceAddressDomainType("address");
      setSourceAddressDomainValue(match.source_group_address);
    } else if (match.source_group_domain) {
      setSourceAddressDomainType("domain");
      setSourceAddressDomainValue(match.source_group_domain);
    } else {
      setSourceAddressDomainType("none");
      setSourceAddressDomainValue("");
    }
    setSourceMacGroup(match.source_group_mac || "");
    setSourcePortGroup(match.source_group_port || "");

    if (match.destination_group_address) {
      setDestAddressDomainType("address");
      setDestAddressDomainValue(match.destination_group_address);
    } else if (match.destination_group_domain) {
      setDestAddressDomainType("domain");
      setDestAddressDomainValue(match.destination_group_domain);
    } else {
      setDestAddressDomainType("none");
      setDestAddressDomainValue("");
    }
    setDestMacGroup(match.destination_group_mac || "");
    setDestPortGroup(match.destination_group_port || "");

    // Match - Port
    setSourcePort(match.source_port || "");
    setDestPort(match.destination_port || "");

    // Match - Protocol
    setProtocol(match.protocol || "");
    setTcpFlags(match.tcp_flags ? match.tcp_flags.split(",") : []);

    // Match - ICMP
    setIcmpType(match.icmp_type || "");
    setIcmpTypeName(match.icmp_type_name || "");
    setIcmpCode(match.icmp_code || "");
    setIcmpv6Type(match.icmpv6_type || "");
    setIcmpv6TypeName(match.icmpv6_type_name || "");
    setIcmpv6Code(match.icmpv6_code || "");

    // Match - Packet Characteristics
    if (match.fragment !== undefined && match.fragment !== null) {
      // Convert string from backend to boolean for UI
      setFragment(match.fragment === "match-frag");
    } else {
      setFragment(null);
    }
    setPacketType(match.packet_type || "");
    setPacketLength(match.packet_length || "");
    setPacketLengthExclude(match.packet_length_exclude || "");
    setDscp(match.dscp || "");
    setDscpExclude(match.dscp_exclude || "");

    // Match - State & Marks
    setConnectionState(match.state ? match.state.split(",") : []);
    if (match.ipsec !== undefined && match.ipsec !== null) {
      // Convert string from backend to boolean for UI
      setIpsec(match.ipsec === "match-ipsec");
    } else {
      setIpsec(null);
    }
    setConnectionMark(match.connection_mark || "");
    setMark(match.mark || "");

    // Match - TTL/Hop Limit - parse from eq/gt/lt fields
    if (match.ttl_eq) {
      setTtlOperator("eq");
      setTtlValue(match.ttl_eq);
    } else if (match.ttl_gt) {
      setTtlOperator("gt");
      setTtlValue(match.ttl_gt);
    } else if (match.ttl_lt) {
      setTtlOperator("lt");
      setTtlValue(match.ttl_lt);
    } else {
      setTtlOperator("");
      setTtlValue("");
    }

    if (match.hop_limit_eq) {
      setHopLimitOperator("eq");
      setHopLimitValue(match.hop_limit_eq);
    } else if (match.hop_limit_gt) {
      setHopLimitOperator("gt");
      setHopLimitValue(match.hop_limit_gt);
    } else if (match.hop_limit_lt) {
      setHopLimitOperator("lt");
      setHopLimitValue(match.hop_limit_lt);
    } else {
      setHopLimitOperator("");
      setHopLimitValue("");
    }

    // Match - Time-based
    setMonthdays(match.time_monthdays || "");
    setStartDate(match.time_startdate || "");
    setStopDate(match.time_stopdate || "");
    setStartTime(match.time_starttime || "");
    setStopTime(match.time_stoptime || "");
    setWeekdays(match.time_weekdays ? match.time_weekdays.split(",") : []);
    setUtc(match.time_utc || false);

    // Match - Rate Limiting
    setLimitBurst(match.limit_burst || "");
    setLimitRate(match.limit_rate || "");
    setRecentCount(match.recent_count || "");
    setRecentTime(match.recent_time || "");

    // Set Actions
    setActionDrop(set.action_drop || false);
    setActionConnectionMark(set.connection_mark || "");
    setActionDscp(set.dscp || "");
    setActionMark(set.mark || "");
    if (set.table === "main") {
      setActionTableMode("main");
      setActionTable("");
    } else if (set.table) {
      setActionTableMode("custom");
      setActionTable(set.table);
    } else {
      setActionTableMode("none");
      setActionTable("");
    }
    setActionTcpMss(set.tcp_mss || "");
    setActionVrf(set.vrf || "");
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const match: Partial<MatchConditions> = {};
      const set: Partial<SetActions> = {};

      // Match - Address - prepend ! if invert is checked
      if (sourceAddress) {
        match.source_address = sourceAddressInvert ? `!${sourceAddress}` : sourceAddress;
      }
      if (destAddress) {
        match.destination_address = destAddressInvert ? `!${destAddress}` : destAddress;
      }
      if (sourceMac) {
        match.source_mac_address = sourceMacInvert ? `!${sourceMac}` : sourceMac;
      }
      if (destMac) {
        match.destination_mac_address = destMacInvert ? `!${destMac}` : destMac;
      }

      // Match - Groups
      if (sourceAddressDomainType !== "none" && sourceAddressDomainValue) {
        if (sourceAddressDomainType === "address") match.source_group_address = sourceAddressDomainValue;
        else if (sourceAddressDomainType === "domain") match.source_group_domain = sourceAddressDomainValue;
      }
      if (sourceMacGroup) match.source_group_mac = sourceMacGroup;
      if (sourcePortGroup) match.source_group_port = sourcePortGroup;

      if (destAddressDomainType !== "none" && destAddressDomainValue) {
        if (destAddressDomainType === "address") match.destination_group_address = destAddressDomainValue;
        else if (destAddressDomainType === "domain") match.destination_group_domain = destAddressDomainValue;
      }
      if (destMacGroup) match.destination_group_mac = destMacGroup;
      if (destPortGroup) match.destination_group_port = destPortGroup;

      // Match - Port
      if (sourcePort) match.source_port = sourcePort;
      if (destPort) match.destination_port = destPort;

      // Match - Protocol
      if (protocol && protocol !== "all") match.protocol = protocol;
      if (tcpFlags.length > 0) match.tcp_flags = tcpFlags.join(",");

      // Match - ICMP
      if (policyType === "route") {
        if (icmpType) match.icmp_type = icmpType;
        if (icmpTypeName) match.icmp_type_name = icmpTypeName;
        if (icmpCode) match.icmp_code = icmpCode;
      } else {
        if (icmpv6Type) match.icmpv6_type = icmpv6Type;
        if (icmpv6TypeName) match.icmpv6_type_name = icmpv6TypeName;
        if (icmpv6Code) match.icmpv6_code = icmpv6Code;
      }

      // Match - Packet Characteristics
      if (fragment !== null) {
        // Convert boolean to string expected by backend
        match.fragment = fragment ? "match-frag" : "match-non-frag";
      }
      if (packetType) match.packet_type = packetType;
      if (packetLength) match.packet_length = packetLength;
      if (packetLengthExclude) match.packet_length_exclude = packetLengthExclude;
      if (dscp) match.dscp = dscp;
      if (dscpExclude) match.dscp_exclude = dscpExclude;

      // Match - State & Marks
      if (connectionState.length > 0) match.state = connectionState.join(",");
      if (ipsec !== null) {
        // Convert boolean to string expected by backend
        match.ipsec = ipsec ? "match-ipsec" : "match-none";
      }
      if (connectionMark) match.connection_mark = connectionMark;
      if (mark) match.mark = mark;

      // Match - TTL/Hop Limit
      if (policyType === "route" && ttlOperator && ttlValue) {
        if (ttlOperator === "eq") match.ttl_eq = ttlValue;
        else if (ttlOperator === "gt") match.ttl_gt = ttlValue;
        else if (ttlOperator === "lt") match.ttl_lt = ttlValue;
      } else if (policyType === "route6" && hopLimitOperator && hopLimitValue) {
        if (hopLimitOperator === "eq") match.hop_limit_eq = hopLimitValue;
        else if (hopLimitOperator === "gt") match.hop_limit_gt = hopLimitValue;
        else if (hopLimitOperator === "lt") match.hop_limit_lt = hopLimitValue;
      }

      // Match - Time-based
      if (monthdays) match.time_monthdays = monthdays;
      if (startDate) match.time_startdate = startDate;
      if (stopDate) match.time_stopdate = stopDate;
      if (startTime) match.time_starttime = startTime;
      if (stopTime) match.time_stoptime = stopTime;
      if (weekdays.length > 0) match.time_weekdays = weekdays.join(",");
      if (utc) match.time_utc = true;

      // Match - Rate Limiting
      if (limitBurst) match.limit_burst = limitBurst;
      if (limitRate) match.limit_rate = limitRate;
      if (recentCount) match.recent_count = recentCount;
      if (recentTime) match.recent_time = recentTime;

      // Set Actions
      if (actionDrop) set.action_drop = true;
      if (actionConnectionMark) set.connection_mark = actionConnectionMark;
      if (actionDscp) set.dscp = actionDscp;
      if (actionMark) set.mark = actionMark;
      if (actionTableMode === "main") {
        set.table = "main";
      } else if (actionTableMode === "custom" && actionTable) {
        set.table = actionTable;
      }
      if (actionTcpMss) set.tcp_mss = actionTcpMss;
      if (actionVrf) set.vrf = actionVrf;

      await routeService.updateRule(policyType, policyName, rule.rule_number, {
        description: description,
        disable,
        log: log ? "true" : undefined,
        match: Object.keys(match).length > 0 ? match : undefined,
        set: Object.keys(set).length > 0 ? set : undefined,
      });

      handleClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to update rule");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const getGroupsByType = (type: string) => {
    return groups.filter((g) => g.type === type);
  };

  const toggleTcpFlag = (flag: string) => {
    setTcpFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  };

  const toggleConnectionState = (state: string) => {
    setConnectionState((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    );
  };

  const toggleWeekday = (day: string) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Rule {rule?.rule_number} - Policy: {policyName}</DialogTitle>
          <DialogDescription>
            Update the {policyType === "route" ? "IPv4" : "IPv6"} policy rule
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="match">Match Conditions</TabsTrigger>
            <TabsTrigger value="set">Set Actions</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rule Number</Label>
                <Input
                  value={rule?.rule_number}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Rule number cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Rule description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="disable"
                  checked={disable}
                  onCheckedChange={(checked) => setDisable(checked as boolean)}
                  disabled={loading}
                />
                <Label htmlFor="disable" className="text-sm font-normal cursor-pointer">
                  Disable this rule
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="log"
                  checked={log}
                  onCheckedChange={(checked) => setLog(checked as boolean)}
                  disabled={loading}
                />
                <Label htmlFor="log" className="text-sm font-normal cursor-pointer">
                  Enable logging for this rule
                </Label>
              </div>
            </div>
          </TabsContent>

          {/* Match Conditions Tab */}
          <TabsContent value="match" className="space-y-6">
            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Address Matching</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sourceAddress">Source Address</Label>
                  <Input
                    id="sourceAddress"
                    placeholder={policyType === "route6" ? "2001:db8::/32" : "192.168.1.0/24"}
                    value={sourceAddress}
                    onChange={(e) => setSourceAddress(e.target.value)}
                    disabled={loading}
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sourceAddressInvert"
                      checked={sourceAddressInvert}
                      onCheckedChange={(checked) => setSourceAddressInvert(checked as boolean)}
                      disabled={loading}
                    />
                    <Label htmlFor="sourceAddressInvert" className="text-sm font-normal cursor-pointer">
                      Invert match
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destAddress">Destination Address</Label>
                  <Input
                    id="destAddress"
                    placeholder={policyType === "route6" ? "fd00::/8" : "10.0.0.0/8"}
                    value={destAddress}
                    onChange={(e) => setDestAddress(e.target.value)}
                    disabled={loading}
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="destAddressInvert"
                      checked={destAddressInvert}
                      onCheckedChange={(checked) => setDestAddressInvert(checked as boolean)}
                      disabled={loading}
                    />
                    <Label htmlFor="destAddressInvert" className="text-sm font-normal cursor-pointer">
                      Invert match
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sourceMac">Source MAC Address</Label>
                  <Input
                    id="sourceMac"
                    placeholder="00:11:22:33:44:55"
                    value={sourceMac}
                    onChange={(e) => setSourceMac(e.target.value)}
                    disabled={loading}
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sourceMacInvert"
                      checked={sourceMacInvert}
                      onCheckedChange={(checked) => setSourceMacInvert(checked as boolean)}
                      disabled={loading}
                    />
                    <Label htmlFor="sourceMacInvert" className="text-sm font-normal cursor-pointer">
                      Invert match
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destMac">Destination MAC Address</Label>
                  <Input
                    id="destMac"
                    placeholder="00:11:22:33:44:66"
                    value={destMac}
                    onChange={(e) => setDestMac(e.target.value)}
                    disabled={loading}
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="destMacInvert"
                      checked={destMacInvert}
                      onCheckedChange={(checked) => setDestMacInvert(checked as boolean)}
                      disabled={loading}
                    />
                    <Label htmlFor="destMacInvert" className="text-sm font-normal cursor-pointer">
                      Invert match
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Groups Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Firewall Groups</h3>
              <div className="grid grid-cols-2 gap-6">
                {/* Source Groups */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Source Address/Domain Group (choose one)</Label>
                    <RadioGroup value={sourceAddressDomainType} onValueChange={(value) => {
                      setSourceAddressDomainType(value);
                      setSourceAddressDomainValue("");
                    }} disabled={loading}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="none" id="edit-src-ad-none" />
                        <Label htmlFor="edit-src-ad-none" className="font-normal cursor-pointer">None</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="address" id="edit-src-address" />
                        <Label htmlFor="edit-src-address" className="font-normal cursor-pointer">Address Group</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="domain" id="edit-src-domain" />
                        <Label htmlFor="edit-src-domain" className="font-normal cursor-pointer">Domain Group</Label>
                      </div>
                    </RadioGroup>

                    {sourceAddressDomainType !== "none" && (
                      <div className="space-y-2 mt-2">
                        <Select value={sourceAddressDomainValue} onValueChange={setSourceAddressDomainValue} disabled={loading}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select group" />
                          </SelectTrigger>
                          <SelectContent>
                            {getGroupsByType(
                              sourceAddressDomainType === "address"
                                ? (policyType === "route" ? "address-group" : "ipv6-address-group")
                                : "domain-group"
                            ).map((g) => (
                              <SelectItem key={g.name} value={g.name}>
                                {g.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-sourceMacGroup">Source MAC Group (optional)</Label>
                    <Select value={sourceMacGroup} onValueChange={setSourceMacGroup} disabled={loading}>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        {getGroupsByType("mac-group").map((g) => (
                          <SelectItem key={g.name} value={g.name}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-sourcePortGroup">Source Port Group (optional)</Label>
                    <Select value={sourcePortGroup} onValueChange={setSourcePortGroup} disabled={loading}>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        {getGroupsByType("port-group").map((g) => (
                          <SelectItem key={g.name} value={g.name}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {sourcePortGroup && (
                      <p className="text-xs text-muted-foreground">Protocol will be restricted to TCP/UDP</p>
                    )}
                  </div>
                </div>

                {/* Destination Groups */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Destination Address/Domain Group (choose one)</Label>
                    <RadioGroup value={destAddressDomainType} onValueChange={(value) => {
                      setDestAddressDomainType(value);
                      setDestAddressDomainValue("");
                    }} disabled={loading}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="none" id="edit-dst-ad-none" />
                        <Label htmlFor="edit-dst-ad-none" className="font-normal cursor-pointer">None</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="address" id="edit-dst-address" />
                        <Label htmlFor="edit-dst-address" className="font-normal cursor-pointer">Address Group</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="domain" id="edit-dst-domain" />
                        <Label htmlFor="edit-dst-domain" className="font-normal cursor-pointer">Domain Group</Label>
                      </div>
                    </RadioGroup>

                    {destAddressDomainType !== "none" && (
                      <div className="space-y-2 mt-2">
                        <Select value={destAddressDomainValue} onValueChange={setDestAddressDomainValue} disabled={loading}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select group" />
                          </SelectTrigger>
                          <SelectContent>
                            {getGroupsByType(
                              destAddressDomainType === "address"
                                ? (policyType === "route" ? "address-group" : "ipv6-address-group")
                                : "domain-group"
                            ).map((g) => (
                              <SelectItem key={g.name} value={g.name}>
                                {g.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-destMacGroup">Destination MAC Group (optional)</Label>
                    <Select value={destMacGroup} onValueChange={setDestMacGroup} disabled={loading}>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        {getGroupsByType("mac-group").map((g) => (
                          <SelectItem key={g.name} value={g.name}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-destPortGroup">Destination Port Group (optional)</Label>
                    <Select value={destPortGroup} onValueChange={setDestPortGroup} disabled={loading}>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        {getGroupsByType("port-group").map((g) => (
                          <SelectItem key={g.name} value={g.name}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {destPortGroup && (
                      <p className="text-xs text-muted-foreground">Protocol will be restricted to TCP/UDP</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Port & Protocol Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Port & Protocol</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sourcePort">Source Port</Label>
                  <Input
                    id="sourcePort"
                    placeholder="80 or 80,443 or 8000-9000"
                    value={sourcePort}
                    onChange={(e) => setSourcePort(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destPort">Destination Port</Label>
                  <Input
                    id="destPort"
                    placeholder="80 or 80,443 or 8000-9000"
                    value={destPort}
                    onChange={(e) => setDestPort(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="protocol">Protocol</Label>
                  <Select value={protocol} onValueChange={setProtocol} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="All protocols" />
                    </SelectTrigger>
                    <SelectContent>
                      {(sourcePort || destPort || sourcePortGroup || destPortGroup ?
                        ["tcp", "udp", "tcp_udp"] :
                        PROTOCOLS
                      ).map((p) => (
                        <SelectItem key={p} value={p}>
                          {p.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(sourcePort || destPort || sourcePortGroup || destPortGroup) && (
                    <p className="text-xs text-muted-foreground">Protocol restricted to TCP/UDP when using ports</p>
                  )}
                </div>

                {protocol === "tcp" && (
                  <div className="space-y-2">
                    <Label>TCP Flags</Label>
                    <div className="flex flex-wrap gap-2">
                      {TCP_FLAGS.map((flag) => (
                        <div key={flag} className="flex items-center space-x-2">
                          <Checkbox
                            id={`flag-${flag}`}
                            checked={tcpFlags.includes(flag)}
                            onCheckedChange={() => toggleTcpFlag(flag)}
                            disabled={loading}
                          />
                          <Label htmlFor={`flag-${flag}`} className="text-sm font-normal cursor-pointer">
                            {flag.toUpperCase()}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ICMP Section */}
            {policyType === "route" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">ICMP Matching (IPv4 only)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="icmpType">ICMP Type</Label>
                    <Input
                      id="icmpType"
                      placeholder="0-255"
                      value={icmpType}
                      onChange={(e) => setIcmpType(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="icmpTypeName">ICMP Type Name</Label>
                    <Select value={icmpTypeName} onValueChange={setIcmpTypeName} disabled={loading}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ICMP_TYPE_NAMES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="icmpCode">ICMP Code</Label>
                    <Input
                      id="icmpCode"
                      placeholder="0-255"
                      value={icmpCode}
                      onChange={(e) => setIcmpCode(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            )}

            {policyType === "route6" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">ICMPv6 Matching (IPv6 only)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="icmpv6Type">ICMPv6 Type</Label>
                    <Input
                      id="icmpv6Type"
                      placeholder="0-255"
                      value={icmpv6Type}
                      onChange={(e) => setIcmpv6Type(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="icmpv6TypeName">ICMPv6 Type Name</Label>
                    <Select value={icmpv6TypeName} onValueChange={setIcmpv6TypeName} disabled={loading}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ICMPV6_TYPE_NAMES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="icmpv6Code">ICMPv6 Code</Label>
                    <Input
                      id="icmpv6Code"
                      placeholder="0-255"
                      value={icmpv6Code}
                      onChange={(e) => setIcmpv6Code(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Packet Characteristics Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Packet Characteristics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fragment Matching</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="fragment-match"
                        checked={fragment === true}
                        onCheckedChange={(checked) => setFragment(checked ? true : null)}
                        disabled={loading}
                      />
                      <Label htmlFor="fragment-match" className="text-sm font-normal cursor-pointer">
                        Match fragments
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="fragment-exclude"
                        checked={fragment === false}
                        onCheckedChange={(checked) => setFragment(checked ? false : null)}
                        disabled={loading}
                      />
                      <Label htmlFor="fragment-exclude" className="text-sm font-normal cursor-pointer">
                        Exclude fragments
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="packetType">Packet Type</Label>
                  <Select value={packetType} onValueChange={setPacketType} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PACKET_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="packetLength">Packet Length</Label>
                  <Input
                    id="packetLength"
                    placeholder="64 or 64-128"
                    value={packetLength}
                    onChange={(e) => setPacketLength(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="packetLengthExclude">Packet Length (Exclude)</Label>
                  <Input
                    id="packetLengthExclude"
                    placeholder="64 or 64-128"
                    value={packetLengthExclude}
                    onChange={(e) => setPacketLengthExclude(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dscp">DSCP</Label>
                  <Input
                    id="dscp"
                    placeholder="0-63 or range 0-10"
                    value={dscp}
                    onChange={(e) => setDscp(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dscpExclude">DSCP (Exclude)</Label>
                  <Input
                    id="dscpExclude"
                    placeholder="0-63 or range 0-10"
                    value={dscpExclude}
                    onChange={(e) => setDscpExclude(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* State & Marks Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Connection State & Marks</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Connection State</Label>
                  <div className="flex flex-wrap gap-2">
                    {CONNECTION_STATES.map((state) => (
                      <div key={state} className="flex items-center space-x-2">
                        <Checkbox
                          id={`state-${state}`}
                          checked={connectionState.includes(state)}
                          onCheckedChange={() => toggleConnectionState(state)}
                          disabled={loading}
                        />
                        <Label htmlFor={`state-${state}`} className="text-sm font-normal cursor-pointer">
                          {state}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>IPsec Status</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ipsec-match"
                        checked={ipsec === true}
                        onCheckedChange={(checked) => setIpsec(checked ? true : null)}
                        disabled={loading}
                      />
                      <Label htmlFor="ipsec-match" className="text-sm font-normal cursor-pointer">
                        Match IPsec
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ipsec-exclude"
                        checked={ipsec === false}
                        onCheckedChange={(checked) => setIpsec(checked ? false : null)}
                        disabled={loading}
                      />
                      <Label htmlFor="ipsec-exclude" className="text-sm font-normal cursor-pointer">
                        Exclude IPsec
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="connectionMark">Connection Mark</Label>
                  <Input
                    id="connectionMark"
                    placeholder="0-2147483647"
                    value={connectionMark}
                    onChange={(e) => setConnectionMark(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mark">Mark</Label>
                  <Input
                    id="mark"
                    placeholder="0-2147483647"
                    value={mark}
                    onChange={(e) => setMark(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* TTL / Hop Limit Section */}
            {policyType === "route" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">TTL (IPv4 only)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ttlOperator">TTL Operator</Label>
                    <Select value={ttlOperator} onValueChange={setTtlOperator} disabled={loading}>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eq">Equal to (eq)</SelectItem>
                        <SelectItem value="gt">Greater than (gt)</SelectItem>
                        <SelectItem value="lt">Less than (lt)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ttlValue">TTL Value</Label>
                    <Input
                      id="ttlValue"
                      type="number"
                      min="0"
                      max="255"
                      placeholder="0-255"
                      value={ttlValue}
                      onChange={(e) => setTtlValue(e.target.value)}
                      disabled={loading || !ttlOperator}
                    />
                  </div>
                </div>
              </div>
            )}

            {policyType === "route6" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Hop Limit (IPv6 only)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hopLimitOperator">Hop Limit Operator</Label>
                    <Select value={hopLimitOperator} onValueChange={setHopLimitOperator} disabled={loading}>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eq">Equal to (eq)</SelectItem>
                        <SelectItem value="gt">Greater than (gt)</SelectItem>
                        <SelectItem value="lt">Less than (lt)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hopLimitValue">Hop Limit Value</Label>
                    <Input
                      id="hopLimitValue"
                      type="number"
                      min="0"
                      max="255"
                      placeholder="0-255"
                      value={hopLimitValue}
                      onChange={(e) => setHopLimitValue(e.target.value)}
                      disabled={loading || !hopLimitOperator}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Time-based Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Time-based Matching</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthdays">Month Days</Label>
                  <Input
                    id="monthdays"
                    placeholder="1-31 (comma-separated)"
                    value={monthdays}
                    onChange={(e) => setMonthdays(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">Example: 1,15,30</p>
                </div>

                <div className="space-y-2">
                  <Label>Weekdays</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${day}`}
                          checked={weekdays.includes(day)}
                          onCheckedChange={() => toggleWeekday(day)}
                          disabled={loading}
                        />
                        <Label htmlFor={`day-${day}`} className="text-sm font-normal cursor-pointer">
                          {day.substring(0, 3)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    placeholder="YYYY-MM-DD"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stopDate">Stop Date</Label>
                  <Input
                    id="stopDate"
                    placeholder="YYYY-MM-DD"
                    value={stopDate}
                    onChange={(e) => setStopDate(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    placeholder="HH:MM:SS"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stopTime">Stop Time</Label>
                  <Input
                    id="stopTime"
                    placeholder="HH:MM:SS"
                    value={stopTime}
                    onChange={(e) => setStopTime(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="utc"
                    checked={utc}
                    onCheckedChange={(checked) => setUtc(checked as boolean)}
                    disabled={loading}
                  />
                  <Label htmlFor="utc" className="text-sm font-normal cursor-pointer">
                    Use UTC time
                  </Label>
                </div>
              </div>
            </div>

            {/* Rate Limiting Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Rate Limiting</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="limitBurst">Limit Burst</Label>
                  <Input
                    id="limitBurst"
                    placeholder="Number of packets"
                    value={limitBurst}
                    onChange={(e) => setLimitBurst(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum burst before rate limiting applies
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="limitRate">Limit Rate</Label>
                  <Input
                    id="limitRate"
                    placeholder="packets/second, packets/minute, etc."
                    value={limitRate}
                    onChange={(e) => setLimitRate(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Example: 10/second, 100/minute
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recentCount">Recent Count</Label>
                  <Input
                    id="recentCount"
                    placeholder="Number of packets"
                    value={recentCount}
                    onChange={(e) => setRecentCount(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recentTime">Recent Time</Label>
                  <Input
                    id="recentTime"
                    placeholder="Seconds"
                    value={recentTime}
                    onChange={(e) => setRecentTime(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Set Actions Tab */}
          <TabsContent value="set" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="actionDrop"
                  checked={actionDrop}
                  onCheckedChange={(checked) => setActionDrop(checked as boolean)}
                  disabled={loading}
                />
                <Label htmlFor="actionDrop" className="text-sm font-normal cursor-pointer">
                  Drop matching packets
                </Label>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Packet Marking</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="actionConnectionMark">Connection Mark</Label>
                  <Input
                    id="actionConnectionMark"
                    placeholder="0-2147483647"
                    value={actionConnectionMark}
                    onChange={(e) => setActionConnectionMark(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actionMark">Mark</Label>
                  <Input
                    id="actionMark"
                    placeholder="0-2147483647"
                    value={actionMark}
                    onChange={(e) => setActionMark(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actionDscp">DSCP</Label>
                  <Input
                    id="actionDscp"
                    placeholder="0-63"
                    value={actionDscp}
                    onChange={(e) => setActionDscp(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Routing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium mb-2 block">Routing Table</Label>
                  <RadioGroup value={actionTableMode} onValueChange={(value: any) => {
                    setActionTableMode(value);
                    if (value !== "custom") setActionTable("");
                  }} disabled={loading}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="none" id="edit-table-none" />
                      <Label htmlFor="edit-table-none" className="font-normal cursor-pointer">None</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="main" id="edit-table-main" />
                      <Label htmlFor="edit-table-main" className="font-normal cursor-pointer">Main table</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="edit-table-custom" />
                      <Label htmlFor="edit-table-custom" className="font-normal cursor-pointer">Custom table</Label>
                    </div>
                  </RadioGroup>
                  {actionTableMode === "custom" && (
                    <Input
                      id="actionTable"
                      placeholder="Table number or name"
                      value={actionTable}
                      onChange={(e) => setActionTable(e.target.value)}
                      disabled={loading}
                      className="mt-2"
                    />
                  )}
                </div>

                {capabilities?.features.vrf_routing?.supported && (
                  <div className="space-y-2">
                    <Label htmlFor="actionVrf">VRF</Label>
                    <Input
                      id="actionVrf"
                      placeholder="VRF name"
                      value={actionVrf}
                      onChange={(e) => setActionVrf(e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      VRF routing (VyOS 1.5+ only)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">TCP Options</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="actionTcpMss">TCP MSS</Label>
                  <Input
                    id="actionTcpMss"
                    placeholder="500-1460 or 'clamp-mss-to-pmtu'"
                    value={actionTcpMss}
                    onChange={(e) => setActionTcpMss(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    TCP Maximum Segment Size
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Updating..." : "Update Rule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
