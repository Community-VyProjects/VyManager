"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { useTranslations } from "next-intl";
import { AlertCircle, Loader2 } from "lucide-react";
import type { RipDistributeListInterface } from "@/lib/api/rip";

interface RipDistributeListInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: RipDistributeListInterface) => Promise<void>;
  existingEntry?: RipDistributeListInterface | null;
  existingInterfaces: string[];
  availableInterfaces: string[];
  accessListNames: string[];
  prefixListNames: string[];
}

export function RipDistributeListInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingEntry,
  existingInterfaces,
  availableInterfaces,
  accessListNames,
  prefixListNames,
}: RipDistributeListInterfaceModalProps) {
  const t = useTranslations("rip");
  const tc = useTranslations("common");
  const isEditMode = !!existingEntry;

  const [iface, setIface] = useState("");
  const [aclIn, setAclIn] = useState("");
  const [aclOut, setAclOut] = useState("");
  const [plIn, setPlIn] = useState("");
  const [plOut, setPlOut] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectableInterfaces = isEditMode
    ? availableInterfaces
    : availableInterfaces.filter((i) => !existingInterfaces.includes(i));

  useEffect(() => {
    if (!open) return;
    if (existingEntry) {
      setIface(existingEntry.interface);
      setAclIn(existingEntry.access_list_in || "");
      setAclOut(existingEntry.access_list_out || "");
      setPlIn(existingEntry.prefix_list_in || "");
      setPlOut(existingEntry.prefix_list_out || "");
    } else {
      setIface("");
      setAclIn("");
      setAclOut("");
      setPlIn("");
      setPlOut("");
      setError(null);
    }
  }, [open, existingEntry]);

  const handleClose = () => {
    setIface("");
    setAclIn("");
    setAclOut("");
    setPlIn("");
    setPlOut("");
    setError(null);
    onOpenChange(false);
  };

  const validate = (): string | null => {
    if (!iface) return t("validation.selectInterface");
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const entry: RipDistributeListInterface = {
      interface: iface,
      access_list_in: aclIn || null,
      access_list_out: aclOut || null,
      prefix_list_in: plIn || null,
      prefix_list_out: plOut || null,
    };

    try {
      setLoading(true);
      setError(null);
      await onSubmit(entry);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("dlModal.editTitle") : t("dlModal.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("dlModal.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Interface */}
          <div className="space-y-2">
            <Label htmlFor="rip-dl-iface">{t("interfaces.interface")}</Label>
            <InterfaceSelect
              id="rip-dl-iface"
              value={iface}
              onValueChange={setIface}
              disabled={isEditMode}
              className={isEditMode ? "bg-muted" : ""}
              placeholder={tc("selectInterface")}
              interfaces={selectableInterfaces.map((name) => ({ name, type: "", description: null }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rip-dl-acl-in">{t("filters.accessListIn")}</Label>
              <NamedListSelect id="rip-dl-acl-in" value={aclIn} names={accessListNames} onValueChange={setAclIn} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rip-dl-acl-out">{t("filters.accessListOut")}</Label>
              <NamedListSelect id="rip-dl-acl-out" value={aclOut} names={accessListNames} onValueChange={setAclOut} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rip-dl-pl-in">{t("filters.prefixListIn")}</Label>
              <NamedListSelect id="rip-dl-pl-in" value={plIn} names={prefixListNames} onValueChange={setPlIn} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rip-dl-pl-out">{t("filters.prefixListOut")}</Label>
              <NamedListSelect id="rip-dl-pl-out" value={plOut} names={prefixListNames} onValueChange={setPlOut} />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <pre className="text-sm text-destructive whitespace-pre-wrap flex-1">{error}</pre>
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
                {isEditMode ? tc("saving") : t("modal.adding")}
              </>
            ) : isEditMode ? (
              tc("saveChanges")
            ) : (
              t("dlModal.addFilter")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
