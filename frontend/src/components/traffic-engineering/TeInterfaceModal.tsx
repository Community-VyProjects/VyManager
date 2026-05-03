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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import type { AdminGroup, TeInterface } from "@/lib/api/traffic-engineering";
import { showService } from "@/lib/api/show";

interface TeInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (iface: TeInterface) => Promise<void>;
  existingInterface?: TeInterface | null;
  adminGroups: AdminGroup[];
}

export function TeInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
  adminGroups,
}: TeInterfaceModalProps) {
  const isEditMode = !!existingInterface;

  const [name, setName] = useState("");
  const [availableInterfaces, setAvailableInterfaces] = useState<string[]>([]);
  const [interfacesLoading, setInterfacesLoading] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [maxBandwidth, setMaxBandwidth] = useState("");
  const [maxReservableBandwidth, setMaxReservableBandwidth] = useState("");
  const [metric, setMetric] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingInterface) {
        setName(existingInterface.name);
        setSelectedGroups(new Set(existingInterface.admin_groups));
        setMaxBandwidth(existingInterface.max_bandwidth != null ? String(existingInterface.max_bandwidth) : "");
        setMaxReservableBandwidth(
          existingInterface.max_reservable_bandwidth != null
            ? String(existingInterface.max_reservable_bandwidth)
            : ""
        );
        setMetric(existingInterface.metric != null ? String(existingInterface.metric) : "");
      } else {
        setName("");
        setSelectedGroups(new Set());
        setMaxBandwidth("");
        setMaxReservableBandwidth("");
        setMetric("");
      }
      setError(null);

      setInterfacesLoading(true);
      showService
        .getAllInterfaces()
        .then((res) => setAvailableInterfaces(res.interfaces.map((i) => i.name).sort()))
        .catch(() => setAvailableInterfaces([]))
        .finally(() => setInterfacesLoading(false));
    }
  }, [open, existingInterface]);

  const validateBandwidth = (val: string, label: string): string | null => {
    if (!val) return null;
    const v = parseInt(val, 10);
    if (isNaN(v) || v < 1 || v > 4294967295) return `${label} must be between 1 and 4294967295`;
    return null;
  };

  const validate = (): string | null => {
    if (!name) return "Interface is required";
    const bwErr = validateBandwidth(maxBandwidth, "Max Bandwidth");
    if (bwErr) return bwErr;
    const rbwErr = validateBandwidth(maxReservableBandwidth, "Max Reservable Bandwidth");
    if (rbwErr) return rbwErr;
    if (metric) {
      const v = parseInt(metric, 10);
      if (isNaN(v) || v < 1 || v > 4294967295) return "Metric must be between 1 and 4294967295";
    }
    return null;
  };

  const toggleGroup = (groupName: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        name,
        admin_groups: Array.from(selectedGroups),
        max_bandwidth: maxBandwidth ? parseInt(maxBandwidth, 10) : null,
        max_reservable_bandwidth: maxReservableBandwidth ? parseInt(maxReservableBandwidth, 10) : null,
        metric: metric ? parseInt(metric, 10) : null,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Interface Parameters" : "Add Interface Parameters"}
          </DialogTitle>
          <DialogDescription>
            Configure Traffic Engineering parameters for a network interface.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Interface</Label>
              {isEditMode ? (
                <Input value={name} disabled className="bg-muted" />
              ) : (
                <Select value={name} onValueChange={setName} disabled={interfacesLoading}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={interfacesLoading ? "Loading interfaces..." : "Select interface"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableInterfaces.map((iface) => (
                      <SelectItem key={iface} value={iface}>
                        {iface}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Admin Groups</Label>
              {adminGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground py-1">
                  No admin groups configured — add one in the Admin Groups tab
                </p>
              ) : (
                <div className="rounded-md border border-border divide-y divide-border max-h-40 overflow-y-auto">
                  {adminGroups.map((group) => (
                    <div key={group.name} className="flex items-center gap-3 px-3 py-2">
                      <Checkbox
                        id={`ag-${group.name}`}
                        checked={selectedGroups.has(group.name)}
                        onCheckedChange={() => toggleGroup(group.name)}
                      />
                      <Label htmlFor={`ag-${group.name}`} className="cursor-pointer flex-1 font-normal">
                        <span className="font-mono">{group.name}</span>
                        {group.bit_position != null && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            bit {group.bit_position}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="te-max-bw">Max BW (Mbps)</Label>
                <Input
                  id="te-max-bw"
                  type="number"
                  min={1}
                  value={maxBandwidth}
                  onChange={(e) => setMaxBandwidth(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="te-max-rbw">Max Reserv. BW (Mbps)</Label>
                <Input
                  id="te-max-rbw"
                  type="number"
                  min={1}
                  value={maxReservableBandwidth}
                  onChange={(e) => setMaxReservableBandwidth(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="te-metric">Metric</Label>
              <Input
                id="te-metric"
                type="number"
                min={1}
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
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
              "Add Interface"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
