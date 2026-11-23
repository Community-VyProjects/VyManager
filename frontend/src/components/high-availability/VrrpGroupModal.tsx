"use client";

import { useState } from "react";
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
import { NamedListSelect } from "@/components/ui/named-list-select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { InterfaceMultiSelect } from "@/components/ui/interface-multi-select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AlertCircle, ChevronDown, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/lib/types/api";
import type { HACapabilities, VrrpGroup, VrrpSyncGroup } from "@/lib/api/high-availability";
import {
  HA_PASSWORD_MAX,
  HA_RANGES,
  vrrpGroupDraft,
  vrrpGroupProblem,
  type HAAddressDraft,
  type HAProblem,
  type VrrpGroupDraft,
  type VrrpGroupProblemKey,
} from "@/lib/api/high-availability-save-ops";
import { HA_FIELD_LABELS } from "./ha-field-labels";
import { GarpFields, HealthCheckFields, TransitionScriptFields } from "./HaSectionFields";



interface VrrpGroupModalProps {
  onOpenChange: (open: boolean) => void;
  existingGroup?: VrrpGroup | null;
  existingNames: string[];
  syncGroups: VrrpSyncGroup[];
  capabilities?: HACapabilities | null;
  onSubmit: (draft: VrrpGroupDraft) => Promise<void>;
}

