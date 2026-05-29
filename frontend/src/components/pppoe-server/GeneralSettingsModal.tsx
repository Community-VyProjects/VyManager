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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Settings, X } from "lucide-react";
import { pppoeServerService, PPPoEConfigResponse } from "@/lib/api/pppoe-server";
import { ApiError } from "@/lib/types/api";

interface GeneralSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: PPPoEConfigResponse;
}

export function GeneralSettingsModal({ open, onOpenChange, onSuccess, config }: GeneralSettingsModalProps) {
  const [description, setDescription] = useState("");
  const [accessConcentrator, setAccessConcentrator] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [gatewayAddresses, setGatewayAddresses] = useState<string[]>([]);
  const [gatewayInput, setGatewayInput] = useState("");
  const [nameServers, setNameServers] = useState<string[]>([]);
  const [nameServerInput, setNameServerInput] = useState("");
  const [winsServers, setWinsServers] = useState<string[]>([]);
  const [winsInput, setWinsInput] = useState("");
  const [defaultPool, setDefaultPool] = useState("");
  const [defaultIpv6Pool, setDefaultIpv6Pool] = useState("");
  const [sessionControl, setSessionControl] = useState("__none__");
  const [mtu, setMtu] = useState("");
  const [maxSessions, setMaxSessions] = useState("");
  const [threadCount, setThreadCount] = useState("");
  const [acceptAnyService, setAcceptAnyService] = useState(false);
  const [acceptBlankService, setAcceptBlankService] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDescription(config.description || "");
      setAccessConcentrator(config.access_concentrator || "");
      setServiceName(config.service_name || "");
      setGatewayAddresses(config.gateway_addresses || []);
      setGatewayInput("");
      setNameServers(config.name_servers || []);
      setNameServerInput("");
      setWinsServers(config.wins_servers || []);
      setWinsInput("");
      setDefaultPool(config.default_pool || "");
      setDefaultIpv6Pool(config.default_ipv6_pool || "");
      setSessionControl(config.session_control || "__none__");
      setMtu(config.mtu || "");
      setMaxSessions(config.max_concurrent_sessions || "");
      setThreadCount(config.thread_count || "");
      setAcceptAnyService(config.accept_any_service || false);
      setAcceptBlankService(config.accept_blank_service || false);
      setError(null);
    }
  }, [open, config]);

  const addToList = (val: string, list: string[], setter: (v: string[]) => void, inputSetter: (v: string) => void) => {
    const trimmed = val.trim();
    if (trimmed && !list.includes(trimmed)) {
      setter([...list, trimmed]);
      inputSetter("");
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await pppoeServerService.updateGeneralSettings(config, {
        description,
        access_concentrator: accessConcentrator,
        service_name: serviceName,
        gateway_addresses: gatewayAddresses,
        name_servers: nameServers,
        wins_servers: winsServers,
        default_pool: defaultPool,
        default_ipv6_pool: defaultIpv6Pool,
        session_control: sessionControl === "__none__" ? "" : sessionControl,
        mtu,
        max_concurrent_sessions: maxSessions,
        thread_count: threadCount,
        accept_any_service: acceptAnyService,
        accept_blank_service: acceptBlankService,
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
          <DialogDescription>Configure PPPoE server general settings.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Server Identity</h4>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="PPPoE broadband server" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Access Concentrator</Label>
              <Input value={accessConcentrator} onChange={(e) => setAccessConcentrator(e.target.value)} placeholder="vyos-ac" />
            </div>
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="internet" />
            </div>
          </div>

          <h4 className="text-sm font-medium">Addressing</h4>
          <div className="space-y-2">
            <Label>Gateway Addresses</Label>
            <div className="flex gap-2">
              <Input
                value={gatewayInput}
                onChange={(e) => setGatewayInput(e.target.value)}
                placeholder="10.0.0.1"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addToList(gatewayInput, gatewayAddresses, setGatewayAddresses, setGatewayInput); } }}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addToList(gatewayInput, gatewayAddresses, setGatewayAddresses, setGatewayInput)}>Add</Button>
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
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addToList(nameServerInput, nameServers, setNameServers, setNameServerInput); } }}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addToList(nameServerInput, nameServers, setNameServers, setNameServerInput)}>Add</Button>
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

          <div className="space-y-2">
            <Label>WINS Servers</Label>
            <div className="flex gap-2">
              <Input
                value={winsInput}
                onChange={(e) => setWinsInput(e.target.value)}
                placeholder="192.168.1.10"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addToList(winsInput, winsServers, setWinsServers, setWinsInput); } }}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addToList(winsInput, winsServers, setWinsServers, setWinsInput)}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {winsServers.map((ws) => (
                <Badge key={ws} variant="secondary" className="gap-1 font-mono text-xs">
                  {ws}
                  <button onClick={() => setWinsServers(winsServers.filter((w) => w !== ws))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <h4 className="text-sm font-medium">Pools & Session</h4>
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
            <Label>Session Control</Label>
            <Select value={sessionControl} onValueChange={setSessionControl}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                <SelectItem value="deny">Deny</SelectItem>
                <SelectItem value="disable">Disable</SelectItem>
                <SelectItem value="replace">Replace</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>MTU</Label>
              <Input value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="1492" />
            </div>
            <div className="space-y-2">
              <Label>Max Sessions</Label>
              <Input value={maxSessions} onChange={(e) => setMaxSessions(e.target.value)} placeholder="0-65535" />
            </div>
            <div className="space-y-2">
              <Label>Thread Count</Label>
              <Input value={threadCount} onChange={(e) => setThreadCount(e.target.value)} placeholder="auto" />
            </div>
          </div>

          <h4 className="text-sm font-medium">Flags</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox id="accept-any" checked={acceptAnyService} onCheckedChange={(v) => setAcceptAnyService(!!v)} />
              <Label htmlFor="accept-any" className="cursor-pointer">Accept Any Service</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="accept-blank" checked={acceptBlankService} onCheckedChange={(v) => setAcceptBlankService(!!v)} />
              <Label htmlFor="accept-blank" className="cursor-pointer">Accept Blank Service</Label>
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
