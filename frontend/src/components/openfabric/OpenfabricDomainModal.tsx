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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import {
  OpenfabricDomainConfig,
  OpenfabricCapabilities,
} from "@/lib/api/openfabric";

interface OpenfabricDomainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (domain: OpenfabricDomainConfig) => Promise<void>;
  existingDomain: OpenfabricDomainConfig | null;
  capabilities: OpenfabricCapabilities | null;
}

export function OpenfabricDomainModal({
  open,
  onOpenChange,
  onSubmit,
  existingDomain,
  capabilities,
}: OpenfabricDomainModalProps) {
  const t = useTranslations("openfabric");
  const tc = useTranslations("common");
  const isEdit = !!existingDomain;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // General
  const [name, setName] = useState("");
  const [fabricTier, setFabricTier] = useState("");

  // Options / Flags
  const [logAdjChanges, setLogAdjChanges] = useState(false);
  const [purgeOriginator, setPurgeOriginator] = useState(false);
  const [setOverloadBit, setSetOverloadBit] = useState(false);

  // Timers
  const [lspGenInterval, setLspGenInterval] = useState("");
  const [lspRefreshInterval, setLspRefreshInterval] = useState("");
  const [maxLspLifetime, setMaxLspLifetime] = useState("");
  const [spfInterval, setSpfInterval] = useState("");

  // Authentication
  const [passwordType, setPasswordType] = useState("none");
  const [passwordValue, setPasswordValue] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);

    if (existingDomain) {
      const d = existingDomain;
      setName(d.name);
      setFabricTier(d.fabric_tier != null ? String(d.fabric_tier) : "");
      setLogAdjChanges(d.log_adjacency_changes);
      setPurgeOriginator(d.purge_originator);
      setSetOverloadBit(d.set_overload_bit);
      setLspGenInterval(d.lsp_gen_interval != null ? String(d.lsp_gen_interval) : "");
      setLspRefreshInterval(d.lsp_refresh_interval != null ? String(d.lsp_refresh_interval) : "");
      setMaxLspLifetime(d.max_lsp_lifetime != null ? String(d.max_lsp_lifetime) : "");
      setSpfInterval(d.spf_interval != null ? String(d.spf_interval) : "");
      setPasswordType(d.domain_password_type || "none");
      setPasswordValue(d.domain_password_value || "");
    } else {
      setName("");
      setFabricTier("");
      setLogAdjChanges(false);
      setPurgeOriginator(false);
      setSetOverloadBit(false);
      setLspGenInterval("");
      setLspRefreshInterval("");
      setMaxLspLifetime("");
      setSpfInterval("");
      setPasswordType("none");
      setPasswordValue("");
    }
  }, [open, existingDomain]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError(t("domainModal.nameRequired"));
      return;
    }

    const domain: OpenfabricDomainConfig = {
      name: name.trim(),
      fabric_tier: fabricTier.trim() ? parseInt(fabricTier.trim(), 10) : null,
      log_adjacency_changes: logAdjChanges,
      purge_originator: purgeOriginator,
      set_overload_bit: setOverloadBit,
      lsp_gen_interval: lspGenInterval.trim() ? parseInt(lspGenInterval.trim(), 10) : null,
      lsp_refresh_interval: lspRefreshInterval.trim() ? parseInt(lspRefreshInterval.trim(), 10) : null,
      max_lsp_lifetime: maxLspLifetime.trim() ? parseInt(maxLspLifetime.trim(), 10) : null,
      spf_interval: spfInterval.trim() ? parseInt(spfInterval.trim(), 10) : null,
      domain_password_type: passwordType !== "none" ? passwordType : null,
      domain_password_value: passwordType !== "none" ? passwordValue.trim() || null : null,
      interfaces: existingDomain?.interfaces ?? [],
    };

    try {
      setSaving(true);
      setError(null);
      await onSubmit(domain);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("domainModal.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("domainModal.editTitle") : t("domainModal.addTitle")}</DialogTitle>
          <DialogDescription>
            {t("domainModal.description")}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        <Tabs defaultValue="general">
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1">{t("modal.general")}</TabsTrigger>
            <TabsTrigger value="options" className="flex-1">{t("domainModal.options")}</TabsTrigger>
            <TabsTrigger value="auth" className="flex-1">{t("modal.authentication")}</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t("domainModal.domainName")} <span className="text-destructive">*</span></Label>
              {isEdit ? (
                <div className="h-9 flex items-center px-3 rounded-md border border-input bg-muted text-sm font-mono">
                  {name}
                </div>
              ) : (
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("eg", { value: "my-fabric" })}
                />
              )}
            </div>

            {capabilities?.features.fabric_tier.supported && (
              <div className="space-y-2">
                <Label>{t("domainModal.fabricTier")}</Label>
                <Input
                  type="number"
                  value={fabricTier}
                  onChange={(e) => setFabricTier(e.target.value)}
                  placeholder={t("domainModal.autoDetect")}
                  min={0}
                  max={14}
                />
                <p className="text-xs text-muted-foreground">
                  {t("domainModal.fabricTierHelp")}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Options Tab */}
          <TabsContent value="options" className="space-y-4 mt-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("domainModal.flags")}</h4>
              <div className="grid grid-cols-1 gap-3 pl-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="log-adj" checked={logAdjChanges} onCheckedChange={(c) => setLogAdjChanges(!!c)} />
                  <Label htmlFor="log-adj">{t("domainModal.logAdjChanges")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="purge-orig" checked={purgeOriginator} onCheckedChange={(c) => setPurgeOriginator(!!c)} />
                  <Label htmlFor="purge-orig">{t("domainModal.purgeOriginator")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="overload-bit" checked={setOverloadBit} onCheckedChange={(c) => setSetOverloadBit(!!c)} />
                  <Label htmlFor="overload-bit">{t("domainModal.setOverloadBit")}</Label>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("modal.timers")}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("domainModal.lspGenInterval")}</Label>
                  <Input
                    type="number"
                    value={lspGenInterval}
                    onChange={(e) => setLspGenInterval(e.target.value)}
                    placeholder={tc("default")}
                    min={1}
                    max={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("domainModal.lspRefreshInterval")}</Label>
                  <Input
                    type="number"
                    value={lspRefreshInterval}
                    onChange={(e) => setLspRefreshInterval(e.target.value)}
                    placeholder={tc("default")}
                    min={1}
                    max={65235}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("domainModal.maxLspLifetime")}</Label>
                  <Input
                    type="number"
                    value={maxLspLifetime}
                    onChange={(e) => setMaxLspLifetime(e.target.value)}
                    placeholder={tc("default")}
                    min={360}
                    max={65535}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("domainModal.spfInterval")}</Label>
                  <Input
                    type="number"
                    value={spfInterval}
                    onChange={(e) => setSpfInterval(e.target.value)}
                    placeholder={tc("default")}
                    min={1}
                    max={120}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Authentication Tab */}
          <TabsContent value="auth" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              {t("domainModal.authHelp")}
            </p>
            <div className="space-y-2">
              <Label>{t("modal.passwordType")}</Label>
              <Select value={passwordType} onValueChange={setPasswordType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tc("none")}</SelectItem>
                  <SelectItem value="md5">MD5</SelectItem>
                  <SelectItem value="plaintext">{t("modal.plaintext")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {passwordType !== "none" && (
              <div className="space-y-2">
                <Label>{t("modal.password")}</Label>
                <Input
                  type="password"
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  placeholder={passwordType === "md5" ? t("modal.md5Password") : t("modal.plaintextPassword")}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? t("modal.saveChanges") : t("domainModal.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
