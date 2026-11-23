"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { thrownMessage } from "@/lib/api-error";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { NONE_SENTINEL } from "@/lib/named-list-select-options";
import {
  BFD_HOLD_TIME_RANGE,
  EBGP_MULTIHOP_RANGE,
  firstRangeProblem,
  labeledUnicastConflict,
  PEER_GROUP_RANGES,
  peerProblem,
  remoteAsNumber,
  TTL_SECURITY_RANGE,
  type PeerGroupMember,
  type PeerGroupRangeField,
} from "@/lib/api/bgp-ranges";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import type {
  BgpPeerGroup,
  BgpCapabilities,
  BgpNeighborAddressFamilyConfig,
} from "@/lib/api/bgp";

interface BgpPeerGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (peerGroup: BgpPeerGroup) => Promise<void>;
  existingPeerGroup?: BgpPeerGroup | null;
  configuredNames: string[];
  systemAs: string | null;
  /** Configured neighbors of each peer group, by peer-group name. */
  peerGroupMembers: Record<string, PeerGroupMember[]>;
  capabilities?: BgpCapabilities | null;
  routeMapNames: string[];
  bfdProfileNames: string[];
}

/** Label of each range-checked field, for the range error. */
const RANGE_LABEL_KEYS = {
  ebgpMultihop: "form.ebgpMultihop",
  ttlSecurityHops: "form.ttlSecurityHops",
  bfdHoldTime: "form.bfdStrictHoldTime",
  localAs: "form.localAs",
  remoteAs: "form.remoteAs",
} as const satisfies Record<PeerGroupRangeField, string>;

interface AddressFamilyFormState {
  route_map_import: string;
  route_map_export: string;
  soft_reconfiguration_inbound: boolean;
  nexthop_self: boolean;
  route_reflector_client: boolean;
}

const defaultAfState = (): AddressFamilyFormState => ({
  route_map_import: "",
  route_map_export: "",
  soft_reconfiguration_inbound: false,
  nexthop_self: false,
  route_reflector_client: false,
});

const emptyAfConfig = (): BgpNeighborAddressFamilyConfig => ({
  route_map_export: null,
  route_map_import: null,
  prefix_list_export: null,
  prefix_list_import: null,
  filter_list_export: null,
  filter_list_import: null,
  distribute_list_export: null,
  distribute_list_import: null,
  soft_reconfiguration_inbound: false,
  route_reflector_client: false,
  route_server_client: false,
  nexthop_self: false,
  nexthop_self_force: false,
  addpath_tx_all: false,
  addpath_tx_per_as: false,
  allowas_in_number: null,
  as_override: false,
  attribute_unchanged_as_path: false,
  attribute_unchanged_med: false,
  attribute_unchanged_next_hop: false,
  default_originate: false,
  default_originate_route_map: null,
  maximum_prefix: null,
  maximum_prefix_out: null,
  remove_private_as: false,
  remove_private_as_all: false,
  disable_send_community_extended: false,
  disable_send_community_standard: false,
  weight: null,
  unsuppress_map: null,
});

