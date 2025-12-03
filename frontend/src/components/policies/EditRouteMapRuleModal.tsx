"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle } from "lucide-react";
import { routeMapService } from "@/lib/api/route-map";
import type { RouteMapRule, MatchConditions, SetActions } from "@/lib/api/route-map";

interface EditRouteMapRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  routeMapName: string;
  rule: RouteMapRule | null;
}

export function EditRouteMapRuleModal({
  open,
  onOpenChange,
  onSuccess,
  routeMapName,
  rule,
}: EditRouteMapRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic fields
  const [ruleDescription, setRuleDescription] = useState("");
  const [action, setAction] = useState("permit");

  // Advanced rule options
  const [call, setCall] = useState("");
  const [continueRule, setContinueRule] = useState("");
  const [onMatchGoto, setOnMatchGoto] = useState("");
  const [onMatchNext, setOnMatchNext] = useState(false);

  // Match Conditions - BGP
  const [matchAsPath, setMatchAsPath] = useState("");
  const [matchCommunityList, setMatchCommunityList] = useState("");
  const [matchCommunityExact, setMatchCommunityExact] = useState(false);
  const [matchExtcommunity, setMatchExtcommunity] = useState("");
  const [matchLargeCommunityList, setMatchLargeCommunityList] = useState("");
  const [matchLocalPref, setMatchLocalPref] = useState("");
  const [matchMetric, setMatchMetric] = useState("");
  const [matchOrigin, setMatchOrigin] = useState("");
  const [matchPeer, setMatchPeer] = useState("");
  const [matchRpki, setMatchRpki] = useState("");

  // Match Conditions - IP/IPv6 Address
  const [matchIpAddressAccessList, setMatchIpAddressAccessList] = useState("");
  const [matchIpAddressPrefixList, setMatchIpAddressPrefixList] = useState("");
  const [matchIpAddressPrefixLen, setMatchIpAddressPrefixLen] = useState("");
  const [matchIpv6AddressAccessList, setMatchIpv6AddressAccessList] = useState("");
  const [matchIpv6AddressPrefixList, setMatchIpv6AddressPrefixList] = useState("");
  const [matchIpv6AddressPrefixLen, setMatchIpv6AddressPrefixLen] = useState("");

  // Match Conditions - Next-Hop
  const [matchIpNexthopAccessList, setMatchIpNexthopAccessList] = useState("");
  const [matchIpNexthopAddress, setMatchIpNexthopAddress] = useState("");
  const [matchIpNexthopPrefixLen, setMatchIpNexthopPrefixLen] = useState("");
  const [matchIpNexthopPrefixList, setMatchIpNexthopPrefixList] = useState("");
  const [matchIpNexthopType, setMatchIpNexthopType] = useState("");
  const [matchIpv6NexthopAddress, setMatchIpv6NexthopAddress] = useState("");

  // Match Conditions - Route Source
  const [matchIpRouteSourceAccessList, setMatchIpRouteSourceAccessList] = useState("");
  const [matchIpRouteSourcePrefixList, setMatchIpRouteSourcePrefixList] = useState("");

  // Match Conditions - Other
  const [matchInterface, setMatchInterface] = useState("");
  const [matchProtocol, setMatchProtocol] = useState("");
  const [matchSourceVrf, setMatchSourceVrf] = useState("");
  const [matchTag, setMatchTag] = useState("");

  // Set Actions - BGP AS Path
  const [setAsPathExclude, setSetAsPathExclude] = useState("");
  const [setAsPathPrepend, setSetAsPathPrepend] = useState("");
  const [setAsPathPrependLastAs, setSetAsPathPrependLastAs] = useState("");

  // Set Actions - Communities
  const [setCommunityValue, setSetCommunityValue] = useState("");
  const [setCommunityAction, setSetCommunityAction] = useState("");
  const [setLargeCommunityValue, setSetLargeCommunityValue] = useState("");
  const [setLargeCommunityAction, setSetLargeCommunityAction] = useState("");
  const [setExtcommunityBandwidth, setSetExtcommunityBandwidth] = useState("");
  const [setExtcommunityRt, setSetExtcommunityRt] = useState("");
  const [setExtcommunitySoo, setSetExtcommunitySoo] = useState("");
  const [setExtcommunityNone, setSetExtcommunityNone] = useState(false);

  // Set Actions - BGP Attributes
  const [setAtomicAggregate, setSetAtomicAggregate] = useState(false);
  const [setAggregatorAs, setSetAggregatorAs] = useState("");
  const [setAggregatorIp, setSetAggregatorIp] = useState("");
  const [setLocalPref, setSetLocalPref] = useState("");
  const [setOrigin, setSetOrigin] = useState("");
  const [setOriginatorId, setSetOriginatorId] = useState("");
  const [setWeight, setSetWeight] = useState("");

  // Set Actions - Next-Hop
  const [setIpNexthop, setSetIpNexthop] = useState("");
  const [setIpNexthopPeerAddress, setSetIpNexthopPeerAddress] = useState(false);
  const [setIpNexthopUnchanged, setSetIpNexthopUnchanged] = useState(false);
  const [setIpv6NexthopGlobal, setSetIpv6NexthopGlobal] = useState("");
  const [setIpv6NexthopLocal, setSetIpv6NexthopLocal] = useState("");
  const [setIpv6NexthopPeerAddress, setSetIpv6NexthopPeerAddress] = useState(false);
  const [setIpv6NexthopPreferGlobal, setSetIpv6NexthopPreferGlobal] = useState(false);

  // Set Actions - Route Properties
  const [setDistance, setSetDistance] = useState("");
  const [setMetric, setSetMetric] = useState("");
  const [setMetricType, setSetMetricType] = useState("");
  const [setSrc, setSetSrc] = useState("");
  const [setTable, setSetTable] = useState("");
  const [setTag, setSetTag] = useState("");

  // Load rule data when modal opens
  useEffect(() => {
    if (open && rule) {
      loadRuleData(rule);
    }
  }, [open, rule]);

  const loadRuleData = (ruleData: RouteMapRule) => {
    // Basic fields
    setRuleDescription(ruleData.description || "");
    setAction(ruleData.action);
    setCall(ruleData.call || "");
    setContinueRule(ruleData.continue_rule !== null ? String(ruleData.continue_rule) : "");
    setOnMatchGoto(ruleData.on_match_goto !== null ? String(ruleData.on_match_goto) : "");
    setOnMatchNext(ruleData.on_match_next || false);

    // Match conditions
    const match = ruleData.match;
    setMatchAsPath(match.as_path || "");
    setMatchCommunityList(match.community_list || "");
    setMatchCommunityExact(match.community_exact_match || false);
    setMatchExtcommunity(match.extcommunity || "");
    setMatchLargeCommunityList(match.large_community_list || "");
    setMatchLocalPref(match.local_preference !== null ? String(match.local_preference) : "");
    setMatchMetric(match.metric !== null ? String(match.metric) : "");
    setMatchOrigin(match.origin || "");
    setMatchPeer(match.peer || "");
    setMatchRpki(match.rpki || "");
    setMatchIpAddressAccessList(match.ip_address_access_list || "");
    setMatchIpAddressPrefixList(match.ip_address_prefix_list || "");
    setMatchIpAddressPrefixLen(match.ip_address_prefix_len !== null ? String(match.ip_address_prefix_len) : "");
    setMatchIpv6AddressAccessList(match.ipv6_address_access_list || "");
    setMatchIpv6AddressPrefixList(match.ipv6_address_prefix_list || "");
    setMatchIpv6AddressPrefixLen(match.ipv6_address_prefix_len !== null ? String(match.ipv6_address_prefix_len) : "");
    setMatchIpNexthopAccessList(match.ip_nexthop_access_list || "");
    setMatchIpNexthopAddress(match.ip_nexthop_address || "");
    setMatchIpNexthopPrefixLen(match.ip_nexthop_prefix_len !== null ? String(match.ip_nexthop_prefix_len) : "");
    setMatchIpNexthopPrefixList(match.ip_nexthop_prefix_list || "");
    setMatchIpNexthopType(match.ip_nexthop_type || "");
    setMatchIpv6NexthopAddress(match.ipv6_nexthop_address || "");
    setMatchIpRouteSourceAccessList(match.ip_route_source_access_list || "");
    setMatchIpRouteSourcePrefixList(match.ip_route_source_prefix_list || "");
    setMatchInterface(match.interface || "");
    setMatchProtocol(match.protocol || "");
    setMatchSourceVrf(match.source_vrf || "");
    setMatchTag(match.tag !== null ? String(match.tag) : "");

    // Set actions
    const set = ruleData.set;
    setSetAsPathExclude(set.as_path_exclude || "");
    setSetAsPathPrepend(set.as_path_prepend || "");
    setSetAsPathPrependLastAs(set.as_path_prepend_last_as !== null ? String(set.as_path_prepend_last_as) : "");
    setSetCommunityValue(set.community_value || "");
    setSetCommunityAction(set.community_action || "");
    setSetLargeCommunityValue(set.large_community_value || "");
    setSetLargeCommunityAction(set.large_community_action || "");
    setSetExtcommunityBandwidth(set.extcommunity_bandwidth || "");
    setSetExtcommunityRt(set.extcommunity_rt || "");
    setSetExtcommunitySoo(set.extcommunity_soo || "");
    setSetExtcommunityNone(set.extcommunity_none || false);
    setSetAtomicAggregate(set.atomic_aggregate || false);
    setSetAggregatorAs(set.aggregator_as || "");
    setSetAggregatorIp(set.aggregator_ip || "");
    setSetLocalPref(set.local_preference !== null ? String(set.local_preference) : "");
    setSetOrigin(set.origin || "");
    setSetOriginatorId(set.originator_id || "");
    setSetWeight(set.weight !== null ? String(set.weight) : "");
    // Handle IP next-hop special values
    if (set.ip_nexthop === "peer-address") {
      setSetIpNexthop("");
      setSetIpNexthopPeerAddress(true);
      setSetIpNexthopUnchanged(false);
    } else if (set.ip_nexthop === "unchanged") {
      setSetIpNexthop("");
      setSetIpNexthopPeerAddress(false);
      setSetIpNexthopUnchanged(true);
    } else {
      setSetIpNexthop(set.ip_nexthop || "");
      setSetIpNexthopPeerAddress(false);
      setSetIpNexthopUnchanged(false);
    }
    setSetIpv6NexthopGlobal(set.ipv6_nexthop_global || "");
    setSetIpv6NexthopLocal(set.ipv6_nexthop_local || "");
    setSetIpv6NexthopPeerAddress(set.ipv6_nexthop_peer_address || false);
    setSetIpv6NexthopPreferGlobal(set.ipv6_nexthop_prefer_global || false);
    setSetDistance(set.distance !== null ? String(set.distance) : "");
    setSetMetric(set.metric || "");
    setSetMetricType(set.metric_type || "");
    setSetSrc(set.src || "");
    setSetTable(set.table !== null ? String(set.table) : "");
    setSetTag(set.tag !== null ? String(set.tag) : "");
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
      // Build match conditions
      const match: Partial<MatchConditions> = {};
      if (matchAsPath.trim()) match.as_path = matchAsPath.trim();
      if (matchCommunityList.trim()) match.community_list = matchCommunityList.trim();
      match.community_exact_match = matchCommunityExact;
      if (matchExtcommunity.trim()) match.extcommunity = matchExtcommunity.trim();
      if (matchLargeCommunityList.trim()) match.large_community_list = matchLargeCommunityList.trim();
      if (matchLocalPref.trim()) match.local_preference = parseInt(matchLocalPref);
      if (matchMetric.trim()) match.metric = parseInt(matchMetric);
      if (matchOrigin.trim()) match.origin = matchOrigin.trim();
      if (matchPeer.trim()) match.peer = matchPeer.trim();
      if (matchRpki.trim()) match.rpki = matchRpki.trim();
      if (matchIpAddressAccessList.trim()) match.ip_address_access_list = matchIpAddressAccessList.trim();
      if (matchIpAddressPrefixList.trim()) match.ip_address_prefix_list = matchIpAddressPrefixList.trim();
      if (matchIpAddressPrefixLen.trim()) match.ip_address_prefix_len = parseInt(matchIpAddressPrefixLen);
      if (matchIpv6AddressAccessList.trim()) match.ipv6_address_access_list = matchIpv6AddressAccessList.trim();
      if (matchIpv6AddressPrefixList.trim()) match.ipv6_address_prefix_list = matchIpv6AddressPrefixList.trim();
      if (matchIpv6AddressPrefixLen.trim()) match.ipv6_address_prefix_len = parseInt(matchIpv6AddressPrefixLen);
      if (matchIpNexthopAccessList.trim()) match.ip_nexthop_access_list = matchIpNexthopAccessList.trim();
      if (matchIpNexthopAddress.trim()) match.ip_nexthop_address = matchIpNexthopAddress.trim();
      if (matchIpNexthopPrefixLen.trim()) match.ip_nexthop_prefix_len = parseInt(matchIpNexthopPrefixLen);
      if (matchIpNexthopPrefixList.trim()) match.ip_nexthop_prefix_list = matchIpNexthopPrefixList.trim();
      if (matchIpNexthopType.trim()) match.ip_nexthop_type = matchIpNexthopType.trim();
      if (matchIpv6NexthopAddress.trim()) match.ipv6_nexthop_address = matchIpv6NexthopAddress.trim();
      if (matchIpRouteSourceAccessList.trim()) match.ip_route_source_access_list = matchIpRouteSourceAccessList.trim();
      if (matchIpRouteSourcePrefixList.trim()) match.ip_route_source_prefix_list = matchIpRouteSourcePrefixList.trim();
      if (matchInterface.trim()) match.interface = matchInterface.trim();
      if (matchProtocol.trim()) match.protocol = matchProtocol.trim();
      if (matchSourceVrf.trim()) match.source_vrf = matchSourceVrf.trim();
      if (matchTag.trim()) match.tag = parseInt(matchTag);

      // Build set actions
      const set: Partial<SetActions> = {};
      if (setAsPathExclude.trim()) set.as_path_exclude = setAsPathExclude.trim();
      if (setAsPathPrepend.trim()) set.as_path_prepend = setAsPathPrepend.trim();
      if (setAsPathPrependLastAs.trim()) set.as_path_prepend_last_as = parseInt(setAsPathPrependLastAs);
      if (setCommunityValue.trim()) set.community_value = setCommunityValue.trim();
      if (setCommunityAction.trim()) set.community_action = setCommunityAction.trim();
      if (setLargeCommunityValue.trim()) set.large_community_value = setLargeCommunityValue.trim();
      if (setLargeCommunityAction.trim()) set.large_community_action = setLargeCommunityAction.trim();
      if (setExtcommunityBandwidth.trim()) set.extcommunity_bandwidth = setExtcommunityBandwidth.trim();
      if (setExtcommunityRt.trim()) set.extcommunity_rt = setExtcommunityRt.trim();
      if (setExtcommunitySoo.trim()) set.extcommunity_soo = setExtcommunitySoo.trim();
      set.extcommunity_none = setExtcommunityNone;
      set.atomic_aggregate = setAtomicAggregate;
      if (setAggregatorAs.trim()) set.aggregator_as = setAggregatorAs.trim();
      if (setAggregatorIp.trim()) set.aggregator_ip = setAggregatorIp.trim();
      if (setLocalPref.trim()) set.local_preference = parseInt(setLocalPref);
      if (setOrigin.trim()) set.origin = setOrigin.trim();
      if (setOriginatorId.trim()) set.originator_id = setOriginatorId.trim();
      if (setWeight.trim()) set.weight = parseInt(setWeight);
      // Handle IP next-hop - only one option at a time
      if (setIpNexthopPeerAddress) {
        set.ip_nexthop = "peer-address";
      } else if (setIpNexthopUnchanged) {
        set.ip_nexthop = "unchanged";
      } else if (setIpNexthop.trim()) {
        set.ip_nexthop = setIpNexthop.trim();
      }
      if (setIpv6NexthopGlobal.trim()) set.ipv6_nexthop_global = setIpv6NexthopGlobal.trim();
      if (setIpv6NexthopLocal.trim()) set.ipv6_nexthop_local = setIpv6NexthopLocal.trim();
      set.ipv6_nexthop_peer_address = setIpv6NexthopPeerAddress;
      set.ipv6_nexthop_prefer_global = setIpv6NexthopPreferGlobal;
      if (setDistance.trim()) set.distance = parseInt(setDistance);
      if (setMetric.trim()) set.metric = setMetric.trim();
      if (setMetricType.trim()) set.metric_type = setMetricType.trim();
      if (setSrc.trim()) set.src = setSrc.trim();
      if (setTable.trim()) set.table = parseInt(setTable);
      if (setTag.trim()) set.tag = parseInt(setTag);

      const updatedRule: any = {
        rule_number: rule.rule_number,
        description: ruleDescription.trim() || null,
        action,
        call: call.trim() || null,
        continue_rule: continueRule.trim() ? parseInt(continueRule) : null,
        on_match_goto: onMatchGoto.trim() ? parseInt(onMatchGoto) : null,
        on_match_next: onMatchNext,
        match,
        set,
      };

      await routeMapService.updateRule(routeMapName, rule.rule_number, updatedRule);

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update rule");
    } finally {
      setLoading(false);
    }
  };

  if (!rule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Rule {rule.rule_number} in {routeMapName}</DialogTitle>
          <DialogDescription>
            Modify match conditions and set actions for this route-map rule
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="match">Match Conditions</TabsTrigger>
            <TabsTrigger value="set">Set Actions</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="action">Action *</Label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permit">Permit</SelectItem>
                    <SelectItem value="deny">Deny</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Permit allows matching routes, Deny blocks them
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ruleDescription">Rule Description</Label>
              <Input
                id="ruleDescription"
                placeholder="Optional description for this rule"
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
              />
            </div>
          </TabsContent>

          {/* Match Conditions Tab */}
          <TabsContent value="match" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Define conditions that routes must match. All specified conditions must match (AND logic).
            </p>

            <Accordion type="multiple" className="w-full">
              {/* BGP Attributes */}
              <AccordionItem value="bgp">
                <AccordionTrigger>BGP Attributes</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="matchAsPath">AS Path List</Label>
                      <Input
                        id="matchAsPath"
                        placeholder="AS path list name"
                        value={matchAsPath}
                        onChange={(e) => setMatchAsPath(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="matchOrigin">Origin</Label>
                      <Select value={matchOrigin || "none"} onValueChange={(val) => setMatchOrigin(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select origin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="egp">EGP</SelectItem>
                          <SelectItem value="igp">IGP</SelectItem>
                          <SelectItem value="incomplete">Incomplete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="matchCommunityList">Community List</Label>
                      <Input
                        id="matchCommunityList"
                        placeholder="Community list name"
                        value={matchCommunityList}
                        onChange={(e) => setMatchCommunityList(e.target.value)}
                      />
                      <div className="flex items-center space-x-2 mt-2">
                        <Checkbox
                          id="matchCommunityExact"
                          checked={matchCommunityExact}
                          onCheckedChange={(checked) => setMatchCommunityExact(checked as boolean)}
                        />
                        <Label htmlFor="matchCommunityExact" className="text-sm font-normal">
                          Exact match
                        </Label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="matchExtcommunity">Extended Community</Label>
                      <Input
                        id="matchExtcommunity"
                        placeholder="Extcommunity list name"
                        value={matchExtcommunity}
                        onChange={(e) => setMatchExtcommunity(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="matchLargeCommunityList">Large Community List</Label>
                      <Input
                        id="matchLargeCommunityList"
                        placeholder="Large community list name"
                        value={matchLargeCommunityList}
                        onChange={(e) => setMatchLargeCommunityList(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="matchLocalPref">Local Preference</Label>
                      <Input
                        id="matchLocalPref"
                        type="number"
                        placeholder="0-4294967295"
                        value={matchLocalPref}
                        onChange={(e) => setMatchLocalPref(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="matchMetric">Metric (MED)</Label>
                      <Input
                        id="matchMetric"
                        type="number"
                        placeholder="0-4294967295"
                        value={matchMetric}
                        onChange={(e) => setMatchMetric(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="matchPeer">Peer Address</Label>
                      <Input
                        id="matchPeer"
                        placeholder="e.g., 192.168.1.1"
                        value={matchPeer}
                        onChange={(e) => setMatchPeer(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="matchRpki">RPKI Validation</Label>
                      <Select value={matchRpki || "none"} onValueChange={(val) => setMatchRpki(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select RPKI state" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="valid">Valid</SelectItem>
                          <SelectItem value="invalid">Invalid</SelectItem>
                          <SelectItem value="notfound">Not Found</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* IP/IPv6 Address */}
              <AccordionItem value="address">
                <AccordionTrigger>IP/IPv6 Address Matching</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">IPv4 Address</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="matchIpAddressAccessList">Access List</Label>
                        <Input
                          id="matchIpAddressAccessList"
                          placeholder="Access list number/name"
                          value={matchIpAddressAccessList}
                          onChange={(e) => setMatchIpAddressAccessList(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpAddressPrefixList">Prefix List</Label>
                        <Input
                          id="matchIpAddressPrefixList"
                          placeholder="Prefix list name"
                          value={matchIpAddressPrefixList}
                          onChange={(e) => setMatchIpAddressPrefixList(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpAddressPrefixLen">Prefix Length</Label>
                        <Input
                          id="matchIpAddressPrefixLen"
                          type="number"
                          placeholder="0-32"
                          value={matchIpAddressPrefixLen}
                          onChange={(e) => setMatchIpAddressPrefixLen(e.target.value)}
                        />
                      </div>
                    </div>

                    <h4 className="font-medium text-sm pt-4">IPv6 Address</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="matchIpv6AddressAccessList">Access List</Label>
                        <Input
                          id="matchIpv6AddressAccessList"
                          placeholder="Access list number/name"
                          value={matchIpv6AddressAccessList}
                          onChange={(e) => setMatchIpv6AddressAccessList(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpv6AddressPrefixList">Prefix List</Label>
                        <Input
                          id="matchIpv6AddressPrefixList"
                          placeholder="Prefix list name"
                          value={matchIpv6AddressPrefixList}
                          onChange={(e) => setMatchIpv6AddressPrefixList(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpv6AddressPrefixLen">Prefix Length</Label>
                        <Input
                          id="matchIpv6AddressPrefixLen"
                          type="number"
                          placeholder="0-128"
                          value={matchIpv6AddressPrefixLen}
                          onChange={(e) => setMatchIpv6AddressPrefixLen(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Next-Hop */}
              <AccordionItem value="nexthop">
                <AccordionTrigger>Next-Hop Matching</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">IPv4 Next-Hop</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="matchIpNexthopAccessList">Access List</Label>
                        <Input
                          id="matchIpNexthopAccessList"
                          placeholder="Access list number/name"
                          value={matchIpNexthopAccessList}
                          onChange={(e) => setMatchIpNexthopAccessList(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpNexthopAddress">Address</Label>
                        <Input
                          id="matchIpNexthopAddress"
                          placeholder="e.g., 192.168.1.1"
                          value={matchIpNexthopAddress}
                          onChange={(e) => setMatchIpNexthopAddress(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpNexthopPrefixList">Prefix List</Label>
                        <Input
                          id="matchIpNexthopPrefixList"
                          placeholder="Prefix list name"
                          value={matchIpNexthopPrefixList}
                          onChange={(e) => setMatchIpNexthopPrefixList(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpNexthopPrefixLen">Prefix Length</Label>
                        <Input
                          id="matchIpNexthopPrefixLen"
                          type="number"
                          placeholder="0-32"
                          value={matchIpNexthopPrefixLen}
                          onChange={(e) => setMatchIpNexthopPrefixLen(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpNexthopType">Type</Label>
                        <Input
                          id="matchIpNexthopType"
                          placeholder="e.g., blackhole"
                          value={matchIpNexthopType}
                          onChange={(e) => setMatchIpNexthopType(e.target.value)}
                        />
                      </div>
                    </div>

                    <h4 className="font-medium text-sm pt-4">IPv6 Next-Hop</h4>
                    <div className="space-y-2">
                      <Label htmlFor="matchIpv6NexthopAddress">Address</Label>
                      <Input
                        id="matchIpv6NexthopAddress"
                        placeholder="e.g., 2001:db8::1"
                        value={matchIpv6NexthopAddress}
                        onChange={(e) => setMatchIpv6NexthopAddress(e.target.value)}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Other Conditions */}
              <AccordionItem value="other">
                <AccordionTrigger>Other Conditions</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="matchIpRouteSourceAccessList">Route Source Access List</Label>
                      <Input
                        id="matchIpRouteSourceAccessList"
                        placeholder="Access list number/name"
                        value={matchIpRouteSourceAccessList}
                        onChange={(e) => setMatchIpRouteSourceAccessList(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="matchIpRouteSourcePrefixList">Route Source Prefix List</Label>
                      <Input
                        id="matchIpRouteSourcePrefixList"
                        placeholder="Prefix list name"
                        value={matchIpRouteSourcePrefixList}
                        onChange={(e) => setMatchIpRouteSourcePrefixList(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="matchInterface">Interface</Label>
                      <Input
                        id="matchInterface"
                        placeholder="e.g., eth0"
                        value={matchInterface}
                        onChange={(e) => setMatchInterface(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="matchProtocol">Protocol</Label>
                      <Select value={matchProtocol || "none"} onValueChange={(val) => setMatchProtocol(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select protocol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="babel">Babel</SelectItem>
                          <SelectItem value="bgp">BGP</SelectItem>
                          <SelectItem value="connected">Connected</SelectItem>
                          <SelectItem value="isis">IS-IS</SelectItem>
                          <SelectItem value="kernel">Kernel</SelectItem>
                          <SelectItem value="ospf">OSPF</SelectItem>
                          <SelectItem value="ospfv3">OSPFv3</SelectItem>
                          <SelectItem value="rip">RIP</SelectItem>
                          <SelectItem value="ripng">RIPng</SelectItem>
                          <SelectItem value="static">Static</SelectItem>
                          <SelectItem value="table">Table</SelectItem>
                          <SelectItem value="vnc">VNC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="matchSourceVrf">Source VRF</Label>
                      <Input
                        id="matchSourceVrf"
                        placeholder="VRF name"
                        value={matchSourceVrf}
                        onChange={(e) => setMatchSourceVrf(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="matchTag">Tag</Label>
                      <Input
                        id="matchTag"
                        type="number"
                        placeholder="1-4294967295"
                        value={matchTag}
                        onChange={(e) => setMatchTag(e.target.value)}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* Set Actions Tab */}
          <TabsContent value="set" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Define actions to apply to matching routes. Multiple actions can be combined.
            </p>

            <Accordion type="multiple" className="w-full">
              {/* BGP AS Path */}
              <AccordionItem value="aspath">
                <AccordionTrigger>BGP AS Path</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="setAsPathExclude">Exclude AS</Label>
                      <Input
                        id="setAsPathExclude"
                        placeholder="AS numbers to exclude"
                        value={setAsPathExclude}
                        onChange={(e) => setSetAsPathExclude(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setAsPathPrepend">Prepend AS</Label>
                      <Input
                        id="setAsPathPrepend"
                        placeholder="AS numbers to prepend"
                        value={setAsPathPrepend}
                        onChange={(e) => setSetAsPathPrepend(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setAsPathPrependLastAs">Prepend Last AS (count)</Label>
                      <Input
                        id="setAsPathPrependLastAs"
                        type="number"
                        placeholder="Number of times"
                        value={setAsPathPrependLastAs}
                        onChange={(e) => setSetAsPathPrependLastAs(e.target.value)}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* BGP Communities */}
              <AccordionItem value="communities">
                <AccordionTrigger>BGP Communities</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Standard Community</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="setCommunityValue">Community Value</Label>
                        <Input
                          id="setCommunityValue"
                          placeholder="e.g., 65000:100 or local-as"
                          value={setCommunityValue}
                          onChange={(e) => setSetCommunityValue(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="setCommunityAction">Action</Label>
                        <Select value={setCommunityAction || "unset"} onValueChange={(val) => setSetCommunityAction(val === "unset" ? "" : val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unset">None</SelectItem>
                            <SelectItem value="add">Add</SelectItem>
                            <SelectItem value="replace">Replace</SelectItem>
                            <SelectItem value="delete">Delete</SelectItem>
                            <SelectItem value="none">Remove All</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <h4 className="font-medium text-sm pt-4">Large Community</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="setLargeCommunityValue">Large Community Value</Label>
                        <Input
                          id="setLargeCommunityValue"
                          placeholder="e.g., 65000:1:100"
                          value={setLargeCommunityValue}
                          onChange={(e) => setSetLargeCommunityValue(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="setLargeCommunityAction">Action</Label>
                        <Select value={setLargeCommunityAction || "unset"} onValueChange={(val) => setSetLargeCommunityAction(val === "unset" ? "" : val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unset">None</SelectItem>
                            <SelectItem value="add">Add</SelectItem>
                            <SelectItem value="replace">Replace</SelectItem>
                            <SelectItem value="delete">Delete</SelectItem>
                            <SelectItem value="none">Remove All</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <h4 className="font-medium text-sm pt-4">Extended Community</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="setExtcommunityBandwidth">Bandwidth</Label>
                        <Input
                          id="setExtcommunityBandwidth"
                          placeholder="Bandwidth value"
                          value={setExtcommunityBandwidth}
                          onChange={(e) => setSetExtcommunityBandwidth(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="setExtcommunityRt">Route Target (RT)</Label>
                        <Input
                          id="setExtcommunityRt"
                          placeholder="e.g., 65000:100"
                          value={setExtcommunityRt}
                          onChange={(e) => setSetExtcommunityRt(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="setExtcommunitySoo">Site of Origin (SOO)</Label>
                        <Input
                          id="setExtcommunitySoo"
                          placeholder="e.g., 65000:1"
                          value={setExtcommunitySoo}
                          onChange={(e) => setSetExtcommunitySoo(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="setExtcommunityNone"
                          checked={setExtcommunityNone}
                          onCheckedChange={(checked) => setSetExtcommunityNone(checked as boolean)}
                        />
                        <Label htmlFor="setExtcommunityNone" className="text-sm font-normal">
                          Remove all extcommunities
                        </Label>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* BGP Attributes */}
              <AccordionItem value="bgp-attrs">
                <AccordionTrigger>BGP Attributes</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="setAtomicAggregate"
                        checked={setAtomicAggregate}
                        onCheckedChange={(checked) => setSetAtomicAggregate(checked as boolean)}
                      />
                      <Label htmlFor="setAtomicAggregate" className="text-sm font-normal">
                        Atomic Aggregate
                      </Label>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setLocalPref">Local Preference</Label>
                      <Input
                        id="setLocalPref"
                        type="number"
                        placeholder="0-4294967295"
                        value={setLocalPref}
                        onChange={(e) => setSetLocalPref(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setAggregatorAs">Aggregator AS</Label>
                      <Input
                        id="setAggregatorAs"
                        placeholder="AS number"
                        value={setAggregatorAs}
                        onChange={(e) => setSetAggregatorAs(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setAggregatorIp">Aggregator IP</Label>
                      <Input
                        id="setAggregatorIp"
                        placeholder="e.g., 192.168.1.1"
                        value={setAggregatorIp}
                        onChange={(e) => setSetAggregatorIp(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setOrigin">Origin</Label>
                      <Select value={setOrigin || "none"} onValueChange={(val) => setSetOrigin(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select origin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="egp">EGP</SelectItem>
                          <SelectItem value="igp">IGP</SelectItem>
                          <SelectItem value="incomplete">Incomplete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setOriginatorId">Originator ID</Label>
                      <Input
                        id="setOriginatorId"
                        placeholder="e.g., 192.168.1.1"
                        value={setOriginatorId}
                        onChange={(e) => setSetOriginatorId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setWeight">Weight</Label>
                      <Input
                        id="setWeight"
                        type="number"
                        placeholder="0-65535"
                        value={setWeight}
                        onChange={(e) => setSetWeight(e.target.value)}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Next-Hop */}
              <AccordionItem value="nexthop-set">
                <AccordionTrigger>Next-Hop</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">IPv4 Next-Hop</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="setIpNexthop">Address</Label>
                        <Input
                          id="setIpNexthop"
                          placeholder="e.g., 192.168.1.1"
                          value={setIpNexthop}
                          onChange={(e) => setSetIpNexthop(e.target.value)}
                          disabled={setIpNexthopPeerAddress || setIpNexthopUnchanged}
                          className={setIpNexthopPeerAddress || setIpNexthopUnchanged ? "bg-muted" : ""}
                        />
                        <p className="text-xs text-muted-foreground">
                          Only one option can be selected at a time
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="setIpNexthopPeerAddress"
                            checked={setIpNexthopPeerAddress}
                            onCheckedChange={(checked) => {
                              setSetIpNexthopPeerAddress(checked as boolean);
                              if (checked) {
                                setSetIpNexthopUnchanged(false);
                                setSetIpNexthop("");
                              }
                            }}
                          />
                          <Label htmlFor="setIpNexthopPeerAddress" className="text-sm font-normal">
                            Use peer address
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="setIpNexthopUnchanged"
                            checked={setIpNexthopUnchanged}
                            onCheckedChange={(checked) => {
                              setSetIpNexthopUnchanged(checked as boolean);
                              if (checked) {
                                setSetIpNexthopPeerAddress(false);
                                setSetIpNexthop("");
                              }
                            }}
                          />
                          <Label htmlFor="setIpNexthopUnchanged" className="text-sm font-normal">
                            Keep unchanged
                          </Label>
                        </div>
                      </div>
                    </div>

                    <h4 className="font-medium text-sm pt-4">IPv6 Next-Hop</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="setIpv6NexthopGlobal">Global Address</Label>
                        <Input
                          id="setIpv6NexthopGlobal"
                          placeholder="e.g., 2001:db8::1"
                          value={setIpv6NexthopGlobal}
                          onChange={(e) => setSetIpv6NexthopGlobal(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="setIpv6NexthopLocal">Link-Local Address</Label>
                        <Input
                          id="setIpv6NexthopLocal"
                          placeholder="e.g., fe80::1"
                          value={setIpv6NexthopLocal}
                          onChange={(e) => setSetIpv6NexthopLocal(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="setIpv6NexthopPeerAddress"
                          checked={setIpv6NexthopPeerAddress}
                          onCheckedChange={(checked) => setSetIpv6NexthopPeerAddress(checked as boolean)}
                        />
                        <Label htmlFor="setIpv6NexthopPeerAddress" className="text-sm font-normal">
                          Use peer address
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="setIpv6NexthopPreferGlobal"
                          checked={setIpv6NexthopPreferGlobal}
                          onCheckedChange={(checked) => setSetIpv6NexthopPreferGlobal(checked as boolean)}
                        />
                        <Label htmlFor="setIpv6NexthopPreferGlobal" className="text-sm font-normal">
                          Prefer global
                        </Label>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Route Properties */}
              <AccordionItem value="route-props">
                <AccordionTrigger>Route Properties</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="setDistance">Administrative Distance</Label>
                      <Input
                        id="setDistance"
                        type="number"
                        placeholder="1-255"
                        value={setDistance}
                        onChange={(e) => setSetDistance(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setMetric">Metric</Label>
                      <Input
                        id="setMetric"
                        placeholder="Value or +/-N"
                        value={setMetric}
                        onChange={(e) => setSetMetric(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use +N or -N for relative changes
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setMetricType">Metric Type (OSPF)</Label>
                      <Select value={setMetricType || "none"} onValueChange={(val) => setSetMetricType(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="type-1">Type 1</SelectItem>
                          <SelectItem value="type-2">Type 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setSrc">Source Address</Label>
                      <Input
                        id="setSrc"
                        placeholder="e.g., 192.168.1.1"
                        value={setSrc}
                        onChange={(e) => setSetSrc(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setTable">Routing Table</Label>
                      <Input
                        id="setTable"
                        type="number"
                        placeholder="Table number"
                        value={setTable}
                        onChange={(e) => setSetTable(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setTag">Tag</Label>
                      <Input
                        id="setTag"
                        type="number"
                        placeholder="1-4294967295"
                        value={setTag}
                        onChange={(e) => setSetTag(e.target.value)}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Advanced rule flow control options for calling other route-maps or jumping to different rules.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="call">Call Route-Map</Label>
                <Input
                  id="call"
                  placeholder="Route-map name to call"
                  value={call}
                  onChange={(e) => setCall(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Jump to another route-map on match
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="continueRule">Continue to Rule</Label>
                <Input
                  id="continueRule"
                  type="number"
                  placeholder="Rule number"
                  value={continueRule}
                  onChange={(e) => setContinueRule(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Continue processing at specified rule
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="onMatchGoto">On-Match Goto</Label>
                <Input
                  id="onMatchGoto"
                  type="number"
                  placeholder="Rule number"
                  value={onMatchGoto}
                  onChange={(e) => setOnMatchGoto(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Jump to rule number on match
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="onMatchNext"
                  checked={onMatchNext}
                  onCheckedChange={(checked) => setOnMatchNext(checked as boolean)}
                />
                <Label htmlFor="onMatchNext" className="text-sm font-normal">
                  On-Match Next (go to next sequence number)
                </Label>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

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
