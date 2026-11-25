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
import { VrfSelect } from "@/components/ui/vrf-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { MultiValueInput } from "@/components/service/webproxy/MultiValueInput";
import { AlertCircle, Loader2 } from "lucide-react";
import type { ContainerCapabilities, ContainerInstance, ContainerNetworkConfig } from "@/lib/api/container";
import {
  DESCRIPTION_MAX,
  MACVLAN_PARENT_RE,
  MACVLAN_PARENT_TYPES,
  NETWORK_MTU_RANGE,
  networkProblem,
} from "@/lib/api/container-save-ops";
import type { ApiError } from "@/lib/types/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The network being edited; null adds one. */
  network: ContainerNetworkConfig | null;
  capabilities: ContainerCapabilities;
  /** Every configured network name (an Add may not reuse one). */
  existingNames: string[];
  /** Every configured container: an edit may not break the ones attached to this network. */
  containers: ContainerInstance[];
  onSubmit: (draft: ContainerNetworkConfig) => Promise<void>;
}

const EMPTY_NETWORK: ContainerNetworkConfig = {
  name: "",
  description: null,
  gateways: [],
  mtu: null,
  no_name_server: false,
  prefixes: [],
  network_type: null,
  macvlan_mode: null,
  macvlan_parent: null,
  vrf: null,
};

export function NetworkModal({ open, onOpenChange, network, capabilities, existingNames, containers, onSubmit }: Props) {
  const t = useTranslations("containerResources");
  const tm = useTranslations("containers");
  const tc = useTranslations("common");
  const isEditMode = !!network;
  const { features, values } = capabilities;

  const [draft, setDraft] = useState<ContainerNetworkConfig>(() => ({
    ...(network ?? EMPTY_NETWORK),
    prefixes: [...(network?.prefixes ?? [])],
    gateways: [...(network?.gateways ?? [])],
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<ContainerNetworkConfig>) => setDraft((d) => ({ ...d, ...patch }));

  const handleOpenChange = (next: boolean) => {
    if (!next && saving) return;
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    const issue = networkProblem(network, draft, { features, existingNames, rules: capabilities, containers });
    if (issue) {
      setError(t(`networkProblems.${issue.key}`, issue.values));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(draft);
      onOpenChange(false);
    } catch (err: unknown) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setSaving(false);
    }
  };

  const macvlan = features.network_type && draft.network_type === "macvlan";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("networkModal.editTitle", { name: network?.name ?? "" }) : t("networks.addNetwork")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? t("networkModal.editDescription") : t("networkModal.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 pb-2">
            <div className="space-y-2">
              <Label htmlFor="net-name">{t("networkModal.networkName")}</Label>
              <Input
                id="net-name"
                value={draft.name}
                onChange={(e) => set({ name: e.target.value })}
                disabled={isEditMode}
                maxLength={11}
                className={isEditMode ? "bg-muted font-mono" : "font-mono"}
                placeholder={t("networkModal.namePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="net-desc">{tc("description")}</Label>
              <Input
                id="net-desc"
                value={draft.description ?? ""}
                onChange={(e) => set({ description: e.target.value })}
                maxLength={DESCRIPTION_MAX}
                placeholder={tc("optionalDescription")}
              />
            </div>

            {features.network_type && (
              <div className="space-y-2">
                <Label htmlFor="net-type">{t("networkModal.networkType")}</Label>
                <NamedListSelect
                  id="net-type"
                  value={draft.network_type ?? ""}
                  names={values.network_types || []}
                  onValueChange={(v) => set({ network_type: v || null })}
                  noneLabel={tm("modal.defaultOption")}
                />
              </div>
            )}

            {macvlan && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="net-mode">{t("networkModal.macvlanMode")}</Label>
                  <NamedListSelect
                    id="net-mode"
                    value={draft.macvlan_mode ?? ""}
                    names={values.macvlan_modes || []}
                    onValueChange={(v) => set({ macvlan_mode: v || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="net-parent">{t("networkModal.parentInterface")}</Label>
                  <InterfaceSelect
                    id="net-parent"
                    value={draft.macvlan_parent ?? ""}
                    onValueChange={(v) => set({ macvlan_parent: v || null })}
                    filter={(iface) => MACVLAN_PARENT_TYPES.includes(iface.type) && MACVLAN_PARENT_RE.test(iface.name)}
                    className="font-mono"
                  />
                </div>
              </>
            )}

            {features.network_mtu && (
              <div className="space-y-2">
                <Label htmlFor="net-mtu">MTU</Label>
                <Input
                  id="net-mtu"
                  type="number"
                  min={NETWORK_MTU_RANGE.min}
                  max={NETWORK_MTU_RANGE.max}
                  value={draft.mtu ?? ""}
                  onChange={(e) => set({ mtu: e.target.value })}
                  placeholder={t("networkModal.mtuPlaceholder")}
                  className="font-mono"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="net-vrf">VRF</Label>
              <VrfSelect id="net-vrf" value={draft.vrf ?? ""} onValueChange={(v) => set({ vrf: v || null })} className="font-mono" />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="net-nns" checked={draft.no_name_server} onCheckedChange={(v) => set({ no_name_server: v === true })} />
              <Label htmlFor="net-nns" className="cursor-pointer">{t("networkModal.noNameServer")}</Label>
            </div>

            <MultiValueInput
              label={t("networks.prefixes")}
              values={draft.prefixes}
              onChange={(prefixes) => set({ prefixes })}
              placeholder={t("networkModal.prefixPlaceholder")}
            />

            {features.network_gateway && (
              <MultiValueInput
                label={t("networks.gateways")}
                values={draft.gateways}
                onChange={(gateways) => set({ gateways })}
                placeholder={t("networkModal.gatewayPlaceholder")}
              />
            )}
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEditMode ? tc("saving") : tm("modal.adding")}</>
            ) : isEditMode ? tc("saveChanges") : t("networks.addNetwork")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
