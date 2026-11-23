"use client";

import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
  Network,
  Layers,
  Settings2,
} from "lucide-react";
import type { ConntrackSyncConfig, ConntrackSyncFeatures } from "@/lib/api/conntrack-sync";
import {
  conntrackSyncDraft,
  conntrackSyncProblem,
  type ConntrackSyncDraft,
  type ConntrackSyncInterfaceDraft,
} from "@/lib/api/conntrack-sync-save-ops";
import type { ApiError } from "@/lib/types/api";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { NamedListSelect } from "@/components/ui/named-list-select";

interface ConntrackSyncModalProps {
  config: ConntrackSyncConfig;
  features: ConntrackSyncFeatures;
  onClose: () => void;
  onSubmit: (draft: ConntrackSyncDraft) => Promise<void>;
}

type ListField = "accept_protocols" | "expect_sync" | "listen_addresses" | "ignore_addresses";

/** Mounted only while open, so the draft starts from the loaded config. */
export function ConntrackSyncModal({ config, features, onClose, onSubmit }: ConntrackSyncModalProps) {
  const t = useTranslations("conntrackSync");
  const tc = useTranslations("common");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [interfacesLoading, setInterfacesLoading] = useState(true);

  const [draft, setDraft] = useState<ConntrackSyncDraft>(() => conntrackSyncDraft(config));
  const [listenInput, setListenInput] = useState("");
  const [ignoreInput, setIgnoreInput] = useState("");

  useEffect(() => {
    let active = true;
    showService
      .getAllInterfaces()
      .then((res) => {
        if (active) setAvailableInterfaces([...res.interfaces].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {/* non-critical */})
      .finally(() => {
        if (active) setInterfacesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function update<K extends keyof ConntrackSyncDraft>(field: K, value: ConntrackSyncDraft[K]) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function addIfaceRow() {
    setDraft((prev) => ({ ...prev, interfaces: [...prev.interfaces, { name: "", peer: "", port: "" }] }));
  }

  function removeIfaceRow(index: number) {
    setDraft((prev) => ({ ...prev, interfaces: prev.interfaces.filter((_, i) => i !== index) }));
  }

  function updateIfaceRow(index: number, field: keyof ConntrackSyncInterfaceDraft, value: string) {
    setDraft((prev) => ({
      ...prev,
      interfaces: prev.interfaces.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));
  }

  function toggle(field: "accept_protocols" | "expect_sync", value: string) {
    setDraft((prev) => {
      const list = prev[field];
      return { ...prev, [field]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    });
  }

  function addToList(field: ListField, input: string, clear: () => void) {
    const value = input.trim();
    if (value) {
      setDraft((prev) => (prev[field].includes(value) ? prev : { ...prev, [field]: [...prev[field], value] }));
    }
    clear();
  }

  function removeFromList(field: ListField, value: string) {
    setDraft((prev) => ({ ...prev, [field]: prev[field].filter((v) => v !== value) }));
  }

  function handleOpenChange(open: boolean) {
    if (!open && !saving) onClose();
  }

  async function handleSubmit() {
    const problem = conntrackSyncProblem(draft, features);
    if (problem) {
      setError(t(`validation.${problem.key}`, problem.values));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit(draft);
    } catch (err) {
      setError((err as ApiError).message || t("modal.unexpectedError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("modal.title")}</DialogTitle>
          <DialogDescription>
            {t("modal.description")}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="interfaces" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 shrink-0">
            <TabsTrigger value="interfaces" className="flex items-center gap-1.5">
              <Network className="h-3.5 w-3.5" />
              {t("modal.tabInterfaces")}
            </TabsTrigger>
            <TabsTrigger value="protocols" className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              {t("modal.tabProtocols")}
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5" />
              {t("modal.tabAdvanced")}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Interfaces ── */}
          <TabsContent value="interfaces" className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-3 py-2">
                {draft.interfaces.length === 0 && (
                  <div className="border border-dashed rounded-md p-6 text-center text-sm text-muted-foreground">
                    {t("modal.noInterfaces")}
                  </div>
                )}

                {draft.interfaces.map((row, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_100px_32px] gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">{t("modal.interface")}</Label>
                      <InterfaceSelect
                        value={row.name}
                        onValueChange={(val) => updateIfaceRow(index, "name", val)}
                        disabled={interfacesLoading}
                        interfaces={availableInterfaces.filter(
                          (iface) =>
                            iface.name === row.name ||
                            !draft.interfaces.some((r, i) => i !== index && r.name === iface.name)
                        )}
                        placeholder={tc("selectInterface")}
                        emptyText={t("modal.noInterfacesFound")}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("modal.peerIp")}</Label>
                      <Input
                        placeholder={t("modal.peerIpPlaceholder")}
                        value={row.peer}
                        onChange={(e) => updateIfaceRow(index, "peer", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("modal.port")}</Label>
                      <Input
                        type="number"
                        min={features.interface_port.min}
                        max={features.interface_port.max}
                        value={row.port}
                        onChange={(e) => updateIfaceRow(index, "port", e.target.value)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive mb-0"
                      onClick={() => removeIfaceRow(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button variant="outline" size="sm" className="mt-1" onClick={addIfaceRow}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  {tc("addInterface")}
                </Button>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Tab 2: Protocols & Failover ── */}
          <TabsContent value="protocols" className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 py-2">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t("modal.acceptProtocols")}</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {features.accept_protocol.options.map((proto) => (
                      <div key={proto} className="flex items-center space-x-2">
                        <Checkbox
                          id={`accept-${proto}`}
                          checked={draft.accept_protocols.includes(proto)}
                          onCheckedChange={() => toggle("accept_protocols", proto)}
                        />
                        <Label htmlFor={`accept-${proto}`} className="font-mono text-sm cursor-pointer">
                          {proto}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t("modal.expectSync")}</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {features.expect_sync.options.map((proto) => (
                      <div key={proto} className="flex items-center space-x-2">
                        <Checkbox
                          id={`expect-${proto}`}
                          checked={draft.expect_sync.includes(proto)}
                          onCheckedChange={() => toggle("expect_sync", proto)}
                        />
                        <Label htmlFor={`expect-${proto}`} className="font-mono text-sm cursor-pointer">
                          {proto}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="vrrp-sync-group" className="text-sm font-medium">
                    {t("modal.vrrpSyncGroup")}
                  </Label>
                  <NamedListSelect
                    id="vrrp-sync-group"
                    value={draft.sync_group}
                    names={config.vrrp_sync_groups}
                    onValueChange={(value) => update("sync_group", value)}
                  />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Tab 3: Advanced ── */}
          <TabsContent value="advanced" className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 py-2">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t("modal.queueSizes")}</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="event-queue" className="text-xs">
                        {t("modal.eventQueue")}
                      </Label>
                      <Input
                        id="event-queue"
                        type="number"
                        min={features.event_listen_queue_size.min}
                        max={features.event_listen_queue_size.max}
                        placeholder={t("modal.defaultValue", { value: features.event_listen_queue_size.default })}
                        value={draft.event_listen_queue_size}
                        onChange={(e) => update("event_listen_queue_size", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sync-queue" className="text-xs">
                        {t("modal.syncQueue")}
                      </Label>
                      <Input
                        id="sync-queue"
                        type="number"
                        min={features.sync_queue_size.min}
                        max={features.sync_queue_size.max}
                        placeholder={t("modal.defaultValue", { value: features.sync_queue_size.default })}
                        value={draft.sync_queue_size}
                        onChange={(e) => update("sync_queue_size", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {features.purge_timeout.supported && (
                  <div className="space-y-1.5">
                    <Label htmlFor="purge-timeout" className="text-sm font-medium">
                      {t("modal.purgeTimeout")}
                    </Label>
                    <Input
                      id="purge-timeout"
                      type="number"
                      min={features.purge_timeout.min}
                      max={features.purge_timeout.max}
                      value={draft.purge_timeout}
                      onChange={(e) => update("purge_timeout", e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="mcast-group" className="text-sm font-medium">
                    {t("modal.multicastGroup")}
                  </Label>
                  <Input
                    id="mcast-group"
                    placeholder={t("modal.defaultValue", { value: features.mcast_group.default })}
                    value={draft.mcast_group}
                    onChange={(e) => update("mcast_group", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("modal.listenAddresses")}</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("modal.listenAddressPlaceholder")}
                      value={listenInput}
                      onChange={(e) => setListenInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), addToList("listen_addresses", listenInput, () => setListenInput("")))
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addToList("listen_addresses", listenInput, () => setListenInput(""))}
                    >
                      {tc("add")}
                    </Button>
                  </div>
                  {draft.listen_addresses.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {draft.listen_addresses.map((addr) => (
                        <Badge
                          key={addr}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground gap-1"
                          onClick={() => removeFromList("listen_addresses", addr)}
                        >
                          {addr} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("modal.ignoreAddresses")}</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("modal.ignoreAddressPlaceholder")}
                      value={ignoreInput}
                      onChange={(e) => setIgnoreInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), addToList("ignore_addresses", ignoreInput, () => setIgnoreInput("")))
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addToList("ignore_addresses", ignoreInput, () => setIgnoreInput(""))}
                    >
                      {tc("add")}
                    </Button>
                  </div>
                  {draft.ignore_addresses.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {draft.ignore_addresses.map((addr) => (
                        <Badge
                          key={addr}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground gap-1"
                          onClick={() => removeFromList("ignore_addresses", addr)}
                        >
                          {addr} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t("modal.options")}</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2.5">
                      <Checkbox
                        id="disable-external-cache"
                        checked={draft.disable_external_cache}
                        onCheckedChange={(v) => update("disable_external_cache", !!v)}
                      />
                      <Label htmlFor="disable-external-cache" className="cursor-pointer font-normal">
                        {t("modal.disableExternalCache")}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2.5">
                      <Checkbox
                        id="disable-syslog"
                        checked={draft.disable_syslog}
                        onCheckedChange={(v) => update("disable_syslog", !!v)}
                      />
                      <Label htmlFor="disable-syslog" className="cursor-pointer font-normal">
                        {t("modal.disableSyslog")}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2.5">
                      <Checkbox
                        id="startup-resync"
                        checked={draft.startup_resync}
                        onCheckedChange={(v) => update("startup_resync", !!v)}
                      />
                      <Label htmlFor="startup-resync" className="cursor-pointer font-normal">
                        {t("modal.startupResync")}
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 shrink-0 mt-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive whitespace-pre-wrap font-mono">{error}</p>
          </div>
        )}

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
