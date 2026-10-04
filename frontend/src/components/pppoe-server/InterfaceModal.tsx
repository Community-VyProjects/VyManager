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
import { AlertCircle, Loader2, Network, X } from "lucide-react";
import { pppoeServerService, PPPoEInterface, PPPoECapabilities } from "@/lib/api/pppoe-server";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";

interface InterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingInterface: PPPoEInterface | null;
  capabilities: PPPoECapabilities | null;
}

export function InterfaceModal({ open, onOpenChange, onSuccess, existingInterface, capabilities }: InterfaceModalProps) {
  const t = useTranslations("pppoeServer.interfaceModal");
  const tc = useTranslations("common");
  const isEdit = !!existingInterface;

  const [ifaceName, setIfaceName] = useState("");
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [, setIfacesLoading] = useState(false);
  const [vlans, setVlans] = useState<string[]>([]);
  const [vlanInput, setVlanInput] = useState("");
  const [vlanMon, setVlanMon] = useState(false);
  const [vppCp, setVppCp] = useState(false);
  const [combined, setCombined] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showVlanMon = capabilities?.features.vlan_mon ?? false;
  const showVppCp = capabilities?.features.vpp_cp ?? false;

  useEffect(() => {
    if (open) {
      if (existingInterface) {
        setIfaceName(existingInterface.interface);
        setVlans(existingInterface.vlans || []);
        setVlanMon(existingInterface.vlan_mon || false);
        setVppCp(existingInterface.vpp_cp || false);
        setCombined(existingInterface.combined || "");
      } else {
        setIfaceName("");
        setVlans([]);
        setVlanMon(false);
        setVppCp(false);
        setCombined("");
        setIfacesLoading(true);
        showService.getAllInterfaces()
          .then((res) => setAvailableInterfaces(res.interfaces))
          .catch(() => setAvailableInterfaces([]))
          .finally(() => setIfacesLoading(false));
      }
      setVlanInput("");
      setError(null);
    }
  }, [open, existingInterface]);

  const addVlan = () => {
    const val = vlanInput.trim();
    if (val && !vlans.includes(val)) {
      setVlans([...vlans, val]);
      setVlanInput("");
    }
  };

  const handleSubmit = async () => {
    if (!ifaceName.trim()) { setError(tc("interfaceNameRequired")); return; }

    setLoading(true);
    setError(null);

    const opts = { vlans, vlan_mon: vlanMon, vpp_cp: vppCp, combined: combined || undefined };

    try {
      let result;
      if (isEdit) {
        result = await pppoeServerService.updateInterface(existingInterface!.interface, existingInterface!, opts);
      } else {
        result = await pppoeServerService.createInterface(ifaceName.trim(), opts);
      }

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("saveFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            {isEdit ? t("editTitle") : tc("addInterface")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("interface")}</Label>
            {isEdit ? (
              <Input value={ifaceName} disabled />
            ) : (
              <InterfaceSelect
                value={ifaceName}
                onValueChange={setIfaceName}
                interfaces={availableInterfaces}
                placeholder={t("selectInterface")}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>{tc("shown.vlans")}</Label>
            <div className="flex gap-2">
              <Input
                value={vlanInput}
                onChange={(e) => setVlanInput(e.target.value)}
                placeholder={t("vlanPlaceholder")}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVlan(); } }}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addVlan}>{tc("add")}</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {vlans.map((vlan) => (
                <Badge key={vlan} variant="secondary" className="gap-1 font-mono text-xs">
                  {vlan}
                  <button onClick={() => setVlans(vlans.filter((v) => v !== vlan))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {showVlanMon && (
            <div className="flex items-center gap-2">
              <Checkbox id="vlan-mon" checked={vlanMon} onCheckedChange={(v) => setVlanMon(!!v)} />
              <Label htmlFor="vlan-mon" className="cursor-pointer">{t("vlanMonitoring")}</Label>
            </div>
          )}

          {showVppCp && (
            <div className="flex items-center gap-2">
              <Checkbox id="vpp-cp" checked={vppCp} onCheckedChange={(v) => setVppCp(!!v)} />
              <Label htmlFor="vpp-cp" className="cursor-pointer">VPP-CP</Label>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("combined")}</Label>
            <Input value={combined} onChange={(e) => setCombined(e.target.value)} placeholder="4" />
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? tc("saving") : t("adding")}</> : isEdit ? tc("saveChanges") : tc("addInterface")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
