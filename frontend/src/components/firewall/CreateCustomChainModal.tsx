"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { AlertCircle, RefreshCw } from "lucide-react";
import { firewallIPv4Service } from "@/lib/api/firewall-ipv4";
import { firewallIPv6Service } from "@/lib/api/firewall-ipv6";

interface CreateCustomChainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingChainNames: string[];
  protocol?: "ipv4" | "ipv6";
}

export function CreateCustomChainModal({
  open,
  onOpenChange,
  onSuccess,
  existingChainNames,
  protocol = "ipv4",
}: CreateCustomChainModalProps) {
  const t = useTranslations("firewallPolicies");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chainName, setChainName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultAction, setDefaultAction] = useState("drop");

  const resetForm = () => {
    setChainName("");
    setDescription("");
    setDefaultAction("drop");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateChainName = (name: string): string | null => {
    if (!name.trim()) {
      return t("createChain.nameRequired");
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      return t("createChain.nameInvalid");
    }
    if (existingChainNames.includes(name.toLowerCase())) {
      return t("createChain.nameExists");
    }
    if (["forward", "input", "output"].includes(name.toLowerCase())) {
      return t("createChain.nameReserved");
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateChainName(chainName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const service = protocol === "ipv4" ? firewallIPv4Service : firewallIPv6Service;
      await service.createCustomChain(
        chainName.trim(),
        description.trim() || undefined,
        defaultAction
      );

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("createChain.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createChain.title")}</DialogTitle>
          <DialogDescription>
            {t("createChain.description")}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">{t("createChain.error")}</p>
              <p className="text-sm text-destructive/90">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chainName">{t("createChain.chainNameLabel")}</Label>
            <Input
              id="chainName"
              value={chainName}
              onChange={(e) => setChainName(e.target.value)}
              placeholder="my-custom-chain"
            />
            <p className="text-xs text-muted-foreground">
              {t("createChain.chainNameHint")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{tc("description")}</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("createChain.descriptionPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultAction">{t("createChain.defaultAction")}</Label>
            <Select value={defaultAction} onValueChange={setDefaultAction}>
              <SelectTrigger id="defaultAction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="drop">{t("createChain.actionDrop")}</SelectItem>
                <SelectItem value="accept">{t("createChain.actionAccept")}</SelectItem>
                <SelectItem value="reject">{t("createChain.actionReject")}</SelectItem>
                <SelectItem value="return">{t("createChain.actionReturn")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("createChain.defaultActionHint")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {tc("creating")}
              </>
            ) : (
              t("createChain.submit")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
