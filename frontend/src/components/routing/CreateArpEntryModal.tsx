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
import { AlertCircle, Loader2 } from "lucide-react";
import { staticRoutesService } from "@/lib/api/static-routes";
import { showService } from "@/lib/api/show";

interface CreateArpEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateArpEntryModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateArpEntryModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<string[]>([]);

  // Form fields
  const [interfaceName, setInterfaceName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [macAddress, setMacAddress] = useState("");
  const [description, setDescription] = useState("");

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
    setInterfaceName("");
    setIpAddress("");
    setMacAddress("");
    setDescription("");
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!interfaceName) {
      setError("Interface is required");
      return;
    }
    if (!ipAddress) {
      setError("IP address is required");
      return;
    }
    if (!macAddress) {
      setError("MAC address is required");
      return;
    }

    // Validate MAC address format
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(macAddress)) {
      setError("Invalid MAC address format (use XX:XX:XX:XX:XX:XX)");
      return;
    }

    // Validate IP address format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ipAddress)) {
      setError("Invalid IPv4 address format");
      return;
    }

    setLoading(true);

    try {
      await staticRoutesService.createArpEntry(
        interfaceName,
        ipAddress,
        macAddress,
        description || undefined
      );
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ARP entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Static ARP Entry</DialogTitle>
          <DialogDescription>
            Add a static ARP entry to map an IP address to a MAC address
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
            <Label htmlFor="interface">Interface</Label>
            <Select value={interfaceName} onValueChange={setInterfaceName}>
              <SelectTrigger>
                <SelectValue placeholder="Select interface..." />
              </SelectTrigger>
              <SelectContent>
                {availableInterfaces.map((iface) => (
                  <SelectItem key={iface} value={iface}>
                    {iface}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ip-address">IP Address</Label>
            <Input
              id="ip-address"
              placeholder="192.168.1.100"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mac-address">MAC Address</Label>
            <Input
              id="mac-address"
              placeholder="00:11:22:33:44:55"
              value={macAddress}
              onChange={(e) => setMacAddress(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="Description for this ARP entry"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
