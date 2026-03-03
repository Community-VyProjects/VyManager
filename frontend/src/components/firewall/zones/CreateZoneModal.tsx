"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, Plus, X } from "lucide-react";
import { firewallZonesService } from "@/lib/api/firewall-zones";
import type { FirewallZone, ZonesCapabilities } from "@/lib/api/types/firewall-zones";

interface CreateZoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: ZonesCapabilities | null;
  existingZones: FirewallZone[];
}

const ZONE_NAME_RE = /^[a-zA-Z0-9][\w\-.]*$/;

export function CreateZoneModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingZones,
}: CreateZoneModalProps) {
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState<string | null>(null);
  const [chainErrors, setChainErrors] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [zoneName, setZoneName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultAction, setDefaultAction] = useState("drop");
  const [defaultLog, setDefaultLog] = useState(false);
  const [localZone, setLocalZone] = useState(false);
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [ifaceInput, setIfaceInput] = useState("");
  const [vrfs, setVrfs] = useState<string[]>([]);
  const [vrfInput, setVrfInput] = useState("");
  const [defaultFirewallName, setDefaultFirewallName] = useState("");
  const [defaultFirewallIpv6, setDefaultFirewallIpv6] = useState("");
  const [autoCreateChains, setAutoCreateChains] = useState(true);

  const nonLocalPeers = existingZones.filter((z) => !z.local_zone);

  const reset = () => {
    setZoneName("");
    setDescription("");
    setDefaultAction("drop");
    setDefaultLog(false);
    setLocalZone(false);
    setInterfaces([]);
    setIfaceInput("");
    setVrfs([]);
    setVrfInput("");
    setDefaultFirewallName("");
    setDefaultFirewallIpv6("");
    setAutoCreateChains(true);
    setError(null);
    setProgressStep(null);
    setChainErrors([]);
    setDone(false);
  };

  const handleClose = () => {
    // If we completed successfully (even with chain errors), refresh
    if (done) onSuccess();
    reset();
    onOpenChange(false);
  };

  const addItem = (
    input: string,
    list: string[],
    setter: (v: string[]) => void,
    inputSetter: (v: string) => void
  ) => {
    const val = input.trim();
    if (val && !list.includes(val)) {
      setter([...list, val]);
      inputSetter("");
    }
  };

  const removeItem = (val: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.filter((x) => x !== val));
  };

  const handleSubmit = async () => {
    if (!zoneName.trim()) {
      setError("Zone name is required");
      return;
    }
    if (!ZONE_NAME_RE.test(zoneName)) {
      setError(
        "Zone name must start with alphanumeric and contain only letters, numbers, hyphens, underscores, or dots"
      );
      return;
    }
    if (existingZones.some((z) => z.name === zoneName)) {
      setError(`Zone "${zoneName}" already exists`);
      return;
    }

    setLoading(true);
    setError(null);
    setProgressStep(null);
    setChainErrors([]);
    setDone(false);

    const zoneConfig = {
      description: description || null,
      default_action: defaultAction,
      default_log: defaultLog,
      local_zone: localZone,
      interfaces: localZone ? [] : interfaces,
      vrfs: localZone ? [] : vrfs,
      default_firewall:
        capabilities?.features.default_firewall.supported
          ? {
              name: defaultFirewallName || null,
              ipv6_name: defaultFirewallIpv6 || null,
            }
          : null,
    };

    try {
      if (autoCreateChains && nonLocalPeers.length > 0 && !localZone) {
        const result = await firewallZonesService.createZoneWithChains(
          zoneName,
          zoneConfig,
          capabilities,
          nonLocalPeers,
          (step) => setProgressStep(step)
        );
        setChainErrors(result.chainErrors);
        setDone(true);
      } else {
        setProgressStep("Creating zone…");
        await firewallZonesService.createZone(zoneName, zoneConfig, capabilities);
        setProgressStep("Done");
        setDone(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create zone");
      setProgressStep(null);
    } finally {
      setLoading(false);
    }
  };

  const supportsVrf = capabilities?.features.member_vrf.supported ?? false;
  const supportsDefaultFirewall = capabilities?.features.default_firewall.supported ?? false;

  // After completion, show summary state
  if (done) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Zone Created
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-sm">
              Zone <span className="font-mono font-semibold">{zoneName}</span> was created successfully.
            </p>

            {autoCreateChains && nonLocalPeers.length > 0 && !localZone && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Auto-provisioned firewall chains:</p>
                <div className="flex flex-wrap gap-1">
                  {nonLocalPeers.map((peer) => (
                    <Badge key={`${zoneName}-${peer.name}`} variant="secondary" className="font-mono text-xs">
                      {zoneName}-{peer.name}
                    </Badge>
                  ))}
                  {nonLocalPeers.map((peer) => (
                    <Badge key={`${peer.name}-${zoneName}`} variant="secondary" className="font-mono text-xs">
                      {peer.name}-{zoneName}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  IPv4 chains and -V6 IPv6 chains were created for all pairs. Default action: drop.
                </p>
              </div>
            )}

            {chainErrors.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Some chains could not be created:
                </p>
                {chainErrors.map((e, i) => (
                  <p key={i} className="text-xs font-mono text-amber-600 dark:text-amber-300">
                    {e}
                  </p>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Firewall Zone</DialogTitle>
          <DialogDescription>
            Create a new firewall zone. Firewall policy chains will be automatically
            provisioned for each existing zone pair.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <pre className="text-sm text-destructive whitespace-pre-wrap font-mono break-all">{error}</pre>
            </div>
          )}

          {progressStep && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              {progressStep}
            </div>
          )}

          {/* Basic */}
          <div className="space-y-4">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic</p>

            <div className="space-y-2">
              <Label htmlFor="zone-name">
                Zone Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="zone-name"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="e.g., LAN, WAN, DMZ"
                className="font-mono"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Letters, numbers, hyphens, underscores, dots. Must start with alphanumeric.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default-action">Default Action</Label>
                <Select value={defaultAction} onValueChange={setDefaultAction} disabled={loading}>
                  <SelectTrigger id="default-action">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="drop">Drop</SelectItem>
                    <SelectItem value="reject">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Default Log</Label>
                <div className="flex items-center gap-2 h-10">
                  <Checkbox
                    id="default-log"
                    checked={defaultLog}
                    onCheckedChange={(v) => setDefaultLog(!!v)}
                    disabled={loading}
                  />
                  <label htmlFor="default-log" className="text-sm cursor-pointer">
                    Log default-action packets
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Zone Type */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Zone Type</p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="local-zone"
                checked={localZone}
                onCheckedChange={(v) => setLocalZone(!!v)}
                disabled={loading}
              />
              <label htmlFor="local-zone" className="text-sm cursor-pointer">
                Local Zone (router&apos;s own traffic — disables interface assignment)
              </label>
            </div>
          </div>

          {/* Interfaces */}
          {!localZone && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Interfaces</p>
              <div className="space-y-2">
                <Label>Member Interfaces</Label>
                <div className="flex gap-2">
                  <Input
                    value={ifaceInput}
                    onChange={(e) => setIfaceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addItem(ifaceInput, interfaces, setInterfaces, setIfaceInput);
                      }
                    }}
                    placeholder="e.g., eth0, eth1.10"
                    className="font-mono"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => addItem(ifaceInput, interfaces, setInterfaces, setIfaceInput)}
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {interfaces.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {interfaces.map((iface) => (
                      <Badge key={iface} variant="secondary" className="font-mono gap-1">
                        {iface}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeItem(iface, interfaces, setInterfaces)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {supportsVrf && (
                <div className="space-y-2">
                  <Label>Member VRFs</Label>
                  <div className="flex gap-2">
                    <Input
                      value={vrfInput}
                      onChange={(e) => setVrfInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addItem(vrfInput, vrfs, setVrfs, setVrfInput);
                        }
                      }}
                      placeholder="e.g., mgmt"
                      className="font-mono"
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => addItem(vrfInput, vrfs, setVrfs, setVrfInput)}
                      disabled={loading}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {vrfs.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {vrfs.map((vrf) => (
                        <Badge key={vrf} variant="secondary" className="font-mono gap-1">
                          {vrf}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => removeItem(vrf, vrfs, setVrfs)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Default Firewall */}
          {supportsDefaultFirewall && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Default Firewall
              </p>
              <p className="text-xs text-muted-foreground">
                Applied to traffic that matches the zone&apos;s default action (VyOS 1.5+)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="def-fw-name">IPv4 Ruleset</Label>
                  <Input
                    id="def-fw-name"
                    value={defaultFirewallName}
                    onChange={(e) => setDefaultFirewallName(e.target.value)}
                    placeholder="e.g., DEFAULT_DROP"
                    className="font-mono"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="def-fw-ipv6">IPv6 Ruleset</Label>
                  <Input
                    id="def-fw-ipv6"
                    value={defaultFirewallIpv6}
                    onChange={(e) => setDefaultFirewallIpv6(e.target.value)}
                    placeholder="e.g., DEFAULT_DROP_V6"
                    className="font-mono"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Auto-create chains */}
          {!localZone && nonLocalPeers.length > 0 && (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="auto-chains"
                  checked={autoCreateChains}
                  onCheckedChange={(v) => setAutoCreateChains(!!v)}
                  disabled={loading}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <label htmlFor="auto-chains" className="text-sm font-medium cursor-pointer">
                    Auto-create firewall policy chains
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Creates IPv4 and IPv6 firewall chains for every zone pair and wires
                    up from-zone assignments automatically. Chains use{" "}
                    <span className="font-mono">FROM-TO</span> naming with default action drop.
                  </p>
                  {autoCreateChains && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {nonLocalPeers.map((peer) => (
                        <Badge key={`${zoneName || "ZONE"}-${peer.name}`} variant="outline" className="font-mono text-xs">
                          {zoneName || "ZONE"}-{peer.name}
                        </Badge>
                      ))}
                      {nonLocalPeers.map((peer) => (
                        <Badge key={`${peer.name}-${zoneName || "ZONE"}`} variant="outline" className="font-mono text-xs">
                          {peer.name}-{zoneName || "ZONE"}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating…
              </>
            ) : (
              "Create Zone"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
