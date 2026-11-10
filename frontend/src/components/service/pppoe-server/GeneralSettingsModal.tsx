"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("pppoeServerSettings");
  const tc = useTranslations("common");
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
        setError(result.error || t("general.updateFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("general.updateFailed"));
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
            {t("general.title")}
          </DialogTitle>
          <DialogDescription>{t("general.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <h4 className="text-sm font-medium">{t("general.serverIdentity")}</h4>
          <div className="space-y-2">
            <Label>{tc("description")}</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("general.descriptionPlaceholder")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("general.accessConcentrator")}</Label>
              <Input value={accessConcentrator} onChange={(e) => setAccessConcentrator(e.target.value)} placeholder="vyos-ac" />
            </div>
            <div className="space-y-2">
              <Label>{t("general.serviceName")}</Label>
              <Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="internet" />
            </div>
          </div>

          <h4 className="text-sm font-medium">{t("general.addressing")}</h4>
          <div className="space-y-2">
            <Label>{t("general.gatewayAddresses")}</Label>
            <div className="flex gap-2">
              <Input
                value={gatewayInput}
                onChange={(e) => setGatewayInput(e.target.value)}
                placeholder="10.0.0.1"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addToList(gatewayInput, gatewayAddresses, setGatewayAddresses, setGatewayInput); } }}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addToList(gatewayInput, gatewayAddresses, setGatewayAddresses, setGatewayInput)}>{tc("add")}</Button>
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
            <Label>{t("general.nameServers")}</Label>
            <div className="flex gap-2">
              <Input
                value={nameServerInput}
                onChange={(e) => setNameServerInput(e.target.value)}
                placeholder="8.8.8.8"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addToList(nameServerInput, nameServers, setNameServers, setNameServerInput); } }}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addToList(nameServerInput, nameServers, setNameServers, setNameServerInput)}>{tc("add")}</Button>
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
            <Label>{t("general.winsServers")}</Label>
            <div className="flex gap-2">
              <Input
                value={winsInput}
                onChange={(e) => setWinsInput(e.target.value)}
                placeholder="192.168.1.10"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addToList(winsInput, winsServers, setWinsServers, setWinsInput); } }}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addToList(winsInput, winsServers, setWinsServers, setWinsInput)}>{tc("add")}</Button>
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

          <h4 className="text-sm font-medium">{t("general.poolsSession")}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("general.defaultPool")}</Label>
              <Input value={defaultPool} onChange={(e) => setDefaultPool(e.target.value)} placeholder="pool1" />
            </div>
            <div className="space-y-2">
              <Label>{t("general.defaultIpv6Pool")}</Label>
              <Input value={defaultIpv6Pool} onChange={(e) => setDefaultIpv6Pool(e.target.value)} placeholder="ipv6-pool1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("general.sessionControl")}</Label>
            <Select value={sessionControl} onValueChange={setSessionControl}>
              <SelectTrigger><SelectValue placeholder={tc("none")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{tc("none")}</SelectItem>
                <SelectItem value="deny">{t("general.sessionDeny")}</SelectItem>
                <SelectItem value="disable">{t("general.sessionDisable")}</SelectItem>
                <SelectItem value="replace">{t("general.sessionReplace")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>MTU</Label>
              <Input value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="1492" />
            </div>
            <div className="space-y-2">
              <Label>{t("general.maxSessions")}</Label>
              <Input value={maxSessions} onChange={(e) => setMaxSessions(e.target.value)} placeholder="0-65535" />
            </div>
            <div className="space-y-2">
              <Label>{t("general.threadCount")}</Label>
              <Input value={threadCount} onChange={(e) => setThreadCount(e.target.value)} placeholder={t("general.threadCountPlaceholder")} />
            </div>
          </div>

          <h4 className="text-sm font-medium">{t("general.flags")}</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox id="accept-any" checked={acceptAnyService} onCheckedChange={(v) => setAcceptAnyService(!!v)} />
              <Label htmlFor="accept-any" className="cursor-pointer">{t("general.acceptAnyService")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="accept-blank" checked={acceptBlankService} onCheckedChange={(v) => setAcceptBlankService(!!v)} />
              <Label htmlFor="accept-blank" className="cursor-pointer">{t("general.acceptBlankService")}</Label>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tc("saving")}</> : tc("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