/** Rendered only while open, so the draft starts from the group each time. */
export function VrrpGroupModal({
  onOpenChange,
  existingGroup,
  existingNames,
  syncGroups,
  capabilities,
  onSubmit,
}: VrrpGroupModalProps) {
  const t = useTranslations("highAvailability");
  const tc = useTranslations("common");
  const isEdit = !!existingGroup;
  const timeoutSupported = capabilities?.features.health_check_timeout?.supported ?? false;
  const authTypes = capabilities?.auth_types || [];
  const [draft, setDraft] = useState<VrrpGroupDraft>(() => {
    const loaded = vrrpGroupDraft(existingGroup);
    // A new group starts with one empty virtual address row (the lab requires one).
    return existingGroup ? loaded : { ...loaded, addresses: [{ address: "", interface: "" }] };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [newPeer, setNewPeer] = useState("");

  const set = <K extends keyof VrrpGroupDraft>(field: K) => (value: VrrpGroupDraft[K]) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  const setAddress = (
    list: "addresses" | "excluded_addresses",
    idx: number,
    field: keyof HAAddressDraft,
    value: string,
  ) => {
    setDraft((prev) => {
      const items = [...prev[list]];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, [list]: items };
    });
  };

  const addAddress = (list: "addresses" | "excluded_addresses") =>
    setDraft((prev) => ({ ...prev, [list]: [...prev[list], { address: "", interface: "" }] }));

  const removeAddress = (list: "addresses" | "excluded_addresses", idx: number) =>
    setDraft((prev) => ({ ...prev, [list]: prev[list].filter((_, i) => i !== idx) }));

  const addPeer = () => {
    const peer = newPeer.trim();
    if (peer && !draft.peer_addresses.includes(peer)) {
      set("peer_addresses")([...draft.peer_addresses, peer]);
      setNewPeer("");
    }
  };

  const problemText = (problem: HAProblem<VrrpGroupProblemKey>): string => {
    if (problem.key === "outOfRange") {
      return t("outOfRange", {
        field: t(HA_FIELD_LABELS[problem.field!]),
        min: problem.min!,
        max: problem.max!,
      });
    }
    if (problem.key === "healthCheckPingAndScript") return t("healthCheckPingAndScript");
    return t(`vrrpModal.${problem.key}`, {
      address: problem.address ?? "",
      name: problem.name ?? "",
      max: problem.max ?? 0,
    });
  };

  const close = (open: boolean) => {
    if (!loading) onOpenChange(open);
  };

  const handleSubmit = async () => {
    setError(null);
    const problem = vrrpGroupProblem(existingGroup ?? null, draft, existingNames, syncGroups);
    if (problem) {
      setError(problemText(problem));
      return;
    }
    setLoading(true);
    try {
      await onSubmit(draft);
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const addressRows = (list: "addresses" | "excluded_addresses", required: boolean) => (
    <div className="space-y-2">
      {draft[list].map((addr, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input
            value={addr.address}
            onChange={(e) => setAddress(list, idx, "address", e.target.value)}
            placeholder="192.168.1.1/24"
            className="font-mono"
          />
          <div className="w-44 shrink-0">
            <InterfaceSelect
              value={addr.interface}
              onValueChange={(v) => setAddress(list, idx, "interface", v)}
              noneOption={{ label: t("vrrpModal.interfaceOptional"), value: "" }}
            />
          </div>
          {(!required || draft[list].length > 1) && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
              onClick={() => removeAddress(list, idx)}
              aria-label={t("remove")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open onOpenChange={close}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEdit ? t("vrrpModal.editTitle") : t("vrrp.add")}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("vrrpModal.editingDescription", { name: existingGroup!.name })
              : t("vrrpModal.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
          <div className="space-y-5 py-2">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive whitespace-pre-wrap font-mono leading-relaxed">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("vrrpModal.groupName")} <span className="text-destructive">*</span></Label>
                <Input
                  value={draft.name}
                  onChange={(e) => set("name")(e.target.value)}
                  disabled={isEdit}
                  placeholder={t("example", { value: "WAN-GROUP" })}
                  className={isEdit ? "opacity-60" : ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("vrid")} <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  {...HA_RANGES.vrid}
                  value={draft.vrid}
                  onChange={(e) => set("vrid")(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("interface")} <span className="text-destructive">*</span></Label>
                <InterfaceSelect
                  value={draft.interface}
                  onValueChange={set("interface")}
                  placeholder={tc("selectInterface")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("priority")}</Label>
                <Input
                  type="number"
                  {...HA_RANGES.priority}
                  value={draft.priority}
                  onChange={(e) => set("priority")(e.target.value)}
                  placeholder={t("vrrpModal.defaultValue", { value: "100" })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("vrrpModal.advertiseInterval")}</Label>
                <Input
                  type="number"
                  {...HA_RANGES.advertise_interval}
                  value={draft.advertise_interval}
                  onChange={(e) => set("advertise_interval")(e.target.value)}
                  placeholder={t("vrrpModal.defaultValue", { value: "1" })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{tc("description")}</Label>
                <Input
                  value={draft.description}
                  onChange={(e) => set("description")(e.target.value)}
                  placeholder={tc("optionalDescription")}
                />
              </div>
            </div>

            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t("vrrpModal.virtualAddresses")} <span className="text-destructive">*</span></Label>
                <Button type="button" variant="outline" size="sm" onClick={() => addAddress("addresses")}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> {t("vrrpModal.addIp")}
                </Button>
              </div>
              {addressRows("addresses", true)}
            </div>

            <Separator />
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" className="w-full justify-between px-0 font-medium">
                  {t("vrrpModal.advancedSettings")}
                  <ChevronDown className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-5 pt-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{t("vrrpModal.excludedAddresses")}</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => addAddress("excluded_addresses")}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> {t("vrrpModal.addIp")}
                    </Button>
                  </div>
                  {addressRows("excluded_addresses", false)}
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t("vrrpModal.authentication")}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{t("vrrpModal.type")}</Label>
                      <NamedListSelect
                        value={draft.auth_type}
                        onValueChange={set("auth_type")}
                        names={authTypes}
                      />
                    </div>
                    {draft.auth_type && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t("vrrpModal.password")}</Label>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          maxLength={HA_PASSWORD_MAX}
                          value={draft.auth_password}
                          onChange={(e) => set("auth_password")(e.target.value)}
                          placeholder={existingGroup?.authentication ? t("vrrpModal.passwordKeep") : undefined}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t("vrrpModal.preemption")}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <Checkbox
                        id="no_preempt"
                        checked={draft.no_preempt}
                        onCheckedChange={(v) => set("no_preempt")(v === true)}
                      />
                      <label htmlFor="no_preempt" className="text-sm font-medium cursor-pointer">
                        {t("vrrpModal.disablePreemption")}
                      </label>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{t("vrrpModal.preemptDelay")}</Label>
                      <Input
                        type="number"
                        {...HA_RANGES.preempt_delay}
                        value={draft.preempt_delay}
                        onChange={(e) => set("preempt_delay")(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("vrrpModal.peerAddresses")}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newPeer}
                      onChange={(e) => setNewPeer(e.target.value)}
                      placeholder="192.168.1.2"
                      className="font-mono"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addPeer();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addPeer} aria-label={t("vrrpModal.addIp")}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {draft.peer_addresses.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {draft.peer_addresses.map((peer) => (
                        <Badge key={peer} variant="secondary" className="gap-1 font-mono">
                          {peer}
                          <button
                            type="button"
                            onClick={() => set("peer_addresses")(draft.peer_addresses.filter((p) => p !== peer))}
                            className="hover:text-destructive"
                            aria-label={t("remove")}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("vrrpModal.trackInterfaces")}</Label>
                  <InterfaceMultiSelect
                    values={draft.track_interfaces}
                    onChange={set("track_interfaces")}
                    placeholder={t("vrrpModal.selectTrackInterface")}
                  />
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <Checkbox
                      id="track_exclude"
                      checked={draft.track_exclude_vrrp_interface}
                      onCheckedChange={(v) => set("track_exclude_vrrp_interface")(v === true)}
                    />
                    <label htmlFor="track_exclude" className="text-sm font-medium cursor-pointer">
                      {t("vrrpModal.excludeVrrpInterface")}
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t("healthCheck")}</Label>
                  <HealthCheckFields
                    value={draft.health_check}
                    onChange={set("health_check")}
                    timeoutSupported={timeoutSupported}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t("garp")}</Label>
                  <GarpFields value={draft.garp} onChange={set("garp")} />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t("transitionScripts")}</Label>
                  <TransitionScriptFields value={draft.transition_script} onChange={set("transition_script")} />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t("vrrpModal.otherOptions")}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{t("vrrpModal.helloSourceAddress")}</Label>
                      <Input
                        value={draft.hello_source_address}
                        onChange={(e) => set("hello_source_address")(e.target.value)}
                        placeholder={t("vrrpModal.helloSourcePlaceholder")}
                        className="font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <Checkbox
                        id="rfc3768"
                        checked={draft.rfc3768_compatibility}
                        onCheckedChange={(v) => set("rfc3768_compatibility")(v === true)}
                      />
                      <label htmlFor="rfc3768" className="text-sm font-medium cursor-pointer">
                        {t("vrrpModal.rfc3768")}
                      </label>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => close(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? tc("saveChanges") : t("vrrpModal.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
