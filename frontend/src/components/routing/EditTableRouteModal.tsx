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
import { staticRoutesService, type RoutingTable, type StaticRoute } from "@/lib/api/static-routes";
import { showService } from "@/lib/api/show";

interface EditTableRouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  table: RoutingTable | null;
  route: StaticRoute | null;
}

interface NextHopEntry {
  address: string;
  distance: string;
  disable: boolean;
}

interface InterfaceEntry {
  interface: string;
  distance: string;
  disable: boolean;
}

export function EditTableRouteModal({
  open,
  onOpenChange,
  onSuccess,
  table,
  route,
}: EditTableRouteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<string[]>([]);

  const [description, setDescription] = useState("");
  const [nextHops, setNextHops] = useState<NextHopEntry[]>([]);
  const [interfaces, setInterfaces] = useState<InterfaceEntry[]>([]);
  const [isBlackhole, setIsBlackhole] = useState(false);
  const [blackholeDistance, setBlackholeDistance] = useState("");
  const [isReject, setIsReject] = useState(false);
  const [rejectDistance, setRejectDistance] = useState("");

  useEffect(() => {
    if (open && route) {
      loadInterfaces();
      populateForm(route);
    }
  }, [open, route]);

  const loadInterfaces = async () => {
    try {
      const response = await showService.getAllInterfaces();
      setAvailableInterfaces(response.interfaces.map((i) => i.name));
    } catch (err) {
      console.error("Failed to load interfaces:", err);
    }
  };

  const populateForm = (r: StaticRoute) => {
    setDescription(r.description || "");
    setNextHops(r.next_hops.map((nh) => ({
      address: nh.address,
      distance: nh.distance?.toString() || "",
      disable: nh.disable,
    })));
    setInterfaces(r.interfaces.map((iface) => ({
      interface: iface.interface,
      distance: iface.distance?.toString() || "",
      disable: iface.disable,
    })));
    setIsBlackhole(r.blackhole);
    setBlackholeDistance(r.blackhole_distance?.toString() || "");
    setIsReject(r.reject);
    setRejectDistance(r.reject_distance?.toString() || "");
    setError(null);
  };

  const addNextHop = () => setNextHops([...nextHops, { address: "", distance: "", disable: false }]);
  const removeNextHop = (i: number) => setNextHops(nextHops.filter((_, idx) => idx !== i));
  const updateNextHop = (i: number, field: keyof NextHopEntry, value: string | boolean) => {
    const updated = [...nextHops];
    updated[i] = { ...updated[i], [field]: value };
    setNextHops(updated);
  };

  const addInterface = () => setInterfaces([...interfaces, { interface: "", distance: "", disable: false }]);
  const removeInterface = (i: number) => setInterfaces(interfaces.filter((_, idx) => idx !== i));
  const updateInterface = (i: number, field: keyof InterfaceEntry, value: string | boolean) => {
    const updated = [...interfaces];
    updated[i] = { ...updated[i], [field]: value };
    setInterfaces(updated);
  };

  const handleSubmit = async () => {
    if (!table || !route) return;
    setError(null);

    if (!isBlackhole && !isReject && nextHops.length === 0 && interfaces.length === 0) {
      setError("At least one next-hop, interface, blackhole, or reject is required");
      return;
    }

    setLoading(true);
    try {
      await staticRoutesService.updateTableRoute(
        table.table_id,
        route.destination,
        route.route_type,
        route,
        {
          description: description || undefined,
          next_hops: nextHops
            .filter((nh) => nh.address)
            .map((nh) => ({
              address: nh.address,
              distance: nh.distance ? parseInt(nh.distance) : undefined,
              disable: nh.disable,
              vrf: null,
              interface: null,
              bfd_enable: false,
              bfd_profile: null,
              bfd_multi_hop: false,
              bfd_multi_hop_source: null,
              segments: null,
            })),
          interfaces: interfaces
            .filter((iface) => iface.interface)
            .map((iface) => ({
              interface: iface.interface,
              distance: iface.distance ? parseInt(iface.distance) : undefined,
              disable: iface.disable,
              vrf: null,
              segments: null,
            })),
          blackhole: isBlackhole,
          blackhole_distance: blackholeDistance ? parseInt(blackholeDistance) : undefined,
          reject: isReject,
          reject_distance: rejectDistance ? parseInt(rejectDistance) : undefined,
        }
      );
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update route");
    } finally {
      setLoading(false);
    }
  };

  if (!table || !route) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Route in Table {table.table_id}</DialogTitle>
          <DialogDescription>
            Modify route {route.destination} ({route.route_type.toUpperCase()})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Destination (CIDR)</Label>
            <Input value={route.destination} disabled className="bg-muted font-mono" />
            <p className="text-xs text-muted-foreground">
              Destination cannot be changed. Delete and recreate to change destination.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="Route description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Next Hops */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Next Hops</Label>
              <Button type="button" variant="outline" size="sm" onClick={addNextHop}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            {nextHops.map((nh, index) => (
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

          {/* Interfaces */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Interfaces</Label>
              <Button type="button" variant="outline" size="sm" onClick={addInterface}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            {interfaces.map((iface, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Select
                    value={iface.interface}
                    onValueChange={(value) => updateInterface(index, "interface", value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select interface..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableInterfaces.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

          {/* Blackhole / Reject */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="blackhole"
                  checked={isBlackhole}
                  onCheckedChange={(checked) => {
                    setIsBlackhole(!!checked);
                    if (checked) setIsReject(false);
                  }}
                />
                <Label htmlFor="blackhole">Blackhole</Label>
              </div>
              {isBlackhole && (
                <Input
                  placeholder="Distance"
                  type="number"
                  min="1"
                  max="255"
                  value={blackholeDistance}
                  onChange={(e) => setBlackholeDistance(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="reject"
                  checked={isReject}
                  onCheckedChange={(checked) => {
                    setIsReject(!!checked);
                    if (checked) setIsBlackhole(false);
                  }}
                />
                <Label htmlFor="reject">Reject</Label>
              </div>
              {isReject && (
                <Input
                  placeholder="Distance"
                  type="number"
                  min="1"
                  max="255"
                  value={rejectDistance}
                  onChange={(e) => setRejectDistance(e.target.value)}
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
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
