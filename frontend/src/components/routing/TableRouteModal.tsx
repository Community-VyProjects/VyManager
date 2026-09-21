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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import type { RoutingTable, StaticRoute } from "@/lib/api/static-routes";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  emptyInterfaceDraft,
  emptyNextHopDraft,
  emptyTableRouteDraft,
  submitTableRouteCreate,
  submitTableRouteUpdate,
  tableRouteDraftFrom,
  validateTableRouteCreate,
  validateTableRouteEdit,
  type TableRouteDraft,
} from "./static-routes-form";

interface TableRouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  table: RoutingTable | null;
  existing?: StaticRoute | null;
}

export function TableRouteModal({
  open,
  onOpenChange,
  onSuccess,
  table,
  existing,
}: TableRouteModalProps) {
  const isEdit = modalIsEdit(existing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [draft, setDraft] = useState<TableRouteDraft>(emptyTableRouteDraft());

  useEffect(() => {
    if (!open) return;
    showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch((err) => {
      console.error("Failed to load interfaces:", err);
    });
    if (existing) {
      setDraft(tableRouteDraftFrom(existing));
    } else {
      setDraft(emptyTableRouteDraft());
    }
    setError(null);
  }, [open, existing]);

  const patch = (fields: Partial<TableRouteDraft>) => setDraft((d) => ({ ...d, ...fields }));
  const lockedDestination = lockedIdentity(existing, (r) => r.destination, draft.destination);

  const handleSubmit = async () => {
    if (!table) return;
    const validationError = isEdit
      ? validateTableRouteEdit(draft)
      : validateTableRouteCreate(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    const write = modalWriteKind(existing ? { name: existing.destination } : null);
    setLoading(true);
    setError(null);

    try {
      const result =
        write.kind === "update" && existing
          ? await submitTableRouteUpdate(table.table_id, existing, draft)
          : await submitTableRouteCreate(table.table_id, draft);
      if (result && result.success === false) {
        setError(result.error || "Operation failed");
        return;
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : isEdit ? "Failed to update route" : "Failed to create route");
    } finally {
      setLoading(false);
    }
  };

  const addNextHop = () => patch({ nextHops: [...draft.nextHops, emptyNextHopDraft()] });
  const removeNextHop = (index: number) => patch({ nextHops: draft.nextHops.filter((_, i) => i !== index) });
  const updateNextHop = (index: number, field: "address" | "distance" | "disable", value: string | boolean) => {
    const nextHops = [...draft.nextHops];
    nextHops[index] = { ...nextHops[index], [field]: value } as TableRouteDraft["nextHops"][number];
    patch({ nextHops });
  };

  const addInterface = () => patch({ interfaces: [...draft.interfaces, emptyInterfaceDraft()] });
  const removeInterface = (index: number) => patch({ interfaces: draft.interfaces.filter((_, i) => i !== index) });
  const updateInterface = (index: number, field: "interface" | "distance" | "disable", value: string | boolean) => {
    const interfaces = [...draft.interfaces];
    interfaces[index] = { ...interfaces[index], [field]: value } as TableRouteDraft["interfaces"][number];
    patch({ interfaces });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? `Edit Route in Table ${table?.table_id ?? ""}`
              : `Add Route to Table ${table?.table_id ?? ""}`}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Modify route ${existing.destination} (${existing.route_type.toUpperCase()})`
              : "Create a new static route in this routing table"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {isEdit ? (
            <div className="space-y-2">
              <Label>Destination (CIDR)</Label>
              <Input value={lockedDestination.value} disabled className="bg-muted font-mono" />
              <p className="text-xs text-muted-foreground">
                Destination cannot be changed. Delete and recreate to change destination.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Route Type</Label>
                <Select value={draft.routeType} onValueChange={(v) => patch({ routeType: v as "ipv4" | "ipv6" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ipv4">IPv4</SelectItem>
                    <SelectItem value="ipv6">IPv6</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">Destination (CIDR)</Label>
                <Input
                  id="destination"
                  placeholder={draft.routeType === "ipv4" ? "10.0.0.0/8" : "2001:db8::/32"}
                  value={draft.destination}
                  onChange={(e) => patch({ destination: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="Route description"
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Next Hops</Label>
              <Button type="button" variant="outline" size="sm" onClick={addNextHop}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            {draft.nextHops.map((nh, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Next-hop address"
                    value={nh.address}
                    onChange={(e) => updateNextHop(index, "address", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Distance"
                    type="number"
                    min="1"
                    max="255"
                    value={nh.distance}
                    onChange={(e) => updateNextHop(index, "distance", e.target.value)}
                    className="w-24"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeNextHop(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`nh-disable-${index}`}
                    checked={nh.disable}
                    onCheckedChange={(checked) => updateNextHop(index, "disable", !!checked)}
                  />
                  <Label htmlFor={`nh-disable-${index}`} className="text-sm">Disable</Label>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Interfaces</Label>
              <Button type="button" variant="outline" size="sm" onClick={addInterface}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            {draft.interfaces.map((iface, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <InterfaceSelect
                    value={iface.interface}
                    onValueChange={(value) => updateInterface(index, "interface", value)}
                    interfaces={availableInterfaces}
                    className="flex-1"
                    placeholder="Select interface..."
                  />
                  <Input
                    placeholder="Distance"
                    type="number"
                    min="1"
                    max="255"
                    value={iface.distance}
                    onChange={(e) => updateInterface(index, "distance", e.target.value)}
                    className="w-24"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeInterface(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`iface-disable-${index}`}
                    checked={iface.disable}
                    onCheckedChange={(checked) => updateInterface(index, "disable", !!checked)}
                  />
                  <Label htmlFor={`iface-disable-${index}`} className="text-sm">Disable</Label>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="blackhole"
                  checked={draft.isBlackhole}
                  onCheckedChange={(checked) => {
                    patch({ isBlackhole: !!checked, isReject: checked ? false : draft.isReject });
                  }}
                />
                <Label htmlFor="blackhole">Blackhole</Label>
              </div>
              {draft.isBlackhole && (
                <Input
                  placeholder="Distance"
                  type="number"
                  min="1"
                  max="255"
                  value={draft.blackholeDistance}
                  onChange={(e) => patch({ blackholeDistance: e.target.value })}
                />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="reject"
                  checked={draft.isReject}
                  onCheckedChange={(checked) => {
                    patch({ isReject: !!checked, isBlackhole: checked ? false : draft.isBlackhole });
                  }}
                />
                <Label htmlFor="reject">Reject</Label>
              </div>
              {draft.isReject && (
                <Input
                  placeholder="Distance"
                  type="number"
                  min="1"
                  max="255"
                  value={draft.rejectDistance}
                  onChange={(e) => patch({ rejectDistance: e.target.value })}
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Route"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
