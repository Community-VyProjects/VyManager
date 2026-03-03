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
import { AlertCircle, Plus, Trash2, X } from "lucide-react";
import { firewallZonesService } from "@/lib/api/firewall-zones";
import type { FirewallZone, ZonesCapabilities } from "@/lib/api/types/firewall-zones";

interface EditZoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  zone: FirewallZone;
  capabilities: ZonesCapabilities | null;
}

export function EditZoneModal({ open, onOpenChange, onSuccess, zone, capabilities }: EditZoneModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Editable state
  const [description, setDescription] = useState(zone.description ?? "");
  const [defaultAction, setDefaultAction] = useState(zone.default_action ?? "drop");
  const [defaultLog, setDefaultLog] = useState(zone.default_log);
  const [localZone, setLocalZone] = useState(zone.local_zone);
  const [interfaces, setInterfaces] = useState<string[]>([...zone.interfaces]);
  const [ifaceInput, setIfaceInput] = useState("");
  const [vrfs, setVrfs] = useState<string[]>([...zone.vrfs]);
  const [vrfInput, setVrfInput] = useState("");
  const [defaultFirewallName, setDefaultFirewallName] = useState(zone.default_firewall?.name ?? "");
  const [defaultFirewallIpv6, setDefaultFirewallIpv6] = useState(zone.default_firewall?.ipv6_name ?? "");

  // Sync when zone prop changes (e.g., re-opened for a different zone)
  useEffect(() => {
    if (open) {
      setDescription(zone.description ?? "");
      setDefaultAction(zone.default_action ?? "drop");
      setDefaultLog(zone.default_log);
      setLocalZone(zone.local_zone);
      setInterfaces([...zone.interfaces]);
      setVrfs([...zone.vrfs]);
      setDefaultFirewallName(zone.default_firewall?.name ?? "");
      setDefaultFirewallIpv6(zone.default_firewall?.ipv6_name ?? "");
      setError(null);
      setConfirmDelete(false);
    }
  }, [open, zone]);

  const handleClose = () => {
    setError(null);
    setConfirmDelete(false);
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
          local_zone: localZone,
          interfaces: localZone ? [] : interfaces,
          vrfs: localZone ? [] : vrfs,
          default_firewall: capabilities?.features.default_firewall.supported
            ? { name: defaultFirewallName || null, ipv6_name: defaultFirewallIpv6 || null }
            : undefined,
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
      await firewallZonesService.deleteZone(zone.name);
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete zone");
    } finally {
      setDeleteLoading(false);
    }
  };

  const supportsVrf = capabilities?.features.member_vrf.supported ?? false;
  const supportsDefaultFirewall = capabilities?.features.default_firewall.supported ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Zone: {zone.name}</DialogTitle>
          <DialogDescription>
            Modify firewall zone configuration. Zone name cannot be changed.
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

          {/* Zone Type */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Zone Type</p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-local-zone"
                checked={localZone}
                onCheckedChange={(v) => setLocalZone(!!v)}
              />
              <label htmlFor="edit-local-zone" className="text-sm cursor-pointer">
                Local Zone (router&apos;s own traffic)
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
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => addItem(ifaceInput, interfaces, setInterfaces, setIfaceInput)}
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
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => addItem(vrfInput, vrfs, setVrfs, setVrfInput)}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-def-fw-name">IPv4 Ruleset</Label>
                  <Input
                    id="edit-def-fw-name"
                    value={defaultFirewallName}
                    onChange={(e) => setDefaultFirewallName(e.target.value)}
                    placeholder="e.g., DEFAULT_DROP"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-def-fw-ipv6">IPv6 Ruleset</Label>
                  <Input
                    id="edit-def-fw-ipv6"
                    value={defaultFirewallIpv6}
                    onChange={(e) => setDefaultFirewallIpv6(e.target.value)}
                    placeholder="e.g., DEFAULT_DROP_V6"
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || deleteLoading}
            className="mr-auto"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {confirmDelete ? "Confirm Delete" : "Delete Zone"}
          </Button>
          <div className="flex gap-2">
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
