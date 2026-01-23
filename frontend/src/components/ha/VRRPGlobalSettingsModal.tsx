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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RefreshCw } from "lucide-react";
import { vrrpService, type VRRPGlobalParameters } from "@/lib/api/vrrp";
import { useToast } from "@/hooks/useToast";

interface VRRPGlobalSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSettings?: VRRPGlobalParameters | null;
  onSuccess?: () => void;
}

export function VRRPGlobalSettingsModal({
  open,
  onOpenChange,
  currentSettings,
  onSuccess,
}: VRRPGlobalSettingsModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Form state
  const [version, setVersion] = useState("");
  const [startupDelay, setStartupDelay] = useState("");
  const [garpInterval, setGarpInterval] = useState("");
  const [garpMasterDelay, setGarpMasterDelay] = useState("");
  const [garpMasterRefresh, setGarpMasterRefresh] = useState("");
  const [garpMasterRefreshRepeat, setGarpMasterRefreshRepeat] = useState("");
  const [garpMasterRepeat, setGarpMasterRepeat] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (open && currentSettings) {
      setVersion(currentSettings.version || "");
      setStartupDelay(currentSettings.startup_delay || "");
      setGarpInterval(currentSettings.garp?.interval || "");
      setGarpMasterDelay(currentSettings.garp?.master_delay || "");
      setGarpMasterRefresh(currentSettings.garp?.master_refresh || "");
      setGarpMasterRefreshRepeat(currentSettings.garp?.master_refresh_repeat || "");
      setGarpMasterRepeat(currentSettings.garp?.master_repeat || "");
    } else if (open) {
      setVersion("");
      setStartupDelay("");
      setGarpInterval("");
      setGarpMasterDelay("");
      setGarpMasterRefresh("");
      setGarpMasterRefreshRepeat("");
      setGarpMasterRepeat("");
    }
  }, [open, currentSettings]);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const operations = [];

      if (version) {
        operations.push({ op: "set_global_version", value: version });
      }

      if (startupDelay) {
        operations.push({ op: "set_global_startup_delay", value: parseInt(startupDelay) });
      }

      // GARP settings
      if (garpInterval) {
        operations.push({ op: "set_global_garp_interval", value: parseFloat(garpInterval) });
      }
      if (garpMasterDelay) {
        operations.push({ op: "set_global_garp_master_delay", value: parseInt(garpMasterDelay) });
      }
      if (garpMasterRefresh) {
        operations.push({ op: "set_global_garp_master_refresh", value: parseInt(garpMasterRefresh) });
      }
      if (garpMasterRefreshRepeat) {
        operations.push({ op: "set_global_garp_master_refresh_repeat", value: parseInt(garpMasterRefreshRepeat) });
      }
      if (garpMasterRepeat) {
        operations.push({ op: "set_global_garp_master_repeat", value: parseInt(garpMasterRepeat) });
      }

      if (operations.length === 0) {
        toast.info("No Changes", "No settings were modified");
        onOpenChange(false);
        return;
      }

      const response = await vrrpService.configureBatch({ operations });

      if (response.success) {
        toast.success("Settings Updated", "VRRP global settings have been updated");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error("Error", response.error || "Failed to update settings");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>VRRP Global Settings</DialogTitle>
          <DialogDescription>
            Configure global VRRP parameters that apply to all groups
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Basic Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Basic Settings</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="version">VRRP Version</Label>
                  <Select value={version} onValueChange={setVersion}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">Version 2 (IPv4 only)</SelectItem>
                      <SelectItem value="3">Version 3 (IPv4 + IPv6)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startupDelay">Startup Delay (1-600s)</Label>
                  <Input
                    id="startupDelay"
                    type="number"
                    min={1}
                    max={600}
                    value={startupDelay}
                    onChange={(e) => setStartupDelay(e.target.value)}
                    placeholder="Seconds"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* GARP Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Gratuitous ARP (GARP) Settings</h4>
              <p className="text-xs text-muted-foreground">
                GARP announcements help update network switches when VRRP state changes
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="garpInterval">GARP Interval (0-1000)</Label>
                  <Input
                    id="garpInterval"
                    type="number"
                    step="0.001"
                    min={0}
                    max={1000}
                    value={garpInterval}
                    onChange={(e) => setGarpInterval(e.target.value)}
                    placeholder="Seconds"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="garpMasterDelay">Master Delay (1-255)</Label>
                  <Input
                    id="garpMasterDelay"
                    type="number"
                    min={1}
                    max={255}
                    value={garpMasterDelay}
                    onChange={(e) => setGarpMasterDelay(e.target.value)}
                    placeholder="Seconds"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="garpMasterRefresh">Master Refresh (1-600)</Label>
                  <Input
                    id="garpMasterRefresh"
                    type="number"
                    min={1}
                    max={600}
                    value={garpMasterRefresh}
                    onChange={(e) => setGarpMasterRefresh(e.target.value)}
                    placeholder="Seconds"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="garpMasterRefreshRepeat">Master Refresh Repeat (1-600)</Label>
                  <Input
                    id="garpMasterRefreshRepeat"
                    type="number"
                    min={1}
                    max={600}
                    value={garpMasterRefreshRepeat}
                    onChange={(e) => setGarpMasterRefreshRepeat(e.target.value)}
                    placeholder="Count"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="garpMasterRepeat">Master Repeat (1-600)</Label>
                  <Input
                    id="garpMasterRepeat"
                    type="number"
                    min={1}
                    max={600}
                    value={garpMasterRepeat}
                    onChange={(e) => setGarpMasterRepeat(e.target.value)}
                    placeholder="Count"
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
