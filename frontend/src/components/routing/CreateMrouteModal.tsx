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
import { staticRoutesService, type MrouteNextHop, type MrouteInterface } from "@/lib/api/static-routes";
import { showService } from "@/lib/api/show";

interface CreateMrouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
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

export function CreateMrouteModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateMrouteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<string[]>([]);

  // Form fields
  const [prefix, setPrefix] = useState("");
  const [nextHops, setNextHops] = useState<NextHopEntry[]>([]);
  const [interfaces, setInterfaces] = useState<InterfaceEntry[]>([]);

  useEffect(() => {
    if (open) {
      loadInterfaces();
      resetForm();
    }
  }, [open]);

  const loadInterfaces = async () => {
    try {
      const response = await showService.getAllInterfaces();
      setAvailableInterfaces(response.interfaces.map((i) => i.name));
    } catch (err) {
      console.error("Failed to load interfaces:", err);
    }
  };

  const resetForm = () => {
    setPrefix("");
    setNextHops([]);
    setInterfaces([]);
    setError(null);
  };

  const addNextHop = () => {
    setNextHops([...nextHops, { address: "", distance: "", disable: false }]);
  };

  const removeNextHop = (index: number) => {
    setNextHops(nextHops.filter((_, i) => i !== index));
  };

  const updateNextHop = (index: number, field: keyof NextHopEntry, value: string | boolean) => {
    const updated = [...nextHops];
    updated[index] = { ...updated[index], [field]: value };
    setNextHops(updated);
  };

  const addInterface = () => {
    setInterfaces([...interfaces, { interface: "", distance: "", disable: false }]);
  };

  const removeInterface = (index: number) => {
    setInterfaces(interfaces.filter((_, i) => i !== index));
  };

  const updateInterface = (index: number, field: keyof InterfaceEntry, value: string | boolean) => {
    const updated = [...interfaces];
    updated[index] = { ...updated[index], [field]: value };
    setInterfaces(updated);
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!prefix) {
      setError("Prefix is required");
      return;
    }

    // Validate prefix format (IPv4 CIDR)
    const prefixRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!prefixRegex.test(prefix)) {
      setError("Invalid prefix format (use CIDR notation like 224.0.0.0/4)");
      return;
    }

    if (nextHops.length === 0 && interfaces.length === 0) {
      setError("At least one next-hop or interface is required");
      return;
    }

    setLoading(true);

    try {
      const mrouteNextHops: MrouteNextHop[] = nextHops
        .filter(nh => nh.address)
        .map(nh => ({
          address: nh.address,
          distance: nh.distance ? parseInt(nh.distance) : undefined,
          disable: nh.disable,
        }));

      const mrouteInterfaces: MrouteInterface[] = interfaces
        .filter(iface => iface.interface)
        .map(iface => ({
          interface: iface.interface,
          distance: iface.distance ? parseInt(iface.distance) : undefined,
          disable: iface.disable,
        }));

      await staticRoutesService.createMroute(prefix, {
        next_hops: mrouteNextHops,
        interfaces: mrouteInterfaces,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create multicast route");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Multicast Route</DialogTitle>
          <DialogDescription>
            Add a static multicast route for the Multicast RIB
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
            <Label htmlFor="prefix">Prefix (CIDR)</Label>
            <Input
              id="prefix"
              placeholder="224.0.0.0/4"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeNextHop(index)}
                  >
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeInterface(index)}
                  >
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Route
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
