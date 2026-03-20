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
import { AlertCircle, Loader2, Database } from "lucide-react";
import { ipsecService, RAPool, IPSecCapabilities } from "@/lib/api/ipsec";
import { ApiError } from "@/lib/types/api";

interface PoolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: IPSecCapabilities | null;
  existingPool: RAPool | null;
}

export function PoolModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingPool,
}: PoolModalProps) {
  const isEdit = !!existingPool;

  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [nameServers, setNameServers] = useState("");
  const [exclude, setExclude] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeStop, setRangeStop] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingPool) {
        setName(existingPool.name);
        setPrefix((existingPool.prefix || []).join(", "));
        setNameServers((existingPool.name_servers || []).join(", "));
        setExclude((existingPool.exclude || []).join(", "));
        setRangeStart(existingPool.range_start || "");
        setRangeStop(existingPool.range_stop || "");
      } else {
        setName("");
        setPrefix("");
        setNameServers("");
        setExclude("");
        setRangeStart("");
        setRangeStop("");
      }
      setError(null);
    }
  }, [open, existingPool]);

  const splitValues = (str: string) => str.split(",").map((s) => s.trim()).filter(Boolean);

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Pool name is required"); return; }

    setLoading(true);
    setError(null);

    try {
      if (isEdit) await ipsecService.deleteRAPool(existingPool!.name);

      const result = await ipsecService.createRAPool(name.trim(), {
        prefix: prefix ? splitValues(prefix) : undefined,
        name_servers: nameServers ? splitValues(nameServers) : undefined,
        exclude: exclude ? splitValues(exclude) : undefined,
        range_start: rangeStart || undefined,
        range_stop: rangeStop || undefined,
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to save pool");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to save pool");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            {isEdit ? "Edit" : "Create"} Address Pool
          </DialogTitle>
          <DialogDescription>Configure an IP address pool for remote access clients.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ra-pool" disabled={isEdit} />
          </div>
          <div className="space-y-2">
            <Label>Prefix(es)</Label>
            <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="10.10.0.0/24, 10.10.1.0/24" />
            <p className="text-xs text-muted-foreground">Comma-separated CIDR blocks</p>
          </div>
          <div className="space-y-2">
            <Label>DNS Servers</Label>
            <Input value={nameServers} onChange={(e) => setNameServers(e.target.value)} placeholder="8.8.8.8, 8.8.4.4" />
          </div>
          <div className="space-y-2">
            <Label>Exclude</Label>
            <Input value={exclude} onChange={(e) => setExclude(e.target.value)} placeholder="10.10.0.1, 10.10.0.254" />
            <p className="text-xs text-muted-foreground">Addresses to exclude from the pool</p>
          </div>
          {capabilities?.features.pool_range.supported && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Range Start</Label>
                <Input value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} placeholder="10.10.0.10" />
              </div>
              <div className="space-y-2">
                <Label>Range Stop</Label>
                <Input value={rangeStop} onChange={(e) => setRangeStop(e.target.value)} placeholder="10.10.0.250" />
              </div>
            </div>
          )}
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? "Saving..." : "Creating..."}</> : isEdit ? "Save Changes" : "Create Pool"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
