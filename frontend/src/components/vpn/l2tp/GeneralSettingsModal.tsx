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
import { AlertCircle, Loader2, Settings } from "lucide-react";
import { l2tpService, L2TPConfigResponse } from "@/lib/api/l2tp";
import { ApiError } from "@/lib/types/api";

interface GeneralSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: L2TPConfigResponse;
}

export function GeneralSettingsModal({
  open,
  onOpenChange,
  onSuccess,
  config,
}: GeneralSettingsModalProps) {
  const [description, setDescription] = useState("");
  const [outsideAddress, setOutsideAddress] = useState("");
  const [gatewayAddress, setGatewayAddress] = useState("");
  const [mtu, setMtu] = useState("");
  const [nameServers, setNameServers] = useState("");
  const [winsServers, setWinsServers] = useState("");
  const [defaultPool, setDefaultPool] = useState("");
  const [defaultIpv6Pool, setDefaultIpv6Pool] = useState("");
  const [maxSessions, setMaxSessions] = useState("");
  const [threadCount, setThreadCount] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDescription(config.description || "");
      setOutsideAddress(config.outside_address || "");
      setGatewayAddress(config.gateway_address || "");
      setMtu(config.mtu || "");
      setNameServers((config.name_servers || []).join(", "));
      setWinsServers((config.wins_servers || []).join(", "));
      setDefaultPool(config.default_pool || "");
      setDefaultIpv6Pool(config.default_ipv6_pool || "");
      setMaxSessions(config.max_concurrent_sessions || "");
      setThreadCount(config.thread_count || "");
      setError(null);
    }
  }, [open, config]);

  const splitValues = (str: string) => str.split(",").map((s) => s.trim()).filter(Boolean);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await l2tpService.updateGeneralSettings(config, {
        description,
        outside_address: outsideAddress,
        gateway_address: gatewayAddress,
        mtu,
        name_servers: splitValues(nameServers),
        wins_servers: splitValues(winsServers),
        default_pool: defaultPool,
        default_ipv6_pool: defaultIpv6Pool,
        max_concurrent_sessions: maxSessions,
        thread_count: threadCount,
      });
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to update settings");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to update settings");
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
            General Settings
          </DialogTitle>
          <DialogDescription>Configure L2TP general settings.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="L2TP VPN server" />
          </div>
          <div className="space-y-2">
            <Label>Outside Address</Label>
            <Input value={outsideAddress} onChange={(e) => setOutsideAddress(e.target.value)} placeholder="203.0.113.1" />
            <p className="text-xs text-muted-foreground">External IP for L2TP connections</p>
          </div>
          <div className="space-y-2">
            <Label>Gateway Address</Label>
            <Input value={gatewayAddress} onChange={(e) => setGatewayAddress(e.target.value)} placeholder="10.255.0.1" />
            <p className="text-xs text-muted-foreground">Gateway address sent to clients</p>
          </div>
          <div className="space-y-2">
            <Label>MTU</Label>
            <Input value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="1460" />
          </div>
          <div className="space-y-2">
            <Label>Name Servers</Label>
            <Input value={nameServers} onChange={(e) => setNameServers(e.target.value)} placeholder="8.8.8.8, 8.8.4.4" />
            <p className="text-xs text-muted-foreground">Comma-separated DNS servers</p>
          </div>
          <div className="space-y-2">
            <Label>WINS Servers</Label>
            <Input value={winsServers} onChange={(e) => setWinsServers(e.target.value)} placeholder="10.0.0.10" />
            <p className="text-xs text-muted-foreground">Comma-separated WINS servers</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default Pool</Label>
              <Input value={defaultPool} onChange={(e) => setDefaultPool(e.target.value)} placeholder="pool-name" />
            </div>
            <div className="space-y-2">
              <Label>Default IPv6 Pool</Label>
              <Input value={defaultIpv6Pool} onChange={(e) => setDefaultIpv6Pool(e.target.value)} placeholder="ipv6-pool" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Sessions</Label>
              <Input value={maxSessions} onChange={(e) => setMaxSessions(e.target.value)} placeholder="128" />
            </div>
            <div className="space-y-2">
              <Label>Thread Count</Label>
              <Input value={threadCount} onChange={(e) => setThreadCount(e.target.value)} placeholder="4" />
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
