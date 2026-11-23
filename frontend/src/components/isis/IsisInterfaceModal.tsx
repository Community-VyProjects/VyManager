"use client";

import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { InterfaceMultiSelect } from "@/components/ui/interface-multi-select";
import { NONE_SENTINEL } from "@/lib/named-list-select-options";
import { Loader2, AlertCircle } from "lucide-react";
import type { IsisCapabilities, IsisInterface } from "@/lib/api/isis";
import type { InterfaceName } from "@/lib/api/show";
import type { ApiError } from "@/lib/types/api";
import {
  ISIS_CIRCUIT_TYPES,
  ISIS_FRR_LEVELS,
  ISIS_HELLO_INTERVAL,
  ISIS_HELLO_MULTIPLIER,
  ISIS_INTERFACE_METRIC,
  ISIS_LDP_SYNC_HOLDDOWN,
  ISIS_PRIORITY,
  ISIS_PSNP_INTERVAL,
  ISIS_REMOTE_LFA_MAX_METRIC,
  isisInterfaceForm,
  isisInterfaceProblem,
  isisNetProblem,
  type IsisFrrLevelForm,
  type IsisInterfaceForm,
  type IsisRange,
} from "@/lib/api/isis-save-ops";
import { isisInterfaceFastRerouteSupported } from "@/lib/isis-feature-flags";
import { useIsisProblemText } from "./useIsisProblemText";
import { useTranslations } from "next-intl";

interface IsisInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Commits the form (with the NET when ``needsNet``); the caller reloads.
   * A rejection keeps the modal open.
   */
  onSubmit: (form: IsisInterfaceForm, net: string | null) => Promise<void>;
  existingInterface: IsisInterface | null;
  capabilities: IsisCapabilities | null;
  interfaces: InterfaceName[];
  /** Interfaces already under protocols isis; Add does not offer them. */
  configuredInterfaces: string[];
  bfdProfileNames: string[];
  /** IS-IS has no NET yet: verify needs one in the same commit as the first interface. */
  needsNet: boolean;
}

