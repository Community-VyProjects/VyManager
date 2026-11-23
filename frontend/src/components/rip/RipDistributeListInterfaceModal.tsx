"use client";

import { useState } from "react";
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
import type { ApiError } from "@/lib/types/api";
import { ripDistributeListInterfaceEmpty } from "@/lib/api/rip-save-ops";

interface RipDistributeListInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: RipDistributeListInterface) => Promise<void>;
  existingEntry?: RipDistributeListInterface | null;
  existingInterfaces: string[];
  accessListNames: string[];
  prefixListNames: string[];
}

/** Seeded from props on mount; the page remounts it with a new key on every open. */
export function RipDistributeListInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingEntry,
  existingInterfaces,
  accessListNames,
  prefixListNames,
}: RipDistributeListInterfaceModalProps) {
  const t = useTranslations("rip");
  const tc = useTranslations("common");
  const isEditMode = !!existingEntry;

  const [iface, setIface] = useState(existingEntry?.interface ?? "");
  const [aclIn, setAclIn] = useState(existingEntry?.access_list_in ?? "");
  const [aclOut, setAclOut] = useState(existingEntry?.access_list_out ?? "");
  const [plIn, setPlIn] = useState(existingEntry?.prefix_list_in ?? "");
  const [plOut, setPlOut] = useState(existingEntry?.prefix_list_out ?? "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    const entry: RipDistributeListInterface = {
      interface: iface,
      access_list_in: aclIn || null,
      access_list_out: aclOut || null,
      prefix_list_in: plIn || null,
      prefix_list_out: plOut || null,
    };
    if (!iface) {
      setError(t("validation.selectInterface"));
      return;
    }
    if (ripDistributeListInterfaceEmpty(entry)) {
      setError(t("validation.selectList"));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit(entry);
      onOpenChange(false);
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
            <Label htmlFor="rip-dl-iface">{t("interfaces.interface")}</Label>
            <InterfaceSelect
              id="rip-dl-iface"
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
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
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
