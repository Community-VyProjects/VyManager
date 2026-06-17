"use client";

import { useState, useEffect } from "react";
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
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { firewallZonesService } from "@/lib/api/firewall-zones";
import { showService } from "@/lib/api/show";
import type { InterfaceName } from "@/lib/api/show";
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
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available interfaces from show endpoint
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [loadingInterfaces, setLoadingInterfaces] = useState(false);

  // Form fields
  const [zoneName, setZoneName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultAction, setDefaultAction] = useState("drop");
  const [defaultLog, setDefaultLog] = useState(false);
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [vrfs, setVrfs] = useState<string[]>([]);
  const [vrfInput, setVrfInput] = useState("");

  const nonLocalPeers = existingZones.filter((z) => !z.local_zone);
  const isFirstZone = nonLocalPeers.length === 0;

  // Interfaces already assigned to an existing zone — exclude from selection
  const usedInterfaces = new Set(existingZones.flatMap((z) => z.interfaces));

  // Load interfaces when modal opens
  useEffect(() => {
    if (!open) return;
    setLoadingInterfaces(true);
    showService
      .getAllInterfaces()
      .then((res) => setAvailableInterfaces(res.interfaces))
      .catch(() => setAvailableInterfaces([]))
      .finally(() => setLoadingInterfaces(false));
  }, [open]);

  const reset = () => {
    setZoneName("");
    setDescription("");
    setDefaultAction("drop");
    setDefaultLog(false);
    setInterfaces([]);
    setVrfs([]);
    setVrfInput("");
    setError(null);
    setDone(false);
    setAvailableInterfaces([]);
  };

  const handleClose = () => {
    if (done) onSuccess();
    reset();
    onOpenChange(false);
  };

  const toggleInterface = (name: string) => {
    setInterfaces((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );
  };

  const addVrf = () => {
    const val = vrfInput.trim();
    if (val && !vrfs.includes(val)) {
      setVrfs([...vrfs, val]);
      setVrfInput("");
    }
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
    if (interfaces.length === 0) {
      setError("At least one interface must be selected");
      return;
    }
    if (existingZones.some((z) => z.name === zoneName)) {
      setError(`Zone "${zoneName}" already exists`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await firewallZonesService.provisionZone(
        zoneName,
        {
          description: description || null,
          defaultAction,
          defaultLog,
          interfaces,
          vrfs,
        },
        nonLocalPeers.map((z) => z.name),
        isFirstZone
      );
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create zone");
    } finally {
      setLoading(false);
    }
  };

  const supportsVrf = capabilities?.features.member_vrf.supported ?? false;

  // Success summary screen
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
              Zone <span className="font-mono font-semibold">{zoneName}</span> was provisioned successfully.
            </p>

            {isFirstZone && (
              <p className="text-sm text-muted-foreground">
                A <span className="font-mono">LOCAL</span> zone was automatically created for the router&apos;s own traffic.
              </p>
            )}

            {nonLocalPeers.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Auto-provisioned firewall chains:</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {zoneName}-{zoneName}
                  </Badge>
                  {nonLocalPeers.map((peer) => (
                    <Badge key={`a4-${peer.name}`} variant="secondary" className="font-mono text-xs">
                      {zoneName}-{peer.name}
                    </Badge>
                  ))}
                  {nonLocalPeers.map((peer) => (
                    <Badge key={`b4-${peer.name}`} variant="secondary" className="font-mono text-xs">
                      {peer.name}-{zoneName}
                    </Badge>
                  ))}
                  <Badge variant="secondary" className="font-mono text-xs">
                    LOCAL-{zoneName}
                  </Badge>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {zoneName}-LOCAL
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  IPv4 chains and -V6 IPv6 variants created for all pairs. Each chain has rule 10 accept-all — delete it to start restricting traffic.
                </p>
              </div>
            )}

            {isFirstZone && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Provisioned chains:</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="font-mono text-xs">{zoneName}-{zoneName}</Badge>
                  <Badge variant="secondary" className="font-mono text-xs">LOCAL-{zoneName}</Badge>
                  <Badge variant="secondary" className="font-mono text-xs">{zoneName}-LOCAL</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Each chain has rule 10 accept-all. Delete rule 10 to restrict traffic.
                </p>
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
            Firewall policy chains are automatically provisioned for all zone pairs.
            {isFirstZone && " A LOCAL zone will also be created for the router's own traffic."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <pre className="text-sm text-destructive whitespace-pre-wrap font-mono break-all">{error}</pre>
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

          {/* Interfaces */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Interfaces</p>

            <div className="space-y-2">
              <Label>Member Interfaces</Label>
              {loadingInterfaces ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading interfaces…
                </div>
              ) : availableInterfaces.filter((i) => !usedInterfaces.has(i.name)).length > 0 ? (
                <div className="border rounded-md max-h-44 overflow-y-auto p-2 space-y-1">
                  {availableInterfaces.filter((i) => !usedInterfaces.has(i.name)).map((iface) => (
                    <div key={iface.name} className="flex items-center gap-2 py-0.5">
                      <Checkbox
                        id={`iface-${iface.name}`}
                        checked={interfaces.includes(iface.name)}
                        onCheckedChange={() => toggleInterface(iface.name)}
                        disabled={loading}
                      />
                      <label
                        htmlFor={`iface-${iface.name}`}
                        className="text-sm font-mono cursor-pointer flex-1"
                      >
                        {iface.name}
                        {iface.description && (
                          <span className="text-xs text-muted-foreground ml-2 font-sans">{iface.description}</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {availableInterfaces.length > 0
                    ? "All interfaces are already assigned to a zone"
                    : "No interfaces found"}
                </p>
              )}

              {interfaces.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {interfaces.map((iface) => (
                    <Badge key={iface} variant="secondary" className="font-mono gap-1">
                      {iface}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => toggleInterface(iface)}
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
                        addVrf();
                      }
                    }}
                    placeholder="e.g., mgmt"
                    className="font-mono"
                    disabled={loading}
                  />
                  <Button type="button" size="sm" onClick={addVrf} disabled={loading}>
                    Add
                  </Button>
                </div>
                {vrfs.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {vrfs.map((vrf) => (
                      <Badge key={vrf} variant="secondary" className="font-mono gap-1">
                        {vrf}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => setVrfs(vrfs.filter((v) => v !== vrf))}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chain preview */}
          {(nonLocalPeers.length > 0 || isFirstZone) && zoneName && (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Will be provisioned
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="font-mono text-xs">{zoneName}-{zoneName}</Badge>
                {nonLocalPeers.map((peer) => (
                  <Badge key={`p-${peer.name}`} variant="outline" className="font-mono text-xs">
                    {zoneName}-{peer.name}
                  </Badge>
                ))}
                {nonLocalPeers.map((peer) => (
                  <Badge key={`r-${peer.name}`} variant="outline" className="font-mono text-xs">
                    {peer.name}-{zoneName}
                  </Badge>
                ))}
                <Badge variant="outline" className="font-mono text-xs">LOCAL-{zoneName}</Badge>
                <Badge variant="outline" className="font-mono text-xs">{zoneName}-LOCAL</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                IPv4 chains and -V6 IPv6 variants · Rule 10 accept-all in each chain · Delete rule 10 to start restricting
              </p>
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
                Provisioning…
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
