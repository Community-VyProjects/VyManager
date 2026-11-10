"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
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
import { InterfaceSelect } from "@/components/ui/interface-select";
import { useTranslations } from "next-intl";
import { AlertCircle, Loader2 } from "lucide-react";
import type { DistributeListInterfaceFilter } from "@/lib/api/babel";

export type BabelAddressFamily = "ipv4" | "ipv6";

export interface BabelDistributeListInterfaceDraft extends DistributeListInterfaceFilter {
  addressFamily: BabelAddressFamily;
}

interface BabelDistributeListInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: BabelDistributeListInterfaceDraft) => Promise<void>;
  existingEntry?: BabelDistributeListInterfaceDraft | null;
  existingIpv4: string[];
  existingIpv6: string[];
  accessListNames: { ipv4: string[]; ipv6: string[] };
  prefixListNames: { ipv4: string[]; ipv6: string[] };
}

function withCurrent(names: string[], current: string): string[] {
  if (current && !names.includes(current)) return [current, ...names];
  return names;
}

export function BabelDistributeListInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingEntry,
  existingIpv4,
  existingIpv6,
  accessListNames,
  prefixListNames,
}: BabelDistributeListInterfaceModalProps) {
  const t = useTranslations("babel");
  const tc = useTranslations("common");
  const isEditMode = !!existingEntry;

  const [family, setFamily] = useState<BabelAddressFamily>("ipv4");
  const [iface, setIface] = useState("");
  const [aclIn, setAclIn] = useState("");
  const [aclOut, setAclOut] = useState("");
  const [plIn, setPlIn] = useState("");
  const [plOut, setPlOut] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingForFamily = family === "ipv4" ? existingIpv4 : existingIpv6;

  useEffect(() => {
    if (!open) return;
    if (existingEntry) {
      setFamily(existingEntry.addressFamily);
      setIface(existingEntry.interface);
      setAclIn(existingEntry.access_list_in || "");
      setAclOut(existingEntry.access_list_out || "");
      setPlIn(existingEntry.prefix_list_in || "");
      setPlOut(existingEntry.prefix_list_out || "");
      setError(null);
    } else {
      setFamily("ipv4");
      setIface("");
      setAclIn("");
      setAclOut("");
      setPlIn("");
      setPlOut("");
      setError(null);
    }
  }, [open, existingEntry]);

  const handleClose = () => {
    setFamily("ipv4");
    setIface("");
    setAclIn("");
    setAclOut("");
    setPlIn("");
    setPlOut("");
    setError(null);
    onOpenChange(false);
  };

  const handleFamilyChange = (next: BabelAddressFamily) => {
    setFamily(next);
    setAclIn("");
    setAclOut("");
    setPlIn("");
    setPlOut("");
    if (!isEditMode && (next === "ipv4" ? existingIpv4 : existingIpv6).includes(iface)) {
      setIface("");
    }
  };

  const handleSubmit = async () => {
    if (!iface) {
      setError(t("interfaceModal.selectInterface"));
      return;
    }
    if (!isEditMode && !aclIn && !aclOut && !plIn && !plOut) {
      setError(t("dlModal.selectList"));
      return;
    }

    const entry: BabelDistributeListInterfaceDraft = {
      addressFamily: family,
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

  const aclNames = family === "ipv4" ? accessListNames.ipv4 : accessListNames.ipv6;
  const plNames = family === "ipv4" ? prefixListNames.ipv4 : prefixListNames.ipv6;

  const renderListSelect = (
    value: string,
    onChange: (next: string) => void,
    id: string,
    names: string[],
  ) => (
    <Select value={value || "none"} onValueChange={(next) => onChange(next === "none" ? "" : next)}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={tc("none")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{tc("none")}</SelectItem>
        {withCurrent(names, value).map((name) => (
          <SelectItem key={name} value={name} className="font-mono">{name}</SelectItem>
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
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("distributeList.addressFamily")}</Label>
            <Select
              value={family}
              onValueChange={(next) => handleFamilyChange(next as BabelAddressFamily)}
              disabled={isEditMode}
            >
              <SelectTrigger className={isEditMode ? "bg-muted" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ipv4">{t("dlModal.ipv4")}</SelectItem>
                <SelectItem value="ipv6">{t("dlModal.ipv6")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="babel-dl-iface">{t("fields.interface")}</Label>
            <InterfaceSelect
              id="babel-dl-iface"
              value={iface}
              onValueChange={setIface}
              disabled={isEditMode}
              className={isEditMode ? "bg-muted" : ""}
              placeholder={tc("selectInterface")}
              filter={(item) => isEditMode || !existingForFamily.includes(item.name)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="babel-dl-acl-in">{t("distributeList.accessListIn")}</Label>
              {renderListSelect(aclIn, setAclIn, "babel-dl-acl-in", aclNames)}
            </div>
            <div className="space-y-2">
              <Label htmlFor="babel-dl-acl-out">{t("distributeList.accessListOut")}</Label>
              {renderListSelect(aclOut, setAclOut, "babel-dl-acl-out", aclNames)}
            </div>
            <div className="space-y-2">
              <Label htmlFor="babel-dl-pl-in">{t("distributeList.prefixListIn")}</Label>
              {renderListSelect(plIn, setPlIn, "babel-dl-pl-in", plNames)}
            </div>
            <div className="space-y-2">
              <Label htmlFor="babel-dl-pl-out">{t("distributeList.prefixListOut")}</Label>
              {renderListSelect(plOut, setPlOut, "babel-dl-pl-out", plNames)}
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
                {isEditMode ? tc("saving") : tc("creating")}
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
