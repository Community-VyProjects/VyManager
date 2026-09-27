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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import type { Pim6RpAddress } from "@/lib/api/pim6";
import { isValidIPv6, isValidIPv6CIDR } from "@/lib/validators/firewall";

type MatchMode = "groups" | "prefix-list6";

interface Pim6RpAddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (rp: Pim6RpAddress) => Promise<void>;
  existingRp?: Pim6RpAddress | null;
}

export function Pim6RpAddressModal({
  open,
  onOpenChange,
  onSubmit,
  existingRp,
}: Pim6RpAddressModalProps) {
  const t = useTranslations("pim6");
  const tc = useTranslations("common");
  const isEditMode = !!existingRp;

  const [address, setAddress] = useState("");
  const [mode, setMode] = useState<MatchMode>("groups");
  const [groups, setGroups] = useState<string[]>([]);
  const [newGroup, setNewGroup] = useState("");
  const [prefixList, setPrefixList] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingRp) {
        setAddress(existingRp.address);
        if (existingRp.prefix_list6) {
          setMode("prefix-list6");
          setPrefixList(existingRp.prefix_list6);
          setGroups([]);
        } else {
          setMode("groups");
          setGroups([...existingRp.groups]);
          setPrefixList("");
        }
        setNewGroup("");
        setError(null);
      } else {
        resetForm();
      }
    }
  }, [open, existingRp]);

  const resetForm = () => {
    setAddress("");
    setMode("groups");
    setGroups([]);
    setNewGroup("");
    setPrefixList("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleModeChange = (next: MatchMode) => {
    setMode(next);
    setError(null);
  };

  const validateForm = (): string | null => {
    const trimmed = address.trim();
    if (!trimmed) {
      return t("rpModal.addressRequired");
    }
    if (!isValidIPv6(trimmed) || trimmed === "") {
      return t("rpModal.addressInvalid");
    }
    if (mode === "groups") {
      if (groups.length === 0) {
        return t("rpModal.groupsRequired");
      }
      for (const g of groups) {
        if (!isValidIPv6CIDR(g) || g === "") {
          return t("rpModal.invalidGroup", { group: g });
        }
      }
    } else {
      if (!prefixList.trim()) {
        return t("rpModal.prefixListRequired");
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
    if (!isValidIPv6CIDR(value) || value === "") {
      setError(t("rpModal.invalidCidr", { value }));
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
        groups: mode === "groups" ? groups : [],
        prefix_list6: mode === "prefix-list6" ? prefixList.trim() : null,
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
                <Input value={address} disabled className="bg-muted font-mono" />
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

            {/* Match mode */}
            <div className="space-y-3">
              <Label>{t("rpModal.groupMatching")}</Label>
              <RadioGroup
                value={mode}
                onValueChange={(v) => handleModeChange(v as MatchMode)}
                className="gap-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="groups" id="mode-groups" />
                  <Label htmlFor="mode-groups" className="font-normal cursor-pointer">
                    {t("rpModal.modeGroups")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="prefix-list6" id="mode-prefix" />
                  <Label htmlFor="mode-prefix" className="font-normal cursor-pointer">
                    {t("rpModal.modePrefixList")}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {mode === "groups" ? (
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
            ) : (
              <div className="space-y-2">
                <Label>{t("rpModal.prefixListName")}</Label>
                <Input
                  value={prefixList}
                  onChange={(e) => setPrefixList(e.target.value)}
                  placeholder={t("rpModal.prefixListPlaceholder")}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  {t.rich("rpModal.prefixListHelp", { code: (chunks) => <code>{chunks}</code> })}
                </p>
              </div>
            )}
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
              t("saveChanges")
            ) : (
              t("addRpAddress")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
