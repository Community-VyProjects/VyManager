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
import { AlertCircle, Loader2, Trash2, X } from "lucide-react";
import { firewallZonesService } from "@/lib/api/firewall-zones";
import { showService } from "@/lib/api/show";
import type { InterfaceName } from "@/lib/api/show";
import type { FirewallZone, ZonesCapabilities } from "@/lib/api/types/firewall-zones";

interface EditZoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  zone: FirewallZone;
  capabilities: ZonesCapabilities | null;
  /** Other non-local zones (peers) — used when deprovisioning */
  peerZones: string[];
  /** True when this is the last non-local zone (deleting it also removes LOCAL) */
  isLastNonLocalZone: boolean;
}

export function EditZoneModal({
  open,
  onOpenChange,
  onSuccess,
  zone,
  capabilities,
  peerZones,
  isLastNonLocalZone,
}: EditZoneModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Available interfaces from show endpoint
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [loadingInterfaces, setLoadingInterfaces] = useState(false);

  // Editable state
  const [description, setDescription] = useState(zone.description ?? "");
  const [defaultAction, setDefaultAction] = useState(zone.default_action ?? "drop");
  const [defaultLog, setDefaultLog] = useState(zone.default_log);
  const [interfaces, setInterfaces] = useState<string[]>([...zone.interfaces]);
  const [vrfs, setVrfs] = useState<string[]>([...zone.vrfs]);
  const [vrfInput, setVrfInput] = useState("");

  // Sync when zone prop changes
  useEffect(() => {
    if (!open) return;
    setDescription(zone.description ?? "");
    setDefaultAction(zone.default_action ?? "drop");
    setDefaultLog(zone.default_log);
    setInterfaces([...zone.interfaces]);
    setVrfs([...zone.vrfs]);
    setVrfInput("");
    setError(null);
    setConfirmDelete(false);

    if (!zone.local_zone) {
      setLoadingInterfaces(true);
      showService
        .getAllInterfaces()
        .then((res) => setAvailableInterfaces(res.interfaces))
        .catch(() => setAvailableInterfaces([]))
        .finally(() => setLoadingInterfaces(false));
    }
  }, [open, zone]);

  const handleClose = () => {
    setError(null);
    setConfirmDelete(false);
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

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await firewallZonesService.updateZone(
        zone.name,
        zone,
        {
          description: description || null,
          default_action: defaultAction,
          default_log: defaultLog,
          interfaces: zone.local_zone ? [] : interfaces,
          vrfs: zone.local_zone ? [] : vrfs,
        },
        capabilities
      );
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update zone");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleteLoading(true);
    setError(null);
    try {
      await firewallZonesService.deprovisionZone(zone.name, peerZones, isLastNonLocalZone);
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete zone");
    } finally {
      setDeleteLoading(false);
    }
  };

  const supportsVrf = capabilities?.features.member_vrf.supported ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Zone: {zone.name}</DialogTitle>
          <DialogDescription>
            {zone.local_zone
              ? "The LOCAL zone is managed automatically. You can update the description and default action."
              : "Modify firewall zone configuration. Zone name cannot be changed."}
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
              <Label>Zone Name</Label>
              <Input value={zone.name} disabled className="font-mono bg-muted/50" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-default-action">Default Action</Label>
                <Select value={defaultAction} onValueChange={setDefaultAction}>
                  <SelectTrigger id="edit-default-action">
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
                    id="edit-default-log"
                    checked={defaultLog}
                    onCheckedChange={(v) => setDefaultLog(!!v)}
                  />
                  <label htmlFor="edit-default-log" className="text-sm cursor-pointer">
                    Log default-action packets
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Interfaces (only for non-local zones) */}
          {!zone.local_zone && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Interfaces</p>

              <div className="space-y-2">
                <Label>Member Interfaces</Label>
                {loadingInterfaces ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading interfaces…
                  </div>
                ) : availableInterfaces.length > 0 ? (
                  <div className="border rounded-md max-h-44 overflow-y-auto p-2 space-y-1">
                    {availableInterfaces.map((iface) => (
                      <div key={iface.name} className="flex items-center gap-2 py-0.5">
                        <Checkbox
                          id={`edit-iface-${iface.name}`}
                          checked={interfaces.includes(iface.name)}
                          onCheckedChange={() => toggleInterface(iface.name)}
                        />
                        <label
                          htmlFor={`edit-iface-${iface.name}`}
                          className="text-sm font-mono cursor-pointer flex-1"
                        >
                          {iface.name}
                          {iface.type && (
                            <span className="text-xs text-muted-foreground ml-2 font-sans">{iface.type}</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No interfaces found</p>
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
                    />
                    <Button type="button" size="sm" onClick={addVrf}>
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
          )}

          {/* Delete warning for last zone */}
          {confirmDelete && isLastNonLocalZone && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-400">
              This is the last zone. Deleting it will also remove the LOCAL zone and all associated firewall chains.
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          {/* Local zones cannot be manually deleted */}
          {!zone.local_zone && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || deleteLoading}
              className="mr-auto"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1" />
                  {confirmDelete ? "Confirm Delete" : "Delete Zone"}
                </>
              )}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            {confirmDelete && (
              <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleteLoading}>
                Cancel Delete
              </Button>
            )}
            <Button variant="outline" onClick={handleClose} disabled={loading || deleteLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || deleteLoading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
