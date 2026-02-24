"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Loader2, X, Plus } from "lucide-react";
import {
  MplsLdpTargetedNeighborIpv4,
  MplsLdpTargetedNeighborIpv6,
  MplsLdpConfig,
} from "@/lib/api/mpls";

interface MplsLdpTargetedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (updated: Pick<MplsLdpConfig, "targeted_neighbor_ipv4" | "targeted_neighbor_ipv6">) => Promise<void>;
  current: Pick<MplsLdpConfig, "targeted_neighbor_ipv4" | "targeted_neighbor_ipv6">;
}

function TargetedNeighborSection({
  label,
  value,
  onChange,
}: {
  label: string;
  value: MplsLdpTargetedNeighborIpv4 | MplsLdpTargetedNeighborIpv6;
  onChange: (updated: MplsLdpTargetedNeighborIpv4 | MplsLdpTargetedNeighborIpv6) => void;
}) {
  const [newAddress, setNewAddress] = useState("");

  const addAddress = () => {
    const addr = newAddress.trim();
    if (!addr || value.addresses.includes(addr)) return;
    onChange({ ...value, addresses: [...value.addresses, addr] });
    setNewAddress("");
  };

  const removeAddress = (addr: string) => {
    onChange({ ...value, addresses: value.addresses.filter((a) => a !== addr) });
  };

  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <div className="flex items-center gap-3">
        <Checkbox
          id={`targeted-enable-${label}`}
          checked={value.enable}
          onCheckedChange={(checked) => onChange({ ...value, enable: checked === true })}
        />
        <Label htmlFor={`targeted-enable-${label}`} className="cursor-pointer">
          Enable {label} Targeted Neighbors
        </Label>
      </div>

      {/* Address chip list */}
      <div className="space-y-2">
        <Label>Addresses</Label>
        <div className="flex flex-wrap gap-2 min-h-[36px] p-2 border rounded-md bg-muted/30">
          {value.addresses.map((addr) => (
            <Badge key={addr} variant="secondary" className="gap-1 font-mono text-xs">
              {addr}
              <button
                onClick={() => removeAddress(addr)}
                className="ml-1 hover:text-destructive transition-colors"
                aria-label={`Remove ${addr}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {value.addresses.length === 0 && (
            <span className="text-xs text-muted-foreground self-center">No addresses</span>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder={label === "IPv4" ? "e.g. 10.0.0.1" : "e.g. 2001:db8::1"}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAddress(); } }}
          />
          <Button type="button" variant="outline" size="icon" onClick={addAddress}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hello Holdtime */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`targeted-holdtime-${label}`}>Hello Holdtime (seconds)</Label>
          <Input
            id={`targeted-holdtime-${label}`}
            type="number"
            min={0}
            value={value.hello_holdtime ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                hello_holdtime: e.target.value ? parseInt(e.target.value, 10) : null,
              })
            }
            placeholder="Default"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`targeted-interval-${label}`}>Hello Interval (seconds)</Label>
          <Input
            id={`targeted-interval-${label}`}
            type="number"
            min={0}
            value={value.hello_interval ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                hello_interval: e.target.value ? parseInt(e.target.value, 10) : null,
              })
            }
            placeholder="Default"
          />
        </div>
      </div>
    </div>
  );
}

export function MplsLdpTargetedModal({
  open,
  onOpenChange,
  onSubmit,
  current,
}: MplsLdpTargetedModalProps) {
  const [ipv4, setIpv4] = useState<MplsLdpTargetedNeighborIpv4>({
    enable: false,
    addresses: [],
    hello_holdtime: null,
    hello_interval: null,
  });
  const [ipv6, setIpv6] = useState<MplsLdpTargetedNeighborIpv6>({
    enable: false,
    addresses: [],
    hello_holdtime: null,
    hello_interval: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setIpv4({ ...current.targeted_neighbor_ipv4, addresses: [...current.targeted_neighbor_ipv4.addresses] });
      setIpv6({ ...current.targeted_neighbor_ipv6, addresses: [...current.targeted_neighbor_ipv6.addresses] });
      setError(null);
    }
  }, [open, current]);

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        targeted_neighbor_ipv4: ipv4,
        targeted_neighbor_ipv6: ipv6,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Targeted Neighbor Sessions</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="ipv4">
          <TabsList className="mb-4">
            <TabsTrigger value="ipv4">IPv4</TabsTrigger>
            <TabsTrigger value="ipv6">IPv6</TabsTrigger>
          </TabsList>

          <TabsContent value="ipv4">
            <TargetedNeighborSection
              label="IPv4"
              value={ipv4}
              onChange={(v) => setIpv4(v as MplsLdpTargetedNeighborIpv4)}
            />
          </TabsContent>

          <TabsContent value="ipv6">
            <TargetedNeighborSection
              label="IPv6"
              value={ipv6}
              onChange={(v) => setIpv6(v as MplsLdpTargetedNeighborIpv6)}
            />
          </TabsContent>
        </Tabs>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
