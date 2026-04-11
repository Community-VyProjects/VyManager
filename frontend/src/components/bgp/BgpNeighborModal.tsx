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
  BgpNeighbor,
  BgpNeighborAddressFamilyConfig,
  BgpCapabilities,
} from "@/lib/api/bgp";

// ============================================================================
// Types
// ============================================================================

interface BgpNeighborModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (neighbor: BgpNeighbor) => Promise<void>;
  existingNeighbor?: BgpNeighbor | null;
  peerGroups: string[];
  routeMapNames: string[];
  bfdProfileNames: string[];
  capabilities?: BgpCapabilities | null;
}

// ============================================================================
// Helpers
// ============================================================================

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

// ============================================================================
// Component
// ============================================================================

export function BgpNeighborModal({
  open,
  onOpenChange,
  onSubmit,
  existingNeighbor,
  peerGroups,
  routeMapNames,
  bfdProfileNames,
  capabilities,
}: BgpNeighborModalProps) {
  const isEditMode = !!existingNeighbor;

  // --------------------------------------------------------------------------
  // Basic fields
  // --------------------------------------------------------------------------
  const [address, setAddress] = useState("");
  const [remoteAs, setRemoteAs] = useState("");
  const [description, setDescription] = useState("");
  const [peerGroup, setPeerGroup] = useState("");
  const [updateSource, setUpdateSource] = useState("");

  // --------------------------------------------------------------------------
  // Status & Options (boolean flags)
  // --------------------------------------------------------------------------
  const [shutdown, setShutdown] = useState(false);
  const [passive, setPassive] = useState(false);
  const [solo, setSolo] = useState(false);
  const [enforceFirstAs, setEnforceFirstAs] = useState(false);
  const [overrideCapability, setOverrideCapability] = useState(false);
  const [disableCapabilityNegotiation, setDisableCapabilityNegotiation] =
    useState(false);
  const [disableConnectedCheck, setDisableConnectedCheck] = useState(false);

  // --------------------------------------------------------------------------
  // BFD
  // --------------------------------------------------------------------------
  const [bfdEnabled, setBfdEnabled] = useState(false);
  const [bfdCheckControlPlane, setBfdCheckControlPlane] = useState(false);
  const [bfdProfile, setBfdProfile] = useState("");

  // --------------------------------------------------------------------------
  // Capability
  // --------------------------------------------------------------------------
  const [capDynamic, setCapDynamic] = useState(false);
  const [capExtendedNexthop, setCapExtendedNexthop] = useState(false);
  const [capSoftwareVersion, setCapSoftwareVersion] = useState(false);

  // --------------------------------------------------------------------------
  // Timers
  // --------------------------------------------------------------------------
  const [timerConnect, setTimerConnect] = useState("");
  const [timerKeepalive, setTimerKeepalive] = useState("");
  const [timerHoldtime, setTimerHoldtime] = useState("");

  // --------------------------------------------------------------------------
  // Advanced
  // --------------------------------------------------------------------------
  const [ebgpMultihop, setEbgpMultihop] = useState("");
  const [advertisementInterval, setAdvertisementInterval] = useState("");
  const [ttlSecurityHops, setTtlSecurityHops] = useState("");
  const [password, setPassword] = useState("");
  const [port, setPort] = useState("");
  const [gracefulRestart, setGracefulRestart] = useState("");
  const [localAsAsn, setLocalAsAsn] = useState("");
  const [localAsNoPrependReplaceAs, setLocalAsNoPrependReplaceAs] =
    useState(false);
  const [localRole, setLocalRole] = useState("");
  const [localRoleStrict, setLocalRoleStrict] = useState(false);

  // --------------------------------------------------------------------------
  // Address Families
  // --------------------------------------------------------------------------
  const [addressFamilies, setAddressFamilies] = useState<
    Record<string, BgpNeighborAddressFamilyConfig>
  >({});

  // --------------------------------------------------------------------------
  // UI state
  // --------------------------------------------------------------------------
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Available AFI list from capabilities
  // --------------------------------------------------------------------------
  const availableAFIs: string[] =
    capabilities?.address_family_types?.neighbor ?? [];

  // --------------------------------------------------------------------------
  // Populate / reset form
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (open) {
      if (existingNeighbor) {
        setAddress(existingNeighbor.address);
        setRemoteAs(existingNeighbor.remote_as || "");
        setDescription(existingNeighbor.description || "");
        setPeerGroup(existingNeighbor.peer_group || "");
        setUpdateSource(existingNeighbor.update_source || "");

        setShutdown(existingNeighbor.shutdown);
        setPassive(existingNeighbor.passive);
        setSolo(existingNeighbor.solo);
        setEnforceFirstAs(existingNeighbor.enforce_first_as);
        setOverrideCapability(existingNeighbor.override_capability);
        setDisableCapabilityNegotiation(
          existingNeighbor.disable_capability_negotiation
        );
        setDisableConnectedCheck(existingNeighbor.disable_connected_check);

        setBfdEnabled(existingNeighbor.bfd.enabled);
        setBfdCheckControlPlane(
          existingNeighbor.bfd.check_control_plane_failure
        );
        setBfdProfile(existingNeighbor.bfd.profile || "");

        setCapDynamic(existingNeighbor.capability.dynamic);
        setCapExtendedNexthop(existingNeighbor.capability.extended_nexthop);
        setCapSoftwareVersion(existingNeighbor.capability.software_version);

        setTimerConnect(
          existingNeighbor.timers.connect != null
            ? String(existingNeighbor.timers.connect)
            : ""
        );
        setTimerKeepalive(
          existingNeighbor.timers.keepalive != null
            ? String(existingNeighbor.timers.keepalive)
            : ""
        );
        setTimerHoldtime(
          existingNeighbor.timers.holdtime != null
            ? String(existingNeighbor.timers.holdtime)
            : ""
        );

        setEbgpMultihop(
          existingNeighbor.ebgp_multihop != null
            ? String(existingNeighbor.ebgp_multihop)
            : ""
        );
        setAdvertisementInterval(
          existingNeighbor.advertisement_interval != null
            ? String(existingNeighbor.advertisement_interval)
            : ""
        );
        setTtlSecurityHops(
          existingNeighbor.ttl_security_hops != null
            ? String(existingNeighbor.ttl_security_hops)
            : ""
        );
        setPassword(existingNeighbor.password || "");
        setPort(
          existingNeighbor.port != null ? String(existingNeighbor.port) : ""
        );
        setGracefulRestart(existingNeighbor.graceful_restart || "");
        setLocalAsAsn(existingNeighbor.local_as.asn || "");
        setLocalAsNoPrependReplaceAs(
          existingNeighbor.local_as.no_prepend_replace_as
        );
        setLocalRole(existingNeighbor.local_role || "");
        setLocalRoleStrict(existingNeighbor.local_role_strict);

        setAddressFamilies({ ...existingNeighbor.address_families });
        setError(null);
      } else {
        resetForm();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingNeighbor]);

  const resetForm = () => {
    setAddress("");
    setRemoteAs("");
    setDescription("");
    setPeerGroup("");
    setUpdateSource("");

    setShutdown(false);
    setPassive(false);
    setSolo(false);
    setEnforceFirstAs(false);
    setOverrideCapability(false);
    setDisableCapabilityNegotiation(false);
    setDisableConnectedCheck(false);

    setBfdEnabled(false);
    setBfdCheckControlPlane(false);
    setBfdProfile("");

    setCapDynamic(false);
    setCapExtendedNexthop(false);
    setCapSoftwareVersion(false);

    setTimerConnect("");
    setTimerKeepalive("");
    setTimerHoldtime("");

    setEbgpMultihop("");
    setAdvertisementInterval("");
    setTtlSecurityHops("");
    setPassword("");
    setPort("");
    setGracefulRestart("");
    setLocalAsAsn("");
    setLocalAsNoPrependReplaceAs(false);
    setLocalRole("");
    setLocalRoleStrict(false);

    setAddressFamilies({});
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // --------------------------------------------------------------------------
  // Address family helpers
  // --------------------------------------------------------------------------
  const toggleAF = (afi: string) => {
    setAddressFamilies((prev) => {
      const next = { ...prev };
      if (next[afi]) {
        delete next[afi];
      } else {
        next[afi] = emptyAfConfig();
      }
      return next;
    });
  };

  const updateAfField = (
    afi: string,
    field: keyof BgpNeighborAddressFamilyConfig,
    value: string | number | boolean | null
  ) => {
    setAddressFamilies((prev) => ({
      ...prev,
      [afi]: {
        ...(prev[afi] || emptyAfConfig()),
        [field]: value,
      },
    }));
  };

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------
  const validateForm = (): string | null => {
    if (!address.trim()) {
      return "Neighbor address is required.";
    }
    if (!address.includes(".") && !address.includes(":")) {
      return "Neighbor address must be a valid IPv4 or IPv6 address.";
    }
    return null;
  };

  // --------------------------------------------------------------------------
  // Submit
  // --------------------------------------------------------------------------
  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const neighbor: BgpNeighbor = {
        address: address.trim(),
        remote_as: remoteAs.trim() || null,
        description: description.trim() || null,
        peer_group:
          peerGroup && peerGroup !== "__none__" ? peerGroup : null,
        update_source: updateSource.trim() || null,
        password: password.trim() || null,
        port: port.trim() ? parseInt(port.trim(), 10) : null,
        shutdown,
        passive,
        solo,
        enforce_first_as: enforceFirstAs,
        override_capability: overrideCapability,
        strict_capability_match: false,
        disable_capability_negotiation: disableCapabilityNegotiation,
        disable_connected_check: disableConnectedCheck,
        ebgp_multihop: ebgpMultihop.trim()
          ? parseInt(ebgpMultihop.trim(), 10)
          : null,
        advertisement_interval: advertisementInterval.trim()
          ? parseInt(advertisementInterval.trim(), 10)
          : null,
        graceful_restart:
          gracefulRestart && gracefulRestart !== "__none__"
            ? gracefulRestart
            : null,
        local_as: {
          asn: localAsAsn.trim() || null,
          no_prepend_replace_as: localAsNoPrependReplaceAs,
        },
        local_role:
          localRole && localRole !== "__none__" ? localRole : null,
        local_role_strict: localRoleStrict,
        bfd: {
          enabled: bfdEnabled,
          check_control_plane_failure: bfdCheckControlPlane,
          profile: bfdProfile.trim() || null,
        },
        capability: {
          dynamic: capDynamic,
          extended_nexthop: capExtendedNexthop,
          software_version: capSoftwareVersion,
        },
        timers: {
          connect: timerConnect.trim()
            ? parseInt(timerConnect.trim(), 10)
            : null,
          keepalive: timerKeepalive.trim()
            ? parseInt(timerKeepalive.trim(), 10)
            : null,
          holdtime: timerHoldtime.trim()
            ? parseInt(timerHoldtime.trim(), 10)
            : null,
        },
        ttl_security_hops: ttlSecurityHops.trim()
          ? parseInt(ttlSecurityHops.trim(), 10)
          : null,
        address_families: addressFamilies,
      };

      await onSubmit(neighbor);
      handleClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Operation failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit BGP Neighbor" : "Add BGP Neighbor"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Modify the BGP neighbor configuration for ${existingNeighbor?.address}.`
              : "Configure a new BGP neighbor session."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 pb-2">
            {/* ============================================================ */}
            {/* SECTION 1 - BASIC SETTINGS                                   */}
            {/* ============================================================ */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Basic Settings</h4>
              <div className="space-y-4 rounded-lg border p-3">
                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-neighbor-address">Address</Label>
                  <Input
                    id="bgp-neighbor-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 192.0.2.1 or 2001:db8::1"
                    disabled={isEditMode}
                    className={isEditMode ? "bg-muted" : ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    IPv4 or IPv6 address of the BGP neighbor.
                  </p>
                </div>

                {/* Remote AS */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-neighbor-remote-as">Remote AS</Label>
                  <Input
                    id="bgp-neighbor-remote-as"
                    value={remoteAs}
                    onChange={(e) => setRemoteAs(e.target.value)}
                    placeholder='e.g. 65001, "internal", or "external"'
                  />
                  <p className="text-xs text-muted-foreground">
                    Autonomous System number, or &quot;internal&quot; /
                    &quot;external&quot;.
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-neighbor-description">Description</Label>
                  <Input
                    id="bgp-neighbor-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>

                {/* Peer Group */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-neighbor-peer-group">Peer Group</Label>
                  <Select value={peerGroup || "__none__"} onValueChange={setPeerGroup}>
                    <SelectTrigger id="bgp-neighbor-peer-group">
                      <SelectValue placeholder="Select peer group (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {peerGroups.map((pg) => (
                        <SelectItem key={pg} value={pg}>
                          {pg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Update Source */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-neighbor-update-source">
                    Update Source
                  </Label>
                  <Input
                    id="bgp-neighbor-update-source"
                    value={updateSource}
                    onChange={(e) => setUpdateSource(e.target.value)}
                    placeholder="e.g. eth0 or 192.0.2.1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Source address or interface for BGP sessions.
                  </p>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* SECTION 2 - STATUS & OPTIONS                                 */}
            {/* ============================================================ */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Status &amp; Options</h4>
              <div className="space-y-3 rounded-lg border p-3">
                {/* Shutdown */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bgp-neighbor-shutdown"
                    checked={shutdown}
                    onCheckedChange={(checked) =>
                      setShutdown(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bgp-neighbor-shutdown"
                      className="cursor-pointer text-destructive"
                    >
                      Shutdown
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Administratively disable this neighbor.
                    </p>
                  </div>
                </div>

                {/* Passive */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bgp-neighbor-passive"
                    checked={passive}
                    onCheckedChange={(checked) =>
                      setPassive(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bgp-neighbor-passive"
                      className="cursor-pointer"
                    >
                      Passive
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Do not initiate a session; wait for remote peer.
                    </p>
                  </div>
                </div>

                {/* Solo */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bgp-neighbor-solo"
                    checked={solo}
                    onCheckedChange={(checked) => setSolo(checked === true)}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bgp-neighbor-solo"
                      className="cursor-pointer"
                    >
                      Solo
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Solo peer (single adjacency in a group).
                    </p>
                  </div>
                </div>

                {/* Enforce First AS */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bgp-neighbor-enforce-first-as"
                    checked={enforceFirstAs}
                    onCheckedChange={(checked) =>
                      setEnforceFirstAs(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bgp-neighbor-enforce-first-as"
                      className="cursor-pointer"
                    >
                      Enforce First AS
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enforce the first AS in the AS path from this neighbor.
                    </p>
                  </div>
                </div>

                {/* Override Capability */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bgp-neighbor-override-capability"
                    checked={overrideCapability}
                    onCheckedChange={(checked) =>
                      setOverrideCapability(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bgp-neighbor-override-capability"
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
                    id="bgp-neighbor-disable-cap-negotiation"
                    checked={disableCapabilityNegotiation}
                    onCheckedChange={(checked) =>
                      setDisableCapabilityNegotiation(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bgp-neighbor-disable-cap-negotiation"
                      className="cursor-pointer"
                    >
                      Disable Capability Negotiation
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Suppress sending capability negotiation.
                    </p>
                  </div>
                </div>

                {/* Disable Connected Check */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bgp-neighbor-disable-connected-check"
                    checked={disableConnectedCheck}
                    onCheckedChange={(checked) =>
                      setDisableConnectedCheck(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bgp-neighbor-disable-connected-check"
                      className="cursor-pointer"
                    >
                      Disable Connected Check
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Allow peering with eBGP neighbors not on a directly
                      connected network.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* SECTION 3 - BFD                                              */}
            {/* ============================================================ */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">BFD</h4>
              <div className="space-y-4 rounded-lg border p-3">
                {/* Enable BFD */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bgp-neighbor-bfd-enabled"
                    checked={bfdEnabled}
                    onCheckedChange={(checked) =>
                      setBfdEnabled(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bgp-neighbor-bfd-enabled"
                      className="cursor-pointer"
                    >
                      Enable BFD
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable Bidirectional Forwarding Detection for this
                      neighbor.
                    </p>
                  </div>
                </div>

                {bfdEnabled && (
                  <>
                    {/* Check Control Plane Failure */}
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="bgp-neighbor-bfd-control-plane"
                        checked={bfdCheckControlPlane}
                        onCheckedChange={(checked) =>
                          setBfdCheckControlPlane(checked === true)
                        }
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor="bgp-neighbor-bfd-control-plane"
                          className="cursor-pointer"
                        >
                          Check Control Plane Failure
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Detect control-plane failures via BFD.
                        </p>
                      </div>
                    </div>

                    {/* BFD Profile */}
                    <div className="space-y-2">
                      <Label>BFD Profile</Label>
                      <Select value={bfdProfile || "__none__"} onValueChange={(v) => setBfdProfile(v === "__none__" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {bfdProfileNames.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ============================================================ */}
            {/* SECTION 4 - CAPABILITY                                       */}
            {/* ============================================================ */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Capability</h4>
              <div className="space-y-3 rounded-lg border p-3">
                {/* Dynamic */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bgp-neighbor-cap-dynamic"
                    checked={capDynamic}
                    onCheckedChange={(checked) =>
                      setCapDynamic(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bgp-neighbor-cap-dynamic"
                      className="cursor-pointer"
                    >
                      Dynamic
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Advertise dynamic capability.
                    </p>
                  </div>
                </div>

                {/* Extended Nexthop */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bgp-neighbor-cap-extended-nexthop"
                    checked={capExtendedNexthop}
                    onCheckedChange={(checked) =>
                      setCapExtendedNexthop(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bgp-neighbor-cap-extended-nexthop"
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
                    id="bgp-neighbor-cap-software-version"
                    checked={capSoftwareVersion}
                    onCheckedChange={(checked) =>
                      setCapSoftwareVersion(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bgp-neighbor-cap-software-version"
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
            {/* SECTION 5 - TIMERS                                           */}
            {/* ============================================================ */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Timers</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-lg border p-3">
                {/* Connect Timer */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-neighbor-timer-connect">
                    Connect Timer
                  </Label>
                  <Input
                    id="bgp-neighbor-timer-connect"
                    type="number"
                    value={timerConnect}
                    onChange={(e) => setTimerConnect(e.target.value)}
                    placeholder="Seconds"
                    min={1}
                  />
                </div>

                {/* Keepalive */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-neighbor-timer-keepalive">
                    Keepalive
                  </Label>
                  <Input
                    id="bgp-neighbor-timer-keepalive"
                    type="number"
                    value={timerKeepalive}
                    onChange={(e) => setTimerKeepalive(e.target.value)}
                    placeholder="Seconds"
                    min={1}
                  />
                </div>

                {/* Holdtime */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-neighbor-timer-holdtime">Holdtime</Label>
                  <Input
                    id="bgp-neighbor-timer-holdtime"
                    type="number"
                    value={timerHoldtime}
                    onChange={(e) => setTimerHoldtime(e.target.value)}
                    placeholder="Seconds"
                    min={0}
                  />
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* SECTION 6 - ADVANCED                                         */}
            {/* ============================================================ */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Advanced</h4>
              <div className="space-y-4 rounded-lg border p-3">
                <div className="grid grid-cols-2 gap-4">
                  {/* eBGP Multihop */}
                  <div className="space-y-2">
                    <Label htmlFor="bgp-neighbor-ebgp-multihop">
                      eBGP Multihop
                    </Label>
                    <Input
                      id="bgp-neighbor-ebgp-multihop"
                      type="number"
                      value={ebgpMultihop}
                      onChange={(e) => setEbgpMultihop(e.target.value)}
                      placeholder="Max hops (1-255)"
                      min={1}
                      max={255}
                    />
                  </div>

                  {/* Advertisement Interval */}
                  <div className="space-y-2">
                    <Label htmlFor="bgp-neighbor-adv-interval">
                      Advertisement Interval
                    </Label>
                    <Input
                      id="bgp-neighbor-adv-interval"
                      type="number"
                      value={advertisementInterval}
                      onChange={(e) =>
                        setAdvertisementInterval(e.target.value)
                      }
                      placeholder="Seconds"
                      min={0}
                    />
                  </div>

                  {/* TTL Security Hops */}
                  <div className="space-y-2">
                    <Label htmlFor="bgp-neighbor-ttl-security-hops">
                      TTL Security Hops
                    </Label>
                    <Input
                      id="bgp-neighbor-ttl-security-hops"
                      type="number"
                      value={ttlSecurityHops}
                      onChange={(e) => setTtlSecurityHops(e.target.value)}
                      placeholder="1-254"
                      min={1}
                      max={254}
                    />
                  </div>

                  {/* Port */}
                  <div className="space-y-2">
                    <Label htmlFor="bgp-neighbor-port">Port</Label>
                    <Input
                      id="bgp-neighbor-port"
                      type="number"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      placeholder="179"
                      min={1}
                      max={65535}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-neighbor-password">Password</Label>
                  <Input
                    id="bgp-neighbor-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="BGP session password (optional)"
                  />
                </div>

                {/* Graceful Restart */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-neighbor-graceful-restart">
                    Graceful Restart
                  </Label>
                  <Select
                    value={gracefulRestart || "__none__"}
                    onValueChange={setGracefulRestart}
                  >
                    <SelectTrigger id="bgp-neighbor-graceful-restart">
                      <SelectValue placeholder="Select graceful restart mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      <SelectItem value="enable">Enable</SelectItem>
                      <SelectItem value="disable">Disable</SelectItem>
                      <SelectItem value="restart">Restart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Local AS Number */}
                <div className="space-y-2">
                  <Label htmlFor="bgp-neighbor-local-as">
                    Local AS Number
                  </Label>
                  <Input
                    id="bgp-neighbor-local-as"
                    value={localAsAsn}
                    onChange={(e) => setLocalAsAsn(e.target.value)}
                    placeholder="Local AS number"
                  />
                </div>
                {localAsAsn.trim() && (
                  <div className="flex items-center space-x-3 pl-1">
                    <Checkbox
                      id="bgp-neighbor-local-as-no-prepend"
                      checked={localAsNoPrependReplaceAs}
                      onCheckedChange={(checked) =>
                        setLocalAsNoPrependReplaceAs(checked === true)
                      }
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="bgp-neighbor-local-as-no-prepend"
                        className="cursor-pointer"
                      >
                        No Prepend Replace AS
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Do not prepend local-as to updates from this peer and
                        replace the real AS in the AS path.
                      </p>
                    </div>
                  </div>
                )}

                {/* Local Role - only when capabilities support it */}
                {capabilities?.features.local_role.supported && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="bgp-neighbor-local-role">
                        Local Role
                      </Label>
                      <Select
                        value={localRole || "__none__"}
                        onValueChange={setLocalRole}
                      >
                        <SelectTrigger id="bgp-neighbor-local-role">
                          <SelectValue placeholder="Select local role (optional)" />
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
                    </div>
                    {localRole && localRole !== "__none__" && (
                      <div className="flex items-center space-x-3 pl-1">
                        <Checkbox
                          id="bgp-neighbor-local-role-strict"
                          checked={localRoleStrict}
                          onCheckedChange={(checked) =>
                            setLocalRoleStrict(checked === true)
                          }
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor="bgp-neighbor-local-role-strict"
                            className="cursor-pointer"
                          >
                            Strict Mode
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Require the remote peer to send the correct role.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ============================================================ */}
            {/* SECTION 7 - ADDRESS FAMILIES                                 */}
            {/* ============================================================ */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Address Families</h4>
              <div className="space-y-4 rounded-lg border p-3">
                {availableAFIs.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No address family types available. Load capabilities first.
                  </p>
                )}

                {availableAFIs.map((afi) => {
                  const isEnabled = !!addressFamilies[afi];
                  const afConfig = addressFamilies[afi] || emptyAfConfig();
                  return (
                    <div key={afi} className="space-y-3">
                      {/* AFI toggle */}
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`bgp-neighbor-af-${afi}`}
                          checked={isEnabled}
                          onCheckedChange={() => toggleAF(afi)}
                        />
                        <Label
                          htmlFor={`bgp-neighbor-af-${afi}`}
                          className="cursor-pointer font-medium"
                        >
                          {afi}
                        </Label>
                      </div>

                      {/* Per-AFI settings */}
                      {isEnabled && (
                        <div className="ml-7 space-y-4 rounded-lg border p-3">
                          {/* Route Maps */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`bgp-af-${afi}-rm-import`}>
                                Route Map Import
                              </Label>
                              <Select
                                value={afConfig.route_map_import || "__none__"}
                                onValueChange={(v) =>
                                  updateAfField(
                                    afi,
                                    "route_map_import",
                                    v === "__none__" ? null : v
                                  )
                                }
                              >
                                <SelectTrigger id={`bgp-af-${afi}-rm-import`}>
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">None</SelectItem>
                                  {routeMapNames.map((name) => (
                                    <SelectItem key={name} value={name}>{name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`bgp-af-${afi}-rm-export`}>
                                Route Map Export
                              </Label>
                              <Select
                                value={afConfig.route_map_export || "__none__"}
                                onValueChange={(v) =>
                                  updateAfField(
                                    afi,
                                    "route_map_export",
                                    v === "__none__" ? null : v
                                  )
                                }
                              >
                                <SelectTrigger id={`bgp-af-${afi}-rm-export`}>
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">None</SelectItem>
                                  {routeMapNames.map((name) => (
                                    <SelectItem key={name} value={name}>{name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Boolean options */}
                          <div className="space-y-3">
                            {/* Soft Reconfiguration Inbound */}
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id={`bgp-af-${afi}-soft-reconfig`}
                                checked={afConfig.soft_reconfiguration_inbound}
                                onCheckedChange={(checked) =>
                                  updateAfField(
                                    afi,
                                    "soft_reconfiguration_inbound",
                                    checked === true
                                  )
                                }
                              />
                              <Label
                                htmlFor={`bgp-af-${afi}-soft-reconfig`}
                                className="cursor-pointer"
                              >
                                Soft Reconfiguration Inbound
                              </Label>
                            </div>

                            {/* Next-Hop Self */}
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id={`bgp-af-${afi}-nexthop-self`}
                                checked={afConfig.nexthop_self}
                                onCheckedChange={(checked) =>
                                  updateAfField(
                                    afi,
                                    "nexthop_self",
                                    checked === true
                                  )
                                }
                              />
                              <Label
                                htmlFor={`bgp-af-${afi}-nexthop-self`}
                                className="cursor-pointer"
                              >
                                Next-Hop Self
                              </Label>
                            </div>

                            {/* Next-Hop Self Force (sub-option) */}
                            {afConfig.nexthop_self && (
                              <div className="flex items-center space-x-3 pl-6">
                                <Checkbox
                                  id={`bgp-af-${afi}-nexthop-self-force`}
                                  checked={afConfig.nexthop_self_force}
                                  onCheckedChange={(checked) =>
                                    updateAfField(
                                      afi,
                                      "nexthop_self_force",
                                      checked === true
                                    )
                                  }
                                />
                                <Label
                                  htmlFor={`bgp-af-${afi}-nexthop-self-force`}
                                  className="cursor-pointer"
                                >
                                  Force
                                </Label>
                              </div>
                            )}

                            {/* Route Reflector Client */}
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id={`bgp-af-${afi}-rr-client`}
                                checked={afConfig.route_reflector_client}
                                onCheckedChange={(checked) =>
                                  updateAfField(
                                    afi,
                                    "route_reflector_client",
                                    checked === true
                                  )
                                }
                              />
                              <Label
                                htmlFor={`bgp-af-${afi}-rr-client`}
                                className="cursor-pointer"
                              >
                                Route Reflector Client
                              </Label>
                            </div>

                            {/* Default Originate */}
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id={`bgp-af-${afi}-default-originate`}
                                checked={afConfig.default_originate}
                                onCheckedChange={(checked) =>
                                  updateAfField(
                                    afi,
                                    "default_originate",
                                    checked === true
                                  )
                                }
                              />
                              <Label
                                htmlFor={`bgp-af-${afi}-default-originate`}
                                className="cursor-pointer"
                              >
                                Default Originate
                              </Label>
                            </div>

                            {/* Default Originate Route Map (sub-option) */}
                            {afConfig.default_originate && (
                              <div className="space-y-2 pl-6">
                                <Label
                                  htmlFor={`bgp-af-${afi}-default-originate-rm`}
                                >
                                  Default Originate Route Map
                                </Label>
                                <Select
                                  value={afConfig.default_originate_route_map || "__none__"}
                                  onValueChange={(v) =>
                                    updateAfField(
                                      afi,
                                      "default_originate_route_map",
                                      v === "__none__" ? null : v
                                    )
                                  }
                                >
                                  <SelectTrigger id={`bgp-af-${afi}-default-originate-rm`}>
                                    <SelectValue placeholder="None" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">None</SelectItem>
                                    {routeMapNames.map((name) => (
                                      <SelectItem key={name} value={name}>{name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {/* AS Override */}
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id={`bgp-af-${afi}-as-override`}
                                checked={afConfig.as_override}
                                onCheckedChange={(checked) =>
                                  updateAfField(
                                    afi,
                                    "as_override",
                                    checked === true
                                  )
                                }
                              />
                              <Label
                                htmlFor={`bgp-af-${afi}-as-override`}
                                className="cursor-pointer"
                              >
                                AS Override
                              </Label>
                            </div>

                            {/* Remove Private AS */}
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id={`bgp-af-${afi}-remove-private-as`}
                                checked={afConfig.remove_private_as}
                                onCheckedChange={(checked) =>
                                  updateAfField(
                                    afi,
                                    "remove_private_as",
                                    checked === true
                                  )
                                }
                              />
                              <Label
                                htmlFor={`bgp-af-${afi}-remove-private-as`}
                                className="cursor-pointer"
                              >
                                Remove Private AS
                              </Label>
                            </div>

                            {/* Remove Private AS All (sub-option) */}
                            {afConfig.remove_private_as && (
                              <div className="flex items-center space-x-3 pl-6">
                                <Checkbox
                                  id={`bgp-af-${afi}-remove-private-as-all`}
                                  checked={afConfig.remove_private_as_all}
                                  onCheckedChange={(checked) =>
                                    updateAfField(
                                      afi,
                                      "remove_private_as_all",
                                      checked === true
                                    )
                                  }
                                />
                                <Label
                                  htmlFor={`bgp-af-${afi}-remove-private-as-all`}
                                  className="cursor-pointer"
                                >
                                  All
                                </Label>
                              </div>
                            )}
                          </div>

                          {/* Numeric fields */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Maximum Prefix */}
                            <div className="space-y-2">
                              <Label htmlFor={`bgp-af-${afi}-max-prefix`}>
                                Maximum Prefix
                              </Label>
                              <Input
                                id={`bgp-af-${afi}-max-prefix`}
                                type="number"
                                value={
                                  afConfig.maximum_prefix != null
                                    ? String(afConfig.maximum_prefix)
                                    : ""
                                }
                                onChange={(e) =>
                                  updateAfField(
                                    afi,
                                    "maximum_prefix",
                                    e.target.value
                                      ? parseInt(e.target.value, 10)
                                      : null
                                  )
                                }
                                placeholder="Max prefixes"
                                min={1}
                              />
                            </div>

                            {/* Allowas-In Number */}
                            <div className="space-y-2">
                              <Label htmlFor={`bgp-af-${afi}-allowas-in`}>
                                Allowas-In Number
                              </Label>
                              <Input
                                id={`bgp-af-${afi}-allowas-in`}
                                type="number"
                                value={
                                  afConfig.allowas_in_number != null
                                    ? String(afConfig.allowas_in_number)
                                    : ""
                                }
                                onChange={(e) =>
                                  updateAfField(
                                    afi,
                                    "allowas_in_number",
                                    e.target.value
                                      ? parseInt(e.target.value, 10)
                                      : null
                                  )
                                }
                                placeholder="Count"
                                min={1}
                                max={10}
                              />
                            </div>

                            {/* Weight */}
                            <div className="space-y-2">
                              <Label htmlFor={`bgp-af-${afi}-weight`}>
                                Weight
                              </Label>
                              <Input
                                id={`bgp-af-${afi}-weight`}
                                type="number"
                                value={
                                  afConfig.weight != null
                                    ? String(afConfig.weight)
                                    : ""
                                }
                                onChange={(e) =>
                                  updateAfField(
                                    afi,
                                    "weight",
                                    e.target.value
                                      ? parseInt(e.target.value, 10)
                                      : null
                                  )
                                }
                                placeholder="Weight"
                                min={0}
                                max={65535}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
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
              "Add Neighbor"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
