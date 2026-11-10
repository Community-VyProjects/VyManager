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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Repeat, Loader2 } from "lucide-react";
import { loopbackService, type LoopbackInterface, type LoopbackCapabilities } from "@/lib/api/loopback";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";

interface LoopbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: LoopbackCapabilities | null;
  existing?: LoopbackInterface | null;
}

export function LoopbackModal({
  open,
  onOpenChange,
  onSuccess,
  existing,
}: LoopbackModalProps) {
  const t = useTranslations("loopback");
  const tc = useTranslations("common");
  const isEdit = !!existing;
  const [description, setDescription] = useState("");
  const [addresses, setAddresses] = useState("");
  const [ipSourceValidation, setIpSourceValidation] = useState("");
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");
  const [redirect, setRedirect] = useState("");

  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setDescription("");
    setAddresses("");
    setIpSourceValidation("");
    setMirrorIngress("");
    setMirrorEgress("");
    setRedirect("");
    setError(null);
  };

  const populateForm = (interfaceData: LoopbackInterface) => {
    setDescription(interfaceData.description ?? "");
    setAddresses(interfaceData.addresses.join("\n"));
    setIpSourceValidation(interfaceData.ip_source_validation ?? "");
    setMirrorIngress(interfaceData.mirror_ingress ?? "");
    setMirrorEgress(interfaceData.mirror_egress ?? "");
    setRedirect(interfaceData.redirect ?? "");
    setError(null);
  };

  useEffect(() => {
    if (!open) return;
    showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch(() => {});
    if (existing) {
      populateForm(existing);
    } else {
      resetForm();
    }
  }, [open, existing]);

  const submitUpdate = async () => {
    if (!existing) return;

    setLoading(true);
    setError(null);

    try {
      const addrList = addresses.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);

      const result = await loopbackService.updateInterface(existing.name, existing, {
        description: description.trim() || null,
        addresses: addrList,
        ip_source_validation: ipSourceValidation || null,
        mirror_ingress: mirrorIngress.trim() || null,
        mirror_egress: mirrorEgress.trim() || null,
        redirect: redirect.trim() || null,
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("modal.errors.updateFailed"));
      }
    } catch (err) {
      const msg = (err as ApiError).message;
      setError(typeof msg === "string" ? msg : JSON.stringify(msg, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (isEdit) {
      await submitUpdate();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const addrList = addresses.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);

      const config: Parameters<typeof loopbackService.createInterface>[0] = {
        name: "lo",
      };

      if (description.trim()) config.description = description.trim();
      if (addrList.length > 0) config.addresses = addrList;
      if (ipSourceValidation) config.ip_source_validation = ipSourceValidation;
      if (mirrorIngress.trim()) config.mirror_ingress = mirrorIngress.trim();
      if (mirrorEgress.trim()) config.mirror_egress = mirrorEgress.trim();
      if (redirect.trim()) config.redirect = redirect.trim();

      const result = await loopbackService.createInterface(config);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("modal.errors.configureFailed"));
      }
    } catch (err) {
      const msg = (err as ApiError).message;
      setError(typeof msg === "string" ? msg : JSON.stringify(msg, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            {isEdit ? t("modal.editTitle") : t("modal.configureTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? (
              <>
                {t.rich("modal.editingInterface", {
                  name: existing.name,
                  code: (chunks) => (
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
                      {chunks}
                    </code>
                  ),
                })}
              </>
            ) : (
              t("modal.configureDescription")
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">{t("modal.tabs.general")}</TabsTrigger>
            <TabsTrigger value="advanced">{t("modal.tabs.advanced")}</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t("modal.interfaceName")}</Label>
              <code className="block rounded bg-muted px-3 py-2 font-mono text-sm text-foreground">
                {isEdit ? existing.name : "lo"}
              </code>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{tc("description")}</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={tc("optionalDescription")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addresses">{t("modal.ipAddresses")}</Label>
              <Textarea
                id="addresses"
                value={addresses}
                onChange={(e) => setAddresses(e.target.value)}
                placeholder={"10.0.0.1/32\n192.168.1.1/24"}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">{t("modal.addressesHint")}</p>
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">{t("modal.ipSettings")}</h4>
              <div className="space-y-2">
                <Label htmlFor="sourceValidation">{t("modal.sourceValidation")}</Label>
                <Select value={ipSourceValidation || "none"} onValueChange={(v) => setIpSourceValidation(v === "none" ? "" : v)}>
                  <SelectTrigger id="sourceValidation">
                    <SelectValue placeholder={tc("none")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tc("none")}</SelectItem>
                    <SelectItem value="strict">{t("modal.sourceValidationStrict")}</SelectItem>
                    <SelectItem value="loose">{t("modal.sourceValidationLoose")}</SelectItem>
                    <SelectItem value="disable">{t("modal.sourceValidationDisable")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">{t("modal.trafficMirroring")}</h4>
              <div className="space-y-2">
                <Label>{t("modal.mirrorIngress")}</Label>
                <InterfaceSelect
                  value={mirrorIngress || "none"}
                  onValueChange={(v) => setMirrorIngress(v === "none" ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: tc("none"), value: "none" }}
                  placeholder={tc("none")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("modal.mirrorEgress")}</Label>
                <InterfaceSelect
                  value={mirrorEgress || "none"}
                  onValueChange={(v) => setMirrorEgress(v === "none" ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: tc("none"), value: "none" }}
                  placeholder={tc("none")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("modal.redirectTo")}</Label>
                <InterfaceSelect
                  value={redirect || "none"}
                  onValueChange={(v) => setRedirect(v === "none" ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: tc("none"), value: "none" }}
                  placeholder={tc("none")}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 mt-4">
            <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? tc("saving") : t("modal.configuring")}
              </>
            ) : isEdit ? (
              tc("saveChanges")
            ) : (
              t("modal.configureLoopback")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
