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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, AlertCircle } from "lucide-react";
import { bridgeFirewallService } from "@/lib/api/firewall-bridge";

interface CreateCustomBridgeChainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCustomBridgeChainModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateCustomBridgeChainModalProps) {
  const t = useTranslations("firewallBridge");
  const tc = useTranslations("common");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [chainName, setChainName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultAction, setDefaultAction] = useState("_none_");

  const resetForm = () => {
    setChainName("");
    setDescription("");
    setDefaultAction("_none_");
    setError(null);
  };

  const validateChainName = (name: string): string | null => {
    if (!name) {
      return t("createChain.nameRequired");
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      return t("createChain.nameInvalid");
    }
    if (name.length > 28) {
      return t("createChain.nameTooLong");
    }
    const reserved = ["forward", "input", "output", "prerouting"];
    if (reserved.includes(name.toLowerCase())) {
      return t("createChain.nameReserved");
    }
    return null;
  };

  const handleSubmit = async () => {
    const nameError = validateChainName(chainName);
    if (nameError) {
      setError(nameError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await bridgeFirewallService.createCustomChain(chainName, {
        description: description || undefined,
        default_action: defaultAction !== "_none_" ? defaultAction : undefined,
      });

      if (response.success) {
        resetForm();
        onSuccess();
      } else {
        setError(response.error || t("createChain.createFailed"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("createChain.createFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createChain.title")}</DialogTitle>
          <DialogDescription>
            {t("createChain.description")}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chainName">{t("createChain.chainName")}</Label>
            <Input
              id="chainName"
              placeholder={t("createChain.chainNamePlaceholder")}
              value={chainName}
              onChange={(e) => setChainName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t("createChain.chainNameHelp")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{tc("description")}</Label>
            <Input
              id="description"
              placeholder={t("createChain.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultAction">{t("createChain.defaultAction")}</Label>
            <Select value={defaultAction} onValueChange={setDefaultAction}>
              <SelectTrigger>
                <SelectValue placeholder={t("actionOptions.notSet")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">{t("actionOptions.notSet")}</SelectItem>
                <SelectItem value="accept">{t("actionOptions.accept")}</SelectItem>
                <SelectItem value="drop">{t("actionOptions.drop")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                {t("creating")}
              </>
            ) : (
              t("createChain.createChain")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
