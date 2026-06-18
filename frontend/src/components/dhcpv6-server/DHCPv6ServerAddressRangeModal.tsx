"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  dhcpv6ServerService,
  DHCPv6AddressRange,
  DHCPv6Subnet,
  DHCPv6ServerCapabilities,
} from "@/lib/api/dhcpv6-server";

function getNextRangeId(existingRanges: DHCPv6AddressRange[]): string {
  const usedIds = new Set(
    existingRanges
      .map((r) => parseInt(r.range_id, 10))
      .filter((n) => !isNaN(n))
  );
  let id = 1;
  while (usedIds.has(id)) id++;
  return String(id);
}

interface Props {
  open: boolean;
  netName: string;
  subnetCidr: string;
  availableSubnets?: string[];
  allSubnets?: DHCPv6Subnet[];
  caps: DHCPv6ServerCapabilities;
  range: DHCPv6AddressRange | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DHCPv6ServerAddressRangeModal({
  open,
  netName,
  subnetCidr,
  availableSubnets,
  allSubnets,
  caps,
  range,
  onClose,
  onSuccess,
}: Props) {
  const isEditing = range !== null;
  const is15 = caps.features.address_ranges_named.supported;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubnet, setSelectedSubnet] = useState(subnetCidr);

  // 1.5 named range fields
  const [start, setStart] = useState("");
  const [stop, setStop] = useState("");
  const [prefix, setPrefix] = useState("");

  // 1.4 classic fields
  const [mode, setMode] = useState<"start-stop" | "prefix">("start-stop");
  const [start14, setStart14] = useState("");
  const [stop14, setStop14] = useState("");
  const [prefix14, setPrefix14] = useState("");
  const [temporary, setTemporary] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed form state when the modal opens
    setError(null);
    setSelectedSubnet(subnetCidr);
    if (range) {
      if (is15) {
        setStart(range.start ?? "");
        setStop(range.stop ?? "");
        setPrefix(range.prefix ?? "");
      } else {
        if (range.start) {
          setMode("start-stop");
          setStart14(range.start);
          setStop14(range.stop ?? "");
          setPrefix14("");
          setTemporary(false);
        } else {
          setMode("prefix");
          setStart14("");
          setStop14("");
          setPrefix14(range.prefix ?? "");
          setTemporary(range.temporary);
        }
      }
    } else {
      setStart(""); setStop(""); setPrefix("");
      setMode("start-stop");
      setStart14(""); setStop14(""); setPrefix14(""); setTemporary(false);
    }
  }, [open, range, is15]);

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    if (!selectedSubnet) { setError("Select a subnet"); setLoading(false); return; }

    // Compute the next available range ID from existing ranges on the selected subnet
    const subnetRanges = allSubnets?.find(s => s.subnet === selectedSubnet)?.address_ranges ?? [];
    const existingRanges = isEditing
      ? subnetRanges.filter(r => r.range_id !== range!.range_id)
      : subnetRanges;
    const nextId = isEditing ? range!.range_id : getNextRangeId(existingRanges);

    let updated: DHCPv6AddressRange;

    if (is15) {
      updated = {
        range_id: nextId,
        start: start.trim() || null,
        stop: stop.trim() || null,
        prefix: prefix.trim() || null,
        temporary: false,
      };
    } else {
      if (mode === "start-stop") {
        if (!start14.trim() || !stop14.trim()) { setError("Start and Stop are required"); setLoading(false); return; }
        updated = {
          range_id: nextId,
          start: start14.trim(),
          stop: stop14.trim(),
          prefix: null,
          temporary: false,
        };
      } else {
        if (!prefix14.trim()) { setError("Prefix is required"); setLoading(false); return; }
        updated = {
          range_id: nextId,
          start: null,
          stop: null,
          prefix: prefix14.trim(),
          temporary,
        };
      }
    }

    const result = await dhcpv6ServerService.saveAddressRange(netName, selectedSubnet, is15, range, updated);
    setLoading(false);
    if (!result.success) { setError(result.error ?? "Operation failed"); return; }
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Address Range" : "Add Address Range"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {!isEditing && availableSubnets && availableSubnets.length > 1 ? (
            <div className="space-y-1.5">
              <Label>Subnet</Label>
              <Select value={selectedSubnet} onValueChange={setSelectedSubnet}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subnet" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubnets.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground font-mono">
              Network: {netName}{selectedSubnet ? ` / Subnet: ${selectedSubnet}` : ""}
            </div>
          )}

          {is15 ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="range-start">Start Address</Label>
                <Input
                  id="range-start"
                  placeholder="2001:db8::1 (optional)"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="range-stop">Stop Address</Label>
                <Input
                  id="range-stop"
                  placeholder="2001:db8::ff (optional)"
                  value={stop}
                  onChange={(e) => setStop(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="range-prefix">Prefix</Label>
                <Input
                  id="range-prefix"
                  placeholder="2001:db8::/64 (optional)"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-4">
                <button
                  type="button"
                  className={`flex-1 py-2 px-3 rounded border text-sm font-medium transition-colors ${
                    mode === "start-stop"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                  onClick={() => setMode("start-stop")}
                >
                  Start / Stop
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 px-3 rounded border text-sm font-medium transition-colors ${
                    mode === "prefix"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                  onClick={() => setMode("prefix")}
                >
                  Prefix
                </button>
              </div>

              {mode === "start-stop" ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="start14">Start Address</Label>
                    <Input
                      id="start14"
                      placeholder="2001:db8::1"
                      value={start14}
                      onChange={(e) => setStart14(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="stop14">Stop Address</Label>
                    <Input
                      id="stop14"
                      placeholder="2001:db8::ff"
                      value={stop14}
                      onChange={(e) => setStop14(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="prefix14">Prefix</Label>
                    <Input
                      id="prefix14"
                      placeholder="2001:db8::/64"
                      value={prefix14}
                      onChange={(e) => setPrefix14(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="temporary"
                      checked={temporary}
                      onCheckedChange={(v) => setTemporary(Boolean(v))}
                    />
                    <Label htmlFor="temporary" className="cursor-pointer">Temporary addresses</Label>
                  </div>
                </>
              )}
            </>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEditing ? "Save" : "Add Range"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
