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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2, Settings } from "lucide-react";
import { l2tpService, L2TPPPPOptions, L2TPCapabilities } from "@/lib/api/l2tp";
import { ApiError } from "@/lib/types/api";

interface PPPOptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentOptions: L2TPPPPOptions;
  capabilities: L2TPCapabilities | null;
}

export function PPPOptionsModal({
  open,
  onOpenChange,
  onSuccess,
  currentOptions,
  capabilities,
}: PPPOptionsModalProps) {
  const [ipv4, setIpv4] = useState("");
  const [ipv6, setIpv6] = useState("");
  const [mppe, setMppe] = useState("");
  const [disableCcp, setDisableCcp] = useState(false);
  const [lcpEchoFailure, setLcpEchoFailure] = useState("");
  const [lcpEchoInterval, setLcpEchoInterval] = useState("");
  const [lcpEchoTimeout, setLcpEchoTimeout] = useState("");
  const [minMtu, setMinMtu] = useState("");
  const [mru, setMru] = useState("");
  const [interfaceCache, setInterfaceCache] = useState("");
  const [ipv6InterfaceId, setIpv6InterfaceId] = useState("");
  const [ipv6PeerInterfaceId, setIpv6PeerInterfaceId] = useState("");
  const [ipv6AcceptPeerInterfaceId, setIpv6AcceptPeerInterfaceId] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setIpv4(currentOptions.ipv4 || "");
      setIpv6(currentOptions.ipv6 || "");
      setMppe(currentOptions.mppe || "");
      setDisableCcp(currentOptions.disable_ccp || false);
      setLcpEchoFailure(currentOptions.lcp_echo_failure || "");
      setLcpEchoInterval(currentOptions.lcp_echo_interval || "");
      setLcpEchoTimeout(currentOptions.lcp_echo_timeout || "");
      setMinMtu(currentOptions.min_mtu || "");
      setMru(currentOptions.mru || "");
      setInterfaceCache(currentOptions.interface_cache || "");
      setIpv6InterfaceId(currentOptions.ipv6_interface_id || "");
      setIpv6PeerInterfaceId(currentOptions.ipv6_peer_interface_id || "");
      setIpv6AcceptPeerInterfaceId(currentOptions.ipv6_accept_peer_interface_id || false);
      setError(null);
    }
  }, [open, currentOptions]);

  const clearable = (v: string) => v === "__clear__" ? "" : v;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await l2tpService.updatePPPOptions(currentOptions, {
        ipv4: clearable(ipv4),
        ipv6: clearable(ipv6),
        mppe: clearable(mppe),
        disable_ccp: disableCcp,
        lcp_echo_failure: lcpEchoFailure,
        lcp_echo_interval: lcpEchoInterval,
        lcp_echo_timeout: lcpEchoTimeout,
        min_mtu: minMtu,
        mru,
        interface_cache: interfaceCache,
        ipv6_interface_id: ipv6InterfaceId,
        ipv6_peer_interface_id: ipv6PeerInterfaceId,
        ipv6_accept_peer_interface_id: ipv6AcceptPeerInterfaceId,
      });
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to update PPP options");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to update PPP options");
    } finally {
      setLoading(false);
    }
  };

  const ipv4Modes = capabilities?.features.ppp_options.ipv4_modes || ["deny", "allow", "prefer", "require"];
  const ipv6Modes = capabilities?.features.ppp_options.ipv6_modes || ["deny", "allow", "prefer", "require"];
  const mppeModes = capabilities?.features.ppp_options.mppe_modes || ["require", "prefer", "deny"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            PPP Options
          </DialogTitle>
          <DialogDescription>Configure PPP protocol options.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>IPv4 Mode</Label>
              <Select value={ipv4} onValueChange={setIpv4}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__clear__">Default</SelectItem>
                  {ipv4Modes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>IPv6 Mode</Label>
              <Select value={ipv6} onValueChange={setIpv6}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__clear__">Default</SelectItem>
                  {ipv6Modes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>MPPE</Label>
            <Select value={mppe} onValueChange={setMppe}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">Default</SelectItem>
                {mppeModes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="disable-ccp" checked={disableCcp} onCheckedChange={(v) => setDisableCcp(!!v)} />
            <Label htmlFor="disable-ccp" className="cursor-pointer">Disable CCP</Label>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">LCP Echo</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Failure</Label>
              <Input value={lcpEchoFailure} onChange={(e) => setLcpEchoFailure(e.target.value)} placeholder="5" />
            </div>
            <div className="space-y-2">
              <Label>Interval</Label>
              <Input value={lcpEchoInterval} onChange={(e) => setLcpEchoInterval(e.target.value)} placeholder="30" />
            </div>
            <div className="space-y-2">
              <Label>Timeout</Label>
              <Input value={lcpEchoTimeout} onChange={(e) => setLcpEchoTimeout(e.target.value)} placeholder="0" />
            </div>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">MTU/MRU</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Min MTU</Label>
              <Input value={minMtu} onChange={(e) => setMinMtu(e.target.value)} placeholder="100" />
            </div>
            <div className="space-y-2">
              <Label>MRU</Label>
              <Input value={mru} onChange={(e) => setMru(e.target.value)} placeholder="1500" />
            </div>
            <div className="space-y-2">
              <Label>Interface Cache</Label>
              <Input value={interfaceCache} onChange={(e) => setInterfaceCache(e.target.value)} placeholder="1000" />
            </div>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">IPv6 Interface IDs</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Interface ID</Label>
              <Input value={ipv6InterfaceId} onChange={(e) => setIpv6InterfaceId(e.target.value)} placeholder="::1" />
            </div>
            <div className="space-y-2">
              <Label>Peer Interface ID</Label>
              <Input value={ipv6PeerInterfaceId} onChange={(e) => setIpv6PeerInterfaceId(e.target.value)} placeholder="::2" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="accept-peer-id" checked={ipv6AcceptPeerInterfaceId} onCheckedChange={(v) => setIpv6AcceptPeerInterfaceId(!!v)} />
            <Label htmlFor="accept-peer-id" className="cursor-pointer">Accept Peer Interface ID</Label>
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
