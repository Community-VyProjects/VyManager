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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { snmpService, SNMPCommunity, SNMPCapabilities } from "@/lib/api/snmp";
import { SNMPMultiValueField, isValidIP } from "./SNMPMultiValueField";

interface SNMPCommunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: SNMPCommunity | null;
  existingNames: string[];
  capabilities: SNMPCapabilities;
  onSuccess: () => void;
}

const DEFAULT_AUTH = "__default__";

export function SNMPCommunityModal({
  open,
  onOpenChange,
  existing,
  existingNames,
  capabilities,
  onSuccess,
}: SNMPCommunityModalProps) {
  const t = useTranslations("snmp");
  const tc = useTranslations("common");
  const isEdit = existing !== null;
  const comm = capabilities.features.community;

  const [name, setName] = useState(existing?.name ?? "");
  const [authorization, setAuthorization] = useState(
    existing?.authorization ?? DEFAULT_AUTH
  );
  const [clients, setClients] = useState<string[]>(existing?.clients ?? []);
  const [networks, setNetworks] = useState<string[]>(existing?.networks ?? []);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const n = name.trim();
    if (!n) {
      setError(t("community.nameRequired"));
      return;
    }
    if (!isEdit && existingNames.includes(n)) {
      setError(t("community.exists", { name: n }));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await snmpService.saveCommunity(existing, {
        name: n,
        authorization: authorization === DEFAULT_AUTH ? "" : authorization,
        clients,
        networks,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("community.editTitle") : t("community.addTitle")}</DialogTitle>
          <DialogDescription>
            {t("community.description")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="community-name">{t("community.name")}</Label>
              <Input
                id="community-name"
                placeholder={t("community.namePlaceholder")}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                disabled={isEdit}
                className={isEdit ? "font-mono bg-muted" : "font-mono"}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("content.authorization")}</Label>
              <Select value={authorization} onValueChange={setAuthorization}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_AUTH}>
                    {t("community.defaultAuth", { value: comm.default_authorization === "ro" ? t("content.readOnlyAuth") : t("content.readWrite") })}
                  </SelectItem>
                  {comm.authorization_values.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v === "ro" ? t("community.readOnlyRo") : t("community.readWriteRw")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <SNMPMultiValueField
              label={t("community.allowedClients")}
              description={t("community.allowedClientsHelp")}
              placeholder={t("community.clientPlaceholder")}
              values={clients}
              onChange={setClients}
              validate={(v) =>
                isValidIP(v) ? null : t("validation.invalidIp")
              }
            />

            <Separator />

            <SNMPMultiValueField
              label={t("community.allowedNetworks")}
              description={t("community.allowedNetworksHelp")}
              placeholder={t("community.networkPlaceholder")}
              values={networks}
              onChange={setNetworks}
              validate={(v) =>
                isValidIP(v, true) ? null : t("validation.invalidCidr")
              }
            />
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? tc("save") : tc("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
