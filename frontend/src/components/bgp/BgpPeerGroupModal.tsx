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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  capabilities?: BgpCapabilities | null;
}

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
  capabilities,
}: BgpPeerGroupModalProps) {
  const isEditMode = !!existingPeerGroup;

  // --- Basic fields ---
  const [name, setName] = useState("");
  const [remoteAs, setRemoteAs] = useState("");
  const [description, setDescription] = useState("");
  const [updateSource, setUpdateSource] = useState("");

  // --- Status & Options ---
  const [shutdown, setShutdown] = useState(false);
  const [passive, setPassive] = useState(false);
  const [overrideCapability, setOverrideCapability] = useState(false);
  const [disableCapabilityNegotiation, setDisableCapabilityNegotiation] =
    useState(false);
  const [disableConnectedCheck, setDisableConnectedCheck] = useState(false);

  // --- BFD ---
  const [bfdEnabled, setBfdEnabled] = useState(false);
  const [bfdCheckControlPlaneFailure, setBfdCheckControlPlaneFailure] =
    useState(false);
  const [bfdProfile, setBfdProfile] = useState("");

  // --- Capability ---
  const [capDynamic, setCapDynamic] = useState(false);
  const [capExtendedNexthop, setCapExtendedNexthop] = useState(false);
  const [capSoftwareVersion, setCapSoftwareVersion] = useState(false);

  // --- Advanced ---
  const [ebgpMultihop, setEbgpMultihop] = useState("");
  const [ttlSecurityHops, setTtlSecurityHops] = useState("");
  const [password, setPassword] = useState("");
  const [gracefulRestart, setGracefulRestart] = useState("__none__");
  const [localAsAsn, setLocalAsAsn] = useState("");
  const [localAsNoPrependReplaceAs, setLocalAsNoPrependReplaceAs] =
    useState(false);
  const [localRole, setLocalRole] = useState("__none__");
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
        setGracefulRestart(existingPeerGroup.graceful_restart || "__none__");
        setLocalAsAsn(existingPeerGroup.local_as.asn || "");
        setLocalAsNoPrependReplaceAs(
          existingPeerGroup.local_as.no_prepend_replace_as
        );
        setLocalRole(existingPeerGroup.local_role || "__none__");
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
    setOverrideCapability(false);
    setDisableCapabilityNegotiation(false);
    setDisableConnectedCheck(false);
    setBfdEnabled(false);
    setBfdCheckControlPlaneFailure(false);
    setBfdProfile("");
    setCapDynamic(false);
    setCapExtendedNexthop(false);
    setCapSoftwareVersion(false);
    setEbgpMultihop("");
    setTtlSecurityHops("");
    setPassword("");
    setGracefulRestart("__none__");
    setLocalAsAsn("");
    setLocalAsNoPrependReplaceAs(false);
    setLocalRole("__none__");
    setLocalRoleStrict(false);
    setEnabledAFs(new Set());
    setAfConfigs({});
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
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
      return "Peer group name is required";
    }

    if (ebgpMultihop.trim()) {
      const val = parseInt(ebgpMultihop.trim(), 10);
      if (isNaN(val) || val < 1 || val > 255) {
        return "eBGP multihop must be between 1 and 255";
      }
    }

    if (ttlSecurityHops.trim()) {
      const val = parseInt(ttlSecurityHops.trim(), 10);
      if (isNaN(val) || val < 1 || val > 254) {
        return "TTL security hops must be between 1 and 254";
      }
    }

    if (localAsNoPrependReplaceAs && !localAsAsn.trim()) {
      return "Local AS number is required when no-prepend-replace-as is enabled";
    }

    if (localRoleStrict && localRole === "__none__") {
      return "Local role must be set when strict mode is enabled";
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
          ...base,
          route_map_import: af.route_map_import.trim() || null,
          route_map_export: af.route_map_export.trim() || null,
          soft_reconfiguration_inbound: af.soft_reconfiguration_inbound,
          nexthop_self: af.nexthop_self,
          route_reflector_client: af.route_reflector_client,
        };
      }

      const resolvedGracefulRestart =
        gracefulRestart !== "__none__" ? gracefulRestart : null;
      const resolvedLocalRole =
        localRole !== "__none__" ? localRole : null;

      const peerGroup: BgpPeerGroup = {
        name: name.trim(),
        remote_as: remoteAs.trim() || null,
        description: description.trim() || null,
        update_source: updateSource.trim() || null,
        password: password.trim() || null,
        shutdown,
        passive,
        override_capability: overrideCapability,
        disable_capability_negotiation: disableCapabilityNegotiation,
        disable_connected_check: disableConnectedCheck,
        ebgp_multihop: ebgpMultihop.trim()
          ? parseInt(ebgpMultihop.trim(), 10)
          : null,
        graceful_restart: resolvedGracefulRestart,
        local_as: {
          asn: localAsAsn.trim() || null,
          no_prepend_replace_as: localAsNoPrependReplaceAs,
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
      const message =
        err instanceof Error ? err.message : "Operation failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Peer Group" : "Add Peer Group"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Modify the BGP peer group configuration for "${existingPeerGroup?.name}".`
              : "Configure a new BGP peer group."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 pb-2">
            {/* ============================================================ */}
            {/* Section 1: Basic Settings */}
            {/* ============================================================ */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Basic Settings</h4>
              <div className="space-y-4 rounded-lg border p-3">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-pg-name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="bgp-pg-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. MY-PEERS"
                    disabled={isEditMode}
                    className={isEditMode ? "bg-muted" : ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique name for this BGP peer group.
                  </p>
                </div>

                {/* Remote AS */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-pg-remote-as">Remote AS</Label>
                  <Input
                    id="bgp-pg-remote-as"
                    value={remoteAs}
                    onChange={(e) => setRemoteAs(e.target.value)}
                    placeholder="e.g. 65001 or external or internal"
                  />
                  <p className="text-xs text-muted-foreground">
                    Remote AS number, or &quot;external&quot; /
                    &quot;internal&quot;.
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-pg-description">Description</Label>
                  <Input
                    id="bgp-pg-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Peer group description"
                  />
                </div>

                {/* Update Source */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-pg-update-source">Update Source</Label>
                  <Input
                    id="bgp-pg-update-source"
                    value={updateSource}
                    onChange={(e) => setUpdateSource(e.target.value)}
                    placeholder="e.g. eth0 or 192.0.2.1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Source interface or address for BGP sessions.
                  </p>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* Section 2: Status & Options */}
            {/* ============================================================ */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Status &amp; Options</h4>
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
                      Shutdown
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Administratively disable this peer group.
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
                      Passive
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Do not initiate BGP connections to peers in this group.
                    </p>
                  </div>
                </div>

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
                      Override Capability
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Override capability negotiation result.
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
                      Disable Capability Negotiation
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Suppress sending capability negotiation as OPEN message.
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
                      Disable Connected Check
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Allow peerings between directly connected eBGP peers
                      using loopback addresses.
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
                      Enable BFD
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable Bidirectional Forwarding Detection for this peer
                      group.
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
                          Check Control Plane Failure
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Trigger session down on control plane independent
                          failure.
                        </p>
                      </div>
                    </div>

                    {/* BFD Profile */}
                    <div className="space-y-2">
                      <Label htmlFor="bgp-pg-bfd-profile">BFD Profile</Label>
                      <Input
                        id="bgp-pg-bfd-profile"
                        value={bfdProfile}
                        onChange={(e) => setBfdProfile(e.target.value)}
                        placeholder="BFD profile name"
                      />
                      <p className="text-xs text-muted-foreground">
                        BFD profile to apply to this peer group.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ============================================================ */}
            {/* Section 4: Capability */}
            {/* ============================================================ */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Capability</h4>
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
                      Dynamic
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Advertise dynamic capability to this peer group.
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
                      Extended Nexthop
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Advertise extended nexthop capability.
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
                      Software Version
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Advertise software version capability.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* Section 5: Advanced */}
            {/* ============================================================ */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Advanced</h4>
              <div className="space-y-4 rounded-lg border p-3">
                {/* eBGP Multihop */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-pg-ebgp-multihop">eBGP Multihop</Label>
                  <Input
                    id="bgp-pg-ebgp-multihop"
                    type="number"
                    value={ebgpMultihop}
                    onChange={(e) => setEbgpMultihop(e.target.value)}
                    placeholder="1-255"
                    min={1}
                    max={255}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of hops for eBGP neighbors (1-255).
                  </p>
                </div>

                {/* TTL Security Hops */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-pg-ttl-security">
                    TTL Security Hops
                  </Label>
                  <Input
                    id="bgp-pg-ttl-security"
                    type="number"
                    value={ttlSecurityHops}
                    onChange={(e) => setTtlSecurityHops(e.target.value)}
                    placeholder="1-254"
                    min={1}
                    max={254}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enforce TTL security hops value (1-254).
                  </p>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-pg-password">Password</Label>
                  <Input
                    id="bgp-pg-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="MD5 authentication password"
                  />
                  <p className="text-xs text-muted-foreground">
                    BGP MD5 authentication password.
                  </p>
                </div>

                {/* Graceful Restart */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-pg-graceful-restart">
                    Graceful Restart
                  </Label>
                  <Select
                    value={gracefulRestart}
                    onValueChange={setGracefulRestart}
                  >
                    <SelectTrigger id="bgp-pg-graceful-restart">
                      <SelectValue placeholder="Select graceful restart mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      <SelectItem value="enable">Enable</SelectItem>
                      <SelectItem value="disable">Disable</SelectItem>
                      <SelectItem value="restart">Restart</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Configure graceful restart for this peer group.
                  </p>
                </div>

                {/* Local AS */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-pg-local-as">Local AS Number</Label>
                  <Input
                    id="bgp-pg-local-as"
                    value={localAsAsn}
                    onChange={(e) => setLocalAsAsn(e.target.value)}
                    placeholder="e.g. 65100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Alternate local AS number advertised to this peer group.
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
                        No Prepend Replace AS
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Do not prepend local AS to updates from this peer
                        group and replace AS in outgoing updates.
                      </p>
                    </div>
                  </div>
                )}

                {/* Local Role - only if capabilities support it */}
                {capabilities?.features.local_role.supported && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="bgp-pg-local-role">Local Role</Label>
                      <Select
                        value={localRole}
                        onValueChange={setLocalRole}
                      >
                        <SelectTrigger id="bgp-pg-local-role">
                          <SelectValue placeholder="Select local role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          <SelectItem value="provider">Provider</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="rs-server">RS Server</SelectItem>
                          <SelectItem value="rs-client">RS Client</SelectItem>
                          <SelectItem value="peer">Peer</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Set the local role for this peer group (RFC 9234).
                      </p>
                    </div>

                    {/* Strict Mode - shown when Local Role is set */}
                    {localRole !== "__none__" && (
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
                            Strict Mode
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Require the peer to send the correct role; reject
                            the session otherwise.
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
                <h4 className="text-sm font-medium">Address Families</h4>
                <div className="space-y-4 rounded-lg border p-3">
                  {/* AFI selection checkboxes */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Select address families to enable for this peer group.
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
                              Route Map Import
                            </Label>
                            <Input
                              id={`bgp-pg-af-${afi}-rm-import`}
                              value={af.route_map_import}
                              onChange={(e) =>
                                updateAfConfig(
                                  afi,
                                  "route_map_import",
                                  e.target.value
                                )
                              }
                              placeholder="Route map name"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label
                              htmlFor={`bgp-pg-af-${afi}-rm-export`}
                            >
                              Route Map Export
                            </Label>
                            <Input
                              id={`bgp-pg-af-${afi}-rm-export`}
                              value={af.route_map_export}
                              onChange={(e) =>
                                updateAfConfig(
                                  afi,
                                  "route_map_export",
                                  e.target.value
                                )
                              }
                              placeholder="Route map name"
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
                              Soft Reconfiguration Inbound
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
                              Nexthop Self
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
                              Route Reflector Client
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
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? "Saving..." : "Creating..."}
              </>
            ) : isEditMode ? (
              "Save Changes"
            ) : (
              "Add Peer Group"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
