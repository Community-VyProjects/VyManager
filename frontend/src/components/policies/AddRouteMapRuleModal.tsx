"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { routeMapService } from "@/lib/api/route-map";
import type { RouteMapRule, MatchConditions, SetActions } from "@/lib/api/route-map";
import { asPathListService } from "@/lib/api/as-path-list";
import { communityListService } from "@/lib/api/community-list";
import { extcommunityListService } from "@/lib/api/extcommunity-list";
import { largeCommunityListService } from "@/lib/api/large-community-list";
import { accessListService } from "@/lib/api/access-list";
import { prefixListService } from "@/lib/api/prefix-list";

interface AddRouteMapRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  routeMapName: string;
  existingRules: RouteMapRule[];
}

export function AddRouteMapRuleModal({
  open,
  onOpenChange,
  onSuccess,
  routeMapName,
  existingRules,
}: AddRouteMapRuleModalProps) {
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
  const [newCommunityDelete, setNewCommunityDelete] = useState("");
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
  const [newLargeCommunityDelete, setNewLargeCommunityDelete] = useState("");
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

  // Calculate next rule number when modal opens
  useEffect(() => {
    if (open) {
      calculateNextRuleNumber();
    }
  }, [open, existingRules]);

  const calculateNextRuleNumber = () => {
    if (existingRules.length === 0) {
      setRuleNumber(100);
    } else {
      const maxRuleNumber = Math.max(...existingRules.map((r) => r.rule_number));
      setRuleNumber(maxRuleNumber + 1);
    }
  };

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

  const handleAddCommunityDelete = () => {
    if (newCommunityDelete.trim()) {
      setCommunityDeleteValues([...communityDeleteValues, newCommunityDelete.trim()]);
      setNewCommunityDelete("");
    }
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

  const handleAddLargeCommunityDelete = () => {
    if (newLargeCommunityDelete.trim()) {
      setLargeCommunityDeleteValues([...largeCommunityDeleteValues, newLargeCommunityDelete.trim()]);
      setNewLargeCommunityDelete("");
    }
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

      const rule: any = {
        rule_number: ruleNumber,
        description: ruleDescription.trim() || null,
        action,
        call: call.trim() || null,
        continue_rule: continueRule.trim() ? parseInt(continueRule) : null,
        on_match_goto: onMatchGoto.trim() ? parseInt(onMatchGoto) : null,
        on_match_next: onMatchNext,
        match,
        set,
      };

      await routeMapService.addRule(routeMapName, rule);

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add rule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Rule to {routeMapName}</DialogTitle>
          <DialogDescription>
            Add a new rule with match conditions and set actions to this route-map
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
                  value={ruleNumber}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-calculated as next available number
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
                      <Select value={matchAsPath || "none"} onValueChange={(val) => setMatchAsPath(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select AS path list" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {asPathLists.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Select value={matchCommunityList || "none"} onValueChange={(val) => setMatchCommunityList(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select community list" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
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
                          Exact match
                        </Label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="matchExtcommunity">Extended Community</Label>
                      <Select value={matchExtcommunity || "none"} onValueChange={(val) => setMatchExtcommunity(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select extended community list" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {extcommunityLists.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="matchLargeCommunityList">Large Community List</Label>
                      <Select value={matchLargeCommunityList || "none"} onValueChange={(val) => setMatchLargeCommunityList(val === "none" ? "" : val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select large community list" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {largeCommunityLists.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        <Select value={matchIpNexthopAccessList || "none"} onValueChange={(val) => setMatchIpNexthopAccessList(val === "none" ? "" : val)}>
                          <SelectTrigger id="matchIpNexthopAccessList">
                            <SelectValue placeholder="Select access list" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {ipv4AccessLists.map((number) => (
                              <SelectItem key={number} value={number}>{number}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select value={matchIpNexthopPrefixList || "none"} onValueChange={(val) => setMatchIpNexthopPrefixList(val === "none" ? "" : val)}>
                          <SelectTrigger id="matchIpNexthopPrefixList">
                            <SelectValue placeholder="Select prefix list" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {ipv4PrefixLists.map((name) => (
                              <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <div className="flex items-center space-x-2 pt-7">
                          <Checkbox
                            id="matchIpNexthopType"
                            checked={matchIpNexthopType}
                            onCheckedChange={(checked) => setMatchIpNexthopType(checked as boolean)}
                          />
                          <Label htmlFor="matchIpNexthopType" className="cursor-pointer">
                            Blackhole Type
                          </Label>
                        </div>
                      </div>
                    </div>

                    <h4 className="font-medium text-sm pt-4">IPv6 Next-Hop</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="matchIpv6NexthopAccessList">Access List</Label>
                        <Select value={matchIpv6NexthopAccessList || "none"} onValueChange={(val) => setMatchIpv6NexthopAccessList(val === "none" ? "" : val)}>
                          <SelectTrigger id="matchIpv6NexthopAccessList">
                            <SelectValue placeholder="Select access list" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {ipv6AccessLists.map((number) => (
                              <SelectItem key={number} value={number}>{number}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpv6NexthopAddress">Address</Label>
                        <Input
                          id="matchIpv6NexthopAddress"
                          placeholder="e.g., 2001:db8::1"
                          value={matchIpv6NexthopAddress}
                          onChange={(e) => setMatchIpv6NexthopAddress(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpv6NexthopPrefixList">Prefix List</Label>
                        <Select value={matchIpv6NexthopPrefixList || "none"} onValueChange={(val) => setMatchIpv6NexthopPrefixList(val === "none" ? "" : val)}>
                          <SelectTrigger id="matchIpv6NexthopPrefixList">
                            <SelectValue placeholder="Select prefix list" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {ipv6PrefixLists.map((name) => (
                              <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchIpv6NexthopPrefixLen">Prefix Length</Label>
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
                            Blackhole Type
                          </Label>
                        </div>
                      </div>
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
                            Add Communities
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
                                placeholder="e.g., 65000:100 or local-as"
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCommunityAdd())}
                              />
                              <Button type="button" variant="outline" size="sm" onClick={handleAddCommunityAdd}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add
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
                            Delete Communities
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
                                  <SelectValue placeholder="Select community list to delete" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Select community list...</SelectItem>
                                  {communityLists.map((listName) => (
                                    <SelectItem key={listName} value={listName} disabled={communityDeleteValues.includes(listName)}>
                                      {listName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Select community list(s) to delete all matching communities
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
                            Replace All With
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
                                placeholder="e.g., 65000:300"
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCommunityReplace())}
                              />
                              <Button type="button" variant="outline" size="sm" onClick={handleAddCommunityReplace}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add
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
                          Remove All Communities
                        </Label>
                      </div>
                    </div>

                    <h4 className="font-medium text-sm pt-4">Large Community</h4>
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
                            Add Large Communities
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
                                placeholder="e.g., 65000:1:100"
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLargeCommunityAdd())}
                              />
                              <Button type="button" variant="outline" size="sm" onClick={handleAddLargeCommunityAdd}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add
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
                            Delete Large Communities
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
                                  <SelectValue placeholder="Select large community list to delete" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Select large community list...</SelectItem>
                                  {largeCommunityLists.map((listName) => (
                                    <SelectItem key={listName} value={listName} disabled={largeCommunityDeleteValues.includes(listName)}>
                                      {listName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Select large community list(s) to delete all matching communities
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
                            Replace All With
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
                                placeholder="e.g., 65000:3:300"
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLargeCommunityReplace())}
                              />
                              <Button type="button" variant="outline" size="sm" onClick={handleAddLargeCommunityReplace}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add
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
                          Remove All Large Communities
                        </Label>
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
            {loading ? "Adding..." : "Add Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
