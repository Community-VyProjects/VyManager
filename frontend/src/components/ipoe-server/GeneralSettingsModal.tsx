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
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Settings, X } from "lucide-react";
import { ipoeServerService, IPoEConfigResponse } from "@/lib/api/ipoe-server";
import { ApiError } from "@/lib/types/api";

interface GeneralSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: IPoEConfigResponse;
}

export function GeneralSettingsModal({ open, onOpenChange, onSuccess, config }: GeneralSettingsModalProps) {
  const [description, setDescription] = useState("");
  const [defaultPool, setDefaultPool] = useState("");
  const [defaultIpv6Pool, setDefaultIpv6Pool] = useState("");
  const [gatewayAddresses, setGatewayAddresses] = useState<string[]>([]);
  const [gatewayInput, setGatewayInput] = useState("");
  const [nameServers, setNameServers] = useState<string[]>([]);
  const [nameServerInput, setNameServerInput] = useState("");
  const [maxSessions, setMaxSessions] = useState("");
  const [threadCount, setThreadCount] = useState("");
  const [luaFile, setLuaFile] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDescription(config.description || "");
      setDefaultPool(config.default_pool || "");
      setDefaultIpv6Pool(config.default_ipv6_pool || "");
      setGatewayAddresses(config.gateway_addresses || []);
      setGatewayInput("");
      setNameServers(config.name_servers || []);
      setNameServerInput("");
      setMaxSessions(config.max_concurrent_sessions || "");
      setThreadCount(config.thread_count || "");
      setLuaFile(config.lua_file || "");
      setError(null);
    }
  }, [open, config]);

  const addGateway = () => {
    const val = gatewayInput.trim();
    if (val && !gatewayAddresses.includes(val)) {
      setGatewayAddresses([...gatewayAddresses, val]);
      setGatewayInput("");
    }
  };

  const addNameServer = () => {
    const val = nameServerInput.trim();
    if (val && !nameServers.includes(val)) {
      setNameServers([...nameServers, val]);
      setNameServerInput("");
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ipoeServerService.updateGeneralSettings(config, {
        description,
        default_pool: defaultPool,
        default_ipv6_pool: defaultIpv6Pool,
        gateway_addresses: gatewayAddresses,
        name_servers: nameServers,
        max_concurrent_sessions: maxSessions,
        thread_count: threadCount,
        lua_file: luaFile,
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
          <DialogDescription>Configure IPoE server general settings.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="IPoE broadband server" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default Pool</Label>
              <Input value={defaultPool} onChange={(e) => setDefaultPool(e.target.value)} placeholder="pool1" />
            </div>
            <div className="space-y-2">
              <Label>Default IPv6 Pool</Label>
              <Input value={defaultIpv6Pool} onChange={(e) => setDefaultIpv6Pool(e.target.value)} placeholder="ipv6-pool1" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Gateway Addresses</Label>
            <div className="flex gap-2">
              <Input
                value={gatewayInput}
                onChange={(e) => setGatewayInput(e.target.value)}
                placeholder="10.0.0.1"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGateway(); } }}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addGateway}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {gatewayAddresses.map((addr) => (
                <Badge key={addr} variant="secondary" className="gap-1 font-mono text-xs">
                  {addr}
                  <button onClick={() => setGatewayAddresses(gatewayAddresses.filter((a) => a !== addr))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Name Servers</Label>
            <div className="flex gap-2">
              <Input
                value={nameServerInput}
                onChange={(e) => setNameServerInput(e.target.value)}
                placeholder="8.8.8.8"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNameServer(); } }}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addNameServer}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {nameServers.map((ns) => (
                <Badge key={ns} variant="secondary" className="gap-1 font-mono text-xs">
                  {ns}
                  <button onClick={() => setNameServers(nameServers.filter((n) => n !== ns))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Concurrent Sessions</Label>
              <Input value={maxSessions} onChange={(e) => setMaxSessions(e.target.value)} placeholder="0-65535" />
            </div>
            <div className="space-y-2">
              <Label>Thread Count</Label>
              <Input value={threadCount} onChange={(e) => setThreadCount(e.target.value)} placeholder="auto" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Lua File</Label>
            <Input value={luaFile} onChange={(e) => setLuaFile(e.target.value)} placeholder="/config/scripts/ipoe.lua" />
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
