"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { VrfSelect } from "@/components/ui/vrf-select";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RouteMapRule, MatchConditions, SetActions } from "@/lib/api/route-map";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  nextRuleNumber,
  submitRouteMapCreate,
  submitRouteMapUpdate,
  type RouteMapRuleDraft,
} from "./route-map-rule-form";
import { asPathListService } from "@/lib/api/as-path-list";
import { communityListService } from "@/lib/api/community-list";
import { extcommunityListService } from "@/lib/api/extcommunity-list";
import { largeCommunityListService } from "@/lib/api/large-community-list";
import { accessListService } from "@/lib/api/access-list";
import { prefixListService } from "@/lib/api/prefix-list";

interface RouteMapRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  routeMapName: string;
  existingRules: RouteMapRule[];
  existing?: RouteMapRule | null;
}

export function RouteMapRuleModal({
  open,
  onOpenChange,
  onSuccess,
  routeMapName,
  existingRules,
  existing,
}: RouteMapRuleModalProps) {
  const t = useTranslations("routeMapRuleModal");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-calculated rule number
  const [ruleNumber, setRuleNumber] = useState<number>(100);


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
  const [matchIpNexthopType, setMatchIpNexthopType] = useState(false);
  const [matchIpv6NexthopAccessList, setMatchIpv6NexthopAccessList] = useState("");
  const [matchIpv6NexthopAddress, setMatchIpv6NexthopAddress] = useState("");
  const [matchIpv6NexthopPrefixLen, setMatchIpv6NexthopPrefixLen] = useState("");
  const [matchIpv6NexthopPrefixList, setMatchIpv6NexthopPrefixList] = useState("");
  const [matchIpv6NexthopType, setMatchIpv6NexthopType] = useState(false);

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

  // Set Actions - Communities (restructured for multiple actions)
  // Community Add
  const [communityAddValues, setCommunityAddValues] = useState<string[]>([]);
  const [communityAddEnabled, setCommunityAddEnabled] = useState(false);
  const [newCommunityAdd, setNewCommunityAdd] = useState("");
  // Community Delete
  const [communityDeleteValues, setCommunityDeleteValues] = useState<string[]>([]);
  const [communityDeleteEnabled, setCommunityDeleteEnabled] = useState(false);
  const [, setNewCommunityDelete] = useState("");
  // Community Replace
  const [communityReplaceValues, setCommunityReplaceValues] = useState<string[]>([]);
  const [communityReplaceEnabled, setCommunityReplaceEnabled] = useState(false);
  const [newCommunityReplace, setNewCommunityReplace] = useState("");
  // Community Remove All
  const [communityRemoveAll, setCommunityRemoveAll] = useState(false);

  // Large Community Add
  const [largeCommunityAddValues, setLargeCommunityAddValues] = useState<string[]>([]);
  const [largeCommunityAddEnabled, setLargeCommunityAddEnabled] = useState(false);
  const [newLargeCommunityAdd, setNewLargeCommunityAdd] = useState("");
  // Large Community Delete
  const [largeCommunityDeleteValues, setLargeCommunityDeleteValues] = useState<string[]>([]);
  const [largeCommunityDeleteEnabled, setLargeCommunityDeleteEnabled] = useState(false);
  const [, setNewLargeCommunityDelete] = useState("");
  // Large Community Replace
  const [largeCommunityReplaceValues, setLargeCommunityReplaceValues] = useState<string[]>([]);
  const [largeCommunityReplaceEnabled, setLargeCommunityReplaceEnabled] = useState(false);
  const [newLargeCommunityReplace, setNewLargeCommunityReplace] = useState("");
  // Large Community Remove All
  const [largeCommunityRemoveAll, setLargeCommunityRemoveAll] = useState(false);
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

  // Dropdown options loaded from API
  const [asPathLists, setAsPathLists] = useState<string[]>([]);
  const [communityLists, setCommunityLists] = useState<string[]>([]);
  const [extcommunityLists, setExtcommunityLists] = useState<string[]>([]);
  const [largeCommunityLists, setLargeCommunityLists] = useState<string[]>([]);
  const [ipv4AccessLists, setIpv4AccessLists] = useState<string[]>([]);
  const [ipv6AccessLists, setIpv6AccessLists] = useState<string[]>([]);
  const [ipv4PrefixLists, setIpv4PrefixLists] = useState<string[]>([]);
  const [ipv6PrefixLists, setIpv6PrefixLists] = useState<string[]>([]);

  // Load dropdown options when modal opens
  useEffect(() => {
    if (open) {
      loadDropdownOptions();
    }
  }, [open]);

  const loadDropdownOptions = async () => {
    try {
      const [
        asPathConfig,
        communityConfig,
        extcommunityConfig,
        largeCommunityConfig,
        accessListConfig,
        prefixListConfig
      ] = await Promise.all([
        asPathListService.getConfig(),
        communityListService.getConfig(),
        extcommunityListService.getConfig(),
        largeCommunityListService.getConfig(),
        accessListService.getConfig(),
        prefixListService.getConfig(),
      ]);

      setAsPathLists(asPathConfig.as_path_lists.map(list => list.name));
      setCommunityLists(communityConfig.community_lists.map(list => list.name));
      setExtcommunityLists(extcommunityConfig.extcommunity_lists.map(list => list.name));
      setLargeCommunityLists(largeCommunityConfig.large_community_lists.map(list => list.name));
      setIpv4AccessLists(accessListConfig.ipv4_lists.map(list => list.number));
      setIpv6AccessLists(accessListConfig.ipv6_lists.map(list => list.number));
      setIpv4PrefixLists(prefixListConfig.ipv4_lists.map(list => list.name));
      setIpv6PrefixLists(prefixListConfig.ipv6_lists.map(list => list.name));
    } catch (err) {
      console.error("Failed to load dropdown options:", err);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (existing) {
      loadRuleData(existing);
    } else {
      resetForm();
      setRuleNumber(nextRuleNumber(existingRules));
    }
  }, [open, existing, existingRules]);

  // Community list names are already loaded in communityLists, largeCommunityLists, extcommunityLists
  // We'll use those directly for the delete dropdowns

  // Community Action Toggle Handlers with Mutual Exclusivity
  const handleCommunityActionToggle = (action: 'add' | 'delete' | 'replace' | 'removeAll') => {
    if (action === 'add') {
      const newState = !communityAddEnabled;
      setCommunityAddEnabled(newState);
      if (newState) {
        // Clear exclusive actions
        setCommunityReplaceEnabled(false);
        setCommunityReplaceValues([]);
        setCommunityRemoveAll(false);
      }
    } else if (action === 'delete') {
      const newState = !communityDeleteEnabled;
      setCommunityDeleteEnabled(newState);
      if (newState) {
        // Clear exclusive actions
        setCommunityReplaceEnabled(false);
        setCommunityReplaceValues([]);
        setCommunityRemoveAll(false);
      }
    } else if (action === 'replace') {
      const newState = !communityReplaceEnabled;
      setCommunityReplaceEnabled(newState);
      if (newState) {
        // Clear other actions
        setCommunityAddEnabled(false);
        setCommunityAddValues([]);
        setCommunityDeleteEnabled(false);
        setCommunityDeleteValues([]);
        setCommunityRemoveAll(false);
      }
    } else if (action === 'removeAll') {
      const newState = !communityRemoveAll;
      setCommunityRemoveAll(newState);
      if (newState) {
        // Clear all other actions
        setCommunityAddEnabled(false);
        setCommunityAddValues([]);
        setCommunityDeleteEnabled(false);
        setCommunityDeleteValues([]);
        setCommunityReplaceEnabled(false);
        setCommunityReplaceValues([]);
      }
    }
  };

  const handleLargeCommunityActionToggle = (action: 'add' | 'delete' | 'replace' | 'removeAll') => {
    if (action === 'add') {
      const newState = !largeCommunityAddEnabled;
      setLargeCommunityAddEnabled(newState);
      if (newState) {
        setLargeCommunityReplaceEnabled(false);
        setLargeCommunityReplaceValues([]);
        setLargeCommunityRemoveAll(false);
      }
    } else if (action === 'delete') {
      const newState = !largeCommunityDeleteEnabled;
      setLargeCommunityDeleteEnabled(newState);
      if (newState) {
        setLargeCommunityReplaceEnabled(false);
        setLargeCommunityReplaceValues([]);
        setLargeCommunityRemoveAll(false);
      }
    } else if (action === 'replace') {
      const newState = !largeCommunityReplaceEnabled;
      setLargeCommunityReplaceEnabled(newState);
      if (newState) {
        setLargeCommunityAddEnabled(false);
        setLargeCommunityAddValues([]);
        setLargeCommunityDeleteEnabled(false);
        setLargeCommunityDeleteValues([]);
        setLargeCommunityRemoveAll(false);
      }
    } else if (action === 'removeAll') {
      const newState = !largeCommunityRemoveAll;
      setLargeCommunityRemoveAll(newState);
      if (newState) {
        setLargeCommunityAddEnabled(false);
        setLargeCommunityAddValues([]);
        setLargeCommunityDeleteEnabled(false);
        setLargeCommunityDeleteValues([]);
        setLargeCommunityReplaceEnabled(false);
        setLargeCommunityReplaceValues([]);
      }
    }
  };

  // Community Add/Remove Handlers
  const handleAddCommunityAdd = () => {
    if (newCommunityAdd.trim()) {
      setCommunityAddValues([...communityAddValues, newCommunityAdd.trim()]);
      setNewCommunityAdd("");
    }
  };
  const handleRemoveCommunityAdd = (index: number) => {
    setCommunityAddValues(communityAddValues.filter((_, i) => i !== index));
  };

  const handleRemoveCommunityDelete = (index: number) => {
    setCommunityDeleteValues(communityDeleteValues.filter((_, i) => i !== index));
  };

  const handleAddCommunityReplace = () => {
    if (newCommunityReplace.trim()) {
      setCommunityReplaceValues([...communityReplaceValues, newCommunityReplace.trim()]);
      setNewCommunityReplace("");
    }
  };
  const handleRemoveCommunityReplace = (index: number) => {
    setCommunityReplaceValues(communityReplaceValues.filter((_, i) => i !== index));
  };

  // Large Community Add/Remove Handlers
  const handleAddLargeCommunityAdd = () => {
    if (newLargeCommunityAdd.trim()) {
      setLargeCommunityAddValues([...largeCommunityAddValues, newLargeCommunityAdd.trim()]);
      setNewLargeCommunityAdd("");
    }
  };
  const handleRemoveLargeCommunityAdd = (index: number) => {
    setLargeCommunityAddValues(largeCommunityAddValues.filter((_, i) => i !== index));
  };

  const handleRemoveLargeCommunityDelete = (index: number) => {
    setLargeCommunityDeleteValues(largeCommunityDeleteValues.filter((_, i) => i !== index));
  };

  const handleAddLargeCommunityReplace = () => {
    if (newLargeCommunityReplace.trim()) {
      setLargeCommunityReplaceValues([...largeCommunityReplaceValues, newLargeCommunityReplace.trim()]);
      setNewLargeCommunityReplace("");
    }
  };
  const handleRemoveLargeCommunityReplace = (index: number) => {
    setLargeCommunityReplaceValues(largeCommunityReplaceValues.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setRuleDescription("");
    setAction("permit");
    setCall("");
    setContinueRule("");
    setOnMatchGoto("");
    setOnMatchNext(false);

    // Reset all match conditions
    setMatchAsPath("");
    setMatchCommunityList("");
    setMatchCommunityExact(false);
    setMatchExtcommunity("");
    setMatchLargeCommunityList("");
    setMatchLocalPref("");
    setMatchMetric("");
    setMatchOrigin("");
    setMatchPeer("");
    setMatchRpki("");
    setMatchIpAddressAccessList("");
    setMatchIpAddressPrefixList("");
    setMatchIpAddressPrefixLen("");
    setMatchIpv6AddressAccessList("");
    setMatchIpv6AddressPrefixList("");
    setMatchIpv6AddressPrefixLen("");
    setMatchIpNexthopAccessList("");
    setMatchIpNexthopAddress("");
    setMatchIpNexthopPrefixLen("");
    setMatchIpNexthopPrefixList("");
    setMatchIpNexthopType(false);
    setMatchIpv6NexthopAccessList("");
    setMatchIpv6NexthopAddress("");
    setMatchIpv6NexthopPrefixLen("");
    setMatchIpv6NexthopPrefixList("");
    setMatchIpv6NexthopType(false);
    setMatchIpRouteSourceAccessList("");
    setMatchIpRouteSourcePrefixList("");
    setMatchInterface("");
    setMatchProtocol("");
    setMatchSourceVrf("");
    setMatchTag("");

    // Reset all set actions
    setSetAsPathExclude("");
    setSetAsPathPrepend("");
    setSetAsPathPrependLastAs("");
    // Reset community actions
    setCommunityAddValues([]);
    setCommunityAddEnabled(false);
    setNewCommunityAdd("");
    setCommunityDeleteValues([]);
    setCommunityDeleteEnabled(false);
    setNewCommunityDelete("");
    setCommunityReplaceValues([]);
    setCommunityReplaceEnabled(false);
    setNewCommunityReplace("");
    setCommunityRemoveAll(false);
    // Reset large community actions
    setLargeCommunityAddValues([]);
    setLargeCommunityAddEnabled(false);
    setNewLargeCommunityAdd("");
    setLargeCommunityDeleteValues([]);
    setLargeCommunityDeleteEnabled(false);
    setNewLargeCommunityDelete("");
    setLargeCommunityReplaceValues([]);
    setLargeCommunityReplaceEnabled(false);
    setNewLargeCommunityReplace("");
    setLargeCommunityRemoveAll(false);
    setSetExtcommunityBandwidth("");
    setSetExtcommunityRt("");
    setSetExtcommunitySoo("");
    setSetExtcommunityNone(false);
    setSetAtomicAggregate(false);
    setSetAggregatorAs("");
    setSetAggregatorIp("");
    setSetLocalPref("");
    setSetOrigin("");
    setSetOriginatorId("");
    setSetWeight("");
    setSetIpNexthop("");
    setSetIpNexthopPeerAddress(false);
    setSetIpNexthopUnchanged(false);
    setSetIpv6NexthopGlobal("");
    setSetIpv6NexthopLocal("");
    setSetIpv6NexthopPeerAddress(false);
    setSetIpv6NexthopPreferGlobal(false);
    setSetDistance("");
    setSetMetric("");
    setSetMetricType("");
    setSetSrc("");
    setSetTable("");
    setSetTag("");

    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

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
    setMatchIpNexthopType(match.ip_nexthop_type === "blackhole");
    setMatchIpv6NexthopAccessList(match.ipv6_nexthop_access_list || "");
    setMatchIpv6NexthopAddress(match.ipv6_nexthop_address || "");
    setMatchIpv6NexthopPrefixLen(match.ipv6_nexthop_prefix_len !== null ? String(match.ipv6_nexthop_prefix_len) : "");
    setMatchIpv6NexthopPrefixList(match.ipv6_nexthop_prefix_list || "");
    setMatchIpv6NexthopType(match.ipv6_nexthop_type === "blackhole");
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

    // Communities - parse separate fields
    if (set.community_add_values && set.community_add_values.length > 0) {
      setCommunityAddValues(set.community_add_values);
      setCommunityAddEnabled(true);
    } else {
      setCommunityAddValues([]);
      setCommunityAddEnabled(false);
    }
    if (set.community_delete_values && set.community_delete_values.length > 0) {
      setCommunityDeleteValues(set.community_delete_values);
      setCommunityDeleteEnabled(true);
    } else {
      setCommunityDeleteValues([]);
      setCommunityDeleteEnabled(false);
    }
    if (set.community_replace_values && set.community_replace_values.length > 0) {
      setCommunityReplaceValues(set.community_replace_values);
      setCommunityReplaceEnabled(true);
    } else {
      setCommunityReplaceValues([]);
      setCommunityReplaceEnabled(false);
    }
    setCommunityRemoveAll(set.community_remove_all || false);

    // Large Communities - parse separate fields
    if (set.large_community_add_values && set.large_community_add_values.length > 0) {
      setLargeCommunityAddValues(set.large_community_add_values);
      setLargeCommunityAddEnabled(true);
    } else {
      setLargeCommunityAddValues([]);
      setLargeCommunityAddEnabled(false);
    }
    if (set.large_community_delete_values && set.large_community_delete_values.length > 0) {
      setLargeCommunityDeleteValues(set.large_community_delete_values);
      setLargeCommunityDeleteEnabled(true);
    } else {
      setLargeCommunityDeleteValues([]);
      setLargeCommunityDeleteEnabled(false);
    }
    if (set.large_community_replace_values && set.large_community_replace_values.length > 0) {
      setLargeCommunityReplaceValues(set.large_community_replace_values);
      setLargeCommunityReplaceEnabled(true);
    } else {
      setLargeCommunityReplaceValues([]);
      setLargeCommunityReplaceEnabled(false);
    }
    setLargeCommunityRemoveAll(set.large_community_remove_all || false);

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




  const handleSubmit = async () => {
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
      if (matchIpNexthopType) match.ip_nexthop_type = "blackhole";
      if (matchIpv6NexthopAccessList.trim()) match.ipv6_nexthop_access_list = matchIpv6NexthopAccessList.trim();
      if (matchIpv6NexthopAddress.trim()) match.ipv6_nexthop_address = matchIpv6NexthopAddress.trim();
      if (matchIpv6NexthopPrefixLen.trim()) match.ipv6_nexthop_prefix_len = parseInt(matchIpv6NexthopPrefixLen);
      if (matchIpv6NexthopPrefixList.trim()) match.ipv6_nexthop_prefix_list = matchIpv6NexthopPrefixList.trim();
      if (matchIpv6NexthopType) match.ipv6_nexthop_type = "blackhole";
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
      // Handle communities - send all enabled actions in single payload
      if (communityAddEnabled && communityAddValues.length > 0) {
        set.community_add_values = communityAddValues;
      }
      if (communityDeleteEnabled && communityDeleteValues.length > 0) {
        set.community_delete_values = communityDeleteValues;
      }
      if (communityReplaceEnabled && communityReplaceValues.length > 0) {
        set.community_replace_values = communityReplaceValues;
      }
      if (communityRemoveAll) {
        set.community_remove_all = true;
      }

      // Handle large communities - send all enabled actions in single payload
      if (largeCommunityAddEnabled && largeCommunityAddValues.length > 0) {
        set.large_community_add_values = largeCommunityAddValues;
      }
      if (largeCommunityDeleteEnabled && largeCommunityDeleteValues.length > 0) {
        set.large_community_delete_values = largeCommunityDeleteValues;
      }
      if (largeCommunityReplaceEnabled && largeCommunityReplaceValues.length > 0) {
        set.large_community_replace_values = largeCommunityReplaceValues;
      }
      if (largeCommunityRemoveAll) {
        set.large_community_remove_all = true;
      }
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

      const draft: RouteMapRuleDraft = {
        ruleNumber,
        description: ruleDescription,
        action,
        call,
        continueRule,
        onMatchGoto,
        onMatchNext,
        match,
        set,
      };
      const write = modalWriteKind(existing ? { name: String(existing.rule_number) } : null);
      const result =
        write.kind === "update" && existing
          ? await submitRouteMapUpdate(routeMapName, existing, draft)
          : await submitRouteMapCreate(routeMapName, draft);
      if (result && result.success === false) {
        setError(result.error || tc("operationFailed"));
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("addFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("titleEdit", { number: lockedIdentity(existing, (r) => String(r.rule_number), String(ruleNumber)).value }) : t("titleAdd", { name: routeMapName })}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">{t("tabBasic")}</TabsTrigger>
            <TabsTrigger value="match">{t("tabMatch")}</TabsTrigger>
            <TabsTrigger value="set">{t("tabSet")}</TabsTrigger>
            <TabsTrigger value="advanced">{t("tabAdvanced")}</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ruleNumber">{t("ruleNumber")}</Label>
                <Input
                  id="ruleNumber"
                  type="number"
                  value={ruleNumber}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  {t("ruleNumberHint")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="action">{t("actionLabel")}</Label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permit">{t("permit")}</SelectItem>
                    <SelectItem value="deny">{t("deny")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t("actionHint")}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ruleDescription">{t("ruleDescription")}</Label>
              <Input
                id="ruleDescription"
                placeholder={t("ruleDescriptionPlaceholder")}
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
              />
            </div>
          </TabsContent>

          {/* Match Conditions Tab */}
          <TabsContent value="match" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("match.intro")}
            </p>

            <Accordion type="multiple" className="w-full">
              {/* BGP Attributes */}
              <AccordionItem value="bgp">
                <AccordionTrigger>{t("match.bgpAttributes")}</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="matchAsPath">{t("match.asPathList")}</Label>
                      <Select value={matchAsPath || "none"} onValueChange={(val) => setMatchAsPath(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("match.selectAsPathList")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{tc("none")}</SelectItem>
                          {asPathLists.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="matchOrigin">{t("match.origin")}</Label>
                      <Select value={matchOrigin || "none"} onValueChange={(val) => setMatchOrigin(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("match.selectOrigin")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{tc("none")}</SelectItem>
                          <SelectItem value="egp">EGP</SelectItem>
                          <SelectItem value="igp">IGP</SelectItem>
                          <SelectItem value="incomplete">{t("match.incomplete")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="matchCommunityList">{t("match.communityList")}</Label>
                      <Select value={matchCommunityList || "none"} onValueChange={(val) => setMatchCommunityList(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("match.selectCommunityList")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{tc("none")}</SelectItem>
                          {communityLists.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center space-x-2 mt-2">
                        <Checkbox
                          id="matchCommunityExact"
                          checked={matchCommunityExact}
                          onCheckedChange={(checked) => setMatchCommunityExact(checked as boolean)}
                        />
                        <Label htmlFor="matchCommunityExact" className="text-sm font-normal">
                          {t("match.exactMatch")}
                        </Label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="matchExtcommunity">{t("match.extendedCommunity")}</Label>
                      <Select value={matchExtcommunity || "none"} onValueChange={(val) => setMatchExtcommunity(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("match.selectExtcommunityList")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{tc("none")}</SelectItem>
                          {extcommunityLists.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="matchLargeCommunityList">{t("match.largeCommunityList")}</Label>
                      <Select value={matchLargeCommunityList || "none"} onValueChange={(val) => setMatchLargeCommunityList(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("match.selectLargeCommunityList")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{tc("none")}</SelectItem>
                          {largeCommunityLists.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="matchLocalPref">{t("match.localPreference")}</Label>
                      <Input
                        id="matchLocalPref"
                        type="number"
                        placeholder="0-4294967295"
                        value={matchLocalPref}
                        onChange={(e) => setMatchLocalPref(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="matchMetric">{t("match.metricMed")}</Label>
                      <Input
                        id="matchMetric"
                        type="number"
                        placeholder="0-4294967295"
                        value={matchMetric}
                        onChange={(e) => setMatchMetric(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="matchPeer">{t("match.peerAddress")}</Label>
                      <Input
                        id="matchPeer"
                        placeholder={t("example", { value: "192.168.1.1" })}
                        value={matchPeer}
                        onChange={(e) => setMatchPeer(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="matchRpki">{t("match.rpkiValidation")}</Label>
                      <Select value={matchRpki || "none"} onValueChange={(val) => setMatchRpki(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("match.selectRpkiState")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{tc("none")}</SelectItem>
                          <SelectItem value="valid">{t("match.rpkiValid")}</SelectItem>
                          <SelectItem value="invalid">{t("match.rpkiInvalid")}</SelectItem>
                          <SelectItem value="notfound">{t("match.rpkiNotFound")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* IP/IPv6 Address */}
              <AccordionItem value="address">
                <AccordionTrigger>{t("match.addressMatching")}</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">{t("match.ipv4Address")}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="matchIpAddressAccessList">{t("match.accessList")}</Label>
                        <Input
                          id="matchIpAddressAccessList"
                          placeholder={t("match.accessListPlaceholder")}
                          value={matchIpAddressAccessList}
                          onChange={(e) => setMatchIpAddressAccessList(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpAddressPrefixList">{t("match.prefixList")}</Label>
                        <Input
                          id="matchIpAddressPrefixList"
                          placeholder={t("match.prefixListPlaceholder")}
                          value={matchIpAddressPrefixList}
                          onChange={(e) => setMatchIpAddressPrefixList(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpAddressPrefixLen">{t("match.prefixLength")}</Label>
                        <Input
                          id="matchIpAddressPrefixLen"
                          type="number"
                          placeholder="0-32"
                          value={matchIpAddressPrefixLen}
                          onChange={(e) => setMatchIpAddressPrefixLen(e.target.value)}
                        />
                      </div>
                    </div>

                    <h4 className="font-medium text-sm pt-4">{t("match.ipv6Address")}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="matchIpv6AddressAccessList">{t("match.accessList")}</Label>
                        <Input
                          id="matchIpv6AddressAccessList"
                          placeholder={t("match.accessListPlaceholder")}
                          value={matchIpv6AddressAccessList}
                          onChange={(e) => setMatchIpv6AddressAccessList(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpv6AddressPrefixList">{t("match.prefixList")}</Label>
                        <Input
                          id="matchIpv6AddressPrefixList"
                          placeholder={t("match.prefixListPlaceholder")}
                          value={matchIpv6AddressPrefixList}
                          onChange={(e) => setMatchIpv6AddressPrefixList(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpv6AddressPrefixLen">{t("match.prefixLength")}</Label>
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
                <AccordionTrigger>{t("match.nexthopMatching")}</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">{t("match.ipv4Nexthop")}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="matchIpNexthopAccessList">{t("match.accessList")}</Label>
                        <Select value={matchIpNexthopAccessList || "none"} onValueChange={(val) => setMatchIpNexthopAccessList(val === "none" ? "" : val)}>
                          <SelectTrigger id="matchIpNexthopAccessList">
                            <SelectValue placeholder={t("match.selectAccessList")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{tc("none")}</SelectItem>
                            {ipv4AccessLists.map((number) => (
                              <SelectItem key={number} value={number}>{number}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpNexthopAddress">{t("match.address")}</Label>
                        <Input
                          id="matchIpNexthopAddress"
                          placeholder={t("example", { value: "192.168.1.1" })}
                          value={matchIpNexthopAddress}
                          onChange={(e) => setMatchIpNexthopAddress(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpNexthopPrefixList">{t("match.prefixList")}</Label>
                        <Select value={matchIpNexthopPrefixList || "none"} onValueChange={(val) => setMatchIpNexthopPrefixList(val === "none" ? "" : val)}>
                          <SelectTrigger id="matchIpNexthopPrefixList">
                            <SelectValue placeholder={t("match.selectPrefixList")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{tc("none")}</SelectItem>
                            {ipv4PrefixLists.map((name) => (
                              <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpNexthopPrefixLen">{t("match.prefixLength")}</Label>
                        <Input
                          id="matchIpNexthopPrefixLen"
                          type="number"
                          placeholder="0-32"
                          value={matchIpNexthopPrefixLen}
                          onChange={(e) => setMatchIpNexthopPrefixLen(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 pt-7">
                          <Checkbox
                            id="matchIpNexthopType"
                            checked={matchIpNexthopType}
                            onCheckedChange={(checked) => setMatchIpNexthopType(checked as boolean)}
                          />
                          <Label htmlFor="matchIpNexthopType" className="cursor-pointer">
                            {t("match.blackholeType")}
                          </Label>
                        </div>
                      </div>
                    </div>

                    <h4 className="font-medium text-sm pt-4">{t("match.ipv6Nexthop")}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="matchIpv6NexthopAccessList">{t("match.accessList")}</Label>
                        <Select value={matchIpv6NexthopAccessList || "none"} onValueChange={(val) => setMatchIpv6NexthopAccessList(val === "none" ? "" : val)}>
                          <SelectTrigger id="matchIpv6NexthopAccessList">
                            <SelectValue placeholder={t("match.selectAccessList")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{tc("none")}</SelectItem>
                            {ipv6AccessLists.map((number) => (
                              <SelectItem key={number} value={number}>{number}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpv6NexthopAddress">{t("match.address")}</Label>
                        <Input
                          id="matchIpv6NexthopAddress"
                          placeholder={t("example", { value: "2001:db8::1" })}
                          value={matchIpv6NexthopAddress}
                          onChange={(e) => setMatchIpv6NexthopAddress(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpv6NexthopPrefixList">{t("match.prefixList")}</Label>
                        <Select value={matchIpv6NexthopPrefixList || "none"} onValueChange={(val) => setMatchIpv6NexthopPrefixList(val === "none" ? "" : val)}>
                          <SelectTrigger id="matchIpv6NexthopPrefixList">
                            <SelectValue placeholder={t("match.selectPrefixList")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{tc("none")}</SelectItem>
                            {ipv6PrefixLists.map((name) => (
                              <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpv6NexthopPrefixLen">{t("match.prefixLength")}</Label>
                        <Input
                          id="matchIpv6NexthopPrefixLen"
                          type="number"
                          placeholder="0-128"
                          value={matchIpv6NexthopPrefixLen}
                          onChange={(e) => setMatchIpv6NexthopPrefixLen(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 pt-7">
                          <Checkbox
                            id="matchIpv6NexthopType"
                            checked={matchIpv6NexthopType}
                            onCheckedChange={(checked) => setMatchIpv6NexthopType(checked as boolean)}
                          />
                          <Label htmlFor="matchIpv6NexthopType" className="cursor-pointer">
                            {t("match.blackholeType")}
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Other Conditions */}
              <AccordionItem value="other">
                <AccordionTrigger>{t("match.otherConditions")}</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="matchIpRouteSourceAccessList">{t("match.routeSourceAccessList")}</Label>
                      <Input
                        id="matchIpRouteSourceAccessList"
                        placeholder={t("match.accessListPlaceholder")}
                        value={matchIpRouteSourceAccessList}
                        onChange={(e) => setMatchIpRouteSourceAccessList(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="matchIpRouteSourcePrefixList">{t("match.routeSourcePrefixList")}</Label>
                      <Input
                        id="matchIpRouteSourcePrefixList"
                        placeholder={t("match.prefixListPlaceholder")}
                        value={matchIpRouteSourcePrefixList}
                        onChange={(e) => setMatchIpRouteSourcePrefixList(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="matchInterface">{t("match.interface")}</Label>
                      <InterfaceSelect
                        id="matchInterface"
                        value={matchInterface || "__none__"}
                        onValueChange={(v) => setMatchInterface(v === "__none__" ? "" : v)}
                        noneOption={{ label: tc("none"), value: "__none__" }}
                        placeholder={t("match.selectInterface")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="matchProtocol">{t("match.protocol")}</Label>
                      <Select value={matchProtocol || "none"} onValueChange={(val) => setMatchProtocol(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("match.selectProtocol")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{tc("none")}</SelectItem>
                          <SelectItem value="babel">Babel</SelectItem>
                          <SelectItem value="bgp">BGP</SelectItem>
                          <SelectItem value="connected">{t("match.protocolConnected")}</SelectItem>
                          <SelectItem value="isis">IS-IS</SelectItem>
                          <SelectItem value="kernel">{t("match.protocolKernel")}</SelectItem>
                          <SelectItem value="ospf">OSPF</SelectItem>
                          <SelectItem value="ospfv3">OSPFv3</SelectItem>
                          <SelectItem value="rip">RIP</SelectItem>
                          <SelectItem value="ripng">RIPng</SelectItem>
                          <SelectItem value="static">{t("match.protocolStatic")}</SelectItem>
                          <SelectItem value="table">{t("match.protocolTable")}</SelectItem>
                          <SelectItem value="vnc">VNC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="matchSourceVrf">{t("match.sourceVrf")}</Label>
                      <VrfSelect
                        id="matchSourceVrf"
                        value={matchSourceVrf}
                        onValueChange={setMatchSourceVrf}
                        extraOptions={[{ label: tc("default"), value: "default" }]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="matchTag">{t("match.tag")}</Label>
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
              {t("set.intro")}
            </p>

            <Accordion type="multiple" className="w-full">
              {/* BGP AS Path */}
              <AccordionItem value="aspath">
                <AccordionTrigger>{t("set.bgpAsPath")}</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="setAsPathExclude">{t("set.excludeAs")}</Label>
                      <Input
                        id="setAsPathExclude"
                        placeholder={t("set.excludeAsPlaceholder")}
                        value={setAsPathExclude}
                        onChange={(e) => setSetAsPathExclude(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setAsPathPrepend">{t("set.prependAs")}</Label>
                      <Input
                        id="setAsPathPrepend"
                        placeholder={t("set.prependAsPlaceholder")}
                        value={setAsPathPrepend}
                        onChange={(e) => setSetAsPathPrepend(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setAsPathPrependLastAs">{t("set.prependLastAs")}</Label>
                      <Input
                        id="setAsPathPrependLastAs"
                        type="number"
                        placeholder={t("set.numberOfTimes")}
                        value={setAsPathPrependLastAs}
                        onChange={(e) => setSetAsPathPrependLastAs(e.target.value)}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* BGP Communities */}
              <AccordionItem value="communities">
                <AccordionTrigger>{t("set.bgpCommunities")}</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">{t("set.standardCommunity")}</h4>
                    <div className="space-y-4 border border-border rounded-lg p-4">
                      {/* Add Communities */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="communityAdd"
                            checked={communityAddEnabled}
                            onCheckedChange={() => handleCommunityActionToggle('add')}
                            disabled={loading || communityReplaceEnabled || communityRemoveAll}
                          />
                          <Label htmlFor="communityAdd" className="font-medium cursor-pointer">
                            {t("set.addCommunities")}
                          </Label>
                        </div>
                        {communityAddEnabled && (
                          <div className="ml-6 space-y-2">
                            {communityAddValues.map((community, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono">{community}</Badge>
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveCommunityAdd(index)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <div className="flex gap-2">
                              <Input
                                value={newCommunityAdd}
                                onChange={(e) => setNewCommunityAdd(e.target.value)}
                                placeholder={t("set.communityValuePlaceholder")}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCommunityAdd())}
                              />
                              <Button type="button" variant="outline" size="sm" onClick={handleAddCommunityAdd}>
                                <Plus className="h-4 w-4 mr-1" />
                                {tc("add")}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Delete Communities */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="communityDelete"
                            checked={communityDeleteEnabled}
                            onCheckedChange={() => handleCommunityActionToggle('delete')}
                            disabled={loading || communityReplaceEnabled || communityRemoveAll}
                          />
                          <Label htmlFor="communityDelete" className="font-medium cursor-pointer">
                            {t("set.deleteCommunities")}
                          </Label>
                        </div>
                        {communityDeleteEnabled && (
                          <div className="ml-6 space-y-2">
                            {communityDeleteValues.map((community, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono">{community}</Badge>
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveCommunityDelete(index)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <div className="space-y-2">
                              <Select
                                value="none"
                                onValueChange={(value) => {
                                  if (value !== "none" && !communityDeleteValues.includes(value)) {
                                    setCommunityDeleteValues([...communityDeleteValues, value]);
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("set.selectCommunityListToDelete")} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">{t("set.selectCommunityListEllipsis")}</SelectItem>
                                  {communityLists.map((listName) => (
                                    <SelectItem key={listName} value={listName} disabled={communityDeleteValues.includes(listName)}>
                                      {listName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                {t("set.deleteCommunitiesHint")}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Replace All With */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="communityReplace"
                            checked={communityReplaceEnabled}
                            onCheckedChange={() => handleCommunityActionToggle('replace')}
                            disabled={loading || communityAddEnabled || communityDeleteEnabled || communityRemoveAll}
                          />
                          <Label htmlFor="communityReplace" className="font-medium cursor-pointer">
                            {t("set.replaceAllWith")}
                          </Label>
                        </div>
                        {communityReplaceEnabled && (
                          <div className="ml-6 space-y-2">
                            {communityReplaceValues.map((community, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono">{community}</Badge>
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveCommunityReplace(index)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <div className="flex gap-2">
                              <Input
                                value={newCommunityReplace}
                                onChange={(e) => setNewCommunityReplace(e.target.value)}
                                placeholder={t("example", { value: "65000:300" })}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCommunityReplace())}
                              />
                              <Button type="button" variant="outline" size="sm" onClick={handleAddCommunityReplace}>
                                <Plus className="h-4 w-4 mr-1" />
                                {tc("add")}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Remove All */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="communityRemoveAll"
                          checked={communityRemoveAll}
                          onCheckedChange={() => handleCommunityActionToggle('removeAll')}
                          disabled={loading || communityAddEnabled || communityDeleteEnabled || communityReplaceEnabled}
                        />
                        <Label htmlFor="communityRemoveAll" className="font-medium cursor-pointer">
                          {t("set.removeAllCommunities")}
                        </Label>
                      </div>
                    </div>

                    <h4 className="font-medium text-sm pt-4">{t("set.largeCommunity")}</h4>
                    <div className="space-y-4 border border-border rounded-lg p-4">
                      {/* Add Large Communities */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="largeCommunityAdd"
                            checked={largeCommunityAddEnabled}
                            onCheckedChange={() => handleLargeCommunityActionToggle('add')}
                            disabled={loading || largeCommunityReplaceEnabled || largeCommunityRemoveAll}
                          />
                          <Label htmlFor="largeCommunityAdd" className="font-medium cursor-pointer">
                            {t("set.addLargeCommunities")}
                          </Label>
                        </div>
                        {largeCommunityAddEnabled && (
                          <div className="ml-6 space-y-2">
                            {largeCommunityAddValues.map((community, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono">{community}</Badge>
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveLargeCommunityAdd(index)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <div className="flex gap-2">
                              <Input
                                value={newLargeCommunityAdd}
                                onChange={(e) => setNewLargeCommunityAdd(e.target.value)}
                                placeholder={t("example", { value: "65000:1:100" })}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLargeCommunityAdd())}
                              />
                              <Button type="button" variant="outline" size="sm" onClick={handleAddLargeCommunityAdd}>
                                <Plus className="h-4 w-4 mr-1" />
                                {tc("add")}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Delete Large Communities */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="largeCommunityDelete"
                            checked={largeCommunityDeleteEnabled}
                            onCheckedChange={() => handleLargeCommunityActionToggle('delete')}
                            disabled={loading || largeCommunityReplaceEnabled || largeCommunityRemoveAll}
                          />
                          <Label htmlFor="largeCommunityDelete" className="font-medium cursor-pointer">
                            {t("set.deleteLargeCommunities")}
                          </Label>
                        </div>
                        {largeCommunityDeleteEnabled && (
                          <div className="ml-6 space-y-2">
                            {largeCommunityDeleteValues.map((community, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono">{community}</Badge>
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveLargeCommunityDelete(index)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <div className="space-y-2">
                              <Select
                                value="none"
                                onValueChange={(value) => {
                                  if (value !== "none" && !largeCommunityDeleteValues.includes(value)) {
                                    setLargeCommunityDeleteValues([...largeCommunityDeleteValues, value]);
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("set.selectLargeCommunityListToDelete")} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">{t("set.selectLargeCommunityListEllipsis")}</SelectItem>
                                  {largeCommunityLists.map((listName) => (
                                    <SelectItem key={listName} value={listName} disabled={largeCommunityDeleteValues.includes(listName)}>
                                      {listName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                {t("set.deleteLargeCommunitiesHint")}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Replace All Large Communities With */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="largeCommunityReplace"
                            checked={largeCommunityReplaceEnabled}
                            onCheckedChange={() => handleLargeCommunityActionToggle('replace')}
                            disabled={loading || largeCommunityAddEnabled || largeCommunityDeleteEnabled || largeCommunityRemoveAll}
                          />
                          <Label htmlFor="largeCommunityReplace" className="font-medium cursor-pointer">
                            {t("set.replaceAllWith")}
                          </Label>
                        </div>
                        {largeCommunityReplaceEnabled && (
                          <div className="ml-6 space-y-2">
                            {largeCommunityReplaceValues.map((community, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono">{community}</Badge>
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveLargeCommunityReplace(index)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <div className="flex gap-2">
                              <Input
                                value={newLargeCommunityReplace}
                                onChange={(e) => setNewLargeCommunityReplace(e.target.value)}
                                placeholder={t("example", { value: "65000:3:300" })}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLargeCommunityReplace())}
                              />
                              <Button type="button" variant="outline" size="sm" onClick={handleAddLargeCommunityReplace}>
                                <Plus className="h-4 w-4 mr-1" />
                                {tc("add")}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Remove All Large Communities */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="largeCommunityRemoveAll"
                          checked={largeCommunityRemoveAll}
                          onCheckedChange={() => handleLargeCommunityActionToggle('removeAll')}
                          disabled={loading || largeCommunityAddEnabled || largeCommunityDeleteEnabled || largeCommunityReplaceEnabled}
                        />
                        <Label htmlFor="largeCommunityRemoveAll" className="font-medium cursor-pointer">
                          {t("set.removeAllLargeCommunities")}
                        </Label>
                      </div>
                    </div>

                    <h4 className="font-medium text-sm pt-4">{t("set.extendedCommunity")}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="setExtcommunityBandwidth">{t("set.bandwidth")}</Label>
                        <Input
                          id="setExtcommunityBandwidth"
                          placeholder={t("set.bandwidthPlaceholder")}
                          value={setExtcommunityBandwidth}
                          onChange={(e) => setSetExtcommunityBandwidth(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="setExtcommunityRt">{t("set.routeTarget")}</Label>
                        <Input
                          id="setExtcommunityRt"
                          placeholder={t("example", { value: "65000:100" })}
                          value={setExtcommunityRt}
                          onChange={(e) => setSetExtcommunityRt(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="setExtcommunitySoo">{t("set.siteOfOrigin")}</Label>
                        <Input
                          id="setExtcommunitySoo"
                          placeholder={t("example", { value: "65000:1" })}
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
                          {t("set.removeAllExtcommunities")}
                        </Label>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* BGP Attributes */}
              <AccordionItem value="bgp-attrs">
                <AccordionTrigger>{t("set.bgpAttributes")}</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="setAtomicAggregate"
                        checked={setAtomicAggregate}
                        onCheckedChange={(checked) => setSetAtomicAggregate(checked as boolean)}
                      />
                      <Label htmlFor="setAtomicAggregate" className="text-sm font-normal">
                        {t("set.atomicAggregate")}
                      </Label>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setLocalPref">{t("set.localPreference")}</Label>
                      <Input
                        id="setLocalPref"
                        type="number"
                        placeholder="0-4294967295"
                        value={setLocalPref}
                        onChange={(e) => setSetLocalPref(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setAggregatorAs">{t("set.aggregatorAs")}</Label>
                      <Input
                        id="setAggregatorAs"
                        placeholder={t("set.asNumber")}
                        value={setAggregatorAs}
                        onChange={(e) => setSetAggregatorAs(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setAggregatorIp">{t("set.aggregatorIp")}</Label>
                      <Input
                        id="setAggregatorIp"
                        placeholder={t("example", { value: "192.168.1.1" })}
                        value={setAggregatorIp}
                        onChange={(e) => setSetAggregatorIp(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setOrigin">{t("set.origin")}</Label>
                      <Select value={setOrigin || "none"} onValueChange={(val) => setSetOrigin(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("set.selectOrigin")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{tc("none")}</SelectItem>
                          <SelectItem value="egp">EGP</SelectItem>
                          <SelectItem value="igp">IGP</SelectItem>
                          <SelectItem value="incomplete">{t("set.incomplete")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setOriginatorId">{t("set.originatorId")}</Label>
                      <Input
                        id="setOriginatorId"
                        placeholder={t("example", { value: "192.168.1.1" })}
                        value={setOriginatorId}
                        onChange={(e) => setSetOriginatorId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setWeight">{t("set.weight")}</Label>
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
                <AccordionTrigger>{t("set.nexthop")}</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">{t("set.ipv4Nexthop")}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="setIpNexthop">{t("set.address")}</Label>
                        <Input
                          id="setIpNexthop"
                          placeholder={t("example", { value: "192.168.1.1" })}
                          value={setIpNexthop}
                          onChange={(e) => setSetIpNexthop(e.target.value)}
                          disabled={setIpNexthopPeerAddress || setIpNexthopUnchanged}
                          className={setIpNexthopPeerAddress || setIpNexthopUnchanged ? "bg-muted" : ""}
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("set.oneOptionHint")}
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
                            {t("set.usePeerAddress")}
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
                            {t("set.keepUnchanged")}
                          </Label>
                        </div>
                      </div>
                    </div>

                    <h4 className="font-medium text-sm pt-4">{t("set.ipv6Nexthop")}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="setIpv6NexthopGlobal">{t("set.globalAddress")}</Label>
                        <Input
                          id="setIpv6NexthopGlobal"
                          placeholder={t("example", { value: "2001:db8::1" })}
                          value={setIpv6NexthopGlobal}
                          onChange={(e) => setSetIpv6NexthopGlobal(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="setIpv6NexthopLocal">{t("set.linkLocalAddress")}</Label>
                        <Input
                          id="setIpv6NexthopLocal"
                          placeholder={t("example", { value: "fe80::1" })}
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
                          {t("set.usePeerAddress")}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="setIpv6NexthopPreferGlobal"
                          checked={setIpv6NexthopPreferGlobal}
                          onCheckedChange={(checked) => setSetIpv6NexthopPreferGlobal(checked as boolean)}
                        />
                        <Label htmlFor="setIpv6NexthopPreferGlobal" className="text-sm font-normal">
                          {t("set.preferGlobal")}
                        </Label>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Route Properties */}
              <AccordionItem value="route-props">
                <AccordionTrigger>{t("set.routeProperties")}</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="setDistance">{t("set.adminDistance")}</Label>
                      <Input
                        id="setDistance"
                        type="number"
                        placeholder="1-255"
                        value={setDistance}
                        onChange={(e) => setSetDistance(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setMetric">{t("set.metric")}</Label>
                      <Input
                        id="setMetric"
                        placeholder={t("set.metricPlaceholder")}
                        value={setMetric}
                        onChange={(e) => setSetMetric(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("set.metricHint")}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setMetricType">{t("set.metricTypeOspf")}</Label>
                      <Select value={setMetricType || "none"} onValueChange={(val) => setSetMetricType(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("set.selectType")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{tc("none")}</SelectItem>
                          <SelectItem value="type-1">{t("set.type1")}</SelectItem>
                          <SelectItem value="type-2">{t("set.type2")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setSrc">{t("set.sourceAddress")}</Label>
                      <Input
                        id="setSrc"
                        placeholder={t("example", { value: "192.168.1.1" })}
                        value={setSrc}
                        onChange={(e) => setSetSrc(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setTable">{t("set.routingTable")}</Label>
                      <Input
                        id="setTable"
                        type="number"
                        placeholder={t("set.tableNumber")}
                        value={setTable}
                        onChange={(e) => setSetTable(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setTag">{t("set.tag")}</Label>
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
              {t("advanced.intro")}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="call">{t("advanced.callRouteMap")}</Label>
                <Input
                  id="call"
                  placeholder={t("advanced.callPlaceholder")}
                  value={call}
                  onChange={(e) => setCall(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("advanced.callHint")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="continueRule">{t("advanced.continueToRule")}</Label>
                <Input
                  id="continueRule"
                  type="number"
                  placeholder={t("advanced.ruleNumberPlaceholder")}
                  value={continueRule}
                  onChange={(e) => setContinueRule(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("advanced.continueHint")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="onMatchGoto">{t("advanced.onMatchGoto")}</Label>
                <Input
                  id="onMatchGoto"
                  type="number"
                  placeholder={t("advanced.ruleNumberPlaceholder")}
                  value={onMatchGoto}
                  onChange={(e) => setOnMatchGoto(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("advanced.onMatchGotoHint")}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="onMatchNext"
                  checked={onMatchNext}
                  onCheckedChange={(checked) => setOnMatchNext(checked as boolean)}
                />
                <Label htmlFor="onMatchNext" className="text-sm font-normal">
                  {t("advanced.onMatchNext")}
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
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (isEdit ? tc("saving") : t("adding")) : isEdit ? t("saveChanges") : t("addRule")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
