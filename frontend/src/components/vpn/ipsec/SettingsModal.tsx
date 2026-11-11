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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Settings } from "lucide-react";
import { InterfaceMultiSelect } from "@/components/ui/interface-multi-select";
import { InterfaceSelect } from "@/components/ui/interface-select";
import {
  ipsecService,
  IPSecOptions,
  IPSecLog,
  IPSecCapabilities,
  BatchOperation,
  RADhcp,
  RARadius,
} from "@/lib/api/ipsec";
import { showService, InterfaceName } from "@/lib/api/show";
import { ApiError } from "@/lib/types/api";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: IPSecCapabilities | null;
  currentOptions: IPSecOptions;
  currentLog: IPSecLog;
  currentInterfaces: string[];
  disableUniqreqids: boolean;
  currentDhcp: RADhcp;
  currentRadius: RARadius;
}

export function SettingsModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  currentOptions,
  currentLog,
  currentInterfaces,
  disableUniqreqids: currentDisableUniqreqids,
  currentDhcp,
  currentRadius,
}: SettingsModalProps) {
  const t = useTranslations("ipsecSettings");
  const tc = useTranslations("common");
  const [allInterfaces, setAllInterfaces] = useState<InterfaceName[]>([]);

  // Options
  const [disableRouteAutoinstall, setDisableRouteAutoinstall] = useState(false);
  const [flexvpn, setFlexvpn] = useState(false);
  const [virtualIp, setVirtualIp] = useState(false);
  const [disableUniqreqids, setDisableUniqreqids] = useState(false);
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [optionsInterface, setOptionsInterface] = useState("");

  // Logging
  const [logLevel, setLogLevel] = useState("");
  const [logSubsystems, setLogSubsystems] = useState<string[]>([]);

  // Retransmission (1.5 only)
  const [retransmissionAttempts, setRetransmissionAttempts] = useState("");
  const [retransmissionBase, setRetransmissionBase] = useState("");
  const [retransmissionTimeout, setRetransmissionTimeout] = useState("");

  // Remote access DHCP and RADIUS
  const [dhcpInterface, setDhcpInterface] = useState("");
  const [dhcpServer, setDhcpServer] = useState("");
  const [nasIdentifier, setNasIdentifier] = useState("");
  const [radiusTimeout, setRadiusTimeout] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    showService.getAllInterfaces().then((res) => setAllInterfaces(res.interfaces)).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setDisableRouteAutoinstall(currentOptions.disable_route_autoinstall || false);
      setFlexvpn(currentOptions.flexvpn || false);
      setVirtualIp(currentOptions.virtual_ip || false);
      setDisableUniqreqids(currentDisableUniqreqids);
      setInterfaces(currentInterfaces);
      setOptionsInterface(currentOptions.interface || "");
      setLogLevel(currentLog.level || "");
      setLogSubsystems(currentLog.subsystems || []);
      setRetransmissionAttempts(currentOptions.retransmission_attempts || "");
      setRetransmissionBase(currentOptions.retransmission_base || "");
      setRetransmissionTimeout(currentOptions.retransmission_timeout || "");
      setDhcpInterface(currentDhcp.interface || "");
      setDhcpServer(currentDhcp.server || "");
      setNasIdentifier(currentRadius.nas_identifier || "");
      setRadiusTimeout(currentRadius.timeout || "");
      setError(null);
    }
  }, [open, currentOptions, currentLog, currentInterfaces, currentDisableUniqreqids, currentDhcp, currentRadius]);

  const toggleSubsystem = (sub: string) => {
    setLogSubsystems((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const ops: BatchOperation[] = [];
      const changed = (next: boolean, prev: boolean, setOp: string, deleteOp: string) => {
        if (next === prev) return;
        ops.push({ op: next ? setOp : deleteOp });
      };
      changed(disableRouteAutoinstall, currentOptions.disable_route_autoinstall || false, "set_options_disable_route_autoinstall", "delete_options_disable_route_autoinstall");
      changed(flexvpn, currentOptions.flexvpn || false, "set_options_flexvpn", "delete_options_flexvpn");
      changed(virtualIp, currentOptions.virtual_ip || false, "set_options_virtual_ip", "delete_options_virtual_ip");
      changed(disableUniqreqids, currentDisableUniqreqids, "set_disable_uniqreqids", "delete_disable_uniqreqids");

      for (const oldIface of currentInterfaces) {
        if (!interfaces.includes(oldIface)) ops.push({ op: "delete_interface", item_name: oldIface });
      }
      for (const newIface of interfaces) {
        if (!currentInterfaces.includes(newIface)) ops.push({ op: "set_interface", item_name: newIface });
      }

      const currentLevel = currentLog.level || "";
      if (!logLevel && currentLevel) ops.push({ op: "delete_log_level" });
      else if (logLevel && logLevel !== currentLevel) ops.push({ op: "set_log_level", item_name: logLevel });

      const currentSubs = currentLog.subsystems || [];
      for (const oldSub of currentSubs) {
        if (!logSubsystems.includes(oldSub)) ops.push({ op: "delete_log_subsystem", item_name: oldSub });
      }
      for (const newSub of logSubsystems) {
        if (!currentSubs.includes(newSub)) ops.push({ op: "set_log_subsystem", item_name: newSub });
      }

      const leaf = (next: string, prev: string, setOp: string, deleteOp: string) => {
        if (!next && prev) ops.push({ op: deleteOp });
        else if (next && next !== prev) ops.push({ op: setOp, item_name: next });
      };
      leaf(optionsInterface, currentOptions.interface || "", "set_options_interface", "delete_options_interface");
      leaf(dhcpInterface, currentDhcp.interface || "", "set_ra_dhcp_interface", "delete_ra_dhcp_interface");
      leaf(dhcpServer.trim(), currentDhcp.server || "", "set_ra_dhcp_server", "delete_ra_dhcp_server");
      leaf(nasIdentifier.trim(), currentRadius.nas_identifier || "", "set_ra_radius_nas_identifier", "delete_ra_radius_nas_identifier");
      leaf(radiusTimeout.trim(), currentRadius.timeout || "", "set_ra_radius_timeout", "delete_ra_radius_timeout");

      if (capabilities?.features.retransmission_options.supported) {
        leaf(retransmissionAttempts, currentOptions.retransmission_attempts || "", "set_options_retransmission_attempts", "delete_options_retransmission_attempts");
        leaf(retransmissionBase, currentOptions.retransmission_base || "", "set_options_retransmission_base", "delete_options_retransmission_base");
        leaf(retransmissionTimeout, currentOptions.retransmission_timeout || "", "set_options_retransmission_timeout", "delete_options_retransmission_timeout");
      }

      if (ops.length === 0) {
        onOpenChange(false);
        return;
      }

      const result = await ipsecService.executeBatch("_settings", ops);
      if (!result.success) {
        setError(result.error || t("settings.updateFailed"));
        setLoading(false);
        return;
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("settings.updateFailed"));
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
            {t("settings.title")}
          </DialogTitle>
          <DialogDescription>
            {t("settings.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("settings.options")}</Label>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox id="disableRouteAutoinstall" checked={disableRouteAutoinstall} onCheckedChange={(c) => setDisableRouteAutoinstall(c === true)} />
                <Label htmlFor="disableRouteAutoinstall" className="cursor-pointer text-sm">{t("settings.disableRouteAutoinstall")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="flexvpn" checked={flexvpn} onCheckedChange={(c) => setFlexvpn(c === true)} />
                <Label htmlFor="flexvpn" className="cursor-pointer text-sm">FlexVPN</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="virtualIp" checked={virtualIp} onCheckedChange={(c) => setVirtualIp(c === true)} />
                <Label htmlFor="virtualIp" className="cursor-pointer text-sm">{t("settings.virtualIp")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="disableUniqreqids" checked={disableUniqreqids} onCheckedChange={(c) => setDisableUniqreqids(c === true)} />
                <Label htmlFor="disableUniqreqids" className="cursor-pointer text-sm">{t("settings.disableUniqReqIds")}</Label>
              </div>
            </div>
          </div>

          {/* Interfaces */}
          <div className="space-y-2">
            <Label>{t("settings.interfaces")}</Label>
            <InterfaceMultiSelect values={interfaces} onChange={setInterfaces} interfaces={allInterfaces} />
          </div>
          <div className="space-y-2">
            <Label>{t("settings.optionsInterface")}</Label>
            <InterfaceSelect
              value={optionsInterface}
              onValueChange={setOptionsInterface}
              interfaces={allInterfaces}
              noneOption={{ label: tc("none"), value: "" }}
            />
          </div>

          {/* Logging */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("settings.logging")}</Label>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t("settings.logLevel")}</Label>
              <Select value={logLevel || "_default"} onValueChange={(v) => setLogLevel(v === "_default" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder={tc("default")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_default">{tc("default")}</SelectItem>
                  {(capabilities?.features.ipsec.log_levels || []).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t("settings.subsystems")}</Label>
              <div className="grid grid-cols-4 gap-2">
                {(capabilities?.features.ipsec.log_subsystems || []).map((sub) => (
                  <div key={sub} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`sub-${sub}`}
                      checked={logSubsystems.includes(sub)}
                      onCheckedChange={() => toggleSubsystem(sub)}
                    />
                    <Label htmlFor={`sub-${sub}`} className="cursor-pointer text-xs font-mono">{sub}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Remote access DHCP and RADIUS */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("settings.remoteAccess")}</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("psk.dhcpInterface")}</Label>
                <InterfaceSelect
                  value={dhcpInterface}
                  onValueChange={setDhcpInterface}
                  interfaces={allInterfaces}
                  noneOption={{ label: tc("none"), value: "" }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("settings.dhcpServer")}</Label>
                <Input value={dhcpServer} onChange={(e) => setDhcpServer(e.target.value)} placeholder="192.0.2.1" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("settings.nasIdentifier")}</Label>
                <Input value={nasIdentifier} onChange={(e) => setNasIdentifier(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("settings.radiusTimeout")}</Label>
                <Input value={radiusTimeout} onChange={(e) => setRadiusTimeout(e.target.value)} placeholder={tc("default")} />
              </div>
            </div>
          </div>

          {/* Retransmission (1.5 only) */}
          {capabilities?.features.retransmission_options.supported && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("settings.retransmission")}</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("settings.attempts")}</Label>
                  <Input value={retransmissionAttempts} onChange={(e) => setRetransmissionAttempts(e.target.value)} placeholder={tc("default")} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("settings.base")}</Label>
                  <Input value={retransmissionBase} onChange={(e) => setRetransmissionBase(e.target.value)} placeholder={tc("default")} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("settings.timeout")}</Label>
                  <Input value={retransmissionTimeout} onChange={(e) => setRetransmissionTimeout(e.target.value)} placeholder={tc("default")} />
                </div>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tc("saving")}</> : t("settings.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
