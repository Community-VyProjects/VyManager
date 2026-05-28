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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Settings } from "lucide-react";
import { pppoeServerService, PPPoEConfigResponse } from "@/lib/api/pppoe-server";
import { ApiError } from "@/lib/types/api";

interface PPPOptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: PPPoEConfigResponse;
}

const IP_MODES = ["deny", "allow", "prefer", "require"];

export function PPPOptionsModal({ open, onOpenChange, onSuccess, config }: PPPOptionsModalProps) {
  const [ipv4, setIpv4] = useState("__none__");
  const [ipv6, setIpv6] = useState("__none__");
  const [mppe, setMppe] = useState("__none__");
  const [disableCcp, setDisableCcp] = useState(false);
  const [interfaceCache, setInterfaceCache] = useState("");
  const [minMtu, setMinMtu] = useState("");
  const [mru, setMru] = useState("");
  const [lcpEchoFailure, setLcpEchoFailure] = useState("");
  const [lcpEchoInterval, setLcpEchoInterval] = useState("");
  const [lcpEchoTimeout, setLcpEchoTimeout] = useState("");
  const [ipv6InterfaceId, setIpv6InterfaceId] = useState("");
  const [ipv6PeerInterfaceId, setIpv6PeerInterfaceId] = useState("");
  const [ipv6AcceptPeer, setIpv6AcceptPeer] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ppp = config.ppp_options || {};

  useEffect(() => {
    if (open) {
      setIpv4(ppp.ipv4 || "__none__");
      setIpv6(ppp.ipv6 || "__none__");
      setMppe(ppp.mppe || "__none__");
      setDisableCcp(ppp.disable_ccp || false);
      setInterfaceCache(ppp.interface_cache || "");
      setMinMtu(ppp.min_mtu || "");
      setMru(ppp.mru || "");
      setLcpEchoFailure(ppp.lcp_echo_failure || "");
      setLcpEchoInterval(ppp.lcp_echo_interval || "");
      setLcpEchoTimeout(ppp.lcp_echo_timeout || "");
      setIpv6InterfaceId(ppp.ipv6_interface_id || "");
      setIpv6PeerInterfaceId(ppp.ipv6_peer_interface_id || "");
      setIpv6AcceptPeer(ppp.ipv6_accept_peer_interface_id || false);
      setError(null);
    }
  }, [open, config]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await pppoeServerService.updatePPPOptions(ppp, {
        ipv4: ipv4 === "__none__" ? "" : ipv4,
        ipv6: ipv6 === "__none__" ? "" : ipv6,
        mppe: mppe === "__none__" ? "" : mppe,
        disable_ccp: disableCcp,
        interface_cache: interfaceCache,
        min_mtu: minMtu,
        mru,
        lcp_echo_failure: lcpEchoFailure,
        lcp_echo_interval: lcpEchoInterval,
        lcp_echo_timeout: lcpEchoTimeout,
        ipv6_interface_id: ipv6InterfaceId,
        ipv6_peer_interface_id: ipv6PeerInterfaceId,
        ipv6_accept_peer_interface_id: ipv6AcceptPeer,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            PPP Options
          </DialogTitle>
          <DialogDescription>Configure PPP negotiation parameters.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <h4 className="text-sm font-medium">IP Negotiation</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>IPv4</Label>
              <Select value={ipv4} onValueChange={setIpv4}>
                <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Default</SelectItem>
                  {IP_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>IPv6</Label>
              <Select value={ipv6} onValueChange={setIpv6}>
                <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Default</SelectItem>
                  {IP_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">Encryption</h4>
          <div className="space-y-2">
            <Label>MPPE</Label>
            <Select value={mppe} onValueChange={setMppe}>
              <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Default</SelectItem>
                <SelectItem value="require">Require</SelectItem>
                <SelectItem value="prefer">Prefer</SelectItem>
                <SelectItem value="deny">Deny</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="disable-ccp" checked={disableCcp} onCheckedChange={(v) => setDisableCcp(!!v)} />
            <Label htmlFor="disable-ccp" className="cursor-pointer">Disable CCP</Label>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">MTU/MRU</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Min MTU</Label>
              <Input value={minMtu} onChange={(e) => setMinMtu(e.target.value)} placeholder="1280" />
            </div>
            <div className="space-y-2">
              <Label>MRU</Label>
              <Input value={mru} onChange={(e) => setMru(e.target.value)} placeholder="1492" />
            </div>
            <div className="space-y-2">
              <Label>Interface Cache</Label>
              <Input value={interfaceCache} onChange={(e) => setInterfaceCache(e.target.value)} placeholder="0" />
            </div>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">LCP Echo Keepalive</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Failure</Label>
              <Input value={lcpEchoFailure} onChange={(e) => setLcpEchoFailure(e.target.value)} placeholder="3" />
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
          <h4 className="text-sm font-medium">IPv6 Interface IDs</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Interface ID</Label>
              <Input value={ipv6InterfaceId} onChange={(e) => setIpv6InterfaceId(e.target.value)} placeholder="random or x:x:x:x" />
            </div>
            <div className="space-y-2">
              <Label>Peer Interface ID</Label>
              <Input value={ipv6PeerInterfaceId} onChange={(e) => setIpv6PeerInterfaceId(e.target.value)} placeholder="x:x:x:x" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="accept-peer-id" checked={ipv6AcceptPeer} onCheckedChange={(v) => setIpv6AcceptPeer(!!v)} />
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
