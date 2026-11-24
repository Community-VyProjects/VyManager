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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { AlertCircle, Loader2, Network, X } from "lucide-react";
import { pppoeServerService, PPPoECapabilities, PPPoEInterface } from "@/lib/api/pppoe-server";
import { interfaceProblem, type PPPoEInterfaceDraft } from "@/lib/api/pppoe-server-save-ops";
import type { ApiError } from "@/lib/types/api";

interface InterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingInterface: PPPoEInterface | null;
  capabilities: PPPoECapabilities | null;
  /** Interfaces already under the server; Add does not offer them. */
  configuredInterfaces: string[];
}

export function InterfaceModal({
  open,
  onOpenChange,
  onSuccess,
  existingInterface,
  capabilities,
  configuredInterfaces,
}: InterfaceModalProps) {
  const t = useTranslations("pppoeServer");
  const tc = useTranslations("common");
  const isEdit = !!existingInterface;
  // The page remounts this modal (key) on every open, so state seeds from props.
  const [draft, setDraft] = useState<PPPoEInterfaceDraft>(() => ({
    interface: existingInterface?.interface || "",
    vlans: existingInterface?.vlans || [],
    vlan_mon: existingInterface?.vlan_mon || false,
    combined: existingInterface?.combined || false,
  }));
  const [vlanInput, setVlanInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vlanMonSupported = capabilities?.features.vlan_mon ?? false;
  const update = (patch: Partial<PPPoEInterfaceDraft>) => setDraft((current) => ({ ...current, ...patch }));

  const addVlan = () => {
    const value = vlanInput.trim();
    if (value && !draft.vlans.includes(value)) update({ vlans: [...draft.vlans, value] });
    if (value) setVlanInput("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!loading) onOpenChange(next);
  };

  const handleSubmit = async () => {
    const issue = interfaceProblem(draft, vlanMonSupported);
    if (issue) {
      setError(issue.problem === "interfaceRequired"
        ? tc("interfaceNameRequired")
        : t(`interfaceModal.${issue.problem}`, issue.params));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await pppoeServerService.saveInterface(existingInterface, draft, vlanMonSupported);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("interfaceModal.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            {isEdit ? t("interfaceModal.editTitle") : tc("addInterface")}
          </DialogTitle>
          <DialogDescription>{t("interfaceModal.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pppoe-iface">{t("interfaceModal.interface")}</Label>
            <InterfaceSelect
              id="pppoe-iface"
              value={draft.interface}
              onValueChange={(name) => update({ interface: name })}
              disabled={isEdit}
              filter={isEdit ? undefined : (iface) => !configuredInterfaces.includes(iface.name)}
              placeholder={t("interfaceModal.selectInterface")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pppoe-iface-vlan">{tc("shown.vlans")}</Label>
            <div className="flex gap-2">
              <Input
                id="pppoe-iface-vlan"
                value={vlanInput}
                onChange={(e) => setVlanInput(e.target.value)}
                placeholder={t("interfaceModal.vlanPlaceholder")}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVlan(); } }}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addVlan}>{tc("add")}</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {draft.vlans.map((vlan) => (
                <Badge key={vlan} variant="secondary" className="gap-1 font-mono text-xs">
                  {vlan}
                  <button type="button" onClick={() => update({ vlans: draft.vlans.filter((v) => v !== vlan) })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {vlanMonSupported && (
            <div className="flex items-center gap-2">
              <Checkbox id="vlan-mon" checked={draft.vlan_mon} onCheckedChange={(v) => update({ vlan_mon: !!v })} />
              <Label htmlFor="vlan-mon" className="cursor-pointer">{t("interfaceModal.vlanMonitoring")}</Label>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox id="pppoe-iface-combined" checked={draft.combined} onCheckedChange={(v) => update({ combined: !!v })} />
            <Label htmlFor="pppoe-iface-combined" className="cursor-pointer">{t("interfaces.combined")}</Label>
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? tc("saving") : t("interfaceModal.adding")}</> : isEdit ? tc("saveChanges") : tc("addInterface")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
