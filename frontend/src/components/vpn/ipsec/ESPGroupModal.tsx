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
import { AlertCircle, Loader2, Plus, Trash2, Shield } from "lucide-react";
import { ipsecService, ESPGroup, IPSecCapabilities } from "@/lib/api/ipsec";
import { ApiError } from "@/lib/types/api";
import { cn } from "@/lib/utils";

interface ESPGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: IPSecCapabilities | null;
  existingGroup: ESPGroup | null;
}

interface ProposalRow {
  id: string;
  encryption: string;
  hash: string;
  esn: string;
}

export function ESPGroupModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingGroup,
}: ESPGroupModalProps) {
  const t = useTranslations("ipsecSettings");
  const tc = useTranslations("common");
  const isEdit = !!existingGroup;
  const esp = capabilities?.features.esp_groups;
  const esnValues = esp?.esn || [];
  const pick = (value: string) => (value === "_none" ? "" : value);

  const [name, setName] = useState("");
  const [lifetime, setLifetime] = useState("3600");
  const [mode, setMode] = useState("tunnel");
  const [pfs, setPfs] = useState("dh-group14");
  const [compression, setCompression] = useState(false);
  const [disableRekey, setDisableRekey] = useState(false);
  const [lifeBytes, setLifeBytes] = useState("");
  const [lifePackets, setLifePackets] = useState("");
  const [proposals, setProposals] = useState<ProposalRow[]>([
    { id: "1", encryption: "aes256", hash: "sha256", esn: "" },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingGroup) {
        setName(existingGroup.name);
        setLifetime(existingGroup.lifetime || "");
        setMode(existingGroup.mode || "");
        setPfs(existingGroup.pfs || "");
        setCompression(existingGroup.compression || false);
        setDisableRekey(existingGroup.disable_rekey || false);
        setLifeBytes(existingGroup.life_bytes || "");
        setLifePackets(existingGroup.life_packets || "");
        setProposals(
          (existingGroup.proposals || []).map((p) => ({
            id: p.number,
            encryption: p.encryption || "",
            hash: p.hash || "",
            esn: p.esn || "",
          }))
        );
      } else {
        setName("");
        setLifetime("3600");
        setMode("tunnel");
        setPfs("dh-group14");
        setCompression(false);
        setDisableRekey(false);
        setLifeBytes("");
        setLifePackets("");
        setProposals([{ id: "1", encryption: "aes256", hash: "sha256", esn: "" }]);
      }
      setError(null);
    }
  }, [open, existingGroup]);

  const addProposal = () => {
    const nextNum = String(Math.max(0, ...proposals.map((p) => parseInt(p.id) || 0)) + 1);
    setProposals([...proposals, { id: nextNum, encryption: "", hash: "", esn: "" }]);
  };

  const removeProposal = (id: string) => {
    setProposals(proposals.filter((p) => p.id !== id));
  };

  const updateProposal = (id: string, field: keyof ProposalRow, value: string) => {
    setProposals(proposals.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError(t("shared.nameRequired")); return; }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        lifetime: lifetime || undefined,
        mode: mode || undefined,
        pfs: pfs || undefined,
        compression: compression || undefined,
        disable_rekey: disableRekey || undefined,
        life_bytes: lifeBytes || undefined,
        life_packets: lifePackets || undefined,
        proposals: proposals.map((p) => ({
          number: p.id,
          encryption: p.encryption || undefined,
          hash: p.hash || undefined,
          esn: p.esn || undefined,
        })),
      };
      const result = isEdit && existingGroup
        ? await ipsecService.updateESPGroup(name.trim(), payload, existingGroup)
        : await ipsecService.createESPGroup(name.trim(), payload);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("esp.saveFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("esp.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {isEdit ? t("esp.titleEdit") : t("esp.titleCreate")}
          </DialogTitle>
          <DialogDescription>
            {t("esp.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{tc("name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ESP-GROUP-1" disabled={isEdit} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("shared.lifetimeSeconds")}</Label>
              <Input value={lifetime} onChange={(e) => setLifetime(e.target.value)} placeholder="3600" />
            </div>
            <div className="space-y-2">
              <Label>{t("shared.mode")}</Label>
              <Select value={mode || "_none"} onValueChange={(v) => setMode(pick(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">{tc("default")}</SelectItem>
                  {(esp?.mode || []).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>PFS</Label>
              <Select value={pfs || "_none"} onValueChange={(v) => setPfs(pick(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">{tc("default")}</SelectItem>
                  {(esp?.pfs || []).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("esp.lifeBytes")}</Label>
              <Input value={lifeBytes} onChange={(e) => setLifeBytes(e.target.value)} placeholder={t("esp.lifeBytesPlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("esp.lifePackets")}</Label>
              <Input value={lifePackets} onChange={(e) => setLifePackets(e.target.value)} placeholder={t("esp.lifePacketsPlaceholder")} />
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Checkbox id="compression" checked={compression} onCheckedChange={(c) => setCompression(c === true)} />
              <Label htmlFor="compression" className="cursor-pointer text-sm">{t("esp.compression")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="disableRekey" checked={disableRekey} onCheckedChange={(c) => setDisableRekey(c === true)} />
              <Label htmlFor="disableRekey" className="cursor-pointer text-sm">{t("esp.disableRekey")}</Label>
            </div>
          </div>

          {/* Proposals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t("shared.proposals")}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addProposal}>
                <Plus className="h-4 w-4 mr-1" /> {tc("add")}
              </Button>
            </div>
            {proposals.map((p) => (
              <div key={p.id} className={cn("grid gap-2 items-end rounded-lg border p-3", esnValues.length > 0 ? "grid-cols-[auto_1fr_1fr_1fr_auto]" : "grid-cols-[auto_1fr_1fr_auto]")}>
                <div className="text-xs text-muted-foreground font-mono w-6 text-center pt-5">#{p.id}</div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("shared.encryption")}</Label>
                  <Select value={p.encryption || "_none"} onValueChange={(v) => updateProposal(p.id, "encryption", pick(v))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">{tc("default")}</SelectItem>
                      {(esp?.encryption || []).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("shared.hash")}</Label>
                  <Select value={p.hash || "_none"} onValueChange={(v) => updateProposal(p.id, "hash", pick(v))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">{tc("default")}</SelectItem>
                      {(esp?.hash || []).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {esnValues.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t("shared.esn")}</Label>
                    <Select value={p.esn || "_none"} onValueChange={(v) => updateProposal(p.id, "esn", pick(v))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">{tc("default")}</SelectItem>
                        {esnValues.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => removeProposal(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? tc("saving") : tc("creating")}</> : isEdit ? tc("saveChanges") : t("esp.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
