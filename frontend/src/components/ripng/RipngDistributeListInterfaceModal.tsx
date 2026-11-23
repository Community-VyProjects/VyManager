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
import type { RipNgDistributeListInterface } from "@/lib/api/ripng";
import type { ApiError } from "@/lib/types/api";

interface RipngDistributeListInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: RipNgDistributeListInterface) => Promise<void>;
  existingEntry?: RipNgDistributeListInterface | null;
  existingInterfaces: string[];
  accessListNames: string[];
  prefixListNames: string[];
}

export function RipngDistributeListInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingEntry,
  existingInterfaces,
  accessListNames,
  prefixListNames,
}: RipngDistributeListInterfaceModalProps) {
  const t = useTranslations("ripng");
  const tc = useTranslations("common");
  const isEditMode = !!existingEntry;

  const [iface, setIface] = useState("");
  const [aclIn, setAclIn] = useState("");
  const [aclOut, setAclOut] = useState("");
  const [plIn, setPlIn] = useState("");
  const [plOut, setPlOut] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (existingEntry) {
      setIface(existingEntry.interface);
      setAclIn(existingEntry.access_list_in || "");
      setAclOut(existingEntry.access_list_out || "");
      setPlIn(existingEntry.prefix_list_in || "");
      setPlOut(existingEntry.prefix_list_out || "");
      setError(null);
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

  const handleOpenChange = (next: boolean) => {
    if (!next && !loading) handleClose();
  };

  const validate = (): string | null => {
    if (!iface) return t("validation.selectInterface");
    if (!aclIn && !aclOut && !plIn && !plOut) return t("validation.selectList");
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const entry: RipNgDistributeListInterface = {
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
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            <Label htmlFor="ripng-dl-iface">{t("interfaces.interface")}</Label>
            <InterfaceSelect
              id="ripng-dl-iface"
              value={iface}
              onValueChange={setIface}
              disabled={isEditMode}
              className={isEditMode ? "bg-muted" : ""}
              placeholder={tc("selectInterface")}
              filter={(item) => isEditMode || !existingInterfaces.includes(item.name)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ripng-dl-acl-in">{t("filters.accessListIn")}</Label>
              <NamedListSelect id="ripng-dl-acl-in" value={aclIn} names={accessListNames} onValueChange={setAclIn} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ripng-dl-acl-out">{t("filters.accessListOut")}</Label>
              <NamedListSelect id="ripng-dl-acl-out" value={aclOut} names={accessListNames} onValueChange={setAclOut} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ripng-dl-pl-in">{t("filters.prefixListIn")}</Label>
              <NamedListSelect id="ripng-dl-pl-in" value={plIn} names={prefixListNames} onValueChange={setPlIn} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ripng-dl-pl-out">{t("filters.prefixListOut")}</Label>
              <NamedListSelect id="ripng-dl-pl-out" value={plOut} names={prefixListNames} onValueChange={setPlOut} />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
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
