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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const renderAclSelect = (value: string, onChange: (v: string) => void, id: string) => (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={tc("none")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{tc("none")}</SelectItem>
        {accessListNames.map((al) => (
          <SelectItem key={al} value={al} className="font-mono">{al}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const renderPlSelect = (value: string, onChange: (v: string) => void, id: string) => (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={tc("none")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{tc("none")}</SelectItem>
        {prefixListNames.map((pl) => (
          <SelectItem key={pl} value={pl} className="font-mono">{pl}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

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
            <Label>{t("interfaces.interface")}</Label>
            <Select value={iface} onValueChange={setIface} disabled={isEditMode}>
              <SelectTrigger className={isEditMode ? "bg-muted" : ""}>
                <SelectValue placeholder={t("dlModal.selectInterface")} />
              </SelectTrigger>
              <SelectContent>
                {selectableInterfaces.map((i) => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rip-dl-acl-in">{t("filters.accessListIn")}</Label>
              {renderAclSelect(aclIn, setAclIn, "rip-dl-acl-in")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rip-dl-acl-out">{t("filters.accessListOut")}</Label>
              {renderAclSelect(aclOut, setAclOut, "rip-dl-acl-out")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rip-dl-pl-in">{t("filters.prefixListIn")}</Label>
              {renderPlSelect(plIn, setPlIn, "rip-dl-pl-in")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rip-dl-pl-out">{t("filters.prefixListOut")}</Label>
              {renderPlSelect(plOut, setPlOut, "rip-dl-pl-out")}
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
              t("modal.saveChanges")
            ) : (
              t("dlModal.addFilter")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
