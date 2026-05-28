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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2, Network, X } from "lucide-react";
import { pppoeServerService, PPPoEInterface, PPPoECapabilities } from "@/lib/api/pppoe-server";
import { showService, InterfaceName } from "@/lib/api/show";
import { ApiError } from "@/lib/types/api";

interface InterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingInterface: PPPoEInterface | null;
  capabilities: PPPoECapabilities | null;
}

export function InterfaceModal({ open, onOpenChange, onSuccess, existingInterface, capabilities }: InterfaceModalProps) {
  const isEdit = !!existingInterface;

  const [ifaceName, setIfaceName] = useState("");
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [ifacesLoading, setIfacesLoading] = useState(false);
  const [vlans, setVlans] = useState<string[]>([]);
  const [vlanInput, setVlanInput] = useState("");
  const [vlanMon, setVlanMon] = useState(false);
  const [combined, setCombined] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showVlanMon = capabilities?.features.vlan_mon ?? false;

  useEffect(() => {
    if (open) {
      if (existingInterface) {
        setIfaceName(existingInterface.interface);
        setVlans(existingInterface.vlans || []);
        setVlanMon(existingInterface.vlan_mon || false);
        setCombined(existingInterface.combined || "");
      } else {
        setIfaceName("");
        setVlans([]);
        setVlanMon(false);
        setCombined("");
        setIfacesLoading(true);
        showService.getAllInterfaces()
          .then((res) => setAvailableInterfaces(res.interfaces))
          .catch(() => setAvailableInterfaces([]))
          .finally(() => setIfacesLoading(false));
      }
      setVlanInput("");
      setError(null);
    }
  }, [open, existingInterface]);

  const addVlan = () => {
    const val = vlanInput.trim();
    if (val && !vlans.includes(val)) {
      setVlans([...vlans, val]);
      setVlanInput("");
    }
  };

  const handleSubmit = async () => {
    if (!ifaceName.trim()) { setError("Interface name is required"); return; }

    setLoading(true);
    setError(null);

    const opts = { vlans, vlan_mon: vlanMon, combined: combined || undefined };

    try {
      let result;
      if (isEdit) {
        result = await pppoeServerService.updateInterface(existingInterface!.interface, existingInterface!, opts);
      } else {
        result = await pppoeServerService.createInterface(ifaceName.trim(), opts);
      }

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to save interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to save interface");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            {isEdit ? "Edit" : "Add"} Interface
          </DialogTitle>
          <DialogDescription>Configure a PPPoE server interface.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Interface</Label>
            {isEdit ? (
              <Input value={ifaceName} disabled />
            ) : (
              <Select value={ifaceName} onValueChange={setIfaceName}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      ifacesLoading
                        ? "Loading interfaces..."
                        : availableInterfaces.length === 0
                        ? "No interfaces available"
                        : "Select an interface"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableInterfaces.map((iface) => (
                    <SelectItem key={iface.name} value={iface.name}>
                      <span className="font-mono">{iface.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">({iface.type})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>VLANs</Label>
            <div className="flex gap-2">
              <Input
                value={vlanInput}
                onChange={(e) => setVlanInput(e.target.value)}
                placeholder="100 or 100-200"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVlan(); } }}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addVlan}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {vlans.map((vlan) => (
                <Badge key={vlan} variant="secondary" className="gap-1 font-mono text-xs">
                  {vlan}
                  <button onClick={() => setVlans(vlans.filter((v) => v !== vlan))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {showVlanMon && (
            <div className="flex items-center gap-2">
              <Checkbox id="vlan-mon" checked={vlanMon} onCheckedChange={(v) => setVlanMon(!!v)} />
              <Label htmlFor="vlan-mon" className="cursor-pointer">VLAN Monitoring</Label>
            </div>
          )}

          <div className="space-y-2">
            <Label>Combined (simultaneous sessions)</Label>
            <Input value={combined} onChange={(e) => setCombined(e.target.value)} placeholder="4" />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? "Saving..." : "Adding..."}</> : isEdit ? "Save Changes" : "Add Interface"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