/** Mount with a fresh ``key`` per open: the form is read once from ``existingInterface``. */
export function IsisInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
  capabilities,
  interfaces,
  configuredInterfaces,
  bfdProfileNames,
  needsNet,
}: IsisInterfaceModalProps) {
  const t = useTranslations("isis");
  const tc = useTranslations("common");
  const problemText = useIsisProblemText();
  const isEdit = !!existingInterface;
  const askNet = needsNet && !isEdit;
  const fastReroute = isisInterfaceFastRerouteSupported(capabilities?.features);

  const [form, setForm] = useState<IsisInterfaceForm>(() => isisInterfaceForm(existingInterface));
  const [net, setNet] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof IsisInterfaceForm>(key: K, value: IsisInterfaceForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const setLevel = (key: "level1" | "level2", patch: Partial<IsisFrrLevelForm>) =>
    setForm((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const otherInterfaces = interfaces.filter((i) => i.name !== form.name);

  const handleSubmit = async () => {
    const problem = (askNet ? isisNetProblem(net, true) : null)
      ?? isisInterfaceProblem(existingInterface, form, { fastReroute });
    if (problem) {
      setError(problemText(problem));
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onSubmit(form, askNet ? net : null);
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || t("interfaceModal.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const numberField = (
    id: string,
    label: string,
    key: "metric" | "priority" | "hello_interval" | "hello_multiplier" | "psnp_interval" | "ldp_sync_holddown",
    range: IsisRange,
    placeholder?: string,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        min={range.min}
        max={range.max}
      />
    </div>
  );

  const check = (id: string, label: string, checked: boolean, onChange: (v: boolean) => void, disabled = false) => (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={(c) => onChange(c === true)} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("interfaceModal.titleEdit") : t("interfaceModal.titleAdd")}</DialogTitle>
          <DialogDescription>{t("interfaceModal.description")}</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        <Tabs defaultValue="basic">
          <TabsList className="w-full">
            <TabsTrigger value="basic" className="flex-1">{t("interfaceModal.tabBasic")}</TabsTrigger>
            <TabsTrigger value="timers" className="flex-1">{t("interfaceModal.tabTimers")}</TabsTrigger>
            <TabsTrigger value="auth" className="flex-1">{t("interfaceModal.tabAuthentication")}</TabsTrigger>
            {fastReroute && (
              <TabsTrigger value="frr" className="flex-1">{t("interfaceModal.tabFastReroute")}</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            {askNet && (
              <div className="space-y-2">
                <Label htmlFor="isis-iface-net">{t("overview.net")}</Label>
                <Input
                  id="isis-iface-net"
                  value={net}
                  onChange={(e) => setNet(e.target.value)}
                  placeholder={t("overview.netPlaceholder")}
                  className="font-mono"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="isis-iface-name">{t("fields.interface")}</Label>
              <InterfaceSelect
                id="isis-iface-name"
                value={form.name}
                onValueChange={(v) => set("name", v)}
                disabled={isEdit}
                className={isEdit ? "bg-muted" : ""}
                interfaces={isEdit ? interfaces : interfaces.filter((i) => !configuredInterfaces.includes(i.name))}
                placeholder={tc("selectInterface")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="isis-iface-circuit">{t("fields.circuitType")}</Label>
              <Select
                value={form.circuit_type || NONE_SENTINEL}
                onValueChange={(v) => set("circuit_type", v === NONE_SENTINEL ? "" : v)}
              >
                <SelectTrigger id="isis-iface-circuit">
                  <SelectValue placeholder={t("interfaceModal.circuitTypePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SENTINEL}>{t("interfaceModal.circuitTypePlaceholder")}</SelectItem>
                  {ISIS_CIRCUIT_TYPES.map((ct) => (
                    <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {numberField("isis-iface-metric", t("fields.metric"), "metric", ISIS_INTERFACE_METRIC, tc("default"))}
              {numberField("isis-iface-priority", t("interfaceModal.priorityDr"), "priority", ISIS_PRIORITY,
                t("fields.defaultValue", { value: "64" }))}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              {check("isis-iface-passive", t("interfaceModal.passiveSuppress"), form.passive, (v) => set("passive", v))}
              {check("isis-iface-p2p", t("interfaceModal.pointToPoint"), form.point_to_point, (v) => set("point_to_point", v))}
              {check("isis-iface-bfd", t("interfaceModal.bfd"), form.bfd, (v) => set("bfd", v))}
              {check("isis-iface-hello-padding", t("interfaceModal.helloPadding"), form.hello_padding,
                (v) => set("hello_padding", v))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="isis-iface-bfd-profile">{t("interfaceModal.bfdProfile")}</Label>
              <NamedListSelect
                id="isis-iface-bfd-profile"
                value={form.bfd_profile}
                names={bfdProfileNames}
                onValueChange={(v) => set("bfd_profile", v)}
                disabled={!form.bfd}
              />
            </div>
          </TabsContent>

          <TabsContent value="timers" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {numberField("isis-iface-hello", t("interfaceModal.helloInterval"), "hello_interval", ISIS_HELLO_INTERVAL,
                t("fields.defaultValue", { value: "3" }))}
              {numberField("isis-iface-multiplier", t("interfaceModal.helloMultiplier"), "hello_multiplier",
                ISIS_HELLO_MULTIPLIER, t("fields.defaultValue", { value: "10" }))}
              {numberField("isis-iface-psnp", t("interfaceModal.psnpInterval"), "psnp_interval", ISIS_PSNP_INTERVAL,
                t("fields.defaultValue", { value: "2" }))}
              {numberField("isis-iface-ldp-holddown", t("fields.ldpSyncHolddown"), "ldp_sync_holddown",
                ISIS_LDP_SYNC_HOLDDOWN, tc("notSet"))}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              {check("isis-iface-no-3way", t("interfaceModal.disableThreeWayHandshake"), form.no_three_way_handshake,
                (v) => set("no_three_way_handshake", v))}
              {check("isis-iface-ldp-disable", t("interfaceModal.disableLdpSync"), form.ldp_sync_disable,
                (v) => set("ldp_sync_disable", v))}
            </div>
          </TabsContent>

          <TabsContent value="auth" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="isis-iface-pw-md5">{t("password.md5")}</Label>
              <Input
                id="isis-iface-pw-md5"
                type="password"
                autoComplete="new-password"
                value={form.password_md5}
                onChange={(e) => set("password_md5", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="isis-iface-pw-plain">{t("password.plaintext")}</Label>
              <Input
                id="isis-iface-pw-plain"
                type="password"
                autoComplete="new-password"
                value={form.password_plaintext}
                onChange={(e) => set("password_plaintext", e.target.value)}
              />
            </div>
          </TabsContent>

          {fastReroute && (
            <TabsContent value="frr" className="space-y-4 mt-4">
              <h4 className="text-sm font-medium">{t("interfaceModal.lfaTitle")}</h4>
              {ISIS_FRR_LEVELS.map(({ key, n }) => {
                const lvl = form[key];
                return (
                  <div key={key} className="space-y-3">
                    <div className="space-y-3 pl-4">
                      {check(`isis-lfa-${n}`, t(n === 1 ? "interfaceModal.enableLfaL1" : "interfaceModal.enableLfaL2"),
                        lvl.lfa, (v) => setLevel(key, { lfa: v }))}
                      <div className="space-y-2">
                        <Label htmlFor={`isis-lfa-${n}-exclude`}>{t("interfaceModal.excludeInterfaces")}</Label>
                        <InterfaceMultiSelect
                          id={`isis-lfa-${n}-exclude`}
                          values={lvl.exclude}
                          onChange={(values) => setLevel(key, { exclude: values })}
                          interfaces={otherInterfaces}
                        />
                      </div>
                      {check(`isis-rlfa-${n}`,
                        t(n === 1 ? "interfaceModal.enableRemoteLfaL1" : "interfaceModal.enableRemoteLfaL2"),
                        lvl.remoteLfa, (v) => setLevel(key, { remoteLfa: v }))}
                      <div className="pl-6 grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor={`isis-rlfa-${n}-metric`} className="text-xs">{t("interfaceModal.maxMetric")}</Label>
                          <Input
                            id={`isis-rlfa-${n}-metric`}
                            type="number"
                            value={lvl.remoteMaxMetric}
                            disabled={!lvl.remoteLfa}
                            onChange={(e) => setLevel(key, { remoteMaxMetric: e.target.value })}
                            placeholder={t("interfaceModal.unlimited")}
                            min={ISIS_REMOTE_LFA_MAX_METRIC.min}
                            max={ISIS_REMOTE_LFA_MAX_METRIC.max}
                          />
                        </div>
                        <div className="flex items-end pb-1">
                          {check(`isis-rlfa-${n}-ldp`, t("interfaceModal.mplsLdpTunnel"), lvl.remoteTunnelMplsLdp,
                            (v) => setLevel(key, { remoteTunnelMplsLdp: v }), !lvl.remoteLfa)}
                        </div>
                      </div>
                    </div>
                    <Separator />
                  </div>
                );
              })}

              <div className="space-y-3">
                <h4 className="text-sm font-medium">{t("interfaceModal.tiLfaTitle")}</h4>
                <div className="space-y-2 pl-4">
                  {check("isis-tilfa", t("interfaceModal.enableTiLfa"), form.tiLfa, (v) => set("tiLfa", v))}
                  {ISIS_FRR_LEVELS.map(({ key, n }) => {
                    const lvl = form[key];
                    const levelOn = form.tiLfa && lvl.tiLfa;
                    return (
                      <div key={key} className="space-y-2 pl-4">
                        {check(`isis-tilfa-${n}`,
                          t(n === 1 ? "interfaceModal.enableTiLfaL1" : "interfaceModal.enableTiLfaL2"),
                          lvl.tiLfa, (v) => setLevel(key, { tiLfa: v }), !form.tiLfa)}
                        <div className="pl-6 space-y-2">
                          {check(`isis-tilfa-${n}-np`, t("interfaceModal.nodeProtection"), lvl.nodeProtection,
                            (v) => setLevel(key, { nodeProtection: v }), !levelOn)}
                          {check(`isis-tilfa-${n}-lf`, t("interfaceModal.linkFallback"), lvl.linkFallback,
                            (v) => setLevel(key, { linkFallback: v }), !levelOn || !lvl.nodeProtection)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? tc("saveChanges") : tc("addInterface")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