export function BgpPeerGroupModal({
  open,
  onOpenChange,
  onSubmit,
  existingPeerGroup,
  configuredNames,
  systemAs,
  peerGroupMembers,
  capabilities,
  routeMapNames,
  bfdProfileNames,
}: BgpPeerGroupModalProps) {
  const t = useTranslations("bgp");
  const tc = useTranslations("common");
  const isEditMode = !!existingPeerGroup;

  // --- Basic fields ---
  const [name, setName] = useState("");
  const [remoteAs, setRemoteAs] = useState("");
  const [description, setDescription] = useState("");
  const [updateSource, setUpdateSource] = useState("");

  // --- Status & Options ---
  const [shutdown, setShutdown] = useState(false);
  const [passive, setPassive] = useState(false);
  const [solo, setSolo] = useState(false);
  const [linkState, setLinkState] = useState(false);
  const [overrideCapability, setOverrideCapability] = useState(false);
  const [disableCapabilityNegotiation, setDisableCapabilityNegotiation] =
    useState(false);
  const [disableConnectedCheck, setDisableConnectedCheck] = useState(false);

  // --- BFD ---
  const [bfdEnabled, setBfdEnabled] = useState(false);
  const [bfdCheckControlPlaneFailure, setBfdCheckControlPlaneFailure] =
    useState(false);
  const [bfdProfile, setBfdProfile] = useState("");
  const [bfdStrict, setBfdStrict] = useState(false);
  const [bfdStrictHoldTime, setBfdStrictHoldTime] = useState("");

  // --- Capability ---
  const [capDynamic, setCapDynamic] = useState(false);
  const [capExtendedNexthop, setCapExtendedNexthop] = useState(false);
  const [capSoftwareVersion, setCapSoftwareVersion] = useState(false);

  // --- Advanced ---
  const [ebgpMultihop, setEbgpMultihop] = useState("");
  const [ttlSecurityHops, setTtlSecurityHops] = useState("");
  const [password, setPassword] = useState("");
  const [gracefulRestart, setGracefulRestart] = useState("");
  const [localAsAsn, setLocalAsAsn] = useState("");
  const [localAsNoPrependReplaceAs, setLocalAsNoPrependReplaceAs] =
    useState(false);
  const [localRole, setLocalRole] = useState("");
  const [localRoleStrict, setLocalRoleStrict] = useState(false);

  // --- Address Families ---
  const [enabledAFs, setEnabledAFs] = useState<Set<string>>(new Set());
  const [afConfigs, setAfConfigs] = useState<
    Record<string, AddressFamilyFormState>
  >({});

  // --- UI state ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableAFs =
    capabilities?.address_family_types?.peer_group ?? [];

  // Populate form when editing or when modal opens
  useEffect(() => {
    if (open) {
      if (existingPeerGroup) {
        setName(existingPeerGroup.name);
        setRemoteAs(existingPeerGroup.remote_as || "");
        setDescription(existingPeerGroup.description || "");
        setUpdateSource(existingPeerGroup.update_source || "");
        setShutdown(existingPeerGroup.shutdown);
        setPassive(existingPeerGroup.passive);
        setSolo(existingPeerGroup.solo);
        setLinkState(existingPeerGroup.link_state);
        setOverrideCapability(existingPeerGroup.override_capability);
        setDisableCapabilityNegotiation(
          existingPeerGroup.disable_capability_negotiation
        );
        setDisableConnectedCheck(existingPeerGroup.disable_connected_check);
        setBfdEnabled(existingPeerGroup.bfd.enabled);
        setBfdCheckControlPlaneFailure(
          existingPeerGroup.bfd.check_control_plane_failure
        );
        setBfdProfile(existingPeerGroup.bfd.profile || "");
        setBfdStrict(existingPeerGroup.bfd.strict);
        setBfdStrictHoldTime(
          existingPeerGroup.bfd.strict_hold_time != null
            ? String(existingPeerGroup.bfd.strict_hold_time)
            : ""
        );
        setCapDynamic(existingPeerGroup.capability.dynamic);
        setCapExtendedNexthop(existingPeerGroup.capability.extended_nexthop);
        setCapSoftwareVersion(existingPeerGroup.capability.software_version);
        setEbgpMultihop(
          existingPeerGroup.ebgp_multihop != null
            ? String(existingPeerGroup.ebgp_multihop)
            : ""
        );
        setTtlSecurityHops(
          existingPeerGroup.ttl_security_hops != null
            ? String(existingPeerGroup.ttl_security_hops)
            : ""
        );
        setPassword(existingPeerGroup.password || "");
        setGracefulRestart(existingPeerGroup.graceful_restart || "");
        setLocalAsAsn(existingPeerGroup.local_as.asn || "");
        setLocalAsNoPrependReplaceAs(
          existingPeerGroup.local_as.no_prepend_replace_as
        );
        setLocalRole(existingPeerGroup.local_role || "");
        setLocalRoleStrict(existingPeerGroup.local_role_strict);

        // Address families
        const afs = Object.keys(existingPeerGroup.address_families);
        setEnabledAFs(new Set(afs));
        const configs: Record<string, AddressFamilyFormState> = {};
        for (const [afi, afConfig] of Object.entries(
          existingPeerGroup.address_families
        )) {
          configs[afi] = {
            route_map_import: afConfig.route_map_import || "",
            route_map_export: afConfig.route_map_export || "",
            soft_reconfiguration_inbound:
              afConfig.soft_reconfiguration_inbound,
            nexthop_self: afConfig.nexthop_self,
            route_reflector_client: afConfig.route_reflector_client,
          };
        }
        setAfConfigs(configs);
      } else {
        resetForm();
      }
    }
  }, [open, existingPeerGroup]);

  const resetForm = () => {
    setName("");
    setRemoteAs("");
    setDescription("");
    setUpdateSource("");
    setShutdown(false);
    setPassive(false);
    setSolo(false);
    setLinkState(false);
    setOverrideCapability(false);
    setDisableCapabilityNegotiation(false);
    setDisableConnectedCheck(false);
    setBfdEnabled(false);
    setBfdCheckControlPlaneFailure(false);
    setBfdProfile("");
    setBfdStrict(false);
    setBfdStrictHoldTime("");
    setCapDynamic(false);
    setCapExtendedNexthop(false);
    setCapSoftwareVersion(false);
    setEbgpMultihop("");
    setTtlSecurityHops("");
    setPassword("");
    setGracefulRestart("");
    setLocalAsAsn("");
    setLocalAsNoPrependReplaceAs(false);
    setLocalRole("");
    setLocalRoleStrict(false);
    setEnabledAFs(new Set());
    setAfConfigs({});
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !loading) handleClose();
  };

  const toggleAF = (afi: string, checked: boolean) => {
    setEnabledAFs((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(afi);
        if (!afConfigs[afi]) {
          setAfConfigs((prevConfigs) => ({
            ...prevConfigs,
            [afi]: defaultAfState(),
          }));
        }
      } else {
        next.delete(afi);
      }
      return next;
    });
  };

  const updateAfConfig = (
    afi: string,
    field: keyof AddressFamilyFormState,
    value: string | boolean
  ) => {
    setAfConfigs((prev) => ({
      ...prev,
      [afi]: {
        ...(prev[afi] || defaultAfState()),
        [field]: value,
      },
    }));
  };

  const validateForm = (): string | null => {
    if (!name.trim()) {
      return t("peerGroupModal.nameRequired");
    }

    if (!isEditMode && configuredNames.includes(name.trim())) {
      return t("peerGroupModal.nameExists", { name: name.trim() });
    }

    const range = firstRangeProblem(
      {
        ebgpMultihop,
        ttlSecurityHops,
        bfdHoldTime: bfdEnabled && bfdStrict ? bfdStrictHoldTime : "",
        localAs: localAsAsn,
        remoteAs: remoteAsNumber(remoteAs),
      },
      PEER_GROUP_RANGES,
    );
    if (range) {
      return t("form.rangeInvalid", {
        field: t(RANGE_LABEL_KEYS[range.field]),
        min: range.range.min,
        max: range.range.max,
      });
    }

    const problem = peerProblem({
      localAs: localAsAsn,
      systemAs,
      remoteAs,
      ebgpMultihop,
      ttlSecurityHops,
      overrideCapability,
      password,
      members: existingPeerGroup ? (peerGroupMembers[existingPeerGroup.name] ?? []) : [],
    });
    if (problem) {
      return t(`form.${problem}`);
    }
    const labeledConflict = labeledUnicastConflict(enabledAFs);
    if (labeledConflict) {
      return t("form.unicastWithLabeled", { family: labeledConflict });
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const addressFamilies: Record<string, BgpNeighborAddressFamilyConfig> =
        {};
      for (const afi of enabledAFs) {
        const af = afConfigs[afi] || defaultAfState();
        const base = emptyAfConfig();
        addressFamilies[afi] = {
          ...(existingPeerGroup?.address_families[afi] ?? base),
          route_map_import: af.route_map_import.trim() || null,
          route_map_export: af.route_map_export.trim() || null,
          soft_reconfiguration_inbound: af.soft_reconfiguration_inbound,
          nexthop_self: af.nexthop_self,
          route_reflector_client: af.route_reflector_client,
        };
      }

      const resolvedGracefulRestart = gracefulRestart || null;
      const resolvedLocalRole = localRole || null;

      const peerGroup: BgpPeerGroup = {
        name: name.trim(),
        remote_as: remoteAs.trim() || null,
        description: description.trim() || null,
        update_source: updateSource.trim() || null,
        password: password.trim() || null,
        shutdown,
        passive,
        solo,
        link_state: linkState,
        override_capability: overrideCapability,
        disable_capability_negotiation: disableCapabilityNegotiation,
        disable_connected_check: disableConnectedCheck,
        ebgp_multihop: ebgpMultihop.trim()
          ? parseInt(ebgpMultihop.trim(), 10)
          : null,
        graceful_restart: resolvedGracefulRestart,
        local_as: {
          asn: localAsAsn.trim() || null,
          no_prepend_replace_as: localAsAsn.trim() ? localAsNoPrependReplaceAs : false,
        },
        local_role: resolvedLocalRole,
        local_role_strict: resolvedLocalRole ? localRoleStrict : false,
        bfd: {
          enabled: bfdEnabled,
          check_control_plane_failure: bfdEnabled
            ? bfdCheckControlPlaneFailure
            : false,
          profile:
            bfdEnabled && bfdProfile.trim() ? bfdProfile.trim() : null,
          strict: bfdEnabled && bfdStrict,
          strict_hold_time:
            bfdEnabled && bfdStrict && bfdStrictHoldTime.trim()
              ? Number(bfdStrictHoldTime.trim())
              : null,
        },
        capability: {
          dynamic: capDynamic,
          extended_nexthop: capExtendedNexthop,
          software_version: capSoftwareVersion,
        },
        ttl_security_hops: ttlSecurityHops.trim()
          ? parseInt(ttlSecurityHops.trim(), 10)
          : null,
        address_families: addressFamilies,
      };

      await onSubmit(peerGroup);
      handleClose();
    } catch (err: unknown) {
      const message = thrownMessage(err, tc("operationFailed"));
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("peerGroupModal.editTitle") : t("peerGroupModal.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("peerGroupModal.editDescription", { name: existingPeerGroup?.name ?? "" })
              : t("peerGroupModal.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 pb-2">
            {/* ============================================================ */}
            {/* Section 1: Basic Settings */}
            {/* ============================================================ */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("form.basicSettings")}</h4>
              <div className="space-y-4 rounded-lg border p-3">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-pg-name">
                    {tc("name")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="bgp-pg-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("eg", { value: "MY-PEERS" })}
                    disabled={isEditMode}
                    className={isEditMode ? "bg-muted" : ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("peerGroupModal.nameHelp")}
                  </p>
                </div>

                {/* Remote AS */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-pg-remote-as">{t("form.remoteAs")}</Label>
                  <Input
                    id="bgp-pg-remote-as"
                    value={remoteAs}
                    onChange={(e) => setRemoteAs(e.target.value)}
                    placeholder={t("peerGroupModal.remoteAsPlaceholder")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("peerGroupModal.remoteAsHelp")}
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-pg-description">{tc("description")}</Label>
                  <Input
                    id="bgp-pg-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("peerGroupModal.descriptionPlaceholder")}
                  />
                </div>

                {/* Update Source */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-pg-update-source">{t("form.updateSource")}</Label>
                  <Input
                    id="bgp-pg-update-source"
                    value={updateSource}
                    onChange={(e) => setUpdateSource(e.target.value)}
                    placeholder={t("form.updateSourcePlaceholder")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("peerGroupModal.updateSourceHelp")}
                  </p>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* Section 2: Status & Options */}
            {/* ============================================================ */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("form.statusOptions")}</h4>
              <div className="space-y-3 rounded-lg border p-3">
                {/* Shutdown */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bgp-pg-shutdown"
                    checked={shutdown}
                    onCheckedChange={(checked) =>
                      setShutdown(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bgp-pg-shutdown"
                      className="cursor-pointer text-destructive"
                    >
                      {t("form.shutdown")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("peerGroupModal.shutdownHelp")}
                    </p>
                  </div>
                </div>

                {/* Passive */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bgp-pg-passive"
                    checked={passive}
                    onCheckedChange={(checked) =>
                      setPassive(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bgp-pg-passive"
                      className="cursor-pointer"
                    >
                      {t("form.passive")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("peerGroupModal.passiveHelp")}
                    </p>
                  </div>
                </div>

                {capabilities?.features.peer_group_solo?.supported && (
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="bgp-pg-solo"
                      checked={solo}
                      onCheckedChange={(checked) => setSolo(checked === true)}
                    />
                    <Label htmlFor="bgp-pg-solo" className="cursor-pointer">
                      {t("form.solo")}
                    </Label>
                  </div>
                )}
                {capabilities?.features.peer_group_link_state?.supported && (
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="bgp-pg-link-state"
                      checked={linkState}
                      onCheckedChange={(checked) => setLinkState(checked === true)}
                    />
                    <Label htmlFor="bgp-pg-link-state" className="cursor-pointer">
                      {t("form.linkState")}
                    </Label>
                  </div>
                )}

                {/* Override Capability */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bgp-pg-override-capability"
                    checked={overrideCapability}
                    onCheckedChange={(checked) =>
                      setOverrideCapability(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bgp-pg-override-capability"
                      className="cursor-pointer"
                    >
                      {t("form.overrideCapability")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("form.overrideCapabilityHelp")}
                    </p>
                  </div>
                </div>

                {/* Disable Capability Negotiation */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bgp-pg-disable-cap-neg"
                    checked={disableCapabilityNegotiation}
                    onCheckedChange={(checked) =>
                      setDisableCapabilityNegotiation(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bgp-pg-disable-cap-neg"
                      className="cursor-pointer"
                    >
                      {t("form.disableCapNeg")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("peerGroupModal.disableCapNegHelp")}
                    </p>
                  </div>
                </div>

                {/* Disable Connected Check */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bgp-pg-disable-conn-check"
                    checked={disableConnectedCheck}
                    onCheckedChange={(checked) =>
                      setDisableConnectedCheck(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bgp-pg-disable-conn-check"
                      className="cursor-pointer"
                    >
                      {t("form.disableConnectedCheck")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("peerGroupModal.disableConnectedCheckHelp")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* Section 3: BFD */}
            {/* ============================================================ */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">BFD</h4>
              <div className="space-y-4 rounded-lg border p-3">
                {/* Enable BFD */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bgp-pg-bfd-enabled"
                    checked={bfdEnabled}
                    onCheckedChange={(checked) =>
                      setBfdEnabled(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bgp-pg-bfd-enabled"
                      className="cursor-pointer"
                    >
                      {t("form.enableBfd")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("peerGroupModal.bfdHelp")}
                    </p>
                  </div>
                </div>

                {bfdEnabled && (
                  <>
                    {/* Check Control Plane Failure */}
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="bgp-pg-bfd-ccpf"
                        checked={bfdCheckControlPlaneFailure}
                        onCheckedChange={(checked) =>
                          setBfdCheckControlPlaneFailure(checked === true)
                        }
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor="bgp-pg-bfd-ccpf"
                          className="cursor-pointer"
                        >
                          {t("form.checkControlPlane")}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t("peerGroupModal.checkControlPlaneHelp")}
                        </p>
                      </div>
                    </div>

                    {/* BFD Profile */}
                    <div className="space-y-2">
                      <Label htmlFor="bgp-pg-bfd-profile">{t("form.bfdProfile")}</Label>
                      <NamedListSelect id="bgp-pg-bfd-profile" value={bfdProfile} names={bfdProfileNames} onValueChange={setBfdProfile} />
                    </div>
                    {capabilities?.features.peer_group_bfd_strict?.supported && (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id="bgp-pg-bfd-strict"
                            checked={bfdStrict}
                            onCheckedChange={(checked) => setBfdStrict(checked === true)}
                          />
                          <Label htmlFor="bgp-pg-bfd-strict" className="cursor-pointer">
                            {t("form.bfdStrict")}
                          </Label>
                        </div>
                        {bfdStrict && (
                          <div className="space-y-1">
                            <Label htmlFor="bgp-pg-bfd-hold">{t("form.bfdStrictHoldTime")}</Label>
                            <Input
                              id="bgp-pg-bfd-hold"
                              type="number"
                              min={BFD_HOLD_TIME_RANGE.min}
                              max={BFD_HOLD_TIME_RANGE.max}
                              value={bfdStrictHoldTime}
                              onChange={(e) => setBfdStrictHoldTime(e.target.value)}
                              className="h-9"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ============================================================ */}
            {/* Section 4: Capability */}
            {/* ============================================================ */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("form.capability")}</h4>
              <div className="space-y-3 rounded-lg border p-3">
                {/* Dynamic */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bgp-pg-cap-dynamic"
                    checked={capDynamic}
                    onCheckedChange={(checked) =>
                      setCapDynamic(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bgp-pg-cap-dynamic"
                      className="cursor-pointer"
                    >
                      {t("form.dynamic")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("peerGroupModal.dynamicHelp")}
                    </p>
                  </div>
                </div>

                {/* Extended Nexthop */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bgp-pg-cap-extended-nexthop"
                    checked={capExtendedNexthop}
                    onCheckedChange={(checked) =>
                      setCapExtendedNexthop(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bgp-pg-cap-extended-nexthop"
                      className="cursor-pointer"
                    >
                      {t("form.extendedNexthop")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("form.extendedNexthopHelp")}
                    </p>
                  </div>
                </div>

                {/* Software Version */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bgp-pg-cap-software-version"
                    checked={capSoftwareVersion}
                    onCheckedChange={(checked) =>
                      setCapSoftwareVersion(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bgp-pg-cap-software-version"
                      className="cursor-pointer"
                    >
                      {t("form.softwareVersion")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("form.softwareVersionHelp")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* Section 5: Advanced */}
            {/* ============================================================ */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("form.advanced")}</h4>
              <div className="space-y-4 rounded-lg border p-3">
                {/* eBGP Multihop */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-pg-ebgp-multihop">{t("form.ebgpMultihop")}</Label>
                  <Input
                    id="bgp-pg-ebgp-multihop"
                    type="number"
                    value={ebgpMultihop}
                    onChange={(e) => setEbgpMultihop(e.target.value)}
                    placeholder="1-255"
                    min={EBGP_MULTIHOP_RANGE.min}
                    max={EBGP_MULTIHOP_RANGE.max}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("peerGroupModal.ebgpMultihopHelp")}
                  </p>
                </div>

                {/* TTL Security Hops */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-pg-ttl-security">
                    {t("form.ttlSecurityHops")}
                  </Label>
                  <Input
                    id="bgp-pg-ttl-security"
                    type="number"
                    value={ttlSecurityHops}
                    onChange={(e) => setTtlSecurityHops(e.target.value)}
                    placeholder="1-254"
                    min={TTL_SECURITY_RANGE.min}
                    max={TTL_SECURITY_RANGE.max}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("peerGroupModal.ttlHelp")}
                  </p>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-pg-password">{t("form.password")}</Label>
                  <Input
                    id="bgp-pg-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("peerGroupModal.passwordPlaceholder")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("peerGroupModal.passwordHelp")}
                  </p>
                </div>

                {/* Graceful Restart */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-pg-graceful-restart">
                    {t("form.gracefulRestart")}
                  </Label>
                  <Select
                    value={gracefulRestart || NONE_SENTINEL}
                    onValueChange={(v) => setGracefulRestart(v === NONE_SENTINEL ? "" : v)}
                  >
                    <SelectTrigger id="bgp-pg-graceful-restart">
                      <SelectValue placeholder={t("form.gracefulRestartPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SENTINEL}>{tc("none")}</SelectItem>
                      <SelectItem value="enable">{t("form.grEnable")}</SelectItem>
                      <SelectItem value="disable">{t("form.grDisable")}</SelectItem>
                      <SelectItem value="restart-helper">{t("form.grRestartHelper")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t("peerGroupModal.gracefulRestartHelp")}
                  </p>
                </div>

                {/* Local AS */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-pg-local-as">{t("form.localAs")}</Label>
                  <Input
                    id="bgp-pg-local-as"
                    value={localAsAsn}
                    onChange={(e) => setLocalAsAsn(e.target.value)}
                    placeholder={t("eg", { value: "65100" })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("peerGroupModal.localAsHelp")}
                  </p>
                </div>

                {/* No Prepend Replace AS - shown when Local AS is set */}
                {localAsAsn.trim() && (
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="bgp-pg-local-as-no-prepend"
                      checked={localAsNoPrependReplaceAs}
                      onCheckedChange={(checked) =>
                        setLocalAsNoPrependReplaceAs(checked === true)
                      }
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="bgp-pg-local-as-no-prepend"
                        className="cursor-pointer"
                      >
                        {t("form.noPrependReplaceAs")}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t("peerGroupModal.noPrependHelp")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Local Role - only if capabilities support it */}
                {capabilities?.features.local_role.supported && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="bgp-pg-local-role">{t("form.localRole")}</Label>
                      <Select
                        value={localRole || NONE_SENTINEL}
                        onValueChange={(v) => setLocalRole(v === NONE_SENTINEL ? "" : v)}
                      >
                        <SelectTrigger id="bgp-pg-local-role">
                          <SelectValue placeholder={t("peerGroupModal.localRolePlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_SENTINEL}>{tc("none")}</SelectItem>
                          <SelectItem value="provider">{t("form.roleProvider")}</SelectItem>
                          <SelectItem value="customer">{t("form.roleCustomer")}</SelectItem>
                          <SelectItem value="rs-server">{t("form.roleRsServer")}</SelectItem>
                          <SelectItem value="rs-client">{t("form.roleRsClient")}</SelectItem>
                          <SelectItem value="peer">{t("form.rolePeer")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {t("peerGroupModal.localRoleHelp")}
                      </p>
                    </div>

                    {/* Strict Mode - shown when Local Role is set */}
                    {localRole && (
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="bgp-pg-local-role-strict"
                          checked={localRoleStrict}
                          onCheckedChange={(checked) =>
                            setLocalRoleStrict(checked === true)
                          }
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor="bgp-pg-local-role-strict"
                            className="cursor-pointer"
                          >
                            {t("form.strictMode")}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {t("peerGroupModal.strictModeHelp")}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ============================================================ */}
            {/* Section 6: Address Families */}
            {/* ============================================================ */}
            {availableAFs.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">{t("form.addressFamilies")}</h4>
                <div className="space-y-4 rounded-lg border p-3">
                  {/* AFI selection checkboxes */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {t("peerGroupModal.afHelp")}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {availableAFs.map((afi) => (
                        <div
                          key={afi}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`bgp-pg-af-${afi}`}
                            checked={enabledAFs.has(afi)}
                            onCheckedChange={(checked) =>
                              toggleAF(afi, checked === true)
                            }
                          />
                          <Label
                            htmlFor={`bgp-pg-af-${afi}`}
                            className="cursor-pointer text-sm"
                          >
                            {afi}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Per-AFI configuration */}
                  {Array.from(enabledAFs).map((afi) => {
                    const af = afConfigs[afi] || defaultAfState();
                    return (
                      <div
                        key={afi}
                        className="space-y-3 rounded-md border p-3"
                      >
                        <h5 className="text-sm font-medium">{afi}</h5>

                        {/* Route Map Import / Export */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor={`bgp-pg-af-${afi}-rm-import`}
                            >
                              {t("form.routeMapImport")}
                            </Label>
                            <NamedListSelect
                              id={`bgp-pg-af-${afi}-rm-import`}
                              value={af.route_map_import}
                              names={routeMapNames}
                              onValueChange={(v) =>
                                updateAfConfig(afi, "route_map_import", v)
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label
                              htmlFor={`bgp-pg-af-${afi}-rm-export`}
                            >
                              {t("form.routeMapExport")}
                            </Label>
                            <NamedListSelect
                              id={`bgp-pg-af-${afi}-rm-export`}
                              value={af.route_map_export}
                              names={routeMapNames}
                              onValueChange={(v) =>
                                updateAfConfig(afi, "route_map_export", v)
                              }
                            />
                          </div>
                        </div>

                        {/* Boolean toggles */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id={`bgp-pg-af-${afi}-soft-reconfig`}
                              checked={af.soft_reconfiguration_inbound}
                              onCheckedChange={(checked) =>
                                updateAfConfig(
                                  afi,
                                  "soft_reconfiguration_inbound",
                                  checked === true
                                )
                              }
                            />
                            <Label
                              htmlFor={`bgp-pg-af-${afi}-soft-reconfig`}
                              className="cursor-pointer text-sm"
                            >
                              {t("form.softReconfig")}
                            </Label>
                          </div>

                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id={`bgp-pg-af-${afi}-nexthop-self`}
                              checked={af.nexthop_self}
                              onCheckedChange={(checked) =>
                                updateAfConfig(
                                  afi,
                                  "nexthop_self",
                                  checked === true
                                )
                              }
                            />
                            <Label
                              htmlFor={`bgp-pg-af-${afi}-nexthop-self`}
                              className="cursor-pointer text-sm"
                            >
                              {t("peerGroupModal.nexthopSelf")}
                            </Label>
                          </div>

                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id={`bgp-pg-af-${afi}-rr-client`}
                              checked={af.route_reflector_client}
                              onCheckedChange={(checked) =>
                                updateAfConfig(
                                  afi,
                                  "route_reflector_client",
                                  checked === true
                                )
                              }
                            />
                            <Label
                              htmlFor={`bgp-pg-af-${afi}-rr-client`}
                              className="cursor-pointer text-sm"
                            >
                              {t("form.routeReflectorClient")}
                            </Label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? tc("saving") : tc("creating")}
              </>
            ) : isEditMode ? (
              tc("saveChanges")
            ) : (
              t("peerGroupModal.submit")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
