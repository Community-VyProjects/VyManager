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
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import type { PimRpAddress } from "@/lib/api/pim";

interface PimRpAddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (rp: PimRpAddress) => Promise<void>;
  existingRp?: PimRpAddress | null;
}

export function PimRpAddressModal({
  open,
  onOpenChange,
  onSubmit,
  existingRp,
}: PimRpAddressModalProps) {
  const t = useTranslations("pim");
  const tc = useTranslations("common");
  const isEditMode = !!existingRp;

  const [address, setAddress] = useState("");
  const [groups, setGroups] = useState<string[]>([]);
  const [newGroup, setNewGroup] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingRp) {
        setAddress(existingRp.address);
        setGroups([...existingRp.groups]);
      } else {
        resetForm();
      }
    }
  }, [open, existingRp]);

  const resetForm = () => {
    setAddress("");
    setGroups([]);
    setNewGroup("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): string | null => {
    if (!address.trim()) {
      return t("rpModal.addressRequired");
    }
    if (!address.trim().match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
      return t("rpModal.addressInvalid");
    }
    for (const g of groups) {
      if (!g.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/)) {
        return t("rpModal.invalidGroup", { group: g });
      }
    }
    return null;
  };

  const handleAddGroup = () => {
    const value = newGroup.trim();
    if (!value) return;
    if (groups.includes(value)) {
      setError(t("rpModal.groupExists"));
      return;
    }
    setGroups([...groups, value]);
    setNewGroup("");
    setError(null);
  };

  const handleRemoveGroup = (index: number) => {
    setGroups(groups.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        address: address.trim(),
        groups,
      });
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tc("operationFailed");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("rpModal.editTitle") : t("addRpAddress")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("rpModal.editDescription", { address: String(existingRp?.address) })
              : t("rpModal.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 pb-2">
            {/* RP Address */}
            <div className="space-y-2">
              <Label>{t("rpModal.rpAddress")}</Label>
              {isEditMode ? (
                <Input
                  value={address}
                  disabled
                  className="bg-muted font-mono"
                />
              ) : (
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t("rpModal.addressPlaceholder")}
                  className="font-mono"
                />
              )}
              <p className="text-xs text-muted-foreground">
                {t("rpModal.addressHelp")}
              </p>
            </div>

            {/* Multicast Groups */}
            <div className="space-y-3">
              <div>
                <Label>{t("rpModal.multicastGroups")}</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("rpModal.groupsHelp")}
                </p>
              </div>

              {groups.length > 0 && (
                <div className="space-y-2">
                  {groups.map((group, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 rounded-md border bg-muted font-mono text-sm">
                        {group}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                        onClick={() => handleRemoveGroup(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  placeholder={t("rpModal.groupPlaceholder")}
                  className="font-mono"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddGroup();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={handleAddGroup}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? tc("saving") : t("adding")}
              </>
            ) : isEditMode ? (
              tc("saveChanges")
            ) : (
              t("addRpAddress")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
