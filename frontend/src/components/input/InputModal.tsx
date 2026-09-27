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
import { ArrowDownToLine, Loader2 } from "lucide-react";
import { inputService, type InputInterface, type InputCapabilities } from "@/lib/api/input";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";

interface InputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: InputCapabilities | null;
  existingInterfaces: string[];
  existing?: InputInterface | null;
}

export function InputModal({
  open,
  onOpenChange,
  onSuccess,
  existingInterfaces,
  existing,
}: InputModalProps) {
  const t = useTranslations("input");
  const tc = useTranslations("common");
  const isEdit = !!existing;
  const [name, setName] = useState("ifb0");
  const [description, setDescription] = useState("");
  const [redirect, setRedirect] = useState("");
  const [disabled, setDisabled] = useState(false);

  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getNextInterfaceName = (): string => {
    let i = 0;
    while (existingInterfaces.includes(`ifb${i}`)) {
      i++;
    }
    return `ifb${i}`;
  };

  const resetForm = () => {
    setName(getNextInterfaceName());
    setDescription("");
    setRedirect("");
    setDisabled(false);
    setError(null);
  };

  const populateForm = (interfaceData: InputInterface) => {
    setName(interfaceData.name);
    setDescription(interfaceData.description ?? "");
    setRedirect(interfaceData.redirect ?? "");
    setDisabled(interfaceData.disable ?? false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing]);

  const validateForm = (): string | null => {
    if (!name.trim()) return t("modal.errors.nameRequired");
    if (!/^ifb\d+$/.test(name)) return t("modal.errors.namePattern");
    if (existingInterfaces.includes(name)) return t("modal.errors.nameExists", { name });
    return null;
  };

  const submitUpdate = async () => {
    if (!existing) return;

    setLoading(true);
    setError(null);

    try {
      const result = await inputService.updateInterface(existing.name, existing, {
        description: description.trim() || null,
        redirect: redirect.trim() || null,
        disabled,
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

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const config: Parameters<typeof inputService.createInterface>[0] = {
        name,
      };

      if (description.trim()) config.description = description.trim();
      if (redirect.trim()) config.redirect = redirect.trim();
      if (disabled) config.disabled = true;

      const result = await inputService.createInterface(config);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("modal.errors.createFailed"));
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5" />
            {isEdit ? t("modal.editTitle") : t("modal.createTitle")}
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
              t("modal.createDescription")
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name">{t("modal.interfaceName")} {isEdit ? null : <span className="text-destructive">*</span>}</Label>
            <Input
              id="name"
              value={isEdit ? existing.name : name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ifb0"
              disabled={isEdit}
            />
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? t("modal.nameImmutable")
                : t("modal.namePatternHint")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{tc("description")}</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("modal.descriptionPlaceholder")}
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
            <p className="text-xs text-muted-foreground">{t("modal.redirectHint")}</p>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox checked={disabled} onCheckedChange={(c) => setDisabled(c === true)} id="disabled" />
            <Label htmlFor="disabled" className="font-normal">{t("modal.disableInterface")}</Label>
          </div>
        </div>

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
                {isEdit ? tc("saving") : t("modal.creating")}
              </>
            ) : isEdit ? (
              t("modal.saveChanges")
            ) : (
              t("modal.createInterface")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
