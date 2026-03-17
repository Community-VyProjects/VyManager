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
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle } from "lucide-react";
import { nat64Service, type NAT64TranslationPool } from "@/lib/api/nat64";

interface NAT64PoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleNumber: number;
  pool: NAT64TranslationPool | null;
  nextPoolNumber: number;
  onSuccess: () => void;
}

export function NAT64PoolDialog({
  open,
  onOpenChange,
  ruleNumber,
  pool,
  nextPoolNumber,
  onSuccess,
}: NAT64PoolDialogProps) {
  const isEditing = !!pool;
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [port, setPort] = useState("");
  const [tcp, setTcp] = useState(false);
  const [udp, setUdp] = useState(false);
  const [icmp, setIcmp] = useState(false);
  const [disable, setDisable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (pool) {
        setAddress(pool.address || "");
        setDescription(pool.description || "");
        setPort(pool.port || "");
        setTcp(pool.protocol?.tcp || false);
        setUdp(pool.protocol?.udp || false);
        setIcmp(pool.protocol?.icmp || false);
        setDisable(pool.disable);
      } else {
        setAddress("");
        setDescription("");
        setPort("");
        setTcp(false);
        setUdp(false);
        setIcmp(false);
        setDisable(false);
      }
    }
  }, [open, pool]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const protocol = { tcp, udp, icmp };
      const poolNumber = isEditing ? pool.pool_number : nextPoolNumber;

      if (isEditing) {
        await nat64Service.updatePool(ruleNumber, poolNumber, pool, {
          address,
          description,
          port,
          protocol,
          disable,
        });
      } else {
        await nat64Service.createPool(ruleNumber, poolNumber, {
          address: address || undefined,
          description: description || undefined,
          port: port || undefined,
          protocol,
          disable,
        });
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? `Edit Pool ${pool.pool_number} (Rule ${ruleNumber})`
              : `Add Pool to Rule ${ruleNumber}`}
          </DialogTitle>
          <DialogDescription>
            Configure an IPv4 translation pool for NAT64 address mapping.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Pool Number</Label>
            <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50 font-mono text-sm">
              {isEditing ? pool.pool_number : nextPoolNumber}
              <span className="ml-2 text-muted-foreground text-xs">(auto-assigned)</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nat64-pool-addr">Address</Label>
            <Input
              id="nat64-pool-addr"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="203.0.113.0/24"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nat64-pool-desc">Description</Label>
            <Input
              id="nat64-pool-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Translation pool description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nat64-pool-port">Port</Label>
            <Input
              id="nat64-pool-port"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="1024-65535"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label>Protocol</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="nat64-pool-tcp"
                  checked={tcp}
                  onCheckedChange={(checked) => setTcp(checked === true)}
                />
                <Label htmlFor="nat64-pool-tcp" className="cursor-pointer text-sm">
                  TCP
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="nat64-pool-udp"
                  checked={udp}
                  onCheckedChange={(checked) => setUdp(checked === true)}
                />
                <Label htmlFor="nat64-pool-udp" className="cursor-pointer text-sm">
                  UDP
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="nat64-pool-icmp"
                  checked={icmp}
                  onCheckedChange={(checked) => setIcmp(checked === true)}
                />
                <Label htmlFor="nat64-pool-icmp" className="cursor-pointer text-sm">
                  ICMP
                </Label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="nat64-pool-disable"
              checked={disable}
              onCheckedChange={(checked) => setDisable(checked === true)}
            />
            <Label htmlFor="nat64-pool-disable" className="cursor-pointer">
              Disable pool
            </Label>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
