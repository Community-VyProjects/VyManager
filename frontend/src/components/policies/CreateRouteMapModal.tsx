"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { VrfSelect } from "@/components/ui/vrf-select";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle } from "lucide-react";
import { routeMapService } from "@/lib/api/route-map";
import type { MatchConditions, SetActions } from "@/lib/api/route-map";

interface CreateRouteMapModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function CreateRouteMapModal({ open, onOpenChange, onSuccess }: CreateRouteMapModalProps) {
    const t = useTranslations("routeMap");
    const tc = useTranslations("common");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Basic fields
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [ruleNumber, setRuleNumber] = useState("100");
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
    const [matchLargeCommunityExact, setMatchLargeCommunityExact] = useState(false);
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

    const resetForm = () => {
        setName("");
        setDescription("");
        setRuleNumber("10");
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
        setMatchLargeCommunityExact(false);
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
        setMatchIpNexthopType("");
        setMatchIpv6NexthopAddress("");
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
        setSetCommunityValue("");
        setSetCommunityAction("");
        setSetLargeCommunityValue("");
        setSetLargeCommunityAction("");
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
        if (!name.trim()) {
            setError(t("create.nameRequired"));
            return;
        }

        if (!ruleNumber.trim()) {
            setError(t("create.ruleNumberRequired"));
            return;
        }

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
            match.large_community_exact_match = matchLargeCommunityExact;
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
            // Communities: map single-value UI inputs to proper array fields depending on action
            if (setCommunityValue.trim()) {
                const v = setCommunityValue.trim();
                if (setCommunityAction === "add") {
                    set.community_add_values = [v];
                } else if (setCommunityAction === "delete") {
                    set.community_delete_values = [v];
                } else if (setCommunityAction === "replace") {
                    set.community_replace_values = [v];
                } else if (setCommunityAction === "none") {
                    set.community_remove_all = true;
                }
            }

            // Large communities
            if (setLargeCommunityValue.trim()) {
                const v = setLargeCommunityValue.trim();
                if (setLargeCommunityAction === "add") {
                    set.large_community_add_values = [v];
                } else if (setLargeCommunityAction === "delete") {
                    set.large_community_delete_values = [v];
                } else if (setLargeCommunityAction === "replace") {
                    set.large_community_replace_values = [v];
                } else if (setLargeCommunityAction === "none") {
                    set.large_community_remove_all = true;
                }
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

            const rule: Record<string, unknown> = {
                rule_number: parseInt(ruleNumber),
                description: ruleDescription.trim() || null,
                action,
                call: call.trim() || null,
                continue_rule: continueRule.trim() ? parseInt(continueRule) : null,
                on_match_goto: onMatchGoto.trim() ? parseInt(onMatchGoto) : null,
                on_match_next: onMatchNext,
                match,
                set,
            };

            await routeMapService.createRouteMap(name.trim(), description.trim() || null, rule);

            handleClose();
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : t("create.createFailed"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
        <DialogTitle>{t("create.title")}</DialogTitle>
        <DialogDescription>
        {t("create.description")}
        </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="basic">{t("create.tabBasic")}</TabsTrigger>
        <TabsTrigger value="match">{t("create.tabMatch")}</TabsTrigger>
        <TabsTrigger value="set">{t("create.tabSet")}</TabsTrigger>
        <TabsTrigger value="advanced">{t("create.tabAdvanced")}</TabsTrigger>
        </TabsList>

        {/* Basic Tab */}
        <TabsContent value="basic" className="space-y-4">
        <div className="space-y-2">
        <Label htmlFor="name">{t("create.nameLabel")}</Label>
        <Input
        id="name"
        placeholder={t("example", { value: "MY-ROUTE-MAP" })}
        value={name}
        onChange={(e) => setName(e.target.value)}
        />
        </div>

        <div className="space-y-2">
        <Label htmlFor="description">{tc("description")}</Label>
        <Textarea
        id="description"
        placeholder={t("create.descriptionPlaceholder")}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        />
        </div>

        <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
        <Label htmlFor="ruleNumber">{t("create.ruleNumberLabel")}</Label>
        <Input
        id="ruleNumber"
        type="number"
        value={ruleNumber}
        disabled
        className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
        {t("create.ruleNumberHint")}
        </p>
        </div>

        <div className="space-y-2">
        <Label htmlFor="action">{t("create.actionLabel")}</Label>
        <Select value={action} onValueChange={setAction}>
        <SelectTrigger>
        <SelectValue />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="permit">{t("create.permit")}</SelectItem>
        <SelectItem value="deny">{t("create.deny")}</SelectItem>
        </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
        {t("create.actionHint")}
        </p>
        </div>
        </div>

        <div className="space-y-2">
        <Label htmlFor="ruleDescription">{t("create.ruleDescriptionLabel")}</Label>
        <Input
        id="ruleDescription"
        placeholder={t("create.ruleDescriptionPlaceholder")}
        value={ruleDescription}
        onChange={(e) => setRuleDescription(e.target.value)}
        />
        </div>
        </TabsContent>

        {/* Match Conditions Tab */}
        <TabsContent value="match" className="space-y-4">
        <p className="text-sm text-muted-foreground">
        {t("create.matchIntro")}
        </p>

        <Accordion type="multiple" className="w-full">
        {/* BGP Attributes */}
        <AccordionItem value="bgp">
        <AccordionTrigger>{t("create.bgpAttributes")}</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
        <Label htmlFor="matchAsPath">{t("create.asPathList")}</Label>
        <Input
        id="matchAsPath"
        placeholder={t("create.asPathListPlaceholder")}
        value={matchAsPath}
        onChange={(e) => setMatchAsPath(e.target.value)}
        />
        </div>

        <div className="space-y-2">
        <Label htmlFor="matchOrigin">{t("create.origin")}</Label>
        <Select value={matchOrigin || "none"} onValueChange={(v) => setMatchOrigin(v === "none" ? "" : v)}>
        <SelectTrigger>
        <SelectValue placeholder={t("create.selectOrigin")} />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="none">{tc("none")}</SelectItem>
        <SelectItem value="egp">EGP</SelectItem>
        <SelectItem value="igp">IGP</SelectItem>
        <SelectItem value="incomplete">{t("create.incomplete")}</SelectItem>
        </SelectContent>
        </Select>
        </div>

        <div className="space-y-2">
        <Label htmlFor="matchCommunityList">{t("create.communityList")}</Label>
        <Input
        id="matchCommunityList"
        placeholder={t("create.communityListPlaceholder")}
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
        {t("create.exactMatch")}
        </Label>
        </div>
        </div>

        <div className="space-y-2">
        <Label htmlFor="matchExtcommunity">{t("create.extendedCommunity")}</Label>
        <Input
        id="matchExtcommunity"
        placeholder={t("create.extcommunityListPlaceholder")}
        value={matchExtcommunity}
        onChange={(e) => setMatchExtcommunity(e.target.value)}
        />
        </div>

        <div className="space-y-2">
        <Label htmlFor="matchLargeCommunityList">{t("create.largeCommunityList")}</Label>
        <Input
        id="matchLargeCommunityList"
        placeholder={t("create.largeCommunityListPlaceholder")}
        value={matchLargeCommunityList}
        onChange={(e) => setMatchLargeCommunityList(e.target.value)}
        />
        <div className="flex items-center space-x-2 mt-2">
        <Checkbox
        id="matchLargeCommunityExact"
        checked={matchLargeCommunityExact}
        onCheckedChange={(checked) => setMatchLargeCommunityExact(checked as boolean)}
        />
        <Label htmlFor="matchLargeCommunityExact" className="text-sm font-normal">
        {t("create.exactMatch")}
        </Label>
        </div>
        </div>

        <div className="space-y-2">
        <Label htmlFor="matchLocalPref">{t("create.localPreference")}</Label>
        <Input
        id="matchLocalPref"
        type="number"
        placeholder="0-4294967295"
        value={matchLocalPref}
        onChange={(e) => setMatchLocalPref(e.target.value)}
        />
        </div>

        <div className="space-y-2">
        <Label htmlFor="matchMetric">{t("create.metricMed")}</Label>
        <Input
        id="matchMetric"
        type="number"
        placeholder="0-4294967295"
        value={matchMetric}
        onChange={(e) => setMatchMetric(e.target.value)}
        />
        </div>

        <div className="space-y-2">
        <Label htmlFor="matchPeer">{t("create.peerAddress")}</Label>
        <Input
        id="matchPeer"
        placeholder={t("example", { value: "192.168.1.1" })}
        value={matchPeer}
        onChange={(e) => setMatchPeer(e.target.value)}
        />
        </div>

        <div className="space-y-2">
        <Label htmlFor="matchRpki">{t("create.rpkiValidation")}</Label>
        <Select value={matchRpki || "none"} onValueChange={(v) => setMatchRpki(v === "none" ? "" : v)}>
        <SelectTrigger>
        <SelectValue placeholder={t("create.selectRpkiState")} />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="none">{tc("none")}</SelectItem>
        <SelectItem value="valid">{t("create.rpkiValid")}</SelectItem>
        <SelectItem value="invalid">{t("create.rpkiInvalid")}</SelectItem>
        <SelectItem value="notfound">{t("create.rpkiNotFound")}</SelectItem>
        </SelectContent>
        </Select>
        </div>
        </div>
        </AccordionContent>
        </AccordionItem>

        {/* IP/IPv6 Address */}
        <AccordionItem value="address">
        <AccordionTrigger>{t("create.addressMatching")}</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
        <div className="space-y-4">
        <h4 className="font-medium text-sm">{t("create.ipv4Address")}</h4>
        <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
        <Label htmlFor="matchIpAddressAccessList">{t("create.accessList")}</Label>
        <Input
        id="matchIpAddressAccessList"
        placeholder={t("create.accessListPlaceholder")}
        value={matchIpAddressAccessList}
        onChange={(e) => setMatchIpAddressAccessList(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="matchIpAddressPrefixList">{t("create.prefixList")}</Label>
        <Input
        id="matchIpAddressPrefixList"
        placeholder={t("create.prefixListPlaceholder")}
        value={matchIpAddressPrefixList}
        onChange={(e) => setMatchIpAddressPrefixList(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="matchIpAddressPrefixLen">{t("create.prefixLength")}</Label>
        <Input
        id="matchIpAddressPrefixLen"
        type="number"
        placeholder="0-32"
        value={matchIpAddressPrefixLen}
        onChange={(e) => setMatchIpAddressPrefixLen(e.target.value)}
        />
        </div>
        </div>

        <h4 className="font-medium text-sm pt-4">{t("create.ipv6Address")}</h4>
        <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
        <Label htmlFor="matchIpv6AddressAccessList">{t("create.accessList")}</Label>
        <Input
        id="matchIpv6AddressAccessList"
        placeholder={t("create.accessListPlaceholder")}
        value={matchIpv6AddressAccessList}
        onChange={(e) => setMatchIpv6AddressAccessList(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="matchIpv6AddressPrefixList">{t("create.prefixList")}</Label>
        <Input
        id="matchIpv6AddressPrefixList"
        placeholder={t("create.prefixListPlaceholder")}
        value={matchIpv6AddressPrefixList}
        onChange={(e) => setMatchIpv6AddressPrefixList(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="matchIpv6AddressPrefixLen">{t("create.prefixLength")}</Label>
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
        <AccordionTrigger>{t("create.nexthopMatching")}</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
        <div className="space-y-4">
        <h4 className="font-medium text-sm">{t("create.ipv4Nexthop")}</h4>
        <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
        <Label htmlFor="matchIpNexthopAccessList">{t("create.accessList")}</Label>
        <Input
        id="matchIpNexthopAccessList"
        placeholder={t("create.accessListPlaceholder")}
        value={matchIpNexthopAccessList}
        onChange={(e) => setMatchIpNexthopAccessList(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="matchIpNexthopAddress">{t("create.address")}</Label>
        <Input
        id="matchIpNexthopAddress"
        placeholder={t("example", { value: "192.168.1.1" })}
        value={matchIpNexthopAddress}
        onChange={(e) => setMatchIpNexthopAddress(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="matchIpNexthopPrefixList">{t("create.prefixList")}</Label>
        <Input
        id="matchIpNexthopPrefixList"
        placeholder={t("create.prefixListPlaceholder")}
        value={matchIpNexthopPrefixList}
        onChange={(e) => setMatchIpNexthopPrefixList(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="matchIpNexthopPrefixLen">{t("create.prefixLength")}</Label>
        <Input
        id="matchIpNexthopPrefixLen"
        type="number"
        placeholder="0-32"
        value={matchIpNexthopPrefixLen}
        onChange={(e) => setMatchIpNexthopPrefixLen(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="matchIpNexthopType">{t("create.type")}</Label>
        <Input
        id="matchIpNexthopType"
        placeholder={t("example", { value: "blackhole" })}
        value={matchIpNexthopType}
        onChange={(e) => setMatchIpNexthopType(e.target.value)}
        />
        </div>
        </div>

        <h4 className="font-medium text-sm pt-4">{t("create.ipv6Nexthop")}</h4>
        <div className="space-y-2">
        <Label htmlFor="matchIpv6NexthopAddress">{t("create.address")}</Label>
        <Input
        id="matchIpv6NexthopAddress"
        placeholder={t("example", { value: "2001:db8::1" })}
        value={matchIpv6NexthopAddress}
        onChange={(e) => setMatchIpv6NexthopAddress(e.target.value)}
        />
        </div>
        </div>
        </AccordionContent>
        </AccordionItem>

        {/* Other Conditions */}
        <AccordionItem value="other">
        <AccordionTrigger>{t("create.otherConditions")}</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
        <Label htmlFor="matchIpRouteSourceAccessList">{t("create.routeSourceAccessList")}</Label>
        <Input
        id="matchIpRouteSourceAccessList"
        placeholder={t("create.accessListPlaceholder")}
        value={matchIpRouteSourceAccessList}
        onChange={(e) => setMatchIpRouteSourceAccessList(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="matchIpRouteSourcePrefixList">{t("create.routeSourcePrefixList")}</Label>
        <Input
        id="matchIpRouteSourcePrefixList"
        placeholder={t("create.prefixListPlaceholder")}
        value={matchIpRouteSourcePrefixList}
        onChange={(e) => setMatchIpRouteSourcePrefixList(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="matchInterface">{t("create.interface")}</Label>
        <InterfaceSelect
        id="matchInterface"
        value={matchInterface || "__none__"}
        onValueChange={(v) => setMatchInterface(v === "__none__" ? "" : v)}
        noneOption={{ label: tc("none"), value: "__none__" }}
        placeholder={t("create.selectInterface")}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="matchProtocol">{t("create.protocol")}</Label>
        <Select value={matchProtocol || "none"} onValueChange={(v) => setMatchProtocol(v === "none" ? "" : v)}>
        <SelectTrigger>
        <SelectValue placeholder={t("create.selectProtocol")} />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="none">{tc("none")}</SelectItem>
        <SelectItem value="babel">Babel</SelectItem>
        <SelectItem value="bgp">BGP</SelectItem>
        <SelectItem value="connected">{t("create.protocolConnected")}</SelectItem>
        <SelectItem value="isis">IS-IS</SelectItem>
        <SelectItem value="kernel">{t("create.protocolKernel")}</SelectItem>
        <SelectItem value="ospf">OSPF</SelectItem>
        <SelectItem value="ospfv3">OSPFv3</SelectItem>
        <SelectItem value="rip">RIP</SelectItem>
        <SelectItem value="ripng">RIPng</SelectItem>
        <SelectItem value="static">{t("create.protocolStatic")}</SelectItem>
        <SelectItem value="table">{t("create.protocolTable")}</SelectItem>
        <SelectItem value="vnc">VNC</SelectItem>
        </SelectContent>
        </Select>
        </div>
        <div className="space-y-2">
        <Label htmlFor="matchSourceVrf">{t("create.sourceVrf")}</Label>
        <VrfSelect
          id="matchSourceVrf"
          value={matchSourceVrf}
          onValueChange={setMatchSourceVrf}
          extraOptions={[{ label: tc("default"), value: "default" }]}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="matchTag">{t("create.tag")}</Label>
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
        {t("create.setIntro")}
        </p>

        <Accordion type="multiple" className="w-full">
        {/* BGP AS Path */}
        <AccordionItem value="aspath">
        <AccordionTrigger>{t("create.bgpAsPath")}</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
        <Label htmlFor="setAsPathExclude">{t("create.excludeAs")}</Label>
        <Input
        id="setAsPathExclude"
        placeholder={t("create.excludeAsPlaceholder")}
        value={setAsPathExclude}
        onChange={(e) => setSetAsPathExclude(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="setAsPathPrepend">{t("create.prependAs")}</Label>
        <Input
        id="setAsPathPrepend"
        placeholder={t("create.prependAsPlaceholder")}
        value={setAsPathPrepend}
        onChange={(e) => setSetAsPathPrepend(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="setAsPathPrependLastAs">{t("create.prependLastAs")}</Label>
        <Input
        id="setAsPathPrependLastAs"
        type="number"
        placeholder={t("create.numberOfTimes")}
        value={setAsPathPrependLastAs}
        onChange={(e) => setSetAsPathPrependLastAs(e.target.value)}
        />
        </div>
        </div>
        </AccordionContent>
        </AccordionItem>

        {/* BGP Communities */}
        <AccordionItem value="communities">
        <AccordionTrigger>{t("create.bgpCommunities")}</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
        <div className="space-y-4">
        <h4 className="font-medium text-sm">{t("create.standardCommunity")}</h4>
        <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
        <Label htmlFor="setCommunityValue">{t("create.communityValue")}</Label>
        <Input
        id="setCommunityValue"
        placeholder={t("create.communityValuePlaceholder")}
        value={setCommunityValue}
        onChange={(e) => setSetCommunityValue(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="setCommunityAction">{t("create.action")}</Label>
        <Select value={setCommunityAction || "__unset__"} onValueChange={(v) => setSetCommunityAction(v === "__unset__" ? "" : v)}>
        <SelectTrigger>
        <SelectValue placeholder={t("create.selectAction")} />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="__unset__">{tc("none")}</SelectItem>
        <SelectItem value="add">{tc("add")}</SelectItem>
        <SelectItem value="replace">{t("create.replace")}</SelectItem>
        <SelectItem value="delete">{tc("delete")}</SelectItem>
        <SelectItem value="none">{t("create.removeAll")}</SelectItem>
        </SelectContent>
        </Select>
        </div>
        </div>

        <h4 className="font-medium text-sm pt-4">{t("create.largeCommunity")}</h4>
        <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
        <Label htmlFor="setLargeCommunityValue">{t("create.largeCommunityValue")}</Label>
        <Input
        id="setLargeCommunityValue"
        placeholder={t("example", { value: "65000:1:100" })}
        value={setLargeCommunityValue}
        onChange={(e) => setSetLargeCommunityValue(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="setLargeCommunityAction">{t("create.action")}</Label>
        <Select value={setLargeCommunityAction || "__unset__"} onValueChange={(v) => setSetLargeCommunityAction(v === "__unset__" ? "" : v)}>
        <SelectTrigger>
        <SelectValue placeholder={t("create.selectAction")} />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="__unset__">{tc("none")}</SelectItem>
        <SelectItem value="add">{tc("add")}</SelectItem>
        <SelectItem value="replace">{t("create.replace")}</SelectItem>
        <SelectItem value="delete">{tc("delete")}</SelectItem>
        <SelectItem value="none">{t("create.removeAll")}</SelectItem>
        </SelectContent>
        </Select>
        </div>
        </div>

        <h4 className="font-medium text-sm pt-4">{t("create.extendedCommunity")}</h4>
        <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
        <Label htmlFor="setExtcommunityBandwidth">{t("create.bandwidth")}</Label>
        <Input
        id="setExtcommunityBandwidth"
        placeholder={t("create.bandwidthPlaceholder")}
        value={setExtcommunityBandwidth}
        onChange={(e) => setSetExtcommunityBandwidth(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="setExtcommunityRt">{t("create.routeTarget")}</Label>
        <Input
        id="setExtcommunityRt"
        placeholder={t("example", { value: "65000:100" })}
        value={setExtcommunityRt}
        onChange={(e) => setSetExtcommunityRt(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="setExtcommunitySoo">{t("create.siteOfOrigin")}</Label>
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
        {t("create.removeAllExtcommunities")}
        </Label>
        </div>
        </div>
        </div>
        </AccordionContent>
        </AccordionItem>

        {/* BGP Attributes */}
        <AccordionItem value="bgp-attrs">
        <AccordionTrigger>{t("create.bgpAttributes")}</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
        <Checkbox
        id="setAtomicAggregate"
        checked={setAtomicAggregate}
        onCheckedChange={(checked) => setSetAtomicAggregate(checked as boolean)}
        />
        <Label htmlFor="setAtomicAggregate" className="text-sm font-normal">
        {t("create.atomicAggregate")}
        </Label>
        </div>
        <div className="space-y-2">
        <Label htmlFor="setLocalPref">{t("create.localPreference")}</Label>
        <Input
        id="setLocalPref"
        type="number"
        placeholder="0-4294967295"
        value={setLocalPref}
        onChange={(e) => setSetLocalPref(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="setAggregatorAs">{t("create.aggregatorAs")}</Label>
        <Input
        id="setAggregatorAs"
        placeholder={t("create.asNumber")}
        value={setAggregatorAs}
        onChange={(e) => setSetAggregatorAs(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="setAggregatorIp">{t("create.aggregatorIp")}</Label>
        <Input
        id="setAggregatorIp"
        placeholder={t("example", { value: "192.168.1.1" })}
        value={setAggregatorIp}
        onChange={(e) => setSetAggregatorIp(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="setOrigin">{t("create.origin")}</Label>
        <Select value={setOrigin || "none"} onValueChange={(v) => setSetOrigin(v === "none" ? "" : v)}>
        <SelectTrigger>
        <SelectValue placeholder={t("create.selectOrigin")} />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="none">{tc("none")}</SelectItem>
        <SelectItem value="egp">EGP</SelectItem>
        <SelectItem value="igp">IGP</SelectItem>
        <SelectItem value="incomplete">{t("create.incomplete")}</SelectItem>
        </SelectContent>
        </Select>
        </div>
        <div className="space-y-2">
        <Label htmlFor="setOriginatorId">{t("create.originatorId")}</Label>
        <Input
        id="setOriginatorId"
        placeholder={t("example", { value: "192.168.1.1" })}
        value={setOriginatorId}
        onChange={(e) => setSetOriginatorId(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="setWeight">{t("create.weight")}</Label>
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
        <AccordionTrigger>{t("create.nexthop")}</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
        <div className="space-y-4">
        <h4 className="font-medium text-sm">{t("create.ipv4Nexthop")}</h4>
        <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
        <Label htmlFor="setIpNexthop">{t("create.address")}</Label>
        <Input
        id="setIpNexthop"
        placeholder={t("example", { value: "192.168.1.1" })}
        value={setIpNexthop}
        onChange={(e) => setSetIpNexthop(e.target.value)}
        disabled={setIpNexthopPeerAddress || setIpNexthopUnchanged}
        className={setIpNexthopPeerAddress || setIpNexthopUnchanged ? "bg-muted" : ""}
        />
        <p className="text-xs text-muted-foreground">
        {t("create.oneOptionHint")}
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
        {t("create.usePeerAddress")}
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
        {t("create.keepUnchanged")}
        </Label>
        </div>
        </div>
        </div>

        <h4 className="font-medium text-sm pt-4">{t("create.ipv6Nexthop")}</h4>
        <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
        <Label htmlFor="setIpv6NexthopGlobal">{t("create.globalAddress")}</Label>
        <Input
        id="setIpv6NexthopGlobal"
        placeholder={t("example", { value: "2001:db8::1" })}
        value={setIpv6NexthopGlobal}
        onChange={(e) => setSetIpv6NexthopGlobal(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="setIpv6NexthopLocal">{t("create.linkLocalAddress")}</Label>
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
        {t("create.usePeerAddress")}
        </Label>
        </div>
        <div className="flex items-center space-x-2">
        <Checkbox
        id="setIpv6NexthopPreferGlobal"
        checked={setIpv6NexthopPreferGlobal}
        onCheckedChange={(checked) => setSetIpv6NexthopPreferGlobal(checked as boolean)}
        />
        <Label htmlFor="setIpv6NexthopPreferGlobal" className="text-sm font-normal">
        {t("create.preferGlobal")}
        </Label>
        </div>
        </div>
        </div>
        </AccordionContent>
        </AccordionItem>

        {/* Route Properties */}
        <AccordionItem value="route-props">
        <AccordionTrigger>{t("create.routeProperties")}</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
        <Label htmlFor="setDistance">{t("create.adminDistance")}</Label>
        <Input
        id="setDistance"
        type="number"
        placeholder="1-255"
        value={setDistance}
        onChange={(e) => setSetDistance(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="setMetric">{t("create.metric")}</Label>
        <Input
        id="setMetric"
        placeholder={t("create.metricPlaceholder")}
        value={setMetric}
        onChange={(e) => setSetMetric(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
        {t("create.metricHint")}
        </p>
        </div>
        <div className="space-y-2">
        <Label htmlFor="setMetricType">{t("create.metricTypeOspf")}</Label>
        <Select value={setMetricType || "none"} onValueChange={(v) => setSetMetricType(v === "none" ? "" : v)}>
        <SelectTrigger>
        <SelectValue placeholder={t("create.selectType")} />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="none">{tc("none")}</SelectItem>
        <SelectItem value="type-1">{t("create.type1")}</SelectItem>
        <SelectItem value="type-2">{t("create.type2")}</SelectItem>
        </SelectContent>
        </Select>
        </div>
        <div className="space-y-2">
        <Label htmlFor="setSrc">{t("create.sourceAddress")}</Label>
        <Input
        id="setSrc"
        placeholder={t("example", { value: "192.168.1.1" })}
        value={setSrc}
        onChange={(e) => setSetSrc(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="setTable">{t("create.routingTable")}</Label>
        <Input
        id="setTable"
        type="number"
        placeholder={t("create.tableNumber")}
        value={setTable}
        onChange={(e) => setSetTable(e.target.value)}
        />
        </div>
        <div className="space-y-2">
        <Label htmlFor="setTag">{t("create.tag")}</Label>
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
        {t("create.advancedIntro")}
        </p>

        <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
        <Label htmlFor="call">{t("create.callRouteMap")}</Label>
        <Input
        id="call"
        placeholder={t("create.callPlaceholder")}
        value={call}
        onChange={(e) => setCall(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
        {t("create.callHint")}
        </p>
        </div>

        <div className="space-y-2">
        <Label htmlFor="continueRule">{t("create.continueToRule")}</Label>
        <Input
        id="continueRule"
        type="number"
        placeholder={t("create.ruleNumberPlaceholder")}
        value={continueRule}
        onChange={(e) => setContinueRule(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
        {t("create.continueHint")}
        </p>
        </div>

        <div className="space-y-2">
        <Label htmlFor="onMatchGoto">{t("create.onMatchGoto")}</Label>
        <Input
        id="onMatchGoto"
        type="number"
        placeholder={t("create.ruleNumberPlaceholder")}
        value={onMatchGoto}
        onChange={(e) => setOnMatchGoto(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
        {t("create.onMatchGotoHint")}
        </p>
        </div>

        <div className="flex items-center space-x-2">
        <Checkbox
        id="onMatchNext"
        checked={onMatchNext}
        onCheckedChange={(checked) => setOnMatchNext(checked as boolean)}
        />
        <Label htmlFor="onMatchNext" className="text-sm font-normal">
        {t("create.onMatchNext")}
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
        {loading ? t("create.creating") : t("create.submit")}
        </Button>
        </DialogFooter>
        </DialogContent>
        </Dialog>
    );
}
