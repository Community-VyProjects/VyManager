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
import { AlertCircle, Loader2, Shield } from "lucide-react";
import { ipoeServerService, IPoEAuthMac, IPoEAuthInterface } from "@/lib/api/ipoe-server";
import { ApiError } from "@/lib/types/api";

interface AuthMacModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingMac: IPoEAuthMac | null;
  preselectedInterface?: string;
  authInterfaces: IPoEAuthInterface[];
}

export function AuthMacModal({ open, onOpenChange, onSuccess, existingMac, preselectedInterface, authInterfaces }: AuthMacModalProps) {
  const isEdit = !!existingMac;

  const [selectedIface, setSelectedIface] = useState("");
  const [mac, setMac] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [vlan, setVlan] = useState("");
  const [rateDown, setRateDown] = useState("");
  const [rateUp, setRateUp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedIface(preselectedInterface || authInterfaces[0]?.interface || "");
      if (existingMac) {
        setMac(existingMac.mac);
        setIpAddress(existingMac.ip_address || "");
        setVlan(existingMac.vlan || "");
        setRateDown(existingMac.rate_limit?.download || "");
        setRateUp(existingMac.rate_limit?.upload || "");
      } else {
        setMac("");
        setIpAddress("");
        setVlan("");
        setRateDown("");
        setRateUp("");
      }
      setError(null);
    }
  }, [open, existingMac, preselectedInterface, authInterfaces]);

  const handleSubmit = async () => {
    if (!selectedIface.trim()) { setError("Interface is required"); return; }
    if (!mac.trim()) { setError("MAC address is required"); return; }

    setLoading(true);
    setError(null);

    const opts = {
      ip_address: ipAddress || undefined,
      vlan: vlan || undefined,
      rate_download: rateDown || undefined,
      rate_upload: rateUp || undefined,
    };

    try {
      let result;
      if (isEdit) {
        result = await ipoeServerService.updateAuthMac(selectedIface, mac, existingMac!, opts);
      } else {
        result = await ipoeServerService.createAuthMac(selectedIface, mac.trim(), opts);
      }

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to save MAC entry");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to save MAC entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {isEdit ? "Edit" : "Add"} MAC Auth Entry
          </DialogTitle>
          <DialogDescription>Configure a local MAC-based authentication entry.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Interface</Label>
            {isEdit ? (
              <Input value={selectedIface} disabled />
            ) : (
              <Input
                value={selectedIface}
                onChange={(e) => setSelectedIface(e.target.value)}
                placeholder="eth0"
                list="mac-iface-list"
              />
            )}
            <datalist id="mac-iface-list">
              {authInterfaces.map((ai) => (
                <option key={ai.interface} value={ai.interface} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label>MAC Address</Label>
            <Input value={mac} onChange={(e) => setMac(e.target.value)} placeholder="00:11:22:33:44:55" disabled={isEdit} />
          </div>

          <div className="space-y-2">
            <Label>Static IP Address (optional)</Label>
            <Input value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} placeholder="192.168.1.100" />
          </div>

          <div className="space-y-2">
            <Label>VLAN (optional)</Label>
            <Input value={vlan} onChange={(e) => setVlan(e.target.value)} placeholder="100" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rate Limit Download</Label>
              <Input value={rateDown} onChange={(e) => setRateDown(e.target.value)} placeholder="kbits/sec" />
            </div>
            <div className="space-y-2">
              <Label>Rate Limit Upload</Label>
              <Input value={rateUp} onChange={(e) => setRateUp(e.target.value)} placeholder="kbits/sec" />
            </div>
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? "Saving..." : "Adding..."}</> : isEdit ? "Save Changes" : "Add Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
