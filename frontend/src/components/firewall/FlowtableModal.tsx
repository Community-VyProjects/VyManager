"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, X, Plus } from "lucide-react";
import { flowtablesService, type Flowtable } from "@/lib/api/firewall-flowtables";
import { ethernetService } from "@/lib/api/ethernet";
import type { EthernetInterface } from "@/lib/api/types/ethernet";

interface FlowtableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingFlowtables: Flowtable[];
  existing?: Flowtable | null;
}

export function FlowtableModal({
  open,
  onOpenChange,
  onSuccess,
  existingFlowtables,
  existing,
}: FlowtableModalProps) {
  const t = useTranslations("firewallFlowtables");
  const tc = useTranslations("common");
  const isEdit = !!existing;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [offload, setOffload] = useState<string>("software");

  // Available interfaces
  const [availableInterfaces, setAvailableInterfaces] = useState<EthernetInterface[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    loadInterfaces();
    if (existing) {
      populateForm(existing);
    } else {
      resetForm();
    }
  }, [open, existing]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setInterfaces([]);
    setOffload("software");
    setSelectedInterface("");
    setError(null);
  };

  const populateForm = (ft: Flowtable) => {
    setName(ft.name);
    setDescription(ft.description || "");
    setInterfaces(ft.interfaces || []);
    setOffload(ft.offload || "software");
    setSelectedInterface("");
    setError(null);
  };

  const loadInterfaces = async () => {
    try {
      const config = await ethernetService.getConfig();
      setAvailableInterfaces(config.interfaces);
    } catch (err) {
      console.error("Failed to load interfaces:", err);
    }
  };

  const handleAddInterface = () => {
    if (selectedInterface && !interfaces.includes(selectedInterface)) {
      setInterfaces([...interfaces, selectedInterface]);
      setSelectedInterface("");
    }
  };

  const handleRemoveInterface = (iface: string) => {
    setInterfaces(interfaces.filter((i) => i !== iface));
  };

  const validateName = (value: string): string | null => {
    if (!value.trim()) {
      return t("modal.nameRequired");
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) {
      return t("modal.nameInvalid");
    }
    if (existingFlowtables.some((ft) => ft.name.toLowerCase() === value.toLowerCase())) {
      return t("modal.nameExists");
    }
    return null;
  };

  const submitUpdate = async () => {
    if (!existing) return;

    if (interfaces.length === 0) {
      setError(t("modal.interfaceRequired"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await flowtablesService.updateFlowtable(
        existing.name,
        {
          description: description.trim() || undefined,
          interfaces,
          offload,
        },
        existing
      );

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("modal.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (isEdit) {
      await submitUpdate();
      return;
    }

    const nameError = validateName(name);
    if (nameError) {
      setError(nameError);
      return;
    }

    if (interfaces.length === 0) {
      setError(t("modal.interfaceRequired"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await flowtablesService.createFlowtable(name, {
        description: description.trim() || undefined,
        interfaces,
        offload,
      });

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("modal.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("modal.editTitle", { name: existing.name }) : t("createFlowtable")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("modal.editDescription")
              : t("modal.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              {tc("name")} {isEdit ? null : <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="name"
              value={isEdit ? existing.name : name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("modal.namePlaceholder")}
              className={isEdit ? "font-mono bg-muted" : "font-mono"}
              disabled={isEdit}
            />
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? t("modal.nameHintEdit")
                : t("modal.nameHintCreate")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{tc("description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("modal.descriptionPlaceholder")}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>
              {t("interfaces")} <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <InterfaceSelect
                value={selectedInterface}
                onValueChange={setSelectedInterface}
                interfaces={availableInterfaces
                  .filter((iface) => !interfaces.includes(iface.name))
                  .map((i) => ({ name: i.name, type: i.type, description: i.description ?? null }))}
                className="flex-1"
                placeholder={t("modal.selectInterface")}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddInterface}
                disabled={!selectedInterface}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {interfaces.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {interfaces.map((iface) => (
                  <Badge key={iface} variant="secondary" className="gap-1">
                    {iface}
                    <button
                      type="button"
                      onClick={() => handleRemoveInterface(iface)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t("modal.interfacesHint")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="offload">{t("offloadType")}</Label>
            <Select value={offload} onValueChange={setOffload}>
              <SelectTrigger id="offload">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="software">{t("modal.offloadSoftware")}</SelectItem>
                <SelectItem value="hardware">{t("modal.offloadHardware")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("modal.offloadHint")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading
              ? isEdit
                ? tc("saving")
                : t("modal.creating")
              : isEdit
                ? t("modal.saveChanges")
                : t("createFlowtable")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
